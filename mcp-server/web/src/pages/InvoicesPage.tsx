import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, createInvoice, listInvoices } from '../api/client';
import { AppwInvoicesCopilot } from '../components/puoa/AppwInvoicesCopilot';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { Invoice } from '../api/types';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-violet-400/22 via-violet-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-300/32 ${props.className ?? ''}`}
    />
  );
}

function formatRefreshLabel(timestamp: number | null) {
  if (!timestamp) {
    return 'Not refreshed in this session';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function InvoiceSourcePostureCard({
  label,
  source,
  refreshedAt,
  selection,
  unavailableReason,
}: {
  label: string;
  source: string;
  refreshedAt: number | null;
  selection: string;
  unavailableReason?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 font-semibold text-slate-100">{source}</div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            unavailableReason
              ? 'border-amber-300/22 bg-amber-300/[0.10] text-amber-50'
              : 'border-emerald-300/22 bg-emerald-300/[0.10] text-emerald-50'
          }`}
        >
          {unavailableReason ? 'Unavailable' : 'Mounted'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div>Last refresh: {formatRefreshLabel(refreshedAt)}</div>
        <div>Selection: {selection}</div>
      </div>
      {unavailableReason ? (
        <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-300/[0.08] px-3 py-3 text-xs leading-5 text-amber-50">
          Unavailable reason: {unavailableReason}
        </div>
      ) : null}
    </div>
  );
}

export function InvoicesPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const routedInvoiceId =
    routeParams.get('invoiceId')
    || (routeContext.focus.type === 'invoice' ? routeContext.focus.id : routeContext.origin.recordType === 'Invoice' ? routeContext.origin.recordId : '');
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newJobId, setNewJobId] = useState('');
  const [newMarkup, setNewMarkup] = useState('15');
  const [invoicesRefreshedAt, setInvoicesRefreshedAt] = useState<number | null>(null);
  const [createCompletedAt, setCreateCompletedAt] = useState<number | null>(null);
  const [listIssue, setListIssue] = useState<string | null>(null);
  const [createIssue, setCreateIssue] = useState<string | null>(null);
  const [lastCreatedJobId, setLastCreatedJobId] = useState<string | null>(null);

  async function loadInvoices() {
    setLoading(true);
    setError(null);
    setListIssue(null);
    try {
      const response = await listInvoices(filter !== 'all' ? { status: filter } : undefined);
      setInvoices((((response.result as unknown as { invoices?: Invoice[] })?.invoices) ?? []));
      setInvoicesRefreshedAt(Date.now());
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Failed to load invoices';
      setError(message);
      setListIssue(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  }, [filter]);

  async function handleCreate() {
    if (!newJobId) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setCreateIssue(null);
    const jobId = newJobId;
    try {
      await createInvoice({ job_id: jobId, markup_percent: parseFloat(newMarkup) || 15 });
      setShowCreate(false);
      setNewJobId('');
      setNewMarkup('15');
      setLastCreatedJobId(jobId);
      setCreateCompletedAt(Date.now());
      setNotice(`Invoice created for ${jobId}.`);
      await loadInvoices();
    } catch (issue) {
      const message = issue instanceof ApiError ? issue.message : 'Failed to create invoice';
      setError(message);
      setCreateIssue(message);
      setLoading(false);
    }
  }

  const totalOutstanding = useMemo(
    () => invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.balance_due, 0),
    [invoices],
  );
  const totalPaid = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0),
    [invoices],
  );
  const overdueCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'overdue').length,
    [invoices],
  );
  const sentCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'sent').length,
    [invoices],
  );
  const draftCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'draft').length,
    [invoices],
  );
  const activeInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === routedInvoiceId || invoice.job_id === routeContext.focus.jobId) ?? invoices[0] ?? null,
    [invoices, routeContext.focus.jobId, routedInvoiceId],
  );
  const workflowRecordType = activeInvoice ? 'Invoice' : routeContext.origin.recordType;
  const workflowRecordId = activeInvoice?.id || routedInvoiceId || routeContext.origin.recordId;
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'invoices',
            recordType: workflowRecordType,
            recordId: workflowRecordId,
            customer: activeInvoice?.customer_name || routeContext.origin.customer,
            note:
              routeContext.origin.note
              || `Keep ${activeInvoice ? activeInvoice.id : 'the active invoice'} attached while billing work moves into ledger review or finance analysis.`,
            threadId: routeContext.origin.threadId,
          },
    [activeInvoice, launcherSource, routeContext.origin, workflowRecordId, workflowRecordType],
  );
  const effectiveFocus = useMemo(
    () =>
      routeContext.focus.id
        ? routeContext.focus
        : activeInvoice?.job_id
          ? {
              type: 'job',
              id: activeInvoice.job_id,
              jobId: activeInvoice.job_id,
            }
          : undefined,
    [activeInvoice?.job_id, routeContext.focus],
  );
  const invoiceReference = workflowRecordType && workflowRecordId ? `${workflowRecordType} ${workflowRecordId}` : '';
  const generalLedgerPath = useMemo(
    () =>
      buildWorkflowPath('/general-ledger', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'invoices',
          invoiceId: activeInvoice?.id || routedInvoiceId,
          jobId: activeInvoice?.job_id || routeContext.focus.jobId,
        },
      }),
    [activeInvoice?.id, activeInvoice?.job_id, effectiveFocus, effectiveOrigin, location.search, routeContext.focus.jobId, routedInvoiceId],
  );
  const financialAnalysisPath = useMemo(
    () =>
      buildWorkflowPath('/financial-analysis', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'invoices',
          invoiceId: activeInvoice?.id || routedInvoiceId,
          jobId: activeInvoice?.job_id || routeContext.focus.jobId,
        },
      }),
    [activeInvoice?.id, activeInvoice?.job_id, effectiveFocus, effectiveOrigin, location.search, routeContext.focus.jobId, routedInvoiceId],
  );
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-300/20 text-slate-100',
    sent: 'bg-sky-300/20 text-sky-100',
    paid: 'bg-emerald-300/20 text-emerald-100',
    overdue: 'bg-rose-300/20 text-rose-100',
  };

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-violet-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(31,18,47,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-violet-300/16 bg-violet-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100">
              Commercial finance
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Invoices</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Create invoices from completed jobs, track cash collection posture, and keep outstanding exposure visible in one cleaner billing desk.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Invoice count" value={`${invoices.length}`} hint="Loaded invoices for the current filter." />
              <SummaryTile label="Outstanding" value={`$${totalOutstanding.toFixed(2)}`} hint="Open cash still left to collect." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
              <SummaryTile label="Collected" value={`$${totalPaid.toFixed(2)}`} hint="Paid invoice total in the current view." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Billing controls</div>
            <div className="mt-4 grid gap-3">
              {launcherSource ? (
                <div className="rounded-[22px] border border-violet-300/18 bg-violet-300/[0.08] px-4 py-4 text-sm leading-6 text-violet-50">
                  {launcherSourceLabel || 'This workflow'} opened Invoices with billing context.{' '}
                  {effectiveOrigin.note || 'Keep invoice follow-up attached while it moves into ledger review or finance analysis.'}
                  {invoiceReference ? (
                    <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-violet-100/90">
                      Record: <span className="font-semibold normal-case tracking-normal">{invoiceReference}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {upstreamSourceLabel ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                  Upstream billing origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowCreate((current) => !current)}
                className="rounded-[22px] border border-violet-300/20 bg-violet-300/[0.08] px-4 py-4 text-left text-violet-50 transition hover:bg-violet-300/[0.12]"
              >
                <div className="text-sm font-semibold">{showCreate ? 'Hide New Invoice' : 'New Invoice'}</div>
                <div className="mt-2 text-xs leading-5 text-slate-300">Create directly from a job without leaving the invoicing shell.</div>
              </button>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status filter</span>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-300/32"
                  >
                    <option value="all">All invoices</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Refreshing invoice desk..." /> : null}
      {error ? <ErrorState message={error} onRetry={loadInvoices} /> : null}
      {notice ? (
        <div className="rounded-[24px] border border-emerald-300/18 bg-emerald-300/[0.08] px-5 py-4 text-sm text-emerald-50">
          {notice}
        </div>
      ) : null}

      {showCreate ? (
        <PanelCard title="Create invoice" subtitle="A lighter billing intake lane that stays attached to the job workflow.">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_220px]">
            <Field label="Job ID">
              <Input type="text" value={newJobId} onChange={(event) => setNewJobId(event.target.value)} placeholder="JOB-2026-001" />
            </Field>
            <Field label="Markup %">
              <Input type="number" value={newMarkup} onChange={(event) => setNewMarkup(event.target.value)} />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  void handleCreate();
                }}
                disabled={loading || !newJobId}
                className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Create invoice
              </button>
            </div>
          </div>
        </PanelCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard title="Invoice desk" subtitle="Keep invoice count, balance, and customer posture in one scrollable board.">
            {invoices.length > 0 ? (
              <div className="grid gap-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[120px_120px_1.1fr_120px_120px_110px_120px]">
                    <div className="text-xs font-mono text-slate-400">{invoice.id}</div>
                    <div className="text-sm font-medium text-slate-50">{invoice.job_id}</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{invoice.customer_name}</div>
                      <div className="mt-2 text-sm text-slate-400">Due {invoice.due_date}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</div>
                      <div className="mt-2 font-mono text-slate-100">{invoice.date}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</div>
                      <div className="mt-2 font-mono text-slate-100">${invoice.total.toFixed(2)}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Balance</div>
                      <div className="mt-2 font-mono text-slate-100">${invoice.balance_due.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center md:justify-end">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[invoice.status] ?? statusColors.draft}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                Load the invoice desk to stage billing posture, outstanding exposure, and invoice-level status.
              </div>
            )}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <AppwInvoicesCopilot
            deskLabel="Invoices desk"
            activeLaneLabel="Invoice desk"
            activeLaneDetail="Create invoices, monitor collections posture, and preserve finance continuity without leaving the billing shell."
            filterLabel={filter === 'all' ? 'all invoices' : filter}
            invoiceCount={invoices.length}
            totalOutstanding={totalOutstanding}
            totalPaid={totalPaid}
            overdueCount={overdueCount}
            sentCount={sentCount}
            draftCount={draftCount}
            activeInvoiceId={activeInvoice?.id ?? null}
            activeJobId={activeInvoice?.job_id ?? null}
            activeCustomer={activeInvoice?.customer_name ?? null}
            activeStatus={activeInvoice?.status ?? null}
            invoicesRefreshedAt={invoicesRefreshedAt}
            createCompletedAt={createCompletedAt}
            listIssue={listIssue}
            createIssue={createIssue}
            lastCreatedJobId={lastCreatedJobId}
            launcherSourceLabel={launcherSourceLabel || null}
            upstreamSourceLabel={upstreamSourceLabel || null}
            workflowReference={invoiceReference || null}
          />

          <PanelCard title="Billing brief" subtitle="Keep collection posture visible while you move between create and review tasks.">
            <div className="grid gap-3">
              <SummaryTile label="Open balance" value={`$${totalOutstanding.toFixed(2)}`} hint="Cash exposure across non-paid invoices." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
              <SummaryTile label="Paid total" value={`$${totalPaid.toFixed(2)}`} hint="Collected revenue from paid invoices in the active view." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
              <SummaryTile label="Filter" value={filter === 'all' ? 'All' : filter} hint="Applied directly to the invoice desk." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Source posture" subtitle="Expose route freshness and billing lane health so finance can see which invoice surfaces are live, stale, or degraded.">
            <div className="grid gap-3">
              <InvoiceSourcePostureCard
                label="Invoice desk"
                source="Mounted listInvoices route"
                refreshedAt={invoicesRefreshedAt}
                selection={filter === 'all' ? 'all invoices' : filter}
                unavailableReason={listIssue}
              />
              <InvoiceSourcePostureCard
                label="Invoice create"
                source="Mounted createInvoice route"
                refreshedAt={createCompletedAt}
                selection={lastCreatedJobId || newJobId.trim() || 'standby'}
                unavailableReason={createIssue}
              />
            </div>
          </PanelCard>

          <PanelCard title="Recommended use" subtitle="Keep billing work crisp for sales, finance, and operations.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">1. Create invoices from job IDs as soon as routing and closeout data are stable.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">2. Use the outstanding lane as the daily collection-pressure view, not just as a static summary number.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">3. Filter by status when you need a cleaner AR conversation with finance or sales.</div>
            </div>
          </PanelCard>

          <PanelCard title="Finance handoff" subtitle="Keep billing follow-up attached as work moves into accounting and decision support.">
            <div className="grid gap-3">
              <Link
                to={generalLedgerPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Open General Ledger follow-up</div>
                <div className="mt-2 text-sky-50/80">
                  Carry invoice and job posture into ledger review without dropping the commercial origin.
                </div>
              </Link>

              <Link
                to={financialAnalysisPath}
                className="block rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-4 text-sm leading-6 text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.16]"
              >
                <div className="font-semibold">Open Financial Analysis follow-up</div>
                <div className="mt-2 text-emerald-50/80">
                  Pressure-test billing posture, margin assumptions, and collection exposure in the finance desk.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
