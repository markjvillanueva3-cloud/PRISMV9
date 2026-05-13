/**
 * Tests for CADRegressionWorkerThreadRunnerEngine — U-CINF04.x.
 *
 * Coverage: happy path + abort + crash + timeout + idle exit + bad-script init
 *           + adversarial inputs (NaN/Infinity/zero pool sizes, oversized
 *           payloads, malformed worker results) + variability (poolSize 1/4/8)
 *           + round-trip through the orchestrator's run() loop.
 *
 * Workers are spawned via `workerOpts.eval = true` and inline source code so
 * the tests are hermetic (no external fixture files). Each test's worker
 * source explicitly echoes the protocol `runId` to satisfy the bleed guard.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CADRegressionWorkerThreadRunnerEngine,
  createCADRegressionWorkerThreadRunner,
} from "../engines/CADRegressionWorkerThreadRunnerEngine.js";
import {
  cadRegressionTestOrchestratorEngine,
  type FileTask,
} from "../engines/CADRegressionTestOrchestratorEngine.js";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";

// ── Inline worker scripts (eval mode) ───────────────────────────────────────

/** Worker that always returns `pass`. Echoes runId. */
const HAPPY_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", (msg) => {
    if (!msg || msg.type !== "run") return;
    parentPort.postMessage({
      type: "result",
      runId: msg.runId,
      result: {
        fileId: msg.task.fileId,
        status: "pass",
        errorType: "none",
        durationMs: 1,
      },
    });
  });
`;

/** Worker that echoes whatever status the task carries via `handler`. */
const ECHO_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", (msg) => {
    if (!msg || msg.type !== "run") return;
    const handler = msg.task.handler || "pass";
    parentPort.postMessage({
      type: "result",
      runId: msg.runId,
      result: {
        fileId: msg.task.fileId,
        status: handler,
        errorType: handler === "fail" ? "comparison" : "none",
        durationMs: 2,
      },
    });
  });
`;

/** Worker that throws inside its message handler (exits non-zero). */
const CRASH_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", () => {
    // Throw asynchronously so the worker propagates an "error" event.
    setImmediate(() => { throw new Error("forced crash from worker"); });
  });
`;

/** Worker that NEVER responds — used to test per-task timeout. */
const HANG_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", () => {
    // Intentional: just sit on the message and never reply.
  });
`;

/** Worker that responds AFTER `task.handler` ms — used to test abort grace. */
const SLOW_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", (msg) => {
    if (!msg || msg.type !== "run") return;
    const delay = parseInt(msg.task.handler || "100", 10);
    setTimeout(() => {
      parentPort.postMessage({
        type: "result",
        runId: msg.runId,
        result: {
          fileId: msg.task.fileId,
          status: "pass",
          errorType: "none",
          durationMs: delay,
        },
      });
    }, delay);
  });
`;

/** Worker that handles abort cooperatively (returns timeout result on abort msg). */
const ABORT_AWARE_WORKER = `
  const { parentPort } = require("worker_threads");
  let currentTask = null;
  let currentRunId = null;
  parentPort.on("message", (msg) => {
    if (msg && msg.type === "run") {
      currentTask = msg.task;
      currentRunId = msg.runId;
      // Schedule a delayed reply we want to cancel on abort.
      setTimeout(() => {
        if (currentTask) {
          parentPort.postMessage({
            type: "result",
            runId: currentRunId,
            result: {
              fileId: currentTask.fileId,
              status: "pass",
              errorType: "none",
              durationMs: 50,
            },
          });
          currentTask = null;
        }
      }, 50);
    } else if (msg && msg.type === "abort") {
      const t = currentTask;
      currentTask = null;
      if (t) {
        parentPort.postMessage({
          type: "result",
          runId: msg.runId,
          result: {
            fileId: t.fileId,
            status: "error",
            errorType: "timeout",
            durationMs: 0,
          },
        });
      }
    }
  });
`;

/** Worker that returns a malformed result (missing fields). */
const MALFORMED_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", (msg) => {
    if (!msg || msg.type !== "run") return;
    parentPort.postMessage({
      type: "result",
      runId: msg.runId,
      result: { /* deliberately empty */ },
    });
  });
`;

/** Worker that sends TWO `result` messages — second has the wrong runId. */
const BLEED_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", (msg) => {
    if (!msg || msg.type !== "run") return;
    parentPort.postMessage({
      type: "result",
      runId: msg.runId,
      result: { fileId: msg.task.fileId, status: "pass", errorType: "none", durationMs: 1 },
    });
    // Stray second result with stale (mismatched) runId — must be ignored.
    parentPort.postMessage({
      type: "result",
      runId: msg.runId + 9999,
      result: { fileId: msg.task.fileId, status: "fail", errorType: "comparison", durationMs: 999 },
    });
  });
`;

/** Worker that exits cleanly without sending any result. */
const SILENT_EXIT_WORKER = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", () => {
    // Exit cleanly without responding.
    process.exit(0);
  });
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function task(id: string, handler?: string): FileTask {
  return {
    fileId: id,
    absolutePath: `/tmp/fake/${id}.sldprt`,
    format: "sldprt",
    testStrategy: "part-validate",
    handler,
  };
}

function makeRunner(source: string, opts: Partial<{ poolSize: number; perTaskTimeoutMs: number; abortGraceMs: number; spawnFailureCeiling: number }> = {}): CADRegressionWorkerThreadRunnerEngine {
  return new CADRegressionWorkerThreadRunnerEngine({
    workerScript: source,
    workerOpts: { eval: true },
    poolSize: opts.poolSize ?? 2,
    perTaskTimeoutMs: opts.perTaskTimeoutMs ?? 5_000,
    abortGraceMs: opts.abortGraceMs ?? 100,
    spawnFailureCeiling: opts.spawnFailureCeiling ?? 5,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CADRegressionWorkerThreadRunnerEngine — happy path", () => {
  let runner: CADRegressionWorkerThreadRunnerEngine;

  afterEach(async () => {
    if (runner) await runner.terminate();
  });

  it("returns a pass result for a single task", async () => {
    runner = makeRunner(HAPPY_WORKER);
    const ac = new AbortController();
    const r = await runner.run(task("file-1"), ac.signal);
    expect(r.fileId).toBe("file-1");
    expect(r.status).toBe("pass");
    expect(r.errorType).toBe("none");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("runs 3 tasks concurrently with poolSize=2", async () => {
    runner = makeRunner(HAPPY_WORKER, { poolSize: 2 });
    const ac = new AbortController();
    const tasks = [task("a"), task("b"), task("c")];
    const results = await Promise.all(tasks.map((t) => runner.run(t, ac.signal)));
    expect(results.map((r) => r.fileId).sort()).toEqual(["a", "b", "c"]);
    expect(results.every((r) => r.status === "pass")).toBe(true);
    expect(runner.getStats().totalWorkers).toBeLessThanOrEqual(2);
    expect(runner.getStats().tasksRun).toBe(3);
    expect(runner.getStats().tasksSucceeded).toBe(3);
  });

  it("propagates handler-specified status (variability: fail/skip/pass)", async () => {
    runner = makeRunner(ECHO_WORKER);
    const ac = new AbortController();
    const r1 = await runner.run(task("p", "pass"), ac.signal);
    const r2 = await runner.run(task("f", "fail"), ac.signal);
    const r3 = await runner.run(task("s", "skip"), ac.signal);
    expect(r1.status).toBe("pass");
    expect(r2.status).toBe("fail");
    expect(r2.errorType).toBe("comparison");
    expect(r3.status).toBe("skip");
  });

  it("reuses workers across tasks (pool size ceiling holds)", async () => {
    runner = makeRunner(HAPPY_WORKER, { poolSize: 1 });
    const ac = new AbortController();
    for (let i = 0; i < 5; i++) {
      const r = await runner.run(task(`reuse-${i}`), ac.signal);
      expect(r.status).toBe("pass");
    }
    expect(runner.getStats().totalWorkers).toBe(1);
    expect(runner.getStats().tasksSucceeded).toBe(5);
  });
});

describe("CADRegressionWorkerThreadRunnerEngine — failure modes", () => {
  let runner: CADRegressionWorkerThreadRunnerEngine;

  afterEach(async () => {
    if (runner) await runner.terminate();
  });

  it("returns crash result when worker throws", async () => {
    runner = makeRunner(CRASH_WORKER, { poolSize: 1, perTaskTimeoutMs: 3_000 });
    const ac = new AbortController();
    const r = await runner.run(task("crash-1"), ac.signal);
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("crash");
    expect(r.fileId).toBe("crash-1");
    expect(runner.getStats().tasksCrashed).toBeGreaterThanOrEqual(1);
  });

  it("returns timeout result when worker hangs past perTaskTimeoutMs", async () => {
    runner = makeRunner(HANG_WORKER, { poolSize: 1, perTaskTimeoutMs: 200 });
    const ac = new AbortController();
    const r = await runner.run(task("hang-1"), ac.signal);
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("timeout");
    expect(r.durationMs).toBeGreaterThanOrEqual(200);
    expect(runner.getStats().tasksTimedOut).toBeGreaterThanOrEqual(1);
  });

  it("returns timeout result when AbortSignal fires mid-task", async () => {
    runner = makeRunner(ABORT_AWARE_WORKER, { poolSize: 1, abortGraceMs: 500 });
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 5);
    const r = await runner.run(task("abort-1"), ac.signal);
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("timeout");
  });

  it("returns timeout result for a pre-aborted signal (no worker burned)", async () => {
    runner = makeRunner(HAPPY_WORKER);
    const ac = new AbortController();
    ac.abort();
    const r = await runner.run(task("pre-abort"), ac.signal);
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("timeout");
    expect(r.durationMs).toBe(0);
    const s = runner.getStats();
    expect(s.totalWorkers).toBe(0); // never spawned
    // tasksRun == tasksSucceeded + tasksFailed must hold
    expect(s.tasksRun).toBe(1);
    expect(s.tasksFailed).toBe(1);
    expect(s.tasksTimedOut).toBe(1);
  });

  it("returns crash when worker exits silently with code=0", async () => {
    runner = makeRunner(SILENT_EXIT_WORKER, { poolSize: 1, perTaskTimeoutMs: 5_000 });
    const ac = new AbortController();
    const r = await runner.run(task("silent-1"), ac.signal);
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("crash");
    // Stat counter still ticks tasksFailed (not tasksTimedOut)
    const s = runner.getStats();
    expect(s.tasksFailed).toBeGreaterThanOrEqual(1);
  });

  it("constructor throws on missing workerScript file (eval=false)", () => {
    expect(
      () =>
        new CADRegressionWorkerThreadRunnerEngine({
          workerScript: "/nonexistent/path/to/worker.mjs",
        }),
    ).toThrow(/workerScript not found on disk/);
  });

  it("constructor throws on empty workerScript", () => {
    expect(
      () => new CADRegressionWorkerThreadRunnerEngine({ workerScript: "" } as never),
    ).toThrow(/workerScript must be a non-empty string/);
  });
});

describe("CADRegressionWorkerThreadRunnerEngine — adversarial inputs", () => {
  let runner: CADRegressionWorkerThreadRunnerEngine;

  afterEach(async () => {
    if (runner) await runner.terminate();
  });

  it("clamps NaN poolSize to default 8 (verified via getPoolSize + concurrent spawn cap)", async () => {
    runner = new CADRegressionWorkerThreadRunnerEngine({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
      poolSize: Number.NaN,
    });
    // Direct clamp assertion
    expect(runner.getPoolSize()).toBe(8);
    // Behavioural assertion: spawning 20 concurrent tasks shouldn't exceed 8 workers
    const ac = new AbortController();
    const tasks = Array.from({ length: 20 }, (_, i) => task(`nan-${i}`));
    await Promise.all(tasks.map((t) => runner.run(t, ac.signal)));
    expect(runner.getStats().totalWorkers).toBeLessThanOrEqual(8);
    expect(runner.getStats().tasksSucceeded).toBe(20);
  });

  it("clamps Infinity poolSize to default 8 (non-finite falls back to default, NOT ceiling 64)", async () => {
    runner = new CADRegressionWorkerThreadRunnerEngine({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
      poolSize: Number.POSITIVE_INFINITY,
    });
    // Per clampPoolSize: !Number.isFinite returns DEFAULT_POOL_SIZE (8),
    // NOT POOL_SIZE_MAX (64). Infinity is treated as "invalid input → use
    // default", same path as NaN. Finite-but-oversize (e.g. 10000) is what
    // hits the ceiling — see the next test.
    expect(runner.getPoolSize()).toBe(8);
    const ac = new AbortController();
    const r = await runner.run(task("inf-pool"), ac.signal);
    expect(r.status).toBe("pass");
  });

  it("clamps negative poolSize to minimum 1 (verified via getPoolSize + serial dispatch)", async () => {
    runner = new CADRegressionWorkerThreadRunnerEngine({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
      poolSize: -5,
    });
    // Direct clamp assertion — POOL_SIZE_MIN
    expect(runner.getPoolSize()).toBe(1);
    // Behavioural assertion: 5 concurrent tasks should serialise through 1 worker
    const ac = new AbortController();
    const tasks = Array.from({ length: 5 }, (_, i) => task(`neg-${i}`));
    await Promise.all(tasks.map((t) => runner.run(t, ac.signal)));
    expect(runner.getStats().totalWorkers).toBe(1);
    expect(runner.getStats().tasksSucceeded).toBe(5);
  });

  it("clamps poolSize=0 to minimum 1 (boundary)", () => {
    runner = new CADRegressionWorkerThreadRunnerEngine({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
      poolSize: 0,
    });
    expect(runner.getPoolSize()).toBe(1);
  });

  it("clamps poolSize=10000 to ceiling 64 (overflow boundary)", () => {
    runner = new CADRegressionWorkerThreadRunnerEngine({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
      poolSize: 10_000,
    });
    expect(runner.getPoolSize()).toBe(64);
  });

  it("sanitises malformed worker result (missing fields → fallback)", async () => {
    runner = makeRunner(MALFORMED_WORKER);
    const ac = new AbortController();
    const r = await runner.run(task("malformed-1"), ac.signal);
    expect(r.fileId).toBe("malformed-1");
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("crash");
    expect(typeof r.durationMs).toBe("number");
  });

  it("ignores stray result with mismatched runId (cross-task bleed guard)", async () => {
    runner = makeRunner(BLEED_WORKER, { poolSize: 1 });
    const ac = new AbortController();
    const r = await runner.run(task("bleed-1"), ac.signal);
    expect(r.status).toBe("pass"); // first message wins; stray ignored
    expect(r.fileId).toBe("bleed-1");
    // If the bleed guard failed, the SECOND message would have produced a "fail" result.
  });

  it("rejects task with empty fileId via validate()", () => {
    runner = makeRunner(HAPPY_WORKER);
    const err = runner.validate({ tasks: [{ fileId: "", absolutePath: "/x", format: "x", testStrategy: "x" }] });
    expect(err).toMatch(/fileId must be a non-empty string/);
  });

  it("rejects task missing absolutePath / format / testStrategy", () => {
    runner = makeRunner(HAPPY_WORKER);
    const e1 = runner.validate({ tasks: [{ fileId: "x" }] });
    expect(e1).toMatch(/absolutePath must be a non-empty string/);
    const e2 = runner.validate({ tasks: [{ fileId: "x", absolutePath: "/p" }] });
    expect(e2).toMatch(/format must be a non-empty string/);
    const e3 = runner.validate({ tasks: [{ fileId: "x", absolutePath: "/p", format: "f" }] });
    expect(e3).toMatch(/testStrategy must be a non-empty string/);
  });
});

describe("CADRegressionWorkerThreadRunnerEngine — terminate() + queue", () => {
  it("terminate() drains pending acquires when slots are saturated — queued task rejected as crash", async () => {
    const runner = makeRunner(SLOW_WORKER, { poolSize: 1 });
    const ac = new AbortController();
    // First task takes 200ms; second queues behind it.
    const p1 = runner.run(task("slow-1", "200"), ac.signal);
    const p2 = runner.run(task("queued-1", "200"), ac.signal);
    // Terminate while p1 is in-flight and p2 is queued (15ms < 200ms).
    setTimeout(() => {
      void runner.terminate();
    }, 15);
    const [r1, r2] = await Promise.all([p1, p2]);
    // Both must settle to a defined FileTestResult (no hangs).
    expect(r1.fileId).toBe("slow-1");
    expect(r2.fileId).toBe("queued-1");
    // p2 was QUEUED when terminate fired — it must be rejected with crash
    // ("runner terminated") because _acquire rejected pending promises.
    expect(r2.status).toBe("error");
    expect(r2.errorType).toBe("crash");
    // p1 was IN-FLIGHT when terminate fired — either it completed before the
    // worker.terminate() kill arrived (pass) or it was killed mid-run (crash).
    // Either way it must be a well-formed result with a non-negative duration.
    expect(["pass", "error"]).toContain(r1.status);
    expect(r1.durationMs).toBeGreaterThanOrEqual(0);
    // Runner must have flipped to terminated.
    expect(runner.getStats().terminated).toBe(true);
  }, 5000);

  it("terminate() is idempotent (second call resolves cleanly)", async () => {
    const runner = makeRunner(HAPPY_WORKER);
    await runner.terminate();
    await runner.terminate();
    expect(runner.getStats().terminated).toBe(true);
  });

  it("terminated runner rejects new run() with crash result", async () => {
    const runner = makeRunner(HAPPY_WORKER);
    await runner.terminate();
    const ac = new AbortController();
    const r = await runner.run(task("post-term"), ac.signal);
    expect(r.status).toBe("error");
    expect(r.errorType).toBe("crash");
    expect(runner.getStats().tasksFailed).toBeGreaterThanOrEqual(1);
  });
});

describe("CADRegressionWorkerThreadRunnerEngine — pool variability (3 sizes)", () => {
  for (const poolSize of [1, 4, 8]) {
    it(`poolSize=${poolSize} runs 10 tasks correctly`, async () => {
      const runner = makeRunner(HAPPY_WORKER, { poolSize });
      const ac = new AbortController();
      const tasks = Array.from({ length: 10 }, (_, i) => task(`p${poolSize}-${i}`));
      const results = await Promise.all(tasks.map((t) => runner.run(t, ac.signal)));
      expect(results.every((r) => r.status === "pass")).toBe(true);
      expect(runner.getStats().totalWorkers).toBeLessThanOrEqual(poolSize);
      expect(runner.getStats().tasksSucceeded).toBe(10);
      await runner.terminate();
    });
  }
});

describe("CADRegressionWorkerThreadRunnerEngine — executeImpl (smoke)", () => {
  it("smoke action runs tasks sequentially, returns results + stats", async () => {
    const runner = makeRunner(HAPPY_WORKER, { poolSize: 2 });
    const out = (await runner.execute({
      tasks: [task("smoke-1"), task("smoke-2"), task("smoke-3")],
    })) as { results: unknown[]; stats: { tasksSucceeded: number; terminated: boolean } };
    expect(out.results).toHaveLength(3);
    expect(out.stats.tasksSucceeded).toBe(3);
    expect(out.stats.terminated).toBe(true); // default terminateAfter=true
  });

  it("smoke action with terminateAfter=false keeps pool alive", async () => {
    const runner = makeRunner(HAPPY_WORKER, { poolSize: 1 });
    const out = (await runner.execute({
      tasks: [task("alive-1")],
      terminateAfter: false,
    })) as { stats: { terminated: boolean } };
    expect(out.stats.terminated).toBe(false);
    await runner.terminate();
  });

  it("validate() rejects non-array tasks", async () => {
    const runner = makeRunner(HAPPY_WORKER);
    await expect(runner.execute({ tasks: "nope" })).rejects.toThrow(
      /tasks must be an array/,
    );
    await runner.terminate();
  });
});

describe("CADRegressionWorkerThreadRunnerEngine — orchestrator round-trip", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "cad-runner-test-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("orchestrator drives the runner through 5 tasks end-to-end", async () => {
    const runner = makeRunner(HAPPY_WORKER, { poolSize: 2 });
    const tasks: FileTask[] = [
      task("o-1"),
      task("o-2"),
      task("o-3"),
      task("o-4"),
      task("o-5"),
    ];
    const batch = await cadRegressionTestOrchestratorEngine.run(tasks, {
      runner,
      workers: 2,
      perFileTimeoutMs: 3_000,
      checkpointEvery: 100,
      checkpointIntervalMs: 60_000,
      statePath: path.join(tmpDir, "batch.json"),
    });
    expect(batch.stats.total).toBe(5);
    expect(batch.stats.completed).toBe(5);
    expect(batch.stats.passed).toBe(5);
    await runner.terminate();
  });
});

describe("CADRegressionWorkerThreadRunnerEngine — factory + stats shape", () => {
  it("createCADRegressionWorkerThreadRunner factory returns an engine instance", async () => {
    const r = createCADRegressionWorkerThreadRunner({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
      poolSize: 1,
    });
    expect(r).toBeInstanceOf(CADRegressionWorkerThreadRunnerEngine);
    const ac = new AbortController();
    const result = await r.run(task("factory-1"), ac.signal);
    expect(result.status).toBe("pass");
    await r.terminate();
  });

  it("getStats() reports the expected shape", () => {
    const r = new CADRegressionWorkerThreadRunnerEngine({
      workerScript: HAPPY_WORKER,
      workerOpts: { eval: true },
    });
    const s = r.getStats();
    expect(s).toMatchObject({
      totalWorkers: 0,
      idleWorkers: 0,
      busyWorkers: 0,
      pendingAcquires: 0,
      terminated: false,
      tasksRun: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      tasksTimedOut: 0,
      tasksCrashed: 0,
    });
  });
});
