/**
 * LocationAwareVendorPricingEngine.ts -- QUOTING-VENDOR-LOC-MS0 / U-LVP01 (galaxy:quoting, slot:charlie)
 *
 * Adds LOCATION + LOGISTICS + VENDOR/DISTRIBUTOR awareness to a quote. Given a part's
 * estimated value, weight, buyer region, and the relevant vendor category, it:
 *
 *   1. Prices the TOTAL LANDED COST (part + freight + customs) to the buyer's region
 *      for the shop's CURRENT JM vendor set, via GeoLogisticsRoutingEngine.
 *   2. Surfaces ALTERNATIVE vendors from the 482-vendor JM catalog in the same
 *      category, prices each one's landed cost the same way, and RANKS them.
 *   3. Emits a SUGGESTION: the cheapest-delivered alternative and the $ delta vs the
 *      current vendor -- "Vendor X delivers $Y cheaper to your region" -- so the
 *      operator sees where there is room to source better, with current vendors first.
 *
 * This is the buyer-side moat competitors miss: a cheaper bare part price can LOSE on
 * total delivered cost once freight + customs are added (the GeoLogisticsRoutingEngine
 * doctrine). Local/domestic vendors often win on landed cost despite a higher unit price.
 *
 * COMPOSES (never re-derives -- R8/dedup):
 *   - GeoLogisticsRoutingEngine  landed cost (part + freight + customs), cent-reconciled.
 *   - The JM vendor catalog       482 real vendors (vendor-catalog-db/tables/vendors.jsonl)
 *                                 + jm-vendors.jsonl current vendors. File-backed, cached.
 *
 * HONESTY (R12 + charlie soul):
 *   - Landed cost is ESTIMATE-grade (freight from a zone rate card, ad-valorem customs);
 *     every result carries its freight zone + transit days so the basis is explicit.
 *   - Alternative vendors are ADVISORY: a ranked sourcing suggestion, NOT an auto-switch.
 *   - A vendor with no region is treated as same-region as the buyer (best case) and
 *     flagged, never silently dropped.
 *
 * @milestone QUOTING-VENDOR-LOC-MS0/U-LVP01
 * @author slot:charlie, 2026-06-23
 */

import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { GeoLogisticsRoutingEngine, type LandedCost } from "./GeoLogisticsRoutingEngine.js";
import {
  VendorUnitPriceEngine,
  type VendorUnitPriceBand,
} from "./VendorUnitPriceEngine.js";

// ============================================================================
// CONSTANTS -- catalog paths + advisory thresholds (NOT prices; landed cost comes
// from GeoLogisticsRoutingEngine's zone rate card, never inlined here).
// ============================================================================

/** Catalog path relative to the REPO ROOT (process.cwd() = H:/prism). */
const VENDOR_CATALOG_REL_FROM_ROOT = "mcp-server/data/vendor-catalog-db/tables/vendors.jsonl";
/** Catalog path relative to the MCP-SERVER dir (process.cwd() = H:/prism/mcp-server, the
 *  common runtime for tests + the running server). */
const VENDOR_CATALOG_REL_FROM_SERVER = "data/vendor-catalog-db/tables/vendors.jsonl";

/**
 * Resolve the vendor catalog robustly against whichever cwd the process runs in.
 * The running server + vitest both have cwd = mcp-server/, but ad-hoc/server-root
 * invocations have cwd = repo root -- try both so the catalog is always found (R12:
 * a cwd-dependent path is the exact bug that made vendors_considered=0).
 */
function resolveCatalogPath(): string {
  const fromRoot = resolve(process.cwd(), VENDOR_CATALOG_REL_FROM_ROOT);
  if (existsSync(fromRoot)) return fromRoot;
  const fromServer = resolve(process.cwd(), VENDOR_CATALOG_REL_FROM_SERVER);
  if (existsSync(fromServer)) return fromServer;
  return fromRoot; // neither exists -> return the canonical form; loadCatalog fails-soft to []
}

/** The consolidated JM vendor catalog (482 vendors; vendor-catalog-db, owner juliett). */
const VENDOR_CATALOG_PATH = resolveCatalogPath();

/** A landed-cost gap this fraction below the current vendor is worth surfacing as a
 *  sourcing opportunity. Below it, the current vendor is "competitive on landed cost". */
const SOURCING_GAP_SURFACE_FRACTION = 0.05;

/** Default buyer region when the caller omits one (JM Die is US Midwest). */
const DEFAULT_BUYER_REGION = "US";

/** Max alternative vendors to rank/return (keeps the suggestion actionable). */
const MAX_ALTERNATIVES = 8;

// ============================================================================
// TYPES
// ============================================================================

/** A vendor record as stored in the catalog (the fields this engine consumes). */
export interface CatalogVendor {
  vendor_id: string;
  name: string;
  vendor_type?: string;
  reach?: string;
  categories?: string[];
  primary_category?: string;
  regions?: string[];
  pricing_access?: string;
  has_api?: boolean;
  source?: string;
  /** Present (non-null) when this is a CURRENT JM vendor (has procurement history). */
  jm?: unknown;
}

export const LocationVendorPricingInputSchema = z.object({
  /** The part/order value being sourced (USD, the quoted price for the whole lot). */
  part_value_usd: z.number().nonnegative(),
  /** Per-part weight (kg) for freight; defaults inside GeoLogisticsRoutingEngine if omitted. */
  per_part_weight_kg: z.number().positive().optional(),
  /** Lot quantity. */
  quantity: z.number().int().positive().default(1),
  /** Buyer/delivery region code (e.g. "US", "EU"). */
  buyer_region: z.string().min(1).default(DEFAULT_BUYER_REGION),
  /** Vendor category to source from (e.g. "material", "tooling-consumable", "outside-process"). */
  category: z.string().min(1),
  /** Expedited freight. */
  expedite: z.boolean().default(false),
  /** Same-metro courier/pickup (cheapest zone). */
  same_metro: z.boolean().default(false),
  /** Optional explicit current-vendor id (else inferred = first JM vendor in the category). */
  current_vendor_id: z.string().optional(),
  /** Override catalog path (testing). */
  catalog_path: z.string().optional(),
});

export type LocationVendorPricingInput = z.infer<typeof LocationVendorPricingInputSchema>;

export interface VendorLandedOption {
  vendor_id: string;
  vendor_name: string;
  vendor_region: string;
  /** True if this vendor is a current JM vendor (procurement history). */
  is_current: boolean;
  /** True if vendor region was unknown and assumed same-as-buyer. */
  region_assumed: boolean;
  landed: LandedCost;
  /** Total landed cost (convenience pointer == landed.totalLandedUsd). */
  total_landed_usd: number;
  zone: string;
  transit_days: number;
  /**
   * Per-vendor ADVISORY unit-price band (VendorUnitPriceEngine) -- this vendor's differentiated
   * lot value, NOT the shared part_value_usd. Carries {tier, confidence, basis} so the landed
   * cost's part component is honestly an advisory band, never read as a firm vendor quote (R12).
   */
  unit_price_band: VendorUnitPriceBand;
}

export interface SourcingSuggestion {
  /** "current-competitive" | "switch-opportunity" | "no-alternatives". */
  verdict: "current-competitive" | "switch-opportunity" | "no-alternatives";
  headline: string;
  /** $ saved per lot if switching to the best alternative (0 if none / current wins). */
  savings_usd_per_lot: number;
  best_alternative_vendor_id?: string;
  action: string;
}

export interface LocationVendorPricingResult {
  ok: boolean;
  reason?: string;
  input: LocationVendorPricingInput;
  /** The current vendor's landed option (null if no current vendor found in category). */
  current: VendorLandedOption | null;
  /** Alternatives ranked by total landed cost ascending (current excluded). */
  alternatives: VendorLandedOption[];
  suggestion: SourcingSuggestion;
  /** Provenance for audit. */
  provenance: {
    landed_cost_source: string;
    vendor_catalog_source: string;
    vendors_considered: number;
  };
}

// ============================================================================
// CATALOG CACHE (file-backed, loaded once per path)
// ============================================================================

const _catalogCache = new Map<string, CatalogVendor[]>();

/** Load + cache the vendor catalog from a JSONL file. Fail-soft to [] on a missing file. */
function loadCatalog(path: string): CatalogVendor[] {
  const cached = _catalogCache.get(path);
  if (cached) return cached;
  if (!existsSync(path)) {
    _catalogCache.set(path, []);
    return [];
  }
  const vendors: CatalogVendor[] = [];
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const v = JSON.parse(t) as CatalogVendor;
      if (v && typeof v.vendor_id === "string" && typeof v.name === "string") vendors.push(v);
    } catch {
      /* skip a malformed line -- a corrupt record must not crash the quote (R12 fail-soft on parse) */
    }
  }
  _catalogCache.set(path, vendors);
  return vendors;
}

/** Test/maintenance hook: clear the catalog cache. */
export function _clearCatalogCache(): void {
  _catalogCache.clear();
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(n: number): number { return Math.round(n * 100) / 100; }

function vendorInCategory(v: CatalogVendor, category: string): boolean {
  const cat = category.toLowerCase();
  if (v.primary_category && v.primary_category.toLowerCase() === cat) return true;
  return Array.isArray(v.categories) && v.categories.some((c) => String(c).toLowerCase() === cat);
}

/** A vendor's region for freight: first listed region, or null if unknown. */
function vendorRegion(v: CatalogVendor): string | null {
  if (Array.isArray(v.regions) && v.regions.length > 0 && v.regions[0]) return String(v.regions[0]);
  return null;
}

/** Price one vendor's landed cost to the buyer region, differentiated by its advisory unit-price band. */
function priceVendor(
  v: CatalogVendor,
  inp: LocationVendorPricingInput,
): VendorLandedOption {
  const region = vendorRegion(v);
  const regionAssumed = region == null;
  const fromRegion = region ?? inp.buyer_region; // unknown -> assume same-region (best case), flagged

  // DIFFERENTIATE the part value per vendor (U-LVP02): part_value_usd is the WHOLE-LOT value, so
  // derive a per-UNIT anchor (/quantity) before the band, then take the band's per-lot mid. This is
  // the fix for "every vendor fed the SAME part value" -- two vendors in the same freight zone now
  // diverge on the bare unit price (tier band + region supply-cost factor) BEFORE freight + customs.
  // Guard the quantity (schema enforces >=1, but be explicit -- a /0 here would be a quantity^2 error).
  const qty = inp.quantity > 0 ? inp.quantity : 1;
  const anchorUnit = inp.part_value_usd / qty;
  const bandResult = VendorUnitPriceEngine.price({
    anchor_unit_price_usd: anchorUnit,
    pricing_access: v.pricing_access,
    has_api: v.has_api,
    vendor_region: fromRegion,
    quantity: inp.quantity,
    vendor_id: v.vendor_id,
    vendor_name: v.name,
  });
  // Fail-soft: a degenerate band (should not happen for a valid lot) falls back to the shared value.
  const vendorLotValue =
    bandResult.ok && bandResult.band ? bandResult.band.lot_mid_usd : inp.part_value_usd;
  const band: VendorUnitPriceBand =
    bandResult.ok && bandResult.band
      ? bandResult.band
      : // Synthesize an un-differentiated, lowest-confidence band so the field is always present (R12).
        {
          vendor_id: v.vendor_id,
          vendor_name: v.name,
          tier: "unknown",
          programmatic: false,
          region_supply_factor: 1.0,
          unit_low_usd: anchorUnit,
          unit_mid_usd: anchorUnit,
          unit_high_usd: anchorUnit,
          lot_mid_usd: inp.part_value_usd,
          confidence: 0,
          basis: {
            anchor_unit_price_usd: anchorUnit,
            band_half_width_fraction: 0,
            source: "fallback: shared part value (band unresolved); advisory, NOT a firm quote",
          },
        };

  const landed = GeoLogisticsRoutingEngine.landedCost({
    fromRegion,
    toRegion: inp.buyer_region,
    quantity: inp.quantity,
    perPartWeightKg: inp.per_part_weight_kg,
    sameMetro: inp.same_metro,
    expedite: inp.expedite,
    partValueUsd: vendorLotValue,
  });
  return {
    vendor_id: v.vendor_id,
    vendor_name: v.name,
    vendor_region: fromRegion,
    is_current: v.jm != null,
    region_assumed: regionAssumed,
    landed,
    total_landed_usd: landed.totalLandedUsd,
    zone: landed.quote.zone,
    transit_days: landed.quote.transitDays,
    unit_price_band: band,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class LocationAwareVendorPricingEngine {
  /**
   * Price a quote across current + alternative vendors on TOTAL LANDED COST and
   * emit a sourcing suggestion. Pure given input + catalog file.
   *
   * @param rawInput LocationVendorPricingInput (Zod-validated)
   * @returns LocationVendorPricingResult with current option + ranked alternatives + suggestion
   */
  static price(rawInput: LocationVendorPricingInput): LocationVendorPricingResult {
    const parsed = LocationVendorPricingInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        reason: "invalid-input: " + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "),
        input: rawInput,
        current: null,
        alternatives: [],
        suggestion: { verdict: "no-alternatives", headline: "Invalid input.", savings_usd_per_lot: 0, action: "" },
        provenance: { landed_cost_source: "", vendor_catalog_source: "", vendors_considered: 0 },
      };
    }
    const inp = parsed.data;
    const catalogPath = inp.catalog_path ?? VENDOR_CATALOG_PATH;
    const catalog = loadCatalog(catalogPath);

    // Vendors in the requested category.
    const inCategory = catalog.filter((v) => vendorInCategory(v, inp.category));

    // Resolve the CURRENT vendor: explicit id, else first JM vendor in category, else first in category.
    let currentVendor: CatalogVendor | null = null;
    if (inp.current_vendor_id) {
      currentVendor = inCategory.find((v) => v.vendor_id === inp.current_vendor_id) ?? null;
    }
    if (!currentVendor) {
      currentVendor = inCategory.find((v) => v.jm != null) ?? inCategory[0] ?? null;
    }

    const current = currentVendor ? priceVendor(currentVendor, inp) : null;

    // Alternatives = every other in-category vendor, priced + ranked by landed cost asc.
    const alternatives = inCategory
      .filter((v) => !currentVendor || v.vendor_id !== currentVendor.vendor_id)
      .map((v) => priceVendor(v, inp))
      .sort((a, b) => a.total_landed_usd - b.total_landed_usd)
      .slice(0, MAX_ALTERNATIVES);

    const suggestion = buildSuggestion(current, alternatives);

    return {
      ok: true,
      input: inp,
      current,
      alternatives,
      suggestion,
      provenance: {
        landed_cost_source: "GeoLogisticsRoutingEngine.landedCost",
        vendor_catalog_source: catalogPath,
        vendors_considered: inCategory.length,
      },
    };
  }
}

// ============================================================================
// SUGGESTION BUILDER
// ============================================================================

function buildSuggestion(
  current: VendorLandedOption | null,
  alternatives: VendorLandedOption[],
): SourcingSuggestion {
  if (alternatives.length === 0) {
    return {
      verdict: "no-alternatives",
      headline: current
        ? `No alternative vendors in this category -- ${current.vendor_name} is the only sourced option.`
        : "No vendors found in this category.",
      savings_usd_per_lot: 0,
      action: "Consider expanding the vendor catalog for this category.",
    };
  }

  const best = alternatives[0]; // cheapest landed (ranked asc)

  // No current vendor -> recommend the cheapest landed alternative outright.
  if (!current) {
    return {
      verdict: "switch-opportunity",
      headline:
        `No current vendor on file -- cheapest delivered is ${best.vendor_name} ` +
        `at $${round2(best.total_landed_usd)} landed (${best.zone}, ${best.transit_days}d) ` +
        `${bandQualifier(best)}.`,
      savings_usd_per_lot: 0,
      best_alternative_vendor_id: best.vendor_id,
      action: `Quote ${best.vendor_name} to confirm (lowest est. landed cost; the part price is an advisory band, not a firm quote).`,
    };
  }

  const gap = current.total_landed_usd - best.total_landed_usd; // >0 means alternative is cheaper
  const gapFraction = current.total_landed_usd > 0 ? gap / current.total_landed_usd : 0;

  if (gapFraction > SOURCING_GAP_SURFACE_FRACTION) {
    return {
      verdict: "switch-opportunity",
      headline:
        `${best.vendor_name} delivers an est. $${round2(gap)} cheaper per lot than your current vendor ` +
        `${current.vendor_name} ($${round2(best.total_landed_usd)} vs $${round2(current.total_landed_usd)} landed) ` +
        `-- ${Math.round(gapFraction * 100)}% lower total delivered cost ${bandQualifier(best)}.`,
      savings_usd_per_lot: round2(Math.max(0, gap)),
      best_alternative_vendor_id: best.vendor_id,
      action:
        `Quote ${best.vendor_name} (${best.zone}, ${best.transit_days}d transit) for this category to confirm; ` +
        `the landed-cost edge is an advisory estimate (part price is a ${best.unit_price_band.tier}-tier band), not a firm quote.`,
    };
  }

  return {
    verdict: "current-competitive",
    headline:
      `Your current vendor ${current.vendor_name} is competitive on est. total landed cost ` +
      `($${round2(current.total_landed_usd)}, ${current.zone}) -- no cheaper-delivered alternative found ` +
      `${bandQualifier(current)}.`,
    savings_usd_per_lot: 0,
    action: "No vendor change indicated on landed-cost grounds for this quote.",
  };
}

/**
 * A short advisory qualifier for a headline: names the vendor's price-discovery tier so a
 * region-shifted band midpoint is never read as a firm delivered price (R12 honesty seam).
 */
function bandQualifier(opt: VendorLandedOption): string {
  const tier = opt.unit_price_band.tier;
  const conf = Math.round(opt.unit_price_band.confidence * 100);
  return `[part price: ${tier}-tier advisory band, ${conf}% conf]`;
}

export const locationAwareVendorPricingEngine = LocationAwareVendorPricingEngine;
