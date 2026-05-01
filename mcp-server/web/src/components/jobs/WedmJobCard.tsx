/**
 * WEDM-ERP-MS0 / U-WEDM-ERP09 — WedmJobCard
 *
 * Shop-floor dispatch card for a WEDM job. Shows high-level job identity,
 * pass progress (e.g. "Skim 2/3"), current status badge, estimated-vs-actual
 * wire consumption, and the violet glow that distinguishes non-traditional
 * machining from milling/turning on the dispatch board.
 *
 * Renders read-only. Click handlers are delegated to the parent page so
 * this component stays mountable without coupling to routing.
 */
import type { ReactNode } from 'react';

export type WedmJobStatus =
  | 'scheduled'
  | 'threading'
  | 'rough_cutting'
  | 'skim_cutting'
  | 'qc'
  | 'complete'
  | 'on_hold'
  | 'cancelled';

export interface WedmJobCardData {
  job_id: string;
  part_number: string;
  part_name?: string | null;
  customer: string;
  material: string | null;
  thickness_mm: number | null;
  priority: 'standard' | 'rush' | 'emergency' | string;
  status: WedmJobStatus;
  quantity: number;
  due_date: string | null;
  machine_id: string | null;
  /** Current pass executing (1-based). Null when job hasn't started cutting. */
  current_pass?: number | null;
  /** Total passes planned. */
  total_passes?: number | null;
  /** Estimated wire consumption for the full job (m). */
  wire_m_estimated?: number | null;
  /** Actual wire consumed so far (m). */
  wire_m_actual?: number | null;
  /** Estimated cycle time (min). */
  time_min_estimated?: number | null;
  /** Actual time elapsed (min). */
  time_min_actual?: number | null;
  /** Open break count — surfaced as a warning chip when > 0. */
  break_count?: number | null;
  /** Safety warnings attached by the safety envelope hook (U-P2PFS21). */
  safety_warnings?: string[];
}

export interface WedmJobCardProps {
  job: WedmJobCardData;
  /** Callback when the card is clicked — parent routes to /wire-edm/:job_id. */
  onView?: (jobId: string) => void;
  /** Callback when "Complete" chip is clicked — parent opens WedmCompletionModal. */
  onComplete?: (jobId: string) => void;
  /** Compact variant for dense dispatch boards. */
  compact?: boolean;
}

const STATUS_META: Record<WedmJobStatus, { label: string; chipClass: string }> = {
  scheduled:     { label: 'Scheduled',     chipClass: 'bg-violet-500/15 text-violet-200 border-violet-400/30' },
  threading:     { label: 'Threading',     chipClass: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30' },
  rough_cutting: { label: 'Rough cut',     chipClass: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
  skim_cutting:  { label: 'Skim pass',     chipClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' },
  qc:            { label: 'QC',            chipClass: 'bg-sky-500/15 text-sky-200 border-sky-400/30' },
  complete:      { label: 'Complete',      chipClass: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/50' },
  on_hold:       { label: 'On hold',       chipClass: 'bg-amber-600/25 text-amber-100 border-amber-500/40' },
  cancelled:     { label: 'Cancelled',     chipClass: 'bg-red-500/15 text-red-200 border-red-400/30' },
};

const PRIORITY_META: Record<string, { label: string; chipClass: string }> = {
  emergency: { label: 'Emergency', chipClass: 'bg-red-600/30 text-red-100 border-red-500/60 prism-glow-red' },
  rush:      { label: 'Rush',      chipClass: 'bg-amber-500/25 text-amber-100 border-amber-400/50' },
  standard:  { label: 'Standard',  chipClass: 'bg-slate-600/20 text-slate-300 border-white/10' },
};

function priorityMeta(p: string) {
  return PRIORITY_META[p] ?? PRIORITY_META.standard;
}

function fmtMinutes(m: number | null | undefined): string {
  if (m === null || m === undefined) return '—';
  if (m < 60) return `${m.toFixed(0)}m`;
  const h = Math.floor(m / 60);
  const rem = Math.round(m % 60);
  return `${h}h ${rem}m`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function variance(actual: number | null | undefined, estimate: number | null | undefined): {
  pct: number | null;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
} {
  if (actual === null || actual === undefined || estimate === null || estimate === undefined || estimate === 0) {
    return { pct: null, tone: 'neutral' };
  }
  const pct = ((actual - estimate) / estimate) * 100;
  let tone: 'good' | 'warn' | 'bad' | 'neutral' = 'neutral';
  if (pct <= 5) tone = 'good';
  else if (pct <= 15) tone = 'warn';
  else tone = 'bad';
  return { pct, tone };
}

const TONE_CLASS: Record<'good' | 'warn' | 'bad' | 'neutral', string> = {
  good:    'text-emerald-300',
  warn:    'text-amber-300',
  bad:     'text-red-300',
  neutral: 'text-slate-400',
};

export function WedmJobCard({ job, onView, onComplete, compact }: WedmJobCardProps) {
  const statusMeta = STATUS_META[job.status];
  const prMeta = priorityMeta(job.priority);
  const isActiveCut =
    job.status === 'rough_cutting' || job.status === 'skim_cutting' || job.status === 'qc';
  const passProgress =
    job.current_pass !== null && job.current_pass !== undefined &&
    job.total_passes !== null && job.total_passes !== undefined &&
    job.total_passes > 0
      ? `${job.current_pass}/${job.total_passes}`
      : null;
  const progressPct =
    job.current_pass && job.total_passes && job.total_passes > 0
      ? Math.min(100, (job.current_pass / job.total_passes) * 100)
      : 0;

  const wireVar = variance(job.wire_m_actual, job.wire_m_estimated);
  const timeVar = variance(job.time_min_actual, job.time_min_estimated);

  const canComplete = job.status !== 'complete' && job.status !== 'cancelled';

  return (
    <article
      data-testid={`wedm-job-card-${job.job_id}`}
      className={`group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4 text-slate-100 transition-shadow hover:shadow-[0_0_40px_-20px_rgba(167,139,250,0.7)] ${
        compact ? 'min-w-[240px]' : 'min-w-[280px]'
      } prism-glow-violet`}
      onClick={onView ? () => onView(job.job_id) : undefined}
      role={onView ? 'button' : 'article'}
      tabIndex={onView ? 0 : undefined}
      onKeyDown={(e) => {
        if (onView && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onView(job.job_id);
        }
      }}
    >
      {/* Top row: part + chips */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="prism-chip text-[0.6rem] uppercase tracking-wider">WEDM</span>
            <span className="truncate font-mono text-xs text-slate-400" data-testid="wedm-card-customer">
              {job.customer}
            </span>
          </div>
          <h4 className="mt-1 truncate text-sm font-semibold text-slate-100" data-testid="wedm-card-part">
            {job.part_name ?? job.part_number}
          </h4>
          <p className="mt-0.5 truncate font-mono text-[0.7rem] text-slate-400">
            {job.part_number} · qty {job.quantity}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Chip className={prMeta.chipClass} testId="wedm-card-priority">{prMeta.label}</Chip>
          <Chip className={statusMeta.chipClass} testId="wedm-card-status">{statusMeta.label}</Chip>
        </div>
      </header>

      {/* Material / thickness / due / machine */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[0.7rem] text-slate-400">
        <div>
          <dt className="text-slate-500">Material</dt>
          <dd className="text-slate-200" data-testid="wedm-card-material">{job.material ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Thickness</dt>
          <dd className="text-slate-200">{job.thickness_mm ? `${job.thickness_mm}mm` : '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Machine</dt>
          <dd className="truncate text-slate-200">{job.machine_id ?? 'unassigned'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Due</dt>
          <dd className="text-slate-200">{fmtDate(job.due_date)}</dd>
        </div>
      </dl>

      {/* Pass progress — only when actively cutting */}
      {isActiveCut && passProgress && (
        <div className="space-y-1" data-testid="wedm-card-pass-progress">
          <div className="flex justify-between text-[0.65rem] uppercase tracking-wider text-slate-400">
            <span>Pass progress</span>
            <span className="font-mono text-slate-200">{passProgress}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="prism-spectrum-fill h-full rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
              data-testid="wedm-card-progress-bar"
            />
          </div>
        </div>
      )}

      {/* Estimate vs actual — wire + time side by side */}
      {(timeVar.pct !== null || wireVar.pct !== null) && (
        <div className="grid grid-cols-2 gap-2" data-testid="wedm-card-variance">
          <MetricPill
            label="Time"
            value={fmtMinutes(job.time_min_actual)}
            estimate={fmtMinutes(job.time_min_estimated)}
            pct={timeVar.pct}
            tone={timeVar.tone}
            testId="wedm-card-time-variance"
          />
          <MetricPill
            label="Wire"
            value={job.wire_m_actual !== null && job.wire_m_actual !== undefined ? `${job.wire_m_actual.toFixed(0)}m` : '—'}
            estimate={job.wire_m_estimated ? `${job.wire_m_estimated.toFixed(0)}m` : '—'}
            pct={wireVar.pct}
            tone={wireVar.tone}
            testId="wedm-card-wire-variance"
          />
        </div>
      )}

      {/* Warning chips */}
      {((job.break_count ?? 0) > 0 || (job.safety_warnings && job.safety_warnings.length > 0)) && (
        <div className="flex flex-wrap gap-1" data-testid="wedm-card-warnings">
          {(job.break_count ?? 0) > 0 && (
            <span className="prism-chip bg-amber-500/20 text-amber-100 border-amber-400/40 text-[0.6rem]">
              {job.break_count} wire breaks
            </span>
          )}
          {job.safety_warnings?.map((w, idx) => (
            <span
              key={idx}
              className="prism-chip bg-red-500/20 text-red-100 border-red-400/40 text-[0.6rem]"
              title={w}
            >
              Safety flag
            </span>
          ))}
        </div>
      )}

      {/* Complete action */}
      {canComplete && onComplete && (
        <footer className="mt-1 border-t border-white/5 pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(job.job_id);
            }}
            className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20"
            data-testid="wedm-card-complete-button"
          >
            Record completion →
          </button>
        </footer>
      )}
    </article>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Chip({ className, children, testId }: { className: string; children: ReactNode; testId?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${className}`}
      data-testid={testId}
    >
      {children}
    </span>
  );
}

function MetricPill({
  label,
  value,
  estimate,
  pct,
  tone,
  testId,
}: {
  label: string;
  value: string;
  estimate: string;
  pct: number | null;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  testId?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 px-2 py-1.5" data-testid={testId}>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.6rem] uppercase tracking-wider text-slate-500">{label}</span>
        {pct !== null && (
          <span className={`font-mono text-[0.65rem] ${TONE_CLASS[tone]}`}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-0.5 font-mono text-xs text-slate-100">{value}</div>
      <div className="font-mono text-[0.6rem] text-slate-500">est {estimate}</div>
    </div>
  );
}
