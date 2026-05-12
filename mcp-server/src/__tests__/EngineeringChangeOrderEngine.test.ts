import { describe, it, expect } from "vitest";
import { engineeringChangeOrderEngine } from "../engines/EngineeringChangeOrderEngine.js";

const NOW = "2026-04-16T00:00:00Z";
const FUTURE = "2026-05-01T00:00:00Z";
const PAST = "2026-01-01T00:00:00Z";

function approval(role: Parameters<typeof engineeringChangeOrderEngine.validate>[0]["record"]["approvals"][number]["role"], date = "2026-04-10") {
  return { role, approver: "Name", approved_date: date, esig_part11_compliant: true };
}

describe("EngineeringChangeOrderEngine", () => {
  it("Class I with all approvers ready to release", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "tolerance tightening",
        change_class: "I",
        regulated_industry: false,
        reason: "customer request",
        impact: [{ artifact_type: "drawing", artifact_id: "DR-100", current_rev: "A", new_rev: "B" }],
        approvals: [
          approval("engineering"),
          approval("quality"),
          approval("manufacturing"),
          approval("supply_chain"),
        ],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.ready_to_release).toBe(true);
    expect(r.missing_approvers).toHaveLength(0);
  });

  it("missing engineering approver flagged critical", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "I",
        regulated_industry: false,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [
          approval("quality"),
          approval("manufacturing"),
          approval("supply_chain"),
        ],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.missing_approvers).toContain("engineering");
    expect(r.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("Class II only needs engineering + quality", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "clarification",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.ready_to_release).toBe(true);
  });

  it("regulated industry adds regulatory approver", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: true,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.required_approvers).toContain("regulatory");
    expect(r.missing_approvers).toContain("regulatory");
  });

  it("non-Part11 esig flagged in regulated industry", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: true,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [
          { role: "engineering", approver: "A", approved_date: "2026-04-10", esig_part11_compliant: false },
          approval("quality"),
          approval("regulatory"),
        ],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.message.includes("Part 11"))).toBe(true);
  });

  it("empty impact list → critical finding", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "x",
        impact: [],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("same current/new rev is minor finding", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "A" }],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.severity === "minor" && f.message.includes("rev"))).toBe(true);
  });

  it("rework without rationale flagged", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [{ part_number: "P1", quantity: 10, disposition: "rework" }],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.message.includes("rework"))).toBe(true);
  });

  it("effectivity in past flagged major", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [],
        effectivity_date: PAST,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.effectivity_valid).toBe(false);
    expect(r.findings.some((f) => f.severity === "major" && f.message.includes("past"))).toBe(true);
  });

  it("config record open → minor finding + not ready", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [approval("engineering"), approval("quality")],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: false,
      },
      now: NOW,
    });
    expect(r.ready_to_release).toBe(false);
  });

  it("unsigned approver flagged", () => {
    const r = engineeringChangeOrderEngine.validate({
      record: {
        id: "ECO1",
        title: "x",
        change_class: "II",
        regulated_industry: false,
        reason: "x",
        impact: [{ artifact_type: "drawing", artifact_id: "DR1", current_rev: "A", new_rev: "B" }],
        approvals: [
          { role: "engineering", approver: "A" }, // no date
          approval("quality"),
        ],
        in_stock: [],
        effectivity_date: FUTURE,
        config_record_closed: true,
      },
      now: NOW,
    });
    expect(r.unsigned_approvers).toContain("engineering");
  });

  it("getStats returns approver roles", () => {
    const s = engineeringChangeOrderEngine.getStats();
    expect(s.approver_roles).toContain("engineering");
    expect(s.reference).toMatch(/EIA-649/);
  });
});
