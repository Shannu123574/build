/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { SYNTHETIC_DATASET, generateSyntheticDataset } from '../data/syntheticDataset.ts';
import { runComparativeBenchmark } from './benchmarkEngine.ts';

async function verify() {
  console.log('===================================================================');
  console.log('=== AUTHORITATIVE BENCHMARK INTEGRITY & DETERMINISM AUDIT ===');
  console.log('===================================================================');

  // Compute dataset SHA-256 hash
  const datasetJson = JSON.stringify(SYNTHETIC_DATASET);
  const datasetSha256 = crypto.createHash('sha256').update(datasetJson).digest('hex');

  console.log(`Dataset Seed:                 42`);
  console.log(`Total Cases:                  ${SYNTHETIC_DATASET.length}`);
  console.log(`Dataset SHA-256 Hash:         ${datasetSha256}`);

  // Category counts & risk
  const categoryCounts: Record<string, { count: number; totalInr: number }> = {};
  let totalRevenueAtRiskInr = 0;

  for (const c of SYNTHETIC_DATASET) {
    totalRevenueAtRiskInr += c.amountInr;
    if (!categoryCounts[c.groundTruthCategory]) {
      categoryCounts[c.groundTruthCategory] = { count: 0, totalInr: 0 };
    }
    categoryCounts[c.groundTruthCategory].count++;
    categoryCounts[c.groundTruthCategory].totalInr += c.amountInr;
  }

  console.log('\n--- CATEGORY DISTRIBUTION ---');
  for (const [cat, data] of Object.entries(categoryCounts)) {
    console.log(`  ${cat.padEnd(30)}: ${data.count} cases | ₹${data.totalInr.toLocaleString('en-IN')}`);
  }
  console.log(`  Total Revenue at Risk:        ₹${totalRevenueAtRiskInr.toLocaleString('en-IN')}`);

  console.log('\n--- RUNNING 3 INDEPENDENT BENCHMARK RUNS FOR DETERMINISM PROOF ---');
  const run1 = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });
  const run2 = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });
  const run3 = await runComparativeBenchmark(SYNTHETIC_DATASET, { useAiDiagnosis: false });

  const getReportPayloadHash = (r: typeof run1) => {
    return crypto.createHash('sha256').update(JSON.stringify({
      summary: r.summary,
      caseResults: r.caseResults,
      categoryBreakdown: r.categoryBreakdown,
    })).digest('hex');
  };

  const run1Hash = getReportPayloadHash(run1);
  const run2Hash = getReportPayloadHash(run2);
  const run3Hash = getReportPayloadHash(run3);

  console.log(`Run 1 Report Payload SHA-256 Hash: ${run1Hash}`);
  console.log(`Run 2 Report Payload SHA-256 Hash: ${run2Hash}`);
  console.log(`Run 3 Report Payload SHA-256 Hash: ${run3Hash}`);
  console.log(`Bit-for-Bit Determinism Check:      ${run1Hash === run2Hash && run2Hash === run3Hash ? 'PERFECT MATCH (100% IDENTICAL)' : 'MISMATCH'}`);

  const s = run1.summary;
  console.log('\n--- EXACT AUTHORITATIVE BENCHMARK METRICS (SEED 42) ---');
  console.log(`Total Cases:                    ${s.totalCases}`);
  console.log(`Total Revenue At Risk:          ₹${s.totalRevenueAtRiskInr.toLocaleString('en-IN')}`);
  console.log(`Baseline Recovered Cases:       ${s.baselineCasesRecovered} / ${s.totalCases} (${((s.baselineCasesRecovered / s.totalCases) * 100).toFixed(1)}%)`);
  console.log(`Baseline Revenue Recovered:     ₹${s.baselineRevenueRecoveredInr.toLocaleString('en-IN')} (${s.baselineRecoveryRatePercent}%)`);
  console.log(`Baseline Intervention Cost:     ₹${s.baselineInterventionCostsInr.toFixed(2)}`);
  console.log(`Baseline Net Profit:            ₹${s.baselineNetProfitInr.toLocaleString('en-IN')}`);
  console.log(`Baseline Spam Messages Sent:    ${s.baselineSpamMessagesSent}`);
  console.log('-------------------------------------------------------------------');
  console.log(`RecoverOS Recovered Cases:      ${s.aiCasesRecovered} / ${s.totalCases} (${((s.aiCasesRecovered / s.totalCases) * 100).toFixed(1)}%)`);
  console.log(`RecoverOS Revenue Recovered:    ₹${s.aiRevenueRecoveredInr.toLocaleString('en-IN')} (${s.aiRecoveryRatePercent}%)`);
  console.log(`RecoverOS Intervention Cost:    ₹${s.aiInterventionCostsInr.toFixed(2)}`);
  console.log(`RecoverOS Net Profit:           ₹${s.aiNetProfitInr.toLocaleString('en-IN')}`);
  console.log(`RecoverOS Outreach Messages:    ${s.aiSpamMessagesSent}`);
  console.log('-------------------------------------------------------------------');
  console.log(`Incremental Revenue Lift:       +₹${s.incrementalRevenueRecoveredInr.toLocaleString('en-IN')}`);
  console.log(`Incremental Net Profit Lift:    +₹${s.incrementalNetProfitInr.toLocaleString('en-IN')}`);
  console.log(`Recovery Rate Lift:             +${s.incrementalRecoveryRateLiftPercent}% percentage points`);
  console.log(`Revenue Multiple:               ${(s.aiRevenueRecoveredInr / s.baselineRevenueRecoveredInr).toFixed(2)}x`);
  console.log(`Outreach Spam Reduction:        -${s.spamReductionPercent}%`);
  console.log('===================================================================');

  console.log('\n--- CATEGORY BREAKDOWN IN BENCHMARK OUTCOME ---');
  for (const [cat, data] of Object.entries(run1.categoryBreakdown)) {
    console.log(`  [${cat}]`);
    console.log(`     Count: ${data.count} | Total at Risk: ₹${data.totalAtRiskInr.toLocaleString('en-IN')}`);
    console.log(`     Baseline: ${data.baselineCasesRecovered}/${data.count} recovered (₹${data.baselineRecoveredInr.toLocaleString('en-IN')})`);
    console.log(`     RecoverOS: ${data.aiCasesRecovered}/${data.count} recovered (₹${data.aiRecoveredInr.toLocaleString('en-IN')})`);
  }
}

verify();
