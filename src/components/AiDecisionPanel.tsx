/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CaseBenchmarkResult } from '../types.ts';
import { ACTION_META, CATEGORY_META, formatINR } from '../utils/formatters.ts';
import {
  Brain,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  User,
  CreditCard,
  Building2,
} from 'lucide-react';

interface AiDecisionPanelProps {
  caseResults: CaseBenchmarkResult[];
  selectedCaseId: string;
  onSelectCaseId: (id: string) => void;
}

export const AiDecisionPanel: React.FC<AiDecisionPanelProps> = ({
  caseResults,
  selectedCaseId,
  onSelectCaseId,
}) => {
  const currentResult =
    caseResults.find((c) => c.caseId === selectedCaseId) || caseResults[0];

  const diag = currentResult?.recoveros.diagnosis;
  const policy = currentResult?.recoveros.policy;
  const catMeta = diag ? CATEGORY_META[diag.failureCategory] : null;
  const actionMeta = diag ? ACTION_META[diag.suggestedAction] : null;

  return (
    <section id="ai-decision-panel-section" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-500" />
            AI Diagnostic & Decision Inspector
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Advisory telemetry analysis, confidence calibration, and recovery probability model.
          </p>
        </div>

        {/* Case Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="ai-case-selector" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Select Case:
          </label>
          <select
            id="ai-case-selector"
            value={currentResult?.caseId}
            onChange={(e) => onSelectCaseId(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            {caseResults.map((c) => (
              <option key={c.caseId} value={c.caseId}>
                {c.caseId} - {formatINR(c.amountInr)} ({c.groundTruthCategory})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentResult && diag && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main AI Diagnostic Output Card (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            {/* Header: Failure Category & Fallback status */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnosis</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${catMeta?.badgeBg}`}>
                  {catMeta?.label}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    diag.isAiFallback
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {diag.isAiFallback ? 'Deterministic Rule Engine' : 'Live Gemini 3.6 Flash'}
                </span>
              </div>
            </div>

            {/* Scores Row: Confidence & Predicted Recovery Probability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Confidence Score */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Diagnostic Confidence</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {((diag?.confidenceScore ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${(diag?.confidenceScore ?? 0) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Telemetry feature support index
                </div>
              </div>

              {/* Predicted Recovery Probability */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Predicted Recovery Prob. (P_rec)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {((diag?.predictedRecoveryProbability ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(diag?.predictedRecoveryProbability ?? 0) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Historical recovery propensity
                </div>
              </div>
            </div>

            {/* Suggested Action & Execution Delay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Advisory Suggested Action
                </span>
                <div className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between ${actionMeta?.badgeClass}`}>
                  <span>{actionMeta?.label}</span>
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recommended Execution Timing
                </span>
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold flex items-center justify-between text-slate-800 dark:text-slate-200">
                  <span>
                    {diag.recommendedExecutionDelayMinutes === 0
                      ? 'Immediate (0 min delay)'
                      : `+${diag.recommendedExecutionDelayMinutes} minutes delay`}
                  </span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* AI Reasoning Statement */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-emerald-500" /> Reasoning Rationale
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                {diag.reasoning}
              </p>
            </div>

            {/* Risk Factors */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Identified Risk Factors
              </span>
              <div className="flex flex-wrap gap-1.5">
                {diag.riskFactors && diag.riskFactors.length > 0 ? (
                  diag.riskFactors.map((risk, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-medium rounded-md flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {risk}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None identified</span>
                )}
              </div>
            </div>
          </div>

          {/* Side Card: Case Telemetry & Policy Gate Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Telemetry Context
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {currentResult.caseId}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Amount at Risk</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatINR(currentResult.amountInr)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Ground Truth Category</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentResult.groundTruthCategory}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Policy Authorization</span>
                <span
                  className={`font-bold inline-flex items-center gap-1 ${
                    policy?.approved
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {policy?.approved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {policy?.approved ? 'APPROVED' : `DENIED (${policy?.denialReason})`}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Expected Net ROI</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{(policy?.expectedNetGainInr ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Simulator Outcome</span>
                <span
                  className={`font-bold ${
                    currentResult.recoveros.recovered
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {currentResult.recoveros.recovered
                    ? `RECOVERED (${formatINR(currentResult.recoveros.amountRecoveredInr)})`
                    : currentResult.recoveros.executed
                    ? 'UNRESOLVED'
                    : 'BLOCKED (0 Attempt)'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Baseline Result</span>
                <span
                  className={`font-semibold ${
                    currentResult.baseline.recovered ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {currentResult.baseline.recovered
                    ? `Recovered (3 msgs)`
                    : `Failed (3 spam msgs, ₹0.60 cost)`}
                </span>
              </div>
            </div>

            {/* Architecture note */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300">
              <strong>Zero-Execution-Leakage Principle:</strong> Gemini suggestions are strictly advisory. The deterministic Policy Engine evaluates all 5 safety gates before Razorpay simulator execution.
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
