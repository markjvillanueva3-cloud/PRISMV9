/**
 * U-WIRE-BACKLOG-ERP — BusinessIntelligenceEngine wiring tests
 *
 * Validates the BusinessIntelligenceEngine static methods that businessDispatcher
 * now invokes via the bi_* action group (added 2026-05-27 by hotel slot).
 *
 * Engine source: src/engines/BusinessIntelligenceEngine.ts (1489 LOC, was unwired).
 * Wired actions: bi_make_vs_buy_strategic, bi_upgrade_vs_outsource,
 *                bi_capital_investment, bi_break_even, bi_cost_drivers.
 *
 * The dispatcher uses server.tool() registration so case-handlers aren't directly
 * callable from tests — but the wiring is the case-statement itself + the engine
 * methods it calls. These tests assert REAL engine behavior with correct typed
 * inputs that mirror the dispatcher's pass-through call shape.
 */
import { describe, it, expect } from "vitest";
import {
  BusinessIntelligenceEngine,
  type MakeOption,
  type BuyOption,
  type MakeVsBuyAnalysis,
  type UpgradeOption,
  type OutsourceOption,
  type CostCategory,
} from "../engines/BusinessIntelligenceEngine.js";

describe("U-WIRE-BACKLOG-ERP — BusinessIntelligenceEngine (now wired in businessDispatcher)", () => {
  describe("calculateBreakEvenAnalysis (action: bi_break_even)", () => {
    it("computes break-even units and contribution margin correctly", () => {
      const out = BusinessIntelligenceEngine.calculateBreakEvenAnalysis(50000, 25, 75);
      // CM = 75 - 25 = 50; BE = 50000 / 50 = 1000 units; revenue = 75000
      expect(out.break_even_units).toBe(1000);
      expect(out.contribution_margin).toBe(50);
      expect(out.break_even_revenue).toBe(75000);
      expect(out.contribution_margin_ratio).toBeCloseTo(50 / 75, 6);
      expect(Array.isArray(out.chart)).toBe(true);
      expect(out.chart.length).toBeGreaterThan(0);
    });

    it("handles zero contribution margin (price = variable cost) without crashing", () => {
      const out = BusinessIntelligenceEngine.calculateBreakEvenAnalysis(1000, 50, 50);
      expect(out.contribution_margin).toBe(0);
      expect(out.break_even_units).toBe(Infinity);
    });
  });

  describe("analyzeCapitalInvestment (action: bi_capital_investment)", () => {
    it("computes NPV/payback for a positive investment", () => {
      const out = BusinessIntelligenceEngine.analyzeCapitalInvestment(
        500000,
        150000,
        30000,
        5,
        50000,
        0.10
      );
      // Net annual cash = 120k; payback ≈ 500k/120k = 4.17 years
      expect(out.financials.payback_period).toBeGreaterThan(3);
      expect(out.financials.payback_period).toBeLessThan(5);
      expect(typeof out.financials.npv).toBe("number");
      expect(Number.isFinite(out.financials.npv)).toBe(true);
      expect(out.investment.total_cost).toBe(500000);
      expect(out.investment.useful_life_years).toBe(5);
      expect(["approve", "reject", "defer", "modify"]).toContain(out.recommendation);
    });
  });

  describe("analyzeCostDrivers (action: bi_cost_drivers)", () => {
    it("decomposes costs into fixed vs variable and ranks drivers by percent", () => {
      const costs: CostCategory[] = [
        { id: "rent", name: "rent", type: "fixed", amount: 10000, unit: "$", volume_dependent: false },
        { id: "mat", name: "materials", type: "variable", amount: 30, unit: "$/unit", volume_dependent: true },
        { id: "lbr", name: "labor", type: "variable", amount: 20, unit: "$/unit", volume_dependent: true },
      ];
      const out = BusinessIntelligenceEngine.analyzeCostDrivers(costs, 1000);
      // fixed=10000; variable=30*1000 + 20*1000 = 50000; total=60000
      expect(out.total_cost).toBe(60000);
      expect(out.cost_per_unit).toBe(60);
      expect(out.fixed_portion).toBe(10000);
      expect(out.variable_portion).toBe(50000);
      expect(out.drivers).toHaveLength(3);
      // materials = 30000/60000 = 50% → largest driver
      expect(out.drivers[0].category).toBe("materials");
      expect(out.drivers[0].percent_of_total).toBeCloseTo(50, 1);
    });
  });

  describe("analyzeMakeVsBuy (action: bi_make_vs_buy_strategic)", () => {
    const makeOption: MakeOption = {
      setup_cost: 50000,
      material_cost_per_unit: 8,
      labor_cost_per_unit: 5,
      overhead_cost_per_unit: 3,
      cycle_time_minutes: 5,
      machine_hourly_rate: 80,
      tool_cost_per_unit: 1.5,
      quality_cost_per_unit: 0.5,
      lead_time_days: 14,
      capacity_units_per_month: 5000,
    };
    const buyOption: BuyOption = {
      supplier: "VendorA",
      unit_price: 22,
      minimum_order_quantity: 100,
      lead_time_days: 42,
      shipping_cost_per_unit: 1.5,
      quality_risk: "low",
      reliability_score: 0.95,
    };

    it("recommends make vs buy with strategic-factor weighting", () => {
      const strategicFactors: MakeVsBuyAnalysis["strategic_factors"] = {
        intellectual_property: "not_relevant",
        quality_control: "acceptable",
        flexibility_needs: "low",
        capacity_utilization: 0.5,
        core_competency: false,
      };
      const out = BusinessIntelligenceEngine.analyzeMakeVsBuy(
        10000,
        makeOption,
        [buyOption],
        strategicFactors
      );
      expect(["make", "buy", "hybrid"]).toContain(out.recommendation);
      expect(typeof out.make_analysis.total_cost).toBe("number");
      expect(typeof out.buy_analysis.total_cost).toBe("number");
      expect(out.make_analysis.total_cost).toBeGreaterThan(0);
      expect(out.buy_analysis.total_cost).toBeGreaterThan(0);
      expect(out.buy_analysis.best_supplier).toBe("VendorA");
    });

    it("critical IP factor pushes toward make on small cost advantage", () => {
      const strategicFactors: MakeVsBuyAnalysis["strategic_factors"] = {
        intellectual_property: "critical",
        quality_control: "essential",
        flexibility_needs: "high",
        capacity_utilization: 0.6,
        core_competency: true,
      };
      const out = BusinessIntelligenceEngine.analyzeMakeVsBuy(
        5000,
        makeOption,
        [buyOption],
        strategicFactors
      );
      // Strategic factors (critical IP + core competency) should push to make
      expect(out.recommendation).toBe("make");
    });
  });

  describe("analyzeUpgradeVsOutsource (action: bi_upgrade_vs_outsource)", () => {
    it("returns a recommendation with computed cost fields", () => {
      const upgradeOption: UpgradeOption = {
        description: "5-axis retrofit",
        capital_cost: 250000,
        installation_cost: 15000,
        training_cost: 8000,
        downtime_days: 7,
        downtime_cost_per_day: 2000,
        benefits: {
          productivity_increase_percent: 30,
          quality_improvement_percent: 10,
          cost_reduction_per_unit: 6,
          capacity_increase_percent: 100,
          new_capabilities: ["5-axis simultaneous"],
        },
        maintenance: {
          annual_cost: 5000,
          expected_life_years: 7,
        },
      };
      const outsourceOption: OutsourceOption = {
        supplier: "OutsourceVendor",
        unit_price: 20,
        setup_fee: 5000,
        contract_length_months: 60,
        quality: { expected_defect_rate: 0.005, inspection_cost_per_unit: 0.3 },
        logistics: { lead_time_days: 21, shipping_cost_per_unit: 1.0, inventory_buffer_cost: 5000 },
        risks: { supply_disruption: "low", quality_consistency: "low", ip_exposure: "low" },
      };
      const out = BusinessIntelligenceEngine.analyzeUpgradeVsOutsource(
        {
          annual_volume: 5000,
          current_cost_per_unit: 18,
          current_capacity: 6000,
          machine_age_years: 12,
          machine_book_value: 30000,
        },
        upgradeOption,
        outsourceOption,
        0.10
      );
      expect(["upgrade", "outsource", "status_quo"]).toContain(out.recommendation);
      expect(typeof out.upgrade_analysis.npv).toBe("number");
      expect(typeof out.outsource_analysis.annual_cost).toBe("number");
      expect(out.current_state.annual_volume).toBe(5000);
    });
  });
});
