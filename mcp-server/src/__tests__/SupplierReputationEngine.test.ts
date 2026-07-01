/**
 * SupplierReputationEngine.test.ts — real-value coverage. All expected numbers are computed by hand from
 * the Beta-Binomial posterior mean (successes + 0.7*5)/(trials + 5) and the Wilson 95% lower bound, so a
 * regression in the statistics fails loudly (not toBeDefined() stubs).
 */

import { describe, it, expect } from "vitest";
import { SupplierReputationEngine, type ReputationOutcome } from "../engines/SupplierReputationEngine.js";

// alpha: 3 jobs all on-time; 2 inspected, both Cpk 1.5 (≥1.33 → accepted)
// beta:  1 job on-time; 0 inspected
// gamma: 5 jobs, 2 on-time; 5 inspected, 1 accepted (Cpk 1.4), 4 below threshold (Cpk 1.0)
const CORPUS: ReputationOutcome[] = [
  { supplierId: "alpha-mfg", deliveredOnTime: true, qualityCpk: 1.5 },
  { supplierId: "alpha-mfg", deliveredOnTime: true, qualityCpk: 1.5 },
  { supplierId: "alpha-mfg", deliveredOnTime: true },
  { supplierId: "beta-shop", deliveredOnTime: true },
  { supplierId: "gamma-co", deliveredOnTime: true, qualityCpk: 1.4 },
  { supplierId: "gamma-co", deliveredOnTime: true, qualityCpk: 1.0 },
  { supplierId: "gamma-co", deliveredOnTime: false, qualityCpk: 1.0 },
  { supplierId: "gamma-co", deliveredOnTime: false, qualityCpk: 1.0 },
  { supplierId: "gamma-co", deliveredOnTime: false, qualityCpk: 1.0 },
];

describe("SupplierReputationEngine.reputationFor — Bayesian shrinkage", () => {
  it("does NOT award 1.0 to a lone perfect job (shrinks toward prior)", () => {
    const r = SupplierReputationEngine.reputationFor(CORPUS, "beta-shop");
    expect(r.jobsCompleted).toBe(1);
    expect(r.onTimeRate).toBe(1); // raw
    expect(r.shrunkOnTimeRate).toBeCloseTo(0.75, 6); // (1 + 3.5)/6
    expect(r.shrunkQualityRate).toBeCloseTo(0.7, 6); // (0 + 3.5)/5  — never inspected → prior
    expect(r.reputationScore).toBeCloseTo(0.725, 6); // 0.5*0.75 + 0.5*0.7
    expect(r.tier).toBe("trusted");
  });

  it("computes alpha (3/3 on-time, 2/2 quality) with shrinkage + correct tier", () => {
    const r = SupplierReputationEngine.reputationFor(CORPUS, "alpha-mfg");
    expect(r.jobsCompleted).toBe(3);
    expect(r.inspectedJobs).toBe(2);
    expect(r.qualityAcceptedCount).toBe(2);
    expect(r.shrunkOnTimeRate).toBeCloseTo(0.8125, 6); // (3 + 3.5)/8
    expect(r.shrunkQualityRate).toBeCloseTo(5.5 / 7, 6); // (2 + 3.5)/7
    expect(r.reputationScore).toBeCloseTo(0.5 * 0.8125 + 0.5 * (5.5 / 7), 6); // ≈ 0.79911
    expect(r.tier).toBe("trusted"); // 0.799 ∈ [0.7, 0.85)
  });

  it("counts only Cpk ≥ 1.33 as quality-accepted (gamma: 1 of 5)", () => {
    const r = SupplierReputationEngine.reputationFor(CORPUS, "gamma-co");
    expect(r.onTimeCount).toBe(2);
    expect(r.qualityAcceptedCount).toBe(1); // only the 1.4; the four 1.0s are below 1.33
    expect(r.shrunkOnTimeRate).toBeCloseTo(0.55, 6); // (2 + 3.5)/10
    expect(r.shrunkQualityRate).toBeCloseTo(0.45, 6); // (1 + 3.5)/10
    expect(r.reputationScore).toBeCloseTo(0.5, 6);
    expect(r.tier).toBe("developing"); // 0.5 ∈ [0.5, 0.7)
  });

  it("returns the prior for an unknown supplier (assumed industry-average, not zero)", () => {
    const r = SupplierReputationEngine.reputationFor(CORPUS, "never-seen-co");
    expect(r.jobsCompleted).toBe(0);
    expect(r.reputationScore).toBeCloseTo(0.7, 6); // pure prior mean
    expect(r.onTimeLowerCI95).toBe(0); // no evidence
    expect(r.tier).toBe("trusted");
  });
});

describe("SupplierReputationEngine — Wilson lower bound surfaces volume uncertainty", () => {
  it("a high-volume perfect record has a higher on-time lower bound than a low-volume one", () => {
    const lowVol = SupplierReputationEngine.reputationFor(
      [{ supplierId: "x", deliveredOnTime: true }],
      "x",
    );
    const hiVol = SupplierReputationEngine.reputationFor(
      Array.from({ length: 30 }, () => ({ supplierId: "x", deliveredOnTime: true })),
      "x",
    );
    expect(hiVol.onTimeLowerCI95).toBeGreaterThan(lowVol.onTimeLowerCI95);
    // Wilson(3,3) ≈ 0.4385 — exact check on alpha's 3/3
    expect(SupplierReputationEngine.reputationFor(CORPUS, "alpha-mfg").onTimeLowerCI95).toBeCloseTo(0.4385, 3);
  });

  it("a 20/20 + 20/20 supplier reaches the 'preferred' tier", () => {
    const outcomes: ReputationOutcome[] = Array.from({ length: 20 }, () => ({
      supplierId: "elite-mfg",
      deliveredOnTime: true,
      qualityCpk: 2.0,
    }));
    const r = SupplierReputationEngine.reputationFor(outcomes, "elite-mfg");
    expect(r.shrunkOnTimeRate).toBeCloseTo((20 + 3.5) / 25, 6); // 0.94
    expect(r.reputationScore).toBeCloseTo(0.94, 6);
    expect(r.tier).toBe("preferred"); // ≥ 0.85
  });
});

describe("SupplierReputationEngine.rankSuppliers", () => {
  it("ranks best-first by composite score", () => {
    const ranked = SupplierReputationEngine.rankSuppliers(CORPUS);
    expect(ranked.map((r) => r.supplierId)).toEqual(["alpha-mfg", "beta-shop", "gamma-co"]);
    expect(ranked[0].reputationScore).toBeGreaterThan(ranked[1].reputationScore);
    expect(ranked[1].reputationScore).toBeGreaterThan(ranked[2].reputationScore);
  });

  it("every rank entry's composite is in [0,1]", () => {
    for (const r of SupplierReputationEngine.rankSuppliers(CORPUS)) {
      expect(r.reputationScore).toBeGreaterThanOrEqual(0);
      expect(r.reputationScore).toBeLessThanOrEqual(1);
    }
  });
});

describe("SupplierReputationEngine — fail-loud", () => {
  it("throws (with index) on a malformed outcome", () => {
    expect(() =>
      SupplierReputationEngine.reputationFor(
        [{ supplierId: "", deliveredOnTime: true } as ReputationOutcome],
        "x",
      ),
    ).toThrow(/outcome\[0\] invalid.*supplierId/);
  });

  it("throws on a negative Cpk", () => {
    expect(() =>
      SupplierReputationEngine.reputationFor(
        [{ supplierId: "x", deliveredOnTime: true, qualityCpk: -1 } as ReputationOutcome],
        "x",
      ),
    ).toThrow(/qualityCpk must be >= 0/);
  });

  it("throws when supplierId is missing", () => {
    expect(() => SupplierReputationEngine.reputationFor(CORPUS, "")).toThrow(/supplierId is required/);
  });
});
