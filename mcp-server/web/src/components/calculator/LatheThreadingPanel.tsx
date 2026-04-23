/**
 * LatheThreadingPanel — Calculator panel for thread parameter calculation.
 *
 * Wires to:
 *   prism_thread: calculate_tap_drill, get_thread_specifications, get_go_nogo_gauges
 *   prism_turning: turning_thread_calculate, turning_thread_infeed_select,
 *                  turning_thread_measure, turning_thread_relief_groove
 *
 * Shows: thread geometry, pitch diameter, tolerance, 3-wire measurement,
 *        infeed method recommendation, go/no-go gage, DIN 76 relief groove.
 */

import { useState, useCallback, useMemo } from 'react';
import { PassScheduleChart, type PassData } from './PassScheduleChart';

// ── Types ─────────────────────────────────────────────────────────────

interface ThreadResult {
  designation: string;
  type: string;
  pitch_mm: number;
  major_diameter_mm: number;
  pitch_diameter_mm: number;
  minor_diameter_mm: number;
  thread_depth_mm: number;
}

interface GageResult {
  go_gage_pd_mm: number;
  nogo_gage_pd_mm: number;
  best_wire_mm: number;
  measurement_over_wires_mm: number;
}

interface InfeedResult {
  method: string;
  spring_passes: number;
  first_pass_depth_mm: number;
  recommended_passes: number;
  justification: string[];
}

interface ReliefResult {
  groove_width_mm: number;
  groove_depth_mm: number;
  groove_diameter_mm: number;
  notes: string[];
}

// ── API helpers ───────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────

export function LatheThreadingPanel() {
  const [designation, setDesignation] = useState('M10x1.5');
  const [isoGroup, setIsoGroup] = useState<string>('P');
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [threadResult, setThreadResult] = useState<ThreadResult | null>(null);
  const [gageResult, setGageResult] = useState<GageResult | null>(null);
  const [infeedResult, setInfeedResult] = useState<InfeedResult | null>(null);
  const [reliefResult, setReliefResult] = useState<ReliefResult | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      // Thread calculation
      const thread = await callTurningAction<ThreadResult>('turning_thread_calculate', {
        designation,
      });
      setThreadResult(thread);

      if (thread) {
        // Gage / 3-wire measurement
        const gage = await callTurningAction<GageResult>('turning_thread_measure', {
          system: thread.type === 'ISO' ? 'metric' : 'unified',
          nominal_diameter_mm: thread.major_diameter_mm,
          pitch_mm: thread.pitch_mm,
          type: internal ? 'internal' : 'external',
        });
        setGageResult(gage);

        // Infeed method selection
        const infeed = await callTurningAction<InfeedResult>('turning_thread_infeed_select', {
          iso_group: isoGroup,
          thread_form: thread.type === 'ISO' ? 'metric' : 'UN',
          pitch_mm: thread.pitch_mm,
          internal,
        });
        setInfeedResult(infeed);

        // DIN 76 relief groove
        const relief = await callTurningAction<ReliefResult>('turning_thread_relief_groove', {
          thread_major_dia_mm: thread.major_diameter_mm,
          thread_pitch_mm: thread.pitch_mm,
          din_type: 'A',
          internal,
        });
        setReliefResult(relief);
      }
    } finally {
      setLoading(false);
    }
  }, [designation, isoGroup, internal]);

  const sectionClass = 'bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-3';
  const labelClass = 'text-xs text-zinc-400 uppercase tracking-wide';
  const valueClass = 'text-sm text-zinc-100 font-mono';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-purple-400 font-semibold text-sm">Threading Calculator</span>
        <span className="text-xs text-zinc-500">Powered by ThreadCalculationEngine + SinglePointThreadEngine</span>
      </div>

      {/* Input section */}
      <div className={sectionClass}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Thread Designation</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="M10x1.5, 1/4-20 UNC, 1/2-14 NPT"
            />
          </div>
          <div>
            <label className={labelClass}>Material Group</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 mt-1"
              value={isoGroup}
              onChange={(e) => setIsoGroup(e.target.value)}
            >
              <option value="P">P — Steel</option>
              <option value="M">M — Stainless</option>
              <option value="K">K — Cast iron</option>
              <option value="N">N — Aluminum</option>
              <option value="S">S — Titanium / HRSA</option>
              <option value="H">H — Hardened steel</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-1.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
                className="rounded"
              />
              Internal thread
            </label>
            <button
              onClick={calculate}
              disabled={loading}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 rounded text-sm font-medium text-white"
            >
              {loading ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {threadResult && (
        <>
          {/* Thread Geometry */}
          <div className={sectionClass}>
            <div className={`${labelClass} mb-2`}>Thread Geometry</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className={labelClass}>Type</div>
                <div className={valueClass}>{threadResult.type}</div>
              </div>
              <div>
                <div className={labelClass}>Pitch</div>
                <div className={valueClass}>{threadResult.pitch_mm.toFixed(3)} mm</div>
              </div>
              <div>
                <div className={labelClass}>Major dia</div>
                <div className={valueClass}>{threadResult.major_diameter_mm.toFixed(3)} mm</div>
              </div>
              <div>
                <div className={labelClass}>Pitch dia (d2)</div>
                <div className={valueClass}>{threadResult.pitch_diameter_mm.toFixed(3)} mm</div>
              </div>
              <div>
                <div className={labelClass}>Minor dia (d3)</div>
                <div className={valueClass}>{threadResult.minor_diameter_mm.toFixed(3)} mm</div>
              </div>
              <div>
                <div className={labelClass}>Thread depth</div>
                <div className={valueClass}>{threadResult.thread_depth_mm.toFixed(3)} mm</div>
              </div>
            </div>
          </div>

          {/* Gage / 3-Wire */}
          {gageResult && (
            <div className={sectionClass}>
              <div className={`${labelClass} mb-2`}>Measurement (3-Wire Method)</div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <div className={labelClass}>Best wire size</div>
                  <div className={valueClass}>{gageResult.best_wire_mm.toFixed(3)} mm</div>
                </div>
                <div>
                  <div className={labelClass}>Measurement over wires (M)</div>
                  <div className={valueClass}>{gageResult.measurement_over_wires_mm.toFixed(3)} mm</div>
                </div>
                <div>
                  <div className={labelClass}>GO gage PD</div>
                  <div className={valueClass}>{gageResult.go_gage_pd_mm.toFixed(3)} mm</div>
                </div>
                <div>
                  <div className={labelClass}>NO-GO gage PD</div>
                  <div className={valueClass}>{gageResult.nogo_gage_pd_mm.toFixed(3)} mm</div>
                </div>
              </div>
            </div>
          )}

          {/* Infeed Method */}
          {infeedResult && (
            <div className={sectionClass}>
              <div className={`${labelClass} mb-2`}>Infeed Method Recommendation</div>
              <div className="grid grid-cols-4 gap-3 mb-2">
                <div>
                  <div className={labelClass}>Method</div>
                  <div className="text-sm text-emerald-400 font-medium">{infeedResult.method.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <div className={labelClass}>Spring passes</div>
                  <div className={valueClass}>{infeedResult.spring_passes}</div>
                </div>
                <div>
                  <div className={labelClass}>First pass depth</div>
                  <div className={valueClass}>{infeedResult.first_pass_depth_mm.toFixed(2)} mm</div>
                </div>
                <div>
                  <div className={labelClass}>Recommended passes</div>
                  <div className={valueClass}>{infeedResult.recommended_passes}</div>
                </div>
              </div>
              <div className="space-y-1">
                {infeedResult.justification.map((j, i) => (
                  <div key={i} className="text-xs text-zinc-400">{j}</div>
                ))}
              </div>
            </div>
          )}

          {/* Threading Pass Schedule Chart */}
          {infeedResult && threadResult && (
            <PassScheduleChart
              mode="lathe"
              title="Threading Pass Schedule"
              passes={Array.from({ length: infeedResult.recommended_passes + infeedResult.spring_passes }, (_, i) => {
                const isSpring = i >= infeedResult.recommended_passes;
                const passNum = i + 1;
                const totalDepth = threadResult.thread_depth_mm;
                const depthPct = isSpring ? 0 : ((infeedResult.first_pass_depth_mm * Math.pow(0.75, i)) / totalDepth) * 100;
                return {
                  pass: passNum,
                  type: isSpring ? 'spring' : i === 0 ? 'rough' : i < infeedResult.recommended_passes - 1 ? 'semi' : 'finish',
                  energy_or_depth_pct: isSpring ? 5 : Math.max(depthPct, 10),
                  speed_or_feed: threadResult.pitch_mm,
                  speed_unit: 'mm/rev',
                  offset_or_doc: isSpring ? 0 : infeedResult.first_pass_depth_mm * Math.pow(0.75, i),
                  offset_unit: 'mm',
                } satisfies PassData;
              })}
            />
          )}

          {/* DIN 76 Relief Groove */}
          {reliefResult && (
            <div className={sectionClass}>
              <div className={`${labelClass} mb-2`}>Thread Relief Groove (DIN 76 Type A)</div>
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div>
                  <div className={labelClass}>Groove width</div>
                  <div className={valueClass}>{reliefResult.groove_width_mm.toFixed(2)} mm</div>
                </div>
                <div>
                  <div className={labelClass}>Groove depth</div>
                  <div className={valueClass}>{reliefResult.groove_depth_mm.toFixed(3)} mm</div>
                </div>
                <div>
                  <div className={labelClass}>Groove diameter</div>
                  <div className={valueClass}>{reliefResult.groove_diameter_mm.toFixed(3)} mm</div>
                </div>
              </div>
              <div className="space-y-1">
                {reliefResult.notes.map((n, i) => (
                  <div key={i} className="text-xs text-zinc-400">{n}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
