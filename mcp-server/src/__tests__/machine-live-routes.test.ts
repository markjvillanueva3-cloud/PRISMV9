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
              "Content-Length": Buffer.byteLength(serialized).toString(),
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
    if (serialized) req.write(serialized);
    req.end();
  });
}

describe("Mounted /api/v1/machine-live routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      if (action === "machine_live_status" && params?.machine_id === "FAIL-500") {
        throw new Error("machine-live failure");
      }

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
  });

  it("mounts the machine-live route surface end to end", async () => {
    const cases = [
      {
        path: "/api/v1/machine-live/list",
        action: "machine_list",
        body: { protocol: "mtconnect", status: "connected" },
      },
      {
        path: "/api/v1/machine-live/status",
        action: "machine_live_status",
        body: { machine_id: "VF2-01" },
      },
      {
        path: "/api/v1/machine-live/adaptive",
        action: "adaptive_status",
        body: { machine_id: "VF2-01" },
      },
      {
        path: "/api/v1/machine-live/maintenance",
        action: "maint_status",
        body: { machine_id: "VF2-01" },
      },
      {
        path: "/api/v1/machine-live/twin",
        action: "digital_twin_state",
        body: { machine_id: "VF2-01", spindle_rpm: 6000 },
      },
      {
        path: "/api/v1/machine-live/acknowledge",
        action: "alert_acknowledge",
        body: { machine_id: "VF2-01", alert_id: "ALT-9" },
      },
      {
        path: "/api/v1/machine-live/connect",
        action: "machine_connect",
        body: { machine_id: "VF2-01", timeout_ms: 5000 },
      },
    ] as const;

    for (const testCase of cases) {
      const response = await httpRequest("POST", testCase.path, testCase.body);

      expect(response.status).toBe(200);
      expect(response.data.result).toMatchObject({
        action: testCase.action,
        echoed: testCase.body,
      });
      expect(calls.at(-1)).toMatchObject({
        toolName: "prism_machine_live",
        action: testCase.action,
        params: testCase.body,
      });
    }
  });

  it("fails closed when required machine-live inputs are missing or malformed", async () => {
    const cases = [
      {
        path: "/api/v1/machine-live/status",
        body: {},
        expectedMessage: "Invalid input: expected string, received undefined",
      },
      {
        path: "/api/v1/machine-live/maintenance",
        body: {},
        expectedMessage: "Invalid input: expected string, received undefined",
      },
      {
        path: "/api/v1/machine-live/connect",
        body: {},
        expectedMessage: "Invalid input: expected string, received undefined",
      },
      {
        path: "/api/v1/machine-live/connect",
        body: { machine_id: "VF2-01", timeout_ms: "fast" as unknown as number },
        expectedMessage: "Invalid input: expected number, received string",
      },
    ] as const;

    for (const testCase of cases) {
      const response = await httpRequest("POST", testCase.path, testCase.body as Record<string, unknown>);

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        ok: false,
        error: testCase.expectedMessage,
      });
    }

    expect(calls).toHaveLength(0);
  });

  it("preserves fail-closed 500 handling when the underlying tool throws", async () => {
    const response = await httpRequest("POST", "/api/v1/machine-live/status", {
      machine_id: "FAIL-500",
    });

    expect(response.status).toBe(500);
    expect(response.data.error).toMatchObject({
      status: 500,
      message: "machine-live failure",
      code: "INTERNAL_ERROR",
    });
    expect(calls[0]).toMatchObject({
      toolName: "prism_machine_live",
      action: "machine_live_status",
      params: { machine_id: "FAIL-500" },
    });
  });
});
