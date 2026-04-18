/**
 * LatheJobSchedulingEngine Tests
 *
 * U-LTH50: Job scheduling with 21-machine constraints
 */

import { describe, it, expect } from "vitest";
import {
  latheJobSchedulingEngine,
  type ScheduledJob,
  type Machine,
} from "../engines/LatheJobSchedulingEngine.js";

describe("LatheJobSchedulingEngine", () => {
  const createTestJob = (overrides: Partial<ScheduledJob> = {}): ScheduledJob => ({
    job_id: `JOB-${Math.random().toString(36).substring(7)}`,
    quote_id: "Q-001",
    part_number: "PART-001",
    customer: "ALCOA",
    quantity: 100,
    cycle_time_sec: 180,
    setup_time_min: 45,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "normal",
    material: "4140",
    required_diameter_mm: 50,
    required_length_mm: 100,
    required_capabilities: ["turning"],
    status: "pending",
    ...overrides,
  });

  describe("generateSchedule()", () => {
    it("generates valid schedule for single job", () => {
      const jobs = [createTestJob()];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.schedule_id).toMatch(/^SCH-/);
      expect(result.generated_at).toBeTruthy();
      expect(result.horizon_days).toBe(14);
      expect(result.slots.length).toBe(1);
      expect(result.unscheduled_jobs.length).toBe(0);
    });

    it("schedules multiple jobs", () => {
      const jobs = [
        createTestJob({ job_id: "JOB-001" }),
        createTestJob({ job_id: "JOB-002" }),
        createTestJob({ job_id: "JOB-003" }),
      ];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.slots.length).toBe(3);
      expect(result.metrics.scheduled_jobs).toBe(3);
    });

    it("prioritizes rush jobs", () => {
      const jobs = [
        createTestJob({ job_id: "JOB-NORMAL", priority: "normal" }),
        createTestJob({ job_id: "JOB-RUSH", priority: "rush" }),
        createTestJob({ job_id: "JOB-LOW", priority: "low" }),
      ];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      const rushSlot = result.slots.find((s) => s.job_id === "JOB-RUSH");
      const normalSlot = result.slots.find((s) => s.job_id === "JOB-NORMAL");

      expect(rushSlot).toBeDefined();
      expect(normalSlot).toBeDefined();

      if (rushSlot && normalSlot) {
        expect(new Date(rushSlot.start_time).getTime())
          .toBeLessThanOrEqual(new Date(normalSlot.start_time).getTime());
      }
    });

    it("respects machine capability requirements", () => {
      const jobs = [
        createTestJob({
          job_id: "JOB-LIVE",
          required_capabilities: ["turning", "live_tooling"],
        }),
      ];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      if (result.slots.length > 0) {
        expect(result.slots[0].machine_id).toBe("LTH-08");
      }
    });

    it("respects machine size constraints", () => {
      const oversizedJob = createTestJob({
        job_id: "JOB-LARGE",
        required_diameter_mm: 350,
        required_length_mm: 800,
      });
      const result = latheJobSchedulingEngine.generateSchedule([oversizedJob]);

      if (result.slots.length > 0) {
        expect(result.slots[0].machine_id).toBe("LTH-03");
      }
    });

    it("flags jobs exceeding machine capabilities", () => {
      const impossibleJob = createTestJob({
        job_id: "JOB-IMPOSSIBLE",
        required_diameter_mm: 600,
        required_capabilities: ["turning", "nonexistent_capability"],
      });
      const result = latheJobSchedulingEngine.generateSchedule([impossibleJob]);

      expect(result.unscheduled_jobs.length).toBe(1);
      expect(result.unscheduled_jobs[0].job_id).toBe("JOB-IMPOSSIBLE");
      expect(result.conflicts.some((c) => c.type === "capability")).toBe(true);
    });

    it("includes slot timing details", () => {
      const jobs = [createTestJob()];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      const slot = result.slots[0];
      expect(slot.start_time).toBeTruthy();
      expect(slot.end_time).toBeTruthy();
      expect(slot.setup_minutes).toBeGreaterThan(0);
      expect(slot.run_minutes).toBeGreaterThan(0);
      expect([1, 2]).toContain(slot.shift);
    });

    it("flags due date conflicts", () => {
      const urgentJob = createTestJob({
        job_id: "JOB-URGENT",
        due_date: new Date(Date.now() + 1000).toISOString(),
        quantity: 10000,
        cycle_time_sec: 600,
      });
      const result = latheJobSchedulingEngine.generateSchedule([urgentJob]);

      if (result.slots.length > 0) {
        const hasDueDateConflict = result.conflicts.some(
          (c) => c.type === "due_date" && c.job_id === "JOB-URGENT"
        );
        expect(hasDueDateConflict || result.unscheduled_jobs.length > 0).toBe(true);
      }
    });
  });

  describe("metrics calculation", () => {
    it("calculates correct job counts", () => {
      const jobs = [
        createTestJob({ job_id: "JOB-001" }),
        createTestJob({ job_id: "JOB-002" }),
        createTestJob({
          job_id: "JOB-003",
          required_diameter_mm: 600,
        }),
      ];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.metrics.total_jobs).toBe(3);
      expect(result.metrics.scheduled_jobs + result.metrics.unscheduled_jobs).toBe(3);
    });

    it("calculates machine hours", () => {
      const jobs = [createTestJob({ quantity: 10, cycle_time_sec: 180 })];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.metrics.total_machine_hours).toBeGreaterThan(0);
    });

    it("calculates utilization percentage", () => {
      const jobs = [createTestJob()];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.metrics.utilization_pct).toBeGreaterThanOrEqual(0);
      expect(result.metrics.utilization_pct).toBeLessThanOrEqual(100);
    });

    it("calculates on-time rate", () => {
      const jobs = [
        createTestJob({
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.metrics.on_time_rate_pct).toBe(100);
    });

    it("tracks setup changeovers", () => {
      const jobs = [
        createTestJob({ job_id: "JOB-001", material: "4140" }),
        createTestJob({ job_id: "JOB-002", material: "316SS" }),
      ];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.metrics.setup_changeovers).toBe(2);
      expect(result.metrics.setup_time_total_min).toBeGreaterThan(0);
    });
  });

  describe("optimization score", () => {
    it("returns score between 0 and 100", () => {
      const jobs = [createTestJob()];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.optimization_score).toBeGreaterThanOrEqual(0);
      expect(result.optimization_score).toBeLessThanOrEqual(100);
    });

    it("penalizes unscheduled jobs", () => {
      const goodJobs = [createTestJob()];
      const badJobs = [
        createTestJob(),
        createTestJob({ required_diameter_mm: 600 }),
      ];

      const goodResult = latheJobSchedulingEngine.generateSchedule(goodJobs);
      const badResult = latheJobSchedulingEngine.generateSchedule(badJobs);

      expect(goodResult.optimization_score).toBeGreaterThan(badResult.optimization_score);
    });

    it("penalizes due date conflicts", () => {
      const onTimeJob = [
        createTestJob({
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ];
      const lateJob = [
        createTestJob({
          due_date: new Date(Date.now() + 1000).toISOString(),
          quantity: 5000,
        }),
      ];

      const onTimeResult = latheJobSchedulingEngine.generateSchedule(onTimeJob);
      const lateResult = latheJobSchedulingEngine.generateSchedule(lateJob);

      expect(onTimeResult.optimization_score).toBeGreaterThanOrEqual(
        lateResult.optimization_score
      );
    });
  });

  describe("machine management", () => {
    it("returns list of machines", () => {
      const machines = latheJobSchedulingEngine.getMachines();

      expect(machines.length).toBeGreaterThan(0);
      expect(machines[0].id).toBeTruthy();
      expect(machines[0].type).toBe("lathe");
    });

    it("has 8 JM Die lathes by default", () => {
      const machines = latheJobSchedulingEngine.getMachines();
      const lathes = machines.filter((m) => m.type === "lathe");

      expect(lathes.length).toBe(8);
    });

    it("machines have required properties", () => {
      const machines = latheJobSchedulingEngine.getMachines();

      for (const machine of machines) {
        expect(machine.id).toBeTruthy();
        expect(machine.name).toBeTruthy();
        expect(machine.model).toBeTruthy();
        expect(machine.max_diameter_mm).toBeGreaterThan(0);
        expect(machine.max_length_mm).toBeGreaterThan(0);
        expect(machine.available_hours_per_day).toBeGreaterThan(0);
        expect(machine.hourly_rate).toBeGreaterThan(0);
        expect(machine.capabilities.length).toBeGreaterThan(0);
      }
    });

    it("includes Okuma and Haas lathes", () => {
      const machines = latheJobSchedulingEngine.getMachines();
      const okumaCount = machines.filter((m) => m.name.includes("Okuma")).length;
      const haasCount = machines.filter((m) => m.name.includes("Haas")).length;

      expect(okumaCount).toBeGreaterThan(0);
      expect(haasCount).toBeGreaterThan(0);
    });
  });

  describe("configuration", () => {
    it("returns current config", () => {
      const config = latheJobSchedulingEngine.getConfig();

      expect(config.horizon_days).toBe(14);
      expect(config.shift_hours).toBe(8);
      expect(config.shifts_per_day).toBe(2);
      expect(config.setup_changeover_min).toBe(45);
    });

    it("allows config updates", () => {
      const originalConfig = latheJobSchedulingEngine.getConfig();

      latheJobSchedulingEngine.updateConfig({ horizon_days: 21 });
      const updatedConfig = latheJobSchedulingEngine.getConfig();

      expect(updatedConfig.horizon_days).toBe(21);

      latheJobSchedulingEngine.updateConfig({ horizon_days: originalConfig.horizon_days });
    });

    it("returns immutable config copy", () => {
      const config1 = latheJobSchedulingEngine.getConfig();
      const config2 = latheJobSchedulingEngine.getConfig();

      config1.horizon_days = 999;
      expect(config2.horizon_days).not.toBe(999);
    });
  });

  describe("edge cases", () => {
    it("handles empty job list", () => {
      const result = latheJobSchedulingEngine.generateSchedule([]);

      expect(result.slots.length).toBe(0);
      expect(result.unscheduled_jobs.length).toBe(0);
      expect(result.metrics.total_jobs).toBe(0);
      expect(result.optimization_score).toBeGreaterThan(0);
    });

    it("handles job with zero quantity", () => {
      const jobs = [createTestJob({ quantity: 0 })];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      expect(result.slots.length).toBe(1);
      expect(result.slots[0].run_minutes).toBe(0);
    });

    it("handles very large job that spans multiple shifts", () => {
      const largeJob = createTestJob({
        quantity: 1000,
        cycle_time_sec: 300,
      });
      const result = latheJobSchedulingEngine.generateSchedule([largeJob]);

      if (result.unscheduled_jobs.length > 0) {
        expect(result.conflicts.some((c) => c.type === "capacity")).toBe(true);
      }
    });

    it("distributes jobs across machines", () => {
      const jobs = Array.from({ length: 20 }, (_, i) =>
        createTestJob({
          job_id: `JOB-${i.toString().padStart(3, "0")}`,
          quantity: 10,
        })
      );
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      const machinesUsed = new Set(result.slots.map((s) => s.machine_id));
      expect(machinesUsed.size).toBeGreaterThan(1);
    });
  });

  describe("schedule slot details", () => {
    it("assigns correct shift based on start time", () => {
      const jobs = [createTestJob()];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      for (const slot of result.slots) {
        const startHour = new Date(slot.start_time).getHours();
        if (startHour < 16) {
          expect(slot.shift).toBe(1);
        } else {
          expect(slot.shift).toBe(2);
        }
      }
    });

    it("calculates run minutes from quantity and cycle time", () => {
      const job = createTestJob({ quantity: 60, cycle_time_sec: 60 });
      const result = latheJobSchedulingEngine.generateSchedule([job]);

      if (result.slots.length > 0) {
        expect(result.slots[0].run_minutes).toBe(60);
      }
    });

    it("end time is after start time", () => {
      const jobs = [createTestJob()];
      const result = latheJobSchedulingEngine.generateSchedule(jobs);

      for (const slot of result.slots) {
        expect(new Date(slot.end_time).getTime()).toBeGreaterThan(
          new Date(slot.start_time).getTime()
        );
      }
    });
  });
});
