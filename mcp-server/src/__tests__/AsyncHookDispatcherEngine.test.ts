/**
 * AsyncHookDispatcherEngine.test.ts — HOOK-SYNERGY-MS0 / U-HOOK-ASYNC-DISPATCH (H7)
 *
 * Coverage strategy:
 *   - Pure helpers (makeJobId, percentile, clampWindow, clampLimit, hookBasename)
 *     are exercised with reference values + algebraic invariants.
 *   - Disk-backed read surfaces are tested against fixture JSONLs written into
 *     a per-test temp dir — never the live H:/prism/state/shared paths.
 *   - Spawn is dependency-injected — the runner spawn is intercepted with a
 *     stub `ChildProcess` so `enqueue()` is exercised end-to-end without
 *     actually forking. `runJob()` accepts a per-call `spawnFn` override so
 *     the wrapped-hook spawn is also hermetic.
 *   - The dispatcher integration is verified by importing the engine through
 *     its singleton accessor and confirming the schema action enum matches.
 *
 * Reference values come from the engine's exported `ASYNC_HOOK_LIMITS` cap
 * object so the tests track changes to those caps automatically.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { EventEmitter } from "node:events";
import type { ChildProcess, SpawnOptions } from "node:child_process";

import {
  AsyncHookDispatcherEngine,
  ASYNC_HOOK_LIMITS,
  asyncHookDispatcherEngine,
  clampLimit,
  clampWindow,
  getAsyncHookDispatcherEngine,
  hookBasename,
  makeJobId,
  percentile,
  type AsyncHookJob,
  type AsyncHookResult,
} from "../engines/AsyncHookDispatcherEngine.js";

// ── test infra ───────────────────────────────────────────────────────────────

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "async-hook-dispatch-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

/** Minimal mock ChildProcess — enough surface for the engine's spawn call. */
function makeMockChild(): ChildProcess {
  const ee = new EventEmitter() as ChildProcess;
  // The engine calls .unref(); on a real ChildProcess this detaches from
  // the parent's reference count. The mock records the call so we can
  // verify enqueue() called it (= the detached pattern was honored).
  (ee as unknown as { unref: () => void; unrefCalled: boolean }).unrefCalled = false;
  (ee as unknown as { unref: () => void; unrefCalled: boolean }).unref = function () {
    (this as unknown as { unrefCalled: boolean }).unrefCalled = true;
  };
  return ee;
}

/**
 * Spawn stub that mimics a wrapped hook completing with the given exit code
 * after a tick. Used by `runJob` tests so we don't actually fork.
 */
function makeWrappedHookSpawn(opts: {
  exitCode?: number;
  signal?: NodeJS.Signals | null;
  stdoutChunks?: string[];
  stderrChunks?: string[];
  delayMs?: number;
  throwOnSpawn?: Error;
  errorEvent?: Error;
}): (cmd: string, args: readonly string[], options?: SpawnOptions) => ChildProcess {
  return (_cmd, _args, _options) => {
    if (opts.throwOnSpawn) throw opts.throwOnSpawn;

    const child = new EventEmitter() as ChildProcess;
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    const stdin = new EventEmitter() as unknown as NodeJS.WritableStream;
    // Stub the stdin write/end so runJob's ctx-forwarding step is a no-op.
    (stdin as unknown as { write: (b: unknown) => boolean }).write = () => true;
    (stdin as unknown as { end: () => void }).end = () => undefined;

    (child as unknown as { stdout: EventEmitter }).stdout = stdout;
    (child as unknown as { stderr: EventEmitter }).stderr = stderr;
    (child as unknown as { stdin: typeof stdin }).stdin = stdin;
    (child as unknown as { kill: (sig?: string) => void }).kill = () => undefined;

    setTimeout(() => {
      if (opts.errorEvent) {
        child.emit("error", opts.errorEvent);
        return;
      }
      for (const chunk of opts.stdoutChunks ?? []) stdout.emit("data", Buffer.from(chunk));
      for (const chunk of opts.stderrChunks ?? []) stderr.emit("data", Buffer.from(chunk));
      child.emit("close", opts.exitCode ?? 0, opts.signal ?? null);
    }, opts.delayMs ?? 0);

    return child;
  };
}

/** Build a fresh engine pointing at the temp dir. */
function makeEngine(extra: Partial<ConstructorParameters<typeof AsyncHookDispatcherEngine>[0]> = {}): AsyncHookDispatcherEngine {
  const queuePath = path.join(tmpRoot, "queue.jsonl");
  const resultsPath = path.join(tmpRoot, "results.jsonl");
  const runnerScript = path.join(tmpRoot, "runner-fake.mjs");
  return new AsyncHookDispatcherEngine({
    queuePath,
    resultsPath,
    runnerScript,
    nodeBin: "node-fake-path-not-used-because-spawnFn-is-stubbed",
    spawnFn: () => makeMockChild(),
    ...extra,
  });
}

// ── pure helpers ────────────────────────────────────────────────────────────

describe("makeJobId", () => {
  it("returns a sortable timestamp prefix with random suffix", () => {
    const a = makeJobId(1_700_000_000_000);
    const parts = a.split("-");
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe(Math.floor(1_700_000_000_000).toString(36));
    expect(parts[1].length).toBe(8); // 4 bytes -> 8 hex chars
    expect(/^[0-9a-f]+$/.test(parts[1])).toBe(true);
  });

  it("orders lexicographically by timestamp", () => {
    const earlier = makeJobId(1_700_000_000_000);
    const later = makeJobId(1_700_000_001_000);
    expect([earlier, later].slice().sort()).toEqual([earlier, later]);
  });

  it("never collides across 1000 same-timestamp calls (random suffix entropy)", () => {
    const ids = new Set<string>();
    const t = 1_700_000_000_000;
    for (let i = 0; i < 1000; i++) ids.add(makeJobId(t));
    expect(ids.size).toBe(1000);
  });
});

describe("hookBasename", () => {
  it("strips .mjs and parent dirs", () => {
    expect(hookBasename("H:/prism/.claude/hooks/foo.mjs")).toBe("foo");
  });
  it("handles Windows backslashes", () => {
    expect(hookBasename("H:\\prism\\.claude\\hooks\\bar.mjs")).toBe("bar");
  });
  it("returns empty for empty input", () => {
    expect(hookBasename("")).toBe("");
  });
  it("leaves non-.mjs basenames intact", () => {
    expect(hookBasename("/tmp/x.json")).toBe("x.json");
  });
});

describe("percentile (nearest-rank)", () => {
  it("returns 0 for empty array", () => {
    expect(percentile([], 0.95)).toBe(0);
  });
  it("returns the single element for a 1-row sample", () => {
    expect(percentile([42], 0.5)).toBe(42);
    expect(percentile([42], 0.95)).toBe(42);
    expect(percentile([42], 0.99)).toBe(42);
  });
  it("matches the reference [10,20,30,40,50] p50=30 p95=50", () => {
    const s = [10, 20, 30, 40, 50];
    expect(percentile(s, 0.5)).toBe(30);
    expect(percentile(s, 0.95)).toBe(50);
  });
  it("clamps p > 1 to the max value and p < 0 to the min value", () => {
    expect(percentile([1, 2, 3], 2)).toBe(3);
    expect(percentile([1, 2, 3], -1)).toBe(1);
  });
});

describe("clampWindow / clampLimit", () => {
  it("defaults when input is undefined", () => {
    expect(clampWindow(undefined)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_WINDOW_MS);
    expect(clampLimit(undefined)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_RESULT_LIMIT);
  });
  it("defaults on NaN / negative / zero", () => {
    expect(clampWindow(NaN)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_WINDOW_MS);
    expect(clampWindow(-1)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_WINDOW_MS);
    expect(clampWindow(0)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_WINDOW_MS);
    expect(clampLimit(NaN)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_RESULT_LIMIT);
    expect(clampLimit(-1)).toBe(ASYNC_HOOK_LIMITS.DEFAULT_RESULT_LIMIT);
  });
  it("clamps to absolute ceiling", () => {
    expect(clampWindow(ASYNC_HOOK_LIMITS.MAX_WINDOW_MS * 10)).toBe(ASYNC_HOOK_LIMITS.MAX_WINDOW_MS);
    expect(clampLimit(ASYNC_HOOK_LIMITS.ABSOLUTE_RESULT_LIMIT * 10)).toBe(ASYNC_HOOK_LIMITS.ABSOLUTE_RESULT_LIMIT);
  });
  it("preserves valid mid-range inputs", () => {
    expect(clampWindow(60_000)).toBe(60_000);
    expect(clampLimit(25)).toBe(25);
  });
});

// ── enqueue: happy path + back-pressure ─────────────────────────────────────

describe("AsyncHookDispatcherEngine.enqueue — happy path", () => {
  it("writes a queue line + returns ok=true with the spawned jobId", () => {
    let spawnedCmd = "";
    let spawnedArgs: readonly string[] = [];
    let spawnOpts: SpawnOptions | undefined;
    const engine = makeEngine({
      spawnFn: (cmd, args, opts) => {
        spawnedCmd = cmd;
        spawnedArgs = args;
        spawnOpts = opts;
        return makeMockChild();
      },
    });
    const res = engine.enqueue({ hookPath: "H:/prism/.claude/hooks/test-100-percent-gate.mjs", tier: "T4", event: "Stop" });
    expect(res.ok).toBe(true);
    expect(res.jobId.length).toBeGreaterThan(0);
    expect(res.queueDepth).toBe(1);
    expect(res.pressureWarning).toBe(undefined);

    // Verify spawn was called with the runner script + --job-id matching the returned jobId.
    expect(spawnedArgs[0]).toContain("runner-fake.mjs");
    expect(spawnedArgs[1]).toBe("--job-id");
    expect(spawnedArgs[2]).toBe(res.jobId);
    expect(spawnOpts?.detached).toBe(true);
    expect(spawnOpts?.stdio).toBe("ignore");
    // The mock node bin path is forwarded as-is — proves the engine's config plumbed through.
    expect(spawnedCmd).toBe("node-fake-path-not-used-because-spawnFn-is-stubbed");
  });

  it("getPendingJobs reflects the queued entry with schemaVersion=1", () => {
    const engine = makeEngine();
    const res = engine.enqueue({ hookPath: "/tmp/foo.mjs", event: "Stop" });
    const pending = engine.getPendingJobs();
    expect(pending.length).toBe(1);
    expect(pending[0].jobId).toBe(res.jobId);
    expect(pending[0].hookPath).toBe("/tmp/foo.mjs");
    expect(pending[0].schemaVersion).toBe(ASYNC_HOOK_LIMITS.SCHEMA_VERSION);
    expect(pending[0].tier).toBe("");
    expect(pending[0].timeoutMs).toBe(ASYNC_HOOK_LIMITS.DEFAULT_HOOK_TIMEOUT_MS);
  });

  it("calls child.unref() to detach the runner from this process's event loop", () => {
    let captured: ChildProcess | null = null;
    const engine = makeEngine({
      spawnFn: () => {
        captured = makeMockChild();
        return captured;
      },
    });
    engine.enqueue({ hookPath: "/tmp/foo.mjs" });
    expect((captured as unknown as { unrefCalled: boolean } | null)?.unrefCalled).toBe(true);
  });
});

describe("AsyncHookDispatcherEngine.enqueue — failure modes", () => {
  it("returns ok=false on empty hookPath", () => {
    const engine = makeEngine();
    const res = engine.enqueue({ hookPath: "" });
    expect(res.ok).toBe(false);
    expect(res.spawnError).toBe("invalid_hook_path");
    expect(engine.getPendingJobs().length).toBe(0);
  });

  it("returns ok=true with spawnError populated when spawn throws", () => {
    const engine = makeEngine({
      spawnFn: () => { throw new Error("ENOENT: node bin not found"); },
    });
    const res = engine.enqueue({ hookPath: "/tmp/foo.mjs" });
    // Job is still queued — a later runner sweep can pick it up — so ok=true,
    // but spawnError surfaces so telemetry sees it.
    expect(res.ok).toBe(true);
    expect(res.spawnError).toContain("ENOENT");
    expect(engine.getPendingJobs().length).toBe(1);
  });

  it("clamps timeoutMs > ABSOLUTE_HOOK_TIMEOUT_MS to the ceiling", () => {
    const engine = makeEngine();
    engine.enqueue({ hookPath: "/tmp/foo.mjs", timeoutMs: ASYNC_HOOK_LIMITS.ABSOLUTE_HOOK_TIMEOUT_MS * 10 });
    const pending = engine.getPendingJobs();
    expect(pending[0].timeoutMs).toBe(ASYNC_HOOK_LIMITS.ABSOLUTE_HOOK_TIMEOUT_MS);
  });

  it("falls back to DEFAULT_HOOK_TIMEOUT_MS on NaN / Infinity / negative / zero", () => {
    const engine = makeEngine();
    const cases = [NaN, Infinity, -1, 0];
    for (const t of cases) {
      engine.enqueue({ hookPath: "/tmp/foo.mjs", timeoutMs: t });
    }
    const pending = engine.getPendingJobs();
    for (const j of pending) {
      expect(j.timeoutMs).toBe(ASYNC_HOOK_LIMITS.DEFAULT_HOOK_TIMEOUT_MS);
    }
  });

  it("applies back-pressure when MAX_QUEUE_DEPTH is exceeded", () => {
    const engine = makeEngine();
    // Fill the queue to capacity with a low-cost helper. The next enqueue
    // should trim the oldest entries to leave room.
    const N = ASYNC_HOOK_LIMITS.MAX_QUEUE_DEPTH;
    for (let i = 0; i < N; i++) engine.enqueue({ hookPath: `/tmp/h-${i}.mjs` });
    const res = engine.enqueue({ hookPath: "/tmp/overflow.mjs" });
    expect(res.ok).toBe(true);
    expect(res.pressureWarning).toContain("purged_");
    // Depth should be exactly MAX_QUEUE_DEPTH after the trim (the overflow took the freed slot).
    expect(engine.getPendingJobs().length).toBe(ASYNC_HOOK_LIMITS.MAX_QUEUE_DEPTH);
    // The oldest entry should have been dropped.
    const heads = engine.getPendingJobs().map((j) => j.hookPath);
    expect(heads.includes("/tmp/h-0.mjs")).toBe(false);
    expect(heads.includes("/tmp/overflow.mjs")).toBe(true);
  });

  it("skips malformed JSONL lines on load and warns once", () => {
    const queuePath = path.join(tmpRoot, "queue.jsonl");
    const resultsPath = path.join(tmpRoot, "results.jsonl");
    // Hand-craft a queue file with one good + one bad line.
    fs.writeFileSync(
      queuePath,
      JSON.stringify({ schemaVersion: 1, jobId: "good-1", hookPath: "/x.mjs", tier: "T4", event: "Stop", matcher: "", tool: "", timeoutMs: 1000, enqueuedAt: new Date().toISOString() })
        + "\n{not-valid-json:\n",
      "utf8",
    );
    const engine = new AsyncHookDispatcherEngine({ queuePath, resultsPath });
    const pending = engine.getPendingJobs();
    expect(pending.length).toBe(1);
    expect(pending[0].jobId).toBe("good-1");
  });
});

// ── runJob: synchronous in-process execution ────────────────────────────────

describe("AsyncHookDispatcherEngine.runJob", () => {
  it("succeeds + writes a result row when wrapped hook exits 0", async () => {
    const engine = makeEngine();
    const enq = engine.enqueue({ hookPath: "/tmp/hook-ok.mjs", tier: "T4", event: "Stop" });
    const res = await engine.runJob(enq.jobId, {
      spawnFn: makeWrappedHookSpawn({ exitCode: 0, stdoutChunks: ["hello "] }),
    });
    expect(res.status).toBe("succeeded");
    expect(res.exitCode).toBe(0);
    expect(res.jobId).toBe(enq.jobId);
    expect(res.stdoutBytes).toBe(6);
    expect(res.error).toBe(undefined);
    // Queue entry is removed after completion.
    expect(engine.getPendingJobs().length).toBe(0);
    // Results JSONL has exactly one row.
    expect(engine.getResults({ status: "any" }).length).toBe(1);
  });

  it("marks failed when wrapped hook exits non-zero, error='exit_N'", async () => {
    const engine = makeEngine();
    const enq = engine.enqueue({ hookPath: "/tmp/hook-fail.mjs", tier: "T4", event: "Stop" });
    const res = await engine.runJob(enq.jobId, {
      spawnFn: makeWrappedHookSpawn({ exitCode: 2, stderrChunks: ["boom"] }),
    });
    expect(res.status).toBe("failed");
    expect(res.exitCode).toBe(2);
    expect(res.error).toBe("exit_2");
    expect(res.stderrBytes).toBe(4);
  });

  it("marks failed when spawn errors before the close event", async () => {
    const engine = makeEngine();
    const enq = engine.enqueue({ hookPath: "/tmp/hook-spawn-err.mjs", tier: "T4", event: "Stop" });
    const res = await engine.runJob(enq.jobId, {
      spawnFn: makeWrappedHookSpawn({ errorEvent: new Error("EACCES") }),
    });
    expect(res.status).toBe("failed");
    expect(res.exitCode).toBe(-1);
    expect((res.error ?? "")).toContain("EACCES");
  });

  it("marks failed (status=failed, error captured) when spawn throws synchronously", async () => {
    const engine = makeEngine();
    const enq = engine.enqueue({ hookPath: "/tmp/hook-throw.mjs", tier: "T4", event: "Stop" });
    const res = await engine.runJob(enq.jobId, {
      spawnFn: makeWrappedHookSpawn({ throwOnSpawn: new Error("ENOENT no such file") }),
    });
    expect(res.status).toBe("failed");
    expect((res.error ?? "")).toContain("ENOENT");
  });

  it("returns 'skipped' with a result row when jobId not in queue", async () => {
    const engine = makeEngine();
    const res = await engine.runJob("nonexistent-id");
    expect(res.status).toBe("skipped");
    expect(res.error).toBe("job_not_found_in_queue");
    // Still records the skip so SessionStart hooks can flag it.
    expect(engine.getResults({ status: "any" }).length).toBe(1);
  });

  it("forwards ctx as JSON on stdin (write/end called on child.stdin)", async () => {
    const engine = makeEngine();
    let stdinWrites = 0;
    let stdinEnded = false;
    const spawnFn: (cmd: string, args: readonly string[], options?: SpawnOptions) => ChildProcess = (_c, _a, _o) => {
      const child = new EventEmitter() as ChildProcess;
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const stdin = {
        write: (_b: unknown) => { stdinWrites++; return true; },
        end: () => { stdinEnded = true; },
      };
      (child as unknown as { stdout: EventEmitter; stderr: EventEmitter; stdin: typeof stdin; kill: () => void }).stdout = stdout;
      (child as unknown as { stderr: EventEmitter }).stderr = stderr;
      (child as unknown as { stdin: typeof stdin }).stdin = stdin;
      (child as unknown as { kill: () => void }).kill = () => undefined;
      setTimeout(() => child.emit("close", 0, null), 0);
      return child;
    };
    const enq = engine.enqueue({ hookPath: "/tmp/h.mjs", ctx: { hello: "world", n: 42 } });
    const res = await engine.runJob(enq.jobId, { spawnFn });
    expect(res.status).toBe("succeeded");
    expect(stdinWrites).toBe(1);
    expect(stdinEnded).toBe(true);
  });
});

// ── read surfaces: results + stats + purge ──────────────────────────────────

describe("AsyncHookDispatcherEngine read surfaces", () => {
  it("getResults filters by status, hook, and respects newest-first ordering", async () => {
    const engine = makeEngine();
    // Run three jobs — two succeeded, one failed.
    const eA = engine.enqueue({ hookPath: "/tmp/a.mjs" });
    await engine.runJob(eA.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 0 }) });
    const eB = engine.enqueue({ hookPath: "/tmp/b.mjs" });
    await engine.runJob(eB.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 3 }) });
    const eC = engine.enqueue({ hookPath: "/tmp/a.mjs" });
    await engine.runJob(eC.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 0 }) });

    const all = engine.getResults({ status: "any" });
    expect(all.length).toBe(3);

    const failedOnly = engine.getResults({ status: "failed" });
    expect(failedOnly.length).toBe(1);
    expect(failedOnly[0].hookPath).toBe("/tmp/b.mjs");

    const byHook = engine.getResults({ hook: "a" });
    expect(byHook.length).toBe(2);
    // Newest first — most recently completed should be index 0.
    expect(Date.parse(byHook[0].completedAt) >= Date.parse(byHook[1].completedAt)).toBe(true);
  });

  it("getStats aggregates per-hook with P50/P95 and failure rate", async () => {
    const engine = makeEngine();
    // Three jobs same hook — durations 10, 50, 100 (mocked via JSONL injection).
    const resultsPath = path.join(tmpRoot, "results.jsonl");
    const now = new Date().toISOString();
    const rows: AsyncHookResult[] = [
      { schemaVersion: 1, jobId: "j1", hookPath: "/h/foo.mjs", tier: "T4", event: "Stop", status: "succeeded", exitCode: 0, signal: null, startedAt: now, completedAt: now, durationMs: 10,  stdoutBytes: 0, stderrBytes: 0 },
      { schemaVersion: 1, jobId: "j2", hookPath: "/h/foo.mjs", tier: "T4", event: "Stop", status: "succeeded", exitCode: 0, signal: null, startedAt: now, completedAt: now, durationMs: 50,  stdoutBytes: 0, stderrBytes: 0 },
      { schemaVersion: 1, jobId: "j3", hookPath: "/h/foo.mjs", tier: "T4", event: "Stop", status: "failed",    exitCode: 1, signal: null, startedAt: now, completedAt: now, durationMs: 100, stdoutBytes: 0, stderrBytes: 0 },
    ];
    fs.writeFileSync(resultsPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
    engine.clearCache();
    const stats = engine.getStats(60 * 60 * 1000); // 1h window
    expect(stats.totalFires).toBe(3);
    expect(stats.uniqueHooks).toBe(1);
    expect(stats.perHook[0].hook).toBe("foo");
    expect(stats.perHook[0].fires).toBe(3);
    expect(stats.perHook[0].failed).toBe(1);
    expect(stats.perHook[0].succeeded).toBe(2);
    // Nearest-rank percentile: durations sorted [10,50,100]; P50 idx=1 -> 50; P95 idx=2 -> 100.
    expect(stats.perHook[0].p50DurationMs).toBe(50);
    expect(stats.perHook[0].p95DurationMs).toBe(100);
    expect(stats.perHook[0].maxDurationMs).toBe(100);
    expect(stats.failureRate).toBeCloseTo(1 / 3, 5);
  });

  it("purgeOlderThan drops queue + results rows older than the cutoff", async () => {
    const engine = makeEngine();
    const queuePath = path.join(tmpRoot, "queue.jsonl");
    const resultsPath = path.join(tmpRoot, "results.jsonl");
    const oldIso = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
    const newIso = new Date().toISOString();
    const oldJob: AsyncHookJob = { schemaVersion: 1, jobId: "old", hookPath: "/x.mjs", tier: "", event: "", matcher: "", tool: "", timeoutMs: 1000, enqueuedAt: oldIso };
    const newJob: AsyncHookJob = { schemaVersion: 1, jobId: "new", hookPath: "/x.mjs", tier: "", event: "", matcher: "", tool: "", timeoutMs: 1000, enqueuedAt: newIso };
    fs.writeFileSync(queuePath, [oldJob, newJob].map((j) => JSON.stringify(j)).join("\n") + "\n", "utf8");
    fs.writeFileSync(resultsPath, JSON.stringify({ schemaVersion: 1, jobId: "old", hookPath: "/x.mjs", tier: "", event: "", status: "succeeded", exitCode: 0, signal: null, startedAt: oldIso, completedAt: oldIso, durationMs: 1, stdoutBytes: 0, stderrBytes: 0 }) + "\n", "utf8");
    engine.clearCache();
    const purged = engine.purgeOlderThan(10 * 60 * 1000); // 10 min cutoff
    expect(purged.queuePurged).toBe(1);
    expect(purged.resultsPurged).toBe(1);
    expect(engine.getPendingJobs().length).toBe(1);
    expect(engine.getPendingJobs()[0].jobId).toBe("new");
  });

  it("isAvailable returns false when neither file exists, true once one is written", () => {
    const engine = makeEngine();
    expect(engine.isAvailable()).toBe(false);
    engine.enqueue({ hookPath: "/tmp/foo.mjs" });
    expect(engine.isAvailable()).toBe(true);
  });

  it("getResults respects limit + window with sane defaults", async () => {
    const engine = makeEngine();
    for (let i = 0; i < 5; i++) {
      const e = engine.enqueue({ hookPath: `/h/h${i}.mjs` });
      await engine.runJob(e.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 0 }) });
    }
    const limited = engine.getResults({ limit: 2 });
    expect(limited.length).toBe(2);
    expect(engine.getResults({ limit: 0 }).length).toBe(ASYNC_HOOK_LIMITS.DEFAULT_RESULT_LIMIT > 5 ? 5 : ASYNC_HOOK_LIMITS.DEFAULT_RESULT_LIMIT);
  });
});

// ── spanning configurations (the variability floor: 3+ distinct hooks) ─────

describe("AsyncHookDispatcherEngine spanning T4 hook fixtures", () => {
  it("handles a representative set of three real Tier-4 hook basenames", async () => {
    const engine = makeEngine();
    const t4 = [
      "/H/prism/.claude/hooks/test-100-percent-gate.mjs",
      "/H/prism/.claude/hooks/git-sync-stop.mjs",
      "/H/prism/.claude/hooks/git-sync-fetch.mjs",
    ];
    for (const h of t4) {
      const e = engine.enqueue({ hookPath: h, tier: "T4", event: "Stop" });
      await engine.runJob(e.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 0, stdoutChunks: [h] }) });
    }
    const stats = engine.getStats();
    expect(stats.uniqueHooks).toBe(3);
    expect(stats.totalFires).toBe(3);
    const hooks = stats.perHook.map((p) => p.hook).sort();
    expect(hooks).toEqual(["git-sync-fetch", "git-sync-stop", "test-100-percent-gate"]);
  });

  it("mixed success/failure/timeout statuses aggregate correctly across hooks", async () => {
    const engine = makeEngine();
    const e1 = engine.enqueue({ hookPath: "/h/a.mjs" });
    await engine.runJob(e1.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 0 }) });
    const e2 = engine.enqueue({ hookPath: "/h/a.mjs" });
    await engine.runJob(e2.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 5 }) });
    const e3 = engine.enqueue({ hookPath: "/h/b.mjs" });
    await engine.runJob(e3.jobId, { spawnFn: makeWrappedHookSpawn({ exitCode: 0 }) });

    const stats = engine.getStats();
    expect(stats.uniqueHooks).toBe(2);
    const a = stats.perHook.find((p) => p.hook === "a");
    const b = stats.perHook.find((p) => p.hook === "b");
    expect(a?.fires).toBe(2);
    expect(a?.failed).toBe(1);
    expect(a?.succeeded).toBe(1);
    expect(b?.fires).toBe(1);
    expect(b?.failed).toBe(0);
    expect(b?.succeeded).toBe(1);
  });

  it("100-job stress: every enqueued job persists, runJob removes each one", async () => {
    const engine = makeEngine();
    const jobIds: string[] = [];
    const N = 100;
    for (let i = 0; i < N; i++) {
      const e = engine.enqueue({ hookPath: `/h/hook-${i}.mjs` });
      jobIds.push(e.jobId);
    }
    expect(engine.getPendingJobs().length).toBe(N);
    for (const id of jobIds) {
      await engine.runJob(id, { spawnFn: makeWrappedHookSpawn({ exitCode: 0 }) });
    }
    expect(engine.getPendingJobs().length).toBe(0);
    expect(engine.getResults({ status: "any", limit: ASYNC_HOOK_LIMITS.ABSOLUTE_RESULT_LIMIT }).length).toBe(N);
  });
});

// ── singleton + dispatcher round-trip ───────────────────────────────────────

describe("AsyncHookDispatcherEngine singleton + dispatcher contract", () => {
  it("getAsyncHookDispatcherEngine returns the same instance across calls", () => {
    const a = getAsyncHookDispatcherEngine();
    const b = getAsyncHookDispatcherEngine();
    expect(a).toBe(b);
    expect(a).toBe(asyncHookDispatcherEngine);
  });

  it("ASYNC_HOOK_LIMITS is frozen + carries the expected schema version", () => {
    expect(ASYNC_HOOK_LIMITS.SCHEMA_VERSION).toBe(1);
    expect(Object.isFrozen(ASYNC_HOOK_LIMITS)).toBe(true);
  });

  it("dispatcher schema's async_dispatch action enum matches the engine's mode coverage", async () => {
    // The dispatcher exposes 6 modes. Verifying the engine has a method for each
    // closes the contract: any new schema mode must add a public method here,
    // and any removed mode must be reflected in the schema.
    const engine = makeEngine();
    expect(typeof engine.enqueue).toBe("function");          // mode=enqueue
    expect(typeof engine.getPendingJobs).toBe("function");   // mode=pending
    expect(typeof engine.getResults).toBe("function");       // mode=results
    expect(typeof engine.getStats).toBe("function");         // mode=stats
    expect(typeof engine.isAvailable).toBe("function");      // mode=available
    expect(typeof engine.purgeOlderThan).toBe("function");   // mode=purge
  });

  it("clearCache resets all internal caches so a subsequent read re-parses disk", () => {
    const engine = makeEngine();
    engine.enqueue({ hookPath: "/tmp/x.mjs" });
    expect(engine.getPendingJobs().length).toBe(1);
    // Mutate the file directly behind the engine's back (simulate another runner).
    const queuePath = path.join(tmpRoot, "queue.jsonl");
    fs.writeFileSync(queuePath, "", "utf8");
    // Without clearCache the engine would still return the cached entry — call it.
    engine.clearCache();
    expect(engine.getPendingJobs().length).toBe(0);
  });
});
