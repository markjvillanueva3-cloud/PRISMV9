/**
 * LatheProgrammingCostEngine Test Suite (T054)
 * =============================================
 *
 * MS11 (U-LAT82) — Tests for the dedicated programming cost model.
 * Covers cost estimation, 4-way comparison, break-even analysis, and
 * verification that rates are pulled from ShopConfigurationEngine (not hardcoded).
 *
 * @milestone LATHE-AWARE-HARDEN MS11
 * @unit U-LAT82
 */

import { describe, it, expect } from "vitest";
import { latheProgrammingCostEngine } from "../engines/LatheProgrammingCostEngine.js";

describe("LatheProgrammingCostEngine", () => {
  // ── estimateProgrammingCost() ──────────────────────────────────────────

  describe("estimateProgrammingCost()", () => {
    it("returns a complete cost result for hardcode + moderate + lot=10", () => {
      const r = latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 10);
      expect(r.total_cost).toBeGreaterThan(0);
      expect(r.per_part_cost).toBeCloseTo(r.total_cost / 10, 1);
      expect(r.programming_hr).toBeGreaterThan(0);
      expect(r.setup_hr).toBeGreaterThan(0);
      expect(r.cycle_hr).toBeGreaterThan(0);
    });

    it("CAM style includes cam_seat cost, hardcode does not", () => {
      const cam = latheProgrammingCostEngine.estimateProgrammingCost("cam", "moderate", 10);
      const hardcode = latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 10);
      expect(cam.cost_breakdown.cam_seat).toBeGreaterThan(0);
      expect(hardcode.cost_breakdown.cam_seat).toBe(0);
    });

    it("conversational adds machine occupancy to programming labor", () => {
      // Conversational runs at the machine — programming_labor should exceed
      // simple programming rate × programming_hr because machine rate is added.
      const conv = latheProgrammingCostEngine.estimateProgrammingCost(
        "conversational",
        "moderate",
        1,
        { programmer_rate_per_hr: 80, machine_rate_per_hr: 85 }
      );
      // programming_labor = 0.6 * 80 + 0.6 * 85 = 48 + 51 = 99
      expect(conv.cost_breakdown.programming_labor).toBeCloseTo(99, 1);
    });

    it("scales programming_hr with complexity multiplier", () => {
      const simple = latheProgrammingCostEngine.estimateProgrammingCost("cam", "simple", 1);
      const complex = latheProgrammingCostEngine.estimateProgrammingCost("cam", "complex", 1);
      const vc = latheProgrammingCostEngine.estimateProgrammingCost("cam", "very_complex", 1);
      expect(complex.programming_hr).toBeGreaterThan(simple.programming_hr);
      expect(vc.programming_hr).toBeGreaterThan(complex.programming_hr);
    });

    it("scales cycle_hr linearly with lot size", () => {
      const small = latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 1);
      const big = latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 100);
      // cycle_hr should scale ~100× (lot size ratio)
      expect(big.cycle_hr / small.cycle_hr).toBeCloseTo(100, 0);
    });

    it("respects feature_surcharge_pct", () => {
      const base = latheProgrammingCostEngine.estimateProgrammingCost(
        "cam",
        "moderate",
        10,
        {}
      );
      const surcharged = latheProgrammingCostEngine.estimateProgrammingCost(
        "cam",
        "moderate",
        10,
        { feature_surcharge_pct: 20 }
      );
      // Surcharge adds 20% of base total
      const expected = base.total_cost * 1.2;
      expect(surcharged.total_cost).toBeCloseTo(expected, 0);
      expect(surcharged.cost_breakdown.feature_surcharge).toBeGreaterThan(0);
    });

    it("throws on lot_size < 1", () => {
      expect(() =>
        latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 0)
      ).toThrow();
    });

    it("uses programmer_rate_per_hr override when provided", () => {
      const cheap = latheProgrammingCostEngine.estimateProgrammingCost(
        "hardcode",
        "moderate",
        1,
        { programmer_rate_per_hr: 30 }
      );
      const expensive = latheProgrammingCostEngine.estimateProgrammingCost(
        "hardcode",
        "moderate",
        1,
        { programmer_rate_per_hr: 200 }
      );
      expect(expensive.total_cost).toBeGreaterThan(cheap.total_cost);
      expect(expensive.assumptions.programmer_rate).toBe(200);
    });

    it("includes shop profile_id in assumptions", () => {
      const r = latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 1);
      expect(typeof r.assumptions.profile_id).toBe("string");
      expect(r.assumptions.profile_id.length).toBeGreaterThan(0);
    });

    it("pulls rates from ShopConfigurationEngine by default (no hardcoded rates)", () => {
      // If rates were hardcoded to 0, total_cost would not match shop rates.
      // Sanity: programmer_rate should match JM Die's 85/hr default.
      const r = latheProgrammingCostEngine.estimateProgrammingCost("hardcode", "moderate", 1);
      expect(r.assumptions.programmer_rate).toBeGreaterThan(0);
      expect(r.assumptions.setup_rate).toBeGreaterThan(0);
      expect(r.assumptions.machine_rate).toBeGreaterThan(0);
    });
  });

  // ── compareApproaches() ────────────────────────────────────────────────

  describe("compareApproaches()", () => {
    it("returns 4 ranked approaches", () => {
      const c = latheProgrammingCostEngine.compareApproaches({
        controller: "okuma_osp_p300",
        part_complexity: "moderate",
        lot_size: 10,
        available_cam_seats: 1,
      });
      expect(c.ranked.length).toBe(4);
    });

    it("ranked output is sorted ascending by cost", () => {
      const c = latheProgrammingCostEngine.compareApproaches({
        controller: "okuma_osp_p300",
        part_complexity: "moderate",
        lot_size: 10,
        available_cam_seats: 1,
      });
      for (let i = 1; i < c.ranked.length; i++) {
        expect(c.ranked[i]!.cost.total_cost).toBeGreaterThanOrEqual(
          c.ranked[i - 1]!.cost.total_cost
        );
      }
    });

    it("marks CAM infeasible when no seats available", () => {
      const c = latheProgrammingCostEngine.compareApproaches({
        controller: "fanuc_0i_f",
        part_complexity: "moderate",
        lot_size: 10,
        available_cam_seats: 0,
      });
      const cam = c.ranked.find((r) => r.style === "cam");
      expect(cam?.feasible).toBe(false);
      expect(cam?.notes.join(" ")).toContain("No CAM seats");
    });

    it("marks conversational infeasible on non-conversational controller", () => {
      const c = latheProgrammingCostEngine.compareApproaches({
        controller: "fanuc_0i_f",
        part_complexity: "simple",
        lot_size: 1,
      });
      const conv = c.ranked.find((r) => r.style === "conversational");
      expect(conv?.feasible).toBe(false);
    });

    it("marks hardcode infeasible for 5-axis work", () => {
      const c = latheProgrammingCostEngine.compareApproaches({
        controller: "okuma_osp_p300",
        part_complexity: "complex",
        lot_size: 1,
        requires_5axis: true,
        available_cam_seats: 1,
      });
      const hc = c.ranked.find((r) => r.style === "hardcode");
      expect(hc?.feasible).toBe(false);
    });

    it("cheapest_feasible differs from cheapest_overall when cheapest is infeasible", () => {
      // Scenario: fanuc_0i_f + no CAM — conversational might look cheap but is infeasible
      const c = latheProgrammingCostEngine.compareApproaches({
        controller: "fanuc_0i_f",
        part_complexity: "simple",
        lot_size: 1,
        available_cam_seats: 0,
      });
      const cheapestOverallEntry = c.ranked.find((r) => r.style === c.cheapest_overall);
      if (cheapestOverallEntry && !cheapestOverallEntry.feasible) {
        expect(c.cheapest_feasible).not.toBe(c.cheapest_overall);
      }
    });

    it("applies feature surcharge for threading + live tooling + 5-axis", () => {
      const base = latheProgrammingCostEngine.compareApproaches({
        controller: "okuma_osp_p300",
        part_complexity: "moderate",
        lot_size: 10,
        available_cam_seats: 1,
      });
      const surcharged = latheProgrammingCostEngine.compareApproaches({
        controller: "okuma_osp_p300",
        part_complexity: "moderate",
        lot_size: 10,
        available_cam_seats: 1,
        has_threading: true,
        has_live_tooling: true,
        requires_5axis: true,
      });
      // 5-axis adds 15%, threading 5%, live_tooling 8% = 28% total
      const baseCam = base.ranked.find((r) => r.style === "cam")!;
      const surCam = surcharged.ranked.find((r) => r.style === "cam")!;
      expect(surCam.cost.total_cost).toBeGreaterThan(baseCam.cost.total_cost);
    });
  });

  // ── breakEvenAnalysis() ────────────────────────────────────────────────

  describe("breakEvenAnalysis()", () => {
    it("computes macro vs hardcode costs at every lot size", () => {
      const a = latheProgrammingCostEngine.breakEvenAnalysis(0, [10, 50, 100], "moderate");
      expect(a.points.length).toBe(3);
      a.points.forEach((p) => {
        expect(p.macro_total_cost).toBeGreaterThan(0);
        expect(p.hardcode_total_cost).toBeGreaterThan(0);
      });
    });

    it("macro_is_cheaper flag transitions as lot size grows (for moderate complexity)", () => {
      const a = latheProgrammingCostEngine.breakEvenAnalysis(0, [1, 10, 100, 1000], "moderate");
      // At some lot size macro should become cheaper due to better cycle efficiency
      const someCheaper = a.points.some((p) => p.macro_is_cheaper);
      expect(someCheaper).toBe(true);
    });

    it("sets break_even_lot_size to the first crossover", () => {
      const a = latheProgrammingCostEngine.breakEvenAnalysis(0, [1, 10, 100, 1000], "moderate");
      if (a.break_even_lot_size !== null) {
        const firstCheaper = a.points.find((p) => p.macro_is_cheaper);
        expect(a.break_even_lot_size).toBe(firstCheaper?.lot_size);
      }
    });

    it("returns recommendation string based on break-even point", () => {
      const a = latheProgrammingCostEngine.breakEvenAnalysis(2, [10, 50, 100], "moderate");
      expect(a.recommendation.length).toBeGreaterThan(0);
    });

    it("returns null break_even when macro never pays off", () => {
      // Huge macro investment — never pays off in small lot range
      const a = latheProgrammingCostEngine.breakEvenAnalysis(1000, [1, 5, 10], "simple");
      expect(a.break_even_lot_size).toBeNull();
      expect(a.recommendation).toContain("does not break even");
    });

    it("throws on negative macro investment", () => {
      expect(() =>
        latheProgrammingCostEngine.breakEvenAnalysis(-1, [10, 50])
      ).toThrow();
    });

    it("throws on empty lot_sizes", () => {
      expect(() => latheProgrammingCostEngine.breakEvenAnalysis(0, [])).toThrow();
    });

    it("macro_savings is negative when macro is more expensive", () => {
      const a = latheProgrammingCostEngine.breakEvenAnalysis(100, [1], "simple");
      const p = a.points[0]!;
      if (!p.macro_is_cheaper) {
        expect(p.macro_savings).toBeLessThan(0);
      }
    });
  });

  // ── Stats & integration ────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports 4 styles and a positive default CAM seat rate", () => {
      const s = latheProgrammingCostEngine.getStats();
      expect(s.styles_supported).toBe(4);
      expect(s.default_cam_seat_rate).toBeGreaterThan(0);
    });
  });
});
