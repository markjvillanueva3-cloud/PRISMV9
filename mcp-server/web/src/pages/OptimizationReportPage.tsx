/**
 * OptimizationReportPage — PP-REV-MS0 U-REV04
 *
 * Upload G-code, select machine/material/controller, click "Optimize",
 * see a full before/after optimization report with per-tool breakdown,
 * cycle time savings, recommendations, setup sheet, and download options.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ppgOptimizationReport, ApiError } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';
import {
  SummaryCards,
  ToolBreakdownTable,
  RecommendationList,
  DownloadButtons,
  SetupSheetPanel,
} from '../components/optimization-report';
import { MachineWorkspaceAuthorityCard } from '../features/machine-workspace/MachineWorkspaceAuthorityCard';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';
import type { ToolReportRow } from '../components/optimization-report';

// ── Types ───────────────────────────────────────────────────────

interface OptReport {
  summary: {
    program_name: string;
    machine_name: string;
    material_name: string;
    controller: string;
    total_blocks: number;
    blocks_optimized: number;
    optimization_pct: number;
    cycle_time_original_sec: number;
    cycle_time_optimized_sec: number;
    cycle_time_saved_sec: number;
    cycle_time_saved_pct: number;
    feed_changes: number;
    rpm_changes: number;
    max_force_N: number;
    avg_force_N: number;
    max_power_kW: number;
    recommendations: string[];
    tool_count: number;
    stages_executed: number;
    pipeline_duration_ms: number;
  };
  per_tool: ToolReportRow[];
  recommendations: string[];
  report_html: string;
  report_json: string;
  report_markdown: string;
  setup_sheet: { setup_sheet: any } | null;
  diff: { output_gcode?: string } | null;
  comparison: any;
}

type Phase = 'input' | 'running' | 'result' | 'error';

const ACCEPTED_EXTENSIONS = '.nc,.tap,.mpf,.h,.eia,.gcode,.txt,.ngc,.cnc,.prg,.iso';

const ISO_GROUPS = ['P', 'M', 'K', 'N', 'S', 'H'] as const;

const COMMON_CONTROLLERS = [
  'fanuc',
  'siemens_840d',
  'haas',
  'heidenhain',
  'mazak',
  'okuma',
  'brother',
  'mitsubishi',
  'fagor',
  'doosan',
] as const;

type OptimizationController = (typeof COMMON_CONTROLLERS)[number];

type OptimizationReportLocationState = {
  gcode?: string;
  fileName?: string;
  materialName?: string;
  materialGroup?: string;
  machineName?: string;
  controller?: string;
  sourceLabel?: string;
  workspaceContext?: MachineWorkspaceContext;
};

function resolveOptimizationController(
  rawController: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
): OptimizationController {
  const source = `${rawController ?? ''} ${workspaceContext?.controllerId ?? ''} ${workspaceContext?.controllerLabel ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return 'fanuc';
  }
  if (source.includes('siemens')) {
    return 'siemens_840d';
  }
  if (source.includes('haas')) {
    return 'haas';
  }
  if (source.includes('heidenhain')) {
    return 'heidenhain';
  }
  if (source.includes('mazak') || source.includes('mazatrol')) {
    return 'mazak';
  }
  if (source.includes('okuma')) {
    return 'okuma';
  }
  if (source.includes('brother')) {
    return 'brother';
  }
  if (source.includes('mitsubishi')) {
    return 'mitsubishi';
  }
  if (source.includes('fagor')) {
    return 'fagor';
  }
  if (source.includes('doosan')) {
    return 'doosan';
  }
  return 'fanuc';
}

function resolveIsoGroup(
  materialGroup: string | undefined,
  materialName: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
): string {
  const source = `${materialGroup ?? ''} ${materialName ?? ''} ${workspaceContext?.materialGroup ?? ''} ${workspaceContext?.materialLabel ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return 'P';
  }
  if (source.includes('stainless')) {
    return 'M';
  }
  if (source.includes('tool steel') || source.includes('hard') || source.includes('d2') || source.includes('h13')) {
    return 'H';
  }
  if (source.includes('cast')) {
    return 'K';
  }
  if (source.includes('aluminum') || source.includes('aluminium') || source.includes('non-ferrous')) {
    return 'N';
  }
  if (source.includes('super alloy') || source.includes('superalloy') || source.includes('inconel') || source.includes('nickel') || source.includes('titanium')) {
    return 'S';
  }
  return 'P';
}

// ── Page ────────────────────────────────────────────────────────

export function OptimizationReportPage() {
  const location = useLocation();
  const locationState = (location.state as OptimizationReportLocationState | null) ?? null;
  const workspaceContext = locationState?.workspaceContext;
  const routedSourceLabel = locationState?.sourceLabel ?? 'the routed machine workspace';
  const resolvedController = useMemo(
    () => resolveOptimizationController(locationState?.controller, workspaceContext),
    [locationState?.controller, workspaceContext],
  );
  const authorityMaterialName = locationState?.materialName ?? workspaceContext?.materialLabel ?? '';
  const authorityMaterialGroup = locationState?.materialGroup ?? workspaceContext?.materialGroup ?? '';
  const authorityMachineName = locationState?.machineName ?? workspaceContext?.machineLabel ?? '';
  const resolvedIsoGroup = useMemo(
    () => resolveIsoGroup(authorityMaterialGroup, authorityMaterialName, workspaceContext),
    [authorityMaterialGroup, authorityMaterialName, workspaceContext],
  );
  const authorityControllerLabel = locationState?.controller ?? workspaceContext?.controllerLabel ?? workspaceContext?.controllerId ?? '';
  const controllerWasMapped = Boolean(
    authorityControllerLabel
    && authorityControllerLabel.trim().toLowerCase() !== resolvedController,
  );
  const materialGroupWasMapped = Boolean(
    authorityMaterialGroup
    && authorityMaterialGroup.trim().toUpperCase() !== resolvedIsoGroup,
  );

  // Input state
  const [gcode, setGcode] = useState(() => locationState?.gcode ?? '');
  const [fileName, setFileName] = useState(() => locationState?.fileName ?? '');
  const [controller, setController] = useState<OptimizationController>(() => resolvedController);
  const [isoGroup, setIsoGroup] = useState<string>(() => resolvedIsoGroup);
  const [materialName, setMaterialName] = useState(() => authorityMaterialName);
  const [machineName, setMachineName] = useState(() => authorityMachineName);
  const [aggressiveness, setAggressiveness] = useState(0.5);

  // Report state
  const [phase, setPhase] = useState<Phase>('input');
  const [report, setReport] = useState<OptReport | null>(null);
  const [optimizedGcode, setOptimizedGcode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!locationState) {
      return;
    }

    if (typeof locationState.gcode === 'string') {
      setGcode(locationState.gcode);
    }
    if (typeof locationState.fileName === 'string') {
      setFileName(locationState.fileName);
    }
    setController(resolvedController);
    setIsoGroup(resolvedIsoGroup);
    if (authorityMaterialName) {
      setMaterialName(authorityMaterialName);
    }
    if (authorityMachineName) {
      setMachineName(authorityMachineName);
    }
  }, [
    authorityMachineName,
    authorityMaterialName,
    locationState,
    locationState?.fileName,
    locationState?.gcode,
    resolvedController,
    resolvedIsoGroup,
  ]);

  // ── File upload handler ───────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setGcode(text);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Optimize handler ──────────────────────────────────────────

  const handleOptimize = useCallback(async () => {
    if (!gcode.trim()) return;

    setPhase('running');
    setError('');

    try {
      const params: Record<string, unknown> = {
        gcode,
        controller,
        aggressiveness,
        program_name: fileName || 'PROGRAM',
        material: {
          name: materialName.trim() || `ISO ${isoGroup} material`,
          iso_group: isoGroup,
          ...(authorityMaterialGroup ? { material_group: authorityMaterialGroup } : {}),
        },
      };
      if (machineName.trim() || workspaceContext) {
        params.machine = {
          name: machineName.trim() || workspaceContext?.machineLabel || 'Shared default',
          controller,
          ...(workspaceContext?.machineId ? { machine_id: workspaceContext.machineId } : {}),
          ...(workspaceContext?.machineManufacturer ? { manufacturer: workspaceContext.machineManufacturer } : {}),
          ...(workspaceContext?.machineKinematics ? { kinematics: workspaceContext.machineKinematics } : {}),
        };
      }

      const resp = await ppgOptimizationReport(params);
      const data = (resp as any).result ?? (resp as any).data ?? resp;

      setReport(data as OptReport);
      // Try to extract optimized G-code from the comparison/diff data
      const oc =
        data?.diff?.optimized_gcode ??
        data?.comparison?.optimized_gcode ??
        '';
      setOptimizedGcode(typeof oc === 'string' ? oc : '');
      setPhase('result');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      setPhase('error');
    }
  }, [
    authorityMaterialGroup,
    controller,
    aggressiveness,
    fileName,
    gcode,
    isoGroup,
    machineName,
    materialName,
    workspaceContext,
  ]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setReport(null);
    setOptimizedGcode('');
    setError('');
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Post Processor"
        title="Optimization Report"
        description="Upload your G-code program. PRISM runs its 38-stage physics pipeline and shows you exactly what it improved — per-tool, per-block, with forces, cycle time, and setup sheet."
        metrics={
          <>
            <SummaryTile label="Pipeline" value="38" hint="Physics stages" />
            <SummaryTile label="Controllers" value="25" hint="Dialect support" />
            <SummaryTile label="Typical Savings" value="10-35%" hint="Cycle time reduction" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          </>
        }
      />

      {/* ── Input Phase ─────────────────────────────────────── */}
      {(phase === 'input' || phase === 'error') && (
        <div className="space-y-6">
          {workspaceContext ? (
            <MachineWorkspaceAuthorityCard
              context={workspaceContext}
              title="Shared routed optimization authority"
              subtitle={`Optimization inherited the same JM Die machine and programming posture from ${routedSourceLabel}.`}
            />
          ) : null}

          {controllerWasMapped || materialGroupWasMapped ? (
            <div className="rounded-2xl border border-sky-300/14 bg-sky-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200">
              {controllerWasMapped ? (
                <div>
                  Controller "{authorityControllerLabel}" from {routedSourceLabel} was mapped to "{controller}" for the optimization engine.
                </div>
              ) : null}
              {materialGroupWasMapped ? (
                <div>
                  Material group "{authorityMaterialGroup}" from {routedSourceLabel} was mapped to ISO "{isoGroup}" for the optimization engine.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* File Upload */}
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                gcode
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/30 hover:bg-cyan-400/5'
              }`}
              onClick={() => document.getElementById('gcode-file-input')?.click()}
            >
              <input
                id="gcode-file-input"
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileInput}
                className="hidden"
              />
              {gcode ? (
                <>
                  <div className="text-lg font-medium text-emerald-300">{fileName}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {gcode.split('\n').length} lines loaded — click to replace
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl text-slate-500">&#x1F4C4;</div>
                  <div className="mt-3 text-sm font-medium text-slate-300">
                    Drop G-code file here or click to browse
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    .nc .tap .mpf .h .eia .gcode .txt .ngc .cnc .prg .iso
                  </div>
                </>
              )}
            </div>

            {/* Or paste */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Or paste G-code directly
              </label>
              <textarea
                value={gcode}
                onChange={(e) => {
                  setGcode(e.target.value);
                  if (!fileName) setFileName('pasted-program');
                }}
                placeholder="G90 G17 G21&#10;T1 M6&#10;S8000 M3&#10;G43 H1 Z50.&#10;G0 X0 Y0&#10;G1 Z-5. F500&#10;..."
                rows={6}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Settings
            </h3>

            {/* Controller */}
            <div>
              <label htmlFor="optimization-controller" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Controller
              </label>
              <select
                id="optimization-controller"
                value={controller}
                onChange={(e) => setController(e.target.value as OptimizationController)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-cyan-400/40 focus:outline-none"
              >
                {COMMON_CONTROLLERS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* ISO Group */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Material ISO Group
              </label>
              <div className="mt-1 flex gap-1">
                {ISO_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setIsoGroup(g)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                      isoGroup === g
                        ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-[10px] text-slate-600">
                P=Steel M=Stainless K=Cast Iron N=Aluminum S=Super Alloy H=Hard Steel
              </div>
            </div>

            {/* Material Name (optional) */}
            <div>
              <label htmlFor="optimization-material" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Material
              </label>
              <input
                id="optimization-material"
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="e.g. 4140, 6061-T6, Ti-6Al-4V"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>

            {/* Machine Name (optional) */}
            <div>
              <label htmlFor="optimization-machine" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Machine
              </label>
              <input
                id="optimization-machine"
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="e.g. Haas VF-2, DMG DMU 50"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>

            {/* Aggressiveness slider */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Aggressiveness: {Math.round(aggressiveness * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={aggressiveness}
                onChange={(e) => setAggressiveness(parseFloat(e.target.value))}
                className="mt-1 w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>

            {/* Optimize Button */}
            <button
              type="button"
              onClick={handleOptimize}
              disabled={!gcode.trim()}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Optimize Program
            </button>

            {phase === 'error' && error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ── Running Phase ───────────────────────────────────── */}
      {phase === 'running' && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <div className="text-lg font-medium text-slate-300">
            Running 38-stage physics pipeline...
          </div>
          <div className="text-sm text-slate-500">
            Kienzle forces, Taylor tool life, per-block S/F optimization, safety validation
          </div>
        </div>
      )}

      {/* ── Result Phase ────────────────────────────────────── */}
      {phase === 'result' && report && (
        <div className="space-y-6">
          {/* Back + Downloads */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 transition hover:bg-white/[0.06]"
            >
              &#x2190; New Analysis
            </button>
            <DownloadButtons
              optimizedGcode={optimizedGcode}
              reportHtml={report.report_html}
              reportJson={report.report_json}
              programName={report.summary.program_name}
            />
          </div>

          {/* Header context */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span>
              <strong className="text-slate-200">{report.summary.program_name}</strong>
            </span>
            <span>Machine: {report.summary.machine_name}</span>
            <span>Material: {report.summary.material_name}</span>
            <span>Controller: {report.summary.controller}</span>
          </div>

          {/* Summary Cards */}
          <SummaryCards
            cycleTimeSavedPct={report.summary.cycle_time_saved_pct}
            cycleTimeSavedSec={report.summary.cycle_time_saved_sec}
            blocksOptimized={report.summary.blocks_optimized}
            totalBlocks={report.summary.total_blocks}
            maxForceN={report.summary.max_force_N}
            maxPowerKW={report.summary.max_power_kW}
            toolCount={report.summary.tool_count}
            stagesExecuted={report.summary.stages_executed}
            pipelineDurationMs={report.summary.pipeline_duration_ms}
          />

          {/* Per-Tool Breakdown */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Per-Tool Breakdown
            </h2>
            <ToolBreakdownTable tools={report.per_tool} />
          </div>

          {/* Setup Sheet */}
          {report.setup_sheet && (
            <SetupSheetPanel setupSheet={report.setup_sheet.setup_sheet ?? report.setup_sheet} />
          )}

          {/* Recommendations */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Recommendations
            </h2>
            <RecommendationList recommendations={report.recommendations} />
          </div>

          {/* Downloads again at bottom */}
          <div className="pt-4">
            <DownloadButtons
              optimizedGcode={optimizedGcode}
              reportHtml={report.report_html}
              reportJson={report.report_json}
              programName={report.summary.program_name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
