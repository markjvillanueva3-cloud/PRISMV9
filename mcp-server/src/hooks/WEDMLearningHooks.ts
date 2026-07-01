/**
 * WEDM Learning Hooks — WEDM AGI Phase 3 / P3-MS1 (U-P3-05, U-P3-06)
 *
 * Two post-tool hooks that wire the WEDM continuous-learning stack into the
 * PRISM hook bus:
 *
 *   1. wedm_learning_trigger (U-P3-05) — routes any learning-signal action
 *      through WEDMContinuousLearningEngine.ingest. Warns when the 30 s
 *      P3-MS1 budget is exceeded or when the underlying signal was rejected.
 *
 *   2. wedm_drift_alert (U-P3-06) — consumes a drift-verdict payload from
 *      WEDMDriftDetectionEngine and raises a warning when any of the three
 *      detectors (PSI ≥ threshold, KS, Page–Hinkley) has fired.
 *
 * These hooks are intentionally stateless — they delegate to the engines
 * which own the learned state. Hook handler failures surface as warnings,
 * never blocks, because the learning loop is advisory.
 *
 * @see WEDMContinuousLearningEngine — P3-MS1/U-P3-01
 * @see WEDMDriftDetectionEngine — P3-MS1/U-P3-02
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";
import {
  wedmContinuousLearningEngine,
  type LearningSignal,
  type LearningIngestResult,
} from "../engines/WEDMContinuousLearningEngine.js";
import type { DriftVerdict } from "../engines/WEDMDriftDetectionEngine.js";

// ============================================================================
// U-P3-05: learning trigger
// ============================================================================

const LEARNING_ACTION_PREFIXES = [
  "wedm_learning",
  "wedm_feedback",
  "wedm_ra_feedback",
  "wedm_time_feedback",
  "wedm_wire_break",
  "wedm_operator_adjustment",
  "wedm_ingest_feedback",
] as const;

function isLearningAction(action: string): boolean {
  return LEARNING_ACTION_PREFIXES.some((p) => action.startsWith(p));
}

function extractSignal(data: Record<string, unknown>): LearningSignal | null {
  if (!data) return null;
  if (data.signal && typeof data.signal === "object") {
    return data.signal as LearningSignal;
  }
  // Allow a flat shape: { kind, material, raTime | wireBreak | operatorAdjustment }
  if (
    typeof data.kind === "string" &&
    typeof data.material === "string"
  ) {
    return data as unknown as LearningSignal;
  }
  return null;
}

const wedmLearningTrigger: HookDefinition = {
  id: "wedm-learning-trigger",
  name: "WEDM Continuous-Learning Trigger",
  description:
    "Post-tool hook that routes WEDM feedback / wire-break / operator adjustment payloads through WEDMContinuousLearningEngine.ingest. Warns if the 30s P3-MS1 budget is exceeded or the signal is rejected.",
  phase: "post-tool",
  category: "automation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["wedm", "learning", "p3-ms1", "continuous"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? ctx.operation ?? "";
    const data = (ctx.target?.data ?? {}) as Record<string, unknown>;

    if (!isLearningAction(action)) {
      return hookSuccess(wedmLearningTrigger, "Not a learning action", {
        data: { skipped: true },
      });
    }

    const signal = extractSignal(data);
    if (!signal) {
      return hookSuccess(wedmLearningTrigger, "No learning signal in payload", {
        data: { skipped: true },
      });
    }

    let result: LearningIngestResult;
    try {
      result = wedmContinuousLearningEngine.ingest(signal);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn?.(`[wedm-learning-trigger] ingest threw for ${signal.material}: ${msg}`);
      return hookWarning(
        wedmLearningTrigger,
        `Learning ingest failed: ${msg}`,
        { data: { material: signal.material, kind: signal.kind, error: msg } },
      );
    }

    if (!result.accepted) {
      const msg = `Learning signal rejected: ${result.summary}`;
      return hookWarning(wedmLearningTrigger, msg, {
        warnings: [msg],
        data: {
          material: result.material,
          kind: result.kind,
          latency_ms: result.latency_ms,
          error: result.error,
        },
      });
    }

    if (!result.withinBudget) {
      const msg = `Learning loop exceeded 30s budget (${result.latency_ms} ms)`;
      return hookWarning(wedmLearningTrigger, msg, {
        warnings: [msg],
        data: {
          material: result.material,
          kind: result.kind,
          latency_ms: result.latency_ms,
        },
      });
    }

    return hookSuccess(wedmLearningTrigger, result.summary, {
      data: {
        material: result.material,
        kind: result.kind,
        latency_ms: result.latency_ms,
      },
    });
  },
};

// ============================================================================
// U-P3-06: drift alert
// ============================================================================

const DRIFT_ACTION_PREFIXES = [
  "wedm_drift_check",
  "wedm_drift_verdict",
  "wedm_learning_report",
  "wedm_model_audit",
] as const;

function isDriftAction(action: string): boolean {
  return DRIFT_ACTION_PREFIXES.some((p) => action.startsWith(p));
}

function extractVerdicts(data: Record<string, unknown>): DriftVerdict[] {
  if (!data) return [];
  if (Array.isArray(data.verdicts)) return data.verdicts as DriftVerdict[];
  if (data.verdict && typeof data.verdict === "object") return [data.verdict as DriftVerdict];
  return [];
}

const wedmDriftAlert: HookDefinition = {
  id: "wedm-drift-alert",
  name: "WEDM Model Drift Alert",
  description:
    "Post-tool hook that scans WEDMDriftDetectionEngine verdicts for any model whose PSI / KS / Page–Hinkley detector fired, raising a warning with the list of drifted models.",
  phase: "post-tool",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["wedm", "drift", "p3-ms1", "model-quality"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? ctx.operation ?? "";
    const data = (ctx.target?.data ?? {}) as Record<string, unknown>;

    if (!isDriftAction(action)) {
      return hookSuccess(wedmDriftAlert, "Not a drift-check action", {
        data: { skipped: true },
      });
    }

    const verdicts = extractVerdicts(data);
    if (verdicts.length === 0) {
      return hookSuccess(wedmDriftAlert, "No drift verdicts in payload", {
        data: { skipped: true },
      });
    }

    const drifted = verdicts.filter((v) => v?.drifted === true);
    if (drifted.length === 0) {
      return hookSuccess(
        wedmDriftAlert,
        `All ${verdicts.length} models within drift tolerance`,
        { data: { checked: verdicts.length, drifted: 0 } },
      );
    }

    const severe = drifted.filter((v) => v.severity === "severe");
    const message =
      severe.length > 0
        ? `Severe drift on ${severe.length} model(s): ${severe.map((v) => v.modelId).join(", ")}`
        : `Drift on ${drifted.length} model(s): ${drifted.map((v) => v.modelId).join(", ")}`;

    log.warn?.(`[wedm-drift-alert] ${message}`);

    return hookWarning(wedmDriftAlert, message, {
      warnings: [message],
      data: {
        checked: verdicts.length,
        drifted: drifted.length,
        severe: severe.length,
        drifted_models: drifted.map((v) => ({
          modelId: v.modelId,
          severity: v.severity,
          psi: v.psi,
          ks_fired: v.ks.exceeds,
          ph_fired: v.pageHinkley.fired,
          summary: v.summary,
        })),
      },
    });
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const wedmLearningHooks: HookDefinition[] = [
  wedmLearningTrigger,
  wedmDriftAlert,
];

export { wedmLearningTrigger, wedmDriftAlert };
