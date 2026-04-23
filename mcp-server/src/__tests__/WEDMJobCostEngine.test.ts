/**
 * WEDMJobCostEngine Tests
 * U-PROD-19: Job costing for WEDM
 */

import { describe, it, expect } from "vitest";
import {
  wedmJobCostEngine,
  WEDMJobCostEngine,
} from "../engines/WEDMJobCostEngine.js";

describe("WEDMJobCostEngine", () => {
  describe("calculateWireConsumption", () => {
    it("calculates wire consumption for single pass", () => {
      const wire = wedmJobCostEngine.calculateWireConsumption(1000, 1, 0.001);
      expect(wire).toBe(1); // 1000mm * 1 * 0.001 = 1m
    });

    it("scales with pass count", () => {
      const wire1 = wedmJobCostEngine.calculateWireConsumption(1000, 1, 0.001);
      const wire3 = wedmJobCostEngine.calculateWireConsumption(1000, 3, 0.001);
      expect(wire3).toBe(wire1 * 3);
    });

    it("scales with perimeter", () => {
      const wire1 = wedmJobCostEngine.calculateWireConsumption(500, 1, 0.001);
      const wire2 = wedmJobCostEngine.calculateWireConsumption(1000, 1, 0.001);
      expect(wire2).toBe(wire1 * 2);
    });
  });

  describe("calculateCuttingTime", () => {
    it("calculates cutting time in hours", () => {
      // 100mm at 2.5mm/min = 40 min = 0.667 hr
      const time = wedmJobCostEngine.calculateCuttingTime(100, 1, 2.5);
      expect(time).toBeCloseTo(0.667, 2);
    });

    it("scales with pass count", () => {
      const time1 = wedmJobCostEngine.calculateCuttingTime(100, 1, 2.5);
      const time3 = wedmJobCostEngine.calculateCuttingTime(100, 3, 2.5);
      expect(time3).toBeCloseTo(time1 * 3, 4);
    });
  });

  describe("calculateWireCost", () => {
    it("calculates wire cost from consumption", () => {
      const wireCost = {
        spool_cost_usd: 150,
        spool_length_m: 5000,
        wire_type: 'brass',
        wire_diameter_mm: 0.25,
      };
      // 100m at $150/5000m = $3
      const cost = wedmJobCostEngine.calculateWireCost(100, wireCost);
      expect(cost).toBe(3);
    });
  });

  describe("calculateJobCost", () => {
    it("calculates complete job cost", () => {
      const result = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
      });

      expect(result.per_piece.total_usd).toBeGreaterThan(0);
      expect(result.batch.total_usd).toBeGreaterThan(0);
      expect(result.total_cut_time_hr).toBeGreaterThan(0);
    });

    it("includes all cost components", () => {
      const result = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
      });

      const breakdown = result.per_piece;
      expect(breakdown.wire_cost_usd).toBeGreaterThan(0);
      expect(breakdown.machine_time_cost_usd).toBeGreaterThan(0);
      expect(breakdown.operator_cost_usd).toBeGreaterThan(0);
      expect(breakdown.setup_cost_usd).toBeGreaterThan(0);
    });

    it("scales cost with quantity", () => {
      const single = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
      });

      const batch = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 10,
        pass_count: 2,
      });

      // Per-piece cost should be lower in batch (amortized setup)
      expect(batch.per_piece.total_usd).toBeLessThan(single.per_piece.total_usd);
    });

    it("calculates wire spools needed", () => {
      const result = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
      });

      expect(result.wire_spools_needed).toBeGreaterThanOrEqual(1);
    });

    it("applies markup when specified", () => {
      const withMarkup = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
        include_markup: true,
        markup_percent: 25,
      });

      const withoutMarkup = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
        include_markup: false,
      });

      expect(withMarkup.per_piece.total_usd).toBeGreaterThan(withoutMarkup.per_piece.total_usd);
      expect(withMarkup.per_piece.markup_usd).toBeGreaterThan(0);
      expect(withoutMarkup.per_piece.markup_usd).toBe(0);
    });

    it("includes time breakdown", () => {
      const result = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
      });

      expect(result.time_breakdown.cutting_hr).toBeGreaterThan(0);
      expect(result.time_breakdown.setup_hr).toBeGreaterThan(0);
      expect(result.time_breakdown.programming_hr).toBeGreaterThan(0);
      expect(result.time_breakdown.total_hr).toBe(
        result.time_breakdown.cutting_hr +
        result.time_breakdown.setup_hr +
        result.time_breakdown.programming_hr
      );
    });

    it("uses custom machine rates", () => {
      const standardResult = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
      });

      const premiumResult = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: 1000,
        thickness_mm: 25,
        quantity: 1,
        pass_count: 2,
        machine_cost: {
          machine_rate_usd_hr: 150,
          operator_rate_usd_hr: 50,
          overhead_rate_usd_hr: 25,
        },
      });

      expect(premiumResult.per_piece.total_usd).toBeGreaterThan(standardResult.per_piece.total_usd);
    });
  });

  describe("quickEstimate", () => {
    it("returns quick cost estimate", () => {
      const est = wedmJobCostEngine.quickEstimate(1000, 25, 2);

      expect(est.estimated_cost_usd).toBeGreaterThan(0);
      expect(est.estimated_time_hr).toBeGreaterThan(0);
    });
  });

  describe("compareStrategies", () => {
    it("compares different pass strategies", () => {
      const comparison = wedmJobCostEngine.compareStrategies(
        1000,
        25,
        10,
        [1, 2, 3, 4]
      );

      expect(comparison).toHaveLength(4);
      expect(comparison[0].passes).toBe(1);
      expect(comparison[3].passes).toBe(4);

      // More passes should cost more
      expect(comparison[3].cost_per_piece).toBeGreaterThan(comparison[0].cost_per_piece);
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMJobCostEngine();
      engine.configure({ default_cutting_speed_mm_min: 3.0 });

      expect(engine.getConfig().default_cutting_speed_mm_min).toBe(3.0);
    });
  });
});
