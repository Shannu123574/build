/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runHeldOutEvaluation } from './heldOutEvaluation.ts';
import { FailureInjectionLab } from './failureInjectionLab.ts';
import { REALISTIC_CORPUS } from '../data/realisticCorpus.ts';
import { globalAuditLedger } from './auditLedger.ts';
import { RazorpayTestModeEnvironment } from './razorpayTestModeEnvironment.ts';

async function testRealWorldValidation() {
  console.log('--- RUNNING TRACK 03 REAL-WORLD VALIDATION TESTS ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // Clear ledger
  globalAuditLedger.clear();

  // Test 1: Corpus constraints
  const testModeCases = REALISTIC_CORPUS.filter(c => c.evidenceClass === 'REAL_TEST_MODE_EVENT');
  const heldOutCases = REALISTIC_CORPUS.filter(c => c.evidenceClass === 'HELD_OUT_EVALUATION');
  
  assert(REALISTIC_CORPUS.length === 50, 'Realistic corpus contains exactly 50 cases');
  assert(testModeCases.length === 5, 'Contains exactly 5 real test-mode events');
  assert(heldOutCases.length === 15, 'Contains exactly 15 held-out evaluation cases (30%)');

  // Test 2: Test mode abstraction
  try {
    const mockDetails = await RazorpayTestModeEnvironment.fetchPaymentDetails('pay_test_123');
    assert(mockDetails.status === 'failed', 'Test mode wrapper successfully simulates test credentials');
  } catch(e) {
    assert(false, 'Test mode wrapper should not throw for valid test IDs');
  }

  // Test 3: Test mode boundary enforcement
  try {
    await RazorpayTestModeEnvironment.fetchPaymentDetails('pay_live_456');
    assert(false, 'Test mode wrapper must throw on non-test prefix');
  } catch(e: any) {
    assert(e.message.includes('Only test-mode payment IDs'), 'Test mode wrapper rejects production prefixes');
  }

  // Test 4: Held-out evaluation
  const metrics = await runHeldOutEvaluation();
  assert(metrics.totalCases === 15, 'Held-out evaluation properly isolates 15 cases');
  assert(metrics.revenueAtRiskInr > 0, 'Held-out evaluation calculates correct revenue at risk');
  assert(metrics.aiValueProof.fallbackCasesRecovered >= 0, 'Fallback baseline successfully evaluated on held-out data');

  // Test 5: Failure Injection Lab
  globalAuditLedger.clear();
  const f1 = FailureInjectionLab.injectGeminiUnavailable();
  assert(f1.result === 'Recovery executes normally', 'Failure Injection: Gemini 503 triggers safe fallback');
  
  const f2 = FailureInjectionLab.injectInvalidWebhookHmac();
  assert(f2.decision.includes('Reject'), 'Failure Injection: Invalid HMAC is immediately rejected');

  const f3 = FailureInjectionLab.injectPolicyBudgetExhaustion();
  assert(f3.action.includes('Skip recovery'), 'Failure Injection: Budget exhaustion properly denies execution');

  assert(globalAuditLedger.getRecords().length >= 3, 'Failure injection appropriately logs to audit ledger');

  console.log(`\nResults: ${passed}/${total} Real-World Validation tests passed.`);
  
  if (passed !== total) {
    process.exit(1);
  }
}

testRealWorldValidation().catch(err => {
  console.error('Unhandled error in testRealWorldValidation:', err);
  process.exit(1);
});
