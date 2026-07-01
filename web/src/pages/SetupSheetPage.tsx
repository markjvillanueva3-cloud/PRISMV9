/**
 * SetupSheetPage — PP-REV-MS1 U-REV12
 *
 * Upload G-code, auto-generate a professional setup sheet showing:
 * tool list, work offsets, operations, coolant needs, safety notes.
 * Printable format for the shop floor.
 */

import { useCallback, useState } from 'react';
import { ppgSetupSheetAuto, ApiError } from '../api/client';
import { WorkspaceHero, SummaryTile } from '../components/workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────

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
  extents: { x_min: number; x_max: number; y_min: number; y_max: number; z_min: number; z_max: number };
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

// ── Helpers ─────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmtTime(s: number): string {
  if (s < 60) return `${s.toFixed(0)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ── Page ────────────────────────────────────────────────────────

export function SetupSheetPage() {
  const [gcode, setGcode] = useState('');
  const [fileName, setFileName] = useState('');
  const [controller, setController] = useState<string>('fanuc');
  const [partNumber, setPartNumber] = useState('');
  const [machineName, setMachineName] = useState('');

  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<SetupSheetResult | null>(null);
  const [error, setError] = useState('');

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') setGcode(e.target.result);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGenerate = useCallback(async () => {
    if (!gcode.trim()) return;
    setPhase('running');
    setError('');

    try {
      const resp = await ppgSetupSheetAuto({
        gcode,
        controller,
        part_number: partNumber || fileName.replace(/\.[^.]+$/, ''),
        machine_name: machineName || undefined,
        include_tool_list: true,
        include_offsets: true,
        include_safety: true,
      });
      const data = (resp as any).result ?? (resp as any).data ?? resp;
      setResult(data as SetupSheetResult);
      setPhase('result');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setPhase('error');
    }
  }, [gcode, controller, partNumber, machineName, fileName]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setResult(null);
    setError('');
  }, []);

  const ss = result?.setup_sheet;

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Post Processor"
        title="Setup Sheet Generator"
        description="Upload a G-code program and PRISM extracts a complete setup sheet — tool list, work offsets, coolant needs, operation sequence, safety notes. Print it and hand it to the operator."
        metrics={
          <>
            <SummaryTile label="Auto-Extract" value="Tools" hint="Numbers, offsets, descriptions" />
            <SummaryTile label="Safety" value="Notes" hint="Collision warnings, depth checks" />
            <SummaryTile label="Output" value="Printable" hint="Markdown download" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          </>
        }
      />

      {/* ── Input Phase ─────────────────────────────────────── */}
      {(phase === 'input' || phase === 'error') && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('ss-file-input')?.click()}
              className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                gcode
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/30'
              }`}
            >
              <input id="ss-file-input" type="file" accept={ACCEPTED_EXTENSIONS} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
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
              onChange={(e) => { setGcode(e.target.value); if (!fileName) setFileName('pasted-program'); }}
              placeholder="Or paste G-code here..."
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Settings</h3>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Controller</label>
              <select value={controller} onChange={(e) => setController(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-cyan-400/40 focus:outline-none">
                {CONTROLLERS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Part Number</label>
              <input type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="e.g. BRACKET-001" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Machine</label>
              <input type="text" value={machineName} onChange={(e) => setMachineName(e.target.value)} placeholder="e.g. Haas VF-2" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none" />
            </div>
            <button type="button" onClick={handleGenerate} disabled={!gcode.trim()} className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">
              Generate Setup Sheet
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
          <div className="text-lg font-medium text-slate-300">Extracting setup sheet...</div>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────── */}
      {phase === 'result' && ss && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleReset} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.06]">
              &#x2190; New Sheet
            </button>
            {result?.markdown && (
              <button type="button" onClick={() => downloadBlob(result.markdown, `${ss.part_number || 'setup'}-sheet.md`, 'text/markdown')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20">
                &#x2B07; Download Markdown
              </button>
            )}
          </div>

          {/* Summary tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Program</div>
              <div className="mt-2 text-xl font-bold text-slate-50">{ss.program_number || ss.part_number}</div>
              <div className="mt-1 text-sm text-slate-400">{ss.controller} controller</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tools</div>
              <div className="mt-2 text-xl font-bold text-cyan-400">{ss.tools.length}</div>
              <div className="mt-1 text-sm text-slate-400">{ss.operations.length} operations</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Est. Cycle Time</div>
              <div className="mt-2 text-xl font-bold text-emerald-400">{fmtTime(ss.cycle_time_est_s)}</div>
              <div className="mt-1 text-sm text-slate-400">Coolant: {ss.coolant_required ? 'Required' : 'Not required'}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Work Envelope</div>
              <div className="mt-2 text-xl font-bold text-violet-400">
                {(ss.extents.x_max - ss.extents.x_min).toFixed(0)} x {(ss.extents.y_max - ss.extents.y_min).toFixed(0)}
              </div>
              <div className="mt-1 text-sm text-slate-400">Z: {ss.extents.z_min.toFixed(1)} to {ss.extents.z_max.toFixed(1)}</div>
            </div>
          </div>

          {/* Tool List */}
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
                {ss.tools.map((t) => (
                  <tr key={t.number} className="border-b border-white/5 text-slate-300 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 font-medium text-cyan-300">T{t.number}</td>
                    <td className="px-4 py-2.5">H{t.offset_h}</td>
                    <td className="px-4 py-2.5">D{t.offset_d}</td>
                    <td className="px-4 py-2.5">{t.description_guess}</td>
                    <td className="px-4 py-2.5">{t.rpm_values[0] ?? '—'}</td>
                    <td className="px-4 py-2.5">{t.feed_values[0] ?? '—'}</td>
                    <td className="px-4 py-2.5">{t.coolant}</td>
                    <td className="px-4 py-2.5">{t.z_depths.length > 0 ? Math.min(...t.z_depths).toFixed(1) : '—'}</td>
                    <td className="px-4 py-2.5">{t.estimated_diameter_mm != null ? `${t.estimated_diameter_mm.toFixed(1)}mm` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Operations */}
          {ss.operations.length > 0 && (
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
                  {ss.operations.map((op, i) => (
                    <tr key={i} className="border-b border-white/5 text-slate-300">
                      <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-cyan-300">T{op.tool}</td>
                      <td className="px-4 py-2.5">{op.type_guess}</td>
                      <td className="px-4 py-2.5">{op.rpm}</td>
                      <td className="px-4 py-2.5">{op.feed_range[0]}–{op.feed_range[1]}</td>
                      <td className="px-4 py-2.5">{op.z_depths.length > 0 ? Math.min(...op.z_depths).toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5">{fmtTime(op.est_time_s)}</td>
                      <td className="px-4 py-2.5">{op.coolant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Work Offsets */}
          {ss.work_offsets.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Work Offsets</div>
              <div className="flex flex-wrap gap-3">
                {ss.work_offsets.map((o) => (
                  <div key={o.code} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                    <span className="font-bold text-violet-300">{o.code}</span>
                    <span className="ml-2 text-sm text-slate-400">({o.use_count}x)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notes */}
          {ss.safety_notes.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">Safety Notes</div>
              <div className="space-y-2">
                {ss.safety_notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-300/80">
                    <span>&#x26A0;</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playbook Advice */}
          {result?.playbook_advice && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Playbook Advice</div>
              {result.playbook_advice.datum_strategy && (
                <div className="mb-2 text-sm text-slate-300"><strong className="text-slate-200">Datum:</strong> {result.playbook_advice.datum_strategy}</div>
              )}
              {result.playbook_advice.workholding.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-slate-400">Workholding</div>
                  {result.playbook_advice.workholding.map((w, i) => <div key={i} className="text-sm text-slate-300">{w}</div>)}
                </div>
              )}
              {result.playbook_advice.setup_warnings.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-amber-400">Warnings</div>
                  {result.playbook_advice.setup_warnings.map((w, i) => <div key={i} className="text-sm text-amber-300/80">{w}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
