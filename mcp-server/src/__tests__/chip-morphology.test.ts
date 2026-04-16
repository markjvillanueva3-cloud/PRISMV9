/**
 * ChipMorphologyDiagnosticEngine Tests
 * Tests Merchant/Lee-Shaffer shear models, chip classification, and process diagnostics.
 */
import { describe, it, expect } from "vitest";
import {
  chipMorphologyDiagnosticEngine,
  ChipMorphologyDiagnosticEngine,
} from "../engines/ChipMorphologyDiagnosticEngine.js";
import type { ChipDiagnoseInput } from "../engines/ChipMorphologyDiagnosticEngine.js";

const engine = chipMorphologyDiagnosticEngine;

// ── Merchant shear angle ────────────────────────────────────────────────
describe("merchantShearAngle", () => {
  it("returns ~25° for typical steel (µ=0.5, α=6°)", () => {
    const phi = engine.merchantShearAngle(6, 0.5);
    expect(phi).toBeGreaterThan(20);
    expect(phi).toBeLessThan(35);
  });

  it("increases with higher rake angle", () => {
    const phi1 = engine.merchantShearAngle(0, 0.5);
    const phi2 = engine.merchantShearAngle(15, 0.5);
    expect(phi2).toBeGreaterThan(phi1);
  });

  it("decreases with higher friction", () => {
    const phi1 = engine.merchantShearAngle(6, 0.3);
    const phi2 = engine.merchantShearAngle(6, 0.8);
    expect(phi1).toBeGreaterThan(phi2);
  });

  it("clamps to [5, 45] range", () => {
    const phiLow = engine.merchantShearAngle(-30, 1.5);
    const phiHigh = engine.merchantShearAngle(40, 0.01);
    expect(phiLow).toBeGreaterThanOrEqual(5);
    expect(phiHigh).toBeLessThanOrEqual(45);
  });

  it("satisfies Merchant formula: φ = π/4 - β/2 + α/2", () => {
    const alpha = 10;
    const mu = 0.4;
    const beta = Math.atan(mu);
    const expected = (Math.PI / 4 - beta / 2 + (alpha * Math.PI / 180) / 2) * 180 / Math.PI;
    const phi = engine.merchantShearAngle(alpha, mu);
    expect(phi).toBeCloseTo(expected, 5);
  });
});

// ── Lee-Shaffer shear angle ─────────────────────────────────────────────
describe("leeShafferShearAngle", () => {
  it("returns lower angle than Merchant for same conditions", () => {
    const merchant = engine.merchantShearAngle(6, 0.5);
    const ls = engine.leeShafferShearAngle(6, 0.5);
    expect(ls).toBeLessThanOrEqual(merchant);
  });

  it("satisfies Lee-Shaffer formula: φ = π/4 - β + α", () => {
    const alpha = 10;
    const mu = 0.4;
    const beta = Math.atan(mu);
    const expected = (Math.PI / 4 - beta + (alpha * Math.PI / 180)) * 180 / Math.PI;
    const clamped = Math.max(5, Math.min(45, expected));
    const phi = engine.leeShafferShearAngle(alpha, mu);
    expect(phi).toBeCloseTo(clamped, 5);
  });

  it("clamps to [5, 45]", () => {
    const phi = engine.leeShafferShearAngle(-20, 1.2);
    expect(phi).toBeGreaterThanOrEqual(5);
  });
});

// ── Chip compression ratio ──────────────────────────────────────────────
describe("chipCompressionRatio", () => {
  it("rc > 0 for typical conditions", () => {
    const rc = engine.chipCompressionRatio(25, 6);
    expect(rc).toBeGreaterThan(0);
  });

  it("rc = sin(φ)/cos(φ-α) mathematically", () => {
    const phiDeg = 30, alphaDeg = 10;
    const phi = phiDeg * Math.PI / 180;
    const alpha = alphaDeg * Math.PI / 180;
    const expected = Math.sin(phi) / Math.cos(phi - alpha);
    expect(engine.chipCompressionRatio(phiDeg, alphaDeg)).toBeCloseTo(expected, 8);
  });

  it("handles near-singular denominator gracefully", () => {
    // φ - α ≈ 90° would make cos → 0
    const rc = engine.chipCompressionRatio(45, -45);
    expect(Number.isFinite(rc)).toBe(true);
  });
});

// ── Shear strain ────────────────────────────────────────────────────────
describe("shearStrain", () => {
  it("γ > 0 for typical conditions", () => {
    const gamma = engine.shearStrain(25, 6);
    expect(gamma).toBeGreaterThan(0);
  });

  it("γ = cos(α)/[sin(φ)cos(φ-α)] mathematically", () => {
    const phiDeg = 30, alphaDeg = 10;
    const phi = phiDeg * Math.PI / 180;
    const alpha = alphaDeg * Math.PI / 180;
    const expected = Math.cos(alpha) / (Math.sin(phi) * Math.cos(phi - alpha));
    expect(engine.shearStrain(phiDeg, alphaDeg)).toBeCloseTo(expected, 8);
  });

  it("decreases with higher shear angle", () => {
    const g1 = engine.shearStrain(15, 6);
    const g2 = engine.shearStrain(40, 6);
    expect(g1).toBeGreaterThan(g2);
  });
});

// ── Chip type prediction ────────────────────────────────────────────────
describe("predictChipType", () => {
  const baseInput: ChipDiagnoseInput = {
    cutting_speed_mmin: 100,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2,
    rake_angle_deg: 6,
    material_type: "steel",
  };

  it("predicts continuous for ductile steel at moderate conditions", () => {
    const pred = engine.predictChipType(baseInput);
    expect(pred.predicted_type).toBe("continuous");
    expect(pred.confidence_pct).toBeGreaterThan(50);
    expect(pred.shear_angle_deg).toBeGreaterThan(5);
    expect(pred.chip_compression_ratio).toBeGreaterThan(0);
    expect(pred.shear_strain).toBeGreaterThan(0);
    expect(pred.chip_thickness_mm).toBeGreaterThan(0);
  });

  it("predicts discontinuous for cast iron", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      material_type: "cast_iron",
    });
    expect(pred.predicted_type).toBe("discontinuous");
  });

  it("predicts elemental for brittle material with extreme negative rake", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      material_type: "cast_iron",
      rake_angle_deg: -15,
    });
    expect(pred.predicted_type).toBe("elemental");
  });

  it("predicts segmented for titanium at high speed", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      material_type: "titanium",
      cutting_speed_mmin: 80,
    });
    expect(pred.predicted_type).toBe("segmented");
    expect(pred.segmentation_risk).toBe("high");
  });

  it("predicts segmented for inconel at moderate speed", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      material_type: "inconel",
      cutting_speed_mmin: 50,
    });
    expect(pred.predicted_type).toBe("segmented");
  });

  it("predicts continuous_bue for low-speed steel without coolant", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      cutting_speed_mmin: 30,
      feed_mm_rev: 0.15,
      coolant_applied: false,
    });
    expect(pred.predicted_type).toBe("continuous_bue");
  });

  it("predicts helical/spiral shape with chip breaker", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      chip_breaker_present: true,
      feed_mm_rev: 0.2,
    });
    expect(["helical", "spiral"]).toContain(pred.predicted_shape);
  });

  it("predicts ribbon/tubular shape without chip breaker", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      chip_breaker_present: false,
    });
    expect(["ribbon", "tubular"]).toContain(pred.predicted_shape);
  });

  it("uses provided elongation_pct over material default", () => {
    const pred = engine.predictChipType({
      ...baseInput,
      elongation_pct: 2, // very brittle override
    });
    expect(["discontinuous", "elemental"]).toContain(pred.predicted_type);
  });
});

// ── Process diagnosis ───────────────────────────────────────────────────
describe("diagnoseFromObservation", () => {
  const baseInput: ChipDiagnoseInput = {
    cutting_speed_mmin: 100,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2,
    rake_angle_deg: 6,
    material_type: "steel",
  };

  it("returns good health for normal conditions", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      observed_chip_color: "golden",
      observed_chip_shape: "helical",
      coolant_applied: true,
    });
    expect(diag.health).toBe("good");
    expect(diag.temperature_estimate_C).toBe(300);
  });

  it("warns on blue/purple chips (400-450°C)", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      observed_chip_color: "blue",
    });
    expect(diag.health).toBe("warning");
    expect(diag.issues.length).toBeGreaterThan(0);
    expect(diag.temperature_estimate_C).toBe(400);
  });

  it("critical on black chips (>600°C)", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      observed_chip_color: "black",
    });
    expect(diag.health).toBe("critical");
    expect(diag.temperature_estimate_C).toBe(600);
  });

  it("flags ribbon/snarled chips for entanglement", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      observed_chip_shape: "ribbon",
    });
    expect(diag.issues.some(i => i.includes("entanglement"))).toBe(true);
    expect(diag.recommendations.some(r => r.includes("chip breaker"))).toBe(true);
  });

  it("flags needle chips", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      observed_chip_shape: "needle",
    });
    expect(diag.issues.some(i => i.includes("Needle"))).toBe(true);
  });

  it("flags BUE risk for low speed without coolant", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      cutting_speed_mmin: 30,
      coolant_applied: false,
    });
    expect(diag.issues.some(i => i.includes("BUE"))).toBe(true);
  });

  it("flags titanium at high speed", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      material_type: "titanium",
      cutting_speed_mmin: 100,
    });
    expect(diag.issues.some(i => i.includes("Titanium"))).toBe(true);
  });

  it("returns healthy recommendation when no issues", () => {
    const diag = engine.diagnoseFromObservation({
      ...baseInput,
      observed_chip_color: "silver",
      observed_chip_shape: "helical",
      coolant_applied: true,
    });
    expect(diag.recommendations.some(r => r.includes("healthy"))).toBe(true);
  });

  it("defaults temperature to 300 when no color observed", () => {
    const diag = engine.diagnoseFromObservation(baseInput);
    expect(diag.temperature_estimate_C).toBe(300);
  });
});

// ── Main diagnose entry ─────────────────────────────────────────────────
describe("diagnose (full pipeline)", () => {
  it("returns complete result structure", () => {
    const result = engine.diagnose({
      cutting_speed_mmin: 100,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      rake_angle_deg: 6,
      material_type: "steel",
      observed_chip_color: "golden",
      observed_chip_shape: "helical",
    });
    expect(result.prediction).toBeDefined();
    expect(result.diagnosis).toBeDefined();
    expect(result.merchant_shear_deg).toBeGreaterThan(0);
    expect(result.lee_shaffer_shear_deg).toBeGreaterThan(0);
    expect(result.formula).toContain("Merchant");
    expect(result.formula).toContain("Lee-Shaffer");
    expect(result.formula).toContain("Recht");
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("warns when Merchant and Lee-Shaffer diverge >10°", () => {
    // High friction + low rake → maximum divergence
    const result = engine.diagnose({
      cutting_speed_mmin: 100,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      rake_angle_deg: -5,
      material_type: "inconel", // µ=0.6 → high friction
    });
    const merchantLS = Math.abs(result.merchant_shear_deg - result.lee_shaffer_shear_deg);
    if (merchantLS > 10) {
      expect(result.warnings.some(w => w.includes("differ by >10°"))).toBe(true);
    }
  });

  it("works for all 9 material types", () => {
    const materials = [
      "steel", "stainless", "aluminum", "titanium",
      "inconel", "cast_iron", "brass", "copper", "plastic",
    ] as const;
    for (const mat of materials) {
      const result = engine.diagnose({
        cutting_speed_mmin: 80,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 1.5,
        rake_angle_deg: 6,
        material_type: mat,
      });
      expect(result.prediction.predicted_type).toBeTruthy();
      expect(result.diagnosis.health).toBeTruthy();
    }
  });
});

// ── Instance and export ─────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(chipMorphologyDiagnosticEngine).toBeInstanceOf(ChipMorphologyDiagnosticEngine);
  });
});
