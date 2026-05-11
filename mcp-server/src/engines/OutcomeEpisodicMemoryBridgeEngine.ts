/**
 * OutcomeEpisodicMemoryBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN08
 *
 * Bus subscriber that turns every terminal outcome into a stored
 * episode in CrossProcessEpisodicMemoryEngine, giving the NN
 * nearest-neighbor recall over past shop-floor runs. Closes the gap
 * where the episodic memory engine had a clean store()/recall() API
 * but nothing was feeding it from the live outcome stream.
 *
 * Subscription topic: `outcome.completed` (terminal transitions only).
 *
 * Per-event work (single subscriber callback):
 *
 *   1. Decode the OutcomeRecord from the bus envelope.
 *   2. Skip if outcome.kind is "pending" or unknown.
 *   3. Skip if process is not one of the episodic-memory supported
 *      processes ("mill" / "lathe" / "wedm") — same set as CN07.
 *   4. Build a structured key: {process, material, feature, decision}
 *      where:
 *        - process  ← record.process
 *        - material ← record.request_summary.material (default
 *          "unknown")
 *        - feature  ← record.request_summary.operation (default
 *          "unknown")
 *        - decision ← record.request_summary.decision OR derived
 *          from outcome.kind (success/marginal → "approved",
 *          failure → "approved" by default; "vetoed"/"override"
 *          require explicit signal in the request_summary)
 *   5. Extract numeric features from record.request_summary and
 *      record.response_summary — every finite numeric leaf becomes a
 *      feature with prefix (req_* or rsp_*) so the recall engine can
 *      cosine-similarity-rank past episodes. Non-finite or non-numeric
 *      values are silently dropped.
 *   6. Map outcome.kind → episodic OUTCOME ("success" | "marginal" |
 *      "fail") — same mapping as CN07.
 *   7. Call CrossProcessEpisodicMemoryEngine.store({key, features,
 *      outcome, metadata, ts}).
 *
 * Failure isolation:
 *   - Bus already wraps each subscriber callback in try/catch.
 *   - Inside the bridge, the store() call is independently try/catch'd
 *     and counted in `failures.episodic_store` so one bad event never
 *     disables the bridge.
 *
 * Acceptance (per ROADMAP CN08):
 *   - 100 terminal outcomes across 3 processes → episodic memory
 *     reports totalSize ≥ 100 (capped by tier capacity).
 *   - Calling .recall() with a partial key matching one of the stored
 *     episodes returns it in the top-K results.
 *
 * @engine OutcomeEpisodicMemoryBridgeEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN08
 * @see CrossProcessEpisodicMemoryEngine  — backing nearest-neighbor recall
 */

import { z } from "zod";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";
import { CrossProcessEpisodicMemoryEngine } from "./CrossProcessEpisodicMemoryEngine.js";

// ============================================================================
// Public types
// ============================================================================

export type EpisodicProcess = "mill" | "lathe" | "wedm";
export type EpisodicDecision = "approved" | "vetoed" | "override" | "pending";
export type EpisodicOutcome = "success" | "marginal" | "fail";

export interface EpisodicBridgeConfig {
  /**
   * Default decision label to use when the request_summary does not
   * carry an explicit decision field. The episodic memory key requires
   * a decision, and most events flowing through after an SF gate are
   * approved.
   */
  defaultDecision: EpisodicDecision;
  /**
   * Cap on the per-event feature vector size. Prevents a runaway
   * request_summary blob from blowing up memory.
   */
  maxFeatureCount: number;
}

export interface EpisodicBridgeStats {
  subscribed: boolean;
  total_events_seen: number;
  total_skipped_pending: number;
  total_skipped_unknown_process: number;
  total_stored: number;
  failures: {
    episodic_store: number;
    decode: number;
  };
  config: EpisodicBridgeConfig;
}

// ============================================================================
// Schemas
// ============================================================================

const ConfigureInputSchema = z.object({
  defaultDecision: z.enum(["approved", "vetoed", "override", "pending"]).optional(),
  maxFeatureCount: z.number().int().min(1).max(1000).optional(),
});

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DECISION: EpisodicDecision = "approved";
const DEFAULT_MAX_FEATURE_COUNT = 64;

/** Episodic-memory-supported processes — must match KEY_PROCESS on the engine. */
const VALID_EPISODIC_PROCESSES: ReadonlySet<EpisodicProcess> = new Set(["mill", "lathe", "wedm"]);

/** outcome.kind → EpisodicOutcome mapping. */
const OUTCOME_KIND_TO_EPISODIC: Record<string, EpisodicOutcome> = {
  success: "success",
  failure: "fail",
  operator_override: "marginal",
};

/** Decision values accepted on the request_summary. */
const VALID_DECISIONS: ReadonlySet<string> = new Set(["approved", "vetoed", "override", "pending"]);

// ============================================================================
// Engine
// ============================================================================

export class OutcomeEpisodicMemoryBridgeEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN08";

  // ──────────────────────────────────────────────────────────────────────────
  // State (module-private, reset()-able)
  // ──────────────────────────────────────────────────────────────────────────
  private static subscription: SubscriptionHandle | null = null;
  private static totalEvents = 0;
  private static skippedPending = 0;
  private static skippedUnknownProcess = 0;
  private static totalStored = 0;
  private static failStore = 0;
  private static failDecode = 0;
  private static config: EpisodicBridgeConfig = {
    defaultDecision: DEFAULT_DECISION,
    maxFeatureCount: DEFAULT_MAX_FEATURE_COUNT,
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
    | { ok: true; config: EpisodicBridgeConfig }
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
    if (parsed.data.defaultDecision !== undefined) {
      this.config.defaultDecision = parsed.data.defaultDecision;
    }
    if (parsed.data.maxFeatureCount !== undefined) {
      this.config.maxFeatureCount = parsed.data.maxFeatureCount;
    }
    return { ok: true, config: { ...this.config } };
  }

  static stats(): EpisodicBridgeStats {
    return {
      subscribed: this.subscription !== null,
      total_events_seen: this.totalEvents,
      total_skipped_pending: this.skippedPending,
      total_skipped_unknown_process: this.skippedUnknownProcess,
      total_stored: this.totalStored,
      failures: {
        episodic_store: this.failStore,
        decode: this.failDecode,
      },
      config: { ...this.config },
    };
  }

  /** Reset bridge state. Does NOT touch the downstream engine's state. */
  static reset(): void {
    if (this.subscription !== null) {
      feedbackBusEngine.unsubscribe(this.subscription);
      this.subscription = null;
    }
    this.totalEvents = 0;
    this.skippedPending = 0;
    this.skippedUnknownProcess = 0;
    this.totalStored = 0;
    this.failStore = 0;
    this.failDecode = 0;
    this.config = {
      defaultDecision: DEFAULT_DECISION,
      maxFeatureCount: DEFAULT_MAX_FEATURE_COUNT,
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
      process?: string;
      outcomeKind?: string;
      record?: {
        id?: string;
        process?: string;
        request_summary?: Record<string, unknown>;
        response_summary?: Record<string, unknown>;
        outcome?: { kind?: string };
      };
    };

    this.totalEvents += 1;

    const kind = env.record?.outcome?.kind ?? env.outcomeKind ?? "pending";
    const episodicOutcome = OUTCOME_KIND_TO_EPISODIC[kind];
    if (!episodicOutcome) {
      this.skippedPending += 1;
      return;
    }

    const proc = (env.record?.process ?? env.process) as EpisodicProcess | undefined;
    if (!proc || !VALID_EPISODIC_PROCESSES.has(proc)) {
      this.skippedUnknownProcess += 1;
      return;
    }

    const requestSummary = env.record?.request_summary ?? {};
    const responseSummary = env.record?.response_summary ?? {};

    const material = typeof requestSummary.material === "string" && requestSummary.material.length > 0
      ? (requestSummary.material as string)
      : "unknown";
    const feature = typeof requestSummary.operation === "string" && requestSummary.operation.length > 0
      ? (requestSummary.operation as string)
      : "unknown";
    const decisionRaw = typeof requestSummary.decision === "string" ? requestSummary.decision : undefined;
    const decision: EpisodicDecision = decisionRaw && VALID_DECISIONS.has(decisionRaw)
      ? (decisionRaw as EpisodicDecision)
      : this.config.defaultDecision;

    const features = this.extractNumericFeatures(requestSummary, responseSummary);

    try {
      const r = CrossProcessEpisodicMemoryEngine.store({
        key: { process: proc, material, feature, decision },
        features,
        outcome: episodicOutcome,
        metadata: {
          event_id: env.record?.id ?? env.id ?? "unknown",
          outcome_kind: kind,
        },
      });
      if (r.ok) {
        this.totalStored += 1;
      } else {
        this.failStore += 1;
      }
    } catch {
      this.failStore += 1;
    }
  }

  /**
   * Pull every finite numeric leaf out of request_summary + response_summary
   * into a flat feature record. Prefix with req_ / rsp_ to keep the two
   * scopes separable. Non-finite, non-numeric, and length-overflow values
   * are silently dropped.
   */
  private static extractNumericFeatures(
    requestSummary: Record<string, unknown>,
    responseSummary: Record<string, unknown>,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    let count = 0;
    const cap = this.config.maxFeatureCount;

    const ingest = (scope: "req" | "rsp", obj: Record<string, unknown>): void => {
      for (const [k, v] of Object.entries(obj)) {
        if (count >= cap) return;
        if (typeof v === "number" && Number.isFinite(v)) {
          out[`${scope}_${k}`] = v;
          count += 1;
        }
      }
    };

    ingest("req", requestSummary);
    ingest("rsp", responseSummary);

    return out;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test seam — synchronous handler invocation
  // ──────────────────────────────────────────────────────────────────────────
  /** @internal — for tests only. */
  static __testHandle(payload: unknown): void {
    this.handleOutcomeCompleted(payload);
  }
}

export const outcomeEpisodicMemoryBridgeEngine = OutcomeEpisodicMemoryBridgeEngine;

// ============================================================================
// Dispatcher convenience wrapper
// ============================================================================

export function outcomeEpisodicMemoryBridgeDispatch(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_episodic_bridge_subscribe":
      return OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
    case "xproc_episodic_bridge_unsubscribe":
      return OutcomeEpisodicMemoryBridgeEngine.unsubscribeFromOutcomes();
    case "xproc_episodic_bridge_status":
      return {
        ok: true,
        subscribed: OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes(),
      };
    case "xproc_episodic_bridge_configure":
      return OutcomeEpisodicMemoryBridgeEngine.configure(params);
    case "xproc_episodic_bridge_stats":
      return { ok: true, stats: OutcomeEpisodicMemoryBridgeEngine.stats() };
    case "xproc_episodic_bridge_reset":
      OutcomeEpisodicMemoryBridgeEngine.reset();
      return { ok: true };
    default:
      throw new Error(`outcomeEpisodicMemoryBridgeDispatch: unknown action '${action}'`);
  }
}
