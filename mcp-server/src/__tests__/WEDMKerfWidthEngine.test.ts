/**
 * WEDMKerfWidthEngine Tests
 * Kerf width prediction and validation
 */

import { describe, it, expect } from "vitest";
import {
  wedmKerfWidthEngine,
  WEDMKerfWidthEngine,
} from "../engines/WEDMKerfWidthEngine.js";

describe("WEDMKerfWidthEngine", () => {
  describe("calculateOvercut", () => {
    it("calculates overcut using empirical model", () => {
      const overcut = wedmKerfWidthEngine.calculateOvercut(10, 20);
      expect(overcut).toBeGreaterThan(0.005); // Minimum overcut
      expect(overcut).toBeLessThan(0.1); // Reasonable upper bound
    });

    it("increases with current", () => {
      const low = wedmKerfWidthEngine.calculateOvercut(5, 20);
      const high = wedmKerfWidthEngine.calculateOvercut(15, 20);
      expect(high).toBeGreaterThan(low);
    });

    it("increases with ton", () => {
      const short = wedmKerfWidthEngine.calculateOvercut(10, 10);
      const long = wedmKerfWidthEngine.calculateOvercut(10, 40);
      expect(long).toBeGreaterThan(short);
    });

    it("applies material multipliers", () => {
      const steel = wedmKerfWidthEngine.calculateOvercut(10, 20, "steel");
      const aluminum = wedmKerfWidthEngine.calculateOvercut(10, 20, "aluminum");
      expect(aluminum).toBeGreaterThan(steel); // Al has 1.4× multiplier
    });

    it("applies operation multipliers", () => {
      const roughing = wedmKerfWidthEngine.calculateOvercut(10, 20, "steel", "roughing");
      const finishing = wedmKerfWidthEngine.calculateOvercut(10, 20, "steel", "finishing");
      expect(finishing).toBeLessThan(roughing);
    });

    it("throws on invalid input", () => {
      expect(() => wedmKerfWidthEngine.calculateOvercut(0, 20)).toThrow();
      expect(() => wedmKerfWidthEngine.calculateOvercut(10, 0)).toThrow();
    });
  });

  describe("calculateKerfWidth", () => {
    it("calculates kerf from wire and overcut", () => {
      // kerf = wire + 2×overcut = 0.25 + 2×0.03 = 0.31
      const kerf = wedmKerfWidthEngine.calculateKerfWidth(0.25, 0.03);
      expect(kerf).toBeCloseTo(0.31, 3);
    });
  });

  describe("estimateSurfaceRoughness", () => {
    it("estimates Ra based on parameters", () => {
      const Ra = wedmKerfWidthEngine.estimateSurfaceRoughness(10, 20);
      expect(Ra).toBeGreaterThan(0.2); // Min achievable
      expect(Ra).toBeLessThan(10); // Reasonable upper bound
    });

    it("decreases for finishing operations", () => {
      const roughing = wedmKerfWidthEngine.estimateSurfaceRoughness(10, 20, "roughing");
      const finishing = wedmKerfWidthEngine.estimateSurfaceRoughness(10, 20, "finishing");
      expect(finishing).toBeLessThan(roughing);
    });
  });

  describe("determineToleranceClass", () => {
    it("returns tighter tolerance for lower uncertainty", () => {
      const tight = wedmKerfWidthEngine.determineToleranceClass(0.001);
      const loose = wedmKerfWidthEngine.determineToleranceClass(0.02);

      // IT numbers: lower = tighter
      const tightNum = parseInt(tight.slice(2));
      const looseNum = parseInt(loose.slice(2));
      expect(tightNum).toBeLessThan(looseNum);
    });
  });

  describe("predict", () => {
    it("predicts kerf width for typical parameters", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 10,
        ton_us: 20,
      });

      expect(result.kerf_width_mm).toBeGreaterThan(0.25); // Greater than wire
      expect(result.overcut_mm).toBeGreaterThan(0);
      expect(result.wire_offset_mm).toBeCloseTo(result.overcut_mm, 4);
      expect(result.estimated_Ra_um).toBeGreaterThan(0);
      expect(result.tolerance_class).toMatch(/^IT\d+$/);
    });

    it("predicts finer results for finishing", () => {
      const roughing = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 15,
        ton_us: 30,
        operation_type: "roughing",
      });

      const finishing = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 5,
        ton_us: 5,
        operation_type: "finishing",
      });

      expect(finishing.kerf_width_mm).toBeLessThan(roughing.kerf_width_mm);
      expect(finishing.estimated_Ra_um).toBeLessThan(roughing.estimated_Ra_um);
    });

    it("includes recast layer estimate", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 10,
        ton_us: 20,
      });
      expect(result.recast_layer_um).toBeGreaterThan(result.estimated_Ra_um);
    });

    it("warns for roughing with tight tolerance expectations", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        peak_current_A: 5,
        ton_us: 5,
        operation_type: "roughing",
      });
      // Low parameters during roughing might achieve tight tolerance
      // but warning should be present if tolerance class is < IT9
      const toleranceNum = parseInt(result.tolerance_class.slice(2));
      if (toleranceNum < 9) {
        expect(result.warning).toBeDefined();
      }
    });

    it("throws on invalid input", () => {
      expect(() =>
        wedmKerfWidthEngine.predict({
          wire_diameter_mm: 0,
          peak_current_A: 10,
          ton_us: 20,
        })
      ).toThrow();
    });
  });

  describe("calculateForTargetKerf", () => {
    it("calculates parameters for target kerf", () => {
      const result = wedmKerfWidthEngine.calculateForTargetKerf(0.30, 0.25);
      if (result) {
        expect(result.peak_current_A).toBeGreaterThan(0);
        expect(result.ton_us).toBeGreaterThan(0);
      }
    });

    it("returns null for physically impossible kerf", () => {
      // Target kerf smaller than wire diameter
      const result = wedmKerfWidthEngine.calculateForTargetKerf(0.20, 0.25);
      expect(result).toBeNull();
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMKerfWidthEngine();
      engine.configure({ base_overcut_coefficient: 0.002 });
      expect(engine.getConfig().base_overcut_coefficient).toBe(0.002);
    });
  });
});
