/**
 * LatheChatterPanel — Chatter stability analysis with safe RPM zones.
 * Wires: prism_turning: lathe_chatter_analysis
 *
 * Shows: stability assessment, safe RPM range, SSV recommendation,
 *        L/D ratio check, deflection-limited DOC.
 */

import { useState, useCallback } from 'react';

interface ChatterResult {
  stable: boolean;
  natural_frequency_hz: number;
  critical_doc_mm: number;
  safe_rpm_ranges: Array<{ min: number; max: number }>;
  ssv_recommended: boolean;
  ssv_amplitude_rpm?: number;
  ssv_frequency_hz?: number;
  deflection_um: number;
  l_over_d: number;
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

export function LatheChatterPanel() {
  const [partOD, setPartOD] = useState(50);
  const [partLength, setPartLength] = useState(150);
  const [rpm, setRpm] = useState(2000);
  const [doc, setDoc] = useState(2.0);
  const [toolOverhang, setToolOverhang] = useState(30);
  const [material, setMaterial] = useState('steel');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChatterResult | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callAction<ChatterResult>('lathe_chatter_analysis', {
        workpiece_od_mm: partOD, workpiece_length_mm: partLength,
        spindle_rpm: rpm, depth_of_cut_mm: doc,
        tool_overhang_mm: toolOverhang, material,
      });
      if (r) {
        setResult(r);
      } else {
        // Fallback: simple L/D based assessment
        const ld = partLength / partOD;
        const E = 200000; // MPa steel
        const I = Math.PI * Math.pow(partOD / 2, 4) / 64;
        const fn = 0.56 * Math.sqrt((E * 1e6 * I) / (7850 * Math.PI * (partOD / 2000) ** 2 * (partLength / 1000))) / (2 * Math.PI);
        const deflection = 1000 * (doc * 1800 * 0.25) * Math.pow(partLength, 3) / (3 * E * 1e6 * I);
        setResult({
          stable: ld < 6 && doc < 3,
          natural_frequency_hz: parseFloat(fn.toFixed(0)),
          critical_doc_mm: parseFloat((ld < 4 ? 4 : ld < 6 ? 2 : 1).toFixed(1)),
          safe_rpm_ranges: [
            { min: Math.round(fn * 60 * 0.8), max: Math.round(fn * 60 * 0.95) },
            { min: Math.round(fn * 60 * 1.05), max: Math.round(fn * 60 * 1.2) },
          ],
          ssv_recommended: ld > 4,
          ssv_amplitude_rpm: ld > 4 ? Math.round(rpm * 0.05) : undefined,
          ssv_frequency_hz: ld > 4 ? 2 : undefined,
          deflection_um: parseFloat(deflection.toFixed(1)),
          l_over_d: parseFloat(ld.toFixed(1)),
          recommendations: [
            `L/D = ${ld.toFixed(1)}${ld > 6 ? ' — tailstock/steady rest required' : ld > 4 ? ' — consider support' : ' — OK for chuck-only'}`,
            `Natural frequency ~${fn.toFixed(0)} Hz`,
            `Max DOC for stability: ~${(ld < 4 ? 4 : ld < 6 ? 2 : 1).toFixed(1)} mm`,
            ld > 4 ? `SSV recommended: +-${Math.round(rpm * 0.05)} RPM at 2 Hz` : 'SSV not needed',
          ],
        });
      }
    } finally { setLoading(false); }
  }, [partOD, partLength, rpm, doc, toolOverhang, material]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400 font-semibold text-sm">Chatter Analysis</span>
        <span className="text-xs text-zinc-500">Stability lobe + SSV recommendation</span>
      </div>
      <div className={sec}>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={lbl}>Part OD (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={partOD} onChange={(e) => setPartOD(Number(e.target.value))} min={5} /></div>
          <div><label className={lbl}>Part Length (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={partLength} onChange={(e) => setPartLength(Number(e.target.value))} min={10} /></div>
          <div><label className={lbl}>Spindle RPM</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={rpm} onChange={(e) => setRpm(Number(e.target.value))} min={50} /></div>
          <div><label className={lbl}>DOC (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={doc} onChange={(e) => setDoc(Number(e.target.value))} min={0.1} step={0.1} /></div>
          <div><label className={lbl}>Tool overhang (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1" value={toolOverhang} onChange={(e) => setToolOverhang(Number(e.target.value))} min={10} /></div>
          <div className="flex items-end">
            <button onClick={analyze} disabled={loading} className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white">
              {loading ? '...' : 'Check Stability'}
            </button></div>
        </div>
      </div>
      {result && (
        <div className={`${sec} ${result.stable ? 'border-emerald-700' : 'border-red-700'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-lg font-bold ${result.stable ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.stable ? 'STABLE' : 'CHATTER RISK'}
            </div>
            <div className="text-sm text-zinc-400">L/D = {result.l_over_d}</div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-2">
            <div><div className={lbl}>Natural freq</div><div className={val}>{result.natural_frequency_hz} Hz</div></div>
            <div><div className={lbl}>Critical DOC</div><div className={val}>{result.critical_doc_mm} mm</div></div>
            <div><div className={lbl}>Deflection</div><div className={val}>{result.deflection_um} um</div></div>
            <div><div className={lbl}>SSV</div>
              <div className={`text-sm ${result.ssv_recommended ? 'text-amber-400' : 'text-zinc-400'}`}>
                {result.ssv_recommended ? `Yes: +-${result.ssv_amplitude_rpm} RPM` : 'Not needed'}
              </div></div>
          </div>
          {result.safe_rpm_ranges.length > 0 && (
            <div className="mb-2">
              <div className={lbl}>Safe RPM zones</div>
              <div className="flex gap-2 mt-1">
                {result.safe_rpm_ranges.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-900/50 border border-emerald-700 rounded text-xs text-emerald-300 font-mono">
                    {r.min}-{r.max}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.recommendations.map((r, i) => <div key={i} className="text-xs text-zinc-400">{r}</div>)}
        </div>
      )}
    </div>
  );
}
