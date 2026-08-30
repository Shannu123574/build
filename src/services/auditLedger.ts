/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sha256 } from './cryptoUtils.ts';
import { LedgerRecord } from '../types.ts';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function computeRecordHash(
  index: number,
  previousHash: string,
  caseId: string,
  action: string,
  actor: string,
  debitAtRiskInr: number,
  creditRecoveredInr: number,
  costIncurredInr: number,
  netImpactInr: number,
  status: string,
  timestamp: number
): string {
  const payload = `${index}|${previousHash}|${caseId}|${action}|${actor}|${debitAtRiskInr.toFixed(2)}|${creditRecoveredInr.toFixed(2)}|${costIncurredInr.toFixed(2)}|${netImpactInr.toFixed(2)}|${status}|${timestamp}`;
  return sha256(payload);
}

export class AuditLedger {
  private records: LedgerRecord[] = [];

  constructor() {
    this.records = [];
  }

  /**
   * Appends an immutable, SHA-256 hash-chained entry to the dual-entry recovery ledger.
   */
  append(params: {
    caseId: string;
    action: string;
    actor: 'SYSTEM_POLICY' | 'RAZORPAY_GATEWAY' | 'RECONCILER' | 'SIMULATOR';
    debitAtRiskInr?: number;
    creditRecoveredInr?: number;
    costIncurredInr?: number;
    razorpayReferenceId?: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'BLOCKED';
    payloadSummary: string;
    customTimestamp?: number;
  }): LedgerRecord {
    const index = this.records.length;
    const previousHash = index === 0 ? GENESIS_HASH : this.records[index - 1].currentHash;
    const timestamp = params.customTimestamp ?? Date.now();

    const debitAtRiskInr = params.debitAtRiskInr ?? 0;
    const creditRecoveredInr = params.creditRecoveredInr ?? 0;
    const costIncurredInr = params.costIncurredInr ?? 0;
    const netImpactInr = creditRecoveredInr - costIncurredInr;

    const currentHash = computeRecordHash(
      index,
      previousHash,
      params.caseId,
      params.action,
      params.actor,
      debitAtRiskInr,
      creditRecoveredInr,
      costIncurredInr,
      netImpactInr,
      params.status,
      timestamp
    );

    const record: LedgerRecord = {
      index,
      previousHash,
      currentHash,
      caseId: params.caseId,
      action: params.action,
      actor: params.actor,
      debitAtRiskInr,
      creditRecoveredInr,
      costIncurredInr,
      netImpactInr,
      razorpayReferenceId: params.razorpayReferenceId,
      status: params.status,
      payloadSummary: params.payloadSummary,
      timestamp,
    };

    this.records.push(record);
    return record;
  }

  /**
   * Returns all recorded ledger transactions.
   */
  getRecords(): LedgerRecord[] {
    return [...this.records];
  }

  /**
   * Returns running financial aggregates from the ledger.
   */
  getTotals() {
    let totalDebitAtRisk = 0;
    let totalCreditRecovered = 0;
    let totalCostIncurred = 0;
    let totalNetImpact = 0;
    let successfulRecoveriesCount = 0;
    let blockedFraudCount = 0;

    for (const r of this.records) {
      totalDebitAtRisk += r.debitAtRiskInr;
      totalCreditRecovered += r.creditRecoveredInr;
      totalCostIncurred += r.costIncurredInr;
      totalNetImpact += r.netImpactInr;
      if (r.status === 'SUCCESS' && r.creditRecoveredInr > 0) {
        successfulRecoveriesCount++;
      }
      if (r.status === 'BLOCKED') {
        blockedFraudCount++;
      }
    }

    return {
      recordCount: this.records.length,
      totalDebitAtRiskInr: parseFloat(totalDebitAtRisk.toFixed(2)),
      totalCreditRecoveredInr: parseFloat(totalCreditRecovered.toFixed(2)),
      totalCostIncurredInr: parseFloat(totalCostIncurred.toFixed(2)),
      totalNetImpactInr: parseFloat(totalNetImpact.toFixed(2)),
      successfulRecoveriesCount,
      blockedFraudCount,
    };
  }

  /**
   * Cryptographically verifies the entire SHA-256 hash chain from Genesis to tip.
   * Proves zero retroactive tampering of financial recovery logs.
   */
  verifyIntegrity(): {
    isValid: boolean;
    verifiedRecordsCount: number;
    error?: string;
  } {
    if (this.records.length === 0) {
      return { isValid: true, verifiedRecordsCount: 0 };
    }

    for (let i = 0; i < this.records.length; i++) {
      const rec = this.records[i];

      // Check 1: Index integrity
      if (rec.index !== i) {
        return {
          isValid: false,
          verifiedRecordsCount: i,
          error: `Index mismatch at position ${i}: expected ${i}, found ${rec.index}`,
        };
      }

      // Check 2: Previous hash link
      const expectedPrevHash = i === 0 ? GENESIS_HASH : this.records[i - 1].currentHash;
      if (rec.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          verifiedRecordsCount: i,
          error: `Broken hash chain at record ${i}: previousHash '${rec.previousHash}' does not match record ${i - 1} currentHash '${expectedPrevHash}'`,
        };
      }

      // Check 3: Current hash recalculation
      const recomputedHash = computeRecordHash(
        rec.index,
        rec.previousHash,
        rec.caseId,
        rec.action,
        rec.actor,
        rec.debitAtRiskInr,
        rec.creditRecoveredInr,
        rec.costIncurredInr,
        rec.netImpactInr,
        rec.status,
        rec.timestamp
      );

      if (rec.currentHash !== recomputedHash) {
        return {
          isValid: false,
          verifiedRecordsCount: i,
          error: `Hash validation failure at record ${i}: recorded '${rec.currentHash}', computed '${recomputedHash}'`,
        };
      }
    }

    return {
      isValid: true,
      verifiedRecordsCount: this.records.length,
    };
  }

  /**
   * Resets ledger records (for test isolation).
   */
  clear() {
    this.records = [];
  }
}

/**
 * Singleton global ledger instance for RecoverOS runtime.
 */
export const globalAuditLedger = new AuditLedger();
