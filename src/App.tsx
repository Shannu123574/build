import React, { useState, useEffect } from 'react';
import { OperationsQueue } from './components/OperationsQueue'; 

export default function App() {
  const [metrics, setMetrics] = useState({ risk: 0, recovered: 0, pendingCount: 0, rate: 0 });

  const injectMockTraffic = async () => {
    try {
      await fetch('http://localhost:3001/api/payments/seed', { method: 'POST' });
      window.location.reload(); // Hard refresh to instantly update KPI cards and table
    } catch (err) {
      console.error('Failed to inject traffic', err);
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/incidents');
        const data = await res.json();
        
        let currentRisk = 0;
        let currentRecovered = 0;
        let pendingItems = 0;

        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            // Convert to uppercase and remove extra spaces for safe comparison
            const status = (item.status || '').toUpperCase().trim();
            const amount = Number(item.amount) || 0;
            
            // If the status contains ANY success keyword, count it as recovered
            if (status.includes('RECOVERED') || status.includes('SETTLED') || status === 'SUCCESS') {
              currentRecovered += amount;
            } 
            // Otherwise, if it's not explicitly cancelled, it is at risk
            else if (!status.includes('CANCELLED')) {
              currentRisk += amount;
              pendingItems++;
            }
          });
        }

        const totalAmount = currentRisk + currentRecovered;
        const recoveryRate = totalAmount > 0 ? Math.round((currentRecovered / totalAmount) * 100) : 0;

        setMetrics({ risk: currentRisk, recovered: currentRecovered, pendingCount: pendingItems, rate: recoveryRate });
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Live sync every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* 1. ENTERPRISE HEADER */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-sm">
              R
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">RecoverOS</h1>
              <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Powered by Razorpay AI</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">Admin Workspace</span>
            <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-bold">
              JS
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <div className="flex max-w-[1600px] w-full mx-auto h-[calc(100vh-64px)]">
        {/* LEFT SIDEBAR */}
        <aside className="w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col p-6 overflow-y-auto hidden md:block shrink-0">
          
          <div className="mb-6">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">Razorpay AI Buildathon</span>
            <h2 className="text-xl font-bold text-slate-800 mt-3 mb-2">RecoverOS Architecture</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              An intelligent payment orchestration engine designed to capture, manage, and seamlessly recover dropped payment intents.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                🔴 The Problem
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                High checkout abandonment occurs due to network drops, banking timeouts, and complex retry UX. Merchants lose millions in trapped capital because failed intents are treated as terminal states rather than recoverable opportunities.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                🟢 The Solution
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                RecoverOS acts as a middleware state machine. It intercepts failed transactions, standardizes them into an action queue, and provides frictionless, cross-device alternative payment methods (like UPI Collect) to settle the ledger.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Live Demo Flow</h3>
              <ul className="text-sm text-slate-600 space-y-3 font-medium">
                <li className="flex gap-2"><span>1.</span> Select a pending dropped incident.</li>
                <li className="flex gap-2"><span>2.</span> Initiate recovery via UPI Collect.</li>
                <li className="flex gap-2"><span>3.</span> Trigger cross-device mobile scan.</li>
                <li className="flex gap-2"><span>4.</span> Approve on mobile hardware.</li>
                <li className="flex gap-2"><span>5.</span> Watch real-time Node.js backend sync update the KPI dashboard instantly.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Demo Controls</h3>
            <button 
              onClick={injectMockTraffic}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs py-2.5 px-4 rounded shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Inject Mock Traffic
            </button>
          </div>
        </aside>

        {/* RIGHT DASHBOARD CONTENT */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
          
          {/* KPI METRIC CARDS (Dynamic Data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Risk Exposure</p>
              <h2 className="text-3xl font-extrabold text-slate-800">₹{metrics.risk.toLocaleString('en-IN')}</h2>
              <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {metrics.pendingCount} Pending Actions
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">₹</div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Capital Recovered</p>
              <h2 className="text-3xl font-extrabold text-blue-600">₹{metrics.recovered.toLocaleString('en-IN')}</h2>
              <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                ↗ +2.4% from yesterday
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Recovery Rate</p>
              <div className="flex items-end gap-2">
                <h2 className="text-3xl font-extrabold text-slate-800">{metrics.rate}%</h2>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${metrics.rate}%` }}></div>
              </div>
            </div>
          </div>

          {/* 3. OPERATIONS QUEUE WRAPPER */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
              <h3 className="text-lg font-bold text-slate-800">Active Recovery Queue</h3>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Live Sync Active</span>
            </div>
            <div className="p-0">
              <OperationsQueue />
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
}
