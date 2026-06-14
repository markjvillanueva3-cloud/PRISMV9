/**
 * VendorRealtimePricingClientEngine — QUOTING-PIPELINE-MS0 / U-QP06
 *
 * Vendor-pricing adapter pattern. MS0 ships ADAPTER SHAPE + LOCAL CSV STUBS only —
 * real vendor-API integration (commercial keys, rate-limit policy, scraping authz)
 * is MS1.
 *
 * Per R12 fail-loud:
 *   - When a vendor adapter is requested but no API key is configured AND no CSV
 *     fallback exists, return { found: false, reason: "vendor-unconfigured" } —
 *     NEVER fabricate a price.
 *
 * Default cached prices feed from `state/shared/quoting/vendor-price-cache.json`
 * (created on first vendor lookup; CSV ingestion is a follow-up CLI in MS1).
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP06-VENDOR-REALTIME-PRICING-CLIENT
 * @author slot:charlie /goal-13 iter4, 2026-05-24
 */

export type VendorAdapter =
  | "mcmaster"
  | "misumi"
  | "haas-oem"
  | "okuma-oem"
  | "mazak-oem"
  | "doosan-oem"
  | "hurco-oem"
  | "dmg-mori-oem"
  | "makino-oem"
  | "fanuc-parts"
  | "sodick-oem"
  | "agie-oem"
  | "edm-supplies"
  | "roku-roku-oem"
  | "brother-oem";

export interface VendorPriceRequest {
  adapter: VendorAdapter;
  sku: string;
  /** Optional preferred quantity tier (1 / 10 / 100) */
  quantity?: number;
  /** Cached price fallback (so the engine is testable without env keys) */
  cachedPrices?: Record<string, Record<string, { unit_price_usd: number; lead_time_days?: number; source?: string }>>;
}

export interface VendorPriceResult {
  found: boolean;
  adapter: VendorAdapter;
  sku: string;
  unit_price_usd: number | null;
  total_price_usd: number | null;
  quantity: number;
  lead_time_days: number | null;
  source: "cache" | "api" | "csv" | "unconfigured";
  reason?: string;
}

/**
 * Read the per-adapter API-key knob. Adapter→env-var mapping (commercial layer):
 *   mcmaster   → MCMASTER_API_KEY
 *   misumi     → MISUMI_API_KEY
 *   <vendor>-oem → <UPPER>_OEM_API_KEY (e.g. HAAS_OEM_API_KEY)
 * MS0 leaves all unset by design — adapters fall back to cachedPrices or "unconfigured".
 */
function envKeyFor(adapter: VendorAdapter): string {
  if (adapter === "mcmaster") return "MCMASTER_API_KEY";
  if (adapter === "misumi") return "MISUMI_API_KEY";
  if (adapter === "edm-supplies") return "EDM_SUPPLIES_API_KEY";
  if (adapter === "fanuc-parts") return "FANUC_PARTS_API_KEY";
  // -oem family
  return adapter.replace(/-/g, "_").toUpperCase() + "_API_KEY";
}

export class VendorRealtimePricingClientEngine {
  /** Look up a single SKU. Pure function — uses cachedPrices when supplied. */
  lookupPrice(req: VendorPriceRequest): VendorPriceResult {
    if (!req || typeof req.adapter !== "string" || typeof req.sku !== "string" || req.sku.trim().length === 0) {
      return {
        found: false, adapter: req?.adapter ?? "mcmaster", sku: req?.sku ?? "",
        unit_price_usd: null, total_price_usd: null, quantity: 1, lead_time_days: null,
        source: "unconfigured", reason: "empty-or-missing-sku",
      };
    }
    const rawQty = req.quantity;
    const qty = (typeof rawQty === "number" && Number.isFinite(rawQty) && rawQty > 0) ? rawQty : 1;

    // Try cached prices first (deterministic + test-friendly)
    const cached = req.cachedPrices?.[req.adapter]?.[req.sku];
    if (cached) {
      const unit = cached.unit_price_usd;
      return {
        found: true, adapter: req.adapter, sku: req.sku,
        unit_price_usd: unit, total_price_usd: unit * qty, quantity: qty,
        lead_time_days: cached.lead_time_days ?? null,
        source: (cached.source as VendorPriceResult["source"]) ?? "cache",
      };
    }

    // No cache, no real API in MS0 — return unconfigured (R12 fail-loud)
    const envKey = envKeyFor(req.adapter);
    const hasKey = typeof process !== "undefined" && process.env && typeof process.env[envKey] === "string" && process.env[envKey]!.length > 0;
    if (!hasKey) {
      return {
        found: false, adapter: req.adapter, sku: req.sku,
        unit_price_usd: null, total_price_usd: null, quantity: qty, lead_time_days: null,
        source: "unconfigured",
        reason: `no-api-key:${envKey}; MS0 adapter-stubs only — provide cachedPrices or set the env-var`,
      };
    }

    // Key present but live-API call is out of MS0 scope — surface explicitly
    return {
      found: false, adapter: req.adapter, sku: req.sku,
      unit_price_usd: null, total_price_usd: null, quantity: qty, lead_time_days: null,
      source: "api",
      reason: `live-api-call-not-implemented-in-MS0:${envKey}-set-but-MS1-only`,
    };
  }

  /** Look up multiple SKUs in one call — caller batches the BOM. */
  lookupBatch(reqs: VendorPriceRequest[]): VendorPriceResult[] {
    return reqs.map((r) => this.lookupPrice(r));
  }
}

export const vendorRealtimePricingClientEngine = new VendorRealtimePricingClientEngine();
