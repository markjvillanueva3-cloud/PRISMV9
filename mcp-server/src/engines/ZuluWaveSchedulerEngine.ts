/**
 * ZuluWaveSchedulerEngine -- multi-wave DAG scheduler for Hermes fan-out plans.
 *
 * The companion HermesParallelFanoutPlannerEngine (HZP01) decomposes a parent
 * task into N subtasks but its `plan()` only ever emits WAVE 1 -- its leaf-filter
 * (`subtasks.filter(s => s.depends_on.length === 0)`) returns the initial
 * parallelizable set and defers everything with a dependency, with no machinery
 * to compute the LATER waves once an earlier wave completes. That is the gap this
 * engine closes.
 *
 * This is the pure, deterministic scheduler:
 *   - `computeWaveN(plan, completedIds)` -> the NEXT wave's ready subtasks: every
 *     subtask all of whose `depends_on` are in `completedIds`, that is not itself
 *     already completed. This is the incremental driver a caller invokes after each
 *     returned wave, feeding back the union of completed subtask_ids.
 *   - `allWaves(plan)` -> the full topological wave partition (wave 0, 1, 2, ...)
 *     such that every subtask appears in EXACTLY ONE wave and a subtask in wave k
 *     has all its dependencies in waves < k. This is Kahn's algorithm executed
 *     level-by-level (longest-path layering of the DAG), not a flat linear order.
 *   - Cycle detection: a graph with a cycle THROWS (never an infinite loop). The
 *     subtasks left un-layered after the level walk are precisely the members of /
 *     dependents of the cycle, and they are named in the thrown error.
 *
 * Reuses the Kahn level-walk pattern (cf. GraphAlgorithmsEngine.topologicalSort,
 * RoadmapDAGEngine) but those produce a flat linear order over generic node/edge
 * strings -- neither layers a Hermes FanoutPlanRequest into dispatchable waves nor
 * supports incremental "next wave given completed set" computation. NEW capability.
 *
 * Pure: no I/O, no state mutation, deterministic (ties broken by input order, which
 * is stable because subtask_ids are unique). Input shape reuses the canonical
 * SubtaskSchema from HermesParallelFanoutPlannerEngine so a plan flows straight from
 * the planner into the scheduler with no re-hydration.
 *
 * Edge-case policy (matches the Hermes engine): malformed structural input
 * (duplicate ids, missing dep targets, self-dep) THROWS a descriptive Error --
 * these are decomposition bugs the caller must fix, identical to
 * HermesParallelFanoutPlannerEngine.plan(); a genuine dependency CYCLE THROWS (spec
 * requirement, never infinite-loop). An empty plan is VALID and yields zero waves.
 *
 * @module engines/ZuluWaveSchedulerEngine
 */

import { z } from "zod";
import {
  SubtaskSchema,
  type Subtask,
  FanoutPlanRequestSchema,
  type FanoutPlanRequest,
  type AgentAssignment,
  assignSubtasksToSlots,
} from "./HermesParallelFanoutPlannerEngine.js";
import { ZuluFleetGovernorEngine } from "./ZuluFleetGovernorEngine.js";
import { ZuluDelegationContractEngine, type DelegationContract } from "./ZuluDelegationContractEngine.js";
import type { BackPressureSignal, PressureLevel } from "./ZuluAdaptiveBackPressureEngine.js";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

/**
 * Scheduler input. Reuses the canonical {@link SubtaskSchema}. Distinct from
 * FanoutPlanRequestSchema because the scheduler does not need candidates /
 * max_parallel -- only the parent id (for provenance) and the subtask DAG. A caller
 * holding a full FanoutPlanRequest passes `{ parent_task_id, subtasks }`.
 *
 * `subtasks` may be EMPTY (a degenerate but valid plan -> zero waves); the Hermes
 * planner requires >=1, but the scheduler must not crash on an empty partition.
 */
export const WaveSchedulePlanSchema = z.object({
  parent_task_id: z.string().min(1).max(120),
  subtasks: z.array(SubtaskSchema).max(200),
});
export type WaveSchedulePlan = z.infer<typeof WaveSchedulePlanSchema>;

/** One topological wave: the subtask_ids dispatchable together in parallel. */
export interface Wave {
  /** 0-based wave index (wave 0 = leaves with no dependencies). */
  index: number;
  /** subtask_ids in this wave, in stable input order. */
  subtask_ids: string[];
}

/** Full topological wave partition of a plan. */
export interface WavePartition {
  parent_task_id: string;
  /** Ordered waves; `waves[k].subtask_ids` all have deps only in waves < k. */
  waves: Wave[];
  /** Total subtasks partitioned (== sum of wave sizes == input subtask count). */
  total_subtasks: number;
  /** Number of waves (critical-path length in dependency hops + 1, or 0 if empty). */
  wave_count: number;
}

/** Result of {@link ZuluWaveSchedulerEngine.computeWaveN}. */
export interface NextWave {
  parent_task_id: string;
  /** subtask_ids ready to dispatch NOW (all deps in completedIds, not yet completed). */
  ready: string[];
  /** subtasks still blocked: at least one dependency not yet completed. */
  blocked: string[];
  /** True when every subtask is in `completedIds` (nothing left -- the run is done). */
  done: boolean;
}

/**
 * Result of {@link ZuluWaveSchedulerEngine.nextWaveAssignments} -- the next
 * dispatchable wave as slot ASSIGNMENTS (not just ids), i.e. the executable Agent
 * batch a runtime spawns now.
 */
export interface WaveExecution {
  parent_task_id: string;
  /** Ready-now subtasks assigned to distinct slots -- the Agent batch to spawn. */
  wave_assignments: AgentAssignment[];
  /** Ready subtasks that overflowed past max_parallel -- dispatch on a follow-up call. */
  overflow: string[];
  /** Ready subtasks with no surviving candidate (refuse-list veto / no positive score). */
  unrouted: string[];
  /** Subtasks still blocked: at least one dependency not yet completed. */
  blocked: string[];
  /** True when every subtask is completed (the whole fan-out is done). */
  done: boolean;
}

/** An assignment the ZuluFleetGovernorEngine REJECTED, with the audit reason. */
export interface VetoedAssignment {
  subtask_id: string;
  slot: string;
  /** The governor's verdict reason (refuse-rule-veto / out-of-domain / no-soul-resolved). */
  reason: string;
}

/**
 * {@link ZuluWaveSchedulerEngine.governedNextWave} result -- a WaveExecution whose
 * `wave_assignments` have each PASSED the governor authority check, plus the
 * `vetoed` assignments the governor rejected (kept for the audit trail, never
 * dispatched).
 */
export interface GovernedWaveExecution extends WaveExecution {
  vetoed: VetoedAssignment[];
}

/**
 * Optional delegation pre-gate context for {@link ZuluWaveSchedulerEngine.governedNextWave}
 * (C4). When supplied, every assignment the governor authorizes is ALSO run through the
 * delegation gate (ZuluDelegationContractEngine.evaluateDelegation + composeGatedAuthority)
 * -- a strictly-narrowing, fail-closed check that can only turn an authorized assignment
 * INTO a veto, never widen authority. ABSENT -> byte-identical legacy behavior (governor
 * only). The CALLER injects the contract set (caller-provides-state, same contract as
 * `souls`), so governedNextWave stays PURE -- no disk I/O.
 *
 * `contracts` is the full durable set (active + expired + revoked); the gate re-derives
 * liveness from `nowMs`, so a matching-but-expired/revoked contract DENIES (fail-closed),
 * while no matching contract defers to the governor (zero behavior change). An empty
 * `contracts` array makes the gate a no-op for every assignment.
 */
export interface WaveDelegationGate {
  contracts: readonly DelegationContract[];
  nowMs: number;
}

/**
 * An assignment HELD this wave by the C5 back-pressure throttle. NOT a veto: the subtask is
 * authorized + stays incomplete (never added to completed_ids) so it is re-offered on the
 * next wave once the slot's pressure clears -- a throttle-and-retry, never a denial.
 */
export interface ThrottledAssignment {
  subtask_id: string;
  slot: string;
  /** The slot's sustained pressure that caused the hold (never "low"). */
  pressure_level: PressureLevel;
  recommended_delay_ms: number;
  cause: string;
  /** Sustained "blocked" -> a consumer should escalate to a human (AGENT_CHAT) per the C5 spec. */
  escalate: boolean;
}

/**
 * {@link ZuluWaveSchedulerEngine.throttleWave} result -- a GovernedWaveExecution load-shaped
 * by per-slot back-pressure. `wave_assignments` is the post-hold DISPATCH batch; `throttled`
 * lists assignments HELD this wave (empty unless enforcing); `back_pressure` surfaces the
 * consulted signals for slots under real (non-"low") pressure (advisory annotation, present
 * in advisory AND enforce modes). Authority (governor + delegation) is UNCHANGED -- the
 * throttle never moves an assignment to `vetoed`, only to `throttled`.
 */
export interface ThrottledWaveExecution extends GovernedWaveExecution {
  throttled: ThrottledAssignment[];
  back_pressure: BackPressureSignal[];
}

/**
 * One wave of {@link ZuluWaveSchedulerEngine.projectGovernedSchedule} -- the governed, authorized
 * assignments that would DISPATCH in this wave of the simulated run, plus the per-wave audit
 * (vetoed / overflow / unrouted). Distinct from a topological {@link Wave} (ids only): a projected
 * wave is capacity- AND authority-shaped (overflow spills to a later projected wave; a
 * vetoed/unrouted subtask never dispatches).
 */
export interface ProjectedWave {
  index: number;
  wave_assignments: AgentAssignment[];
  vetoed: VetoedAssignment[];
  overflow: string[];
  unrouted: string[];
}

/**
 * Result of {@link ZuluWaveSchedulerEngine.projectGovernedSchedule} -- the COMPLETE governed
 * multi-wave plan a runtime executor walks, computed in ONE call by simulating an
 * all-dispatched-succeeds run wave-by-wave. The headline is `drains`: TRUE iff every subtask
 * eventually dispatches under the current souls/delegation authority. FALSE + a non-empty `stalled`
 * means the fan-out CANNOT complete as governed (a subtask is vetoed/unrouted, or depends on one) --
 * the feasibility check a caller runs BEFORE spawning any agent. Pure: souls/delegation injected.
 */
export interface ProjectedSchedule {
  parent_task_id: string;
  /** Governed dispatch waves, in execution order. */
  waves: ProjectedWave[];
  /** Total subtasks that would dispatch across all waves (== sum of wave_assignments). */
  dispatched_count: number;
  /** Total subtasks in the plan. */
  total_subtasks: number;
  /** True iff every subtask eventually dispatches (the run drains under current authority). */
  drains: boolean;
  /** Subtasks that can NEVER dispatch under current authority (vetoed/unrouted + blocked dependents). Empty iff `drains`. */
  stalled: string[];
  /** Number of governed dispatch waves. */
  wave_count: number;
}

export class ZuluWaveSchedulerEngine {
  /**
   * Validate the plan structurally (unique ids, deps reference known ids, no
   * self-dep) and return the validated subtasks + an id-set. THROWS on any
   * structural defect -- mirrors HermesParallelFanoutPlannerEngine.plan() so a
   * malformed decomposition fails the same way at both stages.
   *
   * @param plan the fan-out plan to validate
   * @returns the parent id, validated subtasks, and their id set
   */
  private static validateStructure(plan: WaveSchedulePlan): {
    parentId: string;
    subtasks: Subtask[];
    idSet: Set<string>;
  } {
    const v = WaveSchedulePlanSchema.parse(plan);

    const idSet = new Set<string>();
    for (const s of v.subtasks) {
      if (idSet.has(s.subtask_id)) {
        throw new Error(
          `ZuluWaveScheduler: duplicate subtask_id ${s.subtask_id}`,
        );
      }
      idSet.add(s.subtask_id);
    }

    for (const s of v.subtasks) {
      for (const dep of s.depends_on) {
        if (dep === s.subtask_id) {
          throw new Error(
            `ZuluWaveScheduler: subtask ${s.subtask_id} depends on itself`,
          );
        }
        if (!idSet.has(dep)) {
          throw new Error(
            `ZuluWaveScheduler: subtask ${s.subtask_id} depends on unknown ${dep}`,
          );
        }
      }
    }

    return { parentId: v.parent_task_id, subtasks: v.subtasks, idSet };
  }

  /**
   * Compute the NEXT dispatchable wave given the set of already-completed
   * subtask_ids. The incremental driver: call once with `completedIds = []` to get
   * wave 0 (the leaves), dispatch + await them, then call again with the cumulative
   * completed set to get the next ready batch, and so on until `done`.
   *
   * A subtask is READY iff every id in its `depends_on` is in `completedIds` AND the
   * subtask itself is not already in `completedIds`. Unknown ids in `completedIds`
   * are ignored (a completed id outside this plan is harmless -- supports resuming a
   * larger fan-out from a partial completion log).
   *
   * Deterministic + pure. THROWS on a malformed plan (duplicate/missing/self dep) --
   * same contract as the planner. Does NOT require an acyclic graph: if the
   * remaining subtasks form a cycle, `ready` is empty while `blocked` is non-empty
   * and `done` is false -- the caller detects the stall (ready=[] && !done) and can
   * escalate to allWaves() for a named cycle error. (computeWaveN is the safe
   * incremental step; allWaves is the authoritative cycle detector.)
   *
   * @param plan          the fan-out plan (parent id + subtask DAG)
   * @param completedIds  subtask_ids already finished (cumulative across waves)
   * @returns the ready/blocked split + done flag
   */
  static computeWaveN(
    plan: WaveSchedulePlan,
    completedIds: readonly string[],
  ): NextWave {
    const { parentId, subtasks, idSet } = this.validateStructure(plan);

    // Restrict the completed set to ids that actually belong to this plan, so an
    // unrelated id can never spuriously satisfy a dependency.
    const completed = new Set<string>();
    if (Array.isArray(completedIds)) {
      for (const id of completedIds) {
        if (typeof id === "string" && idSet.has(id)) completed.add(id);
      }
    }

    const ready: string[] = [];
    const blocked: string[] = [];

    for (const s of subtasks) {
      if (completed.has(s.subtask_id)) continue; // already done -- not pending
      const depsMet = s.depends_on.every((d) => completed.has(d));
      if (depsMet) ready.push(s.subtask_id);
      else blocked.push(s.subtask_id);
    }

    const done = ready.length === 0 && blocked.length === 0;

    return { parent_task_id: parentId, ready, blocked, done };
  }

  /**
   * Compute the full topological wave partition of the plan -- wave 0, 1, 2, ...
   * such that every subtask is in EXACTLY ONE wave and a subtask in wave k has all
   * of its dependencies in earlier waves (< k). This is Kahn's algorithm executed
   * one in-degree-zero LEVEL at a time (longest-path layering), giving the minimum
   * number of sequential waves to drain the DAG with maximum per-wave parallelism.
   *
   * THROWS a descriptive Error if the graph contains a cycle (the un-layered
   * remainder is named) -- never an infinite loop. THROWS on malformed structural
   * input (duplicate/missing/self dep). An EMPTY plan returns zero waves.
   *
   * @param plan  the fan-out plan
   * @returns the ordered wave partition
   */
  static allWaves(plan: WaveSchedulePlan): WavePartition {
    const { parentId, subtasks } = this.validateStructure(plan);

    if (subtasks.length === 0) {
      return {
        parent_task_id: parentId,
        waves: [],
        total_subtasks: 0,
        wave_count: 0,
      };
    }

    // Remaining in-degree (count of not-yet-scheduled dependencies) per subtask.
    // We process whole levels at a time: a level = every node whose remaining
    // in-degree is 0 at the start of the level. That level is the next wave.
    const remainingInDeg = new Map<string, number>();
    for (const s of subtasks) remainingInDeg.set(s.subtask_id, s.depends_on.length);

    const scheduled = new Set<string>();
    const waves: Wave[] = [];
    let index = 0;

    while (scheduled.size < subtasks.length) {
      // Collect the current level: all unscheduled subtasks with in-degree 0,
      // in stable input order (determinism).
      const level: string[] = [];
      for (const s of subtasks) {
        if (!scheduled.has(s.subtask_id) && remainingInDeg.get(s.subtask_id) === 0) {
          level.push(s.subtask_id);
        }
      }

      // No progress with work remaining => the unscheduled remainder contains a
      // cycle (every remaining node depends on another remaining node).
      if (level.length === 0) {
        const stuck = subtasks
          .filter((s) => !scheduled.has(s.subtask_id))
          .map((s) => s.subtask_id);
        throw new Error(
          `ZuluWaveScheduler.allWaves: dependency cycle detected -- unable to schedule ${stuck.length} subtask(s): ${stuck.join(", ")}`,
        );
      }

      waves.push({ index, subtask_ids: level });

      // Mark this level scheduled, then decrement the in-degree of dependents that
      // depend on a member of this level.
      const levelSet = new Set(level);
      for (const id of level) scheduled.add(id);
      for (const s of subtasks) {
        if (scheduled.has(s.subtask_id)) continue;
        let dec = 0;
        for (const dep of s.depends_on) if (levelSet.has(dep)) dec++;
        if (dec > 0) {
          remainingInDeg.set(
            s.subtask_id,
            (remainingInDeg.get(s.subtask_id) ?? 0) - dec,
          );
        }
      }

      index++;
    }

    return {
      parent_task_id: parentId,
      waves,
      total_subtasks: subtasks.length,
      wave_count: waves.length,
    };
  }

  /** Compact one-line render of a wave partition (mirrors Hermes renderPlan style). */
  static renderPartition(p: WavePartition): string {
    const sizes = p.waves.map((w) => `w${w.index}=${w.subtask_ids.length}`).join(" ");
    return `[WAVES ${p.wave_count}] ${p.parent_task_id} total=${p.total_subtasks}${sizes ? " " + sizes : ""}`;
  }

  /** Compact one-line render of a next-wave computation. */
  static renderNextWave(n: NextWave): string {
    const tag = n.done ? "[WAVE DONE]" : "[WAVE NEXT]";
    return `${tag} ${n.parent_task_id} ready=${n.ready.length} blocked=${n.blocked.length}`;
  }

  /**
   * Compute the NEXT dispatchable wave as slot ASSIGNMENTS (the executable batch),
   * given the cumulative completed set. Bridges {@link computeWaveN} (WHICH subtasks
   * are ready) with the Hermes {@link assignSubtasksToSlots} policy (WHO runs each) --
   * the missing piece that makes wave_2+ EXECUTABLE, since the planner's plan() only
   * ever assigned the wave-1 leaves.
   *
   * The incremental driver a runtime loops on: call with `completedIds = []` -> wave-1
   * assignments; spawn that Agent batch; on completion call again with the cumulative
   * completed ids -> the next wave's assignments; repeat until `done`. Slots are
   * reusable across waves (a later wave runs only after the earlier one finishes), so
   * assignment is per-wave (one agent per slot per wave).
   *
   * Pure + deterministic. THROWS on a malformed plan (duplicate / missing-dep /
   * self-dep) -- identical contract to plan()/computeWaveN. A STALL --
   * `wave_assignments`, `overflow` and `unrouted` all empty while `blocked` is
   * non-empty and `!done` -- means the remaining subtasks form a dependency CYCLE; the
   * caller escalates to {@link allWaves} for the named cycle error. `overflow` +
   * `unrouted` are always surfaced so a ready subtask is never silently dropped (R12).
   *
   * @param req           full fan-out request (parent + subtask DAG + candidates + max_parallel)
   * @param completedIds  subtask_ids finished so far (cumulative across waves)
   * @returns the executable wave (assignments + overflow + unrouted + blocked + done)
   */
  static nextWaveAssignments(
    req: FanoutPlanRequest,
    completedIds: readonly string[],
  ): WaveExecution {
    const v = FanoutPlanRequestSchema.parse(req);
    const nw = this.computeWaveN(
      { parent_task_id: v.parent_task_id, subtasks: v.subtasks },
      completedIds,
    );
    // Ready ids -> Subtask objects (stable input order preserved by filtering).
    const readyIds = new Set(nw.ready);
    const readySubtasks = v.subtasks.filter((s) => readyIds.has(s.subtask_id));
    const { assignments, unrouted, overflow } = assignSubtasksToSlots(
      readySubtasks,
      v.candidates,
      v.max_parallel,
    );
    return {
      parent_task_id: v.parent_task_id,
      wave_assignments: assignments,
      overflow,
      unrouted,
      blocked: nw.blocked,
      done: nw.done,
    };
  }

  /**
   * C1 SAFETY GATE -- the same executable wave as {@link nextWaveAssignments}, but
   * every assignment passes through the {@link ZuluFleetGovernorEngine} authority
   * check BEFORE it is emitted (the C1 spec's "ZuluFleetGovernorEngine authority
   * check runs before every fan-out wave" requirement). For each ready assignment we
   * check `operation:"assign"` against the target slot's soul: an assignment whose
   * slot is NOT authorized to run that subtask (refuse-rule hit, out-of-domain, or no
   * resolvable soul) is moved from `wave_assignments` to `vetoed` (carrying the
   * governor's reason), so a runtime spawning the returned batch never dispatches an
   * unauthorized agent.
   *
   * Pure + deterministic: souls are INJECTED as a `slot -> SlotSoul` map (the engine
   * stays I/O-free; the dispatcher loads souls and passes the map), so the gate is
   * fully unit-testable. FAIL-CLOSED: a slot absent from `souls` resolves to null ->
   * `checkAuthority` returns authorized=false (no-soul-resolved) -> vetoed; a non-Map
   * `souls` is treated as "no souls" -> every assignment vetoed (never fabricate
   * authority). `overflow`/`unrouted`/`blocked`/`done` pass through unchanged --
   * governance gates only the assignments that would otherwise dispatch NOW.
   *
   * @param req           full fan-out request (parent + subtask DAG + candidates + max_parallel)
   * @param completedIds  subtask_ids finished so far (cumulative across waves)
   * @param souls         slot -> resolved SlotSoul (null when the slot has no soul)
   * @returns the governed wave: authorized assignments + the vetoed audit list
   */
  static governedNextWave(
    req: FanoutPlanRequest,
    completedIds: readonly string[],
    souls: ReadonlyMap<string, SlotSoul | null>,
    delegation?: WaveDelegationGate,
  ): GovernedWaveExecution {
    // nextWaveAssignments validates req (THROWS on a malformed plan) before we read it.
    const exec = this.nextWaveAssignments(req, completedIds);

    // subtask_id -> description (the governor's `task_text`) and -> domain (the delegation
    // gate's `galaxy`). Safe to read raw req here: nextWaveAssignments already parsed +
    // threw on any structural defect above.
    const descById = new Map<string, string>();
    const domainById = new Map<string, string>();
    for (const s of req.subtasks) {
      descById.set(s.subtask_id, s.description);
      domainById.set(s.subtask_id, s.domain);
    }

    const canResolveSoul = Boolean(souls) && typeof (souls as { get?: unknown }).get === "function";

    const authorized: AgentAssignment[] = [];
    const vetoed: VetoedAssignment[] = [];
    for (const a of exec.wave_assignments) {
      const soul = canResolveSoul ? (souls.get(a.slot) ?? null) : null;
      const verdict = ZuluFleetGovernorEngine.checkAuthority(
        { slot: a.slot, task_text: descById.get(a.subtask_id) || a.subtask_id, operation: "assign" },
        soul,
      );

      // The governor verdict is the BASE authority. When a delegation gate is supplied, compose
      // it as a strictly-narrowing PRE-GATE: a matching contract that is denied (expired /
      // revoked / over token-cap) FAILS CLOSED -> veto; no matching contract -> governor verdict
      // unchanged (zero behavior change). composeGatedAuthority can never WIDEN authority -- a
      // governor-vetoed assignment stays vetoed regardless of any contract.
      let finalAuthorized = verdict.authorized;
      let finalReason = verdict.reason;
      if (delegation) {
        const dverdict = ZuluDelegationContractEngine.evaluateDelegation(
          delegation.contracts,
          { grantee_slot: a.slot, operation: "assign", galaxy: domainById.get(a.subtask_id) ?? "" },
          delegation.nowMs,
        );
        const composed = ZuluDelegationContractEngine.composeGatedAuthority(dverdict, {
          authorized: verdict.authorized,
          reason: verdict.reason,
        });
        finalAuthorized = composed.authorized;
        finalReason = composed.reason;
      }

      if (finalAuthorized) authorized.push(a);
      else vetoed.push({ subtask_id: a.subtask_id, slot: a.slot, reason: finalReason });
    }

    return { ...exec, wave_assignments: authorized, vetoed };
  }

  /**
   * Project the COMPLETE governed multi-wave schedule in ONE call -- the full plan a runtime
   * executor (or a Workflow) walks, and the upfront FEASIBILITY check it runs before spawning any
   * agent. Where {@link governedNextWave} returns a SINGLE governed wave, this simulates the whole
   * run: from completed=[], repeatedly compute the governed wave, mark its DISPATCHED (authorized)
   * assignments complete, and recurse on the cumulative set until every subtask has dispatched
   * (`drains:true`) or no further authorized dispatch is possible (`drains:false`, the
   * un-completable subtasks named in `stalled`).
   *
   * Structural validation + CYCLE detection run first via {@link allWaves} (THROWS on a malformed
   * plan or a dependency cycle -- same contract as allWaves). After that, any non-progress is a
   * GOVERNANCE infeasibility (a subtask whose only slot is vetoed / has no candidate, or a dependent
   * of one), surfaced in `stalled` -- NOT thrown (it is data the caller acts on, not a defect).
   *
   * overflow (ready beyond max_parallel) is NOT a stall: those subtasks re-appear ready on the next
   * projected wave and dispatch once capacity frees, so they merely add waves. Each productive
   * iteration dispatches >=1 subtask, so the simulation runs at most `total + 1` waves (a hard cap
   * guards against any non-convergence -- R12, never an infinite loop).
   *
   * Pure + deterministic (souls + delegation injected, same contract as governedNextWave).
   *
   * @param req         full fan-out request (parent + subtask DAG + candidates + max_parallel)
   * @param souls       slot -> resolved SlotSoul (null when the slot has no soul); fail-closed
   * @param delegation  optional C4 delegation pre-gate (strictly narrowing); absent -> governor only
   * @returns the complete governed schedule + the drains/stalled feasibility verdict
   */
  static projectGovernedSchedule(
    req: FanoutPlanRequest,
    souls: ReadonlyMap<string, SlotSoul | null>,
    delegation?: WaveDelegationGate,
  ): ProjectedSchedule {
    const v = FanoutPlanRequestSchema.parse(req);
    // Structural + cycle gate (THROWS on malformed/cyclic -- identical contract to allWaves).
    const partition = this.allWaves({ parent_task_id: v.parent_task_id, subtasks: v.subtasks });
    const total = partition.total_subtasks;

    const waves: ProjectedWave[] = [];
    let completed: string[] = [];
    let drains = false;
    let stalled: string[] = [];
    const maxIters = total + 1; // each productive iter dispatches >=1; +1 is the convergence guard

    for (let i = 0; i < maxIters; i++) {
      const gov = this.governedNextWave(v, completed, souls, delegation);
      if (gov.done) { drains = true; break; }
      if (gov.wave_assignments.length === 0) {
        // Acyclic (allWaves passed) yet nothing can dispatch -> GOVERNANCE stall. Everything still
        // pending (blocked dependents + the ready-but-unroutable: vetoed/unrouted/overflow) is
        // un-completable under current authority. Surfaced as data (R12), not thrown.
        stalled = [...new Set([
          ...gov.blocked,
          ...gov.vetoed.map((x) => x.subtask_id),
          ...gov.unrouted,
          ...gov.overflow,
        ])];
        break;
      }
      waves.push({
        index: i,
        wave_assignments: gov.wave_assignments,
        vetoed: gov.vetoed,
        overflow: gov.overflow,
        unrouted: gov.unrouted,
      });
      completed = this.mergeCompleted(completed, gov.wave_assignments.map((a) => a.subtask_id));
    }

    // Convergence guard: a productive iteration always dispatches >=1, so we hit done or a
    // zero-dispatch stall within `total` iters. If neither fired (defensive, should be
    // unreachable), surface the not-yet-dispatched remainder rather than claim a false drains (R12).
    if (!drains && stalled.length === 0) {
      const done = new Set(completed);
      stalled = v.subtasks.map((s) => s.subtask_id).filter((id) => !done.has(id));
    }

    return {
      parent_task_id: v.parent_task_id,
      waves,
      dispatched_count: completed.length,
      total_subtasks: total,
      drains,
      stalled,
      wave_count: waves.length,
    };
  }

  /**
   * Compact one-line render of a projected governed schedule. Defensive against a SLIMMED schedule:
   * a dispatcher response runs slimResponse(), which DROPS empty arrays, so a round-tripped schedule
   * can arrive with `waves`/`stalled` absent (e.g. a fully-drained run has stalled:[] -> dropped).
   * Treat any missing array as empty so the render never throws on a real dispatcher round-trip (R12).
   */
  static renderProjectedSchedule(s: ProjectedSchedule): string {
    const waves = Array.isArray(s.waves) ? s.waves : [];
    const stalledN = Array.isArray(s.stalled) ? s.stalled.length : 0;
    const tag = s.drains ? "[SCHEDULE DRAINS]" : "[SCHEDULE STALLED]";
    const sizes = waves.map((w) => `w${w.index}=${(w.wave_assignments?.length ?? 0)}`).join(" ");
    return `${tag} ${s.parent_task_id} waves=${s.wave_count} dispatched=${s.dispatched_count}/${s.total_subtasks}${stalledN ? ` stalled=${stalledN}` : ""}${sizes ? " " + sizes : ""}`;
  }

  /**
   * C5 ADAPTIVE BACK-PRESSURE THROTTLE -- load-shape an already-governed wave by per-slot
   * pressure. Pure (signals injected). Composed AFTER governedNextWave: it consumes the
   * authority decision and NEVER overrides it (C5 spec: advisory; back-pressure must never
   * veto a ZuluFleetGovernor-authorized action). It only HOLDS an authorized assignment whose
   * slot is saturated, so the held subtask -- still incomplete, never added to completed_ids --
   * is re-offered on the next wave once pressure clears (throttle-and-retry, not a denial).
   *
   * @param execution  a GovernedWaveExecution (authority already decided)
   * @param signals    slot -> BackPressureSignal (from ZuluAdaptiveBackPressureEngine.assess).
   *                   Absent / empty / not-a-Map -> NO hold + NO annotation: a byte-identical
   *                   pass-through (throttled:[], back_pressure:[]).
   * @param opts.enforce        false (default) = ADVISORY: real signals are surfaced in
   *                   `back_pressure` but NOTHING is held. true = hold saturated slots.
   * @param opts.holdAtOrAbove  minimum pressure level to hold when enforcing (default "blocked").
   * @returns ThrottledWaveExecution: wave_assignments = the dispatch batch (post-hold),
   *                   `throttled` = held assignments, `back_pressure` = non-"low" signals seen.
   */
  static throttleWave(
    execution: GovernedWaveExecution,
    signals?: ReadonlyMap<string, BackPressureSignal>,
    opts: { enforce?: boolean; holdAtOrAbove?: PressureLevel } = {},
  ): ThrottledWaveExecution {
    const enforce = opts.enforce === true;
    const rank: Record<PressureLevel, number> = { low: 0, medium: 1, high: 2, blocked: 3 };
    const holdAt = rank[opts.holdAtOrAbove ?? "blocked"];
    const canResolve = Boolean(signals) && typeof (signals as { get?: unknown }).get === "function";

    const dispatched: AgentAssignment[] = [];
    const throttled: ThrottledAssignment[] = [];
    const annotation = new Map<string, BackPressureSignal>();
    for (const a of execution.wave_assignments) {
      const sig = canResolve ? signals!.get(a.slot) : undefined;
      // Surface a real (non-"low") signal for this slot regardless of enforce -- the advisory
      // half of the spec ("trend-aware pre-check"); one annotation per distinct slot.
      if (sig && sig.pressure_level !== "low" && !annotation.has(a.slot)) annotation.set(a.slot, sig);
      // HOLD only when enforcing AND the slot's sustained pressure is at/above the threshold.
      if (enforce && sig && rank[sig.pressure_level] >= holdAt) {
        throttled.push({
          subtask_id: a.subtask_id,
          slot: a.slot,
          pressure_level: sig.pressure_level,
          recommended_delay_ms: sig.recommended_delay_ms,
          cause: sig.cause,
          escalate: sig.escalate,
        });
        continue;
      }
      dispatched.push(a);
    }
    return { ...execution, wave_assignments: dispatched, throttled, back_pressure: [...annotation.values()] };
  }

  /**
   * C1+C2 RESUMABILITY: merge a continuity store's prior `completed_ids` with the
   * caller's newly-completed ids -- order-stable, deduped, non-string/empty dropped.
   * This is the bridge that lets a multi-wave build SURVIVE /compact: the wave loop
   * checkpoints its cumulative completed set to the ZuluTaskContinuityEngine after each
   * wave, and a resumed session (e.g. via self-startup re-entry) feeds the persisted set
   * back here to recompute exactly the next un-dispatched wave. Pure + deterministic.
   *
   * @param priorCompleted  completed_ids read back from the continuity record (may be undefined/garbage)
   * @param newlyCompleted  ids finished since the last checkpoint
   * @returns the cumulative completed set, dedup + order-stable
   */
  static mergeCompleted(
    priorCompleted: readonly unknown[] | undefined,
    newlyCompleted: readonly unknown[] | undefined,
  ): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const id of [...(Array.isArray(priorCompleted) ? priorCompleted : []), ...(Array.isArray(newlyCompleted) ? newlyCompleted : [])]) {
      if (typeof id === "string" && id.length > 0 && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  /**
   * C1+C2 RESUMABILITY: build the opaque `state` payload a wave loop checkpoints to the
   * ZuluTaskContinuityEngine after a governed wave step. `completed_ids` is the resume
   * key (fed back through {@link mergeCompleted} next session); the rest is human/audit
   * context. `phase` flips to `wave-loop-done` on the terminal wave so a resumer can stop
   * without recomputing. Pure -- the dispatcher does the actual checkpoint I/O.
   *
   * @param completed   the cumulative completed set (from mergeCompleted)
   * @param execution   the governed wave just computed
   * @returns the continuity `state` object
   */
  static loopCheckpointState(
    completed: readonly string[],
    execution: GovernedWaveExecution,
  ): Record<string, unknown> {
    return {
      phase: execution.done ? "wave-loop-done" : "wave-loop",
      completed_ids: [...completed],
      pending_blocked: [...execution.blocked],
      last_dispatch: execution.wave_assignments.map((a) => a.subtask_id),
      vetoed: execution.vetoed.map((v) => v.subtask_id),
      // C5: subtasks HELD this wave by back-pressure (authorized but not dispatched; re-offered
      // next wave). Defensive read -- a plain GovernedWaveExecution has no `throttled` -> [].
      throttled: ((execution as ThrottledWaveExecution).throttled ?? []).map((t) => t.subtask_id),
      done: execution.done,
    };
  }

  /** Compact one-line render of a wave execution (the dispatchable batch). */
  static renderWaveExecution(w: WaveExecution): string {
    const tag = w.done ? "[WAVE-EXEC DONE]" : "[WAVE-EXEC]";
    return `${tag} ${w.parent_task_id} dispatch=${w.wave_assignments.length} overflow=${w.overflow.length} unrouted=${w.unrouted.length} blocked=${w.blocked.length}`;
  }
}

export const zuluWaveSchedulerEngine = ZuluWaveSchedulerEngine;
