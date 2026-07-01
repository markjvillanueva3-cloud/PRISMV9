/**
 * MOEAStoppingCriterion — synergy test.
 * Verifies the HV-saturation stopping logic against synthetic improving + saturated trajectories.
 *
 * @module engines/MOEAStoppingCriterion.test
 */

import { describe, it, expect } from "vitest";
import { MOEAStoppingCriterion } from "./MOEAStoppingCriterion.js";

describe("MOEAStoppingCriterion — saturation detection", () => {
  it("does not stop while HV keeps improving generation over generation", () => {
    const stopper = new MOEAStoppingCriterion({
      tolerance: 1e-3,
      stableWindow: 3,
      lookback: 2,
      maxGenerations: 50,
      reference: [11, 11],
    });
    // Simulate strictly improving fronts: each generation adds a strictly better point.
    const ref: Point[] = [];
    const fronts: number[][][] = [
      [[10, 10]],
      [[8, 10], [10, 8]],
      [[6, 10], [8, 8], [10, 6]],
      [[4, 10], [6, 8], [8, 6], [10, 4]],
      [[2, 10], [4, 8], [6, 6], [8, 4], [10, 2]],
    ];
    const decisions = fronts.map((f) =>
      stopper.evaluate(f.map((p) => p as readonly number[])),
    );
    type Point = readonly number[];
    expect(ref.length).toBe(0);
    // None of the early fronts should hit saturation (HV keeps growing).
    for (const d of decisions) {
      expect(d.shouldStop).toBe(false);
    }
    // HV trajectory monotone non-decreasing.
    const traj = stopper.trajectory();
    for (let i = 1; i < traj.length; i++) {
      expect(traj[i]).toBeGreaterThanOrEqual(traj[i - 1] - 1e-9);
    }
  });

  it("stops with reason='saturated' after stableWindow flat generations", () => {
    const stopper = new MOEAStoppingCriterion({
      tolerance: 1e-3,
      stableWindow: 2,
      lookback: 1,
      maxGenerations: 50,
      reference: [11, 11],
    });
    // 3 improving fronts then 4 identical (saturated) fronts.
    const flatFront: number[][] = [[5, 5], [3, 7], [7, 3]];
    const fronts: number[][][] = [
      [[10, 10]],
      [[8, 10], [10, 8]],
      flatFront,
      flatFront,
      flatFront,
      flatFront,
    ];
    let finalDecision = stopper.evaluate(fronts[0].map((p) => p as readonly number[]));
    for (let i = 1; i < fronts.length; i++) {
      finalDecision = stopper.evaluate(fronts[i].map((p) => p as readonly number[]));
      if (finalDecision.shouldStop) break;
    }
    expect(finalDecision.shouldStop).toBe(true);
    expect(finalDecision.reason).toBe("saturated");
  });

  it("stops with reason='max_generations' if HV never saturates", () => {
    const stopper = new MOEAStoppingCriterion({
      tolerance: 0, // any nonzero positive improvement keeps running
      stableWindow: 2,
      lookback: 1,
      maxGenerations: 4,
      reference: [11, 11],
    });
    // 5 strictly improving generations — by generation 4 we hit maxGenerations.
    const fronts: number[][][] = [
      [[10, 10]],
      [[9, 10]],
      [[8, 10]],
      [[7, 10]],
    ];
    let final = stopper.evaluate(fronts[0] as unknown as readonly number[][]);
    for (let i = 1; i < fronts.length; i++) {
      final = stopper.evaluate(fronts[i] as unknown as readonly number[][]);
    }
    expect(final.shouldStop).toBe(true);
    expect(final.reason).toBe("max_generations");
    expect(final.generation).toBe(4);
  });

  it("empty fronts return reason='no_data' and do not stop", () => {
    const stopper = new MOEAStoppingCriterion();
    const d = stopper.evaluate([]);
    expect(d.reason).toBe("no_data");
    expect(d.shouldStop).toBe(false);
    expect(Number.isNaN(d.hypervolume)).toBe(true);
  });

  it("reset() clears history + saturated streak", () => {
    const stopper = new MOEAStoppingCriterion({ stableWindow: 1 });
    stopper.evaluate([[5, 5]]);
    stopper.evaluate([[5, 5]]);
    expect(stopper.trajectory().length).toBe(2);
    stopper.reset();
    expect(stopper.trajectory().length).toBe(0);
  });
});

describe("MOEAStoppingCriterion — synergy: HV trajectory is monotone with improving fronts", () => {
  it("exposes the trajectory for downstream /system-viz convergence plotting", () => {
    const stopper = new MOEAStoppingCriterion({
      tolerance: 1e-9,
      stableWindow: 999, // prevent saturation-stop in this test
      maxGenerations: 100,
      reference: [11, 11],
    });
    const improvements: ReadonlyArray<readonly number[][]> = [
      [[10, 10]],
      [[8, 10], [10, 8]],
      [[5, 10], [8, 8], [10, 5]],
    ];
    for (const f of improvements) stopper.evaluate(f);
    const traj = stopper.trajectory();
    expect(traj.length).toBe(3);
    expect(traj[2]).toBeGreaterThan(traj[1]);
    expect(traj[1]).toBeGreaterThan(traj[0]);
  });
});
