/**
 * U-COST-ROUTE-REDACT -- anon cost-basis redaction on /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote.
 *
 * `cost.ts` (createCostRouter) and `pipeline.ts` (createPipelineRouter) are mounted under /api with only
 * `optionalToken` (auth.ts:64-76 -- sets req.userId for a valid Bearer, NEVER rejects anonymous). Three
 * handlers leaked the shop's internal cost basis to anonymous callers:
 *   - POST /cost/estimate  -> prism_intelligence:process_cost  (PURE cost basis, no customer price)
 *   - POST /cost/quote     -> prism_intelligence:shop_quote    (customer pricing + internal cost_breakdown
 *                                                               + a $/hr rate inlined into notes[0])
 *   - POST /pipeline/quote -> prism_intelligence:process_cost  (same PURE-cost leak as /cost/estimate)
 * The R16 sibling of U-QUOTE-COMPAT-REDACT / U-QUOTES-INSTANT-REDACT; reuses the SAME shared
 * redactInternalMarginFields from quote.ts (extended with the process_cost shape: REDACTED_FLAT_KEYS +=
 * total/tool/setup_cost_per_part, REDACTED_NESTED_BLOCKS += breakdown/inputs) plus a shop_quote-specific
 * redactShopQuoteNotes for the rate-in-a-string.
 *
 * MOCK SHAPE (R9 -- mock the PRODUCTION wire): unlike the prism_business surfaces (which return a bare
 * `{type,text}` slimResponse the route must envelope-peel), prism_intelligence returns the STANDARD
 * `{content:[{type:"text",text}]}` envelope, which the real callTool (index.ts:887) UNWRAPS+JSON.parses
 * before handing the route -- so the route receives the PARSED engine object. The mock therefore returns
 * the parsed engine fixture DIRECTLY (no envelope), matching what the handler actually sees.
 *
 * This test pins:
 *   1. ANON /cost/estimate -> 200, the process_cost cost stack (total/machine/tool/setup_cost_per_part,
 *      breakdown, inputs.machine_rate_per_hour) is gone; process metrics (cycle/tool-life) survive.
 *   2. ANON /cost/quote -> 200, customer `pricing` survives, `cost_breakdown` is EMPTIED, and the $/hr
 *      rate is SCRUBBED from notes (while the lead-time / volume-discount notes survive).
 *   3. ANON /pipeline/quote -> 200, same process_cost cost stack stripped.
 *   4. AUTHENTICATED (req.userId set) -> the FULL breakdown (no redaction) on all three.
 *   5. Negative control (R9): the shared redactor + the notes scrubber actually have teeth.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";
import express from "express";
import { createCostRouter, redactShopQuoteNotes, adaptCostEstimate } from "../routes/cost.js";
import { createPipelineRouter } from "../routes/pipeline.js";
import { redactInternalMarginFields } from "../routes/quote.js";

// IntelligenceEngine.processCost's real return shape (IntelligenceEngine.ts:1104-1119). Leak markers:
// 95 (inputs.machine_rate_per_hour = shop $/hr), 42.5 (total_cost_per_part), 18.3 (machine_cost),
// 6.4 (tool_cost_per_part), 9.1 (setup_cost_per_part).
function processCostResult() {
  return {
    action: "process_cost",
    total_cost_per_part: 42.5,
    machine_cost: 18.3,
    tool_cost_per_part: 6.4,
    setup_cost_per_part: 9.1,
    cycle_time_min: 12.2,
    tool_life_min: 95,            // NOTE: also "95" -- a process metric that SHOULD survive; see leak-scan note
    parts_per_edge: 40,
    batch_size: 25,
    breakdown: [
      { name: "face_mill", machine_cost: 8.1, tool_cost: 2.2, total: 10.3 },
      { name: "pocket", machine_cost: 10.2, tool_cost: 4.2, total: 14.4 },
    ],
    inputs: { machine_rate_per_hour: 95, tool_cost: 256, setup_time_min: 30 },
  };
}

// ProductEngine.shopQuote's real return shape (ProductEngine.ts:1908-1934). Customer `pricing` survives;
// `cost_breakdown` + the notes[0] "$/hr" string are the leak. unit_price=63.5 is the customer marker.
function shopQuoteResult() {
  return {
    quote_number: "Q-ABC123",
    date: "2026-06-24",
    valid_until: "2026-07-24",
    customer: "ACME",
    part: { name: "bracket", material: "6061-T6", operations: 3 },
    pricing: { unit_price: 63.5, quantity: 25, subtotal: 1587.5, currency: "USD" },
    lead_time_days: 8,
    cost_breakdown: [
      { name: "setup", total: 9.1 },
      { name: "machining", machine_rate_hr: 137, total: 18.3 },
    ],
    cycle_time_min: 12.2,
    notes: [
      "Machine: HAAS VF-2 at $137/hr",                       // LEAK: the $/hr rate in a string
      "Tool life: 95 min (40 parts/edge)",
      "Safety score: 0.92",
      "Volume discount may apply -- contact sales",          // customer-safe -> survives
    ],
  };
}

// The mock returns the PARSED engine object directly (the production callTool already unwrapped the
// content[] envelope). THROWS on an unexpected action so a mis-wired route fails loudly.
const mockCallTool = (async (_tool: string, action: string) => {
  switch (action) {
    case "process_cost": return processCostResult();
    case "shop_quote": return shopQuoteResult();
    default: throw new Error(`unexpected action in test: ${action}`);
  }
}) as unknown as (tool: string, action: string, params?: Record<string, unknown>) => Promise<unknown>;

let server: Server;
let baseUrl = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // Stand-in for the /api optionalToken middleware: set req.userId only when the test header is present.
  app.use((req, _res, next) => {
    const uid = req.headers["x-test-userid"];
    if (typeof uid === "string" && uid.length > 0) (req as { userId?: string }).userId = uid;
    next();
  });
  app.use("/api/v1/cost", createCostRouter(mockCallTool as never));
  app.use("/api/v1/pipeline", createPipelineRouter(mockCallTool as never));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  const port = addr && typeof addr === "object" ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// POST helper. Returns { status, result (the unwrapped `result` field), rawBody (the raw wire string) }.
async function post(path: string, body: unknown, authed: boolean) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authed) headers["x-test-userid"] = "user-123";
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const rawBody = await res.text();
  let result: unknown;
  try { result = (JSON.parse(rawBody) as { result?: unknown }).result; } catch { result = undefined; }
  return { status: res.status, result, rawBody };
}

describe("U-COST-ROUTE-REDACT: anon cost-basis redaction on /cost + /pipeline", () => {
  // --- /cost/estimate (process_cost, PURE cost basis) ---
  it("ANON /cost/estimate -> 200, cost stack stripped, process metrics survive", async () => {
    const { status, result } = await post("/api/v1/cost/estimate", { material: "steel" }, false);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    // The internal flat cost keys are DELETED:
    expect(d).not.toHaveProperty("total_cost_per_part");
    expect(d).not.toHaveProperty("machine_cost");
    expect(d).not.toHaveProperty("tool_cost_per_part");
    expect(d).not.toHaveProperty("setup_cost_per_part");
    // The nested cost blocks are EMPTIED to {}:
    expect(d.breakdown).toEqual({});
    expect(d.inputs).toEqual({});
    // Process metrics (not cost basis) survive:
    expect(d.cycle_time_min).toBe(12.2);
    expect(d.parts_per_edge).toBe(40);
    expect(d.batch_size).toBe(25);
  });

  it("ANON /cost/estimate -> wire carries NONE of the cost-basis numbers (esp. the $/hr rate)", async () => {
    const { rawBody } = await post("/api/v1/cost/estimate", {}, false);
    expect(rawBody).not.toContain("machine_rate_per_hour");
    expect(rawBody).not.toContain("total_cost_per_part");
    expect(rawBody).not.toContain("42.5"); // total_cost_per_part
    expect(rawBody).not.toContain("18.3"); // machine_cost / a breakdown total
    expect(rawBody).not.toContain("6.4");  // tool_cost_per_part
    // The literal shop $/hr rate value "95" must not survive as the machine rate. (tool_life_min is also
    // 95, a process metric -- so we assert the RATE *key* is gone above; here we confirm the rate is not
    // reachable via inputs by checking the key is absent rather than the bare digit.)
    expect(rawBody).not.toContain("\"machine_rate_per_hour\"");
  });

  it("AUTHENTICATED /cost/estimate -> 200 with the FULL cost stack (no redaction)", async () => {
    const { status, result } = await post("/api/v1/cost/estimate", {}, true);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    // Raw engine cost fields are still present (additive adapter, authed sees everything):
    expect(d.total_cost_per_part).toBe(42.5);
    expect((d.inputs as Record<string, unknown>).machine_rate_per_hour).toBe(95);
    // T-COSTPAGE-SHAPE: the route now ADAPTS process_cost -> the FE CostEstimate shape, so `breakdown`
    // is the FE category MAP {machine,tooling,setup}, NOT the raw per-op array. The original per-op array
    // (the redactor's blast-radius oracle) is asserted on by the redactor negative-control test below.
    expect(d.breakdown).toEqual({ machine: 18.3, tooling: 6.4, setup: 9.1 });
    expect(d.per_part_cost).toBe(42.5); // the FE key the page derefs (was undefined -> crash)
  });

  // --- /cost/quote (shop_quote: customer pricing + cost_breakdown + $/hr in notes) ---
  it("ANON /cost/quote -> 200, pricing survives, cost_breakdown emptied, $/hr scrubbed from notes", async () => {
    const { status, result } = await post("/api/v1/cost/quote", { customer: "ACME" }, false);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    // Customer pricing PRESERVED:
    expect(d.pricing).toEqual({ unit_price: 63.5, quantity: 25, subtotal: 1587.5, currency: "USD" });
    expect(d.lead_time_days).toBe(8);
    expect(d.quote_number).toBe("Q-ABC123");
    // Internal cost_breakdown EMPTIED:
    expect(d.cost_breakdown).toEqual({});
    // notes: the $/hr rate entry is GONE; the customer-safe entries survive:
    const notes = d.notes as string[];
    expect(notes.some((n) => /\$.*\/hr/i.test(n))).toBe(false);                 // no rate string
    expect(notes.some((n) => n.includes("Volume discount"))).toBe(true);       // customer note kept
    expect(notes.some((n) => n.includes("Tool life"))).toBe(true);             // (no rate) kept
  });

  it("ANON /cost/quote -> wire carries the customer price but NOT the $/hr rate / cost_breakdown", async () => {
    const { rawBody } = await post("/api/v1/cost/quote", {}, false);
    expect(rawBody).toContain("63.5");           // customer unit_price survives
    expect(rawBody).not.toContain("$137/hr");    // the rate string is scrubbed
    expect(rawBody).not.toContain("machine_rate_hr"); // cost_breakdown internal key gone
  });

  it("AUTHENTICATED /cost/quote -> 200 with the FULL cost_breakdown + the rate note", async () => {
    const { status, result } = await post("/api/v1/cost/quote", {}, true);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    expect(Array.isArray(d.cost_breakdown)).toBe(true);
    expect((d.notes as string[]).some((n) => n.includes("$137/hr"))).toBe(true);
  });

  // --- /pipeline/quote (process_cost, same as /cost/estimate) ---
  it("ANON /pipeline/quote -> 200, cost stack stripped (same gate as /cost/estimate)", async () => {
    const { status, result } = await post("/api/v1/pipeline/quote", { material: "steel" }, false);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    expect(d).not.toHaveProperty("total_cost_per_part");
    expect(d.inputs).toEqual({});
    expect(d.breakdown).toEqual({});
  });

  it("AUTHENTICATED /pipeline/quote -> 200 with the FULL cost stack", async () => {
    const { status, result } = await post("/api/v1/pipeline/quote", {}, true);
    expect(status).toBe(200);
    expect((result as Record<string, unknown>).total_cost_per_part).toBe(42.5);
  });

  // --- ADVERSARIAL: malformed / partial shapes must not throw or over-redact ---
  it("ANON /cost/quote with EMPTY notes array -> still 200, notes stays empty (no throw)", async () => {
    // Drive the pure helper directly with an empty-notes shop_quote shape:
    const out = redactShopQuoteNotes({ pricing: { unit_price: 1 }, notes: [] }) as Record<string, unknown>;
    expect(out.notes).toEqual([]);
  });

  it("redactShopQuoteNotes leaves a result without a notes array untouched (identity)", () => {
    const noNotes = { pricing: { unit_price: 1 } };
    expect(redactShopQuoteNotes(noNotes)).toBe(noNotes); // returns the same ref (no clone) when no notes
    expect(redactShopQuoteNotes(null)).toBe(null);
    expect(redactShopQuoteNotes("x")).toBe("x");
  });

  // --- NEGATIVE CONTROL (R9): prove the shared redactor + scrubber have teeth on these shapes ---
  it("redactInternalMarginFields strips the process_cost shape (flat keys + nested blocks)", () => {
    const out = redactInternalMarginFields(processCostResult()) as Record<string, unknown>;
    expect(out).not.toHaveProperty("total_cost_per_part");
    expect(out).not.toHaveProperty("tool_cost_per_part");
    expect(out).not.toHaveProperty("setup_cost_per_part");
    expect(out).not.toHaveProperty("machine_cost");
    expect(out.breakdown).toEqual({});
    expect(out.inputs).toEqual({});
    expect(out.cycle_time_min).toBe(12.2); // process metric survives
    expect(JSON.stringify(out)).not.toContain("machine_rate_per_hour");
  });

  it("redactShopQuoteNotes scrubs the $/hr note while keeping customer notes", () => {
    const out = redactShopQuoteNotes(shopQuoteResult()) as Record<string, unknown>;
    const notes = out.notes as string[];
    expect(notes.some((n) => /\$.*\/hr/i.test(n))).toBe(false);
    expect(notes.length).toBe(3); // 4 original - 1 rate note
    expect(notes).toContain("Volume discount may apply -- contact sales");
  });
});

/**
 * T-COSTPAGE-SHAPE -- the FE CostEstimatorPage derefs result.per_part_cost / result.total_cost /
 * Object.entries(result.breakdown), but process_cost emits total_cost_per_part / machine_cost / a
 * per-OP breakdown ARRAY -- the shapes NEVER matched so the page threw on undefined.toFixed and was
 * dead for every caller. adaptCostEstimate (cost.ts) reconciles the route output to the FE contract.
 * ORDER in the /estimate handler: redact-if-anon FIRST, adapt SECOND -- so an anon caller gets the
 * cost-stripped result (adapter sees no per-part number and passes through, no fabricated FE cost keys),
 * while an authed caller gets the engine shape mapped to the FE shape.
 *
 * Reference values from processCostResult(): total_cost_per_part 42.5, machine_cost 18.3,
 * tool_cost_per_part 6.4, setup_cost_per_part 9.1, batch_size 25 -> per_part_cost 42.5,
 * total_cost 42.5*25=1062.5, breakdown {machine:18.3, tooling:6.4, setup:9.1}.
 */
describe("T-COSTPAGE-SHAPE: adaptCostEstimate reconciles process_cost -> FE CostEstimate", () => {
  // --- the integrated /estimate handler: authed gets the FE shape, anon gets stripped+passed-through ---
  it("AUTHENTICATED /cost/estimate -> FE-shaped result the page can render (per_part_cost/total_cost/breakdown map)", async () => {
    const { status, result } = await post("/api/v1/cost/estimate", {}, true);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    // The FE keys the page derefs now resolve (were undefined -> crash before):
    expect(d.per_part_cost).toBe(42.5);            // <- total_cost_per_part
    expect(d.total_cost).toBe(1062.5);             // <- 42.5 * batch_size 25
    // The category breakdown the FE renders -- only the 3 real engine components:
    expect(d.breakdown).toEqual({ machine: 18.3, tooling: 6.4, setup: 9.1 });
    // The original engine fields are still present (additive adapter, authed sees everything):
    expect(d.total_cost_per_part).toBe(42.5);
    expect(d.cycle_time_min).toBe(12.2);
  });

  it("ANON /cost/estimate -> redacted FIRST so the adapter introduces NO FE cost keys (secure empty, no leak)", async () => {
    const { status, result, rawBody } = await post("/api/v1/cost/estimate", {}, false);
    expect(status).toBe(200);
    const d = result as Record<string, unknown>;
    // redact-then-adapt: total_cost_per_part is stripped before the adapter runs, so the adapter passes
    // through and does NOT fabricate per_part_cost/total_cost from the (now absent) cost basis.
    expect(d).not.toHaveProperty("per_part_cost");
    expect(d).not.toHaveProperty("total_cost");
    expect(d).not.toHaveProperty("total_cost_per_part");
    // breakdown stays the redactor's emptied {} (NOT the adapter's {machine,tooling,setup}):
    expect(d.breakdown).toEqual({});
    // and the raw wire carries none of the cost-basis numbers via the FE keys either:
    expect(rawBody).not.toContain("1062.5"); // would be total_cost if the adapter had fabricated it
    expect(rawBody).not.toContain("\"per_part_cost\"");
  });

  // --- the pure adapter: reference-value mapping + adversarial pass-through ---
  it("adaptCostEstimate maps the full process_cost shape with concrete reference values", () => {
    const out = adaptCostEstimate(processCostResult()) as Record<string, unknown>;
    expect(out.per_part_cost).toBe(42.5);
    expect(out.total_cost).toBe(1062.5);
    expect(out.breakdown).toEqual({ machine: 18.3, tooling: 6.4, setup: 9.1 });
  });

  it("adaptCostEstimate with no batch_size defaults total_cost to per-part * 1", () => {
    const out = adaptCostEstimate({
      total_cost_per_part: 30, machine_cost: 20, tool_cost_per_part: 5, setup_cost_per_part: 5,
    }) as Record<string, unknown>;
    expect(out.per_part_cost).toBe(30);
    expect(out.total_cost).toBe(30);                 // batch defaults to 1
    expect(out.breakdown).toEqual({ machine: 20, tooling: 5, setup: 5 });
  });

  it("adaptCostEstimate passes through a result missing total_cost_per_part (already-FE-shaped or redacted)", () => {
    // An anon-redacted result (cost keys gone) -> adapter must NOT invent FE cost keys:
    const redacted = { cycle_time_min: 12.2, breakdown: {}, inputs: {} };
    const out = adaptCostEstimate(redacted) as Record<string, unknown>;
    expect(out).not.toHaveProperty("per_part_cost");
    expect(out).not.toHaveProperty("total_cost");
    expect(out.breakdown).toEqual({});               // untouched (stays the redactor's {})
  });

  it("adaptCostEstimate ignores a non-numeric total_cost_per_part (corrupt input, no throw)", () => {
    const out = adaptCostEstimate({ total_cost_per_part: "oops", batch_size: 3 });
    expect(out).toEqual({ total_cost_per_part: "oops", batch_size: 3 }); // identity-ish, no FE keys
  });

  it("adaptCostEstimate is identity on null / non-object (no throw)", () => {
    expect(adaptCostEstimate(null)).toBe(null);
    expect(adaptCostEstimate("x")).toBe("x");
    expect(adaptCostEstimate(42)).toBe(42);
  });

  it("adaptCostEstimate defaults missing component costs to 0 (partial engine output)", () => {
    // Only total + machine present; tooling/setup absent -> 0, never undefined in the breakdown.
    const out = adaptCostEstimate({ total_cost_per_part: 50, machine_cost: 50 }) as Record<string, unknown>;
    expect(out.breakdown).toEqual({ machine: 50, tooling: 0, setup: 0 });
    expect(out.total_cost).toBe(50);
  });
});
