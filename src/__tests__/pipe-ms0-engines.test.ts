import { describe, it, expect } from "vitest";

describe("InventoryAwareToolSelectorEngine", () => {
  it("matches features to inventory tools", async () => {
    const { InventoryAwareToolSelectorEngine } = await import("../engines/InventoryAwareToolSelectorEngine.js");
    const engine = new InventoryAwareToolSelectorEngine();

    const features = [
      { id: "f1", type: "hole" as const, diameter_mm: 6.35, depth_mm: 10 },
      { id: "f2", type: "pocket" as const, width_mm: 20, depth_mm: 5 },
      { id: "f3", type: "thread" as const, diameter_mm: 8, depth_mm: 15 },
    ];

    const inventory = [
      { id: "t1", type: "drill" as const, diameter_mm: 6.35, material: "carbide" as const, condition: "good" as const },
      { id: "t2", type: "endmill" as const, diameter_mm: 10, flutes: 4, material: "carbide" as const, condition: "new" as const },
    ];

    const r = engine.select(features, inventory);
    expect(r.value.assignments).toHaveLength(3);
    expect(r.value.assignments[0].from_inventory).toBe(true); // drill matched
    expect(r.value.assignments[1].from_inventory).toBe(true); // endmill for pocket
    expect(r.value.assignments[2].from_inventory).toBe(false); // no tap
    expect(r.value.missing_tools).toHaveLength(1);
    expect(r.value.missing_tools[0].recommended_type).toBe("tap");
    expect(r.value.inventory_coverage_pct).toBeCloseTo(66.7, 0);
  });

  it("derates worn tools", async () => {
    const { InventoryAwareToolSelectorEngine } = await import("../engines/InventoryAwareToolSelectorEngine.js");
    const engine = new InventoryAwareToolSelectorEngine();

    const features = [{ id: "f1", type: "hole" as const, diameter_mm: 10, depth_mm: 20 }];
    const inventory = [
      { id: "t1", type: "drill" as const, diameter_mm: 10, material: "carbide" as const, condition: "worn" as const },
    ];

    const r = engine.select(features, inventory);
    expect(r.value.assignments[0].condition_factor).toBe(0.85);
    expect(r.value.assignments[0].notes).toContain("derate");
  });

  it("suggests tool consolidation", async () => {
    const { InventoryAwareToolSelectorEngine } = await import("../engines/InventoryAwareToolSelectorEngine.js");
    const engine = new InventoryAwareToolSelectorEngine();

    const features = [
      { id: "f1", type: "pocket" as const, width_mm: 20, depth_mm: 5 },
      { id: "f2", type: "contour" as const, width_mm: 15, depth_mm: 8 },
      { id: "f3", type: "slot" as const, width_mm: 12, depth_mm: 4 },
    ];
    const inventory = [
      { id: "t1", type: "endmill" as const, diameter_mm: 10, flutes: 4, material: "carbide" as const, condition: "new" as const },
    ];

    const r = engine.select(features, inventory);
    expect(r.value.consolidations.length).toBeGreaterThanOrEqual(1);
    expect(r.value.consolidations[0].features_served.length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty inventory", async () => {
    const { InventoryAwareToolSelectorEngine } = await import("../engines/InventoryAwareToolSelectorEngine.js");
    const engine = new InventoryAwareToolSelectorEngine();

    const features = [
      { id: "f1", type: "hole" as const, diameter_mm: 5 },
      { id: "f2", type: "face" as const },
    ];

    const r = engine.select(features, []);
    expect(r.value.inventory_coverage_pct).toBe(0);
    expect(r.value.missing_tools).toHaveLength(2);
  });

  it("filters retired tools", async () => {
    const { InventoryAwareToolSelectorEngine } = await import("../engines/InventoryAwareToolSelectorEngine.js");
    const engine = new InventoryAwareToolSelectorEngine();

    const features = [{ id: "f1", type: "hole" as const, diameter_mm: 8 }];
    const inventory = [
      { id: "t1", type: "drill" as const, diameter_mm: 8, material: "hss" as const, condition: "retired" as const },
    ];

    const r = engine.select(features, inventory);
    expect(r.value.assignments[0].from_inventory).toBe(false);
  });
});

describe("ROIAdvisorEngine", () => {
  it("calculates tool upgrade ROI", async () => {
    const { ROIAdvisorEngine } = await import("../engines/ROIAdvisorEngine.js");
    const engine = new ROIAdvisorEngine();

    const current = {
      tools: [{ type: "endmill", diameter_mm: 12, condition: "worn", cost_usd: 35 }],
      machine: { name: "Haas VF-2", max_rpm: 8100, power_kw: 22.4, taper: "BT40" },
      holders: [{ type: "ER32", taper: "BT40", runout_um: 15 }],
      coolant: { type: "flood" as const },
      workholding: { type: "vise" },
    };

    const optimal = {
      tools: [{ type: "endmill", diameter_mm: 12, cost_usd: 65, improvement_pct: 20 }],
      holders: [{ type: "shrink_fit", cost_usd: 350, runout_reduction_um: 12 }],
    };

    const r = engine.analyze(current, optimal, 5000, 8.5, 47.20);
    expect(r.value.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(r.value.total_investment_usd).toBeGreaterThan(0);
    expect(r.value.total_annual_savings_usd).toBeGreaterThan(0);
    expect(r.value.overall_roi_pct).toBeGreaterThan(0);
  });

  it("identifies quick wins (payback < 3 months)", async () => {
    const { ROIAdvisorEngine } = await import("../engines/ROIAdvisorEngine.js");
    const engine = new ROIAdvisorEngine();

    const current = {
      tools: [],
      machine: { name: "Old Mill", max_rpm: 6000, power_kw: 15, taper: "BT40" },
      holders: [],
      coolant: { type: "dry" as const },
      workholding: { type: "vise" },
    };

    const optimal = {
      tools: [{ type: "endmill", diameter_mm: 10, cost_usd: 40, improvement_pct: 30 }],
      coolant: { type: "through_tool", cost_usd: 200, improvement_pct: 25 },
    };

    const r = engine.analyze(current, optimal, 10000, 5.0, 25.00);
    expect(r.value.quick_wins.length).toBeGreaterThanOrEqual(1);
    expect(r.value.quick_wins[0].payback_months).toBeLessThan(3);
  });

  it("handles machine upgrade (big ticket)", async () => {
    const { ROIAdvisorEngine } = await import("../engines/ROIAdvisorEngine.js");
    const engine = new ROIAdvisorEngine();

    const current = {
      tools: [],
      machine: { name: "Old VF-1", max_rpm: 7500, power_kw: 15, taper: "BT40", age_years: 15 },
      holders: [],
      coolant: { type: "flood" as const },
      workholding: { type: "vise" },
    };

    const optimal = {
      tools: [],
      machine: { name: "Haas VF-2SS", cost_usd: 85000, improvement_pct: 35 },
    };

    const r = engine.analyze(current, optimal, 2000, 12.0, 80.00);
    const machineSuggestion = r.value.suggestions.find(s => s.category === "machine");
    expect(machineSuggestion).toBeDefined();
    expect(machineSuggestion!.cost_usd).toBe(85000);
    expect(machineSuggestion!.annual_savings_usd).toBeGreaterThan(0);
  });

  it("returns empty for no improvements needed", async () => {
    const { ROIAdvisorEngine } = await import("../engines/ROIAdvisorEngine.js");
    const engine = new ROIAdvisorEngine();

    const current = {
      tools: [],
      machine: { name: "Perfect Machine", max_rpm: 15000, power_kw: 30, taper: "HSK-A63" },
      holders: [],
      coolant: { type: "through_tool" as const },
      workholding: { type: "hydraulic" },
    };

    const r = engine.analyze(current, { tools: [] }, 1000, 5, 30);
    expect(r.value.suggestions).toHaveLength(0);
    expect(r.value.total_investment_usd).toBe(0);
  });
});
