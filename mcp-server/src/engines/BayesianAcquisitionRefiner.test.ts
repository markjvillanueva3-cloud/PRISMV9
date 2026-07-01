/**
 * BayesianAcquisitionRefiner — synergy test for L-BFGS-B-driven acquisition
 * polishing on top of a BayesianOptimizer warm start.
 *
 * Real-value assertions — every test confirms improvement on a known
 * acquisition surface with a known argmax.
 *
 * @module engines/BayesianAcquisitionRefiner.test
 */

import { describe, it, expect } from "vitest";
import { bayesianAcquisitionRefiner } from "./BayesianAcquisitionRefiner.js";

describe("BayesianAcquisitionRefiner — argmax discovery on synthetic surfaces", () => {
  it("locally polishes a poor start toward a known unimodal maximum", () => {
    // Acquisition surface: −(x-3)² (maximum at x=3). Start at x=1.
    const out = bayesianAcquisitionRefiner.refine({
      initialPoint: [1],
      acquisitionFn: (x) => -((x[0] - 3) ** 2),
      lower: [0],
      upper: [10],
    });
    expect(out.improved).toBe(true);
    expect(out.refinedPoint[0]).toBeCloseTo(3, 3);
    expect(out.refinedAcquisition).toBeGreaterThan(out.initialAcquisition);
    expect(out.refinedAcquisition).toBeCloseTo(0, 6);
  });

  it("2D quadratic: argmax at (1, -2) when starting at (0, 0)", () => {
    // Acquisition: −((x-1)² + (y+2)²). Maximum at (1, -2).
    const out = bayesianAcquisitionRefiner.refine({
      initialPoint: [0, 0],
      acquisitionFn: (x) => -((x[0] - 1) ** 2 + (x[1] + 2) ** 2),
      lower: [-5, -5],
      upper: [5, 5],
    });
    expect(out.improved).toBe(true);
    expect(out.refinedPoint[0]).toBeCloseTo(1, 3);
    expect(out.refinedPoint[1]).toBeCloseTo(-2, 3);
  });

  it("respects upper bound when argmax lies outside the box", () => {
    // Acquisition: −((x-100)²) — true argmax at 100, but upper=10.
    // Bounded refinement should land at the upper bound.
    const out = bayesianAcquisitionRefiner.refine({
      initialPoint: [5],
      acquisitionFn: (x) => -((x[0] - 100) ** 2),
      lower: [-10],
      upper: [10],
    });
    expect(out.refinedPoint[0]).toBeCloseTo(10, 4);
  });

  it("returns starting point on non-finite acquisition (R12 fail-loud)", () => {
    const out = bayesianAcquisitionRefiner.refine({
      initialPoint: [0],
      acquisitionFn: () => NaN,
      lower: [-1],
      upper: [1],
    });
    expect(out.status).toBe("non_finite");
    expect(out.improved).toBe(false);
    expect(out.warnings.some((w) => w.includes("non-finite"))).toBe(true);
  });

  it("reports iterations and evaluations from the underlying L-BFGS-B", () => {
    const out = bayesianAcquisitionRefiner.refine({
      initialPoint: [10, 10],
      acquisitionFn: (x) => -(x[0] * x[0] + x[1] * x[1]),
      lower: [-100, -100],
      upper: [100, 100],
    });
    expect(out.iterations).toBeGreaterThan(0);
    expect(out.evaluations).toBeGreaterThanOrEqual(out.iterations);
    expect(out.status).toMatch(/^converged_/);
  });
});

describe("BayesianAcquisitionRefiner — synergy: improves over random-sample warm start", () => {
  it("a 'best of 100 random samples' start can be polished to a strictly better acquisition", () => {
    // Simulate a BO output: best of 100 uniform random samples on [-5, 5]^2
    // against the bowl-shaped acquisition. The true argmax is (1, -2).
    const acquisition = (x: ReadonlyArray<number>) =>
      -((x[0] - 1) ** 2 + (x[1] + 2) ** 2);
    let bestX: number[] = [0, 0];
    let bestA = -Infinity;
    // Deterministic 100-sample grid (not truly random — just spans the box).
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const x = [-5 + i * (10 / 9), -5 + j * (10 / 9)];
        const a = acquisition(x);
        if (a > bestA) {
          bestA = a;
          bestX = x;
        }
      }
    }
    // Now polish from this grid-best start.
    const out = bayesianAcquisitionRefiner.refine({
      initialPoint: bestX,
      acquisitionFn: acquisition,
      lower: [-5, -5],
      upper: [5, 5],
    });
    // The refined point is strictly closer to the true argmax.
    expect(out.improved).toBe(true);
    expect(Math.abs(out.refinedPoint[0] - 1)).toBeLessThan(
      Math.abs(bestX[0] - 1) + 1e-6,
    );
    expect(Math.abs(out.refinedPoint[1] - -2)).toBeLessThan(
      Math.abs(bestX[1] - -2) + 1e-6,
    );
  });
});
