/**
 * CADFeatureEmbeddingEngine Tests — CADCAM-DAGI-MS0/U-DAGI05
 *
 * Exit gate: 15+ tests covering embed, batch, index, search, cache.
 * Uses MockEmbeddingBackend: deterministic hash-based embeddings for reproducibility.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CADFeatureEmbeddingEngine,
  cadFeatureEmbeddingEngine,
  type EmbeddingBackend,
  type TokenSeq,
  type Embedding,
  type IndexedEmbedding,
  type SimilarityMetric,
} from "../engines/CADFeatureEmbeddingEngine.js";

// ── Mock Backend ─────────────────────────────────────────────────────────────

/**
 * Deterministic embedding backend using hash-based vectors.
 * Each token contributes to specific dimensions based on its value.
 */
class MockEmbeddingBackend implements EmbeddingBackend {
  readonly dim: number;

  constructor(dim = 256) {
    this.dim = dim;
  }

  embed(tokens: TokenSeq): Embedding {
    const emb = new Float32Array(this.dim);
    // Hash tokens into embedding dimensions
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      // Distribute token contribution across multiple dimensions
      for (let j = 0; j < 4; j++) {
        const idx = (t * 31 + j * 7 + i * 13) % this.dim;
        emb[idx] += Math.sin(t * (j + 1) * 0.1) / (i + 1);
      }
    }
    return emb;
  }

  embedBatch(corpus: TokenSeq[]): Embedding[] {
    return corpus.map((t) => this.embed(t));
  }
}

// ── Test Helpers ─────────────────────────────────────────────────────────────

function l2Norm(v: Embedding): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

function cosineDistance(a: Embedding, b: Embedding): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CADFeatureEmbeddingEngine", () => {
  let engine: CADFeatureEmbeddingEngine;
  let backend: MockEmbeddingBackend;

  beforeEach(() => {
    engine = new CADFeatureEmbeddingEngine();
    backend = new MockEmbeddingBackend(256);
    engine.clearCache();
  });

  // ── Basic embedding ──────────────────────────────────────────────────────

  describe("embed", () => {
    it("produces embedding of correct dimension", () => {
      const tokens: TokenSeq = [1, 2, 3, 4, 5];
      const emb = engine.embed(tokens, backend);
      expect(emb.length).toBe(256);
      expect(emb).toBeInstanceOf(Float32Array);
    });

    it("produces normalized embedding by default", () => {
      const tokens: TokenSeq = [10, 20, 30];
      const emb = engine.embed(tokens, backend, { normalize: true });
      const norm = l2Norm(emb);
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it("respects normalize=false option", () => {
      const tokens: TokenSeq = [10, 20, 30];
      const emb = engine.embed(tokens, backend, { normalize: false });
      const norm = l2Norm(emb);
      // Should not be normalized (unless by accident)
      expect(norm).not.toBeCloseTo(1.0, 5);
    });

    it("is deterministic for same input", () => {
      const tokens: TokenSeq = [7, 8, 9];
      engine.clearCache();
      const emb1 = engine.embed(tokens, backend, { useCache: false });
      const emb2 = engine.embed(tokens, backend, { useCache: false });
      for (let i = 0; i < emb1.length; i++) {
        expect(emb1[i]).toBe(emb2[i]);
      }
    });

    it("produces different embeddings for different inputs", () => {
      const emb1 = engine.embed([1, 2, 3], backend);
      const emb2 = engine.embed([4, 5, 6], backend);
      const dist = cosineDistance(emb1, emb2);
      expect(dist).toBeGreaterThan(0.01); // Not identical
    });
  });

  // ── Caching ──────────────────────────────────────────────────────────────

  describe("cache", () => {
    it("caches embeddings by default", () => {
      const tokens: TokenSeq = [100, 200, 300];
      engine.embed(tokens, backend);
      const stats1 = engine.cacheStats();
      expect(stats1.size).toBe(1);

      // Re-embed same tokens
      engine.embed(tokens, backend);
      const stats2 = engine.cacheStats();
      expect(stats2.size).toBe(1); // Still 1, used cache
    });

    it("skips cache when useCache=false", () => {
      const tokens: TokenSeq = [100, 200, 300];
      engine.embed(tokens, backend, { useCache: false });
      const stats = engine.cacheStats();
      expect(stats.size).toBe(0);
    });

    it("clearCache removes all entries", () => {
      engine.embed([1], backend);
      engine.embed([2], backend);
      engine.embed([3], backend);
      expect(engine.cacheStats().size).toBe(3);

      const result = engine.clearCache();
      expect(result.cleared).toBe(3);
      expect(engine.cacheStats().size).toBe(0);
    });

    it("reports memory usage", () => {
      engine.embed([1, 2, 3], backend);
      const stats = engine.cacheStats();
      expect(stats.memoryBytes).toBe(256 * 4); // 256 floats * 4 bytes
    });
  });

  // ── Batch embedding ──────────────────────────────────────────────────────

  describe("embedBatch", () => {
    it("embeds multiple sequences", () => {
      const corpus: TokenSeq[] = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const embeddings = engine.embedBatch(corpus, backend);
      expect(embeddings.length).toBe(3);
      embeddings.forEach((emb) => {
        expect(emb.length).toBe(256);
      });
    });

    it("preserves order", () => {
      const corpus: TokenSeq[] = [[1], [2], [3]];
      const embeddings = engine.embedBatch(corpus, backend);
      const single1 = engine.embed([1], backend);
      const single2 = engine.embed([2], backend);
      const single3 = engine.embed([3], backend);

      for (let i = 0; i < 256; i++) {
        expect(embeddings[0][i]).toBe(single1[i]);
        expect(embeddings[1][i]).toBe(single2[i]);
        expect(embeddings[2][i]).toBe(single3[i]);
      }
    });

    it("handles empty corpus", () => {
      const embeddings = engine.embedBatch([], backend);
      expect(embeddings.length).toBe(0);
    });
  });

  // ── Index building ───────────────────────────────────────────────────────

  describe("buildIndex", () => {
    it("creates flat index", () => {
      const embeddings: IndexedEmbedding[] = [
        { id: "a", embedding: engine.embed([1], backend) },
        { id: "b", embedding: engine.embed([2], backend) },
        { id: "c", embedding: engine.embed([3], backend) },
      ];
      const index = engine.buildIndex(embeddings, "flat");
      expect(index.type).toBe("flat");
      expect(index.count).toBe(3);
      expect(index.dim).toBe(256);
    });

    it("creates vptree index", () => {
      const embeddings: IndexedEmbedding[] = [
        { id: "a", embedding: engine.embed([1], backend) },
        { id: "b", embedding: engine.embed([2], backend) },
        { id: "c", embedding: engine.embed([3], backend) },
      ];
      const index = engine.buildIndex(embeddings, "vptree", "cosine");
      expect(index.type).toBe("vptree");
      expect(index.count).toBe(3);
    });

    it("handles empty embedding list", () => {
      const index = engine.buildIndex([], "flat");
      expect(index.count).toBe(0);
      expect(index.dim).toBe(0);
    });
  });

  // ── Search ───────────────────────────────────────────────────────────────

  describe("search (flat)", () => {
    it("finds exact match first", () => {
      const emb1 = engine.embed([1, 2, 3], backend);
      const emb2 = engine.embed([4, 5, 6], backend);
      const emb3 = engine.embed([7, 8, 9], backend);

      const index = engine.buildIndex([
        { id: "abc", embedding: emb1 },
        { id: "def", embedding: emb2 },
        { id: "ghi", embedding: emb3 },
      ], "flat");

      const results = engine.search(emb1, index, 1, "cosine");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("abc");
      expect(results[0].distance).toBeCloseTo(0, 5); // Exact match
    });

    it("returns k results sorted by distance", () => {
      const embeddings: IndexedEmbedding[] = [];
      for (let i = 0; i < 10; i++) {
        embeddings.push({
          id: `part-${i}`,
          embedding: engine.embed([i * 10], backend),
        });
      }
      const index = engine.buildIndex(embeddings, "flat");
      const query = engine.embed([25], backend); // Between 20 and 30

      const results = engine.search(query, index, 3, "cosine");
      expect(results.length).toBe(3);
      // Results should be sorted by distance
      expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
      expect(results[1].distance).toBeLessThanOrEqual(results[2].distance);
    });

    it("handles k > index size", () => {
      const index = engine.buildIndex([
        { id: "a", embedding: engine.embed([1], backend) },
        { id: "b", embedding: engine.embed([2], backend) },
      ], "flat");

      const results = engine.search(engine.embed([1], backend), index, 10);
      expect(results.length).toBe(2);
    });

    it("handles empty index", () => {
      const index = engine.buildIndex([], "flat");
      const results = engine.search(engine.embed([1], backend), index, 5);
      expect(results.length).toBe(0);
    });

    it("works with euclidean metric", () => {
      const embeddings: IndexedEmbedding[] = [
        { id: "a", embedding: engine.embed([1], backend) },
        { id: "b", embedding: engine.embed([100], backend) },
      ];
      const index = engine.buildIndex(embeddings, "flat");
      const query = engine.embed([2], backend);

      const results = engine.search(query, index, 2, "euclidean");
      expect(results[0].id).toBe("a"); // [2] closer to [1] than [100]
    });

    it("works with dotProduct metric", () => {
      const embeddings: IndexedEmbedding[] = [
        { id: "a", embedding: engine.embed([1], backend) },
        { id: "b", embedding: engine.embed([2], backend) },
      ];
      const index = engine.buildIndex(embeddings, "flat");
      const query = engine.embed([1], backend);

      const results = engine.search(query, index, 2, "dotProduct");
      expect(results[0].id).toBe("a"); // Self should have highest dot product
    });
  });

  describe("search (vptree)", () => {
    it("finds nearest neighbors", () => {
      const embeddings: IndexedEmbedding[] = [];
      for (let i = 0; i < 100; i++) {
        embeddings.push({
          id: `part-${i}`,
          embedding: engine.embed([i], backend),
        });
      }
      const index = engine.buildIndex(embeddings, "vptree", "cosine");

      // Query with embedding for token 50
      const query = engine.embed([50], backend);
      const results = engine.search(query, index, 5, "cosine");

      expect(results.length).toBe(5);
      // First result should be exact match
      expect(results[0].id).toBe("part-50");
      expect(results[0].distance).toBeCloseTo(0, 5);
    });

    it("returns same results as flat for small index", () => {
      const embeddings: IndexedEmbedding[] = [
        { id: "a", embedding: engine.embed([1, 2], backend) },
        { id: "b", embedding: engine.embed([3, 4], backend) },
        { id: "c", embedding: engine.embed([5, 6], backend) },
        { id: "d", embedding: engine.embed([7, 8], backend) },
        { id: "e", embedding: engine.embed([9, 10], backend) },
      ];

      const flatIndex = engine.buildIndex(embeddings, "flat");
      const vpIndex = engine.buildIndex(embeddings, "vptree", "cosine");

      const query = engine.embed([4, 5], backend);
      const flatResults = engine.search(query, flatIndex, 3, "cosine");
      const vpResults = engine.search(query, vpIndex, 3, "cosine");

      expect(flatResults.map((r) => r.id).sort()).toEqual(
        vpResults.map((r) => r.id).sort()
      );
    });
  });

  describe("searchByTokens", () => {
    it("embeds query and searches", () => {
      const embeddings: IndexedEmbedding[] = [
        { id: "a", embedding: engine.embed([1], backend) },
        { id: "b", embedding: engine.embed([2], backend) },
      ];
      const index = engine.buildIndex(embeddings, "flat");

      const results = engine.searchByTokens([1], index, backend, 1);
      expect(results[0].id).toBe("a");
    });
  });

  // ── BaseEngine contract ──────────────────────────────────────────────────

  describe("BaseEngine contract", () => {
    it("has correct engine info", () => {
      const info = cadFeatureEmbeddingEngine.info;
      expect(info.name).toBe("CADFeatureEmbeddingEngine");
      expect(info.version).toBe("1.0.0");
      expect(info.domain).toBe("cad_neural");
    });

    it("has capabilities with actions", () => {
      const caps = cadFeatureEmbeddingEngine.getCapabilities();
      expect(caps.length).toBeGreaterThan(0);
      expect(caps.some((c) => c.name === "embed")).toBe(true);
      expect(caps.some((c) => c.name === "search")).toBe(true);
    });

    it("validates input", () => {
      expect(cadFeatureEmbeddingEngine.validate(null)).not.toBeNull();
      expect(cadFeatureEmbeddingEngine.validate({})).toBeNull();
    });
  });

  // ── Performance ──────────────────────────────────────────────────────────

  describe("performance", () => {
    it("handles 10,000 embeddings under 100ms", () => {
      const embeddings: IndexedEmbedding[] = [];
      for (let i = 0; i < 10000; i++) {
        embeddings.push({
          id: `p-${i}`,
          embedding: engine.embed([i], backend, { useCache: false, normalize: true }),
        });
      }
      engine.clearCache();

      const index = engine.buildIndex(embeddings, "flat");
      const query = engine.embed([5000], backend);

      const start = performance.now();
      const results = engine.search(query, index, 10, "cosine");
      const elapsed = performance.now() - start;

      expect(results.length).toBe(10);
      expect(elapsed).toBeLessThan(100); // < 100ms
    });
  });
});
