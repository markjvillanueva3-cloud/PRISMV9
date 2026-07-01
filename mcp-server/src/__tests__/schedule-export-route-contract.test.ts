/**
 * Schedule + Export route <-> dispatcher-action contract guard (slot:sierra,
 * U-FE-ROUTE-ACTION-CONTRACT fix). Both routers called actions absent from their dispatchers
 * (silent 200+{error}); this asserts the corrected wiring.
 *
 * schedule: /machines -> prism_machine_live:machine_live_status (re-routed -- prism_scheduling has
 *           no machine-status action); /conflicts -> 501 (no scheduling conflict_detect exists).
 * export:   /speed-feed-card -> 501 (prism_export has no render_speed_feed_card renderer).
 * Dead actions (machine_status, conflict_detect, render_speed_feed_card) must never be called.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createScheduleRouter } from "../routes/schedule.js";
import { createExportRouter } from "../routes/exportRoutes.js";

interface Recorded { tool: string; action: string }
const calls: Recorded[] = [];
const recordingCallTool: CallToolFn = async (tool, action) => {
  calls.push({ tool, action });
  return { ok: true };
};

let server: http.Server;
let port = 0;

function req(method: string, urlPath: string, body?: unknown): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const r = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve({ status: res.statusCode ?? 0 }));
    });
    r.on("error", reject);
    if (payload !== undefined) r.write(payload);
    r.end();
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/schedule", createScheduleRouter(recordingCallTool));
  app.use("/api/v1/export", createExportRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("schedule + export route -> dispatcher action contract", () => {
  it("schedule /machines re-routes to prism_machine_live:machine_all_status (no-id overview)", async () => {
    // machine_all_status, NOT machine_live_status: the latter requires machine_id:min(1), so the
    // overview endpoint (no body) must use the all-machines action whose schema accepts {}.
    calls.length = 0;
    const res = await req("GET", "/api/v1/schedule/machines");
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("prism_machine_live");
    expect(calls[0].action).toBe("machine_all_status");
    expect(calls[0].action).not.toBe("machine_live_status");
  });

  it("schedule /conflicts fails loud with 501 (no scheduling conflict_detect action)", async () => {
    calls.length = 0;
    const res = await req("GET", "/api/v1/schedule/conflicts");
    expect(res.status).toBe(501);
    expect(calls).toHaveLength(0);
  });

  it("export /speed-feed-card fails loud with 501 (no render_speed_feed_card action)", async () => {
    calls.length = 0;
    const res = await req("POST", "/api/v1/export/speed-feed-card", { tool: "endmill" });
    expect(res.status).toBe(501);
    expect(calls).toHaveLength(0);
  });

  it("never calls the three dead (non-existent) actions (regression oracle)", async () => {
    calls.length = 0;
    await req("GET", "/api/v1/schedule/machines");
    await req("GET", "/api/v1/schedule/conflicts");
    await req("POST", "/api/v1/export/speed-feed-card", {});
    const dead = new Set(["machine_status", "conflict_detect", "render_speed_feed_card"]);
    for (const c of calls) expect(dead.has(c.action)).toBe(false);
  });

  it("schedule /jobs + /capacity still call their (already-valid) real actions", async () => {
    calls.length = 0;
    await req("POST", "/api/v1/schedule/jobs", { jobs: [] });
    await req("POST", "/api/v1/schedule/capacity", { window: "week" });
    expect(calls.map((c) => c.action).sort()).toEqual(["capacity_plan", "job_schedule"]);
  });
});
