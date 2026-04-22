/**
 * camDispatcher CAM AGI wiring tests
 * MILL-MASTER/P1-U06-CAM-AGI-WIRE
 *
 * Verifies cam_agi_route, cam_compare_systems, cam_ensemble actions
 * are registered in camDispatcher ACTIONS enum.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

const CAM_AGI_ACTIONS = [
  "cam_agi_route",
  "cam_compare_systems",
  "cam_ensemble",
] as const;

describe("camDispatcher — CAM AGI Master Orchestrator wiring", () => {
  it("ACTIONS array contains all 3 CAM AGI actions", () => {
    for (const action of CAM_AGI_ACTIONS) {
      expect(ACTIONS).toContain(action);
    }
  });

  it("all CAM AGI actions use snake_case naming", () => {
    for (const action of CAM_AGI_ACTIONS) {
      expect(action).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("all CAM AGI actions start with cam_ prefix", () => {
    for (const action of CAM_AGI_ACTIONS) {
      expect(action.startsWith("cam_")).toBe(true);
    }
  });

  it("no duplicate CAM AGI actions in ACTIONS", () => {
    const agiInActions = ACTIONS.filter(a => CAM_AGI_ACTIONS.includes(a as any));
    const unique = new Set(agiInActions);
    expect(unique.size).toBe(agiInActions.length);
  });

  it("CAM AGI actions count is exactly 3", () => {
    expect(CAM_AGI_ACTIONS.length).toBe(3);
  });
});
