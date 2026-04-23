/**
 * WEDMAdaptivePassEngine Tests
 * U-PROD-17: Adaptive multi-pass strategy
 */

import { describe, it, expect } from "vitest";
import {
  wedmAdaptivePassEngine,
  WEDMAdaptivePassEngine,
} from "../engines/WEDMAdaptivePassEngine.js";

describe("WEDMAdaptivePassEngine", () => {
  describe("determineToleranceClass", () => {
    it("returns IT6 for ultra-tight tolerance", () => {
      const tc = wedmAdaptivePassEngine.determineToleranceClass(0.005);
      expect(tc.class).toBe("IT6");
    });

    it("returns IT7 for tight tolerance", () => {
      const tc = wedmAdaptivePassEngine.determineToleranceClass(0.012);
      expect(tc.class).toBe("IT7");
    });

    it("returns IT10 for moderate tolerance", () => {
      const tc = wedmAdaptivePassEngine.determineToleranceClass(0.05);
      expect(tc.class).toBe("IT10");
    });

    it("returns IT12 for loose tolerance", () => {
      const tc = wedmAdaptivePassEngine.determineToleranceClass(0.15);
      expect(tc.class).toBe("IT12");
    });
  });

  describe("calculatePassCount", () => {
    it("returns 4 passes for IT6 tolerance", () => {
      const count = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.005,
        thickness_mm: 25,
      });
      expect(count).toBe(4);
    });

    it("returns 1 pass for coarse tolerance", () => {
      const count = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.1,
        thickness_mm: 25,
      });
      expect(count).toBe(1);
    });

    it("increases passes for fine surface finish", () => {
      const count = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.05,
        thickness_mm: 25,
        surface_finish_Ra_um: 0.4,
      });
      expect(count).toBeGreaterThanOrEqual(4);
    });

    it("increases passes for thick material", () => {
      const thin = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.05,
        thickness_mm: 25,
      });
      const thick = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.05,
        thickness_mm: 100,
      });
      expect(thick).toBeGreaterThanOrEqual(thin);
    });
  });

  describe("calculateOffsets", () => {
    it("returns single offset for one pass", () => {
      const offsets = wedmAdaptivePassEngine.calculateOffsets(1, 0.15);
      expect(offsets).toHaveLength(1);
      expect(offsets[0]).toBe(0.15);
    });

    it("distributes offsets across multiple passes", () => {
      const offsets = wedmAdaptivePassEngine.calculateOffsets(3, 0.15);
      expect(offsets).toHaveLength(3);
      // Sum should equal total offset
      expect(offsets.reduce((a, b) => a + b, 0)).toBeCloseTo(0.15, 4);
    });

    it("rough pass takes largest offset", () => {
      const offsets = wedmAdaptivePassEngine.calculateOffsets(3, 0.15);
      // First offset (rough) should be largest
      expect(offsets[0]).toBeGreaterThan(offsets[1]);
    });
  });

  describe("getExpectedRa", () => {
    it("returns rough Ra for pass 1", () => {
      const ra = wedmAdaptivePassEngine.getExpectedRa(1, 3);
      expect(ra).toBe(3.2);
    });

    it("returns progressively finer Ra for skim passes", () => {
      const ra1 = wedmAdaptivePassEngine.getExpectedRa(2, 4);
      const ra2 = wedmAdaptivePassEngine.getExpectedRa(3, 4);
      const ra3 = wedmAdaptivePassEngine.getExpectedRa(4, 4);

      expect(ra2).toBeLessThan(ra1);
      expect(ra3).toBeLessThan(ra2);
    });
  });

  describe("generateStrategy", () => {
    it("generates single-pass for loose tolerance", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.15,
        thickness_mm: 25,
      });

      expect(result.total_passes).toBe(1);
      expect(result.pass_strategy_name).toContain("Single-pass");
    });

    it("generates multi-pass for tight tolerance", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.01,
        thickness_mm: 25,
      });

      expect(result.total_passes).toBeGreaterThan(1);
    });

    it("includes pass definitions with correct types", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.01,
        thickness_mm: 25,
      });

      expect(result.passes[0].pass_type).toBe("rough");
      if (result.passes.length > 1) {
        expect(result.passes[1].pass_type).toBe("skim");
      }
    });

    it("calculates feed rate factors", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.01,
        thickness_mm: 25,
      });

      // Rough should be slower, skim faster
      if (result.passes.length > 1) {
        expect(result.passes[1].feed_rate_factor).toBeGreaterThan(result.passes[0].feed_rate_factor);
      }
    });

    it("reduces spark energy for skim passes", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.01,
        thickness_mm: 25,
      });

      if (result.passes.length > 1) {
        expect(result.passes[1].spark_energy_factor).toBeLessThan(result.passes[0].spark_energy_factor);
      }
    });

    it("calculates total time factor", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.01,
        thickness_mm: 25,
      });

      expect(result.time_factor).toBeGreaterThan(0);
    });

    it("provides recommendations for ultra-precision", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.003,
        thickness_mm: 25,
      });

      expect(result.recommendations.some(r => r.includes("precision"))).toBe(true);
    });

    it("warns when surface finish may not be achieved", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.05,
        thickness_mm: 25,
        surface_finish_Ra_um: 0.2, // Very fine
      });

      expect(result.recommendations.some(r => r.includes("Ra"))).toBe(true);
    });

    it("includes offset progression", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: 0.01,
        thickness_mm: 25,
      });

      // Offsets should be cumulative
      for (let i = 1; i < result.passes.length; i++) {
        expect(result.passes[i].wire_offset_mm).toBeGreaterThanOrEqual(
          result.passes[i - 1].wire_offset_mm
        );
      }
    });
  });

  describe("getMinPassesForTolerance", () => {
    it("returns correct pass counts", () => {
      expect(wedmAdaptivePassEngine.getMinPassesForTolerance(0.005)).toBe(4);
      expect(wedmAdaptivePassEngine.getMinPassesForTolerance(0.015)).toBe(3);
      expect(wedmAdaptivePassEngine.getMinPassesForTolerance(0.1)).toBe(1);
    });
  });

  describe("getToleranceClasses", () => {
    it("returns all tolerance classes", () => {
      const classes = wedmAdaptivePassEngine.getToleranceClasses();
      expect(classes.length).toBe(7); // IT6-IT12
      expect(classes[0].class).toBe("IT6");
      expect(classes[6].class).toBe("IT12");
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMAdaptivePassEngine();
      engine.configure({ rough_Ra_um: 4.0 });

      expect(engine.getConfig().rough_Ra_um).toBe(4.0);
    });
  });
});
