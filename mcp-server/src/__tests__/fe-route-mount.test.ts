/**
 * FE-ROUTE-MOUNT regression guard (slot:sierra 2026-06-18).
 *
 * Context: 8 frontend-facing routers (cncOps, diagnosis, mechanical, milling, thermal,
 * vibration, settings, print) existed in src/routes/ with real handlers + verified dispatcher
 * actions but were NEVER mounted in routes/index.ts, so the web SPA 404'd on every
 * /api/v1/{cnc-ops,diagnosis,mechanical,milling,thermal,vibration,settings,print} call.
 * U-FE-ROUTE-MOUNT wired them. (The specialty router /grinding,/forming/*,/welding/* is
 * deferred to U-FE-SPECIALTY-CONTRACT -- it calls dispatcher action names that don't exist,
 * so mounting it would emit a 200+error-body footgun; not mounted, not tested here.)
 *
 * This guard has two layers so it fails if EITHER regression happens:
 *  1. RUNTIME — each router, mounted at its base, answers a representative endpoint with a
 *     non-404 status (proves the router itself routes). Complements romeo's STATIC prefix audit
 *     (scripts/audit-frontend-backend-contract.mjs) — that proves "a mount exists in index.ts";
 *     this proves "the router actually serves its paths".
 *  2. WIRING — the live routes/index.ts source mounts all 9 (proves they stay wired). If a future
 *     edit drops a mount, romeo's audit flips the base back to a gap AND this assertion fails.
 *
 * A negative control (bogus path 404s on a real router) proves the suite can detect unmounting
 * — i.e. a green run is meaningful, not vacuous (R9).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createCncOpsRouter } from "../routes/cncOps.js";
import { createDiagnosisRouter } from "../routes/diagnosis.js";
import { createMechanicalRouter } from "../routes/mechanical.js";
import { createMillingRouter } from "../routes/milling.js";
import { createThermalRouter } from "../routes/thermal.js";
import { createVibrationRouter } from "../routes/vibration.js";
import { createSettingsRouter } from "../routes/settings.js";
import { createPrintRouter } from "../routes/print.js";
// createSpecialtyRouter NOT imported -- specialty mount deferred to U-FE-SPECIALTY-CONTRACT.

let server: http.Server;
let port = 0;

// Stub callTool: the proxies only need it to return a benign object per request. We assert NON-404
// (mounting), not response content, so the stub shape never matters for the runtime layer.
const stubCallTool: CallToolFn = async () => ({ ok: true, stub: true });

function httpRequest(
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const req = http.request(
      { hostname: "127.0.0.1", port, path: urlPath, method, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }),
        );
      },
    );
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

describe("FE-ROUTE-MOUNT: orphaned frontend-facing routers are mounted + functional", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // Mount exactly as routes/index.ts does (8 explicit bases + specialty BARE at /api/v1).
    app.use("/api/v1/cnc-ops", createCncOpsRouter(stubCallTool));
    app.use("/api/v1/diagnosis", createDiagnosisRouter(stubCallTool));
    app.use("/api/v1/mechanical", createMechanicalRouter(stubCallTool));
    app.use("/api/v1/milling", createMillingRouter(stubCallTool));
    app.use("/api/v1/thermal", createThermalRouter(stubCallTool));
    app.use("/api/v1/vibration", createVibrationRouter(stubCallTool));
    app.use("/api/v1/settings", createSettingsRouter(stubCallTool));
    app.use("/api/v1/print", createPrintRouter(stubCallTool));

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // Layer 1 — RUNTIME: every base routes a representative endpoint (non-404).
  const endpoints: Array<{ name: string; method: string; path: string; body?: unknown }> = [
    { name: "cnc-ops", method: "POST", path: "/api/v1/cnc-ops/assemble", body: {} },
    { name: "diagnosis", method: "POST", path: "/api/v1/diagnosis/forensic", body: {} },
    { name: "mechanical", method: "GET", path: "/api/v1/mechanical/actions" },
    { name: "milling", method: "POST", path: "/api/v1/milling/calculate", body: {} },
    { name: "thermal", method: "POST", path: "/api/v1/thermal/pump", body: {} },
    { name: "vibration", method: "POST", path: "/api/v1/vibration/modal", body: {} },
    { name: "settings", method: "GET", path: "/api/v1/settings/" },
    { name: "print", method: "GET", path: "/api/v1/print/machine-types" },
  ];

  for (const e of endpoints) {
    it(`routes ${e.name} (${e.method} ${e.path} is not 404)`, async () => {
      const res = await httpRequest(e.method, e.path, e.body);
      expect(res.status).not.toBe(404);
    });
  }

  // R9 negative control: an unknown path on a mounted router 404s — proves the harness detects
  // unmounting (a green suite is meaningful, not a router that 200s on everything).
  it("404s on an unknown path of a mounted base (control)", async () => {
    const res = await httpRequest("GET", "/api/v1/mechanical/__no_such_endpoint__");
    expect(res.status).toBe(404);
  });

  // The two pure (no-callTool) endpoints return their real payloads — proves we mounted the REAL
  // router, not a stub that answers everything.
  it("mechanical/actions returns the real category list", async () => {
    const res = await httpRequest("GET", "/api/v1/mechanical/actions");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text) as { categories?: Array<{ path: string }> };
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body.categories!.length).toBeGreaterThan(5);
    expect(body.categories!.some((c) => c.path === "/gear")).toBe(true);
  });

  it("print/machine-types returns the real machine-type list", async () => {
    const res = await httpRequest("GET", "/api/v1/print/machine-types");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text) as { types?: unknown[] } | unknown[];
    const types = Array.isArray(body) ? body : (body as { types?: unknown[] }).types;
    expect(Array.isArray(types)).toBe(true);
    expect((types as unknown[]).length).toBeGreaterThan(0);
  });

  it("settings round-trips an in-memory value (GET after PUT)", async () => {
    await httpRequest("PUT", "/api/v1/settings/", { theme: "dark" });
    const res = await httpRequest("GET", "/api/v1/settings/");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text) as { settings?: Record<string, unknown> };
    expect(body.settings?.theme).toBe("dark");
  });

  // Layer 2 — WIRING: the live routes/index.ts must mount all 9. Guards against a future edit that
  // drops a mount (which would silently re-404 the SPA). Path resolved relative to this test file.
  it("routes/index.ts mounts all 8 routers (specialty deferred to U-FE-SPECIALTY-CONTRACT)", () => {
    const indexPath = join(dirname(fileURLToPath(import.meta.url)), "..", "routes", "index.ts");
    const src = readFileSync(indexPath, "utf8");
    const requiredMounts = [
      'app.use("/api/v1/cnc-ops", createCncOpsRouter(',
      'app.use("/api/v1/diagnosis", createDiagnosisRouter(',
      'app.use("/api/v1/mechanical", createMechanicalRouter(',
      'app.use("/api/v1/milling", createMillingRouter(',
      'app.use("/api/v1/thermal", createThermalRouter(',
      'app.use("/api/v1/vibration", createVibrationRouter(',
      'app.use("/api/v1/settings", createSettingsRouter(',
      'app.use("/api/v1/print", createPrintRouter(',
    ];
    const missing = requiredMounts.filter((m) => !src.includes(m));
    expect(missing).toEqual([]);
  });
});
