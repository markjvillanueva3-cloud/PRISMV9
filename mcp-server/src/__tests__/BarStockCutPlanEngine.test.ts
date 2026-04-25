/**
 * BarStockCutPlanEngine Test Suite (LATHE-PRO-MS6)
 */
import { describe, it, expect } from "vitest";
import { barStockCutPlanEngine } from "../engines/BarStockCutPlanEngine.js";

describe("BarStockCutPlanEngine", () => {
  describe("plan()", () => {
    it("fits multiple identical parts on a bar", () => {
      const r = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 100, quantity: 5 }],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
      });
      expect(r.assignments.length).toBeGreaterThanOrEqual(1);
      expect(r.summary.total_parts).toBe(5);
    });

    it("splits across multiple bars when needed", () => {
      const r = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 500, quantity: 20 }],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
      });
      expect(r.summary.total_bars).toBeGreaterThan(1);
    });

    it("reports unfulfilled for part longer than bar", () => {
      const r = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 5000, quantity: 1 }],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
      });
      expect(r.unfulfilled.length).toBeGreaterThan(0);
    });

    it("yield percentage in [0, 100]", () => {
      const r = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 100, quantity: 5 }],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
      });
      expect(r.summary.overall_yield_pct).toBeGreaterThanOrEqual(0);
      expect(r.summary.overall_yield_pct).toBeLessThanOrEqual(100);
    });

    it("estimates cost when bar cost_per_bar_usd given", () => {
      const r = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 100, quantity: 5 }],
        bar_options: [{ id: "bar3m", length_mm: 3000, cost_per_bar_usd: 42 }],
      });
      expect(r.summary.estimated_cost_usd).toBeDefined();
    });

    it("accounts for kerf between cuts", () => {
      const noKerf = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 99, quantity: 30 }],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
        kerf_mm: 0,
      });
      const withKerf = barStockCutPlanEngine.plan({
        requirements: [{ id: "p1", part_length_mm: 99, quantity: 30 }],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
        kerf_mm: 3,
      });
      // More kerf means more bars needed or lower yield
      expect(noKerf.summary.overall_yield_pct).toBeGreaterThanOrEqual(
        withKerf.summary.overall_yield_pct
      );
    });

    it("sorts parts by length descending (FFD)", () => {
      const r = barStockCutPlanEngine.plan({
        requirements: [
          { id: "small", part_length_mm: 50, quantity: 10 },
          { id: "big", part_length_mm: 900, quantity: 3 },
        ],
        bar_options: [{ id: "bar3m", length_mm: 3000 }],
      });
      expect(r.assignments[0]!.cuts.some((c) => c.requirement_id === "big")).toBe(true);
    });
  });

  describe("partsPerBar()", () => {
    it("counts parts on a 3m bar with 100mm parts", () => {
      const r = barStockCutPlanEngine.partsPerBar(3000, 100);
      expect(r.count).toBeGreaterThan(20);
    });

    it("zero count for part longer than bar", () => {
      const r = barStockCutPlanEngine.partsPerBar(1000, 5000);
      expect(r.count).toBe(0);
    });

    it("accounts for grip_allowance", () => {
      const noGrip = barStockCutPlanEngine.partsPerBar(1000, 100, { grip_allowance_mm: 0 });
      const withGrip = barStockCutPlanEngine.partsPerBar(1000, 100, { grip_allowance_mm: 100 });
      expect(noGrip.count).toBeGreaterThanOrEqual(withGrip.count);
    });

    it("utilization in [0, 100]", () => {
      const r = barStockCutPlanEngine.partsPerBar(3000, 100);
      expect(r.utilization_pct).toBeGreaterThanOrEqual(0);
      expect(r.utilization_pct).toBeLessThanOrEqual(100);
    });
  });

  describe("getStats()", () => {
    it("reports algorithm and features", () => {
      const s = barStockCutPlanEngine.getStats();
      expect(s.algorithm).toContain("First-Fit-Decreasing");
      expect(s.features.length).toBeGreaterThan(3);
    });
  });
});
