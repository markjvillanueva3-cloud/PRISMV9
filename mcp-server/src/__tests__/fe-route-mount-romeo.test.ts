/**
 * fe-route-mount-romeo.test.ts — FE-ROUTE-MOUNT 2026-06-18 (slot:romeo)
 *
 * Production-wiring regression guard for the 2 orphaned engine-backed routers the FE<->BE contract audit
 * (scripts/audit-frontend-backend-contract.mjs) found built-but-unmounted, mounted in routes/index.ts:
 *   - createShopProfileRouter  -> /api/v1/shop      (SPA web/src/api/shopProfile.ts, SHOP_API_BASE)
 *   - createWedmErpRouter      -> /api/v1/wedm-erp  (SPA web/src/api/wedmErp.ts + WedmQuote/Completion)
 *
 * These exercise the REAL registry (registerRoutes), so each FAILS if its mount line is reverted (R9).
 * Sibling to sierra's fe-route-mount.test.ts (the other 8 routers) and shopLive-route-mount.test.ts.
 * (The routers' own behavior is covered by shop-profile-routes.test.ts + wedm-erp-routes-u0*.test.ts;
 * this file only guards that registerRoutes actually MOUNTS them.)
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../routes/index.js";

let server: http.Server;
let port = 0;

function httpRequest(method: string, urlPath: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path: urlPath, method }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

describe("FE-ROUTE-MOUNT (romeo): shopProfile + wedm-erp served through registerRoutes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async () => ({ ok: true })); // stub callTool; these routers are engine-backed
    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/v1/shop/profile resolves 200 (guards the createShopProfileRouter mount)", async () => {
    const { status, data } = await httpRequest("GET", "/api/v1/shop/profile");
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("GET /api/v1/wedm-erp/quote/rates resolves 200 (guards the createWedmErpRouter mount)", async () => {
    // /quote/rates is a PUBLIC wedm-erp route (no verifyToken) returning the default rate table from
    // constants -> 200 with no setup. A 404 here means the router is not wired into registerRoutes
    // (the regression this guards). Most other wedm-erp routes ARE verifyToken-gated (401 unauthed),
    // which is why a 401-tolerant guard would also be valid -- but this public route lets us assert 200.
    const { status } = await httpRequest("GET", "/api/v1/wedm-erp/quote/rates");
    expect(status).toBe(200);
  });

  it("negative control: an unmounted /api/v1/shop/* path 404s (mount is path-scoped)", async () => {
    const { status } = await httpRequest("GET", "/api/v1/shop/__no_such_endpoint__");
    expect(status).toBe(404);
  });
});
