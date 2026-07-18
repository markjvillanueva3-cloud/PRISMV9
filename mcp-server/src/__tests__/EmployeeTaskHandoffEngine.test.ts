/**
 * EmployeeTaskHandoffEngine — covers happy path, same-rank manager-bypass,
 * cross-rank manager-required path, counterparty refusal (Lean R7 overload),
 * skill-match gate, segregation-of-duties, andon stall-watch, waste summary.
 *
 * Variability ≥17 cases · ≥5 R12 fail-loud modes.
 *
 * @module EmployeeTaskHandoffEngine.test
 * @milestone HOTEL/U-EMPLOYEE-TASK-HANDOFF (2026-05-26, slot:hotel)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  employeeTaskHandoffEngine,
  type TaskDescriptor,
} from "../engines/EmployeeTaskHandoffEngine.js";

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const taskOnHaas5: TaskDescriptor = {
  task_id: "TASK-0001",
  task_kind: "timeclock",
  machine_serial: "HAAS-VF5-001",
  label: "rough impeller blade",
  remaining_minutes: 45,
};

const taskOnOkumaL3: TaskDescriptor = {
  task_id: "TASK-0002",
  task_kind: "work_order",
  machine_serial: "OKUMA-LB3000-001",
  remaining_minutes: 30,
};

function seedRoster() {
  employeeTaskHandoffEngine.registerRank({ employee_id: "EMP-001", rank: "operator" });
  employeeTaskHandoffEngine.registerRank({ employee_id: "EMP-002", rank: "operator" });
  employeeTaskHandoffEngine.registerRank({ employee_id: "EMP-003", rank: "lead" });
  employeeTaskHandoffEngine.registerRank({ employee_id: "EMP-004", rank: "operator" });
  employeeTaskHandoffEngine.registerRank({ employee_id: "MGR-001", rank: "supervisor" });
  employeeTaskHandoffEngine.registerRank({ employee_id: "EMP-005", rank: "lead" });
}

function seedQuals() {
  employeeTaskHandoffEngine.registerMachineQualification({
    machine_serial: "HAAS-VF5-001",
    required_course_ids: ["CRS-MILL-101", "CRS-MILL-FUSION"],
  });
  employeeTaskHandoffEngine.registerMachineQualification({
    machine_serial: "OKUMA-LB3000-001",
    required_course_ids: ["CRS-LATHE-201"],
  });
  // EMP-001 qualified on both machines
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-001", course_id: "CRS-MILL-101" });
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-001", course_id: "CRS-MILL-FUSION" });
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-001", course_id: "CRS-LATHE-201" });
  // EMP-002 operator, qualified for HAAS-VF5 (the bypass-eligible peer)
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-002", course_id: "CRS-MILL-101" });
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-002", course_id: "CRS-MILL-FUSION" });
  // EMP-003 lead, qualified for HAAS-VF5
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-003", course_id: "CRS-MILL-101" });
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-003", course_id: "CRS-MILL-FUSION" });
  // EMP-004 operator, UNQUALIFIED for HAAS-VF5 (missing CRS-MILL-FUSION)
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-004", course_id: "CRS-MILL-101" });
  // EMP-005 lead, qualified for HAAS-VF5
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-005", course_id: "CRS-MILL-101" });
  employeeTaskHandoffEngine.registerCoursePassed({ employee_id: "EMP-005", course_id: "CRS-MILL-FUSION" });
}

describe("EmployeeTaskHandoffEngine", () => {
  beforeEach(() => {
    employeeTaskHandoffEngine.reset();
    seedRoster();
    seedQuals();
  });

  it("proposes a handoff and snapshots both ranks", () => {
    const r = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
      reason: "going on break",
    });
    expect(r.status).toBe("proposed");
    expect(r.id).toMatch(/^HANDOFF-\d{6}$/);
    expect(r.requester_rank).toBe("operator");
    expect(r.counterparty_rank).toBe("operator");
    expect(r.bypassed_manager).toBe(false);
    expect(r.created_at).toMatch(ISO8601_RE);
    expect(r.task.machine_serial).toBe("HAAS-VF5-001");
    expect(r.task.remaining_minutes).toBe(45);
    expect(r.task.task_kind).toBe("timeclock");
    expect(r.audit_trail).toHaveLength(1);
    expect(r.audit_trail[0]?.note).toBe("going on break");
    expect(r.audit_trail[0]?.by_employee_id).toBe("EMP-001");
    expect(r.audit_trail[0]?.from).toBe("proposed");
    expect(r.audit_trail[0]?.to).toBe("proposed");
    // Frozen — mutation throws in strict mode
    expect(() => {
      (r as { status: string }).status = "executed";
    }).toThrow();
  });

  it("SAME-RANK MANAGER-BYPASS: peer-accept fast-paths straight to executed", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    const after = employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-002",
      accept: true,
    });
    expect(after.status).toBe("executed");
    expect(after.bypassed_manager).toBe(true);
    expect(after.executed_at).toMatch(ISO8601_RE);
    expect(after.counterparty_decision_at).toMatch(ISO8601_RE);
    // bypass path skips manager entirely — manager_employee_id key never set
    expect(Object.prototype.hasOwnProperty.call(after, "manager_employee_id")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(after, "manager_decision_at")).toBe(false);
    // Audit trail: [proposed-seed, bypass-execute]
    expect(after.audit_trail).toHaveLength(2);
    const lastEntry = after.audit_trail[after.audit_trail.length - 1];
    expect(lastEntry?.bypassed_manager).toBe(true);
    expect(lastEntry?.to).toBe("executed");
    expect(lastEntry?.from).toBe("proposed");
    expect(lastEntry?.by_employee_id).toBe("EMP-002");
  });

  it("SAME-RANK + SKILL-GAP: bypass disabled, falls back to manager-required path", () => {
    // EMP-004 is operator (same rank) but missing CRS-MILL-FUSION for HAAS-VF5
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-004",
      task: taskOnHaas5,
    });
    const after = employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-004",
      accept: true,
    });
    expect(after.status).toBe("counterparty_accepted");
    expect(after.bypassed_manager).toBe(false);
    // execution stamps not set on the partial-progress path
    expect(Object.prototype.hasOwnProperty.call(after, "executed_at")).toBe(false);
    expect(after.counterparty_decision_at).toMatch(ISO8601_RE);
  });

  it("CROSS-RANK: peer-accept goes to counterparty_accepted (no bypass) and requires manager approval", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001", // operator
      counterparty_employee_id: "EMP-005", // lead
      task: taskOnHaas5,
    });
    expect(proposed.requester_rank).toBe("operator");
    expect(proposed.counterparty_rank).toBe("lead");
    const accepted = employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-005",
      accept: true,
    });
    expect(accepted.status).toBe("counterparty_accepted");
    expect(accepted.bypassed_manager).toBe(false);
    const approved = employeeTaskHandoffEngine.managerApprove({
      handoff_id: proposed.id,
      manager_employee_id: "MGR-001",
      approve: true,
    });
    expect(approved.status).toBe("manager_approved");
    expect(approved.manager_employee_id).toBe("MGR-001");
    expect(approved.manager_decision_at).toMatch(ISO8601_RE);
    const executed = employeeTaskHandoffEngine.markExecuted({
      handoff_id: proposed.id,
      by_employee_id: "MGR-001",
    });
    expect(executed.status).toBe("executed");
    expect(executed.bypassed_manager).toBe(false);
    expect(executed.executed_at).toMatch(ISO8601_RE);
    // Audit trail: [proposed-seed, counterparty_accepted, manager_approved, executed]
    expect(executed.audit_trail).toHaveLength(4);
    expect(executed.audit_trail[1]?.to).toBe("counterparty_accepted");
    expect(executed.audit_trail[2]?.to).toBe("manager_approved");
    expect(executed.audit_trail[3]?.to).toBe("executed");
  });

  it("COUNTERPARTY-REJECT (Lean R7 overload waste): records lean_waste_observed and rejection_reason", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    const rejected = employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-002",
      accept: false,
      reason: "already at 7 active tasks — overproduction",
      lean_waste_observed: "overproduction",
    });
    expect(rejected.status).toBe("counterparty_rejected");
    expect(rejected.rejection_reason).toBe("already at 7 active tasks — overproduction");
    expect(rejected.counterparty_decision_at).toMatch(ISO8601_RE);
    const summary = employeeTaskHandoffEngine.wasteSummary();
    expect(summary.overproduction).toBe(1);
    expect(summary.defect ?? 0).toBe(0);
  });

  it("MANAGER QUALIFICATION-GATE: auto-rejects unqualified handoff with course-ID detail", () => {
    // EMP-004 operator missing CRS-MILL-FUSION → same-rank + skill-gap → no bypass
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-004",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-004",
      accept: true,
    });
    const decision = employeeTaskHandoffEngine.managerApprove({
      handoff_id: proposed.id,
      manager_employee_id: "MGR-001",
      approve: true, // manager tries to approve
    });
    expect(decision.status).toBe("manager_rejected");
    expect(decision.rejection_reason).toContain("CRS-MILL-FUSION");
    expect(decision.rejection_reason).toContain("EMP-004");
    expect(decision.rejection_reason).toContain("HAAS-VF5-001");
    expect(decision.manager_employee_id).toBe("MGR-001");
  });

  it("CANCEL: requester cancels a proposed handoff", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    const cancelled = employeeTaskHandoffEngine.cancel({
      handoff_id: proposed.id,
      canceller_employee_id: "EMP-001",
      reason: "task no longer needed",
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelled_at).toMatch(ISO8601_RE);
    expect(cancelled.audit_trail).toHaveLength(2);
    expect(cancelled.audit_trail[1]?.to).toBe("cancelled");
    expect(cancelled.audit_trail[1]?.note).toBe("task no longer needed");
    expect(cancelled.audit_trail[1]?.by_employee_id).toBe("EMP-001");
  });

  it("CANCEL by non-requester is denied (R12 fail-loud)", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    expect(() =>
      employeeTaskHandoffEngine.cancel({
        handoff_id: proposed.id,
        canceller_employee_id: "EMP-002",
      }),
    ).toThrow(/only the requester can cancel/);
  });

  it("CANCEL after acceptance is denied (lifecycle gate)", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-005",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-005",
      accept: true,
    });
    expect(() =>
      employeeTaskHandoffEngine.cancel({
        handoff_id: proposed.id,
        canceller_employee_id: "EMP-001",
      }),
    ).toThrow(/must be 'proposed'/);
  });

  it("SEGREGATION-OF-DUTIES: manager cannot be requester or counterparty", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-005",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-005",
      accept: true,
    });
    expect(() =>
      employeeTaskHandoffEngine.managerApprove({
        handoff_id: proposed.id,
        manager_employee_id: "EMP-001", // requester acting as manager
        approve: true,
      }),
    ).toThrow(/segregation of duties/);
    expect(() =>
      employeeTaskHandoffEngine.managerApprove({
        handoff_id: proposed.id,
        manager_employee_id: "EMP-005", // counterparty acting as manager
        approve: true,
      }),
    ).toThrow(/segregation of duties/);
  });

  it("COUNTERPARTY RESPOND by non-counterparty is denied (R12 fail-loud)", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    expect(() =>
      employeeTaskHandoffEngine.counterpartyRespond({
        handoff_id: proposed.id,
        responder_employee_id: "EMP-003", // not the named counterparty
        accept: true,
      }),
    ).toThrow(/only the counterparty can respond/);
  });

  it("SELF-HANDOFF is rejected (R12)", () => {
    expect(() =>
      employeeTaskHandoffEngine.proposeHandoff({
        requester_employee_id: "EMP-001",
        counterparty_employee_id: "EMP-001",
        task: taskOnHaas5,
      }),
    ).toThrow(/cannot hand off to themselves/);
  });

  it("UNREGISTERED-RANK proposer is rejected (R12)", () => {
    expect(() =>
      employeeTaskHandoffEngine.proposeHandoff({
        requester_employee_id: "EMP-999",
        counterparty_employee_id: "EMP-002",
        task: taskOnHaas5,
      }),
    ).toThrow(/requester rank not registered/);
    expect(() =>
      employeeTaskHandoffEngine.proposeHandoff({
        requester_employee_id: "EMP-001",
        counterparty_employee_id: "EMP-999",
        task: taskOnHaas5,
      }),
    ).toThrow(/counterparty rank not registered/);
  });

  it("INVALID TASK DESCRIPTOR is rejected (R12)", () => {
    expect(() =>
      employeeTaskHandoffEngine.proposeHandoff({
        requester_employee_id: "EMP-001",
        counterparty_employee_id: "EMP-002",
        task: { ...taskOnHaas5, task_kind: "garbage" as unknown as "timeclock" },
      }),
    ).toThrow(/task_kind/);
    expect(() =>
      employeeTaskHandoffEngine.proposeHandoff({
        requester_employee_id: "EMP-001",
        counterparty_employee_id: "EMP-002",
        task: { ...taskOnHaas5, machine_serial: "" },
      }),
    ).toThrow(/machine_serial/);
    expect(() =>
      employeeTaskHandoffEngine.proposeHandoff({
        requester_employee_id: "EMP-001",
        counterparty_employee_id: "EMP-002",
        task: { ...taskOnHaas5, remaining_minutes: -1 },
      }),
    ).toThrow(/remaining_minutes/);
  });

  it("LIFECYCLE: counterparty_respond on already-decided handoff is rejected", () => {
    const proposed = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-005",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: proposed.id,
      responder_employee_id: "EMP-005",
      accept: true,
    });
    expect(() =>
      employeeTaskHandoffEngine.counterpartyRespond({
        handoff_id: proposed.id,
        responder_employee_id: "EMP-005",
        accept: false,
      }),
    ).toThrow(/must be 'proposed'/);
  });

  it("STALL-WATCH (Lean WAITING waste): surfaces handoffs idle past threshold", () => {
    const r1 = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-005",
      task: taskOnOkumaL3,
    });
    // Simulate "now" 30 minutes after r1 was created
    const future = new Date(
      Date.parse(r1.created_at) + 30 * 60_000,
    ).toISOString();
    const stalled = employeeTaskHandoffEngine.listStalledHandoffs({
      stall_threshold_minutes: 20,
      now_iso: future,
    });
    // Both handoffs proposed at ~same instant → both stalled at 30 min vs 20 threshold
    expect(stalled.length).toBe(2);
    expect(stalled[0]?.age_minutes).toBeGreaterThanOrEqual(20);
    expect(stalled[0]?.task_id).toMatch(/^TASK-/);
    // Sorted oldest-first
    expect(stalled[0]!.age_minutes).toBeGreaterThanOrEqual(stalled[1]!.age_minutes);
  });

  it("STALL-WATCH: invalid threshold throws (R12)", () => {
    expect(() =>
      employeeTaskHandoffEngine.listStalledHandoffs({
        stall_threshold_minutes: -5,
      }),
    ).toThrow(/finite non-negative/);
    expect(() =>
      employeeTaskHandoffEngine.listStalledHandoffs({
        stall_threshold_minutes: 10,
        now_iso: "not-a-date",
      }),
    ).toThrow(/invalid now_iso/);
  });

  it("LIST: filters by employee_id and status", () => {
    employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    const r2 = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-003",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.cancel({
      handoff_id: r2.id,
      canceller_employee_id: "EMP-003",
    });
    const byEmp001 = employeeTaskHandoffEngine.listHandoffs({
      employee_id: "EMP-001",
    });
    expect(byEmp001.length).toBe(1);
    expect(byEmp001[0]?.requester_employee_id).toBe("EMP-001");
    const cancelled = employeeTaskHandoffEngine.listHandoffs({
      status: "cancelled",
    });
    expect(cancelled.length).toBe(1);
    expect(cancelled[0]?.id).toBe(r2.id);
    expect(cancelled[0]?.status).toBe("cancelled");
  });

  it("WASTE-SUMMARY: aggregates lean_waste_observed across multiple handoffs", () => {
    const r1 = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: r1.id,
      responder_employee_id: "EMP-002",
      accept: false,
      lean_waste_observed: "waiting",
    });
    const r2 = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-003",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: r2.id,
      responder_employee_id: "EMP-003",
      accept: false,
      lean_waste_observed: "waiting",
    });
    const r3 = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-005",
      task: taskOnHaas5,
    });
    employeeTaskHandoffEngine.counterpartyRespond({
      handoff_id: r3.id,
      responder_employee_id: "EMP-005",
      accept: false,
      lean_waste_observed: "defect",
    });
    const summary = employeeTaskHandoffEngine.wasteSummary();
    expect(summary.waiting).toBe(2);
    expect(summary.defect).toBe(1);
    expect(summary.overproduction ?? 0).toBe(0);
  });

  it("INVALID LEAN_WASTE_OBSERVED is rejected (R12)", () => {
    const r = employeeTaskHandoffEngine.proposeHandoff({
      requester_employee_id: "EMP-001",
      counterparty_employee_id: "EMP-002",
      task: taskOnHaas5,
    });
    expect(() =>
      employeeTaskHandoffEngine.counterpartyRespond({
        handoff_id: r.id,
        responder_employee_id: "EMP-002",
        accept: false,
        lean_waste_observed: "bogus_waste" as unknown as "defect",
      }),
    ).toThrow(/lean_waste_observed/);
  });

  it("UNKNOWN handoff_id is rejected (R12)", () => {
    expect(() =>
      employeeTaskHandoffEngine.counterpartyRespond({
        handoff_id: "HANDOFF-999999",
        responder_employee_id: "EMP-002",
        accept: true,
      }),
    ).toThrow(/unknown handoff_id/);
  });
});
