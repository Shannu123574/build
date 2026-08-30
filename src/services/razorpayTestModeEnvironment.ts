/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An isolated test-mode environment boundary simulating the Razorpay API.
 * Ensures zero exposure to production credentials or live money movement.
 */
export class RazorpayTestModeEnvironment {
  private static MOCK_LATENCY_MS = 50;

  static async fetchPaymentDetails(paymentId: string) {
    const keyId = typeof process !== 'undefined' ? process.env.RAZORPAY_KEY_ID : undefined;
    const keySecret = typeof process !== 'undefined' ? process.env.RAZORPAY_KEY_SECRET : undefined;

    if (keyId && keySecret && keyId.startsWith('rzp_test_')) {
      // Use Real Razorpay Test Mode API
      try {
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
          },
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn('Live test-mode fetch failed, falling back to simulator', err);
      }
    }

    // Fallback Simulator
    await new Promise(resolve => setTimeout(resolve, this.MOCK_LATENCY_MS));
    if (!paymentId.startsWith('pay_test_')) {
      throw new Error('Only test-mode payment IDs are allowed in this environment.');
    }
    return {
      id: paymentId,
      entity: 'payment',
      status: 'failed',
      error_code: 'BAD_REQUEST_ERROR',
      error_description: 'Payment failed in test mode.',
      notes: {
        validation_mode: 'track_03_hardening'
      }
    };
  }

  static async executeTestRecoveryAction(paymentId: string, actionName: string, amount: number) {
    // Simulator
    await new Promise(resolve => setTimeout(resolve, this.MOCK_LATENCY_MS));
    if (!paymentId.startsWith('pay_test_')) {
      throw new Error('Only test-mode payment IDs are allowed in this environment.');
    }
    
    let success = true;
    if (actionName === 'DO_NOT_RETRY_CHURN_RISK' || actionName === 'DO_NOT_RETRY_FRAUD') success = false;
    
    return {
      success,
      actionExecuted: actionName,
      recoveredAmount: success ? amount : 0,
      testMode: true,
      timestamp: Date.now()
    };
  }

  static verifyWebhookSignature(payload: string, signature: string, secret?: string) {
    const activeSecret = typeof process !== 'undefined' && process.env.RAZORPAY_WEBHOOK_SECRET 
      ? process.env.RAZORPAY_WEBHOOK_SECRET 
      : (secret || 'test_secret');
      
    if (typeof process !== 'undefined' && process.env.RAZORPAY_WEBHOOK_SECRET) {
      const crypto = require('crypto');
      const expected = crypto.createHmac('sha256', activeSecret).update(payload).digest('hex');
      return expected === signature;
    }

    // Simulator
    if (signature === 'invalid_signature' || signature === 'mock_invalid_hmac') return false;
    return true;
  }
}
