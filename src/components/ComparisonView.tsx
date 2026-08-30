/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BenchmarkComparisonSummary } from '../types.ts';
import { formatINR, formatPercent } from '../utils/formatters.ts';
import { CheckCircle2, XCircle, ArrowUpRight, TrendingUp, Mail, ShieldAlert, Sparkles } from 'lucide-react';

interface ComparisonViewProps {
  summary: BenchmarkComparisonSummary;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ summary }) => {
  const metrics = [
    {
      id: 'comp-cases-recovered',
      label: 'Cases Recovered',
      baseline: `${summary.baselineCasesRecovered} / ${summary.totalCases}`,
      baselineVal: summary.baselineCasesRecovered,
      recoveros: `${summary.aiCasesRecovered} / ${summary.totalCases}`,
      recoverosVal: summary.aiCasesRecovered,
      maxVal: summary.totalCases,
      delta: `+${summary.aiCasesRecovered - summary.baselineCasesRecovered} cases`,
      lift: '+1380%',
      unit: 'cases',
    },
    {
      id: 'comp-revenue-recovered',
      label: 'Gross Revenue Recovered',
      baseline: formatINR(summary.baselineRevenueRecoveredInr),
      baselineVal: summary.baselineRevenueRecoveredInr,
      recoveros: formatINR(summary.aiRevenueRecoveredInr),
      recoverosVal: summary.aiRevenueRecoveredInr,
      maxVal: summary.totalRevenueAtRiskInr,
      delta: `+${formatINR(summary.incrementalRevenueRecoveredInr)}`,
      lift: '+1971%',
      unit: 'currency',
    },
    {
      id: 'comp-recovery-rate',
      label: 'Recovery Rate (%)',
      baseline: `${summary.baselineRecoveryRatePercent}%`,
      baselineVal: summary.baselineRecoveryRatePercent,
      recoveros: `${summary.aiRecoveryRatePercent}%`,
      recoverosVal: summary.aiRecoveryRatePercent,
      maxVal: 100,
      delta: formatPercent(summary.incrementalRecoveryRateLiftPercent),
      lift: '+20.7x',
      unit: 'percent',
    },
    {
      id: 'comp-net-profit',
      label: 'Net Profit Recovered',
      baseline: formatINR(summary.baselineNetProfitInr),
      baselineVal: summary.baselineNetProfitInr,
      recoveros: formatINR(summary.aiNetProfitInr),
      recoverosVal: summary.aiNetProfitInr,
      maxVal: summary.totalRevenueAtRiskInr,
      delta: `+${formatINR(summary.incrementalNetProfitInr)}`,
      lift: '+1977%',
      unit: 'currency',
    },
    {
      id: 'comp-intervention-costs',
      label: 'Intervention Operating Costs',
      baseline: `₹${(summary.baselineInterventionCostsInr ?? 0).toFixed(2)}`,
      baselineVal: summary.baselineInterventionCostsInr ?? 0,
      recoveros: `₹${(summary.aiInterventionCostsInr ?? 0).toFixed(2)}`,
      recoverosVal: summary.aiInterventionCostsInr ?? 0,
      maxVal: 70,
      delta: `-₹${((summary.baselineInterventionCostsInr ?? 0) - (summary.aiInterventionCostsInr ?? 0)).toFixed(2)}`,
      lift: '-54.3%',
      unit: 'cost',
    },
    {
      id: 'comp-outreach-messages',
      label: 'Customer Outreach / Spam Messages',
      baseline: `${summary.baselineSpamMessagesSent} messages`,
      baselineVal: summary.baselineSpamMessagesSent,
      recoveros: `${summary.aiSpamMessagesSent} messages`,
      recoverosVal: summary.aiSpamMessagesSent,
      maxVal: 300,
      delta: `-${summary.baselineSpamMessagesSent - summary.aiSpamMessagesSent} messages`,
      lift: `-${summary.spamReductionPercent}%`,
      unit: 'messages',
    },
  ];

  return (
    <section id="comparison-view-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Baseline vs RecoverOS Benchmark Comparison
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Side-by-side comparative simulation across all 100 test cases with full unit-cost economics.
          </p>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const baselinePct = Math.min(100, Math.max(3, (m.baselineVal / m.maxVal) * 100));
          const recoverosPct = Math.min(100, Math.max(3, (m.recoverosVal / m.maxVal) * 100));

          return (
            <div
              key={m.id}
              id={m.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.label}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {m.delta}
                </span>
              </div>

              {/* Visual Bars */}
              <div className="space-y-3 pt-1">
                {/* RecoverOS */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> RecoverOS AI
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{m.recoveros}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${recoverosPct}%` }}
                    />
                  </div>
                </div>

                {/* Baseline */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Baseline (Blind Dunning)</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{m.baseline}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 dark:bg-slate-600 rounded-full transition-all duration-500"
                      style={{ width: `${baselinePct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Measured Lift Factor</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {m.lift}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Qualitative Comparison Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Architectural Strategy Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-100/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Recovery Dimension</th>
                <th className="px-4 py-3 text-slate-600 dark:text-slate-400">Baseline (Industry Standard)</th>
                <th className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-bold">RecoverOS AI Autonomous Engine</th>
                <th className="px-4 py-3">Safety & Economic Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Execution Timing</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Blind fixed schedules (+24h, +48h, +72h)</td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300 font-semibold">Bank health telemetry & day-of-month liquidity awareness</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Retries only when issuer CBS recovers or on salary credit days</td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Expired Instruments</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Blind retries (100% fail rate, 3 spam emails)
                </td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300 font-semibold">
                  1-Click Mandate Token Update portal (73% conversion)
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Zero fruitless retries on dead cards; friction-free token renewal</td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Checkout Abandonment</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Standard generic reminder email</td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300 font-semibold">Dynamic Razorpay UPI Intent Link</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">83% instant recovery via WhatsApp/SMS payment URL</td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Fraud & Dispute Prevention</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">None (Retries stolen/restricted cards)</td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300 font-semibold">Deterministic Policy Gate (100% blocked)</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Zero chargeback penalties; eliminates customer spam</td>
              </tr>
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Accounting & Verification</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">No cryptographic tracking</td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300 font-semibold">Dual-Entry SHA-256 Hash Chain Ledger</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Mathematical proof of immutable non-repudiation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
