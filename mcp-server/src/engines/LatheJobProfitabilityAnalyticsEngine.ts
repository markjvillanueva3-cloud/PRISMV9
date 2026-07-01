/**
 * LatheJobProfitabilityAnalyticsEngine — U-LTH54 (LATHE-MASTER P5 ERP)
 *
 * Per-job profitability waterfall + customer / part portfolio analysis.
 *
 * Waterfall (unit economics):
 *   revenue_per_unit
 *     − material_cost
 *     − labor_cost         (cycle + setup × rates)
 *     − tool_wear_cost
 *     − overhead           (fraction of direct cost)
 *     ────────────────
 *     = gross_margin_per_unit
 *     × quantity
 *     = gross_profit_job
 *
 * Portfolio analytics:
 *   - Top-N / bottom-N by customer (aggregated gross_profit / margin_pct)
 *   - Top-N / bottom-N by part_number
 *   - Cumulative Pareto (80/20) on revenue concentration
 *   - Median + mean + stdev of margin_pct across portfolio
 *
 * Persistence:
 *   state/shared/lathe-profitability-state.json, schemaVersion=1.
 *
 * Citations:
 *   - ABC (Activity-Based Costing) — Kaplan & Cooper
 *   - Pareto principle / portfolio concentration analysis
 *   - Gross margin = (revenue − cogs) / revenue
 *
 * @milestone LATHE-MASTER U-LTH54
 * @version 1.0.0
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OVERHEAD_RATE = 0.15;
const PARETO_THRESHOLD = 0.8;

// ============================================================================
// SCHEMAS
// ============================================================================

export const RecordJobInputSchema = z.object({
  job_id: z.string().min(1),
  customer: z.string().min(1),
  part_number: z.string().min(1),
  quantity: z.number().int().positive(),
  revenue_total_usd: z.number().positive().finite(),
  material_cost_usd: z.number().min(0).finite(),
  labor_cost_usd: z.number().min(0).finite(),
  tool_wear_cost_usd: z.number().min(0).finite(),
  setup_cost_usd: z.number().min(0).finite().default(0),
  overhead_rate: z.number().min(0).max(1).optional(),
  completed_at_iso: z.string().datetime().optional(),
});
export type RecordJobInput = z.infer<typeof RecordJobInputSchema>;

export const PortfolioQueryInputSchema = z.object({
  by: z.enum(["customer", "part_number"]).default("customer"),
  top_n: z.number().int().min(1).max(1000).default(10),
  since_iso: z.string().datetime().optional(),
  until_iso: z.string().datetime().optional(),
});
export type PortfolioQueryInput = z.infer<typeof PortfolioQueryInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface JobProfitability {
  job_id: string;
  customer: string;
  part_number: string;
  quantity: number;
  revenue_per_unit: number;
  material_per_unit: number;
  labor_per_unit: number;
  tool_wear_per_unit: number;
  setup_per_unit: number;
  overhead_per_unit: number;
  gross_margin_per_unit: number;
  gross_profit_job: number;
  gross_margin_pct: number;
  revenue_total_usd: number;
  total_cogs_usd: number;
  completed_at: string;
}

export interface ProfitabilityState {
  schemaVersion: 1;
  jobs: JobProfitability[];
  updated_at: string;
}

export interface PortfolioRow {
  key: string;
  jobs: number;
  total_revenue_usd: number;
  total_profit_usd: number;
  avg_margin_pct: number;
  best_margin_pct: number;
  worst_margin_pct: number;
}

export interface PortfolioReport {
  by: "customer" | "part_number";
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
  top: PortfolioRow[];
  bottom: PortfolioRow[];
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-profitability-state.json";

class LatheJobProfitabilityAnalyticsEngine {
  private state: ProfitabilityState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  recordJob(input: RecordJobInput): JobProfitability {
    const parsed = RecordJobInputSchema.parse(input);
    if (this.state.jobs.some((j) => j.job_id === parsed.job_id)) {
      throw new Error(
        `LatheJobProfitabilityAnalyticsEngine: job_id '${parsed.job_id}' already recorded`,
      );
    }

    const rev = parsed.revenue_total_usd;
    const revPerUnit = rev / parsed.quantity;
    const matPerUnit = parsed.material_cost_usd / parsed.quantity;
    const laborPerUnit = parsed.labor_cost_usd / parsed.quantity;
    const toolPerUnit = parsed.tool_wear_cost_usd / parsed.quantity;
    const setupPerUnit = parsed.setup_cost_usd / parsed.quantity;
    const directPerUnit = matPerUnit + laborPerUnit + toolPerUnit + setupPerUnit;
    const overheadRate = parsed.overhead_rate ?? DEFAULT_OVERHEAD_RATE;
    const overheadPerUnit = directPerUnit * overheadRate;

    const cogsPerUnit = directPerUnit + overheadPerUnit;
    const grossMarginPerUnit = revPerUnit - cogsPerUnit;
    const grossProfitJob = grossMarginPerUnit * parsed.quantity;
    const grossMarginPct = rev > 0 ? (grossProfitJob / rev) * 100 : 0;

    const record: JobProfitability = {
      job_id: parsed.job_id,
      customer: parsed.customer,
      part_number: parsed.part_number,
      quantity: parsed.quantity,
      revenue_per_unit: round2(revPerUnit),
      material_per_unit: round2(matPerUnit),
      labor_per_unit: round2(laborPerUnit),
      tool_wear_per_unit: round2(toolPerUnit),
      setup_per_unit: round2(setupPerUnit),
      overhead_per_unit: round2(overheadPerUnit),
      gross_margin_per_unit: round2(grossMarginPerUnit),
      gross_profit_job: round2(grossProfitJob),
      gross_margin_pct: round2(grossMarginPct),
      revenue_total_usd: round2(rev),
      total_cogs_usd: round2(cogsPerUnit * parsed.quantity),
      completed_at: parsed.completed_at_iso ?? new Date().toISOString(),
    };

    this.state.jobs.push(record);
    this.persist();
    return record;
  }

  listJobs(): JobProfitability[] {
    return [...this.state.jobs];
  }

  getJob(jobId: string): JobProfitability | null {
    return this.state.jobs.find((j) => j.job_id === jobId) ?? null;
  }

  portfolio(input: z.input<typeof PortfolioQueryInputSchema> = {}): PortfolioReport {
    const parsed = PortfolioQueryInputSchema.parse(input);
    const since = parsed.since_iso ? Date.parse(parsed.since_iso) : null;
    const until = parsed.until_iso ? Date.parse(parsed.until_iso) : null;
    const jobs = this.state.jobs.filter((j) => {
      const ts = Date.parse(j.completed_at);
      if (since !== null && ts < since) return false;
      if (until !== null && ts > until) return false;
      return true;
    });

    const grouped = new Map<string, JobProfitability[]>();
    for (const job of jobs) {
      const key = parsed.by === "customer" ? job.customer : job.part_number;
      const list = grouped.get(key) ?? [];
      list.push(job);
      grouped.set(key, list);
    }

    const rows: PortfolioRow[] = [];
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
    const median = this.median(allMargins);
    const stdev = this.stdev(allMargins);

    // Pareto: sort rows by revenue desc, count until cumulative ≥ 80% of total
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
      median_margin_pct: round2(median),
      stdev_margin_pct: round2(stdev),
      pareto_cutoff_count: cutoffCount,
      pareto_cutoff_pct_revenue: round2(cutoffPct),
      top,
      bottom,
    };
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private stdev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private loadState(): ProfitabilityState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as ProfitabilityState;
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

  private freshState(): ProfitabilityState {
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

  __getState(): Readonly<ProfitabilityState> {
    return this.state;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const latheJobProfitabilityAnalyticsEngine = new LatheJobProfitabilityAnalyticsEngine();
export { LatheJobProfitabilityAnalyticsEngine };
