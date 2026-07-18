/**
 * PartFamilyEconomicsEngine — 20 tests
 * Covers: EOQ lot sizing, tool rotation, ABC cost drivers,
 *         batch purchasing, full report, edge cases.
 */
import { describe, it, expect } from "vitest";
import {
  partFamilyEconomicsEngine as engine,
  type LotSizeInput,
  type ToolRotationInput,
  type CostDriverInput,
  type BatchPurchasingInput,
} from "../engines/PartFamilyEconomicsEngine.js";

// ═══════════════════════════════════════════════════════════════════
// analyzeLotSize
// ═══════════════════════════════════════════════════════════════════

describe("analyzeLotSize", () => {
  const baseParts: LotSizeInput = {
    parts: [
      {
        name: "Bracket-A",
        annual_demand: 1000,
        setup_time_min: 30,
        cycle_time_min: 5,
        material_cost_per_unit: 2.0,
      },
      {
        name: "Bracket-B",
        annual_demand: 500,
        setup_time_min: 45,
        cycle_time_min: 8,
        material_cost_per_unit: 3.5,
      },
    ],
    machine_rate_per_hour: 120,
    operator_rate_per_hour: 40,
  };

  it("computes EOQ using Wilson formula", () => {
    const result = engine.analyzeLotSize(baseParts);
    expect(result.parts).toHaveLength(2);

    const bracketA = result.parts[0];
    // Manual: D=1000, S=(30/60)*160=$80, unit_cost=2+(5/60)*160=$15.33,
    // H=15.33*0.25=3.833, EOQ=sqrt(2*1000*80/3.833)=sqrt(41739)=~204
    expect(bracketA.eoq).toBeGreaterThan(100);
    expect(bracketA.eoq).toBeLessThan(400);
    expect(bracketA.optimal_batch_size).toBe(bracketA.eoq);
  });

  it("returns cost-per-part at standard lot sizes", () => {
    const result = engine.analyzeLotSize(baseParts);
    const cpp = result.parts[0].cost_per_part_at_lot;
    expect(cpp).toHaveProperty("lot_1");
    expect(cpp).toHaveProperty("lot_100");
    // Cost per part should decrease as lot size increases (setup amortization)
    expect(cpp.lot_1).toBeGreaterThan(cpp.lot_100);
  });

  it("computes setup-to-run ratio", () => {
    const result = engine.analyzeLotSize(baseParts);
    for (const p of result.parts) {
      expect(p.setup_to_run_ratio).toBeGreaterThanOrEqual(0);
      expect(p.setup_to_run_ratio).toBeLessThan(10); // sanity
    }
  });

  it("provides family summary with recommendation", () => {
    const result = engine.analyzeLotSize(baseParts);
    expect(result.family_summary.total_annual_cost).toBeGreaterThan(0);
    expect(result.family_summary.total_annual_setups).toBeGreaterThan(0);
    expect(typeof result.family_summary.recommendation).toBe("string");
    expect(result.family_summary.recommendation.length).toBeGreaterThan(0);
  });

  it("handles empty parts array", () => {
    const result = engine.analyzeLotSize({
      parts: [],
      machine_rate_per_hour: 100,
    });
    expect(result.parts).toHaveLength(0);
    expect(result.family_summary.total_annual_cost).toBe(0);
  });

  it("handles zero demand gracefully", () => {
    const result = engine.analyzeLotSize({
      parts: [
        {
          name: "Dead-Part",
          annual_demand: 0,
          setup_time_min: 30,
          cycle_time_min: 5,
          material_cost_per_unit: 2,
        },
      ],
      machine_rate_per_hour: 100,
    });
    expect(result.parts[0].eoq).toBe(1);
    // With zero demand, production cost is 0 but there's minimal holding cost
    expect(result.parts[0].total_annual_cost).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// analyzeToolRotation
// ═══════════════════════════════════════════════════════════════════

describe("analyzeToolRotation", () => {
  const baseInput: ToolRotationInput = {
    tools: [
      {
        id: "EM10-001",
        type: "endmill",
        diameter: 10,
        cost: 45,
        tool_life_min: 120,
        parts_per_life: 200,
      },
      {
        id: "EM10-002",
        type: "endmill",
        diameter: 10,
        cost: 45,
        tool_life_min: 120,
        parts_per_life: 200,
        last_replaced: "2020-01-01", // very old — should be expired
      },
      {
        id: "DR8-001",
        type: "drill",
        diameter: 8,
        cost: 25,
        tool_life_min: 90,
        parts_per_life: 300,
      },
    ],
    upcoming_jobs: [
      { part: "Bracket-A", quantity: 150, tools_needed: ["EM10-001", "DR8-001"] },
      { part: "Bracket-B", quantity: 100, tools_needed: ["EM10-002", "DR8-001"] },
    ],
  };

  it("detects expired tools as needing replacement", () => {
    const result = engine.analyzeToolRotation(baseInput);
    const expired = result.tools.find((t) => t.id === "EM10-002");
    expect(expired).toBeDefined();
    expect(expired!.remaining_life_pct).toBe(0);
    expect(expired!.replacement_urgency).toBe("immediate");
  });

  it("computes upcoming demand per tool", () => {
    const result = engine.analyzeToolRotation(baseInput);
    const drill = result.tools.find((t) => t.id === "DR8-001");
    expect(drill).toBeDefined();
    // 150 + 100 = 250 parts
    expect(drill!.upcoming_demand_parts).toBe(250);
  });

  it("calculates savings from scheduled vs unplanned replacement", () => {
    const result = engine.analyzeToolRotation(baseInput);
    for (const t of result.tools) {
      expect(t.unplanned_break_cost).toBeGreaterThan(t.scheduled_replacement_cost);
      expect(t.savings_from_scheduling).toBeGreaterThan(0);
    }
  });

  it("suggests consolidation for multiple worn same-type tools", () => {
    // Both EM10 tools at <50% life
    const input: ToolRotationInput = {
      tools: [
        { id: "EM10-A", type: "endmill", diameter: 10, cost: 40,
          tool_life_min: 100, parts_per_life: 200, last_replaced: "2020-01-01" },
        { id: "EM10-B", type: "endmill", diameter: 10, cost: 40,
          tool_life_min: 100, parts_per_life: 200, last_replaced: "2020-01-01" },
      ],
      upcoming_jobs: [],
    };
    const result = engine.analyzeToolRotation(input);
    expect(result.consolidation_suggestions.length).toBeGreaterThanOrEqual(1);
    expect(result.consolidation_suggestions[0].tools_affected).toContain("EM10-A");
    expect(result.consolidation_suggestions[0].tools_affected).toContain("EM10-B");
  });

  it("handles empty tools array", () => {
    const result = engine.analyzeToolRotation({ tools: [], upcoming_jobs: [] });
    expect(result.tools).toHaveLength(0);
    expect(result.summary.total_tools).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// analyzeCostDrivers
// ═══════════════════════════════════════════════════════════════════

describe("analyzeCostDrivers", () => {
  const baseInput: CostDriverInput = {
    jobs: [
      {
        part: "Bracket-A", quantity: 100,
        material_cost: 500, tool_cost: 200, labor_cost: 800,
        setup_cost: 1500, overhead: 300, scrap_cost: 50, rework_cost: 30,
      },
      {
        part: "Bracket-B", quantity: 50,
        material_cost: 400, tool_cost: 150, labor_cost: 600,
        setup_cost: 1200, overhead: 200, scrap_cost: 80, rework_cost: 60,
      },
    ],
  };

  it("produces Pareto ordering with cumulative percentages", () => {
    const result = engine.analyzeCostDrivers(baseInput);
    expect(result.pareto.length).toBe(7); // 7 cost categories
    // Should be sorted descending by cost
    for (let i = 1; i < result.pareto.length; i++) {
      expect(result.pareto[i].total_cost).toBeLessThanOrEqual(
        result.pareto[i - 1].total_cost,
      );
    }
    // Last cumulative should be ~100%
    const last = result.pareto[result.pareto.length - 1];
    expect(last.cumulative_pct).toBeGreaterThan(99);
    expect(last.cumulative_pct).toBeLessThanOrEqual(100.1);
  });

  it("assigns ABC classes correctly (A=80%, B=95%, C=rest)", () => {
    const result = engine.analyzeCostDrivers(baseInput);
    const classA = result.pareto.filter((p) => p.abc_class === "A");
    const classACumPct = classA.reduce((s, p) => s + p.pct_of_total, 0);
    // Class A should cover up to ~80%
    expect(classACumPct).toBeLessThanOrEqual(85);
    expect(classA.length).toBeGreaterThan(0);
  });

  it("identifies setup_cost as top driver in this dataset", () => {
    const result = engine.analyzeCostDrivers(baseInput);
    // Setup cost = 1500 + 1200 = 2700, highest category
    expect(result.pareto[0].category).toBe("setup_cost");
    expect(result.summary.class_a_categories).toContain("setup_cost");
  });

  it("generates actionable recommendations", () => {
    const result = engine.analyzeCostDrivers(baseInput);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
    // Should mention setup since it's the top driver
    expect(result.recommendations[0].toLowerCase()).toContain("setup");
  });

  it("handles empty jobs array", () => {
    const result = engine.analyzeCostDrivers({ jobs: [] });
    expect(result.pareto).toHaveLength(0);
    expect(result.summary.total_cost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// analyzeBatchPurchasing
// ═══════════════════════════════════════════════════════════════════

describe("analyzeBatchPurchasing", () => {
  const baseInput: BatchPurchasingInput = {
    materials: [
      {
        name: "6061-T6 Aluminum",
        monthly_usage_kg: 500,
        price_per_kg: 8.5,
        lead_time_days: 14,
        bulk_discount: [
          { qty_kg: 1000, discount_pct: 5 },
          { qty_kg: 5000, discount_pct: 12 },
        ],
      },
      {
        name: "304 Stainless",
        monthly_usage_kg: 200,
        price_per_kg: 15,
        lead_time_days: 21,
        min_order_kg: 100,
      },
    ],
    storage_cost_per_kg_month: 0.3,
  };

  it("computes optimal order quantities", () => {
    const result = engine.analyzeBatchPurchasing(baseInput);
    expect(result.materials).toHaveLength(2);
    for (const m of result.materials) {
      expect(m.optimal_order_qty_kg).toBeGreaterThan(0);
      expect(m.reorder_point_kg).toBeGreaterThan(0);
      expect(m.orders_per_year).toBeGreaterThan(0);
    }
  });

  it("applies bulk discounts when beneficial", () => {
    const result = engine.analyzeBatchPurchasing(baseInput);
    const alu = result.materials.find((m) => m.name === "6061-T6 Aluminum");
    expect(alu).toBeDefined();
    // With 6000kg/yr usage and discounts at 1000/5000kg, should find savings
    expect(alu!.annual_savings).toBeGreaterThanOrEqual(0);
    expect(alu!.best_discount_tier).not.toBe("none");
  });

  it("respects minimum order quantities", () => {
    const result = engine.analyzeBatchPurchasing(baseInput);
    const ss = result.materials.find((m) => m.name === "304 Stainless");
    expect(ss).toBeDefined();
    expect(ss!.optimal_order_qty_kg).toBeGreaterThanOrEqual(100);
  });

  it("provides net savings accounting for storage", () => {
    const result = engine.analyzeBatchPurchasing(baseInput);
    expect(typeof result.summary.net_savings).toBe("number");
    expect(typeof result.summary.recommendation).toBe("string");
    expect(result.summary.total_storage_cost).toBeGreaterThanOrEqual(0);
  });

  it("handles empty materials array", () => {
    const result = engine.analyzeBatchPurchasing({ materials: [] });
    expect(result.materials).toHaveLength(0);
    expect(result.summary.total_annual_material_cost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getPartFamilyReport
// ═══════════════════════════════════════════════════════════════════

describe("getPartFamilyReport", () => {
  it("generates complete report with all sections", () => {
    const result = engine.getPartFamilyReport({
      lot_size: {
        parts: [
          { name: "P1", annual_demand: 500, setup_time_min: 20,
            cycle_time_min: 4, material_cost_per_unit: 3 },
        ],
        machine_rate_per_hour: 100,
      },
      tool_rotation: {
        tools: [
          { id: "T1", type: "endmill", diameter: 10, cost: 50,
            tool_life_min: 120, parts_per_life: 200 },
        ],
        upcoming_jobs: [
          { part: "P1", quantity: 100, tools_needed: ["T1"] },
        ],
      },
      cost_drivers: {
        jobs: [
          { part: "P1", quantity: 100, material_cost: 300, tool_cost: 100,
            labor_cost: 400, setup_cost: 200, overhead: 150,
            scrap_cost: 20, rework_cost: 10 },
        ],
      },
      purchasing: {
        materials: [
          { name: "Alu", monthly_usage_kg: 100, price_per_kg: 8,
            lead_time_days: 7 },
        ],
      },
    });

    expect(result.lot_size).toBeDefined();
    expect(result.tool_rotation).toBeDefined();
    expect(result.cost_drivers).toBeDefined();
    expect(result.purchasing).toBeDefined();
    expect(result.executive_summary.total_annual_cost).toBeGreaterThan(0);
    expect(result.executive_summary.top_savings_opportunities.length).toBeLessThanOrEqual(3);
  });

  it("works with only partial input", () => {
    const result = engine.getPartFamilyReport({
      lot_size: {
        parts: [
          { name: "P1", annual_demand: 200, setup_time_min: 15,
            cycle_time_min: 3, material_cost_per_unit: 5 },
        ],
        machine_rate_per_hour: 80,
      },
    });
    expect(result.lot_size).toBeDefined();
    expect(result.tool_rotation).toBeUndefined();
    expect(result.cost_drivers).toBeUndefined();
    expect(result.purchasing).toBeUndefined();
    expect(result.executive_summary.total_annual_cost).toBeGreaterThan(0);
  });

  it("handles single-part family", () => {
    const result = engine.getPartFamilyReport({
      lot_size: {
        parts: [
          { name: "Solo", annual_demand: 50, setup_time_min: 60,
            cycle_time_min: 10, material_cost_per_unit: 25 },
        ],
        machine_rate_per_hour: 150,
      },
    });
    expect(result.lot_size!.parts).toHaveLength(1);
    expect(result.executive_summary.cost_per_part_family_avg).toBeGreaterThan(0);
  });
});
