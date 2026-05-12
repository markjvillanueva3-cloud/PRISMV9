import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

describe("Orchestration routes", () => {
  beforeAll(async () => {
    const { createOrchestrationRouter } = await import("../routes/orchestration.js");
    const app = express();
    app.use(express.json());
    app.use(
      "/api/v1/orchestration",
      createOrchestrationRouter(async (toolName, action, params) => {
        calls.push({ toolName, action, params });
        return {
          action,
          echoed: params ?? {},
        };
      }),
    );

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

  it("routes unified execute requests through prism_orchestrate", async () => {
    const payload = {
      intent: "summarize the current floor risk for JOB-TRACK-1",
      context: {
        desk: "shop-floor-clock",
        jobId: "JOB-TRACK-1",
      },
    };

    const response = await httpRequest("POST", "/api/v1/orchestration/unified/execute", payload);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      ok: true,
      data: {
        action: "unified_execute",
        echoed: payload,
      },
    });
    expect(calls).toEqual([
      {
        toolName: "prism_orchestrate",
        action: "unified_execute",
        params: payload,
      },
    ]);
  });

  it("routes unified classify previews through prism_orchestrate", async () => {
    const payload = {
      intent: "what should the operator watch next",
      context: {
        desk: "shop-floor-clock",
        department: "Job setup",
      },
    };

    const response = await httpRequest("POST", "/api/v1/orchestration/unified/classify", payload);

    expect(response.status).toBe(200);
    expect(response.data.data.action).toBe("unified_classify");
    expect(calls[0]).toEqual({
      toolName: "prism_orchestrate",
      action: "unified_classify",
      params: payload,
    });
  });

  it("routes unified tier previews through prism_orchestrate", async () => {
    const payload = {
      intent: "plan the next shift handoff for Avery Stone on JOB-TRACK-1",
      constraints: {
        allow_escalation: true,
      },
    };

    const response = await httpRequest("POST", "/api/v1/orchestration/unified/route", payload);

    expect(response.status).toBe(200);
    expect(response.data.data.action).toBe("unified_route");
    expect(calls[0]).toEqual({
      toolName: "prism_orchestrate",
      action: "unified_route",
      params: payload,
    });
  });
});
