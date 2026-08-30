/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';
import { CaseBenchmarkResult, FailureCategory, PaymentMethodType } from '../types.ts';
import { ACTION_META, CATEGORY_META, formatINR, METHOD_LABELS } from '../utils/formatters.ts';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  Eye,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';

interface CaseExplorerProps {
  caseResults: CaseBenchmarkResult[];
  onSelectCase: (caseResult: CaseBenchmarkResult) => void;
  selectedCaseId?: string;
}

export const CaseExplorer: React.FC<CaseExplorerProps> = ({
  caseResults,
  onSelectCase,
  selectedCaseId,
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [recoverableFilter, setRecoverableFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [policyFilter, setPolicyFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');

  // Sorting
  const [sortBy, setSortBy] = useState<'id' | 'amount' | 'bankScore'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Combine results with dataset metadata
  const datasetMap = useMemo(() => {
    const map = new Map<string, (typeof SYNTHETIC_DATASET)[0]>();
    for (const item of SYNTHETIC_DATASET) {
      map.set(item.id, item);
    }
    return map;
  }, []);

  // Compute counts dynamically
  const counts = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    let recoverableCount = 0;
    let nonRecoverableCount = 0;
    let policyApprovedCount = 0;
    let policyDeniedCount = 0;
    let recoveredCount = 0;
    let notRecoveredCount = 0;

    for (const c of caseResults) {
      categoryCounts[c.groundTruthCategory] = (categoryCounts[c.groundTruthCategory] || 0) + 1;
      if (c.isRecoverable) recoverableCount++;
      else nonRecoverableCount++;

      if (c.recoveros.policy.approved) policyApprovedCount++;
      else policyDeniedCount++;

      if (c.recoveros.recovered) recoveredCount++;
      else notRecoveredCount++;
    }

    return {
      categoryCounts,
      recoverableCount,
      nonRecoverableCount,
      policyApprovedCount,
      policyDeniedCount,
      recoveredCount,
      notRecoveredCount,
    };
  }, [caseResults]);

  const filteredCases = useMemo(() => {
    return caseResults.filter((res) => {
      const meta = datasetMap.get(res.caseId);

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = res.caseId.toLowerCase().includes(term);
        const matchesCat = res.groundTruthCategory.toLowerCase().includes(term);
        const matchesCustomer = meta?.customerName.toLowerCase().includes(term) || false;
        const matchesEmail = meta?.customerEmail.toLowerCase().includes(term) || false;
        const matchesBank = meta?.issuingBank?.toLowerCase().includes(term) || false;
        const matchesError = meta?.errorCode.toLowerCase().includes(term) || false;

        if (!matchesId && !matchesCat && !matchesCustomer && !matchesEmail && !matchesBank && !matchesError) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL' && res.groundTruthCategory !== categoryFilter) {
        return false;
      }

      // Recoverability filter
      if (recoverableFilter === 'RECOVERABLE' && !res.isRecoverable) return false;
      if (recoverableFilter === 'NON_RECOVERABLE' && res.isRecoverable) return false;

      // Method filter
      if (methodFilter !== 'ALL' && meta?.paymentMethod !== methodFilter) {
        return false;
      }

      // Policy filter
      if (policyFilter === 'APPROVED' && !res.recoveros.policy.approved) return false;
      if (policyFilter === 'DENIED' && res.recoveros.policy.approved) return false;

      // Outcome filter
      if (outcomeFilter === 'RECOVERED' && !res.recoveros.recovered) return false;
      if (outcomeFilter === 'NOT_RECOVERED' && res.recoveros.recovered) return false;
      if (outcomeFilter === 'BASELINE_ONLY' && (!res.baseline.recovered || res.recoveros.recovered)) return false;

      return true;
    }).sort((a, b) => {
      const metaA = datasetMap.get(a.caseId);
      const metaB = datasetMap.get(b.caseId);

      let compare = 0;
      if (sortBy === 'id') {
        compare = a.caseId.localeCompare(b.caseId);
      } else if (sortBy === 'amount') {
        compare = a.amountInr - b.amountInr;
      } else if (sortBy === 'bankScore') {
        compare = (metaA?.bankHealthScore || 0) - (metaB?.bankHealthScore || 0);
      }

      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [
    caseResults,
    datasetMap,
    searchTerm,
    categoryFilter,
    recoverableFilter,
    methodFilter,
    policyFilter,
    outcomeFilter,
    sortBy,
    sortOrder,
  ]);

  return (
    <section id="case-explorer-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            100-Case Evaluation Explorer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive multi-dimensional dataset browser with real simulated telemetry and policy outputs.
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
          Showing {filteredCases.length} of {caseResults.length} cases
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        {/* Search bar & Sort Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="case-explorer-search-input"
              type="text"
              placeholder="Search by case ID, customer name, bank, error code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Sort by:</span>
            <select
              id="case-explorer-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="id">Case ID</option>
              <option value="amount">Amount (INR)</option>
              <option value="bankScore">Bank Health</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Granular Filter Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Category */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Category
            </label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Categories ({caseResults.length})</option>
              <option value="TEMPORARY_ISSUER_OUTAGE">Temporary Outage ({counts.categoryCounts['TEMPORARY_ISSUER_OUTAGE'] || 0})</option>
              <option value="INSUFFICIENT_FUNDS_TRANSIENT">Low Funds / Salary ({counts.categoryCounts['INSUFFICIENT_FUNDS_TRANSIENT'] || 0})</option>
              <option value="EXPIRED_INSTRUMENT">Expired Instrument ({counts.categoryCounts['EXPIRED_INSTRUMENT'] || 0})</option>
              <option value="AUTHENTICATION_ABANDONMENT">Abandonment ({counts.categoryCounts['AUTHENTICATION_ABANDONMENT'] || 0})</option>
              <option value="FRAUD_SUSPICION_HIGH">Fraud Suspicion ({counts.categoryCounts['FRAUD_SUSPICION_HIGH'] || 0})</option>
              <option value="GATEWAY_TIMEOUT">Gateway Timeout ({counts.categoryCounts['GATEWAY_TIMEOUT'] || 0})</option>
            </select>
          </div>

          {/* Recoverability */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Recoverability
            </label>
            <select
              id="filter-recoverable"
              value={recoverableFilter}
              onChange={(e) => setRecoverableFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Cases ({caseResults.length})</option>
              <option value="RECOVERABLE">Recoverable ({counts.recoverableCount})</option>
              <option value="NON_RECOVERABLE">Non-Recoverable / Fraud ({counts.nonRecoverableCount})</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Method
            </label>
            <select
              id="filter-method"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="mandate">e-NACH Mandate</option>
              <option value="netbanking">Net Banking</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>

          {/* Policy Status */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Policy Gate
            </label>
            <select
              id="filter-policy"
              value={policyFilter}
              onChange={(e) => setPolicyFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Evaluations ({caseResults.length})</option>
              <option value="APPROVED">Approved ({counts.policyApprovedCount})</option>
              <option value="DENIED">Denied / Fraud ({counts.policyDeniedCount})</option>
            </select>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Recovery Outcome
            </label>
            <select
              id="filter-outcome"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Outcomes ({caseResults.length})</option>
              <option value="RECOVERED">RecoverOS Recovered ({counts.recoveredCount})</option>
              <option value="NOT_RECOVERED">RecoverOS Failed/Blocked ({counts.notRecoveredCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table id="cases-explorer-table" className="w-full text-xs text-left">
            <thead className="text-[10px] uppercase bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3">Case ID</th>
                <th className="px-3 py-3">Customer & Telemetry</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">AI Proposed Action</th>
                <th className="px-3 py-3 text-center">Policy Gate</th>
                <th className="px-3 py-3 text-center">Baseline</th>
                <th className="px-3 py-3 text-center">RecoverOS</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No cases match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const meta = datasetMap.get(c.caseId);
                  const cat = CATEGORY_META[c.groundTruthCategory];
                  const action = ACTION_META[c.recoveros.diagnosis?.suggestedAction || 'SMART_RETRY_SCHEDULE'];
                  const isSelected = selectedCaseId === c.caseId;

                  return (
                    <tr
                      key={c.caseId}
                      onClick={() => onSelectCase(c)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                      }`}
                    >
                      {/* Case ID */}
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {c.caseId}
                      </td>

                      {/* Customer & Telemetry */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {meta?.customerName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{meta?.issuingBank || 'Bank'}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{meta?.paymentMethod}</span>
                          <span>•</span>
                          <span>Day {meta?.dayOfMonth}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">
                        {formatINR(c.amountInr)}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${cat?.badgeBg}`}>
                          {cat?.label}
                        </span>
                      </td>

                      {/* AI Proposed Action */}
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${action?.badgeClass}`}>
                          {action?.label}
                        </span>
                      </td>

                      {/* Policy Gate */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.recoveros.policy.approved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {c.recoveros.policy.approved ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {c.recoveros.policy.approved ? 'APPROVED' : 'DENIED'}
                        </span>
                      </td>

                      {/* Baseline */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            c.baseline.recovered ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {c.baseline.recovered ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {c.baseline.recovered ? 'Recovered' : 'Failed'}
                        </span>
                      </td>

                      {/* RecoverOS */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            c.recoveros.recovered
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : c.recoveros.policy.approved
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {c.recoveros.recovered ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : c.recoveros.policy.approved ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                          {c.recoveros.recovered
                            ? 'Recovered'
                            : c.recoveros.policy.approved
                            ? 'Exhausted'
                            : 'Policy Blocked'}
                        </span>
                      </td>

                      {/* Inspect Action */}
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
