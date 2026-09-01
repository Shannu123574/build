import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck, Smartphone, Landmark, CreditCard as CreditCardIcon, Loader2, ArrowLeft } from 'lucide-react';
import { globalAuditLedger } from '../services/auditLedger.ts';

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
  
  const [resultState, setResultState] = useState<'success' | 'failed' | 'cancelled' | null>(null);
  
  const [orderData, setOrderData] = useState<any>(null);
  const [processingGateway, setProcessingGateway] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState('127.0.0.1');
  
  const [upiId, setUpiId] = useState('');
  const [upiStep, setUpiStep] = useState<'input' | 'waiting'>('input');

  useEffect(() => {
    // Wipe the memory clean so retries start fresh
    setResultState(null);
    setError(null);
    setOrderData(null);
    setProcessingGateway(false);
    setSelectedMethod(null);
    setUpiId('');
    setUpiStep('input');
    
    if (isOpen) {
      fetch('/api/network-ip')
        .then(res => res.json())
        .then(data => setLocalIp(data.ip || '127.0.0.1'))
        .catch(() => setLocalIp('127.0.0.1'));
    }
  }, [isOpen, incidentId]);

  useEffect(() => {
    let interval: any;
    if (selectedMethod === 'UPI / QR Code' && orderData?.order_id && !processingGateway && !resultState) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/status/${orderData.order_id}`);
          const data = await res.json();
          if (data.scanned) {
            clearInterval(interval);
            forceDemoSuccess();
          }
        } catch (err) {}
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedMethod, orderData, processingGateway, resultState]);

  const verifyPayment = async (orderId: string, paymentId: string, signature: string, orderAmount: number, mockStatus: string = 'success') => {
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          incident_id: incidentId,
          amount: orderAmount,
          mock_status: mockStatus
        })
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        
        globalAuditLedger.append({
          caseId: incidentId,
          action: 'LIVE_PAYMENT_CAPTURED',
          actor: 'SIMULATOR',
          debitAtRiskInr: verifyData.data.amount,
          creditRecoveredInr: verifyData.data.amount,
          costIncurredInr: 0,
          razorpayReferenceId: verifyData.data.payment_id,
          status: verifyData.data.status,
          payloadSummary: `Payment ${mockStatus} via Simulated Gateway`
        });

        setResultState(mockStatus as 'success' | 'failed' | 'cancelled');
      } else {
        setResultState('failed');
        setError('Payment verification failed.');
      }
    } catch (err) {
      setResultState('failed');
      setError('Error verifying payment.');
    } finally {
      setProcessingGateway(false);
    }
  };

  const handleCancel = async () => {
    // 1. Optimistic Update: Instantly change the UI to the cancelled screen
    setResultState('cancelled');
    
    // 2. Background Sync: Tell the backend to mark it as cancelled
    try {
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: (typeof orderData !== 'undefined' ? orderData?.order_id : null) || ('order_fallback_' + incidentId),
          razorpay_payment_id: 'sys_cancelled_' + Date.now(),
          razorpay_signature: 'system_generated_cancellation',
          incident_id: incidentId,
          amount: amountInr,
          mock_status: 'cancelled'
        })
      });
    } catch (err) {
      console.error('Background cancellation sync failed', err);
    }
  };

  const forceDemoSuccess = async () => {
    // 1. Force UI loading state on
    try { setProcessingGateway(true); } catch(e){}
    try { setLoading(true); } catch(e){}

    try {
      // 2. Small delay for visual realism
      await new Promise(resolve => setTimeout(resolve, 1200));

      // 3. Fire the backend update
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: (typeof orderData !== 'undefined' && orderData?.order_id) ? orderData.order_id : incidentId || 'demo_order',
          razorpay_payment_id: 'demo_success_' + Date.now(),
          razorpay_signature: 'demo_signature',
          incident_id: incidentId,
          amount: amountInr,
          mock_status: 'success'
        })
      });
      
      // 4. Force the UI to the success screen instantly
      setResultState('success');
    } catch (err) {
      console.error('Network error, but forcing UI success for demo', err);
      setResultState('success');
    } finally {
      // 5. Clean up spinners
      try { setProcessingGateway(false); } catch(e){}
      try { setLoading(false); } catch(e){}
    }
  };

  const safeOrderId = orderData?.order_id || incidentId || 'demo_order';
  const safeAmount = amountInr || orderData?.amount || 4999;
  const qrTargetUrl = `http://192.168.10.46:5000/api/payments/scan/${safeOrderId}?amount=${safeAmount}`;
  const encodedQrData = encodeURIComponent(qrTargetUrl);

  if (!isOpen) return null;

  if (resultState === 'cancelled') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment order is cancelled.</h2>
          <p className="text-slate-500 mb-8">The transaction was safely aborted.</p>
          <button 
            onClick={onClose} 
            className="bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg w-full hover:bg-slate-700 transition-colors"
          >
            Close & Back to Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] border border-slate-200">
        
        {resultState ? (
          <div className="p-8 text-center">
            {resultState === 'success' && (
              <div className="bg-emerald-50 text-emerald-800 p-8 rounded-lg border border-emerald-200">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-emerald-500" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment is done and amount is recovered.</h3>
                <p className="text-emerald-600 font-semibold">Amount Recovered: ₹{amountInr.toLocaleString('en-IN')}</p>
              </div>
            )}
            
            {resultState === 'failed' && (
              <div className="bg-rose-50 text-rose-800 p-8 rounded-lg border border-rose-200">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="text-rose-500" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment is failed.</h3>
              </div>
            )}
            
            <button
              onClick={() => {
                if (typeof onClose === 'function') onClose();
                if (resultState === 'success') {
                  window.location.reload();
                }
              }}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold"
            >
              Close & Back to Queue
            </button>
          </div>
        ) : (
          <div className="p-6">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">RecoverOS Test Gateway</h2>
                <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-semibold uppercase tracking-wider">
                  Test Mode
                </div>
             </div>

             {processingGateway ? (
               <div className="py-12 flex flex-col items-center justify-center space-y-4">
                 <Loader2 className="animate-spin text-blue-600" size={48} />
                 <p className="text-slate-600 font-medium animate-pulse">Processing Payment...</p>
               </div>
             ) : selectedMethod ? (
               <div className="space-y-4">
                 <div className="flex items-center mb-4">
                   <button onClick={() => setSelectedMethod(null)} className="flex items-center text-slate-500 hover:text-slate-800 transition text-sm font-medium mr-auto">
                     <ArrowLeft size={16} className="mr-1" /> Back
                   </button>
                   <span className="font-semibold text-slate-800">{selectedMethod}</span>
                 </div>
                                  {selectedMethod === 'UPI / QR Code' && (
                    <div className="space-y-4">
                      {upiStep === 'input' ? (
                        <div className="animate-fade-in bg-slate-50 p-6 rounded-lg border border-slate-200 text-left">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Enter UPI ID / VPA</label>
                          <input 
                            type="text" 
                            placeholder="e.g., mobilenumber@ybl or name@okicici" 
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                          <button 
                            onClick={() => setUpiStep('waiting')}
                            disabled={!upiId.includes('@')}
                            className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Verify & Send Request
                          </button>
                        </div>
                      ) : (
                        <div className="text-center animate-fade-in bg-slate-50 p-6 rounded-lg border border-slate-200">
                          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3 text-left animate-slide-in">
                            <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">System Log</p>
                            <p className="text-sm text-green-800">
                              📱 SMS & UPI Push Notification successfully triggered to <span className="font-bold">{upiId}</span>.
                            </p>
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                            <div className="animate-pulse flex justify-center mb-2">
                              <div className="h-2 w-2 bg-blue-600 rounded-full mx-1"></div>
                              <div className="h-2 w-2 bg-blue-600 rounded-full mx-1" style={{animationDelay: '200ms'}}></div>
                              <div className="h-2 w-2 bg-blue-600 rounded-full mx-1" style={{animationDelay: '400ms'}}></div>
                            </div>
                            <h3 className="text-blue-800 font-semibold mb-1">Payment Request Sent</h3>
                            <p className="text-sm text-blue-600">
                              Open your UPI app linked to <span className="font-bold">{upiId}</span> to approve the payment.
                            </p>
                          </div>
                          
                          <div className="border-t border-slate-200 pt-6">
                            <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">Hackathon Demo Proxy</p>
                            <p className="text-xs text-slate-500 mb-2 font-mono">Target: 192.168.10.46:5000</p>
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedQrData}`} 
                              alt="Scan to Pay" 
                              className="mx-auto rounded-lg shadow-sm border border-slate-200 p-2 bg-white" 
                            />
                            <p className="text-sm text-slate-500 mt-4">
                              Scan this QR code with your mobile camera to simulate opening the UPI push notification.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                 {selectedMethod === 'Credit / Debit Card' && (
                   <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-3">
                     <input type="text" placeholder="Card Number" className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-blue-500" defaultValue="4111 1111 1111 1111" />
                     <div className="flex gap-3">
                       <input type="text" placeholder="MM/YY" className="w-1/2 p-3 border border-slate-300 rounded focus:outline-none focus:border-blue-500" defaultValue="12/25" />
                       <input type="text" placeholder="CVV" className="w-1/2 p-3 border border-slate-300 rounded focus:outline-none focus:border-blue-500" defaultValue="123" />
                     </div>
                   </div>
                 )}

                 {selectedMethod === 'Net Banking' && (
                   <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                     <select className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white">
                       <option>Select Bank</option>
                       <option value="sbi">State Bank of India</option>
                       <option value="hdfc">HDFC Bank</option>
                       <option value="icici">ICICI Bank</option>
                       <option value="axis">Axis Bank</option>
                     </select>
                   </div>
                 )}

                 {selectedMethod !== 'UPI / QR Code' && (
                   <button 
                     onClick={forceDemoSuccess}
                     className="w-full p-4 mt-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                   >
                     Proceed to Pay ₹{amountInr.toLocaleString('en-IN')}
                   </button>
                 )}

                  {selectedMethod && (
                    <>
                      <div className="mt-8 border-t border-dashed border-slate-300 pt-6 w-full">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                              Developer Sandbox
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-1 rounded font-bold">TEST MODE</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 text-left leading-relaxed">
                            Network firewall blocking physical device scan? Manually trigger the authorization webhook to advance the state machine.
                          </p>
                          <button 
                            onClick={forceDemoSuccess}
                            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-mono text-xs py-2.5 px-4 rounded shadow-sm transition-colors"
                          >
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            POST /api/webhook/authorize
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={handleCancel} 
                        className="mt-6 w-full py-3 text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Cancel Transaction
                      </button>
                    </>
                  )}
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex justify-between items-center">
                   <span className="text-slate-600">Amount Due:</span>
                   <span className="text-2xl font-bold text-slate-900">₹{amountInr.toLocaleString('en-IN')}</span>
                 </div>
                 
                 <button 
                   onClick={() => setSelectedMethod('UPI / QR Code')}
                   className="w-full p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                 >
                   <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2 rounded text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <Smartphone size={20} />
                     </div>
                     <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">📱 Pay via UPI / QR Code</span>
                   </div>
                 </button>

                 <button 
                   onClick={() => setSelectedMethod('Net Banking')}
                   className="w-full p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                 >
                   <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2 rounded text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <Landmark size={20} />
                     </div>
                     <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">🏦 Net Banking</span>
                   </div>
                 </button>

                 <button 
                   onClick={() => setSelectedMethod('Credit / Debit Card')}
                   className="w-full p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                 >
                   <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2 rounded text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <CreditCardIcon size={20} />
                     </div>
                     <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">💳 Credit / Debit Card</span>
                   </div>
                 </button>

                 <button
                    onClick={() => setOrderData(null)}
                    className="w-full py-3 mt-4 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    Cancel Order
                  </button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
