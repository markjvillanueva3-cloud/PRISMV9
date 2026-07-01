/**
 * hotel-portal-route.test.ts — HOTEL/U-HOTEL-PORTAL-REST-WIRING (iter26 /yolo)
 *
 * Verifies the REST wiring: every endpoint correctly dispatches to its matching
 * prism_business action, params flow through, errors surface. Uses a mock
 * callTool to avoid the full server boot.
 *
 * U-HOTEL-PORTAL-AUTH (2026-06-24): the router now applies the REAL verifyToken + requireRole (the routes
 * expose employee PII + privileged mutations and were anon-reachable). These WIRING tests assert "authed ->
 * dispatches to the right action", so we stub the auth middleware to an always-authed admin (admin
 * satisfies every requireRole tier) -- the AUTHORIZATION matrix (401 anon / 403 wrong-role / 200 right-role)
 * is pinned separately in hotel-portal-auth.test.ts. The stub is a correct test-intent update (the wiring
 * contract is unchanged), NOT a weakening: the auth gate itself is proven with teeth in the auth test.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";

// Stub the auth middleware so the wiring tests run as an authenticated admin (any role passes requireRole).
vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: any, _res: any, next: () => void) => {
    req.userId = "test-admin";
    req.userRoles = ["admin"];
    next();
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
}));

import { createHotelPortalRouter } from "../routes/hotel-portal.js";

interface ToolCall {
  tool: string;
  action: string;
  params: any;
}

function mockCallTool(captured: ToolCall[], response: any = { ok: true }) {
  return async (tool: string, action: string, params: any) => {
    captured.push({ tool, action, params });
    return response;
  };
}

async function postJSON(app: express.Express, path: string, body: any): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const http = require("http");
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        },
        (res: any) => {
          let raw = "";
          res.on("data", (chunk: Buffer) => (raw += chunk.toString()));
          res.on("end", () => {
            server.close();
            try {
              resolve({ status: res.statusCode, json: JSON.parse(raw) });
            } catch (e) { reject(e); }
          });
        },
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  });
}

async function getJSON(app: express.Express, path: string): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const http = require("http");
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      http.get({ hostname: "127.0.0.1", port, path, method: "GET" }, (res: any) => {
        let raw = "";
        res.on("data", (chunk: Buffer) => (raw += chunk.toString()));
        res.on("end", () => {
          server.close();
          try {
            resolve({ status: res.statusCode, json: JSON.parse(raw) });
          } catch (e) { reject(e); }
        });
      }).on("error", reject);
    });
  });
}

describe("createHotelPortalRouter", () => {
  let app: express.Express;
  let captured: ToolCall[];

  beforeEach(() => {
    captured = [];
    app = express();
    app.use(express.json());
    app.use("/api/v1/hotel-portal", createHotelPortalRouter(mockCallTool(captured)));
  });

  it("POST /digest → digest_build with body params", async () => {
    const { status, json } = await postJSON(app, "/api/v1/hotel-portal/digest", {
      employee_id: "EMP-001",
      as_of_date: "2026-06-01",
    });
    expect(status).toBe(200);
    expect(json.result).toEqual({ ok: true });
    expect(captured[0]).toEqual({
      tool: "prism_business",
      action: "digest_build",
      params: { employee_id: "EMP-001", as_of_date: "2026-06-01" },
    });
  });

  it("POST /dashboard → manager_dashboard_build", async () => {
    const { status } = await postJSON(app, "/api/v1/hotel-portal/dashboard", {
      manager_employee_id: "EMP-MGR-1",
    });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("manager_dashboard_build");
  });

  it("GET /pto/balance/:id → pto_compute_balance with id param", async () => {
    const { status, json } = await getJSON(app, "/api/v1/hotel-portal/pto/balance/EMP-007");
    expect(status).toBe(200);
    expect(json.result).toEqual({ ok: true });
    expect(captured[0].action).toBe("pto_compute_balance");
    expect(captured[0].params).toEqual({ employee_id: "EMP-007" });
  });

  it("POST /pto/request → pto_submit_request", async () => {
    const { status } = await postJSON(app, "/api/v1/hotel-portal/pto/request", {
      employee_id: "EMP-1",
      category: "vacation",
      start_date: "2026-07-01",
      end_date: "2026-07-05",
      hours_requested: 40,
    });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("pto_submit_request");
    expect(captured[0].params.hours_requested).toBe(40);
  });

  it("POST /shift/swap/propose → swap_propose", async () => {
    const { status } = await postJSON(app, "/api/v1/hotel-portal/shift/swap/propose", {
      requester_employee_id: "EMP-A",
      counterparty_employee_id: "EMP-B",
    });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("swap_propose");
  });

  it("POST /complaint → complaint_receive", async () => {
    const { status } = await postJSON(app, "/api/v1/hotel-portal/complaint", {
      customer_id: "CUST-ALCOA",
      channel: "phone",
      description: "OD diameter oversize on lot",
    });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("complaint_receive");
  });

  it("POST /payroll/compute → payroll_compute_gross", async () => {
    const { status } = await postJSON(app, "/api/v1/hotel-portal/payroll/compute", {
      employee_id: "EMP-1",
      pay_period_id: "2026-P11",
      base_rate_cents_per_hour: 3250,
      regular_hours: 40,
    });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("payroll_compute_gross");
  });

  it("POST /simulation/run → jm_die_sim_run", async () => {
    const { status } = await postJSON(app, "/api/v1/hotel-portal/simulation/run", {
      seed: 42,
      days: 30,
    });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("jm_die_sim_run");
    expect(captured[0].params.seed).toBe(42);
  });

  it("GET /role-catalog → role_academy_list_roles", async () => {
    const { status } = await getJSON(app, "/api/v1/hotel-portal/role-catalog");
    expect(status).toBe(200);
    expect(captured[0].action).toBe("role_academy_list_roles");
  });

  it("GET /role-catalog/:role → role_academy_get_curriculum", async () => {
    const { status, json } = await getJSON(app, "/api/v1/hotel-portal/role-catalog/machinist");
    expect(status).toBe(200);
    expect(json.result).toEqual({ ok: true });
    expect(captured[0].action).toBe("role_academy_get_curriculum");
    expect(captured[0].params).toEqual({ role: "machinist" });
  });

  it("GET /health → returns ms metadata without calling tool", async () => {
    const { status, json } = await getJSON(app, "/api/v1/hotel-portal/health");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.portal_engines).toBe(18);             // U-HOTEL-PORTAL-AUTH: fixed pre-existing drift (was 12)
    expect(json.iter_range).toBe("iter15..iter38");   // (was "iter15..iter25" -- route grew to iter38)
    expect(captured).toHaveLength(0);
  });

  it("GET /nc/management-review-summary → nc_management_review_summary", async () => {
    const { status } = await getJSON(app, "/api/v1/hotel-portal/nc/management-review-summary");
    expect(status).toBe(200);
    expect(captured[0].action).toBe("nc_management_review_summary");
  });
});
