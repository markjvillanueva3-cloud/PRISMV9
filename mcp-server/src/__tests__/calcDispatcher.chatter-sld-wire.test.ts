import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * Round-trip wire test for `chatter_stability_sld` through prism_calc.
 *
 * REGRESSION: this action was declared in the z.enum (~calcDispatcher.ts:736) and had a summary
 * formatter (~:288) but NO exec case, so every call fell through to `default: throw "Unknown
 * calculation action"` -- a dead physics action found by the 2026-07-03 physics-coverage workflow.
 * It is now wired to ChatterStabilityLobeEngine.compute (the core stability-lobe-diagram method).
 * These tests invoke THROUGH the dispatcher (enum -> lazy import -> engine.compute().value), not the
 * singleton, and assert the returned stability lobe diagram is physically valid -- so a broken wire
 * (or a regression back to the dead action) fails loudly.
 */
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }

function calcTool(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  registerCalcDispatcher(server);
  return tools[0];
}

async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}

// Realistic milling SLD scenario: 12mm 4-flute carbide, 40mm overhang, P-steel, 800Hz spindle mode.
function sldParams(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 40, material: "carbide" },
    workpiece: { iso_group: "P" },
    machine: { natural_frequency_hz: 800, damping_ratio: 0.03, stiffness_n_um: 20000, max_rpm: 12000, min_rpm: 500 },
    cutting: { radial_immersion_ratio: 0.5, up_milling: true, cutting_speed_mpm: 150 },
    rpm_range: [2000, 12000],
    rpm_points: 80,
    ...overrides,
  };
}

describe("prism_calc chatter_stability_sld wire (dead-action revival, U-OSC-CHATTER-SLD-WIRE)", () => {
  const calc = calcTool();

  it("routes to the engine and returns an SLD (NOT the dead 'Unknown calculation action' throw)", async () => {
    const r = await call(calc, "chatter_stability_sld", sldParams());
    // The dead action returned an error with no SLD fields; a live one carries the ChatterResult shape.
    expect(Array.isArray(r.lobes)).toBe(true);
    expect(r.lobes.length).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action/);
  });

  it("optimal_rpm is finite, positive, and inside the machine rpm window", async () => {
    const r = await call(calc, "chatter_stability_sld", sldParams());
    expect(Number.isFinite(r.optimal_rpm)).toBe(true);
    expect(r.optimal_rpm).toBeGreaterThan(0);
    expect(r.optimal_rpm).toBeLessThanOrEqual(12000);
  });

  it("max_stable_ap_mm is finite and positive (a stable depth exists)", async () => {
    const r = await call(calc, "chatter_stability_sld", sldParams());
    expect(Number.isFinite(r.max_stable_ap_mm)).toBe(true);
    expect(r.max_stable_ap_mm).toBeGreaterThan(0);
  });

  it("stable_pockets is an array and each pocket has an ascending rpm_range + positive depth", async () => {
    const r = await call(calc, "chatter_stability_sld", sldParams());
    expect(Array.isArray(r.stable_pockets)).toBe(true);
    for (const p of r.stable_pockets) {
      expect(p.rpm_range[0]).toBeLessThanOrEqual(p.rpm_range[1]);
      expect(p.max_ap_mm).toBeGreaterThan(0);
    }
  });

  it("PHYSICS INVARIANT: a stiffer spindle raises (never lowers) the stable depth (a_lim proportional to stiffness)", async () => {
    const soft = await call(calc, "chatter_stability_sld", sldParams({ machine: { natural_frequency_hz: 800, damping_ratio: 0.03, stiffness_n_um: 10000, max_rpm: 12000, min_rpm: 500 } }));
    const stiff = await call(calc, "chatter_stability_sld", sldParams({ machine: { natural_frequency_hz: 800, damping_ratio: 0.03, stiffness_n_um: 40000, max_rpm: 12000, min_rpm: 500 } }));
    // Classical SLD: a_lim = 1/(2*Ks*|Re(FRF)_min|); doubling stiffness lowers |Re(FRF)| -> raises a_lim.
    expect(stiff.max_stable_ap_mm).toBeGreaterThanOrEqual(soft.max_stable_ap_mm);
  });

  it("PHYSICS INVARIANT: more damping raises (never lowers) the stable depth", async () => {
    const low = await call(calc, "chatter_stability_sld", sldParams({ machine: { natural_frequency_hz: 800, damping_ratio: 0.02, stiffness_n_um: 20000, max_rpm: 12000, min_rpm: 500 } }));
    const high = await call(calc, "chatter_stability_sld", sldParams({ machine: { natural_frequency_hz: 800, damping_ratio: 0.08, stiffness_n_um: 20000, max_rpm: 12000, min_rpm: 500 } }));
    expect(high.max_stable_ap_mm).toBeGreaterThanOrEqual(low.max_stable_ap_mm);
  });

  it("sibling chatter_multi_frequency still routes (no collateral regression from the new case)", async () => {
    const r = await call(calc, "chatter_multi_frequency", sldParams());
    expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action/);
    expect(r).toBeTruthy();
  });
});
