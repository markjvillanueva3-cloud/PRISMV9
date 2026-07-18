/**
 * EmployeeEngine.test.ts — hotel slot (iter16 / U-EMPLOYEE-WIRE).
 * Tests employee lifecycle (create + update + status transitions + skills/certs + search/list).
 */

import { describe, it, expect } from "vitest";
import { employeeEngine } from "../engines/EmployeeEngine.js";
import type { EmployeeCreateInput } from "../engines/EmployeeEngine.js";

function uniqueEmail(): string {
  return `e-${Math.random().toString(36).slice(2, 10)}@jmdie.example`;
}

function makeInput(overrides: Partial<EmployeeCreateInput> = {}): EmployeeCreateInput {
  return {
    first_name: "Test",
    last_name: "Emp",
    email: uniqueEmail(),
    department: "machining" as any,
    role: "machinist" as any,
    hourly_rate: 25,
    ...overrides,
  };
}

describe("EmployeeEngine — create + get", () => {
  it("create returns employee with id prefix EMP-####", () => {
    const e = employeeEngine.create(makeInput());
    expect(e.id).toMatch(/^EMP-\d{4}$/);
    expect(e.status).toBe("active");
  });

  it("create populates overtime_rate = hourly_rate × 1.5 (default)", () => {
    const e = employeeEngine.create(makeInput({ hourly_rate: 30 }));
    expect(e.overtime_rate).toBe(45);
    expect(e.double_time_rate).toBe(60);
  });

  it("create honors custom overtime_multiplier", () => {
    const e = employeeEngine.create(makeInput({ hourly_rate: 30, overtime_multiplier: 2.0 }));
    expect(e.overtime_rate).toBe(60);
  });

  it("get returns the created employee by id", () => {
    const e = employeeEngine.create(makeInput());
    expect(employeeEngine.get(e.id)?.id).toBe(e.id);
  });

  it("get returns undefined for unknown id", () => {
    expect(employeeEngine.get("EMP-NEVER") === undefined).toBe(true);
  });
});

describe("EmployeeEngine — update recomputes derived rates", () => {
  it("update hourly_rate triggers overtime_rate + double_time_rate recompute", () => {
    const e = employeeEngine.create(makeInput({ hourly_rate: 25 }));
    const u = employeeEngine.update(e.id, { hourly_rate: 40 });
    expect(u.hourly_rate).toBe(40);
    expect(u.overtime_rate).toBe(60);
    expect(u.double_time_rate).toBe(80);
  });

  it("update on unknown id throws", () => {
    expect(() => employeeEngine.update("EMP-NEVER", { hourly_rate: 10 }))
      .toThrow(/not found/);
  });
});

describe("EmployeeEngine — updateStatus", () => {
  it("updateStatus to 'inactive' with valid reason succeeds", () => {
    const e = employeeEngine.create(makeInput());
    const u = employeeEngine.updateStatus(e.id, "inactive", "personal leave", "MGR-1");
    expect(u.status).toBe("inactive");
  });

  it("updateStatus rejects change_reason shorter than 3 chars", () => {
    const e = employeeEngine.create(makeInput());
    expect(() => employeeEngine.updateStatus(e.id, "inactive", "ab", "MGR-1"))
      .toThrow(/at least 3 characters/);
  });

  it("updateStatus on terminated employee → cannot change to any other status", () => {
    const e = employeeEngine.create(makeInput());
    employeeEngine.updateStatus(e.id, "terminated", "end of contract", "MGR-2");
    expect(() => employeeEngine.updateStatus(e.id, "active", "reactivate", "MGR-2"))
      .toThrow(/terminated/);
  });

  it("updateStatus on unknown employee throws", () => {
    expect(() => employeeEngine.updateStatus("EMP-NEVER", "inactive", "test reason", "MGR"))
      .toThrow(/not found/);
  });
});

describe("EmployeeEngine — search + list", () => {
  it("list() returns all employees + list('active') filters to active only", () => {
    const e = employeeEngine.create(makeInput());
    const all = employeeEngine.list();
    expect(all.some(emp => emp.id === e.id)).toBe(true);
    const active = employeeEngine.list("active");
    expect(active.every(emp => emp.status === "active")).toBe(true);
  });

  it("search by query matches first_name (case-insensitive)", () => {
    const e = employeeEngine.create(makeInput({ first_name: "Zelda-search-target" }));
    const results = employeeEngine.search({ query: "zelda-search-target" });
    expect(results.some(emp => emp.id === e.id)).toBe(true);
  });

  it("search by status='active' returns only active employees", () => {
    const results = employeeEngine.search({ status: "active" });
    expect(results.every(emp => emp.status === "active")).toBe(true);
  });
});

describe("EmployeeEngine — addSkill + addCertification", () => {
  it("addSkill appends new skill", () => {
    const e = employeeEngine.create(makeInput());
    const u = employeeEngine.addSkill(e.id, { name: "VMC-operation", level: "advanced" } as any);
    expect(u.skills.some(s => s.name === "VMC-operation")).toBe(true);
  });

  it("addSkill on same name updates rather than duplicates", () => {
    const e = employeeEngine.create(makeInput());
    employeeEngine.addSkill(e.id, { name: "WireEDM", level: "novice" } as any);
    employeeEngine.addSkill(e.id, { name: "WireEDM", level: "expert" } as any);
    const e2 = employeeEngine.get(e.id)!;
    const wedm = e2.skills.filter(s => s.name === "WireEDM");
    expect(wedm.length).toBe(1);
  });

  it("addCertification appends cert to employee record", () => {
    const e = employeeEngine.create(makeInput());
    const u = employeeEngine.addCertification(e.id, {
      name: "AS9100", status: "active", issued: "2026-01-01",
    } as any);
    expect(u.certifications.some(c => c.name === "AS9100")).toBe(true);
  });

  it("addSkill on unknown employee throws", () => {
    expect(() => employeeEngine.addSkill("EMP-NEVER", { name: "X", level: "n" } as any))
      .toThrow(/not found/);
  });
});
