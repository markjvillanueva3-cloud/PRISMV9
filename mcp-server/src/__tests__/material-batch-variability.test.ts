/**
 * MaterialBatchVariabilityEngine Tests
 * Tests correlated MC sampling, Cholesky decomposition, Bayesian updating,
 * and machinability impact for all 9 material families.
 */
import { describe, it, expect } from "vitest";
import {
  materialBatchVariabilityEngine,
  MaterialBatchVariabilityEngine,
} from "../engines/MaterialBatchVariabilityEngine.js";
import type {
  MaterialBatchInput,
} from "../engines/MaterialBatchVariabilityEngine.js";

const engine = materialBatchVariabilityEngine;

// ── Cholesky decomposition ──────────────────────────────────────────────
describe("choleskyDecompose", () => {
  it("2x2 identity produces identity L", () => {
    const L = engine.choleskyDecompose([1, 0, 1], 2);
    expect(L[0][0]).toBeCloseTo(1, 5);
    expect(L[1][0]).toBeCloseTo(0, 5);
    expect(L[1][1]).toBeCloseTo(1, 5);
  });

  it("2x2 correlated produces valid L", () => {
    // [[1, 0.8], [0.8, 1]]
    const L = engine.choleskyDecompose([1, 0.8, 1], 2);
    expect(L[0][0]).toBeCloseTo(1, 5);
    expect(L[1][0]).toBeCloseTo(0.8, 5);
    // L[1][1] = sqrt(1 - 0.64) = sqrt(0.36) = 0.6
    expect(L[1][1]).toBeCloseTo(0.6, 5);
  });

  it("L·L^T reconstructs original", () => {
    const corr = [1, 0.8, 1];
    const L = engine.choleskyDecompose(corr, 2);
    // Reconstruct A = L·L^T
    const a00 = L[0][0] * L[0][0];
    const a01 = L[0][0] * L[1][0];
    const a11 = L[1][0] * L[1][0] + L[1][1] * L[1][1];
    expect(a00).toBeCloseTo(1, 5);
    expect(a01).toBeCloseTo(0.8, 5);
    expect(a11).toBeCloseTo(1, 5);
  });
});

// ── Bayesian update ─────────────────────────────────────────────────────
describe("bayesianUpdate", () => {
  it("returns prior with empty observations", () => {
    const r = engine.bayesianUpdate(200, 100, []);
    expect(r.mean).toBe(200);
    expect(r.var).toBe(100);
  });

  it("shifts toward observations", () => {
    const obs = [220, 225, 218, 222];
    const r = engine.bayesianUpdate(200, 100, obs);
    expect(r.mean).toBeGreaterThan(200);
    expect(r.mean).toBeLessThan(225);
  });

  it("posterior variance < prior variance", () => {
    const obs = [205, 210, 195];
    const r = engine.bayesianUpdate(200, 400, obs);
    expect(r.var).toBeLessThan(400);
  });
});

// ── Full analysis ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: MaterialBatchInput = {
    material_family: "carbon_steel",
    mc_samples: 500,
  };

  it("returns complete result structure", () => {
    const r = engine.analyze(baseInput);
    expect(r.properties).toHaveLength(6);
    expect(r.correlations.length).toBeGreaterThan(0);
    expect(r.machinability.kc11_mean_N_mm2).toBeGreaterThan(0);
    expect(r.machinability.force_cv_pct).toBeGreaterThan(0);
    expect(r.bayesian_updated).toBe(false);
    expect(r.formula).toContain("Cholesky");
    expect(r.formula).toContain("Bayes");
  });

  it("all properties have positive mean and std", () => {
    const r = engine.analyze(baseInput);
    for (const p of r.properties) {
      expect(p.mean).toBeGreaterThan(0);
      expect(p.std).toBeGreaterThanOrEqual(0);
      expect(p.p5).toBeLessThan(p.p95);
    }
  });

  it("hardness-yield correlation is positive", () => {
    const r = engine.analyze(baseInput);
    const hy = r.correlations.find(
      c => c.prop_a === "Hardness" && c.prop_b === "Yield Strength",
    );
    expect(hy).toBeDefined();
    expect(hy!.rho).toBeGreaterThan(0.5);
  });

  it("hardness-elongation correlation is negative", () => {
    const r = engine.analyze(baseInput);
    const he = r.correlations.find(
      c => c.prop_a === "Hardness" && c.prop_b === "Elongation",
    );
    expect(he).toBeDefined();
    expect(he!.rho).toBeLessThan(0);
  });

  it("works for all 9 material families", () => {
    const families = [
      "carbon_steel", "alloy_steel", "stainless_steel",
      "aluminum", "titanium", "inconel",
      "cast_iron", "brass", "copper",
    ] as const;
    for (const f of families) {
      const r = engine.analyze({ material_family: f, mc_samples: 100 });
      expect(r.properties).toHaveLength(6);
      expect(r.machinability.kc11_mean_N_mm2).toBeGreaterThan(0);
    }
  });

  it("titanium has higher kc1.1 than aluminum", () => {
    const ti = engine.analyze({
      material_family: "titanium", mc_samples: 200,
    });
    const al = engine.analyze({
      material_family: "aluminum", mc_samples: 200,
    });
    expect(ti.machinability.kc11_mean_N_mm2)
      .toBeGreaterThan(al.machinability.kc11_mean_N_mm2);
  });

  it("inconel has lowest Taylor C (hardest to machine)", () => {
    const inc = engine.analyze({
      material_family: "inconel", mc_samples: 200,
    });
    const al = engine.analyze({
      material_family: "aluminum", mc_samples: 200,
    });
    expect(inc.machinability.taylor_C_mean)
      .toBeLessThan(al.machinability.taylor_C_mean);
  });

  it("custom nominal hardness shifts distribution", () => {
    const default_ = engine.analyze(baseInput);
    const harder = engine.analyze({
      ...baseInput, nominal_hardness: 300,
    });
    expect(harder.properties[0].mean)
      .toBeGreaterThan(default_.properties[0].mean);
  });

  it("Bayesian update with cert data", () => {
    const r = engine.analyze({
      ...baseInput,
      cert_data: {
        hardness_values: [210, 215, 208, 212],
      },
    });
    expect(r.bayesian_updated).toBe(true);
    // Posterior hardness mean should be near 211
    expect(r.properties[0].mean).toBeGreaterThan(195);
    expect(r.properties[0].mean).toBeLessThan(220);
  });

  it("cast iron warns about graphite scatter", () => {
    const r = engine.analyze({
      material_family: "cast_iron", mc_samples: 100,
    });
    expect(r.warnings.some(w => w.includes("graphite"))).toBe(true);
  });

  it("recommends cert data when not provided", () => {
    const r = engine.analyze(baseInput);
    expect(r.recommendations.some(
      rec => rec.includes("cert data"),
    )).toBe(true);
  });

  it("force CV matches kc1.1 variation", () => {
    const r = engine.analyze(baseInput);
    expect(r.machinability.force_cv_pct).toBeGreaterThan(0);
    expect(r.machinability.force_cv_pct).toBeLessThan(30);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(materialBatchVariabilityEngine)
      .toBeInstanceOf(MaterialBatchVariabilityEngine);
  });
});
