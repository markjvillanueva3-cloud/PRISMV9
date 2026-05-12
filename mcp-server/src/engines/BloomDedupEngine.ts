/**
 * BloomDedupEngine — Fast Negative Deduplication Filter
 *
 * USSH Phase 0.25: Scientific Foundations — Complexity Theory Enhancement
 *
 * Provides O(1) probabilistic duplicate detection using Bloom filters.
 * Before expensive embedding lookup, check Bloom filter for definite non-duplicates.
 *
 * Mathematical Foundation:
 *   - False positive rate: (1 - e^(-kn/m))^k
 *   - For n=2000 items, m=1M bits, k=7 hashes: FPR ≈ 0.8%
 *   - Space: 128KB for 1M bits
 *   - Time: O(k) = O(1) per query
 *
 * Usage Pattern:
 *   1. Check Bloom filter first (fast, O(1))
 *   2. If filter returns "definitely not present" → skip expensive embedding
 *   3. If filter returns "might be present" → run full semantic dedup
 *
 * @module engines/BloomDedupEngine
 * @milestone USSH-P0.25/U-SCI01
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface BloomFilterConfig {
  size_bits: number;
  num_hashes: number;
  seed: number;
}

export interface BloomFilterStats {
  size_bits: number;
  num_hashes: number;
  items_added: number;
  estimated_fpr: number;
  fill_ratio: number;
  memory_bytes: number;
}

export interface DedupCheckResult {
  name: string;
  might_exist: boolean;
  checked_at: number;
  filter_used: string;
}

export interface BulkCheckResult {
  total: number;
  definite_new: number;
  possible_duplicates: number;
  results: DedupCheckResult[];
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: BloomFilterConfig = {
  size_bits: 1 << 20, // 1M bits = 128KB
  num_hashes: 7,
  seed: 0x9747b28c,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BloomDedupEngine {
  private config: BloomFilterConfig;
  private bits: Uint8Array;
  private itemCount: number;
  private filters: Map<string, BloomDedupEngine>;

  constructor(config?: Partial<BloomFilterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bits = new Uint8Array(Math.ceil(this.config.size_bits / 8));
    this.itemCount = 0;
    this.filters = new Map();
  }

  /**
   * Add a name to the Bloom filter.
   */
  add(name: string): void {
    const normalized = this.normalize(name);
    const hashes = this.computeHashes(normalized);

    for (const hash of hashes) {
      const idx = hash % this.config.size_bits;
      this.bits[idx >> 3] |= 1 << (idx & 7);
    }

    this.itemCount++;
  }

  /**
   * Add multiple names.
   */
  addBulk(names: string[]): number {
    let added = 0;
    for (const name of names) {
      this.add(name);
      added++;
    }
    return added;
  }

  /**
   * Check if a name might exist in the filter.
   * Returns false = definitely not present.
   * Returns true = might be present (check with expensive dedup).
   */
  mightContain(name: string): boolean {
    const normalized = this.normalize(name);
    const hashes = this.computeHashes(normalized);

    for (const hash of hashes) {
      const idx = hash % this.config.size_bits;
      if (!(this.bits[idx >> 3] & (1 << (idx & 7)))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for deduplication with result object.
   */
  checkDedup(name: string): DedupCheckResult {
    return {
      name,
      might_exist: this.mightContain(name),
      checked_at: Date.now(),
      filter_used: "default",
    };
  }

  /**
   * Bulk check multiple names.
   */
  checkBulk(names: string[]): BulkCheckResult {
    const results: DedupCheckResult[] = [];
    let definiteNew = 0;
    let possibleDuplicates = 0;

    for (const name of names) {
      const result = this.checkDedup(name);
      results.push(result);

      if (result.might_exist) {
        possibleDuplicates++;
      } else {
        definiteNew++;
      }
    }

    return {
      total: names.length,
      definite_new: definiteNew,
      possible_duplicates: possibleDuplicates,
      results,
    };
  }

  /**
   * Get filter statistics.
   */
  getStats(): BloomFilterStats {
    let bitsSet = 0;
    for (let i = 0; i < this.bits.length; i++) {
      let byte = this.bits[i];
      while (byte) {
        bitsSet += byte & 1;
        byte >>= 1;
      }
    }

    const fillRatio = bitsSet / this.config.size_bits;
    const k = this.config.num_hashes;
    const n = this.itemCount;
    const m = this.config.size_bits;

    // FPR = (1 - e^(-kn/m))^k
    const fpr = Math.pow(1 - Math.exp((-k * n) / m), k);

    return {
      size_bits: this.config.size_bits,
      num_hashes: this.config.num_hashes,
      items_added: this.itemCount,
      estimated_fpr: Math.min(fpr, 1),
      fill_ratio: fillRatio,
      memory_bytes: this.bits.length,
    };
  }

  /**
   * Calculate optimal parameters for given constraints.
   */
  static calculateOptimalParams(
    expectedItems: number,
    targetFpr: number
  ): { size_bits: number; num_hashes: number } {
    // m = -n * ln(p) / (ln(2)^2)
    const m = Math.ceil(
      (-expectedItems * Math.log(targetFpr)) / Math.pow(Math.log(2), 2)
    );

    // k = (m/n) * ln(2)
    const k = Math.round((m / expectedItems) * Math.log(2));

    return {
      size_bits: m,
      num_hashes: Math.max(1, Math.min(k, 20)), // Cap at 20 hashes
    };
  }

  /**
   * Create a filter optimized for expected items and FPR.
   */
  static createOptimized(
    expectedItems: number,
    targetFpr: number = 0.01
  ): BloomDedupEngine {
    const params = BloomDedupEngine.calculateOptimalParams(
      expectedItems,
      targetFpr
    );
    return new BloomDedupEngine(params);
  }

  /**
   * Create or get a named filter for a specific asset type.
   */
  getFilter(name: string): BloomDedupEngine {
    if (!this.filters.has(name)) {
      this.filters.set(name, new BloomDedupEngine(this.config));
    }
    return this.filters.get(name)!;
  }

  /**
   * Add to a named filter.
   */
  addToFilter(filterName: string, itemName: string): void {
    this.getFilter(filterName).add(itemName);
  }

  /**
   * Check in a named filter.
   */
  mightContainInFilter(filterName: string, itemName: string): boolean {
    const filter = this.filters.get(filterName);
    if (!filter) return false;
    return filter.mightContain(itemName);
  }

  /**
   * List all named filters.
   */
  listFilters(): string[] {
    return Array.from(this.filters.keys());
  }

  /**
   * Get stats for all filters.
   */
  getAllFilterStats(): Record<string, BloomFilterStats> {
    const result: Record<string, BloomFilterStats> = {};
    result["default"] = this.getStats();
    for (const [name, filter] of this.filters) {
      result[name] = filter.getStats();
    }
    return result;
  }

  /**
   * Estimate union FPR when combining with another filter.
   */
  estimateUnionFpr(other: BloomDedupEngine): number {
    const thisStats = this.getStats();
    const otherStats = other.getStats();

    // Union fill ratio approximation
    const combinedFill = Math.min(
      1,
      thisStats.fill_ratio + otherStats.fill_ratio
    );

    return Math.pow(combinedFill, this.config.num_hashes);
  }

  /**
   * Merge another filter into this one (union).
   */
  merge(other: BloomDedupEngine): void {
    if (other.config.size_bits !== this.config.size_bits) {
      throw new Error("Cannot merge filters of different sizes");
    }

    for (let i = 0; i < this.bits.length; i++) {
      this.bits[i] |= other.bits[i];
    }

    this.itemCount += other.itemCount;
  }

  /**
   * Clear the filter.
   */
  clear(): void {
    this.bits.fill(0);
    this.itemCount = 0;
  }

  /**
   * Clear all named filters.
   */
  clearAll(): void {
    this.clear();
    this.filters.clear();
  }

  /**
   * Get configuration.
   */
  getConfig(): BloomFilterConfig {
    return { ...this.config };
  }

  /**
   * Export filter state for persistence.
   */
  export(): { config: BloomFilterConfig; bits: number[]; itemCount: number } {
    return {
      config: this.config,
      bits: Array.from(this.bits),
      itemCount: this.itemCount,
    };
  }

  /**
   * Import filter state.
   */
  import(data: {
    config: BloomFilterConfig;
    bits: number[];
    itemCount: number;
  }): void {
    this.config = data.config;
    this.bits = new Uint8Array(data.bits);
    this.itemCount = data.itemCount;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/engine$/i, "")
      .replace(/[^a-z0-9]/gi, "")
      .trim();
  }

  private computeHashes(str: string): number[] {
    const hashes: number[] = [];

    // Use double hashing: h(i) = h1 + i*h2
    const h1 = this.murmurhash3(str, this.config.seed);
    const h2 = this.murmurhash3(str, h1);

    for (let i = 0; i < this.config.num_hashes; i++) {
      hashes.push(Math.abs((h1 + i * h2) | 0));
    }

    return hashes;
  }

  private murmurhash3(key: string, seed: number): number {
    let h1 = seed;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;

    for (let i = 0; i < key.length; i++) {
      let k1 = key.charCodeAt(i);

      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      h1 = Math.imul(h1, 5) + 0xe6546b64;
    }

    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }
}

// ============================================================================
// PREBUILT ASSET FILTERS
// ============================================================================

/**
 * Asset-type specific Bloom filters for fast dedup.
 */
export class AssetBloomFilters {
  private filters: Map<string, BloomDedupEngine>;

  constructor() {
    this.filters = new Map();

    // Initialize filters for common asset types
    const assetTypes = [
      "engine",
      "action",
      "skill",
      "hook",
      "formula",
      "algorithm",
      "tribal_tip",
      "playbook_rule",
      "schema",
      "dispatcher",
      "route",
      "test",
    ];

    for (const type of assetTypes) {
      // Optimized for ~2000 items with <1% FPR
      this.filters.set(type, BloomDedupEngine.createOptimized(2000, 0.01));
    }
  }

  /**
   * Add an asset name to its type filter.
   */
  add(assetType: string, name: string): void {
    const filter = this.filters.get(assetType);
    if (filter) {
      filter.add(name);
    } else {
      log.warn(`[BloomDedup] Unknown asset type: ${assetType}`);
    }
  }

  /**
   * Check if asset might exist.
   */
  mightContain(assetType: string, name: string): boolean {
    const filter = this.filters.get(assetType);
    if (!filter) return false;
    return filter.mightContain(name);
  }

  /**
   * Fast dedup check - returns true if definitely new.
   */
  isDefinitelyNew(assetType: string, name: string): boolean {
    return !this.mightContain(assetType, name);
  }

  /**
   * Get all filter stats.
   */
  getStats(): Record<string, BloomFilterStats> {
    const stats: Record<string, BloomFilterStats> = {};
    for (const [type, filter] of this.filters) {
      stats[type] = filter.getStats();
    }
    return stats;
  }

  /**
   * Load existing assets into filters.
   */
  loadExistingAssets(assets: { type: string; name: string }[]): number {
    let loaded = 0;
    for (const asset of assets) {
      this.add(asset.type, asset.name);
      loaded++;
    }
    log.info(`[BloomDedup] Loaded ${loaded} assets into Bloom filters`);
    return loaded;
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const bloomDedupEngine = new BloomDedupEngine();
export const assetBloomFilters = new AssetBloomFilters();
