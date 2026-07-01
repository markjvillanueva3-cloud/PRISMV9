import { describe, it, expect } from "vitest";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS, threeViewPricingSchema } from "../schemas/quotingActionSchemas.js";
import { threeViewPricingEngine } from "../engines/ThreeViewPricingEngine.js";

describe("three_view_pricing dispatcher round-trip", () => {
  it("action is in the enum + schema map (wiring complete)", () => {
    expect(quotingActionEnum.options).toContain("three_view_pricing");
    expect(QUOTING_ACTION_SCHEMAS["three_view_pricing"]).toBe(threeViewPricingSchema);
  });
  it("schema validates params then engine produces a 3-view result", () => {
    const params = { material: "tool_steel_a2", process: "mill", machine_hours_per_part: 2, quantity: 10, material_cost_per_lb_override: 5, material_lb_per_part: 1 };
    const parsed = QUOTING_ACTION_SCHEMAS["three_view_pricing"].safeParse(params);
    expect(parsed.success).toBe(true);
    const result = threeViewPricingEngine.price(parsed.data as any);
    expect(result.ok).toBe(true);
    expect(result.views.map((v: any) => v.key).sort()).toEqual(["cost_floor", "current", "optimal"]);
    expect(result.headline.advisory).toBe(false);
    expect(result.improvement.length).toBeGreaterThanOrEqual(1);
  });
  it("schema rejects an invalid action payload", () => {
    const parsed = QUOTING_ACTION_SCHEMAS["three_view_pricing"].safeParse({ material: "x", process: "mill", machine_hours_per_part: -1, quantity: 1 });
    expect(parsed.success).toBe(false);
  });
});
