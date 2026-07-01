/**
 * ERPQualityEngine.test.ts — hotel slot (iter8 / U-ERP-QUALITY-WIRE).
 * Tests inspection recording, NCR lifecycle, quality metrics, and ERP sync flags.
 */

import { describe, it, expect } from "vitest";
import { ERPQualityEngine } from "../engines/ERPQualityEngine.js";

function uniqueWO(): string {
  return `WO-${Math.random().toString(36).slice(2, 10)}`;
}

describe("ERPQualityEngine — recordInspection", () => {
  it("recordInspection returns id with INS- prefix and timestamp ISO", () => {
    const i = ERPQualityEngine.recordInspection({
      workOrderNumber: uniqueWO(),
      operationNumber: 10,
      partNumber: "P-A1",
      inspectorId: "INSP-1",
      inspectionType: "first_article",
      result: "pass",
      characteristics: [],
    });
    expect(i.id).toMatch(/^INS-\d+$/);
    expect(i.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(i.syncedToERP).toBe(false);
  });

  it("recordInspection round-trips workOrderNumber, partNumber, result", () => {
    const wo = uniqueWO();
    const i = ERPQualityEngine.recordInspection({
      workOrderNumber: wo,
      operationNumber: 20,
      partNumber: "P-B2",
      inspectorId: "INSP-2",
      inspectionType: "final",
      result: "fail",
      characteristics: [],
    });
    expect(i.workOrderNumber).toBe(wo);
    expect(i.partNumber).toBe("P-B2");
    expect(i.result).toBe("fail");
  });
});

describe("ERPQualityEngine — NCR lifecycle", () => {
  it("createNCR returns id with NCR- prefix and disposition=pending", () => {
    const n = ERPQualityEngine.createNCR({
      workOrderNumber: uniqueWO(),
      partNumber: "P-C3",
      quantity: 5,
      defectType: "dimensional",
      defectDescription: "oversize bore",
      disposition: "pending",
      createdBy: "OP-1",
    });
    expect(n.id).toMatch(/^NCR-\d+$/);
    expect(n.disposition).toBe("pending");
    expect(n.syncedToERP).toBe(false);
  });

  it("closeNCR flips disposition + sets closedBy + closedAt", () => {
    const n = ERPQualityEngine.createNCR({
      workOrderNumber: uniqueWO(),
      partNumber: "P-D4",
      quantity: 2,
      defectType: "surface",
      defectDescription: "scratch",
      disposition: "pending",
      createdBy: "OP-2",
    });
    const closed = ERPQualityEngine.closeNCR(n.id, "rework", "QA-LEAD", "polish to spec");
    expect(closed?.disposition).toBe("rework");
    expect(closed?.closedBy).toBe("QA-LEAD");
    expect(closed?.correctiveAction).toBe("polish to spec");
    expect(closed?.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("closeNCR on unknown id returns undefined (no throw)", () => {
    const result = ERPQualityEngine.closeNCR("NCR-NEVER", "scrap", "QA");
    expect(result).toBeUndefined();
  });
});

describe("ERPQualityEngine — getQualityMetrics aggregation", () => {
  it("getQualityMetrics on empty work order returns zeros with 100% FPY default", () => {
    const m = ERPQualityEngine.getQualityMetrics("WO-EMPTY-" + Math.random().toString(36).slice(2, 8));
    expect(m.totalInspected).toBe(0);
    expect(m.firstPassYield).toBe(100);
    expect(m.openNCRs).toBe(0);
  });

  it("firstPassYield = (totalPassed / totalInspected) × 100 when inspections exist", () => {
    const wo = uniqueWO();
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 10, partNumber: "P", inspectorId: "X",
      inspectionType: "in_process", result: "pass", characteristics: [],
    });
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 10, partNumber: "P", inspectorId: "X",
      inspectionType: "in_process", result: "pass", characteristics: [],
    });
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 10, partNumber: "P", inspectorId: "X",
      inspectionType: "in_process", result: "fail", characteristics: [],
    });
    const m = ERPQualityEngine.getQualityMetrics(wo);
    expect(m.totalInspected).toBe(3);
    expect(m.totalPassed).toBe(2);
    expect(m.totalFailed).toBe(1);
    expect(m.firstPassYield).toBeCloseTo(66.67, 1);
  });

  it("scrapQuantity sums NCR.quantity for disposition=scrap only", () => {
    const wo = uniqueWO();
    const n1 = ERPQualityEngine.createNCR({
      workOrderNumber: wo, partNumber: "P", quantity: 3,
      defectType: "burn", defectDescription: "edm overburn", disposition: "pending", createdBy: "OP",
    });
    ERPQualityEngine.closeNCR(n1.id, "scrap", "QA");
    const n2 = ERPQualityEngine.createNCR({
      workOrderNumber: wo, partNumber: "P", quantity: 7,
      defectType: "surface", defectDescription: "buff", disposition: "pending", createdBy: "OP",
    });
    ERPQualityEngine.closeNCR(n2.id, "scrap", "QA");
    const m = ERPQualityEngine.getQualityMetrics(wo);
    expect(m.scrapQuantity).toBe(10);
  });
});

describe("ERPQualityEngine — syncToERP + filters", () => {
  it("syncToERP marks all unsynced inspections + NCRs as syncedToERP=true", () => {
    const wo = uniqueWO();
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 10, partNumber: "P", inspectorId: "X",
      inspectionType: "final", result: "pass", characteristics: [],
    });
    ERPQualityEngine.createNCR({
      workOrderNumber: wo, partNumber: "P", quantity: 1,
      defectType: "x", defectDescription: "y", disposition: "pending", createdBy: "OP",
    });
    const result = ERPQualityEngine.syncToERP(wo);
    expect(result.inspectionsSynced).toBe(1);
    expect(result.ncrsSynced).toBe(1);
    expect(result.success).toBe(true);
  });

  it("syncToERP returns 0/0 on second call (idempotent — nothing new to sync)", () => {
    const wo = uniqueWO();
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 10, partNumber: "P", inspectorId: "X",
      inspectionType: "final", result: "pass", characteristics: [],
    });
    ERPQualityEngine.syncToERP(wo);
    const second = ERPQualityEngine.syncToERP(wo);
    expect(second.inspectionsSynced).toBe(0);
    expect(second.ncrsSynced).toBe(0);
  });

  it("getInspectionsByType filters correctly", () => {
    const wo = uniqueWO();
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 10, partNumber: "P", inspectorId: "X",
      inspectionType: "first_article", result: "pass", characteristics: [],
    });
    ERPQualityEngine.recordInspection({
      workOrderNumber: wo, operationNumber: 20, partNumber: "P", inspectorId: "X",
      inspectionType: "final", result: "pass", characteristics: [],
    });
    expect(ERPQualityEngine.getInspectionsByType(wo, "first_article").length).toBe(1);
    expect(ERPQualityEngine.getInspectionsByType(wo, "final").length).toBe(1);
    expect(ERPQualityEngine.getInspectionsByType(wo, "in_process").length).toBe(0);
  });

  it("getOpenNCRs filtered by work order returns only that WO's pending NCRs", () => {
    const wo = uniqueWO();
    ERPQualityEngine.createNCR({
      workOrderNumber: wo, partNumber: "P", quantity: 1,
      defectType: "x", defectDescription: "y", disposition: "pending", createdBy: "OP",
    });
    const open = ERPQualityEngine.getOpenNCRs(wo);
    expect(open.length).toBe(1);
    expect(open[0].workOrderNumber).toBe(wo);
  });
});

describe("ERPQualityEngine — getSelfAwareness", () => {
  it("getSelfAwareness exposes 8 capabilities + 4 inspectionTypes + 5 dispositions", () => {
    const sa = ERPQualityEngine.getSelfAwareness();
    expect(sa.name).toBe("ERPQualityEngine");
    expect(sa.capabilities.length).toBe(8);
    expect(sa.inspectionTypes.length).toBe(4);
    expect(sa.dispositions.length).toBe(5);
  });
});
