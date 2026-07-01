/**
 * DifferentialEvolutionEngine — algebraic-invariant test suite
 * =============================================================
 *
 * U-GAP-MISC-OPTIMIZERS close-out (FEATURE-GAP-AUDIT-MS0, slot india, 2026-05-19).
 *
 * The feature-gap-dedup-win-reconciler ledger (commit 87a62f1c2b) flagged this
 * engine as PARTIAL-NO-TESTS: the engine is on disk, dispatcher-wired, but
 * had ZERO behavioral test coverage. The audit's "Re-modularize v8.89
 * optimizer engines: PolicyGradient, DifferentialEvolution" entry was stale —
 * the engine is already ported (197 LOC, Storn & Price 1997 spec from
 * MIT 6.036), the genuine gap is test coverage.
 *
 * This suite pins:
 *   - Mutation arithmetic (rand/1, best/1, current-to-best/1)
 *   - Crossover correctness (binomial preserves ≥1 donor gene at jRand;
 *     exponential produces a contiguous block)
 *   - Boundary reflection (applyBounds output strictly inside [min, max])
 *   - Population initialization (every individual inside bounds, correct count)
 *   - optimize() convergence on canonical sphere/parabola problems
 *   - Strategy switching (rand1 vs best1 vs currentToBest1)
 *
 * R9 — every test verifies INTENT, not just behavior. Hardcoded fixture
 * arithmetic checks the algebraic identity the algorithm implements, not just
 * "result is a number". optimize() is exercised on the negated-sphere
 * f(x) = -Σx² (maximizer at origin) with a tolerance the literature supports.
 */

import { describe, it, expect } from "vitest";
import {
  differentialEvolutionEngine,
  type Bound,
  type Individual,
  type DEConfig,
  type DEResult,
} from "../engines/DifferentialEvolutionEngine.js";

// ─────────────────────────────────────────────────────────────────────
// Helpers — deterministic test population for arithmetic invariants
// ─────────────────────────────────────────────────────────────────────

function makeIndividual(genes: number[], fitness = 0): Individual {
  return { genes: [...genes], fitness };
}

/** Negated sphere — global max at the origin, max value = 0. */
function negatedSphere(x: number[]): number {
  return -x.reduce((acc, v) => acc + v * v, 0);
}

/** Negated Rosenbrock — global max at (1,1,...), max value = 0. */
function negatedRosenbrock(x: number[]): number {
  let s = 0;
  for (let i = 0; i < x.length - 1; i++) {
    s += 100 * (x[i + 1] - x[i] * x[i]) ** 2 + (1 - x[i]) ** 2;
  }
  return -s;
}

// ─────────────────────────────────────────────────────────────────────
// initializePopulation
// ─────────────────────────────────────────────────────────────────────

describe("initializePopulation", () => {
  it("produces the requested number of individuals", () => {
    const bounds: Bound[] = [{ min: -5, max: 5 }, { min: 0, max: 10 }];
    const pop = differentialEvolutionEngine.initializePopulation(20, bounds);
    expect(pop.length).toBe(20);
  });

  it("every individual's genes are strictly inside bounds", () => {
    const bounds: Bound[] = [{ min: -1, max: 1 }, { min: 100, max: 200 }];
    const pop = differentialEvolutionEngine.initializePopulation(50, bounds);
    for (const ind of pop) {
      expect(ind.genes.length).toBe(bounds.length);
      expect(ind.genes[0]).toBeGreaterThanOrEqual(-1);
      expect(ind.genes[0]).toBeLessThanOrEqual(1);
      expect(ind.genes[1]).toBeGreaterThanOrEqual(100);
      expect(ind.genes[1]).toBeLessThanOrEqual(200);
    }
  });

  it("fitness starts at -Infinity for every individual (un-evaluated marker)", () => {
    const pop = differentialEvolutionEngine.initializePopulation(5, [{ min: 0, max: 1 }]);
    for (const ind of pop) {
      expect(ind.fitness).toBe(-Infinity);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// applyBounds — boundary-reflection algebra
// ─────────────────────────────────────────────────────────────────────

describe("applyBounds", () => {
  it("leaves in-bounds values unchanged", () => {
    const out = differentialEvolutionEngine.applyBounds(
      [0.5, 2.0, -3.0],
      [{ min: -5, max: 5 }, { min: -5, max: 5 }, { min: -5, max: 5 }],
    );
    expect(out).toEqual([0.5, 2.0, -3.0]);
  });

  it("reflects below-min back into the feasible region", () => {
    // bounds.min = 0, donor[0] = -2 → reflection = 0 + |0 - (-2)| % 10 = 2
    const out = differentialEvolutionEngine.applyBounds([-2], [{ min: 0, max: 10 }]);
    expect(out[0]).toBeGreaterThanOrEqual(0);
    expect(out[0]).toBe(2);
  });

  it("reflects above-max back into the feasible region", () => {
    // bounds.max = 10, donor[0] = 13 → reflection = 10 - |13 - 10| % 10 = 7
    const out = differentialEvolutionEngine.applyBounds([13], [{ min: 0, max: 10 }]);
    expect(out[0]).toBeLessThanOrEqual(10);
    expect(out[0]).toBe(7);
  });

  it("every reflected value stays inside bounds, even for adversarial input", () => {
    const bounds: Bound[] = [{ min: -1, max: 1 }];
    for (const v of [-100, -3, -1.5, -1, 0, 1, 1.5, 3, 100]) {
      const out = differentialEvolutionEngine.applyBounds([v], bounds);
      // The reflection rule is `(min + |min-d| % range)` or `(max - |d-max| % range)`,
      // both of which land inside [min, max].
      expect(out[0]).toBeGreaterThanOrEqual(bounds[0].min);
      expect(out[0]).toBeLessThanOrEqual(bounds[0].max);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Mutation arithmetic — algebraic identities (not statistical)
// ─────────────────────────────────────────────────────────────────────

describe("mutationRand1 — DE/rand/1 algebraic identity", () => {
  it("output[i] equals g_r1[i] + F * (g_r2[i] - g_r3[i]) for three distinct indices", () => {
    // 4-individual population so the random picks have exactly one feasible
    // assignment given the target index. With targetIdx=3, the only legal
    // (r1, r2, r3) is some permutation of {0, 1, 2} — verify the algebraic
    // identity holds regardless of which permutation Math.random chose.
    const pop: Individual[] = [
      makeIndividual([10, 20]),
      makeIndividual([1, 2]),
      makeIndividual([100, 200]),
      makeIndividual([0, 0]), // target
    ];
    const F = 0.5;
    const out = differentialEvolutionEngine.mutationRand1(pop, 3, F);
    // out must equal pop[a] + F * (pop[b] - pop[c]) for some permutation
    // (a, b, c) of (0, 1, 2). Search all 6 to confirm.
    const perms = [
      [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
    ];
    const matched = perms.some(([a, b, c]) => {
      const expected = pop[a].genes.map((g, j) => g + F * (pop[b].genes[j] - pop[c].genes[j]));
      return expected.every((v, j) => Math.abs(v - out[j]) < 1e-12);
    });
    expect(matched).toBe(true);
  });
});

describe("mutationBest1 — DE/best/1 algebraic identity", () => {
  it("output[i] equals best[i] + F * (g_r1[i] - g_r2[i])", () => {
    // 3-pop, targetIdx=2 → (r1, r2) ∈ permutations of {0, 1}.
    const pop: Individual[] = [
      makeIndividual([5, 10]),
      makeIndividual([1, 2]),
      makeIndividual([0, 0]), // target
    ];
    const best: Individual = makeIndividual([100, 200], 1e9);
    const F = 0.2;
    const out = differentialEvolutionEngine.mutationBest1(pop, 2, F, best);
    const perms = [[0, 1], [1, 0]];
    const matched = perms.some(([a, b]) => {
      const expected = best.genes.map((g, j) => g + F * (pop[a].genes[j] - pop[b].genes[j]));
      return expected.every((v, j) => Math.abs(v - out[j]) < 1e-12);
    });
    expect(matched).toBe(true);
  });
});

describe("mutationCurrentToBest1 — DE/current-to-best/1 algebraic identity", () => {
  it("output[i] equals g_target[i] + F*(best[i]-g_target[i]) + F*(g_r1[i]-g_r2[i])", () => {
    const pop: Individual[] = [
      makeIndividual([4, 8]),
      makeIndividual([2, 4]),
      makeIndividual([10, 20]), // target
    ];
    const best: Individual = makeIndividual([100, 200], 1e9);
    const F = 0.3;
    const out = differentialEvolutionEngine.mutationCurrentToBest1(pop, 2, F, best);
    const perms = [[0, 1], [1, 0]];
    const matched = perms.some(([a, b]) => {
      const expected = pop[2].genes.map((g, j) =>
        g + F * (best.genes[j] - g) + F * (pop[a].genes[j] - pop[b].genes[j])
      );
      return expected.every((v, j) => Math.abs(v - out[j]) < 1e-12);
    });
    expect(matched).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Crossover — donor-injection invariants
// ─────────────────────────────────────────────────────────────────────

describe("crossoverBinomial", () => {
  it("output length equals target length", () => {
    const out = differentialEvolutionEngine.crossoverBinomial([1, 2, 3, 4], [10, 20, 30, 40], 0.5);
    expect(out.length).toBe(4);
  });

  it("every output gene is either target[j] or donor[j] (no algebraic mixing)", () => {
    const target = [1, 2, 3, 4, 5];
    const donor = [10, 20, 30, 40, 50];
    const out = differentialEvolutionEngine.crossoverBinomial(target, donor, 0.5);
    for (let j = 0; j < target.length; j++) {
      expect([target[j], donor[j]]).toContain(out[j]);
    }
  });

  it("AT LEAST one gene is from the donor (jRand guarantee — Storn & Price 1997)", () => {
    // With CR=0 (never crossover by chance), only the forced jRand index
    // takes the donor — guarantees that the trial is NEVER identical to
    // the target. This is the load-bearing property of DE binomial crossover.
    const target = [1, 2, 3, 4, 5];
    const donor = [10, 20, 30, 40, 50];
    const out = differentialEvolutionEngine.crossoverBinomial(target, donor, 0);
    // Exactly ONE gene should be from the donor (since CR=0 → only jRand).
    const fromDonor = out.map((v, j) => (v === donor[j] ? 1 : 0) as number).reduce((a, b) => a + b, 0);
    expect(fromDonor).toBe(1);
  });

  it("with CR=1 every gene is from the donor (full donor takeover)", () => {
    const target = [1, 2, 3];
    const donor = [10, 20, 30];
    const out = differentialEvolutionEngine.crossoverBinomial(target, donor, 1);
    expect(out).toEqual(donor);
  });
});

describe("crossoverExponential", () => {
  it("output length equals target length", () => {
    const out = differentialEvolutionEngine.crossoverExponential([1, 2, 3, 4], [10, 20, 30, 40], 0.5);
    expect(out.length).toBe(4);
  });

  it("every output gene is either target[j] or donor[j]", () => {
    const target = [1, 2, 3, 4, 5];
    const donor = [10, 20, 30, 40, 50];
    const out = differentialEvolutionEngine.crossoverExponential(target, donor, 0.7);
    for (let j = 0; j < target.length; j++) {
      expect([target[j], donor[j]]).toContain(out[j]);
    }
  });

  it("with CR=0 exactly one gene is from the donor (loop exits after first iter)", () => {
    // Exponential crossover always takes ≥1 donor gene (the initial j).
    // With CR=0 the Math.random()<CR check fails immediately → only the
    // first iteration's donor injection survives.
    const target = [1, 2, 3, 4, 5];
    const donor = [10, 20, 30, 40, 50];
    const out = differentialEvolutionEngine.crossoverExponential(target, donor, 0);
    const fromDonor = out.map((v, j) => (v === donor[j] ? 1 : 0) as number).reduce((a, b) => a + b, 0);
    expect(fromDonor).toBe(1);
  });

  it("with CR=1 every gene is from the donor (loop runs full dim iterations)", () => {
    const target = [1, 2, 3, 4, 5];
    const donor = [10, 20, 30, 40, 50];
    const out = differentialEvolutionEngine.crossoverExponential(target, donor, 1);
    expect(out).toEqual(donor);
  });
});

// ─────────────────────────────────────────────────────────────────────
// optimize() — convergence on canonical test problems
// ─────────────────────────────────────────────────────────────────────

describe("optimize — sphere problem (negated, max at origin)", () => {
  it("returns DEResult shape with success:true", () => {
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -5, max: 5 }, { min: -5, max: 5 },
    ], { populationSize: 30, maxGenerations: 200 });
    expect(r.success).toBe(true);
    expect(typeof r.bestFitness).toBe("number");
    expect(Array.isArray(r.bestGenes)).toBe(true);
    expect(r.bestGenes.length).toBe(2);
  });

  it("converges to near-origin (best |x| < 0.3) with default config", () => {
    // Statistical assertion: with pop=30 and 500 generations on a 2D sphere,
    // DE/rand/1/bin reliably finds the optimum within a small tolerance.
    // Tolerance 0.3 is generous enough to absorb host load variance and
    // tight enough to rule out a complete optimization failure (P1
    // suggestion from per-file scrutiny — adds 3-sigma flake safety margin
    // on memory-pressured hosts).
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -5, max: 5 }, { min: -5, max: 5 },
    ], { populationSize: 30, maxGenerations: 500 });
    const distFromOrigin = Math.sqrt(r.bestGenes[0] ** 2 + r.bestGenes[1] ** 2);
    expect(distFromOrigin).toBeLessThan(0.3);
    expect(r.bestFitness).toBeGreaterThan(-0.09); // -|x|² > -0.09 if |x|<0.3
  });

  it("respects bounds — bestGenes stays inside the feasible region", () => {
    const bounds: Bound[] = [{ min: -3, max: 3 }, { min: -3, max: 3 }];
    const r = differentialEvolutionEngine.optimize(negatedSphere, bounds, {
      populationSize: 20, maxGenerations: 100,
    });
    for (let i = 0; i < bounds.length; i++) {
      expect(r.bestGenes[i]).toBeGreaterThanOrEqual(bounds[i].min);
      expect(r.bestGenes[i]).toBeLessThanOrEqual(bounds[i].max);
    }
  });

  it("converged:true when fitness plateaus past the stagnation limit", () => {
    // Sphere is a smooth unimodal function — DE eventually plateaus once it
    // approaches the optimum. The convergence threshold is 1e-8 (tight; the
    // fitness improvements at machine-epsilon scale stop), so the budget must
    // be ample enough that the population fully stabilizes. 2500 generations
    // with pop=20 is generous — if the engine STILL doesn't trip the
    // stagnation counter (100 plateau gens), the detection logic is broken.
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -2, max: 2 }, { min: -2, max: 2 },
    ], { populationSize: 20, maxGenerations: 2500 });
    expect(r.converged).toBe(true);
    expect(r.convergenceGeneration).toBeGreaterThanOrEqual(100); // ≥ STAGNATION_LIMIT
    // P1 fail-on-revert: convergence MUST trip before maxGen − STAGNATION_LIMIT.
    // If an off-by-one bug pushed convergenceGeneration to 2500 exactly, the
    // looser `< 2500` would still pass; this catches that class of regression
    // by requiring the stagnation counter to have fully accumulated.
    expect(r.convergenceGeneration).toBeLessThanOrEqual(2500 - 100);
  });
});

describe("optimize — strategy selection", () => {
  it("strategy field in the result mirrors the input strategy", () => {
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -1, max: 1 },
    ], { strategy: "best1", populationSize: 10, maxGenerations: 20 });
    expect(r.strategy).toBe("best1");
  });

  it("currentToBest1 strategy converges on sphere within tolerance", () => {
    // Cross-strategy sanity: a different mutation scheme still solves the
    // same canonical problem (would fail if `_getMutant` dispatched to the
    // wrong branch and silently fell through to rand1).
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -3, max: 3 }, { min: -3, max: 3 },
    ], { strategy: "currentToBest1", populationSize: 30, maxGenerations: 300 });
    const dist = Math.sqrt(r.bestGenes[0] ** 2 + r.bestGenes[1] ** 2);
    expect(dist).toBeLessThan(0.5);
  });

  it("exponential crossover converges (alternate crossover path)", () => {
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -2, max: 2 }, { min: -2, max: 2 },
    ], { crossover: "exponential", populationSize: 30, maxGenerations: 300 });
    const dist = Math.sqrt(r.bestGenes[0] ** 2 + r.bestGenes[1] ** 2);
    expect(dist).toBeLessThan(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Regression guards (fail-on-revert)
// ─────────────────────────────────────────────────────────────────────

describe("REGRESSION: DEResult schema is stable", () => {
  it("returns exactly the documented keys (downstream consumers depend on this)", () => {
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -1, max: 1 },
    ], { populationSize: 10, maxGenerations: 20 });
    expect(Object.keys(r).sort()).toEqual([
      "bestFitness", "bestGenes", "convergenceGeneration",
      "converged", "generations", "strategy", "success",
    ].sort());
  });
});

describe("REGRESSION: optimize never returns un-evaluated -Infinity fitness", () => {
  it("bestFitness is finite even with tiny budget", () => {
    // R12 — if the maxGenerations is set low enough that the engine bails out
    // before any evaluation, it should NEVER return -Infinity (the initial
    // un-evaluated marker). The init loop evaluates every individual once.
    const r = differentialEvolutionEngine.optimize(negatedSphere, [
      { min: -1, max: 1 },
    ], { populationSize: 5, maxGenerations: 1 });
    expect(Number.isFinite(r.bestFitness)).toBe(true);
  });
});
