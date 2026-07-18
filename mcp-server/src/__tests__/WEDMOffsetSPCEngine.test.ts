/**
 * Tests for WEDMOffsetSPCEngine — Wire EDM offset SPC (muS-D54..D55 / ARC-MS10).
 *
 * Reference values are hand-computed from the X-bar/R definitions
 * (Montgomery 7e, ch.6) so each test fails if the business logic changes.
 */

import { describe, it, expect } from "vitest";
import { wedmOffsetSPCEngine, WEDMOffsetSPCInputSchema } from "../engines/WEDMOffsetSPCEngine.js";

/** Build k subgroups of size 3 = [base-1, base, base+1] for a given base series. */
function subgroupsFromMeans(means: number[]): number[][] {
  return means.map((m) => [m - 1, m, m + 1]);
}

describe("WEDMOffsetSPCEngine — in-control process", () => {
  it("flags a stable, low-spread process as in_control / ok", () => {
    // 8 subgroups all centred on 50.0, within-subgroup spread ±1.
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: subgroupsFromMeans([50, 50, 50, 50, 50, 50, 50, 50]),
    });
    expect(r.verdict).toBe("in_control");
    expect(r.severity).toBe("ok");
    expect(r.drift.direction).toBe("stable");
    expect(r.westernElectric.runRulesClean).toBe(true);
    expect(r.chart.inControl).toBe(true);
    // No assignable cause should be the top-ranked hypothesis.
    expect(r.rootCauses[0].cause).toMatch(/no assignable cause/i);
  });

  it("computes the X-bar centerline as the exact grand mean (delegation check)", () => {
    // Means 10, 12, 11 → grand mean 33/3 = 11.
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: subgroupsFromMeans([10, 12, 11]),
    });
    expect(r.chart.xBar.centerline).toBeCloseTo(11, 6);
    expect(r.chart.range.centerline).toBeCloseTo(2, 6); // each subgroup range = 2
  });
});

describe("WEDMOffsetSPCEngine — drift detection", () => {
  it("detects a subtle rising drift the chart alone misses (t-statistic)", () => {
    // 20 subgroups, mean rises 50.0 → 51.9 in 0.1 µm steps. Within-subgroup
    // spread ±1 keeps the X-bar control band wide enough that no point
    // breaches it, yet the slope is highly significant.
    const means = Array.from({ length: 20 }, (_, i) => 50 + 0.1 * i);
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans(means) });
    expect(r.chart.inControl).toBe(true); // chart-only would say "fine"
    expect(r.drift.direction).toBe("rising");
    // t = slope·√Sxx / sigmaXbar = 0.1·√665 / 0.682 ≈ 3.78. The tight band
    // pins the t-statistic formula — a revert to a raw window-shift compare
    // would yield a wholly different magnitude and break this.
    expect(r.drift.significanceT).toBeGreaterThan(3.4);
    expect(r.drift.significanceT).toBeLessThan(4.2);
    expect(r.drift.slopeUmPerSubgroup).toBeCloseTo(0.1, 6);
    expect(r.verdict).toBe("drifting");
    expect(r.severity).toBe("watch");
  });

  it("does NOT false-positive a sub-threshold slope at a longer window (raw-shift regression guard)", () => {
    // 12 subgroups rising ~0.087 µm/subgroup. Total window shift ≈ 0.96 µm
    // exceeds one X-bar sigma (≈ 0.68 µm) — the OLD raw-shift test
    // (totalShift > sigmaXbar) would wrongly flag "rising". The t-statistic
    // (t ≈ 1.5 < 2) correctly reports the slope as not yet significant.
    const means = Array.from({ length: 12 }, (_, i) => 50 + 0.0868 * i);
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans(means) });
    expect(Math.abs(r.drift.totalShiftUm)).toBeGreaterThan(0.68); // raw-shift WOULD flag
    expect(r.drift.significanceT).toBeLessThan(2);
    expect(r.drift.direction).toBe("stable");
  });

  it("flags 'drifting' via a Western Electric run rule even when chart + slope are clean", () => {
    // 10 subgroups centred on 50 with two adjacent excursions to 52 at the
    // window midpoint. Both excursions sit beyond +2σ but inside +3σ → WE
    // rule 5 (2 of 3 beyond 2σ) fires. The bump is symmetric so the slope is 0.
    const means = [50, 50, 50, 50, 52, 52, 50, 50, 50, 50];
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans(means) });
    expect(r.chart.inControl).toBe(true); // no point breaches 3σ
    expect(r.drift.direction).toBe("stable"); // symmetric bump → zero slope
    expect(r.westernElectric.runRulesClean).toBe(false);
    expect(r.westernElectric.rulesFired.length).toBeGreaterThan(0);
    expect(r.westernElectric.violations.length).toBeGreaterThan(0);
    // verdict is "drifting" reached purely through the run-rule path.
    expect(r.verdict).toBe("drifting");
  });

  it("detects a falling drift", () => {
    const means = Array.from({ length: 20 }, (_, i) => 60 - 0.1 * i);
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans(means) });
    expect(r.drift.direction).toBe("falling");
    expect(r.drift.slopeUmPerSubgroup).toBeLessThan(0);
  });

  it("is window-length independent — a tiny noise-level slope stays stable", () => {
    // Alternating ±0.001 around 50: near-zero net slope, large window.
    const means = Array.from({ length: 30 }, (_, i) => 50 + (i % 2 === 0 ? 0.001 : -0.001));
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans(means) });
    expect(r.drift.direction).toBe("stable");
  });
});

describe("WEDMOffsetSPCEngine — out-of-control & erratic", () => {
  it("flags a single wild subgroup mean as out_of_control / act", () => {
    // 9 subgroups at mean 10, one at mean 50; within-subgroup range = 2.
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: subgroupsFromMeans([10, 10, 10, 10, 10, 10, 10, 10, 10, 50]),
    });
    expect(r.chart.inControl).toBe(false);
    expect(r.verdict).toBe("out_of_control");
    expect(r.severity).toBe("act");
  });

  it("flags an erratic R chart and refuses static compensation", () => {
    // One subgroup with a huge within-subgroup spread.
    const subgroups = [
      [10, 11], [10, 11], [10, 11], [10, 11], [10, 11],
      [10, 200], [10, 11], [10, 11], [10, 11], [10, 11],
    ];
    const r = wedmOffsetSPCEngine.analyze({ subgroups, nominalOffsetUm: 12 });
    expect(r.drift.direction).toBe("erratic");
    expect(r.compensation).not.toBeNull();
    expect(r.compensation!.recommendedOffsetAdjustmentUm).toBe(0);
    expect(r.compensation!.rationale).toMatch(/stabilise/i);
    expect(r.rootCauses[0].cause).toMatch(/flushing|dielectric/i);
  });
});

describe("WEDMOffsetSPCEngine — capability", () => {
  it("computes Cp/Cpk when spec limits are supplied", () => {
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: [
        [9.9, 10.1], [9.9, 10.1], [9.9, 10.1], [9.9, 10.1], [9.9, 10.1],
        [9.9, 10.1], [9.9, 10.1], [9.9, 10.1], [9.9, 10.1], [9.9, 10.1],
      ],
      specLimitsUm: { lower: 9, upper: 11 },
    });
    expect(r.capability).not.toBeNull();
    expect(r.capability!.sigmaUm).toBeGreaterThan(0);
    // Centred process → Cp ≈ Cpk; both finite and positive.
    expect(Number.isFinite(r.capability!.cp)).toBe(true);
    expect(r.capability!.cpk).toBeCloseTo(r.capability!.cp, 6);
    expect(r.capability!.cp).toBeGreaterThan(1);
  });

  it("returns null capability when spec limits are absent", () => {
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans([50, 50, 50]) });
    expect(r.capability).toBeNull();
  });
});

describe("WEDMOffsetSPCEngine — compensation", () => {
  it("recommends a re-centring adjustment = nominal − mean for a stable off-target process", () => {
    // Stable process centred on 10, nominal target 14 → adjust by +4.
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: subgroupsFromMeans([10, 10, 10, 10, 10, 10, 10, 10]),
      nominalOffsetUm: 14,
    });
    expect(r.compensation).not.toBeNull();
    expect(r.compensation!.recommendedOffsetAdjustmentUm).toBeCloseTo(4, 2);
  });

  it("recommends no adjustment when the mean is within one X-bar sigma of nominal", () => {
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: subgroupsFromMeans([10, 10, 10, 10, 10, 10]),
      nominalOffsetUm: 10.3, // deviation 0.3 µm < sigmaXbar (range 2 → A2·Rbar/3 ≈ 0.68)
    });
    expect(r.compensation).not.toBeNull();
    expect(r.compensation!.recommendedOffsetAdjustmentUm).toBe(0);
    expect(r.compensation!.rationale).toMatch(/no re-centring/i);
  });

  it("returns null compensation when no nominal is supplied", () => {
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans([10, 10, 10]) });
    expect(r.compensation).toBeNull();
  });
});

describe("WEDMOffsetSPCEngine — invariants & edge cases", () => {
  it("always returns at least one root cause, ranked by descending confidence", () => {
    const r = wedmOffsetSPCEngine.analyze({ subgroups: subgroupsFromMeans([10, 10, 10]) });
    expect(r.rootCauses.length).toBeGreaterThan(0);
    for (let i = 1; i < r.rootCauses.length; i++) {
      expect(r.rootCauses[i - 1].confidence).toBeGreaterThanOrEqual(r.rootCauses[i].confidence);
    }
  });

  it("throws on ragged (unequal-size) subgroups", () => {
    expect(() =>
      wedmOffsetSPCEngine.analyze({ subgroups: [[1, 2, 3], [1, 2]] }),
    ).toThrow(/equal size/i);
  });

  it("throws when subgroup size exceeds the Shewhart factor table (n > 10)", () => {
    const big = Array.from({ length: 11 }, (_, i) => i + 1);
    expect(() =>
      wedmOffsetSPCEngine.analyze({ subgroups: [big, [...big]] }),
    ).toThrow(/subgroup size must be 2\.\.10/i);
  });

  it("rejects malformed input via the Zod schema", () => {
    expect(() => wedmOffsetSPCEngine.analyze(null)).toThrow();
    expect(() => wedmOffsetSPCEngine.analyze({})).toThrow();
    expect(() => wedmOffsetSPCEngine.analyze({ subgroups: "nope" })).toThrow();
    // Only one subgroup — X-bar/R needs at least two.
    expect(() => wedmOffsetSPCEngine.analyze({ subgroups: [[1, 2]] })).toThrow();
    // Subgroup of size 1 — too small for a range estimate.
    expect(() => wedmOffsetSPCEngine.analyze({ subgroups: [[1], [2]] })).toThrow();
  });

  it("handles a zero within-subgroup-range process without crashing and warns", () => {
    const r = wedmOffsetSPCEngine.analyze({
      subgroups: [[5, 5, 5], [5, 5, 5], [5, 5, 5]],
    });
    expect(r.warnings.some((w) => /collapsed/i.test(w))).toBe(true);
    expect(r.drift.direction).toBe("stable");
    expect(Number.isFinite(r.drift.significanceT)).toBe(true);
  });

  it("rejects non-finite measurements (NaN / Infinity) at the schema boundary", () => {
    expect(() =>
      wedmOffsetSPCEngine.analyze({ subgroups: [[1, Number.NaN], [1, 2]] }),
    ).toThrow();
    expect(() =>
      wedmOffsetSPCEngine.analyze({ subgroups: [[1, Number.POSITIVE_INFINITY], [1, 2]] }),
    ).toThrow();
  });
});

describe("WEDMOffsetSPCInputSchema", () => {
  it("parses a well-formed input", () => {
    const parsed = WEDMOffsetSPCInputSchema.parse({
      subgroups: [[1, 2], [3, 4]],
      nominalOffsetUm: 2.5,
      specLimitsUm: { lower: 0, upper: 5 },
      context: { wireDiameterMm: 0.25, passNumber: 2, dielectric: "deionised" },
    });
    expect(parsed.subgroups).toHaveLength(2);
    expect(parsed.nominalOffsetUm).toBe(2.5);
  });

  it("rejects a non-positive nominal offset", () => {
    expect(() =>
      WEDMOffsetSPCInputSchema.parse({ subgroups: [[1, 2], [3, 4]], nominalOffsetUm: -1 }),
    ).toThrow();
  });
});
