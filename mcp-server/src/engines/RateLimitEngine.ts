/**
 * RateLimitEngine — L2-P3-MS1 Infrastructure Layer
 * *** SECURITY CRITICAL ***
 *
 * Rate limiting with token bucket and sliding window algorithms.
 * Protects endpoints from abuse, enforces per-tenant/per-user/per-IP
 * request budgets. Supports burst allowance and cooldown periods.
 *
 * Actions: rate_check, rate_consume, rate_status, rate_reset, rate_configure
 */

// ============================================================================
// TYPES
// ============================================================================

export type RateLimitAlgorithm = "token_bucket" | "sliding_window" | "fixed_window";

export interface RateLimitRule {
  id: string;
  name: string;
  algorithm: RateLimitAlgorithm;
  scope: "global" | "per_tenant" | "per_user" | "per_ip";
  max_requests: number;
  window_sec: number;
  burst_allowance: number;
  cooldown_sec: number;
}

export interface RateLimitState {
  rule_id: string;
  key: string;
  remaining: number;
  total: number;
  reset_at: string;
  is_limited: boolean;
  retry_after_sec: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset_at: string;
  retry_after_sec: number;
  rule_id: string;
  key: string;
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

interface BucketState {
  tokens: number;
  last_refill: number;
  window_start: number;
  request_count: number;
  cooldown_until: number;
}

// ============================================================================
// DEFAULT RULES
// ============================================================================

const DEFAULT_RULES: RateLimitRule[] = [
  { id: "RL-API-GLOBAL", name: "Global API", algorithm: "token_bucket", scope: "global", max_requests: 10000, window_sec: 60, burst_allowance: 500, cooldown_sec: 30 },
  { id: "RL-API-TENANT", name: "Per-Tenant API", algorithm: "sliding_window", scope: "per_tenant", max_requests: 1000, window_sec: 60, burst_allowance: 100, cooldown_sec: 15 },
  { id: "RL-API-USER", name: "Per-User API", algorithm: "sliding_window", scope: "per_user", max_requests: 200, window_sec: 60, burst_allowance: 30, cooldown_sec: 10 },
  { id: "RL-AUTH", name: "Auth Endpoints", algorithm: "fixed_window", scope: "per_ip", max_requests: 10, window_sec: 300, burst_allowance: 0, cooldown_sec: 60 },
  { id: "RL-EXPORT", name: "Export Endpoints", algorithm: "token_bucket", scope: "per_user", max_requests: 20, window_sec: 3600, burst_allowance: 5, cooldown_sec: 120 },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class RateLimitEngine {
  private rules = new Map<string, RateLimitRule>();
  private buckets = new Map<string, BucketState>();

  constructor() {
    for (const r of DEFAULT_RULES) this.rules.set(r.id, r);
  }

  check(ruleId: string, key: string): RateLimitCheckResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return { allowed: true, remaining: 999, limit: 999, reset_at: new Date().toISOString(), retry_after_sec: 0, rule_id: ruleId, key };
    }

    const bucket = this.getOrCreateBucket(rule, key);
    this.refillBucket(rule, bucket);

    const now = Date.now();
    if (bucket.cooldown_until > now) {
      const retryAfter = Math.ceil((bucket.cooldown_until - now) / 1000);
      return { allowed: false, remaining: 0, limit: rule.max_requests, reset_at: new Date(bucket.cooldown_until).toISOString(), retry_after_sec: retryAfter, rule_id: ruleId, key };
    }

    const allowed = bucket.tokens > 0;
    const resetAt = new Date(bucket.window_start + rule.window_sec * 1000).toISOString();

    return {
      allowed,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      limit: rule.max_requests + rule.burst_allowance,
      reset_at: resetAt,
      retry_after_sec: allowed ? 0 : Math.ceil((bucket.window_start + rule.window_sec * 1000 - now) / 1000),
      rule_id: ruleId,
      key,
    };
  }

  consume(ruleId: string, key: string, count: number = 1): RateLimitCheckResult {
    const checkResult = this.check(ruleId, key);
    if (!checkResult.allowed) return checkResult;

    const rule = this.rules.get(ruleId)!;
    const bucketKey = `${ruleId}:${key}`;
    const bucket = this.buckets.get(bucketKey)!;

    bucket.tokens = Math.max(0, bucket.tokens - count);
    bucket.request_count += count;

    // Trigger cooldown if exhausted
    if (bucket.tokens <= 0 && rule.cooldown_sec > 0) {
      bucket.cooldown_until = Date.now() + rule.cooldown_sec * 1000;
    }

    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      limit: rule.max_requests + rule.burst_allowance,
      reset_at: new Date(bucket.window_start + rule.window_sec * 1000).toISOString(),
      retry_after_sec: 0,
      rule_id: ruleId,
      key,
    };
  }

  status(ruleId: string, key: string): RateLimitState {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return { rule_id: ruleId, key, remaining: 0, total: 0, reset_at: new Date().toISOString(), is_limited: true, retry_after_sec: 0 };
    }

    const checkResult = this.check(ruleId, key);
    return {
      rule_id: ruleId,
      key,
      remaining: checkResult.remaining,
      total: checkResult.limit,
      reset_at: checkResult.reset_at,
      is_limited: !checkResult.allowed,
      retry_after_sec: checkResult.retry_after_sec,
    };
  }

  reset(ruleId: string, key: string): boolean {
    const bucketKey = `${ruleId}:${key}`;
    return this.buckets.delete(bucketKey);
  }

  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
  }

  listRules(): RateLimitRule[] {
    return [...this.rules.values()];
  }

  clear(): void {
    this.buckets.clear();
  }

  // ---- PRIVATE ----

  private getOrCreateBucket(rule: RateLimitRule, key: string): BucketState {
    const bucketKey = `${rule.id}:${key}`;
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        tokens: rule.max_requests + rule.burst_allowance,
        last_refill: Date.now(),
        window_start: Date.now(),
        request_count: 0,
        cooldown_until: 0,
      };
      this.buckets.set(bucketKey, bucket);
    }
    return bucket;
  }

  private refillBucket(rule: RateLimitRule, bucket: BucketState): void {
    const now = Date.now();
    const elapsed = (now - bucket.last_refill) / 1000;

    if (rule.algorithm === "token_bucket") {
      const refillRate = (rule.max_requests + rule.burst_allowance) / rule.window_sec;
      bucket.tokens = Math.min(rule.max_requests + rule.burst_allowance, bucket.tokens + elapsed * refillRate);
      bucket.last_refill = now;
    } else if (rule.algorithm === "fixed_window") {
      if (now - bucket.window_start > rule.window_sec * 1000) {
        bucket.tokens = rule.max_requests + rule.burst_allowance;
        bucket.window_start = now;
        bucket.request_count = 0;
        bucket.last_refill = now;
      }
    } else {
      // sliding_window: proportional refill
      const windowMs = rule.window_sec * 1000;
      const ratio = Math.min(1, elapsed * 1000 / windowMs);
      bucket.tokens = Math.min(rule.max_requests + rule.burst_allowance, bucket.tokens + ratio * rule.max_requests);
      bucket.last_refill = now;
    }
  }
}

export const rateLimitEngine = new RateLimitEngine();
