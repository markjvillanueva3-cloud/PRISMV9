/**
 * Vibration-route <-> dispatcher-action contract guard (slot:sierra, U-FE-VIBRATION-ACTION-FIX).
 * The router called 4 prism_vibration_physics actions that do NOT exist (stability_lobe_calculate,
 * modal_analysis, chatter_detect, process_damping) -> silent 200+{error}. Now wired to real actions
 * (3) + honest 501 (modal -- no modal action exists).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createVibrationRouter } from "../routes/vibration.js";

interface Recorded { tool: string; action: string }
const calls: Recorded[] = [];
const recordingCallTool: CallToolFn = async (tool, action) => {
  calls.push({ tool, action });
  return { ok: true };
};

let server: http.Server;
let port = 0;

function post(urlPath: string, body: unknown): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: "127.0.0.1", port, method: "POST", path: urlPath, headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) } },
      (res) => { res.on("data", () => {}); res.on("end", () => resolve({ status: res.statusCode ?? 0 })); },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/vibration", createVibrationRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("vibration route -> dispatcher action contract", () => {
  it("/stability-lobes -> chatter_stable_rpm_recommend", async () => {
    calls.length = 0;
    const res = await post("/api/v1/vibration/stability-lobes", { rpm: 9000 });
    expect(res.status).toBe(200);
    expect(calls[0]).toEqual({ tool: "prism_vibration_physics", action: "chatter_stable_rpm_recommend" });
  });

  it("/chatter -> regenerative_chatter_predict", async () => {
    calls.length = 0;
    const res = await post("/api/v1/vibration/chatter", { depth_mm: 3 });
    expect(res.status).toBe(200);
    expect(calls[0].action).toBe("regenerative_chatter_predict");
  });

  it("/damping -> vibration_dampening_calculate", async () => {
    calls.length = 0;
    const res = await post("/api/v1/vibration/damping", { tool: "endmill" });
    expect(res.status).toBe(200);
    expect(calls[0].action).toBe("vibration_dampening_calculate");
  });

  it("/modal -> 501 (no modal action; not a fabricated spectral mapping)", async () => {
    calls.length = 0;
    const res = await post("/api/v1/vibration/modal", { signal: [] });
    expect(res.status).toBe(501);
    expect(calls).toHaveLength(0);
  });

  it("never calls the 4 dead (non-existent) actions (regression oracle)", async () => {
    calls.length = 0;
    await post("/api/v1/vibration/stability-lobes", {});
    await post("/api/v1/vibration/chatter", {});
    await post("/api/v1/vibration/damping", {});
    await post("/api/v1/vibration/modal", {});
    const dead = new Set(["stability_lobe_calculate", "modal_analysis", "chatter_detect", "process_damping"]);
    for (const c of calls) expect(dead.has(c.action)).toBe(false);
  });
});
