/**
 * MachiningIntelligenceGuardHook
 * ================================
 *
 * Safety hook for MachiningIntelligenceOrchestratorEngine (MIO-MS0 U-MIO29).
 *
 * Validates orchestrator plans before they reach downstream consumers (post-
 * processors, CNC controllers, MES). Rejects plans that violate machine
 * envelopes, physics sanity bounds, or have insufficient aggregated confidence.
 *
 * HARD BLOCK: refuses plans with S(x) < 0.70 safety score.
 *
 * @module hooks/MachiningIntelligenceGuardHook
 * @version 1.0.0
 * @milestone MIO-MS0 U-MIO29
 */

import { z } from "zod";

export const HOOK_NAME = "machining-intelligence-orchestrator-guard";
export const HOOK_VERSION = "1.0.0";

/** Actions this hook guards */
export const GUARDED_ACTIONS = [
  "mio_orchestrate",
  "mio_plan",
  "mio_explain",
  "machining_ai_plan",
];

// Safety thresholds
const HARD_BLOCK_SAFETY_SCORE = 0.70;
const MIN_CONFIDENCE = 0.5;
const MAX_FORCE_RATIO = 1.0;
const MAX_POWER_RATIO = 0.95;
const MIN_STABILITY_MARGIN = 0.2;

// Physics sanity bounds
const LIMITS = {
  rpm_min: 20,
  rpm_max: 60000,           // micro-milling extreme
  cutting_speed_min: 5,     // m/min — rubbing threshold
  cutting_speed_max: 1500,  // m/min — graphite/aluminum extreme
  feed_rate_min: 1,         // mm/min
  feed_rate_max: 30000,     // mm/min — HSM aluminum
  force_max_n: 50000,       // 50 kN — heavy roughing
  power_max_kw: 200,        // very large machines
};

// Input schema: a MachiningPlan subset
const PlanInputSchema = z.object({
  cutting_parameters: z.object({
    cutting_speed_m_min: z.number(),
    spindle_rpm: z.number(),
    feed_rate_mm_min: z.number(),
    axial_depth_mm: z.number(),
  }),
  predictions: z.object({
    cutting_force_n: z.number(),
    power_kw: z.number(),
    tool_life_min: z.number().optional(),
    surface_finish_um: z.number().optional(),
  }),
  safety: z.object({
    force_ratio: z.number(),
    power_ratio: z.number(),
    stability_margin: z.number(),
    deflection_ratio: z.number(),
    overall_safety_score: z.number(),
  }),
  confidence: z.number(),
  context: z
    .object({
      machine_type: z.string().optional(),
      operation_type: z.string().optional(),
    })
    .optional(),
});

export type PlanInput = z.infer<typeof PlanInputSchema>;

export interface GuardViolation {
  code: string;
  parameter: string;
  value: number;
  limit: number;
  severity: "warning" | "error" | "critical";
  message: string;
}

export interface GuardResult {
  passed: boolean;
  hard_block: boolean;
  violations: GuardViolation[];
  safety_score: number;
  recommendation: "accept" | "review" | "reject";
}

export class MachiningIntelligenceGuardHook {
  static readonly VERSION = HOOK_VERSION;

  /**
   * Validate an orchestrator plan.
   *
   * @param input — subset of MachiningPlan (cutting_parameters, predictions, safety, confidence)
   * @returns GuardResult with violations, safety score, and recommendation
   */
  static validate(input: unknown): GuardResult {
    const parsed = PlanInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        passed: false,
        hard_block: true,
        violations: [
          {
            code: "INVALID_INPUT",
            parameter: "plan",
            value: 0,
            limit: 0,
            severity: "critical",
            message: `Plan schema validation failed: ${parsed.error.message}`,
          },
        ],
        safety_score: 0,
        recommendation: "reject",
      };
    }

    const plan = parsed.data;
    const violations: GuardViolation[] = [];

    // 1. HARD BLOCK: safety score threshold (S(x) < 0.70)
    if (plan.safety.overall_safety_score < HARD_BLOCK_SAFETY_SCORE) {
      violations.push({
        code: "SAFETY_SCORE_HARD_BLOCK",
        parameter: "safety.overall_safety_score",
        value: plan.safety.overall_safety_score,
        limit: HARD_BLOCK_SAFETY_SCORE,
        severity: "critical",
        message: `S(x) = ${plan.safety.overall_safety_score.toFixed(3)} < ${HARD_BLOCK_SAFETY_SCORE} — HARD BLOCK: plan rejected`,
      });
    }

    // 2. Confidence floor
    if (plan.confidence < MIN_CONFIDENCE) {
      violations.push({
        code: "LOW_CONFIDENCE",
        parameter: "confidence",
        value: plan.confidence,
        limit: MIN_CONFIDENCE,
        severity: "error",
        message: `Aggregated confidence ${plan.confidence.toFixed(3)} below minimum ${MIN_CONFIDENCE}`,
      });
    }

    // 3. Force ratio (predicted / max_force_n)
    if (plan.safety.force_ratio > MAX_FORCE_RATIO) {
      violations.push({
        code: "FORCE_OVERLIMIT",
        parameter: "safety.force_ratio",
        value: plan.safety.force_ratio,
        limit: MAX_FORCE_RATIO,
        severity: "critical",
        message: `Force ratio ${plan.safety.force_ratio.toFixed(2)} exceeds 1.0 — tool breakage risk`,
      });
    }

    // 4. Power ratio
    if (plan.safety.power_ratio > MAX_POWER_RATIO) {
      violations.push({
        code: "POWER_OVERLIMIT",
        parameter: "safety.power_ratio",
        value: plan.safety.power_ratio,
        limit: MAX_POWER_RATIO,
        severity: "error",
        message: `Power ratio ${plan.safety.power_ratio.toFixed(2)} above ${MAX_POWER_RATIO} — spindle stall risk`,
      });
    }

    // 5. Stability margin
    if (plan.safety.stability_margin < MIN_STABILITY_MARGIN) {
      violations.push({
        code: "LOW_STABILITY_MARGIN",
        parameter: "safety.stability_margin",
        value: plan.safety.stability_margin,
        limit: MIN_STABILITY_MARGIN,
        severity: "error",
        message: `Stability margin ${plan.safety.stability_margin.toFixed(2)} below ${MIN_STABILITY_MARGIN} — chatter risk`,
      });
    }

    // 6. Physics sanity: spindle RPM
    const rpm = plan.cutting_parameters.spindle_rpm;
    if (rpm < LIMITS.rpm_min || rpm > LIMITS.rpm_max) {
      violations.push({
        code: "RPM_OUT_OF_RANGE",
        parameter: "cutting_parameters.spindle_rpm",
        value: rpm,
        limit: rpm < LIMITS.rpm_min ? LIMITS.rpm_min : LIMITS.rpm_max,
        severity: "critical",
        message: `Spindle RPM ${rpm} outside physical range [${LIMITS.rpm_min}, ${LIMITS.rpm_max}]`,
      });
    }

    // 7. Cutting speed sanity
    const vc = plan.cutting_parameters.cutting_speed_m_min;
    if (vc < LIMITS.cutting_speed_min) {
      violations.push({
        code: "VC_TOO_LOW",
        parameter: "cutting_parameters.cutting_speed_m_min",
        value: vc,
        limit: LIMITS.cutting_speed_min,
        severity: "warning",
        message: `Cutting speed ${vc.toFixed(1)} m/min below ${LIMITS.cutting_speed_min} — rubbing, not cutting`,
      });
    }
    if (vc > LIMITS.cutting_speed_max) {
      violations.push({
        code: "VC_TOO_HIGH",
        parameter: "cutting_parameters.cutting_speed_m_min",
        value: vc,
        limit: LIMITS.cutting_speed_max,
        severity: "critical",
        message: `Cutting speed ${vc.toFixed(1)} m/min above ${LIMITS.cutting_speed_max} — unphysical`,
      });
    }

    // 8. Feed rate sanity
    const feed = plan.cutting_parameters.feed_rate_mm_min;
    if (feed < LIMITS.feed_rate_min || feed > LIMITS.feed_rate_max) {
      violations.push({
        code: "FEED_RATE_OUT_OF_RANGE",
        parameter: "cutting_parameters.feed_rate_mm_min",
        value: feed,
        limit: feed < LIMITS.feed_rate_min ? LIMITS.feed_rate_min : LIMITS.feed_rate_max,
        severity: "error",
        message: `Feed rate ${feed.toFixed(0)} mm/min outside [${LIMITS.feed_rate_min}, ${LIMITS.feed_rate_max}]`,
      });
    }

    // 9. Force sanity
    if (plan.predictions.cutting_force_n > LIMITS.force_max_n) {
      violations.push({
        code: "FORCE_UNPHYSICAL",
        parameter: "predictions.cutting_force_n",
        value: plan.predictions.cutting_force_n,
        limit: LIMITS.force_max_n,
        severity: "critical",
        message: `Predicted force ${plan.predictions.cutting_force_n.toFixed(0)} N exceeds ${LIMITS.force_max_n} N — physics inconsistency`,
      });
    }

    // 10. Power sanity
    if (plan.predictions.power_kw > LIMITS.power_max_kw) {
      violations.push({
        code: "POWER_UNPHYSICAL",
        parameter: "predictions.power_kw",
        value: plan.predictions.power_kw,
        limit: LIMITS.power_max_kw,
        severity: "critical",
        message: `Predicted power ${plan.predictions.power_kw.toFixed(1)} kW exceeds ${LIMITS.power_max_kw} kW`,
      });
    }

    // Decide outcome
    const criticalCount = violations.filter(v => v.severity === "critical").length;
    const errorCount = violations.filter(v => v.severity === "error").length;
    const hardBlock =
      plan.safety.overall_safety_score < HARD_BLOCK_SAFETY_SCORE || criticalCount > 0;
    const passed = violations.length === 0;
    const recommendation: GuardResult["recommendation"] = hardBlock
      ? "reject"
      : errorCount > 0
        ? "review"
        : "accept";

    return {
      passed,
      hard_block: hardBlock,
      violations,
      safety_score: plan.safety.overall_safety_score,
      recommendation,
    };
  }
}

export const machiningIntelligenceGuardHook = MachiningIntelligenceGuardHook;
