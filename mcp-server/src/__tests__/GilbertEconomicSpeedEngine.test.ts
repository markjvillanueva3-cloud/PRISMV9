/**
 * GilbertEconomicSpeedEngine Test Suite (LATHE-PRO-MS5)
 */
import { describe, it, expect } from "vitest";
import { gilbertEconomicSpeedEngine } from "../engines/GilbertEconomicSpeedEngine.js";

describe("GilbertEconomicSpeedEngine", () => {
  describe("compute()", () => {
    it("returns Vc_min_cost > 0 for canonical carbide params", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350, // typical carbide on P-group
        n: 0.25,
        machining_cost_per_sec_usd: 0.025, // $90/hr
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
      });
      expect(r.Vc_min_cost).toBeGreaterThan(0);
      expect(r.Vc_min_time).toBeGreaterThan(0);
    });

    it("Vc_min_time ≥ Vc_min_cost (Gilbert inequality)", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
      });
      expect(r.Vc_min_time).toBeGreaterThanOrEqual(r.Vc_min_cost);
    });

    it("Hi-E band [low, high] ordered", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 400,
        n: 0.3,
        machining_cost_per_sec_usd: 0.03,
        tool_change_time_sec: 45,
        tool_cost_per_edge_usd: 10,
      });
      expect(r.hi_e_range_m_min[0]).toBeLessThanOrEqual(r.hi_e_range_m_min[1]);
    });

    it("Taylor life at min-cost longer than at min-time", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
      });
      expect(r.T_min_cost_min).toBeGreaterThanOrEqual(r.T_min_time_min);
    });

    it("cost per part populated when geometry + feed supplied", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
        cut_length_mm: 100,
        f_mm_rev: 0.2,
        diameter_mm: 30,
      });
      expect(r.cost_per_part_at_min_cost_usd).toBeGreaterThan(0);
      expect(r.cost_per_part_at_min_time_usd).toBeGreaterThan(0);
    });

    it("cost at min-cost is lower than at min-time", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
        cut_length_mm: 100,
        f_mm_rev: 0.2,
        diameter_mm: 30,
      });
      expect(r.cost_per_part_at_min_cost_usd!).toBeLessThanOrEqual(
        r.cost_per_part_at_min_time_usd!
      );
    });

    it("max-profit Vc populated when revenue supplied", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
        cut_length_mm: 100,
        f_mm_rev: 0.2,
        diameter_mm: 30,
        revenue_per_part_usd: 50,
      });
      expect(r.Vc_max_profit).toBeDefined();
      expect(r.profit_per_hour_usd).toBeDefined();
    });

    it("rpm at min-cost populated when diameter supplied", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
        cut_length_mm: 100,
        f_mm_rev: 0.2,
        diameter_mm: 30,
      });
      expect(r.rpm_at_min_cost).toBeGreaterThan(0);
    });

    it("throws on invalid Taylor params", () => {
      expect(() =>
        gilbertEconomicSpeedEngine.compute({
          K_T: 0,
          n: 0.25,
          machining_cost_per_sec_usd: 0.025,
          tool_change_time_sec: 60,
          tool_cost_per_edge_usd: 8,
        })
      ).toThrow();
      expect(() =>
        gilbertEconomicSpeedEngine.compute({
          K_T: 350,
          n: 1.5,
          machining_cost_per_sec_usd: 0.025,
          tool_change_time_sec: 60,
          tool_cost_per_edge_usd: 8,
        })
      ).toThrow();
    });

    it("reasoning array is non-empty", () => {
      const r = gilbertEconomicSpeedEngine.compute({
        K_T: 350,
        n: 0.25,
        machining_cost_per_sec_usd: 0.025,
        tool_change_time_sec: 60,
        tool_cost_per_edge_usd: 8,
      });
      expect(r.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("compareVc()", () => {
    const baseInput = {
      K_T: 350,
      n: 0.25,
      machining_cost_per_sec_usd: 0.025,
      tool_change_time_sec: 60,
      tool_cost_per_edge_usd: 8,
    };

    it("flags Vc 50% below as 'below'", () => {
      const opt = gilbertEconomicSpeedEngine.compute(baseInput);
      const r = gilbertEconomicSpeedEngine.compareVc(opt.Vc_min_cost * 0.5, baseInput);
      expect(r.relative).toBe("below");
    });

    it("flags Vc 50% above as 'above'", () => {
      const opt = gilbertEconomicSpeedEngine.compute(baseInput);
      const r = gilbertEconomicSpeedEngine.compareVc(opt.Vc_min_cost * 1.5, baseInput);
      expect(r.relative).toBe("above");
    });

    it("flags Vc at optimum as 'at'", () => {
      const opt = gilbertEconomicSpeedEngine.compute(baseInput);
      const r = gilbertEconomicSpeedEngine.compareVc(opt.Vc_min_cost, baseInput);
      expect(r.relative).toBe("at");
    });
  });

  describe("getStats()", () => {
    it("returns formulas + references", () => {
      const s = gilbertEconomicSpeedEngine.getStats();
      expect(s.formulas.length).toBeGreaterThan(0);
      expect(s.references.some((r) => r.includes("Gilbert"))).toBe(true);
    });
  });
});
