/**
 * BidCollectionRankingEngine — CLOSES THE MARKETPLACE LOOP of the PRISM manufacturing networking
 * marketplace (galaxy:business, slot:hotel). It is the downstream sibling of {@link RFQBroadcastEngine}:
 * once a buyer's bid window has CLOSED, this engine AGGREGATES the competing supplier bids, RANKS them by
 * multi-criteria TOPSIS (price + lead time + capability confidence), ROUTES the award to the winner, and
 * LOGS the full RFQ → bid → award → delivery → quality OUTCOME TUPLE — the labelled corpus a future
 * Phase-3 GNN (RFQShopLinkPredictionEngine) needs to learn which shop wins / delivers which job.
 *
 * PIPELINE (rankBids → award → recordOutcome):
 *   1. rankBids — read a CLOSED window's bids (from {@link RFQBroadcastEngine.getBids}, or accept an
 *      explicit bids[] for a pure/standalone rank), build a TOPSIS decision matrix over three criteria
 *      (priceUsd COST, leadTimeDays COST, capabilityConfidence BENEFIT), and produce a COMPLETE ranking
 *      via the iterative peel-off pattern (the {@link TOPSISEngine} surfaces only the single best
 *      alternative + spread, so we peel its winner off each pass to build a full ordering — mirrors
 *      {@link RFQMatchScoringEngine}#rankByTopsis VERBATIM). An EMPTY bid set is a REAL outcome
 *      ('noBids'), surfaced — NOT a throw (a closed window with zero bids is a legitimate market result).
 *   2. award — validate the winning bid exists for the RFQ and the window is 'closed' (awarding an OPEN
 *      window THROWS — you cannot award before bidding ends; a double-award THROWS), then produce an
 *      {@link Award} and flip the window status 'closed' → 'awarded' via RFQBroadcastEngine (when
 *      integrated — see §WINDOW-FLIP).
 *   3. recordOutcome — append an IMMUTABLE outcome tuple {rfq requirements, winning bid, award, delivery,
 *      quality} to an in-memory corpus; {@link getOutcomeCorpus} returns a deep COPY (the data the
 *      Phase-3 link-prediction GNN consumes; the engine never hands out a mutable reference to its store).
 *
 * REUSES (never re-derives):
 *  - {@link RFQBroadcastEngine} — OWNS the MarketplaceRFQ / BidWindow / SupplierBid storage; this engine
 *    READS a closed window's bids + window status and (on award) flips the window. The shared marketplace
 *    contract types (MarketplaceRFQ / SupplierBid / BidWindow) are imported from it VERBATIM.
 *  - {@link TOPSISEngine} — the MCDM ranker; its closeness math is never reimplemented here.
 *  - {@link SupplierCapabilityProfileEngine.canSatisfy} — the capability-confidence source (tolerance
 *    headroom margin) when the RFQ requirement is supplied to rankBids.
 *  - {@link roundCentsHalfEven} from the shared money util (src/data/money.ts) — every money value (award priceUsd) is half-even
 *    rounded to the cent, the marketplace-wide money rule. No bespoke rounding here.
 *  - bid-ranking-weights.ts — the cited TOPSIS criteria / weights / benefit-direction policy (imported,
 *    never inlined).
 *
 * DETERMINISM (test-friendly, no wall-clock in asserted values):
 *  - EVERY timestamp that affects output — awardedAt, deliveredAt — is a CALLER-SUPPLIED ISO string. The
 *    engine NEVER reads the system clock for any value a test asserts. The award's awardedAt is the
 *    caller's input verbatim; the outcome tuple's timestamps are caller inputs verbatim.
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - a bad input shape THROWS via zod; ranking with an unknown rfq (no window) THROWS; awarding an
 *    unknown bid / a bid not belonging to the rfq THROWS; awarding an OPEN (or cancelled) window THROWS;
 *    a DOUBLE-award THROWS; recording an outcome for an unknown award THROWS; a negative / NaN qualityCpk
 *    THROWS (a Cpk is a non-negative process-capability index — a negative value is a caller bug).
 *  - never hard-delete: the engine only appends to the outcome corpus + flips window status; nothing is
 *    removed ([[feedback_never_delete_only_disable]]).
 *
 * PII (business/CLAUDE.md §8.2): the marketplace contract carried here (MarketplaceRFQ / SupplierBid /
 *  BidWindow / Award / outcome tuple) carries NO buyer/supplier contact email or phone — only opaque
 *  account ids (buyerId / supplierId), which are non-PII identifiers and safe to store + log. There is
 *  therefore no contact field to mask in any record this engine stores or returns. (Contact PII lives in
 *  BuyerAccountEngine / SupplierCapabilityProfileEngine, which mask it at their own boundary.)
 *
 * §WINDOW-FLIP (RFQBroadcastEngine integration point — sibling-tolerant):
 *  - The shared BidWindow contract has an 'awarded' status, but RFQBroadcastEngine (the storage owner,
 *    built in this same Phase-1 wave) exposes NO public method to flip a window 'closed' → 'awarded' —
 *    its public surface is broadcast / submit / update / close / cancel / get / list. Rather than reach into a
 *    sibling-owned aggregate to add a flip (which would clobber peer work on golf-merge), this engine
 *    enforces the award lifecycle in ITS OWN store: an RFQ may be awarded at most once (a second award —
 *    even with a different awardId — THROWS via the awardedRfqIds guard). The unit spec anticipates
 *    exactly this ("flip the window status to 'awarded' via RFQBroadcastEngine if integrated, else return
 *    the Award + document"): the window-status flip is deferred to MAIN, where a markAwarded(rfqId) method
 *    can be added to RFQBroadcastEngine without a worktree clobber. award() READS the window via getWindow
 *    to require 'closed' status (so it cannot award an open / cancelled window); double-award protection
 *    is this engine's own invariant, not the window's, until the flip lands.
 *
 * §MAIN-WIRING (post golf-merge, in MAIN where the dispatcher is not stale):
 *  - wire rankBids / award / recordOutcome / getOutcomeCorpus into businessDispatcher (the marketplace
 *    award surface) — deferred per WIRE-EXEMPT.
 *  - resolve the rfqRequirement for rankBids from the stored MarketplaceRFQ at the dispatcher boundary so
 *    capability confidence is always evaluated in production.
 *  - feed recorded outcomes to the Phase-3 RFQShopLinkPredictionEngine as labelled training tuples.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import {
  RFQBroadcastEngine,
  type SupplierBid,
  type BidWindow,
} from "./RFQBroadcastEngine.js";
import { SupplierCapabilityProfileEngine } from "./SupplierCapabilityProfileEngine.js";
import { topsisEngine } from "./TOPSISEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import {
  BID_RANK_CRITERIA,
  BID_RANK_WEIGHT_VECTOR,
  BID_RANK_BENEFIT_VECTOR,
  BID_CONFIDENCE_FLOOR,
  BID_CONFIDENCE_NEUTRAL,
  type BidRankCriterion,
} from "../data/bid-ranking-weights.js";

// ============================================================================
// SHARED MARKETPLACE CONTRACT (the award + outcome shapes; bid/window/rfq are imported from broadcast)
// ============================================================================

/** The award routed to the winning bidder once a closed window is decided. */
export interface Award {
  awardId: string;
  rfqId: string;
  winningBidId: string;
  supplierId: string;
  /** the winning price in USD (half-even rounded to the cent). */
  priceUsd: number;
  /** ISO timestamp the award was made (caller-supplied — deterministic). */
  awardedAt: string;
}

/** The per-criterion raw values that fed the TOPSIS row for one ranked bid (audit / explainability). */
export interface BidRankCriteria {
  /** the bid's quoted price in USD (COST — lower better). */
  priceUsd: number;
  /** the bid's quoted lead time in days (COST — lower better). */
  leadTimeDays: number;
  /** the bidding shop's tolerance-headroom confidence in [floor, 1) (BENEFIT — higher better). */
  capabilityConfidence: number;
}

/** One ranked bid — its place in the TOPSIS ordering plus the criteria that produced it. */
export interface RankedBid {
  bidId: string;
  supplierId: string;
  /** 1-based rank (1 = the TOPSIS winner). */
  rank: number;
  /** the engine-produced closeness coefficient (monotonic non-increasing with rank). */
  score: number;
  priceUsd: number;
  leadTimeDays: number;
  criteria: BidRankCriteria;
}

/** The result of {@link BidCollectionRankingEngine.rankBids}. */
export interface RankBidsResult {
  rfqId: string;
  /** the bids in TOPSIS order (winner first). EMPTY when there were no bids (reason='noBids'). */
  ranked: RankedBid[];
  /** true when capability confidence was evaluated from canSatisfy (rfqRequirement supplied). */
  capabilityEvaluated: boolean;
  /** a surfaced reason when ranked is empty ('noBids'); undefined when a ranking was produced. */
  reason?: "noBids";
}

/** The immutable outcome tuple appended to the GNN training corpus. */
export interface RFQOutcome {
  awardId: string;
  rfqId: string;
  supplierId: string;
  winningBidId: string;
  /** the awarded price in USD (half-even rounded). */
  priceUsd: number;
  awardedAt: string;
  /** did the supplier deliver on or before the needByDate? */
  deliveredOnTime: boolean;
  /** ISO timestamp of delivery (caller-supplied — deterministic). */
  deliveredAt: string;
  /** measured process-capability index at delivery (>= 0); undefined when not inspected. */
  qualityCpk?: number;
}

export const BID_COLLECTION_RANKING_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so defaulted/optional fields stay optional for callers
// ============================================================================

/** The RFQ requirement needed to evaluate capability confidence via canSatisfy. */
const RfqRequirementSchema = z.object({
  process: z.string().min(1, "rfqRequirement.process is required"),
  materialGroup: z.string().min(1, "rfqRequirement.materialGroup is required"),
  toleranceMm: z
    .number()
    .finite("rfqRequirement.toleranceMm must be finite")
    .positive("rfqRequirement.toleranceMm must be > 0"),
  partEnvelopeMm: z.object({
    x: z.number().finite("rfqRequirement.partEnvelopeMm.x must be finite").positive("rfqRequirement.partEnvelopeMm.x must be > 0"),
    y: z.number().finite("rfqRequirement.partEnvelopeMm.y must be finite").positive("rfqRequirement.partEnvelopeMm.y must be > 0"),
    z: z.number().finite("rfqRequirement.partEnvelopeMm.z must be finite").positive("rfqRequirement.partEnvelopeMm.z must be > 0"),
  }),
  requiredCerts: z.array(z.string().min(1)).optional(),
});

/** A bid as supplied directly to rankBids (when not read from RFQBroadcastEngine.getBids). */
const InlineBidSchema = z.object({
  bidId: z.string().min(1, "bid.bidId is required"),
  rfqId: z.string().min(1, "bid.rfqId is required"),
  supplierId: z.string().min(1, "bid.supplierId is required"),
  priceUsd: z.number().finite("bid.priceUsd must be finite").positive("bid.priceUsd must be > 0"),
  leadTimeDays: z.number().int("bid.leadTimeDays must be an integer").positive("bid.leadTimeDays must be > 0"),
  notes: z.string().min(1).optional(),
  submittedAt: z.string().min(1, "bid.submittedAt (ISO) is required"),
});

const RankBidsSchema = z.object({
  rfqId: z.string().min(1, "rfqId is required"),
  /** explicit bids to rank; when omitted, the bids are read from RFQBroadcastEngine.getBids(rfqId). */
  bids: z.array(InlineBidSchema).optional(),
  /** optional RFQ requirement → enables capability-confidence evaluation via canSatisfy. */
  rfqRequirement: RfqRequirementSchema.optional(),
});
export type RankBidsInput = z.input<typeof RankBidsSchema>;

const AwardSchema = z.object({
  awardId: z.string().min(1, "awardId is required"),
  rfqId: z.string().min(1, "rfqId is required"),
  winningBidId: z.string().min(1, "winningBidId is required"),
  awardedAt: z.string().min(1, "awardedAt (ISO) is required"),
});
export type AwardInput = z.input<typeof AwardSchema>;

const RecordOutcomeSchema = z.object({
  awardId: z.string().min(1, "awardId is required"),
  rfqId: z.string().min(1, "rfqId is required"),
  supplierId: z.string().min(1, "supplierId is required"),
  deliveredOnTime: z.boolean(),
  /** measured Cpk at delivery — must be a finite >= 0 number when supplied. */
  qualityCpk: z.number().finite("qualityCpk must be finite").nonnegative("qualityCpk must be >= 0").optional(),
  deliveredAt: z.string().min(1, "deliveredAt (ISO) is required"),
});
export type RecordOutcomeInput = z.input<typeof RecordOutcomeSchema>;

// ============================================================================
// ENGINE
// ============================================================================

export class BidCollectionRankingEngine {
  /** awardId → the routed award. OWNED here (the award store). */
  private static awards = new Map<string, Award>();
  /** rfqIds that have been awarded — the double-award guard (see §WINDOW-FLIP). OWNED here. */
  private static awardedRfqIds = new Set<string>();
  /** the append-only outcome corpus (the GNN training precursor). OWNED here. */
  private static outcomes: RFQOutcome[] = [];

  /**
   * Rank the competing bids for a CLOSED RFQ window by multi-criteria TOPSIS.
   *
   * Criteria (cited policy in bid-ranking-weights.ts): priceUsd (COST), leadTimeDays (COST),
   * capabilityConfidence (BENEFIT). When `rfqRequirement` is supplied, capability confidence is the
   * tolerance-headroom ratio from {@link SupplierCapabilityProfileEngine.canSatisfy} (floored at
   * BID_CONFIDENCE_FLOOR); otherwise every bid gets BID_CONFIDENCE_NEUTRAL (a constant column that cannot
   * sway the ordering) and `capabilityEvaluated:false` is surfaced. The full ordering is produced by the
   * iterative peel-off pattern (mirrors RFQMatchScoringEngine) so every rank is the TOPSISEngine's own.
   *
   * @param input rfqId + optional bids[] (else read from RFQBroadcastEngine.getBids) + optional rfqRequirement.
   * @returns { rfqId, ranked, capabilityEvaluated, reason? } — winner first; empty ranked + reason='noBids'
   *          when there were no bids (no bids is a REAL outcome — documented, NOT a throw).
   * @throws if the input shape is bad, or bids are read from an unknown RFQ window (a phantom rfq is a bug).
   */
  static rankBids(input: RankBidsInput): RankBidsResult {
    const c = RankBidsSchema.parse(input); // throws on bad shape / non-positive price / bad lead time

    // Source the bids: explicit input, else read the closed window's bids from the storage owner.
    const bids: SupplierBid[] =
      c.bids !== undefined
        ? c.bids.map((b) => ({
            bidId: b.bidId,
            rfqId: b.rfqId,
            supplierId: b.supplierId,
            priceUsd: roundCentsHalfEven(b.priceUsd),
            leadTimeDays: b.leadTimeDays,
            ...(b.notes !== undefined ? { notes: b.notes } : {}),
            submittedAt: b.submittedAt,
          }))
        : RFQBroadcastEngine.getBids(c.rfqId); // THROWS on an unknown window (fail loud)

    const capabilityEvaluated = c.rfqRequirement !== undefined;

    if (bids.length === 0) {
      // No bids is a legitimate market result for a closed window — surface it with a reason, never throw.
      return { rfqId: c.rfqId, ranked: [], capabilityEvaluated, reason: "noBids" };
    }

    // ---- build each bid's criteria row (capability confidence from canSatisfy, or neutral) ----
    const scored = bids.map((bid) => ({
      bid,
      criteria: BidCollectionRankingEngine.#scoreCriteria(bid, c.rfqRequirement),
    }));

    const orderedWithScore = BidCollectionRankingEngine.#rankByTopsis(scored);

    const ranked: RankedBid[] = orderedWithScore.map((entry, i) => ({
      bidId: entry.bid.bidId,
      supplierId: entry.bid.supplierId,
      rank: i + 1,
      score: Math.round(entry.closeness * 1_000_000) / 1_000_000,
      priceUsd: entry.bid.priceUsd,
      leadTimeDays: entry.bid.leadTimeDays,
      criteria: { ...entry.criteria },
    }));

    return { rfqId: c.rfqId, ranked, capabilityEvaluated };
  }

  /**
   * Route the award to a winning bid. The window MUST be 'closed' (awarding an open window is a loud
   * refusal — you cannot award before bidding ends) and the winning bid must belong to the RFQ. Flips the
   * window 'closed' → 'awarded' via {@link RFQBroadcastEngine} (see §WINDOW-FLIP) so the same RFQ cannot
   * be awarded twice.
   *
   * @param input awardId + rfqId + winningBidId + awardedAt(ISO).
   * @returns the routed {@link Award}.
   * @throws if the awardId is a duplicate, the rfq window is unknown / not 'closed' (open/awarded/
   *         cancelled all throw), the winning bid is unknown, or the bid does not belong to the rfq.
   */
  static award(input: AwardInput): Award {
    const c = AwardSchema.parse(input);
    BidCollectionRankingEngine.#parseIso(c.awardedAt, "awardedAt"); // validate ISO (throws on bad)

    if (BidCollectionRankingEngine.awards.has(c.awardId)) {
      throw new Error(
        `BidCollectionRankingEngine.award: duplicate awardId '${c.awardId}' — award ids must be unique.`,
      );
    }

    // Double-award guard (see §WINDOW-FLIP): an RFQ may be awarded at most once. This is THIS engine's
    // own invariant because RFQBroadcastEngine exposes no window-flip method to make 'awarded' terminal.
    if (BidCollectionRankingEngine.awardedRfqIds.has(c.rfqId)) {
      throw new Error(
        `BidCollectionRankingEngine.award: RFQ '${c.rfqId}' has already been awarded — an RFQ is awarded ` +
          `at most once (a re-award is a surfaced illegal transition).`,
      );
    }

    // Read the window from the storage owner — must exist and be exactly 'closed'.
    const window = RFQBroadcastEngine.getWindow(c.rfqId);
    if (!window) {
      throw new Error(
        `BidCollectionRankingEngine.award: no bid window for RFQ '${c.rfqId}' (was it broadcast & closed?).`,
      );
    }
    if (window.status !== "closed") {
      throw new Error(
        `BidCollectionRankingEngine.award: RFQ '${c.rfqId}' window is '${window.status}', not 'closed' — ` +
          `only a closed window can be awarded (awarding an open window before bidding ends, or awarding a ` +
          `cancelled window, is a surfaced illegal transition).`,
      );
    }

    // The winning bid must be one of the bids received for this RFQ.
    const winning = BidCollectionRankingEngine.#mustGetRfqBid(window, c.rfqId, c.winningBidId);

    // WINDOW-FLIP deferred to MAIN: RFQBroadcastEngine has no public 'closed' → 'awarded' flip; this
    // engine records the award terminally in awardedRfqIds instead (see §WINDOW-FLIP). When MAIN adds
    // RFQBroadcastEngine.markAwarded(rfqId), call it here so the window status reflects the award too.
    BidCollectionRankingEngine.awardedRfqIds.add(c.rfqId);

    const award: Award = {
      awardId: c.awardId,
      rfqId: c.rfqId,
      winningBidId: c.winningBidId,
      supplierId: winning.supplierId,
      priceUsd: roundCentsHalfEven(winning.priceUsd),
      awardedAt: c.awardedAt,
    };
    BidCollectionRankingEngine.awards.set(award.awardId, { ...award });
    return { ...award };
  }

  /**
   * Append an IMMUTABLE outcome tuple {rfq + winning bid + award + delivery + quality} to the GNN training
   * corpus. The award must exist (recording an outcome for a phantom award is a caller bug). qualityCpk,
   * when supplied, must be a finite >= 0 process-capability index (a negative/NaN Cpk THROWS).
   *
   * @param input awardId + rfqId + supplierId + deliveredOnTime + optional qualityCpk + deliveredAt(ISO).
   * @returns the appended {@link RFQOutcome} (a copy — the internal store is never handed out by reference).
   * @throws if the award is unknown, the rfqId/supplierId mismatch the recorded award, qualityCpk is
   *         negative/NaN, or the input shape is bad.
   */
  static recordOutcome(input: RecordOutcomeInput): RFQOutcome {
    const c = RecordOutcomeSchema.parse(input); // throws on negative/NaN Cpk, bad shape
    BidCollectionRankingEngine.#parseIso(c.deliveredAt, "deliveredAt"); // validate ISO (throws on bad)

    const award = BidCollectionRankingEngine.awards.get(c.awardId);
    if (!award) {
      throw new Error(
        `BidCollectionRankingEngine.recordOutcome: unknown awardId '${c.awardId}' — award the RFQ first.`,
      );
    }
    if (award.rfqId !== c.rfqId) {
      throw new Error(
        `BidCollectionRankingEngine.recordOutcome: rfqId '${c.rfqId}' does not match award '${c.awardId}' ` +
          `(awarded RFQ '${award.rfqId}') — the outcome must reference the awarded RFQ.`,
      );
    }
    if (award.supplierId !== c.supplierId) {
      throw new Error(
        `BidCollectionRankingEngine.recordOutcome: supplierId '${c.supplierId}' does not match award ` +
          `'${c.awardId}' (awarded supplier '${award.supplierId}') — the outcome must reference the winner.`,
      );
    }

    const outcome: RFQOutcome = {
      awardId: award.awardId,
      rfqId: award.rfqId,
      supplierId: award.supplierId,
      winningBidId: award.winningBidId,
      priceUsd: award.priceUsd,
      awardedAt: award.awardedAt,
      deliveredOnTime: c.deliveredOnTime,
      ...(c.qualityCpk !== undefined ? { qualityCpk: c.qualityCpk } : {}),
      deliveredAt: c.deliveredAt,
    };
    BidCollectionRankingEngine.outcomes.push(outcome);
    return { ...outcome };
  }

  /**
   * Return a deep COPY of the logged outcome corpus (the data a Phase-3 RFQShopLinkPredictionEngine
   * consumes). A COPY — never the internal array, and never internal tuple references — so a consumer can
   * never mutate the engine's stored corpus.
   * @returns the outcome tuples in append order (copies).
   */
  static getOutcomeCorpus(): RFQOutcome[] {
    return BidCollectionRankingEngine.outcomes.map((o) => ({ ...o }));
  }

  /**
   * Fetch a routed award by id.
   * @returns the {@link Award} (a copy), or null if none has that id.
   */
  static getAward(awardId: string): Award | null {
    const a = BidCollectionRankingEngine.awards.get(awardId);
    return a ? { ...a } : null;
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /**
   * Build one bid's three raw criterion values. priceUsd / leadTimeDays are taken straight from the bid
   * (their COST direction is encoded in the benefit vector). capabilityConfidence is the tolerance-
   * headroom ratio from canSatisfy when the RFQ requirement is supplied (floored), else the neutral
   * constant. PURE — no clock, no network.
   */
  static #scoreCriteria(
    bid: SupplierBid,
    rfqRequirement: z.infer<typeof RfqRequirementSchema> | undefined,
  ): BidRankCriteria {
    let capabilityConfidence: number;
    if (rfqRequirement === undefined) {
      // Degraded mode: capability not evaluated — every bid gets the same neutral value (a constant
      // column contributes nothing to the relative ordering). Surfaced honestly via capabilityEvaluated.
      capabilityConfidence = BID_CONFIDENCE_NEUTRAL;
    } else {
      // canSatisfy THROWS on an unknown supplierId or a typo'd requirement enum — propagate (fail loud);
      // a bid from a shop the registry has never heard of is a caller bug, not a silent zero.
      const verdict = SupplierCapabilityProfileEngine.canSatisfy(bid.supplierId, {
        process: rfqRequirement.process as never,
        materialGroup: rfqRequirement.materialGroup as never,
        toleranceMm: rfqRequirement.toleranceMm,
        partEnvelopeMm: rfqRequirement.partEnvelopeMm,
        requiredCerts: (rfqRequirement.requiredCerts ?? []) as never,
      });
      // headroom ratio = margin / required tolerance, in [0,1) for a capable shop; negative if the shop
      // holds LOOSER than required (not capable). Floor at BID_CONFIDENCE_FLOOR so a zero/negative-margin
      // shop stays on a comparable, strictly-positive scale (over-penalizing it to 0 would let the column
      // normalize it out entirely). The price/lead-time columns still rank it; this never hides a bad fit
      // because rankBids does not hard-filter — it ranks every received bid honestly.
      const headroomRatio = verdict.margins.toleranceMarginMm / rfqRequirement.toleranceMm;
      capabilityConfidence = Math.max(BID_CONFIDENCE_FLOOR, headroomRatio);
    }
    return {
      priceUsd: bid.priceUsd,
      leadTimeDays: bid.leadTimeDays,
      capabilityConfidence,
    };
  }

  /**
   * Rank scored bids by TOPSIS closeness, REUSING {@link TOPSISEngine} (never reimplementing its math).
   *
   * TOPSISEngine.calculate() surfaces only the single best alternative + spread, not a full closeness
   * vector. To produce a complete ranking we PEEL OFF the engine's winner iteratively: build the matrix
   * for the remaining bids, ask the engine for its best, append it as the next rank, remove it, repeat
   * down to the last bid. Every ordering decision (and thus every rank) is the ENGINE's own — this code
   * only assembles the decision matrix and reads best_alternative_index / best_closeness. Mirrors
   * RFQMatchScoringEngine#rankByTopsis VERBATIM (same proven pattern).
   *
   * SCORE CONSISTENCY: each peel pass re-normalizes over a different pool, so a raw per-pass closeness is
   * not on a single comparable scale. We therefore clamp each appended closeness to be NON-INCREASING
   * (<= the previously-appended rank's score). This keeps the surfaced score monotonic with rank (rank 1
   * is never numerically below rank 2) while every score remains an engine-produced closeness coefficient.
   *
   * Special case n===1: a lone bid IS the ideal (TOPSIS needs >=2 alternatives to discriminate; a 1-row
   * matrix makes it both ideal and anti-ideal → closeness 0/0). A sole bid is the winner by definition, so
   * it gets closeness 1.0 — surfaced honestly, not a degenerate 0.
   */
  static #rankByTopsis(
    scored: { bid: SupplierBid; criteria: BidRankCriteria }[],
  ): { bid: SupplierBid; criteria: BidRankCriteria; closeness: number }[] {
    if (scored.length === 1) {
      return [{ ...scored[0], closeness: 1.0 }];
    }

    const weights = [...BID_RANK_WEIGHT_VECTOR];
    const isBenefit = [...BID_RANK_BENEFIT_VECTOR];
    const toRow = (cr: BidRankCriteria): number[] =>
      BID_RANK_CRITERIA.map((k: BidRankCriterion) => cr[k]);

    const remaining = [...scored];
    const out: { bid: SupplierBid; criteria: BidRankCriteria; closeness: number }[] = [];
    let prevScore = Number.POSITIVE_INFINITY; // monotonic-non-increasing clamp ceiling

    const appendWinner = (
      winner: { bid: SupplierBid; criteria: BidRankCriteria },
      rawCloseness: number,
    ): void => {
      const score = Math.min(rawCloseness, prevScore);
      prevScore = score;
      out.push({ ...winner, closeness: score });
    };

    while (remaining.length > 1) {
      const matrix = remaining.map((r) => toRow(r.criteria));
      const result = topsisEngine.calculate({ decision_matrix: matrix, weights, is_benefit: isBenefit });
      const bestIdx0 = result.best_alternative_index.value - 1; // engine returns 1-based
      if (bestIdx0 < 0 || bestIdx0 >= remaining.length) {
        throw new Error(
          `BidCollectionRankingEngine.#rankByTopsis: TOPSISEngine returned out-of-range best index ` +
            `${result.best_alternative_index.value} for ${remaining.length} alternatives.`,
        );
      }
      const winner = remaining.splice(bestIdx0, 1)[0];
      appendWinner(winner, result.best_closeness.value);
    }

    // The last bid in the pool is worst-ranked. Read its closeness honestly from the ORIGINAL full matrix
    // (its worst_closeness), then clamp to stay non-increasing.
    const last = remaining[0];
    const fullMatrix = scored.map((r) => toRow(r.criteria));
    const fullResult = topsisEngine.calculate({ decision_matrix: fullMatrix, weights, is_benefit: isBenefit });
    appendWinner(last, fullResult.worst_closeness.value);

    return out;
  }

  /** Find the winning bid among a window's received bids or THROW (fail loud — never award a phantom bid). */
  static #mustGetRfqBid(window: BidWindow, rfqId: string, bidId: string): SupplierBid {
    if (!window.receivedBidIds.includes(bidId)) {
      throw new Error(
        `BidCollectionRankingEngine.award: bid '${bidId}' is not a received bid for RFQ '${rfqId}' ` +
          `(received: ${window.receivedBidIds.join(", ") || "none"}) — cannot award a bid the window never got.`,
      );
    }
    const bids = RFQBroadcastEngine.getBids(rfqId);
    const winning = bids.find((b) => b.bidId === bidId);
    if (!winning) {
      // Unreachable: receivedBidIds and the bid store are kept in sync by RFQBroadcastEngine. Never trust
      // a dangling id silently.
      throw new Error(
        `BidCollectionRankingEngine.award: bid '${bidId}' is referenced by RFQ '${rfqId}' window but ` +
          `missing from the bid store.`,
      );
    }
    return winning;
  }

  /**
   * Parse a caller-supplied ISO timestamp to epoch ms, THROWING on anything unparseable. Guards every
   * timestamp the engine records — a bad ISO is a caller bug, never silently coerced to NaN/0.
   */
  static #parseIso(iso: string, field: string): number {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) {
      throw new Error(`BidCollectionRankingEngine: ${field} '${iso}' is not a valid ISO timestamp.`);
    }
    return ms;
  }

  /** TEST-ONLY: clear the award + outcome stores (this engine's owned state). */
  static __resetForTests(): void {
    BidCollectionRankingEngine.awards.clear();
    BidCollectionRankingEngine.awardedRfqIds.clear();
    BidCollectionRankingEngine.outcomes = [];
  }
}

export const bidCollectionRankingEngine = BidCollectionRankingEngine;
