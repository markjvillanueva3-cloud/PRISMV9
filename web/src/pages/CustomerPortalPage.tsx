import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  addPortalQualityDocument,
  advancePortalMilestone,
  createPortalServiceCase,
  createPortalMilestoneTimeline,
  createPortalToken,
  getPortalMilestoneTimeline,
  getPortalOrderStatus,
  getPortalQuoteView,
  listPortalServiceCases,
  listPortalOrderDocuments,
  listPortalOrderMessages,
  listPortalQualityDocuments,
  listPortalTokens,
  revokePortalToken,
  type PortalMessageRecord,
  type PortalOrderStatusRecord,
  type PortalQualityDocumentRecord,
  type PortalQuoteViewRecord,
  type PortalServiceCaseRecord,
  type PortalScope,
  type PortalTimelineRecord,
  type PortalTokenRecord,
  type PortalTokenType,
  updatePortalServiceCase,
} from '../api/portal';
import { LoadingState } from '../components/LoadingState';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

const QUOTE_SCOPES: PortalScope[] = ['view', 'respond'];
const ORDER_SCOPES: PortalScope[] = ['view', 'documents', 'messages'];

type PortalFormState = {
  entity_id: string;
  customer_id: string;
  expires_in_days: string;
  rate_limit: string;
  quote_id: string;
};

type MilestoneAdvanceState = {
  milestone_key: string;
  notes: string;
  advanced_by: string;
};

type QualityDocState = {
  doc_type: PortalQualityDocumentRecord['doc_type'];
  title: string;
  status: PortalQualityDocumentRecord['status'];
  notes: string;
};

type ServiceCaseFormState = {
  subject: string;
  summary: string;
  severity: PortalServiceCaseRecord['severity'];
  owner: string;
  sla_hours: string;
};

type ServiceCaseDraftState = {
  status: PortalServiceCaseRecord['status'];
  owner: string;
  satisfaction_score: string;
};

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function selectDefaultMode(search: string) {
  const workflow = parseWorkflowRouteContext(search);
  if (workflow.focus.type === 'quote' || workflow.origin.recordType === 'Quote') {
    return 'quote' as PortalTokenType;
  }
  if (workflow.focus.jobId || workflow.focus.type === 'job' || workflow.origin.recordType === 'Order') {
    return 'order' as PortalTokenType;
  }
  return 'quote' as PortalTokenType;
}

function defaultEntityId(search: string, tokenType: PortalTokenType) {
  const workflow = parseWorkflowRouteContext(search);
  if (tokenType === 'quote') {
    return workflow.focus.quoteId || (workflow.focus.type === 'quote' ? workflow.focus.id : '') || (workflow.origin.recordType === 'Quote' ? workflow.origin.recordId : '');
  }
  return workflow.focus.jobId || (workflow.focus.type === 'job' ? workflow.focus.id : '') || (workflow.origin.recordType === 'Order' ? workflow.origin.recordId : '');
}

function tokenPreviewPath(token: PortalTokenRecord | null) {
  if (!token) return '';
  return token.token_type === 'quote'
    ? `/api/v1/portal/quote/${encodeURIComponent(token.token)}`
    : `/api/v1/portal/order/${encodeURIComponent(token.token)}`;
}

function buildServiceCaseDraft(serviceCase: PortalServiceCaseRecord): ServiceCaseDraftState {
  return {
    status: serviceCase.status,
    owner: serviceCase.owner ?? '',
    satisfaction_score:
      typeof serviceCase.satisfaction_score === 'number' ? String(serviceCase.satisfaction_score) : '',
  };
}

function buildServiceCaseDraftMap(serviceCases: PortalServiceCaseRecord[]) {
  return Object.fromEntries(
    serviceCases.map((serviceCase) => [serviceCase.id, buildServiceCaseDraft(serviceCase)]),
  ) as Record<string, ServiceCaseDraftState>;
}

function serviceCaseTone(serviceCase: PortalServiceCaseRecord) {
  if (serviceCase.status === 'resolved') {
    return 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50';
  }

  if (serviceCase.status === 'escalated' || serviceCase.severity === 'critical') {
    return 'border-rose-300/18 bg-rose-300/[0.08] text-rose-50';
  }

  if (serviceCase.severity === 'high') {
    return 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50';
  }

  return 'border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-50';
}

function formatServiceCaseSla(serviceCase: PortalServiceCaseRecord) {
  const dueAt = new Date(serviceCase.sla_target_at).getTime();
  const deltaHours = Math.round((dueAt - Date.now()) / 3600000);

  if (serviceCase.status === 'resolved') {
    return 'Resolved';
  }

  if (deltaHours < 0) {
    return `${Math.abs(deltaHours)}h overdue`;
  }

  if (deltaHours === 0) {
    return 'Due now';
  }

  return `${deltaHours}h remaining`;
}

export function CustomerPortalPage() {
  const location = useLocation();
  const workflow = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const sourceContext = workflow.origin.source || new URLSearchParams(location.search).get('source') || '';
  const sourceLabel = formatWorkflowSourceLabel(sourceContext);
  const upstreamSource =
    workflow.origin.source && workflow.origin.source !== sourceContext ? workflow.origin.source : '';
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);

  const [tokenType, setTokenType] = useState<PortalTokenType>(() => selectDefaultMode(location.search));
  const [scopes, setScopes] = useState<PortalScope[]>(() => (selectDefaultMode(location.search) === 'quote' ? [...QUOTE_SCOPES] : [...ORDER_SCOPES]));
  const [form, setForm] = useState<PortalFormState>(() => ({
    entity_id: defaultEntityId(location.search, selectDefaultMode(location.search)),
    customer_id: workflow.origin.customer,
    expires_in_days: '30',
    rate_limit: '10',
    quote_id: workflow.focus.quoteId || '',
  }));
  const [tokens, setTokens] = useState<PortalTokenRecord[]>([]);
  const [selectedTokenValue, setSelectedTokenValue] = useState('');
  const [quotePreview, setQuotePreview] = useState<PortalQuoteViewRecord | null>(null);
  const [orderPreview, setOrderPreview] = useState<PortalOrderStatusRecord | null>(null);
  const [timeline, setTimeline] = useState<PortalTimelineRecord | null>(null);
  const [qualityDocs, setQualityDocs] = useState<PortalQualityDocumentRecord[]>([]);
  const [portalDocs, setPortalDocs] = useState<PortalQualityDocumentRecord[]>([]);
  const [portalMessages, setPortalMessages] = useState<PortalMessageRecord[]>([]);
  const [serviceCases, setServiceCases] = useState<PortalServiceCaseRecord[]>([]);
  const [advanceForm, setAdvanceForm] = useState<MilestoneAdvanceState>({
    milestone_key: '',
    notes: '',
    advanced_by: 'portal-ops',
  });
  const [qualityDocForm, setQualityDocForm] = useState<QualityDocState>({
    doc_type: 'inspection_report',
    title: '',
    status: 'approved',
    notes: '',
  });
  const [serviceCaseForm, setServiceCaseForm] = useState<ServiceCaseFormState>({
    subject: '',
    summary: '',
    severity: 'normal',
    owner: 'customer-success',
    sla_hours: '48',
  });
  const [serviceCaseDrafts, setServiceCaseDrafts] = useState<Record<string, ServiceCaseDraftState>>({});
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingServiceCases, setLoadingServiceCases] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const nextMode = selectDefaultMode(location.search);
    const nextEntityId = defaultEntityId(location.search, nextMode);
    const nextQuoteId = workflow.focus.quoteId || (nextMode === 'quote' ? nextEntityId : '');
    setTokenType(nextMode);
    setScopes(nextMode === 'quote' ? [...QUOTE_SCOPES] : [...ORDER_SCOPES]);
    setForm((current) => ({
      ...current,
      entity_id: nextEntityId,
      customer_id: workflow.origin.customer,
      quote_id: nextQuoteId,
    }));
  }, [location.search, workflow.focus.quoteId, workflow.origin.customer]);

  useEffect(() => {
    if (!form.entity_id.trim()) {
      setTokens([]);
      setSelectedTokenValue('');
      return;
    }

    let cancelled = false;
    setLoadingTokens(true);
    setError('');

    void listPortalTokens(form.entity_id.trim())
      .then((result) => {
        if (cancelled) return;
        const filtered = result.filter((token) => token.token_type === tokenType);
        setTokens(filtered);
        setSelectedTokenValue((current) => {
          if (filtered.some((token) => token.token === current)) {
            return current;
          }
          return filtered[0]?.token || '';
        });
      })
      .catch((issue: unknown) => {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Unable to load customer portal tokens.');
          setTokens([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTokens(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.entity_id, tokenType]);

  const selectedToken = useMemo(
    () => tokens.find((token) => token.token === selectedTokenValue) ?? null,
    [selectedTokenValue, tokens],
  );
  const activeFocus = tokenType === 'quote'
    ? { type: 'quote', id: form.entity_id.trim(), quoteId: form.entity_id.trim() }
    : { type: 'job', id: form.entity_id.trim(), jobId: form.entity_id.trim() };

  useEffect(() => {
    if (!selectedToken) {
      setQuotePreview(null);
      setOrderPreview(null);
      setTimeline(null);
      setQualityDocs([]);
      setPortalDocs([]);
      setPortalMessages([]);
      setServiceCases([]);
      setServiceCaseDrafts({});
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setError('');

    async function loadPreview() {
      if (selectedToken.token_type === 'quote') {
        const preview = await getPortalQuoteView(selectedToken.token);
        if (cancelled) return;
        setQuotePreview(preview);
        setOrderPreview(null);
        setTimeline(null);
        setQualityDocs([]);
        setPortalDocs([]);
        setPortalMessages([]);
        return;
      }

      const [orderStatus, internalTimeline, docs, publicDocs, messages] = await Promise.all([
        getPortalOrderStatus(selectedToken.token),
        getPortalMilestoneTimeline(selectedToken.entity_id).catch(() => null),
        listPortalQualityDocuments(selectedToken.entity_id).catch(() => []),
        listPortalOrderDocuments(selectedToken.token).catch(() => []),
        listPortalOrderMessages(selectedToken.token).catch(() => []),
      ]);
      if (cancelled) return;
      setQuotePreview(null);
      setOrderPreview(orderStatus);
      setTimeline(internalTimeline);
      setQualityDocs(docs);
      setPortalDocs(publicDocs);
      setPortalMessages(messages);
    }

    void loadPreview()
      .catch((issue: unknown) => {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Unable to load customer portal preview.');
          setQuotePreview(null);
          setOrderPreview(null);
          setTimeline(null);
          setQualityDocs([]);
          setPortalDocs([]);
          setPortalMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedToken]);

  useEffect(() => {
    if (!selectedToken) {
      setServiceCases([]);
      setServiceCaseDrafts({});
      return;
    }

    let cancelled = false;
    setLoadingServiceCases(true);

    void listPortalServiceCases(selectedToken.token_type, selectedToken.entity_id)
      .then((result) => {
        if (cancelled) return;
        setServiceCases(result);
        setServiceCaseDrafts(buildServiceCaseDraftMap(result));
      })
      .catch((issue: unknown) => {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Unable to load service cases.');
          setServiceCases([]);
          setServiceCaseDrafts({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingServiceCases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedToken]);

  function updateScopes(scope: PortalScope) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((entry) => entry !== scope) : [...current, scope],
    );
  }

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await createPortalToken({
        token_type: tokenType,
        entity_id: form.entity_id.trim(),
        customer_id: form.customer_id.trim() || undefined,
        scope: scopes,
        expires_in_days: Number(form.expires_in_days) || undefined,
        rate_limit: Number(form.rate_limit) || undefined,
      });
      setMessage(`Created ${created.token_type} portal token for ${created.entity_id}.`);
      const refreshed = await listPortalTokens(form.entity_id.trim());
      const filtered = refreshed.filter((token) => token.token_type === tokenType);
      setTokens(filtered);
      setSelectedTokenValue(created.token);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to create portal token.');
    }
  }

  async function handleRevokeToken(token: string) {
    setError('');
    setMessage('');
    try {
      await revokePortalToken(token);
      setMessage('Portal token revoked.');
      const refreshed = await listPortalTokens(form.entity_id.trim());
      const filtered = refreshed.filter((entry) => entry.token_type === tokenType);
      setTokens(filtered);
      setSelectedTokenValue((current) => (current === token ? filtered[0]?.token || '' : current));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to revoke portal token.');
    }
  }

  async function handleCreateTimeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedToken || selectedToken.token_type !== 'order') return;
    setError('');
    setMessage('');
    try {
      const created = await createPortalMilestoneTimeline({
        job_id: selectedToken.entity_id,
        quote_id: form.quote_id.trim() || undefined,
        customer_id: form.customer_id.trim() || undefined,
      });
      setTimeline(created);
      setMessage(`Created milestone timeline for ${selectedToken.entity_id}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to create milestone timeline.');
    }
  }

  async function handleAdvanceMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedToken || selectedToken.token_type !== 'order') return;
    setError('');
    setMessage('');
    try {
      const updated = await advancePortalMilestone(selectedToken.entity_id, {
        milestone_key: advanceForm.milestone_key.trim() || undefined,
        notes: advanceForm.notes.trim() || undefined,
        advanced_by: advanceForm.advanced_by.trim() || undefined,
      });
      setTimeline(updated);
      const preview = await getPortalOrderStatus(selectedToken.token);
      setOrderPreview(preview);
      setAdvanceForm((current) => ({ ...current, notes: '' }));
      setMessage(`Advanced portal milestone for ${selectedToken.entity_id}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to advance milestone.');
    }
  }

  async function handleAddQualityDoc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedToken || selectedToken.token_type !== 'order') return;
    setError('');
    setMessage('');
    try {
      await addPortalQualityDocument({
        job_id: selectedToken.entity_id,
        doc_type: qualityDocForm.doc_type,
        title: qualityDocForm.title.trim(),
        status: qualityDocForm.status,
        notes: qualityDocForm.notes.trim() || undefined,
      });
      const [internalDocs, publicDocs] = await Promise.all([
        listPortalQualityDocuments(selectedToken.entity_id),
        listPortalOrderDocuments(selectedToken.token).catch(() => []),
      ]);
      setQualityDocs(internalDocs);
      setPortalDocs(publicDocs);
      setQualityDocForm({
        doc_type: 'inspection_report',
        title: '',
        status: 'approved',
        notes: '',
      });
      setMessage(`Added quality document for ${selectedToken.entity_id}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to add quality document.');
    }
  }

  async function handleCreateServiceCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedToken) return;
    setError('');
    setMessage('');

    try {
      await createPortalServiceCase({
        entity_type: selectedToken.token_type,
        entity_id: selectedToken.entity_id,
        customer_id: form.customer_id.trim() || undefined,
        subject: serviceCaseForm.subject.trim(),
        summary: serviceCaseForm.summary.trim(),
        severity: serviceCaseForm.severity,
        owner: serviceCaseForm.owner.trim() || undefined,
        sla_hours: Number(serviceCaseForm.sla_hours) || undefined,
      });

      const refreshed = await listPortalServiceCases(selectedToken.token_type, selectedToken.entity_id);
      setServiceCases(refreshed);
      setServiceCaseDrafts(buildServiceCaseDraftMap(refreshed));
      setServiceCaseForm((current) => ({
        ...current,
        subject: '',
        summary: '',
      }));
      setMessage(`Created service case for ${selectedToken.entity_id}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to create service case.');
    }
  }

  async function handleUpdateServiceCase(caseId: string, options?: { escalate?: boolean }) {
    if (!selectedToken) return;
    const draft = serviceCaseDrafts[caseId];
    if (!draft) return;

    setError('');
    setMessage('');

    try {
      await updatePortalServiceCase(caseId, {
        status: options?.escalate ? undefined : draft.status,
        owner: draft.owner.trim() || undefined,
        escalate: options?.escalate,
        satisfaction_score: draft.satisfaction_score ? Number(draft.satisfaction_score) : undefined,
      });

      const refreshed = await listPortalServiceCases(selectedToken.token_type, selectedToken.entity_id);
      setServiceCases(refreshed);
      setServiceCaseDrafts(buildServiceCaseDraftMap(refreshed));
      setMessage(options?.escalate ? 'Service case escalated.' : 'Service case updated.');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to update service case.');
    }
  }

  const links = {
    customers: buildWorkflowPath('/customers', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'customer-portal', recordType: tokenType === 'quote' ? 'Quote' : 'Order', recordId: form.entity_id.trim(), customer: form.customer_id.trim(), note: '', threadId: workflow.origin.threadId },
      focus: activeFocus,
      extras: { source: 'customer-portal', note: 'Carry customer portal context back into Customers & CRM.' },
    }),
    messages: buildWorkflowPath('/messages', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'customer-portal', recordType: tokenType === 'quote' ? 'Quote' : 'Order', recordId: form.entity_id.trim(), customer: form.customer_id.trim(), note: '', threadId: workflow.origin.threadId },
      focus: activeFocus,
      extras: { source: 'customer-portal', thread: selectedToken?.token, note: 'Carry customer portal context into Messages follow-up.' },
    }),
    orders: buildWorkflowPath('/orders', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'customer-portal', recordType: 'Order', recordId: form.entity_id.trim(), customer: form.customer_id.trim(), note: '', threadId: workflow.origin.threadId },
      focus: activeFocus,
      extras: { source: 'customer-portal', note: 'Carry portal milestone context into Order Tracking.' },
    }),
    quality: buildWorkflowPath('/quality', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'customer-portal', recordType: 'Order', recordId: form.entity_id.trim(), customer: form.customer_id.trim(), note: '', threadId: workflow.origin.threadId },
      focus: activeFocus,
      extras: { source: 'customer-portal', note: 'Carry portal quality publication context into Quality Management.' },
    }),
  };

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 pb-10">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,20,28,0.96)_0%,rgba(8,13,19,0.98)_100%)] px-6 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Customer-facing share controls
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Customer Portal</h1>
              <p className="mt-3 text-base leading-7 text-slate-300">
                Generate portal tokens, preview what customers can actually see, and keep milestone, document, and follow-up state attached to the same workflow.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile label="Active tokens" value={String(tokens.length)} />
            <SummaryTile label="Public docs" value={String(portalDocs.length)} />
            <SummaryTile label="Messages" value={String(portalMessages.length)} />
            <SummaryTile label="Convergence" value="Live routes" />
          </div>
        </div>
      </section>

      {sourceContext ? (
        <section className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.08] px-5 py-4 text-sm text-cyan-50">
          <div className="font-semibold">{sourceLabel} opened Customer Portal with workflow context.</div>
          <div className="mt-2 text-cyan-50/80">Keep the commercial and execution context attached as portal work moves back into customers, messages, orders, or quality.</div>
          {upstreamSource ? <div className="mt-2 text-cyan-50/80">Upstream commercial origin: <span className="font-semibold text-cyan-50">{upstreamSourceLabel}</span></div> : null}
        </section>
      ) : null}

      {error ? <section className="rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-5 py-4 text-sm text-rose-50">{error}</section> : null}
      {message ? <section className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-5 py-4 text-sm text-emerald-50">{message}</section> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="space-y-6">
          <Panel title="Portal token controls" subtitle="Use the mounted internal routes instead of ad hoc copied links.">
            <form className="grid gap-4" onSubmit={handleCreateToken}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>Portal lane</span>
                  <select
                    aria-label="Portal lane"
                    value={tokenType}
                    onChange={(event) => {
                      const nextType = event.target.value as PortalTokenType;
                      const nextEntityId = defaultEntityId(location.search, nextType);
                      setTokenType(nextType);
                      setScopes(nextType === 'quote' ? [...QUOTE_SCOPES] : [...ORDER_SCOPES]);
                      setForm((current) => ({
                        ...current,
                        entity_id: nextEntityId || current.entity_id,
                        quote_id:
                          nextType === 'quote'
                            ? workflow.focus.quoteId || nextEntityId || current.quote_id
                            : workflow.focus.quoteId || '',
                      }));
                    }}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  >
                    <option value="quote">Quote portal</option>
                    <option value="order">Order portal</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{tokenType === 'quote' ? 'Quote id' : 'Job id'}</span>
                  <input
                    value={form.entity_id}
                    onChange={(event) => setForm((current) => ({ ...current, entity_id: event.target.value }))}
                    placeholder={tokenType === 'quote' ? 'QUO-1933' : 'JOB-4821'}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>Customer reference</span>
                  <input
                    value={form.customer_id}
                    onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))}
                    placeholder="Acme Aerospace"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>Expires (days)</span>
                  <input
                    value={form.expires_in_days}
                    onChange={(event) => setForm((current) => ({ ...current, expires_in_days: event.target.value }))}
                    inputMode="numeric"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>Rate limit / min</span>
                  <input
                    value={form.rate_limit}
                    onChange={(event) => setForm((current) => ({ ...current, rate_limit: event.target.value }))}
                    inputMode="numeric"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-slate-300">Scopes</div>
                <div className="flex flex-wrap gap-2">
                  {(tokenType === 'quote' ? QUOTE_SCOPES : ORDER_SCOPES).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => updateScopes(scope)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${scopes.includes(scope) ? 'border-cyan-300/36 bg-cyan-300/[0.08] text-cyan-50' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'}`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-fit rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                Create portal token
              </button>
            </form>
          </Panel>

          <Panel title="Active tokens" subtitle="Select a live token to inspect the exact mounted portal payloads.">
            {loadingTokens ? <LoadingState label="Loading portal tokens..." /> : null}
            <div className="grid gap-3">
              {tokens.length === 0 && !loadingTokens ? (
                <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                  No {tokenType} portal tokens are active for this record yet.
                </div>
              ) : null}
              {tokens.map((token) => (
                <div key={token.token} className={`rounded-[22px] border px-4 py-4 ${selectedTokenValue === token.token ? 'border-cyan-300/36 bg-cyan-300/[0.08]' : 'border-white/8 bg-white/[0.03]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedTokenValue(token.token)} className="text-left">
                      <div className="text-sm font-semibold text-slate-50">{token.entity_id}</div>
                      <div className="mt-2 font-mono text-xs text-slate-300">{token.token}</div>
                    </button>
                    <button type="button" onClick={() => void handleRevokeToken(token.token)} className="rounded-full border border-rose-300/18 bg-rose-300/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100">
                      Revoke
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                    <div>Scope: <span className="font-semibold text-slate-100">{token.scope.join(' / ')}</span></div>
                    <div>Accesses: <span className="font-semibold text-slate-100">{token.access_count}</span></div>
                    <div>Preview: <span className="font-mono text-slate-100">{tokenPreviewPath(token)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={selectedToken?.token_type === 'order' ? 'Order portal preview' : 'Quote portal preview'} subtitle="Preview the same mounted customer portal payloads the token exposes.">
            {loadingPreview ? <LoadingState label="Loading portal preview..." /> : null}
            {!selectedToken && !loadingPreview ? (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                Select or create a portal token to load the preview surface.
              </div>
            ) : null}

            {quotePreview ? (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-50">Quote {quotePreview.quote_id}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-slate-300">Revision <span className="font-semibold text-slate-100">#{quotePreview.revision_number}</span></div>
                    <div className="text-sm text-slate-300">Status <span className="font-semibold text-slate-100">{quotePreview.status}</span></div>
                    <div className="text-sm text-slate-300">Unit <span className="font-semibold text-slate-100">${quotePreview.unit_price_usd.toFixed(2)}</span></div>
                    <div className="text-sm text-slate-300">Total <span className="font-semibold text-slate-100">${quotePreview.total_price_usd.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-50">Customer-visible DFM issues</div>
                  <div className="mt-3 grid gap-2">
                    {quotePreview.dfm_issues.length === 0 ? <div className="text-sm text-slate-400">No customer-visible DFM issues are attached to this revision.</div> : null}
                    {quotePreview.dfm_issues.map((issue) => (
                      <div key={`${issue.severity}-${issue.message}`} className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-sm text-slate-200">
                        <div className="font-semibold text-slate-50">{issue.severity}</div>
                        <div className="mt-1">{issue.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {orderPreview ? (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-50">{orderPreview.job_id}</div>
                  <div className="mt-2 text-base text-slate-200">{orderPreview.part_number}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-slate-300">Status <span className="font-semibold text-slate-100">{orderPreview.status}</span></div>
                    <div className="text-sm text-slate-300">Milestone <span className="font-semibold text-slate-100">{orderPreview.current_milestone || 'Unstarted'}</span></div>
                    <div className="text-sm text-slate-300">Progress <span className="font-semibold text-slate-100">{orderPreview.progress_pct}%</span></div>
                    <div className="text-sm text-slate-300">Delivery <span className="font-semibold text-slate-100">{orderPreview.estimated_delivery || 'TBD'}</span></div>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">Internal milestone timeline</div>
                    <div className="mt-3 grid gap-2">
                      {!timeline || (timeline.milestones?.length ?? 0) === 0 ? (
                        <div className="text-sm text-slate-400">No internal milestone timeline is seeded for this job yet.</div>
                      ) : null}
                      {timeline?.milestones?.map((entry) => (
                        <div key={entry.key} className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-sm text-slate-200">
                          <div className="font-semibold text-slate-50">{entry.label}</div>
                          <div className="mt-1 text-slate-300">{entry.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">Public docs</div>
                    <div className="mt-3 grid gap-2">
                      {portalDocs.length === 0 ? <div className="text-sm text-slate-400">No approved documents are visible through the portal yet.</div> : null}
                      {portalDocs.map((doc) => <div key={doc.id} className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-sm text-slate-200">{doc.title}</div>)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">Portal messages</div>
                    <div className="mt-3 grid gap-2">
                      {portalMessages.length === 0 ? <div className="text-sm text-slate-400">No portal messages are attached to this token yet.</div> : null}
                      {portalMessages.map((entry) => <div key={entry.id} className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-sm text-slate-200">{entry.sender_name}: {entry.message}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Portal operations" subtitle="Keep milestones, quality docs, and follow-up tied to the same order token.">
            {selectedToken?.token_type !== 'order' ? (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                Order portal operations unlock when an order token is selected.
              </div>
            ) : (
              <div className="space-y-5">
                <form className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4" onSubmit={handleCreateTimeline}>
                  <div className="text-sm font-semibold text-slate-50">Seed milestone timeline</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={form.quote_id}
                      onChange={(event) => setForm((current) => ({ ...current, quote_id: event.target.value }))}
                      placeholder="Quote reference"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                    <input
                      value={form.customer_id}
                      onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))}
                      placeholder="Customer reference"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-fit rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                    Create milestone timeline
                  </button>
                </form>

                <form className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4" onSubmit={handleAdvanceMilestone}>
                  <div className="text-sm font-semibold text-slate-50">Advance milestone</div>
                  <input
                    value={advanceForm.milestone_key}
                    onChange={(event) => setAdvanceForm((current) => ({ ...current, milestone_key: event.target.value }))}
                    placeholder="Milestone key (optional)"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                  <input
                    value={advanceForm.notes}
                    onChange={(event) => setAdvanceForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Advance notes"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                  <button type="submit" className="w-fit rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.04]">
                    Advance portal milestone
                  </button>
                </form>

                <form className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4" onSubmit={handleAddQualityDoc}>
                  <div className="text-sm font-semibold text-slate-50">Publish quality document</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      aria-label="Portal quality document type"
                      value={qualityDocForm.doc_type}
                      onChange={(event) => setQualityDocForm((current) => ({ ...current, doc_type: event.target.value as QualityDocState['doc_type'] }))}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    >
                      <option value="inspection_report">Inspection report</option>
                      <option value="material_cert">Material cert</option>
                      <option value="coc">C of C</option>
                      <option value="fai_as9102">FAI AS9102</option>
                      <option value="ndt_report">NDT report</option>
                    </select>
                    <select
                      aria-label="Portal quality document status"
                      value={qualityDocForm.status}
                      onChange={(event) => setQualityDocForm((current) => ({ ...current, status: event.target.value as QualityDocState['status'] }))}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending_review">Pending review</option>
                      <option value="draft">Draft</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <input
                      value={qualityDocForm.title}
                      onChange={(event) => setQualityDocForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Document title"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <input
                    value={qualityDocForm.notes}
                    onChange={(event) => setQualityDocForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Publication notes"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                  <button type="submit" className="w-fit rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.04]">
                    Add quality doc
                  </button>
                </form>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-50">Internal quality register</div>
                  <div className="mt-3 grid gap-2">
                    {qualityDocs.length === 0 ? <div className="text-sm text-slate-400">No internal quality documents are attached to this job yet.</div> : null}
                    {qualityDocs.map((doc) => (
                      <div key={doc.id} className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-sm text-slate-200">
                        {doc.title} · {doc.status}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Service cases and SLA" subtitle="Turn portal follow-up into an owned service lane with explicit response timing and satisfaction capture.">
            {!selectedToken ? (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                Select or create a portal token to stage customer service cases.
              </div>
            ) : (
              <div className="space-y-5">
                <form className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4" onSubmit={handleCreateServiceCase}>
                  <div className="text-sm font-semibold text-slate-50">Open service case</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={serviceCaseForm.subject}
                      onChange={(event) => setServiceCaseForm((current) => ({ ...current, subject: event.target.value }))}
                      placeholder="Service case subject"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                    <input
                      value={serviceCaseForm.owner}
                      onChange={(event) => setServiceCaseForm((current) => ({ ...current, owner: event.target.value }))}
                      placeholder="Owner"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      aria-label="Service case severity"
                      value={serviceCaseForm.severity}
                      onChange={(event) => setServiceCaseForm((current) => ({ ...current, severity: event.target.value as ServiceCaseFormState['severity'] }))}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <input
                      value={serviceCaseForm.sla_hours}
                      onChange={(event) => setServiceCaseForm((current) => ({ ...current, sla_hours: event.target.value }))}
                      placeholder="SLA hours"
                      inputMode="numeric"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <textarea
                    value={serviceCaseForm.summary}
                    onChange={(event) => setServiceCaseForm((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Describe the customer issue, ask, or escalation reason"
                    rows={3}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                  />
                  <button type="submit" className="w-fit rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                    Create service case
                  </button>
                </form>

                {loadingServiceCases ? <LoadingState label="Loading service cases..." /> : null}

                <div className="grid gap-3">
                  {serviceCases.length === 0 && !loadingServiceCases ? (
                    <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                      No service cases are attached to this portal record yet.
                    </div>
                  ) : null}

                  {serviceCases.map((serviceCase) => {
                    const draft = serviceCaseDrafts[serviceCase.id] ?? buildServiceCaseDraft(serviceCase);
                    return (
                      <div key={serviceCase.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{serviceCase.subject}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-300">{serviceCase.summary}</div>
                          </div>
                          <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${serviceCaseTone(serviceCase)}`}>
                            {serviceCase.status}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                          <div>Severity <span className="font-semibold text-slate-100">{serviceCase.severity}</span></div>
                          <div>SLA <span className="font-semibold text-slate-100">{formatServiceCaseSla(serviceCase)}</span></div>
                          <div>Escalation <span className="font-semibold text-slate-100">L{serviceCase.escalation_level}</span></div>
                          <div>Owner <span className="font-semibold text-slate-100">{serviceCase.owner || 'Unassigned'}</span></div>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-[20px] border border-white/8 bg-slate-950/40 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                          <select
                            aria-label={`Status for ${serviceCase.subject}`}
                            value={draft.status}
                            onChange={(event) =>
                              setServiceCaseDrafts((current) => ({
                                ...current,
                                [serviceCase.id]: {
                                  ...draft,
                                  status: event.target.value as PortalServiceCaseRecord['status'],
                                },
                              }))
                            }
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                          >
                            <option value="open">Open</option>
                            <option value="waiting_on_shop">Waiting on shop</option>
                            <option value="waiting_on_customer">Waiting on customer</option>
                            <option value="escalated">Escalated</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <input
                            aria-label={`Owner for ${serviceCase.subject}`}
                            value={draft.owner}
                            onChange={(event) =>
                              setServiceCaseDrafts((current) => ({
                                ...current,
                                [serviceCase.id]: {
                                  ...draft,
                                  owner: event.target.value,
                                },
                              }))
                            }
                            placeholder="Owner"
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                          />
                          <select
                            aria-label={`Satisfaction score for ${serviceCase.subject}`}
                            value={draft.satisfaction_score}
                            onChange={(event) =>
                              setServiceCaseDrafts((current) => ({
                                ...current,
                                [serviceCase.id]: {
                                  ...draft,
                                  satisfaction_score: event.target.value,
                                },
                              }))
                            }
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
                          >
                            <option value="">Satisfaction</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void handleUpdateServiceCase(serviceCase.id);
                              }}
                              className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.04]"
                            >
                              Update case
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleUpdateServiceCase(serviceCase.id, { escalate: true });
                              }}
                              className="rounded-full border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-300/[0.12]"
                            >
                              Escalate case
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Workflow continuity" subtitle="Carry portal context cleanly back into the surrounding commercial and execution desks.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to={links.customers} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]">Open Customers follow-up</Link>
              <Link to={links.messages} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]">Open Messages follow-up</Link>
              <Link to={links.orders} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]">Open Order Tracking</Link>
              <Link to={links.quality} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.05]">Open Quality follow-up</Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
