import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * Round-trip wire test for `tool_assembly_deflection` (ToolAssemblyDeflectionEngine.compute,
 * calcDispatcher.ts:8729) through prism_calc. The multi-section tool-assembly deflection engine
 * (holder + tool as stacked Euler-Bernoulli beam sections) was WIRED but had NO test -- a
 * deflection/rigidity coverage gap found by the 2026-07-03 physics-coverage workflow. These invoke
 * THROUGH the dispatcher and assert the load-bearing cantilever behavior of the DEFLECTION output.
 *
 * compute returns AtomicValue<AssemblyDeflectionResult> and the dispatcher does NOT unwrap it, so
 * the returned object is the AtomicValue { value: {...} } (the test unwraps .value).
 *
 * TWO FINDINGS surfaced while writing this test (recorded for follow-up, NOT fixed here to avoid a
 * deep FEM change mid-loop):
 *  - The summary formatter (calcDispatcher.ts:259) reads `result.total_stiffness_n_mm`, but the
 *    engine field is `stiffness_n_mm` (AssemblyDeflectionResult:91) -> the summary reports undefined
 *    stiffness. Minor summary-path bug.
 *  - `natural_frequency_hz` is NON-PHYSICAL for a longer overhang (longer tool gave a HIGHER fn:
 *    ~14753 Hz at 60mm vs ~941 Hz at 30mm, opposite of the cantilever fn ~ 1/L^2). Likely an FEM
 *    eigensolver artifact (spurious mode) -- flagged, not asserted on direction here; needs a
 *    physics-reviewer pass on the FEM natural-frequency path (femNatFreq, engine ~:380).
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
  const parsed = text ? JSON.parse(text) : r;
  return parsed?.value ?? parsed; // compute() returns AtomicValue<AssemblyDeflectionResult>
}

function assemblyParams(overrides: { toolLen?: number; toolDia?: number; radial?: number; cutting?: number } = {}): Record<string, any> {
  const { toolLen = 40, toolDia = 12, radial = 300, cutting = 500 } = overrides;
  return {
    sections: [
      { name: "holder", length_mm: 60, diameter_mm: 25, material: "steel", is_cutting: false },
      { name: "tool", length_mm: toolLen, diameter_mm: toolDia, material: "carbide", is_cutting: true },
    ],
    cutting_force_n: cutting,
    radial_force_n: radial,
    taper: "CAT40",
    spindle_rigidity_n_um: 50,
  };
}

describe("prism_calc tool_assembly_deflection wire (U-OSC-ASSEMBLY-DEFL-TEST)", () => {
  const calc = calcTool();

  it("routes to the engine and returns a physical assembly deflection result", async () => {
    const r = await call(calc, "tool_assembly_deflection", assemblyParams());
    expect(r.total_deflection_um).toBeGreaterThan(0);
    expect(r.total_deflection_mm).toBeGreaterThan(0);
    expect(r.stiffness_n_mm).toBeGreaterThan(0);
    expect(r.natural_frequency_hz).toBeGreaterThan(0); // sanity only (see file header re: direction)
  });

  it("mm and um deflection fields are unit-consistent (mm = um / 1000)", async () => {
    const r = await call(calc, "tool_assembly_deflection", assemblyParams());
    expect(r.total_deflection_mm).toBeCloseTo(r.total_deflection_um / 1000, 6);
  });

  it("PHYSICS INVARIANT: a longer tool overhang increases assembly deflection (L^3 cantilever)", async () => {
    const shortTool = await call(calc, "tool_assembly_deflection", assemblyParams({ toolLen: 30 }));
    const longTool = await call(calc, "tool_assembly_deflection", assemblyParams({ toolLen: 60 }));
    expect(longTool.total_deflection_um).toBeGreaterThan(shortTool.total_deflection_um);
  });

  it("PHYSICS INVARIANT: a larger tool diameter is stiffer -> less deflection (1/d^4)", async () => {
    const thin = await call(calc, "tool_assembly_deflection", assemblyParams({ toolDia: 10 }));
    const thick = await call(calc, "tool_assembly_deflection", assemblyParams({ toolDia: 20 }));
    expect(thick.total_deflection_um).toBeLessThan(thin.total_deflection_um);
  });

  it("PHYSICS INVARIANT: deflection is monotonic increasing in CUTTING force (the engine's deflection driver)", async () => {
    // FINDING: the engine computes deflection from cutting_force_n (compute :130), NOT radial_force_n
    // -- varying radial_force_n alone leaves total_deflection unchanged (verified: 65.3 == 65.3).
    // So the load-driving invariant is asserted on cutting_force_n.
    const lo = await call(calc, "tool_assembly_deflection", assemblyParams({ cutting: 250 }));
    const hi = await call(calc, "tool_assembly_deflection", assemblyParams({ cutting: 1000 }));
    expect(hi.total_deflection_um).toBeGreaterThan(lo.total_deflection_um);
  });

  it("FINDING (documented): radial_force_n does NOT affect total deflection (engine uses cutting_force_n)", async () => {
    const lo = await call(calc, "tool_assembly_deflection", assemblyParams({ radial: 200 }));
    const hi = await call(calc, "tool_assembly_deflection", assemblyParams({ radial: 600 }));
    // Documents current behavior so a future change that DOES wire radial force is caught by review.
    expect(hi.total_deflection_um).toBe(lo.total_deflection_um);
  });

  it("is deterministic (same inputs -> identical deflection)", async () => {
    const a = await call(calc, "tool_assembly_deflection", assemblyParams());
    const b = await call(calc, "tool_assembly_deflection", assemblyParams());
    expect(b.total_deflection_um).toBe(a.total_deflection_um);
  });
});
