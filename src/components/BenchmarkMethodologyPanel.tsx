/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BookOpen, 
  Layers, 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Coins, 
  ShieldCheck, 
  AlertCircle,
  Database,
  Sliders
} from 'lucide-react';
import { BenchmarkComparisonSummary } from '../types.ts';

interface BenchmarkMethodologyPanelProps {
  summary: BenchmarkComparisonSummary;
}

export const BenchmarkMethodologyPanel: React.FC<BenchmarkMethodologyPanelProps> = ({ summary }) => {
  // Dynamically compute cost delta
  const costSavingsInr = summary.baselineInterventionCostsInr - summary.aiInterventionCostsInr;

  return (
    <div id="benchmark-methodology-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Benchmark Methodology &amp; Comparative Evaluation
            </h3>
            <p className="text-xs text-slate-400">
              Rigorous, reproducible comparison between standard dumb dunning and contextual AI recovery.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded-md">
            Seed 42 • 100 Synthesized Incidents
          </span>
        </div>
      </div>

      {/* Dataset & Comparison Methodology Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dataset Methodology */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Synthetic Dataset Design</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">•</span>
              <span><strong>100 deterministic cases</strong> generated using Mulberry32 PRNG (Seed 42).</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">•</span>
              <span><strong>6 realistic failure categories</strong>: Temporary Issuer Outage (24), Insufficient Funds (28), Expired Instrument (15), Auth Abandonment (18), Fraud Suspicion (10), Gateway Timeout (5).</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">•</span>
              <span><strong>18 raw telemetry attributes</strong> per case including bank health score, hour-of-day, customer tenure, error code, and method.</span>
            </li>
          </ul>
        </div>

        {/* Comparison Approach */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Evaluation Comparison Models</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <span className="font-bold text-rose-300">Standard Dunning (Baseline): </span>
              <span className="text-slate-300">
                Blind 24h/48h/72h fixed schedule retry loop with repetitive SMS/email blasts regardless of root failure cause.
              </span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <span className="font-bold text-emerald-300">RecoverOS AI Engine: </span>
              <span className="text-slate-300">
                Contextual root-cause AI diagnosis + 6 deterministic policy gates + targeted channel recovery with zero blind retries on dead cards.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Measured Benchmark Results Grid (Read strictly from summary props) */}
      <div>
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Actual Measured Benchmark Outcomes</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Baseline Recovered */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-slate-400">Baseline Recovered</div>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
              {summary.baselineCasesRecovered} / {summary.totalCasesEvaluated}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              ₹{summary.baselineRevenueRecoveredInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Rate: {(summary.baselineRecoveryRatePercent ?? 0).toFixed(2)}%
            </div>
          </div>

          {/* RecoverOS Recovered */}
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-400">RecoverOS Recovered</div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">
              {summary.aiCasesRecovered} / {summary.totalCasesEvaluated}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
              ₹{(summary.aiRevenueRecoveredInr ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-300 mt-1">
              Rate: {(summary.aiRecoveryRatePercent ?? 0).toFixed(2)}%
            </div>
          </div>

          {/* Incremental Revenue */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-sky-400">Incremental Revenue</div>
            <div className="text-lg font-bold text-sky-300 font-mono mt-0.5">
              +₹{(summary.incrementalRevenueRecoveredInr ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Net Profit: +₹{(summary.incrementalNetProfitInr ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Recovery Rate Lift */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-purple-400">Recovery Rate Lift</div>
            <div className="text-lg font-bold text-purple-300 font-mono mt-0.5">
              +{(summary.incrementalRecoveryRateLiftPercent ?? 0).toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Percentage point gain
            </div>
          </div>

          {/* Spam Reduction */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-amber-400">Spam Reduction</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
              {(summary.spamReductionPercent ?? 0).toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {summary.aiSpamMessagesSent} vs {summary.baselineSpamMessagesSent} msgs
            </div>
          </div>

          {/* Intervention Cost Difference */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Cost Savings</div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">
              ₹{(costSavingsInr ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              ₹{(summary.aiInterventionCostsInr ?? 0).toFixed(2)} vs ₹{(summary.baselineInterventionCostsInr ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
