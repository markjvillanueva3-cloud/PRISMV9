import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  customerList,
  customerSearch,
  customerPipeline,
  customerTop,
  customerFollowUps,
  customerCreate,
  customerCreditCheck,
  customerAnalytics,
  customerLogComm,
  customerCommHistory,
  ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { Customer, SalesPipeline, CustomerAnalytics } from '../api/types';
import { buildCapturePath } from '../utils/captureRoute';
import { buildWorkflowPath } from '../utils/workflowRouteContext';

type Tab = 'list' | 'pipeline' | 'top' | 'followups' | 'credit' | 'create' | 'comms';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  list: { label: 'Customer List', detail: 'Active customer book, status, and pricing posture.' },
  pipeline: { label: 'Sales Pipeline', detail: 'Stage health, weighted value, and commercial drift.' },
  top: { label: 'Top Customers', detail: 'Revenue concentration and delivery performance.' },
  followups: { label: 'Follow-ups', detail: 'Pending follow-up work that should not get lost.' },
  credit: { label: 'Credit + Analytics', detail: 'Credit approval and account analytics in one place.' },
  create: { label: 'New Customer', detail: 'Onboard a new customer without the old admin feel.' },
  comms: { label: 'Communications', detail: 'Log and review account communication history.' },
};

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{hint}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
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

export function CustomersPage() {
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pipeline, setPipeline] = useState<SalesPipeline | null>(null);
  const [topCustomers, setTopCustomers] = useState<CustomerAnalytics[]>([]);
  const [followUps, setFollowUps] = useState<Array<Record<string, unknown>>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditCustId, setCreditCustId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditResult, setCreditResult] = useState<Record<string, unknown> | null>(null);
  const [analyticsCustId, setAnalyticsCustId] = useState('');
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [newCust, setNewCust] = useState({ company: '', contact_name: '', email: '', phone: '', pricing_tier: 'standard', credit_limit: '' });
  const [createResult, setCreateResult] = useState<Record<string, unknown> | null>(null);
  const [commCustId, setCommCustId] = useState('');
  const [commType, setCommType] = useState('email');
  const [commNotes, setCommNotes] = useState('');
  const [commHistory, setCommHistory] = useState<Array<Record<string, unknown>>>([]);
  const [commResult, setCommResult] = useState<Record<string, unknown> | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'list') {
        const response = searchQuery ? await customerSearch({ query: searchQuery }) : await customerList(statusFilter !== 'all' ? { status: statusFilter } : undefined);
        setCustomers(
          (response.result as unknown as { customers?: Customer[] })?.customers ??
            (response.result as unknown as Customer[]) ??
            [],
        );
      } else if (tab === 'pipeline') {
        const response = await customerPipeline();
        setPipeline(response.result as unknown as SalesPipeline);
      } else if (tab === 'top') {
        const response = await customerTop({ limit: 10 });
        setTopCustomers(
          (response.result as unknown as { customers?: CustomerAnalytics[] })?.customers ??
            (response.result as unknown as CustomerAnalytics[]) ??
            [],
        );
      } else if (tab === 'followups') {
        const response = await customerFollowUps();
        setFollowUps(
          (response.result as unknown as { follow_ups?: Array<Record<string, unknown>> })?.follow_ups ??
            (response.result as unknown as Array<Record<string, unknown>>) ??
            [],
        );
      }
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (['list', 'pipeline', 'top', 'followups'].includes(tab)) void loadData();
  }, [tab, statusFilter]);

  async function doCredit() {
    setLoading(true);
    setError(null);
    try {
      const response = await customerCreditCheck({ customer_id: creditCustId, order_amount: parseFloat(creditAmount) || 0 });
      setCreditResult((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Credit check failed');
    } finally {
      setLoading(false);
    }
  }

  async function doAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const response = await customerAnalytics({ customer_id: analyticsCustId });
      setAnalyticsData((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Analytics failed');
    } finally {
      setLoading(false);
    }
  }

  async function doCreate() {
    setLoading(true);
    setError(null);
    try {
      const response = await customerCreate({ ...newCust, credit_limit: parseFloat(newCust.credit_limit) || 0 });
      setCreateResult((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  }

  async function doLogComm() {
    setLoading(true);
    setError(null);
    try {
      const response = await customerLogComm({ customer_id: commCustId, type: commType, notes: commNotes });
      setCommResult((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to log');
    } finally {
      setLoading(false);
    }
  }

  async function doCommHistory() {
    setLoading(true);
    setError(null);
    try {
      const response = await customerCommHistory({ customer_id: commCustId });
      setCommHistory(
        (response.result as unknown as { communications?: Array<Record<string, unknown>> })?.communications ??
          (response.result as unknown as Array<Record<string, unknown>>) ??
          [],
      );
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  const tierColors: Record<string, string> = {
    standard: 'bg-slate-200/20 text-slate-200',
    preferred: 'bg-sky-300/20 text-sky-100',
    contract: 'bg-violet-300/20 text-violet-100',
    wholesale: 'bg-emerald-300/20 text-emerald-100',
  };

  const activeCustomerContext = useMemo(() => {
    if (commCustId) {
      return { id: commCustId, name: '', lane: 'Communications', intent: 'bridge' as const };
    }

    if (creditCustId) {
      return { id: creditCustId, name: '', lane: 'Credit + Analytics', intent: 'bridge' as const };
    }

    if (analyticsCustId) {
      return { id: analyticsCustId, name: '', lane: 'Credit + Analytics', intent: 'production' as const };
    }

    if (tab === 'list' && customers[0]) {
      return { id: customers[0].id, name: customers[0].company, lane: 'Customer List', intent: customers[0].status === 'prospect' ? ('prototype' as const) : ('bridge' as const) };
    }

    if (tab === 'top' && topCustomers[0]) {
      return { id: topCustomers[0].customer_id, name: topCustomers[0].customer_name, lane: 'Top Customers', intent: 'production' as const };
    }

    if (tab === 'followups' && followUps[0]) {
      return {
        id: String(followUps[0].customer_id ?? ''),
        name: String(followUps[0].customer_name ?? ''),
        lane: 'Follow-ups',
        intent: 'bridge' as const,
      };
    }

    if (createResult || newCust.company) {
      return {
        id: String(createResult?.id ?? ''),
        name: newCust.company,
        lane: 'New Customer',
        intent: 'prototype' as const,
      };
    }

    return { id: '', name: '', lane: TAB_CONFIG[tab].label, intent: 'bridge' as const };
  }, [
    analyticsCustId,
    commCustId,
    createResult,
    creditCustId,
    customers,
    followUps,
    newCust.company,
    tab,
    topCustomers,
  ]);

  const activeCustomerReference =
    activeCustomerContext.name || activeCustomerContext.id || 'the current account';
  const workflowOrigin = useMemo(
    () => ({
      source: 'customers',
      recordType: 'Customer',
      recordId: activeCustomerContext.id,
      customer: activeCustomerContext.name,
      note: `Carry ${activeCustomerReference} context through quoting, follow-up, and evidence capture.`,
    }),
    [activeCustomerContext.id, activeCustomerContext.name, activeCustomerReference],
  );
  const customerQuotePath = useMemo(() => {
    return buildWorkflowPath('/quote-builder', location.search, {
      origin: {
        ...workflowOrigin,
        note: `Carry ${activeCustomerContext.lane.toLowerCase()} context into internal pricing review for ${activeCustomerReference}.`,
      },
      extras: {
        customerIntent: activeCustomerContext.intent,
      },
    });
  }, [activeCustomerContext.intent, activeCustomerContext.lane, activeCustomerReference, location.search, workflowOrigin]);
  const customerMessagesPath = useMemo(() => {
    return buildWorkflowPath('/messages', location.search, {
      origin: {
        ...workflowOrigin,
        note: `Review customer follow-up context for ${activeCustomerReference}.`,
      },
    });
  }, [activeCustomerReference, location.search, workflowOrigin]);
  const customerCapturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'customers',
        target: 'quality',
        job: activeCustomerContext.id || activeCustomerContext.name,
        department: 'Quoting',
        note: `Capture RFQ, print, and account evidence for ${activeCustomerReference}.`,
      }),
    [activeCustomerContext.id, activeCustomerContext.name, activeCustomerReference, location.pathname, location.search],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-rose-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(40,12,24,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-rose-300/16 bg-rose-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-100">CRM workspace</span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Customers &amp; CRM</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">Manage accounts, credit posture, pipeline health, and communications from one cleaner customer operations desk.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="Active lane" value={TAB_CONFIG[tab].label} hint={TAB_CONFIG[tab].detail} />
              <Tile label="Search posture" value={searchQuery || 'All customers'} hint={`Status filter: ${statusFilter}`} />
              <Tile label="Comms target" value={commCustId || creditCustId || analyticsCustId || 'Standby'} hint="Customer IDs carry across credit, analytics, and communication lanes." />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow lanes</div>
            <div className="mt-4 grid gap-3">
              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${key === tab ? 'border-rose-300/24 bg-rose-300/[0.08] text-rose-50' : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'}`}
                >
                  <div className="text-sm font-semibold">{config.label}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {tab === 'list' ? (
        <Card title="Customer search" subtitle="Search and status-filtering stay visible at the top of the list lane.">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void loadData();
              }}
              placeholder="Search customers..."
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32"
            />
            <button type="button" onClick={() => void loadData()} className="rounded-2xl bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200">Search</button>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="on_hold">On Hold</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>
      ) : null}

      {loading ? <LoadingState label="Refreshing customer workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          {tab === 'list' ? (
            <Card title="Customer book" subtitle="Account posture, pricing tier, and balance all stay readable in one list lane.">
              <div className="grid gap-3">
                {customers.map((customer) => (
                  <div key={customer.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[110px_1.2fr_1fr_110px_120px_120px]">
                    <div className="text-xs font-mono text-slate-400">{customer.id}</div>
                    <div><div className="text-sm font-semibold text-slate-50">{customer.company}</div><div className="mt-2 text-sm text-slate-400">{customer.contact_name}</div></div>
                    <div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tierColors[customer.pricing_tier] ?? 'bg-slate-200/20 text-slate-100'}`}>{customer.pricing_tier}</span></div>
                    <div className="capitalize text-slate-100">{customer.status}</div>
                    <div className="font-mono text-slate-100">${customer.credit_limit.toLocaleString()}</div>
                    <div className="font-mono text-slate-100">${customer.current_balance.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'pipeline' && pipeline ? (
            <Card title="Sales pipeline" subtitle="Commercial stage health should feel like a live desk, not a spreadsheet dump.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Tile label="Total pipeline" value={`$${pipeline.total_pipeline.toLocaleString()}`} hint="Unweighted opportunity value." />
                <Tile label="Weighted value" value={`$${pipeline.weighted_pipeline.toLocaleString()}`} hint="Probability-adjusted pipeline." />
                <Tile label="Win rate" value={`${pipeline.win_rate}%`} hint="Current conversion posture." />
                <Tile label="Avg deal size" value={`$${pipeline.avg_deal_size.toLocaleString()}`} hint="Average value per active opportunity." />
              </div>
            </Card>
          ) : null}

          {tab === 'top' ? (
            <Card title="Top customers" subtitle="Revenue concentration and performance stay visible in a cleaner ranking desk.">
              <div className="grid gap-3">
                {topCustomers.map((customer, index) => (
                  <div key={customer.customer_id} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[56px_1.2fr_repeat(4,110px)]">
                    <div className="text-2xl font-semibold text-slate-500">#{index + 1}</div>
                    <div><div className="text-sm font-semibold text-slate-50">{customer.customer_name}</div></div>
                    <div className="font-mono text-slate-100">${customer.total_revenue.toLocaleString()}</div>
                    <div className="text-slate-100">{customer.total_jobs}</div>
                    <div className="text-slate-100">{customer.on_time_delivery_pct}%</div>
                    <div className="text-slate-100">{customer.quote_win_rate}%</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'followups' ? (
            <Card title="Follow-ups" subtitle="Outstanding customer follow-up work stays visible in one simple lane.">
              <div className="grid gap-3">
                {followUps.map((followUp, index) => (
                  <div key={`${String(followUp.customer_name ?? followUp.customer_id ?? index)}-${index}`} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[1fr_120px_140px_1.2fr_100px]">
                    <div className="text-sm font-semibold text-slate-50">{String(followUp.customer_name ?? followUp.customer_id ?? '-')}</div>
                    <div className="capitalize text-slate-300">{String(followUp.type ?? followUp.follow_up_type ?? '-')}</div>
                    <div className="font-mono text-slate-300">{String(followUp.due_date ?? '-')}</div>
                    <div className="truncate text-slate-300">{String(followUp.notes ?? '-')}</div>
                    <div className="text-slate-100">{String(followUp.status ?? 'pending')}</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {tab === 'credit' ? (
            <Card title="Credit + analytics" subtitle="Credit approval and account health stay together because they’re usually reviewed together.">
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
                  <input type="text" value={creditCustId} onChange={(event) => setCreditCustId(event.target.value)} placeholder="Customer ID" className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                  <input type="number" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="Order Amount" className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                  <button type="button" onClick={() => void doCredit()} disabled={!creditCustId || !creditAmount} className="rounded-2xl bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">Check</button>
                </div>

                {creditResult ? <pre className="max-h-[320px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">{JSON.stringify(creditResult, null, 2)}</pre> : null}

                <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                  <input type="text" value={analyticsCustId} onChange={(event) => setAnalyticsCustId(event.target.value)} placeholder="Analytics Customer ID" className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                  <button type="button" onClick={() => void doAnalytics()} disabled={!analyticsCustId} className="rounded-2xl bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">Get Analytics</button>
                </div>

                {analyticsData ? <pre className="max-h-[320px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">{JSON.stringify(analyticsData, null, 2)}</pre> : null}
              </div>
            </Card>
          ) : null}

          {tab === 'create' ? (
            <Card title="New customer" subtitle="Onboard an account in a cleaner CRM lane instead of the older admin form look.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <input type="text" value={newCust.company} onChange={(event) => setNewCust((current) => ({ ...current, company: event.target.value }))} placeholder="Company" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                <input type="text" value={newCust.contact_name} onChange={(event) => setNewCust((current) => ({ ...current, contact_name: event.target.value }))} placeholder="Contact Name" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                <input type="email" value={newCust.email} onChange={(event) => setNewCust((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                <input type="text" value={newCust.phone} onChange={(event) => setNewCust((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                <select value={newCust.pricing_tier} onChange={(event) => setNewCust((current) => ({ ...current, pricing_tier: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32">
                  <option value="standard">Standard</option>
                  <option value="preferred">Preferred</option>
                  <option value="contract">Contract</option>
                  <option value="wholesale">Wholesale</option>
                </select>
                <input type="number" value={newCust.credit_limit} onChange={(event) => setNewCust((current) => ({ ...current, credit_limit: event.target.value }))} placeholder="Credit Limit" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
              </div>
              <div className="mt-4">
                <button type="button" onClick={() => void doCreate()} disabled={!newCust.company} className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">Create Customer</button>
              </div>
              {createResult ? <div className="mt-5 rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-4 text-sm text-emerald-100">Customer created: {JSON.stringify(createResult)}</div> : null}
            </Card>
          ) : null}

          {tab === 'comms' ? (
            <Card title="Communications" subtitle="Log account conversations and pull history from one cleaner communications lane.">
              <div className="grid gap-4 md:grid-cols-3">
                <input type="text" value={commCustId} onChange={(event) => setCommCustId(event.target.value)} placeholder="Customer ID" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
                <select value={commType} onChange={(event) => setCommType(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="meeting">Meeting</option>
                  <option value="site_visit">Site Visit</option>
                </select>
                <input type="text" value={commNotes} onChange={(event) => setCommNotes(event.target.value)} placeholder="Notes" className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/32" />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => void doLogComm()} disabled={!commCustId} className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">Log</button>
                <button type="button" onClick={() => void doCommHistory()} disabled={!commCustId} className="rounded-2xl bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">View History</button>
              </div>
              {commResult ? <div className="mt-5 rounded-[22px] border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-4 text-sm text-emerald-100">Communication logged.</div> : null}
              {commHistory.length > 0 ? <pre className="mt-5 max-h-[320px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">{JSON.stringify(commHistory, null, 2)}</pre> : null}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card title="CRM brief" subtitle="Keep the active account-management posture visible while changing lanes.">
            <div className="space-y-3">
              <Tile label="Current lane" value={TAB_CONFIG[tab].label} hint={TAB_CONFIG[tab].detail} />
              <Tile label="Credit target" value={creditCustId || 'Standby'} hint="Credit and communications lanes can share the same account ID." />
            </div>
          </Card>

          <Card title="Customer handoff" subtitle="Keep customer and RFQ context attached when commercial work moves into quote review or evidence capture.">
            <div className="space-y-3">
              <Tile
                label="Active account"
                value={activeCustomerContext.name || activeCustomerContext.id || 'Standby'}
                hint={`Launch context from ${activeCustomerContext.lane}.`}
              />
              <div className="grid gap-3">
                <Link
                  to={customerQuotePath}
                  className="inline-flex items-center justify-center rounded-2xl bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200"
                >
                  Open Quote Builder
                </Link>
                <Link
                  to={customerMessagesPath}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Open Messages follow-up
                </Link>
                <Link
                  to={customerCapturePath}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Open Capture Ops
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
