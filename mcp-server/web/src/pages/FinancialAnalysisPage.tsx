import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  financialBreakeven,
  financialIRR,
  financialMachineInvestment,
  financialNPV,
  ApiError,
} from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine,
} from 'recharts';

type Tab = 'npv' | 'irr' | 'machine' | 'breakeven';

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
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-emerald-400/22 via-emerald-300/8 to-transparent'}`} />
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
  npv: { label: 'NPV', detail: 'Discounted cash-flow posture for one capital decision.' },
  irr: { label: 'IRR', detail: 'Rate-of-return read for a candidate investment path.' },
  machine: { label: 'Machine ROI', detail: 'Payback, ROI, and salvage-aware machine investment review.' },
  breakeven: { label: 'Breakeven', detail: 'Volume threshold and contribution margin pressure.' },
};

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
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32 ${props.className ?? ''}`}
    />
  );
}

const CHART_TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#e2e8f0' };

function CashFlowChart({ cashFlows, initialInvestment }: { cashFlows: number[]; initialInvestment: number }) {
  let cumulative = -initialInvestment;
  const data = [
    { name: 'Initial', flow: -initialInvestment, cumulative: -initialInvestment },
    ...cashFlows.map((cf, i) => {
      cumulative += cf;
      return { name: `Yr ${i + 1}`, flow: cf, cumulative };
    }),
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        <Bar dataKey="flow" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.flow >= 0 ? '#4ade80' : '#fb7185'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BreakevenChart({ fixedCosts, unitPrice, varCost }: { fixedCosts: number; unitPrice: number; varCost: number }) {
  const margin = unitPrice - varCost;
  if (margin <= 0) return null;
  const breakevenUnits = Math.ceil(fixedCosts / margin);
  const maxUnits = Math.ceil(breakevenUnits * 1.6);
  const step = Math.max(1, Math.floor(maxUnits / 8));
  const data: { units: number; revenue: number; totalCost: number }[] = [];
  for (let u = 0; u <= maxUnits; u += step) {
    data.push({ units: u, revenue: u * unitPrice, totalCost: fixedCosts + u * varCost });
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <XAxis dataKey="units" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
        <ReferenceLine x={breakevenUnits} stroke="#fcd34d" strokeDasharray="4 4" label={{ value: 'Breakeven', fill: '#fcd34d', fontSize: 11, position: 'top' }} />
        <Line type="monotone" dataKey="revenue" stroke="#4ade80" strokeWidth={2} dot={false} name="Revenue" />
        <Line type="monotone" dataKey="totalCost" stroke="#fb7185" strokeWidth={2} dot={false} name="Total Cost" />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Unwrap MCP tool response: result may be raw object or { type:"text", text:"<json>" } */
function unwrapMcpResult(result: unknown): unknown {
  if (result && typeof result === 'object' && 'text' in result && typeof (result as { text: string }).text === 'string') {
    try { return JSON.parse((result as { text: string }).text); } catch { return result; }
  }
  return result;
}

export function FinancialAnalysisPage() {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || routeContext.origin.source || '';
  const upstreamSource = routeContext.origin.source && routeContext.origin.source !== launcherSource ? routeContext.origin.source : '';
  const launcherSourceLabel = formatWorkflowSourceLabel(launcherSource);
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const [tab, setTab] = useState<Tab>('npv');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountRate, setDiscountRate] = useState('10');
  const [initialInv, setInitialInv] = useState('150000');
  const [cashFlows, setCashFlows] = useState('40000,45000,50000,55000,60000');

  const [irrInitial, setIrrInitial] = useState('200000');
  const [irrFlows, setIrrFlows] = useState('50000,60000,70000,80000,90000');

  const [machineCost, setMachineCost] = useState('250000');
  const [installCost, setInstallCost] = useState('15000');
  const [annualRevenue, setAnnualRevenue] = useState('120000');
  const [annualCost, setAnnualCost] = useState('45000');
  const [machineLife, setMachineLife] = useState('10');
  const [salvage, setSalvage] = useState('25000');

  const [fixedCosts, setFixedCosts] = useState('50000');
  const [unitPrice, setUnitPrice] = useState('150');
  const [varCost, setVarCost] = useState('85');

  const activeTab = TAB_CONFIG[tab];
  const parsedCashFlows = useMemo(() => cashFlows.split(',').map((value) => Number(value.trim()) || 0), [cashFlows]);
  const parsedIrrFlows = useMemo(() => irrFlows.split(',').map((value) => Number(value.trim()) || 0), [irrFlows]);
  const financeReference =
    routeContext.origin.recordType && routeContext.origin.recordId
      ? `${routeContext.origin.recordType} ${routeContext.origin.recordId}`
      : '';
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: launcherSource || 'financial-analysis',
            recordType: routeContext.origin.recordType,
            recordId: routeContext.origin.recordId,
            customer: routeContext.origin.customer,
            note:
              routeContext.origin.note
              || 'Keep the upstream commercial or accounting record attached while finance analysis pressure-tests the decision.',
            threadId: routeContext.origin.threadId,
          },
    [launcherSource, routeContext.origin],
  );
  const effectiveFocus = useMemo(
    () => (routeContext.focus.id ? routeContext.focus : undefined),
    [routeContext.focus],
  );
  const generalLedgerPath = useMemo(
    () =>
      buildWorkflowPath('/general-ledger', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'financial-analysis',
          invoiceId: routeParams.get('invoiceId') || '',
          employeeId: routeParams.get('employeeId') || '',
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routeParams],
  );
  const invoicesPath = useMemo(
    () =>
      buildWorkflowPath('/invoices', location.search, {
        origin: effectiveOrigin,
        focus: effectiveFocus,
        extras: {
          source: 'financial-analysis',
          invoiceId: routeParams.get('invoiceId') || '',
          employeeId: routeParams.get('employeeId') || '',
        },
      }),
    [effectiveFocus, effectiveOrigin, location.search, routeParams],
  );

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let response;
      switch (tab) {
        case 'npv':
          response = await financialNPV({
            discount_rate: parseFloat(discountRate) / 100,
            initial_investment: parseFloat(initialInv),
            cash_flows: parsedCashFlows,
          });
          break;
        case 'irr':
          response = await financialIRR({
            initial_investment: parseFloat(irrInitial),
            cash_flows: parsedIrrFlows,
          });
          break;
        case 'machine':
          response = await financialMachineInvestment({
            machine_cost: parseFloat(machineCost),
            installation_cost: parseFloat(installCost),
            annual_revenue: parseFloat(annualRevenue),
            annual_operating_cost: parseFloat(annualCost),
            useful_life_years: parseInt(machineLife, 10),
            salvage_value: parseFloat(salvage),
            discount_rate: parseFloat(discountRate) / 100,
          });
          break;
        case 'breakeven':
          response = await financialBreakeven({
            fixed_costs: parseFloat(fixedCosts),
            unit_price: parseFloat(unitPrice),
            variable_cost_per_unit: parseFloat(varCost),
          });
          break;
      }
      const raw = unwrapMcpResult((response as Record<string, unknown>)?.result ?? (response as Record<string, unknown>)?.data);
      setResult((raw as Record<string, unknown>) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  function renderResult() {
    if (!result) {
      return (
        <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-400">
          Run the active finance lane to stage investment output, decision posture, and supporting metrics.
        </div>
      );
    }

    if (tab === 'npv') {
      const npv = Number(result.npv ?? 0);
      return (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile label="NPV" value={`$${npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} hint="Discounted value of the project cash-flow stream." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
            <SummaryTile label="Decision" value={npv >= 0 ? 'Accept' : 'Reject'} hint="Quick capital posture from the NPV sign." accent={npv >= 0 ? 'from-sky-400/22 via-sky-300/8 to-transparent' : 'from-rose-400/22 via-rose-300/8 to-transparent'} />
            <SummaryTile label="Payback" value={`${Number(result.payback_years ?? 0).toFixed(1)} yrs`} hint="Approximate time to recover the initial investment." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
            <SummaryTile label="PI" value={Number(result.profitability_index ?? 0).toFixed(2)} hint="Profitability index for ranking constrained projects." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
          </div>
          <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cash flow timeline</div>
            <CashFlowChart cashFlows={parsedCashFlows} initialInvestment={parseFloat(initialInv)} />
          </div>
        </>
      );
    }

    if (tab === 'irr') {
      const irr = Number(result.irr ?? 0);
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile label="IRR" value={`${(irr * 100).toFixed(1)}%`} hint="Internal rate of return from the submitted cash flows." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
          <SummaryTile label="NPV @ hurdle" value={`$${Number(result.npv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} hint="Keeps return and present value visible together." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
          <SummaryTile label="Decision" value={irr > parseFloat(discountRate) / 100 ? 'Invest' : 'Review'} hint="IRR compared against the current hurdle rate." accent={irr > parseFloat(discountRate) / 100 ? 'from-violet-400/22 via-violet-300/8 to-transparent' : 'from-amber-300/22 via-amber-200/8 to-transparent'} />
        </div>
      );
    }

    if (tab === 'machine') {
      return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile label="NPV" value={`$${Number(result.npv ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} hint="Discounted value of the machine investment." />
          <SummaryTile label="IRR" value={`${(Number(result.irr ?? 0) * 100).toFixed(1)}%`} hint="Expected internal rate of return." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
          <SummaryTile label="Payback" value={`${Number(result.payback_years ?? 0).toFixed(1)} yrs`} hint="Time to recover total deployed capital." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
          <SummaryTile label="ROI" value={`${(Number(result.roi ?? 0) * 100).toFixed(1)}%`} hint="Simple return on investment posture." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
          <SummaryTile label="Recommendation" value={String(result.recommendation ?? 'Review')} hint="The financial engine recommendation." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
        </div>
      );
    }

    const contributionMargin = Number(result.contribution_margin_per_unit ?? 0);
    const breakevenUnits = Number(result.breakeven_units ?? 0);
    return (
      <>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile label="Breakeven units" value={breakevenUnits.toFixed(0)} hint="Units needed to cover fixed overhead." />
          <SummaryTile label="Contribution" value={`$${contributionMargin.toFixed(2)}`} hint="Contribution margin per unit before overhead." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
          <SummaryTile label="Breakeven sales" value={`$${Number(result.breakeven_revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} hint="Revenue needed to clear fixed cost." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
        </div>
        <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Revenue vs cost</div>
          <BreakevenChart fixedCosts={parseFloat(fixedCosts)} unitPrice={parseFloat(unitPrice)} varCost={parseFloat(varCost)} />
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-emerald-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(9,36,26,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-emerald-300/16 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
              Finance intelligence
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Financial Analysis</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Stage capital decisions, machine ROI, hurdle-rate pressure, and breakeven posture in one cleaner finance desk instead of bouncing between calculators.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Active lane" value={activeTab.label} hint={activeTab.detail} />
              <SummaryTile label="Discount anchor" value={`${discountRate}%`} hint="Shared hurdle rate for the discount-based lanes." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              <SummaryTile label="Cash-flow length" value={tab === 'irr' ? `${parsedIrrFlows.length}` : `${parsedCashFlows.length}`} hint="Number of annual flow entries in the current analysis." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow lanes</div>
            <div className="mt-4 grid gap-3">
              {launcherSource ? (
                <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-4 text-sm leading-6 text-emerald-50">
                  {launcherSourceLabel || 'This workflow'} opened Financial Analysis with finance context.{' '}
                  {effectiveOrigin.note || 'Keep the upstream record attached while you pressure-test the decision.'}
                  {financeReference ? (
                    <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-emerald-100/90">
                      Record: <span className="font-semibold normal-case tracking-normal">{financeReference}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {upstreamSourceLabel ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200">
                  Upstream finance origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
                </div>
              ) : null}

              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTab(key);
                      setResult(null);
                    }}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-50'
                        : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                    }`}
                  >
                    <div className="text-sm font-semibold">{config.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Running finance analysis..." /> : null}
      {error ? <ErrorState message={error} onRetry={runAnalysis} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          {tab === 'npv' ? (
            <PanelCard title="Net present value" subtitle="A cleaner capital budgeting lane for one machine, fixture, software, or staffing decision.">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Discount rate (%)">
                  <Input type="number" value={discountRate} onChange={(event) => setDiscountRate(event.target.value)} />
                </Field>
                <Field label="Initial investment ($)">
                  <Input type="number" value={initialInv} onChange={(event) => setInitialInv(event.target.value)} />
                </Field>
                <Field label="Cash flows">
                  <Input type="text" value={cashFlows} onChange={(event) => setCashFlows(event.target.value)} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => {
                  void runAnalysis();
                }}
                disabled={loading}
                className="mt-4 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Calculate NPV
              </button>
            </PanelCard>
          ) : null}

          {tab === 'irr' ? (
            <PanelCard title="Internal rate of return" subtitle="Use IRR when leadership wants a hurdle-rate answer instead of only a present-value answer.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Initial investment ($)">
                  <Input type="number" value={irrInitial} onChange={(event) => setIrrInitial(event.target.value)} />
                </Field>
                <Field label="Cash flows">
                  <Input type="text" value={irrFlows} onChange={(event) => setIrrFlows(event.target.value)} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => {
                  void runAnalysis();
                }}
                disabled={loading}
                className="mt-4 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Calculate IRR
              </button>
            </PanelCard>
          ) : null}

          {tab === 'machine' ? (
            <PanelCard title="Machine investment" subtitle="Stage a full machine purchase review with installation, operating cost, salvage, and discounting in one lane.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Machine cost ($)">
                  <Input type="number" value={machineCost} onChange={(event) => setMachineCost(event.target.value)} />
                </Field>
                <Field label="Install cost ($)">
                  <Input type="number" value={installCost} onChange={(event) => setInstallCost(event.target.value)} />
                </Field>
                <Field label="Annual revenue ($)">
                  <Input type="number" value={annualRevenue} onChange={(event) => setAnnualRevenue(event.target.value)} />
                </Field>
                <Field label="Annual operating cost ($)">
                  <Input type="number" value={annualCost} onChange={(event) => setAnnualCost(event.target.value)} />
                </Field>
                <Field label="Useful life (years)">
                  <Input type="number" value={machineLife} onChange={(event) => setMachineLife(event.target.value)} />
                </Field>
                <Field label="Salvage value ($)">
                  <Input type="number" value={salvage} onChange={(event) => setSalvage(event.target.value)} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => {
                  void runAnalysis();
                }}
                disabled={loading}
                className="mt-4 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Analyze investment
              </button>
            </PanelCard>
          ) : null}

          {tab === 'breakeven' ? (
            <PanelCard title="Breakeven analysis" subtitle="Use contribution and breakeven volume to pressure-test pricing and overhead.">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Fixed costs ($)">
                  <Input type="number" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} />
                </Field>
                <Field label="Unit price ($)">
                  <Input type="number" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} />
                </Field>
                <Field label="Variable cost / unit ($)">
                  <Input type="number" value={varCost} onChange={(event) => setVarCost(event.target.value)} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => {
                  void runAnalysis();
                }}
                disabled={loading}
                className="mt-4 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Calculate breakeven
              </button>
            </PanelCard>
          ) : null}

          <PanelCard title="Result surface" subtitle="Keep the decision summary visible without dropping into a raw debug payload.">
            {renderResult()}
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Finance brief" subtitle="A compact lane for the operating assumptions behind the current analysis.">
            <div className="grid gap-3">
              <SummaryTile label="Hurdle rate" value={`${discountRate}%`} hint="Used by the NPV and machine investment lanes." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              <SummaryTile label="Machine horizon" value={`${machineLife} yrs`} hint="Useful life assumption for the machine investment lane." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
              <SummaryTile label="Contribution spread" value={`$${(parseFloat(unitPrice) - parseFloat(varCost)).toFixed(2)}`} hint="Unit price minus variable cost in the breakeven lane." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard title="Recommended use" subtitle="Keep capital analysis crisp instead of turning it into spreadsheet archaeology.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">1. Use NPV or machine ROI when the decision includes financing, salvage, and discount-rate pressure.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">2. Use IRR when leadership wants a hurdle-rate answer they can compare against other opportunities.</div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">3. Use breakeven for quoting and pricing conversations, not just capital spend reviews.</div>
            </div>
          </PanelCard>

          <PanelCard title="Finance handoff" subtitle="Move back into billing or ledger review without losing the analysis context.">
            <div className="grid gap-3">
              <Link
                to={generalLedgerPath}
                className="block rounded-[22px] border border-sky-300/20 bg-sky-300/[0.10] px-4 py-4 text-sm leading-6 text-sky-50 transition hover:border-sky-300/32 hover:bg-sky-300/[0.16]"
              >
                <div className="font-semibold">Return to General Ledger</div>
                <div className="mt-2 text-sky-50/80">
                  Bring the same accounting context back into ledger review and posting posture.
                </div>
              </Link>

              <Link
                to={invoicesPath}
                className="block rounded-[22px] border border-violet-300/20 bg-violet-300/[0.10] px-4 py-4 text-sm leading-6 text-violet-50 transition hover:border-violet-300/32 hover:bg-violet-300/[0.16]"
              >
                <div className="font-semibold">Return to Invoices</div>
                <div className="mt-2 text-violet-50/80">
                  Carry the finance decision context back into billing and collections review.
                </div>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
