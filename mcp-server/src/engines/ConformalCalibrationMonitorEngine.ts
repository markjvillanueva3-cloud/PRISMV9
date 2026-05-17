/**
 * ConformalCalibrationMonitorEngine — XPROC-NEURAL Tier 5 (T5-04b)
 *
 * Closes the loop on the split-conformal classifier shipped at fd519f1ab
 * (U-NN-CONFORMAL01). The marginal-coverage guarantee
 *   P(Y ∈ S(X)) ≥ 1 − α
 * holds only when (X, Y) is drawn exchangeably with the calibration set.
 * In production the underlying classifier's distribution drifts (new
 * materials, new machines, season-of-year operator habits) and the
 * exchangeability assumption fails — the empirical coverage rate drops
 * below 1−α and the prediction sets stop being trustworthy.
 *
 * This engine is the rolling-empirical-coverage monitor that detects
 * exactly that. Pure aggregator over caller-supplied (predictedSet,
 * actualLabel) observations. Reports both the rolling coverage rate and
 * a drift signal that downstream consumers (operator dashboards, the
 * P2P pipeline's safety gate) react to.
 *
 * References:
 *   - Vovk, Gammerman, Shafer (2005). Algorithmic Learning in a Random
 *     World. Springer.
 *   - Tibshirani, Foygel Barber, Candes, Ramdas (2019). "Conformal
 *     Prediction Under Covariate Shift." NeurIPS. (formal treatment of
 *     the failure mode this monitor catches)
 *   - Gibbs, Candes (2021). "Adaptive Conformal Inference Under
 *     Distribution Shift." NeurIPS. (online α-adjustment that uses an
 *     empirical-coverage signal exactly like the one we emit here)
 *
 * Algorithm (split / rolling):
 *   1. Caller streams observations via record({predictedSet, actualLabel}).
 *   2. Each observation is binned into a fixed-size ring buffer
 *      (windowSize, default 200). Older obs ring out.
 *   3. Empirical coverage = #{obs : actualLabel ∈ obs.predictedSet} / N.
 *   4. Drift triggered when, for K consecutive observations after the
 *      buffer is full, the empirical coverage stays below
 *      (1 − α − driftTolerance). Default K=20, default tolerance=0.05.
 *      The K-consecutive gate prevents single-noise-blip false positives.
 *   5. status() reports {covered, total, empiricalCoverage, drifting,
 *      consecutiveBelow, alpha, driftTolerance}.
 *
 * Why a ring buffer + consecutive-below counter (not a simple ratio):
 *   The marginal guarantee is in expectation; finite-sample empirical
 *   rates wobble naturally. A binomial 95% CI at N=200, p=0.9 is
 *   ±0.042 wide. Single-window ratio comparison would false-trigger
 *   in roughly 5% of stationary windows. The K-consecutive gate
 *   collapses that probability multiplicatively to (0.05)^K — at K=20,
 *   <1e-26 false-positive rate while still catching real drift in <K+
 *   buffer-fill observations.
 *
 * Architecture decision — pure aggregator, NO predictor coupling:
 *   The engine accepts observations from any source. It does not call
 *   the conformal classifier or know its internal q̂. This means:
 *     1. Composable with split-conformal LAC (U-NN-CONFORMAL01) AND with
 *        the regression conformal engine — same coverage-rate signal
 *        applies.
 *     2. Decouples the "did we cover this case?" measurement from the
 *        prediction-set computation, so an evaluator can re-run history
 *        with a different α or against a different predictor without
 *        polluting the live prediction-set engine.
 *     3. Subscriber to the FeedbackBus — wires into the closed loop the
 *        Phase 3 LOOPxx units already built without modifying any
 *        peer-claimed file.
 *
 * Failure modes covered:
 *   1. Empty predictedSet            → invalid_input
 *   2. NaN/Inf or non-integer label  → invalid_input
 *   3. Negative label                → invalid_input
 *   4. windowSize < MIN_WINDOW       → invalid_input
 *   5. α outside (0, 1)              → invalid_input
 *   6. driftTolerance < 0 or ≥ 1     → invalid_input
 *   7. consecutiveK < 1              → invalid_input
 *   8. status() before any observation → returns zero-cov honest snapshot
 *      (drifting=false, total=0) rather than throw — caller decides
 *
 * @module ConformalCalibrationMonitorEngine
 */

import { z } from "zod";

import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";

/** Bus topic the monitor subscribes to. NN-STACK-INTEG-MS0/U-NN-INTEG-04. */
const OUTCOME_COMPLETED_TOPIC = "outcome.completed";

// ============================================================================
// Constants
// ============================================================================

/** Default rolling-window size for empirical coverage. 200 keeps the
 *  binomial CI wide enough that single-blip noise doesn't cross the
 *  drift threshold yet narrow enough that real drift is detected in
 *  < 1 minute of normal operation (typical job rate). */
const DEFAULT_WINDOW_SIZE = 200;
/** Floor on window size — below this the empirical coverage estimate is
 *  too noisy for the drift signal to mean anything. */
const MIN_WINDOW_SIZE = 20;
/** Hard cap to bound memory + per-record cost. */
const MAX_WINDOW_SIZE = 100_000;

/** Default miscoverage rate α. 0.1 = 90% target coverage — matches the
 *  CrossProcessConformalClassificationEngine default. */
const DEFAULT_ALPHA = 0.1;

/** Default drift tolerance. Empirical coverage must stay below
 *  (1 − α − tol) for K consecutive observations to count as drift. */
const DEFAULT_DRIFT_TOLERANCE = 0.05;

/** Default consecutive-below count required to flip the drift bit.
 *  See the algorithm comment in the engine header for why this matters. */
const DEFAULT_CONSECUTIVE_K = 20;

// ============================================================================
// Schemas
// ============================================================================

const ConfigureInputSchema = z.object({
  windowSize: z.number().int().min(MIN_WINDOW_SIZE).max(MAX_WINDOW_SIZE).optional(),
  alpha: z.number().gt(0).lt(1).optional(),
  driftTolerance: z.number().min(0).lt(1).optional(),
  consecutiveK: z.number().int().min(1).optional(),
});

const RecordInputSchema = z.object({
  /** Class labels in the prediction set returned by the conformal classifier. */
  predictedSet: z.array(z.number().int().nonnegative()).min(1),
  /** The ground-truth class label observed after the prediction. */
  actualLabel: z.number().int().nonnegative(),
});

// ============================================================================
// Public types
// ============================================================================

export interface MonitorConfig {
  windowSize: number;
  alpha: number;
  driftTolerance: number;
  consecutiveK: number;
}

export interface MonitorStatus {
  /** Number of observations in the rolling window (≤ windowSize). */
  total: number;
  /** How many of the in-window observations were covered. */
  covered: number;
  /** covered / total — 0 when total === 0. */
  empiricalCoverage: number;
  /** Configured 1 − α target coverage. */
  targetCoverage: number;
  /** Below-target run length — count of consecutive recent observations
   *  for which the empirical coverage stayed below target − tolerance. */
  consecutiveBelow: number;
  /** True iff consecutiveBelow >= configured consecutiveK and the buffer
   *  is full enough to be informative (total === windowSize). */
  drifting: boolean;
  /** Total observations ever recorded (lifetime — informative even after
   *  ring-out past the windowSize). */
  totalRecorded: number;
  /** Active config snapshot. */
  config: MonitorConfig;
}

export interface ConfigureOk {
  ok: true;
  config: MonitorConfig;
  reset: boolean;
}

export interface RecordOk {
  ok: true;
  /** Whether this observation was inside its predicted set. */
  covered: boolean;
  /** Status snapshot after this record. */
  status: MonitorStatus;
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type ConfigureResult = ConfigureOk | OpErr;
export type RecordResult = RecordOk | OpErr;

// ============================================================================
// Engine state (module-private — pure, no I/O)
// ============================================================================

interface RingObservation {
  /** 1 if covered, 0 if missed. Compact flag — we don't need the full set. */
  covered: 0 | 1;
}

interface EngineState {
  config: MonitorConfig;
  /** Ring buffer holding the last `windowSize` observations. Length ≤ size. */
  ring: RingObservation[];
  /** Index where the next observation will be written (mod windowSize). */
  ringHead: number;
  /** Running count of covered=1 observations currently in `ring`. */
  coveredInWindow: number;
  /** Lifetime record count (independent of ring rotation). */
  totalRecorded: number;
  /** Run length of recent observations whose empirical coverage was
   *  below the drift threshold. Reset to 0 the moment a window goes
   *  back above target. */
  consecutiveBelow: number;
}

function freshState(config?: Partial<MonitorConfig>): EngineState {
  return {
    config: {
      windowSize: config?.windowSize ?? DEFAULT_WINDOW_SIZE,
      alpha: config?.alpha ?? DEFAULT_ALPHA,
      driftTolerance: config?.driftTolerance ?? DEFAULT_DRIFT_TOLERANCE,
      consecutiveK: config?.consecutiveK ?? DEFAULT_CONSECUTIVE_K,
    },
    ring: [],
    ringHead: 0,
    coveredInWindow: 0,
    totalRecorded: 0,
    consecutiveBelow: 0,
  };
}

let state: EngineState = freshState();

function snapshotStatus(): MonitorStatus {
  const total = state.ring.length;
  const covered = state.coveredInWindow;
  const empirical = total === 0 ? 0 : covered / total;
  const target = 1 - state.config.alpha;
  const drifting =
    total === state.config.windowSize &&
    state.consecutiveBelow >= state.config.consecutiveK;
  return {
    total,
    covered,
    empiricalCoverage: empirical,
    targetCoverage: target,
    consecutiveBelow: state.consecutiveBelow,
    drifting,
    totalRecorded: state.totalRecorded,
    config: { ...state.config },
  };
}

// ============================================================================
// Engine API
// ============================================================================

/**
 * ConformalCalibrationMonitorEngine — rolling empirical coverage tracker
 * + drift detector for split-conformal predictors.
 */
export class ConformalCalibrationMonitorEngine {
  /**
   * Active subscription to `outcome.completed`. null = not subscribed.
   * Singleton — every call to subscribeToOutcomes() is idempotent.
   * NN-STACK-INTEG-MS0/U-NN-INTEG-04.
   */
  private static subscription: SubscriptionHandle | null = null;
  private static totalOutcomeEvents = 0;
  private static totalConformalDecoded = 0;
  private static totalNonConformalSkipped = 0;

  /**
   * Subscribe to the feedback-bus `outcome.completed` topic. Idempotent —
   * a second call returns alreadySubscribed=true and leaves the existing
   * subscription in place.
   *
   * The handler tolerates non-conformal outcome events (the topic carries
   * outcomes from all bridges, not just classification ones). An event
   * counts as "conformal" only when the payload carries BOTH a
   * `predictedSet: number[]` (≥1 class label) AND an integer `actualLabel`
   * at one of the documented locations:
   *
   *   - event.payload.predictedSet + event.payload.actualLabel
   *   - event.payload.record.outcome.predictedSet + ...actualLabel
   *
   * Non-conformal events are silently counted and skipped — there is no
   * throw, no record-with-zero-fields, no log spam.
   */
  static subscribeToOutcomes(): { ok: true; alreadySubscribed: boolean } {
    if (this.subscription !== null) {
      return { ok: true, alreadySubscribed: true };
    }
    this.subscription = feedbackBusEngine.subscribe(
      OUTCOME_COMPLETED_TOPIC,
      (event: FeedbackEvent) => {
        try {
          this.handleOutcomeCompleted(event);
        } catch {
          // Defense in depth — handler never throws, but a future schema
          // change in the payload shape could surprise the decoder. Silent
          // skip preserves the marginal-coverage guarantee on the events
          // we DO understand.
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

  /** Is the monitor currently wired to outcome.completed? */
  static isSubscribedToOutcomes(): boolean {
    return this.subscription !== null;
  }

  /** Bus event counters — for telemetry / dashboard rendering. */
  static busStats(): {
    subscribed: boolean;
    total_outcome_events: number;
    total_conformal_decoded: number;
    total_non_conformal_skipped: number;
  } {
    return {
      subscribed: this.subscription !== null,
      total_outcome_events: this.totalOutcomeEvents,
      total_conformal_decoded: this.totalConformalDecoded,
      total_non_conformal_skipped: this.totalNonConformalSkipped,
    };
  }

  /**
   * Decode an outcome.completed event and, if the payload carries the
   * conformal shape, drive a record() call. Pure — no I/O, no throws
   * (caller wraps in try/catch as defense in depth). Hostile-payload
   * guards: every field is type-checked before use.
   */
  private static handleOutcomeCompleted(event: FeedbackEvent): void {
    this.totalOutcomeEvents += 1;
    if (!event || typeof event !== "object" || event.payload == null) {
      this.totalNonConformalSkipped += 1;
      return;
    }
    const p = event.payload as Record<string, unknown>;
    const nested =
      p.record && typeof p.record === "object"
        ? ((p.record as Record<string, unknown>).outcome as Record<string, unknown> | undefined)
        : undefined;
    const predictedSet = this.coercePredictedSet(p.predictedSet ?? nested?.predictedSet);
    const actualLabel = this.coerceActualLabel(p.actualLabel ?? nested?.actualLabel);
    if (predictedSet === null || actualLabel === null) {
      this.totalNonConformalSkipped += 1;
      return;
    }
    const result = this.record({ predictedSet, actualLabel });
    if (result.ok) {
      this.totalConformalDecoded += 1;
    } else {
      // Validation failed (e.g. an obviously malformed payload that still
      // looked conformal-shaped). Count as skip so dashboards don't read
      // it as a successful decode.
      this.totalNonConformalSkipped += 1;
    }
  }

  /** Type-coerce a payload field to `number[]` or null. */
  private static coercePredictedSet(value: unknown): number[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    const out: number[] = [];
    for (const v of value) {
      if (!Number.isInteger(v) || (v as number) < 0) return null;
      out.push(v as number);
    }
    return out;
  }

  /** Type-coerce a payload field to a non-negative integer or null. */
  private static coerceActualLabel(value: unknown): number | null {
    return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;
  }

  /**
   * Configure the monitor. Any unspecified field keeps its current value;
   * any windowSize change clears the ring (the previous ring is sized to
   * the old window and would corrupt the rolling math otherwise).
   *
   * @returns ConfigureOk with the merged config + a reset flag indicating
   *   whether the ring was wiped. OpErr on invalid input.
   */
  static configure(input: unknown): ConfigureResult {
    const parsed = ConfigureInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `configure: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const next: MonitorConfig = { ...state.config };
    if (parsed.data.windowSize !== undefined) next.windowSize = parsed.data.windowSize;
    if (parsed.data.alpha !== undefined) next.alpha = parsed.data.alpha;
    if (parsed.data.driftTolerance !== undefined) next.driftTolerance = parsed.data.driftTolerance;
    if (parsed.data.consecutiveK !== undefined) next.consecutiveK = parsed.data.consecutiveK;
    const sizeChanged = next.windowSize !== state.config.windowSize;
    if (sizeChanged) {
      state = freshState(next);
    } else {
      state.config = next;
    }
    return { ok: true, config: { ...state.config }, reset: sizeChanged };
  }

  /**
   * Record a single observation. Updates the ring, the rolling covered
   * count, and the consecutive-below run length. Returns whether the
   * observation was covered + the post-record status snapshot.
   */
  static record(input: unknown): RecordResult {
    const parsed = RecordInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `record: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const { predictedSet, actualLabel } = parsed.data;
    const covered = predictedSet.includes(actualLabel) ? 1 : 0;

    // Ring-buffer maintenance with O(1) covered-count update.
    if (state.ring.length < state.config.windowSize) {
      state.ring.push({ covered });
    } else {
      const evicted = state.ring[state.ringHead];
      state.coveredInWindow -= evicted.covered;
      state.ring[state.ringHead] = { covered };
    }
    state.coveredInWindow += covered;
    state.ringHead = (state.ringHead + 1) % state.config.windowSize;
    state.totalRecorded += 1;

    // Update the consecutive-below counter — only meaningful once the
    // buffer is full; before then the rolling estimate has too few
    // samples for the drift threshold to be honest.
    if (state.ring.length === state.config.windowSize) {
      const empirical = state.coveredInWindow / state.config.windowSize;
      const threshold = 1 - state.config.alpha - state.config.driftTolerance;
      if (empirical < threshold) {
        state.consecutiveBelow += 1;
      } else {
        state.consecutiveBelow = 0;
      }
    }

    return {
      ok: true,
      covered: covered === 1,
      status: snapshotStatus(),
    };
  }

  /** Read the current rolling status (no mutation). */
  static status(): MonitorStatus {
    return snapshotStatus();
  }

  /** Wipe the ring + counters; keeps the current config. */
  static reset(): void {
    state = freshState(state.config);
  }

  /** Read-only constants snapshot. */
  static constants(): {
    DEFAULT_WINDOW_SIZE: number;
    MIN_WINDOW_SIZE: number;
    MAX_WINDOW_SIZE: number;
    DEFAULT_ALPHA: number;
    DEFAULT_DRIFT_TOLERANCE: number;
    DEFAULT_CONSECUTIVE_K: number;
  } {
    return {
      DEFAULT_WINDOW_SIZE,
      MIN_WINDOW_SIZE,
      MAX_WINDOW_SIZE,
      DEFAULT_ALPHA,
      DEFAULT_DRIFT_TOLERANCE,
      DEFAULT_CONSECUTIVE_K,
    };
  }
}

export const conformalCalibrationMonitorEngine = ConformalCalibrationMonitorEngine;

/** Dispatcher convenience wrapper. */
export function conformalCalibrationMonitor(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_calibration_monitor_configure":
      return ConformalCalibrationMonitorEngine.configure(params);
    case "xproc_calibration_monitor_record":
      return ConformalCalibrationMonitorEngine.record(params);
    case "xproc_calibration_monitor_status":
      return ConformalCalibrationMonitorEngine.status();
    case "xproc_calibration_monitor_reset":
      ConformalCalibrationMonitorEngine.reset();
      return { ok: true };
    case "xproc_calibration_monitor_constants":
      return ConformalCalibrationMonitorEngine.constants();
    default:
      throw new Error(`conformalCalibrationMonitor: unknown action '${action}'`);
  }
}
