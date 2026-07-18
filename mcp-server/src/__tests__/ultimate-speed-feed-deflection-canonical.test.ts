/**
 * UltimateSpeedFeedEngine: tool deflection wired to the canonical material-aware modulus
 * ====================================================================================
 * Unit U-SFC-DEFLECTION-CANONICAL (SFC-WIRING-MS0 Tier-1).
 *
 * STEP 11's tool-deflection estimate used an INLINE E = 600000 (carbide-only) and an inline
 * delta = F*L^3/(3EI). That silently treated EVERY tool material as carbide-stiff, so an HSS or
 * ceramic tool (lower Young's modulus) had its deflection UNDER-predicted -- an un-conservative
 * error on exactly the softer-substrate tooling most prone to deflection-driven scrap.
 *
 * The fix routes the estimate through the canonical constants.ts deflection function with
 * `E = getToolModulus(toolMat)` (CANONICAL_TOOL_MODULUS: carbide 600000, hss 210000, ceramic 380000,
 * ... N/mm^2), material-aware + CORRECT (larger delta) for softer substrates -- always the safe
 * direction. UPDATE (gap #5b): the model was upgraded Euler-Bernoulli -> Timoshenko
 * (toolDeflectionTimoshenko = bending + shear), so carbide is NO LONGER byte-identical -- it gains
 * the shear term (~+4.7% at L:D 3.3, larger for stubby low-L:D tools), the safe direction. Result is
 * `result.forces.deflection_um` (an OptimizedValue), present only when tool_stickout_mm is given.
 *
 * Reference-value strategy (R9 -- verify intent, not a tautology): we recompute the expected
 * deflection independently from the engine's OWN reported resultant force and the PUBLISHED modulus
 * per material; the assertion fails if the modulus is wrong, the I formula drifts, or carbide
 * back-compat breaks. Tolerance is RELATIVE (5%) because the engine stores deflection at 2
 * significant figures (roundSig(.,2)), e.g. 114.2 -> 110; 5% still trivially separates a correct
 * modulus from a wrong one (carbide vs HSS differ by 186%).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";
import { CANONICAL_TOOL_POISSON } from "../physics/constants.js";

const D = 12;            // mm tool diameter
const STICKOUT = 40;     // mm (L:D = 3.3 -> deflection is measurable)

// Published tool-substrate Young's modulus [N/mm^2] (ASM Handbook Vol.2 / Sandvik 2024) -- the
// canonical CANONICAL_TOOL_MODULUS values the engine must now apply per tool material.
const E_CARBIDE = 600000;
const E_HSS = 210000;
const E_CERAMIC = 380000;

// Engine stores deflection at 2 significant figures, so a relative window is the right comparison.
const REL_TOL = 0.05;

/**
 * Timoshenko tip deflection from the engine's reported resultant force (gap #5b):
 *   delta[um] = (F*L^3/(3EI) + F*L/(kappa*G*A)) * 1000, I=pi*D^4/64, A=pi*D^2/4,
 *   G=E/(2(1+nu)), kappa=6(1+nu)/(7+6nu). Mirrors constants.ts toolDeflectionTimoshenko.
 */
function expectedDeflectionUm(fResN: number, E: number, nu: number): number {
  const I = (Math.PI * Math.pow(D, 4)) / 64;
  const A = (Math.PI * D * D) / 4;
  const G = E / (2 * (1 + nu));
  const kappa = (6 * (1 + nu)) / (7 + 6 * nu);
  const bending = (fResN * Math.pow(STICKOUT, 3)) / (3 * E * I);
  const shear = (fResN * STICKOUT) / (kappa * G * A);
  return (bending + shear) * 1000;
}

function relErr(actual: number, expected: number): number {
  return Math.abs(actual - expected) / expected;
}

function calc(toolMaterial: "carbide" | "hss" | "ceramic") {
  return ultimateSpeedFeedEngine.calculate({
    material: "AISI 1045",
    iso_group: "P",
    tool_diameter_mm: D,
    flutes: 4,
    tool_material: toolMaterial,
    operation: "milling",
    cut_type: "roughing",
    axial_depth_mm: 5,
    radial_depth_mm: 6, // 50% immersion (= Dc/2): no chip thinning, hex = fz (clean force anchor)
    tool_stickout_mm: STICKOUT,
    optimize_for: "balanced",
  });
}

// calculate() is ~2.5s/call -- memoise the three material runs + one no-stickout run once.
let carbide: ReturnType<typeof calc>;
let hss: ReturnType<typeof calc>;
let ceramic: ReturnType<typeof calc>;
let noStickout: ReturnType<typeof ultimateSpeedFeedEngine.calculate>;
let inferredHardened: ReturnType<typeof ultimateSpeedFeedEngine.calculate>;

beforeAll(() => {
  carbide = calc("carbide");
  hss = calc("hss");
  ceramic = calc("ceramic");
  noStickout = ultimateSpeedFeedEngine.calculate({
    material: "AISI 1045", iso_group: "P", tool_diameter_mm: D, flutes: 4,
    tool_material: "carbide", operation: "milling", cut_type: "roughing",
    axial_depth_mm: 5, radial_depth_mm: 6, optimize_for: "balanced",
    // tool_stickout_mm intentionally omitted
  });
  inferredHardened = ultimateSpeedFeedEngine.calculate({
    material: "AISI D2", iso_group: "H", tool_diameter_mm: D, flutes: 4,
    operation: "milling", cut_type: "roughing", axial_depth_mm: 5,
    radial_depth_mm: 6, tool_stickout_mm: STICKOUT, optimize_for: "balanced",
    // tool_material intentionally omitted -> inferToolMaterial("H") would otherwise pick CBN
  });
}, 120_000);

const defl = (r: ReturnType<typeof calc>) => r.forces.deflection_um!.value;
const fres = (r: ReturnType<typeof calc>) => r.forces.resultant_force_N.value;

describe("UltimateSpeedFeedEngine canonical tool-deflection wiring (U-SFC-DEFLECTION-CANONICAL)", () => {
  it("CARBIDE: deflection equals the canonical Timoshenko value (bending + shear) at E=600000, nu=0.22", () => {
    // gap #5b: deflection is now Timoshenko (Euler bending + shear); carbide gains the shear term.
    expect(relErr(defl(carbide), expectedDeflectionUm(fres(carbide), E_CARBIDE, CANONICAL_TOOL_POISSON.carbide))).toBeLessThanOrEqual(REL_TOL);
  });

  it("HSS MATERIAL-AWARE: deflection equals the value at E=210000 (was wrongly computed at carbide-stiff 600000)", () => {
    expect(relErr(defl(hss), expectedDeflectionUm(fres(hss), E_HSS, CANONICAL_TOOL_POISSON.hss))).toBeLessThanOrEqual(REL_TOL);
  });

  it("CERAMIC MATERIAL-AWARE: deflection equals the value at E=380000 (third spanning substrate)", () => {
    expect(relErr(defl(ceramic), expectedDeflectionUm(fres(ceramic), E_CERAMIC, CANONICAL_TOOL_POISSON.ceramic))).toBeLessThanOrEqual(REL_TOL);
  });

  it("WRONG-MODULUS GUARD: carbide-modulus prediction would mis-fit HSS by >50% (proves the fix is real, not luck)", () => {
    // If the engine had kept the carbide-only inline E, HSS deflection would match the E=600000 value;
    // it must NOT -- the carbide-modulus prediction is ~2.86x too small for the actual HSS deflection.
    expect(relErr(defl(hss), expectedDeflectionUm(fres(hss), E_CARBIDE, CANONICAL_TOOL_POISSON.carbide))).toBeGreaterThan(0.5);
  });

  it("SAFE DIRECTION: softer substrate => MORE deflection (carbide < ceramic < hss), monotone in 1/E", () => {
    // Fc is material-independent here (tool material scales Vc, not the per-tooth chip load/force),
    // so deflection is ordered purely by 1/E: carbide(600000) < ceramic(380000) < hss(210000).
    expect(defl(carbide)).toBeLessThan(defl(ceramic));
    expect(defl(ceramic)).toBeLessThan(defl(hss));
  });

  it("UNDER-PREDICTION MAGNITUDE: HSS deflection is ~E_carbide/E_hss larger than the old carbide-only value", () => {
    // The bug's magnitude: HSS was reported as carbide; the fix multiplies its deflection by ~2.86x.
    expect(relErr(defl(hss) / defl(carbide), E_CARBIDE / E_HSS)).toBeLessThanOrEqual(REL_TOL);
  });

  it("PHYSICAL BOUNDS: each material yields a deflection in a sane window (catches NaN/zero/absurd)", () => {
    // At D=12, L=40 (L:D 3.3), AISI 1045 roughing the carbide value is ~tens of um and HSS a few-fold higher;
    // a NaN/zero/blown-up result would fall outside [5, 2000] um.
    expect(defl(carbide)).toBeGreaterThan(5);
    expect(defl(carbide)).toBeLessThan(2000);
    expect(defl(hss)).toBeGreaterThan(5);
    expect(defl(hss)).toBeLessThan(2000);
  });

  it("CONSERVATIVE INFERENCE (ISO-H hardened, no explicit tool): deflection uses carbide baseline E=600000, not the inferred-CBN stiffer modulus", () => {
    // With no explicit tool_material the engine must NOT silently apply the stiffer inferred-CBN modulus
    // (E=680000) that would UNDER-report deflection on hardened-steel cuts; it falls back to carbide --
    // the conservative, zero-surprise baseline (a CBN-based prediction would be ~12% below this value).
    expect(relErr(defl(inferredHardened), expectedDeflectionUm(fres(inferredHardened), E_CARBIDE, CANONICAL_TOOL_POISSON.carbide))).toBeLessThanOrEqual(REL_TOL);
  });

  it("GUARD: no tool_stickout_mm => deflection omitted while the force path is unaffected", () => {
    // Forces do not depend on stickout: the no-stickout run reports the SAME resultant as the carbide run.
    expect(relErr(noStickout.forces.resultant_force_N.value, fres(carbide))).toBeLessThanOrEqual(REL_TOL);
    // ...and the optional deflection sub-result (forces.deflection_um) is cleanly omitted (coalesces below zero).
    expect(noStickout.forces.deflection_um?.value ?? -1).toBeLessThan(0);
  });
});
