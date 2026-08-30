/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  activeSandboxAdapter,
  productionAdapterStub,
  getActiveGatewayAdapter,
} from './paymentGatewayAdapter.ts';
import { SYNTHETIC_DATASET } from '../data/syntheticDataset.ts';

async function runGatewayAdapterTests() {
  console.log('===================================================================');
  console.log('=== PHASE 8 PAYMENT GATEWAY ADAPTER TEST SUITE (6/6 TESTS) ===');
  console.log('===================================================================');

  let passed = 0;
  let failed = 0;

  const testCase = SYNTHETIC_DATASET[0]; // case_001

  // Test 1: Sandbox Adapter Environment State
  try {
    const adapter = getActiveGatewayAdapter();
    if (adapter.environment === 'DEMO_SANDBOX') {
      passed++;
      console.log('[✓] Test 01: Sandbox Adapter Environment State');
      console.log('    Details: PASS: Active adapter initialized in DEMO_SANDBOX state');
    } else {
      failed++;
      console.error('[✗] Test 01 Failed: expected DEMO_SANDBOX, got', adapter.environment);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 01 Error:', err);
  }

  // Test 2: Sandbox Payment Retry Execution
  try {
    const res = await activeSandboxAdapter.executePaymentRetry(
      {
        caseId: testCase.id,
        razorpayPaymentId: testCase.razorpayPaymentId,
        amountInr: testCase.amountInr,
        customerEmail: testCase.customerEmail,
        customerPhone: testCase.customerPhone,
        paymentMethod: testCase.paymentMethod,
        delayMinutes: 60,
        idempotencyKey: `test_gw_retry_${testCase.id}`,
      },
      testCase
    );

    if (res.actionExecuted === 'SMART_RETRY_SCHEDULE' && res.referenceId && res.status) {
      passed++;
      console.log('[✓] Test 02: Sandbox Payment Retry Execution');
      console.log(`    Details: PASS: Executed retry (status: ${res.status}, ref: ${res.referenceId}, recovered: ₹${res.amountRecoveredInr})`);
    } else {
      failed++;
      console.error('[✗] Test 02 Failed: unexpected execution response', res);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 02 Error:', err);
  }

  // Test 3: Sandbox UPI Payment Link Creation
  try {
    const res = await activeSandboxAdapter.createUpiPaymentLink(
      {
        caseId: testCase.id,
        orderId: testCase.razorpayOrderId,
        amountInr: testCase.amountInr,
        customerName: testCase.customerName,
        customerEmail: testCase.customerEmail,
        customerPhone: testCase.customerPhone,
        description: 'UPI link test',
        idempotencyKey: `test_gw_upi_${testCase.id}`,
      },
      testCase
    );

    if (res.actionExecuted === 'FALLBACK_UPI_PAYMENT_LINK' && res.referenceId) {
      passed++;
      console.log('[✓] Test 03: Sandbox UPI Payment Link Creation');
      console.log(`    Details: PASS: Generated UPI link (ref: ${res.referenceId}, status: ${res.status})`);
    } else {
      failed++;
      console.error('[✗] Test 03 Failed:', res);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 03 Error:', err);
  }

  // Test 4: Sandbox Instrument Update Dispatch
  try {
    const res = await activeSandboxAdapter.requestPaymentInstrumentUpdate(
      {
        caseId: testCase.id,
        customerId: testCase.customerId,
        customerEmail: testCase.customerEmail,
        customerPhone: testCase.customerPhone,
        paymentMethod: testCase.paymentMethod,
        idempotencyKey: `test_gw_inst_${testCase.id}`,
      },
      testCase
    );

    if (res.actionExecuted === 'CARD_UPDATE_PROMPT' && res.referenceId) {
      passed++;
      console.log('[✓] Test 04: Sandbox Instrument Update Dispatch');
      console.log(`    Details: PASS: Dispatched card update prompt (ref: ${res.referenceId})`);
    } else {
      failed++;
      console.error('[✗] Test 04 Failed:', res);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 04 Error:', err);
  }

  // Test 5: Production Live Execution Hard-Block Guard
  try {
    let blockedAsExpected = false;
    try {
      await productionAdapterStub.executePaymentRetry();
    } catch (err: any) {
      if (err.message.includes('strictly disabled in hackathon demonstration mode')) {
        blockedAsExpected = true;
      }
    }

    if (blockedAsExpected) {
      passed++;
      console.log('[✓] Test 05: Production Live Execution Hard-Block Guard');
      console.log('    Details: PASS: Production live real-money execution strictly blocked by safety gate');
    } else {
      failed++;
      console.error('[✗] Test 05 Failed: Production adapter did not throw safety exception');
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 05 Error:', err);
  }

  // Test 6: Adapter Idempotency Verification
  try {
    const isIdempotent = await activeSandboxAdapter.verifyIdempotency('valid_idempotency_key_123');
    const isEmptyRejected = await activeSandboxAdapter.verifyIdempotency('');

    if (isIdempotent && !isEmptyRejected) {
      passed++;
      console.log('[✓] Test 06: Adapter Idempotency Verification');
      console.log('    Details: PASS: Valid idempotency keys accepted; empty keys rejected');
    } else {
      failed++;
      console.error('[✗] Test 06 Failed: Idempotency verification logic incorrect');
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 06 Error:', err);
  }

  console.log('-------------------------------------------------------------------');
  console.log(`SUMMARY: Total Tests: 6 | Passed: ${passed} | Failed: ${failed}`);
  console.log('-------------------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runGatewayAdapterTests();
