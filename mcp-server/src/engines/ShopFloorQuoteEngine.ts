/**
 * ShopFloorQuoteEngine — Quick Quoting from Shop Floor
 * =====================================================
 *
 * Enables rapid quote generation using shop floor data, historical
 * job costs, and real-time capacity information.
 *
 * L2-P4-MS1/P0-U01 — Batch 1: Shop Floor Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const OperationEstimateSchema = z.object({
  code: z.string(),
  description: z.string(),
  department: z.string(),
  setupMinutes: z.number(),
  cycleMinutes: z.number(),
  setupCost: z.number(),
  runCost: z.number(),
  totalCost: z.number(),
});

export const QuoteRequestSchema = z.object({
  partNumber: z.string(),
  material: z.string(),
  materialCostPerUnit: z.number(),
  quantity: z.number(),
  operations: z.array(z.object({
    code: z.string(),
    description: z.string(),
    department: z.string(),
    setupMinutes: z.number(),
    cycleMinutes: z.number(),
  })),
  rushOrder: z.boolean().default(false),
  targetMargin: z.number().default(0.25),
});

export const QuoteResultSchema = z.object({
  quoteId: z.string(),
  partNumber: z.string(),
  quantity: z.number(),
  operations: z.array(OperationEstimateSchema),
  materialCost: z.number(),
  laborCost: z.number(),
  overheadCost: z.number(),
  subtotal: z.number(),
  margin: z.number(),
  marginPercent: z.number(),
  totalPrice: z.number(),
  pricePerUnit: z.number(),
  estimatedLeadDays: z.number(),
  rushPremium: z.number(),
  validUntil: z.string(),
  generatedAt: z.string(),
  notes: z.array(z.string()),
});

export const HistoricalJobSchema = z.object({
  jobId: z.string(),
  partNumber: z.string(),
  customer: z.string(),
  quantity: z.number(),
  quotedPrice: z.number(),
  actualCost: z.number(),
  marginRealized: z.number(),
  completedAt: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperationEstimate = z.infer<typeof OperationEstimateSchema>;
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResult = z.infer<typeof QuoteResultSchema>;
export type HistoricalJob = z.infer<typeof HistoricalJobSchema>;

// ─── Rate Configuration ───────────────────────────────────────────────────────

const departmentRates: Record<string, { setupRate: number; runRate: number }> = {
  Lathe: { setupRate: 85, runRate: 75 },
  Mill: { setupRate: 90, runRate: 80 },
  "Wire EDM": { setupRate: 120, runRate: 95 },
  "Sinker EDM": { setupRate: 110, runRate: 90 },
  Grinding: { setupRate: 95, runRate: 85 },
  Inspection: { setupRate: 70, runRate: 60 },
  Outside: { setupRate: 0, runRate: 0 },
};

const overheadRate = 0.35;
const rushPremiumRate = 0.25;

let quoteCounter = 5000;

// ─── Historical Data ──────────────────────────────────────────────────────────

const historicalJobs: HistoricalJob[] = [
  { jobId: "JOB-2023-450", partNumber: "DIE-4512-A", customer: "ALCOA", quantity: 25, quotedPrice: 4500, actualCost: 3200, marginRealized: 0.289, completedAt: "2023-11-15" },
  { jobId: "JOB-2023-512", partNumber: "DIE-4512-A", customer: "ALCOA", quantity: 50, quotedPrice: 7200, actualCost: 5100, marginRealized: 0.292, completedAt: "2024-02-20" },
  { jobId: "JOB-2024-089", partNumber: "PUNCH-7890-B", customer: "ITW", quantity: 100, quotedPrice: 12500, actualCost: 9400, marginRealized: 0.248, completedAt: "2024-06-10" },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorQuoteEngine {
  /**
   * Generate a quote for a part
   * @param request - Quote request parameters
   * @returns Complete quote with breakdown
   */
  static generateQuote(request: QuoteRequest): QuoteResult {
    const validated = QuoteRequestSchema.parse(request);
    const now = new Date();

    const operations: OperationEstimate[] = validated.operations.map(op => {
      const rates = departmentRates[op.department] || { setupRate: 80, runRate: 70 };
      const setupCost = (op.setupMinutes / 60) * rates.setupRate;
      const runCost = ((op.cycleMinutes / 60) * validated.quantity) * rates.runRate;
      return {
        code: op.code,
        description: op.description,
        department: op.department,
        setupMinutes: op.setupMinutes,
        cycleMinutes: op.cycleMinutes,
        setupCost: Math.round(setupCost * 100) / 100,
        runCost: Math.round(runCost * 100) / 100,
        totalCost: Math.round((setupCost + runCost) * 100) / 100,
      };
    });

    const laborCost = operations.reduce((sum, op) => sum + op.totalCost, 0);
    const materialCost = validated.materialCostPerUnit * validated.quantity;
    const overheadCost = laborCost * overheadRate;
    const subtotal = laborCost + materialCost + overheadCost;

    let rushPremium = 0;
    if (validated.rushOrder) {
      rushPremium = subtotal * rushPremiumRate;
    }

    const margin = (subtotal + rushPremium) * validated.targetMargin;
    const totalPrice = subtotal + rushPremium + margin;

    const totalCycleMinutes = validated.operations.reduce((sum, op) => sum + (op.cycleMinutes * validated.quantity), 0);
    const totalSetupMinutes = validated.operations.reduce((sum, op) => sum + op.setupMinutes, 0);
    const estimatedLeadDays = Math.ceil((totalCycleMinutes + totalSetupMinutes) / (8 * 60)) + 2;

    const notes: string[] = [];
    if (validated.rushOrder) {
      notes.push(`Rush order premium of ${(rushPremiumRate * 100).toFixed(0)}% applied`);
    }
    notes.push(`Quote valid for 30 days`);
    notes.push(`Lead time estimate assumes current shop load`);

    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 30);

    return {
      quoteId: `QTE-${++quoteCounter}`,
      partNumber: validated.partNumber,
      quantity: validated.quantity,
      operations,
      materialCost: Math.round(materialCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      overheadCost: Math.round(overheadCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginPercent: validated.targetMargin * 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      pricePerUnit: Math.round((totalPrice / validated.quantity) * 100) / 100,
      estimatedLeadDays: validated.rushOrder ? Math.ceil(estimatedLeadDays * 0.7) : estimatedLeadDays,
      rushPremium: Math.round(rushPremium * 100) / 100,
      validUntil: validUntil.toISOString(),
      generatedAt: now.toISOString(),
      notes,
    };
  }

  /**
   * Get historical job data for a part number
   * @param partNumber - Part number to look up
   * @returns Historical jobs for the part
   */
  static getHistoricalJobs(partNumber: string): HistoricalJob[] {
    return historicalJobs.filter(j => j.partNumber === partNumber);
  }

  /**
   * Calculate suggested price based on history
   * @param partNumber - Part number
   * @param quantity - Requested quantity
   * @returns Suggested price per unit based on historical data
   */
  static getSuggestedPriceFromHistory(partNumber: string, quantity: number): { suggestedPrice: number; basedOnJobs: number; confidence: string } | null {
    const history = historicalJobs.filter(j => j.partNumber === partNumber);
    if (history.length === 0) return null;

    const avgPricePerUnit = history.reduce((sum, j) => sum + (j.quotedPrice / j.quantity), 0) / history.length;
    let quantityAdjustment = 1;
    if (quantity > 50) quantityAdjustment = 0.9;
    if (quantity > 100) quantityAdjustment = 0.85;

    return {
      suggestedPrice: Math.round(avgPricePerUnit * quantityAdjustment * quantity * 100) / 100,
      basedOnJobs: history.length,
      confidence: history.length >= 3 ? "high" : history.length >= 2 ? "medium" : "low",
    };
  }

  /**
   * Compare quote to historical margin performance
   * @param quotePrice - Proposed quote price
   * @param estimatedCost - Estimated cost
   * @returns Margin analysis
   */
  static analyzeMargin(quotePrice: number, estimatedCost: number): { proposedMargin: number; historicalAvgMargin: number; recommendation: string } {
    const proposedMargin = (quotePrice - estimatedCost) / quotePrice;
    const historicalAvgMargin = historicalJobs.reduce((sum, j) => sum + j.marginRealized, 0) / historicalJobs.length;

    let recommendation = "Margin is within acceptable range";
    if (proposedMargin < 0.20) {
      recommendation = "Warning: Margin below 20% minimum threshold";
    } else if (proposedMargin < historicalAvgMargin - 0.05) {
      recommendation = "Margin is below historical average by more than 5%";
    } else if (proposedMargin > 0.40) {
      recommendation = "Margin may be too high for competitive pricing";
    }

    return {
      proposedMargin: Math.round(proposedMargin * 10000) / 100,
      historicalAvgMargin: Math.round(historicalAvgMargin * 10000) / 100,
      recommendation,
    };
  }

  /**
   * Get department rates
   * @returns Current department rate configuration
   */
  static getDepartmentRates(): Record<string, { setupRate: number; runRate: number }> {
    return { ...departmentRates };
  }

  static getSelfAwareness() {
    return {
      name: "ShopFloorQuoteEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["generateQuote", "getHistoricalJobs", "getSuggestedPriceFromHistory", "analyzeMargin", "getDepartmentRates"],
      dependencies: [],
    };
  }
}

export const shopFloorQuoteEngine = new ShopFloorQuoteEngine();
