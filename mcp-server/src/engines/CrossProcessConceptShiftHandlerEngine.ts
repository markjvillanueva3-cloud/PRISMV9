/**
 * CrossProcessConceptShiftHandlerEngine — XPROC-NEURAL Tier 3 (T3-03)
 *
 * Recovery decision tree: when T3-02 (DriftDetector) fires, this engine
 * picks the correct response strategy from {warm_restart, full_retrain,
 * transfer_from_sister, no_op}. Encodes the policy from
 * XPROC-NEURAL-ROADMAP.md Tier 3 R3:
 *
 *   drift_severity = drift_confidence × magnitude_factor
 *
 *   ≤ DRIFT_SEVERITY_LOW    → warm_restart  (T3-01 streaming Adam steps)
 *   ≤ DRIFT_SEVERITY_HIGH   → transfer_from_sister  (T1-03 transfer learning)
 *   > DRIFT_SEVERITY_HIGH   → full_retrain  (T1-02 batch fit on full ledger)
 *
 * The "magnitude factor" is the absolute deviation between current error
 * rate and the locked DDM p_min, normalized to [0, 1]. So a small drift in
 * confidence (e.g. 1 of 3 detectors warning) on a stream that barely shifted
 * (5% → 7%) gives severity ≈ 0.05 → warm_restart. A high-confidence drift
 * on a major shift (5% → 50%) gives severity ≈ 0.45 → full_retrain.
 *
 * Why a separate engine vs. inlining the if/else:
 *   - The decision is policy, not algorithm. T3-02 detects, T3-03 decides.
 *     Splitting them lets us A/B-test policy revisions without touching
 *     the detector implementation.
 *   - T3-04 (EWC) wraps warm_restart with Fisher regularization; isolating
 *     the routing keeps that composition clean.
 *   - The decision needs to be loggable + reviewable (governance), so
 *     emitting a structured RecoveryDecision with rationale is the right
 *     interface.
 *
 * Failure modes covered:
 *   1. Empty / null drift report → no_op decision with warning
 *   2. driftConfidence outside [0, 1] → invalid_input
 *   3. magnitude < 0 or > 1 → clamped, warning
 *   4. recommendedAction "none" → always no_op (override the severity calc)
 *   5. magnitude not provided → severity = driftConfidence (caller's only
 *      signal); decision still made
 *   6. Sister-process unavailable for transfer → caller must check
 *      `feasibilityHint` and may downgrade to full_retrain
 *   7. Cooldown period after recent decision → enforced via lastDecidedAt
 *      check (prevents thrashing on flapping detectors)
 *
 * Acceptance (per XPROC-NEURAL-ROADMAP.md Tier 3 R3):
 *   chooses warm-restart for ≤5% drift severity, full-retrain for ≥20%.
 *
 * @module CrossProcessConceptShiftHandlerEngine
 */

import { z } from "zod";

// ============================================================================
// Constants — drift severity policy thresholds
// ============================================================================

/** ≤ 5% drift severity → warm-restart (cheap online update). */
const DRIFT_SEVERITY_LOW = 0.05;

/** ≤ 20% drift severity → transfer from sister-process if available. */
const DRIFT_SEVERITY_HIGH = 0.20;

/** Cooldown to prevent decision thrashing on flapping detectors. */
const DECISION_COOLDOWN_MS = 60_000;  // 1 minute default

/** Default magnitude when caller doesn't supply one — pure-confidence mode. */
const DEFAULT_MAGNITUDE = 1.0;

// ============================================================================
// Schemas
// ============================================================================

const DriftReportInputSchema = z.object({
  driftConfidence: z.number().min(0).max(1),
  recommendedAction: z.enum(["none", "alert", "retrain"]),
  magnitudeAbsDeviation: z.number().min(0).max(1).optional(),
  sisterProcessAvailable: z.boolean().default(true),
  cooldownMs: z.number().int().nonnegative().default(DECISION_COOLDOWN_MS),
  nowMs: z.number().int().nonnegative().optional(),  // testable clock
});

// ============================================================================
// Public types
// ============================================================================

export type RecoveryStrategy = "no_op" | "warm_restart" | "transfer_from_sister" | "full_retrain";

export interface RecoveryDecision {
  strategy: RecoveryStrategy;
  severity: number;            // [0, 1]
  rationale: string;
  feasibilityHint?: string;    // e.g. "sister unavailable, downgraded"
  cooldownActive: boolean;
  cooldownRemainingMs: number;
  decidedAtMs: number;
}

export interface DecideResultOk {
  ok: true;
  decision: RecoveryDecision;
  warnings: string[];
}

export interface DecideResultErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type DecideResult = DecideResultOk | DecideResultErr;

// ============================================================================
// Engine state (cooldown tracking)
// ============================================================================

interface EngineState {
  lastDecidedAtMs: number;
  lastStrategy: RecoveryStrategy;
  decisionHistory: RecoveryDecision[];
}

function freshState(): EngineState {
  return { lastDecidedAtMs: 0, lastStrategy: "no_op", decisionHistory: [] };
}

let state: EngineState = freshState();

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessConceptShiftHandlerEngine {
  static readonly tier = "T3-03";

  /**
   * Decide recovery strategy from a drift report. Pure function modulo
   * cooldown state. Records decision in history (capped 1000).
   */
  static decide(input: unknown): DecideResult {
    const parsed = DriftReportInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { driftConfidence, recommendedAction, magnitudeAbsDeviation, sisterProcessAvailable, cooldownMs, nowMs } =
      parsed.data;
    const now = nowMs ?? Date.now();
    const warnings: string[] = [];

    // Cooldown check — prevent thrashing on flapping detectors
    const elapsedSinceLast = now - state.lastDecidedAtMs;
    const cooldownActive = state.lastDecidedAtMs > 0 && elapsedSinceLast < cooldownMs;
    const cooldownRemainingMs = cooldownActive ? cooldownMs - elapsedSinceLast : 0;

    if (cooldownActive) {
      const decision: RecoveryDecision = {
        strategy: "no_op",
        severity: 0,
        rationale: `cooldown active: ${cooldownRemainingMs}ms remaining since last ${state.lastStrategy} decision`,
        cooldownActive: true,
        cooldownRemainingMs,
        decidedAtMs: now,
      };
      state.decisionHistory.push(decision);
      if (state.decisionHistory.length > 1000) state.decisionHistory.shift();
      return { ok: true, decision, warnings };
    }

    // recommendedAction "none" overrides severity calc — never recover when
    // the detector says no recovery needed
    if (recommendedAction === "none") {
      const decision: RecoveryDecision = {
        strategy: "no_op",
        severity: 0,
        rationale: "drift detector reported no_change",
        cooldownActive: false,
        cooldownRemainingMs: 0,
        decidedAtMs: now,
      };
      state.decisionHistory.push(decision);
      return { ok: true, decision, warnings };
    }

    // Severity = confidence × magnitude
    const magnitude = magnitudeAbsDeviation ?? DEFAULT_MAGNITUDE;
    const severity = driftConfidence * magnitude;

    let strategy: RecoveryStrategy;
    let rationale: string;
    let feasibilityHint: string | undefined;

    if (severity <= DRIFT_SEVERITY_LOW) {
      strategy = "warm_restart";
      rationale = `severity ${severity.toFixed(3)} ≤ ${DRIFT_SEVERITY_LOW} → cheap online Adam update via T3-01`;
    } else if (severity <= DRIFT_SEVERITY_HIGH) {
      if (sisterProcessAvailable) {
        strategy = "transfer_from_sister";
        rationale = `severity ${severity.toFixed(3)} ∈ (${DRIFT_SEVERITY_LOW}, ${DRIFT_SEVERITY_HIGH}] → transfer from sister-process via T1-03`;
      } else {
        // Downgrade to full_retrain when sister unavailable — never silently
        // fail to recover
        strategy = "full_retrain";
        rationale = `severity ${severity.toFixed(3)} ∈ (${DRIFT_SEVERITY_LOW}, ${DRIFT_SEVERITY_HIGH}], sister unavailable → full_retrain fallback`;
        feasibilityHint = "sister_process_unavailable_downgraded_to_full_retrain";
        warnings.push("sister-process transfer unavailable; downgraded to full_retrain");
      }
    } else {
      strategy = "full_retrain";
      rationale = `severity ${severity.toFixed(3)} > ${DRIFT_SEVERITY_HIGH} → full T1-02 batch retrain`;
    }

    const decision: RecoveryDecision = {
      strategy,
      severity,
      rationale,
      ...(feasibilityHint !== undefined && { feasibilityHint }),
      cooldownActive: false,
      cooldownRemainingMs: 0,
      decidedAtMs: now,
    };

    state.lastDecidedAtMs = now;
    state.lastStrategy = strategy;
    state.decisionHistory.push(decision);
    if (state.decisionHistory.length > 1000) state.decisionHistory.shift();

    return { ok: true, decision, warnings };
  }

  /** Recent decision history (most recent first). */
  static history(limit?: number): RecoveryDecision[] {
    const reversed = [...state.decisionHistory].reverse();
    if (limit !== undefined && limit > 0) return reversed.slice(0, limit);
    return reversed;
  }

  /** Reset cooldown + history. Call after a successful retrain commits. */
  static reset(): void {
    state = freshState();
  }

  /** Read-only thresholds snapshot. */
  static constants(): {
    DRIFT_SEVERITY_LOW: number;
    DRIFT_SEVERITY_HIGH: number;
    DECISION_COOLDOWN_MS: number;
    DEFAULT_MAGNITUDE: number;
  } {
    return { DRIFT_SEVERITY_LOW, DRIFT_SEVERITY_HIGH, DECISION_COOLDOWN_MS, DEFAULT_MAGNITUDE };
  }
}

export const crossProcessConceptShiftHandlerEngine = CrossProcessConceptShiftHandlerEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessConceptShiftHandler(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_shift_decide":
      return CrossProcessConceptShiftHandlerEngine.decide(params);
    case "xproc_shift_history": {
      const lim = (params as { limit?: unknown }).limit;
      return CrossProcessConceptShiftHandlerEngine.history(typeof lim === "number" ? lim : undefined);
    }
    case "xproc_shift_reset":
      CrossProcessConceptShiftHandlerEngine.reset();
      return { ok: true };
    case "xproc_shift_constants":
      return CrossProcessConceptShiftHandlerEngine.constants();
    default:
      throw new Error(`crossProcessConceptShiftHandler: unknown action '${action}'`);
  }
}
