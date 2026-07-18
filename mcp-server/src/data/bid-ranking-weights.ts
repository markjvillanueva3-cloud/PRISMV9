/**
 * bid-ranking-weights.ts — constants & policy for the bid-collection / award ranker of the PRISM
 * manufacturing networking marketplace (galaxy:business, slot:hotel). Single source of truth for the
 * TOPSIS criteria the {@link BidCollectionRankingEngine} ranks COMPETING SUPPLIER BIDS on — so the engine
 * never inlines a criterion weight, a benefit/cost direction, or a confidence-normalization bound.
 *
 * WHY A SEPARATE CONSTANTS MODULE: ranking the bids that came back is a multi-criteria decision (MCDM)
 * problem distinct from the pre-broadcast SHORTLIST match ({@link RFQMatchScoringEngine}, see
 * rfq-match-weights.ts). The shortlist match asks "given everyone CAN do it, who is the best fit to
 * INVITE"; this asks "given the sealed bids that came BACK, who should WIN". The dominant factors differ
 * (a live price + quoted lead time now exist), so the weights are a separate, separately-tunable policy.
 * Defining them here (frozen, cited, imported) keeps the engine a pure deterministic scorer and makes a
 * weight change a one-line, reviewable, test-covered edit — never an inlined literal hunt.
 *
 * Citation — TOPSIS MCDM (Hwang & Yoon 1981; Opricovic & Tzeng 2004), the same technique the reused
 * {@link TOPSISEngine} implements. The three award criteria below mirror the three factors a buyer on a
 * manufacturing marketplace (Xometry / Fictiv / Protolabs / Axhera) weighs across the bids returned for
 * a posted RFQ:
 *   1. price (USD)        — COST criterion (lower is better). The headline factor in a competitive bid.
 *   2. lead time (days)   — COST criterion (lower is better). Time-to-part; a faster shop wins ties on
 *                           price-sensitive but schedule-critical jobs.
 *   3. capability conf.   — BENEFIT criterion (higher is better). Tolerance HEADROOM (how much tighter
 *                           than the RFQ requires the bidding shop holds), sourced from
 *                           {@link SupplierCapabilityProfileEngine.canSatisfy}'s toleranceMarginMm. A
 *                           shop with margin de-risks the job — the cheapest bid at the ragged edge of a
 *                           shop's envelope is not the best bid.
 *
 * Weight rationale: price dominates a competitive bid board (0.5), lead time is the strong second factor
 * (0.3), and capability confidence is the de-risking tie-breaker (0.2). All three sum to 1.0 — TOPSIS
 * re-normalizes internally, but a clean unit sum keeps the policy auditable and the sum-to-one invariant
 * testable.
 */

export const BID_RANKING_WEIGHTS_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// CRITERIA TAXONOMY
// ============================================================================

/** The three TOPSIS criteria the bid ranker scores competing bids on. */
export type BidRankCriterion = "priceUsd" | "leadTimeDays" | "capabilityConfidence";

/**
 * The fixed criterion order — the TOPSIS decision-matrix columns follow this order EXACTLY. The engine
 * builds each bid's row by mapping over this array, so column order can never drift from the weight /
 * benefit vectors below (they are all derived from this single ordered list).
 */
export const BID_RANK_CRITERIA: ReadonlyArray<BidRankCriterion> = Object.freeze([
  "priceUsd",
  "leadTimeDays",
  "capabilityConfidence",
] as const);

/** Definition of one criterion: its weight (importance) and direction (benefit ⇒ higher is better). */
export interface BidRankCriterionDef {
  /** relative importance in [0,1]; the three weights sum to 1.0. */
  readonly weight: number;
  /** true ⇒ a higher raw value is better (benefit); false ⇒ lower is better (cost). */
  readonly benefit: boolean;
  /** human-readable rationale (surfaces in audits / why-this-rank explanations). */
  readonly rationale: string;
}

/**
 * The award-criteria policy. Price is weighted highest (the headline competitive factor on a bid board),
 * lead time second (time-to-part), capability confidence third (the de-risking tie-breaker). Price and
 * lead time are COST criteria (lower wins); capability confidence is a BENEFIT criterion (higher wins).
 * Weights sum to 1.0.
 */
export const BID_RANK_CRITERIA_DEFS: Readonly<Record<BidRankCriterion, BidRankCriterionDef>> = Object.freeze({
  priceUsd: Object.freeze({
    weight: 0.5,
    benefit: false,
    rationale: "quoted price in USD — the headline competitive factor on a bid board (lower wins)",
  }),
  leadTimeDays: Object.freeze({
    weight: 0.3,
    benefit: false,
    rationale: "quoted lead time in days — time-to-part; a faster shop wins schedule-critical jobs (lower wins)",
  }),
  capabilityConfidence: Object.freeze({
    weight: 0.2,
    benefit: true,
    rationale: "tolerance headroom from canSatisfy — a shop holding far tighter than required de-risks scrap (higher wins)",
  }),
});

/** The weight vector in {@link BID_RANK_CRITERIA} column order (fed straight to TOPSISEngine). */
export const BID_RANK_WEIGHT_VECTOR: ReadonlyArray<number> = Object.freeze(
  BID_RANK_CRITERIA.map((c) => BID_RANK_CRITERIA_DEFS[c].weight),
);

/** The benefit/cost direction vector in {@link BID_RANK_CRITERIA} column order (fed to TOPSISEngine). */
export const BID_RANK_BENEFIT_VECTOR: ReadonlyArray<boolean> = Object.freeze(
  BID_RANK_CRITERIA.map((c) => BID_RANK_CRITERIA_DEFS[c].benefit),
);

// ============================================================================
// CONFIDENCE NORMALIZATION
// ============================================================================

/**
 * Floor for the capability-confidence criterion. Confidence is the tolerance HEADROOM ratio
 * (toleranceMarginMm / rfq.toleranceMm), which lies in [0, 1) for a capable shop and is EXACTLY 0 when a
 * shop holds precisely the required tolerance with zero margin. A literal 0 in a TOPSIS column lets the
 * vector normalization collapse that criterion to 0 for that alternative, which would over-penalize a
 * perfectly-capable shop. Flooring at a small positive value keeps a zero-margin (but capable) shop on a
 * comparable scale while still ranking it below a shop with real headroom. Mirrors CONFIDENCE_FLOOR in
 * rfq-match-weights.ts (same rationale, kept independent so the two policies tune separately).
 */
export const BID_CONFIDENCE_FLOOR = 0.05;

/**
 * Confidence assigned when capability cannot be evaluated for a bid because the RFQ requirements needed
 * by canSatisfy were NOT supplied to rankBids (the caller passed bids only, no rfqRequirement). In that
 * degraded mode the ranker still orders bids on price + lead time, and every bid gets this NEUTRAL,
 * IDENTICAL confidence so the capability column contributes nothing to the relative ordering (a constant
 * column normalizes to a constant and cannot break ties either way) rather than silently fabricating a
 * per-shop margin. Surfaced honestly via the `capabilityEvaluated:false` flag on the result.
 */
export const BID_CONFIDENCE_NEUTRAL = 0.5;
