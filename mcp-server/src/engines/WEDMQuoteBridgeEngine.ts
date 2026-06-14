/**
 * WEDMQuoteBridgeEngine — Cost → Quote Line Items bridge
 *
 * WEDM-ERP-MS0 U-WEDM-ERP01
 *
 * Transforms EDMCostDocumentationEngine.CostEstimate into QuoteLineItem[]
 * compatible with QuoteEngine. Implements:
 *   - 5-component cost mapping (machine_time, wire, consumables, post_process, overhead)
 *   - Per-piece breakdown (unit_price = total / quantity)
 *   - Quantity breaks with Wright's Law learning curve (scrutiny fix_5)
 *   - Uncertainty propagation via RSS (scrutiny fix_2)
 *
 * Does NOT replace QuoteEngine. This engine is a pure adapter — it is called
 * by quote routes (U-WEDM-ERP04/05) and the QuoteBuilderPage WEDM section
 * (U-WEDM-ERP08).
 *
 * Citations:
 *   - Wright, T.P. (1936) "Factors Affecting the Cost of Airplanes", J. Aero. Sci. 3, 122–128
 *   - BIPM (2008) "Guide to the Expression of Uncertainty in Measurement" (GUM), §5.1.2 (RSS for independent vars)
 */

import type { CostEstimate } from "./EDMCostDocumentationEngine.js";
import type { QuoteLineItem } from "./QuoteEngine.js";
import {
  WEDM_COST_UNCERTAINTY,
  WEDM_LEARNING_CURVE,
  applyLearningCurve,
  rssUncertainty,
} from "../physics/wedm-constants.js";

// ============================================================================
// ENHANCED LINE ITEM WITH UNCERTAINTY (fix_2)
// ============================================================================

export interface WEDMQuoteLineItem extends QuoteLineItem {
  /** Category key — machine_time | wire | consumables | post_process | overhead | margin */
  category: WEDMCostCategory;
  /** Uncertainty percentage on this line's cost (from RSS) */
  uncertainty_pct: number;
  /** Source citation for the cost number */
  source?: string;
}

export type WEDMCostCategory =
  | "machine_time"
  | "wire"
  | "consumables"
  | "post_process"
  | "overhead"
  | "margin";

export interface WEDMQuoteLineItemsResult {
  /** Line items flattened (one per category) */
  line_items: WEDMQuoteLineItem[];
  /** Rolled-up totals */
  subtotal: number;
  overhead: number;
  margin: number;
  total: number;
  /** Aggregate uncertainty after RSS propagation [%] */
  total_uncertainty_pct: number;
  /** 95% confidence interval (approx, assuming gaussian) */
  confidence_interval: { low: number; high: number; confidence: number };
  /** Input cost estimate for audit */
  source_cost_estimate: CostEstimate;
}

export interface WEDMQuantityBreakOptions {
  /** Quantities to break at (e.g., [1, 10, 25, 50, 100]) */
  quantities: number[];
  /** Learning rate override (default = 0.85 per Wright) */
  learning_rate?: number;
  /** Whether to amortize setup across quantity */
  amortize_setup?: boolean;
}

export interface WEDMQuantityBreakResult {
  quantity: number;
  unit_price: number;
  total_price: number;
  savings_pct_vs_qty1: number;
  line_items: WEDMQuoteLineItem[];
  /** Learning-curve-reduced machine time cost per unit */
  machine_time_per_unit: number;
}

// ============================================================================
// ENGINE
// ============================================================================

// WIRE-EXEMPT: pure adapter (WEDM-ERP-MS0 U-WEDM-ERP01), intentionally NOT a
// direct MCP dispatcher action. Consumed by: the WEDM-ERP quote REST routes
// (src/routes/wedm-erp.ts, U-WEDM-ERP04/05), the QuoteBuilderPage WEDM section
// (U-WEDM-ERP08), and transitively AutoPrintToProgramBridgeEngine (wired to
// camDispatcher). Tested in __tests__/WEDMQuoteBridgeEngine.test.ts +
// wedm-erp-routes.test.ts. The WEDM↔quoting synergy is reachable via these paths;
// a direct dispatcher action would duplicate the route surface. (Verified
// 2026-06-09, slot:charlie — the dispatcher-only orphan audit false-flags it.)
export class WEDMQuoteBridgeEngine {
  /**
   * Convert a CostEstimate into a structured list of WEDMQuoteLineItems.
   * One line item per cost category, with uncertainty attached.
   */
  static toQuoteLineItems(
    cost: CostEstimate,
    quantity = 1,
  ): WEDMQuoteLineItemsResult {
    if (!cost) {
      throw new Error("WEDMQuoteBridgeEngine.toQuoteLineItems: cost is required");
    }
    const qty = Math.max(1, Math.floor(quantity));
    const items: WEDMQuoteLineItem[] = [];

    // --- Category 1: Machine Time ---
    const machineCost = cost.machine_time?.cost ?? 0;
    items.push({
      category: "machine_time",
      description: `WEDM Machine Time (${(cost.machine_time?.total_hrs ?? 0).toFixed(2)} hr @ $${(cost.machine_time?.rate_per_hr ?? 0).toFixed(2)}/hr)`,
      quantity: qty,
      unit_cost: machineCost / qty,
      total: machineCost,
      uncertainty_pct: WEDM_COST_UNCERTAINTY.cutting_time_pct,
      source: "EDMCostDocumentationEngine.MachineTimeCostCalculator",
    });

    // --- Category 2: Wire ---
    const wireCost = cost.wire?.cost ?? 0;
    items.push({
      category: "wire",
      description: `Wire Consumption (${(cost.wire?.length_m ?? 0).toFixed(1)} m ${cost.wire?.wire_type ?? "brass"} ⌀${(cost.wire?.diameter_mm ?? 0.25).toFixed(2)}mm)`,
      quantity: qty,
      unit_cost: wireCost / qty,
      total: wireCost,
      uncertainty_pct: WEDM_COST_UNCERTAINTY.wire_consumption_pct,
      source: "EDMCostDocumentationEngine.WireCostCalculator",
    });

    // --- Category 3: Consumables ---
    const consumablesCost = cost.consumables?.total ?? 0;
    items.push({
      category: "consumables",
      description: `Consumables (filters, guides, nozzles, resin)`,
      quantity: qty,
      unit_cost: consumablesCost / qty,
      total: consumablesCost,
      uncertainty_pct: WEDM_COST_UNCERTAINTY.consumables_pct,
      source: "EDMCostDocumentationEngine.ConsumablesCostCalculator",
    });

    // --- Category 4: Post-Process ---
    const postProcessCost = cost.post_process?.total ?? 0;
    if (postProcessCost > 0) {
      const ops = cost.post_process?.items?.map((i) => i.name).join(", ") ?? "None";
      items.push({
        category: "post_process",
        description: `Post-Process (${ops})`,
        quantity: qty,
        unit_cost: postProcessCost / qty,
        total: postProcessCost,
        uncertainty_pct: WEDM_COST_UNCERTAINTY.post_process_pct,
        source: "EDMCostDocumentationEngine.PostProcessCostCalculator",
      });
    }

    // --- Category 5: Overhead ---
    const overheadCost = cost.overhead ?? 0;
    items.push({
      category: "overhead",
      description: `Shop Overhead (${((cost.overhead_pct ?? 0) * 100).toFixed(1)}%)`,
      quantity: qty,
      unit_cost: overheadCost / qty,
      total: overheadCost,
      uncertainty_pct: WEDM_COST_UNCERTAINTY.setup_time_pct,
      source: "EDMCostDocumentationEngine.Aggregator",
    });

    // --- Category 6: Margin (informational, not a cost) ---
    const marginUsd = cost.margin ?? 0;
    items.push({
      category: "margin",
      description: `Margin (${((cost.margin_pct ?? 0) * 100).toFixed(1)}%)`,
      quantity: qty,
      unit_cost: marginUsd / qty,
      total: marginUsd,
      uncertainty_pct: 0, // margin is a decision, not an estimate
      source: "Shop margin policy",
    });

    // --- Aggregate totals ---
    // Compute subtotal directly from the line items we built, so overrides
    // of individual components (e.g., carbide overriding machine_time.cost)
    // produce a correct aggregate. Do not trust cost.total_per_part: it
    // may be stale relative to partial overrides.
    const costItemsSum = items
      .filter((i) => i.category !== "overhead" && i.category !== "margin")
      .reduce((s, i) => s + i.total, 0);
    const subtotal = costItemsSum;
    const total = subtotal + overheadCost + marginUsd;

    // --- RSS uncertainty (fix_2) ---
    const costUncertainties = items
      .filter((i) => i.category !== "margin")
      .map((i) => i.uncertainty_pct);
    const total_uncertainty_pct = rssUncertainty(costUncertainties);

    // --- 95% CI (1.96σ for gaussian) ---
    const sigmaUsd = (total * total_uncertainty_pct) / 100;
    const ci95 = 1.96 * sigmaUsd;

    return {
      line_items: items,
      subtotal,
      overhead: overheadCost,
      margin: marginUsd,
      total,
      total_uncertainty_pct,
      confidence_interval: {
        low: Math.max(0, total - ci95),
        high: total + ci95,
        confidence: 0.95,
      },
      source_cost_estimate: cost,
    };
  }

  /**
   * Produce a set of quantity breaks with Wright's Law learning curve applied
   * to the machine time component only. Setup costs are amortized linearly
   * unless disabled.
   */
  static getQuantityBreaks(
    cost: CostEstimate,
    options: WEDMQuantityBreakOptions,
  ): WEDMQuantityBreakResult[] {
    if (!cost) throw new Error("cost required");
    const quantities = (options.quantities ?? [1, 10, 25, 50, 100])
      .map((q) => Math.max(1, Math.floor(q)))
      .sort((a, b) => a - b);
    const learning_rate = options.learning_rate ?? WEDM_LEARNING_CURVE.default_learning_rate;
    const amortize = options.amortize_setup ?? true;

    // Base single-unit values
    // IMPORTANT: machine_time.cost already includes setup_hrs × rate. To avoid
    // double-counting when we amortize setup across quantities, strip setup
    // out of the base machine cost for per-unit learning.
    const machineRate = cost.machine_time?.rate_per_hr ?? 0;
    const setupHrs = cost.machine_time?.setup_hrs ?? 0;
    const setupCost = setupHrs * machineRate;
    const baseMachineCostPerUnit = Math.max(0, (cost.machine_time?.cost ?? 0) - setupCost);
    const baseWireCostPerUnit = (cost.wire?.cost ?? 0);
    const baseConsumablesPerUnit = (cost.consumables?.total ?? 0);
    const basePostProcessPerUnit = (cost.post_process?.total ?? 0);

    const overheadPct = cost.overhead_pct ?? 0;
    const marginPct = cost.margin_pct ?? 0;

    const results: WEDMQuantityBreakResult[] = [];
    // qty=1 reference price: machine (no learning curve) + setup + other components,
    // with overhead and margin applied the same way as below.
    const qty1UnitOps = baseMachineCostPerUnit + setupCost + baseWireCostPerUnit + baseConsumablesPerUnit + basePostProcessPerUnit;
    const qty1UnitOverhead = qty1UnitOps * overheadPct;
    const qty1UnitMargin = (qty1UnitOps + qty1UnitOverhead) * marginPct;
    const qty1UnitPrice = qty1UnitOps + qty1UnitOverhead + qty1UnitMargin;

    for (const qty of quantities) {
      // Machine time per unit: Wright's law reduces with quantity
      const reducedMachineCost = applyLearningCurve(baseMachineCostPerUnit, qty, learning_rate);

      // Setup amortization
      const setupPerUnit = amortize ? setupCost / qty : setupCost;

      // Per-unit operational cost
      const unitOps = reducedMachineCost + baseWireCostPerUnit + baseConsumablesPerUnit + basePostProcessPerUnit + setupPerUnit;
      const unitSubtotal = unitOps;
      const unitOverhead = unitSubtotal * overheadPct;
      const unitMargin = (unitSubtotal + unitOverhead) * marginPct;
      const unit_price = unitSubtotal + unitOverhead + unitMargin;

      const total_price = unit_price * qty;
      const savings_pct_vs_qty1 = qty1UnitPrice > 0 ? ((qty1UnitPrice - unit_price) / qty1UnitPrice) * 100 : 0;

      const line_items: WEDMQuoteLineItem[] = [
        {
          category: "machine_time",
          description: `WEDM Machine Time (learning curve ${(learning_rate * 100).toFixed(0)}%) @ qty ${qty}`,
          quantity: qty,
          unit_cost: reducedMachineCost,
          total: reducedMachineCost * qty,
          uncertainty_pct: WEDM_COST_UNCERTAINTY.cutting_time_pct,
          source: "Wright 1936 learning curve",
        },
        {
          category: "wire",
          description: `Wire Consumption`,
          quantity: qty,
          unit_cost: baseWireCostPerUnit,
          total: baseWireCostPerUnit * qty,
          uncertainty_pct: WEDM_COST_UNCERTAINTY.wire_consumption_pct,
          source: "Per-unit constant",
        },
        {
          category: "consumables",
          description: `Consumables`,
          quantity: qty,
          unit_cost: baseConsumablesPerUnit,
          total: baseConsumablesPerUnit * qty,
          uncertainty_pct: WEDM_COST_UNCERTAINTY.consumables_pct,
          source: "Per-unit constant",
        },
      ];

      if (basePostProcessPerUnit > 0) {
        line_items.push({
          category: "post_process",
          description: `Post-Process`,
          quantity: qty,
          unit_cost: basePostProcessPerUnit,
          total: basePostProcessPerUnit * qty,
          uncertainty_pct: WEDM_COST_UNCERTAINTY.post_process_pct,
          source: "Per-unit constant",
        });
      }

      if (setupCost > 0) {
        line_items.push({
          category: "overhead",
          description: `Setup${amortize ? " (amortized across qty " + qty + ")" : ""}`,
          quantity: qty,
          unit_cost: setupPerUnit,
          total: setupCost,
          uncertainty_pct: WEDM_COST_UNCERTAINTY.setup_time_pct,
          source: "Setup hours × machine rate",
        });
      }

      results.push({
        quantity: qty,
        unit_price,
        total_price,
        savings_pct_vs_qty1,
        line_items,
        machine_time_per_unit: reducedMachineCost,
      });
    }

    return results;
  }

  /**
   * Get just the cost data (no line items), useful when routes need
   * just summary numbers without ceremony.
   */
  static summarize(cost: CostEstimate, quantity = 1): {
    subtotal: number;
    overhead: number;
    margin: number;
    total: number;
    per_unit: number;
    total_uncertainty_pct: number;
  } {
    const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, quantity);
    return {
      subtotal: result.subtotal,
      overhead: result.overhead,
      margin: result.margin,
      total: result.total,
      per_unit: result.total / Math.max(1, quantity),
      total_uncertainty_pct: result.total_uncertainty_pct,
    };
  }
}

export const wedmQuoteBridgeEngine = WEDMQuoteBridgeEngine;
