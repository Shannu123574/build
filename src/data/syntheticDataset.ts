/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CardNetworkType,
  FailureCategory,
  PaymentMethodType,
  RecoveryAction,
  SyntheticRecoveryCase,
} from '../types.ts';

/**
 * Seedable Linear Congruential Generator (LCG) for 100% reproducible dataset generation.
 */
export class SeededRandom {
  private m = 0x80000000; // 2**31
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed = 42) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  /**
   * Returns a float in [0, 1).
   */
  nextFloat(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  /**
   * Returns an integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /**
   * Chooses an item from an array.
   */
  choice<T>(items: T[]): T {
    const idx = this.nextInt(0, items.length - 1);
    return items[idx];
  }
}

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Ananya', 'Arjun', 'Dev', 'Diya', 'Ishaan', 'Kavya', 'Manish',
  'Meera', 'Neha', 'Nikhil', 'Pooja', 'Priya', 'Rahul', 'Ria', 'Rohan', 'Sakshi',
  'Sanjay', 'Shreya', 'Sneha', 'Tanvi', 'Varun', 'Vikram', 'Yash'
];

const LAST_NAMES = [
  'Agarwal', 'Bansal', 'Chopra', 'Deshmukh', 'Gupta', 'Iyer', 'Joshi', 'Kapoor',
  'Kumar', 'Mehta', 'Nair', 'Patel', 'Rao', 'Reddy', 'Sharma', 'Singh', 'Verma'
];

const BANKS = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank'];

interface CategoryConfig {
  category: FailureCategory;
  count: number;
  errorCodes: Array<{ code: string; desc: string; source: 'bank' | 'customer' | 'gateway' | 'issuer' }>;
  methods: PaymentMethodType[];
  isRecoverableDefault: boolean;
  optimalAction: RecoveryAction;
  baselineRecoveredProb: number;
  aiExpectedRecoveredProb: number;
  optimalDelayMin: number;
  rationaleTpl: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    category: 'TEMPORARY_ISSUER_OUTAGE',
    count: 24,
    errorCodes: [
      { code: 'BAD_REQUEST_PAYMENT_TIMED_OUT', desc: 'Issuer CBS network did not respond within timeout', source: 'bank' },
      { code: 'BANK_SYSTEM_OUTAGE', desc: 'Core banking server maintenance mode active', source: 'bank' },
      { code: 'GATEWAY_ERROR_NETWORK_FAILURE', desc: 'Transient connection reset during bank handshake', source: 'gateway' },
    ],
    methods: ['netbanking', 'card', 'upi'],
    isRecoverableDefault: true,
    optimalAction: 'SMART_RETRY_SCHEDULE',
    baselineRecoveredProb: 0.35, // Blind retries often hit same outage window or expire
    aiExpectedRecoveredProb: 0.92, // AI delays +180 min after bank health score recovers
    optimalDelayMin: 180,
    rationaleTpl: 'Bank issuer experienced temporary CBS timeout. High recovery probability if retried after health score rebound.'
  },
  {
    category: 'INSUFFICIENT_FUNDS_TRANSIENT',
    count: 28,
    errorCodes: [
      { code: 'INSUFFICIENT_FUNDS', desc: 'Debit failed due to insufficient account balance', source: 'customer' },
      { code: 'PAYMENT_DECLINED_LOW_BALANCE', desc: 'Card issuer balance check failed', source: 'issuer' },
    ],
    methods: ['mandate', 'upi', 'card'],
    isRecoverableDefault: true,
    optimalAction: 'INTERACTIVE_WHATSAPP_NUDGE',
    baselineRecoveredProb: 0.28, // Blind retries on 28th-30th fail before salary arrives on 1st
    aiExpectedRecoveredProb: 0.86, // Contextual salary-day awareness + gentle interactive WhatsApp link recovers 86%
    optimalDelayMin: 1440, // 24 hours or salary day
    rationaleTpl: 'Customer account had temporary low balance near month-end. Interactive gentle notification converts upon salary credit.'
  },
  {
    category: 'EXPIRED_INSTRUMENT',
    count: 15,
    errorCodes: [
      { code: 'CARD_EXPIRED', desc: 'Stored payment token validity period has expired', source: 'customer' },
      { code: 'MANDATE_INACTIVE', desc: 'Standing instruction mandate reached validity ceiling', source: 'issuer' },
      { code: 'TOKEN_INVALID_EXPIRY', desc: 'Card token cryptogram rejected due to date expiration', source: 'bank' },
    ],
    methods: ['card', 'mandate'],
    isRecoverableDefault: true,
    optimalAction: 'CARD_UPDATE_PROMPT',
    baselineRecoveredProb: 0.00, // Blind retries will NEVER fix an expired card token (0% recovery)
    aiExpectedRecoveredProb: 0.73, // Dynamic 1-click update portal recovers 73%
    optimalDelayMin: 60,
    rationaleTpl: 'Payment instrument expired. Automatic retries guaranteed to fail; instant card update portal link required.'
  },
  {
    category: 'AUTHENTICATION_ABANDONMENT',
    count: 18,
    errorCodes: [
      { code: 'PAYMENT_AUTHENTICATION_TIMED_OUT', desc: 'Customer did not approve UPI intent notification in time', source: 'customer' },
      { code: 'OTP_NOT_ENTERED', desc: '3DS authentication session expired before OTP entry', source: 'customer' },
      { code: 'CUSTOMER_ABANDONED_CHECKOUT', desc: 'Customer dismissed payment sheet after initiation', source: 'customer' },
    ],
    methods: ['upi', 'card'],
    isRecoverableDefault: true,
    optimalAction: 'FALLBACK_UPI_PAYMENT_LINK',
    baselineRecoveredProb: 0.22, // Static email ignored
    aiExpectedRecoveredProb: 0.83, // Instant dynamic UPI payment link sent to WhatsApp/SMS recovers within 15 min
    optimalDelayMin: 15,
    rationaleTpl: 'User abandoned 3DS/UPI intent step. Instant dynamic fallback payment link sent via preferred channel captures intent.'
  },
  {
    category: 'FRAUD_SUSPICION_HIGH',
    count: 10,
    errorCodes: [
      { code: 'PAYMENT_RISK_CHECK_FAILED', desc: 'Razorpay thirdwatch flagged suspicious card velocity', source: 'gateway' },
      { code: 'HIGH_RISK_FRAUD_SIGNATURE', desc: 'Stolen card fingerprint match detected by risk engine', source: 'issuer' },
      { code: 'RESTRICTED_CARD_BLOCKED', desc: 'Issuer flagged card as lost or compromised', source: 'bank' },
    ],
    methods: ['card', 'wallet'],
    isRecoverableDefault: false,
    optimalAction: 'DO_NOT_RETRY_CHURN_RISK',
    baselineRecoveredProb: 0.00, // Baseline attempts retries, incurring dispute fees & penalty fines
    aiExpectedRecoveredProb: 0.00, // AI correctly blocks retries to prevent chargeback loss
    optimalDelayMin: 0,
    rationaleTpl: 'High fraud suspicion score. Retries must be unconditionally DENIED to protect merchant reputation and prevent chargeback fees.'
  },
  {
    category: 'GATEWAY_TIMEOUT',
    count: 5,
    errorCodes: [
      { code: 'GATEWAY_SERVICE_UNAVAILABLE', desc: 'Upstream gateway aggregator returned HTTP 503', source: 'gateway' },
      { code: 'GATEWAY_TIMEOUT_SOCKET', desc: 'TCP socket connection severed during processing', source: 'gateway' },
    ],
    methods: ['card', 'upi', 'netbanking'],
    isRecoverableDefault: true,
    optimalAction: 'SMART_RETRY_SCHEDULE',
    baselineRecoveredProb: 0.40,
    aiExpectedRecoveredProb: 0.90,
    optimalDelayMin: 30,
    rationaleTpl: 'Transient payment gateway proxy timeout. Exponential backoff retry resolves cleanly.'
  },
];

/**
 * Generates an exact, deterministic, seed-based synthetic recovery dataset.
 * 
 * @param seed - Random seed (default: 42)
 * @param targetCount - Total cases to produce (default: 100)
 */
export function generateSyntheticDataset(seed = 42, targetCount = 100): SyntheticRecoveryCase[] {
  const rng = new SeededRandom(seed);
  const dataset: SyntheticRecoveryCase[] = [];
  let caseIndex = 1;

  for (const cfg of CATEGORY_CONFIGS) {
    for (let i = 0; i < cfg.count; i++) {
      if (dataset.length >= targetCount) break;

      const firstName = rng.choice(FIRST_NAMES);
      const lastName = rng.choice(LAST_NAMES);
      const customerName = `${firstName} ${lastName}`;
      const customerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rng.nextInt(10, 99)}@example.com`;
      const customerPhone = `+9198${rng.nextInt(10000000, 99999999)}`;
      
      const errChoice = rng.choice(cfg.errorCodes);
      const method = rng.choice(cfg.methods);
      const bank = method === 'card' || method === 'netbanking' || method === 'mandate' ? rng.choice(BANKS) : undefined;
      const cardNetwork: CardNetworkType | undefined = method === 'card' 
        ? rng.choice(['VISA', 'MASTERCARD', 'RUPAY'] as CardNetworkType[])
        : undefined;

      // Realistic transaction amounts in INR (e.g., ₹499 to ₹18,500)
      const amountInr = rng.choice([499, 799, 999, 1499, 1999, 2499, 4999, 7999, 9999, 14999, 18500]);

      // Contextual variables
      const customerTenureMonths = rng.nextInt(1, 48);
      const lifetimeSuccessfulPayments = rng.nextInt(customerTenureMonths > 6 ? 5 : 0, customerTenureMonths * 2);
      const consecutiveFailureCount = cfg.category === 'FRAUD_SUSPICION_HIGH' ? rng.nextInt(3, 7) : rng.nextInt(1, 2);
      
      // Bank health score reflects the category reality
      let bankHealthScore: number;
      if (cfg.category === 'TEMPORARY_ISSUER_OUTAGE') {
        bankHealthScore = parseFloat((rng.nextFloat() * 0.25 + 0.05).toFixed(2)); // 0.05 - 0.30 (degraded)
      } else if (cfg.category === 'GATEWAY_TIMEOUT') {
        bankHealthScore = parseFloat((rng.nextFloat() * 0.30 + 0.40).toFixed(2)); // 0.40 - 0.70 (partial)
      } else {
        bankHealthScore = parseFloat((rng.nextFloat() * 0.15 + 0.85).toFixed(2)); // 0.85 - 1.00 (healthy)
      }

      // Temporal context: Day of month is skewed for salary cycle testing
      let dayOfMonth: number;
      if (cfg.category === 'INSUFFICIENT_FUNDS_TRANSIENT') {
        dayOfMonth = rng.choice([27, 28, 29, 30, 31]); // End of month low liquidity
      } else {
        dayOfMonth = rng.nextInt(1, 28);
      }

      const hourOfDay = rng.nextInt(0, 23);
      const merchantCategory = rng.choice([
        'saas_recurring', 'ecommerce_d2c', 'gym_fitness', 'ott_entertainment', 'utility_bill'
      ] as const);

      // Ground truth determination using reproducible RNG rolls
      const isRecoverable = cfg.isRecoverableDefault;
      const baselineRoll = rng.nextFloat();
      const aiRoll = rng.nextFloat();

      const baselineRecovered = isRecoverable && baselineRoll < cfg.baselineRecoveredProb;
      const aiExpectedRecovered = isRecoverable && aiRoll < cfg.aiExpectedRecoveredProb;

      const id = `case_${String(caseIndex).padStart(3, '0')}`;
      const razorpayPaymentId = `pay_sim_${rng.nextInt(10000000, 99999999)}`;
      const razorpayOrderId = `order_sim_${rng.nextInt(1000000, 9999999)}`;

      dataset.push({
        id,
        razorpayPaymentId,
        razorpayOrderId,
        customerId: `cust_${String(caseIndex).padStart(4, '0')}`,
        customerName,
        customerEmail,
        customerPhone,
        amountInr,
        currency: 'INR',
        errorCode: errChoice.code,
        errorDescription: errChoice.desc,
        errorSource: errChoice.source,
        paymentMethod: method,
        cardNetwork,
        issuingBank: bank,
        customerTenureMonths,
        lifetimeSuccessfulPayments,
        consecutiveFailureCount,
        bankHealthScore,
        attemptNumber: 1,
        dayOfMonth,
        hourOfDay,
        merchantCategory,
        groundTruthCategory: cfg.category,
        groundTruth: {
          isRecoverable,
          optimalAction: cfg.optimalAction,
          baselineRecovered,
          aiExpectedRecovered,
          revenueRecoverableInr: isRecoverable ? amountInr : 0,
          rationale: cfg.rationaleTpl,
          optimalDelayMinutes: cfg.optimalDelayMin,
        },
      });

      caseIndex++;
    }
  }

  return dataset;
}

/**
 * The standard, immutable 100-case synthetic dataset for RecoverOS AI evaluation.
 */
export const SYNTHETIC_DATASET: SyntheticRecoveryCase[] = generateSyntheticDataset(42, 100);
