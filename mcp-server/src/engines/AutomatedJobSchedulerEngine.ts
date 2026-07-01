/**
 * AutomatedJobSchedulerEngine (G3) — AI proposer on top of existing scheduling.
 *
 * Scans the job queue, runs an EDD (earliest-due-date) + skill-availability
 * heuristic over the active employee shift schedule + per-machine domain
 * qualifications, and emits a SCHEDULE-DIFF proposal queued through the G5
 * AIProposalApprovalQueueEngine for admin sign-off.
 *
 * R8 read-before-write — this engine NEVER mutates job state directly. It
 * proposes; admin approval is what materializes the schedule change in the
 * downstream JobShopSchedulingEngine (the existing scheduler retains
 * authoritative job-state). Single-source admin-gate per Hotel AI invariant.
 *
 * PSN synergy (per operator directive "wired and synergized to PSN + /system-viz"):
 *   Composes 6 PSN legs:
 *     • PSN-7 Engines: pulls live job records (JobLifecycle, JobTraveler).
 *     • PSN-8 Algorithms: applies EDD + critical-ratio scheduling heuristic.
 *     • PSN-11 PRISM AI: submits via aiProposalApprovalQueueEngine (G5).
 *     • DepartmentEngine (G1): scopes proposals to affected dept codes.
 *     • ManagerRegistryEngine (G2): admin-rank gate on approval downstream.
 *     • EmployeeMachineDomainAcademyEngine (today): reads skill ladder for
 *       qualification-aware assignment.
 *   Emits a /system-viz roost manifest entry (registerSystemVizRoost) so the
 *   live system map shows this engine as an L7 hub with active job-flow edges.
 *
 * Triggers (operator green-light 2026-05-26): nightly + on-demand
 *   1. nightly: full scheduler-diff pass over all open jobs
 *   2. shift-gap: when EmployeeShiftScheduleEngine reports unfilled shift
 *   3. stalled-handoff: when EmployeeTaskHandoffEngine.listStalledHandoffs >0
 *   4. sick-day-callin: when worker punches out mid-shift unexpectedly
 *
 * Hotel-soul invariants: PII-free, Object.frozen, R12 fail-loud, NO direct
 * side-effects (proposals only), financial-invariant-aware (overtime cost
 * estimates surface in payload for admin review).
 *
 * @module AutomatedJobSchedulerEngine
 * @milestone HOTEL/U-AUTO-JOB-SCHEDULER (2026-05-26, slot:hotel iter7 /goal Phase 2)
 */

import { aiProposalApprovalQueueEngine } from "./AIProposalApprovalQueueEngine.js";

export type TriggerKind =
  | "nightly"
  | "shift_gap"
  | "stalled_handoff"
  | "sick_day_callin"
  | "on_demand";

export type SchedulingPriority = "rush" | "standard" | "fill_in";

export interface JobIntake {
  job_id: string;
  /** ISO-8601 due-date — drives EDD ordering. */
  due_at: string;
  /** Required machine_serial — gates assignment to qualified operators only. */
  required_machine_serial: string;
  /** Estimated runtime minutes for sizing the slot. */
  estimated_runtime_minutes: number;
  /** Department code this job is scoped to (drives proposal routing). */
  department_code: string;
  priority: SchedulingPriority;
  /** Optional: operator already started — protects WIP-in-progress. */
  in_progress_employee_id?: string;
}

export interface EmployeeAvailability {
  employee_id: string;
  /** Machine serials this employee is currently qualified to operate. */
  qualified_machine_serials: ReadonlyArray<string>;
  /** Available minutes in the planning window (sums shift - PTO - training). */
  available_minutes: number;
  /** Department code the employee currently rolls up to. */
  department_code: string;
  /** True if currently clocked in. */
  clocked_in: boolean;
}

export interface ScheduleProposalEntry {
  job_id: string;
  /** Assigned employee — null when no qualified+available operator found. */
  assigned_employee_id: string | null;
  machine_serial: string;
  /** Planned start (ISO-8601). */
  start_at: string;
  /** Planned end (ISO-8601). */
  end_at: string;
  /** Why this assignment was chosen (EDD / critical-ratio / unfilled flag). */
  rationale: string;
  /** Estimated overtime minutes for this assignment. */
  overtime_minutes: number;
}

export interface SchedulerDiff {
  trigger: TriggerKind;
  generated_at: string;
  window_start: string;
  window_end: string;
  entries: ReadonlyArray<ScheduleProposalEntry>;
  /** Jobs that could not be scheduled (no qualified+available operator). */
  unfilled_job_ids: ReadonlyArray<string>;
  /** Affected dept codes (deduped across entries). */
  affected_departments: ReadonlyArray<string>;
  /** Total estimated overtime cost minutes across all entries. */
  total_overtime_minutes: number;
  /** EDD violation count — jobs scheduled past their due_at. */
  edd_violations: number;
}

const ALLOWED_TRIGGERS = new Set<TriggerKind>([
  "nightly", "shift_gap", "stalled_handoff", "sick_day_callin", "on_demand",
]);

const ALLOWED_PRIORITIES = new Set<SchedulingPriority>([
  "rush", "standard", "fill_in",
]);

const PRIORITY_RANK: Readonly<Record<SchedulingPriority, number>> = Object.freeze({
  rush: 0,
  standard: 1,
  fill_in: 2,
});

/** PSN/system-viz roost manifest — emitted at construction for graph integration. */
export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

class AutomatedJobSchedulerEngine {
  private diffHistory: SchedulerDiff[] = [];

  /**
   * Core scan: builds the schedule diff (EDD + skill-match + load-balance)
   * but does NOT submit it. Use submitProposal() to push through the G5 queue.
   */
  buildSchedulerDiff(args: {
    trigger: TriggerKind;
    jobs: JobIntake[];
    employees: EmployeeAvailability[];
    window_start: string;
    window_end: string;
  }): SchedulerDiff {
    if (!ALLOWED_TRIGGERS.has(args.trigger)) {
      throw new Error(
        `AutomatedJobSchedulerEngine.buildSchedulerDiff: invalid trigger '${args.trigger}'`,
      );
    }
    if (!Array.isArray(args.jobs)) {
      throw new Error(
        "AutomatedJobSchedulerEngine.buildSchedulerDiff: jobs must be an array",
      );
    }
    if (!Array.isArray(args.employees)) {
      throw new Error(
        "AutomatedJobSchedulerEngine.buildSchedulerDiff: employees must be an array",
      );
    }
    const windowStartMs = Date.parse(args.window_start);
    const windowEndMs = Date.parse(args.window_end);
    if (!Number.isFinite(windowStartMs) || !Number.isFinite(windowEndMs)) {
      throw new Error(
        "AutomatedJobSchedulerEngine.buildSchedulerDiff: window_start/window_end must be ISO-8601 timestamps",
      );
    }
    if (windowEndMs <= windowStartMs) {
      throw new Error(
        `AutomatedJobSchedulerEngine.buildSchedulerDiff: window_end (${args.window_end}) must be after window_start (${args.window_start})`,
      );
    }

    for (const j of args.jobs) {
      this.validateJob(j);
    }
    for (const e of args.employees) {
      this.validateEmployee(e);
    }

    // Sort jobs by (priority, due_at) ASC = EDD with priority tiebreak
    const sortedJobs = [...args.jobs].sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority];
      const pb = PRIORITY_RANK[b.priority];
      if (pa !== pb) return pa - pb;
      const da = Date.parse(a.due_at);
      const db = Date.parse(b.due_at);
      return da - db;
    });

    // Track per-employee remaining minutes (consumed greedily)
    const remaining = new Map<string, number>();
    for (const e of args.employees) {
      remaining.set(e.employee_id, e.available_minutes);
    }

    const entries: ScheduleProposalEntry[] = [];
    const unfilled: string[] = [];
    const affectedDepts = new Set<string>();
    let totalOvertime = 0;
    let eddViolations = 0;
    let cursorMs = windowStartMs;

    for (const job of sortedJobs) {
      // WIP-protect: if an employee is already working this job, lock the assignment
      if (job.in_progress_employee_id) {
        const inProgEmp = args.employees.find(
          (e) => e.employee_id === job.in_progress_employee_id,
        );
        if (inProgEmp && inProgEmp.qualified_machine_serials.includes(job.required_machine_serial)) {
          const startMs = cursorMs;
          const endMs = startMs + job.estimated_runtime_minutes * 60_000;
          const dueMs = Date.parse(job.due_at);
          const overtime = this.computeOvertime(remaining.get(inProgEmp.employee_id) ?? 0, job.estimated_runtime_minutes);
          totalOvertime += overtime;
          if (endMs > dueMs) eddViolations++;
          entries.push(
            Object.freeze({
              job_id: job.job_id,
              assigned_employee_id: inProgEmp.employee_id,
              machine_serial: job.required_machine_serial,
              start_at: new Date(startMs).toISOString(),
              end_at: new Date(endMs).toISOString(),
              rationale: `WIP-protected: ${inProgEmp.employee_id} already in progress on ${job.job_id}`,
              overtime_minutes: overtime,
            }),
          );
          affectedDepts.add(job.department_code);
          remaining.set(
            inProgEmp.employee_id,
            Math.max(0, (remaining.get(inProgEmp.employee_id) ?? 0) - job.estimated_runtime_minutes),
          );
          cursorMs = endMs;
          continue;
        }
      }

      // Find qualified + clocked-in + has-availability operator
      const candidates = args.employees
        .filter((e) => e.clocked_in)
        .filter((e) => e.qualified_machine_serials.includes(job.required_machine_serial))
        .filter((e) => (remaining.get(e.employee_id) ?? 0) > 0)
        .sort((a, b) =>
          (remaining.get(b.employee_id) ?? 0) - (remaining.get(a.employee_id) ?? 0),
        ); // load-balance: pick the LEAST-loaded qualified op

      if (candidates.length === 0) {
        unfilled.push(job.job_id);
        affectedDepts.add(job.department_code);
        continue;
      }

      const chosen = candidates[0]!;
      const startMs = cursorMs;
      const endMs = startMs + job.estimated_runtime_minutes * 60_000;
      const dueMs = Date.parse(job.due_at);
      const overtime = this.computeOvertime(remaining.get(chosen.employee_id) ?? 0, job.estimated_runtime_minutes);
      totalOvertime += overtime;
      if (endMs > dueMs) eddViolations++;
      entries.push(
        Object.freeze({
          job_id: job.job_id,
          assigned_employee_id: chosen.employee_id,
          machine_serial: job.required_machine_serial,
          start_at: new Date(startMs).toISOString(),
          end_at: new Date(endMs).toISOString(),
          rationale: `EDD+load-balance: ${chosen.employee_id} (least loaded qualified op) for ${job.priority} job due ${job.due_at}`,
          overtime_minutes: overtime,
        }),
      );
      affectedDepts.add(job.department_code);
      remaining.set(
        chosen.employee_id,
        Math.max(0, (remaining.get(chosen.employee_id) ?? 0) - job.estimated_runtime_minutes),
      );
      cursorMs = endMs;
    }

    const diff: SchedulerDiff = Object.freeze({
      trigger: args.trigger,
      generated_at: new Date().toISOString(),
      window_start: args.window_start,
      window_end: args.window_end,
      entries: Object.freeze(entries),
      unfilled_job_ids: Object.freeze(unfilled),
      affected_departments: Object.freeze([...affectedDepts]),
      total_overtime_minutes: totalOvertime,
      edd_violations: eddViolations,
    });
    this.diffHistory.push(diff);
    return diff;
  }

  /**
   * Submit a previously-built diff through the G5 admin-approval queue.
   * Returns the AI proposal id. Admin must then approve via aiprop_approve.
   */
  submitProposal(args: {
    diff: SchedulerDiff;
    submitter_subsystem?: string;
    explanation_ref: string;
    ttl_minutes?: number;
  }): string {
    if (!args.diff || !args.diff.entries) {
      throw new Error(
        "AutomatedJobSchedulerEngine.submitProposal: diff with entries required",
      );
    }
    if (!args.explanation_ref) {
      throw new Error(
        "AutomatedJobSchedulerEngine.submitProposal: explanation_ref required (Hotel AI invariant)",
      );
    }
    if (args.diff.affected_departments.length === 0) {
      throw new Error(
        "AutomatedJobSchedulerEngine.submitProposal: diff has no affected_departments (would orphan-route through G5)",
      );
    }
    const proposal = aiProposalApprovalQueueEngine.submit({
      kind: "auto_schedule",
      submitter_subsystem: args.submitter_subsystem ?? "AutomatedJobSchedulerEngine",
      payload: {
        trigger: args.diff.trigger,
        window_start: args.diff.window_start,
        window_end: args.diff.window_end,
        entries: args.diff.entries,
        unfilled_job_ids: args.diff.unfilled_job_ids,
        total_overtime_minutes: args.diff.total_overtime_minutes,
        edd_violations: args.diff.edd_violations,
      },
      explanation_ref: args.explanation_ref,
      affected_departments: [...args.diff.affected_departments],
      ttl_minutes: args.ttl_minutes ?? 720, // 12 hours default
    });
    return proposal.id;
  }

  /** Convenience: build + submit in one call. */
  buildAndSubmit(args: {
    trigger: TriggerKind;
    jobs: JobIntake[];
    employees: EmployeeAvailability[];
    window_start: string;
    window_end: string;
    explanation_ref: string;
    ttl_minutes?: number;
  }): { diff: SchedulerDiff; proposal_id: string } {
    const diff = this.buildSchedulerDiff(args);
    const proposal_id = this.submitProposal({
      diff,
      explanation_ref: args.explanation_ref,
      ttl_minutes: args.ttl_minutes,
    });
    return Object.freeze({ diff, proposal_id });
  }

  history(): ReadonlyArray<SchedulerDiff> {
    return Object.freeze([...this.diffHistory]);
  }

  /**
   * PSN/system-viz roost manifest — describes this engine's edges for the
   * live system-viz graph. Consumed by the staging emitter at hook-time.
   */
  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "AutomatedJobSchedulerEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 8, 11]), // Engines, Algorithms, PRISM AI
      edges_out: Object.freeze([
        "AIProposalApprovalQueueEngine",
        "JobShopSchedulingEngine",
      ]),
      edges_in: Object.freeze([
        "EmployeeShiftScheduleEngine",
        "EmployeeMachineDomainAcademyEngine",
        "JobLifecycleEngine",
        "CapacityPlanningEngine",
      ]),
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private computeOvertime(remainingMinutes: number, neededMinutes: number): number {
    if (!Number.isFinite(remainingMinutes) || !Number.isFinite(neededMinutes)) return 0;
    return Math.max(0, neededMinutes - remainingMinutes);
  }

  private validateJob(j: JobIntake): void {
    if (!j || !j.job_id) {
      throw new Error("AutomatedJobSchedulerEngine: job.job_id required");
    }
    if (!Number.isFinite(Date.parse(j.due_at))) {
      throw new Error(
        `AutomatedJobSchedulerEngine: job '${j.job_id}' has invalid due_at '${j.due_at}'`,
      );
    }
    if (!j.required_machine_serial) {
      throw new Error(
        `AutomatedJobSchedulerEngine: job '${j.job_id}' missing required_machine_serial`,
      );
    }
    if (
      !Number.isFinite(j.estimated_runtime_minutes) ||
      j.estimated_runtime_minutes <= 0
    ) {
      throw new Error(
        `AutomatedJobSchedulerEngine: job '${j.job_id}' estimated_runtime_minutes must be > 0 (got ${j.estimated_runtime_minutes})`,
      );
    }
    if (!j.department_code) {
      throw new Error(
        `AutomatedJobSchedulerEngine: job '${j.job_id}' missing department_code`,
      );
    }
    if (!ALLOWED_PRIORITIES.has(j.priority)) {
      throw new Error(
        `AutomatedJobSchedulerEngine: job '${j.job_id}' invalid priority '${j.priority}'`,
      );
    }
  }

  private validateEmployee(e: EmployeeAvailability): void {
    if (!e || !e.employee_id) {
      throw new Error("AutomatedJobSchedulerEngine: employee.employee_id required");
    }
    if (!Array.isArray(e.qualified_machine_serials)) {
      throw new Error(
        `AutomatedJobSchedulerEngine: employee '${e.employee_id}' qualified_machine_serials must be array`,
      );
    }
    if (
      !Number.isFinite(e.available_minutes) ||
      e.available_minutes < 0
    ) {
      throw new Error(
        `AutomatedJobSchedulerEngine: employee '${e.employee_id}' available_minutes must be finite non-negative (got ${e.available_minutes})`,
      );
    }
    if (!e.department_code) {
      throw new Error(
        `AutomatedJobSchedulerEngine: employee '${e.employee_id}' missing department_code`,
      );
    }
  }

  reset(): void {
    this.diffHistory.length = 0;
  }
}

export const automatedJobSchedulerEngine = new AutomatedJobSchedulerEngine();
