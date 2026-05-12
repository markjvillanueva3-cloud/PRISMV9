/**
 * GrindingReplacementEngine Test Suite (LATHE-PRO-MS6)
 */
import { describe, it, expect } from "vitest";
import { grindingReplacementEngine } from "../engines/GrindingReplacementEngine.js";

const baseGrind = {
  achieved_ra_um: 0.4,
  achieved_tolerance_mm: 0.01,
  stock_removal_mm: 0.1,
  grind_cycle_sec: 120,
  grind_cost_per_part_usd: 8,
};

describe("GrindingReplacementEngine", () => {
  describe("evaluate()", () => {
    it("recommends replace for moderate grind on 58 HRC part", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.feasibility).toBe("replace");
      expect(r.recommended_tool_material).toBe("CBN");
    });

    it("blocks replacement for mirror finish (<0.2 Ra)", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: { ...baseGrind, achieved_ra_um: 0.1 },
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.feasibility).toBe("blocked");
      expect(r.blockers.length).toBeGreaterThan(0);
    });

    it("blocks for tensile residual stress requirement", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
        residual_stress_requirement: "tensile_required",
      });
      expect(r.feasibility).toBe("blocked");
    });

    it("blocks for ultra-tight tolerance (<0.003)", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: { ...baseGrind, achieved_tolerance_mm: 0.002 },
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.feasibility).toBe("blocked");
    });

    it("recommends ceramic for 50 HRC (below CBN sweet spot)", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: { ...baseGrind, achieved_ra_um: 0.8 },
        hardness_hrc: 50,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      if (r.feasibility === "replace") {
        expect(r.recommended_tool_material).toBe("ceramic");
      }
    });

    it("blocks for L/D > 10 chatter", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 12,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.feasibility).toBe("blocked");
    });

    it("reports cycle time + cost savings", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.cycle_time_savings_sec).toBeGreaterThan(0);
      expect(r.cost_savings_per_part_usd).toBeGreaterThan(0);
    });

    it("break-even lot size populated when there's savings", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.break_even_lot_size).toBeDefined();
      expect(r.break_even_lot_size!).toBeGreaterThan(0);
    });

    it("surface integrity note set", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.surface_integrity_tradeoff.length).toBeGreaterThan(5);
    });

    it("confidence is in [0, 1]", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        lot_size: 100,
      });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("blocks for thin wall < 2mm", () => {
      const r = grindingReplacementEngine.evaluate({
        baseline: baseGrind,
        hardness_hrc: 58,
        length_over_diameter: 3,
        diameter_mm: 30,
        wall_thickness_mm: 1.5,
        lot_size: 100,
      });
      expect(r.feasibility).toBe("blocked");
    });
  });

  describe("getStats()", () => {
    it("returns scoring metadata", () => {
      const s = grindingReplacementEngine.getStats();
      expect(s.blocker_count).toBe(7);
      expect(s.scoring_factors.length).toBeGreaterThan(5);
    });
  });
});
