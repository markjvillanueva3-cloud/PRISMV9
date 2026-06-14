/**
 * through-spindle-coolant (TSC) wiring (U-OSC-SPINDLE-TSC) — calcDispatcher + engine
 * ==================================================================================
 * FIX-1 from the SFC dead-axis triage: `spindle.through_spindle_coolant` was inert for milling
 * (its only live consumer was a drilling-gated ROI advisory). FIX: fold TSC into
 * coolant_effectiveness (MRR-only) for a coolant TYPE that does not already model thru-tool
 * delivery, with a clamp on the compounded factor.
 *
 * Physics-safety invariants pinned here:
 *  1. TSC ON (flood) RAISES MRR (~TSC_EFFECTIVENESS_BONUS) — the named axis now computes.
 *  2. vc/rpm/fz stay CANONICAL (TSC is a delivery/heat-extraction effect, NOT a Kienzle kc change).
 *  3. DOUBLE-COUNT GATE: TSC on `through_tool` (1.25) and `cryogenic` (1.40) is a no-op — those
 *     types already model their own delivery.
 *  4. CLAMP does NOT crush the legitimate cryogenic base (ceiling 1.45 > 1.40): cryogenic still
 *     yields its full ~1.40x MRR vs flood (a 1.08 ceiling would have regressed it).
 *  5. Backward-compatible: a spindle without the flag == TSC off.
 *  6. Reachable through the dispatcher (R15).
 */

import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine, type NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

const BASE = {
  material: { iso_group: "P" as const, name: "AISI 1018" },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" as const },
  toolpath: { operation: "milling" as const, cut_type: "roughing" as const, axial_depth_mm: 6, radial_depth_mm: 4.8 },
  mode: "prism_optimized" as const,
};

function rec(opts: Record<string, unknown>) {
  return speedFeedNineAxisOrchestratorEngine.run({ ...BASE, ...opts } as NineAxisInput).recommendation;
}

describe("through-spindle-coolant wiring (U-OSC-SPINDLE-TSC)", () => {
  const floodOff = rec({ coolant: { type: "flood" }, spindle: { through_spindle_coolant: false } });
  const floodOn = rec({ coolant: { type: "flood" }, spindle: { through_spindle_coolant: true } });

  it("TSC ON raises MRR on flood (the named axis now computes)", () => {
    expect(floodOn.mrr_cm3min).toBeGreaterThan(floodOff.mrr_cm3min);
    // The MRR ratio is the TSC bonus (~1.08), well above rounding noise.
    expect(floodOn.mrr_cm3min / floodOff.mrr_cm3min).toBeGreaterThan(1.05);
    expect(floodOn.mrr_cm3min / floodOff.mrr_cm3min).toBeLessThan(1.12);
  });

  it("TSC leaves vc / rpm / fz CANONICAL (delivery effect, not a cutting-mechanics change)", () => {
    expect(floodOn.cutting_speed_mpm).toBeCloseTo(floodOff.cutting_speed_mpm, 6);
    expect(floodOn.spindle_rpm).toBeCloseTo(floodOff.spindle_rpm, 6);
    expect(floodOn.feed_per_tooth_mm).toBeCloseTo(floodOff.feed_per_tooth_mm, 6);
  });

  it("DOUBLE-COUNT GATE: TSC is a no-op on through_tool (already thru-tool delivery)", () => {
    const ttOff = rec({ coolant: { type: "through_tool" }, spindle: { through_spindle_coolant: false } });
    const ttOn = rec({ coolant: { type: "through_tool" }, spindle: { through_spindle_coolant: true } });
    expect(ttOn.mrr_cm3min).toBeCloseTo(ttOff.mrr_cm3min, 6);
  });

  it("DOUBLE-COUNT GATE: TSC is a no-op on cryogenic", () => {
    const cryoOff = rec({ coolant: { type: "cryogenic" }, spindle: { through_spindle_coolant: false } });
    const cryoOn = rec({ coolant: { type: "cryogenic" }, spindle: { through_spindle_coolant: true } });
    expect(cryoOn.mrr_cm3min).toBeCloseTo(cryoOff.mrr_cm3min, 6);
  });

  it("CLAMP does NOT crush cryogenic — ceiling 1.45 > the 1.40 base (a 1.08 clamp would regress it)", () => {
    const cryo = rec({ coolant: { type: "cryogenic" }, spindle: { through_spindle_coolant: false } });
    // cryogenic (1.40) vs flood (1.00), TSC off both -> MRR ratio must still reflect the full ~1.40,
    // proving the clamp ceiling sits above the legitimate base and did not regress it.
    expect(cryo.mrr_cm3min / floodOff.mrr_cm3min).toBeGreaterThan(1.3);
  });

  it("backward-compatible: spindle without the flag == TSC off", () => {
    const noFlag = rec({ coolant: { type: "flood" }, spindle: {} });
    expect(noFlag.mrr_cm3min).toBeCloseTo(floodOff.mrr_cm3min, 6);
  });
});

describe("through-spindle-coolant wiring — dispatcher round-trip (R15)", () => {
  interface CapturedTool {
    name: string;
    handler: (args: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
  }
  function createMockServer() {
    const tools: CapturedTool[] = [];
    const server = { tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) { tools.push({ name, handler }); } };
    return { server, tools };
  }
  async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown>) {
    const result = await tool.handler({ action, params });
    const r = result as { content?: Array<{ text: string }> };
    const text = r?.content?.[0]?.text;
    return (text ? JSON.parse(text) : result) as Record<string, any>;
  }
  const { server, tools } = createMockServer();
  registerCalcDispatcher(server);
  const calc = tools[0];
  const recOf = (res: Record<string, any>) => res.data?.recommendation ?? res.recommendation;

  it("sfc_nine_axis_run reflects the TSC bonus end-to-end (MRR higher with TSC on flood)", async () => {
    const off = await callAction(calc, "sfc_nine_axis_run", { ...BASE, coolant: { type: "flood" }, spindle: { through_spindle_coolant: false } });
    const on = await callAction(calc, "sfc_nine_axis_run", { ...BASE, coolant: { type: "flood" }, spindle: { through_spindle_coolant: true } });
    const ro = recOf(off);
    const rn = recOf(on);
    expect(ro.mode).toBe("prism_optimized");
    expect(rn.mode).toBe("prism_optimized");
    expect(rn.mrr_cm3min).toBeGreaterThan(ro.mrr_cm3min);
    expect(rn.cutting_speed_mpm).toBeCloseTo(ro.cutting_speed_mpm, 6);
  });
});
