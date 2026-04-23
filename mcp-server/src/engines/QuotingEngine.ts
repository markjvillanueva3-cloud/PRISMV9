/**
 * PRISM MCP Server — Quoting Engine
 *
 * @deprecated U-CONSOL1: This engine is superseded by QuoteEstimatorEngine,
 * which provides physics-backed estimation with CI95 uncertainty bands,
 * secondary ops, NRE, DfM warnings, and feature-based complexity.
 * All dispatcher actions now route to QuoteEstimatorEngine.
 * This file is retained for backward compatibility of direct imports only.
 *
 * Canonical engine: QuoteEstimatorEngine
 *
 * @module QuotingEngine
 */

import { jobCostingEngine, type JobSpec } from "./JobCostingEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteOptions {
  customer?: { name?: string; id?: string };
  rush?: boolean;
  prototype?: boolean;
  repeatOrder?: boolean;
  targetMargin?: number;
  validDays?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
}

export interface Quote {
  quoteNumber: string;
  date: string;
  validUntil: string;
  customer: { name?: string; id?: string };
  jobSummary: {
    partName: string;
    partNumber: string;
    quantity: number;
    material: string;
    complexity: string;
  };
  pricing: {
    unitPrice: number;
    totalPrice: number;
    breakdown: {
      baseCost: number;
      margin: number;
      marginPercent: string;
    };
    adjustments: {
      rushPremium: string | null;
      prototypePremium: string | null;
      repeatDiscount: string | null;
      volumeDiscount: string | null;
    };
  };
  leadTime: { standard: number; rush: number; unit: string };
  costBreakdown: Record<string, number>;
  terms: { payment: string; delivery: string; warranty: string };
  notes: string[];
}

export interface PriceBreak {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  leadTime: number;
}

// ============================================================================
// CONFIG
// ============================================================================

const PRICING = {
  targetMargin: 0.35,
  minMargin: 0.20,
  rushMultiplier: 1.5,
  prototypeMultiplier: 1.25,
  repeatOrderDiscount: 0.10,
  volumeDiscountTiers: [
    { minQty: 100, discount: 0.05 },
    { minQty: 500, discount: 0.10 },
    { minQty: 1000, discount: 0.15 },
    { minQty: 5000, discount: 0.20 },
  ],
};

const LEAD_TIME_DAYS: Record<string, number> = {
  simple: 5, medium: 10, complex: 15, very_complex: 25,
};

// ============================================================================
// ENGINE
// ============================================================================

class QuotingEngineImpl {

  generateQuote(jobSpec: JobSpec, options: QuoteOptions = {}): Quote {
    const costs = jobCostingEngine.calculateJobCost(jobSpec);

    const multipliers = this._calculateMultipliers(jobSpec, options);
    const targetMargin = options.targetMargin ?? PRICING.targetMargin;
    const basePrice = costs.total / (1 - targetMargin);

    let adjustedPrice = basePrice * multipliers.total;
    const volumeDiscount = this._getVolumeDiscount(jobSpec.quantity ?? 1);
    adjustedPrice *= (1 - volumeDiscount);

    const finalPrice = this._roundPrice(adjustedPrice);
    const quantity = jobSpec.quantity ?? 1;
    const pricePerPart = this._roundPrice(finalPrice / Math.max(quantity, 1));
    const actualMargin = finalPrice > 0 ? (finalPrice - costs.total) / finalPrice : 0;

    return {
      quoteNumber: this._generateQuoteNumber(),
      date: new Date().toISOString().split("T")[0],
      validUntil: this._futureDate(options.validDays ?? 30),
      customer: options.customer ?? {},
      jobSummary: {
        partName: ((jobSpec as unknown as Record<string, unknown>).partName as string) ?? "Custom Part",
        partNumber: ((jobSpec as unknown as Record<string, unknown>).partNumber as string) ?? "N/A",
        quantity,
        material: jobSpec.material?.type ?? "Unknown",
        complexity: jobSpec.complexity ?? "medium",
      },
      pricing: {
        unitPrice: pricePerPart,
        totalPrice: finalPrice,
        breakdown: {
          baseCost: costs.total,
          margin: round2(finalPrice - costs.total),
          marginPercent: (actualMargin * 100).toFixed(1) + "%",
        },
        adjustments: {
          rushPremium: multipliers.rush > 1
            ? `+${((multipliers.rush - 1) * 100).toFixed(0)}%` : null,
          prototypePremium: multipliers.prototype > 1
            ? `+${((multipliers.prototype - 1) * 100).toFixed(0)}%` : null,
          repeatDiscount: multipliers.repeat < 1
            ? `-${((1 - multipliers.repeat) * 100).toFixed(0)}%` : null,
          volumeDiscount: volumeDiscount > 0
            ? `-${(volumeDiscount * 100).toFixed(0)}%` : null,
        },
      },
      leadTime: this._calculateLeadTime(jobSpec),
      costBreakdown: {
        material: costs.material.cost,
        machining: costs.machining.cost,
        setup: costs.setup.cost,
        programming: costs.programming.cost,
        inspection: costs.inspection.cost,
        finishing: costs.finishing.cost,
        overhead: costs.overhead.cost,
      },
      terms: {
        payment: options.paymentTerms ?? "Net 30",
        delivery: options.deliveryTerms ?? "FOB Origin",
        warranty: "90 days workmanship guarantee",
      },
      notes: this._generateNotes(jobSpec, options),
    };
  }

  generatePriceBreaks(
    jobSpec: JobSpec,
    quantities: number[] = [1, 10, 25, 50, 100, 250, 500],
  ): PriceBreak[] {
    return quantities.map(qty => {
      const spec = { ...jobSpec, quantity: qty };
      const quote = this.generateQuote(spec);
      return {
        quantity: qty,
        unitPrice: quote.pricing.unitPrice,
        totalPrice: quote.pricing.totalPrice,
        leadTime: quote.leadTime.standard,
      };
    });
  }

  private _calculateMultipliers(jobSpec: JobSpec, options: QuoteOptions) {
    const rush = (options.rush || (jobSpec as unknown as Record<string, unknown>).rush) ? PRICING.rushMultiplier : 1.0;
    const proto = ((jobSpec.quantity ?? 1) === 1 || options.prototype)
      ? PRICING.prototypeMultiplier : 1.0;
    const repeat = options.repeatOrder
      ? (1 - PRICING.repeatOrderDiscount) : 1.0;

    return { rush, prototype: proto, repeat, total: rush * proto * repeat };
  }

  private _getVolumeDiscount(quantity: number): number {
    for (let i = PRICING.volumeDiscountTiers.length - 1; i >= 0; i--) {
      if (quantity >= PRICING.volumeDiscountTiers[i].minQty) {
        return PRICING.volumeDiscountTiers[i].discount;
      }
    }
    return 0;
  }

  private _roundPrice(price: number): number {
    if (price < 100) return Math.ceil(price * 100) / 100;
    if (price < 1000) return Math.ceil(price / 5) * 5;
    return Math.ceil(price / 10) * 10;
  }

  private _generateQuoteNumber(): string {
    const yr = new Date().getFullYear().toString().slice(-2);
    const rnd = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `Q${yr}-${rnd}`;
  }

  private _futureDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  private _calculateLeadTime(jobSpec: JobSpec) {
    const complexity = jobSpec.complexity ?? "medium";
    const baseDays = LEAD_TIME_DAYS[complexity] ?? 10;
    const qtyDays = Math.ceil((jobSpec.quantity ?? 1) / 50) * 2;
    const finishDays = (jobSpec.finishingOperations?.length ?? 0) * 3;
    const total = baseDays + qtyDays + finishDays;

    return { standard: total, rush: Math.ceil(total * 0.5), unit: "business days" };
  }

  private _generateNotes(jobSpec: JobSpec, options: QuoteOptions): string[] {
    const notes: string[] = [];
    if (jobSpec.material?.customerSupplied) notes.push("Material to be supplied by customer");
    if (jobSpec.firstArticleRequired) notes.push("First article inspection included");
    const jobRec = jobSpec as unknown as Record<string, unknown>;
    if ((jobRec.certifications as string[])?.length) {
      notes.push(`Certifications required: ${(jobRec.certifications as string[]).join(", ")}`);
    }
    if (options.notes) notes.push(options.notes);
    return notes;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const quotingEngine = new QuotingEngineImpl();
