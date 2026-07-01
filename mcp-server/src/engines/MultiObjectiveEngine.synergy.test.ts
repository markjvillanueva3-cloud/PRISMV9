/**
 * MultiObjectiveEngine — synergy test for canonical hypervolume integration
 * (ALGO-SYNERGY-MS0/U-ALGO-MAT-10). Verifies the new hypervolume_canonical
 * field is populated end-to-end through nsgaII().
 *
 * @module engines/MultiObjectiveEngine.synergy.test
 */

import { describe, it, expect } from "vitest";
import { multiObjectiveEngine } from "./MultiObjectiveEngine.js";

describe("Synergy: MultiObjectiveEngine.nsgaII produces canonical hypervolume", () => {
  it("2D Schaffer N.1: f1=x^2, f2=(x-2)^2 — canonical HV is finite and positive", () => {
    const out = multiObjectiveEngine.nsgaII({
      objectives: [(x) => x[0] * x[0], (x) => (x[0] - 2) ** 2],
      bounds: [[-5, 5]],
      populationSize: 40,
      maxGenerations: 20,
    });
    expect(out.hypervolume_canonical).not.toBeNull();
    const hv = out.hypervolume_canonical!;
    expect(hv.value).toBeGreaterThan(0);
    expect(Number.isFinite(hv.value)).toBe(true);
    expect(hv.algorithm).toBe("2d_sweep");
    expect(hv.reference).toHaveLength(2);
    expect(hv.front_size).toBe(out.paretoFront.length);
  });

  it("3D problem: 3 conflicting minimization objectives → 3d_slice kernel", () => {
    // Sum-of-squares-style separable objectives so the front is non-trivial.
    const out = multiObjectiveEngine.nsgaII({
      objectives: [
        (x) => x[0] * x[0],
        (x) => (x[0] - 1) ** 2,
        (x) => Math.abs(x[0]),
      ],
      bounds: [[-3, 3]],
      populationSize: 30,
      maxGenerations: 15,
    });
    expect(out.hypervolume_canonical).not.toBeNull();
    expect(out.hypervolume_canonical!.algorithm).toBe("3d_slice");
    expect(out.hypervolume_canonical!.reference).toHaveLength(3);
  });

  it("HV reference dominates every frontier point in every objective", () => {
    const out = multiObjectiveEngine.nsgaII({
      objectives: [(x) => x[0] * x[0], (x) => (x[0] - 2) ** 2],
      bounds: [[-5, 5]],
      populationSize: 30,
      maxGenerations: 15,
    });
    if (out.hypervolume_canonical === null) return;
    const ref = out.hypervolume_canonical.reference;
    for (const p of out.paretoFront) {
      for (let i = 0; i < ref.length; i++) {
        expect(ref[i]).toBeGreaterThanOrEqual(p.objectives[i]);
      }
    }
  });
});
