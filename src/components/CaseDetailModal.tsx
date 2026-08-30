/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';
import { CaseBenchmarkResult } from '../types.ts';
import { ACTION_META, CATEGORY_META, formatINR } from '../utils/formatters.ts';
import {
  X,
  Brain,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Building2,
  FileText,
  Lock,
} from 'lucide-react';

interface CaseDetailModalProps {
  caseResult: CaseBenchmarkResult | null;
  onClose: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseResult,
  onClose,
}) => {
  if (!caseResult) return null;

  const meta = SYNTHETIC_DATASET.find((c) => c.id === caseResult.caseId);
  const diag = caseResult.recoveros.diagnosis;
  const policy = caseResult.recoveros.policy;
  const catMeta = CATEGORY_META[caseResult.groundTruthCategory];
  const actionMeta = diag ? ACTION_META[diag.suggestedAction] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        id="case-detail-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
              {caseResult.caseId}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${catMeta?.badgeBg}`}>
              {catMeta?.label}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatINR(caseResult.amountInr)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Customer & Error Telemetry */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Payment Incident Telemetry
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Customer</span>
              <span className="font-bold text-slate-900 dark:text-white">{meta?.customerName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Method / Bank</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {meta?.issuingBank || 'N/A'} ({meta?.paymentMethod})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Error Code</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {meta?.errorCode}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Bank Health / Salary Day</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Score: {meta?.bankHealthScore} | Day {meta?.dayOfMonth}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: AI Diagnosis & Decision */}
        {diag && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-500" />
                AI Telemetry Diagnosis (Advisory)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Confidence: {((diag?.confidenceScore ?? 0) * 100).toFixed(0)}% | Recovery Prob: {((diag?.predictedRecoveryProbability ?? 0) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Suggested Action</span>
                  <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${actionMeta?.badgeClass}`}>
                    {actionMeta?.label}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Recommended Timing</span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {diag.recommendedExecutionDelayMinutes === 0
                        ? 'Immediate Execution'
                        : `+${diag.recommendedExecutionDelayMinutes} minutes delay`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Reasoning</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                  {diag.reasoning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Deterministic Policy Engine Evaluation */}
        {policy && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-500" />
              Policy Engine Authorization
            </h4>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Policy Verdict:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold ${
                    policy.approved
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {policy.approved ? 'APPROVED FOR EXECUTION' : `DENIED (${policy.denialReason})`}
                </span>
              </div>

              {policy.rulesEvaluated && (
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Rules Evaluated</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {policy.rulesEvaluated.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                          {r.ruleName}
                        </span>
                        <span
                          className={`font-bold text-[10px] ${
                            r.passed ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {r.passed ? 'PASSED' : 'BLOCKED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Simulation Execution & Outcomes */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Execution & Recovery Outcomes
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Baseline */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 space-y-1.5">
              <span className="font-bold text-slate-500 block">Baseline Dunning</span>
              <div className="flex items-center justify-between">
                <span>Result:</span>
                <span className={`font-bold ${caseResult.baseline.recovered ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {caseResult.baseline.recovered ? 'RECOVERED' : 'FAILED'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Spam Messages:</span>
                <span>{caseResult.baseline.messagesSent} sent</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cost:</span>
                <span>₹{caseResult.baseline.interventionCostInr.toFixed(2)}</span>
              </div>
            </div>

            {/* RecoverOS */}
            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">RecoverOS AI</span>
              <div className="flex items-center justify-between">
                <span>Result:</span>
                <span className={`font-bold ${caseResult.recoveros.recovered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  {caseResult.recoveros.recovered ? `RECOVERED (${formatINR(caseResult.recoveros.amountRecoveredInr)})` : 'NOT RECOVERED'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Execution Ref:</span>
                <span className="font-mono text-[10px]">{caseResult.recoveros.executionRef || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Intervention Cost:</span>
                <span>₹{caseResult.recoveros.interventionCostInr.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
