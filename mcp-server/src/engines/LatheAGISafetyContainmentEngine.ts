/**
 * LatheAGISafetyContainmentEngine — U-LTH61 (LATHE-MASTER PX-S2)
 *
 * Bounds AGI outputs against physics envelopes, cost margins, and shop
 * capacity. Every AGI recommendation must pass this gate before being
 * consumed by P1..P5. Failures return a structured rejection with a
 * trace of which check failed and the bound that was violated.
 *
 * Check categories:
 *   - physics     — cutting speed within [Vc_min, Vc_max] per ISO group,
 *                   feed within fz_max, force within spindle torque margin
 *   - economics   — quote margin ≥ 0.10 (10% minimum), not 0.00 or negative
 *   - capacity    — schedule total hours ≤ fleet_capacity_hours
 *   - kinematic   — live-tool/sub-spindle required but not present
 *
 * Each check has soft+hard thresholds. Soft = warning. Hard = block.
 *
 * Citations:
 *   - Sandvik Turning Handbook (Vc envelopes)
 *   - CANONICAL_KIENZLE (src/physics/constants.ts)
 *   - JM Die shop-floor margin minimum (10%)
 *
 * @milestone LATHE-MASTER U-LTH61
 */

import { z } from "zod";
import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// PHYSICS ENVELOPES
// ============================================================================

/** Cutting speed envelope (m/min) by ISO group — soft/hard bounds. */
const VC_ENVELOPE: Record<ISOGroup, { min_soft: number; min_hard: number; max_soft: number; max_hard: number }> = {
  P: { min_hard: 20, min_soft: 50, max_soft: 400, max_hard: 600 },
  M: { min_hard: 15, min_soft: 40, max_soft: 300, max_hard: 450 },
  K: { min_hard: 30, min_soft: 60, max_soft: 350, max_hard: 500 },
  N: { min_hard: 50, min_soft: 100, max_soft: 1200, max_hard: 1800 },
  S: { min_hard: 5,  min_soft: 15, max_soft: 120, max_hard: 200 },
  H: { min_hard: 10, min_soft: 30, max_soft: 200, max_hard: 300 },
};

/** Max fz (mm/rev) by ISO group. Beyond max_hard → fracture risk. */
const FZ_MAX: Record<ISOGroup, { max_soft: number; max_hard: number }> = {
  P: { max_soft: 0.50, max_hard: 0.80 },
  M: { max_soft: 0.40, max_hard: 0.60 },
  K: { max_soft: 0.45, max_hard: 0.70 },
  N: { max_soft: 0.60, max_hard: 1.00 },
  S: { max_soft: 0.30, max_hard: 0.45 },
  H: { max_soft: 0.25, max_hard: 0.40 },
};

// ============================================================================
// OTHER CONSTANTS
// ============================================================================

const MARGIN_MIN_HARD = 0.0;    // no negative-margin quotes
const MARGIN_MIN_SOFT = 0.10;   // warn below 10%
const SPINDLE_TORQUE_MARGIN_N = 5000; // rough max Fc for JM Die fleet
const FLEET_CAPACITY_HOURS_DEFAULT = 168; // 1 week @ 24h
const SOFT_WARNING_CODE = "soft";
const HARD_BLOCK_CODE = "hard";

// ============================================================================
// SCHEMAS
// ============================================================================

export const SpeedFeedCandidateSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  vc_m_min: z.number().finite(),
  fz_mm: z.number().finite(),
  ap_mm: z.number().finite(),
});
export type SpeedFeedCandidate = z.infer<typeof SpeedFeedCandidateSchema>;

export const QuoteCandidateSchema = z.object({
  unit_price_usd: z.number().finite(),
  total_direct_cost_usd: z.number().finite(),
  quantity: z.number().int().positive(),
});
export type QuoteCandidate = z.infer<typeof QuoteCandidateSchema>;

export const ScheduleCandidateSchema = z.object({
  total_busy_min: z.number().finite(),
  fleet_capacity_hours: z.number().positive().optional(),
});
export type ScheduleCandidate = z.infer<typeof ScheduleCandidateSchema>;

export const KinematicCandidateSchema = z.object({
  requires_live_tool: z.boolean().default(false),
  requires_sub_spindle: z.boolean().default(false),
  requires_y_axis: z.boolean().default(false),
  machine_has_live_tool: z.boolean().default(false),
  machine_has_sub_spindle: z.boolean().default(false),
  machine_has_y_axis: z.boolean().default(false),
});
export type KinematicCandidate = z.infer<typeof KinematicCandidateSchema>;

export const SafetyCheckInputSchema = z.object({
  category: z.enum(["physics", "economics", "capacity", "kinematic", "all"]),
  speed_feed: SpeedFeedCandidateSchema.optional(),
  quote: QuoteCandidateSchema.optional(),
  schedule: ScheduleCandidateSchema.optional(),
  kinematic: KinematicCandidateSchema.optional(),
});
export type SafetyCheckInput = z.infer<typeof SafetyCheckInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export type Severity = "none" | typeof SOFT_WARNING_CODE | typeof HARD_BLOCK_CODE;

export interface CheckResult {
  category: "physics" | "economics" | "capacity" | "kinematic";
  check_id: string;
  severity: Severity;
  message: string;
  bound_low?: number;
  bound_high?: number;
  observed?: number;
}

export interface SafetyReport {
  passed: boolean;
  blocking_count: number;
  warning_count: number;
  checks: CheckResult[];
  trace: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheAGISafetyContainmentEngine {
  check(input: SafetyCheckInput): SafetyReport {
    const parsed = SafetyCheckInputSchema.parse(input);
    const checks: CheckResult[] = [];
    const trace: string[] = [];

    if (parsed.category === "physics" || parsed.category === "all") {
      if (parsed.speed_feed) {
        checks.push(...this.checkPhysics(parsed.speed_feed));
        trace.push(`physics: evaluated Vc=${parsed.speed_feed.vc_m_min}, fz=${parsed.speed_feed.fz_mm}, ap=${parsed.speed_feed.ap_mm}`);
      }
    }
    if (parsed.category === "economics" || parsed.category === "all") {
      if (parsed.quote) {
        checks.push(...this.checkEconomics(parsed.quote));
        trace.push(`economics: evaluated unit=${parsed.quote.unit_price_usd}, direct=${parsed.quote.total_direct_cost_usd}, qty=${parsed.quote.quantity}`);
      }
    }
    if (parsed.category === "capacity" || parsed.category === "all") {
      if (parsed.schedule) {
        checks.push(...this.checkCapacity(parsed.schedule));
        trace.push(`capacity: evaluated busy=${parsed.schedule.total_busy_min} min`);
      }
    }
    if (parsed.category === "kinematic" || parsed.category === "all") {
      if (parsed.kinematic) {
        checks.push(...this.checkKinematic(parsed.kinematic));
        trace.push(`kinematic: evaluated required vs present flags`);
      }
    }

    const blocking = checks.filter((c) => c.severity === HARD_BLOCK_CODE).length;
    const warning = checks.filter((c) => c.severity === SOFT_WARNING_CODE).length;
    trace.push(`final: ${checks.length} checks, ${blocking} blocking, ${warning} warnings`);

    return {
      passed: blocking === 0,
      blocking_count: blocking,
      warning_count: warning,
      checks,
      trace,
    };
  }

  // ==========================================================================
  // CHECK IMPLEMENTATIONS
  // ==========================================================================

  private checkPhysics(sf: SpeedFeedCandidate): CheckResult[] {
    const results: CheckResult[] = [];
    const envelope = VC_ENVELOPE[sf.iso_group];
    const fzLimits = FZ_MAX[sf.iso_group];
    const kienzle = CANONICAL_KIENZLE[sf.iso_group];

    if (sf.vc_m_min < envelope.min_hard) {
      results.push({
        category: "physics",
        check_id: "vc_below_hard_min",
        severity: HARD_BLOCK_CODE,
        message: `Vc ${sf.vc_m_min} m/min below hard minimum ${envelope.min_hard} for ${sf.iso_group}`,
        bound_low: envelope.min_hard,
        observed: sf.vc_m_min,
      });
    } else if (sf.vc_m_min < envelope.min_soft) {
      results.push({
        category: "physics",
        check_id: "vc_below_soft_min",
        severity: SOFT_WARNING_CODE,
        message: `Vc ${sf.vc_m_min} below recommended ${envelope.min_soft} — risk of BUE`,
        bound_low: envelope.min_soft,
        observed: sf.vc_m_min,
      });
    } else if (sf.vc_m_min > envelope.max_hard) {
      results.push({
        category: "physics",
        check_id: "vc_above_hard_max",
        severity: HARD_BLOCK_CODE,
        message: `Vc ${sf.vc_m_min} m/min exceeds hard max ${envelope.max_hard} for ${sf.iso_group}`,
        bound_high: envelope.max_hard,
        observed: sf.vc_m_min,
      });
    } else if (sf.vc_m_min > envelope.max_soft) {
      results.push({
        category: "physics",
        check_id: "vc_above_soft_max",
        severity: SOFT_WARNING_CODE,
        message: `Vc ${sf.vc_m_min} above recommended ${envelope.max_soft} — rapid tool wear`,
        bound_high: envelope.max_soft,
        observed: sf.vc_m_min,
      });
    }

    if (sf.fz_mm <= 0) {
      results.push({
        category: "physics",
        check_id: "fz_nonpositive",
        severity: HARD_BLOCK_CODE,
        message: `fz ${sf.fz_mm} must be > 0`,
        observed: sf.fz_mm,
      });
    } else if (sf.fz_mm > fzLimits.max_hard) {
      results.push({
        category: "physics",
        check_id: "fz_above_hard_max",
        severity: HARD_BLOCK_CODE,
        message: `fz ${sf.fz_mm} exceeds hard max ${fzLimits.max_hard} for ${sf.iso_group}`,
        bound_high: fzLimits.max_hard,
        observed: sf.fz_mm,
      });
    } else if (sf.fz_mm > fzLimits.max_soft) {
      results.push({
        category: "physics",
        check_id: "fz_above_soft_max",
        severity: SOFT_WARNING_CODE,
        message: `fz ${sf.fz_mm} above recommended ${fzLimits.max_soft}`,
        bound_high: fzLimits.max_soft,
        observed: sf.fz_mm,
      });
    }

    if (sf.ap_mm <= 0) {
      results.push({
        category: "physics",
        check_id: "ap_nonpositive",
        severity: HARD_BLOCK_CODE,
        message: `ap ${sf.ap_mm} must be > 0`,
        observed: sf.ap_mm,
      });
    }

    // Force-limit: Kienzle Fc should fit spindle torque margin
    if (sf.ap_mm > 0 && sf.fz_mm > 0) {
      const fc = kienzle.kc1_1 * sf.ap_mm * Math.pow(sf.fz_mm, 1 - kienzle.mc);
      if (fc > SPINDLE_TORQUE_MARGIN_N) {
        results.push({
          category: "physics",
          check_id: "cutting_force_exceeds_spindle",
          severity: HARD_BLOCK_CODE,
          message: `Kienzle Fc ${fc.toFixed(0)} N exceeds spindle torque margin ${SPINDLE_TORQUE_MARGIN_N} N`,
          bound_high: SPINDLE_TORQUE_MARGIN_N,
          observed: Math.round(fc),
        });
      }
    }

    return results;
  }

  private checkEconomics(q: QuoteCandidate): CheckResult[] {
    const results: CheckResult[] = [];
    if (q.unit_price_usd <= 0) {
      results.push({
        category: "economics",
        check_id: "unit_price_nonpositive",
        severity: HARD_BLOCK_CODE,
        message: `Unit price ${q.unit_price_usd} must be > 0`,
        observed: q.unit_price_usd,
      });
      return results;
    }
    const margin = (q.unit_price_usd * q.quantity - q.total_direct_cost_usd) / (q.unit_price_usd * q.quantity);
    if (margin < MARGIN_MIN_HARD) {
      results.push({
        category: "economics",
        check_id: "margin_negative",
        severity: HARD_BLOCK_CODE,
        message: `Quote margin ${(margin * 100).toFixed(1)}% is negative — selling below cost`,
        bound_low: MARGIN_MIN_HARD,
        observed: margin,
      });
    } else if (margin < MARGIN_MIN_SOFT) {
      results.push({
        category: "economics",
        check_id: "margin_below_floor",
        severity: SOFT_WARNING_CODE,
        message: `Quote margin ${(margin * 100).toFixed(1)}% below 10% shop floor`,
        bound_low: MARGIN_MIN_SOFT,
        observed: margin,
      });
    }
    return results;
  }

  private checkCapacity(s: ScheduleCandidate): CheckResult[] {
    const results: CheckResult[] = [];
    const capacityHours = s.fleet_capacity_hours ?? FLEET_CAPACITY_HOURS_DEFAULT;
    const busyHours = s.total_busy_min / 60;
    if (busyHours > capacityHours) {
      results.push({
        category: "capacity",
        check_id: "schedule_exceeds_capacity",
        severity: HARD_BLOCK_CODE,
        message: `Schedule requires ${busyHours.toFixed(1)}h, fleet capacity ${capacityHours}h`,
        bound_high: capacityHours,
        observed: Math.round(busyHours * 10) / 10,
      });
    } else if (busyHours > capacityHours * 0.9) {
      results.push({
        category: "capacity",
        check_id: "schedule_near_capacity",
        severity: SOFT_WARNING_CODE,
        message: `Schedule at ${((busyHours / capacityHours) * 100).toFixed(0)}% capacity — little slack for breakdowns`,
        bound_high: capacityHours,
        observed: Math.round(busyHours * 10) / 10,
      });
    }
    return results;
  }

  private checkKinematic(k: KinematicCandidate): CheckResult[] {
    const results: CheckResult[] = [];
    if (k.requires_live_tool && !k.machine_has_live_tool) {
      results.push({
        category: "kinematic",
        check_id: "live_tool_missing",
        severity: HARD_BLOCK_CODE,
        message: "Job requires live tool but selected machine has none",
      });
    }
    if (k.requires_sub_spindle && !k.machine_has_sub_spindle) {
      results.push({
        category: "kinematic",
        check_id: "sub_spindle_missing",
        severity: HARD_BLOCK_CODE,
        message: "Job requires sub-spindle pickup but selected machine has no sub-spindle",
      });
    }
    if (k.requires_y_axis && !k.machine_has_y_axis) {
      results.push({
        category: "kinematic",
        check_id: "y_axis_missing",
        severity: HARD_BLOCK_CODE,
        message: "Job requires Y-axis but selected machine is 2-axis",
      });
    }
    return results;
  }
}

export const latheAGISafetyContainmentEngine = new LatheAGISafetyContainmentEngine();
export { LatheAGISafetyContainmentEngine };
