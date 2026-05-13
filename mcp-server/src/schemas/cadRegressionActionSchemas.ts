/**
 * CAD Regression Action Schemas — Zod v4
 *
 * Covers 30 actions wired by cadRegressionDispatcher (CINF12) across seven
 * CAD-INFRA engines: Indexer (CINF01), Classifier (CINF02), Orchestrator
 * (CINF04), Checkpoint (CINF05), FailureTriage (CINF06), ArtifactStorage
 * (CINF07), Dashboard (CINF08), ResultsAnalyzer (CINF10), ReportGenerator
 * (CINF11), plus 5 CINF12 spec-named MCP aliases (start_batch, get_progress,
 * get_results, triage, report) that thin-facade onto the engines above.
 *
 * @module schemas/cadRegressionActionSchemas
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── CINF01 CADFileIndexerEngine ──────────────────────────────────────────────
const cad_index_run = z
  .object({ rootDir: z.string().min(1), maxFiles: z.number().int().positive().optional() })
  .passthrough();
const cad_index_diff = z
  .object({ baseRunId: z.string().min(1), candidateRunId: z.string().min(1) })
  .passthrough();
const cad_index_load = z.object({ runId: z.string().min(1) }).passthrough();

// ── CINF02 CADFileClassifierEngine ───────────────────────────────────────────
const cad_classify_run = z.object({ runId: z.string().min(1) }).passthrough();
const cad_classify_one = z
  .object({ filePath: z.string().min(1), fileSize: z.number().nonnegative().optional() })
  .passthrough();

// ── CINF04 CADRegressionTestOrchestratorEngine ───────────────────────────────
const cad_regression_run = z
  .object({
    batchId: z.string().min(1),
    fileIds: z.array(z.string().min(1)).min(1),
    stateDir: z.string().optional(),
  })
  .passthrough();
const cad_regression_load = z
  .object({ batchId: z.string().min(1), stateDir: z.string().optional() })
  .passthrough();

// ── CINF04.x CADRegressionWorkerThreadRunnerEngine — smoke action ────────────
// SECURITY: this action does NOT accept a workerScript path from callers.
// The dispatcher uses a built-in trusted echo-worker (eval source baked into
// the handler) so MCP clients cannot inject arbitrary worker code. The smoke
// action exists to verify the worker-thread pool plumbing end-to-end without
// exposing the production workerScript field over the wire.
const cad_regression_runner_smoke = z
  .object({
    tasks: z
      .array(
        z.object({
          fileId: z.string().min(1).describe("Unique task identifier"),
          absolutePath: z.string().min(1).describe("File path (passed through to worker)"),
          format: z.string().min(1).describe("File format tag, e.g. 'sldprt'"),
          testStrategy: z.string().min(1).describe("Test strategy hint, e.g. 'part-validate'"),
          handler: z
            .enum(["pass", "fail", "skip"])
            .optional()
            .describe("Echo-worker response: pass|fail|skip (default pass)"),
        }),
      )
      .min(1)
      .max(100)
      .describe("Tasks to run through the worker pool (max 100 per smoke call)"),
    poolSize: z
      .number()
      .int()
      .positive()
      .max(16)
      .optional()
      .describe("Worker pool size for smoke run (default 2, max 16 to bound resource use)"),
    perTaskTimeoutMs: z
      .number()
      .positive()
      .max(60_000)
      .optional()
      .describe("Per-task timeout in ms (default 5000, max 60000)"),
  })
  .passthrough();

// ── CINF05 CADTestCheckpointEngine ───────────────────────────────────────────
const cad_checkpoint_save = z
  .object({ batchId: z.string().min(1), stateDir: z.string().optional() })
  .passthrough();
const cad_checkpoint_load = z
  .object({ batchId: z.string().min(1), stateDir: z.string().optional() })
  .passthrough();
const cad_checkpoint_resume_diff = z
  .object({ batchId: z.string().min(1), stateDir: z.string().optional() })
  .passthrough();

// ── CINF06 CADFailureTriageEngine ────────────────────────────────────────────
const cad_failure_triage_one = z
  .object({ fileId: z.string().min(1), errorMessage: z.string().optional() })
  .passthrough();
const cad_failure_triage_group = z
  .object({ batchId: z.string().min(1), stateDir: z.string().optional() })
  .passthrough();

// ── CINF07 CADArtifactStorageEngine ──────────────────────────────────────────
const cad_artifact_write = z
  .object({
    batchId: z.string().min(1),
    fileId: z.string().min(1),
    kind: z.enum(["expected_step", "actual_step", "diff_png", "error_log"]),
    data: z.any(),
    root: z.string().optional(),
  })
  .passthrough();
const cad_artifact_list = z
  .object({ batchId: z.string().min(1), root: z.string().optional() })
  .passthrough();
const cad_artifact_prune = z
  .object({ maxBatches: z.number().int().nonnegative().optional(), root: z.string().optional() })
  .passthrough();

// ── CINF08 CADRegressionDashboardEngine ──────────────────────────────────────
const cad_regression_dashboard_snapshot = z
  .object({
    batchId: z.string().min(1),
    stateDir: z.string().optional(),
    windowMinutes: z.number().positive().optional(),
    recentLimit: z.number().int().positive().optional(),
    now: z.string().optional(),
  })
  .passthrough();
const cad_regression_dashboard_list = z
  .object({ stateDir: z.string().optional() })
  .passthrough();

// ── CINF10 CADRegressionResultsAnalyzerEngine ────────────────────────────────
const cad_regression_analyzer_diff = z
  .object({
    baseBatchId: z.string().min(1),
    candidateBatchId: z.string().min(1),
    stateDir: z.string().optional(),
  })
  .passthrough();
const cad_regression_analyzer_trend = z
  .object({
    batchIds: z.array(z.string().min(1)).min(1),
    stateDir: z.string().optional(),
  })
  .passthrough();
const cad_regression_analyzer_hotspots = z
  .object({
    batchIds: z.array(z.string().min(1)).min(1),
    threshold: z.number().min(0).max(1).optional(),
    minAppearances: z.number().int().positive().optional(),
    stateDir: z.string().optional(),
  })
  .passthrough();

// ── CINF11 CADRegressionReportGeneratorEngine ────────────────────────────────
const cad_regression_report_snapshot = z
  .object({ snapshot: z.any() })
  .passthrough();
const cad_regression_report_diff = z
  .object({ diff: z.any(), rowLimit: z.number().int().positive().optional() })
  .passthrough();
const cad_regression_report_trend = z
  .object({ trend: z.any() })
  .passthrough();
const cad_regression_report_hotspots = z
  .object({ hotspots: z.any() })
  .passthrough();
const cad_regression_report_summary = z
  .object({
    snapshot: z.any().optional(),
    diff: z.any().optional(),
    trend: z.any().optional(),
    hotspots: z.any().optional(),
    rowLimit: z.number().int().positive().optional(),
  })
  .passthrough();

// ── CINF12 — Spec-named MCP aliases ──────────────────────────────────────────
// Thin facades over Orchestrator/Dashboard/Analyzer/Triage/Report so external
// MCP clients can invoke the envelope-documented names. Schemas MIRROR the
// underlying engine contract — these aliases are pure naming sugar, no
// translation. (Envelope-spec `start_batch({corpus:'all'})` corpus auto-
// resolution is intentionally deferred to a follow-on unit.)

// FileTask shape from CADRegressionTestOrchestratorEngine.ts line 57.
const fileTaskSchema = z
  .object({
    fileId: z.string().min(1).describe("Stable hash/ID for the CAD file"),
    absolutePath: z.string().min(1).describe("Full filesystem path"),
    format: z.string().min(1).describe("File format extension (step, iges, sldprt, ipt, ...)"),
    testStrategy: z.string().min(1).optional().describe(
      "Downstream test strategy tag from CADFileClassifierEngine",
    ),
    handler: z.string().optional().describe("Optional bridge/parser hint"),
  })
  .passthrough();

const start_batch = z
  .object({
    tasks: z
      .array(fileTaskSchema)
      .min(1)
      .describe(
        "Required: array of FileTask {fileId, absolutePath, format, testStrategy?, handler?}. Get from cad_index_run output.",
      ),
    options: z
      .object({
        // runner is a live JS object implementing TestRunner.run(task: FileTask): Promise<FileTestResult>.
        // Functions are NOT JSON-serializable, so MCP-wire callers can't supply this until
        // U-CINF04.x (WorkerThreadRunner) ships a server-side default injector. Refined here
        // to actually require a callable `run` member — z.any() alone would accept `undefined`.
        runner: z
          .unknown()
          .refine(
            (v) =>
              v !== null &&
              typeof v === "object" &&
              typeof (v as { run?: unknown }).run === "function",
            { message: "runner must be an object with a callable run(task) method (TestRunner contract)" },
          )
          .describe(
            "TestRunner with run(task) method — live JS object, not JSON-serializable; in-process callers only until U-CINF04.x ships a default injector",
          ),
        batchId: z.string().min(1).optional().describe("Batch identifier; UUID-generated if omitted"),
        workers: z.number().int().positive().optional().describe("Worker pool size"),
        perFileTimeoutMs: z.number().positive().optional().describe("Per-file timeout in ms"),
        checkpointEvery: z.number().int().positive().optional().describe("Checkpoint every N completions"),
        checkpointIntervalMs: z.number().int().positive().optional().describe("Min ms between checkpoints"),
        statePath: z.string().optional().describe("Override TestBatch persistence path"),
      })
      .passthrough()
      .describe("OrchestratorOptions — runner is required"),
  })
  .passthrough();

const get_progress = z
  .object({
    batchId: z.string().min(1).describe("Batch identifier to fetch progress for"),
    stateDir: z.string().optional().describe("Override state directory"),
    windowMinutes: z.number().positive().optional().describe(
      "Throughput window in minutes (clamped server-side to ≤60)",
    ),
    recentLimit: z.number().int().positive().optional().describe(
      "Max recent failures to return (clamped server-side to ≤100)",
    ),
    now: z.string().optional().describe("ISO timestamp override for deterministic tests"),
  })
  .passthrough();

const get_results = z
  .object({
    batchIds: z.array(z.string().min(1)).min(1).describe(
      "Batch identifiers to aggregate results across (≥1)",
    ),
    stateDir: z.string().optional().describe("Override state directory"),
  })
  .passthrough();

// FailurePayload shape from CADFailureTriageEngine.ts line 43.
const failurePayloadSchema = z
  .object({
    fileId: z.string().min(1).describe("Stable file identifier"),
    format: z.string().optional().describe("File extension (e.g. '.sldprt') — hint for format errors"),
    message: z.string().min(1).optional().describe("Error message from the runner"),
    stack: z.string().optional().describe("Full stack trace as single string"),
    timestamp: z.number().nonnegative().optional().describe("Failure timestamp in ms"),
    fileUnreadable: z.boolean().optional().describe("True if file couldn't be read (ENOENT/size=0/EACCES) — strong format-error signal"),
    hint: z.string().optional().describe("Pre-classified runner hint"),
  })
  .passthrough();

// triage accepts either a single failure or an array — mirrors the engine's
// dual-shape contract (cad_failure_triage_one + cad_failure_triage_group).
// Refined (not unioned) because z.any() accepts undefined, which would let
// a discriminated union silently match the wrong branch.
const triage = z
  .object({
    failure: failurePayloadSchema.optional().describe("Single failure payload"),
    failures: z
      .array(failurePayloadSchema)
      .min(1)
      .optional()
      .describe("Array of FailurePayload for batch-triage with grouping"),
  })
  .passthrough()
  .refine(
    (o) => o.failure !== undefined || (Array.isArray(o.failures) && o.failures.length > 0),
    { message: "must provide `failure` (single payload) or `failures` (non-empty array)" },
  );

const report = z
  .object({
    snapshot: z.any().optional().describe("Dashboard snapshot payload to embed"),
    diff: z.any().optional().describe("Regression diff payload to embed"),
    trend: z.any().optional().describe("Trend payload to embed"),
    hotspots: z.any().optional().describe("Hotspots payload to embed"),
    rowLimit: z.number().int().positive().optional().describe(
      "Maximum rows per section in the rendered report",
    ),
  })
  .passthrough();

export const ACTION_CAD_REGRESSION_SCHEMAS: ActionSchemaMap = {
  cad_index_run,
  cad_index_diff,
  cad_index_load,
  cad_classify_run,
  cad_classify_one,
  cad_regression_run,
  cad_regression_load,
  cad_regression_runner_smoke,
  cad_checkpoint_save,
  cad_checkpoint_load,
  cad_checkpoint_resume_diff,
  cad_failure_triage_one,
  cad_failure_triage_group,
  cad_artifact_write,
  cad_artifact_list,
  cad_artifact_prune,
  cad_regression_dashboard_snapshot,
  cad_regression_dashboard_list,
  cad_regression_analyzer_diff,
  cad_regression_analyzer_trend,
  cad_regression_analyzer_hotspots,
  cad_regression_report_snapshot,
  cad_regression_report_diff,
  cad_regression_report_trend,
  cad_regression_report_hotspots,
  cad_regression_report_summary,
  // CINF12 spec aliases
  start_batch,
  get_progress,
  get_results,
  triage,
  report,
};
