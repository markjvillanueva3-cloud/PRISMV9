/**
 * Tool Wear Prediction Model (ISO 3685 Three-Zone)
 *
 * Predicts flank wear VB progression through three zones:
 *   Zone I (break-in):   VB = VB0 + k_breakin x sqrt(t)
 *   Zone II (steady):    VB = VB_bi + k_steady x (t - t_bi)
 *   Zone III (accelerated): VB = VB_st + k_accel x (exp(alpha x (t - t_acc)) - 1)
 *
 * Taylor tool life determines zone boundaries:
 *   T = (C / V)^(1/n)
 *
 * SAFETY-CRITICAL: Tool wear directly affects dimensional accuracy,
 * surface integrity, and risk of catastrophic tool failure.
 *
 * References:
 * - ISO 3685:1993 Tool life testing with single-point turning tools
 * - Taylor, F.W. (1907). "On the Art of Cutting Metals"
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.3
 *
 * @module algorithms/ToolWearPrediction
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

/** T W P Input configuration/data structure.
 */
export interface TWPInput {
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Current cutting time [min]. */
  cutting_time: number;
  /** Taylor C constant [m/min]. */
  taylor_C: number;
  /** Taylor n exponent (typically 0.1-0.5). */
  taylor_n: number;
  /** Feed per tooth [mm/tooth]. Default 0.15. */
  feed_per_tooth?: number;
  /** Depth of cut [mm]. Default 2.0. */
  depth_of_cut?: number;
  /** VB threshold for end-of-life [mm]. Default 0.3 (ISO 3685). */
  threshold_mm?: number;
  /** Measured current VB [mm] (for calibration). */
  measured_vb?: number;
}

/** T W P Output configuration/data structure.
 */
export interface TWPOutput extends WithWarnings {
  /** Predicted flank wear VB [mm]. */
  flank_wear_vb: number;
  /** Current wear zone. */
  wear_zone: "break-in" | "steady" | "accelerated";
  /** Total tool life from Taylor equation [min]. */
  total_tool_life: number;
  /** Remaining tool life [min]. */
  remaining_life: number;
  /** Wear rate [mm/min] at current state. */
  wear_rate: number;
  /** Wear as percentage of threshold (0-100+). */
  wear_percentage: number;
  /** Zone boundary times [min]. */
  zone_boundaries: { break_in_end: number; accel_start: number };
  /** Zone wear constants. */
  zone_constants: { k_breakin: number; k_steady: number; k_accel: number; alpha: number };
  /** Recommendation based on wear state. */
  recommendation: string;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

const LIMITS = {
  MAX_SPEED: 2000,
  MIN_SPEED: 1,
  MAX_TIME: 10000,
  MIN_TAYLOR_N: 0.05,
  MAX_TAYLOR_N: 0.8,
  MIN_TAYLOR_C: 10,
  MAX_TAYLOR_C: 5000,
  VB0: 0.02,            // Initial wear [mm]
  BREAK_IN_FRAC: 0.05,  // Zone I ends at 5% of tool life
  ACCEL_FRAC: 0.80,     // Zone III starts at 80% of tool life
};

// ── Algorithm Implementation ────────────────────────────────────────

/** Tool Wear Prediction engine/manager.
 */
export class ToolWearPrediction implements Algorithm<TWPInput, TWPOutput> {

  /** Validate.
   * @param input - input data
   * @returns validation result
   */
  validate(input: TWPInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    /** If.
     * @param !input.cutting_speed - !input.cutting_speed
     * @returns void
     */
    if (!input.cutting_speed || input.cutting_speed < LIMITS.MIN_SPEED || input.cutting_speed > LIMITS.MAX_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be ${LIMITS.MIN_SPEED}-${LIMITS.MAX_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    /** If.
     * @param input.cutting_time - input.cutting_time
     * @returns void
     */
    if (input.cutting_time === undefined || input.cutting_time < 0 || input.cutting_time > LIMITS.MAX_TIME) {
      issues.push({ field: "cutting_time", message: `Cutting time must be 0-${LIMITS.MAX_TIME} min, got ${input.cutting_time}`, severity: "error" });
    }
    /** If.
     * @param !input.taylor_C - !input.taylor_ c
     * @returns void
     */
    if (!input.taylor_C || input.taylor_C < LIMITS.MIN_TAYLOR_C || input.taylor_C > LIMITS.MAX_TAYLOR_C) {
      issues.push({ field: "taylor_C", message: `Taylor C must be ${LIMITS.MIN_TAYLOR_C}-${LIMITS.MAX_TAYLOR_C}, got ${input.taylor_C}`, severity: "error" });
    }
    /** If.
     * @param !input.taylor_n - !input.taylor_n
     * @returns void
     */
    if (!input.taylor_n || input.taylor_n < LIMITS.MIN_TAYLOR_N || input.taylor_n > LIMITS.MAX_TAYLOR_N) {
      issues.push({ field: "taylor_n", message: `Taylor n must be ${LIMITS.MIN_TAYLOR_N}-${LIMITS.MAX_TAYLOR_N}, got ${input.taylor_n}`, severity: "error" });
    }
    if (input.threshold_mm !== undefined && (input.threshold_mm <= 0 || input.threshold_mm > 2)) {
      issues.push({ field: "threshold_mm", message: `VB threshold must be 0-2 mm, got ${input.threshold_mm}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  /** Calculate.
   * @param input - input data
   * @returns t w p output
   */
  calculate(input: TWPInput): TWPOutput {
    const warnings: string[] = [];
    const {
      cutting_speed, cutting_time, taylor_C, taylor_n,
      feed_per_tooth = 0.15, depth_of_cut = 2.0,
      threshold_mm = 0.3, measured_vb,
    } = input;

    // Taylor tool life: T = (C / V)^(1/n)
    const total_tool_life = Math.max(
      Math.pow(taylor_C / cutting_speed, 1 / taylor_n),
      0.1
    );

    // Zone boundaries
    const break_in_end = total_tool_life * LIMITS.BREAK_IN_FRAC;
    const accel_start = total_tool_life * LIMITS.ACCEL_FRAC;

    // Feed and depth correction factors
    const feedFactor = feed_per_tooth / 0.15;
    const depthFactor = Math.pow(depth_of_cut / 2.0, 0.3);

    // Zone I constants
    const VB0 = LIMITS.VB0;
    const VB_break_in_target = threshold_mm * 0.15; // ~15% of threshold at break-in end
    const k_breakin = break_in_end > 0
      ? ((VB_break_in_target - VB0) * feedFactor * depthFactor) / Math.sqrt(break_in_end)
      : 0;

    // Zone I end value
    const VB_at_breakin = VB0 + k_breakin * Math.sqrt(break_in_end);

    // Zone II: steady wear to 60% of threshold at accel_start
    const VB_at_accel_target = threshold_mm * 0.60;
    const k_steady = (accel_start > break_in_end)
      ? (VB_at_accel_target - VB_at_breakin) / (accel_start - break_in_end)
      : 0;

    const VB_at_accel = VB_at_breakin + k_steady * (accel_start - break_in_end);

    // Zone III: accelerated wear from accel_start to tool_life
    const remaining_wear = threshold_mm - VB_at_accel;
    const remaining_time = total_tool_life - accel_start;
    const k_accel = 0.02;
    const alpha = remaining_time > 0
      ? Math.log(Math.max(remaining_wear / k_accel + 1, 1.01)) / remaining_time
      : 0.1;

    // Calculate current wear
    const t = Math.min(cutting_time, total_tool_life * 1.5);
    let flank_wear_vb: number;
    let wear_zone: TWPOutput["wear_zone"];
    let wear_rate: number;

    /** If.
     * @param t - t
     * @returns void
     */
    if (t <= break_in_end) {
      flank_wear_vb = VB0 + k_breakin * Math.sqrt(t);
      wear_zone = "break-in";
      wear_rate = t > 0 ? k_breakin / (2 * Math.sqrt(t)) : k_breakin;
    } else if (t <= accel_start) {
      flank_wear_vb = VB_at_breakin + k_steady * (t - break_in_end);
      wear_zone = "steady";
      wear_rate = k_steady;
    } else {
      const dt = t - accel_start;
      flank_wear_vb = VB_at_accel + k_accel * (Math.exp(alpha * dt) - 1);
      wear_zone = "accelerated";
      wear_rate = k_accel * alpha * Math.exp(alpha * dt);
    }

    // Calibration: if measured VB provided, adjust prediction
    /** If.
     * @param measured_vb - measured_vb
     * @returns void
     */
    if (measured_vb !== undefined && measured_vb > 0) {
      const ratio = measured_vb / flank_wear_vb;
      /** If.
       * @param ratio - ratio
       * @returns void
       */
      if (ratio > 1.3) {
        warnings.push(`WEAR_FASTER: Measured VB (${measured_vb.toFixed(3)}) is ${((ratio - 1) * 100).toFixed(0)}% above predicted. Accelerated wear.`);
      } else if (ratio < 0.7) {
        warnings.push(`WEAR_SLOWER: Measured VB (${measured_vb.toFixed(3)}) is ${((1 - ratio) * 100).toFixed(0)}% below predicted.`);
      }
    }

    const wear_percentage = (flank_wear_vb / threshold_mm) * 100;
    const remaining_life = Math.max(total_tool_life - cutting_time, 0);

    // Recommendation
    let recommendation: string;
    /** If.
     * @param wear_percentage - wear_percentage
     * @returns void
     */
    if (wear_percentage > 100) {
      recommendation = "REPLACE: Tool has exceeded wear threshold. Replace immediately.";
      warnings.push("THRESHOLD_EXCEEDED: VB exceeds ISO 3685 end-of-life criterion.");
    } else if (wear_percentage > 80) {
      recommendation = "REPLACE_SOON: Tool approaching end-of-life. Plan replacement.";
      warnings.push(`NEARING_EOL: Wear at ${wear_percentage.toFixed(0)}% of threshold.`);
    } else if (wear_zone === "accelerated") {
      recommendation = "MONITOR: Tool in accelerated wear zone. Monitor closely.";
    } else {
      recommendation = "OK: Tool wear within normal limits.";
    }

    /** If.
     * @param total_tool_life - total_tool_life
     * @returns void
     */
    if (total_tool_life < 5) {
      warnings.push(`SHORT_LIFE: Tool life ${total_tool_life.toFixed(1)} min. Consider reducing speed.`);
    }

    return {
      flank_wear_vb,
      wear_zone,
      total_tool_life,
      remaining_life,
      wear_rate,
      wear_percentage,
      zone_boundaries: { break_in_end, accel_start },
      zone_constants: { k_breakin, k_steady, k_accel, alpha },
      recommendation,
      warnings,
      calculation_method: "ISO 3685 three-zone model (break-in/steady/accelerated) + Taylor tool life",
    };
  }

  /** Gets metadata.
   * @returns algorithm meta
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "tool-wear-prediction",
      name: "Tool Wear Prediction (ISO 3685 Three-Zone)",
      description: "Predicts flank wear VB progression through break-in, steady, and accelerated wear zones",
      formula: "Zone I: VB = VB0 + k*sqrt(t); Zone II: VB = VB_bi + k*t; Zone III: VB = VB_st + k*(exp(a*t)-1)",
      reference: "ISO 3685:1993; Taylor (1907); Altintas (2012) Ch.3",
      safety_class: "critical",
      domain: "tool_life",
      inputs: {
        cutting_speed: "Cutting speed [m/min]",
        cutting_time: "Current cutting time [min]",
        taylor_C: "Taylor C constant [m/min]",
        taylor_n: "Taylor n exponent [-]",
      },
      outputs: {
        flank_wear_vb: "Flank wear VB [mm]",
        wear_zone: "Current wear zone",
        remaining_life: "Remaining tool life [min]",
        wear_rate: "Wear rate [mm/min]",
      },
    };
  }

  // ==========================================================================
  // FLANK WEAR VB COMPAT SHIM (SF-PSN-WIRE-MS0 U-SFPSN-02C-A, 2026-05-23 juliett)
  // ==========================================================================
  //
  // Verbatim formula relocation of UltimateSpeedFeedEngine.predictFlankWear()
  // (line 1089) into a module-native static method. Closes the SF-PSN
  // composition gap (audit F1): predictFlankWear was an inline engine
  // function; now it's an addressable algorithm module surface.
  //
  // Formula: VB(t) = a × hardness_factor × coolant_factor × (Vc/100)^b × (feed/0.1)^c × √t
  //   where (a, b, c) per WEAR_COEFFICIENTS_COMPAT (relocated verbatim).
  // Source: MIT 2.008, empirical tool wear coefficients (Taylor 1907, Loewen-Shaw scaling).
  //
  // Pattern-equivalent to GilbertMRRModel.calculateOptimalSpeed (U-05),
  // JaegerTempField.cuttingTemperatureCompat (U-03),
  // StabilityLobeDiagram.stabilityEstimateCompat (U-04),
  // KienzleForceModel shim (U-02A).
  //
  // Bit-equivalence verified by src/__tests__/FlankWearVBShimEquivalence.test.ts.

  static readonly WEAR_COEFFICIENTS_COMPAT: Record<string, { a: number; b: number; c: number }> = {
    hss:     { a: 0.001,   b: 1.5, c: 0.3 },
    carbide: { a: 0.0003,  b: 1.2, c: 0.2 },
    cermet:  { a: 0.00025, b: 1.1, c: 0.18 },
    ceramic: { a: 0.0001,  b: 0.9, c: 0.15 },
    cbn:     { a: 0.00005, b: 0.7, c: 0.1 },
    pcd:     { a: 0.00003, b: 0.6, c: 0.08 },
  };

  /**
   * Static-shim predictFlankWearVB (compat with UltimateSpeedFeedEngine inline).
   *
   * @param Vc_mpm Cutting speed [m/min]
   * @param feed_mm Feed per revolution [mm]
   * @param hardness_hb Material Brinell hardness [HB]
   * @param toolMat Tool material key (carbide/hss/cermet/ceramic/cbn/pcd; unknowns fall back to carbide)
   * @param hasCoolant True applies 0.7 coolant factor; false applies 1.0
   * @returns VB_15min (mm), time_to_03mm (min, clamped 600), time_to_06mm (min, clamped 600)
   */
  static predictFlankWearVBCompat(
    Vc_mpm: number,
    feed_mm: number,
    hardness_hb: number,
    toolMat: string,
    hasCoolant: boolean,
  ): { VB_15min: number; time_to_03mm: number; time_to_06mm: number } {
    const { a, b, c } = ToolWearPrediction.WEAR_COEFFICIENTS_COMPAT[toolMat]
      || ToolWearPrediction.WEAR_COEFFICIENTS_COMPAT.carbide;
    const hFactor = hardness_hb / 200;
    const coolFactor = hasCoolant ? 0.7 : 1.0;
    const baseRate = a * coolFactor * hFactor
      * Math.pow(Vc_mpm / 100, b) * Math.pow(Math.max(0.01, feed_mm) / 0.1, c);
    // VB(t) = baseRate × √t
    const VB_15 = baseRate * Math.sqrt(15);
    const time03 = Math.pow(0.3 / baseRate, 2);
    const time06 = Math.pow(0.6 / baseRate, 2);
    return { VB_15min: VB_15, time_to_03mm: Math.min(600, time03), time_to_06mm: Math.min(600, time06) };
  }
}
