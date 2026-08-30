/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BenchmarkComparisonSummary } from '../types.ts';
import { formatINR, formatPercent } from '../utils/formatters.ts';
import { TrendingUp, ArrowUpRight, CheckCircle2, ShieldCheck, MailMinus, Flame } from 'lucide-react';

interface BenchmarkHeadlineProps {
  summary: BenchmarkComparisonSummary;
}

export const BenchmarkHeadline: React.FC<BenchmarkHeadlineProps> = ({ summary }) => {
  return (
    <div
      id="benchmark-headline-banner"
      className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 text-white shadow-xl shadow-slate-950/40 relative overflow-hidden"
    >
      {/* Background visual accents */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left column: Strategic title & measured summary */}
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>Measured Benchmark Verification (100 Synthetic Cases)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Contextual AI vs Blind Dunning Benchmark
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Comparing standard 24/48/72h blind retry schedules against RecoverOS contextual timing,
            salary-cycle alignment, dynamic UPI links, and deterministic DEFAULT-DENY policy guards.
          </p>
        </div>

        {/* Right column: Highlights grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Recovery Rate Lift */}
          <div
            id="headline-recovery-lift-box"
            className="bg-slate-800/90 border border-emerald-500/40 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Recovery Lift</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-400">
                {formatPercent(summary.incrementalRecoveryRateLiftPercent)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {summary.aiRecoveryRatePercent}% vs {summary.baselineRecoveryRatePercent}% baseline
              </div>
            </div>
          </div>

          {/* Cases Recovered */}
          <div
            id="headline-cases-recovered-box"
            className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Cases Recovered</span>
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white">
                {summary.aiCasesRecovered} <span className="text-sm font-normal text-slate-400">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Baseline: {summary.baselineCasesRecovered} / 100
              </div>
            </div>
          </div>

          {/* Incremental Revenue */}
          <div
            id="headline-incremental-revenue-box"
            className="bg-slate-800/90 border border-emerald-500/40 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Net Revenue Lift</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-400">
                +{formatINR(summary.incrementalRevenueRecoveredInr)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Gross: {formatINR(summary.aiRevenueRecoveredInr)}
              </div>
            </div>
          </div>

          {/* Spam Reduction */}
          <div
            id="headline-spam-reduction-box"
            className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
              <span>Spam Reduction</span>
              <MailMinus className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-400">
                -{summary.spamReductionPercent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {summary.aiSpamMessagesSent} vs {summary.baselineSpamMessagesSent} sent
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
