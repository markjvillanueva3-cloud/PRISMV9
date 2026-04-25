/**
 * groundTruthBatchExtractor.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT07
 *
 * Validates batch orchestration, atomic checkpointing, idempotent resume,
 * coverage reporting, and bounded concurrency. All sub-engines injected as
 * stubs so tests are deterministic and independent of CAD bridges.
 */

process.env["PRISM_CAD_MOCK"] = "1";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  GroundTruthBatchExtractor,
  groundTruthBatchExtractor,
  BatchTaskSchema,
  BundleResultSchema,
  CheckpointStateSchema,
  type BatchExtractorDeps,
  type BatchTask,
  type BundleResult,
} from "../engines/GroundTruthBatchExtractor.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt07-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore best-effort cleanup
  }
});

// ── Stub dependency factories ───────────────────────────────────────────────

function makeOkDeps(): BatchExtractorDeps {
  return {
    pipeline: {
      async runPipeline({ filePath, outputPath }) {
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(
          outputPath,
          "ISO-10303-21;\nDATA;\nCARTESIAN_POINT('p',(0,0,0));\nENDSEC;\nEND-ISO-10303-21;\n",
          "utf8",
        );
        return {
          filePath,
          outputPath,
          bridge: null,
          ext: ".step",
          strategyUsed: "native-bridge",
          attempts: [],
          validation: {
            valid: true,
            schema: "AP242",
            inspectedBytes: 100,
            issues: [],
          },
          totalDurationMs: 1,
          success: true,
        } as never;
      },
    } as never,
    featureTree: {
      async extract(filePath: string) {
        return {
          schemaVersion: "1.0.0",
          sourceFile: filePath,
          sourceFormat: "FCStd",
          features: [
            { id: "f1", type: "Body", name: "stub" },
          ],
          coverage: 1,
          signature: "f".repeat(64),
          warnings: [],
        } as never;
      },
    } as never,
    dimensionalSig: {
      async extractFromStep(filePath: string) {
        return {
          schemaVersion: "1.0.0",
          sourceFile: filePath,
          unitSystem: "SI",
          sourceLengthUnit: "mm",
          bbox: { min: [0, 0, 0], max: [1, 1, 1], extent: [1, 1, 1] },
          envelopeM: 0.001,
          volumeBboxM3: 1e-9,
          surfaceAreaM2: 6e-6,
          com: [0.5, 0.5, 0.5],
          moiAABB: { Ixx: 0, Iyy: 0, Izz: 0 },
          holes: [],
          counts: { cartesianPoints: 1, circles: 0, lines: 0 },
          signature: "d".repeat(64),
          warnings: [],
        } as never;
      },
    } as never,
    screenshots: {
      async captureViews(stepFile: string, opts: { fileId: string; outputRoot: string }) {
        return {
          schemaVersion: "1.0.0",
          fileId: opts.fileId,
          sourceStep: stepFile,
          outputDir: path.join(opts.outputRoot, opts.fileId, "screenshots"),
          views: [],
          totalDurationMs: 1,
          allOk: true,
          pythonAvailable: false,
          signature: "5".repeat(64),
          warnings: [],
        } as never;
      },
    } as never,
  };
}

function makeFailingPipelineDeps(): BatchExtractorDeps {
  const ok = makeOkDeps();
  return {
    ...ok,
    pipeline: {
      async runPipeline({ filePath, outputPath }) {
        return {
          filePath,
          outputPath,
          bridge: null,
          ext: null,
          strategyUsed: null,
          attempts: [],
          validation: {
            valid: false,
            schema: "unknown",
            inspectedBytes: 0,
            issues: [],
          },
          totalDurationMs: 0,
          success: false,
          error: "all strategies failed",
        } as never;
      },
    } as never,
  };
}

function makeFlakyScreenshotDeps(): BatchExtractorDeps {
  const ok = makeOkDeps();
  return {
    ...ok,
    screenshots: {
      async captureViews(stepFile: string, opts: { fileId: string; outputRoot: string }) {
        return {
          schemaVersion: "1.0.0",
          fileId: opts.fileId,
          sourceStep: stepFile,
          outputDir: path.join(opts.outputRoot, opts.fileId, "screenshots"),
          views: [],
          totalDurationMs: 1,
          allOk: false, // signals partial
          pythonAvailable: false,
          signature: "5".repeat(64),
          warnings: ["one view failed"],
        } as never;
      },
    } as never,
  };
}

function tasksAt(rootDir: string, count: number, format = ".FCStd"): BatchTask[] {
  const out: BatchTask[] = [];
  for (let i = 0; i < count; i++) {
    const fileId = `FILE-${String(i).padStart(3, "0")}`;
    const sourcePath = path.join(rootDir, `${fileId}${format}`);
    fs.writeFileSync(sourcePath, "stub", "utf8");
    out.push({ fileId, sourcePath, format });
  }
  return out;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("GroundTruthBatchExtractor — input validation", () => {
  it("BatchTaskSchema rejects fileIds with path separators or unsafe chars", () => {
    expect(BatchTaskSchema.safeParse({
      fileId: "../escape",
      sourcePath: "/x",
      format: ".step",
    }).success).toBe(false);
    expect(BatchTaskSchema.safeParse({
      fileId: "ok-name.123",
      sourcePath: "/x",
      format: ".step",
    }).success).toBe(true);
  });

  it("BatchTaskSchema rejects format without leading dot", () => {
    expect(BatchTaskSchema.safeParse({
      fileId: "f",
      sourcePath: "/x",
      format: "step",
    }).success).toBe(false);
  });

  it("extractBatch throws on missing outputRoot", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    await expect(
      e.extractBatch([], { outputRoot: "" }),
    ).rejects.toThrow(/outputRoot must be a non-empty string/);
  });

  it("extractBatch throws on duplicate fileId", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const dir = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(dir, 1);
    const dupe = [tasks[0]!, tasks[0]!];
    await expect(
      e.extractBatch(dupe, { outputRoot: tmpRoot }),
    ).rejects.toThrow(/duplicate fileId/);
  });

  it("extractBatch throws on invalid task with field-level diagnostic", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    await expect(
      e.extractBatch(
        [{ fileId: "", sourcePath: "/x", format: ".step" }],
        { outputRoot: tmpRoot },
      ),
    ).rejects.toThrow(/task\[0\] invalid/);
  });
});

describe("extractBatch — happy path", () => {
  it("processes 5 tasks → all status=ok, writes per-file bundle.json", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 5);
    const out = path.join(tmpRoot, "out");

    const { runId, results, coverage, checkpoint } = await e.extractBatch(
      tasks,
      { outputRoot: out },
    );

    expect(results.length).toBe(5);
    expect(results.every((r) => r.status === "ok")).toBe(true);
    expect(coverage.ok).toBe(5);
    expect(coverage.failed).toBe(0);
    expect(coverage.total).toBe(5);
    expect(coverage.byFormat[".FCStd"]?.ok).toBe(5);
    expect(checkpoint.completedFileIds.length).toBe(5);
    expect(runId.length).toBeGreaterThan(0);

    for (const t of tasks) {
      const bundlePath = path.join(out, t.fileId, "bundle.json");
      const stat = fs.statSync(bundlePath);
      expect(stat.size).toBeGreaterThan(50);
      const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
      expect(BundleResultSchema.safeParse(bundle).success).toBe(true);
      expect(fs.existsSync(path.join(out, t.fileId, "source.step"))).toBe(true);
      expect(
        fs.existsSync(path.join(out, t.fileId, "feature-tree.json")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(out, t.fileId, "dimensional-signature.json")),
      ).toBe(true);
    }
  });

  it("invokes onProgress for each terminal transition with correct counts", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 3);
    const out = path.join(tmpRoot, "out");
    const seen: { completed: number; total: number; status: string }[] = [];
    await e.extractBatch(tasks, {
      outputRoot: out,
      onProgress: (s) =>
        seen.push({ completed: s.completed, total: s.total, status: s.status }),
    });
    expect(seen.length).toBe(3);
    expect(seen.map((s) => s.completed).sort()).toEqual([1, 2, 3]);
    expect(seen.every((s) => s.total === 3)).toBe(true);
    expect(seen.every((s) => s.status === "ok")).toBe(true);
  });

  it("persists checkpoint at outputRoot/_checkpoints/{runId}.json", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 2);
    const out = path.join(tmpRoot, "out");
    const { runId } = await e.extractBatch(tasks, {
      outputRoot: out,
      runId: "run-fixed-1",
    });
    expect(runId).toBe("run-fixed-1");
    const cpPath = path.join(out, "_checkpoints", "run-fixed-1.json");
    expect(fs.existsSync(cpPath)).toBe(true);
    const cp = JSON.parse(fs.readFileSync(cpPath, "utf8"));
    expect(CheckpointStateSchema.safeParse(cp).success).toBe(true);
    expect(cp.completedFileIds.sort()).toEqual(["FILE-000", "FILE-001"]);
    expect(cp.total).toBe(2);
  });
});

describe("extractBatch — failure + partial paths", () => {
  it("STEP failure → status=failed, errors recorded, downstream stages skipped", async () => {
    const e = new GroundTruthBatchExtractor(makeFailingPipelineDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 1);
    const out = path.join(tmpRoot, "out");
    const { results, coverage } = await e.extractBatch(tasks, {
      outputRoot: out,
    });
    expect(results.length).toBe(1);
    const r = results[0]!;
    expect(r.status).toBe("failed");
    expect(r.stages.step.ok).toBe(false);
    expect(r.stages.step.error).toContain("all strategies failed");
    expect(r.stages.dimensionalSig.ok).toBe(false);
    expect(r.stages.dimensionalSig.error).toContain("STEP export failed");
    expect(r.stages.screenshots.ok).toBe(false);
    expect(coverage.failed).toBe(1);
    expect(coverage.ok).toBe(0);
  });

  it("flaky screenshot stage → status=partial with allOk=false propagated", async () => {
    const e = new GroundTruthBatchExtractor(makeFlakyScreenshotDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 2);
    const { results, coverage, checkpoint } = await e.extractBatch(tasks, {
      outputRoot: path.join(tmpRoot, "out"),
    });
    expect(results.every((r) => r.status === "partial")).toBe(true);
    expect(coverage.partial).toBe(2);
    expect(coverage.ok).toBe(0);
    expect(checkpoint.partialFileIds.length).toBe(2);
    expect(checkpoint.completedFileIds.length).toBe(0);
  });
});

describe("extractBatch — resume / idempotency", () => {
  it("re-running with same runId skips ok-bundle files (status=skipped)", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 3);
    const out = path.join(tmpRoot, "out");
    await e.extractBatch(tasks, { outputRoot: out, runId: "resume-1" });
    const second = await e.extractBatch(tasks, {
      outputRoot: out,
      runId: "resume-1",
    });
    expect(second.results.every((r) => r.status === "skipped")).toBe(true);
    expect(second.coverage.skipped).toBe(3);
    expect(second.coverage.ok).toBe(0);
  });

  it("force=true re-runs even when bundle already ok", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 2);
    const out = path.join(tmpRoot, "out");
    await e.extractBatch(tasks, { outputRoot: out, runId: "force-1" });
    const second = await e.extractBatch(tasks, {
      outputRoot: out,
      runId: "force-1",
      force: true,
    });
    expect(second.results.every((r) => r.status === "ok")).toBe(true);
    expect(second.coverage.skipped).toBe(0);
    expect(second.coverage.ok).toBe(2);
  });
});

describe("extractBatch — concurrency", () => {
  it("respects maxConcurrency=2 — never more than 2 tasks in flight", async () => {
    let live = 0;
    let peak = 0;
    const slowDeps: BatchExtractorDeps = {
      ...makeOkDeps(),
      pipeline: {
        async runPipeline({ filePath, outputPath }) {
          live += 1;
          peak = Math.max(peak, live);
          await new Promise((r) => setTimeout(r, 30));
          await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.promises.writeFile(outputPath, "ISO-10303-21;\nEND-ISO-10303-21;\n");
          live -= 1;
          return {
            filePath,
            outputPath,
            bridge: null,
            ext: ".step",
            strategyUsed: "native-bridge",
            attempts: [],
            validation: { valid: true, schema: "AP242", inspectedBytes: 1, issues: [] },
            totalDurationMs: 30,
            success: true,
          } as never;
        },
      } as never,
    };
    const e = new GroundTruthBatchExtractor(slowDeps);
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 6);
    await e.extractBatch(tasks, {
      outputRoot: path.join(tmpRoot, "out"),
      maxConcurrency: 2,
    });
    expect(peak).toBeLessThanOrEqual(2);
    expect(peak).toBeGreaterThanOrEqual(1);
  });
});

describe("generateCoverageReport / asTestRunner / validate", () => {
  it("coverage report computes per-format breakdown + percentile durations", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const fakes: BundleResult[] = [
      mkResult("a", ".step", "ok", 10),
      mkResult("b", ".step", "ok", 30),
      mkResult("c", ".FCStd", "partial", 100),
      mkResult("d", ".FCStd", "failed", 5),
      mkResult("e", ".f3d", "skipped", 1),
    ];
    const cov = e.generateCoverageReport(fakes);
    expect(cov.total).toBe(5);
    expect(cov.ok).toBe(2);
    expect(cov.partial).toBe(1);
    expect(cov.failed).toBe(1);
    expect(cov.skipped).toBe(1);
    expect(cov.byFormat[".step"]?.ok).toBe(2);
    expect(cov.byFormat[".FCStd"]?.partial).toBe(1);
    expect(cov.byFormat[".FCStd"]?.failed).toBe(1);
    expect(cov.byFormat[".f3d"]?.skipped).toBe(1);
    expect(cov.durationMsTotal).toBe(146);
    expect(cov.durationMsP50).toBeCloseTo(10, 5);
    expect(cov.durationMsP95).toBeGreaterThan(50);
  });

  it("asTestRunner adapter maps ok→pass, failed→fail, skipped→skip", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const runner = e.asTestRunner({ outputRoot: path.join(tmpRoot, "out") });
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    fs.writeFileSync(path.join(src, "X.FCStd"), "stub");
    const r = await runner.run(
      { fileId: "X", absolutePath: path.join(src, "X.FCStd"), format: ".FCStd" },
      new AbortController().signal,
    );
    expect(r.status).toBe("pass");
    expect(r.errorType).toBe("none");
    expect(r.fileId).toBe("X");

    const aborted = new AbortController();
    aborted.abort();
    const r2 = await runner.run(
      { fileId: "Y", absolutePath: "/x.FCStd", format: ".FCStd" },
      aborted.signal,
    );
    expect(r2.status).toBe("error");
  });

  it("validate ok=true for fresh bundle, ok=false for malformed", async () => {
    const e = new GroundTruthBatchExtractor(makeOkDeps());
    const src = fs.mkdtempSync(path.join(tmpRoot, "src-"));
    const tasks = tasksAt(src, 1);
    const { results } = await e.extractBatch(tasks, {
      outputRoot: path.join(tmpRoot, "out"),
    });
    expect(e.validate(results[0]).ok).toBe(true);

    const bad = e.validate({ schemaVersion: "1.0.0" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(3);
  });

  it("singleton schemaVersion is 1.0.0", () => {
    expect(groundTruthBatchExtractor.schemaVersion).toBe("1.0.0");
  });
});

// ── small helper ────────────────────────────────────────────────────────────

function mkResult(
  fileId: string,
  format: string,
  status: BundleResult["status"],
  durationMs: number,
): BundleResult {
  return {
    fileId,
    sourcePath: "/x" + fileId,
    format,
    status,
    bundleDir: "/x",
    durationMs,
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T00:00:00Z",
    stages: {
      step: { ok: status !== "failed" },
      featureTree: { ok: status === "ok" || status === "partial" },
      dimensionalSig: { ok: status === "ok" },
      screenshots: { ok: status === "ok" },
    },
    errors: [],
  };
}
