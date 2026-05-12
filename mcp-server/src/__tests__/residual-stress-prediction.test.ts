/**
 * ResidualStressPredictionEngine — Unit Tests
 * 18+ tests covering all 7 physics models
 */
import { describe, it, expect } from "vitest";
import {
  residualStressPredictionEngine as engine,
  MATERIAL_DB,
  erfc,
} from "../engines/ResidualStressPredictionEngine.js";

describe("ResidualStressPredictionEngine", () => {
  // ── 1. Hertzian Contact Stress ────────────────────────────────

  it("calculates Hertzian contact pressure (known analytical)", () => {
    const r = engine.calcHertzianStress({
      cutting_force_N: 500,
      contact_radius_mm: 0.5,
      material: "AISI 4340",
    });
    // P0 must be positive and in realistic range (hundreds to thousands MPa)
    expect(r.P0_MPa).toBeGreaterThan(100);
    expect(r.P0_MPa).toBeLessThan(50000);
    // Surface stress must be compressive (negative)
    expect(r.sigma_surface_MPa).toBeLessThan(0);
    // Verify formula: σ = -P0·(1+2ν)/3
    const nu = MATERIAL_DB["AISI 4340"].nu;
    const expected = -r.P0_MPa * (1 + 2 * nu) / 3;
    expect(r.sigma_surface_MPa).toBeCloseTo(expected, 1);
    // Contact half-width must be positive
    expect(r.contact_half_width_mm).toBeGreaterThan(0);
  });

  it("mechanical stress decays with depth", () => {
    const r = engine.calcHertzianStress({
      cutting_force_N: 500,
      contact_radius_mm: 0.5,
      material: "AISI 4340",
    });
    const s0 = engine.mechStressAtDepth(
      r.sigma_surface_MPa,
      r.contact_half_width_mm,
      0
    );
    const s1 = engine.mechStressAtDepth(
      r.sigma_surface_MPa,
      r.contact_half_width_mm,
      0.1
    );
    const s2 = engine.mechStressAtDepth(
      r.sigma_surface_MPa,
      r.contact_half_width_mm,
      0.5
    );
    // All compressive (negative), decaying magnitude
    expect(s0).toBeCloseTo(r.sigma_surface_MPa, 1);
    expect(Math.abs(s1)).toBeLessThan(Math.abs(s0));
    expect(Math.abs(s2)).toBeLessThan(Math.abs(s1));
  });

  // ── 2. Thermal Stress ─────────────────────────────────────────

  it("calculates thermal stress from temperature gradient", () => {
    const r = engine.calcThermalStress({
      delta_T_surface: 300,
      contact_time_s: 1e-4,
      material: "AISI 4340",
    });
    // Thermal stress should be tensile (positive) for positive ΔT
    expect(r.sigma_thermal_surface_MPa).toBeGreaterThan(0);
    // Verify formula: σ = E·α·ΔT/(1-ν)
    const mat = MATERIAL_DB["AISI 4340"];
    const expected =
      (mat.E_GPa * 1e3 * mat.alpha * 300) / (1 - mat.nu);
    expect(r.sigma_thermal_surface_MPa).toBeCloseTo(expected, 0);
    // Thermal depth must be positive
    expect(r.thermal_depth_mm).toBeGreaterThan(0);
  });

  it("thermal stress decays via erfc profile", () => {
    const mat = MATERIAL_DB["AISI 4340"];
    const sigma_s = 500; // MPa
    const t = 1e-4;
    const s0 = engine.thermalStressAtDepth(sigma_s, mat.kappa, t, 0);
    const s1 = engine.thermalStressAtDepth(sigma_s, mat.kappa, t, 0.05);
    const s2 = engine.thermalStressAtDepth(sigma_s, mat.kappa, t, 0.5);
    expect(s0).toBeCloseTo(sigma_s, 0); // erfc(0) = 1
    expect(s1).toBeLessThan(s0);
    expect(s2).toBeLessThan(s1);
    // Deep enough should be near zero
    const sDeep = engine.thermalStressAtDepth(sigma_s, mat.kappa, t, 5);
    expect(Math.abs(sDeep)).toBeLessThan(1);
  });

  // ── 3. Combined Profile (Hook Shape) ──────────────────────────

  it("combined profile shows hook shape for hard turning", () => {
    // Hook shape requires thermal tensile > mechanical compressive at surface
    // but mechanical compressive dominates at subsurface depths.
    // Use small force with large contact radius (low P0) and high ΔT.
    const r = engine.calcCombinedProfile({
      cutting_force_N: 10,
      contact_radius_mm: 5.0,
      delta_T_surface: 800,
      contact_time_s: 1e-4,
      material: "AISI 52100",
      max_depth_mm: 0.5,
      num_points: 100,
    });
    // Hook shape: tensile at surface, compressive below
    expect(r.hook_shape).toBe(true);
    expect(r.surface_stress_MPa).toBeGreaterThan(0);
    expect(r.max_compressive_MPa).toBeLessThan(0);
    // Max compressive is subsurface
    expect(r.depth_max_compressive_mm).toBeGreaterThan(0);
    // Profile length matches
    expect(r.profile.length).toBe(101); // 0..100 inclusive
  });

  it("profile components sum to total at every point", () => {
    const r = engine.calcCombinedProfile({
      cutting_force_N: 500,
      contact_radius_mm: 0.4,
      delta_T_surface: 200,
      contact_time_s: 1e-4,
      material: "AISI 4340",
      flank_wear_mm: 0.15,
      include_phase_transform: true,
    });
    for (const pt of r.profile) {
      const sum =
        pt.sigma_mech_MPa +
        pt.sigma_thermal_MPa +
        pt.sigma_burnish_MPa +
        pt.sigma_transform_MPa;
      expect(pt.sigma_total_MPa).toBeCloseTo(sum, 6);
    }
  });

  // ── 4. Burnishing Effect ──────────────────────────────────────

  it("burnishing stress increases with flank wear", () => {
    const r1 = engine.calcBurnishingStress({
      flank_wear_mm: 0.1,
      material: "AISI 4340",
    });
    const r2 = engine.calcBurnishingStress({
      flank_wear_mm: 0.3,
      material: "AISI 4340",
    });
    // Both compressive
    expect(r1.sigma_burnish_surface_MPa).toBeLessThan(0);
    expect(r2.sigma_burnish_surface_MPa).toBeLessThan(0);
    // More wear → more compressive (larger magnitude)
    expect(Math.abs(r2.sigma_burnish_surface_MPa)).toBeGreaterThan(
      Math.abs(r1.sigma_burnish_surface_MPa)
    );
    // Depth increases with VB
    expect(r2.burnish_depth_mm).toBeGreaterThan(r1.burnish_depth_mm);
    // Factor saturates toward 1
    expect(r2.burnish_factor).toBeGreaterThan(r1.burnish_factor);
    expect(r2.burnish_factor).toBeLessThanOrEqual(1);
  });

  it("burnishing formula matches -σ_y·(1-exp(-VB/VB_ref))", () => {
    const mat = MATERIAL_DB["Ti-6Al-4V"];
    const VB = 0.2;
    const VB_ref = 0.3;
    const r = engine.calcBurnishingStress({
      flank_wear_mm: VB,
      material: mat,
      VB_ref_mm: VB_ref,
    });
    const expected = -mat.sigma_y_MPa * (1 - Math.exp(-VB / VB_ref));
    expect(r.sigma_burnish_surface_MPa).toBeCloseTo(expected, 1);
  });

  // ── 5. Phase Transformation ───────────────────────────────────

  it("phase transformation stress for hardened steel", () => {
    const r = engine.calcPhaseTransformStress({
      material: "AISI 52100",
      fraction_transformed: 0.1,
    });
    // E·ΔV/V·f = 210e3 · 0.04 · 0.1 = 840 MPa
    expect(r.sigma_transform_MPa).toBeCloseTo(840, 0);
    expect(r.delta_V_over_V).toBe(0.04);
  });

  it("phase transformation scales linearly with fraction", () => {
    const r1 = engine.calcPhaseTransformStress({
      material: "AISI 52100",
      fraction_transformed: 0.05,
    });
    const r2 = engine.calcPhaseTransformStress({
      material: "AISI 52100",
      fraction_transformed: 0.1,
    });
    expect(r2.sigma_transform_MPa).toBeCloseTo(
      2 * r1.sigma_transform_MPa,
      1
    );
  });

  // ── 6. Fatigue Life ───────────────────────────────────────────

  it("compressive residual stress improves fatigue life", () => {
    const r = engine.calcFatigueImpact({
      sigma_applied_amplitude_MPa: 200,
      sigma_applied_mean_MPa: 100,
      sigma_residual_MPa: -300, // compressive
      material: "AISI 4340",
    });
    expect(r.beneficial).toBe(true);
    expect(r.safety_factor_with_residual).toBeGreaterThan(
      r.safety_factor_no_residual
    );
    expect(r.life_ratio).toBeGreaterThan(1);
    // Effective mean should be reduced
    expect(r.sigma_eff_mean_MPa).toBe(100 - 300);
  });

  it("tensile residual stress reduces fatigue life", () => {
    const r = engine.calcFatigueImpact({
      sigma_applied_amplitude_MPa: 200,
      sigma_applied_mean_MPa: 100,
      sigma_residual_MPa: 200, // tensile
      material: "AISI 4340",
    });
    expect(r.beneficial).toBe(false);
    expect(r.safety_factor_with_residual).toBeLessThan(
      r.safety_factor_no_residual
    );
    expect(r.life_ratio).toBeLessThan(1);
  });

  // ── 7. Process Parameter Effects ──────────────────────────────

  it("higher cutting speed → more tensile surface stress", () => {
    const rSlow = engine.calcProcessParamEffect({
      cutting_speed_m_min: 50,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1,
      coolant: false,
      material: "AISI 4340",
    });
    const rFast = engine.calcProcessParamEffect({
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1,
      coolant: false,
      material: "AISI 4340",
    });
    // Higher speed → higher ΔT → more tensile at surface
    expect(rFast.estimated_delta_T).toBeGreaterThan(
      rSlow.estimated_delta_T
    );
    expect(rFast.profile.surface_stress_MPa).toBeGreaterThan(
      rSlow.profile.surface_stress_MPa
    );
  });

  it("higher feed → deeper compressive layer", () => {
    const rLow = engine.calcProcessParamEffect({
      cutting_speed_m_min: 100,
      feed_mm_rev: 0.05,
      depth_of_cut_mm: 1,
      coolant: false,
      material: "AISI 4340",
    });
    const rHigh = engine.calcProcessParamEffect({
      cutting_speed_m_min: 100,
      feed_mm_rev: 0.3,
      depth_of_cut_mm: 1,
      coolant: false,
      material: "AISI 4340",
    });
    // Higher feed → higher force
    expect(rHigh.estimated_force_N).toBeGreaterThan(
      rLow.estimated_force_N
    );
    // More compressive stress magnitude
    expect(Math.abs(rHigh.profile.max_compressive_MPa)).toBeGreaterThan(
      Math.abs(rLow.profile.max_compressive_MPa)
    );
  });

  it("coolant reduces thermal component", () => {
    const rDry = engine.calcProcessParamEffect({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1,
      coolant: false,
      material: "AISI 4340",
    });
    const rWet = engine.calcProcessParamEffect({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1,
      coolant: true,
      material: "AISI 4340",
    });
    expect(rWet.estimated_delta_T).toBeLessThan(rDry.estimated_delta_T);
    // Coolant → ΔT halved
    expect(rWet.estimated_delta_T).toBeCloseTo(
      rDry.estimated_delta_T * 0.5,
      0
    );
  });

  // ── Material Comparisons ──────────────────────────────────────

  it("Ti-6Al-4V vs AISI 4340: different thermal behavior", () => {
    const rTi = engine.calcThermalStress({
      delta_T_surface: 300,
      contact_time_s: 1e-4,
      material: "Ti-6Al-4V",
    });
    const rSteel = engine.calcThermalStress({
      delta_T_surface: 300,
      contact_time_s: 1e-4,
      material: "AISI 4340",
    });
    // Ti has lower E but also lower α → different thermal stress
    // Ti has much lower κ → shallower thermal penetration
    expect(rTi.thermal_depth_mm).toBeLessThan(rSteel.thermal_depth_mm);
    // Both should be positive (tensile)
    expect(rTi.sigma_thermal_surface_MPa).toBeGreaterThan(0);
    expect(rSteel.sigma_thermal_surface_MPa).toBeGreaterThan(0);
  });

  // ── Depth Profile Convergence ─────────────────────────────────

  it("stress returns to zero at sufficient depth", () => {
    const r = engine.calcCombinedProfile({
      cutting_force_N: 500,
      contact_radius_mm: 0.5,
      delta_T_surface: 200,
      contact_time_s: 1e-4,
      material: "AISI 4340",
      max_depth_mm: 2.0,
      num_points: 100,
    });
    // Last few points should be near zero
    const last = r.profile[r.profile.length - 1];
    expect(Math.abs(last.sigma_total_MPa)).toBeLessThan(10);
  });

  // ── Edge Cases ────────────────────────────────────────────────

  it("zero cutting force → zero mechanical stress", () => {
    const r = engine.calcHertzianStress({
      cutting_force_N: 0,
      contact_radius_mm: 0.5,
      material: "AISI 4340",
    });
    expect(r.P0_MPa).toBe(0);
    expect(r.sigma_surface_MPa).toBe(0);
  });

  it("zero flank wear → zero burnishing", () => {
    const r = engine.calcBurnishingStress({
      flank_wear_mm: 0,
      material: "AISI 4340",
    });
    expect(r.sigma_burnish_surface_MPa).toBe(0);
    expect(r.burnish_depth_mm).toBe(0);
    expect(r.burnish_factor).toBe(0);
  });

  it("zero temperature rise → zero thermal stress", () => {
    const r = engine.calcThermalStress({
      delta_T_surface: 0,
      contact_time_s: 1e-4,
      material: "AISI 4340",
    });
    expect(r.sigma_thermal_surface_MPa).toBe(0);
    expect(r.thermal_depth_mm).toBe(0);
  });

  // ── erfc Utility ──────────────────────────────────────────────

  it("erfc boundary values are correct", () => {
    expect(erfc(0)).toBeCloseTo(1.0, 4);
    // erfc(∞) → 0
    expect(erfc(5)).toBeCloseTo(0, 6);
    // erfc(-x) = 2 - erfc(x)
    expect(erfc(-1)).toBeCloseTo(2 - erfc(1), 4);
  });

  // ── Material Database ─────────────────────────────────────────

  it("lists all 6 materials", () => {
    const mats = engine.listMaterials();
    expect(mats).toHaveLength(6);
    expect(mats).toContain("AISI 4340");
    expect(mats).toContain("Ti-6Al-4V");
    expect(mats).toContain("IN718");
    expect(mats).toContain("AISI 316L");
    expect(mats).toContain("Al7075-T6");
    expect(mats).toContain("AISI 52100");
  });

  it("throws on unknown material", () => {
    expect(() =>
      engine.calcHertzianStress({
        cutting_force_N: 100,
        contact_radius_mm: 0.5,
        material: "Unobtanium",
      })
    ).toThrow("Unknown material");
  });

  // ── Cross-Model Consistency ───────────────────────────────────

  it("Al7075 has lower residual stress than AISI 52100", () => {
    const params = {
      cutting_force_N: 500,
      contact_radius_mm: 0.5,
    };
    const rAl = engine.calcHertzianStress({
      ...params,
      material: "Al7075-T6",
    });
    const rSteel = engine.calcHertzianStress({
      ...params,
      material: "AISI 52100",
    });
    // Higher E → higher P0 → higher stress magnitude
    expect(Math.abs(rSteel.sigma_surface_MPa)).toBeGreaterThan(
      Math.abs(rAl.sigma_surface_MPa)
    );
  });

  it("phase transform only applies to eligible materials", () => {
    // AISI 52100 is eligible
    expect(
      MATERIAL_DB["AISI 52100"].phase_transform_applicable
    ).toBe(true);
    // Ti-6Al-4V is not
    expect(
      MATERIAL_DB["Ti-6Al-4V"].phase_transform_applicable
    ).toBe(false);
    // Combined profile with phase transform on non-eligible → no transform component
    const r = engine.calcCombinedProfile({
      cutting_force_N: 500,
      contact_radius_mm: 0.5,
      delta_T_surface: 200,
      contact_time_s: 1e-4,
      material: "Ti-6Al-4V",
      include_phase_transform: true,
    });
    for (const pt of r.profile) {
      expect(pt.sigma_transform_MPa).toBe(0);
    }
  });
});
