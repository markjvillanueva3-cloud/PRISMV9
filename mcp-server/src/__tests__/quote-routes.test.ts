import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, any>;
};

let server: http.Server;
let port = 0;
const calls: CallRecord[] = [];

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, any>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(serialized),
            }
          : {},
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
    if (serialized) {
      req.write(serialized);
    }
    req.end();
  });
}

describe("Quote compatibility routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      switch (`${toolName}:${action}`) {
        case "prism_business:quote_estimate":
          return {
            total: 3250,
            unit_price: 325,
            confidence: 0.91,
          };
        case "prism_business:analytics_conversion":
          return {
            total_quotes: 42,
            won: 23,
            lost: 11,
            pending: 8,
            win_rate: 55,
          };
        case "prism_business:injection_mold_materials":
          return [
            {
              key: "abs",
              name: "ABS",
              price_per_kg: 2.4,
            },
          ];
        default:
          throw new Error(`Unexpected tool call: ${toolName}:${action}`);
      }
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
  });

  it("maps /api/v1/quote/estimate to the business quote estimator", async () => {
    const response = await httpRequest("POST", "/api/v1/quote/estimate", {
      material: "4140",
      quantity: 10,
    });

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "quote_estimate",
      params: { material: "4140", quantity: 10 },
    });
    expect(response.data.result).toMatchObject({
      total: 3250,
      unit_price: 325,
      confidence: 0.91,
    });
    expect(response.data.data).toEqual(response.data.result);
  });

  it("exposes conversion analytics through the bare quote route", async () => {
    const response = await httpRequest("GET", "/api/v1/quote/analytics-conversion");

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "analytics_conversion",
      params: {},
    });
    expect(response.data.result).toMatchObject({
      total_quotes: 42,
      won: 23,
      lost: 11,
      pending: 8,
      win_rate: 55,
    });
  });

  it("exposes injection mold materials through the bare quote route", async () => {
    const response = await httpRequest("GET", "/api/v1/quote/injection-mold-materials");

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "injection_mold_materials",
      params: {},
    });
    expect(response.data.result).toEqual([
      {
        key: "abs",
        name: "ABS",
        price_per_kg: 2.4,
      },
    ]);
  });

  it("mounts billing status and returns free plan for unauthenticated users", async () => {
    const response = await httpRequest("GET", "/api/v1/billing/status");

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      userId: "anonymous",
      plan: "free",
      authenticated: false,
    });
  });
});
