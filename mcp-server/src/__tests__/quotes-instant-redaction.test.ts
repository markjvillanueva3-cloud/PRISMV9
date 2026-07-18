/**
 * U-QUOTES-INSTANT-REDACT -- /api/v1/quotes/instant cost_breakdown redaction for anonymous callers.
 *
 * `quotes.ts` (createQuotesRouter) is mounted under /api with only `optionalToken` (never rejects
 * anonymous). POST /quotes/instant (instant_quote) returns InstantQuoteEngine's full
 * InstantQuoteResult, whose `cost_breakdown` block carries the shop's internal stack
 * (machining.machine_rate_hr = $/hr rate, overhead.rate_pct = margin %, total_cost_per_part, every
 * sub-block `.total`) -- which an ANONYMOUS caller must NOT receive. The R16 sibling of
 * U-QUOTE-COMPAT-REDACT; reuses the SAME shared redactThroughEnvelope from quote.ts.
 *
 * This test pins:
 *   1. ANON /quotes/instant -> 200, but `cost_breakdown` is EMPTIED to {} (graceful-shape) and the
 *      serialized body contains NONE of the internal cost-basis numbers (the $/hr rate, overhead %,
 *      total_cost_per_part), while the customer-facing fields (unit_price, total_price, the TOP-LEVEL
 *      ci95_low/ci95_high PRICE bounds, quantity_breaks, lead_time_options, dfm, confidence) are
 *      PRESERVED with their real values.
 *   2. AUTHENTICATED (req.userId set) /quotes/instant -> 200 with the FULL cost_breakdown (no redaction).
 *   3. The non-sensitive standalone routes (qty-breaks / lead-time) return bare customer arrays
 *      (QuantityBreak[] / LeadTimeOption[]) with no cost basis -> NEVER redacted, pass through untouched.
 *   4. The full envelope is mocked the way PRODUCTION callTool hands it to the route: the prism_business
 *      dispatcher slimResponse returns `{ type:"text", text:"<JSON>" }` (NO content[] wrapper), so the
 *      route receives the RAW envelope -- redactThroughEnvelope MUST parse/redact/re-wrap it. Mocking
 *      the bare object instead would be a false-green (the R9 lesson from U-QUOTE-COMPAT-REDACT).
 *
 * Drives the REAL createQuotesRouter through an ephemeral Express server behind a stand-in for the
 * /api `optionalToken` middleware (an `x-test-userid` header => authenticated; absent => anonymous).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";
import express from "express";
import { createQuotesRouter } from "../routes/quotes.js";
import { redactInternalMarginFields } from "../routes/quote.js";
import type { CallToolFn } from "../routes/index.js";

// A faithful InstantQuoteResult-shaped payload (the shape InstantQuoteEngine.computeInstantQuote
// returns and that production callTool hands the route after the MCP envelope unwrap). The distinctive
// numbers are leak markers that appear ONLY in the internal cost_breakdown: 137 ($/hr machine rate),
// 0.21 (overhead rate_pct), 318.44 (total_cost_per_part), 246.9 (machining.total).
function fullInstantQuote() {
  return {
    quote_id: "IQ-RED-001",
    part_name: "flange",
    quantity: 50,
    date: "2026-06-24",
    valid_until: "2026-07-24",
    // Customer-facing top-level fields -- MUST survive redaction:
    unit_price: 48.75,
    total_price: 2437.5,
    ci95_low: 44.1, // PRICE bound (NOT cost basis) -- must survive
    ci95_high: 53.4, // PRICE bound -- must survive
    confidence: 86,
    quantity_breaks: [
      { quantity: 10, unit_price: 55.2, total_price: 552, savings_pct: 0, lead_time_days: 8 },
      { quantity: 100, unit_price: 41.3, total_price: 4130, savings_pct: 25.2, lead_time_days: 11 },
    ],
    lead_time_options: [
      { tier: "standard", days: 8, multiplier: 1, unit_price: 48.75, total_price: 2437.5 },
      { tier: "rush", days: 3, multiplier: 1.4, unit_price: 68.25, total_price: 3412.5 },
    ],
    dfm: { score: 88, manufacturability: "good", issues: [] },
    recommended_process: "milling",
    recommended_machine: "VMC-40",
    cycle_time_min: 4.6,
    cycle_time_source: "physics_calculated",
    physics_engines_used: ["KienzleForceModel"],
    confidence_factors: ["physics-grounded cycle time"],
    warnings: [],
    // THE LEAK: cost_breakdown -- internal cost basis, must be emptied to {} for anon:
    cost_breakdown: {
      material: { raw_cost: 22, scrap_pct: 6, total: 23.32 },
      machining: { cycle_time_min: 4.6, machine_rate_hr: 137, total: 246.9 },
      setup: { num_setups: 1, setup_minutes: 30, total: 38.5 },
      tooling: { tool_count: 3, amortization_per_part: 1.4, total: 4.2 },
      programming: { hours: 1.5, total: 95 },
      inspection: { level: "standard", total: 12 },
      secondary_ops: { operations: [], total: 0 },
      overhead: { rate_pct: 0.21, total: 66.85 },
      total_cost_per_part: 318.44,
    },
    similar_parts: [],
  };
}

// Bare customer arrays -- what computeQtyBreaks / computeLeadOptions actually return (no cost basis).
function qtyBreaksResult() {
  return [
    { quantity: 1, unit_price: 80, total_price: 80, savings_pct: 0, lead_time_days: 8 },
    { quantity: 50, unit_price: 48.75, total_price: 2437.5, savings_pct: 39.1, lead_time_days: 10 },
  ];
}
function leadTimeResult() {
  return [
    { tier: "standard", days: 8, multiplier: 1, unit_price: 48.75, total_price: 2437.5 },
    { tier: "rush", days: 3, multiplier: 1.4, unit_price: 68.25, total_price: 3412.5 },
  ];
}

// Wrap a fixture as the PRODUCTION MCP text envelope -- this is the exact shape production callTool
// hands the route (businessDispatcher slimResponse: { type:"text", text:"<JSON>" }, NO content[]).
function biz(engineResult: unknown) {
  return { type: "text", text: JSON.stringify(engineResult) };
}

// callTool mock: routes each action to its enveloped fixture. THROWS on an unexpected action so a
// mis-wired route fails loudly instead of silently passing through an empty body.
const mockCallTool: CallToolFn = (async (_tool: string, action: string) => {
  switch (action) {
    case "instant_quote": return biz(fullInstantQuote());
    case "instant_quote_qty_breaks": return biz(qtyBreaksResult());
    case "instant_quote_lead_time": return biz(leadTimeResult());
    default: throw new Error(`unexpected action in test: ${action}`);
  }
}) as unknown as CallToolFn;

let server: Server;
let baseUrl = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // Stand-in for the /api optionalToken middleware: set req.userId only when the test header is present
  // (mirrors optionalToken, which sets req.userId for a valid Bearer and leaves it undefined for anon).
  app.use((req, _res, next) => {
    const uid = req.headers["x-test-userid"];
    if (typeof uid === "string" && uid.length > 0) (req as { userId?: string }).userId = uid;
    next();
  });
  app.use("/api/v1/quotes", createQuotesRouter(mockCallTool));
  server = createServer(app);
  // Bind explicitly to 127.0.0.1 (IPv4) so the IPv4 `fetch` below connects -- a bare listen(0) can
  // bind ::1 (IPv6) and the fetch to 127.0.0.1 then hits nothing (returns an HTML error page).
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  const port = addr && typeof addr === "object" ? addr.port : 0;
  // baseUrl carries the FULL mount path -- the router is mounted at /api/v1/quotes, so a POST helper
  // path of `/instant` resolves to /api/v1/quotes/instant (NOT a bare /instant, which would 404 -> HTML).
  baseUrl = `http://127.0.0.1:${port}/api/v1/quotes`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// POST helper. authed=true -> sends the x-test-userid header. Returns { status, body, data (unwrapped
// from the {ok,data} envelope), rawData (the raw value of body.data -- the real wire) }.
async function postInstant(path: string, body: unknown, authed: boolean) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authed) headers["x-test-userid"] = "user-123";
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const parsed = (await res.json()) as { ok: boolean; data?: unknown };
  // data is the {type,text} envelope; unwrap text to the engine object for field assertions.
  let data: unknown = parsed.data;
  if (data && typeof data === "object" && (data as { type?: string }).type === "text") {
    try { data = JSON.parse((data as { text: string }).text); } catch { /* leave as envelope */ }
  }
  return { status: res.status, body: parsed, data, rawData: parsed.data };
}

describe("U-QUOTES-INSTANT-REDACT: /api/v1/quotes/instant anon cost_breakdown redaction", () => {
  it("ANON /quotes/instant -> 200, cost_breakdown EMPTIED, customer fields preserved", async () => {
    const { status, data } = await postInstant("/instant", { part_name: "flange", quantity: 50 }, false);
    expect(status).toBe(200);
    const d = data as Record<string, unknown>;
    // cost_breakdown present but emptied (graceful-shape, not deleted):
    expect(d.cost_breakdown).toEqual({});
    // Customer-facing fields preserved with real values:
    expect(d.unit_price).toBe(48.75);
    expect(d.total_price).toBe(2437.5);
    expect(d.ci95_low).toBe(44.1); // top-level PRICE bound survives
    expect(d.ci95_high).toBe(53.4);
    expect(d.confidence).toBe(86);
    expect(Array.isArray(d.quantity_breaks)).toBe(true);
    expect((d.quantity_breaks as unknown[]).length).toBe(2);
    expect(Array.isArray(d.lead_time_options)).toBe(true);
    expect(d.dfm).toEqual({ score: 88, manufacturability: "good", issues: [] });
    expect(d.recommended_machine).toBe("VMC-40");
  });

  it("ANON /quotes/instant -> serialized body contains NONE of the internal cost-basis numbers", async () => {
    const { rawData } = await postInstant("/instant", { quantity: 50 }, false);
    // Scan the REAL wire (the {type,text} envelope's text) -- the production leak surface.
    const wire = JSON.stringify(rawData);
    expect(wire).not.toContain("machine_rate_hr");
    expect(wire).not.toContain("rate_pct");
    expect(wire).not.toContain("total_cost_per_part");
    expect(wire).not.toContain("137");    // the shop $/hr machine rate
    expect(wire).not.toContain("0.21");   // overhead rate_pct
    expect(wire).not.toContain("318.44"); // total_cost_per_part
    expect(wire).not.toContain("246.9");  // machining.total
    // But the customer price IS on the wire:
    expect(wire).toContain("48.75");      // unit_price
  });

  it("AUTHENTICATED /quotes/instant -> 200 with the FULL cost_breakdown (no redaction)", async () => {
    const { status, data } = await postInstant("/instant", { quantity: 50 }, true);
    expect(status).toBe(200);
    const d = data as Record<string, unknown>;
    const cb = d.cost_breakdown as Record<string, Record<string, unknown>>;
    expect(cb.machining.machine_rate_hr).toBe(137);
    expect(cb.overhead.rate_pct).toBe(0.21);
    expect(d.cost_breakdown).toHaveProperty("total_cost_per_part", 318.44);
    expect(d.unit_price).toBe(48.75);
  });

  it("ANON /quotes/qty-breaks -> bare customer array, NOT redacted (no cost basis to leak)", async () => {
    const { status, data, rawData } = await postInstant("/qty-breaks", { unit_price_at_qty: 48.75, quantity: 50 }, false);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(2);
    expect((data as Array<{ quantity: number }>)[1].quantity).toBe(50);
    // The bare array carries no internal keys, so it is untouched even for anon:
    expect(JSON.stringify(rawData)).not.toContain("machine_rate_hr");
  });

  it("ANON /quotes/lead-time -> bare customer array, NOT redacted (no cost basis to leak)", async () => {
    const { status, data } = await postInstant("/lead-time", { base_lead_days: 8, unit_price: 48.75, quantity: 50 }, false);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect((data as Array<{ tier: string }>)[0].tier).toBe("standard");
  });

  // --- NEGATIVE CONTROL (R9): prove the redaction has teeth. The shared redactor MUST empty
  //     cost_breakdown on the InstantQuoteResult shape; if it ever no-ops, these fail. ---
  it("redactInternalMarginFields (shared) empties cost_breakdown on the InstantQuoteResult shape", () => {
    const out = redactInternalMarginFields(fullInstantQuote()) as Record<string, unknown>;
    expect(out.cost_breakdown).toEqual({});                 // emptied
    expect(out.unit_price).toBe(48.75);                     // customer field untouched
    expect(out.ci95_low).toBe(44.1);                        // top-level PRICE bound untouched
    expect(JSON.stringify(out)).not.toContain("machine_rate_hr");
    expect(JSON.stringify(out)).not.toContain("318.44");
  });

  it("redactInternalMarginFields leaves a bare customer array untouched (qty-breaks shape)", () => {
    const arr = qtyBreaksResult();
    // Arrays are not object-like in the redactor's isObjectLike sense -> returned unchanged.
    expect(redactInternalMarginFields(arr)).toBe(arr);
  });
});
