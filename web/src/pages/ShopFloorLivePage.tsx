import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────
   Shop Floor Live — Real-time job tracker, labor sessions, travelers
   Design: PRISM dark theme with glow borders + LED sweep spectrum
   ULT-MS1 — matches CalculatorPage design language
   ───────────────────────────────────────────────────────────────────── */

// ── Types ──────────────────────────────────────────────────────────
interface ShopJob {
  id: string;
  customer: string;
  part_number: string;
  part_name?: string;
  status: string;
  quantity: number;
  progress: { percent_complete: number; parts_complete: number; parts_total: number };
  schedule: { due_date: string };
}

interface LaborSession {
  id: string;
  employee_id: string;
  job_id: string;
  labor_type: string;
  status: string;
  start_time: string;
  machine_id?: string;
  good_parts?: number;
}

interface ShopSnapshot {
  active_jobs: number;
  jobs_by_status: Record<string, number>;
  active_labor_sessions: number;
}

// ── Status helpers ─────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  ordered: 'prism-glow-cyan',
  scheduled: 'prism-glow-violet',
  in_progress: 'prism-glow-emerald',
  on_hold: 'prism-glow-amber',
  qc_pending: 'prism-glow-amber',
  qc_passed: 'prism-glow-emerald',
  qc_failed: 'prism-glow-red',
  complete: 'prism-glow-emerald',
  shipped: 'prism-glow-cyan',
};

const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
  ordered: { bg: 'bg-cyan-500/20 border-cyan-400/30', text: 'text-cyan-300' },
  scheduled: { bg: 'bg-violet-500/20 border-violet-400/30', text: 'text-violet-300' },
  in_progress: { bg: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-300' },
  on_hold: { bg: 'bg-amber-500/20 border-amber-400/30', text: 'text-amber-300' },
  qc_pending: { bg: 'bg-amber-500/20 border-amber-400/30', text: 'text-amber-300' },
  qc_failed: { bg: 'bg-red-500/20 border-red-400/30', text: 'text-red-300' },
  complete: { bg: 'bg-emerald-500/20 border-emerald-400/30', text: 'text-emerald-300' },
  shipped: { bg: 'bg-cyan-500/20 border-cyan-400/30', text: 'text-cyan-300' },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIP[status] ?? { bg: 'bg-slate-500/20 border-slate-400/30', text: 'text-slate-300' };
  return (
    <span className={`prism-chip border ${s.bg} ${s.text}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Progress bar with prism spectrum ───────────────────────────────
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-2.5 rounded-full overflow-hidden border border-white/10 bg-[rgba(2,6,23,0.78)]"
         style={{ boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.08), inset 0 2px 8px rgba(0,0,0,0.35)' }}>
      <div className="prism-spectrum-fill absolute inset-y-0 left-0 rounded-full transition-all duration-300"
           style={{ width: `${Math.max(percent, 2)}%` }} />
      <div className="prism-led-sweep" />
    </div>
  );
}

// ── Glow Card ──────────────────────────────────────────────────────
function GlowCard({ color = 'cyan', children, className = '' }: {
  color?: 'cyan' | 'amber' | 'emerald' | 'red' | 'violet';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border transition-all duration-200 p-4 prism-glow-${color} ${className}`}>
      {children}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function ShopFloorLivePage() {
  const [snapshot, setSnapshot] = useState<ShopSnapshot | null>(null);
  const [jobs, setJobs] = useState<ShopJob[]>([]);
  const [activeSessions, setActiveSessions] = useState<LaborSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [snapRes, jobsRes] = await Promise.all([
          fetch('/api/shop/snapshot').then(r => r.json()).catch(() => null),
          fetch('/api/shop/jobs?limit=20').then(r => r.json()).catch(() => ({ jobs: [] })),
        ]);
        if (snapRes) setSnapshot(snapRes);
        if (jobsRes?.jobs) setJobs(jobsRes.jobs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060e1c] via-[#0a1628] to-[#060e1c] text-slate-100 p-6">
      {/* ── Header with prism spectrum border ── */}
      <div className="prism-shell mb-8">
        <div className="prism-shell-card px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-wide text-white"
                  style={{ textShadow: '0 0 10px rgba(56,189,248,0.18)' }}>
                Shop Floor Live
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Real-time job tracking + labor sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300">LIVE</span>
              </div>
              <button className="prism-action-btn">
                + New Job
              </button>
            </div>
          </div>

          {/* ── KPI strip ── */}
          {snapshot && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: 'Active Jobs', value: snapshot.active_jobs, color: 'text-cyan-300' },
                { label: 'In Progress', value: snapshot.jobs_by_status['in_progress'] ?? 0, color: 'text-emerald-300' },
                { label: 'On Hold', value: snapshot.jobs_by_status['on_hold'] ?? 0, color: 'text-amber-300' },
                { label: 'QC Pending', value: snapshot.jobs_by_status['qc_pending'] ?? 0, color: 'text-violet-300' },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
                  <div className={`text-lg font-black ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{kpi.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Active Jobs Column ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400 mb-3">
              Active Jobs
            </h2>
            {jobs.length === 0 ? (
              <GlowCard color="cyan">
                <p className="text-sm text-slate-400 text-center py-6">No active jobs. Click "+ New Job" to start.</p>
              </GlowCard>
            ) : (
              jobs.map(job => (
                <GlowCard key={job.id} color={job.status === 'on_hold' ? 'amber' : job.status === 'qc_failed' ? 'red' : 'cyan'}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{job.id}</span>
                        <StatusChip status={job.status} />
                      </div>
                      <div className="font-bold text-white truncate">
                        {job.part_number}{job.part_name ? ` — ${job.part_name}` : ''}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{job.customer}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-white">{job.progress.parts_complete}/{job.progress.parts_total}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">parts</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percent={job.progress.percent_complete} />
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{job.progress.percent_complete}% complete</span>
                      <span>Due: {new Date(job.schedule.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </GlowCard>
              ))
            )}
          </div>

          {/* ── Sidebar: Labor Sessions + Quick Actions ── */}
          <div className="space-y-6">
            {/* Active Labor Sessions */}
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400 mb-3">
                Active Labor
              </h2>
              {activeSessions.length === 0 ? (
                <GlowCard color="emerald">
                  <p className="text-sm text-slate-400 text-center py-4">No active sessions</p>
                </GlowCard>
              ) : (
                activeSessions.map(s => (
                  <GlowCard key={s.id} color="emerald" className="mb-3">
                    <div className="text-xs font-mono text-slate-500">{s.id}</div>
                    <div className="font-semibold text-white mt-1">{s.labor_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-400">Job: {s.job_id} | Machine: {s.machine_id ?? '—'}</div>
                  </GlowCard>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400 mb-3">
                Quick Actions
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Clock In', icon: '>', color: 'emerald' as const },
                  { label: 'Start Job Timer', icon: '>', color: 'cyan' as const },
                  { label: 'Record Parts', icon: '>', color: 'violet' as const },
                  { label: 'Quality Check', icon: '>', color: 'amber' as const },
                ].map(action => (
                  <button
                    key={action.label}
                    className={`w-full rounded-xl border transition-all duration-200 p-3 text-left prism-glow-${action.color} hover:scale-[1.01]`}
                  >
                    <span className="text-sm font-bold text-white">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shop Floor Rooms */}
            <GlowCard color="violet">
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-violet-300 mb-2">Live Rooms</h3>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>shop:all — broadcast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>job:* — per-job updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span>dept:* — department activity</span>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      )}
    </div>
  );
}
