import { describe, expect, it } from "vitest";

import { toolROIEngine } from "../engines/ToolROIEngine.js";

describe("ToolROIEngine", () => {
  it("returns tiered recommendations plus annual savings for a milling feature", () => {
    const result = toolROIEngine.calculate({
      feature: {
        type: "pocket",
        dimensions: { width_mm: 12.7, depth_mm: 6, length_mm: 40 },
        tolerance_mm: 0.05,
        surface_finish_Ra: 3.2,
      },
      material: {
        iso_group: "P",
        name: "4140 Steel",
      },
      machine: {
        max_rpm: 12000,
        max_power_kw: 22,
        machine_rate_per_hour: 110,
      },
      current_tool: {
        id: "current-rougher",
        name: "0.5 in rougher",
        price: 72,
        condition: "worn",
      },
      user_inventory: [
        {
          id: "inv-endmill-1",
          name: "0.5 in variable-helix end mill",
          type: "endmill",
          diameter_mm: 12.7,
          flutes: 5,
          material: "carbide",
          coating: "AlTiN",
          condition: "good",
          price: 68,
        },
      ],
      optimization_goal: "balanced",
    });

    expect(result.crib_recommendation).not.toBeNull();
    expect(result.budget_recommendation.tool.name).toContain("Economy");
    expect(result.standard_recommendation.tool.name).toContain("Performance");
    expect(result.premium_recommendation.tool.name).toContain("Premium");
    expect(result.total_cost_breakdown.best_total_per_part.value).toBeGreaterThan(0);
    expect(result.total_cost_breakdown.annual_savings.value).toBeGreaterThanOrEqual(0);
  });
});
