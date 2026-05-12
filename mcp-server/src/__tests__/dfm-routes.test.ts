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

describe("Mounted DFM routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      switch (`${toolName}:${action}`) {
        case "prism_cad:dfm_analyze":
          return {
            warnings: [{ severity: "warning", message: "Thin wall", recommendation: "Increase wall thickness" }],
            score: 72,
            pass: false,
          };
        case "prism_cad:dfm_quick":
          return {
            warnings: [{ severity: "warning", message: "Tight bore tolerance", recommendation: "Add finish-pass allowance" }],
            score: 81,
            pass: true,
          };
        case "prism_cad:dfm_tolerance_check":
          return {
            stack_method: "rss",
            stack_result_mm: 0.014,
            pass: true,
          };
        case "prism_cad:dfm_cost_impact":
          return {
            impacts: [{ driver: "Extra setup", amount_usd: 120 }],
            total_cost_impact_usd: 120,
          };
        case "prism_cad:dfm_get_rules":
          return [
            { id: "thin-wall", severity: "warning" },
            { id: "deep-pocket", severity: "warning" },
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

  it("mounts quick analysis and forwards the quote posture to prism_cad", async () => {
    const response = await httpRequest("POST", "/api/v1/dfm/quick", {
      material: "6061-T6",
      quantity: 100,
      tolerance_mm: 0.01,
    });

    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_cad",
      action: "dfm_quick",
      params: {
        material: "6061-T6",
        quantity: 100,
        tolerance_mm: 0.01,
      },
    });
    expect(response.data).toMatchObject({
      warnings: [{ severity: "warning", message: "Tight bore tolerance", recommendation: "Add finish-pass allowance" }],
      score: 81,
      pass: true,
    });
  });

  it("mounts the full analysis, tolerance, cost-impact, and rules surfaces", async () => {
    const analyze = await httpRequest("POST", "/api/v1/dfm/analyze", { material: "Ti-6Al-4V" });
    expect(analyze.status).toBe(200);
    expect(analyze.data.score).toBe(72);

    const tolerance = await httpRequest("POST", "/api/v1/dfm/tolerance-check", { stack: [0.01, 0.01] });
    expect(tolerance.status).toBe(200);
    expect(tolerance.data).toMatchObject({
      stack_method: "rss",
      stack_result_mm: 0.014,
      pass: true,
    });

    const costImpact = await httpRequest("POST", "/api/v1/dfm/cost-impact", { issues: ["extra-setup"] });
    expect(costImpact.status).toBe(200);
    expect(costImpact.data.total_cost_impact_usd).toBe(120);

    const rules = await httpRequest("GET", "/api/v1/dfm/rules");
    expect(rules.status).toBe(200);
    expect(rules.data).toHaveLength(2);
    expect(calls.map((call) => call.action)).toEqual([
      "dfm_analyze",
      "dfm_tolerance_check",
      "dfm_cost_impact",
      "dfm_get_rules",
    ]);
  });
});
