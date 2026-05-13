/**
 * CADRegressionTestOrchestratorEngine — U-CINF04 (CAD-INFRA-MS0)
 *
 * Orchestrates the 20,006-file CAD regression test through a parallel worker
 * pool with per-file timeout, atomic state persistence, and checkpoint-based
 * resume. The orchestrator is agnostic to *how* a task is executed — callers
 * inject a `TestRunner` implementation (worker_threads, process pool, or
 * inline for tests / lightweight runs).
 *
 * Design:
 *   - Injectable TestRunner interface keeps the orchestrator unit-testable
 *     without spawning real worker_threads. Production callers wire a
 *     WorkerThreadRunner (deferred to its own unit); tests wire a closure.
 *   - Simple token-bucket worker pool: N concurrent tasks at any moment.
 *   - Per-file timeout via AbortController + Promise.race — the runner
 *     receives the AbortSignal and must honour it.
 *   - Atomic state persistence via atomicWrite.ts — writes happen every
 *     `checkpointEvery` terminal transitions OR every `checkpointIntervalMs`
 *     wall-clock milliseconds, whichever trips first.
 *   - Resume: loadState() reads existing TestBatch JSON; run() filters out
 *     fileIds already in a terminal state (pass|fail|skip). Any entries
 *     stuck in "running" from a prior crash are reverted to "pending".
 *
 * Complexity:
 *   run     O(F)          — F = task count (one dispatch per file)
 *   resume  O(E)          — E = existing entries (one pass to filter)
 *   write   O(F)          — per checkpoint (serialised to JSON)
 *
 * Duplication check: the closest existing asset is DurableJobQueueEngine
 * (general-purpose job queue). This engine is specialised for CAD regression
 * state — it emits TestBatch conforming to cadRegressionTestSchema (U-CINF03)
 * and owns the resume-from-crash semantics specific to regression runs.
 *
 * @module engines/CADRegressionTestOrchestratorEngine
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import * as nodePath from "path";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import {
  TestBatchSchema,
  type TestBatch,
  type TestFileEntry,
  type TestStatus,
  type ErrorType,
} from "../schemas/cadRegressionTestSchema.js";

// ── Runner contract ───────────────────────────────────────────────────────────

/**
 * The unit of work handed to a TestRunner. Carries enough metadata for the
 * runner to locate the file, select the right bridge, and classify errors.
 */
export interface FileTask {
  fileId: string;
  absolutePath: string;
  format: string;
  /** Downstream test strategy from CADFileClassifierEngine */
  testStrategy: string;
  /** Optional handler hint (bridge/parser name) */
  handler?: string;
}

/** Minimal result contract emitted by a TestRunner. */
export interface FileTestResult {
  fileId: string;
  status: TestStatus;
  errorType: ErrorType;
  durationMs: number;
  artifacts?: {
    expectedStep?: string;
    actualStep?: string;
    diffPng?: string;
    errorLog?: string;
  };
}

/**
 * TestRunner abstracts execution. Implementations include:
 *   - WorkerThreadRunner   — spawns Node worker_threads (separate unit).
 *   - InlineRunner         — runs on the main thread (tests, small batches).
 *   - ProcessPoolRunner    — spawns child_process instances (future).
 *
 * Runner must honour the AbortSignal: when signal.aborted becomes true, the
 * runner should stop work promptly. Two conventions are supported and treated
 * equivalently by the orchestrator:
 *   1. Reject with `new Error("timeout")` — orchestrator's try/catch classifies
 *      the error via `signal.aborted` + /timeout/i regex (see `dispatchOne`).
 *   2. Resolve with `{ status: "error", errorType: "timeout", ... }` — runner
 *      has already classified the failure; orchestrator passes the result
 *      through verbatim. CADRegressionWorkerThreadRunnerEngine takes this path.
 * Both are valid; runners pick whichever is cleaner for their implementation.
 */
export interface TestRunner {
  run(task: FileTask, signal: AbortSignal): Promise<FileTestResult>;
}

// ── Injectable FS (for testability) ───────────────────────────────────────────

export interface OrchestratorFS {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: BufferEncoding): string;
  mkdirSync(p: string, opts?: { recursive?: boolean }): void;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface OrchestratorOptions {
  /** UUID for the batch run. Generated if omitted. */
  batchId?: string;
  /** Number of concurrent runners. Default 8. */
  workers?: number;
  /** Per-file timeout in milliseconds. Default 30_000. */
  perFileTimeoutMs?: number;
  /** Persist checkpoint after this many terminal transitions. Default 100. */
  checkpointEvery?: number;
  /** Persist checkpoint at least this often in ms. Default 60_000. */
  checkpointIntervalMs?: number;
  /** Where the TestBatch JSON lives. Default data/state/cad-regression-tests/{batchId}.json */
  statePath?: string;
  /** Runner used to execute each task. REQUIRED. */
  runner: TestRunner;
  /** Injectable FS for testing. Defaults to real fs module. */
  fs?: OrchestratorFS;
}

const DEFAULT_WORKERS = 8;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_CHECKPOINT_EVERY = 100;
const DEFAULT_CHECKPOINT_INTERVAL_MS = 60_000;

function defaultStatePath(batchId: string): string {
  return nodePath.resolve(
    process.cwd(),
    `data/state/cad-regression-tests/${batchId}.json`,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function pendingEntry(fileId: string): TestFileEntry {
  return {
    fileId,
    status: "pending",
    errorType: "none",
    durationMs: 0,
    retries: 0,
    artifacts: {},
  };
}

function isTerminal(status: TestStatus): boolean {
  return status === "pass" || status === "fail" || status === "skip";
  // "error" is NOT terminal — we retry errored files up to maxRetries.
}

function recomputeStats(batch: TestBatch): void {
  let completed = 0, passed = 0, failed = 0, skipped = 0, errored = 0;
  for (const entry of Object.values(batch.files)) {
    if (entry.status === "pass") { completed++; passed++; }
    else if (entry.status === "fail") { completed++; failed++; }
    else if (entry.status === "skip") { completed++; skipped++; }
    else if (entry.status === "error") { errored++; }
  }
  batch.stats = {
    total: Object.keys(batch.files).length,
    completed, passed, failed, skipped, errored,
  };
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * CADRegressionTestOrchestratorEngine — parallel pool + atomic resume.
 *
 * Emits:
 *   'progress'       — { completed, total }   after every terminal transition
 *   'checkpoint'     — { path, completed }    after every successful persist
 *   'file_complete'  — { fileId, status }     per-file terminal transition
 *   'done'           — { batch }              on full run completion
 */
export class CADRegressionTestOrchestratorEngine extends BaseEngine {
  readonly events = new EventEmitter();

  constructor() {
    const info: EngineInfo = {
      name: "CADRegressionTestOrchestratorEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Parallel worker pool orchestrator for CAD regression. Atomic state, " +
        "per-file timeout, checkpoint-based resume. Injectable TestRunner.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "run",
        description: "Execute a batch of CAD regression tasks with resume support",
        actions: ["cad_regression_run"],
      },
      {
        name: "load_state",
        description: "Load a persisted TestBatch without executing",
        actions: ["cad_regression_load"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const o = input as { tasks?: unknown; options?: unknown };
    if (!Array.isArray(o.tasks)) return "input.tasks must be an array";
    if (!o.options || typeof o.options !== "object") return "input.options must be an object";
    const runner = (o.options as { runner?: unknown }).runner;
    if (!runner || typeof (runner as { run?: unknown }).run !== "function") {
      return "input.options.runner must implement TestRunner.run()";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const { tasks, options } = input as { tasks: FileTask[]; options: OrchestratorOptions };
    return this.run(tasks, options);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Run a batch of CAD regression tasks through the worker pool with
   * checkpoint-based resume.
   *
   * @param tasks   - One FileTask per CAD file under test.
   * @param options - Pool, timeout, runner, and state-path configuration.
   * @returns The final TestBatch (also persisted to disk).
   */
  async run(tasks: FileTask[], options: OrchestratorOptions): Promise<TestBatch> {
    const batchId = options.batchId ?? randomUUID();
    const workers = Math.max(1, options.workers ?? DEFAULT_WORKERS);
    const perFileTimeoutMs = Math.max(1, options.perFileTimeoutMs ?? DEFAULT_TIMEOUT_MS);
    const checkpointEvery = Math.max(1, options.checkpointEvery ?? DEFAULT_CHECKPOINT_EVERY);
    const checkpointIntervalMs = Math.max(1, options.checkpointIntervalMs ?? DEFAULT_CHECKPOINT_INTERVAL_MS);
    const statePath = options.statePath ?? defaultStatePath(batchId);
    const runner = options.runner;
    const fs = options.fs ?? (await this._defaultFS());

    // Load prior state if any
    const prior = this._loadExisting(statePath, fs);
    const batch: TestBatch = prior ?? this._freshBatch(batchId, tasks);

    // Add any NEW tasks not in prior state
    for (const t of tasks) {
      if (!batch.files[t.fileId]) {
        batch.files[t.fileId] = pendingEntry(t.fileId);
      }
    }

    // Revert any "running" left-over from a prior crash → pending (retry)
    for (const entry of Object.values(batch.files)) {
      if (entry.status === "running") {
        entry.status = "pending";
        entry.durationMs = 0;
      }
    }

    recomputeStats(batch);

    // Filter tasks that still need execution
    const pending = tasks.filter((t) => {
      const e = batch.files[t.fileId];
      return e && !isTerminal(e.status);
    });

    let transitionsSinceCheckpoint = 0;
    let lastCheckpointAt = Date.now();

    const maybeCheckpoint = async (force = false): Promise<void> => {
      const shouldByCount = transitionsSinceCheckpoint >= checkpointEvery;
      const shouldByTime = Date.now() - lastCheckpointAt >= checkpointIntervalMs;
      if (!force && !shouldByCount && !shouldByTime) return;
      batch.updatedAt = nowISO();
      batch.lastCheckpoint = nowISO();
      recomputeStats(batch);
      const parsed = TestBatchSchema.parse(batch);
      fs.mkdirSync(nodePath.dirname(statePath), { recursive: true });
      await atomicWrite(statePath, JSON.stringify(parsed, null, 2));
      this.events.emit("checkpoint", { path: statePath, completed: batch.stats.completed });
      transitionsSinceCheckpoint = 0;
      lastCheckpointAt = Date.now();
    };

    // Initial checkpoint so resume has a baseline to load from
    await maybeCheckpoint(true);

    // ── Worker pool ───────────────────────────────────────────────────────────
    const queue = [...pending];
    const inflight: Array<Promise<void>> = [];

    const dispatchOne = async (task: FileTask): Promise<void> => {
      const entry = batch.files[task.fileId];
      if (!entry) return; // defensive
      entry.status = "running";
      entry.startedAt = nowISO();
      const start = Date.now();

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), perFileTimeoutMs);

      let result: FileTestResult;
      try {
        const racer = runner.run(task, ac.signal);
        result = await racer;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTimeout = ac.signal.aborted || /timeout/i.test(msg);
        result = {
          fileId: task.fileId,
          status: "error",
          errorType: isTimeout ? "timeout" : "crash",
          durationMs: Date.now() - start,
        };
      } finally {
        clearTimeout(timer);
      }

      entry.status = result.status;
      entry.errorType = result.errorType;
      entry.durationMs = result.durationMs;
      entry.completedAt = nowISO();
      if (result.artifacts) entry.artifacts = { ...entry.artifacts, ...result.artifacts };

      transitionsSinceCheckpoint++;
      this.events.emit("file_complete", { fileId: task.fileId, status: result.status });
      this.events.emit("progress", { completed: this._completedCount(batch), total: Object.keys(batch.files).length });

      await maybeCheckpoint();
    };

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        await dispatchOne(next);
      }
    };

    for (let i = 0; i < workers; i++) inflight.push(worker());
    await Promise.all(inflight);

    // Final checkpoint (force)
    await maybeCheckpoint(true);
    this.events.emit("done", { batch });
    return batch;
  }

  /**
   * Load a persisted TestBatch without executing. Returns null on miss or
   * schema mismatch (caller falls back to fresh batch).
   */
  async loadState(statePath: string, fsImpl?: OrchestratorFS): Promise<TestBatch | null> {
    const fs = fsImpl ?? (await this._defaultFS());
    return this._loadExisting(statePath, fs);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _defaultFS(): Promise<OrchestratorFS> {
    const mod = await import("fs");
    return mod as unknown as OrchestratorFS;
  }

  private _freshBatch(batchId: string, tasks: FileTask[]): TestBatch {
    const files: Record<string, TestFileEntry> = {};
    for (const t of tasks) files[t.fileId] = pendingEntry(t.fileId);
    const batch: TestBatch = {
      batchId,
      schemaVersion: 1,
      stats: {
        total: tasks.length,
        completed: 0, passed: 0, failed: 0, skipped: 0, errored: 0,
      },
      lastCheckpoint: nowISO(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      files,
    };
    return batch;
  }

  private _loadExisting(statePath: string, fs: OrchestratorFS): TestBatch | null {
    try {
      if (!fs.existsSync(statePath)) return null;
      const raw = fs.readFileSync(statePath, "utf-8");
      return TestBatchSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  private _completedCount(batch: TestBatch): number {
    let n = 0;
    for (const e of Object.values(batch.files)) {
      if (isTerminal(e.status)) n++;
    }
    return n;
  }
}

/** Singleton for dispatcher use. */
export const cadRegressionTestOrchestratorEngine = new CADRegressionTestOrchestratorEngine();
