import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  assetDueCalibrations,
  assetList,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  errorMessage,
  firstNumber,
  firstText,
  formatDateLabel,
  formatJsonPreview,
  formatMoney,
} from './recovery/recoveryUtils';

export function EquipmentAssetPage() {
  const [daysAhead, setDaysAhead] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, unknown>[]>([]);
  const [dueCalibrations, setDueCalibrations] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetResponse, dueResponse] = await Promise.all([
        assetList(),
        assetDueCalibrations(Number(daysAhead) || 30),
      ]);
      setAssets(arrayFromPayload(assetResponse, ['assets', 'items', 'records']));
      setDueCalibrations(arrayFromPayload(dueResponse, ['assets', 'calibrations', 'items', 'records']));
    } catch (issue) {
      setAssets([]);
      setDueCalibrations([]);
      setError(errorMessage(issue, 'The equipment asset desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const totalBookValue = assets.reduce((sum, entry) => sum + (firstNumber(entry, ['book_value']) ?? 0), 0);
  const metrics = useMemo(() => ([
    {
      label: 'Assets',
      value: String(assets.length),
      hint: 'Mounted asset registry entries',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Book Value',
      value: formatMoney(totalBookValue),
      hint: 'Approximate mounted total',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Calibrations Due',
      value: String(dueCalibrations.length),
      hint: `${daysAhead} day lookahead`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
  ]), [assets.length, daysAhead, dueCalibrations.length, totalBookValue]);

  const aiContext = useMemo(() => ({
    workspace: 'equipment-assets',
    appw_stage: 'APPW-MS5 asset operations',
    days_ahead: Number(daysAhead) || 30,
    assets,
    due_calibrations: dueCalibrations,
  }), [assets, daysAhead, dueCalibrations]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Operations support"
      title="Equipment Assets"
      description="The equipment asset route has been restored as a live APPW support desk that exposes mounted registry and calibration-due signals while keeping the route honest about its current convergence posture."
      surfaces={['inventoryOperations']}
      metrics={metrics}
      aiSummary="Kienzle AI can rank asset attention, explain calibration exposure, and translate registry posture into maintenance or finance follow-up."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'asset-priority',
          label: 'Prioritize asset attention',
          query: `Prioritize the current asset registry and due calibration list over the next ${daysAhead} days.`,
        },
        {
          id: 'capital-brief',
          label: 'Summarize capital posture',
          query: 'Summarize the current asset posture for operations and finance, including calibration risk.',
        },
      ]}
    >
      <PanelCard title="Asset posture" subtitle="Mounted against asset registry and due-calibration routes.">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Days Ahead">
            <Input value={daysAhead} onChange={(event) => setDaysAhead(event.target.value)} inputMode="numeric" />
          </Field>
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh desk'}
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
        <PanelCard title="Asset registry" subtitle="Mounted asset entries.">
          <div className="space-y-3">
            {assets.length > 0 ? assets.slice(0, 8).map((entry, index) => (
              <div key={`${firstText(entry, ['id', 'asset_tag'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['name', 'asset_tag', 'id']) || `Asset ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">
                  {firstText(entry, ['location', 'category']) || 'Unspecified location'} | Book {formatMoney(firstNumber(entry, ['book_value']))}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No asset registry entries were returned.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Due calibrations" subtitle="Asset-linked calibration exposure in the requested horizon.">
          <div className="space-y-3">
            {dueCalibrations.length > 0 ? dueCalibrations.slice(0, 8).map((entry, index) => (
              <div key={`${firstText(entry, ['equipment_id', 'asset_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['equipment_name', 'asset_name', 'asset_id']) || `Calibration ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">Due {formatDateLabel(entry.next_calibration ?? entry.due_date)}</div>
                <div className="mt-2 text-xs text-slate-500">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No due calibrations were returned in this horizon.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default EquipmentAssetPage;
