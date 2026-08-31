import React, { useEffect, useState } from 'react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  amountInr: number;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  onSuccess?: (paymentId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  amountInr,
  customerName = 'Customer',
  customerEmail = 'customer@example.com',
  customerContact = '9999999999',
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript();
    }
  }, [isOpen]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-checkout-js')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create Order on backend
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInr,
          incident_id: incidentId
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create order on server');
      }

      const order = await res.json();

      // 2. Configure Razorpay Options
      const options = {
        key: (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_recoveros_sandbox',
        amount: order.amount,
        currency: order.currency,
        name: 'RecoverOS AI',
        description: `Recovery Payment for Incident ${incidentId}`,
        order_id: order.id,
        handler: async function (response: any) {
          // 3. Verify Payment Signature
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              if (onSuccess) onSuccess(response.razorpay_payment_id);
              onClose();
            } else {
              setError('Payment verification failed.');
            }
          } catch (err) {
            setError('Error verifying payment.');
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerContact
        },
        notes: {
          incident_id: incidentId
        },
        theme: {
          color: '#3B82F6' // Tailwind blue-500
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay using UPI',
                instruments: [
                  { method: 'upi' },
                  { method: 'upi', flows: ['qr'] }
                ]
              },
              netbanking: {
                name: 'Pay via Netbanking',
                instruments: [
                  { method: 'netbanking' }
                ]
              }
            },
            sequence: ['block.upi', 'block.netbanking']
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Complete Recovery Payment</h2>
        <div className="mb-6 text-slate-600">
          <p>Amount to Pay: <span className="font-semibold text-slate-900">₹{amountInr.toLocaleString('en-IN')}</span></p>
          <p className="text-sm">Incident ID: {incidentId}</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
