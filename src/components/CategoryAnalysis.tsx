/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FailureCategory } from '../types.ts';
import { ACTION_META, CATEGORY_META, formatINR, formatPercentRaw } from '../utils/formatters.ts';
import { ShieldCheck, ShieldAlert, ArrowRight, Zap, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

interface CategoryAnalysisProps {
  categoryBreakdown: Record<
    FailureCategory,
    {
      count: number;
      totalAtRiskInr: number;
      baselineRecoveredInr: number;
      baselineCasesRecovered: number;
      aiRecoveredInr: number;
      aiCasesRecovered: number;
    }
  >;
  onSelectCategory?: (category: FailureCategory) => void;
}

export const CategoryAnalysis: React.FC<CategoryAnalysisProps> = ({
  categoryBreakdown,
  onSelectCategory,
}) => {
  const categories: FailureCategory[] = [
    'TEMPORARY_ISSUER_OUTAGE',
    'INSUFFICIENT_FUNDS_TRANSIENT',
    'EXPIRED_INSTRUMENT',
    'AUTHENTICATION_ABANDONMENT',
    'FRAUD_SUSPICION_HIGH',
    'GATEWAY_TIMEOUT',
  ];

  return (
    <section id="category-analysis-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Failure Category Breakdown & Performance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Granular analysis of all 6 payment failure taxonomies, recoverability characteristics, and measured lift.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((catKey) => {
          const cat = CATEGORY_META[catKey];
          const data = categoryBreakdown[catKey] || {
            count: 0,
            totalAtRiskInr: 0,
            baselineRecoveredInr: 0,
            baselineCasesRecovered: 0,
            aiRecoveredInr: 0,
            aiCasesRecovered: 0,
          };

          const isFraud = catKey === 'FRAUD_SUSPICION_HIGH';
          const isRecoverable = !isFraud;
          const aiRate = data.count > 0 ? (data.aiCasesRecovered / data.count) * 100 : 0;
          const baselineRate = data.count > 0 ? (data.baselineCasesRecovered / data.count) * 100 : 0;
          const recoveryLiftInr = data.aiRecoveredInr - data.baselineRecoveredInr;
          const actionMeta = ACTION_META[cat.recommendedAction];

          return (
            <div
              key={catKey}
              id={`cat-card-${catKey.toLowerCase()}`}
              className={`bg-white dark:bg-slate-900 border ${cat.borderLight} rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden`}
            >
              <div className="space-y-3">
                {/* Header badge & Recoverability pill */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${cat.badgeBg}`}>
                    {cat.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                      isRecoverable
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {isRecoverable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {isRecoverable ? 'Recoverable' : 'Terminal / Blocked'}
                  </span>
                </div>

                {/* Subtitle description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px] leading-relaxed">
                  {cat.description}
                </p>

                {/* Metrics row */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Cases</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {data.count} <span className="text-[10px] font-normal text-slate-400">({(data.count)}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Revenue at Risk</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatINR(data.totalAtRiskInr)}
                    </div>
                  </div>
                </div>

                {/* Recommended Action Pill */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    Recommended Intervention
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold flex items-center justify-between ${actionMeta.badgeClass}`}>
                    <span className="truncate">{actionMeta.label}</span>
                    <Zap className="w-3 h-3 flex-shrink-0" />
                  </div>
                </div>

                {/* Recovery Performance Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isFraud ? 'Fraud Gate Block Rate' : 'RecoverOS Captured'}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {isFraud ? '100% Blocked' : `${data.aiCasesRecovered}/${data.count} (${formatPercentRaw(aiRate)})`}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFraud ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${isFraud ? 100 : aiRate}%` }}
                    />
                  </div>

                  {!isFraud && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>Baseline: {data.baselineCasesRecovered}/{data.count} ({formatINR(data.baselineRecoveredInr)})</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatINR(recoveryLiftInr)}
                      </span>
                    </div>
                  )}
                  {isFraud && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      Protected ₹{data.totalAtRiskInr.toLocaleString('en-IN')} from dispute/chargeback fee
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Button */}
              {onSelectCategory && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => onSelectCategory(catKey)}
                    className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1 py-1 rounded transition-colors cursor-pointer"
                  >
                    <span>Inspect {data.count} Cases in Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
