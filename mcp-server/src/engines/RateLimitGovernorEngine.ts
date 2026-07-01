/**
 * RateLimitGovernorEngine — HMPI05 token-bucket rate limiter (pure-core).
 *
 * Pure-core token-bucket: refill_rate tokens/sec, capacity max tokens.
 * The engine is a pure function over (state, now_at, cost) → next state +
 * verdict — caller persists state across calls.
 *
 * @module engines/RateLimitGovernorEngine
 */

import { z } from "zod";

export const BucketStateSchema = z.object({
  bucket_id: z.string().min(1).max(120),
  tokens: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  capacity: z.number().refine((v) => Number.isFinite(v) && v > 0, {}),
  refill_rate_per_sec: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  last_refill_at: z.string().min(1),
});
export type BucketState = z.infer<typeof BucketStateSchema>;

export interface RateLimitVerdict {
  allowed: boolean;
  state: BucketState;
  reason: string;
}

export class RateLimitGovernorEngine {
  static validate(s: unknown): BucketState { return BucketStateSchema.parse(s); }

  /** Initial state — bucket at full capacity. */
  static initial(bucket_id: string, capacity: number, refill_rate_per_sec: number, at: string): BucketState {
    if (capacity <= 0) throw new Error("RateLimit.initial: capacity must be positive");
    if (refill_rate_per_sec < 0) throw new Error("RateLimit.initial: refill_rate must be non-negative");
    return BucketStateSchema.parse({
      bucket_id, tokens: capacity, capacity, refill_rate_per_sec, last_refill_at: at,
    });
  }

  /** Refill tokens based on elapsed time since last_refill_at. */
  static refill(state: BucketState, now_at: string): BucketState {
    BucketStateSchema.parse(state);
    const elapsedMs = Math.max(0, Date.parse(now_at) - Date.parse(state.last_refill_at));
    const refilled = (elapsedMs / 1000) * state.refill_rate_per_sec;
    const newTokens = Math.min(state.capacity, state.tokens + refilled);
    return { ...state, tokens: newTokens, last_refill_at: now_at };
  }

  /** Try to consume `cost` tokens; refills first, then deducts if available. */
  static consume(state: BucketState, cost: number, now_at: string): RateLimitVerdict {
    if (!Number.isFinite(cost) || cost < 0) {
      throw new Error("RateLimit.consume: cost must be finite non-negative");
    }
    const refilled = RateLimitGovernorEngine.refill(state, now_at);
    if (refilled.tokens >= cost) {
      const next = { ...refilled, tokens: refilled.tokens - cost };
      return { allowed: true, state: next, reason: `consumed ${cost}, remaining ${next.tokens.toFixed(2)}` };
    }
    return {
      allowed: false, state: refilled,
      reason: `insufficient tokens: have ${refilled.tokens.toFixed(2)}, need ${cost}`,
    };
  }

  static renderState(s: BucketState): string {
    return `[RATE-LIMIT ${s.bucket_id}] ${s.tokens.toFixed(2)}/${s.capacity} (refill ${s.refill_rate_per_sec}/s)`;
  }
}

export const rateLimitGovernorEngine = RateLimitGovernorEngine;
