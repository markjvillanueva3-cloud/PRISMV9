/**
 * EMP-MS0 U-CLK2: Active Jobs Dashboard
 * Multi-job tracking with play/pause/stop, cost display,
 * undo toast, 10s polling fallback. Color-blind safe palette.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveJobs,
  jobTimePause,
  jobTimeResume,
  jobTimeStop,
} from '../../api/client';
import type { JobTimeEntry, PauseReasonCategory, ProcessType } from '../../api/types';
import { ActionButton, StatusPill } from '../workspace/WorkspacePrimitives';

interface ActiveJobsDashboardProps {
  employeeId: string;
  clockedIn: boolean;
}

const PAUSE_REASONS: { value: PauseReasonCategory; label: string }[] = [
  { value: 'machine_down', label: 'Machine Down' },
  { value: 'material_shortage', label: 'Material Shortage' },
  { value: 'setup_changeover', label: 'Setup Changeover' },
  { value: 'tool_change', label: 'Tool Change' },
  { value: 'break', label: 'Break' },
  { value: 'preventive_maintenance', label: 'Prev. Maintenance' },
  { value: 'waiting_inspection', label: 'Waiting Inspection' },
  { value: 'idle', label: 'Idle' },
  { value: 'other', label: 'Other' },
];

/** Color-blind safe: blue=running, yellow=paused, gray=completed + icons */
function statusStyle(status: string) {
  switch (status) {
    case 'running':
      return { border: 'border-blue-400/30', bg: 'bg-blue-400/10', text: 'text-blue-300', icon: '\u25B6' };
    case 'paused':
      return { border: 'border-yellow-400/30', bg: 'bg-yellow-400/10', text: 'text-yellow-300', icon: '\u23F8' };
    default:
      return { border: 'border-slate-400/30', bg: 'bg-slate-400/10', text: 'text-slate-400', icon: '\u25A0' };
  }
}

interface StopFormState {
  jobId: string;
  goodParts: string;
  scrapCount: string;
  scrapReason: string;
}

export function ActiveJobsDashboard({ employeeId, clockedIn }: ActiveJobsDashboardProps) {
  const [jobs, setJobs] = useState<JobTimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pauseJobId, setPauseJobId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState<PauseReasonCategory>('other');
  const [stopForm, setStopForm] = useState<StopFormState | null>(null);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!employeeId) return;
    try {
      const res = await getActiveJobs(employeeId);
      const data = ((res as any).data ?? (res as any).result ?? []) as JobTimeEntry[];
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      // Silent fallback for polling
    }
  }, [employeeId]);

  // Initial load + 10s polling
  useEffect(() => {
    if (!clockedIn) {
      setJobs([]);
      return;
    }
    void fetchJobs();
    pollRef.current = setInterval(() => void fetchJobs(), 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [clockedIn, fetchJobs]);

  const handlePause = useCallback(async (jobId: string) => {
    setLoading(true);
    setError('');
    try {
      await jobTimePause({ employee_id: employeeId, job_id: jobId, reason: pauseReason, reason_category: pauseReason });
      setPauseJobId(null);
      await fetchJobs();
    } catch (e: any) {
      setError(e.message ?? 'Failed to pause job');
    } finally {
      setLoading(false);
    }
  }, [employeeId, fetchJobs]);

  const handleResume = useCallback(async (jobId: string) => {
    setLoading(true);
    setError('');
    try {
      await jobTimeResume({ employee_id: employeeId, job_id: jobId });
      await fetchJobs();
    } catch (e: any) {
      setError(e.message ?? 'Failed to resume job');
    } finally {
      setLoading(false);
    }
  }, [employeeId, fetchJobs]);

  const handleStop = useCallback(async () => {
    if (!stopForm) return;
    setLoading(true);
    setError('');
    try {
      await jobTimeStop({
        employee_id: employeeId,
        job_id: stopForm.jobId,
        good_parts: stopForm.goodParts ? parseInt(stopForm.goodParts, 10) : undefined,
        scrap_count: stopForm.scrapCount ? parseInt(stopForm.scrapCount, 10) : undefined,
        scrap_reason: stopForm.scrapReason || undefined,
      });
      setUndoToast(`Stopped ${stopForm.jobId}`);
      setStopForm(null);
      await fetchJobs();
      setTimeout(() => setUndoToast(null), 5000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to stop job');
    } finally {
      setLoading(false);
    }
  }, [employeeId, stopForm, fetchJobs]);

  if (!clockedIn) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-5 text-sm text-slate-400">
        Clock in to see active jobs.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Active Jobs</h3>
        <span className="text-xs text-slate-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Undo toast */}
      {undoToast && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
          {undoToast}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4 text-sm text-slate-400">
          No active jobs. Use the Job Selector below to start a job.
        </div>
      )}

      {jobs.map((job) => {
        const style = statusStyle(job.status);
        const elapsed = job.elapsed_hours != null ? job.elapsed_hours.toFixed(1) : '-';
        const cost = job.labor_cost != null ? `$${job.labor_cost.toFixed(2)}` : '-';

        return (
          <div
            key={job.id}
            className={`rounded-[18px] border ${style.border} ${style.bg} p-4`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${style.text}`}>{style.icon}</span>
                  <span className="text-base font-semibold text-slate-100">{job.job_id}</span>
                  <StatusPill
                    label={job.status}
                    tone={job.status === 'running' ? 'sky' : job.status === 'paused' ? 'amber' : 'slate'}
                  />
                </div>
                {job.operation && (
                  <div className="mt-1 text-xs text-slate-400">Op: {job.operation}</div>
                )}
                {job.process_type && (
                  <div className="mt-0.5 text-xs text-slate-500">{job.process_type}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-slate-100">{elapsed}h</div>
                <div className="font-mono text-sm text-emerald-400">{cost}</div>
              </div>
            </div>

            {/* Action buttons — 72px touch targets */}
            <div className="mt-3 flex flex-wrap gap-2">
              {job.status === 'running' && (
                <>
                  <button
                    onClick={() => setPauseJobId(job.job_id)}
                    disabled={loading}
                    className="h-[48px] rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-5 text-sm font-medium text-yellow-300 transition hover:bg-yellow-400/20 disabled:opacity-50"
                  >
                    \u23F8 Pause
                  </button>
                  <button
                    onClick={() => setStopForm({ jobId: job.job_id, goodParts: '', scrapCount: '0', scrapReason: '' })}
                    disabled={loading}
                    className="h-[48px] rounded-lg border border-slate-400/30 bg-slate-400/10 px-5 text-sm font-medium text-slate-300 transition hover:bg-slate-400/20 disabled:opacity-50"
                  >
                    \u25A0 Stop
                  </button>
                </>
              )}
              {job.status === 'paused' && (
                <>
                  <button
                    onClick={() => void handleResume(job.job_id)}
                    disabled={loading}
                    className="h-[48px] rounded-lg border border-blue-400/30 bg-blue-400/10 px-5 text-sm font-medium text-blue-300 transition hover:bg-blue-400/20 disabled:opacity-50"
                  >
                    \u25B6 Resume
                  </button>
                  <button
                    onClick={() => setStopForm({ jobId: job.job_id, goodParts: '', scrapCount: '0', scrapReason: '' })}
                    disabled={loading}
                    className="h-[48px] rounded-lg border border-slate-400/30 bg-slate-400/10 px-5 text-sm font-medium text-slate-300 transition hover:bg-slate-400/20 disabled:opacity-50"
                  >
                    \u25A0 Stop
                  </button>
                </>
              )}
            </div>

            {/* Scrap/parts entry on stop */}
            {job.scrap_count != null && job.scrap_count > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                Scrap: {job.scrap_count} — {job.scrap_reason ?? 'No reason'}
              </div>
            )}
          </div>
        );
      })}

      {/* Pause reason picker */}
      {pauseJobId && (
        <div className="rounded-lg border border-yellow-300/20 bg-yellow-300/[0.06] p-4">
          <div className="mb-2 text-sm font-semibold text-yellow-200">Pause reason for {pauseJobId}</div>
          <div className="flex flex-wrap gap-2">
            {PAUSE_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => { setPauseReason(r.value); void handlePause(pauseJobId); }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  pauseReason === r.value
                    ? 'border-yellow-400/40 bg-yellow-400/20 text-yellow-200'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPauseJobId(null)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Stop form with good parts / scrap */}
      {stopForm && (
        <div className="rounded-lg border border-slate-300/20 bg-slate-300/[0.06] p-4">
          <div className="mb-3 text-sm font-semibold text-slate-200">Stop {stopForm.jobId} — Enter parts count</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-400">Good parts</label>
              <input
                type="number"
                value={stopForm.goodParts}
                onChange={(e) => setStopForm({ ...stopForm, goodParts: e.target.value })}
                min="0"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Scrap count</label>
              <input
                type="number"
                value={stopForm.scrapCount}
                onChange={(e) => setStopForm({ ...stopForm, scrapCount: e.target.value })}
                min="0"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Scrap reason</label>
              <input
                type="text"
                value={stopForm.scrapReason}
                onChange={(e) => setStopForm({ ...stopForm, scrapReason: e.target.value })}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
                placeholder="Reason (if any)"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <ActionButton onClick={() => void handleStop()} disabled={loading}>
              {loading ? 'Stopping...' : 'Confirm Stop'}
            </ActionButton>
            <button
              onClick={() => setStopForm(null)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
