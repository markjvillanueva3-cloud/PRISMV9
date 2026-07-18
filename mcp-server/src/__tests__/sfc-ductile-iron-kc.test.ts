/**
 * sfc-ductile-iron-kc.test.ts
 *
 * U-SFC-DUCTILE-IRON-KC (slot:oscar, 2026-06-22).
 *
 * Bug (found by the exhaustive SFC physics audit): ductile/nodular iron resolved to kc1_1=1100 -- the
 * gray-iron-class ISO-K GROUP default -- because there was no "ductile_iron" key in CANONICAL_MATERIAL_DB,
 * so the engines' material-sync maps (ductile_iron -> "ductile_iron") fell through to CANONICAL_KIENZLE.K
 * (1100), clobbering the engines' (dead) inline kc1_1. Ductile (nodular/SG) iron has spheroidal graphite
 * and is tougher to cut than gray iron -- its specific cutting force is ~15-20% ABOVE the gray-iron K
 * default -- so the SFC was UNDER-predicting ductile-iron cutting force (unconservative, safety-relevant).
 *
 * Fix: added a canonical "ductile_iron" entry to src/physics/constants.ts (_RAW_MATERIAL_DB +
 * AISI_CUTTING_COEFFICIENTS, kc1_1=1300, Sandvik/Kienzle GJS-500 range 1250-1350). The fix is in the
 * SAFER direction (higher force -> earlier safety clamps -> more conservative recommendation) and flows
 * to BOTH SpeedFeedOrchestratorEngine and UltimateSpeedFeedEngine via their existing sync maps (single
 * canonical source). Gray/generic cast iron is unchanged at the K-group 1100.
 */

import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine as ORCH } from "../engines/SpeedFeedOrchestratorEngine.js";
import { ultimateSpeedFeedEngine as ULT } from "../engines/UltimateSpeedFeedEngine.js";
import type { OrchestratorInput } from "../engines/SpeedFeedOrchestratorEngine.js";

const CUT: Omit<OrchestratorInput, "material"> = {
  iso_group: "K", tool_diameter_mm: 10, flutes: 4, tool_material: "carbide",
  operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5,
};

describe("SFC ductile-iron kc1.1 (U-SFC-DUCTILE-IRON-KC)", () => {

  it("orchestrator resolves ductile_iron to the canonical 1300 N/mm^2 (was the gray-iron K default 1100)", () => {
    const v = ORCH.compute({ ...CUT, material: "ductile_iron" }).value;
    expect(v.resolved_material.kc1_1.value).toBe(1300);
    expect(v.resolved_material.mc.value).toBeCloseTo(0.28, 2);
  });

  it("nodular_iron alias resolves to the same 1300 (not the K-group default)", () => {
    const v = ORCH.compute({ ...CUT, material: "nodular_iron" }).value;
    expect(v.resolved_material.kc1_1.value).toBe(1300);
  });

  it("gray_iron and cast_iron remain the K-group default 1100 (no regression to the generic fallback)", () => {
    const gray = ORCH.compute({ ...CUT, material: "gray_iron" }).value;
    const cast = ORCH.compute({ ...CUT, material: "cast_iron" }).value;
    expect(gray.resolved_material.kc1_1.value).toBe(1100);
    expect(cast.resolved_material.kc1_1.value).toBe(1100);
  });

  it("orchestrator predicts a HIGHER cutting force for ductile than gray iron at a NON-deflection-limited cut (differentiation in force)", () => {
    // At a LIGHT cut the deflection clamp does not engage, so the kc1300/kc1100 difference flows
    // straight to force. (Updated 2026-06-23 U-SFC-DEFLECTION-VC-LEVER: at the heavier CUT geometry
    // BOTH materials now correctly clamp fz to the SAME deflection-limited force, so the
    // differentiation shows in fz there instead -- asserted in the next test. Before the lever fix
    // the orchestrator wrongly collapsed Vc, which left a spurious force gap.)
    const LIGHT = { ...CUT, axial_depth_mm: 1, radial_depth_mm: 1.5 };
    const ductile = ORCH.compute({ ...LIGHT, material: "ductile_iron" }).value;
    const gray = ORCH.compute({ ...LIGHT, material: "gray_iron" }).value;
    // kc1300 vs kc1100 at the same ap/fz -> Fc ratio tracks the kc ratio (~1.18x), strictly higher.
    expect(ductile.tangential_force_N).toBeGreaterThan(gray.tangential_force_N);
    // and the magnitude is in the right ballpark (>=8% higher, not a rounding fluke)
    expect(ductile.tangential_force_N / gray.tangential_force_N).toBeGreaterThan(1.08);
  });

  it("at a deflection-limited cut the ductile/gray differentiation shows in fz (ductile drops chip load to meet the same tolerance)", () => {
    // CUT (ap=3, ae=5, D10) is deflection-limited: deflection = Fc*L^3/3EI hits tol/3 identically for
    // both, so both clamp to the SAME force -- the higher-kc ductile must cut a SMALLER fz to reach it.
    const ductile = ORCH.compute({ ...CUT, material: "ductile_iron" }).value;
    const gray = ORCH.compute({ ...CUT, material: "gray_iron" }).value;
    expect(ductile.feed_per_tooth_mm).toBeLessThan(gray.feed_per_tooth_mm);
  });

  it("UltimateSpeedFeedEngine (the convergence delegate) ALSO differentiates ductile from gray (single canonical source feeds both)", () => {
    const ductile = ULT.calculate({ material: "ductile_iron", iso_group: "K", tool_diameter_mm: 10, flutes: 4, tool_material: "carbide", operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5 });
    const gray = ULT.calculate({ material: "gray_iron", iso_group: "K", tool_diameter_mm: 10, flutes: 4, tool_material: "carbide", operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5 });
    expect(ductile.forces.tangential_force_N.value).toBeGreaterThan(gray.forces.tangential_force_N.value);
  });

});
