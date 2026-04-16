/**
 * LatheGroovingPanel — Calculator panel for grooving, parting, and cutoff.
 *
 * Wires to:
 *   prism_turning: turning_groove_classify, turning_partoff_optimize,
 *                  turning_partoff_catcher_timing, turning_partoff_blade_stress
 *
 * Shows: groove type classification, strategy (plunge/shift/peck), peck intelligence,
 *        parting feed curve, blade stress, part catcher timing.
 */

import { useState, useCallback } from 'react';

interface GrooveResult {
  type: string;
  strategy: string;
  tool_geometry: string;
  n_passes: number;
  peck_depth_mm?: number;
  peck_retract_mm?: number;
  full_retract_interval?: number;
  coolant: string;
  gcode_cycle: string;
  blade_stress: { deflection_um: number; stress_mpa: number; chatter_risk: boolean; l_over_t: number; safe: boolean };
  feed_mm_rev: number;
  warnings: string[];
  notes: string[];
}

interface PartingResult {
  blade_width_mm: number;
  feed_profile: Array<{ diameter_mm: number; feed_mm_rev: number; rpm?: number; note: string }>;
  peck_strategy?: { depth_mm: number; retract_mm: number; dwell_s: number; coolant: string };
  catcher_timing?: { activate_diameter_mm: number; m_code_advance: string; m_code_retract: string };
  blade_stress: { deflection_um: number; stress_mpa: number; safe: boolean; chatter_risk: boolean };
  coolant: string;
  warnings: string[];
}

async function callAction<T>(action: string, params: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch('/api/v1/turning/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result ?? data) as T;
  } catch { return null; }
}

const GROOVE_TYPES = [
  { id: 'rectangular', label: 'Rectangular' },
  { id: 'full_radius', label: 'Full radius' },
  { id: 'v_groove', label: 'V-groove' },
  { id: 'o_ring', label: 'O-ring (ISO 3601)' },
  { id: 'circlip', label: 'Circlip (DIN 471/472)' },
  { id: 'thread_relief', label: 'Thread relief (DIN 76)' },
  { id: 'bearing_relief', label: 'Bearing relief (DIN 509)' },
  { id: 'face_groove', label: 'Face groove' },
];

const ISO_GROUPS = [
  { id: 'P', label: 'P - Steel' }, { id: 'M', label: 'M - Stainless' },
  { id: 'K', label: 'K - Cast iron' }, { id: 'N', label: 'N - Aluminum' },
  { id: 'S', label: 'S - Titanium' }, { id: 'H', label: 'H - Hardened' },
];

export function LatheGroovingPanel() {
  const [mode, setMode] = useState<'groove' | 'partoff'>('groove');
  const [grooveType, setGrooveType] = useState('rectangular');
  const [location, setLocation] = useState<'od' | 'id' | 'face'>('od');
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(5);
  const [diameter, setDiameter] = useState(50);
  const [isoGroup, setIsoGroup] = useState('P');
  const [bladeWidth, setBladeWidth] = useState(3);
  const [controller, setController] = useState('fanuc');
  const [hasCatcher, setHasCatcher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grooveResult, setGrooveResult] = useState<GrooveResult | null>(null);
  const [partingResult, setPartingResult] = useState<PartingResult | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'groove') {
        const r = await callAction<GrooveResult>('turning_groove_classify', {
          type: grooveType, location, width_mm: width, depth_mm: depth,
          diameter_mm: diameter, iso_group: isoGroup, blade_width_mm: bladeWidth, controller,
        });
        setGrooveResult(r);
        setPartingResult(null);
      } else {
        const r = await callAction<PartingResult>('turning_partoff_optimize', {
          part_diameter_mm: diameter, iso_group: isoGroup,
          controller, has_part_catcher: hasCatcher, blade_width_mm: bladeWidth,
        });
        setPartingResult(r);
        setGrooveResult(null);
      }
    } finally { setLoading(false); }
  }, [mode, grooveType, location, width, depth, diameter, isoGroup, bladeWidth, controller, hasCatcher]);

  const sec = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const lbl = 'text-xs text-zinc-400 uppercase tracking-wide';
  const val = 'text-sm text-zinc-100 font-mono';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-orange-400 font-semibold text-sm">Grooving & Parting</span>
        <div className="flex gap-1">
          <button onClick={() => setMode('groove')}
            className={`px-3 py-1 rounded text-xs font-medium ${mode === 'groove' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Groove</button>
          <button onClick={() => setMode('partoff')}
            className={`px-3 py-1 rounded text-xs font-medium ${mode === 'partoff' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Part-off</button>
        </div>
      </div>

      <div className={sec}>
        <div className="grid grid-cols-4 gap-3">
          {mode === 'groove' && (
            <>
              <div>
                <label className={lbl}>Groove Type</label>
                <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
                  value={grooveType} onChange={(e) => setGrooveType(e.target.value)}>
                  {GROOVE_TYPES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Location</label>
                <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
                  value={location} onChange={(e) => setLocation(e.target.value as 'od' | 'id' | 'face')}>
                  <option value="od">OD</option><option value="id">ID</option><option value="face">Face</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Width (mm)</label>
                <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
                  value={width} onChange={(e) => setWidth(Number(e.target.value))} min={0.5} step={0.1} />
              </div>
              <div>
                <label className={lbl}>Depth (mm)</label>
                <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
                  value={depth} onChange={(e) => setDepth(Number(e.target.value))} min={0.5} step={0.1} />
              </div>
            </>
          )}
          <div>
            <label className={lbl}>Part Diameter (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} min={5} />
          </div>
          <div>
            <label className={lbl}>Material</label>
            <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={isoGroup} onChange={(e) => setIsoGroup(e.target.value)}>
              {ISO_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Blade Width (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={bladeWidth} onChange={(e) => setBladeWidth(Number(e.target.value))} min={1} max={8} step={0.5} />
          </div>
          <div className="flex items-end gap-2">
            {mode === 'partoff' && (
              <label className="flex items-center gap-1.5 text-sm text-zinc-300">
                <input type="checkbox" checked={hasCatcher} onChange={(e) => setHasCatcher(e.target.checked)} />
                Part catcher
              </label>
            )}
            <button onClick={calculate} disabled={loading}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white">
              {loading ? '...' : 'Calculate'}
            </button>
          </div>
        </div>
      </div>

      {grooveResult && (
        <div className={sec}>
          <div className={`${lbl} mb-2`}>Groove Analysis</div>
          <div className="grid grid-cols-4 gap-3 mb-2">
            <div><div className={lbl}>Strategy</div><div className="text-sm text-emerald-400 font-medium">{grooveResult.strategy.replace(/_/g, ' ')}</div></div>
            <div><div className={lbl}>Passes</div><div className={val}>{grooveResult.n_passes}</div></div>
            <div><div className={lbl}>Feed</div><div className={val}>{grooveResult.feed_mm_rev} mm/rev</div></div>
            <div><div className={lbl}>Cycle</div><div className={val}>{grooveResult.gcode_cycle}</div></div>
            {grooveResult.peck_depth_mm && <div><div className={lbl}>Peck depth</div><div className={val}>{grooveResult.peck_depth_mm} mm</div></div>}
            <div><div className={lbl}>Coolant</div><div className={val}>{grooveResult.coolant.replace(/_/g, ' ')}</div></div>
            <div><div className={lbl}>Blade stress</div>
              <div className={`text-sm font-bold ${grooveResult.blade_stress.safe ? 'text-emerald-400' : 'text-red-400'}`}>
                {grooveResult.blade_stress.deflection_um.toFixed(0)}um {grooveResult.blade_stress.safe ? 'SAFE' : 'HIGH'}
              </div>
            </div>
            <div><div className={lbl}>Chatter risk</div>
              <div className={`text-sm ${grooveResult.blade_stress.chatter_risk ? 'text-amber-400' : 'text-emerald-400'}`}>
                L/t={grooveResult.blade_stress.l_over_t.toFixed(1)} {grooveResult.blade_stress.chatter_risk ? 'RISK' : 'OK'}
              </div>
            </div>
          </div>
          <div className="text-xs text-zinc-500">{grooveResult.tool_geometry}</div>
          {grooveResult.warnings.map((w, i) => <div key={i} className="text-xs text-amber-400 mt-1">{w}</div>)}
        </div>
      )}

      {partingResult && (
        <div className={sec}>
          <div className={`${lbl} mb-2`}>Part-Off Analysis</div>
          <div className="grid grid-cols-4 gap-3 mb-2">
            <div><div className={lbl}>Blade</div><div className={val}>{partingResult.blade_width_mm}mm</div></div>
            <div><div className={lbl}>Coolant</div><div className={val}>{partingResult.coolant.replace(/_/g, ' ')}</div></div>
            <div><div className={lbl}>Blade stress</div>
              <div className={`text-sm font-bold ${partingResult.blade_stress.safe ? 'text-emerald-400' : 'text-red-400'}`}>
                {partingResult.blade_stress.safe ? 'SAFE' : 'HIGH STRESS'}
              </div>
            </div>
            {partingResult.peck_strategy && <div><div className={lbl}>Peck</div><div className={val}>{partingResult.peck_strategy.depth_mm}mm / {partingResult.peck_strategy.coolant}</div></div>}
          </div>
          {partingResult.catcher_timing && (
            <div className="text-xs text-zinc-400 mt-1">
              Part catcher: {partingResult.catcher_timing.m_code_advance} at dia {partingResult.catcher_timing.activate_diameter_mm}mm
            </div>
          )}
          <div className={`${lbl} mt-3 mb-1`}>Feed Reduction Profile</div>
          <div className="grid grid-cols-6 gap-1">
            {partingResult.feed_profile.map((fp, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-zinc-500">dia {fp.diameter_mm}</div>
                <div className="text-xs text-zinc-200 font-mono">{fp.feed_mm_rev}</div>
                <div className="text-[10px] text-zinc-500">{fp.rpm} RPM</div>
              </div>
            ))}
          </div>
          {partingResult.warnings.map((w, i) => <div key={i} className="text-xs text-amber-400 mt-1">{w}</div>)}
        </div>
      )}
    </div>
  );
}
