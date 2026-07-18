/**
 * erpAcctCloseRoutes.test.ts -- U-ERP-ACCT-CLOSE-FE (slot:hotel, 2026-07-02)
 *
 * The 9 accounting-close dispatcher cases (AccountingHardeningEngine.bankReconciliation /
 * wipValuation / varianceAnalysis / costToComplete / multiPeriodCompare / quickbooksSync +
 * form_1099nec_generate + payroll_generate_w2 + sales_use_tax_calc) existed with ZERO route
 * exposure -- the FE could not reach month-end close at all. This unit added 9 gated routes
 * to erp.ts. This test pins:
 *
 *   1. AUTH MATRIX -- anon -> 401 everywhere; operator -> 200 on the pure calculators
 *      (caller-supplied data, mirrors /gl-trial-balance) but 403 on EVERY hr-gated route
 *      (bank-reconcile / quickbooks-sync / 1099-NEC / W2 -- GL-write-class + SSN-bearing);
 *      hr_manager/admin -> 200 on the gated routes. Negative controls per gated route --
 *      an allow-only test passes with or without the gate (R9).
 *   2. ENVELOPE UNWRAP -- prism_business returns the {type:"text", text:"<json>"} slimResponse
 *      with NO content[] wrapper (the recurring dead-panel class: estimate-flow, quote-compat,
 *      RFQInbox, ERP-autofeed). For these 9 actions the dispatcher stringifies the BARE engine
 *      result (businessDispatcher.ts:8178 -- there is NO {success,data} layer; that layer is
 *      rfq_*-specific), so production resolves through rfqRoute's `r?.data ?? r` FALLBACK
 *      branch. The happy-path mock here returns that TRUE bare wire shape (scrutiny arm-B P1:
 *      a {success,data} mock exercised only the .data branch -- a strict `data: r.data`
 *      refactor of rfqRoute would have killed all 9 panels while the suite stayed green).
 *      A route that forgot to unwrap still FAILS (body.data would be {type,text}).
 *   3. ACTION MAPPING -- each route dispatches the exact dispatcher action name (catches
 *      route->action typos that would 200 in an allow-test but hit the wrong engine).
 *
 * FIDELITY: stubs ONLY verifyToken (x-test-roles header stand-in, 401 when absent -- the real
 * anon path); requireRole stays REAL via importOriginal (the authorization decision under test).
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
      req.userId = "test-user";
      req.userRoles = String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
      next();
    },
    // requireRole is the REAL one -- the authz decision under test.
  };
});

import { createErpRouter } from "../routes/erp.js";

type ToolCall = { tool: string; action: string; params: any };

/** Production-wire mock: prism_business slimResponse wraps the BARE engine result
 *  ({type,text:JSON.stringify(result)}) for these actions -- no {success,data} layer. */
function mockCallTool(captured: ToolCall[], innerData: unknown = { reconciled: true, match_rate_pct: 97.5 }) {
  return async (tool: string, action: string, params: any) => {
    captured.push({ tool, action, params });
    return { type: "text", text: JSON.stringify(innerData) };
  };
}

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

const HR_GATED = [
  { path: "/api/v1/erp/acct-bank-reconcile", action: "acct_bank_reconcile" },
  { path: "/api/v1/erp/acct-quickbooks-sync", action: "acct_quickbooks_sync" },
  { path: "/api/v1/erp/form-1099nec", action: "form_1099nec_generate" },
  { path: "/api/v1/erp/payroll-w2", action: "payroll_generate_w2" },
];
const CALCULATORS = [
  { path: "/api/v1/erp/acct-wip-valuation", action: "acct_wip_valuation" },
  { path: "/api/v1/erp/acct-variance-analysis", action: "acct_variance_analysis" },
  { path: "/api/v1/erp/acct-cost-to-complete", action: "acct_cost_to_complete" },
  { path: "/api/v1/erp/acct-multi-period-compare", action: "acct_multi_period_compare" },
  { path: "/api/v1/erp/sales-use-tax", action: "sales_use_tax_calc" },
];

describe("U-ERP-ACCT-CLOSE-FE: accounting-close routes on /api/v1/erp", () => {
  let app: express.Express;
  let captured: ToolCall[];

  beforeEach(() => {
    captured = [];
    app = express();
    app.use(express.json());
    app.use("/api/v1/erp", createErpRouter(mockCallTool(captured)));
  });

  it("ANON -> 401 on every accounting-close route (none reachable without login)", async () => {
    for (const r of [...HR_GATED, ...CALCULATORS]) {
      const { status } = await req(app, "POST", r.path, undefined, {});
      expect(status, r.path).toBe(401);
    }
    expect(captured).toHaveLength(0); // nothing reached the dispatcher
  });

  // NEGATIVE CONTROLS: every hr-gated route denies a plain operator (proves requireRole is load-bearing).
  it.each(HR_GATED)("AUTHED operator POST $path -> 403 (needs hr_manager/admin)", async ({ path }) => {
    const { status } = await req(app, "POST", path, "operator", {});
    expect(status).toBe(403);
    expect(captured).toHaveLength(0); // blocked before the engine
  });

  it.each(CALCULATORS)("AUTHED operator POST $path -> 200 + dispatches $action (calculator tier)", async ({ path, action }) => {
    const { status, json } = await req(app, "POST", path, "operator", { jobs: [] });
    expect(status).toBe(200);
    expect(captured[0].tool).toBe("prism_business");
    expect(captured[0].action).toBe(action); // exact action mapping -- catches route->action typos
    // ENVELOPE PROOF: body.data must be the INNER data, not the raw {type,text} slimResponse.
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ reconciled: true, match_rate_pct: 97.5 });
    expect(json.data.type).toBeUndefined();
    expect(json.data.text).toBeUndefined();
  });

  it.each(HR_GATED)("AUTHED hr_manager POST $path -> 200 + dispatches $action", async ({ path, action }) => {
    const { status, json } = await req(app, "POST", path, "hr_manager", {});
    expect(status).toBe(200);
    expect(captured[0].action).toBe(action);
    expect(json.data).toEqual({ reconciled: true, match_rate_pct: 97.5 }); // unwrapped, not {type,text}
  });

  it("AUTHED admin POST /payroll-w2 -> 200 (admin satisfies the hr tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/erp/payroll-w2", "admin", { year: 2026 });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("payroll_generate_w2");
  });

  it("engine failure ({success:false} in the envelope) -> 400, not a silent 200", async () => {
    const failApp = express();
    failApp.use(express.json());
    failApp.use("/api/v1/erp", createErpRouter(async () =>
      ({ type: "text", text: JSON.stringify({ success: false, error: "imbalanced ledger" }) })));
    const { status, json } = await req(failApp, "POST", "/api/v1/erp/acct-wip-valuation", "operator", {});
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("imbalanced ledger");
  });

  it("params forward verbatim (the engine contract is caller-supplied data)", async () => {
    const body = { bank_transactions: [{ id: "b1", amount: 100.25, date: "2026-07-01" }], gl_entries: [], bank_ending_balance: 100.25, statement_date: "2026-07-01" };
    await req(app, "POST", "/api/v1/erp/acct-bank-reconcile", "hr_manager", body);
    expect(captured[0].params).toEqual(body);
  });
});
