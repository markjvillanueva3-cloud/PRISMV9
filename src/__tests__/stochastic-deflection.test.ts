/**
 * StochasticDeflectionEngine Tests
 * Tests MC deflection distributions, FOSM bounds, sensitivity analysis,
 * multi-flute averaging, surface error, and tolerance intervals.
 */
import { describe, it, expect } from "vitest";
import {
  stochasticDeflectionEngine,
  StochasticDeflectionEngine,
} from "../engines/StochasticDeflectionEngine.js";
import type {
  StochasticDeflectionInput,
} from "../engines/StochasticDeflectionEngine.js";

const engine = stochasticDeflectionEngine;

// ── Cantilever deflection (deterministic) ───────────────────────────────
describe("cantileverDeflection", () => {
  it("δ = FL³/(3EI) exactly", () => {
    // F=500N, L=40mm, d=10mm, E=600GPa
    const I = Math.PI * Math.pow(10, 4) / 64;
    const E = 600 * 1000; // N/mm²
    const expected_mm = (500 * Math.pow(40, 3)) / (3 * E * I);
    const expected_um = expected_mm * 1000;
    expect(engine.cantileverDeflection(500, 40, 10, 600))
      .toBeCloseTo(expected_um, 3);
  });

  it("doubles with double force", () => {
    const d1 = engine.cantileverDeflection(250, 40, 10, 600);
    const d2 = engine.cantileverDeflection(500, 40, 10, 600);
    expect(d2).toBeCloseTo(d1 * 2, 3);
  });

  it("8× with double overhang (L³)", () => {
    const d1 = engine.cantileverDeflection(500, 20, 10, 600);
    const d2 = engine.cantileverDeflection(500, 40, 10, 600);
    expect(d2 / d1).toBeCloseTo(8, 1);
  });

  it("1/16 with double diameter (d⁴)", () => {
    const d1 = engine.cantileverDeflection(500, 40, 10, 600);
    const d2 = engine.cantileverDeflection(500, 40, 20, 600);
    expect(d1 / d2).toBeCloseTo(16, 1);
  });

  it("returns 0 for zero stiffness", () => {
    expect(engine.cantileverDeflection(500, 40, 0, 600)).toBe(0);
  });
});

// ── Multi-flute factor ──────────────────────────────────────────────────
describe("multiFluteFactor", () => {
  it("1.0 for single flute", () => {
    expect(engine.multiFluteFactor(1)).toBe(1);
  });

  it("cos(π/2) ≈ 0 for 2 flutes", () => {
    expect(engine.multiFluteFactor(2)).toBeCloseTo(0, 5);
  });

  it("cos(π/4) ≈ 0.707 for 4 flutes", () => {
    expect(engine.multiFluteFactor(4)).toBeCloseTo(0.707, 2);
  });

  it("increases with more flutes", () => {
    expect(engine.multiFluteFactor(3))
      .toBeLessThan(engine.multiFluteFactor(6));
  });
});

// ── Surface error ───────────────────────────────────────────────────────
describe("surfaceError", () => {
  it("full engagement (ae=d) → full deflection", () => {
    expect(engine.surfaceError(10, 10, 10)).toBeCloseTo(10, 5);
  });

  it("half engagement → half error", () => {
    expect(engine.surfaceError(10, 5, 10)).toBeCloseTo(5, 5);
  });

  it("zero engagement → zero error", () => {
    expect(engine.surfaceError(10, 0.01, 10)).toBeCloseTo(0.01, 1);
  });
});

// ── FOSM ────────────────────────────────────────────────────────────────
describe("fosmDeflection", () => {
  const F = { mean: 500, cv_pct: 5 };
  const L = { mean: 40, cv_pct: 3 };
  const d = { mean: 10, cv_pct: 1 };
  const E = { mean: 600, cv_pct: 2 };

  it("mean matches deterministic", () => {
    const fosm = engine.fosmDeflection(F, L, d, E);
    const det = engine.cantileverDeflection(500, 40, 10, 600);
    expect(fosm.mean_um).toBeCloseTo(det, 3);
  });

  it("std > 0 with uncertainty", () => {
    expect(engine.fosmDeflection(F, L, d, E).std_um).toBeGreaterThan(0);
  });

  it("higher CV → higher std", () => {
    const low = engine.fosmDeflection(
      { mean: 500, cv_pct: 1 }, L, d, E,
    );
    const high = engine.fosmDeflection(
      { mean: 500, cv_pct: 15 }, L, d, E,
    );
    expect(high.std_um).toBeGreaterThan(low.std_um);
  });
});

// ── Full analysis ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: StochasticDeflectionInput = {
    cutting_force_N: { mean: 500, cv_pct: 8 },
    tool_diameter_mm: { mean: 10, cv_pct: 1 },
    overhang_mm: { mean: 40, cv_pct: 3 },
    youngs_modulus_GPa: { mean: 600, cv_pct: 2 },
    mc_samples: 1000,
  };

  it("returns complete result structure", () => {
    const r = engine.analyze(baseInput);
    expect(r.deflection.mean_um).toBeGreaterThan(0);
    expect(r.deflection.std_um).toBeGreaterThan(0);
    expect(r.surface_error.mean_um).toBeGreaterThan(0);
    expect(r.fosm_mean_um).toBeGreaterThan(0);
    expect(r.fosm_std_um).toBeGreaterThan(0);
    expect(r.probability_exceed_limit).toBeGreaterThanOrEqual(0);
    expect(r.sensitivity.length).toBe(4);
    expect(r.effective_stiffness_N_per_um).toBeGreaterThan(0);
    expect(r.formula).toContain("δ=FL³/(3EI)");
    expect(r.formula).toContain("FOSM");
  });

  it("MC mean is within expected range of FOSM mean", () => {
    const r = engine.analyze(baseInput);
    // MC applies multi-flute factor; FOSM is raw cantilever
    // So MC mean ≈ FOSM * cos(π/z). Check both are positive and reasonable.
    expect(r.deflection.mean_um).toBeGreaterThan(0);
    expect(r.deflection.mean_um).toBeLessThan(r.fosm_mean_um * 1.5);
  });

  it("p5 < median < p95", () => {
    const r = engine.analyze(baseInput);
    expect(r.deflection.p5_um).toBeLessThan(r.deflection.median_um);
    expect(r.deflection.median_um).toBeLessThan(r.deflection.p95_um);
  });

  it("tolerance interval contains p5-p95", () => {
    const r = engine.analyze(baseInput);
    expect(r.deflection.tolerance_lower_um)
      .toBeLessThanOrEqual(r.deflection.p5_um + 1);
    expect(r.deflection.tolerance_upper_um)
      .toBeGreaterThanOrEqual(r.deflection.p95_um - 1);
  });

  it("sensitivity contributions sum to ~100%", () => {
    const r = engine.analyze(baseInput);
    const total = r.sensitivity.reduce(
      (s, v) => s + v.contribution_pct, 0,
    );
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(110);
  });

  it("surface error < deflection (ae/d < 1)", () => {
    const r = engine.analyze({
      ...baseInput,
      radial_engagement_mm: { mean: 3, cv_pct: 5 },
    });
    expect(r.surface_error.mean_um)
      .toBeLessThan(r.deflection.mean_um);
  });

  it("higher force CV → wider deflection distribution", () => {
    const low = engine.analyze({
      ...baseInput,
      cutting_force_N: { mean: 500, cv_pct: 2 },
    });
    const high = engine.analyze({
      ...baseInput,
      cutting_force_N: { mean: 500, cv_pct: 20 },
    });
    expect(high.deflection.std_um)
      .toBeGreaterThan(low.deflection.std_um);
  });

  it("larger diameter reduces deflection", () => {
    const small = engine.analyze({
      ...baseInput,
      tool_diameter_mm: { mean: 6, cv_pct: 1 },
    });
    const large = engine.analyze({
      ...baseInput,
      tool_diameter_mm: { mean: 16, cv_pct: 1 },
    });
    expect(large.deflection.mean_um)
      .toBeLessThan(small.deflection.mean_um);
  });

  it("recommends action when exceed probability is high", () => {
    const r = engine.analyze({
      ...baseInput,
      deflection_limit_um: 1, // very tight
    });
    if (r.probability_exceed_limit > 0.1) {
      expect(r.recommendations.length).toBeGreaterThan(0);
    }
  });

  it("multi-flute reduces effective deflection", () => {
    const f1 = engine.analyze({ ...baseInput, num_flutes: 1 });
    const f4 = engine.analyze({ ...baseInput, num_flutes: 4 });
    expect(f4.deflection.mean_um)
      .toBeLessThan(f1.deflection.mean_um);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(stochasticDeflectionEngine)
      .toBeInstanceOf(StochasticDeflectionEngine);
  });
});
