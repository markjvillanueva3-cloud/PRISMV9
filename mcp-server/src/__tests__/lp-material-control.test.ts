/**
 * Tests for LinearProgrammingEngine, MaterialInterpolationEngine,
 * and NumericalMethodsEngine control systems extensions.
 * Round 5 reverse-engineering from PRISM v8.89 monolith.
 */
import { describe, it, expect } from "vitest";
import { linearProgrammingEngine } from "../engines/LinearProgrammingEngine.js";
import { materialInterpolationEngine } from "../engines/MaterialInterpolationEngine.js";
import { numericalMethodsEngine } from "../engines/NumericalMethodsEngine.js";

// ============================================================================
// LinearProgrammingEngine
// ============================================================================

describe("LinearProgrammingEngine — Simplex Solver", () => {
  it("solves simple 2-variable LP", () => {
    // max 3x + 2y s.t. x+y<=4, x+3y<=6, x,y>=0
    const result = linearProgrammingEngine.solve({
      c: [3, 2],
      A: [[1, 1], [1, 3]],
      b: [4, 6],
      maximize: true,
    });
    expect(result.feasible).toBe(true);
    expect(result.optimal).toBe(true);
    // Optimal: x=4,y=0 → obj=12 (vertex x+y<=4: 4<=4 OK, x+3y<=6: 4<=6 OK)
    expect(result.objective).toBeCloseTo(12, 4);
  });

  it("solves minimization problem", () => {
    // min x + y s.t. x+y>=2 → -x-y<=-2
    // But we need b>=0 for this simplex. Use: min x+y s.t. 2x+y<=10, x+2y<=10
    const result = linearProgrammingEngine.solve({
      c: [1, 1],
      A: [[2, 1], [1, 2]],
      b: [10, 10],
    });
    expect(result.feasible).toBe(true);
    expect(result.optimal).toBe(true);
    expect(result.objective).toBeCloseTo(0, 4); // min at origin
  });

  it("detects unbounded problem", () => {
    // max x s.t. -x <= 0 (no upper bound)
    const result = linearProgrammingEngine.solve({
      c: [1],
      A: [[-1]],
      b: [0],
      maximize: true,
    });
    expect(result.unbounded).toBe(true);
  });

  it("returns dual values (shadow prices)", () => {
    const result = linearProgrammingEngine.solve({
      c: [5, 4],
      A: [[6, 4], [1, 2], [0, 1]],
      b: [24, 6, 2],
      maximize: true,
    });
    expect(result.feasible).toBe(true);
    expect(result.dualValues.length).toBe(3);
  });

  it("handles single-variable LP", () => {
    // min 3x s.t. x <= 10
    const result = linearProgrammingEngine.solve({
      c: [3],
      A: [[1]],
      b: [10],
    });
    expect(result.feasible).toBe(true);
    expect(result.optimal).toBe(true);
    expect(result.x[0]).toBeCloseTo(0, 6);
    expect(result.objective).toBeCloseTo(0, 6);
  });
});

describe("LinearProgrammingEngine — Manufacturing Applications", () => {
  it("solves resource allocation problem", () => {
    // 2 products, 3 resources
    const result = linearProgrammingEngine.solveResourceAllocation({
      productProfits: [10, 15],
      resourceUsage: [
        [2, 4],  // product 1 uses 2h machine A, 4h machine B
        [3, 2],  // product 2 uses 3h machine A, 2h machine B
      ],
      resourceLimits: [100, 80],
    });
    expect(result.feasible).toBe(true);
    expect(result.profit).toBeGreaterThan(0);
    expect(result.production.length).toBe(2);
    expect(result.shadowPrices.length).toBe(2);
  });

  it("resource allocation respects max production", () => {
    const result = linearProgrammingEngine.solveResourceAllocation({
      productProfits: [10, 15],
      resourceUsage: [[1, 1], [1, 1]],
      resourceLimits: [100, 100],
      maxProduction: [20, 20],
    });
    expect(result.feasible).toBe(true);
    // Each product capped at 20
    expect(result.production[0]).toBeLessThanOrEqual(20.01);
    expect(result.production[1]).toBeLessThanOrEqual(20.01);
  });
});

// ============================================================================
// MaterialInterpolationEngine
// ============================================================================

describe("MaterialInterpolationEngine — Similarity Search", () => {
  it("finds exact match with high similarity", () => {
    const results = materialInterpolationEngine.findSimilar("aluminum_6061");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("aluminum_6061");
    expect(results[0].similarity).toBeCloseTo(1, 4);
  });

  it("ranks aluminum alloys as similar to each other", () => {
    const results = materialInterpolationEngine.findSimilar("aluminum_6061");
    const alNames = results.filter(r => r.name.includes("aluminum"));
    expect(alNames.length).toBeGreaterThanOrEqual(2);
    // Second aluminum should be ranked higher than steel
    const al7075 = results.find(r => r.name === "aluminum_7075");
    const steel = results.find(r => r.name === "steel_4340");
    if (al7075 && steel) {
      expect(al7075.similarity).toBeGreaterThan(steel.similarity);
    }
  });

  it("estimates properties from material name", () => {
    const results = materialInterpolationEngine.findSimilar("titanium alloy");
    expect(results.length).toBeGreaterThan(0);
    // Titanium should be ranked near the top
    const tiIdx = results.findIndex(r => r.name === "titanium_6al4v");
    expect(tiIdx).toBeGreaterThanOrEqual(0);
    expect(tiIdx).toBeLessThan(3); // Top 3
  });

  it("uses known properties for better matching", () => {
    // Provide all 4 properties of aluminum_6061 for a strong match
    const results = materialInterpolationEngine.findSimilar(
      "mystery metal", { hardness: 95, tensile: 45000, thermal: 167, machinability: 0.9 }
    );
    // Should match aluminum_6061 exactly
    expect(results[0].name).toBe("aluminum_6061");
  });

  it("returns requested number of results", () => {
    const results = materialInterpolationEngine.findSimilar("steel", {}, 3);
    expect(results.length).toBe(3);
  });
});

describe("MaterialInterpolationEngine — Parameter Interpolation", () => {
  it("interpolates cutting parameters for known material", () => {
    const params = materialInterpolationEngine.interpolateParams("aluminum_6061");
    // Safety factor 0.85 applied to similarity-weighted average across top 5
    expect(params.sfm).toBeGreaterThan(300);
    expect(params.chipLoad).toBeGreaterThan(0.001);
    expect(params.confidence).toBeGreaterThan(90);
    expect(params.safetyFactorApplied).toBe(0.85);
  });

  it("gives conservative params for unknown material", () => {
    const known = materialInterpolationEngine.interpolateParams("aluminum_6061");
    const unknown = materialInterpolationEngine.interpolateParams("unobtainium");
    expect(unknown.sfm).toBeLessThanOrEqual(known.sfm);
    // Unknown material has lower or equal confidence
    expect(unknown.confidence).toBeLessThanOrEqual(known.confidence);
  });

  it("applies custom safety factor", () => {
    const safe = materialInterpolationEngine.interpolateParams("steel_4140", {}, 0.7);
    const normal = materialInterpolationEngine.interpolateParams("steel_4140", {}, 1.0);
    expect(safe.sfm).toBeLessThan(normal.sfm);
  });

  it("warns on low confidence", () => {
    const params = materialInterpolationEngine.interpolateParams("exotic_alloy_xyz");
    if (params.confidence < 70) {
      expect(params.warning).toBeDefined();
    }
  });
});

describe("MaterialInterpolationEngine — Compare & List", () => {
  it("lists all 11 materials", () => {
    const list = materialInterpolationEngine.listMaterials();
    expect(list.length).toBe(11);
    expect(list.some(m => m.id === "brass_360")).toBe(true);
  });

  it("compares two materials", () => {
    const cmp = materialInterpolationEngine.compareMaterials(
      "aluminum_6061", "aluminum_7075"
    );
    expect(cmp.similarity).toBeGreaterThan(0.9); // Both aluminum
    expect(cmp.paramDiff.sfmRatio).toBeGreaterThan(1); // 6061 faster than 7075
  });

  it("steel vs titanium has lower similarity than same-family", () => {
    const sameFam = materialInterpolationEngine.compareMaterials(
      "steel_1018", "steel_4140"
    );
    const crossFam = materialInterpolationEngine.compareMaterials(
      "steel_1018", "titanium_6al4v"
    );
    expect(crossFam.similarity).toBeLessThan(sameFam.similarity);
  });
});

// ============================================================================
// NumericalMethodsEngine — Control Systems Extensions
// ============================================================================

describe("NumericalMethodsEngine — Ziegler-Nichols", () => {
  it("tunes PID from ultimate gain/period", () => {
    const result = numericalMethodsEngine.zieglerNicholsTuning(10, 0.5, "PID");
    expect(result.Kp).toBeCloseTo(6, 4);      // 0.6 * Ku
    expect(result.Ki).toBeCloseTo(40, 4);      // 2 * Ku / Tu
    expect(result.Kd).toBeCloseTo(0.625, 4);   // Ku * Tu / 8
    expect(result.method).toContain("PID");
  });

  it("tunes P controller", () => {
    const result = numericalMethodsEngine.zieglerNicholsTuning(10, 0.5, "P");
    expect(result.Kp).toBeCloseTo(5, 4);
    expect(result.Ki).toBe(0);
    expect(result.Kd).toBe(0);
  });

  it("tunes PI controller", () => {
    const result = numericalMethodsEngine.zieglerNicholsTuning(10, 0.5, "PI");
    expect(result.Kp).toBeCloseTo(4.5, 4);    // 0.45 * Ku
    expect(result.Ki).toBeCloseTo(24, 4);      // 1.2 * Ku / Tu
    expect(result.Kd).toBe(0);
  });

  it("rejects non-positive inputs", () => {
    expect(() => numericalMethodsEngine.zieglerNicholsTuning(0, 1)).toThrow();
    expect(() => numericalMethodsEngine.zieglerNicholsTuning(1, -1)).toThrow();
  });
});

describe("NumericalMethodsEngine — Step Response", () => {
  it("first-order step response reaches K at t→∞", () => {
    const y = numericalMethodsEngine.firstOrderStep(2, 0.5, 100);
    expect(y).toBeCloseTo(2, 4);
  });

  it("first-order at t=tau reaches 63.2% of K", () => {
    const K = 5;
    const tau = 1;
    const y = numericalMethodsEngine.firstOrderStep(K, tau, tau);
    expect(y).toBeCloseTo(K * (1 - Math.exp(-1)), 4);
  });

  it("second-order underdamped overshoots", () => {
    const K = 1;
    const wn = 10;
    const zeta = 0.2; // underdamped
    // Sample at multiple points to find max
    let maxY = 0;
    for (let t = 0; t < 5; t += 0.01) {
      const y = numericalMethodsEngine.secondOrderStep(K, wn, zeta, t);
      if (y > maxY) maxY = y;
    }
    expect(maxY).toBeGreaterThan(K); // Overshoot
  });

  it("second-order critically damped does not overshoot", () => {
    const K = 1;
    const wn = 10;
    const zeta = 1.0;
    let maxY = 0;
    for (let t = 0; t < 5; t += 0.01) {
      const y = numericalMethodsEngine.secondOrderStep(K, wn, zeta, t);
      if (y > maxY) maxY = y;
    }
    expect(maxY).toBeLessThanOrEqual(K + 0.01);
  });

  it("second-order overdamped settles slowly", () => {
    const K = 1;
    const wn = 10;
    const zeta = 2.0;
    const y_fast = numericalMethodsEngine.secondOrderStep(K, wn, 0.5, 0.5);
    const y_slow = numericalMethodsEngine.secondOrderStep(K, wn, zeta, 0.5);
    // Overdamped should be slower to reach steady state
    expect(y_slow).toBeLessThan(y_fast);
  });

  it("returns 0 at t=0", () => {
    expect(numericalMethodsEngine.secondOrderStep(1, 10, 0.5, 0)).toBe(0);
  });
});
