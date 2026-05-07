/**
 * Tests for MastercamDeepLearningEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP01
 */

import { describe, it, expect } from "vitest";
import { mastercamDeepLearningEngine } from "../engines/MastercamDeepLearningEngine.js";

describe("MastercamDeepLearningEngine", () => {
  describe("selectOptimalStrategy", () => {
    it("should select 2D Pocket for closed pocket feature", () => {
      const result = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "closed_pocket",
        material_group: "P",
        machine_type: "3axis_mill",
        tool_diameter_mm: 12,
        depth_mm: 15,
        width_mm: 50,
        tolerance_mm: 0.025
      });

      expect(result.primary_strategy).toBeDefined();
      expect(result.reasoning_chain.length).toBeGreaterThan(3);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should prefer OptiRough for deep cavities", () => {
      const result = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "deep_cavity",
        material_group: "P",
        machine_type: "3axis_mill",
        tool_diameter_mm: 12,
        depth_mm: 50, // Deep cavity
        width_mm: 100,
        tolerance_mm: 0.1
      });

      expect(result.primary_strategy.category).toContain("optirough");
    });

    it("should select 5-axis for freeform with 5-axis machine", () => {
      const result = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "freeform_surface",
        material_group: "N",
        machine_type: "5axis_table_head",
        tool_diameter_mm: 8,
        depth_mm: 20,
        width_mm: 100,
        tolerance_mm: 0.01
      });

      expect(result.primary_strategy.suitable_machines).toContain("5axis_table_head");
    });

    it("should add material-specific tribal tips for hardened steel", () => {
      const result = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "closed_pocket",
        material_group: "H",
        machine_type: "3axis_mill",
        tool_diameter_mm: 6,
        depth_mm: 5,
        width_mm: 20,
        tolerance_mm: 0.01
      });

      expect(result.tribal_tips.some(t => t.toLowerCase().includes("hard"))).toBe(true);
    });

    it("should add superalloy tips for ISO S materials", () => {
      const result = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "closed_pocket",
        material_group: "S",
        machine_type: "3axis_mill",
        tool_diameter_mm: 8,
        depth_mm: 5,
        width_mm: 30,
        tolerance_mm: 0.025
      });

      expect(result.tribal_tips.some(t => t.toLowerCase().includes("superalloy") || t.toLowerCase().includes("coolant"))).toBe(true);
    });

    it("should calculate cutting parameters based on material", () => {
      const steel = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "closed_pocket",
        material_group: "P",
        machine_type: "3axis_mill",
        tool_diameter_mm: 12,
        depth_mm: 10,
        width_mm: 50,
        tolerance_mm: 0.025
      });

      const aluminum = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "closed_pocket",
        material_group: "N",
        machine_type: "3axis_mill",
        tool_diameter_mm: 12,
        depth_mm: 10,
        width_mm: 50,
        tolerance_mm: 0.025
      });

      // Aluminum should have higher speed
      expect(aluminum.cutting_parameters.speed_m_min).toBeGreaterThan(steel.cutting_parameters.speed_m_min);
    });

    it("should provide alternative strategies", () => {
      const result = mastercamDeepLearningEngine.selectOptimalStrategy({
        feature_type: "freeform_surface",
        material_group: "P",
        machine_type: "3axis_mill",
        tool_diameter_mm: 10,
        depth_mm: 15,
        width_mm: 80,
        tolerance_mm: 0.02
      });

      expect(result.alternative_strategies.length).toBeGreaterThan(0);
    });
  });

  describe("explainStrategy", () => {
    it("should explain 2D contour strategy", () => {
      const explanation = mastercamDeepLearningEngine.explainStrategy("mc-2d-contour");
      expect(explanation).toContain("2D Contour");
      expect(explanation).toContain("Suitable For");
      expect(explanation).toContain("Tribal Tips");
    });

    it("should explain OptiRough strategy", () => {
      const explanation = mastercamDeepLearningEngine.explainStrategy("mc-optirough");
      expect(explanation).toContain("OptiRough");
      expect(explanation).toContain("Dynamic motion");
    });

    it("should return null for unknown strategy", () => {
      const explanation = mastercamDeepLearningEngine.explainStrategy("unknown-strategy");
      expect(explanation).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return strategy and knowledge counts", () => {
      const stats = mastercamDeepLearningEngine.getStats();
      expect(stats.strategies).toBeGreaterThan(5);
      expect(stats.supported_features).toBe(19);
      expect(stats.supported_materials).toBe(6);
    });
  });

  describe("buildKnowledgeBase", () => {
    it("should process .mcx-8 file paths", async () => {
      const result = await mastercamDeepLearningEngine.buildKnowledgeBase([
        "H:/PRISM/JM DIE/CNC MILL HAAS/ALCOA FASTENING/test.mcx-8"
      ]);
      expect(result.extracted).toBe(1);
      expect(result.errors).toBe(0);
    });
  });
});
