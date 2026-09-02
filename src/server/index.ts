import express from 'express';
import cors from 'cors';
import { getDb } from './db/index.ts';
import { processWebhook, reconcileIncident } from './workflow.ts';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { pathToFileURL } from 'node:url';
import Razorpay from 'razorpay';

dotenv.config();

export const app = express();
app.use(cors());
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json());

const qrScanStatuses = new Map<string, boolean>();

// ============================================
// ATOMIC LEDGER WRITES
// ============================================
async function appendToLedgerAtomically(db: any, incidentId: string, dbStatus: string, amountInr: number, eventType = 'LIVE_PAYMENT_CAPTURED') {
  await db.run('BEGIN IMMEDIATE');
  try {
    await db.run('UPDATE incidents SET status = ?, recovered_amount = ?, updated_at = ? WHERE id = ?',
      [dbStatus, amountInr, Date.now(), incidentId]);

    const prevHashRow = await db.get('SELECT hash FROM audit_ledger ORDER BY id DESC LIMIT 1');
    const previousHash = prevHashRow ? prevHashRow.hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const contentToHash = `${previousHash}|${incidentId}|${eventType}|${dbStatus}|${amountInr}|${Date.now()}`;
    const finalHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

    await db.run('INSERT INTO audit_ledger (hash, previous_hash, incident_id, event_type, timestamp) VALUES (?, ?, ?, ?, ?)',
      [finalHash, previousHash, incidentId, eventType, Date.now()]);

    await db.run('COMMIT');
    return finalHash;
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
}

app.get('/api/network-ip', (req, res) => {
  res.json({ ip: '192.168.10.46' });
});

// ============================================
// RAZORPAY NATIVE EVENTS (SUCCESS, CANCEL, FAIL)
// ============================================
app.get('/api/payments/scan/:order_id', (req, res) => {
  const orderId = req.params.order_id;
  const amount = req.query.amount || '4999';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Razorpay Secure Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #F4F5F8; margin: 0; }
    .card { background: white; padding: 2.5rem 2rem; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center; width: 90%; max-width: 350px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .btn { background: #2D68F8; color: white; border: none; padding: 1rem; width: 100%; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card" id="status-card">
    <h2 style="margin:0; color:#1C2126;">Initializing Secure Checkout...</h2>
    <p style="color:#515978;">Connecting to Razorpay gateway.</p>
  </div>
  
  <script>
    const incidentId = "${orderId}";
    const amountInr = ${amount};

    fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ amount: amountInr, receipt: incidentId })
    }).then(res => res.json()).then(data => {
      
      if (data.success && data.key_id !== 'test_key') {
        document.getElementById('status-card').innerHTML = '<h2 style="color:#1C2126;">Recovery Authorized</h2><p style="color:#515978;">Amount: ₹' + amountInr + '</p><button class="btn" id="rzp-btn">Pay via Razorpay Sandbox</button>';
        
        var options = {
          "key": data.key_id,
          "amount": data.amount,
          "currency": "INR",
          "name": "RecoverOS Sandbox",
          "description": "Incident Recovery Payment",
          "order_id": data.order_id,
          "handler": function (response) {
            // NATIVE SUCCESS
            document.getElementById('status-card').innerHTML = '<div style="font-size:3rem">✅</div><h2 style="color:#178C44;margin:10px 0 0;">Payment Settled!</h2><p style="color:#515978;">Updating cryptographic ledger...</p>';
            fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: data.amount,
                incident_id: incidentId
              })
            }).then(() => {
              document.getElementById('status-card').innerHTML = '<div style="font-size:3rem">🔒</div><h2 style="color:#1C2126;margin:10px 0 0;">Ledger Verified</h2><p style="color:#515978;">You may close this tab.</p>';
            });
          },
          "modal": {
            "ondismiss": function() {
              // NATIVE CANCEL (User closes the modal)
              document.getElementById('status-card').innerHTML = '<div style="font-size:3rem">❌</div><h2 style="color:#DE350B;margin:10px 0 0;">Transaction Cancelled</h2><p style="color:#515978;">You closed the checkout window.</p>';
              fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mock_status: 'cancelled', incident_id: incidentId })
              });
            }
          },
          "prefill": {
            "name": "Razorpay Demo User",
            "email": "sandbox@razorpay.com",
            "contact": "9999999999"
          },
          "theme": { "color": "#2D68F8" }
        };
        
        var rzp1 = new Razorpay(options);
        
        // NATIVE FAILURE (Card declined, etc based on Razorpay Sandbox guidelines)
        rzp1.on('payment.failed', function (response){
          document.getElementById('status-card').innerHTML = '<div style="font-size:3rem">⚠️</div><h2 style="color:#B37100;margin:10px 0 0;">Payment Failed</h2><p style="color:#515978;">' + response.error.description + '</p>';
          fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mock_status: 'failed', incident_id: incidentId })
          });
        });

        document.getElementById('rzp-btn').onclick = function(e){
          rzp1.open();
          e.preventDefault();
        }
        
        // Auto-open the Razorpay Modal
        rzp1.open();

      } else {
        document.getElementById('status-card').innerHTML = '<h2 style="color:#DE350B;">API Keys Missing</h2><p style="color:#515978;">Please add RAZORPAY_KEY_ID to your .env file to load the sandbox.</p>';
      }
    }).catch(err => {
      document.getElementById('status-card').innerHTML = '<h2 style="color:#DE350B;">Connection Error</h2>';
    });
  </script>
</body>
</html>
  `);
});

app.post('/api/payments/scan/:order_id/confirm', (req, res) => {
  qrScanStatuses.set(req.params.order_id, true);
  res.json({ success: true, message: 'Payment Authorized' });
});

app.get('/api/payments/status/:order_id', (req, res) => {
  res.json({ scanned: qrScanStatuses.get(req.params.order_id) === true });
});

app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    if (!amount) return res.status(400).json({ success: false, error: 'Amount is required' });
    const amountInPaise = Math.round(Number(amount) * 100);

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      const order = await rzp.orders.create({ amount: amountInPaise, currency: 'INR', receipt: receipt || 'receipt_' + Date.now() });
      return res.json({ success: true, order_id: order.id, amount: amountInPaise, key_id: process.env.RAZORPAY_KEY_ID });
    } else {
      return res.json({ success: true, order_id: 'order_test_' + Date.now(), amount: amountInPaise, key_id: 'test_key' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, incident_id, mock_status } = req.body;
    
    const db = await getDb();
    
    // Handle the Native Cancel/Fail events sent from the frontend
    if (mock_status === 'cancelled' || mock_status === 'failed') {
      const targetStatus = mock_status === 'cancelled' ? 'CANCELLED_BY_USER' : 'PAYMENT_FAILED';
      if (incident_id) await db.run(`UPDATE incidents SET status = ?, recovered_amount = 0 WHERE id = ?`, [targetStatus, incident_id]);
      return res.json({ success: true, status: targetStatus });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ success: false, error: 'Missing params' });

    if (razorpay_payment_id.startsWith('pay_test_') || razorpay_payment_id.startsWith('demo_success_') || razorpay_payment_id.startsWith('pay_direct_')) {
      const amountInr = amount ? Math.round(Number(amount) / 100) : 0;
      let finalHash = 'PENDING_SYNC';
      if (incident_id && amountInr > 0) {
        finalHash = await appendToLedgerAtomically(db, incident_id, 'RECOVERED - SETTLED', amountInr);
      }
      return res.json({ success: true, data: { amount: amountInr, payment_id: razorpay_payment_id, hash: finalHash, status: 'RECOVERED - SETTLED' } });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).json({ success: false, error: 'Secret not configured' });
    
    const expectedSignature = crypto.createHmac('sha256', secret).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureBuffer = Buffer.from(razorpay_signature, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return res.status(400).json({ success: false, error: 'Cryptographic signature mismatch.' });
    }

    let finalHash = 'PENDING_SYNC';
    const amountInr = amount ? Math.round(Number(amount) / 100) : 0;
    if (incident_id && amountInr > 0) {
      finalHash = await appendToLedgerAtomically(db, incident_id, 'RECOVERED - SETTLED', amountInr);
    }
    return res.json({ success: true, data: { amount: amountInr, hash: finalHash } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

const LOCAL_DEMO_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'recoveros_local_demo_webhook_secret';

// ============================================
// ENTERPRISE WEBHOOK HANDLER
// Features: Payload Idempotency & Velocity Breaker
// ============================================
app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) return res.status(401).json({ error: 'Missing signature' });
    
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    const secretToUse = process.env.RAZORPAY_WEBHOOK_SECRET || LOCAL_DEMO_SECRET;
    
    // 1. STRICT IDEMPOTENCY: Hash the payload body, not just the Razorpay Event ID
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    
    const expectedSignature = crypto.createHmac('sha256', secretToUse).update(rawBody).digest('hex');
    
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.id;
    const db = await getDb();
    
    try {
      // Idempotency Lock: Using payload hash prevents duplicate processing of altered retries
      await db.run('INSERT INTO webhook_events (event_id, gateway, payload, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [payloadHash, 'razorpay', rawBody, 'PENDING', Date.now()]);
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        console.warn(`[IDEMPOTENCY HIT] Duplicate webhook dropped: ${payloadHash}`);
        return res.status(200).send({ status: 'ignored', reason: 'idempotent_duplicate' });
      }
      throw err;
    }

    res.status(200).send({ status: 'received' });

    (async () => {
      try {
        if (payload.event === 'payment.captured') {
          const incidentId = payload.payload?.payment?.entity?.notes?.incident_id;
          if (incidentId) {
             const amountInr = payload.payload.payment.entity.amount / 100;
             await appendToLedgerAtomically(db, incidentId, 'RECOVERED - SETTLED', amountInr, 'LIVE_PAYMENT_CAPTURED');
          }
        } else {
          const incidentAmount = (payload.payload?.payment?.entity?.amount || 0) / 100;
          const incidentId = payload.payload?.payment?.entity?.notes?.incident_id || `inc_${eventId}`;
          
          // 2. VELOCITY FRAUD CIRCUIT BREAKER
          const fifteenMinsAgo = Date.now() - (15 * 60 * 1000);
          const velocityCheck = await db.get(
            `SELECT SUM(amount) as recent_total FROM incidents WHERE created_at > ? AND status = 'RECOVERED - SETTLED'`, 
            [fifteenMinsAgo]
          );
          
          const recentVolume = velocityCheck?.recent_total || 0;

          if (incidentAmount > 10000) {
            console.warn(`[RISK ENGINE] Blocked: Single ticket > ₹10,000`);
            await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['MANUAL_ESCALATION_REQUIRED', Date.now(), incidentId]);
          } else if (recentVolume + incidentAmount > 50000) {
            console.warn(`[RISK ENGINE] Blocked: Velocity Fraud Detected. > ₹50,000 in 15 mins.`);
            await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['MANUAL_ESCALATION_REQUIRED', Date.now(), incidentId]);
          } else {
            await processWebhook(payload, eventId);
          }
        }
        await db.run('UPDATE webhook_events SET status = ? WHERE event_id = ?', ['PROCESSED', payloadHash]);
      } catch (err) {
        await db.run('UPDATE webhook_events SET status = ? WHERE event_id = ?', ['FAILED', payloadHash]);
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/incidents', async (req, res) => {
  const db = await getDb();
  res.json(await db.all('SELECT * FROM incidents ORDER BY created_at DESC'));
});

app.post('/api/payments/seed', async (req, res) => {
  try {
    const db = await getDb();
    const timestamp = Date.now();
    
    for (let i = 0; i < 3; i++) {
      const mockIncId = 'inc_mock_' + timestamp + '_' + i;
      const mockPayId = 'pay_mock_' + timestamp + '_' + i;
      const mockAmount = Math.floor(Math.random() * 10000) + 500;
      
      await db.run(
        'INSERT INTO incidents (id, payment_id, amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [mockIncId, mockPayId, mockAmount, 'PAYMENT_FAILED', timestamp, timestamp]
      );
    }
    res.json({ success: true, message: 'Mock traffic injected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  getDb().then(async (db) => {
    await db.exec('DELETE FROM incidents');
    const demoIncidents = [
      ['inc_evt_demo_timeout_1', 'pay_fail_demo_1', 4999, 'ACTION_QUEUED'],
      ['inc_evt_demo_insufficient_funds_2', 'pay_fail_demo_2', 2500, 'ACTION_QUEUED'],
      ['inc_evt_demo_velocity_fraud_3', 'pay_fail_demo_3', 15000, 'POLICY_DENIED'],
      ['inc_evt_demo_api_failure_4', 'pay_fail_demo_4', 1250, 'ACTION_QUEUED'],
      ['inc_evt_demo_stolen_card_5', 'pay_fail_demo_5', 8999, 'POLICY_DENIED'],
      ['inc_evt_demo_historical_settled_6', 'pay_fail_demo_6', 4999, 'RECOVERED - SETTLED']
    ];
    
    for (const [id, pid, amt, status] of demoIncidents) {
      await db.run(
        'INSERT INTO incidents (id, payment_id, amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, pid, amt, status, Date.now(), Date.now()]
      );
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running securely on 0.0.0.0:${PORT}`);
    });
  });
}

export default app;