/**
 * BidCollectionRankingEngine.test.ts — real-behavior tests for the marketplace-loop closer.
 *
 * Coverage: rankBids (dominant winner / price-lead tradeoff where the weighted winner is NOT the
 * cheapest / capability flips a price-lead tie / empty → noBids / read-from-broadcast integration /
 * capability-evaluated via canSatisfy), award (happy / open-window throws / unknown bid throws /
 * double-award throws / bid-not-on-rfq throws / unknown rfq throws), recordOutcome (append + corpus
 * round-trip + immutability + Cpk validation + award-mismatch throws), plus 3 spanning bid sets.
 *
 * Every TOPSIS assertion uses a HAND-VERIFIED reference value (the criteria construction makes the
 * winner Pareto-obvious or the closeness was computed against the reused TOPSISEngine math), so a test
 * FAILS if the ranking logic, weights, or peel-off ordering changes — never a presence-only stub.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BidCollectionRankingEngine,
  type RankBidsInput,
} from "../engines/BidCollectionRankingEngine.js";
import { RFQBroadcastEngine } from "../engines/RFQBroadcastEngine.js";
import { SupplierCapabilityProfileEngine } from "../engines/SupplierCapabilityProfileEngine.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ISO = "2026-05-30T12:00:00.000Z";
const AWARDED_AT = "2026-06-05T09:00:00.000Z";
const DELIVERED_AT = "2026-06-20T16:30:00.000Z";

type InlineBid = NonNullable<RankBidsInput["bids"]>[number];

/** A bid with only the fields rankBids needs (inline-bid path; no broadcast window required). */
function bid(bidId: string, supplierId: string, priceUsd: number, leadTimeDays: number): InlineBid {
  return { bidId, rfqId: "RFQ-1", supplierId, priceUsd, leadTimeDays, submittedAt: ISO };
}

/** Register a supplier whose tightest tolerance is `bestToleranceMm` (the canSatisfy margin source). */
function registerShop(supplierId: string, bestToleranceMm: number): void {
  SupplierCapabilityProfileEngine.registerSupplier({
    supplierId,
    name: `Shop ${supplierId}`,
    geography: { region: "midwest", state: "IL" },
    processes: ["mill"],
    machines: [
      {
        machineId: `${supplierId}-VMC`,
        process: "mill",
        axes: 3,
        envelopeMm: { x: 500, y: 400, z: 300 },
        maxRpm: 12000,
        controller: "haas",
      },
    ],
    materialGroups: ["P"],
    bestToleranceMm,
    certifications: ["ISO9001"],
  });
}

beforeEach(() => {
  BidCollectionRankingEngine.__resetForTests();
  RFQBroadcastEngine.__resetForTests();
  SupplierCapabilityProfileEngine.__resetForTests();
});

// ---------------------------------------------------------------------------
// rankBids — TOPSIS ordering (hand-verified)
// ---------------------------------------------------------------------------

describe("BidCollectionRankingEngine.rankBids — ordering", () => {
  it("ranks a Pareto-dominant bid (lowest price + shortest lead) as rank 1", () => {
    // A dominates B and C on BOTH cost criteria; confidence is neutral (not evaluated) → constant column.
    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [
        bid("bA", "supA", 1000, 10),
        bid("bB", "supB", 1500, 20),
        bid("bC", "supC", 2000, 30),
      ],
    });

    expect(out.rfqId).toBe("RFQ-1");
    expect(out.capabilityEvaluated).toBe(false);
    expect(out.reason).not.toBe("noBids"); // a produced ranking carries no noBids reason
    expect(out.ranked.map((r) => r.bidId)).toEqual(["bA", "bB", "bC"]);
    expect(out.ranked[0].rank).toBe(1);
    expect(out.ranked[2].rank).toBe(3);
    // Winner is the dominant bid; worst is the dominated bid; scores are monotonic non-increasing.
    expect(out.ranked[0].score).toBe(1); // sole ideal on both cost axes → closeness 1
    expect(out.ranked[2].score).toBe(0); // sole anti-ideal on both cost axes → closeness 0
    expect(out.ranked[0].score).toBeGreaterThanOrEqual(out.ranked[1].score);
    expect(out.ranked[1].score).toBeGreaterThanOrEqual(out.ranked[2].score);
  });

  it("picks the weighted winner that is NOT the cheapest bid (price/lead tradeoff)", () => {
    // X is cheapest (1000) but slowest (40d); Y is mid-price (1300) but fastest (5d). With price 0.5 /
    // lead 0.3 weights the TOPSIS winner is Y, not X. Z is dominated → worst. Reference scores computed
    // against the reused TOPSISEngine math: Y=0.8293, X=0.8054, Z=0.184.
    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [
        bid("bX", "supX", 1000, 40),
        bid("bY", "supY", 1300, 5),
        bid("bZ", "supZ", 2200, 30),
      ],
    });

    expect(out.ranked.map((r) => r.bidId)).toEqual(["bY", "bX", "bZ"]);
    expect(out.ranked[0].bidId).toBe("bY"); // winner is NOT the cheapest (bX)
    expect(out.ranked[0].score).toBeCloseTo(0.8293, 4);
    expect(out.ranked[1].score).toBeCloseTo(0.8054, 4);
    expect(out.ranked[2].score).toBeCloseTo(0.184, 4);
    // each ranked bid carries its criteria (the price/lead that fed the matrix)
    expect(out.ranked[0].criteria.priceUsd).toBe(1300);
    expect(out.ranked[0].criteria.leadTimeDays).toBe(5);
    expect(out.ranked[0].criteria.capabilityConfidence).toBe(0.5); // neutral (not evaluated)
  });

  it("lets capability confidence break a price+lead tie (capability-evaluated via canSatisfy)", () => {
    // Two bids identical on price+lead. supHi holds 0.01mm vs a 0.05mm requirement (margin 0.04, ratio
    // 0.8); supLo holds exactly 0.05mm (margin 0, floored to 0.05). The higher-confidence shop wins.
    registerShop("supHi", 0.01); // headroom ratio (0.05-0.01)/0.05 = 0.8
    registerShop("supLo", 0.05); // headroom ratio 0 → floored to BID_CONFIDENCE_FLOOR (0.05)

    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [bid("bLo", "supLo", 1000, 10), bid("bHi", "supHi", 1000, 10)],
      rfqRequirement: {
        process: "mill",
        materialGroup: "P",
        toleranceMm: 0.05,
        partEnvelopeMm: { x: 100, y: 100, z: 100 },
        requiredCerts: ["ISO9001"],
      },
    });

    expect(out.capabilityEvaluated).toBe(true);
    expect(out.ranked.map((r) => r.bidId)).toEqual(["bHi", "bLo"]);
    expect(out.ranked[0].criteria.capabilityConfidence).toBeCloseTo(0.8, 10);
    expect(out.ranked[1].criteria.capabilityConfidence).toBeCloseTo(0.05, 10); // floored, not 0
    expect(out.ranked[0].score).toBe(1); // sole capability-ideal among an otherwise-identical pair
    expect(out.ranked[1].score).toBe(0);
  });

  it("returns a single bid as rank 1 with closeness 1.0 (degenerate lone-bid case)", () => {
    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [bid("bSolo", "supSolo", 1234.567, 14)],
    });
    expect(out.ranked).toHaveLength(1);
    expect(out.ranked[0].rank).toBe(1);
    expect(out.ranked[0].score).toBe(1.0); // a lone bid is the ideal by definition, never a degenerate 0
    expect(out.ranked[0].priceUsd).toBe(1234.57); // half-even rounded to the cent on the inline path
  });

  it("returns empty + reason 'noBids' for a closed window with zero bids (a real outcome, not a throw)", () => {
    const out = BidCollectionRankingEngine.rankBids({ rfqId: "RFQ-1", bids: [] });
    expect(out.ranked).toEqual([]);
    expect(out.reason).toBe("noBids");
    expect(out.capabilityEvaluated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rankBids — integration with RFQBroadcastEngine.getBids
// ---------------------------------------------------------------------------

describe("BidCollectionRankingEngine.rankBids — broadcast integration", () => {
  /** Broadcast an RFQ to two registered shops and collect a bid from each, then close the window. */
  function broadcastWithTwoBids(): void {
    registerShop("supA", 0.01);
    registerShop("supB", 0.02);
    RFQBroadcastEngine.broadcastRFQ({
      rfq: {
        rfqId: "RFQ-1",
        buyerId: "buyer-1",
        process: "mill",
        materialGroup: "P",
        toleranceMm: 0.05,
        partEnvelopeMm: { x: 100, y: 100, z: 100 },
        quantity: 50,
        requiredCerts: ["ISO9001"],
        needByDate: "2026-07-01T00:00:00.000Z",
      },
      bidWindowHours: 72,
      broadcastAt: ISO,
      maxInvitees: 5,
    });
    RFQBroadcastEngine.submitBid({ bidId: "b1", rfqId: "RFQ-1", supplierId: "supA", priceUsd: 1800, leadTimeDays: 12, submittedAt: ISO });
    RFQBroadcastEngine.submitBid({ bidId: "b2", rfqId: "RFQ-1", supplierId: "supB", priceUsd: 1500, leadTimeDays: 20, submittedAt: ISO });
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");
  }

  it("reads the closed window's bids from RFQBroadcastEngine.getBids when no bids[] supplied", () => {
    broadcastWithTwoBids();
    const out = BidCollectionRankingEngine.rankBids({ rfqId: "RFQ-1" }); // no bids[] → read from broadcast
    expect(out.ranked).toHaveLength(2);
    expect(new Set(out.ranked.map((r) => r.bidId))).toEqual(new Set(["b1", "b2"]));
    expect(out.ranked[0].rank).toBe(1);
    expect(out.ranked[1].rank).toBe(2);
    expect(out.ranked[0].score).toBeGreaterThanOrEqual(out.ranked[1].score);
  });

  it("throws when ranking reads from an unknown RFQ window (phantom rfq is a bug, not empty)", () => {
    expect(() => BidCollectionRankingEngine.rankBids({ rfqId: "RFQ-NONE" })).toThrow(/no bid window/i);
  });
});

// ---------------------------------------------------------------------------
// award
// ---------------------------------------------------------------------------

describe("BidCollectionRankingEngine.award", () => {
  /** Broadcast + one bid (window left OPEN unless the test closes it). */
  function setupOpenWindowWithBid(): void {
    registerShop("supA", 0.01);
    RFQBroadcastEngine.broadcastRFQ({
      rfq: {
        rfqId: "RFQ-1",
        buyerId: "buyer-1",
        process: "mill",
        materialGroup: "P",
        toleranceMm: 0.05,
        partEnvelopeMm: { x: 100, y: 100, z: 100 },
        quantity: 50,
        requiredCerts: ["ISO9001"],
        needByDate: "2026-07-01T00:00:00.000Z",
      },
      bidWindowHours: 72,
      broadcastAt: ISO,
    });
    RFQBroadcastEngine.submitBid({ bidId: "b1", rfqId: "RFQ-1", supplierId: "supA", priceUsd: 1799.995, leadTimeDays: 12, submittedAt: ISO });
  }

  it("awards a winning bid on a CLOSED window (happy path, half-even rounded price)", () => {
    setupOpenWindowWithBid();
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");

    const award = BidCollectionRankingEngine.award({
      awardId: "AWD-1",
      rfqId: "RFQ-1",
      winningBidId: "b1",
      awardedAt: AWARDED_AT,
    });

    expect(award.awardId).toBe("AWD-1");
    expect(award.rfqId).toBe("RFQ-1");
    expect(award.winningBidId).toBe("b1");
    expect(award.supplierId).toBe("supA");
    expect(award.awardedAt).toBe(AWARDED_AT);
    // 1799.995 → submitBid stored it half-even at 1800.00, and award re-rounds the stored value.
    expect(award.priceUsd).toBe(1800);
    expect(BidCollectionRankingEngine.getAward("AWD-1")).toEqual(award);
  });

  it("throws when awarding an OPEN window (cannot award before bidding ends)", () => {
    setupOpenWindowWithBid(); // window left OPEN (not closed)
    expect(() =>
      BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: AWARDED_AT }),
    ).toThrow(/not 'closed'/i);
  });

  it("throws when awarding a bid that was never received for the RFQ", () => {
    setupOpenWindowWithBid();
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");
    expect(() =>
      BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b-ghost", awardedAt: AWARDED_AT }),
    ).toThrow(/not a received bid/i);
  });

  it("throws on a DOUBLE award of the same RFQ (an RFQ is awarded at most once)", () => {
    setupOpenWindowWithBid();
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");
    BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: AWARDED_AT });
    // second award (different awardId) for the same already-awarded RFQ must throw
    expect(() =>
      BidCollectionRankingEngine.award({ awardId: "AWD-2", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: AWARDED_AT }),
    ).toThrow(/already been awarded/i);
  });

  it("throws on a duplicate awardId", () => {
    setupOpenWindowWithBid();
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");
    BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: AWARDED_AT });
    // Re-using AWD-1 — the duplicate-id guard fires first (before the rfq-already-awarded guard).
    expect(() =>
      BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: AWARDED_AT }),
    ).toThrow(/duplicate awardId/i);
  });

  it("throws when awarding an unknown RFQ (no window at all)", () => {
    expect(() =>
      BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-NONE", winningBidId: "b1", awardedAt: AWARDED_AT }),
    ).toThrow(/no bid window/i);
  });

  it("throws on a non-ISO awardedAt", () => {
    setupOpenWindowWithBid();
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");
    expect(() =>
      BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: "not-a-date" }),
    ).toThrow(/not a valid ISO/i);
  });
});

// ---------------------------------------------------------------------------
// recordOutcome + getOutcomeCorpus
// ---------------------------------------------------------------------------

describe("BidCollectionRankingEngine.recordOutcome / getOutcomeCorpus", () => {
  function awardOne(): void {
    registerShop("supA", 0.01);
    RFQBroadcastEngine.broadcastRFQ({
      rfq: {
        rfqId: "RFQ-1",
        buyerId: "buyer-1",
        process: "mill",
        materialGroup: "P",
        toleranceMm: 0.05,
        partEnvelopeMm: { x: 100, y: 100, z: 100 },
        quantity: 50,
        requiredCerts: ["ISO9001"],
        needByDate: "2026-07-01T00:00:00.000Z",
      },
      bidWindowHours: 72,
      broadcastAt: ISO,
    });
    RFQBroadcastEngine.submitBid({ bidId: "b1", rfqId: "RFQ-1", supplierId: "supA", priceUsd: 1800, leadTimeDays: 12, submittedAt: ISO });
    RFQBroadcastEngine.closeWindow("RFQ-1", "2026-06-03T12:00:00.000Z");
    BidCollectionRankingEngine.award({ awardId: "AWD-1", rfqId: "RFQ-1", winningBidId: "b1", awardedAt: AWARDED_AT });
  }

  it("appends the full RFQ→bid→award→delivery→quality outcome tuple to the corpus", () => {
    awardOne();
    const outcome = BidCollectionRankingEngine.recordOutcome({
      awardId: "AWD-1",
      rfqId: "RFQ-1",
      supplierId: "supA",
      deliveredOnTime: true,
      qualityCpk: 1.67,
      deliveredAt: DELIVERED_AT,
    });

    expect(outcome).toEqual({
      awardId: "AWD-1",
      rfqId: "RFQ-1",
      supplierId: "supA",
      winningBidId: "b1",
      priceUsd: 1800,
      awardedAt: AWARDED_AT,
      deliveredOnTime: true,
      qualityCpk: 1.67,
      deliveredAt: DELIVERED_AT,
    });

    const corpus = BidCollectionRankingEngine.getOutcomeCorpus();
    expect(corpus).toHaveLength(1);
    expect(corpus[0]).toEqual(outcome);
  });

  it("getOutcomeCorpus returns a COPY — mutating it does not corrupt the internal store (immutability)", () => {
    awardOne();
    BidCollectionRankingEngine.recordOutcome({
      awardId: "AWD-1",
      rfqId: "RFQ-1",
      supplierId: "supA",
      deliveredOnTime: false,
      deliveredAt: DELIVERED_AT,
    });

    const corpus1 = BidCollectionRankingEngine.getOutcomeCorpus();
    corpus1.push({
      awardId: "HACK",
      rfqId: "X",
      supplierId: "Y",
      winningBidId: "Z",
      priceUsd: 0,
      awardedAt: ISO,
      deliveredOnTime: true,
      deliveredAt: ISO,
    });
    corpus1[0].priceUsd = -999; // mutate a returned tuple field

    const corpus2 = BidCollectionRankingEngine.getOutcomeCorpus();
    expect(corpus2).toHaveLength(1); // the pushed row never reached the store
    expect(corpus2[0].priceUsd).toBe(1800); // the field mutation never reached the store
    expect(corpus2[0].deliveredOnTime).toBe(false);
    expect("qualityCpk" in corpus2[0]).toBe(false); // not inspected → optional field omitted
  });

  it("throws when recording an outcome for an unknown award", () => {
    expect(() =>
      BidCollectionRankingEngine.recordOutcome({
        awardId: "AWD-NONE",
        rfqId: "RFQ-1",
        supplierId: "supA",
        deliveredOnTime: true,
        deliveredAt: DELIVERED_AT,
      }),
    ).toThrow(/unknown awardId/i);
  });

  it("throws when the outcome's supplierId does not match the awarded winner", () => {
    awardOne();
    expect(() =>
      BidCollectionRankingEngine.recordOutcome({
        awardId: "AWD-1",
        rfqId: "RFQ-1",
        supplierId: "supWRONG",
        deliveredOnTime: true,
        deliveredAt: DELIVERED_AT,
      }),
    ).toThrow(/does not match award/i);
  });

  it("throws when the outcome's rfqId does not match the awarded RFQ", () => {
    awardOne();
    expect(() =>
      BidCollectionRankingEngine.recordOutcome({
        awardId: "AWD-1",
        rfqId: "RFQ-OTHER",
        supplierId: "supA",
        deliveredOnTime: true,
        deliveredAt: DELIVERED_AT,
      }),
    ).toThrow(/does not match award/i);
  });

  it("throws on a negative qualityCpk (a Cpk is a non-negative process-capability index)", () => {
    awardOne();
    expect(() =>
      BidCollectionRankingEngine.recordOutcome({
        awardId: "AWD-1",
        rfqId: "RFQ-1",
        supplierId: "supA",
        deliveredOnTime: true,
        qualityCpk: -0.5,
        deliveredAt: DELIVERED_AT,
      }),
    ).toThrow(/qualityCpk must be >= 0/i);
  });

  it("throws on a NaN qualityCpk (zod rejects a non-finite number at the qualityCpk field)", () => {
    awardOne();
    // The validation message names the offending field (qualityCpk) — a NaN Cpk is a caller bug, never a
    // silently-stored corrupt quality datum in the GNN training corpus.
    expect(() =>
      BidCollectionRankingEngine.recordOutcome({
        awardId: "AWD-1",
        rfqId: "RFQ-1",
        supplierId: "supA",
        deliveredOnTime: true,
        qualityCpk: Number.NaN,
        deliveredAt: DELIVERED_AT,
      }),
    ).toThrow(/qualityCpk/i);
  });
});

// ---------------------------------------------------------------------------
// Adversarial / input validation
// ---------------------------------------------------------------------------

describe("BidCollectionRankingEngine — adversarial input validation", () => {
  it("throws on a non-finite (Infinity) bid price (zod rejects a non-finite number at the priceUsd field)", () => {
    // The validation message names the offending field (priceUsd) — a non-finite price never silently
    // slips into the TOPSIS matrix where it would corrupt the vector normalization.
    expect(() =>
      BidCollectionRankingEngine.rankBids({
        rfqId: "RFQ-1",
        bids: [{ bidId: "b1", rfqId: "RFQ-1", supplierId: "s1", priceUsd: Number.POSITIVE_INFINITY, leadTimeDays: 10, submittedAt: ISO }],
      }),
    ).toThrow(/priceUsd/i);
  });

  it("throws on a non-integer lead time", () => {
    expect(() =>
      BidCollectionRankingEngine.rankBids({
        rfqId: "RFQ-1",
        bids: [{ bidId: "b1", rfqId: "RFQ-1", supplierId: "s1", priceUsd: 1000, leadTimeDays: 10.5, submittedAt: ISO }],
      }),
    ).toThrow(/leadTimeDays must be an integer/i);
  });

  it("throws when a capability-evaluated rank references a supplier unknown to the registry (fail loud)", () => {
    // canSatisfy throws on an unknown supplierId — propagated, never a silent zero confidence.
    expect(() =>
      BidCollectionRankingEngine.rankBids({
        rfqId: "RFQ-1",
        bids: [bid("b1", "supGHOST", 1000, 10)],
        rfqRequirement: {
          process: "mill",
          materialGroup: "P",
          toleranceMm: 0.05,
          partEnvelopeMm: { x: 100, y: 100, z: 100 },
        },
      }),
    ).toThrow(/unknown supplierId/i);
  });

  it("throws on an empty rfqId", () => {
    expect(() => BidCollectionRankingEngine.rankBids({ rfqId: "", bids: [] })).toThrow(/rfqId is required/i);
  });
});

// ---------------------------------------------------------------------------
// Spanning bid sets (3 distinct configurations)
// ---------------------------------------------------------------------------

describe("BidCollectionRankingEngine — spanning configurations", () => {
  it("config 1: a 4-bid board ranks every bid with strictly-ordered ranks and monotonic scores", () => {
    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [
        bid("b1", "s1", 950, 9),
        bid("b2", "s2", 1100, 7),
        bid("b3", "s3", 1400, 14),
        bid("b4", "s4", 2500, 40),
      ],
    });
    expect(out.ranked).toHaveLength(4);
    expect(out.ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    // b4 is dominated on both criteria → must be last.
    expect(out.ranked[3].bidId).toBe("b4");
    // scores are monotonic non-increasing with rank (the peel-off clamp invariant).
    for (let i = 1; i < out.ranked.length; i++) {
      expect(out.ranked[i - 1].score).toBeGreaterThanOrEqual(out.ranked[i].score);
    }
  });

  it("config 2: two bids with identical price+lead are split only by capability confidence", () => {
    registerShop("sTight", 0.005); // ratio (0.05-0.005)/0.05 = 0.9
    registerShop("sLoose", 0.04); //  ratio (0.05-0.04)/0.05 = 0.2
    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [bid("bLoose", "sLoose", 1500, 15), bid("bTight", "sTight", 1500, 15)],
      rfqRequirement: { process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 50, y: 50, z: 50 }, requiredCerts: [] },
    });
    expect(out.ranked.map((r) => r.bidId)).toEqual(["bTight", "bLoose"]);
    expect(out.ranked[0].criteria.capabilityConfidence).toBeCloseTo(0.9, 10);
    expect(out.ranked[1].criteria.capabilityConfidence).toBeCloseTo(0.2, 10);
  });

  it("config 3: a single decisive bid plus a clearly inferior one — the cheap+fast bid wins", () => {
    const out = BidCollectionRankingEngine.rankBids({
      rfqId: "RFQ-1",
      bids: [bid("bWin", "sWin", 800, 6), bid("bLose", "sLose", 3000, 45)],
    });
    expect(out.ranked[0].bidId).toBe("bWin");
    expect(out.ranked[0].rank).toBe(1);
    expect(out.ranked[1].bidId).toBe("bLose");
    expect(out.ranked[0].score).toBe(1); // dominant on both cost axes
    expect(out.ranked[1].score).toBe(0);
  });
});
