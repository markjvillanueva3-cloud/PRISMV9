/**
 * Production Optimization Engines — 55 tests
 *
 * Covers:
 *   ShiftScheduleOptimizerEngine (20 tests): scheduling, load balancing, what-if
 *   BottleneckAnalysisEngine (18 tests): TOC identification, DBR, sensitivity
 *   PredictiveMaintenanceOrchestratorEngine (17 tests): health scoring, ISO 10816, planning, failure history
 */
import { describe, it, expect } from "vitest";
import { shiftScheduleOptimizerEngine } from "../engines/ShiftScheduleOptimizerEngine.js";
import { bottleneckAnalysisEngine } from "../engines/BottleneckAnalysisEngine.js";
import { predictiveMaintenanceOrchestratorEngine } from "../engines/PredictiveMaintenanceOrchestratorEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// ShiftScheduleOptimizerEngine
// ═══════════════════════════════════════════════════════════════════════════
describe("ShiftScheduleOptimizerEngine", () => {
  const engine = shiftScheduleOptimizerEngine;

  describe("optimizeSchedule", () => {
    it("schedules 3 jobs across 2 machines", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Bracket", operations: [{ machine_types: ["mill"], cycle_time_min: 30, setup_time_min: 10 }] },
          { id: "J2", name: "Shaft", operations: [{ machine_types: ["lathe"], cycle_time_min: 45, setup_time_min: 15 }] },
          { id: "J3", name: "Housing", operations: [{ machine_types: ["mill"], cycle_time_min: 60, setup_time_min: 20 }] },
        ],
        machines: [
          { id: "M1", type: "mill", available_hours: 8, shift: "day" },
          { id: "M2", type: "lathe", available_hours: 8, shift: "day" },
        ],
      });
      expect(result.schedule.length).toBe(3);
      expect(result.makespan_hours).toBeGreaterThan(0);
      expect(result.utilization_pct_per_machine).toHaveProperty("M1");
      expect(result.utilization_pct_per_machine).toHaveProperty("M2");
      expect(result.gantt_data.length).toBe(2);
    });

    it("returns empty schedule for no jobs", () => {
      const result = engine.optimizeSchedule({
        jobs: [],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      expect(result.schedule.length).toBe(0);
      expect(result.makespan_hours).toBe(0);
    });

    it("throws for no machines", () => {
      expect(() => engine.optimizeSchedule({
        jobs: [{ id: "J1", name: "Part", operations: [{ machine_types: ["mill"], cycle_time_min: 30 }] }],
        machines: [],
      })).toThrow("No machines");
    });

    it("detects late jobs", () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Urgent", operations: [{ machine_types: ["mill"], cycle_time_min: 60 }], due_date: yesterday },
        ],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      expect(result.late_jobs.length).toBeGreaterThanOrEqual(1);
      expect(result.late_jobs[0].job_id).toBe("J1");
      expect(result.late_jobs[0].days_late).toBeGreaterThanOrEqual(1);
    });

    it("respects priority sorting (higher priority first)", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "LOW", name: "Low", operations: [{ machine_types: ["mill"], cycle_time_min: 30 }], priority: 1 },
          { id: "HIGH", name: "High", operations: [{ machine_types: ["mill"], cycle_time_min: 30 }], priority: 10 },
        ],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      const highEntry = result.schedule.find(s => s.job_id === "HIGH");
      const lowEntry = result.schedule.find(s => s.job_id === "LOW");
      expect(highEntry!.start_min).toBeLessThan(lowEntry!.start_min);
    });

    it("handles multi-operation jobs sequentially", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          {
            id: "J1", name: "Complex Part",
            operations: [
              { machine_types: ["mill"], cycle_time_min: 30, setup_time_min: 10 },
              { machine_types: ["lathe"], cycle_time_min: 20, setup_time_min: 5 },
            ],
          },
        ],
        machines: [
          { id: "M1", type: "mill", available_hours: 8, shift: "day" },
          { id: "M2", type: "lathe", available_hours: 8, shift: "day" },
        ],
      });
      expect(result.schedule.length).toBe(2);
      const op0 = result.schedule.find(s => s.operation_index === 0)!;
      const op1 = result.schedule.find(s => s.operation_index === 1)!;
      expect(op1.start_min).toBeGreaterThanOrEqual(op0.end_min);
    });

    it("generates gantt blocks with setup and run types", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Part", operations: [{ machine_types: ["mill"], cycle_time_min: 30, setup_time_min: 10 }] },
        ],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      const m1Gantt = result.gantt_data.find(g => g.machine === "M1")!;
      const setupBlocks = m1Gantt.blocks.filter(b => b.type === "setup");
      const runBlocks = m1Gantt.blocks.filter(b => b.type === "run");
      expect(setupBlocks.length).toBe(1);
      expect(runBlocks.length).toBe(1);
      expect(setupBlocks[0].end).toBe(runBlocks[0].start);
    });

    it("adds idle blocks in gantt data", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Quick", operations: [{ machine_types: ["mill"], cycle_time_min: 10 }] },
        ],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      const m1Gantt = result.gantt_data.find(g => g.machine === "M1")!;
      const idleBlocks = m1Gantt.blocks.filter(b => b.type === "idle");
      expect(idleBlocks.length).toBeGreaterThanOrEqual(1);
    });

    it("calculates utilization percentage", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Half Day", operations: [{ machine_types: ["mill"], cycle_time_min: 240 }] },
        ],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      // 240 min / 480 min = 50%
      expect(result.utilization_pct_per_machine["M1"]).toBe(50);
    });

    it("assigns jobs to matching machine types only", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Mill Part", operations: [{ machine_types: ["mill"], cycle_time_min: 30 }] },
          { id: "J2", name: "Lathe Part", operations: [{ machine_types: ["lathe"], cycle_time_min: 30 }] },
        ],
        machines: [
          { id: "M1", type: "mill", available_hours: 8, shift: "day" },
          { id: "M2", type: "lathe", available_hours: 8, shift: "day" },
        ],
      });
      const j1 = result.schedule.find(s => s.job_id === "J1")!;
      const j2 = result.schedule.find(s => s.job_id === "J2")!;
      expect(j1.machine_id).toBe("M1");
      expect(j2.machine_id).toBe("M2");
    });

    it("calculates idle time total", () => {
      const result = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "Short", operations: [{ machine_types: ["mill"], cycle_time_min: 60 }] },
        ],
        machines: [
          { id: "M1", type: "mill", available_hours: 8, shift: "day" },
          { id: "M2", type: "mill", available_hours: 8, shift: "day" },
        ],
      });
      expect(result.idle_time_total_hours).toBeGreaterThan(0);
    });
  });

  describe("balanceLoad", () => {
    it("assigns jobs to least loaded machines", () => {
      const result = engine.balanceLoad({
        machines: [
          { id: "M1", current_load_hours: 6, capacity_hours: 8, type: "mill" },
          { id: "M2", current_load_hours: 2, capacity_hours: 8, type: "mill" },
        ],
        unassigned_jobs: [
          { id: "J1", required_hours: 3, machine_type: "mill" },
        ],
      });
      expect(result.assignments.length).toBe(1);
      expect(result.assignments[0].machine_id).toBe("M2"); // More capacity
    });

    it("returns balance score between 0 and 1", () => {
      const result = engine.balanceLoad({
        machines: [
          { id: "M1", current_load_hours: 4, capacity_hours: 8, type: "mill" },
          { id: "M2", current_load_hours: 4, capacity_hours: 8, type: "mill" },
        ],
        unassigned_jobs: [],
      });
      expect(result.load_balance_score).toBeGreaterThanOrEqual(0);
      expect(result.load_balance_score).toBeLessThanOrEqual(1);
    });

    it("identifies overloaded machines", () => {
      const result = engine.balanceLoad({
        machines: [
          { id: "M1", current_load_hours: 7, capacity_hours: 8, type: "mill" },
        ],
        unassigned_jobs: [
          { id: "J1", required_hours: 3, machine_type: "mill" },
        ],
      });
      expect(result.overloaded).toContain("M1");
    });

    it("identifies underutilized machines", () => {
      const result = engine.balanceLoad({
        machines: [
          { id: "M1", current_load_hours: 1, capacity_hours: 8, type: "mill" },
          { id: "M2", current_load_hours: 7, capacity_hours: 8, type: "mill" },
        ],
        unassigned_jobs: [],
      });
      expect(result.underutilized).toContain("M1");
    });

    it("perfect balance gives score near 1", () => {
      const result = engine.balanceLoad({
        machines: [
          { id: "M1", current_load_hours: 4, capacity_hours: 8, type: "mill" },
          { id: "M2", current_load_hours: 4, capacity_hours: 8, type: "mill" },
        ],
        unassigned_jobs: [],
      });
      expect(result.load_balance_score).toBeGreaterThanOrEqual(0.9);
    });

    it("returns empty for no machines", () => {
      const result = engine.balanceLoad({ machines: [], unassigned_jobs: [] });
      expect(result.assignments.length).toBe(0);
      expect(result.load_balance_score).toBe(0);
    });
  });

  describe("whatIfAddMachine", () => {
    it("estimates makespan improvement", () => {
      const currentSchedule = engine.optimizeSchedule({
        jobs: [
          { id: "J1", name: "A", operations: [{ machine_types: ["mill"], cycle_time_min: 120 }] },
          { id: "J2", name: "B", operations: [{ machine_types: ["mill"], cycle_time_min: 120 }] },
        ],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      const result = engine.whatIfAddMachine({
        current_schedule: currentSchedule,
        new_machine: { id: "M2", type: "mill", available_hours: 8, shift: "day", hourly_rate: 75 },
      });
      expect(result.new_makespan_hours).toBeLessThanOrEqual(currentSchedule.makespan_hours);
      expect(result.makespan_improvement_pct).toBeGreaterThanOrEqual(0);
      expect(result.new_utilization).toHaveProperty("M2");
      expect(typeof result.roi_estimate).toBe("number");
    });

    it("returns zero improvement for empty schedule", () => {
      const emptySchedule = engine.optimizeSchedule({
        jobs: [],
        machines: [{ id: "M1", type: "mill", available_hours: 8, shift: "day" }],
      });
      const result = engine.whatIfAddMachine({
        current_schedule: emptySchedule,
        new_machine: { id: "M2", type: "mill", available_hours: 8, shift: "day" },
      });
      expect(result.new_makespan_hours).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BottleneckAnalysisEngine
// ═══════════════════════════════════════════════════════════════════════════
describe("BottleneckAnalysisEngine", () => {
  const engine = bottleneckAnalysisEngine;

  describe("identifyBottlenecks", () => {
    it("identifies the resource with highest utilization as bottleneck", () => {
      const result = engine.identifyBottlenecks({
        resources: [
          { type: "machine", id: "CNC-1", capacity_per_shift: 100, demand_per_shift: 95, cost_per_hour: 80 },
          { type: "machine", id: "CNC-2", capacity_per_shift: 100, demand_per_shift: 60 },
          { type: "operator", id: "OP-1", capacity_per_shift: 80, demand_per_shift: 40 },
        ],
      });
      expect(result.bottleneck.resource_id).toBe("CNC-1");
      expect(result.bottleneck.utilization_pct).toBe(95);
      expect(result.throughput_limited_by).toBe("CNC-1");
    });

    it("ranks all resources by utilization descending", () => {
      const result = engine.identifyBottlenecks({
        resources: [
          { type: "machine", id: "A", capacity_per_shift: 100, demand_per_shift: 50 },
          { type: "machine", id: "B", capacity_per_shift: 100, demand_per_shift: 90 },
          { type: "machine", id: "C", capacity_per_shift: 100, demand_per_shift: 70 },
        ],
      });
      expect(result.constraint_ranking[0].resource_id).toBe("B");
      expect(result.constraint_ranking[1].resource_id).toBe("C");
      expect(result.constraint_ranking[2].resource_id).toBe("A");
    });

    it("calculates excess demand for over-capacity resources", () => {
      const result = engine.identifyBottlenecks({
        resources: [
          { type: "machine", id: "M1", capacity_per_shift: 80, demand_per_shift: 120 },
        ],
      });
      expect(result.bottleneck.excess_demand).toBe(40);
      expect(result.bottleneck.utilization_pct).toBe(150);
    });

    it("generates recommendations for over-utilized resources", () => {
      const result = engine.identifyBottlenecks({
        resources: [
          { type: "machine", id: "M1", capacity_per_shift: 100, demand_per_shift: 110, cost_per_hour: 50 },
        ],
      });
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(result.recommendations[0].expected_improvement_pct).toBeGreaterThan(0);
    });

    it("recommends cross-training for operator bottlenecks", () => {
      const result = engine.identifyBottlenecks({
        resources: [
          { type: "operator", id: "OP-1", capacity_per_shift: 50, demand_per_shift: 55 },
        ],
      });
      const crossTrain = result.recommendations.find(r => r.action.includes("Cross-train"));
      expect(crossTrain).toBeDefined();
    });

    it("calculates slack correctly", () => {
      const result = engine.identifyBottlenecks({
        resources: [
          { type: "machine", id: "M1", capacity_per_shift: 100, demand_per_shift: 70 },
        ],
      });
      expect(result.constraint_ranking[0].slack).toBe(30);
    });

    it("throws for empty resources", () => {
      expect(() => engine.identifyBottlenecks({ resources: [] })).toThrow("No resources");
    });
  });

  describe("drumBufferRope", () => {
    it("calculates drum rate from bottleneck throughput", () => {
      const result = engine.drumBufferRope({
        bottleneck_id: "CNC-1",
        buffer_time_min: 30,
        jobs: [
          { id: "J1", operations: [{ resource_id: "SAW", time_min: 5 }, { resource_id: "CNC-1", time_min: 20 }] },
          { id: "J2", operations: [{ resource_id: "SAW", time_min: 5 }, { resource_id: "CNC-1", time_min: 20 }] },
        ],
      });
      expect(result.drum_rate).toBeCloseTo(1 / 20, 3);
      expect(result.expected_throughput_per_shift).toBe(24); // 480/20
    });

    it("schedules rope release with buffer offset", () => {
      const result = engine.drumBufferRope({
        bottleneck_id: "CNC-1",
        buffer_time_min: 15,
        jobs: [
          { id: "J1", operations: [{ resource_id: "SAW", time_min: 10 }, { resource_id: "CNC-1", time_min: 20 }] },
        ],
      });
      expect(result.rope_release_schedule.length).toBe(1);
      // Release = 0 (bottleneck start) - 15 (buffer) - 10 (pre-bnk) = max(0, -25) = 0
      expect(result.rope_release_schedule[0].release_time).toBe(0);
    });

    it("returns green buffer status for generous buffer", () => {
      const result = engine.drumBufferRope({
        bottleneck_id: "BNK",
        buffer_time_min: 60,
        jobs: [{ id: "J1", operations: [{ resource_id: "BNK", time_min: 20 }] }],
      });
      expect(result.buffer_status).toBe("green"); // 60/20 = 3 > 1.5
    });

    it("returns yellow buffer status for tight buffer", () => {
      const result = engine.drumBufferRope({
        bottleneck_id: "BNK",
        buffer_time_min: 15,
        jobs: [{ id: "J1", operations: [{ resource_id: "BNK", time_min: 20 }] }],
      });
      expect(result.buffer_status).toBe("yellow"); // 15/20 = 0.75
    });

    it("returns red buffer status for insufficient buffer", () => {
      const result = engine.drumBufferRope({
        bottleneck_id: "BNK",
        buffer_time_min: 5,
        jobs: [{ id: "J1", operations: [{ resource_id: "BNK", time_min: 20 }] }],
      });
      expect(result.buffer_status).toBe("red"); // 5/20 = 0.25 < 0.5
    });

    it("handles empty jobs", () => {
      const result = engine.drumBufferRope({ bottleneck_id: "X", buffer_time_min: 10, jobs: [] });
      expect(result.drum_rate).toBe(0);
      expect(result.expected_throughput_per_shift).toBe(0);
    });

    it("handles jobs that skip the bottleneck", () => {
      const result = engine.drumBufferRope({
        bottleneck_id: "BNK",
        buffer_time_min: 10,
        jobs: [
          { id: "J1", operations: [{ resource_id: "OTHER", time_min: 30 }] },
        ],
      });
      expect(result.rope_release_schedule[0].release_time).toBe(0);
    });
  });

  describe("sensitivityAnalysis", () => {
    const baseResources = [
      { type: "machine" as const, id: "M1", capacity_per_shift: 100, demand_per_shift: 95 },
      { type: "machine" as const, id: "M2", capacity_per_shift: 100, demand_per_shift: 60 },
    ];

    it("detects bottleneck shift when capacity changes", () => {
      const result = engine.sensitivityAnalysis({
        resources: baseResources,
        scenarios: [
          { name: "Double M1 capacity", changes: [{ id: "M1", capacity_per_shift: 200 }] },
        ],
      });
      expect(result.baseline_bottleneck_id).toBe("M1");
      expect(result.scenarios[0].bottleneck_shifted).toBe(true);
      expect(result.scenarios[0].bottleneck_id).toBe("M2");
    });

    it("calculates throughput change percentage", () => {
      const result = engine.sensitivityAnalysis({
        resources: baseResources,
        scenarios: [
          { name: "Increase M1", changes: [{ id: "M1", capacity_per_shift: 120 }] },
        ],
      });
      expect(result.scenarios[0].throughput_change_pct).toBeGreaterThan(0);
    });

    it("handles multiple scenarios", () => {
      const result = engine.sensitivityAnalysis({
        resources: baseResources,
        scenarios: [
          { name: "A", changes: [{ id: "M1", capacity_per_shift: 120 }] },
          { name: "B", changes: [{ id: "M2", demand_per_shift: 110 }] },
        ],
      });
      expect(result.scenarios.length).toBe(2);
    });

    it("reports no shift when bottleneck stays", () => {
      const result = engine.sensitivityAnalysis({
        resources: baseResources,
        scenarios: [
          { name: "Slight M1 boost", changes: [{ id: "M1", capacity_per_shift: 105 }] },
        ],
      });
      expect(result.scenarios[0].bottleneck_shifted).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PredictiveMaintenanceOrchestratorEngine
// ═══════════════════════════════════════════════════════════════════════════
describe("PredictiveMaintenanceOrchestratorEngine", () => {
  const engine = predictiveMaintenanceOrchestratorEngine;

  describe("assessMachineHealth", () => {
    it("returns healthy for good signals", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-001",
        vibration_rms_mm_s: 1.5,
        spindle_temp_C: 38,
        spindle_hours: 5000,
        last_maintenance_date: "2026-03-10",
        operating_hours_since_maintenance: 500,
        error_count_last_week: 0,
        axis_backlash_um: { X: 5, Y: 4, Z: 6 },
      });
      expect(result.health_score).toBeGreaterThan(75);
      expect(result.status).toBe("healthy");
      expect(result.risk_factors.length).toBe(0);
    });

    it("detects critical vibration per ISO 10816 (>18 mm/s)", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-002",
        vibration_rms_mm_s: 22,
        spindle_hours: 1000,
        last_maintenance_date: "2026-03-01",
        operating_hours_since_maintenance: 2100,
        error_count_last_week: 8,
      });
      expect(result.status).toBe("critical");
      const vibFactor = result.risk_factors.find(r => r.factor === "vibration_rms");
      expect(vibFactor).toBeDefined();
      expect(vibFactor!.severity).toBe("critical");
    });

    it("detects acceptable vibration (2.8-7.1 mm/s)", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-003",
        vibration_rms_mm_s: 5.0,
        spindle_hours: 1000,
        last_maintenance_date: "2026-03-01",
        operating_hours_since_maintenance: 500,
      });
      const vibFactor = result.risk_factors.find(r => r.factor === "vibration_rms");
      expect(vibFactor).toBeDefined();
      expect(vibFactor!.severity).toBe("medium");
    });

    it("flags overdue maintenance", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-004",
        spindle_hours: 10000,
        last_maintenance_date: "2025-01-01",
        operating_hours_since_maintenance: 2500,
      });
      const overdue = result.risk_factors.find(r => r.factor === "overdue_maintenance");
      expect(overdue).toBeDefined();
      expect(overdue!.severity).toBe("critical");
      const urgentAction = result.recommended_maintenance.find(a => a.urgency === "immediate");
      expect(urgentAction).toBeDefined();
    });

    it("flags high error count", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-005",
        spindle_hours: 1000,
        last_maintenance_date: "2026-03-10",
        operating_hours_since_maintenance: 100,
        error_count_last_week: 12,
      });
      const errorFactor = result.risk_factors.find(r => r.factor === "error_count");
      expect(errorFactor).toBeDefined();
      expect(errorFactor!.severity).toBe("critical");
    });

    it("flags excessive backlash", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-006",
        spindle_hours: 1000,
        last_maintenance_date: "2026-03-10",
        operating_hours_since_maintenance: 100,
        axis_backlash_um: { X: 35, Y: 5 },
      });
      const blFactor = result.risk_factors.find(r => r.factor.startsWith("backlash_"));
      expect(blFactor).toBeDefined();
      expect(blFactor!.severity).toBe("critical");
    });

    it("predicts failure days for unhealthy machines", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-007",
        vibration_rms_mm_s: 12,
        spindle_temp_C: 60,
        spindle_hours: 8000,
        last_maintenance_date: "2025-06-01",
        operating_hours_since_maintenance: 2200,
        error_count_last_week: 8,
      });
      expect(result.predicted_failure_days).toBeDefined();
      expect(result.predicted_failure_days!).toBeGreaterThan(0);
    });

    it("returns routine action for healthy machine", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-008",
        spindle_hours: 500,
        last_maintenance_date: "2026-03-14",
        operating_hours_since_maintenance: 100,
      });
      expect(result.recommended_maintenance.some(a => a.urgency === "routine")).toBe(true);
    });

    it("high spindle temperature triggers cooling check", () => {
      const result = engine.assessMachineHealth({
        machine_id: "CNC-009",
        spindle_temp_C: 70,
        spindle_hours: 1000,
        last_maintenance_date: "2026-03-10",
        operating_hours_since_maintenance: 500,
      });
      const tempFactor = result.risk_factors.find(r => r.factor === "spindle_temperature");
      expect(tempFactor).toBeDefined();
      const coolAction = result.recommended_maintenance.find(a => a.action.includes("cooling"));
      expect(coolAction).toBeDefined();
    });
  });

  describe("planMaintenance", () => {
    it("plans maintenance prioritized by health score", () => {
      const result = engine.planMaintenance({
        machines: [
          { id: "M1", health_score: 90, next_maintenance_due: "2026-04-01", production_schedule_blocked_dates: [] },
          { id: "M2", health_score: 30, next_maintenance_due: "2026-03-20", production_schedule_blocked_dates: [] },
        ],
      });
      expect(result.maintenance_plan.length).toBe(2);
      expect(result.maintenance_plan[0].machine_id).toBe("M2"); // Worst first
      expect(result.maintenance_plan[0].estimated_downtime_hours).toBeGreaterThan(
        result.maintenance_plan[1].estimated_downtime_hours
      );
    });

    it("avoids blocked production dates", () => {
      const result = engine.planMaintenance({
        machines: [
          {
            id: "M1", health_score: 50, next_maintenance_due: "2026-03-20",
            production_schedule_blocked_dates: ["2026-03-20", "2026-03-21"],
          },
        ],
      });
      expect(result.maintenance_plan[0].recommended_date).toBe("2026-03-22");
    });

    it("calculates total production impact", () => {
      const result = engine.planMaintenance({
        machines: [
          { id: "M1", health_score: 50, next_maintenance_due: "2026-04-01", production_schedule_blocked_dates: [] },
          { id: "M2", health_score: 80, next_maintenance_due: "2026-04-15", production_schedule_blocked_dates: [] },
        ],
      });
      expect(result.production_impact_hours).toBeGreaterThan(0);
      const totalFromPlan = result.maintenance_plan.reduce((s, p) => s + p.estimated_downtime_hours, 0);
      expect(result.production_impact_hours).toBe(totalFromPlan);
    });

    it("returns empty for no machines", () => {
      const result = engine.planMaintenance({ machines: [] });
      expect(result.maintenance_plan.length).toBe(0);
      expect(result.production_impact_hours).toBe(0);
    });
  });

  describe("analyzeFailureHistory", () => {
    const failures = [
      { machine_id: "M1", date: "2026-01-01", component: "spindle_bearing", cause: "wear", downtime_hours: 8, cost: 2000 },
      { machine_id: "M1", date: "2026-02-01", component: "spindle_bearing", cause: "wear", downtime_hours: 6, cost: 1800 },
      { machine_id: "M1", date: "2026-03-01", component: "coolant_pump", cause: "seal_failure", downtime_hours: 4, cost: 500 },
      { machine_id: "M2", date: "2026-01-15", component: "ballscrew", cause: "backlash", downtime_hours: 12, cost: 5000 },
      { machine_id: "M2", date: "2026-03-10", component: "ballscrew", cause: "backlash", downtime_hours: 10, cost: 4500 },
    ];

    it("calculates MTBF per machine", () => {
      const result = engine.analyzeFailureHistory({ failures });
      expect(result.mtbf_hours["M1"]).toBeGreaterThan(0);
      expect(result.mtbf_hours["M2"]).toBeGreaterThan(0);
    });

    it("calculates MTTR per machine", () => {
      const result = engine.analyzeFailureHistory({ failures });
      expect(result.mttr_hours["M1"]).toBe(6); // (8+6+4)/3
      expect(result.mttr_hours["M2"]).toBe(11); // (12+10)/2
    });

    it("generates Pareto ranking by failure count", () => {
      const result = engine.analyzeFailureHistory({ failures });
      expect(result.pareto_components[0].component).toBe("spindle_bearing");
      expect(result.pareto_components[0].failure_count).toBe(2);
      expect(result.pareto_components[1].component).toBe("ballscrew");
    });

    it("returns empty for no failures", () => {
      const result = engine.analyzeFailureHistory({ failures: [] });
      expect(Object.keys(result.mtbf_hours).length).toBe(0);
      expect(result.pareto_components.length).toBe(0);
    });

    it("calculates total cost in Pareto", () => {
      const result = engine.analyzeFailureHistory({ failures });
      const bearing = result.pareto_components.find(p => p.component === "spindle_bearing");
      expect(bearing).toBeDefined();
      expect(bearing!.total_cost).toBe(3800); // 2000 + 1800
    });
  });
});
