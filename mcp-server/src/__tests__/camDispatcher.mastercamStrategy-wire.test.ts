/**
 * E2E wire test: CAMX-MS3 U01 mastercam_strategy_* actions through camDispatcher.
 * ===========================================================================
 * The 6 mastercam_strategy_* actions previously called engine methods that did
 * not exist (runtime "is not a function" crashes; audit-dispatcher-engine-methods
 * MISSING). This test proves, through the REGISTERED dispatcher (not the engine in
 * isolation), that:
 *   1. valid params reach the engine and return a real structured result, and
 *   2. malformed params are REJECTED by the now-registered camxMs3U01ActionSchemas
 *      (structured "Invalid params" error) -- NOT a thrown engine TypeError.
 * Without the schema registration in MERGED_CAM_SCHEMAS, validation fail-opens and
 * a missing material.iso_group crashes the engine -- the exact gap the per-file
 * scrutiny surfaced.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS, registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
let capturedHandler: Handler | null = null;
const fakeServer = {
  tool: (_name: string, _desc: string, _schema: unknown, handler: Handler) => {
    capturedHandler = handler;
  },
};
registerCamDispatcher(fakeServer);
if (!capturedHandler) throw new Error("camDispatcher did not register handler");
const camDispatcher = capturedHandler;

const callCam = async (action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const raw = await camDispatcher({ action, params });
  const r = raw as { content?: Array<{ text: string }> };
  if (r.content?.[0]?.text) return JSON.parse(r.content[0].text);
  return raw as Record<string, unknown>;
};

const STRATEGY_ACTIONS = [
  "mastercam_strategy_recommend",
  "mastercam_strategy_params",
  "mastercam_strategy_dynamic_motion",
  "mastercam_strategy_optirough",
  "mastercam_strategy_profit_turning",
  "mastercam_strategy_list",
];

describe("camDispatcher -- mastercam_strategy_* action enum", () => {
  it("registers all 6 CAMX-MS3 U01 strategy actions in the ACTIONS enum", () => {
    for (const a of STRATEGY_ACTIONS) expect(ACTIONS).toContain(a);
  });
});

describe("camDispatcher -- mastercam_strategy_* valid round-trips reach the engine", () => {
  it("mastercam_strategy_recommend returns a real recommendation for a valid pocket job", async () => {
    const res = await callCam("mastercam_strategy_recommend", {
      feature: { type: "pocket", depth_mm: 12 },
      material: { iso_group: "P" },
      machine: { type: "3axis_vertical" },
      tool: { diameter_mm: 10, flute_count: 4, type: "endmill" },
      priority: "balanced",
    });
    // Engine method was reached (no "is not a function"): real result fields present.
    expect(JSON.stringify(res)).not.toMatch(/is not a function/);
    expect(JSON.stringify(res)).toContain("pocketing");
  });

  it("mastercam_strategy_dynamic_motion returns the Dynamic Motion deep-dive", async () => {
    const res = await callCam("mastercam_strategy_dynamic_motion", {});
    expect(JSON.stringify(res)).toContain("Dynamic Motion");
  });

  it("mastercam_strategy_list returns the strategy catalog", async () => {
    const res = await callCam("mastercam_strategy_list", {});
    expect(JSON.stringify(res)).not.toMatch(/is not a function/);
    expect(JSON.stringify(res)).toContain("strategies");
  });
});

describe("camDispatcher -- mastercam_strategy_recommend schema validation (the wire that was missing)", () => {
  it("rejects a call with missing material (would crash the engine if unvalidated)", async () => {
    const res = await callCam("mastercam_strategy_recommend", {
      feature: { type: "pocket" },
      tool: { diameter_mm: 10, flute_count: 4, type: "endmill" },
      // material omitted -> materialZ.iso_group required -> must be rejected at the boundary
    });
    expect(JSON.stringify(res)).toMatch(/Invalid params/i);
    // and crucially NOT a raw engine TypeError leaking through
    expect(JSON.stringify(res)).not.toMatch(/is not a function|Cannot read propert/);
  });

  it("rejects a call with a malformed iso_group enum value", async () => {
    const res = await callCam("mastercam_strategy_recommend", {
      feature: { type: "pocket" },
      material: { iso_group: "Z" }, // not in P|M|K|N|S|H
      tool: { diameter_mm: 10, flute_count: 4, type: "endmill" },
    });
    expect(JSON.stringify(res)).toMatch(/Invalid params/i);
  });
});
