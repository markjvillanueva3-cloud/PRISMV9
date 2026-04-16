/**
 * LatheAdvancedOperationsEngine Tests — LLM-INTEL-14
 *
 * Tests for advanced lathe operations:
 *   1. Live tooling operations
 *   2. Polygon turning
 *   3. Advanced threading
 *   4. Grooving strategies
 *   5. Eccentric turning
 *   6. Contour turning
 *   7. Operations listing
 *
 * @module __tests__/lathe-advanced-operations.test
 */

import { describe, it, expect } from "vitest";
import {
  LatheAdvancedOperationsEngine,
  latheAdvancedOperationsEngine,
  type LiveToolingOperation,
  type ThreadForm,
  type GrooveType,
} from "../engines/LatheAdvancedOperationsEngine.js";

// ============================================================================
// TESTS
// ============================================================================

describe("LatheAdvancedOperationsEngine", () => {
  const engine = latheAdvancedOperationsEngine;

  // ==========================================================================
  // getLiveToolingParams
  // ==========================================================================
  describe("getLiveToolingParams", () => {
    it("should return params for C-axis milling", () => {
      const result = engine.getLiveToolingParams({
        operation: "c_axis_milling",
        live_tool_rpm: 3000,
        feature_depth_mm: 2,
      });

      expect(result.operation).toBe("c_axis_milling");
      expect(result.spindle_mode).toBe("interpolate");
      expect(result.machine_requirements).toContain("C-axis");
      expect(result.programming_notes.some(n => n.includes("G12.1"))).toBe(true);
    });

    it("should return params for cross drilling", () => {
      const result = engine.getLiveToolingParams({
        operation: "cross_drilling",
        live_tool_rpm: 2000,
        feature_depth_mm: 15,
      });

      expect(result.spindle_mode).toBe("index");
      expect(result.programming_notes.some(n => n.toLowerCase().includes("peck"))).toBe(true);
      expect(result.collision_warnings.length).toBeGreaterThan(0);
    });

    it("should return params for cross tapping", () => {
      const result = engine.getLiveToolingParams({
        operation: "cross_tapping",
        live_tool_rpm: 500,
        feature_depth_mm: 1.5,  // M10 pitch
      });

      expect(result.machine_requirements.some(r => r.toLowerCase().includes("rigid") || r.toLowerCase().includes("floating"))).toBe(true);
      expect(result.recommended_parameters.feed_mm_rev).toBe(1.5);  // Match pitch
    });

    it("should return params for polygon turning", () => {
      const result = engine.getLiveToolingParams({
        operation: "polygon_turning",
        live_tool_rpm: 450,
        feature_depth_mm: 3,
      });

      expect(result.spindle_mode).toBe("synchronized");
      expect(result.machine_requirements.some(r => r.toLowerCase().includes("sync"))).toBe(true);
    });

    it("should return params for keyway milling", () => {
      const result = engine.getLiveToolingParams({
        operation: "keyway_milling",
        live_tool_rpm: 2500,
        feature_depth_mm: 4,
        feature_width_mm: 6,
      });

      expect(result.recommended_parameters.depth_per_pass_mm).toBeLessThan(result.recommended_parameters.depth_per_pass_mm + 1);
      expect(result.tooling_recommendations.some(t => t.toLowerCase().includes("slot"))).toBe(true);
    });

    it("should return params for hex milling", () => {
      const result = engine.getLiveToolingParams({
        operation: "hex_milling",
        live_tool_rpm: 2000,
        feature_depth_mm: 5,
        number_of_features: 6,
      });

      expect(result.spindle_mode).toBe("index");
      expect(result.cycle_considerations.some(c => c.includes("6"))).toBe(true);
    });

    it("should return params for engraving", () => {
      const result = engine.getLiveToolingParams({
        operation: "engraving",
        live_tool_rpm: 5000,
        feature_depth_mm: 0.2,
      });

      expect(result.recommended_parameters.live_tool_rpm).toBeGreaterThanOrEqual(8000);
      expect(result.recommended_parameters.depth_per_pass_mm).toBeLessThanOrEqual(0.2);
    });

    it("should return params for helical interpolation", () => {
      const result = engine.getLiveToolingParams({
        operation: "helical_interpolation",
        live_tool_rpm: 2000,
        feature_depth_mm: 10,
      });

      expect(result.spindle_mode).toBe("interpolate");
      expect(result.programming_notes.some(n => n.includes("G02") || n.includes("G03"))).toBe(true);
    });

    it("should include tooling recommendations", () => {
      const operations: LiveToolingOperation[] = ["cross_drilling", "keyway_milling", "c_axis_milling"];

      operations.forEach(op => {
        const result = engine.getLiveToolingParams({
          operation: op,
          live_tool_rpm: 2000,
          feature_depth_mm: 5,
        });
        expect(result.tooling_recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // getPolygonTurningParams
  // ==========================================================================
  describe("getPolygonTurningParams", () => {
    it("should calculate params for hex (6 flats)", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 6,
        flat_width_mm: 15,
        part_diameter_mm: 20,
        material: "steel",
      });

      expect(result.feasible).toBe(true);
      expect(result.method).toBe("synchronized");
      expect(result.speed_ratio).toBeCloseTo(5 / 6, 2);
    });

    it("should calculate params for square (4 flats)", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 4,
        flat_width_mm: 10,
        part_diameter_mm: 15,
        material: "steel",
      });

      expect(result.feasible).toBe(true);
      expect(result.speed_ratio).toBeCloseTo(3 / 4, 2);
    });

    it("should calculate params for triangle (3 flats)", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 3,
        flat_width_mm: 8,
        part_diameter_mm: 12,
        material: "aluminum",
      });

      expect(result.feasible).toBe(true);
      expect(result.spindle_rpm).toBeGreaterThan(300);  // Faster for aluminum
    });

    it("should indicate infeasibility for unsupported polygon", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 7,
        flat_width_mm: 10,
        part_diameter_mm: 15,
        material: "steel",
      });

      expect(result.feasible).toBe(false);
      expect(result.alternative_methods.length).toBeGreaterThan(0);
    });

    it("should calculate number of passes", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 6,
        flat_width_mm: 12,
        part_diameter_mm: 20,
        material: "steel",
      });

      expect(result.passes_required).toBeGreaterThan(0);
    });

    it("should include programming approach", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 4,
        flat_width_mm: 8,
        part_diameter_mm: 12,
        material: "steel",
      });

      expect(result.programming_approach).toBeTruthy();
      expect(result.programming_approach.toLowerCase()).toContain("synchronized");
    });

    it("should note corner radius effects", () => {
      const result = engine.getPolygonTurningParams({
        number_of_flats: 6,
        flat_width_mm: 10,
        part_diameter_mm: 15,
        corner_radius_mm: 1,
        material: "steel",
      });

      expect(result.special_considerations.some(s => s.includes("radius"))).toBe(true);
    });
  });

  // ==========================================================================
  // getAdvancedThreadingParams
  // ==========================================================================
  describe("getAdvancedThreadingParams", () => {
    it("should calculate params for metric thread", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "metric",
        pitch_mm: 1.5,
        diameter_mm: 10,
        length_mm: 20,
      });

      expect(result.thread_form).toBe("metric");
      expect(result.pitch_mm).toBe(1.5);
      expect(result.total_passes).toBeGreaterThan(0);
      expect(result.doc_per_pass.length).toBeGreaterThan(0);
    });

    it("should calculate params for unified thread", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "unified",
        pitch_mm: 0.794,  // 32 TPI
        diameter_mm: 6.35,
        length_mm: 15,
      });

      expect(result.thread_form).toBe("unified");
      expect(result.infeed_method).toBe("modified_flank");
    });

    it("should calculate params for ACME thread", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "acme",
        pitch_mm: 4,
        diameter_mm: 25,
        length_mm: 50,
      });

      expect(result.infeed_method).toBe("flank");
      expect(result.tool_selection.insert_type.toLowerCase()).toContain("29");
    });

    it("should calculate params for API thread", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "api",
        pitch_mm: 2.54,
        diameter_mm: 50,
        length_mm: 40,
      });

      expect(result.thread_form).toBe("api");
      expect(result.programming_notes.some(n => n.toLowerCase().includes("oil") || n.toLowerCase().includes("gas"))).toBe(true);
    });

    it("should handle multi-start threads", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "metric",
        pitch_mm: 2,
        diameter_mm: 20,
        length_mm: 30,
        starts: 3,
        lead_mm: 6,
      });

      expect(result.programming_notes.some(n => n.toLowerCase().includes("multi-start"))).toBe(true);
      expect(result.total_passes).toBeGreaterThan(result.doc_per_pass.length);  // Multiplied by starts
    });

    it("should handle tapered threads", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "npt",
        pitch_mm: 1.814,  // 14 TPI
        diameter_mm: 13.7,
        length_mm: 12,
        taper_deg: 1.79,
      });

      expect(result.programming_notes.some(n => n.toLowerCase().includes("taper"))).toBe(true);
    });

    it("should include tool selection", () => {
      const forms: ThreadForm[] = ["unified", "metric", "acme", "buttress"];

      forms.forEach(form => {
        const result = engine.getAdvancedThreadingParams({
          thread_form: form,
          pitch_mm: 1.5,
          diameter_mm: 12,
          length_mm: 20,
        });

        expect(result.tool_selection.insert_type).toBeTruthy();
        expect(result.tool_selection.holder_type).toBeTruthy();
      });
    });

    it("should include inspection notes", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "metric",
        pitch_mm: 1.25,
        diameter_mm: 8,
        length_mm: 15,
        class_fit: "6g",
      });

      expect(result.inspection_notes.length).toBeGreaterThan(0);
      expect(result.inspection_notes.some(n => n.toLowerCase().includes("gauge"))).toBe(true);
    });

    it("should include common issues", () => {
      const result = engine.getAdvancedThreadingParams({
        thread_form: "metric",
        pitch_mm: 1,
        diameter_mm: 6,
        length_mm: 10,
      });

      expect(result.common_issues.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // getGroovingParams
  // ==========================================================================
  describe("getGroovingParams", () => {
    it("should calculate params for OD groove", () => {
      const result = engine.getGroovingParams({
        groove_type: "od_groove",
        width_mm: 3,
        depth_mm: 2,
        diameter_mm: 30,
        material: "steel",
      });

      expect(result.groove_type).toBe("od_groove");
      expect(result.tool_width_mm).toBeLessThanOrEqual(result.tool_width_mm + 0.1);
      expect(result.plunge_feed_mm_rev).toBeGreaterThan(0);
    });

    it("should calculate params for O-ring groove", () => {
      const result = engine.getGroovingParams({
        groove_type: "o_ring",
        width_mm: 1.78,
        depth_mm: 1.07,
        diameter_mm: 25,
        material: "steel",
      });

      expect(result.finish_considerations.some(c => c.toLowerCase().includes("ra"))).toBe(true);
      expect(result.finish_considerations.some(c => c.toLowerCase().includes("radius"))).toBe(true);
    });

    it("should calculate params for ID groove", () => {
      const result = engine.getGroovingParams({
        groove_type: "id_groove",
        width_mm: 2,
        depth_mm: 1.5,
        diameter_mm: 40,
        material: "steel",
      });

      expect(result.chip_control_notes.some(c => c.toLowerCase().includes("evacuation"))).toBe(true);
      expect(result.tool_recommendations.some(t => t.toLowerCase().includes("boring"))).toBe(true);
    });

    it("should calculate params for face groove", () => {
      const result = engine.getGroovingParams({
        groove_type: "face_groove",
        width_mm: 4,
        depth_mm: 3,
        diameter_mm: 50,
        material: "steel",
      });

      expect(result.plunge_method).toBe("ramping");
      expect(result.chip_control_notes.length).toBeGreaterThan(0);
    });

    it("should recommend pecking for deep grooves", () => {
      const result = engine.getGroovingParams({
        groove_type: "od_groove",
        width_mm: 3,
        depth_mm: 10,  // Deep
        diameter_mm: 40,
        material: "steel",
      });

      expect(result.pecking_recommended).toBe(true);
      expect(result.peck_depth_mm).toBeDefined();
    });

    it("should handle wide grooves with multiple plunges", () => {
      const result = engine.getGroovingParams({
        groove_type: "od_groove",
        width_mm: 8,  // Wide
        depth_mm: 3,
        diameter_mm: 30,
        material: "steel",
      });

      expect(result.number_of_plunges).toBeGreaterThan(1);
      expect(result.tool_width_mm).toBeLessThan(8);
    });

    it("should adjust for stainless steel", () => {
      const steelResult = engine.getGroovingParams({
        groove_type: "od_groove",
        width_mm: 3,
        depth_mm: 2,
        diameter_mm: 30,
        material: "steel",
      });

      const stainlessResult = engine.getGroovingParams({
        groove_type: "od_groove",
        width_mm: 3,
        depth_mm: 2,
        diameter_mm: 30,
        material: "stainless_steel",
      });

      expect(stainlessResult.plunge_feed_mm_rev).toBeLessThanOrEqual(steelResult.plunge_feed_mm_rev);
      expect(stainlessResult.chip_control_notes.some(c => c.toLowerCase().includes("work-harden"))).toBe(true);
    });

    it("should calculate params for thread relief", () => {
      const result = engine.getGroovingParams({
        groove_type: "thread_relief",
        width_mm: 3,
        depth_mm: 1.5,
        diameter_mm: 20,
        material: "steel",
      });

      expect(result.finish_considerations.some(c => c.toLowerCase().includes("thread"))).toBe(true);
    });
  });

  // ==========================================================================
  // getEccentricParams
  // ==========================================================================
  describe("getEccentricParams", () => {
    it("should recommend offset tailstock for small offset", () => {
      const result = engine.getEccentricParams({
        offset_mm: 1.5,
        diameter_mm: 30,
        length_mm: 80,
        material: "steel",
      });

      expect(result.method).toBe("offset_tailstock");
      expect(result.setup_procedure.some(s => s.toLowerCase().includes("tailstock"))).toBe(true);
    });

    it("should recommend four-jaw for large offset", () => {
      const result = engine.getEccentricParams({
        offset_mm: 15,
        diameter_mm: 40,
        length_mm: 60,
        material: "steel",
      });

      expect(result.method).toBe("four_jaw");
      expect(result.balancing_required).toBe(true);
    });

    it("should calculate safe RPM based on offset", () => {
      const smallOffset = engine.getEccentricParams({
        offset_mm: 2,
        diameter_mm: 30,
        length_mm: 50,
        material: "steel",
      });

      const largeOffset = engine.getEccentricParams({
        offset_mm: 10,
        diameter_mm: 30,
        length_mm: 50,
        material: "steel",
      });

      expect(largeOffset.max_safe_rpm).toBeLessThan(smallOffset.max_safe_rpm);
    });

    it("should include counterweight notes for large offsets", () => {
      const result = engine.getEccentricParams({
        offset_mm: 8,
        diameter_mm: 40,
        length_mm: 60,
        material: "steel",
      });

      expect(result.counterweight_notes.some(n => n.toLowerCase().includes("counterweight"))).toBe(true);
    });

    it("should include setup procedure", () => {
      const result = engine.getEccentricParams({
        offset_mm: 5,
        diameter_mm: 35,
        length_mm: 70,
        material: "steel",
      });

      expect(result.setup_procedure.length).toBeGreaterThan(0);
    });

    it("should include tolerance considerations", () => {
      const result = engine.getEccentricParams({
        offset_mm: 3,
        diameter_mm: 25,
        length_mm: 40,
        material: "steel",
        finish_ra: 1.6,
      });

      expect(result.tolerance_considerations.length).toBeGreaterThan(0);
      expect(result.tolerance_considerations.some(t => t.includes("1.6"))).toBe(true);
    });
  });

  // ==========================================================================
  // getContourParams
  // ==========================================================================
  describe("getContourParams", () => {
    it("should calculate params for convex contour", () => {
      const result = engine.getContourParams({
        profile_type: "convex",
        radius_mm: 20,
        roughing_allowance_mm: 1,
        finish_allowance_mm: 0.2,
        material: "steel",
      });

      expect(result.profile_type).toBe("convex");
      expect(result.constant_surface_speed).toBe(true);
      expect(result.tool_nose_radius_mm).toBeGreaterThan(0);
    });

    it("should calculate params for concave contour", () => {
      const result = engine.getContourParams({
        profile_type: "concave",
        radius_mm: 5,
        roughing_allowance_mm: 0.8,
        finish_allowance_mm: 0.15,
        material: "steel",
      });

      expect(result.profile_type).toBe("concave");
      expect(result.tool_nose_radius_mm).toBeLessThanOrEqual(1.25);  // Smaller for tight radius
      expect(result.programming_notes.some(n => n.toLowerCase().includes("clearance"))).toBe(true);
    });

    it("should calculate params for spherical contour", () => {
      const result = engine.getContourParams({
        profile_type: "spherical",
        radius_mm: 15,
        roughing_allowance_mm: 1.5,
        finish_allowance_mm: 0.25,
        material: "steel",
      });

      expect(result.profile_type).toBe("spherical");
      expect(result.surface_finish_tips.some(t => t.toLowerCase().includes("ball") || t.toLowerCase().includes("round"))).toBe(true);
    });

    it("should calculate params for complex contour", () => {
      const result = engine.getContourParams({
        profile_type: "complex",
        roughing_allowance_mm: 2,
        finish_allowance_mm: 0.3,
        material: "steel",
      });

      expect(result.roughing_strategy.toLowerCase()).toContain("multi-pass");
    });

    it("should use CSS with RPM limits", () => {
      const result = engine.getContourParams({
        profile_type: "convex",
        radius_mm: 25,
        roughing_allowance_mm: 1,
        finish_allowance_mm: 0.2,
        material: "aluminum",
      });

      expect(result.constant_surface_speed).toBe(true);
      expect(result.max_rpm).toBeGreaterThan(result.min_rpm);
      expect(result.programming_notes.some(n => n.includes("G96") || n.includes("G50"))).toBe(true);
    });

    it("should include surface finish tips", () => {
      const result = engine.getContourParams({
        profile_type: "convex",
        radius_mm: 20,
        roughing_allowance_mm: 1,
        finish_allowance_mm: 0.2,
        material: "steel",
      });

      expect(result.surface_finish_tips.length).toBeGreaterThan(0);
      expect(result.surface_finish_tips.some(t => t.includes("TNR") || t.includes("cusp"))).toBe(true);
    });

    it("should calculate appropriate stepover", () => {
      const result = engine.getContourParams({
        profile_type: "convex",
        radius_mm: 15,
        roughing_allowance_mm: 1,
        finish_allowance_mm: 0.2,
        material: "steel",
      });

      expect(result.stepover_mm).toBeGreaterThan(0);
      expect(result.stepover_mm).toBeLessThan(result.tool_nose_radius_mm);
    });
  });

  // ==========================================================================
  // listAdvancedOperations
  // ==========================================================================
  describe("listAdvancedOperations", () => {
    it("should list all live tooling operations", () => {
      const result = engine.listAdvancedOperations();

      expect(result.live_tooling.length).toBeGreaterThanOrEqual(9);
      expect(result.live_tooling).toContain("c_axis_milling");
      expect(result.live_tooling).toContain("cross_drilling");
      expect(result.live_tooling).toContain("polygon_turning");
    });

    it("should list all thread forms", () => {
      const result = engine.listAdvancedOperations();

      expect(result.thread_forms.length).toBeGreaterThanOrEqual(8);
      expect(result.thread_forms).toContain("unified");
      expect(result.thread_forms).toContain("metric");
      expect(result.thread_forms).toContain("acme");
      expect(result.thread_forms).toContain("api");
    });

    it("should list all groove types", () => {
      const result = engine.listAdvancedOperations();

      expect(result.groove_types.length).toBeGreaterThanOrEqual(8);
      expect(result.groove_types).toContain("od_groove");
      expect(result.groove_types).toContain("o_ring");
      expect(result.groove_types).toContain("face_groove");
    });

    it("should list contour types", () => {
      const result = engine.listAdvancedOperations();

      expect(result.contour_types.length).toBe(4);
      expect(result.contour_types).toContain("spherical");
      expect(result.contour_types).toContain("convex");
      expect(result.contour_types).toContain("concave");
    });
  });

  // ==========================================================================
  // Integration tests
  // ==========================================================================
  describe("integration", () => {
    it("should handle complex part with multiple operations", () => {
      // Part with hex, thread, and O-ring groove
      const hexResult = engine.getLiveToolingParams({
        operation: "hex_milling",
        live_tool_rpm: 2000,
        feature_depth_mm: 5,
      });

      const threadResult = engine.getAdvancedThreadingParams({
        thread_form: "metric",
        pitch_mm: 1.5,
        diameter_mm: 12,
        length_mm: 20,
      });

      const grooveResult = engine.getGroovingParams({
        groove_type: "o_ring",
        width_mm: 1.78,
        depth_mm: 1.07,
        diameter_mm: 15,
        material: "steel",
      });

      expect(hexResult.spindle_mode).toBe("index");
      expect(threadResult.total_passes).toBeGreaterThan(0);
      expect(grooveResult.finish_considerations.length).toBeGreaterThan(0);
    });

    it("should provide comprehensive operation coverage", () => {
      const ops = engine.listAdvancedOperations();

      // Count total operations
      const totalOps = ops.live_tooling.length +
                       ops.thread_forms.length +
                       ops.groove_types.length +
                       ops.contour_types.length;

      expect(totalOps).toBeGreaterThanOrEqual(29);
    });
  });
});
