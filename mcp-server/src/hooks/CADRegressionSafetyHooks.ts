/**
 * CAD Regression Safety Hooks — U-CINF13 of CAD-INFRA-MS0 Roadmap
 *
 * 7 CAD-regression-specific hooks guarding the CINF04..CINF11 surface
 * (orchestrator, checkpoint, triage, artifact, dashboard, analyzer, report):
 *
 *   Blocking (3) — CRITICAL correctness gates
 *     1. cad-regression-batch-id-format   — batchId must be non-empty slug/UUID
 *     2. cad-regression-state-guard       — rejects invalid/corrupt TestBatch payloads
 *     3. cad-regression-stuck-batch-guard — blocks on a batch that has not advanced
 *
 *   Warning (2) — quality/attention gates
 *     4. cad-regression-retry-warning     — flags files with excessive retry counters
 *     5. cad-regression-hotspot-warning   — flags recurring-regression-risk files
 *
 *   Logging (2) — audit trail
 *     6. cad-regression-lifecycle-log     — logs batch lifecycle transitions
 *     7. cad-regression-artifact-log      — logs artifact writes (kind + fileId + batch)
 *
 * Hooks fire only on matching action names and otherwise return a skipped
 * success so they do not interfere with unrelated pre-tool traffic.
 *
 * @version 1.0.0
 * @milestone CAD-INFRA-MS0 U-CINF13
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// Helpers
// ============================================================================

const CAD_REGRESSION_ACTIONS = [
  "cad_regression_run",
  "cad_regression_load",
  "cad_checkpoint_save",
  "cad_checkpoint_load",
  "cad_checkpoint_resume_diff",
  "cad_failure_triage_one",
  "cad_failure_triage_group",
  "cad_artifact_write",
  "cad_artifact_list",
  "cad_artifact_prune",
  "cad_regression_dashboard_snapshot",
  "cad_regression_dashboard_list",
  "cad_regression_analyzer_diff",
  "cad_regression_analyzer_trend",
  "cad_regression_analyzer_hotspots",
  "cad_regression_report_snapshot",
  "cad_regression_report_diff",
  "cad_regression_report_trend",
  "cad_regression_report_hotspots",
  "cad_regression_report_summary",
];

function isCadRegressionAction(action: string): boolean {
  return CAD_REGRESSION_ACTIONS.includes(action);
}

// Accepts non-empty slug: alnum + `-` / `_` / `.`; typical UUID-v4 and custom ids both pass.
const BATCH_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/;

function extractParams(ctx: HookContext): Record<string, any> {
  const d = (ctx.target?.data ?? {}) as Record<string, any>;
  return d;
}

// ============================================================================
// BLOCKING (3) — CRITICAL
// ============================================================================

const cadRegressionBatchIdFormat: HookDefinition = {
  id: "cad-regression-batch-id-format",
  name: "CAD Regression Batch ID Format Guard",
  description:
    "Rejects CAD regression actions whose batchId (or equivalent) does not match the required slug/UUID shape. Blocks before state reads hit the filesystem with a malformed key.",
  phase: "on-tool-call",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["cad-regression", "validation", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (!isCadRegressionAction(action)) {
      return hookSuccess(cadRegressionBatchIdFormat, "Not a CAD regression action", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    const candidates: Array<{ key: string; val: unknown }> = [];
    for (const key of ["batchId", "baseBatchId", "candidateBatchId"]) {
      if (d[key] !== undefined) candidates.push({ key, val: d[key] });
    }
    if (Array.isArray(d.batchIds)) {
      d.batchIds.forEach((v: unknown, i: number) =>
        candidates.push({ key: `batchIds[${i}]`, val: v }),
      );
    }

    const bad: string[] = [];
    for (const { key, val } of candidates) {
      if (typeof val !== "string" || !BATCH_ID_RE.test(val)) {
        bad.push(`${key}=${JSON.stringify(val)}`);
      }
    }
    if (bad.length > 0) {
      log.warn(
        `[cad-regression-batch-id-format] BLOCKED: malformed batch id(s): ${bad.join("; ")}`,
      );
      return hookBlock(
        cadRegressionBatchIdFormat,
        `Malformed CAD regression batch id(s): ${bad.join("; ")}`,
        { issues: bad, severity: "critical" },
      );
    }
    return hookSuccess(cadRegressionBatchIdFormat, "Batch id shape OK");
  },
};

const cadRegressionStateGuard: HookDefinition = {
  id: "cad-regression-state-guard",
  name: "CAD Regression State Guard",
  description:
    "Rejects obviously corrupt TestBatch payloads forwarded through checkpoint/triage/load actions. Enforces schemaVersion=1, non-empty stats, and files map shape so downstream engines cannot run on garbage.",
  phase: "on-tool-call",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["cad-regression", "state", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (
      action !== "cad_checkpoint_save" &&
      action !== "cad_failure_triage_group" &&
      action !== "cad_regression_load"
    ) {
      return hookSuccess(cadRegressionStateGuard, "Not a state-carrying action", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    const batch = d.batch ?? d.testBatch ?? null;
    if (batch === null || batch === undefined) {
      // Nothing to check — the engine itself will read state from disk.
      return hookSuccess(cadRegressionStateGuard, "No inline batch payload");
    }
    const issues: string[] = [];
    if (typeof batch !== "object" || Array.isArray(batch)) {
      issues.push("batch is not an object");
    } else {
      const b = batch as Record<string, unknown>;
      if (b.schemaVersion !== 1) issues.push(`schemaVersion=${String(b.schemaVersion)} (expected 1)`);
      if (typeof b.batchId !== "string" || (b.batchId as string).length === 0) {
        issues.push("batchId missing/empty");
      }
      if (b.files !== undefined && (typeof b.files !== "object" || Array.isArray(b.files))) {
        issues.push("files must be an object map");
      }
      if (b.stats !== undefined && (typeof b.stats !== "object" || b.stats === null)) {
        issues.push("stats must be an object");
      }
    }
    if (issues.length > 0) {
      log.warn(`[cad-regression-state-guard] BLOCKED: ${issues.join("; ")}`);
      return hookBlock(
        cadRegressionStateGuard,
        `Corrupt CAD regression state payload: ${issues.join("; ")}`,
        { issues, severity: "critical" },
      );
    }
    return hookSuccess(cadRegressionStateGuard, "State payload shape OK");
  },
};

const cadRegressionStuckBatchGuard: HookDefinition = {
  id: "cad-regression-stuck-batch-guard",
  name: "CAD Regression Stuck-Batch Guard",
  description:
    "Blocks re-issuing a running batch whose lastCheckpoint / lastUpdate is older than the configured stuck threshold (default 30 minutes). Prevents a zombie batch from silently consuming compute.",
  phase: "on-tool-call",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["cad-regression", "stuck", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    // Only guards actions that resume or continue work on an existing batch.
    if (
      action !== "cad_regression_run" &&
      action !== "cad_checkpoint_resume_diff" &&
      action !== "cad_checkpoint_save"
    ) {
      return hookSuccess(cadRegressionStuckBatchGuard, "Not a resume-style action", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    // Allow explicit overrides for operators who know the batch is genuinely live.
    if (d.force === true || d.allowStuck === true) {
      return hookSuccess(cadRegressionStuckBatchGuard, "Override flag set (force/allowStuck)");
    }
    const thresholdMin =
      typeof d.stuckThresholdMinutes === "number" && d.stuckThresholdMinutes > 0
        ? d.stuckThresholdMinutes
        : 30;
    const last = d.lastCheckpoint ?? d.lastUpdate ?? d.lastHeartbeat;
    if (last === undefined || last === null) {
      // Without a timestamp the hook has nothing to prove; pass silently.
      return hookSuccess(cadRegressionStuckBatchGuard, "No lastCheckpoint hint provided");
    }
    const ts = typeof last === "string" ? Date.parse(last) : Number(last);
    if (!Number.isFinite(ts)) {
      return hookSuccess(cadRegressionStuckBatchGuard, "Unparseable lastCheckpoint — skipping", {
        data: { skipped: true },
      });
    }
    const ageMin = (Date.now() - ts) / 60000;
    if (ageMin > thresholdMin) {
      const msg = `Batch has not advanced for ${ageMin.toFixed(1)} min (threshold ${thresholdMin} min)`;
      log.warn(`[cad-regression-stuck-batch-guard] BLOCKED: ${msg}`);
      return hookBlock(cadRegressionStuckBatchGuard, msg, {
        issues: [msg],
        severity: "critical",
        data: { ageMin, thresholdMin },
      });
    }
    return hookSuccess(cadRegressionStuckBatchGuard, "Batch freshness OK", {
      data: { ageMin, thresholdMin },
    });
  },
};

// ============================================================================
// WARNING (2)
// ============================================================================

const cadRegressionRetryWarning: HookDefinition = {
  id: "cad-regression-retry-warning",
  name: "CAD Regression Excessive-Retry Warning",
  description:
    "Warns when a CAD regression file has been retried more than 3 times. Indicates a persistent generator/compare failure that likely needs manual triage rather than another rerun.",
  phase: "on-tool-call",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["cad-regression", "retry", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (action !== "cad_regression_run" && action !== "cad_checkpoint_resume_diff") {
      return hookSuccess(cadRegressionRetryWarning, "Not a rerun action", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    const retry = typeof d.retryCount === "number" ? d.retryCount : null;
    if (retry !== null && retry > 3) {
      const msg = `File retry count ${retry} exceeds recommended max (3) — recommend triage`;
      log.warn(`[cad-regression-retry-warning] ${msg}`);
      return hookWarning(cadRegressionRetryWarning, msg, {
        warnings: [msg],
        data: { retryCount: retry, recommendedMax: 3 },
      });
    }
    return hookSuccess(cadRegressionRetryWarning, "Retry count within normal range");
  },
};

const cadRegressionHotspotWarning: HookDefinition = {
  id: "cad-regression-hotspot-warning",
  name: "CAD Regression Hotspot Warning",
  description:
    "Warns when a file id appears on the analyzer hotspot list — recurring regression risk. Non-blocking signal to prioritise manual review before fresh runs.",
  phase: "on-tool-call",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["cad-regression", "hotspot", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (
      action !== "cad_regression_run" &&
      action !== "cad_failure_triage_one" &&
      action !== "cad_failure_triage_group"
    ) {
      return hookSuccess(cadRegressionHotspotWarning, "Not a triage-style action", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    const hotspots: string[] = Array.isArray(d.hotspotFileIds) ? d.hotspotFileIds : [];
    const file = d.fileId ?? d.failure?.fileId;
    if (typeof file === "string" && hotspots.includes(file)) {
      const msg = `File '${file}' is on the recent hotspot list — recurring regression risk`;
      log.warn(`[cad-regression-hotspot-warning] ${msg}`);
      return hookWarning(cadRegressionHotspotWarning, msg, {
        warnings: [msg],
        data: { fileId: file, hotspots },
      });
    }
    return hookSuccess(cadRegressionHotspotWarning, "Not on hotspot list");
  },
};

// ============================================================================
// LOGGING (2)
// ============================================================================

const cadRegressionLifecycleLog: HookDefinition = {
  id: "cad-regression-lifecycle-log",
  name: "CAD Regression Lifecycle Log",
  description:
    "Audit log for CAD regression batch lifecycle transitions (run/save/load/resume). Never blocks. Emits a structured log entry for each transition to help operator forensics.",
  phase: "on-audit",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["cad-regression", "lifecycle", "log"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (
      action !== "cad_regression_run" &&
      action !== "cad_regression_load" &&
      action !== "cad_checkpoint_save" &&
      action !== "cad_checkpoint_load" &&
      action !== "cad_checkpoint_resume_diff"
    ) {
      return hookSuccess(cadRegressionLifecycleLog, "Not a lifecycle action", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    log.info(
      `[cad-regression-lifecycle-log] action=${action} batchId=${String(d.batchId ?? d.baseBatchId ?? "?")}`,
    );
    return hookSuccess(cadRegressionLifecycleLog, `Lifecycle ${action} logged`, {
      data: { action, batchId: d.batchId ?? d.baseBatchId ?? null },
    });
  },
};

const cadRegressionArtifactLog: HookDefinition = {
  id: "cad-regression-artifact-log",
  name: "CAD Regression Artifact Log",
  description:
    "Audit log for CAD regression artifact writes. Captures (batchId, fileId, kind) tuples so the artifact store remains auditable across sessions.",
  phase: "on-audit",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["cad-regression", "artifact", "log"],
  handler: (ctx: HookContext): HookResult => {
    const action = ((ctx.metadata as any)?.action as string | undefined) ?? (ctx.operation ?? "");
    if (action !== "cad_artifact_write" && action !== "cad_artifact_prune") {
      return hookSuccess(cadRegressionArtifactLog, "Not an artifact mutation", {
        data: { skipped: true },
      });
    }
    const d = extractParams(ctx);
    log.info(
      `[cad-regression-artifact-log] action=${action} batchId=${String(
        d.batchId ?? "?",
      )} fileId=${String(d.fileId ?? "?")} kind=${String(d.kind ?? "?")}`,
    );
    return hookSuccess(cadRegressionArtifactLog, `Artifact ${action} logged`, {
      data: {
        action,
        batchId: d.batchId ?? null,
        fileId: d.fileId ?? null,
        kind: d.kind ?? null,
      },
    });
  },
};

// ============================================================================
// EXPORT — All 7 CAD Regression Safety Hooks
// ============================================================================

export const CAD_REGRESSION_SAFETY_HOOKS: HookDefinition[] = [
  // Blocking (3)
  cadRegressionBatchIdFormat,
  cadRegressionStateGuard,
  cadRegressionStuckBatchGuard,
  // Warning (2)
  cadRegressionRetryWarning,
  cadRegressionHotspotWarning,
  // Logging (2)
  cadRegressionLifecycleLog,
  cadRegressionArtifactLog,
];

export {
  cadRegressionBatchIdFormat,
  cadRegressionStateGuard,
  cadRegressionStuckBatchGuard,
  cadRegressionRetryWarning,
  cadRegressionHotspotWarning,
  cadRegressionLifecycleLog,
  cadRegressionArtifactLog,
};
