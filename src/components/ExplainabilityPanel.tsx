/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  HelpCircle, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  ShieldAlert, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Info
} from 'lucide-react';
import { CaseBenchmarkResult } from '../services/benchmarkEngine.ts';

interface ExplainabilityPanelProps {
  caseResult: CaseBenchmarkResult | null;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ caseResult }) => {
  if (!caseResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400 text-xs">
        Select a recovery case from the Live Demo or 100-Case Explorer to view full explainability breakdown.
      </div>
    );
  }

  const c = caseResult;
  const isApproved = c.recoveros.policy.approved;
  const isRecovered = c.recoveros.recovered;
  const netContribution = c.recoveros.amountRecoveredInr - c.recoveros.interventionCostInr;

  return (
    <div id="explainability-panel-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Diagnostic &amp; Policy Decision Explainability
            </h3>
            <p className="text-xs text-slate-400">
              Audit-ready transparent breakdown answering why every action was recommended, gated, and executed.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
            Case: {c.caseId}
          </span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            ₹{c.amountInr.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 8 Core Explainability Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Q1: What failed? */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3" />
            <span>1. What Failed?</span>
          </div>
          <div className="font-semibold text-xs text-slate-200">{c.errorCode}</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {c.errorDescription} via <span className="text-slate-300 font-mono">{c.paymentMethod}</span> ({c.cardNetwork || 'UPI'}).
          </p>
          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
            Category: {c.groundTruthCategory}
          </div>
        </div>

        {/* Q2: Why classified this way? */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center space-x-1">
            <Info className="w-3 h-3" />
            <span>2. Classification Rationale</span>
          </div>
          <div className="font-semibold text-xs text-slate-200">
            Bank Health: {(c.bankHealthScore ?? 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tenure {c.customerTenureMonths}m, {c.lifetimeSuccessfulPayments} lifetime payments, attempt #{c.attemptNumber}.
          </p>
          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
            Day: {c.dayOfMonth} • Hour: {c.hourOfDay}:00
          </div>
        </div>

        {/* Q3: What does AI recommend? */}
        <div className="bg-slate-950/70 border border-purple-900/40 rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>3. AI Recommendation</span>
          </div>
          <div className="font-semibold text-xs text-purple-300">
            {c.recoveros?.diagnosis?.suggestedAction}
          </div>
          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {c.recoveros?.diagnosis?.reasoning}
          </p>
          <div className="text-[10px] text-purple-400 font-mono pt-1 border-t border-purple-900/40 flex justify-between">
            <span>Prob: {((c.recoveros?.diagnosis?.predictedRecoveryProbability ?? 0) * 100).toFixed(0)}%</span>
            <span>Delay: {c.recoveros?.diagnosis?.recommendedExecutionDelayMinutes ?? 0}m</span>
          </div>
        </div>

        {/* Q4 & Q5: Policy Decision & Why */}
        <div className={`rounded-lg p-3 space-y-1.5 border ${
          isApproved ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-rose-950/20 border-rose-900/50'
        }`}>
          <div className={`text-[10px] uppercase font-bold flex items-center space-x-1 ${
            isApproved ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <Lock className="w-3 h-3" />
            <span>4 &amp; 5. Policy Verdict &amp; Why</span>
          </div>
          <div className={`font-semibold text-xs flex items-center space-x-1 ${
            isApproved ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            <span>{isApproved ? 'APPROVED BY POLICY' : 'DENIED BY POLICY'}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isApproved
              ? 'Passed all 6 guardrails (Fraud Hurdle, Action Whitelist, Max Retries, Cooldown, Budget, Economic Hurdle).'
              : `Denial Reason: ${c.recoveros?.policy?.denialReason || 'Failed deterministic threshold'}`}
          </p>
        </div>
      </div>

      {/* Financial & Ledger Breakdown Row (Q6, Q7, Q8) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-xs">
        {/* Q6: Revenue at Risk */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">6. Revenue at Risk</div>
          <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
            ₹{(c.amountInr ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Customer tier: {c.customerTier || 'Standard'}
          </div>
        </div>

        {/* Q7: Expected Recovery */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">7. Recovered Outcome</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${
            isRecovered ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            ₹{(c.recoveros?.amountRecoveredInr ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isRecovered ? 'Successfully captured' : (isApproved ? 'Execution unrecovered' : 'Zero execution (Safe denial)')}
          </div>
        </div>

        {/* Q8: Cost & Net Profit */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">8. Intervention Cost &amp; Net</div>
          <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
            ₹{(c.recoveros?.interventionCostInr ?? 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
            Net: ₹{netContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Ledger Record Summary */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Cryptographic Ledger</div>
          <div className="text-xs font-mono font-semibold text-sky-300 mt-1 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>{isApproved ? 'AUDITED_RECOVERY' : 'AUDITED_BLOCKED'}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            Ref: {c.recoveros.executionRef || 'audit_gated'}
          </div>
        </div>
      </div>
    </div>
  );
};
