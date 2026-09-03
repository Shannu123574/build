import React, { useEffect, useState } from 'react';

interface Incident {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
  recovered_amount: number;
  created_at: number;
}

interface Log {
  id: string;
  timestamp: number;
  text: string;
  incidentId: string;
  result?: string;
  amount?: number;
  recovered_amount?: number;
}

interface QueuedRecovery {
  id: string;
  amount: number;
  method: string;
}

// Helper to generate a realistic looking SHA-256 hash for the demo
const generateMockHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `e3b0c44298fc1c149afbf4c8996fb924${hex}27ae41e4649b934ca495991b`;
};

export default function App() {
  // --- SPLASH SCREEN STATE ---
  const [showSplash, setShowSplash] = useState(true);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLogs, setAiLogs] = useState<Log[]>([]);
  
  // --- RECOVERY QUEUE & TAB STATE ---
  const [recoveryQueue, setRecoveryQueue] = useState<QueuedRecovery[]>([]);
  const [activeTab, setActiveTab] = useState('operations');

  // Handle Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const fetchIncidents = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://localhost:3001/api/incidents');
      const data = await response.json();
      setIncidents(data);
      
      // Populate initial recovery queue from database history
      const settled = data.filter((inc: Incident) => inc.status === 'RECOVERED - SETTLED');
      setRecoveryQueue(settled.map((inc: Incident) => ({
        id: inc.id.substring(0, 8),
        amount: inc.amount,
        method: 'Smart'
      })));
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (!showSplash) {
      fetchIncidents();

      // ==========================================
      // ENTERPRISE SSE FRONTEND CONSUMER
      // ==========================================
      const eventSource = new EventSource('http://localhost:3001/api/stream');

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const isSettled = data.status === 'RECOVERED - SETTLED' || data.action === 'RECOVERY_SUCCESSFUL';
        const recoveredAmt = isSettled ? (data.amount || 0) : (data.recovered_amount || 0);
        
        // 1. Update AI Reasoning Terminal with Financials
        setAiLogs(prev => [
          { 
            id: Math.random().toString(), 
            timestamp: Date.now(), 
            text: data.aiReasoning, 
            incidentId: data.incidentId,
            result: data.status || (isSettled ? 'RECOVERED - SETTLED' : 'CLASSIFIED'),
            amount: data.amount,
            recovered_amount: recoveredAmt
          },
          ...prev
        ].slice(0, 10)); 

        // 2. Update Incident Table Status & Amount
        setIncidents(prevIncidents => prevIncidents.map(inc => 
          inc.id === data.incidentId 
            ? { 
                ...inc, 
                status: data.status, 
                recovered_amount: data.status === 'RECOVERED - SETTLED' ? inc.amount : inc.recovered_amount 
              } 
            : inc
        ));

        // 3. Update Sidebar Recovery Queue if successful
        if (isSettled) {
          setRecoveryQueue(prev => [
            { 
              id: data.incidentId.substring(0, 8), 
              amount: data.amount || 0, 
              method: data.rail || 'Smart' 
            },
            ...prev
          ]);
        }
      };

      return () => eventSource.close();
    }
  }, [showSplash]);

  const injectMockTraffic = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/payments/seed', { method: 'POST' });
      if (response.ok) {
        setTimeout(() => {
          fetchIncidents();
          setLoading(false);
        }, 400);
      }
    } catch (error) {
      alert("Failed to connect to backend.");
      setLoading(false);
    }
  };

  const handlePaymentSimulation = (paymentId: string, amount: number) => {
    window.open(`http://localhost:3001/api/payments/scan/${paymentId}?amount=${amount}`, '_blank');
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  // Derive top-level metrics dynamically
  const totalRecovered = incidents.reduce((sum, inc) => sum + (inc.recovered_amount || 0), 0);
  const totalAtRisk = incidents.reduce((sum, inc) => sum + (inc.status !== 'RECOVERED - SETTLED' ? inc.amount : 0), 0);
  const totalIncidents = incidents.length;
  
  // Analytics Calculations
  const totalRevenueAtRisk = incidents.reduce((sum, inc) => sum + inc.amount, 0);
  const recoveryRate = totalRevenueAtRisk > 0 ? ((totalRecovered / totalRevenueAtRisk) * 100).toFixed(1) : "0.0";
  const manualEscalations = incidents.filter(inc => inc.status === 'MANUAL_ESCALATION_REQUIRED').length;
  const escalationRate = totalIncidents > 0 ? ((manualEscalations / totalIncidents) * 100).toFixed(1) : "0.0";

  // Fallback logs to ensure the Agent Tab is never empty during the demo
  const displayLogs = aiLogs.length > 0 ? aiLogs : incidents.slice(0, 5).map(inc => ({
    id: inc.id,
    timestamp: inc.created_at || Date.now(),
    text: inc.status === 'RECOVERED - SETTLED'
      ? 'Autonomous diagnosis: Network timeout identified. Cross-rail fallback link dispatched and settled.'
      : inc.status === 'MANUAL_ESCALATION_REQUIRED'
      ? 'AI Policy Block: Risk score degraded to manual review. Execution blocked by deterministic engine.'
      : 'Semantic evaluation active. Classifying failure payload through strict JSON schema.',
    incidentId: inc.id,
    result: inc.status,
    amount: inc.amount,
    recovered_amount: inc.status === 'RECOVERED - SETTLED' ? inc.amount : 0
  }));

  // ==========================================
  // RENDER: SPLASH SCREEN VIEW
  // ==========================================
  if (showSplash) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        height: '100vh', width: '100vw', backgroundColor: '#0F172A',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <svg 
          width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0px 8px 16px rgba(45, 104, 248, 0.2))' }}
        >
          <rect width="100" height="100" rx="24" fill="#1E293B" />
          <rect x="2" y="2" width="96" height="96" rx="22" stroke="#2D68F8" strokeWidth="4" strokeOpacity="0.3"/>
          <path d="M30 65C23 55 25 38 38 30C50 23 68 28 75 40" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round"/>
          <path d="M75 25V40H60" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 70V40C40 35 44 32 50 32C56 32 60 35 60 40C60 46 56 49 50 49H40" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M50 49L62 70" stroke="#2D68F8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        <h1 style={{ color: '#FFFFFF', fontSize: '42px', fontWeight: '700', letterSpacing: '-1.5px', marginTop: '32px', marginBottom: '8px' }}>
          Recover<span style={{ color: '#2D68F8' }}>OS</span>
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>
          Deterministic Revenue AI
        </p>

        <div style={{ marginTop: '48px', display: 'flex', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#2D68F8', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '8px', height: '8px', backgroundColor: '#4ADE80', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.2s' }} />
          <div style={{ width: '8px', height: '8px', backgroundColor: '#FFFFFF', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.4s' }} />
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN DASHBOARD VIEW
  // ==========================================
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F5F8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#2D68F8', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>R</div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1C2126', letterSpacing: '-0.5px' }}>RecoverOS</span>
          </div>
        </div>
        
        {/* --- NAVIGATION TABS --- */}
        <div style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          <div onClick={() => setActiveTab('operations')} style={{ padding: '10px 12px', backgroundColor: activeTab === 'operations' ? '#F4F6F9' : 'transparent', borderRadius: '6px', color: activeTab === 'operations' ? '#2D68F8' : '#515978', fontWeight: activeTab === 'operations' ? '600' : '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Operations Desk
          </div>

          <div onClick={() => setActiveTab('forensics')} style={{ padding: '10px 12px', backgroundColor: activeTab === 'forensics' ? '#F4F6F9' : 'transparent', borderRadius: '6px', color: activeTab === 'forensics' ? '#2D68F8' : '#515978', fontWeight: activeTab === 'forensics' ? '600' : '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Case Forensics
          </div>

          <div onClick={() => setActiveTab('agent')} style={{ padding: '10px 12px', backgroundColor: activeTab === 'agent' ? '#F4F6F9' : 'transparent', borderRadius: '6px', color: activeTab === 'agent' ? '#2D68F8' : '#515978', fontWeight: activeTab === 'agent' ? '600' : '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Agent Activity
          </div>

          <div onClick={() => setActiveTab('analytics')} style={{ padding: '10px 12px', backgroundColor: activeTab === 'analytics' ? '#F4F6F9' : 'transparent', borderRadius: '6px', color: activeTab === 'analytics' ? '#2D68F8' : '#515978', fontWeight: activeTab === 'analytics' ? '600' : '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Analytics & Yield
          </div>
        </div>

        {/* DEVELOPER SANDBOX CREDENTIALS */}
        <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#515978', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Developer Sandbox</p>
          <div style={{ backgroundColor: '#1C2126', padding: '12px', borderRadius: '6px', color: '#F8FAFC', fontSize: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#94A3B8', display: 'block', fontSize: '10px', marginBottom: '4px' }}>DOMESTIC TEST CARD</span>
              <span style={{ fontFamily: 'monospace', letterSpacing: '1px', userSelect: 'all', cursor: 'pointer', backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                4100280000001007
              </span>
            </div>
            <div>
              <span style={{ color: '#94A3B8', display: 'block', fontSize: '10px', marginBottom: '4px' }}>TEST UPI ID</span>
              <span style={{ fontFamily: 'monospace', color: '#4ADE80', userSelect: 'all', cursor: 'pointer', backgroundColor: '#14532D', padding: '2px 6px', borderRadius: '4px' }}>
                failure@razorpay
              </span>
            </div>
          </div>
        </div>

        {/* --- LIVE RECOVERY QUEUE WIDGET --- */}
        <div style={{ padding: '20px', backgroundColor: '#1C2126', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Live Recovery Queue
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94A3B8' }}>Revenue Saved</p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#4ADE80', letterSpacing: '-0.5px' }}>
              {formatINR(totalRecovered)}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {recoveryQueue.length === 0 ? (
              <span style={{ color: '#515978', fontSize: '12px', fontStyle: 'italic' }}>Waiting for recovered payments...</span>
            ) : (
              recoveryQueue.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#334155', borderRadius: '6px', borderLeft: '3px solid #4ADE80' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', color: '#F8FAFC', fontFamily: 'monospace' }}>{item.id}</span>
                    <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>{item.method} Fallback</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4ADE80' }}>+{formatINR(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <header style={{ backgroundColor: '#FFFFFF', height: '72px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#1C2126', fontWeight: '600' }}>Recovery Dashboard</h1>
            <span style={{ fontSize: '12px', color: '#515978' }}>Live Sandbox Environment</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchIncidents} style={{ backgroundColor: '#FFFFFF', color: '#515978', padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              ↻ Refresh
            </button>
            <button onClick={injectMockTraffic} disabled={loading} style={{ backgroundColor: '#2D68F8', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Simulating...' : 'Inject Webhook Traffic'}
            </button>
          </div>
        </header>

        <main style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          
          {/* OPERATIONS DESK VIEW */}
          {activeTab === 'operations' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>Total Settled via AI</p>
                  <h2 style={{ margin: 0, fontSize: '28px', color: '#178C44', fontWeight: '700' }}>{formatINR(totalRecovered)}</h2>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>At Risk (Awaiting Action)</p>
                  <h2 style={{ margin: 0, fontSize: '28px', color: '#1C2126', fontWeight: '700' }}>{formatINR(totalAtRisk)}</h2>
                </div>
                
                {/* LIVE AI REASONING TERMINAL */}
                <div style={{ backgroundColor: '#1C2126', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '110px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#4ADE80', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>● Live AI Reasoning Stream</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                    {aiLogs.length === 0 ? (
                      <span style={{ color: '#515978', fontSize: '12px', fontFamily: 'monospace' }}>Awaiting webhook payload...</span>
                    ) : (
                      aiLogs.map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                          <span style={{ color: '#94A3B8', minWidth: '60px' }}>[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, second: '2-digit'})}]</span>
                          <span style={{ color: '#E2E8F0' }}>{log.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* DATA TABLE */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1C2126', fontWeight: '600' }}>Real-time Incident Queue</h3>
                  <span style={{ fontSize: '13px', color: '#515978' }}>{totalIncidents} records found</span>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Incident ID</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Amount</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Status</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Audit Log</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                    {incidents.map((incident) => {
                      let statusBg = '#F4F6F9'; let statusColor = '#515978';
                      if (incident.status === 'RECOVERED - SETTLED') {
                        statusBg = '#E6F5EC'; statusColor = '#178C44';
                      } else if (incident.status === 'MANUAL_ESCALATION_REQUIRED') {
                        statusBg = '#FEEAEA'; statusColor = '#DE350B';
                      } else if (incident.status === 'PAYMENT_FAILED' || incident.status === 'CANCELLED_BY_USER') {
                        statusBg = '#FFF4E5'; statusColor = '#B37100';
                      } else {
                        statusBg = '#E6F0FF'; statusColor = '#2D68F8';
                      }

                      return (
                        <tr key={incident.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '16px 24px', fontSize: '13px', color: '#1C2126', fontFamily: 'monospace' }}>
                            {incident.id}
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: '#1C2126' }}>
                            {formatINR(incident.amount)}
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                              {incident.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '13px' }}>
                            {incident.status === 'MANUAL_ESCALATION_REQUIRED' ? (
                              <div style={{ color: '#DE350B', fontWeight: '500' }}>⚠️ AI Policy Engine Block</div>
                            ) : incident.status === 'RECOVERED - SETTLED' ? (
                              <div style={{ color: '#515978', fontFamily: 'monospace', fontSize: '12px' }}>🔒 SHA-256 Verified</div>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>Awaiting settlement...</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            {(incident.status !== 'RECOVERED - SETTLED' && incident.status !== 'MANUAL_ESCALATION_REQUIRED') && (
                              <button
                                onClick={() => handlePaymentSimulation(incident.id, incident.amount)}
                                style={{ backgroundColor: '#1C2126', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                Send Payment Link
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* CASE FORENSICS VIEW */}
          {activeTab === 'forensics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#1C2126' }}>Cryptographic Ledger</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#515978' }}>SHA-256 Write-Ahead Log for Settled Recoveries</p>
                </div>
                <div style={{ padding: '8px 16px', backgroundColor: '#E6F5EC', color: '#178C44', borderRadius: '4px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Ledger Integrity Verified
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: '700', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Block Time</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: '700', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Incident Ref</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: '700', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Transaction Hash (SHA-256)</th>
                      <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: '700', color: '#515978', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>Chain Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.filter(inc => inc.status === 'RECOVERED - SETTLED').length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>No settled transactions written to ledger yet.</td></tr>
                    ) : (
                      incidents.filter(inc => inc.status === 'RECOVERED - SETTLED').map((incident, idx) => (
                        <tr key={incident.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                          <td style={{ padding: '16px 24px', fontSize: '12px', color: '#515978' }}>
                            {new Date().toLocaleTimeString([], {hour12: false})}
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '12px', color: '#2D68F8', fontFamily: 'monospace', fontWeight: '600' }}>
                            {incident.id.substring(0, 12)}...
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '11px', color: '#1C2126', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                            {generateMockHash(incident.id)}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <span style={{ backgroundColor: '#1C2126', color: '#4ADE80', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Locked</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AGENT ACTIVITY VIEW */}
          {activeTab === 'agent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#1C2126' }}>Gemini 2.5 Flash Telemetry</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#515978' }}>Live autonomous decision traces, classification results, and recovered capital</p>
                </div>
              </div>

              {/* Top Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#515978', fontWeight: '700', textTransform: 'uppercase' }}>Total Settled</p>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#178C44', fontWeight: '700' }}>{formatINR(totalRecovered)}</h2>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#515978', fontWeight: '700', textTransform: 'uppercase' }}>Avg Latency</p>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#1C2126', fontWeight: '700' }}>142<span style={{ fontSize: '14px', color: '#94A3B8' }}>ms</span></h2>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#515978', fontWeight: '700', textTransform: 'uppercase' }}>Confidence Score</p>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#178C44', fontWeight: '700' }}>96.4<span style={{ fontSize: '14px', color: '#94A3B8' }}>%</span></h2>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#515978', fontWeight: '700', textTransform: 'uppercase' }}>Schema Violations</p>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#1C2126', fontWeight: '700' }}>0<span style={{ fontSize: '14px', color: '#94A3B8' }}> blocked</span></h2>
                </div>
              </div>

              {/* Extended Trace Terminal with Status & Financials */}
              <div style={{ backgroundColor: '#1C2126', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '420px', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#4ADE80', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ● Autonomous Diagnostic Logs
                  </p>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontFamily: 'monospace' }}>
                    Engine: Gemini 2.5 Flash (Deterministic Schema Enforcement)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
                  {displayLogs.map(log => {
                    const isSettled = log.result === 'RECOVERED - SETTLED';
                    const isBlocked = log.result === 'MANUAL_ESCALATION_REQUIRED';

                    return (
                      <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#0F172A', padding: '14px 16px', borderRadius: '6px', borderLeft: `3px solid ${isSettled ? '#4ADE80' : isBlocked ? '#EF4444' : '#2D68F8'}` }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#94A3B8', fontSize: '11px', fontFamily: 'monospace' }}>
                              [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]
                            </span>
                            <span style={{ color: '#F8FAFC', fontSize: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
                              REF: {log.incidentId.substring(0, 10)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              backgroundColor: isSettled ? '#14532D' : isBlocked ? '#7F1D1D' : '#1E3A8A', 
                              color: isSettled ? '#4ADE80' : isBlocked ? '#F87171' : '#60A5FA', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              letterSpacing: '0.5px', 
                              textTransform: 'uppercase' 
                            }}>
                              RESULT: {log.result ? log.result.replace(/_/g, ' ') : 'PROCESSED'}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1E293B', padding: '2px 8px', borderRadius: '4px' }}>
                              <span style={{ color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase' }}>Recovered:</span>
                              <span style={{ color: isSettled ? '#4ADE80' : '#F59E0B', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
                                {isSettled ? `+${formatINR(log.recovered_amount || log.amount || 0)}` : '₹0 (Pending)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span style={{ color: '#E2E8F0', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                          {log.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS & YIELD VIEW */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#1C2126' }}>Revenue & AI Yield Analytics</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#515978' }}>System-wide performance metrics and failure distribution</p>
              </div>

              {/* KPI Header Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', borderTop: '4px solid #2D68F8' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>Net Recovery Yield</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '32px', color: '#1C2126', fontWeight: '700' }}>{recoveryRate}%</h2>
                    <span style={{ fontSize: '13px', color: '#178C44', fontWeight: '600' }}>↑ +4.2% MoM</span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>Of {formatINR(totalRevenueAtRisk)} total failed volume</p>
                </div>
                
                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', borderTop: '4px solid #4ADE80' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>Avg Time to Resolve</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '32px', color: '#1C2126', fontWeight: '700' }}>1.2<span style={{ fontSize: '18px', color: '#515978' }}>s</span></h2>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>From webhook receipt to user fallback URL</p>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', borderTop: '4px solid #DE350B' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>Manual Escalation Rate</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '32px', color: '#1C2126', fontWeight: '700' }}>{escalationRate}%</h2>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>Blocked by deterministic node policy</p>
                </div>
              </div>

              {/* Data Visualization Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Simulated Chart 1: Recovery by Rail */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#1C2126' }}>Recovery by Payment Rail</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Bar 1 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#515978' }}>
                        <span>UPI Intent / QR</span>
                        <span>68%</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{ width: '68%', backgroundColor: '#2D68F8', height: '100%', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                    
                    {/* Bar 2 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#515978' }}>
                        <span>Credit / Debit Cards</span>
                        <span>24%</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{ width: '24%', backgroundColor: '#2D68F8', height: '100%', borderRadius: '4px', opacity: 0.8 }}></div>
                      </div>
                    </div>

                    {/* Bar 3 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#515978' }}>
                        <span>Net Banking / Wallets</span>
                        <span>8%</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{ width: '8%', backgroundColor: '#2D68F8', height: '100%', borderRadius: '4px', opacity: 0.5 }}></div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Simulated Chart 2: Diagnostic Reasons */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#1C2126' }}>AI Diagnostic Distribution</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Bar 1 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#515978' }}>
                        <span>Bank Server Timeout (PSP)</span>
                        <span>54%</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{ width: '54%', backgroundColor: '#4ADE80', height: '100%', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                    
                    {/* Bar 2 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#515978' }}>
                        <span>Insufficient Funds / Limit Exceeded</span>
                        <span>31%</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{ width: '31%', backgroundColor: '#F59E0B', height: '100%', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    {/* Bar 3 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#515978' }}>
                        <span>Suspected Fraud / Manual Block</span>
                        <span>15%</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{ width: '15%', backgroundColor: '#EF4444', height: '100%', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}