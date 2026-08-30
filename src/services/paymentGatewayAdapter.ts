/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecoveryAction, SyntheticRecoveryCase } from '../types.ts';
import { executeSimulatedAction, ExecutionResult } from './razorpaySimulator.ts';

export type GatewayEnvironmentState = 'DEMO_SANDBOX' | 'PRODUCTION_READY' | 'PRODUCTION_DISABLED';

export interface PaymentRetryParams {
  caseId: string;
  razorpayPaymentId: string;
  amountInr: number;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  delayMinutes: number;
  idempotencyKey: string;
}

export interface UpiLinkParams {
  caseId: string;
  orderId: string;
  amountInr: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  idempotencyKey: string;
}

export interface InstrumentUpdateParams {
  caseId: string;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  idempotencyKey: string;
}

export interface GatewayExecutionResponse {
  success: boolean;
  actionExecuted: RecoveryAction;
  referenceId: string;
  amountRecoveredInr: number;
  costIncurredInr: number;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING';
  message: string;
  environment: GatewayEnvironmentState;
  timestamp: number;
  rawResponse?: Record<string, unknown>;
}

/**
 * Standard Payment Gateway Adapter Interface.
 * Abstracting payment operations to decouple AI diagnostics and policy rules from gateway SDKs.
 */
export interface PaymentGatewayAdapter {
  readonly name: string;
  readonly environment: GatewayEnvironmentState;
  
  executePaymentRetry(params: PaymentRetryParams, caseData: SyntheticRecoveryCase): Promise<GatewayExecutionResponse>;
  createUpiPaymentLink(params: UpiLinkParams, caseData: SyntheticRecoveryCase): Promise<GatewayExecutionResponse>;
  requestPaymentInstrumentUpdate(params: InstrumentUpdateParams, caseData: SyntheticRecoveryCase): Promise<GatewayExecutionResponse>;
  sendInteractiveNudge(params: { caseId: string; customerPhone: string; amountInr: number; idempotencyKey: string }, caseData: SyntheticRecoveryCase): Promise<GatewayExecutionResponse>;
  getPaymentStatus(paymentId: string): Promise<{ status: string; amountInr: number; settled: boolean }>;
  verifyIdempotency(idempotencyKey: string): Promise<boolean>;
}

/**
 * Razorpay Sandbox Adapter.
 * Default active execution layer for reproducible evaluation and safe hackathon demonstrations.
 */
export class RazorpaySandboxAdapter implements PaymentGatewayAdapter {
  public readonly name = 'Razorpay Sandbox Simulator';
  public readonly environment: GatewayEnvironmentState = 'DEMO_SANDBOX';

  async executePaymentRetry(
    params: PaymentRetryParams,
    caseData: SyntheticRecoveryCase
  ): Promise<GatewayExecutionResponse> {
    const simResult: ExecutionResult = await executeSimulatedAction({
      caseData,
      action: 'SMART_RETRY_SCHEDULE',
      idempotencyKey: params.idempotencyKey,
    });

    return {
      success: simResult.success,
      actionExecuted: 'SMART_RETRY_SCHEDULE',
      referenceId: simResult.razorpayReferenceId,
      amountRecoveredInr: simResult.amountRecoveredInr,
      costIncurredInr: simResult.costIncurredInr,
      status: simResult.success ? 'SUCCESS' : 'FAILED',
      message: simResult.message,
      environment: this.environment,
      timestamp: simResult.timestamp,
      rawResponse: simResult.rawResponse,
    };
  }

  async createUpiPaymentLink(
    params: UpiLinkParams,
    caseData: SyntheticRecoveryCase
  ): Promise<GatewayExecutionResponse> {
    const simResult: ExecutionResult = await executeSimulatedAction({
      caseData,
      action: 'FALLBACK_UPI_PAYMENT_LINK',
      idempotencyKey: params.idempotencyKey,
    });

    return {
      success: simResult.success,
      actionExecuted: 'FALLBACK_UPI_PAYMENT_LINK',
      referenceId: simResult.razorpayReferenceId,
      amountRecoveredInr: simResult.amountRecoveredInr,
      costIncurredInr: simResult.costIncurredInr,
      status: simResult.success ? 'SUCCESS' : 'FAILED',
      message: simResult.message,
      environment: this.environment,
      timestamp: simResult.timestamp,
      rawResponse: simResult.rawResponse,
    };
  }

  async requestPaymentInstrumentUpdate(
    params: InstrumentUpdateParams,
    caseData: SyntheticRecoveryCase
  ): Promise<GatewayExecutionResponse> {
    const simResult: ExecutionResult = await executeSimulatedAction({
      caseData,
      action: 'CARD_UPDATE_PROMPT',
      idempotencyKey: params.idempotencyKey,
    });

    return {
      success: simResult.success,
      actionExecuted: 'CARD_UPDATE_PROMPT',
      referenceId: simResult.razorpayReferenceId,
      amountRecoveredInr: simResult.amountRecoveredInr,
      costIncurredInr: simResult.costIncurredInr,
      status: simResult.success ? 'SUCCESS' : 'FAILED',
      message: simResult.message,
      environment: this.environment,
      timestamp: simResult.timestamp,
      rawResponse: simResult.rawResponse,
    };
  }

  async sendInteractiveNudge(
    params: { caseId: string; customerPhone: string; amountInr: number; idempotencyKey: string },
    caseData: SyntheticRecoveryCase
  ): Promise<GatewayExecutionResponse> {
    const simResult: ExecutionResult = await executeSimulatedAction({
      caseData,
      action: 'INTERACTIVE_WHATSAPP_NUDGE',
      idempotencyKey: params.idempotencyKey,
    });

    return {
      success: simResult.success,
      actionExecuted: 'INTERACTIVE_WHATSAPP_NUDGE',
      referenceId: simResult.razorpayReferenceId,
      amountRecoveredInr: simResult.amountRecoveredInr,
      costIncurredInr: simResult.costIncurredInr,
      status: simResult.success ? 'SUCCESS' : 'FAILED',
      message: simResult.message,
      environment: this.environment,
      timestamp: simResult.timestamp,
      rawResponse: simResult.rawResponse,
    };
  }

  async getPaymentStatus(paymentId: string): Promise<{ status: string; amountInr: number; settled: boolean }> {
    return {
      status: 'simulated_captured',
      amountInr: 2499,
      settled: true,
    };
  }

  async verifyIdempotency(idempotencyKey: string): Promise<boolean> {
    return Boolean(idempotencyKey && idempotencyKey.length > 0);
  }
}

/**
 * Production Razorpay Adapter Interface & Stub.
 * Explicitly DISABLED in hackathon demo mode to guarantee zero live real-money execution.
 */
export class ProductionRazorpayAdapter implements PaymentGatewayAdapter {
  public readonly name = 'Production Razorpay Live Gateway (Guarded)';
  
  public get environment(): GatewayEnvironmentState {
    const key = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (key && secret && key !== 'rzp_live_placeholder') {
      return 'PRODUCTION_READY';
    }
    return 'PRODUCTION_DISABLED';
  }

  async executePaymentRetry(): Promise<GatewayExecutionResponse> {
    throw new Error(
      '[RecoverOS Safety Gate] Live money execution is strictly disabled in hackathon demonstration mode. Use RazorpaySandboxAdapter.'
    );
  }

  async createUpiPaymentLink(): Promise<GatewayExecutionResponse> {
    throw new Error(
      '[RecoverOS Safety Gate] Live payment link generation disabled in hackathon demo mode.'
    );
  }

  async requestPaymentInstrumentUpdate(): Promise<GatewayExecutionResponse> {
    throw new Error(
      '[RecoverOS Safety Gate] Live instrument update disabled in hackathon demo mode.'
    );
  }

  async sendInteractiveNudge(): Promise<GatewayExecutionResponse> {
    throw new Error(
      '[RecoverOS Safety Gate] Live messaging disabled in hackathon demo mode.'
    );
  }

  async getPaymentStatus(): Promise<{ status: string; amountInr: number; settled: boolean }> {
    return {
      status: 'disabled_in_demo',
      amountInr: 0,
      settled: false,
    };
  }

  async verifyIdempotency(): Promise<boolean> {
    return false;
  }
}

// Singleton active adapter instance (Defaults strictly to Sandbox Adapter)
export const activeSandboxAdapter = new RazorpaySandboxAdapter();
export const productionAdapterStub = new ProductionRazorpayAdapter();

export function getActiveGatewayAdapter(): PaymentGatewayAdapter {
  return activeSandboxAdapter;
}
