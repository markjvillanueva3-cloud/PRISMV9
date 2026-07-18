/**
 * businessDispatcher.quality-wire.test.ts -- HOTEL-ERP-WIRING/U-ERP-QUALITY-ROUTES
 *
 * Standing wiring guard for the Kienzle Quality page feeds. ERPQualityEngine (inspections + NCRs) existed
 * as prism_business erp_quality_* actions but had NO REST routes -- the Quality page could not reach it.
 * erp.ts now routes 7 of them; this round-trips each through the REAL dispatcher and asserts it RESOLVES
 * (not "Unknown business action"). Read actions assert real shapes; write actions (mutating, param-required)
 * assert they reach the dispatcher's Zod param validation (businessActionSchemas -> a real {success:false}
 * on empty), which fires before ERPQualityEngine -- proving the case resolved, not an Unknown-action stub.
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

const isUnknownAction = (out: any) => typeof out?.error === "string" && /unknown business action/i.test(out.error);

describe("businessDispatcher -- Kienzle Quality page feeds are wired (not Unknown-action stubs)", () => {
  const handler = getHandler();

  it("erp_quality_open_ncrs resolves to ERPQualityEngine.getOpenNCRs() (array)", async () => {
    const out = unwrap(await handler({ action: "erp_quality_open_ncrs", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(Array.isArray(out)).toBe(true);
  });

  it("erp_quality_inspection_trend resolves to ERPQualityEngine.getInspectionTrend() (array)", async () => {
    const out = unwrap(await handler({ action: "erp_quality_inspection_trend", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(Array.isArray(out)).toBe(true);
  });

  it("erp_quality_metrics resolves to ERPQualityEngine.getQualityMetrics() with a work order", async () => {
    const out = unwrap(await handler({ action: "erp_quality_metrics", params: { work_order_number: "WO-TEST" } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(typeof out).toBe("object");
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });

  it("erp_quality_inspections_by_type resolves with a work order", async () => {
    const out = unwrap(await handler({ action: "erp_quality_inspections_by_type", params: { work_order_number: "WO-TEST" } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(typeof out).toBe("object");
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });

  it("erp_quality_record_inspection reaches ERPQualityEngine validation (not Unknown-action)", async () => {
    const out = unwrap(await handler({ action: "erp_quality_record_inspection", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    // empty params -> the dispatcher Zod schema validation fires (proves it resolved past Unknown-action):
    expect(/inspection|invalid|required/i.test(JSON.stringify(out))).toBe(true);
  });

  it("erp_quality_create_ncr reaches ERPQualityEngine validation (not Unknown-action)", async () => {
    const out = unwrap(await handler({ action: "erp_quality_create_ncr", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(/ncr|invalid|required/i.test(JSON.stringify(out))).toBe(true);
  });

  it("erp_quality_close_ncr reaches ERPQualityEngine validation (not Unknown-action)", async () => {
    const out = unwrap(await handler({ action: "erp_quality_close_ncr", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(/ncr_id|ncr|invalid|required/i.test(JSON.stringify(out))).toBe(true);
  });

  it("an unknown quality action DOES error (proves the resolution markers are load-bearing)", async () => {
    const out = unwrap(await handler({ action: "erp_quality_metrics_DOES_NOT_EXIST" as any, params: {} }));
    expect(isUnknownAction(out)).toBe(true);
  });
});
