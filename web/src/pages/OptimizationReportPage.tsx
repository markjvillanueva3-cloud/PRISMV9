/**
 * OptimizationReportPage — PP-REV-MS0 U-REV04
 *
 * Upload G-code, select machine/material/controller, click "Optimize",
 * see a full before/after optimization report with per-tool breakdown,
 * cycle time savings, recommendations, setup sheet, and download options.
 */

import { useCallback, useState } from 'react';
import { ppgOptimizationReport, ApiError } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';
import {
  SummaryCards,
  ToolBreakdownTable,
  RecommendationList,
  DownloadButtons,
  SetupSheetPanel,
} from '../components/optimization-report';
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

// ── Page ────────────────────────────────────────────────────────

export function OptimizationReportPage() {
  // Input state
  const [gcode, setGcode] = useState('');
  const [fileName, setFileName] = useState('');
  const [controller, setController] = useState<string>('fanuc');
  const [isoGroup, setIsoGroup] = useState<string>('P');
  const [materialName, setMaterialName] = useState('');
  const [machineName, setMachineName] = useState('');
  const [aggressiveness, setAggressiveness] = useState(0.5);

  // Report state
  const [phase, setPhase] = useState<Phase>('input');
  const [report, setReport] = useState<OptReport | null>(null);
  const [optimizedGcode, setOptimizedGcode] = useState('');
  const [error, setError] = useState('');

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
      };
      if (materialName.trim()) {
        params.material = { name: materialName.trim(), iso_group: isoGroup };
      } else {
        params.material = { name: `ISO ${isoGroup} Steel`, iso_group: isoGroup };
      }
      if (machineName.trim()) {
        params.machine = { name: machineName.trim() };
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
  }, [gcode, controller, aggressiveness, fileName, materialName, machineName, isoGroup]);

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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Controller
              </label>
              <select
                value={controller}
                onChange={(e) => setController(e.target.value)}
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Material (optional)
              </label>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="e.g. 4140, 6061-T6, Ti-6Al-4V"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>

            {/* Machine Name (optional) */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Machine (optional)
              </label>
              <input
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
