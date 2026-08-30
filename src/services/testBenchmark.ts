/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';
import { runComparativeBenchmark, simulateBaselineDunning, simulateRecoverOsExecution } from './benchmarkEngine.ts';
import { DEFAULT_POLICY_CONFIG, PolicyEngineConfig } from './policyEngine.ts';
import { globalAuditLedger } from './auditLedger.ts';

interface Phase3TestResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

export async function runComprehensivePhase3Tests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Phase3TestResult[];
  report: Awaited<ReturnType<typeof runComparativeBenchmark>>;
}> {
  const results: Phase3TestResult[] = [];
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

  // Run initial benchmark on 100 cases
  globalAuditLedger.clear();
  const benchmarkReport = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });
  const { summary, caseResults, categoryBreakdown } = benchmarkReport;

  const firstRunLedgerHash = globalAuditLedger.getRecords().length > 0 
    ? globalAuditLedger.getRecords()[globalAuditLedger.getRecords().length - 1].currentHash 
    : 'EMPTY';

  // ----------------------------------------------------------------
  // TEST 1: Exactly 100 cases processed by baseline
  // ----------------------------------------------------------------
  const baselineCount = caseResults.filter(c => c.baseline !== undefined).length;
  record(
    'Exactly 100 cases processed by baseline',
    'Benchmark Execution',
    baselineCount === 100,
    `Baseline evaluated exactly ${baselineCount}/100 cases`
  );

  // ----------------------------------------------------------------
  // TEST 2: Exactly 100 cases processed by RecoverOS
  // ----------------------------------------------------------------
  const recoverOsCount = caseResults.filter(c => c.recoveros !== undefined).length;
  record(
    'Exactly 100 cases processed by RecoverOS',
    'Benchmark Execution',
    recoverOsCount === 100,
    `RecoverOS evaluated exactly ${recoverOsCount}/100 cases`
  );

  // ----------------------------------------------------------------
  // TEST 3: No case causes an unhandled exception
  // ----------------------------------------------------------------
  let exceptionCount = 0;
  for (const c of SYNTHETIC_DATASET) {
    try {
      const b = simulateBaselineDunning(c);
      const r = await simulateRecoverOsExecution(c);
      if (!b || !r) exceptionCount++;
    } catch {
      exceptionCount++;
    }
  }
  record(
    'No case causes an unhandled exception',
    'Benchmark Resilience',
    exceptionCount === 0,
    `All 100 cases processed seamlessly with 0 exceptions`
  );

  // ----------------------------------------------------------------
  // TEST 4: Baseline metrics calculated from actual simulated outcomes
  // ----------------------------------------------------------------
  const actualBaselineCasesSum = caseResults.filter(c => c.baseline.recovered).length;
  const actualBaselineRevSum = caseResults.reduce((acc, c) => acc + (c.baseline.recovered ? c.amountInr : 0), 0);
  const actualBaselineCostsSum = caseResults.reduce((acc, c) => acc + c.baseline.interventionCostInr, 0);
  const actualBaselineMessagesSum = caseResults.reduce((acc, c) => acc + c.baseline.messagesSent, 0);

  const baselineOutcomeMathValid =
    summary.baselineCasesRecovered === actualBaselineCasesSum &&
    summary.baselineRevenueRecoveredInr === Math.round(actualBaselineRevSum) &&
    Math.abs(summary.baselineInterventionCostsInr - actualBaselineCostsSum) < 0.01 &&
    summary.baselineSpamMessagesSent === actualBaselineMessagesSum;

  record(
    'Baseline metrics are calculated from actual simulated outcomes',
    'Simulation Accuracy',
    baselineOutcomeMathValid,
    `Baseline Recovered: ${summary.baselineCasesRecovered} cases (₹${summary.baselineRevenueRecoveredInr.toLocaleString('en-IN')}), Cost: ₹${summary.baselineInterventionCostsInr}, Messages: ${summary.baselineSpamMessagesSent}`
  );

  // ----------------------------------------------------------------
  // TEST 5: RecoverOS metrics calculated from actual simulated outcomes
  // ----------------------------------------------------------------
  const actualAiCasesSum = caseResults.filter(c => c.recoveros.recovered).length;
  const actualAiRevSum = caseResults.reduce((acc, c) => acc + (c.recoveros.recovered ? c.amountInr : 0), 0);
  const actualAiCostsSum = caseResults.reduce((acc, c) => acc + c.recoveros.interventionCostInr, 0);
  const actualAiMessagesSum = caseResults.reduce((acc, c) => acc + c.recoveros.messagesSent, 0);

  const aiOutcomeMathValid =
    summary.aiCasesRecovered === actualAiCasesSum &&
    summary.aiRevenueRecoveredInr === Math.round(actualAiRevSum) &&
    Math.abs(summary.aiInterventionCostsInr - actualAiCostsSum) < 0.01 &&
    summary.aiSpamMessagesSent === actualAiMessagesSum;

  record(
    'RecoverOS metrics are calculated from actual simulated outcomes',
    'Simulation Accuracy',
    aiOutcomeMathValid,
    `RecoverOS (Fallback) Recovered: ${summary.aiCasesRecovered} cases (₹${summary.aiRevenueRecoveredInr.toLocaleString('en-IN')}), Cost: ₹${summary.aiInterventionCostsInr}, Messages: ${summary.aiSpamMessagesSent}`
  );

  // ----------------------------------------------------------------
  // TEST 6: Fraud cases are never executed as recovery actions
  // ----------------------------------------------------------------
  const fraudCases = caseResults.filter(c => c.groundTruthCategory === 'FRAUD_SUSPICION_HIGH');
  const fraudExecutedCount = fraudCases.filter(c => c.recoveros.executed && c.recoveros.actionExecuted !== 'DO_NOT_RETRY_CHURN_RISK').length;
  const fraudRecoveredCount = fraudCases.filter(c => c.recoveros.recovered).length;

  record(
    'Fraud cases are never executed as recovery actions',
    'Policy Compliance',
    fraudExecutedCount === 0 && fraudRecoveredCount === 0 && fraudCases.length === 10,
    `All ${fraudCases.length} fraud cases strictly blocked (executed: 0, recovered: 0)`
  );

  // ----------------------------------------------------------------
  // TEST 7: Expired instruments are not blindly retried
  // ----------------------------------------------------------------
  const expiredCases = caseResults.filter(c => c.groundTruthCategory === 'EXPIRED_INSTRUMENT');
  const expiredRetriedBlindlyByRecoverOs = expiredCases.filter(c => c.recoveros.actionExecuted === 'SMART_RETRY_SCHEDULE').length;
  const expiredPromptedWithCardPortal = expiredCases.filter(c => c.recoveros.actionExecuted === 'CARD_UPDATE_PROMPT').length;

  record(
    'Expired instruments are not blindly retried',
    'Action Correctness',
    expiredRetriedBlindlyByRecoverOs === 0 && expiredPromptedWithCardPortal === expiredCases.length && expiredCases.length === 15,
    `All ${expiredCases.length} expired card cases correctly targeted with CARD_UPDATE_PROMPT (0 blind retries)`
  );

  // ----------------------------------------------------------------
  // TEST 8: Policy-denied actions never execute
  // ----------------------------------------------------------------
  const deniedCases = caseResults.filter(c => !c.recoveros.policy.approved);
  const executedDeniedCount = deniedCases.filter(c => c.recoveros.executed && c.recoveros.actionExecuted !== 'DO_NOT_RETRY_CHURN_RISK').length;

  record(
    'Policy-denied actions never execute',
    'Policy Compliance',
    executedDeniedCount === 0 && deniedCases.length >= 10,
    `Verified ${deniedCases.length} policy-denied incidents had 0 execution attempts in simulator`
  );

  // ----------------------------------------------------------------
  // TEST 9: Intervention costs are included in net profit
  // ----------------------------------------------------------------
  const baselineNetCalculated = summary.baselineRevenueRecoveredInr - summary.baselineInterventionCostsInr;
  const aiNetCalculated = summary.aiRevenueRecoveredInr - summary.aiInterventionCostsInr;
  const costsIncludedCorrectly =
    Math.abs(summary.baselineNetProfitInr - Math.round(baselineNetCalculated)) <= 1 &&
    Math.abs(summary.aiNetProfitInr - Math.round(aiNetCalculated)) <= 1;

  record(
    'Intervention costs are included in net profit',
    'Financial Accounting',
    costsIncludedCorrectly,
    `Baseline Net: ₹${summary.baselineNetProfitInr} (Gross: ₹${summary.baselineRevenueRecoveredInr} - Cost: ₹${summary.baselineInterventionCostsInr}), RecoverOS Net: ₹${summary.aiNetProfitInr} (Gross: ₹${summary.aiRevenueRecoveredInr} - Cost: ₹${summary.aiInterventionCostsInr})`
  );

  // ----------------------------------------------------------------
  // TEST 10: Incremental revenue is calculated correctly
  // ----------------------------------------------------------------
  const expectedIncrementalRev = summary.aiRevenueRecoveredInr - summary.baselineRevenueRecoveredInr;
  record(
    'Incremental revenue is calculated correctly',
    'Financial Accounting',
    summary.incrementalRevenueRecoveredInr === expectedIncrementalRev,
    `Incremental Revenue: +₹${summary.incrementalRevenueRecoveredInr.toLocaleString('en-IN')} (AI: ₹${summary.aiRevenueRecoveredInr.toLocaleString('en-IN')} vs Base: ₹${summary.baselineRevenueRecoveredInr.toLocaleString('en-IN')})`
  );

  // ----------------------------------------------------------------
  // TEST 11: Incremental net profit is calculated correctly
  // ----------------------------------------------------------------
  const expectedIncrementalNet = summary.aiNetProfitInr - summary.baselineNetProfitInr;
  record(
    'Incremental net profit is calculated correctly',
    'Financial Accounting',
    summary.incrementalNetProfitInr === expectedIncrementalNet,
    `Incremental Net Profit: +₹${summary.incrementalNetProfitInr.toLocaleString('en-IN')} (AI: ₹${summary.aiNetProfitInr.toLocaleString('en-IN')} vs Base: ₹${summary.baselineNetProfitInr.toLocaleString('en-IN')})`
  );

  // ----------------------------------------------------------------
  // TEST 12: Recovery-rate lift is calculated correctly
  // ----------------------------------------------------------------
  const expectedLift = parseFloat((summary.aiRecoveryRatePercent - summary.baselineRecoveryRatePercent).toFixed(2));
  record(
    'Recovery-rate lift is calculated correctly',
    'Benchmark Metrics',
    Math.abs(summary.incrementalRecoveryRateLiftPercent - expectedLift) < 0.02,
    `Recovery Rate Lift: +${summary.incrementalRecoveryRateLiftPercent}% (AI: ${summary.aiRecoveryRatePercent}% vs Base: ${summary.baselineRecoveryRatePercent}%)`
  );

  // ----------------------------------------------------------------
  // TEST 13: Spam reduction is calculated correctly
  // ----------------------------------------------------------------
  const expectedSpamReduction = parseFloat(
    (((summary.baselineSpamMessagesSent - summary.aiSpamMessagesSent) / summary.baselineSpamMessagesSent) * 100).toFixed(2)
  );
  record(
    'Spam reduction is calculated correctly',
    'Benchmark Metrics',
    Math.abs(summary.spamReductionPercent - expectedSpamReduction) < 0.02 && summary.spamReductionPercent > 0,
    `Spam Messages Reduced by ${summary.spamReductionPercent}% (Baseline: ${summary.baselineSpamMessagesSent} messages down to RecoverOS: ${summary.aiSpamMessagesSent} messages)`
  );

  // ----------------------------------------------------------------
  // TEST 14: No hardcoded benchmark result values
  // ----------------------------------------------------------------
  // Test with a custom subset or mutated amounts to prove formula dynamic reactivity
  const subsetDataset = SYNTHETIC_DATASET.slice(0, 50).map(c => ({ ...c, amountInr: c.amountInr * 2 }));
  const subsetReport = await runComparativeBenchmark(subsetDataset, { useAiDiagnosis: false });
  const isDynamic =
    subsetReport.summary.totalCases === 50 &&
    subsetReport.summary.totalRevenueAtRiskInr !== summary.totalRevenueAtRiskInr &&
    subsetReport.summary.baselineRevenueRecoveredInr !== summary.baselineRevenueRecoveredInr;

  record(
    'No hardcoded benchmark result values',
    'Formula Reactivity',
    isDynamic,
    `Engine reacted dynamically to modified dataset inputs (50 cases, ₹${subsetReport.summary.totalRevenueAtRiskInr.toLocaleString('en-IN')} total risk)`
  );

  // ----------------------------------------------------------------
  // TEST 15: Repeated deterministic benchmark runs produce consistent results
  // ----------------------------------------------------------------
  globalAuditLedger.clear();
  const secondRunReport = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });
  
  const secondRunLedgerHash = globalAuditLedger.getRecords().length > 0 
    ? globalAuditLedger.getRecords()[globalAuditLedger.getRecords().length - 1].currentHash 
    : 'EMPTY';

  const bitForBitIdentical =
    JSON.stringify(secondRunReport.summary) === JSON.stringify(benchmarkReport.summary) &&
    secondRunReport.caseResults.length === benchmarkReport.caseResults.length &&
    firstRunLedgerHash === secondRunLedgerHash && firstRunLedgerHash !== 'EMPTY';

  record(
    'Repeated deterministic benchmark runs produce consistent results',
    'Determinism & Reproducibility',
    bitForBitIdentical,
    bitForBitIdentical
      ? `Run 1 and Run 2 produced 100% bit-for-bit identical comparative metrics and identical ledger tip hashes (${firstRunLedgerHash.slice(0,8)}...)`
      : `Mismatch! Run 1 tip: ${firstRunLedgerHash.slice(0,8)}... Run 2 tip: ${secondRunLedgerHash.slice(0,8)}...`
  );

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  return { total, passed, failed, results, report: benchmarkReport };
}

// Self-run when executed directly via tsx
runComprehensivePhase3Tests().then(suite => {
  console.log('\\n================================================================');
  console.log('=== PHASE 3 BENCHMARK & EVALUATION ENGINE TEST SUITE (15/15) ===');
  console.log(`Total: ${suite.total} | Passed: ${suite.passed} | Failed: ${suite.failed}`);
  console.log('================================================================\\n');

  for (const r of suite.results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`[${icon}] Test ${r.id.toString().padStart(2, '0')}: ${r.name}`);
    console.log(`    Category: ${r.category}`);
    console.log(`    Details:  ${r.details}\\n`);
  }

  console.log('================================================================');
  console.log('=== BENCHMARK EVALUATION RESULTS (100-CASE SYNTHETIC DATASET) ===');
  console.log('================================================================');
  const s = suite.report.summary;
  console.log(`Total Cases:                    ${s.totalCases}`);
  console.log(`Total Revenue At Risk:          ₹${s.totalRevenueAtRiskInr.toLocaleString('en-IN')}`);
  console.log('----------------------------------------------------------------');
  console.log(`[BASELINE DUNNING]`);
  console.log(`  Cases Recovered:              ${s.baselineCasesRecovered} / ${s.totalCases}`);
  console.log(`  Revenue Recovered:            ₹${s.baselineRevenueRecoveredInr.toLocaleString('en-IN')}`);
  console.log(`  Recovery Rate:                ${s.baselineRecoveryRatePercent}%`);
  console.log(`  Intervention Costs:           ₹${s.baselineInterventionCostsInr.toFixed(2)}`);
  console.log(`  Net Profit:                   ₹${s.baselineNetProfitInr.toLocaleString('en-IN')}`);
  console.log(`  Spam Messages Sent:           ${s.baselineSpamMessagesSent}`);
  console.log('----------------------------------------------------------------');
  console.log(`[RECOVEROS AI]`);
  console.log(`  Cases Recovered:              ${s.aiCasesRecovered} / ${s.totalCases}`);
  console.log(`  Revenue Recovered:            ₹${s.aiRevenueRecoveredInr.toLocaleString('en-IN')}`);
  console.log(`  Recovery Rate:                ${s.aiRecoveryRatePercent}%`);
  console.log(`  Intervention Costs:           ₹${s.aiInterventionCostsInr.toFixed(2)}`);
  console.log(`  Net Profit:                   ₹${s.aiNetProfitInr.toLocaleString('en-IN')}`);
  console.log(`  Outreach Messages Sent:       ${s.aiSpamMessagesSent}`);
  console.log('----------------------------------------------------------------');
  console.log(`[COMPARATIVE LIFT & EFFICIENCY]`);
  console.log(`  Incremental Revenue Lift:     +₹${s.incrementalRevenueRecoveredInr.toLocaleString('en-IN')}`);
  console.log(`  Incremental Net Profit Lift:  +₹${s.incrementalNetProfitInr.toLocaleString('en-IN')}`);
  console.log(`  Recovery Rate Lift:           +${s.incrementalRecoveryRateLiftPercent}%`);
  console.log(`  Outreach Spam Reduction:      -${s.spamReductionPercent}%`);
  console.log('================================================================\\n');

  process.exit(suite.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
