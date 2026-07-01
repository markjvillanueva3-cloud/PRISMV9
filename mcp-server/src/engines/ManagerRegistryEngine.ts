/**
 * ManagerRegistryEngine — central truth for employee→rank+dept+reports_to chain.
 *
 * Every approval/handoff/promotion in the substrate currently passes
 * `manager_employee_id` ad-hoc. This engine is the single source of truth for:
 *   - employee identity → rank (apprentice..owner..admin)
 *   - employee → department code (links to DepartmentEngine)
 *   - reports_to chain (each employee names their direct manager)
 *   - on-rank-change auditing (who promoted who, when, why)
 *   - canManagerApprove(approver, subject) — used by all approval gates
 *
 * Rank ladder (lowest → highest authority):
 *   apprentice < operator < machinist < setup < programmer < inspector <
 *   qa_lead < foreman < buyer < estimator < scheduler < shipping <
 *   receiving < accounting < sales < office_admin < lead < supervisor <
 *   manager < director < owner < admin
 *
 * The `admin` rank is the NEW top-level rank above `owner` per operator
 * directive (2026-05-26) — has system-wide authority including AI-proposal
 * approval, financial-invariant override, PII unmask. Owner is shop-level.
 *
 * Composes:
 *   - DepartmentEngine (G1): dept_code resolves to a Department record.
 *   - EmployeeRoleAcademyInjectionEngine: ShopRole maps to ranks here.
 *   - All approval gates (EmployeeTaskHandoffEngine, EmployeeShiftSwapEngine,
 *     ApprovalWorkflowEngine, AIProposalApprovalQueueEngine [G5]):
 *     `canManagerApprove(approver_id, subject_id)` is the canonical gate.
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen, R12,
 * audit-trail every change, no silent rank downgrade (requires reason).
 *
 * @module ManagerRegistryEngine
 * @milestone HOTEL/U-MANAGER-REGISTRY (2026-05-26, slot:hotel iter6 /goal Phase 1 P0)
 */

export type Rank =
  | "apprentice"
  | "operator"
  | "machinist"
  | "setup"
  | "programmer"
  | "inspector"
  | "qa_lead"
  | "foreman"
  | "buyer"
  | "estimator"
  | "scheduler"
  | "shipping"
  | "receiving"
  | "accounting"
  | "sales"
  | "office_admin"
  | "lead"
  | "supervisor"
  | "manager"
  | "director"
  | "owner"
  | "admin";

/** Ordered low → high authority. Index = numeric authority level. */
export const RANK_ORDER: ReadonlyArray<Rank> = Object.freeze([
  "apprentice", "operator", "machinist", "setup", "programmer", "inspector",
  "qa_lead", "foreman", "buyer", "estimator", "scheduler", "shipping",
  "receiving", "accounting", "sales", "office_admin", "lead", "supervisor",
  "manager", "director", "owner", "admin",
]);

const RANK_INDEX: Readonly<Record<Rank, number>> = Object.freeze(
  Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>,
);

const ALLOWED_RANKS = new Set<Rank>(RANK_ORDER);

export interface EmployeeRecord {
  employee_id: string;
  rank: Rank;
  department_code: string;
  /** employee_id of the direct manager. null = top-of-chain (typically `admin` or `owner`). */
  reports_to_employee_id: string | null;
  active: boolean;
  joined_at: string;
  updated_at: string;
  audit_trail: ReadonlyArray<RankAudit>;
}

export interface RankAudit {
  at: string;
  by_employee_id: string;
  operation:
    | "create"
    | "promote"
    | "demote"
    | "reassign_dept"
    | "set_reports_to"
    | "deactivate"
    | "reactivate";
  from?: string;
  to?: string;
  reason?: string;
}

class ManagerRegistryEngine {
  private records: Map<string, EmployeeRecord> = new Map();

  register(args: {
    employee_id: string;
    rank: Rank;
    department_code: string;
    reports_to_employee_id: string | null;
    by_employee_id: string;
  }): EmployeeRecord {
    if (!args.employee_id) {
      throw new Error(
        "ManagerRegistryEngine.register: employee_id required",
      );
    }
    if (!ALLOWED_RANKS.has(args.rank)) {
      throw new Error(
        `ManagerRegistryEngine.register: invalid rank '${args.rank}' (allowed: ${RANK_ORDER.join("|")})`,
      );
    }
    if (!args.department_code) {
      throw new Error(
        "ManagerRegistryEngine.register: department_code required",
      );
    }
    if (this.records.has(args.employee_id)) {
      throw new Error(
        `ManagerRegistryEngine.register: '${args.employee_id}' already registered (use promote/demote/reassign)`,
      );
    }
    if (args.reports_to_employee_id === args.employee_id) {
      throw new Error(
        "ManagerRegistryEngine.register: employee cannot report to themselves",
      );
    }
    if (args.reports_to_employee_id !== null) {
      const mgr = this.records.get(args.reports_to_employee_id);
      if (!mgr) {
        throw new Error(
          `ManagerRegistryEngine.register: reports_to '${args.reports_to_employee_id}' not registered yet`,
        );
      }
      if (RANK_INDEX[mgr.rank] <= RANK_INDEX[args.rank]) {
        throw new Error(
          `ManagerRegistryEngine.register: reports_to manager (${mgr.rank}) must outrank the employee (${args.rank})`,
        );
      }
    }
    if (!args.by_employee_id) {
      throw new Error(
        "ManagerRegistryEngine.register: by_employee_id required (audit-trail)",
      );
    }
    const now = new Date().toISOString();
    const rec: EmployeeRecord = Object.freeze({
      employee_id: args.employee_id,
      rank: args.rank,
      department_code: args.department_code,
      reports_to_employee_id: args.reports_to_employee_id,
      active: true,
      joined_at: now,
      updated_at: now,
      audit_trail: Object.freeze([
        Object.freeze({
          at: now,
          by_employee_id: args.by_employee_id,
          operation: "create" as const,
          to: args.rank,
        }),
      ]),
    });
    this.records.set(args.employee_id, rec);
    return rec;
  }

  promote(args: {
    employee_id: string;
    new_rank: Rank;
    by_employee_id: string;
    reason?: string;
  }): EmployeeRecord {
    const rec = this.requireActive(args.employee_id);
    if (!ALLOWED_RANKS.has(args.new_rank)) {
      throw new Error(
        `ManagerRegistryEngine.promote: invalid rank '${args.new_rank}'`,
      );
    }
    if (RANK_INDEX[args.new_rank] <= RANK_INDEX[rec.rank]) {
      throw new Error(
        `ManagerRegistryEngine.promote: ${args.new_rank} is not above current rank ${rec.rank}. Use demote() for downward changes.`,
      );
    }
    if (args.by_employee_id === args.employee_id) {
      throw new Error(
        "ManagerRegistryEngine.promote: employee cannot promote themselves (segregation of duties)",
      );
    }
    const approver = this.records.get(args.by_employee_id);
    if (!approver) {
      throw new Error(
        `ManagerRegistryEngine.promote: approver '${args.by_employee_id}' not registered`,
      );
    }
    if (RANK_INDEX[approver.rank] < RANK_INDEX[args.new_rank]) {
      throw new Error(
        `ManagerRegistryEngine.promote: approver (${approver.rank}) does not outrank the target rank ${args.new_rank}. Promotion to a rank requires the approver to be at-or-above that rank.`,
      );
    }
    return this.appendAudit(rec, args.by_employee_id, "promote", {
      from: rec.rank,
      to: args.new_rank,
      ...(args.reason !== undefined && { reason: args.reason }),
    }, { rank: args.new_rank });
  }

  demote(args: {
    employee_id: string;
    new_rank: Rank;
    by_employee_id: string;
    reason: string;
  }): EmployeeRecord {
    const rec = this.requireActive(args.employee_id);
    if (!ALLOWED_RANKS.has(args.new_rank)) {
      throw new Error(
        `ManagerRegistryEngine.demote: invalid rank '${args.new_rank}'`,
      );
    }
    if (RANK_INDEX[args.new_rank] >= RANK_INDEX[rec.rank]) {
      throw new Error(
        `ManagerRegistryEngine.demote: ${args.new_rank} is not below current rank ${rec.rank}. Use promote() for upward changes.`,
      );
    }
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error(
        "ManagerRegistryEngine.demote: reason required (no silent demotion — Hotel HR invariant)",
      );
    }
    if (args.by_employee_id === args.employee_id) {
      throw new Error(
        "ManagerRegistryEngine.demote: employee cannot demote themselves (segregation of duties)",
      );
    }
    return this.appendAudit(rec, args.by_employee_id, "demote", {
      from: rec.rank,
      to: args.new_rank,
      reason: args.reason,
    }, { rank: args.new_rank });
  }

  reassignDepartment(args: {
    employee_id: string;
    new_department_code: string;
    by_employee_id: string;
  }): EmployeeRecord {
    const rec = this.requireActive(args.employee_id);
    if (!args.new_department_code) {
      throw new Error(
        "ManagerRegistryEngine.reassignDepartment: new_department_code required",
      );
    }
    if (rec.department_code === args.new_department_code) {
      throw new Error(
        `ManagerRegistryEngine.reassignDepartment: already in '${args.new_department_code}'`,
      );
    }
    return this.appendAudit(rec, args.by_employee_id, "reassign_dept", {
      from: rec.department_code,
      to: args.new_department_code,
    }, { department_code: args.new_department_code });
  }

  setReportsTo(args: {
    employee_id: string;
    new_reports_to_employee_id: string | null;
    by_employee_id: string;
  }): EmployeeRecord {
    const rec = this.requireActive(args.employee_id);
    if (args.new_reports_to_employee_id === args.employee_id) {
      throw new Error(
        "ManagerRegistryEngine.setReportsTo: employee cannot report to themselves",
      );
    }
    if (args.new_reports_to_employee_id !== null) {
      const mgr = this.requireActive(args.new_reports_to_employee_id);
      if (RANK_INDEX[mgr.rank] <= RANK_INDEX[rec.rank]) {
        throw new Error(
          `ManagerRegistryEngine.setReportsTo: proposed manager (${mgr.rank}) must outrank the employee (${rec.rank})`,
        );
      }
      // Cycle check
      let walker: string | null = args.new_reports_to_employee_id;
      const seen = new Set<string>();
      while (walker) {
        if (walker === args.employee_id) {
          throw new Error(
            `ManagerRegistryEngine.setReportsTo: cycle detected (would form report-loop through ${args.new_reports_to_employee_id})`,
          );
        }
        if (seen.has(walker)) break;
        seen.add(walker);
        walker = this.records.get(walker)?.reports_to_employee_id ?? null;
      }
    }
    return this.appendAudit(rec, args.by_employee_id, "set_reports_to", {
      from: rec.reports_to_employee_id ?? "none",
      to: args.new_reports_to_employee_id ?? "none",
    }, { reports_to_employee_id: args.new_reports_to_employee_id });
  }

  deactivate(args: {
    employee_id: string;
    by_employee_id: string;
    reason: string;
  }): EmployeeRecord {
    const rec = this.requireActive(args.employee_id);
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error(
        "ManagerRegistryEngine.deactivate: reason required (no silent termination)",
      );
    }
    return this.appendAudit(rec, args.by_employee_id, "deactivate",
      { reason: args.reason }, { active: false });
  }

  reactivate(args: {
    employee_id: string;
    by_employee_id: string;
  }): EmployeeRecord {
    const rec = this.records.get(args.employee_id);
    if (!rec) {
      throw new Error(
        `ManagerRegistryEngine.reactivate: unknown employee '${args.employee_id}'`,
      );
    }
    if (rec.active) {
      throw new Error(
        `ManagerRegistryEngine.reactivate: '${args.employee_id}' is already active`,
      );
    }
    return this.appendAudit(rec, args.by_employee_id, "reactivate", {},
      { active: true });
  }

  /**
   * Canonical approval gate. Returns true iff `approver_id` outranks (strictly
   * greater rank index) `subject_id`. Used by every approval-emitting engine.
   * R12 fail-loud on missing/inactive employees.
   */
  canManagerApprove(approver_id: string, subject_id: string): boolean {
    const approver = this.requireActive(approver_id);
    const subject = this.requireActive(subject_id);
    if (approver_id === subject_id) return false; // SoD
    return RANK_INDEX[approver.rank] > RANK_INDEX[subject.rank];
  }

  /** Returns the full chain employee → manager → ... → top. */
  reportsToChain(employee_id: string): ReadonlyArray<string> {
    this.requireActive(employee_id);
    const chain: string[] = [employee_id];
    const seen = new Set<string>([employee_id]);
    let walker = this.records.get(employee_id)?.reports_to_employee_id ?? null;
    while (walker) {
      if (seen.has(walker)) {
        throw new Error(
          `ManagerRegistryEngine.reportsToChain: cycle at '${walker}' (corrupt state)`,
        );
      }
      seen.add(walker);
      chain.push(walker);
      walker = this.records.get(walker)?.reports_to_employee_id ?? null;
    }
    return Object.freeze(chain);
  }

  /** Returns all direct reports of a manager (one level only). */
  directReports(manager_employee_id: string): ReadonlyArray<EmployeeRecord> {
    const out: EmployeeRecord[] = [];
    for (const r of this.records.values()) {
      if (r.reports_to_employee_id === manager_employee_id) {
        out.push(Object.freeze({ ...r }));
      }
    }
    return Object.freeze(out);
  }

  getEmployee(employee_id: string): EmployeeRecord {
    const r = this.records.get(employee_id);
    if (!r) {
      throw new Error(
        `ManagerRegistryEngine.getEmployee: unknown employee '${employee_id}'`,
      );
    }
    return Object.freeze({ ...r });
  }

  listEmployees(args: {
    department_code?: string;
    rank?: Rank;
    active?: boolean;
  } = {}): ReadonlyArray<EmployeeRecord> {
    const out: EmployeeRecord[] = [];
    for (const r of this.records.values()) {
      if (args.department_code && r.department_code !== args.department_code)
        continue;
      if (args.rank && r.rank !== args.rank) continue;
      if (args.active !== undefined && r.active !== args.active) continue;
      out.push(Object.freeze({ ...r }));
    }
    return Object.freeze(out);
  }

  rankOrder(): ReadonlyArray<Rank> {
    return RANK_ORDER;
  }

  rankIndex(rank: Rank): number {
    if (!ALLOWED_RANKS.has(rank)) {
      throw new Error(
        `ManagerRegistryEngine.rankIndex: invalid rank '${rank}'`,
      );
    }
    return RANK_INDEX[rank];
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private requireActive(employee_id: string): EmployeeRecord {
    const r = this.records.get(employee_id);
    if (!r) {
      throw new Error(
        `ManagerRegistryEngine: unknown employee '${employee_id}'`,
      );
    }
    if (!r.active) {
      throw new Error(
        `ManagerRegistryEngine: employee '${employee_id}' is inactive`,
      );
    }
    return r;
  }

  private appendAudit(
    rec: EmployeeRecord,
    by_employee_id: string,
    operation: RankAudit["operation"],
    detail: Omit<RankAudit, "at" | "by_employee_id" | "operation">,
    patch: Partial<EmployeeRecord>,
  ): EmployeeRecord {
    if (!by_employee_id) {
      throw new Error(
        "ManagerRegistryEngine: by_employee_id required on every mutation",
      );
    }
    const now = new Date().toISOString();
    const audit: RankAudit = Object.freeze({
      at: now,
      by_employee_id,
      operation,
      ...detail,
    });
    const updated: EmployeeRecord = Object.freeze({
      ...rec,
      ...patch,
      updated_at: now,
      audit_trail: Object.freeze([...rec.audit_trail, audit]),
    });
    this.records.set(rec.employee_id, updated);
    return updated;
  }

  reset(): void {
    this.records.clear();
  }
}

export const managerRegistryEngine = new ManagerRegistryEngine();
