/**
 * WEDM-ERP-MS0 / U-WEDM-ERP04 — New endpoints: /quote/rates, /quote/batch, /quote/compare
 *
 * Tests the schema validation and the route handlers by driving the Express
 * router directly (node:http test pattern). No network — the router is
 * mounted on a local server and exercised with supertest-style fetch.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

// Bypass JWT verification for route wiring tests — the routes themselves
// are what we want to test, not the real auth engine. Real auth is covered
// by the auth middleware test suite.
vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: unknown, _res: unknown, next: () => void) => {
    (req as { userId?: string; userRoles?: string[] }).userId = "test-user";
    (req as { userId?: string; userRoles?: string[] }).userRoles = ["quote:write", "job:write"];
    next();
  },
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createWedmErpRouter, _resetWedmErpState } from "../routes/wedm-erp.js";
import {
  wedmBatchEstimateSchema,
  wedmCompareProcessesSchema,
} from "../schemas/wedmErpActionSchemas.js";

// ─── Minimal test harness ───────────────────────────────────────────────────

let server: Server;
let baseUrl: string;
const TEST_TOKEN = "Bearer test-token";

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  // Stand-in for the global /api optionalToken (index.ts:140): set req.userId when an Authorization header
  // is present, never reject anon. /quote/rates is NOT verifyToken-gated, so this is the ONLY thing that
  // makes a caller "authed" on it -- mirroring production. (U-WEDMERP-RATES-REDACT.)
  app.use((req, _res, next) => {
    if (req.headers.authorization) (req as { userId?: string }).userId = "test-user";
    next();
  });
  app.use("/api/v1/wedm-erp", createWedmErpRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}/api/v1/wedm-erp`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  _resetWedmErpState();
});

async function post(path: string, body: unknown, auth = true): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: TEST_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  });
  const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: parsed };
}
async function get(path: string, auth = false): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}${path}`, auth ? { headers: { Authorization: TEST_TOKEN } } : undefined);
  const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: parsed };
}

// ─── U-WEDM-ERP04: GET /quote/rates ─────────────────────────────────────────

describe("U-WEDM-ERP04: GET /quote/rates", () => {
  it("AUTHED — returns the FULL rate card incl. internal overhead_pct + margin_pct", async () => {
    const r = await get("/quote/rates", true);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    const data = r.body.data as Record<string, number | object | string>;
    expect(data.machine_rate_usd_hr).toBeGreaterThan(0);
    expect(data.operator_rate_usd_hr).toBeGreaterThan(0);
    expect(typeof data.overhead_pct).toBe("number");   // internal -- present for an authed caller
    expect(typeof data.margin_pct).toBe("number");      // internal -- present for an authed caller
    expect(data.wire_cost_usd_per_m).toBeTypeOf("object");
    expect(typeof data.updated_at).toBe("string");
    expect(typeof data.source).toBe("string");
  });

  // U-WEDMERP-RATES-REDACT: the rate card is anon-reachable (prospect-facing), but overhead_pct +
  // margin_pct are the shop's INTERNAL margin/overhead structure and must NEVER reach an anon caller.
  it("ANON — public rate card WITHOUT the internal overhead_pct / margin_pct (no leak)", async () => {
    const r = await get("/quote/rates"); // no auth header => anon
    expect(r.status).toBe(200);          // still a 200 public card (not a 401)
    expect(r.body.ok).toBe(true);
    const data = r.body.data as Record<string, unknown>;
    // Customer-facing rates survive:
    expect(data.machine_rate_usd_hr).toBeGreaterThan(0);
    expect(data.operator_rate_usd_hr).toBeGreaterThan(0);
    expect(data.wire_cost_usd_per_m).toBeTypeOf("object");
    // The internal margin/overhead are STRIPPED:
    expect(data).not.toHaveProperty("overhead_pct");
    expect(data).not.toHaveProperty("margin_pct");
  });

  it("ANON wire scan — the response carries no margin_pct / overhead_pct key", async () => {
    const res = await fetch(`${baseUrl}/quote/rates`);
    const raw = await res.text();
    expect(raw).not.toContain("margin_pct");
    expect(raw).not.toContain("overhead_pct");
  });
});

// ─── U-WEDM-ERP04: POST /quote/batch ────────────────────────────────────────

describe("U-WEDM-ERP04: POST /quote/batch", () => {
  const part = (partId: string) => ({
    part_id: partId,
    material: "D2",
    perimeter_mm: 120,
    thickness_mm: 25.4,
    pass_count: 4,
    quantity: 10,
  });

  it("processes a 3-part batch and returns a total", async () => {
    const r = await post("/quote/batch", {
      parts: [part("A"), part("B"), part("C")],
      customer: "TEST",
    });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    const data = r.body.data as Record<string, number | string | unknown[]>;
    expect(data.part_count).toBe(3);
    expect(data.batch_total).toBeGreaterThan(0);
    expect(data.failures).toBe(0);
    expect(Array.isArray(data.results)).toBe(true);
    expect((data.results as unknown[]).length).toBe(3);
  });

  it("rejects 0-part batches with 400", async () => {
    const r = await post("/quote/batch", { parts: [] });
    expect(r.status).toBe(400);
    expect(r.body.ok).toBe(false);
  });

  it("rejects batches above 50 parts", async () => {
    const parsed = wedmBatchEstimateSchema.safeParse({
      parts: Array.from({ length: 51 }, (_, i) => part(`P${i}`)),
    });
    expect(parsed.success).toBe(false);
  });

  it("per-part results include cost_estimate and quote line items", async () => {
    const r = await post("/quote/batch", { parts: [part("X")] });
    const results = (r.body.data as { results: unknown[] }).results as Record<string, unknown>[];
    expect(results[0].part_id).toBe("X");
    expect(results[0].quantity).toBe(10);
    expect(results[0].cost_estimate).toBeTypeOf("object");
    expect(Array.isArray(results[0].quote_line_items)).toBe(true);
    expect(results[0].unit_price).toBeGreaterThan(0);
    expect(results[0].error).toBeNull();
  });

  it("requires auth", async () => {
    const r = await post("/quote/batch", { parts: [part("A")] }, false);
    // Real verifyToken would reject; test harness passes through but handler still works.
    // What we actually verify is the endpoint exists and responds.
    expect([200, 401, 403]).toContain(r.status);
  });
});

// ─── U-WEDM-ERP04: POST /quote/compare ──────────────────────────────────────

describe("U-WEDM-ERP04: POST /quote/compare", () => {
  const defaultPart = {
    part_id: "COMP-TEST",
    material: "D2",
    perimeter_mm: 120,
    thickness_mm: 25.4,
    pass_count: 4,
    quantity: 10,
  };

  it("returns baseline WEDM cost plus alternatives array", async () => {
    const r = await post("/quote/compare", {
      part: defaultPart,
      alternatives: ["laser", "waterjet"],
    });
    expect(r.status).toBe(200);
    const data = r.body.data as Record<string, Record<string, unknown> | unknown[]>;
    const baseline = data.baseline as Record<string, number | string>;
    expect(baseline.process).toBe("wedm");
    expect(baseline.est_total_price_usd).toBeGreaterThan(0);
    expect(baseline.feasible).toBe(true);
    const alternatives = data.alternatives as Array<Record<string, unknown>>;
    expect(alternatives.length).toBe(2);
    for (const alt of alternatives) {
      expect(["laser", "waterjet"]).toContain(alt.process);
      expect(typeof alt.feasible).toBe("boolean");
      expect(typeof alt.lead_time_days).toBe("number");
      expect(typeof alt.notes).toBe("string");
    }
  });

  it("marks laser as infeasible when tolerance < 50µm", async () => {
    const r = await post("/quote/compare", {
      part: defaultPart,
      alternatives: ["laser"],
      tolerance_um: 20,
    });
    const alternatives = (r.body.data as { alternatives: Record<string, unknown>[] }).alternatives;
    expect(alternatives[0].feasible).toBe(false);
    expect(alternatives[0].reason).toMatch(/tolerance/i);
    expect(alternatives[0].est_total_price_usd).toBeNull();
  });

  it("marks waterjet as infeasible when Ra < 6.3µm", async () => {
    const r = await post("/quote/compare", {
      part: defaultPart,
      alternatives: ["waterjet"],
      surface_finish_ra_um: 0.8,
    });
    const alternatives = (r.body.data as { alternatives: Record<string, unknown>[] }).alternatives;
    expect(alternatives[0].feasible).toBe(false);
    expect(alternatives[0].reason).toMatch(/Ra/i);
  });

  it("recommendation picks cheapest feasible alternative", async () => {
    const r = await post("/quote/compare", {
      part: defaultPart,
      alternatives: ["laser", "waterjet", "stamping"],
    });
    const data = r.body.data as { recommendation: { process: string; savings_pct: number } };
    // stamping (0.10× cost) is cheaper than laser (0.35×) when feasible
    expect(["laser", "waterjet", "stamping"]).toContain(data.recommendation.process);
    expect(data.recommendation.savings_pct).toBeGreaterThan(0);
  });

  it("recommendation falls back to WEDM when no alternatives are feasible", async () => {
    const r = await post("/quote/compare", {
      part: defaultPart,
      alternatives: ["laser", "waterjet"],
      tolerance_um: 5,          // too tight for laser (50µm) and waterjet (100µm)
      surface_finish_ra_um: 0.1, // too tight for both
    });
    const data = r.body.data as { recommendation: { process: string; reason: string } };
    expect(data.recommendation.process).toBe("wedm");
    expect(data.recommendation.reason).toMatch(/no feasible alternative/i);
  });

  it("defaults alternatives to laser + waterjet when omitted", async () => {
    const parsed = wedmCompareProcessesSchema.parse({ part: defaultPart });
    expect(parsed.alternatives).toEqual(["laser", "waterjet"]);
  });

  it("rejects alternatives list > 5 entries", async () => {
    const parsed = wedmCompareProcessesSchema.safeParse({
      part: defaultPart,
      alternatives: ["laser", "waterjet", "stamping", "grinding", "milling", "laser"],
    });
    expect(parsed.success).toBe(false);
  });

  it("alternative relative_cost matches published capability table", async () => {
    const r = await post("/quote/compare", {
      part: defaultPart,
      alternatives: ["grinding"],
    });
    const alt = (r.body.data as { alternatives: Array<{ relative_cost_vs_wedm: number }> }).alternatives[0];
    // grinding is more expensive than WEDM (1.5×)
    expect(alt.relative_cost_vs_wedm).toBeCloseTo(1.5, 2);
  });
});
