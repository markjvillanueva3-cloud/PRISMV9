/**
 * Tests for generateJobCascade — the JM print->program cascade composition core.
 *   npx vitest run src/__tests__/WEDMJobCascade.test.ts
 *
 * R9 intent: this layer is what makes generated programs RESPOND to the print.
 * The P0-1 defect was constant feeds across all thicknesses; these tests prove
 * the cascade now scales with thickness (thicker => slower), stays internally
 * consistent (ipm & mm/min scaled by one factor), preserves the cascade-correctness
 * invariants (strictly-decreasing offsets / taper => H=0), and is a no-op when no
 * thickness is given (equals the raw oracle family). Asserted against the LIVE
 * oracle + thickness curve, not stubs.
 */
import { describe, it, expect } from "vitest";
import { generateJobCascade } from "../data/wedm-job-cascade.js";
import { selectECodeFamily } from "../data/jm-die-wedm-tech-tables.js";
import { thicknessFeedFactor } from "../data/wedm-thickness-feed-scale.js";

describe("generateJobCascade — family selection", () => {
  it("selects the standard 4-pass family for thin straight D2", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 25 });
    expect(c).not.toBeNull();
    expect(c!.family_id).toBe("E12xx_standard_4pass");
    expect(c!.num_passes).toBe(4);
    expect(c!.axes).toBe(2);
  });

  it("escalates to the heavy 5-pass family for thick stock (>50 mm)", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 80 });
    expect(c!.family_id).toBe("E12xx_heavy_5pass");
    expect(c!.num_passes).toBe(5);
  });

  it("pins the 50mm family-switch boundary (50 => standard, 51 => heavy)", () => {
    // locks selectECodeFamily's `thickness_mm > 50` cutoff so a boundary regression fails.
    expect(generateJobCascade({ material: "D2", thickness_mm: 50 })!.family_id).toBe("E12xx_standard_4pass");
    expect(generateJobCascade({ material: "D2", thickness_mm: 51 })!.family_id).toBe("E12xx_heavy_5pass");
  });

  it("selects the taper family for an angled cut", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 30, taper_angle_deg: 2 });
    expect(c!.axes).toBe(4);
    expect(c!.family_id).toBe("E28xx_taper_5pass");
  });

  it("returns null when no shop-calibrated family matches the material", () => {
    expect(generateJobCascade({ material: "titanium-6al4v", thickness_mm: 20 })).toBeNull();
  });
});

describe("generateJobCascade — thickness-aware feeds (P0-1 wired)", () => {
  it("THICKER stock yields SLOWER feeds within the same family", () => {
    // 25 vs 45 mm both stay in the standard 4-pass family (<50 mm boundary).
    const thin = generateJobCascade({ material: "D2", thickness_mm: 25 })!;
    const thick = generateJobCascade({ material: "D2", thickness_mm: 45 })!;
    expect(thin.family_id).toBe(thick.family_id); // same family, fair comparison
    expect(thick.thickness_factor).toBeLessThan(thin.thickness_factor);
    expect(thick.passes[0].feed_ipm!).toBeLessThan(thin.passes[0].feed_ipm!);
    expect(thick.passes[0].feed_mm_min!).toBeLessThan(thin.passes[0].feed_mm_min!);
  });

  it("feed is NOT constant across thickness (the P0-1 defect is fixed)", () => {
    const factors = [12, 25, 45].map((t) => generateJobCascade({ material: "D2", thickness_mm: t })!.thickness_factor);
    expect(new Set(factors).size).toBeGreaterThan(1);
  });

  it("scales each pass by the SAME dimensionless factor as thicknessFeedFactor", () => {
    const t = 40;
    const fam = selectECodeFamily({ material: "D2", thickness_mm: t })!;
    const rough = fam.passes[0].feed_mm_min;
    const factor = thicknessFeedFactor(rough, t);
    const c = generateJobCascade({ material: "D2", thickness_mm: t })!;
    for (const p of c.passes) {
      const raw = fam.passes.find((q) => q.pass_number === p.pass_number)!;
      expect(p.feed_ipm!).toBeCloseTo(raw.feed_ipm! * factor, 2);
      expect(p.feed_mm_min!).toBeCloseTo(raw.feed_mm_min! * factor, 1);
    }
  });

  it("keeps ipm and mm/min internally consistent after scaling (~25.4 ratio preserved)", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 40 })!;
    for (const p of c.passes) {
      expect(p.feed_mm_min! / p.feed_ipm!).toBeCloseTo(25.4, 0); // ratio within ~0.5
    }
  });

  it("no thickness => factor 1.0 and feeds equal the raw oracle family", () => {
    const c = generateJobCascade({ material: "D2" })!;
    expect(c.thickness_factor).toBe(1.0);
    expect(c.thickness_mm).toBeNull();
    expect(c.passes[0].feed_ipm).toBe(0.12); // unscaled E1221 rough feed
    expect(c.passes[0].e_code).toBe("E1221");
  });

  it("flags extrapolation outside the FA-Advance calibrated band (5..100 mm)", () => {
    expect(generateJobCascade({ material: "D2", thickness_mm: 40 })!.thickness_extrapolated).toBe(false);
    // 150 mm needs heavy family AND is above the calibrated band.
    expect(generateJobCascade({ material: "D2", thickness_mm: 150 })!.thickness_extrapolated).toBe(true);
  });

  it("degrades safely to factor 1.0 on unusable thickness (0 / negative / NaN)", () => {
    for (const bad of [0, -5, Number.NaN]) {
      const c = generateJobCascade({ material: "D2", thickness_mm: bad })!;
      expect(c.thickness_factor).toBe(1.0);
      expect(c.thickness_mm).toBeNull();
      expect(c.caveats).toEqual([]); // no scaling happened => no caveat
    }
  });
});

describe("generateJobCascade — fail-loud caveats (R12)", () => {
  it("a thickness-scaled multi-pass cascade carries the skim-approximation caveat", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 40 })!;
    expect(c.thickness_factor).not.toBe(1.0); // scaling did happen
    expect(c.caveats.some((s) => /skim feeds scaled/i.test(s))).toBe(true);
  });

  it("no caveat when no thickness given (cascade equals the raw oracle — nothing to disclose)", () => {
    const c = generateJobCascade({ material: "D2" })!;
    expect(c.caveats).toEqual([]);
    expect(c.thickness_factor_clamped).toBe(false);
  });

  it("an extrapolated thickness adds the shop-validate caveat", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 150 })!;
    expect(c.caveats.some((s) => /calibrated band/i.test(s))).toBe(true);
  });

  it("clamp engagement is flagged when the raw curve ratio is extreme", () => {
    // 150 mm rough curve extrapolates very low vs the heavy family rough feed (1.52),
    // exercising the lower clamp; if engaged, thickness_factor_clamped must be true + caveated.
    const c = generateJobCascade({ material: "D2", thickness_mm: 150 })!;
    if (c.thickness_factor_clamped) {
      expect(c.caveats.some((s) => /clamp/i.test(s))).toBe(true);
    }
    // either way the factor is within the documented band
    expect(c.thickness_factor).toBeGreaterThanOrEqual(0.1);
    expect(c.thickness_factor).toBeLessThanOrEqual(3.0);
  });
});

describe("generateJobCascade — hardness composition (P0-2)", () => {
  it("hardness at/below the 55-HRC anchor leaves feeds unchanged (factor 1.0)", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 25, hardness_hrc: 50 })!;
    expect(c.hardness_factor).toBe(1.0);
    expect(c.hardness_hrc).toBe(50);
    // applied factor equals thickness factor alone when hardness is a no-op.
    expect(c.applied_feed_factor).toBeCloseTo(c.thickness_factor, 4);
  });

  it("hardness above 55 HRC slows feeds beyond thickness alone (composes multiplicatively)", () => {
    const soft = generateJobCascade({ material: "D2", thickness_mm: 25, hardness_hrc: 50 })!;
    const hard = generateJobCascade({ material: "D2", thickness_mm: 25, hardness_hrc: 64 })!;
    expect(hard.hardness_factor).toBeLessThan(1);
    expect(hard.applied_feed_factor).toBeLessThan(soft.applied_feed_factor);
    expect(hard.passes[0].feed_ipm!).toBeLessThan(soft.passes[0].feed_ipm!);
    // applied = thickness × hardness (3 dp: applied rounds the raw product, the two
    // fields are each independently 4dp-rounded, so 4dp agreement is unattainable)
    expect(hard.applied_feed_factor).toBeCloseTo(hard.thickness_factor * hard.hardness_factor, 3);
  });

  it("no hardness given => hardness_factor 1.0, hardness_hrc null, no hardness caveat", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 25 })!;
    expect(c.hardness_factor).toBe(1.0);
    expect(c.hardness_hrc).toBeNull();
    expect(c.caveats.some((s) => /HRC/.test(s))).toBe(false);
  });

  it("hardened job carries the unvalidated-hardness caveat", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 25, hardness_hrc: 62 })!;
    expect(c.caveats.some((s) => /de-rated for 62 HRC/i.test(s))).toBe(true);
  });

  it("flags hardness extrapolation above the tool-steel band (>65 HRC)", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 25, hardness_hrc: 70 })!;
    expect(c.hardness_extrapolated).toBe(true);
    expect(c.caveats.some((s) => /calibrated tool-steel band/i.test(s))).toBe(true);
  });
});

describe("generateJobCascade — cascade-correctness invariants preserved", () => {
  it("2-axis offsets strictly decrease rough->skim (AP003)", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 30 })!;
    for (let i = 1; i < c.passes.length; i++) {
      expect(c.passes[i].offset_inches).toBeLessThan(c.passes[i - 1].offset_inches);
    }
  });

  it("4-axis taper => every H-offset is 0 (UV coords carry the taper)", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 30, taper_angle_deg: 2 })!;
    for (const p of c.passes) expect(p.offset_inches).toBe(0);
  });

  it("operator-set (null) oracle feeds stay null after scaling", () => {
    // E28 taper pass 5 ships feed_ipm:null — must not become a number.
    const c = generateJobCascade({ material: "D2", thickness_mm: 30, taper_angle_deg: 2 })!;
    const p5 = c.passes.find((p) => p.pass_number === 5)!;
    expect(p5.feed_ipm).toBeNull();
    expect(p5.feed_mm_min).toBeNull();
  });

  it("E-codes match the oracle family per pass", () => {
    const c = generateJobCascade({ material: "D2", thickness_mm: 25 })!;
    expect(c.passes.map((p) => p.e_code)).toEqual(["E1221", "E1222", "E1223", "E1224"]);
  });
});
