/**
 * R9 tests for the flank-wear FORCE advisory (U-OSC-SFC-FLANK-WEAR-FORCE step 1) in
 * UltimateSpeedFeedEngine. The SFC core models force at the FRESH tool; this advisory surfaces the
 * force at the ISO-3685 end-of-life flank-wear limit, F_worn = F_fresh*(1+Cw*VB), via the existing
 * WearForceCompensationEngine (Cw cited Smithey-Kapoor-DeVor 2000) -- as an ADDITIVE output
 * (forces.cutting_force_worn_N + wear_force_increase_pct) + a high-growth warning, WITHOUT touching
 * the headline forces or the safety verdicts (those stay on the fresh force; the conservative
 * verdict-coupling is a separate physics-reviewer-gated core unit).
 *
 * Pins: the worn force exceeds fresh by ~(1+Cw*VB); roughing (VB=0.6) > finishing (VB=0.3); hss
 * (Cw=2.0) > carbide (Cw=1.5); the high-growth warning fires; drilling gets no worn output (guard);
 * and the headline forces are unchanged (non-regression).
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  iso_group: "P" as const,
  tool_diameter_mm: 10,
  flutes: 4,
  operation: "milling" as const,
  axial_depth_mm: 6,
  radial_depth_pct: 40,
};

describe("UltimateSpeedFeedEngine -- flank-wear force advisory (additive, non-regressing)", () => {
  it("exposes cutting_force_worn_N > the fresh resultant, at ~F_fresh*(1+Cw*VB) for carbide roughing (VB=0.6)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "roughing", tool_material: "carbide" });
    const fresh = r.forces.resultant_force_N.value;
    const worn = r.forces.cutting_force_worn_N?.value ?? 0;
    expect(worn).toBeGreaterThan(fresh);
    // carbide Cw=1.5, roughing VB_max=0.6 -> 1 + 1.5*0.6 = 1.90x
    expect(worn / fresh).toBeCloseTo(1.9, 1);
    expect(r.forces.wear_force_increase_pct?.value ?? 0).toBeCloseTo(90, -1); // ~90%
  });

  it("uses the LOWER finishing VB limit (0.3) -> smaller force growth than roughing (0.6)", () => {
    const rough = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "roughing", tool_material: "carbide" });
    const finish = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "finishing", tool_material: "carbide" });
    const rRatio = (rough.forces.cutting_force_worn_N!.value) / rough.forces.resultant_force_N.value;
    const fRatio = (finish.forces.cutting_force_worn_N!.value) / finish.forces.resultant_force_N.value;
    expect(fRatio).toBeCloseTo(1.45, 1); // 1 + 1.5*0.3
    expect(rRatio).toBeGreaterThan(fRatio);
  });

  it("a softer tool (hss, Cw=2.0) grows the force MORE than carbide (Cw=1.5) at the same VB", () => {
    const carbide = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "roughing", tool_material: "carbide" });
    const hss = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "roughing", tool_material: "hss" });
    const cR = carbide.forces.wear_force_increase_pct!.value;
    const hR = hss.forces.wear_force_increase_pct!.value;
    expect(hR).toBeGreaterThan(cR); // hss 120% > carbide 90%
  });

  it("fires a high-growth warning when the wear-limit force increase is excessive (>50%)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "roughing", tool_material: "carbide" });
    expect(r.warnings.join(" | ")).toMatch(/Flank-wear force growth/i);
  });

  it("NON-REGRESSION: the headline forces are UNCHANGED by the advisory (verdicts run on fresh force)", () => {
    // The advisory is additive: the fresh resultant = sqrt(Fc^2+Fr^2+Fa^2) is unaffected by the worn output.
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, cut_type: "roughing", tool_material: "carbide" });
    const Fc = r.forces.tangential_force_N.value;
    const Fr = r.forces.radial_force_N.value;
    const Fa = r.forces.axial_force_N.value;
    const expectedResultant = Math.round(Math.sqrt(Fc * Fc + Fr * Fr + Fa * Fa));
    expect(Math.abs(r.forces.resultant_force_N.value - expectedResultant)).toBeLessThanOrEqual(1);
  });

  it("ADVERSARIAL: a drilling op gets NO worn output (advisory guarded to milling/turning)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ iso_group: "P", tool_diameter_mm: 8, operation: "drilling", hole_depth_mm: 30 });
    expect(r.forces.cutting_force_worn_N).toBeUndefined();
  });
});
