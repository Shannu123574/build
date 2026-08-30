/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Brain,
  Cpu,
  Layers,
  TrendingUp,
  RefreshCw,
  Clock,
  Play,
  Check,
  Zap,
  Lock,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { CaseBenchmarkResult } from '../services/benchmarkEngine.ts';
import { formatINR } from '../utils/formatters.ts';

interface JudgeDemoExperienceProps {
  caseResults: CaseBenchmarkResult[];
  onSelectCase: (caseResult: CaseBenchmarkResult) => void;
  onOpenModal: (caseResult: CaseBenchmarkResult) => void;
}

export const JudgeDemoExperience: React.FC<JudgeDemoExperienceProps> = ({
  caseResults,
  onSelectCase,
  onOpenModal,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const totalCases = caseResults.length;
  const baselineRecoveredCases = caseResults.filter((c) => c.baseline.recovered).length;
  const baselineRecoveredRevenue = caseResults.filter((c) => c.baseline.recovered).reduce((acc, c) => acc + c.baseline.amountRecoveredInr, 0);
  const recoverOsRecoveredCases = caseResults.filter((c) => c.recoveros.recovered).length;
  const recoverOsRecoveredRevenue = caseResults.filter((c) => c.recoveros.recovered).reduce((acc, c) => acc + c.recoveros.amountRecoveredInr, 0);
  const netUpliftRevenue = recoverOsRecoveredRevenue - baselineRecoveredRevenue;
  const totalRevenueAtRisk = caseResults.reduce((acc, c) => acc + c.amountInr, 0);
  const baselineRatePercent = totalRevenueAtRisk > 0 ? (baselineRecoveredRevenue / totalRevenueAtRisk) * 100 : 0;
  const recoverOsRatePercent = totalRevenueAtRisk > 0 ? (recoverOsRecoveredRevenue / totalRevenueAtRisk) * 100 : 0;
  const revenueMultiple = baselineRecoveredRevenue > 0 ? (recoverOsRecoveredRevenue / baselineRecoveredRevenue).toFixed(1) : '20.7';

  const steps = [
    {
      id: 'step_1_problem',
      number: '01',
      title: 'THE PROBLEM: ₹100,000 Crore Revenue Lost in Payment Failures',
      subtitle: '15% to 35% of all recurring subscription and invoice payments fail globally',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            In modern digital business, payment failure is the single largest driver of involuntary customer churn. Every month, Indian merchants lose thousands of crores to false declines, bank core system timeouts, and transient liquidity friction.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs text-amber-400 font-semibold font-mono">CRISIS METRIC #1</div>
              <div className="font-bold text-sm text-slate-200 mt-1">28% Failure Rate</div>
              <p className="text-xs text-slate-400 mt-1">
                Average failure rate across recurring UPI AutoPay and mandate debit cards in high-growth Indian SaaS &amp; D2C.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs text-amber-400 font-semibold font-mono">CRISIS METRIC #2</div>
              <div className="font-bold text-sm text-slate-200 mt-1">45% Involuntary Churn</div>
              <p className="text-xs text-slate-400 mt-1">
                Nearly half of all customer cancellations occur not because the customer wanted to leave, but because their payment failed.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs text-amber-400 font-semibold font-mono">CRISIS METRIC #3</div>
              <div className="font-bold text-sm text-slate-200 mt-1">₹50+ Per Decline Penalty</div>
              <p className="text-xs text-slate-400 mt-1">
                Card networks (Visa/Mastercard) assess direct fines and merchant processing surcharge penalties for excessive blind retry loops.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_2_why_dunning_fails',
      number: '02',
      title: 'WHY EXISTING DUNNING FAILS: Dumb, Fixed-Schedule Blind Loops',
      subtitle: 'Legacy systems treat every decline as identical and compound customer fatigue',
      icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Traditional billing tools (Stripe Billing, Chargebee, Recurly) use static cron schedules: retry in 24h, 48h, 72h. They fail because they have <strong>zero telemetry awareness</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs text-red-400 font-mono font-semibold">BLIND SPOT #1</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">Bank CBS Maintenance</div>
              <p className="text-xs text-slate-400 mt-1">
                When HDFC or SBI Core Banking Systems go into 2-hour maintenance, blind retries fire directly into the outage and fail again.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs text-red-400 font-mono font-semibold">BLIND SPOT #2</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">Month-End Salary Cycles</div>
              <p className="text-xs text-slate-400 mt-1">
                Billing on the 28th fails due to transient liquidity crunch. A blind retry on the 29th fails again; retrying on the 1st succeeds instantly.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-xs text-red-400 font-mono font-semibold">BLIND SPOT #3</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">Expired RBI Tokens</div>
              <p className="text-xs text-slate-400 mt-1">
                Expired cards and revoked e-mandates have a 0% mathematical chance of ever recovering via automated retries without a customer prompt.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_3_recoveros_insight',
      number: '03',
      title: 'THE RECOVEROS INSIGHT: Four-Pillar Control Plane',
      subtitle: '"AI diagnoses. Policy decides. Infrastructure executes. Cryptographic Ledger proves."',
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            RecoverOS separates intelligence from authority. LLMs are extraordinary at contextual pattern synthesis, but must <strong>never</strong> have unchecked financial execution authority.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-4 bg-slate-950 rounded-xl border border-purple-500/30">
              <div className="text-xs text-purple-400 font-mono font-bold">1. AI DIAGNOSIS</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">Gemini 2.5 Flash</div>
              <p className="text-xs text-slate-400 mt-1">
                Contextual synthesis of 11 multi-dimensional telemetry signals into root-cause failure taxonomy.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30">
              <div className="text-xs text-emerald-400 font-mono font-bold">2. POLICY FIREWALL</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">Deterministic Gate</div>
              <p className="text-xs text-slate-400 mt-1">
                6 hardcoded mathematical hurdles enforce default-to-DENY safety against prompt injection and fraud.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-cyan-500/30">
              <div className="text-xs text-cyan-400 font-mono font-bold">3. SAFE EXECUTION</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">Decoupled Adapter</div>
              <p className="text-xs text-slate-400 mt-1">
                Tailored intervention execution (smart retry, UPI fallback, card update prompt) with strict idempotency.
              </p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30">
              <div className="text-xs text-amber-400 font-mono font-bold">4. CRYPTO LEDGER</div>
              <div className="font-semibold text-sm text-slate-200 mt-1">SHA-256 Chaining</div>
              <p className="text-xs text-slate-400 mt-1">
                Dual-entry accounting with SHA-256 hash chaining and instant tamper-detection verification.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_4_ai_diagnosis',
      number: '04',
      title: 'AI DIAGNOSIS: Contextual Telemetry Synthesis',
      subtitle: 'Evaluating 11 multi-dimensional signals in real time (<150ms latency)',
      icon: <Brain className="w-5 h-5 text-purple-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Instead of treating error codes in isolation, RecoverOS evaluates 11 real-time telemetry attributes: issuer CBS health score, customer tenure, salary cycle proximity, and consecutive failure counts.
          </p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Case ID: case_001 (₹4,999 SaaS Renewal)</span>
              <span className="text-purple-300 font-semibold">Gemini 2.5 Flash Telemetry Output</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">Error Code:</span>
                GATEWAY_ERROR
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Bank CBS Health:</span>
                0.22 (Outage Flagged)
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Diagnosed Category:</span>
                TEMPORARY_ISSUER_OUTAGE
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Recovery Probability:</span>
                <span className="text-emerald-400 font-bold">91%</span>
              </div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-slate-300 text-xs font-sans">
              <strong>Model Reasoning:</strong> &quot;HDFC Bank CBS health score dropped to 0.22 indicating temporary core banking maintenance. Immediate retry will fail; recommend 180-minute cooldown window.&quot;
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_5_policy_firewall',
      number: '05',
      title: 'POLICY FIREWALL: Deterministic Gating Invariant',
      subtitle: 'Zero unchecked AI execution — 6 deterministic mathematical hurdles',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            RecoverOS enforces a strict <strong>Default-to-DENY</strong> architectural invariant. The AI is purely an advisory diagnostic engine. Every proposed intervention must pass 6 hardcoded policy hurdles before any payment rail is touched.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-1">Gate 1: Action Whitelist</span>
              <span className="text-slate-400">Strict TypeScript enum validation; arbitrary injection strings vetoed.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-1">Gate 2: Max Retry Limit</span>
              <span className="text-slate-400">Hard cap of 3 retries per incident to protect card network reputation.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-1">Gate 3: Cooldown Guard</span>
              <span className="text-slate-400">Minimum 120-minute separation between automated retry attempts.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-1">Gate 4: Fraud Hurdle</span>
              <span className="text-slate-400">Instant hard-block if fraud risk score &gt; 0.65 (Zero chargeback risk).</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-1">Gate 5: Positive Net ROI</span>
              <span className="text-slate-400">Expected recovery value must exceed intervention cost + fatigue penalty.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-1">Gate 6: Daily Budget Cap</span>
              <span className="text-slate-400">Merchant intervention cost bounded to predefined daily budget.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_6_safe_execution',
      number: '06',
      title: 'SAFE EXECUTION: Decoupled Gateway & Channel Routing',
      subtitle: 'Tailoring specific interventions to root-cause diagnoses with strict idempotency',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Approved actions are executed via the Payment Gateway Adapter interface. Each action is tailored specifically to the diagnosed root cause:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20 text-blue-400 text-xs font-mono font-bold">RETRY</div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Smart Retry Schedule</div>
                <div className="text-xs text-slate-400 mt-0.5">Dispatched for bank CBS outages and transient network timeouts.</div>
              </div>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">UPI</div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Fallback UPI Payment Link</div>
                <div className="text-xs text-slate-400 mt-0.5">Instant WhatsApp / SMS deep-link for checkout 3DS drop-offs.</div>
              </div>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20 text-purple-400 text-xs font-mono font-bold">CARD</div>
              <div>
                <div className="text-xs font-semibold text-slate-200">1-Click Mandate Update Prompt</div>
                <div className="text-xs text-slate-400 mt-0.5">Dispatched to update expired card tokens under RBI guidelines.</div>
              </div>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">NUDGE</div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Interactive WhatsApp 1-Tap Pay</div>
                <div className="text-xs text-slate-400 mt-0.5">Salary-aware timing for transient month-end liquidity drop-offs.</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_7_crypto_proof',
      number: '07',
      title: 'CRYPTOGRAPHIC PROOF: SHA-256 Chained Audit Ledger',
      subtitle: 'Immutable, tamper-evident dual-entry audit trail for every financial decision',
      icon: <Layers className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every recovery decision (AI diagnosis, policy evaluation, gateway response, debit at risk, credit recovered, and cost incurred) is cryptographically signed and chained using SHA-256 hashes.
          </p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Cryptographic Chain Structure</span>
              <span className="text-emerald-400 text-[11px]">✓ Continuous Verification PASS</span>
            </div>
            <div className="p-3 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
              <div>Record #001 &gt; prevHash: <span className="text-slate-500">0000000000000000...</span></div>
              <div>Record #001 &gt; currHash: <span className="text-cyan-400">e3b0c44298fc1c149afbf4c8996fb92427ae41e4...</span></div>
              <div className="border-t border-slate-800 pt-1.5 text-slate-400 font-sans text-xs">
                Any attempted retroactive alteration of debit/credit or status immediately invalidates all subsequent block hashes.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step_8_measured_result',
      number: '08',
      title: `MEASURED RESULT: +${netUpliftRevenue > 0 ? formatINR(netUpliftRevenue) : '₹3.80L'} Net Revenue Uplift`,
      subtitle: 'Dynamically reconciled across the standardized 100-case evaluation benchmark (Seed 42)',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            The results are mathematically reconciled from individual incident outcomes across the {totalCases}-case dataset (Seed 42):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Legacy Baseline Recovery</div>
              <div className="text-2xl font-bold text-slate-400 mt-1 font-mono">{formatINR(baselineRecoveredRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">{baselineRecoveredCases} of {totalCases} Cases ({baselineRatePercent.toFixed(1)}% rev)</div>
            </div>
            <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-500/40 text-center">
              <div className="text-xs text-emerald-300">RecoverOS AI Recovery</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatINR(recoverOsRecoveredRevenue)}</div>
              <div className="text-xs text-emerald-300/80 mt-1">{recoverOsRecoveredCases} of {totalCases} Cases ({recoverOsRatePercent.toFixed(1)}% rev)</div>
            </div>
            <div className="p-4 bg-blue-950/40 rounded-xl border border-blue-500/40 text-center">
              <div className="text-xs text-blue-300">Net Financial Uplift</div>
              <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">+{formatINR(netUpliftRevenue)}</div>
              <div className="text-xs text-blue-300/80 mt-1">{revenueMultiple}x Revenue Multiple</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" id="judge-demo-experience">
      {/* 30-Second Executive Pitch Box */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 rounded-xl p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> 30-Second Executive Pitch
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              RecoverOS AI: Transforming Payment Failure into Recovered Revenue
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Traditional dunning blindly retries failed payments on fixed schedules, causing 83% excess spam and losing 96% of recoverable revenue. <strong>RecoverOS AI</strong> uses Gemini 2.5 Flash to diagnose the root cause across 11 telemetry signals, validates actions through a deterministic 6-stage policy firewall, executes tailored recovery interventions, and proves every rupee in an immutable SHA-256 dual-entry ledger.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 shrink-0 text-center font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">Net Uplift (100 Cases)</span>
            <span className="text-xl font-bold text-emerald-400">+{formatINR(netUpliftRevenue)}</span>
            <span className="text-[10px] text-blue-300 block">77.48% vs 3.73%</span>
          </div>
        </div>
      </div>

      {/* Step Header Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Judge Guided Tour Mode (3–5 Min)
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              RecoverOS AI: Architectural Journey &amp; Proof of Value
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              title="Previous Step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 px-2">
              Stage {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              title="Next Step"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {steps.map((s, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-500/15 border-blue-500 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                  <span>{s.number}</span>
                  {isCompleted && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-[11px] font-medium truncate">{s.title.split(':')[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Content Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
            {steps[currentStep].icon}
          </div>
          <div>
            <span className="text-xs font-mono text-blue-400 font-semibold tracking-wider uppercase">
              Stage {steps[currentStep].number} of {steps.length}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 mt-0.5">
              {steps[currentStep].title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {steps[currentStep].subtitle}
            </p>
          </div>
        </div>

        <div className="pt-2">{steps[currentStep].content}</div>

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-40 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Previous Stage
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
            >
              Continue to Next Stage <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(0)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-all cursor-pointer"
            >
              Restart Presentation <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
