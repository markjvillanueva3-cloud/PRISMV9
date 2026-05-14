/**
 * WireEdmCalibrationPanel — WEDM-CAL-MS4 / U-CAL19
 *
 * Deviation dashboard panel for the WEDM calibration flow. Consumes a
 * WEDMComparisonReport (from WEDMProgramComparisonEngine) and renders:
 *
 *   1. Overall-match hero gauge (match % + grade + production-ready chip)
 *   2. Per-parameter deviation chart (match % as spectrum-fill bar + severity chip)
 *   3. Optional calibration-history sparkline (recent overall_match scores)
 *   4. "Calibrate from program" action button — host page wires the handler
 *
 * Design follows Calculator Studio language: prism-glow borders, severity
 * color mapping (emerald = match, sky = minor, amber = major, red = critical).
 *
 * Pure presentational — no API calls, no state mutation. The host page owns
 * the report lifecycle. This makes the panel trivially testable.
 */

import type { ReactNode } from 'react';

// ─── Types (mirror engine shape — keeps web/server types in sync) ──────────

export type ParamSeverity = 'match' | 'minor' | 'major' | 'critical';
export type MatchGrade = 'excellent' | 'good' | 'acceptable' | 'poor' | 'mismatch';

export interface ParamDeviationRow {
  parameter: string;
  reference: string | number | boolean | null;
  generated: string | number | boolean | null;
  unit?: string;
  match: number;              // [0,1]
  deviation_pct?: number;
  severity: ParamSeverity;
  note?: string;
}

export interface WireEdmCalibrationReport {
  reference_filename: string;
  generated_filename: string;
  overall_match: number;      // [0,1]
  overall_grade: MatchGrade;
  deviations: ParamDeviationRow[];
  summary: string;
  production_ready: boolean;
}

export interface CalibrationHistoryPoint {
  timestamp: string;       // ISO-8601
  overall_match: number;   // [0,1]
  label?: string;
}

export interface WireEdmCalibrationPanelProps {
  report: WireEdmCalibrationReport | null;
  history?: CalibrationHistoryPoint[];
  isLoading?: boolean;
  onCalibrate?: () => void;
  onRecompare?: () => void;
  calibrateDisabled?: boolean;
}

// ─── Styling helpers ────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<ParamSeverity, { text: string; bg: string; border: string; chip: string }> = {
  match:    { text: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', chip: 'bg-emerald-400/30 text-emerald-100' },
  minor:    { text: 'text-sky-300',     bg: 'bg-sky-500/20',     border: 'border-sky-500/40',     chip: 'bg-sky-400/30 text-sky-100' },
  major:    { text: 'text-amber-300',   bg: 'bg-amber-500/20',   border: 'border-amber-500/40',   chip: 'bg-amber-400/30 text-amber-100' },
  critical: { text: 'text-red-300',     bg: 'bg-red-500/20',     border: 'border-red-500/40',     chip: 'bg-red-400/30 text-red-100' },
};

const GRADE_COLOR: Record<MatchGrade, string> = {
  excellent:   'text-emerald-200',
  good:        'text-emerald-300',
  acceptable:  'text-sky-300',
  poor:        'text-amber-300',
  mismatch:    'text-red-300',
};

function fmt(value: string | number | boolean | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    const body = Number.isInteger(value) ? String(value) : value.toFixed(3);
    return unit ? `${body} ${unit}` : body;
  }
  return unit ? `${value} ${unit}` : String(value);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function SeverityChip({ severity }: { severity: ParamSeverity }) {
  const s = SEVERITY_COLOR[severity];
  return (
    <span
      data-testid={`severity-chip-${severity}`}
      className={`prism-chip rounded-md border px-2 py-0.5 text-[11px] font-mono uppercase ${s.chip} ${s.border}`}
    >
      {severity}
    </span>
  );
}

function MatchBar({ match, severity }: { match: number; severity: ParamSeverity }) {
  const width = `${Math.max(0, Math.min(1, match)) * 100}%`;
  const s = SEVERITY_COLOR[severity];
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[rgba(2,6,23,0.78)]">
      <div
        data-testid="match-bar-fill"
        className={`prism-spectrum-fill h-full rounded-full ${s.bg}`}
        style={{ width }}
      />
    </div>
  );
}

function HeroGauge({ report }: { report: WireEdmCalibrationReport }) {
  const overallSeverity: ParamSeverity =
    report.overall_match >= 0.95 ? 'match'
      : report.overall_match >= 0.80 ? 'minor'
      : report.overall_match >= 0.50 ? 'major'
      : 'critical';
  const s = SEVERITY_COLOR[overallSeverity];
  return (
    <div className={`prism-glow-cyan rounded-xl border ${s.border} ${s.bg} p-4`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Overall Match</div>
          <div className="mt-1 text-4xl font-mono font-bold text-white" data-testid="overall-match">
            {pct(report.overall_match)}
          </div>
          <div className={`mt-1 text-sm font-semibold uppercase ${GRADE_COLOR[report.overall_grade]}`} data-testid="overall-grade">
            {report.overall_grade}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            data-testid="production-ready-chip"
            className={`prism-chip rounded-md border px-3 py-1 text-xs font-mono uppercase ${
              report.production_ready
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                : 'border-red-500/40 bg-red-500/20 text-red-200'
            }`}
          >
            {report.production_ready ? 'PRODUCTION READY' : 'NOT READY'}
          </div>
          <div className="text-[11px] text-slate-400">
            {report.reference_filename} → {report.generated_filename}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <MatchBar match={report.overall_match} severity={overallSeverity} />
      </div>
    </div>
  );
}

function DeviationTable({ deviations }: { deviations: ParamDeviationRow[] }) {
  if (deviations.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-[rgba(2,6,23,0.78)] p-4 text-sm text-slate-400">
        No deviations to display.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)]">
      <div className="border-b border-white/10 px-4 py-2 text-[11px] uppercase tracking-wider text-slate-400">
        Per-Parameter Deviations
      </div>
      <ul className="divide-y divide-white/5">
        {deviations.map((d) => (
          <li key={d.parameter} data-testid={`deviation-row-${d.parameter}`} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-slate-200">{d.parameter}</span>
                <SeverityChip severity={d.severity} />
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                <span>ref: <span className="text-slate-100">{fmt(d.reference, d.unit)}</span></span>
                <span>gen: <span className="text-slate-100">{fmt(d.generated, d.unit)}</span></span>
                {d.deviation_pct !== undefined && Number.isFinite(d.deviation_pct) && (
                  <span className={d.deviation_pct >= 0 ? 'text-amber-300' : 'text-sky-300'}>
                    Δ {d.deviation_pct.toFixed(1)}%
                  </span>
                )}
                <span className="w-16 text-right text-white">{pct(d.match)}</span>
              </div>
            </div>
            <MatchBar match={d.match} severity={d.severity} />
            {d.note && (
              <div className="text-[11px] text-slate-400">{d.note}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistorySparkline({ history }: { history: CalibrationHistoryPoint[] }) {
  if (history.length === 0) return null;
  const max = 1;
  const min = 0;
  const step = 100 / Math.max(history.length - 1, 1);
  const points = history.map((pt, i) => {
    const y = 40 - ((pt.overall_match - min) / (max - min)) * 36;
    return `${(i * step).toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const latest = history[history.length - 1];
  const prev = history.length >= 2 ? history[history.length - 2] : latest;
  const trend = latest.overall_match - prev.overall_match;
  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-slate-400">
          Calibration History ({history.length} samples)
        </div>
        <div
          data-testid="history-trend"
          className={trend >= 0 ? 'text-emerald-300 text-xs' : 'text-red-300 text-xs'}
        >
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend * 100).toFixed(1)}%
        </div>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-16 w-full">
        <polyline
          data-testid="history-polyline"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-cyan-300"
          points={points}
        />
      </svg>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function WireEdmCalibrationPanel({
  report,
  history = [],
  isLoading = false,
  onCalibrate,
  onRecompare,
  calibrateDisabled,
}: WireEdmCalibrationPanelProps): ReactNode {
  if (isLoading) {
    return (
      <div
        data-testid="calibration-panel-loading"
        className="prism-glow-cyan rounded-xl border border-cyan-500/30 bg-[rgba(2,6,23,0.78)] p-6 text-sm text-slate-300"
      >
        <div className="prism-led-sweep h-1 w-full rounded-full bg-cyan-500/30" />
        <div className="mt-3">Loading calibration report…</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div
        data-testid="calibration-panel-empty"
        className="rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-6 text-center text-sm text-slate-400"
      >
        <div className="font-mono uppercase tracking-wider text-slate-500">No calibration run</div>
        <div className="mt-2">Upload a reference program and a generated program to begin.</div>
      </div>
    );
  }

  return (
    <div
      data-testid="calibration-panel"
      className="flex flex-col gap-4"
    >
      <HeroGauge report={report} />
      <DeviationTable deviations={report.deviations} />
      {history.length > 0 && <HistorySparkline history={history} />}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400">{report.summary}</div>
        <div className="flex items-center gap-2">
          {onRecompare && (
            <button
              data-testid="recompare-button"
              type="button"
              onClick={onRecompare}
              className="rounded-md border border-white/10 bg-[rgba(2,6,23,0.78)] px-3 py-1.5 text-xs font-mono uppercase text-slate-200 hover:border-cyan-500/40"
            >
              Re-compare
            </button>
          )}
          {onCalibrate && (
            <button
              data-testid="calibrate-button"
              type="button"
              disabled={calibrateDisabled ?? false}
              onClick={onCalibrate}
              className={`rounded-md border px-3 py-1.5 text-xs font-mono uppercase ${
                calibrateDisabled
                  ? 'border-white/10 bg-[rgba(2,6,23,0.5)] text-slate-500 cursor-not-allowed'
                  : 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 prism-glow-cyan'
              }`}
            >
              Calibrate from Program
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
