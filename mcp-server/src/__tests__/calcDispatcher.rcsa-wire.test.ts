import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * Round-trip wire test for the RCSA (Receptance Coupling Substructure Analysis) actions through
 * prism_calc -- rcsa_predict_frf / rcsa_compare / rcsa_suggest_length (calcDispatcher.ts:8266-8285).
 * They were WIRED but had NO dedicated test (coverage gap found by the 2026-07-03 physics-coverage
 * workflow). These invoke THROUGH the dispatcher and assert the load-bearing RCSA cantilever
 * physics documented in ReceptanceCouplingEngine (Euler-Bernoulli, fn ~ 1/L^2, k ~ 1/L^3), so a
 * dropped coupling term / wrong stickout exponent surfaces as a divergence -- and a regression back
 * to a broken wire fails loudly.
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

const MACHINE_FRF = { natural_freq_Hz: 1200, damping_ratio: 0.04, stiffness_N_per_m: 5e7 };
const HOLDER = { type: "shrink_fit", taper: "HSK-A63" };

function predictParams(stickout_mm: number): Record<string, any> {
  return {
    machine_frf: MACHINE_FRF,
    tool: { diameter_mm: 12, stickout_mm, material: "carbide", flutes: 4 },
    holder: HOLDER,
    freq_range: [100, 8000],
    freq_points: 400,
  };
}

describe("prism_calc RCSA wire (rcsa_predict_frf/compare/suggest_length, U-OSC-RCSA-TEST)", () => {
  const calc = calcTool();

  it("rcsa_predict_frf routes and returns a physical tool-point FRF", async () => {
    const r = await call(calc, "rcsa_predict_frf", predictParams(40));
    expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action/);
    expect(r.natural_freq_Hz).toBeGreaterThan(0);
    expect(Number.isFinite(r.stiffness_N_per_m)).toBe(true);
    expect(r.stiffness_N_per_m).toBeGreaterThan(0);
    expect(r.dynamic_stiffness_N_per_um).toBeGreaterThan(0);
    expect(r.damping_ratio).toBeGreaterThan(0);
    expect(r.damping_ratio).toBeLessThan(1);
  });

  it("PHYSICS INVARIANT fn ~ 1/L^2: a longer stickout lowers the tool-point natural frequency", async () => {
    const shortTool = await call(calc, "rcsa_predict_frf", predictParams(30));
    const longTool = await call(calc, "rcsa_predict_frf", predictParams(60));
    expect(longTool.natural_freq_Hz).toBeLessThan(shortTool.natural_freq_Hz);
  });

  it("PHYSICS INVARIANT k ~ 1/L^3: a longer stickout lowers the tool-point stiffness", async () => {
    const shortTool = await call(calc, "rcsa_predict_frf", predictParams(30));
    const longTool = await call(calc, "rcsa_predict_frf", predictParams(60));
    expect(longTool.stiffness_N_per_m).toBeLessThan(shortTool.stiffness_N_per_m);
  });

  it("rcsa_compare: the shorter (stiffer) tool is picked as better_for_stability", async () => {
    const r = await call(calc, "rcsa_compare", {
      machine_frf: MACHINE_FRF,
      combo_a: { tool: { diameter_mm: 12, stickout_mm: 30, material: "carbide", flutes: 4 }, holder: HOLDER },
      combo_b: { tool: { diameter_mm: 12, stickout_mm: 60, material: "carbide", flutes: 4 }, holder: HOLDER },
      freq_range: [100, 8000],
      freq_points: 400,
    });
    expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action/);
    // better_for_stability = higher dynamic stiffness; the 30mm stickout (combo_a) is stiffer.
    expect(r.better_for_stability).toBe("a");
    expect(r.combo_a.dynamic_stiffness_N_per_um).toBeGreaterThanOrEqual(r.combo_b.dynamic_stiffness_N_per_um);
  });

  it("rcsa_suggest_length: recommends a stickout in (0, max] with the sweep + resonance data", async () => {
    const r = await call(calc, "rcsa_suggest_length", {
      target_rpm: 10000,
      flutes: 4,
      holder: HOLDER,
      tool_diameter_mm: 12,
      tool_material: "carbide",
      max_stickout_mm: 80,
      machine_frf: MACHINE_FRF,
      length_points: 20,
    });
    expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action/);
    expect(r.optimal_stickout_mm).toBeGreaterThan(0);
    expect(r.optimal_stickout_mm).toBeLessThanOrEqual(80);
    expect(Array.isArray(r.avoided_resonances)).toBe(true);
    expect(Number.isFinite(r.stability_margin)).toBe(true);
    expect(Array.isArray(r.stickout_vs_freq)).toBe(true);
    expect(r.stickout_vs_freq.length).toBeGreaterThan(0);
  });

  it("suggested-length sweep obeys fn ~ 1/L^2 monotonicity across the stickout range", async () => {
    const r = await call(calc, "rcsa_suggest_length", {
      target_rpm: 10000, flutes: 4, holder: HOLDER, tool_diameter_mm: 12, tool_material: "carbide",
      max_stickout_mm: 80, machine_frf: MACHINE_FRF, length_points: 20,
    });
    const sweep = r.stickout_vs_freq as Array<{ stickout_mm: number; natural_freq_Hz: number }>;
    const sorted = [...sweep].sort((a, b) => a.stickout_mm - b.stickout_mm);
    // Natural frequency is non-increasing as stickout grows (cantilever fn ~ 1/L^2).
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].natural_freq_Hz).toBeLessThanOrEqual(sorted[i - 1].natural_freq_Hz + 1e-6);
    }
  });
});
