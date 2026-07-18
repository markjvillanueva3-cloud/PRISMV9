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
  firstText,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

export function ShopFloorLivePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapshotResponse, jobsResponse] = await Promise.all([
        getShopFloorSnapshot(),
        getShopFloorJobs(20),
      ]);
      setSnapshot(asRecord(payloadOf(snapshotResponse)) ?? asRecord(snapshotResponse));
      setJobs(arrayFromPayload(jobsResponse, ['jobs', 'items', 'records']));
    } catch (issue) {
      setSnapshot(null);
      setJobs([]);
      setError(errorMessage(issue, 'The shop floor live board is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const metrics = useMemo(() => ([
    {
      label: 'Active Jobs',
      value: String(jobs.length),
      hint: 'Mounted floor jobs',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Snapshot',
      value: snapshot ? 'Mounted' : 'Pending',
      hint: 'Live floor summary',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [jobs.length, snapshot]);

  const aiContext = useMemo(() => ({
    workspace: 'shop-floor-live',
    appw_stage: 'APPW-MS1 live floor board',
    snapshot,
    jobs,
  }), [jobs, snapshot]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Shop floor"
      title="Shop Floor Live"
      description="The live floor board is restored as a mounted APPW operator surface so leads can see floor posture again while deeper realtime choreography continues converging behind the shared provider seam."
      surfaces={['shopFloor', 'hotJobs']}
      metrics={metrics}
      aiSummary="Kienzle AI can summarize the live floor board, explain queue pressure, and call out the next safest lead or operator actions."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'live-brief',
          label: 'Summarize the live floor',
          query: 'Summarize the current live floor board and identify the next high-risk operator actions.',
        },
      ]}
    >
      <PanelCard title="Live board posture" subtitle="Mounted against shop-floor snapshot and live jobs routes.">
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh board'}
          </ActionButton>
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
        </div>
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Snapshot" subtitle="Current floor summary payload.">
          <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
            {formatJsonPreview(snapshot)}
          </pre>
        </PanelCard>

        <PanelCard title="Active jobs" subtitle="Mounted live job lane.">
          <div className="space-y-3">
            {jobs.length > 0 ? jobs.slice(0, 10).map((entry, index) => (
              <div key={`${firstText(entry, ['job_id', 'id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['job_id', 'title', 'id']) || `Job ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{firstText(entry, ['status', 'machine_id', 'department']) || formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No live shop-floor jobs were returned.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default ShopFloorLivePage;
