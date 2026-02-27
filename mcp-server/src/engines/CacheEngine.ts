/**
 * CacheEngine — L2-P3-MS1 Infrastructure Layer
 *
 * In-memory LRU cache with TTL support, namespace isolation,
 * hit/miss statistics, and bulk operations.
 *
 * Actions: cache_get, cache_set, cache_delete, cache_clear, cache_stats
 */

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

  delete(key: string, namespace: string = "default"): boolean {
    const fullKey = `${namespace}:${key}`;
    const existed = this.entries.delete(fullKey);
    if (existed) this.removeFromOrder(fullKey);
    return existed;
  }

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

  clearNamespace(namespace: string): number {
    let count = 0;
    for (const [key, entry] of this.entries) {
      if (entry.namespace === namespace) {
        this.entries.delete(key);
        this.removeFromOrder(key);
        count++;
      }
    }
    return count;
  }

  clearAll(): void {
    this.entries.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

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

  getConfig(): CacheConfig {
    return { ...this.config };
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

export const cacheEngine = new CacheEngine();
