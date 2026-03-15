/**
 * Dedicated tests for SchedulingPhysicsEngine
 * Methods: queueTheory, batchEconomics, capacityAnalysis, scheduleMetrics
 */
import { describe, it, expect } from "vitest";
import { schedulingPhysicsEngine } from "../engines/SchedulingPhysicsEngine.js";

describe("SchedulingPhysicsEngine", () => {
  describe("queueTheory", () => {
    it("should compute M/M/1 queue metrics with Little's Law", () => {
      const r = schedulingPhysicsEngine.queueTheory({
        arrival_rate: 4,
        service_rate: 5,
      });
      expect(r.utilization_rho).toBeCloseTo(0.8, 4);
      expect(r.stable).toBe(true);
      expect(r.avg_in_system_L).toBeCloseTo(4, 1);
      expect(r.avg_time_in_system_W).toBeCloseTo(1, 1);
      expect(r.system_type).toContain("M/M/1");
    });

    it("should flag unstable queue when arrival >= service rate", () => {
      const r = schedulingPhysicsEngine.queueTheory({
        arrival_rate: 6,
        service_rate: 5,
      });
      expect(r.stable).toBe(false);
      expect(r.utilization_rho).toBeGreaterThanOrEqual(1);
    });
  });

  describe("batchEconomics", () => {
    it("should compute EOQ = sqrt(2DS/H)", () => {
      const r = schedulingPhysicsEngine.batchEconomics({
        annual_demand: 10000,
        setup_cost: 100,
        holding_cost: 2,
      });
      expect(r.economic_quantity).toBeCloseTo(1000, 0);
      expect(r.model).toBe("EOQ");
      expect(r.orders_per_year).toBeCloseTo(10, 0);
      expect(r.annual_setup_cost).toBeGreaterThan(0);
      expect(r.annual_holding_cost).toBeGreaterThan(0);
    });

    it("should use EPQ when production_rate is provided", () => {
      const r = schedulingPhysicsEngine.batchEconomics({
        annual_demand: 10000,
        setup_cost: 100,
        holding_cost: 2,
        production_rate: 20000,
      });
      expect(r.model).toBe("EPQ");
      expect(r.economic_quantity).toBeGreaterThan(1000);
    });
  });

  describe("capacityAnalysis", () => {
    it("should detect feasible schedule with sufficient capacity", () => {
      const r = schedulingPhysicsEngine.capacityAnalysis({
        jobs: [
          { id: "J1", processing_time_hours: 4 },
          { id: "J2", processing_time_hours: 3 },
        ],
        available_hours_per_period: 8,
        periods: 1,
        efficiency: 1.0,
      });
      expect(r.feasible).toBe(true);
      expect(r.capacity_required).toBeCloseTo(7, 1);
      expect(r.capacity_available).toBeCloseTo(8, 1);
      expect(r.utilization_rate).toBeGreaterThan(0);
      expect(r.utilization_rate).toBeLessThanOrEqual(1);
    });

    it("should detect infeasible when capacity is short", () => {
      const r = schedulingPhysicsEngine.capacityAnalysis({
        jobs: [
          { id: "J1", processing_time_hours: 6 },
          { id: "J2", processing_time_hours: 6 },
        ],
        available_hours_per_period: 8,
        periods: 1,
        efficiency: 0.85,
      });
      expect(r.feasible).toBe(false);
      expect(r.capacity_gap).toBeGreaterThan(0);
    });
  });

  describe("scheduleMetrics", () => {
    it("should compute makespan and tardiness for job set", () => {
      const r = schedulingPhysicsEngine.scheduleMetrics({
        jobs: [
          { id: "A", processing_time: 5, due_date: 10 },
          { id: "B", processing_time: 3, due_date: 6 },
          { id: "C", processing_time: 4, due_date: 12 },
        ],
      });
      expect(r.makespan).toBeGreaterThanOrEqual(12);
      expect(r.job_metrics).toHaveLength(3);
      expect(r.avg_flow_time).toBeGreaterThan(0);
      for (const jm of r.job_metrics) {
        expect(jm.critical_ratio).toBeDefined();
        expect(typeof jm.slack_time).toBe("number");
      }
    });

    it("should identify tardy jobs correctly", () => {
      const r = schedulingPhysicsEngine.scheduleMetrics({
        jobs: [
          { id: "X", processing_time: 10, due_date: 5 },
          { id: "Y", processing_time: 2, due_date: 20 },
        ],
      });
      expect(r.tardy_jobs).toBeGreaterThanOrEqual(1);
      expect(r.total_tardiness).toBeGreaterThan(0);
    });
  });
});
