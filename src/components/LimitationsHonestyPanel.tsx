/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  AlertTriangle, 
  Info, 
  ShieldCheck, 
  CheckCircle2, 
  Terminal, 
  FileCode2,
  Lock
} from 'lucide-react';

export const LimitationsHonestyPanel: React.FC = () => {
  return (
    <div id="limitations-honesty-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              System Scope, Technical Limitations &amp; Evaluation Honesty
            </h3>
            <p className="text-xs text-slate-400">
              Clear disclosure of sandbox boundaries, synthetic benchmark constraints, and simulation safety.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30 rounded-md">
            Simulation Environment
          </span>
        </div>
      </div>

      {/* 6 Key Disclosure Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {/* Point 1: Simulated Execution */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>1. Simulated Execution Environment</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            All payment captures, retries, and channel dispatches are executed within a local Razorpay sandbox simulator. No real money or bank accounts are touched.
          </p>
        </div>

        {/* Point 2: Synthetic Dataset */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>2. Deterministic Synthetic Dataset</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            The 100 benchmark cases are mathematically generated (Mulberry32 PRNG, Seed 42) based on real-world merchant failure profiles for reproducibility.
          </p>
        </div>

        {/* Point 3: Fallback Intelligence */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>3. Zero-Downtime Deterministic Fallback</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            When live Gemini API keys or network routes are unavailable, the engine automatically invokes an embedded rule-based classifier without pipeline disruption.
          </p>
        </div>

        {/* Point 4: Webhook Integration */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full text-slate-400 bg-slate-500" />
            <span>4. Webhook Mode</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Production Razorpay live webhook credentials and live merchant gateway routing are intentionally bypassed in favor of local sandbox idempotency testing.
          </p>
        </div>

        {/* Point 5: Zero Autonomous Moving of Money */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>5. No Autonomous Financial Authority</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Gemini outputs are strictly treated as advisory proposals. All executions require authorization by the deterministic Policy Engine.
          </p>
        </div>

        {/* Point 6: Benchmark Scope */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>6. Synthetic Evaluation Scope</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Reported metrics reflect empirical performance on the 100-case synthetic dataset and should not be cited as guaranteed real-world production results.
          </p>
        </div>
      </div>
    </div>
  );
};
