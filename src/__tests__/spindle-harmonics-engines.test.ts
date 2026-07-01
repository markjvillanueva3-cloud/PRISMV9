/**
 * Spindle Harmonics Quality + Wear Force Compensation + Vibration-Corrected Surface Finish Tests
 */
import { describe, it, expect } from "vitest";
import { spindleHarmonicsQualityEngine } from "../engines/SpindleHarmonicsQualityEngine.js";
import { wearForceCompensationEngine } from "../engines/WearForceCompensationEngine.js";
import { SurfaceFinishEngine } from "../engines/SurfaceFinishEngine.js";

// ============================================================================
// SpindleHarmonicsQualityEngine
// ============================================================================
describe("SpindleHarmonicsQualityEngine", () => {
  const modes = {
    natural_frequencies_Hz: [800, 1500, 3000],
    damping_ratios: [0.03, 0.02, 0.04],
  };

  it("analyze: returns quality score and excitations", () => {
    const r = spindleHarmonicsQualityEngine.analyze({
      spindle_rpm: 6000,
      num_flutes: 4,
      machine_modes: modes,
    });
    expect(r.tooth_passing_freq_Hz).toBe(400);
    expect(r.excitations.length).toBeGreaterThan(0);
    expect(r.quality_score).toBeGreaterThanOrEqual(0);
    expect(r.quality_score).toBeLessThanOrEqual(100);
    expect(r.surface_penalty_factor).toBeGreaterThanOrEqual(1.0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("analyze: detects resonance when TPF harmonic hits natural frequency", () => {
    // 2×TPF = 2 × (12000 × 4 / 60) = 1600 Hz ≈ 1500 Hz mode
    const r = spindleHarmonicsQualityEngine.analyze({
      spindle_rpm: 12000,
      num_flutes: 4,
      machine_modes: modes,
    });
    // Should detect the 2nd harmonic near 1500 Hz mode
    const nearMode = r.excitations.find(e =>
      e.harmonic_order === 2 && e.nearest_mode_Hz === 1500
    );
    expect(nearMode).toBeDefined();
    if (nearMode) {
      expect(nearMode.amplification_factor).toBeGreaterThan(1.5);
    }
  });

  it("analyze: low quality score when exciting resonance", () => {
    // TPF = 1500 RPM × 4 flutes / 60 = 100 Hz → 8th harmonic = 800 Hz = exact mode
    const r = spindleHarmonicsQualityEngine.analyze({
      spindle_rpm: 1500,
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800], damping_ratios: [0.02] },
      max_harmonic_order: 10,
    });
    expect(r.quality_score).toBeLessThan(50);
    expect(r.surface_penalty_factor).toBeGreaterThan(1.0);
  });

  it("findOptimalRpm: returns optimal RPM outside resonance zones", () => {
    const r = spindleHarmonicsQualityEngine.findOptimalRpm(
      4, modes, 3000, 15000, 100
    );
    expect(r.optimal_rpm).toBeGreaterThanOrEqual(3000);
    expect(r.optimal_rpm).toBeLessThanOrEqual(15000);
    expect(r.quality_score).toBeGreaterThan(0);
    expect(r.top_5_rpms.length).toBe(5);
    expect(r.top_5_rpms[0].score).toBeGreaterThanOrEqual(r.top_5_rpms[4].score);
  });

  it("findOptimalRpm: identifies RPMs to avoid", () => {
    const r = spindleHarmonicsQualityEngine.findOptimalRpm(
      4,
      { natural_frequencies_Hz: [500, 1000], damping_ratios: [0.01, 0.01] },
      1000, 10000, 50
    );
    // Very low damping should create some avoid zones
    if (r.avoid_rpms.length > 0) {
      expect(r.avoid_rpms[0].score).toBeLessThan(30);
    }
  });

  it("qualityMap: returns points and sweet spots", () => {
    const r = spindleHarmonicsQualityEngine.qualityMap(
      4, modes, 3000, 12000, 500
    );
    expect(r.points.length).toBeGreaterThan(0);
    expect(r.rpm_min).toBe(3000);
    expect(r.rpm_max).toBe(12000);
    for (const pt of r.points) {
      expect(pt.quality_score).toBeGreaterThanOrEqual(0);
      expect(pt.quality_score).toBeLessThanOrEqual(100);
    }
  });
});

// ============================================================================
// WearForceCompensationEngine — Archard Wear
// ============================================================================
describe("WearForceCompensationEngine — Archard", () => {
  it("archardWear: returns wear rate for cast iron", () => {
    const r = wearForceCompensationEngine.archardWear({
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      workpiece_hardness_HV: 220,
      tool_hardness_HV: 1600,
      workpiece_type: "cast_iron",
      cutting_time_min: 30,
    });
    expect(r.abrasive_wear_rate_um_min).toBeGreaterThan(0);
    expect(r.abrasive_vb_mm).toBeGreaterThan(0);
    expect(r.dominant_mechanism).toBeDefined();
    expect(r.hardness_ratio).toBeCloseTo(220 / 1600, 2);
  });

  it("archardWear: composite has higher K than general", () => {
    const composite = wearForceCompensationEngine.archardWear({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1.5,
      workpiece_hardness_HV: 300,
      tool_hardness_HV: 1600,
      workpiece_type: "composite",
    });
    const general = wearForceCompensationEngine.archardWear({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1.5,
      workpiece_hardness_HV: 300,
      tool_hardness_HV: 1600,
      workpiece_type: "general",
    });
    expect(composite.abrasive_wear_rate_um_min).toBeGreaterThan(
      general.abrasive_wear_rate_um_min
    );
    expect(composite.archard_K).toBeGreaterThan(general.archard_K);
  });

  it("archardWear: higher workpiece hardness increases wear", () => {
    const soft = wearForceCompensationEngine.archardWear({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      workpiece_hardness_HV: 150,
      tool_hardness_HV: 1600,
    });
    const hard = wearForceCompensationEngine.archardWear({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      workpiece_hardness_HV: 500,
      tool_hardness_HV: 1600,
    });
    expect(hard.abrasive_wear_rate_um_min).toBeGreaterThan(
      soft.abrasive_wear_rate_um_min
    );
  });
});

// ============================================================================
// WearForceCompensationEngine — Wear Force Correction
// ============================================================================
describe("WearForceCompensationEngine — Wear Force", () => {
  it("wearForceCorrection: force increases with wear", () => {
    const r = wearForceCompensationEngine.wearForceCorrection({
      fresh_force_N: 1000,
      flank_wear_vb_mm: 0.2,
    });
    expect(r.corrected_force_N).toBeGreaterThan(1000);
    expect(r.force_increase_pct).toBeGreaterThan(0);
    expect(r.ploughing_force_N).toBeGreaterThan(0);
    expect(r.is_excessive).toBe(false);
  });

  it("wearForceCorrection: excessive at VB > 0.3mm", () => {
    const r = wearForceCompensationEngine.wearForceCorrection({
      fresh_force_N: 1000,
      flank_wear_vb_mm: 0.5,
      tool_material: "carbide",
    });
    // Cw=1.5, VB=0.5 → factor=1.75 → 75% increase → excessive
    expect(r.force_increase_pct).toBeGreaterThan(50);
    expect(r.is_excessive).toBe(true);
    expect(r.recommendations.some(r => r.includes("SAFETY"))).toBe(true);
  });

  it("wearForceCorrection: zero wear gives no increase", () => {
    const r = wearForceCompensationEngine.wearForceCorrection({
      fresh_force_N: 1000,
      flank_wear_vb_mm: 0,
    });
    expect(r.corrected_force_N).toBe(1000);
    expect(r.force_increase_pct).toBe(0);
  });

  it("wearForceCorrection: negative rake increases Cw", () => {
    const pos = wearForceCompensationEngine.wearForceCorrection({
      fresh_force_N: 1000,
      flank_wear_vb_mm: 0.2,
      rake_angle_deg: 10,
    });
    const neg = wearForceCompensationEngine.wearForceCorrection({
      fresh_force_N: 1000,
      flank_wear_vb_mm: 0.2,
      rake_angle_deg: -10,
    });
    expect(neg.corrected_force_N).toBeGreaterThan(pos.corrected_force_N);
  });
});

// ============================================================================
// WearForceCompensationEngine — Thermal Deflection
// ============================================================================
describe("WearForceCompensationEngine — Thermal Deflection", () => {
  it("thermalDeflection: hot deflection > cold deflection", () => {
    const r = wearForceCompensationEngine.thermalDeflection({
      cutting_force_N: 500,
      tool_diameter_mm: 12,
      tool_overhang_mm: 60,
      tool_material: "carbide",
      cutting_temperature_C: 500,
    });
    expect(r.hot_deflection_mm).toBeGreaterThan(r.cold_deflection_mm);
    expect(r.deflection_increase_pct).toBeGreaterThan(0);
    expect(r.effective_youngs_GPa).toBeLessThan(r.cold_youngs_GPa);
  });

  it("thermalDeflection: HSS loses more stiffness than carbide", () => {
    const hss = wearForceCompensationEngine.thermalDeflection({
      cutting_force_N: 500,
      tool_diameter_mm: 12,
      tool_overhang_mm: 60,
      tool_material: "hss",
      cutting_temperature_C: 400,
    });
    const carb = wearForceCompensationEngine.thermalDeflection({
      cutting_force_N: 500,
      tool_diameter_mm: 12,
      tool_overhang_mm: 60,
      tool_material: "carbide",
      cutting_temperature_C: 400,
    });
    // HSS has higher alpha_E (4e-4 vs 3e-4), so more stiffness loss percentage-wise
    expect(hss.deflection_increase_pct).toBeGreaterThan(carb.deflection_increase_pct);
  });

  it("thermalDeflection: ambient temp gives no increase", () => {
    const r = wearForceCompensationEngine.thermalDeflection({
      cutting_force_N: 500,
      tool_diameter_mm: 12,
      tool_overhang_mm: 60,
      tool_material: "carbide",
      cutting_temperature_C: 20,
      ambient_temperature_C: 20,
    });
    expect(r.deflection_increase_pct).toBe(0);
    expect(r.cold_deflection_mm).toBe(r.hot_deflection_mm);
  });
});

// ============================================================================
// Vibration-Corrected Surface Finish
// ============================================================================
describe("SurfaceFinishEngine — Vibration Correction", () => {
  const engine = new SurfaceFinishEngine();

  it("vibration penalty factor degrades Ra", () => {
    const clean = engine.predict({
      process: "turning",
      feed_per_rev_mm: 0.15,
      tool_nose_radius_mm: 0.8,
    });
    const vibrating = engine.predict({
      process: "turning",
      feed_per_rev_mm: 0.15,
      tool_nose_radius_mm: 0.8,
      surface_penalty_factor: 2.0,
    });
    expect(vibrating.ra_um).toBeGreaterThan(clean.ra_um);
    expect(vibrating.ra_um).toBeCloseTo(clean.ra_um * 2.0, 1);
    const vibFactor = vibrating.correction_factors.find(
      f => f.factor === "vibration_harmonic"
    );
    expect(vibFactor).toBeDefined();
    expect(vibFactor!.multiplier).toBe(2.0);
  });

  it("vibration amplitude adds Ra via RSS combination", () => {
    const clean = engine.predict({
      process: "milling",
      feed_per_tooth_mm: 0.1,
      tool_diameter_mm: 10,
    });
    const vibrating = engine.predict({
      process: "milling",
      feed_per_tooth_mm: 0.1,
      tool_diameter_mm: 10,
      vibration_amplitude_um: 10,
    });
    expect(vibrating.ra_um).toBeGreaterThan(clean.ra_um);
    const vibFactor = vibrating.correction_factors.find(
      f => f.factor === "vibration_amplitude"
    );
    expect(vibFactor).toBeDefined();
  });

  it("small vibration amplitude (<0.5µm) has no effect", () => {
    const clean = engine.predict({
      process: "turning",
      feed_per_rev_mm: 0.15,
      tool_nose_radius_mm: 0.8,
    });
    const tiny = engine.predict({
      process: "turning",
      feed_per_rev_mm: 0.15,
      tool_nose_radius_mm: 0.8,
      vibration_amplitude_um: 0.3,
    });
    expect(tiny.ra_um).toBe(clean.ra_um);
  });

  it("high vibration generates recommendation", () => {
    const r = engine.predict({
      process: "turning",
      feed_per_rev_mm: 0.15,
      tool_nose_radius_mm: 0.8,
      vibration_amplitude_um: 10,
    });
    expect(r.recommendations.some(rec =>
      rec.includes("vibration") || rec.includes("harmonic")
    )).toBe(true);
  });
});
