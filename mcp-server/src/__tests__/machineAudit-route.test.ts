/**
 * machineAudit-route.test.ts -- MCAT-MS0 U-MCAT19 backend (slot:romeo 2026-06-18).
 *
 * Production-wiring + contract guard for GET /api/machine-audit (the real JM fleet data-completeness audit
 * the SPA MachineDataAuditPage consumes). Exercises the REAL registry via registerRoutes (fails if the mount
 * is reverted, R9) and asserts the audit is REAL data over the real fleet -- not the SPA's mock fallback.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../routes/index.js";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

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

describe("GET /api/machine-audit (MCAT-MS0 U-MCAT19, real JM fleet)", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async () => ({ ok: true })); // engine-backed; stub callTool unused by this route
    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("resolves 200 through registerRoutes (guards the mount, R9)", async () => {
    const { status } = await httpRequest("GET", "/api/machine-audit");
    expect(status).toBe(200);
  });

  it("returns the REAL JM fleet, not mock -- one record per ShopConfigurationEngine machine", async () => {
    const { data } = await httpRequest("GET", "/api/machine-audit");
    const realCount = shopConfigurationEngine.getMachines().length;
    expect(Array.isArray(data.machines)).toBe(true);
    expect(data.machines.length).toBe(realCount);   // exact fleet size (~21), not the SPA's 50 random mocks
    expect(realCount).toBeGreaterThan(0);
    // a real JM machine id is present (proves real source, not generated machine-1..50)
    const ids = data.machines.map((m: any) => m.id);
    expect(ids).toContain(shopConfigurationEngine.getMachines()[0].id);
  });

  it("each record has the SPA contract shape with valid ranges", async () => {
    const { data } = await httpRequest("GET", "/api/machine-audit");
    for (const r of data.machines) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.manufacturer).toBe("string");
      expect(typeof r.type).toBe("string");
      for (const k of ["spindle_complete", "controller_complete", "envelope_complete", "coolant_complete"]) {
        expect(typeof r[k]).toBe("boolean");
      }
      expect(r.completeness_score).toBeGreaterThanOrEqual(0);
      expect(r.completeness_score).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.backfilled_fields)).toBe(true);
      expect(r.backfilled_fields).toEqual([]);       // HONEST: this route backfills nothing
    }
  });

  it("audit produces REAL, MEANINGFUL signal -- a fully-tracked machine reads category-complete (not all-red)", async () => {
    const { data } = await httpRequest("GET", "/api/machine-audit");
    expect(data.summary.total_machines).toBe(data.machines.length);
    expect(data.summary.avg_completeness).toBeGreaterThan(0);   // adapter mapped real tracked fields
    expect(data.summary.backfilled_count).toBe(0);
    // The fix (vs the scrutiny-arm-B P1): a machine carrying rpm+power+torque must read spindle_complete=TRUE,
    // not falsely red. At least one machine in the real JM fleet has its full tracked spindle data.
    expect(data.machines.some((r: any) => r.spindle_complete === true)).toBe(true);
    expect(data.summary.spindle_complete).toBeGreaterThan(0);
    // A machine whose tracked spindle fields are all present must NOT report completeness 0 (no false-floor).
    const tracked = data.machines.find((r: any) => r.spindle_complete);
    expect(tracked.completeness_score).toBeGreaterThan(0.3);
  });

  it("negative control: an unmounted sub-path 404s (mount is path-scoped)", async () => {
    const { status } = await httpRequest("GET", "/api/machine-audit/__nope__/x");
    expect(status).toBe(404);
  });
});
