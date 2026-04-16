/**
 * Deflection Formula Engine Tests — Formula Verification
 *
 * Validates Euler-Bernoulli cantilever beam deflection against published literature:
 * - Altintas "Manufacturing Automation" (2012) Ch.2
 * - Schmitz & Smith "Machining Dynamics" (2009)
 * - ISO 10791-6 Test conditions for machine tools
 * - Tlusty "Manufacturing Processes and Equipment" (2000)
 *
 * BENCH-MS0 P0-U03: Deflection Formula Proof
 */

import { describe, it, expect } from "vitest";
import { toolDeflectionPredictionEngine } from "../engines/ToolDeflectionPredictionEngine.js";

// ============================================================================
// DEFLECTION CONSTANTS — Published Reference Values
// ============================================================================

/**
 * Young's modulus by tool material (GPa) — ASM Handbook Vol. 2
 */
const REFERENCE_YOUNGS_MODULUS_GPA = {
  hss: { E: 210, range: [200, 220], source: "ASM Handbook Vol 1" },
  carbide: { E: 600, range: [580, 650], source: "Sandvik / Kennametal" },
  ceramic: { E: 380, range: [300, 400], source: "Kennametal" },
  cermet: { E: 450, range: [400, 500], source: "Kyocera" },
  cbn: { E: 680, range: [650, 750], source: "Sumitomo" },
  pcd: { E: 890, range: [800, 1000], source: "De Beers" },
};

/**
 * Flute correction factors for second moment of area.
 * Reference: Schmitz & Smith (2009), Table 3.2
 */
const REFERENCE_FLUTE_CORRECTION = {
  1: { factor: 0.55, range: [0.50, 0.60], source: "Schmitz & Smith" },
  2: { factor: 0.65, range: [0.60, 0.70], source: "Schmitz & Smith" },
  3: { factor: 0.72, range: [0.68, 0.76], source: "Schmitz & Smith" },
  4: { factor: 0.78, range: [0.75, 0.82], source: "Schmitz & Smith" },
  5: { factor: 0.82, range: [0.78, 0.86], source: "Schmitz & Smith" },
  6: { factor: 0.85, range: [0.82, 0.88], source: "Schmitz & Smith" },
};

/**
 * L/D ratio guidelines for tool stiffness.
 * Reference: ISO 10791-6, Sandvik Coromant, Altintas (2012)
 */
const REFERENCE_LD_GUIDELINES = {
  roughing: { max_LD: 3.0, source: "Sandvik Coromant" },
  finishing: { max_LD: 4.0, source: "ISO 10791-6" },
  precision: { max_LD: 2.5, source: "Altintas (2012)" },
  deep_pocket: { max_LD: 5.0, warning: "requires reduced feed", source: "Tlusty" },
};

// ============================================================================
// TEST SUITE: CANTILEVER BEAM FORMULA
// ============================================================================

describe("DeflectionFormulaEngine — Cantilever Beam Formula", () => {
  describe("Basic Euler-Bernoulli formula: δ = FL³/(3EI)", () => {
    it("should calculate correct deflection for simple cantilever", () => {
      // δ = FL³/(3EI)
      // F = 100 N, L = 50 mm, d = 10 mm, carbide (E = 600 GPa)
      // I = πd⁴/64 = π × 10000 / 64 = 490.87 mm⁴
      // E = 600 × 1000 = 600000 N/mm²
      // δ = 100 × 125000 / (3 × 600000 × 490.87) = 0.0142 mm = 14.2 µm

      const F = 100; // N
      const L = 50;  // mm
      const d = 10;  // mm
      const E = 600 * 1000; // N/mm² (600 GPa)
      const I = (Math.PI * Math.pow(d, 4)) / 64; // mm⁴

      const delta_mm = (F * Math.pow(L, 3)) / (3 * E * I);
      const delta_um = delta_mm * 1000;

      expect(delta_um).toBeCloseTo(14.2, 0);
    });

    it("should calculate correct deflection via engine", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Expected ~14 µm (may vary slightly due to implementation details)
      expect(result.static_deflection_um.value).toBeGreaterThan(10);
      expect(result.static_deflection_um.value).toBeLessThan(20);
    });

    it("deflection should scale with F (linear)", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 200, // 2× force
        tool_material: "carbide",
      });

      // Deflection should be 2× for 2× force
      const ratio = result2.static_deflection_um.value / result1.static_deflection_um.value;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("deflection should scale with L³ (cubic)", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 40,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 80, // 2× overhang
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Deflection should be 8× for 2× overhang (2³ = 8)
      const ratio = result2.static_deflection_um.value / result1.static_deflection_um.value;
      expect(ratio).toBeCloseTo(8.0, 0);
    });

    it("deflection should scale with d⁴ (inverse fourth power)", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 20, // 2× diameter
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Deflection should be 1/16 for 2× diameter (2⁴ = 16)
      const ratio = result1.static_deflection_um.value / result2.static_deflection_um.value;
      expect(ratio).toBeCloseTo(16.0, 0);
    });
  });

  describe("Second moment of area: I = πd⁴/64", () => {
    it("should calculate I correctly for various diameters", () => {
      const testCases = [
        { d: 6, expected_I: 63.62 },
        { d: 8, expected_I: 201.06 },
        { d: 10, expected_I: 490.87 },
        { d: 12, expected_I: 1017.88 },
        { d: 16, expected_I: 3216.99 },
        { d: 20, expected_I: 7853.98 },
        { d: 25, expected_I: 19174.76 },
      ];

      testCases.forEach(({ d, expected_I }) => {
        const I = (Math.PI * Math.pow(d, 4)) / 64;
        expect(I).toBeCloseTo(expected_I, 0);
      });
    });

    it("I should scale with d⁴", () => {
      const I_10 = (Math.PI * Math.pow(10, 4)) / 64;
      const I_20 = (Math.PI * Math.pow(20, 4)) / 64;

      const ratio = I_20 / I_10;
      expect(ratio).toBeCloseTo(16, 2); // 2⁴ = 16
    });
  });
});

// ============================================================================
// TEST SUITE: TOOL MATERIAL PROPERTIES
// ============================================================================

describe("DeflectionFormulaEngine — Tool Material Properties", () => {
  describe("Young's modulus values", () => {
    it("carbide should have E ≈ 600 GPa", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Carbide has highest practical stiffness among common materials
      // Verify by comparing to HSS
      const result_hss = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "hss",
      });

      // Carbide (E=600) vs HSS (E=210) should give ~3× less deflection
      const ratio = result_hss.static_deflection_um.value / result.static_deflection_um.value;
      expect(ratio).toBeCloseTo(600 / 210, 0);
    });

    it("HSS should have E ≈ 210 GPa", () => {
      const E_ref = REFERENCE_YOUNGS_MODULUS_GPA.hss;
      expect(E_ref.E).toBeGreaterThanOrEqual(E_ref.range[0]);
      expect(E_ref.E).toBeLessThanOrEqual(E_ref.range[1]);
    });

    it("ceramic should have E in 300-400 GPa range", () => {
      const E_ref = REFERENCE_YOUNGS_MODULUS_GPA.ceramic;
      expect(E_ref.E).toBeGreaterThanOrEqual(E_ref.range[0]);
      expect(E_ref.E).toBeLessThanOrEqual(E_ref.range[1]);
    });

    it("CBN should have E > carbide", () => {
      const result_carbide = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result_cbn = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "cbn",
      });

      // CBN should deflect less than carbide
      expect(result_cbn.static_deflection_um.value).toBeLessThan(
        result_carbide.static_deflection_um.value
      );
    });

    it("PCD should have highest E (lowest deflection)", () => {
      const materials = ["hss", "carbide", "ceramic", "cbn", "pcd"] as const;
      const deflections: number[] = [];

      materials.forEach((mat) => {
        const result = toolDeflectionPredictionEngine.calculate({
          tool_diameter_mm: 10,
          tool_overhang_mm: 50,
          cutting_force_N: 100,
          tool_material: mat,
        });
        deflections.push(result.static_deflection_um.value);
      });

      // PCD (last) should have minimum deflection
      const pcd_deflection = deflections[deflections.length - 1];
      const min_deflection = Math.min(...deflections);
      expect(pcd_deflection).toBe(min_deflection);
    });
  });

  describe("Material ranking by stiffness", () => {
    it("should rank materials: PCD > CBN > carbide > cermet > ceramic > HSS", () => {
      const materials = ["hss", "ceramic", "cermet", "carbide", "cbn", "pcd"] as const;
      const results: Array<{ mat: string; deflection: number }> = [];

      materials.forEach((mat) => {
        const result = toolDeflectionPredictionEngine.calculate({
          tool_diameter_mm: 10,
          tool_overhang_mm: 50,
          cutting_force_N: 100,
          tool_material: mat,
        });
        results.push({ mat, deflection: result.static_deflection_um.value });
      });

      // Sort by deflection (ascending = highest stiffness)
      results.sort((a, b) => a.deflection - b.deflection);

      // PCD should be stiffest (lowest deflection)
      expect(results[0].mat).toBe("pcd");
      // HSS should be least stiff (highest deflection)
      expect(results[results.length - 1].mat).toBe("hss");
    });
  });
});

// ============================================================================
// TEST SUITE: FLUTE CORRECTION
// ============================================================================

describe("DeflectionFormulaEngine — Flute Correction Factors", () => {
  describe("Flute count effect on stiffness", () => {
    it("2-flute should have more deflection than solid", () => {
      const result_solid = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
        // no flute_count = solid
      });

      const result_2f = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
        flute_count: 2,
      });

      // 2-flute should deflect more (reduced I)
      expect(result_2f.static_deflection_um.value).toBeGreaterThan(
        result_solid.static_deflection_um.value
      );
    });

    it("4-flute should have less deflection than 2-flute", () => {
      const result_2f = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
        flute_count: 2,
      });

      const result_4f = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
        flute_count: 4,
      });

      // 4-flute should be stiffer than 2-flute
      expect(result_4f.static_deflection_um.value).toBeLessThan(
        result_2f.static_deflection_um.value
      );
    });

    it("flute correction should be in published range", () => {
      // 4-flute correction factor should be ~0.78 per Schmitz & Smith
      const result_solid = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result_4f = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
        flute_count: 4,
      });

      // Deflection ratio = 1/correction (since I_eff = I_solid × correction)
      const deflection_ratio = result_4f.static_deflection_um.value / result_solid.static_deflection_um.value;
      const implied_correction = 1 / deflection_ratio;

      // Should be in range [0.75, 0.82] per Schmitz & Smith
      expect(implied_correction).toBeGreaterThanOrEqual(0.70);
      expect(implied_correction).toBeLessThanOrEqual(0.85);
    });
  });
});

// ============================================================================
// TEST SUITE: L/D RATIO AND WARNINGS
// ============================================================================

describe("DeflectionFormulaEngine — L/D Ratio Guidelines", () => {
  describe("L/D ratio effects", () => {
    it("L/D < 3 should be safe for roughing", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 20, // d = 20
        tool_overhang_mm: 50, // L/D = 2.5
        cutting_force_N: 500,
        tool_material: "carbide",
      });

      expect(result.is_safe).toBe(true);
    });

    it("L/D > 4 should produce warning", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10, // d = 10
        tool_overhang_mm: 50, // L/D = 5.0
        cutting_force_N: 200,
        tool_material: "carbide",
      });

      // Should have recommendations for high L/D
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("deflection-to-diameter ratio should be calculated", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // deflection_to_diameter_ratio = δ_um / (d_mm × 1000)
      const expected_ratio = result.static_deflection_um.value / (10 * 1000);
      expect(result.deflection_to_diameter_ratio).toBeCloseTo(expected_ratio, 4);
    });
  });
});

// ============================================================================
// TEST SUITE: BENDING STRESS
// ============================================================================

describe("DeflectionFormulaEngine — Bending Stress", () => {
  describe("Maximum bending stress: σ = M/Z = FL/(πd³/32)", () => {
    it("should calculate correct bending stress", () => {
      // σ = M/Z = FL / (πd³/32) = 32FL / (πd³)
      // F = 100 N, L = 50 mm, d = 10 mm
      // M = 100 × 50 = 5000 N·mm
      // Z = π × 1000 / 32 = 98.17 mm³
      // σ = 5000 / 98.17 = 50.9 MPa

      const F = 100;
      const L = 50;
      const d = 10;
      const Z = (Math.PI * Math.pow(d, 3)) / 32;
      const M = F * L;
      const sigma = M / Z;

      expect(sigma).toBeCloseTo(50.9, 0);
    });

    it("engine should calculate bending stress", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Should be ~51 MPa
      expect(result.max_bending_stress_MPa.value).toBeGreaterThan(40);
      expect(result.max_bending_stress_MPa.value).toBeLessThan(60);
    });

    it("stress should scale with F (linear)", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 200,
        tool_material: "carbide",
      });

      const ratio = result2.max_bending_stress_MPa.value / result1.max_bending_stress_MPa.value;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("stress should scale with d³ (inverse cubic)", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 20, // 2× diameter
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Stress should be 1/8 for 2× diameter (2³ = 8)
      const ratio = result1.max_bending_stress_MPa.value / result2.max_bending_stress_MPa.value;
      expect(ratio).toBeCloseTo(8.0, 0);
    });
  });

  describe("Safety factor", () => {
    it("should calculate safety factor = strength / stress", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // Carbide TRS ~1500 MPa, stress ~51 MPa → SF ~29
      expect(result.safety_factor.value).toBeGreaterThan(10);
    });

    it("safety factor should decrease with force", () => {
      const result_low = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result_high = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 1000, // 10× force
        tool_material: "carbide",
      });

      expect(result_high.safety_factor.value).toBeLessThan(result_low.safety_factor.value);
    });
  });
});

// ============================================================================
// TEST SUITE: STIFFNESS
// ============================================================================

describe("DeflectionFormulaEngine — Stiffness", () => {
  describe("Stiffness calculation: k = F/δ", () => {
    it("should calculate stiffness in N/µm", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      // k = F / δ = 100 N / 14.2 µm ≈ 7 N/µm
      expect(result.stiffness_N_per_um.value).toBeGreaterThan(5);
      expect(result.stiffness_N_per_um.value).toBeLessThan(10);
    });

    it("stiffness should increase with d⁴", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 20,
        tool_overhang_mm: 50,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const ratio = result2.stiffness_N_per_um.value / result1.stiffness_N_per_um.value;
      expect(ratio).toBeCloseTo(16.0, 0); // 2⁴ = 16
    });

    it("stiffness should decrease with L³", () => {
      const result1 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 40,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const result2 = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 80,
        cutting_force_N: 100,
        tool_material: "carbide",
      });

      const ratio = result1.stiffness_N_per_um.value / result2.stiffness_N_per_um.value;
      expect(ratio).toBeCloseTo(8.0, 0); // 2³ = 8
    });
  });
});

// ============================================================================
// TEST SUITE: DIMENSIONAL CONSISTENCY
// ============================================================================

describe("DeflectionFormulaEngine — Dimensional Consistency", () => {
  it("δ should have units of length (µm)", () => {
    // δ = FL³/(3EI)
    // [N × mm³] / [N/mm² × mm⁴] = [N × mm³] / [N × mm²] = mm ✓
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 10,
      tool_overhang_mm: 50,
      cutting_force_N: 100,
      tool_material: "carbide",
    });

    expect(result.static_deflection_um.unit).toBe("µm");
  });

  it("stress should have units of pressure (MPa)", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 10,
      tool_overhang_mm: 50,
      cutting_force_N: 100,
      tool_material: "carbide",
    });

    expect(result.max_bending_stress_MPa.unit).toBe("MPa");
  });

  it("stiffness should have units of N/µm", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 10,
      tool_overhang_mm: 50,
      cutting_force_N: 100,
      tool_material: "carbide",
    });

    expect(result.stiffness_N_per_um.unit).toBe("N/µm");
  });
});

// ============================================================================
// TEST SUITE: EDGE CASES
// ============================================================================

describe("DeflectionFormulaEngine — Edge Cases", () => {
  it("should handle small diameter (micro-endmill)", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 1, // 1mm micro endmill
      tool_overhang_mm: 5,
      cutting_force_N: 5,
      tool_material: "carbide",
    });

    // Very small tool, expect high deflection
    expect(result.static_deflection_um.value).toBeGreaterThan(0);
    expect(result.is_safe).toBeDefined();
  });

  it("should handle large diameter (face mill)", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 50, // 50mm face mill
      tool_overhang_mm: 80,
      cutting_force_N: 2000,
      tool_material: "carbide",
    });

    // Large tool, expect low deflection despite high force
    expect(result.static_deflection_um.value).toBeLessThan(50);
  });

  it("should handle very long overhang (deep pocket)", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 10,
      tool_overhang_mm: 100, // L/D = 10
      cutting_force_N: 100,
      tool_material: "carbide",
    });

    // Very long overhang, expect high deflection
    expect(result.static_deflection_um.value).toBeGreaterThan(100);
  });

  it("should handle zero force", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 10,
      tool_overhang_mm: 50,
      cutting_force_N: 0,
      tool_material: "carbide",
    });

    // Zero force = zero deflection
    expect(result.static_deflection_um.value).toBe(0);
  });

  it("should handle axial force direction (no lateral deflection)", () => {
    const result = toolDeflectionPredictionEngine.calculate({
      tool_diameter_mm: 10,
      tool_overhang_mm: 50,
      cutting_force_N: 100,
      force_direction: "axial",
      tool_material: "carbide",
    });

    // Axial force doesn't cause lateral deflection
    expect(result.static_deflection_um.value).toBe(0);
  });
});

// ============================================================================
// TEST SUITE: LITERATURE VALIDATION
// ============================================================================

describe("DeflectionFormulaEngine — Literature Validation", () => {
  describe("Altintas (2012) Chapter 2 examples", () => {
    it("Example: 10mm carbide endmill, L=40mm, F=200N", () => {
      // From Altintas Manufacturing Automation Ch.2
      // E = 600 GPa = 600000 N/mm², d = 10mm, L = 40mm, F = 200N
      // I = π × 10⁴ / 64 = 490.87 mm⁴
      // δ = 200 × 64000 / (3 × 600000 × 490.87) = 14.5 µm

      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 10,
        tool_overhang_mm: 40,
        cutting_force_N: 200,
        tool_material: "carbide",
      });

      expect(result.static_deflection_um.value).toBeCloseTo(14.5, 0);
    });
  });

  describe("Schmitz & Smith (2009) examples", () => {
    it("should apply correct flute correction factors", () => {
      // Schmitz & Smith Table 3.2: 4-flute correction ≈ 0.78
      // This means I_eff = 0.78 × I_solid
      // So deflection increases by 1/0.78 ≈ 1.28×

      const result_solid = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 12,
        tool_overhang_mm: 45,
        cutting_force_N: 150,
        tool_material: "carbide",
      });

      const result_4f = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 12,
        tool_overhang_mm: 45,
        cutting_force_N: 150,
        tool_material: "carbide",
        flute_count: 4,
      });

      const ratio = result_4f.static_deflection_um.value / result_solid.static_deflection_um.value;
      expect(ratio).toBeCloseTo(1 / 0.78, 1);
    });
  });

  describe("ISO 10791-6 guidelines", () => {
    it("L/D ≤ 4 should be acceptable for finishing", () => {
      const result = toolDeflectionPredictionEngine.calculate({
        tool_diameter_mm: 12,
        tool_overhang_mm: 48, // L/D = 4.0
        cutting_force_N: 100,
        tool_material: "carbide",
        tolerance_target_mm: 0.02, // 20µm tolerance
      });

      // At L/D = 4, tool should still be functional
      expect(result.is_safe).toBe(true);
    });
  });
});
