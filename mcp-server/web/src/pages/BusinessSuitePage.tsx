/**
 * BusinessSuitePage — consolidated business / quoting / orders / accounting /
 * customer-portal / sales surface for live testing (hotel iter9, 2026-05-24).
 *
 * Wires the existing prism_business dispatcher (50+ actions across quoting,
 * costing, orders, financial, reporting, portal_*, job_*, employee_*) — all
 * already backend-complete. This page is the single entry point for office
 * personnel + JM Die's customer-facing portal.
 *
 * 5 tabs: Quotes · Orders · Customer Portal (JM Die accounts) · Accounting · Reports
 * Calculator-Studio dark-HUD aesthetic per web/CLAUDE.md.
 */

import { useEffect, useState } from 'react';
import {
  PrismBusinessApiError,
  quotingGenerate,
  quotingPriceBreaks,
  orderList,
  orderMetrics,
  orderMachineQueue,
  portalQuoteView,
  portalListMessages,
  portalListTokens,
  financialNpv,
  financialBreakeven,
  reportingFinancial,
  reportingProduction,
  jobDashboard,
  amortizationSchedule,
  amortizationStraightLine,
  recurringExpenseCreate,
  recurringExpenseList,
  recurringExpenseMonthlyBurden,
  recurringExpenseDeactivate,
  type GeneratedQuote,
  type PriceTier,
  type Order,
  type OrderMetrics,
  type MachineQueueEntry,
  type PortalQuote,
  type PortalMessage,
  type PortalToken,
  type FinancialReport,
  type ProductionReport,
  type JobDashboard,
  type AmortizationSchedule,
  type DepreciationSchedule,
  type RecurringExpense,
  type MonthlyBurdenReport,
  type RecurringCategory,
  type RecurringFrequency,
} from '../api/prismBusiness';

const TAB_LIST = ['quotes', 'orders', 'jm_die', 'accounting', 'reports'] as const;
type Tab = (typeof TAB_LIST)[number];

const TAB_LABEL: Record<Tab, string> = {
  quotes: 'Quoting + Sales',
  orders: 'Orders + Jobs',
  jm_die: 'JM Die Customer Portal',
  accounting: 'Accounting + Financial',
  reports: 'Reports + Dashboards',
};

// ── Atoms (copied from EmployeePhonePortalPage for self-containment) ────────
type Tone = 'cyan' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate';

function GlowBox({ glow = 'cyan', children, className = '' }: { glow?: Exclude<Tone, 'slate'>; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`prism-glow-${glow} rounded-lg border border-white/10 bg-[rgba(2,6,23,0.78)] p-4 backdrop-blur ${className}`.trim()}
      style={{ boxShadow: 'inset 0 0 24px rgba(2,6,23,0.6)' }}
    >
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const colorByTone: Record<Tone, string> = {
    cyan: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
    violet: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
    emerald: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
    amber: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
    red: 'text-red-300 border-red-500/40 bg-red-500/10',
    slate: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  };
  return (
    <span className={`prism-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider ${colorByTone[tone]}`}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-white/10 bg-[rgba(15,23,42,0.6)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400/60 ${props.className ?? ''}`}
    />
  );
}

function ActionButton({ tone = 'cyan', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'cyan' | 'amber' | 'red' | 'emerald' | 'violet' }) {
  const colorByTone: Record<'cyan' | 'amber' | 'red' | 'emerald' | 'violet', string> = {
    cyan: 'border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10',
    amber: 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10',
    red: 'border-red-500/50 text-red-300 hover:bg-red-500/10',
    emerald: 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10',
    violet: 'border-violet-500/50 text-violet-300 hover:bg-violet-500/10',
  };
  return (
    <button
      type="button"
      {...rest}
      className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition disabled:opacity-40 ${colorByTone[tone]} ${rest.className ?? ''}`}
    />
  );
}

function fmtErr(e: unknown): string {
  if (e instanceof PrismBusinessApiError) return `[${e.status}] ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-xs text-red-300">{error}</div>;
}

// ── Tab: Quoting + Sales ────────────────────────────────────────────────────
function QuotesTab() {
  const [material, setMaterial] = useState('aluminum_6061');
  const [partVol, setPartVol] = useState('20');
  const [qty, setQty] = useState('100');
  const [quote, setQuote] = useState<GeneratedQuote | null>(null);
  const [tiers, setTiers] = useState<PriceTier[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onGenerate = async () => {
    setErr(null);
    try {
      const r = await quotingGenerate({ material, part_volume_in3: Number(partVol), quantity: Number(qty) });
      setQuote(r.quote);
    } catch (e) { setErr(fmtErr(e)); }
  };
  const onPriceBreaks = async () => {
    setErr(null);
    try {
      const r = await quotingPriceBreaks({ material, part_volume_in3: Number(partVol), quantities: [10, 50, 100, 500] });
      setTiers(r.tiers);
    } catch (e) { setErr(fmtErr(e)); }
  };

  return (
    <GlowBox glow="emerald">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-emerald-300">Instant quote + price-break analysis</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Material"><Input value={material} onChange={(e) => setMaterial(e.target.value)} /></Field>
        <Field label="Part volume (in³)"><Input value={partVol} onChange={(e) => setPartVol(e.target.value)} type="number" /></Field>
        <Field label="Quantity"><Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" /></Field>
      </div>
      <div className="mt-3 flex gap-2">
        <ActionButton tone="emerald" onClick={() => void onGenerate()}>Generate quote</ActionButton>
        <ActionButton tone="violet" onClick={() => void onPriceBreaks()}>Price-break tiers</ActionButton>
      </div>
      {quote && (
        <div className="mt-3 rounded border border-emerald-500/30 p-3 font-mono text-sm">
          <div className="text-2xl text-emerald-300">${quote.total?.toLocaleString() ?? '—'}</div>
          {quote.margin !== undefined && <div className="text-slate-400">margin: {(quote.margin * 100).toFixed(1)}%</div>}
          {quote.line_items && quote.line_items.length > 0 && (
            <ul className="mt-2 text-xs text-slate-500">
              {quote.line_items.map((li, i) => <li key={i}>{li.description}: ${li.cost?.toFixed(2)}</li>)}
            </ul>
          )}
        </div>
      )}
      {tiers && (
        <div className="mt-3 rounded border border-violet-500/30 p-3 font-mono text-sm">
          <div className="mb-2 text-xs uppercase tracking-wider text-violet-300">Price-break tiers</div>
          <table className="w-full">
            <thead><tr className="text-xs text-slate-500"><th className="text-left">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.quantity} className="border-t border-white/5">
                  <td className="py-1 text-slate-300">{t.quantity}</td>
                  <td className="py-1 text-right text-emerald-300">${t.unit_price?.toFixed(2)}</td>
                  <td className="py-1 text-right text-slate-400">${t.total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3"><ErrorBanner error={err} /></div>
    </GlowBox>
  );
}

// ── Tab: Orders + Jobs ──────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics | null>(null);
  const [queue, setQueue] = useState<MachineQueueEntry[]>([]);
  const [dash, setDash] = useState<JobDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setErr(null);
    try {
      const [o, m, q, d] = await Promise.all([orderList(), orderMetrics(), orderMachineQueue(), jobDashboard()]);
      setOrders(o.orders);
      setMetrics(m.metrics);
      setQueue(q.queue);
      setDash(d.dashboard);
    } catch (e) { setErr(fmtErr(e)); }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <GlowBox glow="cyan">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-cyan-300">Order metrics</div>
        {metrics ? (
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div><div className="text-xs text-slate-500">OPEN</div><div className="text-2xl text-amber-300">{metrics.open}</div></div>
            <div><div className="text-xs text-slate-500">IN-PROGRESS</div><div className="text-2xl text-violet-300">{metrics.in_progress}</div></div>
            <div><div className="text-xs text-slate-500">COMPLETE</div><div className="text-2xl text-emerald-300">{metrics.complete}</div></div>
          </div>
        ) : <div className="text-xs text-slate-500">Loading…</div>}
        {dash && (
          <div className="mt-4 border-t border-white/10 pt-3 font-mono text-sm">
            <div className="text-xs uppercase tracking-wider text-slate-500">Job dashboard</div>
            <div className="mt-1">active <span className="text-cyan-300">{dash.active}</span> · due today <span className="text-amber-300">{dash.due_today ?? '—'}</span> · overdue <span className="text-red-300">{dash.overdue ?? '—'}</span></div>
          </div>
        )}
      </GlowBox>
      <GlowBox glow="violet">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-violet-300">Machine queues</div>
        {queue.length === 0 ? <div className="text-xs text-slate-500">No jobs queued.</div> : queue.map((mq) => (
          <div key={mq.machine_id} className="border-b border-white/5 py-2 last:border-b-0">
            <div className="font-mono text-sm text-violet-200">{mq.machine_id}</div>
            <div className="text-xs text-slate-500">{mq.jobs.length} job(s)</div>
          </div>
        ))}
      </GlowBox>
      <GlowBox glow="emerald">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-emerald-300">Open orders ({orders.length})</div>
        <div className="max-h-72 overflow-y-auto">
          {orders.length === 0 ? <div className="text-xs text-slate-500">No orders.</div> : orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between border-b border-white/5 py-1 font-mono text-sm last:border-b-0">
              <div><span className="text-emerald-200">{o.id}</span> {o.customer && <span className="text-slate-500">· {o.customer}</span>}</div>
              <div className="flex items-center gap-2">{o.total && <span className="text-cyan-300">${o.total.toLocaleString()}</span>}<Chip tone={o.status === 'complete' ? 'emerald' : o.status === 'in_progress' ? 'violet' : 'cyan'}>{o.status}</Chip></div>
            </div>
          ))}
        </div>
      </GlowBox>
      <div className="md:col-span-2"><ErrorBanner error={err} /></div>
    </div>
  );
}

// ── Tab: JM Die Customer Portal ─────────────────────────────────────────────
function JmDieTab() {
  const [entityId, setEntityId] = useState('CUST-ITW');
  const [quoteId, setQuoteId] = useState('Q-1');
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setErr(null);
    try {
      const r = await portalListTokens({ entity_id: entityId });
      setTokens(r.tokens);
    } catch (e) { setErr(fmtErr(e)); }
  };
  useEffect(() => { void refresh(); }, [entityId]);

  const onLoadQuote = async () => {
    setErr(null);
    try {
      const r = await portalQuoteView({ entity_id: entityId, quote_id: quoteId });
      setQuote(r.quote);
    } catch (e) { setErr(fmtErr(e)); }
  };
  const onLoadMessages = async () => {
    setErr(null);
    try {
      const r = await portalListMessages({ entity_id: entityId });
      setMessages(r.messages);
    } catch (e) { setErr(fmtErr(e)); }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <GlowBox glow="cyan">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-wider text-cyan-300">JM Die customer view — {entityId}</div>
          <div className="w-48"><Field label="Customer (entity_id)"><Input value={entityId} onChange={(e) => setEntityId(e.target.value)} /></Field></div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded border border-cyan-500/30 p-3">
            <div className="mb-1 font-mono text-xs text-cyan-200">Active tokens ({tokens.length})</div>
            {tokens.slice(0, 5).map((t) => (
              <div key={t.id} className="border-b border-white/5 py-1 font-mono text-xs last:border-b-0">
                <div className="text-slate-300">{t.token.slice(0, 12)}…</div>
                <div className="text-slate-500">{t.created_at.slice(0, 10)} · {t.revoked ? <span className="text-red-300">revoked</span> : <span className="text-emerald-300">active</span>}</div>
              </div>
            ))}
            {tokens.length === 0 && <div className="text-xs text-slate-500">No tokens issued.</div>}
          </div>
          <div className="rounded border border-emerald-500/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-emerald-200">Quote view</span>
              <ActionButton tone="emerald" onClick={() => void onLoadQuote()}>Load</ActionButton>
            </div>
            <Field label="Quote ID"><Input value={quoteId} onChange={(e) => setQuoteId(e.target.value)} /></Field>
            {quote && (
              <div className="mt-2 text-xs font-mono">
                <div className="text-emerald-300">${quote.total?.toLocaleString() ?? '—'}</div>
                <div className="text-slate-500">status: {quote.status}</div>
              </div>
            )}
          </div>
          <div className="rounded border border-violet-500/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-violet-200">Messages</span>
              <ActionButton tone="violet" onClick={() => void onLoadMessages()}>Load</ActionButton>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {messages.length === 0 ? <div className="text-xs text-slate-500">No messages.</div> : messages.slice(0, 5).map((m) => (
                <div key={m.id} className="border-b border-white/5 py-1 text-xs last:border-b-0">
                  <div className="text-violet-300">{m.sender_name}</div>
                  <div className="text-slate-400">{m.body.slice(0, 60)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlowBox>
      <ErrorBanner error={err} />
    </div>
  );
}

// ── Tab: Accounting + Financial ─────────────────────────────────────────────
function AccountingTab() {
  const [cashflow, setCashflow] = useState('-50000, 12000, 12000, 12000, 12000, 12000');
  const [rate, setRate] = useState('0.10');
  const [npv, setNpv] = useState<number | null>(null);
  const [breakeven, setBreakeven] = useState<number | null>(null);
  const [fixed, setFixed] = useState('50000');
  const [unitPrice, setUnitPrice] = useState('150');
  const [unitCost, setUnitCost] = useState('80');
  const [err, setErr] = useState<string | null>(null);

  const onNpv = async () => {
    setErr(null);
    try {
      const cf = cashflow.split(',').map((s) => Number(s.trim()));
      const r = await financialNpv({ cash_flows: cf, discount_rate: Number(rate) });
      setNpv(r.npv);
    } catch (e) { setErr(fmtErr(e)); }
  };
  const onBreakeven = async () => {
    setErr(null);
    try {
      const r = await financialBreakeven({ fixed_costs: Number(fixed), price_per_unit: Number(unitPrice), variable_cost_per_unit: Number(unitCost) });
      setBreakeven(r.breakeven);
    } catch (e) { setErr(fmtErr(e)); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <GlowBox glow="emerald">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-emerald-300">NPV / IRR — capital investment analysis</div>
        <Field label="Cash flows (comma-separated; index 0 is initial investment, typically negative)">
          <Input value={cashflow} onChange={(e) => setCashflow(e.target.value)} />
        </Field>
        <div className="mt-2"><Field label="Discount rate (decimal, e.g. 0.10 = 10%)"><Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" step="0.01" /></Field></div>
        <ActionButton className="mt-3" tone="emerald" onClick={() => void onNpv()}>Calculate NPV</ActionButton>
        {npv !== null && (
          <div className="mt-3 rounded border border-emerald-500/30 p-3 font-mono">
            <div className="text-2xl text-emerald-300">${npv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-slate-500">NPV at {(Number(rate) * 100).toFixed(1)}% discount</div>
          </div>
        )}
      </GlowBox>
      <GlowBox glow="amber">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-amber-300">Breakeven analysis</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Fixed $"><Input value={fixed} onChange={(e) => setFixed(e.target.value)} type="number" /></Field>
          <Field label="Price/unit"><Input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} type="number" /></Field>
          <Field label="Cost/unit"><Input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} type="number" /></Field>
        </div>
        <ActionButton className="mt-3" tone="amber" onClick={() => void onBreakeven()}>Calculate</ActionButton>
        {breakeven !== null && (
          <div className="mt-3 rounded border border-amber-500/30 p-3 font-mono">
            <div className="text-2xl text-amber-300">{Math.ceil(breakeven).toLocaleString()} units</div>
            <div className="text-xs text-slate-500">breakeven volume</div>
          </div>
        )}
      </GlowBox>
      <AmortizationCard />
      <DepreciationCard />
      <RecurringExpensesCard />
      <div className="md:col-span-2"><ErrorBanner error={err} /></div>
    </div>
  );
}

// ── Sub-cards: Amortization / Depreciation / Recurring Expenses (G8 — iter12) ─

function AmortizationCard() {
  const [principal, setPrincipal] = useState('100000');
  const [rate, setRate] = useState('0.06');
  const [periods, setPeriods] = useState('360');
  const [schedule, setSchedule] = useState<AmortizationSchedule | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = async () => {
    setErr(null);
    try {
      const r = await amortizationSchedule({
        principal: Number(principal),
        rate_annual: Number(rate),
        n_periods: Number(periods),
        periods_per_year: 12,
      });
      setSchedule(r);
    } catch (e) { setErr(fmtErr(e)); }
  };

  return (
    <GlowBox glow="cyan">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-cyan-300">Amortization schedule — loan / lease</div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Principal $"><Input value={principal} onChange={(e) => setPrincipal(e.target.value)} type="number" /></Field>
        <Field label="APR (dec.)"><Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" step="0.005" /></Field>
        <Field label="N (months)"><Input value={periods} onChange={(e) => setPeriods(e.target.value)} type="number" /></Field>
      </div>
      <ActionButton className="mt-3" tone="cyan" onClick={() => void onCalc()}>Compute Schedule</ActionButton>
      {schedule && (
        <div className="mt-3 rounded border border-cyan-500/30 p-3 font-mono">
          <div className="text-2xl text-cyan-300">${schedule.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="ml-1 text-xs text-slate-400">/period</span></div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-slate-400">
            <span>Total paid: <span className="text-slate-200">${schedule.total_paid.toLocaleString()}</span></span>
            <span>Total interest: <span className="text-amber-300">${schedule.total_interest.toLocaleString()}</span></span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">{schedule.rows.length} rows · ledger-balanced (final row residue absorbed)</div>
        </div>
      )}
      <ErrorBanner error={err} />
    </GlowBox>
  );
}

function DepreciationCard() {
  const [cost, setCost] = useState('50000');
  const [salvage, setSalvage] = useState('5000');
  const [life, setLife] = useState('10');
  const [dep, setDep] = useState<DepreciationSchedule | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = async () => {
    setErr(null);
    try {
      const r = await amortizationStraightLine({
        cost: Number(cost), salvage: Number(salvage), life_years: Number(life),
      });
      setDep(r);
    } catch (e) { setErr(fmtErr(e)); }
  };

  return (
    <GlowBox glow="violet">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-violet-300">Straight-line depreciation — capex asset</div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Cost $"><Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" /></Field>
        <Field label="Salvage $"><Input value={salvage} onChange={(e) => setSalvage(e.target.value)} type="number" /></Field>
        <Field label="Life (yr)"><Input value={life} onChange={(e) => setLife(e.target.value)} type="number" /></Field>
      </div>
      <ActionButton className="mt-3" tone="violet" onClick={() => void onCalc()}>Compute Depreciation</ActionButton>
      {dep && (
        <div className="mt-3 rounded border border-violet-500/30 p-3 font-mono">
          <div className="text-2xl text-violet-300">${dep.annual_depreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="ml-1 text-xs text-slate-400">/yr</span></div>
          <div className="mt-1 text-xs text-slate-400">{dep.rows.length}-yr schedule · final book-value = salvage exactly</div>
        </div>
      )}
      <ErrorBanner error={err} />
    </GlowBox>
  );
}

function RecurringExpensesCard() {
  const [list, setList] = useState<RecurringExpense[]>([]);
  const [burden, setBurden] = useState<MonthlyBurdenReport | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<RecurringCategory>('utility');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [l, b] = await Promise.all([
        recurringExpenseList({ active: true }),
        recurringExpenseMonthlyBurden(),
      ]);
      setList(l.expenses);
      setBurden(b);
    } catch (e) { setErr(fmtErr(e)); }
  };

  useEffect(() => { void refresh(); }, []);

  const onAdd = async () => {
    setErr(null);
    try {
      await recurringExpenseCreate({
        vendor_name: vendorName.trim(),
        category,
        description: `${category} — ${vendorName.trim()}`,
        amount: Number(amount),
        frequency,
        start_date: new Date().toISOString().slice(0, 10),
      });
      setVendorName(''); setAmount('');
      await refresh();
    } catch (e) { setErr(fmtErr(e)); }
  };

  const onDeactivate = async (id: string) => {
    setErr(null);
    try { await recurringExpenseDeactivate({ id }); await refresh(); }
    catch (e) { setErr(fmtErr(e)); }
  };

  return (
    <GlowBox glow="emerald" className="md:col-span-2">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-xs uppercase tracking-wider text-emerald-300">Recurring expenses — utilities · subscriptions · insurance · lease</div>
        {burden && (
          <div className="font-mono text-xs text-slate-400">
            <span className="text-emerald-300 text-base">${burden.total_monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="ml-2">/mo · {burden.active_count} active</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        <Field label="Vendor"><Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="ComEd" /></Field>
        <Field label="Amount $"><Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" /></Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as RecurringCategory)} className="w-full rounded border border-white/10 bg-[rgba(2,6,23,0.78)] px-2 py-1 text-sm text-slate-200">
            {(['utility', 'subscription', 'insurance', 'lease', 'service', 'membership', 'other'] as const).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Frequency">
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)} className="w-full rounded border border-white/10 bg-[rgba(2,6,23,0.78)] px-2 py-1 text-sm text-slate-200">
            {(['monthly', 'quarterly', 'semi_annual', 'annual'] as const).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><ActionButton tone="emerald" onClick={() => void onAdd()}>+ Add</ActionButton></div>
      </div>
      {list.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-left text-slate-500"><th className="py-1">Vendor</th><th>Category</th><th>Freq</th><th className="text-right">$/period</th><th className="text-right">$/mo norm.</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const monthly = (e.amount * (e.frequency === 'monthly' ? 12 : e.frequency === 'quarterly' ? 4 : e.frequency === 'semi_annual' ? 2 : 1)) / 12;
                return (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="py-1 text-slate-200">{e.vendor_name}</td>
                    <td className="text-slate-400">{e.category}</td>
                    <td className="text-slate-400">{e.frequency}</td>
                    <td className="text-right text-cyan-300">${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-right text-emerald-300">${monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-right">
                      <button onClick={() => void onDeactivate(e.id)} className="text-red-400 hover:text-red-300">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ErrorBanner error={err} />
    </GlowBox>
  );
}

// ── Tab: Reports + Dashboards ───────────────────────────────────────────────
function ReportsTab() {
  const [fin, setFin] = useState<FinancialReport | null>(null);
  const [prod, setProd] = useState<ProductionReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setErr(null);
    try {
      const [f, p] = await Promise.all([reportingFinancial(), reportingProduction()]);
      setFin(f.report);
      setProd(p.report);
    } catch (e) { setErr(fmtErr(e)); }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <GlowBox glow="emerald">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-emerald-300">Financial — {fin?.period ?? '—'}</div>
        {fin ? (
          <div className="font-mono">
            <div className="text-xs text-slate-500">REVENUE</div><div className="text-3xl text-emerald-300">${fin.revenue?.toLocaleString() ?? '—'}</div>
            <div className="mt-3 text-xs text-slate-500">COGS</div><div className="text-xl text-amber-300">${fin.cogs?.toLocaleString() ?? '—'}</div>
            {fin.gross_margin !== undefined && <><div className="mt-3 text-xs text-slate-500">GROSS MARGIN</div><div className="text-xl text-cyan-300">{(fin.gross_margin * 100).toFixed(1)}%</div></>}
          </div>
        ) : <div className="text-xs text-slate-500">Loading…</div>}
      </GlowBox>
      <GlowBox glow="cyan">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-cyan-300">Production</div>
        {prod ? (
          <div className="font-mono">
            <div className="text-xs text-slate-500">JOBS COMPLETED</div><div className="text-3xl text-cyan-300">{prod.jobs_completed}</div>
            {prod.on_time !== undefined && <><div className="mt-3 text-xs text-slate-500">ON-TIME</div><div className="text-xl text-emerald-300">{prod.on_time}</div></>}
            {prod.scrap_rate !== undefined && <><div className="mt-3 text-xs text-slate-500">SCRAP RATE</div><div className="text-xl text-red-300">{(prod.scrap_rate * 100).toFixed(2)}%</div></>}
          </div>
        ) : <div className="text-xs text-slate-500">Loading…</div>}
      </GlowBox>
      <div className="md:col-span-2"><ErrorBanner error={err} /></div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function BusinessSuitePage() {
  const [tab, setTab] = useState<Tab>('quotes');

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-200">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl uppercase tracking-widest text-cyan-300">
              <span className="prism-led-sweep">Business</span> Suite
            </h1>
            <div className="font-mono text-xs uppercase tracking-wider text-slate-500">quoting · orders · accounting · JM Die customer portal · reports · hotel slot · iter9</div>
          </div>
        </header>
        <nav className="mb-4 flex flex-wrap gap-2">
          {TAB_LIST.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${tab === t ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400 hover:border-white/30'}`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </nav>
        <main>
          {tab === 'quotes' && <QuotesTab />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'jm_die' && <JmDieTab />}
          {tab === 'accounting' && <AccountingTab />}
          {tab === 'reports' && <ReportsTab />}
        </main>
        <footer className="mt-6 font-mono text-xs uppercase tracking-wider text-slate-600">
          Backend: prism_business · 50+ actions (financial / inventory / job / purchasing / costing / quoting / scheduling / reporting / order / portal_*) · CLAUDE.md §BUSINESS-DISPATCHER
        </footer>
      </div>
    </div>
  );
}
