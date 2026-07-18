/**
 * swiss_guide_bushing_physics_calc — calcDispatcher wiring test
 * =============================================================
 * U-LW-SWISS-GB-WIRE (whiskey, 2026-07-03): fixes a SILENT-STUB wiring.
 *
 * Background: the `swiss_guide_bushing_physics_calc` action was auto-generated
 * by the iter9 wire-unwired-loop as `eng.calculate?(p) ?? eng.analyze?(p) ??
 * eng.run?(p) ?? {note:"method not callable"}`. SwissGuideBushingPhysicsEngine
 * has NONE of calculate/analyze/run — its real methods are recommendMode,
 * recommendClearance, feedLimits, barEndRemnant, thrustBackDrag — so the action
 * ALWAYS returned {success:true, data:{engine, note:"method not callable"}}:
 * a silent stub delivering zero Swiss guide-bushing physics. This test proves
 * the action now round-trips through the REAL engine methods.
 */

import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { swissGuideBushingPhysicsEngine } from "../engines/SwissGuideBushingPhysicsEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}

function createMockServer(): { server: { tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void }; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const r = result as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (result as Record<string, unknown>);
}

// The action returns { success, data:{ method, ...engineOutput } }; slimResponse
// may unwrap. Peel to the physics payload regardless of wrapping.
function payload(res: Record<string, unknown>): Record<string, unknown> {
  let d: Record<string, unknown> = res;
  if (d.data && typeof d.data === "object") d = d.data as Record<string, unknown>;
  return d;
}

const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

// Realistic Swiss part: 12 mm steel bar, L/d = 3 (middle regime), finishing pass.
const BAR = {
  bar_od_mm: 12,
  part_length_mm: 36,
  youngs_modulus_gpa: 200,
  yield_mpa: 350,
  kc_mpa: 1800,
  spindle_rpm: 4000,
  feed_per_rev_mm: 0.05,
  ap_mm: 0.5,
};

describe("swiss_guide_bushing_physics_calc — wiring (silent-stub fix)", () => {
  it("REGRESSION: the old 'method not callable' stub is gone — default returns real physics", async () => {
    const res = await callAction(calc, "swiss_guide_bushing_physics_calc", { ...BAR });
    const d = payload(res);
    // The pre-fix failure mode was literally this note string.
    expect(JSON.stringify(res)).not.toContain("method not callable");
    // recommendMode is the default: real numeric deflections in both modes.
    expect(typeof d.gb_on_deflection_mm).toBe("number");
    expect(typeof d.gb_off_deflection_mm).toBe("number");
    expect(d.gb_on_deflection_mm as number).toBeGreaterThan(0);
    expect(["gb_on", "gb_off"]).toContain(d.mode);
  });

  it("default (recommend_mode) matches the direct engine call exactly (lazy-import parity)", async () => {
    const direct = swissGuideBushingPhysicsEngine.recommendMode(BAR);
    const d = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { ...BAR }));
    expect(d.mode).toBe(direct.mode);
    expect(d.gb_on_deflection_mm as number).toBeCloseTo(direct.gb_on_deflection_mm, 6);
    expect(d.gb_off_deflection_mm as number).toBeCloseTo(direct.gb_off_deflection_mm, 6);
  });

  it("PHYSICS: GB-off (full cantilever, δ∝L³) deflects MORE than GB-on (bushing-supported) for identical inputs", async () => {
    const d = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { ...BAR }));
    expect(d.gb_off_deflection_mm as number).toBeGreaterThan(d.gb_on_deflection_mm as number);
  });

  it("method='clearance' returns a numeric clearance banded within [min_mm, max_mm]", async () => {
    const direct = swissGuideBushingPhysicsEngine.recommendClearance({ bar_od_mm: 12, iso_group: "P" });
    const d = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { method: "clearance", bar_od_mm: 12, iso_group: "P" }));
    expect(d.clearance_mm as number).toBeGreaterThan(0);
    expect(d.clearance_mm as number).toBeGreaterThanOrEqual(d.min_mm as number);
    expect(d.clearance_mm as number).toBeLessThanOrEqual(d.max_mm as number);
    expect(d.clearance_mm as number).toBeCloseTo(direct.clearance_mm, 6); // parity
  });

  it("method='feed_limits' (gb_off) returns a positive beam-bending feed limit for that mode", async () => {
    const d = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { method: "feed_limits", mode: "gb_off", ...BAR }));
    expect(d.mode).toBe("gb_off");
    expect(d.max_feed_per_rev_mm as number).toBeGreaterThan(0);
    expect(d.computed_deflection_mm as number).toBeGreaterThanOrEqual(0);
  });

  it("method='bar_end_remnant': GB-on demands a much longer remnant than GB-off (transfer allowance)", async () => {
    const on = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { method: "bar_end_remnant", mode: "gb_on", bar_od_mm: 12 }));
    const off = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { method: "bar_end_remnant", mode: "gb_off", bar_od_mm: 12 }));
    expect(on.min_remnant_mm as number).toBeGreaterThan(off.min_remnant_mm as number);
    expect(off.min_remnant_mm as number).toBe(20); // GB-off collet-face clearance floor
  });

  it("method='thrust_back_drag': GB-on generates bushing friction drag; GB-off is drag-free", async () => {
    const on = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { method: "thrust_back_drag", mode: "gb_on", ...BAR }));
    const off = payload(await callAction(calc, "swiss_guide_bushing_physics_calc", { method: "thrust_back_drag", mode: "gb_off", ...BAR }));
    expect(on.friction_drag_N as number).toBeGreaterThan(0);
    expect(off.friction_drag_N as number).toBe(0);
    expect(on.net_feed_scaling as number).toBeLessThanOrEqual(1);
  });

  it("invalid bar_od_mm (0) is REJECTED (engine throws) — not a silent success stub", async () => {
    const res = await callAction(calc, "swiss_guide_bushing_physics_calc", { ...BAR, bar_od_mm: 0 });
    const ok = res.success === true && !("error" in res) && !JSON.stringify(res).includes("must be >0");
    expect(ok).toBe(false);
  });
});
