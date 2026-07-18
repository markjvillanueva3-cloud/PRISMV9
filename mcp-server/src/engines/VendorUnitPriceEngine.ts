/**
 * VendorUnitPriceEngine.ts -- QUOTING-VENDOR-LOC-MS0 / U-LVP02 (galaxy:quoting, slot:charlie)
 *
 * Resolves a per-vendor ADVISORY UNIT-PRICE BAND so the LocationAwareVendorPricingEngine can
 * rank vendors on REAL per-unit cost, not just freight/customs over one shared part value.
 *
 * THE GAP THIS CLOSES (the operator-visible one):
 *   LocationAwareVendorPricingEngine fed every vendor the SAME `part_value_usd`, so its ranking
 *   was geography-only -- two vendors in the same region landed at the IDENTICAL cost even
 *   though a real RFQ would show one quoting 15% under the other. This engine differentiates
 *   each vendor's bare unit price BEFORE freight, then LVP layers landed cost on top.
 *
 * HOW (honest, R12 + charlie soul: never fabricate a price):
 *   We have NO live credentialed price feed for any vendor. So a vendor's price is NEVER a
 *   "real quote" -- it is an advisory BAND anchored to the quote's OWN material/part basis
 *   (the number the caller already computed via the cost floor), modulated by:
 *     (1) the vendor's PRICE-DISCOVERY TIER (api/catalog/quote/unknown) -- how knowable its
 *         price is, which sets the BAND WIDTH + confidence (vendor-price-discovery-tiers.ts), and
 *     (2) a REGION SUPPLY-COST FACTOR -- a low-cost supply region shifts the band's MIDPOINT
 *         down on the bare unit price (freight + customs stay GeoLogistics' job, orthogonal).
 *   Every band carries {low, mid, high, tier, confidence, basis} so a consumer can never mistake
 *   the midpoint for a firm price. A quote-only vendor returns a deliberately WIDE band.
 *
 * COMPOSES (never re-derives -- R8/dedup):
 *   - vendor-price-discovery-tiers.ts   tier band policy + region supply-cost factor (NO rates inlined).
 *   - The caller's anchor unit price     (= material/part basis $/unit, already canonical-rate-derived
 *                                          upstream by ThreeView/ShopConfig/MarketMaterialPricing).
 *
 * This engine holds NO shop rates, NO material $/lb, NO margin constants. The anchor is PASSED IN
 * (the caller resolved it from ShopConfigurationEngine + MarketMaterialPricingEngine). That keeps the
 * soul's "never inline shop-rate-or-margin constants" invariant intact.
 *
 * @milestone QUOTING-VENDOR-LOC-MS0/U-LVP02
 * @author slot:charlie, 2026-06-23
 */

import { z } from "zod";
import {
  type PriceDiscoveryTier,
  PRICE_DISCOVERY_TIERS,
  resolveDiscoveryTier,
  regionSupplyCostFactor,
} from "../data/vendor-price-discovery-tiers.js";

// ============================================================================
// TYPES
// ============================================================================

export const VendorUnitPriceInputSchema = z.object({
  /** The anchor unit price (USD per unit) -- the buyer's own material/part basis, canonical-rate-derived
   *  upstream. This is the reference the band is built around; the engine never invents it. */
  anchor_unit_price_usd: z.number().nonnegative(),
  /** The vendor's catalog `pricing_access` signal (api|catalog|quote|unknown|other). */
  pricing_access: z.string().optional(),
  /** The vendor's `has_api` flag (a programmatic feed exists -> tightest tier). */
  has_api: z.boolean().optional(),
  /** The vendor's supply region code (e.g. "US","EU","CN"). Unknown -> buyer baseline (factor 1.0). */
  vendor_region: z.string().optional(),
  /** Lot quantity (the band is per-UNIT; quantity carried through for the lot extension). */
  quantity: z.number().int().positive().default(1),
  /** Optional vendor id/name for provenance echo. */
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
});

export type VendorUnitPriceInput = z.infer<typeof VendorUnitPriceInputSchema>;

/** A per-vendor advisory unit-price band. NEVER a firm quote -- mid is the central estimate only. */
export interface VendorUnitPriceBand {
  vendor_id?: string;
  vendor_name?: string;
  /** Price-discovery tier resolved from the catalog signals. */
  tier: PriceDiscoveryTier;
  /** Whether the vendor could return a programmatic price (api tier). */
  programmatic: boolean;
  /** Region supply-cost factor applied to the midpoint (1.0 = buyer baseline). */
  region_supply_factor: number;
  /** Lower bound of the advisory unit price (USD/unit). */
  unit_low_usd: number;
  /** Central estimate of the unit price (USD/unit) -- ADVISORY, not a firm quote. */
  unit_mid_usd: number;
  /** Upper bound of the advisory unit price (USD/unit). */
  unit_high_usd: number;
  /** Same band extended to the whole lot (mid x quantity), for landed-cost composition. */
  lot_mid_usd: number;
  /** Confidence in the band [0,1] -- falls as the price gets less knowable. */
  confidence: number;
  /** Provenance for audit. */
  basis: {
    anchor_unit_price_usd: number;
    band_half_width_fraction: number;
    source: string;
  };
}

export interface VendorUnitPriceResult {
  ok: boolean;
  reason?: string;
  band: VendorUnitPriceBand | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// ENGINE
// ============================================================================

export class VendorUnitPriceEngine {
  /**
   * Resolve a single vendor's advisory unit-price band from the quote anchor + its catalog signals.
   * Pure given input. NEVER throws for a normal vendor -- an invalid input returns ok:false.
   *
   * @param rawInput VendorUnitPriceInput (Zod-validated)
   * @returns VendorUnitPriceResult with the band (or a reason on invalid input)
   */
  static price(rawInput: VendorUnitPriceInput): VendorUnitPriceResult {
    const parsed = VendorUnitPriceInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        reason:
          "invalid-input: " +
          parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "),
        band: null,
      };
    }
    const inp = parsed.data;

    const tier = resolveDiscoveryTier(inp.pricing_access, inp.has_api);
    const policy = PRICE_DISCOVERY_TIERS[tier];
    const regionFactor = regionSupplyCostFactor(inp.vendor_region);

    // Midpoint = anchor shifted by the region supply-cost factor + the tier's (zero) midpoint bias.
    // (midpointShiftFraction is 0 on every tier today -- the WIDTH carries the uncertainty, not a bias.)
    const midpoint = inp.anchor_unit_price_usd * regionFactor * (1 + policy.midpointShiftFraction);

    const half = policy.bandHalfWidthFraction;
    const low = Math.max(0, midpoint * (1 - half));
    const high = midpoint * (1 + half);

    const band: VendorUnitPriceBand = {
      vendor_id: inp.vendor_id,
      vendor_name: inp.vendor_name,
      tier,
      programmatic: policy.programmatic,
      region_supply_factor: regionFactor,
      unit_low_usd: round2(low),
      unit_mid_usd: round2(midpoint),
      unit_high_usd: round2(high),
      lot_mid_usd: round2(midpoint * inp.quantity),
      confidence: policy.confidence,
      basis: {
        anchor_unit_price_usd: round2(inp.anchor_unit_price_usd),
        band_half_width_fraction: half,
        source:
          "VendorUnitPriceEngine: anchor x region_supply_factor +/- tier band " +
          "(vendor-price-discovery-tiers.ts); advisory band, NOT a firm vendor quote",
      },
    };

    return { ok: true, band };
  }

  /**
   * Convenience for the LocationAwareVendorPricingEngine: the per-LOT mid price for a vendor,
   * used as that vendor's part value before freight/customs. Returns the anchor x quantity
   * unchanged if the band cannot be resolved (fail-soft -- never breaks the landed-cost ranking).
   *
   * @param input VendorUnitPriceInput
   * @returns lot mid price in USD (>= 0)
   */
  static lotMidForVendor(input: VendorUnitPriceInput): number {
    const r = VendorUnitPriceEngine.price(input);
    if (r.ok && r.band) return r.band.lot_mid_usd;
    // Fail-soft: anchor x quantity (un-differentiated) so the caller still gets a usable number.
    const qty = typeof input.quantity === "number" && input.quantity > 0 ? input.quantity : 1;
    const anchor =
      typeof input.anchor_unit_price_usd === "number" && input.anchor_unit_price_usd >= 0
        ? input.anchor_unit_price_usd
        : 0;
    return round2(anchor * qty);
  }
}

export const vendorUnitPriceEngine = VendorUnitPriceEngine;
