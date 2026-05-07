/**
 * WEDM-ERP-MS0 / U-WEDM-ERP05 — Quote lifecycle routes
 *
 *   POST /quote/create           (already existed — now persists)
 *   GET  /quote/:id              (new — read persisted quote)
 *   PUT  /quote/:id              (new — update existing quote)
 *   POST /quote/:id/send         (new — mark as sent + return receipt)
 *   GET  /quote/:id/pdf          (new — render text/plain + JSON envelope)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: unknown, _res: unknown, next: () => void) => {
    (req as { userId?: string; userRoles?: string[] }).userId = "test-user";
    (req as { userId?: string; userRoles?: string[] }).userRoles = ["quote:write"];
    next();
  },
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createWedmErpRouter, _resetWedmErpState } from "../routes/wedm-erp.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
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

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test", ...headers },
    body: JSON.stringify(body),
  });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: b };
}
async function put(path: string, body: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: b };
}
async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: "Bearer test", ...headers },
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, body: b, text: null as string | null, contentType };
  }
  const text = await res.text();
  return { status: res.status, body: null as Record<string, unknown> | null, text, contentType };
}

async function createQuote(overrides: Record<string, unknown> = {}): Promise<{ quote_number: string; quote: Record<string, unknown> }> {
  const r = await post("/quote/create", {
    cost_estimate: {
      totals: { machine_time_usd: 100, wire_usd: 20, consumables_usd: 5, overhead_usd: 25, subtotal_usd: 150, margin_usd: 30, total_usd: 180 },
      per_part: { total_usd: 18 },
      breakdowns: {
        machine_time: { machine_rate_per_hr: 75, setup_hrs: 1, cutting_hrs: 0.33, setup_cost: 75, cutting_cost: 25, total_cost: 100 },
        wire: { wire_type: "brass", wire_diameter_mm: 0.25, cutting_hrs: 0.33, wire_speed_mm_per_min: 2.5, wire_length_m: 49.5, wire_cost_per_meter: 0.4, total_cost: 20 },
        consumables: { cutting_hrs: 0.33, cost_per_hr: 15, total_cost: 5 },
        overhead: { overhead_pct: 0.15, subtotal: 125, overhead_cost: 18.75 },
        margin: { subtotal_with_overhead: 143.75, margin_pct: 0.2, margin_cost: 28.75 },
      },
    },
    quantity: 10,
    customer: "TEST CUSTOMER",
    part_name: "Test Die",
    lead_time_days: 14,
    valid_days: 30,
    ...overrides,
  });
  expect(r.status).toBe(200);
  const q = (r.body.data as { quote: Record<string, unknown> }).quote;
  return { quote_number: String(q.quote_number), quote: q };
}

// ─── POST /quote/create ─────────────────────────────────────────────────────

describe("U-WEDM-ERP05: POST /quote/create (now persists)", () => {
  it("persists created quote so GET /quote/:id can find it", async () => {
    const { quote_number } = await createQuote();
    const getResp = await get(`/quote/${quote_number}`);
    expect(getResp.status).toBe(200);
    expect((getResp.body!.data as { quote: { quote_number: string } }).quote.quote_number).toBe(quote_number);
  });

  it("returns auto-generated quote_number when not supplied", async () => {
    const { quote_number } = await createQuote();
    expect(quote_number).toMatch(/^Q-WEDM-\d+-[A-Z0-9]{4}$/);
  });

  it("accepts caller-supplied quote_number", async () => {
    const { quote_number } = await createQuote({ quote_number: "Q-CUSTOM-001" });
    expect(quote_number).toBe("Q-CUSTOM-001");
  });
});

// ─── GET /quote/:id ─────────────────────────────────────────────────────────

describe("U-WEDM-ERP05: GET /quote/:id", () => {
  it("returns 404 for unknown quote", async () => {
    const r = await get("/quote/DOES-NOT-EXIST");
    expect(r.status).toBe(404);
    expect(r.body!.ok).toBe(false);
  });

  it("returns created quote with revision=1", async () => {
    const { quote_number } = await createQuote();
    const r = await get(`/quote/${quote_number}`);
    const q = (r.body!.data as { quote: { revision: number } }).quote;
    expect(q.revision).toBe(1);
  });
});

// ─── PUT /quote/:id ─────────────────────────────────────────────────────────

describe("U-WEDM-ERP05: PUT /quote/:id", () => {
  it("updates the customer field and increments revision", async () => {
    const { quote_number } = await createQuote();
    const r = await put(`/quote/${quote_number}`, { customer: "UPDATED CUSTOMER" });
    expect(r.status).toBe(200);
    const q = (r.body.data as { quote: { customer: string; revision: number } }).quote;
    expect(q.customer).toBe("UPDATED CUSTOMER");
    expect(q.revision).toBe(2);
  });

  it("recomputes unit_price when quantity changes", async () => {
    const { quote_number, quote } = await createQuote();
    const originalTotal = Number(quote.total_price);
    const r = await put(`/quote/${quote_number}`, { quantity: 20 });
    const q = (r.body.data as { quote: { unit_price: number; quantity: number } }).quote;
    expect(q.quantity).toBe(20);
    expect(q.unit_price).toBeCloseTo(originalTotal / 20, 5);
  });

  it("returns 404 when updating a quote that does not exist", async () => {
    const r = await put("/quote/NOPE", { customer: "X" });
    expect(r.status).toBe(404);
  });

  it("rejects updating a quote that has already been sent with 409", async () => {
    const { quote_number } = await createQuote();
    const sendResp = await post(`/quote/${quote_number}/send`, { to: "customer@example.com" });
    expect(sendResp.status).toBe(200);
    const r = await put(`/quote/${quote_number}`, { customer: "CANNOT CHANGE" });
    expect(r.status).toBe(409);
    expect(r.body.ok).toBe(false);
    expect(String(r.body.error)).toMatch(/already been sent/i);
  });

  it("rejects invalid quantity with 400", async () => {
    const { quote_number } = await createQuote();
    const r = await put(`/quote/${quote_number}`, { quantity: -5 });
    expect(r.status).toBe(400);
  });
});

// ─── POST /quote/:id/send ───────────────────────────────────────────────────

describe("U-WEDM-ERP05: POST /quote/:id/send", () => {
  it("marks quote as sent, records recipient, returns delivery receipt", async () => {
    const { quote_number } = await createQuote();
    const r = await post(`/quote/${quote_number}/send`, {
      to: "buyer@customer.com",
      cc: ["sales@shop.com"],
      message: "Please review the attached quote.",
      attach_pdf: true,
    });
    expect(r.status).toBe(200);
    const data = r.body.data as { quote: Record<string, unknown>; receipt: Record<string, unknown> };
    expect(data.quote.sent_at).toBeTypeOf("string");
    expect(data.quote.sent_to).toBe("buyer@customer.com");
    expect(data.receipt.quote_number).toBe(quote_number);
    expect(data.receipt.to).toBe("buyer@customer.com");
    expect(data.receipt.attached).toBe(true);
    expect(String(data.receipt.delivery_id)).toMatch(/^DEL-/);
    expect(data.receipt.cc).toEqual(["sales@shop.com"]);
  });

  it("rejects invalid email with 400", async () => {
    const { quote_number } = await createQuote();
    const r = await post(`/quote/${quote_number}/send`, { to: "not-an-email" });
    expect(r.status).toBe(400);
  });

  it("returns 404 when sending a nonexistent quote", async () => {
    const r = await post("/quote/NOPE/send", { to: "x@y.com" });
    expect(r.status).toBe(404);
  });

  it("message_preview truncates to 120 chars", async () => {
    const { quote_number } = await createQuote();
    const long = "A".repeat(500);
    const r = await post(`/quote/${quote_number}/send`, { to: "x@y.com", message: long });
    const preview = (r.body.data as { receipt: { message_preview: string } }).receipt.message_preview;
    expect(preview.length).toBeLessThanOrEqual(120);
  });
});

// ─── GET /quote/:id/pdf ─────────────────────────────────────────────────────

describe("U-WEDM-ERP05: GET /quote/:id/pdf", () => {
  it("returns text/plain by default with quote content", async () => {
    const { quote_number } = await createQuote();
    const r = await get(`/quote/${quote_number}/pdf`);
    expect(r.status).toBe(200);
    expect(r.contentType).toMatch(/text\/plain/);
    expect(r.text).toContain(`QUOTE ${quote_number}`);
    expect(r.text).toContain("TEST CUSTOMER");
    expect(r.text).toContain("Test Die");
    expect(r.text).toContain("TOTAL");
  });

  it("returns application/json envelope when Accept: application/json", async () => {
    const { quote_number } = await createQuote();
    const r = await get(`/quote/${quote_number}/pdf`, { Accept: "application/json" });
    expect(r.status).toBe(200);
    expect(r.contentType).toMatch(/application\/json/);
    const data = r.body!.data as { filename: string; body: string; pdf_convertible: boolean };
    expect(data.filename).toBe(`${quote_number}.txt`);
    expect(data.pdf_convertible).toBe(true);
    expect(data.body).toContain(`QUOTE ${quote_number}`);
  });

  it("returns 404 for unknown quote", async () => {
    const r = await get("/quote/NOPE/pdf", { Accept: "application/json" });
    expect(r.status).toBe(404);
  });

  it("PDF output reflects update + send lifecycle", async () => {
    const { quote_number } = await createQuote();
    await put(`/quote/${quote_number}`, { customer: "NEW CUSTOMER" });
    await post(`/quote/${quote_number}/send`, { to: "buyer@customer.com" });
    const r = await get(`/quote/${quote_number}/pdf`);
    expect(r.text).toContain("NEW CUSTOMER");
    expect(r.text).toContain("rev 2");
    expect(r.text).toMatch(/Sent to:\s+buyer@customer\.com/);
  });
});
