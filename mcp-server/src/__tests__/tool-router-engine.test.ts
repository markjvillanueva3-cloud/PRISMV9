import { describe, it, expect } from "vitest";
import { ToolRouterEngine } from "../engines/ToolRouterEngine.js";

describe("ToolRouterEngine", () => {
  const router = new ToolRouterEngine();

  describe("route", () => {
    it("routes RPM queries to QuickCalcEngine", () => {
      const results = router.route("calculate rpm for my cutter");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].target).toBe("QuickCalcEngine");
    });

    it("routes feed rate queries to QuickCalcEngine", () => {
      const results = router.route("what feed rate should I use");
      expect(results[0].target).toBe("QuickCalcEngine");
      expect(results[0].action).toContain("feedRate");
    });

    it("routes system status to SystemSnapshotEngine", () => {
      const results = router.route("show system status");
      expect(results[0].target).toBe("SystemSnapshotEngine");
    });

    it("routes action search to DispatcherMapEngine", () => {
      const results = router.route("find action for material lookup");
      expect(results.some(r => r.target === "DispatcherMapEngine")).toBe(true);
    });

    it("routes material queries to calcDispatcher", () => {
      const results = router.route("material properties of 6061 aluminum");
      expect(results.some(r => r.target === "calcDispatcher")).toBe(true);
    });

    it("returns empty array for unknown intent", () => {
      const results = router.route("zzz completely unrelated zzz");
      expect(results).toEqual([]);
    });

    it("returns at most 3 results", () => {
      const results = router.route("rpm feed rate chip load mrr");
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("prefers direct routes over dispatcher routes", () => {
      const results = router.route("calculate rpm");
      if (results.length > 0) {
        expect(results[0].route).toBe("direct");
      }
    });
  });

  describe("bestRoute", () => {
    it("returns single best match", () => {
      const best = router.bestRoute("tap drill for M10");
      expect(best).not.toBeNull();
      expect(best!.target).toBe("QuickCalcEngine");
      expect(best!.action).toContain("tapDrill");
    });

    it("returns null for no match", () => {
      const best = router.bestRoute("zzz nothing zzz");
      expect(best).toBeNull();
    });
  });

  describe("getPatterns", () => {
    it("returns all registered patterns", () => {
      const patterns = router.getPatterns();
      expect(patterns.length).toBeGreaterThan(10);
      patterns.forEach(p => {
        expect(p).toHaveProperty("keywords");
        expect(p).toHaveProperty("target");
        expect(p).toHaveProperty("action");
      });
    });
  });

  describe("getStats", () => {
    it("returns pattern and target counts", () => {
      const stats = router.getStats();
      expect(stats.patterns).toBeGreaterThan(10);
      expect(stats.targets).toBeGreaterThan(3);
      expect(stats.avgTokens).toBeGreaterThan(0);
    });
  });
});
