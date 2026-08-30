/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { SYNTHETIC_DATASET } from './data/syntheticDataset.ts';
import {
  BenchmarkEvaluationReport,
  CaseBenchmarkResult,
  runComparativeBenchmark,
} from './services/benchmarkEngine.ts';
import { globalAuditLedger } from './services/auditLedger.ts';
import { FailureCategory } from './types.ts';

// Components
import { Header } from './components/Header.tsx';
import { BenchmarkHeadline } from './components/BenchmarkHeadline.tsx';
import { ExecutiveKpiCards } from './components/ExecutiveKpiCards.tsx';
import { ComparisonView } from './components/ComparisonView.tsx';
import { CategoryAnalysis } from './components/CategoryAnalysis.tsx';
import { RecoveryPipeline } from './components/RecoveryPipeline.tsx';
import { AiDecisionPanel } from './components/AiDecisionPanel.tsx';
import { PolicySafetyPanel } from './components/PolicySafetyPanel.tsx';
import { AuditLedgerView } from './components/AuditLedgerView.tsx';
import { CaseExplorer } from './components/CaseExplorer.tsx';
import { CaseDetailModal } from './components/CaseDetailModal.tsx';
import { SafetyArchitectureFlow } from './components/SafetyArchitectureFlow.tsx';
import { LiveDemoCases } from './components/LiveDemoCases.tsx';
import { ExplainabilityPanel } from './components/ExplainabilityPanel.tsx';
import { BenchmarkMethodologyPanel } from './components/BenchmarkMethodologyPanel.tsx';
import { LimitationsHonestyPanel } from './components/LimitationsHonestyPanel.tsx';
import { RealWorldValidationPanel } from './components/RealWorldValidationPanel.tsx';
import { AiSafetyLabPanel } from './components/AiSafetyLabPanel.tsx';
import { WhyRecoverOsPanel } from './components/WhyRecoverOsPanel.tsx';
import { JudgeDemoExperience } from './components/JudgeDemoExperience.tsx';
import { ProductionWebhookPanel } from './components/ProductionWebhookPanel.tsx';
import { ProofCenterPanel } from './components/ProofCenterPanel.tsx';
import { Track03Demo } from './components/Track03Demo.tsx';
import { OperationsQueue } from './components/OperationsQueue.tsx';
import { ShieldCheck, RefreshCw, Layers } from 'lucide-react';


export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [report, setReport] = useState<BenchmarkEvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case_001');
  const [inspectModalCase, setInspectModalCase] = useState<CaseBenchmarkResult | null>(null);
  const [ledgerValid, setLedgerValid] = useState<boolean>(true);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Execute benchmark evaluation engine
  const executeBenchmark = useCallback(async () => {
    setIsLoading(true);
    try {
      const evaluationReport = await runComparativeBenchmark(SYNTHETIC_DATASET);
      setReport(evaluationReport);
      
      // Check ledger status
      const integrity = globalAuditLedger.verifyIntegrity();
      setLedgerValid(integrity.isValid);
      setTotalRecords(globalAuditLedger.getRecords().length);
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Demo Reset function: restore initial state without modifying dataset
  const handleResetDemo = useCallback(async () => {
    setSelectedCaseId('case_001');
    setInspectModalCase(null);
    setActiveTab('overview');
    await executeBenchmark();
  }, [executeBenchmark]);

  useEffect(() => {
    executeBenchmark();
  }, [executeBenchmark]);

  const handleSelectCaseFromResult = (caseResult: CaseBenchmarkResult) => {
    setSelectedCaseId(caseResult.caseId);
    setInspectModalCase(caseResult);
  };

  const handleSelectCategoryFromAnalysis = (category: FailureCategory) => {
    setActiveTab('explorer');
  };

  if (isLoading && !report) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-8 h-8 text-slate-950" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Initializing RecoverOS AI Benchmark</h2>
          <p className="text-xs text-slate-400">
            Evaluating 100 synthetic payment recovery cases with dual-entry SHA-256 audit ledger...
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p>Failed to initialize benchmark engine.</p>
      </div>
    );
  }

  const selectedCaseObj = report.caseResults.find((c) => c.caseId === selectedCaseId) || report.caseResults[0];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRecalculating={isLoading}
        onRerun={executeBenchmark}
        onResetDemo={handleResetDemo}
        ledgerValid={ledgerValid}
        totalRecords={totalRecords}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Prominent Benchmark Headline Banner */}
        <BenchmarkHeadline summary={report.summary} />

        {/* Tab 1: Executive Overview (The Complete Demo Journey) */}
        {(activeTab === 'overview' || activeTab === 'all') && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Safety Architecture Visual Flow */}
            <SafetyArchitectureFlow />

            {/* Live Demo Representative Cases */}
            <LiveDemoCases
              caseResults={report.caseResults}
              onSelectCase={(c) => {
                setSelectedCaseId(c.caseId);
              }}
              onOpenModal={(c) => {
                setInspectModalCase(c);
              }}
            />

            {/* Diagnostic Explainability */}
            <ExplainabilityPanel caseResult={selectedCaseObj} />

            {/* Executive KPIs */}
            <ExecutiveKpiCards summary={report.summary} />

            {/* Baseline vs RecoverOS Comparison */}
            <ComparisonView summary={report.summary} />

            {/* Recovery Pipeline */}
            <RecoveryPipeline
              caseResults={report.caseResults}
              onSelectCase={handleSelectCaseFromResult}
            />

            {/* Category Breakdown */}
            <CategoryAnalysis
              categoryBreakdown={report.categoryBreakdown}
              onSelectCategory={handleSelectCategoryFromAnalysis}
            />

            {/* Real-World Documented Validation Layer */}
            <RealWorldValidationPanel />

            {/* Methodology & Limitations Panels */}
            <div className="grid grid-cols-1 gap-8">
              <BenchmarkMethodologyPanel summary={report.summary} />
              <LimitationsHonestyPanel />
            </div>
          </div>
        )}

        {/* Tab: Track 03 Demo */}
        {activeTab === 'track03' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <Track03Demo />
          </div>
        )}

        {/* Tab: Proof Center (Institutional Proof & Verification Hub) */}
        {activeTab === 'proof-center' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <ProofCenterPanel
              report={report}
              onRefreshBenchmark={executeBenchmark}
            />
          </div>
        )}

        {/* Tab: Judge Guided Storytelling Tour */}
        {activeTab === 'story' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <JudgeDemoExperience
              caseResults={report.caseResults}
              onSelectCase={handleSelectCaseFromResult}
              onOpenModal={(c) => setInspectModalCase(c)}
            />
          </div>
        )}

        {/* Tab: Why RecoverOS & Architectural Comparison */}
        {activeTab === 'why-recoveros' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <WhyRecoverOsPanel />
          </div>
        )}

        {/* Tab: AI Output Sanitization & Policy Defense Lab */}
        {activeTab === 'safety-lab' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <AiSafetyLabPanel />
          </div>
        )}

        {/* Tab: Webhook Ingestion & Production Gateways */}
        {activeTab === 'webhooks' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <ProductionWebhookPanel />
          </div>
        )}

        {/* Tab: Operations Queue */}
        {activeTab === 'operations' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <OperationsQueue />
          </div>
        )}

        {/* Tab 2: Live Demo Cases & Explainability */}
        {activeTab === 'demo' && (

          <div className="space-y-8 animate-in fade-in duration-150">
            <SafetyArchitectureFlow />
            <LiveDemoCases
              caseResults={report.caseResults}
              onSelectCase={(c) => {
                setSelectedCaseId(c.caseId);
              }}
              onOpenModal={(c) => {
                setInspectModalCase(c);
              }}
            />
            <ExplainabilityPanel caseResult={selectedCaseObj} />
          </div>
        )}

        {/* Tab 3: Real-World Documented Validation Layer */}
        {activeTab === 'validation' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <RealWorldValidationPanel />
          </div>
        )}

        {/* Tab 4: Baseline vs RecoverOS Comparison */}
        {activeTab === 'comparison' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <ComparisonView summary={report.summary} />
            <ExecutiveKpiCards summary={report.summary} />
            <BenchmarkMethodologyPanel summary={report.summary} />
          </div>
        )}

        {/* Tab 4: Failure Categories */}
        {activeTab === 'categories' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <CategoryAnalysis
              categoryBreakdown={report.categoryBreakdown}
              onSelectCategory={handleSelectCategoryFromAnalysis}
            />
          </div>
        )}

        {/* Tab 5: Recovery Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <RecoveryPipeline
              caseResults={report.caseResults}
              onSelectCase={handleSelectCaseFromResult}
            />
          </div>
        )}

        {/* Tab 6: AI Decision Panel */}
        {activeTab === 'ai-decision' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <AiDecisionPanel
              caseResults={report.caseResults}
              selectedCaseId={selectedCaseId}
              onSelectCaseId={setSelectedCaseId}
            />
            <ExplainabilityPanel caseResult={selectedCaseObj} />
          </div>
        )}

        {/* Tab 7: Policy Safety Panel */}
        {activeTab === 'policy' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <SafetyArchitectureFlow />
            <PolicySafetyPanel caseResults={report.caseResults} />
          </div>
        )}

        {/* Tab 8: Audit Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <AuditLedgerView
              onSelectCase={(id) => {
                setSelectedCaseId(id);
                const found = report.caseResults.find((c) => c.caseId === id);
                if (found) setInspectModalCase(found);
              }}
            />
          </div>
        )}

        {/* Tab 9: 100-Case Explorer */}
        {activeTab === 'explorer' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <CaseExplorer
              caseResults={report.caseResults}
              onSelectCase={handleSelectCaseFromResult}
              selectedCaseId={selectedCaseId}
            />
          </div>
        )}

        {/* Tab 10: Methodology & Honesty */}
        {activeTab === 'methodology' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <BenchmarkMethodologyPanel summary={report.summary} />
            <LimitationsHonestyPanel />
            <SafetyArchitectureFlow />
          </div>
        )}
      </main>

      {/* Case Detail Modal */}
      <CaseDetailModal
        caseResult={inspectModalCase}
        onClose={() => setInspectModalCase(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RecoverOS AI • Autonomous Payment Failure Recovery &amp; Revenue Engine</span>
          <span>100-Case Benchmark Dataset (Seed 42) • Dual-Entry SHA-256 Chained Ledger • Sandbox Simulator</span>
        </div>
      </footer>
    </div>
  );
}
