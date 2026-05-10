/**
 * OutcomeReplayBufferBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN07
 *
 * Bus subscriber that turns the live outcome stream into structured
 * replay data for the cross-process NN trainer. Closes the gap where
 * CrossProcessPrioritizedReplayEngine + CrossProcessExperienceReplay-
 * SamplerEngine were dispatcher-wired but completely blind to incoming
 * outcomes — every batch had to be hand-fed.
 *
 * Subscription topic: `outcome.completed` (terminal transitions only).
 *
 * Per-event work (single subscriber callback):
 *
 *   1. Decode the OutcomeRecord from the bus envelope.
 *   2. Skip if outcome.kind is "pending" or unknown.
 *   3. Skip if process is not one of the sampler-supported processes
 *      ("mill" / "lathe" / "wedm") — other bridges still flow through
 *      drift+calibration via U-CN06, just not through replay.
 *   4. Derive a binary tdError signal (failure → 1.0, else 0.0) under
 *      the configured error policy. Forward to
 *      CrossProcessPrioritizedReplayEngine.add({ episodeId, tdError,
 *      metadata }) so the priority queue has fresh data.
 *   5. Append a SamplerEpisode {id, process, material, outcome} to a
 *      module-private ring buffer (capacity configurable, default 1000).
 *      This is the corpus the bridge exposes for stratified sampling.
 *
 * Sampling APIs (exposed via dispatcher actions):
 *
 *   - sampleStratified({ n, processWeights?, outcomeWeights?,
 *                        materialClusters?, shuffleResult? })
 *     → calls CrossProcessExperienceReplaySamplerEngine.stratifiedBatch
 *       over the ring buffer's current contents
 *
 *   - samplePrioritized({ n, beta })
 *     → calls CrossProcessPrioritizedReplayEngine.sample({n, beta})
 *
 * Outcome→SamplerOutcome mapping (the sampler uses {success, marginal,
 * fail}):
 *   success           → "success"
 *   failure           → "fail"
 *   operator_override → "marginal"   (human intervened; not a hard fail)
 *
 * Failure isolation:
 *   - The bus already wraps each subscriber callback in try/catch.
 *   - Inside the bridge, every downstream call (prioritized.add,
 *     ring-buffer append) is independently try/catch'd and counted in
 *     `failures.<engine>` so one malformed event never disables the
 *     bridge.
 *
 * Acceptance (per ROADMAP CN07):
 *   - 1000 outcomes flowing through the bridge → prioritized buffer
 *     reports size ≥ DEFAULT_CAPACITY (= 1000) on its own engine,
 *     ring buffer reports size = min(1000, capacity).
 *   - stratifiedBatch over the ring returns a non-empty batch
 *     covering ≥ 3 strata when the input was multi-process.
 *
 * @engine OutcomeReplayBufferBridgeEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN07
 * @see CrossProcessPrioritizedReplayEngine
 * @see CrossProcessExperienceReplaySamplerEngine
 */

import { z } from "zod";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";
import { CrossProcessPrioritizedReplayEngine } from "./CrossProcessPrioritizedReplayEngine.js";
import {
  CrossProcessExperienceReplaySamplerEngine,
  type SamplerEpisode,
  type SamplerProcess,
  type SamplerOutcome,
  type SampleResponse as StratifiedSampleResponse,
} from "./CrossProcessExperienceReplaySamplerEngine.js";

// ============================================================================
// Public types
// ============================================================================

export type ReplayBridgeErrorPolicy = "failure_only" | "failure_or_override";

export interface ReplayBridgeConfig {
  errorPolicy: ReplayBridgeErrorPolicy;
  /** Maximum episodes held in the bridge's ring buffer. */
  ringCapacity: number;
}

export interface ReplayBridgeStats {
  subscribed: boolean;
  total_events_seen: number;
  total_skipped_pending: number;
  total_skipped_unknown_process: number;
  total_added_to_prioritized: number;
  total_added_to_ring: number;
  ring_buffer_size: number;
  failures: {
    prioritized_add: number;
    ring_append: number;
    decode: number;
  };
  config: ReplayBridgeConfig;
}

// ============================================================================
// Schemas
// ============================================================================

const ConfigureInputSchema = z.object({
  errorPolicy: z.enum(["failure_only", "failure_or_override"]).optional(),
  ringCapacity: z.number().int().min(1).max(100_000).optional(),
});

const SampleStratifiedInputSchema = z.object({
  n: z.number().int().nonnegative().max(100_000),
  processWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  outcomeWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  materialClusters: z.record(z.string(), z.array(z.string())).optional(),
  shuffleResult: z.boolean().optional(),
});

const SamplePrioritizedInputSchema = z.object({
  n: z.number().int().min(1).max(100_000),
  beta: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ERROR_POLICY: ReplayBridgeErrorPolicy = "failure_only";
const DEFAULT_RING_CAPACITY = 1000;
const FAILURE_TD_ERROR = 1.0;
const SUCCESS_TD_ERROR = 0.0;

/** Sampler-supported processes — must match SamplerProcess union exactly. */
const VALID_SAMPLER_PROCESSES: ReadonlySet<SamplerProcess> = new Set(["mill", "lathe", "wedm"]);

/** outcome.kind → SamplerOutcome mapping. */
const OUTCOME_KIND_TO_SAMPLER: Record<string, SamplerOutcome> = {
  success: "success",
  failure: "fail",
  operator_override: "marginal",
};

// ============================================================================
// Engine
// ============================================================================

export class OutcomeReplayBufferBridgeEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN07";

  // ──────────────────────────────────────────────────────────────────────────
  // State (module-private, reset()-able)
  // ──────────────────────────────────────────────────────────────────────────
  private static subscription: SubscriptionHandle | null = null;
  private static ringBuffer: SamplerEpisode[] = [];
  private static ringHead = 0;
  private static totalEvents = 0;
  private static skippedPending = 0;
  private static skippedUnknownProcess = 0;
  private static addedToPrioritized = 0;
  private static addedToRing = 0;
  private static failPriority = 0;
  private static failRing = 0;
  private static failDecode = 0;
  private static config: ReplayBridgeConfig = {
    errorPolicy: DEFAULT_ERROR_POLICY,
    ringCapacity: DEFAULT_RING_CAPACITY,
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
    | { ok: true; config: ReplayBridgeConfig }
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
    if (parsed.data.errorPolicy !== undefined) {
      this.config.errorPolicy = parsed.data.errorPolicy;
    }
    if (parsed.data.ringCapacity !== undefined && parsed.data.ringCapacity !== this.config.ringCapacity) {
      // Capacity shrink: truncate to most recent (keep tail of insertion order).
      this.config.ringCapacity = parsed.data.ringCapacity;
      if (this.ringBuffer.length > parsed.data.ringCapacity) {
        const startIdx = this.ringBuffer.length - parsed.data.ringCapacity;
        this.ringBuffer = this.ringBuffer.slice(startIdx);
        this.ringHead = 0;
      }
    }
    return { ok: true, config: { ...this.config } };
  }

  static stats(): ReplayBridgeStats {
    return {
      subscribed: this.subscription !== null,
      total_events_seen: this.totalEvents,
      total_skipped_pending: this.skippedPending,
      total_skipped_unknown_process: this.skippedUnknownProcess,
      total_added_to_prioritized: this.addedToPrioritized,
      total_added_to_ring: this.addedToRing,
      ring_buffer_size: this.ringBuffer.length,
      failures: {
        prioritized_add: this.failPriority,
        ring_append: this.failRing,
        decode: this.failDecode,
      },
      config: { ...this.config },
    };
  }

  /**
   * Sample a stratified batch from the bridge's ring buffer via
   * CrossProcessExperienceReplaySamplerEngine.stratifiedBatch.
   */
  static sampleStratified(input: unknown):
    | { ok: true; response: StratifiedSampleResponse }
    | { ok: false; error: "invalid_input"; message: string } {
    const parsed = SampleStratifiedInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; "),
      };
    }
    const response = CrossProcessExperienceReplaySamplerEngine.stratifiedBatch({
      n: parsed.data.n,
      episodes: this.ringBuffer.slice(),
      processWeights: parsed.data.processWeights,
      outcomeWeights: parsed.data.outcomeWeights,
      materialClusters: parsed.data.materialClusters,
      shuffleResult: parsed.data.shuffleResult ?? true,
    });
    return { ok: true, response };
  }

  /**
   * Sample a priority-weighted batch from the underlying
   * CrossProcessPrioritizedReplayEngine. Returns the engine's native
   * SampleResponse shape (batch, totalPriority, maxWeightInBatch, etc.).
   */
  static samplePrioritized(input: unknown):
    | { ok: true; response: ReturnType<typeof CrossProcessPrioritizedReplayEngine.sample> }
    | { ok: false; error: "invalid_input"; message: string } {
    const parsed = SamplePrioritizedInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; "),
      };
    }
    const response = CrossProcessPrioritizedReplayEngine.sample({
      n: parsed.data.n,
      beta: parsed.data.beta ?? 0.4,
    });
    return { ok: true, response };
  }

  /** Reset bridge state. Does NOT touch the downstream engines' state. */
  static reset(): void {
    if (this.subscription !== null) {
      feedbackBusEngine.unsubscribe(this.subscription);
      this.subscription = null;
    }
    this.ringBuffer = [];
    this.ringHead = 0;
    this.totalEvents = 0;
    this.skippedPending = 0;
    this.skippedUnknownProcess = 0;
    this.addedToPrioritized = 0;
    this.addedToRing = 0;
    this.failPriority = 0;
    this.failRing = 0;
    this.failDecode = 0;
    this.config = {
      errorPolicy: DEFAULT_ERROR_POLICY,
      ringCapacity: DEFAULT_RING_CAPACITY,
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
      id?: string;
      bridge?: string;
      process?: string;
      outcomeKind?: string;
      record?: {
        id?: string;
        process?: string;
        request_summary?: { material?: unknown };
        outcome?: { kind?: string };
      };
    };

    this.totalEvents += 1;

    const kind = env.record?.outcome?.kind ?? env.outcomeKind ?? "pending";
    const samplerOutcome = OUTCOME_KIND_TO_SAMPLER[kind];
    if (!samplerOutcome) {
      this.skippedPending += 1;
      return;
    }

    const proc = (env.record?.process ?? env.process) as SamplerProcess | undefined;
    if (!proc || !VALID_SAMPLER_PROCESSES.has(proc)) {
      this.skippedUnknownProcess += 1;
      return;
    }

    const material = typeof env.record?.request_summary?.material === "string"
      ? (env.record.request_summary.material as string)
      : "unknown";

    const episodeId = env.record?.id ?? env.id ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 1. Forward to prioritized replay.
    const tdError = this.kindToTdError(kind);
    try {
      const r = CrossProcessPrioritizedReplayEngine.add({
        episodeId,
        tdError,
        metadata: { process: proc, material, samplerOutcome },
      });
      if (r.ok) {
        this.addedToPrioritized += 1;
      } else {
        this.failPriority += 1;
      }
    } catch {
      this.failPriority += 1;
    }

    // 2. Append to ring buffer.
    try {
      const episode: SamplerEpisode = {
        id: episodeId,
        process: proc,
        material,
        outcome: samplerOutcome,
        weight: 1,
      };
      if (this.ringBuffer.length < this.config.ringCapacity) {
        this.ringBuffer.push(episode);
      } else {
        // Overwrite oldest slot — keeps newest N.
        this.ringBuffer[this.ringHead] = episode;
        this.ringHead = (this.ringHead + 1) % this.config.ringCapacity;
      }
      this.addedToRing += 1;
    } catch {
      this.failRing += 1;
    }
  }

  /** Map an outcome.kind to a tdError per the active policy. */
  private static kindToTdError(kind: string): number {
    if (this.config.errorPolicy === "failure_only") {
      return kind === "failure" ? FAILURE_TD_ERROR : SUCCESS_TD_ERROR;
    }
    return (kind === "failure" || kind === "operator_override") ? FAILURE_TD_ERROR : SUCCESS_TD_ERROR;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test seam — synchronous handler invocation
  // ──────────────────────────────────────────────────────────────────────────
  /** @internal — for tests only. */
  static __testHandle(payload: unknown): void {
    this.handleOutcomeCompleted(payload);
  }
}

export const outcomeReplayBufferBridgeEngine = OutcomeReplayBufferBridgeEngine;

// ============================================================================
// Dispatcher convenience wrapper
// ============================================================================

export function outcomeReplayBufferBridgeDispatch(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_replay_bridge_subscribe":
      return OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
    case "xproc_replay_bridge_unsubscribe":
      return OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes();
    case "xproc_replay_bridge_status":
      return {
        ok: true,
        subscribed: OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes(),
      };
    case "xproc_replay_bridge_configure":
      return OutcomeReplayBufferBridgeEngine.configure(params);
    case "xproc_replay_bridge_stats":
      return { ok: true, stats: OutcomeReplayBufferBridgeEngine.stats() };
    case "xproc_replay_bridge_sample_stratified":
      return OutcomeReplayBufferBridgeEngine.sampleStratified(params);
    case "xproc_replay_bridge_sample_prioritized":
      return OutcomeReplayBufferBridgeEngine.samplePrioritized(params);
    case "xproc_replay_bridge_reset":
      OutcomeReplayBufferBridgeEngine.reset();
      return { ok: true };
    default:
      throw new Error(`outcomeReplayBufferBridgeDispatch: unknown action '${action}'`);
  }
}
