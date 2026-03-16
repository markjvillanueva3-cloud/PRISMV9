/**
 * PartFamilyEconomicsEngine
 * Economic intelligence for part families — aggregates cost data across similar parts
 * to find lot-size sweet spots, tool rotation strategies, and hidden cost drivers.
 *
 * Uses EOQ (Economic Order Quantity) for batch sizing, ABC analysis for cost drivers,
 * and tool rotation optimization to minimize cost-per-part across a family.
 *
 * Key formulas:
 *   EOQ = sqrt(2·D·S / H)  — Wilson 1934
 *   Reorder point = d·L + Z·σ·√L  — safety stock
 *   ABC: Pareto 80/20 classification by cumulative cost contribution
 *
 * @module engines/PartFamilyEconomicsEngine
 */

import { log } from "../utils/Logger.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface PartSpec {
  name: string;
  annual_demand: number;
  setup_time_min: number;
  cycle_time_min: number;
  material_cost_per_unit: number;
}

export interface LotSizeInput {
  parts: PartSpec[];
  machine_rate_per_hour: number;
  operator_rate_per_hour?: number;
  holding_cost_pct?: number;
}

export interface LotSizeResult {
  parts: Array<{
    name: string;
    eoq: number;
    optimal_batch_size: number;
    setup_cost: number;
    cost_per_part_at_lot: Record<string, number>;
    total_annual_cost: number;
    setup_to_run_ratio: number;
    annual_setups: number;
  }>;
  family_summary: {
    total_annual_cost: number;
    total_annual_setups: number;
    avg_setup_to_run_ratio: number;
    recommendation: string;
  };
}

export interface ToolSpec {
  id: string;
  type: string;
  diameter: number;
  cost: number;
  tool_life_min: number;
  parts_per_life: number;
  last_replaced?: string;
}

export interface UpcomingJob {
  part: string;
  quantity: number;
  tools_needed: string[];
}

export interface ToolRotationInput {
  tools: ToolSpec[];
  upcoming_jobs: UpcomingJob[];
}

export interface ToolRotationResult {
  tools: Array<{
    id: string;
    type: string;
    diameter: number;
    remaining_life_pct: number;
    remaining_parts: number;
    upcoming_demand_parts: number;
    needs_replacement: boolean;
    replacement_urgency: "immediate" | "soon" | "ok";
    unplanned_break_cost: number;
    scheduled_replacement_cost: number;
    savings_from_scheduling: number;
  }>;
  consolidation_suggestions: Array<{
    action: string;
    tools_affected: string[];
    estimated_savings: number;
    rationale: string;
  }>;
  summary: {
    total_tools: number;
    needing_replacement: number;
    total_replacement_cost: number;
    total_unplanned_risk_cost: number;
    net_savings_from_scheduling: number;
  };
}

export interface JobCostData {
  part: string;
  quantity: number;
  material_cost: number;
  tool_cost: number;
  labor_cost: number;
  setup_cost: number;
  overhead: number;
  scrap_cost: number;
  rework_cost: number;
}

export interface CostDriverInput {
  jobs: JobCostData[];
}

export interface CostDriverResult {
  pareto: Array<{
    category: string;
    total_cost: number;
    pct_of_total: number;
    cumulative_pct: number;
    abc_class: "A" | "B" | "C";
  }>;
  per_part: Array<{
    part: string;
    total_cost: number;
    cost_per_unit: number;
    top_driver: string;
    top_driver_pct: number;
  }>;
  recommendations: string[];
  summary: {
    total_cost: number;
    num_parts: number;
    avg_cost_per_unit: number;
    class_a_categories: string[];
  };
}

export interface MaterialSpec {
  name: string;
  monthly_usage_kg: number;
  price_per_kg: number;
  lead_time_days: number;
  min_order_kg?: number;
  bulk_discount?: Array<{ qty_kg: number; discount_pct: number }>;
}

export interface BatchPurchasingInput {
  materials: MaterialSpec[];
  storage_cost_per_kg_month?: number;
}

export interface BatchPurchasingResult {
  materials: Array<{
    name: string;
    optimal_order_qty_kg: number;
    reorder_point_kg: number;
    orders_per_year: number;
    annual_cost_no_bulk: number;
    annual_cost_with_bulk: number;
    annual_savings: number;
    storage_cost_annual: number;
    best_discount_tier: string;
  }>;
  summary: {
    total_annual_material_cost: number;
    total_annual_savings: number;
    total_storage_cost: number;
    net_savings: number;
    recommendation: string;
  };
}

export interface PartFamilyReportInput {
  lot_size?: LotSizeInput;
  tool_rotation?: ToolRotationInput;
  cost_drivers?: CostDriverInput;
  purchasing?: BatchPurchasingInput;
}

export interface PartFamilyReportResult {
  lot_size?: LotSizeResult;
  tool_rotation?: ToolRotationResult;
  cost_drivers?: CostDriverResult;
  purchasing?: BatchPurchasingResult;
  executive_summary: {
    total_annual_cost: number;
    cost_per_part_family_avg: number;
    top_savings_opportunities: Array<{
      area: string;
      potential_savings: number;
      action: string;
    }>;
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

export class PartFamilyEconomicsEngine {

  // ════════════════════════════════════════════════════════════════════
  // analyzeLotSize — EOQ + setup time optimization
  // ════════════════════════════════════════════════════════════════════

  analyzeLotSize(input: LotSizeInput): LotSizeResult {
    const {
      parts,
      machine_rate_per_hour,
      operator_rate_per_hour = 0,
      holding_cost_pct = 0.25,
    } = input;

    if (!parts || parts.length === 0) {
      return {
        parts: [],
        family_summary: {
          total_annual_cost: 0,
          total_annual_setups: 0,
          avg_setup_to_run_ratio: 0,
          recommendation: "No parts provided.",
        },
      };
    }

    const combinedRate = machine_rate_per_hour + operator_rate_per_hour;
    const lotSizes = [1, 5, 10, 25, 50, 100];

    const partResults = parts.map((p) => {
      const D = Math.max(p.annual_demand, 0);
      const setupCostPerBatch =
        (p.setup_time_min / 60) * combinedRate;
      const unitProductionCost =
        p.material_cost_per_unit + (p.cycle_time_min / 60) * combinedRate;
      const H = unitProductionCost * holding_cost_pct;

      // EOQ = sqrt(2·D·S / H) — guard against zero/negative
      let eoq: number;
      if (D <= 0 || setupCostPerBatch <= 0 || H <= 0) {
        eoq = 1;
      } else {
        eoq = Math.sqrt((2 * D * setupCostPerBatch) / H);
      }
      eoq = Math.max(1, Math.round(eoq));

      // Cost at various lot sizes
      const costAtLot: Record<string, number> = {};
      for (const lot of lotSizes) {
        const numSetups = Math.ceil(D / Math.max(lot, 1));
        const totalSetup = numSetups * setupCostPerBatch;
        const totalProduction = D * unitProductionCost;
        const avgInventory = lot / 2;
        const holdingCost = avgInventory * H;
        const totalCost = totalSetup + totalProduction + holdingCost;
        const cpp = D > 0 ? totalCost / D : 0;
        costAtLot[`lot_${lot}`] = Math.round(cpp * 100) / 100;
      }

      // Total annual cost at EOQ
      const numSetupsAtEOQ = Math.ceil(D / eoq);
      const totalSetupAtEOQ = numSetupsAtEOQ * setupCostPerBatch;
      const totalProductionAnnual = D * unitProductionCost;
      const holdingAtEOQ = (eoq / 2) * H;
      const totalAnnualCost = totalSetupAtEOQ + totalProductionAnnual + holdingAtEOQ;

      const totalRunTime = D * p.cycle_time_min;
      const totalSetupTime = numSetupsAtEOQ * p.setup_time_min;
      const setupToRunRatio =
        totalRunTime > 0 ? totalSetupTime / totalRunTime : 0;

      return {
        name: p.name,
        eoq,
        optimal_batch_size: eoq,
        setup_cost: Math.round(setupCostPerBatch * 100) / 100,
        cost_per_part_at_lot: costAtLot,
        total_annual_cost: Math.round(totalAnnualCost * 100) / 100,
        setup_to_run_ratio: Math.round(setupToRunRatio * 1000) / 1000,
        annual_setups: numSetupsAtEOQ,
      };
    });

    const totalAnnualCost = partResults.reduce((s, p) => s + p.total_annual_cost, 0);
    const totalSetups = partResults.reduce((s, p) => s + p.annual_setups, 0);
    const avgSetupRatio =
      partResults.length > 0
        ? partResults.reduce((s, p) => s + p.setup_to_run_ratio, 0) / partResults.length
        : 0;

    let recommendation = "Family economics nominal.";
    if (avgSetupRatio > 0.5) {
      recommendation =
        "Setup time exceeds 50% of run time — consider fixture standardization or dedicated cells.";
    } else if (avgSetupRatio > 0.25) {
      recommendation =
        "Setup time is 25-50% of run time — group similar parts for sequential processing.";
    } else if (totalSetups > parts.length * 50) {
      recommendation =
        "High setup frequency — consider increasing batch sizes toward EOQ values.";
    }

    return {
      parts: partResults,
      family_summary: {
        total_annual_cost: Math.round(totalAnnualCost * 100) / 100,
        total_annual_setups: totalSetups,
        avg_setup_to_run_ratio: Math.round(avgSetupRatio * 1000) / 1000,
        recommendation,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // analyzeToolRotation — replacement scheduling & consolidation
  // ════════════════════════════════════════════════════════════════════

  analyzeToolRotation(input: ToolRotationInput): ToolRotationResult {
    const { tools, upcoming_jobs } = input;

    if (!tools || tools.length === 0) {
      return {
        tools: [],
        consolidation_suggestions: [],
        summary: {
          total_tools: 0,
          needing_replacement: 0,
          total_replacement_cost: 0,
          total_unplanned_risk_cost: 0,
          net_savings_from_scheduling: 0,
        },
      };
    }

    // Compute per-tool demand from upcoming jobs
    const toolDemand: Record<string, number> = {};
    for (const job of upcoming_jobs ?? []) {
      for (const tid of job.tools_needed ?? []) {
        toolDemand[tid] = (toolDemand[tid] ?? 0) + job.quantity;
      }
    }

    const toolResults = tools.map((t) => {
      const demand = toolDemand[t.id] ?? 0;
      const partsPerLife = Math.max(t.parts_per_life, 1);

      // Estimate remaining life based on last_replaced — if provided,
      // assume 50% used if no real tracking; otherwise 100% remaining
      let remainingPct = 100;
      if (t.last_replaced) {
        const daysSince = Math.max(
          0,
          (Date.now() - new Date(t.last_replaced).getTime()) / 86_400_000,
        );
        // Rough heuristic: tool_life_min represents minutes of cutting.
        // Assume ~6h cutting/day → 360 min/day effective
        const estMinUsed = daysSince * 360;
        const lifeMin = Math.max(t.tool_life_min, 1);
        remainingPct = Math.max(0, Math.min(100, 100 * (1 - estMinUsed / lifeMin)));
      }

      const remainingParts = Math.round((remainingPct / 100) * partsPerLife);
      const needsReplacement = remainingParts < demand;

      let urgency: "immediate" | "soon" | "ok" = "ok";
      if (remainingPct < 10 || remainingParts === 0) urgency = "immediate";
      else if (needsReplacement) urgency = "soon";

      // Unplanned break cost = tool cost + scrap part (~3x tool cost) + downtime
      const unplannedBreakCost = t.cost * 4;
      const scheduledReplacementCost = t.cost;
      const savings = unplannedBreakCost - scheduledReplacementCost;

      return {
        id: t.id,
        type: t.type,
        diameter: t.diameter,
        remaining_life_pct: Math.round(remainingPct * 10) / 10,
        remaining_parts: remainingParts,
        upcoming_demand_parts: demand,
        needs_replacement: needsReplacement,
        replacement_urgency: urgency,
        unplanned_break_cost: Math.round(unplannedBreakCost * 100) / 100,
        scheduled_replacement_cost: Math.round(scheduledReplacementCost * 100) / 100,
        savings_from_scheduling: Math.round(savings * 100) / 100,
      };
    });

    // Consolidation suggestions — group tools by type+diameter
    const groups: Record<string, typeof toolResults> = {};
    for (const t of toolResults) {
      const key = `${t.type}_${t.diameter}`;
      (groups[key] ??= []).push(t);
    }

    const consolidation: ToolRotationResult["consolidation_suggestions"] = [];
    for (const [key, group] of Object.entries(groups)) {
      const worn = group.filter((t) => t.remaining_life_pct < 50);
      if (worn.length >= 2) {
        const totalReplaceCost = worn.reduce((s, t) => s + t.scheduled_replacement_cost, 0);
        // Premium tool assumption: 1.5x cost of one, lasts 2x
        const premiumCost = worn[0].scheduled_replacement_cost * 1.5;
        const savings = totalReplaceCost - premiumCost;
        if (savings > 0) {
          consolidation.push({
            action: `Replace ${worn.length} worn ${key.replace("_", " ")} tools with 1 premium`,
            tools_affected: worn.map((t) => t.id),
            estimated_savings: Math.round(savings * 100) / 100,
            rationale: `${worn.length} tools at <50% life. Premium tool costs $${premiumCost.toFixed(2)} vs $${totalReplaceCost.toFixed(2)} replacing all individually.`,
          });
        }
      }
    }

    const needing = toolResults.filter((t) => t.needs_replacement);
    const totalReplacementCost = needing.reduce(
      (s, t) => s + t.scheduled_replacement_cost, 0,
    );
    const totalUnplannedRisk = needing.reduce(
      (s, t) => s + t.unplanned_break_cost, 0,
    );

    return {
      tools: toolResults,
      consolidation_suggestions: consolidation,
      summary: {
        total_tools: tools.length,
        needing_replacement: needing.length,
        total_replacement_cost: Math.round(totalReplacementCost * 100) / 100,
        total_unplanned_risk_cost: Math.round(totalUnplannedRisk * 100) / 100,
        net_savings_from_scheduling: Math.round(
          (totalUnplannedRisk - totalReplacementCost) * 100,
        ) / 100,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // analyzeCostDrivers — ABC / Pareto analysis
  // ════════════════════════════════════════════════════════════════════

  analyzeCostDrivers(input: CostDriverInput): CostDriverResult {
    const { jobs } = input;

    if (!jobs || jobs.length === 0) {
      return {
        pareto: [],
        per_part: [],
        recommendations: ["No job data provided."],
        summary: {
          total_cost: 0,
          num_parts: 0,
          avg_cost_per_unit: 0,
          class_a_categories: [],
        },
      };
    }

    // Aggregate cost categories across all jobs
    const categories = [
      "material_cost", "tool_cost", "labor_cost", "setup_cost",
      "overhead", "scrap_cost", "rework_cost",
    ] as const;

    const categoryTotals: Record<string, number> = {};
    for (const cat of categories) {
      categoryTotals[cat] = 0;
    }
    let totalCost = 0;
    let totalQty = 0;

    for (const job of jobs) {
      for (const cat of categories) {
        const val = (job as any)[cat] ?? 0;
        categoryTotals[cat] += val;
        totalCost += val;
      }
      totalQty += job.quantity;
    }

    // Sort descending by cost
    const sorted = Object.entries(categoryTotals)
      .map(([cat, cost]) => ({ category: cat, total_cost: cost }))
      .sort((a, b) => b.total_cost - a.total_cost);

    let cumPct = 0;
    const pareto = sorted.map((item) => {
      const pct = totalCost > 0 ? (item.total_cost / totalCost) * 100 : 0;
      cumPct += pct;
      let abc: "A" | "B" | "C" = "C";
      if (cumPct <= 80) abc = "A";
      else if (cumPct <= 95) abc = "B";
      return {
        category: item.category,
        total_cost: Math.round(item.total_cost * 100) / 100,
        pct_of_total: Math.round(pct * 10) / 10,
        cumulative_pct: Math.round(cumPct * 10) / 10,
        abc_class: abc,
      };
    });

    // Per-part breakdown
    const perPart = jobs.map((job) => {
      let jobTotal = 0;
      let topDriver = "";
      let topVal = 0;
      for (const cat of categories) {
        const val = (job as any)[cat] ?? 0;
        jobTotal += val;
        if (val > topVal) {
          topVal = val;
          topDriver = cat;
        }
      }
      return {
        part: job.part,
        total_cost: Math.round(jobTotal * 100) / 100,
        cost_per_unit:
          job.quantity > 0
            ? Math.round((jobTotal / job.quantity) * 100) / 100
            : 0,
        top_driver: topDriver,
        top_driver_pct:
          jobTotal > 0 ? Math.round((topVal / jobTotal) * 1000) / 10 : 0,
      };
    });

    // Generate recommendations
    const recommendations: string[] = [];
    const classA = pareto.filter((p) => p.abc_class === "A");

    for (const item of classA) {
      switch (item.category) {
        case "setup_cost":
          recommendations.push(
            `Setup costs are ${item.pct_of_total.toFixed(1)}% of total — consider fixture standardization or quick-change tooling.`,
          );
          break;
        case "material_cost":
          recommendations.push(
            `Material costs are ${item.pct_of_total.toFixed(1)}% of total — explore bulk purchasing, near-net-shape blanks, or material substitution.`,
          );
          break;
        case "labor_cost":
          recommendations.push(
            `Labor costs are ${item.pct_of_total.toFixed(1)}% of total — evaluate automation or lights-out machining for high-volume parts.`,
          );
          break;
        case "tool_cost":
          recommendations.push(
            `Tool costs are ${item.pct_of_total.toFixed(1)}% of total — review tool life optimization, regrind programs, or premium tooling with longer life.`,
          );
          break;
        case "scrap_cost":
          recommendations.push(
            `Scrap costs are ${item.pct_of_total.toFixed(1)}% of total — investigate root causes (tool wear, fixturing, material variability).`,
          );
          break;
        case "rework_cost":
          recommendations.push(
            `Rework costs are ${item.pct_of_total.toFixed(1)}% of total — implement in-process inspection or SPC to catch issues earlier.`,
          );
          break;
        case "overhead":
          recommendations.push(
            `Overhead is ${item.pct_of_total.toFixed(1)}% of total — review allocation method and identify reduction opportunities.`,
          );
          break;
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("Costs are well-distributed across categories — no single dominant driver.");
    }

    // Cap at 3 recommendations
    const topRecs = recommendations.slice(0, 3);

    return {
      pareto,
      per_part: perPart,
      recommendations: topRecs,
      summary: {
        total_cost: Math.round(totalCost * 100) / 100,
        num_parts: jobs.length,
        avg_cost_per_unit:
          totalQty > 0 ? Math.round((totalCost / totalQty) * 100) / 100 : 0,
        class_a_categories: classA.map((p) => p.category),
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // analyzeBatchPurchasing — material procurement optimization
  // ════════════════════════════════════════════════════════════════════

  analyzeBatchPurchasing(input: BatchPurchasingInput): BatchPurchasingResult {
    const {
      materials,
      storage_cost_per_kg_month = 0.5,
    } = input;

    if (!materials || materials.length === 0) {
      return {
        materials: [],
        summary: {
          total_annual_material_cost: 0,
          total_annual_savings: 0,
          total_storage_cost: 0,
          net_savings: 0,
          recommendation: "No materials provided.",
        },
      };
    }

    const matResults = materials.map((m) => {
      const annualUsage = m.monthly_usage_kg * 12;
      const annualCostNoBulk = annualUsage * m.price_per_kg;

      // EOQ for materials: S = fixed ordering cost (estimate: $50 per order)
      const orderingCost = 50;
      const H = storage_cost_per_kg_month * 12; // annual holding cost per kg
      let eoq: number;
      if (annualUsage <= 0 || H <= 0) {
        eoq = m.min_order_kg ?? 1;
      } else {
        eoq = Math.sqrt((2 * annualUsage * orderingCost) / H);
      }
      eoq = Math.max(eoq, m.min_order_kg ?? 1);
      eoq = Math.round(eoq);

      // Reorder point: daily usage × lead time + safety stock (1 week)
      const dailyUsage = m.monthly_usage_kg / 30;
      const reorderPoint = dailyUsage * m.lead_time_days + dailyUsage * 7;

      // Find best bulk discount tier
      let bestDiscountPct = 0;
      let bestTier = "none";
      let effectivePrice = m.price_per_kg;

      if (m.bulk_discount && m.bulk_discount.length > 0) {
        // Sort discounts by qty ascending
        const sortedDiscounts = [...m.bulk_discount].sort(
          (a, b) => a.qty_kg - b.qty_kg,
        );
        for (const tier of sortedDiscounts) {
          if (eoq >= tier.qty_kg && tier.discount_pct > bestDiscountPct) {
            bestDiscountPct = tier.discount_pct;
            bestTier = `${tier.qty_kg}kg @ ${tier.discount_pct}% off`;
          }
        }
        // Check if increasing order to next discount tier saves money
        for (const tier of sortedDiscounts) {
          if (eoq < tier.qty_kg) {
            const tierPrice = m.price_per_kg * (1 - tier.discount_pct / 100);
            const annualCostAtTier = annualUsage * tierPrice;
            const extraStorage =
              ((tier.qty_kg - eoq) / 2) * storage_cost_per_kg_month * 12;
            const annualCostWithBulk = annualCostAtTier + extraStorage;
            if (annualCostWithBulk < annualCostNoBulk) {
              eoq = tier.qty_kg;
              bestDiscountPct = tier.discount_pct;
              bestTier = `${tier.qty_kg}kg @ ${tier.discount_pct}% off`;
            }
            break; // only check next tier up
          }
        }
        effectivePrice = m.price_per_kg * (1 - bestDiscountPct / 100);
      }

      const annualCostWithBulk = annualUsage * effectivePrice;
      const ordersPerYear = annualUsage > 0 ? Math.ceil(annualUsage / eoq) : 0;
      const avgInventoryKg = eoq / 2;
      const storageCostAnnual = avgInventoryKg * storage_cost_per_kg_month * 12;

      return {
        name: m.name,
        optimal_order_qty_kg: eoq,
        reorder_point_kg: Math.round(reorderPoint * 10) / 10,
        orders_per_year: ordersPerYear,
        annual_cost_no_bulk: Math.round(annualCostNoBulk * 100) / 100,
        annual_cost_with_bulk: Math.round(annualCostWithBulk * 100) / 100,
        annual_savings: Math.round((annualCostNoBulk - annualCostWithBulk) * 100) / 100,
        storage_cost_annual: Math.round(storageCostAnnual * 100) / 100,
        best_discount_tier: bestTier,
      };
    });

    const totalAnnualCost = matResults.reduce((s, m) => s + m.annual_cost_with_bulk, 0);
    const totalSavings = matResults.reduce((s, m) => s + m.annual_savings, 0);
    const totalStorage = matResults.reduce((s, m) => s + m.storage_cost_annual, 0);
    const netSavings = totalSavings - totalStorage;

    let recommendation = "Material procurement is already efficient.";
    if (netSavings > 1000) {
      recommendation = `Bulk purchasing can save $${netSavings.toFixed(0)}/year net of storage costs. Consider consolidating orders.`;
    } else if (netSavings > 0) {
      recommendation = `Minor savings of $${netSavings.toFixed(0)}/year possible through bulk purchasing.`;
    } else if (netSavings < 0) {
      recommendation = "Bulk discounts do not offset storage costs — buy in smaller lots.";
    }

    return {
      materials: matResults,
      summary: {
        total_annual_material_cost: Math.round(totalAnnualCost * 100) / 100,
        total_annual_savings: Math.round(totalSavings * 100) / 100,
        total_storage_cost: Math.round(totalStorage * 100) / 100,
        net_savings: Math.round(netSavings * 100) / 100,
        recommendation,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // getPartFamilyReport — full economic analysis
  // ════════════════════════════════════════════════════════════════════

  getPartFamilyReport(input: PartFamilyReportInput): PartFamilyReportResult {
    const lotSize = input.lot_size
      ? this.analyzeLotSize(input.lot_size)
      : undefined;
    const toolRotation = input.tool_rotation
      ? this.analyzeToolRotation(input.tool_rotation)
      : undefined;
    const costDrivers = input.cost_drivers
      ? this.analyzeCostDrivers(input.cost_drivers)
      : undefined;
    const purchasing = input.purchasing
      ? this.analyzeBatchPurchasing(input.purchasing)
      : undefined;

    // Aggregate total annual cost
    let totalAnnualCost = 0;
    let totalParts = 0;
    const savings: Array<{ area: string; potential_savings: number; action: string }> = [];

    if (lotSize) {
      totalAnnualCost += lotSize.family_summary.total_annual_cost;
      totalParts += lotSize.parts.length;
      if (lotSize.family_summary.avg_setup_to_run_ratio > 0.25) {
        // Estimate 20% savings from setup optimization
        const setupSavings = lotSize.parts.reduce((s, p) => s + p.setup_cost * p.annual_setups * 0.2, 0);
        savings.push({
          area: "Setup optimization",
          potential_savings: Math.round(setupSavings * 100) / 100,
          action: lotSize.family_summary.recommendation,
        });
      }
    }

    if (toolRotation) {
      savings.push({
        area: "Tool rotation scheduling",
        potential_savings: toolRotation.summary.net_savings_from_scheduling,
        action: `Schedule replacement for ${toolRotation.summary.needing_replacement} tools to avoid unplanned breaks.`,
      });
      for (const c of toolRotation.consolidation_suggestions) {
        savings.push({
          area: "Tool consolidation",
          potential_savings: c.estimated_savings,
          action: c.action,
        });
      }
    }

    if (costDrivers) {
      totalAnnualCost += costDrivers.summary.total_cost;
      totalParts += costDrivers.summary.num_parts;
      for (const rec of costDrivers.recommendations) {
        savings.push({
          area: "Cost driver reduction",
          potential_savings: 0, // qualitative
          action: rec,
        });
      }
    }

    if (purchasing) {
      totalAnnualCost += purchasing.summary.total_annual_material_cost;
      if (purchasing.summary.net_savings > 0) {
        savings.push({
          area: "Bulk purchasing",
          potential_savings: purchasing.summary.net_savings,
          action: purchasing.summary.recommendation,
        });
      }
    }

    // Sort savings by potential and take top 3
    savings.sort((a, b) => b.potential_savings - a.potential_savings);
    const top3 = savings.slice(0, 3);

    const avgCostPerPart =
      totalParts > 0 ? Math.round((totalAnnualCost / totalParts) * 100) / 100 : 0;

    return {
      lot_size: lotSize,
      tool_rotation: toolRotation,
      cost_drivers: costDrivers,
      purchasing,
      executive_summary: {
        total_annual_cost: Math.round(totalAnnualCost * 100) / 100,
        cost_per_part_family_avg: avgCostPerPart,
        top_savings_opportunities: top3,
      },
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const partFamilyEconomicsEngine = new PartFamilyEconomicsEngine();
export default partFamilyEconomicsEngine;
