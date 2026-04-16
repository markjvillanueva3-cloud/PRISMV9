import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

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

describe("Quote compatibility route adapter", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      if (toolName !== "prism_business") {
        throw new Error(`Unexpected tool call: ${toolName}:${action}`);
      }

      switch (action) {
        case "quoting_generate":
          return { quote_id: "Q-001", total: 1200, unit_price: 48 };
        case "analytics_conversion":
          return { total_quotes: 10, won: 6, lost: 2, pending: 2, win_rate: 60 };
        case "injection_mold_materials":
          return [{ key: "abs", name: "ABS" }];
        default:
          throw new Error(`Unexpected business action: ${action}`);
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

  it("maps bare quote generate to the quoting dispatcher action and preserves result compatibility", async () => {
    const response = await httpRequest("POST", "/api/v1/quote/generate", {
      material: "6061-T6",
      quantity: 25,
    });

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "quoting_generate",
      params: { material: "6061-T6", quantity: 25 },
    });
    expect(response.data.result).toMatchObject({
      quote_id: "Q-001",
      total: 1200,
      unit_price: 48,
    });
    expect(response.data.data).toMatchObject({
      quote_id: "Q-001",
      total: 1200,
      unit_price: 48,
    });
  });

  it("supports bare quote analytics conversion via GET", async () => {
    const response = await httpRequest("GET", "/api/v1/quote/analytics-conversion");

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "analytics_conversion",
      params: {},
    });
    expect(response.data.result).toMatchObject({
      total_quotes: 10,
      won: 6,
      win_rate: 60,
    });
  });

  it("supports bare quote injection mold material lookup via GET", async () => {
    const response = await httpRequest("GET", "/api/v1/quote/injection-mold-materials");

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "injection_mold_materials",
      params: {},
    });
    expect(response.data.result).toEqual([{ key: "abs", name: "ABS" }]);
  });
});

describe("Billing route mounting", () => {
  it("mounts /api/v1/billing/status and returns free plan for unauthenticated users", async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async () => ({}));

    const localServer = app.listen(0);
    await once(localServer, "listening");
    const localPort = (localServer.address() as AddressInfo).port;

    try {
      const response = await new Promise<{ status: number; data: any }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: localPort,
            path: "/api/v1/billing/status",
            method: "GET",
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
        req.end();
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        userId: "anonymous",
        plan: "free",
        authenticated: false,
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        localServer.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
