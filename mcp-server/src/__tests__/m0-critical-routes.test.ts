import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";
import { OperatingSystemHotJobsEngine } from "../engines/OperatingSystemHotJobsEngine.js";

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, unknown>;
};

let server: http.Server;
let port = 0;
const calls: CallRecord[] = [];

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: {
          ...(serialized
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(serialized).toString(),
              }
            : {}),
          ...(headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) req.write(serialized);
    req.end();
  });
}

describe("M-0 critical route smoke coverage", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });
      return {
        action,
        echoed: params ?? {},
      };
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(() => {
    calls.length = 0;
    OperatingSystemHotJobsEngine.reset();
  });

  it("keeps the critical bare quote compatibility routes mounted across quoting surfaces", async () => {
    const cases = [
      { method: "POST", path: "/api/v1/quote/generate", action: "quoting_generate", body: { quantity: 5 } },
      { method: "POST", path: "/api/v1/quote/estimate", action: "quote_estimate", body: { material: "4140" } },
      {
        method: "POST",
        path: "/api/v1/quote/compare-materials",
        action: "quote_compare_materials",
        body: { materials: ["4140", "17-4PH"] },
      },
      { method: "POST", path: "/api/v1/quote/what-if", action: "quote_what_if", body: { quantity: 12 } },
      { method: "GET", path: "/api/v1/quote/analytics-calibration", action: "analytics_calibration" },
      { method: "POST", path: "/api/v1/quote/blueprint", action: "blueprint_to_quote", body: { docId: "DOC-1" } },
      { method: "POST", path: "/api/v1/quote/sheet-metal", action: "sheet_metal_quote", body: { material: "5052" } },
      { method: "POST", path: "/api/v1/quote/additive", action: "additive_quote", body: { technology: "SLS" } },
      {
        method: "POST",
        path: "/api/v1/quote/injection-mold",
        action: "injection_mold_quote",
        body: { cavities: 2 },
      },
      {
        method: "POST",
        path: "/api/v1/quote/stock-optimize",
        action: "stock_size_optimize",
        body: { material: "6061-T6" },
      },
      {
        method: "POST",
        path: "/api/v1/quote/material-price",
        action: "material_price_lookup",
        body: { material: "7075-T6" },
      },
    ] as const;

    for (const testCase of cases) {
      const response = await httpRequest(testCase.method, testCase.path, testCase.body);

      expect(response.status).toBe(200);
      expect(calls.at(-1)).toMatchObject({
        toolName: "prism_business",
        action: testCase.action,
        params: testCase.body ?? {},
      });
      expect(response.data.ok).toBe(true);
      expect(response.data.result).toMatchObject({
        action: testCase.action,
        echoed: testCase.body ?? {},
      });
      expect(response.data.data).toEqual(response.data.result);
    }
  });

  it("keeps every protected billing endpoint mounted behind auth", async () => {
    const cases = [
      { method: "POST", path: "/api/v1/billing/create-checkout", body: { plan: "pro" } },
      { method: "POST", path: "/api/v1/billing/portal", body: { customerId: "cus_123" } },
      { method: "POST", path: "/api/v1/billing/purchase-post", body: { controller: "fanuc-31i", type: "monthly" } },
    ] as const;

    for (const testCase of cases) {
      const response = await httpRequest(testCase.method, testCase.path, testCase.body);

      expect(response.status).toBe(401);
      expect(response.data.error).toMatchObject({
        status: 401,
        code: "AUTH_REQUIRED",
      });
    }
  });

  it("returns free plan for unauthenticated billing status requests", async () => {
    const response = await httpRequest("GET", "/api/v1/billing/status");
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      userId: "anonymous",
      plan: "free",
      authenticated: false,
    });
  });

  it("keeps the billing webhook publicly reachable", async () => {
    const response = await httpRequest("POST", "/api/v1/billing/webhook", {
      type: "billing.unhandled",
      data: {},
    });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      received: true,
      action: "unhandled",
    });
  });

  it("returns 400s for the newly mounted operating-system endpoints when required inputs are missing", async () => {
    const cases = [
      { path: "/api/v1/operating-system/hot-jobs/set", expected: "Missing jobId in request body" },
      { path: "/api/v1/operating-system/hot-jobs/clear", expected: "Missing jobId in request body" },
      { path: "/api/v1/operating-system/jobs/JOB-1/approvals", expected: "Missing job in request body" },
      { path: "/api/v1/operating-system/jobs/JOB-1/packet", expected: "Missing job in request body" },
    ] as const;

    for (const testCase of cases) {
      const response = await httpRequest("POST", testCase.path, {});

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        ok: false,
        error: testCase.expected,
      });
    }
  });
});
