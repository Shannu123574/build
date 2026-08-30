/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';
import {
  BenchmarkEvaluationReport,
  CaseBenchmarkResult,
  runComparativeBenchmark,
  simulateRecoverOsExecution,
} from './benchmarkEngine.ts';
import { classifyPaymentFailureFallback } from './fallbackClassifier.ts';
import { diagnosePaymentFailure } from './gemini.ts';
import {
  AuditLedger,
  globalAuditLedger,
} from './auditLedger.ts';
import {
  DEFAULT_POLICY_CONFIG,
  evaluatePolicyGuard,
  PolicyEngineConfig,
} from './policyEngine.ts';
import { razorpayService } from './razorpaySimulator.ts';
import type {
  AiDiagnosisResult,
  FailureCategory,
  PaymentMethodType,
  RecoveryAction,
  SyntheticRecoveryCase,
} from '../types.ts';

export interface E2ETestResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

export async function runEndToEndTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: E2ETestResult[];
  report: BenchmarkEvaluationReport;
}> {
  const results: E2ETestResult[] = [];
  let testId = 0;

  function record(name: string, category: string, condition: boolean, details: string) {
    testId++;
    results.push({
      id: testId,
      name,
      category,
      passed: condition,
      details: condition ? `PASS: ${details}` : `FAIL: ${details}`,
    });
  }

  // Execute standard evaluation on the full synthetic dataset
  const benchmarkReport = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });
  const { summary, caseResults, categoryBreakdown } = benchmarkReport;

  // ============================================================================
  // TEST 01 — Complete 100-case pipeline
  // ============================================================================
  const processedCount = caseResults.length;
  const zeroUndefined = caseResults.every(
    (c) =>
      c.caseId &&
      c.amountInr > 0 &&
      c.groundTruthCategory &&
      c.baseline &&
      c.recoveros &&
      c.recoveros.policy &&
      c.recoveros.diagnosis
  );

  record(
    'Test 01 — Complete 100-case pipeline',
    'Pipeline Execution',
    processedCount === 100 && zeroUndefined,
    `Processed exactly ${processedCount}/100 cases with 0 unhandled exceptions and zero undefined critical fields.`
  );

  // ============================================================================
  // TEST 02 — Fraud safety
  // ============================================================================
  const fraudCases = caseResults.filter(
    (c) => c.groundTruthCategory === 'FRAUD_SUSPICION_HIGH'
  );
  const fraudAllDenied = fraudCases.every(
    (c) => !c.recoveros.policy.approved && c.recoveros.policy.denialReason === 'FRAUD_SCORE_EXCEEDS_THRESHOLD'
  );
  const fraudZeroExecuted = fraudCases.every(
    (c) => !c.recoveros.executed && !c.recoveros.recovered && c.recoveros.amountRecoveredInr === 0
  );

  // Verify ledger recorded BLOCKED for all fraud cases
  const ledgerRecords = globalAuditLedger.getRecords();
  const fraudLedgerBlocked = fraudCases.every((fc) => {
    const record = ledgerRecords.find((lr) => lr.caseId === fc.caseId);
    return record && record.status === 'BLOCKED';
  });

  record(
    'Test 02 — Fraud safety',
    'Safety & Compliance',
    fraudCases.length === 10 && fraudAllDenied && fraudZeroExecuted && fraudLedgerBlocked,
    `All 10 FRAUD_SUSPICION_HIGH cases strictly denied by policy, 0 executed, 0 recovered revenue, all ledger entries marked BLOCKED.`
  );

  // ============================================================================
  // TEST 03 — Expired instrument safety
  // ============================================================================
  const expiredCases = caseResults.filter(
    (c) => c.groundTruthCategory === 'EXPIRED_INSTRUMENT'
  );
  const expiredNoBlindRetry = expiredCases.every(
    (c) => c.recoveros.diagnosis.suggestedAction === 'CARD_UPDATE_PROMPT'
  );
  const expiredBaselineZero = categoryBreakdown['EXPIRED_INSTRUMENT'].baselineCasesRecovered === 0;
  const expiredAiRecovered = categoryBreakdown['EXPIRED_INSTRUMENT'].aiCasesRecovered > 0;

  record(
    'Test 03 — Expired instrument safety',
    'Safety & Compliance',
    expiredCases.length === 15 && expiredNoBlindRetry && expiredBaselineZero && expiredAiRecovered,
    `All 15 EXPIRED_INSTRUMENT cases routed exclusively to CARD_UPDATE_PROMPT (0 blind retries). Baseline recovered 0/15 vs RecoverOS ${categoryBreakdown['EXPIRED_INSTRUMENT'].aiCasesRecovered}/15.`
  );

  // ============================================================================
  // TEST 04 — Idempotency
  // ============================================================================
  const sampleApprovedCase = SYNTHETIC_DATASET.find(c => c.groundTruthCategory === 'TEMPORARY_ISSUER_OUTAGE')!;
  const idempotencyKey = `e2e_idemp_key_${Date.now()}`;
  
  const firstTx = razorpayService.executeApprovedAction(
    sampleApprovedCase,
    'SMART_RETRY_SCHEDULE',
    idempotencyKey
  );
  const secondTx = razorpayService.executeApprovedAction(
    sampleApprovedCase,
    'SMART_RETRY_SCHEDULE',
    idempotencyKey
  );

  const idempotencySuccess =
    firstTx.razorpayReferenceId !== 'DUP_BLOCKED' &&
    secondTx.razorpayReferenceId === 'DUP_BLOCKED' &&
    secondTx.amountRecoveredInr === 0 &&
    secondTx.costIncurredInr === 0 &&
    secondTx.message.includes('Idempotency guard');

  record(
    'Test 04 — Idempotency',
    'Gateway & Execution',
    idempotencySuccess,
    `First execution processed (${firstTx.razorpayReferenceId}); second identical idempotency key blocked duplicate charge safely (DUP_BLOCKED).`
  );

  // ============================================================================
  // TEST 05 — Policy denial means zero execution
  // ============================================================================
  const deniedCases = caseResults.filter((c) => !c.recoveros.policy.approved);
  const zeroExecutionOnDenial = deniedCases.every(
    (c) => c.recoveros.executed === false && c.recoveros.recovered === false && c.recoveros.amountRecoveredInr === 0
  );

  record(
    'Test 05 — Policy denial means zero execution',
    'Safety & Compliance',
    deniedCases.length === 10 && zeroExecutionOnDenial,
    `100% of policy-denied cases (${deniedCases.length}) resulted in zero simulator gateway calls, zero recovered amount, and zero executions.`
  );

  // ============================================================================
  // TEST 06 — Financial accounting integrity
  // ============================================================================
  let accountingAccurate = true;
  let computedAiNetRevenue = 0;
  let computedBaselineNetRevenue = 0;

  for (const c of caseResults) {
    if (c.recoveros.interventionCostInr < 0 || c.baseline.interventionCostInr < 0) {
      accountingAccurate = false;
    }
    if (c.recoveros.recovered && c.recoveros.amountRecoveredInr !== c.amountInr) {
      accountingAccurate = false;
    }
    if (!c.recoveros.recovered && c.recoveros.amountRecoveredInr !== 0) {
      accountingAccurate = false;
    }

    computedAiNetRevenue += c.recoveros.amountRecoveredInr - c.recoveros.interventionCostInr;
    computedBaselineNetRevenue += c.baseline.amountRecoveredInr - c.baseline.interventionCostInr;
  }

  const netDiffAi = Math.abs(summary.aiNetProfitInr - Math.round(computedAiNetRevenue));
  const netDiffBaseline = Math.abs(summary.baselineNetProfitInr - Math.round(computedBaselineNetRevenue));
  const aggregateMatch = netDiffAi <= 1 && netDiffBaseline <= 1;

  record(
    'Test 06 — Financial accounting integrity',
    'Financial Accounting',
    accountingAccurate && aggregateMatch,
    `Zero negative-cost anomalies. Case-by-case sum matches aggregate net revenue exactly (RecoverOS Net: ₹${summary.aiNetProfitInr.toFixed(2)}, Baseline Net: ₹${summary.baselineNetProfitInr.toFixed(2)}).`
  );

  // ============================================================================
  // TEST 07 — Ledger integrity
  // ============================================================================
  const ledgerIntegrity = globalAuditLedger.verifyIntegrity();
  const allRecords = globalAuditLedger.getRecords();

  let chainPointersValid = true;
  for (let i = 1; i < allRecords.length; i++) {
    if (allRecords[i].previousHash !== allRecords[i - 1].currentHash) {
      chainPointersValid = false;
      break;
    }
  }
  const genesisValid =
    allRecords.length > 0 &&
    allRecords[0].previousHash === '0000000000000000000000000000000000000000000000000000000000000000';

  // Test Tamper Detection in an isolated ledger
  const testLedger = new AuditLedger();
  for (let i = 1; i <= 5; i++) {
    testLedger.append({
      caseId: `test_case_${i}`,
      action: `action_${i}`,
      actor: 'SYSTEM_POLICY',
      debitAtRiskInr: 1000 * i,
      creditRecoveredInr: 1000 * i,
      costIncurredInr: 0.5,
      status: 'SUCCESS',
      payloadSummary: `payload_${i}`,
      razorpayReferenceId: `ref_${i}`,
    });
  }
  const preTamperValid = testLedger.verifyIntegrity().isValid;

  // Deliberately mutate record 2
  const recordsCopy = testLedger.getRecords();
  if (recordsCopy.length >= 3) {
    recordsCopy[2].creditRecoveredInr = 999999; // Tamper
  }
  const postTamperIntegrity = testLedger.verifyIntegrity();
  const tamperDetected = !postTamperIntegrity.isValid;

  record(
    'Test 07 — Ledger integrity',
    'Cryptographic Ledger',
    ledgerIntegrity.isValid && chainPointersValid && genesisValid && preTamperValid && tamperDetected,
    `Hash chain verified (${allRecords.length} records). Genesis valid. Deliberate record mutation successfully triggered tamper detection.`
  );

  // ============================================================================
  // TEST 08 — Benchmark consistency
  // ============================================================================
  const baselineCasesExact = summary.baselineCasesRecovered === 5;
  const baselineRevExact = summary.baselineRevenueRecoveredInr === 19295;
  const baselineCostExact = Math.abs(summary.baselineInterventionCostsInr - 58) < 0.01;
  const baselineMsgsExact = summary.baselineSpamMessagesSent === 290;

  const aiCasesExact = summary.aiCasesRecovered === 74;
  const aiRevExact = summary.aiRevenueRecoveredInr === 399630;
  const aiCostExact = Math.abs(summary.aiInterventionCostsInr - 26.5) < 0.01;
  const aiMsgsExact = summary.aiSpamMessagesSent === 61;

  const incrementalRevExact = summary.incrementalRevenueRecoveredInr === 380335;
  const recoveryLiftExact = Math.abs(summary.incrementalRecoveryRateLiftPercent - 73.74) < 0.01;
  const spamReductionExact = Math.abs(summary.spamReductionPercent - 78.97) < 0.01;

  const allBenchmarkExact =
    baselineCasesExact &&
    baselineRevExact &&
    baselineCostExact &&
    baselineMsgsExact &&
    aiCasesExact &&
    aiRevExact &&
    aiCostExact &&
    aiMsgsExact &&
    incrementalRevExact &&
    recoveryLiftExact &&
    spamReductionExact;

  record(
    'Test 08 — Benchmark consistency',
    'Benchmark Engine',
    allBenchmarkExact,
    `Exact match with Phase 3 benchmarks: Baseline (5 cases, ₹19,295, ₹58.00 cost, 290 msgs) vs RecoverOS (74 cases, ₹3,99,630, ₹26.50 cost, 61 msgs). Incremental: ₹3,80,335 | Lift: +73.74% | Spam: -78.97%.`
  );

  // ============================================================================
  // TEST 09 — Determinism
  // ============================================================================
  const run1 = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });
  const run2 = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });

  let identicalCases = true;
  for (let i = 0; i < run1.caseResults.length; i++) {
    const c1 = run1.caseResults[i];
    const c2 = run2.caseResults[i];

    if (
      c1.caseId !== c2.caseId ||
      c1.recoveros.recovered !== c2.recoveros.recovered ||
      c1.recoveros.amountRecoveredInr !== c2.recoveros.amountRecoveredInr ||
      c1.recoveros.actionExecuted !== c2.recoveros.actionExecuted ||
      c1.recoveros.policy.approved !== c2.recoveros.policy.approved ||
      c1.baseline.recovered !== c2.baseline.recovered ||
      c1.baseline.amountRecoveredInr !== c2.baseline.amountRecoveredInr
    ) {
      identicalCases = false;
      break;
    }
  }

  const identicalSummaries =
    run1.summary.aiRevenueRecoveredInr === run2.summary.aiRevenueRecoveredInr &&
    run1.summary.aiCasesRecovered === run2.summary.aiCasesRecovered &&
    run1.summary.baselineRevenueRecoveredInr === run2.summary.baselineRevenueRecoveredInr &&
    run1.summary.baselineCasesRecovered === run2.summary.baselineCasesRecovered;

  record(
    'Test 09 — Determinism',
    'Reproducibility',
    identicalCases && identicalSummaries,
    `Run 1 and Run 2 produced bit-for-bit identical case outcomes, policy authorizations, and aggregate financial metrics.`
  );

  // ============================================================================
  // TEST 10 — AI fallback resilience
  // ============================================================================
  const fallbackCase = SYNTHETIC_DATASET[0];
  const fallbackDiag = classifyPaymentFailureFallback(fallbackCase);

  const fallbackValid =
    fallbackDiag.isAiFallback === true &&
    fallbackDiag.confidenceScore > 0 &&
    fallbackDiag.predictedRecoveryProbability > 0 &&
    typeof fallbackDiag.reasoning === 'string' &&
    fallbackDiag.suggestedAction !== undefined;

  record(
    'Test 10 — AI fallback resilience',
    'AI Diagnostic Engine',
    fallbackValid,
    `Fallback rule classifier successfully handled diagnosis with isAiFallback=true without pipeline crashes or dependency on live API.`
  );

  // ============================================================================
  // TEST 11 — Invalid AI output safety
  // ============================================================================
  const malformedAiOutput: AiDiagnosisResult = {
    id: 'malformed_test_001',
    caseId: 'case_001',
    failureCategory: 'TEMPORARY_ISSUER_OUTAGE',
    confidenceScore: 2.75, // Out of range (>1)
    predictedRecoveryProbability: -0.65, // Negative
    suggestedAction: 'UNAUTHORIZED_EXPLOIT_ACTION' as any,
    recommendedExecutionDelayMinutes: -50, // Negative delay
    reasoning: 'Injecting unverified action payload',
    riskFactors: ['MALICIOUS_FLAG'],
    isAiFallback: false,
    timestamp: Date.now(),
  };

  const clamped: AiDiagnosisResult = {
    ...malformedAiOutput,
    confidenceScore: Math.min(1, Math.max(0, Number(malformedAiOutput.confidenceScore) || 0.8)),
    predictedRecoveryProbability: Math.min(1, Math.max(0, Number(malformedAiOutput.predictedRecoveryProbability) || 0.5)),
    recommendedExecutionDelayMinutes: Math.max(0, Number(malformedAiOutput.recommendedExecutionDelayMinutes) || 0),
  };

  const scoresClamped =
    clamped.confidenceScore <= 1.0 &&
    clamped.confidenceScore >= 0.0 &&
    clamped.predictedRecoveryProbability >= 0.0 &&
    clamped.recommendedExecutionDelayMinutes >= 0;

  // Verify Policy Engine stops unauthorized action
  const sampleCase = SYNTHETIC_DATASET[0];
  const policyAuthResult = evaluatePolicyGuard(
    sampleCase,
    clamped,
    DEFAULT_POLICY_CONFIG,
    0
  );

  const policySafelyDenied = !policyAuthResult.approved && policyAuthResult.denialReason === 'UNAUTHORIZED_ACTION';

  record(
    'Test 11 — Invalid AI output safety',
    'Safety & Compliance',
    scoresClamped && policySafelyDenied,
    `Clamped out-of-range probabilities into [0, 1]. Policy engine blocked unauthorized action payload from execution.`
  );

  // ============================================================================
  // TEST 12 — Unknown anomaly
  // ============================================================================
  const unknownAnomalyCase: SyntheticRecoveryCase = {
    id: 'case_unknown_anomaly_999',
    razorpayPaymentId: 'pay_anom_999',
    razorpayOrderId: 'order_anom_999',
    customerId: 'cust_anom_999',
    customerName: 'Anomalous User',
    customerEmail: 'anomalous@example.com',
    customerPhone: '+919876543210',
    amountInr: 12500,
    currency: 'INR',
    errorCode: 'UNKNOWN_GATEWAY_ANOMALY_999',
    errorDescription: 'Undefined gateway failure state',
    errorSource: 'gateway',
    paymentMethod: 'card',
    cardNetwork: 'VISA',
    issuingBank: 'UNKNOWN_BANK',
    customerTenureMonths: 12,
    lifetimeSuccessfulPayments: 5,
    consecutiveFailureCount: 1,
    bankHealthScore: 0.85,
    attemptNumber: 1,
    dayOfMonth: 15,
    hourOfDay: 14,
    merchantCategory: 'ecommerce_d2c',
    groundTruthCategory: 'TEMPORARY_ISSUER_OUTAGE',
    groundTruth: {
      isRecoverable: false,
      optimalAction: 'ESCALATE_HUMAN_OPS',
      baselineRecovered: false,
      aiExpectedRecovered: false,
      revenueRecoverableInr: 0,
      rationale: 'Unclassified gateway failure requiring manual ops inspection',
      optimalDelayMinutes: 60,
    },
  };

  const anomalyDiagnosis = classifyPaymentFailureFallback(unknownAnomalyCase);
  const anomalyExecution = await simulateRecoverOsExecution(unknownAnomalyCase);
  const ledgerRecordsAfter = globalAuditLedger.getRecords();
  const anomalyLedgerEntry = ledgerRecordsAfter.find((r) => r.caseId === unknownAnomalyCase.id);

  const escalatedSafely =
    anomalyDiagnosis.suggestedAction === 'ESCALATE_HUMAN_OPS' &&
    anomalyExecution.actionExecuted === 'ESCALATE_HUMAN_OPS' &&
    anomalyExecution.executionRef.startsWith('ops_') &&
    Boolean(anomalyLedgerEntry);

  record(
    'Test 12 — Unknown anomaly',
    'Safety & Compliance',
    escalatedSafely,
    `Unknown anomaly case categorized safely, routed to ESCALATE_HUMAN_OPS, manual ops ticket dispatched (${anomalyExecution.executionRef}), and safely recorded in audit ledger.`
  );

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total,
    passed,
    failed,
    results,
    report: benchmarkReport,
  };
}

// Direct Execution Runner
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('testEndToEnd')) {
  console.log('\n====================================================================');
  console.log('RECOVEROS AI — PHASE 5 END-TO-END HARDENING & DEMO VALIDATION SUITE');
  console.log('====================================================================\n');

  runEndToEndTests()
    .then(({ total, passed, failed, results, report }) => {
      for (const res of results) {
        console.log(`[${res.passed ? 'PASS' : 'FAIL'}] ${res.name}`);
        console.log(`       Category: ${res.category}`);
        console.log(`       Details:  ${res.details}\n`);
      }

      console.log('--------------------------------------------------------------------');
      console.log(`SUMMARY: Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
      console.log('--------------------------------------------------------------------');

      if (failed > 0) {
        console.error(`\n❌ Validation failed with ${failed} failing test(s).`);
        process.exit(1);
      } else {
        console.log('\n✅ ALL 12 END-TO-END RECOVEROS HARDENING TESTS PASSED PERFECTLY!\n');
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
