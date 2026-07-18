/**
 * shopLiveIdorSelfGate.test.ts -- U-ERP-IDOR-SELFGATE (slot:hotel, 2026-07-02)
 *
 * Layer 2 after U-ERP-SHOPCONFIG-AUTH's anon-close on shopLive.ts: the labor routes carry an
 * employee identity (body employee_id on /shop/labor/start, path :employeeId on
 * /shop/labor/active), so any AUTHED employee could start a payroll-feeding labor session AS
 * a peer or read a peer's active sessions. This pins the self-gate matrix:
 *
 *   - AUTHED non-privileged, peer target  -> 403 (blocked BEFORE the engine)
 *   - AUTHED non-privileged, SELF target  -> 200
 *   - AUTHED supervision role (lead), peer -> 200 (supervision passes)
 *   - ANON -> 401 (the pre-existing verifyToken gate, unchanged)
 *
 * FIDELITY (R9): verifyToken is stubbed EXACTLY like hotel-portal-auth.test.ts (x-test-roles
 * header populates req.userId="test-user" + req.userRoles; missing header => 401). The
 * self-gate middleware under test is the REAL one inside shopLive.ts. ShopStateEngine is
 * mocked (no disk I/O in unit tests per test conventions).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";

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
      req.userId = req.headers["x-test-userid"] ?? "test-user";
      req.userRoles = String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
      next();
    },
  };
});

const startLabor = vi.fn(async (args: any) => ({ session_id: "S1", ...args }));
const getActiveSessions = vi.fn(async (_id: string) => []);
vi.mock("../engines/ShopStateEngine.js", () => ({
  shopStateEngine: {
    startLabor: (args: any) => startLabor(args),
    getActiveSessions: (id: string) => getActiveSessions(id),
  },
}));

import shopLiveRouter from "../routes/shopLive.js";
import { employeeEngine } from "../engines/EmployeeEngine.js";

// The self-gate resolves the caller's employee id via EmployeeEngine.auth_user_id (auth ids
// are USR-*, targets EMP-*). Seed a self-employee linked to the stub userId "test-user" so the
// deny path exercises the REAL resolution, not a fabricated coincidence. create() mints the id
// + forces auth_user_id:null, so link via update().
const seededEmp = employeeEngine.create({ first_name: "Labor", last_name: "Self", email: "labor@jmdie.test", department: "shop", hourly_rate: 25 });
employeeEngine.update(seededEmp.id, { auth_user_id: "test-user" });
const SELF_EMP_ID = seededEmp.id;

async function req(
  app: express.Express,
  method: "GET" | "POST",
  path: string,
  roles?: string,
  body?: any,
  userId?: string,
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const http = require("http");
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (roles !== undefined) headers["x-test-roles"] = roles;
      if (userId !== undefined) headers["x-test-userid"] = userId;
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

describe("U-ERP-IDOR-SELFGATE: shopLive labor self-gate matrix", () => {
  let app: express.Express;

  beforeEach(() => {
    startLabor.mockClear();
    getActiveSessions.mockClear();
    app = express();
    app.use(express.json());
    app.use("/api", shopLiveRouter);
  });

  it("ANON POST /shop/labor/start -> 401 (pre-existing verifyToken gate unchanged)", async () => {
    const { status } = await req(app, "POST", "/api/shop/labor/start", undefined, { employee_id: "E1", job_id: "J1" });
    expect(status).toBe(401);
    expect(startLabor).not.toHaveBeenCalled();
  });

  it("operator starts labor AS a peer -> 403 (payroll-feeding session forged)", async () => {
    const { status, json } = await req(app, "POST", "/api/shop/labor/start", "operator", { employee_id: "EMP-OTHER", job_id: "J1" });
    expect(status).toBe(403);
    expect(String(json.error)).toContain("another employee");
    expect(startLabor).not.toHaveBeenCalled(); // blocked BEFORE the engine
  });

  it("operator starts labor for SELF -> 200 (the authed daily-driver flow)", async () => {
    const { status } = await req(app, "POST", "/api/shop/labor/start", "operator", { employee_id: SELF_EMP_ID, job_id: "J1" });
    expect(status).toBe(200);
    expect(startLabor).toHaveBeenCalledTimes(1);
    expect(startLabor.mock.calls[0][0].employee_id).toBe(SELF_EMP_ID);
  });

  it("caller with NO resolved employee mapping starts labor for a peer -> 200 (degrade, not dead-panel)", async () => {
    const { status } = await req(app, "POST", "/api/shop/labor/start", "operator", { employee_id: "EMP-OTHER", job_id: "J1" }, "USR-unmapped-999");
    expect(status).toBe(200); // no mapping -> cannot prove peer -> allow (auth already proven)
    expect(startLabor).toHaveBeenCalledTimes(1);
  });

  it("lead starts labor for a report -> 200 (supervision roles pass the self-gate)", async () => {
    const { status } = await req(app, "POST", "/api/shop/labor/start", "lead", { employee_id: "EMP-OTHER", job_id: "J1" });
    expect(status).toBe(200);
    expect(startLabor).toHaveBeenCalledTimes(1);
  });

  it("operator GET /shop/labor/active/EMP-OTHER -> 403 (peer work record blocked via path param)", async () => {
    const { status } = await req(app, "GET", "/api/shop/labor/active/EMP-OTHER", "operator");
    expect(status).toBe(403);
    expect(getActiveSessions).not.toHaveBeenCalled();
  });

  it("operator GET /shop/labor/active/:self -> 200 (own sessions readable)", async () => {
    const { status } = await req(app, "GET", `/api/shop/labor/active/${SELF_EMP_ID}`, "operator");
    expect(status).toBe(200);
    expect(getActiveSessions).toHaveBeenCalledWith(SELF_EMP_ID);
  });
});
