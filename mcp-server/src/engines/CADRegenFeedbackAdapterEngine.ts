/**
 * CADRegenFeedbackAdapterEngine — CAD-DRAW-MAX-MS0/P0-U03
 *
 * Wires `cad_regen_test` (CADRegenerationTestEngine) output into the
 * reward overlay that {@link HyperCADSOutcomePublisherEngine} attaches
 * to every CADExecutionOutcome on the LP01 bus. Closes the third P0
 * gap from the assessment: the AI now learns from *geometric* mismatch,
 * not just whether the script crashed.
 *
 * **Why a separate adapter (not inlined in the publisher).** Keeps the
 * publisher (P0-U02) immutable — it knows nothing about regen-test
 * shape. This adapter is the only place that knows how to translate a
 * `CADRegenerationTest` (or compare) result into an
 * `OutcomeOverlay.regenerationOk`. If regen-test output evolves, this
 * one file changes; the publisher is unaffected.
 *
 * **Mapping.**
 *   - `regenerationOk` ← regenResult.passed (boolean)
 *   - `collision`      ← caller-supplied (regen-test doesn't model
 *                        fixture collisions; that's MachineHardenEngine
 *                        territory) OR derived from a topology-fail
 *                        signal when the caller asks
 *   - other overlay fields pass through from `extraOverlay`
 *
 * **Two failure modes the adapter must NOT hide (R12).**
 *   1. Missing `passed` on the regen input → adapter leaves
 *      regenerationOk *off the overlay entirely* (do not coerce to
 *      false — that would teach LP04 a wrong signal).
 *   2. Throw from the publisher → propagates; caller learns.
 *
 * Refs: HyperCADSOutcomePublisherEngine (P0-U02);
 * CADRegenerationTestEngine; HyperCADSLiveBridgeEngine (P0-U01).
 */

import {
  hyperCADSOutcomePublisherEngine,
  type HyperCADSOutcomePublisherEngine,
  type OutcomeOverlay,
} from "./HyperCADSOutcomePublisherEngine.js";
import type { PublishResult } from "./CADExecutionOutcomeBusEngine.js";
import type { LiveOpResult } from "./HyperCADSLiveBridgeEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape of a regen-test / regen-compare result the adapter consumes. */
export interface RegenResultLike {
  /** Aggregate pass flag for the regen comparison. Optional — when absent,
   *  the adapter leaves `regenerationOk` off the overlay (not coerced to false). */
  passed?: boolean;
  /** Optional per-metric pass map. When `passed` is absent, the adapter
   *  derives passed = all metric.passed===true (when present + non-empty). */
  metrics?: Record<string, { passed?: boolean }>;
  /** Optional topology-fail signal interpreted as a soft collision proxy
   *  when the caller explicitly opts in via `deriveCollisionFromTopology=true`. */
  topologyFailed?: boolean;
}

/** Caller knobs for the merge step. */
export interface RegenAdapterOptions {
  /** Extra overlay fields to merge AFTER the regen-derived ones. */
  extraOverlay?: OutcomeOverlay;
  /** When true, sets overlay.collision = (regen.topologyFailed === true). */
  deriveCollisionFromTopology?: boolean;
}

/** Aggregate counters surfaced for telemetry / dispatcher inspection. */
export interface AdapterStats {
  totalCalls: number;
  totalDerivedFromPassed: number;
  totalDerivedFromMetrics: number;
  totalNoSignal: number;
  totalCollisionDerived: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Compute regenerationOk from a RegenResultLike. Returns undefined when no signal. */
function deriveRegenOk(regen: RegenResultLike): boolean | undefined {
  if (typeof regen.passed === "boolean") return regen.passed;
  if (regen.metrics && typeof regen.metrics === "object") {
    const entries = Object.values(regen.metrics);
    if (entries.length === 0) return undefined;
    let allTrue = true;
    let anyKnown = false;
    for (const m of entries) {
      if (m && typeof m.passed === "boolean") {
        anyKnown = true;
        if (!m.passed) allTrue = false;
      }
    }
    return anyKnown ? allTrue : undefined;
  }
  return undefined;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADRegenFeedbackAdapterEngine {
  private totalCalls = 0;
  private totalDerivedFromPassed = 0;
  private totalDerivedFromMetrics = 0;
  private totalNoSignal = 0;
  private totalCollisionDerived = 0;

  constructor(
    private publisher: HyperCADSOutcomePublisherEngine = hyperCADSOutcomePublisherEngine,
  ) {}

  /**
   * Translate a regen-test result into an OutcomeOverlay and publish the
   * combined hyperCAD-S outcome onto LP01's bus.
   */
  publishWithRegen(
    result: LiveOpResult,
    regen: RegenResultLike,
    options: RegenAdapterOptions = {},
  ): PublishResult {
    if (!result || typeof result !== "object") {
      throw new TypeError("publishWithRegen: result must be a LiveOpResult object");
    }
    if (!regen || typeof regen !== "object") {
      throw new TypeError("publishWithRegen: regen must be a RegenResultLike object");
    }
    this.totalCalls++;

    const overlay: OutcomeOverlay = { ...(options.extraOverlay ?? {}) };
    if (typeof regen.passed === "boolean") {
      overlay.regenerationOk = regen.passed;
      this.totalDerivedFromPassed++;
    } else {
      const derived = deriveRegenOk(regen);
      if (typeof derived === "boolean") {
        overlay.regenerationOk = derived;
        this.totalDerivedFromMetrics++;
      } else {
        this.totalNoSignal++;
      }
    }

    if (options.deriveCollisionFromTopology === true) {
      // Only set when topology field is a real boolean — never coerce.
      if (typeof regen.topologyFailed === "boolean") {
        overlay.collision = regen.topologyFailed === true;
        this.totalCollisionDerived++;
      }
    }

    return this.publisher.publishLiveResult(result, overlay);
  }

  getStats(): AdapterStats {
    return {
      totalCalls: this.totalCalls,
      totalDerivedFromPassed: this.totalDerivedFromPassed,
      totalDerivedFromMetrics: this.totalDerivedFromMetrics,
      totalNoSignal: this.totalNoSignal,
      totalCollisionDerived: this.totalCollisionDerived,
    };
  }

  _resetForTests(): void {
    this.totalCalls = 0;
    this.totalDerivedFromPassed = 0;
    this.totalDerivedFromMetrics = 0;
    this.totalNoSignal = 0;
    this.totalCollisionDerived = 0;
  }
}

export const cadRegenFeedbackAdapterEngine = new CADRegenFeedbackAdapterEngine();
