import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  qualityCalibrationAdd,
  qualityCalibrationDashboard,
  qualityFAICreate,
  qualityFAIList,
  qualityKPIs,
  qualityMaterialCert,
  qualityNCRCreate,
  qualityNCRList,
  qualitySPCChart,
  qualityTraceHeatLot,
  qualityTraceJob,
  ApiError,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { CalibrationRecord, FAI, NCR, QualityKPI } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { buildCapturePath } from '../utils/captureRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'kpis' | 'calibration' | 'ncr' | 'trace' | 'fai' | 'spc' | 'addcal' | 'matcert';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  kpis: { label: 'KPIs', detail: 'First-pass, scrap, calibration, and FAI health at a glance.' },
  calibration: { label: 'Calibration', detail: 'Equipment calibration posture and due-state review.' },
  ncr: { label: 'NCR', detail: 'Non-conformance records and severity disposition view.' },
  trace: { label: 'Traceability', detail: 'Trace jobs and lots when quality events need a clean lineage.' },
  fai: { label: 'FAI', detail: 'First article records and pass/fail posture.' },
  spc: { label: 'SPC', detail: 'Control-chart lane for characteristic stability review.' },
  addcal: { label: 'Create', detail: 'Create calibration records, NCRs, and first articles from one lane.' },
  matcert: { label: 'Material cert', detail: 'Verify heat lots, certifications, and trace posture.' },
};

function isTab(value: string | null): value is Tab {
  return value === 'kpis'
    || value === 'calibration'
    || value === 'ncr'
    || value === 'trace'
    || value === 'fai'
    || value === 'spc'
    || value === 'addcal'
    || value === 'matcert';
}

function inferQualityTab(search: string) {
  const params = new URLSearchParams(search);
  const requested = params.get('tab');
  if (isTab(requested)) {
    return requested;
  }

  const routeContext = parseWorkflowRouteContext(search);
  const focusId = routeContext.focus.id || routeContext.origin.recordId || '';
  const recordType = (routeContext.origin.recordType || '').toLowerCase();

  if (/^ncr-/i.test(focusId)) return 'ncr';
  if (/^fai-/i.test(focusId)) return 'fai';
  if (/^(hl-|heat)/i.test(focusId) || recordType.includes('heat')) return 'matcert';
  if (/^(gage-|cal-|eq-)/i.test(focusId) || recordType.includes('calibration')) return 'calibration';
  if (recordType === 'job' && routeContext.origin.recordId) return 'trace';
  return 'kpis';
}

function severityTone(level?: string): 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' {
  switch ((level ?? '').toLowerCase()) {
    case 'minor':
    case 'current':
    case 'pass':
      return 'emerald';
    case 'major':
    case 'due_soon':
      return 'amber';
    case 'critical':
    case 'overdue':
    case 'fail':
      return 'rose';
    default:
      return 'sky';
  }
}

export function QualityManagementPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const sourceContext = routeParams.get('source') || routeContext.origin.source || '';
  const launcherSourceLabel = sourceContext ? formatWorkflowSourceLabel(sourceContext) : '';
  const upstreamSourceContext = routeContext.origin.source && routeContext.origin.source !== sourceContext
    ? routeContext.origin.source
    : '';
  const upstreamSourceLabel = upstreamSourceContext ? formatWorkflowSourceLabel(upstreamSourceContext) : '';
  const [tab, setTab] = useState<Tab>(() => inferQualityTab(location.search));
  const [kpis, setKpis] = useState<QualityKPI | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [fais, setFais] = useState<FAI[]>([]);
  const [tracePayload, setTracePayload] = useState<Record<string, unknown> | null>(null);
  const [spcPayload, setSpcPayload] = useState<Record<string, unknown> | null>(null);
  const [createPayload, setCreatePayload] = useState<Record<string, unknown> | null>(null);
  const [materialPayload, setMaterialPayload] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceJobId, setTraceJobId] = useState(routeContext.origin.recordType === 'Job' ? routeContext.origin.recordId : '');
  const [heatLot, setHeatLot] = useState(/^HL-/i.test(routeContext.focus.id) ? routeContext.focus.id : '');
  const [spcForm, setSpcForm] = useState({ part_number: '', dimension: '' });
  const activeTab = TAB_CONFIG[tab];
  const activeCalibration = calibrations[0] ?? null;
  const activeNcr = ncrs[0] ?? null;
  const activeFai = fais[0] ?? null;
  const activeTraceJobId = typeof tracePayload?.job_id === 'string' ? tracePayload.job_id : '';
  const activeHeatLot = heatLot.trim()
    || (typeof materialPayload?.heat_lot === 'string' ? materialPayload.heat_lot : '');
  const activeQualityRecord = useMemo(() => {
    if (tab === 'ncr' && activeNcr) {
      return { recordType: 'NCR', recordId: activeNcr.id, jobId: activeNcr.job_id };
    }
    if (tab === 'fai' && activeFai) {
      return { recordType: 'FAI', recordId: activeFai.id, jobId: activeFai.job_id };
    }
    if (tab === 'calibration' && activeCalibration) {
      return { recordType: 'Calibration', recordId: activeCalibration.equipment_id, jobId: '' };
    }
    if (tab === 'trace' && activeTraceJobId) {
      return { recordType: 'Job', recordId: activeTraceJobId, jobId: activeTraceJobId };
    }
    if (tab === 'matcert' && activeHeatLot) {
      return { recordType: 'Heat lot', recordId: activeHeatLot, jobId: '' };
    }
    if (routeContext.focus.type === 'quality' && routeContext.focus.id) {
      return { recordType: 'Quality', recordId: routeContext.focus.id, jobId: routeContext.focus.jobId };
    }
    if (routeContext.origin.recordId) {
      return {
        recordType: routeContext.origin.recordType || 'Quality record',
        recordId: routeContext.origin.recordId,
        jobId: routeContext.focus.jobId || (routeContext.origin.recordType === 'Job' ? routeContext.origin.recordId : ''),
      };
    }
    return { recordType: '', recordId: '', jobId: '' };
  }, [
    activeCalibration,
    activeFai,
    activeHeatLot,
    activeNcr,
    activeTraceJobId,
    routeContext.focus.id,
    routeContext.focus.jobId,
    routeContext.focus.type,
    routeContext.origin.recordId,
    routeContext.origin.recordType,
    tab,
  ]);
  const effectiveOrigin = useMemo(
    () => ({
      source: routeContext.origin.source || 'quality-management',
      recordType: activeQualityRecord.recordType || routeContext.origin.recordType || 'Quality record',
      recordId: activeQualityRecord.recordId || routeContext.origin.recordId || '',
      customer: routeContext.origin.customer,
      note:
        routeContext.origin.note
        || `Carry quality context from ${launcherSourceLabel || 'Quality Management'} into the next follow-up desk.`,
      threadId: routeContext.origin.threadId,
    }),
    [activeQualityRecord.recordId, activeQualityRecord.recordType, launcherSourceLabel, routeContext.origin],
  );
  const effectiveFocus = useMemo(() => {
    if (routeContext.focus.id) {
      return routeContext.focus;
    }
    if (activeQualityRecord.recordId) {
      if (activeQualityRecord.jobId) {
        return { type: 'job', id: activeQualityRecord.jobId, jobId: activeQualityRecord.jobId };
      }
      return { type: 'quality', id: activeQualityRecord.recordId };
    }
    return undefined;
  }, [activeQualityRecord.jobId, activeQualityRecord.recordId, routeContext.focus]);
  const jobFocusId =
    routeContext.focus.jobId
    || activeQualityRecord.jobId
    || (routeContext.origin.recordType === 'Job' ? routeContext.origin.recordId : '');
  const messagesPath = useMemo(
    () =>
      buildWorkflowPath('/messages', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: { source: 'quality-management' },
      }),
    [effectiveFocus, effectiveOrigin, location.search],
  );
  const capturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'quality-management',
        target: 'quality',
        job: jobFocusId || activeQualityRecord.recordId,
        department: 'Quality bench',
        note:
          routeContext.origin.note
          || `Capture inspection evidence, cert images, and containment proof for ${activeQualityRecord.recordId || 'the active quality record'}.`,
        origin: effectiveOrigin,
        focus: effectiveFocus,
      }),
    [activeQualityRecord.recordId, effectiveFocus, effectiveOrigin, jobFocusId, location.pathname, location.search, routeContext.origin.note],
  );
  const jobsPath = useMemo(
    () =>
      buildWorkflowPath('/jobs', location.search, {
        origin: effectiveOrigin,
        focus: jobFocusId ? { type: 'job', id: jobFocusId, jobId: jobFocusId } : effectiveFocus,
        extras: { source: 'quality-management' },
      }),
    [effectiveFocus, effectiveOrigin, jobFocusId, location.search],
  );
  const contextReference = activeQualityRecord.recordId
    ? `${activeQualityRecord.recordType || 'Quality record'} ${activeQualityRecord.recordId}`
    : routeContext.origin.recordId
      ? `${routeContext.origin.recordType || 'Record'} ${routeContext.origin.recordId}`
      : '';

  useEffect(() => {
    void loadData(tab);
  }, [tab]);

  useEffect(() => {
    const nextTab = inferQualityTab(location.search);
    setTab((current) => current === nextTab ? current : nextTab);

    const routedJobId = routeContext.origin.recordType === 'Job'
      ? routeContext.origin.recordId
      : routeContext.focus.jobId;
    if (routedJobId) {
      setTraceJobId((current) => current === routedJobId ? current : routedJobId);
    }

    const routedHeatLot = /^HL-/i.test(routeContext.focus.id)
      ? routeContext.focus.id
      : routeContext.origin.recordType.toLowerCase().includes('heat')
        ? routeContext.origin.recordId
        : '';
    if (routedHeatLot) {
      setHeatLot((current) => current === routedHeatLot ? current : routedHeatLot);
    }
  }, [location.search, routeContext.focus.id, routeContext.focus.jobId, routeContext.origin.recordId, routeContext.origin.recordType]);

  async function loadData(target: Tab) {
    setLoading(true);
    setError(null);
    try {
      if (target === 'kpis') {
        const response = await qualityKPIs();
        setKpis((response.result as unknown as QualityKPI) ?? null);
      }
      if (target === 'calibration') {
        const response = await qualityCalibrationDashboard();
        const next = (response.result as any)?.calibrations ?? [];
        setCalibrations(Array.isArray(next) ? next : []);
      }
      if (target === 'ncr') {
        const response = await qualityNCRList();
        const next = (response.result as any)?.ncrs ?? [];
        setNcrs(Array.isArray(next) ? next : []);
      }
      if (target === 'fai') {
        const response = await qualityFAIList();
        const next = (response.result as any)?.fais ?? (response.result as any) ?? [];
        setFais(Array.isArray(next) ? next : []);
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load quality workspace');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrace() {
    setLoading(true);
    setError(null);
    try {
      const response = await qualityTraceJob({ job_id: traceJobId });
      setTracePayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Traceability lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSpc() {
    setLoading(true);
    setError(null);
    try {
      const response = await qualitySPCChart({
        part_number: spcForm.part_number,
        characteristic: spcForm.dimension,
      });
      setSpcPayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'SPC request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get('action') ?? 'calibration');
    setLoading(true);
    setError(null);
    try {
      let response;
      if (action === 'ncr') {
        response = await qualityNCRCreate({
          job_id: form.get('job_id'),
          part_number: form.get('part_number'),
          description: form.get('description'),
          severity: form.get('severity'),
          disposition: form.get('disposition'),
        });
      } else if (action === 'fai') {
        response = await qualityFAICreate({
          part_number: form.get('part_number'),
          job_id: form.get('job_id'),
          inspector: form.get('inspector'),
        });
      } else {
        response = await qualityCalibrationAdd({
          equipment_id: form.get('equipment_id'),
          equipment_name: form.get('equipment_name'),
          type: form.get('equipment_type'),
          interval_days: Number(form.get('interval_days') ?? 365),
        });
      }
      setCreatePayload((response.result as Record<string, unknown>) ?? { created: true });
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Create action failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMaterial(mode: 'cert' | 'trace') {
    setLoading(true);
    setError(null);
    try {
      const response = mode === 'cert' ? await qualityMaterialCert({ heat_lot: heatLot }) : await qualityTraceHeatLot({ heat_lot: heatLot });
      setMaterialPayload((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Material trace request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Quality command"
        title="Quality Management"
        description="SPC, calibration, NCR, traceability, and first-article posture now live in one darker quality command surface instead of a collection of disconnected white-card utilities."
        metrics={
          <>
            <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
            <SummaryTile
              label="First-pass yield"
              value={kpis ? `${kpis.first_pass_yield}%` : 'Standby'}
              hint="Immediate FPY signal for the current quality snapshot."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
            <SummaryTile
              label="Open NCRs"
              value={kpis ? String(kpis.ncr_count) : String(ncrs.length)}
              hint="Watch severity posture before it spills into delivery risk."
              accent="from-amber-300/22 via-amber-200/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this workspace as the shop-side quality desk: live KPIs at the top, then dive into NCR, trace, and certification lanes only when the signal says you need to.
            </div>
            {sourceContext ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                {launcherSourceLabel || 'This workflow'} opened Quality Management with workflow context.{' '}
                {effectiveOrigin.note || 'Keep the quality record attached while you move between inspection, messages, and evidence capture.'}
                {contextReference ? (
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100/90">
                    Record: <span className="font-semibold normal-case tracking-normal">{contextReference}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {upstreamSourceLabel ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                Upstream commercial origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
              </div>
            ) : null}
            <div className="grid gap-2">
              <ActionButton onClick={() => setTab('ncr')}>Open NCR desk</ActionButton>
              <ActionButton tone="emerald" onClick={() => setTab('trace')}>
                Run traceability
              </ActionButton>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing quality workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void loadData(tab)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)]">
        <div className="space-y-6">
          {tab === 'kpis' ? (
            <PanelCard title="Quality KPI board" subtitle="The top-line quality health signal stays visible before you open deeper corrective-action lanes.">
              {kpis ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryTile label="First-pass yield" value={`${kpis.first_pass_yield}%`} hint="Yield without rework or NCR diversion." />
                  <SummaryTile label="Scrap rate" value={`${kpis.scrap_rate}%`} hint="Current scrap burden across the tracked window." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
                  <SummaryTile label="NCR count" value={String(kpis.ncr_count)} hint="Open non-conformance records needing review." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                  <SummaryTile label="Calibration" value={`${kpis.calibration_compliance}%`} hint="Equipment still current on calibration interval." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
                  <SummaryTile label="FAI records" value={String(kpis.fai_count)} hint="First articles recorded in the current snapshot." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  Quality KPIs are not yet loaded for this snapshot.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'calibration' ? (
            <PanelCard title="Calibration board" subtitle="Equipment calibration posture and due-state review without spreadsheet scanning.">
              <div className="space-y-3">
                {calibrations.length > 0 ? (
                  calibrations.map((record) => (
                    <div key={record.equipment_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{record.equipment_name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{record.type}</div>
                        </div>
                        <StatusPill label={record.status.replace(/_/g, ' ')} tone={severityTone(record.status)} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                        <div>
                          <span className="text-slate-500">Last calibration:</span> {record.last_calibration}
                        </div>
                        <div>
                          <span className="text-slate-500">Next due:</span> {record.next_calibration}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No calibration records are staged in this snapshot.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'ncr' ? (
            <PanelCard title="NCR desk" subtitle="Severity, disposition, and impact are visible without a flat accounting-style grid.">
              <div className="space-y-3">
                {ncrs.length > 0 ? (
                  ncrs.map((ncr) => (
                    <div key={ncr.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{ncr.id}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {ncr.job_id} · {ncr.part_number}
                          </div>
                        </div>
                        <StatusPill label={ncr.severity} tone={severityTone(ncr.severity)} />
                      </div>
                      <div className="mt-4 text-sm leading-6 text-slate-300">{ncr.description}</div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                        <div>
                          <span className="text-slate-500">Disposition:</span> {ncr.disposition}
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span> {ncr.status}
                        </div>
                        <div>
                          <span className="text-slate-500">Cost impact:</span> ${ncr.cost_impact.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No non-conformance records are open in this snapshot.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'trace' ? (
            <PanelCard title="Traceability lookup" subtitle="Trace a job back through the quality chain without leaving the command surface.">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Field label="Job ID">
                  <Input value={traceJobId} onChange={(event) => setTraceJobId(event.target.value)} placeholder="JOB-2026-001" />
                </Field>
                <div className="md:self-end">
                  <ActionButton onClick={handleTrace}>Trace job</ActionButton>
                </div>
              </div>
              {tracePayload ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(tracePayload, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}

          {tab === 'fai' ? (
            <PanelCard title="First article board" subtitle="Keep FAI records visible with pass posture and inspection ownership.">
              <div className="space-y-3">
                {fais.length > 0 ? (
                  fais.map((fai) => (
                    <div key={fai.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{fai.part_number}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{fai.job_id}</div>
                        </div>
                        <StatusPill label={fai.overall_pass ? 'Pass' : 'Review'} tone={fai.overall_pass ? 'emerald' : 'amber'} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                        <div>
                          <span className="text-slate-500">Inspector:</span> {fai.inspector}
                        </div>
                        <div>
                          <span className="text-slate-500">Date:</span> {fai.date}
                        </div>
                        <div>
                          <span className="text-slate-500">Characteristics:</span> {fai.characteristics.length}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No FAI records are loaded in the current snapshot.
                  </div>
                )}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'spc' ? (
            <PanelCard title="SPC chart request" subtitle="Run a characteristic stability request without leaving the quality desk.">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Field label="Part number">
                  <Input
                    value={spcForm.part_number}
                    onChange={(event) => setSpcForm((current) => ({ ...current, part_number: event.target.value }))}
                    placeholder="PART-001"
                  />
                </Field>
                <Field label="Characteristic">
                  <Input
                    value={spcForm.dimension}
                    onChange={(event) => setSpcForm((current) => ({ ...current, dimension: event.target.value }))}
                    placeholder="Bore diameter / width / true position"
                  />
                </Field>
                <div className="md:self-end">
                  <ActionButton tone="emerald" onClick={handleSpc}>
                    Run SPC
                  </ActionButton>
                </div>
              </div>
              {spcPayload ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(spcPayload, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}

          {tab === 'addcal' ? (
            <PanelCard title="Create quality record" subtitle="Create calibration, NCR, or FAI payloads from a single intake lane.">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
                <Field label="Action">
                  <Select name="action" defaultValue="calibration">
                    <option value="calibration">Add calibration</option>
                    <option value="ncr">Create NCR</option>
                    <option value="fai">Create FAI</option>
                  </Select>
                </Field>
                <Field label="Job ID">
                  <Input name="job_id" placeholder="JOB-2026-001" />
                </Field>
                <Field label="Part number">
                  <Input name="part_number" placeholder="PART-001" />
                </Field>
                <Field label="Description / equipment">
                  <Input name="description" placeholder="Issue description or record note" />
                </Field>
                <Field label="Severity">
                  <Select name="severity" defaultValue="minor">
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </Select>
                </Field>
                <Field label="Disposition">
                  <Select name="disposition" defaultValue="rework">
                    <option value="rework">Rework</option>
                    <option value="use_as_is">Use as-is</option>
                    <option value="scrap">Scrap</option>
                  </Select>
                </Field>
                <Field label="Equipment ID">
                  <Input name="equipment_id" placeholder="GAGE-014" />
                </Field>
                <Field label="Equipment name">
                  <Input name="equipment_name" placeholder="0-1 micrometer / height gage / indicator" />
                </Field>
                <Field label="Equipment type">
                  <Input name="equipment_type" placeholder="gage" />
                </Field>
                <Field label="Interval days">
                  <Input name="interval_days" type="number" defaultValue={365} />
                </Field>
                <Field label="Inspector">
                  <Input name="inspector" placeholder="QA-01" />
                </Field>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Save quality record
                  </button>
                  {createPayload ? <StatusPill label="Record saved" tone="emerald" /> : null}
                </div>
                {createPayload ? (
                  <div className="md:col-span-2 rounded-[22px] border border-emerald-300/16 bg-emerald-300/8 px-4 py-4 text-sm text-emerald-100">
                    {JSON.stringify(createPayload, null, 2)}
                  </div>
                ) : null}
              </form>
            </PanelCard>
          ) : null}

          {tab === 'matcert' ? (
            <PanelCard title="Material certification" subtitle="Verify heat lots and certification posture without leaving the quality surface.">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <Field label="Heat lot">
                  <Input value={heatLot} onChange={(event) => setHeatLot(event.target.value)} placeholder="HL-24-0891" />
                </Field>
                <div className="md:self-end">
                  <ActionButton onClick={() => void handleMaterial('cert')}>Load cert</ActionButton>
                </div>
                <div className="md:self-end">
                  <ActionButton tone="emerald" onClick={() => void handleMaterial('trace')}>
                    Trace lot
                  </ActionButton>
                </div>
              </div>
              {materialPayload ? (
                <pre className="mt-5 overflow-x-auto rounded-[22px] border border-white/8 bg-slate-950/70 p-4 text-xs text-slate-200">
                  {JSON.stringify(materialPayload, null, 2)}
                </pre>
              ) : null}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Quality brief" subtitle="Keep the current quality mission visible while working inside deeper lanes.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quality discipline</div>
                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>Open KPIs first so FPY and calibration posture set the tone for deeper review.</li>
                  <li>Use trace and cert lanes together during supplier or lot-driven investigations.</li>
                  <li>Keep NCR creation and FAI creation in the same shell so corrective action stays close to inspection evidence.</li>
                </ul>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Workflow handoff" subtitle="Keep inspection, communication, and evidence capture attached to the same quality record.">
            <div className="grid gap-3">
              <Link
                to={messagesPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Open Messages follow-up</div>
                <div className="mt-2 text-sky-50/80">
                  Carry this quality context back into the inbox so release questions, cert requests, and containment replies stay attached.
                </div>
              </Link>

              <Link
                to={capturePath}
                className="block rounded-[22px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm leading-6 text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.16]"
              >
                <div className="font-semibold">Capture quality evidence</div>
                <div className="mt-2 text-cyan-50/80">
                  Stage NCR photos, cert scans, FAI proof, and inspection notes without losing the current record context.
                </div>
              </Link>

              <Link
                to={jobsPath}
                className="block rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-100 transition hover:border-white/18 hover:bg-white/[0.07]"
              >
                <div className="font-semibold">Return to Jobs</div>
                <div className="mt-2 text-slate-300">
                  Send the active quality record back into dispatch and traveler review with the same upstream provenance.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
