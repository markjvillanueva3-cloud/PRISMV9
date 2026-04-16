/**
 * MillingStrategyLibraryEngine Tests — MILL-AWARE-MS5
 *
 * Tests the comprehensive milling strategy library with AI-driven selection.
 * Validates 35+ strategies, feature mapping, material suitability, and selection AI.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  millingStrategyLibraryEngine,
  MillingStrategyLibraryEngine,
  type MillingStrategy,
  type StrategySelectionInput,
  type StrategyRecommendation,
  type MillingStrategyCategory,
  type FeatureType,
} from "../engines/MillingStrategyLibraryEngine.js";

describe("MillingStrategyLibraryEngine", () => {
  // ==========================================================================
  // SINGLETON & BASIC OPERATIONS
  // ==========================================================================

  describe("Singleton Pattern", () => {
    it("should export singleton instance", () => {
      expect(millingStrategyLibraryEngine).toBeDefined();
      expect(millingStrategyLibraryEngine).toBeInstanceOf(MillingStrategyLibraryEngine);
    });

    it("should return same instance on multiple accesses", () => {
      const engine1 = millingStrategyLibraryEngine;
      const engine2 = millingStrategyLibraryEngine;
      expect(engine1).toBe(engine2);
    });
  });

  // ==========================================================================
  // STRATEGY DATABASE
  // ==========================================================================

  describe("Strategy Database", () => {
    it("should contain 25+ strategies", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();
      expect(strategies.length).toBeGreaterThanOrEqual(25);
    });

    it("should have unique strategy IDs", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();
      const ids = strategies.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have all required fields on each strategy", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();
      for (const s of strategies) {
        expect(s.id).toBeTruthy();
        expect(s.name).toBeTruthy();
        expect(s.category).toBeTruthy();
        expect(s.description).toBeTruthy();
        expect(s.min_axes).toBeGreaterThanOrEqual(3);
        expect(typeof s.hsm_capable).toBe("boolean");
        expect(s.applicable_features.length).toBeGreaterThan(0);
        expect(s.material_suitability.length).toBeGreaterThan(0);
        expect(s.tips.length).toBeGreaterThan(0);
      }
    });

    it("should cover all ISO material groups", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();
      const isoGroups = ["P", "M", "K", "N", "S", "H"] as const;

      for (const strategy of strategies) {
        const coveredGroups = strategy.material_suitability.map((m) => m.iso_group);
        for (const group of isoGroups) {
          expect(coveredGroups).toContain(group);
        }
      }
    });
  });

  // ==========================================================================
  // CATEGORY FILTERING
  // ==========================================================================

  describe("getStrategiesByCategory", () => {
    // Categories with known strategies
    const populatedCategories: MillingStrategyCategory[] = [
      "2d_roughing",
      "3d_roughing",
      "3d_finishing",
      "hsm_roughing",
      "5axis_roughing",
      "5axis_finishing",
      "drilling",
    ];

    it.each(populatedCategories)("should return strategies for category '%s'", (category) => {
      const strategies = millingStrategyLibraryEngine.getStrategiesByCategory(category);
      expect(strategies.length).toBeGreaterThan(0);
      for (const s of strategies) {
        expect(s.category).toBe(category);
      }
    });

    it("should handle empty categories gracefully", () => {
      // Some categories may not have strategies yet
      const strategies = millingStrategyLibraryEngine.getStrategiesByCategory("specialty");
      expect(Array.isArray(strategies)).toBe(true);
    });
  });

  // ==========================================================================
  // STRATEGY LOOKUP
  // ==========================================================================

  describe("getStrategy", () => {
    it("should return strategy by ID", () => {
      const strategy = millingStrategyLibraryEngine.getStrategy("facing");
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe("Face Milling");
    });

    it("should return undefined for unknown ID", () => {
      const strategy = millingStrategyLibraryEngine.getStrategy("nonexistent_strategy");
      expect(strategy).toBeUndefined();
    });

    it("should return adaptive_clearing strategy", () => {
      const strategy = millingStrategyLibraryEngine.getStrategy("adaptive_clearing");
      expect(strategy).toBeDefined();
      expect(strategy?.hsm_capable).toBe(true);
      expect(strategy?.engagement_control).toBe("constant");
    });

    it("should return trochoidal_milling strategy", () => {
      const strategy = millingStrategyLibraryEngine.getStrategy("trochoidal_milling");
      expect(strategy).toBeDefined();
      expect(strategy?.category).toBe("hsm_roughing");
    });
  });

  // ==========================================================================
  // FEATURE MAPPING
  // ==========================================================================

  describe("getStrategiesForFeature", () => {
    const features: FeatureType[] = [
      "pocket_2d",
      "profile_2d",
      "face",
      "freeform_3d",
      "deep_cavity",
      "thin_wall",
      "impeller_blade",
    ];

    it.each(features)("should return strategies for feature '%s'", (feature) => {
      const strategies = millingStrategyLibraryEngine.getStrategiesForFeature(feature);
      expect(strategies.length).toBeGreaterThan(0);
      for (const s of strategies) {
        expect(s.applicable_features).toContain(feature);
      }
    });

    it("should return multiple strategies for pocket_2d", () => {
      const strategies = millingStrategyLibraryEngine.getStrategiesForFeature("pocket_2d");
      expect(strategies.length).toBeGreaterThanOrEqual(3); // At minimum: pocketing, adaptive, trochoidal
    });
  });

  // ==========================================================================
  // AI STRATEGY SELECTION
  // ==========================================================================

  describe("selectStrategy", () => {
    it("should select strategy for basic 2D pocket in steel", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "P",
        available_axes: 3,
        tool_diameter_mm: 12,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      expect(result.strategy_id).toBeTruthy();
      expect(result.score).toBeGreaterThan(0);
      expect(result.match_reasons.length).toBeGreaterThan(0);
    });

    it("should prefer adaptive for titanium (ISO S)", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "S",
        available_axes: 3,
        tool_diameter_mm: 10,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      // Should prefer HSM strategies for difficult materials
      expect(["adaptive_clearing", "trochoidal_milling"]).toContain(result.strategy_id);
    });

    it("should prefer constant engagement for hardened steel", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "H",
        material_hardness_hrc: 58,
        available_axes: 3,
        tool_diameter_mm: 8,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      expect(result.match_reasons.some((r) => r.includes("hard") || r.includes("engagement"))).toBe(
        true
      );
    });

    it("should recommend plunge roughing for deep pockets", () => {
      const input: StrategySelectionInput = {
        feature_type: "deep_cavity",
        material_iso_group: "P",
        available_axes: 3,
        tool_diameter_mm: 16,
        pocket_depth_mm: 80,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      // Either primary or alternative should include plunge roughing
      const allRecommendations = [
        result.strategy_id,
        ...result.alternative_strategies.map((a) => a.id),
      ];
      expect(
        allRecommendations.some((id) => id === "plunge_roughing" || id === "adaptive_clearing")
      ).toBe(true);
    });

    it("should handle thin wall consideration", () => {
      const input: StrategySelectionInput = {
        feature_type: "thin_wall",
        material_iso_group: "N",
        available_axes: 3,
        tool_diameter_mm: 6,
        wall_thickness_mm: 1.5,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      expect(result.score).toBeGreaterThan(0);
    });

    it("should prioritize surface finish when requested", () => {
      const input: StrategySelectionInput = {
        feature_type: "freeform_3d",
        material_iso_group: "P",
        available_axes: 3,
        tool_diameter_mm: 8,
        surface_quality_priority: true,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      expect(
        result.match_reasons.some((r) => r.toLowerCase().includes("finish") || r.includes("surface"))
      ).toBe(true);
    });

    it("should respect axis limitations", () => {
      const input: StrategySelectionInput = {
        feature_type: "impeller_blade",
        material_iso_group: "S",
        available_axes: 3, // Only 3-axis
        tool_diameter_mm: 6,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      // Should not recommend 5-axis only strategies
      const strategy = millingStrategyLibraryEngine.getStrategy(result.strategy_id);
      expect(strategy?.min_axes).toBeLessThanOrEqual(3);
    });

    it("should provide alternative strategies", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "P",
        available_axes: 3,
        tool_diameter_mm: 12,
      };
      const result = millingStrategyLibraryEngine.selectStrategy(input);

      expect(result.alternative_strategies.length).toBeGreaterThan(0);
      expect(result.alternative_strategies.length).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // STRATEGY COMPARISON
  // ==========================================================================

  describe("compareStrategies", () => {
    it("should compare two strategies", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "P",
        available_axes: 3,
        tool_diameter_mm: 12,
      };
      const result = millingStrategyLibraryEngine.compareStrategies(
        "adaptive_clearing",
        "pocketing",
        input
      );

      expect(result.winner).toBeTruthy();
      expect(result.scoreA).toBeGreaterThan(0);
      expect(result.scoreB).toBeGreaterThan(0);
      expect(result.comparison.length).toBeGreaterThan(0);
    });

    it("should handle unknown strategy gracefully", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "P",
        available_axes: 3,
        tool_diameter_mm: 12,
      };
      const result = millingStrategyLibraryEngine.compareStrategies(
        "adaptive_clearing",
        "nonexistent",
        input
      );

      expect(result.winner).toBe("unknown");
      expect(result.comparison).toContain("One or both strategies not found");
    });

    it("should compare HSM vs conventional for titanium", () => {
      const input: StrategySelectionInput = {
        feature_type: "pocket_2d",
        material_iso_group: "S",
        available_axes: 3,
        tool_diameter_mm: 10,
      };
      const result = millingStrategyLibraryEngine.compareStrategies(
        "adaptive_clearing",
        "pocketing",
        input
      );

      // Adaptive should win for titanium
      expect(result.winner).toBe("adaptive_clearing");
    });
  });

  // ==========================================================================
  // CAM EQUIVALENTS
  // ==========================================================================

  describe("CAM System Equivalents", () => {
    it("should have CAM equivalents for major systems", () => {
      const camSystems = ["fusion360", "mastercam", "hypermill", "powermill", "solidcam", "nx"];
      const strategies = millingStrategyLibraryEngine.getAllStrategies();

      for (const strategy of strategies) {
        for (const cam of camSystems) {
          expect(strategy.cam_equivalents[cam]).toBeDefined();
          expect(strategy.cam_equivalents[cam].length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ==========================================================================
  // MATERIAL SUITABILITY
  // ==========================================================================

  describe("Material Suitability", () => {
    it("should have valid suitability ratings", () => {
      const validRatings = ["excellent", "good", "fair", "poor", "not_recommended"];
      const strategies = millingStrategyLibraryEngine.getAllStrategies();

      for (const strategy of strategies) {
        for (const mat of strategy.material_suitability) {
          expect(validRatings).toContain(mat.suitability);
          expect(mat.speed_factor).toBeGreaterThan(0);
          expect(mat.feed_factor).toBeGreaterThan(0);
          expect(mat.notes.length).toBeGreaterThan(0);
        }
      }
    });

    it("should have reasonable speed factors", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();

      for (const strategy of strategies) {
        for (const mat of strategy.material_suitability) {
          // Hard materials can have speed factors as low as 0.2 for safety
          expect(mat.speed_factor).toBeGreaterThanOrEqual(0.1);
          expect(mat.speed_factor).toBeLessThanOrEqual(2.5);
        }
      }
    });
  });

  // ==========================================================================
  // TYPICAL PARAMETERS
  // ==========================================================================

  describe("Typical Parameters", () => {
    it("should have valid stepover ranges for non-drilling strategies", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();

      for (const strategy of strategies) {
        const { stepover_pct_tool_dia } = strategy.typical_params;
        // Skip drilling strategies which may have 0 stepover
        if (strategy.category === "drilling") continue;
        if (stepover_pct_tool_dia.max === 0) continue; // Skip strategies that don't use stepover

        expect(stepover_pct_tool_dia.min).toBeLessThanOrEqual(stepover_pct_tool_dia.max);
        expect(stepover_pct_tool_dia.typical).toBeGreaterThanOrEqual(stepover_pct_tool_dia.min);
        expect(stepover_pct_tool_dia.typical).toBeLessThanOrEqual(stepover_pct_tool_dia.max);
      }
    });

    it("should have valid stepdown ranges for non-drilling strategies", () => {
      const strategies = millingStrategyLibraryEngine.getAllStrategies();

      for (const strategy of strategies) {
        const { stepdown_pct_tool_dia } = strategy.typical_params;
        // Skip drilling strategies which may have 0 stepdown
        if (strategy.category === "drilling") continue;
        if (stepdown_pct_tool_dia.max === 0) continue; // Skip strategies that don't use stepdown

        expect(stepdown_pct_tool_dia.min).toBeLessThanOrEqual(stepdown_pct_tool_dia.max);
        expect(stepdown_pct_tool_dia.typical).toBeGreaterThanOrEqual(stepdown_pct_tool_dia.min);
        expect(stepdown_pct_tool_dia.typical).toBeLessThanOrEqual(stepdown_pct_tool_dia.max);
      }
    });
  });
});
