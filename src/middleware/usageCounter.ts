/**
 * Usage Counter — INFRA-3-2 U-AUTH2
 *
 * Redis-backed per-user per-feature daily usage counters for tier gate enforcement.
 * Falls back to in-memory when Redis unavailable.
 *
 * Key schema:
 *   prism:usage:{userId}:{feature}:{YYYY-MM-DD} → integer count
 *   TTL = seconds remaining until midnight UTC + 1h buffer
 *
 * Used by tierGate.requireTier() to get actual usage before checking limits.
 */
import type { Request, Response, NextFunction } from "express";
import { log } from "../utils/Logger.js";

// ============================================================================
// Interface
// ============================================================================

export interface IUsageCounter {
  mode: "redis" | "memory";
  /** Initialize — attempts Redis connection. */
  init(): Promise<boolean>;
  /** Increment usage for user+feature today. Returns new count. */
  increment(userId: string, feature: string): Promise<number>;
  /** Get current usage for user+feature today. */
  getUsage(userId: string, feature: string): Promise<number>;
  /** Get all feature usage for a user today. */
  getUserUsage(userId: string): Promise<Record<string, number>>;
  /** Reset a user's feature counter (admin). */
  reset(userId: string, feature: string): Promise<void>;
  /** Get stats. */
  getStats(): Promise<{ mode: string; tracked_keys: number }>;
  /** Close connections. */
  close(): Promise<void>;
}

// ============================================================================
// Helpers
// ============================================================================

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
}

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000) + 3600; // +1h buffer
}

function redisKey(userId: string, feature: string): string {
  return `prism:usage:${userId}:${feature}:${todayKey()}`;
}

// ============================================================================
// In-Memory Implementation (fallback)
// ============================================================================

class InMemoryUsageCounter implements IUsageCounter {
  mode = "memory" as const;
  /** Map<"userId:feature:date", count> */
  private counters = new Map<string, number>();

  async init(): Promise<boolean> { return false; }

  private key(userId: string, feature: string): string {
    return `${userId}:${feature}:${todayKey()}`;
  }

  async increment(userId: string, feature: string): Promise<number> {
    const k = this.key(userId, feature);
    const current = this.counters.get(k) ?? 0;
    const next = current + 1;
    this.counters.set(k, next);
    return next;
  }

  async getUsage(userId: string, feature: string): Promise<number> {
    return this.counters.get(this.key(userId, feature)) ?? 0;
  }

  async getUserUsage(userId: string): Promise<Record<string, number>> {
    const prefix = `${userId}:`;
    const today = todayKey();
    const result: Record<string, number> = {};
    for (const [k, v] of this.counters) {
      if (k.startsWith(prefix) && k.endsWith(`:${today}`)) {
        const feature = k.slice(prefix.length, k.length - today.length - 1);
        result[feature] = v;
      }
    }
    return result;
  }

  async reset(userId: string, feature: string): Promise<void> {
    this.counters.delete(this.key(userId, feature));
  }

  async getStats(): Promise<{ mode: string; tracked_keys: number }> {
    return { mode: "memory", tracked_keys: this.counters.size };
  }

  async close(): Promise<void> {
    this.counters.clear();
  }
}

// ============================================================================
// Redis Implementation
// ============================================================================

class RedisUsageCounter implements IUsageCounter {
  mode = "redis" as const;
  private client: any = null;
  private connected = false;
  private fallback = new InMemoryUsageCounter();

  async init(): Promise<boolean> {
    let Redis: any;
    try {
      Redis = (await import("ioredis")).default;
    } catch {
      log.info("[UsageCounter] ioredis not available — using in-memory");
      return false;
    }

    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 200, 2000)),
      });

      await this.client.connect();
      await this.client.ping();
      this.connected = true;
      log.info("[UsageCounter] Redis connected — usage counters are durable");
      return true;
    } catch (err: unknown) {
      log.warn(`[UsageCounter] Redis unavailable (${err instanceof Error ? err.message : String(err)}) — using in-memory`);
      this.connected = false;
      this.client = null;
      return false;
    }
  }

  async increment(userId: string, feature: string): Promise<number> {
    if (!this.connected) return this.fallback.increment(userId, feature);
    try {
      const key = redisKey(userId, feature);
      const pipeline = this.client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, secondsUntilMidnightUTC());
      const results = await pipeline.exec() as [Error | null, any][];
      const [err, count] = results[0];
      if (err) throw err;
      return count as number;
    } catch {
      return this.fallback.increment(userId, feature);
    }
  }

  async getUsage(userId: string, feature: string): Promise<number> {
    if (!this.connected) return this.fallback.getUsage(userId, feature);
    try {
      const val = await this.client.get(redisKey(userId, feature));
      return val ? parseInt(val, 10) : 0;
    } catch {
      return this.fallback.getUsage(userId, feature);
    }
  }

  async getUserUsage(userId: string): Promise<Record<string, number>> {
    if (!this.connected) return this.fallback.getUserUsage(userId);
    try {
      const pattern = `prism:usage:${userId}:*:${todayKey()}`;
      const result: Record<string, number> = {};
      let cursor = "0";
      do {
        const [next, keys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = next;
        if ((keys as string[]).length) {
          const pipeline = this.client.pipeline();
          for (const k of keys as string[]) pipeline.get(k);
          const vals = await pipeline.exec() as [Error | null, string | null][];
          for (let i = 0; i < (keys as string[]).length; i++) {
            const parts = (keys as string[])[i].split(":");
            // prism:usage:userId:feature:date → feature is parts[3]
            const feature = parts[3];
            const [err, val] = vals[i];
            if (!err && val) result[feature] = parseInt(val, 10);
          }
        }
      } while (cursor !== "0");
      return result;
    } catch {
      return this.fallback.getUserUsage(userId);
    }
  }

  async reset(userId: string, feature: string): Promise<void> {
    if (!this.connected) { await this.fallback.reset(userId, feature); return; }
    try {
      await this.client.del(redisKey(userId, feature));
    } catch {
      await this.fallback.reset(userId, feature);
    }
  }

  async getStats(): Promise<{ mode: string; tracked_keys: number }> {
    if (!this.connected) return this.fallback.getStats();
    try {
      let cursor = "0";
      let count = 0;
      do {
        const [next, keys] = await this.client.scan(cursor, "MATCH", "prism:usage:*", "COUNT", 500);
        cursor = next;
        count += (keys as string[]).length;
      } while (cursor !== "0");
      return { mode: "redis", tracked_keys: count };
    } catch {
      return { mode: "redis", tracked_keys: 0 };
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try { await this.client.quit(); } catch { /* ignore */ }
      this.client = null;
      this.connected = false;
    }
  }
}

// ============================================================================
// Factory + Singleton
// ============================================================================

let usageCounterInstance: IUsageCounter | null = null;

/**
 * Create the best available usage counter.
 * Tries Redis first, falls back to in-memory.
 */
export async function createUsageCounter(): Promise<IUsageCounter> {
  const redis = new RedisUsageCounter();
  const ok = await redis.init();
  if (ok) return redis;
  const mem = new InMemoryUsageCounter();
  await mem.init();
  return mem;
}

/**
 * Get or create the singleton usage counter.
 */
export async function getUsageCounter(): Promise<IUsageCounter> {
  if (!usageCounterInstance) {
    usageCounterInstance = await createUsageCounter();
  }
  return usageCounterInstance;
}

/**
 * Initialize the usage counter (called at startup).
 */
export async function initUsageCounter(): Promise<void> {
  usageCounterInstance = await createUsageCounter();
  log.info(`[UsageCounter] Initialized (${usageCounterInstance.mode} mode)`);
}

/**
 * Create an in-memory usage counter (for tests).
 */
export function createInMemoryUsageCounter(): IUsageCounter {
  return new InMemoryUsageCounter();
}

// ============================================================================
// Express middleware — track usage AFTER successful response
// ============================================================================

/**
 * Middleware that increments usage counter for the given feature
 * when the response completes successfully (2xx status).
 *
 * @param feature - feature name matching GatedFeature (e.g., "speed_feed")
 *
 * @example
 *   router.post("/calculate", verifyToken, requireTier("speed_feed"), trackUsage("speed_feed"), handler)
 */
export function trackUsage(feature: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Hook into response finish event
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = (req as any).userId ?? (req as any).user?.sub;
        if (userId) {
          // Fire and forget — don't block response
          getUsageCounter()
            .then(counter => counter.increment(userId, feature))
            .catch(() => { /* silent — non-critical */ });
        }
      }
    });
    next();
  };
}
