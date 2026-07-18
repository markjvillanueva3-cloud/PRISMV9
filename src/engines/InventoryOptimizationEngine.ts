/**
 * PRISM MCP Server — Inventory Optimization Engine
 *
 * Tool/material inventory optimization for manufacturing shops:
 * EOQ, safety stock, ABC classification, and tool inventory analysis.
 *
 * Ported from PRISM_INVENTORY_ENGINE.js (monolith R2.3.1).
 *
 * @module InventoryOptimizationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EOQInput {
  annual_demand: number;
  order_cost: number;
  holding_cost_per_unit: number;
}

/** E O Q Result configuration/data structure.
 */
export interface EOQResult {
  eoq: number;
  orders_per_year: number;
  order_interval_days: number;
  costs: {
    total_annual: number;
    ordering: number;
    holding: number;
  };
}

/** Safety Stock Input configuration/data structure.
 */
export interface SafetyStockInput {
  avg_demand: number;
  demand_std_dev: number;
  avg_lead_time: number;
  lead_time_std_dev?: number;
  service_level?: number;
}

/** Safety Stock Result configuration/data structure.
 */
export interface SafetyStockResult {
  safety_stock: number;
  reorder_point: number;
  service_level: number;
  formula: string;
}

/** A B C Item configuration/data structure.
 */
export interface ABCItem {
  id: string;
  name?: string;
  annual_usage: number;
  unit_cost: number;
}

/** Classified Item configuration/data structure.
 */
export interface ClassifiedItem extends ABCItem {
  annual_value: number;
  percent_of_value: number;
  cumulative_percent: number;
  classification: "A" | "B" | "C";
}

/** A B C Result configuration/data structure.
 */
export interface ABCResult {
  items: ClassifiedItem[];
  summary: Record<"A" | "B" | "C", { count: number; percent_items: number; percent_value: number }>;
}

/** Tool Inventory Item configuration/data structure.
 */
export interface ToolInventoryItem {
  id: string;
  name?: string;
  annual_usage: number;
  unit_cost: number;
  order_cost?: number;
  demand_variability?: number;
  lead_time_weeks?: number;
}

/** Tool Optimization Result configuration/data structure.
 */
export interface ToolOptimizationResult {
  tool: string;
  eoq: number;
  safety_stock: number;
  reorder_point: number;
  min_stock: number;
  max_stock: number;
}

// ============================================================================
// Z-SCORE TABLE
// ============================================================================

// Canonical z-scores (Φ⁻¹) to 4 sig figs. Ref: NIST Engineering Statistics Handbook
const Z_SCORES: Record<number, number> = {
  0.80: 0.8416, 0.85: 1.0364, 0.90: 1.2816, 0.95: 1.6449,
  0.97: 1.8808, 0.98: 2.0537, 0.99: 2.3263, 0.999: 3.0902,
};

function getZScore(serviceLevel: number): number {
  if (Z_SCORES[serviceLevel] !== undefined) return Z_SCORES[serviceLevel];
  // Linear interpolation between nearest known values
  const keys = Object.keys(Z_SCORES).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (serviceLevel >= keys[i] && serviceLevel <= keys[i + 1]) {
      const t = (serviceLevel - keys[i]) / (keys[i + 1] - keys[i]);
      return Z_SCORES[keys[i]] + t * (Z_SCORES[keys[i + 1]] - Z_SCORES[keys[i]]);
    }
  }
  return 1.65; // default 95%
}

// ============================================================================
// ENGINE
// ============================================================================

class InventoryOptimizationEngineImpl {

  /**
   * Economic Order Quantity — optimal batch size minimizing total inventory cost
   */
  calculateEOQ(input: EOQInput): EOQResult {
    const { annual_demand, order_cost, holding_cost_per_unit } = input;
    if (holding_cost_per_unit <= 0) {
      return { eoq: annual_demand, orders_per_year: 1, order_interval_days: 365, costs: { total_annual: order_cost, ordering: order_cost, holding: 0 } };
    }
    const eoq = Math.sqrt((2 * annual_demand * order_cost) / holding_cost_per_unit);
    const ordersPerYear = annual_demand / eoq;
    const totalOrderCost = ordersPerYear * order_cost;
    const avgInventory = eoq / 2;
    const totalHoldingCost = avgInventory * holding_cost_per_unit;

    return {
      eoq: Math.round(eoq),
      orders_per_year: Math.round(ordersPerYear * 10) / 10,
      order_interval_days: Math.round(365 / ordersPerYear),
      costs: {
        total_annual: Math.round((totalOrderCost + totalHoldingCost) * 100) / 100,
        ordering: Math.round(totalOrderCost * 100) / 100,
        holding: Math.round(totalHoldingCost * 100) / 100,
      },
    };
  }

  /**
   * Safety stock — protects against demand + lead time variability
   */
  calculateSafetyStock(input: SafetyStockInput): SafetyStockResult {
    const {
      avg_demand, demand_std_dev, avg_lead_time,
      lead_time_std_dev = 0, service_level = 0.95,
    } = input;

    const z = getZScore(service_level);

    // Combined std dev: √(LT × σd² + d² × σLT²)
    const demandVar = Math.sqrt(avg_lead_time) * demand_std_dev;
    const ltVar = avg_demand * lead_time_std_dev;
    const combined = Math.sqrt(demandVar ** 2 + ltVar ** 2);
    const safetyStock = z * combined;

    return {
      safety_stock: Math.ceil(safetyStock),
      reorder_point: Math.ceil(avg_demand * avg_lead_time + safetyStock),
      service_level,
      formula: "SS = Z × √(LT × σd² + d² × σLT²)",
    };
  }

  /**
   * ABC classification — Pareto analysis by annual value
   */
  classifyABC(items: ABCItem[]): ABCResult {
    const withValue = items.map(item => ({
      ...item,
      annual_value: (item.annual_usage ?? 0) * (item.unit_cost ?? 0),
    }));

    withValue.sort((a, b) => b.annual_value - a.annual_value);
    const totalValue = withValue.reduce((s, i) => s + i.annual_value, 0);
    if (totalValue === 0) {
      return {
        items: withValue.map(i => ({ ...i, percent_of_value: 0, cumulative_percent: 0, classification: "C" as const })),
        summary: { A: { count: 0, percent_items: 0, percent_value: 0 }, B: { count: 0, percent_items: 0, percent_value: 0 }, C: { count: items.length, percent_items: 100, percent_value: 0 } },
      };
    }

    let cumPct = 0;
    const summary = { A: { count: 0, value: 0 }, B: { count: 0, value: 0 }, C: { count: 0, value: 0 } };

    const classified: ClassifiedItem[] = withValue.map(item => {
      const pct = item.annual_value / totalValue;
      cumPct += pct;
      const cls: "A" | "B" | "C" = cumPct <= 0.80 ? "A" : cumPct <= 0.95 ? "B" : "C";
      summary[cls].count++;
      summary[cls].value += item.annual_value;
      return {
        ...item,
        percent_of_value: Math.round(pct * 1000) / 10,
        cumulative_percent: Math.round(cumPct * 1000) / 10,
        classification: cls,
      };
    });

    return {
      items: classified,
      summary: {
        A: { count: summary.A.count, percent_items: Math.round((summary.A.count / items.length) * 1000) / 10, percent_value: Math.round((summary.A.value / totalValue) * 1000) / 10 },
        B: { count: summary.B.count, percent_items: Math.round((summary.B.count / items.length) * 1000) / 10, percent_value: Math.round((summary.B.value / totalValue) * 1000) / 10 },
        C: { count: summary.C.count, percent_items: Math.round((summary.C.count / items.length) * 1000) / 10, percent_value: Math.round((summary.C.value / totalValue) * 1000) / 10 },
      },
    };
  }

  /**
   * Tool inventory optimization — combines EOQ + safety stock per tool
   */
  optimizeToolInventory(tools: ToolInventoryItem[]): ToolOptimizationResult[] {
    return tools.map(tool => {
      // U-BIZREG3: Enrich unit_cost from ToolRegistry if tool has catalog_number
      let unitCost = tool.unit_cost;
      if (unitCost <= 0 && (tool as any).catalog_number) {
        try {
          const registry = require("../registries/ToolRegistry.js").toolRegistry;
          const found = registry.getByIdOrCatalog?.((tool as any).catalog_number)
            ?? registry.getByCatalogNumber?.((tool as any).catalog_number);
          if (found?.price && found.price > 0) unitCost = found.price;
        } catch { /* registry not available */ }
      }

      const eoq = this.calculateEOQ({
        annual_demand: tool.annual_usage,
        order_cost: tool.order_cost ?? 25,
        holding_cost_per_unit: (unitCost > 0 ? unitCost : tool.unit_cost) * 0.25,
      });

      const weeklyDemand = tool.annual_usage / 52;
      const safety = this.calculateSafetyStock({
        avg_demand: weeklyDemand,
        demand_std_dev: (tool.demand_variability ?? tool.annual_usage * 0.1) / 52,
        avg_lead_time: tool.lead_time_weeks ?? 2,
      });

      return {
        tool: tool.name ?? tool.id,
        eoq: eoq.eoq,
        safety_stock: safety.safety_stock,
        reorder_point: safety.reorder_point,
        min_stock: safety.safety_stock,
        max_stock: eoq.eoq + safety.safety_stock,
      };
    });
  }
}

/** Inventory Optimization Engine constant.
 */
export const inventoryOptimizationEngine = new InventoryOptimizationEngineImpl();
