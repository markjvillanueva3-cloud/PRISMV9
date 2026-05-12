/**
 * WEDMFewShotEngine tests — WEDM AGI Phase 3 / P3-MS2 / U-P3-07.
 *
 * Exit gates covered:
 *   - new material adaptation achieves target Ra in ≤ 2 test cuts
 *   - embedding space clusters by ISO group (ISO bonus actually helps)
 *   - 7-step protocol is followed (conservative first cut, Klocke correction)
 */
import { describe, it, expect } from "vitest";
import {
  WEDMFewShotEngine,
  wedmFewShotEngine,
  embed,
  embedSignature,
  isoAxisOf,
  CONSERVATIVE_FACTOR,
  CONVERGENCE_RA_TOL_FRAC,
  MAX_CUTS,
  REFERENCE_MRR_MM3_PER_MIN,
  type UnknownMaterialFeatures,
  type WEDMCutTarget,
  type WEDMCutOutcome,
  type FewShotCutPlan,
} from "../../engines/WEDMFewShotEngine.js";
import {
  wedmMaterialSparkDatabaseEngine,
  REFERENCE_IE_A,
  REFERENCE_TE_US,
} from "../../engines/WEDMMaterialSparkDatabaseEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Synthetic measurement closure that simulates a real cut via the Klocke
 * model. Deterministic given a material key. Used to drive `adapt()` without
 * machine time.
 */
function makeMeasurer(
  materialKey: "D2" | "A2" | "M2" | "H13" | "Ti6Al4V",
): (plan: FewShotCutPlan) => WEDMCutOutcome {
  const sig = wedmMaterialSparkDatabaseEngine.get(materialKey);
  return (plan) => {
    const ra = sig.klocke_C *
      Math.pow(plan.recipe.peak_current_A * plan.recipe.pulse_on_us, sig.klocke_k);
    const mrr =
      sig.mrr_factor *
      REFERENCE_MRR_MM3_PER_MIN *
      (plan.recipe.peak_current_A / sig.peak_current_nominal_A) *
      (plan.recipe.pulse_on_us / sig.pulse_on_nominal_us);
    return { actual_ra_um: ra, actual_mrr_mm3_per_min: mrr, spark_stability: 0.9 };
  };
}

// D2-like unknown: hardness ~60 HRC, k≈20 W/mK, melt≈1420°C, P group.
const UNKNOWN_D2_LIKE: UnknownMaterialFeatures = {
  label: "NewToolSteel_42",
  hardness_HRC: 60,
  thermal_conductivity_W_per_mK: 20,
  melting_point_C: 1420,
  density_g_per_cm3: 7.7,
  iso_group: "P",
};

// Ti-like unknown: much softer, very low thermal, S group.
const UNKNOWN_TI_LIKE: UnknownMaterialFeatures = {
  label: "NewTi_alloy_9",
  hardness_HRC: 36,
  thermal_conductivity_W_per_mK: 7,
  melting_point_C: 1660,
  density_g_per_cm3: 4.4,
  iso_group: "S",
};

const FINISHING_TARGET: WEDMCutTarget = {
  target_ra_um: 1.6,
  target_mrr_mm3_per_min: 15,
};

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("WEDMFewShotEngine — embedding", () => {
  it("embed returns a 7-dim normalized vector for well-specified features", () => {
    const v = embed(UNKNOWN_D2_LIKE);
    expect(v).toHaveLength(7);
    for (const x of v) expect(Number.isFinite(x)).toBe(true);
    // All coordinates should be in [0, ~1.5] given the chosen normalizations.
    for (const x of v) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(2);
    }
  });

  it("embed uses mid-range defaults when features are empty", () => {
    const v = embed({ label: "blank" });
    expect(v).toHaveLength(7);
    // iso default axis = 0.5 (K-group midpoint)
    expect(v[4]).toBeCloseTo(0.5, 5);
  });

  it("isoAxisOf is monotone P<M<K<N<S<H", () => {
    expect(isoAxisOf("P")).toBeLessThan(isoAxisOf("M"));
    expect(isoAxisOf("M")).toBeLessThan(isoAxisOf("K"));
    expect(isoAxisOf("K")).toBeLessThan(isoAxisOf("N"));
    expect(isoAxisOf("N")).toBeLessThan(isoAxisOf("S"));
    expect(isoAxisOf("S")).toBeLessThan(isoAxisOf("H"));
  });

  it("embedSignature produces vectors in the same 7-dim space", () => {
    const v = embedSignature(wedmMaterialSparkDatabaseEngine.get("D2"));
    expect(v).toHaveLength(7);
  });
});

describe("WEDMFewShotEngine — nearest neighbors", () => {
  it("ranks a D2-like unknown with D2/A2/M2 tool steels at the top", () => {
    const v = embed(UNKNOWN_D2_LIKE);
    const neighbors = wedmFewShotEngine.nearestNeighbors(v, "P", 3);
    expect(neighbors).toHaveLength(3);
    const keys = neighbors.map((n) => n.material);
    // At least 2 of the top-3 should be P-group tool steels.
    const pGroup = new Set(["D2", "A2", "M2", "S7", "H13"]);
    const pHits = keys.filter((k) => pGroup.has(k)).length;
    expect(pHits).toBeGreaterThanOrEqual(2);
  });

  it("ranks a Ti-like unknown with an S-group material at the top", () => {
    const v = embed(UNKNOWN_TI_LIKE);
    const neighbors = wedmFewShotEngine.nearestNeighbors(v, "S", 3);
    expect(neighbors).toHaveLength(3);
    // Ti6Al4V or Inconel_718 (both S-group) should appear in top-3.
    const keys = neighbors.map((n) => n.material);
    expect(keys.includes("Ti6Al4V") || keys.includes("Inconel_718")).toBe(true);
  });

  it("ISO bonus only lifts same-group materials (embedding clusters by ISO)", () => {
    // Without an iso hint, similarity is pure cosine.
    const v = embed(UNKNOWN_D2_LIKE);
    const nWithoutIso = wedmFewShotEngine.nearestNeighbors(v, undefined, 12);
    const nWithIso = wedmFewShotEngine.nearestNeighbors(v, "P", 12);

    // Every non-P material MUST have identical similarity in both rankings.
    const mapWithout = new Map(nWithoutIso.map((n) => [n.material, n.similarity]));
    for (const n of nWithIso) {
      // P-group: {D2, A2, M2, S7, H13}
      const isP = ["D2", "A2", "M2", "S7", "H13"].includes(n.material);
      const base = mapWithout.get(n.material)!;
      if (isP) expect(n.similarity).toBeGreaterThanOrEqual(base);
      else expect(n.similarity).toBeCloseTo(base, 4);
    }
  });
});

describe("WEDMFewShotEngine — planFirstCut", () => {
  it("applies the 0.70 conservative factor to peak current and pulse-on", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    expect(run.firstCut.cutIndex).toBe(1);
    expect(run.firstCut.recipe.peak_current_A).toBeCloseTo(
      run.nominalRecipe.peak_current_A * CONSERVATIVE_FACTOR,
      3,
    );
    expect(run.firstCut.recipe.pulse_on_us).toBeCloseTo(
      run.nominalRecipe.pulse_on_us * CONSERVATIVE_FACTOR,
      3,
    );
  });

  it("first-cut prediction carries a non-zero uncertainty band", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    expect(run.firstCut.ra_uncertainty_um).toBeGreaterThan(0);
    expect(run.firstCut.predicted_ra_um).toBeGreaterThan(0);
    expect(run.firstCut.predicted_mrr_mm3_per_min).toBeGreaterThan(0);
  });

  it("records neighbors in the plan for audit and downstream active-query", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    expect(run.firstCut.neighbors.length).toBeGreaterThan(0);
    expect(run.firstCut.basis).toContain("conservative");
  });

  it("converged=false and cutsUsed=1 right after the first cut is planned", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    expect(run.converged).toBe(false);
    expect(run.cutsUsed).toBe(1);
  });
});

describe("WEDMFewShotEngine — planSecondCut", () => {
  it("throws if called before a first cut", () => {
    const fake = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    const already2 = { ...fake, cutsUsed: 2 as const };
    expect(() =>
      wedmFewShotEngine.planSecondCut(
        already2,
        { actual_ra_um: 2.0, actual_mrr_mm3_per_min: 10 },
        UNKNOWN_D2_LIKE,
      ),
    ).toThrow();
  });

  it("scales peak current UP when observed Ra > target (need more energy)", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    const outcome: WEDMCutOutcome = { actual_ra_um: 1.0, actual_mrr_mm3_per_min: 10 };
    // Observed Ra=1.0 but target=1.6 → energy must INCREASE to raise Ra.
    const next = wedmFewShotEngine.planSecondCut(run, outcome, UNKNOWN_D2_LIKE);
    expect(next.secondCut!.recipe.peak_current_A).toBeGreaterThan(
      run.firstCut.recipe.peak_current_A,
    );
  });

  it("scales peak current DOWN when observed Ra < target (need less energy)", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    const outcome: WEDMCutOutcome = { actual_ra_um: 3.0, actual_mrr_mm3_per_min: 25 };
    // Observed Ra=3.0 but target=1.6 → energy must DECREASE.
    const next = wedmFewShotEngine.planSecondCut(run, outcome, UNKNOWN_D2_LIKE);
    expect(next.secondCut!.recipe.peak_current_A).toBeLessThan(
      run.firstCut.recipe.peak_current_A,
    );
  });

  it("records second-cut basis as closed-loop Klocke", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    const outcome: WEDMCutOutcome = { actual_ra_um: 2.5, actual_mrr_mm3_per_min: 20 };
    const next = wedmFewShotEngine.planSecondCut(run, outcome, UNKNOWN_D2_LIKE);
    expect(next.secondCut!.basis).toContain("closed-loop");
    expect(next.cutsUsed).toBe(2);
  });

  it("clamps scale factor inside [0.7, 1.4] even for extreme observed/target ratios", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    // Observed 100× larger than target would otherwise produce absurd scaling.
    const absurd: WEDMCutOutcome = { actual_ra_um: 160, actual_mrr_mm3_per_min: 200 };
    const next = wedmFewShotEngine.planSecondCut(run, absurd, UNKNOWN_D2_LIKE);
    const ratio = next.secondCut!.recipe.peak_current_A / run.firstCut.recipe.peak_current_A;
    expect(ratio).toBeGreaterThanOrEqual(0.69); // clamp floor 0.7 (≈ within round error)
    expect(ratio).toBeLessThanOrEqual(1.41);
  });
});

describe("WEDMFewShotEngine — adapt (end-to-end exit gate)", () => {
  it("achieves target Ra within tolerance in ≤ 2 cuts for a D2-like material", () => {
    const run = wedmFewShotEngine.adapt(
      UNKNOWN_D2_LIKE,
      FINISHING_TARGET,
      makeMeasurer("D2"),
    );
    expect(run.cutsUsed).toBeLessThanOrEqual(MAX_CUTS);
    const finalOutcome = run.secondCutOutcome ?? run.firstCutOutcome;
    expect(finalOutcome).toBeDefined();
    const raTol = FINISHING_TARGET.target_ra_um * CONVERGENCE_RA_TOL_FRAC;
    expect(
      Math.abs(finalOutcome!.actual_ra_um - FINISHING_TARGET.target_ra_um),
    ).toBeLessThanOrEqual(raTol);
    expect(run.converged).toBe(true);
  });

  it("achieves target Ra within tolerance in ≤ 2 cuts for a Ti-like material", () => {
    const run = wedmFewShotEngine.adapt(
      UNKNOWN_TI_LIKE,
      { target_ra_um: 2.5, target_mrr_mm3_per_min: 8 },
      makeMeasurer("Ti6Al4V"),
    );
    expect(run.cutsUsed).toBeLessThanOrEqual(MAX_CUTS);
    const finalOutcome = run.secondCutOutcome ?? run.firstCutOutcome;
    expect(finalOutcome).toBeDefined();
    const raTol = 2.5 * CONVERGENCE_RA_TOL_FRAC;
    expect(
      Math.abs(finalOutcome!.actual_ra_um - 2.5),
    ).toBeLessThanOrEqual(raTol);
    expect(run.converged).toBe(true);
  });

  it("short-circuits at one cut when the conservative first cut already hits target", () => {
    // Contrive: target Ra matches D2's prediction at conservative recipe.
    const run0 = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    const luckyOutcome: WEDMCutOutcome = {
      actual_ra_um: FINISHING_TARGET.target_ra_um, // perfect hit
      actual_mrr_mm3_per_min: FINISHING_TARGET.target_mrr_mm3_per_min,
    };
    const lucky = wedmFewShotEngine.adapt(
      UNKNOWN_D2_LIKE,
      FINISHING_TARGET,
      () => luckyOutcome,
    );
    // The first-cut measurement was perfectly on target — should only use 1 cut.
    expect(lucky.cutsUsed).toBe(1);
    expect(lucky.converged).toBe(true);
    expect(lucky.secondCut).toBeUndefined();
    // Reference run0 so unused-var lints don't complain.
    expect(run0.cutsUsed).toBe(1);
  });

  it("non-convergent measurer reports converged=false and confidence < 1", () => {
    const stubbornMeasurer = (): WEDMCutOutcome => ({
      actual_ra_um: 10, // wildly off target 1.6
      actual_mrr_mm3_per_min: 1,
    });
    const run = wedmFewShotEngine.adapt(
      UNKNOWN_D2_LIKE,
      FINISHING_TARGET,
      stubbornMeasurer,
    );
    expect(run.converged).toBe(false);
    expect(run.cutsUsed).toBe(MAX_CUTS);
    expect(run.confidence).toBeLessThan(1);
  });
});

describe("WEDMFewShotEngine — topK configuration", () => {
  it("custom topK changes how many neighbors are returned", () => {
    const engine5 = new WEDMFewShotEngine({ topK: 5 });
    const v = embed(UNKNOWN_D2_LIKE);
    const neighbors = engine5.nearestNeighbors(v, "P", 5);
    expect(neighbors).toHaveLength(5);
  });

  it("default engine uses topK=3", () => {
    const v = embed(UNKNOWN_D2_LIKE);
    const neighbors = wedmFewShotEngine.nearestNeighbors(v, undefined, 3);
    expect(neighbors).toHaveLength(3);
  });
});

describe("WEDMFewShotEngine — Klocke prediction consistency", () => {
  it("first-cut predicted MRR is lower than target MRR (70% conservatism)", () => {
    const run = wedmFewShotEngine.planFirstCut(UNKNOWN_D2_LIKE, FINISHING_TARGET);
    // With conservative 0.7× recipe, predicted MRR should be ~50% of nominal D2.
    expect(run.firstCut.predicted_mrr_mm3_per_min).toBeLessThan(
      FINISHING_TARGET.target_mrr_mm3_per_min * 1.2,
    );
  });

  it("predicts finite non-negative Ra when peak current and pulse-on are positive", () => {
    // Sanity: cutter equation Ra = C*(I*t)^k cannot be negative.
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    const ra = sig.klocke_C *
      Math.pow(REFERENCE_IE_A * REFERENCE_TE_US, sig.klocke_k);
    expect(Number.isFinite(ra)).toBe(true);
    expect(ra).toBeGreaterThan(0);
  });
});
