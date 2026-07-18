import { describe, it, expect } from "vitest";
import {
  reconditioningQualityEngine,
  RECONDITION_FALLBACK_MULTIPLIER,
  type ReconditioningInput,
} from "../engines/ReconditioningQualityEngine.js";

/**
 * UNIT-0010 ReconditioningQualityEngine -- reference-value coverage.
 * Model: life_multiplier = substrate_cycle * coating * edge_prep * geometry, each a named
 * industry-typical factor. Reference identity for a pristine first-regrind carbide endmill
 * (uncoated / sharp / in-spec): 0.90 * 1.0 * 1.0 * 1.0 = 0.90.
 */
const base: ReconditioningInput = {
  tool_type: "endmill",
  substrate: "carbide",
  was_coated: false,
  recoated: false,
  regrind_cycle: 1,
  edge_prep_grade: "sharp",
  geometry_within_spec: true,
};

describe("ReconditioningQualityEngine.assess -- reference values", () => {
  it("pristine first-regrind carbide endmill: life 0.90, quality 1.0, recondition", () => {
    const r = reconditioningQualityEngine.assess(base);
    expect(r.life_multiplier).toBeCloseTo(0.9, 4);
    expect(r.quality_score).toBeCloseTo(1.0, 4);
    expect(r.recommendation).toBe("recondition");
    expect(r.beyond_regrind_limit).toBe(false);
    expect(r.max_regrinds).toBe(5);
    // uncertainty = RSS(0.05, 0.08) = 0.0943, and it is CARRIED (refuse-list)
    expect(r.life_multiplier_uncertainty).toBeCloseTo(0.0943, 3);
  });

  it("coated-but-not-recoated drops life via the 0.65 coating factor (still recondition-worthy)", () => {
    const r = reconditioningQualityEngine.assess({ ...base, was_coated: true, recoated: false });
    expect(r.factor_attribution.coating).toBeCloseTo(0.65, 4);
    expect(r.life_multiplier).toBeCloseTo(0.585, 4); // 0.90*0.65
    expect(r.recommendation).toBe("recondition");
    expect(r.warnings.some((w) => /not recoated/i.test(w))).toBe(true);
  });

  it("recoated after regrind nearly restores life (0.95 coating factor)", () => {
    const r = reconditioningQualityEngine.assess({ ...base, was_coated: true, recoated: true });
    expect(r.factor_attribution.coating).toBeCloseTo(0.95, 4);
    expect(r.life_multiplier).toBeCloseTo(0.855, 4); // 0.90*0.95
  });

  it("chipped edge halves the edge factor -> below replace threshold -> replace", () => {
    const r = reconditioningQualityEngine.assess({ ...base, edge_prep_grade: "chipped" });
    expect(r.factor_attribution.edge_prep).toBeCloseTo(0.5, 4);
    expect(r.life_multiplier).toBeCloseTo(0.45, 4); // 0.90*0.5 < 0.5
    expect(r.recommendation).toBe("replace");
  });

  it("geometry out of spec applies the 0.7 factor", () => {
    const r = reconditioningQualityEngine.assess({ ...base, geometry_within_spec: false });
    expect(r.factor_attribution.geometry).toBeCloseTo(0.7, 4);
    expect(r.life_multiplier).toBeCloseTo(0.63, 4); // 0.90*0.7
    expect(r.warnings.some((w) => /not restored to spec/i.test(w))).toBe(true);
  });

  it("cumulative decrement: 3rd-cycle carbide loses 0.06 (0.90 -> 0.84)", () => {
    const r = reconditioningQualityEngine.assess({ ...base, regrind_cycle: 3 });
    expect(r.factor_attribution.substrate_cycle).toBeCloseTo(0.84, 4);
    expect(r.life_multiplier).toBeCloseTo(0.84, 4);
    // uncertainty widens with cycle: RSS(0.05, 0.08 + 0.02*2 = 0.12) = 0.13
    expect(r.life_multiplier_uncertainty).toBeCloseTo(0.13, 3);
  });

  it("HSS retains less than carbide at the same conditions (0.85 vs 0.90)", () => {
    const hss = reconditioningQualityEngine.assess({ ...base, substrate: "hss" });
    const carbide = reconditioningQualityEngine.assess(base);
    expect(hss.life_multiplier).toBeCloseTo(0.85, 4);
    expect(hss.life_multiplier).toBeLessThan(carbide.life_multiplier);
  });
});

describe("ReconditioningQualityEngine.assess -- regrind-limit + edge cases (never throws)", () => {
  it("beyond the regrind ceiling -> retire, life 0, flagged", () => {
    const r = reconditioningQualityEngine.assess({ ...base, regrind_cycle: 6 }); // carbide endmill max 5
    expect(r.beyond_regrind_limit).toBe(true);
    expect(r.life_multiplier).toBe(0);
    expect(r.quality_score).toBe(0);
    expect(r.recommendation).toBe("retire");
    expect(r.warnings.some((w) => /exceeds/i.test(w))).toBe(true);
  });

  it("indexable insert is not reground -> retire (max_regrinds 0)", () => {
    const r = reconditioningQualityEngine.assess({ ...base, tool_type: "insert" });
    expect(r.max_regrinds).toBe(0);
    expect(r.recommendation).toBe("retire");
    expect(r.warnings.some((w) => /not reground/i.test(w))).toBe(true);
  });

  it("invalid regrind_cycle clamps to 1 with a warning (never throws)", () => {
    const r = reconditioningQualityEngine.assess({ ...base, regrind_cycle: 0 });
    expect(r.factor_attribution.substrate_cycle).toBeCloseTo(0.9, 4);
    expect(r.warnings.some((w) => /clamped to 1/i.test(w))).toBe(true);
  });

  it("unknown substrate defaults to carbide with a warning (never throws)", () => {
    const r = reconditioningQualityEngine.assess({ ...base, substrate: "unobtanium" as never });
    expect(r.warnings.some((w) => /assumed carbide/i.test(w))).toBe(true);
    expect(r.life_multiplier).toBeCloseTo(0.9, 4);
  });

  it("garbage input still returns a finite, bounded result (never throws)", () => {
    const r = reconditioningQualityEngine.assess({
      tool_type: "junk" as never, substrate: "junk" as never, was_coated: true, recoated: false,
      regrind_cycle: NaN, edge_prep_grade: "junk" as never, geometry_within_spec: false,
    });
    expect(Number.isFinite(r.life_multiplier)).toBe(true);
    expect(r.life_multiplier).toBeGreaterThanOrEqual(0);
    expect(r.life_multiplier).toBeLessThanOrEqual(1);
  });
});

describe("ReconditioningQualityEngine.lifeMultiplierOrFallback (replaces the hardcoded 0.7 derate)", () => {
  it("returns the legacy fallback when descriptors are absent", () => {
    expect(reconditioningQualityEngine.lifeMultiplierOrFallback(null)).toBe(RECONDITION_FALLBACK_MULTIPLIER);
    expect(reconditioningQualityEngine.lifeMultiplierOrFallback({})).toBe(0.7);
    expect(reconditioningQualityEngine.lifeMultiplierOrFallback({ tool_type: "endmill" })).toBe(0.7);
  });

  it("returns the MODELED multiplier when tool_type + substrate are known (better than a flat 0.7)", () => {
    const m = reconditioningQualityEngine.lifeMultiplierOrFallback({ tool_type: "endmill", substrate: "carbide" });
    // Unspecified edge_prep defaults to "unknown" (0.85, conservative): 0.90*0.85 = 0.765.
    expect(m).toBeCloseTo(0.765, 4);
    expect(m).not.toBe(RECONDITION_FALLBACK_MULTIPLIER);
  });
});
