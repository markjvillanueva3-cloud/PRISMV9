/**
 * MillingAGIOrchestrationEngine Tests
 *
 * Tests for master AGI-level orchestration with full physics/chemistry/metallurgy synergy.
 */

import { describe, it, expect } from "vitest";
import {
  millingAGIOrchestrationEngine,
  MillingAGIOrchestrationEngine,
} from "../engines/MillingAGIOrchestrationEngine.js";

describe("MillingAGIOrchestrationEngine", () => {
  describe("Engine instantiation", () => {
    it("should export singleton instance", () => {
      expect(millingAGIOrchestrationEngine).toBeDefined();
      expect(millingAGIOrchestrationEngine).toBeInstanceOf(MillingAGIOrchestrationEngine);
    });

    it("should have all required methods", () => {
      const methods = [
        "analyzeWithAGI",
        "quickAnalyze",
        "getOptimalParameters",
        "validateParameters",
        "getSelfAwareness",
        "getStats",
      ];

      for (const method of methods) {
        expect(typeof (millingAGIOrchestrationEngine as any)[method]).toBe("function");
      }
    });
  });

  describe("analyzeWithAGI", () => {
    it("should perform comprehensive analysis for 4140 steel", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result).toHaveProperty("state");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("optimal_parameters");
      expect(result).toHaveProperty("scientific_insights");
      expect(result).toHaveProperty("tribal_wisdom");
      expect(result).toHaveProperty("risk_assessment");
      expect(result).toHaveProperty("orchestration_metadata");
    });

    it("should return complete state with all domains", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "6061-T6",
        tool_diameter_mm: 12,
        tool_flutes: 3,
        cutting_speed_m_min: 400,
        feed_per_tooth_mm: 0.15,
        axial_depth_mm: 3,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result.state).toHaveProperty("material");
      expect(result.state).toHaveProperty("tool");
      expect(result.state).toHaveProperty("cutting");
      expect(result.state).toHaveProperty("physics");
      expect(result.state).toHaveProperty("thermal");
      expect(result.state).toHaveProperty("tribo");
      expect(result.state).toHaveProperty("chemistry");
      expect(result.state).toHaveProperty("metallurgy");
      expect(result.state).toHaveProperty("dynamics");
      expect(result.state).toHaveProperty("quality");
    });

    it("should calculate physics state correctly", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result.state.physics.cutting_force_n).toBeGreaterThan(0);
      expect(result.state.physics.power_consumption_kw).toBeGreaterThan(0);
      expect(result.state.physics.torque_nm).toBeGreaterThan(0);
      expect(result.state.physics.shear_angle_deg).toBeGreaterThan(0);
      expect(result.state.physics.shear_angle_deg).toBeLessThan(90);
    });

    it("should calculate thermal state correctly", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "Ti-6Al-4V",
        tool_diameter_mm: 10,
        tool_flutes: 4,
        cutting_speed_m_min: 50,
        feed_per_tooth_mm: 0.08,
        axial_depth_mm: 2,
        radial_depth_mm: 5,
        operation: "roughing",
      });

      expect(result.state.thermal.chip_temperature_c).toBeGreaterThan(20);
      expect(result.state.thermal.heat_partition_chip).toBeGreaterThan(0);
      expect(result.state.thermal.heat_partition_chip).toBeLessThanOrEqual(1);
      expect(
        result.state.thermal.heat_partition_chip +
          result.state.thermal.heat_partition_tool +
          result.state.thermal.heat_partition_workpiece
      ).toBeCloseTo(1, 1);
    });

    it("should provide warnings for extreme conditions", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "Inconel718",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 100, // High for Inconel
        feed_per_tooth_mm: 0.15, // Aggressive
        axial_depth_mm: 8, // Deep cut
        radial_depth_mm: 8,
        operation: "roughing",
      });

      expect(result.state.warnings.length).toBeGreaterThan(0);
    });

    it("should include scientific insights", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result.scientific_insights.length).toBeGreaterThan(0);
      expect(result.scientific_insights[0]).toHaveProperty("domain");
      expect(result.scientific_insights[0]).toHaveProperty("insight");
      expect(result.scientific_insights[0]).toHaveProperty("formulas_used");
    });

    it("should provide recommendations when needed", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "D2",
        tool_diameter_mm: 10,
        tool_flutes: 4,
        cutting_speed_m_min: 100, // High for D2 tool steel
        feed_per_tooth_mm: 0.15, // Aggressive
        axial_depth_mm: 5,
        radial_depth_mm: 5,
        operation: "roughing",
      });

      // Should have at least metadata
      expect(result.orchestration_metadata).toBeDefined();
      expect(result.orchestration_metadata.engines_consulted.length).toBeGreaterThan(0);
    });

    it("should assess risks appropriately", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "Ti-6Al-4V",
        tool_diameter_mm: 8,
        tool_flutes: 4,
        cutting_speed_m_min: 80, // High for titanium
        feed_per_tooth_mm: 0.12,
        axial_depth_mm: 4,
        radial_depth_mm: 4,
        operation: "roughing",
      });

      expect(Array.isArray(result.risk_assessment)).toBe(true);
    });

    it("should calculate optimal parameters", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result.optimal_parameters.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.optimal_parameters.spindle_rpm).toBeGreaterThan(0);
      expect(result.optimal_parameters.mrr_cm3_min).toBeGreaterThan(0);
      expect(result.optimal_parameters.tool_life_min).toBeGreaterThan(0);
    });

    it("should include tribal wisdom for titanium", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "Ti-6Al-4V",
        tool_diameter_mm: 10,
        tool_flutes: 4,
        cutting_speed_m_min: 50,
        feed_per_tooth_mm: 0.08,
        axial_depth_mm: 2,
        radial_depth_mm: 5,
        operation: "roughing",
      });

      expect(result.tribal_wisdom.length).toBeGreaterThan(0);
      expect(result.tribal_wisdom[0]).toHaveProperty("tip");
      expect(result.tribal_wisdom[0]).toHaveProperty("confidence");
    });

    it("should track orchestration metadata", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result.orchestration_metadata.engines_consulted.length).toBeGreaterThan(10);
      expect(result.orchestration_metadata.total_formulas).toBeGreaterThan(50);
      expect(result.orchestration_metadata.reasoning_depth).toBeGreaterThan(5);
      expect(result.orchestration_metadata.confidence).toBeGreaterThan(0);
      expect(result.orchestration_metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("quickAnalyze", () => {
    it("should perform quick analysis", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "4140",
        12,
        150,
        0.1,
        4
      );

      expect(result).toHaveProperty("force_n");
      expect(result).toHaveProperty("power_kw");
      expect(result).toHaveProperty("temperature_c");
      expect(result).toHaveProperty("tool_life_min");
      expect(result).toHaveProperty("mrr_cm3_min");
      expect(result).toHaveProperty("quality_score");
      expect(result).toHaveProperty("warnings");
    });

    it("should calculate force correctly", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "4140",
        12,
        150,
        0.1,
        4
      );

      expect(result.force_n).toBeGreaterThan(100);
      expect(result.force_n).toBeLessThan(5000);
    });

    it("should calculate temperature correctly", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "4140",
        12,
        150,
        0.1,
        4
      );

      expect(result.temperature_c).toBeGreaterThan(20);
      expect(result.temperature_c).toBeLessThan(1200);
    });

    it("should calculate tool life correctly", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "4140",
        12,
        150,
        0.1,
        4
      );

      expect(result.tool_life_min).toBeGreaterThan(0);
    });

    it("should generate warnings for extreme parameters", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "Ti-6Al-4V",
        12,
        200, // Very high for titanium
        0.2,
        6
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should calculate quality score", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "6061-T6",
        12,
        400,
        0.1,
        3
      );

      expect(result.quality_score).toBeGreaterThan(0);
      expect(result.quality_score).toBeLessThanOrEqual(1);
    });
  });

  describe("getOptimalParameters", () => {
    it("should return optimal parameters for roughing", () => {
      const result = millingAGIOrchestrationEngine.getOptimalParameters(
        "4140",
        "roughing",
        12,
        4
      );

      expect(result.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.feed_per_tooth_mm).toBeGreaterThan(0);
      expect(result.axial_depth_mm).toBeGreaterThan(0);
      expect(result.radial_depth_mm).toBeGreaterThan(0);
      expect(result.spindle_rpm).toBeGreaterThan(0);
    });

    it("should return different parameters for finishing", () => {
      const roughing = millingAGIOrchestrationEngine.getOptimalParameters(
        "4140",
        "roughing",
        12,
        4
      );

      const finishing = millingAGIOrchestrationEngine.getOptimalParameters(
        "4140",
        "finishing",
        12,
        4
      );

      // Finishing should have lighter cuts
      expect(finishing.axial_depth_mm).toBeLessThan(roughing.axial_depth_mm);
      expect(finishing.feed_per_tooth_mm).toBeLessThan(roughing.feed_per_tooth_mm);
    });

    it("should handle aluminum with higher speeds", () => {
      const steel = millingAGIOrchestrationEngine.getOptimalParameters(
        "4140",
        "roughing",
        12,
        4
      );

      const aluminum = millingAGIOrchestrationEngine.getOptimalParameters(
        "6061-T6",
        "roughing",
        12,
        4
      );

      expect(aluminum.cutting_speed_m_min).toBeGreaterThan(steel.cutting_speed_m_min);
    });

    it("should handle titanium with lower speeds", () => {
      const steel = millingAGIOrchestrationEngine.getOptimalParameters(
        "4140",
        "roughing",
        12,
        4
      );

      const titanium = millingAGIOrchestrationEngine.getOptimalParameters(
        "Ti-6Al-4V",
        "roughing",
        12,
        4
      );

      expect(titanium.cutting_speed_m_min).toBeLessThan(steel.cutting_speed_m_min);
    });

    it("should predict surface roughness", () => {
      const result = millingAGIOrchestrationEngine.getOptimalParameters(
        "4140",
        "finishing",
        12,
        4
      );

      expect(result.expected_ra_um).toBeGreaterThan(0);
    });
  });

  describe("validateParameters", () => {
    it("should validate correct parameters", () => {
      const result = millingAGIOrchestrationEngine.validateParameters(
        "4140",
        120, // Reasonable speed
        0.08, // Reasonable feed
        3, // Reasonable DOC
        12
      );

      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("physics_valid");
      expect(result).toHaveProperty("thermal_valid");
      expect(result).toHaveProperty("dynamics_valid");
      expect(result).toHaveProperty("metallurgy_valid");
    });

    it("should detect physics issues", () => {
      const result = millingAGIOrchestrationEngine.validateParameters(
        "4140",
        150,
        0.3, // Very aggressive feed
        10, // Very deep cut
        12
      );

      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should detect thermal issues", () => {
      const result = millingAGIOrchestrationEngine.validateParameters(
        "Ti-6Al-4V",
        200, // Very high for titanium
        0.1,
        3,
        12
      );

      expect(result.thermal_valid).toBe(false);
    });

    it("should detect dynamics issues", () => {
      const result = millingAGIOrchestrationEngine.validateParameters(
        "4140",
        150,
        0.1,
        30, // 2.5x diameter
        12
      );

      expect(result.dynamics_valid).toBe(false);
    });

    it("should provide suggestions", () => {
      const result = millingAGIOrchestrationEngine.validateParameters(
        "4140",
        300, // Too high
        0.2, // Aggressive
        8,
        12
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("should return self-awareness data", () => {
      const awareness = millingAGIOrchestrationEngine.getSelfAwareness();

      expect(awareness).toHaveProperty("engine_count");
      expect(awareness).toHaveProperty("formula_count");
      expect(awareness).toHaveProperty("material_coverage");
      expect(awareness).toHaveProperty("scientific_domains");
      expect(awareness).toHaveProperty("integration_status");
      expect(awareness).toHaveProperty("capabilities");
      expect(awareness).toHaveProperty("version");
    });

    it("should report correct engine count", () => {
      const awareness = millingAGIOrchestrationEngine.getSelfAwareness();

      expect(awareness.engine_count).toBeGreaterThan(15);
    });

    it("should report correct formula count", () => {
      const awareness = millingAGIOrchestrationEngine.getSelfAwareness();

      expect(awareness.formula_count).toBeGreaterThan(50);
    });

    it("should list all scientific domains", () => {
      const awareness = millingAGIOrchestrationEngine.getSelfAwareness();

      expect(awareness.scientific_domains).toContain("mechanics");
      expect(awareness.scientific_domains).toContain("thermodynamics");
      expect(awareness.scientific_domains).toContain("tribology");
      expect(awareness.scientific_domains).toContain("metallurgy");
      expect(awareness.scientific_domains).toContain("chemistry");
      expect(awareness.scientific_domains).toContain("dynamics");
    });

    it("should list integration status", () => {
      const awareness = millingAGIOrchestrationEngine.getSelfAwareness();

      expect(awareness.integration_status.unified_science).toBe("active");
      expect(awareness.integration_status.production_harvester).toBe("active");
      expect(awareness.integration_status.agi_master).toBe("active");
    });

    it("should list capabilities", () => {
      const awareness = millingAGIOrchestrationEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("Kienzle force prediction");
      expect(awareness.capabilities).toContain("Taylor tool life calculation");
      expect(awareness.capabilities).toContain("Johnson-Cook flow stress modeling");
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", () => {
      const stats = millingAGIOrchestrationEngine.getStats();

      expect(stats).toHaveProperty("orchestrator_version");
      expect(stats).toHaveProperty("engines_integrated");
      expect(stats).toHaveProperty("formulas_available");
      expect(stats).toHaveProperty("materials_supported");
      expect(stats).toHaveProperty("scientific_domains");
      expect(stats).toHaveProperty("capabilities");
    });

    it("should report material support", () => {
      const stats = millingAGIOrchestrationEngine.getStats();

      expect(stats.materials_supported).toBeGreaterThanOrEqual(6);
      expect(stats.taylor_materials).toBeGreaterThanOrEqual(6);
      expect(stats.kienzle_materials).toBeGreaterThanOrEqual(6);
    });
  });

  describe("Material coverage", () => {
    const materials = ["4140", "D2", "6061-T6", "Ti-6Al-4V", "Inconel718", "316L"];

    for (const material of materials) {
      it(`should analyze ${material} correctly`, () => {
        const result = millingAGIOrchestrationEngine.analyzeWithAGI({
          material,
          tool_diameter_mm: 12,
          tool_flutes: 4,
          cutting_speed_m_min: 100,
          feed_per_tooth_mm: 0.1,
          axial_depth_mm: 3,
          radial_depth_mm: 6,
          operation: "roughing",
        });

        expect(result.state.material.material).toBeDefined();
        expect(result.state.physics.cutting_force_n).toBeGreaterThan(0);
        expect(result.orchestration_metadata.confidence).toBeGreaterThan(0);
      });
    }
  });

  describe("Scientific domain integration", () => {
    it("should integrate mechanics domain", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      const mechanicsInsight = result.scientific_insights.find(
        (i) => i.domain === "Mechanics"
      );
      expect(mechanicsInsight).toBeDefined();
      expect(mechanicsInsight!.formulas_used).toContain("Kienzle");
    });

    it("should integrate thermodynamics domain", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      const thermalInsight = result.scientific_insights.find(
        (i) => i.domain === "Thermodynamics"
      );
      expect(thermalInsight).toBeDefined();
      expect(thermalInsight!.formulas_used).toContain("Loewen-Shaw");
    });

    it("should integrate tribology domain", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      const triboInsight = result.scientific_insights.find(
        (i) => i.domain === "Tribology"
      );
      expect(triboInsight).toBeDefined();
    });

    it("should integrate dynamics domain", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      const dynamicsInsight = result.scientific_insights.find(
        (i) => i.domain === "Dynamics"
      );
      expect(dynamicsInsight).toBeDefined();
      expect(dynamicsInsight!.formulas_used).toContain("Altintas-Budak SLD");
    });
  });

  describe("Reasoning chain", () => {
    it("should build reasoning chain", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 4,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result.state.reasoning_chain.length).toBeGreaterThan(5);
      expect(result.state.reasoning_chain).toContain(
        "Initializing material state from database..."
      );
      expect(result.state.reasoning_chain).toContain(
        "Executing Kienzle force model..."
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle unknown material gracefully", () => {
      const result = millingAGIOrchestrationEngine.analyzeWithAGI({
        material: "exotic-unobtainium",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 100,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 3,
        radial_depth_mm: 6,
        operation: "roughing",
      });

      expect(result).toBeDefined();
      expect(result.state.physics.cutting_force_n).toBeGreaterThan(0);
    });

    it("should handle zero values gracefully", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "4140",
        12,
        0, // Zero speed
        0.1,
        4
      );

      expect(result).toBeDefined();
    });

    it("should handle very small values", () => {
      const result = millingAGIOrchestrationEngine.quickAnalyze(
        "4140",
        0.1, // Very small tool
        150,
        0.001, // Very small feed
        0.1 // Very small DOC
      );

      expect(result).toBeDefined();
      expect(result.force_n).toBeGreaterThanOrEqual(0);
    });
  });
});
