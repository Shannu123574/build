import React, { useEffect, useState } from 'react';

interface Incident {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
  recovered_amount: number;
  created_at: number;
}

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIncidents = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://localhost:3001/api/incidents');
      const data = await response.json();
      setIncidents(data);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

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
      alert("Failed to connect to backend on port 3001.");
      setLoading(false);
    }
  };

  const handlePaymentSimulation = (paymentId: string, amount: number) => {
    window.open(`http://localhost:3001/api/payments/scan/${paymentId}?amount=${amount}`, '_blank');
    const pollInterval = setInterval(() => { fetchIncidents(); }, 2000);
    setTimeout(() => clearInterval(pollInterval), 30000);
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const totalRecovered = incidents.reduce((sum, inc) => sum + (inc.recovered_amount || 0), 0);
  const totalAtRisk = incidents.reduce((sum, inc) => sum + (inc.status !== 'RECOVERED - SETTLED' ? inc.amount : 0), 0);
  const totalIncidents = incidents.length;

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
        
        <div style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ padding: '10px 12px', backgroundColor: '#F4F6F9', borderRadius: '6px', color: '#2D68F8', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Operations Desk
          </div>
          <div onClick={() => alert("🔒 Sandbox Environment: The AI Risk & Policy Engine is currently running headlessly in the backend.")} style={{ padding: '10px 12px', color: '#515978', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Risk & Policies
          </div>
          <div onClick={() => alert("🔒 Sandbox Environment: The Cryptographic Audit Ledger is securing transactions in the background.")} style={{ padding: '10px 12px', color: '#515978', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Audit Ledger
          </div>
        </div>

        {/* DEVELOPER SANDBOX CREDENTIALS WIDGET */}
        <div style={{ padding: '20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#515978', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Developer Sandbox</p>
          <div style={{ backgroundColor: '#1C2126', padding: '12px', borderRadius: '6px', color: '#F8FAFC', fontSize: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#94A3B8', display: 'block', fontSize: '10px', marginBottom: '2px' }}>TEST CARD (OTP: 123456)</span>
              <span style={{ fontFamily: 'monospace' }}>4111 1111 1111 1111</span>
            </div>
            <div>
              <span style={{ color: '#94A3B8', display: 'block', fontSize: '10px', marginBottom: '2px' }}>TEST UPI ID</span>
              <span style={{ fontFamily: 'monospace', color: '#4ADE80' }}>success@razorpay</span>
            </div>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TOP HEADER */}
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

        {/* PAGE CONTENT */}
        <main style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          
          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>Total Settled via AI</p>
              <h2 style={{ margin: 0, fontSize: '28px', color: '#178C44', fontWeight: '700' }}>{formatINR(totalRecovered)}</h2>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>At Risk (Awaiting Action)</p>
              <h2 style={{ margin: 0, fontSize: '28px', color: '#1C2126', fontWeight: '700' }}>{formatINR(totalAtRisk)}</h2>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#515978', fontWeight: '600', textTransform: 'uppercase' }}>Ledger Status</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#178C44', borderRadius: '50%' }}></div>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#1C2126', fontWeight: '600' }}>Cryptographically Secured</h2>
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
                          <div style={{ color: '#DE350B', fontWeight: '500' }}>⚠️ AI BLOCKED: &gt; ₹10k</div>
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
                  )
                })}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    </div>
  );
}