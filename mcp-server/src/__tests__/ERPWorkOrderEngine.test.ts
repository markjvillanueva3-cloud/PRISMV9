/**
 * ERPWorkOrderEngine.test.ts — hotel slot (iter10 / U-ERP-WORKORDER-WIRE).
 * Tests work-order sync, operation status, bidirectional ERP flow, progress summary.
 */

import { describe, it, expect } from "vitest";
import { ERPWorkOrderEngine } from "../engines/ERPWorkOrderEngine.js";

describe("ERPWorkOrderEngine — seed data", () => {
  it("getWorkOrderSync('WO-001') returns seeded jobboss record at 64% complete", () => {
    const s = ERPWorkOrderEngine.getWorkOrderSync("WO-001");
    expect(s?.workOrderNumber).toBe("WO-001");
    expect(s?.erpSystem).toBe("jobboss");
    expect(s?.percentComplete).toBe(64);
    expect(s?.quantityOrdered).toBe(50);
  });

  it("getWorkOrderSync('WO-NEVER') returns undefined", () => {
    expect(ERPWorkOrderEngine.getWorkOrderSync("WO-NEVER") === undefined).toBe(true);
  });

  it("getOperationStatuses('WO-001') returns 3 operations (10/20/30)", () => {
    const ops = ERPWorkOrderEngine.getOperationStatuses("WO-001");
    expect(ops.length).toBe(3);
    expect(ops.map(o => o.operationNumber)).toEqual([10, 20, 30]);
  });
});

describe("ERPWorkOrderEngine — updateFromShopFloor", () => {
  it("updates status + records pendingChanges entry with old/new", () => {
    ERPWorkOrderEngine.syncFromERP("WO-UPD-1", { erpSystem: "jobboss", status: "planned", quantityOrdered: 10 });
    const updated = ERPWorkOrderEngine.updateFromShopFloor("WO-UPD-1", { status: "in_progress" });
    expect(updated?.status).toBe("in_progress");
    const change = updated?.pendingChanges.find(c => c.field === "status");
    expect(change?.oldValue).toBe("planned");
    expect(change?.newValue).toBe("in_progress");
  });

  it("returns undefined for unknown work order", () => {
    const r = ERPWorkOrderEngine.updateFromShopFloor("WO-NEVER", { status: "complete" });
    expect(r === undefined).toBe(true);
  });

  it("does NOT push pendingChange when new value equals current value", () => {
    ERPWorkOrderEngine.syncFromERP("WO-UPD-2", { erpSystem: "jobboss", status: "planned", quantityOrdered: 5 });
    ERPWorkOrderEngine.syncToERP("WO-UPD-2");          // clears any pending
    const r = ERPWorkOrderEngine.updateFromShopFloor("WO-UPD-2", { status: "planned" });
    expect(r?.pendingChanges.length).toBe(0);
  });
});

describe("ERPWorkOrderEngine — operation status", () => {
  it("updateOperationStatus changes setupComplete + returns updated op", () => {
    const r = ERPWorkOrderEngine.updateOperationStatus("WO-001", 30, { setupComplete: true });
    expect(r?.operationNumber).toBe(30);
    expect(r?.setupComplete).toBe(true);
  });

  it("updateOperationStatus on unknown operation returns undefined", () => {
    const r = ERPWorkOrderEngine.updateOperationStatus("WO-001", 999, { setupComplete: true });
    expect(r === undefined).toBe(true);
  });
});

describe("ERPWorkOrderEngine — syncToERP / syncFromERP", () => {
  it("syncToERP clears pendingChanges and returns count applied", () => {
    ERPWorkOrderEngine.syncFromERP("WO-SYN-1", { erpSystem: "jobboss", status: "planned", quantityOrdered: 20 });
    ERPWorkOrderEngine.updateFromShopFloor("WO-SYN-1", { status: "in_progress", quantityComplete: 5 });
    const result = ERPWorkOrderEngine.syncToERP("WO-SYN-1");
    expect(result.success).toBe(true);
    expect(result.changesApplied).toBeGreaterThanOrEqual(2);
    const after = ERPWorkOrderEngine.getWorkOrderSync("WO-SYN-1");
    expect(after?.pendingChanges.length).toBe(0);
  });

  it("syncToERP on unknown WO returns success=false with error", () => {
    const r = ERPWorkOrderEngine.syncToERP("WO-NONE");
    expect(r.success).toBe(false);
    expect(r.errors.length >= 1).toBe(true);
  });

  it("syncFromERP creates new sync record + computes percentComplete", () => {
    const r = ERPWorkOrderEngine.syncFromERP("WO-NEW-1", {
      erpSystem: "sap", status: "in_progress", quantityOrdered: 100, quantityComplete: 25,
    });
    expect(r.success).toBe(true);
    const stored = ERPWorkOrderEngine.getWorkOrderSync("WO-NEW-1");
    expect(stored?.percentComplete).toBe(25);
  });

  it("syncFromERP on existing record merges fields + recomputes percentComplete", () => {
    ERPWorkOrderEngine.syncFromERP("WO-NEW-2", { erpSystem: "sap", status: "planned", quantityOrdered: 10, quantityComplete: 0 });
    ERPWorkOrderEngine.syncFromERP("WO-NEW-2", { quantityComplete: 8 });
    expect(ERPWorkOrderEngine.getWorkOrderSync("WO-NEW-2")?.percentComplete).toBe(80);
  });
});

describe("ERPWorkOrderEngine — getPendingSyncs / getProgressSummary", () => {
  it("getPendingSyncs returns only records with pendingChanges.length > 0", () => {
    ERPWorkOrderEngine.syncFromERP("WO-PEN-1", { erpSystem: "jobboss", status: "planned", quantityOrdered: 1 });
    ERPWorkOrderEngine.syncToERP("WO-PEN-1");            // clear
    ERPWorkOrderEngine.updateFromShopFloor("WO-PEN-1", { status: "in_progress" });
    const pending = ERPWorkOrderEngine.getPendingSyncs();
    expect(pending.some(p => p.workOrderNumber === "WO-PEN-1")).toBe(true);
  });

  it("getProgressSummary returns byStatus counts + averageCompletion", () => {
    const s = ERPWorkOrderEngine.getProgressSummary();
    expect(s.total >= 1).toBe(true);
    expect(Object.keys(s.byStatus).length >= 1).toBe(true);
    expect(s.averageCompletion >= 0 && s.averageCompletion <= 100).toBe(true);
  });
});

describe("ERPWorkOrderEngine — getSelfAwareness", () => {
  it("exposes 8 capabilities + 7 statuses (planned..cancelled)", () => {
    const sa = ERPWorkOrderEngine.getSelfAwareness();
    expect(sa.capabilities.length).toBe(8);
    expect(sa.statuses.length).toBe(7);
    expect(sa.statuses.includes("planned")).toBe(true);
    expect(sa.statuses.includes("cancelled")).toBe(true);
  });
});
