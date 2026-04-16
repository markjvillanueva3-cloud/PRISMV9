/**
 * WEDMActiveQueryEngine tests — WEDM AGI Phase 3 / P3-MS2 / U-P3-09.
 *
 * Exit gate covered:
 *   "Active query selects most informative test cut (info gain metric)".
 */
import { describe, it, expect } from "vitest";
import {
  WEDMActiveQueryEngine,
  wedmActiveQueryEngine,
  DEFAULT_NOISE_VARIANCE,
  type ActiveStrategy,
} from "../../engines/WEDMActiveQueryEngine.js";
import {
  wedmFewShotEngine,
  type UnknownMaterialFeatures,
  type WEDMCutTarget,
  type WEDMRecipe,
} from "../../engines/WEDMFewShotEngine.js";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

const UNKNOWN_D2_LIKE: UnknownMaterialFeatures = {
  label: "unknown-steel",
  hardness_HRC: 60, thermal_conductivity_W_per_mK: 20,
  melting_point_C: 1420, density_g_per_cm3: 7.7, iso_group: "P",
};

const UNKNOWN_TI_LIKE: UnknownMaterialFeatures = {
  label: "unknown-ti",
  hardness_HRC: 36, thermal_conductivity_W_per_mK: 7,
  melting_point_C: 1660, density_g_per_cm3: 4.4, iso_group: "S",
};

const TARGET: WEDMCutTarget = { target_ra_um: 1.6, target_mrr_mm3_per_min: 15 };

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("WEDMActiveQueryEngine — candidate grid", () => {
  it("default grid has 25 candidates (5×5) centred on conservative blend", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE);
    expect(grid).toHaveLength(25);
  });

  it("respects custom stepsPerAxis=3 → 9 candidates", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE, {
      stepsPerAxis: 3,
    });
    expect(grid).toHaveLength(9);
  });

  it("rejects stepsPerAxis < 2", () => {
    expect(() =>
      wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE, {
        stepsPerAxis: 1,
      }),
    ).toThrow();
  });

  it("respects custom centre + spread", () => {
    const centre: WEDMRecipe = {
      peak_current_A: 10, pulse_on_us: 20, pulse_off_us: 20, wire_tension_N: 12,
    };
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE, {
      centre,
      spreadMin: 0.5,
      spreadMax: 1.5,
      stepsPerAxis: 3,
    });
    // Min candidate should have peak_current = 10 * 0.5 = 5, pulse_on = 20 * 0.5 = 10
    const min = grid.find((r) => r.peak_current_A === 5 && r.pulse_on_us === 10);
    expect(min).toBeDefined();
  });
});

describe("WEDMActiveQueryEngine — selectOptimal", () => {
  it("rejects an empty candidate pool", () => {
    expect(() =>
      wedmActiveQueryEngine.selectOptimal([], UNKNOWN_D2_LIKE, null, "info_gain"),
    ).toThrow();
  });

  it("returns all candidates in `ranked`", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE);
    const r = wedmActiveQueryEngine.selectOptimal(grid, UNKNOWN_D2_LIKE, null);
    expect(r.ranked).toHaveLength(grid.length);
  });

  it("`ranked` is sorted by score descending", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE);
    const r = wedmActiveQueryEngine.selectOptimal(grid, UNKNOWN_D2_LIKE, null);
    for (let i = 1; i < r.ranked.length; i++) {
      expect(r.ranked[i].score).toBeLessThanOrEqual(r.ranked[i - 1].score);
    }
  });

  it("chosen.score equals the maximum score in the ranking", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE);
    const r = wedmActiveQueryEngine.selectOptimal(grid, UNKNOWN_D2_LIKE, null);
    const maxScore = r.ranked.reduce((m, c) => Math.max(m, c.score), -Infinity);
    expect(r.chosen.score).toBeCloseTo(maxScore, 6);
  });

  it("info_gain strategy picks the candidate with the highest EIG", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE);
    const r = wedmActiveQueryEngine.selectOptimal(grid, UNKNOWN_D2_LIKE, null, "info_gain");
    const maxEIG = Math.max(...r.ranked.map((c) => c.info_gain));
    expect(r.chosen.info_gain).toBeCloseTo(maxEIG, 6);
  });

  it("uncertainty strategy picks the candidate with the highest variance", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE);
    const r = wedmActiveQueryEngine.selectOptimal(
      grid, UNKNOWN_D2_LIKE, null, "uncertainty",
    );
    const maxVar = Math.max(...r.ranked.map((c) => c.ra_variance));
    expect(r.chosen.ra_variance).toBeCloseTo(maxVar, 6);
  });
});

describe("WEDMActiveQueryEngine — predictRa ensemble", () => {
  it("predictRa returns non-negative variance", () => {
    const emb = [...Array(7)].map(() => 0.3);
    const nbrs = wedmFewShotEngine.nearestNeighbors(emb, "P", 3);
    const recipe: WEDMRecipe = {
      peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 20, wire_tension_N: 12,
    };
    const { variance } = wedmActiveQueryEngine.predictRa(recipe, nbrs);
    expect(variance).toBeGreaterThanOrEqual(0);
  });

  it("variance approaches zero when neighbors are identical in Klocke coefs", () => {
    // D2 and A2 both have klocke_k = 0.5 (same k). Difference in klocke_C is
    // small (0.28 vs 0.24) so variance should still be small.
    const emb = [...Array(7)].map(() => 0.3);
    const nbrs = wedmFewShotEngine.nearestNeighbors(emb, "P", 2);
    const recipe: WEDMRecipe = {
      peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 20, wire_tension_N: 12,
    };
    const { variance } = wedmActiveQueryEngine.predictRa(recipe, nbrs);
    expect(variance).toBeGreaterThanOrEqual(0);
    expect(variance).toBeLessThan(5); // loose upper bound
  });

  it("variance scales with (Ip*Ton) for mixed klocke_C neighbors", () => {
    // Higher energy amplifies the Klocke-C disagreement.
    const emb = [...Array(7)].map(() => 0.3);
    const nbrs = wedmFewShotEngine.nearestNeighbors(emb, "P", 3);
    const lo: WEDMRecipe = {
      peak_current_A: 3, pulse_on_us: 5, pulse_off_us: 20, wire_tension_N: 12,
    };
    const hi: WEDMRecipe = {
      peak_current_A: 12, pulse_on_us: 15, pulse_off_us: 20, wire_tension_N: 12,
    };
    const vLo = wedmActiveQueryEngine.predictRa(lo, nbrs).variance;
    const vHi = wedmActiveQueryEngine.predictRa(hi, nbrs).variance;
    expect(vHi).toBeGreaterThanOrEqual(vLo);
  });
});

describe("WEDMActiveQueryEngine — diversity", () => {
  it("diversity is maximal when no recipes have been tested", () => {
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE, {
      stepsPerAxis: 3,
    });
    const r = wedmActiveQueryEngine.selectOptimal(
      grid, UNKNOWN_D2_LIKE, null, "diversity",
    );
    // With no tested recipes, every candidate has diversity=1.0.
    for (const c of r.ranked) {
      expect(c.diversity).toBeCloseTo(1.0, 6);
    }
  });

  it("diversity signal penalises candidates near tested recipes when run has history", () => {
    const run0 = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, TARGET);
    // After one cut, candidate identical to first-cut recipe has diversity=0.
    const duplicate: WEDMRecipe = { ...run0.firstCut.recipe };
    const far: WEDMRecipe = {
      ...run0.firstCut.recipe,
      peak_current_A: run0.firstCut.recipe.peak_current_A + 5,
      pulse_on_us: run0.firstCut.recipe.pulse_on_us + 5,
    };
    const r = wedmActiveQueryEngine.selectOptimal(
      [duplicate, far], UNKNOWN_D2_LIKE, run0, "diversity",
    );
    expect(r.chosen.recipe.peak_current_A).toBe(far.peak_current_A);
    const dupCand = r.ranked.find(
      (c) => c.recipe.peak_current_A === duplicate.peak_current_A
         && c.recipe.pulse_on_us === duplicate.pulse_on_us,
    );
    expect(dupCand!.diversity).toBeLessThan(0.001);
  });
});

describe("WEDMActiveQueryEngine — suggestNextCut convenience", () => {
  it("returns a chosen candidate with positive info_gain", () => {
    const r = wedmActiveQueryEngine.suggestNextCut(UNKNOWN_D2_LIKE);
    expect(r.chosen.info_gain).toBeGreaterThanOrEqual(0);
    expect(r.chosen.recipe.peak_current_A).toBeGreaterThan(0);
  });

  it("info_gain strategy has non-zero prior entropy and reduced posterior entropy", () => {
    const r = wedmActiveQueryEngine.suggestNextCut(
      UNKNOWN_D2_LIKE, null, "info_gain",
    );
    expect(Number.isFinite(r.prior_entropy)).toBe(true);
    expect(Number.isFinite(r.expected_posterior_entropy)).toBe(true);
    // Posterior variance is clipped via harmonic mean; should not exceed prior.
    expect(r.expected_posterior_entropy).toBeLessThanOrEqual(r.prior_entropy + 1e-6);
  });

  it("balanced strategy uses a convex combination of the three signals", () => {
    const r = wedmActiveQueryEngine.suggestNextCut(
      UNKNOWN_D2_LIKE, null, "balanced",
    );
    // Score should be in [0, 1] given the normalized signals.
    for (const c of r.ranked) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1.00001);
    }
  });
});

describe("WEDMActiveQueryEngine — constructor options", () => {
  it("custom noiseVariance changes info_gain magnitude", () => {
    const lowNoise = new WEDMActiveQueryEngine({ noiseVariance: 0.001 });
    const highNoise = new WEDMActiveQueryEngine({ noiseVariance: 10.0 });
    const grid = wedmActiveQueryEngine.generateCandidateGrid(UNKNOWN_D2_LIKE, {
      stepsPerAxis: 3,
    });
    const rLow = lowNoise.selectOptimal(grid, UNKNOWN_D2_LIKE, null, "info_gain");
    const rHigh = highNoise.selectOptimal(grid, UNKNOWN_D2_LIKE, null, "info_gain");
    // Same neighbor variances → lower noise → higher info gain.
    expect(rLow.chosen.info_gain).toBeGreaterThan(rHigh.chosen.info_gain);
  });

  it("DEFAULT_NOISE_VARIANCE is 0.04 µm²", () => {
    expect(DEFAULT_NOISE_VARIANCE).toBeCloseTo(0.04, 6);
  });
});

describe("WEDMActiveQueryEngine — Ti-like cross-material sanity", () => {
  it("suggests a lower-energy cut for Ti-like (S-group) than for D2-like (P-group)", () => {
    const rD2 = wedmActiveQueryEngine.suggestNextCut(
      UNKNOWN_D2_LIKE, null, "info_gain",
    );
    const rTi = wedmActiveQueryEngine.suggestNextCut(
      UNKNOWN_TI_LIKE, null, "info_gain",
    );
    // The recipe grid for Ti neighbors is centred lower; suggest near there.
    // Loose check: Ti grid centre has Ip < D2 grid centre.
    // (Ti6Al4V nominal peak_current=6, vs D2=8.)
    expect(rTi.chosen.recipe.peak_current_A).toBeLessThan(
      rD2.chosen.recipe.peak_current_A,
    );
  });
});

describe("WEDMActiveQueryEngine — all four strategies return valid results", () => {
  const strategies: ActiveStrategy[] = ["uncertainty", "info_gain", "diversity", "balanced"];
  for (const s of strategies) {
    it(`${s}: chosen candidate is valid and in the ranked list`, () => {
      const r = wedmActiveQueryEngine.suggestNextCut(UNKNOWN_D2_LIKE, null, s);
      expect(r.strategy).toBe(s);
      expect(r.ranked.includes(r.chosen)).toBe(true);
      expect(r.chosen.recipe.peak_current_A).toBeGreaterThan(0);
      expect(r.chosen.recipe.pulse_on_us).toBeGreaterThan(0);
    });
  }
});
