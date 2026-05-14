/**
 * RedisCacheProvider — Optional Redis backing for CacheEngine
 *
 * Tries to connect to Redis on init. If unavailable, all operations
 * silently fall through (CacheEngine's in-memory LRU still works).
 *
 * Features:
 * - Per-key TTL with namespace prefix isolation
 * - TLS + Sentinel config support via REDIS_URL env
 * - Connection health monitoring with auto-reconnect
 * - Graceful degradation: never throws on Redis failure
 *
 * @version 1.0.0 — L1-B2 Redis Caching Layer
 */

import { log } from "../utils/Logger.js";

let Redis: any;
let redisAvailable = false;

try {
  Redis = (await import("ioredis")).default;
  redisAvailable = true;
} catch {
  // ioredis not installed — Redis features disabled
}

export interface RedisCacheConfig {
  url?: string;           // redis://host:port or rediss:// for TLS
  keyPrefix?: string;     // default: "prism:"
  defaultTtlMs?: number;  // default: 300_000 (5 min)
  maxRetriesPerRequest?: number;
  enableOfflineQueue?: boolean;
}

class RedisCacheProviderImpl {
  private client: any = null;
  private connected = false;
  private keyPrefix: string;
  private defaultTtlMs: number;
  private stats = { hits: 0, misses: 0, sets: 0, errors: 0 };

  constructor() {
    this.keyPrefix = "prism:";
    this.defaultTtlMs = 300_000;
  }

  async init(config: RedisCacheConfig = {}): Promise<boolean> {
    if (!redisAvailable) {
      log.info("[RedisCache] ioredis not available — using in-memory only");
      return false;
    }

    this.keyPrefix = config.keyPrefix ?? "prism:";
    this.defaultTtlMs = config.defaultTtlMs ?? 300_000;

    const url = config.url || process.env.REDIS_URL || "redis://127.0.0.1:6379";

    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
        enableOfflineQueue: config.enableOfflineQueue ?? false,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 5) return null; // stop retrying after 5 attempts
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on("connect", () => {
        this.connected = true;
        log.info("[RedisCache] Connected to Redis");
      });

      this.client.on("error", (err: Error) => {
        this.stats.errors++;
        if (this.connected) {
          log.warn(`[RedisCache] Redis error: ${err.message}`);
        }
        this.connected = false;
      });

      this.client.on("close", () => {
        this.connected = false;
      });

      await this.client.connect();
      return this.connected;
    } catch (err: any) {
      log.info(`[RedisCache] Redis not available (${err.message}) — using in-memory only`);
      this.client = null;
      return false;
    }
  }

  get isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  private fullKey(namespace: string, key: string): string {
    return `${this.keyPrefix}${namespace}:${key}`;
  }

  async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const raw = await this.client.get(this.fullKey(namespace, key));
      if (raw === null) {
        this.stats.misses++;
        return null;
      }
      this.stats.hits++;
      return JSON.parse(raw) as T;
    } catch {
      this.stats.errors++;
      return null;
    }
  }

  async set<T = unknown>(namespace: string, key: string, value: T, ttlMs?: number): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      const ttl = ttlMs ?? this.defaultTtlMs;
      const raw = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.set(this.fullKey(namespace, key), raw, "PX", ttl);
      } else {
        await this.client.set(this.fullKey(namespace, key), raw);
      }
      this.stats.sets++;
      return true;
    } catch {
      this.stats.errors++;
      return false;
    }
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      await this.client.del(this.fullKey(namespace, key));
      return true;
    } catch {
      this.stats.errors++;
      return false;
    }
  }

  async clear(namespace?: string): Promise<number> {
    if (!this.isConnected) return 0;
    try {
      const pattern = namespace
        ? `${this.keyPrefix}${namespace}:*`
        : `${this.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch {
      this.stats.errors++;
      return 0;
    }
  }

  getStats() {
    return {
      ...this.stats,
      connected: this.connected,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + "%"
        : "N/A",
    };
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore shutdown errors
      }
      this.client = null;
      this.connected = false;
    }
  }
}

/** Singleton Redis cache provider */
export const redisCacheProvider = new RedisCacheProviderImpl();
