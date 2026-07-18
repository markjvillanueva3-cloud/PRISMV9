import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ApiError,
  acctBankReconcile,
  acctCostToComplete,
  acctMultiPeriodCompare,
  acctQuickbooksSync,
  acctVarianceAnalysis,
  acctWipValuation,
  form1099NecGenerate,
  payrollGenerateW2,
  salesUseTaxCalc,
} from '../api/client';

/**
 * AccountingClosePage -- U-ERP-ACCT-CLOSE-FE (slot:hotel, 2026-07-02)
 *
 * Month-end close desk over the 9 accounting-close routes (/erp/acct-* + filings).
 * Every calculator takes CALLER-SUPPLIED data (the AccountingHardeningEngine contract:
 * bank_transactions/gl_entries/jobs/records/periods arrive in the request body), so each
 * tab is a run desk: contract-shaped JSON input (seeded with the engine's real parameter
 * shape), a Run action, highlight tiles for verified result fields, and the full result
 * below. Engine failures surface in the error banner (fail-loud -- e.g. SalesUseTax THROWS
 * on an unknown jurisdiction rather than silently under-collecting).
 *
 * Route tiers (erp.ts): bank-reconcile / quickbooks-sync / 1099-NEC / W2 need
 * hr_manager/admin (403 otherwise); the pure calculators need any authed session.
 */

type Tab =
  | 'bankrec'
  | 'wip'
  | 'variance'
  | 'ctc'
  | 'periods'
  | 'salestax'
  | 'filings'
  | 'quickbooks';

type Runner = (params: Record<string, unknown>) => Promise<unknown>;

type Highlight = { label: string; value: string; hint: string; accent?: string };

function SummaryTile({ label, value, hint, accent }: Highlight) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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

/** Dollars to the cent -- never round to thousands (hotel financial-invariant voice). */
function usd(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '--';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function pick(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** Highlight tiles ONLY for result fields whose engine contracts are verified
 *  (AccountingHardeningEngine.ts) -- anything else renders as raw JSON below (R12:
 *  never fabricate field names). */
function highlightsFor(tab: Tab, data: unknown): Highlight[] {
  if (data == null || typeof data !== 'object') return [];
  switch (tab) {
    case 'bankrec': {
      const reconciled = pick(data, 'reconciled');
      if (reconciled === undefined) return [];
      return [
        {
          label: 'Reconciled',
          value: reconciled ? 'YES' : 'NO',
          hint: `Difference ${usd(pick(data, 'difference'))}`,
          accent: reconciled ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : 'from-red-400/22 via-red-300/8 to-transparent',
        },
        { label: 'Match Rate', value: `${pick(data, 'match_rate_pct') ?? '--'}%`, hint: '3-pass exact / fuzzy-date / reference match' },
        { label: 'Outstanding Deposits', value: usd(pick(data, 'outstanding_deposits')), hint: 'GL cash-in not yet on the statement' },
        { label: 'Outstanding Checks', value: usd(pick(data, 'outstanding_checks')), hint: 'GL cash-out not yet cleared' },
      ];
    }
    case 'variance': {
      const net = pick(data, 'summary.net_variance');
      if (net === undefined) return [];
      const netNum = typeof net === 'number' ? net : 0;
      return [
        {
          label: 'Net Variance',
          value: usd(net),
          hint: `${pick(data, 'summary.net_variance_pct') ?? '--'}% of standard`,
          accent: netNum <= 0 ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : 'from-amber-400/22 via-amber-300/8 to-transparent',
        },
        { label: 'Favorable', value: usd(pick(data, 'summary.total_favorable')), hint: 'Under standard cost' },
        { label: 'Unfavorable', value: usd(pick(data, 'summary.total_unfavorable')), hint: 'Over standard cost' },
      ];
    }
    case 'ctc': {
      const eac = pick(data, 'portfolio.total_eac');
      if (eac === undefined) return [];
      return [
        { label: 'Portfolio EAC', value: usd(eac), hint: 'Estimate at completion, all active jobs' },
        { label: 'Remaining (ETC)', value: usd(pick(data, 'portfolio.total_etc')), hint: 'Estimate to complete' },
        { label: 'Portfolio CPI', value: String(pick(data, 'portfolio.portfolio_cpi') ?? '--'), hint: 'Cost performance index (>=1 healthy)' },
        {
          label: 'At-Risk Jobs',
          value: String(pick(data, 'portfolio.at_risk_jobs') ?? '--'),
          hint: 'Jobs forecast over budget',
          accent: 'from-amber-400/22 via-amber-300/8 to-transparent',
        },
      ];
    }
    default:
      return [];
  }
}

const TAB_CONFIG: Record<Tab, { label: string; detail: string; run: Runner; seed: Record<string, unknown> }> = {
  bankrec: {
    label: 'Bank Rec',
    detail: 'Auto-match statement transactions to GL cash entries (AICPA 3-pass). hr_manager/admin.',
    run: (p) => acctBankReconcile(p),
    seed: {
      bank_transactions: [{ id: 'bt-1', date: '2026-06-30', description: 'Customer payment INV-1001', amount: 1250.0, reference: 'INV-1001', type: 'deposit' }],
      gl_entries: [{ id: 'gl-1', date: '2026-06-30', description: 'AR receipt INV-1001', amount: 1250.0, account_code: '1000', reference_id: 'INV-1001', posted: true }],
      bank_ending_balance: 1250.0,
      statement_date: '2026-06-30',
    },
  },
  wip: {
    label: 'WIP Valuation',
    detail: 'Value work-in-process by absorption, variable, or throughput costing (GAAP ASC 330).',
    run: (p) => acctWipValuation(p),
    seed: {
      jobs: [{ job_id: 'J-100', part_number: 'PN-100', status: 'in_process', quantity_ordered: 100, quantity_complete: 40, direct_material: 2000.0, direct_labor: 1500.0, machine_time_cost: 800.0, tooling_cost: 150.0, overhead_applied: 300.0 }],
      method: 'absorption',
      overhead_rate_pct: 15,
    },
  },
  variance: {
    label: 'Variance',
    detail: 'Price / quantity variance decomposition per job cost record.',
    run: (p) => acctVarianceAnalysis(p),
    seed: {
      records: [{ job_id: 'J-100', category: 'material', standard_qty: 100, standard_rate: 12.5, actual_qty: 104, actual_rate: 13.1 }],
    },
  },
  ctc: {
    label: 'Cost to Complete',
    detail: 'EAC / ETC forecasting for active jobs (earned-value CPI methods).',
    run: (p) => acctCostToComplete(p),
    seed: {
      jobs: [{ job_id: 'J-100', budget_at_completion: 10000.0, actual_cost_to_date: 4500.0, earned_value: 4000.0, pct_complete: 0.4, remaining_work_units: 60 }],
      method: 'current_cpi',
    },
  },
  periods: {
    label: 'Multi-Period',
    detail: 'Period-over-period financial comparison across close periods.',
    run: (p) => acctMultiPeriodCompare(p),
    seed: {
      periods: [
        { period: '2026-Q1', revenue: 250000.0, cogs: 150000.0, gross_profit: 100000.0, operating_expenses: 60000.0, net_income: 40000.0, total_assets: 500000.0, total_liabilities: 200000.0, total_equity: 300000.0 },
        { period: '2026-Q2', revenue: 275000.0, cogs: 160000.0, gross_profit: 115000.0, operating_expenses: 62000.0, net_income: 53000.0, total_assets: 520000.0, total_liabilities: 195000.0, total_equity: 325000.0 },
      ],
    },
  },
  salestax: {
    label: 'Sales Tax',
    detail: 'Jurisdiction-coded sale tax calc (amount + jurisdiction). Unknown jurisdiction THROWS -- a silent 0% is under-collection.',
    run: (p) => salesUseTaxCalc(p),
    seed: { amount: 1250.0, jurisdiction: 'MI', reference: 'INV-1001' },
  },
  filings: {
    label: 'W-2 / 1099',
    detail: 'Year-end filings from YTD wage / payment records. Include taxYear+payees+payments for 1099-NEC, or employeeYtd+year for W-2 (payroll tax tables carry 2024-2025). SSN masked at the engine. hr_manager/admin.',
    run: (p) => (p.taxYear !== undefined ? form1099NecGenerate(p) : payrollGenerateW2(p)),
    seed: { employeeYtd: [], year: 2025 },
  },
  quickbooks: {
    label: 'QuickBooks',
    detail: 'GL <-> QuickBooks account sync mapping (push / pull / bidirectional). hr_manager/admin.',
    run: (p) => acctQuickbooksSync(p),
    seed: { direction: 'push', gl_accounts: [{ code: '1000', name: 'Cash', type: 'asset', balance: 1250.0 }] },
  },
};

const TAB_ORDER: Tab[] = ['bankrec', 'wip', 'variance', 'ctc', 'periods', 'salestax', 'filings', 'quickbooks'];

export function AccountingClosePage() {
  const [tab, setTab] = useState<Tab>('bankrec');
  const [inputByTab, setInputByTab] = useState<Partial<Record<Tab, string>>>({});
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = TAB_CONFIG[tab];
  const inputText = inputByTab[tab] ?? JSON.stringify(active.seed, null, 2);
  const highlights = useMemo(() => highlightsFor(tab, result), [tab, result]);
  // Live-tab ref so an in-flight run whose tab was switched away is DISCARDED --
  // otherwise a slow Bank Rec response would render under the Variance panel
  // (number misattribution on a financial close desk; scrutiny arm-A P1).
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const runClose = async () => {
    const runTab = tab;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = JSON.parse(inputText) as Record<string, unknown>;
      const response = (await active.run(params)) as { data?: unknown };
      if (tabRef.current !== runTab) return; // tab switched mid-flight: stale result, drop it
      // erp.ts routes emit {ok,data} with the prism_business envelope already
      // unwrapped server-side (rfqRoute) -- read .data, fall back defensively.
      setResult(response && typeof response === 'object' && 'data' in response ? response.data : response);
    } catch (e) {
      if (tabRef.current !== runTab) return; // stale error, drop it
      if (e instanceof SyntaxError) setError(`Input is not valid JSON: ${e.message}`);
      else if (e instanceof ApiError) setError(e.status === 403 ? 'This close action needs the hr_manager or admin role.' : e.message);
      else setError(e instanceof Error ? e.message : 'Close action failed');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-50">Accounting Close</h1>
        <p className="mt-1 text-sm text-slate-400">
          Month-end close desk: bank reconciliation, WIP valuation, variance, cost-to-complete, period compare, sales tax, filings, QuickBooks.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={`h-11 rounded-2xl border px-4 text-sm font-semibold transition md:h-9 ${
              tab === key
                ? 'border-sky-300/40 bg-sky-400/15 text-sky-100'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
            }`}
          >
            {TAB_CONFIG[key].label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PanelCard title={active.label} subtitle={active.detail}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Request (engine contract JSON)
            </span>
            <textarea
              value={inputText}
              onChange={(e) => setInputByTab((prev) => ({ ...prev, [tab]: e.target.value }))}
              spellCheck={false}
              rows={14}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 font-mono text-[13px] leading-relaxed text-slate-100 outline-none transition focus:border-sky-300/32"
            />
          </label>
          <button
            type="button"
            onClick={() => void runClose()}
            disabled={loading}
            className="mt-4 h-11 w-full rounded-2xl border border-emerald-300/30 bg-emerald-400/15 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/50 disabled:opacity-50"
          >
            {loading ? 'Running Close Action...' : 'Run Close Action'}
          </button>
          {error ? (
            <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </PanelCard>

        <PanelCard title="Result" subtitle={result == null ? 'Run a close action to see the computed result.' : 'Computed by the accounting engines -- dollars to the cent.'}>
          {highlights.length > 0 ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {highlights.map((h) => (
                <SummaryTile key={h.label} {...h} />
              ))}
            </div>
          ) : null}
          {result != null ? (
            <pre className="max-h-[28rem] overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
              No result yet.
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
