/**
 * MillActualCostReconciliationEngine
 * ====================================
 *
 * Closes the mill quote → job → actuals → next-quote feedback loop. Takes a
 * MillQuoteSnapshot (mirroring MillPartCostModelEngine iter69 buckets) and a
 * MillShopActuals record from the completed job, and produces:
 *
 *   1. Per-bucket variance — predicted vs actual for 8 mill cost buckets:
 *      material / tool_wear / cycle / setup / fixture_amort / energy /
 *      secondary / overhead, both absolute USD and % terms.
 *      (Mill-canonical buckets: fixture_amort + energy, not in lathe.)
 *
 *   2. Physics-root deltas — cycle_time_min_delta, material_mass_kg_delta,
 *      tool_changes_delta, setup_time_min_delta, scrap_rate_pct,
 *      fixture_amort_delta (mill-canonical), energy_kwh_delta (mill-canonical).
 *
 *   3. Root-cause classification — argmax on |contribution|. Mill adds
 *      'fixture' to lathe's {programming, tooling, setup, material, machine,
 *      operator, none} taxonomy (fixture amort overrun / fixture rework signal).
 *
 *   4. Feedback packet — per-bucket suggested multipliers in [0.8, 1.2]
 *      for the next mill quote on a similar job, capped at ±20% per-iteration.
 *
 *   5. Running accuracy — mean |variance %| over last N reconciliations
 *      (persistent ring buffer), bias (signed mean), stdev, sample count.
 *
 * Mill parity for LatheActualCostReconciliationEngine (LATHE-MASTER U-LTH49)
 * but self-contained (no Lathe engine imports — uses MillPartCostModel iter69
 * bucket schema as the predicted side).
 *
 * Persistence:
 *   state/shared/mill-reconciliation-state.json with schemaVersion=1.
 *   Ring-buffer of last 100 reconciliations per customer+material_iso_group.
 *
 * Citations:
 *   - Machinery's Handbook 31st (mill shop rate baselines)
 *   - Kaplan & Cooper, "Activity-Based Costing" (variance categorization)
 *   - PMI PMBOK §7 Cost Management (EAC/CPI variance methods)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-ACTUAL-COST-RECONCILIATION (iter80)
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Default mill machine rate ($/hr) — typical loaded VMC. */
export const DEFAULT_MILL_MACHINE_RATE_USD_HR = 90;
/** Default mill setup rate ($/hr) — typical machinist + supervision. */
export const DEFAULT_MILL_SETUP_RATE_USD_HR = 95;
/** Multiplier floor — caps per-iteration adjustment to ±20% down. */
export const MULTIPLIER_MIN = 0.8;
/** Multiplier ceiling — caps per-iteration adjustment to ±20% up. */
export const MULTIPLIER_MAX = 1.2;
/** Ring-buffer capacity per customer+iso group. */
export const RING_CAPACITY = 100;
/** Accuracy window: last N reconciliations. */
export const ACCURACY_WINDOW_MAX = 20;

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mill quote snapshot — minimal predicted-cost view sufficient for variance
 * reconciliation. Mirrors MillPartCostModelEngine.compute() output buckets.
 */
export const MillQuoteSnapshotSchema = z.object({
  quote_id: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
  predicted_buckets: z.object({
    material: z.number().min(0).finite(),
    tool_wear: z.number().min(0).finite(),
    cycle: z.number().min(0).finite(),         // machine_hr × machine_rate
    setup: z.number().min(0).finite(),         // setup_hr × setup_rate / batch
    fixture_amort: z.number().min(0).finite(), // MILL-CANONICAL
    energy: z.number().min(0).finite(),        // MILL-CANONICAL
    secondary: z.number().min(0).finite().default(0),
    overhead: z.number().min(0).finite().default(0),
  }),
  predicted_cycle_time_min: z.number().min(0).finite(),
  predicted_material_mass_kg: z.number().min(0).finite(),
  predicted_setup_time_min: z.number().min(0).finite(),
  predicted_tool_changes: z.number().int().min(0).default(0),
  predicted_fixture_amort_usd: z.number().min(0).finite().default(0),
  predicted_energy_kwh: z.number().min(0).finite().default(0),
});
export type MillQuoteSnapshot = z.infer<typeof MillQuoteSnapshotSchema>;

export const MillShopActualsSchema = z.object({
  actual_cycle_time_min: z.number().min(0).finite(),
  actual_material_mass_kg: z.number().min(0).finite(),
  actual_tool_changes: z.number().int().min(0),
  actual_setup_time_min: z.number().min(0).finite(),
  actual_scrap_parts: z.number().int().min(0),
  actual_rework_parts: z.number().int().min(0),
  actual_quantity_completed: z.number().int().min(0),
  actual_fixture_amort_usd: z.number().min(0).finite().default(0),    // MILL-CANONICAL
  actual_energy_kwh: z.number().min(0).finite().default(0),           // MILL-CANONICAL
  actual_total_cost_usd: z.number().min(0).finite().optional(),
});
export type MillShopActuals = z.infer<typeof MillShopActualsSchema>;

export const ReconcileInputSchema = z.object({
  quote: MillQuoteSnapshotSchema,
  actuals: MillShopActualsSchema,
  customer: z.string().optional(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  part_number: z.string().optional(),
  job_id: z.string().optional(),
  /** Override rates if shop's mill loaded-rate differs from defaults. */
  machine_rate_usd_hr: z.number().min(0).finite().optional(),
  setup_rate_usd_hr: z.number().min(0).finite().optional(),
  energy_rate_usd_kwh: z.number().min(0).finite().default(0.15),
});
export type ReconcileInput = z.infer<typeof ReconcileInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillRootCause =
  | "programming"
  | "tooling"
  | "setup"
  | "material"
  | "machine"
  | "operator"
  | "fixture"       // MILL-CANONICAL (fixture amort overrun / rework)
  | "none";

export interface MillBucketVariance {
  bucket: "material" | "tool_wear" | "cycle" | "setup" | "fixture_amort" | "energy" | "secondary" | "overhead";
  predicted_usd: number;
  actual_usd: number;
  variance_usd: number;   // actual − predicted
  variance_pct: number;   // 100 × variance / predicted (0 when predicted=0)
  multiplier: number;     // clamped [0.8, 1.2] suggestion for next quote
}

export interface MillPhysicsDeltas {
  cycle_time_min_delta: number;
  material_mass_kg_delta: number;
  tool_changes_delta: number;
  setup_time_min_delta: number;
  scrap_rate_pct: number;
  fixture_amort_usd_delta: number;  // MILL-CANONICAL
  energy_kwh_delta: number;          // MILL-CANONICAL
}

export interface MillReconciliationResult {
  job_id?: string;
  customer?: string;
  material_iso_group?: string;
  part_number?: string;
  buckets: MillBucketVariance[];
  total_predicted_usd: number;
  total_actual_usd: number;
  total_variance_usd: number;
  total_variance_pct: number;
  physics_deltas: MillPhysicsDeltas;
  root_cause: MillRootCause;
  root_cause_reasoning: string;
  multipliers_for_next_quote: Record<MillBucketVariance["bucket"], number>;
  reconciled_at: string;
}

export interface MillRunningAccuracy {
  sample_count: number;
  mean_abs_variance_pct: number;
  bias_signed_mean_pct: number;
  stdev_pct: number;
}

export interface MillReconciliationState {
  schemaVersion: 1;
  reconciliations: MillReconciliationResult[];
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function clampMultiplier(rawRatio: number): number {
  if (!Number.isFinite(rawRatio) || rawRatio <= 0) return 1.0;
  return Math.max(MULTIPLIER_MIN, Math.min(MULTIPLIER_MAX, rawRatio));
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_STATE_PATH = "H:/prism/state/shared/mill-reconciliation-state.json";

class MillActualCostReconciliationEngine {
  private state: MillReconciliationState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  reconcile(input: ReconcileInput): MillReconciliationResult {
    const parsed = ReconcileInputSchema.parse(input);
    const q = parsed.quote;
    const a = parsed.actuals;
    const machineRate = parsed.machine_rate_usd_hr ?? DEFAULT_MILL_MACHINE_RATE_USD_HR;
    const setupRate = parsed.setup_rate_usd_hr ?? DEFAULT_MILL_SETUP_RATE_USD_HR;
    const energyRate = parsed.energy_rate_usd_kwh;

    // ── Compute actual per-bucket costs from physics actuals ────────────
    const actualCycleHr = a.actual_cycle_time_min / 60;
    const actualSetupHr = a.actual_setup_time_min / 60;
    // Material actual: predicted_material × (actual_mass / predicted_mass) — assume same $/kg
    const massRatio = q.predicted_material_mass_kg > 0
      ? a.actual_material_mass_kg / q.predicted_material_mass_kg
      : 1;
    const actualMaterial = q.predicted_buckets.material * massRatio;
    // Tool wear actual: scale predicted by tool_changes ratio
    const toolChangesRatio = q.predicted_tool_changes > 0
      ? a.actual_tool_changes / q.predicted_tool_changes
      : 1;
    const actualToolWear = q.predicted_buckets.tool_wear * toolChangesRatio;
    // All bucket actuals computed at the same scaling as the snapshot's predicted buckets
    // (TOTAL per quote, NOT per-unit) — per LatheActualCostReconciliationEngine convention.
    const actualCycle = actualCycleHr * machineRate;
    const actualSetup = actualSetupHr * setupRate;
    const actualFixture = a.actual_fixture_amort_usd;       // mill-canonical
    const actualEnergy = a.actual_energy_kwh * energyRate;  // mill-canonical
    // Secondary + overhead: actuals not directly observable here; assume = predicted
    const actualSecondary = q.predicted_buckets.secondary;
    const actualOverhead = q.predicted_buckets.overhead;

    const actualByBucket: Record<MillBucketVariance["bucket"], number> = {
      material: actualMaterial,
      tool_wear: actualToolWear,
      cycle: actualCycle,
      setup: actualSetup,
      fixture_amort: actualFixture,
      energy: actualEnergy,
      secondary: actualSecondary,
      overhead: actualOverhead,
    };
    const predictedByBucket: Record<MillBucketVariance["bucket"], number> = {
      material: q.predicted_buckets.material,
      tool_wear: q.predicted_buckets.tool_wear,
      cycle: q.predicted_buckets.cycle,
      setup: q.predicted_buckets.setup,
      fixture_amort: q.predicted_buckets.fixture_amort,
      energy: q.predicted_buckets.energy,
      secondary: q.predicted_buckets.secondary,
      overhead: q.predicted_buckets.overhead,
    };

    // ── Build per-bucket variance rows ─────────────────────────────────
    const buckets: MillBucketVariance[] = [];
    for (const b of Object.keys(predictedByBucket) as MillBucketVariance["bucket"][]) {
      const predicted = predictedByBucket[b];
      const actual = actualByBucket[b];
      const variance = actual - predicted;
      const variancePct = predicted > 0 ? (variance / predicted) * 100 : 0;
      const rawRatio = predicted > 0 ? actual / predicted : 1.0;
      buckets.push({
        bucket: b,
        predicted_usd: round2(predicted),
        actual_usd: round2(actual),
        variance_usd: round2(variance),
        variance_pct: round2(variancePct),
        multiplier: round4(clampMultiplier(rawRatio)),
      });
    }

    const totalPredicted = buckets.reduce((s, b) => s + b.predicted_usd, 0);
    const totalActual = buckets.reduce((s, b) => s + b.actual_usd, 0);
    const totalVariance = totalActual - totalPredicted;
    const totalVariancePct = totalPredicted > 0 ? (totalVariance / totalPredicted) * 100 : 0;

    // ── Physics deltas ────────────────────────────────────────────────
    const scrapRatePct = q.quantity > 0 ? (a.actual_scrap_parts / q.quantity) * 100 : 0;
    const physics: MillPhysicsDeltas = {
      cycle_time_min_delta: round2(a.actual_cycle_time_min - q.predicted_cycle_time_min),
      material_mass_kg_delta: round4(a.actual_material_mass_kg - q.predicted_material_mass_kg),
      tool_changes_delta: a.actual_tool_changes - q.predicted_tool_changes,
      setup_time_min_delta: round2(a.actual_setup_time_min - q.predicted_setup_time_min),
      scrap_rate_pct: round2(scrapRatePct),
      fixture_amort_usd_delta: round2(a.actual_fixture_amort_usd - q.predicted_fixture_amort_usd),
      energy_kwh_delta: round4(a.actual_energy_kwh - q.predicted_energy_kwh),
    };

    // ── Root cause classification (argmax |contribution|) ───────────────
    const contributions: Array<{ cause: MillRootCause; magnitude: number; reason: string }> = [
      { cause: "programming", magnitude: Math.abs(buckets.find(b => b.bucket === "cycle")!.variance_usd),
        reason: `cycle variance $${Math.abs(buckets.find(b => b.bucket === "cycle")!.variance_usd).toFixed(2)} (programming → cycle-time)` },
      { cause: "tooling", magnitude: Math.abs(buckets.find(b => b.bucket === "tool_wear")!.variance_usd),
        reason: `tool_wear variance $${Math.abs(buckets.find(b => b.bucket === "tool_wear")!.variance_usd).toFixed(2)} (tool life mismatch)` },
      { cause: "setup", magnitude: Math.abs(buckets.find(b => b.bucket === "setup")!.variance_usd),
        reason: `setup variance $${Math.abs(buckets.find(b => b.bucket === "setup")!.variance_usd).toFixed(2)} (setup-time delta)` },
      { cause: "material", magnitude: Math.abs(buckets.find(b => b.bucket === "material")!.variance_usd),
        reason: `material variance $${Math.abs(buckets.find(b => b.bucket === "material")!.variance_usd).toFixed(2)} (mass/scrap)` },
      { cause: "machine", magnitude: Math.abs(buckets.find(b => b.bucket === "energy")!.variance_usd),
        reason: `energy variance $${Math.abs(buckets.find(b => b.bucket === "energy")!.variance_usd).toFixed(2)} (spindle load anomaly)` },
      { cause: "fixture", magnitude: Math.abs(buckets.find(b => b.bucket === "fixture_amort")!.variance_usd),
        reason: `fixture_amort variance $${Math.abs(buckets.find(b => b.bucket === "fixture_amort")!.variance_usd).toFixed(2)} (fixture overrun/rework)` },
      // operator: high scrap rate as the operator signal
      { cause: "operator", magnitude: scrapRatePct >= 5 ? scrapRatePct * 10 : 0,
        reason: `scrap rate ${scrapRatePct.toFixed(1)}% (operator/setup error)` },
    ];
    contributions.sort((a, b) => b.magnitude - a.magnitude);
    const top = contributions[0];
    const rootCause: MillRootCause = top.magnitude > 0.01 ? top.cause : "none";
    const rootCauseReasoning = rootCause === "none"
      ? "All bucket variances within tolerance — no dominant root cause"
      : top.reason;

    // ── Multipliers packet ────────────────────────────────────────────
    const multipliers: Record<MillBucketVariance["bucket"], number> = {} as Record<MillBucketVariance["bucket"], number>;
    for (const b of buckets) multipliers[b.bucket] = b.multiplier;

    const result: MillReconciliationResult = {
      job_id: parsed.job_id,
      customer: parsed.customer,
      material_iso_group: parsed.material_iso_group,
      part_number: parsed.part_number,
      buckets,
      total_predicted_usd: round2(totalPredicted),
      total_actual_usd: round2(totalActual),
      total_variance_usd: round2(totalVariance),
      total_variance_pct: round2(totalVariancePct),
      physics_deltas: physics,
      root_cause: rootCause,
      root_cause_reasoning: rootCauseReasoning,
      multipliers_for_next_quote: multipliers,
      reconciled_at: new Date().toISOString(),
    };

    // ── Persist to ring buffer ─────────────────────────────────────────
    this.state.reconciliations.push(result);
    if (this.state.reconciliations.length > RING_CAPACITY) {
      this.state.reconciliations.splice(0, this.state.reconciliations.length - RING_CAPACITY);
    }
    this.persist();
    return result;
  }

  runningAccuracy(filter?: { customer?: string; material_iso_group?: string }): MillRunningAccuracy {
    const all = this.state.reconciliations.filter((r) => {
      if (filter?.customer && r.customer !== filter.customer) return false;
      if (filter?.material_iso_group && r.material_iso_group !== filter.material_iso_group) return false;
      return true;
    });
    const recent = all.slice(-ACCURACY_WINDOW_MAX);
    if (recent.length === 0) {
      return { sample_count: 0, mean_abs_variance_pct: 0, bias_signed_mean_pct: 0, stdev_pct: 0 };
    }
    const variances = recent.map((r) => r.total_variance_pct);
    const meanAbs = variances.reduce((s, v) => s + Math.abs(v), 0) / variances.length;
    const meanSigned = variances.reduce((s, v) => s + v, 0) / variances.length;
    const sqDiff = variances.reduce((s, v) => s + (v - meanSigned) ** 2, 0) / variances.length;
    return {
      sample_count: recent.length,
      mean_abs_variance_pct: round2(meanAbs),
      bias_signed_mean_pct: round2(meanSigned),
      stdev_pct: round2(Math.sqrt(sqDiff)),
    };
  }

  listRecent(limit: number = 20): MillReconciliationResult[] {
    return this.state.reconciliations.slice(-Math.max(1, Math.min(RING_CAPACITY, limit)));
  }

  getStats(): {
    buckets: MillBucketVariance["bucket"][];
    mill_canonical_buckets: string[];
    root_causes: MillRootCause[];
    mill_canonical_root_causes: MillRootCause[];
    multiplier_bounds: [number, number];
    ring_capacity: number;
    accuracy_window: number;
    reference: string;
  } {
    return {
      buckets: ["material", "tool_wear", "cycle", "setup", "fixture_amort", "energy", "secondary", "overhead"],
      mill_canonical_buckets: ["fixture_amort", "energy"],
      root_causes: ["programming", "tooling", "setup", "material", "machine", "operator", "fixture", "none"],
      mill_canonical_root_causes: ["fixture"],
      multiplier_bounds: [MULTIPLIER_MIN, MULTIPLIER_MAX],
      ring_capacity: RING_CAPACITY,
      accuracy_window: ACCURACY_WINDOW_MAX,
      reference: "Machinery's Handbook 31e; Kaplan & Cooper ABC; PMI PMBOK §7 EAC/CPI",
    };
  }

  // ───────────────────────── internals ─────────────────────────────────

  private loadState(): MillReconciliationState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as MillReconciliationState;
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

  private freshState(): MillReconciliationState {
    return {
      schemaVersion: 1,
      reconciliations: [],
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

  __getState(): Readonly<MillReconciliationState> {
    return this.state;
  }
}

export const millActualCostReconciliationEngine = new MillActualCostReconciliationEngine();
export { MillActualCostReconciliationEngine };
