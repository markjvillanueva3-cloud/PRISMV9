/**
 * LatheLoRAEmbeddingCacheEngine — LATHE-LORA-MS0 U-LLR35
 * =======================================================
 *
 * Caches embedding vectors for LatheLoRA inputs.
 * Reduces redundant embedding computation for similar inputs.
 *
 * Features:
 *   - Semantic similarity caching
 *   - LRU eviction
 *   - Cosine similarity search
 *   - Cache hit/miss metrics
 *
 * @module engines/LatheLoRAEmbeddingCacheEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Cache entry */
export interface CacheEntry {
  id: string;
  input: string;
  embedding: number[];
  created_at: number;
  last_accessed: number;
  hit_count: number;
  metadata?: Record<string, unknown>;
}

/** Similarity match */
export interface SimilarityMatch {
  entry: CacheEntry;
  similarity: number;
}

/** Cache statistics */
export interface CacheStats {
  total_entries: number;
  capacity: number;
  total_hits: number;
  total_misses: number;
  hit_rate: number;
  avg_hit_count: number;
  memory_bytes_estimated: number;
}

/** Engine configuration */
export interface CacheConfig {
  max_entries: number;
  similarity_threshold: number;
  eviction_policy: "lru" | "lfu" | "fifo";
  embedding_dimension: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  max_entries: 1000,
  similarity_threshold: 0.92,
  eviction_policy: "lru",
  embedding_dimension: 768,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAEmbeddingCacheEngine {
  private config: CacheConfig = DEFAULT_CONFIG;
  private cache: Map<string, CacheEntry> = new Map();
  private hits = 0;
  private misses = 0;

  /**
   * Set configuration
   */
  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    // Evict if over new limit
    while (this.cache.size > this.config.max_entries) {
      this.evictOne();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
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

  /**
   * Add embedding to cache
   */
  set(input: string, embedding: number[], metadata?: Record<string, unknown>): CacheEntry {
    // Validate dimension
    if (embedding.length !== this.config.embedding_dimension) {
      log.warn(
        `Embedding dimension mismatch: ${embedding.length} vs ${this.config.embedding_dimension}`
      );
    }

    const entry: CacheEntry = {
      id: `emb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input,
      embedding,
      created_at: Date.now(),
      last_accessed: Date.now(),
      hit_count: 0,
      metadata,
    };

    // Evict if at capacity
    while (this.cache.size >= this.config.max_entries) {
      this.evictOne();
    }

    this.cache.set(entry.id, entry);
    return entry;
  }

  /**
   * Get exact match (by input string)
   */
  getExact(input: string): CacheEntry | null {
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

  /**
   * Find similar embeddings
   */
  findSimilar(embedding: number[], limit?: number): SimilarityMatch[] {
    const matches: SimilarityMatch[] = [];

    for (const entry of this.cache.values()) {
      const sim = this.cosineSimilarity(embedding, entry.embedding);
      if (sim >= this.config.similarity_threshold) {
        matches.push({ entry, similarity: sim });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    // Update access stats on best match
    if (matches.length > 0) {
      matches[0].entry.last_accessed = Date.now();
      matches[0].entry.hit_count++;
      this.hits++;
    } else {
      this.misses++;
    }

    return limit ? matches.slice(0, limit) : matches;
  }

  /**
   * Get most similar embedding
   */
  getBestMatch(embedding: number[]): SimilarityMatch | null {
    const matches = this.findSimilar(embedding, 1);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Evict one entry based on policy
   */
  private evictOne(): boolean {
    if (this.cache.size === 0) return false;

    let victimId: string | null = null;

    switch (this.config.eviction_policy) {
      case "lru":
        // Find oldest last_accessed
        let oldestAccess = Infinity;
        for (const [id, entry] of this.cache.entries()) {
          if (entry.last_accessed < oldestAccess) {
            oldestAccess = entry.last_accessed;
            victimId = id;
          }
        }
        break;

      case "lfu":
        // Find lowest hit_count
        let lowestCount = Infinity;
        for (const [id, entry] of this.cache.entries()) {
          if (entry.hit_count < lowestCount) {
            lowestCount = entry.hit_count;
            victimId = id;
          }
        }
        break;

      case "fifo":
        // Find oldest created_at
        let oldestCreated = Infinity;
        for (const [id, entry] of this.cache.entries()) {
          if (entry.created_at < oldestCreated) {
            oldestCreated = entry.created_at;
            victimId = id;
          }
        }
        break;
    }

    if (victimId) {
      this.cache.delete(victimId);
      return true;
    }
    return false;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalHits = this.hits;
    const totalMisses = this.misses;
    const totalRequests = totalHits + totalMisses;

    let totalHitCount = 0;
    for (const entry of this.cache.values()) {
      totalHitCount += entry.hit_count;
    }

    // Estimate memory: each embedding is dim * 8 bytes (float64) + overhead
    const memoryPerEntry = this.config.embedding_dimension * 8 + 200; // 200 bytes overhead
    const memoryBytes = this.cache.size * memoryPerEntry;

    return {
      total_entries: this.cache.size,
      capacity: this.config.max_entries,
      total_hits: totalHits,
      total_misses: totalMisses,
      hit_rate: totalRequests > 0 ? totalHits / totalRequests : 0,
      avg_hit_count: this.cache.size > 0 ? totalHitCount / this.cache.size : 0,
      memory_bytes_estimated: memoryBytes,
    };
  }

  /**
   * Get all entries
   */
  getAllEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Delete entry
   */
  delete(entryId: string): boolean {
    return this.cache.delete(entryId);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    const memMB = (stats.memory_bytes_estimated / 1024 / 1024).toFixed(2);

    return [
      "Embedding Cache Summary",
      "=======================",
      `Entries: ${stats.total_entries} / ${stats.capacity}`,
      `Hit Rate: ${(stats.hit_rate * 100).toFixed(1)}% (${stats.total_hits} hits, ${stats.total_misses} misses)`,
      `Avg Hits/Entry: ${stats.avg_hit_count.toFixed(1)}`,
      `Memory: ~${memMB} MB`,
      `Policy: ${this.config.eviction_policy.toUpperCase()}`,
      `Dimension: ${this.config.embedding_dimension}`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAEmbeddingCacheEngine = new LatheLoRAEmbeddingCacheEngine();
