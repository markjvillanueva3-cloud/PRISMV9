/**
 * SafetyTrainingRecordEngine.test.ts — HOTEL/U-SAFETY-TRAINING-RECORD (iter12)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { safetyTrainingRecordEngine } from "../engines/SafetyTrainingRecordEngine.js";

describe("SafetyTrainingRecordEngine", () => {
  beforeEach(() => safetyTrainingRecordEngine.reset());

  describe("assignTraining", () => {
    it("creates assigned record in 'assigned' status with auto-id", () => {
      const r = safetyTrainingRecordEngine.assignTraining({
        employee_id: "EMP-MV",
        topic_id: "loto",
      });
      expect(r.id).toMatch(/^TRN-\d{6}$/);
      expect(r.status).toBe("assigned");
      expect(r.topic_id).toBe("loto");
      expect(r.completed_at).toBeNull();
      expect(r.expires_at).toBeNull();
    });

    it("normalizes topic_id to lowercase", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "HazCom" });
      expect(r.topic_id).toBe("hazcom");
    });

    it("R12 throws on missing fields", () => {
      expect(() => safetyTrainingRecordEngine.assignTraining({ employee_id: "", topic_id: "loto" })).toThrow(
        /employee_id \+ topic_id required/,
      );
    });

    it("R12 throws on non-ISO due_at", () => {
      expect(() =>
        safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto", due_at: "May 1" }),
      ).toThrow(/due_at must be ISO date/);
    });
  });

  describe("recordCompletion", () => {
    it("sets status to completed + computes expires_at from OSHA default (LOTO=1y)", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      const done = safetyTrainingRecordEngine.recordCompletion({
        record_id: r.id,
        completed_at: "2026-01-01",
      });
      expect(done.status).toBe("completed");
      expect(done.completed_at).toBe("2026-01-01");
      // LOTO default = 365 days → expiry 2027-01-01
      expect(done.expires_at).toBe("2027-01-01");
    });

    it("respirator default = 365 days (§1910.134(k)(5) annual)", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "respirator" });
      const done = safetyTrainingRecordEngine.recordCompletion({ record_id: r.id, completed_at: "2026-01-01" });
      expect(done.expires_at).toBe("2027-01-01");
    });

    it("forklift default = 3 years (§1910.178(l)(4))", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "forklift" });
      const done = safetyTrainingRecordEngine.recordCompletion({ record_id: r.id, completed_at: "2026-01-01" });
      // 365 × 3 = 1095 days → 2028-12-31 (3y minus leap-rounding)
      expect(done.expires_at).toBe("2028-12-31");
    });

    it("expiration_days_override wins over topic default", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      const done = safetyTrainingRecordEngine.recordCompletion({
        record_id: r.id,
        completed_at: "2026-01-01",
        expiration_days_override: 30,
      });
      expect(done.expires_at).toBe("2026-01-31");
    });

    it("R12 throws on future completed_at", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      expect(() =>
        safetyTrainingRecordEngine.recordCompletion({ record_id: r.id, completed_at: "2099-01-01" }),
      ).toThrow(/cannot be in the future/);
    });

    it("R12 throws on non-ISO completed_at", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      expect(() =>
        safetyTrainingRecordEngine.recordCompletion({ record_id: r.id, completed_at: "Jan 1, 2026" }),
      ).toThrow(/must be ISO date/);
    });

    it("R12 throws on non-positive expiration_days_override", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      expect(() =>
        safetyTrainingRecordEngine.recordCompletion({
          record_id: r.id,
          completed_at: "2026-01-01",
          expiration_days_override: 0,
        }),
      ).toThrow(/expiration_days must be positive/);
    });

    it("R12 throws on unknown record_id", () => {
      expect(() =>
        safetyTrainingRecordEngine.recordCompletion({ record_id: "TRN-NOPE", completed_at: "2026-01-01" }),
      ).toThrow(/unknown record id/);
    });
  });

  describe("computeStatus — auto-detect expired/overdue", () => {
    it("detects expired when as_of > expires_at", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      safetyTrainingRecordEngine.recordCompletion({ record_id: r.id, completed_at: "2024-01-01" });
      const status = safetyTrainingRecordEngine.computeStatus({ record_id: r.id, as_of: "2026-05-25" });
      expect(status).toBe("expired");
    });

    it("detects overdue when assigned past due_at without completion", () => {
      const r = safetyTrainingRecordEngine.assignTraining({
        employee_id: "E",
        topic_id: "loto",
        due_at: "2024-01-01",
      });
      const status = safetyTrainingRecordEngine.computeStatus({ record_id: r.id, as_of: "2026-05-25" });
      expect(status).toBe("overdue");
    });

    it("keeps completed status when not expired", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      safetyTrainingRecordEngine.recordCompletion({ record_id: r.id, completed_at: "2026-01-01" });
      const status = safetyTrainingRecordEngine.computeStatus({ record_id: r.id, as_of: "2026-05-25" });
      expect(status).toBe("completed");
    });
  });

  describe("getEmployeeComplianceReport", () => {
    it("counts completed / overdue / expiring-soon for an employee", () => {
      const a = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      const b = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "hazcom" });
      const c = safetyTrainingRecordEngine.assignTraining({
        employee_id: "E",
        topic_id: "ppe",
        due_at: "2024-01-01",
      });
      safetyTrainingRecordEngine.recordCompletion({ record_id: a.id, completed_at: "2026-05-01" });
      safetyTrainingRecordEngine.recordCompletion({
        record_id: b.id,
        completed_at: "2024-01-01", // expires 2029-01-01 (5y) — not soon
      });
      const r = safetyTrainingRecordEngine.getEmployeeComplianceReport({
        employee_id: "E",
        as_of: "2026-05-25",
      });
      expect(r.total_topics).toBe(3);
      expect(r.completed).toBe(2);
      expect(r.overdue).toBe(1); // c is overdue (past due_at, never completed)
    });

    it("R12 throws on missing employee_id", () => {
      expect(() => safetyTrainingRecordEngine.getEmployeeComplianceReport({ employee_id: "" })).toThrow(
        /employee_id required/,
      );
    });
  });

  describe("listTopics — OSHA catalog", () => {
    it("returns 10 OSHA-recognized topics with defaults", () => {
      const topics = safetyTrainingRecordEngine.listTopics();
      expect(topics.length).toBeGreaterThanOrEqual(10);
      const loto = topics.find((t) => t.topic_id === "loto");
      expect(loto?.default_expiration_days).toBe(365);
      const forklift = topics.find((t) => t.topic_id === "forklift");
      expect(forklift?.default_expiration_days).toBe(1095);
    });

    it("listTopics is frozen", () => {
      expect(Object.isFrozen(safetyTrainingRecordEngine.listTopics())).toBe(true);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("all returns frozen", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "E", topic_id: "loto" });
      expect(Object.isFrozen(r)).toBe(true);
      const report = safetyTrainingRecordEngine.getEmployeeComplianceReport({ employee_id: "E" });
      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.records)).toBe(true);
    });

    it("PII-free — only employee_id (string)", () => {
      const r = safetyTrainingRecordEngine.assignTraining({ employee_id: "EMP-42", topic_id: "loto" });
      const keys = Object.keys(r);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });

  // U-HOTEL-OSHA-DASHBOARD (gap #5): the unfiltered all-records list that backs the OSHACompliancePage
  // training panel (which lists every employee's records, not one employee's).
  describe("listAllRecords", () => {
    it("returns EVERY record across employees, each decorated with live status + course_name (= topic_id)", () => {
      safetyTrainingRecordEngine.assignTraining({ employee_id: "EMP-A", topic_id: "loto" });
      safetyTrainingRecordEngine.assignTraining({ employee_id: "EMP-B", topic_id: "hazcom" });
      const { records } = safetyTrainingRecordEngine.listAllRecords();
      expect(records).toHaveLength(2);
      // every record carries a live status + the course_name alias the FE card reads
      for (const r of records) {
        expect(["assigned", "completed", "expired", "overdue"]).toContain(r.status);
        expect(r.course_name).toBe(r.topic_id);
      }
      // both employees' records are present (unfiltered, unlike getEmployeeComplianceReport)
      expect(records.map((r) => r.employee_id).sort()).toEqual(["EMP-A", "EMP-B"]);
    });

    it("decorates an overdue assigned record (due in the past) with status 'overdue'", () => {
      safetyTrainingRecordEngine.assignTraining({ employee_id: "EMP-OD", topic_id: "loto", due_at: "2020-01-01" });
      const { records } = safetyTrainingRecordEngine.listAllRecords({ as_of: "2026-06-24" });
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe("overdue");
    });

    it("R12 FAIL-CLOSED: empty store -> { records: [] } (no throw)", () => {
      expect(safetyTrainingRecordEngine.listAllRecords()).toEqual({ records: [] });
    });

    it("returns a frozen result + frozen records (matches getEmployeeComplianceReport convention)", () => {
      safetyTrainingRecordEngine.assignTraining({ employee_id: "EMP-F", topic_id: "loto" });
      const out = safetyTrainingRecordEngine.listAllRecords();
      expect(Object.isFrozen(out)).toBe(true);
      expect(Object.isFrozen(out.records)).toBe(true);
      expect(Object.isFrozen(out.records[0])).toBe(true);
    });
  });
});
