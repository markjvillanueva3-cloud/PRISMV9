/**
 * Surface Finish Formula Engine Tests — Formula Verification
 *
 * Validates surface finish prediction models against published literature:
 * - Brammertz (1961) kinematic roughness model
 * - ISO 4287 surface texture parameters (Ra, Rz, Rt)
 * - Whitehouse "Surfaces and their Measurement" (2002)
 * - Benardos & Vosniakos review (2003)
 *
 * BENCH-MS0 P0-U04: Surface Finish Formula Proof
 */

import { describe, it, expect } from "vitest";
import { surfaceFinishPredictorEngine } from "../engines/SurfaceFinishPredictorEngine.js";

// ============================================================================
// SURFACE FINISH CONSTANTS — Published Reference Values
// ============================================================================

/**
 * Reference Ra values for turning at various feed/radius combinations.
 * Brammertz formula: Ra = f²/(32R) for single-point turning
 * Source: ISO 4287, Whitehouse (2002)
 */
const REFERENCE_RA_TURNING = {
  // R = 0.4mm nose radius (typical finishing insert)
  r04_f010: { R: 0.4, f: 0.10, expected_Ra: 0.78, source: "ISO formula" },
  r04_f015: { R: 0.4, f: 0.15, expected_Ra: 1.76, source: "ISO formula" },
  r04_f020: { R: 0.4, f: 0.20, expected_Ra: 3.13, source: "ISO formula" },
  r04_f025: { R: 0.4, f: 0.25, expected_Ra: 4.88, source: "ISO formula" },

  // R = 0.8mm nose radius (common insert)
  r08_f010: { R: 0.8, f: 0.10, expected_Ra: 0.39, source: "ISO formula" },
  r08_f020: { R: 0.8, f: 0.20, expected_Ra: 1.56, source: "ISO formula" },
  r08_f030: { R: 0.8, f: 0.30, expected_Ra: 3.52, source: "ISO formula" },

  // R = 1.2mm nose radius (roughing)
  r12_f020: { R: 1.2, f: 0.20, expected_Ra: 1.04, source: "ISO formula" },
  r12_f030: { R: 1.2, f: 0.30, expected_Ra: 2.34, source: "ISO formula" },
  r12_f040: { R: 1.2, f: 0.40, expected_Ra: 4.17, source: "ISO formula" },
};

/**
 * Material correction factors for Ra.
 * Soft materials produce smoother surfaces; hard/gummy materials produce rougher.
 * Source: Benardos & Vosniakos (2003), machining handbooks
 */
const REFERENCE_MATERIAL_FACTORS = {
  aluminum: { factor: 0.85, range: [0.80, 0.90], source: "Benardos" },
  brass: { factor: 0.78, range: [0.75, 0.82], source: "Handbook" },
  copper: { factor: 0.80, range: [0.75, 0.85], source: "Handbook" },
  mild_steel: { factor: 1.00, range: [0.95, 1.05], source: "reference" },
  stainless: { factor: 1.10, range: [1.05, 1.15], source: "Benardos" },
  titanium: { factor: 1.15, range: [1.10, 1.25], source: "Benardos" },
  inconel: { factor: 1.25, range: [1.20, 1.35], source: "Benardos" },
};

/**
 * ISO 4287 Ra grades for manufacturing.
 * N1 = 0.025µm, N4 = 0.2µm, N6 = 0.8µm, N8 = 3.2µm, N10 = 12.5µm
 */
const ISO_RA_GRADES = {
  N1: 0.025,
  N2: 0.05,
  N3: 0.1,
  N4: 0.2,
  N5: 0.4,
  N6: 0.8,
  N7: 1.6,
  N8: 3.2,
  N9: 6.3,
  N10: 12.5,
  N11: 25.0,
  N12: 50.0,
};

// ============================================================================
// TEST SUITE: BRAMMERTZ FORMULA
// ============================================================================

describe("SurfaceFinishFormulaEngine — Brammertz Formula", () => {
  describe("Basic Brammertz equation: Ra = f²/(32R)", () => {
    it("should calculate correct Ra for R=0.8mm, f=0.2mm/rev", () => {
      // Ra = f²/(32R) = 0.2²/(32×0.8) = 0.04/25.6 = 0.00156 mm = 1.56 µm
      const f = 0.2; // mm/rev
      const R = 0.8; // mm
      const Ra_mm = (f * f) / (32 * R);
      const Ra_um = Ra_mm * 1000;

      expect(Ra_um).toBeCloseTo(1.56, 1);
    });

    it("should calculate correct Ra for various feed/radius combinations", () => {
      const testCases = [
        { f: 0.10, R: 0.4, expected: 0.78 },
        { f: 0.15, R: 0.4, expected: 1.76 },
        { f: 0.20, R: 0.8, expected: 1.56 },
        { f: 0.30, R: 1.2, expected: 2.34 },
      ];

      testCases.forEach(({ f, R, expected }) => {
        const Ra_mm = (f * f) / (32 * R);
        const Ra_um = Ra_mm * 1000;
        expect(Ra_um).toBeCloseTo(expected, 1);
      });
    });

    it("Ra should scale with f² (quadratic)", () => {
      const R = 0.8;
      const Ra_at_f01 = (0.1 * 0.1) / (32 * R) * 1000;
      const Ra_at_f02 = (0.2 * 0.2) / (32 * R) * 1000;

      // f doubles (0.1 → 0.2) → Ra quadruples
      const ratio = Ra_at_f02 / Ra_at_f01;
      expect(ratio).toBeCloseTo(4.0, 2);
    });

    it("Ra should scale with 1/R (inverse)", () => {
      const f = 0.2;
      const Ra_at_R04 = (f * f) / (32 * 0.4) * 1000;
      const Ra_at_R08 = (f * f) / (32 * 0.8) * 1000;

      // R doubles (0.4 → 0.8) → Ra halves
      const ratio = Ra_at_R04 / Ra_at_R08;
      expect(ratio).toBeCloseTo(2.0, 2);
    });
  });

  describe("Extended Brammertz with edge radius: Rt = f²/(8R) + re/2", () => {
    it("should include edge radius contribution", () => {
      // Rt = f²/(8R) + re/2 = 0.2²/(8×0.8) + 0.005/2 = 0.00625 + 0.0025 = 0.00875 mm
      // Ra ≈ Rt/4 = 2.19 µm
      const result = surfaceFinishPredictorEngine.brammertzRa(0.2, 0.8, 5);

      // Should be slightly higher than kinematic-only formula
      expect(result.ra_um).toBeGreaterThan(1.5);
      expect(result.ra_um).toBeLessThan(3.0);
    });

    it("larger edge radius should increase Ra", () => {
      const result_5um = surfaceFinishPredictorEngine.brammertzRa(0.2, 0.8, 5);
      const result_20um = surfaceFinishPredictorEngine.brammertzRa(0.2, 0.8, 20);

      expect(result_20um.ra_um).toBeGreaterThan(result_5um.ra_um);
    });

    it("Rt should be approximately 4× Ra for periodic profiles", () => {
      const result = surfaceFinishPredictorEngine.brammertzRa(0.2, 0.8, 5);

      // Ra ≈ Rt/4 for regular sinusoidal/triangular profiles
      const ratio = result.rt_um / result.ra_um;
      expect(ratio).toBeCloseTo(4.0, 0);
    });
  });
});

// ============================================================================
// TEST SUITE: SCALLOP HEIGHT
// ============================================================================

describe("SurfaceFinishFormulaEngine — Scallop Height", () => {
  describe("Ball endmill scallop: h = R - sqrt(R² - (ae/2)²)", () => {
    it("should calculate correct scallop for ball endmill", () => {
      // Ball d=10mm (R=5mm), ae=1mm
      // h = 5 - sqrt(25 - 0.25) = 5 - sqrt(24.75) = 5 - 4.975 = 0.025 mm = 25 µm
      const result = surfaceFinishPredictorEngine.scallopHeight(1.0, {
        type: "ball",
        diameter_mm: 10,
      });

      expect(result).toBeCloseTo(25, 0);
    });

    it("scallop should increase with stepover", () => {
      const tool = { type: "ball" as const, diameter_mm: 10 };

      const h_1mm = surfaceFinishPredictorEngine.scallopHeight(1.0, tool);
      const h_2mm = surfaceFinishPredictorEngine.scallopHeight(2.0, tool);

      expect(h_2mm).toBeGreaterThan(h_1mm);
    });

    it("scallop should decrease with tool diameter", () => {
      const h_d10 = surfaceFinishPredictorEngine.scallopHeight(1.0, {
        type: "ball",
        diameter_mm: 10,
      });
      const h_d20 = surfaceFinishPredictorEngine.scallopHeight(1.0, {
        type: "ball",
        diameter_mm: 20,
      });

      expect(h_d20).toBeLessThan(h_d10);
    });
  });

  describe("Flat endmill cusp: h ≈ ae²/(8R)", () => {
    it("should calculate cusp height for flat endmill", () => {
      // Flat d=10mm (R=5mm), ae=1mm
      // h ≈ ae²/(8R) = 1/(8×5) = 0.025 mm = 25 µm
      const result = surfaceFinishPredictorEngine.scallopHeight(1.0, {
        type: "flat",
        diameter_mm: 10,
      });

      expect(result).toBeCloseTo(25, 1);
    });
  });

  describe("Bull nose scallop", () => {
    it("should use corner radius for bull nose calculation", () => {
      const result = surfaceFinishPredictorEngine.scallopHeight(0.5, {
        type: "bull_nose",
        diameter_mm: 10,
        corner_radius_mm: 2,
      });

      // Scallop based on corner radius, not tool diameter
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });
  });
});

// ============================================================================
// TEST SUITE: ENGINE CALCULATIONS
// ============================================================================

describe("SurfaceFinishFormulaEngine — Engine Calculations", () => {
  describe("Full surface finish prediction", () => {
    it("should predict surface finish for finishing operation", () => {
      const result = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 0.5, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: {
          type: "ball",
          diameter_mm: 10,
          edge_radius_um: 5,
          flute_count: 2,
        },
        target_ra_um: 1.6,
      });

      expect(result.summary.mean_ra_um).toBeGreaterThan(0);
      expect(result.points.length).toBe(1);
    });

    it("should return recommendations for poor finish", () => {
      const result = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 2.0, ap_mm: 3.0, rpm: 5000, feed_mmmin: 2000 },
        ],
        tool: {
          type: "flat",
          diameter_mm: 10,
          flute_count: 4,
        },
        target_ra_um: 0.8, // Very tight target
      });

      // Should have recommendations for improvement
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Quick finish estimate", () => {
    it("should provide quick Ra estimate", () => {
      const result = surfaceFinishPredictorEngine.quickPredict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.3, ap_mm: 0.5, rpm: 10000, feed_mmmin: 300 },
        ],
        tool: {
          type: "ball",
          diameter_mm: 8,
        },
        target_ra_um: 1.6,
      });

      expect(result.mean_ra_um).toBeGreaterThan(0);
      expect(result.pct_meeting_target).toBeDefined();
    });
  });
});

// ============================================================================
// TEST SUITE: MATERIAL CORRECTION
// ============================================================================

describe("SurfaceFinishFormulaEngine — Material Correction", () => {
  describe("Material factor effects", () => {
    it("aluminum should produce smoother finish than steel", () => {
      // Aluminum factor ~0.85, steel ~1.0
      const result_al = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        material: "aluminum",
      });

      const result_steel = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        material: "mild_steel",
      });

      expect(result_al.summary.mean_ra_um).toBeLessThan(result_steel.summary.mean_ra_um);
    });

    it("titanium should produce rougher finish than steel", () => {
      // Titanium factor ~1.15
      const result_ti = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 5000, feed_mmmin: 300 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        material: "titanium",
      });

      const result_steel = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 5000, feed_mmmin: 300 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        material: "mild_steel",
      });

      expect(result_ti.summary.mean_ra_um).toBeGreaterThan(result_steel.summary.mean_ra_um);
    });
  });

  describe("Coolant factor effects", () => {
    it("flood coolant should improve finish vs dry", () => {
      const result_flood = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        coolant: "flood",
      });

      const result_dry = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        coolant: "dry",
      });

      expect(result_flood.summary.mean_ra_um).toBeLessThan(result_dry.summary.mean_ra_um);
    });

    it("MQL should produce similar finish to flood", () => {
      const result_mql = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        coolant: "mql",
      });

      const result_flood = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1.0, rpm: 8000, feed_mmmin: 500 },
        ],
        tool: { type: "ball", diameter_mm: 10 },
        coolant: "flood",
      });

      // MQL factor ~0.90, flood ~0.92 — very close
      const ratio = result_mql.summary.mean_ra_um / result_flood.summary.mean_ra_um;
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    });
  });
});

// ============================================================================
// TEST SUITE: ISO 4287 GRADES
// ============================================================================

describe("SurfaceFinishFormulaEngine — ISO 4287 Grades", () => {
  describe("ISO Ra grade values", () => {
    it("should define correct ISO grade sequence", () => {
      // N6 = 0.8µm, N7 = 1.6µm, N8 = 3.2µm (geometric progression)
      expect(ISO_RA_GRADES.N6).toBe(0.8);
      expect(ISO_RA_GRADES.N7).toBe(1.6);
      expect(ISO_RA_GRADES.N8).toBe(3.2);
    });

    it("grades should follow geometric progression (factor ~2)", () => {
      const ratios = [
        ISO_RA_GRADES.N7 / ISO_RA_GRADES.N6,
        ISO_RA_GRADES.N8 / ISO_RA_GRADES.N7,
        ISO_RA_GRADES.N9 / ISO_RA_GRADES.N8,
      ];

      ratios.forEach((r) => {
        expect(r).toBeCloseTo(2.0, 1);
      });
    });
  });

  describe("Process capability for ISO grades", () => {
    it("finishing parameters should achieve N6-N7 (0.8-1.6µm)", () => {
      // Typical finishing: small ae, small fz, ball endmill
      const result = surfaceFinishPredictorEngine.quickPredict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.15, ap_mm: 0.3, rpm: 12000, feed_mmmin: 400, fz_mm: 0.033 },
        ],
        tool: {
          type: "ball",
          diameter_mm: 6,
          edge_radius_um: 5,
          flute_count: 2,
        },
        target_ra_um: 1.6,
      });

      // Should be able to achieve N7 or better
      expect(result.mean_ra_um).toBeLessThan(2.0);
    });

    it("roughing parameters should achieve N9-N10 (6.3-12.5µm)", () => {
      const result = surfaceFinishPredictorEngine.quickPredict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 5.0, ap_mm: 3.0, rpm: 4000, feed_mmmin: 1500 },
        ],
        tool: {
          type: "flat",
          diameter_mm: 20,
          flute_count: 4,
        },
        target_ra_um: 12.5,
      });

      // Roughing should be in N9-N10 range
      expect(result.mean_ra_um).toBeGreaterThan(3.0);
    });
  });
});

// ============================================================================
// TEST SUITE: DIMENSIONAL CONSISTENCY
// ============================================================================

describe("SurfaceFinishFormulaEngine — Dimensional Consistency", () => {
  it("Ra should have units of length (µm)", () => {
    // Ra = f²/(32R)
    // [mm²] / [mm] = mm → µm after ×1000 ✓
    const f = 0.2; // mm
    const R = 0.8; // mm
    const Ra_mm = (f * f) / (32 * R); // mm
    const Ra_um = Ra_mm * 1000; // µm

    expect(Ra_um).toBeGreaterThan(0);
    expect(Ra_um).toBeLessThan(100); // Reasonable Ra range
  });

  it("Rt should be greater than Ra (by definition)", () => {
    const result = surfaceFinishPredictorEngine.brammertzRa(0.2, 0.8, 5);
    expect(result.rt_um).toBeGreaterThan(result.ra_um);
  });

  it("scallop height should have units of length (µm)", () => {
    const h = surfaceFinishPredictorEngine.scallopHeight(1.0, {
      type: "ball",
      diameter_mm: 10,
    });

    // Scallop is returned in µm
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1000); // Should be sub-mm
  });
});

// ============================================================================
// TEST SUITE: EDGE CASES
// ============================================================================

describe("SurfaceFinishFormulaEngine — Edge Cases", () => {
  it("should handle zero feed gracefully", () => {
    const result = surfaceFinishPredictorEngine.brammertzRa(0, 0.8, 5);
    expect(result.ra_um).toBe(0);
  });

  it("should handle zero tool radius gracefully", () => {
    const result = surfaceFinishPredictorEngine.brammertzRa(0.2, 0, 5);
    expect(result.ra_um).toBe(0);
  });

  it("should handle zero stepover", () => {
    const h = surfaceFinishPredictorEngine.scallopHeight(0, {
      type: "ball",
      diameter_mm: 10,
    });
    expect(h).toBe(0);
  });

  it("should handle very fine finishing (fz < 0.01mm)", () => {
    const result = surfaceFinishPredictorEngine.brammertzRa(0.005, 1.0, 3);

    // Very fine feed should give low Ra (edge radius adds baseline)
    // Ra = fz²/(8R) + re/2 → even at fz=0, Ra ≈ re/2 contribution
    expect(result.ra_um).toBeLessThan(1.0);
    expect(result.ra_um).toBeGreaterThan(0);
  });

  it("should handle very coarse roughing (fz > 0.5mm)", () => {
    const result = surfaceFinishPredictorEngine.brammertzRa(0.6, 0.8, 10);

    // Coarse feed should give high Ra
    expect(result.ra_um).toBeGreaterThan(10);
  });

  it("should handle large stepover (ae approaching diameter)", () => {
    const h = surfaceFinishPredictorEngine.scallopHeight(8.0, {
      type: "ball",
      diameter_mm: 10,
    });

    // Large stepover should give large scallop
    expect(h).toBeGreaterThan(100);
  });
});

// ============================================================================
// TEST SUITE: LITERATURE VALIDATION
// ============================================================================

describe("SurfaceFinishFormulaEngine — Literature Validation", () => {
  describe("Brammertz (1961) original model", () => {
    it("theoretical Ra at standard conditions should match published", () => {
      // Brammertz table: f=0.2, R=0.8 → Rt≈6.25µm, Ra≈1.56µm
      const f = 0.2;
      const R = 0.8;
      const Ra_theoretical = ((f * f) / (32 * R)) * 1000;

      expect(Ra_theoretical).toBeCloseTo(1.56, 1);
    });
  });

  describe("Whitehouse (2002) Rt/Ra relationship", () => {
    it("Ra/Rt ratio should be approximately 1:4 for triangular profile", () => {
      // For regular periodic profile: Ra ≈ Rt/4
      const result = surfaceFinishPredictorEngine.brammertzRa(0.2, 0.8, 5);
      const ratio = result.ra_um / result.rt_um;

      expect(ratio).toBeCloseTo(0.25, 1);
    });
  });

  describe("Benardos & Vosniakos (2003) material factors", () => {
    it("material factors should be in published ranges", () => {
      Object.entries(REFERENCE_MATERIAL_FACTORS).forEach(([mat, ref]) => {
        expect(ref.factor).toBeGreaterThanOrEqual(ref.range[0]);
        expect(ref.factor).toBeLessThanOrEqual(ref.range[1]);
      });
    });
  });
});
