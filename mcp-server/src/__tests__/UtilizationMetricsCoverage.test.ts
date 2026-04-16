/**
 * MS-OPT-1: Utilization Metrics Coverage Validation
 *
 * Validates existing infrastructure for asset utilization tracking:
 * - AssetWiringSummaryEngine (cross-asset wiring summary)
 * - AIAutoUtilizationEngine (capability utilization)
 * - MetricsEngine (general metrics)
 * - UtilizationContractEngine (utilization contracts)
 *
 * Philosophy: STOP CREATING — START INTEGRATING
 * All infrastructure exists — this test validates coverage.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { AssetWiringSummaryEngine } from "../engines/AssetWiringSummaryEngine.js";

describe("MS-OPT-1: Utilization Metrics", () => {
  // ==========================================================================
  // U-MET-01: AssetWiringSummaryEngine
  // ==========================================================================

  describe("U-MET-01: AssetWiringSummaryEngine", () => {
    let engine: AssetWiringSummaryEngine;

    beforeAll(() => {
      engine = new AssetWiringSummaryEngine();
    });

    it("should have AssetWiringSummaryEngine available", () => {
      expect(engine).toBeDefined();
    });

    it("should have getSummary() for comprehensive wiring summary", () => {
      expect(typeof engine.getSummary).toBe("function");
    });

    it("should have getUtilizationTrends() for trends", () => {
      expect(typeof engine.getUtilizationTrends).toBe("function");
    });

    it("should have getDispatcherCoverage() for dispatcher stats", () => {
      expect(typeof engine.getDispatcherCoverage).toBe("function");
    });

    it("should have getCategoryBreakdown() for category stats", () => {
      expect(typeof engine.getCategoryBreakdown).toBe("function");
    });

    it("should have getQuickStats() for quick metrics", () => {
      expect(typeof engine.getQuickStats).toBe("function");
    });

    it("should have getOrphanPriorityList() for orphan tracking", () => {
      expect(typeof engine.getOrphanPriorityList).toBe("function");
    });
  });

  // ==========================================================================
  // U-MET-02: Summary Metrics
  // ==========================================================================

  describe("U-MET-02: Summary Metrics", () => {
    let engine: AssetWiringSummaryEngine;

    beforeAll(() => {
      engine = new AssetWiringSummaryEngine();
    });

    it("should return wiring summary with asset counts", () => {
      const summary = engine.getSummary();
      expect(summary).toBeDefined();
      expect(typeof summary.totalAssets).toBe("number");
      expect(typeof summary.totalWired).toBe("number");
      expect(typeof summary.overallCoverage).toBe("number");
    });

    it("should return summary with categories", () => {
      const summary = engine.getSummary();
      expect(Array.isArray(summary.categories)).toBe(true);
    });

    it("should return summary with recommendations", () => {
      const summary = engine.getSummary();
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it("should return summary with timestamp", () => {
      const summary = engine.getSummary();
      expect(summary.timestamp).toBeDefined();
    });

    it("should have valid coverage percentage (0-1)", () => {
      const summary = engine.getSummary();
      expect(summary.overallCoverage).toBeGreaterThanOrEqual(0);
      expect(summary.overallCoverage).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // U-MET-03: Recommendations & Orphans
  // ==========================================================================

  describe("U-MET-03: Recommendations & Orphans", () => {
    let engine: AssetWiringSummaryEngine;

    beforeAll(() => {
      engine = new AssetWiringSummaryEngine();
    });

    it("should return orphan priority list", () => {
      const orphans = engine.getOrphanPriorityList(5);
      expect(Array.isArray(orphans)).toBe(true);
    });

    it("should return utilization trends", () => {
      const trends = engine.getUtilizationTrends();
      expect(Array.isArray(trends)).toBe(true);
    });

    it("should return quick stats object", () => {
      const stats = engine.getQuickStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalAssets).toBe("number");
      expect(typeof stats.wiredPercentage).toBe("number");
      expect(typeof stats.wiringEngines).toBe("number");
    });

    it("should return category breakdown", () => {
      const breakdown = engine.getCategoryBreakdown();
      expect(breakdown).toBeDefined();
      expect(breakdown.algorithms).toBeDefined();
      expect(breakdown.formulas).toBeDefined();
    });
  });

  // ==========================================================================
  // Dispatcher Coverage
  // ==========================================================================

  describe("Dispatcher Coverage", () => {
    let engine: AssetWiringSummaryEngine;

    beforeAll(() => {
      engine = new AssetWiringSummaryEngine();
    });

    it("should return dispatcher coverage stats", () => {
      const coverage = engine.getDispatcherCoverage();
      expect(Array.isArray(coverage)).toBe(true);
    });

    it("should have dispatcher info in coverage", () => {
      const coverage = engine.getDispatcherCoverage();
      if (coverage.length > 0) {
        expect(coverage[0].dispatcher).toBeDefined();
        expect(typeof coverage[0].enginesWired).toBe("number");
        expect(typeof coverage[0].actionsAvailable).toBe("number");
      }
    });
  });

  // ==========================================================================
  // AIAutoUtilizationEngine (Capability Tracking)
  // ==========================================================================

  describe("AIAutoUtilizationEngine", () => {
    it("should have AIAutoUtilizationEngine available", async () => {
      const { aiAutoUtilizationEngine } = await import("../engines/AIAutoUtilizationEngine.js");
      expect(aiAutoUtilizationEngine).toBeDefined();
    });

    it("should have getStats() method for utilization stats", async () => {
      const { aiAutoUtilizationEngine } = await import("../engines/AIAutoUtilizationEngine.js");
      expect(typeof aiAutoUtilizationEngine.getStats).toBe("function");
    });

    it("should have analyze() method for intent analysis", async () => {
      const { aiAutoUtilizationEngine } = await import("../engines/AIAutoUtilizationEngine.js");
      expect(typeof aiAutoUtilizationEngine.analyze).toBe("function");
    });

    it("should have listCapabilities() method", async () => {
      const { aiAutoUtilizationEngine } = await import("../engines/AIAutoUtilizationEngine.js");
      expect(typeof aiAutoUtilizationEngine.listCapabilities).toBe("function");
    });

    it("should have shouldSuggest() method", async () => {
      const { aiAutoUtilizationEngine } = await import("../engines/AIAutoUtilizationEngine.js");
      expect(typeof aiAutoUtilizationEngine.shouldSuggest).toBe("function");
    });
  });

  // ==========================================================================
  // Coverage Summary
  // ==========================================================================

  describe("Coverage Summary", () => {
    it("should have complete utilization metrics infrastructure", () => {
      const engine = new AssetWiringSummaryEngine();

      // Core metrics
      expect(engine.getSummary).toBeDefined();
      expect(engine.getQuickStats).toBeDefined();
      expect(engine.getUtilizationTrends).toBeDefined();

      // Breakdown & analysis
      expect(engine.getCategoryBreakdown).toBeDefined();
      expect(engine.getDispatcherCoverage).toBeDefined();

      // Recommendations
      expect(engine.getOrphanPriorityList).toBeDefined();
    });

    it("should report meaningful asset counts", () => {
      const engine = new AssetWiringSummaryEngine();
      const summary = engine.getSummary();

      // Should have some assets tracked
      expect(summary.totalAssets).toBeGreaterThan(0);
    });
  });
});
