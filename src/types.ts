/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Failure category taxonomy for payment incidents.
 */
export type FailureCategory =
  | 'TEMPORARY_ISSUER_OUTAGE'
  | 'INSUFFICIENT_FUNDS_TRANSIENT'
  | 'EXPIRED_INSTRUMENT'
  | 'INVALID_CARD_DETAILS'
  | 'AUTHENTICATION_ABANDONMENT'
  | 'FRAUD_SUSPICION_HIGH'
  | 'GATEWAY_TIMEOUT'
  | 'NETWORK_TIMEOUT'
  | 'MANDATE_FAILURE'
  | 'UPI_AUTOPAY_FAILURE'
  | 'EXCESSIVE_RETRY_VELOCITY'
  | 'DUPLICATE_WEBHOOK'
  | 'FORGED_WEBHOOK'
  | 'UNKNOWN_ANOMALY';

/**
 * Approved action vocabulary for recovery interventions.
 */
export type RecoveryAction =
  | 'SMART_RETRY_SCHEDULE'
  | 'FALLBACK_UPI_PAYMENT_LINK'
  | 'ALTERNATIVE_PAYMENT_METHOD'
  | 'CARD_UPDATE_PROMPT'
  | 'INTERACTIVE_WHATSAPP_NUDGE'
  | 'CUSTOMER_NOTIFICATION'
  | 'MANDATE_REAUTH'
  | 'DO_NOT_RETRY_CHURN_RISK'
  | 'DO_NOT_RETRY_FRAUD'
  | 'ESCALATE_HUMAN_OPS'
  | 'ESCALATE_FOR_REVIEW';

/**
 * Payment methods supported by Razorpay integration.
 */
export type PaymentMethodType = 'card' | 'upi' | 'netbanking' | 'mandate' | 'wallet';

/**
 * Card network types.
 */
export type CardNetworkType = 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX';

/**
 * Incident lifecycle status.
 */
export type IncidentStatus =
  | 'DETECTED'
  | 'DIAGNOSED'
  | 'POLICY_DENIED'
  | 'EXECUTING'
  | 'RECOVERED'
  | 'EXHAUSTED';

/**
 * Ground-truth outcome and validation data for synthetic evaluation cases.
 */
export interface GroundTruthOutcome {
  /** Whether this payment failure is fundamentally recoverable under optimal conditions */
  isRecoverable: boolean;
  /** The single optimal recovery intervention */
  optimalAction: RecoveryAction;
  /** Ground truth: would standard 3-retry blind dunning baseline recover this? */
  baselineRecovered: boolean;
  /** Ground truth: does contextual AI-driven intervention recover this? */
  aiExpectedRecovered: boolean;
  /** Actual recoverable revenue in INR */
  revenueRecoverableInr: number;
  /** Real-world financial context & ground-truth rationale */
  rationale: string;
  /** Expected optimal delay in minutes before executing action */
  optimalDelayMinutes: number;
}

/**
 * Full synthetic payment recovery case structure.
 */
export interface SyntheticRecoveryCase {
  id: string; // e.g. "case_001"
  razorpayPaymentId: string;
  razorpayOrderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amountInr: number;
  currency: string;
  
  // Payment telemetry & error details
  errorCode: string;
  errorDescription: string;
  errorSource: 'bank' | 'customer' | 'gateway' | 'issuer';
  paymentMethod: PaymentMethodType;
  cardNetwork?: CardNetworkType;
  issuingBank?: string;
  
  // Enriched contextual dimensions
  customerTenureMonths: number;
  lifetimeSuccessfulPayments: number;
  consecutiveFailureCount: number;
  bankHealthScore: number; // 0.0 (total downtime) to 1.0 (perfect)
  attemptNumber: number;
  dayOfMonth: number; // 1 - 31 (salary cycle indicator)
  hourOfDay: number; // 0 - 23
  merchantCategory: 'saas_recurring' | 'ecommerce_d2c' | 'gym_fitness' | 'ott_entertainment' | 'utility_bill';
  
  // Ground truth classification and recovery outcome
  groundTruthCategory: FailureCategory;
  groundTruth: GroundTruthOutcome;
}

/**
 * AI diagnosis output schema representation.
 */
export interface AiDiagnosisResult {
  id: string;
  caseId: string;
  failureCategory: FailureCategory;
  confidenceScore: number; // 0.0 - 1.0
  predictedRecoveryProbability: number; // 0.0 - 1.0
  suggestedAction: RecoveryAction;
  recommendedExecutionDelayMinutes: number;
  reasoning: string;
  riskFactors: string[];
  isAiFallback: boolean;
  timestamp: number;
}

/**
 * Deterministic policy evaluation record.
 */
export interface PolicyEvaluationResult {
  id: string;
  caseId: string;
  approved: boolean;
  accepted?: boolean; // Alias for approved
  denialReason?:
    | 'RETRY_LIMIT_EXCEEDED'
    | 'COOLDOWN_ACTIVE'
    | 'FRAUD_SCORE_EXCEEDS_THRESHOLD'
    | 'NEGATIVE_EXPECTED_ROI'
    | 'DAILY_BUDGET_EXCEEDED'
    | 'UNAUTHORIZED_ACTION';
  actionToExecute: RecoveryAction;
  interventionCostInr: number;
  expectedNetGainInr: number;
  rulesEvaluated: Array<{
    ruleName: string;
    passed: boolean;
    note: string;
  }>;
  timestamp: number;
}

/**
 * Cryptographic ledger entry.
 */
export interface LedgerRecord {
  index: number;
  previousHash: string;
  currentHash: string;
  caseId: string;
  action: string;
  actor: 'SYSTEM_POLICY' | 'RAZORPAY_GATEWAY' | 'RECONCILER' | 'SIMULATOR';
  debitAtRiskInr: number;
  creditRecoveredInr: number;
  costIncurredInr: number;
  netImpactInr: number;
  razorpayReferenceId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'BLOCKED';
  payloadSummary: string;
  timestamp: number;
}

/**
 * Summary metrics comparing AI vs Deterministic Baseline.
 */
export interface BenchmarkComparisonSummary {
  totalCases: number;
  totalRevenueAtRiskInr: number;
  
  // Baseline results
  baselineCasesRecovered: number;
  baselineRevenueRecoveredInr: number;
  baselineInterventionCostsInr: number;
  baselineNetProfitInr: number;
  baselineRecoveryRatePercent: number;
  baselineSpamMessagesSent: number;
  
  // AI results
  aiCasesRecovered: number;
  aiRevenueRecoveredInr: number;
  aiInterventionCostsInr: number;
  aiNetProfitInr: number;
  aiRecoveryRatePercent: number;
  aiSpamMessagesSent: number;
  
  // Comparative Lift & Efficiency
  incrementalRevenueRecoveredInr: number;
  incrementalNetProfitInr: number;
  incrementalRecoveryRateLiftPercent: number;
  spamReductionPercent: number;
}

export interface BaselineCaseOutcome {
  recovered: boolean;
  amountRecoveredInr: number;
  attemptsMade: number;
  messagesSent: number;
  interventionCostInr: number;
  strategy: string;
  notes: string;
}

export interface RecoverOsCaseOutcome {
  diagnosis: AiDiagnosisResult;
  policy: PolicyEvaluationResult;
  executed: boolean;
  actionExecuted: RecoveryAction;
  recovered: boolean;
  amountRecoveredInr: number;
  messagesSent: number;
  interventionCostInr: number;
  executionRef: string;
  notes: string;
}

export interface CaseBenchmarkResult {
  caseId: string;
  amountInr: number;
  groundTruthCategory: FailureCategory;
  isRecoverable: boolean;
  baseline: BaselineCaseOutcome;
  recoveros: RecoverOsCaseOutcome;
}

export interface RealWorldValidationEvidence {
  institution: string;
  docReference: string;
  publishedYear: string;
  verifiedBehavior: string;
  sourceUrl?: string;
}

export type ValidationStatus =
  | 'DOCUMENTED_INDUSTRY_STANDARD'
  | 'EMPIRICALLY_VERIFIED'
  | 'SAFETY_REGULATORY_MANDATE';

/**
 * Explicit real-world claim classification taxonomy:
 * A. Regulatory requirement
 * B. Payment-network rule
 * C. Gateway/documentation behavior
 * D. Engineering best practice
 * E. RecoverOS design decision
 * F. Synthetic benchmark assumption
 */
export type ClaimClassification =
  | 'REGULATORY_REQUIREMENT'
  | 'PAYMENT_NETWORK_RULE'
  | 'GATEWAY_DOCUMENTED_BEHAVIOR'
  | 'ENGINEERING_BEST_PRACTICE'
  | 'RECOVEROS_DESIGN_DECISION'
  | 'SYNTHETIC_BENCHMARK_ASSUMPTION';

export interface BenchmarkEvaluationReport {
  summary: BenchmarkComparisonSummary;
  caseResults: CaseBenchmarkResult[];
  categoryBreakdown: Record<
    FailureCategory,
    {
      count: number;
      totalAtRiskInr: number;
      baselineRecoveredInr: number;
      baselineCasesRecovered: number;
      aiRecoveredInr: number;
      aiCasesRecovered: number;
    }
  >;
  executionTimestamp: number;
}

export interface RealWorldValidationScenario {
  id: string;
  category: FailureCategory;
  name: string;
  failureCondition: string;
  observableTelemetry: {
    errorCode: string[];
    bankHealthPattern: string;
    telemetryMarkers: string[];
  };
  expectedDiagnosis: string;
  expectedSafeAction: RecoveryAction;
  expectedUnsafeAction: string;
  whySafeActionPreferable: string;
  evidenceSource: RealWorldValidationEvidence;
  validationStatus: ValidationStatus;
  claimClassification: ClaimClassification;
  isRecoverable: boolean;
  requiresHumanOps?: boolean;
}

/**
 * Track-03 Validation Hardening Types
 */

export type EvidenceClassification = 
  | 'REAL_TEST_MODE_EVENT'
  | 'REALISTIC_ENGINEERED_SCENARIO'
  | 'SYNTHETIC_BENCHMARK'
  | 'HELD_OUT_EVALUATION'
  | 'ARCHITECTURAL_ASSERTION';

export interface RealisticPaymentCase extends SyntheticRecoveryCase {
  evidenceClass: EvidenceClassification;
}

export interface AiValueProofMetrics {
  aiCasesRecovered: number;
  aiRevenueRecoveredInr: number;
  fallbackCasesRecovered: number;
  fallbackRevenueRecoveredInr: number;
  incrementalLiftCases: number;
  incrementalLiftRevenueInr: number;
}

export interface HeldOutEvaluationReport {
  totalCases: number;
  revenueAtRiskInr: number;
  recoveryRatePercent: number;
  revenueRecoveredInr: number;
  fraudBlocks: number;
  duplicateBlocks: number;
  webhookFailuresRejected: number;
  humanEscalations: number;
  aiValueProof: AiValueProofMetrics;
}

export interface FailureInjectionResult {
  failureMode: string;
  input: string;
  detection: string;
  decision: string;
  action: string;
  result: string;
  auditHash: string;
}

