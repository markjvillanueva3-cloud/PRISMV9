/**
 * WEDMParetoCacheEngine — WEDM AGI Phase 2 / U-P2-06
 *
 * Memoises WEDMParetoFrontierSearchEngine results by a canonical hash of
 * (material, bounds, NSGA-II knobs). NSGA-II is stochastic but the
 * frontier is strongly determined by the objectives + bounds, so cached
 * re-queries for the same configuration return instantly.
 *
 * Exit gate (P2-MS2):
 *   - Cache hit-rate ≥80 % across a workload of repeated queries.
 *
 * Cache policy:
 *   - LRU with configurable capacity (default 64 entries).
 *   - Entries carry hit_count for diagnostics.
 *   - invalidate() clears everything; invalidateMaterial(mat) clears one
 *     material family (useful when material DB is updated).
 */

import {
  wedmParetoFrontierSearchEngine,
  WEDMParetoFrontierSearchEngine,
  type WEDMSearchInput,
  type WEDMSearchResult,
} from "./WEDMParetoFrontierSearchEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface ParetoCacheStats {
  hits: number;
  misses: number;
  hit_rate: number;
  entries: number;
  capacity: number;
}

interface CacheEntry {
  key: string;
  material: string;
  result: WEDMSearchResult;
  hit_count: number;
  stored_at: number;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMParetoCacheEngine {
  private readonly cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly searcher: WEDMParetoFrontierSearchEngine = wedmParetoFrontierSearchEngine,
    private readonly capacity = 64,
  ) {}

  /**
   * Returns a cached frontier if one exists for this input, otherwise
   * runs NSGA-II, stores the result, and returns it.
   */
  search(input: WEDMSearchInput): WEDMSearchResult {
    const key = this.canonicalKey(input);
    const existing = this.cache.get(key);
    if (existing) {
      // Refresh LRU position.
      this.cache.delete(key);
      this.cache.set(key, existing);
      existing.hit_count += 1;
      this.hits += 1;
      return existing.result;
    }
    this.misses += 1;
    const result = this.searcher.search(input);
    this.store(key, input.material, result);
    return result;
  }

  /** Clear the entire cache. */
  invalidate(): void {
    this.cache.clear();
  }

  /** Remove every entry computed for a given material. */
  invalidateMaterial(material: string): number {
    let removed = 0;
    for (const [k, v] of this.cache) {
      if (v.material === material) {
        this.cache.delete(k);
        removed += 1;
      }
    }
    return removed;
  }

  /** Reset hit/miss counters (cache contents preserved). */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  stats(): ParetoCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hit_rate: total > 0 ? this.hits / total : 0,
      entries: this.cache.size,
      capacity: this.capacity,
    };
  }

  /** Peek without counting as a hit. */
  peek(input: WEDMSearchInput): WEDMSearchResult | null {
    return this.cache.get(this.canonicalKey(input))?.result ?? null;
  }

  // ─── internals ────────────────────────────────────────────

  private store(
    key: string,
    material: string,
    result: WEDMSearchResult,
  ): void {
    while (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      key,
      material,
      result,
      hit_count: 0,
      stored_at: Date.now(),
    });
  }

  /**
   * Deterministic stringification so permutations of optional fields don't
   * produce different keys. Bounds keys are sorted alphabetically.
   */
  private canonicalKey(input: WEDMSearchInput): string {
    const bounds = input.bounds ?? {};
    const sortedBounds = Object.keys(bounds)
      .sort()
      .map(
        (k) =>
          `${k}=${(bounds as Record<string, [number, number] | undefined>)[k]?.join(
            ",",
          )}`,
      )
      .join("|");
    return [
      `mat=${input.material}`,
      `pop=${input.population_size ?? "d"}`,
      `gen=${input.max_generations ?? "d"}`,
      `b=${sortedBounds}`,
    ].join(";");
  }
}

export const wedmParetoCacheEngine = new WEDMParetoCacheEngine();
