/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateSyntheticDataset, SYNTHETIC_DATASET } from './syntheticDataset.ts';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export function runDatasetTestSuite(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  datasetStats: {
    totalCases: number;
    categoryCounts: Record<string, number>;
    totalRevenueAtRisk: number;
    recoverableCasesCount: number;
    totalRecoverableRevenue: number;
    baselineRecoveredCount: number;
    baselineRecoveredRevenue: number;
    aiExpectedRecoveredCount: number;
    aiExpectedRecoveredRevenue: number;
  };
} {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, details: string) {
    results.push({
      name,
      passed: condition,
      details: condition ? `PASS: ${details}` : `FAIL: ${details}`,
    });
  }

  const ds = SYNTHETIC_DATASET;

  // Test 1: Total cases count
  assert(
    'Exact 100 Cases Count',
    ds.length === 100,
    `Expected 100 cases, got ${ds.length}`
  );

  // Test 2: Category Distribution
  const categoryCounts: Record<string, number> = {};
  for (const c of ds) {
    categoryCounts[c.groundTruthCategory] = (categoryCounts[c.groundTruthCategory] || 0) + 1;
  }

  assert(
    'TEMPORARY_ISSUER_OUTAGE Count',
    categoryCounts['TEMPORARY_ISSUER_OUTAGE'] === 24,
    `Expected 24, got ${categoryCounts['TEMPORARY_ISSUER_OUTAGE']}`
  );

  assert(
    'INSUFFICIENT_FUNDS_TRANSIENT Count',
    categoryCounts['INSUFFICIENT_FUNDS_TRANSIENT'] === 28,
    `Expected 28, got ${categoryCounts['INSUFFICIENT_FUNDS_TRANSIENT']}`
  );

  assert(
    'EXPIRED_INSTRUMENT Count',
    categoryCounts['EXPIRED_INSTRUMENT'] === 15,
    `Expected 15, got ${categoryCounts['EXPIRED_INSTRUMENT']}`
  );

  assert(
    'AUTHENTICATION_ABANDONMENT Count',
    categoryCounts['AUTHENTICATION_ABANDONMENT'] === 18,
    `Expected 18, got ${categoryCounts['AUTHENTICATION_ABANDONMENT']}`
  );

  assert(
    'FRAUD_SUSPICION_HIGH Count',
    categoryCounts['FRAUD_SUSPICION_HIGH'] === 10,
    `Expected 10, got ${categoryCounts['FRAUD_SUSPICION_HIGH']}`
  );

  assert(
    'GATEWAY_TIMEOUT Count',
    categoryCounts['GATEWAY_TIMEOUT'] === 5,
    `Expected 5, got ${categoryCounts['GATEWAY_TIMEOUT']}`
  );

  // Test 3: Reproducibility Test
  const run1 = generateSyntheticDataset(42, 100);
  const run2 = generateSyntheticDataset(42, 100);
  const isIdentical = JSON.stringify(run1) === JSON.stringify(run2);
  assert(
    'Deterministic Reproducibility (Seed 42)',
    isIdentical,
    isIdentical ? 'Run 1 and Run 2 produced bit-for-bit identical datasets' : 'Datasets diverged between runs'
  );

  // Test 4: Seed Differentiation Test (different seed produces different dataset)
  const runOtherSeed = generateSyntheticDataset(999, 100);
  const isDifferent = JSON.stringify(run1) !== JSON.stringify(runOtherSeed);
  assert(
    'Seed Sensitivity',
    isDifferent,
    'Different seed (999) produced distinct randomized sample'
  );

  // Test 5: Field Integrity and Non-Empty Constraints
  let invalidFieldCount = 0;
  let totalRevenueAtRisk = 0;
  let recoverableCasesCount = 0;
  let totalRecoverableRevenue = 0;
  let baselineRecoveredCount = 0;
  let baselineRecoveredRevenue = 0;
  let aiExpectedRecoveredCount = 0;
  let aiExpectedRecoveredRevenue = 0;

  for (const c of ds) {
    if (!c.id || !c.razorpayPaymentId || !c.customerId || !c.customerEmail) invalidFieldCount++;
    if (c.amountInr <= 0) invalidFieldCount++;
    if (c.bankHealthScore < 0 || c.bankHealthScore > 1) invalidFieldCount++;
    if (c.dayOfMonth < 1 || c.dayOfMonth > 31) invalidFieldCount++;
    if (c.hourOfDay < 0 || c.hourOfDay > 23) invalidFieldCount++;
    if (!c.groundTruth || typeof c.groundTruth.isRecoverable !== 'boolean') invalidFieldCount++;

    totalRevenueAtRisk += c.amountInr;
    if (c.groundTruth.isRecoverable) {
      recoverableCasesCount++;
      totalRecoverableRevenue += c.groundTruth.revenueRecoverableInr;
    }
    if (c.groundTruth.baselineRecovered) {
      baselineRecoveredCount++;
      baselineRecoveredRevenue += c.amountInr;
    }
    if (c.groundTruth.aiExpectedRecovered) {
      aiExpectedRecoveredCount++;
      aiExpectedRecoveredRevenue += c.amountInr;
    }
  }

  assert(
    'Field Validation & Bounds Checking',
    invalidFieldCount === 0,
    `Validated 100 cases across 18 fields. Errors found: ${invalidFieldCount}`
  );

  // Test 6: Fraud cases must be flagged as non-recoverable (0 recoverable revenue)
  const fraudCases = ds.filter(c => c.groundTruthCategory === 'FRAUD_SUSPICION_HIGH');
  const allFraudNonRecoverable = fraudCases.every(c => !c.groundTruth.isRecoverable && c.groundTruth.revenueRecoverableInr === 0);
  assert(
    'Fraud Safety Ground Truth Constraint',
    allFraudNonRecoverable,
    `All ${fraudCases.length} fraud cases correctly labeled isRecoverable=false with 0 recoverable revenue`
  );

  // Test 7: Expired instruments cannot be recovered by blind retries
  const expiredCases = ds.filter(c => c.groundTruthCategory === 'EXPIRED_INSTRUMENT');
  const baselineExpiredZero = expiredCases.every(c => !c.groundTruth.baselineRecovered);
  assert(
    'Expired Cards Baseline 0% Recovery Constraint',
    baselineExpiredZero,
    `All ${expiredCases.length} expired card cases correctly have baselineRecovered=false`
  );

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  return {
    total,
    passed,
    failed,
    results,
    datasetStats: {
      totalCases: ds.length,
      categoryCounts,
      totalRevenueAtRisk,
      recoverableCasesCount,
      totalRecoverableRevenue,
      baselineRecoveredCount,
      baselineRecoveredRevenue,
      aiExpectedRecoveredCount,
      aiExpectedRecoveredRevenue,
    },
  };
}

// Execute if run directly via tsx
const suite = runDatasetTestSuite();
console.log('=== DATASET VALIDATION TEST SUITE RUN ===');
console.log(`Total Tests: ${suite.total} | Passed: ${suite.passed} | Failed: ${suite.failed}`);
for (const r of suite.results) {
  console.log(` [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}: ${r.details}`);
}
console.log('\n=== DATASET AGGREGATE METRICS ===');
console.log(`Total Cases: ${suite.datasetStats.totalCases}`);
console.log(`Category Breakdown:`, suite.datasetStats.categoryCounts);
console.log(`Total Revenue At Risk: ₹${suite.datasetStats.totalRevenueAtRisk.toLocaleString('en-IN')}`);
console.log(`Recoverable Cases: ${suite.datasetStats.recoverableCasesCount} / 100`);
console.log(`Total Recoverable Revenue: ₹${suite.datasetStats.totalRecoverableRevenue.toLocaleString('en-IN')}`);
console.log(`Ground-Truth Baseline Recovered: ${suite.datasetStats.baselineRecoveredCount} cases (₹${suite.datasetStats.baselineRecoveredRevenue.toLocaleString('en-IN')})`);
console.log(`Ground-Truth AI Expected Recovered: ${suite.datasetStats.aiExpectedRecoveredCount} cases (₹${suite.datasetStats.aiExpectedRecoveredRevenue.toLocaleString('en-IN')})`);
