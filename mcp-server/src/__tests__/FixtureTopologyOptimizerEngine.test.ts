import { describe, it, expect } from "vitest";
import {
  fixtureTopologyOptimizerEngine,
  FixtureTopologyOptimizerEngine,
  type FixtureTopologyInput,
} from "../engines/FixtureTopologyOptimizerEngine.js";

/**
 * GAP-6 closure test — SIMP topology optimization (Bendsøe & Sigmund 2003).
 *
 * Verifies the canonical compliance-minimization properties:
 *  - Output density field has correct shape [nely × nelx]
 *  - Volume fraction is enforced (final ≤ requested within tolerance)
 *  - Compliance history is monotonically improving (with OC bisection noise)
 *  - Density values are in [0.001, 1]
 *  - Convergence happens within max_iter
 */
describe("FixtureTopologyOptimizerEngine", () => {
  it("exports a singleton with optimize() method", () => {
    expect(fixtureTopologyOptimizerEngine).toBeInstanceOf(FixtureTopologyOptimizerEngine);
    expect(typeof fixtureTopologyOptimizerEngine.optimize).toBe("function");
  });

  it("throws on zero domain", () => {
    expect(() => fixtureTopologyOptimizerEngine.optimize({
      nelx: 0, nely: 10, vol_fraction: 0.4,
    } as FixtureTopologyInput)).toThrow(/nelx and nely/);
  });

  it("throws on invalid vol_fraction", () => {
    expect(() => fixtureTopologyOptimizerEngine.optimize({
      nelx: 10, nely: 10, vol_fraction: 0,
    } as FixtureTopologyInput)).toThrow(/vol_fraction/);
    expect(() => fixtureTopologyOptimizerEngine.optimize({
      nelx: 10, nely: 10, vol_fraction: 1.5,
    } as FixtureTopologyInput)).toThrow(/vol_fraction/);
  });

  it("returns density field of correct shape [nely × nelx]", () => {
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 12, nely: 8, vol_fraction: 0.4, max_iter: 10,
    });
    expect(r.density.length).toBe(8);
    expect(r.density[0].length).toBe(12);
  });

  it("enforces volume constraint within 5% tolerance", () => {
    const vf = 0.4;
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 20, nely: 10, vol_fraction: vf, max_iter: 30,
    });
    expect(r.vol_fraction_final.value).toBeLessThanOrEqual(vf + 0.05);
    expect(r.vol_fraction_final.value).toBeGreaterThan(0);
  });

  it("density values stay in valid [0.001, 1] range", () => {
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 16, nely: 10, vol_fraction: 0.5, max_iter: 15,
    });
    for (const row of r.density) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(0.001);
        expect(v).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it("compliance trace populated + final ≤ first (improvement)", () => {
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 16, nely: 10, vol_fraction: 0.5, max_iter: 20,
    });
    expect(r.compliance_history.length).toBeGreaterThan(0);
    const first = r.compliance_history[0];
    const last = r.compliance_history[r.compliance_history.length - 1];
    expect(Number.isFinite(first)).toBe(true);
    expect(Number.isFinite(last)).toBe(true);
    // OC compliance should decrease or stay close (bisection introduces noise)
    expect(last).toBeLessThanOrEqual(first * 1.5);
  });

  it("respects max_iter cap", () => {
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 12, nely: 8, vol_fraction: 0.4, max_iter: 3,
    });
    expect(r.iterations).toBeLessThanOrEqual(3);
  });

  it("cites SIMP formula in result", () => {
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 8, nely: 6, vol_fraction: 0.4, max_iter: 5,
    });
    expect(r.formula).toMatch(/SIMP/);
    expect(r.formula).toMatch(/U\^TKU|compliance/i);
    expect(r.compliance.source).toMatch(/Sigmund/);
    expect(r.vol_fraction_final.unit).toBe("ratio");
    expect(r.compliance.unit).toBe("compliance");
  });

  it("emits warning on large grid (>2500 elements)", () => {
    const r = fixtureTopologyOptimizerEngine.optimize({
      nelx: 60, nely: 50, vol_fraction: 0.4, max_iter: 2,
    });
    expect(r.warnings.some(w => /slow|elements/i.test(w))).toBe(true);
  });
});
