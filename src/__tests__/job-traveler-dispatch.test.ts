/**
 * Tests for Session 6-7: Job Traveler + Machine Dispatch
 * Covers U-TRAV1 (JobTravelerEngine), U-TRAV2 (MachineDispatchEngine),
 * and integration between the two.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { JobTravelerEngine } from "../engines/JobTravelerEngine.js";
import { MachineDispatchEngine } from "../engines/MachineDispatchEngine.js";

describe("JobTravelerEngine — Traveler Creation (U-TRAV1)", () => {
  let engine: JobTravelerEngine;

  beforeEach(() => {
    engine = new JobTravelerEngine();
  });

  it("creates a traveler with ordered routing steps", () => {
    const steps = engine.createTraveler({
      job_id: "JOB-001",
      steps: [
        { step_number: 1, operation: "Op 10 Saw", est_setup_min: 15, est_cycle_min: 30 },
        { step_number: 2, operation: "Op 20 Mill", machine_id: "HAAS-VF2", est_setup_min: 25, est_cycle_min: 60 },
        { step_number: 3, operation: "Op 30 Inspect", est_setup_min: 5, est_cycle_min: 20 },
      ],
    });

    expect(steps).toHaveLength(3);
    expect(steps[0].operation).toBe("Op 10 Saw");
    expect(steps[0].status).toBe("pending");
    expect(steps[1].machine_id).toBe("HAAS-VF2");
    expect(steps[2].step_number).toBe(3);
  });

  it("rejects empty steps", () => {
    expect(() => engine.createTraveler({ job_id: "JOB-X", steps: [] }))
      .toThrow("At least one routing step");
  });

  it("rejects duplicate traveler for same job", () => {
    engine.createTraveler({
      job_id: "JOB-DUP",
      steps: [{ step_number: 1, operation: "Op 10" }],
    });
    expect(() => engine.createTraveler({
      job_id: "JOB-DUP",
      steps: [{ step_number: 1, operation: "Op 10" }],
    })).toThrow("already exists");
  });

  it("rejects duplicate step numbers", () => {
    expect(() => engine.createTraveler({
      job_id: "JOB-BAD",
      steps: [
        { step_number: 1, operation: "Op 10" },
        { step_number: 1, operation: "Op 20" },
      ],
    })).toThrow("Duplicate step number");
  });
});

describe("JobTravelerEngine — Dual Time Tracking", () => {
  let engine: JobTravelerEngine;

  beforeEach(() => {
    engine = new JobTravelerEngine();
    engine.createTraveler({
      job_id: "JOB-100",
      steps: [
        { step_number: 1, operation: "Op 10 Saw", est_setup_min: 10, est_cycle_min: 45 },
        { step_number: 2, operation: "Op 20 Mill", est_setup_min: 20, est_cycle_min: 90 },
      ],
    });
  });

  it("starts setup on a pending step", () => {
    const { step, timer } = engine.startSetup({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-001",
    });

    expect(step.status).toBe("setup");
    expect(step.operator_id).toBe("OP-001");
    expect(timer.entry_type).toBe("setup");
    expect(timer.end_time).toBeUndefined();
  });

  it("transitions from setup to cycle", () => {
    engine.startSetup({ job_id: "JOB-100", step_number: 1, operator_id: "OP-001" });

    const { step, timer } = engine.startCycle({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-001",
    });

    expect(step.status).toBe("running");
    expect(step.setup_time_min).toBeGreaterThanOrEqual(0);
    expect(timer.entry_type).toBe("cycle");
  });

  it("rejects start_setup on non-pending step", () => {
    engine.startSetup({ job_id: "JOB-100", step_number: 1, operator_id: "OP-001" });
    expect(() => engine.startSetup({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-002",
    })).toThrow("must be 'pending'");
  });

  it("rejects start_cycle on non-setup step", () => {
    expect(() => engine.startCycle({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-001",
    })).toThrow("must be 'setup'");
  });

  it("completes a running step and records cycle time", () => {
    engine.startSetup({ job_id: "JOB-100", step_number: 1, operator_id: "OP-001" });
    engine.startCycle({ job_id: "JOB-100", step_number: 1, operator_id: "OP-001" });

    const { step, summary } = engine.completeStep({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-001",
    });

    expect(step.status).toBe("complete");
    expect(step.completed_at).toBeDefined();
    expect(step.setup_time_min).toBeGreaterThanOrEqual(0);
    expect(step.cycle_time_min).toBeGreaterThanOrEqual(0);
    expect(summary.completed_steps).toBe(1);
    expect(summary.pct_complete).toBe(50);
  });

  it("can skip a step", () => {
    const { step } = engine.completeStep({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-001", skip: true,
    });
    expect(step.status).toBe("skipped");
  });

  it("prevents completing a pending step without skip flag", () => {
    expect(() => engine.completeStep({
      job_id: "JOB-100", step_number: 1, operator_id: "OP-001",
    })).toThrow("must be 'setup' or 'running'");
  });
});

describe("JobTravelerEngine — Traveler Summary & Variance", () => {
  let engine: JobTravelerEngine;

  beforeEach(() => {
    engine = new JobTravelerEngine();
    engine.createTraveler({
      job_id: "JOB-200",
      steps: [
        { step_number: 1, operation: "Op 10", est_setup_min: 10, est_cycle_min: 50 },
        { step_number: 2, operation: "Op 20", est_setup_min: 15, est_cycle_min: 80 },
        { step_number: 3, operation: "Op 30", est_setup_min: 5, est_cycle_min: 30 },
      ],
    });
  });

  it("returns traveler summary with estimates", () => {
    const summary = engine.getTraveler("JOB-200");
    expect(summary.total_steps).toBe(3);
    expect(summary.completed_steps).toBe(0);
    expect(summary.pct_complete).toBe(0);
    expect(summary.est_total_setup_min).toBe(30);
    expect(summary.est_total_cycle_min).toBe(160);
  });

  it("throws for unknown job", () => {
    expect(() => engine.getTraveler("NOPE")).toThrow("No traveler found");
  });

  it("returns active travelers list", () => {
    const travelers = engine.getActiveTravelers();
    expect(travelers).toHaveLength(1);
    expect(travelers[0].job_id).toBe("JOB-200");
  });

  it("tracks time entries per step", () => {
    engine.startSetup({ job_id: "JOB-200", step_number: 1, operator_id: "OP-A" });
    engine.startCycle({ job_id: "JOB-200", step_number: 1, operator_id: "OP-A" });

    const entries = engine.getJobTimeEntries("JOB-200");
    expect(entries).toHaveLength(2);
    expect(entries[0].entry_type).toBe("setup");
    expect(entries[1].entry_type).toBe("cycle");
  });
});

describe("JobTravelerEngine — QR Scan", () => {
  let engine: JobTravelerEngine;

  beforeEach(() => {
    engine = new JobTravelerEngine();
    engine.createTraveler({
      job_id: "JOB-300",
      steps: [
        { step_number: 1, operation: "Op 10 Saw" },
        { step_number: 2, operation: "Op 20 Mill" },
      ],
    });
  });

  it("auto-detects start_setup on first scan of pending step", () => {
    const result = engine.scan({ code: "JOB-JOB-300-STEP-1", operator_id: "OP-001" });
    expect(result.action).toBe("start_setup");
    expect(result.step.status).toBe("setup");
  });

  it("auto-detects start_cycle on scan of setup step", () => {
    engine.startSetup({ job_id: "JOB-300", step_number: 1, operator_id: "OP-001" });
    const result = engine.scan({ code: "JOB-JOB-300-STEP-1", operator_id: "OP-001" });
    expect(result.action).toBe("start_cycle");
    expect(result.step.status).toBe("running");
  });

  it("auto-detects complete on scan of running step", () => {
    engine.startSetup({ job_id: "JOB-300", step_number: 1, operator_id: "OP-001" });
    engine.startCycle({ job_id: "JOB-300", step_number: 1, operator_id: "OP-001" });
    const result = engine.scan({ code: "JOB-JOB-300-STEP-1", operator_id: "OP-001" });
    expect(result.action).toBe("complete");
    expect(result.step.status).toBe("complete");
  });

  it("rejects invalid scan code", () => {
    expect(() => engine.scan({ code: "INVALID", operator_id: "OP-001" }))
      .toThrow("Invalid scan code format");
  });

  it("scan without step number targets next pending step", () => {
    const result = engine.scan({ code: "JOB-JOB-300", operator_id: "OP-001" });
    expect(result.action).toBe("start_setup");
    expect(result.step.step_number).toBe(1);
  });
});

describe("MachineDispatchEngine — Queue Management (U-TRAV2)", () => {
  let engine: MachineDispatchEngine;

  beforeEach(() => {
    engine = new MachineDispatchEngine();
  });

  it("queues a job on a machine", () => {
    const entry = engine.queueJob({
      machine_id: "HAAS-VF2",
      job_id: "JOB-001",
      priority: 50,
      estimated_duration_min: 120,
      queued_by: "scheduler",
    });

    expect(entry.machine_id).toBe("HAAS-VF2");
    expect(entry.status).toBe("queued");
    expect(entry.priority).toBe(50);
  });

  it("rejects duplicate job on same machine", () => {
    engine.queueJob({ machine_id: "M1", job_id: "J1" });
    expect(() => engine.queueJob({ machine_id: "M1", job_id: "J1" }))
      .toThrow("already queued");
  });

  it("returns machine queue ordered by priority", () => {
    engine.queueJob({ machine_id: "M1", job_id: "J-LOW", priority: 200 });
    engine.queueJob({ machine_id: "M1", job_id: "J-HIGH", priority: 10 });
    engine.queueJob({ machine_id: "M1", job_id: "J-MED", priority: 100 });

    const queue = engine.getQueue("M1");
    expect(queue.entries).toHaveLength(3);
    expect(queue.entries[0].job_id).toBe("J-HIGH");
    expect(queue.entries[1].job_id).toBe("J-MED");
    expect(queue.entries[2].job_id).toBe("J-LOW");
    expect(queue.total_queued).toBe(3);
  });

  it("activates next queued job", () => {
    engine.queueJob({ machine_id: "M1", job_id: "J1", priority: 10 });
    engine.queueJob({ machine_id: "M1", job_id: "J2", priority: 20 });

    const active = engine.activateNext("M1", "OP-001");
    expect(active.status).toBe("active");
    expect(active.job_id).toBe("J1");
    expect(active.actual_start).toBeDefined();
  });

  it("blocks activation when job already active", () => {
    engine.queueJob({ machine_id: "M1", job_id: "J1" });
    engine.activateNext("M1", "OP-001");
    expect(() => engine.activateNext("M1", "OP-002")).toThrow("already has active");
  });

  it("completes active job", () => {
    engine.queueJob({ machine_id: "M1", job_id: "J1" });
    engine.activateNext("M1", "OP-001");

    const completed = engine.completeActive("M1", "OP-001");
    expect(completed.status).toBe("complete");
    expect(completed.actual_complete).toBeDefined();
  });

  it("removes a queued job", () => {
    const entry = engine.queueJob({ machine_id: "M1", job_id: "J1" });
    const removed = engine.remove(entry.id, "scheduler");
    expect(removed.status).toBe("cancelled");
  });

  it("rejects removing active job", () => {
    const entry = engine.queueJob({ machine_id: "M1", job_id: "J1" });
    engine.activateNext("M1", "OP-001");
    expect(() => engine.remove(entry.id, "scheduler")).toThrow("only 'queued'");
  });
});

describe("MachineDispatchEngine — Planning Board", () => {
  let engine: MachineDispatchEngine;

  beforeEach(() => {
    engine = new MachineDispatchEngine();
    engine.queueJob({ machine_id: "HAAS-VF2", job_id: "J1", priority: 10 });
    engine.queueJob({ machine_id: "HAAS-VF2", job_id: "J2", priority: 20 });
    engine.queueJob({ machine_id: "DMG-MORI", job_id: "J3", priority: 10 });
  });

  it("returns all machine queues", () => {
    const board = engine.getAllQueues();
    expect(board.machines).toHaveLength(2);
    expect(board.total_queued_jobs).toBe(3);
    expect(board.timestamp).toBeDefined();
  });

  it("sorts machines with active jobs first", () => {
    engine.activateNext("DMG-MORI", "OP-001");
    const board = engine.getAllQueues();
    expect(board.machines[0].machine_id).toBe("DMG-MORI");
    expect(board.machines[0].active_job).toBeDefined();
  });
});

describe("MachineDispatchEngine — Reorder", () => {
  let engine: MachineDispatchEngine;

  beforeEach(() => {
    engine = new MachineDispatchEngine();
  });

  it("reorders queue entries", () => {
    const e1 = engine.queueJob({ machine_id: "M1", job_id: "J1", priority: 10 });
    const e2 = engine.queueJob({ machine_id: "M1", job_id: "J2", priority: 20 });
    const e3 = engine.queueJob({ machine_id: "M1", job_id: "J3", priority: 30 });

    // Reverse order: J3 first, then J2, then J1
    const reordered = engine.reorder({
      machine_id: "M1",
      order: [e3.id, e2.id, e1.id],
      reordered_by: "planner",
    });

    expect(reordered.entries[0].job_id).toBe("J3");
    expect(reordered.entries[1].job_id).toBe("J2");
    expect(reordered.entries[2].job_id).toBe("J1");
  });
});

describe("MachineDispatchEngine — What-If Simulation", () => {
  let engine: MachineDispatchEngine;

  beforeEach(() => {
    engine = new MachineDispatchEngine();
    engine.queueJob({ machine_id: "M1", job_id: "J1", priority: 10, estimated_duration_min: 60 });
    engine.queueJob({ machine_id: "M1", job_id: "J2", priority: 20, estimated_duration_min: 45 });
  });

  it("simulates inserting a job and shows impact", () => {
    const result = engine.whatIf({
      machine_id: "M1",
      insert_position: 0,
      job_id: "J-URGENT",
      estimated_duration_min: 30,
    });

    expect(result.modified_queue).toHaveLength(3);
    expect(result.modified_queue[0].job_id).toBe("J-URGENT");
    expect(result.impact.jobs_delayed).toBeGreaterThanOrEqual(0);
  });

  it("rejects what-if with zero duration", () => {
    expect(() => engine.whatIf({
      machine_id: "M1",
      insert_position: 0,
      job_id: "J-X",
      estimated_duration_min: 0,
    })).toThrow("must be > 0");
  });
});

describe("Integration — Full Traveler Flow", () => {
  it("create job → traveler → setup → cycle → complete → verify times", () => {
    const traveler = new JobTravelerEngine();
    const dispatch = new MachineDispatchEngine();

    // Create traveler
    const steps = traveler.createTraveler({
      job_id: "INT-JOB-001",
      steps: [
        { step_number: 10, operation: "Op 10 Saw", machine_id: "SAW-1", est_setup_min: 10, est_cycle_min: 30 },
        { step_number: 20, operation: "Op 20 Mill", machine_id: "HAAS-VF2", est_setup_min: 20, est_cycle_min: 60 },
        { step_number: 30, operation: "Op 30 Inspect", est_setup_min: 5, est_cycle_min: 15 },
      ],
    });
    expect(steps).toHaveLength(3);

    // Queue first op on the saw
    dispatch.queueJob({ machine_id: "SAW-1", job_id: "INT-JOB-001", routing_step_id: steps[0].id });

    // Start setup
    const { step: s1setup } = traveler.startSetup({
      job_id: "INT-JOB-001", step_number: 10, operator_id: "OP-A",
    });
    expect(s1setup.status).toBe("setup");

    // Start cycle
    const { step: s1cycle } = traveler.startCycle({
      job_id: "INT-JOB-001", step_number: 10, operator_id: "OP-A",
    });
    expect(s1cycle.status).toBe("running");
    expect(s1cycle.setup_time_min).toBeGreaterThanOrEqual(0);

    // Complete step 1
    const { step: s1done, summary: sum1 } = traveler.completeStep({
      job_id: "INT-JOB-001", step_number: 10, operator_id: "OP-A",
    });
    expect(s1done.status).toBe("complete");
    expect(sum1.completed_steps).toBe(1);
    expect(sum1.pct_complete).toBe(33);

    // Skip inspection (Op 30)
    traveler.startSetup({ job_id: "INT-JOB-001", step_number: 20, operator_id: "OP-B" });
    traveler.startCycle({ job_id: "INT-JOB-001", step_number: 20, operator_id: "OP-B" });
    traveler.completeStep({ job_id: "INT-JOB-001", step_number: 20, operator_id: "OP-B" });

    const { summary: sum3 } = traveler.completeStep({
      job_id: "INT-JOB-001", step_number: 30, operator_id: "OP-C", skip: true,
    });

    expect(sum3.completed_steps).toBe(3);
    expect(sum3.pct_complete).toBe(100);

    // Verify time entries
    const entries = traveler.getJobTimeEntries("INT-JOB-001");
    expect(entries.length).toBeGreaterThanOrEqual(4); // 2 setup + 2 cycle for steps 1 and 2

    // Planning board should have the machine
    const board = dispatch.getAllQueues();
    expect(board.machines.length).toBeGreaterThanOrEqual(1);
  });
});
