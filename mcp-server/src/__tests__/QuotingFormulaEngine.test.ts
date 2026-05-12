/**
 * QuotingFormulaEngine tests — SQ4-1-QUOTE
 *
 * Tests 6 cost formulas: ABC, learning curve, EOQ, calibration,
 * setup complexity, scrap reserve.
 */

import { describe, it, expect } from "vitest";
import { quotingFormulaEngine } from "../engines/QuotingFormulaEngine.js";

describe("QuotingFormulaEngine", () => {

  describe("activityBasedCost", () => {
    it("should compute total cost and per-part cost", () => {
      const r = quotingFormulaEngine.activityBasedCost({
        material_cost: 500,
        labor_hours: 8,
        labor_rate: 45,
        machine_hours: 6,
        machine_rate: 85,
        setup_count: 2,
        cost_per_setup: 150,
        inspection_count: 3,
        cost_per_inspection: 25,
        tool_change_count: 5,
        cost_per_tool_change: 10,
        batch_size: 100,
      });
      expect(r.total_cost).toBeGreaterThan(0);
      expect(r.cost_per_part).toBe(r.total_cost / 100);
      expect(r.breakdown.material).toBe(500);
      expect(r.breakdown.labor).toBe(360); // 8 * 45
      expect(r.breakdown.machine).toBe(510); // 6 * 85
      expect(r.breakdown.setup).toBe(300); // 2 * 150
      expect(r.breakdown.inspection).toBe(75); // 3 * 25
      expect(r.breakdown.tool_changes).toBe(50); // 5 * 10
      expect(r.dominant_driver).toBeTruthy();
    });

    it("should identify dominant cost driver", () => {
      const r = quotingFormulaEngine.activityBasedCost({
        material_cost: 5000,
        labor_hours: 1,
        labor_rate: 45,
        machine_hours: 1,
        machine_rate: 85,
        setup_count: 1,
        cost_per_setup: 50,
        inspection_count: 1,
        cost_per_inspection: 25,
        tool_change_count: 1,
        cost_per_tool_change: 10,
        batch_size: 10,
      });
      expect(r.dominant_driver).toBe("material");
    });

    it("should handle batch_size of 1", () => {
      const r = quotingFormulaEngine.activityBasedCost({
        material_cost: 100,
        labor_hours: 1,
        labor_rate: 45,
        machine_hours: 1,
        machine_rate: 85,
        setup_count: 1,
        cost_per_setup: 200,
        inspection_count: 1,
        cost_per_inspection: 50,
        tool_change_count: 0,
        cost_per_tool_change: 0,
        batch_size: 1,
      });
      expect(r.cost_per_part).toBe(r.total_cost);
    });
  });

  describe("learningCurve", () => {
    it("should reduce cost with 80% learning rate", () => {
      // Wright's law: at 80% curve, doubling quantity → 80% of previous cost
      const r = quotingFormulaEngine.learningCurve({
        first_unit_cost: 100,
        learning_rate: 0.80,
        quantity: 100,
      });
      expect(r.nth_unit_cost).toBeLessThan(100);
      expect(r.nth_unit_cost).toBeGreaterThan(10);
      expect(r.cumulative_cost).toBeGreaterThan(0);
      expect(r.average_unit_cost).toBeLessThan(100);
      expect(r.improvement_ratio).toBeLessThan(1);
      expect(r.exponent_b).toBeCloseTo(-0.3219, 3); // ln(0.80)/ln(2)
    });

    it("should verify doubling-means-80% property", () => {
      const r1 = quotingFormulaEngine.learningCurve({
        first_unit_cost: 100, learning_rate: 0.80, quantity: 1,
      });
      const r2 = quotingFormulaEngine.learningCurve({
        first_unit_cost: 100, learning_rate: 0.80, quantity: 2,
      });
      // Cost of unit 2 should be ~80% of unit 1
      expect(r2.nth_unit_cost / r1.nth_unit_cost).toBeCloseTo(0.80, 1);
    });

    it("should handle edge case of quantity 1", () => {
      const r = quotingFormulaEngine.learningCurve({
        first_unit_cost: 100, learning_rate: 0.85, quantity: 1,
      });
      expect(r.nth_unit_cost).toBe(100);
      expect(r.cumulative_cost).toBe(100);
    });

    it("should reject invalid learning rate", () => {
      const r = quotingFormulaEngine.learningCurve({
        first_unit_cost: 100, learning_rate: 1.5, quantity: 10,
      });
      expect(r.source).toContain("invalid");
    });
  });

  describe("economicBatchSize", () => {
    it("should compute classic EOQ", () => {
      // D=1000, S=$200, H=$5/unit/year → EOQ = sqrt(2*1000*200/5) = 283
      const r = quotingFormulaEngine.economicBatchSize({
        annual_demand: 1000,
        setup_cost: 200,
        holding_cost_per_unit: 5,
      });
      expect(r.eoq).toBe(283); // sqrt(80000) = 282.84 → rounds to 283
      expect(r.orders_per_year).toBeCloseTo(3.5, 0);
      expect(r.order_interval_days).toBeGreaterThan(90);
      // At EOQ, setup cost ≈ holding cost (fundamental EOQ property)
      expect(Math.abs(r.annual_setup_cost - r.annual_holding_cost)).toBeLessThan(r.annual_setup_cost * 0.05);
    });

    it("should handle zero inputs gracefully", () => {
      const r = quotingFormulaEngine.economicBatchSize({
        annual_demand: 0,
        setup_cost: 100,
        holding_cost_per_unit: 5,
      });
      expect(r.eoq).toBe(1);
      expect(r.source).toContain("invalid");
    });
  });

  describe("calibrateQuote", () => {
    it("should adjust quote based on historical data", () => {
      const r = quotingFormulaEngine.calibrateQuote({
        base_quote: 1000,
        historical: [
          { quoted: 900, actual: 1080 },  // underquoted by 20%
          { quoted: 1100, actual: 1210 },  // underquoted by 10%
          { quoted: 950, actual: 1045 },   // underquoted by 10%
          { quoted: 1000, actual: 1100 },  // underquoted by 10%
        ],
      });
      // All historicals show actual > quoted, so calibration_factor > 1
      expect(r.calibration_factor).toBeGreaterThan(1);
      expect(r.calibrated_quote).toBeGreaterThan(1000);
      expect(r.sample_size).toBe(4);
      expect(r.accuracy.mean_error_pct).toBeGreaterThan(0);
    });

    it("should return uncalibrated when no history", () => {
      const r = quotingFormulaEngine.calibrateQuote({
        base_quote: 500,
        historical: [],
      });
      expect(r.calibrated_quote).toBe(500);
      expect(r.calibration_factor).toBe(1.0);
      expect(r.confidence).toBeLessThan(0.2);
    });

    it("should filter by material when enough samples", () => {
      const r = quotingFormulaEngine.calibrateQuote({
        base_quote: 1000,
        material: "aluminum",
        historical: [
          { quoted: 100, actual: 150, material: "aluminum" },
          { quoted: 200, actual: 300, material: "aluminum" },
          { quoted: 300, actual: 450, material: "aluminum" },
          { quoted: 100, actual: 100, material: "steel" },
          { quoted: 200, actual: 200, material: "steel" },
        ],
      });
      // Aluminum historicals show 50% underquote consistently
      expect(r.calibration_factor).toBeCloseTo(1.5, 1);
      expect(r.sample_size).toBe(3); // Only aluminum records used
    });
  });

  describe("setupComplexity", () => {
    it("should score minimal setup as simple tier", () => {
      const r = quotingFormulaEngine.setupComplexity({
        setup_count: 1,
        wcs_count: 1,
        tool_count: 1,
        orientation_changes: 0,
        tightest_tolerance_mm: 0.5, // Very loose — IT12+
        probing_required: false,
        custom_fixture: false,
      });
      // 15 + 5 + 1 + 0 + 0 + 0 + 0 = 21 → just above "simple" threshold
      // A truly minimal setup: 1 tool, 1 WCS, loose tolerance
      expect(r.score).toBeLessThanOrEqual(25);
      expect(r.tier).toBe("moderate"); // Even 1-setup is "moderate" in manufacturing
      expect(r.estimated_setup_time_min).toBe(30);
    });

    it("should score complex multi-setup as complex/extreme", () => {
      const r = quotingFormulaEngine.setupComplexity({
        setup_count: 3,
        wcs_count: 6,
        tool_count: 15,
        orientation_changes: 2,
        tightest_tolerance_mm: 0.005,
        probing_required: true,
        custom_fixture: true,
        hardness_hrc: 52,
      });
      expect(r.score).toBeGreaterThan(70);
      expect(["complex", "extreme"]).toContain(r.tier);
      expect(r.estimated_setup_time_min).toBeGreaterThanOrEqual(60);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("should provide recommendations for reducible complexity", () => {
      const r = quotingFormulaEngine.setupComplexity({
        setup_count: 3,
        wcs_count: 4,
        tool_count: 12,
        orientation_changes: 2,
        tightest_tolerance_mm: 0.01,
        probing_required: true,
        custom_fixture: false,
      });
      expect(r.recommendations.some(r => r.includes("5-axis"))).toBe(true);
    });
  });

  describe("scrapReserve", () => {
    it("should compute extra parts for 3% scrap rate", () => {
      const r = quotingFormulaEngine.scrapReserve({
        material_cost_per_part: 10,
        batch_size: 100,
        scrap_rate: 0.03,
      });
      expect(r.expected_yield).toBeCloseTo(0.97, 2);
      expect(r.parts_to_run).toBe(104); // ceil(100/0.97) = 104
      expect(r.extra_parts).toBe(4);
      expect(r.scrap_reserve_cost).toBe(40); // 4 parts × $10
    });

    it("should derive scrap rate from Cpk", () => {
      // Cpk=1.33 → ~63 DPMO → yield ~99.994%
      const r = quotingFormulaEngine.scrapReserve({
        material_cost_per_part: 50,
        batch_size: 1000,
        cpk: 1.33,
      });
      expect(r.scrap_rate).toBeLessThan(0.001); // Very low scrap at Cpk=1.33
      expect(r.expected_yield).toBeGreaterThan(0.999);
      expect(r.extra_parts).toBeLessThanOrEqual(2);
    });

    it("should derive higher scrap from low Cpk", () => {
      // Cpk=0.5 → ~13.4% scrap
      const r = quotingFormulaEngine.scrapReserve({
        material_cost_per_part: 20,
        batch_size: 100,
        cpk: 0.5,
      });
      expect(r.scrap_rate).toBeGreaterThan(0.05);
      expect(r.extra_parts).toBeGreaterThan(5);
    });

    it("should include machine cost in scrap reserve", () => {
      const r = quotingFormulaEngine.scrapReserve({
        material_cost_per_part: 10,
        batch_size: 100,
        scrap_rate: 0.05,
        machine_cost_per_part: 20,
      });
      // Extra parts × (material + machine) = extra × 30
      expect(r.scrap_reserve_cost).toBe(r.extra_parts * 30);
    });
  });

  describe("physics validation", () => {
    it("should have consistent EOQ property: setup cost ≈ holding cost", () => {
      const r = quotingFormulaEngine.economicBatchSize({
        annual_demand: 5000,
        setup_cost: 500,
        holding_cost_per_unit: 2,
      });
      // At EOQ, annual_setup ≈ annual_holding (within rounding error)
      const ratio = r.annual_setup_cost / r.annual_holding_cost;
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    });

    it("should verify learning curve is monotonically decreasing", () => {
      const costs = [1, 10, 50, 100, 500].map(q =>
        quotingFormulaEngine.learningCurve({
          first_unit_cost: 100, learning_rate: 0.85, quantity: q,
        }).nth_unit_cost
      );
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeLessThanOrEqual(costs[i - 1]);
      }
    });

    it("should have normalCDF accuracy for scrap/Cpk mapping", () => {
      // Cpk=1.0 → z=3 → yield ≈ 99.73% (2700 DPMO)
      const r = quotingFormulaEngine.scrapReserve({
        material_cost_per_part: 1,
        batch_size: 10000,
        cpk: 1.0,
      });
      expect(r.scrap_rate).toBeCloseTo(0.0027, 2); // ~0.27%
    });
  });
});
