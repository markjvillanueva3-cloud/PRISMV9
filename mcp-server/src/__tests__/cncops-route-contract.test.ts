/**
 * CNC-Ops route <-> dispatcher-action contract guard (slot:sierra, U-FE-CNCOPS-ACTION-FIX).
 * The router called 4 prism_cnc_ops actions that do NOT exist there (assemble_program/motion_profile/
 * magazine_optimize/setup_sheet -- those are program-level, prism_cnc_ops is per-operation). Rerouted
 * the 3 with real prism_cam homes; honest 501 for the ambiguous motion profile.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createCncOpsRouter } from "../routes/cncOps.js";

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
  app.use("/api/v1/cnc-ops", createCncOpsRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("cnc-ops route -> dispatcher action contract", () => {
  it("/assemble -> prism_cam:program_assemble", async () => {
    calls.length = 0;
    const res = await post("/api/v1/cnc-ops/assemble", { ops: [] });
    expect(res.status).toBe(200);
    expect(calls[0]).toEqual({ tool: "prism_cam", action: "program_assemble" });
  });

  it("/magazine -> prism_cam:cam_tool_magazine", async () => {
    calls.length = 0;
    const res = await post("/api/v1/cnc-ops/magazine", { tools: [] });
    expect(res.status).toBe(200);
    expect(calls[0]).toEqual({ tool: "prism_cam", action: "cam_tool_magazine" });
  });

  it("/setup-sheet -> prism_cam:setup_sheet_generate", async () => {
    calls.length = 0;
    const res = await post("/api/v1/cnc-ops/setup-sheet", { job: "x" });
    expect(res.status).toBe(200);
    expect(calls[0]).toEqual({ tool: "prism_cam", action: "setup_sheet_generate" });
  });

  it("/motion-profile -> 501 (ambiguous; no single motion_profile action)", async () => {
    calls.length = 0;
    const res = await post("/api/v1/cnc-ops/motion-profile", { axis: "x" });
    expect(res.status).toBe(501);
    expect(calls).toHaveLength(0);
  });

  it("never calls prism_cnc_ops with the 4 dead actions (regression oracle)", async () => {
    calls.length = 0;
    await post("/api/v1/cnc-ops/assemble", {});
    await post("/api/v1/cnc-ops/magazine", {});
    await post("/api/v1/cnc-ops/setup-sheet", {});
    await post("/api/v1/cnc-ops/motion-profile", {});
    const dead = new Set(["assemble_program", "motion_profile", "magazine_optimize", "setup_sheet"]);
    for (const c of calls) {
      expect(c.tool).not.toBe("prism_cnc_ops");
      expect(dead.has(c.action)).toBe(false);
    }
  });
});
