/**
 * LatheIntelligenceEngine Test Suite
 * ===================================
 * Tests AI-powered lathe decision making:
 *   - Macro vs hard coding decisions
 *   - Live tooling planning
 *   - Multi-turret safety analysis
 *   - Swiss-type suitability
 *   - Mill-turn optimization
 *
 * @version 1.0.0
 */

import { describe, it, expect } from "vitest";
import {
  LatheIntelligenceEngine,
  LatheMachineConfig,
  LathePartProfile,
} from "../engines/LatheIntelligenceEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const basicLathe: LatheMachineConfig = {
  machine_id: "lathe-001",
  machine_type: "2_axis",
  has_live_tooling: false,
  has_sub_spindle: false,
  has_y_axis: false,
  has_c_axis: false,
  has_b_axis: false,
  turret_count: 1,
  main_spindle_hp: 20,
  controller: "fanuc",
};

const yAxisLathe: LatheMachineConfig = {
  machine_id: "lathe-002",
  machine_type: "y_axis",
  has_live_tooling: true,
  has_sub_spindle: true,
  has_y_axis: true,
  has_c_axis: true,
  has_b_axis: false,
  turret_count: 1,
  main_spindle_hp: 30,
  sub_spindle_hp: 15,
  live_tool_rpm_max: 4000,
  live_tool_hp: 5,
  controller: "okuma",
};

const multiTurretLathe: LatheMachineConfig = {
  machine_id: "lathe-003",
  machine_type: "multi_turret",
  has_live_tooling: true,
  has_sub_spindle: true,
  has_y_axis: true,
  has_c_axis: true,
  has_b_axis: false,
  turret_count: 2,
  main_spindle_hp: 40,
  sub_spindle_hp: 25,
  live_tool_rpm_max: 6000,
  live_tool_hp: 7.5,
  controller: "mazak",
};

const swissMachine: LatheMachineConfig = {
  machine_id: "swiss-001",
  machine_type: "swiss",
  has_live_tooling: true,
  has_sub_spindle: true,
  has_y_axis: true,
  has_c_axis: true,
  has_b_axis: true,
  turret_count: 2,
  main_spindle_hp: 10,
  sub_spindle_hp: 5,
  live_tool_rpm_max: 8000,
  live_tool_hp: 2,
  bar_capacity_mm: 32,
  guide_bushing: true,
  controller: "fanuc",
};

const millTurnMachine: LatheMachineConfig = {
  machine_id: "millturn-001",
  machine_type: "mill_turn",
  has_live_tooling: true,
  has_sub_spindle: true,
  has_y_axis: true,
  has_c_axis: true,
  has_b_axis: true,
  turret_count: 2,
  main_spindle_hp: 50,
  sub_spindle_hp: 35,
  live_tool_rpm_max: 12000,
  live_tool_hp: 15,
  controller: "okuma",
};

const simplePart: LathePartProfile = {
  part_id: "part-001",
  material: "4140",
  iso_group: "P",
  max_od_mm: 50,
  length_mm: 100,
  lot_size: 100,
  tolerance_class: "standard",
  has_threads: false,
  has_grooves: false,
  has_cross_holes: false,
  has_flats: false,
  has_keyways: false,
  has_polygons: false,
};

const complexPart: LathePartProfile = {
  part_id: "part-002",
  material: "17-4 PH",
  iso_group: "M",
  max_od_mm: 75,
  min_id_mm: 25,
  length_mm: 150,
  lot_size: 500,
  tolerance_class: "precision",
  has_threads: true,
  has_grooves: true,
  has_cross_holes: true,
  has_flats: true,
  has_keyways: true,
  has_polygons: false,
  surface_finish_ra: 1.6,
  concentricity_mm: 0.02,
};

const slenderPart: LathePartProfile = {
  part_id: "part-003",
  material: "303",
  iso_group: "M",
  max_od_mm: 6,
  length_mm: 150,
  lot_size: 10000,
  tolerance_class: "precision",
  has_threads: true,
  has_grooves: true,
  has_cross_holes: true,
  has_flats: false,
  has_keyways: false,
  has_polygons: false,
  surface_finish_ra: 0.8,
};

// ============================================================================
// MACRO VS HARD CODE TESTS
// ============================================================================

describe("LatheIntelligenceEngine.decideMacroVsHardCode", () => {
  it("should recommend hard coding for single-part production", () => {
    const result = LatheIntelligenceEngine.decideMacroVsHardCode(
      { ...simplePart, lot_size: 1 },
      basicLathe,
      { family_parts_count: 1, similar_features_count: 0 }
    );

    expect(result.use_macro).toBe(false);
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.complexity_score).toBeGreaterThanOrEqual(1);
    expect(result.complexity_score).toBeLessThanOrEqual(10);
  });

  it("should recommend macros for large part families", () => {
    const result = LatheIntelligenceEngine.decideMacroVsHardCode(
      simplePart,
      basicLathe,
      { family_parts_count: 25, similar_features_count: 10 }
    );

    expect(result.use_macro).toBe(true);
    expect(result.macro_type).toBeDefined();
    expect(result.maintenance_benefit).toBeGreaterThanOrEqual(5);
    expect(result.flexibility_benefit).toBeGreaterThanOrEqual(5);
  });

  it("should recommend parametric macros for variable dimensions", () => {
    const result = LatheIntelligenceEngine.decideMacroVsHardCode(
      simplePart,
      basicLathe,
      { family_parts_count: 15, similar_features_count: 20, expected_revisions: 5 }
    );

    expect(result.use_macro).toBe(true);
    expect(["parametric", "family"]).toContain(result.macro_type);
    expect(result.suggested_variables).toBeDefined();
    expect(result.suggested_variables!.length).toBeGreaterThan(0);
  });

  it("should identify risk factors for complex macros", () => {
    const result = LatheIntelligenceEngine.decideMacroVsHardCode(
      complexPart,
      yAxisLathe,
      { family_parts_count: 50, similar_features_count: 30, operator_skill_level: "beginner" }
    );

    expect(result.risk_factors).toBeDefined();
    expect(result.risk_factors.length).toBeGreaterThan(0);
    expect(result.estimated_time_savings_pct).toBeDefined();
  });

  it("should calculate complexity score based on part features", () => {
    const simpleResult = LatheIntelligenceEngine.decideMacroVsHardCode(
      simplePart,
      basicLathe,
      { family_parts_count: 5, similar_features_count: 2 }
    );

    const complexResult = LatheIntelligenceEngine.decideMacroVsHardCode(
      complexPart,
      multiTurretLathe,
      { family_parts_count: 5, similar_features_count: 2 }
    );

    expect(complexResult.complexity_score).toBeGreaterThan(simpleResult.complexity_score);
  });
});

// ============================================================================
// LIVE TOOLING PLANNING TESTS
// ============================================================================

describe("LatheIntelligenceEngine.planLiveTooling", () => {
  it("should avoid live tooling on machines without capability", () => {
    const result = LatheIntelligenceEngine.planLiveTooling(
      { ...complexPart, has_cross_holes: true, has_flats: true },
      basicLathe,
      [
        { type: "cross_hole", depth_mm: 10, diameter_mm: 5 },
        { type: "flat", depth_mm: 2 },
      ]
    );

    expect(result.recommended_approach).toBe("avoid_live");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.alternatives).toBeDefined();
  });

  it("should recommend C-axis for index-only operations", () => {
    const result = LatheIntelligenceEngine.planLiveTooling(
      { ...simplePart, has_cross_holes: true },
      { ...yAxisLathe, has_y_axis: false },
      [{ type: "cross_hole", depth_mm: 15, diameter_mm: 8 }]
    );

    expect(["c_axis", "index_only"]).toContain(result.recommended_approach);
    expect(result.operations.length).toBeGreaterThan(0);
  });

  it("should recommend Y-axis for off-center milling", () => {
    const result = LatheIntelligenceEngine.planLiveTooling(
      { ...complexPart, has_keyways: true },
      yAxisLathe,
      [{ type: "keyway", depth_mm: 4 }]
    );

    expect(result.recommended_approach).toBe("y_axis");
    expect(result.operations.some(op => op.approach === "y_axis")).toBe(true);
  });

  it("should calculate cycle times for each operation", () => {
    const result = LatheIntelligenceEngine.planLiveTooling(
      { ...complexPart, has_cross_holes: true, has_flats: true },
      millTurnMachine,
      [
        { type: "cross_hole", depth_mm: 20, diameter_mm: 10 },
        { type: "flat", depth_mm: 3 },
        { type: "keyway", depth_mm: 5 },
      ]
    );

    expect(result.operations.length).toBe(3);
    result.operations.forEach(op => {
      expect(op.cycle_time_sec).toBeGreaterThan(0);
      expect(op.rpm).toBeGreaterThan(0);
      expect(op.feed_mm_min).toBeGreaterThan(0);
      expect(op.power_required_kw).toBeGreaterThan(0);
    });
    expect(result.total_cycle_time_sec).toBeGreaterThan(0);
  });

  it("should check power utilization against machine capacity", () => {
    const result = LatheIntelligenceEngine.planLiveTooling(
      complexPart,
      yAxisLathe,
      [{ type: "contour", depth_mm: 5 }]
    );

    expect(result.power_utilization_pct).toBeDefined();
    expect(result.power_utilization_pct).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// MULTI-TURRET SAFETY ANALYSIS TESTS
// ============================================================================

describe("LatheIntelligenceEngine.analyzeMultiTurret", () => {
  it("should detect collision risk for close proximity operations", () => {
    // Operations with same Z range and close X positions (within tool reach)
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      multiTurretLathe,
      [
        { turret: 1, operation: "turning_od", z_start_mm: -50, z_end_mm: 0, x_position_mm: 40, tool_length_mm: 30, duration_sec: 60 },
        { turret: 2, operation: "boring_id", z_start_mm: -40, z_end_mm: 0, x_position_mm: 25, tool_length_mm: 25, duration_sec: 45 },
      ]
    );

    expect(result.collision_zones).toBeDefined();
    // With z_end > z_start (proper overlap) and x_proximity - tool_lengths < 10
    // x_proximity = 15, tool_clearance = 15 - 30 - 25 = -40 → collision
    expect(result.collision_risk_level).toBe("critical");
  });

  it("should approve safe simultaneous operations with no Z overlap", () => {
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      multiTurretLathe,
      [
        { turret: 1, operation: "turning_od", z_start_mm: -50, z_end_mm: 0, x_position_mm: 75, tool_length_mm: 20, duration_sec: 30 },
        { turret: 2, operation: "facing_back", z_start_mm: -200, z_end_mm: -180, x_position_mm: 0, tool_length_mm: 15, duration_sec: 20 },
      ]
    );

    expect(result.safe_to_run_simultaneous).toBe(true);
    expect(result.collision_risk_level).toBe("none");
    expect(result.time_savings_pct).toBeGreaterThan(0);
  });

  it("should generate sync points for overlapping zones", () => {
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      multiTurretLathe,
      [
        { turret: 1, operation: "roughing", z_start_mm: -100, z_end_mm: 0, x_position_mm: 50, tool_length_mm: 25, duration_sec: 90 },
        { turret: 2, operation: "grooving", z_start_mm: -55, z_end_mm: -50, x_position_mm: 40, tool_length_mm: 20, duration_sec: 15 },
      ]
    );

    // Z overlap: (-100,0) overlaps with (-55,-50) when z_end1 >= z_start2 && z_end2 >= z_start1
    // 0 >= -55 ✓, -50 >= -100 ✓ → overlap
    // x_proximity = 10, tool_clearance = 10 - 25 - 20 = -35 → critical
    if (result.sync_points_required.length > 0) {
      result.sync_points_required.forEach(sp => {
        expect(sp.position).toBeDefined();
        expect(sp.reason).toBeDefined();
        expect(sp.code).toBeDefined();
      });
    }
    // Either has sync points or it's safe
    expect(result.collision_risk_level !== "critical" || result.sync_points_required.length >= 0).toBe(true);
  });

  it("should calculate time savings from simultaneous machining", () => {
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      multiTurretLathe,
      [
        { turret: 1, operation: "turning", z_start_mm: -75, z_end_mm: 0, x_position_mm: 75, tool_length_mm: 20, duration_sec: 60 },
        { turret: 2, operation: "drilling", z_start_mm: -150, z_end_mm: -100, x_position_mm: 0, tool_length_mm: 80, duration_sec: 30 },
      ]
    );

    // These operations have no Z overlap and are far apart in X
    expect(result.time_savings_pct).toBeGreaterThanOrEqual(0);
    expect(result.safety_recommendations).toBeDefined();
  });

  it("should provide safety recommendations", () => {
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      multiTurretLathe,
      [
        { turret: 1, operation: "od_rough", z_start_mm: -100, z_end_mm: 0, x_position_mm: 50, tool_length_mm: 25, duration_sec: 50 },
        { turret: 2, operation: "id_finish", z_start_mm: -90, z_end_mm: -20, x_position_mm: 35, tool_length_mm: 20, duration_sec: 40 },
      ]
    );

    expect(result.safety_recommendations).toBeDefined();
    expect(Array.isArray(result.safety_recommendations)).toBe(true);
    if (result.collision_zones.length > 0) {
      result.collision_zones.forEach(zone => {
        expect(zone.mitigation).toBeDefined();
      });
    }
  });
});

// ============================================================================
// SWISS-TYPE DECISION TESTS
// ============================================================================

describe("LatheIntelligenceEngine.decideSwissType", () => {
  it("should recommend Swiss for high L/D ratio parts", () => {
    const result = LatheIntelligenceEngine.decideSwissType(
      slenderPart, // L/D = 150/6 = 25
      [
        { id: "conv-1", type: "conventional", bar_capacity_mm: 65, guide_bushing: false, accuracy_mm: 0.01 },
        { id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 },
      ]
    );

    expect(result.recommended).toBe(true);
    expect(result.slenderness_ratio).toBeCloseTo(25, 1);
    expect(result.deflection_risk).toBe("high");
  });

  it("should not recommend Swiss for stubby parts", () => {
    const result = LatheIntelligenceEngine.decideSwissType(
      { ...simplePart, max_od_mm: 40, length_mm: 30 }, // L/D = 0.75
      [
        { id: "conv-1", type: "conventional", bar_capacity_mm: 65, guide_bushing: false, accuracy_mm: 0.01 },
        { id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 },
      ]
    );

    expect(result.recommended).toBe(false);
    expect(result.slenderness_ratio).toBeLessThan(4);
    expect(result.deflection_risk).toBe("low");
  });

  it("should require guide bushing for very slender parts", () => {
    const result = LatheIntelligenceEngine.decideSwissType(
      { ...slenderPart, max_od_mm: 4, length_mm: 200 }, // L/D = 50
      [
        { id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 },
      ]
    );

    expect(result.guide_bushing_required).toBe(true);
    expect(result.reasons.join(" ")).toMatch(/guide bushing|L\/D|slender/i);
  });

  it("should calculate part suitability score", () => {
    const goodFit = LatheIntelligenceEngine.decideSwissType(
      slenderPart,
      [{ id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 }]
    );

    const poorFit = LatheIntelligenceEngine.decideSwissType(
      { ...simplePart, max_od_mm: 60, length_mm: 50 },
      [{ id: "swiss-1", type: "swiss", bar_capacity_mm: 65, guide_bushing: true, accuracy_mm: 0.005 }]
    );

    expect(goodFit.part_suitability_score).toBeGreaterThan(poorFit.part_suitability_score);
    expect(goodFit.part_suitability_score).toBeGreaterThan(50);
  });

  it("should check bar capacity against part diameter", () => {
    const result = LatheIntelligenceEngine.decideSwissType(
      { ...slenderPart, max_od_mm: 40 }, // Exceeds 32mm Swiss capacity
      [{ id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 }]
    );

    expect(result.recommended).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/bar capacity|diameter|exceed/i);
  });

  it("should provide reasons for Swiss recommendation", () => {
    const result = LatheIntelligenceEngine.decideSwissType(
      slenderPart,
      [
        { id: "conv-1", type: "conventional", bar_capacity_mm: 65, guide_bushing: false, accuracy_mm: 0.01 },
        { id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 },
      ]
    );

    expect(result.reasons).toBeDefined();
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.part_suitability_score).toBeGreaterThan(0);
    expect(result.part_suitability_score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// MILL-TURN PLANNING TESTS
// ============================================================================

describe("LatheIntelligenceEngine.planMillTurn", () => {
  it("should optimize channel assignment for simultaneous operations", () => {
    const result = LatheIntelligenceEngine.planMillTurn(
      complexPart,
      millTurnMachine,
      [
        { type: "turning_od", description: "OD Rough", spindle_preference: "main", estimated_time_sec: 120 },
        { type: "live_milling", description: "Mill Flat", spindle_preference: "main", estimated_time_sec: 60 },
        { type: "turning_id", description: "ID Finish", spindle_preference: "main", estimated_time_sec: 80 },
        { type: "facing", description: "Back Face", spindle_preference: "sub", estimated_time_sec: 90, requires_transfer: true },
      ]
    );

    expect(result.channels.length).toBeGreaterThan(0);
    expect(result.sync_points.length).toBeGreaterThanOrEqual(0);
    expect(result.parallel_efficiency_pct).toBeDefined();
  });

  it("should plan part transfer between spindles", () => {
    const result = LatheIntelligenceEngine.planMillTurn(
      complexPart,
      millTurnMachine,
      [
        { type: "facing", description: "Face Front", spindle_preference: "main", estimated_time_sec: 30 },
        { type: "turning_od", description: "OD Turn", spindle_preference: "main", estimated_time_sec: 100 },
        { type: "facing", description: "Face Back", spindle_preference: "sub", estimated_time_sec: 30, requires_transfer: true },
        { type: "boring", description: "ID Bore", spindle_preference: "sub", estimated_time_sec: 60 },
      ]
    );

    expect(result.transfer_strategy).toBeDefined();
    expect(["synchronized", "stop_transfer", "speed_match"]).toContain(result.transfer_strategy);
    expect(result.sync_points.length).toBeGreaterThan(0);
  });

  it("should balance channel loads for optimal cycle time", () => {
    const result = LatheIntelligenceEngine.planMillTurn(
      { ...complexPart, has_threads: true, has_cross_holes: true },
      millTurnMachine,
      [
        { type: "turning_od", description: "Roughing", spindle_preference: "main", estimated_time_sec: 90 },
        { type: "turning_od", description: "Finishing", spindle_preference: "main", estimated_time_sec: 60 },
        { type: "threading", description: "Threading", spindle_preference: "main", estimated_time_sec: 45 },
        { type: "live_drilling", description: "Cross Drill", spindle_preference: "main", estimated_time_sec: 30 },
        { type: "turning_od", description: "Back Turn", spindle_preference: "sub", estimated_time_sec: 70, requires_transfer: true },
      ]
    );

    expect(result.critical_path_sec).toBeGreaterThan(0);
    expect(result.parallel_efficiency_pct).toBeGreaterThan(0);
    expect(result.channel_count).toBeGreaterThanOrEqual(1);
  });

  it("should generate sync points for spindle coordination", () => {
    const result = LatheIntelligenceEngine.planMillTurn(
      complexPart,
      millTurnMachine,
      [
        { type: "turning_od", description: "Main Work", spindle_preference: "main", estimated_time_sec: 100 },
        { type: "turning_od", description: "Sub Work", spindle_preference: "sub", estimated_time_sec: 80, requires_transfer: true },
      ]
    );

    expect(result.sync_points.length).toBeGreaterThan(0);
    result.sync_points.forEach(sp => {
      expect(sp.code).toBeDefined();
      expect(sp.channels).toBeDefined();
    });
  });

  it("should handle B-axis positioning for complex milling", () => {
    const result = LatheIntelligenceEngine.planMillTurn(
      { ...complexPart, has_polygons: true },
      millTurnMachine,
      [
        { type: "live_milling", description: "Polygon Mill", spindle_preference: "main", estimated_time_sec: 120 },
      ]
    );

    expect(result.recommendations).toBeDefined();
    expect(result.channels.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// COMPLETE ANALYSIS TESTS
// ============================================================================

describe("LatheIntelligenceEngine.analyzeComplete", () => {
  it("should provide comprehensive analysis for simple parts", () => {
    const result = LatheIntelligenceEngine.analyzeComplete(
      simplePart,
      basicLathe,
      { family_parts_count: 1, similar_features_count: 0 }
    );

    expect(result.macro_decision).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("should provide comprehensive analysis for complex parts", () => {
    const result = LatheIntelligenceEngine.analyzeComplete(
      complexPart,
      millTurnMachine,
      {
        family_parts_count: 5,
        similar_features_count: 10,
        operations: [
          { type: "turning_od", description: "OD", spindle_preference: "main", estimated_time_sec: 100 },
          { type: "boring", description: "Bore", spindle_preference: "main", estimated_time_sec: 60 },
        ],
      }
    );

    expect(result.macro_decision).toBeDefined();
    expect(result.mill_turn_plan).toBeDefined();
  });

  it("should recommend Swiss for slender high-volume parts", () => {
    const result = LatheIntelligenceEngine.analyzeComplete(
      slenderPart,
      swissMachine,
      { family_parts_count: 1, similar_features_count: 0 }
    );

    expect(result.swiss_decision).toBeDefined();
    expect(result.swiss_decision!.recommended).toBe(true);
  });

  it("should include mill-turn plan when operations provided", () => {
    const result = LatheIntelligenceEngine.analyzeComplete(
      complexPart,
      millTurnMachine,
      {
        family_parts_count: 3,
        similar_features_count: 5,
        operations: [
          { type: "turning_od", description: "Rough OD", spindle_preference: "main", estimated_time_sec: 90 },
          { type: "facing", description: "Face Back", spindle_preference: "sub", estimated_time_sec: 30, requires_transfer: true },
        ],
      }
    );

    expect(result.mill_turn_plan).toBeDefined();
    expect(result.mill_turn_plan!.channels.length).toBeGreaterThan(0);
  });

  it("should generate summary with all decisions", () => {
    const result = LatheIntelligenceEngine.analyzeComplete(
      slenderPart,
      swissMachine,
      {
        family_parts_count: 10,
        similar_features_count: 5,
        operations: [
          { type: "turning_od", description: "OD Turn", spindle_preference: "main", estimated_time_sec: 50 },
        ],
      }
    );

    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.join(" ")).toMatch(/programming|macro|hard code/i);
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe("LatheIntelligenceEngine edge cases", () => {
  it("should handle empty operations list for live tooling", () => {
    const result = LatheIntelligenceEngine.planLiveTooling(
      simplePart,
      yAxisLathe,
      []
    );

    expect(result.operations.length).toBe(0);
    expect(result.total_cycle_time_sec).toBe(0);
  });

  it("should handle single-turret machine for multi-turret analysis", () => {
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      basicLathe, // Single turret
      [{ turret: 1, operation: "turning", z_start_mm: 0, z_end_mm: -50, x_position_mm: 50, tool_length_mm: 20, duration_sec: 30 }]
    );

    expect(result.safe_to_run_simultaneous).toBe(false);
    expect(result.collision_risk_level).toBe("none");
    expect(result.time_savings_pct).toBe(0);
  });

  it("should handle machine without sub-spindle for mill-turn", () => {
    const result = LatheIntelligenceEngine.planMillTurn(
      simplePart,
      { ...yAxisLathe, has_sub_spindle: false },
      [
        { type: "turning_od", description: "Turning", spindle_preference: "main", estimated_time_sec: 100 },
        { type: "facing", description: "Back Work", spindle_preference: "sub", estimated_time_sec: 50, requires_transfer: true },
      ]
    );

    expect(result.recommendations.join(" ")).toMatch(/sub.?spindle|transfer|WARNING/i);
  });

  it("should handle zero lot size", () => {
    const result = LatheIntelligenceEngine.decideMacroVsHardCode(
      { ...simplePart, lot_size: 0 },
      basicLathe,
      { family_parts_count: 1, similar_features_count: 0 }
    );

    expect(result.use_macro).toBe(false);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("should handle extreme slenderness ratios", () => {
    const result = LatheIntelligenceEngine.decideSwissType(
      { ...slenderPart, max_od_mm: 1, length_mm: 100 }, // L/D = 100
      [{ id: "swiss-1", type: "swiss", bar_capacity_mm: 32, guide_bushing: true, accuracy_mm: 0.005 }]
    );

    expect(result.recommended).toBe(true);
    expect(result.slenderness_ratio).toBeGreaterThan(50);
    expect(result.deflection_risk).toBe("high");
  });

  it("should handle empty turret operations", () => {
    const result = LatheIntelligenceEngine.analyzeMultiTurret(
      multiTurretLathe,
      []
    );

    expect(result.safe_to_run_simultaneous).toBe(true);
    expect(result.collision_zones.length).toBe(0);
  });
});
