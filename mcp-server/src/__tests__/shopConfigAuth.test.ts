/**
 * shopConfigAuth.test.ts -- U-ERP-SHOPCONFIG-AUTH (slot:hotel, 2026-07-02)
 *
 * FOUR ERP routers were mounted under the global `optionalToken` (index.ts) which NEVER rejects anon,
 * and carried ZERO auth of their own -- so every route was ANONYMOUSLY reachable:
 *   - shopProfile.ts      (/api/v1/shop)              -> the shop rate card + overhead/margin/markup, AND
 *                                                        anon PUT /profile / machine CRUD (config tamper).
 *   - traveler.ts         (/api/v1 -> /traveler,/dispatch) -> whole-shop dispatch board + anon dispatch mutations.
 *   - shopLive.ts         (/api -> /shop/*)           -> customer/part/job state + anon job/labor/qty/approval writes.
 *   - operating-system.ts (/api/v1/operating-system)  -> anon cross-entity search over employee/invoice/PO indices.
 *
 * This unit added a router-level `verifyToken` (401 on missing/invalid Bearer) to all four, plus `requireRole`
 * tiers on the privileged WRITE mutations (config writes = admin/lead; dispatch + job-lifecycle = lead+).
 * This test pins the AUTHORIZATION MATRIX + a COST-LEAK SCAN:
 *
 *   - ANON (no token)        -> 401 on every gated route (the global verifyToken).
 *   - AUTHED wrong role      -> 403 on a privileged mutation (requireRole under test).
 *   - AUTHED right role      -> 200/handled on the privileged mutation.
 *   - AUTHED any role        -> read routes reachable (self-service / floor reads).
 *   - LEAK SCAN              -> anon GET /shop/profile + /shop/preferences return 401 and NO body carrying
 *                              `rates` / `overhead_pct` / `margin_floor_pct` (the exact fields that leaked).
 *
 * FIDELITY (R9): we use the REAL `requireRole` (the authorization decision under test) and stub ONLY
 * `verifyToken` (the token-validation plumbing) to read roles from an `x-test-roles` header -- exactly what
 * the real verifyToken does (populate req.userId + req.userRoles from a validated token). Missing header =>
 * the stub 401s, faithfully reproducing the real anon path. A both-mocked test would be false-green.
 *
 * NEGATIVE CONTROL: every requireRole mutation gets its OWN wrong-role-403 -- an allow-only test passes with
 * OR without the gate; only a wrong-role-403 proves the gate is load-bearing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";

// Stub ONLY verifyToken; keep the REAL requireRole so the authz logic is genuinely tested.
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
      req.userRoles = String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
      next();
    },
    // requireRole stays REAL -- the authorization decision under test.
  };
});

import { createShopProfileRouter } from "../routes/shopProfile.js";
import { createTravelerRouter } from "../routes/traveler.js";
import { createOperatingSystemRouter } from "../routes/operating-system.js";
import shopLiveRouter from "../routes/shopLive.js";
import { shopStateEngine } from "../engines/ShopStateEngine.js";

/** Fire a request against a freshly-listening app; `roles` undefined => no header => anon. */
async function req(
  app: express.Express,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  roles?: string,
  body?: any,
): Promise<{ status: number; json: any; raw: string }> {
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
          try { resolve({ status: res.statusCode, json: raw ? JSON.parse(raw) : {}, raw }); }
          catch { resolve({ status: res.statusCode, json: {}, raw }); }
        });
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });
  });
}

// Mirror index.ts mounts exactly so the paths under test are the REAL production paths.
// The production app runs `app.use("/api", optionalToken)` (index.ts:144) BEFORE the
// routers, populating req.userId for any valid Bearer without rejecting anon. We
// reproduce that with a test-shim that reads the same x-test-roles header, so the
// kiosk-exempt /shop/jobs can distinguish authed (full board) from anon (redacted).
function makeApp(): express.Express {
  const app = express();
  app.use(express.json());
  // optionalToken stand-in: set req.userId/req.userRoles if the test "token" is present, never reject.
  app.use("/api", (req: any, _res, next) => {
    const hdr = req.headers["x-test-roles"];
    if (hdr !== undefined) {
      req.userId = "test-user";
      req.userRoles = String(hdr).split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    next();
  });
  app.use("/api/v1/shop", createShopProfileRouter());
  app.use("/api/v1", createTravelerRouter());                        // /traveler/* + /dispatch/*
  app.use("/api/v1/operating-system", createOperatingSystemRouter(async () => ({ ok: true })));
  app.use("/api", shopLiveRouter);                                   // /shop/*
  return app;
}

describe("U-ERP-SHOPCONFIG-AUTH: authorization matrix on the 4 ungated ERP routers", () => {
  let app: express.Express;
  beforeEach(() => { app = makeApp(); });

  // ── shopProfile.ts (/api/v1/shop) ──────────────────────────────────────────
  describe("shopProfile /api/v1/shop", () => {
    it("ANON GET /profile -> 401 AND does not leak the rate card", async () => {
      const { status, raw } = await req(app, "GET", "/api/v1/shop/profile", undefined);
      expect(status).toBe(401);
      // LEAK SCAN: the response body must NOT carry the internal cost stack.
      expect(raw).not.toMatch(/"rates"/);
      expect(raw).not.toMatch(/overhead_pct/);
      expect(raw).not.toMatch(/margin_floor_pct/);
      expect(raw).not.toMatch(/material_markup_pct/);
    });

    it("ANON GET /preferences -> 401 AND does not leak rates", async () => {
      const { status, raw } = await req(app, "GET", "/api/v1/shop/preferences", undefined);
      expect(status).toBe(401);
      expect(raw).not.toMatch(/"rates"/);
    });

    it("ANON PUT /profile -> 401 (config-tamper mutation gated, no disk write)", async () => {
      const { status } = await req(app, "PUT", "/api/v1/shop/profile", undefined, { rates: { labor_per_hr: 1 } });
      expect(status).toBe(401);
    });

    it("ANON POST /machines -> 401 (fleet mutation gated)", async () => {
      const { status } = await req(app, "POST", "/api/v1/shop/machines", undefined, { id: "x", name: "x" });
      expect(status).toBe(401);
    });

    it("AUTHED operator GET /profile -> 200 (any authed employee may READ shop config)", async () => {
      const { status } = await req(app, "GET", "/api/v1/shop/profile", "operator");
      expect(status).toBe(200);
    });

    // NEGATIVE CONTROL: every config mutation denies a wrong role (proves requireRole is load-bearing).
    it("AUTHED operator PUT /profile -> 403 (config write needs admin/lead)", async () => {
      const { status } = await req(app, "PUT", "/api/v1/shop/profile", "operator", { rates: { labor_per_hr: 1 } });
      expect(status).toBe(403);
    });

    it("AUTHED operator POST /machines -> 403 (fleet write needs admin/lead)", async () => {
      const { status } = await req(app, "POST", "/api/v1/shop/machines", "operator", { id: "x", name: "x" });
      expect(status).toBe(403);
    });

    it("AUTHED operator PUT /machines/:id -> 403 (fleet write needs admin/lead)", async () => {
      const { status } = await req(app, "PUT", "/api/v1/shop/machines/vmc-1", "operator", { name: "x" });
      expect(status).toBe(403);
    });

    it("AUTHED operator DELETE /machines/:id -> 403 (fleet write needs admin/lead)", async () => {
      const { status } = await req(app, "DELETE", "/api/v1/shop/machines/vmc-1", "operator");
      expect(status).toBe(403);
    });

    it("AUTHED operator PUT /magazine/:id -> 403 (fleet write needs admin/lead)", async () => {
      const { status } = await req(app, "PUT", "/api/v1/shop/magazine/vmc-1", "operator", { magazine: [] });
      expect(status).toBe(403);
    });

    it("AUTHED lead PUT /profile -> NOT 401/403 (lead is in the admin/lead tier)", async () => {
      const { status } = await req(app, "PUT", "/api/v1/shop/profile", "lead", { });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── traveler.ts (/api/v1/traveler + /api/v1/dispatch) ──────────────────────
  describe("traveler /api/v1/dispatch", () => {
    it("ANON GET /dispatch/board -> 401 (whole-shop queue state gated)", async () => {
      const { status } = await req(app, "GET", "/api/v1/dispatch/board", undefined);
      expect(status).toBe(401);
    });

    it("ANON POST /dispatch/assign -> 401 (dispatch mutation gated)", async () => {
      const { status } = await req(app, "POST", "/api/v1/dispatch/assign", undefined, {});
      expect(status).toBe(401);
    });

    it("AUTHED operator GET /dispatch/board -> 200 (authed operators may read the board)", async () => {
      const { status } = await req(app, "GET", "/api/v1/dispatch/board", "operator");
      expect(status).toBe(200);
    });

    // NEGATIVE CONTROL: each dispatch write denies a wrong role.
    it("AUTHED operator POST /dispatch/assign -> 403 (floor scheduling needs lead+)", async () => {
      const { status } = await req(app, "POST", "/api/v1/dispatch/assign", "operator", {});
      expect(status).toBe(403);
    });

    it("AUTHED operator POST /dispatch/reorder -> 403 (floor scheduling needs lead+)", async () => {
      const { status } = await req(app, "POST", "/api/v1/dispatch/reorder", "operator", {});
      expect(status).toBe(403);
    });

    it("AUTHED operator POST /dispatch/remove -> 403 (floor scheduling needs lead+)", async () => {
      const { status } = await req(app, "POST", "/api/v1/dispatch/remove", "operator", {});
      expect(status).toBe(403);
    });

    it("AUTHED lead POST /dispatch/assign -> NOT 401/403 (lead is in the lead+ tier)", async () => {
      const { status } = await req(app, "POST", "/api/v1/dispatch/assign", "lead", {});
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── shopLive.ts (/api/shop/*) ──────────────────────────────────────────────
  describe("shopLive /api/shop", () => {
    // KIOSK EXEMPTION: the two board reads that power the login-less /shop-tv
    // wall display carry only aggregate counts + floor-visible job status (no
    // cost/rate/margin/PII/mutation), so they STAY anon-readable by design.
    it("ANON GET /shop/snapshot -> 200 (kiosk board: aggregate counts only, no cost/PII)", async () => {
      const { status, raw } = await req(app, "GET", "/api/shop/snapshot", undefined);
      expect(status).toBe(200);
      // LEAK SCAN: the kiosk snapshot must carry NO cost/rate/margin fields.
      expect(raw).not.toMatch(/rate/i);
      expect(raw).not.toMatch(/margin/i);
      expect(raw).not.toMatch(/overhead/i);
    });

    it("ANON GET /shop/jobs -> 200 AND redacts customer/costs/PII (kiosk board is floor-visible only)", async () => {
      // Seed a real job (with customer + provenance) directly via the engine so the
      // redaction has real data to strip -- an empty board is a vacuous leak-scan.
      await shopStateEngine.createJob({
        customer: "ACME-SECRET-CUSTOMER",
        part_number: "PN-KIOSK-1",
        part_name: "Bracket",
        quantity: 5,
        due_date: new Date(Date.now() + 86400000).toISOString(),
        created_by: "secret-employee-007",
      });
      const { status, raw } = await req(app, "GET", "/api/shop/jobs", undefined);
      expect(status).toBe(200);
      // The board renders (part_number IS floor-visible), but the confidential
      // fields the raw Job carries (schemas/shop/shopDomain.ts) are STRIPPED for anon.
      expect(raw).toMatch(/PN-KIOSK-1/);                 // floor-visible field present
      expect(raw).not.toMatch(/ACME-SECRET-CUSTOMER/);    // customer identity redacted
      expect(raw).not.toMatch(/secret-employee-007/);     // created_by (PII) redacted
      expect(raw).not.toMatch(/"customer"/);
      expect(raw).not.toMatch(/"costs"/);
      expect(raw).not.toMatch(/estimated_total|actual_total/);
      expect(raw).not.toMatch(/provenance|created_by/);
    });

    it("AUTHED lead GET /shop/jobs -> 200 with the FULL board (customer visible to authed)", async () => {
      await shopStateEngine.createJob({
        customer: "ACME-AUTHED-CUSTOMER",
        part_number: "PN-AUTHED-1",
        quantity: 3,
        due_date: new Date(Date.now() + 86400000).toISOString(),
        created_by: "emp-1",
      });
      const { status, raw } = await req(app, "GET", "/api/shop/jobs", "lead");
      expect(status).toBe(200);
      // Authed callers (req.userId set by the optionalToken shim) get the full Job.
      expect(raw).toMatch(/ACME-AUTHED-CUSTOMER/);
      expect(raw).toMatch(/"customer"/);
    });

    it("ANON POST /shop/jobs -> 401 (exemption is GET-only; a POST to the same path is gated)", async () => {
      const { status } = await req(app, "POST", "/api/shop/jobs", undefined, {});
      expect(status).toBe(401);
    });

    it("ANON GET /shop/job/:id -> 401 (per-job detail read is NOT in the kiosk exemption)", async () => {
      const { status } = await req(app, "GET", "/api/shop/job/JOB-1", undefined);
      expect(status).toBe(401);
    });

    it("ANON GET /shop/approvals/:jobId -> 401 (approval read gated, not a kiosk board)", async () => {
      const { status } = await req(app, "GET", "/api/shop/approvals/JOB-1", undefined);
      expect(status).toBe(401);
    });

    it("ANON POST /shop/job/create -> 401 (job-lifecycle mutation gated)", async () => {
      const { status } = await req(app, "POST", "/api/shop/job/create", undefined, {});
      expect(status).toBe(401);
    });

    it("ANON POST /shop/labor/start -> 401 (payroll-feeding labor gated)", async () => {
      const { status } = await req(app, "POST", "/api/shop/labor/start", undefined, {});
      expect(status).toBe(401);
    });

    it("AUTHED operator GET /shop/jobs -> 200 (authed reads reachable)", async () => {
      const { status } = await req(app, "GET", "/api/shop/jobs", "operator");
      expect(status).toBe(200);
    });

    // NEGATIVE CONTROL: job-lifecycle + approval writes deny a wrong role.
    it("AUTHED operator POST /shop/job/create -> 403 (job lifecycle needs lead+)", async () => {
      const { status } = await req(app, "POST", "/api/shop/job/create", "operator", {});
      expect(status).toBe(403);
    });

    it("AUTHED operator POST /shop/job/status -> 403 (job lifecycle needs lead+)", async () => {
      const { status } = await req(app, "POST", "/api/shop/job/status", "operator", {});
      expect(status).toBe(403);
    });

    it("AUTHED operator POST /shop/approval/submit -> 403 (approval needs lead+)", async () => {
      const { status } = await req(app, "POST", "/api/shop/approval/submit", "operator", {});
      expect(status).toBe(403);
    });
  });

  // ── operating-system.ts (/api/v1/operating-system) ─────────────────────────
  describe("operating-system /api/v1/operating-system", () => {
    it("ANON GET /search -> 401 (cross-entity employee/invoice/PO search gated)", async () => {
      const { status } = await req(app, "GET", "/api/v1/operating-system/search?q=test", undefined);
      expect(status).toBe(401);
    });

    it("ANON POST /shell/bootstrap -> 401 (shell surface gated)", async () => {
      const { status } = await req(app, "POST", "/api/v1/operating-system/shell/bootstrap", undefined, {});
      expect(status).toBe(401);
    });

    it("ANON GET /hot-jobs -> 401 (operating-system read gated)", async () => {
      const { status } = await req(app, "GET", "/api/v1/operating-system/hot-jobs", undefined);
      expect(status).toBe(401);
    });

    it("AUTHED operator GET /hot-jobs -> 200 (login is the gate; no role tier here)", async () => {
      const { status } = await req(app, "GET", "/api/v1/operating-system/hot-jobs", "operator");
      expect(status).toBe(200);
    });
  });
});
