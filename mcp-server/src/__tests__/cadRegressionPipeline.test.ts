/**
 * cadRegressionPipeline.test.ts — U-CINF14 integration smoke
 *
 * Full-pipeline 100-file subset end-to-end test. Wires together:
 *   - CADFileClassifierEngine   (U-CINF02) → per-file category + strategy
 *   - CADRegressionTestOrchestratorEngine (U-CINF04) → parallel pool + timeout
 *   - CADTestCheckpointEngine   (U-CINF05) → cadence + resume diff
 *
 * Asserts (per CAD-INFRA-MS0 exit criteria):
 *   1. State persists to disk across the run (checkpoint file parses)
 *   2. Workers execute in parallel (observed concurrency > 1)
 *   3. Dashboard-shape updates fire (progress + file_complete events)
 *   4. Per-file artifacts are captured in the final TestBatch
 *   5. Resume from mid-run state replays only pending files
 *   6. 100-file batch completes in reasonable time (<60s with 50ms runner)
 *   7. CheckpointEngine.resumeDiff produces correct partition from persisted state
 *   8. Every indexed file has a classification tag
 */

import { describe, it, expect } from "vitest";
import * as os from "os";
import * as nodePath from "path";
import * as nodeFs from "fs";

import {
  CADFileClassifierEngine,
} from "../engines/CADFileClassifierEngine.js";
import {
  CADRegressionTestOrchestratorEngine,
  type FileTask,
  type FileTestResult,
  type TestRunner,
} from "../engines/CADRegressionTestOrchestratorEngine.js";
import {
  CADTestCheckpointEngine,
} from "../engines/CADTestCheckpointEngine.js";
import {
  TestBatchSchema,
  type TestBatch,
} from "../schemas/cadRegressionTestSchema.js";
import type { CADFileEntry } from "../schemas/cadFileIndexSchema.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempPath(name: string): string {
  const dir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), "cad-pipeline-"));
  return nodePath.join(dir, `${name}.json`);
}

/** Build a 100-file mock corpus covering multiple formats + outcomes. */
function build100FileCorpus(): CADFileEntry[] {
  const formats: Array<CADFileEntry["format"]> = [
    ".sldprt", ".sldasm", ".slddrw",
    ".ipt", ".iam", ".idw",
    ".FCStd", ".f3d", ".f3z",
    ".mcx-8", ".MCX", ".mcam", ".hmc",
    ".step", ".stp", ".iges", ".stl", ".x_t",
  ];
  const files: CADFileEntry[] = [];
  for (let i = 0; i < 100; i++) {
    const fmt = formats[i % formats.length];
    files.push({
      fileId: `pipefile-${i.toString().padStart(4, "0")}-`.padEnd(64, "0").slice(0, 64),
      absolutePath: `H:/fake/pipefile-${i}${fmt}`,
      format: fmt,
      sizeBytes: 100_000 + i,
      customer: "ALCOA",
      machineCategory: "mill",
      complexityHint: "moderate",
      lastModified: "2026-04-19T00:00:00.000Z",
    });
  }
  return files;
}

/**
 * Runner that produces pass/fail/skip based on classification strategy and
 * captures artifacts. Mimics a real bridge's output contract.
 */
function classificationAwareRunner(handlersSeen: Set<string>, inflightTracker: { current: number; max: number }): TestRunner {
  return {
    async run(task: FileTask, _signal: AbortSignal): Promise<FileTestResult> {
      inflightTracker.current++;
      if (inflightTracker.current > inflightTracker.max) {
        inflightTracker.max = inflightTracker.current;
      }
      if (task.handler) handlersSeen.add(task.handler);

      // Simulate work: 3-8ms per file — enough to observe concurrency
      const delay = 3 + (task.fileId.charCodeAt(0) % 6);
      await new Promise((r) => setTimeout(r, delay));

      inflightTracker.current--;

      // 90% pass, 5% fail, 5% skip — deterministic per fileId hash
      const rank = task.fileId.charCodeAt(task.fileId.length - 1) % 20;
      const status: FileTestResult["status"] =
        rank === 0 ? "skip" : rank === 1 ? "fail" : "pass";
      const errorType: FileTestResult["errorType"] =
        status === "fail" ? "comparison" : "none";

      return {
        fileId: task.fileId,
        status,
        errorType,
        durationMs: delay,
        artifacts: {
          actualStep: `artifacts/${task.fileId}/actual.step`,
          errorLog: status === "fail" ? `artifacts/${task.fileId}/error.log` : undefined,
        },
      };
    },
  };
}

// ── Test ──────────────────────────────────────────────────────────────────────

describe("CAD Regression Pipeline (U-CINF14 integration)", () => {
  it("runs 100-file smoke end-to-end: classify → orchestrate → checkpoint → resume", async () => {
    // ── Setup ──────────────────────────────────────────────────────────────
    const classifier = new CADFileClassifierEngine();
    const orchestrator = new CADRegressionTestOrchestratorEngine();
    const checkpoint = new CADTestCheckpointEngine();

    const corpus = build100FileCorpus();
    const classification = classifier.classify(corpus);

    // Every indexed file has a classification tag
    expect(classification.totalFiles).toBe(100);
    expect(classification.classifications.length).toBe(100);
    for (const c of classification.classifications) {
      expect(c.category).toBeDefined();
      expect(c.testStrategy).toBeDefined();
    }

    // Build FileTasks from classification
    const fileIdToEntry = new Map(corpus.map((f) => [f.fileId, f]));
    const tasks: FileTask[] = classification.classifications.map((c) => {
      const entry = fileIdToEntry.get(c.fileId)!;
      return {
        fileId: c.fileId,
        absolutePath: entry.absolutePath,
        format: entry.format,
        testStrategy: c.testStrategy,
        handler: c.handler,
      };
    });

    // ── Run orchestrator ───────────────────────────────────────────────────
    const statePath = tempPath("smoke-100");
    const handlersSeen = new Set<string>();
    const inflightTracker = { current: 0, max: 0 };

    const progressEvents: Array<{ completed: number; total: number }> = [];
    const fileCompleteEvents: Array<{ fileId: string }> = [];
    const checkpointEvents: Array<{ completed: number }> = [];

    orchestrator.events.on("progress", (e) => progressEvents.push(e));
    orchestrator.events.on("file_complete", (e) => fileCompleteEvents.push(e));
    orchestrator.events.on("checkpoint", (e) => checkpointEvents.push(e));

    const t0 = Date.now();
    const batch = await orchestrator.run(tasks, {
      runner: classificationAwareRunner(handlersSeen, inflightTracker),
      workers: 8,
      perFileTimeoutMs: 10_000,
      checkpointEvery: 25,
      checkpointIntervalMs: 1_000_000,
      statePath,
    });
    const elapsedMs = Date.now() - t0;

    // ── Exit criteria ──────────────────────────────────────────────────────

    // 1. 100-file batch completes in reasonable wall-clock (<60s with 3-8ms runner + 8 workers)
    expect(elapsedMs).toBeLessThan(60_000);

    // 2. All 100 files reach terminal state
    expect(batch.stats.total).toBe(100);
    expect(batch.stats.completed + batch.stats.errored).toBe(100);
    // With our seeded runner: ~90 pass, ~5 fail, ~5 skip (no crashes)
    expect(batch.stats.passed + batch.stats.failed + batch.stats.skipped).toBe(100);

    // 3. Workers executed in parallel — max in-flight > 1
    expect(inflightTracker.max).toBeGreaterThan(1);
    expect(inflightTracker.max).toBeLessThanOrEqual(8);

    // 4. Dashboard-shape events fired — progress per file + checkpoints + per-file complete
    expect(progressEvents.length).toBe(100);
    expect(fileCompleteEvents.length).toBe(100);
    expect(checkpointEvents.length).toBeGreaterThanOrEqual(3); // initial + mid + final
    const lastProgress = progressEvents[progressEvents.length - 1];
    expect(lastProgress.completed).toBe(100);
    expect(lastProgress.total).toBe(100);

    // 5. State persists — checkpoint file on disk parses cleanly
    expect(nodeFs.existsSync(statePath)).toBe(true);
    const raw = JSON.parse(nodeFs.readFileSync(statePath, "utf-8"));
    const parsed = TestBatchSchema.parse(raw);
    expect(parsed.stats.completed + parsed.stats.errored).toBe(100);

    // 6. Per-file artifacts captured
    const samplePassed = Object.values(batch.files).find((f) => f.status === "pass");
    expect(samplePassed).toBeDefined();
    expect(samplePassed!.artifacts.actualStep).toMatch(/artifacts\/.*\/actual\.step/);

    // 7. Handlers pulled from classification reached the runner — proves wiring
    expect(handlersSeen.has("SolidWorksAutomationBridge")).toBe(true);
    expect(handlersSeen.has("InventorAutomationBridge")).toBe(true);
    expect(handlersSeen.has("MastercamAutomationBridge")).toBe(true);

    // ── Resume test ────────────────────────────────────────────────────────
    // Checkpoint engine partitions the persisted state correctly:
    // all 100 files are terminal → pendingIds empty.
    const diffClean = checkpoint.resumeDiff(parsed);
    expect(diffClean.completedIds.length).toBe(100);
    expect(diffClean.pendingIds.length).toBe(0);

    // Simulate a mid-run crash: rewrite state with 30 files pending
    const crashBatch: TestBatch = JSON.parse(JSON.stringify(parsed));
    const fileIds = Object.keys(crashBatch.files).sort();
    for (let i = 0; i < 30; i++) {
      crashBatch.files[fileIds[i]] = {
        fileId: fileIds[i],
        status: "pending",
        errorType: "none",
        durationMs: 0,
        retries: 0,
        artifacts: {},
      };
    }
    // Mark 5 as 'running' (simulating worker crash during those)
    for (let i = 30; i < 35; i++) {
      crashBatch.files[fileIds[i]] = {
        fileId: fileIds[i],
        status: "running",
        errorType: "none",
        durationMs: 0,
        retries: 0,
        artifacts: {},
      };
    }
    crashBatch.stats = {
      total: 100, completed: 65, passed: 65,
      failed: 0, skipped: 0, errored: 0,
    };
    nodeFs.writeFileSync(statePath, JSON.stringify(crashBatch));

    // Load via CheckpointEngine → partition
    const resumedBatch = await checkpoint.load(statePath);
    expect(resumedBatch).not.toBeNull();
    const resumeDiff = checkpoint.resumeDiff(resumedBatch!);
    // 30 pending + 5 running-reverted = 35 to re-run
    expect(resumeDiff.pendingIds.length).toBe(35);
    expect(resumeDiff.revertedIds.length).toBe(5);
    expect(resumeDiff.completedIds.length).toBe(65);

    // Re-run orchestrator — should execute only the 35 pending
    const resumeHandlers = new Set<string>();
    const resumeTracker = { current: 0, max: 0 };
    let resumeRuns = 0;
    const countingRunner: TestRunner = {
      async run(task, _signal): Promise<FileTestResult> {
        resumeRuns++;
        resumeTracker.current++;
        if (resumeTracker.current > resumeTracker.max) resumeTracker.max = resumeTracker.current;
        if (task.handler) resumeHandlers.add(task.handler);
        await new Promise((r) => setTimeout(r, 2));
        resumeTracker.current--;
        return { fileId: task.fileId, status: "pass", errorType: "none", durationMs: 2 };
      },
    };

    const resumedFinal = await orchestrator.run(tasks, {
      batchId: resumedBatch!.batchId,
      runner: countingRunner,
      workers: 8,
      statePath,
    });

    expect(resumeRuns).toBe(35); // only pending + reverted-running re-executed
    expect(resumedFinal.stats.completed).toBe(100);
    // Original 65 passed, plus 35 new passes (overriding prior "running" → "pass")
    expect(resumedFinal.stats.passed).toBe(100);
  }, 90_000);

  it("forces a final checkpoint regardless of cadence on small batches", async () => {
    const orchestrator = new CADRegressionTestOrchestratorEngine();
    const checkpoint = new CADTestCheckpointEngine();

    const statePath = tempPath("small-final");
    const tasks: FileTask[] = [{
      fileId: "abc".padEnd(64, "0").slice(0, 64),
      absolutePath: "H:/fake/abc.sldprt",
      format: ".sldprt",
      testStrategy: "open_part",
    }];

    const runner: TestRunner = {
      async run(task, _s): Promise<FileTestResult> {
        return { fileId: task.fileId, status: "pass", errorType: "none", durationMs: 1 };
      },
    };

    await orchestrator.run(tasks, {
      runner,
      workers: 1,
      checkpointEvery: 10_000,           // never by count
      checkpointIntervalMs: 10_000_000,  // never by time
      statePath,
    });

    // Final forced checkpoint exists
    const loaded = await checkpoint.load(statePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.stats.completed).toBe(1);
  });
});
