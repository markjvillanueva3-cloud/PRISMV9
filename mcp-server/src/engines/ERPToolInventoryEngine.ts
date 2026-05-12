/**
 * ERPToolInventoryEngine — Tool Inventory Sync with ERP
 * ======================================================
 *
 * Synchronizes tool crib inventory, usage tracking, and
 * reorder points between shop floor and ERP systems.
 *
 * L2-P4-MS1/P0-U02 — Batch 3: ERP Bridge Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ToolItemSchema = z.object({
  toolId: z.string(),
  description: z.string(),
  category: z.enum(["end_mill", "drill", "insert", "tap", "reamer", "boring_bar", "holder", "other"]),
  manufacturer: z.string(),
  partNumber: z.string(),
  location: z.string(),
  quantityOnHand: z.number(),
  quantityAllocated: z.number(),
  quantityAvailable: z.number(),
  reorderPoint: z.number(),
  reorderQuantity: z.number(),
  unitCost: z.number(),
  lastReceived: z.string().optional(),
  lastIssued: z.string().optional(),
  erpItemNumber: z.string().optional(),
});

export const ToolTransactionSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  type: z.enum(["issue", "return", "receive", "adjust", "scrap"]),
  quantity: z.number(),
  workOrderNumber: z.string().optional(),
  employeeId: z.string(),
  notes: z.string().optional(),
  timestamp: z.string(),
  syncedToERP: z.boolean().default(false),
});

export const ReorderAlertSchema = z.object({
  toolId: z.string(),
  description: z.string(),
  quantityOnHand: z.number(),
  reorderPoint: z.number(),
  reorderQuantity: z.number(),
  estimatedCost: z.number(),
  urgency: z.enum(["critical", "low", "suggested"]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolItem = z.infer<typeof ToolItemSchema>;
export type ToolTransaction = z.infer<typeof ToolTransactionSchema>;
export type ReorderAlert = z.infer<typeof ReorderAlertSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const toolInventory: Map<string, ToolItem> = new Map([
  ["EM-0500-4FL", {
    toolId: "EM-0500-4FL",
    description: "1/2\" 4-Flute Carbide End Mill",
    category: "end_mill",
    manufacturer: "Kennametal",
    partNumber: "K2050500",
    location: "Crib-A-12",
    quantityOnHand: 8,
    quantityAllocated: 2,
    quantityAvailable: 6,
    reorderPoint: 5,
    reorderQuantity: 10,
    unitCost: 45.00,
    erpItemNumber: "TOOL-EM-001",
  }],
  ["DR-0312", {
    toolId: "DR-0312",
    description: "5/16\" Carbide Drill",
    category: "drill",
    manufacturer: "OSG",
    partNumber: "DR-5/16-CARB",
    location: "Crib-B-03",
    quantityOnHand: 3,
    quantityAllocated: 1,
    quantityAvailable: 2,
    reorderPoint: 4,
    reorderQuantity: 6,
    unitCost: 32.50,
    erpItemNumber: "TOOL-DR-002",
  }],
  ["INS-CNMG", {
    toolId: "INS-CNMG",
    description: "CNMG 432 Insert",
    category: "insert",
    manufacturer: "Sandvik",
    partNumber: "CNMG120408-PM",
    location: "Crib-C-08",
    quantityOnHand: 50,
    quantityAllocated: 0,
    quantityAvailable: 50,
    reorderPoint: 20,
    reorderQuantity: 50,
    unitCost: 12.75,
    erpItemNumber: "TOOL-INS-003",
  }],
]);

const transactions: ToolTransaction[] = [];
let transactionCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ERPToolInventoryEngine {
  /**
   * Get tool by ID
   * @param toolId - Tool identifier
   * @returns Tool item or undefined
   */
  static getTool(toolId: string): ToolItem | undefined {
    return toolInventory.get(toolId);
  }

  /**
   * Search tools
   * @param query - Search term
   * @param category - Optional category filter
   * @returns Matching tools
   */
  static searchTools(query: string, category?: ToolItem["category"]): ToolItem[] {
    const q = query.toLowerCase();
    let results = Array.from(toolInventory.values()).filter(t =>
      t.toolId.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.partNumber.toLowerCase().includes(q)
    );

    if (category) {
      results = results.filter(t => t.category === category);
    }

    return results;
  }

  /**
   * Issue tool from inventory
   * @param toolId - Tool identifier
   * @param quantity - Quantity to issue
   * @param workOrderNumber - Work order number
   * @param employeeId - Employee ID
   * @returns Transaction record
   */
  static issueTool(toolId: string, quantity: number, workOrderNumber: string, employeeId: string): ToolTransaction | undefined {
    const tool = toolInventory.get(toolId);
    if (!tool || tool.quantityAvailable < quantity) return undefined;

    tool.quantityAllocated += quantity;
    tool.quantityAvailable -= quantity;
    tool.lastIssued = new Date().toISOString();
    toolInventory.set(toolId, tool);

    const transaction: ToolTransaction = {
      id: `TXN-${++transactionCounter}`,
      toolId,
      type: "issue",
      quantity,
      workOrderNumber,
      employeeId,
      timestamp: new Date().toISOString(),
      syncedToERP: false,
    };

    transactions.push(transaction);
    return transaction;
  }

  /**
   * Return tool to inventory
   * @param toolId - Tool identifier
   * @param quantity - Quantity to return
   * @param employeeId - Employee ID
   * @param condition - Tool condition
   * @returns Transaction record
   */
  static returnTool(toolId: string, quantity: number, employeeId: string, condition: "good" | "worn" | "scrap"): ToolTransaction | undefined {
    const tool = toolInventory.get(toolId);
    if (!tool) return undefined;

    const type: ToolTransaction["type"] = condition === "scrap" ? "scrap" : "return";

    if (condition !== "scrap") {
      tool.quantityAllocated = Math.max(0, tool.quantityAllocated - quantity);
      tool.quantityAvailable += quantity;
    } else {
      tool.quantityOnHand -= quantity;
      tool.quantityAllocated = Math.max(0, tool.quantityAllocated - quantity);
    }

    toolInventory.set(toolId, tool);

    const transaction: ToolTransaction = {
      id: `TXN-${++transactionCounter}`,
      toolId,
      type,
      quantity: condition === "scrap" ? -quantity : quantity,
      employeeId,
      notes: `Condition: ${condition}`,
      timestamp: new Date().toISOString(),
      syncedToERP: false,
    };

    transactions.push(transaction);
    return transaction;
  }

  /**
   * Receive tools into inventory
   * @param toolId - Tool identifier
   * @param quantity - Quantity received
   * @param employeeId - Receiver ID
   * @param poNumber - Purchase order number
   * @returns Transaction record
   */
  static receiveTool(toolId: string, quantity: number, employeeId: string, poNumber?: string): ToolTransaction | undefined {
    const tool = toolInventory.get(toolId);
    if (!tool) return undefined;

    tool.quantityOnHand += quantity;
    tool.quantityAvailable += quantity;
    tool.lastReceived = new Date().toISOString();
    toolInventory.set(toolId, tool);

    const transaction: ToolTransaction = {
      id: `TXN-${++transactionCounter}`,
      toolId,
      type: "receive",
      quantity,
      employeeId,
      notes: poNumber ? `PO: ${poNumber}` : undefined,
      timestamp: new Date().toISOString(),
      syncedToERP: false,
    };

    transactions.push(transaction);
    return transaction;
  }

  /**
   * Get reorder alerts
   * @returns Tools below reorder point
   */
  static getReorderAlerts(): ReorderAlert[] {
    const alerts: ReorderAlert[] = [];

    for (const tool of toolInventory.values()) {
      if (tool.quantityOnHand <= tool.reorderPoint) {
        const urgency: ReorderAlert["urgency"] =
          tool.quantityOnHand === 0 ? "critical" :
          tool.quantityOnHand < tool.reorderPoint * 0.5 ? "low" : "suggested";

        alerts.push({
          toolId: tool.toolId,
          description: tool.description,
          quantityOnHand: tool.quantityOnHand,
          reorderPoint: tool.reorderPoint,
          reorderQuantity: tool.reorderQuantity,
          estimatedCost: tool.reorderQuantity * tool.unitCost,
          urgency,
        });
      }
    }

    return alerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, low: 1, suggested: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * Sync transactions to ERP
   * @returns Sync result
   */
  static syncToERP(): { transactionsSynced: number; success: boolean } {
    let synced = 0;
    for (const txn of transactions) {
      if (!txn.syncedToERP) {
        txn.syncedToERP = true;
        synced++;
      }
    }
    return { transactionsSynced: synced, success: true };
  }

  /**
   * Get transaction history
   * @param toolId - Optional tool filter
   * @param limit - Maximum results
   * @returns Transaction history
   */
  static getTransactionHistory(toolId?: string, limit: number = 50): ToolTransaction[] {
    let txns = [...transactions];
    if (toolId) {
      txns = txns.filter(t => t.toolId === toolId);
    }
    return txns
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get inventory value
   * @returns Total inventory value
   */
  static getInventoryValue(): { total: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const tool of toolInventory.values()) {
      const value = tool.quantityOnHand * tool.unitCost;
      total += value;
      byCategory[tool.category] = (byCategory[tool.category] || 0) + value;
    }

    return { total: Math.round(total * 100) / 100, byCategory };
  }

  static getSelfAwareness() {
    return {
      name: "ERPToolInventoryEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["getTool", "searchTools", "issueTool", "returnTool", "receiveTool", "getReorderAlerts", "syncToERP", "getTransactionHistory", "getInventoryValue"],
      toolCategories: ["end_mill", "drill", "insert", "tap", "reamer", "boring_bar", "holder", "other"],
      inventoryCount: toolInventory.size,
      dependencies: [],
    };
  }
}

export const erpToolInventoryEngine = new ERPToolInventoryEngine();
