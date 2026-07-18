/**
 * ManagementReviewEngine.test.ts — HOTEL/U-MANAGEMENT-REVIEW (iter14)
 *
 * ISO 9001:2015 §9.3 management review tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { managementReviewEngine } from "../engines/ManagementReviewEngine.js";

const BASE = {
  scheduled_for: "2026-06-30",
  chair_employee_id: "EMP-CEO",
  attendees_employee_ids: ["EMP-COO", "EMP-QM", "EMP-OPS-MGR"],
};

describe("ManagementReviewEngine", () => {
  beforeEach(() => managementReviewEngine.reset());

  describe("scheduleReview — happy path", () => {
    it("creates scheduled review with frozen record", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      expect(r.id).toMatch(/^MR-\d{6}$/);
      expect(r.status).toBe("scheduled");
      expect(r.convened_at).toBeNull();
      expect(r.completed_at).toBeNull();
      expect(r.attendees_employee_ids).toHaveLength(3);
      expect(Object.isFrozen(r)).toBe(true);
    });

    it("auto-increments review IDs", () => {
      const r1 = managementReviewEngine.scheduleReview(BASE);
      const r2 = managementReviewEngine.scheduleReview(BASE);
      expect(r1.id).toBe("MR-000001");
      expect(r2.id).toBe("MR-000002");
    });

    it("R12 requires ≥2 attendees (top-mgmt is not solo)", () => {
      expect(() =>
        managementReviewEngine.scheduleReview({ ...BASE, attendees_employee_ids: ["EMP-CEO"] }),
      ).toThrow(/≥2 attendees required/);
    });

    it("R12 throws on missing chair", () => {
      expect(() =>
        managementReviewEngine.scheduleReview({ ...BASE, chair_employee_id: "" }),
      ).toThrow(/chair_employee_id required/);
    });

    it("R12 throws on malformed date", () => {
      expect(() =>
        managementReviewEngine.scheduleReview({ ...BASE, scheduled_for: "June 30" }),
      ).toThrow(/scheduled_for must be ISO/);
    });
  });

  describe("Lifecycle: schedule → convene → record inputs/outputs → complete", () => {
    it("full happy path covering all 12 ISO §9.3.2 inputs", () => {
      const r0 = managementReviewEngine.scheduleReview(BASE);
      const r1 = managementReviewEngine.convene({ review_id: r0.id });
      expect(r1.status).toBe("convened");
      expect(r1.convened_at).not.toBeNull();

      // §9.3.2 — record all input summaries
      managementReviewEngine.recordInputs({
        review_id: r0.id,
        inputs: {
          prior_action_status_summary: "8/10 prior actions closed; 2 deferred to Q3",
          context_changes_summary: "ITAR scope expanded; new EV battery customer onboarded",
          customer_satisfaction_summary: "NPS 67 (↑5 YoY); 3 returns out of 1,247 ship lots",
          objective_attainment_summary: "On-time delivery 94% (target 95%) — slight miss",
          process_performance_summary: "Setup time -18%; OEE 71% (target 70%)",
          nonconformity_summary: "4 NCs raised, 4 corrective actions closed; 0 repeat",
          monitoring_results_summary: "SPC Cpk avg 1.45 across 22 critical features",
          audit_results_summary: "1 major + 3 minor + 2 OFIs from Q1 internal audit",
          supplier_performance_summary: "Critical-supplier on-time 92%; 1 supplier on probation",
          resource_adequacy_summary: "CNC capacity at 89%; need +1 wire-EDM in Q3",
          risk_opportunity_summary: "Top risk: skilled-labor pipeline; mitigated via apprenticeship",
          improvement_opportunities_summary: "Adaptive S/F deployment + auto-quote pilot",
        },
      });

      // §9.3.3 — record outputs in all 3 mandatory categories
      managementReviewEngine.recordOutput({
        review_id: r0.id,
        category: "improvement_decisions",
        decision: "Approve adaptive S/F rollout to 3 pilot machines in Q3",
      });
      managementReviewEngine.recordOutput({
        review_id: r0.id,
        category: "qms_change_needs",
        decision: "Update §7.5 doc-control SOP to include adaptive-algorithm version tracking",
      });
      managementReviewEngine.recordOutput({
        review_id: r0.id,
        category: "resource_needs",
        decision: "Capex approved for +1 wire-EDM machine ($180K) and 2 apprentice hires",
      });

      const completed = managementReviewEngine.completeReview({
        review_id: r0.id,
        meeting_minutes_ref: "MR-2026-Q2-MINUTES.pdf",
      });
      expect(completed.status).toBe("completed");
      expect(completed.completed_at).not.toBeNull();
      expect(completed.meeting_minutes_ref).toBe("MR-2026-Q2-MINUTES.pdf");
      // All 12 inputs recorded
      const inputKeys = Object.keys(completed.inputs);
      expect(inputKeys.length).toBeGreaterThanOrEqual(12);
    });

    it("R12 close-out refuses when improvement_decisions empty (§9.3.3(a))", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      managementReviewEngine.convene({ review_id: r.id });
      managementReviewEngine.recordOutput({
        review_id: r.id,
        category: "qms_change_needs",
        decision: "Update SOP-001 review cadence",
      });
      managementReviewEngine.recordOutput({
        review_id: r.id,
        category: "resource_needs",
        decision: "Hire 1 QC inspector",
      });
      expect(() => managementReviewEngine.completeReview({ review_id: r.id })).toThrow(
        /§9.3.3\(a\) requires ≥1 improvement_decisions/,
      );
    });

    it("R12 close-out refuses when resource_needs empty (§9.3.3(c))", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      managementReviewEngine.convene({ review_id: r.id });
      managementReviewEngine.recordOutput({
        review_id: r.id,
        category: "improvement_decisions",
        decision: "Pilot adaptive S/F on 3 mills",
      });
      managementReviewEngine.recordOutput({
        review_id: r.id,
        category: "qms_change_needs",
        decision: "Add adaptive-algorithm version control to §7.5",
      });
      expect(() => managementReviewEngine.completeReview({ review_id: r.id })).toThrow(
        /§9.3.3\(c\) requires ≥1 resource_needs/,
      );
    });

    it("R12 cannot complete a not-yet-convened review", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      expect(() => managementReviewEngine.completeReview({ review_id: r.id })).toThrow(
        /review must be 'convened'/,
      );
    });
  });

  describe("Action items — §9.3.3 follow-through tracking", () => {
    it("adds, updates, and closes an action item with evidence", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      managementReviewEngine.convene({ review_id: r.id });
      const ai = managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Procure 2nd wire-EDM machine; vendor selection by 2026-08-15",
        owner_employee_id: "EMP-OPS-MGR",
        due_date: "2026-08-15",
      });
      expect(ai.id).toMatch(/^MRA-\d{6}$/);
      expect(ai.status).toBe("open");
      const progressed = managementReviewEngine.updateActionItem({
        action_id: ai.id,
        status: "in_progress",
      });
      expect(progressed.status).toBe("in_progress");
      const closed = managementReviewEngine.updateActionItem({
        action_id: ai.id,
        status: "completed",
        closure_evidence: "PO-2026-0847 issued to Sodick; delivery 2026-09-12",
      });
      expect(closed.status).toBe("completed");
      expect(closed.closed_at).not.toBeNull();
      expect(closed.closure_evidence).toBe("PO-2026-0847 issued to Sodick; delivery 2026-09-12");
    });

    it("R12 requires closure_evidence on completion", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      managementReviewEngine.convene({ review_id: r.id });
      const ai = managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Test action",
        owner_employee_id: "EMP-X",
        due_date: "2026-12-31",
      });
      expect(() =>
        managementReviewEngine.updateActionItem({ action_id: ai.id, status: "completed" }),
      ).toThrow(/closure_evidence required/);
    });

    it("listOverdueActionItems finds past-due opens", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      managementReviewEngine.convene({ review_id: r.id });
      managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Past-due action",
        owner_employee_id: "EMP-X",
        due_date: "2025-01-15",
      });
      managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Future action",
        owner_employee_id: "EMP-Y",
        due_date: "2099-01-15",
      });
      const overdue = managementReviewEngine.listOverdueActionItems({ as_of: "2026-05-25" });
      expect(overdue).toHaveLength(1);
      expect(overdue[0].description).toBe("Past-due action");
    });
  });

  describe("priorReviewActionStatus — §9.3.2(a) input", () => {
    it("counts by status accurately across mixed actions", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      managementReviewEngine.convene({ review_id: r.id });
      const a1 = managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Action 1",
        owner_employee_id: "EMP-A",
        due_date: "2026-09-01",
      });
      const a2 = managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Action 2",
        owner_employee_id: "EMP-B",
        due_date: "2026-09-01",
      });
      const a3 = managementReviewEngine.addActionItem({
        review_id: r.id,
        description: "Action 3",
        owner_employee_id: "EMP-C",
        due_date: "2026-09-01",
      });
      managementReviewEngine.updateActionItem({
        action_id: a1.id,
        status: "completed",
        closure_evidence: "Done",
      });
      managementReviewEngine.updateActionItem({ action_id: a2.id, status: "in_progress" });
      managementReviewEngine.updateActionItem({ action_id: a3.id, status: "deferred" });
      const stat = managementReviewEngine.priorReviewActionStatus(r.id);
      expect(stat.total_actions).toBe(3);
      expect(stat.completed).toBe(1);
      expect(stat.in_progress).toBe(1);
      expect(stat.deferred).toBe(1);
      expect(stat.open).toBe(0);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned reviews + nested arrays are frozen", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.attendees_employee_ids)).toBe(true);
      expect(Object.isFrozen(r.outputs)).toBe(true);
      expect(Object.isFrozen(r.outputs.improvement_decisions)).toBe(true);
      expect(Object.isFrozen(r.action_items)).toBe(true);
    });

    it("PII-free — only employee_id strings, no PII surnames", () => {
      const r = managementReviewEngine.scheduleReview(BASE);
      const keys = Object.keys(r);
      expect(keys).not.toContain("chair_name");
      expect(keys).not.toContain("attendee_names");
      expect(keys).not.toContain("ssn");
    });
  });
});
