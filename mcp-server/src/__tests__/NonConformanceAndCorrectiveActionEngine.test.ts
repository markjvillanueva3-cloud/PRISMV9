/**
 * NonConformanceAndCorrectiveActionEngine.test.ts — HOTEL/U-NONCONFORMANCE-CORRECTIVE-ACTION (iter23)
 *
 * ISO 9001:2015 §10.2 NC + 8D corrective action workflow tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { nonConformanceAndCorrectiveActionEngine } from "../engines/NonConformanceAndCorrectiveActionEngine.js";

const BASE_NC = {
  source: "customer_complaint" as const,
  severity: "major" as const,
  description: "Customer ALCOA-IND reports OD diameter 0.003 oversize on lot 2026-Q2-PT-014",
  reported_by_employee_id: "EMP-QA-LEAD",
};

describe("NonConformanceAndCorrectiveActionEngine", () => {
  beforeEach(() => nonConformanceAndCorrectiveActionEngine.reset());

  describe("recordNC — happy path + R12 validation", () => {
    it("creates open NC with auto-incremented ID", () => {
      const nc = nonConformanceAndCorrectiveActionEngine.recordNC(BASE_NC);
      expect(nc.id).toMatch(/^NCR-\d{6}$/);
      expect(nc.status).toBe("open");
      expect(nc.severity).toBe("major");
      expect(Object.isFrozen(nc)).toBe(true);
    });

    it("supports parent_audit_finding_id linkage to InternalAuditCalendarEngine", () => {
      const nc = nonConformanceAndCorrectiveActionEngine.recordNC({
        ...BASE_NC,
        source: "internal_audit",
        parent_audit_finding_id: "FIND-000003",
        clause_reference: "8.4.1",
      });
      expect(nc.parent_audit_finding_id).toBe("FIND-000003");
      expect(nc.clause_reference).toBe("8.4.1");
    });

    it("R12 throws on short description", () => {
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, description: "bad" }),
      ).toThrow(/description \(≥10 chars\) required/);
    });

    it("R12 throws on invalid source enum", () => {
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.recordNC({
          ...BASE_NC,
          source: "alien_invasion" as never,
        }),
      ).toThrow(/invalid source/);
    });

    it("R12 throws on invalid severity", () => {
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.recordNC({
          ...BASE_NC,
          severity: "catastrophic" as never,
        }),
      ).toThrow(/invalid severity/);
    });

    it("R12 throws on negative cost_impact", () => {
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, cost_impact_cents: -100 }),
      ).toThrow(/cost_impact_cents must be non-negative/);
    });
  });

  describe("8D lifecycle — full happy path", () => {
    it("open → contained → in_root_cause → in_corrective_action → verified → closed", () => {
      const nc0 = nonConformanceAndCorrectiveActionEngine.recordNC(BASE_NC);
      expect(nc0.status).toBe("open");

      const nc1 = nonConformanceAndCorrectiveActionEngine.recordContainment({
        ncr_id: nc0.id,
        team_members: ["EMP-QA-LEAD", "EMP-PROCESS-ENG", "EMP-OPS-MGR"],
        problem_definition: "0.003 oversize on 4 of 50 parts in lot 2026-Q2-PT-014",
        containment_action: "Quarantine remaining 46 parts; 100% inspect; segregate suspect tools",
      });
      expect(nc1.status).toBe("contained");
      expect(nc1.d3_contained_at).not.toBeNull();
      expect(nc1.d1_team_members).toHaveLength(3);

      const nc2 = nonConformanceAndCorrectiveActionEngine.recordRootCause({
        ncr_id: nc0.id,
        root_cause: "Tool offset table not updated after grinding wheel dress; G54 Z drift +0.003",
      });
      expect(nc2.status).toBe("in_root_cause");
      expect(nc2.d4_root_cause).toContain("Tool offset table");

      const nc3 = nonConformanceAndCorrectiveActionEngine.recordCorrectiveAction({
        ncr_id: nc0.id,
        corrective_action: "Add post-dress offset-verification checklist gate to setup-sheet template",
        planned_due_date: "2026-06-30",
        implemented_at: "2026-06-15T12:00:00Z",
      });
      expect(nc3.status).toBe("in_corrective_action");
      expect(nc3.d5_planned_due_date).toBe("2026-06-30");

      const nc4 = nonConformanceAndCorrectiveActionEngine.recordVerification({
        ncr_id: nc0.id,
        prevention_measures: "Updated SOP-014 + added training module; 0 recurrences in 60 days",
        verification_evidence: "SPC chart 2026-07 + audit-finding-FIND-000007 cleared",
        effectiveness_score: 0.92,
      });
      expect(nc4.status).toBe("verified");
      expect(nc4.d8_effectiveness_score).toBe(0.92);

      const nc5 = nonConformanceAndCorrectiveActionEngine.closeNC({ ncr_id: nc0.id });
      expect(nc5.status).toBe("closed");
      expect(nc5.closed_at).not.toBeNull();
    });

    it("R12 — recordContainment refuses NC not in 'open' state", () => {
      const nc = nonConformanceAndCorrectiveActionEngine.recordNC(BASE_NC);
      nonConformanceAndCorrectiveActionEngine.recordContainment({
        ncr_id: nc.id,
        team_members: ["EMP-X"],
        problem_definition: "Defined problem here",
        containment_action: "Contained the problem",
      });
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.recordContainment({
          ncr_id: nc.id,
          team_members: ["EMP-Y"],
          problem_definition: "Repeat attempt",
          containment_action: "Repeat attempt",
        }),
      ).toThrow(/NC must be 'open'/);
    });

    it("R12 — recordVerification rejects effectiveness_score > 1", () => {
      const nc0 = nonConformanceAndCorrectiveActionEngine.recordNC(BASE_NC);
      const nc1 = nonConformanceAndCorrectiveActionEngine.recordContainment({
        ncr_id: nc0.id,
        team_members: ["EMP-X"],
        problem_definition: "OK problem definition",
        containment_action: "OK containment action",
      });
      nonConformanceAndCorrectiveActionEngine.recordRootCause({
        ncr_id: nc1.id,
        root_cause: "Tool offset table not updated after grind dress",
      });
      nonConformanceAndCorrectiveActionEngine.recordCorrectiveAction({
        ncr_id: nc1.id,
        corrective_action: "Add verification checklist gate to setup-sheet",
        planned_due_date: "2026-06-30",
      });
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.recordVerification({
          ncr_id: nc1.id,
          prevention_measures: "Updated SOP + training",
          verification_evidence: "SPC chart clean",
          effectiveness_score: 1.5,
        }),
      ).toThrow(/effectiveness_score must be in/);
    });

    it("R12 — closeNC refuses effectiveness_score < 0.70 (§10.2.1(d))", () => {
      const nc0 = nonConformanceAndCorrectiveActionEngine.recordNC(BASE_NC);
      const nc1 = nonConformanceAndCorrectiveActionEngine.recordContainment({
        ncr_id: nc0.id,
        team_members: ["EMP-X"],
        problem_definition: "OK definition",
        containment_action: "Containment OK",
      });
      nonConformanceAndCorrectiveActionEngine.recordRootCause({
        ncr_id: nc1.id,
        root_cause: "Cause discovered",
      });
      nonConformanceAndCorrectiveActionEngine.recordCorrectiveAction({
        ncr_id: nc1.id,
        corrective_action: "Action taken",
        planned_due_date: "2026-06-30",
      });
      nonConformanceAndCorrectiveActionEngine.recordVerification({
        ncr_id: nc1.id,
        prevention_measures: "Prevention measures",
        verification_evidence: "Evidence here",
        effectiveness_score: 0.55, // below 0.70 threshold
      });
      expect(() =>
        nonConformanceAndCorrectiveActionEngine.closeNC({ ncr_id: nc1.id }),
      ).toThrow(/effectiveness_score .* < 0\.70 — re-open/);
    });
  });

  describe("Variability — all 6 sources + all 3 severities", () => {
    it("records NCs from all 6 source enums", () => {
      const sources: Array<"customer_complaint" | "internal_audit" | "external_audit" | "supplier" | "internal_inspection" | "process_excursion"> = [
        "customer_complaint",
        "internal_audit",
        "external_audit",
        "supplier",
        "internal_inspection",
        "process_excursion",
      ];
      for (const src of sources) {
        nonConformanceAndCorrectiveActionEngine.recordNC({
          ...BASE_NC,
          source: src,
          description: `${src} NC description text here`,
        });
      }
      const summary = nonConformanceAndCorrectiveActionEngine.managementReviewSummary();
      expect(summary.total_ncs).toBe(6);
      for (const src of sources) {
        expect(summary.by_source[src]).toBe(1);
      }
    });

    it("records NCs at all 3 severities", () => {
      nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, severity: "critical" });
      nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, severity: "major" });
      nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, severity: "minor" });
      const summary = nonConformanceAndCorrectiveActionEngine.managementReviewSummary();
      expect(summary.by_severity.critical).toBe(1);
      expect(summary.by_severity.major).toBe(1);
      expect(summary.by_severity.minor).toBe(1);
    });
  });

  describe("managementReviewSummary — §9.3.2(c) input shape", () => {
    it("aggregates open/closed/cost across mixed NCs", () => {
      const a = nonConformanceAndCorrectiveActionEngine.recordNC({
        ...BASE_NC,
        cost_impact_cents: 250000,
      });
      const b = nonConformanceAndCorrectiveActionEngine.recordNC({
        ...BASE_NC,
        severity: "minor",
        cost_impact_cents: 5000,
      });
      // Close a
      nonConformanceAndCorrectiveActionEngine.recordContainment({
        ncr_id: a.id,
        team_members: ["EMP-X"],
        problem_definition: "Problem definition here",
        containment_action: "Containment action here",
      });
      nonConformanceAndCorrectiveActionEngine.recordRootCause({
        ncr_id: a.id,
        root_cause: "Root cause here",
      });
      nonConformanceAndCorrectiveActionEngine.recordCorrectiveAction({
        ncr_id: a.id,
        corrective_action: "Corrective action here",
        planned_due_date: "2026-06-30",
      });
      nonConformanceAndCorrectiveActionEngine.recordVerification({
        ncr_id: a.id,
        prevention_measures: "Prevention measures here",
        verification_evidence: "Evidence here",
        effectiveness_score: 0.85,
      });
      nonConformanceAndCorrectiveActionEngine.closeNC({ ncr_id: a.id });

      const summary = nonConformanceAndCorrectiveActionEngine.managementReviewSummary();
      expect(summary.total_ncs).toBe(2);
      expect(summary.closed_count).toBe(1);
      expect(summary.open_count).toBe(1);
      expect(summary.total_cost_impact_cents).toBe(255000);
      expect(summary.avg_effectiveness_score).toBe(0.85);
    });

    it("returns zero-shape summary when no NCs", () => {
      const summary = nonConformanceAndCorrectiveActionEngine.managementReviewSummary();
      expect(summary.total_ncs).toBe(0);
      expect(summary.avg_effectiveness_score).toBe(0);
      expect(summary.total_cost_impact_cents).toBe(0);
    });
  });

  describe("listNCs — query surface", () => {
    it("filters by status, severity, source", () => {
      nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, severity: "critical" });
      nonConformanceAndCorrectiveActionEngine.recordNC({ ...BASE_NC, severity: "minor" });
      nonConformanceAndCorrectiveActionEngine.recordNC({
        ...BASE_NC,
        source: "supplier",
        severity: "major",
      });
      const critical = nonConformanceAndCorrectiveActionEngine.listNCs({ severity: "critical" });
      expect(critical).toHaveLength(1);
      const supplier = nonConformanceAndCorrectiveActionEngine.listNCs({ source: "supplier" });
      expect(supplier).toHaveLength(1);
      const open = nonConformanceAndCorrectiveActionEngine.listNCs({ status: "open" });
      expect(open).toHaveLength(3);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned NC + arrays are frozen", () => {
      const nc = nonConformanceAndCorrectiveActionEngine.recordNC({
        ...BASE_NC,
        affected_job_ids: ["JOB-001", "JOB-002"],
      });
      expect(Object.isFrozen(nc)).toBe(true);
      expect(Object.isFrozen(nc.affected_job_ids)).toBe(true);
    });

    it("PII-free — only employee_id, no names/SSN", () => {
      const nc = nonConformanceAndCorrectiveActionEngine.recordNC(BASE_NC);
      const keys = Object.keys(nc);
      expect(keys).not.toContain("reporter_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });
});
