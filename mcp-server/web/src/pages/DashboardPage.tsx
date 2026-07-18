import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppwDashboardCopilot } from '../components/puoa/AppwDashboardCopilot';
import { SafetyBadge } from '../components/SafetyBadge';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { useWebSocket, type WSMessage } from '../hooks/useWebSocket';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import {
  loadDashboardSnapshotWithFallback,
  type DashboardSnapshotSource,
  type JobProgress,
  type MachineStatus,
  type OEEData,
  type ToolLife,
} from '../api/dashboard';
import type {
  HotJobRecord,
  LearningImprovementRecord,
  LearningSignalCaptureRecord,
  PlatformLearningSnapshot,
  ProgramReleaseCatalog,
} from '../features/operating-system/contracts';
import { buildDashboardHotReleaseSeed } from '../utils/dashboardHotReleaseSeed';
import { buildWorkflowPath } from '../utils/workflowRouteContext';
import {
  NotificationBell,
  NotificationPanel,
  ToastContainer,
  useNotifications,
} from '../components/NotificationCenter';

const STATUS_STYLES: Record<
  MachineStatus['status'],
  { pill: string; dot: string; panel: string; label: string }
> = {
  running: {
    pill: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    dot: 'bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.65)]',
    panel: 'border-emerald-400/18 bg-emerald-400/[0.035]',
    label: 'Cycle active',
  },
  idle: {
    pill: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    dot: 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]',
    panel: 'border-amber-300/16 bg-amber-300/[0.03]',
    label: 'Standing by',
  },
  alarm: {
    pill: 'border-rose-400/30 bg-rose-500/12 text-rose-100',
    dot: 'bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.65)]',
    panel: 'border-rose-400/22 bg-rose-500/[0.05]',
    label: 'Operator attention',
  },
  offline: {
    pill: 'border-slate-400/18 bg-slate-400/8 text-slate-200',
    dot: 'bg-slate-400 shadow-[0_0_18px_rgba(148,163,184,0.35)]',
    panel: 'border-slate-400/14 bg-slate-400/[0.025]',
    label: 'Unavailable',
  },
  setup: {
    pill: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    dot: 'bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.5)]',
    panel: 'border-sky-300/18 bg-sky-400/[0.035]',
    label: 'Setup in progress',
  },
};

const WEAR_STYLES: Record<ToolLife['wear_rate'], string> = {
  normal: 'bg-emerald-400',
  elevated: 'bg-amber-300',
  critical: 'bg-rose-400',
};

function formatCompactTime(value: Date): string {
  return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function formatRefreshLabel(value?: number | null) {
  if (!value) {
    return 'Not refreshed yet';
  }

  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function SectionShell({
  title,
  eyebrow,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/65">
              {eyebrow}
            </div>
          ) : null}
          <div className="text-xl font-semibold text-slate-50">{title}</div>
          {subtitle ? <div className="max-w-2xl text-sm text-slate-400">{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  title,
  value,
  subtitle,
  accent = 'from-cyan-400/30 via-cyan-300/10 to-transparent',
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</div>
        <div className="mt-3 text-3xl font-semibold text-slate-50">{value}</div>
        {subtitle ? <div className="mt-2 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function MachineCard({ machine }: { machine: MachineStatus }) {
  const styles = STATUS_STYLES[machine.status];
  const live = machine.status === 'running';

  return (
    <article
      className={`rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/22 ${styles.panel}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-slate-50">{machine.name}</div>
          <div className="text-sm text-slate-400">{machine.brand} · {styles.label}</div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] ${styles.pill}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
          {machine.status.toUpperCase()}
        </span>
      </div>

      {live ? (
        <div className="grid grid-cols-2 gap-3">
          <MetricChip label="RPM" value={machine.spindle_rpm.toLocaleString()} />
          <MetricChip label="Feed" value={`${machine.feed_rate} mm/min`} />
          <MetricChip label="Program" value={machine.current_program} />
          <MetricChip label="Uptime" value={`${machine.uptime_pct}%`} />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm text-slate-400">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Machine note
          </div>
          {machine.status === 'setup' && 'Fixture, offsets, and tool package are still being staged.'}
          {machine.status === 'idle' && 'Queued for the next cycle and waiting on dispatch or operator approval.'}
          {machine.status === 'alarm' && `Alarm on ${machine.current_program || 'current program'} requires acknowledgement before restart.`}
          {machine.status === 'offline' && 'No live telemetry is coming in from this machine right now.'}
        </div>
      )}
    </article>
  );
}

function MetricChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function JobRow({ job }: { job: JobProgress }) {
  const progressTone =
    job.progress_pct >= 80
      ? 'from-emerald-400 to-emerald-300'
      : job.progress_pct >= 50
        ? 'from-sky-400 to-cyan-300'
        : 'from-amber-300 to-orange-300';

  return (
    <article className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-50">{job.job_number}</div>
          <div className="text-sm text-slate-400">{job.part_name}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
          ETA: {job.eta_minutes}min
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressTone} transition-[width] duration-500`}
            style={{ width: `${job.progress_pct}%` }}
          />
        </div>
        <span className="min-w-[42px] text-right text-sm font-semibold text-slate-100">
          {job.progress_pct}%
        </span>
      </div>

      <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
        <div>{job.current_op}</div>
        <div>{job.machine}</div>
        <div className="text-right text-slate-300">{job.completed}/{job.total} parts</div>
      </div>
    </article>
  );
}

function ToolLifeRow({ tool }: { tool: ToolLife }) {
  const bar = WEAR_STYLES[tool.wear_rate];

  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-medium text-slate-100">{tool.tool_name}</div>
          <div className="text-sm text-slate-400">{tool.machine} · {tool.estimated_minutes}min remaining</div>
        </div>
        <div className="text-sm font-semibold text-slate-200">{tool.life_remaining_pct}%</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${tool.life_remaining_pct}%` }} />
      </div>
    </div>
  );
}

function MachineUptimeChart({ machines }: { machines: MachineStatus[] }) {
  const data = machines.map((m) => ({
    name: m.name.replace(/^(Haas|DMG MORI|Mazak|Okuma|Doosan)\s+/, ''),
    uptime: m.uptime_pct,
    status: m.status,
  }));
  const barColor = (status: MachineStatus['status']) =>
    status === 'running' ? '#4ade80' : status === 'alarm' ? '#fb7185' : status === 'setup' ? '#7dd3fc' : status === 'idle' ? '#fcd34d' : '#94a3b8';

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#e2e8f0' }}
          formatter={(value: number) => [`${value}%`, 'Uptime']}
        />
        <Bar dataKey="uptime" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.status)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function OEEGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 85
      ? '#4ade80'
      : pct >= 70
        ? '#67e8f9'
        : pct >= 60
          ? '#fcd34d'
          : '#fb7185';
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - value * circumference;

  return (
    <div className="rounded-[20px] border border-white/8 bg-black/15 px-3 py-4 text-center">
      <svg width="92" height="92" viewBox="0 0 92 92" className="mx-auto">
        <circle cx="46" cy="46" r="36" fill="none" stroke="rgba(51,65,85,0.8)" strokeWidth="8" />
        <circle
          cx="46"
          cy="46"
          r="36"
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 46 46)"
        />
        <text x="46" y="50" textAnchor="middle" fontSize="18" fontWeight="700" fill="#f8fafc">
          {pct}%
        </text>
      </svg>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
    </div>
  );
}

function LearningSignalRow({ record }: { record: LearningSignalCaptureRecord }) {
  const statusStyles: Record<LearningSignalCaptureRecord['status'], string> = {
    live: 'border-emerald-400/22 bg-emerald-400/10 text-emerald-100',
    warming: 'border-amber-300/22 bg-amber-300/10 text-amber-100',
    planned: 'border-sky-300/22 bg-sky-300/10 text-sky-100',
  };

  return (
    <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-100">{record.label}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">{record.detail}</div>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusStyles[record.status]}`}
        >
          {record.status}
        </span>
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {record.scope} · {record.coverage}
      </div>
    </div>
  );
}

function LearningImprovementPanel({
  title,
  items,
}: {
  title: string;
  items: LearningImprovementRecord[];
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-100">{item.title}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {item.source}
              </div>
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</div>
            <div className="mt-3 text-sm font-medium text-cyan-100">{item.impact}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HotPriorityCard({
  hotJob,
  jobsPath,
  releasePath,
  messagesPath,
}: {
  hotJob: HotJobRecord;
  jobsPath: string;
  releasePath: string;
  messagesPath: string;
}) {
  return (
    <article className="rounded-[24px] border border-rose-300/16 bg-rose-300/[0.08] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-100/75">
            Shop hot
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-50">{hotJob.partNumber}</div>
          <div className="mt-1 text-sm text-rose-100/85">
            {hotJob.jobId} · {hotJob.customer}
          </div>
        </div>
        <span className="rounded-full border border-rose-300/24 bg-rose-300/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-50">
          {hotJob.dueDate === 'Unscheduled' ? 'Hot' : `Due ${hotJob.dueDate}`}
        </span>
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-200">{hotJob.note}</div>
      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
        Set by {hotJob.setBy}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link
          to={jobsPath}
          className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-slate-50 transition hover:border-white/18 hover:bg-white/[0.08]"
        >
          Open Jobs desk
        </Link>
        <Link
          to={releasePath}
          className="rounded-[18px] border border-cyan-300/20 bg-cyan-300/[0.1] px-3 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.15]"
        >
          Open Print to CNC
        </Link>
        <Link
          to={messagesPath}
          className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-slate-50 transition hover:border-white/18 hover:bg-white/[0.08]"
        >
          Open Messages
        </Link>
      </div>
    </article>
  );
}

function DashboardSourcePostureCard({
  label,
  detail,
  statusLabel,
  toneClass,
  metaLabel,
}: {
  label: string;
  detail: string;
  statusLabel: string;
  toneClass: string;
  metaLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{label}</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{metaLabel}</div>
    </div>
  );
}

export function DashboardPage() {
  const location = useLocation();
  const operatingSystem = useOperatingSystem();
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [jobs, setJobs] = useState<JobProgress[]>([]);
  const [tools, setTools] = useState<ToolLife[]>([]);
  const [oee, setOee] = useState<OEEData>({ availability: 0, performance: 0, quality: 0, oee: 0 });
  const [safetyScore, setSafetyScore] = useState(0.88);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [hotJobs, setHotJobs] = useState<HotJobRecord[]>([]);
  const [learningSnapshot, setLearningSnapshot] = useState<PlatformLearningSnapshot | null>(null);
  const [releaseCatalog, setReleaseCatalog] = useState<ProgramReleaseCatalog | null>(null);
  const [snapshotSource, setSnapshotSource] = useState<DashboardSnapshotSource>('demo');
  const [snapshotNote, setSnapshotNote] = useState('Connecting live machine, dispatch, tooling, and telemetry feeds.');
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotRefreshedAt, setSnapshotRefreshedAt] = useState<number | null>(null);
  const [learningRefreshedAt, setLearningRefreshedAt] = useState<number | null>(null);
  const [releaseRefreshedAt, setReleaseRefreshedAt] = useState<number | null>(null);
  const [hotJobsRefreshedAt, setHotJobsRefreshedAt] = useState<number | null>(null);
  const [snapshotIssue, setSnapshotIssue] = useState<string | null>(null);
  const [learningIssue, setLearningIssue] = useState<string | null>(null);
  const [releaseIssue, setReleaseIssue] = useState<string | null>(null);
  const [hotJobsIssue, setHotJobsIssue] = useState<string | null>(null);
  const {
    notifications,
    toasts,
    panelOpen,
    unreadCount,
    setPanelOpen,
    addNotification,
    dismissToast,
    markRead,
    clearAll,
  } = useNotifications();

  useEffect(() => {
    let active = true;

    loadDashboardSnapshotWithFallback()
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setMachines(snapshot.machines);
        setJobs(snapshot.jobs);
        setTools(snapshot.tools);
        setOee(snapshot.oee);
        setSnapshotSource(snapshot.source);
        setSnapshotNote(snapshot.note);
        setLastUpdate(new Date());
        setSnapshotRefreshedAt(Date.now());
        setSnapshotIssue(null);
      })
      .catch((issue) => {
        if (!active) {
          return;
        }

        const message =
          issue instanceof Error ? issue.message : 'Dashboard snapshot could not be loaded.';
        setSnapshotIssue(message);
        setSnapshotSource('demo');
        setSnapshotNote('Dashboard snapshot unavailable. Waiting for a fresh telemetry hydrate.');
      })
      .finally(() => {
        if (active) {
          setSnapshotLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    operatingSystem
      .getPlatformLearningSnapshot()
      .then((snapshot) => {
        if (active) {
          setLearningSnapshot(snapshot);
          setLearningRefreshedAt(Date.now());
          setLearningIssue(null);
        }
      })
      .catch((issue) => {
        if (active) {
          setLearningSnapshot(null);
          setLearningIssue(issue instanceof Error ? issue.message : 'Learning fabric unavailable.');
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  useEffect(() => {
    let active = true;

    operatingSystem
      .getProgramReleaseCatalog()
      .then((catalog) => {
        if (active) {
          setReleaseCatalog(catalog);
          setReleaseRefreshedAt(Date.now());
          setReleaseIssue(null);
        }
      })
      .catch((issue) => {
        if (active) {
          setReleaseCatalog(null);
          setReleaseIssue(issue instanceof Error ? issue.message : 'Program release catalog unavailable.');
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  useEffect(() => {
    let active = true;

    operatingSystem
      .getHotJobs()
      .then((records) => {
        if (active) {
          setHotJobs(records);
          setHotJobsRefreshedAt(Date.now());
          setHotJobsIssue(null);
        }
      })
      .catch((issue) => {
        if (active) {
          setHotJobs([]);
          setHotJobsIssue(issue instanceof Error ? issue.message : 'Shop hot feed unavailable.');
        }
      });

    const unsubscribe = operatingSystem.subscribeHotJobs((records) => {
      if (active) {
        setHotJobs(records);
        setHotJobsRefreshedAt(Date.now());
        setHotJobsIssue(null);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [operatingSystem]);

  const onMessage = useCallback(
    (msg: WSMessage) => {
      setLastUpdate(new Date());
      switch (msg.type) {
        case 'machine:status':
          setMachines((prev) =>
            prev.map((machine) =>
              machine.id === msg.payload.id
                ? ({ ...machine, ...msg.payload } as MachineStatus)
                : machine,
            ),
          );
          if (msg.payload.status === 'alarm') {
            addNotification(
              'critical',
              'Machine Alarm',
              `${msg.payload.name || msg.payload.id} entered alarm state`,
              String(msg.payload.id ?? ''),
            );
          }
          break;
        case 'job:progress':
          setJobs((prev) =>
            prev.map((job) =>
              job.id === msg.payload.id ? ({ ...job, ...msg.payload } as JobProgress) : job,
            ),
          );
          if ((msg.payload.progress_pct as number) >= 100) {
            addNotification(
              'success',
              'Job Complete',
              `${msg.payload.job_number} finished on ${msg.payload.machine}`,
              String(msg.payload.id ?? ''),
            );
          }
          break;
        case 'tool:wear':
          setTools((prev) =>
            prev.map((tool) =>
              tool.id === msg.payload.id ? ({ ...tool, ...msg.payload } as ToolLife) : tool,
            ),
          );
          if ((msg.payload.life_remaining_pct as number) <= 10) {
            addNotification(
              'warn',
              'Tool Life Critical',
              `${msg.payload.tool_name} at ${msg.payload.life_remaining_pct}% on ${msg.payload.machine}`,
              String(msg.payload.id ?? ''),
            );
          }
          break;
        case 'safety:alert':
          if (typeof msg.payload.score === 'number') {
            setSafetyScore(msg.payload.score);
          }
          if (typeof msg.payload.score === 'number' && msg.payload.score < 0.7) {
            addNotification(
              'emergency',
              'Safety Score Low',
              `Safety score dropped to ${(msg.payload.score * 100).toFixed(0)}%`,
            );
          }
          break;
      }
    },
    [addNotification],
  );

  const { isConnected } = useWebSocket({
    rooms: ['machine:all', 'job:all', 'tool:all', 'safety:all'],
    onMessage,
    autoConnect: true,
  });

  const running = machines.filter((machine) => machine.status === 'running').length;
  const alarms = machines.filter((machine) => machine.status === 'alarm').length;
  const avgUptime =
    machines.length > 0
      ? Math.round(machines.reduce((sum, machine) => sum + machine.uptime_pct, 0) / machines.length)
      : 0;
  const nextToolRisk = [...tools].sort((left, right) => left.life_remaining_pct - right.life_remaining_pct)[0];
  const nextDispatch = [...jobs].sort((left, right) => left.eta_minutes - right.eta_minutes)[0];
  const nextHotJob = hotJobs[0];
  const sourceLabel =
    snapshotSource === 'live' ? 'Live data' : snapshotSource === 'mixed' ? 'Mixed fallback' : 'Demo fallback';
  const shiftGuidance =
    nextHotJob
      ? `${nextHotJob.jobId} is management-marked hot. Keep ${nextHotJob.partNumber} ahead of the normal due-date queue until ${nextHotJob.setBy} clears the escalation.`
      : alarms > 0
      ? `${alarms} machine${alarms === 1 ? '' : 's'} need${alarms === 1 ? 's' : ''} attention first. Clear alarms before pushing more work into the cell.`
      : nextToolRisk
        ? `Tooling risk is led by ${nextToolRisk.tool_name} on ${nextToolRisk.machine}. Dispatch the next job in due-order once that station is covered.`
        : nextDispatch
          ? `${nextDispatch.job_number} is the next dispatch priority. Keep the line moving in due-date order while live alerts stay quiet.`
          : 'No active live queue pressure is coming through right now. Use the desk counts to decide the next handoff.';
  const activeLaneLabel = nextHotJob
    ? 'Hot-priority command'
    : alarms > 0
      ? 'Alarm recovery command'
      : nextDispatch
        ? 'Dispatch command'
        : 'Fleet posture command';
  const activeLaneDetail = nextHotJob
    ? `${nextHotJob.jobId} is management-marked hot and should anchor the next cross-desk handoff before lower-pressure work resumes.`
    : alarms > 0
      ? `${alarms} machine${alarms === 1 ? '' : 's'} need immediate recovery before more work is pushed into the active cell mix.`
      : nextDispatch
        ? `${nextDispatch.job_number} is the next dispatch-ready packet and should stay aligned with tooling, safety, and release readiness.`
        : 'The dashboard is currently in fleet posture mode, balancing uptime, learning, and readiness signals while live queue pressure remains light.';
  const learningSignalCount =
    (learningSnapshot?.shopProfile.captures.length ?? 0)
    + (learningSnapshot?.networkProfile.captures.length ?? 0);
  const releaseMachineCount = releaseCatalog?.machines.length ?? 0;
  const releaseFixtureCount = releaseCatalog?.fixtures.length ?? 0;
  const dashboardSnapshotStatus = snapshotIssue
    ? {
        label: 'Unavailable',
        tone: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100',
        meta: snapshotIssue,
      }
    : snapshotSource === 'live'
      ? {
          label: 'Live data',
          tone: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100',
          meta: formatRefreshLabel(snapshotRefreshedAt),
        }
      : snapshotSource === 'mixed'
        ? {
            label: 'Mixed fallback',
            tone: 'border-amber-300/18 bg-amber-300/[0.08] text-amber-100',
            meta: formatRefreshLabel(snapshotRefreshedAt),
          }
        : {
            label: 'Demo fallback',
            tone: 'border-sky-300/18 bg-sky-300/[0.08] text-sky-100',
            meta: formatRefreshLabel(snapshotRefreshedAt),
          };
  const learningStatus = learningIssue
    ? {
        label: 'Unavailable',
        tone: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100',
        meta: learningIssue,
      }
    : learningSnapshot
      ? {
          label: 'Live in session',
          tone: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100',
          meta: formatRefreshLabel(learningRefreshedAt),
        }
      : {
          label: 'Standby',
          tone: 'border-white/10 bg-white/[0.04] text-slate-200',
          meta: formatRefreshLabel(learningRefreshedAt),
        };
  const releaseStatus = releaseIssue
    ? {
        label: 'Unavailable',
        tone: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100',
        meta: releaseIssue,
      }
    : releaseCatalog
      ? {
          label: 'Live in session',
          tone: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100',
          meta: formatRefreshLabel(releaseRefreshedAt),
        }
      : {
          label: 'Standby',
          tone: 'border-white/10 bg-white/[0.04] text-slate-200',
          meta: formatRefreshLabel(releaseRefreshedAt),
        };
  const hotJobsStatus = hotJobsIssue
    ? {
        label: 'Unavailable',
        tone: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100',
        meta: hotJobsIssue,
      }
    : {
        label: hotJobs.length > 0 ? 'Live in session' : 'Standby',
        tone: hotJobs.length > 0
          ? 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100'
          : 'border-white/10 bg-white/[0.04] text-slate-200',
        meta: formatRefreshLabel(hotJobsRefreshedAt),
      };
  const telemetryStatus = isConnected
    ? {
        label: 'Live stream',
        tone: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100',
        meta: formatCompactTime(lastUpdate),
      }
    : {
        label: snapshotLoading ? 'Loading' : 'Reconnecting',
        tone: 'border-amber-300/18 bg-amber-300/[0.08] text-amber-100',
        meta: formatCompactTime(lastUpdate),
      };
  const buildHotWorkflowPath = (basePath: string, hotJob: HotJobRecord, includePacket = false) =>
    buildWorkflowPath(basePath, location.search, {
      origin: {
        source: 'dashboard',
        recordType: 'Hot priority',
        recordId: hotJob.jobId,
        customer: hotJob.customer,
        note: hotJob.note,
      },
      focus: includePacket
        ? { type: 'job', id: hotJob.jobId, jobId: hotJob.jobId, packetId: hotJob.jobId }
        : { type: 'job', id: hotJob.jobId, jobId: hotJob.jobId },
    });
  const hotReleaseSeeds = useMemo(
    () =>
      new Map(
        hotJobs.map((hotJob) => [
          hotJob.jobId,
          buildDashboardHotReleaseSeed({
            hotJob,
            jobs,
            releaseCatalog,
          }),
        ]),
      ),
    [hotJobs, jobs, releaseCatalog],
  );
  const buildHotReleasePath = useCallback(
    (hotJob: HotJobRecord) => {
      const releaseSeed = hotReleaseSeeds.get(hotJob.jobId);
      return buildWorkflowPath('/print-to-cnc', location.search, {
        origin: {
          source: 'dashboard',
          recordType: 'Hot priority',
          recordId: hotJob.jobId,
          customer: hotJob.customer,
          note: hotJob.note,
        },
        focus: { type: 'job', id: hotJob.jobId, jobId: hotJob.jobId, packetId: hotJob.jobId },
        extras: {
          source: 'dashboard',
          ...releaseSeed,
        },
      });
    },
    [hotReleaseSeeds, location.search],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1580px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/14 bg-[linear-gradient(120deg,rgba(9,18,28,0.98)_0%,rgba(5,10,16,0.98)_46%,rgba(6,24,32,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-300/18 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Shop floor live
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.7)]' : 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]'}`} />
                {snapshotLoading ? 'Loading' : sourceLabel} — Updated {formatCompactTime(lastUpdate)}
              </span>
              <SafetyBadge score={safetyScore} />
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/58">
                Manufacturing Dashboard
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Manufacturing Dashboard
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Run the shop from one command surface: live machine state, dispatch pressure,
                tool risk, and production health in a layout that reads like the control room,
                not a prototype.
              </p>
              <div className="max-w-3xl text-sm leading-6 text-slate-400">{snapshotNote}</div>
            </div>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Dispatch pressure
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-50">
                  {nextDispatch?.job_number ?? 'No queue'}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {nextDispatch ? `${nextDispatch.current_op} · ETA: ${nextDispatch.eta_minutes}min` : 'No active jobs to dispatch.'}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Tool risk
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-50">
                  {nextToolRisk?.tool_name ?? 'No tool data'}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {nextToolRisk ? `${nextToolRisk.life_remaining_pct}% remaining on ${nextToolRisk.machine}` : 'Tool life monitor is quiet right now.'}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Fleet pulse
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{avgUptime}% average uptime</div>
                <div className="mt-1 text-sm text-slate-400">
                  {running} machines in cut, {alarms} in alarm, safety at {(safetyScore * 100).toFixed(0)}%.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Operator inbox
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-50">Notifications</div>
              </div>
              <NotificationBell count={unreadCount} onClick={() => setPanelOpen(!panelOpen)} />
            </div>

            <div className="space-y-3">
              <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/[0.06] px-4 py-4">
                <div className="text-sm font-semibold text-cyan-100">Shift guidance</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {shiftGuidance}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  title="Unread alerts"
                  value={unreadCount}
                  subtitle="Operator-facing incidents and system notices"
                  accent="from-rose-400/20 via-rose-300/8 to-transparent"
                />
                <MetricTile
                  title="Last data refresh"
                  value={formatCompactTime(lastUpdate)}
                  subtitle={isConnected ? 'WebSocket telemetry active' : 'WebSocket reconnecting'}
                  accent="from-sky-400/20 via-cyan-300/8 to-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {panelOpen ? (
        <NotificationPanel
          notifications={notifications}
          onMarkRead={markRead}
          onClearAll={clearAll}
          onClose={() => setPanelOpen(false)}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricTile
            title="Machines Running"
            value={`${running}/${machines.length}`}
            subtitle="Connected fleet in cycle"
          />
          <MetricTile
            title="Active Alarms"
            value={String(alarms)}
            subtitle="Machines waiting on intervention"
            accent="from-rose-400/24 via-rose-300/10 to-transparent"
          />
          <MetricTile
            title="Active Jobs"
            value={String(jobs.length)}
            subtitle="Programs currently on the floor"
            accent="from-sky-400/24 via-sky-300/8 to-transparent"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricTile
            title="Safety Score"
            value={<SafetyBadge score={safetyScore} />}
            subtitle="Live safety posture"
            accent="from-amber-300/24 via-amber-200/10 to-transparent"
          />
          <MetricTile
            title="OEE"
            value={`${Math.round(oee.oee * 100)}%`}
            subtitle="Overall Equipment Effectiveness"
            accent="from-emerald-400/24 via-emerald-300/10 to-transparent"
          />
        </div>
      </section>

      <SurfaceStatusNotice
        title="Operating-system convergence"
        surfaces={[
          'shellBootstrap',
          'employeeShell',
          'search',
          'jobDesk',
          'scheduling',
          'programRelease',
          'shopFloor',
          'messages',
          'inventoryOperations',
          'learning',
          'commerce',
          'hotJobs',
        ]}
      />

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
        <AppwDashboardCopilot
          deskLabel="Manufacturing Dashboard"
          activeLaneLabel={activeLaneLabel}
          activeLaneDetail={activeLaneDetail}
          snapshotSource={snapshotSource}
          snapshotNote={snapshotNote}
          machineCount={machines.length}
          runningCount={running}
          alarmCount={alarms}
          avgUptime={avgUptime}
          activeJobCount={jobs.length}
          nextDispatchJob={nextDispatch?.job_number ?? null}
          nextDispatchEtaMinutes={nextDispatch?.eta_minutes ?? null}
          nextDispatchOperation={nextDispatch?.current_op ?? null}
          nextToolRiskName={nextToolRisk?.tool_name ?? null}
          nextToolRiskMachine={nextToolRisk?.machine ?? null}
          nextToolRiskRemainingPct={nextToolRisk?.life_remaining_pct ?? null}
          hotJobCount={hotJobs.length}
          nextHotJobId={nextHotJob?.jobId ?? null}
          nextHotJobCustomer={nextHotJob?.customer ?? null}
          nextHotJobNote={nextHotJob?.note ?? null}
          safetyScorePct={safetyScore * 100}
          oeePct={oee.oee * 100}
          unreadAlertCount={unreadCount}
          telemetryConnected={isConnected}
          learningShopLabel={learningSnapshot?.shopProfile.shopLabel ?? null}
          rolloutActionCount={learningSnapshot?.rolloutActions.length ?? 0}
          networkShopCountLabel={learningSnapshot?.networkProfile.participatingShops ?? null}
          releaseMachineCount={releaseMachineCount}
          releaseFixtureCount={releaseFixtureCount}
          snapshotRefreshedAt={snapshotRefreshedAt}
          learningRefreshedAt={learningRefreshedAt}
          releaseRefreshedAt={releaseRefreshedAt}
          hotJobsRefreshedAt={hotJobsRefreshedAt}
          telemetryUpdatedAt={lastUpdate.getTime()}
          snapshotIssue={snapshotIssue}
          learningIssue={learningIssue}
          releaseIssue={releaseIssue}
          hotJobsIssue={hotJobsIssue}
        />

        <SectionShell
          eyebrow="Source posture"
          title="Command-surface truth"
          subtitle="The control room should state exactly which intelligence lanes are live, mixed, fallback, or degraded before anyone trusts the next move."
        >
          <div className="space-y-3">
            <DashboardSourcePostureCard
              label="Mounted dashboard snapshot"
              detail="Canonical machine, dispatch, tooling, and OEE payload for the command surface."
              statusLabel={dashboardSnapshotStatus.label}
              toneClass={dashboardSnapshotStatus.tone}
              metaLabel={dashboardSnapshotStatus.meta}
            />
            <DashboardSourcePostureCard
              label="Realtime telemetry stream"
              detail="WebSocket machine, job, tool, and safety updates that keep the control room hot between snapshot refreshes."
              statusLabel={telemetryStatus.label}
              toneClass={telemetryStatus.tone}
              metaLabel={telemetryStatus.meta}
            />
            <DashboardSourcePostureCard
              label="Learning fabric"
              detail={`Adaptive shop and network learning payload with ${learningSignalCount} visible capture signals and rollout posture.`}
              statusLabel={learningStatus.label}
              toneClass={learningStatus.tone}
              metaLabel={learningStatus.meta}
            />
            <DashboardSourcePostureCard
              label="Program release readiness"
              detail={`Release catalog mounted with ${releaseMachineCount} machines and ${releaseFixtureCount} fixture profiles for downstream hot-job and dispatch handoffs.`}
              statusLabel={releaseStatus.label}
              toneClass={releaseStatus.tone}
              metaLabel={releaseStatus.meta}
            />
            <DashboardSourcePostureCard
              label="Shop hot feed"
              detail="Management escalation lane that keeps the dashboard aligned with the real urgency order across jobs, release, and messages."
              statusLabel={hotJobsStatus.label}
              toneClass={hotJobsStatus.tone}
              metaLabel={hotJobsStatus.meta}
            />
          </div>
        </SectionShell>
      </section>

      <SectionShell
        eyebrow="Priority board"
        title="Shop hot priorities"
        subtitle="Management escalations stay visible at the command surface so planners, programmers, and operators all work from the same urgency order."
      >
        <SurfaceStatusNotice title="Priority escalation status" surfaces={['hotJobs']} className="mb-4" />
        {hotJobs.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {hotJobs.slice(0, 3).map((hotJob) => (
              <HotPriorityCard
                key={hotJob.jobId}
                hotJob={hotJob}
                jobsPath={buildHotWorkflowPath('/jobs', hotJob)}
                releasePath={buildHotReleasePath(hotJob)}
                messagesPath={buildHotWorkflowPath('/messages', hotJob)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
            No shop-wide hot jobs are active right now. Dispatch pressure will follow normal due-date ordering until management stages a new escalation.
          </div>
        )}
      </SectionShell>

      {learningSnapshot ? (
        <SectionShell
          eyebrow="Adaptive intelligence"
          title="Learning fabric"
          subtitle="Each shop should get more specialized over time while the broader Kienzle network gets smarter from privacy-safe shared outcomes."
        >
          <SurfaceStatusNotice title="Learning payload status" surfaces={['learning']} className="mb-4" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(280px,0.8fr)]">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Shop learning profile
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-50">
                {learningSnapshot.shopProfile.shopLabel}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                {learningSnapshot.shopProfile.specialization}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricChip label="Local fit" value={learningSnapshot.shopProfile.adaptationScore} />
                <MetricChip label="Autonomy" value={learningSnapshot.shopProfile.autonomyPosture} />
              </div>
              <div className="mt-4 space-y-3">
                {learningSnapshot.shopProfile.captures.map((capture) => (
                  <LearningSignalRow key={capture.id} record={capture} />
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Network learning exchange
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-50">
                {learningSnapshot.networkProfile.participatingShops}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                {learningSnapshot.networkProfile.safeSharePolicy}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricChip
                  label="Promoted playbooks"
                  value={learningSnapshot.networkProfile.promotedRecipes}
                />
                <MetricChip label="Coverage" value={learningSnapshot.networkProfile.captureCoverage} />
              </div>
              <div className="mt-4 space-y-3">
                {learningSnapshot.networkProfile.captures.map((capture) => (
                  <LearningSignalRow key={capture.id} record={capture} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-cyan-300/14 bg-cyan-300/[0.06] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/70">
                  Policy posture
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-200">
                  {learningSnapshot.shopProfile.policyNote}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Immediate rollout actions
                </div>
                <div className="mt-4 space-y-3">
                  {learningSnapshot.rolloutActions.map((action) => (
                    <div
                      key={action}
                      className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3 text-sm leading-6 text-slate-300"
                    >
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <LearningImprovementPanel
              title="Shop-specific improvements"
              items={learningSnapshot.shopProfile.improvements}
            />
            <LearningImprovementPanel
              title="Network-promoted improvements"
              items={learningSnapshot.networkProfile.improvements}
            />
          </div>
        </SectionShell>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(350px,0.8fr)]">
        <div className="space-y-6">
          <SectionShell
            eyebrow="Machine grid"
            title="Machine Status"
            subtitle="Every connected machine with live cycle state, program context, and uptime posture."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {machines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow="Production pulse"
            title="Active Jobs"
            subtitle="Queued and in-process work ordered for quick dispatch scanning."
            action={
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {jobs.length} active jobs
              </div>
            }
          >
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          </SectionShell>
        </div>

        <div className="space-y-6">
          <SectionShell
            eyebrow="Efficiency"
            title="OEE"
            subtitle="Availability, performance, quality, and total OEE at a glance."
          >
            <div className="grid grid-cols-2 gap-3">
              <OEEGauge label="Availability" value={oee.availability} />
              <OEEGauge label="Performance" value={oee.performance} />
              <OEEGauge label="Quality" value={oee.quality} />
              <OEEGauge label="OEE" value={oee.oee} />
            </div>
          </SectionShell>

          <SectionShell
            eyebrow="Fleet comparison"
            title="Machine Uptime"
            subtitle="Uptime percentage by machine — bar color reflects current status."
          >
            <MachineUptimeChart machines={machines} />
          </SectionShell>

          <SectionShell
            eyebrow="Tool risk"
            title="Tool Life Monitor"
            subtitle="Remaining life by machine so operators can catch swaps before they become scrap or alarms."
          >
            <div className="space-y-3">
              {tools.map((tool) => (
                <ToolLifeRow key={tool.id} tool={tool} />
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
