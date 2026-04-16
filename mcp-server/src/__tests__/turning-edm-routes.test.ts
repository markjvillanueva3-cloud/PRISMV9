import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";
import { authEngine } from "../engines/AuthEngine.js";

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, any>;
};

let server: http.Server;
let port = 0;
const calls: CallRecord[] = [];
let authHeaders: Record<string, string>;

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, any>,
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

describe("Turning + EDM route registration", () => {
  beforeAll(async () => {
    // Register a test admin user for auth-protected EDM routes
    const username = `edm-test-${Date.now().toString(36)}`;
    const registered = authEngine.register(username, "EdmTest123!", ["admin"]);
    expect(registered.success).toBe(true);
    const login = authEngine.login(username, "EdmTest123!");
    expect(login.success).toBe(true);
    authHeaders = { Authorization: `Bearer ${login.token!.access_token}` };

    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });
      return { ok: true, toolName, action, params };
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

  it("mounts turning program planning on /api/v1/turning/calculate", async () => {
    const response = await httpRequest("POST", "/api/v1/turning/calculate", { part_number: "TURN-1" });
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolName: "prism_turning_program",
      action: "turning_process_plan",
    });
  });

  it("mounts turning print-to-program on /api/v1/turning/program", async () => {
    const response = await httpRequest("POST", "/api/v1/turning/program", { part_number: "TURN-2" });
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolName: "prism_turning_program",
      action: "turning_print_to_program",
    });
  });

  it("mounts EDM wire settings on /api/v1/edm/wire", async () => {
    const response = await httpRequest("POST", "/api/v1/edm/wire", { workpiece_material: "D2" }, authHeaders);
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolName: "prism_edm",
      action: "wire_settings",
    });
  });

  it("mounts WEDM pipeline execution on /api/v1/edm/pipeline", async () => {
    const response = await httpRequest("POST", "/api/v1/edm/pipeline", { material: "D2", thickness_mm: 20, features: [{ type: "profile", tolerance_mm: 0.01 }] }, authHeaders);
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolName: "prism_edm",
      action: "wedm_run_pipeline",
    });
  });
});
