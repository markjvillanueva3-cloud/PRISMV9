/**
 * EmployeePerOpPartTrackerEngine.test.ts — HOTEL/U-EMP-PER-OP-PART-TRACKER (iter9)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeePerOpPartTrackerEngine } from "../engines/EmployeePerOpPartTrackerEngine.js";

const BASE = {
  job_id: "JOB-100",
  operation_id: "OP-10",
  employee_id: "EMP-MV",
  parts_completed: 5,
};

describe("EmployeePerOpPartTrackerEngine", () => {
  beforeEach(() => employeePerOpPartTrackerEngine.reset());

  describe("recordOpComplete", () => {
    it("stores a record with auto-generated id + date_key", () => {
      const r = employeePerOpPartTrackerEngine.recordOpComplete(BASE);
      expect(r.id).toMatch(/^OP-\d{6}$/);
      expect(r.date_key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.parts_completed).toBe(5);
    });

    it("preserves notes when provided", () => {
      const r = employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, notes: "Op 10 batch 1" });
      expect(r.notes).toBe("Op 10 batch 1");
    });

    it("R12 throws on missing job_id", () => {
      expect(() => employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, job_id: "" })).toThrow(
        /job_id \+ operation_id \+ employee_id required/,
      );
    });

    it("R12 throws on non-integer parts_completed", () => {
      expect(() => employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: 5.5 })).toThrow(
        /must be an integer/,
      );
    });

    it("R12 throws on negative parts_completed", () => {
      expect(() => employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: -1 })).toThrow(
        /must be non-negative/,
      );
    });

    it("R12 throws on NaN parts_completed", () => {
      expect(() => employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: NaN })).toThrow(
        /must be an integer/,
      );
    });
  });

  describe("getOpSummary", () => {
    it("sums multiple records for same (job, op)", () => {
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: 5 });
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: 3 });
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: 7 });
      const s = employeePerOpPartTrackerEngine.getOpSummary({ job_id: BASE.job_id, operation_id: BASE.operation_id });
      expect(s.total_parts).toBe(15);
      expect(s.records_count).toBe(3);
      expect(s.contributors).toContain("EMP-MV");
    });

    it("returns zero totals when no records exist", () => {
      const s = employeePerOpPartTrackerEngine.getOpSummary({ job_id: "NONE", operation_id: "X" });
      expect(s.total_parts).toBe(0);
      expect(s.records_count).toBe(0);
      expect(s.first_recorded_at).toBeNull();
    });

    it("tracks multiple contributors", () => {
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, employee_id: "EMP-A" });
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, employee_id: "EMP-B" });
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, employee_id: "EMP-A" });
      const s = employeePerOpPartTrackerEngine.getOpSummary({ job_id: BASE.job_id, operation_id: BASE.operation_id });
      expect(s.contributors).toEqual(["EMP-A", "EMP-B"]);
    });
  });

  describe("getEmployeeDailyShip — closes blank-day reporting gap", () => {
    it("rolls up across ops/jobs touched on the same day", () => {
      const today = new Date().toISOString().slice(0, 10);
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "JOB-A", operation_id: "OP-10", employee_id: "EMP-MV", parts_completed: 15 });
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "JOB-A", operation_id: "OP-20", employee_id: "EMP-MV", parts_completed: 10 });
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "JOB-B", operation_id: "OP-30", employee_id: "EMP-MV", parts_completed: 25 });
      const r = employeePerOpPartTrackerEngine.getEmployeeDailyShip({ employee_id: "EMP-MV", date_key: today });
      expect(r.total_parts_across_ops).toBe(50);
      expect(r.ops_touched).toBe(3);
      expect(r.jobs_touched).toBe(2);
      // Sorted by parts desc
      expect(r.per_op_breakdown[0].parts).toBe(25);
    });

    it("answers 'did this person ship anything today?' even when no final-op complete", () => {
      const today = new Date().toISOString().slice(0, 10);
      // Operator worked op 1 + op 2 of a 4-op part — no "completed" shipments
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "JOB-X", operation_id: "OP-1", employee_id: "EMP-MV", parts_completed: 40 });
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "JOB-X", operation_id: "OP-2", employee_id: "EMP-MV", parts_completed: 30 });
      const r = employeePerOpPartTrackerEngine.getEmployeeDailyShip({ employee_id: "EMP-MV", date_key: today });
      expect(r.total_parts_across_ops).toBe(70); // NOT zero
      expect(r.ops_touched).toBe(2);
    });

    it("R12 throws on missing employee_id / date_key", () => {
      expect(() =>
        employeePerOpPartTrackerEngine.getEmployeeDailyShip({ employee_id: "", date_key: "2026-05-25" }),
      ).toThrow(/employee_id \+ date_key required/);
    });
  });

  describe("getJobOpTotals — by-op summary for a job", () => {
    it("returns one row per operation_id with sum + count", () => {
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "J", operation_id: "OP-10", employee_id: "E", parts_completed: 5 });
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "J", operation_id: "OP-10", employee_id: "E", parts_completed: 5 });
      employeePerOpPartTrackerEngine.recordOpComplete({ job_id: "J", operation_id: "OP-20", employee_id: "E", parts_completed: 8 });
      const t = employeePerOpPartTrackerEngine.getJobOpTotals("J");
      expect(t).toHaveLength(2);
      const op10 = t.find((r) => r.operation_id === "OP-10")!;
      expect(op10.total_parts).toBe(10);
      expect(op10.records).toBe(2);
      const op20 = t.find((r) => r.operation_id === "OP-20")!;
      expect(op20.total_parts).toBe(8);
    });

    it("returns empty array for unknown job_id", () => {
      const t = employeePerOpPartTrackerEngine.getJobOpTotals("NONE");
      expect(t).toEqual([]);
    });

    it("R12 throws on empty job_id", () => {
      expect(() => employeePerOpPartTrackerEngine.getJobOpTotals("")).toThrow(/job_id required/);
    });
  });

  describe("adjustOpCount — operator self-correct with audit trail", () => {
    it("creates a corrective record + adjustment entry", () => {
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: 10 });
      const adj = employeePerOpPartTrackerEngine.adjustOpCount({
        job_id: BASE.job_id,
        operation_id: BASE.operation_id,
        employee_id: BASE.employee_id,
        new_count: 15,
        reason: "miscounted earlier",
        adjusted_by: "EMP-MV",
      });
      expect(adj.prior_count).toBe(10);
      expect(adj.new_count).toBe(15);
      expect(adj.delta).toBe(5);
      const summary = employeePerOpPartTrackerEngine.getOpSummary({
        job_id: BASE.job_id,
        operation_id: BASE.operation_id,
      });
      expect(summary.total_parts).toBe(15);
    });

    it("supports downward adjustment (delta < 0)", () => {
      employeePerOpPartTrackerEngine.recordOpComplete({ ...BASE, parts_completed: 20 });
      const adj = employeePerOpPartTrackerEngine.adjustOpCount({
        job_id: BASE.job_id,
        operation_id: BASE.operation_id,
        employee_id: BASE.employee_id,
        new_count: 12,
        reason: "scrapped 8 pieces",
        adjusted_by: "EMP-MV",
      });
      expect(adj.delta).toBe(-8);
      const summary = employeePerOpPartTrackerEngine.getOpSummary({
        job_id: BASE.job_id,
        operation_id: BASE.operation_id,
      });
      expect(summary.total_parts).toBe(12);
    });

    it("R12 throws on missing reason / short reason / negative count / non-int", () => {
      employeePerOpPartTrackerEngine.recordOpComplete(BASE);
      expect(() =>
        employeePerOpPartTrackerEngine.adjustOpCount({
          job_id: BASE.job_id,
          operation_id: BASE.operation_id,
          employee_id: BASE.employee_id,
          new_count: 1,
          reason: "x",
          adjusted_by: "EMP",
        }),
      ).toThrow(/reason.*required/);
      expect(() =>
        employeePerOpPartTrackerEngine.adjustOpCount({
          job_id: BASE.job_id,
          operation_id: BASE.operation_id,
          employee_id: BASE.employee_id,
          new_count: -1,
          reason: "valid reason",
          adjusted_by: "EMP",
        }),
      ).toThrow(/non-negative integer/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned records are frozen + immutable", () => {
      const r = employeePerOpPartTrackerEngine.recordOpComplete(BASE);
      expect(Object.isFrozen(r)).toBe(true);
    });

    it("PII-free — only employee_id (string), no name/SSN/DOB", () => {
      const r = employeePerOpPartTrackerEngine.recordOpComplete(BASE);
      const keys = Object.keys(r);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });

    it("listOpRecords returns defensive copies", () => {
      employeePerOpPartTrackerEngine.recordOpComplete(BASE);
      const list = employeePerOpPartTrackerEngine.listOpRecords({ job_id: BASE.job_id, operation_id: BASE.operation_id });
      expect(Object.isFrozen(list)).toBe(true);
    });
  });
});
