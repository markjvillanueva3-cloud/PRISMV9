import { useEffect, useMemo, useState } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';
import { safetyLevel, type SafetyLevel } from '../api/types';
import {
  loadSafetyMonitorSnapshotWithFallback,
  type ActiveSafetyJob,
  type SafetyMonitorSnapshot,
} from '../api/safetyMonitor';

function ToolLifeBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = Math.min(100, (remaining / total) * 100);
  const color =
    pct > 50
      ? 'from-emerald-400 to-emerald-300'
      : pct > 20
        ? 'from-amber-300 to-orange-300'
        : 'from-rose-400 to-rose-300';

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right text-xs text-slate-400">{remaining}/{total} min</span>
    </div>
  );
}

function SafetyLevelBanner({ score }: { score: number }) {
  const level = safetyLevel(score);
  const config: Record<SafetyLevel, { shell: string; label: string }> = {
    pass: {
      shell: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
      label: 'SAFE',
    },
    warn: {
      shell: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
      label: 'CAUTION',
    },
    fail: {
      shell: 'border-rose-300/22 bg-rose-400/10 text-rose-100',
      label: 'UNSAFE',
    },
    info: {
      shell: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
      label: 'INFO',
    },
  };
  const tone = config[level];

  return (
    <div className={`rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.2em] ${tone.shell}`}>
      {tone.label}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/20 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function JobSafetyCard({ job }: { job: ActiveSafetyJob }) {
  const critical = job.safetyScore < 0.7;

  return (
    <article
      className={`rounded-[26px] border p-5 ${critical ? 'border-rose-300/20 bg-rose-400/[0.05]' : 'border-white/8 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)]'}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold text-slate-50">{job.name}</div>
          <div className="mt-1 text-sm text-slate-400">
            {job.id} · {job.machine} · {job.material} · {job.operation}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SafetyBadge score={job.safetyScore} />
          <SafetyLevelBanner score={job.safetyScore} />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)]">
        <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</div>
            <div className="text-sm font-medium text-slate-200">{job.progress}%</div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-300" style={{ width: `${job.progress}%` }} />
          </div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tool Life</div>
          <ToolLifeBar remaining={job.toolLifeRemaining} total={job.toolLifeTotal} />
        </div>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Warnings</div>
        {job.warnings.length > 0 ? (
          <ul className="space-y-2 text-sm text-amber-100">
            {job.warnings.map((warning, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-1 text-amber-300">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-slate-400">None</span>
        )}
      </div>
    </article>
  );
}

export function SafetyMonitorPage() {
  const [jobs, setJobs] = useState<ActiveSafetyJob[]>([]);
  const [snapshotSource, setSnapshotSource] = useState<SafetyMonitorSnapshot['source']>('demo');
  const [snapshotNote, setSnapshotNote] = useState(
    'Connecting safety posture to live machine state, dispatch order, and tool-life telemetry.',
  );
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  useEffect(() => {
    let active = true;

    loadSafetyMonitorSnapshotWithFallback()
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setJobs(snapshot.jobs);
        setSnapshotSource(snapshot.source);
        setSnapshotNote(snapshot.note);
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

  const overallSafety = useMemo(
    () => (jobs.length > 0 ? jobs.reduce((sum, job) => sum + job.safetyScore, 0) / jobs.length : 0),
    [jobs],
  );
  const criticalCount = jobs.filter((job) => job.safetyScore < 0.7).length;
  const warningCount = jobs.filter((job) => job.safetyScore >= 0.7 && job.safetyScore < 0.85).length;
  const mostAtRisk = [...jobs].sort((left, right) => left.safetyScore - right.safetyScore)[0];
  const sourceLabel =
    snapshotSource === 'live' ? 'Live data' : snapshotSource === 'mixed' ? 'Mixed fallback' : 'Demo fallback';
  const immediateAttention = mostAtRisk
    ? `${mostAtRisk.name} is the most at-risk job right now. ${mostAtRisk.warnings[0] ?? 'Review tooling and machine posture before pushing cycle time harder.'}`
    : 'No active jobs are feeding the safety board yet.';

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-rose-300/10 bg-[linear-gradient(135deg,rgba(11,16,24,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(26,12,18,0.94)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-rose-300/16 bg-rose-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-100">
                Safety command
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                {snapshotLoading ? 'Loading' : sourceLabel}
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Safety Monitor
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Watch safety scores, tool-life risk, and live job posture from one focused surface.
                This is the page operators should trust when the floor starts to drift toward yellow or red.
              </p>
              <div className="max-w-3xl text-sm leading-6 text-slate-400">{snapshotNote}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Risk focus</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{mostAtRisk?.name ?? 'No active jobs'}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {mostAtRisk ? `${mostAtRisk.machine} · ${mostAtRisk.material}` : 'Safety queue will populate when jobs are active.'}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Critical lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{criticalCount} critical jobs</div>
                <div className="mt-1 text-sm text-slate-400">Anything below 70% safety score needs immediate review.</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Warning lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{warningCount} warning jobs</div>
                <div className="mt-1 text-sm text-slate-400">Jobs in caution should be watched before they tip into red.</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Monitor brief</div>
            <div className="mt-4 space-y-4">
              <div className="rounded-[22px] border border-rose-300/12 bg-rose-300/[0.06] px-4 py-4">
                <div className="text-sm font-semibold text-rose-100">Immediate attention</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {immediateAttention}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  label="Overall Safety"
                  value={`${(overallSafety * 100).toFixed(0)}%`}
                  hint="Average score across active work"
                  accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
                />
                <SummaryTile
                  label="Active Jobs"
                  value={String(jobs.length)}
                  hint="Jobs currently being watched"
                  accent="from-sky-400/22 via-sky-300/8 to-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Overall Safety"
          value={`${(overallSafety * 100).toFixed(0)}%`}
          hint="Fleet-wide safety posture"
        />
        <SummaryTile
          label="Active Jobs"
          value={String(jobs.length)}
          hint="Jobs under live supervision"
          accent="from-sky-400/22 via-sky-300/8 to-transparent"
        />
        <SummaryTile
          label="Warnings"
          value={String(warningCount)}
          hint="Jobs in caution range"
          accent="from-amber-300/22 via-amber-200/8 to-transparent"
        />
        <SummaryTile
          label="Critical"
          value={String(criticalCount)}
          hint="Jobs needing immediate intervention"
          accent="from-rose-400/24 via-rose-300/10 to-transparent"
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active Jobs</div>
            <div className="mt-2 text-xl font-semibold text-slate-50">Active Jobs</div>
            <div className="mt-1 text-sm text-slate-400">
              Review every job with its safety state, progress posture, tool-life bar, and current warning stack.
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Live safety board
          </div>
        </div>

        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobSafetyCard key={job.id} job={job} />
          ))}
        </div>
      </section>
    </div>
  );
}
