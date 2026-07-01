import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  auditFindingCreate,
  auditFindings,
  auditSchedules,
  managementReviewPackage,
} from '../api/client';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
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

export function AuditManagerPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [audits, setAudits] = useState<Record<string, unknown>[]>([]);
  const [findings, setFindings] = useState<Record<string, unknown>[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState('');
  const [clause, setClause] = useState('7.1');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [packageResult, setPackageResult] = useState<Record<string, unknown> | null>(null);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditResponse, findingResponse] = await Promise.all([
        auditSchedules(),
        auditFindings(),
      ]);
      setAudits(arrayFromPayload(auditResponse, ['audits', 'items', 'records']));
      setFindings(arrayFromPayload(findingResponse, ['findings', 'items', 'records']));
    } catch (issue) {
      setAudits([]);
      setFindings([]);
      setError(errorMessage(issue, 'The audit manager desk is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (!selectedAuditId && audits[0]) {
      setSelectedAuditId(firstText(audits[0], ['id', 'audit_id']));
    }
  }, [audits, selectedAuditId]);

  async function handleCreateFinding() {
    if (!selectedAuditId || !description.trim()) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await auditFindingCreate({
        audit_id: selectedAuditId,
        finding_type: 'minor_nc',
        clause,
        description: description.trim(),
        due_date: endDate,
      });
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || `Finding created for audit ${selectedAuditId}.`);
      setDescription('');
      await loadDesk();
    } catch (issue) {
      setError(errorMessage(issue, 'Unable to create the audit finding.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGeneratePackage() {
    if (!startDate || !endDate) return;

    setActionLoading(true);
    setActionMessage(null);
    setError(null);
    try {
      const response = await managementReviewPackage({
        start_date: startDate,
        end_date: endDate,
      });
      const payload = asRecord(payloadOf(response)) ?? asRecord(response);
      setPackageResult(payload);
      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || 'Management review package generated.');
    } catch (issue) {
      setPackageResult(null);
      setError(errorMessage(issue, 'Unable to generate the management review package.'));
    } finally {
      setActionLoading(false);
    }
  }

  const openFindings = findings.filter((entry) => {
    const status = firstText(entry, ['status']).toLowerCase();
    return !status || status === 'open' || status === 'in_progress';
  }).length;

  const metrics = useMemo(() => ([
    {
      label: 'Audit Schedule',
      value: String(audits.length),
      hint: 'Mounted audit rows',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Open Findings',
      value: String(openFindings),
      hint: `${findings.length} total findings`,
      accent: 'from-amber-400/22 via-amber-300/10 to-transparent',
    },
    {
      label: 'Review Window',
      value: `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`,
      hint: 'Management package range',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [audits.length, endDate, findings.length, openFindings, startDate]);

  const aiContext = useMemo(() => ({
    workspace: 'audit-manager',
    appw_stage: 'APPW-MS0 quality governance',
    audits,
    findings,
    selected_audit_id: selectedAuditId,
    management_review_package: packageResult,
  }), [audits, findings, packageResult, selectedAuditId]);

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Quality governance"
      title="Audit Manager"
      description="The APPW audit desk is restored on a live scaffold so the team can read audit posture, manage findings, and generate review packages with Kienzle AI reasoning across the mounted compliance data."
      metrics={metrics}
      aiSummary="Kienzle AI can summarize audit posture, identify the most serious findings, and turn the management review package into an executive-ready brief."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'audit-summary',
          label: 'Summarize audit posture',
          query: 'Summarize the current audit and findings posture, and tell the quality lead what needs attention first.',
        },
        {
          id: 'review-brief',
          label: 'Draft management review talking points',
          query: 'Turn the current audit desk data into management review talking points with top risks and follow-ups.',
        },
      ]}
    >
      <PanelCard title="Audit posture" subtitle="Mounted against audit schedules, findings, and management review package routes.">
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => void loadDesk()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh desk'}
          </ActionButton>
          <StatusPill label={loading ? 'Loading' : 'Mounted'} tone={loading ? 'amber' : 'emerald'} />
          <StatusPill label={`Open findings ${openFindings}`} tone={openFindings > 0 ? 'amber' : 'sky'} />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <PanelCard title="Audit schedule and findings" subtitle="Mounted schedule rows and current audit findings.">
          <div className="space-y-4">
            <div className="space-y-3">
              {audits.length > 0 ? audits.slice(0, 6).map((entry, index) => (
                <div key={`${firstText(entry, ['id', 'audit_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  <div className="font-semibold text-slate-100">{firstText(entry, ['audit_name', 'standard', 'id']) || `Audit ${index + 1}`}</div>
                  <div className="mt-1 text-slate-400">
                    {formatDateLabel(entry.audit_date)} | {firstText(entry, ['status', 'lead_auditor']) || 'Schedule detail unavailable'}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{formatJsonPreview(entry)}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                  No audit schedule rows are currently mounted.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Findings preview</div>
              <div className="mt-1 text-slate-400">{findings.length} findings mounted.</div>
              <div className="mt-3 space-y-2">
                {findings.length > 0 ? findings.slice(0, 4).map((entry, index) => (
                  <div key={`${firstText(entry, ['id', 'audit_id'])}-${index}`} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                    <div className="font-semibold text-slate-100">{firstText(entry, ['clause', 'finding_type']) || `Finding ${index + 1}`}</div>
                    <div className="mt-1 text-slate-400">{formatJsonPreview(entry)}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-slate-400">
                    No findings are currently mounted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Governance actions" subtitle="Create a finding or generate a management review package.">
          <div className="space-y-4">
            <Field label="Audit">
              <Select value={selectedAuditId} onChange={(event) => setSelectedAuditId(event.target.value)}>
                {audits.length > 0 ? audits.map((entry, index) => {
                  const value = firstText(entry, ['id', 'audit_id']) || `audit-${index}`;
                  const label = firstText(entry, ['audit_name', 'standard', 'id']) || value;
                  return <option key={value} value={value}>{label}</option>;
                }) : <option value="">No audits available</option>}
              </Select>
            </Field>
            <Field label="Clause">
              <Input value={clause} onChange={(event) => setClause(event.target.value)} />
            </Field>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Finding Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[130px] w-full rounded-[22px] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                placeholder="Describe the observation or nonconformance."
              />
            </label>
            <ActionButton onClick={() => void handleCreateFinding()} disabled={actionLoading || !selectedAuditId || !description.trim()} tone="amber">
              {actionLoading ? 'Working...' : 'Create finding'}
            </ActionButton>

            <div className="h-px bg-white/10" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Start Date">
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </Field>
              <Field label="End Date">
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </Field>
            </div>
            <ActionButton onClick={() => void handleGeneratePackage()} disabled={actionLoading || !startDate || !endDate} tone="emerald">
              {actionLoading ? 'Generating...' : 'Generate review package'}
            </ActionButton>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              {packageResult ? formatJsonPreview(packageResult) : 'No management review package is mounted for the current date window.'}
            </div>
          </div>
        </PanelCard>
      </div>
    </WorkspaceRecoveryScaffold>
  );
}

export default AuditManagerPage;
