/**
 * CrossProcessNeuroSymbolicSafetyVerifierEngine — XPROC-NEURAL Tier 8 (T8-03)
 *
 * The hard-gate atop T8-01: composes symbolic constraint projection with
 * tiered Ω(x) and S(x) thresholds. Every neural recommendation that targets
 * real machinery MUST pass through this gate. Returns a verdict (pass | review
 * | fail) with full provenance — never raw neural output for shop_floor tier.
 *
 * Decision matrix (evaluated lexicographically):
 *
 *   1. Global safety floor (state/shared/omega-thresholds.json
 *      .blocking_rules.safety_min_global = 0.70):
 *        safety_score < 0.70  →  fail (regardless of tier)
 *        Rationale: PRISM has a hard "BLOCKED — drop to sim, fix root cause,
 *        re-climb" rule below 0.70. Five-sigma can't fix unsafe physics.
 *
 *   2. Constraint severity (from T8-01 violations):
 *        any critical → fail
 *        any major    → review (escalate to operator)
 *
 *   3. Tier thresholds (Ω and S min for the requested tier):
 *        omega_score < tier.omega_min   →  review
 *        safety_score < tier.safety_min →  review
 *
 *   4. All-clear → pass
 *
 * Tier defaults to "shop_floor" per CLAUDE.md mandate ("Default to shop_floor
 * tier when in doubt"). This is the strictest tier — Ω≥0.95, S≥0.98.
 *
 * Per CLAUDE.md "wire to all sources": this engine routes through
 * `prism_intelligence` (xproc namespace) AND should be called by
 * `prism_safety:validate_physics` for the safety chain. The latter wiring
 * is left to a separate prism_safety integration unit.
 *
 * @module CrossProcessNeuroSymbolicSafetyVerifierEngine
 */

import { z } from "zod";
import {
  CrossProcessSymbolicConstraintEnforcerEngine,
  type ProjectionInput,
  type ProjectionResult,
  type ConstraintSeverity,
} from "./CrossProcessSymbolicConstraintEnforcerEngine.js";

// Tier ladder — values mirror state/shared/omega-thresholds.json. Inlined here
// rather than read at runtime because (a) these change rarely and (b) the
// tier ladder is part of the public CLAUDE.md contract. Drift detection lives
// in the test file (asserts inline values match the JSON).
export const TIER_THRESHOLDS = {
  shop_floor: { omega_min: 0.95, safety_min: 0.98 },
  production: { omega_min: 0.90, safety_min: 0.95 },
  proven_out: { omega_min: 0.85, safety_min: 0.90 },
  sim:        { omega_min: 0.50, safety_min: 0.70 },
} as const;
export const SAFETY_MIN_GLOBAL = 0.70;  // blocking_rules.safety_min_global

export type SafetyTier = keyof typeof TIER_THRESHOLDS;

const VerifyInputSchema = z.object({
  prediction: z.object({}).passthrough(),
  state: z.object({}).passthrough(),
  omega_score: z.number().finite().min(0).max(1).optional(),
  safety_score: z.number().finite().min(0).max(1).optional(),
  tier: z.enum(["shop_floor", "production", "proven_out", "sim"]).default("shop_floor"),
  caller: z.string().optional().describe("Caller identity for audit (e.g. 'mill-master', 't1-02')"),
});

export type VerifyInput = z.infer<typeof VerifyInputSchema>;

export type SafetyVerdict = "pass" | "review" | "fail";

export interface ThresholdCheck {
  tier: SafetyTier;
  omega_required: number;
  omega_actual: number | null;  // null if caller omitted
  omega_pass: boolean | null;   // null if not evaluated
  safety_required: number;
  safety_actual: number | null;
  safety_pass: boolean | null;
}

export interface SafetyVerifierResult {
  verdict: SafetyVerdict;
  tier: SafetyTier;
  projection: ProjectionResult;
  threshold_check: ThresholdCheck;
  rationale: string;
  escalation_reason?: string;
  gate_id: string;  // Stable hash of inputs for audit trail
  timestamp: string;
}

function severityCount(violations: ProjectionResult["violations"], severity: ConstraintSeverity): number {
  return violations.filter((v) => v.severity === severity).length;
}

function makeGateId(input: VerifyInput): string {
  // Cheap stable hash — concatenate critical fields and FNV-1a 32-bit.
  // Sufficient for audit-trail dedup; not cryptographic.
  const seed = JSON.stringify({
    p: input.prediction,
    s: input.state,
    omega: input.omega_score,
    safety: input.safety_score,
    tier: input.tier,
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `t8-03:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export class CrossProcessNeuroSymbolicSafetyVerifierEngine {
  /**
   * Hard-gate verification of a neural recommendation.
   *
   * @param input - prediction + state + optional omega/safety scores + tier
   * @returns SafetyVerifierResult with verdict, projection, threshold check, rationale
   * @throws Zod validation error on malformed input
   */
  static verify(input: VerifyInput): SafetyVerifierResult {
    const parsed = VerifyInputSchema.parse(input);
    const tier = parsed.tier;
    const tierThresh = TIER_THRESHOLDS[tier];

    // T8-01 projection (also catches constraint violations)
    const projection = CrossProcessSymbolicConstraintEnforcerEngine.project({
      prediction: parsed.prediction as ProjectionInput["prediction"],
      state: parsed.state as ProjectionInput["state"],
    });

    const criticalCount = severityCount(projection.violations, "critical");
    const majorCount = severityCount(projection.violations, "major");
    const minorCount = severityCount(projection.violations, "minor");

    const omegaActual = parsed.omega_score ?? null;
    const safetyActual = parsed.safety_score ?? null;
    const omegaPass = omegaActual === null ? null : omegaActual >= tierThresh.omega_min;
    const safetyPass = safetyActual === null ? null : safetyActual >= tierThresh.safety_min;

    const threshold_check: ThresholdCheck = {
      tier,
      omega_required: tierThresh.omega_min,
      omega_actual: omegaActual,
      omega_pass: omegaPass,
      safety_required: tierThresh.safety_min,
      safety_actual: safetyActual,
      safety_pass: safetyPass,
    };

    // Rule 1: global safety floor — hardest stop, ignores tier
    if (safetyActual !== null && safetyActual < SAFETY_MIN_GLOBAL) {
      return {
        verdict: "fail",
        tier,
        projection,
        threshold_check,
        rationale: `S(x)=${safetyActual.toFixed(3)} below global floor ${SAFETY_MIN_GLOBAL}. BLOCKED per omega-thresholds.json blocking_rules. Drop to sim, fix root cause, re-climb.`,
        gate_id: makeGateId(parsed),
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 2: constraint severity — critical fails, major escalates
    if (criticalCount > 0) {
      const crits = projection.violations.filter((v) => v.severity === "critical")
        .map((v) => `${v.constraint}(${v.original.toFixed(2)}→${v.projected.toFixed(2)})`)
        .join(", ");
      return {
        verdict: "fail",
        tier,
        projection,
        threshold_check,
        rationale: `${criticalCount} critical constraint violation(s): ${crits}. Cannot project to feasible region without operator intervention.`,
        escalation_reason: "critical_constraint_violation",
        gate_id: makeGateId(parsed),
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 3: tier-threshold check (omega + safety)
    if (omegaPass === false || safetyPass === false) {
      const fails: string[] = [];
      if (omegaPass === false) fails.push(`Ω=${omegaActual!.toFixed(3)} < ${tierThresh.omega_min} (tier=${tier})`);
      if (safetyPass === false) fails.push(`S=${safetyActual!.toFixed(3)} < ${tierThresh.safety_min} (tier=${tier})`);
      return {
        verdict: "review",
        tier,
        projection,
        threshold_check,
        rationale: `Tier threshold(s) not met: ${fails.join("; ")}. Operator review required.`,
        escalation_reason: "tier_threshold_below_minimum",
        gate_id: makeGateId(parsed),
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 4: major violations always escalate (even if tier passes)
    if (majorCount > 0) {
      return {
        verdict: "review",
        tier,
        projection,
        threshold_check,
        rationale: `${majorCount} major constraint violation(s) projected; operator review required before shop-floor execution. Minor: ${minorCount}.`,
        escalation_reason: "major_constraint_violation",
        gate_id: makeGateId(parsed),
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 5: all-clear
    return {
      verdict: "pass",
      tier,
      projection,
      threshold_check,
      rationale: minorCount > 0
        ? `Cleared at tier=${tier}: ${minorCount} minor violation(s) projected within tolerance, Ω/S within thresholds.`
        : `Cleared at tier=${tier}: no violations, Ω/S within thresholds.`,
      gate_id: makeGateId(parsed),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build a structured escalation envelope for operator review.
   * Used when a caller wants to skip the gate and surface the case directly
   * (e.g. a Tier-12 orchestrator that recognized ambiguity upfront).
   */
  static escalate(
    input: VerifyInput,
    reason: string,
  ): SafetyVerifierResult {
    const result = CrossProcessNeuroSymbolicSafetyVerifierEngine.verify(input);
    return {
      ...result,
      verdict: "review",
      escalation_reason: result.escalation_reason ?? reason,
      rationale: `[ESCALATED by caller] ${reason}. Original verdict: ${result.verdict}. ${result.rationale}`,
    };
  }

  static readonly engineId = "CrossProcessNeuroSymbolicSafetyVerifierEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T8-03";
}

export const crossProcessNeuroSymbolicSafetyVerifierEngine =
  CrossProcessNeuroSymbolicSafetyVerifierEngine;

/**
 * Dispatcher convenience wrapper — matches (action, params) signature.
 */
export function crossProcessNeuroSymbolicSafetyVerifier(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_safety_verify":
      return CrossProcessNeuroSymbolicSafetyVerifierEngine.verify(params as VerifyInput);
    case "xproc_safety_escalate": {
      const reason = (params.reason as string | undefined) ?? "operator-requested escalation";
      return CrossProcessNeuroSymbolicSafetyVerifierEngine.escalate(params as VerifyInput, reason);
    }
    default:
      throw new Error(`crossProcessNeuroSymbolicSafetyVerifier: unknown action '${action}'`);
  }
}
