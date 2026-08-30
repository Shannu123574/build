/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ADVERSARIAL_SAFETY_SCENARIOS,
  runAdversarialTest,
} from './aiSafetyLab.ts';

async function runAiSafetyTests() {
  console.log('===================================================================');
  console.log('=== PHASE 10 AI OUTPUT SANITIZATION & POLICY DEFENSE LAB (5/5) ===');
  console.log('===================================================================');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < ADVERSARIAL_SAFETY_SCENARIOS.length; i++) {
    const scenario = ADVERSARIAL_SAFETY_SCENARIOS[i];
    try {
      const res = runAdversarialTest(scenario);

      if (res.passedSafetyHurdle) {
        passed++;
        console.log(`[✓] Test 0${i + 1}: ${scenario.name}`);
        console.log(`    Attack Vector: ${scenario.attackVector.slice(0, 75)}...`);
        console.log(`    Defense Gate: PASS -> ${scenario.expectedDefenseOutcome.safetyGuarantee}`);
      } else {
        failed++;
        console.error(`[✗] Test 0${i + 1} Failed for scenario ${scenario.id}:`, res);
      }
    } catch (err) {
      failed++;
      console.error(`[✗] Test 0${i + 1} Error:`, err);
    }
  }

  console.log('-------------------------------------------------------------------');
  console.log(`SUMMARY: Total Tests: 5 | Passed: ${passed} | Failed: ${failed}`);
  console.log('-------------------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runAiSafetyTests();
