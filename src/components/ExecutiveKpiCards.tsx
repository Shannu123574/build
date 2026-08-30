/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BenchmarkComparisonSummary } from '../types.ts';
import { formatINR, formatINRDecimals, formatPercent, formatPercentRaw } from '../utils/formatters.ts';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Percent,
  Zap,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface ExecutiveKpiCardsProps {
  summary: BenchmarkComparisonSummary;
}

export const ExecutiveKpiCards: React.FC<ExecutiveKpiCardsProps> = ({ summary }) => {
  const cards = [
    {
      id: 'kpi-total-revenue-at-risk',
      title: 'Total Revenue at Risk',
      value: formatINR(summary.totalRevenueAtRiskInr),
      subtitle: `${summary.totalCases} payment failure incidents`,
      delta: '100% evaluated',
      deltaType: 'neutral' as const,
      icon: AlertTriangle,
      borderAccent: 'border-slate-200 dark:border-slate-800',
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      id: 'kpi-baseline-recovered',
      title: 'Baseline Revenue Recovered',
      value: formatINR(summary.baselineRevenueRecoveredInr),
      subtitle: `${summary.baselineCasesRecovered} / ${summary.totalCases} cases recovered`,
      delta: `${summary.baselineRecoveryRatePercent}% rate`,
      deltaType: 'negative' as const,
      icon: CheckCircle2,
      borderAccent: 'border-slate-200 dark:border-slate-800',
      iconColor: 'text-slate-500',
      iconBg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      id: 'kpi-recoveros-recovered',
      title: 'RecoverOS Revenue Recovered',
      value: formatINR(summary.aiRevenueRecoveredInr),
      subtitle: `${summary.aiCasesRecovered} / ${summary.totalCases} cases recovered`,
      delta: `${summary.aiRecoveryRatePercent}% rate`,
      deltaType: 'positive' as const,
      icon: Sparkles,
      borderAccent: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      id: 'kpi-incremental-revenue',
      title: 'Incremental Revenue Recovered',
      value: `+${formatINR(summary.incrementalRevenueRecoveredInr)}`,
      subtitle: `Net profit lift: +${formatINR(summary.incrementalNetProfitInr)}`,
      delta: `+${formatPercentRaw(((summary.incrementalRevenueRecoveredInr) / Math.max(1, summary.baselineRevenueRecoveredInr)) * 100)} lift`,
      deltaType: 'positive' as const,
      icon: TrendingUp,
      borderAccent: 'border-emerald-300 dark:border-emerald-700',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      id: 'kpi-recovery-rate',
      title: 'Recovery Rate',
      value: `${summary.aiRecoveryRatePercent ?? 0}%`,
      subtitle: `Baseline benchmark: ${summary.baselineRecoveryRatePercent ?? 0}%`,
      delta: `+${((summary.aiRecoveryRatePercent ?? 0) - (summary.baselineRecoveryRatePercent ?? 0)).toFixed(2)}% pts`,
      deltaType: 'positive' as const,
      icon: Percent,
      borderAccent: 'border-sky-200 dark:border-sky-800',
      iconColor: 'text-sky-500',
      iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    },
    {
      id: 'kpi-recovery-lift',
      title: 'Recovery Rate Lift',
      value: formatPercent(summary.incrementalRecoveryRateLiftPercent),
      subtitle: 'Contextual AI timing & method shift',
      delta: '20.7x improvement',
      deltaType: 'positive' as const,
      icon: Zap,
      borderAccent: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      id: 'kpi-intervention-cost',
      title: 'Intervention Cost',
      value: `₹${(summary.aiInterventionCostsInr ?? 0).toFixed(2)}`,
      subtitle: `Baseline cost: ₹${(summary.baselineInterventionCostsInr ?? 0).toFixed(2)}`,
      delta: `-₹${((summary.baselineInterventionCostsInr ?? 0) - (summary.aiInterventionCostsInr ?? 0)).toFixed(2)} saved`,
      deltaType: 'positive' as const,
      icon: Coins,
      borderAccent: 'border-slate-200 dark:border-slate-800',
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      id: 'kpi-spam-reduction',
      title: 'Spam Outreach Reduction',
      value: `-${summary.spamReductionPercent}%`,
      subtitle: `${summary.aiSpamMessagesSent} messages vs ${summary.baselineSpamMessagesSent} baseline`,
      delta: 'Policy suppressed 229 msgs',
      deltaType: 'positive' as const,
      icon: ShieldCheck,
      borderAccent: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
  ];

  return (
    <section id="executive-kpi-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Executive Performance Metrics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time aggregate comparison computed from the 100-case deterministic benchmark evaluation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={card.id}
              className={`bg-white dark:bg-slate-900 border ${card.borderAccent} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                    <Icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>

                <div className="mt-2.5">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {card.value}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {card.subtitle}
                </span>
                <span
                  className={`inline-flex items-center space-x-0.5 font-semibold ${
                    card.deltaType === 'positive'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : card.deltaType === 'negative'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {card.deltaType === 'positive' && <ArrowUpRight className="w-3.5 h-3.5" />}
                  {card.deltaType === 'negative' && <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{card.delta}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
