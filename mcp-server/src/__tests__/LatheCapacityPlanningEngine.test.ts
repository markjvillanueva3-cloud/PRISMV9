/**
 * LatheCapacityPlanningEngine Tests
 *
 * U-LTH54: Capacity planning, load balancing, bottleneck detection
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheCapacityPlanningEngine,
  type Job,
} from "../engines/LatheCapacityPlanningEngine.js";

describe("LatheCapacityPlanningEngine", () => {
  beforeEach(() => {
    latheCapacityPlanningEngine.clearAll();
  });

  describe("Machine Configuration", () => {
    it("initializes with JM Die lathe inventory", () => {
      const machines = latheCapacityPlanningEngine.getAllMachines();

      expect(machines.length).toBe(5);
      expect(machines.some((m) => m.machine_id === "LB-3000")).toBe(true);
      expect(machines.some((m) => m.type === "swiss_lathe")).toBe(true);
    });

    it("returns machine by ID", () => {
      const machine = latheCapacityPlanningEngine.getMachine("LB-3000");

      expect(machine).not.toBeNull();
      expect(machine!.name).toBe("Okuma LB-3000 EX II");
      expect(machine!.live_tooling).toBe(true);
      expect(machine!.sub_spindle).toBe(true);
    });

    it("returns null for unknown machine", () => {
      const machine = latheCapacityPlanningEngine.getMachine("UNKNOWN");
      expect(machine).toBeNull();
    });
  });

  describe("Capacity Calculations", () => {
    it("calculates weekly capacity for machine", () => {
      const capacity = latheCapacityPlanningEngine.getWeeklyCapacity("LB-3000");

      expect(capacity).toBeGreaterThan(0);
      expect(capacity).toBeLessThan(100);
    });

    it("accounts for efficiency factor", () => {
      const lb3000Capacity = latheCapacityPlanningEngine.getWeeklyCapacity("LB-3000");
      const lb15Capacity = latheCapacityPlanningEngine.getWeeklyCapacity("LB-15II");

      expect(lb3000Capacity).toBeGreaterThan(lb15Capacity);
    });

    it("calculates total shop capacity", () => {
      const totalCapacity = latheCapacityPlanningEngine.getTotalShopCapacity(1);

      expect(totalCapacity).toBeGreaterThan(0);

      let individualSum = 0;
      const machines = latheCapacityPlanningEngine.getAllMachines();
      for (const machine of machines) {
        individualSum += latheCapacityPlanningEngine.getWeeklyCapacity(machine.machine_id);
      }

      expect(totalCapacity).toBeCloseTo(individualSum, 1);
    });

    it("scales capacity by weeks", () => {
      const oneWeek = latheCapacityPlanningEngine.getTotalShopCapacity(1);
      const twoWeeks = latheCapacityPlanningEngine.getTotalShopCapacity(2);

      expect(twoWeeks).toBeCloseTo(oneWeek * 2, 0);
    });
  });

  describe("Job Management", () => {
    const sampleJob: Job = {
      job_id: "JOB-001",
      part_number: "SHAFT-001",
      quantity: 100,
      cycle_time_min: 5,
      setup_time_min: 60,
      required_capabilities: [],
      priority: "normal",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    };

    it("adds job to system", () => {
      latheCapacityPlanningEngine.addJob(sampleJob);

      const job = latheCapacityPlanningEngine.getJob("JOB-001");
      expect(job).not.toBeNull();
      expect(job!.part_number).toBe("SHAFT-001");
    });

    it("calculates job hours correctly", () => {
      const job = latheCapacityPlanningEngine.addJob(sampleJob);
      const hours = latheCapacityPlanningEngine["calculateJobHours"](job);

      const expectedHours = (5 * 100) / 60 + 60 / 60;
      expect(hours).toBeCloseTo(expectedHours, 2);
    });

    it("assigns job to machine", () => {
      latheCapacityPlanningEngine.addJob(sampleJob);

      const assigned = latheCapacityPlanningEngine.assignJobToMachine("JOB-001", "LB-3000");

      expect(assigned).not.toBeNull();
      expect(assigned!.machine_id).toBe("LB-3000");
      expect(assigned!.status).toBe("scheduled");
    });

    it("validates machine capabilities for job", () => {
      const jobRequiringSwiss: Job = {
        ...sampleJob,
        job_id: "JOB-SWISS",
        required_capabilities: ["swiss"],
      };

      latheCapacityPlanningEngine.addJob(jobRequiringSwiss);

      const assignToRegular = latheCapacityPlanningEngine.assignJobToMachine("JOB-SWISS", "LB-3000");
      expect(assignToRegular).toBeNull();

      const assignToSwiss = latheCapacityPlanningEngine.assignJobToMachine("JOB-SWISS", "CITIZEN-L20");
      expect(assignToSwiss).not.toBeNull();
    });
  });

  describe("Machine Load Analysis", () => {
    it("calculates machine load with no jobs", () => {
      const load = latheCapacityPlanningEngine.getMachineLoad("LB-3000", 1);

      expect(load).not.toBeNull();
      expect(load!.scheduled_hours).toBe(0);
      expect(load!.utilization_pct).toBe(0);
      expect(load!.overload).toBe(false);
    });

    it("calculates machine load with jobs", () => {
      const job: Job = {
        job_id: "JOB-001",
        part_number: "PART-001",
        quantity: 100,
        cycle_time_min: 5,
        setup_time_min: 60,
        required_capabilities: [],
        priority: "normal",
        due_date: new Date().toISOString(),
        machine_id: "LB-3000",
        status: "scheduled",
      };

      latheCapacityPlanningEngine.addJob(job);

      const load = latheCapacityPlanningEngine.getMachineLoad("LB-3000", 1);

      expect(load).not.toBeNull();
      expect(load!.scheduled_hours).toBeGreaterThan(0);
      expect(load!.jobs.length).toBe(1);
    });

    it("detects overload condition", () => {
      for (let i = 0; i < 10; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 500,
          cycle_time_min: 10,
          setup_time_min: 120,
          required_capabilities: [],
          priority: "normal",
          due_date: new Date().toISOString(),
          machine_id: "GENOS-L200",
          status: "scheduled",
        });
      }

      const load = latheCapacityPlanningEngine.getMachineLoad("GENOS-L200", 1);

      expect(load).not.toBeNull();
      expect(load!.overload).toBe(true);
      expect(load!.overload_hours).toBeGreaterThan(0);
    });

    it("returns all machine loads sorted by utilization", () => {
      const loads = latheCapacityPlanningEngine.getAllMachineLoads();

      expect(loads.length).toBe(5);

      for (let i = 1; i < loads.length; i++) {
        expect(loads[i - 1].utilization_pct).toBeGreaterThanOrEqual(loads[i].utilization_pct);
      }
    });
  });

  describe("Bottleneck Detection", () => {
    it("returns empty array when no bottlenecks", () => {
      const bottlenecks = latheCapacityPlanningEngine.detectBottlenecks(90);

      expect(bottlenecks.length).toBe(0);
    });

    it("detects machines exceeding threshold", () => {
      for (let i = 0; i < 8; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 200,
          cycle_time_min: 8,
          setup_time_min: 90,
          required_capabilities: [],
          priority: "normal",
          due_date: new Date().toISOString(),
          machine_id: "LB-15II",
          status: "scheduled",
        });
      }

      const bottlenecks = latheCapacityPlanningEngine.detectBottlenecks(90);

      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks[0].machine_id).toBe("LB-15II");
    });

    it("classifies severity correctly", () => {
      for (let i = 0; i < 15; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 300,
          cycle_time_min: 10,
          setup_time_min: 120,
          required_capabilities: [],
          priority: "normal",
          due_date: new Date().toISOString(),
          machine_id: "GENOS-L200",
          status: "scheduled",
        });
      }

      const bottlenecks = latheCapacityPlanningEngine.detectBottlenecks(90);
      const criticalBottleneck = bottlenecks.find((b) => b.machine_id === "GENOS-L200");

      expect(criticalBottleneck).toBeDefined();
      expect(criticalBottleneck!.severity).toBe("critical");
    });

    it("provides recommendations for bottlenecks", () => {
      for (let i = 0; i < 10; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 200,
          cycle_time_min: 8,
          setup_time_min: 90,
          required_capabilities: [],
          priority: "normal",
          due_date: new Date().toISOString(),
          machine_id: "LB-15II",
          status: "scheduled",
        });
      }

      const bottlenecks = latheCapacityPlanningEngine.detectBottlenecks(90);

      expect(bottlenecks[0].recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Capacity Forecast", () => {
    it("generates forecast for specified weeks", () => {
      const forecasts = latheCapacityPlanningEngine.forecastCapacity(4);

      expect(forecasts.length).toBe(4);
    });

    it("includes capacity metrics in forecast", () => {
      const forecasts = latheCapacityPlanningEngine.forecastCapacity(1);

      expect(forecasts[0].total_capacity_hours).toBeGreaterThan(0);
      expect(forecasts[0].utilization_pct).toBeGreaterThanOrEqual(0);
    });

    it("identifies overcapacity status", () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 3);

      for (let i = 0; i < 20; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 500,
          cycle_time_min: 15,
          setup_time_min: 120,
          required_capabilities: [],
          priority: "normal",
          due_date: nextWeek.toISOString(),
          status: "pending",
        });
      }

      const forecasts = latheCapacityPlanningEngine.forecastCapacity(1);

      expect(forecasts[0].status).toBe("overcapacity");
      expect(forecasts[0].shortfall_hours).toBeGreaterThan(0);
    });
  });

  describe("Load Balancing", () => {
    it("returns balance result even with no jobs", () => {
      const result = latheCapacityPlanningEngine.balanceLoad();

      expect(result.original_utilization).toBeDefined();
      expect(result.balanced_utilization).toBeDefined();
      expect(result.reassignments).toBeDefined();
    });

    it("balances load across machines", () => {
      for (let i = 0; i < 10; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 100,
          cycle_time_min: 5,
          setup_time_min: 60,
          required_capabilities: [],
          priority: "normal",
          due_date: new Date().toISOString(),
          machine_id: "LB-3000",
          status: "scheduled",
        });
      }

      const result = latheCapacityPlanningEngine.balanceLoad();

      expect(result.improvement_pct).toBeGreaterThanOrEqual(0);
    });

    it("respects rush priority during balancing", () => {
      latheCapacityPlanningEngine.addJob({
        job_id: "RUSH-JOB",
        part_number: "RUSH-PART",
        quantity: 100,
        cycle_time_min: 5,
        setup_time_min: 60,
        required_capabilities: [],
        priority: "rush",
        due_date: new Date().toISOString(),
        machine_id: "LB-3000",
        status: "scheduled",
      });

      const result = latheCapacityPlanningEngine.balanceLoad();
      const rushReassigned = result.reassignments.find((r) => r.job_id === "RUSH-JOB");

      expect(rushReassigned).toBeUndefined();
    });
  });

  describe("What-If Scenarios", () => {
    it("evaluates adding new job", () => {
      const scenario = latheCapacityPlanningEngine.runWhatIfScenario({
        scenario_id: "",
        description: "Add large job",
        changes: [
          {
            type: "add_job",
            details: {
              job_id: "NEW-JOB",
              part_number: "NEW-PART",
              quantity: 1000,
              cycle_time_min: 10,
              setup_time_min: 180,
              required_capabilities: [],
              priority: "normal",
              due_date: new Date().toISOString(),
              machine_id: "LB-3000",
              status: "scheduled",
            },
          },
        ],
      });

      expect(scenario.scenario_id).toMatch(/^WIF-/);
      expect(scenario.result.utilization_impact).toBeDefined();
    });

    it("evaluates capacity changes", () => {
      for (let i = 0; i < 8; i++) {
        latheCapacityPlanningEngine.addJob({
          job_id: `JOB-${i}`,
          part_number: `PART-${i}`,
          quantity: 200,
          cycle_time_min: 8,
          setup_time_min: 90,
          required_capabilities: [],
          priority: "normal",
          due_date: new Date().toISOString(),
          machine_id: "GENOS-L200",
          status: "scheduled",
        });
      }

      const scenario = latheCapacityPlanningEngine.runWhatIfScenario({
        scenario_id: "",
        description: "Add second shift to GENOS",
        changes: [
          {
            type: "change_capacity",
            details: {
              machine_id: "GENOS-L200",
              shifts: 2,
            },
          },
        ],
      });

      expect(scenario.result.feasible).toBeDefined();
    });

    it("restores original state after scenario", () => {
      const originalJobs = latheCapacityPlanningEngine.getAllJobs().length;

      latheCapacityPlanningEngine.runWhatIfScenario({
        scenario_id: "",
        description: "Test scenario",
        changes: [
          {
            type: "add_job",
            details: {
              job_id: "TEMP-JOB",
              part_number: "TEMP",
              quantity: 50,
              cycle_time_min: 3,
              setup_time_min: 30,
              required_capabilities: [],
              priority: "normal",
              due_date: new Date().toISOString(),
              status: "pending",
            },
          },
        ],
      });

      const afterJobs = latheCapacityPlanningEngine.getAllJobs().length;
      expect(afterJobs).toBe(originalJobs);
    });
  });
});
