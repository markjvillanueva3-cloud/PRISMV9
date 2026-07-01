/**
 * businessDispatcher.erp-analytics-wire.test.ts
 *
 * Standing wiring guard for the 4 ERP-analytics actions added in HOTEL-ERP-WIRING
 * (U-ERP-OPS-KPIS / U-ERP-MARGIN-TRENDS / U-ERP-CASH-FLOW / U-ERP-REVENUE-FORECAST). Each backs a
 * Claude-Design ERP page through a real engine; erp-live-smoke found them as 501/Unknown-action stubs.
 *
 * WHY (R9 + feedback_dispatcher_path_green_not_engine_green): an engine unit test passing and the
 * action being "in the enum" can BOTH be green while the dispatcher case is missing/renamed -> the
 * route 500s with "Unknown business action" at runtime. This round-trips each action through the REAL
 * dispatcher (registerBusinessDispatcher -> prism_business switch -> lazy engine import) and asserts the
 * action RESOLVES to its engine method (a method-specific structural marker), NOT an Unknown-action
 * error. It would go red if a case were deleted/renamed or an ACTIONS entry dropped.
 *
 * All 4 are READ-ONLY composers over existing data (job lifecycle / general ledger), so calling them in
 * a test has no side effects. Structural markers (not values) are asserted so the guard is independent
 * of the shared singletons' current data.
 */
import { describe, it, expect } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function getHandler(): Handler {
  let captured: Handler | undefined;
  registerBusinessDispatcher({
    tool(_name: string, _desc: string, _schema: unknown, fn: Handler) {
      captured = fn;
    },
  });
  if (!captured) throw new Error("registerBusinessDispatcher did not register a handler");
  return captured;
}

/**
 * Unwrap the dispatcher's MCP content envelope to the payload object. The handler returns a single
 * content block `{ type:"text", text:"<json>" }` (and some paths an array `{ content:[{...}] }`) --
 * handle both, parsing the inner JSON.
 */
function unwrap(res: any): any {
  if (res == null) return res;
  if (res.type === "text" && typeof res.text === "string") {
    try { return JSON.parse(res.text); } catch { return res.text; }
  }
  const arrText = res?.content?.[0]?.text;
  if (typeof arrText === "string") {
    try { return JSON.parse(arrText); } catch { return arrText; }
  }
  return res;
}

describe("businessDispatcher — ERP analytics actions are wired (not Unknown-action stubs)", () => {
  const handler = getHandler();

  it("operations_kpis resolves to JobLifecycleEngine.operationsKpis()", async () => {
    const out = unwrap(await handler({ action: "operations_kpis", params: {} }));
    expect(out).toBeTruthy();
    expect(out.error).toBeUndefined(); // not "Unknown business action: operations_kpis"
    // structural marker of the real rollup (present whether or not the job store has data):
    expect(typeof out.data_available).toBe("boolean");
    expect(typeof out.total_jobs).toBe("number");
    expect(typeof out.by_status).toBe("object");
  });

  it("margin_trends resolves to GeneralLedgerEngine.marginTrends()", async () => {
    const out = unwrap(await handler({ action: "margin_trends", params: { months: 3, as_of: "2026-06-15" } }));
    expect(out).toBeTruthy();
    expect(out.error).toBeUndefined();
    expect(out.metric).toBe("net_margin");
    expect(Array.isArray(out.periods)).toBe(true);
  });

  it("cash_flow_summary resolves to GeneralLedgerEngine.cashFlowSummary()", async () => {
    const out = unwrap(await handler({ action: "cash_flow_summary", params: { months: 3, as_of: "2026-06-15" } }));
    expect(out).toBeTruthy();
    expect(out.error).toBeUndefined();
    expect(Array.isArray(out.cash_accounts)).toBe(true);
    expect(Array.isArray(out.periods)).toBe(true);
  });

  it("revenue_forecast resolves to GeneralLedgerEngine.revenueForecast()", async () => {
    const out = unwrap(await handler({ action: "revenue_forecast", params: { lookback_months: 6, horizon_months: 3, as_of: "2026-06-15" } }));
    expect(out).toBeTruthy();
    expect(out.error).toBeUndefined();
    expect(out.method).toBe("linear_trend_runrate");
    expect(Array.isArray(out.history)).toBe(true);
  });

  it("timecard_audit_log resolves to TimeClockEngine.timecardAuditLog()", async () => {
    const out = unwrap(await handler({ action: "timecard_audit_log", params: { limit: 5 } }));
    expect(out).toBeTruthy();
    expect(out.error).toBeUndefined();
    expect(typeof out.data_available).toBe("boolean");
    expect(Array.isArray(out.entries)).toBe(true);
    expect(typeof out.total).toBe("number");
  });

  it("a3_report_create resolves to A3ReportEngine.create()", async () => {
    const out = unwrap(await handler({ action: "a3_report_create", params: { title: "wire-guard probe", problem_statement: "probe" } }));
    expect(out.error).toBeUndefined();
    expect(out.id).toMatch(/^A3-/);
    expect(out.status).toBe("draft");
  });

  it("a3_report_list resolves to A3ReportEngine.list()", async () => {
    const out = unwrap(await handler({ action: "a3_report_list", params: { limit: 5 } }));
    expect(out.error).toBeUndefined();
    expect(typeof out.data_available).toBe("boolean");
    expect(Array.isArray(out.reports)).toBe(true);
  });

  it("a3_report_get resolves to A3ReportEngine.get() ({found:false} for a bogus id)", async () => {
    const out = unwrap(await handler({ action: "a3_report_get", params: { id: "A3-NOPE" } }));
    expect(out.error).toBeUndefined();
    expect(out.found).toBe(false);
  });

  it("a missing/unknown action does NOT produce the success markers (proves the markers lock the wiring)", async () => {
    const out = unwrap(await handler({ action: "operations_kpis_DOES_NOT_EXIST" as any, params: {} }));
    // Whatever the unmatched-action path yields (error / undefined / generic), it must NOT look like a
    // real operations_kpis result -- so the marker assertions above would go red if a real case were
    // deleted or renamed (the dispatcher-path-green-not-engine-green regression this guard exists for).
    const looksLikeRealKpis = !!(out && typeof out.total_jobs === "number" && typeof out.by_status === "object");
    expect(looksLikeRealKpis).toBe(false);
  });
});
