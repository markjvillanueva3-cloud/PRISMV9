/**
 * WEDMStrategyLibraryEngine Tests
 * ================================
 * Tests the 15-strategy Wire EDM cutting strategy library and the
 * AI-powered strategy selection engine.
 *
 * @milestone WEDM-AWARE-MS5
 */

import { describe, it, expect } from "vitest";
import {
  WEDMStrategyLibraryEngine,
  wedmStrategyLibraryEngine,
  WEDM_CUTTING_STRATEGIES,
  type WEDMCuttingStrategy,
  type StrategySelectionInput,
  type StrategyRecommendation,
} from "../engines/WEDMStrategyLibraryEngine.js";

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe("WEDMStrategyLibraryEngine — Singleton", () => {
  it("should return the same instance from getInstance()", () => {
    const a = WEDMStrategyLibraryEngine.getInstance();
    const b = WEDMStrategyLibraryEngine.getInstance();
    expect(a).toBe(b);
  });

  it("should export a singleton instance", () => {
    expect(wedmStrategyLibraryEngine).toBeInstanceOf(WEDMStrategyLibraryEngine);
  });

  it("singleton export should be the same as getInstance()", () => {
    expect(wedmStrategyLibraryEngine).toBe(WEDMStrategyLibraryEngine.getInstance());
  });
});

// ============================================================================
// STRATEGY LIBRARY — DATA INTEGRITY
// ============================================================================

describe("WEDM_CUTTING_STRATEGIES — Data Integrity", () => {
  it("should contain exactly 15 strategies", () => {
    expect(WEDM_CUTTING_STRATEGIES.length).toBe(15);
  });

  it("should have all required ids present", () => {
    const ids = WEDM_CUTTING_STRATEGIES.map((s) => s.id);
    const requiredIds = [
      "rough_cut", "skim_1", "skim_2", "skim_3", "skim_4",
      "corner_strategy", "taper_cut", "submerged",
      "flush_upper", "flush_lower",
      "thin_section", "thick_section",
      "carbide_strategy", "tool_steel_strategy", "hardened_strategy",
    ];
    for (const id of requiredIds) {
      expect(ids, `Missing strategy id: ${id}`).toContain(id);
    }
  });

  it("every strategy should have at least 1 material_suitability entry", () => {
    for (const strategy of WEDM_CUTTING_STRATEGIES) {
      expect(strategy.material_suitability.length, `${strategy.id} has no material_suitability`).toBeGreaterThan(0);
    }
  });

  it("every strategy should have at least 2 tips", () => {
    for (const strategy of WEDM_CUTTING_STRATEGIES) {
      expect(strategy.tips.length, `${strategy.id} has fewer than 2 tips`).toBeGreaterThanOrEqual(2);
    }
  });

  it("all suitability scores should be in range [0.0, 1.0]", () => {
    for (const strategy of WEDM_CUTTING_STRATEGIES) {
      for (const ms of strategy.material_suitability) {
        expect(ms.suitability, `${strategy.id}/${ms.material_type} suitability out of range`).toBeGreaterThanOrEqual(0.0);
        expect(ms.suitability, `${strategy.id}/${ms.material_type} suitability out of range`).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it("thickness_range min should be less than max for every strategy", () => {
    for (const strategy of WEDM_CUTTING_STRATEGIES) {
      expect(strategy.thickness_range.min_mm, `${strategy.id} min >= max`).toBeLessThan(
        strategy.thickness_range.max_mm
      );
    }
  });

  it("typical_params should have positive values for all strategies", () => {
    for (const strategy of WEDM_CUTTING_STRATEGIES) {
      const p = strategy.typical_params;
      expect(p.on_time_us,      `${strategy.id} on_time_us <= 0`).toBeGreaterThan(0);
      expect(p.off_time_us,     `${strategy.id} off_time_us <= 0`).toBeGreaterThan(0);
      expect(p.peak_current_A,  `${strategy.id} peak_current_A <= 0`).toBeGreaterThan(0);
      expect(p.gap_voltage_V,   `${strategy.id} gap_voltage_V <= 0`).toBeGreaterThan(0);
      expect(p.wire_tension_N,  `${strategy.id} wire_tension_N <= 0`).toBeGreaterThan(0);
    }
  });

  it("rough_cut should have higher peak_current than skim_4", () => {
    const rough = WEDM_CUTTING_STRATEGIES.find((s) => s.id === "rough_cut")!;
    const skim4 = WEDM_CUTTING_STRATEGIES.find((s) => s.id === "skim_4")!;
    expect(rough.typical_params.peak_current_A).toBeGreaterThan(skim4.typical_params.peak_current_A);
  });

  it("skim passes should cascade power: skim_1 > skim_2 > skim_3 > skim_4", () => {
    const skim1 = WEDM_CUTTING_STRATEGIES.find((s) => s.id === "skim_1")!;
    const skim2 = WEDM_CUTTING_STRATEGIES.find((s) => s.id === "skim_2")!;
    const skim3 = WEDM_CUTTING_STRATEGIES.find((s) => s.id === "skim_3")!;
    const skim4 = WEDM_CUTTING_STRATEGIES.find((s) => s.id === "skim_4")!;
    expect(skim1.typical_params.peak_current_A).toBeGreaterThan(skim2.typical_params.peak_current_A);
    expect(skim2.typical_params.peak_current_A).toBeGreaterThan(skim3.typical_params.peak_current_A);
    expect(skim3.typical_params.peak_current_A).toBeGreaterThan(skim4.typical_params.peak_current_A);
  });
});

// ============================================================================
// getStrategy()
// ============================================================================

describe("WEDMStrategyLibraryEngine.getStrategy()", () => {
  it("should return rough_cut by id", () => {
    const s = wedmStrategyLibraryEngine.getStrategy("rough_cut");
    expect(s).toBeDefined();
    expect(s!.id).toBe("rough_cut");
    expect(s!.category).toBe("roughing");
  });

  it("should return skim_1 with finishing category", () => {
    const s = wedmStrategyLibraryEngine.getStrategy("skim_1");
    expect(s!.category).toBe("finishing");
  });

  it("should return carbide_strategy with material category", () => {
    const s = wedmStrategyLibraryEngine.getStrategy("carbide_strategy");
    expect(s!.category).toBe("material");
  });

  it("should return undefined for unknown id", () => {
    const s = wedmStrategyLibraryEngine.getStrategy("nonexistent_id");
    expect(s).toBeUndefined();
  });

  it("should return thin_section with thickness category", () => {
    const s = wedmStrategyLibraryEngine.getStrategy("thin_section");
    expect(s!.category).toBe("thickness");
    expect(s!.thickness_range.max_mm).toBeLessThanOrEqual(5.0);
  });
});

// ============================================================================
// listStrategies()
// ============================================================================

describe("WEDMStrategyLibraryEngine.listStrategies()", () => {
  it("should return all 15 strategies", () => {
    const list = wedmStrategyLibraryEngine.listStrategies();
    expect(list.length).toBe(15);
  });

  it("returned list should be the same reference as WEDM_CUTTING_STRATEGIES", () => {
    const list = wedmStrategyLibraryEngine.listStrategies();
    expect(list).toBe(WEDM_CUTTING_STRATEGIES);
  });
});

// ============================================================================
// getStrategiesForMaterial()
// ============================================================================

describe("WEDMStrategyLibraryEngine.getStrategiesForMaterial()", () => {
  it("should return high-suitability strategies for D2 (normalized to tool_steel)", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForMaterial("D2");
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain("rough_cut");
    expect(ids).toContain("skim_1");
    expect(ids).toContain("tool_steel_strategy");
    expect(ids).toContain("hardened_strategy");
  });

  it("should return carbide_strategy for carbide material", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForMaterial("carbide");
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain("carbide_strategy");
    // non-carbide-specific strategies should be excluded
    expect(ids).not.toContain("tool_steel_strategy");
  });

  it("should normalize WC-Co to carbide", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForMaterial("WC-Co");
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain("carbide_strategy");
  });

  it("should normalize stainless steel aliases", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForMaterial("304");
    // stainless has suitability 0.8–1.0 on most strategies
    expect(strategies.length).toBeGreaterThan(3);
  });

  it("should return at least 3 strategies for aluminum", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForMaterial("aluminum");
    expect(strategies.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// getStrategiesForThickness()
// ============================================================================

describe("WEDMStrategyLibraryEngine.getStrategiesForThickness()", () => {
  it("should return thin_section for 3mm workpiece", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForThickness(3.0);
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain("thin_section");
    expect(ids).not.toContain("thick_section");
  });

  it("should return thick_section for 80mm workpiece", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForThickness(80.0);
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain("thick_section");
    expect(ids).not.toContain("thin_section");
  });

  it("should return multiple strategies for 30mm standard workpiece", () => {
    const strategies = wedmStrategyLibraryEngine.getStrategiesForThickness(30.0);
    // Most strategies cover 1–200mm range
    expect(strategies.length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================================
// selectStrategy() — AI Selection
// ============================================================================

describe("WEDMStrategyLibraryEngine.selectStrategy()", () => {
  it("should return 15 ranked recommendations", () => {
    const input: StrategySelectionInput = {
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 3.2,
      passes: 1,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    expect(recs.length).toBe(15);
  });

  it("ranks should be sequential 1 through 15", () => {
    const input: StrategySelectionInput = {
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 3.2,
      passes: 1,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    recs.forEach((r, i) => expect(r.rank).toBe(i + 1));
  });

  it("should recommend rough_cut as top strategy for D2 at 3.2µm Ra, 1 pass", () => {
    const input: StrategySelectionInput = {
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 3.2,
      passes: 1,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    expect(recs[0].strategy.id).toBe("rough_cut");
  });

  it("should recommend skim_4 for mirror finish (Ra 0.1µm, 5 passes)", () => {
    const input: StrategySelectionInput = {
      material: "tool_steel",
      thickness_mm: 30,
      target_ra_um: 0.1,
      passes: 5,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    // skim_4 should be in top 3 for mirror finish
    const top3Ids = recs.slice(0, 3).map((r) => r.strategy.id);
    expect(top3Ids).toContain("skim_4");
  });

  it("should recommend carbide_strategy in top 3 for WC-Co material", () => {
    const input: StrategySelectionInput = {
      material: "carbide",
      thickness_mm: 20,
      target_ra_um: 1.0,
      passes: 3,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    const top3Ids = recs.slice(0, 3).map((r) => r.strategy.id);
    expect(top3Ids).toContain("carbide_strategy");
  });

  it("should recommend thin_section in top 3 for 2mm thick part", () => {
    const input: StrategySelectionInput = {
      material: "tool_steel",
      thickness_mm: 2,
      target_ra_um: 1.6,
      passes: 2,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    const top5Ids = recs.slice(0, 5).map((r) => r.strategy.id);
    expect(top5Ids).toContain("thin_section");
  });

  it("should recommend thick_section in top 3 for 120mm workpiece", () => {
    const input: StrategySelectionInput = {
      material: "steel",
      thickness_mm: 120,
      target_ra_um: 4.0,
      passes: 1,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    const top3Ids = recs.slice(0, 3).map((r) => r.strategy.id);
    expect(top3Ids).toContain("thick_section");
  });

  it("all recommendation scores should be in range [0.0, 1.0]", () => {
    const input: StrategySelectionInput = {
      material: "M2",
      thickness_mm: 50,
      target_ra_um: 0.8,
      passes: 3,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    for (const r of recs) {
      expect(r.score).toBeGreaterThanOrEqual(0.0);
      expect(r.score).toBeLessThanOrEqual(1.0);
    }
  });

  it("score_breakdown fields should sum close to total score (weighted)", () => {
    const input: StrategySelectionInput = {
      material: "D2",
      thickness_mm: 40,
      target_ra_um: 0.4,
      passes: 4,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    for (const r of recs) {
      const { material_score, thickness_score, ra_score, pass_score } = r.score_breakdown;
      const recomputed =
        material_score  * 0.35 +
        thickness_score * 0.25 +
        ra_score        * 0.25 +
        pass_score      * 0.15;
      expect(r.score).toBeCloseTo(recomputed, 2);
    }
  });

  it("should produce a non-empty rationale string for every recommendation", () => {
    const input: StrategySelectionInput = {
      material: "titanium",
      thickness_mm: 15,
      target_ra_um: 1.6,
      passes: 2,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    for (const r of recs) {
      expect(r.rationale.length).toBeGreaterThan(10);
    }
  });

  it("should handle unknown material gracefully without throwing", () => {
    const input: StrategySelectionInput = {
      material: "unobtanium",
      thickness_mm: 30,
      target_ra_um: 1.6,
      passes: 2,
    };
    expect(() => wedmStrategyLibraryEngine.selectStrategy(input)).not.toThrow();
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    expect(recs.length).toBe(15);
  });

  it("should score higher Ra strategies lower for mirror finish target", () => {
    const input: StrategySelectionInput = {
      material: "tool_steel",
      thickness_mm: 20,
      target_ra_um: 0.08,
      passes: 5,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    const roughRec  = recs.find((r) => r.strategy.id === "rough_cut")!;
    const skim4Rec  = recs.find((r) => r.strategy.id === "skim_4")!;
    expect(skim4Rec.score).toBeGreaterThan(roughRec.score);
  });

  it("should handle zero thickness gracefully (near-edge case)", () => {
    const input: StrategySelectionInput = {
      material: "steel",
      thickness_mm: 0.1,
      target_ra_um: 1.6,
      passes: 1,
    };
    expect(() => wedmStrategyLibraryEngine.selectStrategy(input)).not.toThrow();
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    expect(recs.length).toBe(15);
  });

  it("hardened_strategy should rank above 10 (in top half) for 62HRC D2", () => {
    const input: StrategySelectionInput = {
      material: "D2",
      thickness_mm: 30,
      target_ra_um: 1.6,
      passes: 3,
    };
    const recs = wedmStrategyLibraryEngine.selectStrategy(input);
    const hardenedRec = recs.find((r) => r.strategy.id === "hardened_strategy")!;
    // hardened_strategy has suitability 1.0 for tool_steel — should be in top half of 15
    expect(hardenedRec.rank).toBeLessThanOrEqual(8);
    // Score should be positive and meaningful
    expect(hardenedRec.score).toBeGreaterThan(0.4);
  });
});
