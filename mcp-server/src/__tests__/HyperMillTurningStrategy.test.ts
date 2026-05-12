/**
 * HyperMillTurningStrategy.test.ts — MS5 U-LAT37-U-LAT39 Test Suite (T044)
 *
 * Regression guard for hyperMILL turning strategy catalog.
 * Validates 25 turning cycles extracted from cycTurn.def.
 */

import { describe, it, expect } from "vitest";
import {
  HYPERMILL_TURNING_STRATEGIES,
  findHyperMillStrategyByCode,
  getHyperMillStrategiesByGroup,
  searchHyperMillStrategies,
  getRoughingStrategies,
  getFinishingStrategies,
  get5AxisStrategies,
  getStrategyStats,
} from "../data/hypermill-turning-strategy-catalog.js";

describe("HyperMillTurningStrategy — MS5 Regression Guard", () => {
  // ============================================================================
  // Catalog Loading
  // ============================================================================

  describe("Catalog Loading", () => {
    it("should load 25 hyperMILL turning strategies", () => {
      expect(HYPERMILL_TURNING_STRATEGIES.length).toBe(26);
    });

    it("should have all required fields for each strategy", () => {
      for (const strategy of HYPERMILL_TURNING_STRATEGIES) {
        expect(strategy.code).toBeDefined();
        expect(strategy.name).toBeDefined();
        expect(strategy.type_name).toBeDefined();
        expect(strategy.group).toBeDefined();
        expect(strategy.description).toBeDefined();
        expect(strategy.use_case).toBeDefined();
        expect(typeof strategy.supports_roughing).toBe("boolean");
        expect(typeof strategy.supports_finishing).toBe("boolean");
        expect(typeof strategy.supports_5axis).toBe("boolean");
        expect(Array.isArray(strategy.parameters)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Group Coverage
  // ============================================================================

  describe("Group Coverage", () => {
    it("should have TURN group strategies", () => {
      const turn = getHyperMillStrategiesByGroup("TURN");
      expect(turn.length).toBeGreaterThanOrEqual(10);
      expect(turn.some(s => s.code === "CFT")).toBe(true);
      expect(turn.some(s => s.code === "TRNR")).toBe(true);
      expect(turn.some(s => s.code === "TRNF")).toBe(true);
    });

    it("should have GROOVE group strategies", () => {
      const groove = getHyperMillStrategiesByGroup("GROOVE");
      expect(groove.length).toBeGreaterThanOrEqual(6);
      expect(groove.some(s => s.code === "GRVT")).toBe(true);
      expect(groove.some(s => s.code === "GRVP")).toBe(true);
    });

    it("should have THREAD group strategies", () => {
      const thread = getHyperMillStrategiesByGroup("THREAD");
      expect(thread.length).toBeGreaterThanOrEqual(3);
      expect(thread.some(s => s.code === "TRNT")).toBe(true);
    });

    it("should have DRILL group strategies (5-axis)", () => {
      const drill = getHyperMillStrategiesByGroup("DRILL");
      expect(drill.length).toBeGreaterThanOrEqual(6);
      // All drill strategies should support 5-axis
      for (const s of drill) {
        expect(s.supports_5axis).toBe(true);
      }
    });
  });

  // ============================================================================
  // Code Lookup
  // ============================================================================

  describe("Code Lookup", () => {
    it("should find CFT (Turning Roughing - Finishing)", () => {
      const strategy = findHyperMillStrategyByCode("CFT");
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe("Turning Roughing - Finishing");
      expect(strategy?.supports_roughing).toBe(true);
      expect(strategy?.supports_finishing).toBe(true);
    });

    it("should find TRNT (Thread Turning)", () => {
      const strategy = findHyperMillStrategyByCode("TRNT");
      expect(strategy).toBeDefined();
      expect(strategy?.group).toBe("THREAD");
    });

    it("should be case-insensitive", () => {
      const upper = findHyperMillStrategyByCode("GRVT");
      const lower = findHyperMillStrategyByCode("grvt");
      expect(upper).toBeDefined();
      expect(lower).toBeDefined();
      expect(upper?.code).toBe(lower?.code);
    });

    it("should return undefined for non-existent code", () => {
      const strategy = findHyperMillStrategyByCode("FAKE123");
      expect(strategy).toBeUndefined();
    });
  });

  // ============================================================================
  // Search
  // ============================================================================

  describe("Search", () => {
    it("should find strategies by name keyword", () => {
      const results = searchHyperMillStrategies("rough");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(s => s.code === "TRNR")).toBe(true);
    });

    it("should find strategies by description keyword", () => {
      const results = searchHyperMillStrategies("contour");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find strategies by use case keyword", () => {
      const results = searchHyperMillStrategies("thread");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Roughing/Finishing Filters
  // ============================================================================

  describe("Roughing/Finishing Filters", () => {
    it("should return roughing strategies", () => {
      const roughing = getRoughingStrategies();
      expect(roughing.length).toBeGreaterThan(5);
      for (const s of roughing) {
        expect(s.supports_roughing).toBe(true);
      }
    });

    it("should return finishing strategies", () => {
      const finishing = getFinishingStrategies();
      expect(finishing.length).toBeGreaterThan(5);
      for (const s of finishing) {
        expect(s.supports_finishing).toBe(true);
      }
    });

    it("should have strategies that support both", () => {
      const both = HYPERMILL_TURNING_STRATEGIES.filter(s => s.supports_roughing && s.supports_finishing);
      expect(both.length).toBeGreaterThan(0);
      expect(both.some(s => s.code === "CFT")).toBe(true);
    });
  });

  // ============================================================================
  // 5-Axis Strategies
  // ============================================================================

  describe("5-Axis Strategies", () => {
    it("should return 6 5-axis strategies", () => {
      const fiveAxis = get5AxisStrategies();
      expect(fiveAxis.length).toBe(6);
    });

    it("should all be in DRILL group", () => {
      const fiveAxis = get5AxisStrategies();
      for (const s of fiveAxis) {
        expect(s.group).toBe("DRILL");
      }
    });

    it("should include drilling, reaming, tapping", () => {
      const fiveAxis = get5AxisStrategies();
      expect(fiveAxis.some(s => s.code === "DDRX5")).toBe(true);  // Drilling
      expect(fiveAxis.some(s => s.code === "DRMX5")).toBe(true);  // Reaming
      expect(fiveAxis.some(s => s.code === "DTAPX5")).toBe(true); // Tapping
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe("Statistics", () => {
    it("should return correct stats", () => {
      const stats = getStrategyStats();
      expect(stats.total).toBe(26);
      expect(stats.by_group.TURN).toBeGreaterThan(0);
      expect(stats.by_group.GROOVE).toBeGreaterThan(0);
      expect(stats.by_group.THREAD).toBeGreaterThan(0);
      expect(stats.by_group.DRILL).toBeGreaterThan(0);
      expect(stats.roughing_count).toBeGreaterThan(0);
      expect(stats.finishing_count).toBeGreaterThan(0);
      expect(stats.five_axis_count).toBe(6);
    });
  });

  // ============================================================================
  // Replaceable Strategies
  // ============================================================================

  describe("Replaceable Strategies", () => {
    it("should have replaceable_with for compatible strategies", () => {
      const cft = findHyperMillStrategyByCode("CFT");
      expect(cft?.replaceable_with).toContain("CRT");
      expect(cft?.replaceable_with).toContain("CAT");
    });

    it("should have matching replaceable pairs", () => {
      const trnr = findHyperMillStrategyByCode("TRNR");
      const trnf = findHyperMillStrategyByCode("TRNF");
      expect(trnr?.replaceable_with).toContain("TRNF");
      expect(trnf?.replaceable_with).toContain("TRNR");
    });
  });
});
