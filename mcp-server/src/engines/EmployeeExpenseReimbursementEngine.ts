/**
 * EmployeeExpenseReimbursementEngine — expense submission + approval + reimbursement.
 *
 * 7 categories (mileage/tools/training/travel/per_diem/safety_gear/other).
 * Lifecycle: submitted → approved → reimbursed | rejected. SoD: approver != requester.
 * Cents-resolution + auto-IRS-mileage at 67¢/mi (2026).
 *
 * Hotel-soul: PII-free (employee_id only), Object.frozen, R12 fail-loud, financial-invariant gate.
 *
 * @module EmployeeExpenseReimbursementEngine
 * @milestone HOTEL/U-EMPLOYEE-EXPENSE-REIMBURSEMENT (2026-05-25, slot:hotel iter28 /yolo)
 */

export type ExpenseCategory = "mileage" | "tools" | "training" | "travel" | "per_diem" | "safety_gear" | "other";
export type ExpenseStatus = "submitted" | "approved" | "rejected" | "reimbursed";

const IRS_MILEAGE_CENTS_PER_MILE_2026 = 67; // IRS standard rate FY2026

export interface ExpenseClaim {
  id: string;
  employee_id: string;
  category: ExpenseCategory;
  amount_cents: number;
  description: string;
  incurred_date: string;
  receipt_ref?: string;
  submitted_at: string;
  status: ExpenseStatus;
  approver_employee_id?: string;
  decision_at?: string;
  rejection_reason?: string;
  reimbursed_at?: string;
  reimbursement_ref?: string;
}

class EmployeeExpenseReimbursementEngine {
  private claims: Map<string, ExpenseClaim> = new Map();
  private nextId = 1;

  submitClaim(args: {
    employee_id: string;
    category: ExpenseCategory;
    amount_cents: number;
    description: string;
    incurred_date: string;
    receipt_ref?: string;
  }): ExpenseClaim {
    if (!args.employee_id) throw new Error("EmployeeExpenseReimbursementEngine.submitClaim: employee_id required");
    if (!args.description || args.description.trim().length < 5) {
      throw new Error("EmployeeExpenseReimbursementEngine.submitClaim: description (≥5 chars) required");
    }
    const valid: ExpenseCategory[] = ["mileage", "tools", "training", "travel", "per_diem", "safety_gear", "other"];
    if (!valid.includes(args.category)) {
      throw new Error(`EmployeeExpenseReimbursementEngine.submitClaim: invalid category "${args.category}"`);
    }
    if (!Number.isFinite(args.amount_cents) || args.amount_cents <= 0) {
      throw new Error("EmployeeExpenseReimbursementEngine.submitClaim: amount_cents must be positive finite");
    }
    if (!Number.isInteger(args.amount_cents)) {
      throw new Error("EmployeeExpenseReimbursementEngine.submitClaim: amount_cents must be integer cents (no fractional pennies)");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.incurred_date)) {
      throw new Error("EmployeeExpenseReimbursementEngine.submitClaim: incurred_date must be ISO YYYY-MM-DD");
    }
    const id = `EXP-${String(this.nextId++).padStart(6, "0")}`;
    const claim: ExpenseClaim = Object.freeze({
      id,
      employee_id: args.employee_id,
      category: args.category,
      amount_cents: args.amount_cents,
      description: args.description,
      incurred_date: args.incurred_date,
      submitted_at: new Date().toISOString(),
      status: "submitted" as const,
      ...(args.receipt_ref !== undefined && { receipt_ref: args.receipt_ref }),
    });
    this.claims.set(id, claim);
    return claim;
  }

  /** Compute IRS-mileage amount (2026 rate). Convenience helper. */
  static mileageCents(miles: number): number {
    if (!Number.isFinite(miles) || miles < 0) {
      throw new Error("EmployeeExpenseReimbursementEngine.mileageCents: miles must be non-negative finite");
    }
    return Math.round(miles * IRS_MILEAGE_CENTS_PER_MILE_2026);
  }

  approveClaim(args: { claim_id: string; approver_employee_id: string }): ExpenseClaim {
    const c = this.requireClaim(args.claim_id);
    if (c.status !== "submitted") {
      throw new Error(`EmployeeExpenseReimbursementEngine.approveClaim: claim must be 'submitted' (got '${c.status}')`);
    }
    if (!args.approver_employee_id) {
      throw new Error("EmployeeExpenseReimbursementEngine.approveClaim: approver_employee_id required");
    }
    if (args.approver_employee_id === c.employee_id) {
      throw new Error("EmployeeExpenseReimbursementEngine.approveClaim: approver cannot be requester (segregation of duties)");
    }
    const updated: ExpenseClaim = Object.freeze({
      ...c,
      status: "approved" as const,
      approver_employee_id: args.approver_employee_id,
      decision_at: new Date().toISOString(),
    });
    this.claims.set(c.id, updated);
    return updated;
  }

  rejectClaim(args: { claim_id: string; approver_employee_id: string; reason: string }): ExpenseClaim {
    const c = this.requireClaim(args.claim_id);
    if (c.status !== "submitted") {
      throw new Error(`EmployeeExpenseReimbursementEngine.rejectClaim: claim must be 'submitted' (got '${c.status}')`);
    }
    if (!args.reason || args.reason.trim().length < 5) {
      throw new Error("EmployeeExpenseReimbursementEngine.rejectClaim: reason (≥5 chars) required");
    }
    const updated: ExpenseClaim = Object.freeze({
      ...c,
      status: "rejected" as const,
      approver_employee_id: args.approver_employee_id,
      decision_at: new Date().toISOString(),
      rejection_reason: args.reason,
    });
    this.claims.set(c.id, updated);
    return updated;
  }

  markReimbursed(args: { claim_id: string; reimbursement_ref: string }): ExpenseClaim {
    const c = this.requireClaim(args.claim_id);
    if (c.status !== "approved") {
      throw new Error(`EmployeeExpenseReimbursementEngine.markReimbursed: claim must be 'approved' (got '${c.status}')`);
    }
    if (!args.reimbursement_ref) {
      throw new Error("EmployeeExpenseReimbursementEngine.markReimbursed: reimbursement_ref required");
    }
    const updated: ExpenseClaim = Object.freeze({
      ...c,
      status: "reimbursed" as const,
      reimbursed_at: new Date().toISOString(),
      reimbursement_ref: args.reimbursement_ref,
    });
    this.claims.set(c.id, updated);
    return updated;
  }

  listClaims(args: { employee_id?: string; status?: ExpenseStatus; category?: ExpenseCategory }): ReadonlyArray<ExpenseClaim> {
    const out: ExpenseClaim[] = [];
    for (const c of this.claims.values()) {
      if (args.employee_id && c.employee_id !== args.employee_id) continue;
      if (args.status && c.status !== args.status) continue;
      if (args.category && c.category !== args.category) continue;
      out.push(Object.freeze({ ...c }));
    }
    return Object.freeze(out);
  }

  /** Sum approved/reimbursed claims for payroll-period inclusion. */
  outstandingForReimbursement(employee_id: string): { approved_count: number; total_cents: number } {
    let count = 0, total = 0;
    for (const c of this.claims.values()) {
      if (c.employee_id !== employee_id) continue;
      if (c.status === "approved") {
        count++;
        total += c.amount_cents;
      }
    }
    return Object.freeze({ approved_count: count, total_cents: total });
  }

  reset(): void {
    this.claims.clear();
    this.nextId = 1;
  }

  private requireClaim(id: string): ExpenseClaim {
    const c = this.claims.get(id);
    if (!c) throw new Error(`EmployeeExpenseReimbursementEngine: unknown claim_id "${id}"`);
    return c;
  }
}

export const employeeExpenseReimbursementEngine = new EmployeeExpenseReimbursementEngine();
export const EXPENSE_IRS_MILEAGE_RATE_CENTS_2026 = IRS_MILEAGE_CENTS_PER_MILE_2026;
