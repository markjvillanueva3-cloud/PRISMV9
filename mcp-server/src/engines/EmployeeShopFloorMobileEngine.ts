/**
 * EmployeeShopFloorMobileEngine — phone-first shop-floor employee portal
 * (iter1 — hotel slot, 2026-05-23). Closes the gaps NOT covered by
 * ShopFloorCheckInEngine (which does department check-in + task state) or
 * CustomerPortalEngine (which is customer-facing only):
 *
 *   1. QR/barcode scan-in     parseScanPayload + scanInTask
 *   2. Job state machine      startJob | pauseJob | resumeJob | stopJob
 *                             (per-employee active-task tracking)
 *   3. Employee ↔ employee    sendMessage | listMessages | markRead
 *      messaging              (NOT the customer-facing PortalMessage —
 *                              this is internal shop-floor chat)
 *   4. Hot-job priority bump  bumpJobPriority (admin action with audit trail)
 *   5. Manager delegation     delegateTask (manager assigns task to employee
 *                             with reason + audit)
 *
 * Pure-state engine. No I/O. Resilient to absent companion engines.
 * Hotel slot soul: every privileged action carries an audit entry.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActiveTaskStatus = "running" | "paused" | "completed" | "stopped";

export interface ScanPayload {
  job_id: string;
  operation_id?: string;
  task_id?: string;
  source: "qr" | "barcode" | "manual";
}

export interface ActiveTask {
  task_id: string;
  job_id: string;
  operation_id: string;
  employee_id: string;
  status: ActiveTaskStatus;
  started_at: string;
  paused_at?: string;
  pause_reason?: string;
  completed_at?: string;
  stopped_at?: string;
  total_runtime_ms: number;
  total_pause_ms: number;
  last_event_at: string;
}

export interface EmployeeMessage {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  body: string;
  sent_at: string;
  read_at?: string;
}

export interface JobPriorityEntry {
  job_id: string;
  priority: number;            // higher = hotter; 0 = default
  bumped_by: string;           // admin/manager id
  reason: string;
  bumped_at: string;
}

export interface DelegationEntry {
  id: string;
  task_id: string;
  from_manager_id: string;
  to_employee_id: string;
  reason: string;
  delegated_at: string;
  acknowledged_at?: string;
}

// ─── Constants (named, not magic) ───────────────────────────────────────────

const MAX_MSG_CHARS = 2000;
const MAX_REASON_CHARS = 500;
const MAX_JOB_ID_CHARS = 64;
const PRIORITY_DEFAULT = 0;

// ─── R1 — role-based ACL (optional, dependency-injected) ────────────────────
// Privileged actions (bumpJobPriority, delegateTask) MAY be gated on the
// caller's role. The engine takes a RoleResolver (caller → role) at
// construction; if set, the engine refuses privileged ops when the role is
// not in the per-method allow list. If unset (default), no ACL is enforced —
// backward-compatible with iter1 callers.
export type EmployeeRole = "operator" | "foreman" | "manager" | "admin" | string;
export type RoleResolver = (employeeId: string) => EmployeeRole | null;

const DEFAULT_PRIORITY_BUMP_ROLES: ReadonlyArray<EmployeeRole> = ["foreman", "manager", "admin"];
const DEFAULT_DELEGATE_ROLES: ReadonlyArray<EmployeeRole> = ["foreman", "manager", "admin"];

// ─── QR/barcode payload parser ──────────────────────────────────────────────

/**
 * Parse a scan payload. Accepts:
 *   prism://job/<JOB>/op/<OP>/task/<TASK>      (full)
 *   prism://job/<JOB>/op/<OP>                  (job+op)
 *   prism://job/<JOB>                          (job only)
 *   bare JOB-ID string (interpreted as job_id, source=manual)
 * Returns null on unparseable input.
 */
export function parseScanPayload(raw: string, source: ScanPayload["source"] = "qr"): ScanPayload | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_JOB_ID_CHARS * 4) return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith("prism://job/")) {
    const path = trimmed.slice("prism://job/".length);
    const parts = path.split("/");
    if (parts.length === 0 || !parts[0]) return null;
    const job_id = parts[0];
    if (job_id.length > MAX_JOB_ID_CHARS) return null;
    const result: ScanPayload = { job_id, source };
    if (parts[1] === "op" && parts[2]) result.operation_id = parts[2];
    if (parts[3] === "task" && parts[4]) result.task_id = parts[4];
    return result;
  }

  // Bare ID fallback (operator-typed)
  if (/^[A-Za-z0-9_\-]{1,64}$/.test(trimmed)) {
    return { job_id: trimmed, source: "manual" };
  }

  return null;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class EmployeeShopFloorMobileEngine {
  private readonly activeTasks = new Map<string, ActiveTask>();        // task_id → active record
  private readonly employeeActive = new Map<string, string>();         // employee_id → currently active task_id
  private readonly messages: EmployeeMessage[] = [];
  private readonly priorities = new Map<string, JobPriorityEntry>();   // job_id → priority entry
  private readonly delegations: DelegationEntry[] = [];
  private readonly priorityAudit: JobPriorityEntry[] = [];             // every bump ever (audit chain)
  private msgCounter = 0;
  private delegCounter = 0;
  private roleResolver: RoleResolver | null = null;
  private priorityBumpAllowedRoles: ReadonlyArray<EmployeeRole> = DEFAULT_PRIORITY_BUMP_ROLES;
  private delegateAllowedRoles: ReadonlyArray<EmployeeRole> = DEFAULT_DELEGATE_ROLES;

  /**
   * R1 — install or replace the role resolver. Pass null to disable ACL
   * entirely (revert to iter1 behavior). Optional per-method role allow-list
   * overrides; defaults are foreman + manager + admin.
   */
  configureRoleACL(opts: {
    resolver: RoleResolver | null;
    priorityBumpRoles?: ReadonlyArray<EmployeeRole>;
    delegateRoles?: ReadonlyArray<EmployeeRole>;
  }): void {
    this.roleResolver = opts.resolver;
    if (opts.priorityBumpRoles) this.priorityBumpAllowedRoles = opts.priorityBumpRoles;
    if (opts.delegateRoles) this.delegateAllowedRoles = opts.delegateRoles;
  }

  /**
   * Internal — throws if a role resolver is installed AND the resolved role
   * is not in the allow list. No-op when no resolver is installed.
   * Hotel-soul: an unresolved actor (resolver returns null) is REFUSED — we
   * never default-allow an unknown caller into a privileged action.
   */
  private assertRoleAllowed(callerId: string, allowList: ReadonlyArray<EmployeeRole>, action: string): void {
    if (!this.roleResolver) return;  // ACL not configured → backward-compat permissive
    const role = this.roleResolver(callerId);
    if (role === null) {
      throw new Error(`${action}: actor ${callerId} has no resolvable role (refuse-on-unknown)`);
    }
    if (!allowList.includes(role)) {
      throw new Error(`${action}: actor ${callerId} role '${role}' not in allow list [${allowList.join(",")}]`);
    }
  }

  // ─── Scan + start a task ──────────────────────────────────────────────────

  /**
   * Scan-in: parses a QR/barcode payload and starts the task for the employee.
   * If the employee already has an active task, that task is auto-paused first.
   * @throws Error on bad payload or oversized inputs.
   */
  scanInTask(rawPayload: string, employeeId: string, source: ScanPayload["source"] = "qr"): ActiveTask {
    if (!employeeId) throw new Error("scanInTask: employeeId required");
    const parsed = parseScanPayload(rawPayload, source);
    if (!parsed) throw new Error(`scanInTask: unparseable payload '${rawPayload}'`);
    if (!parsed.task_id) throw new Error("scanInTask: payload missing task_id (need full prism://job/.../op/.../task/...)");

    // Auto-pause prior active task so an employee has at most one running task.
    const prior = this.employeeActive.get(employeeId);
    if (prior && prior !== parsed.task_id) {
      const priorTask = this.activeTasks.get(prior);
      if (priorTask && priorTask.status === "running") {
        this.pauseTask(prior, employeeId, "auto-paused on new scan");
      }
    }

    return this.startJobTask(parsed.job_id, parsed.operation_id ?? "unknown", parsed.task_id, employeeId);
  }

  /** Start (or resume) a specific task by id. Idempotent for already-running task. */
  startJobTask(job_id: string, operation_id: string, task_id: string, employee_id: string): ActiveTask {
    if (!task_id) throw new Error("startJobTask: task_id required");
    if (!employee_id) throw new Error("startJobTask: employee_id required");
    const now = new Date().toISOString();
    const existing = this.activeTasks.get(task_id);
    if (existing) {
      if (existing.status === "running") return existing;
      if (existing.status === "paused") {
        existing.status = "running";
        // Charge the pause window into total_pause_ms before resuming.
        if (existing.paused_at) {
          existing.total_pause_ms += Date.parse(now) - Date.parse(existing.paused_at);
          existing.paused_at = undefined;
          existing.pause_reason = undefined;
        }
        existing.last_event_at = now;
        this.employeeActive.set(employee_id, task_id);
        return existing;
      }
      throw new Error(`startJobTask: task ${task_id} is already ${existing.status}, cannot start`);
    }
    const task: ActiveTask = {
      task_id, job_id, operation_id, employee_id,
      status: "running",
      started_at: now,
      total_runtime_ms: 0,
      total_pause_ms: 0,
      last_event_at: now,
    };
    this.activeTasks.set(task_id, task);
    this.employeeActive.set(employee_id, task_id);
    return task;
  }

  /** Pause a running task. Requires reason. Rejects pause-of-paused. */
  pauseTask(task_id: string, employee_id: string, reason: string): ActiveTask {
    const task = this.activeTasks.get(task_id);
    if (!task) throw new Error(`pauseTask: task ${task_id} not found`);
    if (task.status !== "running") throw new Error(`pauseTask: task ${task_id} is ${task.status}, not running`);
    if (!reason || reason.trim().length < 2) throw new Error("pauseTask: reason required (>=2 chars)");
    const now = new Date().toISOString();
    task.total_runtime_ms += Date.parse(now) - Date.parse(task.last_event_at);
    task.status = "paused";
    task.paused_at = now;
    task.pause_reason = reason.slice(0, MAX_REASON_CHARS);
    task.last_event_at = now;
    if (this.employeeActive.get(employee_id) === task_id) this.employeeActive.delete(employee_id);
    return task;
  }

  /** Resume a paused task — same employee or another. */
  resumeTask(task_id: string, employee_id: string): ActiveTask {
    const task = this.activeTasks.get(task_id);
    if (!task) throw new Error(`resumeTask: task ${task_id} not found`);
    return this.startJobTask(task.job_id, task.operation_id, task_id, employee_id);
  }

  /** Stop a task (terminal — either completed or stopped without completion). */
  stopTask(task_id: string, employee_id: string, opts: { completed: boolean; reason?: string } = { completed: true }): ActiveTask {
    const task = this.activeTasks.get(task_id);
    if (!task) throw new Error(`stopTask: task ${task_id} not found`);
    const now = new Date().toISOString();
    if (task.status === "running") {
      task.total_runtime_ms += Date.parse(now) - Date.parse(task.last_event_at);
    }
    task.status = opts.completed ? "completed" : "stopped";
    if (opts.completed) task.completed_at = now;
    else task.stopped_at = now;
    if (opts.reason) task.pause_reason = opts.reason.slice(0, MAX_REASON_CHARS);
    task.last_event_at = now;
    if (this.employeeActive.get(employee_id) === task_id) this.employeeActive.delete(employee_id);
    return task;
  }

  /** Snapshot of an employee's currently-active task (running only). */
  getEmployeeActiveTask(employee_id: string): ActiveTask | null {
    const id = this.employeeActive.get(employee_id);
    if (!id) return null;
    const t = this.activeTasks.get(id);
    return t && t.status === "running" ? { ...t } : null;
  }

  /** Lookup by task id (defensive copy). */
  getTask(task_id: string): ActiveTask | null {
    const t = this.activeTasks.get(task_id);
    return t ? { ...t } : null;
  }

  // ─── Employee ↔ employee messaging ────────────────────────────────────────

  /** Send a message from one employee to another. Sanitizes + caps body. */
  sendMessage(from_employee_id: string, to_employee_id: string, body: string): EmployeeMessage {
    if (!from_employee_id || !to_employee_id) throw new Error("sendMessage: from + to required");
    if (from_employee_id === to_employee_id) throw new Error("sendMessage: cannot send to self");
    if (typeof body !== "string" || body.trim().length === 0) throw new Error("sendMessage: body required");
    const msg: EmployeeMessage = {
      id: `MSG-${++this.msgCounter}`,
      from_employee_id,
      to_employee_id,
      body: body.slice(0, MAX_MSG_CHARS),
      sent_at: new Date().toISOString(),
    };
    this.messages.push(msg);
    return { ...msg };
  }

  /** List messages addressed to an employee, newest first.
   *  Tiebreak on monotonic MSG counter for sub-millisecond writes
   *  (Date.toISOString clamps to ms — successive sends collide). */
  listMessages(employee_id: string, opts: { unreadOnly?: boolean } = {}): EmployeeMessage[] {
    return this.messages
      .filter(m => m.to_employee_id === employee_id && (!opts.unreadOnly || !m.read_at))
      .sort((a, b) =>
        b.sent_at.localeCompare(a.sent_at)
        || (parseInt(b.id.slice("MSG-".length), 10) - parseInt(a.id.slice("MSG-".length), 10)))
      .map(m => ({ ...m }));
  }

  /** Mark a message as read (idempotent). */
  markMessageRead(message_id: string): EmployeeMessage | null {
    const m = this.messages.find(x => x.id === message_id);
    if (!m) return null;
    if (!m.read_at) m.read_at = new Date().toISOString();
    return { ...m };
  }

  // ─── Hot-job priority (admin/manager action) ──────────────────────────────

  /**
   * Bump (or lower) a job's priority. Every change writes an audit entry —
   * even a no-op revert. Reason required ≥3 chars.
   */
  bumpJobPriority(job_id: string, new_priority: number, admin_id: string, reason: string): JobPriorityEntry {
    if (!job_id) throw new Error("bumpJobPriority: job_id required");
    if (!admin_id) throw new Error("bumpJobPriority: admin_id required");
    if (!Number.isFinite(new_priority)) throw new Error("bumpJobPriority: priority must be finite");
    if (!reason || reason.trim().length < 3) throw new Error("bumpJobPriority: reason required (>=3 chars)");
    this.assertRoleAllowed(admin_id, this.priorityBumpAllowedRoles, "bumpJobPriority");
    const entry: JobPriorityEntry = {
      job_id,
      priority: new_priority,
      bumped_by: admin_id,
      reason: reason.slice(0, MAX_REASON_CHARS),
      bumped_at: new Date().toISOString(),
    };
    this.priorities.set(job_id, entry);
    this.priorityAudit.push(entry);
    return { ...entry };
  }

  /** Get current priority for a job (default=0 if never bumped). */
  getJobPriority(job_id: string): number {
    return this.priorities.get(job_id)?.priority ?? PRIORITY_DEFAULT;
  }

  /** Full audit chain of every priority change (defensive copy). */
  getJobPriorityAudit(job_id?: string): JobPriorityEntry[] {
    const trail = job_id ? this.priorityAudit.filter(e => e.job_id === job_id) : this.priorityAudit;
    return trail.slice().map(e => ({ ...e }));
  }

  /** Rank jobs by priority desc (hottest first); ties broken by most-recent bump,
   *  with a stable secondary tiebreak on insertion sequence (priorityAudit index)
   *  for sub-millisecond bumps where ISO bumped_at strings collide. */
  rankJobsByPriority(): Array<{ job_id: string; priority: number; last_bumped_at: string }> {
    const lastSeq = new Map<string, number>();
    for (let i = 0; i < this.priorityAudit.length; i++) {
      lastSeq.set(this.priorityAudit[i].job_id, i);
    }
    return Array.from(this.priorities.values())
      .sort((a, b) =>
        (b.priority - a.priority)
        || b.bumped_at.localeCompare(a.bumped_at)
        || ((lastSeq.get(b.job_id) ?? 0) - (lastSeq.get(a.job_id) ?? 0)))
      .map(e => ({ job_id: e.job_id, priority: e.priority, last_bumped_at: e.bumped_at }));
  }

  // ─── Manager task delegation ──────────────────────────────────────────────

  /**
   * Manager delegates a task to an employee. Audit trail preserved.
   * Reason ≥3 chars.
   */
  delegateTask(task_id: string, from_manager_id: string, to_employee_id: string, reason: string): DelegationEntry {
    if (!task_id || !from_manager_id || !to_employee_id) {
      throw new Error("delegateTask: task_id, from_manager_id, to_employee_id all required");
    }
    if (from_manager_id === to_employee_id) throw new Error("delegateTask: manager cannot delegate to self");
    if (!reason || reason.trim().length < 3) throw new Error("delegateTask: reason required (>=3 chars)");
    this.assertRoleAllowed(from_manager_id, this.delegateAllowedRoles, "delegateTask");
    const entry: DelegationEntry = {
      id: `DELEG-${++this.delegCounter}`,
      task_id,
      from_manager_id,
      to_employee_id,
      reason: reason.slice(0, MAX_REASON_CHARS),
      delegated_at: new Date().toISOString(),
    };
    this.delegations.push(entry);
    return { ...entry };
  }

  /** Mark a delegation as acknowledged by the receiving employee. */
  acknowledgeDelegation(delegation_id: string, employee_id: string): DelegationEntry {
    const d = this.delegations.find(x => x.id === delegation_id);
    if (!d) throw new Error(`acknowledgeDelegation: ${delegation_id} not found`);
    if (d.to_employee_id !== employee_id) {
      throw new Error("acknowledgeDelegation: only the assigned employee can acknowledge");
    }
    if (!d.acknowledged_at) d.acknowledged_at = new Date().toISOString();
    return { ...d };
  }

  /** Delegations addressed to one employee (newest first).
   *  Tiebreak on monotonic DELEG counter for sub-millisecond writes. */
  listDelegations(employee_id: string, opts: { unacknowledgedOnly?: boolean } = {}): DelegationEntry[] {
    return this.delegations
      .filter(d => d.to_employee_id === employee_id && (!opts.unacknowledgedOnly || !d.acknowledged_at))
      .sort((a, b) =>
        b.delegated_at.localeCompare(a.delegated_at)
        || (parseInt(b.id.slice("DELEG-".length), 10) - parseInt(a.id.slice("DELEG-".length), 10)))
      .map(d => ({ ...d }));
  }

  // ─── P2 office-personnel aggregation reads (zero-mutation) ────────────────

  /**
   * List every employee with a currently-active (running) task. Used by the
   * office "who's on what?" board. Returns defensive copies.
   */
  listActiveAssignments(): Array<{ employee_id: string; active_task: ActiveTask }> {
    const out: Array<{ employee_id: string; active_task: ActiveTask }> = [];
    for (const [employee_id, task_id] of this.employeeActive) {
      const task = this.activeTasks.get(task_id);
      if (task && task.status === "running") {
        out.push({ employee_id, active_task: { ...task } });
      }
    }
    // Newest active first (by started_at desc)
    out.sort((a, b) => b.active_task.started_at.localeCompare(a.active_task.started_at));
    return out;
  }

  /**
   * All delegations across all employees (defensive copy). Optional filter
   * for unacknowledged-only. Used by the office pending-delegations view.
   */
  listAllDelegations(opts: { unacknowledgedOnly?: boolean } = {}): DelegationEntry[] {
    return this.delegations
      .filter(d => !opts.unacknowledgedOnly || !d.acknowledged_at)
      .sort((a, b) => b.delegated_at.localeCompare(a.delegated_at))
      .map(d => ({ ...d }));
  }

  /** Test hook — drop all state (resets ACL configuration too). */
  reset(): void {
    this.activeTasks.clear();
    this.employeeActive.clear();
    this.messages.length = 0;
    this.priorities.clear();
    this.delegations.length = 0;
    this.priorityAudit.length = 0;
    this.msgCounter = 0;
    this.delegCounter = 0;
    this.roleResolver = null;
    this.priorityBumpAllowedRoles = DEFAULT_PRIORITY_BUMP_ROLES;
    this.delegateAllowedRoles = DEFAULT_DELEGATE_ROLES;
  }
}

export const employeeShopFloorMobileEngine = new EmployeeShopFloorMobileEngine();
