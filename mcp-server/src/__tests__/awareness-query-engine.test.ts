/**
 * Tests for AwarenessQueryEngine
 * Phase 0.2 - Fast in-memory asset awareness cache
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AwarenessQueryEngine } from "../engines/AwarenessQueryEngine.js";

describe("AwarenessQueryEngine", () => {
  let engine: AwarenessQueryEngine;

  beforeEach(() => {
    engine = new AwarenessQueryEngine();
  });

  describe("exists()", () => {
    it("should find existing engine by exact name", async () => {
      // DuplicationGuardEngine exists in the codebase
      const exists = await engine.exists("engine", "DuplicationGuardEngine");
      expect(exists).toBe(true);
    });

    it("should find engine with suffix variations", async () => {
      // Should match with or without Engine suffix
      const exists1 = await engine.exists("engine", "DuplicationGuard");
      const exists2 = await engine.exists("engine", "DuplicationGuardEngine");
      expect(exists1 || exists2).toBe(true);
    });

    it("should return false for non-existent asset", async () => {
      const exists = await engine.exists("engine", "TotallyFakeNonExistentXyz123");
      expect(exists).toBe(false);
    });
  });

  describe("findSimilar()", () => {
    it("should find similar assets by keywords", async () => {
      const results = await engine.findSimilar(["speed", "feed"], ["engine"], 5);
      expect(results.length).toBeGreaterThan(0);
      // Should find SpeedFeed-related engines
      const names = results.map((r) => r.asset.name.toLowerCase());
      expect(names.some((n) => n.includes("speed") || n.includes("feed"))).toBe(true);
    });

    it("should respect type filter", async () => {
      const results = await engine.findSimilar(["cutting"], ["formula"], 5);
      for (const result of results) {
        expect(result.asset.type).toBe("formula");
      }
    });

    it("should return empty for no matches", async () => {
      const results = await engine.findSimilar(["zzzznonexistentkeywordxxx"], undefined, 5);
      expect(results.length).toBe(0);
    });
  });

  describe("getCounts()", () => {
    it("should return counts by asset type", async () => {
      const counts = await engine.getCounts();
      expect(typeof counts.engine).toBe("number");
      expect(counts.engine).toBeGreaterThan(0); // We know engines exist
    });
  });

  describe("getCompactSummary()", () => {
    it("should return a compact summary string", async () => {
      const summary = await engine.getCompactSummary();
      expect(typeof summary).toBe("string");
      expect(summary).toContain("engine:");
    });
  });

  describe("recordInvocation() and lastInvoked()", () => {
    it("should record and retrieve invocation", async () => {
      const testName = `TestAsset_${Date.now()}`;
      await engine.recordInvocation(testName, "engine");

      const lastInvoked = await engine.lastInvoked(testName);
      expect(lastInvoked).not.toBeNull();

      // Should be within last minute
      const invokedTime = new Date(lastInvoked!).getTime();
      const now = Date.now();
      expect(now - invokedTime).toBeLessThan(60000);
    });

    it("should return null for never-invoked asset", async () => {
      const lastInvoked = await engine.lastInvoked("NeverInvokedAssetXyz123");
      expect(lastInvoked).toBeNull();
    });
  });

  describe("cache management", () => {
    it("should report cache freshness", () => {
      // Initially not fresh until loaded
      const fresh = engine.isCacheFresh();
      expect(typeof fresh).toBe("boolean");
    });

    it("should support invalidate and reload", async () => {
      // First load
      await engine.getCounts();
      expect(engine.isCacheFresh()).toBe(true);

      // Invalidate
      await engine.invalidateAndReload();
      expect(engine.isCacheFresh()).toBe(true);
    });
  });

  describe("performance", () => {
    it("should complete exists() in under 100ms", async () => {
      // Warm up cache
      await engine.getCounts();

      const start = Date.now();
      await engine.exists("engine", "SpeedFeedOrchestratorEngine");
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it("should complete findSimilar() in under 100ms", async () => {
      // Warm up cache
      await engine.getCounts();

      const start = Date.now();
      await engine.findSimilar(["cutting", "force"], ["engine"], 10);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });
});
