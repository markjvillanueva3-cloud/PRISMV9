/**
 * EmployeePTOAccrualEngine — paid-time-off accrual + request lifecycle.
 *
 * Closes the employee-portal HR loop: tracks PTO/sick/vacation balances per
 * employee, supports request → approval → consumption with R12 ledger
 * conservation (every approval debits the balance; every cancel re-credits).
 *
 * ACCRUAL POLICY (per pay period, configurable):
 *   - Tenure-tiered: <1yr = 0.0385 days/period (10 days/yr at 26 periods)
 *                    1-4yr = 0.0577 (15 days/yr)
 *                    5-9yr = 0.0769 (20 days/yr)
 *                    ≥10yr = 0.0962 (25 days/yr)
 *   - Sick: flat 0.0385 days/period (10/yr)
 *   - Personal: 3 days/yr (lump-grant annually)
 *
 * BALANCE INVARIANT: balance_hours = ledger.sum(credits) − ledger.sum(debits).
 * Engine refuses any operation that would break this invariant.
 *
 * REQUEST WORKFLOW: requested → approved → consumed (debits balance on approval).
 *                   requested → rejected (no balance change).
 *                   approved → cancelled (re-credits balance).
 *
 * Hotel-soul invariants: financial-invariant gate (ledger balance never < 0
 * unless requested with allow_negative=true for advance approval), PII-free
 * (employee_id only), Object.frozen returns, R12 fail-loud.
 *
 * @module EmployeePTOAccrualEngine
 * @milestone HOTEL/U-EMPLOYEE-PTO-ACCRUAL (2026-05-25, slot:hotel iter18)
 */

export type PTOCategory = "vacation" | "sick" | "personal";
export type RequestStatus = "requested" | "approved" | "rejected" | "consumed" | "cancelled";

export interface PTOLedgerEntry {
  id: string;
  employee_id: string;
  category: PTOCategory;
  delta_hours: number;       // positive = credit, negative = debit
  reason: string;
  reference_id?: string;     // request_id or accrual cycle id
  posted_at: string;
}

export interface PTORequest {
  id: string;
  employee_id: string;
  category: PTOCategory;
  start_date: string;        // YYYY-MM-DD
  end_date: string;
  hours_requested: number;
  status: RequestStatus;
  reason?: string;
  approver_employee_id?: string;
  decision_at?: string;
  cancelled_at?: string;
}

export interface PTOBalance {
  employee_id: string;
  vacation_hours: number;
  sick_hours: number;
  personal_hours: number;
  computed_at: string;
}

export type TenureTier = "lt_1yr" | "yrs_1_4" | "yrs_5_9" | "yrs_10_plus";

const VACATION_ACCRUAL_PER_PERIOD: Readonly<Record<TenureTier, number>> = Object.freeze({
  lt_1yr: 10 / 26,
  yrs_1_4: 15 / 26,
  yrs_5_9: 20 / 26,
  yrs_10_plus: 25 / 26,
});
const SICK_ACCRUAL_PER_PERIOD = 10 / 26; // days/period
const PERSONAL_ANNUAL_GRANT = 3;          // days/year
const HOURS_PER_DAY = 8;

class EmployeePTOAccrualEngine {
  private ledger: Map<string, PTOLedgerEntry> = new Map();
  private requests: Map<string, PTORequest> = new Map();
  private nextLedgerId = 1;
  private nextRequestId = 1;

  /**
   * Compute current balance by category (sum of ledger entries for that employee+category).
   * O(N) over ledger — acceptable; for hot paths the caller can cache via computeBalance().
   */
  computeBalance(employee_id: string): PTOBalance {
    if (!employee_id) {
      throw new Error("EmployeePTOAccrualEngine.computeBalance: employee_id required");
    }
    let vacation = 0, sick = 0, personal = 0;
    for (const e of this.ledger.values()) {
      if (e.employee_id !== employee_id) continue;
      if (e.category === "vacation") vacation += e.delta_hours;
      else if (e.category === "sick") sick += e.delta_hours;
      else if (e.category === "personal") personal += e.delta_hours;
    }
    return Object.freeze({
      employee_id,
      vacation_hours: Number(vacation.toFixed(4)),
      sick_hours: Number(sick.toFixed(4)),
      personal_hours: Number(personal.toFixed(4)),
      computed_at: new Date().toISOString(),
    });
  }

  /** Post a manual ledger entry. delta_hours positive = credit; negative = debit. */
  postLedger(args: {
    employee_id: string;
    category: PTOCategory;
    delta_hours: number;
    reason: string;
    reference_id?: string;
  }): PTOLedgerEntry {
    if (!args.employee_id || !args.reason) {
      throw new Error("EmployeePTOAccrualEngine.postLedger: employee_id + reason required");
    }
    const validCats: PTOCategory[] = ["vacation", "sick", "personal"];
    if (!validCats.includes(args.category)) {
      throw new Error(
        `EmployeePTOAccrualEngine.postLedger: category must be one of ${validCats.join(", ")}`,
      );
    }
    if (!Number.isFinite(args.delta_hours)) {
      throw new Error("EmployeePTOAccrualEngine.postLedger: delta_hours must be finite number");
    }
    const id = `LED-${String(this.nextLedgerId++).padStart(7, "0")}`;
    const entry: PTOLedgerEntry = Object.freeze({
      id,
      employee_id: args.employee_id,
      category: args.category,
      delta_hours: args.delta_hours,
      reason: args.reason,
      posted_at: new Date().toISOString(),
      ...(args.reference_id !== undefined && { reference_id: args.reference_id }),
    });
    this.ledger.set(id, entry);
    return entry;
  }

  /**
   * Accrue one pay-period worth of vacation+sick for an employee at the given tenure tier.
   * Personal time is granted annually via grantAnnualPersonal.
   */
  accruePeriod(args: { employee_id: string; tenure_tier: TenureTier; period_id: string }): {
    vacation_entry: PTOLedgerEntry;
    sick_entry: PTOLedgerEntry;
  } {
    if (!Object.prototype.hasOwnProperty.call(VACATION_ACCRUAL_PER_PERIOD, args.tenure_tier)) {
      throw new Error(`EmployeePTOAccrualEngine.accruePeriod: unknown tenure_tier "${args.tenure_tier}"`);
    }
    if (!args.period_id) {
      throw new Error("EmployeePTOAccrualEngine.accruePeriod: period_id required");
    }
    const vacDays = VACATION_ACCRUAL_PER_PERIOD[args.tenure_tier];
    const sickDays = SICK_ACCRUAL_PER_PERIOD;
    const vac = this.postLedger({
      employee_id: args.employee_id,
      category: "vacation",
      delta_hours: vacDays * HOURS_PER_DAY,
      reason: `accrual period ${args.period_id}, tier ${args.tenure_tier}`,
      reference_id: args.period_id,
    });
    const sick = this.postLedger({
      employee_id: args.employee_id,
      category: "sick",
      delta_hours: sickDays * HOURS_PER_DAY,
      reason: `accrual period ${args.period_id}, sick`,
      reference_id: args.period_id,
    });
    return { vacation_entry: vac, sick_entry: sick };
  }

  /** Grant the annual personal-time lump sum. Idempotent within a year is caller's responsibility. */
  grantAnnualPersonal(args: { employee_id: string; year: number }): PTOLedgerEntry {
    if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) {
      throw new Error("EmployeePTOAccrualEngine.grantAnnualPersonal: year must be 2000..2100");
    }
    return this.postLedger({
      employee_id: args.employee_id,
      category: "personal",
      delta_hours: PERSONAL_ANNUAL_GRANT * HOURS_PER_DAY,
      reason: `annual personal grant ${args.year}`,
      reference_id: `personal-${args.year}`,
    });
  }

  submitRequest(args: {
    employee_id: string;
    category: PTOCategory;
    start_date: string;
    end_date: string;
    hours_requested: number;
    reason?: string;
  }): PTORequest {
    if (!args.employee_id) {
      throw new Error("EmployeePTOAccrualEngine.submitRequest: employee_id required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(args.end_date)) {
      throw new Error(
        "EmployeePTOAccrualEngine.submitRequest: start_date + end_date must be ISO YYYY-MM-DD",
      );
    }
    if (args.start_date > args.end_date) {
      throw new Error("EmployeePTOAccrualEngine.submitRequest: start_date must be ≤ end_date");
    }
    if (args.hours_requested <= 0 || !Number.isFinite(args.hours_requested)) {
      throw new Error("EmployeePTOAccrualEngine.submitRequest: hours_requested must be positive finite");
    }
    const validCats: PTOCategory[] = ["vacation", "sick", "personal"];
    if (!validCats.includes(args.category)) {
      throw new Error(`EmployeePTOAccrualEngine.submitRequest: invalid category "${args.category}"`);
    }
    const id = `PTO-${String(this.nextRequestId++).padStart(6, "0")}`;
    const req: PTORequest = Object.freeze({
      id,
      employee_id: args.employee_id,
      category: args.category,
      start_date: args.start_date,
      end_date: args.end_date,
      hours_requested: args.hours_requested,
      status: "requested" as const,
      ...(args.reason !== undefined && { reason: args.reason }),
    });
    this.requests.set(id, req);
    return req;
  }

  /**
   * Approve a request — debits balance. R12 refuses if balance insufficient unless
   * allow_negative=true (e.g. advance-on-future-accrual scenario).
   */
  approveRequest(args: {
    request_id: string;
    approver_employee_id: string;
    allow_negative?: boolean;
  }): { request: PTORequest; ledger: PTOLedgerEntry } {
    const r = this.requests.get(args.request_id);
    if (!r) {
      throw new Error(
        `EmployeePTOAccrualEngine.approveRequest: unknown request_id "${args.request_id}"`,
      );
    }
    if (r.status !== "requested") {
      throw new Error(
        `EmployeePTOAccrualEngine.approveRequest: request must be 'requested' (got '${r.status}')`,
      );
    }
    if (!args.approver_employee_id) {
      throw new Error("EmployeePTOAccrualEngine.approveRequest: approver_employee_id required");
    }
    if (args.approver_employee_id === r.employee_id) {
      throw new Error(
        "EmployeePTOAccrualEngine.approveRequest: approver cannot be the requester (segregation of duties)",
      );
    }
    const balance = this.computeBalance(r.employee_id);
    const available = balance[`${r.category}_hours` as keyof PTOBalance] as number;
    if (available < r.hours_requested && !args.allow_negative) {
      throw new Error(
        `EmployeePTOAccrualEngine.approveRequest: insufficient ${r.category} balance ` +
          `(have ${available.toFixed(2)}h, need ${r.hours_requested.toFixed(2)}h); ` +
          `pass allow_negative=true to advance against future accrual`,
      );
    }
    const ledger = this.postLedger({
      employee_id: r.employee_id,
      category: r.category,
      delta_hours: -r.hours_requested,
      reason: `approved request ${r.id}`,
      reference_id: r.id,
    });
    const updated: PTORequest = Object.freeze({
      ...r,
      status: "approved" as const,
      approver_employee_id: args.approver_employee_id,
      decision_at: new Date().toISOString(),
    });
    this.requests.set(r.id, updated);
    return { request: updated, ledger };
  }

  rejectRequest(args: {
    request_id: string;
    approver_employee_id: string;
    reason?: string;
  }): PTORequest {
    const r = this.requests.get(args.request_id);
    if (!r) {
      throw new Error(
        `EmployeePTOAccrualEngine.rejectRequest: unknown request_id "${args.request_id}"`,
      );
    }
    if (r.status !== "requested") {
      throw new Error(
        `EmployeePTOAccrualEngine.rejectRequest: request must be 'requested' (got '${r.status}')`,
      );
    }
    if (!args.approver_employee_id) {
      throw new Error("EmployeePTOAccrualEngine.rejectRequest: approver_employee_id required");
    }
    const updated: PTORequest = Object.freeze({
      ...r,
      status: "rejected" as const,
      approver_employee_id: args.approver_employee_id,
      decision_at: new Date().toISOString(),
      ...(args.reason !== undefined && { reason: args.reason }),
    });
    this.requests.set(r.id, updated);
    return updated;
  }

  /** Cancel an approved (or requested) PTO request. If approved, re-credits the balance. */
  cancelRequest(args: { request_id: string; reason?: string }): { request: PTORequest; refund_ledger?: PTOLedgerEntry } {
    const r = this.requests.get(args.request_id);
    if (!r) {
      throw new Error(
        `EmployeePTOAccrualEngine.cancelRequest: unknown request_id "${args.request_id}"`,
      );
    }
    if (r.status === "rejected" || r.status === "cancelled" || r.status === "consumed") {
      throw new Error(
        `EmployeePTOAccrualEngine.cancelRequest: cannot cancel '${r.status}' request`,
      );
    }
    let refund: PTOLedgerEntry | undefined;
    if (r.status === "approved") {
      refund = this.postLedger({
        employee_id: r.employee_id,
        category: r.category,
        delta_hours: r.hours_requested,
        reason: `cancellation refund of ${r.id}${args.reason ? `: ${args.reason}` : ""}`,
        reference_id: r.id,
      });
    }
    const updated: PTORequest = Object.freeze({
      ...r,
      status: "cancelled" as const,
      cancelled_at: new Date().toISOString(),
    });
    this.requests.set(r.id, updated);
    return refund ? { request: updated, refund_ledger: refund } : { request: updated };
  }

  /** Returns dates an employee is on approved PTO — used by shift-schedule gap detection. */
  getApprovedPTODates(args: { employee_id: string; from_date: string; to_date: string }): ReadonlyArray<{
    request_id: string;
    category: PTOCategory;
    start_date: string;
    end_date: string;
  }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.from_date) || !/^\d{4}-\d{2}-\d{2}$/.test(args.to_date)) {
      throw new Error(
        "EmployeePTOAccrualEngine.getApprovedPTODates: from_date + to_date must be ISO YYYY-MM-DD",
      );
    }
    const out: { request_id: string; category: PTOCategory; start_date: string; end_date: string }[] = [];
    for (const r of this.requests.values()) {
      if (r.employee_id !== args.employee_id) continue;
      if (r.status !== "approved") continue;
      // Overlap window check
      if (r.end_date < args.from_date) continue;
      if (r.start_date > args.to_date) continue;
      out.push({
        request_id: r.id,
        category: r.category,
        start_date: r.start_date,
        end_date: r.end_date,
      });
    }
    return Object.freeze(out.map((x) => Object.freeze(x)));
  }

  listRequests(args: { employee_id?: string; status?: RequestStatus }): ReadonlyArray<PTORequest> {
    const out: PTORequest[] = [];
    for (const r of this.requests.values()) {
      if (args.employee_id && r.employee_id !== args.employee_id) continue;
      if (args.status && r.status !== args.status) continue;
      out.push(Object.freeze({ ...r }));
    }
    return Object.freeze(out);
  }

  /** Audit-trail surface — every ledger entry for an employee. */
  getLedger(employee_id: string): ReadonlyArray<PTOLedgerEntry> {
    const out: PTOLedgerEntry[] = [];
    for (const e of this.ledger.values()) {
      if (e.employee_id === employee_id) out.push(Object.freeze({ ...e }));
    }
    return Object.freeze(out);
  }

  reset(): void {
    this.ledger.clear();
    this.requests.clear();
    this.nextLedgerId = 1;
    this.nextRequestId = 1;
  }
}

export const employeePTOAccrualEngine = new EmployeePTOAccrualEngine();
