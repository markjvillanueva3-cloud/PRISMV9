/**
 * Auth-route <-> dispatcher-action contract guard (slot:sierra, U-FE-ROUTE-ACTION-CONTRACT fix).
 *
 * The auth router previously called four prism_auth actions that DO NOT EXIST on the dispatcher
 * (refresh, logout, whoami, generate_key) -> z.enum rejected them -> HTTP 200 + {error} body the
 * SPA's `if(!res.ok)` cannot detect (found by scripts/audit-fe-route-action-contract.mjs).
 *
 * This guard rounds-trips real requests through the router with a recording callTool and asserts:
 *  - /refresh calls the REAL `refresh_token` action AND maps refreshToken -> refresh_token
 *    (a param rename the static verifier cannot check -- only a behavioral test can).
 *  - /logout calls the REAL `session_manage` action.
 *  - the dead action names (refresh, logout, whoami, generate_key) are NEVER called again
 *    (the regression oracle -- this fails the instant someone reverts to a non-existent action).
 *
 * /me and /api-key are verifyToken-gated (401 without a valid token) so they are not driven here;
 * the static FE-route action audit guards their action contract instead.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createAuthRouter } from "../routes/auth.js";

interface Recorded { tool: string; action: string; params: any }
const calls: Recorded[] = [];
const recordingCallTool: CallToolFn = async (tool, action, params) => {
  calls.push({ tool, action, params });
  return { ok: true };
};

let server: http.Server;
let port = 0;

function httpRequest(method: string, urlPath: string, body?: unknown): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers }, (res) => {
      let text = "";
      res.on("data", (c) => (text += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text }));
    });
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/auth", createAuthRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("auth route -> dispatcher action contract", () => {
  it("/refresh calls the real refresh_token action and maps refreshToken -> refresh_token", async () => {
    calls.length = 0;
    const res = await httpRequest("POST", "/api/v1/auth/refresh", { refreshToken: "tok-123" });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("prism_auth");
    expect(calls[0].action).toBe("refresh_token");
    expect(calls[0].params.refresh_token).toBe("tok-123");
  });

  it("/logout calls the real session_manage action (revoke_all default)", async () => {
    calls.length = 0;
    const res = await httpRequest("POST", "/api/v1/auth/logout", { user_id: "u-9" });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("prism_auth");
    expect(calls[0].action).toBe("session_manage");
    expect(calls[0].params.operation).toBe("revoke_all");
    expect(calls[0].params.user_id).toBe("u-9");
  });

  it("never calls any of the four dead (non-existent) prism_auth actions (regression oracle)", async () => {
    calls.length = 0;
    await httpRequest("POST", "/api/v1/auth/refresh", { refreshToken: "x" });
    await httpRequest("POST", "/api/v1/auth/logout", {});
    const deadActions = new Set(["refresh", "logout", "whoami", "generate_key"]);
    for (const c of calls) expect(deadActions.has(c.action)).toBe(false);
  });

  it("/refresh enforces requireFields(refreshToken) -> 400 when missing (router still guards input)", async () => {
    calls.length = 0;
    const res = await httpRequest("POST", "/api/v1/auth/refresh", {});
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0); // never reaches the dispatcher on a bad request
  });
});
