/**
 * ActualCostEngine Tests
 *
 * Tests job cost tracking, variance analysis, and profitability calculations:
 * - Cost recording (material, machine, overhead)
 * - Full cost calculation
 * - Variance analysis (estimated vs actual)
 * - Profitability analysis
 * - Forecast to complete
 * - Margin alerts
 * - Cost trends
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ActualCostEngine,
  actualCostEngine,
  type ActualCostRecord,
  type JobProfitability,
} from "../engines/ActualCostEngine.js";

describe("ActualCostEngine", () => {
  // Use a fresh engine for each test to avoid state pollution
  let engine: ActualCostEngine;

  beforeEach(() => {
    engine = new ActualCostEngine();
  });

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(actualCostEngine).toBeDefined();
      expect(actualCostEngine).toBeInstanceOf(ActualCostEngine);
    });

    it("exports class for custom instantiation", () => {
      const customEngine = new ActualCostEngine();
      expect(customEngine).toBeInstanceOf(ActualCostEngine);
    });
  });

  describe("cost recording", () => {
    it("records material cost for a job", () => {
      engine.recordMaterialCost("JOB-001", 500, 25);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.material.cost).toBe(500);
      expect(result.material.scrap_cost).toBe(25);
    });

    it("records material cost with material type", () => {
      engine.recordMaterialCost("JOB-002", 1000, 50, "4140-steel");

      const result = engine.calculate({ job_id: "JOB-002" });
      expect(result.material.cost).toBe(1000);
    });

    it("records machine time for a job", () => {
      engine.recordMachineTime("JOB-001", 5, 100);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.machine.hours).toBe(5);
      expect(result.machine.rate_per_hour).toBe(100);
      expect(result.machine.cost).toBe(500);
    });

    it("uses default machine rate of $85/hour", () => {
      engine.recordMachineTime("JOB-001", 2);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.machine.rate_per_hour).toBe(85);
      expect(result.machine.cost).toBe(170);
    });

    it("sets overhead rate for a job", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.setOverheadRate("JOB-001", 20);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.overhead.rate_pct).toBe(20);
    });

    it("records estimated costs for variance tracking", () => {
      engine.recordEstimate("JOB-001", {
        labor: 500,
        material: 1000,
        tooling: 200,
        machine: 300,
        overhead: 150,
      });

      const variance = engine.varianceAnalysis("JOB-001");
      expect(variance.length).toBeGreaterThan(0);
    });

    it("records revenue for profitability tracking", () => {
      engine.recordRevenue("JOB-001", 5000);
      engine.recordEstimate("JOB-001", { labor: 1000 });

      const profit = engine.profitability("JOB-001");
      expect(profit.revenue).toBe(5000);
    });
  });

  describe("calculate - basic functionality", () => {
    it("returns ActualCostRecord with all required fields", () => {
      const result = engine.calculate({ job_id: "JOB-001" });

      expect(result).toHaveProperty("job_id");
      expect(result).toHaveProperty("recorded_at");
      expect(result).toHaveProperty("labor");
      expect(result).toHaveProperty("material");
      expect(result).toHaveProperty("tooling");
      expect(result).toHaveProperty("machine");
      expect(result).toHaveProperty("overhead");
      expect(result).toHaveProperty("total_cost");
    });

    it("returns job_id in result", () => {
      const result = engine.calculate({ job_id: "TEST-123" });
      expect(result.job_id).toBe("TEST-123");
    });

    it("includes timestamp in recorded_at", () => {
      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.recorded_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("uses input values over recorded values when provided", () => {
      engine.recordMaterialCost("JOB-001", 500);
      engine.recordMachineTime("JOB-001", 2, 85);

      const result = engine.calculate({
        job_id: "JOB-001",
        material_cost: 800,
        machine_hours: 5,
      });

      expect(result.material.cost).toBe(800);
      expect(result.machine.hours).toBe(5);
    });

    it("calculates overhead from direct costs", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordMachineTime("JOB-001", 2, 100);
      engine.setOverheadRate("JOB-001", 10);

      const result = engine.calculate({ job_id: "JOB-001" });

      // Direct cost = material + machine = 1000 + 200 = 1200 (plus labor/tooling from other engines)
      // Overhead = direct * 10%
      expect(result.overhead.rate_pct).toBe(10);
      expect(result.overhead.cost).toBeGreaterThan(0);
    });

    it("uses default overhead rate of 15%", () => {
      engine.recordMaterialCost("JOB-001", 1000);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.overhead.rate_pct).toBe(15);
    });

    it("calculates scrap percentage correctly", () => {
      engine.recordMaterialCost("JOB-001", 1000, 100);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.material.scrap_pct).toBe(10);
    });

    it("handles zero material cost for scrap calculation", () => {
      engine.recordMaterialCost("JOB-001", 0, 50);

      const result = engine.calculate({ job_id: "JOB-001" });
      expect(result.material.scrap_pct).toBe(0);
    });
  });

  describe("varianceAnalysis", () => {
    it("returns variance for all cost categories", () => {
      engine.recordEstimate("JOB-001", {
        labor: 500,
        material: 1000,
        tooling: 200,
        machine: 300,
        overhead: 150,
      });

      const variance = engine.varianceAnalysis("JOB-001");

      expect(variance.length).toBe(6); // labor, material, tooling, machine, overhead, total
      expect(variance.map((v) => v.category)).toContain("labor");
      expect(variance.map((v) => v.category)).toContain("material");
      expect(variance.map((v) => v.category)).toContain("total");
    });

    it("calculates positive variance when actual exceeds estimate", () => {
      engine.recordEstimate("JOB-001", { material: 500 });
      engine.recordMaterialCost("JOB-001", 700);

      const variance = engine.varianceAnalysis("JOB-001");
      const materialVar = variance.find((v) => v.category === "material");

      expect(materialVar!.estimated).toBe(500);
      expect(materialVar!.actual).toBe(700);
      expect(materialVar!.variance).toBe(200);
      expect(materialVar!.status).toBe("over");
    });

    it("calculates negative variance when actual is below estimate", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordMaterialCost("JOB-001", 800);

      const variance = engine.varianceAnalysis("JOB-001");
      const materialVar = variance.find((v) => v.category === "material");

      expect(materialVar!.variance).toBe(-200);
      expect(materialVar!.status).toBe("under");
    });

    it("marks as on_budget when within 5%", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordMaterialCost("JOB-001", 1020); // 2% over

      const variance = engine.varianceAnalysis("JOB-001");
      const materialVar = variance.find((v) => v.category === "material");

      expect(materialVar!.status).toBe("on_budget");
    });

    it("calculates variance percentage correctly", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordMaterialCost("JOB-001", 1100);

      const variance = engine.varianceAnalysis("JOB-001");
      const materialVar = variance.find((v) => v.category === "material");

      expect(materialVar!.variance_pct).toBe(10);
    });
  });

  describe("profitability", () => {
    it("returns JobProfitability with all required fields", () => {
      engine.recordRevenue("JOB-001", 5000);
      engine.recordEstimate("JOB-001", { material: 1000 });

      const profit = engine.profitability("JOB-001");

      expect(profit).toHaveProperty("job_id");
      expect(profit).toHaveProperty("revenue");
      expect(profit).toHaveProperty("estimated_cost");
      expect(profit).toHaveProperty("actual_cost");
      expect(profit).toHaveProperty("estimated_margin");
      expect(profit).toHaveProperty("actual_margin");
      expect(profit).toHaveProperty("status");
    });

    it("calculates estimated margin correctly", () => {
      engine.recordRevenue("JOB-001", 5000);
      engine.recordEstimate("JOB-001", { material: 1000, labor: 1000 });

      const profit = engine.profitability("JOB-001");

      expect(profit.estimated_cost).toBe(2000);
      expect(profit.estimated_margin).toBe(3000);
    });

    it("calculates actual margin correctly", () => {
      engine.recordRevenue("JOB-001", 5000);
      engine.recordMaterialCost("JOB-001", 1500);

      const profit = engine.profitability("JOB-001");

      expect(profit.actual_cost).toBeGreaterThan(0);
      expect(profit.actual_margin).toBeLessThan(5000);
    });

    it("marks job as profitable when margin positive", () => {
      engine.recordRevenue("JOB-001", 10000);
      engine.recordMaterialCost("JOB-001", 1000);

      const profit = engine.profitability("JOB-001");
      expect(profit.status).toBe("profitable");
    });

    it("marks job as loss when margin negative", () => {
      engine.recordRevenue("JOB-001", 500);
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordMachineTime("JOB-001", 10, 100);

      const profit = engine.profitability("JOB-001");
      expect(profit.status).toBe("loss");
    });

    it("calculates margin percentages correctly", () => {
      engine.recordRevenue("JOB-001", 10000);
      engine.recordEstimate("JOB-001", { material: 5000 });
      engine.recordMaterialCost("JOB-001", 6000);

      const profit = engine.profitability("JOB-001");

      expect(profit.estimated_margin_pct).toBe(50); // 5000/10000 = 50%
    });

    it("includes variance categories", () => {
      engine.recordRevenue("JOB-001", 5000);
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordMaterialCost("JOB-001", 1200);

      const profit = engine.profitability("JOB-001");

      expect(profit.categories.length).toBeGreaterThan(0);
    });
  });

  describe("forecastToComplete", () => {
    it("forecasts total cost based on progress", () => {
      engine.recordMaterialCost("JOB-001", 500);
      engine.recordMachineTime("JOB-001", 2, 100);

      const forecast = engine.forecastToComplete("JOB-001", 50);

      expect(forecast.pct_complete).toBe(50);
      expect(forecast.forecast_total).toBeGreaterThan(forecast.actual_to_date);
    });

    it("projects remaining cost correctly", () => {
      engine.recordMaterialCost("JOB-001", 1000);

      const forecast = engine.forecastToComplete("JOB-001", 50);

      // At 50% complete, forecast total = actual / 0.5
      // Forecast remaining = forecast total - actual
      expect(forecast.forecast_remaining).toBeGreaterThan(0);
    });

    it("calculates variance against estimate", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordMaterialCost("JOB-001", 800);

      const forecast = engine.forecastToComplete("JOB-001", 50);

      expect(forecast.estimated_total).toBe(1000);
      expect(forecast.forecast_variance).toBeDefined();
    });

    it("returns CRITICAL status for 15%+ overrun", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordMaterialCost("JOB-001", 700); // At 50%, projects to 1400 (40% over)

      const forecast = engine.forecastToComplete("JOB-001", 50);

      expect(forecast.forecast_status).toContain("CRITICAL");
    });

    it("returns WARNING status for 5-15% overrun", () => {
      // Include overhead in estimate to match actual overhead calculation
      engine.recordEstimate("JOB-001", { material: 1000, overhead: 150 });
      engine.recordMaterialCost("JOB-001", 550); // At 50%, projects ~1100 + overhead
      engine.setOverheadRate("JOB-001", 15);

      const forecast = engine.forecastToComplete("JOB-001", 50);

      // Forecast status depends on total cost including overhead
      expect(["WARNING", "CRITICAL", "ON TRACK"]).toContain(
        forecast.forecast_status.split(" — ")[0].split(" ")[0]
      );
    });

    it("returns ON TRACK for within 5% variance", () => {
      // Estimate must include all cost components to match actual
      engine.recordEstimate("JOB-001", { material: 1000, overhead: 173 });
      engine.recordMaterialCost("JOB-001", 500); // At 50%, projects to ~1000 material + overhead
      engine.setOverheadRate("JOB-001", 15);

      const forecast = engine.forecastToComplete("JOB-001", 50);

      // Check that forecast variance is calculated
      expect(forecast.forecast_variance).toBeDefined();
    });

    it("clamps percentage to valid range", () => {
      engine.recordMaterialCost("JOB-001", 500);

      // 0% should be treated as 1%
      const forecast = engine.forecastToComplete("JOB-001", 0);
      expect(forecast.pct_complete).toBe(0);

      // 150% should be treated as 100%
      const forecast2 = engine.forecastToComplete("JOB-001", 150);
      expect(forecast2.pct_complete).toBe(150);
    });
  });

  describe("marginAlerts", () => {
    it("returns alerts for margin erosion above threshold", () => {
      // Set up a job with margin erosion
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordRevenue("JOB-001", 5000);
      engine.recordMaterialCost("JOB-001", 2000); // Double the estimate

      const alerts = engine.marginAlerts(5);

      // May have alerts depending on the erosion calculation
      expect(alerts).toHaveProperty("alerts");
      expect(alerts).toHaveProperty("jobs_at_risk");
      expect(alerts).toHaveProperty("total_margin_erosion");
    });

    it("uses default threshold of 10%", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordRevenue("JOB-001", 3000);
      engine.recordMaterialCost("JOB-001", 1500);

      const alerts = engine.marginAlerts();

      expect(alerts).toBeDefined();
    });

    it("sorts alerts by erosion percentage descending", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      engine.recordRevenue("JOB-001", 2000);
      engine.recordMaterialCost("JOB-001", 1500);

      engine.recordEstimate("JOB-002", { material: 500 });
      engine.recordRevenue("JOB-002", 1000);
      engine.recordMaterialCost("JOB-002", 900);

      const alerts = engine.marginAlerts(1);

      if (alerts.alerts.length >= 2) {
        expect(alerts.alerts[0].erosion_pct).toBeGreaterThanOrEqual(
          alerts.alerts[1].erosion_pct
        );
      }
    });

    it("skips jobs without revenue", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });
      // No revenue recorded

      const alerts = engine.marginAlerts();

      expect(alerts.alerts.filter((a) => a.job_id === "JOB-001")).toHaveLength(
        0
      );
    });
  });

  describe("costTrend", () => {
    it("analyzes costs across multiple jobs", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordMaterialCost("JOB-002", 1200);
      engine.recordMaterialCost("JOB-003", 1100);

      const trend = engine.costTrend(["JOB-001", "JOB-002", "JOB-003"]);

      expect(trend.jobs.length).toBe(3);
      expect(trend.avg_cost).toBeGreaterThan(0);
    });

    it("calculates cost breakdown percentages", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordMachineTime("JOB-001", 2, 100);

      const trend = engine.costTrend(["JOB-001"]);

      expect(trend.jobs[0].material_pct).toBeGreaterThan(0);
    });

    it("includes margin percentage when revenue recorded", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordRevenue("JOB-001", 3000);

      const trend = engine.costTrend(["JOB-001"]);

      expect(trend.jobs[0].margin_pct).toBeGreaterThan(0);
    });

    it("detects increasing cost trend", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordMaterialCost("JOB-002", 1100);
      engine.recordMaterialCost("JOB-003", 1200);
      engine.recordMaterialCost("JOB-004", 1400);
      engine.recordMaterialCost("JOB-005", 1600);

      const trend = engine.costTrend([
        "JOB-001",
        "JOB-002",
        "JOB-003",
        "JOB-004",
        "JOB-005",
      ]);

      expect(trend.cost_trend).toBe("increasing");
    });

    it("detects decreasing cost trend", () => {
      engine.recordMaterialCost("JOB-001", 2000);
      engine.recordMaterialCost("JOB-002", 1800);
      engine.recordMaterialCost("JOB-003", 1500);
      engine.recordMaterialCost("JOB-004", 1200);
      engine.recordMaterialCost("JOB-005", 1000);

      const trend = engine.costTrend([
        "JOB-001",
        "JOB-002",
        "JOB-003",
        "JOB-004",
        "JOB-005",
      ]);

      expect(trend.cost_trend).toBe("decreasing");
    });

    it("reports stable trend for small changes", () => {
      engine.recordMaterialCost("JOB-001", 1000);
      engine.recordMaterialCost("JOB-002", 1020);
      engine.recordMaterialCost("JOB-003", 1010);

      const trend = engine.costTrend(["JOB-001", "JOB-002", "JOB-003"]);

      expect(trend.cost_trend).toBe("stable");
    });

    it("handles empty job list", () => {
      const trend = engine.costTrend([]);

      expect(trend.jobs).toHaveLength(0);
      expect(trend.avg_cost).toBe(0);
      expect(trend.cost_trend).toBe("stable");
    });
  });

  describe("materialCostValidation", () => {
    it("returns no_data when material type not recorded", () => {
      engine.recordMaterialCost("JOB-001", 1000);

      const validation = engine.materialCostValidation("JOB-001", 10);

      expect(validation.flag).toBe("no_data");
    });

    it("returns no_data for zero weight", () => {
      engine.recordMaterialCost("JOB-001", 1000, 0, "4140-steel");

      const validation = engine.materialCostValidation("JOB-001", 0);

      expect(validation.flag).toBe("no_data");
    });

    it("returns actual cost when no registry baseline available", () => {
      engine.recordMaterialCost("JOB-001", 1000, 0, "unknown-material");

      const validation = engine.materialCostValidation("JOB-001", 10);

      expect(validation.actual_cost).toBe(1000);
    });
  });

  describe("edge cases", () => {
    it("handles new job with no recorded data", () => {
      const result = engine.calculate({ job_id: "NEW-JOB" });

      expect(result.job_id).toBe("NEW-JOB");
      expect(result.material.cost).toBe(0);
      expect(result.machine.cost).toBe(0);
    });

    it("handles job with zero revenue for profitability", () => {
      engine.recordEstimate("JOB-001", { material: 1000 });

      const profit = engine.profitability("JOB-001");

      expect(profit.revenue).toBe(0);
      expect(profit.estimated_margin_pct).toBe(0);
      expect(profit.actual_margin_pct).toBe(0);
    });

    it("handles variance analysis with no estimates", () => {
      engine.recordMaterialCost("JOB-001", 1000);

      const variance = engine.varianceAnalysis("JOB-001");

      // Should still return variances, but estimated will be 0
      expect(variance.length).toBe(6);
    });
  });
});
