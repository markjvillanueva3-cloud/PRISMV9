/**
 * MarketplaceFinalRankEngine.test.ts — real-value coverage. Default weights match/rep/log/cap =
 * 0.40/0.25/0.20/0.15. Expected finals are hand-computed.
 */

import { describe, it, expect } from "vitest";
import { MarketplaceFinalRankEngine, type SignalEntry } from "../engines/MarketplaceFinalRankEngine.js";

// A: 0.4*0.9 + 0.25*0.8 + 0.2*1.0 + 0.15*0.7 = 0.36+0.20+0.20+0.105 = 0.865
// B: 0.4*1.0 + 0.25*0.3 + 0.2*0.3 + 0.15*0.5 = 0.40+0.075+0.06+0.075 = 0.610 (perfect match, weak rest)
// C: 0.4*0.5 + 0.25*0.9 + 0.2*0.9 + 0.15*0.9 = 0.20+0.225+0.18+0.135 = 0.740
const ENTRIES: SignalEntry[] = [
  { supplierId: "b-perfect-match", matchScore: 1.0, reputationScore: 0.3, logisticsScore: 0.3, capacityScore: 0.5 },
  { supplierId: "a-balanced", matchScore: 0.9, reputationScore: 0.8, logisticsScore: 1.0, capacityScore: 0.7 },
  { supplierId: "c-strong-diff", matchScore: 0.5, reputationScore: 0.9, logisticsScore: 0.9, capacityScore: 0.9 },
];

describe("MarketplaceFinalRankEngine.rank", () => {
  it("blends the 4 signals into the right final scores", () => {
    const { ranked } = MarketplaceFinalRankEngine.rank({ entries: ENTRIES });
    const byId = Object.fromEntries(ranked.map((r) => [r.supplierId, r]));
    expect(byId["a-balanced"].finalScore).toBeCloseTo(0.865, 4);
    expect(byId["b-perfect-match"].finalScore).toBeCloseTo(0.61, 4);
    expect(byId["c-strong-diff"].finalScore).toBeCloseTo(0.74, 4);
  });

  it("THE MOAT: a perfect-MATCH shop ranks LAST behind shops with better differentiators", () => {
    const { ranked } = MarketplaceFinalRankEngine.rank({ entries: ENTRIES });
    expect(ranked.map((r) => r.supplierId)).toEqual(["a-balanced", "c-strong-diff", "b-perfect-match"]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[2].supplierId).toBe("b-perfect-match"); // matchScore 1.0 but last overall
  });

  it("components sum to finalScore (explainable breakdown)", () => {
    const { ranked } = MarketplaceFinalRankEngine.rank({ entries: ENTRIES });
    for (const r of ranked) {
      const sum = r.components.match + r.components.reputation + r.components.logistics + r.components.capacity;
      expect(sum).toBeCloseTo(r.finalScore, 4);
      expect(r.finalScore).toBeGreaterThanOrEqual(0);
      expect(r.finalScore).toBeLessThanOrEqual(1);
    }
  });

  it("honors a custom weight override (match-only → ranks by matchScore)", () => {
    const { ranked } = MarketplaceFinalRankEngine.rank({
      entries: ENTRIES,
      weights: { match: 1, reputation: 0, logistics: 0, capacity: 0 },
    });
    expect(ranked[0].supplierId).toBe("b-perfect-match"); // matchScore 1.0 wins under match-only weights
  });
});

describe("MarketplaceFinalRankEngine — fail-loud", () => {
  it("throws when weights do not sum to 1.0", () => {
    expect(() =>
      MarketplaceFinalRankEngine.rank({ entries: ENTRIES, weights: { match: 0.5, reputation: 0.5, logistics: 0.5, capacity: 0.5 } }),
    ).toThrow(/must sum to 1\.0/);
  });
  it("throws on an out-of-range signal (>1)", () => {
    expect(() =>
      MarketplaceFinalRankEngine.rank({ entries: [{ supplierId: "x", matchScore: 1.5, reputationScore: 0.5, logisticsScore: 0.5, capacityScore: 0.5 }] }),
    ).toThrow(/matchScore must be <= 1/);
  });
  it("throws on a missing supplierId", () => {
    expect(() =>
      MarketplaceFinalRankEngine.rank({ entries: [{ supplierId: "", matchScore: 0.5, reputationScore: 0.5, logisticsScore: 0.5, capacityScore: 0.5 }] }),
    ).toThrow(/supplierId is required/);
  });
});
