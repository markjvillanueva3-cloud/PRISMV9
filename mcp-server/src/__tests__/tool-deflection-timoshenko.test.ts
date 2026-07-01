/**
 * toolDeflectionTimoshenko -- SFC-WIRING-MS0 gap #5b (slot:oscar).
 *
 * The SFC tool-deflection estimate was bending-only Euler-Bernoulli (delta = F*L^3/3EI),
 * which UNDER-predicts deflection on stubby tools (low L/D) where the shear term is large.
 * The Timoshenko model adds delta_shear = F*L/(kappa*G*A); closed form:
 *   delta_shear / delta_bending = ((7+6nu)/16) * (D/L)^2   (Cowper kappa, solid circle).
 * Report-only in the SFC (result.forces.deflection_um) -- no feed/power/workholding clamp.
 */
import { describe, it, expect } from "vitest";
import {
  toolDeflection,
  toolDeflectionTimoshenko,
  CANONICAL_TOOL_POISSON,
} from "../physics/constants.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const F = 100;
const E = 600000; // carbide N/mm^2
const NU = 0.22; // carbide

describe("toolDeflectionTimoshenko (gap #5b shear correction)", () => {
  it("stubby tool (L=D): shear adds ~52% over Euler-Bernoulli bending-only", () => {
    const euler = toolDeflection(F, 10, 10, E);
    const timo = toolDeflectionTimoshenko(F, 10, 10, E, NU);
    // ((7 + 6*0.22)/16) * (D/L)^2 = 0.52 at L/D = 1 -> ratio 1.52
    expect(timo / euler).toBeCloseTo(1.52, 1);
  });

  it("slender tool (L=8D): shear negligible -> Timoshenko ~= Euler (<1.5%)", () => {
    const euler = toolDeflection(F, 80, 10, E);
    const timo = toolDeflectionTimoshenko(F, 80, 10, E, NU);
    expect(timo / euler).toBeLessThan(1.015);
    expect(timo / euler).toBeGreaterThan(1.0);
  });

  it("Timoshenko is ALWAYS >= Euler-Bernoulli (shear additive, non-negative)", () => {
    for (const L of [5, 10, 20, 50, 100]) {
      expect(toolDeflectionTimoshenko(F, L, 8, E, NU)).toBeGreaterThanOrEqual(toolDeflection(F, L, 8, E));
    }
  });

  it("shear/bending ratio matches the closed form ((7+6nu)/16)*(D/L)^2 (hss nu=0.29)", () => {
    const D = 12, L = 24, E2 = 210000, nu2 = 0.29;
    const euler = toolDeflection(F, L, D, E2);
    const timo = toolDeflectionTimoshenko(F, L, D, E2, nu2);
    const expectedRatio = 1 + ((7 + 6 * nu2) / 16) * Math.pow(D / L, 2);
    expect(timo / euler).toBeCloseTo(expectedRatio, 5);
  });

  it("degenerate inputs (D<=0 or E<=0) -> 0 (matches toolDeflection guard)", () => {
    expect(toolDeflectionTimoshenko(F, 30, 0, E, NU)).toBe(0);
    expect(toolDeflectionTimoshenko(F, 30, 10, 0, NU)).toBe(0);
  });

  it("invalid nu (NaN / out of (-1,0.5)) -> safe carbide-default Poisson, still finite+positive", () => {
    const rNaN = toolDeflectionTimoshenko(F, 20, 10, E, Number.NaN);
    const rBad = toolDeflectionTimoshenko(F, 20, 10, E, 0.9);
    expect(Number.isFinite(rNaN)).toBe(true);
    expect(rNaN).toBeGreaterThan(0);
    expect(rBad).toBeCloseTo(toolDeflectionTimoshenko(F, 20, 10, E, CANONICAL_TOOL_POISSON.carbide), 8);
  });

  it("canonical Poisson table has all 7 tool materials in (0, 0.5)", () => {
    const keys = Object.keys(CANONICAL_TOOL_POISSON);
    expect(keys.length).toBe(7);
    for (const [k, v] of Object.entries(CANONICAL_TOOL_POISSON)) {
      expect(v, k).toBeGreaterThan(0);
      expect(v, k).toBeLessThan(0.5);
    }
  });

  it("SFC engine reports Timoshenko deflection through the live calc path", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel", iso_group: "P", tool_diameter_mm: 12, flutes: 4, operation: "milling",
      cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40,
      axial_depth_mm: 5, radial_depth_mm: 6, // real depths -> real resultant force -> real deflection
    } as never);
    // Inputs (milling + stickout + Dc>0 + a real cutting force) GUARANTEE the deflection path runs ->
    // assert unconditionally (no vacuous-pass guard): deflection_um present + trace is the Timoshenko form.
    expect(r.forces?.deflection_um?.value).toBeGreaterThan(0);
    expect(JSON.stringify(r)).toContain("Timoshenko"); // the calc trace carries the Timoshenko label
  });
});
