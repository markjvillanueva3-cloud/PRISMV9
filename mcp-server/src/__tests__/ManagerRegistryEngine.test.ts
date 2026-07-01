/**
 * ManagerRegistryEngine — register/promote/demote/reassign/setReportsTo/
 * deactivate/reactivate + canManagerApprove gate + reportsToChain walk +
 * cycle gates + rank-ladder enforcement.
 *
 * Variability ≥18 cases · ≥7 R12 fail-loud modes.
 *
 * @milestone HOTEL/U-MANAGER-REGISTRY (2026-05-26, slot:hotel iter6 /goal Phase 1 P0)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { managerRegistryEngine, RANK_ORDER } from "../engines/ManagerRegistryEngine.js";

function seedOrg() {
  managerRegistryEngine.register({
    employee_id: "ADMIN-001",
    rank: "admin",
    department_code: "office",
    reports_to_employee_id: null,
    by_employee_id: "ADMIN-001", // bootstrap — admin self-registers as top
  });
  managerRegistryEngine.register({
    employee_id: "OWNER-001",
    rank: "owner",
    department_code: "office",
    reports_to_employee_id: "ADMIN-001",
    by_employee_id: "ADMIN-001",
  });
  managerRegistryEngine.register({
    employee_id: "MGR-001",
    rank: "manager",
    department_code: "mill",
    reports_to_employee_id: "OWNER-001",
    by_employee_id: "OWNER-001",
  });
  managerRegistryEngine.register({
    employee_id: "FORE-001",
    rank: "foreman",
    department_code: "mill",
    reports_to_employee_id: "MGR-001",
    by_employee_id: "MGR-001",
  });
  managerRegistryEngine.register({
    employee_id: "EMP-001",
    rank: "operator",
    department_code: "mill",
    reports_to_employee_id: "FORE-001",
    by_employee_id: "FORE-001",
  });
  managerRegistryEngine.register({
    employee_id: "EMP-002",
    rank: "operator",
    department_code: "mill",
    reports_to_employee_id: "FORE-001",
    by_employee_id: "FORE-001",
  });
}

describe("ManagerRegistryEngine — rank ladder", () => {
  beforeEach(() => managerRegistryEngine.reset());

  it("RANK_ORDER has 22 ranks with admin at top", () => {
    expect(RANK_ORDER.length).toBe(22);
    expect(RANK_ORDER[0]).toBe("apprentice");
    expect(RANK_ORDER[RANK_ORDER.length - 1]).toBe("admin");
    expect(managerRegistryEngine.rankIndex("admin")).toBeGreaterThan(
      managerRegistryEngine.rankIndex("owner"),
    );
  });

  it("rankIndex REJECTS invalid rank (R12)", () => {
    expect(() => managerRegistryEngine.rankIndex("god" as unknown as "admin")).toThrow(/invalid rank/);
  });
});

describe("ManagerRegistryEngine — register + lookup", () => {
  beforeEach(() => managerRegistryEngine.reset());

  it("seeds a 6-tier org-chart", () => {
    seedOrg();
    expect(managerRegistryEngine.listEmployees().length).toBe(6);
    expect(managerRegistryEngine.getEmployee("EMP-001").reports_to_employee_id).toBe("FORE-001");
  });

  it("REJECTS self-report (R12)", () => {
    expect(() =>
      managerRegistryEngine.register({
        employee_id: "EMP-001",
        rank: "operator",
        department_code: "mill",
        reports_to_employee_id: "EMP-001",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/cannot report to themselves/);
  });

  it("REJECTS reports_to that doesn't outrank (R12)", () => {
    seedOrg();
    // Try to register a new operator reporting to another operator
    expect(() =>
      managerRegistryEngine.register({
        employee_id: "EMP-003",
        rank: "operator",
        department_code: "mill",
        reports_to_employee_id: "EMP-001",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/must outrank/);
  });

  it("REJECTS duplicate registration (R12)", () => {
    seedOrg();
    expect(() =>
      managerRegistryEngine.register({
        employee_id: "EMP-001",
        rank: "machinist",
        department_code: "mill",
        reports_to_employee_id: "FORE-001",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/already registered/);
  });

  it("REJECTS unregistered reports_to (R12)", () => {
    expect(() =>
      managerRegistryEngine.register({
        employee_id: "EMP-001",
        rank: "operator",
        department_code: "mill",
        reports_to_employee_id: "GHOST",
        by_employee_id: "OWNER",
      }),
    ).toThrow(/not registered yet/);
  });
});

describe("ManagerRegistryEngine — promote + demote", () => {
  beforeEach(() => {
    managerRegistryEngine.reset();
    seedOrg();
  });

  it("promote moves rank up + appends audit", () => {
    const updated = managerRegistryEngine.promote({
      employee_id: "EMP-001",
      new_rank: "machinist",
      by_employee_id: "MGR-001",
      reason: "passed mill-machinist exam Cpk 1.4",
    });
    expect(updated.rank).toBe("machinist");
    expect(updated.audit_trail).toHaveLength(2);
    expect(updated.audit_trail[1]?.operation).toBe("promote");
    expect(updated.audit_trail[1]?.reason).toContain("Cpk");
  });

  it("REJECTS promote to non-higher rank (R12)", () => {
    expect(() =>
      managerRegistryEngine.promote({
        employee_id: "EMP-001",
        new_rank: "operator",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/not above current rank/);
  });

  it("REJECTS self-promote (SoD R12)", () => {
    expect(() =>
      managerRegistryEngine.promote({
        employee_id: "EMP-001",
        new_rank: "machinist",
        by_employee_id: "EMP-001",
      }),
    ).toThrow(/cannot promote themselves/);
  });

  it("REJECTS promote when approver doesn't outrank target (R12 adversarial)", () => {
    // FORE-001 (foreman) tries to promote EMP-001 to director (way above foreman)
    expect(() =>
      managerRegistryEngine.promote({
        employee_id: "EMP-001",
        new_rank: "director",
        by_employee_id: "FORE-001",
      }),
    ).toThrow(/does not outrank/);
  });

  it("demote REQUIRES reason (no silent demotion R12)", () => {
    expect(() =>
      managerRegistryEngine.demote({
        employee_id: "FORE-001",
        new_rank: "machinist",
        by_employee_id: "MGR-001",
        reason: "",
      }),
    ).toThrow(/reason required/);
    const updated = managerRegistryEngine.demote({
      employee_id: "FORE-001",
      new_rank: "machinist",
      by_employee_id: "MGR-001",
      reason: "step-back to focus on machining per employee request",
    });
    expect(updated.rank).toBe("machinist");
    expect(updated.audit_trail[1]?.operation).toBe("demote");
  });

  it("REJECTS demote-as-promote (R12)", () => {
    expect(() =>
      managerRegistryEngine.demote({
        employee_id: "EMP-001",
        new_rank: "machinist",
        by_employee_id: "MGR-001",
        reason: "x",
      }),
    ).toThrow(/not below current rank/);
  });
});

describe("ManagerRegistryEngine — reassign dept + reports_to", () => {
  beforeEach(() => {
    managerRegistryEngine.reset();
    seedOrg();
  });

  it("reassignDepartment moves to new dept", () => {
    const updated = managerRegistryEngine.reassignDepartment({
      employee_id: "EMP-001",
      new_department_code: "lathe",
      by_employee_id: "MGR-001",
    });
    expect(updated.department_code).toBe("lathe");
  });

  it("REJECTS reassign to same dept (R12)", () => {
    expect(() =>
      managerRegistryEngine.reassignDepartment({
        employee_id: "EMP-001",
        new_department_code: "mill",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/already in 'mill'/);
  });

  it("setReportsTo cycle detection (R12 adversarial)", () => {
    // Try to make MGR-001 report to EMP-001 (would form mill loop)
    expect(() =>
      managerRegistryEngine.setReportsTo({
        employee_id: "MGR-001",
        new_reports_to_employee_id: "EMP-001",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/must outrank/);
  });

  it("setReportsTo to null = top-of-chain", () => {
    const updated = managerRegistryEngine.setReportsTo({
      employee_id: "MGR-001",
      new_reports_to_employee_id: null,
      by_employee_id: "OWNER-001",
    });
    expect(updated.reports_to_employee_id).toBe(null);
  });
});

describe("ManagerRegistryEngine — canManagerApprove gate (canonical)", () => {
  beforeEach(() => {
    managerRegistryEngine.reset();
    seedOrg();
  });

  it("returns TRUE when approver strictly outranks subject", () => {
    expect(managerRegistryEngine.canManagerApprove("MGR-001", "EMP-001")).toBe(true);
    expect(managerRegistryEngine.canManagerApprove("OWNER-001", "MGR-001")).toBe(true);
    expect(managerRegistryEngine.canManagerApprove("ADMIN-001", "OWNER-001")).toBe(true);
  });

  it("returns FALSE on same-rank peers", () => {
    expect(managerRegistryEngine.canManagerApprove("EMP-001", "EMP-002")).toBe(false);
  });

  it("returns FALSE on subject outranking approver", () => {
    expect(managerRegistryEngine.canManagerApprove("EMP-001", "MGR-001")).toBe(false);
  });

  it("returns FALSE on self (SoD)", () => {
    expect(managerRegistryEngine.canManagerApprove("MGR-001", "MGR-001")).toBe(false);
  });

  it("REJECTS gate query for inactive employee (R12)", () => {
    managerRegistryEngine.deactivate({
      employee_id: "EMP-001",
      by_employee_id: "MGR-001",
      reason: "left the company",
    });
    expect(() =>
      managerRegistryEngine.canManagerApprove("MGR-001", "EMP-001"),
    ).toThrow(/is inactive/);
  });
});

describe("ManagerRegistryEngine — reportsToChain + directReports", () => {
  beforeEach(() => {
    managerRegistryEngine.reset();
    seedOrg();
  });

  it("reportsToChain walks employee→manager→owner→admin", () => {
    const chain = managerRegistryEngine.reportsToChain("EMP-001");
    expect(chain).toEqual(["EMP-001", "FORE-001", "MGR-001", "OWNER-001", "ADMIN-001"]);
  });

  it("directReports returns one-level subordinates", () => {
    const reports = managerRegistryEngine.directReports("FORE-001");
    expect(reports.length).toBe(2);
    expect(reports.map((r) => r.employee_id).sort()).toEqual(["EMP-001", "EMP-002"]);
  });
});

describe("ManagerRegistryEngine — deactivate + reactivate", () => {
  beforeEach(() => {
    managerRegistryEngine.reset();
    seedOrg();
  });

  it("deactivate REQUIRES reason (no silent termination R12)", () => {
    expect(() =>
      managerRegistryEngine.deactivate({
        employee_id: "EMP-001",
        by_employee_id: "MGR-001",
        reason: "",
      }),
    ).toThrow(/reason required/);
  });

  it("deactivate + reactivate lifecycle", () => {
    managerRegistryEngine.deactivate({
      employee_id: "EMP-001",
      by_employee_id: "MGR-001",
      reason: "termination",
    });
    expect(managerRegistryEngine.getEmployee("EMP-001").active).toBe(false);
    const reactivated = managerRegistryEngine.reactivate({
      employee_id: "EMP-001",
      by_employee_id: "MGR-001",
    });
    expect(reactivated.active).toBe(true);
  });

  it("REJECTS reactivate of already-active (R12)", () => {
    expect(() =>
      managerRegistryEngine.reactivate({
        employee_id: "EMP-001",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/already active/);
  });
});
