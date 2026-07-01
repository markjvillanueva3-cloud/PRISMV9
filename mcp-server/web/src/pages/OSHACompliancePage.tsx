import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  osha300LogFeed,
  oshaIncidents,
  oshaNearMiss,
  oshaPpeRecords,
  oshaSafetyTraining,
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
  asRecord,
  errorMessage,
  firstText,
  formatDateLabel,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

export function OSHACompliancePage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employeeName, setEmployeeName] = useState('');
  const [nearMissSummary, setNearMissSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([]);
  const [logEntries, setLogEntries] = useState<Record<string, unknown>[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<Record<string, unknown>[]>([]);
  const [ppeRecords, setPpeRecords] = useState<Record<string, unknown>[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incidentResponse, logResponse, trainingResponse, ppeResponse] = await Promise.all([
        oshaIncidents(),
        osha300LogFeed(Number(year) || new Date().getFullYear()),
        oshaSafetyTraining(),
        oshaPpeRecords(),
      ]);

      setIncidents(arrayFromPayload(incidentResponse, ['incidents', 'items', 'records']));
      setLogEntries(arrayFromPayload(logResponse, ['entries', 'logs', 'items', 'records']));
      setTrainingRecords(arrayFromPayload(trainingResponse, ['records', 'training', 'items']));
      setPpeRecords(arrayFromPayload(ppeResponse, ['records', 'items', 'ppe']));
    } catch (issue) {
      setIncidents([]);
      setLogEntries([]);
      setTrainingRecords([]);
      setPpeRecords([]);
      setError(errorMessage(issue, 'The OSHA compliance desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  async function handleNearMissSubmit() {
    if (!nearMissSummary.trim()) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await oshaNearMiss({
        employee_name: employeeName.trim() || 'Unassigned',
        description: nearMissSummary.trim(),
        incident_date: new Date().toISOString().slice(0, 10),
      });
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || 'Near miss submitted to the mounted OSHA route.');
      setNearMissSummary('');
      await loadDesk();
    } catch (issue) {
      setError(errorMessage(issue, 'Unable to submit the near miss report.'));
    } finally {
      setActionLoading(false);
    }
  }

  const recordableCount = incidents.filter((entry) => firstText(entry, ['recordable', 'status']).toLowerCase().includes('true')).length;

  const metrics = useMemo(() => ([
    {
      label: 'Incidents',
      value: String(incidents.length),
      hint: `${recordableCount} recordable signals`,
      accent: 'from-rose-400/22 via-rose-300/10 to-transparent',
    },
    {
      label: 'OSHA 300 Rows',
      value: String(logEntries.length),
      hint: `${year} log posture`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Training + PPE',
      value: String(trainingRecords.length + ppeRecords.length),
      hint: `${trainingRecords.length} training | ${ppeRecords.length} PPE`,
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [incidents.length, logEntries.length, ppeRecords.length, recordableCount, trainingRecords.length, year]);

  const aiContext = useMemo(() => ({
    workspace: 'osha-compliance',
    appw_stage: 'APPW-MS0 compliance readiness',
    year: Number(year) || new Date().getFullYear(),
    incidents,
    osha_300_log: logEntries,
    training: trainingRecords,
    ppe: ppeRecords,
  }), [incidents, logEntries, ppeRecords, trainingRecords, year]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Safety and compliance"
      title="OSHA Compliance"
      description="This APPW compliance desk is rebuilt as a live, AI-assisted safety surface: incident posture, OSHA 300 exposure, training, and PPE records are mounted while the front end regains stability."
      surfaces={['inventoryOperations']}
      metrics={metrics}
      aiSummary="Kienzle AI can summarize the current safety posture, flag compliance gaps, and translate OSHA activity into concrete plant-level actions."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'safety-brief',
          label: 'Create a safety brief',
          query: `Summarize the current OSHA posture for ${year}, including incidents, training, and PPE gaps.`,
        },
        {
          id: 'compliance-risk',
          label: 'Explain compliance risk',
          query: 'Which compliance risks in the current OSHA data need immediate leadership attention?',
        },
      ]}
    >
      <PanelCard title="Compliance posture" subtitle="Mounted against incident, OSHA 300, training, PPE, and near-miss routes.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,180px)_auto]">
          <Field label="Log Year">
            <Input value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" />
          </Field>
          <div className="flex items-end gap-3">
            <ActionButton onClick={() => void loadDesk()} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh desk'}
            </ActionButton>
            <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <PanelCard title="Incident and log posture" subtitle="Mounted safety events and annual OSHA 300 entries.">
          <div className="space-y-4">
            <div className="space-y-3">
              {incidents.length > 0 ? incidents.slice(0, 5).map((entry, index) => (
                <div key={`${firstText(entry, ['incident_id', 'id', 'employee_name'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  <div className="font-semibold text-slate-100">{firstText(entry, ['employee_name', 'incident_type', 'incident_id']) || `Incident ${index + 1}`}</div>
                  <div className="mt-1 text-slate-400">
                    {formatDateLabel(entry.incident_date)} | {firstText(entry, ['status', 'recordable']) || 'Status unavailable'}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{formatJsonPreview(entry)}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                  No incidents are mounted right now.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">OSHA 300 preview</div>
              <div className="mt-1 text-slate-400">{logEntries.length} log rows mounted for {year}.</div>
              <div className="mt-3 space-y-2">
                {logEntries.length > 0 ? logEntries.slice(0, 4).map((entry, index) => (
                  <div key={`${firstText(entry, ['case_number', 'employee_name'])}-${index}`} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                    <div className="font-semibold text-slate-100">{firstText(entry, ['employee_name', 'case_number']) || `Log row ${index + 1}`}</div>
                    <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-slate-400">
                    No OSHA 300 rows were returned.
                  </div>
                )}
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Near miss intake" subtitle="Quick submission lane for mounted near-miss reporting.">
          <div className="space-y-4">
            <Field label="Employee">
              <Input value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} placeholder="Employee or team" />
            </Field>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Near Miss Summary</span>
              <textarea
                value={nearMissSummary}
                onChange={(event) => setNearMissSummary(event.target.value)}
                className="min-h-[140px] w-full rounded-[22px] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                placeholder="Describe what happened, where it happened, and what should be corrected."
              />
            </label>
            <ActionButton onClick={() => void handleNearMissSubmit()} disabled={actionLoading || !nearMissSummary.trim()} tone="amber">
              {actionLoading ? 'Submitting...' : 'Submit near miss'}
            </ActionButton>
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Training posture" subtitle="Mounted training records.">
          <div className="space-y-3">
            {trainingRecords.length > 0 ? trainingRecords.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['employee_name', 'course_name', 'id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['employee_name', 'course_name']) || `Training ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No safety training records are currently mounted.
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard title="PPE posture" subtitle="Mounted PPE assignment and readiness records.">
          <div className="space-y-3">
            {ppeRecords.length > 0 ? ppeRecords.slice(0, 6).map((entry, index) => (
              <div key={`${firstText(entry, ['employee_name', 'ppe_type', 'id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">{firstText(entry, ['employee_name', 'ppe_type']) || `PPE record ${index + 1}`}</div>
                <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                No PPE records are currently mounted.
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default OSHACompliancePage;
