/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pathToFileURL as urlHelper } from 'node:url';
import { runJudgeDemoScenario } from './judgeDemoWorkflow.ts';
import assert from 'assert';

async function runTests() {
  console.log('Running Judge Demo Workflow Tests...');
  let passed = 0;
  let failed = 0;

  try {
    const run = await runJudgeDemoScenario('VERIFIED_SANDBOX_RECOVERY');
    
    if (!run.result.gatewayExecution) {
      console.log('DEBUG result:', JSON.stringify(run.result, null, 2));
    }

    assert.ok(run.result.gatewayExecution, 'Gateway execution should exist');
    assert.strictEqual(run.result.gatewayExecution.status, 'SUCCESS', 'Status should be SUCCESS');
    assert.ok(run.result.gatewayExecution.amountRecoveredInr > 0, 'Amount recovered should be > 0');
    assert.strictEqual(run.ledgerIntegrity.isValid, true, 'Ledger integrity should be valid');

    console.log('✅ VERIFIED_SANDBOX_RECOVERY executes successfully and recovers money');
    passed++;
  } catch (err: any) {
    console.error('❌ VERIFIED_SANDBOX_RECOVERY failed:', err.message);
    failed++;
  }

  console.log(`\nTotal Tests: 1`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  const isDirectExecution = process.argv[1] && import.meta.url === urlHelper(process.argv[1]).href;
  if (isDirectExecution || process.argv[1].endsWith('testJudgeDemo.ts')) {
    if (failed > 0) {
      process.exit(1);
    }
  }
}

const isTopLevelExecution = process.argv[1] && import.meta.url === urlHelper(process.argv[1]).href;

if (isTopLevelExecution || process.argv[1].endsWith('testJudgeDemo.ts')) {
  runTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
