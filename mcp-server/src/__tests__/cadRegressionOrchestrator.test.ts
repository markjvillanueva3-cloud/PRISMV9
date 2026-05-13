/**
 * cadRegressionOrchestrator.test.ts — U-CINF04 unit tests
 *
 * Covers:
 *   1. Empty task list — run returns a fresh TestBatch with zero files
 *   2. All-pass batch — every file transitions to "pass"
 *   3. Mixed-result batch — pass/fail/skip all land in correct buckets
 *   4. Crash in runner is captured as status=error, errorType=crash
 *   5. Timeout honours the AbortSignal and records errorType=timeout
 *   6. Worker concurrency is bounded by options.workers
 *   7. Checkpoint is written after checkpointEvery transitions
 *   8. Resume skips already-terminal files and replays only pending
 *   9. Crash mid-run leaves "running" entries which are reverted to pending
 *  10. New tasks added on a resumed run get pending entries
 *  11. Progress event fires for every terminal transition
 *  12. Final checkpoint is forced at end of run
 *  13. BaseEngine.execute path validates required runner
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADRegressionTestOrchestratorEngine,
  type FileTask,
  type FileTestResult,
  type TestRunner,
  type OrchestratorFS,
} from "../engines/CADRegressionTestOrchestratorEngine.js";
import {
  TestBatchSchema,
  type TestBatch,
} from "../schemas/cadRegressionTestSchema.js";

// ── In-memory FS ───────────────────────────────────────────────────────────────

function buildInMemoryFS(seed?: Record<string, string>): OrchestratorFS & { store: Record<string, string>; writes: string[] } {
  const store: Record<string, string> = { ...(seed ?? {}) };
  const writes: string[] = [];
  return {
    store,
    writes,
    existsSync(p: string): boolean {
      return Object.prototype.hasOwnProperty.call(store, p);
    },
    readFileSync(p: string): string {
      const v = store[p];
      if (v === undefined) throw new Error(`ENOENT: ${p}`);
      return v;
    },
    mkdirSync(_p: string): void { /* no-op in memory */ },
  };
}

// atomicWrite.ts actually writes to the real filesystem — we route to a temp dir.
import * as os from "os";
import * as nodePath from "path";
import * as nodeFs from "fs";

function tempStatePath(name: string): string {
  const dir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), "cad-reg-"));
  return nodePath.join(dir, `${name}.json`);
}

// ── Task factories ─────────────────────────────────────────────────────────────

function mkTask(i: number): FileTask {
  return {
    fileId: `file-${i.toString().padStart(6, "0")}`,
    absolutePath: `H:/fake/file-${i}.sldprt`,
    format: ".sldprt",
    testStrategy: "open_part",
    handler: "SolidWorksAutomationBridge",
  };
}

function mkTasks(n: number): FileTask[] {
  return Array.from({ length: n }, (_v, i) => mkTask(i));
}

// ── Runner factories ───────────────────────────────────────────────────────────

function allPassRunner(durationMs = 5): TestRunner {
  return {
    async run(task, _signal): Promise<FileTestResult> {
      await new Promise((r) => setTimeout(r, durationMs));
      return { fileId: task.fileId, status: "pass", errorType: "none", durationMs };
    },
  };
}

function patternedRunner(pattern: Array<"pass" | "fail" | "skip">): TestRunner {
  let i = 0;
  return {
    async run(task, _signal): Promise<FileTestResult> {
      const outcome = pattern[i % pattern.length];
      i++;
      return {
        fileId: task.fileId,
        status: outcome,
        errorType: outcome === "fail" ? "comparison" : "none",
        durationMs: 1,
      };
    },
  };
}

function crashingRunner(): TestRunner {
  return {
    async run(_task, _signal): Promise<FileTestResult> {
      throw new Error("bridge exploded");
    },
  };
}

function timeoutRunner(): TestRunner {
  return {
    async run(_task, signal): Promise<FileTestResult> {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          resolve({ fileId: _task.fileId, status: "pass", errorType: "none", durationMs: 5000 });
        }, 5000);
        signal.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new Error("timeout"));
        });
      });
    },
  };
}

function concurrencyTrackingRunner(): { runner: TestRunner; maxConcurrent: () => number } {
  let inFlight = 0;
  let maxSeen = 0;
  const runner: TestRunner = {
    async run(task, _signal): Promise<FileTestResult> {
      inFlight++;
      if (inFlight > maxSeen) maxSeen = inFlight;
      await new Promise((r) => setTimeout(r, 15));
      inFlight--;
      return { fileId: task.fileId, status: "pass", errorType: "none", durationMs: 15 };
    },
  };
  return { runner, maxConcurrent: () => maxSeen };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("CADRegressionTestOrchestratorEngine", () => {
  let engine: CADRegressionTestOrchestratorEngine;

  beforeEach(() => {
    engine = new CADRegressionTestOrchestratorEngine();
  });

  it("returns a fresh TestBatch for empty task list", async () => {
    const statePath = tempStatePath("empty");
    const batch = await engine.run([], { runner: allPassRunner(), statePath });
    expect(batch.stats.total).toBe(0);
    expect(batch.stats.passed).toBe(0);
    expect(Object.keys(batch.files)).toEqual([]);
  });

  it("runs an all-pass batch to completion", async () => {
    const statePath = tempStatePath("all-pass");
    const batch = await engine.run(mkTasks(10), {
      runner: allPassRunner(),
      workers: 4,
      statePath,
    });
    expect(batch.stats.total).toBe(10);
    expect(batch.stats.passed).toBe(10);
    expect(batch.stats.completed).toBe(10);
    for (const entry of Object.values(batch.files)) {
      expect(entry.status).toBe("pass");
      expect(entry.errorType).toBe("none");
    }
  });

  it("sorts pass/fail/skip into the correct buckets", async () => {
    const statePath = tempStatePath("mixed");
    const batch = await engine.run(mkTasks(9), {
      runner: patternedRunner(["pass", "fail", "skip"]),
      workers: 1, // deterministic order
      statePath,
    });
    expect(batch.stats.passed).toBe(3);
    expect(batch.stats.failed).toBe(3);
    expect(batch.stats.skipped).toBe(3);
    expect(batch.stats.completed).toBe(9);
  });

  it("captures runner crashes as status=error, errorType=crash", async () => {
    const statePath = tempStatePath("crash");
    const batch = await engine.run(mkTasks(3), {
      runner: crashingRunner(),
      workers: 1,
      statePath,
    });
    expect(batch.stats.errored).toBe(3);
    for (const entry of Object.values(batch.files)) {
      expect(entry.status).toBe("error");
      expect(entry.errorType).toBe("crash");
    }
  });

  it("enforces per-file timeout via AbortSignal → errorType=timeout", async () => {
    const statePath = tempStatePath("timeout");
    const batch = await engine.run([mkTask(0)], {
      runner: timeoutRunner(),
      workers: 1,
      perFileTimeoutMs: 50,
      statePath,
    });
    const entry = batch.files[mkTask(0).fileId];
    expect(entry.status).toBe("error");
    expect(entry.errorType).toBe("timeout");
  });

  it("bounds concurrency by options.workers", async () => {
    const statePath = tempStatePath("concurrency");
    const { runner, maxConcurrent } = concurrencyTrackingRunner();
    await engine.run(mkTasks(20), { runner, workers: 4, statePath });
    expect(maxConcurrent()).toBeLessThanOrEqual(4);
    expect(maxConcurrent()).toBeGreaterThanOrEqual(2); // some parallelism observed
  });

  it("writes a checkpoint after checkpointEvery transitions", async () => {
    const statePath = tempStatePath("checkpoint");
    let checkpoints = 0;
    engine.events.on("checkpoint", () => { checkpoints++; });
    await engine.run(mkTasks(10), {
      runner: allPassRunner(),
      workers: 1,
      checkpointEvery: 3,
      checkpointIntervalMs: 1_000_000, // disable time-based
      statePath,
    });
    // Initial + 3 + 6 + 9 + final = >=4; >=3 confirms cadence is firing
    expect(checkpoints).toBeGreaterThanOrEqual(3);
    // State file actually exists and parses
    expect(nodeFs.existsSync(statePath)).toBe(true);
    const raw = JSON.parse(nodeFs.readFileSync(statePath, "utf-8"));
    expect(() => TestBatchSchema.parse(raw)).not.toThrow();
  });

  it("resume skips already-terminal files", async () => {
    const statePath = tempStatePath("resume");
    // Seed a partial state on disk: 5 files pending, 5 already passed
    const tasks = mkTasks(10);
    const files: Record<string, unknown> = {};
    for (let i = 0; i < 10; i++) {
      files[tasks[i].fileId] = {
        fileId: tasks[i].fileId,
        status: i < 5 ? "pass" : "pending",
        errorType: "none",
        durationMs: i < 5 ? 10 : 0,
        retries: 0,
        artifacts: {},
      };
    }
    const seed: TestBatch = {
      batchId: "00000000-0000-4000-8000-000000000000",
      schemaVersion: 1,
      stats: { total: 10, completed: 5, passed: 5, failed: 0, skipped: 0, errored: 0 },
      lastCheckpoint: "2026-04-19T00:00:00.000Z",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
      files: files as TestBatch["files"],
    };
    nodeFs.mkdirSync(nodePath.dirname(statePath), { recursive: true });
    nodeFs.writeFileSync(statePath, JSON.stringify(seed));

    let ran = 0;
    const runner: TestRunner = {
      async run(task, _signal): Promise<FileTestResult> {
        ran++;
        return { fileId: task.fileId, status: "pass", errorType: "none", durationMs: 1 };
      },
    };
    const batch = await engine.run(tasks, {
      batchId: seed.batchId,
      runner,
      workers: 2,
      statePath,
    });
    expect(ran).toBe(5); // only the pending 5 executed
    expect(batch.stats.passed).toBe(10);
    expect(batch.stats.completed).toBe(10);
  });

  it("reverts crash-time 'running' entries to pending on resume", async () => {
    const statePath = tempStatePath("revert-running");
    const tasks = [mkTask(0)];
    const seed: TestBatch = {
      batchId: "00000000-0000-4000-8000-000000000001",
      schemaVersion: 1,
      stats: { total: 1, completed: 0, passed: 0, failed: 0, skipped: 0, errored: 0 },
      lastCheckpoint: "2026-04-19T00:00:00.000Z",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
      files: {
        [tasks[0].fileId]: {
          fileId: tasks[0].fileId,
          status: "running", // crashed mid-flight
          errorType: "none",
          durationMs: 0,
          retries: 0,
          artifacts: {},
        },
      },
    };
    nodeFs.mkdirSync(nodePath.dirname(statePath), { recursive: true });
    nodeFs.writeFileSync(statePath, JSON.stringify(seed));

    const batch = await engine.run(tasks, {
      batchId: seed.batchId,
      runner: allPassRunner(),
      statePath,
    });
    expect(batch.files[tasks[0].fileId].status).toBe("pass");
  });

  it("new tasks on a resumed run get pending entries and execute", async () => {
    const statePath = tempStatePath("add-tasks");
    // Seed with 2 passed
    const original = mkTasks(2);
    const seed: TestBatch = {
      batchId: "00000000-0000-4000-8000-000000000002",
      schemaVersion: 1,
      stats: { total: 2, completed: 2, passed: 2, failed: 0, skipped: 0, errored: 0 },
      lastCheckpoint: "2026-04-19T00:00:00.000Z",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
      files: {
        [original[0].fileId]: { fileId: original[0].fileId, status: "pass", errorType: "none", durationMs: 1, retries: 0, artifacts: {} },
        [original[1].fileId]: { fileId: original[1].fileId, status: "pass", errorType: "none", durationMs: 1, retries: 0, artifacts: {} },
      },
    };
    nodeFs.mkdirSync(nodePath.dirname(statePath), { recursive: true });
    nodeFs.writeFileSync(statePath, JSON.stringify(seed));

    const all = [...original, mkTask(2), mkTask(3)];
    const batch = await engine.run(all, {
      batchId: seed.batchId,
      runner: allPassRunner(),
      statePath,
    });
    expect(batch.stats.total).toBe(4);
    expect(batch.stats.passed).toBe(4);
  });

  it("emits 'progress' for every terminal transition", async () => {
    const statePath = tempStatePath("progress");
    let events = 0;
    engine.events.on("progress", () => { events++; });
    await engine.run(mkTasks(5), {
      runner: allPassRunner(),
      workers: 2,
      statePath,
    });
    expect(events).toBe(5);
  });

  it("forces a final checkpoint at end of run", async () => {
    const statePath = tempStatePath("final");
    await engine.run(mkTasks(2), {
      runner: allPassRunner(),
      checkpointEvery: 10_000, // never triggered by count
      checkpointIntervalMs: 1_000_000,
      statePath,
    });
    expect(nodeFs.existsSync(statePath)).toBe(true);
    const raw = JSON.parse(nodeFs.readFileSync(statePath, "utf-8"));
    const parsed = TestBatchSchema.parse(raw);
    expect(parsed.stats.completed).toBe(2);
  });

  it("execute() validates that a runner is supplied", async () => {
    // BaseEngine.execute throws on validation failure (matches every other
    // engine in the codebase). Edge-case data values return structured
    // errors; invalid input *shape* (missing runner) is a validation throw.
    await expect(
      engine.execute({ tasks: [], options: {} }),
    ).rejects.toThrow(/runner/);
  });

  it("loadState returns null for missing state file", async () => {
    const fs = buildInMemoryFS({});
    const loaded = await engine.loadState("H:/nope/state.json", fs);
    expect(loaded).toBeNull();
  });
});
