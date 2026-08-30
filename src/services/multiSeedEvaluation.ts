/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateSyntheticDataset } from '../data/syntheticDataset.ts';
import { runComparativeBenchmark } from './benchmarkEngine.ts';

export async function runMultiSeedEvaluation() {
  const seeds = [42, 1337, 2026, 8675309, 9999, 12345];
  console.log(`Running Multi-Seed Evaluation for seeds: ${seeds.join(', ')}...`);

  const results = [];

  for (const seed of seeds) {
    const dataset = generateSyntheticDataset(seed, 100);
    // Ablation 1: Deterministic Fallback Only
    const fallbackReport = await runComparativeBenchmark(dataset, { useAiDiagnosis: false });
    // Ablation 2: Gemini + Deterministic
    const aiReport = await runComparativeBenchmark(dataset, { useAiDiagnosis: true });

    results.push({
      seed,
      fallbackRecoveryRate: fallbackReport.summary.aiRecoveryRatePercent,
      aiRecoveryRate: aiReport.summary.aiRecoveryRatePercent,
      fallbackNetRevenue: fallbackReport.summary.aiNetProfitInr,
      aiNetRevenue: aiReport.summary.aiNetProfitInr,
      baselineRecoveryRate: aiReport.summary.baselineRecoveryRatePercent,
      baselineNetRevenue: aiReport.summary.baselineNetProfitInr,
    });
  }

  const aiRecoveryRates = results.map(r => r.aiRecoveryRate);
  const mean = aiRecoveryRates.reduce((a, b) => a + b, 0) / aiRecoveryRates.length;
  
  const sorted = [...aiRecoveryRates].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = aiRecoveryRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / aiRecoveryRates.length;
  const stdDev = Math.sqrt(variance);
  const worstCase = sorted[0];

  console.log('--- Multi-Seed Results ---');
  results.forEach(r => {
    console.log(`Seed ${r.seed}: AI Recovery ${r.aiRecoveryRate}% | Fallback ${r.fallbackRecoveryRate}% | Baseline ${r.baselineRecoveryRate}%`);
  });

  let passed = 0;
  let failed = 0;

  if (mean > 60) {
    passed++;
  } else {
    console.error(`❌ Mean AI recovery too low: ${mean.toFixed(2)}%`);
    failed++;
  }

  if (worstCase > 50) {
    passed++;
  } else {
    console.error(`❌ Worst-case AI recovery too low: ${worstCase.toFixed(2)}%`);
    failed++;
  }

  const fallbackEqualsAi = results.every(r => r.fallbackRecoveryRate === r.aiRecoveryRate);
  if (fallbackEqualsAi) {
    passed++;
  } else {
    console.error(`❌ Fallback does not equal AI when API key is absent`);
    failed++;
  }

  console.log(`\nTotal Tests: 3`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('multiSeedEvaluation.ts')) {
    if (failed > 0) {
      process.exit(1);
    }
    // Success - process exits 0 naturally
  }

  return { passed, failed };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('multiSeedEvaluation.ts')) {
  runMultiSeedEvaluation().catch(err => {
    console.error('Failed to run multi-seed evaluation:', err);
    process.exit(1);
  });
}
