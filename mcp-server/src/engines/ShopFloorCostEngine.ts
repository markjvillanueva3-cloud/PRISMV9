/**
 * ShopFloorCostEngine — Real-time Job Costing & Labor Tracking
 * =============================================================
 *
 * Tracks actual costs against estimates, labor hours, material usage,
 * and calculates variances for shop floor operations.
 *
 * L2-P4-MS1/P0-U01 — Batch 1: Shop Floor Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const LaborEntrySchema = z.object({
  id: z.string(),
  jobId: z.string(),
  operationId: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  department: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  hoursWorked: z.number(),
  hourlyRate: z.number(),
  laborCost: z.number(),
  isSetup: z.boolean().default(false),
});

export const MaterialUsageSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  materialCode: z.string(),
  description: z.string(),
  quantityUsed: z.number(),
  unitCost: z.number(),
  totalCost: z.number(),
  timestamp: z.string(),
});

export const JobCostSummarySchema = z.object({
  jobId: z.string(),
  partNumber: z.string(),
  customer: z.string(),
  estimatedCost: z.object({
    labor: z.number(),
    material: z.number(),
    overhead: z.number(),
    total: z.number(),
  }),
  actualCost: z.object({
    labor: z.number(),
    material: z.number(),
    overhead: z.number(),
    total: z.number(),
  }),
  variance: z.object({
    labor: z.number(),
    material: z.number(),
    overhead: z.number(),
    total: z.number(),
    percentTotal: z.number(),
  }),
  laborEntries: z.array(LaborEntrySchema),
  materialUsage: z.array(MaterialUsageSchema),
  lastUpdated: z.string(),
});

export const LaborClockInputSchema = z.object({
  jobId: z.string(),
  operationId: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  department: z.string(),
  hourlyRate: z.number(),
  isSetup: z.boolean().default(false),
});

export const MaterialChargeInputSchema = z.object({
  jobId: z.string(),
  materialCode: z.string(),
  description: z.string(),
  quantityUsed: z.number(),
  unitCost: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type LaborEntry = z.infer<typeof LaborEntrySchema>;
export type MaterialUsage = z.infer<typeof MaterialUsageSchema>;
export type JobCostSummary = z.infer<typeof JobCostSummarySchema>;
export type LaborClockInput = z.infer<typeof LaborClockInputSchema>;
export type MaterialChargeInput = z.infer<typeof MaterialChargeInputSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const laborStore: Map<string, LaborEntry[]> = new Map();
const materialStore: Map<string, MaterialUsage[]> = new Map();
const activeClocks: Map<string, LaborEntry> = new Map();

const estimatedCosts: Map<string, { labor: number; material: number; overhead: number }> = new Map([
  ["JOB-2024-001", { labor: 2500, material: 1800, overhead: 800 }],
  ["JOB-2024-002", { labor: 3200, material: 2400, overhead: 1100 }],
]);

let entryCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorCostEngine {
  /**
   * Clock in to start labor tracking
   * @param input - Clock-in parameters
   * @returns Active labor entry
   */
  static clockIn(input: LaborClockInput): LaborEntry {
    const validated = LaborClockInputSchema.parse(input);
    const clockKey = `${validated.jobId}-${validated.employeeId}`;

    if (activeClocks.has(clockKey)) {
      throw new Error(`Employee ${validated.employeeId} already clocked in on job ${validated.jobId}`);
    }

    const entry: LaborEntry = {
      id: `LAB-${++entryCounter}`,
      jobId: validated.jobId,
      operationId: validated.operationId,
      employeeId: validated.employeeId,
      employeeName: validated.employeeName,
      department: validated.department,
      startTime: new Date().toISOString(),
      hoursWorked: 0,
      hourlyRate: validated.hourlyRate,
      laborCost: 0,
      isSetup: validated.isSetup,
    };

    activeClocks.set(clockKey, entry);
    return entry;
  }

  /**
   * Clock out to complete labor entry
   * @param jobId - Job identifier
   * @param employeeId - Employee identifier
   * @returns Completed labor entry
   */
  static clockOut(jobId: string, employeeId: string): LaborEntry | undefined {
    const clockKey = `${jobId}-${employeeId}`;
    const entry = activeClocks.get(clockKey);
    if (!entry) return undefined;

    const endTime = new Date();
    const startTime = new Date(entry.startTime);
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / 3600000;

    entry.endTime = endTime.toISOString();
    entry.hoursWorked = Math.round(hoursWorked * 100) / 100;
    entry.laborCost = Math.round(entry.hoursWorked * entry.hourlyRate * 100) / 100;

    activeClocks.delete(clockKey);

    const jobLabor = laborStore.get(jobId) || [];
    jobLabor.push(entry);
    laborStore.set(jobId, jobLabor);

    return entry;
  }

  /**
   * Add material charge to a job
   * @param input - Material usage data
   * @returns Material usage entry
   */
  static chargeMaterial(input: MaterialChargeInput): MaterialUsage {
    const validated = MaterialChargeInputSchema.parse(input);

    const usage: MaterialUsage = {
      id: `MAT-${++entryCounter}`,
      jobId: validated.jobId,
      materialCode: validated.materialCode,
      description: validated.description,
      quantityUsed: validated.quantityUsed,
      unitCost: validated.unitCost,
      totalCost: Math.round(validated.quantityUsed * validated.unitCost * 100) / 100,
      timestamp: new Date().toISOString(),
    };

    const jobMaterial = materialStore.get(validated.jobId) || [];
    jobMaterial.push(usage);
    materialStore.set(validated.jobId, jobMaterial);

    return usage;
  }

  /**
   * Get job cost summary with variance analysis
   * @param jobId - Job identifier
   * @returns Cost summary with estimates vs actuals
   */
  static getJobCostSummary(jobId: string): JobCostSummary {
    const laborEntries = laborStore.get(jobId) || [];
    const materialUsage = materialStore.get(jobId) || [];
    const estimated = estimatedCosts.get(jobId) || { labor: 0, material: 0, overhead: 0 };

    const actualLabor = laborEntries.reduce((sum, e) => sum + e.laborCost, 0);
    const actualMaterial = materialUsage.reduce((sum, m) => sum + m.totalCost, 0);
    const actualOverhead = actualLabor * 0.35; // 35% overhead rate
    const actualTotal = actualLabor + actualMaterial + actualOverhead;

    const estimatedTotal = estimated.labor + estimated.material + estimated.overhead;
    const varianceTotal = actualTotal - estimatedTotal;

    return {
      jobId,
      partNumber: "DIE-4512-A",
      customer: "ALCOA",
      estimatedCost: {
        labor: estimated.labor,
        material: estimated.material,
        overhead: estimated.overhead,
        total: estimatedTotal,
      },
      actualCost: {
        labor: Math.round(actualLabor * 100) / 100,
        material: Math.round(actualMaterial * 100) / 100,
        overhead: Math.round(actualOverhead * 100) / 100,
        total: Math.round(actualTotal * 100) / 100,
      },
      variance: {
        labor: Math.round((actualLabor - estimated.labor) * 100) / 100,
        material: Math.round((actualMaterial - estimated.material) * 100) / 100,
        overhead: Math.round((actualOverhead - estimated.overhead) * 100) / 100,
        total: Math.round(varianceTotal * 100) / 100,
        percentTotal: estimatedTotal > 0 ? Math.round((varianceTotal / estimatedTotal) * 10000) / 100 : 0,
      },
      laborEntries,
      materialUsage,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get labor cost by department
   * @param jobId - Job identifier
   * @returns Labor cost breakdown by department
   */
  static getLaborByDepartment(jobId: string): Record<string, number> {
    const laborEntries = laborStore.get(jobId) || [];
    return laborEntries.reduce((acc, entry) => {
      acc[entry.department] = (acc[entry.department] || 0) + entry.laborCost;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get active clock-ins
   * @returns All active labor entries
   */
  static getActiveClocks(): LaborEntry[] {
    return Array.from(activeClocks.values());
  }

  /**
   * Set estimated costs for a job
   * @param jobId - Job identifier
   * @param costs - Estimated costs
   */
  static setEstimatedCosts(jobId: string, costs: { labor: number; material: number; overhead: number }): void {
    estimatedCosts.set(jobId, costs);
  }

  static getSelfAwareness() {
    return {
      name: "ShopFloorCostEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["clockIn", "clockOut", "chargeMaterial", "getJobCostSummary", "getLaborByDepartment", "getActiveClocks", "setEstimatedCosts"],
      dependencies: [],
    };
  }
}

export const shopFloorCostEngine = new ShopFloorCostEngine();
