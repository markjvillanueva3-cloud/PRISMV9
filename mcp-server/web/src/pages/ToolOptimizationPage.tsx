/**
 * ToolOptimizationPage - PP-REV-MS2 U-REV16
 *
 * Two modes:
 * 1. Tool Change Optimization - resequence operations to minimize tool changes
 * 2. Magazine Layout - optimal pocket placement for minimum rotation time
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ppgToolOptimize, ppgMagazineLayout, ApiError } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';
import { MachineWorkspaceAuthorityCard } from '../features/machine-workspace/MachineWorkspaceAuthorityCard';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

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

interface ToolOptimizationLocationState {
  sourceLabel?: string;
  workspaceContext?: MachineWorkspaceContext;
  operations?: OperationRow[];
  tools?: ToolRow[];
  unsupportedReason?: string;
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

function buildSupportState(
  workspaceContext: MachineWorkspaceContext | undefined,
  unsupportedReason: string | undefined,
) {
  if (workspaceContext?.mode === 'wire_edm' || workspaceContext?.mode === 'edm') {
    return {
      toolChangeSupported: false,
      magazineSupported: false,
      note: unsupportedReason ?? 'Wire EDM and EDM electrode routes do not yet publish a canonical tool-change or magazine optimization contract, so this surface stays fail-closed for that posture.',
    };
  }

  if (workspaceContext?.mode === 'lathe') {
    return {
      toolChangeSupported: true,
      magazineSupported: false,
      note: 'The shared JM Die lathe route supports sequence optimization here, but carousel magazine layout remains mill-only so turret posture is not overclaimed.',
    };
  }

  return {
    toolChangeSupported: true,
    magazineSupported: true,
    note: '',
  };
}

export function ToolOptimizationPage() {
  const location = useLocation();
  const locationState = useMemo(
    () => ((location.state as ToolOptimizationLocationState | null) ?? null),
    [location.state],
  );
  const workspaceContext = locationState?.workspaceContext;
  const routedSourceLabel = locationState?.sourceLabel ?? 'routed machine workspace';
  const supportState = useMemo(
    () => buildSupportState(workspaceContext, locationState?.unsupportedReason),
    [locationState?.unsupportedReason, workspaceContext],
  );
  const isBlockedPosture = !supportState.toolChangeSupported && !supportState.magazineSupported;

  const [mode, setMode] = useState<Mode>('tool-change');
  const [operations, setOperations] = useState<OperationRow[]>(DEFAULT_OPS);
  const [tools, setTools] = useState<ToolRow[]>(DEFAULT_TOOLS);
  const [magazineCapacity, setMagazineCapacity] = useState(24);
  const [magazineType, setMagazineType] = useState<string>('chain');

  const [phase, setPhase] = useState<Phase>('input');
  const [tcResult, setTcResult] = useState<ToolChangeResult | null>(null);
  const [magResult, setMagResult] = useState<MagazineResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (locationState?.operations?.length) {
      setOperations(locationState.operations);
    }
    if (locationState?.tools?.length) {
      setTools(locationState.tools);
    }
  }, [locationState?.operations, locationState?.tools]);

  useEffect(() => {
    if (!supportState.magazineSupported) {
      setMode('tool-change');
    }
  }, [supportState.magazineSupported]);

  const handleOptimize = useCallback(async () => {
    if (isBlockedPosture) {
      return;
    }

    setPhase('running');
    setError('');
    try {
      if (mode === 'tool-change') {
        const resp = await ppgToolOptimize({ operations, tools });
        const data = (resp as unknown as { result?: ToolChangeResult; data?: ToolChangeResult }).result
          ?? (resp as unknown as { result?: ToolChangeResult; data?: ToolChangeResult }).data
          ?? (resp as unknown as ToolChangeResult);
        setTcResult(data as ToolChangeResult);
        setMagResult(null);
      } else {
        const resp = await ppgMagazineLayout({
          tools,
          magazine_capacity: magazineCapacity,
          magazine_type: magazineType,
          operation_sequence: operations.map((operation) => operation.tool_id),
        });
        const data = (resp as unknown as { result?: MagazineResult; data?: MagazineResult }).result
          ?? (resp as unknown as { result?: MagazineResult; data?: MagazineResult }).data
          ?? (resp as unknown as MagazineResult);
        setMagResult(data as MagazineResult);
        setTcResult(null);
      }
      setPhase('result');
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : String(caughtError));
      setPhase('error');
    }
  }, [isBlockedPosture, magazineCapacity, magazineType, mode, operations, tools]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setTcResult(null);
    setMagResult(null);
    setError('');
  }, []);

  const updateOp = (index: number, field: keyof OperationRow, value: string | number) => {
    setOperations((previous) => previous.map((operation, currentIndex) => (
      currentIndex === index ? { ...operation, [field]: value } : operation
    )));
  };

  const addOp = () => {
    const nextIndex = operations.length + 1;
    setOperations((previous) => [
      ...previous,
      { id: `op${nextIndex}`, tool_id: 'T1', tool_diameter_mm: 10, operation_type: 'rough', cutting_time_min: 3 },
    ]);
  };

  const removeOp = (index: number) => {
    setOperations((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
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

      {workspaceContext ? (
        <MachineWorkspaceAuthorityCard
          context={workspaceContext}
          title="Shared routed tool-optimization authority"
          subtitle={`The shared JM Die machine, controller, and programming posture from ${routedSourceLabel} now hydrates this optimization desk.`}
        />
      ) : null}

      {(workspaceContext || supportState.note) ? (
        <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Routed optimization defaults
          </div>
          <div className="mt-2">
            Shared JM Die route defaults from {routedSourceLabel} stay visible here so optimization posture matches the routed machine spine.
          </div>
          {supportState.note ? <div className="mt-2">{supportState.note}</div> : null}
        </div>
      ) : null}

      {isBlockedPosture ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
            Unsupported routed posture
          </div>
          <div className="mt-3 text-sm leading-6 text-amber-100">
            Tool optimization is not yet supported for this routed wire EDM posture. The page stays fail-closed until a real pass-sequencing or consumable-optimization contract exists.
          </div>
        </div>
      ) : (
        <>
          {(phase === 'input' || phase === 'error') ? (
            <div className="space-y-6">
              <div className="flex rounded-lg border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setMode('tool-change')}
                  disabled={!supportState.toolChangeSupported}
                  className={`px-4 py-2 text-sm font-bold rounded-l-lg transition ${
                    mode === 'tool-change' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-white/[0.04]'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Tool Change Optimization
                </button>
                <button
                  type="button"
                  onClick={() => setMode('magazine')}
                  disabled={!supportState.magazineSupported}
                  className={`px-4 py-2 text-sm font-bold rounded-r-lg transition ${
                    mode === 'magazine' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:bg-white/[0.04]'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Magazine Layout
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Operations ({operations.length})</span>
                  <button type="button" onClick={addOp} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/[0.04]">
                    + Add
                  </button>
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
                    {operations.map((operation, index) => (
                      <tr key={index} className="border-b border-white/5 text-slate-300">
                        <td className="px-4 py-1.5">
                          <input value={operation.id} onChange={(event) => updateOp(index, 'id', event.target.value)} className="w-16 rounded border border-white/10 bg-transparent px-2 py-1 text-xs" />
                        </td>
                        <td className="px-4 py-1.5">
                          <input value={operation.tool_id} onChange={(event) => updateOp(index, 'tool_id', event.target.value)} className="w-14 rounded border border-white/10 bg-transparent px-2 py-1 text-xs font-medium text-cyan-300" />
                        </td>
                        <td className="px-4 py-1.5">
                          <input type="number" value={operation.tool_diameter_mm} onChange={(event) => updateOp(index, 'tool_diameter_mm', parseFloat(event.target.value) || 0)} className="w-16 rounded border border-white/10 bg-transparent px-2 py-1 text-xs" />
                        </td>
                        <td className="px-4 py-1.5">
                          <select value={operation.operation_type} onChange={(event) => updateOp(index, 'operation_type', event.target.value)} className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                            {['rough', 'semi_finish', 'finish', 'drill', 'tap', 'bore', 'chamfer', 'face_mill', 'turning', 'partoff'].map((operationType) => (
                              <option key={operationType} value={operationType}>{operationType}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-1.5">
                          <input type="number" value={operation.cutting_time_min} onChange={(event) => updateOp(index, 'cutting_time_min', parseFloat(event.target.value) || 0)} className="w-16 rounded border border-white/10 bg-transparent px-2 py-1 text-xs" />
                        </td>
                        <td className="px-4 py-1.5">
                          <button type="button" onClick={() => removeOp(index)} className="text-xs text-rose-400 hover:text-rose-300">x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {mode === 'magazine' ? (
                <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <div>
                    <label htmlFor="tool-optimization-magazine-capacity" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Magazine Capacity</label>
                    <input id="tool-optimization-magazine-capacity" type="number" value={magazineCapacity} onChange={(event) => setMagazineCapacity(parseInt(event.target.value, 10) || 24)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300" />
                  </div>
                  <div>
                    <label htmlFor="tool-optimization-magazine-type" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Magazine Type</label>
                    <select id="tool-optimization-magazine-type" value={magazineType} onChange={(event) => setMagazineType(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                      <option value="chain">Chain</option>
                      <option value="drum">Drum</option>
                      <option value="disc">Disc</option>
                      <option value="matrix">Matrix</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <button type="button" onClick={handleOptimize} disabled={operations.length < 2} className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
                {mode === 'tool-change' ? 'Optimize Tool Changes' : 'Optimize Magazine Layout'}
              </button>

              {(phase === 'error' && error) ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
              ) : null}
            </div>
          ) : null}

          {phase === 'running' ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
              <div className="text-lg font-medium text-slate-300">Optimizing...</div>
            </div>
          ) : null}

          {(phase === 'result' && tcResult) ? (
            <div className="space-y-6">
              <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">
                Back
              </button>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Changes Saved</div>
                  <div className="mt-2 text-3xl font-bold text-emerald-400">{tcResult.changes_saved}</div>
                  <div className="mt-1 text-sm text-slate-400">{tcResult.original_tool_changes} to {tcResult.total_tool_changes}</div>
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
                    {tcResult.optimized_sequence.map((step, index) => (
                      <tr key={index} className={`border-b border-white/5 ${step.tool_change ? 'bg-amber-500/5' : ''} text-slate-300`}>
                        <td className="px-4 py-2.5 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-2.5">{step.operation_id}</td>
                        <td className="px-4 py-2.5 font-medium text-cyan-300">{step.tool_id}</td>
                        <td className="px-4 py-2.5">{step.tool_change ? <span className="text-amber-400">YES</span> : <span className="text-slate-600">no</span>}</td>
                        <td className="px-4 py-2.5 text-slate-500">{step.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {tcResult.warnings.length > 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  {tcResult.warnings.map((warning, index) => <div key={index} className="text-sm text-amber-300">{warning}</div>)}
                </div>
              ) : null}
            </div>
          ) : null}

          {(phase === 'result' && magResult) ? (
            <div className="space-y-6">
              <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">
                Back
              </button>

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

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Magazine Layout</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: magazineCapacity }, (_, index) => {
                    const pocket = index + 1;
                    const assignment = magResult.assignments.find((candidate) => candidate.pocket === pocket);
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
                        <div className="font-bold">{assignment?.tool_id || '-'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                    {magResult.assignments.map((assignment) => (
                      <tr key={assignment.pocket} className="border-b border-white/5 text-slate-300">
                        <td className="px-4 py-2.5">P{assignment.pocket}</td>
                        <td className="px-4 py-2.5 font-medium text-cyan-300">{assignment.tool_id}</td>
                        <td className="px-4 py-2.5">{assignment.diameter_mm}mm</td>
                        <td className="px-4 py-2.5">{assignment.is_sister ? <span className="text-violet-400">Sister</span> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {magResult.overflow_tools.length > 0 ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="text-xs font-semibold uppercase text-rose-400">Overflow - did not fit</div>
                  <div className="mt-1 text-sm text-rose-300">{magResult.overflow_tools.join(', ')}</div>
                </div>
              ) : null}

              {magResult.warnings.length > 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  {magResult.warnings.map((warning, index) => <div key={index} className="text-sm text-amber-300">{warning}</div>)}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
