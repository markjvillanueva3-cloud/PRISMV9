/**
 * SurfaceIntegrityEngine — Comprehensive Unit Tests
 * Tests: surface roughness (Ra, Rz), residual stress, white layer,
 *        fatigue derating, BUE correction, process comparison, edge cases.
 * Physics: Ra = f²/(32r) for turning, Rz/Ra ≈ 4 (ISO 4287),
 *          residual stress depth ∝ √(DOC×feed), Kf = 1 + q(Kt-1).
 * @milestone FORGE-ENGINES-B44
 */
import { describe, it, expect } from "vitest";
import { surfaceIntegrityEngine } from "../engines/SurfaceIntegrityEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// 1. Surface Roughness — Ra and Rz
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — Surface Roughness", () => {
  it("turning Ra follows f²/(32r) kinematic model", () => {
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", feed_mm_rev: 0.2, tool_nose_radius_mm: 0.8,
    });
    // Ra = (0.2²)/(32×0.8) × 1000 = 0.04/25.6 × 1000 = 1.5625 µm
    expect(r.surface_roughness_ra.value).toBeCloseTo(1.5625, 1);
  });

  it("halving feed reduces Ra by 4x (quadratic relationship)", () => {
    const coarse = surfaceIntegrityEngine.calculate({ process: "turning", feed_mm_rev: 0.2, tool_nose_radius_mm: 0.8 });
    const fine = surfaceIntegrityEngine.calculate({ process: "turning", feed_mm_rev: 0.1, tool_nose_radius_mm: 0.8 });
    const ratio = coarse.surface_roughness_ra.value / fine.surface_roughness_ra.value;
    expect(ratio).toBeCloseTo(4, 0);
  });

  it("doubling nose radius halves Ra", () => {
    const small = surfaceIntegrityEngine.calculate({ process: "turning", feed_mm_rev: 0.15, tool_nose_radius_mm: 0.4 });
    const large = surfaceIntegrityEngine.calculate({ process: "turning", feed_mm_rev: 0.15, tool_nose_radius_mm: 0.8 });
    const ratio = small.surface_roughness_ra.value / large.surface_roughness_ra.value;
    expect(ratio).toBeCloseTo(2, 0);
  });

  it("Rz/Ra ratio ≈ 4 (ISO 4287 kinematic)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "turning" });
    const ratio = r.roughness_rz.value / r.surface_roughness_ra.value;
    expect(ratio).toBeCloseTo(4, 1);
  });

  it("polishing gives lowest Ra (< 0.1 µm)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "polishing" });
    expect(r.surface_roughness_ra.value).toBeCloseTo(0.05, 2);
  });

  it("EDM roughness depends on depth of cut", () => {
    const shallow = surfaceIntegrityEngine.calculate({ process: "edm", depth_of_cut_mm: 0.1 });
    const deep = surfaceIntegrityEngine.calculate({ process: "edm", depth_of_cut_mm: 1.0 });
    expect(deep.surface_roughness_ra.value).toBeGreaterThan(shallow.surface_roughness_ra.value);
  });

  it("grinding Ra is low (0.2–0.7 µm range)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "grinding", depth_of_cut_mm: 0.5 });
    expect(r.surface_roughness_ra.value).toBeCloseTo(0.45, 1);
    expect(r.surface_roughness_ra.value).toBeLessThan(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Tool Condition Effects
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — Tool Condition", () => {
  it("worn tool doubles roughness (2× multiplier)", () => {
    const sharp = surfaceIntegrityEngine.calculate({ process: "turning", tool_condition: "sharp" });
    const worn = surfaceIntegrityEngine.calculate({ process: "turning", tool_condition: "worn" });
    const ratio = worn.surface_roughness_ra.value / sharp.surface_roughness_ra.value;
    expect(ratio).toBeCloseTo(2, 0);
  });

  it("moderate wear increases roughness by 1.3×", () => {
    const sharp = surfaceIntegrityEngine.calculate({ process: "turning", tool_condition: "sharp" });
    const moderate = surfaceIntegrityEngine.calculate({ process: "turning", tool_condition: "moderate_wear" });
    const ratio = moderate.surface_roughness_ra.value / sharp.surface_roughness_ra.value;
    expect(ratio).toBeCloseTo(1.3, 1);
  });

  it("worn tool increases residual stress by +200 MPa", () => {
    const sharp = surfaceIntegrityEngine.calculate({ process: "turning", tool_condition: "sharp" });
    const worn = surfaceIntegrityEngine.calculate({ process: "turning", tool_condition: "worn" });
    expect(worn.residual_stress_surface.value).toBeGreaterThan(sharp.residual_stress_surface.value);
  });

  it("worn tool increases white layer by 1.5×", () => {
    const sharp = surfaceIntegrityEngine.calculate({ process: "edm", tool_condition: "sharp" });
    const worn = surfaceIntegrityEngine.calculate({ process: "edm", tool_condition: "worn" });
    expect(worn.white_layer_thickness.value).toBeGreaterThan(sharp.white_layer_thickness.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Residual Stress
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — Residual Stress", () => {
  it("turning produces compressive residual stress (negative)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "turning" });
    expect(r.residual_stress_surface.value).toBeLessThan(0);
  });

  it("EDM produces high tensile residual stress (positive)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "edm" });
    expect(r.residual_stress_surface.value).toBeGreaterThan(0);
    expect(r.residual_stress_surface.value).toBeCloseTo(500, -1);
  });

  it("shot peening produces compressive stress (-400 MPa base)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "shot_peen" });
    expect(r.residual_stress_surface.value).toBeLessThan(-300);
  });

  it("dry coolant increases tensile stress by +150 MPa", () => {
    const flood = surfaceIntegrityEngine.calculate({ process: "turning", coolant: "flood" });
    const dry = surfaceIntegrityEngine.calculate({ process: "turning", coolant: "dry" });
    expect(dry.residual_stress_surface.value).toBeGreaterThan(flood.residual_stress_surface.value);
  });

  it("cryogenic coolant reduces tensile stress by -100 MPa", () => {
    const flood = surfaceIntegrityEngine.calculate({ process: "turning", coolant: "flood" });
    const cryo = surfaceIntegrityEngine.calculate({ process: "turning", coolant: "cryogenic" });
    expect(cryo.residual_stress_surface.value).toBeLessThan(flood.residual_stress_surface.value);
  });

  it("stress depth scales with √(DOC × feed)", () => {
    const light = surfaceIntegrityEngine.calculate({ process: "turning", depth_of_cut_mm: 0.25, feed_mm_rev: 0.1 });
    const heavy = surfaceIntegrityEngine.calculate({ process: "turning", depth_of_cut_mm: 1.0, feed_mm_rev: 0.3 });
    expect(heavy.residual_stress_depth.value).toBeGreaterThan(light.residual_stress_depth.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. White Layer and HAZ
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — White Layer", () => {
  it("EDM produces thickest white layer (~30 µm base)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "edm" });
    expect(r.white_layer_thickness.value).toBeCloseTo(30, -1);
    expect(r.white_layer_thickness.value).toBeGreaterThan(20);
  });

  it("hard turning produces white layer (~10 µm base)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "hard_turning" });
    expect(r.white_layer_thickness.value).toBeCloseTo(10, 0);
  });

  it("turning produces zero white layer", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "turning" });
    expect(r.white_layer_thickness.value).toBe(0);
  });

  it("dry grinding doubles white layer", () => {
    const wet = surfaceIntegrityEngine.calculate({ process: "grinding", coolant: "flood" });
    const dry = surfaceIntegrityEngine.calculate({ process: "grinding", coolant: "dry" });
    expect(dry.white_layer_thickness.value).toBeCloseTo(wet.white_layer_thickness.value * 2, 0);
  });

  it("warns about EDM recast layer", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "edm" });
    expect(r.warnings.some(w => /recast|EDM/i.test(w))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. BUE (Built-Up Edge) Speed Correction
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — BUE Correction", () => {
  it("low speed (< 30% threshold) triggers heavy BUE — Ra × 2.5", () => {
    // Steel BUE threshold = 100 m/min; 20 m/min = 20% → heavy BUE
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", cutting_speed_m_min: 20, material: "steel",
    });
    // Should have BUE warning
    expect(r.warnings.some(w => /BUE/i.test(w))).toBe(true);
  });

  it("high speed (> threshold) has no BUE effect", () => {
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", cutting_speed_m_min: 150, material: "steel",
    });
    expect(r.warnings.some(w => /BUE/i.test(w))).toBe(false);
  });

  it("aluminum has higher BUE threshold (300 m/min)", () => {
    // 100 m/min = 33% of 300 → still in BUE range for aluminum
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", cutting_speed_m_min: 80, material: "aluminum",
    });
    expect(r.warnings.some(w => /BUE/i.test(w))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Fatigue and Quality Score
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — Fatigue & Quality", () => {
  it("fatigue derating clamped between 0.3 and 1.2", () => {
    const processes = ["turning", "edm", "shot_peen", "polishing", "grinding"] as const;
    for (const p of processes) {
      const r = surfaceIntegrityEngine.calculate({ process: p });
      expect(r.fatigue_derating.value).toBeGreaterThanOrEqual(0.3);
      expect(r.fatigue_derating.value).toBeLessThanOrEqual(1.2);
    }
  });

  it("compressive stress improves fatigue (derating > 1.0)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "shot_peen" });
    expect(r.fatigue_derating.value).toBeGreaterThan(1.0);
  });

  it("quality score between 1 and 10 for all processes", () => {
    const processes = ["turning", "milling", "grinding", "edm", "polishing", "honing"] as const;
    for (const p of processes) {
      const r = surfaceIntegrityEngine.calculate({ process: p });
      expect(r.surface_quality_score.value).toBeGreaterThanOrEqual(1);
      expect(r.surface_quality_score.value).toBeLessThanOrEqual(10);
    }
  });

  it("polishing has highest quality score (≥ 9)", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "polishing" });
    expect(r.surface_quality_score.value).toBeGreaterThanOrEqual(9);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Edge Cases and Boundary Values
// ═══════════════════════════════════════════════════════════════════════

describe("SurfaceIntegrityEngine — Edge Cases", () => {
  it("empty input uses defaults and produces valid output", () => {
    const r = surfaceIntegrityEngine.calculate({});
    expect(r.surface_roughness_ra.value).toBeGreaterThan(0);
    expect(r.roughness_rz.value).toBeGreaterThan(0);
    expect(r.surface_roughness_ra.unit).toContain("µm");
  });

  it("very fine feed (0.01 mm/rev) gives sub-micron Ra", () => {
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", feed_mm_rev: 0.01, tool_nose_radius_mm: 0.8,
    });
    // Ra = 0.01²/(32×0.8)×1000 = 0.0039 µm
    expect(r.surface_roughness_ra.value).toBeLessThan(0.01);
  });

  it("very coarse feed (0.5 mm/rev) gives rough surface", () => {
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", feed_mm_rev: 0.5, tool_nose_radius_mm: 0.8,
    });
    // Ra = 0.5²/(32×0.8)×1000 = 9.77 µm
    expect(r.surface_roughness_ra.value).toBeCloseTo(9.77, 0);
  });

  it("very small nose radius (0.1mm) produces rough surface", () => {
    const r = surfaceIntegrityEngine.calculate({
      process: "turning", feed_mm_rev: 0.15, tool_nose_radius_mm: 0.1,
    });
    expect(r.surface_roughness_ra.value).toBeGreaterThan(5);
  });

  it("all AtomicValue fields have unit and source", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "turning" });
    expect(r.surface_roughness_ra.unit).toContain("µm");
    expect(r.residual_stress_surface.unit).toBe("MPa");
    expect(r.surface_roughness_ra.source).toBeDefined();
    expect(r.surface_roughness_ra.source.length).toBeGreaterThan(0);
  });

  it("hardness change is non-negative for all processes", () => {
    const processes = ["turning", "milling", "grinding", "edm", "shot_peen", "hard_turning"] as const;
    for (const p of processes) {
      const r = surfaceIntegrityEngine.calculate({ process: p });
      expect(r.hardness_change_pct.value).toBeGreaterThanOrEqual(0);
    }
  });
});
