/**
 * Extended Taylor Tool Life Model
 *
 * Implements the extended Taylor equation:
 *   V × T^n × f^a × d^b = C
 *   → T = (C / (V × f^a × d^b))^(1/n)
 *
 * Extensions beyond basic VT^n = C:
 * - Feed exponent (a): accounts for feed rate effect on tool wear
 * - Depth exponent (b): accounts for depth of cut effect
 * - Temperature correction: optional thermal derating factor
 * - Optimal speed calculation: V_opt for target tool life
 *
 * SAFETY-CRITICAL: Tool life predictions directly affect tool change
 * intervals, cost estimates, and risk of catastrophic tool failure.
 *
 * References:
 * - Taylor, F.W. (1907). "On the Art of Cutting Metals"
 * - MIT 3.22 — Mechanical Behavior of Materials
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.3
 *
 * @module algorithms/ExtendedTaylorModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

/** Taylor Input configuration/data structure.
 */
export interface TaylorInput {
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Taylor constant C — cutting speed at T=1 min [m/min]. */
  C: number;
  /** Taylor exponent n (typically 0.1-0.5). */
  n: number;
  /** Feed rate [mm/rev or mm/tooth] (optional, for extended model). */
  feed?: number;
  /** Depth of cut [mm] (optional, for extended model). */
  depth?: number;
  /** Feed exponent a (default 0.35). */
  feed_exponent?: number;
  /** Depth exponent b (default 0.20). */
  depth_exponent?: number;
  /** Reference feed for correction [mm] (default 0.2). */
  ref_feed?: number;
  /** Reference depth for correction [mm] (default 2.0). */
  ref_depth?: number;
  /** Temperature correction factor (0-1, default 1.0 = no correction). */
  temperature_factor?: number;
}

/** Taylor Output configuration/data structure.
 */
export interface TaylorOutput extends WithWarnings {
  /** Predicted tool life [min]. */
  tool_life_minutes: number;
  /** Optimal speed for 85% of current speed [m/min]. */
  optimal_speed: number;
  /** Speed for a target 60-min tool life [m/min] (if calculable). */
  speed_for_60min?: number;
  /** Cost-per-part if tool cost and cycle time provided. */
  cost_per_part?: number;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MAX_TOOL_LIFE: 10000,     // min
  MIN_TOOL_LIFE: 0.1,       // min
  MAX_CUTTING_SPEED: 2000,  // m/min
  MIN_CUTTING_SPEED: 1,
  MIN_C: 10,                // Taylor C must be reasonable
  MAX_C: 5000,
  MIN_N: 0.05,
  MAX_N: 0.8,
};

// ── Algorithm Implementation ────────────────────────────────────────

/** Extended Taylor Model engine/manager.
 */
export class ExtendedTaylorModel implements Algorithm<TaylorInput, TaylorOutput> {

  /** Validate.
   * @param input - input data
   * @returns validation result
   */
  validate(input: TaylorInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    /** If.
     * @param !input.cutting_speed - !input.cutting_speed
     * @returns void
     */
    if (!input.cutting_speed || input.cutting_speed < LIMITS.MIN_CUTTING_SPEED || input.cutting_speed > LIMITS.MAX_CUTTING_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be ${LIMITS.MIN_CUTTING_SPEED}-${LIMITS.MAX_CUTTING_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    /** If.
     * @param !input.C - !input. c
     * @returns void
     */
    if (!input.C || input.C < LIMITS.MIN_C || input.C > LIMITS.MAX_C) {
      issues.push({ field: "C", message: `Taylor C must be ${LIMITS.MIN_C}-${LIMITS.MAX_C}, got ${input.C}`, severity: "error" });
    }
    /** If.
     * @param !input.n - !input.n
     * @returns void
     */
    if (!input.n || input.n < LIMITS.MIN_N || input.n > LIMITS.MAX_N) {
      issues.push({ field: "n", message: `Taylor n must be ${LIMITS.MIN_N}-${LIMITS.MAX_N}, got ${input.n}`, severity: "error" });
    }
    /** If.
     * @param input.feed - input.feed
     * @returns void
     */
    if (input.feed !== undefined && input.feed <= 0) {
      issues.push({ field: "feed", message: `Feed must be > 0, got ${input.feed}`, severity: "error" });
    }
    /** If.
     * @param input.depth - input.depth
     * @returns void
     */
    if (input.depth !== undefined && input.depth <= 0) {
      issues.push({ field: "depth", message: `Depth must be > 0, got ${input.depth}`, severity: "error" });
    }
    if (input.temperature_factor !== undefined && (input.temperature_factor < 0 || input.temperature_factor > 1)) {
      issues.push({ field: "temperature_factor", message: `Temperature factor must be 0-1, got ${input.temperature_factor}`, severity: "error" });
    }
    /** If.
     * @param input.cutting_speed - input.cutting_speed
     * @returns void
     */
    if (input.cutting_speed && input.C && input.cutting_speed > input.C * 1.2) {
      issues.push({ field: "cutting_speed", message: `Speed ${input.cutting_speed} exceeds Taylor C=${input.C} by >20% — tool life will be very short`, severity: "warning" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  /** Calculate.
   * @param input - input data
   * @returns taylor output
   */
  calculate(input: TaylorInput): TaylorOutput {
    const warnings: string[] = [];
    const {
      C, n,
      feed, depth,
      feed_exponent = 0.35,
      depth_exponent = 0.20,
      ref_feed = 0.2,
      ref_depth = 2.0,
      temperature_factor = 1.0,
    } = input;

    let cutting_speed = input.cutting_speed;

    // Clamp speed
    /** If.
     * @param cutting_speed - cutting_speed
     * @returns void
     */
    if (cutting_speed < LIMITS.MIN_CUTTING_SPEED) {
      warnings.push(`Speed ${cutting_speed} below min, using ${LIMITS.MIN_CUTTING_SPEED}`);
      cutting_speed = LIMITS.MIN_CUTTING_SPEED;
    }
    /** If.
     * @param cutting_speed - cutting_speed
     * @returns void
     */
    if (cutting_speed > LIMITS.MAX_CUTTING_SPEED) {
      warnings.push(`Speed ${cutting_speed} above max, using ${LIMITS.MAX_CUTTING_SPEED}`);
      cutting_speed = LIMITS.MAX_CUTTING_SPEED;
    }

    // Basic Taylor: T = (C / V)^(1/n)
    let tool_life = Math.pow(C / cutting_speed, 1 / n);

    // Extended corrections: T_ext = T_basic × (ref_feed/feed)^a × (ref_depth/depth)^b
    // This is equivalent to: V × T^n × f^a × d^b = C_ext
    /** If.
     * @param feed - feed
     * @returns void
     */
    if (feed !== undefined && feed > 0) {
      tool_life *= Math.pow(ref_feed / feed, feed_exponent);
    }
    /** If.
     * @param depth - recursion or nesting depth
     * @returns void
     */
    if (depth !== undefined && depth > 0) {
      tool_life *= Math.pow(ref_depth / depth, depth_exponent);
    }

    // Temperature correction
    /** If.
     * @param temperature_factor - temperature_factor
     * @returns void
     */
    if (temperature_factor < 1.0) {
      tool_life *= temperature_factor;
      /** If.
       * @param temperature_factor - temperature_factor
       * @returns void
       */
      if (temperature_factor < 0.5) {
        warnings.push(`Severe thermal derating: ${(temperature_factor * 100).toFixed(0)}% of nominal tool life`);
      }
    }

    // Clamp tool life
    /** If.
     * @param tool_life - tool_life
     * @returns void
     */
    if (tool_life > LIMITS.MAX_TOOL_LIFE) {
      warnings.push(`Tool life ${tool_life.toFixed(0)} min exceeds limit, capped`);
      tool_life = LIMITS.MAX_TOOL_LIFE;
    }
    /** If.
     * @param tool_life - tool_life
     * @returns void
     */
    if (tool_life < LIMITS.MIN_TOOL_LIFE) {
      warnings.push(`Tool life ${tool_life.toFixed(2)} min is very low`);
      tool_life = LIMITS.MIN_TOOL_LIFE;
    }

    // Taylor cliff warnings
    /** If.
     * @param tool_life - tool_life
     * @returns void
     */
    if (tool_life < 5) {
      warnings.push(`TAYLOR_CLIFF: Tool life ${tool_life.toFixed(1)} min is dangerously short. Small speed increase causes rapid failure.`);
    }
    /** If.
     * @param cutting_speed - cutting_speed
     * @returns void
     */
    if (cutting_speed > C * 0.9) {
      warnings.push(`TAYLOR_CLIFF: Speed ${cutting_speed} m/min within 10% of C=${C}. On exponential curve.`);
    }

    // Optimal speed: conservative 85% of current
    const optimal_speed = Math.round(cutting_speed * 0.85);

    // Speed for 60-min tool life (inverse Taylor)
    let speed_for_60min: number | undefined;
    /** If.
     * @param C - c
     * @returns void
     */
    if (C > 0 && n > 0) {
      let target_speed = C / Math.pow(60, n);
      // Apply feed/depth corrections in reverse
      /** If.
       * @param feed - feed
       * @returns void
       */
      if (feed !== undefined && feed > 0) {
        target_speed *= Math.pow(ref_feed / feed, feed_exponent * n);
      }
      /** If.
       * @param depth - recursion or nesting depth
       * @returns void
       */
      if (depth !== undefined && depth > 0) {
        target_speed *= Math.pow(ref_depth / depth, depth_exponent * n);
      }
      speed_for_60min = Math.round(target_speed);
    }

    return {
      tool_life_minutes: Math.round(tool_life * 10) / 10,
      optimal_speed,
      speed_for_60min,
      warnings,
      calculation_method: "Extended Taylor (V×T^n×f^a×d^b = C)",
    };
  }

  /** Gets metadata.
   * @returns algorithm meta
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "taylor",
      name: "Extended Taylor Tool Life Model",
      description: "Predicts tool life from cutting speed with feed and depth corrections",
      formula: "T = (C / (V × f^a × d^b))^(1/n)",
      reference: "Taylor (1907); MIT 3.22; Altintas (2012) Ch.3",
      safety_class: "critical",
      domain: "tool_life",
      inputs: {
        cutting_speed: "Cutting speed V [m/min]",
        C: "Taylor constant [m/min]",
        n: "Taylor exponent [-]",
        feed: "Feed rate [mm/rev]",
        depth: "Depth of cut [mm]",
      },
      outputs: {
        tool_life_minutes: "Tool life [min]",
        optimal_speed: "Conservative optimal speed [m/min]",
        speed_for_60min: "Speed for 60-min tool life [m/min]",
      },
    };
  }
}
