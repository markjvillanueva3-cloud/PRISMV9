/**
 * Cost-route <-> dispatcher-action contract guard (slot:sierra, U-FE-COST-ACTION-FIX).
 * The router called 2 prism_intelligence actions that do NOT exist (cost_compare, cost_history)
 * -> z.enum reject -> silent HTTP 200 + {error}. Neither has a clean real home:
 *   - cost_compare: nearest is shop_compare, which REQUIRES { scenarios: [...] }, and /compare has
 *     no live SPA caller committing a payload shape -> honest 501.
 *   - cost_history: nearest is erp_cost_history, which IGNORES the job id and returns GLOBAL
 *     cost-feedback history -> wiring it to a :jobId route silently drops the filter -> honest 501.
 * This guard pins: both broken endpoints now 501 (no dead callTool), and the untouched endpoints
 * (/estimate, /quote) still route to their real actions (process_cost / shop_quote).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createCostRouter } from "../routes/cost.js";

interface Recorded { tool: string; action: string }
const calls: Recorded[] = [];
const recordingCallTool: CallToolFn = async (tool, action) => {
  calls.push({ tool, action });
  return { ok: true };
};

let server: http.Server;
let port = 0;

function request(method: "GET" | "POST", urlPath: string, body?: unknown): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const req = http.request(
      { host: "127.0.0.1", port, method, path: urlPath, headers },
      (res) => { res.on("data", () => {}); res.on("end", () => resolve({ status: res.statusCode ?? 0 })); },
    );
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/cost", createCostRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("cost route -> dispatcher action contract", () => {
  it("/compare -> 501 (no cost_compare action; shop_compare shape uncommitted)", async () => {
    calls.length = 0;
    const res = await request("POST", "/api/v1/cost/compare", { anything: 1 });
    expect(res.status).toBe(501);
    expect(calls).toHaveLength(0);
  });

  it("/history/:jobId -> 501 (no job-scoped cost_history; erp_cost_history is global)", async () => {
    calls.length = 0;
    const res = await request("GET", "/api/v1/cost/history/JOB-123");
    expect(res.status).toBe(501);
    expect(calls).toHaveLength(0);
  });

  it("/estimate still routes to prism_intelligence:process_cost (untouched)", async () => {
    calls.length = 0;
    const res = await request("POST", "/api/v1/cost/estimate", { material: "steel" });
    expect(res.status).toBe(200);
    expect(calls[0]).toEqual({ tool: "prism_intelligence", action: "process_cost" });
  });

  it("/quote still routes to prism_intelligence:shop_quote (untouched)", async () => {
    calls.length = 0;
    const res = await request("POST", "/api/v1/cost/quote", { part: "x" });
    expect(res.status).toBe(200);
    expect(calls[0]).toEqual({ tool: "prism_intelligence", action: "shop_quote" });
  });

  it("never calls the 2 dead (non-existent) actions (regression oracle)", async () => {
    calls.length = 0;
    await request("POST", "/api/v1/cost/compare", {});
    await request("GET", "/api/v1/cost/history/JOB-1");
    await request("POST", "/api/v1/cost/estimate", {});
    await request("POST", "/api/v1/cost/quote", {});
    const dead = new Set(["cost_compare", "cost_history"]);
    for (const c of calls) expect(dead.has(c.action)).toBe(false);
  });
});
