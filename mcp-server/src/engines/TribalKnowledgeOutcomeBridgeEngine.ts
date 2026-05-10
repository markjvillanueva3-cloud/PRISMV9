/**
 * TribalKnowledgeOutcomeBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN04
 *
 * Subscribes to FeedbackBus 'outcome.recorded' events and turns shop-floor
 * outcomes into candidate tribal-knowledge tips. Closes the fourth edge from
 * the system-viz analysis: TribalKnowledge currently has no inbound
 * outcome-driven discipline — every tip is curated or extracted from
 * documents, with no link back to actual run results.
 *
 * Discipline:
 *   - SUCCESS outcomes accumulate per (process, material, operation) bucket;
 *     once threshold is crossed (default 5), emit a candidate tip via
 *     `tribalKnowledgeEngine.capture()` with confidence proportional to
 *     accumulated count. Caller can adjust the threshold via configure().
 *   - FAILURE outcomes accumulate per bucket and trigger a contradiction
 *     event when threshold is hit (default 3). Currently the bridge surfaces
 *     contradictions in stats() — applying confidence decay to the matching
 *     existing tip is a future extension once TribalKnowledgeEngine exposes
 *     a `decayConfidence(id, factor)` API. The bridge already produces the
 *     correct contradiction signal so the downstream wire is ready.
 *   - PENDING / OVERRIDE outcomes are observed but do not emit candidate
 *     tips — pending lacks a terminal signal, override is operator policy
 *     that needs separate review (the U-NN-TIER03 reward shaper already
 *     handles override → reward).
 *
 * State:
 *   - per-bucket success/failure counts (in-memory map; survives bus events
 *     within a single MCP server lifetime)
 *   - emittedTips: id list returned from tribalKnowledgeEngine.capture() for
 *     audit / dedup against re-firing on the same bucket
 *
 * Subscribe is idempotent — repeat calls return alreadySubscribed=true.
 * Unsubscribe is idempotent — repeat calls return wasSubscribed=false.
 *
 * @engine TribalKnowledgeOutcomeBridgeEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN04
 * @see TribalKnowledgeEngine                — capture() target for emitted tips
 * @see CrossProcessOutcomeStore              — emits the outcome.recorded events
 * @see CrossProcessRewardShaperEngine        — sibling subscriber (TIER03)
 */

import { z } from "zod";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// Constants
// ============================================================================

/** Threshold of accumulated success events that triggers candidate tip emit. */
const DEFAULT_SUCCESS_THRESHOLD = 5;
/** Threshold of accumulated failures that triggers contradiction signal. */
const DEFAULT_FAILURE_THRESHOLD = 3;
/** Confidence floor applied to first-time-emitted candidate tips (0..100). */
const CANDIDATE_CONFIDENCE_FLOOR = 40;
/** Confidence ceiling applied to candidates regardless of accumulated count. */
const CANDIDATE_CONFIDENCE_CEILING = 80;
/** Confidence per accumulated success above floor: floor + (count - threshold) * step. */
const CANDIDATE_CONFIDENCE_STEP = 5;

// ============================================================================
// Types
// ============================================================================

export interface OutcomeBridgeConfig {
  /** Successes-per-bucket needed before emitting a candidate tip. ≥ 1. */
  successThreshold: number;
  /** Failures-per-bucket needed before emitting a contradiction signal. ≥ 1. */
  failureThreshold: number;
}

export interface BucketStats {
  process: string;
  material: string;
  operation: string;
  success_count: number;
  failure_count: number;
  override_count: number;
  pending_count: number;
  emitted_tip_ids: string[];
  contradiction_signaled_at: string[];
}

export interface OutcomeBridgeStats {
  total_events_seen: number;
  total_candidates_emitted: number;
  total_contradictions_signaled: number;
  buckets: BucketStats[];
  config: OutcomeBridgeConfig;
  subscribed: boolean;
}

const ConfigureInputSchema = z.object({
  successThreshold: z.number().int().min(1).optional(),
  failureThreshold: z.number().int().min(1).optional(),
});

// ============================================================================
// Engine
// ============================================================================

interface InternalBucket {
  process: string;
  material: string;
  operation: string;
  success: number;
  failure: number;
  override: number;
  pending: number;
  emittedIds: string[];
  contradictionEvents: string[];
}

function bucketKey(process: string, material: string, operation: string): string {
  return `${process}|${material}|${operation}`;
}

export class TribalKnowledgeOutcomeBridgeEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN04";

  private static subscription: SubscriptionHandle | null = null;
  private static buckets: Map<string, InternalBucket> = new Map();
  private static totalEvents = 0;
  private static totalCandidatesEmitted = 0;
  private static totalContradictionsSignaled = 0;
  private static config: OutcomeBridgeConfig = {
    successThreshold: DEFAULT_SUCCESS_THRESHOLD,
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
  };

  /**
   * Subscribe to FeedbackBus 'outcome.recorded'. Idempotent.
   */
  static subscribeToOutcomes(): { ok: true; alreadySubscribed: boolean } {
    if (this.subscription !== null) {
      return { ok: true, alreadySubscribed: true };
    }
    this.subscription = feedbackBusEngine.subscribe(
      "outcome.recorded",
      (event: FeedbackEvent) => {
        try {
          this.handleOutcomeRecorded(event.payload);
        } catch {
          // Swallow per bus-callback contract — bus already isolates errors.
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

  /** Update thresholds. Returns the (validated) effective config. */
  static configure(input: unknown): { ok: true; config: OutcomeBridgeConfig }
                                    | { ok: false; error: "invalid_input"; message: string } {
    const parsed = ConfigureInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    if (parsed.data.successThreshold !== undefined) this.config.successThreshold = parsed.data.successThreshold;
    if (parsed.data.failureThreshold !== undefined) this.config.failureThreshold = parsed.data.failureThreshold;
    return { ok: true, config: { ...this.config } };
  }

  static stats(): OutcomeBridgeStats {
    const buckets: BucketStats[] = [];
    for (const b of this.buckets.values()) {
      buckets.push({
        process: b.process,
        material: b.material,
        operation: b.operation,
        success_count: b.success,
        failure_count: b.failure,
        override_count: b.override,
        pending_count: b.pending,
        emitted_tip_ids: [...b.emittedIds],
        contradiction_signaled_at: [...b.contradictionEvents],
      });
    }
    return {
      total_events_seen: this.totalEvents,
      total_candidates_emitted: this.totalCandidatesEmitted,
      total_contradictions_signaled: this.totalContradictionsSignaled,
      buckets,
      config: { ...this.config },
      subscribed: this.subscription !== null,
    };
  }

  /** Reset bridge state (test-only — does NOT touch TribalKnowledgeEngine tips). */
  static reset(): void {
    if (this.subscription !== null) {
      feedbackBusEngine.unsubscribe(this.subscription);
      this.subscription = null;
    }
    this.buckets = new Map();
    this.totalEvents = 0;
    this.totalCandidatesEmitted = 0;
    this.totalContradictionsSignaled = 0;
    this.config = {
      successThreshold: DEFAULT_SUCCESS_THRESHOLD,
      failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal: handler for each bus event.
  // ──────────────────────────────────────────────────────────────────────────
  private static handleOutcomeRecorded(payload: unknown): void {
    if (!payload || typeof payload !== "object") return;
    const env = payload as {
      record?: {
        process?: string;
        outcome?: { kind?: string };
        request_summary?: { material?: unknown; operation?: unknown };
        id?: string;
      };
    };
    const record = env.record;
    if (!record) return;

    const process = typeof record.process === "string" ? record.process : "unknown";
    const material = typeof record.request_summary?.material === "string"
      ? (record.request_summary.material as string)
      : "unknown";
    const operation = typeof record.request_summary?.operation === "string"
      ? (record.request_summary.operation as string)
      : "unknown";
    const kind = record.outcome?.kind ?? "pending";

    this.totalEvents += 1;
    const key = bucketKey(process, material, operation);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        process, material, operation,
        success: 0, failure: 0, override: 0, pending: 0,
        emittedIds: [],
        contradictionEvents: [],
      };
      this.buckets.set(key, bucket);
    }

    switch (kind) {
      case "success": {
        bucket.success += 1;
        // Emit candidate when crossing the success threshold for the FIRST
        // time, then again every threshold-multiple thereafter (so a bucket
        // that keeps succeeding produces re-confirmed candidates with
        // increasing confidence).
        if (bucket.success >= this.config.successThreshold &&
            bucket.success % this.config.successThreshold === 0) {
          const tipId = this.emitCandidate(bucket);
          if (tipId) bucket.emittedIds.push(tipId);
        }
        break;
      }
      case "failure": {
        bucket.failure += 1;
        if (bucket.failure >= this.config.failureThreshold &&
            bucket.failure % this.config.failureThreshold === 0) {
          const ts = new Date().toISOString();
          bucket.contradictionEvents.push(ts);
          this.totalContradictionsSignaled += 1;
        }
        break;
      }
      case "operator_override": {
        bucket.override += 1;
        break;
      }
      case "pending":
      default: {
        bucket.pending += 1;
        break;
      }
    }
  }

  /**
   * Compose a candidate tip from accumulated bucket stats and call
   * `tribalKnowledgeEngine.capture()`. Returns the new tip id on success,
   * null on capture rejection.
   */
  private static emitCandidate(bucket: InternalBucket): string | null {
    const overshoot = bucket.success - this.config.successThreshold;
    const confidence = Math.max(
      CANDIDATE_CONFIDENCE_FLOOR,
      Math.min(
        CANDIDATE_CONFIDENCE_CEILING,
        CANDIDATE_CONFIDENCE_FLOOR + overshoot * CANDIDATE_CONFIDENCE_STEP,
      ),
    );
    // Include a per-emit timestamp in title + body so content-hash dedup in
    // TribalKnowledgeEngine.capture() doesn't reject re-confirmations from
    // the same bucket on subsequent threshold crossings (or across MCP server
    // restarts that re-load persisted captured tips into the dedup set).
    const stamp = new Date().toISOString();
    const tipDraft: Omit<KnowledgeTip, "id" | "created_at" | "usage_count"> = {
      title: `Outcome-derived: ${bucket.process} on ${bucket.material} (${bucket.operation}) — ${stamp} (n=${bucket.success})`,
      body: `Aggregated from ${bucket.success} successful shop-floor outcomes for ${bucket.process} process on material "${bucket.material}", operation "${bucket.operation}" at ${stamp}. Failures observed: ${bucket.failure}. Override events: ${bucket.override}. Candidate tip auto-emitted by TribalKnowledgeOutcomeBridgeEngine — pending operator confirmation before promotion to validated tip.`,
      category: "process_engineering",
      tags: ["outcome-derived", "candidate", `process:${bucket.process}`],
      material_groups: bucket.material !== "unknown" ? [bucket.material] : undefined,
      operation_types: bucket.operation !== "unknown" ? [bucket.operation] : undefined,
      confidence,
      source: `outcome-bridge:${bucket.process}|${bucket.material}|${bucket.operation}`,
    };
    const tip = tribalKnowledgeEngine.capture(tipDraft);
    if (!tip) return null;
    this.totalCandidatesEmitted += 1;
    return tip.id;
  }
}

export const tribalKnowledgeOutcomeBridgeEngine = TribalKnowledgeOutcomeBridgeEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function tribalKnowledgeOutcomeBridgeDispatch(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_tribal_subscribe_outcomes":
      return TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
    case "xproc_tribal_unsubscribe_outcomes":
      return TribalKnowledgeOutcomeBridgeEngine.unsubscribeFromOutcomes();
    case "xproc_tribal_outcome_subscription_status":
      return { ok: true, subscribed: TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes() };
    case "xproc_tribal_outcome_configure":
      return TribalKnowledgeOutcomeBridgeEngine.configure(params);
    case "xproc_tribal_outcome_stats":
      return { ok: true, stats: TribalKnowledgeOutcomeBridgeEngine.stats() };
    case "xproc_tribal_outcome_reset":
      TribalKnowledgeOutcomeBridgeEngine.reset();
      return { ok: true, reset: true };
    default:
      throw new Error(`tribalKnowledgeOutcomeBridgeDispatch: unknown action '${action}'`);
  }
}
