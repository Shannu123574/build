/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  FileCheck,
  Filter,
  ExternalLink,
  ChevronRight,
  Info,
  Scale,
  Sparkles,
  Search
} from 'lucide-react';
import { 
  REAL_WORLD_VALIDATION_REGISTRY, 
  getRealWorldValidationMetrics 
} from '../data/realWorldValidationRegistry.ts';
import { RealWorldValidationScenario, ValidationStatus, ClaimClassification } from '../types.ts';
import { ValidationEvidenceModal } from './ValidationEvidenceModal.tsx';

export const RealWorldValidationPanel: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<RealWorldValidationScenario | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [heldOutMetrics, setHeldOutMetrics] = useState<any>(null);

  React.useEffect(() => {
    import('../services/heldOutEvaluation.ts').then(m => {
      m.runHeldOutEvaluation().then(res => setHeldOutMetrics(res));
    });
  }, []);

  const metrics = getRealWorldValidationMetrics();
  const scenarios = REAL_WORLD_VALIDATION_REGISTRY;

  const filteredScenarios = scenarios.filter((s) => {
    const matchesStatus = statusFilter === 'ALL' || s.validationStatus === statusFilter || s.claimClassification === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.failureCondition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.evidenceSource.institution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getClaimBadge = (claim?: ClaimClassification) => {
    switch (claim) {
      case 'REGULATORY_REQUIREMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Lock className="w-3 h-3" />
            REGULATORY REQUIREMENT
          </span>
        );
      case 'PAYMENT_NETWORK_RULE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Scale className="w-3 h-3" />
            PAYMENT-NETWORK RULE
          </span>
        );
      case 'GATEWAY_DOCUMENTED_BEHAVIOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <BookOpen className="w-3 h-3" />
            GATEWAY SPECIFICATION
          </span>
        );
      case 'ENGINEERING_BEST_PRACTICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            ENGINEERING BEST PRACTICE
          </span>
        );
      case 'RECOVEROS_DESIGN_DECISION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3 h-3" />
            RECOVEROS DESIGN DECISION
          </span>
        );
      case 'SYNTHETIC_BENCHMARK_ASSUMPTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Layers className="w-3 h-3" />
            BENCHMARK ASSUMPTION
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'SAFETY_REGULATORY_MANDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3 h-3" />
            REGULATORY MANDATE
          </span>
        );
      case 'EMPIRICALLY_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="w-3 h-3" />
            EMPIRICALLY VERIFIED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" />
            INDUSTRY STANDARD
          </span>
        );
    }
  };

  return (
    <div id="real-world-validation-panel" className="space-y-8">
      {/* 1. Clear Architecture & Domain Distinction Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Real-World Validation &amp; Industry Standards Layer
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Phase 7
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Grounding payment failure recovery in documented card network rules, central bank circulars, and aggregator specifications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>7 Institutional Standards Cited</span>
          </div>
        </div>

        {/* The 3 Structural Pillars of RecoverOS Evaluation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                1. Synthetic Benchmark
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Seed 42 (100 Cases)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deterministic, pseudo-random generated dataset used to quantitatively benchmark RecoverOS against static dunning under controlled conditions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                2. Sandbox Simulator
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Local Test Environment</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Razorpay-compatible API simulator executing idempotent captures, simulated bank delays, and smart links with zero live financial movement.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                3. Real-World Validation
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Industry Documentation</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Verifies that every AI diagnostic category and recovery rule strictly adheres to published payment network standards (Visa, Mastercard, NPCI, RBI).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Real-World Validation Dashboard */}
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
        <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400"/> REAL-WORLD VALIDATION DASHBOARD</h3>
        {!heldOutMetrics ? (
          <div className="text-slate-400 text-xs">Running Held-Out Evaluation Pipeline...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Test-Mode Events</div>
              <div className="text-xl font-bold text-white">5</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Realistic Scenarios</div>
              <div className="text-xl font-bold text-white">30</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Held-out Cases</div>
              <div className="text-xl font-bold text-white">{heldOutMetrics.totalCases}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Revenue At Risk</div>
              <div className="text-xl font-bold text-amber-400">₹{heldOutMetrics.revenueAtRiskInr.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Revenue Recovered</div>
              <div className="text-xl font-bold text-emerald-400">₹{heldOutMetrics.revenueRecoveredInr.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Recovery Rate</div>
              <div className="text-xl font-bold text-cyan-400">{heldOutMetrics.recoveryRatePercent}%</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Incremental Lift (AI)</div>
              <div className="text-xl font-bold text-indigo-400">
                ₹{heldOutMetrics.aiValueProof.incrementalLiftRevenueInr.toLocaleString('en-IN')}
                <span className="text-[10px] ml-2 text-slate-500 font-normal block">(Fallback: ₹{heldOutMetrics.aiValueProof.fallbackRevenueRecoveredInr.toLocaleString('en-IN')})</span>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Fraud / Dup Blocks</div>
              <div className="text-xl font-bold text-rose-400">{heldOutMetrics.fraudBlocks} / {heldOutMetrics.duplicateBlocks}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Human Escalations</div>
              <div className="text-xl font-bold text-white">{heldOutMetrics.humanEscalations}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">AI Fallback Rate</div>
              <div className="text-xl font-bold text-slate-400">100% (No API Key)</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search scenario, rule, or institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filter Status:
          </span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All ({scenarios.length})
          </button>
          <button
            onClick={() => setStatusFilter('DOCUMENTED_INDUSTRY_STANDARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'DOCUMENTED_INDUSTRY_STANDARD'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Industry Standard
          </button>
          <button
            onClick={() => setStatusFilter('SAFETY_REGULATORY_MANDATE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'SAFETY_REGULATORY_MANDATE'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Regulatory Mandate
          </button>
          <button
            onClick={() => setStatusFilter('EMPIRICALLY_VERIFIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              statusFilter === 'EMPIRICALLY_VERIFIED'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Empirical
          </button>
        </div>
      </div>

      {/* 4. Documented Scenarios Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-5"
          >
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {scenario.id}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {scenario.category}
                  </span>
                  {getClaimBadge(scenario.claimClassification)}
                  {getStatusBadge(scenario.validationStatus)}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {scenario.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedScenario(scenario)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 rounded-xl text-xs font-semibold shadow-sm transition-colors shrink-0"
              >
                <span>View Full Evidence Spec</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Failure Condition */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-200">Failure Condition: </strong>
              {scenario.failureCondition}
            </p>

            {/* Comparison of Safe vs Unsafe Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Expected Safe Action
                </div>
                <div className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300">
                  {scenario.expectedSafeAction}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {scenario.expectedDiagnosis}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  Prevented Unsafe Action
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-300 leading-relaxed">
                  {scenario.expectedUnsafeAction}
                </p>
              </div>
            </div>

            {/* Documented Evidence Source */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {scenario.evidenceSource.institution}:
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {scenario.evidenceSource.docReference}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Published: {scenario.evidenceSource.publishedYear}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Regulatory Rigor Disclosure Notice */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 text-amber-500" />
          <span>Evaluation Integrity &amp; Methodological Transparency Notice</span>
        </div>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">
          RecoverOS AI clearly distinguishes between its synthetic quantitative benchmark, sandbox execution engine, and real-world documented validation. The 77.48% recovery rate is an evaluation metric computed on the 100-case synthetic dataset (Seed 42) relative to static baseline dunning. It does not represent a guaranteed production recovery rate for uncalibrated merchant payment traffic. Production recovery rates vary based on merchant industry, payment method mix, and issuer health profiles.
        </p>
      </div>

      {/* Detail Modal */}
      <ValidationEvidenceModal
        scenario={selectedScenario}
        onClose={() => setSelectedScenario(null)}
      />
    </div>
  );
};
