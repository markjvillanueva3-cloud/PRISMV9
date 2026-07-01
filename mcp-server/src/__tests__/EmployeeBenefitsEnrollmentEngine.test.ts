/**
 * EmployeeBenefitsEnrollmentEngine.test.ts — HOTEL/U-EMPLOYEE-BENEFITS-ENROLLMENT (iter30 /yolo)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeBenefitsEnrollmentEngine } from "../engines/EmployeeBenefitsEnrollmentEngine.js";

const OE_BASE = {
  employee_id: "EMP-001",
  benefit_type: "medical" as const,
  plan_code: "PPO-FAMILY",
  employee_premium_cents_per_period: 18500, // $185/period
  employer_contribution_cents_per_period: 42500, // $425/period
  coverage_start_date: "2026-01-01",
  is_open_enrollment: true,
};

describe("EmployeeBenefitsEnrollmentEngine", () => {
  beforeEach(() => employeeBenefitsEnrollmentEngine.reset());

  describe("enroll — happy path + variability", () => {
    it("creates active election in open enrollment", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      expect(e.id).toMatch(/^BEN-\d{6}$/);
      expect(e.status).toBe("active");
      expect(e.employee_premium_cents_per_period).toBe(18500);
      expect(Object.isFrozen(e)).toBe(true);
    });

    it("variability — all 5 benefit types", () => {
      const types: Array<"medical" | "dental" | "vision" | "life_insurance" | "retirement_401k"> = [
        "medical", "dental", "vision", "life_insurance", "retirement_401k",
      ];
      for (const t of types) {
        const e = employeeBenefitsEnrollmentEngine.enroll({ ...OE_BASE, benefit_type: t });
        expect(e.benefit_type).toBe(t);
      }
    });

    it("variability — qualifying life event enrollment (marriage, 30d window)", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll({
        ...OE_BASE,
        is_open_enrollment: false,
        qualifying_event: "marriage",
        qualifying_event_date: "2026-06-10",
        coverage_start_date: "2026-06-20", // within 30d
      });
      expect(e.qualifying_event).toBe("marriage");
      expect(e.status).toBe("active");
    });

    it("variability — birth_adoption qualifying event", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll({
        ...OE_BASE,
        is_open_enrollment: false,
        qualifying_event: "birth_adoption",
        qualifying_event_date: "2026-07-01",
        coverage_start_date: "2026-07-15",
      });
      expect(e.qualifying_event).toBe("birth_adoption");
    });

    it("R12 — neither open-enrollment nor qualifying event", () => {
      expect(() =>
        employeeBenefitsEnrollmentEngine.enroll({
          ...OE_BASE,
          is_open_enrollment: false,
        }),
      ).toThrow(/either open-enrollment OR a qualifying_life_event/);
    });

    it("R12 — qualifying event date >30 days from coverage_start", () => {
      expect(() =>
        employeeBenefitsEnrollmentEngine.enroll({
          ...OE_BASE,
          is_open_enrollment: false,
          qualifying_event: "marriage",
          qualifying_event_date: "2026-06-01",
          coverage_start_date: "2026-08-01", // 60+ days later
        }),
      ).toThrow(/within 30 days of qualifying_event_date/);
    });

    it("R12 — fractional cents on premium rejected", () => {
      expect(() =>
        employeeBenefitsEnrollmentEngine.enroll({
          ...OE_BASE,
          employee_premium_cents_per_period: 185.5,
        }),
      ).toThrow(/employee_premium_cents_per_period must be non-negative integer/);
    });

    it("R12 — invalid benefit_type", () => {
      expect(() =>
        employeeBenefitsEnrollmentEngine.enroll({
          ...OE_BASE,
          benefit_type: "pet_insurance" as never,
        }),
      ).toThrow(/invalid benefit_type/);
    });

    it("R12 — invalid qualifying_event", () => {
      expect(() =>
        employeeBenefitsEnrollmentEngine.enroll({
          ...OE_BASE,
          is_open_enrollment: false,
          qualifying_event: "vacation" as never,
          qualifying_event_date: "2026-06-01",
          coverage_start_date: "2026-06-10",
        }),
      ).toThrow(/invalid qualifying_event/);
    });

    it("R12 — bad date format", () => {
      expect(() =>
        employeeBenefitsEnrollmentEngine.enroll({
          ...OE_BASE,
          coverage_start_date: "Jan 1",
        }),
      ).toThrow(/coverage_start_date must be ISO/);
    });
  });

  describe("cancelElection", () => {
    it("cancels active election with reason", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      const c = employeeBenefitsEnrollmentEngine.cancelElection({
        election_id: e.id,
        reason: "Moved to spouse's plan after marriage",
      });
      expect(c.status).toBe("cancelled");
      expect(c.cancelled_at).not.toBeNull();
    });

    it("R12 — cannot re-cancel", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      employeeBenefitsEnrollmentEngine.cancelElection({ election_id: e.id, reason: "first cancel" });
      expect(() =>
        employeeBenefitsEnrollmentEngine.cancelElection({ election_id: e.id, reason: "second cancel" }),
      ).toThrow(/must be 'active'/);
    });

    it("R12 — short reason", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      expect(() =>
        employeeBenefitsEnrollmentEngine.cancelElection({ election_id: e.id, reason: "x" }),
      ).toThrow(/reason \(≥5 chars\) required/);
    });
  });

  describe("getPayrollDeductions — payroll bridge", () => {
    it("sums employee+employer deductions across 3 active elections", () => {
      employeeBenefitsEnrollmentEngine.enroll({
        ...OE_BASE,
        benefit_type: "medical",
        employee_premium_cents_per_period: 18500,
        employer_contribution_cents_per_period: 42500,
      });
      employeeBenefitsEnrollmentEngine.enroll({
        ...OE_BASE,
        benefit_type: "dental",
        plan_code: "DENTAL-PLUS",
        employee_premium_cents_per_period: 2500,
        employer_contribution_cents_per_period: 1500,
      });
      employeeBenefitsEnrollmentEngine.enroll({
        ...OE_BASE,
        benefit_type: "vision",
        plan_code: "VISION-STD",
        employee_premium_cents_per_period: 800,
        employer_contribution_cents_per_period: 800,
      });
      const d = employeeBenefitsEnrollmentEngine.getPayrollDeductions({ employee_id: "EMP-001" });
      expect(d.total_employee_deduction_cents).toBe(21800); // 185 + 25 + 8 = $218
      expect(d.total_employer_contribution_cents).toBe(44800); // $448
      expect(d.line_items).toHaveLength(3);
    });

    it("excludes cancelled elections from totals", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      employeeBenefitsEnrollmentEngine.cancelElection({
        election_id: e.id,
        reason: "Switched plans",
      });
      const d = employeeBenefitsEnrollmentEngine.getPayrollDeductions({ employee_id: "EMP-001" });
      expect(d.total_employee_deduction_cents).toBe(0);
      expect(d.line_items).toHaveLength(0);
    });
  });

  describe("listElections filtering", () => {
    it("filters by benefit_type", () => {
      employeeBenefitsEnrollmentEngine.enroll({ ...OE_BASE, benefit_type: "medical" });
      employeeBenefitsEnrollmentEngine.enroll({ ...OE_BASE, benefit_type: "dental" });
      const medical = employeeBenefitsEnrollmentEngine.listElections({ benefit_type: "medical" });
      expect(medical).toHaveLength(1);
    });

    it("filters by status", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      employeeBenefitsEnrollmentEngine.cancelElection({ election_id: e.id, reason: "Plan change" });
      const cancelled = employeeBenefitsEnrollmentEngine.listElections({ status: "cancelled" });
      expect(cancelled).toHaveLength(1);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned election frozen", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      expect(Object.isFrozen(e)).toBe(true);
    });

    it("PII-free — no name/SSN/DOB/dependents in election shape", () => {
      const e = employeeBenefitsEnrollmentEngine.enroll(OE_BASE);
      const keys = Object.keys(e);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
      expect(keys).not.toContain("dependents");
      expect(keys).not.toContain("address");
    });
  });
});
