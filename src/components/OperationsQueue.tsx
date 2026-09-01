import React, { useEffect, useState } from 'react';
import { ShieldAlert, Activity, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';

export const OperationsQueue: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [envState, setEnvState] = useState<string>('UNKNOWN');
  
  // Checkout Modal State
  const [activeCheckout, setActiveCheckout] = useState<any>(null);

  const handleSecurityReview = (orderId: string) => {
    alert(`Security Protocol Initiated for ${orderId}.\n\nAn automated KYC verification email has been sent to the customer. Recovery is paused until identity is verified.`);
  };

  const fetchData = async () => {
    try {
      const healthRes = await fetch('http://localhost:3001/api/health');
      if (healthRes.ok) {
        const health = await healthRes.json();
        setEnvState(health.environment);
      }

      const res = await fetch('http://localhost:3001/api/incidents');
      if (res.ok) {
        setIncidents(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch from server', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const reconcile = async (id: string) => {
    await fetch(`http://localhost:3001/api/incidents/${id}/reconcile`, { method: 'POST' });
    fetchData();
  };

  const clearDemoData = async () => {
    if (window.confirm('Delete all local SQLite simulation records? This cannot be undone.')) {
      await fetch('http://localhost:3001/api/demo/clear', { method: 'DELETE' });
      fetchData();
    }
  };

  const handlePaymentSuccess = () => {
    fetchData();
  };

  const totalRisk = incidents.filter(i => !i.status?.includes('RECOVERED') && i.status !== 'CANCELLED').reduce((sum, i) => sum + i.amount, 0);
  const totalRecovered = incidents.filter(i => i.status?.includes('RECOVERED')).reduce((sum, i) => sum + i.amount, 0);
  const totalValid = totalRisk + totalRecovered;
  const recoveryRate = totalValid > 0 ? ((totalRecovered / totalValid) * 100).toFixed(1) : '0.0';

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Operations Queue</h2>
            <p className="text-sm text-slate-500 mt-1">Live tracking of active and resolved recovery incidents.</p>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 font-medium">Loading incidents...</div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Activity size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">No active incidents found.</p>
              <p className="text-sm">Send a webhook to populate the database.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-700">Incident / Payment ID</th>
                  <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                  <th className="px-6 py-4 font-bold text-slate-700">Amount (₹)</th>
                  <th className="px-6 py-4 font-bold text-slate-700">Recovered (₹)</th>
                  <th className="px-6 py-4 font-bold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map(inc => {
                  const currentStatus = (inc.status || '').toUpperCase();
                  const isSettled = currentStatus.includes('SETTLED') || currentStatus.includes('RECOVERED') || currentStatus === 'SUCCESS';
                  const displayRecoveredAmount = isSettled ? inc.amount : (inc.recovered_amount || 0);

                  return (
                    <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-bold text-blue-600">{inc.id}</div>
                        <div className="text-xs text-slate-400 mt-1">{inc.payment_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        {currentStatus === 'CANCELLED' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Cancelled
                          </span>
                        ) : currentStatus === 'PAYMENT_FAILED' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Payment Failed
                          </span>
                        ) : currentStatus.includes('RECOVERED') ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700">₹{inc.amount}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                        ₹{['PAYMENT_FAILED', 'CANCELLED'].includes(currentStatus) ? 0 : displayRecoveredAmount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(currentStatus === 'CANCELLED' || currentStatus === 'PAYMENT_FAILED') ? (
                          <button 
                            onClick={() => setActiveCheckout(inc)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-xs transition-colors flex items-center gap-1 inline-flex ml-auto justify-end bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 hover:bg-blue-100"
                          >
                            <CreditCard size={14} /> Retry Recovery
                          </button>
                        ) : currentStatus.includes('RECOVERED') ? (
                          <span className="text-emerald-600 text-xs flex items-center gap-1 justify-end font-bold px-2 py-1.5 rounded inline-flex ml-auto">
                            <CheckCircle size={14} /> Ledger Settled
                          </span>
                        ) : (currentStatus === 'POLICY_DENIED' || currentStatus.includes('FRAUD') || currentStatus.includes('STOLEN') || currentStatus.includes('BLOCKED')) ? (
                          <button 
                            onClick={() => handleSecurityReview(inc.id)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1 justify-end ml-auto"
                          >
                            <ShieldAlert size={14} /> Review Risk / Request KYC
                          </button>
                        ) : (
                          <button 
                            onClick={() => setActiveCheckout(inc)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition flex items-center gap-2 inline-flex ml-auto shadow-sm font-bold"
                          >
                            <CreditCard size={14} /> Initiate Recovery
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeCheckout && (
        <CheckoutModal 
          isOpen={!!activeCheckout}
          onClose={() => {
            setActiveCheckout(null);
            fetchData();
          }}
          incidentId={activeCheckout.id}
          amountInr={activeCheckout.amount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};
