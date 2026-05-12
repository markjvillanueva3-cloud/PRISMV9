/**
 * WEDM Learning Hooks Tests — WEDM AGI Phase 3 / P3-MS1
 *
 * Covers U-P3-05 (wedm_learning_trigger) and U-P3-06 (wedm_drift_alert).
 */

import { describe, it, expect } from "vitest";
import type { HookContext, HookResult } from "../../engines/HookExecutor.js";
import {
  wedmLearningTrigger,
  wedmDriftAlert,
  wedmLearningHooks,
} from "../../hooks/WEDMLearningHooks.js";
import { allHooks, hookCounts } from "../../hooks/index.js";
import { wedmContinuousLearningEngine } from "../../engines/WEDMContinuousLearningEngine.js";
import { wedmDriftDetectionEngine } from "../../engines/WEDMDriftDetectionEngine.js";

function runHook(
  hook: { handler: (ctx: HookContext) => Promise<HookResult> | HookResult },
  action: string,
  data: Record<string, unknown>,
): HookResult {
  const ctx: HookContext = {
    operation: "test",
    phase: "post-tool",
    timestamp: new Date(),
    target: { action, data } as HookContext["target"],
  };
  const r = hook.handler(ctx);
  if (r instanceof Promise) throw new Error("Async hooks not expected here");
  return r;
}

describe("WEDM Learning Hooks — registration", () => {
  it("exports exactly 2 learning hooks", () => {
    expect(wedmLearningHooks.length).toBe(2);
  });

  it("both hooks have wedm + learning tags and post-tool phase", () => {
    for (const h of wedmLearningHooks) {
      expect(h.id).toMatch(/^wedm-/);
      expect(h.phase).toBe("post-tool");
      expect(h.enabled).toBe(true);
      expect(h.tags).toContain("wedm");
    }
  });

  it("both hooks are registered in allHooks", () => {
    const ids = allHooks.map((h) => h.id);
    expect(ids).toContain("wedm-learning-trigger");
    expect(ids).toContain("wedm-drift-alert");
  });

  it("hookCounts.wedmLearning === 2", () => {
    expect(hookCounts.wedmLearning).toBe(2);
  });
});

describe("WEDM Learning Hooks — wedm_learning_trigger (U-P3-05)", () => {
  it("skips non-learning actions", () => {
    const r = runHook(wedmLearningTrigger, "cutting_force_estimate", {});
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.skipped).toBe(true);
  });

  it("skips learning actions with no signal in payload", () => {
    const r = runHook(wedmLearningTrigger, "wedm_feedback_submit", {});
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.skipped).toBe(true);
  });

  it("ingests a valid wire-break signal and returns success", () => {
    wedmContinuousLearningEngine.clearAll();
    const r = runHook(wedmLearningTrigger, "wedm_wire_break_event", {
      signal: {
        kind: "wire_break",
        material: "D2",
        wireBreak: { elapsed_life_min: 55 },
      },
    });
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.material).toBe("D2");
    expect(r.data?.kind).toBe("wire_break");
    expect(typeof r.data?.latency_ms).toBe("number");
  });

  it("accepts a flat-shape signal (no `signal` wrapper)", () => {
    wedmContinuousLearningEngine.clearAll();
    const r = runHook(wedmLearningTrigger, "wedm_operator_adjustment_log", {
      kind: "operator_adjustment",
      material: "D2",
      operatorAdjustment: { parameter: "peak_current_A", suggested: 8, actual: 9 },
    });
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.kind).toBe("operator_adjustment");
  });

  it("warns when the learning signal is rejected", () => {
    const r = runHook(wedmLearningTrigger, "wedm_wire_break_event", {
      signal: {
        kind: "wire_break",
        material: "D2",
        wireBreak: { elapsed_life_min: 0 }, // invalid
      },
    });
    expect(r.warnings).toBeDefined();
    expect(r.warnings!.length).toBeGreaterThan(0);
    expect(r.data?.error).toBeDefined();
  });

  it("warns when kind is unsupported", () => {
    const r = runHook(wedmLearningTrigger, "wedm_feedback_submit", {
      signal: { kind: "unknown_kind", material: "D2" },
    });
    expect(r.warnings).toBeDefined();
    expect(r.warnings!.length).toBeGreaterThan(0);
  });
});

describe("WEDM Learning Hooks — wedm_drift_alert (U-P3-06)", () => {
  it("skips non-drift actions", () => {
    const r = runHook(wedmDriftAlert, "cutting_force_estimate", {});
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.skipped).toBe(true);
  });

  it("skips drift actions with no verdicts in payload", () => {
    const r = runHook(wedmDriftAlert, "wedm_drift_check_report", {});
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.skipped).toBe(true);
  });

  it("returns success when no model has drifted", () => {
    // Build a synthetic verdict by running the engine on same-distribution
    // windows so drifted=false.
    const baseline = Array.from({ length: 200 }, (_, i) => Math.sin(i / 10));
    const current = Array.from({ length: 200 }, (_, i) => Math.sin(i / 10 + 0.01));
    const verdict = wedmDriftDetectionEngine.detect({
      modelId: "stable",
      baseline: { label: "b", values: baseline },
      current: { label: "c", values: current },
    });
    const r = runHook(wedmDriftAlert, "wedm_drift_check_report", {
      verdicts: [verdict],
    });
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.drifted).toBe(0);
  });

  it("warns when any verdict has drifted=true", () => {
    const drifted = {
      modelId: "broken",
      severity: "drifting" as const,
      drifted: true,
      psi: 0.35,
      ks: { D: 0.2, criticalAt95: 0.1, exceeds: true },
      pageHinkley: { cusum: 20, fired: true, atIndex: 50 },
      threshold: 0.2,
      summary: "drifting",
      baselineStats: { mean: 0, std: 1, n: 500 },
      currentStats: { mean: 2, std: 1, n: 500 },
    };
    const r = runHook(wedmDriftAlert, "wedm_drift_check_report", {
      verdicts: [drifted],
    });
    expect(r.warnings).toBeDefined();
    expect(r.data?.drifted).toBe(1);
    const models = r.data?.drifted_models as Array<{ modelId: string }>;
    expect(models[0].modelId).toBe("broken");
  });

  it("escalates severe verdicts in the warning message", () => {
    const severe = {
      modelId: "catastrophic",
      severity: "severe" as const,
      drifted: true,
      psi: 0.80,
      ks: { D: 0.3, criticalAt95: 0.1, exceeds: true },
      pageHinkley: { cusum: 40, fired: true, atIndex: 20 },
      threshold: 0.2,
      summary: "severe",
      baselineStats: { mean: 0, std: 1, n: 500 },
      currentStats: { mean: 4, std: 1, n: 500 },
    };
    const r = runHook(wedmDriftAlert, "wedm_drift_check_report", {
      verdicts: [severe],
    });
    expect(r.warnings).toBeDefined();
    expect(r.data?.severe).toBe(1);
    expect(r.message).toContain("Severe drift");
  });

  it("accepts a single `verdict` object (not array)", () => {
    const v = {
      modelId: "single",
      severity: "stable" as const,
      drifted: false,
      psi: 0.02,
      ks: { D: 0.05, criticalAt95: 0.1, exceeds: false },
      pageHinkley: { cusum: 2, fired: false, atIndex: -1 },
      threshold: 0.2,
      summary: "stable",
      baselineStats: { mean: 0, std: 1, n: 500 },
      currentStats: { mean: 0, std: 1, n: 500 },
    };
    const r = runHook(wedmDriftAlert, "wedm_drift_check_report", { verdict: v });
    expect(r.success).toBe(true);
    expect(r.warnings).toBeUndefined();
    expect(r.data?.checked).toBe(1);
  });
});
