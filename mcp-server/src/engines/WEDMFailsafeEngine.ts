/**
 * WEDMFailsafeEngine — WEDM AGI Phase 4 / P4-MS2 / U-P4-06.
 *
 * Graceful-degradation orchestrator. Given a critical trigger from one
 * of the three safety-detection layers —
 *
 *   - `WEDMHeadClearanceEngine`      (collision / clearance breach)
 *   - `WEDMSafetyEnvelopeEngine`     (envelope breach)
 *   - `WEDMExceptionHandlerEngine`   (process exception, terminal ladder)
 *
 * — this engine decides the correct failsafe response as a three-tier
 * ladder:
 *
 *   ┌────────┬────────────────────────────────────────────────────────┐
 *   │ Tier   │ Actions                                                │
 *   ├────────┼────────────────────────────────────────────────────────┤
 *   │ SOFT   │ Hold feed, keep dielectric flow, keep wire tensioned.  │
 *   │        │ No motion. Used for "recoverable pause" scenarios.     │
 *   ├────────┼────────────────────────────────────────────────────────┤
 *   │ RETRACT│ SOFT + retract wire to Z_safe and break contact. Used  │
 *   │        │ when geometry is suspect (collision near part / fix).  │
 *   ├────────┼────────────────────────────────────────────────────────┤
 *   │ HARD   │ RETRACT + kill discharge circuit + park axes + drop    │
 *   │        │ tank. Used for emergency-stop-class events.            │
 *   └────────┴────────────────────────────────────────────────────────┘
 *
 * The engine returns a `FailsafePlan` — a declarative description of the
 * steps + follow-through (autonomy degrade target, handoff escalation
 * details). The caller (usually a higher-level dispatcher) is responsible
 * for executing each step and confirming each one before advancing.
 *
 * Decoupling rationale: keep the engine pure and testable. Side effects
 * (calling `wedmAutonomyEngine.degrade()`, pushing to the handoff queue,
 * talking to the machine bus) are the caller's job.
 *
 * Composes with:
 *   - WEDMHeadClearanceEngine    — `ClearanceReport` → RETRACT-class plan
 *   - WEDMSafetyEnvelopeEngine   — `EnvelopeReport`  → SOFT/HARD-class plan
 *   - WEDMExceptionHandlerEngine — `RecoveryPlan`    → SOFT–HARD per directive
 *   - WEDMAutonomyEngine         — degrade target (L0 for HARD, L1 for SOFT)
 *   - WEDMHumanHandoffEngine     — escalation follow-up
 *
 * @module engines/WEDMFailsafeEngine
 */

import type { ClearanceReport } from "./WEDMHeadClearanceEngine.js";
import type {
  EnvelopeReport,
  EnvelopeViolation,
} from "./WEDMSafetyEnvelopeEngine.js";
import type {
  RecoveryPlan,
  WEDMExceptionType,
} from "./WEDMExceptionHandlerEngine.js";
import type { AutonomyLevel } from "./WEDMAutonomyEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type FailsafeTier = "soft" | "retract" | "hard";

export type FailsafeTrigger =
  | "collision"
  | "envelope_breach"
  | "process_exception"
  | "manual";

export type FailsafeStep =
  | "hold_feed"
  | "maintain_dielectric"
  | "keep_wire_tension"
  | "retract_wire_to_safe_Z"
  | "break_wire_contact"
  | "kill_discharge_circuit"
  | "park_axes"
  | "drop_tank";

export interface FailsafePlan {
  tier: FailsafeTier;
  trigger: FailsafeTrigger;
  /** Ordered list of low-level actions the caller should perform. */
  steps: FailsafeStep[];
  /** Target autonomy level after plan applies (usually 0 for hard, 1 for soft). */
  degradeTo: AutonomyLevel;
  /** Whether to open a handoff packet. Always true for HARD; conditional for SOFT. */
  escalate: boolean;
  /** Exception type to surface on the handoff (if escalate=true). */
  exceptionType?: WEDMExceptionType;
  /** One-line summary for logs / operator UI. */
  summary: string;
  /** Optional structured context (violation set, clearance events, …). */
  context: Record<string, unknown>;
}

// ============================================================================
// STEP LADDERS
// ============================================================================

const SOFT_STEPS: FailsafeStep[] = [
  "hold_feed",
  "maintain_dielectric",
  "keep_wire_tension",
];

const RETRACT_STEPS: FailsafeStep[] = [
  ...SOFT_STEPS,
  "retract_wire_to_safe_Z",
  "break_wire_contact",
];

const HARD_STEPS: FailsafeStep[] = [
  ...RETRACT_STEPS,
  "kill_discharge_circuit",
  "park_axes",
  "drop_tank",
];

export const STEP_LADDERS: Record<FailsafeTier, FailsafeStep[]> = {
  soft: [...SOFT_STEPS],
  retract: [...RETRACT_STEPS],
  hard: [...HARD_STEPS],
};

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMFailsafeEngine {
  /**
   * Build a failsafe plan for a real-time clearance breach. Any critical
   * collision event drops to HARD (geometry is suspect); warning-only
   * reports produce RETRACT (pull out, reassess).
   */
  planFromClearance(report: ClearanceReport): FailsafePlan {
    const critical = report.events.filter((e) => e.severity === "critical");
    const tier: FailsafeTier = critical.length > 0 ? "hard" : "retract";
    const summary =
      critical.length > 0
        ? `critical clearance breach: ${critical.map((e) => e.kind).join(", ")}`
        : "near-miss clearance: retract to reassess";
    return {
      tier,
      trigger: "collision",
      steps: [...STEP_LADDERS[tier]],
      degradeTo: tier === "hard" ? 0 : 1,
      escalate: true,
      exceptionType: "axis_overrun",
      summary,
      context: {
        minClearance_mm: report.minClearance_mm,
        events: report.events,
      },
    };
  }

  /**
   * Build a failsafe plan for an envelope breach. Criticals map to HARD
   * (tank empty, wire breaks exceeded, etc.) and warnings trigger SOFT
   * (operator should see a heads-up before the envelope actually trips).
   */
  planFromEnvelope(report: EnvelopeReport): FailsafePlan {
    const criticals = report.violations.filter((v) => v.severity === "critical");
    const tier: FailsafeTier = criticals.length > 0 ? "hard" : "soft";
    const exceptionType = criticals.length > 0 ? mapEnvelopeException(criticals[0]) : undefined;
    const summary =
      criticals.length > 0
        ? `critical envelope breach: ${criticals.map((v) => v.param).join(", ")}`
        : `envelope warning on ${report.violations.map((v) => v.param).join(", ")}`;
    return {
      tier,
      trigger: "envelope_breach",
      steps: [...STEP_LADDERS[tier]],
      degradeTo: tier === "hard" ? 0 : 1,
      escalate: tier === "hard",
      exceptionType,
      summary,
      context: { violations: report.violations, envelopeId: report.envelopeId },
    };
  }

  /**
   * Build a failsafe plan from a `RecoveryPlan` emitted by
   * `WEDMExceptionHandlerEngine`. Map directive → tier:
   *   auto_retry       → soft  (operator doesn't need to know; engine retries)
   *   auto_back_off    → soft  (parameter backoff; keep running)
   *   human_escalate   → retract (pull out, get a human)
   *   emergency_stop   → hard
   */
  planFromException(plan: RecoveryPlan): FailsafePlan {
    const tier: FailsafeTier = directiveToTier(plan.directive);
    const degradeTo: AutonomyLevel = tier === "hard" ? 0 : tier === "retract" ? 1 : 2;
    const escalate = tier !== "soft";
    return {
      tier,
      trigger: "process_exception",
      steps: [...STEP_LADDERS[tier]],
      degradeTo,
      escalate,
      exceptionType: plan.type,
      summary: `exception ${plan.type} (${plan.occurrence}×) → ${plan.directive}`,
      context: { plan },
    };
  }

  /** Direct manual / operator-initiated failsafe. */
  planManual(
    tier: FailsafeTier = "hard",
    reason = "operator-initiated failsafe",
  ): FailsafePlan {
    return {
      tier,
      trigger: "manual",
      steps: [...STEP_LADDERS[tier]],
      degradeTo: tier === "hard" ? 0 : tier === "retract" ? 1 : 2,
      escalate: tier !== "soft",
      summary: reason,
      context: {},
    };
  }

  /**
   * Combine multiple plans (e.g. simultaneous collision + envelope breach)
   * — keep the *highest* tier, merge step lists, union the escalation and
   * degrade targets. Useful when several detectors trip in the same tick.
   */
  merge(plans: FailsafePlan[]): FailsafePlan {
    if (plans.length === 0) {
      throw new Error("WEDMFailsafeEngine.merge: at least one plan required");
    }
    const tierOrder: Record<FailsafeTier, number> = { soft: 0, retract: 1, hard: 2 };
    let worst = plans[0];
    for (const p of plans) {
      if (tierOrder[p.tier] > tierOrder[worst.tier]) worst = p;
    }
    const degradeTo = plans.reduce<AutonomyLevel>(
      (lo, p) => (p.degradeTo < lo ? p.degradeTo : lo),
      5 as AutonomyLevel,
    );
    return {
      tier: worst.tier,
      trigger: worst.trigger,
      steps: [...STEP_LADDERS[worst.tier]],
      degradeTo,
      escalate: plans.some((p) => p.escalate),
      exceptionType: worst.exceptionType,
      summary: `merged ${plans.length} failsafes → ${worst.tier}`,
      context: { plans },
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function directiveToTier(directive: RecoveryPlan["directive"]): FailsafeTier {
  switch (directive) {
    case "auto_retry":
    case "auto_back_off":
      return "soft";
    case "human_escalate":
      return "retract";
    case "emergency_stop":
      return "hard";
  }
}

function mapEnvelopeException(v: EnvelopeViolation): WEDMExceptionType | undefined {
  switch (v.param) {
    case "wire_tension_gf":
      return "wire_tension_out";
    case "gap_V":
      return v.edge === "low" ? "short_circuit" : "open_circuit";
    case "resistivity_Mohm_cm":
      return v.edge === "low" ? "resistivity_low" : "resistivity_high";
    case "tank_level_pct":
      return "tank_low";
    case "X_mm":
    case "Y_mm":
    case "U_mm":
    case "V_mm":
    case "Z_upper_mm":
    case "Z_lower_mm":
      return "axis_overrun";
    case "wire_breaks_in_window":
      return "wire_break";
    default:
      return undefined;
  }
}

/** Shared singleton. */
export const wedmFailsafeEngine = new WEDMFailsafeEngine();
