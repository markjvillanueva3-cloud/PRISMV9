/**
 * buyer-account-policy.ts — constants & policy vocabulary for the BUYER side of the PRISM
 * manufacturing networking marketplace (galaxy:business, slot:hotel).
 *
 * This is the SINGLE SOURCE OF TRUTH for the buyer-account model's enumerations + defaults:
 *   - the buyer credit-status lifecycle (unverified → verified → suspended),
 *   - the marketplace region taxonomy a buyer is headquartered in,
 *   - the default credit status a freshly-registered buyer carries,
 *   - the PII-masking minima (how much of an email / phone survives masking).
 * {@link BuyerAccountEngine} imports these — never inline a credit-status string, a region code,
 * the default status, or a masking width.
 *
 * SYMMETRY: the buyer side mirrors the supplier side ({@link supplier-capability-schema.ts}). A
 * supplier declares a `geography.region`; a buyer declares the same `region` axis from the SAME
 * taxonomy so the two sides of a match are spoken in one vocabulary (RFQMatchScoring's
 * preferredRegion already compares against supplier `geography.region`). The region list below is
 * the canonical buyer+supplier region axis.
 *
 * Citation:
 *   - Credit-status lifecycle mirrors the two-sided-marketplace KYB (Know-Your-Business)
 *     verification gate used by Xometry/Fictiv/Protolabs buyer onboarding: an account starts
 *     `unverified` (can browse, cannot transact), is promoted to `verified` after KYB / payment-
 *     instrument verification, and can be `suspended` for fraud / chargeback / non-payment.
 *   - Region taxonomy mirrors the U.S. Census Bureau's four statistical regions (Northeast,
 *     Midwest, South, West) plus an explicit `international` bucket for non-US buyers — the same
 *     coarse geo axis a domestic manufacturing marketplace ranks supplier proximity against
 *     (U.S. Census Bureau, "Census Regions and Divisions of the United States").
 *   - PII-masking widths follow the display-masking convention in business/CLAUDE.md §8.2: an email
 *     local-part collapses to its first character + `***` (a***@domain), a phone reveals only its
 *     last 4 digits — the minimum that keeps a record human-recognizable without leaking the
 *     contact handle into a display surface or a log.
 */

export const BUYER_ACCOUNT_POLICY_VERSION = "1.0.0";

// ============================================================================
// CREDIT-STATUS LIFECYCLE
// ============================================================================

/** A buyer's marketplace credit/verification status (the transact-gate axis). */
export type CreditStatus = "unverified" | "verified" | "suspended";

/** The full credit-status taxonomy (the only legal status values). */
export const CREDIT_STATUSES: ReadonlyArray<CreditStatus> = Object.freeze([
  "unverified", // freshly registered; may browse, may NOT post an RFQ until verified is not required to post — see DEFAULT below
  "verified", // KYB / payment-instrument verified; full marketplace access
  "suspended", // fraud / chargeback / non-payment hold; canPostRFQ === false
] as const);

const CREDIT_STATUS_SET: ReadonlySet<string> = new Set(CREDIT_STATUSES);

/** Is `s` a recognized credit status? */
export function isValidCreditStatus(s: string): s is CreditStatus {
  return CREDIT_STATUS_SET.has(s);
}

/**
 * The credit status a freshly-registered buyer carries when none is supplied.
 * `unverified` — the account exists and can post RFQs (posting is gated only by `suspended`, NOT by
 * `unverified`, per the canPostRFQ contract: active && status !== 'suspended'); promotion to
 * `verified` is a downstream KYB step that affects payout/escrow terms (MarketplaceLedger), not the
 * ability to source quotes.
 */
export const DEFAULT_CREDIT_STATUS: CreditStatus = "unverified";

// ============================================================================
// REGION TAXONOMY (shared buyer + supplier geo axis — U.S. Census 4 regions + international)
// ============================================================================

/** A marketplace region a buyer is headquartered in (shared with the supplier `geography.region` axis). */
export type MarketplaceRegion = "northeast" | "midwest" | "south" | "west" | "international";

/** The full region taxonomy (U.S. Census Bureau 4 regions + an international bucket). */
export const MARKETPLACE_REGIONS: ReadonlyArray<MarketplaceRegion> = Object.freeze([
  "northeast",
  "midwest",
  "south",
  "west",
  "international",
] as const);

const MARKETPLACE_REGION_SET: ReadonlySet<string> = new Set(MARKETPLACE_REGIONS);

/** Is `r` a recognized marketplace region? */
export function isValidRegion(r: string): r is MarketplaceRegion {
  return MARKETPLACE_REGION_SET.has(r);
}

// ============================================================================
// PII MASKING WIDTHS (display-masking minima — business/CLAUDE.md §8.2)
// ============================================================================

/**
 * How many leading characters of an email local-part survive masking before the `***` redaction.
 * 1 ⇒ `alice@x.com` → `a***@x.com`. The minimum that keeps the record human-recognizable.
 */
export const EMAIL_MASK_VISIBLE_PREFIX = 1;

/**
 * How many trailing digits of a phone survive masking. 4 ⇒ `+1 860 555 0142` → `***0142`.
 * The maximum a display surface may reveal under §8.2.
 */
export const PHONE_MASK_VISIBLE_SUFFIX = 4;
