/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hmacSha256 } from './cryptoUtils.ts';
import {
  AiDiagnosisResult,
  FailureCategory,
  PaymentMethodType,
  PolicyEvaluationResult,
  SyntheticRecoveryCase,
} from '../types.ts';
import { diagnosePaymentFailure } from './gemini.ts';
import { evaluateRecoveryPolicy } from './policyEngine.ts';
import { getActiveGatewayAdapter, GatewayExecutionResponse } from './paymentGatewayAdapter.ts';
import { globalAuditLedger } from './auditLedger.ts';

export type WebhookEventType =
  | 'payment.failed'
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.refunded'
  | 'order.paid'
  | 'subscription.charged'
  | 'subscription.halted'
  | 'event.unsupported';

export interface NormalizedPaymentEvent {
  eventId: string;
  eventType: WebhookEventType;
  paymentId: string;
  orderId: string;
  amountInr: number;
  currency: string;
  errorCode?: string;
  errorDescription?: string;
  errorSource?: 'bank' | 'customer' | 'gateway' | 'issuer';
  paymentMethod: PaymentMethodType;
  cardNetwork?: string;
  issuingBank?: string;
  customerEmail: string;
  customerContact: string;
  timestamp: number;
  rawPayload: Record<string, unknown>;
}

export interface WebhookIngestResult {
  accepted: boolean;
  status: 'PROCESSED' | 'DUPLICATE_IGNORED' | 'SIGNATURE_INVALID' | 'MALFORMED' | 'UNSUPPORTED_EVENT';
  message: string;
  normalizedEvent?: NormalizedPaymentEvent;
  diagnosis?: AiDiagnosisResult;
  policy?: PolicyEvaluationResult;
  policyDecision?: {
    accepted: boolean;
    policy: string;
    checks: string[];
  };
  gatewayExecution?: GatewayExecutionResponse;
  ledgerRef?: string;
  timestamp: number;
}

export interface WebhookSecurityOptions {
  /** Set only by an intentionally local simulation harness; HTTP handlers must never bypass HMAC. */
  bypassSignatureCheck?: boolean;
  signature?: string;
  webhookSecret?: string;
}

// In-memory idempotency cache for duplicate event detection
const seenWebhookEvents = new Set<string>();

/**
 * Resets the webhook idempotency cache (for tests/reset).
 */
export function clearWebhookIdempotencyCache(): void {
  seenWebhookEvents.clear();
}

/**
 * Cryptographically verifies Razorpay HMAC-SHA256 Webhook Signature.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!rawBody || !signature || !secret) {
    return false;
  }
  try {
    const computed = await hmacSha256(rawBody, secret);
    return computed.toLowerCase() === signature.trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Normalizes raw Razorpay webhook payload into a canonical structure.
 */
export function normalizeRazorpayEvent(payload: any): NormalizedPaymentEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const eventType = (payload.event as WebhookEventType) || 'event.unsupported';
  const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity || payload;

  if (!entity || !entity.id) {
    return null;
  }

  const amountPaise = Number(entity.amount) || 0;
  const amountInr = amountPaise > 0 ? amountPaise / 100 : (Number(entity.amount_inr) || 1000);

  return {
    eventId: String(payload.id || `evt_${entity.id}_${Date.now()}`),
    eventType,
    paymentId: String(entity.id || 'pay_unknown'),
    orderId: String(entity.order_id || 'order_unknown'),
    amountInr,
    currency: String(entity.currency || 'INR'),
    errorCode: entity.error_code || (eventType === 'payment.failed' ? 'BAD_REQUEST_ERROR' : undefined),
    errorDescription: entity.error_description || (eventType === 'payment.failed' ? 'Transaction failed' : undefined),
    errorSource: (entity.error_source as any) || 'bank',
    paymentMethod: (entity.method as PaymentMethodType) || 'upi',
    cardNetwork: entity.card?.network || undefined,
    issuingBank: entity.bank || undefined,
    customerEmail: entity.email || 'customer@example.com',
    customerContact: entity.contact || '+919876543210',
    timestamp: entity.created_at ? entity.created_at * 1000 : Date.now(),
    rawPayload: payload,
  };
}

/**
 * Primary Ingestion Entry Point for Webhook Events.
 * Validates signature, deduplicates, normalizes, and dispatches failure events into the RecoverOS pipeline.
 */
export async function ingestWebhookEvent(
  rawBody: string | Record<string, unknown>,
  options?: WebhookSecurityOptions
): Promise<WebhookIngestResult> {
  const timestamp = Date.now();
  let parsedPayload: any;
  let payloadString = '';

  // 1. Parse JSON Payload
  try {
    if (typeof rawBody === 'string') {
      payloadString = rawBody;
      parsedPayload = JSON.parse(rawBody);
    } else {
      parsedPayload = rawBody;
      payloadString = JSON.stringify(rawBody);
    }
  } catch (err) {
    return {
      accepted: false,
      status: 'MALFORMED',
      message: 'Invalid JSON payload structure: parsing failed.',
      timestamp,
    };
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return {
      accepted: false,
      status: 'MALFORMED',
      message: 'Webhook payload must be a non-empty object.',
      timestamp,
    };
  }

  // 2. Signature Verification. Fail closed unless an explicitly local simulation
  // harness has opted out; a missing configuration must not accept unsigned input.
  if (!options?.bypassSignatureCheck) {
    if (!options?.signature || !options?.webhookSecret) {
      return {
        accepted: false,
        status: 'SIGNATURE_INVALID',
        message: 'Webhook signature and server-side webhook secret are required. Event rejected before processing.',
        timestamp,
      };
    }
    const isValid = await verifyWebhookSignature(payloadString, options.signature, options.webhookSecret);
    if (!isValid) {
      return {
        accepted: false,
        status: 'SIGNATURE_INVALID',
        message: 'Cryptographic HMAC-SHA256 signature verification failed. Untrusted webhook sender.',
        timestamp,
      };
    }
  }

  // 3. Normalization
  const normalized = normalizeRazorpayEvent(parsedPayload);
  if (!normalized) {
    return {
      accepted: false,
      status: 'MALFORMED',
      message: 'Webhook payload missing required Razorpay entity identifiers (paymentId / orderId).',
      timestamp,
    };
  }

  // 4. Duplicate Event Detection (Idempotency)
  if (seenWebhookEvents.has(normalized.eventId)) {
    return {
      accepted: false,
      status: 'DUPLICATE_IGNORED',
      message: `Event ID ${normalized.eventId} has already been processed. Duplicate webhook ignored.`,
      normalizedEvent: normalized,
      timestamp,
    };
  }
  seenWebhookEvents.add(normalized.eventId);

  // 5. Handle Non-Failure Events
  const knownSupportedFailureEvents = ['payment.failed'];
  if (!knownSupportedFailureEvents.includes(normalized.eventType)) {
    if (['payment.captured', 'payment.authorized', 'payment.refunded'].includes(normalized.eventType)) {
      return {
        accepted: true,
        status: 'PROCESSED',
        message: `Received ${normalized.eventType} for payment ${normalized.paymentId}. Non-failure event acknowledged.`,
        normalizedEvent: normalized,
        timestamp,
      };
    }
    return {
      accepted: false,
      status: 'UNSUPPORTED_EVENT',
      message: `Event type ${normalized.eventType} is outside payment recovery scope.`,
      normalizedEvent: normalized,
      timestamp,
    };
  }

  // 6. Payment Failure Event -> Dispatch into RecoverOS Pipeline
  // Construct SyntheticRecoveryCase for AI Diagnosis & Policy Engine
  const mappedCategory = mapErrorCodeToCategory(normalized.errorCode || '');
  const recommendedAction = defaultActionForCategory(mappedCategory);
  const recoveryCase: SyntheticRecoveryCase = {
    id: `case_webhook_${normalized.paymentId}`,
    razorpayPaymentId: normalized.paymentId,
    razorpayOrderId: normalized.orderId,
    customerId: `cust_${normalized.customerContact.replace(/\D/g, '').slice(-6)}`,
    customerName: normalized.customerEmail.split('@')[0] || 'Merchant Customer',
    customerEmail: normalized.customerEmail,
    customerPhone: normalized.customerContact,
    amountInr: normalized.amountInr,
    currency: normalized.currency,
    errorCode: normalized.errorCode || 'PAYMENT_FAILED_GENERIC',
    errorDescription: normalized.errorDescription || 'Payment transaction failed',
    errorSource: normalized.errorSource || 'bank',
    paymentMethod: normalized.paymentMethod,
    cardNetwork: (normalized.cardNetwork as any) || undefined,
    issuingBank: normalized.issuingBank || 'HDFC Bank',
    customerTenureMonths: 12,
    lifetimeSuccessfulPayments: 8,
    consecutiveFailureCount: 1,
    // A bank-originated insufficient-funds decline is not evidence of an issuer outage.
    bankHealthScore: mappedCategory === 'TEMPORARY_ISSUER_OUTAGE' ? 0.25 : 0.85,
    attemptNumber: 1,
    dayOfMonth: new Date(normalized.timestamp).getDate(),
    hourOfDay: new Date(normalized.timestamp).getHours(),
    merchantCategory: 'saas_recurring',
    groundTruthCategory: mappedCategory,
    groundTruth: {
      isRecoverable: mappedCategory !== 'FRAUD_SUSPICION_HIGH',
      optimalAction: recommendedAction,
      baselineRecovered: false,
      aiExpectedRecovered: mappedCategory !== 'FRAUD_SUSPICION_HIGH',
      revenueRecoverableInr: normalized.amountInr,
      rationale: 'Webhook ingested recovery incident.',
      optimalDelayMinutes: 60,
    },
  };

  // Step A: AI Telemetry Diagnosis
  const diagnosis = await diagnosePaymentFailure(recoveryCase);

  // Step B: Deterministic Policy Evaluation (Zero Unchecked AI Execution)
  const policy = evaluateRecoveryPolicy(recoveryCase, diagnosis);

  // Step C: Gateway Adapter Execution (Only if Approved)
  let gatewayExecution: GatewayExecutionResponse | undefined;
  const adapter = getActiveGatewayAdapter();

  if (policy.approved) {
    const idempotencyKey = `wh_exec_${recoveryCase.id}_${policy.actionToExecute}`;
    if (policy.actionToExecute === 'SMART_RETRY_SCHEDULE') {
      gatewayExecution = await adapter.executePaymentRetry(
        {
          caseId: recoveryCase.id,
          razorpayPaymentId: recoveryCase.razorpayPaymentId,
          amountInr: recoveryCase.amountInr,
          customerEmail: recoveryCase.customerEmail,
          customerPhone: recoveryCase.customerPhone,
          paymentMethod: recoveryCase.paymentMethod,
          delayMinutes: diagnosis.recommendedExecutionDelayMinutes,
          idempotencyKey,
        },
        recoveryCase
      );
    } else if (policy.actionToExecute === 'FALLBACK_UPI_PAYMENT_LINK') {
      gatewayExecution = await adapter.createUpiPaymentLink(
        {
          caseId: recoveryCase.id,
          orderId: recoveryCase.razorpayOrderId,
          amountInr: recoveryCase.amountInr,
          customerName: recoveryCase.customerName,
          customerEmail: recoveryCase.customerEmail,
          customerPhone: recoveryCase.customerPhone,
          description: `Recovery payment link for ${recoveryCase.razorpayOrderId}`,
          idempotencyKey,
        },
        recoveryCase
      );
    } else if (policy.actionToExecute === 'CARD_UPDATE_PROMPT') {
      gatewayExecution = await adapter.requestPaymentInstrumentUpdate(
        {
          caseId: recoveryCase.id,
          customerId: recoveryCase.customerId,
          customerEmail: recoveryCase.customerEmail,
          customerPhone: recoveryCase.customerPhone,
          paymentMethod: recoveryCase.paymentMethod,
          idempotencyKey,
        },
        recoveryCase
      );
    } else if (policy.actionToExecute === 'INTERACTIVE_WHATSAPP_NUDGE') {
      gatewayExecution = await adapter.sendInteractiveNudge(
        {
          caseId: recoveryCase.id,
          customerPhone: recoveryCase.customerPhone,
          amountInr: recoveryCase.amountInr,
          idempotencyKey,
        },
        recoveryCase
      );
    }
  }

  // Step D: Cryptographic Ledger Entry
  const ledgerRecord = globalAuditLedger.append({
    caseId: recoveryCase.id,
    action: policy.approved ? policy.actionToExecute : 'POLICY_DENIED',
    actor: 'RAZORPAY_GATEWAY',
    debitAtRiskInr: recoveryCase.amountInr,
    creditRecoveredInr: gatewayExecution?.amountRecoveredInr || 0,
    costIncurredInr: policy.interventionCostInr,
    status: policy.approved ? (gatewayExecution?.success ? 'SUCCESS' : 'FAILED') : 'BLOCKED',
    razorpayReferenceId: gatewayExecution?.referenceId || `wh_block_${normalized.eventId}`,
    payloadSummary: `Webhook Ingested ${normalized.paymentId}: ${diagnosis.failureCategory} -> ${policy.approved ? policy.actionToExecute : policy.denialReason}`,
  });

  return {
    accepted: true,
    status: 'PROCESSED',
    message: `Payment failure successfully processed. Action: ${policy.actionToExecute} (Approved: ${policy.approved}).`,
    normalizedEvent: normalized,
    diagnosis,
    policy,
    gatewayExecution,
    ledgerRef: ledgerRecord.currentHash,
    timestamp,
  };
}

function mapErrorCodeToCategory(errorCode: string): FailureCategory {
  const code = (errorCode || '').toUpperCase();
  if (code.includes('FRAUD') || code.includes('RISK') || code.includes('RESTRICTED')) {
    return 'FRAUD_SUSPICION_HIGH';
  }
  if (code.includes('EXPIRED') || code.includes('CARD_EXPIRED')) {
    return 'EXPIRED_INSTRUMENT';
  }
  if (code.includes('INSUFFICIENT') || code.includes('LOW_BALANCE')) {
    return 'INSUFFICIENT_FUNDS_TRANSIENT';
  }
  if (code.includes('ABANDON') || code.includes('USER_DROPPED') || code.includes('AUTH_FAILED')) {
    return 'AUTHENTICATION_ABANDONMENT';
  }
  if (code.includes('GATEWAY') || code.includes('TIMEOUT')) {
    return 'GATEWAY_TIMEOUT';
  }
  return 'TEMPORARY_ISSUER_OUTAGE';
}

function defaultActionForCategory(category: FailureCategory): SyntheticRecoveryCase['groundTruth']['optimalAction'] {
  switch (category) {
    case 'FRAUD_SUSPICION_HIGH': return 'DO_NOT_RETRY_FRAUD';
    case 'EXPIRED_INSTRUMENT': return 'CARD_UPDATE_PROMPT';
    case 'AUTHENTICATION_ABANDONMENT': return 'FALLBACK_UPI_PAYMENT_LINK';
    case 'INSUFFICIENT_FUNDS_TRANSIENT': return 'INTERACTIVE_WHATSAPP_NUDGE';
    default: return 'SMART_RETRY_SCHEDULE';
  }
}

