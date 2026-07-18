import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * UNIT-0011 (half 2) round-trip wire test for `breakage_root_cause` wrapping
 * ToolBreakageRootCauseEngine through prism_calc. Invokes THROUGH the dispatcher
 * (enum -> lazy import -> engine.analyze), not the singleton. Engine logic is
 * independently covered by ToolBreakageRootCauseEngine.test.ts.
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

describe("prism_calc breakage_root_cause wire (UNIT-0011 half 2)", () => {
  const calc = calcTool();

  it("slender overhung tool -> deflection root cause with corrective actions, through the dispatcher", async () => {
    const r = await call(calc, "breakage_root_cause", {
      tool: { tool_id: "EM-3-long", diameter_mm: 3, flute_count: 2, cutting_length_mm: 15, gauge_length_mm: 45, tool_material: "carbide" },
      forces: { Fc_N: 500 },
    });
    expect(r.dominant_mode).toBe("deflection");
    expect(Array.isArray(r.attribution)).toBe(true);
    expect(r.attribution).toHaveLength(4);
    expect(Array.isArray(r.primary_corrective_actions)).toBe(true);
    expect(r.primary_corrective_actions[0]).toMatch(/stickout/i);
    expect(r.recovery_pointer).toMatch(/getRecoveryProcedure/);
  });

  it("invalid tool_material is GUARDED, never crashes the dispatcher (warning + empty attribution)", async () => {
    const r = await call(calc, "breakage_root_cause", {
      tool: { tool_id: "bad", diameter_mm: 6, flute_count: 4, cutting_length_mm: 20, gauge_length_mm: 30, tool_material: "titanium" },
      forces: { Fc_N: 600 },
    });
    // slim-response may drop the empty array; guard with ?? []
    expect(r.attribution ?? []).toHaveLength(0);
    expect(r.dominant_mode ?? null).toBeNull();
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.warnings.some((w: string) => /invalid tool_material/i.test(w))).toBe(true);
  });

  it("missing forces is GUARDED through the wire (warning, no throw)", async () => {
    const r = await call(calc, "breakage_root_cause", {
      tool: { tool_id: "EM-6", diameter_mm: 6, flute_count: 4, cutting_length_mm: 20, gauge_length_mm: 30, tool_material: "carbide" },
    });
    expect(r.attribution ?? []).toHaveLength(0);
    expect(r.warnings.some((w: string) => /missing tool or forces/i.test(w))).toBe(true);
  });
});
