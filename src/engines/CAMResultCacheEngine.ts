/**
 * CAMResultCacheEngine — CK-MS12 U03
 *
 * In-memory LRU cache for CAM generation results with TTL support.
 *
 * Features:
 *   get(key)                   — retrieve cached result
 *   set(key, result, ttl_ms?)  — store result with optional TTL
 *   computeKey(params)         — deterministic FNV-1a hash from input params
 *   has(key)                   — check if cached and not expired
 *   invalidate(key)            — remove specific entry
 *   clear()                    — clear all cache
 *   stats()                    — hit/miss ratio, size, memory estimate
 */

import { log } from "../utils/Logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  key:        string;
  value:      T;
  created_at: number;   // Date.now()
  expires_at: number;   // Date.now() + ttl_ms
  hits:       number;
  size_bytes: number;   // rough estimate
  namespace:  string;
}

export interface CacheStats {
  entries:        number;
  hits:           number;
  misses:         number;
  hit_rate_pct:   number;
  evictions:      number;
  total_size_bytes: number;
  memory_kb:      number;
  namespaces:     Record<string, number>;
}

export interface CacheOptions {
  max_entries?: number;    // default 1000
  default_ttl_ms?: number; // default 30 min
  namespace?: string;      // logical partition
}

// ── FNV-1a 32-bit hash ────────────────────────────────────────────────────────

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // 32-bit multiply via safe integer arithmetic
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Normalize a value for stable key computation. */
function normalize(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === "number")  return Math.round(val * 1e6) / 1e6;
  if (typeof val === "string")  return val.trim();
  if (typeof val === "boolean") return val;
  if (Array.isArray(val))       return [...val].sort().map(normalize);
  if (typeof val === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(val as object).sort()) {
      sorted[k] = normalize((val as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return val;
}

// ── CAMResultCacheEngine ──────────────────────────────────────────────────────

export class CAMResultCacheEngine {
  readonly name    = "CAMResultCacheEngine";
  readonly version = "1.0.0";

  private _cache    = new Map<string, CacheEntry>();
  private _order: string[] = [];   // insertion order for LRU
  private _hits     = 0;
  private _misses   = 0;
  private _evictions = 0;

  readonly maxEntries:   number;
  readonly defaultTTL:   number;

  constructor(opts: CacheOptions = {}) {
    this.maxEntries = opts.max_entries    ?? 1000;
    this.defaultTTL = opts.default_ttl_ms ?? 30 * 60 * 1000; // 30 min
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Retrieve a cached value. Returns undefined on miss or expiry.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this._cache.get(key);
    if (!entry) {
      this._misses++;
      return undefined;
    }

    if (Date.now() > entry.expires_at) {
      this._evict(key);
      this._misses++;
      return undefined;
    }

    // LRU: move to end of order
    this._touchLRU(key);
    entry.hits++;
    this._hits++;
    return entry.value as T;
  }

  /**
   * Store a value with optional TTL (ms). Evicts LRU if at capacity.
   */
  set<T = unknown>(key: string, value: T, ttl_ms?: number, namespace = "default"): void {
    const now     = Date.now();
    const ttl     = ttl_ms ?? this.defaultTTL;
    const sizeEst = this._estimateSize(value);

    if (this._cache.has(key)) {
      // Update in-place
      const entry       = this._cache.get(key)!;
      entry.value       = value;
      entry.expires_at  = now + ttl;
      entry.size_bytes  = sizeEst;
      this._touchLRU(key);
      return;
    }

    // Evict LRU entries until under capacity
    while (this._cache.size >= this.maxEntries && this._order.length > 0) {
      this._evict(this._order[0]);
      this._evictions++;
    }

    this._cache.set(key, {
      key,
      value,
      created_at: now,
      expires_at: now + ttl,
      hits:       0,
      size_bytes: sizeEst,
      namespace,
    });
    this._order.push(key);
    log.debug(`[CAMResultCacheEngine] set: ${key} (ttl=${ttl}ms, size~${sizeEst}B)`);
  }

  /**
   * Compute a deterministic cache key from arbitrary params.
   * Namespace prefix keeps action types isolated.
   */
  computeKey(params: Record<string, unknown>, namespace = "default"): string {
    const normalized = normalize(params);
    const serialized = JSON.stringify(normalized);
    const hash       = fnv1a(serialized);
    return `${namespace}:${hash}`;
  }

  /**
   * Check if a key exists and has not expired.
   */
  has(key: string): boolean {
    const entry = this._cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires_at) {
      this._evict(key);
      return false;
    }
    return true;
  }

  /**
   * Remove a specific cache entry.
   */
  invalidate(key: string): boolean {
    if (!this._cache.has(key)) return false;
    this._evict(key);
    return true;
  }

  /**
   * Remove all entries in a namespace, or all entries if no namespace given.
   */
  clear(namespace?: string): void {
    if (!namespace) {
      this._cache.clear();
      this._order = [];
      log.debug("[CAMResultCacheEngine] clear: all entries removed");
      return;
    }
    for (const [key, entry] of this._cache) {
      if (entry.namespace === namespace) this._evict(key);
    }
  }

  /**
   * Return cache statistics.
   */
  stats(): CacheStats {
    const now        = Date.now();
    let totalSize    = 0;
    const namespaces: Record<string, number> = {};

    // Sweep expired entries
    for (const [key, entry] of this._cache) {
      if (now > entry.expires_at) {
        this._evict(key);
        continue;
      }
      totalSize += entry.size_bytes;
      namespaces[entry.namespace] = (namespaces[entry.namespace] ?? 0) + 1;
    }

    const total    = this._hits + this._misses;
    const hit_rate = total > 0 ? Math.round((this._hits / total) * 100) : 0;

    return {
      entries:          this._cache.size,
      hits:             this._hits,
      misses:           this._misses,
      hit_rate_pct:     hit_rate,
      evictions:        this._evictions,
      total_size_bytes: totalSize,
      memory_kb:        Math.round(totalSize / 1024),
      namespaces,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private _evict(key: string): void {
    this._cache.delete(key);
    const idx = this._order.indexOf(key);
    if (idx >= 0) this._order.splice(idx, 1);
  }

  private _touchLRU(key: string): void {
    const idx = this._order.indexOf(key);
    if (idx >= 0) this._order.splice(idx, 1);
    this._order.push(key);
  }

  private _estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 256; // fallback estimate
    }
  }
}

// Singleton export (shared across all callers)
export const camResultCacheEngine = new CAMResultCacheEngine();
