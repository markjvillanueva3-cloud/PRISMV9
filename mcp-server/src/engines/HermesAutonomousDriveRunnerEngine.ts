/**
 * HermesAutonomousDriveRunnerEngine -- the GATED, async runner that turns the pure
 * HermesAutonomousDriverEngine state machine into a self-driving loop by actually
 * EXECUTING each ready wave via an injected executor.
 *
 * HERMES-AUTONOMOUS-DRIVER consumer (2026-06-22, slot:zulu). The R13 integration layer
 * over the verifiable core (HermesAutonomousDriverEngine): the driver decides WHICH
 * subtasks are ready; this runner DECIDES HOW to run them and feeds results back.
 *
 * SAFETY (R12/R6 -- this is the high-blast-radius half):
 *   - DEFAULT-OFF gate: drive() refuses to execute unless PRISM_HERMES_AUTONOMOUS_DRIVE=1
 *     (or opts.gateEnabled:true). Install never auto-fires an autonomous agent wave.
 *   - Bounded fan-out: at most maxParallel subtasks execute concurrently per wave.
 *   - Per-subtask timeout: a never-completing subtask resolves to a failure, never hangs.
 *   - Termination is guaranteed by the driver's maxIterations/maxRetries bounds; a
 *     belt-and-suspenders runner-side wave cap is the second line of defense.
 *
 * INJECTED SEAMS (no direct I/O -- mirrors HermesGoalDecomposerEngine's DecomposeLlm):
 *   - executor:  (subtask) => Promise<{ok, output?, error?}>  -- real = Ollama / a spawned
 *     Agent / a Workflow agent(); test = a deterministic mock. This is WHERE real autonomous
 *     work happens; the runner only orchestrates it.
 *   - decompose: an optional DecomposeLlm to turn a raw goal into a subtask DAG (else the
 *     caller supplies subtasks directly).
 */

import {
  HermesAutonomousDriverEngine,
  type DriveState,
  type DriveBounds,
  type SubtaskResult,
} from "./HermesAutonomousDriverEngine.js";
import { type Subtask, type SlotCandidate } from "./HermesParallelFanoutPlannerEngine.js";
import { HermesGoalDecomposerEngine, type DecomposeLlm } from "./HermesGoalDecomposerEngine.js";

/** How a single subtask is actually executed. Real = Ollama/Agent/Workflow; test = mock. */
export type SubtaskExecutor = (
  subtask: Subtask,
  ctx: { wave: number; attempt: number },
) => Promise<{ ok: boolean; output?: string; error?: string }>;

export interface DriveRunOptions {
  /** REQUIRED: runs one subtask. The runner never throws on an executor rejection. */
  executor: SubtaskExecutor;
  /** Pre-decomposed DAG. If absent, the runner decomposes `goal` + `candidates`. */
  subtasks?: Subtask[];
  /** Raw goal -- decomposed into subtasks when `subtasks` is not supplied. */
  goal?: string;
  /** Slot candidates for decomposition (required when decomposing). */
  candidates?: SlotCandidate[];
  /** Injected LLM for decomposition (passed through to HermesGoalDecomposer). */
  decompose?: DecomposeLlm;
  parent_task_id?: string;
  bounds?: Partial<DriveBounds>;
  /** Max subtasks executed concurrently per wave (default 4, floor 1). */
  maxParallel?: number;
  /** Per-subtask wall-clock timeout in ms; 0 (default) = no timeout. */
  perSubtaskTimeoutMs?: number;
  /** Override the default-OFF gate. Default reads PRISM_HERMES_AUTONOMOUS_DRIVE. */
  gateEnabled?: boolean;
}

export interface DriveWaveTrace {
  wave: number;
  dispatched: string[];
  ok: string[];
  failed: string[];
}

export interface DriveRunResult {
  ran: boolean;
  gated: boolean;
  reason: string | null;
  state: DriveState | null;
  aggregate: ReturnType<typeof HermesAutonomousDriverEngine.aggregate> | null;
  trace: DriveWaveTrace[];
}

const DEFAULT_MAX_PARALLEL = 4;
const GATE_ENV = "PRISM_HERMES_AUTONOMOUS_DRIVE";

export class HermesAutonomousDriveRunnerEngine {
  /** Is autonomous execution permitted? Explicit opt wins; else the env gate (default OFF). */
  static gateOn(explicit?: boolean): boolean {
    if (typeof explicit === "boolean") return explicit;
    return process.env[GATE_ENV] === "1";
  }

  /**
   * Drive a goal/DAG to completion: decompose (if needed) -> start the pure driver ->
   * per wave, execute the ready subtasks (bounded-parallel) via the injected executor ->
   * feed results back (self-correct) -> repeat until terminal -> aggregate.
   * Refuses (ran:false, gated:true) when the safety gate is OFF.
   */
  static async drive(opts: DriveRunOptions): Promise<DriveRunResult> {
    const trace: DriveWaveTrace[] = [];

    // SAFETY GATE: default-OFF -- never auto-fire autonomous agent waves on install.
    if (!this.gateOn(opts.gateEnabled)) {
      return {
        ran: false,
        gated: true,
        reason: `gated-off (set ${GATE_ENV}=1 or pass gateEnabled:true)`,
        state: null,
        aggregate: null,
        trace,
      };
    }
    if (typeof opts.executor !== "function") {
      throw new Error("HermesAutonomousDriveRunner.drive: opts.executor (SubtaskExecutor) is required");
    }
    const maxParallel = Math.max(1, Math.floor(opts.maxParallel ?? DEFAULT_MAX_PARALLEL));

    // 1) Resolve the subtask DAG: pre-supplied, else decompose the goal.
    let subtasks: Subtask[];
    let parentId: string;
    if (Array.isArray(opts.subtasks) && opts.subtasks.length > 0) {
      subtasks = opts.subtasks;
      parentId = opts.parent_task_id ?? "autonomous-drive";
    } else {
      if (!opts.goal || !opts.candidates?.length) {
        throw new Error(
          "HermesAutonomousDriveRunner.drive: provide `subtasks`, or `goal` + `candidates` to decompose",
        );
      }
      const req = await HermesGoalDecomposerEngine.decompose(opts.goal, opts.candidates, {
        llm: opts.decompose,
        parentId: opts.parent_task_id,
      });
      subtasks = req.subtasks as Subtask[];
      parentId = req.parent_task_id;
    }

    // 2) Start the pure driver (validates + cycle-detects). A bad DAG -> aborted up front.
    let state = HermesAutonomousDriverEngine.start({ parent_task_id: parentId, subtasks, bounds: opts.bounds });

    // 3) Drive the wave loop. Each wave's FULL ready set is drained in maxParallel-sized
    //    chunks, then recorded ONCE -- so the driver's iteration counter == wave count and
    //    maxIterations bounds wave*retry rounds (not sub-batches). The driver's bounds
    //    guarantee termination; the runner-side wave cap is defense-in-depth (R12).
    const waveCap = (opts.bounds?.maxIterations ?? 100) + 10;
    let waveNo = 0;
    while (!HermesAutonomousDriverEngine.isTerminal(state) && waveNo < waveCap) {
      const batch = HermesAutonomousDriverEngine.nextBatch(state);
      if (batch.ready.length === 0) break; // defensive: running but nothing dispatchable
      const waveResults: SubtaskResult[] = [];
      for (let i = 0; i < batch.subtasks.length; i += maxParallel) {
        const chunk = batch.subtasks.slice(i, i + maxParallel);
        const chunkResults = await Promise.all(
          chunk.map((st) => this.runOne(st, opts, waveNo, (state.attempts[st.subtask_id] ?? 0) + 1)),
        );
        waveResults.push(...chunkResults);
      }
      trace.push({
        wave: waveNo,
        dispatched: batch.ready,
        ok: waveResults.filter((r) => r.ok).map((r) => r.subtask_id),
        failed: waveResults.filter((r) => !r.ok).map((r) => r.subtask_id),
      });
      state = HermesAutonomousDriverEngine.recordResults(state, waveResults);
      waveNo += 1;
    }

    return {
      ran: true,
      gated: false,
      reason: state.reason,
      state,
      aggregate: HermesAutonomousDriverEngine.aggregate(state),
      trace,
    };
  }

  /**
   * Execute one subtask via the injected executor. NEVER throws (an executor rejection
   * becomes ok:false) and NEVER hangs (an optional timeout resolves to a failure). The
   * resulting failure re-enters the driver's self-correct/requeue path.
   */
  private static async runOne(
    subtask: Subtask,
    opts: DriveRunOptions,
    wave: number,
    attempt: number,
  ): Promise<SubtaskResult> {
    const id = subtask.subtask_id;
    const timeoutMs = Math.max(0, Math.floor(opts.perSubtaskTimeoutMs ?? 0));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      type ExecOut = { ok: boolean; output?: string; error?: string };
      const exec: Promise<ExecOut> = Promise.resolve(opts.executor(subtask, { wave, attempt }));
      const r: ExecOut =
        timeoutMs > 0
          ? await Promise.race([
              exec,
              new Promise<ExecOut>((resolve) => {
                timer = setTimeout(() => resolve({ ok: false, error: `timeout after ${timeoutMs}ms` }), timeoutMs);
                // Never let the orphaned timer pin the event loop (short-lived runner / cron).
                if (typeof timer.unref === "function") timer.unref();
              }),
            ])
          : await exec;
      return { subtask_id: id, ok: r?.ok === true, output: r?.output, error: r?.error };
    } catch (e) {
      return { subtask_id: id, ok: false, error: `executor-threw: ${(e as Error).message}` };
    } finally {
      if (timer) clearTimeout(timer); // release the timer the moment the executor wins the race
    }
  }
}

export const hermesAutonomousDriveRunnerEngine = HermesAutonomousDriveRunnerEngine;
