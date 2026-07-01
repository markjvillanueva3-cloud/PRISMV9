/**
 * Quality-route <-> dispatcher-action contract guard (slot:sierra, U-FE-ROUTE-ACTION-CONTRACT fix).
 *
 * /cpk previously called prism_quality `capability_analysis` -- absent from the 45-action dispatcher
 * -> silent HTTP 200 + {error}. Real action: `spc_process_capability_analyze`. The other 3 quality
 * routes (spc_calculate, measurement_analyze, tolerance_stack) already resolved.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createQualityRouter } from "../routes/quality.js";

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
  app.use("/api/v1/quality", createQualityRouter(recordingCallTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("quality route -> dispatcher action contract", () => {
  it("/cpk calls the real spc_process_capability_analyze action (not the dead capability_analysis)", async () => {
    calls.length = 0;
    const res = await post("/api/v1/quality/cpk", { samples: [1, 2, 3] });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe("prism_quality");
    expect(calls[0].action).toBe("spc_process_capability_analyze");
    expect(calls[0].action).not.toBe("capability_analysis");
  });
});
