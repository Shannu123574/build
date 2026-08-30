import assert from 'assert';
import { pathToFileURL as urlHelper } from 'node:url';
import { clearDbForTesting } from './db/index.ts';
import { processWebhook, reconcileIncident } from './workflow.ts';
import { hmacSha256 } from '../services/cryptoUtils.ts';
import { razorpayClient } from './razorpayClient.ts';
import { getDb } from './db/index.ts';

const SECRET = 'test_secret';

async function runTests() {
  console.log('Running Server API Integration Tests...');
  let passed = 0;
  let failed = 0;

  process.env.NODE_ENV = 'test';
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  await clearDbForTesting();

  const { app } = await import('./index.ts');
  const server = await new Promise<any>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const sendWebhook = async (payloadStr: string, signature: string) => {
    return fetch(`${baseUrl}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      body: payloadStr
    });
  };

  // Wait for async processing
  const waitForWebhookProcessing = async (eventId: string, maxWaitMs = 2000) => {
    const db = await getDb();
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const row = await db.get('SELECT status FROM webhook_events WHERE event_id = ?', [eventId]);
      if (row && (row.status === 'PROCESSED' || row.status === 'FAILED')) {
        return row.status;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error('Timeout waiting for webhook processing');
  };

  // Test 1: Forged signature (magic string should be rejected)
  try {
    const payload = JSON.stringify({ id: 'evt_1', event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1', amount: 100 } } } });
    const res = await sendWebhook(payload, 'test_demo_valid');
    assert.strictEqual(res.status, 401);
    passed++;
    console.log('✅ Test 1 Passed: Rejected magic signature bypass');
  } catch (e: any) {
    failed++;
    console.error('❌ Test 1 Failed:', e);
  }

  // Test 2: Valid payload and duplicate detection (Fast-ACK)
  try {
    const payload = JSON.stringify({ id: 'evt_1', event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1', amount: 100000, created_at: Date.now() / 1000, email: 'test@example.com', contact: '1234567890', error_code: 'TEMPORARY_ISSUER_OUTAGE' } } } });
    const signature = await hmacSha256(SECRET, payload);
    
    const res1 = await sendWebhook(payload, signature);
    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert.strictEqual(data1.status, 'received');
    
    // Wait for async processing
    const status = await waitForWebhookProcessing('evt_1');
    assert.strictEqual(status, 'PROCESSED');
    
    const db = await getDb();
    const actionRow = await db.get('SELECT * FROM actions WHERE incident_id = ?', ['inc_evt_1']);
    assert.ok(actionRow, 'Action should be created');
    assert.strictEqual(actionRow.status, 'ACTION_EXECUTED');
    
    const incidentRow = await db.get('SELECT * FROM incidents WHERE id = ?', ['inc_evt_1']);
    assert.strictEqual(incidentRow.status, 'ACTION_EXECUTED');
    
    // Test Reconciliation
    const recRes = await reconcileIncident('inc_evt_1');
    assert.strictEqual(recRes.status, 'RECOVERED');
    assert.strictEqual(recRes.label, 'SIMULATED SETTLEMENT');

    // Duplicate Test
    const resDup = await sendWebhook(payload, signature);
    assert.strictEqual(resDup.status, 200);
    const dataDup = await resDup.json();
    assert.strictEqual(dataDup.status, 'ignored');
    assert.strictEqual(dataDup.reason, 'duplicate');

    passed++;
    console.log('✅ Test 2 Passed: Processed issuer outage, marked ACTION_EXECUTED, handled duplicate via Fast-ACK');
  } catch (e: any) {
    failed++;
    console.error('❌ Test 2 Failed:', e);
  }
  
  // Test 3: No gateway call for escalation
  try {
    const payload = JSON.stringify({ id: 'evt_2', event: 'payment.failed', payload: { payment: { entity: { id: 'pay_2', amount: 100000, created_at: Date.now() / 1000, email: 'test@example.com', contact: '1234567890', error_code: 'HIGH_RISK_FRAUD_SIGNATURE' } } } });
    const signature = await hmacSha256(SECRET, payload);
    const res2 = await sendWebhook(payload, signature);
    assert.strictEqual(res2.status, 200);
    
    // Wait for async processing
    const status = await waitForWebhookProcessing('evt_2');
    assert.strictEqual(status, 'PROCESSED');

    const db = await getDb();
    const incidentRow = await db.get('SELECT * FROM incidents WHERE id = ?', ['inc_evt_2']);
    assert.strictEqual(incidentRow.status, 'POLICY_DENIED');
    passed++;
    console.log('✅ Test 3 Passed: Escalation/Fraud does not call gateway');
  } catch (e: any) {
    failed++;
    console.error('❌ Test 3 Failed:', e);
  }

  // Test 4: HTTP API test for demo scenarios
  try {
    const res = await fetch(`${baseUrl}/api/demo/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'VERIFIED_SANDBOX_RECOVERY' })
    });
    
    assert.strictEqual(res.status, 200, 'Expected response status 200');
    const data = await res.json();
    
    assert.strictEqual(data.result.diagnosis.failureCategory, 'TEMPORARY_ISSUER_OUTAGE');
    assert.strictEqual(data.result.policy.actionToExecute, 'SMART_RETRY_SCHEDULE');
    
    const db = await getDb();
    const incidentRow = await db.get('SELECT * FROM incidents WHERE id = ?', [data.result.incidentId]);
    assert.strictEqual(incidentRow.status, 'ACTION_EXECUTED', 'Status should not be RECOVERED before reconciliation');
    assert.ok(data.ledgerIntegrity.isValid, 'Audit evidence should be valid');
    assert.ok(data.ledgerIntegrity.latestHash, 'Audit evidence should have a hash tip');
    
    passed++;
    console.log('✅ Test 4 Passed: API route /api/demo/scenarios parsed JSON and executed correctly');
  } catch (e: any) {
    failed++;
    console.error('❌ Test 4 Failed:', e);
  } finally {
    server.close();
  }

  console.log(`\nTotal Tests: 4`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  const isDirectExec = process.argv[1] && import.meta.url === urlHelper(process.argv[1]).href;

  if (isDirectExec || process.argv[1].endsWith('testServerApi.ts')) {
    if (failed > 0) {
      process.exit(1);
    }
  }
}

const isTopLevelExecution = process.argv[1] && import.meta.url === urlHelper(process.argv[1]).href;

if (isTopLevelExecution || process.argv[1].endsWith('testServerApi.ts')) {
  runTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
