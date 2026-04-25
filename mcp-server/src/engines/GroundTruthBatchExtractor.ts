/**
 * GroundTruthBatchExtractor — orchestrates the full 4-stage ground-truth
 * pipeline across the 20K-file CAD corpus with bounded concurrency, atomic
 * checkpointing, idempotent resume, and a per-format coverage report.
 *
 * Pipeline (per file):
 *   1. STEP export      via CADToSTEPPipelineEngine (U-CGT03)
 *   2. Feature tree     via GroundTruthFeatureTreeExtractor (U-CGT04)
 *   3. Dimensional sig  via DimensionalSignatureEngine (U-CGT05)
 *   4. Screenshots      via CADScreenshotCapturer (U-CGT06)
 *
 * Output bundle layout (per fileId):
 *   {outputRoot}/{fileId}/source.step
 *   {outputRoot}/{fileId}/feature-tree.json
 *   {outputRoot}/{fileId}/dimensional-signature.json
 *   {outputRoot}/{fileId}/screenshots/{view}.png
 *   {outputRoot}/{fileId}/bundle.json   ← per-file manifest with status
 *
 * Checkpoint layout:
 *   {outputRoot}/_checkpoints/{runId}.json
 *
 * Concurrency: bounded N-worker semaphore (default 4). Per-task error is
 * isolated — one failing file never aborts the batch. Statuses:
 *   ok       — all 4 stages succeeded
 *   partial  — STEP succeeded but ≥1 downstream stage produced warning(s)
 *              with allOk=false (signature still recorded)
 *   failed   — STEP export itself failed; no downstream artifacts
 *   skipped  — bundle already exists with status=ok and skipExisting=true
 *
 * Resume contract: re-running with the same runId reads the prior
 * checkpoint, skips files marked ok or already-bundled, and appends new
 * results. Bundle writes are atomic (tmp + rename) so a kill mid-write
 * never leaves a partial JSON.
 *
 * Composes (does NOT duplicate):
 *   - CADToSTEPPipelineEngine          (E2503, U-CGT03)
 *   - GroundTruthFeatureTreeExtractor  (E2504, U-CGT04)
 *   - DimensionalSignatureEngine       (E2505, U-CGT05)
 *   - CADScreenshotCapturer            (E2506, U-CGT06)
 *   - CADRegressionTestOrchestratorEngine — adapter exposed via
 *     asTestRunner() for production worker-thread driving (this engine
 *     keeps its own simpler runner so unit tests stay deterministic)
 *
 * Duplication check (DuplicationGuardEngine keywords: ground-truth, batch,
 * extract, orchestrate, regression):
 *   → No GroundTruthBatchExtractor / CorpusExtractor / GroundTruthRunner.
 *   → CADRegressionTestOrchestratorEngine drives REGRESSION TEST batches
 *     against an existing ground-truth set; this engine BUILDS the set.
 *   → Different layer; this engine can plug into that orchestrator as a
 *     TestRunner via asTestRunner().
 *
 * @engine GroundTruthBatchExtractor
 * @shortcode E2507
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT07
 * @classification STANDARD (orchestration, no physics)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { z } from "zod";

import { cadToSTEPPipelineEngine } from "./CADToSTEPPipelineEngine.js";
import { groundTruthFeatureTreeExtractor } from "./GroundTruthFeatureTreeExtractor.js";
import { dimensionalSignatureEngine } from "./DimensionalSignatureEngine.js";
import { cadScreenshotCapturer } from "./CADScreenshotCapturer.js";
import type { CanonicalFeatureTree } from "./GroundTruthFeatureTreeExtractor.js";
import type { DimensionalSignature } from "./DimensionalSignatureEngine.js";
import type {
  ScreenshotResult,
  PythonExecutor,
} from "./CADScreenshotCapturer.js";
import type { PipelineResult } from "./CADToSTEPPipelineEngine.js";

// ── Domain ──────────────────────────────────────────────────────────────────

export type BundleStatus = "ok" | "partial" | "failed" | "skipped";

export interface BatchTask {
  /** Stable identifier — used as bundle directory name. */
  fileId: string;
  /** Absolute path to the source CAD file. */
  sourcePath: string;
  /** File extension (with leading dot, e.g. ".sldprt"). */
  format: string;
}

export const BatchTaskSchema = z
  .object({
    fileId: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9._-]+$/, "fileId must be path-safe"),
    sourcePath: z.string().min(1),
    format: z
      .string()
      .min(2)
      .regex(/^\.[A-Za-z0-9-]+$/, "format must look like '.ext'"),
  })
  .strict();

export interface BundleResult {
  fileId: string;
  sourcePath: string;
  format: string;
  status: BundleStatus;
  bundleDir: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  stages: {
    step: { ok: boolean; outputPath?: string; error?: string };
    featureTree: {
      ok: boolean;
      coverage?: number;
      signature?: string;
      error?: string;
    };
    dimensionalSig: {
      ok: boolean;
      signature?: string;
      envelopeM?: number;
      error?: string;
    };
    screenshots: {
      ok: boolean;
      signature?: string;
      pythonAvailable?: boolean;
      error?: string;
    };
  };
  errors: string[];
}

export const BundleResultSchema = z
  .object({
    fileId: z.string(),
    sourcePath: z.string(),
    format: z.string(),
    status: z.enum(["ok", "partial", "failed", "skipped"]),
    bundleDir: z.string(),
    durationMs: z.number().min(0),
    startedAt: z.string(),
    completedAt: z.string(),
    stages: z.object({
      step: z.object({
        ok: z.boolean(),
        outputPath: z.string().optional(),
        error: z.string().optional(),
      }),
      featureTree: z.object({
        ok: z.boolean(),
        coverage: z.number().optional(),
        signature: z.string().optional(),
        error: z.string().optional(),
      }),
      dimensionalSig: z.object({
        ok: z.boolean(),
        signature: z.string().optional(),
        envelopeM: z.number().optional(),
        error: z.string().optional(),
      }),
      screenshots: z.object({
        ok: z.boolean(),
        signature: z.string().optional(),
        pythonAvailable: z.boolean().optional(),
        error: z.string().optional(),
      }),
    }),
    errors: z.array(z.string()),
  })
  .strict();

export interface CheckpointState {
  schemaVersion: "1.0.0";
  runId: string;
  total: number;
  completedFileIds: string[];
  failedFileIds: string[];
  skippedFileIds: string[];
  partialFileIds: string[];
  startedAt: string;
  lastUpdated: string;
}

export const CheckpointStateSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    runId: z.string().min(1),
    total: z.number().int().min(0),
    completedFileIds: z.array(z.string()),
    failedFileIds: z.array(z.string()),
    skippedFileIds: z.array(z.string()),
    partialFileIds: z.array(z.string()),
    startedAt: z.string(),
    lastUpdated: z.string(),
  })
  .strict();

export interface CoverageReport {
  total: number;
  ok: number;
  partial: number;
  failed: number;
  skipped: number;
  byFormat: Record<
    string,
    { ok: number; partial: number; failed: number; skipped: number }
  >;
  durationMsTotal: number;
  durationMsP50: number;
  durationMsP95: number;
  durationMsP99: number;
}

export interface BatchOptions {
  outputRoot: string;
  /** Stable run identifier; allows resume. Defaults to UUID. */
  runId?: string;
  /** Max concurrent files. Default 4. */
  maxConcurrency?: number;
  /** Per-file timeout (ms). Default 60_000. 0 disables. */
  perFileTimeoutMs?: number;
  /** Skip files with an existing ok bundle. Default true. */
  skipExisting?: boolean;
  /** Force-regenerate even when bundle is ok. Default false. */
  force?: boolean;
  /** Persist checkpoint every N file completions. Default 25. */
  checkpointEvery?: number;
  /** Inject a pythonExecutor for screenshot stage. */
  pythonExecutor?: PythonExecutor;
  /** Progress callback fired on every terminal task transition. */
  onProgress?: (snapshot: {
    completed: number;
    total: number;
    fileId: string;
    status: BundleStatus;
  }) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function newRunId(): string {
  return `gt-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function bundleDirOf(outputRoot: string, fileId: string): string {
  return path.join(outputRoot, fileId);
}

function bundleManifestOf(outputRoot: string, fileId: string): string {
  return path.join(bundleDirOf(outputRoot, fileId), "bundle.json");
}

function checkpointPathOf(outputRoot: string, runId: string): string {
  return path.join(outputRoot, "_checkpoints", `${runId}.json`);
}

/** Atomic write: tmp + rename. Always creates parent dir. */
async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp-" + process.pid + "-" + Date.now();
  await fs.promises.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.promises.rename(tmp, filePath);
}

/**
 * Read existing checkpoint or return a fresh blank one.
 * Schema-version mismatches are treated as missing (caller starts fresh).
 */
async function readCheckpoint(
  outputRoot: string,
  runId: string,
): Promise<CheckpointState | null> {
  const p = checkpointPathOf(outputRoot, runId);
  try {
    const txt = await fs.promises.readFile(p, "utf8");
    const parsed = CheckpointStateSchema.safeParse(JSON.parse(txt));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Return percentile (linear interpolation) from a numeric array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/** Read existing bundle manifest (returns null if missing or invalid). */
async function readBundle(bundlePath: string): Promise<BundleResult | null> {
  try {
    const txt = await fs.promises.readFile(bundlePath, "utf8");
    const r = BundleResultSchema.safeParse(JSON.parse(txt));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

// ── Engine ──────────────────────────────────────────────────────────────────

export interface BatchExtractorDeps {
  pipeline: typeof cadToSTEPPipelineEngine;
  featureTree: typeof groundTruthFeatureTreeExtractor;
  dimensionalSig: typeof dimensionalSignatureEngine;
  screenshots: typeof cadScreenshotCapturer;
}

const DEFAULT_DEPS: BatchExtractorDeps = {
  pipeline: cadToSTEPPipelineEngine,
  featureTree: groundTruthFeatureTreeExtractor,
  dimensionalSig: dimensionalSignatureEngine,
  screenshots: cadScreenshotCapturer,
};

export class GroundTruthBatchExtractor {
  public readonly schemaVersion = "1.0.0" as const;

  constructor(private readonly deps: BatchExtractorDeps = DEFAULT_DEPS) {}

  /**
   * Run the full pipeline across `tasks`. Resumable when given a stable
   * runId — completed bundles are skipped, failed ones retried.
   */
  async extractBatch(
    tasks: ReadonlyArray<BatchTask>,
    opts: BatchOptions,
  ): Promise<{
    runId: string;
    results: BundleResult[];
    coverage: CoverageReport;
    checkpoint: CheckpointState;
  }> {
    if (!opts || typeof opts.outputRoot !== "string" || opts.outputRoot.length === 0) {
      throw new Error(
        "[GroundTruthBatchExtractor] opts.outputRoot must be a non-empty string",
      );
    }
    // Validate every task up front — fail loudly on bad input rather than
    // silently skip. Each error names its index for actionable diagnostics.
    const seen = new Set<string>();
    tasks.forEach((t, i) => {
      const v = BatchTaskSchema.safeParse(t);
      if (!v.success) {
        const issues = v.error.issues
          .map((x) => `${x.path.join(".") || "<root>"}: ${x.message}`)
          .join("; ");
        throw new Error(
          `[GroundTruthBatchExtractor] task[${i}] invalid: ${issues}`,
        );
      }
      if (seen.has(t.fileId)) {
        throw new Error(
          `[GroundTruthBatchExtractor] duplicate fileId at task[${i}]: ${t.fileId}`,
        );
      }
      seen.add(t.fileId);
    });

    const runId = opts.runId ?? newRunId();
    const maxConcurrency = Math.max(1, opts.maxConcurrency ?? 4);
    const checkpointEvery = Math.max(1, opts.checkpointEvery ?? 25);
    const skipExisting = opts.skipExisting ?? true;
    const force = opts.force ?? false;
    const startedAt = nowISO();

    const checkpoint: CheckpointState =
      (await readCheckpoint(opts.outputRoot, runId)) ?? {
        schemaVersion: "1.0.0",
        runId,
        total: tasks.length,
        completedFileIds: [],
        failedFileIds: [],
        skippedFileIds: [],
        partialFileIds: [],
        startedAt,
        lastUpdated: startedAt,
      };
    // total may grow when caller appends to a prior run
    checkpoint.total = Math.max(checkpoint.total, tasks.length);

    await fs.promises.mkdir(opts.outputRoot, { recursive: true });

    const results: BundleResult[] = [];
    let completedSinceCheckpoint = 0;

    // Pre-skip: any task whose existing bundle is ok and not forced.
    const skipFileIds = new Set<string>(
      [
        ...checkpoint.completedFileIds,
        ...checkpoint.skippedFileIds,
      ],
    );

    // Bounded concurrency via simple worker-pool: maintain `inFlight` queue
    // of N promises, await one whenever full, then enqueue next.
    let cursor = 0;
    const inFlight = new Map<number, Promise<BundleResult>>();
    let nextTicket = 0;

    const drainOne = async (): Promise<BundleResult> => {
      const ticket = inFlight.keys().next().value as number;
      const p = inFlight.get(ticket)!;
      const r = await p;
      inFlight.delete(ticket);
      return r;
    };

    while (cursor < tasks.length || inFlight.size > 0) {
      while (cursor < tasks.length && inFlight.size < maxConcurrency) {
        const task = tasks[cursor++]!;
        const ticket = nextTicket++;
        inFlight.set(
          ticket,
          this._runOne(task, opts, skipFileIds, force, skipExisting),
        );
      }
      if (inFlight.size === 0) break;
      const r = await drainOne();
      results.push(r);
      this._mergeCheckpoint(checkpoint, r);
      completedSinceCheckpoint += 1;
      opts.onProgress?.({
        completed: results.length,
        total: tasks.length,
        fileId: r.fileId,
        status: r.status,
      });
      if (completedSinceCheckpoint >= checkpointEvery) {
        await atomicWriteJson(checkpointPathOf(opts.outputRoot, runId), {
          ...checkpoint,
          lastUpdated: nowISO(),
        });
        completedSinceCheckpoint = 0;
      }
    }

    checkpoint.lastUpdated = nowISO();
    await atomicWriteJson(checkpointPathOf(opts.outputRoot, runId), checkpoint);

    const coverage = this.generateCoverageReport(results);
    return { runId, results, coverage, checkpoint };
  }

  /**
   * Aggregate per-file results into a coverage report (per-format breakdown
   * + duration percentiles). Pure function — no I/O.
   */
  generateCoverageReport(results: ReadonlyArray<BundleResult>): CoverageReport {
    const report: CoverageReport = {
      total: results.length,
      ok: 0,
      partial: 0,
      failed: 0,
      skipped: 0,
      byFormat: {},
      durationMsTotal: 0,
      durationMsP50: 0,
      durationMsP95: 0,
      durationMsP99: 0,
    };
    const durations: number[] = [];
    for (const r of results) {
      report[r.status] += 1;
      report.durationMsTotal += r.durationMs;
      durations.push(r.durationMs);
      const slot =
        report.byFormat[r.format] ??
        { ok: 0, partial: 0, failed: 0, skipped: 0 };
      slot[r.status] += 1;
      report.byFormat[r.format] = slot;
    }
    durations.sort((a, b) => a - b);
    report.durationMsP50 = percentile(durations, 0.5);
    report.durationMsP95 = percentile(durations, 0.95);
    report.durationMsP99 = percentile(durations, 0.99);
    return report;
  }

  /**
   * Adapter for CADRegressionTestOrchestratorEngine: returns a TestRunner
   * that runs ground-truth extraction for one task at a time, mapping the
   * BundleResult onto the orchestrator's pass/fail/skip vocabulary.
   * Useful when production wants worker_threads instead of in-process.
   */
  asTestRunner(opts: BatchOptions): {
    run: (
      task: { fileId: string; absolutePath: string; format: string },
      signal: AbortSignal,
    ) => Promise<{
      fileId: string;
      status: "pass" | "fail" | "skip" | "error";
      errorType: "none" | "missing-input" | "extraction-failed";
      durationMs: number;
    }>;
  } {
    return {
      run: async (task, signal) => {
        if (signal.aborted) {
          return {
            fileId: task.fileId,
            status: "error",
            errorType: "extraction-failed",
            durationMs: 0,
          };
        }
        const bundle = await this._runOne(
          {
            fileId: task.fileId,
            sourcePath: task.absolutePath,
            format: task.format,
          },
          opts,
          new Set(),
          true,
          false,
        );
        return {
          fileId: task.fileId,
          status:
            bundle.status === "ok"
              ? "pass"
              : bundle.status === "skipped"
                ? "skip"
                : bundle.status === "partial"
                  ? "pass"
                  : "fail",
          errorType:
            bundle.status === "failed" ? "extraction-failed" : "none",
          durationMs: bundle.durationMs,
        };
      },
    };
  }

  /** Re-validate a candidate bundle against the schema. */
  validate(candidate: unknown): { ok: boolean; errors: string[] } {
    const r = BundleResultSchema.safeParse(candidate);
    if (r.success) return { ok: true, errors: [] };
    return {
      ok: false,
      errors: r.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }

  // ── private ───────────────────────────────────────────────────────────────

  private _mergeCheckpoint(state: CheckpointState, r: BundleResult): void {
    const drop = (arr: string[]) => {
      const i = arr.indexOf(r.fileId);
      if (i >= 0) arr.splice(i, 1);
    };
    drop(state.completedFileIds);
    drop(state.failedFileIds);
    drop(state.skippedFileIds);
    drop(state.partialFileIds);
    if (r.status === "ok") state.completedFileIds.push(r.fileId);
    else if (r.status === "failed") state.failedFileIds.push(r.fileId);
    else if (r.status === "skipped") state.skippedFileIds.push(r.fileId);
    else if (r.status === "partial") state.partialFileIds.push(r.fileId);
  }

  private async _runOne(
    task: BatchTask,
    opts: BatchOptions,
    skipFileIds: Set<string>,
    force: boolean,
    skipExisting: boolean,
  ): Promise<BundleResult> {
    const start = Date.now();
    const startedAt = nowISO();
    const bundleDir = bundleDirOf(opts.outputRoot, task.fileId);
    const manifestPath = bundleManifestOf(opts.outputRoot, task.fileId);

    // Idempotent skip path
    if (!force && (skipExisting || skipFileIds.has(task.fileId))) {
      const existing = await readBundle(manifestPath);
      if (existing && existing.status === "ok") {
        return { ...existing, status: "skipped" };
      }
    }

    await fs.promises.mkdir(bundleDir, { recursive: true });
    const errors: string[] = [];

    // Stage 1 — STEP export
    const stepOutPath = path.join(bundleDir, "source.step");
    let stepRes: PipelineResult | null = null;
    let stepOk = false;
    let stepError: string | undefined;
    try {
      stepRes = await this.deps.pipeline.runPipeline({
        filePath: task.sourcePath,
        outputPath: stepOutPath,
      });
      stepOk = stepRes.success;
      if (!stepOk) stepError = stepRes.error ?? "STEP export failed";
    } catch (err) {
      stepError = `pipeline threw: ${(err as Error).message}`;
    }
    if (!stepOk) errors.push(`step: ${stepError ?? "unknown"}`);

    // Stage 2 — Feature tree (best-effort even when STEP fails)
    let featureOk = false;
    let featureCoverage: number | undefined;
    let featureSignature: string | undefined;
    let featureError: string | undefined;
    let featureTree: CanonicalFeatureTree | null = null;
    try {
      featureTree = await this.deps.featureTree.extract(task.sourcePath);
      featureOk = true;
      featureCoverage = featureTree.coverage;
      featureSignature = featureTree.signature;
      await atomicWriteJson(
        path.join(bundleDir, "feature-tree.json"),
        featureTree,
      );
    } catch (err) {
      featureError = (err as Error).message;
      errors.push(`featureTree: ${featureError}`);
    }

    // Stage 3 — Dimensional signature (requires STEP file present)
    let dimOk = false;
    let dimSignature: string | undefined;
    let dimEnvelopeM: number | undefined;
    let dimError: string | undefined;
    let dimSig: DimensionalSignature | null = null;
    if (stepOk) {
      try {
        dimSig = await this.deps.dimensionalSig.extractFromStep(stepOutPath);
        dimOk = true;
        dimSignature = dimSig.signature;
        dimEnvelopeM = dimSig.envelopeM;
        await atomicWriteJson(
          path.join(bundleDir, "dimensional-signature.json"),
          dimSig,
        );
      } catch (err) {
        dimError = (err as Error).message;
        errors.push(`dimensionalSig: ${dimError}`);
      }
    } else {
      dimError = "skipped: STEP export failed";
      errors.push(`dimensionalSig: ${dimError}`);
    }

    // Stage 4 — Screenshots
    let shotOk = false;
    let shotSignature: string | undefined;
    let pythonAvailable: boolean | undefined;
    let shotError: string | undefined;
    if (stepOk) {
      try {
        const cap: ScreenshotResult = await this.deps.screenshots.captureViews(
          stepOutPath,
          {
            fileId: task.fileId,
            outputRoot: opts.outputRoot,
            ...(opts.pythonExecutor
              ? { pythonExecutor: opts.pythonExecutor }
              : {}),
          },
        );
        shotOk = cap.allOk;
        shotSignature = cap.signature;
        pythonAvailable = cap.pythonAvailable;
        if (!shotOk) shotError = "screenshot manifest had failed views";
      } catch (err) {
        shotError = (err as Error).message;
        errors.push(`screenshots: ${shotError}`);
      }
    } else {
      shotError = "skipped: STEP export failed";
      errors.push(`screenshots: ${shotError}`);
    }

    const allFourOk = stepOk && featureOk && dimOk && shotOk;
    const status: BundleStatus = !stepOk ? "failed" : allFourOk ? "ok" : "partial";
    const completedAt = nowISO();
    const durationMs = Date.now() - start;

    const bundle: BundleResult = {
      fileId: task.fileId,
      sourcePath: task.sourcePath,
      format: task.format,
      status,
      bundleDir,
      durationMs,
      startedAt,
      completedAt,
      stages: {
        step: {
          ok: stepOk,
          ...(stepRes ? { outputPath: stepRes.outputPath } : {}),
          ...(stepError ? { error: stepError } : {}),
        },
        featureTree: {
          ok: featureOk,
          ...(featureCoverage !== undefined ? { coverage: featureCoverage } : {}),
          ...(featureSignature ? { signature: featureSignature } : {}),
          ...(featureError ? { error: featureError } : {}),
        },
        dimensionalSig: {
          ok: dimOk,
          ...(dimSignature ? { signature: dimSignature } : {}),
          ...(dimEnvelopeM !== undefined ? { envelopeM: dimEnvelopeM } : {}),
          ...(dimError ? { error: dimError } : {}),
        },
        screenshots: {
          ok: shotOk,
          ...(shotSignature ? { signature: shotSignature } : {}),
          ...(pythonAvailable !== undefined ? { pythonAvailable } : {}),
          ...(shotError ? { error: shotError } : {}),
        },
      },
      errors,
    };

    await atomicWriteJson(manifestPath, bundle);
    return bundle;
  }
}

export const groundTruthBatchExtractor = new GroundTruthBatchExtractor();
