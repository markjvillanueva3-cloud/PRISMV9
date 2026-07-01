/**
 * QuotingPublicQuoteEngine -- the CUSTOMER-SAFE boundary over the internal FMV
 * estimate. This is MVP backend contract gap #1 (QUOTING-FRONTEND-MVP-PLAN
 * 2026-06-22): the public web quote flow (upload -> instant quote) must NEVER
 * leak internal pricing internals -- cost breakdown, margin, raw machine rate /
 * material spend, the gap-vs-charged reconciliation signal, or any $/in3 basis.
 *
 * The customer sees ONLY: a single quote price (which already carries the target
 * margin by construction in FmvResult.fmv_usd), a currency, a validity flag, and
 * (optionally) lead-time tiers passed through from quoting_lead_time_tiers.
 *
 * Safety boundary (charlie soul: conservative; never leak internal cost basis):
 *  - REFUSE to emit a price when the underlying FMV is invalid (ok:false) -- a
 *    customer must never see a $0 / fabricated quote. Returns quotable:false +
 *    a SANITIZED reason (the raw FmvResult.reason can name internal fields, so it
 *    is mapped to a customer-safe category, never echoed verbatim).
 *  - REFUSE to emit a non-finite or non-positive price (defense-in-depth even if
 *    ok:true) -- fail-closed, never a degenerate public quote.
 *  - The projection is a TOTAL allow-list: only the named safe fields are copied
 *    out; adding a field to FmvResult can never silently leak it.
 *
 * Pure + side-effect-free; never throws. Wired: prism_quoting:quoting_public_quote.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-PUBLIC-QUOTE (slot:charlie, 2026-06-22)
 */

import type { FmvResult } from "./FairMarketValueEngine.js";
import type { InstantQuoteResult } from "./InstantQuoteEngine.js";

/** A customer-safe quantity-break row (no internal cost fields). */
export interface PublicQuantityBreak {
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  /** Savings vs qty=1 as a fraction (0-1), rounded; safe (no cost basis). */
  savings_pct: number;
  lead_time_days: number;
}

/** Customer-safe DFM verdict -- the manufacturability gate, NO internal physics_basis / cost_impact. */
export interface PublicDfmVerdict {
  /** True iff the part is manufacturable enough to emit a price (gate result). */
  manufacturable: boolean;
  /** Coarse public band; never the raw 0-100 internal score. */
  rating: "excellent" | "good" | "marginal" | "difficult";
  /** Count of blocking (critical) DFM issues -- a number, never the internal messages. */
  blocking_issue_count: number;
}

/** A lead-time option as the customer sees it (no internal cost fields). */
export interface PublicLeadTimeTier {
  tier: string; // e.g. "economy" | "standard" | "expedite"
  business_days: number;
  price_usd: number;
}

/** The ONLY shape that crosses the customer boundary. No cost breakdown, no margin. */
export interface PublicQuoteResult {
  /** True iff a real, emittable price was produced. */
  quotable: boolean;
  /** The customer-facing quote price (USD), margin already included. null when not quotable. */
  quote_usd: number | null;
  currency: "USD";
  /** Customer-safe reason category when not quotable (never an internal field name). */
  reason: string | null;
  /** Optional lead-time options, sanitized to {tier,business_days,price_usd}. */
  lead_time_tiers?: PublicLeadTimeTier[];
}

/**
 * The richer customer-safe quote emitted from a full InstantQuoteResult (S1/S2
 * upload->instant-quote flow). Adds unit price, a confidence band, quantity
 * breaks, and the DFM verdict on top of the base safe quote. Still a TOTAL
 * allow-list: cost_breakdown / similar_parts / recommended_machine /
 * physics_engines_used / internal warnings are NEVER copied out.
 */
export interface PublicInstantQuoteResult extends PublicQuoteResult {
  /** Per-unit customer price (USD); null when not quotable. */
  unit_price_usd: number | null;
  /** Customer-safe CI95 band on the unit price; omitted when not quotable. */
  price_band_usd?: { low: number; high: number };
  /** Quote confidence as a fraction 0-1 (never the internal 0-100 + factor strings). */
  confidence?: number;
  /** Quantity-break ladder, sanitized. */
  quantity_breaks?: PublicQuantityBreak[];
  /** DFM manufacturability verdict (the gate result), no internal issue detail. */
  dfm?: PublicDfmVerdict;
}

/**
 * Map a raw (possibly internal-field-naming) FMV reason to a customer-safe
 * category. We NEVER echo FmvResult.reason verbatim -- it can name internal
 * inputs (e.g. "missing-required:time_in_cut_s+machine_rate+material_spend").
 */
export function sanitizePublicReason(rawReason: string | undefined | null): string {
  const r = String(rawReason ?? "").toLowerCase();
  if (!r) return "quote-unavailable";
  if (r.includes("missing-required")) return "insufficient-part-data";
  if (r.includes("invalid-time")) return "insufficient-part-data";
  if (r.includes("invalid-machine_rate")) return "quote-unavailable";
  if (r.includes("invalid-material")) return "insufficient-part-data";
  // Any other internal reason collapses to the generic safe category -- never leak it.
  return "quote-unavailable";
}

/** Project raw lead-time tier objects to the customer-safe allow-list shape. */
function sanitizeLeadTiers(raw: unknown): PublicLeadTimeTier[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PublicLeadTimeTier[] = [];
  for (const t of raw) {
    if (t == null || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    const tier = typeof o.tier === "string" ? o.tier : typeof o.name === "string" ? o.name : null;
    const days = typeof o.business_days === "number" ? o.business_days
      : typeof o.lead_days === "number" ? o.lead_days
      : typeof o.days === "number" ? o.days : null;
    const price = typeof o.price_usd === "number" ? o.price_usd
      : typeof o.price === "number" ? o.price
      : typeof o.total_price === "number" ? o.total_price
      : typeof o.unit_price === "number" ? o.unit_price : null;
    if (tier == null || days == null || price == null) continue;
    // Reject non-finite, negative days (nonsensical lead time), or negative price.
    if (!Number.isFinite(days) || days < 0 || !Number.isFinite(price) || price < 0) continue;
    // `+ 0` normalizes a -0 price to 0 (cosmetic; never emit "-0" to a customer).
    out.push({ tier, business_days: days, price_usd: price + 0 });
  }
  return out.length ? out : undefined;
}

export class QuotingPublicQuoteEngine {
  /**
   * Project an internal FmvResult to the customer-safe public quote shape.
   * @param fmv         the internal FMV estimate (from FairMarketValueEngine)
   * @param leadTiers   optional raw lead-time tiers (from quoting_lead_time_tiers)
   */
  toPublicQuote(fmv: FmvResult | null | undefined, leadTiers?: unknown): PublicQuoteResult {
    const base: PublicQuoteResult = { quotable: false, quote_usd: null, currency: "USD", reason: null };
    // Lead-time tiers are sanitized independently of `quotable` -- a customer may
    // see lead options even on a not-yet-quotable part (benign: each tier is itself
    // a strict {tier,business_days,price_usd} allow-list, so this is not a leak).
    const lead = sanitizeLeadTiers(leadTiers);
    if (lead) base.lead_time_tiers = lead;

    // Fail-closed: no FMV, or an unsuccessful estimate -> not quotable, sanitized reason.
    if (!fmv || fmv.ok !== true) {
      return { ...base, reason: sanitizePublicReason(fmv?.reason) };
    }
    const price = fmv.fmv_usd;
    // Defense-in-depth: even on ok:true, refuse a non-finite / non-positive price.
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return { ...base, reason: "quote-unavailable" };
    }
    // Emit ONLY the safe fields. The internal `components`/`gap_pct`/`verdict`/
    // `charged_usd` are NEVER copied -- this is a total allow-list projection.
    return { ...base, quotable: true, quote_usd: price, reason: null };
  }

  /**
   * Project a full internal InstantQuoteResult to the customer-safe public shape.
   * This is the S1/S2 keystone (upload -> instant quote). It does TWO jobs:
   *
   *  1. TOTAL allow-list projection -- emits ONLY {quotable, quote_usd,
   *     unit_price_usd, currency, reason, price_band_usd?, confidence?,
   *     quantity_breaks?, lead_time_tiers?, dfm?}. The internal cost_breakdown
   *     (machine_rate_hr, programming.hours, overhead.rate_pct, ...),
   *     similar_parts (historical_price), recommended_machine,
   *     physics_engines_used, and internal warnings are NEVER copied out.
   *
   *  2. DFM HARD-GATE (the public-path manufacturability gate): a "difficult"
   *     manufacturability rating OR any critical DFM issue BLOCKS price emission
   *     -> {quotable:false, quote_usd:null, reason:"dfm-revision-required"}.
   *     Matches the Fictiv/Protolabs pattern (a DFM failure must be revised
   *     before a binding price is shown). The DFM verdict (manufacturable flag +
   *     coarse rating + blocking-issue COUNT) is still surfaced so the customer
   *     sees WHY it was gated -- but never the internal issue messages.
   *
   * Pure + side-effect-free; never throws.
   */
  toPublicQuoteFromInstant(result: InstantQuoteResult | null | undefined): PublicInstantQuoteResult {
    const base: PublicInstantQuoteResult = {
      quotable: false, quote_usd: null, unit_price_usd: null, currency: "USD", reason: null,
    };

    if (!result || typeof result !== "object") {
      return { ...base, reason: "quote-unavailable" };
    }

    // Lead tiers + qty breaks + DFM verdict are surfaced regardless of `quotable`
    // (each is itself a strict allow-list, so this is informative, never a leak).
    const lead = sanitizeLeadTiers(result.lead_time_options);
    if (lead) base.lead_time_tiers = lead;
    const breaks = sanitizeQuantityBreaks(result.quantity_breaks);
    if (breaks) base.quantity_breaks = breaks;
    const dfm = sanitizeDfm(result.dfm);
    if (dfm) base.dfm = dfm;

    // DFM HARD-GATE: a non-manufacturable part blocks the binding price.
    if (dfm && dfm.manufacturable === false) {
      return { ...base, reason: "dfm-revision-required" };
    }

    // Defense-in-depth: refuse a non-finite / non-positive total or unit price.
    const total = result.total_price;
    const unit = result.unit_price;
    const okNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
    if (!okNum(total) || !okNum(unit)) {
      return { ...base, reason: "quote-unavailable" };
    }

    // Customer-safe CI95 band (only when both bounds are finite + ordered + positive).
    if (okNum(result.ci95_low) && okNum(result.ci95_high) && result.ci95_high >= result.ci95_low) {
      base.price_band_usd = { low: result.ci95_low + 0, high: result.ci95_high + 0 };
    }
    // Internal confidence is 0-100; expose as a clamped 0-1 fraction.
    if (typeof result.confidence === "number" && Number.isFinite(result.confidence)) {
      base.confidence = Math.max(0, Math.min(1, result.confidence / 100));
    }

    return { ...base, quotable: true, quote_usd: total + 0, unit_price_usd: unit + 0, reason: null };
  }
}

/** Project internal quantity breaks to the customer-safe allow-list shape. */
function sanitizeQuantityBreaks(raw: unknown): PublicQuantityBreak[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PublicQuantityBreak[] = [];
  for (const b of raw) {
    if (b == null || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const qty = o.quantity, unit = o.unit_price, total = o.total_price,
      sav = o.savings_pct, lead = o.lead_time_days;
    const fin = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
    if (!fin(qty) || qty <= 0 || !fin(unit) || unit < 0 || !fin(total) || total < 0) continue;
    out.push({
      quantity: qty,
      unit_price_usd: unit + 0,
      total_price_usd: total + 0,
      savings_pct: fin(sav) && sav >= 0 ? sav : 0,
      lead_time_days: fin(lead) && lead >= 0 ? lead : 0,
    });
  }
  return out.length ? out : undefined;
}

/**
 * Project the internal DFM block to the customer-safe verdict. The gate is:
 * manufacturable === false iff rating is "difficult" OR there is >=1 critical
 * issue. We emit the manufacturable flag + coarse rating + a COUNT of blocking
 * issues -- never the internal issue messages / physics_basis / cost_impact.
 */
function sanitizeDfm(raw: unknown): PublicDfmVerdict | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const rating = o.manufacturability;
  const validRatings = ["excellent", "good", "marginal", "difficult"] as const;
  const r = (validRatings as readonly string[]).includes(rating as string)
    ? (rating as PublicDfmVerdict["rating"])
    : "marginal";
  const issues = Array.isArray(o.issues) ? o.issues : [];
  const blocking = issues.filter(
    (i) => i != null && typeof i === "object" && (i as Record<string, unknown>).severity === "critical",
  ).length;
  const manufacturable = r !== "difficult" && blocking === 0;
  return { manufacturable, rating: r, blocking_issue_count: blocking };
}

export const quotingPublicQuoteEngine = new QuotingPublicQuoteEngine();
