/**
 * Tests for FundamentalPhysicsCompletionEngine
 * 25 tests: Archard (6), Merchant (7), Grinding (6), Hertz (6)
 */

import { describe, it, expect } from "vitest";
import { fundamentalPhysicsCompletionEngine as eng } from "../engines/FundamentalPhysicsCompletionEngine.js";

// ─── Archard Wear (6 tests) ────────────────────────────────────────

describe("Archard Wear Model", () => {
  it("1. wear volume is positive and proportional to force × distance", () => {
    const base = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 5000,
      material_pair: "carbide_steel",
    });
    const doubled = eng.archardWear({
      normal_force_N: 200, sliding_distance_mm: 2000, hardness_mpa: 5000,
      material_pair: "carbide_steel",
    });
    expect(base.wear_volume_mm3).toBeGreaterThan(0);
    // 2× force × 2× distance = 4× volume
    expect(doubled.wear_volume_mm3).toBeCloseTo(base.wear_volume_mm3 * 4, 8);
  });

  it("2. higher K → more wear (HSS > carbide)", () => {
    const carbide = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 5000,
      material_pair: "carbide_steel",
    });
    const hss = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 5000,
      material_pair: "hss_steel",
    });
    expect(hss.wear_volume_mm3).toBeGreaterThan(carbide.wear_volume_mm3);
    expect(hss.wear_coefficient_K).toBeGreaterThan(carbide.wear_coefficient_K);
  });

  it("3. harder surface → less wear (inverse HB relationship)", () => {
    const soft = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 3000,
      material_pair: "carbide_steel",
    });
    const hard = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 6000,
      material_pair: "carbide_steel",
    });
    expect(hard.wear_volume_mm3).toBeLessThan(soft.wear_volume_mm3);
    // Double hardness → half wear
    expect(hard.wear_volume_mm3).toBeCloseTo(soft.wear_volume_mm3 / 2, 6);
  });

  it("4. mild regime correctly identified for K < 1e-3", () => {
    const mild = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 5000,
      material_pair: "carbide_steel",
    });
    expect(mild.regime).toBe("mild");

    const severe = eng.archardWear({
      normal_force_N: 100, sliding_distance_mm: 1000, hardness_mpa: 5000,
      wear_coefficient_K: 0.01,
    });
    expect(severe.regime).toBe("severe");
  });

  it("5. tool wear: VB increases with cutting time (monotonic)", () => {
    const t1 = eng.archardToolWear({
      cutting_speed_mpm: 200, feed_mm_rev: 0.2, depth_mm: 2,
      material_hardness_HB: 200, tool_material: "carbide", cutting_time_min: 5,
    });
    const t2 = eng.archardToolWear({
      cutting_speed_mpm: 200, feed_mm_rev: 0.2, depth_mm: 2,
      material_hardness_HB: 200, tool_material: "carbide", cutting_time_min: 15,
    });
    const t3 = eng.archardToolWear({
      cutting_speed_mpm: 200, feed_mm_rev: 0.2, depth_mm: 2,
      material_hardness_HB: 200, tool_material: "carbide", cutting_time_min: 30,
    });
    expect(t2.predicted_vb_mm).toBeGreaterThan(t1.predicted_vb_mm);
    expect(t3.predicted_vb_mm).toBeGreaterThan(t2.predicted_vb_mm);
  });

  it("6. tool wear: higher speed → faster VB growth", () => {
    const slow = eng.archardToolWear({
      cutting_speed_mpm: 100, feed_mm_rev: 0.2, depth_mm: 2,
      material_hardness_HB: 200, tool_material: "carbide", cutting_time_min: 10,
    });
    const fast = eng.archardToolWear({
      cutting_speed_mpm: 300, feed_mm_rev: 0.2, depth_mm: 2,
      material_hardness_HB: 200, tool_material: "carbide", cutting_time_min: 10,
    });
    expect(fast.predicted_vb_mm).toBeGreaterThan(slow.predicted_vb_mm);
  });
});

// ─── Merchant Shear Angle (7 tests) ────────────────────────────────

describe("Merchant Shear Angle & Force Circle", () => {
  it("7. shear angle = 45 - β/2 + γ/2 for known μ and γ", () => {
    // μ = 0.5 → β = atan(0.5) ≈ 26.565°, γ = 10°
    const res = eng.merchantShearAngle({ rake_angle_deg: 10, friction_coefficient: 0.5 });
    const expected = 45 - Math.atan(0.5) * 180 / Math.PI / 2 + 10 / 2;
    expect(res.merchant_phi_deg).toBeCloseTo(expected, 2);
  });

  it("8. Lee-Shaffer gives different angle than Merchant", () => {
    const res = eng.merchantShearAngle({ rake_angle_deg: 10, friction_coefficient: 0.5 });
    expect(res.lee_shaffer_phi_deg).not.toBeCloseTo(res.merchant_phi_deg, 1);
  });

  it("9. chip compression ratio > 1 (chip is thicker than uncut)", () => {
    const res = eng.merchantShearAngle({ rake_angle_deg: 6, friction_coefficient: 0.6 });
    expect(res.chip_compression_ratio).toBeGreaterThan(1);
  });

  it("10. larger rake angle → larger shear angle", () => {
    const low = eng.merchantShearAngle({ rake_angle_deg: 0, friction_coefficient: 0.5 });
    const high = eng.merchantShearAngle({ rake_angle_deg: 15, friction_coefficient: 0.5 });
    expect(high.merchant_phi_deg).toBeGreaterThan(low.merchant_phi_deg);
  });

  it("11. higher friction → smaller shear angle", () => {
    const lowFric = eng.merchantShearAngle({ rake_angle_deg: 10, friction_coefficient: 0.3 });
    const highFric = eng.merchantShearAngle({ rake_angle_deg: 10, friction_coefficient: 0.8 });
    expect(highFric.merchant_phi_deg).toBeLessThan(lowFric.merchant_phi_deg);
  });

  it("12. force circle: Fc + Ft resultant matches R", () => {
    const res = eng.merchantForceCircle({
      shear_strength_mpa: 400, chip_width_mm: 3, uncut_chip_thickness_mm: 0.2,
      rake_angle_deg: 10, friction_coefficient: 0.5, cutting_speed_mpm: 200,
    });
    const calcR = Math.sqrt(res.cutting_force_N ** 2 + res.thrust_force_N ** 2);
    expect(res.resultant_force_N).toBeCloseTo(calcR, 1);
    expect(res.cutting_force_N).toBeGreaterThan(0);
    expect(res.thrust_force_N).toBeGreaterThan(0);
  });

  it("13. cutting power = Fc × Vc / 60000", () => {
    const Vc = 200;
    const res = eng.merchantForceCircle({
      shear_strength_mpa: 400, chip_width_mm: 3, uncut_chip_thickness_mm: 0.2,
      rake_angle_deg: 10, friction_coefficient: 0.5, cutting_speed_mpm: Vc,
    });
    const expectedPower = (res.cutting_force_N * Vc) / 60000;
    expect(res.power_kw).toBeCloseTo(expectedPower, 3);
  });
});

// ─── Grinding Physics (6 tests) ────────────────────────────────────

describe("Grinding Physics (Grit Level)", () => {
  it("14. finer grit (higher mesh) → smaller chip thickness", () => {
    const coarse = eng.singleGritMechanics({
      grit_size_mesh: 60, wheel_speed_mps: 30, workspeed_mpm: 15,
      depth_of_cut_mm: 0.02, wheel_diameter_mm: 200, material_hardness_HB: 250,
    });
    const fine = eng.singleGritMechanics({
      grit_size_mesh: 220, wheel_speed_mps: 30, workspeed_mpm: 15,
      depth_of_cut_mm: 0.02, wheel_diameter_mm: 200, material_hardness_HB: 250,
    });
    expect(fine.max_chip_thickness_um).toBeLessThan(coarse.max_chip_thickness_um);
  });

  it("15. active grit density increases with grit number", () => {
    const coarse = eng.singleGritMechanics({
      grit_size_mesh: 60, wheel_speed_mps: 30, workspeed_mpm: 15,
      depth_of_cut_mm: 0.02, wheel_diameter_mm: 200, material_hardness_HB: 250,
    });
    const fine = eng.singleGritMechanics({
      grit_size_mesh: 220, wheel_speed_mps: 30, workspeed_mpm: 15,
      depth_of_cut_mm: 0.02, wheel_diameter_mm: 200, material_hardness_HB: 250,
    });
    expect(fine.active_grits_per_mm2).toBeGreaterThan(coarse.active_grits_per_mm2);
  });

  it("16. specific grinding energy > specific cutting energy (typically 10-100 J/mm³)", () => {
    const res = eng.singleGritMechanics({
      grit_size_mesh: 80, wheel_speed_mps: 30, workspeed_mpm: 15,
      depth_of_cut_mm: 0.02, wheel_diameter_mm: 200, material_hardness_HB: 250,
    });
    // Typical cutting energy is 1-5 J/mm³; grinding is 10-100+
    expect(res.specific_grinding_energy_j_mm3).toBeGreaterThan(10);
    expect(res.specific_grinding_energy_j_mm3).toBeLessThan(200);
  });

  it("17. thermal model: temp increases with specific energy", () => {
    const low = eng.grindingThermalModel({
      specific_energy_j_mm3: 30, workspeed_mpm: 15, depth_of_cut_mm: 0.02,
      contact_length_mm: 2, thermal_conductivity_w_mk: 50, thermal_diffusivity_m2s: 1.2e-5,
    });
    const high = eng.grindingThermalModel({
      specific_energy_j_mm3: 80, workspeed_mpm: 15, depth_of_cut_mm: 0.02,
      contact_length_mm: 2, thermal_conductivity_w_mk: 50, thermal_diffusivity_m2s: 1.2e-5,
    });
    expect(high.max_surface_temp_C).toBeGreaterThan(low.max_surface_temp_C);
  });

  it("18. burn risk true when temp > threshold", () => {
    // Use aggressive conditions: high energy, slow feed, deep cut
    const res = eng.grindingThermalModel({
      specific_energy_j_mm3: 100, workspeed_mpm: 5, depth_of_cut_mm: 0.05,
      contact_length_mm: 4, thermal_conductivity_w_mk: 50, thermal_diffusivity_m2s: 1.2e-5,
    });
    // Check logical consistency: burn_risk should match temp vs threshold
    expect(res.burn_risk).toBe(res.max_surface_temp_C > res.burn_threshold_C);
  });

  it("19. energy partition to workpiece < 1", () => {
    const res = eng.grindingThermalModel({
      specific_energy_j_mm3: 50, workspeed_mpm: 15, depth_of_cut_mm: 0.02,
      contact_length_mm: 2, thermal_conductivity_w_mk: 50, thermal_diffusivity_m2s: 1.2e-5,
    });
    expect(res.energy_partition_workpiece).toBeGreaterThan(0);
    expect(res.energy_partition_workpiece).toBeLessThan(1);
  });
});

// ─── Hertz Contact (6 tests) ──────────────────────────────────────

describe("Hertz Contact Mechanics", () => {
  it("20. contact radius increases with force^(1/3)", () => {
    const f1 = eng.hertzContact({
      normal_force_N: 100, radius_1_mm: 5, E1_gpa: 600, E2_gpa: 200,
    });
    const f8 = eng.hertzContact({
      normal_force_N: 800, radius_1_mm: 5, E1_gpa: 600, E2_gpa: 200,
    });
    // 8× force → 2× contact radius (8^(1/3) = 2)
    const ratio = f8.contact_radius_mm / f1.contact_radius_mm;
    expect(ratio).toBeCloseTo(2, 1);
  });

  it("21. max pressure at center > mean pressure", () => {
    const res = eng.hertzContact({
      normal_force_N: 500, radius_1_mm: 5, E1_gpa: 600, E2_gpa: 200,
    });
    expect(res.max_pressure_mpa).toBeGreaterThan(res.mean_pressure_mpa);
    // For Hertz: p0 = 1.5 × p_mean
    expect(res.max_pressure_mpa).toBeCloseTo(1.5 * res.mean_pressure_mpa, 0);
  });

  it("22. max shear stress at depth ≈ 0.48 × contact radius", () => {
    const res = eng.hertzContact({
      normal_force_N: 500, radius_1_mm: 5, E1_gpa: 600, E2_gpa: 200,
    });
    expect(res.subsurface_depth_of_max_shear_mm).toBeCloseTo(0.48 * res.contact_radius_mm, 4);
    expect(res.max_shear_stress_mpa).toBeGreaterThan(0);
  });

  it("23. stiffer materials → smaller contact area", () => {
    const soft = eng.hertzContact({
      normal_force_N: 500, radius_1_mm: 5, E1_gpa: 200, E2_gpa: 100,
    });
    const stiff = eng.hertzContact({
      normal_force_N: 500, radius_1_mm: 5, E1_gpa: 600, E2_gpa: 400,
    });
    expect(stiff.contact_area_mm2).toBeLessThan(soft.contact_area_mm2);
  });

  it("24. sphere on flat plate: positive finite contact area", () => {
    const res = eng.hertzContact({
      normal_force_N: 100, radius_1_mm: 10,
      radius_2_mm: 1e9, // flat plate
      E1_gpa: 600, E2_gpa: 200,
    });
    expect(res.contact_area_mm2).toBeGreaterThan(0);
    expect(res.contact_area_mm2).toBeLessThan(100); // finite, not infinite
    expect(res.contact_radius_mm).toBeGreaterThan(0);
  });

  it("25. deformation positive and finite", () => {
    const res = eng.hertzContact({
      normal_force_N: 500, radius_1_mm: 5, E1_gpa: 600, E2_gpa: 200,
    });
    expect(res.deformation_mm).toBeGreaterThan(0);
    expect(res.deformation_mm).toBeLessThan(1); // sub-mm for reasonable loads
    expect(isFinite(res.deformation_mm)).toBe(true);
  });
});
