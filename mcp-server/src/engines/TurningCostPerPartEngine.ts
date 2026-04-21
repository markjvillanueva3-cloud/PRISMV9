/**
 * TurningCostPerPartEngine
 * ========================
 *
 * 7-bucket total-cost-per-part model for turning operations (U-LPE01, MS10).
 * The caller supplies the inputs for each bucket; the engine sums them,
 * reports the percentage contribution of each bucket, and flags any bucket
 * that exceeds a sanity threshold (caller-supplied benchmarks).
 *
 * ── The 7 buckets ──────────────────────────────────────────────
 *   1. machine_time   — cycle_time × loaded_rate
 *   2. tool_cost      — Σ (insert_cost / edges_per_insert) per tool-change
 *   3. material_cost  — blank_weight × price_per_kg − recoverable_remnant_credit
 *   4. setup          — setup_time × loaded_rate / batch_size
 *   5. quality        — scrap_rate × part_value + rework_cost_per_part
 *   6. energy         — machine_kW × cycle_time_h × energy_price_per_kwh
 *   7. secondary_ops  — sum of 3rd-party / in-house non-turning operations
 *
 * The engine is deliberately narrow — it does NOT re-implement any of the
 * existing cost engines (`JobCostingEngine`, `ActualCostEngine`,
 * `QuoteEstimatorEngine`). It aggregates their outputs into one
 * cost-per-part view and exposes the % contribution of each bucket so the
 * caller (or the `cost-sanity-gate` hook) can flag anomalies.
 *
 * ── Gilbert/Taylor coupling (U-LPE02) ─────────────────────────
 *   The machine_time bucket can be recomputed under three economic speed
 *   regimes (Vc_min_cost, Vc_max_production, Vc_max_profit); the caller
 *   supplies one cycle_time per regime and the engine returns a per-regime
 *   cost breakdown. The regime recommendation becomes:
 *     - Vc_min_cost       when tool_cost is the dominant bucket
 *     - Vc_max_production when setup amortization dominates (small batches)
 *     - Vc_max_profit     when machine_time + material dominate equally
 *
 * @module engines/TurningCostPerPartEngine
 * @milestone LATHE-PRO-MS10 / U-LPE01-02
 */

export interface CostBucketInput {
  /** Machine-time bucket: cycle time (min) × machine loaded rate ($/hr). */
  cycle_time_min: number;
  loaded_rate_per_hr: number;
  /** Tool-cost bucket: dollars per part consumed in insert edges. */
  tool_cost_per_part: number;
  /** Material-cost bucket. */
  blank_weight_kg: number;
  material_price_per_kg: number;
  recoverable_remnant_credit_per_part?: number;
  /** Setup bucket: setup time (min) × loaded rate / batch size. */
  setup_time_min: number;
  batch_size: number;
  /** Quality bucket: scrap rate (0-1) × part_value + rework $/part. */
  scrap_rate: number;
  part_value_per_part: number;
  rework_cost_per_part?: number;
  /** Energy bucket. Default 10 kW machine, 0.12 USD/kWh. */
  machine_kw?: number;
  energy_price_per_kwh?: number;
  /** Secondary-ops bucket: sum of non-turning op costs per part. */
  secondary_ops_per_part?: number;
  /** Caller benchmarks (USD/part) used to flag sanity issues. */
  benchmark_max_per_part?: number;
}

export type CostBucketName =
  | "machine_time"
  | "tool_cost"
  | "material_cost"
  | "setup"
  | "quality"
  | "energy"
  | "secondary_ops";

export interface CostBucketResult {
  name: CostBucketName;
  cost_per_part: number;
  percent_of_total: number;
}

export interface CostPerPartResult {
  total_cost_per_part: number;
  buckets: CostBucketResult[];
  /** The bucket name with the largest share. */
  dominant_bucket: CostBucketName;
  /** Recommended Gilbert/Taylor regime based on dominant bucket. */
  recommended_regime: "Vc_min_cost" | "Vc_max_production" | "Vc_max_profit";
  /** True when total_cost_per_part ≤ benchmark_max_per_part (if supplied). */
  within_benchmark: boolean;
  warnings: string[];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export class TurningCostPerPartEngine {
  /**
   * Compute the 7 cost buckets + dominant-bucket analysis + regime recommendation.
   */
  calculate(input: CostBucketInput): CostPerPartResult {
    const warnings: string[] = [];

    const cycleHr = input.cycle_time_min / 60;
    const machine_time = cycleHr * input.loaded_rate_per_hr;

    const tool_cost = input.tool_cost_per_part;

    const material_gross = input.blank_weight_kg * input.material_price_per_kg;
    const material_cost = Math.max(
      0,
      material_gross - (input.recoverable_remnant_credit_per_part ?? 0),
    );

    const setup =
      input.batch_size > 0
        ? (input.setup_time_min / 60) * input.loaded_rate_per_hr / input.batch_size
        : 0;

    const scrapPortion = Math.max(0, Math.min(1, input.scrap_rate));
    const quality = scrapPortion * input.part_value_per_part + (input.rework_cost_per_part ?? 0);

    const kw = input.machine_kw ?? 10;
    const eRate = input.energy_price_per_kwh ?? 0.12;
    const energy = cycleHr * kw * eRate;

    const secondary_ops = input.secondary_ops_per_part ?? 0;

    const subtotals: Array<[CostBucketName, number]> = [
      ["machine_time", machine_time],
      ["tool_cost", tool_cost],
      ["material_cost", material_cost],
      ["setup", setup],
      ["quality", quality],
      ["energy", energy],
      ["secondary_ops", secondary_ops],
    ];

    const total = subtotals.reduce((s, [, v]) => s + v, 0);
    const buckets: CostBucketResult[] = subtotals.map(([name, cost]) => ({
      name,
      cost_per_part: round4(cost),
      percent_of_total: total > 0 ? round4((cost / total) * 100) : 0,
    }));

    let dominant: CostBucketName = "machine_time";
    let topPct = -1;
    for (const b of buckets) {
      if (b.percent_of_total > topPct) {
        topPct = b.percent_of_total;
        dominant = b.name;
      }
    }

    // Regime recommendation from dominant bucket:
    //   tool_cost dominates  → Vc_min_cost (slow down to preserve edges)
    //   setup dominates      → Vc_max_production (push throughput)
    //   otherwise            → Vc_max_profit (balanced)
    let regime: CostPerPartResult["recommended_regime"] = "Vc_max_profit";
    if (dominant === "tool_cost") regime = "Vc_min_cost";
    else if (dominant === "setup") regime = "Vc_max_production";

    // Sanity checks.
    if (input.batch_size <= 0) {
      warnings.push("batch_size ≤ 0 — setup bucket treated as 0, likely incorrect.");
    }
    if (scrapPortion > 0.1) {
      warnings.push(`scrap_rate ${scrapPortion} > 10% — quality bucket dominates; investigate process.`);
    }
    const within_benchmark =
      input.benchmark_max_per_part == null || total <= input.benchmark_max_per_part;
    if (!within_benchmark) {
      warnings.push(
        `Total cost/part ${round4(total)} exceeds benchmark ${input.benchmark_max_per_part}.`,
      );
    }

    return {
      total_cost_per_part: round4(total),
      buckets,
      dominant_bucket: dominant,
      recommended_regime: regime,
      within_benchmark,
      warnings,
    };
  }
}

/** Singleton instance. */
export const turningCostPerPartEngine = new TurningCostPerPartEngine();
