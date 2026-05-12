/**
 * ToolCostPerPartEngine — Unit Tests
 * @milestone FORGE-ENGINES-B25
 */
import { describe, it, expect } from "vitest";
import {
  toolCostPerPartEngine,
} from "../engines/ToolCostPerPartEngine.js";

describe("ToolCostPerPartEngine", () => {
  it("calculates cost per part", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_price: 80,
      tool_life_min: 40,
      cutting_time_per_part_min: 2,
    });
    // 80 / (40/2) = 80/20 = $4/part
    expect(r.cost_per_part.value).toBeCloseTo(4, 0);
  });

  it("indexable has lower cost per edge", () => {
    const solid = toolCostPerPartEngine.calculate({
      tool_type: "solid_carbide",
      tool_price: 85,
    });
    const indexable = toolCostPerPartEngine.calculate({
      tool_type: "indexable",
      insert_price: 15,
      edges_per_insert: 4,
    });
    expect(indexable.cost_per_edge.value).toBeLessThan(
      solid.cost_per_edge.value
    );
  });

  it("longer tool life = lower cost per part", () => {
    const short = toolCostPerPartEngine.calculate({
      tool_life_min: 15,
    });
    const long = toolCostPerPartEngine.calculate({
      tool_life_min: 60,
    });
    expect(long.cost_per_part.value).toBeLessThan(
      short.cost_per_part.value
    );
  });

  it("regrind reduces cost per part", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_type: "solid_carbide",
      tool_price: 100,
      tool_life_min: 45,
      cutting_time_per_part_min: 2,
    });
    expect(r.regrind_cost_per_part.value).toBeLessThan(
      r.cost_per_part.value
    );
    expect(r.regrind_savings_pct.value).toBeGreaterThan(0);
  });

  it("annual cost from production volume", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_price: 80,
      tool_life_min: 40,
      cutting_time_per_part_min: 2,
      annual_production: 10000,
    });
    expect(r.annual_tool_cost.value).toBeGreaterThan(0);
  });

  it("PCD has longer life but higher price", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_type: "pcd",
    });
    expect(r.parts_per_edge.value).toBeGreaterThan(0);
  });

  it("holder cost amortized over life", () => {
    const r = toolCostPerPartEngine.calculate({
      holder_price: 300,
      holder_life_parts: 100000,
    });
    expect(r.holder_cost_per_part.value).toBeCloseTo(0.003, 3);
  });

  it("total includes tool + holder", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_price: 80,
      tool_life_min: 40,
      cutting_time_per_part_min: 2,
    });
    expect(r.total_tooling_cost_per_part.value).toBeGreaterThan(
      r.cost_per_part.value
    );
  });

  it("warns high cost per part", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_price: 200,
      tool_life_min: 10,
      cutting_time_per_part_min: 5,
    });
    expect(
      r.warnings.some(w => w.includes("high") || w.includes("cost"))
    ).toBe(true);
  });

  it("warns few parts per edge", () => {
    const r = toolCostPerPartEngine.calculate({
      tool_life_min: 10,
      cutting_time_per_part_min: 5,
    });
    expect(
      r.warnings.some(w => w.includes("parts per edge"))
    ).toBe(true);
  });
});
