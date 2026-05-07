/**
 * LatheLoRAEmbeddingCacheEngine Tests — LATHE-LORA-MS0 U-LLR35
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAEmbeddingCacheEngine } from "../engines/LatheLoRAEmbeddingCacheEngine.js";

function randomVec(dim: number, seed = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < dim; i++) {
    out.push(Math.sin(seed + i) * 0.5);
  }
  return out;
}

describe("LatheLoRAEmbeddingCacheEngine", () => {
  beforeEach(() => {
    latheLoRAEmbeddingCacheEngine.reset();
    latheLoRAEmbeddingCacheEngine.setConfig({
      max_entries: 100,
      similarity_threshold: 0.9,
      eviction_policy: "lru",
      embedding_dimension: 4,
    });
  });

  describe("configuration", () => {
    it("returns config copy", () => {
      const cfg = latheLoRAEmbeddingCacheEngine.getConfig();
      expect(cfg.embedding_dimension).toBe(4);
      expect(cfg.eviction_policy).toBe("lru");
    });

    it("evicts down to new limit when lowered", () => {
      for (let i = 0; i < 10; i++) {
        latheLoRAEmbeddingCacheEngine.set(`k${i}`, randomVec(4, i));
      }
      latheLoRAEmbeddingCacheEngine.setConfig({ max_entries: 3 });
      expect(latheLoRAEmbeddingCacheEngine.getStats().total_entries).toBe(3);
    });
  });

  describe("cosine similarity", () => {
    it("returns 1 for identical vectors", () => {
      const v = [1, 2, 3, 4];
      expect(latheLoRAEmbeddingCacheEngine.cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it("returns 0 for orthogonal vectors", () => {
      expect(latheLoRAEmbeddingCacheEngine.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it("returns 0 for zero vectors", () => {
      expect(latheLoRAEmbeddingCacheEngine.cosineSimilarity([0, 0], [1, 2])).toBe(0);
    });

    it("returns 0 for dimension mismatch", () => {
      expect(latheLoRAEmbeddingCacheEngine.cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it("is symmetric", () => {
      const a = [1, 2, 3, 4];
      const b = [4, 3, 2, 1];
      const s1 = latheLoRAEmbeddingCacheEngine.cosineSimilarity(a, b);
      const s2 = latheLoRAEmbeddingCacheEngine.cosineSimilarity(b, a);
      expect(s1).toBeCloseTo(s2);
    });
  });

  describe("set and getExact", () => {
    it("stores and retrieves by input string", () => {
      latheLoRAEmbeddingCacheEngine.set("hello", [1, 0, 0, 0]);
      const got = latheLoRAEmbeddingCacheEngine.getExact("hello");
      expect(got).not.toBeNull();
      expect(got?.hit_count).toBe(1);
    });

    it("returns null on miss", () => {
      expect(latheLoRAEmbeddingCacheEngine.getExact("absent")).toBeNull();
    });

    it("increments hit and miss counters", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.getExact("a");
      latheLoRAEmbeddingCacheEngine.getExact("missing");
      const s = latheLoRAEmbeddingCacheEngine.getStats();
      expect(s.total_hits).toBe(1);
      expect(s.total_misses).toBe(1);
      expect(s.hit_rate).toBeCloseTo(0.5);
    });

    it("stores metadata", () => {
      latheLoRAEmbeddingCacheEngine.set("k", [1, 0, 0, 0], { source: "test" });
      const e = latheLoRAEmbeddingCacheEngine.getExact("k");
      expect(e?.metadata?.source).toBe("test");
    });
  });

  describe("similarity search", () => {
    it("finds similar entries above threshold", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("b", [0.99, 0.01, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("c", [0, 1, 0, 0]);
      const matches = latheLoRAEmbeddingCacheEngine.findSimilar([1, 0, 0, 0]);
      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches[0].similarity).toBeCloseTo(1);
    });

    it("returns empty array below threshold", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      const matches = latheLoRAEmbeddingCacheEngine.findSimilar([0, 1, 0, 0]);
      expect(matches).toHaveLength(0);
    });

    it("respects limit parameter", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("b", [0.99, 0.01, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("c", [0.98, 0.02, 0, 0]);
      const matches = latheLoRAEmbeddingCacheEngine.findSimilar([1, 0, 0, 0], 2);
      expect(matches).toHaveLength(2);
    });

    it("getBestMatch returns top-1 result", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("b", [0.95, 0.05, 0, 0]);
      const best = latheLoRAEmbeddingCacheEngine.getBestMatch([1, 0, 0, 0]);
      expect(best).not.toBeNull();
      expect(best?.similarity).toBeCloseTo(1);
    });

    it("getBestMatch returns null when no matches", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      const best = latheLoRAEmbeddingCacheEngine.getBestMatch([0, 0, 0, 1]);
      expect(best).toBeNull();
    });
  });

  describe("eviction policies", () => {
    it("LRU evicts least-recently-accessed", async () => {
      latheLoRAEmbeddingCacheEngine.setConfig({ max_entries: 2, eviction_policy: "lru" });
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      await new Promise(r => setTimeout(r, 5));
      latheLoRAEmbeddingCacheEngine.set("b", [0, 1, 0, 0]);
      await new Promise(r => setTimeout(r, 5));
      latheLoRAEmbeddingCacheEngine.getExact("a"); // access a recently — now a > b
      await new Promise(r => setTimeout(r, 5));
      latheLoRAEmbeddingCacheEngine.set("c", [0, 0, 1, 0]); // should evict b (oldest access)
      expect(latheLoRAEmbeddingCacheEngine.getExact("a")).not.toBeNull();
      expect(latheLoRAEmbeddingCacheEngine.getExact("b")).toBeNull();
    });

    it("LFU evicts least-frequently-used", () => {
      latheLoRAEmbeddingCacheEngine.setConfig({ max_entries: 2, eviction_policy: "lfu" });
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("b", [0, 1, 0, 0]);
      latheLoRAEmbeddingCacheEngine.getExact("a");
      latheLoRAEmbeddingCacheEngine.getExact("a");
      latheLoRAEmbeddingCacheEngine.set("c", [0, 0, 1, 0]); // should evict b (0 hits)
      expect(latheLoRAEmbeddingCacheEngine.getExact("b")).toBeNull();
    });

    it("FIFO evicts oldest-created", () => {
      latheLoRAEmbeddingCacheEngine.setConfig({ max_entries: 2, eviction_policy: "fifo" });
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      // Small wait to ensure created_at differs
      const start = Date.now();
      while (Date.now() === start) {/* spin 1ms */}
      latheLoRAEmbeddingCacheEngine.set("b", [0, 1, 0, 0]);
      while (Date.now() === start + 1) {/* spin */}
      latheLoRAEmbeddingCacheEngine.set("c", [0, 0, 1, 0]); // evicts a
      expect(latheLoRAEmbeddingCacheEngine.getExact("a")).toBeNull();
    });
  });

  describe("stats", () => {
    it("reports zero stats on empty cache", () => {
      const s = latheLoRAEmbeddingCacheEngine.getStats();
      expect(s.total_entries).toBe(0);
      expect(s.hit_rate).toBe(0);
      expect(s.avg_hit_count).toBe(0);
    });

    it("estimates memory usage", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      const s = latheLoRAEmbeddingCacheEngine.getStats();
      expect(s.memory_bytes_estimated).toBeGreaterThan(0);
    });
  });

  describe("delete and clear", () => {
    it("deletes a specific entry by id", () => {
      const e = latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      expect(latheLoRAEmbeddingCacheEngine.delete(e.id)).toBe(true);
      expect(latheLoRAEmbeddingCacheEngine.getExact("a")).toBeNull();
    });

    it("clear empties cache and resets counters", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.getExact("a");
      latheLoRAEmbeddingCacheEngine.clear();
      const s = latheLoRAEmbeddingCacheEngine.getStats();
      expect(s.total_entries).toBe(0);
      expect(s.total_hits).toBe(0);
    });

    it("getAllEntries returns all cache entries", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      latheLoRAEmbeddingCacheEngine.set("b", [0, 1, 0, 0]);
      expect(latheLoRAEmbeddingCacheEngine.getAllEntries()).toHaveLength(2);
    });
  });

  describe("summary", () => {
    it("renders summary text", () => {
      latheLoRAEmbeddingCacheEngine.set("a", [1, 0, 0, 0]);
      const s = latheLoRAEmbeddingCacheEngine.getSummary();
      expect(s).toContain("Embedding Cache Summary");
      expect(s).toContain("Entries:");
      expect(s).toContain("Hit Rate:");
    });
  });
});
