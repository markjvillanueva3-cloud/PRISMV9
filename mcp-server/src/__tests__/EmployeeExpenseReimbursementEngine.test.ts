/**
 * EmployeeExpenseReimbursementEngine.test.ts — HOTEL/U-EMPLOYEE-EXPENSE-REIMBURSEMENT (iter28 /yolo)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  employeeExpenseReimbursementEngine,
  EXPENSE_IRS_MILEAGE_RATE_CENTS_2026,
} from "../engines/EmployeeExpenseReimbursementEngine.js";

const BASE = {
  employee_id: "EMP-001",
  category: "tools" as const,
  amount_cents: 12500,
  description: "Mitutoyo digital caliper purchase for QC lab",
  incurred_date: "2026-06-15",
};

describe("EmployeeExpenseReimbursementEngine", () => {
  beforeEach(() => employeeExpenseReimbursementEngine.reset());

  describe("submitClaim — happy path + R12", () => {
    it("creates submitted claim", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      expect(c.id).toMatch(/^EXP-\d{6}$/);
      expect(c.status).toBe("submitted");
      expect(c.amount_cents).toBe(12500);
      expect(Object.isFrozen(c)).toBe(true);
    });

    it("variability — accepts all 7 categories", () => {
      const cats: Array<"mileage" | "tools" | "training" | "travel" | "per_diem" | "safety_gear" | "other"> = [
        "mileage", "tools", "training", "travel", "per_diem", "safety_gear", "other",
      ];
      for (const cat of cats) {
        const c = employeeExpenseReimbursementEngine.submitClaim({ ...BASE, category: cat });
        expect(c.category).toBe(cat);
      }
    });

    it("R12 throws on negative amount", () => {
      expect(() =>
        employeeExpenseReimbursementEngine.submitClaim({ ...BASE, amount_cents: -100 }),
      ).toThrow(/amount_cents must be positive/);
    });

    it("R12 throws on fractional cents", () => {
      expect(() =>
        employeeExpenseReimbursementEngine.submitClaim({ ...BASE, amount_cents: 100.5 }),
      ).toThrow(/integer cents/);
    });

    it("R12 throws on NaN amount", () => {
      expect(() =>
        employeeExpenseReimbursementEngine.submitClaim({ ...BASE, amount_cents: Number.NaN }),
      ).toThrow(/amount_cents must be positive finite/);
    });

    it("R12 throws on invalid category", () => {
      expect(() =>
        employeeExpenseReimbursementEngine.submitClaim({ ...BASE, category: "bribery" as never }),
      ).toThrow(/invalid category/);
    });

    it("R12 throws on bad date", () => {
      expect(() =>
        employeeExpenseReimbursementEngine.submitClaim({ ...BASE, incurred_date: "June 15" }),
      ).toThrow(/incurred_date must be ISO/);
    });
  });

  describe("IRS mileage at 2026 rate ($0.67/mi)", () => {
    it("constant exported", () => {
      expect(EXPENSE_IRS_MILEAGE_RATE_CENTS_2026).toBe(67);
    });

    it("50 miles → $33.50", () => {
      const cents = (employeeExpenseReimbursementEngine.constructor as any).mileageCents(50);
      expect(cents).toBe(3350);
    });

    it("100 miles → $67.00", () => {
      const cents = (employeeExpenseReimbursementEngine.constructor as any).mileageCents(100);
      expect(cents).toBe(6700);
    });

    it("R12 throws on negative miles", () => {
      expect(() =>
        (employeeExpenseReimbursementEngine.constructor as any).mileageCents(-5),
      ).toThrow(/miles must be non-negative/);
    });
  });

  describe("Approval workflow + SoD", () => {
    it("approve transitions to approved", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      const a = employeeExpenseReimbursementEngine.approveClaim({
        claim_id: c.id,
        approver_employee_id: "EMP-MGR",
      });
      expect(a.status).toBe("approved");
      expect(a.approver_employee_id).toBe("EMP-MGR");
    });

    it("R12 — approver cannot equal requester (SoD)", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      expect(() =>
        employeeExpenseReimbursementEngine.approveClaim({
          claim_id: c.id,
          approver_employee_id: "EMP-001",
        }),
      ).toThrow(/approver cannot be requester/);
    });

    it("reject captures reason without changing balance", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      const r = employeeExpenseReimbursementEngine.rejectClaim({
        claim_id: c.id,
        approver_employee_id: "EMP-MGR",
        reason: "Receipt missing — resubmit with documentation",
      });
      expect(r.status).toBe("rejected");
      expect(r.rejection_reason).toContain("Receipt missing");
    });

    it("R12 — cannot re-approve", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      employeeExpenseReimbursementEngine.approveClaim({
        claim_id: c.id, approver_employee_id: "EMP-MGR",
      });
      expect(() =>
        employeeExpenseReimbursementEngine.approveClaim({
          claim_id: c.id, approver_employee_id: "EMP-MGR2",
        }),
      ).toThrow(/must be 'submitted'/);
    });
  });

  describe("Reimbursement + payroll handoff", () => {
    it("markReimbursed transitions + stores ref", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      employeeExpenseReimbursementEngine.approveClaim({
        claim_id: c.id, approver_employee_id: "EMP-MGR",
      });
      const r = employeeExpenseReimbursementEngine.markReimbursed({
        claim_id: c.id,
        reimbursement_ref: "ACH-2026-07-15-0042",
      });
      expect(r.status).toBe("reimbursed");
      expect(r.reimbursement_ref).toBe("ACH-2026-07-15-0042");
    });

    it("outstandingForReimbursement sums approved-only claims", () => {
      const c1 = employeeExpenseReimbursementEngine.submitClaim({ ...BASE, amount_cents: 10000 });
      const c2 = employeeExpenseReimbursementEngine.submitClaim({ ...BASE, amount_cents: 25000 });
      const c3 = employeeExpenseReimbursementEngine.submitClaim({ ...BASE, amount_cents: 5000 });
      // Approve c1+c2, reject c3
      employeeExpenseReimbursementEngine.approveClaim({ claim_id: c1.id, approver_employee_id: "EMP-MGR" });
      employeeExpenseReimbursementEngine.approveClaim({ claim_id: c2.id, approver_employee_id: "EMP-MGR" });
      employeeExpenseReimbursementEngine.rejectClaim({
        claim_id: c3.id, approver_employee_id: "EMP-MGR", reason: "duplicate of c1",
      });
      const out = employeeExpenseReimbursementEngine.outstandingForReimbursement("EMP-001");
      expect(out.approved_count).toBe(2);
      expect(out.total_cents).toBe(35000);
    });
  });

  describe("listClaims filtering", () => {
    it("filters by category + status", () => {
      employeeExpenseReimbursementEngine.submitClaim({ ...BASE, category: "tools" });
      employeeExpenseReimbursementEngine.submitClaim({ ...BASE, category: "mileage" });
      const tools = employeeExpenseReimbursementEngine.listClaims({ category: "tools" });
      expect(tools).toHaveLength(1);
      const submitted = employeeExpenseReimbursementEngine.listClaims({ status: "submitted" });
      expect(submitted).toHaveLength(2);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned claims frozen", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      expect(Object.isFrozen(c)).toBe(true);
    });

    it("PII-free", () => {
      const c = employeeExpenseReimbursementEngine.submitClaim(BASE);
      const keys = Object.keys(c);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("bank_account");
    });
  });
});
