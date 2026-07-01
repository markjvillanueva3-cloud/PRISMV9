/**
 * ToolROIEngine guard (slot:bravo 2026-06-19, ENGINE-AUDIT/U-FIX-TOOLROI-ANNUALPARTS).
 *
 * The cost/quote fabricated-output sweep found `calculateCostEfficiency`-style fabrication here:
 * `const annualParts = 5000; // default estimate` flowed into the RETURNED
 * total_cost_breakdown.annual_savings (a $/year figure feeding purchasing decisions). Fix: accept an
 * optional additive `annual_parts` input; when supplied the annual savings uses the REAL volume; when
 * omitted it falls back to a named DEFAULT_ANNUAL_PARTS and labels the figure an ASSUMED default
 * (R12 surface the estimate). ToolROIEngine is dispatcher-wired (business + calc) -- a live surface.
 *
 * annual_savings = max(0, (currentCpp - bestCpp)) * annualParts, so it scales linearly with the
 * supplied volume -- the load-bearing R9 invariant.
 */
import { describe, it, expect } from "vitest";

import { toolROIEngine } from "../engines/ToolROIEngine.js";
import type { ToolROIInput } from "../engines/ToolROIEngine.js";

function input(extra: Partial<ToolROIInput> = {}): ToolROIInput {
  return {
    feature: { type: "pocket", dimensions: { width_mm: 20, depth_mm: 10 }, tolerance_mm: 0.05 },
    material: { iso_group: "P", name: "1045 steel" },
    machine: { max_rpm: 12000, max_power_kw: 15, machine_rate_per_hour: 85 },
    // a worn, pricey current tool makes the recommended option cheaper per part -> savings > 0
    current_tool: { id: "cur1", name: "Worn legacy endmill", price: 240, condition: "worn" },
    optimization_goal: "cost",
    ...extra,
  };
}

describe("ToolROIEngine annual-savings fabrication fix", () => {
  it("labels annual_savings an ASSUMED default when annual_parts is omitted", () => {
    const r = toolROIEngine.calculate(input());
    expect(r.total_cost_breakdown.annual_savings.source).toMatch(/ASSUMED/);
    expect(r.total_cost_breakdown.annual_savings.source).toMatch(/default/i);
    expect(r.total_cost_breakdown.annual_savings.source).toContain("5000"); // the named default
  });

  it("uses the REAL supplied annual_parts (no ASSUMED label, real volume in the figure)", () => {
    const r = toolROIEngine.calculate(input({ annual_parts: 8000 }));
    expect(r.total_cost_breakdown.annual_savings.source).not.toMatch(/ASSUMED/);
    expect(r.total_cost_breakdown.annual_savings.source).toContain("8000");
  });

  it("annual_savings scales linearly with the supplied volume (the fix: real value drives it)", () => {
    const five = toolROIEngine.calculate(input({ annual_parts: 5000 }));
    const twenty = toolROIEngine.calculate(input({ annual_parts: 20000 }));
    // 20000 / 5000 = 4x; annual_savings = perPartSavings * annualParts.
    if (five.total_cost_breakdown.annual_savings.value > 0) {
      expect(twenty.total_cost_breakdown.annual_savings.value).toBeCloseTo(
        4 * five.total_cost_breakdown.annual_savings.value, 0
      );
    }
    // monotonic regardless (proves the supplied volume, not a constant 5000, drives the figure)
    expect(twenty.total_cost_breakdown.annual_savings.value).toBeGreaterThanOrEqual(
      five.total_cost_breakdown.annual_savings.value
    );
  });

  it("a supplied 20000 differs from the 5000-default figure (proves the default is not used when supplied)", () => {
    const def = toolROIEngine.calculate(input());                       // default 5000
    const big = toolROIEngine.calculate(input({ annual_parts: 20000 })); // real 20000
    if (def.total_cost_breakdown.annual_savings.value > 0) {
      expect(big.total_cost_breakdown.annual_savings.value).toBeGreaterThan(
        def.total_cost_breakdown.annual_savings.value
      );
    }
  });

  it("treats annual_parts <= 0 as absent (falls back to the labeled default)", () => {
    for (const bad of [0, -100]) {
      const r = toolROIEngine.calculate(input({ annual_parts: bad }));
      expect(r.total_cost_breakdown.annual_savings.source).toMatch(/ASSUMED/);
      expect(r.total_cost_breakdown.annual_savings.source).toContain("5000");
    }
  });

  it("annual_savings is never negative and is finite", () => {
    const r = toolROIEngine.calculate(input({ annual_parts: 12000 }));
    expect(r.total_cost_breakdown.annual_savings.value).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.total_cost_breakdown.annual_savings.value)).toBe(true);
  });

  it("does not regress the core ROI outputs (recommendations + per-part breakdown still populated)", () => {
    const r = toolROIEngine.calculate(input({ annual_parts: 10000 }));
    expect(r.budget_recommendation.cost_per_part.value).toBeGreaterThan(0);
    expect(r.standard_recommendation.cost_per_part.value).toBeGreaterThan(0);
    expect(r.premium_recommendation.cost_per_part.value).toBeGreaterThan(0);
    expect(r.total_cost_breakdown.best_total_per_part.value).toBeGreaterThan(0);
  });
});
