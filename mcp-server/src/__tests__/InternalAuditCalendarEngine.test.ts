/**
 * InternalAuditCalendarEngine.test.ts — HOTEL/U-INTERNAL-AUDIT-CALENDAR (iter14)
 *
 * ISO 9001:2015 §9.2 internal audit scheduling tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { internalAuditCalendarEngine } from "../engines/InternalAuditCalendarEngine.js";

const BASE_AUDIT = {
  scope: "Purchasing process audit (§8.4)",
  clauses_in_scope: ["8.4", "8.4.1", "8.4.2"],
  processes_in_scope: ["supplier_evaluation", "purchase_order_creation"],
  scheduled_for: "2026-06-15",
  lead_auditor_id: "EMP-AUDITOR-01",
  auditees_employee_ids: ["EMP-PURCH-LEAD", "EMP-PURCH-CLERK"],
};

describe("InternalAuditCalendarEngine", () => {
  beforeEach(() => internalAuditCalendarEngine.reset());

  describe("scheduleAudit — happy path", () => {
    it("creates a scheduled audit with frozen record", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      expect(a.id).toMatch(/^AUDIT-\d{6}$/);
      expect(a.status).toBe("scheduled");
      expect(a.started_at).toBeNull();
      expect(a.completed_at).toBeNull();
      expect(a.findings).toHaveLength(0);
      expect(Object.isFrozen(a)).toBe(true);
      expect(Object.isFrozen(a.clauses_in_scope)).toBe(true);
    });

    it("preserves all clauses + processes", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      expect(a.clauses_in_scope).toEqual(["8.4", "8.4.1", "8.4.2"]);
      expect(a.processes_in_scope).toEqual(["supplier_evaluation", "purchase_order_creation"]);
    });

    it("auto-increments audit IDs", () => {
      const a1 = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      const a2 = internalAuditCalendarEngine.scheduleAudit({
        ...BASE_AUDIT,
        lead_auditor_id: "EMP-AUDITOR-02",
        auditees_employee_ids: ["EMP-OTHER"],
      });
      expect(a1.id).toBe("AUDIT-000001");
      expect(a2.id).toBe("AUDIT-000002");
    });
  });

  describe("scheduleAudit — R12 fail-loud + independence rule", () => {
    it("throws when lead_auditor is also an auditee (§9.2 independence)", () => {
      expect(() =>
        internalAuditCalendarEngine.scheduleAudit({
          ...BASE_AUDIT,
          lead_auditor_id: "EMP-X",
          auditees_employee_ids: ["EMP-X", "EMP-Y"],
        }),
      ).toThrow(/independence violation/);
    });

    it("throws on empty clauses_in_scope", () => {
      expect(() =>
        internalAuditCalendarEngine.scheduleAudit({ ...BASE_AUDIT, clauses_in_scope: [] }),
      ).toThrow(/clauses_in_scope must be non-empty array/);
    });

    it("throws on malformed scheduled_for date", () => {
      expect(() =>
        internalAuditCalendarEngine.scheduleAudit({ ...BASE_AUDIT, scheduled_for: "June 15, 2026" }),
      ).toThrow(/scheduled_for must be ISO date YYYY-MM-DD/);
    });

    it("throws on missing scope or lead_auditor", () => {
      expect(() =>
        internalAuditCalendarEngine.scheduleAudit({ ...BASE_AUDIT, scope: "" }),
      ).toThrow(/scope \+ lead_auditor_id required/);
    });
  });

  describe("Audit lifecycle: schedule → start → record findings → complete", () => {
    it("full happy path with all 4 finding severities", () => {
      const a0 = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      const a1 = internalAuditCalendarEngine.startAudit({ audit_id: a0.id });
      expect(a1.status).toBe("in_progress");
      expect(a1.started_at).not.toBeNull();

      const major = internalAuditCalendarEngine.recordFinding({
        audit_id: a0.id,
        severity: "major",
        clause_reference: "8.4.1",
        description: "No documented supplier evaluation criteria for critical-process suppliers",
      });
      const minor = internalAuditCalendarEngine.recordFinding({
        audit_id: a0.id,
        severity: "minor",
        clause_reference: "8.4.2",
        description: "PO acknowledgements not retained for 2 of 12 sampled orders",
      });
      const obs = internalAuditCalendarEngine.recordFinding({
        audit_id: a0.id,
        severity: "observation",
        clause_reference: "8.4",
        description: "Supplier ratings spreadsheet manually maintained — risk of error",
      });
      const ofi = internalAuditCalendarEngine.recordFinding({
        audit_id: a0.id,
        severity: "opportunity_for_improvement",
        clause_reference: "8.4.1",
        description: "Consider automating supplier scorecard via ERP",
      });

      expect([major.severity, minor.severity, obs.severity, ofi.severity]).toEqual([
        "major",
        "minor",
        "observation",
        "opportunity_for_improvement",
      ]);

      // All findings attached to audit
      const auditAfter = internalAuditCalendarEngine.getAudit(a0.id);
      expect(auditAfter?.findings).toHaveLength(4);

      const completed = internalAuditCalendarEngine.completeAudit({
        audit_id: a0.id,
        report_ref: "AUDIT-REPORT-2026-Q2-PURCH.pdf",
      });
      expect(completed.status).toBe("completed");
      expect(completed.completed_at).not.toBeNull();
      expect(completed.report_ref).toBe("AUDIT-REPORT-2026-Q2-PURCH.pdf");
    });

    it("R12 forbids recordFinding on scheduled (not-yet-started) audit", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      expect(() =>
        internalAuditCalendarEngine.recordFinding({
          audit_id: a.id,
          severity: "minor",
          clause_reference: "8.4",
          description: "Too early — cannot record before start",
        }),
      ).toThrow(/audit must be 'in_progress' or 'completed'/);
    });

    it("R12 forbids starting an already-in-progress audit", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a.id });
      expect(() => internalAuditCalendarEngine.startAudit({ audit_id: a.id })).toThrow(
        /audit must be 'scheduled'/,
      );
    });

    it("R12 forbids invalid severity", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a.id });
      expect(() =>
        internalAuditCalendarEngine.recordFinding({
          audit_id: a.id,
          severity: "critical" as never,
          clause_reference: "8.4",
          description: "Wrong severity literal",
        }),
      ).toThrow(/severity must be one of/);
    });

    it("R12 requires description ≥5 chars", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a.id });
      expect(() =>
        internalAuditCalendarEngine.recordFinding({
          audit_id: a.id,
          severity: "minor",
          clause_reference: "8.4",
          description: "tl",
        }),
      ).toThrow(/clause_reference \+ description/);
    });
  });

  describe("closeFinding — corrective-action tracking", () => {
    it("closes a finding with corrective_action_ref and timestamps it", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a.id });
      const f = internalAuditCalendarEngine.recordFinding({
        audit_id: a.id,
        severity: "major",
        clause_reference: "8.4.1",
        description: "Missing supplier evaluation criteria",
      });
      const closed = internalAuditCalendarEngine.closeFinding({
        finding_id: f.id,
        corrective_action_ref: "CAR-2026-014",
      });
      expect(closed.closed_at).not.toBeNull();
      expect(closed.corrective_action_ref).toBe("CAR-2026-014");
      // Audit's findings array reflects the close
      const auditAfter = internalAuditCalendarEngine.getAudit(a.id);
      expect(auditAfter?.findings[0].closed_at).not.toBeNull();
    });

    it("R12 throws on unknown finding_id", () => {
      expect(() =>
        internalAuditCalendarEngine.closeFinding({ finding_id: "NOPE", corrective_action_ref: "CAR-1" }),
      ).toThrow(/unknown finding_id/);
    });

    it("R12 requires corrective_action_ref", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a.id });
      const f = internalAuditCalendarEngine.recordFinding({
        audit_id: a.id,
        severity: "minor",
        clause_reference: "8.4",
        description: "Some minor gap",
      });
      expect(() =>
        internalAuditCalendarEngine.closeFinding({ finding_id: f.id, corrective_action_ref: "" }),
      ).toThrow(/corrective_action_ref required/);
    });
  });

  describe("Calendar queries", () => {
    it("listOverdue returns scheduled audits past their date", () => {
      internalAuditCalendarEngine.scheduleAudit({
        ...BASE_AUDIT,
        scope: "Past-due audit",
        scheduled_for: "2025-01-15",
      });
      internalAuditCalendarEngine.scheduleAudit({
        ...BASE_AUDIT,
        scope: "Future audit",
        scheduled_for: "2099-01-15",
        lead_auditor_id: "EMP-OTHER",
        auditees_employee_ids: ["EMP-Z"],
      });
      const overdue = internalAuditCalendarEngine.listOverdue({ as_of: "2026-05-25" });
      expect(overdue).toHaveLength(1);
      expect(overdue[0].scope).toBe("Past-due audit");
    });

    it("listByStatus filters correctly", () => {
      const a0 = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a0.id });
      const scheduled = internalAuditCalendarEngine.listByStatus("scheduled");
      const inProg = internalAuditCalendarEngine.listByStatus("in_progress");
      expect(scheduled).toHaveLength(0);
      expect(inProg).toHaveLength(1);
    });
  });

  describe("annualCoverage — §9.2 coverage report", () => {
    it("aggregates clauses audited in the last 12 months", () => {
      const a0 = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      internalAuditCalendarEngine.startAudit({ audit_id: a0.id });
      internalAuditCalendarEngine.completeAudit({ audit_id: a0.id });

      const a1 = internalAuditCalendarEngine.scheduleAudit({
        ...BASE_AUDIT,
        scope: "Operations §8 audit",
        clauses_in_scope: ["8.1", "8.2", "8.5"],
        lead_auditor_id: "EMP-AUD-2",
        auditees_employee_ids: ["EMP-OPS"],
      });
      internalAuditCalendarEngine.startAudit({ audit_id: a1.id });
      internalAuditCalendarEngine.completeAudit({ audit_id: a1.id });

      const coverage = internalAuditCalendarEngine.annualCoverage();
      expect(coverage.coverage_count).toBeGreaterThanOrEqual(5);
      expect(coverage.clauses_audited).toEqual(
        expect.arrayContaining(["8.1", "8.2", "8.4", "8.4.1", "8.4.2", "8.5"]),
      );
    });

    it("returns empty coverage when no completed audits", () => {
      const c = internalAuditCalendarEngine.annualCoverage();
      expect(c.coverage_count).toBe(0);
      expect(c.clauses_audited).toHaveLength(0);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned audit + nested arrays are frozen", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      expect(Object.isFrozen(a)).toBe(true);
      expect(Object.isFrozen(a.clauses_in_scope)).toBe(true);
      expect(Object.isFrozen(a.processes_in_scope)).toBe(true);
      expect(Object.isFrozen(a.auditees_employee_ids)).toBe(true);
      expect(Object.isFrozen(a.findings)).toBe(true);
    });

    it("PII-free — only employee_id strings, no PII surnames", () => {
      const a = internalAuditCalendarEngine.scheduleAudit(BASE_AUDIT);
      const keys = Object.keys(a);
      expect(keys).not.toContain("auditor_name");
      expect(keys).not.toContain("auditee_names");
      expect(keys).not.toContain("ssn");
    });
  });
});
