/**
 * ERPImportEngine.test.ts — hotel slot (iter9 / U-ERP-IMPORT-WIRE).
 */

import { describe, it, expect } from "vitest";
import { ERPImportEngine } from "../engines/ERPImportEngine.js";
import type { WorkOrderImport } from "../engines/ERPImportEngine.js";

const FUTURE_DATE = "2099-12-31";
const PAST_DATE = "2000-01-01";

function validWO(overrides: Partial<WorkOrderImport> = {}): WorkOrderImport {
  return {
    erpSystem: "jobboss",
    workOrderNumber: `WO-${Math.random().toString(36).slice(2, 8)}`,
    partNumber: "P-TEST",
    revision: "A",
    description: "Test part",
    customer: "JM Die",
    quantityOrdered: 10,
    quantityComplete: 0,
    dueDate: FUTURE_DATE,
    priority: 5,
    routing: [
      { operationNumber: 10, workCenter: "VMC-1", description: "rough", setupHours: 1, runHoursPerUnit: 0.5, setupComplete: false, quantityComplete: 0 },
    ],
    ...overrides,
  };
}

describe("ERPImportEngine — importWorkOrder", () => {
  it("success path returns workOrderId with WO- prefix", () => {
    const r = ERPImportEngine.importWorkOrder(validWO());
    expect(r.success).toBe(true);
    expect(r.workOrderId).toMatch(/^WO-\d+$/);
  });

  it("operationsCreated equals routing.length (2 ops)", () => {
    const r = ERPImportEngine.importWorkOrder(validWO({
      routing: [
        { operationNumber: 10, workCenter: "VMC-1", description: "rough", setupHours: 1, runHoursPerUnit: 0.5, setupComplete: false, quantityComplete: 0 },
        { operationNumber: 20, workCenter: "VMC-2", description: "finish", setupHours: 0.5, runHoursPerUnit: 0.25, setupComplete: false, quantityComplete: 0 },
      ],
    }));
    expect(r.operationsCreated).toBe(2);
  });

  it("rejects quantityOrdered=0 with success=false and errors length >= 1", () => {
    const r = ERPImportEngine.importWorkOrder(validWO({ quantityOrdered: 0 }));
    expect(r.success).toBe(false);
    expect(r.errors.length >= 1).toBe(true);
  });

  it("past dueDate yields warning 'past' but still success=true", () => {
    const r = ERPImportEngine.importWorkOrder(validWO({ dueDate: PAST_DATE }));
    expect(r.success).toBe(true);
    expect(r.warnings.some(w => w.toLowerCase().includes("past"))).toBe(true);
  });

  it("re-import of same erpSystem+workOrderNumber warns 'already imported'", () => {
    const wo = validWO({ workOrderNumber: "WO-DUPE-XYZ" });
    ERPImportEngine.importWorkOrder(wo);
    const second = ERPImportEngine.importWorkOrder(wo);
    expect(second.warnings.some(w => w.toLowerCase().includes("already"))).toBe(true);
  });
});

describe("ERPImportEngine — importBatch", () => {
  it("totalProcessed equals input array length (3)", () => {
    const r = ERPImportEngine.importBatch([validWO(), validWO(), validWO()]);
    expect(r.totalProcessed).toBe(3);
    expect(r.results.length).toBe(3);
  });

  it("mixed batch [valid, invalid] → successful=1, failed=1", () => {
    const r = ERPImportEngine.importBatch([validWO(), validWO({ quantityOrdered: 0 })]);
    expect(r.successful).toBe(1);
    expect(r.failed).toBe(1);
  });
});

describe("ERPImportEngine — round-trip + listing", () => {
  it("getImportedWorkOrder returns imported record by erpSystem+WO", () => {
    const wo = validWO({ workOrderNumber: "WO-LOOKUP-Q" });
    ERPImportEngine.importWorkOrder(wo);
    const found = ERPImportEngine.getImportedWorkOrder("jobboss", "WO-LOOKUP-Q");
    expect(found?.workOrderNumber).toBe("WO-LOOKUP-Q");
  });

  it("getImportedWorkOrder returns === undefined for unknown WO", () => {
    expect(ERPImportEngine.getImportedWorkOrder("sap", "WO-NEVER") === undefined).toBe(true);
  });

  it("listImportedWorkOrders filtered by sap only returns sap WOs", () => {
    ERPImportEngine.importWorkOrder(validWO({ erpSystem: "sap" }));
    const sapList = ERPImportEngine.listImportedWorkOrders("sap");
    expect(sapList.every(w => w.erpSystem === "sap")).toBe(true);
    expect(sapList.length >= 1).toBe(true);
  });
});

describe("ERPImportEngine — validateWorkOrder", () => {
  it("well-formed WO → valid=true, errors=[]", () => {
    const v = ERPImportEngine.validateWorkOrder(validWO());
    expect(v.valid).toBe(true);
    expect(v.errors.length).toBe(0);
  });

  it("malformed input (missing required fields) → valid=false with error list", () => {
    const v = ERPImportEngine.validateWorkOrder({ erpSystem: "jobboss" });
    expect(v.valid).toBe(false);
    expect(v.errors.length >= 1).toBe(true);
  });
});

describe("ERPImportEngine — field mappings", () => {
  it("SAP: workOrderNumber→AUFNR, partNumber→MATNR, customer→KUNNR", () => {
    const m = ERPImportEngine.getFieldMappings("sap");
    expect(m.workOrderNumber).toBe("AUFNR");
    expect(m.partNumber).toBe("MATNR");
    expect(m.customer).toBe("KUNNR");
  });

  it("Epicor: workOrderNumber→JobNum, partNumber→PartNum, customer→CustID", () => {
    const m = ERPImportEngine.getFieldMappings("epicor");
    expect(m.workOrderNumber).toBe("JobNum");
    expect(m.partNumber).toBe("PartNum");
    expect(m.customer).toBe("CustID");
  });

  it("custom system returns empty {} mappings", () => {
    const m = ERPImportEngine.getFieldMappings("custom");
    expect(Object.keys(m).length).toBe(0);
  });

  it("transformFromERP for SAP reverse-maps AUFNR→workOrderNumber + MATNR→partNumber", () => {
    const t = ERPImportEngine.transformFromERP({ AUFNR: "WO-123", MATNR: "PART-X" }, "sap");
    expect(t.workOrderNumber).toBe("WO-123");
    expect(t.partNumber).toBe("PART-X");
  });
});

describe("ERPImportEngine — getSelfAwareness", () => {
  it("exposes 7 capabilities + 7 supported systems (incl. sap + custom)", () => {
    const sa = ERPImportEngine.getSelfAwareness();
    expect(sa.capabilities.length).toBe(7);
    expect(sa.supportedSystems.length).toBe(7);
    expect(sa.supportedSystems.includes("sap")).toBe(true);
    expect(sa.supportedSystems.includes("custom")).toBe(true);
  });
});
