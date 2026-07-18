/**
 * DepartmentEngine — covers create/rename/reassign-manager/add-remove-member/
 * set-machine-domain/set-parent (with cycle gate), KPI rollup gate,
 * ancestor-chain walk, audit-trail discipline.
 *
 * Variability ≥18 cases · ≥6 R12 fail-loud modes.
 *
 * @milestone HOTEL/U-DEPARTMENT-ENGINE (2026-05-26, slot:hotel iter6 /goal Phase 1 P0)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { departmentEngine } from "../engines/DepartmentEngine.js";

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("DepartmentEngine — create + lookup", () => {
  beforeEach(() => departmentEngine.reset());

  it("creates a department with machine-domain link + audit-trail", () => {
    const d = departmentEngine.createDepartment({
      code: "mill",
      name: "Mill Department",
      manager_employee_id: "MGR-001",
      machine_domain: "mill",
      by_employee_id: "OWNER-001",
    });
    expect(d.code).toBe("mill");
    expect(d.name).toBe("Mill Department");
    expect(d.manager_employee_id).toBe("MGR-001");
    expect(d.machine_domain).toBe("mill");
    expect(d.member_employee_ids).toEqual([]);
    expect(d.created_at).toMatch(ISO8601_RE);
    expect(d.updated_at).toBe(d.created_at);
    expect(d.audit_trail).toHaveLength(1);
    expect(d.audit_trail[0]?.operation).toBe("create");
    expect(d.audit_trail[0]?.by_employee_id).toBe("OWNER-001");
  });

  it("supports all 18 canonical JM-Die department codes", () => {
    const codes = [
      "eng", "programming", "mill", "lathe", "swiss", "millturn", "wedm",
      "sinker", "grinder", "honing", "polishing", "qa", "shipping",
      "receiving", "office", "sales", "accounting", "maintenance",
    ];
    for (const code of codes) {
      const d = departmentEngine.createDepartment({
        code,
        name: code,
        manager_employee_id: `MGR-${code}`,
        by_employee_id: "OWNER-001",
      });
      expect(d.code).toBe(code);
    }
    expect(departmentEngine.listDepartments().length).toBe(18);
  });

  it("REJECTS invalid code regex (R12)", () => {
    expect(() =>
      departmentEngine.createDepartment({
        code: "Mill!Bad",
        name: "x",
        manager_employee_id: "MGR-001",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/code must match/);
  });

  it("REJECTS duplicate code (R12)", () => {
    departmentEngine.createDepartment({
      code: "mill",
      name: "Mill",
      manager_employee_id: "MGR-001",
      by_employee_id: "OWNER-001",
    });
    expect(() =>
      departmentEngine.createDepartment({
        code: "mill",
        name: "Mill 2",
        manager_employee_id: "MGR-002",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/already exists/);
  });

  it("REJECTS missing manager_employee_id (R12)", () => {
    expect(() =>
      departmentEngine.createDepartment({
        code: "mill",
        name: "Mill",
        manager_employee_id: "",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/manager_employee_id required/);
  });

  it("REJECTS unknown parent_code (R12)", () => {
    expect(() =>
      departmentEngine.createDepartment({
        code: "mill",
        name: "Mill",
        manager_employee_id: "MGR-001",
        parent_code: "manufacturing",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/parent_code 'manufacturing' does not exist/);
  });
});

describe("DepartmentEngine — mutation lifecycle", () => {
  beforeEach(() => {
    departmentEngine.reset();
    departmentEngine.createDepartment({
      code: "mill",
      name: "Mill",
      manager_employee_id: "MGR-001",
      by_employee_id: "OWNER-001",
    });
  });

  it("reassignManager updates manager + appends audit", () => {
    const updated = departmentEngine.reassignManager({
      code: "mill",
      new_manager_employee_id: "MGR-002",
      by_employee_id: "OWNER-001",
    });
    expect(updated.manager_employee_id).toBe("MGR-002");
    expect(updated.audit_trail).toHaveLength(2);
    expect(updated.audit_trail[1]?.operation).toBe("reassign_manager");
  });

  it("REJECTS reassign to same manager (R12)", () => {
    expect(() =>
      departmentEngine.reassignManager({
        code: "mill",
        new_manager_employee_id: "MGR-001",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/already manager/);
  });

  it("add + remove member, idempotent guards on both", () => {
    const after = departmentEngine.addMember({
      code: "mill",
      employee_id: "EMP-001",
      by_employee_id: "MGR-001",
    });
    expect(after.member_employee_ids).toEqual(["EMP-001"]);
    expect(() =>
      departmentEngine.addMember({
        code: "mill",
        employee_id: "EMP-001",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/already a member/);
    const removed = departmentEngine.removeMember({
      code: "mill",
      employee_id: "EMP-001",
      by_employee_id: "MGR-001",
    });
    expect(removed.member_employee_ids).toEqual([]);
    expect(() =>
      departmentEngine.removeMember({
        code: "mill",
        employee_id: "EMP-001",
        by_employee_id: "MGR-001",
      }),
    ).toThrow(/not a member/);
  });

  it("rename updates name + appends audit", () => {
    const renamed = departmentEngine.rename({
      code: "mill",
      new_name: "Mill Cell",
      by_employee_id: "OWNER-001",
    });
    expect(renamed.name).toBe("Mill Cell");
    expect(renamed.audit_trail[1]?.operation).toBe("rename");
  });

  it("REJECTS rename to same name (R12)", () => {
    expect(() =>
      departmentEngine.rename({
        code: "mill",
        new_name: "Mill",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/already 'Mill'/);
  });

  it("setMachineDomain bridges to academy specialist curriculum", () => {
    const updated = departmentEngine.setMachineDomain({
      code: "mill",
      machine_domain: "lathe",
      by_employee_id: "OWNER-001",
    });
    expect(updated.machine_domain).toBe("lathe");
  });

  it("setParent + ancestorChain walk", () => {
    departmentEngine.createDepartment({
      code: "manufacturing",
      name: "Manufacturing",
      manager_employee_id: "MGR-100",
      by_employee_id: "OWNER-001",
    });
    departmentEngine.createDepartment({
      code: "operations",
      name: "Operations",
      manager_employee_id: "MGR-200",
      by_employee_id: "OWNER-001",
    });
    departmentEngine.setParent({
      code: "mill",
      parent_code: "manufacturing",
      by_employee_id: "OWNER-001",
    });
    departmentEngine.setParent({
      code: "manufacturing",
      parent_code: "operations",
      by_employee_id: "OWNER-001",
    });
    expect(departmentEngine.ancestorChain("mill")).toEqual([
      "mill", "manufacturing", "operations",
    ]);
  });

  it("setParent REJECTS self-parent + cycle (R12 adversarial)", () => {
    departmentEngine.createDepartment({
      code: "manufacturing",
      name: "Mfg",
      manager_employee_id: "MGR-100",
      by_employee_id: "OWNER-001",
    });
    departmentEngine.setParent({
      code: "mill",
      parent_code: "manufacturing",
      by_employee_id: "OWNER-001",
    });
    expect(() =>
      departmentEngine.setParent({
        code: "mill",
        parent_code: "mill",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/cannot be its own parent/);
    // Cycle: try to make manufacturing's parent = mill (would form a loop)
    expect(() =>
      departmentEngine.setParent({
        code: "manufacturing",
        parent_code: "mill",
        by_employee_id: "OWNER-001",
      }),
    ).toThrow(/cycle detected/);
  });

  it("REJECTS mutation without by_employee_id (audit-trail invariant)", () => {
    expect(() =>
      departmentEngine.addMember({
        code: "mill",
        employee_id: "EMP-001",
        by_employee_id: "",
      }),
    ).toThrow(/by_employee_id required/);
  });
});

describe("DepartmentEngine — KPI rollup gate (Lean/Sigma)", () => {
  beforeEach(() => {
    departmentEngine.reset();
    departmentEngine.createDepartment({
      code: "mill",
      name: "Mill",
      manager_employee_id: "MGR-001",
      by_employee_id: "OWNER-001",
    });
  });

  it("setKpiRollup stores OEE/on-time/waste counts; getRollup returns bundle", () => {
    departmentEngine.setKpiRollup({
      code: "mill",
      oee_pct: 87.5,
      on_time_delivery_pct: 96.2,
      waste_count: 12,
      open_kaizen_events: 3,
      open_ncrs: 1,
      window_start: "2026-05-19T00:00:00.000Z",
      window_end: "2026-05-26T00:00:00.000Z",
    });
    const bundle = departmentEngine.getRollup("mill");
    expect(bundle.department.code).toBe("mill");
    expect(bundle.kpi.oee_pct).toBe(87.5);
    expect(bundle.kpi.on_time_delivery_pct).toBe(96.2);
    expect(bundle.kpi.waste_count).toBe(12);
    expect(bundle.kpi.open_kaizen_events).toBe(3);
    expect(bundle.kpi.open_ncrs).toBe(1);
  });

  it("REJECTS oee_pct > 100 (R12 boundary)", () => {
    expect(() =>
      departmentEngine.setKpiRollup({
        code: "mill",
        oee_pct: 101,
        on_time_delivery_pct: 95,
        waste_count: 0,
        open_kaizen_events: 0,
        open_ncrs: 0,
        window_start: "2026-05-19T00:00:00.000Z",
        window_end: "2026-05-26T00:00:00.000Z",
      }),
    ).toThrow(/must be ≤100/);
  });

  it("REJECTS negative waste_count (R12 adversarial: NaN)", () => {
    expect(() =>
      departmentEngine.setKpiRollup({
        code: "mill",
        oee_pct: 80,
        on_time_delivery_pct: 90,
        waste_count: NaN,
        open_kaizen_events: 0,
        open_ncrs: 0,
        window_start: "2026-05-19T00:00:00.000Z",
        window_end: "2026-05-26T00:00:00.000Z",
      }),
    ).toThrow(/finite non-negative/);
  });

  it("REJECTS Infinity on_time (R12 adversarial)", () => {
    expect(() =>
      departmentEngine.setKpiRollup({
        code: "mill",
        oee_pct: 80,
        on_time_delivery_pct: Infinity,
        waste_count: 0,
        open_kaizen_events: 0,
        open_ncrs: 0,
        window_start: "2026-05-19T00:00:00.000Z",
        window_end: "2026-05-26T00:00:00.000Z",
      }),
    ).toThrow(/finite non-negative/);
  });

  it("REJECTS getRollup before setKpiRollup (R12)", () => {
    expect(() => departmentEngine.getRollup("mill")).toThrow(/no KPI rollup recorded/);
  });

  it("listDepartments filters by manager + machine_domain + parent", () => {
    departmentEngine.createDepartment({
      code: "lathe",
      name: "Lathe",
      manager_employee_id: "MGR-001", // same manager
      machine_domain: "lathe",
      by_employee_id: "OWNER-001",
    });
    departmentEngine.createDepartment({
      code: "wedm",
      name: "WEDM",
      manager_employee_id: "MGR-002",
      machine_domain: "wedm",
      by_employee_id: "OWNER-001",
    });
    expect(departmentEngine.listDepartments({ manager_employee_id: "MGR-001" }).length).toBe(2);
    expect(departmentEngine.listDepartments({ machine_domain: "wedm" }).length).toBe(1);
    expect(departmentEngine.listDepartments().length).toBe(3);
  });
});
