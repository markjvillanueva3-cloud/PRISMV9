import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * MS-CRITWIRE U-CW-08 round-trip wire test for `deflection_calculate` wrapping
 * TimoshenkoDeflectionEngine through prism_calc. Invokes THROUGH the dispatcher
 * (enum -> lazy import -> engine.calculate), not the singleton. Verifies the wired
 * result against the textbook Euler-Bernoulli cantilever identity delta = F*L^3/(3*E*I),
 * I = pi*d^4/64, so a dropped unit / wrong engine surfaces as a divergence.
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

// Euler-Bernoulli cantilever tip deflection [um]: delta = F*L^3/(3*E*I), I = pi*d^4/64.
function eulerBernoulliUm(F: number, L: number, d: number, E: number): number {
  const I = (Math.PI * Math.pow(d, 4)) / 64; // mm^4
  const mm = (F * Math.pow(L, 3)) / (3 * E * I);
  return mm * 1000;
}

const E_CARBIDE = 600000; // N/mm^2, passed explicitly so the test is independent of the material lookup

describe("prism_calc deflection_calculate wire (MS-CRITWIRE U-CW-08)", () => {
  const calc = calcTool();

  it("Euler-Bernoulli component matches F*L^3/(3EI) through the dispatcher (10mm carbide, 40mm, 500N)", async () => {
    const r = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 10, elasticModulus: E_CARBIDE });
    const expectedEb = eulerBernoulliUm(500, 40, 10, E_CARBIDE); // ~36.2 um
    expect(r.comparison.eulerBernoulli_um).toBeCloseTo(expectedEb, 1);
    // Timoshenko total includes shear -> must be >= the bending-only Euler-Bernoulli value.
    expect(r.totalDeflection_um.value).toBeGreaterThanOrEqual(r.comparison.eulerBernoulli_um);
    // L/D = 4, shear fraction is a valid percentage.
    expect(r.ldRatio.value).toBeCloseTo(4, 3);
    expect(r.shearContributionPct.value).toBeGreaterThanOrEqual(0);
    expect(r.shearContributionPct.value).toBeLessThanOrEqual(100);
  });

  it("stiffness equals F / total deflection (N/mm identity)", async () => {
    const r = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 10, elasticModulus: E_CARBIDE });
    const deltaMm = r.totalDeflection_mm.value;
    // stiffness = F / delta. Reconstructing from the DISPLAY-rounded delta carries a sub-quantum
    // error (engine uses the unrounded delta), so assert a tight RELATIVE band (<0.5%): a real
    // unit/formula bug (1000x, radius-vs-diameter) blows far past this; display rounding does not.
    const expectedK = 500 / deltaMm;
    const relErr = Math.abs(r.stiffness_N_mm.value - expectedK) / expectedK;
    expect(relErr).toBeLessThan(0.005);
  });

  it("deflection scales ~L^3: doubling overhang sharply increases deflection", async () => {
    const short = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 10, elasticModulus: E_CARBIDE });
    const long = await call(calc, "deflection_calculate", { force: 500, length: 80, diameter: 10, elasticModulus: E_CARBIDE });
    expect(long.totalDeflection_um.value).toBeGreaterThan(short.totalDeflection_um.value);
    // bending term is L^3 -> ~8x on the Euler-Bernoulli component (shear is L^1, so total ratio is 4x..8x)
    const ratio = long.comparison.eulerBernoulli_um / short.comparison.eulerBernoulli_um;
    expect(ratio).toBeCloseTo(8, 0);
  });

  it("deflection scales ~1/d^4: a larger diameter is far stiffer", async () => {
    const thin = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 10, elasticModulus: E_CARBIDE });
    const thick = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 20, elasticModulus: E_CARBIDE });
    expect(thick.totalDeflection_um.value).toBeLessThan(thin.totalDeflection_um.value);
  });

  it("resolves elastic modulus from material when not given (carbide default)", async () => {
    const explicit = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 10, elasticModulus: E_CARBIDE });
    const byMaterial = await call(calc, "deflection_calculate", { force: 500, length: 40, diameter: 10, material: "carbide" });
    // carbide lookup == 600000 -> same deflection within rounding
    expect(byMaterial.totalDeflection_um.value).toBeCloseTo(explicit.totalDeflection_um.value, 1);
  });

  it("accepts tool_diameter / stickout_mm aliases (SFC page field names)", async () => {
    const r = await call(calc, "deflection_calculate", { force: 500, stickout_mm: 40, tool_diameter: 10, material: "carbide" });
    expect(r.totalDeflection_um.value).toBeGreaterThan(0);
    expect(r.ldRatio.value).toBeCloseTo(4, 3);
  });
});
