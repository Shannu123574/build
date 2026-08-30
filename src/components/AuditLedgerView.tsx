/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { globalAuditLedger } from '../services/auditLedger.ts';
import { LedgerRecord } from '../types.ts';
import { formatINR, formatINRDecimals } from '../utils/formatters.ts';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  Hash,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Filter,
} from 'lucide-react';

interface AuditLedgerViewProps {
  onSelectCase?: (caseId: string) => void;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({ onSelectCase }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const records = globalAuditLedger.getRecords();
  const integrity = globalAuditLedger.verifyIntegrity();
  const totals = globalAuditLedger.getTotals();

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        r.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.razorpayReferenceId && r.razorpayReferenceId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [records, searchTerm, statusFilter]);

  return (
    <section id="audit-ledger-section" className="space-y-4">
      {/* Header & Verification Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            Immutable Dual-Entry Cryptographic Audit Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Append-only financial transaction ledger chained via sequential SHA-256 hashes.
          </p>
        </div>

        {/* Cryptographic Verification Badge */}
        <div
          id="ledger-integrity-status-badge"
          className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold ${
            integrity.isValid
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {integrity.isValid ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>
            {integrity.isValid
              ? `SHA-256 Hash Chain Valid (${integrity.verifiedRecordsCount}/${records.length} Verified)`
              : `Tamper Detected: ${integrity.error}`}
          </span>
        </div>
      </div>

      {/* Financial Aggregates Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Total Debit at Risk</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {formatINR(totals.totalDebitAtRiskInr)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Credit Recovered</div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatINR(totals.totalCreditRecoveredInr)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Intervention Costs</div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            ₹{(totals?.totalCostIncurredInr ?? 0).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Net Ledger Balance</div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatINR(totals.totalNetImpactInr)}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="audit-ledger-search"
            type="text"
            placeholder="Search by case ID, action, reference ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            id="audit-ledger-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Transactions ({records.length})</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table id="audit-ledger-table" className="w-full text-xs text-left">
            <thead className="text-[10px] uppercase bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5">Idx</th>
                <th className="px-3 py-2.5">Case ID</th>
                <th className="px-3 py-2.5">Action Executed</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5 text-right">Debit At Risk</th>
                <th className="px-3 py-2.5 text-right">Credit Recovered</th>
                <th className="px-3 py-2.5 text-right">Cost</th>
                <th className="px-3 py-2.5 text-right">Net Impact</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5">SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400 font-sans">
                    No ledger transactions match search criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isExpanded = expandedRow === r.index;
                  return (
                    <React.Fragment key={r.index}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : r.index)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-slate-50 dark:bg-slate-800/60' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-bold text-slate-400">{r.index}</td>
                        <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectCase) onSelectCase(r.caseId);
                            }}
                            className="hover:text-emerald-500 hover:underline cursor-pointer"
                          >
                            {r.caseId}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                          <span className="truncate max-w-[150px] inline-block font-sans text-xs">
                            {r.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 font-sans text-[10px]">
                          {r.actor}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                          ₹{r.debitAtRiskInr.toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-bold ${
                            r.creditRecoveredInr > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          ₹{r.creditRecoveredInr.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                          ₹{r.costIncurredInr.toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-bold ${
                            r.netImpactInr > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : r.netImpactInr < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          ₹{r.netImpactInr.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              r.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : r.status === 'BLOCKED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-400 truncate max-w-[100px]">
                          {r.currentHash.substring(0, 12)}...
                        </td>
                      </tr>

                      {/* Expandable Cryptographic Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-100/60 dark:bg-slate-950/60 font-mono text-[10px]">
                          <td colSpan={10} className="p-3">
                            <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div className="flex flex-col sm:flex-row sm:justify-between text-slate-500 gap-1">
                                <div>
                                  <strong className="text-slate-700 dark:text-slate-300">Payload Summary:</strong>{' '}
                                  <span className="font-sans">{r.payloadSummary}</span>
                                </div>
                                <div>
                                  <strong className="text-slate-700 dark:text-slate-300">Gateway Ref:</strong>{' '}
                                  {r.razorpayReferenceId || 'N/A'}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                  <span className="text-slate-400 block">Previous Hash (H_prev):</span>
                                  <span className="text-slate-600 dark:text-slate-400 break-all">
                                    {r.previousHash}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Current Hash (H_curr):</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 break-all">
                                    {r.currentHash}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
