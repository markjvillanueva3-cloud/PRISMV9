/**
 * LSHDedupEngine Tests — Phase 0.25 Scientific Foundations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { lshDedupEngine } from "../engines/LSHDedupEngine.js";

describe("LSHDedupEngine", () => {
  beforeEach(() => {
    lshDedupEngine.reset();
  });

  describe("add and query", () => {
    it("adds item to index", () => {
      const embedding = new Float32Array(384).fill(0.1);
      lshDedupEngine.add("test-1", embedding);
      expect(lshDedupEngine.has("test-1")).toBe(true);
    });

    it("finds exact match", () => {
      const embedding = new Float32Array(384).fill(0.5);
      lshDedupEngine.add("engine-1", embedding);

      const results = lshDedupEngine.query(embedding, 0.99);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("engine-1");
      expect(results[0].similarity).toBeCloseTo(1.0, 5);
    });

    it("finds similar vectors", () => {
      const base = new Float32Array(384);
      for (let i = 0; i < 384; i++) base[i] = Math.sin(i * 0.1);

      lshDedupEngine.add("base", base);

      // Create similar vector (small perturbation)
      const similar = new Float32Array(384);
      for (let i = 0; i < 384; i++) similar[i] = base[i] + 0.01 * Math.random();

      const results = lshDedupEngine.query(similar, 0.9);
      expect(results.length).toBeGreaterThan(0);
    });

    it("does not match dissimilar vectors", () => {
      const vec1 = new Float32Array(384);
      const vec2 = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        vec1[i] = Math.sin(i);
        vec2[i] = Math.cos(i * 10);  // Very different pattern
      }

      lshDedupEngine.add("vec1", vec1);
      const results = lshDedupEngine.query(vec2, 0.85);

      // Should have low or no matches
      if (results.length > 0) {
        expect(results[0].similarity).toBeLessThan(0.85);
      }
    });
  });

  describe("isDuplicate", () => {
    it("detects duplicate", () => {
      const embedding = new Float32Array(384).fill(0.3);
      lshDedupEngine.add("existing", embedding);

      const check = lshDedupEngine.isDuplicate(embedding);
      expect(check.isDuplicate).toBe(true);
      expect(check.matches.length).toBeGreaterThan(0);
    });

    it("returns false for unique", () => {
      const existing = new Float32Array(384).fill(0.5);
      const newVec = new Float32Array(384).fill(-0.5);

      lshDedupEngine.add("existing", existing);
      const check = lshDedupEngine.isDuplicate(newVec);
      expect(check.isDuplicate).toBe(false);
    });
  });

  describe("remove", () => {
    it("removes item from index", () => {
      const embedding = new Float32Array(384).fill(0.2);
      lshDedupEngine.add("to-remove", embedding);
      expect(lshDedupEngine.has("to-remove")).toBe(true);

      const removed = lshDedupEngine.remove("to-remove");
      expect(removed).toBe(true);
      expect(lshDedupEngine.has("to-remove")).toBe(false);
    });

    it("returns false for non-existent", () => {
      const removed = lshDedupEngine.remove("nonexistent");
      expect(removed).toBe(false);
    });
  });

  describe("bulkAdd", () => {
    it("adds multiple items", () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `engine-${i}`,
        embedding: new Float32Array(384).fill(i * 0.01)
      }));

      const added = lshDedupEngine.bulkAdd(items);
      expect(added).toBe(100);
      expect(lshDedupEngine.getIds().length).toBe(100);
    });
  });

  describe("getStats", () => {
    it("returns valid statistics", () => {
      // Add some items
      for (let i = 0; i < 50; i++) {
        const embedding = new Float32Array(384);
        for (let j = 0; j < 384; j++) embedding[j] = Math.random();
        lshDedupEngine.add(`item-${i}`, embedding);
      }

      // Query a few times
      const queryVec = new Float32Array(384).fill(0.5);
      lshDedupEngine.query(queryVec);
      lshDedupEngine.query(queryVec);

      const stats = lshDedupEngine.getStats();
      expect(stats.numItems).toBe(50);
      expect(stats.numTables).toBe(20);
      expect(stats.numHashes).toBe(8);
      expect(stats.avgBucketSize).toBeGreaterThan(0);
    });
  });

  describe("collisionProbability", () => {
    it("returns high probability for similar vectors", () => {
      const prob = lshDedupEngine.collisionProbability(0.95);
      expect(prob).toBeGreaterThan(0.9);
    });

    it("returns low probability for dissimilar vectors", () => {
      const prob = lshDedupEngine.collisionProbability(0.3);
      expect(prob).toBeLessThan(0.5);
    });

    it("returns 1 for identical vectors", () => {
      const prob = lshDedupEngine.collisionProbability(1.0);
      expect(prob).toBeCloseTo(1.0, 5);
    });
  });

  describe("dimension validation", () => {
    it("throws on wrong embedding dimension", () => {
      const wrongDim = new Float32Array(100);
      expect(() => lshDedupEngine.add("wrong", wrongDim)).toThrow(/dimension mismatch/);
    });

    it("throws on query with wrong dimension", () => {
      const wrongDim = new Float32Array(100);
      expect(() => lshDedupEngine.query(wrongDim)).toThrow(/dimension mismatch/);
    });
  });

  describe("performance characteristics", () => {
    it("query is sublinear in item count", () => {
      // Add 500 items
      for (let i = 0; i < 500; i++) {
        const embedding = new Float32Array(384);
        for (let j = 0; j < 384; j++) embedding[j] = Math.random() - 0.5;
        lshDedupEngine.add(`engine-${i}`, embedding);
      }

      // Query should find candidates without scanning all 500
      const queryVec = new Float32Array(384);
      for (let j = 0; j < 384; j++) queryVec[j] = Math.random() - 0.5;

      const start = performance.now();
      lshDedupEngine.query(queryVec);
      const elapsed = performance.now() - start;

      // Should complete in under 10ms for 500 items
      expect(elapsed).toBeLessThan(10);

      const stats = lshDedupEngine.getStats();
      // Average candidates should be much less than total items
      expect(stats.avgQueryCandidates).toBeLessThan(500);
    });
  });
});
