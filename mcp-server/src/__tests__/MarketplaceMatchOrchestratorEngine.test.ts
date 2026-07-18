/**
 * MarketplaceMatchOrchestratorEngine.test.ts — real-value tests for the end-to-end RFQ → ranked-shortlist
 * pipeline of the PRISM networking marketplace (galaxy:business, slot:hotel). The orchestrator composes the
 * Phase-0 capability matcher (RFQMatchScoring TOPSIS) with the three Phase-2 differentiator signals
 * (reputation / logistics / capacity), blended by the capstone (MarketplaceFinalRank).
 *
 * Every reference value is HAND-COMPUTED from the landed policy constants:
 *  - blend weights              match 0.40 · reputation 0.25 · logistics 0.20 · capacity 0.15  (marketplace-rank-weights.ts)
 *  - reputation Beta-Binomial   shrunk = (successes + 0.7·5) / (trials + 5)                     (supplier-reputation-weights.ts)
 *  - freight-zone logistics     local 1.0 · domestic 0.7 · international 0.3                     (geo-logistics-rates.ts)
 *  - capacity                   capacityScore = totalAvailable / totalCapacity                  (capacity-projection-policy.ts: 80h/wk)
 *  - capstone rounding          each weighted component + the final score are round-4           (MarketplaceFinalRankEngine)
 *
 * THE MOAT: a perfect-capability shop (matchScore 1.0) that is UNPROVEN, OVERSEAS, and BACKLOGGED is
 * correctly ranked BELOW a worse-fit shop (matchScore 0.0) that is TRUSTED, LOCAL, and OPEN — the
 * blended order INVERTS the bare capability order. That inversion is what the price-only competitors can't
 * produce, and it is asserted end-to-end from RFQ + corpus inputs (not from pre-baked signal values).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MarketplaceMatchOrchestratorEngine,
  type RankRfqInput,
} from "../engines/MarketplaceMatchOrchestratorEngine.js";
import {
  SupplierCapabilityProfileEngine,
  type RegisterSupplierInput,
} from "../engines/SupplierCapabilityProfileEngine.js";
import { RFQMatchScoringEngine } from "../engines/RFQMatchScoringEngine.js";
import { type ReputationOutcome } from "../engines/SupplierReputationEngine.js";
import { MARKETPLACE_ORCH_SCHEMA_VERSION } from "../data/marketplace-orchestrator-policy.js";

// ---- fixtures -------------------------------------------------------------
// Two mill/P shops that differ ONLY in tolerance (capability) and region (logistics). With no
// preferredRegion the geographyScore ties (0.5), certs tie (ISO9001, no required certs), both mill-primary
// — so the Phase-0 capability ranking is driven SOLELY by tolerance: FIT (tighter) dominates → matchScore
// 1.0; WEAK (looser) → matchScore 0.0 (the hand-computed 2-alternative TOPSIS extremes).

const millMachine = {
  machineId: "M1",
  process: "mill" as const,
  axes: 3,
  envelopeMm: { x: 600, y: 600, z: 600 },
  maxRpm: 12000,
  controller: "haas" as const,
};

/** Perfect capability fit (tight tol), but will be made overseas + backlogged + unproven. */
const shopFit: RegisterSupplierInput = {
  supplierId: "SHOP-FIT",
  name: "Apex Fit Machining",
  geography: { region: "Northeast", state: "CT" },
  processes: ["mill"],
  machines: [millMachine],
  materialGroups: ["P"],
  bestToleranceMm: 0.005,
  certifications: ["ISO9001"],
};

/** Worse capability fit (looser tol), but will be made local + open + trusted. */
const shopWeak: RegisterSupplierInput = {
  supplierId: "SHOP-WEAK",
  name: "Midwest Reliable Mill",
  geography: { region: "Midwest", state: "OH" },
  processes: ["mill"],
  machines: [millMachine],
  materialGroups: ["P"],
  bestToleranceMm: 0.015,
  certifications: ["ISO9001"],
};

/** The RFQ both shops are capable of (tol 0.02 leaves headroom for both). */
const RFQ = {
  rfqId: "RFQ-MOAT",
  process: "mill" as const,
  materialGroup: "P" as const,
  toleranceMm: 0.02,
  partEnvelopeMm: { x: 100, y: 100, z: 100 },
  quantity: 10,
  requiredCerts: [] as string[],
};

/** N identical outcome tuples for one supplier. */
function outcomes(supplierId: string, n: number, onTime: boolean, cpk: number): ReputationOutcome[] {
  return Array.from({ length: n }, () => ({ supplierId, deliveredOnTime: onTime, qualityCpk: cpk }));
}

beforeEach(() => {
  SupplierCapabilityProfileEngine.__resetForTests();
  RFQMatchScoringEngine.__resetForTests();
});

// ===========================================================================
// THE MOAT — blended order INVERTS the bare capability order
// ===========================================================================

describe("rankRfq — THE MOAT (differentiators invert the capability order)", () => {
  // Build the full hostile-vs-friendly scenario once.
  function moatInput(weights?: RankRfqInput["weights"]): RankRfqInput {
    return {
      rfq: RFQ,
      buyerRegion: "Midwest", // WEAK is in-region (domestic 0.7); FIT is cross-region (international 0.3)
      capacity: {
        asOfISO: "2026-01-01",
        horizonWeeks: 1, // one 80h week of capacity
        // FIT fully booked (80h committed in the only week → 0 free); WEAK absent ⇒ no committed work → fully open
        committedBySupplier: { "SHOP-FIT": [{ hoursRequired: 80, dueDateISO: "2026-01-02" }] },
      },
      outcomes: [
        ...outcomes("SHOP-FIT", 10, false, 1.0), // 0/10 on-time, 0/10 Cpk-accepted (1.0 < 1.33) → reputation 0.2333
        ...outcomes("SHOP-WEAK", 20, true, 1.5), // 20/20 on-time, 20/20 Cpk-accepted → reputation 0.94
      ],
      ...(weights !== undefined ? { weights } : {}),
    };
  }

  it("ranks the perfect-MATCH-but-unproven-overseas-backlogged shop LAST under default weights", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    const res = MarketplaceMatchOrchestratorEngine.rankRfq(moatInput());

    // Phase-0 capability order: FIT (tighter tol) is rank 1, matchScore 1.0; WEAK is rank 2, matchScore 0.0.
    expect(res.capabilityShortlist.map((s) => s.supplierId)).toEqual(["SHOP-FIT", "SHOP-WEAK"]);
    expect(res.capabilityShortlist[0].score).toBeCloseTo(1.0, 4);
    expect(res.capabilityShortlist[1].score).toBeCloseTo(0.0, 4);

    // Blended order INVERTS it: WEAK (trusted+local+open) beats FIT (unproven+overseas+booked).
    expect(res.ranked.map((r) => r.supplierId)).toEqual(["SHOP-WEAK", "SHOP-FIT"]);
    expect(res.ranked[0].rank).toBe(1);
    expect(res.ranked[1].rank).toBe(2);

    // Hand-computed finals (round-4):
    //   WEAK = .4*0.0 + .25*0.94 + .2*0.7 + .15*1.0 = 0 + .235 + .14 + .15 = 0.525
    //   FIT  = .4*1.0 + .25*0.2333 + .2*0.3 + .15*0.0 = .4 + .0583 + .06 + 0 = 0.5183
    expect(res.ranked[0].finalScore).toBeCloseTo(0.525, 4);
    expect(res.ranked[1].finalScore).toBeCloseTo(0.5183, 4);
  });

  it("surfaces the explainable signal provenance + raw values for each survivor", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    const res = MarketplaceMatchOrchestratorEngine.rankRfq(moatInput());
    const weak = res.ranked.find((r) => r.supplierId === "SHOP-WEAK")!.signals;
    const fit = res.ranked.find((r) => r.supplierId === "SHOP-FIT")!.signals;

    // WEAK: matchScore 0.0; reputation 0.94 from 20 jobs (evidence); domestic logistics 0.7; open capacity 1.0.
    expect(weak.matchScore).toBeCloseTo(0.0, 4);
    expect(weak.reputationScore).toBeCloseTo(0.94, 6);
    expect(weak.reputationJobs).toBe(20);
    expect(weak.reputationProvenance).toBe("evidence");
    expect(weak.logisticsScore).toBeCloseTo(0.7, 6);
    expect(weak.logisticsZone).toBe("domestic");
    expect(weak.logisticsProvenance).toBe("evidence");
    expect(weak.capacityScore).toBeCloseTo(1.0, 6); // absent from committedBySupplier ⇒ no committed work
    expect(weak.capacityProvenance).toBe("evidence"); // capacity block supplied ⇒ this IS evidence, not neutral

    // FIT: matchScore 1.0; reputation 3.5/15 = 0.2333 from 10 jobs (evidence); international 0.3; booked 0.0.
    expect(fit.matchScore).toBeCloseTo(1.0, 4);
    expect(fit.reputationScore).toBeCloseTo(3.5 / 15, 6);
    expect(fit.reputationJobs).toBe(10);
    expect(fit.logisticsScore).toBeCloseTo(0.3, 6);
    expect(fit.logisticsZone).toBe("international");
    expect(fit.capacityScore).toBeCloseTo(0.0, 6);
    expect(fit.capacityProvenance).toBe("evidence");
  });

  it("each ranked entry's components sum to its finalScore (explainable breakdown)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    const res = MarketplaceMatchOrchestratorEngine.rankRfq(moatInput());
    for (const r of res.ranked) {
      const sum = r.components.match + r.components.reputation + r.components.logistics + r.components.capacity;
      expect(sum).toBeCloseTo(r.finalScore, 4);
      expect(r.finalScore).toBeGreaterThanOrEqual(0);
      expect(r.finalScore).toBeLessThanOrEqual(1);
    }
  });

  it("a match-only weight override RESTORES the capability order (capability dominates the blend)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    const res = MarketplaceMatchOrchestratorEngine.rankRfq(
      moatInput({ match: 1, reputation: 0, logistics: 0, capacity: 0 }),
    );
    // match-only ⇒ FIT (matchScore 1.0) back to rank 1, WEAK (0.0) last — even with WEAK's stellar signals.
    expect(res.ranked.map((r) => r.supplierId)).toEqual(["SHOP-FIT", "SHOP-WEAK"]);
    expect(res.ranked[0].finalScore).toBeCloseTo(1.0, 4);
    expect(res.ranked[1].finalScore).toBeCloseTo(0.0, 4);
    expect(res.weights).toEqual({ match: 1, reputation: 0, logistics: 0, capacity: 0 });
  });

  it("sameMetro lifts a cross-region supplier to the LOCAL freight zone (score 1.0)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    const res = MarketplaceMatchOrchestratorEngine.rankRfq({
      rfq: RFQ,
      buyerRegion: "Midwest",
      sameMetroSupplierIds: ["SHOP-FIT"], // FIT is Northeast but flagged same-metro as the buyer
    });
    const fit = res.ranked.find((r) => r.supplierId === "SHOP-FIT")!.signals;
    expect(fit.logisticsZone).toBe("local");
    expect(fit.logisticsScore).toBeCloseTo(1.0, 6);
  });
});

// ===========================================================================
// GRACEFUL DEGRADATION — absent signal data ⇒ documented neutral + provenance flag
// ===========================================================================

describe("rankRfq — graceful degradation (neutral defaults, flagged)", () => {
  it("falls back to neutral logistics/capacity and the reputation prior when no corpora are supplied", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    // No outcomes, no buyerRegion, no capacity → every differentiator is neutral, so matchScore alone orders.
    const res = MarketplaceMatchOrchestratorEngine.rankRfq({ rfq: RFQ });

    // matchScore dominates ⇒ blended order == capability order (FIT first).
    expect(res.ranked.map((r) => r.supplierId)).toEqual(["SHOP-FIT", "SHOP-WEAK"]);
    expect(res.ranked.map((r) => r.supplierId)).toEqual(res.capabilityShortlist.map((s) => s.supplierId));

    const fit = res.ranked.find((r) => r.supplierId === "SHOP-FIT")!.signals;
    // reputation → industry prior 0.7, flagged neutral-default (0 jobs)
    expect(fit.reputationScore).toBeCloseTo(0.7, 6);
    expect(fit.reputationJobs).toBe(0);
    expect(fit.reputationProvenance).toBe("neutral-default");
    // logistics → neutral 0.5, zone null, flagged neutral-default
    expect(fit.logisticsScore).toBeCloseTo(0.5, 6);
    expect(fit.logisticsZone).toBeNull();
    expect(fit.logisticsProvenance).toBe("neutral-default");
    // capacity → neutral 0.5, flagged neutral-default (NOT the 1.0 a project([]) would give)
    expect(fit.capacityScore).toBeCloseTo(0.5, 6);
    expect(fit.capacityProvenance).toBe("neutral-default");

    // FIT final (default weights, all-neutral signals): .4*1 + .25*0.7 + .2*0.5 + .15*0.5 = 0.75
    expect(res.ranked[0].finalScore).toBeCloseTo(0.75, 4);
  });

  it("a supplier with recorded outcomes is `evidence` while one without is `neutral-default`", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    // Only WEAK has outcomes; FIT has none → FIT reputation is the prior (neutral-default).
    const res = MarketplaceMatchOrchestratorEngine.rankRfq({
      rfq: RFQ,
      outcomes: outcomes("SHOP-WEAK", 12, true, 1.4),
    });
    const weak = res.ranked.find((r) => r.supplierId === "SHOP-WEAK")!.signals;
    const fit = res.ranked.find((r) => r.supplierId === "SHOP-FIT")!.signals;
    expect(weak.reputationProvenance).toBe("evidence");
    expect(weak.reputationJobs).toBe(12);
    expect(fit.reputationProvenance).toBe("neutral-default");
    expect(fit.reputationScore).toBeCloseTo(0.7, 6);
  });
});

// ===========================================================================
// LONE SURVIVOR + EMPTY SHORTLIST + result shape
// ===========================================================================

describe("rankRfq — degenerate survivor counts + shape", () => {
  it("a lone survivor gets matchScore 1.0 and a single blended rank", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit); // only one shop

    const res = MarketplaceMatchOrchestratorEngine.rankRfq({ rfq: RFQ });
    expect(res.survivors).toBe(1);
    expect(res.ranked).toHaveLength(1);
    expect(res.ranked[0].supplierId).toBe("SHOP-FIT");
    expect(res.ranked[0].signals.matchScore).toBeCloseTo(1.0, 4);
    // all-neutral differentiators ⇒ .4*1 + .25*0.7 + .2*0.5 + .15*0.5 = 0.75
    expect(res.ranked[0].finalScore).toBeCloseTo(0.75, 4);
    expect(res.ranked[0].rank).toBe(1);
  });

  it("passes through an empty shortlist + noMatch reason when nobody can do the job (never throws)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    // A wedm job: both shops are mill-only ⇒ process miss ⇒ empty shortlist (a valid surfaced outcome).
    const res = MarketplaceMatchOrchestratorEngine.rankRfq({
      rfq: { ...RFQ, rfqId: "RFQ-NONE", process: "wedm" },
    });
    expect(res.survivors).toBe(0);
    expect(res.ranked).toHaveLength(0);
    expect(res.capabilityShortlist).toHaveLength(0);
    expect(res.excluded).toHaveLength(2);
    expect(res.noMatch).not.toBeNull();
    expect(res.noMatch).toContain("RFQ-NONE");
    // weights are still resolved on the empty path (default blend).
    expect(res.weights).toEqual({ match: 0.4, reputation: 0.25, logistics: 0.2, capacity: 0.15 });
  });

  it("stamps the result with rfqId + schemaVersion and counts candidates/survivors", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);

    const res = MarketplaceMatchOrchestratorEngine.rankRfq({ rfq: RFQ });
    expect(res.rfqId).toBe("RFQ-MOAT");
    expect(res.schemaVersion).toBe(MARKETPLACE_ORCH_SCHEMA_VERSION);
    expect(res.candidatesEvaluated).toBe(2);
    expect(res.survivors).toBe(2);
    expect(res.noMatch).toBeNull();
  });

  it("is deterministic — identical input yields identical blended ranking + scores on repeat", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);
    const input: RankRfqInput = {
      rfq: RFQ,
      buyerRegion: "Midwest",
      outcomes: outcomes("SHOP-WEAK", 5, true, 1.5),
    };
    const a = MarketplaceMatchOrchestratorEngine.rankRfq(input);
    const b = MarketplaceMatchOrchestratorEngine.rankRfq(input);
    expect(a.ranked.map((r) => `${r.supplierId}:${r.finalScore}`)).toEqual(
      b.ranked.map((r) => `${r.supplierId}:${r.finalScore}`),
    );
  });
});

// ===========================================================================
// FAIL-LOUD — bad input throws (propagated from the right layer; never silent)
// ===========================================================================

describe("rankRfq — fail-loud validation", () => {
  it("throws on a bad RFQ (non-positive tolerance) — propagated from scoreShortlist", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    expect(() =>
      MarketplaceMatchOrchestratorEngine.rankRfq({ rfq: { ...RFQ, toleranceMm: 0 } }),
    ).toThrow(/toleranceMm must be > 0/);
  });

  it("throws when blend weights do not sum to 1.0 — propagated from the capstone", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    SupplierCapabilityProfileEngine.registerSupplier(shopWeak);
    expect(() =>
      MarketplaceMatchOrchestratorEngine.rankRfq({
        rfq: RFQ,
        weights: { match: 0.5, reputation: 0.5, logistics: 0.5, capacity: 0.5 },
      }),
    ).toThrow(/must sum to 1\.0/);
  });

  it("throws when bad weights are supplied even on an EMPTY shortlist (fails loud regardless of matches)", () => {
    // No suppliers registered → empty shortlist; the bad weights must still throw (not silently pass through).
    expect(() =>
      MarketplaceMatchOrchestratorEngine.rankRfq({
        rfq: RFQ,
        weights: { match: 0.9, reputation: 0.9, logistics: 0.9, capacity: 0.9 },
      }),
    ).toThrow(/must sum to 1\.0/);
  });

  it("throws when buyerRegion is supplied but empty (ambiguous — omit it for the neutral default)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    expect(() =>
      MarketplaceMatchOrchestratorEngine.rankRfq({ rfq: RFQ, buyerRegion: "" }),
    ).toThrow(/buyerRegion, when supplied, must be a non-empty string/);
  });

  it("throws when an explicit candidateSupplierId is unknown — propagated from scoreShortlist", () => {
    SupplierCapabilityProfileEngine.registerSupplier(shopFit);
    expect(() =>
      MarketplaceMatchOrchestratorEngine.rankRfq({ rfq: RFQ, candidateSupplierIds: ["NO-SUCH-SHOP"] }),
    ).toThrow(/unknown supplierId 'NO-SUCH-SHOP'/);
  });
});
