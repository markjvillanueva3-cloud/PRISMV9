/**
 * CycleTimePage — PP-REV-MS1 U-REV12
 *
 * Upload G-code, get physics-based cycle time prediction with per-tool
 * breakdown and multi-machine comparison.
 */

import { useCallback, useState } from 'react';
import { ppgCycleTime, ppgCycleTimeCompare, ApiError } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────

interface ToolBreakdown {
  tool_number: number;
  tool_description: string;
  cutting_time_sec: number;
  rapid_time_sec: number;
  cutting_distance_mm: number;
  rapid_distance_mm: number;
  corner_decel_overhead_sec: number;
  pct_of_total: number;
}

interface CycleTimeResult {
  total_seconds: number;
  total_formatted: string;
  cutting_time: number;
  rapid_time: number;
  tool_change_time: number;
  dwell_time: number;
  spindle_time: number;
  acceleration_overhead: number;
  corner_decel_overhead: number;
  block_processing_overhead: number;
  servo_settling_overhead: number;
  total_cutting_distance_mm: number;
  total_rapid_distance_mm: number;
  line_count: number;
  tool_change_count: number;
  machine_profile: string;
  breakdown_by_tool?: ToolBreakdown[];
}

interface MachineCompareEntry {
  machine: string;
  controller: string;
  total_seconds: number;
  total_formatted: string;
  cutting_time: number;
  rapid_time: number;
  overhead_time: number;
  pct_vs_fastest: number;
}

interface CompareResult {
  fastest_machine: string;
  slowest_machine: string;
  time_spread_seconds: number;
  time_spread_pct: number;
  machines: MachineCompareEntry[];
  insights: string[];
}

type Phase = 'input' | 'running' | 'result' | 'error';
type Mode = 'single' | 'compare';

const ACCEPTED_EXTENSIONS = '.nc,.tap,.mpf,.h,.eia,.gcode,.txt,.ngc,.cnc,.prg,.iso';
const CONTROLLERS = ['fanuc', 'haas', 'siemens', 'heidenhain', 'mazak', 'okuma'] as const;

const PRESET_MACHINES = [
  { name: 'Haas VF-2', controller: 'haas' },
  { name: 'Haas VF-4', controller: 'haas' },
  { name: 'DMG DMU 50', controller: 'siemens' },
  { name: 'Mazak VCN-530C', controller: 'mazak' },
  { name: 'Okuma MB-5000H', controller: 'okuma' },
  { name: 'Fanuc Robodrill', controller: 'fanuc' },
  { name: 'Brother S700X2', controller: 'brother' },
];

function fmtTime(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${sec}s`;
}

function pctBar(pct: number, color: string) {
  return (
    <div className="h-2 w-full rounded-full bg-white/5">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────

export function CycleTimePage() {
  const [gcode, setGcode] = useState('');
  const [fileName, setFileName] = useState('');
  const [controller, setController] = useState<string>('fanuc');
  const [mode, setMode] = useState<Mode>('single');
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set(['Haas VF-2', 'DMG DMU 50', 'Mazak VCN-530C']));

  const [phase, setPhase] = useState<Phase>('input');
  const [ctResult, setCtResult] = useState<CycleTimeResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState('');

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => { if (typeof e.target?.result === 'string') setGcode(e.target.result); };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleMachine = useCallback((name: string) => {
    setSelectedMachines((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const handleEstimate = useCallback(async () => {
    if (!gcode.trim()) return;
    setPhase('running');
    setError('');

    try {
      if (mode === 'single') {
        const resp = await ppgCycleTime({ gcode, controller, include_breakdown: true });
        const data = (resp as any).result ?? (resp as any).data ?? resp;
        setCtResult(data as CycleTimeResult);
        setCompareResult(null);
      } else {
        const machines = [...selectedMachines].map((name) => {
          const preset = PRESET_MACHINES.find((p) => p.name === name);
          return { name, controller: preset?.controller || 'fanuc' };
        });
        const resp = await ppgCycleTimeCompare({ gcode, machines });
        const data = (resp as any).result ?? (resp as any).data ?? resp;
        setCompareResult(data as CompareResult);
        setCtResult(null);
      }
      setPhase('result');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setPhase('error');
    }
  }, [gcode, controller, mode, selectedMachines]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setCtResult(null);
    setCompareResult(null);
    setError('');
  }, []);

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Post Processor"
        title="Cycle Time Estimator"
        description="Physics-based cycle time prediction. Models machine kinematics — acceleration, jerk, servo settling, corner deceleration, ATC time — for accurate estimates. Compare across machines to find the fastest."
        metrics={
          <>
            <SummaryTile label="Physics" value="S-curve" hint="Velocity profile modeling" />
            <SummaryTile label="Profiles" value="6+" hint="Machine kinematic models" />
            <SummaryTile label="Compare" value="Multi" hint="Side-by-side machines" accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
      />

      {/* ── Input ───────────────────────────────────────────── */}
      {(phase === 'input' || phase === 'error') && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('ct-file-input')?.click()}
              className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                gcode ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/30'
              }`}
            >
              <input id="ct-file-input" type="file" accept={ACCEPTED_EXTENSIONS} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
              {gcode ? (
                <>
                  <div className="text-lg font-medium text-emerald-300">{fileName}</div>
                  <div className="mt-1 text-sm text-slate-400">{gcode.split('\n').length} lines</div>
                </>
              ) : (
                <>
                  <div className="text-4xl text-slate-500">&#x23F1;</div>
                  <div className="mt-3 text-sm font-medium text-slate-300">Drop G-code or click to browse</div>
                </>
              )}
            </div>
            <textarea
              value={gcode}
              onChange={(e) => { setGcode(e.target.value); if (!fileName) setFileName('pasted-program'); }}
              placeholder="Or paste G-code here..."
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Settings</h3>

            {/* Mode Toggle */}
            <div className="flex rounded-lg border border-white/10">
              <button type="button" onClick={() => setMode('single')} className={`flex-1 rounded-l-lg px-3 py-2 text-xs font-bold transition ${mode === 'single' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
                Single Machine
              </button>
              <button type="button" onClick={() => setMode('compare')} className={`flex-1 rounded-r-lg px-3 py-2 text-xs font-bold transition ${mode === 'compare' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
                Compare Machines
              </button>
            </div>

            {mode === 'single' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Controller</label>
                <select value={controller} onChange={(e) => setController(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-cyan-400/40 focus:outline-none">
                  {CONTROLLERS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            )}

            {mode === 'compare' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Machines</label>
                <div className="mt-2 space-y-1">
                  {PRESET_MACHINES.map((m) => (
                    <label key={m.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                      <input type="checkbox" checked={selectedMachines.has(m.name)} onChange={() => toggleMachine(m.name)} className="accent-violet-400" />
                      <span className="text-sm text-slate-300">{m.name}</span>
                      <span className="text-[10px] text-slate-500">{m.controller}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={handleEstimate} disabled={!gcode.trim() || (mode === 'compare' && selectedMachines.size < 2)} className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
              {mode === 'single' ? 'Estimate Cycle Time' : `Compare ${selectedMachines.size} Machines`}
            </button>
            {phase === 'error' && error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Running ─────────────────────────────────────────── */}
      {phase === 'running' && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <div className="text-lg font-medium text-slate-300">
            {mode === 'single' ? 'Computing cycle time...' : 'Comparing across machines...'}
          </div>
        </div>
      )}

      {/* ── Single Result ───────────────────────────────────── */}
      {phase === 'result' && ctResult && (
        <div className="space-y-6">
          <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">
            &#x2190; New Estimate
          </button>

          {/* Time breakdown cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Cycle Time</div>
              <div className="mt-2 text-3xl font-bold text-cyan-400">{ctResult.total_formatted}</div>
              <div className="mt-1 text-sm text-slate-400">{ctResult.machine_profile} profile</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cutting</div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">{fmtTime(ctResult.cutting_time)}</div>
              <div className="mt-1 text-sm text-slate-400">{(ctResult.total_cutting_distance_mm / 1000).toFixed(1)}m distance</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rapid + ATC</div>
              <div className="mt-2 text-2xl font-bold text-amber-400">{fmtTime(ctResult.rapid_time + ctResult.tool_change_time)}</div>
              <div className="mt-1 text-sm text-slate-400">{ctResult.tool_change_count} tool changes</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Overhead</div>
              <div className="mt-2 text-2xl font-bold text-slate-300">
                {fmtTime(ctResult.acceleration_overhead + ctResult.corner_decel_overhead + ctResult.block_processing_overhead + ctResult.servo_settling_overhead)}
              </div>
              <div className="mt-1 text-sm text-slate-400">{ctResult.line_count} G-code lines</div>
            </div>
          </div>

          {/* Time distribution bar */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Time Distribution</div>
            <div className="flex h-6 overflow-hidden rounded-full">
              {[
                { label: 'Cutting', sec: ctResult.cutting_time, color: 'bg-emerald-500' },
                { label: 'Rapid', sec: ctResult.rapid_time, color: 'bg-amber-500' },
                { label: 'ATC', sec: ctResult.tool_change_time, color: 'bg-orange-500' },
                { label: 'Accel', sec: ctResult.acceleration_overhead, color: 'bg-sky-500' },
                { label: 'Corner', sec: ctResult.corner_decel_overhead, color: 'bg-violet-500' },
                { label: 'Other', sec: ctResult.dwell_time + ctResult.spindle_time + ctResult.block_processing_overhead + ctResult.servo_settling_overhead, color: 'bg-slate-500' },
              ].filter(s => s.sec > 0).map((s) => (
                <div
                  key={s.label}
                  title={`${s.label}: ${fmtTime(s.sec)} (${((s.sec / ctResult.total_seconds) * 100).toFixed(1)}%)`}
                  className={`${s.color} transition-all`}
                  style={{ width: `${(s.sec / ctResult.total_seconds) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Cutting</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Rapid</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-500" /> ATC</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Acceleration</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" /> Corner Decel</span>
            </div>
          </div>

          {/* Per-tool breakdown */}
          {ctResult.breakdown_by_tool && ctResult.breakdown_by_tool.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
              <div className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Per-Tool Breakdown</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2">Tool</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Cutting</th>
                    <th className="px-4 py-2">Rapid</th>
                    <th className="px-4 py-2">Cut Dist</th>
                    <th className="px-4 py-2">% of Total</th>
                    <th className="px-4 py-2 w-32">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {ctResult.breakdown_by_tool.map((t) => (
                    <tr key={t.tool_number} className="border-b border-white/5 text-slate-300">
                      <td className="px-4 py-2.5 font-medium text-cyan-300">T{t.tool_number}</td>
                      <td className="px-4 py-2.5">{t.tool_description}</td>
                      <td className="px-4 py-2.5">{fmtTime(t.cutting_time_sec)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{fmtTime(t.rapid_time_sec)}</td>
                      <td className="px-4 py-2.5">{(t.cutting_distance_mm / 1000).toFixed(1)}m</td>
                      <td className="px-4 py-2.5">{t.pct_of_total.toFixed(1)}%</td>
                      <td className="px-4 py-2.5 w-32">{pctBar(t.pct_of_total, 'bg-cyan-400')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Compare Result ──────────────────────────────────── */}
      {phase === 'result' && compareResult && (
        <div className="space-y-6">
          <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">
            &#x2190; New Comparison
          </button>

          {/* Winner card */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Fastest Machine</div>
            <div className="mt-2 text-3xl font-bold text-emerald-300">{compareResult.fastest_machine}</div>
            <div className="mt-1 text-sm text-slate-400">
              {compareResult.time_spread_seconds.toFixed(1)}s faster than {compareResult.slowest_machine} ({compareResult.time_spread_pct.toFixed(1)}% spread)
            </div>
          </div>

          {/* Machine comparison table */}
          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Machine</th>
                  <th className="px-4 py-3">Controller</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Cutting</th>
                  <th className="px-4 py-3">Rapid</th>
                  <th className="px-4 py-3">Overhead</th>
                  <th className="px-4 py-3">vs Fastest</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {compareResult.machines.sort((a, b) => a.total_seconds - b.total_seconds).map((m) => (
                  <tr key={m.machine} className={`border-b border-white/5 text-slate-300 ${m.machine === compareResult.fastest_machine ? 'bg-emerald-500/5' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{m.machine === compareResult.fastest_machine ? <span className="text-emerald-300">{m.machine} &#x2605;</span> : m.machine}</td>
                    <td className="px-4 py-2.5 text-slate-500">{m.controller}</td>
                    <td className="px-4 py-2.5 font-bold">{m.total_formatted}</td>
                    <td className="px-4 py-2.5">{fmtTime(m.cutting_time)}</td>
                    <td className="px-4 py-2.5">{fmtTime(m.rapid_time)}</td>
                    <td className="px-4 py-2.5">{fmtTime(m.overhead_time)}</td>
                    <td className="px-4 py-2.5">{m.pct_vs_fastest === 0 ? '—' : `+${m.pct_vs_fastest.toFixed(1)}%`}</td>
                    <td className="px-4 py-2.5 w-28">{pctBar(100 - m.pct_vs_fastest, m.machine === compareResult.fastest_machine ? 'bg-emerald-400' : 'bg-cyan-400')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          {compareResult.insights.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Insights</div>
              <div className="space-y-2">
                {compareResult.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-cyan-400">&#x2022;</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
