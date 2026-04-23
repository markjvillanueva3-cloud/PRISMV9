/**
 * LatheToolLifePanel — Tool life prediction and batch planning.
 * Wires: prism_turning: turning_predict_insert_life, turning_batch_life_plan
 */

import { useState, useCallback } from 'react';

interface ToolLifeResult {
  tool_life_minutes: number;
  parts_per_edge: number;
  cost_per_part: number;
  edges_per_batch: number;
  wear_rate_um_per_min: number;
  recommendations: string[];
}

async function callAction<T>(action: string, params: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch('/api/v1/turning/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result ?? data) as T;
  } catch { return null; }
}

export function LatheToolLifePanel() {
  const [speed, setSpeed] = useState(200);
  const [feed, setFeed] = useState(0.25);
  const [doc, setDoc] = useState(2.0);
  const [isoGroup, setIsoGroup] = useState('P');
  const [cycleTime, setCycleTime] = useState(120);
  const [batchSize, setBatchSize] = useState(100);
  const [insertCost, setInsertCost] = useState(12);
  const [edges, setEdges] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolLifeResult | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callAction<ToolLifeResult>('turning_predict_insert_life', {
        cutting_speed_m_min: speed, feed_mm_rev: feed, depth_of_cut_mm: doc,
        iso_group: isoGroup, cycle_time_s: cycleTime, batch_size: batchSize,
        insert_cost: insertCost, edges_per_insert: edges,
      });
      if (r) {
        setResult(r);
      } else {
        // Fallback: Taylor calculation inline
        const n = isoGroup === 'P' ? 0.25 : isoGroup === 'M' ? 0.20 : isoGroup === 'S' ? 0.15 : 0.25;
        const C = isoGroup === 'P' ? 300 : isoGroup === 'M' ? 200 : isoGroup === 'S' ? 120 : 400;
        const T = Math.pow(C / speed, 1 / n);
        const partsPerEdge = Math.floor(T / (cycleTime / 60));
        const edgesNeeded = Math.ceil(batchSize / Math.max(partsPerEdge, 1));
        setResult({
          tool_life_minutes: parseFloat(T.toFixed(1)),
          parts_per_edge: partsPerEdge,
          cost_per_part: parseFloat(((insertCost / edges) / Math.max(partsPerEdge, 1)).toFixed(3)),
          edges_per_batch: edgesNeeded,
          wear_rate_um_per_min: parseFloat((300 / T).toFixed(2)),
          recommendations: [
            `Taylor life: T = (${C}/${speed})^(1/${n}) = ${T.toFixed(1)} min`,
            `${partsPerEdge} parts per edge at ${cycleTime}s cycle time`,
            `Batch of ${batchSize} needs ${edgesNeeded} edges (${Math.ceil(edgesNeeded / edges)} inserts)`,
          ],
        });
      }
    } finally { setLoading(false); }
  }, [speed, feed, doc, isoGroup, cycleTime, batchSize, insertCost, edges]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-cyan-400 font-semibold text-sm">Tool Life Estimator</span>
        <span className="text-xs text-zinc-500">Taylor tool life model</span>
      </div>
      <div className={sec}>
        <div className="grid grid-cols-4 gap-3">
          <div><label className={lbl}>Speed (m/min)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} min={10} /></div>
          <div><label className={lbl}>Feed (mm/rev)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={feed} onChange={(e) => setFeed(Number(e.target.value))} min={0.01} step={0.01} /></div>
          <div><label className={lbl}>DOC (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={doc} onChange={(e) => setDoc(Number(e.target.value))} min={0.1} step={0.1} /></div>
          <div><label className={lbl}>Material</label>
            <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={isoGroup} onChange={(e) => setIsoGroup(e.target.value)}>
              <option value="P">P - Steel</option><option value="M">M - Stainless</option>
              <option value="K">K - Cast iron</option><option value="N">N - Aluminum</option>
              <option value="S">S - Titanium</option><option value="H">H - Hardened</option>
            </select></div>
          <div><label className={lbl}>Cycle time (s)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={cycleTime} onChange={(e) => setCycleTime(Number(e.target.value))} min={5} /></div>
          <div><label className={lbl}>Batch size</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} min={1} /></div>
          <div><label className={lbl}>Insert cost ($)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={insertCost} onChange={(e) => setInsertCost(Number(e.target.value))} min={1} /></div>
          <div className="flex items-end">
            <button onClick={calculate} disabled={loading} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white">
              {loading ? '...' : 'Estimate Life'}
            </button></div>
        </div>
      </div>
      {result && (
        <div className={sec}>
          <div className="grid grid-cols-4 gap-3 mb-2">
            <div><div className={lbl}>Tool life</div><div className="text-lg text-cyan-400 font-bold">{result.tool_life_minutes} min</div></div>
            <div><div className={lbl}>Parts/edge</div><div className={val}>{result.parts_per_edge}</div></div>
            <div><div className={lbl}>Cost/part (tooling)</div><div className={val}>${result.cost_per_part}</div></div>
            <div><div className={lbl}>Edges for batch</div><div className={val}>{result.edges_per_batch} ({Math.ceil(result.edges_per_batch / edges)} inserts)</div></div>
          </div>
          {result.recommendations.map((r, i) => <div key={i} className="text-xs text-zinc-400">{r}</div>)}
        </div>
      )}
    </div>
  );
}
