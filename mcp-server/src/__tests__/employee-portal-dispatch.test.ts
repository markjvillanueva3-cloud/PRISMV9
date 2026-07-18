/**
 * employee-portal-dispatch.test.ts -- U-PORTAL-EXPRESS-ROUTES (slot:quebec, program task #139).
 *
 * POST /api/v1/employee-portal/dispatch is the server side the phone-portal FE client
 * (web/src/api/employeePortal.ts) has posted to since 2026-05-24 -- previously targeting the
 * CUSTOMER portal router, which has no /dispatch route, so EVERY employee action hard-404'd
 * (the 2026-07-01 all-chat gap audit's finding; confirmed live 2026-07-05). This pins the new
 * route's load-bearing contracts:
 *
 *  1. VERBATIM FORWARD: prism_shop returns the standard content[] wrapper which the production
 *     callTool peels+parses (shopDispatcher.ts:1978) -- the route must forward the PARSED result
 *     verbatim (client reads {ok,...} directly). So the mock returns PLAIN objects (the post-peel
 *     wire), NOT the bare {type,text} env() used for prism_business tests -- prism_shop's wire
 *     differs (R9: mock the real wire for THIS dispatcher).
 *  2. DENY-BY-DEFAULT: only the 25 client-exported emp_* actions dispatch; the other 58 emp_*
 *     dispatcher actions (and anything else) 403 -- proven with teeth (callTool never invoked).
 *  3. ROLE GATE: emp_bump_job_priority / emp_delegate_task require lead/hr_manager/admin; a
 *     basic-role deny is proven with teeth, and the allow path proven with the right role.
 *  4. FAIL LOUD: a dispatcher failure ({success:false}) maps to 400 with a clean message; anon 401.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { vi } from "vitest";

vi.mock("../middleware/auth.js", () => ({
  // Same opt-in-header stub as erp-rfq-routes.test.ts: default authed basic user; x-test-roles
  // overrides; "anon" sentinel simulates a missing/invalid Bearer -> 401 like the real verifyToken.
  verifyToken: (req: any, res: any, next: () => void) => {
    if (req.headers["x-test-anon"] === "1") {
      res.status(401).json({ error: "AUTH_REQUIRED" });
      return;
    }
    req.userId = "test-user";
    const roles = req.headers["x-test-roles"];
    req.userRoles = roles ? String(roles).split(",").map((s: string) => s.trim()) : ["employee"];
    next();
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
  requireSelfOrAdmin: (_req: any, _res: any, next: () => void) => next(),
  validateTimestamp: (_req: any, _res: any, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createEmployeePortalRouter } from "../routes/employee-portal.js";
import type { CallToolFn } from "../routes/index.js";

const calls: Array<{ tool: string; action: string; params: Record<string, unknown> }> = [];
const callTool: CallToolFn = (async (tool: string, action: string, params: Record<string, unknown> = {}) => {
  calls.push({ tool, action, params });
  // Post-peel plain objects -- what the real callTool yields after parsing prism_shop's content[].
  if (action === "emp_rank_jobs") {
    return { ok: true, count: 2, ranked: [{ job_id: "J-1", priority: 9, last_bumped_at: "2026-07-05" }, { job_id: "J-2", priority: 5, last_bumped_at: "2026-07-04" }] };
  }
  if (action === "emp_bump_job_priority") {
    return { ok: true, entry: { job_id: "J-1", priority: 10, bumped_by: "EMP-9", reason: "rush", bumped_at: "2026-07-05" } };
  }
  if (action === "emp_get_active_task") {
    return { ok: true, task: null };
  }
  if (action === "emp_stop_task") {
    // Explicit-failure shape ({success:false,...}) -- e.g. a validation reject serialized by the
    // dispatcher. NOTE: shopDispatcher has no dispatcherError wrapper; see emp_pause_task below
    // for the REAL engine-throw wire.
    return { success: false, error: "task T-404 not found", details: "stack-should-never-reach-browser" };
  }
  if (action === "emp_pause_task") {
    // The REAL engine-throw wire: shopDispatcher has no catch, so a throw propagates to
    // production callTool's catch, which returns bare { error: e.message } (index.ts:1410-1415).
    return { error: "engine exploded" };
  }
  return { ok: true, echoed: action };
}) as unknown as CallToolFn;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/employee-portal", createEmployeePortalRouter(callTool));
  await new Promise<void>((resolve) => {
    server = createServer(app).listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
      resolve();
    });
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

// FULL mount prefix in every request (a bare path 404s and makes the test vacuous -- the
// U-WIRE-PIPELINE-ROI lesson).
async function dispatch(action: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const res = await fetch(`${baseUrl}/api/v1/employee-portal/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

describe("POST /api/v1/employee-portal/dispatch (U-PORTAL-EXPRESS-ROUTES)", () => {
  it("forwards an allowlisted read VERBATIM (client reads {ok,...} directly -- no wrapper, no envelope)", async () => {
    const { status, json } = await dispatch("emp_rank_jobs");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.count).toBe(2);
    expect(json.ranked[0].job_id).toBe("J-1");
    // no re-wrapping and no envelope leak
    expect(json.result).toBeUndefined();
    expect(json.type).toBeUndefined();
  });

  it("passes params through untouched", async () => {
    calls.length = 0;
    await dispatch("emp_get_active_task", { employee_id: "EMP-7" });
    const c = calls.find((x) => x.action === "emp_get_active_task");
    expect(c?.tool).toBe("prism_shop");
    expect(c?.params).toEqual({ employee_id: "EMP-7" });
  });

  it("DENY-BY-DEFAULT: a non-allowlisted emp_* action 403s WITH TEETH (dispatcher never invoked)", async () => {
    calls.length = 0;
    // Real dispatcher action, deliberately NOT in the client-derived allowlist.
    const { status } = await dispatch("emp_acl_attach_employee_engine", { anything: 1 });
    expect(status).toBe(403);
    expect(calls.length).toBe(0);
  });

  it("anon -> 401 (verifyToken gate)", async () => {
    const { status } = await dispatch("emp_rank_jobs", {}, { "x-test-anon": "1" });
    expect(status).toBe(401);
  });

  it("ROLE GATE with teeth: emp_bump_job_priority 403s a basic employee (dispatcher never invoked)", async () => {
    calls.length = 0;
    const { status, json } = await dispatch("emp_bump_job_priority", { job_id: "J-1", new_priority: 10, admin_id: "EMP-9", reason: "rush" });
    expect(status).toBe(403);
    expect(String(json.error)).toContain("lead");
    expect(calls.length).toBe(0);
  });

  it("ROLE GATE allow path: a lead can bump priority (200, verbatim entry)", async () => {
    const { status, json } = await dispatch(
      "emp_bump_job_priority",
      { job_id: "J-1", new_priority: 10, admin_id: "EMP-9", reason: "rush" },
      { "x-test-roles": "lead" },
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.entry.priority).toBe(10);
  });

  it("FAIL LOUD: a dispatcher {success:false} maps to 400 with a CLEAN message (no details/stack echo)", async () => {
    const { status, json } = await dispatch("emp_stop_task", { task_id: "T-404", employee_id: "EMP-7", completed: false });
    expect(status).toBe(400);
    expect(json.error).toBe("task T-404 not found");
    expect(JSON.stringify(json)).not.toContain("stack-should-never-reach-browser");
  });

  it("FAIL LOUD: a bare {error} (the REAL engine-throw wire -- callTool catch, index.ts:1410) maps to 400", async () => {
    const { status, json } = await dispatch("emp_pause_task", { task_id: "T-1", employee_id: "EMP-7", reason: "jam" });
    expect(status).toBe(400);
    expect(json.error).toBe("engine exploded");
  });

  it("missing action -> 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/employee-portal/dispatch`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ params: {} }),
    });
    expect(res.status).toBe(400);
  });
});
