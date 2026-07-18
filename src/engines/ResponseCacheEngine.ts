/**
 * ResponseCacheEngine — Caches recent tool responses for deduplication
 *
 * Stores tool call results keyed by tool+params hash. When an identical
 * call is made within the TTL window, returns cached result instead of
 * re-executing. Configurable per-tool TTLs and max cache size.
 *
 * Token savings: 200-5000 tokens per cache hit.
 *
 * @version 1.0.0
 */

export interface CacheEntry {
  tool: string;
  params: string;
  result: string;
  tokens: number;
  timestamp: number;
  hits: number;
}

export interface CacheLookupResult {
  hit: boolean;
  entry?: CacheEntry;
  savedTokens?: number;
}

export interface CacheStats {
  entries: number;
  totalHits: number;
  totalSavedTokens: number;
  hitRate: number;
  topTools: Array<{ tool: string; hits: number; savedTokens: number }>;
}

const DEFAULT_TTLS: Record<string, number> = {
  Read: 60,
  Glob: 120,
  Grep: 90,
  WebFetch: 300,
  WebSearch: 300,
  "context7-query": 600,
};

export class ResponseCacheEngine {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs: number;
  private toolTtls: Record<string, number>;
  private maxEntries: number;
  private totalHits = 0;
  private totalSavedTokens = 0;

  constructor(defaultTtlSeconds = 120, maxEntries = 100) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.maxEntries = maxEntries;
    this.toolTtls = {};
    for (const [tool, secs] of Object.entries(DEFAULT_TTLS)) {
      this.toolTtls[tool] = secs * 1000;
    }
  }

  lookup(tool: string, params: Record<string, unknown>): CacheLookupResult {
    this.evictExpired();
    const key = this.makeKey(tool, params);
    const entry = this.cache.get(key);
    if (!entry) return { hit: false };
    const ttl = this.toolTtls[tool] ?? this.defaultTtlMs;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return { hit: false };
    }
    entry.hits++;
    this.totalHits++;
    this.totalSavedTokens += entry.tokens;
    return { hit: true, entry, savedTokens: entry.tokens };
  }

  store(tool: string, params: Record<string, unknown>, result: string): void {
    const key = this.makeKey(tool, params);
    const tokens = Math.ceil(result.length / 4);
    this.cache.set(key, {
      tool,
      params: JSON.stringify(params),
      result,
      tokens,
      timestamp: Date.now(),
      hits: 0,
    });
    if (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
  }

  invalidate(filePath: string): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.params.includes(filePath)) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  invalidateTool(tool: string): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tool === tool) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  setTtl(tool: string, seconds: number): void {
    this.toolTtls[tool] = seconds * 1000;
  }

  stats(): CacheStats {
    const toolMap = new Map<string, { hits: number; savedTokens: number }>();
    let totalLookups = this.totalHits;
    for (const entry of this.cache.values()) {
      const existing = toolMap.get(entry.tool) ?? { hits: 0, savedTokens: 0 };
      existing.hits += entry.hits;
      existing.savedTokens += entry.hits * entry.tokens;
      toolMap.set(entry.tool, existing);
      totalLookups++;
    }
    const topTools = Array.from(toolMap.entries())
      .map(([tool, data]) => ({ tool, ...data }))
      .sort((a, b) => b.savedTokens - a.savedTokens)
      .slice(0, 5);
    return {
      entries: this.cache.size,
      totalHits: this.totalHits,
      totalSavedTokens: this.totalSavedTokens,
      hitRate: totalLookups > 0 ? this.totalHits / totalLookups : 0,
      topTools,
    };
  }

  oneLiner(): string {
    const s = this.stats();
    return `Cache: ${s.entries} entries, ${s.totalHits} hits, ~${s.totalSavedTokens} tokens saved`;
  }

  reset(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalSavedTokens = 0;
  }

  private makeKey(tool: string, params: Record<string, unknown>): string {
    return `${tool}:${JSON.stringify(params, Object.keys(params).sort())}`;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const ttl = this.toolTtls[entry.tool] ?? this.defaultTtlMs;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const responseCacheEngine = new ResponseCacheEngine();
