/**
 * ERPQualityEngine — Quality Data Integration with ERP
 * =====================================================
 *
 * Synchronizes quality metrics, inspection results, and NCR
 * data between shop floor and ERP systems.
 *
 * L2-P4-MS1/P0-U02 — Batch 3: ERP Bridge Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const InspectionResultSchema = z.object({
  id: z.string(),
  workOrderNumber: z.string(),
  operationNumber: z.number(),
  partNumber: z.string(),
  serialNumber: z.string().optional(),
  inspectorId: z.string(),
  inspectionType: z.enum(["first_article", "in_process", "final", "receiving"]),
  result: z.enum(["pass", "fail", "conditional"]),
  characteristics: z.array(z.object({
    name: z.string(),
    nominal: z.number(),
    tolerance: z.number(),
    actual: z.number(),
    unit: z.string(),
    pass: z.boolean(),
  })),
  notes: z.string().optional(),
  timestamp: z.string(),
  syncedToERP: z.boolean().default(false),
});

export const NCRSchema = z.object({
  id: z.string(),
  workOrderNumber: z.string(),
  partNumber: z.string(),
  quantity: z.number(),
  defectType: z.string(),
  defectDescription: z.string(),
  disposition: z.enum(["scrap", "rework", "use_as_is", "return_to_vendor", "pending"]),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  closedAt: z.string().optional(),
  closedBy: z.string().optional(),
  syncedToERP: z.boolean().default(false),
});

export const QualityMetricsSchema = z.object({
  workOrderNumber: z.string(),
  totalInspected: z.number(),
  totalPassed: z.number(),
  totalFailed: z.number(),
  firstPassYield: z.number(),
  scrapQuantity: z.number(),
  reworkQuantity: z.number(),
  openNCRs: z.number(),
  closedNCRs: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type InspectionResult = z.infer<typeof InspectionResultSchema>;
export type NCR = z.infer<typeof NCRSchema>;
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const inspectionResults: Map<string, InspectionResult[]> = new Map();
const ncrs: Map<string, NCR> = new Map();
let inspectionCounter = 1;
let ncrCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ERPQualityEngine {
  /**
   * Record an inspection result
   * @param result - Inspection result data
   * @returns Created inspection result
   */
  static recordInspection(result: Omit<InspectionResult, "id" | "timestamp" | "syncedToERP">): InspectionResult {
    const inspection: InspectionResult = {
      ...result,
      id: `INS-${++inspectionCounter}`,
      timestamp: new Date().toISOString(),
      syncedToERP: false,
    };

    const key = result.workOrderNumber;
    const results = inspectionResults.get(key) || [];
    results.push(inspection);
    inspectionResults.set(key, results);

    return inspection;
  }

  /**
   * Create a non-conformance report
   * @param ncr - NCR data
   * @returns Created NCR
   */
  static createNCR(ncr: Omit<NCR, "id" | "createdAt" | "syncedToERP">): NCR {
    const newNCR: NCR = {
      ...ncr,
      id: `NCR-${++ncrCounter}`,
      createdAt: new Date().toISOString(),
      syncedToERP: false,
    };

    ncrs.set(newNCR.id, newNCR);
    return newNCR;
  }

  /**
   * Close an NCR with disposition
   * @param ncrId - NCR ID
   * @param disposition - Final disposition
   * @param closedBy - Closer ID
   * @param correctiveAction - Corrective action taken
   * @returns Updated NCR
   */
  static closeNCR(
    ncrId: string,
    disposition: NCR["disposition"],
    closedBy: string,
    correctiveAction?: string
  ): NCR | undefined {
    const ncr = ncrs.get(ncrId);
    if (!ncr) return undefined;

    ncr.disposition = disposition;
    ncr.closedBy = closedBy;
    ncr.closedAt = new Date().toISOString();
    ncr.correctiveAction = correctiveAction;
    ncrs.set(ncrId, ncr);

    return ncr;
  }

  /**
   * Get quality metrics for a work order
   * @param workOrderNumber - Work order number
   * @returns Quality metrics
   */
  static getQualityMetrics(workOrderNumber: string): QualityMetrics {
    const inspections = inspectionResults.get(workOrderNumber) || [];
    const woNCRs = Array.from(ncrs.values()).filter(n => n.workOrderNumber === workOrderNumber);

    const totalInspected = inspections.length;
    const totalPassed = inspections.filter(i => i.result === "pass").length;
    const totalFailed = inspections.filter(i => i.result === "fail").length;

    const scrapQuantity = woNCRs
      .filter(n => n.disposition === "scrap")
      .reduce((sum, n) => sum + n.quantity, 0);

    const reworkQuantity = woNCRs
      .filter(n => n.disposition === "rework")
      .reduce((sum, n) => sum + n.quantity, 0);

    const openNCRs = woNCRs.filter(n => n.disposition === "pending").length;
    const closedNCRs = woNCRs.filter(n => n.disposition !== "pending").length;

    return {
      workOrderNumber,
      totalInspected,
      totalPassed,
      totalFailed,
      firstPassYield: totalInspected > 0 ? Math.round((totalPassed / totalInspected) * 10000) / 100 : 100,
      scrapQuantity,
      reworkQuantity,
      openNCRs,
      closedNCRs,
    };
  }

  /**
   * Sync quality data to ERP
   * @param workOrderNumber - Work order number
   * @returns Sync result
   */
  static syncToERP(workOrderNumber: string): { inspectionsSynced: number; ncrsSynced: number; success: boolean } {
    const inspections = inspectionResults.get(workOrderNumber) || [];
    const woNCRs = Array.from(ncrs.values()).filter(n => n.workOrderNumber === workOrderNumber);

    let inspectionsSynced = 0;
    let ncrsSynced = 0;

    for (const inspection of inspections) {
      if (!inspection.syncedToERP) {
        inspection.syncedToERP = true;
        inspectionsSynced++;
      }
    }

    for (const ncr of woNCRs) {
      if (!ncr.syncedToERP) {
        ncr.syncedToERP = true;
        ncrs.set(ncr.id, ncr);
        ncrsSynced++;
      }
    }

    inspectionResults.set(workOrderNumber, inspections);

    return {
      inspectionsSynced,
      ncrsSynced,
      success: true,
    };
  }

  /**
   * Get inspections by type
   * @param workOrderNumber - Work order number
   * @param type - Inspection type
   * @returns Filtered inspections
   */
  static getInspectionsByType(workOrderNumber: string, type: InspectionResult["inspectionType"]): InspectionResult[] {
    return (inspectionResults.get(workOrderNumber) || []).filter(i => i.inspectionType === type);
  }

  /**
   * Get open NCRs
   * @param workOrderNumber - Optional work order filter
   * @returns Open NCRs
   */
  static getOpenNCRs(workOrderNumber?: string): NCR[] {
    let all = Array.from(ncrs.values()).filter(n => n.disposition === "pending");
    if (workOrderNumber) {
      all = all.filter(n => n.workOrderNumber === workOrderNumber);
    }
    return all;
  }

  /**
   * Get inspection trend data
   * @param days - Number of days to analyze
   * @returns Trend data
   */
  static getInspectionTrend(days: number = 7): { date: string; passed: number; failed: number }[] {
    const trend: Map<string, { passed: number; failed: number }> = new Map();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const inspections of inspectionResults.values()) {
      for (const inspection of inspections) {
        const date = inspection.timestamp.split("T")[0];
        if (new Date(date) >= cutoff) {
          const day = trend.get(date) || { passed: 0, failed: 0 };
          if (inspection.result === "pass") day.passed++;
          else if (inspection.result === "fail") day.failed++;
          trend.set(date, day);
        }
      }
    }

    return Array.from(trend.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  static getSelfAwareness() {
    return {
      name: "ERPQualityEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["recordInspection", "createNCR", "closeNCR", "getQualityMetrics", "syncToERP", "getInspectionsByType", "getOpenNCRs", "getInspectionTrend"],
      inspectionTypes: ["first_article", "in_process", "final", "receiving"],
      dispositions: ["scrap", "rework", "use_as_is", "return_to_vendor", "pending"],
      dependencies: [],
    };
  }
}

export const erpQualityEngine = new ERPQualityEngine();
