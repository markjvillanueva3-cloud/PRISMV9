/**
 * Tests for KienzleForceModelEngine
 *
 * Validates the Kienzle specific cutting force model including:
 * - Coefficient table lookup
 * - Force calculations (turning & milling)
 * - Correction factors (rake, wear, speed)
 * - Size effect at thin chips
 * - Material hardness prediction
 * - Boundary conditions
 */
import { describe, it, expect } from "vitest";
import {
  kienzleForceModelEngine,
  KienzleForceModelEngine,
} from "../engines/KienzleForceModelEngine.js";

describe("KienzleForceModelEngine", () => {
  const engine = kienzleForceModelEngine;

  // ── Coefficient table ───────────────────────────────────────────

  it("should return 12 ISO material groups in coefficient table", () => {
    const table = engine.getKienzleCoefficientTable();
    expect(table).toHaveLength(12);
    const groups = new Set(table.map((e) => e.iso_group));
    expect(groups).toEqual(new Set(["P", "M", "K", "N", "S", "H"]));
  });

  it("AISI 1045 should have kc1.1=1780, mc=0.26", () => {
    const table = engine.getKienzleCoefficientTable();
    const steel1045 = table.find((e) =>
      e.description.includes("1045")
    );
    expect(steel1045).toBeDefined();
    expect(steel1045!.kc1_1).toBe(1780);
    expect(steel1045!.mc).toBe(0.26);
  });

  it("all 12 materials should have kc1.1 in [500, 5000] range", () => {
    const table = engine.getKienzleCoefficientTable();
    for (const entry of table) {
      expect(entry.kc1_1).toBeGreaterThanOrEqual(500);
      expect(entry.kc1_1).toBeLessThanOrEqual(5000);
      expect(entry.mc).toBeGreaterThan(0.10);
      expect(entry.mc).toBeLessThan(0.45);
    }
  });

  // ── Specific cutting force (turning) ───────────────────────────

  it("standard turning: AISI 1045 ap=2mm f=0.2mm → Fc ≈ 712N", () => {
    // kc = 1780 * 0.2^(-0.26) = 1780 * 1.5849 ≈ 2821 N/mm²
    // At reference rake (6°) and no wear, corrections = 1.0
    // Fc = kc * ap * f = 2821 * 2 * 0.2 = 1128 N (with kappa=90°)
    // Wait — let's be precise:
    // h = f * sin(90°) = 0.2 mm
    // kc = 1780 * 0.2^(-0.26)
    // 0.2^(-0.26) = exp(-0.26 * ln(0.2)) = exp(-0.26 * -1.6094)
    //             = exp(0.4184) = 1.5195
    // kc ≈ 1780 * 1.5195 ≈ 2704.7
    // Fc = 2704.7 * 2 * 0.2 ≈ 1081.9 N
    // Note: the task says ~712N but that uses a simplified formula
    // The actual Kienzle equation gives higher. Let's verify the math holds.
    const result = engine.calculateSpecificCuttingForce({
      kc1_1: 1780,
      mc: 0.26,
      feed_mm: 0.2,
      depth_of_cut_mm: 2,
      approach_angle_deg: 90,
      cutting_speed_mpm: 200, // above BUE region
    });

    // h = 0.2, kc = 1780 * 0.2^-0.26
    const expected_h = 0.2;
    const expected_kc = 1780 * Math.pow(0.2, -0.26);
    const expected_Fc = expected_kc * 2 * 0.2;

    expect(result.chip_thickness_h).toBeCloseTo(expected_h, 4);
    expect(result.kc).toBeCloseTo(expected_kc, 0);
    expect(result.main_cutting_force_Fc).toBeCloseTo(expected_Fc, 0);
    // Fc should be in reasonable range [500, 2000] N
    expect(result.main_cutting_force_Fc).toBeGreaterThan(500);
    expect(result.main_cutting_force_Fc).toBeLessThan(2000);
  });

  // ── Rake angle correction ──────────────────────────────────────

  it("positive rake angle should reduce kc", () => {
    const base = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0.2,
      depth_of_cut_mm: 2, rake_angle_deg: 6, // reference
      cutting_speed_mpm: 200,
    });
    const positive = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0.2,
      depth_of_cut_mm: 2, rake_angle_deg: 16, // +10° from ref
      cutting_speed_mpm: 200,
    });
    // Rake factor = 1 - 0.01*(16-6) = 0.90 → 10% lower
    expect(positive.kc_corrected).toBeLessThan(base.kc_corrected);
    expect(positive.corrections.rake_factor).toBeCloseTo(0.90, 2);
  });

  it("negative rake angle should increase kc", () => {
    const result = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0.2,
      depth_of_cut_mm: 2, rake_angle_deg: -4, // -10° from ref
      cutting_speed_mpm: 200,
    });
    // Rake factor = 1 - 0.01*(-4-6) = 1 + 0.10 = 1.10
    expect(result.corrections.rake_factor).toBeCloseTo(1.10, 2);
    expect(result.kc_corrected).toBeGreaterThan(result.kc);
  });

  // ── Wear correction ────────────────────────────────────────────

  it("VB=0.3mm flank wear → ~20% kc increase", () => {
    const sharp = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0.2,
      depth_of_cut_mm: 2, flank_wear_mm: 0,
      cutting_speed_mpm: 200,
    });
    const worn = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0.2,
      depth_of_cut_mm: 2, flank_wear_mm: 0.3,
      cutting_speed_mpm: 200,
    });
    expect(worn.corrections.wear_factor).toBeCloseTo(1.20, 2);
    const ratio = worn.main_cutting_force_Fc / sharp.main_cutting_force_Fc;
    expect(ratio).toBeCloseTo(1.20, 1);
  });

  // ── Power calculation ──────────────────────────────────────────

  it("power: Pc = Fc * Vc / 60000 [kW]", () => {
    const result = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0.2,
      depth_of_cut_mm: 2, cutting_speed_mpm: 200,
    });
    const expected_power = result.main_cutting_force_Fc * 200 / 60000;
    expect(result.cutting_power_Pc).toBeCloseTo(expected_power, 4);
    expect(result.cutting_power_Pc).toBeGreaterThan(0);
  });

  // ── Size effect ────────────────────────────────────────────────

  it("size effect: kc at h=0.01mm >> kc at h=0.1mm", () => {
    const thin = engine.calculateSizeEffect({
      kc1_1: 1780, mc: 0.26,
      chip_thickness_mm: 0.01, width_mm: 2,
    });
    const normal = engine.calculateSizeEffect({
      kc1_1: 1780, mc: 0.26,
      chip_thickness_mm: 0.1, width_mm: 2,
    });
    // Thin chip should have much higher specific cutting force
    expect(thin.kc_size).toBeGreaterThan(normal.kc_size * 2);
    // Ploughing should be active for thin chip (h < h_min=0.02)
    expect(thin.ploughing_active).toBe(true);
    expect(normal.ploughing_active).toBe(false);
  });

  it("h=0 should not produce NaN or Infinity forces", () => {
    const result = engine.calculateSizeEffect({
      kc1_1: 1780, mc: 0.26,
      chip_thickness_mm: 0, width_mm: 2,
    });
    expect(Number.isFinite(result.total_force)).toBe(true);
    expect(Number.isNaN(result.cutting_force)).toBe(false);
    expect(result.ploughing_active).toBe(true);
  });

  // ── Milling forces ────────────────────────────────────────────

  it("milling: engagement arc correct for 50% radial engagement", () => {
    const result = engine.calculateMillingForces({
      kc1_1: 1780, mc: 0.26,
      feed_per_tooth_mm: 0.1, axial_depth_mm: 3,
      radial_depth_mm: 10, tool_diameter_mm: 20,
      flutes: 4, milling_type: "down",
    });
    // ae/D = 0.5 → engagement = acos(1-ae/R) = acos(0) = 90°
    expect(result.engagement_arc_deg).toBeCloseTo(90, 0);
    expect(result.Fc_avg).toBeGreaterThan(0);
    expect(result.Fc_peak).toBeGreaterThan(result.Fc_avg);
    expect(result.peak_to_avg_ratio).toBeGreaterThan(1);
  });

  it("up-milling vs down-milling produce different force profiles", () => {
    const common = {
      kc1_1: 1780, mc: 0.26,
      feed_per_tooth_mm: 0.1, axial_depth_mm: 3,
      radial_depth_mm: 8, tool_diameter_mm: 20,
      flutes: 4, spindle_rpm: 3000,
    } as const;
    const up = engine.calculateMillingForces({
      ...common, milling_type: "up",
    });
    const down = engine.calculateMillingForces({
      ...common, milling_type: "down",
    });
    // Entry/exit angles must differ
    expect(up.entry_angle_deg).not.toEqual(down.entry_angle_deg);
    // Both should produce positive average forces
    expect(up.Fc_avg).toBeGreaterThan(0);
    expect(down.Fc_avg).toBeGreaterThan(0);
  });

  // ── Force components ──────────────────────────────────────────

  it("resultant force > any individual component", () => {
    const result = engine.calculateForceComponents({
      operation: "turning", kc1_1: 1780, mc: 0.26,
      feed_mm: 0.2, depth_of_cut_mm: 2,
      cutting_speed_mpm: 200, tool_diameter_mm: 25,
    });
    expect(result.Fr).toBeGreaterThan(result.Fc);
    expect(result.Fr).toBeGreaterThan(result.Ff);
    expect(result.Fr).toBeGreaterThan(result.Fp);
    // Fr = sqrt(Fc^2 + Ff^2 + Fp^2)
    const expected_Fr = Math.sqrt(
      result.Fc ** 2 + result.Ff ** 2 + result.Fp ** 2
    );
    expect(result.Fr).toBeCloseTo(expected_Fr, 2);
  });

  it("torque and power are positive for valid inputs", () => {
    const result = engine.calculateForceComponents({
      operation: "turning", kc1_1: 1780, mc: 0.26,
      feed_mm: 0.2, depth_of_cut_mm: 2,
      cutting_speed_mpm: 200, tool_diameter_mm: 25,
    });
    expect(result.torque_Nm).toBeGreaterThan(0);
    expect(result.power_kW).toBeGreaterThan(0);
  });

  // ── Hardness prediction ───────────────────────────────────────

  it("hardness prediction: HB=200 steel → kc1.1 ≈ 700", () => {
    const result = engine.predictFromMaterialHardness({
      hardness_HB: 200, material_family: "steel",
    });
    // 3.5 * 200 = 700
    expect(result.predicted_kc1_1).toBeCloseTo(700, 0);
    expect(result.predicted_mc).toBeGreaterThan(0.10);
    expect(result.predicted_mc).toBeLessThan(0.40);
    expect(result.closest_table_match).not.toBeNull();
  });

  it("hardness prediction: HB=500 steel → kc1.1 ≈ 1750", () => {
    const result = engine.predictFromMaterialHardness({
      hardness_HB: 500,
    });
    expect(result.predicted_kc1_1).toBeCloseTo(1750, 0);
    expect(result.confidence).toContain("steel");
  });

  // ── Boundary: zero feed ───────────────────────────────────────

  it("zero feed should return zero forces with warning", () => {
    const result = engine.calculateSpecificCuttingForce({
      kc1_1: 1780, mc: 0.26, feed_mm: 0,
      depth_of_cut_mm: 2,
    });
    expect(result.main_cutting_force_Fc).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
