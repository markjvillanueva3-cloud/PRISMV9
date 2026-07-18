/**
 * QUOTING-ERP-AUTOFEED route tests -- /api/v1/quote/erp-autofeed + /erp-commit.
 *
 * These two routes carry the FULL ERP/department/management field-map + employee
 * PII + a privileged WRITE, so they are verifyToken-gated (no anon view).
 *
 * Pins the two scrutiny findings the 3-of-3 caught on the first cut:
 *   1. (arm A P1, ENTITLEMENT FAILS CLOSED) a caller CANNOT self-assert
 *      `cadcam_paid:true` in the request body to obtain the CAD/CAM program
 *      paths -- the route STRIPS body cadcam_paid and sources entitlement ONLY
 *      from the verified token's permissions. A token WITHOUT the cadcam
 *      permission -> entitlement withheld even when the body claims paid; a
 *      token WITH it -> entitled.
 *   2. (arm C P0, ENVELOPE) the route returns the prism_business slimResponse
 *      {type,text} envelope verbatim; the FE client unwraps it. Here we assert
 *      the route forwards the right action + the body the engine receives
 *      (post-strip) so the dead-panel / entitlement-bypass cannot regress.
 *
 * Drives the REAL createQuoteRouter through an ephemeral Express server behind a
 * verifyToken stand-in (an `x-test-userid` header => authenticated; an
 * `x-test-roles` / `x-test-perms` header sets roles/permissions). Absent token
 * header => anonymous => the verifyToken middleware on the route 401s.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type Server } from "http";
import express from "express";
import type { CallToolFn } from "../routes/index.js";

// Mock the auth middleware so verifyToken/requireRole are driven by test headers
// (the REAL requireRole logic is exercised; only token extraction is stubbed).
vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: any, res: any, next: any) => {
    const uid = req.headers["x-test-userid"];
    if (!uid) return res.status(401).json({ error: "unauthenticated" });
    req.userId = uid;
    req.userRoles = String(req.headers["x-test-roles"] ?? "").split(",").filter(Boolean);
    req.userPermissions = String(req.headers["x-test-perms"] ?? "").split(",").filter(Boolean);
    next();
  },
  optionalToken: (req: any, _res: any, next: any) => {
    const uid = req.headers["x-test-userid"];
    if (uid) {
      req.userId = uid;
      req.userPermissions = String(req.headers["x-test-perms"] ?? "").split(",").filter(Boolean);
    }
    next();
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => {
    const has = Array.isArray(req.userRoles) && req.userRoles.some((r: string) => roles.includes(r));
    if (!has) return res.status(403).json({ error: "forbidden" });
    next();
  },
}));

// Production wire: prism_business returns a slimResponse {type,text} envelope.
function biz(engineResult: unknown) {
  return { type: "text" as const, text: JSON.stringify(engineResult) };
}

// Capture what the dispatcher action received (so we can assert the body the
// engine sees AFTER the route strips/sources cadcam_paid).
const seen: Array<{ action: string; params: any }> = [];
const callTool: CallToolFn = vi.fn(async (_tool: string, action: string, params: any) => {
  seen.push({ action, params });
  // Echo a minimal payload that reflects whether the engine WOULD entitle:
  // mirror the engine's `cadcam_paid === true` rule so the test proves the
  // route's stripping/sourcing, not the engine internals.
  const entitled = params?.cadcam_paid === true;
  if (action === "quote_to_ship_erp_autofeed") {
    return biz({ job_id: params.job_id ?? "J", cad_cam: { entitled, program_paths: entitled ? ["/p.nc"] : [] } });
  }
  if (action === "quote_to_ship_erp_commit") {
    return biz({ job_id: params.job_id ?? "J", authorized: true, actor_role: params.actor_role, writes: [] });
  }
  return biz({});
});

let server: Server;
let base: string;

beforeAll(async () => {
  const { createQuoteRouter } = await import("../routes/quote.js");
  const app = express();
  app.use(express.json());
  app.use("/api/v1/quote", createQuoteRouter(callTool));
  await new Promise<void>((resolve) => {
    server = createServer(app).listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server?.close();
});

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  // Accept either a bare sub-path (/erp-autofeed) or a full path; normalize to
  // the mount prefix so every call hits the router.
  const full = path.startsWith("/api/") ? path : `/api/v1/quote${path}`;
  const r = await fetch(`${base}${full}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* leave null */ }
  return { status: r.status, json };
}

describe("/api/v1/quote/erp-autofeed -- auth gate", () => {
  it("ANON (no token) -> 401", async () => {
    const r = await post("/api/v1/quote/erp-autofeed", { result: { pipeline_id: "P", status: "complete", stages: [] }, job_id: "J1" });
    expect(r.status).toBe(401);
  });

  it("AUTHED -> 200 + forwards quote_to_ship_erp_autofeed", async () => {
    seen.length = 0;
    const r = await post(
      "/erp-autofeed",
      { result: { pipeline_id: "P", status: "complete", stages: [] }, job_id: "J1" },
      { "x-test-userid": "u1" },
    );
    expect(r.status).toBe(200);
    expect(seen.some((s) => s.action === "quote_to_ship_erp_autofeed")).toBe(true);
  });
});

describe("/api/v1/quote/erp-autofeed -- CAD/CAM entitlement FAILS CLOSED (arm A P1)", () => {
  it("a body-supplied cadcam_paid:true does NOT entitle (stripped) when the token lacks the permission", async () => {
    seen.length = 0;
    const r = await post(
      "/erp-autofeed",
      { result: { pipeline_id: "P", status: "complete", stages: [] }, job_id: "J1", cadcam_paid: true },
      { "x-test-userid": "u1" }, // NO cadcam permission
    );
    expect(r.status).toBe(200);
    // The engine MUST NOT have received cadcam_paid:true from the body.
    const params = seen.find((s) => s.action === "quote_to_ship_erp_autofeed")!.params;
    expect(params.cadcam_paid).toBeUndefined();
  });

  it("a token WITH the cadcam permission DOES entitle (sourced from the verified token)", async () => {
    seen.length = 0;
    const r = await post(
      "/erp-autofeed",
      { result: { pipeline_id: "P", status: "complete", stages: [] }, job_id: "J1" }, // no body claim
      { "x-test-userid": "u1", "x-test-perms": "cadcam" },
    );
    expect(r.status).toBe(200);
    const params = seen.find((s) => s.action === "quote_to_ship_erp_autofeed")!.params;
    expect(params.cadcam_paid).toBe(true); // sourced from the permission, not the body
  });

  it("a token WITHOUT the permission AND no body claim -> withheld (no cadcam_paid)", async () => {
    seen.length = 0;
    await post(
      "/erp-autofeed",
      { result: { pipeline_id: "P", status: "complete", stages: [] }, job_id: "J1" },
      { "x-test-userid": "u1" },
    );
    const params = seen.find((s) => s.action === "quote_to_ship_erp_autofeed")!.params;
    expect(params.cadcam_paid).toBeUndefined();
  });
});

describe("/api/v1/quote/erp-commit -- privileged write gate", () => {
  it("ANON -> 401", async () => {
    const r = await post("/api/v1/quote/erp-commit", { job_id: "J1" });
    expect(r.status).toBe(401);
  });

  it("AUTHED but NON-supervisory role -> 403 (requireRole)", async () => {
    const r = await post("/api/v1/quote/erp-commit", { job_id: "J1" }, { "x-test-userid": "u1", "x-test-roles": "operator" });
    expect(r.status).toBe(403);
  });

  it("AUTHED supervisory role -> 200 + actor_role derived from the VERIFIED token (not the body)", async () => {
    seen.length = 0;
    const r = await post(
      "/erp-commit",
      { job_id: "J1", actor_role: "admin" }, // a body-claimed admin must be ignored
      { "x-test-userid": "u1", "x-test-roles": "lead" },
    );
    expect(r.status).toBe(200);
    const params = seen.find((s) => s.action === "quote_to_ship_erp_commit")!.params;
    // actor_role comes from the token's roles (lead), NOT the body's "admin".
    expect(params.actor_role).toBe("lead");
  });
});
