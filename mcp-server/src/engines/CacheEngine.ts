/**
 * CacheEngine — L2-P3-MS1 Infrastructure Layer
 *
 * In-memory LRU cache with TTL support, namespace isolation,
 * hit/miss statistics, and bulk operations.
 * Supports external TTL configuration via ~/.prism/cache-config.json.
 *
 * Actions: cache_get, cache_set, cache_delete, cache_clear, cache_stats
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// EXTERNAL CONFIG TYPES
// ============================================================================

interface ExternalCacheEntry {
  ttl_ms: number;
  target_stale_rate?: number;
}

interface ExternalCacheConfig {
  caches: Record<string, ExternalCacheEntry>;
}

/** Loaded external config (null = not yet loaded, undefined = no file / invalid) */
let _externalConfig: ExternalCacheConfig | null | undefined = null;

// ============================================================================
// TYPES
// ============================================================================

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  namespace: string;
  created_at: number;
  expires_at: number;
  last_accessed: number;
  access_count: number;
  size_bytes: number;
}

/** Cache Stats configuration/data structure.
 */
export interface CacheStats {
  total_entries: number;
  total_size_bytes: number;
  hit_count: number;
  miss_count: number;
  hit_rate_pct: number;
  eviction_count: number;
  namespaces: string[];
  oldest_entry_age_sec: number;
}

/** Cache Config configuration/data structure.
 */
export interface CacheConfig {
  max_entries: number;
  max_size_bytes: number;
  default_ttl_sec: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  max_entries: 10000,
  max_size_bytes: 50 * 1024 * 1024, // 50 MB
  default_ttl_sec: 3600,             // 1 hour
};

/** Cache Engine engine/manager.
 */
export class CacheEngine {
  private entries = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get<T = unknown>(key: string, namespace: string = "default"): T | undefined {
    const fullKey = `${namespace}:${key}`;
    const entry = this.entries.get(fullKey);

    /** If.
     * @param !entry - !entry
     * @returns void
     */
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expires_at) {
      this.entries.delete(fullKey);
      this.removeFromOrder(fullKey);
      this.misses++;
      return undefined;
    }

    entry.last_accessed = Date.now();
    entry.access_count++;
    this.promoteInOrder(fullKey);
    this.hits++;

    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, namespace: string = "default", ttl_sec?: number): boolean {
    const fullKey = `${namespace}:${key}`;
    const ttl = ttl_sec ?? this.config.default_ttl_sec;
    const sizeBytes = this.estimateSize(value);
    const now = Date.now();

    // Evict if needed
    while (this.entries.size >= this.config.max_entries || this.totalSize() + sizeBytes > this.config.max_size_bytes) {
      if (!this.evictLRU()) break;
    }

    const entry: CacheEntry<T> = {
      key, value, namespace,
      created_at: now,
      expires_at: now + ttl * 1000,
      last_accessed: now,
      access_count: 0,
      size_bytes: sizeBytes,
    };

    // Remove old entry if exists
    if (this.entries.has(fullKey)) {
      this.removeFromOrder(fullKey);
    }

    this.entries.set(fullKey, entry as CacheEntry);
    this.accessOrder.push(fullKey);
    return true;
  }

  /** Delete.
   * @param key - key identifier
   * @param namespace - namespace
   * @returns true if condition is met
   */
  delete(key: string, namespace: string = "default"): boolean {
    const fullKey = `${namespace}:${key}`;
    const existed = this.entries.delete(fullKey);
    if (existed) this.removeFromOrder(fullKey);
    return existed;
  }

  /** Checks whether has.
   * @param key - key identifier
   * @param namespace - namespace
   * @returns true if condition is met
   */
  has(key: string, namespace: string = "default"): boolean {
    const fullKey = `${namespace}:${key}`;
    const entry = this.entries.get(fullKey);
    if (!entry) return false;
    if (Date.now() > entry.expires_at) {
      this.entries.delete(fullKey);
      this.removeFromOrder(fullKey);
      return false;
    }
    return true;
  }

  /** Clears namespace.
   * @param namespace - namespace
   * @returns computed numeric result
   */
  clearNamespace(namespace: string): number {
    let count = 0;
    /** For.
     * @param const - const
     * @param entry] - entry]
     * @returns void
     */
    for (const [key, entry] of this.entries) {
      /** If.
       * @param entry.namespace - entry.namespace
       * @returns void
       */
      if (entry.namespace === namespace) {
        this.entries.delete(key);
        this.removeFromOrder(key);
        count++;
      }
    }
    return count;
  }

  /** Clears all.
   * @returns void
   */
  clearAll(): void {
    this.entries.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /** Stats.
   * @returns cache stats
   */
  stats(): CacheStats {
    const namespaces = new Set<string>();
    let oldestAge = 0;
    const now = Date.now();

    for (const entry of this.entries.values()) {
      namespaces.add(entry.namespace);
      const age = (now - entry.created_at) / 1000;
      if (age > oldestAge) oldestAge = age;
    }

    const totalRequests = this.hits + this.misses;
    return {
      total_entries: this.entries.size,
      total_size_bytes: this.totalSize(),
      hit_count: this.hits,
      miss_count: this.misses,
      hit_rate_pct: totalRequests > 0 ? Math.round(this.hits / totalRequests * 1000) / 10 : 0,
      eviction_count: this.evictions,
      namespaces: [...namespaces],
      oldest_entry_age_sec: Math.round(oldestAge),
    };
  }

  /** Gets config.
   * @returns cache config
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Load external TTL configuration from ~/.prism/cache-config.json.
   * If the file exists and is valid, returns the parsed config.
   * If the file is missing or invalid, returns null (no crash).
   */
  static loadExternalConfig(): ExternalCacheConfig | null {
    if (_externalConfig !== null) {
      return _externalConfig ?? null;
    }
    const configPath = join(homedir(), '.prism', 'cache-config.json');
    try {
      if (existsSync(configPath)) {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw) as ExternalCacheConfig;
        if (parsed && typeof parsed.caches === 'object') {
          _externalConfig = parsed;
          // External cache config loaded from ~/.prism/cache-config.json
          return parsed;
        }
      }
    } catch {
      // Invalid or unreadable config — silently use defaults
    }
    _externalConfig = undefined;
    return null;
  }

  /**
   * Get the configured TTL (in seconds) for a named cache from external config.
   * Falls back to the engine's default_ttl_sec if no external config or no entry.
   */
  static getConfiguredTTLSec(cacheName: string, fallbackSec: number): number {
    const ext = CacheEngine.loadExternalConfig();
    if (ext && ext.caches[cacheName]) {
      return ext.caches[cacheName].ttl_ms / 1000;
    }
    return fallbackSec;
  }

  /**
   * Apply external config overrides to this instance's default TTL.
   * Call with the logical cache name (e.g. "ActionSchemaCache").
   * If ~/.prism/cache-config.json has a matching entry, overrides default_ttl_sec.
   */
  applyExternalConfig(cacheName: string): void {
    const ext = CacheEngine.loadExternalConfig();
    if (ext && ext.caches[cacheName]) {
      this.config.default_ttl_sec = ext.caches[cacheName].ttl_ms / 1000;
    }
  }

  // ---- PRIVATE ----

  private totalSize(): number {
    let size = 0;
    for (const e of this.entries.values()) size += e.size_bytes;
    return size;
  }

  private evictLRU(): boolean {
    if (this.accessOrder.length === 0) return false;
    const oldest = this.accessOrder.shift()!;
    this.entries.delete(oldest);
    this.evictions++;
    return true;
  }

  private removeFromOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
  }

  private promoteInOrder(key: string): void {
    this.removeFromOrder(key);
    this.accessOrder.push(key);
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // rough UTF-16 estimate
    } catch {
      return 256;
    }
  }
}

/** Cache Engine constant.
 */
export const cacheEngine = new CacheEngine();

// Apply external config to the default singleton (uses "GenericCache" key)
cacheEngine.applyExternalConfig('GenericCache');
