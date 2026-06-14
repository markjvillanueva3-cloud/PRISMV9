/**
 * ApprovalChainEngine — open + multi-step approve + threshold-skip + reject +
 * withdraw + SoD + rank gate + pinned approver.
 *
 * @milestone HOTEL/U-APPROVAL-CHAIN (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { approvalChainEngine, type ChainStepSpec } from "../engines/ApprovalChainEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";

function seedOrg() {
  managerRegistryEngine.reset();
  managerRegistryEngine.register({
    employee_id: "ADMIN-001", rank: "admin", department_code: "office",
    reports_to_employee_id: null, by_employee_id: "ADMIN-001",
  });
  managerRegistryEngine.register({
    employee_id: "OWNER-001", rank: "owner", department_code: "office",
    reports_to_employee_id: "ADMIN-001", by_employee_id: "ADMIN-001",
  });
  managerRegistryEngine.register({
    employee_id: "ACCT-001", rank: "accounting", department_code: "accounting",
    reports_to_employee_id: "OWNER-001", by_employee_id: "OWNER-001",
  });
  managerRegistryEngine.register({
    employee_id: "MGR-001", rank: "manager", department_code: "mill",
    reports_to_employee_id: "OWNER-001", by_employee_id: "OWNER-001",
  });
  managerRegistryEngine.register({
    employee_id: "EMP-001", rank: "operator", department_code: "mill",
    reports_to_employee_id: "MGR-001", by_employee_id: "MGR-001",
  });
}

function expenseChainSteps(): ChainStepSpec[] {
  return [
    { step: 1, required_rank_min: "manager", label: "manager approval" },
    { step: 2, required_rank_min: "accounting", dollar_threshold_cents: 50000n, label: "accounting (>$500)" },
    { step: 3, required_rank_min: "admin", dollar_threshold_cents: 500000n, label: "admin (>$5000)" },
  ];
}

describe("ApprovalChainEngine — open + threshold-skip", () => {
  beforeEach(() => {
    approvalChainEngine.reset();
    seedOrg();
  });

  it("HAPPY PATH: opens a 3-step chain for $7500 expense", () => {
    const c = approvalChainEngine.open({
      subject_kind: "expense_report",
      subject_id: "EXP-001",
      amount_cents: 750000n,
      requester_employee_id: "EMP-001",
      steps: expenseChainSteps(),
    });
    expect(c.id).toMatch(/^CHAIN-\d{6}$/);
    expect(c.steps.length).toBe(3); // all 3 steps active above $5000
    expect(c.next_step_index).toBe(1);
    expect(c.status).toBe("pending");
  });

  it("SKIPS steps below threshold (small $50 expense → only mgr step)", () => {
    const c = approvalChainEngine.open({
      subject_kind: "expense_report", subject_id: "EXP-001",
      amount_cents: 5000n, // $50
      requester_employee_id: "EMP-001",
      steps: expenseChainSteps(),
    });
    expect(c.steps.length).toBe(1); // only step 1 (mgr) remains
    expect(c.steps[0]?.step).toBe(1);
  });

  it("MEDIUM: $1500 → mgr + accounting (no admin)", () => {
    const c = approvalChainEngine.open({
      subject_kind: "expense_report", subject_id: "EXP-001",
      amount_cents: 150000n,
      requester_employee_id: "EMP-001",
      steps: expenseChainSteps(),
    });
    expect(c.steps.length).toBe(2);
  });

  it("REJECTS amount below ALL thresholds when threshold-only steps remain", () => {
    expect(() =>
      approvalChainEngine.open({
        subject_kind: "x", subject_id: "x", amount_cents: 0n,
        requester_employee_id: "EMP-001",
        steps: [{ step: 1, required_rank_min: "admin", dollar_threshold_cents: 100n, label: "admin" }],
      }),
    ).toThrow(/no approval chain needed/);
  });

  it("REJECTS non-bigint amount (PII-safe currency R12)", () => {
    expect(() =>
      approvalChainEngine.open({
        subject_kind: "x", subject_id: "x",
        amount_cents: 100 as unknown as bigint,
        requester_employee_id: "EMP-001", steps: expenseChainSteps(),
      }),
    ).toThrow(/must be a bigint/);
  });

  it("REJECTS negative amount + non-increasing step indices (R12)", () => {
    expect(() =>
      approvalChainEngine.open({
        subject_kind: "x", subject_id: "x", amount_cents: -1n,
        requester_employee_id: "EMP-001", steps: expenseChainSteps(),
      }),
    ).toThrow(/non-negative/);
    expect(() =>
      approvalChainEngine.open({
        subject_kind: "x", subject_id: "x", amount_cents: 100n,
        requester_employee_id: "EMP-001",
        steps: [
          { step: 2, required_rank_min: "manager", label: "out of order" },
          { step: 1, required_rank_min: "operator", label: "out of order" },
        ],
      }),
    ).toThrow(/strictly increasing/);
  });

  it("REJECTS unregistered requester (R12)", () => {
    expect(() =>
      approvalChainEngine.open({
        subject_kind: "x", subject_id: "x", amount_cents: 100n,
        requester_employee_id: "GHOST", steps: expenseChainSteps(),
      }),
    ).toThrow(/unknown employee/);
  });
});

describe("ApprovalChainEngine — multi-step approve flow", () => {
  beforeEach(() => {
    approvalChainEngine.reset();
    seedOrg();
  });

  it("FULL CHAIN: mgr → accounting → admin → final_approved", () => {
    const c = approvalChainEngine.open({
      subject_kind: "expense_report", subject_id: "EXP-001",
      amount_cents: 750000n,
      requester_employee_id: "EMP-001",
      steps: expenseChainSteps(),
    });
    const s1 = approvalChainEngine.approveStep({
      chain_id: c.id, approver_employee_id: "MGR-001",
      rationale: "valid travel expense",
    });
    expect(s1.status).toBe("in_progress");
    expect(s1.next_step_index).toBe(2);
    const s2 = approvalChainEngine.approveStep({
      chain_id: c.id, approver_employee_id: "ACCT-001",
      rationale: "GL code 6010 confirmed",
    });
    expect(s2.next_step_index).toBe(3);
    const s3 = approvalChainEngine.approveStep({
      chain_id: c.id, approver_employee_id: "ADMIN-001",
      rationale: "final auth",
    });
    expect(s3.status).toBe("final_approved");
    expect(s3.finalized_at).toBeTruthy();
    expect(s3.decisions.length).toBe(3);
  });

  it("RANK GATE: operator cannot approve manager step (R12)", () => {
    const c = approvalChainEngine.open({
      subject_kind: "x", subject_id: "x", amount_cents: 100000n,
      requester_employee_id: "EMP-001", steps: expenseChainSteps(),
    });
    // EMP-001 is requester anyway, but seed an unrelated operator
    managerRegistryEngine.register({
      employee_id: "EMP-PEER", rank: "operator", department_code: "mill",
      reports_to_employee_id: "MGR-001", by_employee_id: "MGR-001",
    });
    expect(() =>
      approvalChainEngine.approveStep({
        chain_id: c.id, approver_employee_id: "EMP-PEER", rationale: "x",
      }),
    ).toThrow(/below step 1 required/);
  });

  it("SoD: requester cannot approve own chain (R12)", () => {
    // Promote EMP-001 to manager so they pass rank gate
    managerRegistryEngine.promote({
      employee_id: "EMP-001", new_rank: "manager",
      by_employee_id: "OWNER-001", reason: "promotion",
    });
    const c = approvalChainEngine.open({
      subject_kind: "x", subject_id: "x", amount_cents: 100n,
      requester_employee_id: "EMP-001",
      steps: [{ step: 1, required_rank_min: "manager", label: "mgr" }],
    });
    expect(() =>
      approvalChainEngine.approveStep({
        chain_id: c.id, approver_employee_id: "EMP-001", rationale: "self",
      }),
    ).toThrow(/requester cannot approve their own/);
  });

  it("PINNED APPROVER: only the named approver can act on the step", () => {
    const c = approvalChainEngine.open({
      subject_kind: "x", subject_id: "x", amount_cents: 100n,
      requester_employee_id: "EMP-001",
      steps: [{ step: 1, required_rank_min: "manager", approver_employee_id: "MGR-001", label: "specific mgr" }],
    });
    expect(() =>
      approvalChainEngine.approveStep({
        chain_id: c.id, approver_employee_id: "OWNER-001", rationale: "x",
      }),
    ).toThrow(/pinned to/);
  });

  it("REJECT: any step rejection ends the chain immediately", () => {
    const c = approvalChainEngine.open({
      subject_kind: "x", subject_id: "x", amount_cents: 750000n,
      requester_employee_id: "EMP-001", steps: expenseChainSteps(),
    });
    approvalChainEngine.approveStep({
      chain_id: c.id, approver_employee_id: "MGR-001", rationale: "ok",
    });
    const rejected = approvalChainEngine.rejectStep({
      chain_id: c.id, rejecter_employee_id: "ACCT-001",
      rationale: "missing receipt",
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.decisions.length).toBe(2);
    expect(rejected.decisions[1]?.decision).toBe("rejected");
  });

  it("WITHDRAW: only requester can withdraw + only while pending/in_progress", () => {
    const c = approvalChainEngine.open({
      subject_kind: "x", subject_id: "x", amount_cents: 100n,
      requester_employee_id: "EMP-001",
      steps: [{ step: 1, required_rank_min: "manager", label: "mgr" }],
    });
    expect(() =>
      approvalChainEngine.withdraw({ chain_id: c.id, by_employee_id: "MGR-001" }),
    ).toThrow(/only original requester/);
    const w = approvalChainEngine.withdraw({ chain_id: c.id, by_employee_id: "EMP-001" });
    expect(w.status).toBe("withdrawn");
    // Cannot withdraw after withdraw
    expect(() =>
      approvalChainEngine.withdraw({ chain_id: c.id, by_employee_id: "EMP-001" }),
    ).toThrow(/cannot withdraw/);
  });

  it("REJECTS approve on finalized chain (R12)", () => {
    const c = approvalChainEngine.open({
      subject_kind: "x", subject_id: "x", amount_cents: 100n,
      requester_employee_id: "EMP-001",
      steps: [{ step: 1, required_rank_min: "manager", label: "mgr" }],
    });
    approvalChainEngine.approveStep({
      chain_id: c.id, approver_employee_id: "MGR-001", rationale: "ok",
    });
    expect(() =>
      approvalChainEngine.approveStep({
        chain_id: c.id, approver_employee_id: "OWNER-001", rationale: "x",
      }),
    ).toThrow(/cannot mutate/);
  });

  it("LIST: filters by requester + status + subject_kind", () => {
    approvalChainEngine.open({
      subject_kind: "expense_report", subject_id: "E-1", amount_cents: 100n,
      requester_employee_id: "EMP-001",
      steps: [{ step: 1, required_rank_min: "manager", label: "x" }],
    });
    approvalChainEngine.open({
      subject_kind: "purchase_order", subject_id: "P-1", amount_cents: 100n,
      requester_employee_id: "EMP-001",
      steps: [{ step: 1, required_rank_min: "manager", label: "x" }],
    });
    expect(approvalChainEngine.listChains({ subject_kind: "expense_report" }).length).toBe(1);
    expect(approvalChainEngine.listChains({ status: "pending" }).length).toBe(2);
    expect(approvalChainEngine.listChains({ requester_employee_id: "EMP-001" }).length).toBe(2);
  });

  it("PSN roost: 4 edges_in from upstream approval consumers", () => {
    const r = approvalChainEngine.systemVizRoost();
    expect(r.layer).toBe(7);
    expect(r.psn_legs).toEqual([7, 11]);
    expect(r.edges_in).toContain("AIProposalApprovalQueueEngine");
    expect(r.edges_in).toContain("PurchaseOrderEngine");
    expect(r.edges_in.length).toBeGreaterThanOrEqual(4);
  });
});
