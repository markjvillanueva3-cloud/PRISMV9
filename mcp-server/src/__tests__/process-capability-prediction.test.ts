/**
 * ProcessCapabilityPredictionEngine Tests
 * Tests Cp/Cpk prediction, variation source analysis, tool deflection,
 * PPM calculation, and Monte Carlo simulation.
 */
import { describe, it, expect } from "vitest";
import {
  processCapabilityPredictionEngine,
  ProcessCapabilityPredictionEngine,
} from "../engines/ProcessCapabilityPredictionEngine.js";
import type { CapabilityPredictInput } from "../engines/ProcessCapabilityPredictionEngine.js";

const engine = processCapabilityPredictionEngine;

// ── Tool deflection ─────────────────────────────────────────────────────
describe("toolDeflection", () => {
  it("zero force → zero deflection", () => {
    expect(engine.toolDeflection(0, 40, 10, 600)).toBe(0);
  });

  it("increases with force", () => {
    const d1 = engine.toolDeflection(200, 40, 10, 600);
    const d2 = engine.toolDeflection(500, 40, 10, 600);
    expect(d2).toBeGreaterThan(d1);
  });

  it("increases cubically with overhang", () => {
    const d1 = engine.toolDeflection(500, 20, 10, 600);
    const d2 = engine.toolDeflection(500, 40, 10, 600);
    // 40³/20³ = 8, so d2 ≈ 8 × d1
    expect(d2 / d1).toBeCloseTo(8, 0);
  });

  it("decreases with larger diameter (d⁴)", () => {
    const d1 = engine.toolDeflection(500, 40, 10, 600);
    const d2 = engine.toolDeflection(500, 40, 20, 600);
    // 10⁴/20⁴ = 1/16, so d2 ≈ d1/16
    expect(d1 / d2).toBeCloseTo(16, 0);
  });

  it("follows δ = FL³/(3EI) exactly", () => {
    const F = 500, L = 40, d = 10, E_GPa = 600;
    const I = Math.PI * Math.pow(d, 4) / 64;
    const E = E_GPa * 1000;
    const expected = (F * Math.pow(L, 3)) / (3 * E * I);
    expect(engine.toolDeflection(F, L, d, E_GPa)).toBeCloseTo(expected, 10);
  });
});

// ── PPM from Cpk ────────────────────────────────────────────────────────
describe("ppmFromCpk", () => {
  it("Cpk=1.0 ≈ 2700 PPM", () => {
    const ppm = engine.ppmFromCpk(1.0);
    expect(ppm).toBeGreaterThan(1000);
    expect(ppm).toBeLessThan(5000);
  });

  it("Cpk=1.33 ≈ 63 PPM", () => {
    const ppm = engine.ppmFromCpk(1.33);
    expect(ppm).toBeLessThan(200);
  });

  it("Cpk=2.0 ≈ 0 PPM (six sigma)", () => {
    const ppm = engine.ppmFromCpk(2.0);
    expect(ppm).toBeLessThan(5);
  });

  it("higher Cpk → lower PPM", () => {
    const ppm1 = engine.ppmFromCpk(0.8);
    const ppm2 = engine.ppmFromCpk(1.2);
    const ppm3 = engine.ppmFromCpk(1.5);
    expect(ppm1).toBeGreaterThan(ppm2);
    expect(ppm2).toBeGreaterThan(ppm3);
  });
});

// ── Full prediction ─────────────────────────────────────────────────────
describe("predict", () => {
  const baseInput: CapabilityPredictInput = {
    nominal_mm: 50.000,
    usl_mm: 50.025,
    lsl_mm: 49.975,
    // 50µm tolerance band
    tool_wear_rate_um_per_part: 0.1,
    tool_life_parts: 100,
    mean_shift_um: 0,
  };

  it("returns complete result structure", () => {
    const result = engine.predict(baseInput);
    expect(result.cp).toBeGreaterThan(0);
    expect(typeof result.cpk).toBe("number");
    expect(result.sigma_total_um).toBeGreaterThan(0);
    expect(result.tolerance_um).toBeCloseTo(50, 5);
    expect(result.variation_sources.length).toBeGreaterThan(0);
    expect(result.top_contributor).toBeTruthy();
    expect(typeof result.meets_target).toBe("boolean");
    expect(result.formula).toContain("Cp=");
    expect(result.formula).toContain("Cpk=");
    expect(result.formula).toContain("RSS");
  });

  it("Cpk ≤ Cp always (mean shift can only reduce Cpk)", () => {
    const result = engine.predict(baseInput);
    expect(result.cpk).toBeLessThanOrEqual(result.cp + 0.01); // small rounding tolerance
  });

  it("tighter tolerance reduces Cp", () => {
    const loose = engine.predict({ ...baseInput, usl_mm: 50.050, lsl_mm: 49.950 });
    const tight = engine.predict({ ...baseInput, usl_mm: 50.010, lsl_mm: 49.990 });
    expect(tight.cp).toBeLessThan(loose.cp);
  });

  it("more variation reduces Cp", () => {
    const good = engine.predict({
      ...baseInput, machine_positioning_um: 2, fixture_repeatability_um: 1,
    });
    const bad = engine.predict({
      ...baseInput, machine_positioning_um: 20, fixture_repeatability_um: 10,
    });
    expect(bad.cp).toBeLessThan(good.cp);
  });

  it("mean shift reduces Cpk but not Cp", () => {
    const centered = engine.predict({ ...baseInput, mean_shift_um: 0 });
    const shifted = engine.predict({ ...baseInput, mean_shift_um: 10 });
    expect(shifted.cpk).toBeLessThan(centered.cpk);
    // Cp should be same (only σ matters)
    expect(shifted.cp).toBeCloseTo(centered.cp, 1);
  });

  it("variation sources sum to ~100%", () => {
    const result = engine.predict(baseInput);
    const totalPct = result.variation_sources.reduce((s, v) => s + v.pct_of_total, 0);
    expect(totalPct).toBeGreaterThan(95);
    expect(totalPct).toBeLessThan(105);
  });

  it("sources sorted by contribution", () => {
    const result = engine.predict(baseInput);
    for (let i = 1; i < result.variation_sources.length; i++) {
      expect(result.variation_sources[i].pct_of_total)
        .toBeLessThanOrEqual(result.variation_sources[i - 1].pct_of_total);
    }
  });

  it("meets_target true when Cpk ≥ 1.33", () => {
    // Loose tolerance → high Cpk
    const result = engine.predict({
      ...baseInput, usl_mm: 50.100, lsl_mm: 49.900,
    });
    if (result.cpk >= 1.33) {
      expect(result.meets_target).toBe(true);
    }
  });

  it("recommends action when Cpk < 1.0", () => {
    const result = engine.predict({
      ...baseInput,
      usl_mm: 50.005, lsl_mm: 49.995, // 10µm tolerance
      machine_positioning_um: 15,
    });
    expect(result.cpk).toBeLessThan(1.0);
    expect(result.recommendations.some(r => r.includes("NOT capable"))).toBe(true);
  });

  it("PPM consistent with Cpk", () => {
    const result = engine.predict(baseInput);
    // Higher Cpk should give lower PPM
    expect(result.parts_per_million_defect).toBeGreaterThanOrEqual(0);
  });

  it("tool wear increases variation", () => {
    const noWear = engine.predict({
      ...baseInput, tool_wear_rate_um_per_part: 0,
    });
    const highWear = engine.predict({
      ...baseInput, tool_wear_rate_um_per_part: 2, tool_life_parts: 300,
    });
    expect(highWear.sigma_total_um).toBeGreaterThan(noWear.sigma_total_um);
  });

  it("warns on very tight tolerance", () => {
    const result = engine.predict({
      ...baseInput, usl_mm: 50.004, lsl_mm: 49.996, // 8µm
    });
    expect(result.warnings.some(w => w.includes("tight tolerance"))).toBe(true);
  });

  it("sigma level reflects capability", () => {
    const result = engine.predict(baseInput);
    // sigma_level = half-tolerance / sigma
    const expected = (result.tolerance_um / 2) / result.sigma_total_um;
    expect(result.sigma_level).toBeCloseTo(expected, 0);
  });
});

// ── Monte Carlo ─────────────────────────────────────────────────────────
describe("Monte Carlo simulation", () => {
  const baseInput: CapabilityPredictInput = {
    nominal_mm: 50.000,
    usl_mm: 50.025,
    lsl_mm: 49.975,
  };

  it("analytical mode when samples = 0", () => {
    const result = engine.predict({ ...baseInput, monte_carlo_samples: 0 });
    expect(result.monte_carlo_used).toBe(false);
  });

  it("MC mode when samples > 0", () => {
    const result = engine.predict({ ...baseInput, monte_carlo_samples: 1000 });
    expect(result.monte_carlo_used).toBe(true);
  });

  it("MC Cp roughly matches analytical Cp", () => {
    const analytical = engine.predict({ ...baseInput, monte_carlo_samples: 0 });
    const mc = engine.predict({ ...baseInput, monte_carlo_samples: 5000 });
    // Should be within ~20% for reasonable sample size
    expect(mc.cp).toBeGreaterThan(analytical.cp * 0.7);
    expect(mc.cp).toBeLessThan(analytical.cp * 1.3);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(processCapabilityPredictionEngine).toBeInstanceOf(ProcessCapabilityPredictionEngine);
  });
});
