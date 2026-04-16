import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calOverdueAlerts,
  calibrationSchedule,
  gageRRStudies,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  PanelCard,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  arrayFromPayload,
  errorMessage,
  firstText,
  formatDateLabel,
  formatJsonPreview,
} from './recovery/recoveryUtils';

export function CalibrationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<string, unknown>[]>([]);
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);
  const [studies, setStudies] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleResponse, alertResponse, grrResponse] = await Promise.all([
        calibrationSchedule(),
        calOverdueAlerts(),
        gageRRStudies(),
      ]);

      setSchedule(arrayFromPayload(scheduleResponse, ['schedule', 'items', 'records', 'gages']));
      setAlerts(arrayFromPayload(alertResponse, ['alerts', 'items', 'records', 'gages']));
      setStudies(arrayFromPayload(grrResponse, ['studies', 'items', 'records']));
    } catch (issue) {
      setSchedule([]);
      setAlerts([]);
      setStudies([]);
      setError(errorMessage(issue, 'The calibration desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const metrics = useMemo(() => ([
    {
      label: 'Scheduled Gages',
      value: String(schedule.length),
      hint: 'Mounted calibration schedule',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Overdue Alerts',
      value: String(alerts.length),
      hint: 'Lockout review lane',
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Gage R&R',
      value: String(studies.length),
      hint: 'Mounted study records',
      accent: 'from-violet-400/22 via-violet-300/10 to-transparent',
    },
  ]), [alerts.length, schedule.length, studies.length]);

  const aiContext = useMemo(() => ({
    workspace: 'calibration',
    appw_stage: 'APPW-MS0 quality operations',
    schedule,
    alerts,
    studies,
  }), [alerts, schedule, studies]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Quality operations"
      title="Calibration"
      description="This calibration surface is back online as an APPW recovery desk: it exposes mounted schedule and overdue signals, keeps route posture explicit, and embeds PRISM AI for lockout and workload reasoning."
      surfaces={['inventoryOperations']}
      metrics={metrics}
      aiSummary="PRISM AI can summarize overdue gage risk, prioritize lockout decisions, and translate schedule pressure into simple lead actions."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'lockout-risk',
          label: 'Summarize lockout risk',
          query: 'Summarize the current overdue calibration risk and tell the quality lead what to lock out first.',
        },
        {
          id: 'grr-brief',
          label: 'Explain the Gage R&R posture',
          query: 'Explain the current Gage R&R posture and which studies need attention first.',
        },
      ]}
    >
      <PanelCard
        title="Calibration posture"
        subtitle="Mounted against the calibration schedule, overdue alerts, and Gage R&R study routes."
      >
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh desk'}
          </ActionButton>
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`${alerts.length} overdue`} tone={alerts.length > 0 ? 'amber' : 'sky'} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <PanelCard title="Schedule" subtitle="Upcoming and active calibration work.">
          <div className="space-y-3">
            {schedule.length > 0 ? schedule.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['gage_id', 'equipment_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['equipment_name', 'gage_name', 'equipment_id']) || `Calibration ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">Due {formatDateLabel(entry.next_calibration ?? entry.due_date)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No calibration schedule entries were returned.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Overdue" subtitle="Mounted lockout and alert candidates.">
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['gage_id', 'equipment_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['equipment_name', 'gage_name', 'gage_id']) || `Alert ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{firstText(entry, ['message', 'status']) || formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No overdue calibration alerts are mounted right now.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Gage R&amp;R" subtitle="Mounted repeatability studies.">
          <div className="space-y-3">
            {studies.length > 0 ? studies.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['study_id', 'gage_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['gage_name', 'study_name', 'study_id']) || `Study ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{firstText(entry, ['status', 'summary']) || formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No Gage R&amp;R studies were exposed in the current response.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default CalibrationPage;
