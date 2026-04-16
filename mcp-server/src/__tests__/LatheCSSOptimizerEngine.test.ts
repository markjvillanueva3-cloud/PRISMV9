/**
 * LatheCSSOptimizerEngine Test Suite (LATHE-PRO-MS5)
 */
import { describe, it, expect } from "vitest";
import { latheCSSOptimizerEngine } from "../engines/LatheCSSOptimizerEngine.js";

describe("LatheCSSOptimizerEngine", () => {
  describe("optimize()", () => {
    it("returns clamp RPM below rated max", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 300,
        max_od_mm: 60,
        min_od_mm: 10,
        rated_max_rpm: 4000,
      });
      expect(r.recommended_clamp_rpm).toBeLessThanOrEqual(4000);
      expect(r.recommended_clamp_rpm).toBeGreaterThan(0);
    });

    it("computes clamp-activation diameter", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 300,
        max_od_mm: 60,
        min_od_mm: 10,
        rated_max_rpm: 4000,
      });
      expect(r.clamp_activates_at_diameter_mm).toBeGreaterThan(0);
      expect(r.clamp_activates_at_diameter_mm).toBeLessThanOrEqual(60);
    });

    it("RPM at max OD is slower than uncapped at min OD", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 300,
        max_od_mm: 80,
        min_od_mm: 5,
        rated_max_rpm: 6000,
      });
      expect(r.rpm_at_max_od).toBeLessThan(r.uncapped_rpm_at_min_od);
    });

    it("css + clamped fractions sum to ~1", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 250,
        max_od_mm: 50,
        min_od_mm: 15,
        rated_max_rpm: 3500,
      });
      expect(r.true_css_fraction + r.clamped_fraction).toBeCloseTo(1, 2);
    });

    it("prefers G97 when RPM at max OD below min_rpm", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 10, // very low Vc
        max_od_mm: 500,
        min_od_mm: 400,
        rated_max_rpm: 2000,
        min_rpm: 100,
      });
      expect(r.prefer_g97).toBe(true);
    });

    it("cycle time comparison populated when cut_length + feed supplied", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 200,
        max_od_mm: 40,
        min_od_mm: 10,
        rated_max_rpm: 4000,
        cut_length_mm: 100,
        f_mm_rev: 0.2,
      });
      expect(r.css_cycle_time_sec).toBeDefined();
      expect(r.g97_cycle_time_sec).toBeDefined();
      expect(r.cycle_time_delta_sec).toBeDefined();
    });

    it("rejects invalid diameters", () => {
      expect(() =>
        latheCSSOptimizerEngine.optimize({
          Vc_m_min: 200,
          max_od_mm: 0,
          min_od_mm: 0,
          rated_max_rpm: 3000,
        })
      ).toThrow();
    });

    it("rejects min_od > max_od", () => {
      expect(() =>
        latheCSSOptimizerEngine.optimize({
          Vc_m_min: 200,
          max_od_mm: 20,
          min_od_mm: 40,
          rated_max_rpm: 3000,
        })
      ).toThrow();
    });

    it("reasoning array is non-empty", () => {
      const r = latheCSSOptimizerEngine.optimize({
        Vc_m_min: 200,
        max_od_mm: 50,
        min_od_mm: 15,
        rated_max_rpm: 3500,
      });
      expect(r.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("selectMode()", () => {
    it("short features prefer G97", () => {
      const r = latheCSSOptimizerEngine.selectMode(200, 30, 4000, 3);
      expect(r.mode).toBe("G97");
    });

    it("longer features prefer G96", () => {
      const r = latheCSSOptimizerEngine.selectMode(200, 30, 4000, 30);
      expect(r.mode).toBe("G96");
    });

    it("RPM respects machine max", () => {
      const r = latheCSSOptimizerEngine.selectMode(500, 5, 3000, 50);
      expect(r.rpm).toBeLessThanOrEqual(3000);
    });
  });

  describe("getStats()", () => {
    it("returns formulas list", () => {
      const s = latheCSSOptimizerEngine.getStats();
      expect(s.formulas.length).toBeGreaterThan(0);
      expect(s.safety_factor).toBe(0.95);
    });
  });
});
