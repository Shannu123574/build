/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';
import { globalAuditLedger } from './auditLedger.ts';
import { classifyPaymentFailureFallback } from './fallbackClassifier.ts';
import { diagnosePaymentFailure } from './gemini.ts';
import { evaluatePolicyGuard, DEFAULT_POLICY_CONFIG } from './policyEngine.ts';
import { razorpayService } from './razorpaySimulator.ts';
import { SyntheticRecoveryCase } from '../types.ts';

export interface ServiceTestResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

export async function runComprehensivePhase2Tests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: ServiceTestResult[];
}> {
  const results: ServiceTestResult[] = [];
  let testCounter = 0;

  function record(name: string, category: string, condition: boolean, details: string) {
    testCounter++;
    results.push({
      id: testCounter,
      name,
      category,
      passed: condition,
      details: condition ? `PASS: ${details}` : `FAIL: ${details}`,
    });
  }

  // Sample cases from dataset
  const outageCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'TEMPORARY_ISSUER_OUTAGE')!;
  const lowFundsCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'INSUFFICIENT_FUNDS_TRANSIENT')!;
  const expiredCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'EXPIRED_INSTRUMENT')!;
  const authDropCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'AUTHENTICATION_ABANDONMENT')!;
  const fraudCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'FRAUD_SUSPICION_HIGH')!;
  const gatewayCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'GATEWAY_TIMEOUT')!;

  // ----------------------------------------------------
  // TEST 1: Gemini structured-output validation
  // ----------------------------------------------------
  const diagResult = await diagnosePaymentFailure(outageCase);
  const validStructure =
    typeof diagResult.id === 'string' &&
    typeof diagResult.caseId === 'string' &&
    typeof diagResult.failureCategory === 'string' &&
    typeof diagResult.confidenceScore === 'number' &&
    diagResult.confidenceScore >= 0 && diagResult.confidenceScore <= 1 &&
    typeof diagResult.predictedRecoveryProbability === 'number' &&
    diagResult.predictedRecoveryProbability >= 0 && diagResult.predictedRecoveryProbability <= 1 &&
    typeof diagResult.suggestedAction === 'string' &&
    typeof diagResult.recommendedExecutionDelayMinutes === 'number' &&
    typeof diagResult.reasoning === 'string' &&
    Array.isArray(diagResult.riskFactors) &&
    typeof diagResult.isAiFallback === 'boolean' &&
    typeof diagResult.timestamp === 'number';

  record(
    'Gemini structured-output validation',
    'AI Diagnostics',
    validStructure,
    `Validated all output schema fields, types, and clamped bounds (confidence: ${diagResult.confidenceScore.toFixed(2)}, P_rec: ${diagResult.predictedRecoveryProbability.toFixed(2)}, fallback: ${diagResult.isAiFallback})`
  );

  // ----------------------------------------------------
  // TEST 2: Gemini fallback when API key is missing / invalid
  // ----------------------------------------------------
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = ''; // Force missing key
  const fallbackDiag = await diagnosePaymentFailure(outageCase);
  process.env.GEMINI_API_KEY = originalKey; // Restore

  record(
    'Gemini fallback when API key is missing',
    'AI Diagnostics',
    fallbackDiag.isAiFallback === true && fallbackDiag.failureCategory === 'TEMPORARY_ISSUER_OUTAGE',
    `Cleanly diverted to deterministic fallback engine with isAiFallback=true and category=${fallbackDiag.failureCategory}`
  );

  // ----------------------------------------------------
  // TEST 3: Fallback classifier coverage
  // ----------------------------------------------------
  const diagOutage = classifyPaymentFailureFallback(outageCase);
  const diagFunds = classifyPaymentFailureFallback(lowFundsCase);
  const diagExpired = classifyPaymentFailureFallback(expiredCase);
  const diagAuth = classifyPaymentFailureFallback(authDropCase);
  const diagFraud = classifyPaymentFailureFallback(fraudCase);
  const diagGateway = classifyPaymentFailureFallback(gatewayCase);

  const syntheticUnknownCase: SyntheticRecoveryCase = {
    ...outageCase,
    id: 'case_custom_unknown',
    errorCode: 'UNKNOWN_GATEWAY_CORRUPTION_CODE_999',
    errorSource: 'gateway',
    bankHealthScore: 0.99,
  };
  const diagUnknown = classifyPaymentFailureFallback(syntheticUnknownCase);

  const fallbackCoveragePassed =
    diagOutage.failureCategory === 'TEMPORARY_ISSUER_OUTAGE' && diagOutage.suggestedAction === 'SMART_RETRY_SCHEDULE' &&
    diagFunds.failureCategory === 'INSUFFICIENT_FUNDS_TRANSIENT' && diagFunds.suggestedAction === 'INTERACTIVE_WHATSAPP_NUDGE' &&
    diagExpired.failureCategory === 'EXPIRED_INSTRUMENT' && diagExpired.suggestedAction === 'CARD_UPDATE_PROMPT' &&
    diagAuth.failureCategory === 'AUTHENTICATION_ABANDONMENT' && diagAuth.suggestedAction === 'FALLBACK_UPI_PAYMENT_LINK' &&
    diagFraud.failureCategory === 'FRAUD_SUSPICION_HIGH' && diagFraud.suggestedAction === 'DO_NOT_RETRY_CHURN_RISK' &&
    diagGateway.failureCategory === 'GATEWAY_TIMEOUT' && diagGateway.suggestedAction === 'SMART_RETRY_SCHEDULE' &&
    diagUnknown.failureCategory === 'UNKNOWN_ANOMALY' && diagUnknown.suggestedAction === 'ESCALATE_HUMAN_OPS';

  record(
    'Fallback classifier coverage',
    'Rule-Based Classifier',
    fallbackCoveragePassed,
    'Verified 7/7 failure categories including bank outage, expired card, low funds, abandonment, fraud, gateway timeout, and unknown anomaly'
  );

  // ----------------------------------------------------
  // TEST 4: Fraud always denied
  // ----------------------------------------------------
  const fraudPolicyEval = evaluatePolicyGuard(fraudCase, diagFraud);
  record(
    'Fraud always denied',
    'Policy Engine',
    !fraudPolicyEval.approved && fraudPolicyEval.denialReason === 'FRAUD_SCORE_EXCEEDS_THRESHOLD' && fraudPolicyEval.actionToExecute === 'DO_NOT_RETRY_CHURN_RISK',
    `Fraud gate blocked execution (approved=${fraudPolicyEval.approved}, reason=${fraudPolicyEval.denialReason})`
  );

  // ----------------------------------------------------
  // TEST 5: Retry-limit denial
  // ----------------------------------------------------
  const overAttemptCase: SyntheticRecoveryCase = { ...outageCase, attemptNumber: 4 };
  const retryLimitPolicyEval = evaluatePolicyGuard(overAttemptCase, diagOutage);
  record(
    'Retry-limit denial',
    'Policy Engine',
    !retryLimitPolicyEval.approved && retryLimitPolicyEval.denialReason === 'RETRY_LIMIT_EXCEEDED',
    `Velocity cap denied attempt 4 > max 3 allowed (approved=${retryLimitPolicyEval.approved}, reason=${retryLimitPolicyEval.denialReason})`
  );

  // ----------------------------------------------------
  // TEST 6: Cooldown denial
  // ----------------------------------------------------
  const secondAttemptCase: SyntheticRecoveryCase = { ...outageCase, attemptNumber: 2 };
  const cooldownPolicyEval = evaluatePolicyGuard(secondAttemptCase, diagOutage, DEFAULT_POLICY_CONFIG, 0, 30); // 30 min elapsed < 120 min required
  record(
    'Cooldown denial',
    'Policy Engine',
    !cooldownPolicyEval.approved && cooldownPolicyEval.denialReason === 'COOLDOWN_ACTIVE',
    `Cooldown gate denied execution when 30m elapsed < 120m min required (reason=${cooldownPolicyEval.denialReason})`
  );

  // ----------------------------------------------------
  // TEST 7: Negative ROI denial
  // ----------------------------------------------------
  const smallAmountCase: SyntheticRecoveryCase = { ...outageCase, amountInr: 10 }; // ₹10 invoice
  const expensiveHumanDiag = { ...diagOutage, suggestedAction: 'ESCALATE_HUMAN_OPS' as const, predictedRecoveryProbability: 0.1 }; // Cost ₹50 > E[Recovery] ₹1
  const negativeRoiPolicyEval = evaluatePolicyGuard(smallAmountCase, expensiveHumanDiag);
  record(
    'Negative ROI denial',
    'Policy Engine',
    !negativeRoiPolicyEval.approved && negativeRoiPolicyEval.denialReason === 'NEGATIVE_EXPECTED_ROI',
    `Economic rationality gate denied negative net gain (expectedNetGain: ₹${negativeRoiPolicyEval.expectedNetGainInr}, reason: ${negativeRoiPolicyEval.denialReason})`
  );

  // ----------------------------------------------------
  // TEST 8: Daily-budget denial
  // ----------------------------------------------------
  const budgetCapPolicyEval = evaluatePolicyGuard(outageCase, diagFunds, DEFAULT_POLICY_CONFIG, 5000); // Already spent daily limit of ₹5000
  record(
    'Daily-budget denial',
    'Policy Engine',
    !budgetCapPolicyEval.approved && budgetCapPolicyEval.denialReason === 'DAILY_BUDGET_EXCEEDED',
    `Budget cap gate blocked intervention when daily spend ₹5000 at maximum budget cap`
  );

  // ----------------------------------------------------
  // TEST 9: Valid action approval
  // ----------------------------------------------------
  const validApprovalPolicyEval = evaluatePolicyGuard(outageCase, diagOutage);
  record(
    'Valid action approval',
    'Policy Engine',
    validApprovalPolicyEval.approved && validApprovalPolicyEval.actionToExecute === 'SMART_RETRY_SCHEDULE' && validApprovalPolicyEval.expectedNetGainInr > 0,
    `Deterministic approval granted (action: ${validApprovalPolicyEval.actionToExecute}, expectedNetGain: ₹${validApprovalPolicyEval.expectedNetGainInr})`
  );

  // ----------------------------------------------------
  // TEST 10: Ledger hash-chain verification
  // ----------------------------------------------------
  globalAuditLedger.clear();
  globalAuditLedger.append({
    caseId: 'case_001',
    action: 'INCIDENT_DETECTED',
    actor: 'SYSTEM_POLICY',
    debitAtRiskInr: 4999.00,
    status: 'PENDING',
    payloadSummary: 'Payment failure detected for case_001',
  });
  globalAuditLedger.append({
    caseId: 'case_001',
    action: 'SMART_RETRY_SCHEDULE',
    actor: 'RAZORPAY_GATEWAY',
    creditRecoveredInr: 4999.00,
    costIncurredInr: 0.00,
    status: 'SUCCESS',
    payloadSummary: 'Smart retry captured ₹4,999.00',
  });

  const chainCheck = globalAuditLedger.verifyIntegrity();
  record(
    'Ledger hash-chain verification',
    'Audit Ledger',
    chainCheck.isValid && chainCheck.verifiedRecordsCount === 2,
    `Cryptographically verified sequential SHA-256 hash chain across ${chainCheck.verifiedRecordsCount} records`
  );

  // ----------------------------------------------------
  // TEST 11: Ledger tamper detection
  // ----------------------------------------------------
  const storedRecords = globalAuditLedger.getRecords();
  const originalDebit = storedRecords[0].debitAtRiskInr;
  storedRecords[0].debitAtRiskInr = 999999.00; // Tamper with historical transaction
  const tamperCheck = globalAuditLedger.verifyIntegrity();
  storedRecords[0].debitAtRiskInr = originalDebit; // Revert back

  record(
    'Ledger tamper detection',
    'Audit Ledger',
    !tamperCheck.isValid && Boolean(tamperCheck.error),
    `Tamper detection succeeded: ${tamperCheck.error}`
  );

  // ----------------------------------------------------
  // TEST 12: Razorpay simulator success
  // ----------------------------------------------------
  // Pick a case where ground truth is recoverable and AI recovers it
  const recoverableCase = SYNTHETIC_DATASET.find(c => c.groundTruth.isRecoverable && c.groundTruth.aiExpectedRecovered)!;
  const successExec = razorpayService.executeApprovedAction(recoverableCase, 'SMART_RETRY_SCHEDULE', `test_idemp_success_${Date.now()}`);

  record(
    'Razorpay simulator success',
    'Razorpay Simulator',
    successExec.success && successExec.settlementVerified && successExec.amountRecoveredInr === recoverableCase.amountInr,
    `Simulated successful capture of ₹${successExec.amountRecoveredInr} (ref: ${successExec.razorpayReferenceId})`
  );

  // ----------------------------------------------------
  // TEST 13: Razorpay simulator failure
  // ----------------------------------------------------
  // Pick an unrecoverable case
  const unrecoverableCase = SYNTHETIC_DATASET.find(c => !c.groundTruth.isRecoverable)!;
  const failExec = razorpayService.executeApprovedAction(unrecoverableCase, 'SMART_RETRY_SCHEDULE', `test_idemp_fail_${Date.now()}`);

  record(
    'Razorpay simulator failure',
    'Razorpay Simulator',
    !failExec.success && !failExec.settlementVerified && failExec.amountRecoveredInr === 0,
    `Correctly simulated terminal failure for unrecoverable case (amountRecovered: ₹${failExec.amountRecoveredInr})`
  );

  // ----------------------------------------------------
  // TEST 14: Idempotency/double-execution prevention
  // ----------------------------------------------------
  const uniqueKey = `idemp_guard_key_${Date.now()}_abc`;
  const firstCall = razorpayService.executeApprovedAction(recoverableCase, 'SMART_RETRY_SCHEDULE', uniqueKey);
  const secondCall = razorpayService.executeApprovedAction(recoverableCase, 'SMART_RETRY_SCHEDULE', uniqueKey);

  record(
    'Idempotency/double-execution prevention',
    'Razorpay Simulator',
    firstCall.success && !secondCall.success && secondCall.razorpayReferenceId === 'DUP_BLOCKED',
    `First execution succeeded; duplicate call with identical key blocked with ref '${secondCall.razorpayReferenceId}'`
  );

  // ----------------------------------------------------
  // TEST 15: All 100 Phase 1 cases pass through Phase 2 without crashing
  // ----------------------------------------------------
  let passCount = 0;
  let batchErrors = 0;

  for (const item of SYNTHETIC_DATASET) {
    try {
      const diag = classifyPaymentFailureFallback(item);
      const policy = evaluatePolicyGuard(item, diag);
      const sim = razorpayService.executeApprovedAction(item, policy.actionToExecute, `batch_run_${item.id}_${Date.now()}`);
      if (diag && policy && sim) {
        passCount++;
      }
    } catch {
      batchErrors++;
    }
  }

  record(
    'All 100 Phase 1 cases pass through Phase 2 services',
    'Batch Resilience',
    passCount === 100 && batchErrors === 0,
    `Successfully evaluated and executed 100/100 dataset cases without exceptions or crashes`
  );

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  return { total, passed, failed, results };
}

// Self execution when executed via tsx
const suite = await runComprehensivePhase2Tests();

console.log('\n================================================================');
console.log('=== PHASE 2 COMPREHENSIVE SERVICE TEST SUITE (15/15 TESTS) ===');
console.log(`Total: ${suite.total} | Passed: ${suite.passed} | Failed: ${suite.failed}`);
console.log('================================================================\n');

for (const r of suite.results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`[${icon}] Test ${r.id.toString().padStart(2, '0')}: ${r.name}`);
  console.log(`    Category: ${r.category}`);
  console.log(`    Details:  ${r.details}\n`);
}

process.exit(suite.failed > 0 ? 1 : 0);
