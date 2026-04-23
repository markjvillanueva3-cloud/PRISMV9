/**
 * cadRegressionSafetyHooks.test.ts — U-CINF13 unit tests
 *
 * Covers all 7 CAD-regression safety hooks across blocking/warning/logging
 * tiers, skipped-non-matching-action paths, and the aggregate export.
 */

import { describe, it, expect } from "vitest";
import {
  CAD_REGRESSION_SAFETY_HOOKS,
  cadRegressionBatchIdFormat,
  cadRegressionStateGuard,
  cadRegressionStuckBatchGuard,
  cadRegressionRetryWarning,
  cadRegressionHotspotWarning,
  cadRegressionLifecycleLog,
  cadRegressionArtifactLog,
} from "../hooks/CADRegressionSafetyHooks.js";
import type { HookContext } from "../engines/HookExecutor.js";

function ctx(action: string, data: Record<string, unknown> = {}): HookContext {
  return {
    operation: action,
    phase: "on-tool-call",
    timestamp: new Date(),
    metadata: { action },
    target: { type: "calculation", data },
  } as HookContext;
}

describe("CAD_REGRESSION_SAFETY_HOOKS aggregate", () => {
  it("exposes exactly 7 hook definitions", () => {
    expect(CAD_REGRESSION_SAFETY_HOOKS).toHaveLength(7);
  });

  it("has 3 blocking + 2 warning + 2 logging modes", () => {
    const blocking = CAD_REGRESSION_SAFETY_HOOKS.filter((h) => h.mode === "blocking");
    const warning = CAD_REGRESSION_SAFETY_HOOKS.filter((h) => h.mode === "warning");
    const logging = CAD_REGRESSION_SAFETY_HOOKS.filter((h) => h.mode === "logging");
    expect(blocking.length).toBe(3);
    expect(warning.length).toBe(2);
    expect(logging.length).toBe(2);
  });

  it("all hook ids are unique and non-empty", () => {
    const ids = CAD_REGRESSION_SAFETY_HOOKS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });
});

describe("cadRegressionBatchIdFormat", () => {
  it("skips non-CAD actions silently", () => {
    const r = cadRegressionBatchIdFormat.handler(ctx("lathe_something", {})) as any;
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("passes a valid UUID-shaped batch id", () => {
    const r = cadRegressionBatchIdFormat.handler(
      ctx("cad_regression_run", { batchId: "550e8400-e29b-41d4-a716-446655440000" }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("blocks an empty batch id", () => {
    const r = cadRegressionBatchIdFormat.handler(
      ctx("cad_regression_run", { batchId: "" }),
    ) as any;
    expect(r.blocked).toBe(true);
    expect(r.issues).toBeDefined();
  });

  it("blocks a numeric (non-string) batch id", () => {
    const r = cadRegressionBatchIdFormat.handler(
      ctx("cad_regression_run", { batchId: 42 }),
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("validates both baseBatchId and candidateBatchId on analyzer_diff", () => {
    const r = cadRegressionBatchIdFormat.handler(
      ctx("cad_regression_analyzer_diff", {
        baseBatchId: "good-base-id",
        candidateBatchId: "",
      }),
    ) as any;
    expect(r.blocked).toBe(true);
    expect(r.issues?.some((s: string) => s.startsWith("candidateBatchId"))).toBe(true);
  });

  it("validates array form batchIds", () => {
    const r = cadRegressionBatchIdFormat.handler(
      ctx("cad_regression_analyzer_trend", { batchIds: ["valid-one", "", "another"] }),
    ) as any;
    expect(r.blocked).toBe(true);
  });
});

describe("cadRegressionStateGuard", () => {
  it("skips actions that do not carry inline batch payloads", () => {
    const r = cadRegressionStateGuard.handler(ctx("cad_regression_run", {})) as any;
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("passes when save has no inline batch (engine reads from disk)", () => {
    const r = cadRegressionStateGuard.handler(ctx("cad_checkpoint_save", { batchId: "x" })) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("blocks a batch with wrong schemaVersion", () => {
    const r = cadRegressionStateGuard.handler(
      ctx("cad_checkpoint_save", { batch: { schemaVersion: 2, batchId: "x" } }),
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("blocks when files is an array (must be map)", () => {
    const r = cadRegressionStateGuard.handler(
      ctx("cad_checkpoint_save", { batch: { schemaVersion: 1, batchId: "x", files: [] } }),
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("passes a minimally valid batch", () => {
    const r = cadRegressionStateGuard.handler(
      ctx("cad_failure_triage_group", {
        batch: { schemaVersion: 1, batchId: "x", files: {}, stats: {} },
      }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
  });
});

describe("cadRegressionStuckBatchGuard", () => {
  it("skips non-resume actions", () => {
    const r = cadRegressionStuckBatchGuard.handler(
      ctx("cad_regression_analyzer_diff", {}),
    ) as any;
    expect(r.data?.skipped).toBe(true);
  });

  it("blocks a stale batch older than threshold", () => {
    const oldTs = new Date(Date.now() - 60 * 60_000).toISOString(); // 60 min ago
    const r = cadRegressionStuckBatchGuard.handler(
      ctx("cad_regression_run", { lastCheckpoint: oldTs, stuckThresholdMinutes: 30 }),
    ) as any;
    expect(r.blocked).toBe(true);
    expect(r.data?.ageMin).toBeGreaterThan(30);
  });

  it("passes a fresh batch under threshold", () => {
    const freshTs = new Date(Date.now() - 5 * 60_000).toISOString(); // 5 min ago
    const r = cadRegressionStuckBatchGuard.handler(
      ctx("cad_regression_run", { lastCheckpoint: freshTs, stuckThresholdMinutes: 30 }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("honors the force override flag even for stale batches", () => {
    const oldTs = new Date(Date.now() - 60 * 60_000).toISOString();
    const r = cadRegressionStuckBatchGuard.handler(
      ctx("cad_regression_run", { lastCheckpoint: oldTs, force: true }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("passes silently when no timestamp hint is given", () => {
    const r = cadRegressionStuckBatchGuard.handler(ctx("cad_regression_run", {})) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
  });
});

describe("cadRegressionRetryWarning", () => {
  it("skips non-rerun actions", () => {
    const r = cadRegressionRetryWarning.handler(
      ctx("cad_artifact_write", { retryCount: 99 }),
    ) as any;
    expect(r.data?.skipped).toBe(true);
  });

  it("warns above the recommended retry maximum", () => {
    const r = cadRegressionRetryWarning.handler(
      ctx("cad_regression_run", { retryCount: 5 }),
    ) as any;
    expect(r.warnings?.length).toBeGreaterThan(0);
    expect(r.blocked).toBe(false);
  });

  it("stays quiet within the recommended range", () => {
    const r = cadRegressionRetryWarning.handler(
      ctx("cad_regression_run", { retryCount: 2 }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
  });
});

describe("cadRegressionHotspotWarning", () => {
  it("warns when fileId is in the hotspot list", () => {
    const r = cadRegressionHotspotWarning.handler(
      ctx("cad_failure_triage_one", {
        fileId: "f7",
        hotspotFileIds: ["f1", "f7", "f9"],
      }),
    ) as any;
    expect(r.warnings?.length).toBeGreaterThan(0);
  });

  it("stays silent when fileId is not a hotspot", () => {
    const r = cadRegressionHotspotWarning.handler(
      ctx("cad_failure_triage_one", {
        fileId: "f2",
        hotspotFileIds: ["f1", "f7"],
      }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
  });

  it("skips non-triage actions", () => {
    const r = cadRegressionHotspotWarning.handler(
      ctx("cad_regression_report_summary", { fileId: "f7", hotspotFileIds: ["f7"] }),
    ) as any;
    expect(r.data?.skipped).toBe(true);
  });
});

describe("cadRegressionLifecycleLog", () => {
  it("emits a success envelope for lifecycle actions", () => {
    const r = cadRegressionLifecycleLog.handler(
      ctx("cad_regression_run", { batchId: "abc" }),
    ) as any;
    expect(r.success).toBe(true);
    expect(r.blocked).toBe(false);
    expect((r.data as any).action).toBe("cad_regression_run");
  });

  it("skips non-lifecycle actions", () => {
    const r = cadRegressionLifecycleLog.handler(ctx("cad_artifact_list", {})) as any;
    expect(r.data?.skipped).toBe(true);
  });
});

describe("cadRegressionArtifactLog", () => {
  it("logs artifact writes", () => {
    const r = cadRegressionArtifactLog.handler(
      ctx("cad_artifact_write", { batchId: "b1", fileId: "f1", kind: "diff_png" }),
    ) as any;
    expect(r.success).toBe(true);
    expect((r.data as any).kind).toBe("diff_png");
  });

  it("skips non-artifact-mutating actions", () => {
    const r = cadRegressionArtifactLog.handler(ctx("cad_regression_run", {})) as any;
    expect(r.data?.skipped).toBe(true);
  });
});
