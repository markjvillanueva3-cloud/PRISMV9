import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * Round-trip wire test for `thermal_wear_coupling` (ThermalWearCouplingEngine.analyze,
 * calcDispatcher.ts:6807) through prism_calc. The engine models the coupled thermal-wear positive
 * feedback loop (Usui wear + thermal balance + deflection, RK4) but had NO dedicated test -- a
 * coverage gap in two of the operator's named physics families (thermodynamics + tool wear), found
 * by the 2026-07-03 physics-coverage workflow. These invoke THROUGH the dispatcher with
 * mc_samples=0 (the DETERMINISTIC trajectory -- no Math.random, so the test is reproducible) and
 * assert the load-bearing coupling behavior, so a broken RK4 step / wrong Usui exponent / decoupled
 * temperature diverges.
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

function couplingParams(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    cutting_speed_m_min: 150,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2.0,
    initial_force_N: 800,
    tool_diameter_mm: 12,
    tool_overhang_mm: 40,
    wear_limit_mm: 0.3,
    simulation_time_min: 30,
    mc_samples: 0, // deterministic trajectory only -> reproducible (no Math.random path)
    ...overrides,
  };
}

describe("prism_calc thermal_wear_coupling wire (U-OSC-THERMAL-WEAR-TEST)", () => {
  const calc = calcTool();

  it("routes to the engine and returns a coupled trajectory (not the dead-action throw)", async () => {
    const r = await call(calc, "thermal_wear_coupling", couplingParams());
    expect(JSON.stringify(r).slice(0, 4000)).not.toMatch(/Unknown calculation action/);
    expect(Array.isArray(r.trajectory)).toBe(true);
    expect(r.trajectory.length).toBeGreaterThan(1);
    expect(Number.isFinite(r.max_temp_C)).toBe(true);
  });

  it("is DETERMINISTIC with mc_samples=0 (same inputs -> identical trajectory endpoints)", async () => {
    const a = await call(calc, "thermal_wear_coupling", couplingParams());
    const b = await call(calc, "thermal_wear_coupling", couplingParams());
    expect(b.max_temp_C).toBe(a.max_temp_C);
    expect(b.max_deflection_um).toBe(a.max_deflection_um);
    expect(b.final_force_N).toBe(a.final_force_N);
  });

  it("MONOTONICITY: tool wear only accumulates (wear_mm non-decreasing along the trajectory)", async () => {
    const r = await call(calc, "thermal_wear_coupling", couplingParams());
    const t = r.trajectory as Array<{ wear_mm: number; cumulative_error_um: number }>;
    for (let i = 1; i < t.length; i++) {
      expect(t[i].wear_mm).toBeGreaterThanOrEqual(t[i - 1].wear_mm - 1e-9);
      expect(t[i].cumulative_error_um).toBeGreaterThanOrEqual(t[i - 1].cumulative_error_um - 1e-9);
    }
  });

  it("FORCE FEEDBACK: force grows with wear (amplification >= 0, final_force >= initial_force)", async () => {
    const r = await call(calc, "thermal_wear_coupling", couplingParams());
    expect(r.force_amplification_pct).toBeGreaterThanOrEqual(0);
    expect(r.final_force_N).toBeGreaterThanOrEqual(800 * 0.999);
  });

  it("THERMAL COUPLING: a higher cutting speed drives a higher peak temperature (theta ~ V^0.4)", async () => {
    const slow = await call(calc, "thermal_wear_coupling", couplingParams({ cutting_speed_m_min: 100 }));
    const fast = await call(calc, "thermal_wear_coupling", couplingParams({ cutting_speed_m_min: 250 }));
    expect(fast.max_temp_C).toBeGreaterThan(slow.max_temp_C);
  });

  it("WEAR-TEMPERATURE COUPLING: a higher cutting speed accumulates more wear at the same sim time", async () => {
    const slow = await call(calc, "thermal_wear_coupling", couplingParams({ cutting_speed_m_min: 100, simulation_time_min: 5 }));
    const fast = await call(calc, "thermal_wear_coupling", couplingParams({ cutting_speed_m_min: 250, simulation_time_min: 5 }));
    const slowEnd = slow.trajectory[slow.trajectory.length - 1].wear_mm;
    const fastEnd = fast.trajectory[fast.trajectory.length - 1].wear_mm;
    expect(fastEnd).toBeGreaterThan(slowEnd);
  });

  it("PHYSICAL BOUNDS: peak temp above ambient, positive acceleration factor + time-to-limit", async () => {
    const r = await call(calc, "thermal_wear_coupling", couplingParams());
    expect(r.max_temp_C).toBeGreaterThan(25);
    expect(r.thermal_acceleration_factor).toBeGreaterThan(0);
    expect(r.time_to_limit_min).toBeGreaterThan(0);
  });
});
