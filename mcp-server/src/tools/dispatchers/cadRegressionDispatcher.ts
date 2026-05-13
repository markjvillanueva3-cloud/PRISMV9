/**
 * prism_cad_regression — CAD Regression Dispatcher (CINF12 / CAD-INFRA-MS0)
 *
 * Surfaces 30 actions across seven CAD-INFRA engines:
 *   (25 fully-qualified engine-named actions + 5 CINF12 spec aliases)
 *   CINF01  CADFileIndexerEngine           (3 actions — index run/diff/load)
 *   CINF02  CADFileClassifierEngine         (2 — classify run/one)
 *   CINF04  CADRegressionTestOrchestrator   (2 — regression run/load)
 *   CINF05  CADTestCheckpointEngine         (3 — checkpoint save/load/resume_diff)
 *   CINF06  CADFailureTriageEngine          (2 — triage one/group)
 *   CINF07  CADArtifactStorageEngine        (3 — artifact write/list/prune)
 *   CINF08  CADRegressionDashboardEngine    (2 — dashboard snapshot/list)
 *   CINF10  CADRegressionResultsAnalyzer    (3 — diff/trend/hotspots)
 *   CINF11  CADRegressionReportGenerator    (5 — render snapshot/diff/trend/hotspots/summary)
 *
 * All engine imports are lazy — dispatcher construction stays cheap.
 *
 * @module tools/dispatchers/cadRegressionDispatcher
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import {
  dispatcherError,
  dispatcherResult,
  validateActionParams,
} from "../../utils/dispatcherMiddleware.js";
import { ACTION_CAD_REGRESSION_SCHEMAS } from "../../schemas/cadRegressionActionSchemas.js";

// ── Lazy engine cache ────────────────────────────────────────────────────────

let _indexer: any;
let _classifier: any;
let _orchestrator: any;
let _checkpoint: any;
let _triage: any;
let _artifact: any;
let _dashboard: any;
let _analyzer: any;
let _report: any;

async function indexer(): Promise<any> {
  return (_indexer ??= (await import("../../engines/CADFileIndexerEngine.js")).cadFileIndexerEngine);
}
async function classifier(): Promise<any> {
  return (_classifier ??= (await import("../../engines/CADFileClassifierEngine.js")).cadFileClassifierEngine);
}
async function orchestrator(): Promise<any> {
  return (_orchestrator ??= (await import("../../engines/CADRegressionTestOrchestratorEngine.js")).cadRegressionTestOrchestratorEngine);
}
// CINF04.x lazy factory — the runner engine is NOT a singleton (each smoke
// call constructs + terminates a fresh pool to bound resource use).
let _runnerFactory: any;
async function runnerFactory(): Promise<any> {
  return (_runnerFactory ??= (await import("../../engines/CADRegressionWorkerThreadRunnerEngine.js")).createCADRegressionWorkerThreadRunner);
}
async function checkpoint(): Promise<any> {
  return (_checkpoint ??= (await import("../../engines/CADTestCheckpointEngine.js")).cadTestCheckpointEngine);
}
async function triage(): Promise<any> {
  return (_triage ??= (await import("../../engines/CADFailureTriageEngine.js")).cadFailureTriageEngine);
}
async function artifact(): Promise<any> {
  return (_artifact ??= (await import("../../engines/CADArtifactStorageEngine.js")).cadArtifactStorageEngine);
}
async function dashboard(): Promise<any> {
  return (_dashboard ??= (await import("../../engines/CADRegressionDashboardEngine.js")).cadRegressionDashboardEngine);
}
async function analyzer(): Promise<any> {
  return (_analyzer ??= (await import("../../engines/CADRegressionResultsAnalyzerEngine.js")).cadRegressionResultsAnalyzerEngine);
}
async function report(): Promise<any> {
  return (_report ??= (await import("../../engines/CADRegressionReportGeneratorEngine.js")).cadRegressionReportGeneratorEngine);
}

// ── Action enum (ordered by engine for anti-regression clarity) ──────────────

export const ACTIONS = [
  // CINF01
  "cad_index_run",
  "cad_index_diff",
  "cad_index_load",
  // CINF02
  "cad_classify_run",
  "cad_classify_one",
  // CINF04
  "cad_regression_run",
  "cad_regression_load",
  // CINF04.x — WorkerThreadRunner smoke (built-in trusted echo-worker; no workerScript over the wire)
  "cad_regression_runner_smoke",
  // CINF05
  "cad_checkpoint_save",
  "cad_checkpoint_load",
  "cad_checkpoint_resume_diff",
  // CINF06
  "cad_failure_triage_one",
  "cad_failure_triage_group",
  // CINF07
  "cad_artifact_write",
  "cad_artifact_list",
  "cad_artifact_prune",
  // CINF08
  "cad_regression_dashboard_snapshot",
  "cad_regression_dashboard_list",
  // CINF10
  "cad_regression_analyzer_diff",
  "cad_regression_analyzer_trend",
  "cad_regression_analyzer_hotspots",
  // CINF11
  "cad_regression_report_snapshot",
  "cad_regression_report_diff",
  "cad_regression_report_trend",
  "cad_regression_report_hotspots",
  "cad_regression_report_summary",
  // CINF12 — spec-named MCP aliases (envelope deliverable: cad_regression.start_batch({corpus:'all'}))
  // Thin facades over existing engines so external MCP clients can use the documented names.
  "start_batch",
  "get_progress",
  "get_results",
  "triage",
  "report",
] as const;

export type CADRegressionAction = (typeof ACTIONS)[number];
const actionEnum = z.enum(ACTIONS);

// ── Route helper (exported for unit testing without MCP registration) ────────

export async function routeCADRegression(action: CADRegressionAction, params: any): Promise<any> {
  switch (action) {
    // CINF01 Indexer — single-method engine (index opts)
    case "cad_index_run":
      return (await indexer()).execute(params);
    case "cad_index_diff":
      return (await indexer()).execute({ ...params, diffOnly: true });
    case "cad_index_load":
      return (await indexer()).execute({ ...params, loadOnly: true });

    // CINF02 Classifier — { files | index, options }
    case "cad_classify_run":
    case "cad_classify_one":
      return (await classifier()).execute(params);

    // CINF04 Orchestrator — { tasks, options }
    case "cad_regression_run":
    case "cad_regression_load":
      return (await orchestrator()).execute(params);

    // CINF04.x WorkerThreadRunner smoke — built-in echo worker (no script over the wire)
    case "cad_regression_runner_smoke": {
      const factory = await runnerFactory();
      // Trusted built-in echo worker — eval source baked into the dispatcher
      // so MCP callers never get to specify worker source code or a script
      // path. The worker echoes whatever status the task carries via
      // `handler` (pass|fail|skip) and respects the runId protocol.
      const TRUSTED_ECHO_WORKER = [
        'const { parentPort } = require("worker_threads");',
        'parentPort.on("message", (msg) => {',
        '  if (!msg || msg.type !== "run") return;',
        '  const handler = msg.task && typeof msg.task.handler === "string" ? msg.task.handler : "pass";',
        '  const errorType = handler === "fail" ? "comparison" : handler === "skip" ? "none" : "none";',
        '  parentPort.postMessage({',
        '    type: "result",',
        '    runId: msg.runId,',
        '    result: {',
        '      fileId: msg.task.fileId,',
        '      status: handler,',
        '      errorType,',
        '      durationMs: 1,',
        '    },',
        '  });',
        "});",
      ].join("\n");
      const runner = factory({
        workerScript: TRUSTED_ECHO_WORKER,
        workerOpts: { eval: true },
        poolSize: params.poolSize ?? 2,
        perTaskTimeoutMs: params.perTaskTimeoutMs ?? 5_000,
      });
      // execute() runs validate() + executeImpl() which sequences through
      // run() per-task and terminates the pool by default.
      return runner.execute({ tasks: params.tasks, terminateAfter: true });
    }

    // CINF05 Checkpoint — op-discriminated (save | load | diff)
    case "cad_checkpoint_save":
      return (await checkpoint()).execute({ op: "save", ...params });
    case "cad_checkpoint_load":
      return (await checkpoint()).execute({ op: "load", ...params });
    case "cad_checkpoint_resume_diff":
      return (await checkpoint()).execute({ op: "diff", ...params });

    // CINF06 FailureTriage — { failure } or { failures }
    case "cad_failure_triage_one":
      return (await triage()).execute({ failure: params });
    case "cad_failure_triage_group":
      return (await triage()).execute(params);

    // CINF07 ArtifactStorage — op: write|list|prune
    case "cad_artifact_write":
      return (await artifact()).execute({ op: "write", ...params });
    case "cad_artifact_list":
      return (await artifact()).execute({ op: "list", ...params });
    case "cad_artifact_prune":
      return (await artifact()).execute({ op: "prune", ...params });

    // CINF08 Dashboard — op: snapshot|list
    case "cad_regression_dashboard_snapshot":
      return (await dashboard()).execute({ op: "snapshot", ...params });
    case "cad_regression_dashboard_list":
      return (await dashboard()).execute({ op: "list", ...params });

    // CINF10 ResultsAnalyzer — op: diff|trend|hotspots
    case "cad_regression_analyzer_diff":
      return (await analyzer()).execute({ op: "diff", ...params });
    case "cad_regression_analyzer_trend":
      return (await analyzer()).execute({ op: "trend", ...params });
    case "cad_regression_analyzer_hotspots":
      return (await analyzer()).execute({ op: "hotspots", ...params });

    // CINF11 ReportGenerator — op: render*
    case "cad_regression_report_snapshot":
      return (await report()).execute({ op: "renderSnapshot", ...params });
    case "cad_regression_report_diff":
      return (await report()).execute({ op: "renderDiff", ...params });
    case "cad_regression_report_trend":
      return (await report()).execute({ op: "renderTrend", ...params });
    case "cad_regression_report_hotspots":
      return (await report()).execute({ op: "renderHotspots", ...params });
    case "cad_regression_report_summary":
      return (await report()).execute({ op: "renderSummary", ...params });

    // CINF12 spec aliases — thin facades for envelope-documented MCP action names.
    // Schemas mirror the engine contract, so these are pure forwarders. The
    // envelope's exit example `start_batch({corpus:'all'})` is aspirational:
    // corpus → FileTask[] auto-resolution belongs to a follow-on unit. MCP
    // clients must still supply {tasks, options} (orchestrator-native) or
    // {failure|failures} (triage-native). Naming sugar, not behavioural change.
    case "start_batch":
      return (await orchestrator()).execute(params);
    case "get_progress":
      return (await dashboard()).execute({ op: "snapshot", ...params });
    case "get_results":
      return (await analyzer()).execute({ op: "trend", ...params });
    case "triage":
      return (await triage()).execute(params);
    case "report":
      return (await report()).execute({ op: "renderSummary", ...params });

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled CAD regression action: ${String(_exhaustive)}`);
    }
  }
}

// ── MCP registration ─────────────────────────────────────────────────────────

export function registerCADRegressionDispatcher(server: any): void {
  server.tool(
    "prism_cad_regression",
    `CAD Regression — index/classify/run/checkpoint/triage/artifact + dashboard, analyzer, reports.
Actions: ${ACTIONS.join(", ")}.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_cad_regression] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_CAD_REGRESSION_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_cad_regression",
        );
      }

      try {
        const result = await routeCADRegression(action as CADRegressionAction, params);
        return dispatcherResult(result);
      } catch (err: any) {
        return dispatcherError(err, action, "prism_cad_regression");
      }
    },
  );
}
