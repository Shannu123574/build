import React, { useEffect, useState } from 'react';
import { ShieldAlert, Activity, CheckCircle, Clock } from 'lucide-react';

export const OperationsQueue: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [envState, setEnvState] = useState<string>('UNKNOWN');

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
    const interval = setInterval(fetchData, 5000);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-6 rounded-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-indigo-400" />
            Operations Queue
          </h2>
          <p className="text-slate-400 mt-1">Live tracking of active and resolved recovery incidents.</p>
        </div>
        <div className="flex items-center gap-3">
          {envState === 'SIMULATION' && (
            <button onClick={clearDemoData} className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs transition font-semibold">
              Clear local demo data
            </button>
          )}
          {envState === 'RAZORPAY_TEST_MODE' && <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded border border-amber-500/50 text-sm font-mono font-bold">RAZORPAY TEST MODE</span>}
          {envState === 'SIMULATION' && <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 text-sm font-mono font-bold">SIMULATION</span>}
          {envState === 'PRODUCTION_LOCKED' && <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded border border-rose-500/50 text-sm font-mono font-bold flex items-center gap-1"><ShieldAlert size={14} /> PRODUCTION LOCKED</span>}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No active incidents found in the server database. Send a webhook to begin.</div>
        ) : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Incident / Payment ID</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Amount (₹)</th>
                <th className="px-6 py-4 font-semibold">Recovered (₹)</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {incidents.map(inc => (
                <tr key={inc.id} className="hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-indigo-400">{inc.id}</div>
                    <div className="text-xs text-slate-500">{inc.payment_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      inc.status === 'RECOVERED' ? 'bg-emerald-500/20 text-emerald-400' :
                      inc.status === 'POLICY_DENIED' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {inc.status === 'RECOVERED' && envState === 'SIMULATION' ? 'RECOVERED — SIMULATED SETTLEMENT' : inc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono">₹{inc.amount}</td>
                  <td className="px-6 py-4 font-mono text-emerald-400">₹{inc.recovered_amount}</td>
                  <td className="px-6 py-4 text-right">
                    {inc.status === 'ACTION_EXECUTED' ? (
                      <button onClick={() => reconcile(inc.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition flex items-center gap-1 inline-flex">
                        <CheckCircle size={12} /> Verify Gateway
                      </button>
                    ) : (
                      <span className="text-slate-500 text-xs flex items-center gap-1 justify-end">
                        {inc.status === 'RECOVERED' ? <CheckCircle size={12} /> : <Clock size={12} />} 
                        {inc.status === 'RECOVERED' ? 'Settled' : 'Pending'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
