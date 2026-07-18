/**
 * devDispatcher U-WIRE-ERP-IMPORT round-trip tests — ERPImportEngine.
 *
 * Validates the 6 new actions (erp_import_work_order / erp_import_batch /
 * erp_get_work_order / erp_list_work_orders / erp_validate_work_order /
 * erp_field_mappings) wire through prism_dev and that the engine's work-order
 * import behaves per contract.
 *
 * Pattern: LIVE dispatcher round-trip (registerDevDispatcher(shim) → capture
 * handler → invoke → assert JSON). ERPImportEngine keeps a MODULE-GLOBAL Map
 * (no reset export), so each test uses a UNIQUE workOrderNumber to stay
 * order-independent.
 *
 * Wired slot:papa 2026-06-14 — continues WIRE-UNWIRED-PAPA (ERP bridge infra).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-ERP-IMPORT
 */

import { describe, it, expect } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerDevDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}

function mkWO(workOrderNumber: string, overrides: Record<string, unknown> = {}) {
  return {
    erpSystem: "jobboss",
    workOrderNumber,
    partNumber: "PN-1000",
    description: "Bracket, machined",
    customer: "ACME",
    quantityOrdered: 50,
    dueDate: "2099-12-31",
    routing: [
      { operationNumber: 10, workCenter: "VMC-01", description: "Mill OP1", setupHours: 1.5, runHoursPerUnit: 0.1 },
      { operationNumber: 20, workCenter: "DEBURR", description: "Deburr", setupHours: 0.2, runHoursPerUnit: 0.05 },
    ],
    bom: [{ itemNumber: "RAW-AL", description: "6061 plate", quantityPer: 1, unitOfMeasure: "ea" }],
    ...overrides,
  };
}

describe("U-WIRE-ERP-IMPORT — ERPImportEngine via prism_dev", () => {
  it("registers exactly one prism_dev tool", () => {
    expect(newServer().tools).toHaveLength(1);
  });

  it("erp_field_mappings returns the SAP field map (read, no state)", async () => {
    const s = newServer();
    const r = await call(s, "erp_field_mappings", { erpSystem: "sap" });
    expect(r.ok).toBe(true);
    const m = r.data.mappings as Record<string, string>;
    expect(m.workOrderNumber).toBe("AUFNR");
    expect(m.partNumber).toBe("MATNR");
  });

  it("erp_validate_work_order: valid WO -> valid:true, no errors", async () => {
    const s = newServer();
    const r = await call(s, "erp_validate_work_order", { workOrder: mkWO("WO-VALID-1") });
    expect(r.ok).toBe(true);
    expect(r.data.valid).toBe(true);
    // slimResponse strips empty arrays; an absent `errors` == no errors.
    expect((r.data.errors as string[] | undefined) ?? []).toEqual([]);
  });

  it("erp_validate_work_order: malformed WO -> valid:false with field errors", async () => {
    const s = newServer();
    const r = await call(s, "erp_validate_work_order", { workOrder: { erpSystem: "jobboss", workOrderNumber: 123 } });
    expect(r.ok).toBe(true);
    expect(r.data.valid).toBe(false);
    expect((r.data.errors as string[]).length).toBeGreaterThan(0);
  });

  it("erp_import_work_order: valid WO -> success, operationsCreated = routing length", async () => {
    const s = newServer();
    const r = await call(s, "erp_import_work_order", { workOrder: mkWO("WO-IMP-1") });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(r.data.operationsCreated).toBe(2);
    expect(r.data.bomItemsImported).toBe(1);
    expect(typeof r.data.workOrderId).toBe("string");
  });

  it("erp_import_work_order: quantityOrdered<=0 -> success:false with error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "erp_import_work_order", { workOrder: mkWO("WO-BADQTY-1", { quantityOrdered: 0 }) });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(false);
    expect((r.data.errors as string[]).some((e) => /Quantity ordered/i.test(e))).toBe(true);
  });

  it("erp_get_work_order: round-trips an imported WO (found:true)", async () => {
    const s = newServer();
    await call(s, "erp_import_work_order", { workOrder: mkWO("WO-GET-1") });
    const r = await call(s, "erp_get_work_order", { erpSystem: "jobboss", workOrderNumber: "WO-GET-1" });
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(true);
    expect((r.data.workOrder as Record<string, unknown>).partNumber).toBe("PN-1000");
  });

  it("erp_get_work_order: unknown WO -> found:false, workOrder:null", async () => {
    const s = newServer();
    const r = await call(s, "erp_get_work_order", { erpSystem: "sap", workOrderNumber: "DOES-NOT-EXIST-xyz" });
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(false);
    // slimResponse strips null; absent/null both mean "no work order".
    expect((r.data.workOrder as unknown) ?? null).toBeNull();
  });

  it("erp_list_work_orders: includes an imported WO + filters by erpSystem", async () => {
    const s = newServer();
    await call(s, "erp_import_work_order", { workOrder: mkWO("WO-LIST-1", { erpSystem: "epicor" }) });
    const r = await call(s, "erp_list_work_orders", { erpSystem: "epicor" });
    expect(r.ok).toBe(true);
    expect(r.data.count as number).toBeGreaterThanOrEqual(1);
    expect((r.data.workOrders as Array<{ workOrderNumber: string }>).some((w) => w.workOrderNumber === "WO-LIST-1")).toBe(true);
  });

  it("erp_list_work_orders with NO params -> lists all (no TypeError; params defaults to {})", async () => {
    const s = newServer();
    await call(s, "erp_import_work_order", { workOrder: mkWO("WO-LISTALL-1", { erpSystem: "infor" }) });
    const r = await call(s, "erp_list_work_orders"); // no params at all -> list everything
    expect(r.ok).toBe(true);
    expect(r.data.count as number).toBeGreaterThanOrEqual(1);
    expect((r.data.workOrders as Array<{ workOrderNumber: string }>).some((w) => w.workOrderNumber === "WO-LISTALL-1")).toBe(true);
  });

  it("erp_import_batch: 2 WOs -> totalProcessed 2, both successful", async () => {
    const s = newServer();
    const r = await call(s, "erp_import_batch", { workOrders: [mkWO("WO-BATCH-A"), mkWO("WO-BATCH-B")] });
    expect(r.ok).toBe(true);
    expect(r.data.totalProcessed).toBe(2);
    expect(r.data.successful).toBe(2);
  });

  it("rejects an invalid erpSystem enum at the dispatcher boundary (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "erp_field_mappings", { erpSystem: "not-a-real-erp" });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing required param (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "erp_get_work_order", { erpSystem: "sap" }); // missing workOrderNumber
    expect(r.ok).toBe(false);
  });
});
