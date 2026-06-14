/**
 * ERPToolInventoryEngine.test.ts — hotel slot (iter11 / U-ERP-TOOLINV-WIRE).
 * Tests tool inventory issue/return/receive transactions, search, and seed data.
 */

import { describe, it, expect } from "vitest";
import { ERPToolInventoryEngine } from "../engines/ERPToolInventoryEngine.js";

describe("ERPToolInventoryEngine — seed data + getTool", () => {
  it("getTool('EM-0500-4FL') returns seeded 1/2 end-mill with quantityOnHand=8", () => {
    const t = ERPToolInventoryEngine.getTool("EM-0500-4FL");
    expect(t?.toolId).toBe("EM-0500-4FL");
    expect(t?.category).toBe("end_mill");
    expect(t?.quantityOnHand).toBe(8);
  });

  it("getTool('NEVER') returns undefined", () => {
    expect(ERPToolInventoryEngine.getTool("NEVER") === undefined).toBe(true);
  });

  it("getTool('INS-CNMG') returns Sandvik insert with quantityOnHand=50", () => {
    const t = ERPToolInventoryEngine.getTool("INS-CNMG");
    expect(t?.manufacturer).toBe("Sandvik");
    expect(t?.quantityOnHand).toBe(50);
  });
});

describe("ERPToolInventoryEngine — searchTools", () => {
  it("searchTools('carbide') finds the carbide drill", () => {
    const results = ERPToolInventoryEngine.searchTools("carbide");
    expect(results.some(t => t.toolId === "DR-0312")).toBe(true);
  });

  it("searchTools('', 'insert') filters by category=insert", () => {
    const results = ERPToolInventoryEngine.searchTools("", "insert");
    expect(results.every(t => t.category === "insert")).toBe(true);
  });

  it("searchTools matches by partNumber (case-insensitive)", () => {
    const results = ERPToolInventoryEngine.searchTools("cnmg120408");
    expect(results.some(t => t.toolId === "INS-CNMG")).toBe(true);
  });
});

describe("ERPToolInventoryEngine — issueTool", () => {
  it("issueTool decrements quantityAvailable + increments quantityAllocated", () => {
    const before = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    const avail0 = before.quantityAvailable;
    const alloc0 = before.quantityAllocated;
    const t = ERPToolInventoryEngine.issueTool("INS-CNMG", 5, "WO-ISSUE-1", "EMP-1");
    expect(t?.type).toBe("issue");
    expect(t?.quantity).toBe(5);
    const after = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    expect(after.quantityAvailable).toBe(avail0 - 5);
    expect(after.quantityAllocated).toBe(alloc0 + 5);
  });

  it("issueTool returns undefined when quantity > available", () => {
    const r = ERPToolInventoryEngine.issueTool("INS-CNMG", 9999, "WO", "EMP");
    expect(r === undefined).toBe(true);
  });

  it("issueTool on unknown tool returns undefined", () => {
    expect(ERPToolInventoryEngine.issueTool("NEVER", 1, "WO", "EMP") === undefined).toBe(true);
  });

  it("issueTool transaction id matches TXN-#### pattern", () => {
    const t = ERPToolInventoryEngine.issueTool("INS-CNMG", 1, "WO-ID", "EMP-2");
    expect(t?.id).toMatch(/^TXN-\d+$/);
  });
});

describe("ERPToolInventoryEngine — returnTool", () => {
  it("returnTool 'good' returns to available; quantityOnHand unchanged", () => {
    ERPToolInventoryEngine.issueTool("INS-CNMG", 3, "WO-RTN-1", "EMP");
    const before = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    const onHand0 = before.quantityOnHand;
    const t = ERPToolInventoryEngine.returnTool("INS-CNMG", 2, "EMP", "good");
    expect(t?.type).toBe("return");
    const after = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    expect(after.quantityOnHand).toBe(onHand0);
  });

  it("returnTool 'scrap' decrements quantityOnHand AND transaction.quantity is negative", () => {
    ERPToolInventoryEngine.issueTool("INS-CNMG", 2, "WO-SCRAP", "EMP");
    const before = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    const onHand0 = before.quantityOnHand;
    const t = ERPToolInventoryEngine.returnTool("INS-CNMG", 1, "EMP", "scrap");
    expect(t?.type).toBe("scrap");
    expect(t?.quantity).toBe(-1);
    expect(ERPToolInventoryEngine.getTool("INS-CNMG")!.quantityOnHand).toBe(onHand0 - 1);
  });

  it("returnTool on unknown tool returns undefined", () => {
    expect(ERPToolInventoryEngine.returnTool("NEVER", 1, "EMP", "good") === undefined).toBe(true);
  });
});

describe("ERPToolInventoryEngine — receiveTool", () => {
  it("receiveTool increments both quantityOnHand AND quantityAvailable", () => {
    const before = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    const onHand0 = before.quantityOnHand;
    const avail0 = before.quantityAvailable;
    const t = ERPToolInventoryEngine.receiveTool("INS-CNMG", 10, "EMP-RCV", "PO-1234");
    expect(t?.type).toBe("receive");
    expect(t?.quantity).toBe(10);
    const after = ERPToolInventoryEngine.getTool("INS-CNMG")!;
    expect(after.quantityOnHand).toBe(onHand0 + 10);
    expect(after.quantityAvailable).toBe(avail0 + 10);
  });

  it("receiveTool with poNumber populates transaction.notes", () => {
    const t = ERPToolInventoryEngine.receiveTool("INS-CNMG", 1, "EMP", "PO-9999");
    expect(t?.notes).toBe("PO: PO-9999");
  });

  it("receiveTool on unknown tool returns undefined", () => {
    expect(ERPToolInventoryEngine.receiveTool("NEVER", 1, "EMP") === undefined).toBe(true);
  });
});
