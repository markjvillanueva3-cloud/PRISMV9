// WIRE-EXEMPT: library helper for destructive-op rate limiting; invoked by hooks, not a standalone dispatcher action
/**
 * BlastDampenerEngine — U-FORE-17 (Reliability Substrate)
 *
 * Rate-limiter for destructive operations — sliding-window counters
 * per (kind, target), refuses acquires beyond configured thresholds.
 */

export interface BlastPolicy {
  maxOps: number;
  windowMs: number;
}

export interface AcquireResult {
  ok: boolean;
  remaining: number;
  retryAfterMs?: number;
  reason?: string;
}

const DEFAULT_POLICIES: Record<string, BlastPolicy> = {
  delete: { maxOps: 10, windowMs: 60_000 },
  git_push_force: { maxOps: 1, windowMs: 300_000 },
  dispatcher_action_remove: { maxOps: 5, windowMs: 60_000 },
  engine_delete: { maxOps: 3, windowMs: 60_000 },
};

export class BlastDampenerEngine {
  readonly name = "BlastDampenerEngine";
  private policies: Map<string, BlastPolicy>;
  private buckets: Map<string, number[]> = new Map();
  private clock: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
    this.policies = new Map(Object.entries(DEFAULT_POLICIES));
  }

  setPolicy(kind: string, policy: BlastPolicy): void {
    if (!kind || typeof kind !== "string") throw new Error("BlastDampenerEngine.setPolicy: kind required");
    if (!policy || !Number.isFinite(policy.maxOps) || policy.maxOps <= 0) {
      throw new Error("BlastDampenerEngine.setPolicy: maxOps must be a positive number");
    }
    if (!Number.isFinite(policy.windowMs) || policy.windowMs <= 0) {
      throw new Error("BlastDampenerEngine.setPolicy: windowMs must be a positive number");
    }
    this.policies.set(kind, { maxOps: policy.maxOps, windowMs: policy.windowMs });
  }

  tryAcquire(kind: string, target: string): AcquireResult {
    if (!kind) throw new Error("BlastDampenerEngine.tryAcquire: kind required");
    if (!target) throw new Error("BlastDampenerEngine.tryAcquire: target required");
    const policy = this.policies.get(kind);
    if (!policy) return { ok: true, remaining: Infinity };

    const key = `${kind}:${target}`;
    const now = this.clock();
    const windowStart = now - policy.windowMs;
    const times = (this.buckets.get(key) ?? []).filter((t) => t > windowStart);

    if (times.length >= policy.maxOps) {
      const oldest = times[0];
      const retryAfterMs = oldest + policy.windowMs - now;
      this.buckets.set(key, times);
      return {
        ok: false,
        remaining: 0,
        retryAfterMs: Math.max(1, retryAfterMs),
        reason: `rate_limit:${kind}:${policy.maxOps}/${policy.windowMs}ms`,
      };
    }

    times.push(now);
    this.buckets.set(key, times);
    return { ok: true, remaining: policy.maxOps - times.length };
  }

  record(kind: string, target: string): AcquireResult {
    return this.tryAcquire(kind, target);
  }

  reset(filter?: { kind?: string; target?: string }): void {
    if (!filter) {
      this.buckets.clear();
      return;
    }
    const prefix = filter.kind ? `${filter.kind}:` : undefined;
    for (const key of Array.from(this.buckets.keys())) {
      if (prefix && !key.startsWith(prefix)) continue;
      if (filter.target && !key.endsWith(`:${filter.target}`)) continue;
      this.buckets.delete(key);
    }
  }

  status(): Array<{ key: string; count: number; policy?: BlastPolicy }> {
    const now = this.clock();
    const entries: Array<{ key: string; count: number; policy?: BlastPolicy }> = [];
    for (const [key, times] of this.buckets) {
      const kind = key.split(":")[0];
      const policy = this.policies.get(kind);
      const active = policy ? times.filter((t) => t > now - policy.windowMs) : times;
      entries.push({ key, count: active.length, policy });
    }
    return entries;
  }

  policyKinds(): string[] {
    return Array.from(this.policies.keys());
  }
}

export const blastDampenerEngine = new BlastDampenerEngine();
