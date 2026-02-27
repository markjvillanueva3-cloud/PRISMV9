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

export class ToolWearPrediction implements Algorithm<TWPInput, TWPOutput> {

  validate(input: TWPInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.cutting_speed || input.cutting_speed < LIMITS.MIN_SPEED || input.cutting_speed > LIMITS.MAX_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be ${LIMITS.MIN_SPEED}-${LIMITS.MAX_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    if (input.cutting_time === undefined || input.cutting_time < 0 || input.cutting_time > LIMITS.MAX_TIME) {
      issues.push({ field: "cutting_time", message: `Cutting time must be 0-${LIMITS.MAX_TIME} min, got ${input.cutting_time}`, severity: "error" });
    }
    if (!input.taylor_C || input.taylor_C < LIMITS.MIN_TAYLOR_C || input.taylor_C > LIMITS.MAX_TAYLOR_C) {
      issues.push({ field: "taylor_C", message: `Taylor C must be ${LIMITS.MIN_TAYLOR_C}-${LIMITS.MAX_TAYLOR_C}, got ${input.taylor_C}`, severity: "error" });
    }
    if (!input.taylor_n || input.taylor_n < LIMITS.MIN_TAYLOR_N || input.taylor_n > LIMITS.MAX_TAYLOR_N) {
      issues.push({ field: "taylor_n", message: `Taylor n must be ${LIMITS.MIN_TAYLOR_N}-${LIMITS.MAX_TAYLOR_N}, got ${input.taylor_n}`, severity: "error" });
    }
    if (input.threshold_mm !== undefined && (input.threshold_mm <= 0 || input.threshold_mm > 2)) {
      issues.push({ field: "threshold_mm", message: `VB threshold must be 0-2 mm, got ${input.threshold_mm}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

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
    if (measured_vb !== undefined && measured_vb > 0) {
      const ratio = measured_vb / flank_wear_vb;
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
}
