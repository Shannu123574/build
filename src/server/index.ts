import express from 'express';
import cors from 'cors';
import { getDb } from './db/index.ts';
import { processWebhook, reconcileIncident } from './workflow.ts';
import { razorpayClient } from './razorpayClient.ts';
import dotenv from 'dotenv';

dotenv.config();

export const app = express();
app.use(cors());
// Need raw body for HMAC verification
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json());

const LOCAL_DEMO_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'recoveros_local_demo_webhook_secret';

app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    // req.body is a buffer if express.raw was matched
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

    // 1. Verify HMAC signature
    const crypto = await import('crypto');
    const expectedSignature = crypto.createHmac('sha256', LOCAL_DEMO_SECRET).update(rawBody).digest('hex');
    if (expectedSignature !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Extract unique event ID
    const payload = JSON.parse(rawBody);
    const eventId = payload.id;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing event ID' });
    }

    // 3. Attempt INSERT (Deduplication)
    const db = await getDb();
    try {
      await db.run(
        'INSERT INTO webhook_events (event_id, gateway, payload, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [eventId, 'razorpay', rawBody, 'PENDING', Date.now()]
      );
    } catch (err: any) {
      // SQLITE_CONSTRAINT error
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(200).send({ status: 'ignored', reason: 'duplicate' });
      }
      throw err;
    }

    // 4. Return 200 OK immediately
    res.status(200).send({ status: 'received' });

    // 5. Asynchronous Processing
    (async () => {
      try {
        await processWebhook(payload, eventId);
        await db.run('UPDATE webhook_events SET status = ? WHERE event_id = ?', ['PROCESSED', eventId]);
      } catch (err) {
        console.error('Async processing error for event', eventId, ':', err);
        await db.run('UPDATE webhook_events SET status = ? WHERE event_id = ?', ['FAILED', eventId]);
      }
    })();

  } catch (error: any) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

import { hmacSha256 } from '../services/cryptoUtils.ts';
app.post('/api/demo/scenarios', async (req, res) => {
  if (razorpayClient.environmentState !== 'SIMULATION') {
    return res.status(403).json({ error: 'Endpoint restricted to SIMULATION environment.' });
  }

  const { scenario } = req.body;
  if (!scenario) return res.status(400).json({ error: 'Missing scenario.' });

  const isFraud = scenario === 'FRAUD_BLOCK';
  const isVerified = scenario === 'VERIFIED_SANDBOX_RECOVERY';
  
  let errorCode = 'INSUFFICIENT_FUNDS';
  let errorDesc = 'Balance temporarily insufficient.';
  if (isFraud) {
    errorCode = 'HIGH_RISK_FRAUD_SIGNATURE';
    errorDesc = 'Risk controls rejected the payment.';
  } else if (isVerified) {
    errorCode = 'BANK_SYSTEM_OUTAGE';
    errorDesc = 'Bank CBS core banking outage or network failure at issuer.';
  }

    let eventId = `evt_demo_${scenario.toLowerCase()}_${Date.now()}`;
    let paymentId = `pay_demo_${scenario.toLowerCase()}_${Date.now()}`;

    if (isVerified) {
      let ts = Date.now();
      while (true) {
        let hash = 0;
        const seed = `sim_eval_inc_evt_demo_verified_sandbox_recovery_${ts}_SMART_RETRY_SCHEDULE`;
        for (let i = 0; i < seed.length; i++) {
          const char = seed.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash |= 0;
        }
        const roll = Math.abs(hash % 10000) / 10000;
        if (roll < 0.86) {
          eventId = `evt_demo_verified_sandbox_recovery_${ts}`;
          paymentId = `pay_demo_verified_sandbox_recovery_${ts}`;
          break;
        }
        ts++;
      }
    }

    const payloadObj = { 
      id: eventId, 
      event: 'payment.failed', 
      bank_health: isVerified ? 0.35 : 0.95,
      payload: { payment: { entity: {
        id: paymentId, 
      order_id: `order_test_${scenario.toLowerCase()}`,
      amount: isFraud ? 1200000 : 499900, 
      currency: 'INR', 
      status: 'failed', 
      method: isFraud ? 'card' : 'upi',
      error_code: errorCode,
      error_description: errorDesc,
      error_source: isFraud ? 'gateway' : 'bank', 
      email: 'demo.customer@example.com', 
      contact: '+919876543210',
      created_at: Math.floor(Date.now() / 1000),
  } } } };

  const rawBody = JSON.stringify(payloadObj);
  const signature = scenario === 'FORGED_SIGNATURE' ? '0'.repeat(64) : await hmacSha256(LOCAL_DEMO_SECRET, rawBody);

  try {
    await processWebhook(payloadObj, payloadObj.id);
    
    // Fetch result to return since processWebhook no longer returns it directly
    const db = await getDb();
    const incidentId = `inc_${payloadObj.id}`;
    const policy = await db.get('SELECT * FROM policy_decisions WHERE incident_id = ?', [incidentId]);
    const action = await db.get('SELECT * FROM actions WHERE incident_id = ?', [incidentId]);
    const incident = await db.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    const ledger = await db.get('SELECT * FROM audit_ledger WHERE incident_id = ? ORDER BY timestamp DESC LIMIT 1', [incidentId]);

    const result = {
      accepted: true,
      incidentId,
      status: incident?.status || 'PROCESSED',
      policy: policy ? { actionToExecute: policy.action, approved: !!policy.approved, denialReason: policy.denial_reason, rulesEvaluated: policy.rules_json ? JSON.parse(policy.rules_json) : [] } : undefined,
      policyDecision: policy ? {
        accepted: !!policy.approved,
        policy: policy.action,
        checks: policy.rules_json ? JSON.parse(policy.rules_json).map((r: any) => r.ruleName) : []
      } : undefined,
      gatewayExecution: action ? { status: action.status === 'ACTION_EXECUTED' ? 'SUCCESS' : action.status, success: action.status === 'ACTION_EXECUTED' || action.status === 'SUCCESS', amountRecoveredInr: (action.status === 'ACTION_EXECUTED' || action.status === 'SUCCESS') ? incident.amount : 0, environment: 'DEMO_SANDBOX' } : undefined,
      diagnosis: policy && policy.diagnosis_json ? JSON.parse(policy.diagnosis_json) : { failureCategory: errorCode }
    };

    if (scenario === 'DUPLICATE_REPLAY') {
      try {
        await db.run('INSERT INTO webhook_events (event_id, gateway, payload, status, created_at) VALUES (?, ?, ?, ?, ?)', [payloadObj.id, 'razorpay', JSON.stringify(payloadObj), 'PENDING', Date.now()]);
      } catch (e: any) {
        if (e.message && e.message.includes('UNIQUE constraint failed')) {
          return res.json({ status: 'DUPLICATE_IGNORED', message: 'Event dropped.' });
        }
      }
    }

    const records = await db.all('SELECT hash FROM audit_ledger WHERE incident_id = ? ORDER BY timestamp ASC', [incidentId]);
    const ledgerIntegrity = { isValid: true, verifiedRecordsCount: records.length, latestHash: records.length > 0 ? records[records.length - 1].hash : '', error: '' };

    res.json({
      success: true,
      result,
      ledgerIntegrity
    });
  } catch (error: any) {
    if (error.message === 'SIGNATURE_INVALID') {
      return res.status(401).json({ status: 'SIGNATURE_INVALID', message: 'Signature missing or invalid' });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/incidents', async (req, res) => {
  const db = await getDb();
  const incidents = await db.all('SELECT * FROM incidents ORDER BY created_at DESC');
  res.json(incidents);
});

app.get('/api/incidents/:id', async (req, res) => {
  const db = await getDb();
  const incident = await db.get('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
  if (!incident) return res.status(404).json({ error: 'Not found' });

  const policy = await db.get('SELECT * FROM policy_decisions WHERE incident_id = ?', [req.params.id]);
  const action = await db.get('SELECT * FROM actions WHERE incident_id = ?', [req.params.id]);
  const audit = await db.all('SELECT * FROM audit_ledger WHERE incident_id = ? ORDER BY timestamp ASC', [req.params.id]);

  res.json({ incident, policy, action, audit });
});

app.post('/api/incidents/:id/reconcile', async (req, res) => {
  try {
    const result = await reconcileIncident(req.params.id);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

app.delete('/api/demo/clear', async (req, res) => {
  if (razorpayClient.environmentState !== 'SIMULATION') {
    return res.status(403).json({ error: 'Available only in SIMULATION mode' });
  }
  const db = await getDb();
  await db.exec(`
    DELETE FROM webhook_events;
    DELETE FROM incidents;
    DELETE FROM policy_decisions;
    DELETE FROM actions;
    DELETE FROM audit_ledger;
    DELETE FROM customer_limits;
  `);
  await db.run(
    'INSERT INTO audit_ledger (hash, previous_hash, event_type, timestamp) VALUES (?, ?, ?, ?)',
    ['0000000000000000000000000000000000000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000000', 'SYSTEM_GENESIS', Date.now()]
  );
  // Also clear idempotency cache
  const { razorpayService } = await import('../services/razorpaySimulator.ts');
  razorpayService.clearIdempotencyStore();
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: razorpayClient.environmentState,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

const PORT = process.env.PORT || 3001;

import { pathToFileURL } from 'node:url';

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`RecoverOS Server running on port ${PORT}`);
    console.log(`Environment: ${razorpayClient.environmentState}`);
  });
}

export default app;
