/**
 * IncrementalLearningEngine — Phase 0.19 U-LLM6
 *
 * Nightly orchestrator that turns tracked outcomes into LoRA training
 * jobs. The TypeScript side:
 *   1. Queries `OutcomeTrackingEngine` for records in a window,
 *   2. Filters down to the outcome kinds the trainer actually learns
 *      from (default: "good" + "adjusted" — scraps are counter-examples
 *      handled separately in the Python pipeline),
 *   3. Emits a training manifest JSON to a pending directory on disk,
 *   4. Updates a status log as the job moves pending → running →
 *      succeeded / failed,
 *   5. Optionally shells out to a Python trainer via execFile (stub-
 *      friendly so tests don't need Python installed).
 *
 * What this engine *does not* do: run the actual training. That is
 * `PRISMLoRAAdapterEngine` (U-LLM3) and the companion Python script.
 * This engine just herds inputs, emits a deterministic manifest, and
 * tracks the job lifecycle.
 *
 * @module engines/IncrementalLearningEngine
 * @milestone PP-0.19-U-LLM6
 */

import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  outcomeTrackingEngine,
  type OutcomeKind,
  type OutcomeRecord,
  type OutcomeTrackingEngine,
} from "./OutcomeTrackingEngine.js";

const execFileP = promisify(execFile);
const MANIFEST_SCHEMA_VERSION = 1 as const;

export type JobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export interface TrainingManifestExample {
  programId: string;
  outcome: OutcomeKind;
  notes?: string;
  metrics?: OutcomeRecord["metrics"];
  adjustments?: OutcomeRecord["adjustments"];
  recordedAt: string;
}

export interface TrainingManifest {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  jobId: string;
  createdAt: string;
  windowSinceIso: string | null;
  windowUntilIso: string;
  outcomeKinds: OutcomeKind[];
  baseModel: string;
  adapterName: string;
  examples: TrainingManifestExample[];
}

export interface JobRecord {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  manifestPath: string;
  baseModel: string;
  adapterName: string;
  exampleCount: number;
  error?: string;
  trainerExitCode?: number;
  trainerDurationMs?: number;
}

export interface PrepareOptions {
  baseModel?: string;
  adapterName?: string;
  sinceIso?: string;
  untilIso?: string;
  outcomeKinds?: OutcomeKind[];
  minExamples?: number;
}

export interface PrepareReport {
  ok: boolean;
  job: JobRecord | null;
  manifest: TrainingManifest | null;
  skipped?: "too-few-examples";
  error?: string;
}

export interface RunOptions {
  trainerCommand?: string;
  trainerArgs?: string[];
  timeoutMs?: number;
  /** Dry-run: record status transitions but don't actually invoke the trainer. */
  dryRun?: boolean;
}

export interface RunReport {
  ok: boolean;
  job: JobRecord;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export interface IncrementalLearningDeps {
  tracker?: OutcomeTrackingEngine;
  /** Root under which pending/running/done subdirs live. */
  dataDir?: string;
  /**
   * Injectable runner for unit tests. Defaults to execFile(). Returns
   * { code, stdout, stderr, durationMs }.
   */
  runner?: (
    cmd: string,
    args: string[],
    timeoutMs: number,
  ) => Promise<{ code: number; stdout: string; stderr: string; durationMs: number }>;
  clock?: () => Date;
}

const DEFAULT_OUTCOMES: OutcomeKind[] = ["good", "adjusted"];
const DEFAULT_BASE_MODEL = "qwen2.5-coder:32b";
const DEFAULT_ADAPTER_NAME = "prism-nightly";
const DEFAULT_MIN_EXAMPLES = 10;

export class IncrementalLearningEngine {
  private tracker: OutcomeTrackingEngine;
  private dataDir: string;
  private runner: NonNullable<IncrementalLearningDeps["runner"]>;
  private clock: () => Date;

  constructor(deps: IncrementalLearningDeps = {}) {
    this.tracker = deps.tracker ?? outcomeTrackingEngine;
    this.dataDir =
      deps.dataDir ?? path.resolve(process.cwd(), "data", "lora-training");
    this.runner = deps.runner ?? this.defaultRunner.bind(this);
    this.clock = deps.clock ?? (() => new Date());
  }

  /** Build a training manifest from recent outcomes. */
  async prepareJob(options: PrepareOptions = {}): Promise<PrepareReport> {
    const now = this.clock();
    // Window uses real wall-clock time so it matches the tracker's
    // `recordedAt` (which is always `new Date()` regardless of clock
    // injection). The injected clock is only for jobId/createdAt
    // determinism in tests.
    const untilIso = options.untilIso ?? new Date().toISOString();
    const sinceIso = options.sinceIso ?? null;
    const outcomeKinds = options.outcomeKinds ?? DEFAULT_OUTCOMES;
    const minExamples = options.minExamples ?? DEFAULT_MIN_EXAMPLES;
    const baseModel = options.baseModel ?? DEFAULT_BASE_MODEL;
    const adapterName = options.adapterName ?? DEFAULT_ADAPTER_NAME;

    let rows: OutcomeRecord[];
    try {
      rows = await this.tracker.query({
        outcome: outcomeKinds,
        sinceIso: sinceIso ?? undefined,
        untilIso,
      });
    } catch (e) {
      return {
        ok: false,
        job: null,
        manifest: null,
        error: (e as Error)?.message ?? String(e),
      };
    }

    if (rows.length < minExamples) {
      return {
        ok: true,
        job: null,
        manifest: null,
        skipped: "too-few-examples",
      };
    }

    const jobId = `lora-${now.toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
    const manifest: TrainingManifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      jobId,
      createdAt: now.toISOString(),
      windowSinceIso: sinceIso,
      windowUntilIso: untilIso,
      outcomeKinds,
      baseModel,
      adapterName,
      examples: rows.map((r) => ({
        programId: r.programId,
        outcome: r.outcome,
        notes: r.notes,
        metrics: r.metrics,
        adjustments: r.adjustments,
        recordedAt: r.recordedAt,
      })),
    };

    const manifestPath = await this.writeManifest(jobId, manifest);
    const job: JobRecord = {
      jobId,
      status: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      manifestPath,
      baseModel,
      adapterName,
      exampleCount: rows.length,
    };
    await this.writeJob(job);
    return { ok: true, job, manifest };
  }

  /** Execute a prepared job. Updates status + job record as it runs. */
  async runJob(jobId: string, options: RunOptions = {}): Promise<RunReport> {
    const job = await this.readJob(jobId);
    if (!job) {
      return {
        ok: false,
        job: {
          jobId,
          status: "failed",
          createdAt: this.clock().toISOString(),
          updatedAt: this.clock().toISOString(),
          manifestPath: "",
          baseModel: "",
          adapterName: "",
          exampleCount: 0,
          error: "job not found",
        },
        error: "job not found",
      };
    }
    if (job.status !== "pending") {
      return { ok: false, job, error: `job already ${job.status}` };
    }

    const running: JobRecord = {
      ...job,
      status: "running",
      updatedAt: this.clock().toISOString(),
    };
    await this.writeJob(running);

    if (options.dryRun) {
      const done: JobRecord = {
        ...running,
        status: "succeeded",
        updatedAt: this.clock().toISOString(),
        trainerExitCode: 0,
        trainerDurationMs: 0,
      };
      await this.writeJob(done);
      return { ok: true, job: done };
    }

    const cmd = options.trainerCommand ?? "python";
    const args = options.trainerArgs ?? [
      path.join("scripts", "train_lora.py"),
      "--manifest",
      job.manifestPath,
    ];
    const timeoutMs = options.timeoutMs ?? 60 * 60 * 1000;

    try {
      const result = await this.runner(cmd, args, timeoutMs);
      const status: JobStatus = result.code === 0 ? "succeeded" : "failed";
      const done: JobRecord = {
        ...running,
        status,
        updatedAt: this.clock().toISOString(),
        trainerExitCode: result.code,
        trainerDurationMs: result.durationMs,
        error: status === "failed" ? result.stderr.slice(0, 512) : undefined,
      };
      await this.writeJob(done);
      return {
        ok: status === "succeeded",
        job: done,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (e) {
      const failed: JobRecord = {
        ...running,
        status: "failed",
        updatedAt: this.clock().toISOString(),
        error: (e as Error)?.message ?? String(e),
      };
      await this.writeJob(failed);
      return { ok: false, job: failed, error: failed.error };
    }
  }

  /** Convenience: prepare + run in one call. Skips run when prepare skips. */
  async nightly(
    prep: PrepareOptions = {},
    run: RunOptions = {},
  ): Promise<{ prepare: PrepareReport; run: RunReport | null }> {
    const prepare = await this.prepareJob(prep);
    if (!prepare.ok || !prepare.job) {
      return { prepare, run: null };
    }
    const runReport = await this.runJob(prepare.job.jobId, run);
    return { prepare, run: runReport };
  }

  async listJobs(): Promise<JobRecord[]> {
    const jobsDir = path.join(this.dataDir, "jobs");
    if (!existsSync(jobsDir)) return [];
    const files = await readdir(jobsDir);
    const out: JobRecord[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(jobsDir, f), "utf-8");
        out.push(JSON.parse(raw) as JobRecord);
      } catch {
        // skip corrupt entries
      }
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async readJob(jobId: string): Promise<JobRecord | null> {
    const file = path.join(this.dataDir, "jobs", `${jobId}.json`);
    if (!existsSync(file)) return null;
    try {
      return JSON.parse(await readFile(file, "utf-8")) as JobRecord;
    } catch {
      return null;
    }
  }

  async readManifest(jobId: string): Promise<TrainingManifest | null> {
    const file = path.join(this.dataDir, "manifests", `${jobId}.json`);
    if (!existsSync(file)) return null;
    try {
      return JSON.parse(await readFile(file, "utf-8")) as TrainingManifest;
    } catch {
      return null;
    }
  }

  // ── internals ────────────────────────────────────────────────────────

  private async writeManifest(
    jobId: string,
    manifest: TrainingManifest,
  ): Promise<string> {
    const dir = path.join(this.dataDir, "manifests");
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${jobId}.json`);
    await writeFile(file, JSON.stringify(manifest, null, 2), "utf-8");
    return file;
  }

  private async writeJob(job: JobRecord): Promise<void> {
    const dir = path.join(this.dataDir, "jobs");
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${job.jobId}.json`);
    await writeFile(file, JSON.stringify(job, null, 2), "utf-8");
  }

  private async defaultRunner(
    cmd: string,
    args: string[],
    timeoutMs: number,
  ): Promise<{ code: number; stdout: string; stderr: string; durationMs: number }> {
    const started = Date.now();
    try {
      const { stdout, stderr } = await execFileP(cmd, args, {
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
      });
      return {
        code: 0,
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        durationMs: Date.now() - started,
      };
    } catch (e) {
      const err = e as NodeJS.ErrnoException & {
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        code?: number;
      };
      return {
        code: typeof err.code === "number" ? err.code : 1,
        stdout: (err.stdout ?? "").toString(),
        stderr: (err.stderr ?? err.message ?? "").toString(),
        durationMs: Date.now() - started,
      };
    }
  }
}

export const incrementalLearningEngine = new IncrementalLearningEngine();
