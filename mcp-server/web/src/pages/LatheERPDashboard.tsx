/**
 * LatheERPDashboard.tsx — LATHE-MASTER U-LTH55
 *
 * Business Intelligence dashboard consolidating all P5 ERP surfaces into a
 * single 6-tile view. Each tile queries a dedicated MCP dispatcher action.
 *
 * Tiles:
 *   1. Pipeline        → prism_business:lathe_order_pipeline
 *   2. Billing / MRR   → prism_business:billing_stats
 *   3. Inventory       → prism_business:lathe_inv_snapshot
 *   4. Schedule        → (summary from latest lathe_job_schedule result)
 *   5. Profitability   → prism_business:lathe_profit_portfolio
 *   6. Quote Accuracy  → prism_business:lathe_actual_cost_accuracy
 *
 * Route: /lathe-erp-dashboard
 */

import { useEffect, useState } from "react";
import { callBusinessAction, unwrapBusiness } from "../api/businessDispatch";

// ============================================================================
// TYPES
// ============================================================================

type DispatchFn = (action: string, params?: Record<string, unknown>) => Promise<unknown>;

interface PipelineSummary {
  draft?: number;
  quoted?: number;
  accepted?: number;
  scheduled?: number;
  in_production?: number;
  shipped?: number;
  invoiced?: number;
  closed?: number;
  on_hold?: number;
  cancelled?: number;
  [k: string]: number | undefined;
}

interface BillingStats {
  active_subscriptions: number;
  mrr_cents: number;
  arr_cents: number;
  churn_rate_30d: number;
  revenue_mtd_cents: number;
}

interface InventorySnapshot {
  item_count: number;
  critical_count: number;
  low_count: number;
  excess_count: number;
  total_value_usd: number;
}

interface ProfitabilityPortfolio {
  total_jobs: number;
  total_revenue_usd: number;
  total_profit_usd: number;
  overall_margin_pct: number;
  pareto_cutoff_count: number;
  top: Array<{ key: string; total_profit_usd: number; avg_margin_pct: number }>;
  bottom: Array<{ key: string; total_profit_usd: number; avg_margin_pct: number }>;
}

interface AccuracyStats {
  sample_count: number;
  mean_abs_variance_pct: number;
  bias_pct: number;
  stdev_variance_pct: number;
  worst_variance_pct: number;
}

// ============================================================================
// DISPATCH CLIENT
// ============================================================================

/**
 * Default dispatch -- routes through the canonical business client: POST /api/v1/business/dispatch
 * with the auth token + 15s timeout + the deny-by-default allowlist gate, and `unwrapBusiness`
 * normalizes the dispatcher's {success,data}-or-bare envelope so each tile receives its plain
 * domain payload. Overridable for tests.
 */
async function defaultDispatch(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return unwrapBusiness(await callBusinessAction(action, params));
}

// ============================================================================
// TILE COMPONENTS
// ============================================================================

interface TileProps {
  title: string;
  loading: boolean;
  error: string | null;
  children?: React.ReactNode;
}

function Tile({ title, loading, error, children }: TileProps) {
  return (
    <div
      className="rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md"
      data-testid={`tile-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-400">{title}</h3>
      {loading && <p className="text-slate-500 text-xs">Loading...</p>}
      {error && <p className="text-red-400 text-xs" data-testid="tile-error">{error}</p>}
      {!loading && !error && children}
    </div>
  );
}

function PipelineTile({ data }: { data: PipelineSummary | null }) {
  if (!data) return <p className="text-slate-500 text-xs">No pipeline data</p>;
  const states: Array<keyof PipelineSummary> = [
    "draft", "quoted", "accepted", "scheduled", "in_production", "shipped", "invoiced", "closed",
  ];
  const total = states.reduce<number>((s, k) => s + (data[k] ?? 0), 0);
  return (
    <div className="space-y-1 text-sm">
      <p className="text-lg font-bold text-white">{total} orders</p>
      {states.map((s) => (
        <div key={s as string} className="flex justify-between text-slate-300">
          <span>{s}</span>
          <span className="font-mono text-cyan-300">{data[s] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

function BillingTile({ data }: { data: BillingStats | null }) {
  if (!data) return <p className="text-slate-500 text-xs">No billing data</p>;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-lg font-bold text-white">
        ${(data.mrr_cents / 100).toFixed(0)}<span className="text-xs text-slate-400">/mo</span>
      </p>
      <div className="flex justify-between text-slate-300">
        <span>ARR</span>
        <span className="font-mono text-cyan-300">${(data.arr_cents / 100).toFixed(0)}</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Subscriptions</span>
        <span className="font-mono text-cyan-300">{data.active_subscriptions}</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Churn 30d</span>
        <span className="font-mono text-cyan-300">{(data.churn_rate_30d * 100).toFixed(2)}%</span>
      </div>
    </div>
  );
}

function InventoryTile({ data }: { data: InventorySnapshot | null }) {
  if (!data) return <p className="text-slate-500 text-xs">No inventory data</p>;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-lg font-bold text-white">{data.item_count} SKUs</p>
      <div className="flex justify-between text-red-400">
        <span>Critical</span>
        <span className="font-mono">{data.critical_count}</span>
      </div>
      <div className="flex justify-between text-yellow-400">
        <span>Low</span>
        <span className="font-mono">{data.low_count}</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Excess</span>
        <span className="font-mono">{data.excess_count}</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Value</span>
        <span className="font-mono text-cyan-300">${data.total_value_usd.toFixed(0)}</span>
      </div>
    </div>
  );
}

function ScheduleTile({ data }: { data: { jobs: number; on_time: number; late: number; util_pct: number } | null }) {
  if (!data) return <p className="text-slate-500 text-xs">No schedule data</p>;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-lg font-bold text-white">{data.jobs} jobs</p>
      <div className="flex justify-between text-green-400">
        <span>On time</span>
        <span className="font-mono">{data.on_time}</span>
      </div>
      <div className="flex justify-between text-red-400">
        <span>Late</span>
        <span className="font-mono">{data.late}</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Utilization</span>
        <span className="font-mono text-cyan-300">{data.util_pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function ProfitabilityTile({ data }: { data: ProfitabilityPortfolio | null }) {
  if (!data) return <p className="text-slate-500 text-xs">No profitability data</p>;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-lg font-bold text-white">${data.total_profit_usd.toFixed(0)}</p>
      <div className="flex justify-between text-slate-300">
        <span>Margin</span>
        <span className="font-mono text-cyan-300">{data.overall_margin_pct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Jobs</span>
        <span className="font-mono text-cyan-300">{data.total_jobs}</span>
      </div>
      <div className="mt-2">
        <p className="text-xs text-green-400">Top: {data.top[0]?.key ?? "—"}</p>
        <p className="text-xs text-red-400">Bottom: {data.bottom[0]?.key ?? "—"}</p>
      </div>
    </div>
  );
}

function AccuracyTile({ data }: { data: AccuracyStats | null }) {
  if (!data) return <p className="text-slate-500 text-xs">No accuracy data</p>;
  const color = data.mean_abs_variance_pct > 15 ? "text-red-400"
    : data.mean_abs_variance_pct > 10 ? "text-yellow-400"
    : "text-green-400";
  return (
    <div className="space-y-2 text-sm">
      <p className={`text-lg font-bold ${color}`}>
        ±{data.mean_abs_variance_pct.toFixed(1)}%
      </p>
      <div className="flex justify-between text-slate-300">
        <span>Bias</span>
        <span className="font-mono text-cyan-300">{data.bias_pct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Stdev</span>
        <span className="font-mono text-cyan-300">{data.stdev_variance_pct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Worst</span>
        <span className="font-mono text-cyan-300">{data.worst_variance_pct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between text-slate-300">
        <span>Samples</span>
        <span className="font-mono text-cyan-300">{data.sample_count}</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================

interface LatheERPDashboardProps {
  /** Injectable dispatcher for testing. Defaults to HTTP POST /api/dispatch/business. */
  dispatch?: DispatchFn;
  /** Injectable initial schedule summary (tile 4 is supplied by caller, not a live query). */
  scheduleSummary?: { jobs: number; on_time: number; late: number; util_pct: number } | null;
}

export default function LatheERPDashboard({
  dispatch = defaultDispatch,
  scheduleSummary = null,
}: LatheERPDashboardProps) {
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [billing, setBilling] = useState<BillingStats | null>(null);
  const [inventory, setInventory] = useState<InventorySnapshot | null>(null);
  const [profit, setProfit] = useState<ProfitabilityPortfolio | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const nextErrors: Record<string, string> = {};
      const [p, b, i, pr, a] = await Promise.allSettled([
        dispatch("lathe_order_pipeline"),
        dispatch("billing_stats"),
        dispatch("lathe_inv_snapshot"),
        dispatch("lathe_profit_portfolio", { by: "customer", top_n: 5 }),
        dispatch("lathe_actual_cost_accuracy"),
      ]);
      if (cancelled) return;
      if (p.status === "fulfilled") setPipeline(p.value as PipelineSummary);
      else nextErrors.pipeline = (p.reason as Error).message;
      if (b.status === "fulfilled") setBilling(b.value as BillingStats);
      else nextErrors.billing = (b.reason as Error).message;
      if (i.status === "fulfilled") setInventory(i.value as InventorySnapshot);
      else nextErrors.inventory = (i.reason as Error).message;
      if (pr.status === "fulfilled") setProfit(pr.value as ProfitabilityPortfolio);
      else nextErrors.profit = (pr.reason as Error).message;
      if (a.status === "fulfilled") setAccuracy(a.value as AccuracyStats);
      else nextErrors.accuracy = (a.reason as Error).message;
      setErrors(nextErrors);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [dispatch]);

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">LATHE ERP Dashboard</h1>
        <p className="text-sm text-slate-400">JM Die shop-floor intelligence — updates every page load</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile title="Pipeline" loading={loading} error={errors.pipeline ?? null}>
          <PipelineTile data={pipeline} />
        </Tile>
        <Tile title="Billing MRR" loading={loading} error={errors.billing ?? null}>
          <BillingTile data={billing} />
        </Tile>
        <Tile title="Inventory" loading={loading} error={errors.inventory ?? null}>
          <InventoryTile data={inventory} />
        </Tile>
        <Tile title="Schedule" loading={false} error={null}>
          <ScheduleTile data={scheduleSummary} />
        </Tile>
        <Tile title="Profitability" loading={loading} error={errors.profit ?? null}>
          <ProfitabilityTile data={profit} />
        </Tile>
        <Tile title="Quote Accuracy" loading={loading} error={errors.accuracy ?? null}>
          <AccuracyTile data={accuracy} />
        </Tile>
      </div>
    </div>
  );
}
