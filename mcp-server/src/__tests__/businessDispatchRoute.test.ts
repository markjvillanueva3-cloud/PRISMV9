/**
 * HOTEL-NETPLAT-UI / U-VNET-ROUTE — POST /api/v1/business/dispatch
 *
 * Verifies the secured generic business-dispatch surface: deny-by-default allowlist (the load-bearing
 * security property — a financial/PII action must be UNREACHABLE), verbatim dispatcher passthrough so
 * the client's unwrapBusiness sees the real shape, and fail-loud error surfacing. Drives the Express
 * router directly (no network), mocking only the auth middleware (real auth is covered elsewhere).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Role is varied per-request via the `x-test-roles` header (comma-separated). An ABSENT header keeps the
// historical default ["lead"] so pre-existing tests are unaffected; an EMPTY header ("") => no roles.
vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: any, _res: any, next: () => void) => {
    req.userId = "test-user";
    const hdr = req.headers["x-test-roles"];
    req.userRoles = hdr === undefined ? ["lead"] : String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
    next();
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createBusinessRouter } from "../routes/business.js";
import type { CallToolFn } from "../routes/index.js";

let server: Server;
let baseUrl: string;
const TEST_TOKEN = "Bearer test-token";

// Records every callTool invocation so we can assert the route forwards (tool, action, params)
// faithfully, and returns per-action shapes that mirror the REAL businessDispatcher output:
//   vendor_catalog_query → bare VendorRecord[]      (no envelope)
//   vendor_rank          → { success, data }
//   __throws__           → simulates a handler throw collapsed by callTool to { error }
const calls: Array<{ tool: string; action: string; params: Record<string, unknown> }> = [];
const callTool: CallToolFn = vi.fn(async (tool: string, action: string, params: any = {}) => {
  calls.push({ tool, action, params });
  if (action === "vendor_catalog_query") {
    return [
      { name: "Niagara Cutter", vendor_type: "tool-maker", categories: ["end-mills"], regions: ["US"] },
    ];
  }
  if (action === "vendor_rank") {
    return { success: true, data: [{ vendor_id: "V-001", composite_score: 0.91, tier: "preferred" }] };
  }
  if (action === "vendor_compute_scorecard") {
    // REAL shape when an engine THROWS: dispatcherError envelope (success:false + error + details/stack),
    // which callTool parses from the MCP content payload. NOT a bare { error }.
    return {
      success: false,
      error: "VendorPerformanceTrackerEngine.computeScorecard: vendor_id required",
      action,
      dispatcher: "prism_business",
      details: { stack: "Error: vendor_id required\n    at computeScorecard (VendorPerformanceTrackerEngine.ts:104)" },
    };
  }
  if (action === "handoff_list") {
    // hotel-portal READ (hotelBusiness.ts) — allowlisted; proves the route is not vendor-only.
    return { success: true, data: [{ id: "H-1", status: "pending" }] };
  }
  if (action === "vendor_list_all") {
    throw new Error("simulated dispatcher crash");
  }
  if (action.startsWith("handoff_")) {
    // role-gated workflow WRITE family (U-HOTEL-ALLOWLIST-WRITE-ENABLE) — success shape so the
    // authorized path returns 200; handoff_list/handoff_stalled reads are handled above.
    return { success: true, data: { handoff_id: (params as any)?.handoff_id ?? "H-1", status: "counterparty_accepted" } };
  }
  return { success: true, data: null };
});

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1/business", createBusinessRouter(callTool));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (addr && typeof addr === "object") baseUrl = `http://127.0.0.1:${addr.port}/api/v1/business`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function dispatch(body: unknown, roles?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: TEST_TOKEN };
  if (roles !== undefined) headers["x-test-roles"] = roles; // comma-separated; "" => no roles
  const res = await fetch(`${baseUrl}/dispatch`, { method: "POST", headers, body: JSON.stringify(body) });
  const parsed = await res.json().catch(() => ({}));
  return { status: res.status, body: parsed };
}

describe("POST /api/v1/business/dispatch — security gate (deny-by-default)", () => {
  it("REJECTS a financial action that is not on the allowlist with 403 (never reaches the dispatcher)", async () => {
    const before = calls.length;
    const { status, body } = await dispatch({ action: "payroll_run", params: { period: "2026-05" } });
    expect(status).toBe(403);
    expect(body.error).toMatch(/not browser-dispatchable/);
    // The load-bearing property: callTool was NOT invoked for the denied action.
    expect(calls.length).toBe(before);
  });

  it("REJECTS gl_journal_entry and marketplace_escrow_deposit (financial writes) with 403", async () => {
    for (const action of ["gl_journal_entry", "marketplace_escrow_deposit", "bill_payment_run"]) {
      const { status } = await dispatch({ action, params: {} });
      expect(status).toBe(403);
    }
  });

  it("DENIES a write that is in NEITHER list (order_create) with 403 -- only the curated write-map opens", async () => {
    const before = calls.length;
    const { status, body } = await dispatch({ action: "order_create", params: { total: 1000 } });
    expect(status).toBe(403);
    expect(body.error).toMatch(/not browser-dispatchable/);
    expect(calls.length).toBe(before); // never reached the dispatcher
  });

  it("returns 400 when no action is supplied", async () => {
    const { status, body } = await dispatch({ params: {} });
    expect(status).toBe(400);
    expect(body.error).toMatch(/action is required/);
  });
});

describe("POST /api/v1/business/dispatch — allowlisted passthrough", () => {
  it("forwards an allowlisted action to prism_business with its params and returns the BARE array verbatim", async () => {
    const before = calls.length;
    const { status, body } = await dispatch({
      action: "vendor_catalog_query",
      params: { filter: { category: "end-mills" } },
    });
    expect(status).toBe(200);
    // verbatim dispatcher output (bare array) — unwrapBusiness on the client handles this shape
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].name).toBe("Niagara Cutter");
    // the route forwarded (tool, action, params) faithfully
    const last = calls[calls.length - 1];
    expect(last.tool).toBe("prism_business");
    expect(last.action).toBe("vendor_catalog_query");
    expect(last.params).toEqual({ filter: { category: "end-mills" } });
    expect(calls.length).toBe(before + 1);
  });

  it("returns the { success, data } envelope verbatim for vendor_rank", async () => {
    const { status, body } = await dispatch({ action: "vendor_rank", params: { window_days: 90 } });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0].tier).toBe("preferred");
  });

  it("allows an allowlisted hotel-portal READ (handoff_list) — the route is not vendor-only", async () => {
    const { status, body } = await dispatch({ action: "handoff_list", params: { status: "pending" } });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0].status).toBe("pending");
  });

  it("defaults params to {} when omitted or non-object", async () => {
    await dispatch({ action: "vendor_rank" });
    expect(calls[calls.length - 1].params).toEqual({});
    await dispatch({ action: "vendor_rank", params: ["not", "an", "object"] });
    expect(calls[calls.length - 1].params).toEqual({});
  });
});

describe("POST /api/v1/business/dispatch — fail-loud error surfacing", () => {
  it("surfaces a dispatcherError {success:false,…} as 400 with a CLEAN message — no stack/details leak", async () => {
    const { status, body } = await dispatch({ action: "vendor_compute_scorecard", params: {} });
    expect(status).toBe(400);
    expect(body.error).toMatch(/vendor_id required/);
    // R12 + info-hygiene: ONLY { error } reaches the browser — the engine stack/details/dispatcher
    // fields from the dispatcherError envelope are stripped. The key-set assertion proves it.
    expect(Object.keys(body)).toEqual(["error"]);
  });

  it("returns 500 if callTool itself rejects (defense-in-depth — real callTool catches internally and returns {error}→400, but the route must never 200 on an unexpected throw)", async () => {
    const { status, body } = await dispatch({ action: "vendor_list_all", params: {} });
    expect(status).toBe(500);
    expect(body.error).toMatch(/simulated dispatcher crash/);
  });
});

describe("POST /api/v1/business/dispatch — write-role gate (U-HOTEL-ALLOWLIST-WRITE-ENABLE)", () => {
  const OPENED_WRITES = [
    "handoff_counterparty_respond",
    "handoff_manager_approve",
    "handoff_mark_executed",
    "handoff_cancel",
  ];

  it.each(OPENED_WRITES)(
    "ALLOWS opened write '%s' for a manager-tier role (lead) -- reaches the dispatcher",
    async (action) => {
      const before = calls.length;
      const { status } = await dispatch({ action, params: { handoff_id: "H-1", accept: true } }, "lead");
      expect(status).toBe(200);
      expect(calls.length).toBe(before + 1);
      expect(calls[calls.length - 1].action).toBe(action);
    },
  );

  it("ALLOWS an opened write for an admin role (admin is manager-tier)", async () => {
    const before = calls.length;
    const { status } = await dispatch({ action: "handoff_cancel", params: { handoff_id: "H-1" } }, "admin");
    expect(status).toBe(200);
    expect(calls.length).toBe(before + 1);
  });

  it.each(["lead", "supervisor", "hr_manager", "admin"])(
    "ALLOWS every manager-tier role '%s' (full MANAGER_TIER_ROLES coverage)",
    async (role) => {
      const before = calls.length;
      const { status } = await dispatch({ action: "handoff_mark_executed", params: { handoff_id: "H-1" } }, role);
      expect(status).toBe(200);
      expect(calls.length).toBe(before + 1);
    },
  );

  it("DENIES an opened write for a NON-manager role (viewer) with 403 -- never reaches the dispatcher", async () => {
    const before = calls.length;
    const { status, body } = await dispatch(
      { action: "handoff_counterparty_respond", params: { handoff_id: "H-1", accept: true } },
      "viewer",
    );
    expect(status).toBe(403);
    expect(body.error).toMatch(/requires one of role/);
    expect(calls.length).toBe(before);
  });

  it("DENIES an opened write when the session carries NO roles (empty header) with 403", async () => {
    const before = calls.length;
    const { status, body } = await dispatch(
      { action: "handoff_manager_approve", params: { handoff_id: "H-1" } },
      "",
    );
    expect(status).toBe(403);
    expect(body.error).toMatch(/requires one of role/);
    expect(calls.length).toBe(before);
  });

  it("keeps FINANCIAL / payroll-downstream writes 403 EVEN for admin -- they are in neither list", async () => {
    for (const action of ["po_approve", "hr_pto_approve", "pto_approve_request", "payroll_run", "gl_journal_entry"]) {
      const before = calls.length;
      const { status, body } = await dispatch({ action, params: {} }, "admin");
      expect(status).toBe(403);
      expect(body.error).toMatch(/not browser-dispatchable/);
      expect(calls.length).toBe(before); // financial write never reaches the dispatcher, role notwithstanding
    }
  });

  it("a read action still works for any authenticated session regardless of role header", async () => {
    const { status, body } = await dispatch({ action: "handoff_list", params: {} }, "viewer");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
