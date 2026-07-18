/**
 * BRIDGE-WIRING — ERPQualityEngine → prism_business wiring test
 *
 * Round-trips the 8 erp_quality_* actions through businessDispatcher's
 * prism_business tool. ERPQualityEngine was a built-but-orphaned engine
 * (0 dispatcher refs) — this unit wires it under a distinct namespace
 * (the existing `quality_ncr_*` actions use a different engine; this one
 * adds the ERP-sync layer with the `syncedToERP` flag and `syncToERP()`).
 *
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs):
 *   - recordInspection returns the input fields back + assigns a non-empty id
 *     and an ISO-shaped timestamp; syncedToERP defaults to false.
 *   - close_ncr on an unknown id returns null/undefined (engine signals miss).
 *   - syncToERP returns {inspectionsSynced, ncrsSynced, success: true}.
 *   - Schemas reject missing required fields, invalid enums, negative
 *     quantities, and out-of-range days.
 *
 * @milestone BRIDGE-WIRING / erp-quality
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
      if (_name === "prism_business") handler = fn;
    },
  };
  registerBusinessDispatcher(fakeServer as any);
  if (!handler) throw new Error("businessDispatcher did not register prism_business");
});

async function call(
  action: string,
  params: Record<string, any> = {},
): Promise<{ raw: any; ok: boolean; error?: string }> {
  const r = await handler!({ action, params });
  // The dispatcher returns the engine result inline via slimResponse — no
  // {result, data, success} envelope. If the engine returned undefined (e.g.
  // closeNCR on a missing id) JSON.stringify produces no text — we treat that
  // as `raw === null`, never falling back to the MCP {content:[...]} envelope
  // (which would mask the miss as a truthy object).
  let parsed: any = null;
  if (r && Array.isArray(r.content) && r.content[0]?.text != null) {
    try { parsed = JSON.parse(r.content[0].text); } catch { parsed = r.content[0].text; }
  } else if (r && r.type === "text" && typeof r.text === "string") {
    try { parsed = JSON.parse(r.text); } catch { parsed = r.text; }
  }
  const error = parsed?.error;
  const ok = !error && parsed?.success !== false;
  return { raw: parsed, ok, error };
}

// Each test uses a unique workOrderNumber to keep the singleton state
// non-interfering. Engine maps are module-private and cannot be reset from
// outside; isolation is by key-namespacing instead.
const WO_REC = "WO-ERPQ-REC-001";
const WO_CONDITIONAL = "WO-ERPQ-COND-002";
const WO_NCR = "WO-ERPQ-NCR-003";
const WO_METRICS = "WO-ERPQ-MET-004";
const WO_SYNC = "WO-ERPQ-SYNC-005";
const WO_BY_TYPE = "WO-ERPQ-TYP-006";
const WO_OPEN = "WO-ERPQ-OPN-007";

// ISO 8601 timestamp shape — YYYY-MM-DDTHH:MM:SS[...]Z, used for timestamp
// + createdAt + closedAt fields. A real, characterising assertion (rejects
// undefined, number, malformed dates).
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function inspectionPayload(wo: string, overrides: Record<string, any> = {}): Record<string, any> {
  return {
    workOrderNumber: wo,
    operationNumber: 10,
    partNumber: "P-12345",
    inspectorId: "EMP-007",
    inspectionType: "final",
    result: "pass",
    characteristics: [
      { name: "OD", nominal: 25.0, tolerance: 0.05, actual: 25.01, unit: "mm", pass: true },
    ],
    ...overrides,
  };
}

function ncrPayload(wo: string, overrides: Record<string, any> = {}): Record<string, any> {
  return {
    workOrderNumber: wo,
    partNumber: "P-12345",
    quantity: 2,
    defectType: "dimensional",
    defectDescription: "OD oversized by 0.05mm",
    disposition: "pending",
    createdBy: "EMP-007",
    ...overrides,
  };
}

describe("businessDispatcher → erp_quality_* (ERPQualityEngine wiring)", () => {
  it("erp_quality_record_inspection → returns inspection with engine-assigned id, ISO timestamp, syncedToERP=false", async () => {
    const { raw, ok } = await call("erp_quality_record_inspection", {
      inspection: inspectionPayload(WO_REC),
    });
    expect(ok).toBe(true);
    expect(raw.workOrderNumber).toBe(WO_REC);
    expect(raw.partNumber).toBe("P-12345");
    expect(raw.result).toBe("pass");
    expect(raw.id.length).toBeGreaterThan(0);
    expect(raw.timestamp).toMatch(ISO_TS);
    expect(raw.syncedToERP).toBe(false);
  });

  it("erp_quality_record_inspection accepts 'conditional' result", async () => {
    const { raw, ok } = await call("erp_quality_record_inspection", {
      inspection: inspectionPayload(WO_CONDITIONAL, { result: "conditional" }),
    });
    expect(ok).toBe(true);
    expect(raw.result).toBe("conditional");
    expect(raw.workOrderNumber).toBe(WO_CONDITIONAL);
  });

  it("erp_quality_create_ncr → returns NCR with engine-assigned id, ISO createdAt, pending disposition", async () => {
    const { raw, ok } = await call("erp_quality_create_ncr", { ncr: ncrPayload(WO_NCR) });
    expect(ok).toBe(true);
    expect(raw.workOrderNumber).toBe(WO_NCR);
    expect(raw.quantity).toBe(2);
    expect(raw.disposition).toBe("pending");
    expect(raw.id.length).toBeGreaterThan(0);
    expect(raw.createdAt).toMatch(ISO_TS);
    expect(raw.syncedToERP).toBe(false);
  });

  it("erp_quality_close_ncr → sets disposition + closedBy + ISO closedAt", async () => {
    const created = await call("erp_quality_create_ncr", { ncr: ncrPayload("WO-CLOSE-NCR") });
    expect(created.ok).toBe(true);
    const ncrId = created.raw.id;

    const { raw, ok } = await call("erp_quality_close_ncr", {
      ncr_id: ncrId,
      disposition: "rework",
      closed_by: "QA-MGR-01",
      corrective_action: "Re-machined to spec",
    });
    expect(ok).toBe(true);
    expect(raw.id).toBe(ncrId);
    expect(raw.disposition).toBe("rework");
    expect(raw.closedBy).toBe("QA-MGR-01");
    expect(raw.closedAt).toMatch(ISO_TS);
    expect(raw.correctiveAction).toBe("Re-machined to spec");
  });

  it("erp_quality_close_ncr on an unknown ncr_id → null/undefined (engine returns undefined)", async () => {
    const { raw, ok } = await call("erp_quality_close_ncr", {
      ncr_id: "NCR-NEVER-EXISTED",
      disposition: "scrap",
      closed_by: "QA-MGR-01",
    });
    expect(ok).toBe(true);
    // engine returns undefined; JSON marshalling typically yields null
    expect(raw === null || raw === undefined).toBe(true);
  });

  it("erp_quality_metrics → totals reflect the planted pass + fail (>=1 each)", async () => {
    await call("erp_quality_record_inspection", {
      inspection: inspectionPayload(WO_METRICS, { result: "pass" }),
    });
    await call("erp_quality_record_inspection", {
      inspection: inspectionPayload(WO_METRICS, { result: "fail" }),
    });
    const { raw, ok } = await call("erp_quality_metrics", { work_order_number: WO_METRICS });
    expect(ok).toBe(true);
    expect(raw.workOrderNumber).toBe(WO_METRICS);
    expect(raw.totalInspected).toBeGreaterThanOrEqual(2);
    expect(raw.totalPassed).toBeGreaterThanOrEqual(1);
    expect(raw.totalFailed).toBeGreaterThanOrEqual(1);
    expect(raw.firstPassYield).toBeGreaterThanOrEqual(0);
    expect(raw.firstPassYield).toBeLessThanOrEqual(100);
    expect(raw.openNCRs).toBeGreaterThanOrEqual(0);
  });

  it("erp_quality_sync → success:true with inspectionsSynced + ncrsSynced ≥ 1", async () => {
    await call("erp_quality_record_inspection", { inspection: inspectionPayload(WO_SYNC) });
    await call("erp_quality_create_ncr", { ncr: ncrPayload(WO_SYNC) });
    const { raw, ok } = await call("erp_quality_sync", { work_order_number: WO_SYNC });
    expect(ok).toBe(true);
    expect(raw.success).toBe(true);
    expect(raw.inspectionsSynced).toBeGreaterThanOrEqual(1);
    expect(raw.ncrsSynced).toBeGreaterThanOrEqual(1);
  });

  it("erp_quality_inspections_by_type → filters to the requested type only", async () => {
    await call("erp_quality_record_inspection", {
      inspection: inspectionPayload(WO_BY_TYPE, { inspectionType: "first_article" }),
    });
    await call("erp_quality_record_inspection", {
      inspection: inspectionPayload(WO_BY_TYPE, { inspectionType: "final" }),
    });
    const { raw, ok } = await call("erp_quality_inspections_by_type", {
      work_order_number: WO_BY_TYPE,
      inspection_type: "first_article",
    });
    expect(ok).toBe(true);
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBeGreaterThanOrEqual(1);
    raw.forEach((r: any) => expect(r.inspectionType).toBe("first_article"));
    raw.forEach((r: any) => expect(r.workOrderNumber).toBe(WO_BY_TYPE));
  });

  it("erp_quality_open_ncrs → includes our freshly-created pending NCR (matched by workOrder)", async () => {
    await call("erp_quality_create_ncr", { ncr: ncrPayload(WO_OPEN) });
    const { raw, ok } = await call("erp_quality_open_ncrs", { work_order_number: WO_OPEN });
    expect(ok).toBe(true);
    expect(Array.isArray(raw)).toBe(true);
    const ours = raw.find((n: any) => n.workOrderNumber === WO_OPEN);
    // Concrete assertion: the open-NCR list MUST contain a row matching our WO
    // AND that row's disposition is the pending state we created it in.
    expect(ours?.workOrderNumber).toBe(WO_OPEN);
    expect(ours?.disposition).toBe("pending");
  });

  it("erp_quality_inspection_trend → sparse daily buckets (only days with inspections), sorted ascending", async () => {
    // Engine contract: one entry per DATE WITH inspections, not a dense N-day
    // calendar — so length is in [0, days]. Inspections planted by sibling
    // tests this run are all today, so a 7-day window has 1 bucket (today).
    const { raw, ok } = await call("erp_quality_inspection_trend", { days: 7 });
    expect(ok).toBe(true);
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBeGreaterThanOrEqual(1);
    expect(raw.length).toBeLessThanOrEqual(7);
    raw.forEach((d: any) => {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.passed).toBeGreaterThanOrEqual(0);
      expect(d.failed).toBeGreaterThanOrEqual(0);
    });
    // sorted ascending by date
    for (let i = 1; i < raw.length; i++) {
      expect(raw[i].date >= raw[i - 1].date).toBe(true);
    }
    // sibling tests planted at least one pass and one fail today → totals reflect it
    const totalPassed = raw.reduce((s: number, d: any) => s + d.passed, 0);
    const totalFailed = raw.reduce((s: number, d: any) => s + d.failed, 0);
    expect(totalPassed).toBeGreaterThanOrEqual(1);
    expect(totalFailed).toBeGreaterThanOrEqual(1);
  });

  // ── Failure modes (schema rejection) ──

  it("rejects erp_quality_record_inspection with missing inspection field", async () => {
    const { ok } = await call("erp_quality_record_inspection", {});
    expect(ok).toBe(false);
  });

  it("rejects erp_quality_record_inspection with invalid inspectionType enum", async () => {
    const { ok } = await call("erp_quality_record_inspection", {
      inspection: inspectionPayload("WO-X", { inspectionType: "smoke_check" }),
    });
    expect(ok).toBe(false);
  });

  it("rejects erp_quality_close_ncr with missing ncr_id", async () => {
    const { ok } = await call("erp_quality_close_ncr", {
      disposition: "scrap",
      closed_by: "QA-1",
    });
    expect(ok).toBe(false);
  });

  it("rejects erp_quality_metrics with missing work_order_number", async () => {
    const { ok } = await call("erp_quality_metrics", {});
    expect(ok).toBe(false);
  });

  // ── Adversarial ──

  it("rejects erp_quality_create_ncr with negative quantity", async () => {
    const { ok } = await call("erp_quality_create_ncr", {
      ncr: ncrPayload("WO-NEG", { quantity: -5 }),
    });
    expect(ok).toBe(false);
  });

  it("rejects erp_quality_inspection_trend with days <= 0", async () => {
    const { ok } = await call("erp_quality_inspection_trend", { days: 0 });
    expect(ok).toBe(false);
  });

  it("rejects erp_quality_inspection_trend with absurd days > 365 (DoS cap)", async () => {
    const { ok } = await call("erp_quality_inspection_trend", { days: 10000 });
    expect(ok).toBe(false);
  });
});
