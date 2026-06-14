/**
 * MillLoRAEmbeddingCacheEngine
 * ===============================
 *
 * Caches embedding vectors for Mill LoRA inputs. Reduces redundant
 * embedding computation for similar inputs. Mill parity for
 * LatheLoRAEmbeddingCacheEngine (LATHE-LORA-MS0 U-LLR35) with two
 * MILL-CANONICAL extensions:
 *
 *   - mill_op_type filter — restrict similarity search to entries with
 *     a matching op type so a 5-axis-simul embedding doesn't match a
 *     3-axis face-milling embedding during retrieval
 *   - feature_signature filter — restrict by part-family signature
 *     (prismatic / pocket_2_5d / mold_3d / thin_wall — matches iter71
 *     MillPartClassifier taxonomy)
 *
 * Features:
 *   - Semantic similarity caching with cosine similarity
 *   - LRU / LFU / FIFO eviction policies
 *   - MILL-CANONICAL filtered similarity search (op_type + feature_signature)
 *   - Cache hit/miss metrics
 *
 * @module engines/MillLoRAEmbeddingCacheEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-EMBEDDING-CACHE (iter88)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_MAX_ENTRIES = 1000;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.92;
export const DEFAULT_EMBEDDING_DIMENSION = 768;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Mill operation type — drives MILL-CANONICAL filter axis. */
export type MillOpType =
  | "face"
  | "pocket_2_5d"
  | "pocket_3d"
  | "contour"
  | "drill"
  | "tap"
  | "thread_mill"
  | "boring"
  | "5_axis_simul"
  | "4_axis_index"
  | "engraving"
  | "other";

/** Part feature signature — matches iter71 MillPartClassifier families. */
export type MillFeatureSignature = "prismatic" | "pocket_2_5d" | "mold_3d" | "thin_wall" | "other";

export interface MillCacheEntry {
  id: string;
  input: string;
  embedding: number[];
  created_at: number;
  last_accessed: number;
  hit_count: number;
  /** MILL-CANONICAL: operation type tag */
  op_type?: MillOpType;
  /** MILL-CANONICAL: feature signature tag */
  feature_signature?: MillFeatureSignature;
  metadata?: Record<string, unknown>;
}

export interface MillSimilarityMatch {
  entry: MillCacheEntry;
  similarity: number;
}

export interface MillCacheStats {
  total_entries: number;
  capacity: number;
  total_hits: number;
  total_misses: number;
  hit_rate: number;
  avg_hit_count: number;
  memory_bytes_estimated: number;
  /** MILL-CANONICAL: per-op_type entry counts */
  entries_by_op_type: Record<string, number>;
  /** MILL-CANONICAL: per-feature_signature entry counts */
  entries_by_feature_signature: Record<string, number>;
}

export type EvictionPolicy = "lru" | "lfu" | "fifo";

export interface MillCacheConfig {
  max_entries: number;
  similarity_threshold: number;
  eviction_policy: EvictionPolicy;
  embedding_dimension: number;
}

export interface MillSimilaritySearchOpts {
  limit?: number;
  /** MILL-CANONICAL: restrict to entries with matching op_type */
  op_type_filter?: MillOpType;
  /** MILL-CANONICAL: restrict to entries with matching feature_signature */
  feature_signature_filter?: MillFeatureSignature;
}

const DEFAULT_CONFIG: MillCacheConfig = {
  max_entries: DEFAULT_MAX_ENTRIES,
  similarity_threshold: DEFAULT_SIMILARITY_THRESHOLD,
  eviction_policy: "lru",
  embedding_dimension: DEFAULT_EMBEDDING_DIMENSION,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAEmbeddingCacheEngine {
  private config: MillCacheConfig = { ...DEFAULT_CONFIG };
  private cache: Map<string, MillCacheEntry> = new Map();
  private hits = 0;
  private misses = 0;

  setConfig(config: Partial<MillCacheConfig>): void {
    this.config = { ...this.config, ...config };
    while (this.cache.size > this.config.max_entries) {
      this.evictOne();
    }
  }

  getConfig(): MillCacheConfig {
    return { ...this.config };
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dotProduct / denom : 0;
  }

  set(
    input: string,
    embedding: number[],
    opts?: {
      op_type?: MillOpType;
      feature_signature?: MillFeatureSignature;
      metadata?: Record<string, unknown>;
    },
  ): MillCacheEntry {
    const entry: MillCacheEntry = {
      id: `emb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      input,
      embedding,
      created_at: Date.now(),
      last_accessed: Date.now(),
      hit_count: 0,
      op_type: opts?.op_type,
      feature_signature: opts?.feature_signature,
      metadata: opts?.metadata,
    };
    while (this.cache.size >= this.config.max_entries) {
      this.evictOne();
    }
    this.cache.set(entry.id, entry);
    return entry;
  }

  getExact(input: string): MillCacheEntry | null {
    for (const entry of this.cache.values()) {
      if (entry.input === input) {
        entry.last_accessed = Date.now();
        entry.hit_count++;
        this.hits++;
        return entry;
      }
    }
    this.misses++;
    return null;
  }

  findSimilar(embedding: number[], opts: MillSimilaritySearchOpts = {}): MillSimilarityMatch[] {
    const matches: MillSimilarityMatch[] = [];
    for (const entry of this.cache.values()) {
      // MILL-CANONICAL filters
      if (opts.op_type_filter && entry.op_type !== opts.op_type_filter) continue;
      if (opts.feature_signature_filter && entry.feature_signature !== opts.feature_signature_filter) continue;
      const sim = this.cosineSimilarity(embedding, entry.embedding);
      if (sim >= this.config.similarity_threshold) {
        matches.push({ entry, similarity: sim });
      }
    }
    matches.sort((a, b) => b.similarity - a.similarity);
    if (matches.length > 0) {
      matches[0].entry.last_accessed = Date.now();
      matches[0].entry.hit_count++;
      this.hits++;
    } else {
      this.misses++;
    }
    return typeof opts.limit === "number" ? matches.slice(0, opts.limit) : matches;
  }

  getBestMatch(embedding: number[], opts: MillSimilaritySearchOpts = {}): MillSimilarityMatch | null {
    const matches = this.findSimilar(embedding, { ...opts, limit: 1 });
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * MILL-CANONICAL: list all entries whose op_type or feature_signature
   * matches the given filter (no embedding similarity needed).
   */
  listByMillTag(opts: { op_type?: MillOpType; feature_signature?: MillFeatureSignature }): MillCacheEntry[] {
    return Array.from(this.cache.values()).filter(entry => {
      if (opts.op_type && entry.op_type !== opts.op_type) return false;
      if (opts.feature_signature && entry.feature_signature !== opts.feature_signature) return false;
      return true;
    });
  }

  private evictOne(): boolean {
    if (this.cache.size === 0) return false;
    let victimId: string | null = null;
    if (this.config.eviction_policy === "lru") {
      let oldestAccess = Infinity;
      for (const [id, entry] of this.cache.entries()) {
        if (entry.last_accessed < oldestAccess) {
          oldestAccess = entry.last_accessed;
          victimId = id;
        }
      }
    } else if (this.config.eviction_policy === "lfu") {
      let lowestCount = Infinity;
      for (const [id, entry] of this.cache.entries()) {
        if (entry.hit_count < lowestCount) {
          lowestCount = entry.hit_count;
          victimId = id;
        }
      }
    } else if (this.config.eviction_policy === "fifo") {
      let oldestCreated = Infinity;
      for (const [id, entry] of this.cache.entries()) {
        if (entry.created_at < oldestCreated) {
          oldestCreated = entry.created_at;
          victimId = id;
        }
      }
    }
    if (victimId !== null) {
      this.cache.delete(victimId);
      return true;
    }
    return false;
  }

  getStats(): MillCacheStats {
    const totalRequests = this.hits + this.misses;
    let totalHitCount = 0;
    const byOpType: Record<string, number> = {};
    const byFeatureSig: Record<string, number> = {};
    for (const entry of this.cache.values()) {
      totalHitCount += entry.hit_count;
      const ot = entry.op_type ?? "untagged";
      const fs = entry.feature_signature ?? "untagged";
      byOpType[ot] = (byOpType[ot] ?? 0) + 1;
      byFeatureSig[fs] = (byFeatureSig[fs] ?? 0) + 1;
    }
    const memoryPerEntry = this.config.embedding_dimension * 8 + 200;
    return {
      total_entries: this.cache.size,
      capacity: this.config.max_entries,
      total_hits: this.hits,
      total_misses: this.misses,
      hit_rate: totalRequests > 0 ? this.hits / totalRequests : 0,
      avg_hit_count: this.cache.size > 0 ? totalHitCount / this.cache.size : 0,
      memory_bytes_estimated: this.cache.size * memoryPerEntry,
      entries_by_op_type: byOpType,
      entries_by_feature_signature: byFeatureSig,
    };
  }

  getAllEntries(): MillCacheEntry[] {
    return Array.from(this.cache.values());
  }

  delete(entryId: string): boolean {
    return this.cache.delete(entryId);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getSummary(): string {
    const stats = this.getStats();
    const memMB = (stats.memory_bytes_estimated / 1024 / 1024).toFixed(2);
    return [
      "Mill Embedding Cache Summary",
      "============================",
      `Entries: ${stats.total_entries} / ${stats.capacity}`,
      `Hit Rate: ${(stats.hit_rate * 100).toFixed(1)}% (${stats.total_hits} hits, ${stats.total_misses} misses)`,
      `Avg Hits/Entry: ${stats.avg_hit_count.toFixed(1)}`,
      `Memory: ~${memMB} MB`,
      `Policy: ${this.config.eviction_policy.toUpperCase()}`,
      `Dimension: ${this.config.embedding_dimension}`,
    ].join("\n");
  }

  reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAEmbeddingCacheEngine = new MillLoRAEmbeddingCacheEngine();
export { MillLoRAEmbeddingCacheEngine };
