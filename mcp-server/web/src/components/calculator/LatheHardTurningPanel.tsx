/**
 * LatheHardTurningPanel — Hard turning vs grinding decision advisor.
 *
 * Wires to: prism_turning: turning_hard_turning_analyze
 *
 * Shows: process recommendation (hard turn vs grind), CBN selection,
 *        surface integrity prediction, grinding comparison report.
 */

import { useState, useCallback } from 'react';
import { SurfaceIntegrityCard, type SurfaceIntegrityData } from './SurfaceIntegrityCard';

interface HardTurningResult {
  recommended_process: string;
  confidence: number;
  reasoning: string[];
  insert_selection?: {
    material: string; grade_example: string; edge_prep: string;
    edge_prep_detail: string; nose_radius_mm: number; max_doc_mm: number;
    cutting_speed_m_min: number; feed_mm_rev: number; justification: string[];
  };
  surface_integrity?: {
    predicted_Ra_um: number; white_layer_depth_um: number; vb_limit_mm: number;
    residual_stress_surface_mpa: number; stress_crossover_depth_um: number;
    acceptable: boolean; notes: string[];
  };
  grinding_comparison?: {
    hard_turning: { Ra_um: number; cycle_time_s: number; cost_per_part: number; cpk: number };
    grinding: { Ra_um: number; cycle_time_s: number; cost_per_part: number; cpk: number };
    recommendation: string; confidence_pct: number; savings_pct: number;
  };
  warnings: string[];
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

export function LatheHardTurningPanel() {
  const [hardness, setHardness] = useState(60);
  const [targetRa, setTargetRa] = useState(0.4);
  const [tolerance, setTolerance] = useState(0.01);
  const [od, setOd] = useState(50);
  const [interrupted, setInterrupted] = useState(false);
  const [boreId, setBoreId] = useState(0);
  const [boreDepth, setBoreDepth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HardTurningResult | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callAction<HardTurningResult>('turning_hard_turning_analyze', {
        workpiece: {
          hardness_hrc: hardness, od_mm: od,
          has_interrupted_cut: interrupted,
          ...(boreId > 0 ? { bore_id_mm: boreId, bore_depth_mm: boreDepth } : {}),
        },
        requirements: { target_Ra_um: targetRa, tolerance_mm: tolerance },
      });
      setResult(r);
    } finally { setLoading(false); }
  }, [hardness, targetRa, tolerance, od, interrupted, boreId, boreDepth]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';
  const processColor = (p: string) => p === 'hard_turning' ? 'text-emerald-400' : p === 'grinding' ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-rose-400 font-semibold text-sm">Hard Turning Advisor</span>
        <span className="text-xs text-zinc-500">Powered by HardTurningDecisionEngine</span>
      </div>

      <div className={sec}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={lbl}>Hardness (HRC)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={hardness} onChange={(e) => setHardness(Number(e.target.value))} min={30} max={70} />
          </div>
          <div>
            <label className={lbl}>Target Ra (um)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={targetRa} onChange={(e) => setTargetRa(Number(e.target.value))} min={0.05} max={6.3} step={0.05} />
          </div>
          <div>
            <label className={lbl}>Tolerance (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} min={0.001} max={0.1} step={0.001} />
          </div>
          <div>
            <label className={lbl}>Part OD (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={od} onChange={(e) => setOd(Number(e.target.value))} min={5} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm text-zinc-300 mt-4">
              <input type="checkbox" checked={interrupted} onChange={(e) => setInterrupted(e.target.checked)} />
              Interrupted cut
            </label>
          </div>
          <div>
            <label className={lbl}>Bore ID (mm, 0=none)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={boreId} onChange={(e) => setBoreId(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className={lbl}>Bore Depth (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={boreDepth} onChange={(e) => setBoreDepth(Number(e.target.value))} min={0} />
          </div>
          <div className="flex items-end">
            <button onClick={analyze} disabled={loading}
              className="px-6 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white">
              {loading ? '...' : 'Analyze'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Recommendation */}
          <div className={sec}>
            <div className="flex items-center gap-4 mb-2">
              <div className={`text-lg font-bold ${processColor(result.recommended_process)}`}>
                {result.recommended_process === 'hard_turning' ? 'HARD TURNING' : result.recommended_process === 'grinding' ? 'GRINDING' : 'EITHER'} RECOMMENDED
              </div>
              <div className="text-sm text-zinc-400">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
            </div>
            <div className="space-y-1">
              {result.reasoning.map((r, i) => <div key={i} className="text-xs text-zinc-300">{r}</div>)}
            </div>
            {result.warnings.map((w, i) => <div key={i} className="text-xs text-amber-400 mt-1">{w}</div>)}
          </div>

          {/* Insert Selection */}
          {result.insert_selection && (
            <div className={sec}>
              <div className={`${lbl} mb-2`}>Insert Selection</div>
              <div className="grid grid-cols-4 gap-3">
                <div><div className={lbl}>Material</div><div className="text-sm text-emerald-400">{result.insert_selection.material.replace(/_/g, ' ')}</div></div>
                <div><div className={lbl}>Grade</div><div className={val}>{result.insert_selection.grade_example}</div></div>
                <div><div className={lbl}>Edge prep</div><div className={val}>{result.insert_selection.edge_prep_detail}</div></div>
                <div><div className={lbl}>Nose R</div><div className={val}>{result.insert_selection.nose_radius_mm}mm</div></div>
                <div><div className={lbl}>Max DOC</div><div className={val}>{result.insert_selection.max_doc_mm}mm</div></div>
                <div><div className={lbl}>Speed</div><div className={val}>{result.insert_selection.cutting_speed_m_min} m/min</div></div>
                <div><div className={lbl}>Feed</div><div className={val}>{result.insert_selection.feed_mm_rev} mm/rev</div></div>
              </div>
            </div>
          )}

          {/* Surface Integrity */}
          {result.surface_integrity && (
            <div className={`${sec} ${result.surface_integrity.acceptable ? 'border-emerald-700' : 'border-red-700'}`}>
              <div className={`${lbl} mb-2`}>Surface Integrity Prediction</div>
              <div className="grid grid-cols-4 gap-3">
                <div><div className={lbl}>Predicted Ra</div><div className={val}>{result.surface_integrity.predicted_Ra_um.toFixed(3)} um</div></div>
                <div><div className={lbl}>White layer</div><div className={val}>{result.surface_integrity.white_layer_depth_um} um</div></div>
                <div><div className={lbl}>VB limit</div><div className={val}>{result.surface_integrity.vb_limit_mm} mm</div></div>
                <div><div className={lbl}>Residual stress</div><div className={val}>{result.surface_integrity.residual_stress_surface_mpa} MPa (compressive)</div></div>
              </div>
              <div className="space-y-1 mt-2">
                {result.surface_integrity.notes.map((n, i) => <div key={i} className="text-xs text-zinc-400">{n}</div>)}
              </div>
            </div>
          )}

          {/* Surface Integrity Card (shared cross-mode component) */}
          {result.surface_integrity && (
            <SurfaceIntegrityCard data={{
              mode: 'lathe',
              layers: [
                {
                  name: 'White Layer',
                  depth_um: result.surface_integrity.white_layer_depth_um,
                  color: '#f8fafc',
                  severity: result.surface_integrity.white_layer_depth_um > 15 ? 'critical'
                    : result.surface_integrity.white_layer_depth_um > 5 ? 'caution' : 'ok',
                },
                {
                  name: 'HAZ',
                  depth_um: result.surface_integrity.stress_crossover_depth_um,
                  color: '#d97706',
                  severity: result.surface_integrity.stress_crossover_depth_um > 100 ? 'caution' : 'ok',
                },
              ],
              residual_stress_MPa: Math.abs(result.surface_integrity.residual_stress_surface_mpa),
              stress_type: result.surface_integrity.residual_stress_surface_mpa < 0 ? 'compressive' : 'tensile',
              fatigue_reduction_pct: result.surface_integrity.white_layer_depth_um > 10 ? 15 : 5,
              spec_pass: result.surface_integrity.acceptable,
              spec_standard: 'VB limit + Ra target',
              recommendations: result.surface_integrity.notes,
            }} />
          )}

          {/* Grinding Comparison */}
          {result.grinding_comparison && (
            <div className={sec}>
              <div className={`${lbl} mb-2`}>Hard Turning vs Grinding Comparison</div>
              <table className="w-full text-sm">
                <thead><tr className="text-zinc-400 text-xs">
                  <th className="text-left pb-2">Metric</th><th className="text-right pb-2">Hard Turning</th><th className="text-right pb-2">Grinding</th>
                </tr></thead>
                <tbody className="text-zinc-200 font-mono">
                  <tr><td>Ra (um)</td><td className="text-right">{result.grinding_comparison.hard_turning.Ra_um}</td><td className="text-right">{result.grinding_comparison.grinding.Ra_um}</td></tr>
                  <tr><td>Cycle time (s)</td><td className="text-right">{result.grinding_comparison.hard_turning.cycle_time_s.toFixed(1)}</td><td className="text-right">{result.grinding_comparison.grinding.cycle_time_s.toFixed(1)}</td></tr>
                  <tr><td>Cost/part ($)</td><td className="text-right">{result.grinding_comparison.hard_turning.cost_per_part.toFixed(2)}</td><td className="text-right">{result.grinding_comparison.grinding.cost_per_part.toFixed(2)}</td></tr>
                  <tr><td>Cpk</td><td className="text-right">{result.grinding_comparison.hard_turning.cpk.toFixed(2)}</td><td className="text-right">{result.grinding_comparison.grinding.cpk.toFixed(2)}</td></tr>
                </tbody>
              </table>
              <div className="mt-2 text-sm text-emerald-400">{result.grinding_comparison.recommendation}</div>
              <div className="text-xs text-zinc-400">Savings: {result.grinding_comparison.savings_pct.toFixed(1)}%</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
