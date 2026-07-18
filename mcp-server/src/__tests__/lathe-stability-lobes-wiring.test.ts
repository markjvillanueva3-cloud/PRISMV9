/**
 * lathe_stability_lobes — turning SLD wiring test
 * ===============================================
 * U-LW-TURN-SLD (whiskey, 2026-07-03). The lathe physics coverage audit flagged
 * "turning-native stability lobe diagram" as a PARTIAL. Dedup verification found
 * RegenerativeChatterPredictor.stabilityLobes() ALREADY computes turning-capable
 * lobes (cut_type "turning" is first-class) and is wired for milling via
 * prism_calc:regen_chatter_lobes -- so NO new engine. This adds a lathe-NATIVE
 * prism_turning:lathe_stability_lobes action with TURNING-correct defaults
 * (cut_type "turning" + num_flutes 1 single-point, vs the mill action's 4).
 */

import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { regenerativeChatterPredictor } from "../engines/RegenerativeChatterPredictor.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}
function mockServer() {
  const tools: CapturedTool[] = [];
  return { server: { tool: (name: string, _d: string, _s: unknown, h: CapturedTool["handler"]) => tools.push({ name, handler: h }) }, tools };
}
async function call(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const r = (await tool.handler({ action, params })) as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (r as Record<string, unknown>);
}
function payload(res: Record<string, unknown>): Record<string, unknown> {
  let d: Record<string, unknown> = res;
  if (d.data && typeof d.data === "object") d = d.data as Record<string, unknown>;
  return d;
}
type Lobe = { lobe_number: number; rpm: number; critical_depth_mm: number };

const { server, tools } = mockServer();
registerTurningDispatcher(server);
const turn = tools[0];

// FRF params for a representative boring bar (turning).
const FRF = { natural_freq_Hz: 600, stiffness_N_per_m: 1e7, damping_ratio: 0.03, specific_cutting_force_N_mm2: 2000, tool_diameter_mm: 20 };

describe("lathe_stability_lobes — turning SLD wiring", () => {
  it("returns a turning stability-lobe array with positive critical depths (b_lim > 0)", async () => {
    const res = await call(turn, "lathe_stability_lobes", { ...FRF, rpm_min: 200, rpm_max: 4000 });
    const d = payload(res);
    expect(JSON.stringify(res)).not.toContain("method not callable");
    expect(d.cut_type).toBe("turning");
    const lobes = d.lobes as Lobe[];
    expect(Array.isArray(lobes)).toBe(true);
    expect(lobes.length).toBeGreaterThan(0);
    for (const l of lobes) {
      expect(l.rpm).toBeGreaterThanOrEqual(200);
      expect(l.rpm).toBeLessThanOrEqual(4000);
      expect(l.critical_depth_mm).toBeGreaterThan(0); // stable-depth floor is a real positive b_lim
    }
  });

  it("matches the direct engine (turning cut_type + single-point num_flutes=1) exactly", async () => {
    const res = await call(turn, "lathe_stability_lobes", { ...FRF, rpm_min: 200, rpm_max: 4000 });
    const viaLobes = payload(res).lobes as Lobe[];
    const direct = regenerativeChatterPredictor.stabilityLobes(
      { cut_type: "turning", num_flutes: 1, tool_diameter_mm: 20, natural_freq_Hz: 600, stiffness_N_per_m: 1e7, damping_ratio: 0.03, specific_cutting_force_N_mm2: 2000, lobe_number: 0 } as never,
      [200, 4000]
    );
    expect(viaLobes.length).toBe(direct.length);
    if (direct.length > 0) {
      expect(viaLobes[0].rpm).toBeCloseTo(direct[0].rpm, 6);
      expect(viaLobes[0].critical_depth_mm).toBeCloseTo(direct[0].critical_depth_mm, 6);
    }
  });

  it("honors a custom RPM range (all lobes within [rpm_min, rpm_max])", async () => {
    const res = await call(turn, "lathe_stability_lobes", { ...FRF, rpm_min: 500, rpm_max: 2500 });
    const d = payload(res);
    expect(d.rpm_min).toBe(500);
    expect(d.rpm_max).toBe(2500);
    // lobes may be empty for a narrow range (slimResponse strips empty arrays -> undefined);
    // whatever lobes ARE returned must lie within the requested window.
    for (const l of ((d.lobes as Lobe[] | undefined) ?? [])) {
      expect(l.rpm).toBeGreaterThanOrEqual(500);
      expect(l.rpm).toBeLessThanOrEqual(2500);
    }
  });

  it("defaults are turning-appropriate: produces lobes with no FRF params supplied (fallbacks)", async () => {
    const res = await call(turn, "lathe_stability_lobes", {});
    const d = payload(res);
    expect(d.cut_type).toBe("turning");
    expect(Array.isArray(d.lobes)).toBe(true);
    expect(JSON.stringify(res)).not.toContain("method not callable");
  });
});
