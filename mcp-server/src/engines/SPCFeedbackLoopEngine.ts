/**
 * SPCFeedbackLoopEngine — Closed-Loop SPC → Parameter Adjustment (U-MIO31)
 * ==========================================================================
 *
 * Consumes post-production CMM measurements, computes Cpk/Ppk via
 * SPCProcessCapabilityEngine, runs Nelson Rules 1-8 via NelsonSPCRulesEngine,
 * and emits parameter adjustment recommendations when the process drifts
 * below Cpk = 1.33 or triggers statistical out-of-control rules.
 *
 * This is the missing closed loop between quality metrology and the
 * SpeedFeed/Cutting orchestrators. Without it, the AI plan is open-loop
 * and cannot self-correct from measurement feedback.
 *
 * Inputs  → { feature_name, measurements, nominal, tol_upper, tol_lower,
 *             current_params: { speed_m_min, feed_per_tooth_mm, axial_depth_mm } }
 * Outputs → {
 *   cpk, ppk, assessment,
 *   drift: { detected, nelson_violations[], trend: "in"|"dec"|"stable" },
 *   adjustments: { speed_multiplier, feed_multiplier, depth_multiplier, rationale[] },
 *   action: "maintain" | "fine_tune" | "coarse_adjust" | "escalate"
 * }
 *
 * Adjustment heuristics (conservative, additive, bounded):
 *   - Cpk ≥ 1.67: maintain                       (Six Sigma capable)
 *   - 1.33 ≤ Cpk < 1.67: fine-tune (±2% per pass)
 *   - 1.00 ≤ Cpk < 1.33: coarse adjust (-5% feed, -3% depth, hold speed)
 *   - Cpk < 1.00: escalate — parameters alone cannot rescue; flag for review
 *
 *   - Centering shifted_high:  feed -5%, depth -5% (reduce deflection/force)
 *   - Centering shifted_low:   feed +2%, depth +3% (add material contact)
 *   - Nelson Rule 2/3/4 (trend): speed -3% (thermal/wear), feed -2%
 *   - Nelson Rule 5/8 (beyond-sigma cluster): coarse adjust (as above)
 *
 * References:
 *   - Montgomery (2019) SPC, 8th Ed, Ch 6
 *   - AIAG SPC Reference Manual, 2nd Ed
 *   - Nelson (1984) "The Shewhart Control Chart — Tests for Special Causes"
 *
 * @module engines/SPCFeedbackLoopEngine
 * @milestone MIO-MS0 U-MIO31
 */

import { SPCProcessCapabilityEngine, type SPCInput, type SPCResult } from "./SPCProcessCapabilityEngine.js";
import { nelsonSPCRulesEngine, type NelsonViolation } from "./NelsonSPCRulesEngine.js";

// ── Thresholds ─────────────────────────────────────────────────────────────
const CPK_SIX_SIGMA = 1.67;
const CPK_CAPABLE = 1.33;
const CPK_MARGINAL = 1.00;

// Bounded adjustment magnitudes
const FINE_STEP = 0.02;   // ±2%
const COARSE_STEP = 0.05; // ±5%
const DEPTH_STEP = 0.03;  // ±3%

// ── Types ──────────────────────────────────────────────────────────────────

export interface CurrentParameters {
  cutting_speed_m_min: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
}

export interface FeedbackLoopInput {
  /** Characteristic being measured (e.g., "bore_diameter_mm") */
  feature_name: string;
  /** Time-ordered CMM measurements for this feature */
  measurements: number[];
  /** Nominal target value */
  nominal: number;
  /** Positive tolerance (USL = nominal + upper_tolerance) */
  upper_tolerance: number;
  /** Positive tolerance (LSL = nominal − lower_tolerance) */
  lower_tolerance: number;
  /** Current cutting parameters that generated these measurements */
  current_params: CurrentParameters;
  /** Optional measurement uncertainty (±1σ) for ISO 22514-1 bounds */
  measurement_uncertainty?: number;
  /** Optional subgroup size for within-subgroup variation */
  subgroup_size?: number;
}

export interface ParameterAdjustment {
  speed_multiplier: number;    // e.g., 0.97 = −3% speed
  feed_multiplier: number;
  depth_multiplier: number;
  new_params: CurrentParameters;
  rationale: string[];
}

export interface DriftAssessment {
  detected: boolean;
  nelson_violations: NelsonViolation[];
  violated_rule_ids: number[];
  trend: "increasing" | "decreasing" | "stable";
  slope: number;          // regression slope (units / measurement)
}

export type FeedbackAction = "maintain" | "fine_tune" | "coarse_adjust" | "escalate";

export interface FeedbackLoopResult {
  /** Feature / characteristic this result pertains to */
  feature_name: string;
  /** Raw SPC output from SPCProcessCapabilityEngine */
  spc: SPCResult;
  /** Cpk from underlying SPC */
  cpk: number;
  /** Ppk from underlying SPC */
  ppk: number;
  /** Process assessment */
  assessment: "capable" | "marginal" | "not_capable";
  /** Centering */
  centering: "centered" | "shifted_high" | "shifted_low";
  /** Drift analysis from Nelson rules + trend regression */
  drift: DriftAssessment;
  /** Parameter adjustment recommendation */
  adjustments: ParameterAdjustment;
  /** Overall action decision */
  action: FeedbackAction;
  /** Machine-readable reason codes */
  reasons: string[];
  /** When in escalation, human-oriented summary */
  escalation_message?: string;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class SPCFeedbackLoopEngine {
  private readonly spc: SPCProcessCapabilityEngine;

  constructor(spc?: SPCProcessCapabilityEngine) {
    this.spc = spc ?? new SPCProcessCapabilityEngine();
  }

  /**
   * Evaluate measurements and emit a feedback-loop result.
   *
   * @param input — feature, measurements, tolerance, current parameters
   * @returns FeedbackLoopResult with adjustments and recommended action
   */
  evaluate(input: FeedbackLoopInput): FeedbackLoopResult {
    if (!input || !Array.isArray(input.measurements) || input.measurements.length < 2) {
      return this.emptyResult(input);
    }

    const spcInput: SPCInput = {
      measurements: input.measurements,
      nominal: input.nominal,
      upper_tolerance: input.upper_tolerance,
      lower_tolerance: input.lower_tolerance,
      subgroup_size: input.subgroup_size,
      measurement_uncertainty: input.measurement_uncertainty,
      feature_name: input.feature_name,
    };

    const spcOut = this.spc.compute(spcInput);
    const spc = spcOut.value;

    // Re-run Nelson rules via dedicated engine for clean trend + rule metadata
    const nelson = nelsonSPCRulesEngine.evaluateAllRules(input.measurements);
    const violatedRuleIds = nelson.rule_results.filter(r => r.violated).map(r => r.rule);

    // Trend via simple OLS regression
    const { slope, trend } = this.computeTrend(input.measurements);

    const drift: DriftAssessment = {
      detected: !nelson.overall_in_control || Math.abs(slope) > this.trendSlopeEpsilon(input),
      nelson_violations: nelson.violations,
      violated_rule_ids: violatedRuleIds,
      trend,
      slope,
    };

    const reasons: string[] = [];
    const adjustments = this.deriveAdjustment(input, spc, drift, reasons);

    const action = this.decideAction(spc.capability.cpk, drift, reasons);

    const result: FeedbackLoopResult = {
      feature_name: input.feature_name,
      spc,
      cpk: spc.capability.cpk,
      ppk: spc.capability.ppk,
      assessment: spc.process_assessment,
      centering: spc.centering,
      drift,
      adjustments,
      action,
      reasons,
    };

    if (action === "escalate") {
      result.escalation_message = this.escalationMessage(input, spc, drift);
    }

    return result;
  }

  // ── Adjustment logic ────────────────────────────────────────────────────

  private deriveAdjustment(
    input: FeedbackLoopInput,
    spc: SPCResult,
    drift: DriftAssessment,
    reasons: string[],
  ): ParameterAdjustment {
    let speed = 1.0, feed = 1.0, depth = 1.0;
    const rationale: string[] = [];

    // Cpk tier
    if (spc.capability.cpk >= CPK_SIX_SIGMA) {
      rationale.push(`Cpk=${spc.capability.cpk.toFixed(2)} ≥ 1.67 (Six Sigma) — maintain`);
      reasons.push("CPK_SIX_SIGMA_MAINTAIN");
    } else if (spc.capability.cpk >= CPK_CAPABLE) {
      rationale.push(`Cpk=${spc.capability.cpk.toFixed(2)} in [1.33, 1.67) — fine tune`);
      reasons.push("CPK_CAPABLE_FINE_TUNE");
      // Nudge feed down slightly to reduce variation
      feed -= FINE_STEP;
      rationale.push(`feed ×${(1 - FINE_STEP).toFixed(2)} to reduce variation at capable Cpk`);
    } else if (spc.capability.cpk >= CPK_MARGINAL) {
      rationale.push(`Cpk=${spc.capability.cpk.toFixed(2)} in [1.00, 1.33) — coarse adjust`);
      reasons.push("CPK_MARGINAL_COARSE");
      feed -= COARSE_STEP;
      depth -= DEPTH_STEP;
      rationale.push(`feed ×${(1 - COARSE_STEP).toFixed(2)}, depth ×${(1 - DEPTH_STEP).toFixed(2)} to restore capability`);
    } else {
      rationale.push(`Cpk=${spc.capability.cpk.toFixed(2)} < 1.00 — escalate (parameters alone insufficient)`);
      reasons.push("CPK_BELOW_MIN_ESCALATE");
      // Still ship conservative adjustment while escalating
      feed -= COARSE_STEP;
      depth -= COARSE_STEP;
    }

    // Centering
    if (spc.centering === "shifted_high") {
      feed -= COARSE_STEP;
      depth -= COARSE_STEP;
      rationale.push("Centering shifted_high — reduce feed & depth to decrease deflection/force");
      reasons.push("CENTERING_SHIFTED_HIGH");
    } else if (spc.centering === "shifted_low") {
      feed += FINE_STEP;
      depth += DEPTH_STEP;
      rationale.push("Centering shifted_low — small feed & depth increase");
      reasons.push("CENTERING_SHIFTED_LOW");
    }

    // Nelson rule signatures
    if (drift.violated_rule_ids.includes(2) ||
        drift.violated_rule_ids.includes(3) ||
        drift.violated_rule_ids.includes(4)) {
      speed -= 0.03;
      feed -= FINE_STEP;
      rationale.push("Nelson 2/3/4 detected (trend/run) — speed −3%, feed −2% (thermal/wear signature)");
      reasons.push("NELSON_TREND_DETECTED");
    }

    if (drift.violated_rule_ids.includes(5) ||
        drift.violated_rule_ids.includes(6) ||
        drift.violated_rule_ids.includes(8)) {
      feed -= FINE_STEP;
      depth -= DEPTH_STEP;
      rationale.push("Nelson 5/6/8 detected (sigma-cluster) — feed −2%, depth −3%");
      reasons.push("NELSON_CLUSTER_DETECTED");
    }

    // Clamp to safety-bounded range [0.80, 1.10] — prevents runaway loops
    speed = clamp(speed, 0.80, 1.10);
    feed = clamp(feed, 0.80, 1.10);
    depth = clamp(depth, 0.80, 1.10);

    const cp = input.current_params;
    const new_params: CurrentParameters = {
      cutting_speed_m_min: round(cp.cutting_speed_m_min * speed, 2),
      feed_per_tooth_mm: round(cp.feed_per_tooth_mm * feed, 4),
      axial_depth_mm: round(cp.axial_depth_mm * depth, 3),
    };

    return {
      speed_multiplier: round(speed, 4),
      feed_multiplier: round(feed, 4),
      depth_multiplier: round(depth, 4),
      new_params,
      rationale,
    };
  }

  private decideAction(cpk: number, drift: DriftAssessment, _reasons: string[]): FeedbackAction {
    if (cpk < CPK_MARGINAL) return "escalate";
    if (cpk >= CPK_SIX_SIGMA && !drift.detected) return "maintain";
    if (cpk >= CPK_CAPABLE && drift.violated_rule_ids.length === 0) return "fine_tune";
    return "coarse_adjust";
  }

  // ── Trend / stats helpers ───────────────────────────────────────────────

  private computeTrend(data: number[]): { slope: number; trend: DriftAssessment["trend"] } {
    const n = data.length;
    if (n < 3) return { slope: 0, trend: "stable" };

    const xMean = (n - 1) / 2;
    const yMean = data.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      num += dx * (data[i] - yMean);
      den += dx * dx;
    }
    const slope = den > 0 ? num / den : 0;
    const eps = Math.abs(yMean) * 1e-4;
    const trend: DriftAssessment["trend"] =
      slope > eps ? "increasing" : slope < -eps ? "decreasing" : "stable";
    return { slope, trend };
  }

  private trendSlopeEpsilon(input: FeedbackLoopInput): number {
    // 10% of tolerance band over the measurement window
    const band = (input.upper_tolerance + input.lower_tolerance);
    return band / Math.max(10, input.measurements.length);
  }

  private escalationMessage(input: FeedbackLoopInput, spc: SPCResult, drift: DriftAssessment): string {
    const rules = drift.violated_rule_ids.length
      ? ` Nelson rules violated: [${drift.violated_rule_ids.join(", ")}].`
      : "";
    return `Feature "${input.feature_name}" Cpk=${spc.capability.cpk.toFixed(2)} < 1.00 — parameters alone cannot restore capability.${rules} Investigate fixturing, tool condition, machine calibration, or material lot variance.`;
  }

  private emptyResult(input: FeedbackLoopInput): FeedbackLoopResult {
    const emptySpc: SPCResult = {
      sample_stats: { n: 0, mean: 0, std_dev: 0, min: 0, max: 0, range: 0, median: 0 },
      capability: { cp: 0, cpk: 0, pp: 0, ppk: 0, cpm: 0, sigma_level: 0 },
      predicted_defects: { ppm_total: 0, ppm_upper: 0, ppm_lower: 0, pct_out_of_spec: 0, yield_pct: 100 },
      control_chart: { ucl: 0, lcl: 0, cl: 0, ucl_range: 0, lcl_range: 0, cl_range: 0 },
      nelson_violations: [],
      process_assessment: "not_capable",
      centering: "centered",
      recommendations: ["Insufficient measurements (n < 2) — collect more data before feedback."],
    };

    const cp = input?.current_params ?? { cutting_speed_m_min: 0, feed_per_tooth_mm: 0, axial_depth_mm: 0 };

    return {
      feature_name: input?.feature_name ?? "unknown",
      spc: emptySpc,
      cpk: 0,
      ppk: 0,
      assessment: "not_capable",
      centering: "centered",
      drift: { detected: false, nelson_violations: [], violated_rule_ids: [], trend: "stable", slope: 0 },
      adjustments: {
        speed_multiplier: 1.0,
        feed_multiplier: 1.0,
        depth_multiplier: 1.0,
        new_params: { ...cp },
        rationale: ["No measurements — no adjustment applied"],
      },
      action: "maintain",
      reasons: ["INSUFFICIENT_DATA"],
    };
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function round(x: number, digits: number): number {
  const p = Math.pow(10, digits);
  return Math.round(x * p) / p;
}

export const spcFeedbackLoopEngine = new SPCFeedbackLoopEngine();
