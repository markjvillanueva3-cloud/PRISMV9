/**
 * QuotingPublicQuoteEngine.test -- pins the CUSTOMER-SAFE boundary (MVP gap #1 + #4).
 *
 * Two load-bearing properties:
 *  (A) An internal FmvResult / InstantQuoteResult (which carry cost breakdown,
 *      margin, gap-vs-charged, verdict, similar-part historical prices, recommended
 *      machine, physics-engine list) must project to a public shape that leaks NONE
 *      of those. A regression that copied an internal field out would be a real
 *      customer data leak -- these tests fail loud on that by asserting the exact
 *      emitted field set AND that no internal sentinel value appears in the output.
 *  (B) DFM HARD-GATE: a non-manufacturable part must BLOCK price emission
 *      (quotable:false, reason:"dfm-revision-required") -- the public-path
 *      manufacturability gate (Fictiv/Protolabs pattern).
 *
 * Lives in src/__tests__/ (the vitest include dir + the stop_on_unwired_assets
 * scan dir) so it is discovered by the default suite, not just by explicit path.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-PUBLIC-QUOTE + U-QP-PUBLIC-INSTANT (slot:charlie)
 */

import { describe, it, expect } from "vitest";
import type { FmvResult } from "../engines/FairMarketValueEngine.js";
import type { InstantQuoteResult } from "../engines/InstantQuoteEngine.js";
import {
  quotingPublicQuoteEngine,
  sanitizePublicReason,
  type PublicQuoteResult,
} from "../engines/QuotingPublicQuoteEngine.js";

// ============================================================================
// Part 1 -- toPublicQuote (FmvResult projection)
// ============================================================================

// A fully-populated internal FMV result -- every internal field set to a
// recognizable sentinel so a leak is detectable by value.
function internalFmv(over: Partial<FmvResult> = {}): FmvResult {
  return {
    ok: true,
    fmv_usd: 1234.56,
    components: {
      machine_time_usd: 700.11,         // INTERNAL -- must never appear
      material_passthrough_usd: 200.22, // INTERNAL
      overhead_usd: 134.23,             // INTERNAL
      margin_usd: 200.0,                // INTERNAL -- margin is the most sensitive leak
    },
    charged_usd: 1100.0,                // INTERNAL reconciliation field
    gap_pct: 0.1224,                    // INTERNAL "how off were we" signal
    verdict: "under-charged",           // INTERNAL
    ...over,
  };
}

const INTERNAL_SENTINELS = [
  700.11, 200.22, 134.23, 200.0, 1100.0, 0.1224, "under-charged",
  "machine_time_usd", "material_passthrough_usd", "overhead_usd", "margin_usd",
  "charged_usd", "gap_pct", "verdict", "components",
];

function assertNoLeak(pub: object): void {
  const blob = JSON.stringify(pub);
  for (const s of INTERNAL_SENTINELS) {
    expect(blob).not.toContain(String(s));
  }
}

describe("QuotingPublicQuoteEngine.toPublicQuote -- happy path", () => {
  it("emits ONLY the customer-safe price; no internal field leaks", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv());
    expect(pub.quotable).toBe(true);
    expect(pub.quote_usd).toBe(1234.56); // the margin-inclusive fmv_usd, verbatim
    expect(pub.currency).toBe("USD");
    expect(pub.reason).toBe(null);
    expect(Object.keys(pub).sort()).toEqual(["currency", "quotable", "quote_usd", "reason"]);
    assertNoLeak(pub);
  });
});

describe("QuotingPublicQuoteEngine.toPublicQuote -- fail-closed (>=3 failure modes)", () => {
  it("ok:false -> not quotable, sanitized reason (raw internal reason NEVER echoed)", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(
      internalFmv({ ok: false, reason: "missing-required:time_in_cut_s+machine_rate+material_spend", fmv_usd: 0 }),
    );
    expect(pub.quotable).toBe(false);
    expect(pub.quote_usd).toBe(null);
    expect(pub.reason).toBe("insufficient-part-data");
    expect(JSON.stringify(pub)).not.toContain("time_in_cut_s");
    assertNoLeak(pub);
  });

  it("null FMV -> not quotable, generic safe reason", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(null);
    expect(pub.quotable).toBe(false);
    expect(pub.quote_usd).toBe(null);
    expect(pub.reason).toBe("quote-unavailable");
  });

  it("ok:true but non-positive price -> fail-closed (no degenerate $0 public quote)", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv({ ok: true, fmv_usd: 0 }));
    expect(pub.quotable).toBe(false);
    expect(pub.quote_usd).toBe(null);
    expect(pub.reason).toBe("quote-unavailable");
  });
});

describe("QuotingPublicQuoteEngine.toPublicQuote -- adversarial inputs (>=2)", () => {
  it("ok:true but NaN/Infinity/negative price -> fail-closed, no leak", () => {
    for (const bad of [NaN, Infinity, -Infinity, -50]) {
      const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv({ fmv_usd: bad }));
      expect(pub.quotable).toBe(false);
      expect(pub.quote_usd).toBe(null);
      expect(pub.reason).toBe("quote-unavailable");
      assertNoLeak(pub);
    }
  });

  it("undefined fmv -> safe default with exact field set + values", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(undefined);
    expect(pub).toEqual({ quotable: false, quote_usd: null, currency: "USD", reason: "quote-unavailable" });
  });
});

describe("QuotingPublicQuoteEngine -- lead-time tier sanitization", () => {
  it("projects raw tiers to {tier,business_days,price_usd} allow-list", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv(), [
      { tier: "economy", business_days: 15, price_usd: 1000, internal_cost: 800 },
      { name: "standard", lead_days: 10, price: 1234.56 },
      { tier: "expedite", days: 3, price_usd: 1500 },
    ]);
    expect(pub.lead_time_tiers).toHaveLength(3);
    expect(pub.lead_time_tiers![0]).toEqual({ tier: "economy", business_days: 15, price_usd: 1000 });
    expect(pub.lead_time_tiers![1]).toEqual({ tier: "standard", business_days: 10, price_usd: 1234.56 });
    expect(JSON.stringify(pub.lead_time_tiers)).not.toContain("internal_cost");
    expect(JSON.stringify(pub.lead_time_tiers)).not.toContain("800");
  });

  it("drops malformed/negative-price/negative-days tiers; lead_time_tiers key omitted when none valid", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv(), [
      { tier: "bad", business_days: "x", price_usd: 100 },
      { tier: "neg", business_days: 5, price_usd: -10 },
      { tier: "negdays", business_days: -5, price_usd: 100 },
      { tier: "inf", business_days: Infinity, price_usd: 100 },
      null,
      "notanobject",
    ]);
    expect(Object.keys(pub).sort()).toEqual(["currency", "quotable", "quote_usd", "reason"]);
    expect(Object.prototype.hasOwnProperty.call(pub, "lead_time_tiers")).toBe(false);
  });

  it("normalizes a -0 price to 0 (never emits negative-zero to a customer)", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv(), [
      { tier: "free-setup", business_days: 0, price_usd: -0 },
    ]);
    expect(pub.lead_time_tiers).toEqual([{ tier: "free-setup", business_days: 0, price_usd: 0 }]);
    expect(Object.is(pub.lead_time_tiers![0].price_usd, -0)).toBe(false);
  });

  it("non-array lead tiers -> key omitted, still quotable", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuote(internalFmv(), "not-an-array");
    expect(pub.quotable).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(pub, "lead_time_tiers")).toBe(false);
  });
});

describe("sanitizePublicReason -- maps internal reasons to safe categories", () => {
  it("maps known internal reasons and never echoes internal field names", () => {
    expect(sanitizePublicReason("missing-required:time_in_cut_s+machine_rate+material_spend")).toBe("insufficient-part-data");
    expect(sanitizePublicReason("invalid-time_in_cut_s")).toBe("insufficient-part-data");
    expect(sanitizePublicReason("invalid-machine_rate")).toBe("quote-unavailable");
    expect(sanitizePublicReason("invalid-material_spend")).toBe("insufficient-part-data");
    expect(sanitizePublicReason("some-unexpected-internal-detail")).toBe("quote-unavailable");
    expect(sanitizePublicReason(undefined)).toBe("quote-unavailable");
    expect(sanitizePublicReason("")).toBe("quote-unavailable");
  });
});

// ============================================================================
// Part 2 -- toPublicQuoteFromInstant (InstantQuoteResult projection + DFM gate)
// ============================================================================

// Fully-populated internal InstantQuoteResult with internal sentinels seeded
// into every must-not-leak field (cost_breakdown, similar_parts, machine, etc.).
function internalInstant(over: Partial<InstantQuoteResult> = {}): InstantQuoteResult {
  return {
    quote_id: "Q-123",
    part_name: "bracket",
    quantity: 10,
    date: "2026-06-22",
    valid_until: "2026-07-22",
    unit_price: 88.5,
    total_price: 885.0,
    ci95_low: 75.0,
    ci95_high: 102.0,
    confidence: 84, // 0-100 internal
    quantity_breaks: [
      { quantity: 1, unit_price: 120, total_price: 120, savings_pct: 0, lead_time_days: 10 },
      { quantity: 10, unit_price: 88.5, total_price: 885, savings_pct: 0.2625, lead_time_days: 10 },
    ],
    lead_time_options: [
      { tier: "standard", days: 10, multiplier: 1.0, unit_price: 88.5, total_price: 885 },
      { tier: "expedited", days: 6, multiplier: 1.35, unit_price: 119.5, total_price: 1195 },
    ],
    dfm: {
      score: 82, // INTERNAL raw score -- must not leak
      manufacturability: "good",
      issues: [
        { severity: "info", category: "thin-wall", message: "INTERNAL_DETAIL_wall", recommendation: "INTERNAL_REC" },
      ],
    },
    cost_breakdown: {
      material: { raw_cost: 30.7, scrap_pct: 0.1, total: 33.8 },
      machining: { cycle_time_min: 12.3, machine_rate_hr: 95.5, total: 19.6 },
      setup: { num_setups: 1, setup_minutes: 30, total: 47.75 },
      tooling: { tool_count: 4, amortization_per_part: 2.1, total: 2.1 },
      programming: { hours: 1.5, total: 14.32 },
      inspection: { level: "standard", total: 5.0 },
      secondary_ops: { operations: [{ type: "anodize", per_part: 4.0 }], total: 4.0 },
      overhead: { rate_pct: 0.18, total: 13.5 },
      total_cost_per_part: 70.0,
    },
    similar_parts: [{ id: "HIST-9", similarity_score: 0.88, historical_price: 91.4, price_delta_pct: -3.2 }],
    recommended_process: "cnc_mill_3axis",
    recommended_machine: "INTERNAL_MACHINE_HAAS_VF2",
    cycle_time_min: 12.3,
    cycle_time_source: "INTERNAL_gcode_estimate",
    physics_engines_used: ["KienzleForce", "INTERNAL_ENGINE_X"],
    confidence_factors: ["INTERNAL_FACTOR_parametric"],
    warnings: ["INTERNAL_WARNING_limit"],
    ...over,
  };
}

// Every value/key below is INTERNAL-ONLY (lives in cost_breakdown / similar_parts /
// dfm internals / recommended_machine / physics list / internal warnings) and must
// NEVER appear in the public projection. Public fields that legitimately carry a
// number (e.g. quantity_breaks[].savings_pct 0.2625, lead_time_days 10) are
// deliberately NOT listed here -- they are allowed out, so listing them would be a
// false positive. The fixture seeds DISTINCT internal-only values so a leak is
// detectable by value, not just by field name.
const INSTANT_SENTINELS = [
  // cost_breakdown -- internal $ basis (every sub-value distinct from public prices)
  "cost_breakdown", "machine_rate_hr", 95.5, "programming", "overhead", "rate_pct", 0.18,
  "total_cost_per_part", 70.0, "scrap_pct", 33.8, "amortization_per_part", 2.1,
  "setup_minutes", "num_setups", 47.75, 14.32, 19.6,
  // similar_parts -- historical price intelligence (competitive-sensitive)
  "similar_parts", "historical_price", 91.4, "similarity_score", 0.88, "price_delta_pct", -3.2,
  // machine / process / physics traceability -- internal-only
  "recommended_machine", "INTERNAL_MACHINE_HAAS_VF2", "physics_engines_used",
  "INTERNAL_ENGINE_X", "INTERNAL_WARNING_limit", "INTERNAL_FACTOR_parametric",
  "cycle_time_source", "INTERNAL_gcode_estimate",
  // dfm internals -- raw score + issue detail (only the verdict + count are public)
  "score", 82, "INTERNAL_DETAIL_wall", "INTERNAL_REC", "multiplier",
];

function assertNoInstantLeak(pub: object): void {
  const blob = JSON.stringify(pub);
  for (const s of INSTANT_SENTINELS) {
    expect(blob).not.toContain(String(s));
  }
}

describe("toPublicQuoteFromInstant -- happy path + total allow-list", () => {
  it("emits safe quote with price/band/confidence/breaks/tiers/dfm; NO internal leak", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(internalInstant());
    expect(pub.quotable).toBe(true);
    expect(pub.quote_usd).toBe(885.0);
    expect(pub.unit_price_usd).toBe(88.5);
    expect(pub.currency).toBe("USD");
    expect(pub.reason).toBe(null);
    expect(pub.price_band_usd).toEqual({ low: 75.0, high: 102.0 });
    expect(pub.confidence).toBeCloseTo(0.84, 5); // 84/100
    expect(pub.quantity_breaks).toHaveLength(2);
    expect(pub.quantity_breaks![1]).toEqual({
      quantity: 10, unit_price_usd: 88.5, total_price_usd: 885, savings_pct: 0.2625, lead_time_days: 10,
    });
    expect(pub.lead_time_tiers).toHaveLength(2);
    expect(pub.lead_time_tiers![0]).toEqual({ tier: "standard", business_days: 10, price_usd: 885 });
    expect(pub.dfm).toEqual({ manufacturable: true, rating: "good", blocking_issue_count: 0 });
    assertNoInstantLeak(pub);
  });

  it("exact key set -- only the safe keys cross the boundary", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(internalInstant());
    expect(Object.keys(pub).sort()).toEqual([
      "confidence", "currency", "dfm", "lead_time_tiers", "price_band_usd",
      "quantity_breaks", "quote_usd", "reason", "quotable", "unit_price_usd",
    ].sort());
  });
});

describe("toPublicQuoteFromInstant -- DFM HARD-GATE (gap #4)", () => {
  it("manufacturability 'difficult' BLOCKS the price -> dfm-revision-required", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(
      internalInstant({ dfm: { score: 40, manufacturability: "difficult", issues: [] } }),
    );
    expect(pub.quotable).toBe(false);
    expect(pub.quote_usd).toBe(null);
    expect(pub.unit_price_usd).toBe(null);
    expect(pub.reason).toBe("dfm-revision-required");
    // The verdict is still surfaced (so the customer knows WHY) -- but only the gate result.
    expect(pub.dfm).toEqual({ manufacturable: false, rating: "difficult", blocking_issue_count: 0 });
    assertNoInstantLeak(pub);
  });

  it("a critical DFM issue BLOCKS the price even when rating is 'good'", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(
      internalInstant({
        dfm: {
          score: 70, manufacturability: "good",
          issues: [
            { severity: "info", category: "x", message: "INTERNAL_DETAIL_wall", recommendation: "INTERNAL_REC" },
            { severity: "critical", category: "undercut", message: "INTERNAL_DETAIL_uc", recommendation: "INTERNAL_REC2" },
          ],
        },
      }),
    );
    expect(pub.quotable).toBe(false);
    expect(pub.reason).toBe("dfm-revision-required");
    expect(pub.dfm).toEqual({ manufacturable: false, rating: "good", blocking_issue_count: 1 });
    // The critical issue's message/recommendation are counted, never echoed.
    expect(JSON.stringify(pub)).not.toContain("INTERNAL_DETAIL_uc");
    expect(JSON.stringify(pub)).not.toContain("INTERNAL_REC2");
    assertNoInstantLeak(pub);
  });

  it("'marginal' with no critical issues still quotes (gate only blocks difficult/critical)", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(
      internalInstant({ dfm: { score: 60, manufacturability: "marginal", issues: [
        { severity: "warning", category: "tol", message: "INTERNAL_DETAIL_w", recommendation: "INTERNAL_R" },
      ] } }),
    );
    expect(pub.quotable).toBe(true);
    expect(pub.dfm).toEqual({ manufacturable: true, rating: "marginal", blocking_issue_count: 0 });
  });
});

describe("toPublicQuoteFromInstant -- fail-closed + adversarial", () => {
  it("null/undefined/non-object -> quote-unavailable", () => {
    for (const bad of [null, undefined, 42, "str"] as unknown[]) {
      const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(bad as InstantQuoteResult);
      expect(pub.quotable).toBe(false);
      expect(pub.quote_usd).toBe(null);
      expect(pub.unit_price_usd).toBe(null);
      expect(pub.reason).toBe("quote-unavailable");
    }
  });

  it("NaN/Infinity/negative total or unit price -> fail-closed, no leak", () => {
    for (const [t, u] of [[NaN, 88], [Infinity, 88], [-5, 88], [885, NaN], [885, -1], [885, 0], [0, 88]]) {
      const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(
        internalInstant({ total_price: t, unit_price: u }),
      );
      expect(pub.quotable).toBe(false);
      expect(pub.quote_usd).toBe(null);
      expect(pub.reason).toBe("quote-unavailable");
      assertNoInstantLeak(pub);
    }
  });

  it("malformed ci95 band (high<low or non-finite) -> band omitted, still quotable", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(
      internalInstant({ ci95_low: 200, ci95_high: 100 }), // inverted
    );
    expect(pub.quotable).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(pub, "price_band_usd")).toBe(false);
  });

  it("confidence clamped to 0-1 even if internal value is out of 0-100 range", () => {
    const hi = quotingPublicQuoteEngine.toPublicQuoteFromInstant(internalInstant({ confidence: 250 }));
    expect(hi.confidence).toBe(1);
    const lo = quotingPublicQuoteEngine.toPublicQuoteFromInstant(internalInstant({ confidence: -10 }));
    expect(lo.confidence).toBe(0);
  });

  it("drops malformed quantity-break rows", () => {
    const pub = quotingPublicQuoteEngine.toPublicQuoteFromInstant(
      internalInstant({ quantity_breaks: [
        { quantity: 0, unit_price: 10, total_price: 10, savings_pct: 0, lead_time_days: 5 } as never, // qty<=0
        { quantity: 5, unit_price: -1, total_price: 10, savings_pct: 0, lead_time_days: 5 } as never, // neg unit
        { quantity: 5, unit_price: 10, total_price: 50, savings_pct: 0.1, lead_time_days: 7 },         // valid
      ] }),
    );
    expect(pub.quantity_breaks).toHaveLength(1);
    expect(pub.quantity_breaks![0].quantity).toBe(5);
  });
});
