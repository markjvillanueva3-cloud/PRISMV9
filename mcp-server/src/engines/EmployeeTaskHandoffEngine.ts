/**
 * EmployeeTaskHandoffEngine — peer-to-peer task handoff workflow.
 *
 * Worker A passes an in-flight task (active timeclock task, dispatched job
 * step, PM work order, traveler step) to worker B with an accept/deny gate.
 *
 * Lifecycle:
 *   proposed → counterparty_accepted → manager_approved → executed
 *   proposed → counterparty_accepted → manager_rejected
 *   proposed → counterparty_rejected
 *   proposed → cancelled  (by requester before B responds)
 *   proposed → counterparty_accepted → executed   (MANAGER-BYPASS path —
 *     when both parties are on the same rank AND skill_match passes, the
 *     manager_approved step is auto-skipped; an audit-trail entry still
 *     records the bypass.)
 *
 * Rank rules (sigma fail-loud):
 *   - Same rank → counterparty_accept is sufficient (manager bypass auto-fires
 *     IFF skill_match passes; otherwise manager_approval is still required).
 *   - Cross rank → manager_approval is mandatory regardless of skill_match.
 *   - Manager-initiated handoff (assignment FROM a manager to a worker) →
 *     counterparty_accept still required (the worker has the right to refuse
 *     overloaded handoffs — Lean R7 surfaces overload as a Defect waste).
 *
 * Segregation-of-duties:
 *   - Manager cannot be the requester or the counterparty.
 *   - Requester cannot accept on behalf of the counterparty.
 *
 * Lean / Six Sigma / Kaizen hooks:
 *   - Every transition stamps `lean_waste_observed` (defect | waiting |
 *     overproduction | non-utilized | transportation | inventory | motion |
 *     extra-processing) when the caller flags one — surfaces into the
 *     KaizenLeanSigmaEngine waste ledger for DMAIC analysis.
 *   - Stall-watch (waiting waste): handoffs in `proposed` longer than
 *     `stall_threshold_minutes` are surfaced by `listStalledHandoffs()` so
 *     manager dashboards (U-MANAGER-DAILY-DASHBOARD, 2026-05-25) can andon them.
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen returns,
 * R12 fail-loud, audit-trail on every state transition.
 *
 * @module EmployeeTaskHandoffEngine
 * @milestone HOTEL/U-EMPLOYEE-TASK-HANDOFF (2026-05-26, slot:hotel)
 */

export type HandoffStatus =
  | "proposed"
  | "counterparty_accepted"
  | "counterparty_rejected"
  | "manager_approved"
  | "manager_rejected"
  | "executed"
  | "cancelled";

export type LeanWaste =
  | "defect"
  | "overproduction"
  | "waiting"
  | "non_utilized_talent"
  | "transportation"
  | "inventory"
  | "motion"
  | "extra_processing";

export interface TaskDescriptor {
  /** External task id (timeclock-task-id, work-order id, traveler step id). */
  task_id: string;
  /** Hint for the consuming system: timeclock | work_order | traveler | dispatch. */
  task_kind: "timeclock" | "work_order" | "traveler" | "dispatch";
  /** Machine this task runs on (drives the skill-match gate). */
  machine_serial: string;
  /** Optional human-readable label (purely advisory; PII-free). */
  label?: string;
  /** Estimated remaining minutes — used to size andon stall threshold. */
  remaining_minutes?: number;
}

export interface AuditEntry {
  /** ISO-8601 timestamp. */
  at: string;
  /** From → to status pair. */
  from: HandoffStatus;
  to: HandoffStatus;
  /** Employee id that triggered the transition. */
  by_employee_id: string;
  /** Free-text reason / note (PII-free). */
  note?: string;
  /** Lean waste observed during this transition, if any. */
  lean_waste_observed?: LeanWaste;
  /** True when manager_approved was auto-skipped via the same-rank bypass. */
  bypassed_manager?: boolean;
}

export interface HandoffRequest {
  id: string;
  requester_employee_id: string;
  counterparty_employee_id: string;
  task: TaskDescriptor;
  status: HandoffStatus;
  /** Snapshot of ranks at proposal time so rank changes don't retro-affect the gate. */
  requester_rank: string;
  counterparty_rank: string;
  /** True iff a same-rank manager-bypass fast-path was taken on executed. */
  bypassed_manager: boolean;
  reason?: string;
  counterparty_decision_at?: string;
  manager_decision_at?: string;
  manager_employee_id?: string;
  executed_at?: string;
  cancelled_at?: string;
  rejection_reason?: string;
  created_at: string;
  audit_trail: ReadonlyArray<AuditEntry>;
}

export interface StallReport {
  handoff_id: string;
  requester_employee_id: string;
  counterparty_employee_id: string;
  proposed_at: string;
  age_minutes: number;
  task_id: string;
}

const ALLOWED_STATUSES = new Set<HandoffStatus>([
  "proposed",
  "counterparty_accepted",
  "counterparty_rejected",
  "manager_approved",
  "manager_rejected",
  "executed",
  "cancelled",
]);

const ALLOWED_LEAN_WASTES = new Set<LeanWaste>([
  "defect",
  "overproduction",
  "waiting",
  "non_utilized_talent",
  "transportation",
  "inventory",
  "motion",
  "extra_processing",
]);

const ALLOWED_TASK_KINDS = new Set<TaskDescriptor["task_kind"]>([
  "timeclock",
  "work_order",
  "traveler",
  "dispatch",
]);

class EmployeeTaskHandoffEngine {
  private handoffs: Map<string, HandoffRequest> = new Map();
  /** employee_id → rank (e.g. "operator", "lead", "supervisor", "manager"). */
  private ranks: Map<string, string> = new Map();
  /** machine_serial → required_course_ids (subset of EmployeeShiftSwapEngine). */
  private machineQuals: Map<string, ReadonlyArray<string>> = new Map();
  /** employee_id → set of passed course_ids. */
  private coursesPassed: Map<string, Set<string>> = new Map();
  private nextId = 1;

  /** Register / update an employee's rank (snapshot at handoff proposal time). */
  registerRank(args: { employee_id: string; rank: string }): void {
    if (!args.employee_id || !args.rank) {
      throw new Error(
        "EmployeeTaskHandoffEngine.registerRank: employee_id + rank required",
      );
    }
    this.ranks.set(args.employee_id, args.rank);
  }

  registerMachineQualification(args: {
    machine_serial: string;
    required_course_ids: string[];
  }): void {
    if (!args.machine_serial) {
      throw new Error(
        "EmployeeTaskHandoffEngine.registerMachineQualification: machine_serial required",
      );
    }
    if (!Array.isArray(args.required_course_ids)) {
      throw new Error(
        "EmployeeTaskHandoffEngine.registerMachineQualification: required_course_ids must be an array",
      );
    }
    this.machineQuals.set(
      args.machine_serial,
      Object.freeze([...args.required_course_ids]),
    );
  }

  registerCoursePassed(args: { employee_id: string; course_id: string }): void {
    if (!args.employee_id || !args.course_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.registerCoursePassed: employee_id + course_id required",
      );
    }
    let set = this.coursesPassed.get(args.employee_id);
    if (!set) {
      set = new Set();
      this.coursesPassed.set(args.employee_id, set);
    }
    set.add(args.course_id);
  }

  /**
   * Worker A proposes to pass `task` to worker B.
   * Captures rank snapshot for both parties so subsequent rank changes don't
   * retro-affect the bypass eligibility computed at execution time.
   */
  proposeHandoff(args: {
    requester_employee_id: string;
    counterparty_employee_id: string;
    task: TaskDescriptor;
    reason?: string;
  }): HandoffRequest {
    if (!args.requester_employee_id || !args.counterparty_employee_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.proposeHandoff: requester + counterparty employee_id required",
      );
    }
    if (args.requester_employee_id === args.counterparty_employee_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.proposeHandoff: requester cannot hand off to themselves",
      );
    }
    this.validateTask(args.task);
    const requesterRank = this.ranks.get(args.requester_employee_id);
    const counterpartyRank = this.ranks.get(args.counterparty_employee_id);
    if (!requesterRank) {
      throw new Error(
        `EmployeeTaskHandoffEngine.proposeHandoff: requester rank not registered (employee_id="${args.requester_employee_id}"). Call registerRank first.`,
      );
    }
    if (!counterpartyRank) {
      throw new Error(
        `EmployeeTaskHandoffEngine.proposeHandoff: counterparty rank not registered (employee_id="${args.counterparty_employee_id}"). Call registerRank first.`,
      );
    }
    const id = `HANDOFF-${String(this.nextId++).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const audit: AuditEntry[] = [
      Object.freeze({
        at: now,
        from: "proposed" as HandoffStatus, // synthetic origin
        to: "proposed" as HandoffStatus,
        by_employee_id: args.requester_employee_id,
        ...(args.reason !== undefined && { note: args.reason }),
      }),
    ];
    const req: HandoffRequest = Object.freeze({
      id,
      requester_employee_id: args.requester_employee_id,
      counterparty_employee_id: args.counterparty_employee_id,
      task: Object.freeze({ ...args.task }),
      status: "proposed" as const,
      requester_rank: requesterRank,
      counterparty_rank: counterpartyRank,
      bypassed_manager: false,
      created_at: now,
      audit_trail: Object.freeze(audit),
      ...(args.reason !== undefined && { reason: args.reason }),
    });
    this.handoffs.set(id, req);
    return req;
  }

  /**
   * Counterparty (worker B) accepts or denies the handoff.
   * If accept=true AND ranks match AND skill-match passes → auto-bypass manager
   * → status goes straight to `executed`. The audit-trail records the bypass.
   * Otherwise → status goes to `counterparty_accepted` and awaits manager.
   */
  counterpartyRespond(args: {
    handoff_id: string;
    responder_employee_id: string;
    accept: boolean;
    reason?: string;
    lean_waste_observed?: LeanWaste;
  }): HandoffRequest {
    const r = this.requireHandoff(args.handoff_id);
    if (r.status !== "proposed") {
      throw new Error(
        `EmployeeTaskHandoffEngine.counterpartyRespond: handoff must be 'proposed' (got '${r.status}')`,
      );
    }
    if (args.responder_employee_id !== r.counterparty_employee_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.counterpartyRespond: only the counterparty can respond",
      );
    }
    if (args.lean_waste_observed !== undefined) {
      this.validateLeanWaste(args.lean_waste_observed);
    }
    const now = new Date().toISOString();

    if (!args.accept) {
      const audit: AuditEntry = Object.freeze({
        at: now,
        from: r.status,
        to: "counterparty_rejected" as HandoffStatus,
        by_employee_id: args.responder_employee_id,
        ...(args.reason !== undefined && { note: args.reason }),
        ...(args.lean_waste_observed !== undefined && {
          lean_waste_observed: args.lean_waste_observed,
        }),
      });
      const updated: HandoffRequest = Object.freeze({
        ...r,
        status: "counterparty_rejected" as const,
        counterparty_decision_at: now,
        rejection_reason: args.reason ?? "counterparty declined",
        audit_trail: Object.freeze([...r.audit_trail, audit]),
      });
      this.handoffs.set(r.id, updated);
      return updated;
    }

    // Accept path — evaluate same-rank bypass eligibility.
    const sameRank = r.requester_rank === r.counterparty_rank;
    const skillOk = this.missingCourses(
      r.counterparty_employee_id,
      r.task.machine_serial,
    ).length === 0;
    const canBypass = sameRank && skillOk;

    if (canBypass) {
      const audit: AuditEntry = Object.freeze({
        at: now,
        from: r.status,
        to: "executed" as HandoffStatus,
        by_employee_id: args.responder_employee_id,
        note: args.reason ?? "same-rank manager-bypass auto-executed",
        bypassed_manager: true,
        ...(args.lean_waste_observed !== undefined && {
          lean_waste_observed: args.lean_waste_observed,
        }),
      });
      const updated: HandoffRequest = Object.freeze({
        ...r,
        status: "executed" as const,
        counterparty_decision_at: now,
        executed_at: now,
        bypassed_manager: true,
        audit_trail: Object.freeze([...r.audit_trail, audit]),
      });
      this.handoffs.set(r.id, updated);
      return updated;
    }

    const audit: AuditEntry = Object.freeze({
      at: now,
      from: r.status,
      to: "counterparty_accepted" as HandoffStatus,
      by_employee_id: args.responder_employee_id,
      ...(args.reason !== undefined && { note: args.reason }),
      ...(args.lean_waste_observed !== undefined && {
        lean_waste_observed: args.lean_waste_observed,
      }),
    });
    const updated: HandoffRequest = Object.freeze({
      ...r,
      status: "counterparty_accepted" as const,
      counterparty_decision_at: now,
      audit_trail: Object.freeze([...r.audit_trail, audit]),
    });
    this.handoffs.set(r.id, updated);
    return updated;
  }

  /**
   * Manager approves or denies a cross-rank or skill-gap handoff.
   * Skill-match (counterparty must be qualified for the task's machine) is
   * re-evaluated here — managers cannot wave through unqualified handoffs.
   */
  managerApprove(args: {
    handoff_id: string;
    manager_employee_id: string;
    approve: boolean;
    reason?: string;
  }): HandoffRequest {
    const r = this.requireHandoff(args.handoff_id);
    if (r.status !== "counterparty_accepted") {
      throw new Error(
        `EmployeeTaskHandoffEngine.managerApprove: handoff must be 'counterparty_accepted' (got '${r.status}')`,
      );
    }
    if (!args.manager_employee_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.managerApprove: manager_employee_id required",
      );
    }
    if (
      args.manager_employee_id === r.requester_employee_id ||
      args.manager_employee_id === r.counterparty_employee_id
    ) {
      throw new Error(
        "EmployeeTaskHandoffEngine.managerApprove: manager cannot be a handoff participant (segregation of duties)",
      );
    }
    const now = new Date().toISOString();

    if (args.approve) {
      const missing = this.missingCourses(
        r.counterparty_employee_id,
        r.task.machine_serial,
      );
      if (missing.length > 0) {
        const audit: AuditEntry = Object.freeze({
          at: now,
          from: r.status,
          to: "manager_rejected" as HandoffStatus,
          by_employee_id: args.manager_employee_id,
          note: `qualification gap: ${r.counterparty_employee_id} missing for ${r.task.machine_serial}: ${missing.join(", ")}`,
        });
        const rejected: HandoffRequest = Object.freeze({
          ...r,
          status: "manager_rejected" as const,
          manager_decision_at: now,
          manager_employee_id: args.manager_employee_id,
          rejection_reason: `qualification gap: ${r.counterparty_employee_id} missing for ${r.task.machine_serial}: ${missing.join(", ")}`,
          audit_trail: Object.freeze([...r.audit_trail, audit]),
        });
        this.handoffs.set(r.id, rejected);
        return rejected;
      }
    }

    const audit: AuditEntry = Object.freeze({
      at: now,
      from: r.status,
      to: args.approve
        ? ("manager_approved" as HandoffStatus)
        : ("manager_rejected" as HandoffStatus),
      by_employee_id: args.manager_employee_id,
      ...(args.reason !== undefined && { note: args.reason }),
    });
    const updated: HandoffRequest = Object.freeze({
      ...r,
      status: args.approve
        ? ("manager_approved" as const)
        : ("manager_rejected" as const),
      manager_decision_at: now,
      manager_employee_id: args.manager_employee_id,
      ...(args.reason !== undefined &&
        !args.approve && { rejection_reason: args.reason }),
      audit_trail: Object.freeze([...r.audit_trail, audit]),
    });
    this.handoffs.set(r.id, updated);
    return updated;
  }

  /** Mark a manager-approved handoff as executed. */
  markExecuted(args: {
    handoff_id: string;
    by_employee_id: string;
  }): HandoffRequest {
    const r = this.requireHandoff(args.handoff_id);
    if (r.status !== "manager_approved") {
      throw new Error(
        `EmployeeTaskHandoffEngine.markExecuted: handoff must be 'manager_approved' (got '${r.status}'). Use a separate rollback workflow for executed handoffs.`,
      );
    }
    if (!args.by_employee_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.markExecuted: by_employee_id required",
      );
    }
    const now = new Date().toISOString();
    const audit: AuditEntry = Object.freeze({
      at: now,
      from: r.status,
      to: "executed" as HandoffStatus,
      by_employee_id: args.by_employee_id,
    });
    const updated: HandoffRequest = Object.freeze({
      ...r,
      status: "executed" as const,
      executed_at: now,
      audit_trail: Object.freeze([...r.audit_trail, audit]),
    });
    this.handoffs.set(r.id, updated);
    return updated;
  }

  /** Cancel a not-yet-responded handoff (requester only, only while proposed). */
  cancel(args: {
    handoff_id: string;
    canceller_employee_id: string;
    reason?: string;
  }): HandoffRequest {
    const r = this.requireHandoff(args.handoff_id);
    if (r.status !== "proposed") {
      throw new Error(
        `EmployeeTaskHandoffEngine.cancel: handoff must be 'proposed' (got '${r.status}')`,
      );
    }
    if (args.canceller_employee_id !== r.requester_employee_id) {
      throw new Error(
        "EmployeeTaskHandoffEngine.cancel: only the requester can cancel",
      );
    }
    const now = new Date().toISOString();
    const audit: AuditEntry = Object.freeze({
      at: now,
      from: r.status,
      to: "cancelled" as HandoffStatus,
      by_employee_id: args.canceller_employee_id,
      ...(args.reason !== undefined && { note: args.reason }),
    });
    const updated: HandoffRequest = Object.freeze({
      ...r,
      status: "cancelled" as const,
      cancelled_at: now,
      audit_trail: Object.freeze([...r.audit_trail, audit]),
    });
    this.handoffs.set(r.id, updated);
    return updated;
  }

  listHandoffs(args: {
    employee_id?: string;
    status?: HandoffStatus;
  }): ReadonlyArray<HandoffRequest> {
    if (args.status !== undefined && !ALLOWED_STATUSES.has(args.status)) {
      throw new Error(
        `EmployeeTaskHandoffEngine.listHandoffs: invalid status filter '${args.status}'`,
      );
    }
    const out: HandoffRequest[] = [];
    for (const r of this.handoffs.values()) {
      if (
        args.employee_id &&
        r.requester_employee_id !== args.employee_id &&
        r.counterparty_employee_id !== args.employee_id &&
        r.manager_employee_id !== args.employee_id
      ) {
        continue;
      }
      if (args.status && r.status !== args.status) continue;
      out.push(Object.freeze({ ...r }));
    }
    return Object.freeze(out);
  }

  /**
   * List handoffs that have been sitting in `proposed` longer than
   * `stall_threshold_minutes` — the Lean "waiting" waste that manager
   * dashboards andon.
   */
  listStalledHandoffs(args: {
    stall_threshold_minutes: number;
    now_iso?: string;
  }): ReadonlyArray<StallReport> {
    if (
      !Number.isFinite(args.stall_threshold_minutes) ||
      args.stall_threshold_minutes < 0
    ) {
      throw new Error(
        "EmployeeTaskHandoffEngine.listStalledHandoffs: stall_threshold_minutes must be a finite non-negative number",
      );
    }
    const now =
      args.now_iso !== undefined ? Date.parse(args.now_iso) : Date.now();
    if (!Number.isFinite(now)) {
      throw new Error(
        `EmployeeTaskHandoffEngine.listStalledHandoffs: invalid now_iso "${args.now_iso}"`,
      );
    }
    const thresholdMs = args.stall_threshold_minutes * 60_000;
    const out: StallReport[] = [];
    for (const r of this.handoffs.values()) {
      if (r.status !== "proposed") continue;
      const proposedAt = Date.parse(r.created_at);
      if (!Number.isFinite(proposedAt)) continue;
      const ageMs = now - proposedAt;
      if (ageMs < thresholdMs) continue;
      out.push(
        Object.freeze({
          handoff_id: r.id,
          requester_employee_id: r.requester_employee_id,
          counterparty_employee_id: r.counterparty_employee_id,
          proposed_at: r.created_at,
          age_minutes: Math.round(ageMs / 60_000),
          task_id: r.task.task_id,
        }),
      );
    }
    out.sort((a, b) => b.age_minutes - a.age_minutes);
    return Object.freeze(out);
  }

  /**
   * Aggregate lean-waste counts across the engine for DMAIC analysis.
   * Returns a frozen record { waste → count } restricted to wastes actually
   * observed (zero-count wastes are omitted to keep the surface minimal).
   */
  wasteSummary(): Readonly<Partial<Record<LeanWaste, number>>> {
    const counts: Partial<Record<LeanWaste, number>> = {};
    for (const r of this.handoffs.values()) {
      for (const entry of r.audit_trail) {
        if (entry.lean_waste_observed) {
          counts[entry.lean_waste_observed] =
            (counts[entry.lean_waste_observed] ?? 0) + 1;
        }
      }
    }
    return Object.freeze(counts);
  }

  private missingCourses(
    employee_id: string,
    machine_serial: string,
  ): ReadonlyArray<string> {
    const required = this.machineQuals.get(machine_serial);
    if (!required) return Object.freeze([]); // no qualification record → assume open
    const passed = this.coursesPassed.get(employee_id) ?? new Set<string>();
    return Object.freeze(required.filter((c) => !passed.has(c)));
  }

  private requireHandoff(id: string): HandoffRequest {
    const r = this.handoffs.get(id);
    if (!r) {
      throw new Error(
        `EmployeeTaskHandoffEngine: unknown handoff_id "${id}"`,
      );
    }
    return r;
  }

  private validateTask(t: TaskDescriptor): void {
    if (!t) {
      throw new Error("EmployeeTaskHandoffEngine: task descriptor required");
    }
    if (!t.task_id) {
      throw new Error("EmployeeTaskHandoffEngine: task.task_id required");
    }
    if (!ALLOWED_TASK_KINDS.has(t.task_kind)) {
      throw new Error(
        `EmployeeTaskHandoffEngine: task.task_kind must be one of timeclock|work_order|traveler|dispatch (got '${t.task_kind}')`,
      );
    }
    if (!t.machine_serial) {
      throw new Error(
        "EmployeeTaskHandoffEngine: task.machine_serial required",
      );
    }
    if (
      t.remaining_minutes !== undefined &&
      (!Number.isFinite(t.remaining_minutes) || t.remaining_minutes < 0)
    ) {
      throw new Error(
        "EmployeeTaskHandoffEngine: task.remaining_minutes must be a finite non-negative number when provided",
      );
    }
  }

  private validateLeanWaste(w: LeanWaste): void {
    if (!ALLOWED_LEAN_WASTES.has(w)) {
      throw new Error(
        `EmployeeTaskHandoffEngine: lean_waste_observed must be one of ${[...ALLOWED_LEAN_WASTES].join("|")} (got '${w}')`,
      );
    }
  }

  reset(): void {
    this.handoffs.clear();
    this.ranks.clear();
    this.machineQuals.clear();
    this.coursesPassed.clear();
    this.nextId = 1;
  }
}

export const employeeTaskHandoffEngine = new EmployeeTaskHandoffEngine();
