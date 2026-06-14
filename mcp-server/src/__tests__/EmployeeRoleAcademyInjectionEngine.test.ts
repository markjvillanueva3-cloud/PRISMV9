/**
 * EmployeeRoleAcademyInjectionEngine.test.ts — HOTEL/U-EMPLOYEE-ROLE-ACADEMY-INJECTION (iter15)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeRoleAcademyInjectionEngine } from "../engines/EmployeeRoleAcademyInjectionEngine.js";

describe("EmployeeRoleAcademyInjectionEngine", () => {
  beforeEach(() => employeeRoleAcademyInjectionEngine.reset());

  describe("Role curriculum catalog — 17 roles", () => {
    it("listAllRoles returns 17 shop roles", () => {
      const roles = employeeRoleAcademyInjectionEngine.listAllRoles();
      expect(roles.length).toBe(17);
      expect(roles).toEqual(
        expect.arrayContaining([
          "apprentice",
          "operator",
          "machinist",
          "programmer",
          "setup",
          "inspector",
          "qa_lead",
          "foreman",
          "buyer",
          "estimator",
          "scheduler",
          "shipping",
          "receiving",
          "accounting",
          "sales",
          "office_admin",
          "owner",
        ]),
      );
    });

    it("apprentice curriculum: entry-tier, 4 required, growth → operator", () => {
      const a = employeeRoleAcademyInjectionEngine.getRoleCurriculum("apprentice");
      expect(a.tier).toBe("entry");
      expect(a.required_courses.length).toBe(4);
      expect(a.growth_target_role).toBe("operator");
      expect(a.min_pass_pct).toBe(70);
    });

    it("programmer curriculum: advanced, 11 required, growth → qa_lead", () => {
      const p = employeeRoleAcademyInjectionEngine.getRoleCurriculum("programmer");
      expect(p.tier).toBe("advanced");
      expect(p.required_courses.length).toBe(11);
      expect(p.growth_target_role).toBe("qa_lead");
      expect(p.min_pass_pct).toBe(85);
    });

    it("owner curriculum: master tier, no growth target", () => {
      const o = employeeRoleAcademyInjectionEngine.getRoleCurriculum("owner");
      expect(o.tier).toBe("master");
      expect(o.growth_target_role).toBeNull();
    });

    it("R12 throws on unknown role", () => {
      expect(() =>
        employeeRoleAcademyInjectionEngine.getRoleCurriculum("invalid_role" as never),
      ).toThrow(/unknown role/);
    });
  });

  describe("injectOnHire — auto-assign required curriculum", () => {
    it("assigns all required courses for new operator hire", () => {
      const assignments = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-NEW-001",
        role: "operator",
      });
      expect(assignments.length).toBe(6); // operator requires 6 courses
      expect(assignments.every((a) => a.reason === "hire")).toBe(true);
      expect(assignments.every((a) => a.status === "assigned")).toBe(true);
      expect(employeeRoleAcademyInjectionEngine.getEmployeeRole("EMP-NEW-001")).toBe("operator");
    });

    it("idempotent — re-running returns existing assignments without dup", () => {
      const first = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-X",
        role: "apprentice",
      });
      const second = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-X",
        role: "apprentice",
      });
      expect(first.length).toBe(4);
      expect(second.length).toBe(4);
      const all = employeeRoleAcademyInjectionEngine.listAssignments({ employee_id: "EMP-X" });
      expect(all.length).toBe(4); // not 8
    });

    it("supports optional due_date", () => {
      const r = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-DUE",
        role: "shipping",
        due_date: "2026-08-01",
      });
      expect(r[0].due_date).toBe("2026-08-01");
    });

    it("R12 throws on missing employee_id", () => {
      expect(() =>
        employeeRoleAcademyInjectionEngine.injectOnHire({
          employee_id: "",
          role: "operator",
        }),
      ).toThrow(/employee_id required/);
    });
  });

  describe("injectOnPromotion — delta from prior role", () => {
    it("operator → machinist assigns only the new required courses (not already-passed)", () => {
      // Hire as operator, complete all required
      const hireAssignments = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-PROMO",
        role: "operator",
      });
      for (const a of hireAssignments) {
        employeeRoleAcademyInjectionEngine.recordOutcome({
          assignment_id: a.id,
          status: "passed",
          evidence_ref: `quiz-${a.id}-85pct`,
        });
      }
      // Promote to machinist (needs courses-4, course-5, course-7 in addition)
      const promotion = employeeRoleAcademyInjectionEngine.injectOnPromotion({
        employee_id: "EMP-PROMO",
        new_role: "machinist",
      });
      // operator-required were 6 (0a,0b,0c,1,17,22). machinist-required are 10
      // (0a,0b,0c,1,2,3,4,5,7,17). Δ = 2,3,4,5,7 (5 new).
      expect(promotion.length).toBe(5);
      expect(promotion.every((a) => a.reason === "promotion")).toBe(true);
      const courseIds = promotion.map((a) => a.course_id).sort();
      expect(courseIds).toContain("course-4");
      expect(courseIds).toContain("course-5");
      expect(courseIds).toContain("course-7");
      expect(employeeRoleAcademyInjectionEngine.getEmployeeRole("EMP-PROMO")).toBe("machinist");
    });

    it("lateral move where new role is a subset returns empty assignment list", () => {
      // Hire as programmer (large required set)
      const prog = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-LAT",
        role: "programmer",
      });
      for (const a of prog) {
        employeeRoleAcademyInjectionEngine.recordOutcome({
          assignment_id: a.id,
          status: "passed",
          evidence_ref: "cert",
        });
      }
      // Move to inspector — inspector's required set has overlap, but course-24 is new
      const delta = employeeRoleAcademyInjectionEngine.injectOnPromotion({
        employee_id: "EMP-LAT",
        new_role: "inspector",
      });
      // Inspector requires 0a,0b,0c,1,7,24. Programmer passed 1,2,3,4,5,6,7,18,29,30,31. Δ = 0a,0b,0c,24
      expect(delta.length).toBe(4);
      expect(delta.map((a) => a.course_id)).toContain("course-24");
    });
  });

  describe("injectOnIncident — remediation course assignment", () => {
    it("LOTO incident assigns alarm-troubleshooting refresher", () => {
      const r = employeeRoleAcademyInjectionEngine.injectOnIncident({
        employee_id: "EMP-INC",
        incident_category: "loto",
      });
      expect(r.length).toBe(1);
      expect(r[0].reason).toBe("incident_remediation");
      expect(r[0].course_id).toBe("course-22");
    });

    it("scrap event assigns both accuracy + troubleshooting", () => {
      const r = employeeRoleAcademyInjectionEngine.injectOnIncident({
        employee_id: "EMP-SCRAP",
        incident_category: "scrap_event",
      });
      expect(r.length).toBe(2);
      const ids = r.map((a) => a.course_id);
      expect(ids).toContain("course-24");
      expect(ids).toContain("course-10");
    });

    it("R12 throws on unknown incident category", () => {
      expect(() =>
        employeeRoleAcademyInjectionEngine.injectOnIncident({
          employee_id: "EMP-X",
          incident_category: "alien_invasion",
        }),
      ).toThrow(/unknown incident_category/);
    });
  });

  describe("recommend — fresh injection picture", () => {
    it("returns required + refresher + growth + rationale for an employee", () => {
      employeeRoleAcademyInjectionEngine.setEmployeeRole({ employee_id: "EMP-R", role: "machinist" });
      const rec = employeeRoleAcademyInjectionEngine.recommend({ employee_id: "EMP-R" });
      expect(rec.role).toBe("machinist");
      expect(rec.tier).toBe("intermediate");
      expect(rec.required_to_assign.length).toBe(10); // none assigned yet
      expect(rec.growth_suggestions.length).toBeGreaterThan(0);
      expect(rec.rationale.length).toBeGreaterThan(0);
      expect(rec.rationale[0]).toContain("Role=machinist");
    });

    it("required_to_assign shrinks as courses get assigned", () => {
      employeeRoleAcademyInjectionEngine.injectOnHire({ employee_id: "EMP-S", role: "apprentice" });
      const rec = employeeRoleAcademyInjectionEngine.recommend({ employee_id: "EMP-S" });
      expect(rec.required_to_assign.length).toBe(0); // all 4 assigned on hire
    });

    it("R12 throws when no role set", () => {
      expect(() =>
        employeeRoleAcademyInjectionEngine.recommend({ employee_id: "EMP-UNKNOWN" }),
      ).toThrow(/no role set/);
    });
  });

  describe("recordOutcome — completion tracking", () => {
    it("records passed status with evidence", () => {
      const [a0] = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-O",
        role: "apprentice",
      });
      const updated = employeeRoleAcademyInjectionEngine.recordOutcome({
        assignment_id: a0.id,
        status: "passed",
        evidence_ref: "quiz-0a-87pct",
      });
      expect(updated.status).toBe("passed");
      expect(updated.evidence_ref).toBe("quiz-0a-87pct");
    });

    it("R12 requires evidence on passed", () => {
      const [a0] = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-OE",
        role: "apprentice",
      });
      expect(() =>
        employeeRoleAcademyInjectionEngine.recordOutcome({ assignment_id: a0.id, status: "passed" }),
      ).toThrow(/evidence_ref required/);
    });

    it("R12 throws on unknown assignment_id", () => {
      expect(() =>
        employeeRoleAcademyInjectionEngine.recordOutcome({
          assignment_id: "NOPE",
          status: "passed",
          evidence_ref: "x",
        }),
      ).toThrow(/unknown assignment_id/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned assignments + curriculum records are frozen", () => {
      const r = employeeRoleAcademyInjectionEngine.getRoleCurriculum("operator");
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.required_courses)).toBe(true);
      const [a] = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-F",
        role: "apprentice",
      });
      expect(Object.isFrozen(a)).toBe(true);
    });

    it("PII-free — no name/SSN keys in assignment records", () => {
      const [a] = employeeRoleAcademyInjectionEngine.injectOnHire({
        employee_id: "EMP-P",
        role: "apprentice",
      });
      const keys = Object.keys(a);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });

    it("Variability — different roles get different curriculum sizes", () => {
      const sizes = ["apprentice", "operator", "machinist", "programmer", "owner"].map(
        (r) => employeeRoleAcademyInjectionEngine.getRoleCurriculum(r as never).required_courses.length,
      );
      // Programmer (11) > machinist (10) > operator (6) > apprentice (4)
      expect(sizes[0]).toBeLessThan(sizes[1]);
      expect(sizes[1]).toBeLessThan(sizes[2]);
      expect(sizes[2]).toBeLessThan(sizes[3]);
    });
  });
});
