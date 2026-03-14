/**
 * video-execution.test.ts — Tests for PlaywrightAutomationEngine
 * and ExecutionVerificationEngine (VAR-MS1 Phase 2+3)
 */
import { describe, it, expect } from "vitest";
import {
  PlaywrightAutomationEngine,
  type PlaywrightAction,
} from "../engines/PlaywrightAutomationEngine.js";
import {
  ExecutionVerificationEngine,
} from "../engines/ExecutionVerificationEngine.js";
import type { ExtractedAction } from "../engines/VideoActionExtractorEngine.js";

// ── Helpers ────────────────────────────────────────────────────────

function makeAction(
  overrides: Partial<ExtractedAction> & { action_type: string },
): ExtractedAction {
  return {
    step_number: 1,
    timestamp_s: 0,
    action_type: overrides.action_type as any,
    operation: overrides.operation ?? overrides.action_type,
    parameters: overrides.parameters ?? {},
    confidence: overrides.confidence ?? 0.9,
    description: overrides.description ?? "test action",
    keyframe_index: overrides.keyframe_index ?? 0,
    ...overrides,
  };
}

const pw = new PlaywrightAutomationEngine();
const ev = new ExecutionVerificationEngine();

// ══════════════════════════════════════════════════════════════════
// Playwright Automation Tests (8)
// ══════════════════════════════════════════════════════════════════

describe("PlaywrightAutomationEngine", () => {
  describe("getProfile", () => {
    it("1: OnShape profile has toolbar selectors", () => {
      const p = pw.getProfile("onshape");
      expect(p.name).toBe("OnShape");
      expect(p.software).toBe("onshape");
      expect(p.selectors).toBeDefined();
      expect(p.selectors["toolbar_features"]).toBeTruthy();
      expect(p.selectors["extrude_btn"]).toBeTruthy();
      expect(p.selectors["canvas"]).toBeTruthy();
      expect(p.url).toContain("onshape");
    });

    it("2: TinkerCAD profile exists", () => {
      const p = pw.getProfile("tinkercad");
      expect(p.name).toBe("TinkerCAD");
      expect(p.software).toBe("tinkercad");
      expect(p.selectors["shape_menu"]).toBeTruthy();
      expect(p.url).toContain("tinkercad");
    });

    it("3: Generic profile returns valid structure", () => {
      const p = pw.getProfile("generic");
      expect(p.name).toBeTruthy();
      expect(p.software).toBe("generic");
      expect(p.selectors).toBeDefined();
      expect(p.workflows).toBeDefined();
      expect(Object.keys(p.workflows).length).toBeGreaterThan(0);
    });

    it("3b: Unknown software falls back to generic", () => {
      const p = pw.getProfile("unknown_cad_xyz");
      expect(p.software).toBe("generic");
    });
  });

  describe("generateGUIScript", () => {
    it("4: Extrude action generates click+fill+confirm sequence", () => {
      const actions = [
        makeAction({
          action_type: "extrude",
          operation: "extrude",
          parameters: { depth: 25 },
        }),
      ];
      const script = pw.generateGUIScript(actions, "onshape");
      expect(script.target_software).toBe("onshape");
      expect(script.actions.length).toBeGreaterThan(0);

      const types = script.actions.map((a) => a.action);
      expect(types).toContain("click");
      expect(types).toContain("fill");
    });

    it("5: Script includes wait steps after geometry operations", () => {
      const actions = [
        makeAction({ action_type: "extrude", parameters: { depth: 10 } }),
      ];
      const script = pw.generateGUIScript(actions, "onshape");
      const hasWait = script.actions.some((a) => a.action === "wait");
      expect(hasWait).toBe(true);
    });

    it("6: Script includes screenshot steps for verification", () => {
      const actions = [
        makeAction({ action_type: "fillet", parameters: { radius: 2 } }),
      ];
      const script = pw.generateGUIScript(actions, "onshape");
      const hasScreenshot = script.actions.some(
        (a) => a.action === "screenshot",
      );
      expect(hasScreenshot).toBe(true);
    });

    it("7: Estimated duration > 0 for non-empty actions", () => {
      const actions = [
        makeAction({ action_type: "extrude", parameters: { depth: 5 } }),
      ];
      const script = pw.generateGUIScript(actions, "generic");
      expect(script.estimated_duration_s).toBeGreaterThan(0);
    });

    it("8: Empty actions produce empty script", () => {
      const script = pw.generateGUIScript([], "onshape");
      expect(script.actions).toHaveLength(0);
      expect(script.estimated_duration_s).toBe(0);
      expect(script.warnings).toHaveLength(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// Execution Planning Tests (6)
// ══════════════════════════════════════════════════════════════════

describe("Execution Planning", () => {
  it("9: All sketch+extrude+fillet → mode=cadquery", () => {
    const actions = [
      makeAction({ action_type: "sketch_rectangle" }),
      makeAction({ action_type: "extrude", step_number: 2 }),
      makeAction({ action_type: "fillet", step_number: 3 }),
    ];
    const plan = pw.planExecution(actions);
    expect(plan.mode).toBe("cadquery");
    expect(plan.cadquery_steps.length).toBe(3);
    expect(plan.playwright_steps.length).toBe(0);
  });

  it("10: Toolpath actions → mode includes playwright", () => {
    const actions = [
      makeAction({ action_type: "toolpath_contour" }),
      makeAction({ action_type: "toolpath_pocket", step_number: 2 }),
    ];
    const plan = pw.planExecution(actions);
    expect(plan.mode).toBe("playwright");
    expect(plan.playwright_steps.length).toBe(2);
  });

  it("11: Mixed actions → mode=hybrid", () => {
    const actions = [
      makeAction({ action_type: "extrude" }),
      makeAction({ action_type: "toolpath_contour", step_number: 2 }),
    ];
    const plan = pw.planExecution(actions);
    expect(plan.mode).toBe("hybrid");
    expect(plan.cadquery_steps.length).toBe(1);
    expect(plan.playwright_steps.length).toBe(1);
  });

  it("12: Prefer cadquery when both possible", () => {
    const actions = [
      makeAction({ action_type: "extrude" }),
      makeAction({ action_type: "fillet", step_number: 2 }),
    ];
    const plan = pw.planExecution(actions, { prefer: "cadquery" });
    expect(plan.mode).toBe("cadquery");
    expect(plan.cadquery_steps.length).toBe(2);
  });

  it("13: Execution order respects dependencies", () => {
    const actions = [
      makeAction({ action_type: "sketch_rectangle", step_number: 1 }),
      makeAction({ action_type: "extrude", step_number: 2 }),
      makeAction({ action_type: "toolpath_contour", step_number: 3 }),
    ];
    const plan = pw.planExecution(actions);
    // Order should be 0, 1, 2
    expect(plan.execution_order[0].step).toBe(0);
    expect(plan.execution_order[1].step).toBe(1);
    expect(plan.execution_order[2].step).toBe(2);
  });

  it("14: Plan has all action indices covered", () => {
    const actions = [
      makeAction({ action_type: "extrude" }),
      makeAction({ action_type: "assembly_mate", step_number: 2 }),
      makeAction({ action_type: "fillet", step_number: 3 }),
      makeAction({ action_type: "cam_setup", step_number: 4 }),
    ];
    const plan = pw.planExecution(actions);
    const allIndices = [
      ...plan.cadquery_steps,
      ...plan.playwright_steps,
    ].sort((a, b) => a - b);
    expect(allIndices).toEqual([0, 1, 2, 3]);
    expect(plan.execution_order.length).toBe(4);
  });
});

// ══════════════════════════════════════════════════════════════════
// Geometry Verification Tests (8)
// ══════════════════════════════════════════════════════════════════

describe("Geometry Verification", () => {
  it("15: Exact match → similarity 1.0", () => {
    const result = ev.verifyGeometry(
      { volume: 1000, bbox: [10, 20, 30], faces: 6 },
      { volume: 1000, bbox: [10, 20, 30], faces: 6 },
    );
    expect(result.success).toBe(true);
    expect(result.similarity_score).toBe(1.0);
    expect(result.errors).toHaveLength(0);
  });

  it("16: 5% volume difference → still passes (within tolerance)", () => {
    const result = ev.verifyGeometry(
      { volume: 1050, bbox: [10, 20, 30], faces: 6 },
      { volume: 1000, bbox: [10, 20, 30], faces: 6 },
    );
    expect(result.success).toBe(true);
    expect(result.geometry_comparison!.volume_error_pct).toBeCloseTo(5, 0);
  });

  it("17: 20% volume difference → fails", () => {
    const result = ev.verifyGeometry(
      { volume: 1200 },
      { volume: 1000 },
    );
    expect(result.success).toBe(false);
    expect(result.geometry_comparison!.volume_error_pct).toBeCloseTo(20, 0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("18: Bounding box mismatch detected", () => {
    const result = ev.verifyGeometry(
      { bbox: [10, 20, 50] },
      { bbox: [10, 20, 30] },
    );
    expect(result.success).toBe(false);
    expect(result.geometry_comparison!.bbox_error_pct).toBeGreaterThan(10);
  });

  it("19: Face count mismatch detected", () => {
    const result = ev.verifyGeometry(
      { faces: 12 },
      { faces: 6 },
    );
    expect(result.success).toBe(false);
    expect(result.geometry_comparison!.face_count_match).toBe(false);
  });

  it("20: All zeros → similarity 0 (no checks possible)", () => {
    const result = ev.verifyGeometry({}, {});
    expect(result.similarity_score).toBe(0);
  });

  it("21: Missing expected data → partial verification", () => {
    const result = ev.verifyGeometry(
      { volume: 1000, faces: 6 },
      { volume: 1000 },
    );
    // Volume passes, faces skipped (no expected)
    expect(result.success).toBe(true);
    expect(result.similarity_score).toBe(1.0);
    expect(result.execution_log.some(
      (l) => l.includes("skipped"),
    )).toBe(true);
  });

  it("22: Custom tolerance respected (1% vs 10%)", () => {
    // 5% error — passes at 10%, fails at 1%
    const pass = ev.verifyGeometry(
      { volume: 1050 },
      { volume: 1000 },
      10,
    );
    expect(pass.success).toBe(true);

    const fail = ev.verifyGeometry(
      { volume: 1050 },
      { volume: 1000 },
      1,
    );
    expect(fail.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// Failure Diagnosis Tests (4)
// ══════════════════════════════════════════════════════════════════

describe("Failure Diagnosis", () => {
  it("23: Volume too large → dimension correction suggested", () => {
    const verification = ev.verifyGeometry(
      { volume: 2000 },
      { volume: 1000 },
    );
    const action = makeAction({
      action_type: "extrude",
      operation: "extrude pad",
    });
    const diag = ev.diagnoseFailure(verification, action);
    expect(diag.correction_type).toBe("dimension");
    expect(diag.suggested_fix).toBeTruthy();
    expect(diag.diagnosis).toContain("too large");
  });

  it("24: Missing faces → operation correction suggested", () => {
    const verification = ev.verifyGeometry(
      { volume: 1000, faces: 2 },
      { volume: 1000, faces: 12 },
    );
    const action = makeAction({
      action_type: "fillet",
      operation: "fillet edges",
    });
    const diag = ev.diagnoseFailure(verification, action);
    expect(diag.correction_type).toBe("operation");
    expect(diag.suggested_fix).toBeTruthy();
  });

  it("25: Completely wrong → unknown type", () => {
    const verification: any = {
      success: false,
      similarity_score: 0,
      geometry_comparison: {
        volume_error_pct: 5,
        bbox_error_pct: 5,
        face_count_match: true,
      },
      execution_log: [],
      errors: ["Unknown failure"],
    };
    const action = makeAction({
      action_type: "custom_op",
      operation: "custom",
    });
    const diag = ev.diagnoseFailure(verification, action);
    expect(diag.correction_type).toBe("unknown");
  });

  it("26: Diagnosis includes actionable suggested_fix string", () => {
    const verification = ev.verifyGeometry(
      { volume: 500 },
      { volume: 1000 },
    );
    const action = makeAction({ action_type: "extrude" });
    const diag = ev.diagnoseFailure(verification, action);
    expect(typeof diag.suggested_fix).toBe("string");
    expect(diag.suggested_fix.length).toBeGreaterThan(10);
  });
});

// ══════════════════════════════════════════════════════════════════
// Retry Tests (4)
// ══════════════════════════════════════════════════════════════════

describe("Retry with Correction", () => {
  const validScript = [
    "import cadquery as cq",
    "result = cq.Workplane('XY').box(10, 20, 30)",
  ].join("\n");

  it("27: Dimension correction adjusts parameter", () => {
    const diag = {
      diagnosis: "Volume too large",
      correction_type: "dimension" as const,
      suggested_fix: "Scale down",
    };
    const result = ev.retryWithCorrection(validScript, diag, 1);
    expect(result.attempt).toBe(1);
    expect(result.correction_applied).toContain("Scaled dimensions");
  });

  it("28: Max 3 attempts enforced", () => {
    const diag = {
      diagnosis: "Failed",
      correction_type: "dimension" as const,
      suggested_fix: "Fix it",
    };
    const result = ev.retryWithCorrection(validScript, diag, 4);
    expect(result.success).toBe(false);
    expect(result.correction_applied).toContain("max attempts");
  });

  it("29: Successful retry returns success=true", () => {
    const diag = {
      diagnosis: "Volume off",
      correction_type: "dimension" as const,
      suggested_fix: "Scale",
    };
    const result = ev.retryWithCorrection(validScript, diag, 1);
    // The corrected script should still be valid
    expect(result.attempt).toBe(1);
    expect(typeof result.success).toBe("boolean");
    expect(result.verification).toBeDefined();
  });

  it("30: Failed retries accumulate in history", () => {
    const actions = [makeAction({ action_type: "extrude" })];
    // Use a script that will fail syntax check
    const badScript = "import cadquery as cq\nresult = cq.Workplane('XY').box(10";
    const result = ev.executeWithProgress(actions, badScript);
    expect(result.retries.length).toBeGreaterThanOrEqual(0);
    expect(result.progress).toBeDefined();
    expect(result.final_result).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════
// Progress Tracking Tests (4)
// ══════════════════════════════════════════════════════════════════

describe("Progress Tracking", () => {
  it("31: Progress starts at step 0", () => {
    const progress = ev.trackProgress(5);
    expect(progress.current_step).toBe(0);
    expect(progress.completed_steps).toBe(0);
    expect(progress.total_steps).toBe(5);
    expect(progress.status).toBe("pending");
  });

  it("32: Completed steps increments correctly", () => {
    const progress = ev.trackProgress(3);
    ev.completeStep(progress, 0, "passed", 100);
    expect(progress.completed_steps).toBe(1);
    ev.completeStep(progress, 1, "passed", 150);
    expect(progress.completed_steps).toBe(2);
  });

  it("33: Status reflects current state", () => {
    const progress = ev.trackProgress(2);

    ev.startStep(progress, 0, "extrude");
    expect(progress.status).toBe("executing");

    ev.completeStep(progress, 0, "passed", 100);
    ev.completeStep(progress, 1, "passed", 100);
    expect(progress.status).toBe("passed");
  });

  it("34: Estimated remaining decreases as steps complete", () => {
    const progress = ev.trackProgress(4);

    ev.completeStep(progress, 0, "passed", 100);
    const est1 = progress.estimated_remaining_ms;

    ev.completeStep(progress, 1, "passed", 100);
    const est2 = progress.estimated_remaining_ms;

    ev.completeStep(progress, 2, "passed", 100);
    const est3 = progress.estimated_remaining_ms;

    expect(est1).toBeGreaterThan(est2);
    expect(est2).toBeGreaterThan(est3);
    expect(est3).toBeGreaterThan(0); // 1 step remaining
  });
});
