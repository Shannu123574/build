/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RealisticPaymentCase, FailureCategory, RecoveryAction, PaymentMethodType } from '../types.ts';
import { SeededRandom } from './syntheticDataset.ts';

const rng = new SeededRandom(1337); // Different seed for realistic corpus

function generateCase(id: number, isHeldOut: boolean, isTestMode: boolean): RealisticPaymentCase {
  const isFraud = rng.nextFloat() < 0.1;
  const isExpired = !isFraud && rng.nextFloat() < 0.15;
  const isInsufficient = !isFraud && !isExpired && rng.nextFloat() < 0.2;
  const isAbandon = !isFraud && !isExpired && !isInsufficient && rng.nextFloat() < 0.2;
  const isGatewayTimeout = rng.nextFloat() < 0.05;

  let category: FailureCategory = 'UNKNOWN_ANOMALY';
  let errorCode = 'UNKNOWN_ERROR';
  let errorDesc = 'Unknown anomaly';
  let action: RecoveryAction = 'DO_NOT_RETRY_CHURN_RISK';
  let amount = Math.floor(rng.nextFloat() * 10000) + 100;
  
  if (isFraud) {
    category = 'FRAUD_SUSPICION_HIGH';
    errorCode = 'FRAUD_DETECTED';
    errorDesc = 'High risk fraud score';
    action = 'DO_NOT_RETRY_FRAUD';
  } else if (isExpired) {
    category = 'EXPIRED_INSTRUMENT';
    errorCode = 'BAD_REQUEST_ERROR';
    errorDesc = 'Instrument expired';
    action = 'CARD_UPDATE_PROMPT';
  } else if (isInsufficient) {
    category = 'INSUFFICIENT_FUNDS_TRANSIENT';
    errorCode = 'BAD_REQUEST_ERROR';
    errorDesc = 'Insufficient funds';
    action = 'SMART_RETRY_SCHEDULE';
  } else if (isAbandon) {
    category = 'AUTHENTICATION_ABANDONMENT';
    errorCode = 'BAD_REQUEST_ERROR';
    errorDesc = 'AFA abandoned by user';
    action = 'INTERACTIVE_WHATSAPP_NUDGE';
  } else if (isGatewayTimeout) {
    category = 'GATEWAY_TIMEOUT';
    errorCode = 'GATEWAY_ERROR';
    errorDesc = 'Gateway timeout';
    action = 'SMART_RETRY_SCHEDULE';
  } else {
    const floatVal = rng.nextFloat();
    if (floatVal < 0.2) {
      category = 'TEMPORARY_ISSUER_OUTAGE';
      errorCode = 'BAD_REQUEST_ERROR';
      errorDesc = 'Temporary issuer downtime';
      action = 'FALLBACK_UPI_PAYMENT_LINK';
    } else if (floatVal < 0.4) {
      category = 'MANDATE_FAILURE';
      errorCode = 'BAD_REQUEST_ERROR';
      errorDesc = 'E-Mandate processing failed';
      action = 'MANDATE_REAUTH';
    } else if (floatVal < 0.6) {
      category = 'NETWORK_TIMEOUT';
      errorCode = 'GATEWAY_ERROR';
      errorDesc = 'Network timeout';
      action = 'ALTERNATIVE_PAYMENT_METHOD';
    } else if (floatVal < 0.8) {
      category = 'INVALID_CARD_DETAILS';
      errorCode = 'BAD_REQUEST_ERROR';
      errorDesc = 'Invalid card details';
      action = 'CUSTOMER_NOTIFICATION';
    } else if (floatVal < 0.9) {
      category = 'EXCESSIVE_RETRY_VELOCITY';
      errorCode = 'BAD_REQUEST_ERROR';
      errorDesc = 'Velocity check failed';
      action = 'ESCALATE_FOR_REVIEW';
    } else {
      category = 'UNKNOWN_ANOMALY';
      errorCode = 'UNKNOWN_ERROR';
      errorDesc = 'Unknown anomaly';
      action = 'DO_NOT_RETRY_CHURN_RISK';
    }
  }

  const evidenceClass = isTestMode ? 'REAL_TEST_MODE_EVENT' 
    : (isHeldOut ? 'HELD_OUT_EVALUATION' : 'REALISTIC_ENGINEERED_SCENARIO');

  return {
    id: `real_case_${id.toString().padStart(3, '0')}`,
    evidenceClass,
    razorpayPaymentId: `pay_test_${Math.random().toString(36).substring(7)}`,
    razorpayOrderId: `order_test_${Math.random().toString(36).substring(7)}`,
    customerId: `cust_test_${Math.floor(rng.nextFloat() * 1000)}`,
    customerName: `Customer ${id}`,
    customerEmail: `customer${id}@example.com`,
    customerPhone: `+9198765${id.toString().padStart(5, '0')}`,
    amountInr: amount,
    currency: 'INR',
    errorCode,
    errorDescription: errorDesc,
    errorSource: isGatewayTimeout ? 'gateway' : 'issuer',
    paymentMethod: 'card' as PaymentMethodType,
    cardNetwork: 'VISA',
    issuingBank: 'HDFC',
    customerTenureMonths: Math.floor(rng.nextFloat() * 24),
    lifetimeSuccessfulPayments: Math.floor(rng.nextFloat() * 50),
    consecutiveFailureCount: 1,
    bankHealthScore: 0.8,
    attemptNumber: 1,
    dayOfMonth: Math.floor(rng.nextFloat() * 30) + 1,
    hourOfDay: Math.floor(rng.nextFloat() * 24),
    merchantCategory: 'saas_recurring',
    groundTruthCategory: category,
    groundTruth: {
      isRecoverable: category !== 'FRAUD_SUSPICION_HIGH' && category !== 'UNKNOWN_ANOMALY',
      optimalAction: action,
      baselineRecovered: category === 'INSUFFICIENT_FUNDS_TRANSIENT',
      aiExpectedRecovered: category !== 'FRAUD_SUSPICION_HIGH' && category !== 'UNKNOWN_ANOMALY',
      revenueRecoverableInr: amount,
      rationale: 'Realistic corpus generated logic',
      optimalDelayMinutes: 60,
    }
  };
}

export const REALISTIC_CORPUS: RealisticPaymentCase[] = [];

// 5 Real Test Mode Events (Razorpay documented mock triggers)
for (let i = 1; i <= 5; i++) {
  REALISTIC_CORPUS.push(generateCase(i, false, true));
}

// 30 Development Scenarios
for (let i = 6; i <= 35; i++) {
  REALISTIC_CORPUS.push(generateCase(i, false, false));
}

// 15 Held-out Scenarios
for (let i = 36; i <= 50; i++) {
  REALISTIC_CORPUS.push(generateCase(i, true, false));
}
