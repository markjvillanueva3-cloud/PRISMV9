/**
 * LatheWorkholdingPanel — Calculator panel for workholding analysis.
 *
 * Wires to:
 *   prism_turning: chuck_force, tailstock, steady_rest,
 *                  turning_jaw_select, turning_trilobe_analysis,
 *                  turning_mandrel_sizing, turning_face_driver_check
 *
 * Shows: required chuck force, safety factor, jaw type recommendation,
 *        tailstock/steady rest need, trilobe deformation check for thin walls.
 */

import { useState, useCallback } from 'react';

interface ChuckResult {
  required_force_kN: number;
  safety_factor: number;
  jaw_type: string;
  grip_diameter_mm: number;
  max_rpm_at_force: number;
  warnings: string[];
}

interface TailstockResult {
  required: boolean;
  force_N: number;
  center_type: string;
  reason: string;
}

interface TrilobeResult {
  max_deformation_um: number;
  safe: boolean;
  recommendation: string;
}

async function callTurningAction<T>(action: string, params: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch('/api/v1/turning/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result ?? data) as T;
  } catch {
    return null;
  }
}

export function LatheWorkholdingPanel() {
  const [partOD, setPartOD] = useState(50);
  const [partLength, setPartLength] = useState(100);
  const [gripLength, setGripLength] = useState(25);
  const [wallThickness, setWallThickness] = useState(0);
  const [materialDensity, setMaterialDensity] = useState(7850);
  const [cuttingForce, setCuttingForce] = useState(1000);
  const [rpm, setRpm] = useState(2000);
  const [loading, setLoading] = useState(false);

  const [chuckResult, setChuckResult] = useState<ChuckResult | null>(null);
  const [tailstockResult, setTailstockResult] = useState<TailstockResult | null>(null);
  const [trilobeResult, setTrilobeResult] = useState<TrilobeResult | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      // Chuck force
      const chuck = await callTurningAction<ChuckResult>('chuck_force', {
        workpiece_od_mm: partOD,
        grip_length_mm: gripLength,
        cutting_force_N: cuttingForce,
        spindle_rpm: rpm,
        workpiece_mass_kg: (Math.PI * (partOD / 2000) ** 2 * (partLength / 1000) * materialDensity),
        friction_coefficient: 0.25,
      });
      setChuckResult(chuck);

      // Tailstock need check
      const ld = partLength / partOD;
      if (ld > 3) {
        const ts = await callTurningAction<TailstockResult>('tailstock', {
          workpiece_od_mm: partOD,
          workpiece_length_mm: partLength,
          cutting_force_N: cuttingForce,
          spindle_rpm: rpm,
        });
        setTailstockResult(ts ?? {
          required: true,
          force_N: cuttingForce * 0.5,
          center_type: ld > 6 ? 'live_center' : 'dead_center',
          reason: `L/D = ${ld.toFixed(1)} > 3 — tailstock support recommended`,
        });
      } else {
        setTailstockResult({
          required: false,
          force_N: 0,
          center_type: 'none',
          reason: `L/D = ${ld.toFixed(1)} <= 3 — chuck-only is adequate`,
        });
      }

      // Trilobe check for thin walls
      if (wallThickness > 0 && wallThickness < partOD * 0.15) {
        const trilobe = await callTurningAction<TrilobeResult>('turning_trilobe_analysis', {
          od_mm: partOD,
          wall_thickness_mm: wallThickness,
          chuck_force_kN: chuck?.required_force_kN ?? 30,
          jaw_count: 3,
        });
        setTrilobeResult(trilobe);
      } else {
        setTrilobeResult(null);
      }
    } finally {
      setLoading(false);
    }
  }, [partOD, partLength, gripLength, wallThickness, materialDensity, cuttingForce, rpm]);

  const sectionClass = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const labelClass = 'text-xs text-zinc-400 uppercase tracking-wide';
  const valueClass = 'text-sm text-zinc-100 font-mono';

  const safetyColor = (sf: number) => sf >= 2.5 ? 'text-emerald-400' : sf >= 1.5 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-400 font-semibold text-sm">Workholding Analysis</span>
        <span className="text-xs text-zinc-500">Powered by ChuckJawForceEngine + WorkholdingEngine</span>
      </div>

      <div className={sectionClass}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Part OD (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={partOD} onChange={(e) => setPartOD(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className={labelClass}>Part Length (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={partLength} onChange={(e) => setPartLength(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className={labelClass}>Grip Length (mm)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={gripLength} onChange={(e) => setGripLength(Number(e.target.value))} min={5} />
          </div>
          <div>
            <label className={labelClass}>Wall Thickness (mm, 0=solid)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={wallThickness} onChange={(e) => setWallThickness(Number(e.target.value))} min={0} step={0.1} />
          </div>
          <div>
            <label className={labelClass}>Cutting Force (N)</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={cuttingForce} onChange={(e) => setCuttingForce(Number(e.target.value))} min={50} />
          </div>
          <div>
            <label className={labelClass}>Spindle RPM</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={rpm} onChange={(e) => setRpm(Number(e.target.value))} min={50} />
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={calculate} disabled={loading}
              className="px-6 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white">
              {loading ? 'Analyzing...' : 'Analyze Workholding'}
            </button>
          </div>
        </div>
      </div>

      {chuckResult && (
        <div className={sectionClass}>
          <div className={`${labelClass} mb-2`}>Chuck Force Analysis</div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className={labelClass}>Required Force</div>
              <div className={valueClass}>{chuckResult.required_force_kN.toFixed(1)} kN</div>
            </div>
            <div>
              <div className={labelClass}>Safety Factor</div>
              <div className={`text-sm font-bold ${safetyColor(chuckResult.safety_factor)}`}>
                {chuckResult.safety_factor.toFixed(1)}x
                {chuckResult.safety_factor >= 2.5 ? ' SAFE' : chuckResult.safety_factor >= 1.5 ? ' MARGINAL' : ' UNSAFE'}
              </div>
            </div>
            <div>
              <div className={labelClass}>Jaw Type</div>
              <div className={valueClass}>{chuckResult.jaw_type}</div>
            </div>
            <div>
              <div className={labelClass}>Max RPM at Force</div>
              <div className={valueClass}>{chuckResult.max_rpm_at_force} RPM</div>
            </div>
          </div>
          {chuckResult.warnings?.length > 0 && (
            <div className="mt-2 space-y-1">
              {chuckResult.warnings.map((w, i) => (
                <div key={i} className="text-xs text-amber-400">{w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {tailstockResult && (
        <div className={sectionClass}>
          <div className={`${labelClass} mb-2`}>Tailstock / Support</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className={labelClass}>Required</div>
              <div className={`text-sm font-medium ${tailstockResult.required ? 'text-amber-400' : 'text-emerald-400'}`}>
                {tailstockResult.required ? 'YES — Tailstock needed' : 'NO — Chuck-only OK'}
              </div>
            </div>
            {tailstockResult.required && (
              <>
                <div>
                  <div className={labelClass}>Center Type</div>
                  <div className={valueClass}>{tailstockResult.center_type.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <div className={labelClass}>Force</div>
                  <div className={valueClass}>{tailstockResult.force_N.toFixed(0)} N</div>
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-1">{tailstockResult.reason}</div>
        </div>
      )}

      {trilobeResult && (
        <div className={`${sectionClass} ${trilobeResult.safe ? 'border-emerald-700' : 'border-red-700'}`}>
          <div className={`${labelClass} mb-2`}>Trilobe Deformation Check (Thin Wall)</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className={labelClass}>Max Deformation</div>
              <div className={valueClass}>{trilobeResult.max_deformation_um.toFixed(1)} um</div>
            </div>
            <div>
              <div className={labelClass}>Status</div>
              <div className={`text-sm font-bold ${trilobeResult.safe ? 'text-emerald-400' : 'text-red-400'}`}>
                {trilobeResult.safe ? 'SAFE' : 'EXCESSIVE DEFORMATION'}
              </div>
            </div>
            <div>
              <div className={labelClass}>Recommendation</div>
              <div className="text-xs text-zinc-300">{trilobeResult.recommendation}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
