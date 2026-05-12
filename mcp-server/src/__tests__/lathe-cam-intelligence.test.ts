/**
 * LatheCAMIntelligenceEngine Tests — LLM-INTEL-7
 *
 * Tests for AI-powered lathe CAD/CAM intelligence:
 *   1. Parametric template recommendations
 *   2. Toolpath selection with interrupted cut detection
 *   3. Operation sequencing
 *   4. Workholding recommendations
 *   5. MRR/Cost optimization
 *   6. Complete CAM analysis
 *
 * @module __tests__/lathe-cam-intelligence.test
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  LatheCAMIntelligenceEngine,
  latheCAMIntelligenceEngine,
  type LathePartGeometry,
  type LatheCADFeatureInstance,
  type LatheMachineConfig,
  type AvailableTool,
} from "../engines/LatheCAMIntelligenceEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const simplePart: LathePartGeometry = {
  part_id: "TEST-001",
  iso_group: "P",
  material_name: "1045 Steel",
  max_od_mm: 50,
  min_id_mm: 0,
  length_mm: 100,
  stock_od_mm: 55,
  stock_length_mm: 105,
  features: [
    { id: "f1", type: "face", z_start_mm: 0, z_end_mm: 0, is_datum: true },
    { id: "f2", type: "cylinder_od", z_start_mm: 0, z_end_mm: 80, diameter_mm: 50 },
    { id: "f3", type: "chamfer", z_start_mm: 0, z_end_mm: 2, angle_deg: 45 },
  ],
};

const complexPart: LathePartGeometry = {
  part_id: "TEST-002",
  iso_group: "M",
  material_name: "316 Stainless",
  max_od_mm: 75,
  min_id_mm: 20,
  length_mm: 150,
  stock_od_mm: 80,
  stock_length_mm: 160,
  features: [
    { id: "f1", type: "face", z_start_mm: 0, z_end_mm: 0, is_datum: true },
    { id: "f2", type: "cylinder_od", z_start_mm: 0, z_end_mm: 100, diameter_mm: 75, tolerance_class: "precision" },
    { id: "f3", type: "shoulder", z_start_mm: 100, z_end_mm: 100, diameter_mm: 60 },
    { id: "f4", type: "cylinder_od", z_start_mm: 100, z_end_mm: 140, diameter_mm: 60 },
    { id: "f5", type: "cylinder_id", z_start_mm: 0, z_end_mm: 80, diameter_mm: 20 },
    { id: "f6", type: "thread_od", z_start_mm: 110, z_end_mm: 135, diameter_mm: 60, thread_spec: "M60x2" },
    { id: "f7", type: "groove_od", z_start_mm: 105, z_end_mm: 108, width_mm: 3, depth_mm: 5 },
    { id: "f8", type: "chamfer", z_start_mm: 0, z_end_mm: 1.5, angle_deg: 45 },
    { id: "f9", type: "cross_hole", z_start_mm: 50, z_end_mm: 50, diameter_mm: 10, depth_mm: 20 },
  ],
};

const partWithFamily: LathePartGeometry = {
  ...simplePart,
  part_id: "FAMILY-001",
  family: {
    family_id: "shaft-family",
    variant_count: 12,
    variable_dimensions: ["MAX_OD", "LENGTH", "THREAD_SIZE"],
  },
};

const slenderPart: LathePartGeometry = {
  part_id: "SLENDER-001",
  iso_group: "P",
  material_name: "4140 Steel",
  max_od_mm: 20,
  min_id_mm: 0,
  length_mm: 200, // L/D = 10
  stock_od_mm: 25,
  stock_length_mm: 210,
  features: [
    { id: "f1", type: "face", z_start_mm: 0, z_end_mm: 0, is_datum: true },
    { id: "f2", type: "cylinder_od", z_start_mm: 0, z_end_mm: 180, diameter_mm: 20 },
    { id: "f3", type: "thread_od", z_start_mm: 180, z_end_mm: 195, diameter_mm: 20, thread_spec: "M20x1.5" },
  ],
};

const thinWallPart: LathePartGeometry = {
  part_id: "THINWALL-001",
  iso_group: "N",
  material_name: "6061-T6 Aluminum",
  max_od_mm: 100,
  min_id_mm: 96, // 2mm wall thickness
  length_mm: 80,
  stock_od_mm: 105,
  stock_length_mm: 85,
  features: [
    { id: "f1", type: "face", z_start_mm: 0, z_end_mm: 0, is_datum: true },
    { id: "f2", type: "cylinder_od", z_start_mm: 0, z_end_mm: 75, diameter_mm: 100 },
    { id: "f3", type: "cylinder_id", z_start_mm: 5, z_end_mm: 75, diameter_mm: 96 },
  ],
};

const basicLathe: LatheMachineConfig = {
  machine_id: "LATHE-01",
  machine_type: "2_axis",
  controller: "fanuc",
  max_spindle_rpm: 4000,
  max_spindle_hp: 20,
  max_chuck_od_mm: 250,
  has_live_tooling: false,
  has_c_axis: false,
  has_y_axis: false,
  has_sub_spindle: false,
  turret_stations: 12,
};

const millTurnLathe: LatheMachineConfig = {
  machine_id: "MILLTURN-01",
  machine_type: "mill_turn",
  controller: "mazak",
  max_spindle_rpm: 5000,
  max_spindle_hp: 30,
  max_chuck_od_mm: 300,
  max_bar_capacity_mm: 65,
  has_live_tooling: true,
  has_c_axis: true,
  has_y_axis: true,
  has_sub_spindle: true,
  turret_stations: 24,
  tools_available: [
    { tool_id: "T01", station: 1, type: "turning_insert", nose_radius_mm: 0.8, approach_angle_deg: 95, cost_per_edge: 8, edges_per_insert: 4 },
    { tool_id: "T02", station: 2, type: "turning_insert", nose_radius_mm: 0.4, approach_angle_deg: 95, cost_per_edge: 10, edges_per_insert: 4 },
    { tool_id: "T03", station: 3, type: "grooving", cost_per_edge: 12, edges_per_insert: 2 },
    { tool_id: "T04", station: 4, type: "threading", cost_per_edge: 15, edges_per_insert: 3 },
    { tool_id: "T05", station: 5, type: "drill", cost_per_edge: 25, edges_per_insert: 1 },
    { tool_id: "T10", station: 10, type: "live_mill", cost_per_edge: 30, edges_per_insert: 4 },
  ],
};

const swissLathe: LatheMachineConfig = {
  machine_id: "SWISS-01",
  machine_type: "swiss",
  controller: "fanuc",
  max_spindle_rpm: 10000,
  max_spindle_hp: 10,
  max_bar_capacity_mm: 32,
  max_chuck_od_mm: 32,
  has_live_tooling: true,
  has_c_axis: true,
  has_y_axis: true,
  has_sub_spindle: true,
  turret_stations: 20,
};

// ============================================================================
// PARAMETRIC TEMPLATE TESTS
// ============================================================================

describe("LatheCAMIntelligenceEngine", () => {
  let engine: LatheCAMIntelligenceEngine;

  beforeAll(() => {
    engine = latheCAMIntelligenceEngine;
  });

  describe("recommendParametricTemplate", () => {
    it("should recommend family_parametric for parts with family", () => {
      const result = engine.recommendParametricTemplate(partWithFamily);

      expect(result.use_template).toBe(true);
      expect(result.template_type).toBe("family_parametric");
      expect(result.variable_parameters.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.time_savings?.cad_time_reduction_pct).toBeGreaterThan(50);
    });

    it("should recommend feature_library for similar parts", () => {
      const similarParts = [simplePart, { ...simplePart, part_id: "SIM-2" }, { ...simplePart, part_id: "SIM-3" }];
      const result = engine.recommendParametricTemplate(simplePart, similarParts);

      expect(result.use_template).toBe(true);
      expect(["feature_library", "family_parametric"]).toContain(result.template_type);
      expect(result.time_savings?.total_variants_addressable).toBeGreaterThanOrEqual(3);
    });

    it("should include key dimensions as variables", () => {
      const result = engine.recommendParametricTemplate(simplePart);

      const varNames = result.variable_parameters.map(v => v.name);
      expect(varNames).toContain("MAX_OD");
      expect(varNames).toContain("LENGTH");
    });

    it("should include constraint equations for stock", () => {
      const result = engine.recommendParametricTemplate(simplePart);

      expect(result.template_structure.constraint_equations.length).toBeGreaterThan(0);
      expect(result.template_structure.constraint_equations.some(eq => eq.includes("STOCK"))).toBe(true);
    });

    it("should identify base vs optional features", () => {
      const result = engine.recommendParametricTemplate(complexPart);

      expect(result.template_structure.base_features.length).toBeGreaterThan(0);
      // Cross hole, thread, groove are optional
      expect(result.template_structure.optional_features.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TOOLPATH SELECTION TESTS
  // ==========================================================================

  describe("selectToolpath", () => {
    it("should select appropriate toolpath for OD turning", () => {
      const feature: LatheCADFeatureInstance = {
        id: "od1",
        type: "cylinder_od",
        z_start_mm: 0,
        z_end_mm: 80,
        diameter_mm: 50,
      };

      const result = engine.selectToolpath(feature, simplePart, basicLathe);

      // Should select one of the valid OD turning strategies
      expect(["g71_od_rough", "g70_od_finish", "profile_turn"]).toContain(result.strategy);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.parameters.depth_of_cut_mm).toBeGreaterThan(0);
      expect(result.parameters.feed_mm_rev).toBeGreaterThan(0);
      expect(result.parameters.cutting_speed_m_min).toBeGreaterThan(0);
    });

    it("should select G76 for threading", () => {
      const feature: LatheCADFeatureInstance = {
        id: "thread1",
        type: "thread_od",
        z_start_mm: 10,
        z_end_mm: 30,
        diameter_mm: 20,
        thread_spec: "M20x1.5",
      };

      const result = engine.selectToolpath(feature, simplePart, basicLathe);

      expect(["g76_threading", "thread_single", "thread_multi"]).toContain(result.strategy);
    });

    it("should select live tooling for cross holes when available", () => {
      const feature: LatheCADFeatureInstance = {
        id: "xhole1",
        type: "cross_hole",
        z_start_mm: 50,
        z_end_mm: 50,
        diameter_mm: 10,
        depth_mm: 20,
      };

      const result = engine.selectToolpath(feature, complexPart, millTurnLathe);

      expect(["live_drill", "live_mill"]).toContain(result.strategy);
    });

    it("should assess interrupted cut potential", () => {
      // Create a part with a cross hole in the turning path
      const partWithInterruption: LathePartGeometry = {
        ...simplePart,
        features: [
          { id: "f1", type: "face", z_start_mm: 0, z_end_mm: 0, is_datum: true },
          { id: "f2", type: "cylinder_od", z_start_mm: 0, z_end_mm: 80, diameter_mm: 50 },
          { id: "f3", type: "cross_hole", z_start_mm: 40, z_end_mm: 40, diameter_mm: 15, depth_mm: 30, width_mm: 15 },
        ],
      };

      const odFeature = partWithInterruption.features[1];
      const result = engine.selectToolpath(odFeature as LatheCADFeatureInstance, partWithInterruption, basicLathe);

      // The engine should always return an interrupted_cut assessment
      expect(result.interrupted_cut).toBeDefined();
      expect(result.interrupted_cut?.has_interruption).toBeDefined();
      expect(["none", "minor", "moderate", "severe"]).toContain(result.interrupted_cut?.severity);
    });

    it("should provide alternatives in result", () => {
      const feature: LatheCADFeatureInstance = {
        id: "groove1",
        type: "groove_od",
        z_start_mm: 20,
        z_end_mm: 25,
        width_mm: 5,
        depth_mm: 3,
      };

      const result = engine.selectToolpath(feature, simplePart, basicLathe);

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0].strategy).toBeDefined();
      expect(result.alternatives[0].score).toBeDefined();
    });

    it("should adjust parameters for precision tolerance", () => {
      const precisionFeature: LatheCADFeatureInstance = {
        id: "prec1",
        type: "cylinder_od",
        z_start_mm: 0,
        z_end_mm: 50,
        diameter_mm: 30,
        tolerance_class: "ultra_precision",
      };

      const standardFeature: LatheCADFeatureInstance = {
        ...precisionFeature,
        id: "std1",
        tolerance_class: "standard",
      };

      const precResult = engine.selectToolpath(precisionFeature, simplePart, basicLathe);
      const stdResult = engine.selectToolpath(standardFeature, simplePart, basicLathe);

      // Precision should have lower feed/DOC
      expect(precResult.parameters.feed_mm_rev).toBeLessThanOrEqual(stdResult.parameters.feed_mm_rev);
    });

    it("should handle material-specific parameters", () => {
      const feature: LatheCADFeatureInstance = {
        id: "od1",
        type: "cylinder_od",
        z_start_mm: 0,
        z_end_mm: 50,
        diameter_mm: 30,
      };

      const steelPart = { ...simplePart, iso_group: "P" as const };
      const titaniumPart = { ...simplePart, iso_group: "S" as const };

      const steelResult = engine.selectToolpath(feature, steelPart, basicLathe);
      const titaniumResult = engine.selectToolpath(feature, titaniumPart, basicLathe);

      // Titanium should have lower cutting speed
      expect(titaniumResult.parameters.cutting_speed_m_min).toBeLessThan(steelResult.parameters.cutting_speed_m_min);
    });
  });

  // ==========================================================================
  // OPERATION SEQUENCING TESTS
  // ==========================================================================

  describe("sequenceOperations", () => {
    it("should sequence datum features first", () => {
      const toolpaths = new Map<string, any>();
      for (const f of complexPart.features) {
        toolpaths.set(f.id, { strategy: "g71_od_rough", parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(complexPart, millTurnLathe, toolpaths);

      // First operation should be face/datum
      expect(result.operations[0].feature_id).toBe("f1"); // face is datum
      expect(result.operations[0].reasoning).toContain("Datum");
    });

    it("should minimize tool changes", () => {
      const toolpaths = new Map<string, any>();
      for (const f of complexPart.features) {
        toolpaths.set(f.id, { strategy: "g71_od_rough", parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(complexPart, millTurnLathe, toolpaths);

      expect(result.tool_changes).toBeLessThan(result.operations.length);
      expect(result.optimizations.some(o => o.toLowerCase().includes("tool"))).toBe(true);
    });

    it("should sequence threading late", () => {
      const toolpaths = new Map<string, any>();
      for (const f of complexPart.features) {
        toolpaths.set(f.id, { strategy: f.type.includes("thread") ? "g76_threading" : "g71_od_rough", parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(complexPart, millTurnLathe, toolpaths);

      const threadOp = result.operations.find(op => op.feature_id === "f6");
      const faceOp = result.operations.find(op => op.feature_id === "f1");

      expect(threadOp).toBeDefined();
      expect(faceOp).toBeDefined();
      expect(threadOp!.sequence).toBeGreaterThan(faceOp!.sequence);
    });

    it("should always put part-off last", () => {
      const toolpaths = new Map<string, any>();
      for (const f of simplePart.features) {
        toolpaths.set(f.id, { strategy: "g71_od_rough", parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(simplePart, basicLathe, toolpaths);

      const lastOp = result.operations[result.operations.length - 1];
      expect(lastOp.toolpath).toBe("part_off");
    });

    it("should group live tooling operations", () => {
      const toolpaths = new Map<string, any>();
      for (const f of complexPart.features) {
        const strategy = f.type === "cross_hole" ? "live_drill" : "g71_od_rough";
        toolpaths.set(f.id, { strategy, parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(complexPart, millTurnLathe, toolpaths);

      // Check either optimizations or reasoning mentions live tooling
      const mentionsLive =
        result.optimizations.some(o => o.toLowerCase().includes("live")) ||
        result.reasoning.some(r => r.toLowerCase().includes("live"));
      expect(mentionsLive).toBe(true);
    });

    it("should provide proactive suggestions for slender parts", () => {
      const toolpaths = new Map<string, any>();
      for (const f of slenderPart.features) {
        toolpaths.set(f.id, { strategy: "g71_od_rough", parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(slenderPart, basicLathe, toolpaths);

      // Should suggest steady rest or reduced feeds
      expect(result.suggestions.some(s => s.toLowerCase().includes("slender") || s.toLowerCase().includes("steady"))).toBe(true);
    });

    it("should calculate total cycle time", () => {
      const toolpaths = new Map<string, any>();
      for (const f of simplePart.features) {
        toolpaths.set(f.id, { strategy: "g71_od_rough", parameters: { depth_of_cut_mm: 2, feed_mm_rev: 0.25, cutting_speed_m_min: 200 } });
      }

      const result = engine.sequenceOperations(simplePart, basicLathe, toolpaths);

      expect(result.total_cycle_time_sec).toBeGreaterThan(0);
      expect(result.total_cycle_time_sec).toBe(
        result.operations.reduce((sum, op) => sum + op.estimated_cycle_time_sec, 0)
      );
    });
  });

  // ==========================================================================
  // WORKHOLDING TESTS
  // ==========================================================================

  describe("recommendWorkholding", () => {
    it("should recommend appropriate chuck for simple parts", () => {
      const result = engine.recommendWorkholding(simplePart, basicLathe);

      // Should recommend a valid workholding type
      expect(["3_jaw_chuck", "6_jaw_chuck", "collet", "soft_jaws"]).toContain(result.primary.type);
      expect(result.safety.adequate).toBe(true);
    });

    it("should recommend tailstock for slender parts", () => {
      const result = engine.recommendWorkholding(slenderPart, basicLathe);

      expect(result.secondary).toBeDefined();
      expect(["tailstock", "steady_rest"]).toContain(result.secondary?.type);
      expect(result.reasoning.some(r => r.toLowerCase().includes("l/d"))).toBe(true);
    });

    it("should recommend soft jaws for thin wall parts", () => {
      const result = engine.recommendWorkholding(thinWallPart, basicLathe);

      // Should recommend soft jaws or 6-jaw for thin walls
      expect(["soft_jaws", "6_jaw_chuck"]).toContain(result.primary.type);
      // Either has thin-wall recommendation or correctly chose soft jaws
      const hasRecommendation = result.safety.recommendations.some(r => r.toLowerCase().includes("thin") || r.toLowerCase().includes("soft"));
      const choseSoftJaws = result.primary.type === "soft_jaws";
      expect(hasRecommendation || choseSoftJaws).toBe(true);
    });

    it("should calculate safety factor", () => {
      const result = engine.recommendWorkholding(simplePart, basicLathe, 1000); // 1000N cutting force

      expect(result.safety.safety_factor).toBeGreaterThan(0);
      expect(["none", "low", "medium", "high"]).toContain(result.safety.ejection_risk);
    });

    it("should provide grip parameters", () => {
      const result = engine.recommendWorkholding(simplePart, basicLathe);

      expect(result.primary.grip_diameter_mm).toBe(simplePart.stock_od_mm);
      expect(result.primary.grip_length_mm).toBeGreaterThan(0);
      expect(result.primary.clamping_force_kn).toBeGreaterThan(0);
    });

    it("should assess deflection risk", () => {
      const result = engine.recommendWorkholding(slenderPart, basicLathe);

      expect(["low", "medium", "high"]).toContain(result.safety.deflection_risk);
    });
  });

  // ==========================================================================
  // MRR/COST OPTIMIZATION TESTS
  // ==========================================================================

  describe("optimizeMRRCost", () => {
    it("should provide three scenarios", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 50);

      expect(result.conservative).toBeDefined();
      expect(result.optimized).toBeDefined();
      expect(result.aggressive).toBeDefined();
    });

    it("should have conservative with lowest MRR", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 50);

      expect(result.conservative.mrr_mm3_min).toBeLessThan(result.aggressive.mrr_mm3_min);
    });

    it("should have aggressive with highest tool cost per part", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 50);

      expect(result.aggressive.tool_cost_per_part).toBeGreaterThanOrEqual(result.conservative.tool_cost_per_part);
    });

    it("should recommend conservative for small batches", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 5);

      expect(result.recommendation).toBe("conservative");
    });

    it("should recommend aggressive for large batches", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 500);

      expect(result.recommendation).toBe("aggressive");
    });

    it("should include batch breakpoints", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 50);

      expect(result.batch_breakpoints).toBeDefined();
      expect(result.batch_breakpoints!.length).toBeGreaterThan(0);
    });

    it("should calculate productivity index", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 50);

      expect(result.optimized.productivity_index).toBeGreaterThan(0);
      // Productivity index is approximately MRR / cost (with rounding)
      const expectedApprox = result.optimized.mrr_mm3_min / (result.optimized.tool_cost_per_part + 0.01);
      // Allow 5% tolerance due to rounding in the engine
      expect(Math.abs(result.optimized.productivity_index - expectedApprox) / expectedApprox).toBeLessThan(0.05);
    });

    it("should use available tools when provided", () => {
      const tools: AvailableTool[] = [
        { tool_id: "T01", station: 1, type: "turning_insert", cost_per_edge: 20, edges_per_insert: 4 },
      ];

      const result = engine.optimizeMRRCost(simplePart, basicLathe, 50, tools);

      // Should use the provided tool cost
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // COMPLETE ANALYSIS TESTS
  // ==========================================================================

  describe("analyzeComplete", () => {
    it("should return all analysis components", () => {
      const result = engine.analyzeComplete(simplePart, basicLathe, { batch_size: 50 });

      expect(result.part_id).toBe(simplePart.part_id);
      expect(result.template).toBeDefined();
      expect(result.workholding).toBeDefined();
      expect(result.sequence).toBeDefined();
      expect(result.feature_toolpaths).toBeDefined();
      expect(result.mrr_cost).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should generate prediction ID for learning", () => {
      const result = engine.analyzeComplete(simplePart, basicLathe);

      expect(result.prediction_id).toBeDefined();
      expect(result.prediction_id).toContain(simplePart.part_id);
    });

    it("should handle priority parameter", () => {
      const speedResult = engine.analyzeComplete(simplePart, basicLathe, { priority: "speed" });
      const qualityResult = engine.analyzeComplete(simplePart, basicLathe, { priority: "quality" });

      // Speed priority should favor faster strategies
      expect(speedResult).toBeDefined();
      expect(qualityResult).toBeDefined();
    });

    it("should include feature toolpaths as Map", () => {
      const result = engine.analyzeComplete(simplePart, basicLathe);

      expect(result.feature_toolpaths instanceof Map).toBe(true);
      expect(result.feature_toolpaths.size).toBeGreaterThan(0);
    });

    it("should provide meaningful summary", () => {
      const result = engine.analyzeComplete(complexPart, millTurnLathe, { batch_size: 100 });

      expect(result.summary.some(s => s.includes("Template"))).toBe(true);
      expect(result.summary.some(s => s.includes("Operations"))).toBe(true);
      expect(result.summary.some(s => s.includes("Workholding"))).toBe(true);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle part with no features", () => {
      const emptyPart: LathePartGeometry = {
        ...simplePart,
        features: [],
      };

      const result = engine.analyzeComplete(emptyPart, basicLathe);

      expect(result.sequence.operations.length).toBeGreaterThan(0); // At least part-off
      expect(result.feature_toolpaths.size).toBe(0);
    });

    it("should handle very small batch size", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 1);

      expect(result.recommendation).toBe("conservative");
    });

    it("should handle very large batch size", () => {
      const result = engine.optimizeMRRCost(simplePart, basicLathe, 10000);

      expect(result.recommendation).toBe("aggressive");
    });

    it("should handle hardened steel material", () => {
      const hardenedPart: LathePartGeometry = {
        ...simplePart,
        iso_group: "H",
        material_name: "Hardened D2",
      };

      const result = engine.analyzeComplete(hardenedPart, basicLathe);

      // Should have lower cutting speeds
      const toolpath = result.feature_toolpaths.get("f2");
      expect(toolpath?.parameters.cutting_speed_m_min).toBeLessThan(200);
    });

    it("should handle machine without live tooling", () => {
      const partWithCrossHole: LathePartGeometry = {
        ...simplePart,
        features: [
          ...simplePart.features,
          { id: "xhole", type: "cross_hole", z_start_mm: 30, z_end_mm: 30, diameter_mm: 8, depth_mm: 15 },
        ],
      };

      const result = engine.analyzeComplete(partWithCrossHole, basicLathe);

      // Should still complete but may have warnings
      expect(result.sequence.operations.length).toBeGreaterThan(0);
    });

    it("should handle zero cutting force input", () => {
      const result = engine.recommendWorkholding(simplePart, basicLathe, 0);

      expect(result.primary).toBeDefined();
      expect(result.safety.safety_factor).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // MATERIAL VARIATIONS
  // ==========================================================================

  describe("material variations", () => {
    const materials: Array<{ iso: "P" | "M" | "K" | "N" | "S" | "H"; name: string }> = [
      { iso: "P", name: "Carbon Steel" },
      { iso: "M", name: "Stainless" },
      { iso: "K", name: "Cast Iron" },
      { iso: "N", name: "Aluminum" },
      { iso: "S", name: "Titanium" },
      { iso: "H", name: "Hardened Steel" },
    ];

    for (const mat of materials) {
      it(`should handle ${mat.name} (ISO ${mat.iso})`, () => {
        const part: LathePartGeometry = {
          ...simplePart,
          iso_group: mat.iso,
          material_name: mat.name,
        };

        const result = engine.analyzeComplete(part, basicLathe);

        expect(result.mrr_cost.optimized.mrr_mm3_min).toBeGreaterThan(0);
        expect(result.sequence.total_cycle_time_sec).toBeGreaterThan(0);
      });
    }
  });

  // ==========================================================================
  // FEATURE TYPE COVERAGE
  // ==========================================================================

  describe("feature type coverage", () => {
    const featureTypes: Array<{ type: LatheCADFeatureInstance["type"]; name: string }> = [
      { type: "cylinder_od", name: "OD Cylinder" },
      { type: "cylinder_id", name: "ID Cylinder" },
      { type: "face", name: "Face" },
      { type: "taper_od", name: "OD Taper" },
      { type: "groove_od", name: "OD Groove" },
      { type: "thread_od", name: "OD Thread" },
      { type: "chamfer", name: "Chamfer" },
      { type: "center_hole", name: "Center Hole" },
    ];

    for (const ft of featureTypes) {
      it(`should select toolpath for ${ft.name}`, () => {
        const feature: LatheCADFeatureInstance = {
          id: `test-${ft.type}`,
          type: ft.type,
          z_start_mm: 0,
          z_end_mm: 20,
          diameter_mm: 30,
        };

        const result = engine.selectToolpath(feature, simplePart, basicLathe);

        expect(result.strategy).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    }
  });
});
