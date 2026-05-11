/**
 * XProcNeuralAutoFireEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN09
 *
 * Ignition for the cross-process closed-loop learning system.
 *
 * CN02–CN08 built the loop:
 *   - CN02/03/05  the NN predictor (`CrossProcessNeuralLearningEngine`) with a
 *                 *dormant* `enableAutoTrain()` (U-NN-LOOP03) and consumers
 *                 (SpeedFeedOrchestrator gate, Omega 7th dim, KG feature projector)
 *   - CN04        TribalKnowledgeOutcomeBridgeEngine        ← `outcome.recorded`
 *   - CN06        OutcomeDriftCalibrationBridgeEngine       ← `outcome.completed`
 *   - CN07        OutcomeReplayBufferBridgeEngine           ← `outcome.completed`
 *   - CN08        OutcomeEpisodicMemoryBridgeEngine         ← `outcome.completed`
 *
 * …but nothing turned any of it on. The auto-train subscription and all four
 * fan-out bridges were reachable only via explicit dispatcher actions, so on a
 * fresh MCP server the loop is INERT — `CrossProcessOutcomeStore.record()`
 * publishes `outcome.recorded` / `outcome.completed` to a bus with zero
 * subscribers, and `crossProcessNeuralLearningEngine.predictFromRecord()` keeps
 * returning a model that never saw a single shop-floor outcome.
 *
 * This engine flips every switch in one idempotent `activate()` call:
 *   1. `crossProcessNeuralLearningEngine.enableAutoTrain({threshold, trainOpts})`
 *   2. `TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes()`
 *   3. `OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes()`
 *   4. `OutcomeReplayBufferBridgeEngine.subscribeToOutcomes()`
 *   5. `OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes()`
 *
 * Failure isolation: every step is independently try/catch'd; a failure on one
 * never blocks the others and is reported per-component. The engine records
 * which switches IT turned on (vs ones already active), so `deactivate()` only
 * undoes its own work — a bridge an operator subscribed by hand is left alone.
 *
 * Wired:
 *   - MCP server boot (`index.ts`) behind `PRISM_XPROC_AUTOFIRE` (default on;
 *     set "0" to disable) — so the loop is live by default on every server start.
 *   - `prism_ai` (aiReasoningDispatcher) via
 *     `xproc_autofire_activate | xproc_autofire_deactivate | xproc_autofire_status`.
 *
 * This is the keystone of the CONNECT milestone: it makes everything CN02–CN08
 * built actually *run*.
 *
 * @engine XProcNeuralAutoFireEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN09
 * @see CrossProcessNeuralLearningEngine
 * @see TribalKnowledgeOutcomeBridgeEngine
 * @see OutcomeDriftCalibrationBridgeEngine
 * @see OutcomeReplayBufferBridgeEngine
 * @see OutcomeEpisodicMemoryBridgeEngine
 */

import { z } from "zod";
import { crossProcessNeuralLearningEngine } from "./CrossProcessNeuralLearningEngine.js";
import { TribalKnowledgeOutcomeBridgeEngine } from "./TribalKnowledgeOutcomeBridgeEngine.js";
import { OutcomeDriftCalibrationBridgeEngine } from "./OutcomeDriftCalibrationBridgeEngine.js";
import { OutcomeReplayBufferBridgeEngine } from "./OutcomeReplayBufferBridgeEngine.js";
import { OutcomeEpisodicMemoryBridgeEngine } from "./OutcomeEpisodicMemoryBridgeEngine.js";

// ============================================================================
// Public types
// ============================================================================

export type AutoFireComponentKey =
  | "neural_auto_train"
  | "tribal_bridge"
  | "drift_calibration_bridge"
  | "replay_buffer_bridge"
  | "episodic_memory_bridge";

export type AutoFireComponentAction = "enabled" | "already_active" | "error" | "disabled" | "not_owned" | "not_active";

export interface AutoFireComponentResult {
  key: AutoFireComponentKey;
  action: AutoFireComponentAction;
  /** True if this engine (not a prior caller) turned the component on. */
  ownedByAutoFire: boolean;
  message?: string;
}

export interface AutoFireActivateResult {
  ok: boolean;
  /** True when `activate()` was called while already activated (whole call was a no-op). */
  alreadyActivated: boolean;
  components: AutoFireComponentResult[];
  /** ISO timestamp of the (first) successful activation; null if never activated. */
  activatedAt: string | null;
  /** Count of components that errored during this call. */
  errors: number;
}

export interface AutoFireDeactivateResult {
  ok: boolean;
  wasActivated: boolean;
  components: AutoFireComponentResult[];
  errors: number;
}

export interface AutoFireComponentStatus {
  key: AutoFireComponentKey;
  active: boolean;
  /** True if this engine turned it on (and therefore would turn it off on deactivate). */
  ownedByAutoFire: boolean;
}

export interface AutoFireStatus {
  activated: boolean;
  activatedAt: string | null;
  autoTrainThreshold: number | null;
  components: AutoFireComponentStatus[];
}

// ============================================================================
// Schema
// ============================================================================

const ActivateInputSchema = z
  .object({
    /** Records buffered before each auto-train retrain. Default 16. */
    autoTrainThreshold: z.number().int().min(1).max(100_000).optional(),
    /** Epochs per retrain pass. Forwarded to TrainOpts. */
    autoTrainEpochs: z.number().int().min(1).max(1000).optional(),
    /** Mini-batch size per epoch. Forwarded to TrainOpts. */
    autoTrainBatchSize: z.number().int().min(1).max(100_000).optional(),
    /** Shuffle the training set each epoch. Forwarded to TrainOpts. Default true. */
    autoTrainShuffle: z.boolean().optional(),
  })
  .strict()
  .optional();

export type AutoFireActivateOptions = NonNullable<z.infer<typeof ActivateInputSchema>>;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_AUTO_TRAIN_THRESHOLD = 16;

const ALL_COMPONENTS: readonly AutoFireComponentKey[] = [
  "neural_auto_train",
  "tribal_bridge",
  "drift_calibration_bridge",
  "replay_buffer_bridge",
  "episodic_memory_bridge",
];

// ============================================================================
// Engine
// ============================================================================

export class XProcNeuralAutoFireEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN09";

  // ──────────────────────────────────────────────────────────────────────────
  // State (module-private, reset()-able)
  // ──────────────────────────────────────────────────────────────────────────
  private static activatedAt: string | null = null;
  /** Components this engine turned on (so deactivate() only undoes its own work). */
  private static owned: Set<AutoFireComponentKey> = new Set();
  private static autoTrainThreshold: number | null = null;

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Turn on the closed-loop learning system: NN auto-train + all four outcome
   * fan-out bridges. Idempotent — a second call while activated is a no-op.
   * Each component is activated independently; one failure never blocks the rest.
   *
   * @param input Optional {@link AutoFireActivateOptions} (auto-train threshold + TrainOpts).
   * @returns {@link AutoFireActivateResult} with a per-component breakdown.
   */
  static activate(input?: unknown): AutoFireActivateResult {
    const parsed = ActivateInputSchema.safeParse(input ?? undefined);
    const opts: AutoFireActivateOptions = parsed.success && parsed.data ? parsed.data : {};

    if (this.activatedAt !== null) {
      // Already activated — report current state without re-poking anything.
      // (action is "already_active" regardless of ownership; ownedByAutoFire is
      // the meaningful distinguisher in this branch.)
      return {
        ok: true,
        alreadyActivated: true,
        components: ALL_COMPONENTS.map((key) => ({
          key,
          action: "already_active" as const,
          ownedByAutoFire: this.owned.has(key),
        })),
        activatedAt: this.activatedAt,
        errors: 0,
      };
    }

    const threshold = opts.autoTrainThreshold ?? DEFAULT_AUTO_TRAIN_THRESHOLD;
    const trainOpts =
      opts.autoTrainEpochs !== undefined || opts.autoTrainBatchSize !== undefined || opts.autoTrainShuffle !== undefined
        ? {
            ...(opts.autoTrainEpochs !== undefined ? { epochs: opts.autoTrainEpochs } : {}),
            ...(opts.autoTrainBatchSize !== undefined ? { batchSize: opts.autoTrainBatchSize } : {}),
            ...(opts.autoTrainShuffle !== undefined ? { shuffle: opts.autoTrainShuffle } : {}),
          }
        : undefined;

    const components: AutoFireComponentResult[] = [];

    // 1. NN auto-train. enableAutoTrain() THROWS if already active, so probe first.
    components.push(this.enableNeuralAutoTrain(threshold, trainOpts));

    // 2–5. Fan-out bridges (uniform subscribeToOutcomes() contract).
    components.push(
      this.subscribeBridge("tribal_bridge", () => TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes()),
    );
    components.push(
      this.subscribeBridge("drift_calibration_bridge", () =>
        OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes(),
      ),
    );
    components.push(
      this.subscribeBridge("replay_buffer_bridge", () => OutcomeReplayBufferBridgeEngine.subscribeToOutcomes()),
    );
    components.push(
      this.subscribeBridge("episodic_memory_bridge", () =>
        OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes(),
      ),
    );

    const errors = components.filter((c) => c.action === "error").length;
    this.activatedAt = new Date().toISOString();
    this.autoTrainThreshold = threshold;
    return {
      ok: errors === 0,
      alreadyActivated: false,
      components,
      activatedAt: this.activatedAt,
      errors,
    };
  }

  /**
   * Reverse only the switches this engine turned on. Bridges / auto-train that
   * were already active before {@link activate} are left untouched. Idempotent.
   */
  static deactivate(): AutoFireDeactivateResult {
    if (this.activatedAt === null) {
      return {
        ok: true,
        wasActivated: false,
        components: ALL_COMPONENTS.map((key) => ({ key, action: "not_active" as const, ownedByAutoFire: false })),
        errors: 0,
      };
    }

    const components: AutoFireComponentResult[] = [];

    // 1. NN auto-train.
    if (this.owned.has("neural_auto_train")) {
      try {
        crossProcessNeuralLearningEngine.disableAutoTrain();
        components.push({ key: "neural_auto_train", action: "disabled", ownedByAutoFire: true });
      } catch (e) {
        components.push({
          key: "neural_auto_train",
          action: "error",
          ownedByAutoFire: true,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      components.push({ key: "neural_auto_train", action: "not_owned", ownedByAutoFire: false });
    }

    // 2–5. Bridges.
    const bridgeUnsubscribers: Array<[AutoFireComponentKey, () => unknown]> = [
      ["tribal_bridge", () => TribalKnowledgeOutcomeBridgeEngine.unsubscribeFromOutcomes()],
      ["drift_calibration_bridge", () => OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes()],
      ["replay_buffer_bridge", () => OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes()],
      ["episodic_memory_bridge", () => OutcomeEpisodicMemoryBridgeEngine.unsubscribeFromOutcomes()],
    ];
    for (const [key, fn] of bridgeUnsubscribers) {
      if (!this.owned.has(key)) {
        components.push({ key, action: "not_owned", ownedByAutoFire: false });
        continue;
      }
      try {
        fn();
        components.push({ key, action: "disabled", ownedByAutoFire: true });
      } catch (e) {
        components.push({
          key,
          action: "error",
          ownedByAutoFire: true,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const errors = components.filter((c) => c.action === "error").length;
    this.activatedAt = null;
    this.owned = new Set();
    this.autoTrainThreshold = null;
    return { ok: errors === 0, wasActivated: true, components, errors };
  }

  /** Whether {@link activate} has been called (and not since deactivated). */
  static isActivated(): boolean {
    return this.activatedAt !== null;
  }

  /** Per-component live status (queries each engine, not the cached `owned` set). */
  static status(): AutoFireStatus {
    const liveActive: Record<AutoFireComponentKey, boolean> = {
      neural_auto_train: this.safeBool(() => crossProcessNeuralLearningEngine.autoTrainStatus().active),
      tribal_bridge: this.safeBool(() => TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes()),
      drift_calibration_bridge: this.safeBool(() => OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()),
      replay_buffer_bridge: this.safeBool(() => OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()),
      episodic_memory_bridge: this.safeBool(() => OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes()),
    };
    return {
      activated: this.activatedAt !== null,
      activatedAt: this.activatedAt,
      autoTrainThreshold: this.autoTrainThreshold,
      components: ALL_COMPONENTS.map((key) => ({
        key,
        active: liveActive[key],
        ownedByAutoFire: this.owned.has(key),
      })),
    };
  }

  /** Reset the engine's own bookkeeping. Does NOT deactivate the downstream loop. */
  static reset(): void {
    this.activatedAt = null;
    this.owned = new Set();
    this.autoTrainThreshold = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────────────────────

  private static enableNeuralAutoTrain(
    threshold: number,
    trainOpts: { epochs?: number; batchSize?: number; shuffle?: boolean } | undefined,
  ): AutoFireComponentResult {
    let alreadyActive = false;
    try {
      alreadyActive = crossProcessNeuralLearningEngine.autoTrainStatus().active;
    } catch {
      // Treat an unreadable status as "not active" and let enableAutoTrain decide.
      alreadyActive = false;
    }
    if (alreadyActive) {
      return { key: "neural_auto_train", action: "already_active", ownedByAutoFire: false };
    }
    try {
      crossProcessNeuralLearningEngine.enableAutoTrain({ threshold, ...(trainOpts ? { trainOpts } : {}) });
      this.owned.add("neural_auto_train");
      return { key: "neural_auto_train", action: "enabled", ownedByAutoFire: true };
    } catch (e) {
      return {
        key: "neural_auto_train",
        action: "error",
        ownedByAutoFire: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private static subscribeBridge(
    key: AutoFireComponentKey,
    subscribe: () => { ok: true; alreadySubscribed: boolean },
  ): AutoFireComponentResult {
    try {
      const r = subscribe();
      if (r.alreadySubscribed) {
        return { key, action: "already_active", ownedByAutoFire: false };
      }
      this.owned.add(key);
      return { key, action: "enabled", ownedByAutoFire: true };
    } catch (e) {
      return {
        key,
        action: "error",
        ownedByAutoFire: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private static safeBool(fn: () => boolean): boolean {
    try {
      return fn() === true;
    } catch {
      return false;
    }
  }
}

export const xProcNeuralAutoFireEngine = XProcNeuralAutoFireEngine;

// ============================================================================
// Dispatcher convenience wrapper
// ============================================================================

export function xProcNeuralAutoFireDispatch(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_autofire_activate":
      return XProcNeuralAutoFireEngine.activate(params);
    case "xproc_autofire_deactivate":
      return XProcNeuralAutoFireEngine.deactivate();
    case "xproc_autofire_status":
      return { ok: true, status: XProcNeuralAutoFireEngine.status() };
    default:
      throw new Error(`xProcNeuralAutoFireDispatch: unknown action '${action}'`);
  }
}
