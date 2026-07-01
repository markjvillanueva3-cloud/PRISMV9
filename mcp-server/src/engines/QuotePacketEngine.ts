/**
 * QuotePacketEngine -- the CUSTOMER-DELIVERABLE quote packet builder (MVP backend
 * gap #2: QUOTING-FRONTEND-MVP-PLAN 2026-06-22, screen S4 "download / email quote").
 *
 * It turns an already-customer-safe public quote (the output of
 * QuotingPublicQuoteEngine) into a structured packet object: header (id / date /
 * validity), a price line, the quantity-break ladder, lead-time tier options, the
 * DFM verdict, and a validity/terms block. The frontend (quebec) renders this
 * structured packet to PDF / HTML / email -- binary rendering + email SEND are out
 * of scope here (deferred per the MVP plan) so this engine stays pure + testable.
 *
 * SAFETY BOUNDARY (charlie soul: conservative; NEVER leak internal cost basis):
 *  - The engine consumes the PUBLIC shape (PublicQuoteResult /
 *    PublicInstantQuoteResult), NOT the raw internal InstantQuoteResult / FmvResult.
 *    QuotingPublicQuoteEngine has ALREADY stripped every internal field (cost
 *    breakdown, margin, gap-vs-charged, similar-part historical prices, recommended
 *    machine, physics-engine list) behind a total allow-list. Building the packet on
 *    its output makes a cost / margin leak STRUCTURALLY IMPOSSIBLE -- the packet can
 *    only ever contain fields that already crossed the customer boundary.
 *  - Identity fields (quote_id / date / valid_until) come from CALLER META, never
 *    from the public quote (those internal ids were stripped by the allow-list) --
 *    so the packet never resurrects an internal field through a back door.
 *  - FAIL-CLOSED: a not-quotable public input -> a packet with quotable:false + the
 *    public reason + NO price line / breaks / tiers. A customer never sees a
 *    fabricated $0 / partial quote.
 *  - The projection is itself a TOTAL allow-list: only the named safe fields are
 *    copied out of the public quote, so adding a field to the public shape can never
 *    silently leak it into a packet.
 *
 * Pure + side-effect-free (no fs / network); never throws.
 * Wired (same milestone): prism_quoting:quote_packet_generate.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-QUOTE-PACKET (slot:charlie, 2026-06-22)
 */

import type {
  PublicQuoteResult,
  PublicInstantQuoteResult,
  PublicQuantityBreak,
  PublicLeadTimeTier,
  PublicDfmVerdict,
} from "./QuotingPublicQuoteEngine.js";

/** Default packet validity window when the caller does not supply one. */
const DEFAULT_VALID_DAYS = 30;

/** Caller-supplied packet metadata (identity + presentation). All optional. */
export interface QuotePacketMeta {
  /** Customer-facing quote id (e.g. "Q-2026-0042"). Falls back to "PENDING". */
  quote_id?: string;
  /** Quote issue date (ISO yyyy-mm-dd). Caller supplies; engine never reads a clock. */
  date?: string;
  /** Validity window in days (positive int). Defaults to 30. */
  valid_until_days?: number;
  /** Explicit valid-until date (ISO). If set, takes precedence over valid_until_days. */
  valid_until?: string;
  /** Part name shown on the packet line. */
  part_name?: string;
  /** Customer reference (PO / RFQ id). Free-form, echoed verbatim. */
  customer_ref?: string;
  /** Quantity shown on the price line (the primary quoted qty). */
  quantity?: number;
}

/** The header block of a quote packet (identity + validity; no pricing). */
export interface QuotePacketHeader {
  quote_id: string;
  /** ISO date string from meta, or null when the caller supplied none. */
  date: string | null;
  /** ISO valid-until date from meta, else null (compute is the caller's job; we
   *  only echo what was supplied -- the engine never reads a clock). */
  valid_until: string | null;
  /** Validity window in days (echoed; defaults to 30). */
  valid_until_days: number;
  part_name: string | null;
  customer_ref: string | null;
  currency: "USD";
}

/** The headline price line of a packet (null fields when not quotable). */
export interface QuotePacketLine {
  quantity: number | null;
  unit_price_usd: number | null;
  total_price_usd: number | null;
  /** CI95 band, present only when the public quote carried one. */
  price_band_usd?: { low: number; high: number };
  /** Quote confidence 0-1, present only when the public quote carried one. */
  confidence?: number;
}

/** The full customer-deliverable quote packet. */
export interface QuotePacket {
  /** True iff a real, emittable price packet was produced. */
  quotable: boolean;
  /** Customer-safe reason category when not quotable (mirrors the public reason). */
  reason: string | null;
  header: QuotePacketHeader;
  line: QuotePacketLine;
  /** Quantity-break ladder (omitted when none / not quotable). */
  quantity_breaks?: PublicQuantityBreak[];
  /** Lead-time tier options (omitted when none). */
  lead_time_tiers?: PublicLeadTimeTier[];
  /** DFM manufacturability verdict (omitted when the public quote carried none). */
  dfm?: PublicDfmVerdict;
  /** Static customer-safe terms shown on every packet. */
  terms: string;
}

/** Customer-safe standing terms. Static text; carries no pricing internals. */
const PACKET_TERMS =
  "Quote valid for the stated period. Prices in USD and subject to final design " +
  "review. Lead times begin on receipt of approved order and payment terms.";

/** Type guard: does the public quote carry the richer instant-quote fields? */
function isInstant(
  pub: PublicQuoteResult | PublicInstantQuoteResult,
): pub is PublicInstantQuoteResult {
  return "unit_price_usd" in pub;
}

/** Normalize an optional positive-int validity window to the default. */
function resolveValidDays(raw: number | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  return DEFAULT_VALID_DAYS;
}

export class QuotePacketEngine {
  /**
   * Build a customer-deliverable quote packet from a customer-safe public quote.
   *
   * @param pub   the public quote (from QuotingPublicQuoteEngine -- already a total
   *              allow-list, so no internal cost / margin field can be present)
   * @param meta  caller-supplied identity + presentation metadata (all optional)
   * @returns     a structured QuotePacket; fail-closed (quotable:false, null price
   *              line) when the public quote is not quotable / malformed.
   */
  buildPacket(
    pub: PublicQuoteResult | PublicInstantQuoteResult | null | undefined,
    meta: QuotePacketMeta = {},
  ): QuotePacket {
    const validDays = resolveValidDays(meta.valid_until_days);
    const header: QuotePacketHeader = {
      quote_id: typeof meta.quote_id === "string" && meta.quote_id.length > 0 ? meta.quote_id : "PENDING",
      date: typeof meta.date === "string" && meta.date.length > 0 ? meta.date : null,
      valid_until: typeof meta.valid_until === "string" && meta.valid_until.length > 0 ? meta.valid_until : null,
      valid_until_days: validDays,
      part_name: typeof meta.part_name === "string" && meta.part_name.length > 0 ? meta.part_name : null,
      customer_ref: typeof meta.customer_ref === "string" && meta.customer_ref.length > 0 ? meta.customer_ref : null,
      currency: "USD",
    };

    const failClosed = (reason: string | null): QuotePacket => ({
      quotable: false,
      reason,
      header,
      line: { quantity: null, unit_price_usd: null, total_price_usd: null },
      terms: PACKET_TERMS,
    });

    // Fail-closed: missing / not-quotable public input -> no price line. The public
    // `reason` is ALREADY a sanitized customer-safe category, so it is safe to echo.
    if (!pub || typeof pub !== "object" || pub.quotable !== true) {
      return failClosed(pub && typeof pub === "object" ? (pub.reason ?? "quote-unavailable") : "quote-unavailable");
    }

    // Defense-in-depth: a quotable public quote should carry a finite positive
    // total. If somehow it does not, fail closed rather than emit a degenerate line.
    const total = pub.quote_usd;
    if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) {
      return failClosed("quote-unavailable");
    }

    // Quantity: prefer the caller-stated primary quantity, else null (the public
    // base shape carries no quantity; the instant shape's qty lives in the breaks).
    const quantity =
      typeof meta.quantity === "number" && Number.isFinite(meta.quantity) && meta.quantity > 0
        ? Math.floor(meta.quantity)
        : null;

    const line: QuotePacketLine = {
      quantity,
      unit_price_usd: null,
      total_price_usd: total,
    };

    const packet: QuotePacket = {
      quotable: true,
      reason: null,
      header,
      line,
      terms: PACKET_TERMS,
    };

    // Lead-time tiers are present on both public shapes (already sanitized).
    // Shallow-COPY the array + each row so a consumer mutating the packet can never
    // mutate the caller's public quote (defensive isolation; the rows are flat).
    if (Array.isArray(pub.lead_time_tiers) && pub.lead_time_tiers.length > 0) {
      packet.lead_time_tiers = pub.lead_time_tiers.map((t) => ({ ...t }));
    }

    // Richer fields only exist on the instant-quote projection.
    if (isInstant(pub)) {
      // unit price (already a customer-safe number when present)
      if (typeof pub.unit_price_usd === "number" && Number.isFinite(pub.unit_price_usd) && pub.unit_price_usd > 0) {
        line.unit_price_usd = pub.unit_price_usd;
      }
      // Copy (not alias) the nested objects/arrays so the packet is isolated.
      if (pub.price_band_usd) {
        line.price_band_usd = { ...pub.price_band_usd };
      }
      if (typeof pub.confidence === "number" && Number.isFinite(pub.confidence)) {
        line.confidence = pub.confidence;
      }
      if (Array.isArray(pub.quantity_breaks) && pub.quantity_breaks.length > 0) {
        packet.quantity_breaks = pub.quantity_breaks.map((b) => ({ ...b }));
      }
      if (pub.dfm) {
        packet.dfm = { ...pub.dfm };
      }
    }

    return packet;
  }
}

export const quotePacketEngine = new QuotePacketEngine();
