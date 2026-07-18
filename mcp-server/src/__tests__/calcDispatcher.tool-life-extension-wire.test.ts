import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * UNIT-0012 round-trip wire test for `tool_life_extension_recommend` wrapping
 * ToolLifeExtensionRecommenderEngine through prism_calc. Invokes THROUGH the dispatcher
 * (enum -> lazy import -> engine.recommend), not the singleton. Engine math is independently
 * covered by ToolLifeExtensionRecommenderEngine.test.ts.
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

describe("prism_calc tool_life_extension_recommend wire (UNIT-0012)", () => {
  const calc = calcTool();

  it("1045 speed_reduction 20% + coating 1.2 -> ranked, coating best, through the dispatcher", async () => {
    const r = await call(calc, "tool_life_extension_recommend", {
      material: "1045", current_vc_m_min: 200, baseline_life_min: 30,
      levers: [{ type: "speed_reduction", vc_reduction_pct: 20 }, { type: "coating_upgrade", vc_multiplier: 1.2 }],
    });
    expect(r.iso_taylor_n).toBeCloseTo(0.25, 4);
    expect(Array.isArray(r.ranked_levers)).toBe(true);
    expect(r.best.type).toBe("coating_upgrade"); // zero-cost life gain wins
    const sr = r.ranked_levers.find((l: any) => l.type === "speed_reduction");
    expect(sr.life_multiplier).toBeCloseTo(2.4414, 3); // Taylor 1.25^4 survives the wire
  });

  it("invalid lever (coating <= 1) is skipped, never crashes the dispatcher", async () => {
    const r = await call(calc, "tool_life_extension_recommend", {
      material: "1045", current_vc_m_min: 200, levers: [{ type: "coating_upgrade", vc_multiplier: 0.9 }],
    });
    expect(r.ranked_levers ?? []).toHaveLength(0); // slimResponse drops the empty array on the wire
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("empty levers -> empty ranking survives the wire (best null, no crash)", async () => {
    const r = await call(calc, "tool_life_extension_recommend", { material: "1045", current_vc_m_min: 200, levers: [] });
    expect(r.ranked_levers ?? []).toHaveLength(0); // slimResponse drops the empty array -> absent == []
    expect(r.best ?? null).toBeNull();             // and drops the null best -> absent == null
  });
});
