/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  X, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  FileText,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { RealWorldValidationScenario, ClaimClassification } from '../types.ts';

interface ValidationEvidenceModalProps {
  scenario: RealWorldValidationScenario | null;
  onClose: () => void;
}

export const ValidationEvidenceModal: React.FC<ValidationEvidenceModalProps> = ({
  scenario,
  onClose,
}) => {
  if (!scenario) return null;

  const getClaimBadge = (claim?: ClaimClassification) => {
    switch (claim) {
      case 'REGULATORY_REQUIREMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Lock className="w-3.5 h-3.5" />
            REGULATORY REQUIREMENT
          </span>
        );
      case 'PAYMENT_NETWORK_RULE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            PAYMENT-NETWORK RULE
          </span>
        );
      case 'GATEWAY_DOCUMENTED_BEHAVIOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            GATEWAY SPECIFICATION
          </span>
        );
      case 'ENGINEERING_BEST_PRACTICE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ENGINEERING BEST PRACTICE
          </span>
        );
      case 'RECOVEROS_DESIGN_DECISION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            RECOVEROS DESIGN DECISION
          </span>
        );
      case 'SYNTHETIC_BENCHMARK_ASSUMPTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Layers className="w-3.5 h-3.5" />
            BENCHMARK ASSUMPTION
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SAFETY_REGULATORY_MANDATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3.5 h-3.5" />
            SAFETY & REGULATORY MANDATE
          </span>
        );
      case 'EMPIRICALLY_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            EMPIRICALLY VERIFIED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            DOCUMENTED INDUSTRY STANDARD
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                {scenario.id}
              </span>
              {getClaimBadge(scenario.claimClassification)}
              {getStatusBadge(scenario.validationStatus)}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {scenario.name}
            </h2>
            <p className="text-xs text-slate-400">
              Documented Payment Failure Validation &amp; Regulatory Grounding Specification
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Failure Condition */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Documented Failure Condition
            </h3>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm leading-relaxed text-slate-300">
              {scenario.failureCondition}
            </div>
          </div>

          {/* Section 2: Observable Telemetry & Markers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Observable Telemetry Signatures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Error Codes</span>
                <div className="flex flex-wrap gap-1.5">
                  {scenario.observableTelemetry.errorCode.map((code) => (
                    <code key={code} className="px-2 py-0.5 text-xs bg-slate-800 text-rose-300 rounded border border-rose-900/40 font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Bank Health Signature</span>
                <p className="text-xs text-slate-300 font-mono">
                  {scenario.observableTelemetry.bankHealthPattern}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Telemetry Markers</span>
              <ul className="space-y-1">
                {scenario.observableTelemetry.telemetryMarkers.map((marker, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{marker}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 3: Safe vs Unsafe Action Comparison */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Action Policy Matrix (Safe vs Unsafe Anti-Pattern)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Safe Action */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                  <CheckCircle2 className="w-4 h-4" />
                  Expected Safe Action
                </div>
                <div className="text-sm font-mono font-semibold text-emerald-300">
                  {scenario.expectedSafeAction}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {scenario.expectedDiagnosis}
                </p>
              </div>

              {/* Unsafe Action */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  Prevented Unsafe Anti-Pattern
                </div>
                <p className="text-xs text-rose-300 leading-relaxed">
                  {scenario.expectedUnsafeAction}
                </p>
              </div>
            </div>

            {/* Why safe action is preferable */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Engineering &amp; Risk Rationale:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {scenario.whySafeActionPreferable}
              </p>
            </div>
          </div>

          {/* Section 4: Documented Evidence Source */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Documented Industry Standard &amp; Citation
            </h3>
            <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-amber-300">
                    {scenario.evidenceSource.institution}
                  </span>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {scenario.evidenceSource.docReference} ({scenario.evidenceSource.publishedYear})
                  </p>
                </div>
                {scenario.evidenceSource.sourceUrl && (
                  <a
                    href={scenario.evidenceSource.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 transition-colors"
                  >
                    <span>View Docs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="text-xs text-slate-300 border-t border-amber-900/30 pt-2.5 leading-relaxed">
                <span className="font-semibold text-amber-200">Verified Rule Behavior: </span>
                {scenario.evidenceSource.verifiedBehavior}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Policy Gated • Sandbox Safe</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
