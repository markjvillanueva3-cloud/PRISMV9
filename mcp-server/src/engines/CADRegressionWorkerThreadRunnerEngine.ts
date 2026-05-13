/**
 * CADRegressionWorkerThreadRunnerEngine — U-CINF04.x (CAD-INFRA-MS0)
 *
 * Production `TestRunner` implementation for `CADRegressionTestOrchestratorEngine`.
 * Spawns a pool of Node `worker_threads`, dispatches FileTasks to idle workers,
 * collects results, and honours the orchestrator's per-file AbortSignal by
 * forcibly terminating workers that don't ack the abort within a short grace
 * window. Workers that exit unexpectedly are dropped from the pool (not reused).
 *
 * Closes U-CINF04.x-WORKER-THREAD-RUNNER (envelope `deferred_units`), which was
 * carved out of U-CINF04 because the orchestrator's design accepts an injected
 * `TestRunner` — keeping orchestrator unit-testable while letting the production
 * worker-pool ship on its own cadence.
 *
 * Design:
 *   - Lazy pool: workers are spawned on demand up to `poolSize` (default 8) and
 *     reused for subsequent tasks. Saves the 100-200 ms worker startup cost over
 *     20 K-file batches.
 *   - FIFO acquire queue: when all workers are busy, `run()` callers queue and
 *     are handed a worker in arrival order — preserves the orchestrator's
 *     dispatch ordering (helps with checkpointing locality).
 *   - Abort handling: on `signal.aborted`, the runner posts `{type:"abort"}`,
 *     waits `abortGraceMs` (default 200ms) for the worker to ack with a
 *     timeout-classified result, then terminates the worker if it's stuck.
 *     Terminated workers are dropped (new ones spawn for the next task).
 *   - Crash handling: a worker that emits `error` or exits with a non-zero code
 *     mid-task produces a `crash` result for the in-flight task and is dropped.
 *
 * Worker protocol (host → worker / worker → host):
 *   HOST → WORKER  { type: "run",   runId: number, task: FileTask }
 *   HOST → WORKER  { type: "abort", runId: number }
 *   WORKER → HOST  { type: "result", runId: number, result: FileTestResult }
 *   WORKER → HOST  { type: "log",    level: string, msg: string }   (optional)
 *
 * The `runId` is a monotonic per-task id minted by the host. Workers MUST echo
 * it on their `result` message. The host's message handler drops any `result`
 * whose `runId` doesn't match the in-flight task — this is the cross-task
 * bleed guard for reused slots: a stray "result" from the previous task can't
 * resolve the new task's promise with stale data. Workers that omit `runId`
 * (legacy) still work — the guard only filters when the worker DOES include a
 * runId AND it mismatches.
 *
 * The runner is tolerant of workers that violate the protocol: any unrecognised
 * message is dropped silently. The in-flight task's promise is settled exactly
 * once — either by `result` or by abort/error/exit fallback.
 *
 * Complexity:
 *   run        O(1) acquire + O(message-round-trip)
 *   terminate  O(N) workers   — sequential `worker.terminate()` awaits
 *
 * Duplication check: the closest existing assets are `DurableJobQueueEngine`
 * (general-purpose job queue, no worker_threads) and the orchestrator's own
 * inline closure runner used in its tests. Neither implements `TestRunner`
 * over `worker_threads`. This engine is unique.
 *
 * @module engines/CADRegressionWorkerThreadRunnerEngine
 */

import { existsSync } from "fs";
import { EventEmitter } from "events";
import { Worker, type WorkerOptions } from "worker_threads";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import type {
  FileTask,
  FileTestResult,
  TestRunner,
} from "./CADRegressionTestOrchestratorEngine.js";
import type { ErrorType, TestStatus } from "../schemas/cadRegressionTestSchema.js";

// ── Limits / defaults ────────────────────────────────────────────────────────

/** Hard ceiling on poolSize — protects against operator typos requesting thousands of workers. */
const POOL_SIZE_MAX = 64;
const POOL_SIZE_MIN = 1;
const DEFAULT_POOL_SIZE = 8;
const DEFAULT_PER_TASK_TIMEOUT_MS = 30_000;
const DEFAULT_ABORT_GRACE_MS = 200;
const DEFAULT_TERMINATE_TIMEOUT_MS = 5_000;
/** Storm-spawn breaker — after this many consecutive `_spawnSlot()` failures the runner self-terminates. */
const DEFAULT_SPAWN_FAILURE_CEILING = 5;

// ── Public types ─────────────────────────────────────────────────────────────

export interface WorkerThreadRunnerOptions {
  /** Absolute path to the worker entry script (.mjs/.cjs/.js). Must exist on disk when `eval` is false. */
  workerScript: string;
  /** Max concurrent workers. Default 8. Clamped to [1, 64]. */
  poolSize?: number;
  /** Per-task wall-clock timeout (ms). Default 30 000. Independent of the orchestrator's own signal. */
  perTaskTimeoutMs?: number;
  /** Grace window (ms) for a worker to honour an abort before forced termination. Default 200. */
  abortGraceMs?: number;
  /**
   * Consecutive `_spawnSlot()` failures tolerated before the runner self-terminates
   * to prevent storm-spawning when `workerScript` is broken. Default 5.
   * A 20K-file batch with a bad script otherwise burns ~33min × 100ms = 33min of
   * spawn attempts; with the breaker that drops to ~5 × 100ms = 0.5s.
   */
  spawnFailureCeiling?: number;
  /**
   * Underlying Worker options. Notably:
   *   - `eval: true`   → treat workerScript as source code, not a path (used by tests)
   *   - `workerData`   → frozen payload available to workers via `worker_threads.workerData`
   *   - `env`          → environment exposed to workers (process.env if omitted)
   *
   * SECURITY: `workerScript`, `workerOpts.eval`, `workerData`, and `env` flow
   * unvalidated into a Node worker_thread, which has full Node API access
   * (`fs`, `child_process`, `net`, …). Callers MUST treat all four as
   * trusted-infrastructure inputs only — never pass user-controlled values.
   * This engine is a low-level pool primitive; path normalisation, sandbox
   * boundaries, and input sanitisation are the caller's responsibility.
   */
  workerOpts?: WorkerOptions;
}

export interface WorkerPoolStats {
  /** Total live workers (idle + busy). */
  totalWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  pendingAcquires: number;
  terminated: boolean;
  /** Lifetime counters since construction. */
  tasksRun: number;
  tasksSucceeded: number;
  tasksFailed: number;
  tasksTimedOut: number;
  tasksCrashed: number;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface WorkerSlot {
  worker: Worker;
  /** True if worker is currently handling a task. */
  busy: boolean;
  /** Cleanup fn registered for the current task. Null when idle. */
  taskCleanup: (() => void) | null;
  /**
   * Last error message captured by the idle-time lifecycle handler. Surfaced
   * back through the next task's crash result so diagnostic information for
   * intermittent worker failures isn't lost between tasks.
   */
  lastIdleError: string | null;
}

interface PendingAcquire {
  resolve(slot: WorkerSlot): void;
  reject(err: Error): void;
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * worker_threads-backed `TestRunner` for the CAD regression orchestrator.
 *
 * Emits on `events`:
 *   'worker_spawn'      { id }            — a new worker was created
 *   'worker_exit'       { id, code }      — a worker exited (drained from pool)
 *   'worker_error'      { id, message }   — a worker emitted `error`
 *   'task_complete'     { fileId, status }— a task resolved (any outcome)
 */
export class CADRegressionWorkerThreadRunnerEngine
  extends BaseEngine
  implements TestRunner
{
  readonly events = new EventEmitter();

  private readonly _workerScript: string;
  private readonly _poolSize: number;
  private readonly _perTaskTimeoutMs: number;
  private readonly _abortGraceMs: number;
  private readonly _spawnFailureCeiling: number;
  private readonly _workerOpts: WorkerOptions;

  private readonly _slots: Set<WorkerSlot> = new Set();
  private readonly _idle: WorkerSlot[] = [];
  private readonly _pending: PendingAcquire[] = [];

  private _terminated = false;
  private _nextWorkerId = 0;
  private _nextRunId = 0;
  /** Consecutive `_spawnSlot()` failures since the last success — feeds the storm breaker. */
  private _consecutiveSpawnFailures = 0;

  private _tasksRun = 0;
  private _tasksSucceeded = 0;
  private _tasksFailed = 0;
  private _tasksTimedOut = 0;
  private _tasksCrashed = 0;

  constructor(opts: WorkerThreadRunnerOptions) {
    const info: EngineInfo = {
      name: "CADRegressionWorkerThreadRunnerEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "worker_threads-backed TestRunner pool for CAD regression. Per-task " +
        "timeout, abort honoring, crash-isolation. Closes U-CINF04.x.",
    };
    super(info);

    if (!opts || typeof opts !== "object") {
      throw new Error(
        "CADRegressionWorkerThreadRunnerEngine: opts must be an object with at least workerScript",
      );
    }
    if (typeof opts.workerScript !== "string" || opts.workerScript.length === 0) {
      throw new Error(
        "CADRegressionWorkerThreadRunnerEngine: workerScript must be a non-empty string",
      );
    }
    const isEvalMode = opts.workerOpts?.eval === true;
    if (!isEvalMode && !existsSync(opts.workerScript)) {
      throw new Error(
        `CADRegressionWorkerThreadRunnerEngine: workerScript not found on disk: ${opts.workerScript}`,
      );
    }

    this._workerScript = opts.workerScript;
    this._poolSize = clampPoolSize(opts.poolSize);
    this._perTaskTimeoutMs = clampPositiveMs(
      opts.perTaskTimeoutMs,
      DEFAULT_PER_TASK_TIMEOUT_MS,
    );
    this._abortGraceMs = clampPositiveMs(opts.abortGraceMs, DEFAULT_ABORT_GRACE_MS);
    this._spawnFailureCeiling = clampPositiveInt(
      opts.spawnFailureCeiling,
      DEFAULT_SPAWN_FAILURE_CEILING,
    );
    this._workerOpts = opts.workerOpts ?? {};
  }

  // ── BaseEngine contract ──────────────────────────────────────────────────

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "run",
        description: "Execute a single FileTask through the worker pool",
        actions: ["cad_regression_run"], // consumed indirectly via orchestrator injection
      },
      {
        name: "smoke",
        description: "Spawn pool, run N tasks, return aggregated results + stats",
        actions: ["cad_regression_runner_smoke"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const o = input as Record<string, unknown>;
    if (!Array.isArray(o.tasks)) return "input.tasks must be an array";
    for (let i = 0; i < o.tasks.length; i++) {
      const t = o.tasks[i] as Record<string, unknown> | undefined;
      if (!t || typeof t !== "object") return `input.tasks[${i}] must be an object`;
      if (typeof t.fileId !== "string" || t.fileId.length === 0) {
        return `input.tasks[${i}].fileId must be a non-empty string`;
      }
      // Validate the full FileTask contract so malformed tasks fail at the
      // boundary instead of producing opaque worker-side `crash` results.
      if (typeof t.absolutePath !== "string" || t.absolutePath.length === 0) {
        return `input.tasks[${i}].absolutePath must be a non-empty string`;
      }
      if (typeof t.format !== "string" || t.format.length === 0) {
        return `input.tasks[${i}].format must be a non-empty string`;
      }
      if (typeof t.testStrategy !== "string" || t.testStrategy.length === 0) {
        return `input.tasks[${i}].testStrategy must be a non-empty string`;
      }
    }
    return null;
  }

  /**
   * Smoke-test entry point. Runs `tasks` through the pool, returns per-task
   * results + pool stats, and (by default) terminates the pool before returning.
   *
   * Input: { tasks: FileTask[], terminateAfter?: boolean }
   * Output: { results: FileTestResult[], stats: WorkerPoolStats }
   */
  protected async executeImpl(input: unknown): Promise<unknown> {
    const { tasks, terminateAfter } = input as {
      tasks: FileTask[];
      terminateAfter?: boolean;
    };
    const ac = new AbortController();
    const results: FileTestResult[] = [];
    try {
      // Run sequentially in the smoke entry — the orchestrator handles
      // concurrency in production. This keeps the smoke output deterministic.
      for (const task of tasks) {
        results.push(await this.run(task, ac.signal));
      }
    } finally {
      if (terminateAfter !== false) {
        await this.terminate();
      }
    }
    return { results, stats: this.getStats() };
  }

  // ── TestRunner contract ──────────────────────────────────────────────────

  /**
   * Execute one task through the worker pool. Always resolves with a
   * FileTestResult — never throws on worker errors (those become `crash`
   * results) or aborts (those become `timeout` results).
   */
  async run(task: FileTask, signal: AbortSignal): Promise<FileTestResult> {
    if (this._terminated) {
      this._tasksRun++;
      this._tasksFailed++;
      this._tasksCrashed++;
      return errorResult(task, "crash", 0, "runner has been terminated");
    }
    if (signal.aborted) {
      // Honour pre-aborted signal without burning a worker. Account for ALL
      // three counters so callers can assert tasksRun == succeeded + failed.
      this._tasksRun++;
      this._tasksTimedOut++;
      this._tasksFailed++;
      return errorResult(task, "timeout", 0, "signal aborted before dispatch");
    }

    const startTs = Date.now();
    this._tasksRun++;
    /**
     * Per-task identifier echoed by the worker in its result message. Prevents
     * cross-task message bleed when a slot is reused: a stray `{type:"result"}`
     * message from a prior task whose runId no longer matches is silently
     * dropped instead of resolving the new task with stale data.
     */
    const runId = ++this._nextRunId;

    let slot: WorkerSlot;
    try {
      slot = await this._acquire();
    } catch (err) {
      this._tasksCrashed++;
      this._tasksFailed++;
      return errorResult(
        task,
        "crash",
        Date.now() - startTs,
        err instanceof Error ? err.message : String(err),
      );
    }

    // Surface any idle-time worker error that arrived between _acquire setting
    // slot.busy=true and per-task listener wiring (rare but observable on
    // misbehaving worker scripts that throw async errors during the idle window).
    const idleErrorAtAcquire = slot.lastIdleError;
    slot.lastIdleError = null;

    // Race three settlement paths: worker message, abort, hard timeout.
    return new Promise<FileTestResult>((resolve) => {
      let settled = false;

      const finalize = (result: FileTestResult, dropSlot: boolean): void => {
        if (settled) return;
        settled = true;
        if (slot.taskCleanup) {
          slot.taskCleanup();
          slot.taskCleanup = null;
        }
        slot.busy = false;
        if (dropSlot) {
          this._dropSlot(slot);
        } else {
          this._releaseSlot(slot);
        }
        this._accountResult(result);
        this.events.emit("task_complete", { fileId: task.fileId, status: result.status });
        resolve(result);
      };

      // ── Wire worker listeners ────────────────────────────────────────
      const onMessage = (msg: unknown): void => {
        if (
          !msg ||
          typeof msg !== "object" ||
          (msg as { type?: unknown }).type !== "result"
        ) {
          return;
        }
        // Cross-task bleed guard: workers MUST echo the runId we sent. A
        // stray result tagged with a different runId (or no runId at all
        // from a non-conformant worker) is dropped — its task already
        // settled via timeout/abort and the slot has moved on.
        const incomingRunId = (msg as { runId?: unknown }).runId;
        if (typeof incomingRunId === "number" && incomingRunId !== runId) return;
        const raw = (msg as { result?: unknown }).result as Partial<FileTestResult> | undefined;
        const result = sanitiseResult(task, raw, Date.now() - startTs);
        // Workers that produce timeout-classified results during a normal
        // run still need to be returned to the idle pool — only DROP the
        // worker when we forcibly terminated it ourselves (abort/timeout
        // grace expired).
        finalize(result, false);
      };
      const onError = (err: unknown): void => {
        const msg = err instanceof Error ? err.message : String(err);
        this.events.emit("worker_error", {
          id: slot.worker.threadId ?? -1,
          message: msg,
        });
        finalize(
          errorResult(task, "crash", Date.now() - startTs, msg),
          true, // drop — worker is corrupt
        );
      };
      const onExit = (code: number): void => {
        if (code === 0) {
          // Graceful exit. If finalize already ran, settled guards no-op.
          // If finalize did NOT run (worker exited cleanly without sending
          // a result), surface as crash so the orchestrator doesn't wait
          // the full per-task timeout for a silent-exit case.
          if (!settled) {
            finalize(
              errorResult(
                task,
                "crash",
                Date.now() - startTs,
                "worker exited code=0 without sending result",
              ),
              true,
            );
          }
          return;
        }
        finalize(
          errorResult(task, "crash", Date.now() - startTs, `worker exited code=${code}`),
          true,
        );
      };

      slot.worker.on("message", onMessage);
      // Use `.on()` (not `.once()`) so a worker emitting two errors in rapid
      // succession doesn't fall through to the idle lifecycle handler, which
      // would mis-classify the second error and double-drop the slot. The
      // `settled` flag inside finalize() is the canonical de-dup guard.
      slot.worker.on("error", onError);
      slot.worker.on("exit", onExit);

      // ── Hard timeout (independent safety net) ────────────────────────
      const hardTimer = setTimeout(() => {
        if (settled) return;
        // Force-terminate; the exit event will fire and be ignored by `settled`.
        this._tasksTimedOut++;
        void slot.worker.terminate().catch(() => undefined);
        finalize(
          errorResult(
            task,
            "timeout",
            Date.now() - startTs,
            `per-task timeout ${this._perTaskTimeoutMs}ms exceeded`,
          ),
          true,
        );
      }, this._perTaskTimeoutMs);

      // ── Orchestrator abort handling ──────────────────────────────────
      let graceTimer: NodeJS.Timeout | null = null;
      const onAbort = (): void => {
        if (settled) return;
        try {
          slot.worker.postMessage({ type: "abort", runId });
        } catch {
          // Worker may already be dead — fall through to grace timer.
        }
        graceTimer = setTimeout(() => {
          if (settled) return;
          void slot.worker.terminate().catch(() => undefined);
          this._tasksTimedOut++;
          finalize(
            errorResult(task, "timeout", Date.now() - startTs, "abort signal honored"),
            true,
          );
        }, this._abortGraceMs);
      };
      signal.addEventListener("abort", onAbort, { once: true });

      // Register per-task cleanup. Runs from finalize() before slot returns
      // to the idle pool or is dropped.
      slot.taskCleanup = (): void => {
        clearTimeout(hardTimer);
        if (graceTimer) clearTimeout(graceTimer);
        signal.removeEventListener("abort", onAbort);
        slot.worker.removeListener("message", onMessage);
        slot.worker.removeListener("error", onError);
        slot.worker.removeListener("exit", onExit);
      };

      // ── Dispatch ─────────────────────────────────────────────────────
      try {
        slot.worker.postMessage({ type: "run", runId, task });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Prefer the stashed idle-time error (more diagnostic than "postMessage failed")
        // when both are present.
        finalize(
          errorResult(
            task,
            "crash",
            Date.now() - startTs,
            idleErrorAtAcquire ?? msg,
          ),
          true,
        );
      }
    });
  }

  // ── Pool management ──────────────────────────────────────────────────────

  /**
   * Return a snapshot of pool state + lifetime counters. Safe to call from any
   * context (no I/O, no locks).
   */
  getStats(): WorkerPoolStats {
    let busy = 0;
    for (const s of this._slots) if (s.busy) busy++;
    return {
      totalWorkers: this._slots.size,
      idleWorkers: this._idle.length,
      busyWorkers: busy,
      pendingAcquires: this._pending.length,
      terminated: this._terminated,
      tasksRun: this._tasksRun,
      tasksSucceeded: this._tasksSucceeded,
      tasksFailed: this._tasksFailed,
      tasksTimedOut: this._tasksTimedOut,
      tasksCrashed: this._tasksCrashed,
    };
  }

  /**
   * Terminate all workers and reject any pending acquires. Idempotent.
   * Awaits each worker's `terminate()` up to `timeoutMs` (default 5 000) before
   * giving up — at which point the worker is effectively orphaned (Node will
   * still kill it on parent exit).
   */
  async terminate(timeoutMs: number = DEFAULT_TERMINATE_TIMEOUT_MS): Promise<void> {
    if (this._terminated) return;
    this._terminated = true;

    // Reject anyone still waiting for a worker.
    for (const p of this._pending) {
      try {
        p.reject(new Error("runner terminated"));
      } catch {
        /* defensive */
      }
    }
    this._pending.length = 0;

    const dl = Math.max(1, timeoutMs);
    const snapshot = Array.from(this._slots);
    await Promise.all(
      snapshot.map((slot) => {
        let timer: NodeJS.Timeout | null = null;
        return Promise.race([
          slot.worker.terminate().then(() => undefined).catch(() => undefined),
          new Promise<void>((r) => {
            timer = setTimeout(r, dl);
            // unref() lets Node exit even if the timer is still pending;
            // prevents a hanging terminate from holding the event loop open.
            timer.unref();
          }),
        ]).finally(() => {
          if (timer !== null) clearTimeout(timer);
        });
      }),
    );
    this._slots.clear();
    this._idle.length = 0;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private _acquire(): Promise<WorkerSlot> {
    if (this._terminated) return Promise.reject(new Error("runner terminated"));

    // Fast path: hand out an idle worker.
    const idle = this._idle.shift();
    if (idle) {
      idle.busy = true;
      return Promise.resolve(idle);
    }

    // Grow the pool if we haven't hit the ceiling.
    if (this._slots.size < this._poolSize) {
      try {
        const slot = this._trySpawnSlot();
        slot.busy = true;
        return Promise.resolve(slot);
      } catch (err) {
        return Promise.reject(
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }

    // Queue.
    return new Promise<WorkerSlot>((resolve, reject) => {
      this._pending.push({ resolve, reject });
    });
  }

  /**
   * `_spawnSlot()` wrapped with the consecutive-failure breaker. On `N`
   * consecutive failures the runner self-terminates so callers fail fast on
   * a fundamentally broken `workerScript` instead of looping forever.
   */
  private _trySpawnSlot(): WorkerSlot {
    try {
      const slot = this._spawnSlot();
      this._consecutiveSpawnFailures = 0;
      return slot;
    } catch (err) {
      this._consecutiveSpawnFailures++;
      if (this._consecutiveSpawnFailures >= this._spawnFailureCeiling) {
        // Self-terminate to stop the storm. terminate() rejects all pending
        // acquires with "runner terminated"; the caller of _trySpawnSlot will
        // get the original spawn error.
        void this.terminate().catch(() => undefined);
      }
      throw err;
    }
  }

  private _releaseSlot(slot: WorkerSlot): void {
    if (this._terminated) {
      // Don't keep idle workers around if we're shutting down — terminate it.
      this._dropSlot(slot);
      return;
    }
    const next = this._pending.shift();
    if (next) {
      slot.busy = true;
      next.resolve(slot);
      return;
    }
    this._idle.push(slot);
  }

  private _dropSlot(slot: WorkerSlot): void {
    if (!this._slots.has(slot)) return;
    this._slots.delete(slot);
    const idleIdx = this._idle.indexOf(slot);
    if (idleIdx !== -1) this._idle.splice(idleIdx, 1);
    // Best-effort terminate — fire and forget. exitCode might already be set.
    void slot.worker.terminate().catch(() => undefined);
    // Drain pending acquires while capacity allows. A single dropped slot
    // can unblock more than one pending caller if the pool was previously
    // saturated AND several drops happen in a burst. Loop until either
    // pending is empty, capacity is full, or a spawn fails (in which case
    // the storm-breaker in _trySpawnSlot will eventually self-terminate the
    // runner and reject the rest via terminate()).
    while (
      !this._terminated &&
      this._pending.length > 0 &&
      this._slots.size < this._poolSize
    ) {
      const next = this._pending.shift();
      if (!next) break;
      try {
        const fresh = this._trySpawnSlot();
        fresh.busy = true;
        next.resolve(fresh);
      } catch (err) {
        next.reject(err instanceof Error ? err : new Error(String(err)));
        // If the breaker tripped, stop trying to spawn replacements; the
        // self-terminate inside _trySpawnSlot rejected the rest of pending.
        if (this._terminated) break;
        // Otherwise keep going — there may still be capacity and the next
        // pending caller deserves an attempt.
      }
    }
  }

  private _spawnSlot(): WorkerSlot {
    const id = this._nextWorkerId++;
    const worker = new Worker(this._workerScript, this._workerOpts);
    const slot: WorkerSlot = {
      worker,
      busy: false,
      taskCleanup: null,
      lastIdleError: null,
    };
    // Lifecycle listeners — fired when slot is IDLE (per-task listeners
    // installed in run() take precedence when the slot is busy).
    worker.on("exit", (code) => {
      this.events.emit("worker_exit", { id, code });
      // If the slot wasn't claimed by a task (i.e. idle), prune it.
      if (!slot.busy) this._dropSlot(slot);
    });
    worker.on("error", (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.events.emit("worker_error", { id, message: msg });
      if (!slot.busy) {
        // Idle-time error — drop the slot; per-task handler isn't wired.
        this._dropSlot(slot);
      } else {
        // Busy-but-pre-listener-wire window: stash the message so the
        // next per-task dispatch surfaces it instead of "postMessage failed".
        slot.lastIdleError = msg;
      }
    });
    this._slots.add(slot);
    this.events.emit("worker_spawn", { id });
    return slot;
  }

  private _accountResult(r: FileTestResult): void {
    if (r.status === "pass") this._tasksSucceeded++;
    else if (r.status === "fail" || r.status === "skip") this._tasksFailed++;
    else if (r.errorType === "timeout") {
      // _tasksTimedOut already incremented in the abort/hard-timeout branches.
      this._tasksFailed++;
    } else {
      this._tasksCrashed++;
      this._tasksFailed++;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clampPoolSize(raw: number | undefined): number {
  if (raw == null) return DEFAULT_POOL_SIZE;
  if (!Number.isFinite(raw)) return DEFAULT_POOL_SIZE;
  const n = Math.floor(raw);
  if (n < POOL_SIZE_MIN) return POOL_SIZE_MIN;
  if (n > POOL_SIZE_MAX) return POOL_SIZE_MAX;
  return n;
}

function clampPositiveMs(raw: number | undefined, fallback: number): number {
  if (raw == null) return fallback;
  if (!Number.isFinite(raw)) return fallback;
  const n = Math.floor(raw);
  if (n < 1) return 1;
  return n;
}

function clampPositiveInt(raw: number | undefined, fallback: number): number {
  if (raw == null) return fallback;
  if (!Number.isFinite(raw)) return fallback;
  const n = Math.floor(raw);
  if (n < 1) return 1;
  return n;
}

function errorResult(
  task: FileTask,
  errorType: ErrorType,
  durationMs: number,
  msg?: string,
): FileTestResult {
  const status: TestStatus = "error";
  return {
    fileId: task.fileId,
    status,
    errorType,
    durationMs: Math.max(0, Math.floor(durationMs)),
    artifacts: msg ? { errorLog: msg } : undefined,
  };
}

/**
 * Coerce whatever the worker sent into a well-formed FileTestResult. Workers
 * are free to send `{result: {fileId, status, errorType, durationMs, ...}}` —
 * missing fields are filled with safe defaults rather than throwing.
 */
function sanitiseResult(
  task: FileTask,
  raw: Partial<FileTestResult> | undefined,
  fallbackDuration: number,
): FileTestResult {
  if (!raw || typeof raw !== "object") {
    return errorResult(task, "crash", fallbackDuration, "worker returned non-object result");
  }
  const ok = raw.status === "pass" || raw.status === "fail" || raw.status === "skip";
  const errored = raw.status === "error";
  const status: TestStatus = ok ? raw.status! : errored ? "error" : "error";
  const errorType: ErrorType =
    (typeof raw.errorType === "string" &&
      ["none", "format", "parse", "generation", "comparison", "timeout", "crash"].includes(
        raw.errorType,
      )
      ? (raw.errorType as ErrorType)
      : ok
        ? "none"
        : "crash");
  const durationMs =
    typeof raw.durationMs === "number" && Number.isFinite(raw.durationMs) && raw.durationMs >= 0
      ? Math.floor(raw.durationMs)
      : fallbackDuration;
  return {
    fileId: task.fileId,
    status,
    errorType,
    durationMs,
    artifacts: raw.artifacts,
  };
}

/**
 * Factory for cases where importing a class directly is awkward (e.g. from a
 * dispatcher's lazy `await import()` block). Equivalent to `new ...()`.
 */
export function createCADRegressionWorkerThreadRunner(
  opts: WorkerThreadRunnerOptions,
): CADRegressionWorkerThreadRunnerEngine {
  return new CADRegressionWorkerThreadRunnerEngine(opts);
}
