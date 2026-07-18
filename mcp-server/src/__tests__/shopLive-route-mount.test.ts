/**
 * shopLive-route-mount.test.ts — FE-ROUTE-MOUNT 2026-06-18 (slot:romeo)
 *
 * Regression guard for the frontend<->backend contract gap found by
 * scripts/audit-frontend-backend-contract.mjs: the web SPA calls GET /api/shop/snapshot
 * (getShopFloorSnapshot) and GET /api/shop/jobs (getShopJobs), but routes/shopLive.ts — the
 * 19-endpoint live-shop router that serves them — was NEVER mounted in registerRoutes, so both 404'd.
 *
 * These tests mount shopLiveRouter EXACTLY as registerRoutes now does (`app.use("/api", shopLiveRouter)`)
 * and assert the SPA's two read endpoints resolve with the documented success shape (not 404), plus a
 * create->list round-trip (R9: the route is real, not a hardcoded stub) and a negative-control 404 (proves
 * the mount is path-scoped, so a pre-fix 404 was a genuine missing-mount, not a catch-all swallowing it).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// CONTRACT SYNC (U-ERP-IDOR-SELFGATE, 2026-07-02): U-ERP-SHOPCONFIG-AUTH added a router-wide
// verifyToken gate (KIOSK-exempting only GET /shop/snapshot + /shop/jobs), which left this
// pre-auth test red on trunk: anon POST /shop/job/create now 401s (it is requireRole lead+),
// and an unmatched path hits the gate (401) before Express's 404. Stub ONLY verifyToken
// (faithful x-test-roles stand-in, same as hotel-portal-auth.test.ts); requireRole stays REAL.
vi.mock("../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/auth.js")>();
  return {
    ...actual,
    verifyToken: (req: any, res: any, next: () => void) => {
      const hdr = req.headers["x-test-roles"];
      if (hdr === undefined) {
        res.status(401).json({ error: { status: 401, message: "Missing or invalid Authorization header", code: "AUTH_REQUIRED" } });
        return;
      }
      req.userId = "test-user";
      req.userRoles = String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
      next();
    },
  };
});

import shopLiveRouter from "../routes/shopLive.js";
import { registerRoutes } from "../routes/index.js";

let server: http.Server;
let port = 0;

function httpRequest(
  method: string,
  urlPath: string,
  body?: unknown,
  roles?: string,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers: Record<string, string> = {};
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(payload));
    }
    if (roles !== undefined) headers["x-test-roles"] = roles;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          let data: any = null;
          try { data = text ? JSON.parse(text) : null; } catch { data = text; }
          resolve({ status: res.statusCode ?? 0, data });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("shopLive router mount (/api/shop/*) — FE contract", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // EXACT registerRoutes mount: shopLive paths are /shop/*, mounted bare at /api.
    app.use("/api", shopLiveRouter);
    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/shop/snapshot resolves (200, success) — the SPA getShopFloorSnapshot() call", async () => {
    const { status, data } = await httpRequest("GET", "/api/shop/snapshot");
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("GET /api/shop/jobs resolves (200, success, jobs array + count) — the SPA getShopJobs() call", async () => {
    const { status, data } = await httpRequest("GET", "/api/shop/jobs");
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.jobs)).toBe(true);
    expect(typeof data.count).toBe("number");
  });

  it("create (as lead) -> list round-trips through the mounted router (route is real, not a stub)", async () => {
    const partNumber = `ROMEO-FE-CONTRACT-${port}`;
    // POST /shop/job/create is requireRole("lead"+) since U-ERP-SHOPCONFIG-AUTH.
    const created = await httpRequest("POST", "/api/shop/job/create", {
      customer: "JM Die", part_number: partNumber, part_name: "contract-test", quantity: 1,
    }, "lead");
    expect(created.status).toBe(200);
    expect(created.data.success).toBe(true);
    const listed = await httpRequest("GET", "/api/shop/jobs"); // KIOSK-anon read
    expect(listed.status).toBe(200);
    const found = (listed.data.jobs as any[]).some((j) => j.part_number === partNumber);
    expect(found).toBe(true);
  });

  it("anon create -> 401 (the SHOPCONFIG-AUTH gate holds; a 404 here would mean unmounted)", async () => {
    const { status } = await httpRequest("POST", "/api/shop/job/create", {
      customer: "JM Die", part_number: "ANON-FORGE", quantity: 1,
    });
    expect(status).toBe(401);
  });

  it("negative control: an unmounted /api/shop/* path 404s for an AUTHED caller (mount is path-scoped, no catch-all)", async () => {
    // Anon hits the router-wide verifyToken first (401 covers the WHOLE surface); an authed
    // caller falls through the unmatched path to Express's 404 -- both directions pinned.
    const anon = await httpRequest("GET", "/api/shop/__no_such_endpoint__");
    expect(anon.status).toBe(401);
    const authed = await httpRequest("GET", "/api/shop/__no_such_endpoint__", undefined, "operator");
    expect(authed.status).toBe(404);
  });
});

// The block above tests shopLiveRouter in isolation. THIS block exercises the actual production
// wiring — registerRoutes(app, callTool), the real route registry that routes/index.ts populates —
// so it FAILS if the `app.use("/api", shopLiveRouter)` line is reverted (the true regression guard, R9).
describe("shopLive served through registerRoutes (production wiring guard)", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // stub callTool: mounting never invokes it; only request handlers would, and shopLive uses none.
    registerRoutes(app, async () => ({ ok: true }));
    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/shop/snapshot resolves through the full registry (not 404) — guards the index.ts mount", async () => {
    const { status, data } = await httpRequest("GET", "/api/shop/snapshot");
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("GET /api/shop/jobs resolves through the full registry (not 404) — guards the index.ts mount", async () => {
    const { status, data } = await httpRequest("GET", "/api/shop/jobs");
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.jobs)).toBe(true);
  });
});
