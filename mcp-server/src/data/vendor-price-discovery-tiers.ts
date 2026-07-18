/**
 * vendor-price-discovery-tiers.ts -- price-discovery tier policy for VendorUnitPriceEngine
 * (galaxy:quoting, slot:charlie; QUOTING-VENDOR-LOC-MS0 / U-LVP02).
 *
 * The LocationAwareVendorPricingEngine ranks vendors on TOTAL LANDED COST but feeds every
 * vendor the SAME part value -- so the ranking is freight/customs-only, blind to the fact
 * that vendors quote DIFFERENT unit prices. This file holds the policy that turns a vendor's
 * known catalog signals (`pricing_access` + `has_api`) into an HONEST advisory unit-price
 * BAND, so the LVP can differentiate vendors on real per-unit cost, not just geography.
 *
 * HONESTY (R12 + charlie soul: never fabricate a price):
 *   - We do NOT have a live credentialed price feed for any vendor (api-vendors carry
 *     `has_api:true` but no connector is wired). So we NEVER claim a "real quote".
 *   - Instead each vendor's unit price is an ADVISORY BAND anchored to the quote's OWN
 *     material/part basis (the value the caller already computed), widened by:
 *       (1) the vendor's price-discovery tier (how knowable its price is), and
 *       (2) a region cost-of-supply factor (a US-Midwest buyer pays differently to source
 *           from a low-cost vs high-cost supply region).
 *   - Every band is tagged with its tier + confidence so a downstream consumer can never
 *     mistake the midpoint for a firm price.
 *
 * This file holds ONLY the discovery-tier + region-factor POLICY (knowability bands and
 * relative supply-cost multipliers). It holds NO shop rates, NO material $/lb, and NO margin
 * constants -- those stay canonical in ShopConfigurationEngine + MarketMaterialPricingEngine
 * and are passed in as the anchor. Mirrors how geo-logistics-rates.ts keeps freight policy
 * out of the engine. (feedback_charlie_quoting_no_inline_rates)
 *
 * Citation: the tier widths are illustrative price-dispersion bands for a sourcing ADVISORY,
 * NOT a vendor quote. The region factors are coarse relative cost-of-supply indices (a US
 * Midwest job shop's buyer-side experience), overridable by a caller-supplied policy.
 *
 * @milestone QUOTING-VENDOR-LOC-MS0/U-LVP02
 * @author slot:charlie, 2026-06-23
 */

export const VENDOR_PRICE_DISCOVERY_SCHEMA_VERSION = "1.0.0";

/**
 * How knowable a vendor's unit price is, from the catalog's `pricing_access` field
 * (distribution in the live 482-vendor catalog: quote 175 / catalog 142 / unknown 156 / api 9).
 *   - "api"     -- programmatic price feed exists (has_api): tightest band, highest confidence.
 *   - "catalog" -- published list price: a moderate band around the anchor, list-price grade.
 *   - "quote"   -- RFQ-only, no standing price: a WIDE band (could be high or low), advisory only.
 *   - "unknown" -- no pricing signal at all: the widest band, lowest confidence.
 */
export type PriceDiscoveryTier = "api" | "catalog" | "quote" | "unknown";

/** A discovery tier's band policy: how far the unit price may deviate from the anchor + a confidence. */
export interface DiscoveryTierPolicy {
  /** Fractional half-width of the advisory band around the anchor (0.05 = +/-5%). */
  bandHalfWidthFraction: number;
  /**
   * Central tendency shift vs the anchor (signed fraction). api/catalog vendors with a
   * standing price tend to sit AT the anchor (0); quote/unknown vendors carry no standing
   * price so we do not shift the midpoint -- the WIDTH carries the uncertainty, not a bias.
   */
  midpointShiftFraction: number;
  /** Confidence in the band [0,1] -- a tighter, better-known tier scores higher. */
  confidence: number;
  /** Whether a vendor in this tier can return a programmatic price (informational). */
  programmatic: boolean;
}

/**
 * Tier policy table. Bands WIDEN and confidence FALLS as the price gets less knowable.
 * No midpoint bias on any tier (R12: we will not nudge a vendor cheaper/dearer without
 * evidence -- the band width is the honest expression of what we do not know).
 */
export const PRICE_DISCOVERY_TIERS: Readonly<Record<PriceDiscoveryTier, DiscoveryTierPolicy>> =
  Object.freeze({
    api: Object.freeze({
      bandHalfWidthFraction: 0.05,
      midpointShiftFraction: 0,
      confidence: 0.85,
      programmatic: true,
    }),
    catalog: Object.freeze({
      bandHalfWidthFraction: 0.1,
      midpointShiftFraction: 0,
      confidence: 0.65,
      programmatic: false,
    }),
    quote: Object.freeze({
      bandHalfWidthFraction: 0.2,
      midpointShiftFraction: 0,
      confidence: 0.4,
      programmatic: false,
    }),
    unknown: Object.freeze({
      bandHalfWidthFraction: 0.3,
      midpointShiftFraction: 0,
      confidence: 0.25,
      programmatic: false,
    }),
  });

/**
 * Map a raw catalog `pricing_access` string + `has_api` flag to a PriceDiscoveryTier.
 * Conservative: an unrecognized pricing_access falls to "unknown" (widest band), never
 * to a tighter tier than the evidence supports (soul: non-conservative filter forbidden).
 */
export function resolveDiscoveryTier(
  pricingAccess: string | undefined,
  hasApi: boolean | undefined,
): PriceDiscoveryTier {
  // has_api is the strongest signal -- a programmatic feed exists regardless of the label.
  if (hasApi === true) return "api";
  const pa = (pricingAccess ?? "").trim().toLowerCase();
  if (pa === "api") return "api";
  if (pa === "catalog") return "catalog";
  if (pa === "quote") return "quote";
  // "unknown" or anything unrecognized -> widest band.
  return "unknown";
}

/**
 * Coarse relative cost-of-supply index by region, from a US-Midwest buyer's vantage point.
 * 1.0 = the buyer's own domestic supply cost baseline (US). Lower = a cheaper supply region
 * on the bare unit price (before freight + customs, which GeoLogistics adds separately);
 * higher = a more expensive supply region. These are RELATIVE indices for ranking, NOT a
 * currency conversion or a landed cost (freight/duty are GeoLogistics' job, kept orthogonal).
 *
 * Citation: illustrative buyer-side relative sourcing-cost indices for a US job shop; coarse
 * by design (region granularity matches the catalog's region codes), overridable by a caller.
 */
export const REGION_SUPPLY_COST_FACTOR: Readonly<Record<string, number>> = Object.freeze({
  US: 1.0,
  CA: 1.02,
  MX: 0.85,
  EU: 1.08,
  DE: 1.1,
  UK: 1.08,
  FR: 1.07,
  IT: 1.05,
  ES: 1.0,
  CH: 1.2,
  ASIA: 0.78,
  CN: 0.75,
  JP: 1.12,
  AU: 1.1,
  ZA: 0.82,
});

/** The supply-cost factor for a region (1.0 = buyer baseline if the region is unknown). */
export function regionSupplyCostFactor(region: string | undefined): number {
  if (!region) return 1.0;
  return REGION_SUPPLY_COST_FACTOR[region.trim().toUpperCase()] ?? 1.0;
}
