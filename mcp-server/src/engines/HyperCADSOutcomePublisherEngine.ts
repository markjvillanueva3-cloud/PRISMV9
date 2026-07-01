/**
 * HyperCADSOutcomePublisherEngine — CAD-DRAW-MAX-MS0/P0-U02
 *
 * Closes the LP01→NN01 closed-loop for hyperCAD-S specifically. Today
 * LP01's `cadExecutionOutcomeBusEngine` is wired but no engine emits
 * hyperCAD-S outcomes onto it; this publisher is the missing producer.
 *
 * **Role.** Accept a {@link LiveOpResult} (or any hyperCAD-S script-
 * execution result), translate it into the canonical
 * {@link CADExecutionOutcome} shape, then push onto the LP01 bus with
 * `adapterId: "hypercads"`. The bus fans out to LP02
 * (CADPerAdapterFeedbackCollectorEngine) → LP03 replay buffer → LP04
 * backprop. Each hyperCAD-S live op the AI runs becomes a training
 * signal for the per-head policy.
 *
 * **Mapping (LiveOpResult → CADExecutionOutcome).**
 *   - `success`            ← `ok`
 *   - `timingMs`           ← `durationMs` (clamped ≥0)
 *   - `errorMessage`       ← `error` when ok=false
 *   - `scriptId`           ← `opId` (preserves per-op attribution)
 *   - `collision`          ← caller-supplied (regen-test integration in P0-U03)
 *   - `regenerationOk`     ← caller-supplied (regen-test integration in P0-U03)
 *   - `adapterId`          ← always "hypercads"
 *
 * **Why a separate engine (not inlined in the live bridge).** Separation
 * lets non-live execution paths (`hypercads_build_part`,
 * `hypercads_execute`) also publish through the same translator without
 * the live bridge becoming a god-object. It also keeps the bus
 * dependency out of the live bridge so the bridge stays unit-testable
 * with a stub codegen + no bus mock.
 *
 * **R12 fail-loud.** validateOutcome() in the bus throws on bad input;
 * this publisher does NOT swallow that — the caller learns about
 * publish failures via the returned PublishResult.busOk flag.
 *
 * Refs: CADExecutionOutcomeBusEngine (LP01); CADPerAdapterFeedbackCollectorEngine
 * (LP02); MasterBrainBackpropPropagatorEngine (LP04).
 */

import {
  cadExecutionOutcomeBusEngine,
  type CADExecutionOutcome,
  type CADExecutionOutcomeBusEngine,
  type PublishResult,
} from "./CADExecutionOutcomeBusEngine.js";
import type { LiveOpResult } from "./HyperCADSLiveBridgeEngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Canonical adapter id used for every outcome this publisher emits. */
export const HYPERCADS_ADAPTER_ID = "hypercads";

// ── Types ────────────────────────────────────────────────────────────────────

/** Optional regen/collision overlays a caller can attach when known. */
export interface OutcomeOverlay {
  /** True iff fixture/tool/stock collision was reported. */
  collision?: boolean;
  /** True iff post-execute regen validation passed (P0-U03 feeds this). */
  regenerationOk?: boolean;
  /** Lineage id chaining outcome → recommendation; auto-issued if omitted. */
  lineageId?: string;
}

/** Aggregate publisher counters surfaced via getStats(). */
export interface PublisherStats {
  totalAccepted: number;
  totalPublishedOk: number;
  totalPublishedBusWarn: number;
  totalRejected: number;
  successCount: number;
  failureCount: number;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HyperCADSOutcomePublisherEngine {
  private totalAccepted = 0;
  private totalPublishedOk = 0;
  private totalPublishedBusWarn = 0;
  private totalRejected = 0;
  private successCount = 0;
  private failureCount = 0;

  constructor(private bus: CADExecutionOutcomeBusEngine = cadExecutionOutcomeBusEngine) {}

  /**
   * Translate a LiveOpResult → CADExecutionOutcome and publish onto LP01's
   * bus. Returns the bus PublishResult so callers can observe lineage +
   * subscriber notification counts.
   */
  publishLiveResult(
    result: LiveOpResult,
    overlay: OutcomeOverlay = {},
  ): PublishResult {
    if (!result || typeof result !== "object") {
      this.totalRejected++;
      throw new TypeError("publishLiveResult: result must be a LiveOpResult object");
    }
    this.totalAccepted++;
    const outcome: CADExecutionOutcome = {
      adapterId: HYPERCADS_ADAPTER_ID,
      scriptId: result.opId,
      success: result.ok === true,
      timingMs: Math.max(0, typeof result.durationMs === "number" && Number.isFinite(result.durationMs) ? result.durationMs : 0),
    };
    if (!outcome.success && typeof result.error === "string" && result.error.length > 0) {
      outcome.errorMessage = result.error;
    }
    if (typeof overlay.collision === "boolean") outcome.collision = overlay.collision;
    if (typeof overlay.regenerationOk === "boolean") outcome.regenerationOk = overlay.regenerationOk;
    if (typeof overlay.lineageId === "string" && overlay.lineageId.length > 0) outcome.lineageId = overlay.lineageId;

    if (outcome.success) this.successCount++;
    else this.failureCount++;

    const pub = this.bus.publish(outcome);
    if (pub.busOk) this.totalPublishedOk++;
    else this.totalPublishedBusWarn++;
    return pub;
  }

  /**
   * Publish from a raw script-execution result shape (used by
   * `hypercads_build_part` / `hypercads_execute` dispatcher cases —
   * those return `{ok, durationMs, outputFiles, metrics, error}` not
   * the LiveOpResult shape but the same translation applies).
   */
  publishScriptResult(
    exec: {
      ok: boolean;
      durationMs: number;
      error?: string;
      metrics?: Record<string, number>;
    },
    scriptId: string,
    overlay: OutcomeOverlay = {},
  ): PublishResult {
    if (!exec || typeof exec !== "object") {
      this.totalRejected++;
      throw new TypeError("publishScriptResult: exec must be an exec-result object");
    }
    if (typeof scriptId !== "string" || scriptId.length === 0) {
      this.totalRejected++;
      throw new TypeError("publishScriptResult: scriptId must be a non-empty string");
    }
    return this.publishLiveResult(
      {
        ok: exec.ok === true,
        opId: scriptId,
        scriptText: "",
        durationMs: exec.durationMs,
        warnings: [],
        error: exec.error,
        sessionOpCount: 0,
      },
      overlay,
    );
  }

  /** Aggregate counters. */
  getStats(): PublisherStats {
    return {
      totalAccepted: this.totalAccepted,
      totalPublishedOk: this.totalPublishedOk,
      totalPublishedBusWarn: this.totalPublishedBusWarn,
      totalRejected: this.totalRejected,
      successCount: this.successCount,
      failureCount: this.failureCount,
    };
  }

  /** Test-only reset of counters. */
  _resetForTests(): void {
    this.totalAccepted = 0;
    this.totalPublishedOk = 0;
    this.totalPublishedBusWarn = 0;
    this.totalRejected = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }
}

export const hyperCADSOutcomePublisherEngine = new HyperCADSOutcomePublisherEngine();
