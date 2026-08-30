/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AiDiagnosisResult,
  PolicyEvaluationResult,
  RecoveryAction,
  SyntheticRecoveryCase,
} from '../types.ts';

export interface PolicyEngineConfig {
  maxRetriesPerIncident: number;
  minCooldownMinutes: number;
  fraudDenyThreshold: number; // 0.0 - 1.0 (default: 0.65)
  dailyInterventionBudgetInr: number;
  customerFatigueCostInr: number;
  actionCostMapInr: Record<RecoveryAction, number>;
}

export const DEFAULT_POLICY_CONFIG: PolicyEngineConfig = {
  maxRetriesPerIncident: 3,
  minCooldownMinutes: 120,
  fraudDenyThreshold: 0.65,
  dailyInterventionBudgetInr: 5000,
  customerFatigueCostInr: 15.00,
  actionCostMapInr: {
    SMART_RETRY_SCHEDULE: 0.00,
    FALLBACK_UPI_PAYMENT_LINK: 0.20,
    ALTERNATIVE_PAYMENT_METHOD: 0.20,
    CARD_UPDATE_PROMPT: 0.20,
    INTERACTIVE_WHATSAPP_NUDGE: 0.85,
    CUSTOMER_NOTIFICATION: 0.50,
    MANDATE_REAUTH: 0.20,
    ESCALATE_HUMAN_OPS: 50.00,
    ESCALATE_FOR_REVIEW: 50.00,
    DO_NOT_RETRY_CHURN_RISK: 0.00,
    DO_NOT_RETRY_FRAUD: 0.00,
  },
};

const ACTION_WHITELIST: RecoveryAction[] = [
  'SMART_RETRY_SCHEDULE',
  'FALLBACK_UPI_PAYMENT_LINK',
  'ALTERNATIVE_PAYMENT_METHOD',
  'CARD_UPDATE_PROMPT',
  'INTERACTIVE_WHATSAPP_NUDGE',
  'CUSTOMER_NOTIFICATION',
  'MANDATE_REAUTH',
  'DO_NOT_RETRY_CHURN_RISK',
  'DO_NOT_RETRY_FRAUD',
  'ESCALATE_HUMAN_OPS',
  'ESCALATE_FOR_REVIEW'
];

/**
 * Deterministic Default-to-DENY Policy Engine.
 * 
 * Guarantees that the LLM NEVER has unrestricted financial or execution authority.
 * Evaluates strictly in the required 6-step sequence:
 * 1. Action whitelist
 * 2. Maximum retry limit
 * 3. Cooldown
 * 4. Fraud/risk threshold
 * 5. Expected economic ROI
 * 6. Daily budget cap
 */
export function evaluatePolicyGuard(
  caseData: SyntheticRecoveryCase,
  diagnosis: AiDiagnosisResult,
  config: PolicyEngineConfig = DEFAULT_POLICY_CONFIG,
  currentDailySpendInr = 0,
  minutesSinceLastAttempt?: number
): PolicyEvaluationResult {
  const rulesEvaluated: Array<{ ruleName: string; passed: boolean; note: string }> = [];
  const proposedAction = diagnosis.suggestedAction;
  const caseNum = parseInt(caseData.id.replace(/[^0-9]/g, '') || '0', 10);
  const evalTimestamp = 1700000000000 + caseNum * 1000;

  // Gate 1: Action Whitelist
  const isWhitelisted = ACTION_WHITELIST.includes(proposedAction);
  rulesEvaluated.push({
    ruleName: 'ACTION_WHITELIST_CHECK',
    passed: isWhitelisted,
    note: isWhitelisted
      ? `Action '${proposedAction}' is in approved whitelist.`
      : `Action '${proposedAction}' is NOT recognized or whitelisted.`,
  });

  if (!isWhitelisted) {
    return {
      id: `pol_${caseData.id}`,
      caseId: caseData.id,
      approved: false,
      denialReason: 'UNAUTHORIZED_ACTION',
      actionToExecute: 'DO_NOT_RETRY_CHURN_RISK',
      interventionCostInr: 0,
      expectedNetGainInr: 0,
      rulesEvaluated,
      timestamp: evalTimestamp,
    };
  }

  // Gate 2: Maximum Retry Limit
  const isAttemptAllowed = caseData.attemptNumber <= config.maxRetriesPerIncident;
  rulesEvaluated.push({
    ruleName: 'MAX_RETRY_LIMIT_CHECK',
    passed: isAttemptAllowed,
    note: isAttemptAllowed
      ? `Attempt ${caseData.attemptNumber} of max ${config.maxRetriesPerIncident} allowed.`
      : `Attempt ${caseData.attemptNumber} exceeds maximum allowed limit of ${config.maxRetriesPerIncident}.`,
  });

  if (!isAttemptAllowed) {
    return {
      id: `pol_${caseData.id}`,
      caseId: caseData.id,
      approved: false,
      denialReason: 'RETRY_LIMIT_EXCEEDED',
      actionToExecute: 'DO_NOT_RETRY_CHURN_RISK',
      interventionCostInr: 0,
      expectedNetGainInr: 0,
      rulesEvaluated,
      timestamp: evalTimestamp,
    };
  }

  // Gate 3: Cooldown
  const isCooldownViolation =
    minutesSinceLastAttempt !== undefined &&
    caseData.attemptNumber > 1 &&
    minutesSinceLastAttempt < config.minCooldownMinutes;

  rulesEvaluated.push({
    ruleName: 'COOLDOWN_ACTIVE_CHECK',
    passed: !isCooldownViolation,
    note: isCooldownViolation
      ? `Cooldown violation: elapsed ${minutesSinceLastAttempt} min < required ${config.minCooldownMinutes} min.`
      : `Cooldown requirements satisfied.`,
  });

  if (isCooldownViolation) {
    return {
      id: `pol_${caseData.id}`,
      caseId: caseData.id,
      approved: false,
      denialReason: 'COOLDOWN_ACTIVE',
      actionToExecute: 'DO_NOT_RETRY_CHURN_RISK',
      interventionCostInr: 0,
      expectedNetGainInr: 0,
      rulesEvaluated,
      timestamp: evalTimestamp,
    };
  }

  // Gate 4: Fraud / Risk Threshold
  const isFraudCategory = diagnosis.failureCategory === 'FRAUD_SUSPICION_HIGH';
  const isFraudCode =
    caseData.errorCode === 'PAYMENT_RISK_CHECK_FAILED' ||
    caseData.errorCode === 'HIGH_RISK_FRAUD_SIGNATURE' ||
    caseData.errorCode === 'RESTRICTED_CARD_BLOCKED';
  const isFraudBlocked = isFraudCategory || isFraudCode || proposedAction === 'DO_NOT_RETRY_CHURN_RISK';

  rulesEvaluated.push({
    ruleName: 'FRAUD_RISK_SHIELD',
    passed: !isFraudBlocked,
    note: isFraudBlocked
      ? 'High risk / fraud signature detected. Financial execution strictly BLOCKED to prevent chargeback loss.'
      : 'Risk assessment within safe thresholds.',
  });

  if (isFraudBlocked) {
    return {
      id: `pol_${caseData.id}`,
      caseId: caseData.id,
      approved: false,
      denialReason: 'FRAUD_SCORE_EXCEEDS_THRESHOLD',
      actionToExecute: 'DO_NOT_RETRY_CHURN_RISK',
      interventionCostInr: 0,
      expectedNetGainInr: 0,
      rulesEvaluated,
      timestamp: evalTimestamp,
    };
  }

  // Gate 5: Expected Economic ROI Hurdle
  // E[Net Value] = (P_rec * Amount) - InterventionCost - (ChurnRisk * FatigueCost)
  const interventionCost = config.actionCostMapInr[proposedAction] ?? 0.50;
  const isOutreachAction =
    proposedAction === 'INTERACTIVE_WHATSAPP_NUDGE' ||
    proposedAction === 'FALLBACK_UPI_PAYMENT_LINK' ||
    proposedAction === 'CARD_UPDATE_PROMPT';

  const churnRisk = isOutreachAction ? 0.04 : 0.0;
  const fatiguePenalty = churnRisk * config.customerFatigueCostInr;
  const expectedGrossRecovery = diagnosis.predictedRecoveryProbability * caseData.amountInr;
  const expectedNetGain = expectedGrossRecovery - interventionCost - fatiguePenalty;

  const isEconomicallyViable = expectedNetGain > 0;
  rulesEvaluated.push({
    ruleName: 'ECONOMIC_RATIONALITY_HURDLE',
    passed: isEconomicallyViable,
    note: isEconomicallyViable
      ? `Expected Net Gain: +₹${expectedNetGain.toFixed(2)} (Gross: ₹${expectedGrossRecovery.toFixed(2)} - Cost: ₹${interventionCost.toFixed(2)} - Penalty: ₹${fatiguePenalty.toFixed(2)}) > 0.`
      : `Negative Expected Value: ₹${expectedNetGain.toFixed(2)} <= 0. Intervention rejected to avoid financial loss.`,
  });

  if (!isEconomicallyViable) {
    return {
      id: `pol_${caseData.id}`,
      caseId: caseData.id,
      approved: false,
      denialReason: 'NEGATIVE_EXPECTED_ROI',
      actionToExecute: 'DO_NOT_RETRY_CHURN_RISK',
      interventionCostInr: 0,
      expectedNetGainInr: expectedNetGain,
      rulesEvaluated,
      timestamp: evalTimestamp,
    };
  }

  // Gate 6: Merchant Daily Intervention Budget Cap
  const wouldExceedDailyBudget = (currentDailySpendInr + interventionCost) > config.dailyInterventionBudgetInr;
  rulesEvaluated.push({
    ruleName: 'DAILY_BUDGET_CAP_CHECK',
    passed: !wouldExceedDailyBudget,
    note: !wouldExceedDailyBudget
      ? `Daily spend ₹${currentDailySpendInr.toFixed(2)} + ₹${interventionCost.toFixed(2)} is within budget limit of ₹${config.dailyInterventionBudgetInr.toFixed(2)}.`
      : `Daily spend would exceed merchant budget cap of ₹${config.dailyInterventionBudgetInr.toFixed(2)}.`,
  });

  if (wouldExceedDailyBudget) {
    return {
      id: `pol_${caseData.id}`,
      caseId: caseData.id,
      approved: false,
      denialReason: 'DAILY_BUDGET_EXCEEDED',
      actionToExecute: 'DO_NOT_RETRY_CHURN_RISK',
      interventionCostInr: 0,
      expectedNetGainInr: expectedNetGain,
      rulesEvaluated,
      timestamp: evalTimestamp,
    };
  }

  // ALL GATES PASSED: Deterministic Approval
  const isApproved = true;
  return {
    id: `pol_${evalTimestamp}`,
    caseId: caseData.id,
    approved: isApproved,
    accepted: isApproved, // Defensive fallback
    actionToExecute: isApproved ? proposedAction : 'DO_NOT_RETRY_CHURN_RISK',
    interventionCostInr: interventionCost,
    expectedNetGainInr: parseFloat(expectedNetGain.toFixed(2)),
    rulesEvaluated,
    timestamp: evalTimestamp,
  };
}

export { evaluatePolicyGuard as evaluateRecoveryPolicy };

