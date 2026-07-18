import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * UNIT-0011 round-trip wire test for `bue_mitigation_recommend` wrapping
 * BUEMitigationRecommenderEngine through prism_calc. Invokes THROUGH the dispatcher
 * (enum -> lazy import -> engine.recommend), not the singleton. Engine logic is
 * independently covered by BUEMitigationRecommenderEngine.test.ts.
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

describe("prism_calc bue_mitigation_recommend wire (UNIT-0011)", () => {
  const calc = calcTool();

  it("in-band P steel (Vc=60) -> ranked mitigations incl. raise_cutting_speed, through the dispatcher", async () => {
    const r = await call(calc, "bue_mitigation_recommend", { cutting_speed_m_per_min: 60, iso_group: "P", tool_material: "uncoated_carbide", rake_angle_deg: 0 });
    expect(r.in_risk_band).toBe(true);
    expect(Array.isArray(r.ranked_mitigations)).toBe(true);
    expect(r.ranked_mitigations.some((l: any) => l.lever === "raise_cutting_speed")).toBe(true);
    // quantified levers precede qualitative survives the wire
    expect(r.ranked_mitigations.some((l: any) => l.lever === "coating_change" && l.quantified === false)).toBe(true);
  });

  it("out-of-band (Vc=200) -> empty ranking survives the wire (slim-drop guarded)", async () => {
    const r = await call(calc, "bue_mitigation_recommend", { cutting_speed_m_per_min: 200, iso_group: "P", tool_material: "uncoated_carbide" });
    expect(r.in_risk_band).toBe(false);
    expect(r.ranked_mitigations ?? []).toHaveLength(0);
  });

  it("invalid tool_material is GUARDED, never crashes the dispatcher (warning returned)", async () => {
    const r = await call(calc, "bue_mitigation_recommend", { cutting_speed_m_per_min: 60, iso_group: "P", tool_material: "unobtanium" });
    expect(r.in_risk_band).toBe(false);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.warnings.some((w: string) => /invalid bue input/i.test(w))).toBe(true);
  });
});
