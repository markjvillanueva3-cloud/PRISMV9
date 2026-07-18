/**
 * EmployeeMultiJobConcurrencyEngine.test.ts — HOTEL/U-EMP-MULTI-JOB-CONCURRENCY (iter10)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeMultiJobConcurrencyEngine } from "../engines/EmployeeMultiJobConcurrencyEngine.js";

const EMP = "EMP-MV";
const JOB1 = { employee_id: EMP, job_id: "J-1", operation_id: "OP-10", task_id: "T-1" };
const JOB2 = { employee_id: EMP, job_id: "J-2", operation_id: "OP-20", task_id: "T-2" };
const JOB3 = { employee_id: EMP, job_id: "J-3", operation_id: "OP-30", task_id: "T-3" };

describe("EmployeeMultiJobConcurrencyEngine", () => {
  beforeEach(() => employeeMultiJobConcurrencyEngine.reset());

  describe("checkInToJob", () => {
    it("adds a job in running state with default weight", () => {
      const j = employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      expect(j.state).toBe("running");
      expect(j.attention_weight).toBe(1);
      expect(j.effective_ms).toBe(0);
    });

    it("idempotent — re-checking-in resumes existing job", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-1" });
      const j = employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      expect(j.state).toBe("running");
      expect(employeeMultiJobConcurrencyEngine.listConcurrent({ employee_id: EMP })).toHaveLength(1);
    });

    it("R12 throws on missing ids", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.checkInToJob({ ...JOB1, employee_id: "" }),
      ).toThrow(/employee_id \+ job_id \+ operation_id \+ task_id required/);
    });

    it("R12 throws on attention_weight below floor", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.checkInToJob({ ...JOB1, attention_weight: 0 }),
      ).toThrow(/attention_weight must be ≥/);
    });
  });

  describe("pause / resume / pauseAll", () => {
    it("pauses one job", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      const j = employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-1" });
      expect(j.state).toBe("paused");
    });

    it("resumes a paused job", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-1" });
      const j = employeeMultiJobConcurrencyEngine.resumeJob({ employee_id: EMP, job_id: "J-1" });
      expect(j.state).toBe("running");
    });

    it("pauseAll pauses every job in the set", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB3);
      const all = employeeMultiJobConcurrencyEngine.pauseAll({ employee_id: EMP });
      expect(all).toHaveLength(3);
      expect(all.every((j) => j.state === "paused")).toBe(true);
    });

    it("pauseJob is idempotent on already-paused", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-1" });
      const j = employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-1" });
      expect(j.state).toBe("paused");
    });

    it("R12 throws on unknown job pause/resume", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "NONE" }),
      ).toThrow(/not checked into job/);
    });
  });

  describe("quickSwitch — phone UX tap-to-switch", () => {
    it("atomically pauses from + resumes to (existing job)", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-2" });
      const r = employeeMultiJobConcurrencyEngine.quickSwitch({
        employee_id: EMP,
        from_job_id: "J-1",
        to_job_id: "J-2",
      });
      expect(r.paused.state).toBe("paused");
      expect(r.resumed.state).toBe("running");
    });

    it("checks into a new job when to_job is unknown", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      const r = employeeMultiJobConcurrencyEngine.quickSwitch({
        employee_id: EMP,
        from_job_id: "J-1",
        to_job_id: "J-NEW",
        to_operation_id: "OP-40",
        to_task_id: "T-NEW",
      });
      expect(r.resumed.job_id).toBe("J-NEW");
      expect(r.resumed.state).toBe("running");
    });

    it("R12 throws when new to_job is missing op/task ids", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      expect(() =>
        employeeMultiJobConcurrencyEngine.quickSwitch({
          employee_id: EMP,
          from_job_id: "J-1",
          to_job_id: "J-NEW",
        }),
      ).toThrow(/to_operation_id \+ to_task_id required/);
    });
  });

  describe("tickConcurrentTime — concurrency-aware time allocation", () => {
    it("EQUAL strategy splits ms evenly across active jobs", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB3);
      // 3 concurrent → each gets 1/3 of 6000ms = 2000ms
      const r = employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 6000 });
      expect(r.active_count).toBe(3);
      expect(r.per_job).toHaveLength(3);
      for (const p of r.per_job) {
        expect(p.allocated_ms).toBeCloseTo(2000, 0);
        expect(p.share).toBeCloseTo(1 / 3, 5);
      }
      expect(r.ms_distributed).toBeCloseTo(6000, 0);
    });

    it("paused jobs receive ZERO allocated time", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-2" });
      const r = employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 4000 });
      expect(r.active_count).toBe(1);
      expect(r.per_job[0].job_id).toBe("J-1");
      expect(r.per_job[0].allocated_ms).toBe(4000);
    });

    it("WEIGHTED strategy splits ms by attention_weight", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob({ ...JOB1, attention_weight: 2 });
      employeeMultiJobConcurrencyEngine.checkInToJob({ ...JOB2, attention_weight: 1 });
      employeeMultiJobConcurrencyEngine.setStrategy({ employee_id: EMP, strategy: "weighted" });
      // total weight 3 → J-1 gets 2/3 of 9000 = 6000, J-2 gets 3000
      const r = employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 9000 });
      const j1 = r.per_job.find((p) => p.job_id === "J-1")!;
      const j2 = r.per_job.find((p) => p.job_id === "J-2")!;
      expect(j1.allocated_ms).toBeCloseTo(6000, 0);
      expect(j2.allocated_ms).toBeCloseTo(3000, 0);
    });

    it("Σ allocated_ms = ms_elapsed invariant holds (within float tolerance)", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob({ ...JOB2, attention_weight: 0.5 });
      employeeMultiJobConcurrencyEngine.checkInToJob({ ...JOB3, attention_weight: 1.5 });
      employeeMultiJobConcurrencyEngine.setStrategy({ employee_id: EMP, strategy: "weighted" });
      const r = employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 7777 });
      expect(r.ms_distributed).toBeCloseTo(7777, 1);
    });

    it("returns zero allocation when no active jobs", () => {
      const r = employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 1000 });
      expect(r.active_count).toBe(0);
      expect(r.ms_distributed).toBe(0);
    });

    it("R12 throws on negative or NaN ms_elapsed", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: -1 }),
      ).toThrow(/ms_elapsed must be/);
      expect(() =>
        employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: NaN }),
      ).toThrow(/ms_elapsed must be/);
    });
  });

  describe("quickMenu — phone UX rendered view", () => {
    it("returns one entry per checked-in job with running-first sort", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB3);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-2" });
      const menu = employeeMultiJobConcurrencyEngine.quickMenu({ employee_id: EMP });
      expect(menu).toHaveLength(3);
      // Running first
      const runningStates = menu.slice(0, 2).map((e) => e.state);
      expect(runningStates.every((s) => s === "running")).toBe(true);
      // Paused last
      expect(menu[2].state).toBe("paused");
    });

    it("share_pct reflects current attention split (equal strategy)", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      const menu = employeeMultiJobConcurrencyEngine.quickMenu({ employee_id: EMP });
      // 2 running → 50% each
      for (const e of menu) expect(e.share_pct).toBe(50);
    });

    it("next_action toggles pause/resume per state", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB2);
      employeeMultiJobConcurrencyEngine.pauseJob({ employee_id: EMP, job_id: "J-2" });
      const menu = employeeMultiJobConcurrencyEngine.quickMenu({ employee_id: EMP });
      const j1 = menu.find((e) => e.job_id === "J-1")!;
      const j2 = menu.find((e) => e.job_id === "J-2")!;
      expect(j1.next_action).toBe("pause");
      expect(j2.next_action).toBe("resume");
    });

    it("returns empty array for unknown employee", () => {
      const menu = employeeMultiJobConcurrencyEngine.quickMenu({ employee_id: "EMP-X" });
      expect(menu).toEqual([]);
    });
  });

  describe("setStrategy / setAttentionWeight", () => {
    it("getStrategy defaults to 'equal'", () => {
      expect(employeeMultiJobConcurrencyEngine.getStrategy(EMP)).toBe("equal");
    });

    it("setStrategy persists the choice", () => {
      employeeMultiJobConcurrencyEngine.setStrategy({ employee_id: EMP, strategy: "weighted" });
      expect(employeeMultiJobConcurrencyEngine.getStrategy(EMP)).toBe("weighted");
    });

    it("R12 throws on invalid strategy", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.setStrategy({ employee_id: EMP, strategy: "garbage" as any }),
      ).toThrow(/strategy must be/);
    });

    it("setAttentionWeight updates the job + R12 on below-floor", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      const j = employeeMultiJobConcurrencyEngine.setAttentionWeight({ employee_id: EMP, job_id: "J-1", attention_weight: 3 });
      expect(j.attention_weight).toBe(3);
      expect(() =>
        employeeMultiJobConcurrencyEngine.setAttentionWeight({ employee_id: EMP, job_id: "J-1", attention_weight: 0 }),
      ).toThrow(/must be ≥/);
    });
  });

  describe("adjustPartCount / adjustClockedTime — manual operator corrections", () => {
    it("adjustPartCount records prior/new/delta with reason", () => {
      const adj = employeeMultiJobConcurrencyEngine.adjustPartCount({
        employee_id: EMP,
        job_id: "J-1",
        new_count: 12,
        reason: "off by one from setup",
      });
      expect(adj.prior).toBe(0);
      expect(adj.next).toBe(12);
      expect(adj.delta).toBe(12);
    });

    it("R12 throws on short reason", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.adjustPartCount({
          employee_id: EMP,
          job_id: "J-1",
          new_count: 5,
          reason: "x",
        }),
      ).toThrow(/reason.*required/);
    });

    it("R12 throws on negative new_count", () => {
      expect(() =>
        employeeMultiJobConcurrencyEngine.adjustPartCount({
          employee_id: EMP,
          job_id: "J-1",
          new_count: -1,
          reason: "valid reason",
        }),
      ).toThrow(/non-negative integer/);
    });

    it("adjustClockedTime updates job effective_ms with audit", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 5000 });
      const adj = employeeMultiJobConcurrencyEngine.adjustClockedTime({
        employee_id: EMP,
        job_id: "J-1",
        new_effective_ms: 2000,
        reason: "wrong job clocked",
      });
      expect(adj.prior_ms).toBe(5000);
      expect(adj.next_ms).toBe(2000);
      expect(adj.delta_ms).toBe(-3000);
    });

    it("listPartAdjustments + listClockAdjustments filter by employee + job", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      employeeMultiJobConcurrencyEngine.adjustPartCount({ employee_id: EMP, job_id: "J-1", new_count: 5, reason: "reason1" });
      employeeMultiJobConcurrencyEngine.adjustClockedTime({ employee_id: EMP, job_id: "J-1", new_effective_ms: 1000, reason: "reason2" });
      expect(employeeMultiJobConcurrencyEngine.listPartAdjustments({ job_id: "J-1" })).toHaveLength(1);
      expect(employeeMultiJobConcurrencyEngine.listClockAdjustments({ employee_id: EMP })).toHaveLength(1);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("all returns frozen", () => {
      const j = employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      expect(Object.isFrozen(j)).toBe(true);
      const t = employeeMultiJobConcurrencyEngine.tickConcurrentTime({ employee_id: EMP, ms_elapsed: 100 });
      expect(Object.isFrozen(t)).toBe(true);
      const m = employeeMultiJobConcurrencyEngine.quickMenu({ employee_id: EMP });
      expect(Object.isFrozen(m)).toBe(true);
    });

    it("PII-free state — only employee_id (string)", () => {
      employeeMultiJobConcurrencyEngine.checkInToJob(JOB1);
      const list = employeeMultiJobConcurrencyEngine.listConcurrent({ employee_id: EMP });
      const keys = Object.keys(list[0]);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
    });
  });
});
