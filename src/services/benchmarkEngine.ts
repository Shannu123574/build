/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';
import {
  AiDiagnosisResult,
  BaselineCaseOutcome,
  BenchmarkComparisonSummary,
  BenchmarkEvaluationReport,
  CaseBenchmarkResult,
  FailureCategory,
  PolicyEvaluationResult,
  RecoveryAction,
  RecoverOsCaseOutcome,
  SyntheticRecoveryCase,
} from '../types.ts';
import { globalAuditLedger } from './auditLedger.ts';
import { classifyPaymentFailureFallback } from './fallbackClassifier.ts';
import { diagnosePaymentFailure } from './gemini.ts';
import { DEFAULT_POLICY_CONFIG, evaluatePolicyGuard, PolicyEngineConfig } from './policyEngine.ts';
import { razorpayService } from './razorpaySimulator.ts';

export type { BaselineCaseOutcome, RecoverOsCaseOutcome, CaseBenchmarkResult, BenchmarkEvaluationReport };

/**
 * Deterministic hash-based random float generator for repeatable simulation physics.
 */
function getDeterministicFloat(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const normalized = Math.abs(hash % 10000) / 10000;
  return normalized;
}

/**
 * Simulates industry-standard blind dunning strategy:
 * - Blind retry at fixed intervals (+24h, +48h, +72h)
 * - 1 notification per attempt (email/SMS @ ₹0.20 per message)
 * - No bank-health awareness
 * - No salary-cycle awareness
 * - No fraud detection (blindly retries fraud cards, failing and sending spam)
 * - Blind retries on expired cards always fail (0% recovery, 3 spam messages)
 */
export function simulateBaselineDunning(caseData: SyntheticRecoveryCase): BaselineCaseOutcome {
  const { groundTruthCategory, dayOfMonth, amountInr } = caseData;
  const isRecoverable = caseData.groundTruth?.isRecoverable ?? (groundTruthCategory !== 'FRAUD_SUSPICION_HIGH');
  const messageCostPerAttempt = 0.20; // ₹0.20 per standard SMS/Email notification

  // 1. Fraud cases: Blind dunning exhausts all 3 attempts, sending 3 spam notifications, fails completely
  if (groundTruthCategory === 'FRAUD_SUSPICION_HIGH' || !isRecoverable) {
    return {
      recovered: false,
      amountRecoveredInr: 0,
      attemptsMade: 3,
      messagesSent: 3,
      interventionCostInr: 3 * messageCostPerAttempt,
      strategy: 'Blind Fixed 24/48/72h Retry',
      notes: 'Blind retry failed on high-risk/unrecoverable card; 3 spam notifications sent.',
    };
  }

  // 2. Expired instrument: Blind retry on expired token always fails on all 3 attempts
  if (groundTruthCategory === 'EXPIRED_INSTRUMENT') {
    return {
      recovered: false,
      amountRecoveredInr: 0,
      attemptsMade: 3,
      messagesSent: 3,
      interventionCostInr: 3 * messageCostPerAttempt,
      strategy: 'Blind Fixed 24/48/72h Retry',
      notes: 'Blind retry repeatedly failed on expired token; requires card update.',
    };
  }

  // 3. Bank Outage: Blind retry after 24h may succeed if CBS recovered, but fails if retry hits ongoing latency
  if (groundTruthCategory === 'TEMPORARY_ISSUER_OUTAGE') {
    const roll = getDeterministicFloat(`baseline_outage_${caseData.id}`);
    // Baseline recovery probability without smart timing ~ 45%
    const success = roll < 0.45;
    const attempts = success ? (roll < 0.25 ? 1 : 2) : 3;
    return {
      recovered: success,
      amountRecoveredInr: success ? amountInr : 0,
      attemptsMade: attempts,
      messagesSent: attempts,
      interventionCostInr: attempts * messageCostPerAttempt,
      strategy: 'Blind Fixed 24/48/72h Retry',
      notes: success
        ? `Recovered on attempt ${attempts} by chance after bank recovered.`
        : 'Failed all 3 blind attempts during bank degraded performance.',
    };
  }

  // 4. Insufficient Funds: Blind retry fails if scheduled before monthly salary deposit
  if (groundTruthCategory === 'INSUFFICIENT_FUNDS_TRANSIENT') {
    const isPreSalary = dayOfMonth >= 25 && dayOfMonth <= 30;
    const roll = getDeterministicFloat(`baseline_funds_${caseData.id}`);
    // Low baseline recovery during pre-salary window (~20%), slightly higher mid-month (~35%)
    const recoveryThreshold = isPreSalary ? 0.20 : 0.35;
    const success = roll < recoveryThreshold;
    const attempts = success ? 2 : 3;
    return {
      recovered: success,
      amountRecoveredInr: success ? amountInr : 0,
      attemptsMade: attempts,
      messagesSent: attempts,
      interventionCostInr: attempts * messageCostPerAttempt,
      strategy: 'Blind Fixed 24/48/72h Retry',
      notes: success
        ? `Recovered on attempt ${attempts} after funds became available.`
        : 'Failed all attempts due to lack of salary-cycle coordination.',
    };
  }

  // 5. Checkout / 3DS Abandonment: Static reminder email conversion is low (~25%)
  if (groundTruthCategory === 'AUTHENTICATION_ABANDONMENT') {
    const roll = getDeterministicFloat(`baseline_abandon_${caseData.id}`);
    const success = roll < 0.25;
    const attempts = success ? 1 : 3;
    return {
      recovered: success,
      amountRecoveredInr: success ? amountInr : 0,
      attemptsMade: attempts,
      messagesSent: attempts,
      interventionCostInr: attempts * messageCostPerAttempt,
      strategy: 'Blind Static Email Dunning',
      notes: success
        ? 'Customer converted from static reminder email.'
        : 'Customer ignored generic static email reminder.',
    };
  }

  // 6. Gateway Timeout
  if (groundTruthCategory === 'GATEWAY_TIMEOUT') {
    const roll = getDeterministicFloat(`baseline_gw_${caseData.id}`);
    const success = roll < 0.60;
    const attempts = success ? 1 : 2;
    return {
      recovered: success,
      amountRecoveredInr: success ? amountInr : 0,
      attemptsMade: attempts,
      messagesSent: attempts,
      interventionCostInr: attempts * messageCostPerAttempt,
      strategy: 'Blind Fixed 24h Retry',
      notes: success ? 'Recovered on next blind retry.' : 'Failed blind retries.',
    };
  }

  return {
    recovered: false,
    amountRecoveredInr: 0,
    attemptsMade: 3,
    messagesSent: 3,
    interventionCostInr: 3 * messageCostPerAttempt,
    strategy: 'Blind Fixed 24/48/72h Retry',
    notes: 'Unclassified failure mode.',
  };
}

/**
 * Simulates RecoverOS intelligent execution for a single incident:
 * 1. AI or Fallback diagnosis
 * 2. Deterministic 6-Gate Policy Guard (Default-to-DENY)
 * 3. Approved actions dispatched to Razorpay Simulator
 * 4. Actual simulator execution outcome recorded
 */
export async function simulateRecoverOsExecution(
  caseData: SyntheticRecoveryCase,
  options?: {
    useAiDiagnosis?: boolean;
    policyConfig?: PolicyEngineConfig;
    currentDailySpendInr?: number;
  }
): Promise<RecoverOsCaseOutcome> {
  const useAi = options?.useAiDiagnosis ?? false;
  const policyConfig = options?.policyConfig ?? DEFAULT_POLICY_CONFIG;
  const currentDailySpend = options?.currentDailySpendInr ?? 0;

  // Step 1: AI Diagnosis (or Fallback Classifier)
  let diagnosis: AiDiagnosisResult;
  if (useAi) {
    diagnosis = await diagnosePaymentFailure(caseData);
  } else {
    diagnosis = classifyPaymentFailureFallback(caseData);
  }

  // Step 2: Deterministic Policy Engine Evaluation (DEFAULT-TO-DENY)
  const policy = evaluatePolicyGuard(caseData, diagnosis, policyConfig, currentDailySpend);

  const baseTimestamp = 1700000000000 + parseInt(caseData.id.replace(/\\D/g, '') || '0', 10);

  // Step 3: Execution Authorization Guard
  if (!policy.approved || policy.actionToExecute === 'DO_NOT_RETRY_CHURN_RISK') {
    globalAuditLedger.append({
      caseId: caseData.id,
      action: policy.actionToExecute || 'DO_NOT_RETRY_CHURN_RISK',
      actor: 'SYSTEM_POLICY',
      debitAtRiskInr: caseData.amountInr,
      creditRecoveredInr: 0,
      costIncurredInr: 0,
      status: 'BLOCKED',
      payloadSummary: `Policy denied execution: ${policy.denialReason || 'Terminal safety block'}`,
      customTimestamp: baseTimestamp,
    });

    return {
      diagnosis,
      policy,
      executed: false,
      actionExecuted: 'DO_NOT_RETRY_CHURN_RISK',
      recovered: false,
      amountRecoveredInr: 0,
      messagesSent: 0,
      interventionCostInr: 0,
      executionRef: 'POLICY_DENIED_SAFEGUARD',
      notes: `Policy denied execution: ${policy.denialReason || 'Terminal safety block'}`,
    };
  }

  // Step 4: Razorpay Simulator Execution
  const idempotencyKey = `bench_exec_${caseData.id}`;
  const simResult = razorpayService.executeApprovedAction(
    caseData,
    policy.actionToExecute,
    idempotencyKey
  );

  // Determine messages sent based on action type
  let messagesSent = 0;
  if (policy.actionToExecute === 'INTERACTIVE_WHATSAPP_NUDGE') {
    messagesSent = 1;
  } else if (
    policy.actionToExecute === 'FALLBACK_UPI_PAYMENT_LINK' ||
    policy.actionToExecute === 'CARD_UPDATE_PROMPT'
  ) {
    messagesSent = 1;
  } else if (policy.actionToExecute === 'SMART_RETRY_SCHEDULE') {
    // Zero outreach spam; token retry operates in background
    messagesSent = 0;
  }

  return {
    diagnosis,
    policy,
    executed: true,
    actionExecuted: policy.actionToExecute,
    recovered: simResult.success,
    amountRecoveredInr: simResult.amountRecoveredInr,
    messagesSent,
    interventionCostInr: simResult.costIncurredInr,
    executionRef: simResult.razorpayReferenceId,
    notes: simResult.message,
  };
}

/**
 * Executes a full comparative benchmark evaluation across the entire 100-case dataset.
 */
export async function runComparativeBenchmark(
  dataset: SyntheticRecoveryCase[] = SYNTHETIC_DATASET,
  options?: {
    useAiDiagnosis?: boolean;
    policyConfig?: PolicyEngineConfig;
  }
): Promise<BenchmarkEvaluationReport> {
  razorpayService.clearIdempotencyStore();
  const caseResults: CaseBenchmarkResult[] = [];

  let totalRevenueAtRiskInr = 0;

  // Baseline accumulators
  let baselineCasesRecovered = 0;
  let baselineRevenueRecoveredInr = 0;
  let baselineInterventionCostsInr = 0;
  let baselineSpamMessagesSent = 0;

  // RecoverOS accumulators
  let aiCasesRecovered = 0;
  let aiRevenueRecoveredInr = 0;
  let aiInterventionCostsInr = 0;
  let aiSpamMessagesSent = 0;

  // Category breakdown tracker
  const categoryBreakdown: Record<
    FailureCategory,
    {
      count: number;
      totalAtRiskInr: number;
      baselineRecoveredInr: number;
      baselineCasesRecovered: number;
      aiRecoveredInr: number;
      aiCasesRecovered: number;
    }
  > = {
    TEMPORARY_ISSUER_OUTAGE: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    INSUFFICIENT_FUNDS_TRANSIENT: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    EXPIRED_INSTRUMENT: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    INVALID_CARD_DETAILS: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    AUTHENTICATION_ABANDONMENT: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    FRAUD_SUSPICION_HIGH: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    GATEWAY_TIMEOUT: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    NETWORK_TIMEOUT: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    MANDATE_FAILURE: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    UPI_AUTOPAY_FAILURE: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    EXCESSIVE_RETRY_VELOCITY: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    DUPLICATE_WEBHOOK: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    FORGED_WEBHOOK: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
    UNKNOWN_ANOMALY: { count: 0, totalAtRiskInr: 0, baselineRecoveredInr: 0, baselineCasesRecovered: 0, aiRecoveredInr: 0, aiCasesRecovered: 0 },
  };

  let runningDailySpendInr = 0;

  for (const caseData of dataset) {
    totalRevenueAtRiskInr += caseData.amountInr;

    // Track category totals
    const cat = caseData.groundTruthCategory;
    if (categoryBreakdown[cat]) {
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].totalAtRiskInr += caseData.amountInr;
    }

    // 1. Execute Baseline
    const baselineOutcome = simulateBaselineDunning(caseData);
    if (baselineOutcome.recovered) {
      baselineCasesRecovered++;
      baselineRevenueRecoveredInr += baselineOutcome.amountRecoveredInr;
      if (categoryBreakdown[cat]) {
        categoryBreakdown[cat].baselineRecoveredInr += baselineOutcome.amountRecoveredInr;
        categoryBreakdown[cat].baselineCasesRecovered++;
      }
    }
    baselineInterventionCostsInr += baselineOutcome.interventionCostInr;
    baselineSpamMessagesSent += baselineOutcome.messagesSent;

    // 2. Execute RecoverOS
    const recoverosOutcome = await simulateRecoverOsExecution(caseData, {
      useAiDiagnosis: options?.useAiDiagnosis ?? false,
      policyConfig: options?.policyConfig,
      currentDailySpendInr: runningDailySpendInr,
    });

    runningDailySpendInr += recoverosOutcome.interventionCostInr;

    if (recoverosOutcome.recovered) {
      aiCasesRecovered++;
      aiRevenueRecoveredInr += recoverosOutcome.amountRecoveredInr;
      if (categoryBreakdown[cat]) {
        categoryBreakdown[cat].aiRecoveredInr += recoverosOutcome.amountRecoveredInr;
        categoryBreakdown[cat].aiCasesRecovered++;
      }
    }
    aiInterventionCostsInr += recoverosOutcome.interventionCostInr;
    aiSpamMessagesSent += recoverosOutcome.messagesSent;

    caseResults.push({
      caseId: caseData.id,
      amountInr: caseData.amountInr,
      groundTruthCategory: caseData.groundTruthCategory,
      isRecoverable: caseData.groundTruth?.isRecoverable ?? false,
      baseline: baselineOutcome,
      recoveros: recoverosOutcome,
    });
  }

  // Calculate Net Profits and Derived Metrics
  const baselineNetProfitInr = baselineRevenueRecoveredInr - baselineInterventionCostsInr;
  const aiNetProfitInr = aiRevenueRecoveredInr - aiInterventionCostsInr;

  const baselineRecoveryRatePercent =
    totalRevenueAtRiskInr > 0 ? (baselineRevenueRecoveredInr / totalRevenueAtRiskInr) * 100 : 0;
  const aiRecoveryRatePercent =
    totalRevenueAtRiskInr > 0 ? (aiRevenueRecoveredInr / totalRevenueAtRiskInr) * 100 : 0;

  const incrementalRevenueRecoveredInr = aiRevenueRecoveredInr - baselineRevenueRecoveredInr;
  const incrementalNetProfitInr = aiNetProfitInr - baselineNetProfitInr;
  const incrementalRecoveryRateLiftPercent = aiRecoveryRatePercent - baselineRecoveryRatePercent;

  const spamReductionPercent =
    baselineSpamMessagesSent > 0
      ? ((baselineSpamMessagesSent - aiSpamMessagesSent) / baselineSpamMessagesSent) * 100
      : 0;

  const summary: BenchmarkComparisonSummary = {
    totalCases: dataset.length,
    totalRevenueAtRiskInr: Math.round(totalRevenueAtRiskInr),
    baselineCasesRecovered,
    baselineRevenueRecoveredInr: Math.round(baselineRevenueRecoveredInr),
    baselineInterventionCostsInr: parseFloat(baselineInterventionCostsInr.toFixed(2)),
    baselineNetProfitInr: Math.round(baselineNetProfitInr),
    baselineRecoveryRatePercent: parseFloat(baselineRecoveryRatePercent.toFixed(2)),
    baselineSpamMessagesSent,
    aiCasesRecovered,
    aiRevenueRecoveredInr: Math.round(aiRevenueRecoveredInr),
    aiInterventionCostsInr: parseFloat(aiInterventionCostsInr.toFixed(2)),
    aiNetProfitInr: Math.round(aiNetProfitInr),
    aiRecoveryRatePercent: parseFloat(aiRecoveryRatePercent.toFixed(2)),
    aiSpamMessagesSent,
    incrementalRevenueRecoveredInr: Math.round(incrementalRevenueRecoveredInr),
    incrementalNetProfitInr: Math.round(incrementalNetProfitInr),
    incrementalRecoveryRateLiftPercent: parseFloat(incrementalRecoveryRateLiftPercent.toFixed(2)),
    spamReductionPercent: parseFloat(spamReductionPercent.toFixed(2)),
  };

  return {
    summary,
    caseResults,
    categoryBreakdown,
    executionTimestamp: Date.now(),
  };
}
