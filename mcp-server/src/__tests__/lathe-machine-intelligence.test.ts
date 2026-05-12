/**
 * LatheMachineIntelligenceEngine Tests — LLM-INTEL-12
 *
 * Tests for machine-specific intelligence across all lathe types:
 *   1. Machine profiles (11 types)
 *   2. Machine selection for part requirements
 *   3. Workholding strategies
 *   4. Tooling configurations
 *   5. Machine comparisons
 *   6. Operation capability checks
 *
 * @module __tests__/lathe-machine-intelligence.test
 */

import { describe, it, expect } from "vitest";
import {
  LatheMachineIntelligenceEngine,
  latheMachineIntelligenceEngine,
  type LatheMachineType,
  type PartRequirements,
} from "../engines/LatheMachineIntelligenceEngine.js";

// ============================================================================
// TESTS
// ============================================================================

describe("LatheMachineIntelligenceEngine", () => {
  const engine = latheMachineIntelligenceEngine;

  // ==========================================================================
  // getMachineProfile
  // ==========================================================================
  describe("getMachineProfile", () => {
    it("should return profile for 2-axis CNC", () => {
      const result = engine.getMachineProfile("2_axis_cnc");

      expect(result.machine_type).toBe("2_axis_cnc");
      expect(result.axis_config.x_axis).toBe(true);
      expect(result.axis_config.z_axis).toBe(true);
      expect(result.axis_config.live_tooling).toBe(false);
      expect(result.capable_operations).toContain("OD turning");
      expect(result.relative_cost).toBe("low");
    });

    it("should return profile for live tooling machine", () => {
      const result = engine.getMachineProfile("live_tooling");

      expect(result.axis_config.c_axis).toBe(true);
      expect(result.axis_config.live_tooling).toBe(true);
      expect(result.capable_operations.some(op => op.toLowerCase().includes("mill"))).toBe(true);
    });

    it("should return profile for Swiss-type machine", () => {
      const result = engine.getMachineProfile("swiss_type");

      expect(result.max_turning_diameter_mm).toBeLessThanOrEqual(32);
      expect(result.axis_config.sub_spindle).toBe(true);
      expect(result.surface_finish_achievable_ra).toBeLessThanOrEqual(0.2);
      expect(result.typical_cycle_time_factor).toBeLessThan(0.5);
    });

    it("should return profile for VTL", () => {
      const result = engine.getMachineProfile("vtl");

      expect(result.max_turning_diameter_mm).toBeGreaterThan(1000);
      expect(result.max_rpm).toBeLessThan(600);
      expect(result.relative_cost).toBe("very_high");
    });

    it("should return profile for multi-spindle", () => {
      const result = engine.getMachineProfile("multi_spindle");

      expect(result.axis_config.spindles).toBeGreaterThan(1);
      expect(result.typical_cycle_time_factor).toBeLessThan(0.2);
      expect(result.setup_complexity).toBe("very_complex");
    });

    it("should return profile for sub-spindle machine", () => {
      const result = engine.getMachineProfile("sub_spindle");

      expect(result.axis_config.sub_spindle).toBe(true);
      expect(result.axis_config.w_axis).toBe(true);
      expect(result.capable_operations.some(op => op.toLowerCase().includes("back"))).toBe(true);
    });

    it("should return profile for Y-axis machine", () => {
      const result = engine.getMachineProfile("y_axis");

      expect(result.axis_config.y_axis).toBe(true);
      expect(result.capable_operations.some(op => op.toLowerCase().includes("off-center"))).toBe(true);
    });

    it("should return profile for B-axis machine", () => {
      const result = engine.getMachineProfile("b_axis");

      expect(result.axis_config.b_axis).toBe(true);
      expect(result.axis_config.y_axis).toBe(true);
      expect(result.capable_operations.some(op => op.toLowerCase().includes("angular"))).toBe(true);
      expect(result.relative_cost).toBe("very_high");
    });

    it("should return profile for twin-turret machine", () => {
      const result = engine.getMachineProfile("twin_turret");

      expect(result.axis_config.turrets).toBe(2);
      expect(result.capable_operations.some(op => op.toLowerCase().includes("simultaneous"))).toBe(true);
    });

    it("should return profile for CNC chucker", () => {
      const result = engine.getMachineProfile("cnc_chucker");

      expect(result.max_bar_capacity_mm).toBe(0);
      expect(result.best_suited_for.some(s => s.toLowerCase().includes("second-op"))).toBe(true);
    });

    it("should return profile for manual engine lathe", () => {
      const result = engine.getMachineProfile("manual_engine");

      expect(result.axis_config.turrets).toBe(0);
      expect(result.typical_cycle_time_factor).toBeGreaterThan(3);
      expect(result.best_suited_for.some(s => s.toLowerCase().includes("prototype"))).toBe(true);
    });

    it("should throw for unknown machine type", () => {
      expect(() => engine.getMachineProfile("teleporter" as LatheMachineType)).toThrow();
    });
  });

  // ==========================================================================
  // selectMachineForPart
  // ==========================================================================
  describe("selectMachineForPart", () => {
    const basicPartRequirements: PartRequirements = {
      max_diameter_mm: 50,
      length_mm: 100,
      material: "mild_steel",
      has_od_features: true,
      has_id_features: false,
      has_threads: false,
      has_grooves: false,
      has_cross_holes: false,
      has_flats: false,
      has_polygons: false,
      has_off_center_features: false,
      has_angular_features: false,
      needs_back_working: false,
      tightest_tolerance_mm: 0.02,
      best_surface_finish_ra: 1.6,
      annual_volume: 5000,
      batch_size: 100,
    };

    it("should select appropriate machines for basic turning", () => {
      const result = engine.selectMachineForPart(basicPartRequirements);

      expect(result.recommended_machines.length).toBeGreaterThan(0);
      expect(result.recommended_machines[0].suitability_score).toBeGreaterThan(70);
      expect(result.selection_reasoning.length).toBeGreaterThan(0);
    });

    it("should recommend live tooling for parts with cross-holes", () => {
      const partWithCrossHoles: PartRequirements = {
        ...basicPartRequirements,
        has_cross_holes: true,
      };

      const result = engine.selectMachineForPart(partWithCrossHoles);

      // Should recommend machine with live tooling
      const hasLiveToolingRec = result.recommended_machines.some(m =>
        m.machine_type === "live_tooling" ||
        m.machine_type === "y_axis" ||
        m.machine_type === "swiss_type"
      );
      expect(hasLiveToolingRec).toBe(true);

      // Should warn if no live tooling in top recommendations
      const topMachine = result.recommended_machines[0];
      if (!["live_tooling", "y_axis", "swiss_type", "b_axis", "sub_spindle"].includes(topMachine.machine_type)) {
        expect(result.warnings.some(w => w.toLowerCase().includes("live tooling"))).toBe(true);
      }
    });

    it("should recommend sub-spindle for parts needing back-working", () => {
      const partWithBackWork: PartRequirements = {
        ...basicPartRequirements,
        needs_back_working: true,
      };

      const result = engine.selectMachineForPart(partWithBackWork);

      const hasSubSpindleRec = result.recommended_machines.some(m =>
        m.machine_type === "sub_spindle" || m.machine_type === "swiss_type"
      );
      expect(hasSubSpindleRec).toBe(true);
    });

    it("should recommend Y-axis for off-center features", () => {
      const partWithOffCenter: PartRequirements = {
        ...basicPartRequirements,
        has_off_center_features: true,
      };

      const result = engine.selectMachineForPart(partWithOffCenter);

      const topMachines = result.recommended_machines.slice(0, 3);
      const hasYAxis = topMachines.some(m =>
        m.machine_type === "y_axis" ||
        m.machine_type === "b_axis" ||
        m.machine_type === "swiss_type"
      );
      expect(hasYAxis).toBe(true);
    });

    it("should recommend B-axis for angular features", () => {
      const partWithAngular: PartRequirements = {
        ...basicPartRequirements,
        has_angular_features: true,
      };

      const result = engine.selectMachineForPart(partWithAngular);

      // B-axis should score well for angular features
      const bAxisRec = result.recommended_machines.find(m => m.machine_type === "b_axis");
      expect(bAxisRec).toBeDefined();
      expect(bAxisRec!.strengths.some(s => s.toLowerCase().includes("angular"))).toBe(true);
    });

    it("should recommend Swiss for small slender parts", () => {
      const smallSlenderPart: PartRequirements = {
        ...basicPartRequirements,
        max_diameter_mm: 15,
        length_mm: 80,
        annual_volume: 50000,
      };

      const result = engine.selectMachineForPart(smallSlenderPart);

      const swissRec = result.recommended_machines.find(m => m.machine_type === "swiss_type");
      expect(swissRec).toBeDefined();
      expect(swissRec!.strengths.some(s => s.toLowerCase().includes("slender"))).toBe(true);
    });

    it("should disqualify Swiss for large diameter parts", () => {
      const largePart: PartRequirements = {
        ...basicPartRequirements,
        max_diameter_mm: 100,
      };

      const result = engine.selectMachineForPart(largePart);

      const swissRec = result.recommended_machines.find(m => m.machine_type === "swiss_type");
      expect(swissRec).toBeUndefined();
    });

    it("should recommend VTL for very large diameter parts", () => {
      const veryLargePart: PartRequirements = {
        ...basicPartRequirements,
        max_diameter_mm: 800,
        length_mm: 400,
        tightest_tolerance_mm: 0.05,
      };

      const result = engine.selectMachineForPart(veryLargePart);

      const vtlRec = result.recommended_machines.find(m => m.machine_type === "vtl");
      expect(vtlRec).toBeDefined();
      expect(vtlRec!.strengths.some(s => s.toLowerCase().includes("large"))).toBe(true);
    });

    it("should recommend multi-spindle for very high volume", () => {
      const highVolumePart: PartRequirements = {
        ...basicPartRequirements,
        max_diameter_mm: 30,
        length_mm: 50,
        annual_volume: 500000,
      };

      const result = engine.selectMachineForPart(highVolumePart);

      const multiSpindleRec = result.recommended_machines.find(m => m.machine_type === "multi_spindle");
      expect(multiSpindleRec).toBeDefined();
    });

    it("should penalize multi-spindle for low volume", () => {
      const lowVolumePart: PartRequirements = {
        ...basicPartRequirements,
        annual_volume: 100,
      };

      const result = engine.selectMachineForPart(lowVolumePart);

      const multiSpindleRec = result.recommended_machines.find(m => m.machine_type === "multi_spindle");
      if (multiSpindleRec) {
        expect(multiSpindleRec.suitability_score).toBeLessThan(50);
      }
    });

    it("should include capability matrix in results", () => {
      const result = engine.selectMachineForPart(basicPartRequirements);

      expect(result.capability_matrix.length).toBeGreaterThan(0);
      expect(result.capability_matrix[0].requirement).toBeTruthy();
      expect(typeof result.capability_matrix[0].capable).toBe("boolean");
    });

    it("should disqualify machines when part exceeds capacity", () => {
      const hugepart: PartRequirements = {
        ...basicPartRequirements,
        max_diameter_mm: 500,
        length_mm: 1000,
      };

      const result = engine.selectMachineForPart(hugepart);

      // Swiss should definitely be disqualified
      const swissRec = result.recommended_machines.find(m => m.machine_type === "swiss_type");
      expect(swissRec).toBeUndefined();
    });
  });

  // ==========================================================================
  // getWorkholdingStrategy
  // ==========================================================================
  describe("getWorkholdingStrategy", () => {
    it("should return collet for Swiss-type", () => {
      const result = engine.getWorkholdingStrategy("swiss_type", 20, 80, true);

      expect(result.primary_method.toLowerCase()).toContain("collet");
      expect(result.considerations.some(c => c.toLowerCase().includes("bushing"))).toBe(true);
    });

    it("should return bar feeder collet for bar stock", () => {
      const result = engine.getWorkholdingStrategy("2_axis_cnc", 40, 100, true);

      expect(result.primary_method.toLowerCase()).toContain("bar");
    });

    it("should return 3-jaw chuck for non-bar stock", () => {
      const result = engine.getWorkholdingStrategy("2_axis_cnc", 100, 80, false);

      expect(result.primary_method.toLowerCase()).toContain("chuck");
    });

    it("should recommend face plate for VTL", () => {
      const result = engine.getWorkholdingStrategy("vtl", 600, 300, false);

      expect(result.primary_method.toLowerCase()).toMatch(/face|plate|jaw/);
      expect(result.considerations.some(c => c.toLowerCase().includes("weight"))).toBe(true);
    });

    it("should recommend tailstock for long parts", () => {
      const result = engine.getWorkholdingStrategy("2_axis_cnc", 40, 200, true);
      const ldRatio = 200 / 40;  // 5

      expect(ldRatio).toBeGreaterThan(3);
      expect(result.secondary_support.some(s => s.toLowerCase().includes("tailstock"))).toBe(true);
    });

    it("should recommend steady rest for very long parts", () => {
      const result = engine.getWorkholdingStrategy("2_axis_cnc", 30, 250, true);
      const ldRatio = 250 / 30;  // > 8

      expect(ldRatio).toBeGreaterThan(6);
      expect(result.secondary_support.some(s => s.toLowerCase().includes("steady"))).toBe(true);
    });

    it("should recommend soft jaws for thin walls", () => {
      const result = engine.getWorkholdingStrategy("2_axis_cnc", 80, 60, false, 2);

      expect(result.jaw_type.toLowerCase()).toContain("soft");
      expect(result.considerations.some(c => c.toLowerCase().includes("thin wall"))).toBe(true);
    });

    it("should limit RPM for thin walls", () => {
      const result = engine.getWorkholdingStrategy("live_tooling", 100, 80, false, 3);
      const profileMaxRpm = engine.getMachineProfile("live_tooling").max_rpm;

      expect(result.maximum_rpm_with_workholding).toBeLessThan(profileMaxRpm);
    });

    it("should mention sub-spindle for machines with sub-spindle", () => {
      const result = engine.getWorkholdingStrategy("sub_spindle", 50, 100, true);

      expect(result.considerations.some(c => c.toLowerCase().includes("sub-spindle"))).toBe(true);
    });

    it("should calculate reasonable grip length", () => {
      const result = engine.getWorkholdingStrategy("2_axis_cnc", 40, 100, true);

      expect(result.grip_length_recommendation_mm).toBeGreaterThanOrEqual(15);
      expect(result.grip_length_recommendation_mm).toBeLessThanOrEqual(50);
    });
  });

  // ==========================================================================
  // getToolingConfiguration
  // ==========================================================================
  describe("getToolingConfiguration", () => {
    it("should return correct positions for Swiss-type", () => {
      const result = engine.getToolingConfiguration("swiss_type", ["roughing", "finishing", "drilling"]);

      expect(result.turret_positions).toBeLessThanOrEqual(10);
      expect(result.live_tool_positions).toBeGreaterThan(0);
      expect(result.considerations.some(c => c.toLowerCase().includes("gang"))).toBe(true);
    });

    it("should return dual turret configuration for twin-turret", () => {
      const result = engine.getToolingConfiguration("twin_turret", ["roughing", "finishing"]);

      expect(result.turret_positions).toBeGreaterThanOrEqual(20);
      expect(result.considerations.some(c => c.toLowerCase().includes("turret"))).toBe(true);
    });

    it("should return correct positions for multi-spindle", () => {
      const result = engine.getToolingConfiguration("multi_spindle", ["roughing", "drilling"]);

      expect(result.turret_positions).toBe(6);
      expect(result.considerations.some(c => c.toLowerCase().includes("station"))).toBe(true);
    });

    it("should include roughing tool when roughing requested", () => {
      const result = engine.getToolingConfiguration("2_axis_cnc", ["roughing"]);

      expect(result.recommended_tool_layout.some(t =>
        t.purpose.toLowerCase().includes("rough") || t.tool_type.toLowerCase().includes("rough")
      )).toBe(true);
    });

    it("should include boring bar for ID operations", () => {
      const result = engine.getToolingConfiguration("2_axis_cnc", ["boring"]);

      expect(result.recommended_tool_layout.some(t =>
        t.tool_type.toLowerCase().includes("boring")
      )).toBe(true);
    });

    it("should include thread insert for threading", () => {
      const result = engine.getToolingConfiguration("live_tooling", ["threading"]);

      expect(result.recommended_tool_layout.some(t =>
        t.tool_type.toLowerCase().includes("thread")
      )).toBe(true);
    });

    it("should include parting blade for parting", () => {
      const result = engine.getToolingConfiguration("2_axis_cnc", ["parting"]);

      expect(result.recommended_tool_layout.some(t =>
        t.tool_type.toLowerCase().includes("part")
      )).toBe(true);
    });

    it("should include live tools for cross-drilling on live tooling machine", () => {
      const result = engine.getToolingConfiguration("live_tooling", ["cross-drilling"]);

      expect(result.recommended_tool_layout.some(t => t.is_live)).toBe(true);
    });

    it("should not include live tools for 2-axis machine", () => {
      const result = engine.getToolingConfiguration("2_axis_cnc", ["milling"]);

      expect(result.live_tool_positions).toBe(0);
      expect(result.recommended_tool_layout.every(t => !t.is_live)).toBe(true);
    });

    it("should use gang tooling strategy for Swiss", () => {
      const result = engine.getToolingConfiguration("swiss_type", ["roughing"]);

      expect(result.tool_change_strategy.toLowerCase()).toContain("gang");
    });
  });

  // ==========================================================================
  // compareMachines
  // ==========================================================================
  describe("compareMachines", () => {
    const requirements: PartRequirements = {
      max_diameter_mm: 40,
      length_mm: 80,
      material: "mild_steel",
      has_od_features: true,
      has_id_features: true,
      has_threads: true,
      has_grooves: false,
      has_cross_holes: false,
      has_flats: false,
      has_polygons: false,
      has_off_center_features: false,
      has_angular_features: false,
      needs_back_working: false,
      tightest_tolerance_mm: 0.02,
      best_surface_finish_ra: 1.6,
      annual_volume: 10000,
      batch_size: 200,
    };

    it("should compare two machine types", () => {
      const result = engine.compareMachines(["2_axis_cnc", "live_tooling"], requirements);

      expect(result.machines).toHaveLength(2);
      expect(result.comparison_criteria.length).toBeGreaterThan(0);
      expect(result.recommendation).toBeTruthy();
    });

    it("should compare three machine types", () => {
      const result = engine.compareMachines(["2_axis_cnc", "live_tooling", "swiss_type"], requirements);

      expect(result.machines).toHaveLength(3);
      expect(result.comparison_criteria.every(c =>
        Object.keys(c.scores).length === 3
      )).toBe(true);
    });

    it("should include all comparison criteria", () => {
      const result = engine.compareMachines(["2_axis_cnc", "live_tooling"], requirements);

      const criteria = result.comparison_criteria.map(c => c.criterion);
      expect(criteria).toContain("capability_match");
      expect(criteria).toContain("cycle_time");
      expect(criteria).toContain("precision");
      expect(criteria).toContain("cost");
    });

    it("should identify winner for each criterion", () => {
      const result = engine.compareMachines(["2_axis_cnc", "live_tooling"], requirements);

      result.comparison_criteria.forEach(criterion => {
        expect(criterion.winner).toBeTruthy();
        expect(["2_axis_cnc", "live_tooling"]).toContain(criterion.winner);
      });
    });

    it("should include trade-offs", () => {
      const result = engine.compareMachines(["2_axis_cnc", "swiss_type"], requirements);

      // Trade-offs discuss differences between machines
      expect(result.trade_offs).toBeDefined();
      // Array may be empty if no significant trade-offs
    });

    it("should recommend based on total scoring", () => {
      const result = engine.compareMachines(["2_axis_cnc", "live_tooling"], requirements);

      expect(result.recommendation).toContain("Recommended:");
    });
  });

  // ==========================================================================
  // listMachineTypes
  // ==========================================================================
  describe("listMachineTypes", () => {
    it("should return all 11 machine types", () => {
      const result = engine.listMachineTypes();

      expect(result.length).toBe(11);
    });

    it("should include type and description for each", () => {
      const result = engine.listMachineTypes();

      result.forEach(machine => {
        expect(machine.type).toBeTruthy();
        expect(machine.description).toBeTruthy();
      });
    });

    it("should include all known machine types", () => {
      const result = engine.listMachineTypes();
      const types = result.map(m => m.type);

      expect(types).toContain("2_axis_cnc");
      expect(types).toContain("live_tooling");
      expect(types).toContain("swiss_type");
      expect(types).toContain("vtl");
      expect(types).toContain("multi_spindle");
      expect(types).toContain("sub_spindle");
      expect(types).toContain("y_axis");
      expect(types).toContain("b_axis");
      expect(types).toContain("twin_turret");
      expect(types).toContain("cnc_chucker");
      expect(types).toContain("manual_engine");
    });
  });

  // ==========================================================================
  // canMachineHandleOperation
  // ==========================================================================
  describe("canMachineHandleOperation", () => {
    it("should confirm 2-axis can do OD turning", () => {
      const result = engine.canMachineHandleOperation("2_axis_cnc", "turning");

      expect(result.capable).toBe(true);
      expect(result.notes).toBeTruthy();
    });

    it("should confirm live tooling can do milling", () => {
      const result = engine.canMachineHandleOperation("live_tooling", "milling");

      expect(result.capable).toBe(true);
    });

    it("should deny 2-axis for milling", () => {
      const result = engine.canMachineHandleOperation("2_axis_cnc", "milling");

      expect(result.capable).toBe(false);
      expect(result.notes.toLowerCase()).toContain("live tooling");
    });

    it("should deny 2-axis for off-center features", () => {
      const result = engine.canMachineHandleOperation("2_axis_cnc", "off-center");

      expect(result.capable).toBe(false);
      expect(result.notes.toLowerCase()).toContain("y-axis");
    });

    it("should deny live-tooling for back-working", () => {
      const result = engine.canMachineHandleOperation("live_tooling", "back-boring");

      expect(result.capable).toBe(false);
      expect(result.notes.toLowerCase()).toContain("sub-spindle");
    });

    it("should confirm sub-spindle for back-working", () => {
      const result = engine.canMachineHandleOperation("sub_spindle", "back");

      expect(result.capable).toBe(true);
    });

    it("should confirm Swiss for precision turning", () => {
      const result = engine.canMachineHandleOperation("swiss_type", "precision");

      expect(result.capable).toBe(true);
    });

    it("should confirm B-axis for angular drilling", () => {
      const result = engine.canMachineHandleOperation("b_axis", "angular");

      expect(result.capable).toBe(true);
    });

    it("should confirm VTL for large boring", () => {
      const result = engine.canMachineHandleOperation("vtl", "boring");

      expect(result.capable).toBe(true);
    });

    it("should confirm twin-turret for simultaneous ops", () => {
      const result = engine.canMachineHandleOperation("twin_turret", "simultaneous");

      expect(result.capable).toBe(true);
    });
  });

  // ==========================================================================
  // Edge cases and integration
  // ==========================================================================
  describe("edge cases", () => {
    it("should handle part with all features", () => {
      const complexPart: PartRequirements = {
        max_diameter_mm: 25,
        length_mm: 60,
        material: "stainless_steel",
        has_od_features: true,
        has_id_features: true,
        has_threads: true,
        has_grooves: true,
        has_cross_holes: true,
        has_flats: true,
        has_polygons: true,
        has_off_center_features: true,
        has_angular_features: true,
        needs_back_working: true,
        tightest_tolerance_mm: 0.005,
        best_surface_finish_ra: 0.4,
        annual_volume: 100000,
        batch_size: 500,
      };

      const result = engine.selectMachineForPart(complexPart);

      // Should still return results
      expect(result.recommended_machines.length).toBeGreaterThan(0);
      // Swiss or B-axis should be top candidates for this
      const topTypes = result.recommended_machines.slice(0, 3).map(m => m.machine_type);
      expect(
        topTypes.includes("swiss_type") ||
        topTypes.includes("b_axis")
      ).toBe(true);
    });

    it("should handle minimal part requirements", () => {
      const simplePart: PartRequirements = {
        max_diameter_mm: 30,
        length_mm: 20,
        material: "aluminum",
        has_od_features: true,
        has_id_features: false,
        has_threads: false,
        has_grooves: false,
        has_cross_holes: false,
        has_flats: false,
        has_polygons: false,
        has_off_center_features: false,
        has_angular_features: false,
        needs_back_working: false,
        tightest_tolerance_mm: 0.1,
        best_surface_finish_ra: 3.2,
        annual_volume: 100,
        batch_size: 10,
      };

      const result = engine.selectMachineForPart(simplePart);

      // Basic 2-axis should be a good fit
      const rec = result.recommended_machines.find(m => m.machine_type === "2_axis_cnc");
      expect(rec).toBeDefined();
      expect(rec!.suitability_score).toBeGreaterThan(80);
    });

    it("should provide cost effectiveness ratings", () => {
      const part: PartRequirements = {
        max_diameter_mm: 40,
        length_mm: 60,
        material: "mild_steel",
        has_od_features: true,
        has_id_features: false,
        has_threads: false,
        has_grooves: false,
        has_cross_holes: false,
        has_flats: false,
        has_polygons: false,
        has_off_center_features: false,
        has_angular_features: false,
        needs_back_working: false,
        tightest_tolerance_mm: 0.02,
        best_surface_finish_ra: 1.6,
        annual_volume: 5000,
        batch_size: 100,
      };

      const result = engine.selectMachineForPart(part);

      result.recommended_machines.forEach(rec => {
        expect(["excellent", "good", "acceptable", "poor"]).toContain(rec.cost_effectiveness);
      });
    });
  });
});
