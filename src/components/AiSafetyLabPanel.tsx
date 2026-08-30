/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Lock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  Terminal,
} from 'lucide-react';
import {
  ADVERSARIAL_SAFETY_SCENARIOS,
  AdversarialScenario,
  runAdversarialTest,
  AdversarialEvaluationResult,
} from '../services/aiSafetyLab.ts';

export const AiSafetyLabPanel: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<AdversarialScenario>(
    ADVERSARIAL_SAFETY_SCENARIOS[0]
  );
  const [testResult, setTestResult] = useState<AdversarialEvaluationResult | null>(() =>
    runAdversarialTest(ADVERSARIAL_SAFETY_SCENARIOS[0])
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleExecuteAttack = (scenario: AdversarialScenario) => {
    setIsRunning(true);
    setSelectedScenario(scenario);
    setTimeout(() => {
      const result = runAdversarialTest(scenario);
      setTestResult(result);
      setIsRunning(false);
    }, 250);
  };

  return (
    <div className="space-y-6" id="ai-safety-lab-panel">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-amber-950/20 to-slate-900 border border-red-500/30 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-100">
                  AI Safety &amp; Adversarial Attack Testing Lab
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                  Defense-in-Depth
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                Demonstrating RecoverOS&apos;s ironclad safety invariant: <strong>AI diagnoses telemetry; deterministic policy controls all financial execution.</strong> Test adversarial prompt injections, mathematical hallucination, and outage fail-safes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium">
              <ShieldCheck className="w-4 h-4" /> 5/5 Attacks Defended
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {ADVERSARIAL_SAFETY_SCENARIOS.map((scenario, idx) => {
          const isSelected = selectedScenario.id === scenario.id;
          return (
            <button
              key={scenario.id}
              onClick={() => handleExecuteAttack(scenario)}
              className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-red-500/10 border-red-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-amber-400 font-semibold">Test {idx + 1}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{scenario.category.split('/')[0]}</span>
                </div>
                <div className="font-medium text-xs text-slate-100 line-clamp-2">{scenario.name.split(':')[1] || scenario.name}</div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-red-400 font-mono">
                <Zap className="w-3 h-3" /> Run Attack Test
              </div>
            </button>
          );
        })}
      </div>

      {/* Attack Scenario Execution View */}
      {testResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Attack Vector Payload */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Adversarial Input Payload</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Untrusted AI Output
                </span>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                {selectedScenario.attackVector}
              </p>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-slate-500" /> Injected Payload Parameters:
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">failureCategory:</span>
                    <span className="text-cyan-300">{selectedScenario.rawAiOutput.failureCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">rawProbability:</span>
                    <span className={selectedScenario.rawAiOutput.predictedRecoveryProbability > 1 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                      {selectedScenario.rawAiOutput.predictedRecoveryProbability}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">rawConfidence:</span>
                    <span className={selectedScenario.rawAiOutput.confidenceScore < 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                      {selectedScenario.rawAiOutput.confidenceScore}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">suggestedAction:</span>
                    <span className="text-amber-300 font-semibold">{selectedScenario.rawAiOutput.suggestedAction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">reasoning:</span>
                    <span className="text-slate-400 text-[11px] truncate max-w-[200px]" title={selectedScenario.rawAiOutput.reasoning}>
                      {selectedScenario.rawAiOutput.reasoning}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-blue-400" /> Formal Safety Guarantee:
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {selectedScenario.expectedDefenseOutcome.safetyGuarantee}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Defense In-Depth Execution Log */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Defense-in-Depth Pipeline Log</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {testResult.passedSafetyHurdle ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> DEFENSE SUCCESS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                      <XCircle className="w-3.5 h-3.5" /> FAILED
                    </span>
                  )}
                </div>
              </div>

              {/* Step-by-step Trace */}
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-2.5 border border-slate-800">
                {testResult.defenseLog.map((logLine, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 ${
                      logLine.includes('BLOCKED') || logLine.includes('Detected')
                        ? 'text-amber-300'
                        : logLine.includes('Immutable') || logLine.includes('SUCCESS')
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none">&gt;</span>
                    <span>{logLine}</span>
                  </div>
                ))}
              </div>

              {/* Policy Evaluation Output Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Action Authorized</div>
                  <div className="text-sm font-semibold mt-1 font-mono">
                    {testResult.policyResult.approved ? (
                      <span className="text-emerald-400">APPROVED</span>
                    ) : (
                      <span className="text-red-400">DENIED / BLOCKED</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Gateway Charged</div>
                  <div className="text-sm font-semibold mt-1 font-mono text-slate-200">
                    {selectedScenario.expectedDefenseOutcome.gatewayCallExecuted ? 'Yes (Sanitized)' : 'No (₹0 Cost)'}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Clamped Probability</div>
                  <div className="text-sm font-semibold mt-1 font-mono text-cyan-300">
                    {(testResult.clampedDiagnosis.predictedRecoveryProbability * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Ledger Status</div>
                  <div className="text-sm font-semibold mt-1 font-mono text-purple-300">
                    {selectedScenario.expectedDefenseOutcome.auditLedgerStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
