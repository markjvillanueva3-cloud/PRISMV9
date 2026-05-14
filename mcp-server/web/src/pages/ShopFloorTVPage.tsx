import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getShopFloorJobs,
  getShopFloorSnapshot,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  asRecord,
  errorMessage,
  firstNumber,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

export function ShopFloorTVPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapshotResponse, jobsResponse] = await Promise.all([
        getShopFloorSnapshot(),
        getShopFloorJobs(24),
      ]);
      setSnapshot(asRecord(payloadOf(snapshotResponse)) ?? asRecord(snapshotResponse));
      setJobs(arrayFromPayload(jobsResponse, ['jobs', 'items', 'records']));
      setLastRefresh(new Date().toISOString());
    } catch (issue) {
      setSnapshot(null);
      setJobs([]);
      setError(errorMessage(issue, 'The shop-floor TV board is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      void loadDesk();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, loadDesk]);

  const activeCount = firstNumber(snapshot ?? {}, ['active_jobs', 'jobs_active', 'active_count']) ?? jobs.length;
  const operatorCount = firstNumber(snapshot ?? {}, ['clocked_in', 'operators', 'employee_count']) ?? 0;
  const machineCount = firstNumber(snapshot ?? {}, ['machines_online', 'machine_count']) ?? 0;

  const metrics = useMemo(() => ([
    {
      label: 'Active Jobs',
      value: String(activeCount),
      hint: 'Mounted TV board count',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Operators',
      value: String(operatorCount),
      hint: 'Current floor headcount',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Machines Online',
      value: String(machineCount),
      hint: lastRefresh ? `Updated ${new Date(lastRefresh).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting refresh',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
  ]), [activeCount, lastRefresh, machineCount, operatorCount]);

  const aiContext = useMemo(() => ({
    workspace: 'shop-floor-tv',
    appw_stage: 'APPW-MS1 floor visibility',
    auto_refresh: autoRefresh,
    snapshot,
    jobs,
    last_refresh: lastRefresh,
  }), [autoRefresh, jobs, lastRefresh, snapshot]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Shop-floor broadcast"
      title="Shop Floor TV"
      description="The floor TV route is restored as an APPW visibility surface with mounted live snapshot data, an auto-refresh board, and PRISM AI to narrate the current floor state."
      surfaces={['shopFloor', 'deskCounts']}
      metrics={metrics}
      aiSummary="PRISM AI can turn the live shop-floor board into a shift summary, highlight bottlenecks, and call out jobs that need intervention."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'shift-summary',
          label: 'Summarize the floor board',
          query: 'Summarize the current shop-floor TV board and identify the jobs or machines most likely to need intervention next.',
        },
        {
          id: 'bottleneck-review',
          label: 'Call out bottlenecks',
          query: 'Which bottlenecks are visible in the current shop-floor board, and what should the lead do right now?',
        },
      ]}
    >
      <PanelCard title="Broadcast controls" subtitle="Mounted against the live shop-floor snapshot and job feed routes.">
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh board'}
          </ActionButton>
          <ActionButton onClick={() => setAutoRefresh((value) => !value)} tone={autoRefresh ? 'amber' : 'emerald'}>
            {autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          </ActionButton>
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={autoRefresh ? 'Auto refresh on' : 'Manual refresh'} tone={autoRefresh ? 'sky' : 'slate'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <PanelCard title="Floor snapshot" subtitle="Top-line mounted telemetry for the TV broadcast layer.">
          <div className="grid gap-3 md:grid-cols-2">
            {snapshot ? Object.entries(snapshot).slice(0, 8).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{key.replace(/_/g, ' ')}</div>
                <div className="mt-2 text-sm text-slate-200">{typeof value === 'string' || typeof value === 'number' ? String(value) : formatJsonPreview(value)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No shop-floor snapshot payload is currently mounted.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Active jobs on broadcast" subtitle="Jobs exposed to the floor board right now.">
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.length > 0 ? jobs.slice(0, 10).map((entry, index) => (
              <div key={`${index}-job`} className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(11,20,30,0.95)_0%,rgba(4,10,16,0.96)_100%)] px-4 py-4 text-sm text-slate-300 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
                <div className="text-lg font-semibold text-slate-50">Job {index + 1}</div>
                <div className="mt-2 text-slate-400">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No jobs are currently mounted for the TV board.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default ShopFloorTVPage;
