/**
 * cadRegressionOrchestrator100FileSmoke.test.ts — U-CINF14 (CAD-INFRA-MS0)
 *
 * 100-file end-to-end smoke test for the CAD regression pipeline. Composes
 * five real engines together (no mocks) and asserts the four exit criteria
 * from the milestone envelope:
 *
 *   1. state persists       — TestBatch JSON is on disk and parses cleanly
 *   2. workers parallel     — concurrency observed exceeds 1
 *   3. dashboard updates    — DashboardEngine reads orchestrator output and
 *                             reflects counts + lifecycle + throughput
 *   4. artifacts captured   — ArtifactStorageEngine writes error_log per
 *                             failure, with the manifest recoverable
 *
 * Engines exercised:
 *   • CADRegressionTestOrchestratorEngine (CINF04)
 *   • CADRegressionWorkerThreadRunnerEngine (CINF04.x — replaced by an
 *     in-process TestRunner here; the worker-thread runner has its own
 *     dedicated test suite cadRegressionWorkerThreadRunner.test.ts)
 *   • CADRegressionDashboardEngine (CINF08)
 *   • CADArtifactStorageEngine (CINF07)
 *   • CADFailureTriageEngine (CINF06)
 *
 * Design choices:
 *   • In-process TestRunner with controlled outcomes (not the worker-thread
 *     runner): keeps the test fast (<5s) and deterministic, while still
 *     exercising the full orchestration + persistence path. The worker-thread
 *     runner is covered separately to keep this an integration test, not a
 *     concurrency stress test.
 *   • Real on-disk paths under a fresh tempdir so atomicWrite + the
 *     dashboard's _defaultFS path are both exercised end-to-end.
 *   • 100-file batch with a deterministic outcome pattern (95 pass / 3 fail /
 *     1 skip / 1 error) — matches the milestone's "97% pass on real corpus"
 *     working assumption while keeping every error bucket exercised.
 *
 * @module __tests__/cadRegressionOrchestrator100FileSmoke
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as nodePath from "path";
import * as nodeFs from "fs";
import { randomUUID } from "crypto";
import {
  CADRegressionTestOrchestratorEngine,
  type FileTask,
  type FileTestResult,
  type TestRunner,
} from "../engines/CADRegressionTestOrchestratorEngine.js";
import {
  CADRegressionDashboardEngine,
} from "../engines/CADRegressionDashboardEngine.js";
import {
  CADArtifactStorageEngine,
} from "../engines/CADArtifactStorageEngine.js";
import {
  CADFailureTriageEngine,
  type FailurePayload,
} from "../engines/CADFailureTriageEngine.js";
import { TestBatchSchema } from "../schemas/cadRegressionTestSchema.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;
// Outcome pattern — every bucket exercised, total = 100.
// 95 pass · 3 fail (comparison) · 1 skip · 1 error (crash). Adjust the
// counts here if the assertion targets below change.
const PATTERN_COUNTS = { pass: 95, fail: 3, skip: 1, error: 1 } as const;

// Sanity: pattern arithmetic must match BATCH_SIZE — fail fast on edits.
const PATTERN_TOTAL =
  PATTERN_COUNTS.pass +
  PATTERN_COUNTS.fail +
  PATTERN_COUNTS.skip +
  PATTERN_COUNTS.error;
if (PATTERN_TOTAL !== BATCH_SIZE) {
  throw new Error(
    `cadRegressionOrchestrator100FileSmoke: PATTERN_COUNTS sum (${PATTERN_TOTAL}) ≠ BATCH_SIZE (${BATCH_SIZE})`,
  );
}

interface SmokeFixture {
  rootDir: string;
  stateDir: string;
  artifactRoot: string;
  statePath: string;
  batchId: string;
}

function makeFixture(): SmokeFixture {
  const rootDir = nodeFs.mkdtempSync(
    nodePath.join(os.tmpdir(), "cad-cinf14-smoke-"),
  );
  const stateDir = nodePath.join(rootDir, "state");
  const artifactRoot = nodePath.join(rootDir, "artifacts");
  nodeFs.mkdirSync(stateDir, { recursive: true });
  nodeFs.mkdirSync(artifactRoot, { recursive: true });
  const batchId = randomUUID();
  const statePath = nodePath.join(stateDir, `${batchId}.json`);
  return { rootDir, stateDir, artifactRoot, statePath, batchId };
}

function cleanupFixture(fx: SmokeFixture): void {
  try {
    nodeFs.rmSync(fx.rootDir, { recursive: true, force: true });
  } catch (err) {
    // R12 fail-loud: don't silently swallow tmpdir cleanup failures (on
    // Windows a stale file handle from atomicWrite.rename() can hold the
    // dir briefly). Surface the failure so test pollution under
    // os.tmpdir() is visible; the test itself has already passed by this
    // point, so a console.warn is the right escalation level.
    // eslint-disable-next-line no-console -- test-time diagnostic (Karpathy
    // R12 fail-loud: a swallowed cleanup error would mask test-pollution
    // accumulation under os.tmpdir() over many runs)
    console.warn(
      `[cinf14-smoke] tempdir cleanup failed for ${fx.rootDir}: ${(err as Error).message}`,
    );
  }
}

function mkTask(i: number): FileTask {
  return {
    fileId: `smoke-file-${i.toString().padStart(4, "0")}`,
    absolutePath: `H:/fake/smoke-${i}.sldprt`,
    format: ".sldprt",
    testStrategy: "open_part",
    handler: "SolidWorksAutomationBridge",
  };
}

function mkBatch(n: number = BATCH_SIZE): FileTask[] {
  return Array.from({ length: n }, (_v, i) => mkTask(i));
}

/**
 * Outcome plan keyed by fileId. Built so that the assertions below remain
 * deterministic regardless of worker scheduling order. The plan is:
 *   indices [0   ..  94] → pass
 *   indices [95  ..  97] → fail (comparison)
 *   indices [98]         → skip
 *   indices [99]         → error (crash)
 */
function buildOutcomePlan(): Map<string, FileTestResult> {
  const plan = new Map<string, FileTestResult>();
  let idx = 0;
  for (let i = 0; i < PATTERN_COUNTS.pass; i++, idx++) {
    const t = mkTask(idx);
    plan.set(t.fileId, {
      fileId: t.fileId,
      status: "pass",
      errorType: "none",
      durationMs: 4,
    });
  }
  for (let i = 0; i < PATTERN_COUNTS.fail; i++, idx++) {
    const t = mkTask(idx);
    plan.set(t.fileId, {
      fileId: t.fileId,
      status: "fail",
      errorType: "comparison",
      durationMs: 6,
      errorMessage: `Comparison tolerance exceeded for ${t.fileId}`,
    });
  }
  for (let i = 0; i < PATTERN_COUNTS.skip; i++, idx++) {
    const t = mkTask(idx);
    plan.set(t.fileId, {
      fileId: t.fileId,
      status: "skip",
      errorType: "none",
      durationMs: 1,
    });
  }
  // Final entry → error sentinel. The runner sees status=error and throws,
  // which the orchestrator wraps into status=error/errorType=crash — the
  // same path the real worker-thread runner uses for unhandled exceptions.
  const errTask = mkTask(idx);
  plan.set(errTask.fileId, {
    fileId: errTask.fileId,
    status: "error",
    errorType: "crash",
    durationMs: 0,
  });
  return plan;
}

/**
 * Deterministic in-process runner: looks up each task in the outcome plan
 * and returns the prescribed result. For the single "crash" file the runner
 * throws — orchestrator wraps that into status=error/errorType=crash.
 *
 * The runner also tracks concurrency so the test can assert workers ran in
 * parallel without relying on timing flakiness.
 */
function buildSmokeRunner(plan: Map<string, FileTestResult>): {
  runner: TestRunner;
  maxConcurrent: () => number;
  totalRan: () => number;
} {
  let inFlight = 0;
  let maxSeen = 0;
  let total = 0;
  const runner: TestRunner = {
    async run(task, _signal): Promise<FileTestResult> {
      inFlight++;
      if (inFlight > maxSeen) maxSeen = inFlight;
      // Small async yield so concurrent workers actually overlap.
      await new Promise((r) => setTimeout(r, 3));
      total++;
      const planned = plan.get(task.fileId);
      inFlight--;
      if (!planned) {
        // Files outside the planned range — treat as pass (defensive).
        return {
          fileId: task.fileId,
          status: "pass",
          errorType: "none",
          durationMs: 1,
        };
      }
      // The "error" sentinel triggers the crash-classification path.
      if (planned.status === "error") {
        throw new Error(`Seeded crash for ${task.fileId}`);
      }
      return planned;
    },
  };
  return {
    runner,
    maxConcurrent: () => maxSeen,
    totalRan: () => total,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CADRegressionOrchestrator — 100-file end-to-end smoke (U-CINF14)", () => {
  let orchestrator: CADRegressionTestOrchestratorEngine;
  let dashboard: CADRegressionDashboardEngine;
  let artifacts: CADArtifactStorageEngine;
  let triage: CADFailureTriageEngine;
  let fx: SmokeFixture;

  beforeEach(() => {
    orchestrator = new CADRegressionTestOrchestratorEngine();
    dashboard = new CADRegressionDashboardEngine();
    artifacts = new CADArtifactStorageEngine();
    triage = new CADFailureTriageEngine();
    fx = makeFixture();
  });

  afterEach(() => {
    cleanupFixture(fx);
  });

  it("runs a 100-file batch to completion with the planned outcome mix", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);

    const batch = await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 8,
      statePath: fx.statePath,
    });

    expect(batch.stats.total).toBe(BATCH_SIZE);
    expect(batch.stats.passed).toBe(PATTERN_COUNTS.pass);
    expect(batch.stats.failed).toBe(PATTERN_COUNTS.fail);
    expect(batch.stats.skipped).toBe(PATTERN_COUNTS.skip);
    expect(batch.stats.errored).toBe(PATTERN_COUNTS.error);
    // Orchestrator's `completed` counts terminal-non-error files. Errored
    // files are tracked separately. The total terminal count must still
    // equal BATCH_SIZE.
    expect(
      batch.stats.passed + batch.stats.failed + batch.stats.skipped + batch.stats.errored,
    ).toBe(BATCH_SIZE);
  });

  it("persists batch state to disk and the file validates against TestBatchSchema", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    expect(nodeFs.existsSync(fx.statePath)).toBe(true);
    const raw = JSON.parse(nodeFs.readFileSync(fx.statePath, "utf-8"));
    const parsed = TestBatchSchema.parse(raw);
    expect(parsed.batchId).toBe(fx.batchId);
    // Orchestrator's `completed` excludes errored — assert the full terminal
    // sum equals BATCH_SIZE instead. (The dashboard tally treats errored as
    // completed; the orchestrator state does not — both views are correct
    // for their use case.)
    expect(
      parsed.stats.passed + parsed.stats.failed + parsed.stats.skipped + parsed.stats.errored,
    ).toBe(BATCH_SIZE);
    // Every fileId is recorded in the per-file map.
    expect(Object.keys(parsed.files)).toHaveLength(BATCH_SIZE);
  });

  it("runs workers in parallel — maxConcurrent > 1 with workers=8", async () => {
    const plan = buildOutcomePlan();
    const { runner, maxConcurrent, totalRan } = buildSmokeRunner(plan);
    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 8,
      statePath: fx.statePath,
    });
    // Every file ran exactly once (no double-dispatch).
    expect(totalRan()).toBe(BATCH_SIZE);
    // Workers actually overlapped — concurrency exceeded 1 but stays ≤ pool.
    expect(maxConcurrent()).toBeGreaterThan(1);
    expect(maxConcurrent()).toBeLessThanOrEqual(8);
  });

  it("dashboard snapshot reflects the final batch state correctly", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    const snap = await dashboard.snapshot(fx.batchId, fx.stateDir);
    expect(snap.batchId).toBe(fx.batchId);
    expect(snap.lifecycle).toBe("completed");
    expect(snap.pctComplete).toBe(100);
    expect(snap.counts.total).toBe(BATCH_SIZE);
    expect(snap.counts.passed).toBe(PATTERN_COUNTS.pass);
    expect(snap.counts.failed).toBe(PATTERN_COUNTS.fail);
    expect(snap.counts.skipped).toBe(PATTERN_COUNTS.skip);
    expect(snap.counts.errored).toBe(PATTERN_COUNTS.error);
    expect(snap.counts.pending).toBe(0);
    expect(snap.counts.running).toBe(0);
  });

  it("dashboard error breakdown bins each errorType into its correct bucket", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    const snap = await dashboard.snapshot(fx.batchId, fx.stateDir);
    expect(snap.errorBreakdown.comparison).toBe(PATTERN_COUNTS.fail);
    expect(snap.errorBreakdown.crash).toBe(PATTERN_COUNTS.error);
    // No other buckets should have entries with this plan.
    expect(snap.errorBreakdown.format).toBe(0);
    expect(snap.errorBreakdown.parse).toBe(0);
    expect(snap.errorBreakdown.generation).toBe(0);
    expect(snap.errorBreakdown.timeout).toBe(0);
    expect(snap.errorBreakdown.unclassified).toBe(0);
  });

  it("dashboard throughput estimate populates avg duration + windowed count", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    const snap = await dashboard.snapshot(fx.batchId, fx.stateDir);
    expect(snap.throughput.avgTerminalDurationMs).not.toBeNull();
    expect(snap.throughput.avgTerminalDurationMs!).toBeGreaterThan(0);
    // Every file just completed → windowed count = BATCH_SIZE (assuming
    // dashboard's default 5-min window — the test finishes in <5s).
    expect(snap.throughput.windowedCompletedCount).toBe(BATCH_SIZE);
    expect(snap.throughput.windowMinutes).toBeGreaterThan(0);
    // All work done → no remaining → eta = 0.
    expect(snap.throughput.etaMs).toBe(0);
  });

  it("dashboard recentFailures returns the planned failure file ids", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    const snap = await dashboard.snapshot(fx.batchId, fx.stateDir, 5, 100);
    const expectedFailureCount = PATTERN_COUNTS.fail + PATTERN_COUNTS.error;
    expect(snap.recentFailures).toHaveLength(expectedFailureCount);
    const failureIds = new Set(snap.recentFailures.map((f) => f.fileId));
    expect(failureIds.has(mkTask(BATCH_SIZE - 1).fileId)).toBe(true);
    // Each entry has either fail or error status.
    for (const f of snap.recentFailures) {
      expect(["fail", "error"]).toContain(f.status);
    }
  });

  it("captures error_log artifacts for each failure via CADArtifactStorageEngine", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    const batch = await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    // Walk every fail/error file and persist an error_log artifact. This is
    // exactly what a production driver would do after the orchestrator
    // returns — and we assert the on-disk layout matches the canonical path.
    const failures = Object.entries(batch.files).filter(
      ([, entry]) => entry.status === "fail" || entry.status === "error",
    );
    expect(failures.length).toBe(PATTERN_COUNTS.fail + PATTERN_COUNTS.error);

    // Parallel writes — atomicWrite handles concurrent fsync correctly.
    await Promise.all(
      failures.map(([fileId, entry]) =>
        artifacts.write(
          fx.batchId,
          fileId,
          "error_log",
          `errorType=${entry.errorType}\nstatus=${entry.status}\nfileId=${fileId}\n`,
          fx.artifactRoot,
        ),
      ),
    );

    const manifest = await artifacts.listBatch(fx.batchId, fx.artifactRoot);
    expect(manifest.fileCount).toBe(PATTERN_COUNTS.fail + PATTERN_COUNTS.error);
    expect(manifest.artifactCount).toBe(
      PATTERN_COUNTS.fail + PATTERN_COUNTS.error,
    );
    for (const [fileId, perKind] of Object.entries(manifest.byFile)) {
      const rec = perKind.error_log;
      // Concrete shape assertion — every recorded artifact path is on disk,
      // non-empty, and round-trips through the canonical layout helpers.
      expect(rec?.kind).toBe("error_log");
      expect(rec?.fileId).toBe(fileId);
      expect(rec?.batchId).toBe(fx.batchId);
      expect(rec?.sizeBytes).toBeGreaterThan(0);
      expect(nodeFs.existsSync(rec!.absolutePath)).toBe(true);
      // File body matches the body we wrote (atomic write didn't lose data).
      const body = nodeFs.readFileSync(rec!.absolutePath, "utf-8");
      expect(body).toContain(`fileId=${fileId}`);
    }
  });

  it("triage classifies the seeded failures into the correct error categories", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);
    const batch = await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    // Build triage payloads from the failure subset and run them through
    // the classifier. We pass the runner's pre-classified errorType as a
    // `hint` so triage's overlay logic surfaces a deterministic result.
    const payloads: FailurePayload[] = Object.entries(batch.files)
      .filter(([, e]) => e.status === "fail" || e.status === "error")
      .map(([fileId, e]) => ({
        fileId,
        format: ".sldprt",
        message:
          e.errorType === "crash"
            ? `Seeded crash for ${fileId}`
            : `Comparison tolerance exceeded for ${fileId}`,
        hint: e.errorType === "none" ? undefined : e.errorType,
      }));

    expect(payloads).toHaveLength(PATTERN_COUNTS.fail + PATTERN_COUNTS.error);
    const results = payloads.map((p) => triage.triage(p));

    const byType = new Map<string, number>();
    for (const r of results) {
      byType.set(r.errorType, (byType.get(r.errorType) ?? 0) + 1);
    }
    expect(byType.get("comparison") ?? 0).toBe(PATTERN_COUNTS.fail);
    expect(byType.get("crash") ?? 0).toBe(PATTERN_COUNTS.error);

    // Every result carries a stable rootCauseKey suitable for grouping in
    // the dashboard's failure aggregator.
    for (const r of results) {
      expect(r.rootCauseKey).toMatch(/^[a-f0-9]{16,64}$/);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("resumes from a mid-batch checkpoint and only re-runs unfinished files", async () => {
    // Seed: 60 files already passed on disk; 40 remain.
    const all = mkBatch();
    const seedFiles: Record<string, unknown> = {};
    for (let i = 0; i < 60; i++) {
      seedFiles[all[i].fileId] = {
        fileId: all[i].fileId,
        status: "pass",
        errorType: "none",
        durationMs: 2,
        retries: 0,
        artifacts: {},
        completedAt: new Date().toISOString(),
      };
    }
    const seed = {
      batchId: fx.batchId,
      schemaVersion: 1,
      stats: { total: 60, completed: 60, passed: 60, failed: 0, skipped: 0, errored: 0 },
      lastCheckpoint: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: seedFiles,
    };
    nodeFs.writeFileSync(fx.statePath, JSON.stringify(seed));

    let ranThisResume = 0;
    const runner: TestRunner = {
      async run(task, _signal): Promise<FileTestResult> {
        ranThisResume++;
        return {
          fileId: task.fileId,
          status: "pass",
          errorType: "none",
          durationMs: 1,
        };
      },
    };

    const batch = await orchestrator.run(all, {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    // Only the remaining 40 files re-ran.
    expect(ranThisResume).toBe(40);
    expect(batch.stats.passed).toBe(BATCH_SIZE);
    expect(batch.stats.completed).toBe(BATCH_SIZE);
    // Dashboard now agrees with the orchestrator's view of the world.
    const snap = await dashboard.snapshot(fx.batchId, fx.stateDir);
    expect(snap.lifecycle).toBe("completed");
    expect(snap.counts.passed).toBe(BATCH_SIZE);
  });

  it("emits a progress event for every terminal transition during the batch", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);

    let progressEvents = 0;
    orchestrator.events.on("progress", () => {
      progressEvents++;
    });

    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      workers: 4,
      statePath: fx.statePath,
    });

    expect(progressEvents).toBe(BATCH_SIZE);
  });

  it("writes intermediate checkpoints at the configured cadence", async () => {
    const plan = buildOutcomePlan();
    const { runner } = buildSmokeRunner(plan);

    let checkpoints = 0;
    orchestrator.events.on("checkpoint", () => {
      checkpoints++;
    });

    await orchestrator.run(mkBatch(), {
      batchId: fx.batchId,
      runner,
      // workers=1 so per-cadence atomicWrite cannot race with itself on the
      // same .tmp filename — matches the pattern used by the orchestrator's
      // own unit-level checkpoint test (cadRegressionOrchestrator.test.ts).
      workers: 1,
      checkpointEvery: 25,
      checkpointIntervalMs: 1_000_000, // disable time-based cadence
      statePath: fx.statePath,
    });

    // Initial + after 25/50/75/100 + final at minimum (≥4 firing events).
    expect(checkpoints).toBeGreaterThanOrEqual(4);
  });
});
