/**
 * HermesAutonomousDriverEngine -- the autonomous-build DRIVER glue that chains the
 * already-wired Hermes/Zulu wave-scheduling engines into a self-driving loop.
 *
 * HERMES-AUTONOMOUS-DRIVER (2026-06-22, slot:zulu). Built in-chat per operator
 * directive ("don't route, build it here"). Closes F1 of HERMES-OBSIDIAN-UTILIZATION-
 * ASSESSMENT-2026-06-22: the wave engines (ZuluWaveSchedulerEngine,
 * HermesGoalDecomposerEngine, HermesParallelFanoutPlannerEngine) were built +
 * dispatcher-wired but NOTHING autonomously drove the chain. This is that driver.
 *
 * DESIGN -- a PURE, DETERMINISTIC STATE MACHINE (no I/O, no agent-spawning):
 *   start(plan)                 -> validate + partition into waves (cycle-detect) -> DriveState
 *   nextBatch(state)            -> the subtask_ids ready to dispatch NOW (pure derivation)
 *   recordResults(state, [r])   -> apply a wave's results, self-correct (requeue failed
 *                                  up to maxRetries), recompute readiness -> next DriveState
 *   isComplete / aggregate      -> terminal check + final rollup
 *
 * WHY pure: the risky half -- actually SPAWNING agents to execute a wave -- stays in the
 * GATED consumer (a runner/hook/Workflow that calls nextBatch -> spawns -> feeds results
 * back via recordResults). The engine only orchestrates STATE, so it is fully testable
 * and cannot run away (R13 verifiable-core-before-integration; the consumer is the
 * default-OFF integration layer). Hard bounds (maxIterations, maxRetries) guarantee
 * termination on any DAG -- no unbounded /goal spiral (R6).
 *
 * Orchestrates over (does NOT duplicate): ZuluWaveSchedulerEngine.allWaves/computeWaveN
 * (dependency-ordered wave partition) + the SubtaskSchema DAG contract.
 */

import { z } from "zod";
import { SubtaskSchema, type Subtask } from "./HermesParallelFanoutPlannerEngine.js";
import { ZuluWaveSchedulerEngine, type WaveSchedulePlan } from "./ZuluWaveSchedulerEngine.js";

/** Termination + self-correction bounds. Conservative defaults; a pathological DAG must stop. */
export const DriveBoundsSchema = z.object({
  /** Max recordResults() calls before the run aborts (hard anti-spiral ceiling). */
  maxIterations: z.number().int().min(1).max(1000).default(100),
  /** Per-subtask retry budget: a failed subtask is re-dispatched up to this many times. */
  maxRetries: z.number().int().min(0).max(10).default(2),
});
export type DriveBounds = z.infer<typeof DriveBoundsSchema>;

/** One subtask's execution outcome, fed back by the consumer after it runs a batch. */
export const SubtaskResultSchema = z.object({
  subtask_id: z.string().min(1).max(120),
  ok: z.boolean(),
  output: z.string().max(20000).optional(),
  error: z.string().max(2000).optional(),
});
export type SubtaskResult = z.infer<typeof SubtaskResultSchema>;

export type DriveStatus = "running" | "complete" | "failed" | "aborted";

export interface DriveState {
  parent_task_id: string;
  subtasks: Subtask[];
  bounds: DriveBounds;
  /** Subtasks that succeeded (drive the wave readiness via computeWaveN). */
  completed_ids: string[];
  /** Subtasks whose retry budget is exhausted -- permanent failures (block their dependents). */
  failed_ids: string[];
  /** Per-subtask failure count (retry accounting). */
  attempts: Record<string, number>;
  /** Last recorded outcome per subtask (for aggregate()). */
  results: Record<string, { ok: boolean; output?: string; error?: string }>;
  /** How many recordResults() calls have been applied (anti-spiral counter). */
  iteration: number;
  /** Critical-path wave count from the initial partition (provenance). */
  wave_count: number;
  status: DriveStatus;
  reason: string | null;
}

function baseState(plan: WaveSchedulePlan, bounds: DriveBounds): DriveState {
  return {
    parent_task_id: plan.parent_task_id,
    subtasks: plan.subtasks,
    bounds,
    completed_ids: [],
    failed_ids: [],
    attempts: {},
    results: {},
    iteration: 0,
    wave_count: 0,
    status: "running",
    reason: null,
  };
}

function clone(s: DriveState): DriveState {
  return {
    ...s,
    subtasks: s.subtasks,
    bounds: { ...s.bounds },
    completed_ids: [...s.completed_ids],
    failed_ids: [...s.failed_ids],
    attempts: { ...s.attempts },
    results: { ...s.results },
  };
}

/**
 * Coerce a DriveState that survived a lossy transport back to a safe shape before any
 * read. The dispatcher wraps every response in slimResponse(), which STRIPS empty arrays
 * + null (responseSlimmer.ts) -- so a JSON round-tripped state arrives with completed_ids
 * / failed_ids / reason ABSENT, and `[...undefined]` / `undefined.includes()` would throw.
 * Every public re-entry point (nextBatch/recordResults/aggregate) hydrates first, mirroring
 * the sibling ZuluWaveScheduler `?? []` / Array.isArray defense
 * (ref: reference_fanout_request_slim_strips_depends_on_2026_06_18). Bounds are re-parsed
 * (safe, non-throwing) so even a tampered/partial round-trip can never exceed the schema cap.
 * Note: subtasks' inner `depends_on` may also be slim-stripped, but computeWaveN re-parses
 * the plan via SubtaskSchema internally, so an array-coerce of `subtasks` here is sufficient.
 */
function hydrate(s: DriveState): DriveState {
  const parsedBounds = DriveBoundsSchema.safeParse(s?.bounds ?? {});
  return {
    ...s,
    subtasks: Array.isArray(s?.subtasks) ? s.subtasks : [],
    completed_ids: Array.isArray(s?.completed_ids) ? s.completed_ids : [],
    failed_ids: Array.isArray(s?.failed_ids) ? s.failed_ids : [],
    attempts: s?.attempts && typeof s.attempts === "object" ? s.attempts : {},
    results: s?.results && typeof s.results === "object" ? s.results : {},
    reason: s?.reason ?? null,
    iteration: typeof s?.iteration === "number" ? s.iteration : 0,
    bounds: parsedBounds.success ? parsedBounds.data : DriveBoundsSchema.parse({}),
  };
}

/**
 * Resolve the terminal status from the current completed/failed sets. Pure.
 * Order matters: empty -> complete; over-budget -> aborted; all-done -> complete;
 * nothing-dispatchable-but-not-done -> failed (blocked by permanent failures); else running.
 */
function finalizeStatus(state: DriveState): DriveState {
  if (state.subtasks.length === 0) {
    state.status = "complete";
    state.reason = "no-subtasks";
    return state;
  }
  if (state.iteration > state.bounds.maxIterations) {
    state.status = "aborted";
    state.reason = `max-iterations-exceeded (${state.bounds.maxIterations})`;
    return state;
  }
  const nw = ZuluWaveSchedulerEngine.computeWaveN(
    { parent_task_id: state.parent_task_id, subtasks: state.subtasks },
    state.completed_ids,
  );
  if (nw.done) {
    state.status = "complete";
    state.reason = null;
    return state;
  }
  const ready = nw.ready.filter((id) => !state.failed_ids.includes(id));
  if (ready.length === 0) {
    // Not done, yet nothing can be dispatched -> the remaining DAG is blocked by
    // permanently-failed dependencies. Terminate honestly rather than loop forever.
    state.status = "failed";
    state.reason = state.failed_ids.length
      ? `blocked-by-failed-deps: ${state.failed_ids.join(",")}`
      : "deadlock-no-ready-subtasks";
    return state;
  }
  state.status = "running";
  state.reason = null;
  return state;
}

export class HermesAutonomousDriverEngine {
  /**
   * Begin a drive: validate the subtask DAG + partition into dependency-ordered waves.
   * A cyclic / unreachable DAG aborts immediately (no partial execution). Pure + sync.
   */
  static start(input: {
    parent_task_id: string;
    subtasks: Subtask[];
    bounds?: Partial<DriveBounds>;
  }): DriveState {
    const plan: WaveSchedulePlan = {
      parent_task_id: input.parent_task_id,
      subtasks: input.subtasks.map((s) => SubtaskSchema.parse(s)),
    };
    const bounds = DriveBoundsSchema.parse(input.bounds ?? {});
    const state = baseState(plan, bounds);
    let totalPartitioned = 0;
    try {
      const part = ZuluWaveSchedulerEngine.allWaves(plan);
      state.wave_count = part.wave_count;
      totalPartitioned = part.total_subtasks;
    } catch (e) {
      state.status = "aborted";
      state.reason = `invalid-dag: ${(e as Error).message}`;
      return state;
    }
    // Robust to either allWaves cycle behavior (throw OR silent-partial): if the
    // partition dropped any subtask, the DAG is cyclic/unreachable -> abort.
    if (totalPartitioned < plan.subtasks.length) {
      state.status = "aborted";
      state.reason = `cyclic-or-unreachable-dag (${totalPartitioned}/${plan.subtasks.length} partitioned)`;
      return state;
    }
    return finalizeStatus(state);
  }

  /**
   * The subtasks ready to dispatch NOW (all deps completed, not yet completed,
   * not permanently failed). Pure derivation -- the consumer spawns these.
   */
  static nextBatch(state: DriveState): { ready: string[]; subtasks: Subtask[] } {
    const h = hydrate(state); // survive slimResponse round-trip (stripped empty arrays)
    if (h.status !== "running") return { ready: [], subtasks: [] };
    const nw = ZuluWaveSchedulerEngine.computeWaveN(
      { parent_task_id: h.parent_task_id, subtasks: h.subtasks },
      h.completed_ids,
    );
    const ready = nw.ready.filter((id) => !h.failed_ids.includes(id));
    const byId = new Map(h.subtasks.map((s) => [s.subtask_id, s]));
    return { ready, subtasks: ready.map((id) => byId.get(id)).filter((s): s is Subtask => Boolean(s)) };
  }

  /**
   * Apply a dispatched wave's outcomes. Successes advance the DAG; failures with
   * retry budget remaining are LEFT not-completed so nextBatch re-offers them
   * (self-correction); failures past maxRetries become permanent. Returns the next
   * DriveState. A terminal state is immutable (returned unchanged).
   */
  static recordResults(state: DriveState, results: readonly SubtaskResult[]): DriveState {
    const h = hydrate(state); // survive slimResponse round-trip (stripped empty arrays)
    if (h.status !== "running") return state; // terminal -> return ORIGINAL ref (immutable)
    const next = clone(h);
    next.iteration += 1;
    for (const raw of results) {
      const r = SubtaskResultSchema.parse(raw);
      if (!next.subtasks.some((s) => s.subtask_id === r.subtask_id)) continue; // unknown id -> ignore
      if (next.completed_ids.includes(r.subtask_id) || next.failed_ids.includes(r.subtask_id)) continue; // already terminal
      next.results[r.subtask_id] = { ok: r.ok, output: r.output, error: r.error };
      if (r.ok) {
        next.completed_ids.push(r.subtask_id);
      } else {
        next.attempts[r.subtask_id] = (next.attempts[r.subtask_id] ?? 0) + 1;
        if (next.attempts[r.subtask_id] > next.bounds.maxRetries) {
          next.failed_ids.push(r.subtask_id); // retry budget exhausted -> permanent
        }
        // else: stays not-completed -> re-offered by nextBatch (self-correct)
      }
    }
    return finalizeStatus(next);
  }

  static isComplete(state: DriveState): boolean {
    return state.status === "complete";
  }

  static isTerminal(state: DriveState): boolean {
    return state.status !== "running";
  }

  /** Final rollup: counts + the successful outputs keyed by subtask_id. Pure. */
  static aggregate(state: DriveState): {
    parent_task_id: string;
    status: DriveStatus;
    reason: string | null;
    completed: number;
    failed: number;
    total: number;
    iterations: number;
    outputs: Record<string, string>;
  } {
    const h = hydrate(state); // survive slimResponse round-trip (stripped empty arrays)
    const outputs: Record<string, string> = {};
    for (const [id, r] of Object.entries(h.results)) {
      if (r.ok && typeof r.output === "string") outputs[id] = r.output;
    }
    return {
      parent_task_id: h.parent_task_id,
      status: h.status,
      reason: h.reason,
      completed: h.completed_ids.length,
      failed: h.failed_ids.length,
      total: h.subtasks.length,
      iterations: h.iteration,
      outputs,
    };
  }
}

export const hermesAutonomousDriverEngine = HermesAutonomousDriverEngine;
