import { hmacSha256 } from '../services/cryptoUtils.ts';
import { diagnosePaymentFailure } from '../services/gemini.ts';
import { evaluateRecoveryPolicy } from '../services/policyEngine.ts';
import { activeSandboxAdapter } from '../services/paymentGatewayAdapter.ts';
import { getDb } from './db/index.ts';
import { razorpayClient } from './razorpayClient.ts';
import { SyntheticRecoveryCase, FailureCategory } from '../types.ts';
import crypto from 'crypto';

export async function processWebhook(payload: any, eventId: string) {
  const db = await getDb();

  const paymentEntity = payload.payload?.payment?.entity;
  
  if (!eventId || !paymentEntity) {
    throw new Error('MALFORMED');
  }

  // 3. Normalize Event
  const normalized: any = {
    eventId,
    eventType: payload.event,
    paymentId: paymentEntity.id,
    orderId: paymentEntity.order_id,
    amountInr: paymentEntity.amount / 100,
    currency: paymentEntity.currency,
    errorCode: paymentEntity.error_code,
    errorDescription: paymentEntity.error_description,
    errorSource: paymentEntity.error_source,
    paymentMethod: paymentEntity.method,
    customerEmail: paymentEntity.email,
    customerContact: paymentEntity.contact,
    timestamp: paymentEntity.created_at * 1000,
    rawPayload: payload,
  };

  const code = (normalized.errorCode || '').toUpperCase();
  let mappedCategory: FailureCategory = 'TEMPORARY_ISSUER_OUTAGE';
  if (code.includes('FRAUD') || code.includes('RISK') || code.includes('RESTRICTED')) mappedCategory = 'FRAUD_SUSPICION_HIGH';
  else if (code.includes('EXPIRED') || code.includes('CARD_EXPIRED')) mappedCategory = 'EXPIRED_INSTRUMENT';
  else if (code.includes('INSUFFICIENT') || code.includes('LOW_BALANCE')) mappedCategory = 'INSUFFICIENT_FUNDS_TRANSIENT';
  else if (code.includes('ABANDON') || code.includes('USER_DROPPED') || code.includes('AUTH_FAILED')) mappedCategory = 'AUTHENTICATION_ABANDONMENT';
  else if (code.includes('GATEWAY') || code.includes('TIMEOUT')) mappedCategory = 'GATEWAY_TIMEOUT';
  else if (code.includes('BANK_SYSTEM_OUTAGE')) mappedCategory = 'TEMPORARY_ISSUER_OUTAGE';

  // 4. Create Incident
  const incidentId = `inc_${eventId}`;
  await db.run('INSERT INTO incidents (id, payment_id, amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
    incidentId, normalized.paymentId, normalized.amountInr, 'RECEIVED', Date.now(), Date.now()
  ]);

  const bankHealth = payload.bank_health !== undefined ? payload.bank_health : (mappedCategory === 'TEMPORARY_ISSUER_OUTAGE' ? 0.40 : 0.95);

  const recoveryCase: SyntheticRecoveryCase = {
    id: incidentId,
    razorpayPaymentId: normalized.paymentId,
    razorpayOrderId: normalized.orderId,
    customerId: `cust_${normalized.customerContact.replace(/\D/g, '').slice(-6)}`,
    customerName: normalized.customerEmail.split('@')[0] || 'Merchant Customer',
    customerEmail: normalized.customerEmail,
    customerPhone: normalized.customerContact,
    amountInr: normalized.amountInr,
    currency: normalized.currency,
    errorCode: normalized.errorCode || 'PAYMENT_FAILED_GENERIC',
    errorDescription: normalized.errorDescription || 'Payment transaction failed',
    errorSource: normalized.errorSource || 'bank',
    paymentMethod: normalized.paymentMethod,
    issuingBank: paymentEntity.bank || 'Unknown',
    customerTenureMonths: 12,
    lifetimeSuccessfulPayments: 8,
    consecutiveFailureCount: 1,
    attemptNumber: 1,
    bankHealthScore: bankHealth,
    dayOfMonth: new Date().getDate(),
    hourOfDay: new Date().getHours(),
    merchantCategory: 'saas_recurring',
    groundTruthCategory: mappedCategory,
    groundTruth: { optimalAction: 'SMART_RETRY_SCHEDULE' as any },
  } as any;

  // 5. Diagnosis
  const diagnosis = await diagnosePaymentFailure(recoveryCase);
  await db.run('UPDATE incidents SET status = ? WHERE id = ?', ['DIAGNOSED', incidentId]);

  // 6. Policy Check
  const policy = evaluateRecoveryPolicy(recoveryCase, diagnosis);
  await db.run('INSERT INTO policy_decisions (incident_id, diagnosis_json, rules_json, approved, action, denial_reason) VALUES (?, ?, ?, ?, ?, ?)', [
    incidentId, JSON.stringify(diagnosis), JSON.stringify(policy.rulesEvaluated), policy.approved ? 1 : 0, policy.actionToExecute, policy.denialReason || null
  ]);

  if (!policy.approved) {
    await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['POLICY_DENIED', Date.now(), incidentId]);
    return { status: 'POLICY_DENIED', incidentId, policy, diagnosis };
  }

  await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['POLICY_APPROVED', Date.now(), incidentId]);

  // 7. Execution
  let gatewayResult = null;
  let actionStatus = 'FAILED';
  
  const idempotencyKey = `idemp_${eventId}`;
  const action = policy.actionToExecute;

  if (action === 'SMART_RETRY_SCHEDULE') {
    gatewayResult = await activeSandboxAdapter.executePaymentRetry({
      caseId: incidentId,
      razorpayPaymentId: recoveryCase.razorpayPaymentId,
      amountInr: recoveryCase.amountInr,
      customerEmail: recoveryCase.customerEmail,
      customerPhone: recoveryCase.customerPhone,
      paymentMethod: recoveryCase.paymentMethod,
      delayMinutes: diagnosis.recommendedExecutionDelayMinutes,
      idempotencyKey
    }, recoveryCase);
  } else if (action === 'FALLBACK_UPI_PAYMENT_LINK') {
    gatewayResult = await activeSandboxAdapter.createUpiPaymentLink({
      caseId: incidentId,
      orderId: recoveryCase.razorpayOrderId,
      amountInr: recoveryCase.amountInr,
      customerName: recoveryCase.customerName,
      customerEmail: recoveryCase.customerEmail,
      customerPhone: recoveryCase.customerPhone,
      description: 'Payment retry',
      idempotencyKey
    }, recoveryCase);
  } else if (action === 'CARD_UPDATE_PROMPT') {
    gatewayResult = await activeSandboxAdapter.requestPaymentInstrumentUpdate({
      caseId: incidentId,
      customerId: recoveryCase.customerId,
      customerEmail: recoveryCase.customerEmail,
      customerPhone: recoveryCase.customerPhone,
      paymentMethod: recoveryCase.paymentMethod,
      idempotencyKey
    }, recoveryCase);
  } else if (action === 'INTERACTIVE_WHATSAPP_NUDGE') {
    // Audit-only queue
    gatewayResult = { success: true, referenceId: `wa_queue_${Date.now()}`, amountRecoveredInr: 0, status: 'QUEUED' as any };
  } else {
    // ESCALATE_HUMAN_OPS or DO_NOT_RETRY -> no gateway execution
    gatewayResult = { success: true, referenceId: 'none', amountRecoveredInr: 0, status: 'ESCALATED' as any };
  }

  if (gatewayResult.success) {
    if (['SMART_RETRY_SCHEDULE', 'FALLBACK_UPI_PAYMENT_LINK', 'CARD_UPDATE_PROMPT'].includes(action)) {
       actionStatus = 'ACTION_EXECUTED';
       await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['ACTION_EXECUTED', Date.now(), incidentId]);
    } else if (action === 'INTERACTIVE_WHATSAPP_NUDGE') {
       actionStatus = 'ACTION_QUEUED';
       await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['ACTION_QUEUED', Date.now(), incidentId]);
    } else {
       actionStatus = 'ESCALATED';
       await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['ESCALATED', Date.now(), incidentId]);
    }
  } else {
    await db.run('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?', ['NOT_RECOVERED', Date.now(), incidentId]);
  }

  const actionId = `act_${Date.now()}`;
  await db.run('INSERT INTO actions (id, incident_id, type, status, cost, reference_id) VALUES (?, ?, ?, ?, ?, ?)', [
    actionId, incidentId, policy.actionToExecute, actionStatus, policy.interventionCostInr, gatewayResult.referenceId || null
  ]);

  // 8. Audit Ledger
  const prevHashRow = await db.get('SELECT hash FROM audit_ledger ORDER BY id DESC LIMIT 1');
  const previousHash = prevHashRow ? prevHashRow.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const contentToHash = `${previousHash}|${incidentId}|${policy.actionToExecute}|${actionStatus}|${gatewayResult.amountRecoveredInr || 0}|${Date.now()}`;
  const newHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
  
  // console.log(`[DEBUG] Inserting into audit_ledger: hash=${newHash}, prevHash=${previousHash}, incidentId=${incidentId}`);
  try {
    await db.run('INSERT INTO audit_ledger (hash, previous_hash, incident_id, event_type, timestamp) VALUES (?, ?, ?, ?, ?)', [
      newHash, previousHash, incidentId, 'RECOVERY_ACTION', Date.now()
    ]);
  } catch (e: any) {
    // console.log(`[DEBUG] FAILED to insert into audit_ledger! Error: ${e.message}`);
    throw e;
  }

  return { status: 'PROCESSED', incidentId, policy, gatewayExecution: gatewayResult, diagnosis };
}

export async function reconcileIncident(incidentId: string) {
  const db = await getDb();
  const incident = await db.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
  if (!incident) throw new Error('NOT_FOUND');

  if (razorpayClient.isConfigured) {
    const pStatus = await razorpayClient.getPaymentStatus(incident.payment_id);
    if (pStatus.status === 'captured') {
      await db.run('UPDATE incidents SET status = ?, recovered_amount = ?, updated_at = ? WHERE id = ?', ['RECOVERED', pStatus.amount / 100, Date.now(), incidentId]);
      return { status: 'RECOVERED', amount: pStatus.amount / 100 };
    }
  } else if (incident.status === 'ACTION_EXECUTED') {
    // Simulated settlement
    await db.run('UPDATE incidents SET status = ?, recovered_amount = ?, updated_at = ? WHERE id = ?', ['RECOVERED', incident.amount, Date.now(), incidentId]);
    return { status: 'RECOVERED', amount: incident.amount, label: 'SIMULATED SETTLEMENT' };
  }

  return { status: incident.status, amount: incident.recovered_amount };
}
// FORCE CACHE INVALIDATION
