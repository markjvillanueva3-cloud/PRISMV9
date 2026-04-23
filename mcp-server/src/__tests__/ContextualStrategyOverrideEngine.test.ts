import { describe, it, expect } from "vitest";
import { contextualStrategyOverrideEngine } from "../engines/ContextualStrategyOverrideEngine.js";

describe("ContextualStrategyOverrideEngine", () => {
  it("thin_wall triggers when wall < 2mm", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      { wall_thickness: 1.5, tool_diameter: 10 },
      { iso_group: "P" },
      { diameter: 10, flutes: 4, material: "carbide" },
      { name: "adaptive_clearing" },
    );
    const thinWall = results.find(r => r.rule_name === "thin_wall")!;
    expect(thinWall.triggered).toBe(true);
    expect(thinWall.severity).toBe("mandatory");
    expect(thinWall.adjustments.length).toBeGreaterThan(0);
  });

  it("thin_wall does NOT trigger when wall >= 2mm", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      { wall_thickness: 5, tool_diameter: 10 },
      { iso_group: "P" }, { diameter: 10 }, { name: "adaptive_clearing" },
    );
    expect(results.find(r => r.rule_name === "thin_wall")!.triggered).toBe(false);
  });

  it("deep_bore triggers when L/D > 10", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      { bore_depth: 120, tool_diameter: 10 },
      { iso_group: "P" }, { diameter: 10 }, { name: "conventional_drill" },
    );
    expect(results.find(r => r.rule_name === "deep_bore")!.triggered).toBe(true);
  });

  it("fragile_material triggers for ISO H / HRC>55", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      {}, { iso_group: "H", hrc: 60 }, { diameter: 10 }, { name: "conventional_milling" },
    );
    expect(results.find(r => r.rule_name === "fragile_material")!.triggered).toBe(true);
  });

  it("prototype_batch triggers when qty <= 3", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      {}, { iso_group: "P" }, { diameter: 10 }, { name: "adaptive_clearing" }, 2,
    );
    expect(results.find(r => r.rule_name === "prototype_batch")!.triggered).toBe(true);
  });

  it("prototype_batch does NOT trigger when qty > 3", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      {}, { iso_group: "P" }, { diameter: 10 }, { name: "adaptive_clearing" }, 50,
    );
    expect(results.find(r => r.rule_name === "prototype_batch")!.triggered).toBe(false);
  });

  it("hard_material triggers when HRC > 45", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      {}, { iso_group: "P", hrc: 50 }, { diameter: 10, flutes: 3 }, { name: "conventional_milling" },
    );
    expect(results.find(r => r.rule_name === "hard_material")!.triggered).toBe(true);
  });

  it("soft_gummy triggers for ISO M (stainless/titanium)", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      {}, { iso_group: "M" }, { diameter: 10 }, { name: "adaptive_clearing" },
    );
    expect(results.find(r => r.rule_name === "soft_gummy")!.triggered).toBe(true);
  });

  it("micro_feature triggers when dim < 1mm", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      { feature_dim: 0.5 }, { iso_group: "P" }, { diameter: 0.5 }, { name: "adaptive_clearing" },
    );
    expect(results.find(r => r.rule_name === "micro_feature")!.triggered).toBe(true);
  });

  it("interrupted_cut triggers for keyway", () => {
    const results = contextualStrategyOverrideEngine.checkOverrides(
      { feature_type: "keyway" }, { iso_group: "P" }, { diameter: 10 }, { name: "adaptive_clearing" },
    );
    expect(results.find(r => r.rule_name === "interrupted_cut")!.triggered).toBe(true);
  });

  it("applyOverrides() produces modified params with summary", () => {
    const checks = contextualStrategyOverrideEngine.checkOverrides(
      { wall_thickness: 1, tool_diameter: 10 },
      { iso_group: "P" }, { diameter: 10 }, { name: "adaptive_clearing" },
    );
    const result = contextualStrategyOverrideEngine.applyOverrides(
      { ae_pct_D: 40, ap_mm: 5, feed_rate_mmpm: 800 },
      checks,
    );
    expect(result.applied_adjustments.length).toBeGreaterThan(0);
    expect(result.mandatory_count).toBeGreaterThan(0);
    expect(typeof result.summary).toBe("string");
  });

  it("applyOverrides() no triggers → unchanged params", () => {
    const checks = contextualStrategyOverrideEngine.checkOverrides(
      { wall_thickness: 10, tool_diameter: 10 },
      { iso_group: "P" }, { diameter: 10, flutes: 4 }, { name: "adaptive_clearing" }, 100,
    );
    const result = contextualStrategyOverrideEngine.applyOverrides(
      { ae_pct_D: 40, ap_mm: 5 }, checks,
    );
    expect(result.triggered_rules.length).toBe(0);
    expect(result.params.ae_pct_D).toBe(40);
  });

  it("listRules() returns exactly 10 rules", () => {
    const rules = contextualStrategyOverrideEngine.listRules();
    expect(rules.length).toBe(10);
  });

  it("listRules() each rule has required metadata", () => {
    const rules = contextualStrategyOverrideEngine.listRules();
    for (const r of rules) {
      expect(r.rule_name).toBeDefined();
      expect(r.label).toBeDefined();
      expect(r.rationale.length).toBeGreaterThan(0);
      expect(["mandatory", "recommended"]).toContain(r.severity);
    }
  });
});
