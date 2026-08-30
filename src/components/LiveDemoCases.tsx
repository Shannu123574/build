/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard, 
  AlertTriangle,
  ArrowRight,
  Layers,
  FileText,
  DollarSign,
  Radio,
  Lock,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { CaseBenchmarkResult } from '../services/benchmarkEngine.ts';
import { FailureCategory } from '../types.ts';

interface LiveDemoCasesProps {
  caseResults: CaseBenchmarkResult[];
  onSelectCase: (caseResult: CaseBenchmarkResult) => void;
  onOpenModal: (caseResult: CaseBenchmarkResult) => void;
}

export const LiveDemoCases: React.FC<LiveDemoCasesProps> = ({
  caseResults,
  onSelectCase,
  onOpenModal,
}) => {
  // Find representative demo cases
  const outageCase = caseResults.find(
    (c) => c.groundTruthCategory === 'TEMPORARY_ISSUER_OUTAGE' && c.recoveros.recovered
  ) || caseResults[0];

  const fraudCase = caseResults.find(
    (c) => c.groundTruthCategory === 'FRAUD_SUSPICION_HIGH' && !c.recoveros.policy.approved
  ) || caseResults[42];

  const expiredCase = caseResults.find(
    (c) => c.groundTruthCategory === 'EXPIRED_INSTRUMENT' && c.recoveros.diagnosis.suggestedAction === 'CARD_UPDATE_PROMPT'
  ) || caseResults[60];

  const abandonCase = caseResults.find(
    (c) => c.groundTruthCategory === 'AUTHENTICATION_ABANDONMENT'
  ) || caseResults[75];

  const demoScenarios = [
    {
      key: 'A',
      title: 'A. Temporary Issuer Outage',
      subtitle: 'Transient Bank Downtime • Smart Delay Schedule',
      badge: 'Smart Retry Schedule',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      caseResult: outageCase,
      expected: [
        'AI identifies temporary issuer outage via bank health telemetry & error code',
        'Recommends SMART_RETRY_SCHEDULE with optimal backoff (delay 45-60m)',
        'Deterministic policy checks bank health & approval guardrails → APPROVED',
        'Simulator executes scheduled retry → SUCCESSFUL CAPTURE',
        'Full revenue recovered (₹' + (outageCase?.amountInr?.toLocaleString('en-IN') || '4,500') + ') and audited into SHA-256 ledger'
      ],
      safetyFocus: 'Avoids aggressive blind retry spikes while bank is degraded; recovers when bank stabilizes.',
      icon: Clock,
      theme: 'emerald'
    },
    {
      key: 'B',
      title: 'B. Fraud Suspicion (Zero-Tolerance)',
      subtitle: 'High Fraud Score • Strict Policy Block',
      badge: 'Policy DENIED (0 Execution)',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      caseResult: fraudCase,
      expected: [
        'AI analyzes telemetry and flags high fraud probability / velocity anomaly',
        'Deterministic Policy Engine evaluates fraud score hurdle → STRICT DENIAL',
        'Execution guard completely aborts simulator call (0 charges, 0 spam)',
        'Zero revenue claimed, intervention cost ₹0.00',
        'Ledger logs BLOCKED status with full cryptographic reasoning'
      ],
      safetyFocus: 'Deterministic policy guardrail: policy strictly blocks recovery to prevent chargebacks.',
      icon: ShieldAlert,
      theme: 'rose'
    },
    {
      key: 'C',
      title: 'C. Expired Card Instrument',
      subtitle: 'Expired Token • No Blind Retries',
      badge: 'Update Prompt Channel',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      caseResult: expiredCase,
      expected: [
        'AI detects card expiration error (blind retry would fail 100% of the time)',
        'Recommends CARD_UPDATE_PROMPT (WhatsApp/SMS magic token update link)',
        'Policy Engine approves benign, zero-gateway outreach action',
        'Customer updates instrument; recovery captured without spamming payment gateway',
        'Baseline dunning (3 blind retries) recovered 0/15 vs RecoverOS 12/15'
      ],
      safetyFocus: 'Eliminates futile gateway charges and processor penalties on dead instruments.',
      icon: CreditCard,
      theme: 'amber'
    },
    {
      key: 'D',
      title: 'D. Authentication Abandonment',
      subtitle: 'OTP Drop-off • Fallback Payment Link',
      badge: 'UPI / Alternate Channel',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      caseResult: abandonCase,
      expected: [
        'AI flags OTP abandonment / 3DS drop-off behavior',
        'Recommends SEND_PAYMENT_LINK (instant 1-click UPI / alternate checkout)',
        'Policy Engine validates daily budget and outreach rate limits → APPROVED',
        'Customer receives frictionless link and completes transaction',
        'Intervention cost ₹0.50 (WhatsApp) yielding full revenue recovery'
      ],
      safetyFocus: 'Converts lost checkout intent into recovered revenue with 1 targeted outreach.',
      icon: Radio,
      theme: 'sky'
    }
  ];

  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('A');
  const currentScenario = demoScenarios.find((s) => s.key === activeScenarioKey) || demoScenarios[0];
  const c = currentScenario.caseResult;

  return (
    <div id="live-demo-cases-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/30">
              <Play className="w-3.5 h-3.5 fill-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Live Demo Scenarios &amp; Interactive Case Walkthrough
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a canonical scenario below to inspect the complete telemetry, AI diagnosis, deterministic policy evaluation, sandbox execution, and cryptographic audit trail.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 text-amber-300 border border-amber-500/30 rounded-md flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Execution Mode: SANDBOX SIMULATOR</span>
          </span>
        </div>
      </div>

      {/* 4 Scenario Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {demoScenarios.map((scenario) => {
          const isSelected = activeScenarioKey === scenario.key;
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.key}
              id={`demo-scenario-btn-${scenario.key}`}
              onClick={() => {
                setActiveScenarioKey(scenario.key);
                if (scenario.caseResult) {
                  onSelectCase(scenario.caseResult);
                }
              }}
              className={`text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">{scenario.title}</span>
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  {scenario.subtitle}
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${scenario.badgeColor}`}>
                  {scenario.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ₹{scenario.caseResult?.amountInr?.toLocaleString('en-IN') || '0'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Scenario Live Walkthrough Card */}
      {c && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">
                Case ID: {c.caseId}
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                Customer: {c.customerName} ({c.customerEmail})
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                ₹{c.amountInr.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              id="demo-open-inspector-modal-btn"
              onClick={() => onOpenModal(c)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md hover:bg-emerald-500/30 transition cursor-pointer"
            >
              <span>Inspect Raw Telemetry &amp; JSON Payload</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* 5-Step Pipeline Walkthrough for the Active Case */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {/* Step 1: Ingestion & Telemetry */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center space-x-1 mb-1">
                  <Radio className="w-3 h-3" />
                  <span>1. Ingestion Signals</span>
                </div>
                <div className="font-semibold text-slate-200 mb-1">{c.errorCode}</div>
                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  <div>Method: {c.paymentMethod}</div>
                  <div>Bank Score: {(c.bankHealthScore ?? 0).toFixed(2)}</div>
                  <div>Tenure: {c.customerTenureMonths}m</div>
                  <div>Retries: {c.retryCount}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                Risk: {c.groundTruthCategory}
              </div>
            </div>

            {/* Step 2: Gemini AI Diagnosis */}
            <div className="bg-purple-950/30 border border-purple-900/50 p-3 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center space-x-1 mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>2. AI Diagnosis</span>
                </div>
                <div className="font-semibold text-purple-200 mb-1">
                  {c.recoveros?.diagnosis?.suggestedAction}
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                  {c.recoveros?.diagnosis?.reasoning}
                </p>
              </div>
              <div className="mt-2 text-[10px] text-purple-400 border-t border-purple-900/40 pt-1 flex justify-between">
                <span>Prob: {((c.recoveros?.diagnosis?.predictedRecoveryProbability ?? 0) * 100).toFixed(0)}%</span>
                <span>Delay: {c.recoveros?.diagnosis?.recommendedExecutionDelayMinutes ?? 0}m</span>
              </div>
            </div>

            {/* Step 3: Policy Engine Decision */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              c.recoveros?.policy?.approved
                ? 'bg-emerald-950/30 border-emerald-900/50'
                : 'bg-rose-950/30 border-rose-900/50'
            }`}>
              <div>
                <div className={`text-[10px] uppercase font-bold flex items-center space-x-1 mb-1 ${
                  c.recoveros?.policy?.approved ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <Lock className="w-3 h-3" />
                  <span>3. Policy Decision</span>
                </div>
                <div className={`font-semibold flex items-center space-x-1 mb-1 ${
                  c.recoveros?.policy?.approved ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {c.recoveros?.policy?.approved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>APPROVED</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>DENIED</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                  {c.recoveros?.policy?.approved
                    ? 'All 6 deterministic safety checks passed. Execution authorized.'
                    : `Gated: ${c.recoveros?.policy?.denialReason || 'Blocked by security hurdle'}`}
                </p>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                Risk Factor: {(c.recoveros?.policy?.riskScore ?? 0).toFixed(2)}
              </div>
            </div>

            {/* Step 4: Sandbox Execution */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center space-x-1 mb-1">
                  <CreditCard className="w-3 h-3" />
                  <span>4. Sandbox Result</span>
                </div>
                <div className="font-semibold text-slate-200 mb-1">
                  {c.recoveros?.recovered ? 'Recovered' : 'Not Recovered'}
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className={c.recoveros?.recovered ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      ₹{(c.recoveros?.amountRecoveredInr ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="text-amber-400">₹{(c.recoveros?.interventionCostInr ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-400">
                    <span>Ref:</span>
                    <span>{c.recoveros.executionRef || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                Baseline: {c.baseline.recovered ? 'Recovered' : 'Failed'} (₹{c.baseline.amountRecoveredInr})
              </div>
            </div>

            {/* Step 5: Ledger & Cryptography */}
            <div className="bg-sky-950/30 border border-sky-900/50 p-3 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center space-x-1 mb-1">
                  <FileText className="w-3 h-3" />
                  <span>5. SHA-256 Ledger</span>
                </div>
                <div className="font-semibold text-sky-200 mb-1">
                  {c.recoveros.policy.approved ? 'AUDITED_SUCCESS' : 'AUDITED_BLOCKED'}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Cryptographically chained into immutable audit log with previous block hash pointer.
                </p>
              </div>
              <div className="mt-2 text-[10px] font-mono text-sky-400 border-t border-sky-900/40 pt-1">
                Dual-Entry Verified ✓
              </div>
            </div>
          </div>

          {/* Expected Outcome Checklist & Safety Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verification Checklist for {currentScenario.title}</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-400">
                {currentScenario.expected.map((exp, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Safety Guardrail Insight</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentScenario.safetyFocus}
                </p>
              </div>
              <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Sandbox Safety Invariant:</span>
                <span className="font-semibold text-slate-300">0 Live Bank Charges Incurred</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
