/**
 * LatheActualCostReconciliationEngine — U-LTH49 (LATHE-MASTER P5 ERP)
 *
 * Closes the quote → job → actuals → next-quote feedback loop. Takes the
 * QuotePackage produced by LatheAutoQuoteFromPrintEngine (U-LTH48) and a
 * ShopActuals record from the completed job, and produces:
 *
 *   1. Per-bucket variance  — predicted vs actual for material / tool-wear /
 *      cycle / setup in both absolute USD and percentage terms.
 *   2. Physics-root deltas  — where the variance came from in physical units:
 *      cycle_time_min_delta, material_mass_kg_delta, tool_changes_delta,
 *      setup_time_min_delta, scrap_rate_pct.
 *   3. Root-cause classification — one of:
 *      programming / tooling / setup / material / machine / operator / none.
 *      Heuristic driven by which delta dominates (argmax on |contribution|).
 *   4. Feedback packet     — per-bucket suggested multipliers in [0.8, 1.2]
 *      for the next quote on a similar job, capped at ±20% per-iteration.
 *   5. Running accuracy    — mean |variance %| over the last N reconciliations
 *      (persistent), bias (signed mean), stdev, sample count.
 *
 * Shop rates assumed (must match U-LTH48):
 *   MACHINE_RATE_USD_HR = 85
 *   SETUP_RATE_USD_HR   = 95
 *
 * Persistence:
 *   state/shared/lathe-reconciliation-state.json with schemaVersion=1.
 *   Ring-buffer of last 100 reconciliations per customer+material_iso_group.
 *
 * Citations:
 *   - Machinery's Handbook 31st (shop rate baselines)
 *   - Kaplan & Cooper, "Activity-Based Costing" (variance categorization)
 *
 * @milestone LATHE-MASTER U-LTH49
 * @version 1.0.0
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";
import type { QuotePackage } from "./LatheAutoQuoteFromPrintEngine.js";

// ============================================================================
// CONSTANTS (match U-LTH48 rates)
// ============================================================================

const MACHINE_RATE_USD_HR = 85;
const SETUP_RATE_USD_HR = 95;
const MULTIPLIER_MIN = 0.8;
const MULTIPLIER_MAX = 1.2;
const RING_CAPACITY = 100;
const ACCURACY_WINDOW_MAX = 20;

// ============================================================================
// SCHEMAS
// ============================================================================

export const ShopActualsSchema = z.object({
  actual_cycle_time_min: z.number().min(0).finite(),
  actual_material_mass_kg: z.number().min(0).finite(),
  actual_tool_changes: z.number().int().min(0),
  actual_setup_time_min: z.number().min(0).finite(),
  actual_scrap_parts: z.number().int().min(0),
  actual_rework_parts: z.number().int().min(0),
  actual_quantity_completed: z.number().int().min(0),
  actual_total_cost_usd: z.number().min(0).finite().optional(),
});
export type ShopActuals = z.infer<typeof ShopActualsSchema>;

export const ReconcileInputSchema = z.object({
  quote: z.any(),     // QuotePackage — structural check in-code
  actuals: ShopActualsSchema,
  customer: z.string().optional(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  part_number: z.string().optional(),
  job_id: z.string().optional(),
});
export type ReconcileInput = z.infer<typeof ReconcileInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export type RootCause =
  | "programming"
  | "tooling"
  | "setup"
  | "material"
  | "machine"
  | "operator"
  | "none";

export interface BucketVariance {
  bucket: "material" | "tool_wear" | "cycle" | "setup";
  predicted_usd: number;
  actual_usd: number;
  variance_usd: number;   // actual − predicted
  variance_pct: number;   // 100 * variance / predicted (0 when predicted=0)
  multiplier: number;     // clamped [0.8, 1.2] suggestion for next quote
}

export interface PhysicsDeltas {
  cycle_time_min_predicted: number;
  cycle_time_min_actual: number;
  cycle_time_min_delta: number;
  material_mass_kg_predicted: number;
  material_mass_kg_actual: number;
  material_mass_kg_delta: number;
  setup_time_min_predicted: number;
  setup_time_min_actual: number;
  setup_time_min_delta: number;
  tool_changes_predicted: number;
  tool_changes_actual: number;
  tool_changes_delta: number;
  scrap_rate_pct: number;
  rework_rate_pct: number;
}

export interface AccuracyStats {
  sample_count: number;
  mean_abs_variance_pct: number;
  bias_pct: number;                // signed mean (positive = chronically underquoted)
  stdev_variance_pct: number;
  worst_variance_pct: number;
  best_variance_pct: number;
}

export interface ReconciliationReport {
  reconciliation_id: string;
  generated_at: string;
  quote_id: string;
  customer?: string;
  part_number?: string;
  job_id?: string;
  material_iso_group?: string;
  buckets: BucketVariance[];
  total_predicted_unit_usd: number;
  total_actual_unit_usd: number;
  total_variance_usd: number;
  total_variance_pct: number;
  within_variance_band: boolean;
  physics: PhysicsDeltas;
  root_cause: RootCause;
  root_cause_notes: string;
  feedback_multipliers: {
    material: number;
    tool_wear: number;
    cycle: number;
    setup: number;
  };
  accuracy_over_prior_N: AccuracyStats;
}

export interface ReconciliationRecord {
  id: string;
  generated_at: string;
  customer?: string;
  material_iso_group?: string;
  predicted_unit_usd: number;
  actual_unit_usd: number;
  variance_pct: number;
}

export interface ReconciliationState {
  schemaVersion: 1;
  records: ReconciliationRecord[];
  next_seq: number;
  updated_at: string;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-reconciliation-state.json";

class LatheActualCostReconciliationEngine {
  private state: ReconciliationState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  /**
   * Reconcile a completed job against its original quote.
   * @returns ReconciliationReport with per-bucket variance, root-cause,
   *          feedback multipliers, and running accuracy window.
   */
  reconcile(input: ReconcileInput): ReconciliationReport {
    const parsed = ReconcileInputSchema.parse(input);
    const quote = parsed.quote as QuotePackage;
    const actuals = parsed.actuals;
    this.structuralCheck(quote);

    // --- Physics deltas ---
    const physics = this.computePhysicsDeltas(quote, actuals);

    // --- Per-bucket variance in USD ---
    const predictedMaterialPerUnitKg =
      quote.evidence.stock_mass_kg > 0
        ? quote.cost.material_usd / quote.evidence.stock_mass_kg
        : 0;
    const actualMaterialUsd = actuals.actual_material_mass_kg * predictedMaterialPerUnitKg;

    const actualCycleUsd = (actuals.actual_cycle_time_min / 60) * MACHINE_RATE_USD_HR;
    const actualSetupUsd = (actuals.actual_setup_time_min / 60) * SETUP_RATE_USD_HR;

    // Tool wear scales with actual cycle time (same tool-life physics as U-LTH48)
    const predictedCycleMin = quote.evidence.total_cycle_min || 1;
    const cycleRatio = actuals.actual_cycle_time_min / predictedCycleMin;
    const actualToolWearUsd = quote.cost.tool_wear_usd * cycleRatio;

    const buckets: BucketVariance[] = [
      this.bucketVariance("material", quote.cost.material_usd, actualMaterialUsd),
      this.bucketVariance("tool_wear", quote.cost.tool_wear_usd, actualToolWearUsd),
      this.bucketVariance("cycle", quote.cost.cycle_usd, actualCycleUsd),
      this.bucketVariance("setup", quote.cost.setup_usd, actualSetupUsd),
    ];

    const totalPredicted = quote.cost.total_unit_price_usd;
    const totalActualDelta =
      actualMaterialUsd - quote.cost.material_usd +
      actualToolWearUsd - quote.cost.tool_wear_usd +
      actualCycleUsd - quote.cost.cycle_usd +
      actualSetupUsd - quote.cost.setup_usd;
    const totalActual = round2(
      actuals.actual_total_cost_usd ?? totalPredicted + totalActualDelta,
    );
    const totalVarianceUsd = round2(totalActual - totalPredicted);
    const totalVariancePct = totalPredicted > 0
      ? round2((totalVarianceUsd / totalPredicted) * 100)
      : 0;

    const band = quote.variance_band;
    const withinBand = totalActual >= band.low_usd && totalActual <= band.high_usd;

    // --- Root cause (argmax by absolute variance usd, with physics tiebreak) ---
    const { rootCause, notes } = this.classifyRootCause(buckets, physics, actuals);

    // --- Persist summary record + compute accuracy window ---
    const record: ReconciliationRecord = {
      id: `rec_${this.state.next_seq.toString().padStart(6, "0")}`,
      generated_at: new Date().toISOString(),
      customer: parsed.customer,
      material_iso_group: parsed.material_iso_group,
      predicted_unit_usd: totalPredicted,
      actual_unit_usd: totalActual,
      variance_pct: totalVariancePct,
    };
    this.state.next_seq++;
    this.state.records.push(record);
    if (this.state.records.length > RING_CAPACITY) {
      this.state.records.splice(0, this.state.records.length - RING_CAPACITY);
    }
    this.persist();

    const accuracy = this.computeAccuracyStats(parsed.customer, parsed.material_iso_group);

    return {
      reconciliation_id: record.id,
      generated_at: record.generated_at,
      quote_id: quote.quote_id,
      customer: parsed.customer,
      part_number: parsed.part_number,
      job_id: parsed.job_id,
      material_iso_group: parsed.material_iso_group,
      buckets,
      total_predicted_unit_usd: totalPredicted,
      total_actual_unit_usd: totalActual,
      total_variance_usd: totalVarianceUsd,
      total_variance_pct: totalVariancePct,
      within_variance_band: withinBand,
      physics,
      root_cause: rootCause,
      root_cause_notes: notes,
      feedback_multipliers: {
        material: buckets[0].multiplier,
        tool_wear: buckets[1].multiplier,
        cycle: buckets[2].multiplier,
        setup: buckets[3].multiplier,
      },
      accuracy_over_prior_N: accuracy,
    };
  }

  /**
   * Get accuracy stats for a given customer + material slice, or global when omitted.
   * Used by the quote engine's next-iteration tuning.
   */
  getAccuracyStats(customer?: string, isoGroup?: string): AccuracyStats {
    return this.computeAccuracyStats(customer, isoGroup);
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private structuralCheck(quote: QuotePackage): void {
    if (!quote || typeof quote !== "object") {
      throw new Error("LatheActualCostReconciliationEngine: quote missing");
    }
    if (!quote.cost || typeof quote.cost.total_unit_price_usd !== "number") {
      throw new Error("LatheActualCostReconciliationEngine: quote.cost.total_unit_price_usd missing");
    }
    if (!quote.variance_band) {
      throw new Error("LatheActualCostReconciliationEngine: quote.variance_band missing");
    }
    if (!quote.evidence) {
      throw new Error("LatheActualCostReconciliationEngine: quote.evidence missing");
    }
  }

  private bucketVariance(
    bucket: BucketVariance["bucket"],
    predicted: number,
    actual: number,
  ): BucketVariance {
    const varianceUsd = actual - predicted;
    const variancePct = predicted > 0 ? (varianceUsd / predicted) * 100 : 0;
    // Multiplier: move halfway toward realized ratio, capped. Averaging keeps
    // tuning stable (no single large job jumps the quote by 50%).
    const realizedRatio = predicted > 0 ? actual / predicted : 1;
    const rawMultiplier = (1 + realizedRatio) / 2;
    const clamped = Math.max(MULTIPLIER_MIN, Math.min(MULTIPLIER_MAX, rawMultiplier));
    return {
      bucket,
      predicted_usd: round2(predicted),
      actual_usd: round2(actual),
      variance_usd: round2(varianceUsd),
      variance_pct: round2(variancePct),
      multiplier: round3(clamped),
    };
  }

  private computePhysicsDeltas(quote: QuotePackage, actuals: ShopActuals): PhysicsDeltas {
    const predictedSetupMin = quote.evidence.setup_count * 45; // matches U-LTH48 SETUP_MIN_PER_SETUP
    const predictedToolChanges = Math.max(1, quote.evidence.operation_count - 1);
    const quantity = Math.max(1, actuals.actual_quantity_completed);
    const scrapRate = (actuals.actual_scrap_parts / quantity) * 100;
    const reworkRate = (actuals.actual_rework_parts / quantity) * 100;
    return {
      cycle_time_min_predicted: round2(quote.evidence.total_cycle_min),
      cycle_time_min_actual: round2(actuals.actual_cycle_time_min),
      cycle_time_min_delta: round2(actuals.actual_cycle_time_min - quote.evidence.total_cycle_min),
      material_mass_kg_predicted: round3(quote.evidence.stock_mass_kg),
      material_mass_kg_actual: round3(actuals.actual_material_mass_kg),
      material_mass_kg_delta: round3(actuals.actual_material_mass_kg - quote.evidence.stock_mass_kg),
      setup_time_min_predicted: predictedSetupMin,
      setup_time_min_actual: round2(actuals.actual_setup_time_min),
      setup_time_min_delta: round2(actuals.actual_setup_time_min - predictedSetupMin),
      tool_changes_predicted: predictedToolChanges,
      tool_changes_actual: actuals.actual_tool_changes,
      tool_changes_delta: actuals.actual_tool_changes - predictedToolChanges,
      scrap_rate_pct: round2(scrapRate),
      rework_rate_pct: round2(reworkRate),
    };
  }

  private classifyRootCause(
    buckets: BucketVariance[],
    physics: PhysicsDeltas,
    actuals: ShopActuals,
  ): { rootCause: RootCause; notes: string } {
    // Scrap dominates: machining/tooling fault surface
    if (physics.scrap_rate_pct > 5) {
      return {
        rootCause: "tooling",
        notes: `High scrap rate ${physics.scrap_rate_pct}% (>5%) — likely tool wear, insert grade, or speed/feed mis-tune`,
      };
    }
    if (physics.rework_rate_pct > 10) {
      return {
        rootCause: "programming",
        notes: `High rework rate ${physics.rework_rate_pct}% (>10%) — program geometry or tolerance issue`,
      };
    }

    // argmax by |variance_usd| among buckets with meaningful variance (>5%)
    const meaningful = buckets.filter((b) => Math.abs(b.variance_pct) > 5);
    if (meaningful.length === 0) {
      return { rootCause: "none", notes: "All buckets within ±5% — quote was accurate" };
    }
    meaningful.sort((a, b) => Math.abs(b.variance_usd) - Math.abs(a.variance_usd));
    const dominant = meaningful[0];

    switch (dominant.bucket) {
      case "material":
        return {
          rootCause: "material",
          notes: `Material variance ${dominant.variance_pct}% — stock size over/under-ordered, or scrap higher than nominal`,
        };
      case "cycle":
        // Large cycle delta → programming vs machine issue separation
        if (physics.cycle_time_min_delta > 0 && dominant.variance_pct > 15) {
          return {
            rootCause: "programming",
            notes: `Cycle time over by ${physics.cycle_time_min_delta.toFixed(1)} min (${dominant.variance_pct}%) — optimization candidate`,
          };
        }
        return {
          rootCause: "machine",
          notes: `Cycle time variance ${dominant.variance_pct}% — feedrate override, spindle recovery, or unplanned dwells`,
        };
      case "setup":
        return {
          rootCause: "setup",
          notes: `Setup time variance ${dominant.variance_pct}% — fixture build, dial-in, or probe sequence took longer than budgeted`,
        };
      case "tool_wear":
        return {
          rootCause: "tooling",
          notes: `Tool wear variance ${dominant.variance_pct}% — insert grade mismatch or Taylor C underestimated for this material`,
        };
      default:
        return { rootCause: "none", notes: "Unclassified variance" };
    }
  }

  private computeAccuracyStats(customer?: string, isoGroup?: string): AccuracyStats {
    const filtered = this.state.records.filter((r) => {
      if (customer && r.customer !== customer) return false;
      if (isoGroup && r.material_iso_group !== isoGroup) return false;
      return true;
    });
    const window = filtered.slice(-ACCURACY_WINDOW_MAX);
    if (window.length === 0) {
      return {
        sample_count: 0,
        mean_abs_variance_pct: 0,
        bias_pct: 0,
        stdev_variance_pct: 0,
        worst_variance_pct: 0,
        best_variance_pct: 0,
      };
    }
    const absAvg = window.reduce((s, r) => s + Math.abs(r.variance_pct), 0) / window.length;
    const bias = window.reduce((s, r) => s + r.variance_pct, 0) / window.length;
    const variance =
      window.reduce((s, r) => s + (r.variance_pct - bias) ** 2, 0) / window.length;
    const worst = window.reduce((m, r) => Math.max(m, Math.abs(r.variance_pct)), 0);
    const best = window.reduce((m, r) => Math.min(m, Math.abs(r.variance_pct)), Infinity);
    return {
      sample_count: window.length,
      mean_abs_variance_pct: round2(absAvg),
      bias_pct: round2(bias),
      stdev_variance_pct: round2(Math.sqrt(variance)),
      worst_variance_pct: round2(worst),
      best_variance_pct: round2(best === Infinity ? 0 : best),
    };
  }

  private loadState(): ReconciliationState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as ReconciliationState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch {
        // swallow backup failure
      }
      return this.freshState();
    }
  }

  private freshState(): ReconciliationState {
    return {
      schemaVersion: 1,
      records: [],
      next_seq: 1,
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    atomicWriteJson(this.statePath, this.state);
  }

  /** TEST-ONLY: reset state. */
  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  /** TEST-ONLY: state accessor. */
  __getState(): Readonly<ReconciliationState> {
    return this.state;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheActualCostReconciliationEngine = new LatheActualCostReconciliationEngine();
export { LatheActualCostReconciliationEngine };
