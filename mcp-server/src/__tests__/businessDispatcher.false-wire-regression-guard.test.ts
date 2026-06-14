/**
 * businessDispatcher.false-wire-regression-guard.test.ts
 *
 * U-HOTEL-FALSE-WIRE-REGRESSION-GUARD (slot:hotel) -- standing guard against the BUSINESS-CLEANUP
 * false-wire bug class. The BUSINESS-CLEANUP arc (commits 701210abf2, 919e40e395, c9874f0623) fixed
 * 341 "false wires" -- prism_business actions that were in the enum but routed to a placeholder/echo
 * instead of a real engine. ZERO standing test guarded that fix, so a silent regression (someone
 * re-stubs an action) would ship undetected.
 *
 * WHY THIS FILE, NOT businessDispatchRoute.test.ts:
 *   The existing route test MOCKS callTool -- it proves the deny-by-default security GATE works, but
 *   it canNOT see the real engine output, so it can NOT catch a false-wire BEHIND the gate. This guard
 *   round-trips each allowlisted action through the REAL dispatcher (registerBusinessDispatcher ->
 *   prism_business switch -> lazy engine import -> result) and asserts the result is real engine output,
 *   not a placeholder. The two files are complementary: route test = gate; this = the wires behind it.
 *
 * SCOPE: the BUSINESS_DISPATCH_ALLOWLIST (the curated browser-reachable read surface). These are the
 *   actions an authenticated ERP browser session can actually invoke, so a false-wire here is directly
 *   user-visible. All 17 are READ-ONLY (the allowlist forbids financial/PII writes), so calling them in
 *   a test has no side effects.
 *
 * R9 (test verifies intent, not behavior): the `isPlaceholder` detector is itself unit-tested against
 *   known placeholder shapes vs real shapes -- this PROVES the guard goes red on a deliberate re-stub
 *   without having to mutate production code. A real validation error (engine ran + rejected bad input)
 *   and an empty query result ([]) are REAL wires and are accepted; only stub markers, null/undefined,
 *   param-echoes, and empty success flags are flagged.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";
import { BUSINESS_DISPATCH_ALLOWLIST } from "../data/business-dispatch-allowlist.js";
import { MarketplaceSeedingEngine } from "../engines/MarketplaceSeedingEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerBusinessDispatcher(fakeServer);
  return { handler };
}

/** Invoke an action through the real dispatcher and unwrap the slimResponse text payload. */
async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text; // a bare text payload is still real output (e.g. a path string)
    }
  }
  return r;
}

/**
 * Best-effort probe params per allowlisted action. A guard does NOT need perfect fixtures: a real
 * engine either returns data (params suffice) or a real structured error (params insufficient) --
 * both are evidence of a REAL wire. A FALSE wire returns the same placeholder regardless of input.
 * Every allowlisted action MUST have an entry here (asserted below) so a newly-added action can never
 * silently escape the guard.
 */
const PROBE_PARAMS: Record<string, Record<string, any>> = {
  // vendor-network reads
  vendor_catalog_query: { limit: 5 },
  vendor_rank: { limit: 5 },
  vendor_compute_scorecard: { vendorId: "V-GUARD-PROBE" },
  vendor_list_all: {},
  // hotel-portal reads
  domain_academy_report_path: { employeeId: "E-GUARD-PROBE" },
  domain_academy_list_domains: {},
  domain_academy_list_assignments: { employeeId: "E-GUARD-PROBE" },
  handoff_list: {},
  handoff_stalled: {},
  // marketplace reads
  marketplace_rank_rfq: { rfq: { id: "RFQ-GUARD-PROBE", part: "bracket", quantity: 10 } },
  marketplace_lead_list: {},
  marketplace_lead_get: { supplierId: "S-GUARD-PROBE" }, // getLead(supplierId): leads are keyed by supplierId; seeded in beforeAll
  supplier_reputation: { supplierId: "S-GUARD-PROBE" },
  supplier_reputation_rank: {},
  geo_route_cost: { origin: "US-CT", destination: "US-CA", weightKg: 50 },
  geo_landed_cost: { origin: "US-CT", destination: "US-CA", partCost: 100, weightKg: 50 },
  geo_logistics_score: { origin: "US-CT", destination: "US-CA" },
};

/**
 * Markers that only appear in a stub / unimplemented / unknown-action / not-callable response.
 * MUST match the dispatcher's REAL shapes or a re-stub slips through (scrutiny arm-B P0, 2026-06-09):
 *   - default-case envelope `{ error: "Unknown business action: X" }` (businessDispatcher.ts default) --
 *     "business" sits between "unknown" and "action", so the match allows up to 2 intervening words.
 *   - live false-wire idiom `?? { engine: "X", note: "method not callable" }` (businessDispatcher.ts:5813+).
 */
const PLACEHOLDER_RE =
  /not[\s_-]?implemented|not[\s_-]?wired|not[\s_-]?callable|placeholder|unimplemented|coming[\s_-]?soon|\btodo\b|unknown\s+(?:\w+\s+){0,2}(?:action|tool|command)/i;

/**
 * Classify a dispatcher result as a placeholder/false-wire or a real engine response.
 * REAL (accepted): data payloads, empty query results ([]), and real engine error envelopes
 *   ({ success:false, error } where error is a genuine validation/engine message).
 * PLACEHOLDER (flagged): null/undefined, stub markers, bare param-echoes, and empty success flags.
 */
function isPlaceholder(r: any): { placeholder: boolean; reason?: string } {
  if (r === undefined || r === null) return { placeholder: true, reason: "null/undefined result" };

  let text: string;
  try {
    text = typeof r === "string" ? r : JSON.stringify(r);
  } catch {
    text = String(r);
  }
  if (PLACEHOLDER_RE.test(text)) {
    return { placeholder: true, reason: `stub marker in: ${text.slice(0, 140)}` };
  }

  if (typeof r === "object" && !Array.isArray(r)) {
    const keys = Object.keys(r);
    // bare echo of the request with no engine data
    const echoOnly = keys.length > 0 && keys.every((k) => k === "action" || k === "params" || k === "input");
    if (echoOnly) return { placeholder: true, reason: `param-echo only: {${keys.join(",")}}` };

    // a success flag with NO payload of any kind == empty stub ({ ok:true } / { success:true })
    const successish = r.success === true || r.ok === true;
    const hasPayload = keys.some((k) => !["success", "ok", "action", "params", "input"].includes(k));
    if (successish && !hasPayload) {
      return { placeholder: true, reason: `success flag with no payload: {${keys.join(",")}}` };
    }
  }
  return { placeholder: false };
}

describe("prism_business false-wire regression guard (U-HOTEL-FALSE-WIRE-REGRESSION-GUARD)", () => {
  const actions = [...BUSINESS_DISPATCH_ALLOWLIST];
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
    // Seed one real lead so marketplace_lead_get exercises the DATA path (a re-stub returning null would
    // then fail this guard). Leads are keyed by supplierId; "S-GUARD-PROBE" has no capability profile, so
    // it seeds cleanly. Uniquely named so it does not collide with other suites' marketplace data.
    MarketplaceSeedingEngine.__resetForTests();
    MarketplaceSeedingEngine.seedFromHints({
      hints: [
        {
          supplierId: "S-GUARD-PROBE",
          name: "Guard Probe Supplier",
          processes: ["cnc-milling"],
          region: "US-CT",
          sourceTag: "false-wire-guard-test",
        },
      ],
      seededAt: new Date().toISOString(),
    });
  });
  afterAll(() => {
    // Convention (sibling MarketplaceSeedingEngine.test.ts beforeEach): clear shared static lead state.
    // Safe under vitest isolate:true; also survives a future isolate:false flip (scrutiny arm-B/C P2).
    MarketplaceSeedingEngine.__resetForTests();
  });

  it("the allowlist is non-trivial and every action has a guard probe (no silent escape)", () => {
    expect(actions.length).toBeGreaterThanOrEqual(17);
    const missingProbe = actions.filter((a) => !(a in PROBE_PARAMS));
    expect(missingProbe, `allowlisted actions with no guard probe: ${missingProbe.join(", ")}`).toEqual([]);
  });

  it.each(actions)(
    "allowlisted action '%s' resolves to REAL engine output through prism_business (not a false-wire)",
    async (action) => {
      const r = await call(handler, action, PROBE_PARAMS[action] ?? {});
      const verdict = isPlaceholder(r);
      expect(
        verdict.placeholder,
        `Action '${action}' returned a placeholder/false-wire: ${verdict.reason}. ` +
          `Result head: ${(typeof r === "string" ? r : JSON.stringify(r ?? null)).slice(0, 200)}`,
      ).toBe(false);
    },
  );

  // R9 -- prove the guard provably goes RED on a re-stub, without mutating production code.
  describe("detector provably flags a re-stub (R9 intent test)", () => {
    it("FLAGS known placeholder / false-wire shapes", () => {
      expect(isPlaceholder(undefined).placeholder).toBe(true);
      expect(isPlaceholder(null).placeholder).toBe(true);
      expect(isPlaceholder({ success: true, message: "not implemented" }).placeholder).toBe(true);
      expect(isPlaceholder({ status: "TODO: wire engine" }).placeholder).toBe(true);
      expect(isPlaceholder({ ok: true }).placeholder).toBe(true);
      expect(isPlaceholder({ success: true }).placeholder).toBe(true);
      expect(isPlaceholder({ action: "vendor_rank", params: {} }).placeholder).toBe(true);
      // the REAL default-case envelope a DELETED allowlisted case falls through to (businessDispatcher.ts
      // top-level `default: result = { error: "Unknown business action: X" }`) -- the #1 re-stub regression.
      expect(isPlaceholder({ error: "Unknown business action: vendor_rank" }).placeholder).toBe(true);
      // the live `?? { note: "method not callable" }` false-wire idiom (businessDispatcher.ts:5813/5819/5825).
      expect(
        isPlaceholder({ success: true, data: { engine: "BusinessSyncEngine", note: "method not callable" } })
          .placeholder,
      ).toBe(true);
    });

    it("ACCEPTS real engine shapes (data, empty query result, real validation error)", () => {
      expect(isPlaceholder({ success: true, data: [{ id: 1 }] }).placeholder).toBe(false);
      expect(isPlaceholder([]).placeholder).toBe(false); // an empty query result is a REAL wire
      expect(isPlaceholder([{ vendorId: "V1", score: 0.82 }]).placeholder).toBe(false);
      expect(isPlaceholder({ success: false, error: "vendorId is required" }).placeholder).toBe(false);
      expect(isPlaceholder({ score: 0.82, breakdown: { onTime: 0.9 } }).placeholder).toBe(false);
      expect(isPlaceholder("H:/prism/reports/ladder/E-1.json").placeholder).toBe(false); // bare path payload
    });
  });
});
