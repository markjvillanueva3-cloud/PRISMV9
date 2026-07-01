/**
 * hotel-portal-auth.test.ts -- U-HOTEL-PORTAL-AUTH (slot:hotel, 2026-06-24)
 *
 * The /api/v1/hotel-portal router exposes EMPLOYEE PII (digest/dashboard/pto-balance/payroll) + privileged
 * MUTATIONS (pto-approve, timeclock-edit, po-create, cofc-issue, osha-record). It is mounted under /api
 * where `optionalToken` NEVER rejects anon -- so every route was ANONYMOUSLY reachable. This unit added a
 * global `verifyToken` (401 on missing/invalid Bearer) + `requireRole` tiers on the privileged routes,
 * mirroring the sibling erp.ts. This test pins the AUTHORIZATION MATRIX:
 *
 *   - ANON (no token)            -> 401 on every gated route (the global verifyToken).
 *   - AUTHED, non-privileged     -> 200 on self-service; 403 on a privileged route.
 *   - AUTHED, right role         -> 200 on the privileged route.
 *   - GET /health                -> 200 with NO token (registered before the gate, stays open).
 *
 * FIDELITY: we use the REAL `requireRole` (the authorization decision under test, imported via
 * importActual) and stub ONLY `verifyToken` (the token-validation plumbing) to read roles from an
 * `x-test-roles` header -- exactly what the real verifyToken does (populate req.userId + req.userRoles from
 * a validated token). No header => the stub 401s, faithfully reproducing the real anon path. This exercises
 * the genuine role-gate logic without coupling to AuthEngine's register/login internals.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";

// Stub ONLY verifyToken; keep the REAL requireRole so the authz logic is genuinely tested.
vi.mock("../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/auth.js")>();
  return {
    ...actual,
    // Faithful stand-in for the real verifyToken: an `x-test-roles` header is the "valid token".
    // Missing header => 401 (the real anon path). Present => populate req.userId + req.userRoles.
    verifyToken: (req: any, res: any, next: () => void) => {
      const hdr = req.headers["x-test-roles"];
      if (hdr === undefined) {
        res.status(401).json({ error: { status: 401, message: "Missing or invalid Authorization header", code: "AUTH_REQUIRED" } });
        return;
      }
      req.userId = "test-user";
      req.userRoles = String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
      next();
    },
    // requireRole is the REAL one (from actual) -- the authorization decision under test.
  };
});

import { createHotelPortalRouter } from "../routes/hotel-portal.js";

type ToolCall = { tool: string; action: string; params: any };
function mockCallTool(captured: ToolCall[]) {
  return async (tool: string, action: string, params: any) => {
    captured.push({ tool, action, params });
    return { ok: true };
  };
}

/** Fire a request; `roles` undefined => no x-test-roles header => anon. */
async function req(
  app: express.Express,
  method: "GET" | "POST",
  path: string,
  roles?: string,
  body?: any,
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const http = require("http");
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (roles !== undefined) headers["x-test-roles"] = roles;
      const data = body !== undefined ? JSON.stringify(body) : "";
      if (data) headers["Content-Length"] = String(Buffer.byteLength(data));
      const r = http.request({ hostname: "127.0.0.1", port, path, method, headers }, (res: any) => {
        let raw = "";
        res.on("data", (c: Buffer) => (raw += c.toString()));
        res.on("end", () => {
          server.close();
          try { resolve({ status: res.statusCode, json: raw ? JSON.parse(raw) : {} }); }
          catch { resolve({ status: res.statusCode, json: {} }); }
        });
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });
  });
}

describe("U-HOTEL-PORTAL-AUTH: authorization matrix on /api/v1/hotel-portal", () => {
  let app: express.Express;
  let captured: ToolCall[];

  beforeEach(() => {
    captured = [];
    app = express();
    app.use(express.json());
    app.use("/api/v1/hotel-portal", createHotelPortalRouter(mockCallTool(captured)));
  });

  // ── ANON => 401 (the global verifyToken gate) ──────────────────────────────
  it("ANON POST /payroll/compute -> 401 (employee-PII route gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/payroll/compute", undefined, { employee_id: "E1" });
    expect(status).toBe(401);
    expect(captured).toHaveLength(0); // never reached the engine
  });

  it("ANON POST /pto/request -> 401 (even self-service requires auth)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/pto/request", undefined, { employee_id: "E1" });
    expect(status).toBe(401);
  });

  it("ANON GET /pto/balance/:id -> 401 (PII read gated)", async () => {
    const { status } = await req(app, "GET", "/api/v1/hotel-portal/pto/balance/EMP-007", undefined);
    expect(status).toBe(401);
  });

  it("ANON POST /po/create -> 401 (financial mutation gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/po/create", undefined, { vendor: "V1" });
    expect(status).toBe(401);
  });

  // ── AUTHED non-privileged => 200 self-service, 403 privileged ──────────────
  it("AUTHED operator POST /pto/request -> 200 (self-service allowed for any authed role)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/pto/request", "operator", { employee_id: "E1" });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("pto_submit_request");
  });

  it("AUTHED operator POST /payroll/compute -> 403 (needs hr_manager/admin)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/payroll/compute", "operator", { employee_id: "E1" });
    expect(status).toBe(403);
    expect(captured).toHaveLength(0); // requireRole blocked before the engine
  });

  it("AUTHED operator POST /po/create -> 403 (needs lead+)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/po/create", "operator", { vendor: "V1" });
    expect(status).toBe(403);
  });

  it("AUTHED operator POST /executive-summary -> 403 (needs admin)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/executive-summary", "operator", {});
    expect(status).toBe(403);
  });

  // ── AUTHED right role => 200 on the privileged route ───────────────────────
  it("AUTHED hr_manager POST /payroll/compute -> 200", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/payroll/compute", "hr_manager", { employee_id: "E1" });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("payroll_compute_gross");
  });

  it("AUTHED lead POST /po/create -> 200 (lead is in the lead+ tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/po/create", "lead", { vendor: "V1" });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("po_create");
  });

  it("AUTHED admin POST /executive-summary -> 200 (admin satisfies every tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/executive-summary", "admin", {});
    expect(status).toBe(200);
    expect(captured[0].action).toBe("exec_summary_build");
  });

  it("AUTHED admin POST /payroll/compute -> 200 (admin is in every privileged tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/hotel-portal/payroll/compute", "admin", { employee_id: "E1" });
    expect(status).toBe(200);
  });

  // ── /health stays OPEN (registered before the gate) ────────────────────────
  it("ANON GET /health -> 200 (monitoring probe, no auth)", async () => {
    const { status, json } = await req(app, "GET", "/api/v1/hotel-portal/health", undefined);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(captured).toHaveLength(0);
  });

  // ── NEGATIVE CONTROL (R9): an operator on a self-service route is NOT 403 ───
  // (proves requireRole is selectively applied -- not a blanket 403, not a blanket allow).
  it("AUTHED operator GET /pto/balance/:id -> 200 (self-service read, no role tier)", async () => {
    const { status } = await req(app, "GET", "/api/v1/hotel-portal/pto/balance/EMP-007", "operator");
    expect(status).toBe(200);
    expect(captured[0].action).toBe("pto_compute_balance");
  });
});
