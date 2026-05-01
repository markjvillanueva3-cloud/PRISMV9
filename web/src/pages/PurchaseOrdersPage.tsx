import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { poList, poCreate, poApprove, poAPAging, poThreeWayMatch, poSpendByCategory, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { PurchaseOrder, APAging } from '../api/types';
import { buildCapturePath } from '../utils/captureRoute';

type Tab = 'orders' | 'aging' | 'match' | 'spend';

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
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-amber-400/22 via-amber-300/8 to-transparent'}`} />
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

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  orders: { label: 'Orders', detail: 'Open purchase orders, status, and approval posture.' },
  aging: { label: 'AP Aging', detail: 'Payables posture by bucket so finance sees pressure fast.' },
  match: { label: '3-Way Match', detail: 'Verify PO, receipt, and invoice agreement without leaving the page.' },
  spend: { label: 'Spend Analysis', detail: 'See where purchasing dollars are actually going.' },
};

export function PurchaseOrdersPage() {
  const location = useLocation();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [aging, setAging] = useState<APAging | null>(null);
  const [filter, setFilter] = useState('all');
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null);
  const [matchPoId, setMatchPoId] = useState('');
  const [spendData, setSpendData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('orders');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', description: '', quantity: '1', unit_price: '' });

  const activeTab = TAB_CONFIG[tab];
  const activePurchaseOrder = useMemo(() => orders[0] ?? null, [orders]);
  const activePoId = activePurchaseOrder?.id ?? matchPoId.trim() ?? '';
  const activeSupplier = activePurchaseOrder?.supplier_name ?? form.supplier_name.trim() ?? '';
  const inventoryHandoffPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tab', 'receiving');
    params.set('source', 'purchase-orders');
    if (activePoId) {
      params.set('poId', activePoId);
    }
    if (activeSupplier) {
      params.set('supplier', activeSupplier);
    }
    return `/inventory?${params.toString()}`;
  }, [activePoId, activeSupplier]);
  const messagesHandoffPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set('source', 'purchase-orders');
    params.set('recordType', 'PO');
    if (activePoId) {
      params.set('recordId', activePoId);
    }
    params.set(
      'note',
      `Follow up with ${activeSupplier || 'the supplier'} on receipt timing, shortages, and any mismatched paperwork before Inventory receives the order.`,
    );
    return `/messages?${params.toString()}`;
  }, [activePoId, activeSupplier]);
  const captureHandoffPath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'purchase-orders',
        target: 'inventory',
        job: activePoId,
        department: 'Receiving',
        note: `Capture packing slips, labels, and receiving evidence for ${activeSupplier || 'the current supplier'}${activePoId ? ` on ${activePoId}` : ''}.`,
      }),
    [activePoId, activeSupplier, location.pathname, location.search],
  );

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const response = await poList(filter !== 'all' ? { status: filter } : undefined);
      setOrders((response.result as { orders?: PurchaseOrder[] })?.orders ?? []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load POs');
    } finally {
      setLoading(false);
    }
  }

  async function loadAging() {
    setLoading(true);
    setError(null);
    try {
      const response = await poAPAging();
      setAging(response.result as unknown as APAging);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load AP aging');
    } finally {
      setLoading(false);
    }
  }

  async function loadSpend() {
    setLoading(true);
    setError(null);
    try {
      const response = await poSpendByCategory();
      setSpendData(
        (response.result as unknown as { categories?: Array<Record<string, unknown>> })?.categories ??
          (response.result as unknown as Array<Record<string, unknown>>) ??
          [],
      );
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load spend');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'orders') {
      void loadOrders();
    } else if (tab === 'aging') {
      void loadAging();
    } else if (tab === 'spend') {
      void loadSpend();
    }
  }, [filter, tab]);

  async function handleCreate() {
    if (!form.supplier_name || !form.unit_price) return;
    setLoading(true);
    setError(null);
    try {
      await poCreate({
        supplier_name: form.supplier_name,
        supplier_id: form.supplier_name.toLowerCase().replace(/\s+/g, '-'),
        line_items: [
          {
            description: form.description,
            quantity: parseInt(form.quantity, 10) || 1,
            unit_price: parseFloat(form.unit_price) || 0,
          },
        ],
      });
      setShowCreate(false);
      setForm({ supplier_name: '', description: '', quantity: '1', unit_price: '' });
      await loadOrders();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to create PO');
      setLoading(false);
    }
  }

  async function handleApprove(poId: string) {
    try {
      await poApprove({ po_id: poId, approved_by: 'current-user' });
      await loadOrders();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to approve PO');
    }
  }

  async function handleMatch() {
    if (!matchPoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await poThreeWayMatch({ po_id: matchPoId });
      setMatchResult((response.result as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Match failed');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-200/20 text-slate-200',
    pending_approval: 'bg-amber-300/20 text-amber-100',
    approved: 'bg-sky-300/20 text-sky-100',
    partially_received: 'bg-orange-300/20 text-orange-100',
    received: 'bg-emerald-300/20 text-emerald-100',
    closed: 'bg-slate-300/20 text-slate-200',
  };

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-amber-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(39,25,9,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-amber-300/16 bg-amber-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100">
              Purchasing operations
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Purchase Orders</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Manage supplier orders, approvals, AP pressure, and spend posture from a cleaner procurement desk.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
              <SummaryTile
                label="PO count"
                value={orders.length ? String(orders.length) : 'Standby'}
                hint="Loaded order count for the current orders lane."
                accent="from-sky-400/22 via-sky-300/8 to-transparent"
              />
              <SummaryTile
                label="Filter"
                value={filter === 'all' ? 'All statuses' : filter.replace(/_/g, ' ')}
                hint="The current filter only applies to the orders lane."
                accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow lanes</div>
            <div className="mt-4 grid gap-3">
              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-amber-300/24 bg-amber-300/[0.08] text-amber-50'
                        : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                    }`}
                  >
                    <div className="text-sm font-semibold">{config.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowCreate((current) => !current)}
                className="rounded-[22px] border border-sky-300/18 bg-sky-300/[0.08] px-4 py-4 text-left text-sky-50 transition hover:bg-sky-300/[0.12]"
              >
                <div className="text-sm font-semibold">{showCreate ? 'Hide New PO' : 'New PO'}</div>
                <div className="mt-2 text-xs leading-5 text-slate-300">Use the create lane below without leaving the main purchasing shell.</div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Refreshing purchasing workspace..." /> : null}
      {error ? <ErrorState message={error} onRetry={tab === 'orders' ? loadOrders : undefined} /> : null}

      {showCreate ? (
        <PanelCard title="Create purchase order" subtitle="A cleaner intake panel for new supplier demand without dropping into a separate admin page.">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Supplier</span>
              <input
                type="text"
                value={form.supplier_name}
                onChange={(event) => setForm((current) => ({ ...current, supplier_name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300/32"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</span>
              <input
                type="text"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300/32"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Qty</span>
              <input
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300/32"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Unit price</span>
              <input
                type="number"
                value={form.unit_price}
                onChange={(event) => setForm((current) => ({ ...current, unit_price: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300/32"
              />
            </label>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                void handleCreate();
              }}
              disabled={loading}
              className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              Create PO
            </button>
          </div>
        </PanelCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          {tab === 'orders' ? (
            <PanelCard title="Open orders" subtitle="Status filters and approvals stay in one readable procurement board.">
              <div className="mb-5">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300/32"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="received">Received</option>
                </select>
              </div>

              {orders.length > 0 ? (
                <div className="grid gap-3">
                  {orders.map((po) => (
                    <div key={po.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[120px_1.2fr_120px_120px_160px_120px]">
                      <div className="text-xs font-mono text-slate-400">{po.id}</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-50">{po.supplier_name}</div>
                        <div className="mt-2 text-sm text-slate-400">{po.created_at?.slice(0, 10) ?? 'No date'}</div>
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</div>
                        <div className="mt-2 font-mono text-slate-100">${po.total.toFixed(2)}</div>
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
                        <div className="mt-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[po.status] ?? 'bg-slate-200/20 text-slate-100'}`}>
                            {po.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Approval</div>
                        <div className="mt-2 text-slate-100">{po.status === 'pending_approval' ? 'Action required' : 'No action'}</div>
                      </div>
                      <div className="flex items-center">
                        {po.status === 'pending_approval' ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleApprove(po.id);
                            }}
                            className="rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                          >
                            Approve
                          </button>
                        ) : (
                          <div className="text-sm text-slate-500">Complete</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
                  Load the orders lane to review open POs and approval posture.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'aging' && aging ? (
            <PanelCard title="AP aging" subtitle="Bucket payables pressure so finance and purchasing see the same picture.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <SummaryTile label="Current" value={`$${aging.current.toFixed(2)}`} hint="Current bucket." />
                <SummaryTile label="1-30 days" value={`$${aging.days_30.toFixed(2)}`} hint="Near-term past due posture." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
                <SummaryTile label="31-60 days" value={`$${aging.days_60.toFixed(2)}`} hint="Mid aging bucket." accent="from-orange-300/22 via-orange-200/8 to-transparent" />
                <SummaryTile label="90+ days" value={`$${aging.days_90_plus.toFixed(2)}`} hint="Critical old payables." accent="from-rose-400/22 via-rose-300/8 to-transparent" />
                <SummaryTile label="Total AP" value={`$${aging.total.toFixed(2)}`} hint="Overall payables posture." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              </div>
            </PanelCard>
          ) : null}

          {tab === 'match' ? (
            <PanelCard title="3-way match" subtitle="Verify PO, receiving, and invoice posture without leaving the purchasing desk.">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <label className="block flex-1 max-w-md">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PO ID</span>
                  <input
                    type="text"
                    value={matchPoId}
                    onChange={(event) => setMatchPoId(event.target.value)}
                    placeholder="PO-001"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300/32"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void handleMatch();
                  }}
                  className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
                >
                  Verify Match
                </button>
              </div>

              {matchResult ? (
                <div className={`mt-5 rounded-[22px] border px-4 py-4 ${matchResult.matched ? 'border-emerald-300/20 bg-emerald-300/[0.07]' : 'border-rose-300/20 bg-rose-300/[0.07]'}`}>
                  <div className={`text-sm font-semibold ${matchResult.matched ? 'text-emerald-100' : 'text-rose-100'}`}>
                    {matchResult.matched ? 'Match verified' : 'Discrepancy found'}
                  </div>
                  <pre className="mt-3 overflow-auto rounded-[18px] border border-white/8 bg-black/20 p-3 text-xs leading-6 text-slate-200">
                    {JSON.stringify(matchResult, null, 2)}
                  </pre>
                </div>
              ) : null}
            </PanelCard>
          ) : null}

          {tab === 'spend' && spendData.length > 0 ? (
            <PanelCard title="Spend analysis" subtitle="Category spend stays visible here until the richer visualization layer lands.">
              <div className="grid gap-3">
                {spendData.map((entry, index) => (
                  <div key={`${String(entry.category ?? index)}-${index}`} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[1fr_140px_110px_110px]">
                    <div>
                      <div className="text-sm font-semibold capitalize text-slate-50">{String(entry.category ?? '-')}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Spend</div>
                      <div className="mt-2 font-mono text-slate-100">${Number(entry.total_spend ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">PO count</div>
                      <div className="mt-2 text-slate-100">{String(entry.po_count ?? 0)}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">% total</div>
                      <div className="mt-2 font-mono text-slate-100">{Number(entry.pct ?? 0).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Procurement brief" subtitle="Keep the active purchasing posture visible while moving across lanes.">
            <div className="space-y-3">
              <SummaryTile label="Current lane" value={activeTab.label} hint={activeTab.detail} accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              <SummaryTile label="3-way target" value={matchPoId || 'Standby'} hint="The match lane uses the entered PO ID when you are ready to verify." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Recommended use" subtitle="Keep the PO workflow consistent for buyers and finance.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">1. Review open orders first so approval pressure is obvious.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">2. Use AP aging to understand supplier payment stress before issuing more demand.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">3. Use 3-way match and spend analysis as decision lanes, not as buried utility tools.</div>
            </div>
          </PanelCard>

          <PanelCard title="Operations handoff" subtitle="Procurement should hand receiving, supplier follow-up, and capture work forward with record context instead of dropping the thread.">
            <div className="space-y-3">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                Purchasing focus: <span className="font-semibold text-slate-100">{activePoId || 'No PO selected'}</span>
                {' -> '}{activeSupplier || 'Supplier pending'}
              </div>
              <Link
                to={inventoryHandoffPath}
                className="block rounded-[20px] border border-amber-300/20 bg-amber-300/[0.10] px-4 py-4 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/[0.16]"
              >
                <div>Open Inventory receiving</div>
                <div className="mt-2 text-sm font-normal leading-6 text-amber-50/80">
                  Stage the PO in Inventory so receiving, routing, and ownership start from the same record.
                </div>
              </Link>
              <Link
                to={messagesHandoffPath}
                className="block rounded-[20px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/[0.16]"
              >
                <div>Open Messages follow-up</div>
                <div className="mt-2 text-sm font-normal leading-6 text-sky-50/80">
                  Carry supplier follow-up context into the inbox instead of making buyers restate the PO by hand.
                </div>
              </Link>
              <Link
                to={captureHandoffPath}
                className="block rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.10] px-4 py-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
              >
                <div>Open Capture Ops</div>
                <div className="mt-2 text-sm font-normal leading-6 text-cyan-50/80">
                  Capture packing slips, labels, and receiving evidence without losing the purchasing context.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
