import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * UNIT-0007 round-trip wire test for the `dsa_window_check` action wrapping
 * DynamicStrainAgingEngine through prism_calc. Invokes THROUGH the dispatcher
 * (enum -> lazy import -> engine.assess), not the singleton. Engine math is
 * independently covered by DynamicStrainAgingEngine.test.ts.
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

describe("prism_calc dsa_window_check wire (UNIT-0007)", () => {
  const calc = calcTool();

  it("carbon steel (ISO P) at 300 C -> in DSA window, severity ~1 (through the dispatcher)", async () => {
    const r = await call(calc, "dsa_window_check", { iso_group: "P", cutting_zone_temp_C: 300 });
    expect(r.supported).toBe(true);
    expect(r.material_class).toBe("carbon_steel");
    expect(r.in_dsa_window).toBe(true);
    expect(r.severity).toBeCloseTo(1, 4);
    expect(Array.isArray(r.expected_effects)).toBe(true);
    expect(r.expected_effects.length).toBeGreaterThan(0);
  });

  it("carbon steel at 100 C -> out of the window (no anomaly)", async () => {
    const r = await call(calc, "dsa_window_check", { iso_group: "P", cutting_zone_temp_C: 100 });
    expect(r.in_dsa_window).toBe(false);
    expect(r.severity).toBe(0);
  });

  it("aluminum (ISO N) -> supported:false (not fabricated) survives the round trip", async () => {
    const r = await call(calc, "dsa_window_check", { iso_group: "N", cutting_zone_temp_C: 300 });
    expect(r.supported).toBe(false);         // the load-bearing "not fabricated" guarantee
    expect(r.in_dsa_window).toBe(false);
    // window_C is null in the engine (see DynamicStrainAgingEngine.test.ts); the dispatcher's
    // slimResponse drops null fields on the wire, so absent == null here.
    expect(r.window_C ?? null).toBeNull();
  });

  it("ADVISORY only: the wired result carries no force/flow-stress field", async () => {
    const r = await call(calc, "dsa_window_check", { iso_group: "M", cutting_zone_temp_C: 450 });
    expect(r.in_dsa_window).toBe(true);
    expect(r).not.toHaveProperty("cutting_force_N"); // exposes a factor, never an applied force
    expect(r).not.toHaveProperty("flow_stress");
    expect(typeof r.force_correction_factor).toBe("number"); // the factor round-trips through the wire
    expect(r.force_correction_factor).toBeGreaterThanOrEqual(1.0); // safe direction survives the wire
    expect(String(r.source)).toMatch(/does NOT itself apply it|physics-reviewer-gated/i);
  });
});
