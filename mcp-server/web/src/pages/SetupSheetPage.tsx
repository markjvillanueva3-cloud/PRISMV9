/**
 * SetupSheetPage - PP-REV-MS1 U-REV12
 *
 * Upload G-code, auto-generate a professional setup sheet showing:
 * tool list, work offsets, operations, coolant needs, safety notes.
 * Printable format for the shop floor.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError, ppgSetupSheetAuto } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';
import { MachineWorkspaceAuthorityCard } from '../features/machine-workspace/MachineWorkspaceAuthorityCard';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

interface ExtractedTool {
  number: number;
  offset_h: number;
  offset_d: number;
  description_guess: string;
  rpm_values: number[];
  feed_values: number[];
  operation_type: string;
  z_depths: number[];
  coolant: string;
  estimated_diameter_mm: number | null;
}

interface ExtractedOperation {
  tool: number;
  type_guess: string;
  z_depths: number[];
  feed_range: [number, number];
  rpm: number;
  est_time_s: number;
  coolant: string;
}

interface WorkOffset {
  code: string;
  use_count: number;
}

interface SetupSheet {
  program_number: string;
  part_number: string;
  operation_name: string;
  tools: ExtractedTool[];
  work_offsets: WorkOffset[];
  coolant_required: boolean;
  cycle_time_est_s: number;
  extents: {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
  };
  safety_notes: string[];
  operations: ExtractedOperation[];
  controller: string;
}

interface SetupSheetResult {
  setup_sheet: SetupSheet;
  markdown: string;
  playbook_advice?: {
    workholding: string[];
    datum_strategy: string;
    setup_warnings: string[];
  };
}

type Phase = 'input' | 'running' | 'result' | 'error';

const ACCEPTED_EXTENSIONS = '.nc,.tap,.mpf,.h,.eia,.gcode,.txt,.ngc,.cnc,.prg,.iso';
const CONTROLLERS = ['fanuc', 'siemens', 'haas', 'mazak', 'okuma', 'heidenhain', 'generic'] as const;

type SetupSheetController = (typeof CONTROLLERS)[number];

type SetupSheetLocationState = {
  gcode?: string;
  fileName?: string;
  partNumber?: string;
  machineName?: string;
  controller?: string;
  sourceLabel?: string;
  workspaceContext?: MachineWorkspaceContext;
};

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function fmtTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`;
  }
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function stripExtension(value: string) {
  return value.replace(/\.[^.]+$/, '');
}

function resolveSetupSheetController(
  rawController: string | undefined,
  workspaceContext: MachineWorkspaceContext | undefined,
): SetupSheetController {
  const source = `${rawController ?? ''} ${workspaceContext?.controllerId ?? ''} ${workspaceContext?.controllerLabel ?? ''}`
    .trim()
    .toLowerCase();

  if (!source) {
    return 'fanuc';
  }
  if (source.includes('fanuc')) {
    return 'fanuc';
  }
  if (source.includes('siemens')) {
    return 'siemens';
  }
  if (source.includes('haas')) {
    return 'haas';
  }
  if (source.includes('mazak') || source.includes('mazatrol')) {
    return 'mazak';
  }
  if (source.includes('okuma')) {
    return 'okuma';
  }
  if (source.includes('heidenhain')) {
    return 'heidenhain';
  }
  return 'generic';
}

export function SetupSheetPage() {
  const location = useLocation();
  const locationState = (location.state as SetupSheetLocationState | null) ?? null;
  const workspaceContext = locationState?.workspaceContext;
  const routedSourceLabel = locationState?.sourceLabel ?? 'the routed machine workspace';
  const resolvedController = useMemo(
    () => resolveSetupSheetController(locationState?.controller, workspaceContext),
    [locationState?.controller, workspaceContext],
  );
  const authorityMachineName = locationState?.machineName ?? workspaceContext?.machineLabel ?? '';
  const authorityPartNumber = locationState?.partNumber ?? (locationState?.fileName ? stripExtension(locationState.fileName) : '');
  const authorityControllerLabel = locationState?.controller ?? workspaceContext?.controllerLabel ?? workspaceContext?.controllerId ?? '';
  const controllerWasMapped = Boolean(
    authorityControllerLabel
    && authorityControllerLabel.trim().toLowerCase() !== resolvedController,
  );

  const [gcode, setGcode] = useState(() => locationState?.gcode ?? '');
  const [fileName, setFileName] = useState(() => locationState?.fileName ?? '');
  const [controller, setController] = useState<SetupSheetController>(() => resolvedController);
  const [partNumber, setPartNumber] = useState(() => authorityPartNumber);
  const [machineName, setMachineName] = useState(() => authorityMachineName);
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<SetupSheetResult | null>(null);
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
    if (authorityPartNumber) {
      setPartNumber(authorityPartNumber);
    }
    if (authorityMachineName) {
      setMachineName(authorityMachineName);
    }
    setController(resolvedController);
  }, [
    authorityMachineName,
    authorityPartNumber,
    locationState,
    locationState?.fileName,
    locationState?.gcode,
    resolvedController,
  ]);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setGcode(event.target.result);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleGenerate = useCallback(async () => {
    if (!gcode.trim()) {
      return;
    }

    setPhase('running');
    setError('');

    try {
      const response = await ppgSetupSheetAuto({
        gcode,
        controller,
        part_number: partNumber || fileName.replace(/\.[^.]+$/, ''),
        machine_name: machineName || undefined,
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });
      const data = (response as unknown as { result?: SetupSheetResult; data?: SetupSheetResult }).result
        ?? (response as unknown as { data?: SetupSheetResult }).data
        ?? (response as unknown as SetupSheetResult);
      setResult(data);
      setPhase('result');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : String(cause));
      setPhase('error');
    }
  }, [controller, fileName, gcode, machineName, partNumber]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setResult(null);
    setError('');
  }, []);

  const setupSheet = result?.setup_sheet;

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Post Processor"
        title="Setup Sheet Generator"
        description="Upload a G-code program and Kienzle extracts a complete setup sheet: tool list, work offsets, coolant needs, operation sequence, and safety notes ready for the shop floor."
        metrics={
          <>
            <SummaryTile label="Auto-Extract" value="Tools" hint="Numbers, offsets, descriptions" />
            <SummaryTile label="Safety" value="Notes" hint="Collision warnings, depth checks" />
            <SummaryTile
              label="Output"
              value="Printable"
              hint="Markdown download"
              accent="from-emerald-400/22 via-emerald-300/10 to-transparent"
            />
          </>
        }
      />

      {workspaceContext ? (
        <MachineWorkspaceAuthorityCard
          context={workspaceContext}
          title="Shared routed setup authority"
          subtitle={`This setup-sheet flow now inherits the same JM Die machine, controller, selector, and programming posture from ${routedSourceLabel}.`}
        />
      ) : null}

      {(phase === 'input' || phase === 'error') && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              onClick={() => document.getElementById('ss-file-input')?.click()}
              className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                gcode
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/30'
              }`}
            >
              <input
                id="ss-file-input"
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleFile(file);
                  }
                }}
                className="hidden"
              />
              {gcode ? (
                <>
                  <div className="text-lg font-medium text-emerald-300">{fileName}</div>
                  <div className="mt-1 text-sm text-slate-400">{gcode.split('\n').length} lines</div>
                </>
              ) : (
                <>
                  <div className="text-4xl text-slate-500">&#x1F4CB;</div>
                  <div className="mt-3 text-sm font-medium text-slate-300">Drop G-code or click to browse</div>
                  <div className="mt-1 text-xs text-slate-500">.nc .tap .mpf .h .eia .gcode</div>
                </>
              )}
            </div>

            <textarea
              value={gcode}
              onChange={(event) => {
                setGcode(event.target.value);
                if (!fileName) {
                  setFileName('pasted-program');
                }
              }}
              placeholder="Or paste G-code here..."
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Settings</h3>

            {workspaceContext ? (
              <div className="rounded-xl border border-cyan-300/16 bg-cyan-300/[0.06] px-4 py-3 text-sm leading-6 text-slate-300">
                JM Die routed defaults are loaded from {routedSourceLabel}. You can override these fields locally before generating the sheet.
                {controllerWasMapped ? ` The routed controller "${authorityControllerLabel}" was mapped to "${resolvedController}" for setup-sheet parsing.` : ''}
              </div>
            ) : null}

            <div>
              <label htmlFor="setup-sheet-controller" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Controller
              </label>
              <select
                id="setup-sheet-controller"
                value={controller}
                onChange={(event) => setController(event.target.value as SetupSheetController)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-cyan-400/40 focus:outline-none"
              >
                {CONTROLLERS.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="setup-sheet-part-number" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Part Number
              </label>
              <input
                id="setup-sheet-part-number"
                type="text"
                value={partNumber}
                onChange={(event) => setPartNumber(event.target.value)}
                placeholder="e.g. BRACKET-001"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="setup-sheet-machine" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Machine
              </label>
              <input
                id="setup-sheet-machine"
                type="text"
                value={machineName}
                onChange={(event) => setMachineName(event.target.value)}
                placeholder="e.g. Haas VF-2"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!gcode.trim()}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate Setup Sheet
            </button>

            {phase === 'error' && error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <div className="text-lg font-medium text-slate-300">Extracting setup sheet...</div>
        </div>
      )}

      {phase === 'result' && setupSheet ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]"
            >
              &#x2190; New Sheet
            </button>
            {result?.markdown ? (
              <button
                type="button"
                onClick={() => downloadBlob(result.markdown, `${setupSheet.part_number || 'setup'}-sheet.md`, 'text/markdown')}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
              >
                &#x2B07; Download Markdown
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Program</div>
              <div className="mt-2 text-xl font-bold text-slate-50">{setupSheet.program_number || setupSheet.part_number}</div>
              <div className="mt-1 text-sm text-slate-400">{setupSheet.controller} controller</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tools</div>
              <div className="mt-2 text-xl font-bold text-cyan-400">{setupSheet.tools.length}</div>
              <div className="mt-1 text-sm text-slate-400">{setupSheet.operations.length} operations</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Est. Cycle Time</div>
              <div className="mt-2 text-xl font-bold text-emerald-400">{fmtTime(setupSheet.cycle_time_est_s)}</div>
              <div className="mt-1 text-sm text-slate-400">Coolant: {setupSheet.coolant_required ? 'Required' : 'Not required'}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Work Envelope</div>
              <div className="mt-2 text-xl font-bold text-violet-400">
                {(setupSheet.extents.x_max - setupSheet.extents.x_min).toFixed(0)} x {(setupSheet.extents.y_max - setupSheet.extents.y_min).toFixed(0)}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Z: {setupSheet.extents.z_min.toFixed(1)} to {setupSheet.extents.z_max.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Tool List</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">H</th>
                  <th className="px-4 py-2">D</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">RPM</th>
                  <th className="px-4 py-2">Feed</th>
                  <th className="px-4 py-2">Coolant</th>
                  <th className="px-4 py-2">Min Z</th>
                  <th className="px-4 py-2">Est. Dia</th>
                </tr>
              </thead>
              <tbody>
                {setupSheet.tools.map((tool) => (
                  <tr key={tool.number} className="border-b border-white/5 text-slate-300 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 font-medium text-cyan-300">T{tool.number}</td>
                    <td className="px-4 py-2.5">H{tool.offset_h}</td>
                    <td className="px-4 py-2.5">D{tool.offset_d}</td>
                    <td className="px-4 py-2.5">{tool.description_guess}</td>
                    <td className="px-4 py-2.5">{tool.rpm_values[0] ?? '-'}</td>
                    <td className="px-4 py-2.5">{tool.feed_values[0] ?? '-'}</td>
                    <td className="px-4 py-2.5">{tool.coolant}</td>
                    <td className="px-4 py-2.5">{tool.z_depths.length > 0 ? Math.min(...tool.z_depths).toFixed(1) : '-'}</td>
                    <td className="px-4 py-2.5">{tool.estimated_diameter_mm != null ? `${tool.estimated_diameter_mm.toFixed(1)}mm` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {setupSheet.operations.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
              <div className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Operation Sequence</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Tool</th>
                    <th className="px-4 py-2">Operation</th>
                    <th className="px-4 py-2">RPM</th>
                    <th className="px-4 py-2">Feed Range</th>
                    <th className="px-4 py-2">Max Depth</th>
                    <th className="px-4 py-2">Est. Time</th>
                    <th className="px-4 py-2">Coolant</th>
                  </tr>
                </thead>
                <tbody>
                  {setupSheet.operations.map((operation, index) => (
                    <tr key={`${operation.tool}-${index}`} className="border-b border-white/5 text-slate-300">
                      <td className="px-4 py-2.5 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-cyan-300">T{operation.tool}</td>
                      <td className="px-4 py-2.5">{operation.type_guess}</td>
                      <td className="px-4 py-2.5">{operation.rpm}</td>
                      <td className="px-4 py-2.5">{operation.feed_range[0]}-{operation.feed_range[1]}</td>
                      <td className="px-4 py-2.5">{operation.z_depths.length > 0 ? Math.min(...operation.z_depths).toFixed(1) : '-'}</td>
                      <td className="px-4 py-2.5">{fmtTime(operation.est_time_s)}</td>
                      <td className="px-4 py-2.5">{operation.coolant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {setupSheet.work_offsets.length > 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Work Offsets</div>
              <div className="flex flex-wrap gap-3">
                {setupSheet.work_offsets.map((offset) => (
                  <div key={offset.code} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                    <span className="font-bold text-violet-300">{offset.code}</span>
                    <span className="ml-2 text-sm text-slate-400">({offset.use_count}x)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {setupSheet.safety_notes.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">Safety Notes</div>
              <div className="space-y-2">
                {setupSheet.safety_notes.map((note, index) => (
                  <div key={`${note}-${index}`} className="flex items-start gap-2 text-sm text-amber-300/80">
                    <span>&#x26A0;</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result?.playbook_advice ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Playbook Advice</div>

              {result.playbook_advice.datum_strategy ? (
                <div className="mb-2 text-sm text-slate-300">
                  <strong className="text-slate-200">Datum:</strong> {result.playbook_advice.datum_strategy}
                </div>
              ) : null}

              {result.playbook_advice.workholding.length > 0 ? (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-slate-400">Workholding</div>
                  {result.playbook_advice.workholding.map((entry, index) => (
                    <div key={`${entry}-${index}`} className="text-sm text-slate-300">
                      {entry}
                    </div>
                  ))}
                </div>
              ) : null}

              {result.playbook_advice.setup_warnings.length > 0 ? (
                <div>
                  <div className="text-xs font-semibold text-amber-400">Warnings</div>
                  {result.playbook_advice.setup_warnings.map((entry, index) => (
                    <div key={`${entry}-${index}`} className="text-sm text-amber-300/80">
                      {entry}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
