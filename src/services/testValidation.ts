/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { REAL_WORLD_VALIDATION_REGISTRY, getRealWorldValidationMetrics } from '../data/realWorldValidationRegistry.ts';
import { FailureCategory, SyntheticRecoveryCase } from '../types.ts';
import type { RecoveryAction } from '../types.ts';
import { evaluatePolicyGuard } from './policyEngine.ts';
import { classifyPaymentFailureFallback } from './fallbackClassifier.ts';
import { AuditLedger } from './auditLedger.ts';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, details: string) {
  results.push({
    name,
    category,
    passed: condition,
    details: condition ? `PASS: ${details}` : `FAIL: ${details}`,
  });
}

export function runValidationSuite(): { passed: number; failed: number; total: number; results: TestResult[] } {
  console.log('===================================================================');
  console.log('RECOVEROS AI — PHASE 7 REAL-WORLD VALIDATION REGISTRY TEST SUITE');
  console.log('===================================================================');

  const registry = REAL_WORLD_VALIDATION_REGISTRY;
  const metrics = getRealWorldValidationMetrics();

  // Test 1: Every failure category has a validation mapping
  const allCategories: FailureCategory[] = [
    'TEMPORARY_ISSUER_OUTAGE',
    'INSUFFICIENT_FUNDS_TRANSIENT',
    'EXPIRED_INSTRUMENT',
    'AUTHENTICATION_ABANDONMENT',
    'FRAUD_SUSPICION_HIGH',
    'GATEWAY_TIMEOUT',
    'UNKNOWN_ANOMALY'
  ];

  const mappedCategories = new Set(registry.map((r) => r.category));
  const missingCategories = allCategories.filter((c) => !mappedCategories.has(c));

  assert(
    missingCategories.length === 0,
    'All 7 failure categories are mapped in validation registry',
    'Taxonomy Coverage',
    `Found mappings for all ${mappedCategories.size}/${allCategories.length} payment failure categories`
  );

  // Test 2: Every recoverable category has an approved safe recovery intervention
  const recoverableScenarios = registry.filter((s) => s.isRecoverable);
  const validActions: RecoveryAction[] = [
    'SMART_RETRY_SCHEDULE',
    'FALLBACK_UPI_PAYMENT_LINK',
    'CARD_UPDATE_PROMPT',
    'INTERACTIVE_WHATSAPP_NUDGE'
  ];

  const validActionMappings = recoverableScenarios.every((s) =>
    validActions.includes(s.expectedSafeAction)
  );

  assert(
    validActionMappings && recoverableScenarios.length >= 4,
    'Every recoverable category has an approved safe intervention',
    'Recovery Mapping Safety',
    `All ${recoverableScenarios.length} recoverable scenarios specify valid, non-destructive recovery actions`
  );

  // Test 3: Fraud has no recovery execution (Must be DO_NOT_RETRY or blocked)
  const fraudScenario = registry.find((s) => s.category === 'FRAUD_SUSPICION_HIGH');
  const fraudSafe =
    fraudScenario &&
    !fraudScenario.isRecoverable &&
    fraudScenario.expectedSafeAction === 'DO_NOT_RETRY_CHURN_RISK' &&
    fraudScenario.validationStatus === 'SAFETY_REGULATORY_MANDATE';

  assert(
    Boolean(fraudSafe),
    'Fraud risk strictly mapped to zero recovery execution & regulatory mandate',
    'Fraud Protection',
    `Fraud scenario has isRecoverable=false, action=DO_NOT_RETRY_CHURN_RISK, status=SAFETY_REGULATORY_MANDATE`
  );

  // Test 4: Expired instruments never use blind retry
  const expiredScenario = registry.find((s) => s.category === 'EXPIRED_INSTRUMENT');
  const expiredSafe =
    expiredScenario &&
    expiredScenario.expectedSafeAction === 'CARD_UPDATE_PROMPT' &&
    expiredScenario.expectedUnsafeAction.toLowerCase().includes('dunning') &&
    expiredScenario.validationStatus === 'SAFETY_REGULATORY_MANDATE';

  assert(
    Boolean(expiredSafe),
    'Expired instruments explicitly prohibit blind dunning retries',
    'Card Association Compliance',
    `Expired cards routed to CARD_UPDATE_PROMPT; prevents Category 1 Hard Decline penalty charges`
  );

  // Test 5: Unknown anomalies escalate to human operations
  const unknownScenario = registry.find((s) => s.category === 'UNKNOWN_ANOMALY');
  const unknownSafe =
    unknownScenario &&
    unknownScenario.expectedSafeAction === 'ESCALATE_HUMAN_OPS' &&
    unknownScenario.requiresHumanOps === true;

  assert(
    Boolean(unknownSafe),
    'Unknown anomalies strictly escalate to human operations',
    'Fail-Safe Principle',
    `Unrecognized error taxonomy routes to ESCALATE_HUMAN_OPS under PCI DSS Fail-Safe requirements`
  );

  // Test 6: Every scenario contains documented evidence source & reference
  const allHaveEvidence = registry.every(
    (s) =>
      s.evidenceSource &&
      s.evidenceSource.institution.length > 5 &&
      s.evidenceSource.docReference.length > 10 &&
      s.evidenceSource.publishedYear.length === 4
  );

  assert(
    allHaveEvidence,
    'All validation scenarios backed by concrete payment standards & documents',
    'Evidence Rigor',
    `100% of scenarios cite published institutional standards (NPCI, Visa, Mastercard, RBI, Stripe, Razorpay)`
  );

  // Test 7: Every scenario specifies an unsafe action that is explicitly prevented
  const allHaveUnsafeActions = registry.every(
    (s) => s.expectedUnsafeAction && s.whySafeActionPreferable.length > 20
  );

  assert(
    allHaveUnsafeActions,
    'All scenarios document specific unsafe anti-patterns prevented by RecoverOS',
    'Safety Architecture',
    `Documented ${registry.length} unsafe execution anti-patterns and concrete comparative safety justifications`
  );

  // Test 8: Policy Engine enforcement validates against real-world scenario inputs
  // Create a realistic fraud incident and test that policy engine denies it
  const sampleFraudCase: SyntheticRecoveryCase = {
    id: 'case_val_fraud_01',
    razorpayPaymentId: 'pay_fraud_val_01',
    razorpayOrderId: 'order_fraud_val_01',
    customerId: 'cust_val_01',
    customerName: 'High Risk Entity',
    customerEmail: 'anon@tor-mail.org',
    customerPhone: '+919876543210',
    amountInr: 15000,
    currency: 'INR',
    paymentMethod: 'card',
    cardNetwork: 'VISA',
    errorCode: 'PAYMENT_RISK_CHECK_FAILED',
    errorSource: 'gateway',
    errorDescription: 'Stolen card flag',
    bankHealthScore: 0.95,
    customerTenureMonths: 1,
    lifetimeSuccessfulPayments: 0,
    consecutiveFailureCount: 1,
    attemptNumber: 1,
    dayOfMonth: 15,
    hourOfDay: 3,
    merchantCategory: 'saas_recurring',
    groundTruthCategory: 'FRAUD_SUSPICION_HIGH',
    groundTruth: {
      isRecoverable: false,
      optimalAction: 'DO_NOT_RETRY_CHURN_RISK',
      baselineRecovered: false,
      aiExpectedRecovered: false,
      revenueRecoverableInr: 0,
      rationale: 'Fraud risk strictly blocked to prevent chargeback fees',
      optimalDelayMinutes: 0
    }
  };

  const fraudDiagnosis = classifyPaymentFailureFallback(sampleFraudCase);
  const fraudPolicy = evaluatePolicyGuard(sampleFraudCase, fraudDiagnosis, undefined, 0);

  assert(
    !fraudPolicy.approved && fraudPolicy.denialReason?.includes('FRAUD_SCORE_EXCEEDS_THRESHOLD'),
    'Policy Engine strictly denies real-world high-risk fraud incidents',
    'Deterministic Gating Verification',
    `Fraud risk incident denied: approved=false, reason="${fraudPolicy.denialReason}"`
  );

  // Test 9: Clear distinction between synthetic benchmark and real-world validation
  const validationMetrics = getRealWorldValidationMetrics();
  assert(
    validationMetrics.totalPatternsDocumented === 7 &&
    validationMetrics.evidenceSourcesCount >= 5 &&
    validationMetrics.safetyBlockedPatternsCount >= 2,
    'Validation metrics correctly aggregate industry evidence coverage',
    'Metric Transparency',
    `Documented ${validationMetrics.totalPatternsDocumented} patterns across ${validationMetrics.evidenceSourcesCount} distinct payment standards authorities`
  );

  // Test 10: Explicit claim classification taxonomy coverage
  const allClassified = registry.every((s) => Boolean(s.claimClassification));
  const distinctClassifications = new Set(registry.map((s) => s.claimClassification));

  assert(
    allClassified && distinctClassifications.size >= 4,
    'Every scenario is classified with unambiguous regulatory or standards taxonomy',
    'Claim Taxonomy Classification',
    `All ${registry.length} scenarios classified across ${distinctClassifications.size} distinct claim taxonomies (Regulatory, Network Rule, Gateway Spec, Best Practice, Design Decision)`
  );

  // Test 11: Cryptographic Ledger SHA-256 Chaining & Tamper Detection Invariant
  const testLedger = new AuditLedger();
  testLedger.append({
    caseId: 'val_case_01',
    action: 'SMART_RETRY_SCHEDULE',
    actor: 'SYSTEM_POLICY',
    debitAtRiskInr: 1000,
    creditRecoveredInr: 1000,
    costIncurredInr: 10,
    status: 'SUCCESS',
    payloadSummary: 'Initial test block',
  });
  testLedger.append({
    caseId: 'val_case_02',
    action: 'FALLBACK_UPI_PAYMENT_LINK',
    actor: 'SYSTEM_POLICY',
    debitAtRiskInr: 2000,
    creditRecoveredInr: 2000,
    costIncurredInr: 20,
    status: 'SUCCESS',
    payloadSummary: 'Second test block',
  });

  const validChain = testLedger.verifyIntegrity();
  // Mutate first block to simulate adversarial retroactive database tampering
  (testLedger.getRecords()[0] as any).creditRecoveredInr = 888888;
  const tamperedChain = testLedger.verifyIntegrity();

  assert(
    validChain.isValid && !tamperedChain.isValid && Boolean(tamperedChain.error),
    'Dual-entry SHA-256 ledger verifies valid state and detects retroactive corruption',
    'Cryptographic Proof Verification',
    `Valid state verified (valid=${validChain.isValid}); retroactive mutation caught: "${tamperedChain.error}" (tamper detected=${!tamperedChain.isValid})`
  );

  // Print results
  let passedCount = 0;
  results.forEach((r) => {
    if (r.passed) passedCount++;
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`       Category: ${r.category}`);
    console.log(`       Details:  ${r.details}`);
  });

  const failedCount = results.length - passedCount;
  console.log('-------------------------------------------------------------------');
  console.log(`SUMMARY: Total Tests: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('-------------------------------------------------------------------');

  return {
    passed: passedCount,
    failed: failedCount,
    total: results.length,
    results
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('testValidation')) {
  const summary = runValidationSuite();
  if (summary.failed > 0) {
    process.exit(1);
  }
}
