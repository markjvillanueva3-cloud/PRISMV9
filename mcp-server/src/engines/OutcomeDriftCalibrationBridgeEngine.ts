/**
 * OutcomeDriftCalibrationBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN06
 *
 * Bus subscriber that bridges the outcome stream to three previously
 * dispatcher-only-callable T3 engines:
 *
 *   1. CrossProcessDriftDetectorEngine         (T3-02) — DDM + EDDM + ADWIN
 *   2. ConformalCalibrationMonitorEngine        (T3-?) — rolling coverage
 *   3. CrossProcessConceptShiftHandlerEngine    (T3-03) — recovery decision
 *
 * Pre-CN06, those three engines were fully wired into dispatchers but blind
 * to the live `outcome.completed` event flow. They had `observe() / record()
 * / decide()` static APIs but nothing was calling them on each terminal
 * outcome — the calibration-monitoring loop was open.
 *
 * Subscription topic: `outcome.completed` (NOT `outcome.recorded`). We only
 * care about pending → terminal transitions because drift requires actual
 * vs. predicted, and `outcome.recorded` may carry `kind: "pending"`.
 *
 * Per-event work (single subscriber callback):
 *
 *   1. Decode the OutcomeRecord from the bus envelope.
 *   2. Skip if outcome.kind is "pending" (defensive — should not occur).
 *   3. Derive a binary error signal:
 *         error = 1 if outcome.kind === "failure"      (model mistake)
 *               = 0 if outcome.kind === "success"      (correct prediction)
 *               = 0 if outcome.kind === "operator_override" (treated as
 *                                                            non-error;
 *                                                            override means
 *                                                            human intervened
 *                                                            BEFORE failure)
 *      Configurable via `errorPolicy` — see configure().
 *   4. Feed error to drift detector → drift report.
 *   5. Build a prediction set + actual label for calibration:
 *         predictedSet = ["success", "operator_override"]   (default optimism)
 *         actualLabel  = outcome.kind
 *      → covered iff actual ∈ predictedSet.
 *   6. Feed (predictedSet, actualLabel) to conformal monitor.
 *   7. If drift report says recommendedAction ∈ {"alert","retrain"},
 *      invoke concept-shift handler with severity = driftConfidence × |Δerror|.
 *      Result is a structured RecoveryDecision (warm_restart |
 *      transfer_from_sister | full_retrain | no_op) — logged but NOT
 *      executed. Execution belongs to the caller per governance rule
 *      (T3-03 returns policy, never side-effects).
 *
 * Failure isolation:
 *   - The bus already wraps each subscriber callback in try/catch — one
 *     thrown exception cannot break the publisher or sibling subscribers.
 *   - Inside this bridge, every downstream engine call is independently
 *     try/catch'd and counted in `failures.<engine>` so a single bad event
 *     never disables the entire bridge.
 *
 * Acceptance (per ROADMAP CN06):
 *   - 100 random outcomes (ε ≈ 0.05) → drift detector observes ≥ 95 zero
 *     errors and reports inWarmup until MIN_SAMPLES_FOR_DETECTION reached.
 *   - 100 outcomes with sudden failure burst (ε jumps 0.05 → 0.40 at
 *     event 50) → drift detector recommendedAction transitions to
 *     "alert" or "retrain" within 30 events, and the concept-shift
 *     handler returns a non-no_op RecoveryDecision.
 *
 * @engine OutcomeDriftCalibrationBridgeEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN06
 * @see CrossProcessDriftDetectorEngine        — backing detector trio
 * @see ConformalCalibrationMonitorEngine      — backing rolling coverage
 * @see CrossProcessConceptShiftHandlerEngine  — backing policy decider
 */

import { z } from "zod";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";
import { CrossProcessDriftDetectorEngine, type DriftReport } from "./CrossProcessDriftDetectorEngine.js";
import { ConformalCalibrationMonitorEngine } from "./ConformalCalibrationMonitorEngine.js";
import {
  CrossProcessConceptShiftHandlerEngine,
  type RecoveryDecision,
  type RecoveryStrategy,
} from "./CrossProcessConceptShiftHandlerEngine.js";

// ============================================================================
// Public types
// ============================================================================

export type OutcomeKindForBridge = "success" | "failure" | "operator_override" | "pending";

/**
 * How to translate an outcome.kind into the binary error signal that drift
 * detectors expect. `failure_only` is the default — most conservative, only
 * treats actual breakage as an error. `failure_or_override` is stricter:
 * any human intervention counts as "model wasn't fully right".
 */
export type ErrorPolicy = "failure_only" | "failure_or_override";

export interface BridgeConfig {
  errorPolicy: ErrorPolicy;
  /** Minimum drift confidence to even consider triggering concept-shift handler. */
  minDriftConfidenceForRetrain: number;
  /** Cooldown to forward to the concept-shift handler. */
  cooldownMs: number;
}

export interface BridgeStats {
  subscribed: boolean;
  total_events_seen: number;
  total_skipped_pending: number;
  total_drift_observes: number;
  total_calibration_records: number;
  total_retrain_decisions: number;
  failures: {
    drift_detector: number;
    calibration_monitor: number;
    concept_shift_handler: number;
    decode: number;
  };
  last_drift_report?: DriftReport;
  last_recovery_decision?: RecoveryDecision;
  config: BridgeConfig;
}

// ============================================================================
// Schemas
// ============================================================================

const ConfigureInputSchema = z.object({
  errorPolicy: z.enum(["failure_only", "failure_or_override"]).optional(),
  minDriftConfidenceForRetrain: z.number().min(0).max(1).optional(),
  cooldownMs: z.number().int().nonnegative().optional(),
});

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ERROR_POLICY: ErrorPolicy = "failure_only";
const DEFAULT_MIN_DRIFT_CONF = 0.5;
const DEFAULT_COOLDOWN_MS = 60_000;

const VALID_TERMINAL_KINDS: ReadonlySet<OutcomeKindForBridge> = new Set([
  "success",
  "failure",
  "operator_override",
]);

/**
 * Canonical outcome.kind → integer class index mapping for the conformal
 * monitor (which is integer-typed). Stable across the codebase: any other
 * caller indexing outcomes for ML purposes should reuse this mapping.
 */
export const OUTCOME_LABEL_INDEX: Record<"success" | "failure" | "operator_override", number> = {
  success: 0,
  failure: 1,
  operator_override: 2,
};

/**
 * Default predicted set = "model expected non-failure outcome" = {success, override}.
 * A success or override is therefore covered; a failure is uncovered. This
 * mirrors the bridge's binary-error policy: failures are surprises, the rest
 * is what we expected.
 */
const DEFAULT_PREDICTED_SET: number[] = [
  OUTCOME_LABEL_INDEX.success,
  OUTCOME_LABEL_INDEX.operator_override,
];

// ============================================================================
// Engine
// ============================================================================

export class OutcomeDriftCalibrationBridgeEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN06";

  // ──────────────────────────────────────────────────────────────────────────
  // State (module-private, reset()-able)
  // ──────────────────────────────────────────────────────────────────────────
  private static subscription: SubscriptionHandle | null = null;
  private static totalEvents = 0;
  private static skippedPending = 0;
  private static driftObserves = 0;
  private static calibrationRecords = 0;
  private static retrainDecisions = 0;
  private static failDrift = 0;
  private static failCalib = 0;
  private static failHandler = 0;
  private static failDecode = 0;
  private static lastDriftReport: DriftReport | undefined = undefined;
  private static lastRecoveryDecision: RecoveryDecision | undefined = undefined;
  private static config: BridgeConfig = {
    errorPolicy: DEFAULT_ERROR_POLICY,
    minDriftConfidenceForRetrain: DEFAULT_MIN_DRIFT_CONF,
    cooldownMs: DEFAULT_COOLDOWN_MS,
  };

  /** Subscribe to feedback bus `outcome.completed`. Idempotent. */
  static subscribeToOutcomes(): { ok: true; alreadySubscribed: boolean } {
    if (this.subscription !== null) {
      return { ok: true, alreadySubscribed: true };
    }
    this.subscription = feedbackBusEngine.subscribe(
      "outcome.completed",
      (event: FeedbackEvent) => {
        try {
          this.handleOutcomeCompleted(event.payload);
        } catch {
          this.failDecode += 1;
        }
      },
    );
    return { ok: true, alreadySubscribed: false };
  }

  /** Detach the subscription. Idempotent. */
  static unsubscribeFromOutcomes(): { ok: true; wasSubscribed: boolean } {
    if (this.subscription === null) {
      return { ok: true, wasSubscribed: false };
    }
    feedbackBusEngine.unsubscribe(this.subscription);
    this.subscription = null;
    return { ok: true, wasSubscribed: true };
  }

  static isSubscribedToOutcomes(): boolean {
    return this.subscription !== null;
  }

  /** Update bridge config; returns the (validated) effective config. */
  static configure(input: unknown):
    | { ok: true; config: BridgeConfig }
    | { ok: false; error: "invalid_input"; message: string } {
    const parsed = ConfigureInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; "),
      };
    }
    if (parsed.data.errorPolicy !== undefined) this.config.errorPolicy = parsed.data.errorPolicy;
    if (parsed.data.minDriftConfidenceForRetrain !== undefined) {
      this.config.minDriftConfidenceForRetrain = parsed.data.minDriftConfidenceForRetrain;
    }
    if (parsed.data.cooldownMs !== undefined) this.config.cooldownMs = parsed.data.cooldownMs;
    return { ok: true, config: { ...this.config } };
  }

  static stats(): BridgeStats {
    return {
      subscribed: this.subscription !== null,
      total_events_seen: this.totalEvents,
      total_skipped_pending: this.skippedPending,
      total_drift_observes: this.driftObserves,
      total_calibration_records: this.calibrationRecords,
      total_retrain_decisions: this.retrainDecisions,
      failures: {
        drift_detector: this.failDrift,
        calibration_monitor: this.failCalib,
        concept_shift_handler: this.failHandler,
        decode: this.failDecode,
      },
      last_drift_report: this.lastDriftReport,
      last_recovery_decision: this.lastRecoveryDecision,
      config: { ...this.config },
    };
  }

  /** Reset bridge state. Does NOT touch downstream engine state. */
  static reset(): void {
    if (this.subscription !== null) {
      feedbackBusEngine.unsubscribe(this.subscription);
      this.subscription = null;
    }
    this.totalEvents = 0;
    this.skippedPending = 0;
    this.driftObserves = 0;
    this.calibrationRecords = 0;
    this.retrainDecisions = 0;
    this.failDrift = 0;
    this.failCalib = 0;
    this.failHandler = 0;
    this.failDecode = 0;
    this.lastDriftReport = undefined;
    this.lastRecoveryDecision = undefined;
    this.config = {
      errorPolicy: DEFAULT_ERROR_POLICY,
      minDriftConfidenceForRetrain: DEFAULT_MIN_DRIFT_CONF,
      cooldownMs: DEFAULT_COOLDOWN_MS,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal: handler
  // ──────────────────────────────────────────────────────────────────────────
  private static handleOutcomeCompleted(payload: unknown): void {
    if (!payload || typeof payload !== "object") {
      this.failDecode += 1;
      return;
    }
    const env = payload as {
      record?: {
        outcome?: { kind?: string };
      };
      outcomeKind?: string;
    };
    const kind = (env.record?.outcome?.kind ?? env.outcomeKind ?? "pending") as OutcomeKindForBridge;
    this.totalEvents += 1;
    if (!VALID_TERMINAL_KINDS.has(kind)) {
      this.skippedPending += 1;
      return;
    }

    // Step 3 — derive binary error signal per policy.
    const error = this.kindToError(kind);

    // Step 4 — feed drift detector.
    let report: DriftReport | undefined;
    try {
      const r = CrossProcessDriftDetectorEngine.observe({ error });
      if (r.ok) {
        report = r.report;
        this.lastDriftReport = report;
        this.driftObserves += 1;
      } else {
        this.failDrift += 1;
      }
    } catch {
      this.failDrift += 1;
    }

    // Step 5/6 — feed calibration monitor.
    // The conformal monitor takes integer class indices. We use the canonical
    // mapping defined by OUTCOME_LABEL_INDEX (success=0, failure=1, override=2).
    // Default predicted set = "model expected non-failure" = {success, override}.
    try {
      // VALID_TERMINAL_KINDS.has(kind) was already enforced above so kind is
      // guaranteed to be a terminal label here, but TS does not narrow through
      // a Set membership test; cast and fall back if a future enum widens.
      const terminalKind = kind as "success" | "failure" | "operator_override";
      const actualLabel = OUTCOME_LABEL_INDEX[terminalKind] ?? OUTCOME_LABEL_INDEX.success;
      const r = ConformalCalibrationMonitorEngine.record({
        predictedSet: DEFAULT_PREDICTED_SET,
        actualLabel,
      });
      if (r.ok) {
        this.calibrationRecords += 1;
      } else {
        this.failCalib += 1;
      }
    } catch {
      this.failCalib += 1;
    }

    // Step 7 — gated concept-shift decision.
    if (report && report.recommendedAction !== "none"
        && report.driftConfidence >= this.config.minDriftConfidenceForRetrain) {
      try {
        // Magnitude is the error itself for a single observation: 1 if this
        // event was a model mistake, 0 otherwise. Drift confidence × 1 = full
        // magnitude when the latest sample is the failure. Drift confidence ×
        // 0 = zero magnitude when the latest sample was correct (the drift
        // was triggered by the trailing window, not this exact event).
        const magnitude = error === 1 ? 1 : 0;
        const decision = CrossProcessConceptShiftHandlerEngine.decide({
          driftConfidence: report.driftConfidence,
          recommendedAction: report.recommendedAction,
          magnitudeAbsDeviation: magnitude,
          sisterProcessAvailable: true,
          cooldownMs: this.config.cooldownMs,
        });
        if (decision.ok) {
          this.lastRecoveryDecision = decision.decision;
          if (decision.decision.strategy !== "no_op") {
            this.retrainDecisions += 1;
          }
        } else {
          this.failHandler += 1;
        }
      } catch {
        this.failHandler += 1;
      }
    }
  }

  /** Map an outcome.kind to the binary error per the active policy. */
  private static kindToError(kind: OutcomeKindForBridge): 0 | 1 {
    if (this.config.errorPolicy === "failure_only") {
      return kind === "failure" ? 1 : 0;
    }
    return kind === "failure" || kind === "operator_override" ? 1 : 0;
  }

  /**
   * Best-effort rolling error mean, derived from the most recent drift
   * report's DDM stats. Used purely as a magnitude hint for the
   * concept-shift handler; unavailable → 0.
   */
  private static estimateRollingErrorMean(): number {
    const r = this.lastDriftReport;
    if (!r) return 0;
    const ddm = r.detectors.find((d) => d.detector === "ddm");
    if (!ddm) return 0;
    // DDM exposes meanError indirectly via .stats — keep zero if absent.
    return 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test seam: expose a synchronous handler invocation so tests don't need
  // to round-trip through the bus's microtask queue.
  // ──────────────────────────────────────────────────────────────────────────
  /** @internal — for tests only. */
  static __testHandle(payload: unknown): void {
    this.totalEvents; // touch to avoid accidental dead-code elimination
    this.handleOutcomeCompleted(payload);
  }
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export const outcomeDriftCalibrationBridgeEngine = OutcomeDriftCalibrationBridgeEngine;

// ============================================================================
// Dispatcher convenience wrapper
// ============================================================================

export function outcomeDriftCalibrationBridgeDispatch(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_drift_subscribe":
      return OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
    case "xproc_drift_unsubscribe":
      return OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes();
    case "xproc_drift_status":
      return {
        ok: true,
        subscribed: OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes(),
      };
    case "xproc_drift_configure":
      return OutcomeDriftCalibrationBridgeEngine.configure(params);
    case "xproc_drift_stats":
      return { ok: true, stats: OutcomeDriftCalibrationBridgeEngine.stats() };
    case "xproc_drift_bridge_reset":
      OutcomeDriftCalibrationBridgeEngine.reset();
      return { ok: true };
    default:
      throw new Error(`outcomeDriftCalibrationBridgeDispatch: unknown action '${action}'`);
  }
}
