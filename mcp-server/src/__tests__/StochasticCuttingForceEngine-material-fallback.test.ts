/**
 * StochasticCuttingForceEngine — material-match fail-loud regression suite.
 *
 * Locks the P2 silent-fallback fix: an unrecognized material used to borrow
 * AISI 4140 scatter and still report ~0.95 confidence with NO warning, so a
 * downstream safety gate could trust a non-material-specific force distribution.
 *
 * The fix surfaces the miss — `material_matched:false` + a warning + confidence
 * collapsed to 0.5 — mirroring the LatheSpeedFeedCalculatorFacade fix pattern
 * (do NOT add a second ad-hoc default). Physics is unchanged; the fallback base
 * is still AISI 4140, proven here by seeded-RNG numerical equality.
 *
 * References: Kienzle & Victor (1957) Fc = kc1.1·ap·fz^(1-mc); Albrecht (1960)
 * edge-radius size effect; Merchant/Shaw rake correction.
 */
import { describe, it, expect } from "vitest";

import { stochasticCuttingForceEngine } from "../engines/StochasticCuttingForceEngine.js";

// Shared geometry so matched/unmatched runs differ ONLY by the material name.
const geom = {
  depth_mm: 2,
  feed_mm: 0.1,
  tool_diameter_mm: 10, // width defaults to diameter → ae_ratio = 1.0
  flute_count: 4,
  n_trials: 500,
  method: "both" as const,
};

describe("StochasticCuttingForceEngine — material-match fail-loud (P2 fix)", () => {
  describe("unmatched material", () => {
    const r = stochasticCuttingForceEngine.compute({ ...geom, material: "Unobtainium-9000" });

    it("flags material_matched = false", () => {
      expect(r.value.material_matched).toBe(false);
    });

    it("emits a warning naming the material and the AISI 4140 fallback", () => {
      expect(r.value.warnings.length).toBeGreaterThan(0);
      expect(r.value.warnings[0]).toContain("Unobtainium-9000");
      expect(r.value.warnings[0]).toContain("AISI 4140");
    });

    it("collapses confidence to 0.5 (not the 0.95 MC default)", () => {
      // Was the defect: 0.95 confidence on an unmatched material.
      expect(r.confidence).toBe(0.5);
    });

    it("still returns a finite positive force distribution (fallback is usable)", () => {
      expect(r.value.mean_force_n).toBeGreaterThan(0);
      expect(r.value.std_dev_n).toBeGreaterThan(0);
    });

    it("empty-string material is also treated as unmatched (adversarial)", () => {
      const blank = stochasticCuttingForceEngine.compute({ ...geom, material: "" });
      expect(blank.value.material_matched).toBe(false);
      expect(blank.value.warnings.length).toBeGreaterThan(0);
      expect(blank.confidence).toBe(0.5);
    });

    it("overrides do NOT suppress the unmatched flag (name still unrecognized)", () => {
      const withOverride = stochasticCuttingForceEngine.compute({
        ...geom,
        material: "Mystery-Steel",
        overrides: { kc1_1_mean: 2000 },
      });
      expect(withOverride.value.material_matched).toBe(false);
      expect(withOverride.value.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("matched material", () => {
    it("in-DB material → matched true, no warnings, full MC confidence 0.95", () => {
      const r = stochasticCuttingForceEngine.compute({ ...geom, material: "Ti-6Al-4V" });
      expect(r.value.material_matched).toBe(true);
      expect(r.value.warnings).toEqual([]);
      expect(r.confidence).toBe(0.95);
    });

    it("match is case-insensitive → still matched, still no warnings", () => {
      const r = stochasticCuttingForceEngine.compute({ ...geom, material: "ti-6al-4v" });
      expect(r.value.material_matched).toBe(true);
      expect(r.value.warnings).toEqual([]);
      expect(r.confidence).toBe(0.95);
    });

    it("fosm-only matched material keeps 0.90 confidence (not collapsed)", () => {
      const r = stochasticCuttingForceEngine.compute({
        ...geom,
        material: "AISI 4140",
        method: "fosm",
      });
      expect(r.value.material_matched).toBe(true);
      expect(r.confidence).toBe(0.9);
    });
  });

  describe("fallback ≡ AISI 4140 (reference-value invariant)", () => {
    // The engine seeds its RNG (mulberry32(42)), so identical scatter inputs give
    // an identical deterministic force distribution. This proves the unmatched
    // fallback genuinely reuses AISI 4140 scatter — and that the ONLY thing the fix
    // changes is the flag + confidence, not the physics.
    const unknown = stochasticCuttingForceEngine.compute({ ...geom, material: "Nonexistent-Alloy" });
    const baseline = stochasticCuttingForceEngine.compute({ ...geom, material: "AISI 4140" });

    it("unmatched force distribution equals the explicit AISI 4140 distribution", () => {
      expect(unknown.value.mean_force_n).toBe(baseline.value.mean_force_n);
      expect(unknown.value.std_dev_n).toBe(baseline.value.std_dev_n);
    });

    it("but the fix diverges the flag + confidence", () => {
      expect(unknown.value.material_matched).toBe(false);
      expect(baseline.value.material_matched).toBe(true);
      expect(unknown.confidence).toBe(0.5);
      expect(baseline.confidence).toBe(0.95);
      // Fail-loud invariant: a fallback must never out-confidence a real match.
      expect(unknown.confidence).toBeLessThan(baseline.confidence);
    });

    it("FOSM nominal force matches hand-derived Kienzle value (~869.36 N)", () => {
      // Fc = kc1.1·ap·fz^(1-mc)·√ae · rake · edge · runout
      //    = 1820·2·0.1^0.74·1 · (1-0.01·0) · (1+25/(1000·0.1)) · (1+0.005/0.1)
      //    = 662.371 · 1.0 · 1.25 · 1.05 ≈ 869.36 N
      // AISI 4140: kc1.1 = 1820 N/mm², mc = 0.26 (matches MATERIAL_DB fallback).
      expect(unknown.value.fosm).not.toBeNull();
      expect(unknown.value.fosm!.mean).toBeCloseTo(869.36, 0);
      // Fallback truly uses 4140 → its FOSM nominal matches the explicit 4140 run.
      expect(unknown.value.fosm!.mean).toBe(baseline.value.fosm!.mean);
    });
  });
});
