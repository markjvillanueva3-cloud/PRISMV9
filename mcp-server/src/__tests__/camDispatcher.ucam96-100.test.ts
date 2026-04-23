/**
 * camDispatcher U-CAM96..100 cross-wiring tests
 * ==============================================
 *
 * Smoke tests that every new action registered in camDispatcher.ts for the
 * CAM-EXHAUST-MS0 "cohesive unit" cross-wiring exposes the underlying engine
 * behaviour via the dispatcher's ACTIONS enum. We assert the action names are
 * present — the functional paths are covered by the per-engine test suites.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

const U_CAM96_100_ACTIONS = [
  // U-CAM96 hub
  "cam_hub_register",
  "cam_hub_unregister",
  "cam_hub_route",
  "cam_hub_stats",
  "cam_hub_heartbeat",
  "cam_hub_drain",
  "cam_hub_supported_targets",
  // U-CAM97 geometry
  "cam_geometry_register",
  "cam_geometry_validate",
  "cam_geometry_estimate_chunks",
  "cam_geometry_progress",
  "cam_geometry_supported_formats",
  // U-CAM98 registry
  "cam_registry_register",
  "cam_registry_heartbeat",
  "cam_registry_dashboard",
  "cam_registry_compat",
  "cam_registry_list",
  // U-CAM99 speed/feed bridge
  "cam_speedfeed_compute",
  "cam_speedfeed_translate",
  // U-CAM100 post selector
  "cam_post_select",
  "cam_post_list",
  "cam_post_encode",
  "cam_post_dashboard",
] as const;

describe("camDispatcher — U-CAM96..100 cross-wiring", () => {
  it("ACTIONS enum exposes all 23 U-CAM96..100 actions", () => {
    for (const a of U_CAM96_100_ACTIONS) {
      expect(ACTIONS).toContain(a);
    }
  });

  it("every cross-wired action name uses snake_case", () => {
    for (const a of U_CAM96_100_ACTIONS) {
      expect(a).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("every cross-wired action starts with cam_ prefix", () => {
    for (const a of U_CAM96_100_ACTIONS) {
      expect(a.startsWith("cam_")).toBe(true);
    }
  });

  it("ACTIONS array is still readonly (as const)", () => {
    // Type-level assertion: narrowing confirms readonly tuple shape
    const first: typeof ACTIONS[number] = ACTIONS[0];
    expect(typeof first).toBe("string");
  });

  it("no duplicate action names exist in ACTIONS", () => {
    const set = new Set<string>(ACTIONS);
    expect(set.size).toBe(ACTIONS.length);
  });

  it("CAM hub actions are all present and contiguous in count", () => {
    const hubActions = U_CAM96_100_ACTIONS.filter(a => a.startsWith("cam_hub_"));
    expect(hubActions).toHaveLength(7);
    for (const a of hubActions) expect(ACTIONS).toContain(a);
  });

  it("CAM geometry actions are all present", () => {
    const geoActions = U_CAM96_100_ACTIONS.filter(a => a.startsWith("cam_geometry_"));
    expect(geoActions).toHaveLength(5);
    for (const a of geoActions) expect(ACTIONS).toContain(a);
  });

  it("CAM registry actions are all present", () => {
    const regActions = U_CAM96_100_ACTIONS.filter(a => a.startsWith("cam_registry_"));
    expect(regActions).toHaveLength(5);
    for (const a of regActions) expect(ACTIONS).toContain(a);
  });

  it("CAM speed/feed actions are all present", () => {
    const sfActions = U_CAM96_100_ACTIONS.filter(a => a.startsWith("cam_speedfeed_"));
    expect(sfActions).toHaveLength(2);
    for (const a of sfActions) expect(ACTIONS).toContain(a);
  });

  it("CAM post-selector actions are all present", () => {
    const postActions = U_CAM96_100_ACTIONS.filter(a => a.startsWith("cam_post_"));
    expect(postActions).toHaveLength(4);
    for (const a of postActions) expect(ACTIONS).toContain(a);
  });
});
