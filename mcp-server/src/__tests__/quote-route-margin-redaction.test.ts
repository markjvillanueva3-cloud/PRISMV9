/**
 * U-QUOTE-COMPAT-REDACT -- /api/v1/quote compat-surface margin/cost redaction for anonymous callers.
 *
 * `quote.ts` (createQuoteRouter) is mounted under /api with only `optionalToken` (never rejects
 * anonymous). The two quote-builder routes that return QuoteEstimatorEngine.estimate's full
 * QuoteEstimateResult -- POST /quote/generate (quoting_generate) and POST /quote/estimate
 * (quote_estimate) -- would otherwise hand an ANONYMOUS caller the shop's internal cost/margin stack
 * (costs.machining.machine_rate_hr, costs.overhead.rate_pct, costs.total_cost, pricing.margin_pct).
 * This test pins:
 *   1. ANON /quote/generate + /quote/estimate -> 200, but the internal cost/margin fields are ABSENT
 *      (costs emptied to {}; pricing.margin_pct / below_margin_floor / margin_floor_pct stripped),
 *      while the customer-facing price (pricing.unit_price / total_price / adjustments) + lead_time
 *      are PRESERVED with real values.
 *   2. AUTHENTICATED (req.userId set) /quote/generate -> 200 with the FULL breakdown (no redaction).
 *   3. The non-sensitive routes (price-breaks / compare-materials / what-if / material-price) are
 *      NEVER redacted -- their projected customer-facing arrays pass through untouched.
 *
 * Drives the REAL createQuoteRouter through an ephemeral Express server. The router is mounted behind
 * a stand-in for the /api `optionalToken` middleware so the authed-vs-anon branch is genuinely
 * exercised (an `x-test-userid` header => authenticated session; absent => anonymous).
 *
 * Per scrutiny arm A (P2, R9): assert the cost-basis VALUES are ABSENT in the actual HTTP body (a
 * `toBeDefined()`-style assert would NOT catch a redaction regression). The leak assertions check
 * (a) the exact surviving key set and (b) that the serialized body contains none of the real
 * internal numbers -- both fail loudly on any un-redaction regression.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type Server } from "http";
import express from "express";
import { createQuoteRouter, redactInternalMarginFields } from "../routes/quote.js";
import type { CallToolFn } from "../routes/index.js";

// A faithful QuoteEstimateResult-shaped payload (the shape QuoteEstimatorEngine.estimate returns and
// that production callTool hands the router after unwrapping the MCP content envelope). Carries the
// internal cost/margin stack the redaction must strip for anonymous callers. The distinctive numbers
// 95 (machine $/hr), 18 (overhead %), 414.5 (total cost), 26.3 (margin %) are the leak markers.
function fullQuoteResult() {
  return {
    quote_id: "Q-RED-001",
    part_name: "bracket",
    quantity: 25,
    date: "2026-06-24",
    valid_until: "2026-07-24",
    costs: {
      material: { raw_cost: 40, scrap_pct: 5, cert_cost: 0, total: 42 },
      machining: { cycle_time_min: 3.2, cycle_time_source: "physics_calculated", machine_rate_hr: 95, machine_cost: 100, tool_change_cost: 5, total: 105 },
      setup: { num_setups: 1, setup_minutes: 30, fixture_complexity: "low", setup_rate_hr: 75, total: 37.5 },
      tooling: { estimated_tool_count: 3, tool_amortization_per_part: 1.2, special_tooling_cost: 0, total: 30 },
      programming: { hours: 1, rate_hr: 85, total: 85 },
      inspection: { level: "standard", fai_cost: 0, per_part_cost: 1, cert_cost: 0, total: 25 },
      secondary_ops: { operations: [], total: 0 },
      nre: { items: [], total_nre: 0, amortized_per_part: 0 },
      overhead: { rate_pct: 18, total: 60 },
      total_cost_per_part: 16.6,
      total_cost: 414.5,
    },
    pricing: {
      unit_price: 22.5,
      total_price: 562.5,
      margin_pct: 26.3,
      below_margin_floor: false,
      margin_floor_pct: 20,
      adjustments: { rush_premium_pct: null, volume_discount_pct: 5, repeat_discount_pct: null, tolerance_premium_pct: 0, complexity_premium_pct: 0 },
    },
    // Uncertainty CI95 block: estimated_cost (777.7) + ci95_low/high ARE raw per-part cost-basis $ -- they
    // must be redacted too (3-of-3 arm B). 777.7 is a distinct leak marker not appearing elsewhere.
    uncertainty: { estimated_cost: 777.7, ci95_low: 700.1, ci95_high: 850.9, confidence: 0.8, dominant_uncertainty_source: "machining_speed_feed", cost_cv_pct: 9.5, component_uncertainties: { machining_cv_pct: 8, tool_life_cv_pct: 5, material_cv_pct: 3 } },
    lead_time: { machining_days: 3, secondary_ops_days: 0, inspection_days: 1, total_standard_days: 5, total_rush_days: 3 },
  };
}

// FLAT injection-mold shape (InjectionMoldQuoteEngine): the internal cost/margin stack is at the TOP level
// (no nested `costs`). Leak markers: machine_rate_hr 888, total_cost 333.3, margin_pct 41.7. Customer keys
// (price_per_part, total_price, mold_cost_usd, mold_lead_weeks) must survive.
function injectionMoldResult() {
  return {
    quote_id: "IM-001", part_name: "housing", quantity: 1000,
    mold_cost_usd: 18000, mold_lead_weeks: 8, mold_life_shots: 500000, num_cavities: 4,
    material_cost: 0.42, cycle_time_s: 28, machine_tonnage: 120, machine_rate_hr: 888,
    machine_cost: 2.1, secondary_ops_cost: 0.3, overhead_cost: 0.9, unit_cost: 3.72,
    total_cost: 333.3, amortized_tool_per_part: 18, price_per_part: 24.5, total_price: 24500,
    margin_pct: 41.7, dfm_warnings: [],
  };
}

// Nested sheet-metal / additive shapes (SheetMetal/AdditiveQuoteEngine) reuse the costs+pricing structure,
// so the existing nested redaction applies once the route is flagged sensitive. Markers: total_cost 222.2,
// margin_pct 33.3 (sheet); total_cost 111.1, margin_pct 29.9 (additive).
function sheetMetalResult() {
  return {
    quote_id: "SM-001", part_name: "panel", quantity: 50,
    costs: { material: { total: 80 }, cutting: { rate_hr: 65, total: 40 }, overhead_pct: 18, overhead: 22, total_cost: 222.2, cost_per_part: 4.44 },
    pricing: { unit_price: 6.5, total_price: 325, margin_pct: 33.3 },
    lead_time: { cutting_days: 2, total_standard_days: 4 },
  };
}
function additiveResult() {
  // Faithful to AdditiveQuoteResult: machine rate lives ONLY nested at costs.machine_time.rate_hr (the
  // real engine has NO top-level machine_rate_hr -- arm A P2). Internal stack is the nested costs block.
  return {
    quote_id: "AD-001", part_name: "bracket", quantity: 10, technology: "fdm", material: "PLA",
    costs: { material: { total: 12 }, machine_time: { rate_hr: 8, total: 30 }, overhead_pct: 18, overhead: 8, total_cost: 111.1, cost_per_part: 11.11 },
    pricing: { unit_price: 16, total_price: 160, margin_pct: 29.9 },
    lead_time: { print_days: 3, total_standard_days: 4 },
  };
}

// The projected, customer-facing array shapes the non-sensitive routes return (no costs/pricing keys).
const PRICE_BREAKS = [{ qty: 1, unit_price: 30, total: 30, lead_days: 5 }, { qty: 25, unit_price: 22.5, total: 562.5, lead_days: 5 }];
const COMPARE = [{ material: "6061", unit_price: 22.5, total: 562.5, lead_days: 5, dfm_warnings: [] }];
const WHATIF = [{ scenario: "Scenario 1", unit_price: 24, delta_pct: 6.7 }];
const MATERIAL_PRICE = { material: "6061", name: "6061-T6", final_price_kg: 6.5, base_price_kg: 6.5 };

// FAITHFUL production contract (3-of-3 arm A P0): the prism_business dispatcher returns a SLIMMED MCP
// text envelope `{ type:"text", text: JSON.stringify(engineResult) }` (no content[] wrapper), and the
// production callTool (index.ts: `result?.content?.[0]?.text`) CANNOT peel it, so it hands the route the
// RAW { type, text } object -- NOT the bare engine result. Mocking the bare object would be a false-green
// (the redaction would silently no-op in production while the test passes). So the mock wraps every
// fixture exactly as production delivers it.
function biz(engineResult: unknown) {
  return { type: "text" as const, text: JSON.stringify(engineResult) };
}

const calls: Array<{ tool: string; action: string }> = [];
const callTool: CallToolFn = vi.fn(async (tool: string, action: string) => {
  calls.push({ tool, action });
  switch (action) {
    case "quoting_generate":
    case "quote_estimate":
      return biz(fullQuoteResult());
    case "injection_mold_quote":
      return biz(injectionMoldResult());
    case "sheet_metal_quote":
      return biz(sheetMetalResult());
    case "additive_quote":
      return biz(additiveResult());
    case "quoting_price_breaks":
      return biz(PRICE_BREAKS);
    case "quote_compare_materials":
      return biz(COMPARE);
    case "quote_what_if":
      return biz(WHATIF);
    case "material_price_lookup":
      return biz(MATERIAL_PRICE);
    default:
      return biz({ ok: true });
  }
});

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  // Stand in for the /api `optionalToken`: an `x-test-userid` header => authenticated (req.userId set);
  // absent => anonymous. This is the exact branch redactInternalMarginFields keys off (!req.userId).
  app.use((req: any, _res, next) => {
    const uid = req.headers["x-test-userid"];
    if (uid !== undefined) req.userId = String(uid);
    next();
  });
  app.use("/api/v1/quote", createQuoteRouter(callTool));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (addr && typeof addr === "object") baseUrl = `http://127.0.0.1:${addr.port}/api/v1/quote`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// Unwrap the prism_business { type:"text", text } envelope that sendCompatResponse echoes in `result`,
// mirroring the FE's unwrapQuotingBody. The route re-wraps the REDACTED object back into the envelope,
// so this yields the post-redaction engine object the assertions inspect.
function unwrapResult(result: unknown): any {
  if (result && typeof result === "object" && (result as any).type === "text" && typeof (result as any).text === "string") {
    try { return JSON.parse((result as any).text); } catch { return result; }
  }
  return result;
}

async function post(path: string, body: unknown, userId?: string): Promise<{ status: number; body: any; result: any; rawResult: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId !== undefined) headers["x-test-userid"] = userId; // present => authenticated
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const parsed = await res.json().catch(() => ({}));
  // `result` = the unwrapped engine object (what callers assert on); `rawResult` = the raw envelope
  // (so a test can assert the wire shape stays {type,text} and the leak-string scan runs on the real wire).
  return { status: res.status, body: parsed, result: unwrapResult(parsed?.result), rawResult: parsed?.result };
}

describe("U-QUOTE-COMPAT-REDACT -- anonymous /quote margin/cost redaction", () => {
  const SENSITIVE = [
    { path: "/generate", action: "quoting_generate" },
    { path: "/estimate", action: "quote_estimate" },
  ];

  it.each(SENSITIVE)("ANON $path -> 200 with the internal cost/margin stack ABSENT", async ({ path }) => {
    const { status, result, rawResult } = await post(path, { material: "6061", quantity: 25 }); // anon
    expect(status).toBe(200);
    // costs AND uncertainty are emptied to {} (kept truthy so an FE !e.costs presence-guard does not throw):
    expect(result.costs).toEqual({});
    expect(Object.keys(result.costs)).toHaveLength(0);
    expect(result.uncertainty).toEqual({});   // 3-of-3 arm B: estimated_cost/ci95_* were raw cost basis
    // pricing keeps ONLY the customer-facing keys -- the three margin-internal keys are gone. Assert
    // the exact surviving key set (a strong contract: an added/missing key fails this):
    expect(Object.keys(result.pricing).sort()).toEqual(["adjustments", "total_price", "unit_price"]);
    // Strongest leak assertion: the RAW WIRE the anon caller receives (the {type,text} envelope whose
    // `text` holds the serialized payload -- 3-of-3 arm A) must contain NONE of the real internal values
    // NOR their keys. Scanning rawResult (not the unwrapped object) proves no leak escapes on the wire.
    const wire = JSON.stringify(rawResult);
    expect(wire).not.toContain("414.5");          // costs.total_cost
    expect(wire).not.toContain("26.3");           // pricing.margin_pct
    expect(wire).not.toContain("777.7");          // uncertainty.estimated_cost (cost basis)
    expect(wire).not.toContain("850.9");          // uncertainty.ci95_high (cost basis band)
    expect(wire).not.toContain("machine_rate_hr");
    expect(wire).not.toContain("margin_pct");
    expect(wire).not.toContain("estimated_cost");
    expect(wire).not.toContain('machine_rate_hr\\":95');
    expect(wire).not.toContain('rate_pct\\":18');
    expect(wire).not.toContain("total_cost");
    // The customer-facing price + adjustments + lead time are PRESERVED with their real values:
    expect(result.pricing.unit_price).toBe(22.5);
    expect(result.pricing.total_price).toBe(562.5);
    expect(result.pricing.adjustments).toEqual({
      rush_premium_pct: null, volume_discount_pct: 5, repeat_discount_pct: null,
      tolerance_premium_pct: 0, complexity_premium_pct: 0,
    });
    expect(result.lead_time.total_standard_days).toBe(5);
    expect(result.quote_id).toBe("Q-RED-001");
  });

  it.each(SENSITIVE)("AUTHENTICATED $path -> 200 with the FULL breakdown (no redaction)", async ({ path }) => {
    const { status, result } = await post(path, { material: "6061", quantity: 25 }, "emp-7"); // authed
    expect(status).toBe(200);
    // Authenticated session: redaction must NOT fire -- the full internal stack is present, real values.
    expect(result.costs.machining.machine_rate_hr).toBe(95);
    expect(result.costs.overhead.rate_pct).toBe(18);
    expect(result.costs.total_cost).toBe(414.5);
    expect(result.pricing.margin_pct).toBe(26.3);
    expect(result.pricing.below_margin_floor).toBe(false);
    expect(result.pricing.margin_floor_pct).toBe(20);
    expect(result.uncertainty.estimated_cost).toBe(777.7);   // arm C re-run P2: authed keeps uncertainty
  });

  it("ANON /price-breaks (projected array) is NOT redacted -- passes through untouched", async () => {
    const { status, result } = await post("/price-breaks", { material: "6061", quantity: 25 });
    expect(status).toBe(200);
    expect(result).toEqual(PRICE_BREAKS);
  });

  it("ANON /compare-materials (projected array) is NOT redacted", async () => {
    const { status, result } = await post("/compare-materials", { material: "6061", materials: ["6061"] });
    expect(status).toBe(200);
    expect(result).toEqual(COMPARE);
  });

  it("ANON /what-if (projected array) is NOT redacted", async () => {
    const { status, result } = await post("/what-if", { material: "6061", scenarios: [{}] });
    expect(status).toBe(200);
    expect(result).toEqual(WHATIF);
  });

  it("ANON /material-price (public commodity market data) is NOT redacted", async () => {
    const { status, result } = await post("/material-price", { material: "6061" });
    expect(status).toBe(200);
    expect(result).toEqual(MATERIAL_PRICE);
  });

  // 3-of-3 arm C: the 3 discrete-process quote routes ALSO leaked the internal stack on the same anon
  // router. injection-mold is FLAT (top-level keys); sheet-metal/additive are nested (costs+pricing).
  it("ANON /injection-mold (FLAT shape) -> 200 with flat internal cost/margin keys ABSENT", async () => {
    const { status, result, rawResult } = await post("/injection-mold", { material: "abs", quantity: 1000 });
    expect(status).toBe(200);
    const wire = JSON.stringify(rawResult);   // scan the real wire envelope (arm A)
    // Flat internal keys + their distinctive values are gone:
    expect(result.machine_rate_hr).toBeUndefined();
    expect(result.total_cost).toBeUndefined();
    expect(result.margin_pct).toBeUndefined();
    expect(result.overhead_cost).toBeUndefined();
    expect(result.material_cost).toBeUndefined();
    expect(wire).not.toContain("888");     // machine_rate_hr value
    expect(wire).not.toContain("333.3");   // total_cost value
    expect(wire).not.toContain("41.7");    // margin_pct value
    // Customer-facing keys survive (a mold quote without these is useless):
    expect(result.price_per_part).toBe(24.5);
    expect(result.total_price).toBe(24500);
    expect(result.mold_cost_usd).toBe(18000);
    expect(result.mold_lead_weeks).toBe(8);
    expect(result.quote_id).toBe("IM-001");
  });

  it("AUTHENTICATED /injection-mold -> 200 with FULL flat breakdown (no redaction)", async () => {
    const { status, result } = await post("/injection-mold", { material: "abs", quantity: 1000 }, "emp-7");
    expect(status).toBe(200);
    expect(result.machine_rate_hr).toBe(888);
    expect(result.total_cost).toBe(333.3);
    expect(result.margin_pct).toBe(41.7);
  });

  it.each([
    { path: "/sheet-metal", cost: "222.2", margin: "33.3" },
    { path: "/additive", cost: "111.1", margin: "29.9" },
  ])("ANON $path (nested shape) -> 200 with costs emptied + margin_pct stripped", async ({ path, cost, margin }) => {
    const { status, result, rawResult } = await post(path, { material: "x", quantity: 10 });
    expect(status).toBe(200);
    expect(result.costs).toEqual({});
    expect(Object.keys(result.pricing).sort()).toEqual(["total_price", "unit_price"]);
    const wire = JSON.stringify(rawResult);
    expect(wire).not.toContain(cost);
    expect(wire).not.toContain(margin);
    expect(wire).not.toContain("margin_pct");
    // Customer price survives:
    expect(result.pricing.total_price).toBeGreaterThan(0);
  });

  it("AUTHENTICATED /sheet-metal -> 200 with FULL nested breakdown", async () => {
    const { status, result } = await post("/sheet-metal", { material: "x", quantity: 50 }, "emp-7");
    expect(status).toBe(200);
    expect(result.costs.total_cost).toBe(222.2);
    expect(result.pricing.margin_pct).toBe(33.3);
  });

  it("AUTHENTICATED /additive -> 200 with FULL nested breakdown (per-shape authed coverage, arm C P2)", async () => {
    const { status, result } = await post("/additive", { material: "x", quantity: 10 }, "emp-7");
    expect(status).toBe(200);
    expect(result.costs.total_cost).toBe(111.1);
    expect(result.pricing.margin_pct).toBe(29.9);
  });
});

describe("redactInternalMarginFields (pure helper)", () => {
  it("empties costs + uncertainty to {} and strips margin internals, preserving customer pricing + lead time", () => {
    const out = redactInternalMarginFields(fullQuoteResult()) as any;
    expect(out.costs).toEqual({});
    expect(out.uncertainty).toEqual({});   // estimated_cost/ci95_* (cost basis) gone
    expect(Object.keys(out.pricing).sort()).toEqual(["adjustments", "total_price", "unit_price"]);
    expect(out.pricing.unit_price).toBe(22.5);
    expect(out.pricing.total_price).toBe(562.5);
    expect(out.lead_time.total_standard_days).toBe(5);
  });

  it("deletes the FLAT injection-mold internal cost/margin keys, preserving customer keys", () => {
    const out = redactInternalMarginFields(injectionMoldResult()) as any;
    // Flat internal keys deleted outright (no FE presence-guard on these):
    for (const k of ["machine_rate_hr", "total_cost", "margin_pct", "overhead_cost", "material_cost", "machine_cost", "secondary_ops_cost", "unit_cost", "amortized_tool_per_part"]) {
      expect(out[k]).toBeUndefined();
    }
    // Customer-facing mold-quote keys survive:
    expect(out.price_per_part).toBe(24.5);
    expect(out.total_price).toBe(24500);
    expect(out.mold_cost_usd).toBe(18000);
    expect(out.quote_id).toBe("IM-001");
  });

  it("does NOT mutate the input (pure clone)", () => {
    const input = fullQuoteResult();
    redactInternalMarginFields(input);
    // Original is untouched -- the engine result/singleton must never be mutated.
    expect(input.costs.total_cost).toBe(414.5);
    expect(input.pricing.margin_pct).toBe(26.3);
  });

  it("passes through a projected array (no costs/pricing keys) unchanged by reference", () => {
    expect(redactInternalMarginFields(PRICE_BREAKS)).toBe(PRICE_BREAKS);
    expect(redactInternalMarginFields(WHATIF)).toBe(WHATIF);
  });

  it("passes through a non-object / error payload unchanged (adversarial)", () => {
    expect(redactInternalMarginFields(null)).toBeNull();
    expect(redactInternalMarginFields("nope")).toBe("nope");
    expect(redactInternalMarginFields({ error: "boom" })).toEqual({ error: "boom" });
  });

  it("redacts costs even when pricing is absent, and vice versa (adversarial partial shapes)", () => {
    const costsOnly = redactInternalMarginFields({ costs: { total_cost: 99 } }) as any;
    expect(costsOnly.costs).toEqual({});
    const pricingOnly = redactInternalMarginFields({ pricing: { unit_price: 5, margin_pct: 30 } }) as any;
    expect(pricingOnly.pricing).toEqual({ unit_price: 5 });
  });
});
