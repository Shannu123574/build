/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class RazorpayServerClient {
  private keyId: string;
  private keySecret: string;
  
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    // Safety check: NEVER allow live keys to boot
    if (this.keyId.startsWith('rzp_live_')) {
      throw new Error('[SAFETY BREACH] Live Razorpay keys detected. RecoverOS is strictly configured for Test Mode execution. Aborting boot.');
    }
  }

  public get isConfigured(): boolean {
    return this.keyId.startsWith('rzp_test_') && this.keySecret.length > 0;
  }

  public get environmentState(): 'RAZORPAY_TEST_MODE' | 'SIMULATION' | 'PRODUCTION_LOCKED' {
    if (this.keyId.startsWith('rzp_live_')) return 'PRODUCTION_LOCKED';
    if (this.isConfigured) return 'RAZORPAY_TEST_MODE';
    return 'SIMULATION';
  }

  private async fetchApi(path: string, options: RequestInit = {}) {
    if (!this.isConfigured) {
      throw new Error('Razorpay client called without valid test mode credentials');
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const headers = {
      ...options.headers,
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    const res = await fetch(`https://api.razorpay.com/v1${path}`, { ...options, headers });
    if (!res.ok) {
      throw new Error(`Razorpay API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async getPaymentStatus(paymentId: string) {
    if (!this.isConfigured) {
      // Return simulated success if in sim mode
      return { status: 'captured', amount: 499900 };
    }
    const data = await this.fetchApi(`/payments/${paymentId}`);
    return {
      status: data.status,
      amount: data.amount,
      currency: data.currency
    };
  }

  async fetchPaymentDetails(paymentId: string) {
    if (!this.isConfigured) {
      return null;
    }
    return await this.fetchApi(`/payments/${paymentId}`);
  }
}

export const razorpayClient = new RazorpayServerClient();
