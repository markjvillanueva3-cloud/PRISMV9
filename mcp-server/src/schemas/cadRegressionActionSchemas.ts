/**
 * CAD Regression Action Schemas — Zod v4
 *
 * Covers 20 actions wired by cadRegressionDispatcher (CINF12) across seven
 * CAD-INFRA engines: Indexer (CINF01), Classifier (CINF02), Orchestrator
 * (CINF04), Checkpoint (CINF05), FailureTriage (CINF06), ArtifactStorage
 * (CINF07), Dashboard (CINF08), ResultsAnalyzer (CINF10), ReportGenerator
 * (CINF11).
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

export const ACTION_CAD_REGRESSION_SCHEMAS: ActionSchemaMap = {
  cad_index_run,
  cad_index_diff,
  cad_index_load,
  cad_classify_run,
  cad_classify_one,
  cad_regression_run,
  cad_regression_load,
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
};
