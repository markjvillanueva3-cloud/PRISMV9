import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { CAMDriveRecipeEngine } from "../engines/CAMDriveRecipeEngine.js";
import { buildCamDriveDeps } from "../engines/CAMDriveRecipeAdapter.js";
import { CamOutcomeFeedbackAdapterEngine } from "../engines/CamOutcomeFeedbackAdapterEngine.js";

/**
 * Wire-test for the CAM-drive recipe dispatcher actions (CAMDRIVE-RECIPE-ENGINE-MS0).
 * Asserts the 4 actions are in the EXPORTED ACTIONS enum — the real anti-regression,
 * because a MockMCPServer bypasses the z.enum(ACTIONS) gate (so a missing-from-enum
 * action would 9/9-pass a mock dispatch while production is 100% broken — the recurring
 * RGS-TOOL-AUTOINVOKE / false-green class). The engine+adapter behavior is proven by
 * CAMDriveRecipeEngine.test.ts (31) + CAMDriveRecipeAdapter.e2e.test.ts (5).
 */

const RECIPE_ACTIONS = [
  "cam_drive_recipe_compile",
  "cam_drive_recipe_execute",
  "cam_drive_recipe_replay",
  "cam_drive_trace_query",
] as const;

describe("camDispatcher — CAM-drive recipe actions wired", () => {
  it("all 4 recipe actions are registered in the ACTIONS enum", () => {
    for (const a of RECIPE_ACTIONS) expect(ACTIONS).toContain(a);
  });

  it("ACTIONS has no duplicate entries (recipe actions added exactly once)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });

  it("the pre-existing cam_drive_* actions the recipe relies on are still present", () => {
    for (const a of [
      "cam_drive_gate",
      "cam_drive_create_setup",
      "cam_drive_create_operation",
      "cam_drive_assign_tool",
      "cam_drive_generate_toolpath",
      "cam_drive_toolpath_status",
      "cam_drive_post",
    ]) {
      expect(ACTIONS).toContain(a);
    }
  });

  it("the case-body lazy imports resolve to real callables (engine compile/execute/replay + adapter)", () => {
    expect(typeof CAMDriveRecipeEngine.compile).toBe("function");
    expect(typeof CAMDriveRecipeEngine.execute).toBe("function");
    expect(typeof CAMDriveRecipeEngine.replay).toBe("function");
    expect(typeof buildCamDriveDeps).toBe("function");
  });
});

describe("camDispatcher — CAM self-learning loop CONSUMER actions wired (U-CAM-LOOP-WIRE-CONSUMER)", () => {
  it("both loop-consumer actions are registered in the ACTIONS enum", () => {
    // anti-regression: MockMCPServer bypasses z.enum(ACTIONS), so enum membership is
    // the real proof the action is dispatchable in production (not just mock-passing).
    expect(ACTIONS).toContain("cam_outcome_feedback_compute_delta");
    expect(ACTIONS).toContain("cam_self_learning_loop_step");
  });

  it("ACTIONS still has no duplicate entries after adding the loop actions", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });

  it("the schema-adapter the consumer case lazy-imports resolves to a real callable", () => {
    expect(typeof CamOutcomeFeedbackAdapterEngine.busEventsToWireOutcomes).toBe("function");
    expect(typeof CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome).toBe("function");
  });
});
