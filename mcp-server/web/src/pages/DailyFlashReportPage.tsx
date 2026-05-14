import { useCallback, useEffect, useMemo, useState } from 'react';
import { dailyFlashReport } from '../api/client';
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
  asRecord,
  errorMessage,
  firstText,
  formatDateLabel,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

export function DailyFlashReportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [priorities, setPriorities] = useState<Record<string, unknown>[]>([]);
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dailyFlashReport({ date });
      const payload = payloadOf(response);
      const payloadRecord = asRecord(payload);

      setReport(payloadRecord);
      setPriorities(arrayFromPayload({ result: payloadRecord?.priorities ?? payloadRecord?.focus_items ?? [] }));
      setAlerts(arrayFromPayload({ result: payloadRecord?.alerts ?? payloadRecord?.risks ?? [] }));
    } catch (issue) {
      setReport(null);
      setPriorities([]);
      setAlerts([]);
      setError(errorMessage(issue, 'The daily flash route is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const metrics = useMemo(() => ([
    {
      label: 'Report Date',
      value: formatDateLabel(date),
      hint: 'Leadership standup view',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Priority Items',
      value: String(priorities.length),
      hint: 'Mounted from the flash payload',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
    {
      label: 'Risk Alerts',
      value: String(alerts.length),
      hint: 'Issues surfaced into the flash',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
  ]), [alerts.length, date, priorities.length]);

  const aiContext = useMemo(() => ({
    workspace: 'daily-flash',
    appw_stage: 'APPW-MS0 leadership reporting',
    date,
    report,
    priorities,
    alerts,
  }), [alerts, date, priorities, report]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Leadership standup"
      title="Daily Flash Report"
      description="The daily flash route is back as an AI-native APPW desk. It mounts the live flash payload, keeps route posture explicit, and gives leaders a safe operational summary even while the deeper reporting surface is still converging."
      surfaces={['deskCounts', 'jobDesk']}
      metrics={metrics}
      aiSummary="PRISM AI can compress the flash payload into a standup brief, flag escalation paths, and translate raw alerts into lead actions."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'standup-brief',
          label: 'Generate the standup brief',
          query: `Turn the ${formatDateLabel(date)} flash payload into a leadership standup brief with top priorities and risks.`,
        },
        {
          id: 'escalations',
          label: 'Call out escalations',
          query: `Which issues from the ${formatDateLabel(date)} flash should escalate immediately and who owns them?`,
        },
      ]}
    >
      <PanelCard title="Flash posture" subtitle="Mounted against the daily flash ERP route.">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Report Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh flash'}
          </ActionButton>
          <ActionButton onClick={() => window.print()} tone="amber">
            Print
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
        <PanelCard title="Priority items" subtitle="Flash items that should lead the daily conversation.">
          <div className="space-y-3">
            {priorities.length > 0 ? priorities.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['id', 'title'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['title', 'job_id', 'label']) || `Priority ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{firstText(entry, ['summary', 'note', 'message']) || formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No priority items were exposed in the current flash payload.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Alerts" subtitle="Mounted risks and issues surfaced into the flash.">
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['id', 'title'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['title', 'job_id', 'label']) || `Alert ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{firstText(entry, ['summary', 'note', 'message']) || formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No flash alerts were returned for this date.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default DailyFlashReportPage;
