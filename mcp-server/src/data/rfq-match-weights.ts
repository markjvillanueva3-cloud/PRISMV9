/**
 * rfq-match-weights.ts — constants & policy for the RFQ→supplier multi-criteria match scorer of the
 * PRISM manufacturing networking marketplace (galaxy:business, slot:hotel). Single source of truth for
 * the TOPSIS criteria the {@link RFQMatchScoringEngine} ranks SURVIVING suppliers on — so the engine
 * never inlines a criterion weight, a benefit/cost direction, or a normalization bound.
 *
 * WHY A SEPARATE CONSTANTS MODULE: the matcher's ranking is a multi-criteria decision (MCDM) problem.
 * The criteria, their relative importance (weights), and whether each is "more is better" (benefit) or
 * "less is better" (cost) are POLICY, not logic — they get tuned by the marketplace operator as the
 * platform learns which factors win bids. Defining them here (frozen, cited, imported) keeps the engine
 * a pure deterministic scorer and makes a weight change a one-line, reviewable, test-covered edit.
 *
 * Citation — TOPSIS MCDM (Hwang & Yoon 1981; Opricovic & Tzeng 2004), the same technique the reused
 * {@link TOPSISEngine} implements. The four criteria below mirror the four ranking factors a buyer on a
 * manufacturing marketplace (Xometry / Fictiv / Protolabs / Axhera) weighs once a shop has PASSED the
 * hard capability filter — i.e. given everyone left can physically do the job, who is the best fit:
 *   1. capability confidence — tolerance HEADROOM (how much tighter than required the shop holds);
 *      a shop with margin de-risks the job (less likely to scrap at the edge of its envelope).
 *   2. certification coverage — every required cert is met by construction post-filter (= 1.0 base),
 *      with a bonus for EXTRA marketplace-relevant certs the shop carries (a broader-qualified shop is
 *      a safer long-term partner and can absorb scope creep — e.g. an AS9100+NADCAP shop over a bare
 *      ISO9001 one for an aerospace buyer).
 *   3. geography — proximity to the buyer's preferred region (lower freight cost + lead time + tariff/
 *      ITAR domestic-sourcing risk). 1.0 same region, a distance proxy otherwise.
 *   4. process specialization — does the shop list the RFQ's process as a PRIMARY (first-declared)
 *      process? A specialist out-competes a generalist that merely "also does" the process.
 *
 * Weights sum to 1.0 (TOPSIS re-normalizes internally, but a clean unit sum keeps the policy auditable).
 */

import type { Certification } from "./supplier-capability-schema.js";

export const RFQ_MATCH_WEIGHTS_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// CRITERIA TAXONOMY
// ============================================================================

/** The four TOPSIS criteria the RFQ matcher ranks surviving suppliers on. */
export type RfqMatchCriterion =
  | "capabilityConfidence"
  | "certCoverage"
  | "geographyScore"
  | "processSpecialization";

/** The fixed criterion order — the TOPSIS decision-matrix columns follow this order EXACTLY. */
export const RFQ_MATCH_CRITERIA: ReadonlyArray<RfqMatchCriterion> = Object.freeze([
  "capabilityConfidence",
  "certCoverage",
  "geographyScore",
  "processSpecialization",
] as const);

/** Definition of one criterion: its weight (importance) and direction (benefit ⇒ more is better). */
export interface RfqMatchCriterionDef {
  /** relative importance in [0,1]; the four weights sum to 1.0. */
  readonly weight: number;
  /** true ⇒ a higher raw value is better (benefit); false ⇒ lower is better (cost). */
  readonly benefit: boolean;
  /** human-readable rationale (surfaces in audits / why-this-rank explanations). */
  readonly rationale: string;
}

/**
 * The criteria policy. Capability confidence is weighted highest (de-risking the physical job is the
 * dominant concern once everyone left CAN do it); geography is second (freight + lead-time + sourcing
 * risk); cert coverage and process specialization round it out. All four are BENEFIT criteria (every
 * raw value is constructed so that "more is better"). Weights sum to 1.0.
 */
export const RFQ_MATCH_CRITERIA_DEFS: Readonly<Record<RfqMatchCriterion, RfqMatchCriterionDef>> = Object.freeze({
  capabilityConfidence: Object.freeze({
    weight: 0.4,
    benefit: true,
    rationale: "tolerance headroom — a shop holding far tighter than required de-risks scrap at the spec edge",
  }),
  geographyScore: Object.freeze({
    weight: 0.3,
    benefit: true,
    rationale: "proximity to the buyer's preferred region — lower freight, lead time, and sourcing risk",
  }),
  certCoverage: Object.freeze({
    weight: 0.2,
    benefit: true,
    rationale: "required certs met (=1.0 post-filter) plus a bonus for extra relevant accreditations",
  }),
  processSpecialization: Object.freeze({
    weight: 0.1,
    benefit: true,
    rationale: "is the RFQ process a primary (first-declared) process — a specialist beats a generalist",
  }),
});

/** The weight vector in {@link RFQ_MATCH_CRITERIA} column order (fed straight to TOPSISEngine). */
export const RFQ_MATCH_WEIGHT_VECTOR: ReadonlyArray<number> = Object.freeze(
  RFQ_MATCH_CRITERIA.map((c) => RFQ_MATCH_CRITERIA_DEFS[c].weight),
);

/** The benefit/cost direction vector in {@link RFQ_MATCH_CRITERIA} column order (fed to TOPSISEngine). */
export const RFQ_MATCH_BENEFIT_VECTOR: ReadonlyArray<boolean> = Object.freeze(
  RFQ_MATCH_CRITERIA.map((c) => RFQ_MATCH_CRITERIA_DEFS[c].benefit),
);

// ============================================================================
// SCORING PARAMETERS (the raw-value normalization bounds — policy, never inlined)
// ============================================================================

/**
 * Capability-confidence normalization. The raw signal is the tolerance HEADROOM RATIO:
 *   headroomRatio = toleranceMarginMm / requirement.toleranceMm
 *                 = (requirement.toleranceMm − bestToleranceMm) / requirement.toleranceMm
 * which is in [0, 1) for any capable shop (margin >= 0 by construction post-filter, and < the
 * requirement since bestToleranceMm > 0). A shop holding EXACTLY the required tolerance scores the
 * CONFIDENCE_FLOOR (it is capable but has zero margin); a shop holding far tighter approaches 1.0. The
 * floor keeps a zero-headroom shop from collapsing to a 0 TOPSIS column (which would distort vector
 * normalization), while still ranking strictly below any shop with real margin.
 */
export const CONFIDENCE_FLOOR = 0.05;

/**
 * Geography distance-proxy score for a survivor NOT in the buyer's preferred region (or when the buyer
 * named no preference). 1.0 is reserved for an exact preferred-region match; everyone else gets this
 * mid-scale default (a true zip/lat-long distance model is a documented MAIN enrichment — see engine
 * §MAIN-WIRING). A neutral 0.5 keeps geography from dominating purely on a missing preference.
 */
export const GEOGRAPHY_DEFAULT_SCORE = 0.5;

/** Geography score for an exact preferred-region match. */
export const GEOGRAPHY_MATCH_SCORE = 1.0;

/** Process-specialization score when the RFQ process is the shop's PRIMARY (first-declared) process. */
export const SPECIALIZATION_PRIMARY_SCORE = 1.0;

/** Process-specialization score when the shop offers the process but NOT as its primary. */
export const SPECIALIZATION_SECONDARY_SCORE = 0.5;

/**
 * Per-extra-cert bonus added to the cert-coverage base of 1.0, capped by {@link CERT_BONUS_CAP}. Every
 * surviving shop meets the required certs (=1.0 base by construction); a shop carrying ADDITIONAL
 * marketplace-relevant certs (beyond what this RFQ required) earns this bonus per extra cert, rewarding
 * a broader-qualified, lower-risk partner.
 */
export const CERT_BONUS_PER_EXTRA = 0.1;

/** Maximum total cert-coverage score (base 1.0 + bonuses), so cert coverage cannot swamp the matrix. */
export const CERT_BONUS_CAP = 1.5;

/**
 * The marketplace-relevant cert universe the "extra cert" bonus counts against. A shop's certs beyond
 * the RFQ's requiredCerts, intersected with this set, drive the bonus. (Equals the full taxonomy today;
 * named here so a future "only count quality+aerospace certs" policy is a one-line edit, not engine logic.)
 */
export const BONUS_RELEVANT_CERTS: ReadonlyArray<Certification> = Object.freeze([
  "ISO9001",
  "AS9100",
  "ITAR",
  "CMMC_L1",
  "CMMC_L2",
  "NADCAP",
] as const);
