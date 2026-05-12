import { describe, it, expect } from "vitest";
import { AssetWiringSummaryEngine, assetWiringSummaryEngine } from "../engines/AssetWiringSummaryEngine.js";

describe("AssetWiringSummaryEngine", () => {
  describe("initialization", () => {
    it("should export singleton instance", () => {
      expect(assetWiringSummaryEngine).toBeInstanceOf(AssetWiringSummaryEngine);
    });
  });

  describe("getSummary", () => {
    it("should return comprehensive summary", () => {
      const s = assetWiringSummaryEngine.getSummary();
      expect(s.totalAssets).toBeGreaterThan(5000);
      expect(s.totalWired).toBeGreaterThan(4000);
      expect(s.overallCoverage).toBeGreaterThan(0.7);
    });
    it("should include all categories", () => {
      const s = assetWiringSummaryEngine.getSummary();
      expect(s.categories.length).toBe(5);
      expect(s.categories.map(c => c.name)).toContain("Algorithms");
      expect(s.categories.map(c => c.name)).toContain("Tribal Knowledge Tips");
    });
    it("should include recommendations", () => {
      const s = assetWiringSummaryEngine.getSummary();
      expect(s.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getUtilizationTrends", () => {
    it("should show improvement trends", () => {
      const trends = assetWiringSummaryEngine.getUtilizationTrends();
      expect(trends.length).toBe(5);
      expect(trends.every(t => t.improvement >= 0)).toBe(true);
    });
    it("should track all categories", () => {
      const trends = assetWiringSummaryEngine.getUtilizationTrends();
      expect(trends.map(t => t.category)).toContain("Algorithms");
      expect(trends.map(t => t.category)).toContain("MIT Course Algorithms");
    });
  });

  describe("getDispatcherCoverage", () => {
    it("should list dispatcher coverage", () => {
      const coverage = assetWiringSummaryEngine.getDispatcherCoverage();
      expect(coverage.length).toBeGreaterThan(5);
      expect(coverage[0]).toHaveProperty("dispatcher");
      expect(coverage[0]).toHaveProperty("enginesWired");
    });
  });

  describe("getCategoryBreakdown", () => {
    it("should provide category breakdown", () => {
      const breakdown = assetWiringSummaryEngine.getCategoryBreakdown();
      expect(breakdown.algorithms.length).toBeGreaterThan(5);
      expect(breakdown.reasoning.length).toBeGreaterThan(5);
      expect(breakdown.formulas.length).toBe(15);
    });
  });

  describe("getQuickStats", () => {
    it("should return quick dashboard stats", () => {
      const stats = assetWiringSummaryEngine.getQuickStats();
      expect(stats.totalAssets).toBeGreaterThan(5000);
      expect(stats.wiredPercentage).toBeGreaterThan(70);
      expect(stats.wiringEngines).toBe(5);
      expect(stats.testsAdded).toBeGreaterThan(150);
    });
  });

  describe("getOrphanPriorityList", () => {
    it("should return prioritized orphan list", () => {
      const orphans = assetWiringSummaryEngine.getOrphanPriorityList(10);
      expect(orphans.length).toBeLessThanOrEqual(10);
      expect(orphans[0]).toHaveProperty("priority");
      expect(orphans[0]).toHaveProperty("reason");
    });
    it("should include high priority items", () => {
      const orphans = assetWiringSummaryEngine.getOrphanPriorityList(10);
      expect(orphans.some(o => o.priority === "high")).toBe(true);
    });
  });
});
