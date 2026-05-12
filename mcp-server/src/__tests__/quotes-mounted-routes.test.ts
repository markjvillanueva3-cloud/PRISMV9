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

describe("Mounted /api/v1/quotes routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      if (action === "quote_status_change" && params?.next_status === "bad") {
        throw new Error("status rejected");
      }

      switch (`${toolName}:${action}`) {
        case "prism_business:instant_quote":
          return { quote_id: "Q-100", total: 1840, confidence: 0.9 };
        case "prism_business:instant_quote_qty_breaks":
          return [{ quantity: 25, unit_price: 82.4 }];
        case "prism_business:instant_quote_lead_time":
          return [{ mode: "standard", days: 12 }];
        case "prism_business:quote_revise":
          return { revision_id: "Q-100-R2", quote_id: "Q-100" };
        case "prism_business:quote_get_history":
          return [{ id: "Q-100-R1", status: "draft" }, { id: "Q-100-R2", status: "sent" }];
        case "prism_business:quote_status_change":
          return { quote_id: "Q-100", status: params?.next_status ?? "sent" };
        case "prism_business:quote_generate_share_token":
          return { quote_id: "Q-100", token: "share-token", expires_in_days: params?.expires_in_days ?? null };
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

  it("mounts the instant quote, revision, history, status, and share surfaces", async () => {
    const instant = await httpRequest("POST", "/api/v1/quotes/instant", {
      material: "6061-T6",
      quantity: 25,
    });
    expect(instant.status).toBe(200);
    expect(instant.data).toMatchObject({ ok: true, data: { quote_id: "Q-100", total: 1840, confidence: 0.9 } });

    const qtyBreaks = await httpRequest("POST", "/api/v1/quotes/qty-breaks", {
      material: "6061-T6",
      quantity: 25,
    });
    expect(qtyBreaks.status).toBe(200);
    expect(qtyBreaks.data.data).toEqual([{ quantity: 25, unit_price: 82.4 }]);

    const leadTime = await httpRequest("POST", "/api/v1/quotes/lead-time", {
      machine_family: "3-axis",
      quantity: 25,
    });
    expect(leadTime.status).toBe(200);
    expect(leadTime.data.data).toEqual([{ mode: "standard", days: 12 }]);

    const revise = await httpRequest("POST", "/api/v1/quotes/Q-100/revise", {
      reason: "customer update",
    });
    expect(revise.status).toBe(200);
    expect(revise.data.data).toMatchObject({ revision_id: "Q-100-R2", quote_id: "Q-100" });

    const history = await httpRequest("GET", "/api/v1/quotes/Q-100/history");
    expect(history.status).toBe(200);
    expect(history.data.data).toHaveLength(2);

    const status = await httpRequest("POST", "/api/v1/quotes/Q-100/status", {
      next_status: "approved",
    });
    expect(status.status).toBe(200);
    expect(status.data.data).toMatchObject({ quote_id: "Q-100", status: "approved" });

    const share = await httpRequest("GET", "/api/v1/quotes/Q-100/share?expires_in_days=14");
    expect(share.status).toBe(200);
    expect(share.data.data).toMatchObject({ token: "share-token", expires_in_days: 14 });

    const invalidShareWindow = await httpRequest("GET", "/api/v1/quotes/Q-100/share?expires_in_days=not-a-number");
    expect(invalidShareWindow.status).toBe(200);
    expect(invalidShareWindow.data.data).toMatchObject({ token: "share-token", expires_in_days: null });

    expect(calls.map((call) => call.action)).toEqual([
      "instant_quote",
      "instant_quote_qty_breaks",
      "instant_quote_lead_time",
      "quote_revise",
      "quote_get_history",
      "quote_status_change",
      "quote_generate_share_token",
      "quote_generate_share_token",
    ]);
    expect(calls[6].params).toMatchObject({ quote_id: "Q-100", expires_in_days: 14 });
    expect(calls[7].params).toMatchObject({ quote_id: "Q-100", expires_in_days: undefined });
  });

  it("fails closed when a mounted quotes tool rejects a mutation", async () => {
    const response = await httpRequest("POST", "/api/v1/quotes/Q-100/status", {
      next_status: "bad",
    });

    expect(response.status).toBe(500);
    expect(response.data).toMatchObject({
      ok: false,
      error: "status rejected",
    });
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "quote_status_change",
      params: { quote_id: "Q-100", next_status: "bad" },
    });
  });
});
