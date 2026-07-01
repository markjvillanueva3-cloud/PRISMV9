/**
 * AutomatedTaskDelegatorEngine (G4) — AI proposer for peer task handoffs.
 *
 * Scans active employee load + machine-domain skill-match + shift schedule +
 * stalled-handoff queue, then proposes peer-to-peer task delegations through
 * the G5 AIProposalApprovalQueueEngine. On admin approval, the proposed
 * delegations are materialized via the existing EmployeeTaskHandoffEngine.
 *
 * R8 read-before-write — never mutates handoffs directly. The existing
 * EmployeeTaskHandoffEngine (shipped earlier today) remains the authoritative
 * lifecycle owner; this engine is purely a proposer that puts admin in the loop.
 *
 * PSN synergy (operator directive "wired and synergized to PSN + /system-viz"):
 *   Composes 5 PSN legs:
 *     • PSN-7 Engines: reads EmployeeTaskHandoffEngine + AcademyEngine state.
 *     • PSN-8 Algorithms: load-balance + skill-match scoring heuristic.
 *     • PSN-11 PRISM AI: submits via aiProposalApprovalQueueEngine (G5).
 *     • G2 ManagerRegistryEngine: rank gate (cross-rank handoffs need mgr).
 *     • G1 DepartmentEngine: scopes proposals to affected dept codes.
 *   systemVizRoost() emits an L7 hub entry for /system-viz integration.
 *
 * Triggers (operator green-light 2026-05-26): all 4
 *   1. nightly: full pass over open tasks → propose rebalances
 *   2. shift_gap: when a worker's shift ends mid-task
 *   3. stalled_handoff: when an existing handoff sits in 'proposed' too long
 *   4. sick_day_callin: when a worker punches out mid-shift unexpectedly
 *
 * Hotel-soul invariants: PII-free, Object.frozen, R12 fail-loud, NO direct
 * side-effects (proposals only — every materialization gated by admin via G5).
 *
 * @module AutomatedTaskDelegatorEngine
 * @milestone HOTEL/U-AUTO-TASK-DELEGATOR (2026-05-26, slot:hotel iter7 /goal Phase 2)
 */

import { aiProposalApprovalQueueEngine } from "./AIProposalApprovalQueueEngine.js";

export type DelegationTrigger =
  | "nightly"
  | "shift_gap"
  | "stalled_handoff"
  | "sick_day_callin"
  | "on_demand";

export interface ActiveTask {
  task_id: string;
  task_kind: "timeclock" | "work_order" | "traveler" | "dispatch";
  /** Current owner — null if unassigned (open delegation slot). */
  current_employee_id: string | null;
  machine_serial: string;
  /** Department code (scopes proposal routing through G5). */
  department_code: string;
  remaining_minutes: number;
  /** ISO-8601 — used for stall-watch (Lean WAITING waste). */
  assigned_at: string;
  /** True if current owner's shift ends before task completes. */
  shift_gap_predicted?: boolean;
}

export interface WorkerLoad {
  employee_id: string;
  /** Snapshot rank (used for same-rank-bypass eligibility downstream). */
  rank: string;
  /** Machines this worker is currently qualified to operate. */
  qualified_machine_serials: ReadonlyArray<string>;
  /** Department code. */
  department_code: string;
  /** Current active task minutes already loaded. */
  current_load_minutes: number;
  /** Capacity ceiling for the planning window. */
  capacity_minutes: number;
  /** True iff currently on clock. */
  clocked_in: boolean;
}

export interface DelegationProposalEntry {
  task_id: string;
  from_employee_id: string | null; // null when task was unassigned
  to_employee_id: string;
  reason: string;
  /** Load delta we expect (negative = unload from `from`, positive = load to `to`). */
  load_shift_minutes: number;
  /** Score that ranks this proposal vs alternatives (higher = better). */
  score: number;
  /** True iff same-rank bypass-eligible (handoff will fast-path post-approval). */
  same_rank: boolean;
}

export interface DelegationProposal {
  trigger: DelegationTrigger;
  generated_at: string;
  entries: ReadonlyArray<DelegationProposalEntry>;
  /** Tasks scanned but with no viable target (skill-gap or capacity-full). */
  no_viable_target_task_ids: ReadonlyArray<string>;
  affected_departments: ReadonlyArray<string>;
  total_load_shift_minutes: number;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

const ALLOWED_TRIGGERS = new Set<DelegationTrigger>([
  "nightly", "shift_gap", "stalled_handoff", "sick_day_callin", "on_demand",
]);

const ALLOWED_TASK_KINDS = new Set<ActiveTask["task_kind"]>([
  "timeclock", "work_order", "traveler", "dispatch",
]);

class AutomatedTaskDelegatorEngine {
  private proposalHistory: DelegationProposal[] = [];

  /**
   * Core scan: looks at every task → ranks candidate workers by skill-match +
   * load-balance + same-rank bypass eligibility → emits proposal entries.
   * Does NOT submit through G5; use buildAndSubmit() for the wired flow.
   */
  buildProposal(args: {
    trigger: DelegationTrigger;
    tasks: ActiveTask[];
    workers: WorkerLoad[];
  }): DelegationProposal {
    if (!ALLOWED_TRIGGERS.has(args.trigger)) {
      throw new Error(
        `AutomatedTaskDelegatorEngine.buildProposal: invalid trigger '${args.trigger}'`,
      );
    }
    if (!Array.isArray(args.tasks)) {
      throw new Error(
        "AutomatedTaskDelegatorEngine.buildProposal: tasks must be an array",
      );
    }
    if (!Array.isArray(args.workers)) {
      throw new Error(
        "AutomatedTaskDelegatorEngine.buildProposal: workers must be an array",
      );
    }

    for (const t of args.tasks) {
      this.validateTask(t);
    }
    for (const w of args.workers) {
      this.validateWorker(w);
    }

    // Snapshot worker loads — we'll consume capacity greedily across delegations
    const loadByEmp = new Map<string, number>();
    const capacityByEmp = new Map<string, number>();
    for (const w of args.workers) {
      loadByEmp.set(w.employee_id, w.current_load_minutes);
      capacityByEmp.set(w.employee_id, w.capacity_minutes);
    }

    const entries: DelegationProposalEntry[] = [];
    const noTarget: string[] = [];
    const affectedDepts = new Set<string>();
    let totalLoadShift = 0;

    // Only re-delegate tasks where: (a) unassigned, (b) shift-gap predicted,
    // (c) current owner overloaded (>capacity), or (d) explicit stall trigger
    const candidates = args.tasks.filter((t) =>
      t.current_employee_id === null ||
      t.shift_gap_predicted === true ||
      args.trigger === "stalled_handoff" ||
      args.trigger === "sick_day_callin" ||
      (t.current_employee_id !== null &&
        (loadByEmp.get(t.current_employee_id) ?? 0) >
        (capacityByEmp.get(t.current_employee_id) ?? 0)),
    );

    for (const task of candidates) {
      affectedDepts.add(task.department_code);
      const currentOwnerRank = task.current_employee_id
        ? args.workers.find((w) => w.employee_id === task.current_employee_id)?.rank
        : null;

      // Score every clocked-in qualified worker; exclude the current owner
      const scored = args.workers
        .filter((w) => w.clocked_in)
        .filter((w) => w.employee_id !== task.current_employee_id)
        .filter((w) => w.qualified_machine_serials.includes(task.machine_serial))
        .map((w) => {
          const load = loadByEmp.get(w.employee_id) ?? 0;
          const cap = capacityByEmp.get(w.employee_id) ?? 0;
          const freeMinutes = cap - load;
          if (freeMinutes < task.remaining_minutes) {
            // Insufficient capacity — score 0 disqualifies
            return { worker: w, score: 0 };
          }
          // Score = free-capacity ratio (0..1) + same-rank bypass bonus (+0.5)
          // + same-dept bonus (+0.2)
          let score = cap > 0 ? freeMinutes / cap : 0;
          if (currentOwnerRank && w.rank === currentOwnerRank) score += 0.5;
          if (w.department_code === task.department_code) score += 0.2;
          return { worker: w, score };
        })
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        noTarget.push(task.task_id);
        continue;
      }

      const chosen = scored[0]!;
      const sameRank = currentOwnerRank !== null && chosen.worker.rank === currentOwnerRank;
      entries.push(
        Object.freeze({
          task_id: task.task_id,
          from_employee_id: task.current_employee_id,
          to_employee_id: chosen.worker.employee_id,
          reason: this.buildReason(args.trigger, task, chosen.worker, sameRank, currentOwnerRank ?? null),
          load_shift_minutes: task.remaining_minutes,
          score: Number(chosen.score.toFixed(3)),
          same_rank: sameRank,
        }),
      );
      // Consume capacity on `to`, free on `from`
      loadByEmp.set(chosen.worker.employee_id, (loadByEmp.get(chosen.worker.employee_id) ?? 0) + task.remaining_minutes);
      if (task.current_employee_id) {
        loadByEmp.set(task.current_employee_id, Math.max(0, (loadByEmp.get(task.current_employee_id) ?? 0) - task.remaining_minutes));
      }
      totalLoadShift += task.remaining_minutes;
    }

    const proposal: DelegationProposal = Object.freeze({
      trigger: args.trigger,
      generated_at: new Date().toISOString(),
      entries: Object.freeze(entries),
      no_viable_target_task_ids: Object.freeze(noTarget),
      affected_departments: Object.freeze([...affectedDepts]),
      total_load_shift_minutes: totalLoadShift,
    });
    this.proposalHistory.push(proposal);
    return proposal;
  }

  /** Submit a delegation proposal through G5 admin-approval queue. */
  submitProposal(args: {
    proposal: DelegationProposal;
    explanation_ref: string;
    ttl_minutes?: number;
  }): string {
    if (!args.proposal || !args.proposal.entries) {
      throw new Error(
        "AutomatedTaskDelegatorEngine.submitProposal: proposal with entries required",
      );
    }
    if (!args.explanation_ref) {
      throw new Error(
        "AutomatedTaskDelegatorEngine.submitProposal: explanation_ref required (Hotel AI invariant)",
      );
    }
    if (args.proposal.affected_departments.length === 0) {
      throw new Error(
        "AutomatedTaskDelegatorEngine.submitProposal: proposal has no affected_departments (would orphan-route through G5)",
      );
    }
    const submitted = aiProposalApprovalQueueEngine.submit({
      kind: "auto_delegation",
      submitter_subsystem: "AutomatedTaskDelegatorEngine",
      payload: {
        trigger: args.proposal.trigger,
        entries: args.proposal.entries,
        no_viable_target_task_ids: args.proposal.no_viable_target_task_ids,
        total_load_shift_minutes: args.proposal.total_load_shift_minutes,
      },
      explanation_ref: args.explanation_ref,
      affected_departments: [...args.proposal.affected_departments],
      ttl_minutes: args.ttl_minutes ?? 60, // 1 hour — delegations are time-sensitive
    });
    return submitted.id;
  }

  buildAndSubmit(args: {
    trigger: DelegationTrigger;
    tasks: ActiveTask[];
    workers: WorkerLoad[];
    explanation_ref: string;
    ttl_minutes?: number;
  }): { proposal: DelegationProposal; proposal_id: string } {
    const proposal = this.buildProposal(args);
    if (proposal.entries.length === 0) {
      throw new Error(
        "AutomatedTaskDelegatorEngine.buildAndSubmit: proposal has 0 entries — nothing to delegate, skipping G5 submission to avoid noise",
      );
    }
    const proposal_id = this.submitProposal({
      proposal,
      explanation_ref: args.explanation_ref,
      ttl_minutes: args.ttl_minutes,
    });
    return Object.freeze({ proposal, proposal_id });
  }

  history(): ReadonlyArray<DelegationProposal> {
    return Object.freeze([...this.proposalHistory]);
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "AutomatedTaskDelegatorEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 8, 11]), // Engines, Algorithms, PRISM AI
      edges_out: Object.freeze([
        "AIProposalApprovalQueueEngine",
        "EmployeeTaskHandoffEngine",
      ]),
      edges_in: Object.freeze([
        "EmployeeMachineDomainAcademyEngine",
        "ManagerRegistryEngine",
        "DepartmentEngine",
        "EmployeeShiftScheduleEngine",
      ]),
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private buildReason(
    trigger: DelegationTrigger,
    task: ActiveTask,
    chosen: WorkerLoad,
    sameRank: boolean,
    currentOwnerRank: string | null,
  ): string {
    const fromPart = task.current_employee_id
      ? `from ${task.current_employee_id}${currentOwnerRank ? ` (${currentOwnerRank})` : ""}`
      : "from unassigned pool";
    const sameRankPart = sameRank ? " — same-rank bypass-eligible" : "";
    return `${trigger}: route ${fromPart} → ${chosen.employee_id} (${chosen.rank})${sameRankPart} for task ${task.task_id} on ${task.machine_serial}`;
  }

  private validateTask(t: ActiveTask): void {
    if (!t || !t.task_id) {
      throw new Error("AutomatedTaskDelegatorEngine: task.task_id required");
    }
    if (!ALLOWED_TASK_KINDS.has(t.task_kind)) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: task '${t.task_id}' invalid task_kind '${t.task_kind}'`,
      );
    }
    if (!t.machine_serial) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: task '${t.task_id}' missing machine_serial`,
      );
    }
    if (
      !Number.isFinite(t.remaining_minutes) ||
      t.remaining_minutes <= 0
    ) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: task '${t.task_id}' remaining_minutes must be > 0 (got ${t.remaining_minutes})`,
      );
    }
    if (!t.department_code) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: task '${t.task_id}' missing department_code`,
      );
    }
  }

  private validateWorker(w: WorkerLoad): void {
    if (!w || !w.employee_id) {
      throw new Error(
        "AutomatedTaskDelegatorEngine: worker.employee_id required",
      );
    }
    if (!w.rank) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: worker '${w.employee_id}' missing rank`,
      );
    }
    if (
      !Number.isFinite(w.current_load_minutes) ||
      w.current_load_minutes < 0
    ) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: worker '${w.employee_id}' current_load_minutes must be finite non-negative (got ${w.current_load_minutes})`,
      );
    }
    if (
      !Number.isFinite(w.capacity_minutes) ||
      w.capacity_minutes < 0
    ) {
      throw new Error(
        `AutomatedTaskDelegatorEngine: worker '${w.employee_id}' capacity_minutes must be finite non-negative (got ${w.capacity_minutes})`,
      );
    }
  }

  reset(): void {
    this.proposalHistory.length = 0;
  }
}

export const automatedTaskDelegatorEngine = new AutomatedTaskDelegatorEngine();
