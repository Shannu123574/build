/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaseBenchmarkResult } from '../types.ts';
import { formatINR } from '../utils/formatters.ts';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  RotateCcw,
  Clock,
  TrendingDown,
  Wallet,
} from 'lucide-react';

interface PolicySafetyPanelProps {
  caseResults: CaseBenchmarkResult[];
}

export const PolicySafetyPanel: React.FC<PolicySafetyPanelProps> = ({ caseResults }) => {
  // Compute exact metrics from all 100 cases
  let approvedCount = 0;
  let deniedCount = 0;

  let fraudBlocks = 0;
  let retryLimitBlocks = 0;
  let cooldownBlocks = 0;
  let negativeRoiBlocks = 0;
  let dailyBudgetBlocks = 0;
  let unauthorizedBlocks = 0;

  for (const c of caseResults) {
    const p = c.recoveros.policy;
    if (p.approved) {
      approvedCount++;
    } else {
      deniedCount++;
      if (p.denialReason === 'FRAUD_SCORE_EXCEEDS_THRESHOLD') fraudBlocks++;
      else if (p.denialReason === 'RETRY_LIMIT_EXCEEDED') retryLimitBlocks++;
      else if (p.denialReason === 'COOLDOWN_ACTIVE') cooldownBlocks++;
      else if (p.denialReason === 'NEGATIVE_EXPECTED_ROI') negativeRoiBlocks++;
      else if (p.denialReason === 'DAILY_BUDGET_EXCEEDED') dailyBudgetBlocks++;
      else unauthorizedBlocks++;
    }
  }

  const gates = [
    {
      id: 'gate-fraud',
      name: 'Fraud & Churn Risk Gate',
      reason: 'FRAUD_SCORE_EXCEEDS_THRESHOLD',
      count: fraudBlocks,
      status: fraudBlocks > 0 ? 'Active Blocks' : 'Passing',
      threshold: 'Fraud score < 0.65 & valid card status',
      icon: Flame,
      color: 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400',
      description: 'Strictly blocks terminal fraud patterns, card blacklists, and high chargeback signatures.',
    },
    {
      id: 'gate-retry',
      name: 'Retry Velocity Cap',
      reason: 'RETRY_LIMIT_EXCEEDED',
      count: retryLimitBlocks,
      status: 'Enforced',
      threshold: 'Max 3 retry attempts per invoice',
      icon: RotateCcw,
      color: 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
      description: 'Prevents card network spam penalties and issuer rate-limit lockouts.',
    },
    {
      id: 'gate-cooldown',
      name: 'Intervention Cooldown Window',
      reason: 'COOLDOWN_ACTIVE',
      count: cooldownBlocks,
      status: 'Enforced',
      threshold: 'Minimum 120 minutes between actions',
      icon: Clock,
      color: 'border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400',
      description: 'Guarantees space for bank core systems and user notifications to settle.',
    },
    {
      id: 'gate-roi',
      name: 'Economic Rationality Gate',
      reason: 'NEGATIVE_EXPECTED_ROI',
      count: negativeRoiBlocks,
      status: 'Enforced',
      threshold: 'P_rec * Amount >= Marginal Intervention Cost',
      icon: TrendingDown,
      color: 'border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400',
      description: 'Disallows high-cost outreach on micro-value or low-probability recovery cases.',
    },
    {
      id: 'gate-budget',
      name: 'Daily Spend Budget Cap',
      reason: 'DAILY_BUDGET_EXCEEDED',
      count: dailyBudgetBlocks,
      status: 'Enforced',
      threshold: 'Max daily intervention spend: ₹5,000.00',
      icon: Wallet,
      color: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
      description: 'Hard stop threshold preventing runaway notification billing or webhook cascades.',
    },
  ];

  return (
    <section id="policy-safety-panel-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            Deterministic Policy Safety Engine (DEFAULT-DENY)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable safety constraints evaluated before any Razorpay gateway charge is authorized.
          </p>
        </div>

        {/* Global Gate Summary */}
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{approvedCount} Approved</span>
          </div>
          <div className="px-3 py-1 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{deniedCount} Denied / Safeguarded</span>
          </div>
        </div>
      </div>

      {/* Safety Gates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gates.map((gate) => {
          const Icon = gate.icon;
          return (
            <div
              key={gate.id}
              id={gate.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${gate.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      gate.count > 0
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {gate.count} Cases Blocked
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {gate.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {gate.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Enforced Rule:</span>
                  <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                    {gate.reason}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Threshold:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{gate.threshold}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Policy Principle Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 text-white space-y-3 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Deterministic Policy Invariant</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Every prospective recovery intervention must obtain affirmative approval across all active policy rules.
              If an AI model proposes an intervention on a high-fraud instrument, the policy gate forcefully overrides it to <code>DO_NOT_RETRY</code>.
            </p>
          </div>

          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-700">
            System Policy Status: 100% Deterministic Active
          </div>
        </div>
      </div>
    </section>
  );
};
