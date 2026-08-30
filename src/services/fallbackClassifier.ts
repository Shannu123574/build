/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AiDiagnosisResult,
  FailureCategory,
  RecoveryAction,
  SyntheticRecoveryCase,
} from '../types.ts';

/**
 * Pure deterministic rule-based fallback classifier.
 * Activated whenever Gemini API is unavailable, offline, rate-limited, or when API key is unconfigured.
 */
export function classifyPaymentFailureFallback(
  caseData: SyntheticRecoveryCase
): AiDiagnosisResult {
  const {
    id,
    errorCode,
    errorSource,
    paymentMethod,
    bankHealthScore,
    dayOfMonth,
    consecutiveFailureCount,
    amountInr,
  } = caseData;

  let failureCategory: FailureCategory = 'UNKNOWN_ANOMALY';
  let confidenceScore = 0.85;
  let predictedRecoveryProbability = 0.50;
  let suggestedAction: RecoveryAction = 'SMART_RETRY_SCHEDULE';
  let recommendedExecutionDelayMinutes = 60;
  let reasoning = '';
  const riskFactors: string[] = [];

  // Rule 1: Fraud or High Risk Signs
  if (
    errorCode === 'PAYMENT_RISK_CHECK_FAILED' ||
    errorCode === 'HIGH_RISK_FRAUD_SIGNATURE' ||
    errorCode === 'RESTRICTED_CARD_BLOCKED' ||
    consecutiveFailureCount >= 4
  ) {
    failureCategory = 'FRAUD_SUSPICION_HIGH';
    confidenceScore = 0.95;
    predictedRecoveryProbability = 0.0;
    suggestedAction = 'DO_NOT_RETRY_CHURN_RISK';
    recommendedExecutionDelayMinutes = 0;
    reasoning = 'Deterministic safety rule: High fraud risk signature or extreme consecutive failure velocity. Retries blocked to prevent chargeback fees.';
    riskFactors.push('Elevated fraud score signature', 'High chargeback risk', 'Multiple rapid card attempts');
  }
  // Rule 2: Expired payment instrument
  else if (
    errorCode === 'CARD_EXPIRED' ||
    errorCode === 'MANDATE_INACTIVE' ||
    errorCode === 'TOKEN_INVALID_EXPIRY'
  ) {
    failureCategory = 'EXPIRED_INSTRUMENT';
    confidenceScore = 0.92;
    predictedRecoveryProbability = 0.72;
    suggestedAction = 'CARD_UPDATE_PROMPT';
    recommendedExecutionDelayMinutes = 30;
    reasoning = 'Payment instrument or recurring mandate token has expired. Automated retries will fail; customer must update credentials via secure 1-click portal.';
    riskFactors.push('Instrument validity expired', 'Mandate invalidated');
  }
  // Rule 3: Temporary bank outage or server timeout
  else if (
    errorCode === 'BAD_REQUEST_PAYMENT_TIMED_OUT' ||
    errorCode === 'BANK_SYSTEM_OUTAGE' ||
    errorCode === 'GATEWAY_ERROR_NETWORK_FAILURE' ||
    bankHealthScore < 0.50
  ) {
    failureCategory = 'TEMPORARY_ISSUER_OUTAGE';
    confidenceScore = 0.90;
    predictedRecoveryProbability = 0.91;
    suggestedAction = 'SMART_RETRY_SCHEDULE';
    recommendedExecutionDelayMinutes = 180;
    reasoning = `Issuing bank or network experiencing transient CBS degradation (Bank Health: ${(((bankHealthScore ?? 0)) * 100).toFixed(0)}%). Smart retry scheduled after health recovery window.`;
    riskFactors.push('Issuer CBS latency', 'Intermittent bank gateway downtime');
  }
  // Rule 4: Gateway aggregator timeout
  else if (
    errorCode === 'GATEWAY_SERVICE_UNAVAILABLE' ||
    errorCode === 'GATEWAY_TIMEOUT_SOCKET'
  ) {
    failureCategory = 'GATEWAY_TIMEOUT';
    confidenceScore = 0.88;
    predictedRecoveryProbability = 0.89;
    suggestedAction = 'SMART_RETRY_SCHEDULE';
    recommendedExecutionDelayMinutes = 20;
    reasoning = 'Payment aggregator socket timeout. Short backoff retry recommended.';
    riskFactors.push('Transient socket reset');
  }
  // Rule 5: User drop-off or 3DS / UPI intent abandonment
  else if (
    errorCode === 'PAYMENT_AUTHENTICATION_TIMED_OUT' ||
    errorCode === 'OTP_NOT_ENTERED' ||
    errorCode === 'CUSTOMER_ABANDONED_CHECKOUT' ||
    errorSource === 'customer' && paymentMethod === 'upi'
  ) {
    failureCategory = 'AUTHENTICATION_ABANDONMENT';
    confidenceScore = 0.87;
    predictedRecoveryProbability = 0.82;
    suggestedAction = 'FALLBACK_UPI_PAYMENT_LINK';
    recommendedExecutionDelayMinutes = 15;
    reasoning = 'Customer abandoned checkout or missed 3DS/UPI notification. Instant dynamic fallback payment link recommended.';
    riskFactors.push('Intent drop-off', '3DS screen timeout');
  }
  // Rule 6: Insufficient funds / liquidity timing
  else if (
    errorCode === 'INSUFFICIENT_FUNDS' ||
    errorCode === 'PAYMENT_DECLINED_LOW_BALANCE'
  ) {
    failureCategory = 'INSUFFICIENT_FUNDS_TRANSIENT';
    confidenceScore = 0.89;
    // Salary cycle awareness: end of month (27-31) has higher recovery if delayed or nudged
    const isEndOfMonth = dayOfMonth >= 27;
    predictedRecoveryProbability = isEndOfMonth ? 0.85 : 0.70;
    suggestedAction = 'INTERACTIVE_WHATSAPP_NUDGE';
    recommendedExecutionDelayMinutes = isEndOfMonth ? 1440 : 360;
    reasoning = `Low account balance detected on day ${dayOfMonth} of the month. Interactive gentle WhatsApp nudge recommended${isEndOfMonth ? ' aligned with salary cycle' : ''}.`;
    riskFactors.push('Temporary liquidity constraint');
  }
  // Default general fallback
  else {
    failureCategory = 'UNKNOWN_ANOMALY';
    confidenceScore = 0.60;
    predictedRecoveryProbability = amountInr > 10000 ? 0.30 : 0.50;
    suggestedAction = 'ESCALATE_HUMAN_OPS';
    recommendedExecutionDelayMinutes = 60;
    reasoning = 'Unclassified payment failure or unknown error signature. Escalation to merchant human operations recommended.';
    riskFactors.push('Ambiguous gateway code', 'Manual ops inspection required');
  }

  const caseNum = parseInt(id.replace(/[^0-9]/g, '') || '0', 10);
  const deterministicTimestamp = 1700000000000 + caseNum * 1000;

  return {
    id: `diag_fb_${id}`,
    caseId: id,
    failureCategory,
    confidenceScore,
    predictedRecoveryProbability,
    suggestedAction,
    recommendedExecutionDelayMinutes,
    reasoning,
    riskFactors,
    isAiFallback: true,
    timestamp: deterministicTimestamp,
  };
}
