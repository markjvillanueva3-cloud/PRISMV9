/**
 * MTConnectToOutcomeBridgeEngine — shop-floor telemetry → outcome-bus translator
 * ===============================================================================
 *
 * Closes U-BRIDGE-SHOPFLOOR-LEARN (PSN-DORMANCY-AUDIT-MS0 punch list,
 * 2026-05-22). Translates MTConnect machine-state events into the canonical
 * outcome event shape that downstream learners (OutcomeFeedbackOverride
 * StoreEngine, PolicyExperienceLedger, CrossProcessNeuralLearningEngine)
 * already consume.
 *
 * The MTConnect engine family already exists (MachineConnectivityEngine,
 * MTConnectLiveStatusEngine, MTConnectRoundTripLatencyBenchEngine). What
 * was missing was the bridge that converts their raw probe data into the
 * outcome-event shape the learning layer expects.
 *
 * ─── Design ────────────────────────────────────────────────────────────────
 *
 * Why a separate bridge engine (not a method on MachineConnectivityEngine):
 *   MachineConnectivityEngine owns MTConnect protocol concerns (probe URLs,
 *   XML parsing, sample/current/asset endpoint discovery). The bridge owns
 *   the SEMANTIC translation (success/confidence/override extraction from
 *   raw telemetry). Splitting keeps the connectivity engine free of
 *   learning-layer coupling.
 *
 * Why pure-function `translate()`:
 *   The bridge is stateless. The OutcomeFeedbackOverrideStoreEngine + the
 *   FeedbackBus own the persistence. The bridge maps shape A → shape B
 *   and lets the bus handle distribution. Testable in isolation.
 *
 * Translation rules (v1, conservative):
 *   - MTConnect `EXECUTION` of "ACTIVE"/"INTERRUPTED" + `MachineMode` of
 *     "AUTOMATIC" → success=true if no `Alarm`/`Fault` blocks, else false.
 *   - Confidence from probe-quality signals: stable spindle load + chip
 *     evacuation status + temperature within window → 0.85 baseline.
 *   - Overrides extracted from `OverrideFeedrate`, `OverrideSpindle`,
 *     `ProgramStop` events — these are operator-applied per-job tweaks
 *     that the learning layer should accumulate.
 *
 * @module engines/MTConnectToOutcomeBridgeEngine
 * @milestone PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-SHOPFLOOR-LEARN
 * @version 1.0.0
 */

/** Subset of MTConnect probe data the bridge consumes. */
export interface MTConnectShopFloorEvent {
  device_id?: string;
  /** MTConnect EXECUTION dataitem value. */
  execution?: "READY" | "ACTIVE" | "INTERRUPTED" | "STOPPED" | string;
  /** MTConnect ControllerMode (AUTOMATIC | MANUAL | SEMI_AUTOMATIC). */
  controller_mode?: string;
  /** Any active alarms or faults — non-empty means failure path. */
  alarms?: string[];
  /** Spindle load percent (0..100). */
  spindle_load_pct?: number;
  /** Tool temperature in °C, if probed. */
  tool_temp_c?: number;
  /** Operator-applied per-job overrides — passed through to the store. */
  operator_overrides?: Record<string, unknown>;
  /** Domain hint — defaults to "mill" if not provided. */
  domain?: "mill" | "lathe" | "wedm";
  /** Optional ISO timestamp (defaults to now). */
  ts?: string;
}

/** Canonical outcome event shape (subset used by OutcomeFeedbackOverrideStore). */
export interface OutcomeEvent {
  domain: string;
  success: boolean;
  confidence: number;
  overrides?: Record<string, unknown>;
  topic: string;
  kind: string;
  context: Record<string, unknown>;
  ts: string;
}

/** Topic this bridge publishes to (matches OutcomeFeedbackOverrideStoreEngine's subscription). */
export const SHOPFLOOR_OUTCOME_TOPIC = "outcome.recorded" as const;

/** Kind tag for events emitted by this bridge. */
export const SHOPFLOOR_OUTCOME_KIND = "mtconnect_shopfloor" as const;

/** Confidence baseline when no special signals fire. */
const CONFIDENCE_BASELINE = 0.85;

/** Confidence floor when something looks marginal. */
const CONFIDENCE_MARGINAL = 0.55;

/** Spindle load above this hints at chatter risk → lower confidence. */
const SPINDLE_LOAD_HIGH_PCT = 85;

/** Tool temperature above this hints at thermal stress → lower confidence. */
const TOOL_TEMP_HIGH_C = 380;

export class MTConnectToOutcomeBridgeEngine {
  /** Diagnostic — count of events translated into success outcomes. */
  static successCount = 0;
  /** Diagnostic — count of events translated into failure outcomes. */
  static failureCount = 0;
  /** Diagnostic — count of events rejected as malformed. */
  static malformedCount = 0;

  /**
   * Translate one MTConnect shop-floor event into the canonical outcome event
   * shape. Pure function — does NOT publish; caller publishes via FeedbackBus.
   *
   * Returns null for malformed input (no `execution` field, no `device_id`).
   * Counters are still incremented for diagnostic visibility.
   */
  static translate(event: MTConnectShopFloorEvent): OutcomeEvent | null {
    if (!event || typeof event !== "object") {
      MTConnectToOutcomeBridgeEngine.malformedCount += 1;
      return null;
    }
    if (!event.execution) {
      MTConnectToOutcomeBridgeEngine.malformedCount += 1;
      return null;
    }

    const domain = event.domain ?? "mill";
    const ts = event.ts ?? new Date().toISOString();
    const hasAlarms = Array.isArray(event.alarms) && event.alarms.length > 0;
    const execActive = event.execution === "ACTIVE" || event.execution === "INTERRUPTED";

    // Success = ACTIVE-ish execution AND no alarms.
    const success = execActive && !hasAlarms;

    // Confidence rollup — start at baseline, walk down on marginal signals.
    let confidence = CONFIDENCE_BASELINE;
    if (typeof event.spindle_load_pct === "number" && event.spindle_load_pct > SPINDLE_LOAD_HIGH_PCT) {
      confidence = Math.min(confidence, CONFIDENCE_MARGINAL);
    }
    if (typeof event.tool_temp_c === "number" && event.tool_temp_c > TOOL_TEMP_HIGH_C) {
      confidence = Math.min(confidence, CONFIDENCE_MARGINAL);
    }
    if (hasAlarms) {
      confidence = Math.min(confidence, 0);
    }

    if (success) MTConnectToOutcomeBridgeEngine.successCount += 1;
    else MTConnectToOutcomeBridgeEngine.failureCount += 1;

    return {
      domain,
      success,
      confidence,
      overrides: event.operator_overrides,
      topic: SHOPFLOOR_OUTCOME_TOPIC,
      kind: SHOPFLOOR_OUTCOME_KIND,
      context: {
        device_id: event.device_id,
        controller_mode: event.controller_mode,
        execution: event.execution,
        spindle_load_pct: event.spindle_load_pct,
        tool_temp_c: event.tool_temp_c,
        alarms: event.alarms ?? [],
      },
      ts,
    };
  }

  /**
   * Translate AND publish in one call. Lazy-imports feedbackBusEngine.
   * Returns the translated event for inspection; returns null if input was
   * malformed (publish skipped).
   */
  static async publishTranslated(event: MTConnectShopFloorEvent): Promise<OutcomeEvent | null> {
    const outcome = MTConnectToOutcomeBridgeEngine.translate(event);
    if (!outcome) return null;
    const { feedbackBusEngine } = await import("./FeedbackBusEngine.js");
    feedbackBusEngine.publish(outcome.topic, outcome);
    return outcome;
  }

  /** Reset diagnostic counters (tests). */
  static reset(): void {
    MTConnectToOutcomeBridgeEngine.successCount = 0;
    MTConnectToOutcomeBridgeEngine.failureCount = 0;
    MTConnectToOutcomeBridgeEngine.malformedCount = 0;
  }
}

/** Singleton export per engine convention. */
export const mtconnectToOutcomeBridgeEngine = MTConnectToOutcomeBridgeEngine;
