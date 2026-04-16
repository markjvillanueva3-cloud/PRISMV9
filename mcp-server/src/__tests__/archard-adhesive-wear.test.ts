/**
 * ArchardAdhesiveWearEngine Tests
 *
 * Tests Archard (1953) adhesive wear law implementation including:
 * - Core wear equation: V = K × W × L / H
 * - Flank wear (VB) conversion
 * - Material pair coefficient lookup
 * - Temperature corrections
 * - Regime classification
 * - Usui model comparison
 *
 * @module __tests__/archard-adhesive-wear.test
 */

import { describe, it, expect } from "vitest";
import {
  archardAdhesiveWearEngine,
  ArchardAdhesiveWearEngine,
  type ArchardWearInput,
  type ToolMaterial,
  type WorkpieceMaterial,
} from "../engines/ArchardAdhesiveWearEngine.js";

const engine = archardAdhesiveWearEngine;

// ─── Core Archard Equation ─────────────────────────────────────────────────

describe("Archard wear equation: V = K × W × L / H", () => {
  it("calculates wear volume proportional to load (W)", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r1 = engine.calculate(base);
    const r2 = engine.calculate({ ...base, normalForce: 200 });

    // Double the load → double the wear
    expect(r2.wearVolume / r1.wearVolume).toBeCloseTo(2, 3);
  });

  it("calculates wear volume proportional to sliding distance (L)", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r1 = engine.calculate(base);
    const r2 = engine.calculate({ ...base, slidingDistance: 30000 });

    // Triple the distance → triple the wear
    expect(r2.wearVolume / r1.wearVolume).toBeCloseTo(3, 3);
  });

  it("calculates wear volume inversely proportional to hardness (H)", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 400, // Higher workpiece hardness
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r1 = engine.calculate(base);
    // Use lower workpiece hardness → softer material, more wear
    const r2 = engine.calculate({ ...base, workpieceHardness: 200 });

    // Half the effective hardness → double the wear
    expect(r2.wearVolume / r1.wearVolume).toBeCloseTo(2, 1);
  });

  it("calculates wear volume proportional to wear coefficient (K)", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r1 = engine.calculate(base);
    const r2 = engine.calculate({ ...base, wearCoefficient: 5e-5 });

    // 5x the coefficient → 5x the wear
    expect(r2.wearVolume / r1.wearVolume).toBeCloseTo(5, 3);
  });

  it("manual verification: V = 1e-5 × 100 × 10000 / (200 × 9.81)", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200, // This is the softer material
      contactArea: 1,
      wearCoefficient: 1e-5,
    });

    // V = K × W × L / H
    // V = 1e-5 × 100 × 10000 / (200 × 9.81)
    // V = 10 / 1962 = 0.005097 mm³
    const expected = (1e-5 * 100 * 10000) / (200 * 9.81);
    expect(result.wearVolume).toBeCloseTo(expected, 6);
  });
});

// ─── Flank Wear (VB) Conversion ────────────────────────────────────────────

describe("flank wear VB conversion", () => {
  it("VB = V / contact_area", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 0.5, // 0.5 mm²
      wearCoefficient: 1e-5,
    });

    // VB = V / A
    expect(result.flankWear_VB).toBeCloseTo(result.wearVolume / 0.5, 6);
  });

  it("smaller contact area → higher VB for same volume", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r1 = engine.calculate({ ...base, contactArea: 1.0 });
    const r2 = engine.calculate({ ...base, contactArea: 0.5 });

    // Half the area → double the VB
    expect(r2.flankWear_VB / r1.flankWear_VB).toBeCloseTo(2, 3);
  });
});

// ─── Material Pair Coefficients ────────────────────────────────────────────

describe("wear coefficient lookup", () => {
  it("returns valid K for carbide vs steel pairs", () => {
    const K = engine.getWearCoefficient("CARBIDE", "STEEL_MEDIUM");
    expect(K).toBeGreaterThan(0);
    expect(K).toBeLessThan(0.01);
  });

  it("PCD has very low K for aluminum (optimal pair)", () => {
    const K_pcd_al = engine.getWearCoefficient("PCD", "ALUMINUM");
    const K_carbide_al = engine.getWearCoefficient("CARBIDE", "ALUMINUM");

    // PCD should have much lower wear on aluminum
    expect(K_pcd_al).toBeLessThan(K_carbide_al);
  });

  it("CBN has low K for hardened steel (optimal pair)", () => {
    const K_cbn_hard = engine.getWearCoefficient("CBN", "STEEL_HARDENED");
    const K_carbide_hard = engine.getWearCoefficient("CARBIDE", "STEEL_HARDENED");

    // CBN should have lower wear on hardened steel
    expect(K_cbn_hard).toBeLessThan(K_carbide_hard);
  });

  it("uses material pair from input if specified", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      toolMaterial: "CARBIDE_COATED",
      workpieceMaterial: "STEEL_MILD",
    });

    const expectedK = engine.getWearCoefficient("CARBIDE_COATED", "STEEL_MILD");
    expect(result.wearCoefficientUsed).toBe(expectedK);
  });

  it("getWearCoefficientTable returns complete table", () => {
    const table = engine.getWearCoefficientTable("CARBIDE");

    // Should have entries for all workpiece materials
    const workpieceMaterials = engine.getWorkpieceMaterials();
    for (const wp of workpieceMaterials) {
      expect(table[wp]).toBeGreaterThan(0);
    }
  });
});

// ─── Hardness Lookup ───────────────────────────────────────────────────────

describe("hardness lookup", () => {
  it("getToolHardness returns reasonable values", () => {
    expect(engine.getToolHardness("HSS")).toBeCloseTo(800, 0);
    expect(engine.getToolHardness("CARBIDE")).toBeCloseTo(1600, 0);
    expect(engine.getToolHardness("CBN")).toBeCloseTo(4500, 0);
  });

  it("getWorkpieceHardness returns reasonable values", () => {
    expect(engine.getWorkpieceHardness("ALUMINUM")).toBeLessThan(150);
    expect(engine.getWorkpieceHardness("STEEL_HARDENED")).toBeGreaterThan(500);
  });

  it("tool materials array is complete", () => {
    const materials = engine.getToolMaterials();
    expect(materials).toContain("HSS");
    expect(materials).toContain("CARBIDE");
    expect(materials).toContain("CBN");
    expect(materials).toContain("PCD");
    expect(materials.length).toBeGreaterThanOrEqual(8);
  });
});

// ─── Temperature Correction ────────────────────────────────────────────────

describe("temperature correction", () => {
  it("higher temperature increases wear (via hardness reduction)", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r_cold = engine.calculate({ ...base, temperature: 20 });
    const r_hot = engine.calculate({ ...base, temperature: 600 });

    // Higher temperature → more wear
    expect(r_hot.wearVolume).toBeGreaterThan(r_cold.wearVolume);
  });

  it("extreme temperature triggers warning", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
      temperature: 1000,
    });

    expect(result.warnings.some(w => w.includes("temperature"))).toBe(true);
  });

  it("effective hardness is reported correctly", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200, // Softer
      contactArea: 1,
      wearCoefficient: 1e-5,
      temperature: 20,
    });

    // Effective hardness should be the softer material
    expect(result.effectiveHardness).toBe(200);
  });
});

// ─── Lubrication Factor ────────────────────────────────────────────────────

describe("lubrication factor", () => {
  it("lubrication reduces wear", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const r_dry = engine.calculate({ ...base, lubricationFactor: 1.0 });
    const r_lub = engine.calculate({ ...base, lubricationFactor: 0.3 });

    // Lubrication should reduce wear by factor
    expect(r_lub.wearVolume / r_dry.wearVolume).toBeCloseTo(0.3, 2);
  });
});

// ─── Wear Regime Classification ────────────────────────────────────────────

describe("wear regime classification", () => {
  it("classifies mild wear correctly", () => {
    const result = engine.calculate({
      normalForce: 50,
      slidingDistance: 1000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-6,
      vbLimit: 0.3,
    });

    expect(result.wearRegime).toBe("mild");
  });

  it("classifies severe wear correctly", () => {
    const result = engine.calculate({
      normalForce: 500,
      slidingDistance: 50000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 0.5,
      wearCoefficient: 1e-4,
      vbLimit: 0.3,
    });

    // High K and load should produce severe or catastrophic
    expect(["severe", "catastrophic"]).toContain(result.wearRegime);
  });

  it("catastrophic wear triggers warning", () => {
    const result = engine.calculate({
      normalForce: 1000,
      slidingDistance: 100000,
      toolHardness: 800, // Soft tool
      workpieceHardness: 200,
      contactArea: 0.1,
      wearCoefficient: 5e-4,
      vbLimit: 0.3,
    });

    if (result.wearRegime === "catastrophic") {
      expect(result.warnings.some(w => w.includes("CRITICAL"))).toBe(true);
    }
  });
});

// ─── Remaining Life Estimation ─────────────────────────────────────────────

describe("remaining life estimation", () => {
  it("calculates remaining life when VB < limit", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 5000, // Short distance
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-6,
      vbLimit: 0.3,
    });

    expect(result.flankWear_VB).toBeLessThan(0.3);
    expect(result.remainingLife_mm).toBeGreaterThan(0);
    expect(result.remainingLife_pct).toBeGreaterThan(0);
    expect(result.remainingLife_pct).toBeLessThanOrEqual(100);
  });

  it("remaining life decreases with sliding distance", () => {
    const base: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 5000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
      vbLimit: 0.3,
    };

    const r1 = engine.calculate(base);
    const r2 = engine.calculate({ ...base, slidingDistance: 20000 });

    expect(r2.remainingLife_pct).toBeLessThan(r1.remainingLife_pct);
  });
});

// ─── Wear Rate Calculation ─────────────────────────────────────────────────

describe("wear rate calculation", () => {
  it("wear rate = dV/dL = K × W / H", () => {
    const K = 1e-5;
    const W = 100;
    const H_hv = 200;
    const H = H_hv * 9.81;

    const result = engine.calculate({
      normalForce: W,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: H_hv,
      contactArea: 1,
      wearCoefficient: K,
    });

    const expectedRate = (K * W) / H;
    expect(result.wearRate).toBeCloseTo(expectedRate, 9);
  });

  it("specific wear rate is K/H", () => {
    const K = 1e-5;
    const H_hv = 200;
    const H = H_hv * 9.81;

    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: H_hv,
      contactArea: 1,
      wearCoefficient: K,
    });

    expect(result.specificWearRate).toBeCloseTo(K / H, 15);
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe("input validation", () => {
  it("rejects zero normal force", () => {
    const validation = engine.validate({
      normalForce: 0,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.some(i => i.field === "normalForce")).toBe(true);
  });

  it("rejects negative sliding distance", () => {
    const validation = engine.validate({
      normalForce: 100,
      slidingDistance: -1000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.some(i => i.field === "slidingDistance")).toBe(true);
  });

  it("rejects zero contact area", () => {
    const validation = engine.validate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 0,
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.some(i => i.field === "contactArea")).toBe(true);
  });

  it("warns when workpiece hardness approaches tool hardness", () => {
    const validation = engine.validate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 800, // Soft tool (HSS)
      workpieceHardness: 700, // Very hard workpiece
      contactArea: 1,
    });

    expect(validation.issues.some(i =>
      i.severity === "warning" && i.message.includes("close to tool hardness")
    )).toBe(true);
  });

  it("accepts valid input", () => {
    const validation = engine.validate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
    });

    expect(validation.valid).toBe(true);
    expect(validation.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });
});

// ─── Convenience Methods ───────────────────────────────────────────────────

describe("calculateFromCuttingParams", () => {
  it("calculates wear from typical turning parameters", () => {
    const result = engine.calculateFromCuttingParams(
      200, // Vc = 200 m/min
      0.2, // f = 0.2 mm/rev
      2.0, // ap = 2 mm
      10,  // t = 10 min
      "CARBIDE_COATED",
      "STEEL_MEDIUM"
    );

    expect(result.wearVolume).toBeGreaterThan(0);
    expect(result.flankWear_VB).toBeGreaterThan(0);
    expect(result.wearRegime).toBeDefined();
  });

  it("higher speed increases wear", () => {
    const r1 = engine.calculateFromCuttingParams(100, 0.2, 2, 10, "CARBIDE", "STEEL_MEDIUM");
    const r2 = engine.calculateFromCuttingParams(300, 0.2, 2, 10, "CARBIDE", "STEEL_MEDIUM");

    // Higher speed → more sliding distance → more wear
    expect(r2.wearVolume).toBeGreaterThan(r1.wearVolume);
  });

  it("longer cutting time increases wear", () => {
    const r1 = engine.calculateFromCuttingParams(200, 0.2, 2, 5, "CARBIDE", "STEEL_MEDIUM");
    const r2 = engine.calculateFromCuttingParams(200, 0.2, 2, 20, "CARBIDE", "STEEL_MEDIUM");

    expect(r2.wearVolume).toBeGreaterThan(r1.wearVolume);
  });
});

// ─── Archard vs Usui Comparison ────────────────────────────────────────────

describe("compareWithUsui", () => {
  it("returns comparison results for both models", () => {
    const input: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const comparison = engine.compareWithUsui(
      input,
      1e-5,  // usui_A
      2000,  // usui_B
      5,     // cutting time (min)
      600    // interface temp (°C)
    );

    expect(comparison.archard_vb).toBeGreaterThanOrEqual(0);
    expect(comparison.usui_vb).toBeGreaterThanOrEqual(0);
    expect(comparison.difference_pct).toBeGreaterThanOrEqual(0);
    expect(["archard", "usui", "equal"]).toContain(comparison.higherPrediction);
    expect(["archard", "usui", "either"]).toContain(comparison.recommendedModel);
    expect(comparison.reasoning.length).toBeGreaterThan(0);
  });

  it("recommends Usui at high temperature", () => {
    const input: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const comparison = engine.compareWithUsui(input, 1e-5, 2000, 5, 900);

    expect(comparison.recommendedModel).toBe("usui");
    expect(comparison.reasoning).toContain("temperature");
  });

  it("Usui wear increases with temperature (Arrhenius)", () => {
    const input: ArchardWearInput = {
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    };

    const c1 = engine.compareWithUsui(input, 1e-5, 2000, 5, 500);
    const c2 = engine.compareWithUsui(input, 1e-5, 2000, 5, 800);

    expect(c2.usui_vb).toBeGreaterThan(c1.usui_vb);
  });
});

// ─── Metadata ──────────────────────────────────────────────────────────────

describe("metadata", () => {
  it("provides complete algorithm metadata", () => {
    const meta = engine.getMetadata();

    expect(meta.id).toBe("archard-adhesive-wear");
    expect(meta.name).toContain("Archard");
    expect(meta.equation_plain).toContain("V = K");
    expect(meta.equation_latex).toContain("K");
    expect(meta.domain).toBe("tool_life");
    expect(meta.references).toBeDefined();
    expect(meta.references!.length).toBeGreaterThan(0);
    expect(meta.references![0].year).toBe(1953);
  });

  it("includes valid ranges", () => {
    const meta = engine.getMetadata();

    expect(meta.valid_ranges).toBeDefined();
    expect(meta.valid_ranges!.normalForce.min).toBeLessThan(meta.valid_ranges!.normalForce.max);
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles very small wear coefficient", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-9, // Small but not tiny
    });

    expect(result.wearVolume).toBeGreaterThan(0);
    expect(result.wearVolume).toBeLessThan(1e-3);
  });

  it("handles very large sliding distance", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 1e8, // 100 km
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-6,
    });

    expect(Number.isFinite(result.wearVolume)).toBe(true);
  });

  it("handles very hard tool material", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 8000, // PCD
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    });

    // Effective hardness should be workpiece (softer)
    expect(result.effectiveHardness).toBe(200);
  });

  it("uses minimum hardness for wear calculation", () => {
    // When tool is softer than workpiece
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 100, // Very soft tool
      workpieceHardness: 600, // Hardened steel
      contactArea: 1,
      wearCoefficient: 1e-5,
    });

    // Effective hardness should be tool (softer)
    expect(result.effectiveHardness).toBe(100);
  });
});

// ─── Dimensional Consistency ───────────────────────────────────────────────

describe("dimensional consistency", () => {
  it("wear volume has correct units (mm³)", () => {
    // V [mm³] = K [dimensionless] × W [N] × L [mm] / H [N/mm²]
    // V = [1] × [N] × [mm] / [N/mm²] = [mm³] ✓
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    });

    // Verify units by manual calculation
    const K = 1e-5;
    const W = 100; // N
    const L = 10000; // mm
    const H = 200 * 9.81; // N/mm²

    const expected_V = (K * W * L) / H; // mm³
    expect(result.wearVolume).toBeCloseTo(expected_V, 6);
  });

  it("flank wear has correct units (mm)", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 2, // mm²
      wearCoefficient: 1e-5,
    });

    // VB [mm] = V [mm³] / A [mm²] = [mm] ✓
    expect(result.flankWear_VB).toBeCloseTo(result.wearVolume / 2, 6);
  });

  it("wear rate has correct units (mm³/mm)", () => {
    const result = engine.calculate({
      normalForce: 100,
      slidingDistance: 10000,
      toolHardness: 1600,
      workpieceHardness: 200,
      contactArea: 1,
      wearCoefficient: 1e-5,
    });

    // dV/dL = K × W / H [mm³/mm]
    // Verify: V = rate × L
    expect(result.wearVolume).toBeCloseTo(result.wearRate * 10000, 6);
  });
});
