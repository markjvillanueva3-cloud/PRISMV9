/**
 * QuotePacketEngine.test -- pins the CUSTOMER-DELIVERABLE quote packet builder
 * (MVP backend gap #2, QUOTING-SYNERGY-MS0/U-QP-QUOTE-PACKET).
 *
 * Load-bearing properties:
 *  (A) TOTAL ALLOW-LIST: the packet may carry ONLY fields that already crossed the
 *      customer boundary on the public quote (quote_usd / unit_price_usd / band /
 *      confidence / quantity_breaks / lead_time_tiers / dfm) + caller meta. An
 *      internal field (cost_breakdown / margin / gap_pct / similar_parts / machine /
 *      physics list) must NEVER appear -- tests fail loud on that by value.
 *  (B) FAIL-CLOSED: a not-quotable / null / malformed public input -> a packet with
 *      quotable:false + the public reason + a null price line (never a fabricated $).
 *  (C) META ISOLATION: caller meta is read field-by-field, so a junk meta key can
 *      never surface in the packet output.
 *  (D) PURITY: building a packet never mutates the input public quote.
 *
 * Lives in src/__tests__/ (the vitest include dir + the stop_on_unwired_assets scan
 * dir) so it is discovered by the default suite, not just by explicit path.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-QUOTE-PACKET (slot:charlie)
 */

import { describe, it, expect } from "vitest";
import type {
  PublicQuoteResult,
  PublicInstantQuoteResult,
} from "../engines/QuotingPublicQuoteEngine.js";
import {
  quotePacketEngine,
  type QuotePacket,
  type QuotePacketMeta,
} from "../engines/QuotePacketEngine.js";

// A fully-populated customer-safe instant public quote. Crucially, this is the
// PUBLIC shape -- it already contains NO internal fields. To prove the packet
// cannot resurrect one, we deliberately tack internal-looking junk onto the object
// via `as any` and assert it never appears in the packet (the engine reads only the
// named allow-list fields, so the junk is structurally unreachable).
function publicInstant(over: Partial<PublicInstantQuoteResult> = {}): PublicInstantQuoteResult {
  return {
    quotable: true,
    quote_usd: 885.0,
    unit_price_usd: 88.5,
    currency: "USD",
    reason: null,
    price_band_usd: { low: 75.0, high: 102.0 },
    confidence: 0.84,
    quantity_breaks: [
      { quantity: 1, unit_price_usd: 120, total_price_usd: 120, savings_pct: 0, lead_time_days: 10 },
      { quantity: 10, unit_price_usd: 88.5, total_price_usd: 885, savings_pct: 0.2625, lead_time_days: 10 },
    ],
    lead_time_tiers: [
      { tier: "standard", business_days: 10, price_usd: 885 },
      { tier: "expedite", business_days: 6, price_usd: 1195 },
    ],
    dfm: { manufacturable: true, rating: "good", blocking_issue_count: 0 },
    ...over,
  };
}

// Internal-only values/keys that must NEVER appear in a packet. If the engine ever
// reached past the public allow-list, one of these would surface.
const INTERNAL_SENTINELS = [
  "cost_breakdown", "machine_rate_hr", 95.5, "margin_usd", 200.0, "gap_pct", 0.1224,
  "similar_parts", "historical_price", 91.4, "recommended_machine", "INTERNAL_MACHINE",
  "physics_engines_used", "INTERNAL_ENGINE", "total_cost_per_part", 70.0, "verdict",
];

function assertNoLeak(packet: object): void {
  const blob = JSON.stringify(packet);
  for (const s of INTERNAL_SENTINELS) {
    expect(blob).not.toContain(String(s));
  }
}

const META: QuotePacketMeta = {
  quote_id: "Q-2026-0042",
  date: "2026-06-22",
  valid_until: "2026-07-22",
  valid_until_days: 30,
  part_name: "bracket",
  customer_ref: "PO-9981",
  quantity: 10,
};

// ============================================================================
// Happy path -- instant public quote -> full packet
// ============================================================================

describe("QuotePacketEngine.buildPacket -- happy path (instant public quote)", () => {
  it("builds a full packet: header + price line + breaks + tiers + dfm; no leak", () => {
    // Annotate the result with the public type so the `QuotePacket` import is used
    // naturally (no lint anchor needed) AND the emitted shape is type-checked.
    const packet: QuotePacket = quotePacketEngine.buildPacket(publicInstant(), META);

    expect(packet.quotable).toBe(true);
    expect(packet.reason).toBe(null);

    // Header from meta (identity NEVER comes from the public quote).
    expect(packet.header).toEqual({
      quote_id: "Q-2026-0042",
      date: "2026-06-22",
      valid_until: "2026-07-22",
      valid_until_days: 30,
      part_name: "bracket",
      customer_ref: "PO-9981",
      currency: "USD",
    });

    // Price line carries the customer-safe price + band + confidence.
    expect(packet.line.quantity).toBe(10);
    expect(packet.line.total_price_usd).toBe(885.0);
    expect(packet.line.unit_price_usd).toBe(88.5);
    expect(packet.line.price_band_usd).toEqual({ low: 75.0, high: 102.0 });
    expect(packet.line.confidence).toBeCloseTo(0.84, 5);

    expect(packet.quantity_breaks).toHaveLength(2);
    expect(packet.quantity_breaks![1]).toEqual({
      quantity: 10, unit_price_usd: 88.5, total_price_usd: 885, savings_pct: 0.2625, lead_time_days: 10,
    });
    expect(packet.lead_time_tiers).toHaveLength(2);
    expect(packet.lead_time_tiers![0]).toEqual({ tier: "standard", business_days: 10, price_usd: 885 });
    expect(packet.dfm).toEqual({ manufacturable: true, rating: "good", blocking_issue_count: 0 });
    expect(typeof packet.terms).toBe("string");
    expect(packet.terms.length).toBeGreaterThan(0);

    assertNoLeak(packet);
  });

  it("exact top-level key set -- only the safe packet keys are emitted", () => {
    const packet = quotePacketEngine.buildPacket(publicInstant(), META);
    expect(Object.keys(packet).sort()).toEqual(
      ["dfm", "header", "lead_time_tiers", "line", "quantity_breaks", "quotable", "reason", "terms"].sort(),
    );
  });

  it("builds from a BASE public quote (no instant fields) -> total only, no breaks/dfm", () => {
    const base: PublicQuoteResult = {
      quotable: true, quote_usd: 500, currency: "USD", reason: null,
      lead_time_tiers: [{ tier: "economy", business_days: 20, price_usd: 500 }],
    };
    const packet = quotePacketEngine.buildPacket(base, { quote_id: "Q-1" });
    expect(packet.quotable).toBe(true);
    expect(packet.line.total_price_usd).toBe(500);
    expect(packet.line.unit_price_usd).toBe(null); // base shape has no unit price
    expect(packet.lead_time_tiers).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(packet, "quantity_breaks")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(packet, "dfm")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(packet.line, "confidence")).toBe(false);
  });
});

// ============================================================================
// Fail-closed (>=3 failure modes)
// ============================================================================

describe("QuotePacketEngine.buildPacket -- fail-closed", () => {
  it("not-quotable public input -> quotable:false, reason echoed, null price line", () => {
    const packet = quotePacketEngine.buildPacket(
      { quotable: false, quote_usd: null, currency: "USD", reason: "dfm-revision-required" },
      META,
    );
    expect(packet.quotable).toBe(false);
    expect(packet.reason).toBe("dfm-revision-required"); // already a safe category
    expect(packet.line).toEqual({ quantity: null, unit_price_usd: null, total_price_usd: null });
    expect(Object.prototype.hasOwnProperty.call(packet, "quantity_breaks")).toBe(false);
    // Header is still populated from meta even on a fail-closed packet.
    expect(packet.header.quote_id).toBe("Q-2026-0042");
  });

  it("null / undefined public input -> quotable:false, generic reason", () => {
    for (const bad of [null, undefined]) {
      const packet = quotePacketEngine.buildPacket(bad, META);
      expect(packet.quotable).toBe(false);
      expect(packet.reason).toBe("quote-unavailable");
      expect(packet.line.total_price_usd).toBe(null);
    }
  });

  it("quotable:true but non-positive quote_usd -> fail-closed (no fabricated $0)", () => {
    const packet = quotePacketEngine.buildPacket(publicInstant({ quote_usd: 0 }), META);
    expect(packet.quotable).toBe(false);
    expect(packet.reason).toBe("quote-unavailable");
    expect(packet.line.total_price_usd).toBe(null);
  });
});

// ============================================================================
// Adversarial inputs (>=2)
// ============================================================================

describe("QuotePacketEngine.buildPacket -- adversarial", () => {
  it("NaN/Infinity/negative total -> fail-closed, never throws, no leak", () => {
    for (const bad of [NaN, Infinity, -Infinity, -50]) {
      const packet = quotePacketEngine.buildPacket(publicInstant({ quote_usd: bad }), META);
      expect(packet.quotable).toBe(false);
      expect(packet.line.total_price_usd).toBe(null);
      assertNoLeak(packet);
    }
  });

  it("non-object public inputs ([], primitive) -> fail-closed, never throws", () => {
    for (const bad of [[], 42, "str", true] as unknown[]) {
      const packet = quotePacketEngine.buildPacket(bad as PublicQuoteResult, META);
      expect(packet.quotable).toBe(false);
      expect(packet.reason).toBe("quote-unavailable");
      expect(packet.line.total_price_usd).toBe(null);
    }
  });

  it("a junk meta key is NOT surfaced in the packet (meta read field-by-field)", () => {
    const packet = quotePacketEngine.buildPacket(
      publicInstant(),
      { quote_id: "Q-9", internal_margin_pct: 0.42, secret_cost: 999 } as unknown as QuotePacketMeta,
    );
    const blob = JSON.stringify(packet);
    expect(blob).not.toContain("internal_margin_pct");
    expect(blob).not.toContain("secret_cost");
    expect(blob).not.toContain("0.42");
    expect(blob).not.toContain("999");
  });

  it("an internal-looking field tacked onto the PUBLIC quote is never copied out", () => {
    const poisoned = publicInstant() as unknown as Record<string, unknown>;
    poisoned.cost_breakdown = { machine_rate_hr: 95.5, total_cost_per_part: 70.0 };
    poisoned.margin_usd = 200.0;
    poisoned.similar_parts = [{ historical_price: 91.4 }];
    poisoned.recommended_machine = "INTERNAL_MACHINE_HAAS";
    const packet = quotePacketEngine.buildPacket(poisoned as unknown as PublicInstantQuoteResult, META);
    expect(packet.quotable).toBe(true); // still a valid quote
    assertNoLeak(packet); // but none of the poisoned internals leak
  });
});

// ============================================================================
// Meta defaults + purity
// ============================================================================

describe("QuotePacketEngine.buildPacket -- meta defaults + purity", () => {
  it("missing meta -> sane defaults (PENDING id, null dates, default 30-day validity)", () => {
    const packet = quotePacketEngine.buildPacket(publicInstant());
    expect(packet.header.quote_id).toBe("PENDING");
    expect(packet.header.date).toBe(null);
    expect(packet.header.valid_until).toBe(null);
    expect(packet.header.valid_until_days).toBe(30);
    expect(packet.header.part_name).toBe(null);
    expect(packet.line.quantity).toBe(null); // no meta.quantity
  });

  it("non-positive / non-finite valid_until_days falls back to the 30-day default", () => {
    for (const bad of [0, -5, NaN, Infinity]) {
      const packet = quotePacketEngine.buildPacket(publicInstant(), { valid_until_days: bad });
      expect(packet.header.valid_until_days).toBe(30);
    }
  });

  it("building a packet does NOT mutate the input public quote (purity)", () => {
    const input = publicInstant();
    const snapshot = JSON.stringify(input);
    const packet = quotePacketEngine.buildPacket(input, META);
    expect(JSON.stringify(input)).toBe(snapshot); // input untouched
    // And the packet's nested objects are COPIES, not aliases of the input's.
    expect(packet.lead_time_tiers).not.toBe(input.lead_time_tiers);
    expect(packet.quantity_breaks).not.toBe(input.quantity_breaks);
    expect(packet.dfm).not.toBe(input.dfm);
    expect(packet.line.price_band_usd).not.toBe(input.price_band_usd);
    // Mutating the packet must not reach back into the input.
    (packet.lead_time_tiers as Array<{ price_usd: number }>)[0].price_usd = -1;
    expect(input.lead_time_tiers![0].price_usd).toBe(885);
  });
});
