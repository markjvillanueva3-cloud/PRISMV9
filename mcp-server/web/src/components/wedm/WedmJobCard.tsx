/**
 * WedmJobCard — U-WEDM-ERP09
 *
 * Status-badged job card for WEDM jobs on JobsPage. Displays the 10-stage
 * WEDM department flow (intake → cad → cam → setup → rough → skim1/2/3 → qc
 * → ship) as colored progress pips, plus quote reference vs actual delta if
 * complete. Fetches job via wedmErpApi.jobGet() when jobId is passed.
 */
import { useEffect, useMemo, useState } from 'react';
import { wedmErpApi } from '../../api/wedmErp';

export interface WedmJobCardJob {
  jobId: string;
  jobName?: string;
  customer?: string;
  partNumber?: string;
  quantity?: number;
  material?: string;
  priority?: 'standard' | 'rush' | 'emergency';
  dueDate?: string;
  jobType?: string;
  departments?: Array<{
    id: string;
    label: string;
    status: 'pending' | 'current' | 'complete';
    owner?: string;
  }>;
  operations?: Array<{
    id: string;
    label: string;
    department: string;
    estimatedMinutes?: number;
  }>;
  programMeta?: {
    controller?: string;
    estimated_time_min?: number;
    predicted_ra_um?: number;
    wire_consumption_m?: number;
  };
  quoteRef?: {
    quote_number?: string;
    unit_price?: number;
    estimated_cost_usd?: number;
  };
  stickerLabel?: string;
}

export interface WedmJobCardProps {
  /** Pre-loaded job packet (skip API fetch) */
  job?: WedmJobCardJob;
  /** Job ID to fetch if `job` not provided */
  jobId?: string;
  /** Optional click handler — e.g., open detail drawer or completion modal */
  onSelect?: (job: WedmJobCardJob) => void;
  /** Optional action button (e.g., "Complete") */
  action?: { label: string; onClick: (job: WedmJobCardJob) => void; disabled?: boolean };
  /** Compact mode: hide department pips + metadata row */
  compact?: boolean;
}

const DEPT_ORDER = [
  'intake',
  'cad',
  'cam',
  'setup',
  'rough',
  'skim1',
  'skim2',
  'skim3',
  'qc',
  'ship',
];

const DEPT_LABEL: Record<string, string> = {
  intake: 'IN',
  cad: 'CAD',
  cam: 'CAM',
  setup: 'SU',
  rough: 'R',
  skim1: 'S1',
  skim2: 'S2',
  skim3: 'S3',
  qc: 'QC',
  ship: 'SH',
};

function priorityChip(priority?: string) {
  if (priority === 'emergency') return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (priority === 'rush') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
}

function deptPipClass(status: 'pending' | 'current' | 'complete') {
  if (status === 'complete') return 'bg-emerald-500/80 border-emerald-400 text-slate-950';
  if (status === 'current') return 'bg-amber-500/80 border-amber-300 text-slate-950 animate-pulse';
  return 'bg-slate-800/60 border-slate-700 text-slate-500';
}

export function WedmJobCard({ job: incoming, jobId, onSelect, action, compact }: WedmJobCardProps) {
  const [job, setJob] = useState<WedmJobCardJob | null>(incoming ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (incoming) {
      setJob(incoming);
      return;
    }
    if (!jobId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    wedmErpApi
      .jobGet(jobId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok && r.data?.job) {
          setJob(r.data.job as unknown as WedmJobCardJob);
        } else {
          setError(r.error ?? 'Job not found');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [incoming, jobId]);

  const depts = useMemo(() => {
    if (!job?.departments) return [] as WedmJobCardJob['departments'];
    const byId = new Map(job.departments.map((d) => [d.id, d]));
    return DEPT_ORDER.map((id) => byId.get(id)).filter(Boolean) as NonNullable<WedmJobCardJob['departments']>;
  }, [job]);

  const activeDept = useMemo(() => {
    if (!depts) return null;
    return depts.find((d) => d.status === 'current') ?? null;
  }, [depts]);

  const progressPct = useMemo(() => {
    if (!depts || depts.length === 0) return 0;
    const done = depts.filter((d) => d.status === 'complete').length;
    return Math.round((done / depts.length) * 100);
  }, [depts]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-xs text-slate-400">
        Loading WEDM job {jobId}…
      </div>
    );
  }
  if (error || !job) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
        {error ?? 'No job data'}
      </div>
    );
  }

  const estimatedHrs =
    job.programMeta?.estimated_time_min != null ? job.programMeta.estimated_time_min / 60 : null;

  return (
    <article
      className="prism-glow-cyan group relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-4 transition hover:border-cyan-400/40"
      onClick={() => onSelect?.(job)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* Header row */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-100">
              {job.jobName ?? job.partNumber ?? job.jobId}
            </h4>
            <span className="prism-chip rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-300">
              WEDM
            </span>
            {job.priority && job.priority !== 'standard' && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${priorityChip(job.priority)}`}
              >
                {job.priority}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {job.customer ?? '—'} · {job.partNumber ?? '—'} · qty {job.quantity ?? 1}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Job</span>
          <div className="font-mono text-[11px] text-slate-300">{job.jobId}</div>
        </div>
      </header>

      {/* Department flow pips */}
      {!compact && depts && depts.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1">
            {depts.map((d) => (
              <span
                key={d.id}
                title={`${d.label} — ${d.status}`}
                className={`flex h-5 min-w-[22px] items-center justify-center rounded border px-1 text-[9px] font-semibold uppercase ${deptPipClass(d.status)}`}
              >
                {DEPT_LABEL[d.id] ?? d.id.slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>
              {activeDept ? <>Now: <span className="text-amber-300">{activeDept.label}</span></> : 'Idle'}
            </span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800/60">
            <div
              className="prism-spectrum-fill h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata + quote summary */}
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400 md:grid-cols-4">
          <Meta label="Material" value={job.material ?? '—'} />
          <Meta label="Controller" value={job.programMeta?.controller ?? '—'} />
          <Meta label="Est. time" value={estimatedHrs != null ? `${estimatedHrs.toFixed(2)} hr` : '—'} />
          <Meta label="Ra" value={job.programMeta?.predicted_ra_um != null ? `${job.programMeta.predicted_ra_um.toFixed(2)}µm` : '—'} />
          <Meta label="Wire" value={job.programMeta?.wire_consumption_m != null ? `${job.programMeta.wire_consumption_m.toFixed(0)}m` : '—'} />
          <Meta label="Due" value={job.dueDate || '—'} />
          {job.quoteRef?.quote_number && (
            <Meta label="Quote" value={job.quoteRef.quote_number} />
          )}
          {job.quoteRef?.estimated_cost_usd != null && (
            <Meta label="Quoted" value={`$${job.quoteRef.estimated_cost_usd.toFixed(2)}`} />
          )}
        </div>
      )}

      {/* Action */}
      {action && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={action.disabled}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(job);
            }}
            className="rounded bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {action.label}
          </button>
        </div>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="truncate text-slate-200 tabular-nums">{value}</span>
    </div>
  );
}
