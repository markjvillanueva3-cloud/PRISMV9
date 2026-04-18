/**
 * LatheInventoryIntelligenceEngine Tests
 *
 * U-LTH53: AI-driven inventory forecasting, ABC analysis, trend detection
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheInventoryIntelligenceEngine } from "../engines/LatheInventoryIntelligenceEngine.js";

describe("LatheInventoryIntelligenceEngine", () => {
  beforeEach(() => {
    latheInventoryIntelligenceEngine.clearAll();
  });

  describe("EOQ Calculations", () => {
    it("calculates EOQ with Wilson formula", () => {
      const eoq = latheInventoryIntelligenceEngine.getEOQForItem("MAT-4140");

      expect(eoq).not.toBeNull();
      expect(eoq!.eoq).toBeGreaterThan(0);
      expect(eoq!.annual_demand).toBe(2400);
    });

    it("calculates reorder point based on lead time", () => {
      const eoq = latheInventoryIntelligenceEngine.getEOQForItem("MAT-4140");

      expect(eoq).not.toBeNull();
      expect(eoq!.reorder_point).toBeGreaterThan(0);
      expect(eoq!.reorder_point).toBeGreaterThan(eoq!.safety_stock);
    });

    it("calculates safety stock for service level", () => {
      const eoq = latheInventoryIntelligenceEngine.getEOQForItem("MAT-4140");

      expect(eoq).not.toBeNull();
      expect(eoq!.safety_stock).toBeGreaterThan(0);
    });

    it("calculates total annual inventory cost", () => {
      const eoq = latheInventoryIntelligenceEngine.getEOQForItem("MAT-4140");

      expect(eoq).not.toBeNull();
      expect(eoq!.total_annual_cost).toBeCloseTo(
        eoq!.annual_ordering_cost + eoq!.annual_holding_cost,
        2
      );
    });

    it("returns null for unknown item", () => {
      const eoq = latheInventoryIntelligenceEngine.getEOQForItem("UNKNOWN");
      expect(eoq).toBeNull();
    });
  });

  describe("ABC Analysis", () => {
    it("classifies items into A, B, C categories", () => {
      const analysis = latheInventoryIntelligenceEngine.performABCAnalysis();

      expect(analysis.class_A.length).toBeGreaterThan(0);
      expect(analysis.total_items).toBe(8);
    });

    it("class A represents ~80% of value", () => {
      const analysis = latheInventoryIntelligenceEngine.performABCAnalysis();

      const aValue = analysis.class_A.reduce((s, i) => s + i.annual_value, 0);
      const aPct = (aValue / analysis.total_annual_value) * 100;

      expect(aPct).toBeLessThanOrEqual(85);
    });

    it("provides cumulative percentages", () => {
      const analysis = latheInventoryIntelligenceEngine.performABCAnalysis();

      if (analysis.class_A.length > 0) {
        const lastA = analysis.class_A[analysis.class_A.length - 1];
        expect(lastA.cumulative_pct).toBeLessThanOrEqual(80);
      }
    });

    it("updates item ABC class after analysis", () => {
      const item = latheInventoryIntelligenceEngine.getInventoryItem("MAT-6061");

      expect(item).not.toBeNull();
      expect(["A", "B", "C"]).toContain(item!.abc_class);
    });
  });

  describe("Demand Forecasting", () => {
    it("generates forecasts for future periods", () => {
      const forecasts = latheInventoryIntelligenceEngine.forecastDemand("MAT-4140", 3);

      expect(forecasts.length).toBe(3);
      expect(forecasts[0].predicted_demand).toBeGreaterThan(0);
    });

    it("includes confidence intervals", () => {
      const forecasts = latheInventoryIntelligenceEngine.forecastDemand("MAT-4140", 1);

      expect(forecasts[0].confidence_interval.lower).toBeLessThan(forecasts[0].predicted_demand);
      expect(forecasts[0].confidence_interval.upper).toBeGreaterThan(forecasts[0].predicted_demand);
    });

    it("identifies trend from usage history", () => {
      const forecasts = latheInventoryIntelligenceEngine.forecastDemand("MAT-4140", 1);

      expect(["increasing", "stable", "decreasing"]).toContain(forecasts[0].trend);
    });

    it("returns empty array for unknown item", () => {
      const forecasts = latheInventoryIntelligenceEngine.forecastDemand("UNKNOWN", 3);
      expect(forecasts.length).toBe(0);
    });
  });

  describe("Stockout Risk Analysis", () => {
    it("assesses risk for all items", () => {
      const risks = latheInventoryIntelligenceEngine.assessStockoutRisk();

      expect(risks.length).toBe(8);
    });

    it("categorizes risk levels correctly", () => {
      const risks = latheInventoryIntelligenceEngine.assessStockoutRisk();

      for (const risk of risks) {
        expect(["critical", "warning", "watch", "safe"]).toContain(risk.risk_level);
      }
    });

    it("calculates days of supply", () => {
      const risks = latheInventoryIntelligenceEngine.assessStockoutRisk();

      for (const risk of risks) {
        expect(risk.days_of_supply).toBeGreaterThan(0);
      }
    });

    it("provides recommended actions", () => {
      const risks = latheInventoryIntelligenceEngine.assessStockoutRisk();

      for (const risk of risks) {
        expect(risk.recommended_action.length).toBeGreaterThan(0);
      }
    });

    it("sorts by risk level (critical first)", () => {
      latheInventoryIntelligenceEngine.updateInventory("MAT-4140", {
        current_quantity: 5,
      });

      const risks = latheInventoryIntelligenceEngine.assessStockoutRisk();
      const firstRisk = risks[0];

      expect(["critical", "warning"]).toContain(firstRisk.risk_level);
    });
  });

  describe("Turnover Analysis", () => {
    it("calculates turns per year", () => {
      const analysis = latheInventoryIntelligenceEngine.analyzeTurnover();

      expect(analysis.length).toBe(8);
      for (const item of analysis) {
        expect(item.turns_per_year).toBeGreaterThanOrEqual(0);
      }
    });

    it("classifies turnover speed", () => {
      const analysis = latheInventoryIntelligenceEngine.analyzeTurnover();

      for (const item of analysis) {
        expect(["fast_moving", "moderate", "slow_moving", "dead_stock"]).toContain(
          item.classification
        );
      }
    });

    it("provides recommendations based on turnover", () => {
      const analysis = latheInventoryIntelligenceEngine.analyzeTurnover();

      for (const item of analysis) {
        expect(item.recommendation.length).toBeGreaterThan(0);
      }
    });

    it("sorts by turns per year (highest first)", () => {
      const analysis = latheInventoryIntelligenceEngine.analyzeTurnover();

      if (analysis.length > 1) {
        expect(analysis[0].turns_per_year).toBeGreaterThanOrEqual(analysis[1].turns_per_year);
      }
    });
  });

  describe("Inventory Health Report", () => {
    it("generates comprehensive health report", () => {
      const report = latheInventoryIntelligenceEngine.generateHealthReport();

      expect(report.total_inventory_value).toBeGreaterThan(0);
      expect(report.average_turnover).toBeGreaterThan(0);
      expect(report.fill_rate).toBeGreaterThan(0);
    });

    it("includes ABC distribution percentages", () => {
      const report = latheInventoryIntelligenceEngine.generateHealthReport();

      const totalPct = report.abc_distribution.A_pct +
        report.abc_distribution.B_pct +
        report.abc_distribution.C_pct;

      expect(totalPct).toBeCloseTo(100, 0);
    });

    it("counts stockout risk items", () => {
      const report = latheInventoryIntelligenceEngine.generateHealthReport();

      expect(report.stockout_risk_items).toBeGreaterThanOrEqual(0);
    });

    it("provides actionable recommendations", () => {
      const report = latheInventoryIntelligenceEngine.generateHealthReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Usage Recording", () => {
    it("records usage and updates quantity", () => {
      const before = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      const initialQty = before!.current_quantity;

      latheInventoryIntelligenceEngine.recordUsage("MAT-4140", "JOB-001", 50);

      const after = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      expect(after!.current_quantity).toBe(initialQty - 50);
    });

    it("adds usage event to history", () => {
      latheInventoryIntelligenceEngine.recordUsage("MAT-4140", "JOB-001", 50);

      const item = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      expect(item!.usage_history.length).toBe(1);
      expect(item!.usage_history[0].job_id).toBe("JOB-001");
      expect(item!.usage_history[0].quantity_used).toBe(50);
    });

    it("updates last usage timestamp", () => {
      const before = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      const oldTimestamp = before!.last_usage;

      latheInventoryIntelligenceEngine.recordUsage("MAT-4140", "JOB-001", 50);

      const after = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      expect(new Date(after!.last_usage).getTime()).toBeGreaterThanOrEqual(
        new Date(oldTimestamp).getTime()
      );
    });

    it("prevents negative quantity", () => {
      latheInventoryIntelligenceEngine.recordUsage("MAT-4140", "JOB-001", 10000);

      const item = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      expect(item!.current_quantity).toBe(0);
    });

    it("returns null for unknown item", () => {
      const result = latheInventoryIntelligenceEngine.recordUsage("UNKNOWN", "JOB-001", 50);
      expect(result).toBeNull();
    });
  });

  describe("Inventory Accessors", () => {
    it("returns all inventory items", () => {
      const all = latheInventoryIntelligenceEngine.getAllInventory();
      expect(all.length).toBe(8);
    });

    it("filters by ABC class", () => {
      const classA = latheInventoryIntelligenceEngine.getItemsByClass("A");

      for (const item of classA) {
        expect(item.abc_class).toBe("A");
      }
    });

    it("finds items below reorder point", () => {
      latheInventoryIntelligenceEngine.updateInventory("TOOL-CNMG", {
        current_quantity: 3,
      });

      const belowReorder = latheInventoryIntelligenceEngine.getItemsBelowReorderPoint();

      expect(belowReorder.some((i) => i.item_id === "TOOL-CNMG")).toBe(true);
    });
  });

  describe("Inventory Updates", () => {
    it("updates item properties", () => {
      const updated = latheInventoryIntelligenceEngine.updateInventory("MAT-4140", {
        current_quantity: 1000,
        unit_cost: 3.00,
      });

      expect(updated).not.toBeNull();
      expect(updated!.current_quantity).toBe(1000);
      expect(updated!.unit_cost).toBe(3.00);
    });

    it("recalculates EOQ when demand changes", () => {
      const before = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      const oldEOQ = before!.eoq;

      latheInventoryIntelligenceEngine.updateInventory("MAT-4140", {
        annual_demand: 5000,
      });

      const after = latheInventoryIntelligenceEngine.getInventoryItem("MAT-4140");
      expect(after!.eoq).not.toBe(oldEOQ);
    });

    it("returns null for unknown item", () => {
      const result = latheInventoryIntelligenceEngine.updateInventory("UNKNOWN", {
        current_quantity: 100,
      });
      expect(result).toBeNull();
    });
  });

  describe("Add Inventory Item", () => {
    it("adds new item with calculated fields", () => {
      const newItem = latheInventoryIntelligenceEngine.addInventoryItem({
        item_id: "MAT-NEW",
        item_type: "material",
        description: "New Material",
        current_quantity: 100,
        unit_cost: 5.00,
        annual_demand: 500,
        lead_time_days: 4,
        order_cost: 40,
        holding_cost_pct: 0.25,
        last_usage: new Date().toISOString(),
        usage_history: [],
      });

      expect(newItem.eoq).toBeGreaterThan(0);
      expect(newItem.reorder_point).toBeGreaterThan(0);
      expect(newItem.safety_stock).toBeGreaterThan(0);
      expect(["A", "B", "C"]).toContain(newItem.abc_class);
    });

    it("updates ABC classification after adding", () => {
      const allBefore = latheInventoryIntelligenceEngine.getAllInventory();

      latheInventoryIntelligenceEngine.addInventoryItem({
        item_id: "MAT-EXPENSIVE",
        item_type: "material",
        description: "Expensive Material",
        current_quantity: 10,
        unit_cost: 500.00,
        annual_demand: 100,
        lead_time_days: 10,
        order_cost: 100,
        holding_cost_pct: 0.25,
        last_usage: new Date().toISOString(),
        usage_history: [],
      });

      const allAfter = latheInventoryIntelligenceEngine.getAllInventory();
      expect(allAfter.length).toBe(allBefore.length + 1);
    });
  });

  describe("Default Inventory", () => {
    it("includes materials", () => {
      const materials = latheInventoryIntelligenceEngine.getAllInventory()
        .filter((i) => i.item_type === "material");

      expect(materials.length).toBeGreaterThanOrEqual(3);
    });

    it("includes tools", () => {
      const tools = latheInventoryIntelligenceEngine.getAllInventory()
        .filter((i) => i.item_type === "tool");

      expect(tools.length).toBeGreaterThanOrEqual(3);
    });

    it("includes consumables", () => {
      const consumables = latheInventoryIntelligenceEngine.getAllInventory()
        .filter((i) => i.item_type === "consumable");

      expect(consumables.length).toBeGreaterThanOrEqual(2);
    });
  });
});
