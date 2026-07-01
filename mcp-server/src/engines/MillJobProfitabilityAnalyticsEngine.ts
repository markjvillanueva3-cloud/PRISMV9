/**
 * MillJobProfitabilityAnalyticsEngine
 * =====================================
 *
 * Per-mill-job profitability waterfall + customer / part / strategy / axis-count
 * portfolio analysis. Mill parity for LatheJobProfitabilityAnalyticsEngine
 * (LATHE-MASTER U-LTH54) but with the mill-canonical cost-bucket extensions
 * matched to MillPartCostModelEngine (iter69):
 *
 *   - Lathe waterfall:   revenue − material − labor − tool − overhead = margin
 *   - Mill   waterfall:  revenue − material − labor − tool − fixture_amort
 *                                − energy − overhead = margin
 *     (fixture amort + energy are MILL-CANONICAL 8th + 6th cost buckets)
 *
 *   - Lathe portfolio dims: customer, part_number
 *   - Mill  portfolio dims: customer, part_number, strategy, axis_count
 *     (strategy + axis_count are MILL-CANONICAL extensions — let ops
 *      compare 3-axis vise jobs vs 5-axis trunnion jobs profitability)
 *
 * Waterfall (unit economics):
 *   revenue_per_unit
 *     − material_cost
 *     − labor_cost           (cycle + setup × rates)
 *     − tool_wear_cost
 *     − fixture_amort_cost   [MILL-CANONICAL — soft-jaw / tombstone amort]
 *     − energy_cost          [MILL-CANONICAL — spindle power × cycle_hr × $/kWh]
 *     − overhead             (fraction of direct cost)
 *     ────────────────
 *     = gross_margin_per_unit × quantity = gross_profit_job
 *
 * Persistence:
 *   state/shared/mill-profitability-state.json, schemaVersion=1.
 *
 * Citations:
 *   - ABC (Activity-Based Costing) — Kaplan & Cooper "Cost & Effect" 1998
 *   - Pareto principle / portfolio concentration analysis (80/20 cutoff)
 *   - Gross margin = (revenue − COGS) / revenue
 *
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-JOB-PROFITABILITY (iter76)
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — sourced + locked
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_OVERHEAD_RATE = 0.15;
export const PARETO_THRESHOLD = 0.8;

const DEFAULT_STATE_PATH = "H:/prism/state/shared/mill-profitability-state.json";

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════

/** Strategy enum mirrors MillChipEvacuationPredictorEngine + MillPartClassifier. */
export const MillStrategyEnum = z.enum([
  "full_slot", "climb_pocket_rough", "conventional_pocket_rough",
  "adaptive_clearing", "trochoidal", "peel_milling",
  "finish_climb", "finish_conventional", "drilling", "mixed",
]);
export type MillStrategy = z.infer<typeof MillStrategyEnum>;

export const MillAxisCountEnum = z.enum(["3_axis", "4_axis", "5_axis_trunnion", "5_axis_head"]);
export type MillAxisCount = z.infer<typeof MillAxisCountEnum>;

export const RecordMillJobInputSchema = z.object({
  job_id: z.string().min(1),
  customer: z.string().min(1),
  part_number: z.string().min(1),
  quantity: z.number().int().positive(),
  revenue_total_usd: z.number().positive().finite(),
  material_cost_usd: z.number().min(0).finite(),
  labor_cost_usd: z.number().min(0).finite(),
  tool_wear_cost_usd: z.number().min(0).finite(),
  setup_cost_usd: z.number().min(0).finite().default(0),
  /** MILL-CANONICAL: dedicated-fixture amortization (soft jaws, tombstone, sub-plate) */
  fixture_amort_cost_usd: z.number().min(0).finite().default(0),
  /** MILL-CANONICAL: spindle energy cost (kW × cycle_hr × $/kWh) */
  energy_cost_usd: z.number().min(0).finite().default(0),
  overhead_rate: z.number().min(0).max(1).optional(),
  strategy: MillStrategyEnum.default("mixed"),
  axis_count: MillAxisCountEnum.default("3_axis"),
  completed_at_iso: z.string().datetime().optional(),
});
export type RecordMillJobInput = z.infer<typeof RecordMillJobInputSchema>;

export const MillPortfolioQueryInputSchema = z.object({
  by: z.enum(["customer", "part_number", "strategy", "axis_count"]).default("customer"),
  top_n: z.number().int().min(1).max(1000).default(10),
  since_iso: z.string().datetime().optional(),
  until_iso: z.string().datetime().optional(),
});
export type MillPortfolioQueryInput = z.infer<typeof MillPortfolioQueryInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MillJobProfitability {
  job_id: string;
  customer: string;
  part_number: string;
  quantity: number;
  strategy: MillStrategy;
  axis_count: MillAxisCount;
  revenue_per_unit: number;
  material_per_unit: number;
  labor_per_unit: number;
  tool_wear_per_unit: number;
  setup_per_unit: number;
  fixture_amort_per_unit: number;
  energy_per_unit: number;
  overhead_per_unit: number;
  gross_margin_per_unit: number;
  gross_profit_job: number;
  gross_margin_pct: number;
  revenue_total_usd: number;
  total_cogs_usd: number;
  completed_at: string;
}

export interface MillProfitabilityState {
  schemaVersion: 1;
  jobs: MillJobProfitability[];
  updated_at: string;
}

export interface MillPortfolioRow {
  key: string;
  jobs: number;
  total_revenue_usd: number;
  total_profit_usd: number;
  avg_margin_pct: number;
  best_margin_pct: number;
  worst_margin_pct: number;
}

export interface MillPortfolioReport {
  by: "customer" | "part_number" | "strategy" | "axis_count";
  top_n: number;
  range: { since: string | null; until: string | null };
  total_jobs: number;
  total_revenue_usd: number;
  total_profit_usd: number;
  overall_margin_pct: number;
  median_margin_pct: number;
  stdev_margin_pct: number;
  pareto_cutoff_count: number;
  pareto_cutoff_pct_revenue: number;
  top: MillPortfolioRow[];
  bottom: MillPortfolioRow[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round2(n: number): number { return Math.round(n * 100) / 100; }

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillJobProfitabilityAnalyticsEngine {
  private state: MillProfitabilityState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  recordJob(input: RecordMillJobInput): MillJobProfitability {
    const parsed = RecordMillJobInputSchema.parse(input);
    if (this.state.jobs.some((j) => j.job_id === parsed.job_id)) {
      throw new Error(
        `MillJobProfitabilityAnalyticsEngine: job_id '${parsed.job_id}' already recorded`,
      );
    }

    const rev = parsed.revenue_total_usd;
    const q = parsed.quantity;
    const revPerUnit = rev / q;
    const matPerUnit = parsed.material_cost_usd / q;
    const laborPerUnit = parsed.labor_cost_usd / q;
    const toolPerUnit = parsed.tool_wear_cost_usd / q;
    const setupPerUnit = parsed.setup_cost_usd / q;
    const fixturePerUnit = parsed.fixture_amort_cost_usd / q; // mill-canonical
    const energyPerUnit = parsed.energy_cost_usd / q;          // mill-canonical
    const directPerUnit = matPerUnit + laborPerUnit + toolPerUnit + setupPerUnit
                          + fixturePerUnit + energyPerUnit;
    const overheadRate = parsed.overhead_rate ?? DEFAULT_OVERHEAD_RATE;
    const overheadPerUnit = directPerUnit * overheadRate;

    const cogsPerUnit = directPerUnit + overheadPerUnit;
    const grossMarginPerUnit = revPerUnit - cogsPerUnit;
    const grossProfitJob = grossMarginPerUnit * q;
    const grossMarginPct = rev > 0 ? (grossProfitJob / rev) * 100 : 0;

    const record: MillJobProfitability = {
      job_id: parsed.job_id,
      customer: parsed.customer,
      part_number: parsed.part_number,
      quantity: q,
      strategy: parsed.strategy,
      axis_count: parsed.axis_count,
      revenue_per_unit: round2(revPerUnit),
      material_per_unit: round2(matPerUnit),
      labor_per_unit: round2(laborPerUnit),
      tool_wear_per_unit: round2(toolPerUnit),
      setup_per_unit: round2(setupPerUnit),
      fixture_amort_per_unit: round2(fixturePerUnit),
      energy_per_unit: round2(energyPerUnit),
      overhead_per_unit: round2(overheadPerUnit),
      gross_margin_per_unit: round2(grossMarginPerUnit),
      gross_profit_job: round2(grossProfitJob),
      gross_margin_pct: round2(grossMarginPct),
      revenue_total_usd: round2(rev),
      total_cogs_usd: round2(cogsPerUnit * q),
      completed_at: parsed.completed_at_iso ?? new Date().toISOString(),
    };

    this.state.jobs.push(record);
    this.persist();
    return record;
  }

  listJobs(): MillJobProfitability[] {
    return [...this.state.jobs];
  }

  getJob(jobId: string): MillJobProfitability | null {
    return this.state.jobs.find((j) => j.job_id === jobId) ?? null;
  }

  portfolio(input: Partial<MillPortfolioQueryInput> = {}): MillPortfolioReport {
    const parsed = MillPortfolioQueryInputSchema.parse(input);
    const since = parsed.since_iso ? Date.parse(parsed.since_iso) : null;
    const until = parsed.until_iso ? Date.parse(parsed.until_iso) : null;
    const jobs = this.state.jobs.filter((j) => {
      const ts = Date.parse(j.completed_at);
      if (since !== null && ts < since) return false;
      if (until !== null && ts > until) return false;
      return true;
    });

    const grouped = new Map<string, MillJobProfitability[]>();
    for (const job of jobs) {
      const key =
        parsed.by === "customer" ? job.customer
        : parsed.by === "part_number" ? job.part_number
        : parsed.by === "strategy" ? job.strategy
        : job.axis_count;
      const list = grouped.get(key) ?? [];
      list.push(job);
      grouped.set(key, list);
    }

    const rows: MillPortfolioRow[] = [];
    for (const [key, list] of grouped) {
      const totalRev = list.reduce((s, j) => s + j.revenue_total_usd, 0);
      const totalProfit = list.reduce((s, j) => s + j.gross_profit_job, 0);
      const margins = list.map((j) => j.gross_margin_pct);
      const avgMargin = margins.length > 0
        ? margins.reduce((s, m) => s + m, 0) / margins.length
        : 0;
      rows.push({
        key,
        jobs: list.length,
        total_revenue_usd: round2(totalRev),
        total_profit_usd: round2(totalProfit),
        avg_margin_pct: round2(avgMargin),
        best_margin_pct: round2(Math.max(...margins, 0)),
        worst_margin_pct: round2(margins.length > 0 ? Math.min(...margins) : 0),
      });
    }

    const top = [...rows].sort((a, b) => b.total_profit_usd - a.total_profit_usd).slice(0, parsed.top_n);
    const bottom = [...rows].sort((a, b) => a.total_profit_usd - b.total_profit_usd).slice(0, parsed.top_n);

    const totalRev = jobs.reduce((s, j) => s + j.revenue_total_usd, 0);
    const totalProfit = jobs.reduce((s, j) => s + j.gross_profit_job, 0);
    const overallMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

    const allMargins = jobs.map((j) => j.gross_margin_pct);
    const med = median(allMargins);
    const sd = stdev(allMargins);

    // Pareto: sort rows by revenue desc, count until cumulative ≥ 80%
    const byRev = [...rows].sort((a, b) => b.total_revenue_usd - a.total_revenue_usd);
    let cum = 0;
    let cutoffCount = 0;
    for (const row of byRev) {
      cutoffCount++;
      cum += row.total_revenue_usd;
      if (cum >= totalRev * PARETO_THRESHOLD) break;
    }
    const cutoffPct = totalRev > 0 ? (cum / totalRev) * 100 : 0;

    return {
      by: parsed.by,
      top_n: parsed.top_n,
      range: {
        since: parsed.since_iso ?? null,
        until: parsed.until_iso ?? null,
      },
      total_jobs: jobs.length,
      total_revenue_usd: round2(totalRev),
      total_profit_usd: round2(totalProfit),
      overall_margin_pct: round2(overallMargin),
      median_margin_pct: round2(med),
      stdev_margin_pct: round2(sd),
      pareto_cutoff_count: cutoffCount,
      pareto_cutoff_pct_revenue: round2(cutoffPct),
      top,
      bottom,
    };
  }

  getStats(): {
    cost_buckets: string[];
    mill_canonical_buckets: string[];
    portfolio_dims: string[];
    mill_canonical_dims: string[];
    pareto_threshold: number;
    reference: string;
  } {
    return {
      cost_buckets: [
        "material", "labor", "tool_wear", "setup",
        "fixture_amort", "energy", "overhead", // last 3 = mill-canonical extensions
      ],
      mill_canonical_buckets: ["fixture_amort", "energy"],
      portfolio_dims: ["customer", "part_number", "strategy", "axis_count"],
      mill_canonical_dims: ["strategy", "axis_count"],
      pareto_threshold: PARETO_THRESHOLD,
      reference: "Kaplan & Cooper ABC; Pareto 80/20; gross-margin = (rev − COGS)/rev",
    };
  }

  // ───────────────────────── internals ─────────────────────────────────

  private loadState(): MillProfitabilityState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as MillProfitabilityState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore */ }
      return this.freshState();
    }
  }

  private freshState(): MillProfitabilityState {
    return {
      schemaVersion: 1,
      jobs: [],
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(this.statePath, this.state);
  }

  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  __getState(): Readonly<MillProfitabilityState> {
    return this.state;
  }
}

export const millJobProfitabilityAnalyticsEngine = new MillJobProfitabilityAnalyticsEngine();
export { MillJobProfitabilityAnalyticsEngine };
