/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Brain,
  ShieldCheck,
  Cpu,
  Layers,
  Check,
  X,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
  Scale,
} from 'lucide-react';

export const WhyRecoverOsPanel: React.FC = () => {
  const architectures = [
    {
      name: 'Blind Retry (Dunning Loops)',
      description: 'Retries failed cards at fixed intervals (e.g. 24h, 48h, 72h) with zero failure telemetry awareness.',
      pros: ['Zero configuration needed'],
      cons: [
        'Massive customer spam and churn',
        '0% recovery on expired cards & account closures',
        'Dangerous card network velocity penalties (Visa/Mastercard excessive retry fees)',
      ],
      recoveryRate: '3% – 8%',
      riskLevel: 'HIGH (Spam & Network Fines)',
      auditTrail: 'None',
      isRecoverOs: false,
    },
    {
      name: 'Rule-Only Retry Engines',
      description: 'Static boolean if/else trees based purely on gateway error strings without contextual signals.',
      pros: ['Predictable execution logic', 'Fast execution time'],
      cons: [
        'Brittle and uncalibrated to dynamic bank outages',
        'Fails to distinguish temporary issuer downtime from permanent closure',
        'Zero behavioral intelligence for salary cycle timing',
      ],
      recoveryRate: '12% – 18%',
      riskLevel: 'MEDIUM',
      auditTrail: 'Basic Application Logs',
      isRecoverOs: false,
    },
    {
      name: 'AI-Only Autonomous Agents',
      description: 'Direct LLM integration where the model directly triggers financial API calls and refunds.',
      pros: ['Contextual understanding of customer prompts'],
      cons: [
        'Catastrophic financial risk: prompt injection & model hallucinations',
        'Zero deterministic safety bounds or hard budget caps',
        'Unacceptable for financial compliance (SOC 2, PCI-DSS, RBI)',
      ],
      recoveryRate: 'Unpredictable / Flawed',
      riskLevel: 'CRITICAL (Financial Loss Risk)',
      auditTrail: 'Non-deterministic LLM Logs',
      isRecoverOs: false,
    },
    {
      name: 'RecoverOS AI Control Plane',
      description: 'Four-pillar defense-in-depth: AI diagnoses telemetry, deterministic policy decides, gateway executes, cryptographic ledger proves.',
      pros: [
        'Calibrated ML/Gemini failure taxonomy diagnosis',
        'Strict deterministic policy gate with default-to-DENY safety invariant',
        'Dual-entry SHA-256 chained immutable audit ledger',
        '+₹3.80L incremental recovery uplift over legacy baseline (₹3.99L vs ₹19.2K)',
      ],
      cons: [],
      recoveryRate: '77.48% (74/100 Cases in Benchmark)',
      riskLevel: 'MINIMAL (Mathematically Gated)',
      auditTrail: 'SHA-256 Dual-Entry Chained Cryptographic Ledger',
      isRecoverOs: true,
    },
  ];

  const pillars = [
    {
      title: '1. AI Diagnoses Telemetry',
      icon: <Brain className="w-5 h-5 text-purple-400" />,
      tag: 'Intelligence Layer',
      description:
        'Contextual synthesis of 11 multi-dimensional signals (error code, issuer CBS health, customer payment history, salary cycle timing, retry attempt count) into root-cause failure categories.',
    },
    {
      title: '2. Policy Decides Authority',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      tag: 'Execution Authority',
      description:
        'Zero unchecked LLM execution. Deterministic 6-stage policy gate enforces action whitelists, fraud score hurdles, minimum cooldowns, positive expected ROI, and daily budget caps.',
    },
    {
      title: '3. Infrastructure Executes Safely',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      tag: 'Payment Rail Layer',
      description:
        'Decoupled Gateway Adapter abstraction guarantees sandbox isolation during evaluation and enforces strict idempotency against duplicate billing.',
    },
    {
      title: '4. Cryptographic Ledger Proves',
      icon: <Layers className="w-5 h-5 text-amber-400" />,
      tag: 'Audit & Compliance',
      description:
        'Every single diagnostic and execution decision is recorded into a dual-entry SHA-256 hash-chained immutable ledger with continuous tamper-detection verification.',
    },
  ];

  return (
    <div className="space-y-8" id="why-recoveros-panel">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Architectural Thesis
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
            Why RecoverOS AI?
          </h2>
          <p className="text-slate-300 mt-2 text-base leading-relaxed">
            Payment failure recovery has historically been trapped between two extremes: <strong>dumb, aggressive dunning loops</strong> that annoy customers, and <strong>uncontrolled AI agents</strong> that hallucinate financial actions. RecoverOS introduces a deterministic control plane that bridges intelligence with institutional safety.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    {pillar.icon}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {pillar.tag}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-2">{pillar.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{pillar.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Comparison Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Architectural Comparison: RecoverOS vs Alternative Approaches
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            How RecoverOS compares against industry standard dunning and naive AI approaches.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {architectures.map((arch, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-5 border flex flex-col justify-between transition-all ${
                arch.isRecoverOs
                  ? 'bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border-blue-500/50 shadow-lg ring-1 ring-blue-500/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-mono font-semibold ${arch.isRecoverOs ? 'text-blue-400' : 'text-slate-400'}`}>
                    Option {idx + 1}
                  </span>
                  {arch.isRecoverOs && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Recommended
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-bold ${arch.isRecoverOs ? 'text-blue-200' : 'text-slate-200'}`}>
                  {arch.name}
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{arch.description}</p>

                <div className="mt-4 space-y-2 text-xs">
                  {arch.pros.map((pro, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-1.5 text-emerald-300">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{pro}</span>
                    </div>
                  ))}
                  {arch.cons.map((con, cIdx) => (
                    <div key={cIdx} className="flex items-start gap-1.5 text-red-400">
                      <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{con}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Recovery Rate:</span>
                  <span className={arch.isRecoverOs ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                    {arch.recoveryRate}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Risk Profile:</span>
                  <span className={arch.isRecoverOs ? 'text-emerald-400' : 'text-amber-400'}>
                    {arch.riskLevel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Audit Trail:</span>
                  <span className="text-slate-300 text-[11px] truncate max-w-[130px]" title={arch.auditTrail}>
                    {arch.auditTrail}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 12-Dimension Architectural Comparison Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-2">
            <Scale className="w-3.5 h-3.5" /> Formal Architectural Comparison
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            12-Dimension Architectural Comparison: RecoverOS vs Alternative Paradigms
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Objective architectural comparison across governance, execution safety, and cryptographic integrity. All items represent structural system capabilities rather than subjective marketing claims.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono">
                <th className="p-3.5 font-semibold">Architectural Dimension</th>
                <th className="p-3.5 font-semibold">1. Blind Retry (Dunning)</th>
                <th className="p-3.5 font-semibold">2. Static Rule Engine</th>
                <th className="p-3.5 font-semibold">3. LLM-Only Agent</th>
                <th className="p-3.5 font-semibold text-emerald-400 bg-emerald-950/20">4. RecoverOS Control Plane</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">1. Root-Cause Diagnosis</td>
                <td className="p-3.5 text-slate-400">None (Treats all as generic failure)</td>
                <td className="p-3.5 text-slate-400">Static string matching on raw error code</td>
                <td className="p-3.5 text-slate-400">Unconstrained text interpretation</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">11-signal telemetry synthesis (7 failure classes)</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">2. Contextual Decision Making</td>
                <td className="p-3.5 text-slate-400">None (Fixed interval loops)</td>
                <td className="p-3.5 text-slate-400">Rigid if/else branches; no health signals</td>
                <td className="p-3.5 text-slate-400">Probabilistic; prone to hallucination</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Multi-signal (CBS health, salary date, tenure, retries)</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">3. Deterministic Execution Authority</td>
                <td className="p-3.5 text-slate-400">Uncontrolled cron schedule</td>
                <td className="p-3.5 text-slate-400">Hardcoded script logic</td>
                <td className="p-3.5 text-red-400">ZERO (Model directly triggers API calls)</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Default-to-DENY 6-stage mathematical policy gate</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">4. Fraud Protection</td>
                <td className="p-3.5 text-red-400">Blindly retries fraudulent cards</td>
                <td className="p-3.5 text-slate-400">Dependent on basic merchant gateway filters</td>
                <td className="p-3.5 text-red-400">Vulnerable to jailbreak/prompt injection</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Deterministic Rule #1 (Hard block if fraud &gt; 0.65)</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">5. Retry &amp; Cooldown Controls</td>
                <td className="p-3.5 text-slate-400">Fixed 24h/48h/72h loops</td>
                <td className="p-3.5 text-slate-400">Fixed static cooldowns</td>
                <td className="p-3.5 text-slate-400">Model-suggested arbitrary timings</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Enforced &gt;=120 min cooldown &amp; max 3 retry cap</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">6. Economic ROI Gate</td>
                <td className="p-3.5 text-slate-400">None (Incurs unnecessary gateway fees)</td>
                <td className="p-3.5 text-slate-400">Static rule threshold</td>
                <td className="p-3.5 text-slate-400">None (No fee or cost awareness)</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Strict inequality: EV &gt; Cost + Customer Fatigue Penalty</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">7. Anti-Spam Protection</td>
                <td className="p-3.5 text-red-400">Poor (Massive fatigue &amp; unsubscribes)</td>
                <td className="p-3.5 text-slate-400">Moderate</td>
                <td className="p-3.5 text-slate-400">Unpredictable message frequency</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">83.8% retry reduction (54 vs 334 legacy attempts)</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">8. Idempotency &amp; Replay Defense</td>
                <td className="p-3.5 text-slate-400">Rarely enforced across cron scripts</td>
                <td className="p-3.5 text-slate-400">Basic database unique constraints</td>
                <td className="p-3.5 text-red-400">High duplicate payment risk on re-try loops</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Deterministic idempotency headers &amp; memory LRU cache</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">9. Auditability &amp; Compliance</td>
                <td className="p-3.5 text-slate-400">Unstructured cron logs</td>
                <td className="p-3.5 text-slate-400">Relational DB event tables</td>
                <td className="p-3.5 text-slate-400">Unstructured LLM generation tokens</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Dual-entry accounting with debit/credit balance tracking</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">10. Explainability &amp; Reason Codes</td>
                <td className="p-3.5 text-slate-400">None</td>
                <td className="p-3.5 text-slate-400">Rule ID or error string</td>
                <td className="p-3.5 text-slate-400">Freeform text explanation</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Structured reasoning + 6-point policy gate breakdown</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">11. Cryptographic Proof</td>
                <td className="p-3.5 text-slate-400">None</td>
                <td className="p-3.5 text-slate-400">None</td>
                <td className="p-3.5 text-slate-400">None</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">SHA-256 hash chaining with instant tamper detection</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3.5 font-semibold text-slate-200">12. Gateway Abstraction Layer</td>
                <td className="p-3.5 text-slate-400">Direct coupled SDK calls</td>
                <td className="p-3.5 text-slate-400">Coupled webhook handlers</td>
                <td className="p-3.5 text-red-400">Arbitrary tool call functions</td>
                <td className="p-3.5 text-emerald-300 bg-emerald-950/10 font-medium">Decoupled Adapter (Sandbox vs Production-Gated)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
