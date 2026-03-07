/**
 * ResponseCacheEngine — In-memory result caching for expensive dispatcher calls
 *
 * Caches dispatcher results with TTL-based expiration.
 * Saves tokens by avoiding redundant tool calls for the same query.
 *
 * Features:
 * - TTL-based expiration (configurable per entry)
 * - LRU eviction when cache is full
 * - Cache key generation from action + params
 * - Hit/miss statistics
 * - Manual invalidation
 *
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

interface CacheEntry {
  key: string;
  data: any;
  expiresAt: number;
  createdAt: number;
  hits: number;
  lastAccess: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: string;
  evictions: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export class ResponseCacheEngine {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private totalHits = 0;
  private totalMisses = 0;
  private totalEvictions = 0;

  /**
   * @param maxSize Maximum cache entries (default: 200)
   * @param defaultTTL Default TTL in milliseconds (default: 5 min)
   */
  constructor(maxSize = 200, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a deterministic cache key from action + params.
   */
  makeKey(action: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .filter(k => k !== "action" && params[k] !== undefined)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join("&");
    return `${action}|${sortedParams}`;
  }

  /**
   * Get a cached result, or undefined if not found/expired.
   */
  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.totalMisses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.totalMisses++;
      return undefined;
    }

    entry.hits++;
    entry.lastAccess = Date.now();
    this.totalHits++;
    return entry.data;
  }

  /**
   * Store a result in the cache.
   */
  set(key: string, data: any, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      key,
      data,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      createdAt: Date.now(),
      hits: 0,
      lastAccess: Date.now()
    });
  }

  /**
   * Get or compute: returns cached value or calls compute function and caches result.
   */
  async getOrCompute<T>(key: string, compute: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached as T;

    const result = await compute();
    this.set(key, result, ttl);
    return result;
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g., all "speed_feed_calc|" entries).
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) log.info(`[ResponseCache] Invalidated ${count} entries matching "${prefix}"`);
    return count;
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
    log.info("[ResponseCache] Cache cleared");
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    let oldest: CacheEntry | null = null;
    let newest: CacheEntry | null = null;

    for (const entry of this.cache.values()) {
      if (!oldest || entry.createdAt < oldest.createdAt) oldest = entry;
      if (!newest || entry.createdAt > newest.createdAt) newest = entry;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.totalHits,
      misses: this.totalMisses,
      hitRate: total > 0 ? `${((this.totalHits / total) * 100).toFixed(1)}%` : "N/A",
      evictions: this.totalEvictions,
      oldestEntry: oldest ? oldest.key : null,
      newestEntry: newest ? newest.key : null
    };
  }

  // ── Private ──────────────────────────────────────────────────

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.totalEvictions++;
    }
  }
}

export const responseCacheEngine = new ResponseCacheEngine();
