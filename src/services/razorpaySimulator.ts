/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hmacSha256 } from './cryptoUtils.ts';
import { RecoveryAction, SyntheticRecoveryCase } from '../types.ts';
import { globalAuditLedger } from './auditLedger.ts';

export interface RazorpayPaymentLinkResponse {
  id: string; // plink_...
  amount: number; // in paise
  amount_paid: number;
  currency: string;
  short_url: string;
  status: 'created' | 'paid' | 'expired' | 'cancelled';
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  description: string;
  created_at: number;
}

export interface ExecutionResult {
  success: boolean;
  actionExecuted: RecoveryAction;
  razorpayReferenceId: string;
  amountRecoveredInr: number;
  costIncurredInr: number;
  settlementVerified: boolean;
  message: string;
  rawResponse: Record<string, unknown>;
  timestamp: number;
}

/**
 * Deterministic hash-based random float generator for repeatable simulation physics.
 */
function getSimulationRoll(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

/**
 * Evaluates payment outcome in the simulated Razorpay environment based on
 * failure category, instrument state, and chosen recovery intervention.
 * 
 * NOTE: Evaluates independently from ground truth aiExpectedRecovered to ensure
 * true simulated execution.
 */
function evaluateSimulatedRecoveryOutcome(
  caseData: SyntheticRecoveryCase,
  action: RecoveryAction
): boolean {
  const cat = caseData.groundTruthCategory;
  const roll = getSimulationRoll(`sim_eval_${caseData.id}_${action}`);

  // Fraud / high risk instruments can NEVER be successfully charged
  if (
    cat === 'FRAUD_SUSPICION_HIGH' ||
    caseData.errorCode === 'HIGH_RISK_FRAUD_SIGNATURE' ||
    caseData.errorCode === 'PAYMENT_RISK_CHECK_FAILED' ||
    caseData.errorCode === 'RESTRICTED_CARD_BLOCKED'
  ) {
    return false;
  }

  // Action: SMART_RETRY_SCHEDULE
  if (action === 'SMART_RETRY_SCHEDULE') {
    if (cat === 'TEMPORARY_ISSUER_OUTAGE') {
      // Smart retry dispatched after bank CBS health recovers: 91% success
      return roll < 0.91;
    }
    if (cat === 'GATEWAY_TIMEOUT') {
      // Smart exponential backoff after socket reset: 90% success
      return roll < 0.90;
    }
    if (cat === 'EXPIRED_INSTRUMENT' || cat === 'AUTHENTICATION_ABANDONMENT') {
      // Retrying an expired token or abandoned 3DS session without user action fails 100%
      return false;
    }
    if (cat === 'INSUFFICIENT_FUNDS_TRANSIENT') {
      return roll < 0.30;
    }
    return roll < 0.50;
  }

  // Action: FALLBACK_UPI_PAYMENT_LINK
  if (action === 'FALLBACK_UPI_PAYMENT_LINK') {
    if (cat === 'AUTHENTICATION_ABANDONMENT') {
      // Instant frictionless UPI dynamic intent link converts 83% of drop-offs
      return roll < 0.83;
    }
    if (cat === 'TEMPORARY_ISSUER_OUTAGE') {
      return roll < 0.40;
    }
    if (cat === 'EXPIRED_INSTRUMENT') {
      return roll < 0.50;
    }
    return roll < 0.60;
  }

  // Action: CARD_UPDATE_PROMPT
  if (action === 'CARD_UPDATE_PROMPT') {
    if (cat === 'EXPIRED_INSTRUMENT') {
      // 1-Click Mandate Token Update portal converts 73% of expired cards
      return roll < 0.73;
    }
    return roll < 0.20;
  }

  // Action: INTERACTIVE_WHATSAPP_NUDGE
  if (action === 'INTERACTIVE_WHATSAPP_NUDGE') {
    if (cat === 'INSUFFICIENT_FUNDS_TRANSIENT') {
      // Salary-aware interactive WhatsApp 1-tap quick pay recovers 86% of liquidity drops
      return roll < 0.86;
    }
    if (cat === 'AUTHENTICATION_ABANDONMENT') {
      return roll < 0.75;
    }
    return roll < 0.50;
  }

  // Action: ESCALATE_HUMAN_OPS
  if (action === 'ESCALATE_HUMAN_OPS') {
    return roll < 0.65;
  }

  return false;
}

export class RazorpayService {
  private keyId: string;
  private keySecret: string;
  private isTestMode: boolean;
  private idempotencyStore = new Set<string>();

  constructor() {
    this.keyId = 'rzp_test_recoveros_sandbox';
    this.keySecret = 'test_secret_recoveros';
    this.isTestMode = true;
  }

  /**
   * Resets idempotency cache for clean benchmark runs.
   */
  clearIdempotencyStore(): void {
    this.idempotencyStore.clear();
  }

  /**
   * Verifies incoming webhook HMAC SHA-256 signature.
   */
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    const expected = hmacSha256(secret, rawBody);
    return expected === signature;
  }

  /**
   * Generates a dynamic Razorpay Payment Link (WhatsApp/SMS ready).
   */
  createPaymentLink(params: {
    amountInr: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    description: string;
    referenceId: string;
  }): RazorpayPaymentLinkResponse {
    const numPart = params.referenceId.replace(/[^0-9]/g, '') || '001';
    const plinkId = `plink_test_${numPart.padStart(8, '0')}`;
    return {
      id: plinkId,
      amount: Math.round(params.amountInr * 100),
      amount_paid: 0,
      currency: 'INR',
      short_url: `https://rzp.io/i/${plinkId.slice(6)}`,
      status: 'created',
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        contact: params.customerPhone,
      },
      description: params.description,
      created_at: 1700000000 + parseInt(numPart, 10),
    };
  }

  /**
   * Executes an approved recovery action against the Razorpay Test / Sandbox interface.
   * Enforces strict idempotency and dual-entry cryptographic ledger recording.
   */
  executeApprovedAction(
    caseData: SyntheticRecoveryCase,
    action: RecoveryAction,
    idempotencyKey: string
  ): ExecutionResult {
    const caseNum = parseInt(caseData.id.replace(/[^0-9]/g, '') || '1', 10);
    const deterministicTimestamp = 1700000000000 + caseNum * 60000;

    // 1. Idempotency Check
    if (this.idempotencyStore.has(idempotencyKey)) {
      return {
        success: false,
        actionExecuted: action,
        razorpayReferenceId: 'DUP_BLOCKED',
        amountRecoveredInr: 0,
        costIncurredInr: 0,
        settlementVerified: false,
        message: `Idempotency guard: duplicate execution prevented for key ${idempotencyKey}`,
        rawResponse: { error: 'DUPLICATE_IDEMPOTENCY_KEY' },
        timestamp: deterministicTimestamp,
      };
    }
    this.idempotencyStore.add(idempotencyKey);

    // 2. Action: DO_NOT_RETRY_CHURN_RISK (Fraud / Non-recoverable)
    if (action === 'DO_NOT_RETRY_CHURN_RISK') {
      globalAuditLedger.append({
        caseId: caseData.id,
        action: 'DO_NOT_RETRY_CHURN_RISK',
        actor: 'SYSTEM_POLICY',
        debitAtRiskInr: caseData.amountInr,
        creditRecoveredInr: 0,
        costIncurredInr: 0,
        status: 'BLOCKED',
        payloadSummary: `Policy enforced terminal DO_NOT_RETRY: prevented dispute on ${caseData.errorCode}`,
        customTimestamp: deterministicTimestamp,
      });

      return {
        success: true,
        actionExecuted: action,
        razorpayReferenceId: 'BLOCKED_FRAUD_SAFEGUARD',
        amountRecoveredInr: 0,
        costIncurredInr: 0,
        settlementVerified: false,
        message: 'Action safely terminated. No gateway charge attempted.',
        rawResponse: { action: 'BLOCKED', reason: 'FRAUD_OR_HIGH_CHURN_RISK' },
        timestamp: deterministicTimestamp,
      };
    }

    // 3. Action: SMART_RETRY_SCHEDULE (Bank outages, gateway timeouts)
    if (action === 'SMART_RETRY_SCHEDULE') {
      const retryRef = `rpy_sub_${String(caseNum).padStart(8, '0')}`;
      const costIncurredInr = 0.00; // Razorpay token retry has 0 marginal network fee

      const recovered = evaluateSimulatedRecoveryOutcome(caseData, action);
      const amountRecoveredInr = recovered ? caseData.amountInr : 0;

      globalAuditLedger.append({
        caseId: caseData.id,
        action: 'SMART_RETRY_SCHEDULE',
        actor: 'RAZORPAY_GATEWAY',
        debitAtRiskInr: caseData.amountInr,
        creditRecoveredInr: amountRecoveredInr,
        costIncurredInr,
        razorpayReferenceId: retryRef,
        status: recovered ? 'SUCCESS' : 'FAILED',
        payloadSummary: `Smart retry dispatched after issuer recovery window. Result: ${recovered ? 'CAPTURED' : 'EXPIRED'}`,
        customTimestamp: deterministicTimestamp,
      });

      return {
        success: recovered,
        actionExecuted: action,
        razorpayReferenceId: retryRef,
        amountRecoveredInr,
        costIncurredInr,
        settlementVerified: recovered,
        message: recovered
          ? `Smart retry successfully captured ₹${amountRecoveredInr.toLocaleString('en-IN')}`
          : 'Smart retry completed but instrument remained unchargeable.',
        rawResponse: { status: recovered ? 'captured' : 'reference: retryRef' },
        timestamp: deterministicTimestamp,
      };
    }

    // 4. Action: FALLBACK_UPI_PAYMENT_LINK (Checkout drop-offs, 3DS timeouts)
    if (action === 'FALLBACK_UPI_PAYMENT_LINK') {
      const link = this.createPaymentLink({
        amountInr: caseData.amountInr,
        customerName: caseData.customerName,
        customerEmail: caseData.customerEmail,
        customerPhone: caseData.customerPhone,
        description: `RecoverOS Auto-Payment Link for Order ${caseData.razorpayOrderId}`,
        referenceId: caseData.id,
      });

      const costIncurredInr = 0.20; // SMS/Link delivery cost
      const recovered = evaluateSimulatedRecoveryOutcome(caseData, action);
      const amountRecoveredInr = recovered ? caseData.amountInr : 0;

      globalAuditLedger.append({
        caseId: caseData.id,
        action: 'FALLBACK_UPI_PAYMENT_LINK',
        actor: 'RAZORPAY_GATEWAY',
        debitAtRiskInr: caseData.amountInr,
        creditRecoveredInr: amountRecoveredInr,
        costIncurredInr,
        razorpayReferenceId: link.id,
        status: recovered ? 'SUCCESS' : 'FAILED',
        payloadSummary: `Dynamic UPI Payment Link ${link.short_url} generated. Status: ${recovered ? 'PAID' : 'PENDING'}`,
        customTimestamp: deterministicTimestamp,
      });

      return {
        success: recovered,
        actionExecuted: action,
        razorpayReferenceId: link.id,
        amountRecoveredInr,
        costIncurredInr,
        settlementVerified: recovered,
        message: recovered
          ? `Customer paid ₹${amountRecoveredInr.toLocaleString('en-IN')} via dynamic Razorpay UPI link`
          : 'Payment link generated and delivered to customer.',
        rawResponse: { linkId: link.id, shortUrl: link.short_url, status: recovered ? 'paid' : 'created' },
        timestamp: deterministicTimestamp,
      };
    }

    // 5. Action: CARD_UPDATE_PROMPT (Expired tokens)
    if (action === 'CARD_UPDATE_PROMPT') {
      const portalRef = `tok_upd_${String(caseNum).padStart(8, '0')}`;
      const costIncurredInr = 0.20;
      const recovered = evaluateSimulatedRecoveryOutcome(caseData, action);
      const amountRecoveredInr = recovered ? caseData.amountInr : 0;

      globalAuditLedger.append({
        caseId: caseData.id,
        action: 'CARD_UPDATE_PROMPT',
        actor: 'RAZORPAY_GATEWAY',
        debitAtRiskInr: caseData.amountInr,
        creditRecoveredInr: amountRecoveredInr,
        costIncurredInr,
        razorpayReferenceId: portalRef,
        status: recovered ? 'SUCCESS' : 'FAILED',
        payloadSummary: `1-Click Card Token Update portal dispatched. Status: ${recovered ? 'CARD_UPDATED_AND_CHARGED' : 'EXPIRED'}`,
        customTimestamp: deterministicTimestamp,
      });

      return {
        success: recovered,
        actionExecuted: action,
        razorpayReferenceId: portalRef,
        amountRecoveredInr,
        costIncurredInr,
        settlementVerified: recovered,
        message: recovered
          ? `Customer updated card details; recurring mandate charged ₹${amountRecoveredInr.toLocaleString('en-IN')}`
          : 'Card update prompt sent.',
        rawResponse: { tokenSession: portalRef, result: recovered ? 'updated_and_paid' : 'awaiting_input' },
        timestamp: deterministicTimestamp,
      };
    }

    // 6. Action: INTERACTIVE_WHATSAPP_NUDGE (Low balance salary cycle)
    if (action === 'INTERACTIVE_WHATSAPP_NUDGE') {
      const nudgeRef = `wa_msg_${String(caseNum).padStart(8, '0')}`;
      const costIncurredInr = 0.85; // WhatsApp Business API conversation cost
      const recovered = evaluateSimulatedRecoveryOutcome(caseData, action);
      const amountRecoveredInr = recovered ? caseData.amountInr : 0;

      globalAuditLedger.append({
        caseId: caseData.id,
        action: 'INTERACTIVE_WHATSAPP_NUDGE',
        actor: 'RAZORPAY_GATEWAY',
        debitAtRiskInr: caseData.amountInr,
        creditRecoveredInr: amountRecoveredInr,
        costIncurredInr,
        razorpayReferenceId: nudgeRef,
        status: recovered ? 'SUCCESS' : 'FAILED',
        payloadSummary: `Interactive WhatsApp nudge delivered to ${caseData.customerPhone}. Status: ${recovered ? 'PAID_ON_NUDGE' : 'READ_UNPAID'}`,
        customTimestamp: deterministicTimestamp,
      });

      return {
        success: recovered,
        actionExecuted: action,
        razorpayReferenceId: nudgeRef,
        amountRecoveredInr,
        costIncurredInr,
        settlementVerified: recovered,
        message: recovered
          ? `Customer paid ₹${amountRecoveredInr.toLocaleString('en-IN')} via WhatsApp interactive quick-pay`
          : 'WhatsApp prompt delivered.',
        rawResponse: { waMessageId: nudgeRef, result: recovered ? 'settled' : 'delivered' },
        timestamp: deterministicTimestamp,
      };
    }

    // 7. Action: ESCALATE_HUMAN_OPS
    if (action === 'ESCALATE_HUMAN_OPS') {
      const opsTicketId = `ops_${String(caseNum).padStart(6, '0')}`;
      const costIncurredInr = 50.00;
      const recovered = evaluateSimulatedRecoveryOutcome(caseData, action);
      const amountRecoveredInr = recovered ? caseData.amountInr : 0;

      globalAuditLedger.append({
        caseId: caseData.id,
        action: 'ESCALATE_HUMAN_OPS',
        actor: 'SYSTEM_POLICY',
        debitAtRiskInr: caseData.amountInr,
        creditRecoveredInr: amountRecoveredInr,
        costIncurredInr,
        razorpayReferenceId: opsTicketId,
        status: recovered ? 'SUCCESS' : 'FAILED',
        payloadSummary: `Manual ops intervention dispatched. Result: ${recovered ? 'RECOVERED' : 'UNRESOLVED'}`,
        customTimestamp: deterministicTimestamp,
      });

      return {
        success: recovered,
        actionExecuted: action,
        razorpayReferenceId: opsTicketId,
        amountRecoveredInr,
        costIncurredInr,
        settlementVerified: recovered,
        message: `Human operations ticket ${opsTicketId} processed.`,
        rawResponse: { ticketId: opsTicketId, status: recovered ? 'resolved' : 'closed' },
        timestamp: deterministicTimestamp,
      };
    }

    // Default general handler
    const fallbackRef = `gen_rpy_${String(caseNum).padStart(8, '0')}`;
    return {
      success: false,
      actionExecuted: action,
      razorpayReferenceId: fallbackRef,
      amountRecoveredInr: 0,
      costIncurredInr: 0,
      settlementVerified: false,
      message: `Action ${action} handled.`,
      rawResponse: { status: 'handled' },
      timestamp: deterministicTimestamp,
    };
  }
}

export const razorpayService = new RazorpayService();

export async function executeSimulatedAction(params: {
  caseData: SyntheticRecoveryCase;
  action: RecoveryAction;
  idempotencyKey: string;
}): Promise<ExecutionResult> {
  return razorpayService.executeApprovedAction(
    params.caseData,
    params.action,
    params.idempotencyKey
  );
}



