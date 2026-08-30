/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Radio, 
  Sparkles, 
  ShieldAlert, 
  CreditCard, 
  SendHorizontal, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Lock,
  Cpu
} from 'lucide-react';

export const SafetyArchitectureFlow: React.FC = () => {
  return (
    <div id="safety-architecture-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-28 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Safety Architecture & Execution Gating Flow
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict Separation of Intelligence and Execution Authority in Autonomous Recovery
          </p>
        </div>

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>&ldquo;AI diagnoses. Policy decides. Infrastructure executes. Cryptographic Ledger proves.&rdquo;</span>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
        {/* Step 1: Telemetry */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span>01. Ingestion</span>
              <Radio className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">Webhook Telemetry</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Error code, bank health score, customer tenure &amp; payment method.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-sky-400 font-medium">
            18 Raw Signals
          </div>
        </div>

        {/* Step 2: AI Diagnosis */}
        <div className="bg-slate-950/70 border border-purple-900/40 rounded-lg p-3 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1.5">
              <span>02. Diagnosis</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">Gemini AI / Fallback</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Root-cause failure classification &amp; recovery strategy recommendation.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-purple-400 font-medium">
            Advisory Only (No Auth)
          </div>
        </div>

        {/* Step 3: Policy Engine */}
        <div className="bg-slate-950/70 border border-amber-900/40 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
              <span>03. Safety Gate</span>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">Deterministic Policy</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Evaluates 6 hard guardrails (Fraud, Max Retries, Cooldown, Whitelist).
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-amber-400 font-medium">
            Hard Authorization Hurdle
          </div>
        </div>

        {/* Step 4: Decision Fork */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span>04. Gating Verdict</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">Approved vs Blocked</div>
            <div className="mt-1 space-y-1 text-[11px]">
              <div className="flex items-center text-emerald-400 font-semibold space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>YES → Sandbox Execute</span>
              </div>
              <div className="flex items-center text-rose-400 font-semibold space-x-1">
                <XCircle className="w-3 h-3" />
                <span>NO → Block &amp; Audit</span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
            Zero Money Moved if Denied
          </div>
        </div>

        {/* Step 5: Sandbox Execution */}
        <div className="bg-slate-950/70 border border-emerald-900/40 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
              <span>05. Execution</span>
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">Razorpay Sandbox</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Simulated payment capture with idempotency guards &amp; cost tracking.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-emerald-400 font-medium">
            Simulated / Sandbox
          </div>
        </div>

        {/* Step 6: Cryptographic Ledger */}
        <div className="bg-slate-950/70 border border-sky-900/40 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-1.5">
              <span>06. Cryptography</span>
              <Database className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">SHA-256 Audit Ledger</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Immutable double-entry chain with block hashes &amp; tamper verification.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-sky-400 font-medium">
            Dual-Entry Ledger
          </div>
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-4 bg-slate-950/80 rounded-lg px-3.5 py-2.5 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Autonomous Safety Guarantee:</strong> LLM/Gemini models have 
            <span className="text-rose-400 font-semibold"> zero direct payment execution authority</span>. All recovery actions must pass deterministic policy validation prior to sandbox dispatch.
          </span>
        </div>
        <span className="font-mono text-slate-400 text-[10px] bg-slate-800 px-2 py-0.5 rounded">
          Idempotency: SHA-256 Gated
        </span>
      </div>
    </div>
  );
};
