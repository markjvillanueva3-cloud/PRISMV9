/**
 * U-MKTPRICE01 -- POST /api/v1/quoting security gate (cost-basis deny-list + admin-gated typed verbs)
 *
 * Verifies the leak closure caught by the U-MKTPRICE01 scrutiny (arm C): the generic quoting dispatch
 * surface carried only optionalToken (never rejects anonymous), so `{ action: "cost_index_prior" }`
 * leaked the shop's real cost basis unauthenticated. This test pins:
 *   1. the generic handler 403s every deny-set (cost-basis) action and NEVER reaches the dispatcher,
 *   2. the two typed cost-basis verbs are admin-only -- 401 anonymous, 403 wrong-role, 200 admin,
 *   3. customer-safe / operator actions still pass through the generic handler (no shipped page 403'd).
 *
 * Drives the Express router directly (ephemeral port, no real network). The auth mock makes verifyToken
 * populate roles from the `x-test-roles` header (absent header => no token => verifyToken 401s, mirroring
 * a real anonymous request to a verifyToken-gated route) and requireRole enforce the required role, so
 * the admin gate's block behavior is genuinely exercised -- not stubbed away.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Real-ish auth semantics so the admin gate is actually tested:
//   - verifyToken: an ABSENT `x-test-roles` header => no Authorization context => 401 (anonymous).
//     A PRESENT header (even "") => authenticated session with that role set.
//   - requireRole(...required): 401 if verifyToken did not authenticate, else 403 unless a required role
//     is held. Mirrors the real middleware/auth.js contract (auth.ts requireRole: 401 no userId, 403 wrong role).
vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: any, res: any, next: () => void) => {
    const hdr = req.headers["x-test-roles"];
    if (hdr === undefined) {
      res.status(401).json({ error: { status: 401, message: "Authentication required", code: "AUTH_REQUIRED" } });
      return;
    }
    req.userId = "test-user";
    req.userRoles = String(hdr).split(",").map((s: string) => s.trim()).filter(Boolean);
    next();
  },
  requireRole: (...required: string[]) => (req: any, res: any, next: () => void) => {
    if (!req.userId || !req.userRoles) {
      res.status(401).json({ error: { status: 401, message: "Authentication required", code: "AUTH_REQUIRED" } });
      return;
    }
    if (!req.userRoles.some((r: string) => required.includes(r))) {
      res.status(403).json({ error: { status: 403, message: `Insufficient role. Required: ${required.join(" or ")}`, code: "FORBIDDEN" } });
      return;
    }
    next();
  },
}));

import { createServer, type Server } from "http";
import express from "express";
import { createQuotingRouter } from "../routes/quoting.js";
import { QUOTING_GENERIC_DISPATCH_DENY_SET, isQuotingGenericDispatchDenied } from "../data/quoting-dispatch-allowlist.js";
import type { CallToolFn } from "../routes/index.js";

let server: Server;
let baseUrl: string;

// Records every callTool invocation so we can assert the route NEVER reaches the dispatcher for a
// denied action, and forwards the real action for an allowed one.
const calls: Array<{ tool: string; action: string; params: Record<string, unknown> }> = [];
const callTool: CallToolFn = vi.fn(async (tool: string, action: string, params: any = {}) => {
  calls.push({ tool, action, params });
  // Minimal real-shaped payloads for the actions this test forwards.
  if (action === "cost_index_prior") return { ok: true, totals: { records: 12, grossSpend: 100, creditTotal: 0, netSpend: 100, vendorCount: 3 }, categories: {}, path: "x" };
  if (action === "outbound_price_prior") return { ok: true, path: "x", minConfidence: "high", ordersProcessed: 5, recordsAvailable: 5, includedOrders: 5, advisoryOnly: true, caveat: "c", byConfidence: { high: 5, medium: 0, low: 0, none: 0 }, confirmedExtRevenue: 0, unitPrice: null, extPrice: null, orderTotal: null };
  if (action === "camera_intake_route") return { routed: true, task_class: "blueprint_to_quote" };
  return { ok: true };
});

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1/quoting", createQuotingRouter(callTool));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (addr && typeof addr === "object") baseUrl = `http://127.0.0.1:${addr.port}/api/v1/quoting`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function post(path: string, body: unknown, roles?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (roles !== undefined) headers["x-test-roles"] = roles; // present => authenticated with that role set; "" => authed, no roles
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const parsed = await res.json().catch(() => ({}));
  return { status: res.status, body: parsed };
}

describe("U-MKTPRICE01 generic quoting dispatch -- cost-basis deny-list", () => {
  it("DENIES every cost-basis action on the generic handler with 403 and NEVER reaches the dispatcher", async () => {
    for (const action of QUOTING_GENERIC_DISPATCH_DENY_SET) {
      const before = calls.length;
      const { status, body } = await post("/", { action, params: {} });
      expect(status).toBe(403);
      expect(body.error).toMatch(/not browser-dispatchable on the generic quoting surface/);
      // The load-bearing property: the denied action never reached callTool (no cost basis computed).
      expect(calls.length).toBe(before);
    }
  });

  it("the deny-set predicate agrees with the deny-set contents (no drift)", () => {
    for (const action of QUOTING_GENERIC_DISPATCH_DENY_SET) {
      expect(isQuotingGenericDispatchDenied(action)).toBe(true);
    }
    expect(isQuotingGenericDispatchDenied("camera_intake_route")).toBe(false);
    expect(isQuotingGenericDispatchDenied("quoting_public_quote")).toBe(false);
  });

  // U-MKTPRICE02 (T-MKTPRICE-FOLLOWUP) -- the 6 additional cost-side actions all three U-MKTPRICE01
  // reviewers flagged still generic-reachable. Named explicitly (the loop above auto-covers them, but
  // R9 wants the contract VISIBLE so a future entry-drop is caught here too).
  const U_MKTPRICE02_DENIED = [
    "closed_loop_provenance_check",            // outcomes[] w/ per-job estimated_cost + actuals
    "quoting_dynamic_shop_rate",               // base_rate_usd_per_hr internal $/hr
    "quoting_shop_electricity_cost",           // cost_usd + rate_usd_per_kwh
    "quoting_shop_utilities_cost",             // total_utilities_cost_usd
    "jm_die_financial_baseline",               // total_revenue_usd + by_customer/by_year
    "quoting_shop_profile_get",                // the FULL ShopProfile rate dump (raw $/kWh + $/hr basis)
    "quoting_secondary_ops_price_for_profile", // merges the shop's STORED secondary_op_overrides -> total_secondary_ops_usd
    "quoting_machine_invest_roi",              // per_hour_savings = stored incumbent rate - caller candidate -> invertible to the raw $/hr
  ] as const;

  it("the deny-set contains EXACTLY the 14 known cost-basis actions (anti-regression count contract)", () => {
    // 6 from U-MKTPRICE01 + 8 from U-MKTPRICE02 (the 7th _for_profile + 8th machine_invest_roi were both
    // caught by the 3-of-3 gate arm C -- the "deny derivatives, grep every _for_profile/stored-rate variant" class). R12.
    expect(QUOTING_GENERIC_DISPATCH_DENY_SET.size).toBe(14);
    for (const action of U_MKTPRICE02_DENIED) {
      expect(QUOTING_GENERIC_DISPATCH_DENY_SET.has(action)).toBe(true);
    }
  });

  it.each(U_MKTPRICE02_DENIED)("DENIES %s with 403 and never reaches the dispatcher", async (action) => {
    const before = calls.length;
    const { status, body } = await post("/", { action, params: {} });
    expect(status).toBe(403);
    expect(body.error).toMatch(/not browser-dispatchable on the generic quoting surface/);
    expect(calls.length).toBe(before); // no cost basis computed
  });

  // The LEAVE decisions -- these MUST stay reachable on the generic handler (each has a shipped
  // token-less frontend caller). A future "complete the set" change that denies one breaks a live
  // page; these two cases are the regression guard against that.
  const U_MKTPRICE02_LEFT = [
    "closed_loop_outcome_digest",   // QuotingCalibrationHealthPage -- rate/count telemetry, NO raw $
    "quoting_secondary_ops_price",  // PLAIN variant (caller overrides only) -- QuotingWorkbenchPage caller ->
                                    // needs auth-migration, not a blunt deny. The _for_profile variant (shop
                                    // stored rates, no caller) IS denied above -- caught by the 3-of-3 gate.
    "quoting_shop_profile_list",    // sibling of the denied _get -- returns profile IDs only, NO $ (the
                                    // textbook "complete the set" mistake: do NOT deny the _list because _get is denied)
  ] as const;

  it.each(U_MKTPRICE02_LEFT)("LEAVES %s reachable on the generic handler (shipped token-less caller)", async (action) => {
    expect(isQuotingGenericDispatchDenied(action)).toBe(false);
    const before = calls.length;
    const { status } = await post("/", { action, params: {} });
    expect(status).toBe(200); // NOT 403 -- the live page that posts this still works
    expect(calls.length).toBe(before + 1); // it DID reach the dispatcher
    expect(calls[calls.length - 1].action).toBe(action);
  });

  it("exact-match only -- a case/whitespace variant is NOT silently allowed-then-honored", async () => {
    // A variant slips past the exact Set.has deny-check, but the dispatcher uses exact `case` matching,
    // so it is an unknown action there -- the deny-check + dispatcher together are safe. We assert the
    // deny-check is exact (the variant is NOT in the deny-set) so the contract is explicit.
    expect(isQuotingGenericDispatchDenied("Cost_Index_Prior")).toBe(false);
    expect(isQuotingGenericDispatchDenied(" cost_index_prior ")).toBe(false);
  });

  it("ALLOWS a customer-safe / intake action through the generic handler (no shipped page 403'd)", async () => {
    const before = calls.length;
    const { status } = await post("/", { action: "camera_intake_route", params: { text: "PN-1234" } });
    expect(status).toBe(200);
    expect(calls.length).toBe(before + 1);
    expect(calls[calls.length - 1].action).toBe("camera_intake_route");
  });

  it("returns 400 when no action is supplied (unchanged behavior)", async () => {
    const { status, body } = await post("/", { params: {} });
    expect(status).toBe(400);
    expect(body.error).toMatch(/missing-action/);
  });
});

describe("U-MKTPRICE01 admin-gated cost-basis typed verbs", () => {
  const VERBS: Array<[string, string]> = [
    ["/cost-index-prior", "cost_index_prior"],
    ["/outbound-price-prior", "outbound_price_prior"],
  ];

  it.each(VERBS)("401s an ANONYMOUS request to %s (verifyToken blocks before the engine)", async (path) => {
    const before = calls.length;
    const { status } = await post(path, {}); // no x-test-roles => anonymous
    expect(status).toBe(401);
    expect(calls.length).toBe(before); // never reached the dispatcher
  });

  it.each(VERBS)("403s an AUTHENTICATED NON-admin request to %s", async (path) => {
    const before = calls.length;
    const { status } = await post(path, {}, "quoter"); // authed, wrong role
    expect(status).toBe(403);
    expect(calls.length).toBe(before);
  });

  it.each(VERBS)("403s an authenticated session with NO roles to %s", async (path) => {
    const before = calls.length;
    const { status } = await post(path, {}, ""); // authed, empty role set
    expect(status).toBe(403);
    expect(calls.length).toBe(before);
  });

  it.each(VERBS)("200s an ADMIN request to %s and forwards to the dispatcher", async (path, action) => {
    const before = calls.length;
    const { status, body } = await post(path, { minConfidence: "high" }, "admin");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(calls.length).toBe(before + 1);
    expect(calls[calls.length - 1].action).toBe(action);
  });
});
