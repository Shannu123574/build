import React, { useState } from 'react';
import { JudgeDemoRun, JudgeDemoScenario, runJudgeDemoScenario } from '../services/judgeDemoWorkflow.ts';
import { runHeldOutEvaluation } from '../services/heldOutEvaluation.ts';

const scenarios: Array<{ id: JudgeDemoScenario; title: string; description: string }> = [
  { id: 'RECOVERABLE_LOW_BALANCE', title: 'Low-balance recovery attempt', description: 'Signed failure event → advisory diagnosis → policy-approved sandbox recovery.' },
  { id: 'VERIFIED_SANDBOX_RECOVERY', title: 'Verified sandbox recovery', description: 'Signed transient issuer-outage event → approved → DEMO_SANDBOX SUCCESS.' },
  { id: 'FRAUD_BLOCK', title: 'High-risk fraud', description: 'Signed failure event → policy block → no gateway execution.' },
  { id: 'FORGED_SIGNATURE', title: 'Forged signature', description: 'Invalid HMAC → rejected before diagnosis or payment action.' },
  { id: 'DUPLICATE_REPLAY', title: 'Duplicate replay', description: 'First delivery processes once; the replay is ignored.' },
];

export const Track03Demo: React.FC = () => {
  const [run, setRun] = useState<JudgeDemoRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [heldOut, setHeldOut] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const execute = async (scenario: JudgeDemoScenario) => {
    setLoading(true); setHeldOut(null); setRun(null); setErrorMsg(null);
    try { 
      setRun(await runJudgeDemoScenario(scenario)); 
    } catch (e: any) {
      setErrorMsg(`Pipeline Execution Error: ${e.message}`);
    } finally { 
      setLoading(false); 
    }
  };
  const executeHeldOut = async () => {
    setLoading(true); setHeldOut(null); setRun(null); setErrorMsg(null);
    try {
      const report = await runHeldOutEvaluation();
      setHeldOut(`${report.totalCases} held-out engineered cases; recovery ${report.recoveryRatePercent.toFixed(2)}%; recovered ₹${report.revenueRecoveredInr.toFixed(2)}. This is simulation evidence, not a production recovery rate.`);
    } catch (e: any) {
      setErrorMsg(`Evaluation Error: ${e.message}`);
    } finally { setLoading(false); }
  };

  return <div className="space-y-6 p-6 max-w-6xl mx-auto">
    <section className="bg-slate-900 border border-slate-700 p-7 rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div><h2 className="text-3xl font-bold text-white">Executable Track 03 Recovery Demo</h2><p className="text-slate-400 mt-2">Each scenario uses a locally generated, signed Razorpay-shaped test event. Production execution is locked.</p></div>
        <span className="font-mono text-xs px-3 py-2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">SIMULATION / TEST EVENT ONLY</span>
      </div>
    </section>
    <section className="grid md:grid-cols-2 gap-4">
      {scenarios.map(s => <button key={s.id} disabled={loading} onClick={() => execute(s.id)} className="text-left bg-slate-800 border border-slate-700 hover:border-emerald-500/60 disabled:opacity-50 rounded-xl p-5 transition">
        <h3 className="text-white font-bold">{s.title}</h3><p className="text-slate-400 text-sm mt-2">{s.description}</p><span className="inline-block text-emerald-400 font-mono text-xs mt-4">RUN SCENARIO →</span>
      </button>)}
    </section>
    <section className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-sm text-slate-200 min-h-64">
      <h3 className="text-emerald-400 font-bold mb-4">ACTUAL PIPELINE EVIDENCE</h3>
      {!run && !loading && !heldOut && !errorMsg && <p className="text-slate-500">Choose a scenario to execute the signed webhook pipeline.</p>}
      {loading && <p className="text-slate-400">Executing deterministic policy and sandbox workflow...</p>}
      {errorMsg && <p className="text-rose-400">❌ {errorMsg}</p>}
      {heldOut && <p className="text-emerald-300">📊 {heldOut}</p>}
      {run && <div className="space-y-2">
        <p><span className="text-slate-500">Evidence:</span> {run.evidenceLabel ?? 'N/A'}</p>
        <p><span className="text-slate-500">Ingress:</span> {run.result?.status ?? 'UNKNOWN'} — {run.result?.message ?? 'N/A'}</p>
        {run.result?.diagnosis && <p><span className="text-slate-500">Advisory diagnosis:</span> {run.result.diagnosis.failureCategory ?? 'N/A'} ({run.result.diagnosis.isAiFallback ? 'deterministic fallback; no Gemini credential configured' : 'Gemini advisory output'})</p>}
        {(run.result?.policyDecision || run.result?.policy) && <><p><span className="text-slate-500">Policy:</span> {(run.result?.policyDecision?.accepted ?? run.result?.policy?.approved ?? false) ? 'APPROVED' : `BLOCKED — ${run.result?.policy?.denialReason ?? 'N/A'}`}</p><p><span className="text-slate-500">Checks:</span> {(run.result?.policyDecision?.checks || (run.result?.policy?.rulesEvaluated || []).map(r => r.ruleName)).map((chk: string) => `✅ ${chk}`).join(' | ') || 'N/A'}</p></>}
        {run.result?.gatewayExecution && <p><span className="text-slate-500">Gateway:</span> {run.result.gatewayExecution.environment ?? 'DEMO_SANDBOX'} / {run.result.gatewayExecution.status ?? 'N/A'} / ₹{(run.result.gatewayExecution.amountRecoveredInr ?? 0).toFixed(2)} simulated recovery</p>}
        <p><span className="text-slate-500">Audit ledger:</span> {run.ledgerIntegrity?.isValid ? `SHA-256 verified (${run.ledgerIntegrity?.verifiedRecordsCount ?? 0} records, tip: ${(run.ledgerIntegrity as any)?.latestHash?.slice(0, 8) ?? 'N/A'}...)` : `FAILED: ${run.ledgerIntegrity?.error ?? 'N/A'}`}</p>
        <p className="text-emerald-300">{run.summary ?? 'N/A'}</p>
      </div>}
    </section>
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-wrap gap-4 items-center justify-between"><div><h3 className="text-white font-bold">Held-out evaluation</h3><p className="text-slate-400 text-sm mt-1">Separately run synthetic/engineered evidence; it does not represent live merchant outcomes.</p></div><button disabled={loading} onClick={executeHeldOut} className="px-4 py-2 bg-slate-900 border border-slate-600 text-emerald-400 rounded font-mono text-xs">RUN HELD-OUT EVAL</button>{heldOut && <p className="basis-full text-slate-300 text-sm">{heldOut}</p>}</section>
  </div>;
};
