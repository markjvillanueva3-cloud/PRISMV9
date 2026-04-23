/**
 * CapacityPlanningEngine Tests — U-LPR-OPS-CAPACITY
 */

import { describe, it, expect, beforeEach } from "vitest";
import { capacityPlanningEngine } from "../../engines/CapacityPlanningEngine.js";

describe("CapacityPlanningEngine", () => {
  beforeEach(() => {
    capacityPlanningEngine.clearAll();
  });

  describe("recordMetrics", () => {
    it("records metrics and returns count", () => {
      const result = capacityPlanningEngine.recordMetrics({
        timestamp: Date.now(),
        requests_per_second: 100,
        storage_used_gb: 50,
        gpu_utilization_percent: 60,
        cpu_utilization_percent: 40,
        memory_utilization_percent: 55,
        active_connections: 200,
        queue_depth: 10,
      });

      expect(result.success).toBe(true);
      expect(result.metrics_count).toBe(1);
    });

    it("accumulates multiple metrics", () => {
      for (let i = 0; i < 5; i++) {
        capacityPlanningEngine.recordMetrics({
          timestamp: Date.now() + i * 1000,
          requests_per_second: 100 + i * 10,
          storage_used_gb: 50 + i,
          gpu_utilization_percent: 60,
          cpu_utilization_percent: 40,
          memory_utilization_percent: 55,
          active_connections: 200,
          queue_depth: 10,
        });
      }
      const metrics = capacityPlanningEngine.getMetrics();
      expect(metrics.length).toBe(5);
    });
  });

  describe("forecasting", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        capacityPlanningEngine.recordMetrics({
          timestamp: Date.now() + i * 3600000,
          requests_per_second: 100 + i * 5,
          storage_used_gb: 50 + i * 2,
          gpu_utilization_percent: 50 + i,
          cpu_utilization_percent: 40,
          memory_utilization_percent: 55,
          active_connections: 200,
          queue_depth: 10,
        });
      }
    });

    it("forecasts request rate with trend detection", () => {
      const forecast = capacityPlanningEngine.forecastRequests();
      expect(forecast.metric).toBe("requests_per_second");
      expect(forecast.current).toBeGreaterThan(0);
      expect(forecast.trend).toBe("increasing");
      expect(forecast.method).toBe("holt_linear_exponential_smoothing");
    });

    it("forecasts storage growth", () => {
      const forecast = capacityPlanningEngine.forecastStorage();
      expect(forecast.metric).toBe("storage_used_gb");
      expect(forecast.forecast_30d).toBeGreaterThanOrEqual(forecast.current);
    });

    it("forecasts GPU utilization bounded 0-100", () => {
      const forecast = capacityPlanningEngine.forecastGPU();
      expect(forecast.metric).toBe("gpu_utilization_percent");
      expect(forecast.forecast_7d).toBeLessThanOrEqual(100);
      expect(forecast.forecast_7d).toBeGreaterThanOrEqual(0);
    });
  });

  describe("evaluateScaleOutThresholds", () => {
    it("returns healthy status when within limits", () => {
      capacityPlanningEngine.recordMetrics({
        timestamp: Date.now(),
        requests_per_second: 100,
        storage_used_gb: 50,
        gpu_utilization_percent: 50,
        cpu_utilization_percent: 40,
        memory_utilization_percent: 55,
        active_connections: 200,
        queue_depth: 10,
      });

      const thresholds = capacityPlanningEngine.evaluateScaleOutThresholds();
      expect(thresholds.length).toBe(5);
      const cpuThreshold = thresholds.find(t => t.resource === "cpu");
      expect(cpuThreshold?.status).toBe("healthy");
    });

    it("returns critical status when exceeding thresholds", () => {
      capacityPlanningEngine.recordMetrics({
        timestamp: Date.now(),
        requests_per_second: 100,
        storage_used_gb: 50,
        gpu_utilization_percent: 96,
        cpu_utilization_percent: 92,
        memory_utilization_percent: 55,
        active_connections: 200,
        queue_depth: 10,
      });

      const thresholds = capacityPlanningEngine.evaluateScaleOutThresholds();
      const cpuThreshold = thresholds.find(t => t.resource === "cpu");
      const gpuThreshold = thresholds.find(t => t.resource === "gpu");
      expect(cpuThreshold?.status).toBe("critical");
      expect(gpuThreshold?.status).toBe("critical");
    });
  });

  describe("calculateGPUCostBudget", () => {
    it("calculates projected spend and efficiency", () => {
      capacityPlanningEngine.recordMetrics({
        timestamp: Date.now(),
        requests_per_second: 100,
        storage_used_gb: 50,
        gpu_utilization_percent: 70,
        cpu_utilization_percent: 40,
        memory_utilization_percent: 55,
        active_connections: 200,
        queue_depth: 10,
      });

      const budget = capacityPlanningEngine.calculateGPUCostBudget({
        monthly_budget_usd: 5000,
        current_spend_usd: 2000,
        gpu_hour_cost_usd: 2.50,
        days_in_month: 30,
        days_elapsed: 15,
      });

      expect(budget.monthly_budget_usd).toBe(5000);
      expect(budget.projected_spend_usd).toBeGreaterThan(2000);
      expect(budget.utilization_percent).toBe(70);
      expect(budget.recommendations.length).toBeGreaterThan(0);
    });

    it("warns when exceeding budget", () => {
      const budget = capacityPlanningEngine.calculateGPUCostBudget({
        monthly_budget_usd: 1000,
        current_spend_usd: 800,
        gpu_hour_cost_usd: 2.50,
        days_in_month: 30,
        days_elapsed: 10,
      });

      expect(budget.projected_spend_usd).toBeGreaterThan(1000);
      expect(budget.recommendations.some(r => r.includes("exceed"))).toBe(true);
    });
  });

  describe("generateCapacityPlan", () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        capacityPlanningEngine.recordMetrics({
          timestamp: Date.now() + i * 3600000,
          requests_per_second: 100,
          storage_used_gb: 50,
          gpu_utilization_percent: 60,
          cpu_utilization_percent: 40,
          memory_utilization_percent: 55,
          active_connections: 200,
          queue_depth: 10,
        });
      }
    });

    it("generates complete capacity plan", () => {
      const plan = capacityPlanningEngine.generateCapacityPlan({
        monthly_budget_usd: 5000,
        current_spend_usd: 2000,
        gpu_hour_cost_usd: 2.50,
      });

      expect(plan.planning_horizon_days).toBe(90);
      expect(plan.forecasts.length).toBe(3);
      expect(plan.thresholds.length).toBe(5);
      expect(plan.gpu_budget).toBeDefined();
      expect(plan.risk_factors).toBeDefined();
      expect(plan.overall_status).toBeDefined();
      expect(plan.next_review_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns healthy status for normal metrics", () => {
      const plan = capacityPlanningEngine.generateCapacityPlan({
        monthly_budget_usd: 5000,
        current_spend_usd: 1000,
        gpu_hour_cost_usd: 2.50,
      });

      expect(plan.overall_status).toBe("healthy");
    });
  });

  describe("getStats", () => {
    it("returns correct statistics", () => {
      capacityPlanningEngine.recordMetrics({
        timestamp: Date.now(),
        requests_per_second: 100,
        storage_used_gb: 50,
        gpu_utilization_percent: 60,
        cpu_utilization_percent: 40,
        memory_utilization_percent: 55,
        active_connections: 200,
        queue_depth: 10,
      });

      capacityPlanningEngine.generateCapacityPlan({
        monthly_budget_usd: 5000,
        current_spend_usd: 1000,
        gpu_hour_cost_usd: 2.50,
      });

      const stats = capacityPlanningEngine.getStats();
      expect(stats.metrics_count).toBe(1);
      expect(stats.plans_generated).toBe(1);
      expect(stats.last_plan_timestamp).not.toBeNull();
    });
  });
});
