/**
 * U-FE-OPERATOR-FEEDBACK guard (slot:bravo 2026-06-19).
 *
 * Two layers:
 *  (1) DISPATCHER round-trip (R15): registers the REAL sessionDispatcher and drives
 *      operator_feedback_record through it -> the REAL OperatorPreferencesEngine.recordFeedback,
 *      then proves the stored feedback is retrievable via getUnprocessedFeedback (the RLHF/LoRA
 *      feed -- the whole point of the wire). Covers happy + validation + UNTRUSTED-INPUT whitelisting
 *      (a forged `id` must not survive; only known fields persist).
 *  (2) ROUTE adapter: /api/operator/feedback wraps the body as {feedback} for the dispatcher and
 *      maps {success:false} -> 400 (so the SPA's offline-queue retry engages).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// U-ERP-P2-HARDENING: /api/operator/feedback is now verifyToken-gated (anon RLHF
// training-data injection close) and operatorId is BOUND to the verified identity.
// Stub ONLY verifyToken (x-test-roles header = the "valid token", absent = 401 --
// the real anon path); everything else in the auth module stays real.
vi.mock("../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/auth.js")>();
  return {
    ...actual,
    verifyToken: (req: any, res: any, next: () => void) => {
      const hdr = req.headers["x-test-roles"];
      if (hdr === undefined) {
        res.status(401).json({ error: { status: 401, message: "Missing or invalid Authorization header", code: "AUTH_REQUIRED" } });
        return;
      }
      req.userId = "test-user";
      req.userRoles = String(hdr).split(",").map((s: string) => s.trim()).filter(Boolean);
      next();
    },
  };
});

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { operatorPreferencesEngine } from "../engines/OperatorPreferencesEngine.js";
import type { CallToolFn } from "../routes/index.js";
import { createOperatorRouter } from "../routes/operator.js";

// ---- mock MCP server harness (same pattern as document-learning-dispatcher.test.ts) ----
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }
function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  return { server: { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } }, tools };
}
async function callAction(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

describe("prism_session:operator_feedback_record (dispatcher round-trip)", () => {
  const { server, tools } = createMockServer();
  registerSessionDispatcher(server);
  const sessionTool = tools.find((t) => t.name === "prism_session")!;

  it("registers prism_session (the dispatcher hosting operator_feedback_record)", () => {
    expect(sessionTool?.name).toBe("prism_session");
  });

  it("records valid feedback and returns a generated id (rlhfProcessed=false)", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: {
        operatorId: "op-1", tenantId: "tnt-1", timestamp: "2026-06-19T10:00:00.000Z",
        feedbackType: "thumbs_up", context: { machineId: "VMC-01" }, tags: ["good"], rlhfEligible: true,
      },
    });
    expect(r.success).toBe(true);
    expect(r.feedback.id).toMatch(/^fb-/);
    expect(r.feedback.operatorId).toBe("op-1");
    expect(r.feedback.feedbackType).toBe("thumbs_up");
    expect(r.feedback.rlhfProcessed).toBe(false);
  });

  it("rejects feedback missing operatorId/tenantId (success:false, not a throw)", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: { feedbackType: "thumbs_up", tags: [], rlhfEligible: true },
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/operatorId, tenantId/);
  });

  it("rejects an invalid feedbackType", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: { operatorId: "op-1", tenantId: "tnt-1", feedbackType: "banana", tags: [], rlhfEligible: true },
    });
    expect(r.success).toBe(false);
  });

  it("whitelists fields: a forged id/extra junk in the payload does NOT survive", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: {
        operatorId: "op-2", tenantId: "tnt-1", feedbackType: "note", reason: "ok", tags: [],
        rlhfEligible: false, id: "FORGED-ID", rlhfProcessed: true, evil: "<script>",
      },
    });
    expect(r.success).toBe(true);
    expect(r.feedback.id).not.toBe("FORGED-ID"); // engine generates the id
    expect(r.feedback.id).toMatch(/^fb-/);
    expect(r.feedback.rlhfProcessed).toBe(false); // forced false, not the forged true
    expect(r.feedback).not.toHaveProperty("evil"); // junk field not persisted
  });

  it("whitelists context: only the 4 known scalar keys survive, forged keys are dropped", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: {
        operatorId: "op-3", tenantId: "tnt-1", feedbackType: "thumbs_up", tags: [], rlhfEligible: true,
        context: { machineId: "VMC-02", evil: "<script>", polluted: { a: 1 } },
      },
    });
    expect(r.success).toBe(true);
    expect(r.feedback.context.machineId).toBe("VMC-02"); // known key kept
    expect(r.feedback.context).not.toHaveProperty("evil"); // forged key dropped
    expect(r.feedback.context).not.toHaveProperty("polluted");
  });

  it("rejects feedback with a valid operatorId but missing tenantId (isolated validation)", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: { operatorId: "op-1", feedbackType: "thumbs_up", tags: [], rlhfEligible: true },
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/operatorId, tenantId/);
  });

  it("defaults rlhfEligible to FALSE when the field is absent (opt-out, not opt-in)", async () => {
    const r = await callAction(sessionTool, "operator_feedback_record", {
      feedback: { operatorId: "op-4", tenantId: "tnt-1", feedbackType: "note", tags: [] },
    });
    expect(r.success).toBe(true);
    expect(r.feedback.rlhfEligible).toBe(false); // absent -> not enrolled in LoRA training
  });

  it("stored RLHF-eligible feedback is retrievable via getUnprocessedFeedback (the LoRA feed)", async () => {
    const tenant = "tnt-rlhf-abc";
    await callAction(sessionTool, "operator_feedback_record", {
      feedback: { operatorId: "op-9", tenantId: tenant, feedbackType: "thumbs_down", context: {}, tags: ["bad-feed"], rlhfEligible: true },
    });
    const unprocessed = operatorPreferencesEngine.getUnprocessedFeedback(tenant);
    expect(unprocessed.length).toBeGreaterThan(0);
    expect(unprocessed.some((f) => f.tags.includes("bad-feed"))).toBe(true);
  });
});

// ---- route adapter ----
let server: http.Server;
let port = 0;
let lastForwarded: { tool: string; action: string; params: any } | null = null;

const callTool: CallToolFn = async (tool, action, params) => {
  lastForwarded = { tool, action, params };
  const fb = (params as any)?.feedback ?? {};
  // operatorId is now ALWAYS bound by the route (verified identity), so the mock's
  // reject path keys on the still-caller-supplied tenantId to keep the 400 mapping covered.
  if (!fb.tenantId) return { success: false, error: "operator_feedback_record requires operatorId, tenantId, ..." };
  return { success: true, feedback: { id: "fb-test-1", ...fb } };
};

function httpRequest(method: string, urlPath: string, body?: unknown, roles?: string): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {};
    if (roles !== undefined) headers["x-test-roles"] = roles;
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers }, (resp) => {
      let text = "";
      resp.on("data", (c) => (text += c));
      resp.on("end", () => { let j: any; try { j = text ? JSON.parse(text) : undefined; } catch { j = undefined; } resolve({ status: resp.statusCode ?? 0, json: j }); });
    });
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

describe("/api/operator/feedback route", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/operator", createOperatorRouter(callTool));
    server = http.createServer(app);
    server.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("ANON POST /feedback -> 401 (RLHF training-data injection gated; never reaches the dispatcher)", async () => {
    lastForwarded = null;
    const { status } = await httpRequest("POST", "/api/operator/feedback", {
      operatorId: "op-1", tenantId: "tnt-1", feedbackType: "thumbs_up", tags: [], rlhfEligible: true,
    });
    expect(status).toBe(401);
    expect(lastForwarded).toBeNull();
  });

  it("AUTHED POST /feedback wraps as {feedback} AND binds operatorId to the VERIFIED identity (impersonation-proof)", async () => {
    const { status, json } = await httpRequest("POST", "/api/operator/feedback", {
      operatorId: "op-SPOOFED", tenantId: "tnt-1", feedbackType: "thumbs_up", tags: [], rlhfEligible: true,
    }, "operator");
    expect(status).toBe(200);
    expect(lastForwarded?.tool).toBe("prism_session");
    expect(lastForwarded?.action).toBe("operator_feedback_record");
    // The body's spoofed operatorId is OVERWRITTEN by the verified identity.
    expect(lastForwarded?.params.feedback.operatorId).toBe("test-user");
    expect(json.success).toBe(true);
    expect(json.feedback.id).toBe("fb-test-1");
  });

  it("maps a rejected record ({success:false}) to 400 so the SPA offline-queue retries", async () => {
    const { status, json } = await httpRequest("POST", "/api/operator/feedback", { feedbackType: "thumbs_up" }, "operator");
    expect(status).toBe(400);
    expect(json.message).toMatch(/requires operatorId/);
  });
});
