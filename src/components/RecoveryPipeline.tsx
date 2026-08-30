/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CaseBenchmarkResult, IncidentStatus } from '../types.ts';
import { formatINR } from '../utils/formatters.ts';
import {
  AlertCircle,
  Brain,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
  Lock,
} from 'lucide-react';

interface RecoveryPipelineProps {
  caseResults: CaseBenchmarkResult[];
  onSelectCase?: (caseResult: CaseBenchmarkResult) => void;
}

export const RecoveryPipeline: React.FC<RecoveryPipelineProps> = ({
  caseResults,
  onSelectCase,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('ALL');

  // Stage calculations
  const totalDetected = caseResults.length; // 100
  const totalDiagnosed = caseResults.filter((c) => !!c.recoveros.diagnosis).length; // 100
  const totalPolicyEvaluated = caseResults.filter((c) => !!c.recoveros.policy).length; // 100
  const totalPolicyApproved = caseResults.filter((c) => c.recoveros.policy.approved).length; // 90
  const totalPolicyDenied = caseResults.filter((c) => !c.recoveros.policy.approved).length; // 10
  const totalExecuting = caseResults.filter((c) => c.recoveros.executed).length; // 90
  const totalRecovered = caseResults.filter((c) => c.recoveros.recovered).length; // 74
  const totalRecoveredRevenue = caseResults.filter((c) => c.recoveros.recovered).reduce((acc, c) => acc + c.recoveros.amountRecoveredInr, 0);
  const totalExhausted = caseResults.filter((c) => c.recoveros.executed && !c.recoveros.recovered).length; // 16
  const totalBlockedFraud = totalPolicyDenied; // 10

  const stages = [
    {
      id: 'DETECTED',
      name: '1. DETECTED',
      count: totalDetected,
      description: 'Webhook telemetry ingestion & event enrichment',
      amountInr: caseResults.reduce((acc, c) => acc + c.amountInr, 0),
      icon: AlertCircle,
      color: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900',
      badge: '100% Ingested',
    },
    {
      id: 'DIAGNOSED',
      name: '2. DIAGNOSED',
      count: totalDiagnosed,
      description: 'AI classification across 6 failure taxonomies',
      amountInr: caseResults.reduce((acc, c) => acc + c.amountInr, 0),
      icon: Brain,
      color: 'border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20',
      badge: '6 Categories',
    },
    {
      id: 'POLICY_EVALUATED',
      name: '3. POLICY EVALUATED',
      count: totalPolicyEvaluated,
      description: 'DEFAULT-DENY safety gates & ROI calculations',
      amountInr: caseResults.reduce((acc, c) => acc + c.amountInr, 0),
      icon: ShieldCheck,
      color: 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
      badge: `${totalPolicyApproved} Approved / ${totalPolicyDenied} Denied`,
    },
    {
      id: 'EXECUTING',
      name: '4. EXECUTING',
      count: totalExecuting,
      description: 'Razorpay sandbox smart retry, UPI link, or prompt',
      amountInr: caseResults.filter((c) => c.recoveros.executed).reduce((acc, c) => acc + c.amountInr, 0),
      icon: Zap,
      color: 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20',
      badge: 'Idempotency Safe',
    },
    {
      id: 'RECOVERED',
      name: '5. SETTLED / FINAL',
      count: totalRecovered,
      description: 'Cryptographically verified ledger settlement',
      amountInr: caseResults.filter((c) => c.recoveros.recovered).reduce((acc, c) => acc + c.amountInr, 0),
      icon: CheckCircle2,
      color: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
      badge: `${totalRecovered} Recovered / ${totalExhausted} Exhausted`,
    },
  ];

  // Filter cases for the stage preview drawer
  const filteredCases = caseResults.filter((c) => {
    if (selectedStage === 'ALL') return true;
    if (selectedStage === 'DETECTED') return true;
    if (selectedStage === 'DIAGNOSED') return true;
    if (selectedStage === 'POLICY_EVALUATED') return !c.recoveros.policy.approved; // Show policy denied
    if (selectedStage === 'EXECUTING') return c.recoveros.executed;
    if (selectedStage === 'RECOVERED') return c.recoveros.recovered;
    return true;
  });

  return (
    <section id="recovery-pipeline-section" className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Recovery Lifecycle Pipeline
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Deterministic 5-stage payment incident progression with zero execution leakage.
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = selectedStage === stage.id;

          return (
            <div
              key={stage.id}
              id={`pipeline-stage-${stage.id.toLowerCase()}`}
              onClick={() => setSelectedStage(stage.id)}
              className={`border-2 rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer shadow-sm relative ${
                stage.color
              } ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-950' : 'hover:border-slate-400'}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs">
                    <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {stage.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {stage.name}
                  </h3>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {stage.count} <span className="text-xs font-normal text-slate-500">cases</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatINR(stage.amountInr)}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {stage.description}
                </p>
              </div>

              {idx < 4 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-full p-0.5 shadow-sm">
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Outcome Breakdown Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Successfully Recovered</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {totalRecovered} cases <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">({formatINR(totalRecoveredRevenue)})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Exhausted / Unresolved</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {totalExhausted} cases <span className="text-xs font-semibold text-slate-500">(Intervention completed)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Policy Blocked (Fraud Safe)</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {totalBlockedFraud} cases <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">(0 spam sent)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
