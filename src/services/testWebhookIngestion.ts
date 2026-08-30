/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ingestWebhookEvent,
  verifyWebhookSignature,
  clearWebhookIdempotencyCache,
} from './webhookIngestion.ts';
import { hmacSha256 } from './cryptoUtils.ts';

async function runWebhookTests() {
  console.log('===================================================================');
  console.log('=== PHASE 9 WEBHOOK INGESTION ENGINE TEST SUITE (6/6 TESTS) ===');
  console.log('===================================================================');

  let passed = 0;
  let failed = 0;

  clearWebhookIdempotencyCache();
  const testSecret = 'whsec_enterprise_secret_recoveros_2026';

  // Test 1: Valid Payment Failed Webhook Ingestion
  try {
    const rawPayload = {
      id: 'evt_test_failed_001',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_test_001',
            order_id: 'order_wh_test_001',
            amount: 499900,
            currency: 'INR',
            status: 'failed',
            method: 'upi',
            error_code: 'GATEWAY_ERROR',
            error_description: 'Issuing bank CBS unresponsive',
            error_source: 'bank',
            email: 'sharma@example.com',
            contact: '+919876543210',
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
    };

    const payloadString = JSON.stringify(rawPayload);
    const validSignature = await hmacSha256(payloadString, testSecret);

    const result = await ingestWebhookEvent(payloadString, {
      signature: validSignature,
      webhookSecret: testSecret,
    });

    if (result.accepted && result.status === 'PROCESSED' && result.diagnosis && result.policy) {
      passed++;
      console.log('[✓] Test 01: Valid Payment Failed Webhook Ingestion');
      console.log(`    Details: PASS: Ingested event ${rawPayload.id} -> Action: ${result.policy.actionToExecute} (Ledger hash: ${result.ledgerRef?.slice(0, 16)}...)`);
    } else {
      failed++;
      console.error('[✗] Test 01 Failed:', result);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 01 Error:', err);
  }

  // Test 2: Malformed Webhook Payload Rejection
  try {
    const malformedBody = '{"event": "payment.failed", "broken_json": ';
    const result = await ingestWebhookEvent(malformedBody, { bypassSignatureCheck: true });

    if (!result.accepted && result.status === 'MALFORMED') {
      passed++;
      console.log('[✓] Test 02: Malformed Webhook Payload Rejection');
      console.log(`    Details: PASS: Malformed JSON safely rejected with status MALFORMED`);
    } else {
      failed++;
      console.error('[✗] Test 02 Failed:', result);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 02 Error:', err);
  }

  // Test 3: Duplicate Webhook / Idempotency Collision Detection
  try {
    const duplicatePayload = {
      id: 'evt_test_failed_001', // Exact same event ID as Test 1
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_test_001',
            order_id: 'order_wh_test_001',
            amount: 499900,
            currency: 'INR',
          },
        },
      },
    };

    const result = await ingestWebhookEvent(duplicatePayload, { bypassSignatureCheck: true });

    if (!result.accepted && result.status === 'DUPLICATE_IGNORED') {
      passed++;
      console.log('[✓] Test 03: Duplicate Webhook / Idempotency Collision Detection');
      console.log(`    Details: PASS: Duplicate event ID evt_test_failed_001 blocked from double-execution`);
    } else {
      failed++;
      console.error('[✗] Test 03 Failed:', result);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 03 Error:', err);
  }

  // Test 4: Cryptographic HMAC Signature Verification & Tamper Detection
  try {
    const payload = JSON.stringify({
      id: 'evt_test_sig_002',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: { id: 'pay_test_002', order_id: 'order_002', amount: 100000 },
        },
      },
    });

    const forgedSignature = 'c75a409f972b5357876a40234b65561a0b32bb750731f8fa5534c06cf484c980';
    const result = await ingestWebhookEvent(payload, {
      signature: forgedSignature,
      webhookSecret: testSecret,
    });

    if (!result.accepted && result.status === 'SIGNATURE_INVALID') {
      passed++;
      console.log('[✓] Test 04: Cryptographic HMAC Signature Verification & Tamper Detection');
      console.log('    Details: PASS: Forged HMAC-SHA256 signature caught and rejected');
    } else {
      failed++;
      console.error('[✗] Test 04 Failed:', result);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 04 Error:', err);
  }

  // Test 5: Unsupported / Out-of-Scope Event Handling
  try {
    const unsupportedPayload = {
      id: 'evt_test_unsupported_003',
      event: 'subscription.cancelled',
      payload: {
        payment: {
          entity: { id: 'pay_sub_003', order_id: 'order_sub_003', amount: 100000 },
        },
      },
    };

    const result = await ingestWebhookEvent(unsupportedPayload, { bypassSignatureCheck: true });

    if (!result.accepted && result.status === 'UNSUPPORTED_EVENT') {
      passed++;
      console.log('[✓] Test 05: Unsupported / Out-of-Scope Event Handling');
      console.log(`    Details: PASS: Non-recoverable event type ignored gracefully`);
    } else {
      failed++;
      console.error('[✗] Test 05 Failed:', result);
    }
  } catch (err) {
    failed++;
    console.error('[✗] Test 05 Error:', err);
  }

  // Test 6: Non-Failure Payment Lifecycle Event (payment.captured)
  try {
    const capturedPayload = {
      id: 'evt_test_captured_004',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: { id: 'pay_cap_004', order_id: 'order_cap_004', amount: 250000, currency: 'INR' },
        },
      },
    };

    const result = await ingestWebhookEvent(capturedPayload, { bypassSignatureCheck: true });

    if (result.accepted && result.status === 'PROCESSED' && !result.diagnosis) {
      passed++;
      console.log('[✓] Test 06: Non-Failure Payment Lifecycle Event (payment.captured)');
      console.log('    Details: PASS: Successful payment capture acknowledged without triggering recovery pipeline');
    } else {
      failed++;
      console.error('[✗] Test 06 Failed:', result);
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

runWebhookTests();
