// WIRE-EXEMPT: ERP bridge engine awaiting Tier-3 erp dispatcher (L2-P4-MS1/P0-U02 Batch 3). Cost-feedback sender to external ERP systems; consumer (ERP variance dashboard) not yet built; engine is intentionally unwired until its consumer ships.
/**
 * ERPCostFeedbackEngine — Actual Cost Feedback to ERP
 * ====================================================
 *
 * Sends actual production costs (labor, material, overhead)
 * back to ERP systems for variance analysis and job costing.
 *
 * L2-P4-MS1/P0-U02 — Batch 3: ERP Bridge Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CostCategorySchema = z.enum(["labor", "material", "overhead", "subcontract", "tooling", "scrap"]);

export const CostEntrySchema = z.object({
  id: z.string(),
  workOrderNumber: z.string(),
  operationNumber: z.number().optional(),
  category: CostCategorySchema,
  description: z.string(),
  quantity: z.number(),
  unitCost: z.number(),
  totalCost: z.number(),
  employeeId: z.string().optional(),
  machineId: z.string().optional(),
  timestamp: z.string(),
  posted: z.boolean().default(false),
  postedAt: z.string().optional(),
  erpReference: z.string().optional(),
});

export const CostSummarySchema = z.object({
  workOrderNumber: z.string(),
  estimatedCost: z.number(),
  actualCost: z.number(),
  variance: z.number(),
  variancePercent: z.number(),
  byCategory: z.record(z.string(), z.number()),
  entries: z.array(CostEntrySchema),
  lastUpdated: z.string(),
});

export const PostResultSchema = z.object({
  success: z.boolean(),
  entriesPosted: z.number(),
  totalAmount: z.number(),
  erpTransactionId: z.string().optional(),
  errors: z.array(z.string()),
  postedAt: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CostCategory = z.infer<typeof CostCategorySchema>;
export type CostEntry = z.infer<typeof CostEntrySchema>;
export type CostSummary = z.infer<typeof CostSummarySchema>;
export type PostResult = z.infer<typeof PostResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const costEntries: Map<string, CostEntry[]> = new Map();
const estimatedCosts: Map<string, number> = new Map([
  ["WO-001", 5000],
  ["WO-002", 8500],
  ["WO-003", 3200],
]);
let entryCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ERPCostFeedbackEngine {
  /**
   * Record a cost entry
   * @param workOrderNumber - Work order number
   * @param category - Cost category
   * @param description - Cost description
   * @param quantity - Quantity
   * @param unitCost - Cost per unit
   * @param metadata - Additional metadata
   * @returns Created cost entry
   */
  static recordCost(
    workOrderNumber: string,
    category: CostCategory,
    description: string,
    quantity: number,
    unitCost: number,
    metadata?: { employeeId?: string; machineId?: string; operationNumber?: number }
  ): CostEntry {
    const entry: CostEntry = {
      id: `COST-${++entryCounter}`,
      workOrderNumber,
      operationNumber: metadata?.operationNumber,
      category,
      description,
      quantity,
      unitCost,
      totalCost: Math.round(quantity * unitCost * 100) / 100,
      employeeId: metadata?.employeeId,
      machineId: metadata?.machineId,
      timestamp: new Date().toISOString(),
      posted: false,
    };

    const entries = costEntries.get(workOrderNumber) || [];
    entries.push(entry);
    costEntries.set(workOrderNumber, entries);

    return entry;
  }

  /**
   * Get cost summary for a work order
   * @param workOrderNumber - Work order number
   * @returns Cost summary with variance
   */
  static getCostSummary(workOrderNumber: string): CostSummary {
    const entries = costEntries.get(workOrderNumber) || [];
    const estimated = estimatedCosts.get(workOrderNumber) || 0;

    const byCategory: Record<string, number> = {};
    let totalActual = 0;

    for (const entry of entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + entry.totalCost;
      totalActual += entry.totalCost;
    }

    const variance = totalActual - estimated;
    const variancePercent = estimated > 0 ? Math.round((variance / estimated) * 10000) / 100 : 0;

    return {
      workOrderNumber,
      estimatedCost: estimated,
      actualCost: Math.round(totalActual * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercent,
      byCategory,
      entries,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Post costs to ERP system
   * @param workOrderNumber - Work order number
   * @param erpSystem - Target ERP system
   * @returns Post result
   */
  static postToERP(workOrderNumber: string, erpSystem: string): PostResult {
    const entries = costEntries.get(workOrderNumber) || [];
    const unposted = entries.filter(e => !e.posted);

    if (unposted.length === 0) {
      return {
        success: true,
        entriesPosted: 0,
        totalAmount: 0,
        errors: [],
        postedAt: new Date().toISOString(),
      };
    }

    const errors: string[] = [];
    let totalAmount = 0;

    // Simulate posting to ERP
    const now = new Date().toISOString();
    const erpTransactionId = `ERP-${Date.now()}`;

    for (const entry of unposted) {
      // Validate entry before posting
      if (entry.totalCost < 0) {
        errors.push(`Entry ${entry.id}: Negative cost not allowed`);
        continue;
      }

      entry.posted = true;
      entry.postedAt = now;
      entry.erpReference = erpTransactionId;
      totalAmount += entry.totalCost;
    }

    costEntries.set(workOrderNumber, entries);

    return {
      success: errors.length === 0,
      entriesPosted: unposted.length - errors.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      erpTransactionId: errors.length === 0 ? erpTransactionId : undefined,
      errors,
      postedAt: now,
    };
  }

  /**
   * Get unposted cost entries
   * @param workOrderNumber - Optional work order filter
   * @returns Unposted entries
   */
  static getUnpostedEntries(workOrderNumber?: string): CostEntry[] {
    if (workOrderNumber) {
      return (costEntries.get(workOrderNumber) || []).filter(e => !e.posted);
    }

    const all: CostEntry[] = [];
    for (const entries of costEntries.values()) {
      all.push(...entries.filter(e => !e.posted));
    }
    return all;
  }

  /**
   * Set estimated cost for a work order
   * @param workOrderNumber - Work order number
   * @param amount - Estimated cost
   */
  static setEstimatedCost(workOrderNumber: string, amount: number): void {
    estimatedCosts.set(workOrderNumber, amount);
  }

  /**
   * Get variance analysis across work orders
   * @returns Variance analysis summary
   */
  static getVarianceAnalysis(): {
    workOrders: { number: string; variance: number; variancePercent: number }[];
    totalEstimated: number;
    totalActual: number;
    overallVariance: number;
  } {
    const workOrders: { number: string; variance: number; variancePercent: number }[] = [];
    let totalEstimated = 0;
    let totalActual = 0;

    for (const [woNumber] of costEntries) {
      const summary = this.getCostSummary(woNumber);
      workOrders.push({
        number: woNumber,
        variance: summary.variance,
        variancePercent: summary.variancePercent,
      });
      totalEstimated += summary.estimatedCost;
      totalActual += summary.actualCost;
    }

    return {
      workOrders: workOrders.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
      totalEstimated,
      totalActual,
      overallVariance: totalActual - totalEstimated,
    };
  }

  /**
   * Format cost data for ERP export
   * @param workOrderNumber - Work order number
   * @param format - Export format
   * @returns Formatted data
   */
  static formatForExport(workOrderNumber: string, format: "csv" | "json" | "xml"): string {
    const entries = costEntries.get(workOrderNumber) || [];

    switch (format) {
      case "csv": {
        const headers = "ID,Category,Description,Quantity,UnitCost,TotalCost,Timestamp\n";
        const rows = entries.map(e =>
          `${e.id},${e.category},"${e.description}",${e.quantity},${e.unitCost},${e.totalCost},${e.timestamp}`
        ).join("\n");
        return headers + rows;
      }
      case "json":
        return JSON.stringify(entries, null, 2);
      case "xml": {
        const items = entries.map(e => `
    <CostEntry>
      <ID>${e.id}</ID>
      <Category>${e.category}</Category>
      <Description>${e.description}</Description>
      <TotalCost>${e.totalCost}</TotalCost>
    </CostEntry>`).join("");
        return `<?xml version="1.0"?>\n<CostEntries>${items}\n</CostEntries>`;
      }
    }
  }

  static getSelfAwareness() {
    return {
      name: "ERPCostFeedbackEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["recordCost", "getCostSummary", "postToERP", "getUnpostedEntries", "setEstimatedCost", "getVarianceAnalysis", "formatForExport"],
      costCategories: ["labor", "material", "overhead", "subcontract", "tooling", "scrap"],
      dependencies: [],
    };
  }
}

export const erpCostFeedbackEngine = new ERPCostFeedbackEngine();
