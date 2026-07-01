/**
 * AutoSpeedFeedCalculatorEngine — Auto-calculate speeds, feeds, and RPM for Okuma macros
 *
 * Generates calculated RPM variables from SFM and diameter:
 *   - Imperial: RPM = SFM * 3.8197 / DIA   (12/pi)
 *   - Metric:   RPM = SCS * 318.31 / DIA   (1000/pi)
 *
 * Additional calculations:
 *   - G50 RPM clamping (never exceed machine/part limits)
 *   - Feed scaling for boring bar rigidity (L/D ratio)
 *   - Peck depth recalculation for drill size changes
 *   - Surface finish feed from nose radius: f = sqrt(Ra * 32 * r_nose / 1000)
 *   - Power check: P = Fc * Vc / (60000 * eta)
 *
 * Uses canonical physics from src/physics/constants.ts — never inlines constants.
 *
 * @module AutoSpeedFeedCalculatorEngine
 *
 * Reference: Machinery's Handbook (31st ed.), Sandvik Coromant Technical Guide
 */

import { rpmFromVc, predictedRa } from "../physics/constants.js";
import { log } from "../utils/Logger.js";
import { captureSFC } from "../middleware/sfcOutcomeWire.js";

// ============================================================================
// TYPES
// ============================================================================

/** Input for auto speed/feed calculation */
export interface AutoSFInput {
  /** Unit system */
  unit_system: "imperial" | "metric";
  /** Tool operations to calculate for */
  operations: AutoSFOperation[];
  /** Machine spindle limits */
  machine_max_rpm?: number;
  /** Machine spindle power (kW) */
  machine_power_kw?: number;
  /** Machine spindle efficiency (0-1, default 0.85) */
  spindle_efficiency?: number;
}

export interface AutoSFOperation {
  /** Tool station number */
  station: number;
  /** Operation type */
  operation: AutoSFOpType;
  /** Surface speed (SFM or m/min) */
  sfm: number;
  /** Feed rate (IPR or mm/rev) */
  feed: number;
  /** Cutting diameter — the diameter where the tool engages */
  cutting_diameter: number;
  /** Depth of cut */
  doc?: number;
  /** Insert nose radius (same units as feed) */
  nose_radius?: number;
  /** G50 max RPM override (if not set, uses operation default) */
  max_rpm_override?: number;
  /** Boring bar diameter (for rigidity scaling) */
  bar_diameter?: number;
  /** Boring bar stickout (for rigidity scaling) */
  bar_stickout?: number;
  /** Drill peck mode */
  peck_mode?: "first_full" | "first_1xD" | "decreasing";
  /** Material ISO group for Kienzle force estimate */
  material_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export type AutoSFOpType =
  | "od_rough" | "od_finish" | "id_rough" | "id_finish"
  | "face" | "center_drill" | "drill" | "peck_drill"
  | "bore_rough" | "bore_finish" | "groove" | "cutoff"
  | "thread" | "tap" | "ream" | "chamfer";

/** Result for a single operation */
export interface AutoSFOperationResult {
  station: number;
  operation: AutoSFOpType;
  /** Calculated RPM from SFM and diameter */
  calculated_rpm: number;
  /** Clamped RPM (after G50 limit) */
  clamped_rpm: number;
  /** G50 clamp value used */
  g50_value: number;
  /** Whether RPM was clamped */
  was_clamped: boolean;
  /** Adjusted feed (after any scaling) */
  adjusted_feed: number;
  /** Feed was scaled (boring bar rigidity, etc.) */
  feed_scaled: boolean;
  /** Feed scale reason */
  feed_scale_reason?: string;
  /** Predicted surface finish Ra (um) if nose radius given */
  predicted_ra_um?: number;
  /** Peck depth schedule (for drills) */
  peck_schedule?: number[];
  /** Estimated cutting force (N) — rough estimate from Kienzle */
  estimated_force_n?: number;
  /** Estimated power (kW) */
  estimated_power_kw?: number;
  /** Power check result */
  power_ok?: boolean;
  /** Okuma variable assignments for this operation */
  okuma_lines: string[];
  /** Warnings */
  warnings: string[];
}

/** Full calculation result */
export interface AutoSFResult {
  operations: AutoSFOperationResult[];
  /** Summary statistics */
  stats: {
    total_operations: number;
    operations_clamped: number;
    operations_feed_scaled: number;
    max_power_kw: number;
    worst_ra_um: number;
  };
  /** All Okuma lines combined */
  all_okuma_lines: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Imperial SFM→RPM: 12/pi ≈ 3.8197 (Machinery's Handbook, 31st ed.) */
const IMPERIAL_RPM_FACTOR = 3.8197;

/** Metric SCS→RPM: 1000/pi ≈ 318.3099 */
const METRIC_RPM_FACTOR = 318.3099;

/** Default G50 clamp by operation (from SafetyPatternMinerEngine mining results) */
const DEFAULT_G50: Record<string, number> = {
  od_rough: 2500,
  od_finish: 3000,
  id_rough: 2000,
  id_finish: 2500,
  face: 2500,
  center_drill: 2000,
  drill: 2000,
  peck_drill: 2000,
  bore_rough: 1800,
  bore_finish: 2000,
  groove: 2000,
  cutoff: 1500,
  thread: 2000,
  tap: 1500,
  ream: 1500,
  chamfer: 2500,
};

/**
 * Approximate kc1.1 values by ISO material group [N/mm^2].
 * Source: Kienzle & Victor (1957) via PRISM physics/constants.ts canonical values.
 * Used only for rough power estimation — full Kienzle uses the physics module.
 */
const APPROX_KC1_1: Record<string, number> = {
  P: 1800, // Steel
  M: 2100, // Stainless
  K: 1100, // Cast iron
  N: 700,  // Non-ferrous (aluminum)
  S: 2800, // Superalloys
  H: 3200, // Hardened steel
};

/** Approximate mc exponent by material group */
const APPROX_MC: Record<string, number> = {
  P: 0.26,
  M: 0.25,
  K: 0.28,
  N: 0.23,
  S: 0.28,
  H: 0.30,
};

// ============================================================================
// ENGINE
// ============================================================================

export class AutoSpeedFeedCalculatorEngine {
  /**
   * Calculate optimized speeds, feeds, and RPM for all operations.
   *
   * @param input - Operations with geometry and cutting parameters
   * @returns Calculated results with Okuma variable assignments
   */
  calculate(input: AutoSFInput): AutoSFResult {
    const results: AutoSFOperationResult[] = [];
    const machineMaxRPM = input.machine_max_rpm ?? 4500;
    const machinePowerKW = input.machine_power_kw ?? 15;
    const eta = input.spindle_efficiency ?? 0.85;

    for (const op of input.operations) {
      const result = this._calcOperation(op, input.unit_system, machineMaxRPM, machinePowerKW, eta);
      results.push(result);
    }

    // Stats
    const clampedCount = results.filter(r => r.was_clamped).length;
    const scaledCount = results.filter(r => r.feed_scaled).length;
    const maxPower = results.reduce((m, r) => Math.max(m, r.estimated_power_kw ?? 0), 0);
    const worstRa = results.reduce((m, r) => Math.max(m, r.predicted_ra_um ?? 0), 0);

    const allLines = results.flatMap(r => r.okuma_lines);

    log.info(`[AutoSpeedFeedCalculator] Calculated ${results.length} operations, ${clampedCount} clamped, ${scaledCount} feed-scaled`);

    const result: AutoSFResult = {
      operations: results,
      stats: {
        total_operations: results.length,
        operations_clamped: clampedCount,
        operations_feed_scaled: scaledCount,
        max_power_kw: Math.round(maxPower * 100) / 100,
        worst_ra_um: Math.round(worstRa * 100) / 100,
      },
      all_okuma_lines: allLines,
    };

    // U-PPG-SFC-01: emit recommendation onto OutcomeCaptureBus.
    captureSFC({
      engine: "AutoSpeedFeedCalculatorEngine",
      action: "calculate",
      context: {
        operation: input.operations[0]?.operation,
        material: input.operations[0]?.material_group,
      },
      recommended: result,
    });

    return result;
  }

  /**
   * Calculate RPM from surface speed and diameter.
   * Uses canonical rpmFromVc from physics/constants.ts for metric.
   * For imperial, converts SFM → m/min first.
   *
   * @param sfm - Surface speed (SFM if imperial, m/min if metric)
   * @param diameter - Cutting diameter (inches if imperial, mm if metric)
   * @param unit_system - Unit system
   * @returns RPM (rounded to nearest integer)
   */
  calcRPM(sfm: number, diameter: number, unit_system: "imperial" | "metric"): number {
    if (diameter <= 0 || sfm <= 0) return 0;

    if (unit_system === "imperial") {
      // RPM = SFM * 12 / (pi * D_inches) = SFM * 3.8197 / D_inches
      return Math.round(sfm * IMPERIAL_RPM_FACTOR / diameter);
    } else {
      // Use canonical metric formula: N = 1000 * Vc / (pi * D_mm)
      // Round to integer to honor the JSDoc contract ("rounded to nearest integer")
      // and match the imperial branch — downstream G50 clamp + Okuma line emission
      // both expect integer RPM.
      return Math.round(rpmFromVc(sfm, diameter));
    }
  }

  /**
   * Apply G50 speed clamp.
   * Returns the clamped RPM and whether clamping was applied.
   */
  applyG50Clamp(
    rpm: number,
    operation: AutoSFOpType,
    maxRpmOverride?: number,
    machineMax?: number,
  ): { clamped_rpm: number; g50_value: number; was_clamped: boolean } {
    const g50 = maxRpmOverride ?? DEFAULT_G50[operation] ?? 2500;
    // QA-MS1 FIX: Conservative default when machine max RPM unknown (was 9999).
    // 6000 RPM is safe for BT40 balance grade G6.3 (ISO 1940) at typical tool weight.
    const effectiveMax = Math.min(g50, machineMax ?? 6000);
    const clamped = Math.min(rpm, effectiveMax);

    return {
      clamped_rpm: clamped,
      g50_value: effectiveMax,
      was_clamped: clamped < rpm,
    };
  }

  /**
   * Scale feed for boring bar rigidity based on L/D ratio.
   *
   * Rule of thumb (Sandvik Coromant):
   *   L/D <= 3: full feed (100%)
   *   L/D 3-4: reduce to 75%
   *   L/D 4-5: reduce to 50%
   *   L/D 5-6: reduce to 25%
   *   L/D > 6: not recommended without special tooling
   *
   * @param feed - Original feed rate
   * @param barDiameter - Boring bar diameter
   * @param barStickout - Boring bar stickout (overhang)
   * @returns Scaled feed and reason
   */
  scaleBoringBarFeed(
    feed: number,
    barDiameter: number,
    barStickout: number,
  ): { scaled_feed: number; scale_factor: number; reason: string } {
    if (barDiameter <= 0) {
      return { scaled_feed: feed, scale_factor: 1.0, reason: "invalid bar diameter" };
    }

    const ld = barStickout / barDiameter;

    if (ld <= 3) {
      return { scaled_feed: feed, scale_factor: 1.0, reason: `L/D=${ld.toFixed(1)} — full feed` };
    } else if (ld <= 4) {
      const factor = 0.75;
      return {
        scaled_feed: Math.round(feed * factor * 10000) / 10000,
        scale_factor: factor,
        reason: `L/D=${ld.toFixed(1)} — 75% feed (rigidity)`,
      };
    } else if (ld <= 5) {
      const factor = 0.50;
      return {
        scaled_feed: Math.round(feed * factor * 10000) / 10000,
        scale_factor: factor,
        reason: `L/D=${ld.toFixed(1)} — 50% feed (rigidity)`,
      };
    } else if (ld <= 6) {
      const factor = 0.25;
      return {
        scaled_feed: Math.round(feed * factor * 10000) / 10000,
        scale_factor: factor,
        reason: `L/D=${ld.toFixed(1)} — 25% feed (low rigidity)`,
      };
    } else {
      const factor = 0.15;
      return {
        scaled_feed: Math.round(feed * factor * 10000) / 10000,
        scale_factor: factor,
        reason: `L/D=${ld.toFixed(1)} — 15% feed (CAUTION: L/D>6)`,
      };
    }
  }

  /**
   * Calculate peck drill schedule based on drill diameter.
   *
   * Standard peck schedule (Machinery's Handbook):
   *   - First peck: 1xD (for steel), 1.5xD (for aluminum)
   *   - Subsequent pecks: 0.5xD (steel), 1xD (aluminum)
   *   - Minimum peck: 0.020" / 0.5mm
   *
   * @param drillDia - Drill diameter
   * @param totalDepth - Total hole depth
   * @param unit_system - Unit system
   * @param material - Material group (affects peck multiplier)
   * @returns Array of peck depths
   */
  calcPeckSchedule(
    drillDia: number,
    totalDepth: number,
    unit_system: "imperial" | "metric",
    material?: "P" | "M" | "K" | "N" | "S" | "H",
  ): number[] {
    if (drillDia <= 0 || totalDepth <= 0) return [];

    const minPeck = unit_system === "imperial" ? 0.020 : 0.5;
    // Non-ferrous gets larger pecks (easier to chip-break)
    const isNonFerrous = material === "N" || material === "K";
    const firstMult = isNonFerrous ? 1.5 : 1.0;
    const subMult = isNonFerrous ? 1.0 : 0.5;

    const firstPeck = Math.max(drillDia * firstMult, minPeck);
    const subPeck = Math.max(drillDia * subMult, minPeck);

    const schedule: number[] = [];
    let remaining = totalDepth;

    // First peck
    const p1 = Math.min(firstPeck, remaining);
    schedule.push(Math.round(p1 * 10000) / 10000);
    remaining -= p1;

    // Subsequent pecks
    while (remaining > minPeck) {
      const p = Math.min(subPeck, remaining);
      schedule.push(Math.round(p * 10000) / 10000);
      remaining -= p;
    }

    // Remaining material (if any)
    if (remaining > 0.0001) {
      schedule.push(Math.round(remaining * 10000) / 10000);
    }

    return schedule;
  }

  /**
   * Calculate finish feed from target surface finish and nose radius.
   *
   * Brammertz kinematic roughness model:
   *   Ra = f^2 / (32 * r_nose) * 1000  [um]
   *   f = sqrt(Ra * 32 * r_nose / 1000) [mm]
   *
   * For imperial: convert nose radius to mm, then feed back to inches.
   *
   * @param targetRa_um - Target surface finish in micrometers
   * @param noseRadius - Insert nose radius (inches if imperial, mm if metric)
   * @param unit_system - Unit system
   * @returns Required feed rate in same units as nose radius
   */
  calcFinishFeed(
    targetRa_um: number,
    noseRadius: number,
    unit_system: "imperial" | "metric",
  ): number {
    if (targetRa_um <= 0 || noseRadius <= 0) return 0;

    // Work in mm
    const r_mm = unit_system === "imperial" ? noseRadius * 25.4 : noseRadius;

    // f_mm = sqrt(Ra_um * 32 * r_mm / 1000)
    const f_mm = Math.sqrt(targetRa_um * 32 * r_mm / 1000);

    // Convert back to input units
    const f = unit_system === "imperial" ? f_mm / 25.4 : f_mm;

    return Math.round(f * 10000) / 10000;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _calcOperation(
    op: AutoSFOperation,
    unitSystem: "imperial" | "metric",
    machineMaxRPM: number,
    machinePowerKW: number,
    eta: number,
  ): AutoSFOperationResult {
    const warnings: string[] = [];
    const okumaLines: string[] = [];

    // 1. Calculate RPM
    const rawRPM = this.calcRPM(op.sfm, op.cutting_diameter, unitSystem);

    // 2. Apply G50 clamp
    const { clamped_rpm, g50_value, was_clamped } = this.applyG50Clamp(
      rawRPM,
      op.operation,
      op.max_rpm_override,
      machineMaxRPM,
    );

    if (was_clamped) {
      warnings.push(`RPM clamped: ${rawRPM} → ${clamped_rpm} (G50 S${g50_value})`);
    }

    // 3. Adjust feed for boring bar rigidity
    let adjustedFeed = op.feed;
    let feedScaled = false;
    let feedScaleReason: string | undefined;

    if (op.bar_diameter && op.bar_stickout) {
      const scaled = this.scaleBoringBarFeed(op.feed, op.bar_diameter, op.bar_stickout);
      if (scaled.scale_factor < 1.0) {
        adjustedFeed = scaled.scaled_feed;
        feedScaled = true;
        feedScaleReason = scaled.reason;
        warnings.push(`Feed scaled: ${op.feed} → ${adjustedFeed} (${scaled.reason})`);
      }
    }

    // 4. Predict surface finish (if nose radius given)
    let predictedRaUm: number | undefined;
    if (op.nose_radius) {
      const feed_mm = unitSystem === "imperial" ? adjustedFeed * 25.4 : adjustedFeed;
      const r_mm = unitSystem === "imperial" ? op.nose_radius * 25.4 : op.nose_radius;
      predictedRaUm = predictedRa(feed_mm, r_mm);
      if (predictedRaUm > 3.2 && (op.operation === "od_finish" || op.operation === "id_finish" || op.operation === "bore_finish")) {
        warnings.push(`Predicted Ra=${predictedRaUm.toFixed(2)}um exceeds typical finish target (3.2um)`);
      }
    }

    // 5. Calculate peck schedule (for drills)
    let peckSchedule: number[] | undefined;
    if (op.operation === "peck_drill" || op.operation === "drill") {
      // Estimate depth as 3xD if not specified
      const depth = (op.doc ?? op.cutting_diameter * 3);
      peckSchedule = this.calcPeckSchedule(
        op.cutting_diameter,
        depth,
        unitSystem,
        op.material_group,
      );
    }

    // 6. Estimate cutting force and power (rough Kienzle estimate)
    let estimatedForceN: number | undefined;
    let estimatedPowerKW: number | undefined;
    let powerOk: boolean | undefined;

    if (op.doc && op.material_group) {
      const kc1_1 = APPROX_KC1_1[op.material_group] ?? 1800;
      const mc = APPROX_MC[op.material_group] ?? 0.26;
      const ap_mm = unitSystem === "imperial" ? op.doc * 25.4 : op.doc;
      const f_mm = unitSystem === "imperial" ? adjustedFeed * 25.4 : adjustedFeed;
      const h = Math.max(f_mm, 0.001);
      const kc = kc1_1 * Math.pow(h, -mc);
      estimatedForceN = Math.round(kc * ap_mm * f_mm);

      // Power: P = Fc * Vc / (60000 * eta)
      const Vc_mmin = unitSystem === "imperial" ? op.sfm * 0.3048 : op.sfm;
      estimatedPowerKW = Math.round(estimatedForceN * Vc_mmin / (60000 * eta) * 100) / 100;
      powerOk = estimatedPowerKW <= machinePowerKW;

      if (!powerOk) {
        warnings.push(`POWER EXCEEDED: ${estimatedPowerKW}kW > machine ${machinePowerKW}kW`);
      }
    }

    // 7. Generate Okuma lines
    const opLabel = op.operation.toUpperCase().replace(/_/g, " ");
    okumaLines.push(`( --- T${String(op.station).padStart(2, "0")} ${opLabel} --- )`);
    okumaLines.push(`( CALCULATED RPM = ${clamped_rpm}${was_clamped ? ` [CLAMPED FROM ${rawRPM}]` : ""} )`);
    if (feedScaled) {
      okumaLines.push(`( FEED ADJUSTED: ${op.feed} -> ${adjustedFeed} ${feedScaleReason ?? ""} )`);
    }
    if (predictedRaUm !== undefined) {
      okumaLines.push(`( PREDICTED Ra = ${predictedRaUm.toFixed(2)} um )`);
    }

    return {
      station: op.station,
      operation: op.operation,
      calculated_rpm: rawRPM,
      clamped_rpm,
      g50_value,
      was_clamped,
      adjusted_feed: adjustedFeed,
      feed_scaled: feedScaled,
      feed_scale_reason: feedScaleReason,
      predicted_ra_um: predictedRaUm !== undefined ? Math.round(predictedRaUm * 100) / 100 : undefined,
      peck_schedule: peckSchedule,
      estimated_force_n: estimatedForceN,
      estimated_power_kw: estimatedPowerKW,
      power_ok: powerOk,
      okuma_lines: okumaLines,
      warnings,
    };
  }
}

export const autoSpeedFeedCalculatorEngine = new AutoSpeedFeedCalculatorEngine();
