/**
 * ToolOptimizationPage — PP-REV-MS2 U-REV16
 *
 * Two modes:
 * 1. Tool Change Optimization — resequence operations to minimize tool changes
 * 2. Magazine Layout — optimal pocket placement for minimum rotation time
 */

import { useCallback, useState } from 'react';
import { ppgToolOptimize, ppgMagazineLayout, ApiError } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────

interface OptimizedStep {
  operation_id: string;
  tool_id: string;
  tool_change: boolean;
  reason?: string;
}

interface ToolChangeResult {
  optimized_sequence: OptimizedStep[];
  total_tool_changes: number;
  changes_saved: number;
  time_saved_sec: number;
  original_tool_changes: number;
  reduction_pct: number;
  warnings: string[];
}

interface MagazineAssignment {
  pocket: number;
  tool_id: string;
  diameter_mm: number;
  is_sister: boolean;
}

interface SisterPlacement {
  primary_pocket: number;
  sister_pocket: number;
  tool_id: string;
  trigger_wear_pct: number;
}

interface MagazineResult {
  assignments: MagazineAssignment[];
  total_rotation_time_sec: number;
  utilization_pct: number;
  sister_placements: SisterPlacement[];
  overflow_tools: string[];
  warnings: string[];
}

type Phase = 'input' | 'running' | 'result' | 'error';
type Mode = 'tool-change' | 'magazine';

interface OperationRow {
  id: string;
  tool_id: string;
  tool_diameter_mm: number;
  operation_type: string;
  cutting_time_min: number;
}

interface ToolRow {
  tool_id: string;
  diameter_mm: number;
  length_mm: number;
  is_sister: boolean;
  sister_of: string;
}

const DEFAULT_OPS: OperationRow[] = [
  { id: 'op1', tool_id: 'T1', tool_diameter_mm: 63, operation_type: 'face_mill', cutting_time_min: 2 },
  { id: 'op2', tool_id: 'T2', tool_diameter_mm: 20, operation_type: 'rough', cutting_time_min: 8 },
  { id: 'op3', tool_id: 'T3', tool_diameter_mm: 10, operation_type: 'semi_finish', cutting_time_min: 5 },
  { id: 'op4', tool_id: 'T2', tool_diameter_mm: 20, operation_type: 'rough', cutting_time_min: 6 },
  { id: 'op5', tool_id: 'T4', tool_diameter_mm: 6, operation_type: 'finish', cutting_time_min: 12 },
  { id: 'op6', tool_id: 'T3', tool_diameter_mm: 10, operation_type: 'finish', cutting_time_min: 4 },
  { id: 'op7', tool_id: 'T5', tool_diameter_mm: 8.5, operation_type: 'drill', cutting_time_min: 1 },
  { id: 'op8', tool_id: 'T6', tool_diameter_mm: 10, operation_type: 'tap', cutting_time_min: 0.5 },
];

const DEFAULT_TOOLS: ToolRow[] = [
  { tool_id: 'T1', diameter_mm: 63, length_mm: 50, is_sister: false, sister_of: '' },
  { tool_id: 'T2', diameter_mm: 20, length_mm: 100, is_sister: false, sister_of: '' },
  { tool_id: 'T3', diameter_mm: 10, length_mm: 80, is_sister: false, sister_of: '' },
  { tool_id: 'T4', diameter_mm: 6, length_mm: 75, is_sister: false, sister_of: '' },
  { tool_id: 'T5', diameter_mm: 8.5, length_mm: 90, is_sister: false, sister_of: '' },
  { tool_id: 'T6', diameter_mm: 10, length_mm: 70, is_sister: false, sister_of: '' },
];

// ── Page ────────────────────────────────────────────────────────

export function ToolOptimizationPage() {
  const [mode, setMode] = useState<Mode>('tool-change');
  const [operations, setOperations] = useState<OperationRow[]>(DEFAULT_OPS);
  const [tools] = useState<ToolRow[]>(DEFAULT_TOOLS);
  const [magazineCapacity, setMagazineCapacity] = useState(24);
  const [magazineType, setMagazineType] = useState<string>('chain');

  const [phase, setPhase] = useState<Phase>('input');
  const [tcResult, setTcResult] = useState<ToolChangeResult | null>(null);
  const [magResult, setMagResult] = useState<MagazineResult | null>(null);
  const [error, setError] = useState('');

  const handleOptimize = useCallback(async () => {
    setPhase('running');
    setError('');
    try {
      if (mode === 'tool-change') {
        const resp = await ppgToolOptimize({ operations, tools });
        const data = (resp as any).result ?? (resp as any).data ?? resp;
        setTcResult(data as ToolChangeResult);
        setMagResult(null);
      } else {
        const resp = await ppgMagazineLayout({
          tools,
          magazine_capacity: magazineCapacity,
          magazine_type: magazineType,
          operation_sequence: operations.map((o) => o.tool_id),
        });
        const data = (resp as any).result ?? (resp as any).data ?? resp;
        setMagResult(data as MagazineResult);
        setTcResult(null);
      }
      setPhase('result');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setPhase('error');
    }
  }, [mode, operations, tools, magazineCapacity, magazineType]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setTcResult(null);
    setMagResult(null);
    setError('');
  }, []);

  const updateOp = (i: number, field: keyof OperationRow, value: string | number) => {
    setOperations((prev) => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
  };

  const addOp = () => {
    const n = operations.length + 1;
    setOperations((prev) => [...prev, { id: `op${n}`, tool_id: 'T1', tool_diameter_mm: 10, operation_type: 'rough', cutting_time_min: 3 }]);
  };

  const removeOp = (i: number) => {
    setOperations((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Post Processor"
        title="Tool Optimization"
        description="Minimize tool changes with smart resequencing. Optimize magazine pocket layout for minimum carousel rotation time. Sister tool placement for high-volume production."
        metrics={
          <>
            <SummaryTile label="Optimization" value="TSP" hint="Traveling salesman routing" />
            <SummaryTile label="Typical" value="15-30%" hint="Tool change reduction" />
            <SummaryTile label="Savings" value="3-8s" hint="Per ATC swap avoided" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          </>
        }
      />

      {/* ── Input ───────────────────────────────────────────── */}
      {(phase === 'input' || phase === 'error') && (
        <div className="space-y-6">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-white/10 w-fit">
            <button type="button" onClick={() => setMode('tool-change')} className={`px-4 py-2 text-sm font-bold rounded-l-lg transition ${mode === 'tool-change' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
              Tool Change Optimization
            </button>
            <button type="button" onClick={() => setMode('magazine')} className={`px-4 py-2 text-sm font-bold rounded-r-lg transition ${mode === 'magazine' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
              Magazine Layout
            </button>
          </div>

          {/* Operations table */}
          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Operations ({operations.length})</span>
              <button type="button" onClick={addOp} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/[0.04]">+ Add</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Tool</th>
                  <th className="px-4 py-2">Dia (mm)</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Cut Time (min)</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, i) => (
                  <tr key={i} className="border-b border-white/5 text-slate-300">
                    <td className="px-4 py-1.5"><input value={op.id} onChange={(e) => updateOp(i, 'id', e.target.value)} className="w-16 rounded border border-white/10 bg-transparent px-2 py-1 text-xs" /></td>
                    <td className="px-4 py-1.5"><input value={op.tool_id} onChange={(e) => updateOp(i, 'tool_id', e.target.value)} className="w-14 rounded border border-white/10 bg-transparent px-2 py-1 text-xs font-medium text-cyan-300" /></td>
                    <td className="px-4 py-1.5"><input type="number" value={op.tool_diameter_mm} onChange={(e) => updateOp(i, 'tool_diameter_mm', parseFloat(e.target.value) || 0)} className="w-16 rounded border border-white/10 bg-transparent px-2 py-1 text-xs" /></td>
                    <td className="px-4 py-1.5">
                      <select value={op.operation_type} onChange={(e) => updateOp(i, 'operation_type', e.target.value)} className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                        {['rough', 'semi_finish', 'finish', 'drill', 'tap', 'bore', 'chamfer', 'face_mill'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-1.5"><input type="number" value={op.cutting_time_min} onChange={(e) => updateOp(i, 'cutting_time_min', parseFloat(e.target.value) || 0)} className="w-16 rounded border border-white/10 bg-transparent px-2 py-1 text-xs" /></td>
                    <td className="px-4 py-1.5"><button type="button" onClick={() => removeOp(i)} className="text-xs text-rose-400 hover:text-rose-300">&#x2715;</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Magazine settings */}
          {mode === 'magazine' && (
            <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Magazine Capacity</label>
                <input type="number" value={magazineCapacity} onChange={(e) => setMagazineCapacity(parseInt(e.target.value) || 24)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Magazine Type</label>
                <select value={magazineType} onChange={(e) => setMagazineType(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                  <option value="chain">Chain</option>
                  <option value="drum">Drum</option>
                  <option value="disc">Disc</option>
                  <option value="matrix">Matrix</option>
                </select>
              </div>
            </div>
          )}

          <button type="button" onClick={handleOptimize} disabled={operations.length < 2} className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
            {mode === 'tool-change' ? 'Optimize Tool Changes' : 'Optimize Magazine Layout'}
          </button>

          {phase === 'error' && error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
          )}
        </div>
      )}

      {/* ── Running ─────────────────────────────────────────── */}
      {phase === 'running' && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <div className="text-lg font-medium text-slate-300">Optimizing...</div>
        </div>
      )}

      {/* ── Tool Change Result ──────────────────────────────── */}
      {phase === 'result' && tcResult && (
        <div className="space-y-6">
          <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">&#x2190; Back</button>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Changes Saved</div>
              <div className="mt-2 text-3xl font-bold text-emerald-400">{tcResult.changes_saved}</div>
              <div className="mt-1 text-sm text-slate-400">{tcResult.original_tool_changes} &#x2192; {tcResult.total_tool_changes}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Time Saved</div>
              <div className="mt-2 text-3xl font-bold text-cyan-400">{tcResult.time_saved_sec.toFixed(1)}s</div>
              <div className="mt-1 text-sm text-slate-400">per cycle</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reduction</div>
              <div className="mt-2 text-3xl font-bold text-violet-400">{tcResult.reduction_pct.toFixed(0)}%</div>
              <div className="mt-1 text-sm text-slate-400">fewer tool changes</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sequence</div>
              <div className="mt-2 text-3xl font-bold text-slate-50">{tcResult.optimized_sequence.length}</div>
              <div className="mt-1 text-sm text-slate-400">operations</div>
            </div>
          </div>

          {/* Optimized sequence */}
          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Optimized Sequence</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Operation</th>
                  <th className="px-4 py-2">Tool</th>
                  <th className="px-4 py-2">Tool Change</th>
                  <th className="px-4 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {tcResult.optimized_sequence.map((step, i) => (
                  <tr key={i} className={`border-b border-white/5 ${step.tool_change ? 'bg-amber-500/5' : ''} text-slate-300`}>
                    <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5">{step.operation_id}</td>
                    <td className="px-4 py-2.5 font-medium text-cyan-300">{step.tool_id}</td>
                    <td className="px-4 py-2.5">{step.tool_change ? <span className="text-amber-400">YES</span> : <span className="text-slate-600">no</span>}</td>
                    <td className="px-4 py-2.5 text-slate-500">{step.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tcResult.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              {tcResult.warnings.map((w, i) => <div key={i} className="text-sm text-amber-300">{w}</div>)}
            </div>
          )}
        </div>
      )}

      {/* ── Magazine Result ─────────────────────────────────── */}
      {phase === 'result' && magResult && (
        <div className="space-y-6">
          <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">&#x2190; Back</button>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rotation Time</div>
              <div className="mt-2 text-3xl font-bold text-cyan-400">{magResult.total_rotation_time_sec.toFixed(1)}s</div>
              <div className="mt-1 text-sm text-slate-400">total carousel travel</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Utilization</div>
              <div className="mt-2 text-3xl font-bold text-emerald-400">{magResult.utilization_pct.toFixed(0)}%</div>
              <div className="mt-1 text-sm text-slate-400">{magResult.assignments.length}/{magazineCapacity} pockets</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sister Tools</div>
              <div className="mt-2 text-3xl font-bold text-violet-400">{magResult.sister_placements.length}</div>
              <div className="mt-1 text-sm text-slate-400">auto-swap placements</div>
            </div>
          </div>

          {/* Visual magazine layout */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Magazine Layout</div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: magazineCapacity }, (_, i) => {
                const pocket = i + 1;
                const assignment = magResult.assignments.find((a) => a.pocket === pocket);
                const isSister = assignment?.is_sister;
                return (
                  <div
                    key={pocket}
                    className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border text-xs ${
                      assignment
                        ? isSister
                          ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                          : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                        : 'border-white/10 bg-white/[0.02] text-slate-600'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500">P{pocket}</div>
                    <div className="font-bold">{assignment?.tool_id || '—'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignments table */}
          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Pocket Assignments</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2">Pocket</th>
                  <th className="px-4 py-2">Tool</th>
                  <th className="px-4 py-2">Diameter</th>
                  <th className="px-4 py-2">Sister</th>
                </tr>
              </thead>
              <tbody>
                {magResult.assignments.map((a) => (
                  <tr key={a.pocket} className="border-b border-white/5 text-slate-300">
                    <td className="px-4 py-2.5">P{a.pocket}</td>
                    <td className="px-4 py-2.5 font-medium text-cyan-300">{a.tool_id}</td>
                    <td className="px-4 py-2.5">{a.diameter_mm}mm</td>
                    <td className="px-4 py-2.5">{a.is_sister ? <span className="text-violet-400">Sister</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {magResult.overflow_tools.length > 0 && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="text-xs font-semibold uppercase text-rose-400">Overflow — did not fit</div>
              <div className="mt-1 text-sm text-rose-300">{magResult.overflow_tools.join(', ')}</div>
            </div>
          )}

          {magResult.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              {magResult.warnings.map((w, i) => <div key={i} className="text-sm text-amber-300">{w}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
