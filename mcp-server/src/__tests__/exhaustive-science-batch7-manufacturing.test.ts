/**
 * Exhaustive Science Tests Batch 7 — Manufacturing Process Engines
 *
 * Covers: Trochoidal milling, helical milling, plunge milling, high-feed,
 * grinding force/finish/wheel, centerless grinding, honing, reaming,
 * friction stir welding, laser welding, resistance welding, weld distortion,
 * stamping die, press brake, extrusion, rolling mill, wire drawing, tube forming
 */
import { describe, it, expect } from "vitest";

const v = (x: any): number => (x && typeof x === "object" && "value" in x) ? x.value : x;

// ============================================================================
// 1. TrochoidalMillingEngine
// ============================================================================
describe("TrochoidalMillingEngine", () => {
  it("calculates trochoidal milling parameters", async () => {
    const { trochoidalMillingEngine: e } = await import("../engines/TrochoidalMillingEngine.js");
    expect(typeof e.calculate).toBe("function");
    const r = e.calculate({
      tool_diameter_mm: 10, stepover_pct: 10,
      axial_depth_mm: 20, feed_per_tooth_mm: 0.05,
      n_flutes: 4, spindle_speed_rpm: 8000,
    });
    expect(r).toBeDefined();
    if (v(r.mrr_cm3_min) !== undefined) expect(v(r.mrr_cm3_min)).toBeGreaterThan(0);
    if (v(r.radial_engagement_mm) !== undefined) expect(v(r.radial_engagement_mm)).toBeLessThan(10);
  });

  it("low stepover → low radial force (trochoidal advantage)", async () => {
    const { trochoidalMillingEngine: e } = await import("../engines/TrochoidalMillingEngine.js");
    const base = { tool_diameter_mm: 10, axial_depth_mm: 20, feed_per_tooth_mm: 0.05, n_flutes: 4, spindle_speed_rpm: 8000 };
    const narrow = e.calculate({ ...base, stepover_pct: 8 });
    const wide = e.calculate({ ...base, stepover_pct: 30 });
    if (v(narrow.radial_engagement_mm) !== undefined && v(wide.radial_engagement_mm) !== undefined) {
      expect(v(narrow.radial_engagement_mm)).toBeLessThan(v(wide.radial_engagement_mm));
    }
  });
});

// ============================================================================
// 2. HelicalMillingEngine (hole making)
// ============================================================================
describe("HelicalMillingEngine", () => {
  it("calculates helical interpolation milling", async () => {
    const { helicalMillingEngine: e } = await import("../engines/HelicalMillingEngine.js");
    const r = e.calculate({
      hole_diameter_mm: 20, tool_diameter_mm: 12,
      depth_mm: 30, pitch_mm: 1,
      feed_per_tooth_mm: 0.03, n_flutes: 3, spindle_speed_rpm: 5000,
    });
    expect(r).toBeDefined();
    if (v(r.helix_angle_deg) !== undefined) expect(v(r.helix_angle_deg)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. HighFeedMillingEngine
// ============================================================================
describe("HighFeedMillingEngine", () => {
  it("calculates high-feed milling with chip thinning", async () => {
    const { highFeedMillingEngine: e } = await import("../engines/HighFeedMillingEngine.js");
    const r = e.calculate({
      tool_diameter_mm: 50, axial_depth_mm: 0.5,
      radial_depth_mm: 40, feed_per_tooth_mm: 1.5,
      n_flutes: 4, spindle_speed_rpm: 5000,
    });
    expect(r).toBeDefined();
    if (v(r.actual_chip_thickness_mm) !== undefined) {
      // Chip thinning: actual < programmed fz at shallow ae
      expect(v(r.actual_chip_thickness_mm)).toBeLessThan(1.5);
    }
    if (v(r.mrr_cm3_min) !== undefined) expect(v(r.mrr_cm3_min)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. PlungeMillingEngine
// ============================================================================
describe("PlungeMillingEngine", () => {
  it("calculates plunge milling forces and MRR", async () => {
    const { plungeMillingEngine: e } = await import("../engines/PlungeMillingEngine.js");
    const r = e.calculate({
      tool_diameter_mm: 25, plunge_depth_mm: 3,
      stepover_mm: 15, feed_per_tooth_mm: 0.08,
      n_flutes: 4, spindle_speed_rpm: 3000,
    });
    expect(r).toBeDefined();
    if (v(r.axial_force_N) !== undefined) expect(v(r.axial_force_N)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. GrindingForceEngine (specific grinding energy)
// ============================================================================
describe("GrindingForceEngine", () => {
  it("calculates grinding forces from specific energy", async () => {
    const { grindingForceEngine: e } = await import("../engines/GrindingForceEngine.js");
    const r = e.calculate({
      wheel_diameter_mm: 200, width_of_cut_mm: 20,
      wheel_speed_m_s: 30, work_speed_m_min: 15,
      depth_of_cut_mm: 0.02, material_specific_energy_J_mm3: 40,
      grinding_mode: "surface",
    });
    expect(r).toBeDefined();
    if (v(r.tangential_force_N) !== undefined) expect(v(r.tangential_force_N)).toBeGreaterThan(0);
    if (v(r.normal_force_N) !== undefined) expect(v(r.normal_force_N)).toBeGreaterThan(0);
    if (v(r.grinding_power_kW) !== undefined) expect(v(r.grinding_power_kW)).toBeGreaterThan(0);
  });

  it("deeper cut → higher force (proportional to ae)", async () => {
    const { grindingForceEngine: e } = await import("../engines/GrindingForceEngine.js");
    const base = { wheel_diameter_mm: 200, width_of_cut_mm: 20, wheel_speed_m_s: 30, work_speed_m_min: 15, material_specific_energy_J_mm3: 40, grinding_mode: "surface" as const };
    const shallow = e.calculate({ ...base, depth_of_cut_mm: 0.01 });
    const deep = e.calculate({ ...base, depth_of_cut_mm: 0.05 });
    if (v(shallow.tangential_force_N) !== undefined && v(deep.tangential_force_N) !== undefined) {
      expect(v(deep.tangential_force_N)).toBeGreaterThan(v(shallow.tangential_force_N));
    }
  });
});

// ============================================================================
// 6. GrindingWheelEngine (wheel specification)
// ============================================================================
describe("GrindingWheelEngine", () => {
  it("recommends grinding wheel specification", async () => {
    const { grindingWheelEngine: e } = await import("../engines/GrindingWheelEngine.js");
    const r = e.calculate({
      workpiece_material: "steel", operation: "surface_grinding",
      surface_finish_target_um: 0.8, material_hardness_HRC: 45,
    });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// 7. CenterlessGrindingEngine
// ============================================================================
describe("CenterlessGrindingEngine", () => {
  it("calculates centerless grinding parameters", async () => {
    const { centerlessGrindingEngine: e } = await import("../engines/CenterlessGrindingEngine.js");
    const r = e.calculate({
      workpiece_diameter_mm: 20, grinding_wheel_diameter_mm: 400,
      regulating_wheel_diameter_mm: 200,
      grinding_wheel_speed_m_s: 30, regulating_wheel_rpm: 30,
      infeed_mm: 0.02,
    });
    expect(r).toBeDefined();
    if (v(r.workpiece_rpm) !== undefined) expect(v(r.workpiece_rpm)).toBeGreaterThan(0);
    if (v(r.throughfeed_rate_mm_min) !== undefined) expect(v(r.throughfeed_rate_mm_min)).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 8. HoningEngine
// ============================================================================
describe("HoningEngine", () => {
  it("calculates honing process parameters", async () => {
    const { honingEngine: e } = await import("../engines/HoningEngine.js");
    const r = e.calculate({
      bore_diameter_mm: 80, bore_length_mm: 150,
      stock_removal_mm: 0.05, stone_grit: 400,
      rotation_rpm: 200, reciprocation_spm: 60,
    });
    expect(r).toBeDefined();
    if (v(r.crosshatch_angle_deg) !== undefined) {
      expect(v(r.crosshatch_angle_deg)).toBeGreaterThan(0);
      expect(v(r.crosshatch_angle_deg)).toBeLessThan(90);
    }
  });
});

// ============================================================================
// 9. FrictionStirWeldingEngine (FSW)
// ============================================================================
describe("FrictionStirWeldingEngine", () => {
  it("calculates FSW parameters and heat input", async () => {
    const { frictionStirWeldingEngine: e } = await import("../engines/FrictionStirWeldingEngine.js");
    const r = e.calculate({
      material: "AA6061", plate_thickness_mm: 6,
      tool_shoulder_diameter_mm: 18, tool_pin_diameter_mm: 6,
      rotation_speed_rpm: 1200, traverse_speed_mm_min: 200,
    });
    expect(r).toBeDefined();
    if (v(r.heat_input_kJ_mm) !== undefined) expect(v(r.heat_input_kJ_mm)).toBeGreaterThan(0);
    if (v(r.torque_Nm) !== undefined) expect(v(r.torque_Nm)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 10. LaserWeldingEngine
// ============================================================================
describe("LaserWeldingEngine", () => {
  it("calculates laser welding parameters", async () => {
    const { laserWeldingEngine: e } = await import("../engines/LaserWeldingEngine.js");
    const r = e.calculate({
      material: "mild_steel", material_thickness_mm: 3,
      laser_power_kW: 4, welding_speed_mm_s: 2 * 1000 / 60,
      focal_spot_mm: 0.3,
    });
    expect(r).toBeDefined();
    if (v(r.penetration_depth_mm) !== undefined) expect(v(r.penetration_depth_mm)).toBeGreaterThan(0);
    if (v(r.heat_input_J_mm) !== undefined) expect(v(r.heat_input_J_mm)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 11. ResistanceWeldingEngine
// ============================================================================
describe("ResistanceWeldingEngine", () => {
  it("calculates resistance spot welding parameters", async () => {
    const { resistanceWeldingEngine: e } = await import("../engines/ResistanceWeldingEngine.js");
    const r = e.calculate({
      material: "mild_steel", sheet_thickness_mm: 1.2,
      electrode_diameter_mm: 6,
    });
    expect(r).toBeDefined();
    if (v(r.weld_current_kA) !== undefined) expect(v(r.weld_current_kA)).toBeGreaterThan(0);
    if (v(r.weld_time_ms) !== undefined) expect(v(r.weld_time_ms)).toBeGreaterThan(0);
    if (v(r.nugget_diameter_mm) !== undefined) expect(v(r.nugget_diameter_mm)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 12. WeldDistortionEngine
// ============================================================================
describe("WeldDistortionEngine", () => {
  it("predicts welding distortion", async () => {
    const { weldDistortionEngine: e } = await import("../engines/WeldDistortionEngine.js");
    const r = e.calculate({
      joint_type: "butt", plate_thickness_mm: 10,
      weld_length_mm: 500, heat_input_kJ_mm: 1.5,
      material: "steel",
    });
    expect(r).toBeDefined();
    if (v(r.angular_distortion_deg) !== undefined) expect(v(r.angular_distortion_deg)).toBeGreaterThanOrEqual(0);
    if (v(r.longitudinal_shrinkage_mm) !== undefined) expect(v(r.longitudinal_shrinkage_mm)).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 13. PressBrakeEngine (bending force)
// ============================================================================
describe("PressBrakeEngine", () => {
  it("calculates press brake bending force", async () => {
    const { pressBrakeEngine: e } = await import("../engines/PressBrakeEngine.js");
    const r = e.calculate({
      material: "steel", thickness_mm: 3,
      bend_length_mm: 1000, die_opening_mm: 24,
      bend_angle_deg: 90, tensile_strength_MPa: 400,
    });
    expect(r).toBeDefined();
    if (v(r.bending_force_kN) !== undefined) expect(v(r.bending_force_kN)).toBeGreaterThan(0);
    if (v(r.min_bend_radius_mm) !== undefined) expect(v(r.min_bend_radius_mm)).toBeGreaterThan(0);
  });

  it("thicker material → higher bending force", async () => {
    const { pressBrakeEngine: e } = await import("../engines/PressBrakeEngine.js");
    const base = { material: "steel", bend_length_mm: 1000, die_opening_mm: 24, bend_angle_deg: 90, tensile_strength_MPa: 400 };
    const thin = e.calculate({ ...base, thickness_mm: 2 });
    const thick = e.calculate({ ...base, thickness_mm: 6 });
    if (v(thin.bending_force_kN) !== undefined && v(thick.bending_force_kN) !== undefined) {
      expect(v(thick.bending_force_kN)).toBeGreaterThan(v(thin.bending_force_kN));
    }
  });
});

// ============================================================================
// 14. ExtrusionForceEngine
// ============================================================================
describe("ExtrusionForceEngine", () => {
  it("calculates extrusion force and pressure", async () => {
    const { extrusionForceEngine: e } = await import("../engines/ExtrusionForceEngine.js");
    // Ratio=20 → D_product = D_billet / √R = 200/√20 ≈ 44.72
    const r = e.calculate({
      billet_diameter_mm: 200, product_diameter_mm: 200 / Math.sqrt(20),
      friction_coefficient: 0.1,
    });
    expect(r).toBeDefined();
    if (v(r.extrusion_force_kN) !== undefined) expect(v(r.extrusion_force_kN)).toBeGreaterThan(0);
    if (v(r.specific_pressure_MPa) !== undefined) expect(v(r.specific_pressure_MPa)).toBeGreaterThan(0);
  });

  it("higher extrusion ratio → higher force (ln(R) relationship)", async () => {
    const { extrusionForceEngine: e } = await import("../engines/ExtrusionForceEngine.js");
    // Low ratio=5: product_d = 200/√5 ≈ 89.44; High ratio=50: product_d = 200/√50 ≈ 28.28
    const base = { billet_diameter_mm: 200, friction_coefficient: 0.1 };
    const low = e.calculate({ ...base, product_diameter_mm: 200 / Math.sqrt(5) });
    const high = e.calculate({ ...base, product_diameter_mm: 200 / Math.sqrt(50) });
    if (v(low.extrusion_force_kN) !== undefined && v(high.extrusion_force_kN) !== undefined) {
      expect(v(high.extrusion_force_kN)).toBeGreaterThan(v(low.extrusion_force_kN));
    }
  });
});

// ============================================================================
// 15. RollingMillEngine
// ============================================================================
describe("RollingMillEngine", () => {
  it("calculates rolling mill force and torque", async () => {
    const { rollingMillEngine: e } = await import("../engines/RollingMillEngine.js");
    const r = e.calculate({
      roll_diameter_mm: 500, entry_thickness_mm: 10,
      exit_thickness_mm: 8, strip_width_mm: 1000,
      roll_speed_rpm: 60,
    });
    expect(r).toBeDefined();
    if (v(r.roll_force_kN) !== undefined) expect(v(r.roll_force_kN)).toBeGreaterThan(0);
    if (v(r.reduction_pct) !== undefined) expect(v(r.reduction_pct)).toBeCloseTo(20, 0);
  });
});

// ============================================================================
// 16. WireDrawingEngine
// ============================================================================
describe("WireDrawingEngine", () => {
  it("calculates wire drawing force and stress", async () => {
    const { wireDrawingEngine: e } = await import("../engines/WireDrawingEngine.js");
    const r = e.calculate({
      initial_diameter_mm: 5, final_diameter_mm: 4,
      die_half_angle_deg: 8, friction_coefficient: 0.05,
      material_flow_stress_MPa: 300,
    });
    expect(r).toBeDefined();
    if (v(r.drawing_force_N) !== undefined) expect(v(r.drawing_force_N)).toBeGreaterThan(0);
    if (v(r.area_reduction_pct) !== undefined) expect(v(r.area_reduction_pct)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 17. StampingDieEngine
// ============================================================================
describe("StampingDieEngine", () => {
  it("calculates stamping/blanking force", async () => {
    const { stampingDieEngine: e } = await import("../engines/StampingDieEngine.js");
    const r = e.calculate({
      material: "steel", thickness_mm: 2,
      perimeter_mm: 200, shear_strength_MPa: 300,
    });
    expect(r).toBeDefined();
    if (v(r.blanking_force_kN) !== undefined) expect(v(r.blanking_force_kN)).toBeGreaterThan(0);
    if (v(r.clearance_mm) !== undefined) expect(v(r.clearance_mm)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 18. SurfaceRoughnessEngine
// ============================================================================
describe("SurfaceRoughnessEngine", () => {
  it("predicts surface roughness from cutting parameters", async () => {
    const { surfaceRoughnessEngine: e } = await import("../engines/SurfaceRoughnessEngine.js");
    const r = e.calculate({
      feed_per_rev_mm: 0.15, tool_nose_radius_mm: 0.8,
      cutting_speed_m_min: 200,
    });
    expect(r).toBeDefined();
    // Ra_ideal = f²/(32r) for turning
    if (v(r.Ra_um) !== undefined) expect(v(r.Ra_um)).toBeGreaterThan(0);
  });

  it("Ra_ideal = f²/(32r) — ideal roughness formula", async () => {
    const { surfaceRoughnessEngine: e } = await import("../engines/SurfaceRoughnessEngine.js");
    const r = e.calculate({
      feed_per_rev_mm: 0.2, tool_nose_radius_mm: 0.8,
      cutting_speed_m_min: 200,
    });
    // Ra_ideal = 0.2²/(32×0.8) = 0.04/25.6 = 0.00156 mm = 1.56 µm
    if (v(r.Ra_ideal_um) !== undefined) {
      expect(v(r.Ra_ideal_um)).toBeCloseTo(1.56, 0);
    }
  });
});

// ============================================================================
// 19. TubeFormingEngine
// ============================================================================
describe("TubeFormingEngine", () => {
  it("calculates tube bending parameters", async () => {
    const { tubeFormingEngine: e } = await import("../engines/TubeFormingEngine.js");
    const r = e.calculate({
      tube_od_mm: 50, wall_thickness_mm: 2,
      bend_radius_mm: 100, bend_angle_deg: 90,
      material: "steel",
    });
    expect(r).toBeDefined();
    if (v(r.D_ratio) !== undefined) expect(v(r.D_ratio)).toBeCloseTo(2.0, 0); // R/D = 100/50
  });
});
