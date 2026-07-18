/**
 * micro_milling_analyze — calcDispatcher wiring test
 * ===================================================
 * U-SFC-MICRO-MILLING-WIRE-FIX (slot:oscar, 2026-07-05): the action was 100% broken.
 * MicroMillingEngine.analyze(tool, conditions) takes TWO structured args, but the
 * dispatcher called analyze(params) with ONE arg, so `conditions` was undefined and
 * `conditions.feed_per_tooth_um` (MicroMillingEngine.ts:132) threw a TypeError on every
 * real call — the `?? {note:"method not callable"}` fallback never caught the throw.
 *
 * This test proves: (1) the fixed wiring runs the real physics via the dispatcher,
 * (2) it matches a direct engine call (lazy-import parity), (3) it fails LOUD on
 * missing inputs, and (4) the old one-arg call genuinely throws (regression guard).
 */
import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { MicroMillingEngine, type MicroToolGeometry, type MicroCuttingConditions } from "../engines/MicroMillingEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
}

function createMockServer(): { server: { tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void }; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
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

const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

// Realistic 0.5mm micro-endmill in Ti-6Al-4V (a canonical micro-milling case).
const TOOL: MicroToolGeometry = {
  diameter_mm: 0.5,
  flute_count: 2,
  cutting_edge_radius_um: 2,
  helix_angle_deg: 30,
  rake_angle_deg: 5,
  flute_length_mm: 2,
  overall_length_mm: 38,
  shank_diameter_mm: 3,
  tool_material: "carbide",
  coating: "TiAlN",
};
const CONDITIONS: MicroCuttingConditions = {
  spindle_rpm: 40000,
  feed_per_tooth_um: 3,
  axial_depth_um: 50,
  radial_depth_um: 250,
  tool_runout_um: 1,
  material: { name: "Ti-6Al-4V", shear_strength_mpa: 760, hardness_hv: 349, ductility: "ductile" },
  coolant: "mql",
};

/** The dispatcher case returns { success, data }; slimResponse may or may not wrap it. */
function unwrap(res: Record<string, unknown>): any {
  const d = (res.data ?? res) as any;
  return d;
}

describe("micro_milling_analyze — wiring", () => {
  it("HAPPY: dispatcher runs real physics — regime in enum, positive chip thickness + total force", async () => {
    const res = await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: CONDITIONS });
    expect(res.success).toBe(true);
    const data = unwrap(res);
    expect(["ploughing", "transition", "shearing"]).toContain(data.cutting_regime);
    expect(data.minimum_chip_thickness_um).toBeGreaterThan(0);
    expect(data.actual_chip_thickness_um).toBeCloseTo(3, 6); // == feed_per_tooth_um
    expect(data.forces.total_n).toBeGreaterThan(0);
    expect(data.confidence).toBeGreaterThan(0);
  });

  it("PARITY: dispatcher result == direct engine call (lazy-import wiring is the real engine)", async () => {
    const direct = new MicroMillingEngine().analyze(TOOL, CONDITIONS);
    const via = unwrap(await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: CONDITIONS }));
    expect(via.cutting_regime).toBe(direct.cutting_regime);
    expect(via.minimum_chip_thickness_um).toBeCloseTo(direct.minimum_chip_thickness_um, 6);
    expect(via.forces.total_n).toBeCloseTo(direct.forces.total_n, 6);
    expect(via.size_effect_factor).toBeCloseTo(direct.size_effect_factor, 6);
  });

  it("REGRESSION GUARD: the old one-arg call analyze(params) throws (the bug this fix removes)", () => {
    const eng = new MicroMillingEngine();
    // conditions undefined -> conditions.feed_per_tooth_um throws, exactly the pre-fix path.
    expect(() => eng.analyze(TOOL, undefined as unknown as MicroCuttingConditions)).toThrow();
  });

  it("FAIL-LOUD: missing conditions -> success:false with a descriptive error (not a crash, not a silent stub)", async () => {
    const res = await callAction(calc, "micro_milling_analyze", { tool: TOOL });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/requires .*conditions/i);
  });

  it("FAIL-LOUD: missing tool -> success:false", async () => {
    const res = await callAction(calc, "micro_milling_analyze", { conditions: CONDITIONS });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/requires/i);
  });

  it("FAIL-LOUD: empty params -> success:false (no method-not-callable stub leak)", async () => {
    const res = await callAction(calc, "micro_milling_analyze", {});
    expect(res.success).toBe(false);
    expect(JSON.stringify(res)).not.toMatch(/method not callable/);
  });

  it("FAIL-LOUD: malformed-but-present tool (no numeric diameter_mm) -> success:false, no silent NaN/null leak (arm-C P2)", async () => {
    const res = await callAction(calc, "micro_milling_analyze", { tool: {}, conditions: CONDITIONS });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/non-finite|numeric/i);
    // must NOT leak a spurious success with null numerics
    expect(res.data).toBeUndefined();
  });

  it("ADVERSARIAL: feed below minimum chip thickness -> ploughing regime (size-effect physics engages)", async () => {
    const tinyFeed = { ...CONDITIONS, feed_per_tooth_um: 0.2 };
    const data = unwrap(await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: tinyFeed }));
    expect(data.cutting_regime).toBe("ploughing");
    // below hMin the chip ratio < 1
    expect(data.chip_formation_ratio).toBeLessThan(1);
  });

  it("ADVERSARIAL: feed well above hMin -> shearing regime + LOWER specific force than the ploughing case (Kienzle size effect kc~h^-mc: thinner chip => higher specific force)", async () => {
    const big = unwrap(await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: { ...CONDITIONS, feed_per_tooth_um: 8 } }));
    const small = unwrap(await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: { ...CONDITIONS, feed_per_tooth_um: 0.2 } }));
    expect(big.cutting_regime).toBe("shearing");
    // size-effect amplifies specific cutting force at tiny chip thickness (ploughing) and relaxes as the chip thickens
    expect(big.specific_cutting_force_n_per_mm2).toBeLessThan(small.specific_cutting_force_n_per_mm2);
  });

  it("ADVERSARIAL: monotonic size effect — larger edge radius raises the size-effect factor", async () => {
    const sharp = unwrap(await callAction(calc, "micro_milling_analyze", { tool: { ...TOOL, cutting_edge_radius_um: 1 }, conditions: CONDITIONS }));
    const blunt = unwrap(await callAction(calc, "micro_milling_analyze", { tool: { ...TOOL, cutting_edge_radius_um: 5 }, conditions: CONDITIONS }));
    expect(blunt.size_effect_factor).toBeGreaterThan(sharp.size_effect_factor);
  });

  it("DETERMINISM: identical inputs give identical total force (pure calc, no hidden state)", async () => {
    const a = unwrap(await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: CONDITIONS }));
    const b = unwrap(await callAction(calc, "micro_milling_analyze", { tool: TOOL, conditions: CONDITIONS }));
    expect(a.forces.total_n).toBe(b.forces.total_n);
  });
});
