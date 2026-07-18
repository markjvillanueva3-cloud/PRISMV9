/**
 * Safety-route <-> dispatcher-action contract guard (slot:sierra, U-FE-ROUTE-ACTION-CONTRACT fix).
 *
 * The safety router called three prism_safety actions that DO NOT EXIST (validate, check_limits,
 * collision_check) -> z.enum reject -> silent HTTP 200 + {error} the SPA cannot detect, on
 * SAFETY-CRITICAL endpoints. Found by scripts/audit-fe-route-action-contract.mjs (the new Set([...])
 * parser fix surfaced prism_safety, previously UNVERIFIABLE).
 *
 * Asserts the corrected wiring:
 *  - /collision    -> real `check_toolpath_collision`
 *  - /check-limits -> real `get_safe_cutting_limits`
 *  - /validate     -> 501 (no holistic safety-validate action exists; fail loud, do NOT fabricate)
 *  - the dead action names (validate, check_limits, collision_check) are NEVER called (oracle).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createSafetyRouter } from "../routes/safety.js";

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
  app.use("/api/v1/safety", createSafetyRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("safety route -> dispatcher action contract", () => {
  it("/collision calls the real check_toolpath_collision action", async () => {
    calls.length = 0;
    const res = await httpRequest("POST", "/api/v1/safety/collision", { toolpath: [] });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("prism_safety");
    expect(calls[0].action).toBe("check_toolpath_collision");
  });

  it("/check-limits calls the real get_safe_cutting_limits action", async () => {
    calls.length = 0;
    const res = await httpRequest("POST", "/api/v1/safety/check-limits", { machine: "vmc" });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].action).toBe("get_safe_cutting_limits");
  });

  it("/validate fails loud with 501 (no holistic safety-validate action -- no fabricated mapping)", async () => {
    calls.length = 0;
    const res = await httpRequest("POST", "/api/v1/safety/validate", { rpm: 12000 });
    expect(res.status).toBe(501);
    expect(JSON.parse(res.text).error).toBe("not_implemented");
    expect(calls).toHaveLength(0); // never hits the dispatcher with a bogus action
  });

  it("never calls any of the three dead (non-existent) prism_safety actions (regression oracle)", async () => {
    calls.length = 0;
    await httpRequest("POST", "/api/v1/safety/collision", {});
    await httpRequest("POST", "/api/v1/safety/check-limits", {});
    await httpRequest("POST", "/api/v1/safety/validate", {});
    const dead = new Set(["validate", "check_limits", "collision_check"]);
    for (const c of calls) expect(dead.has(c.action)).toBe(false);
  });
});
