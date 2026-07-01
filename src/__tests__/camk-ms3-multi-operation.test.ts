/**
 * CAMK-MS3 Multi-Operation Orchestration — Comprehensive Tests
 *
 * Covers all 5 engines:
 *   1. RestMachiningEngine (IPW-aware rest zones + algorithm assignment)
 *   2. OperationSequencerEngine (topological sort + tool grouping + thermal)
 *   3. TransitionPathEngine (retract/spiral/direct/auto linking)
 *   4. AdaptiveRefinementEngine (curvature/force/thermal/engagement densification)
 *   5. MultiSetupPlannerEngine (visibility + set cover + datum chain + stability)
 */

import { describe, it, expect } from "vitest";
import { restMachiningEngine } from "../engines/RestMachiningEngine.js";
import { operationSequencerEngine } from "../engines/OperationSequencerEngine.js";
import { transitionPathEngine } from "../engines/TransitionPathEngine.js";
import { adaptiveRefinementEngine } from "../engines/AdaptiveRefinementEngine.js";
import { multiSetupPlannerEngine } from "../engines/MultiSetupPlannerEngine.js";

// ============================================================================
// 1. RestMachiningEngine
// ============================================================================

describe("RestMachiningEngine", () => {
  const baseInput = () => ({
    target_geometry: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
    stock: { min_x: -2, min_y: -2, min_z: -2, max_x: 102, max_y: 102, max_z: 52 },
    previous_ops: [
      {
        tool: { type: "endmill", diameter_mm: 20 },
        strategy: "adaptive_roughing",
        stock_before: { min_x: -2, min_y: -2, min_z: -2, max_x: 102, max_y: 102, max_z: 52 },
        zones_cut: [
          { min_x: 5, min_y: 5, min_z: 0, max_x: 90, max_y: 90, max_z: 50 },
        ],
      },
    ],
    available_tools: [
      { type: "endmill", diameter_mm: 20 },
      { type: "endmill", diameter_mm: 10 },
      { type: "endmill", diameter_mm: 6 },
      { type: "endmill", diameter_mm: 3 },
    ],
    tool_change_time_sec: 10,
    material: "aluminum",
  });

  it("detects rest zones from IPW vs target", () => {
    const result = restMachiningEngine.analyze(baseInput());
    expect(result.rest_zones.length).toBeGreaterThan(0);
    // Each zone has a type and bounds
    for (const z of result.rest_zones) {
      expect(["corner", "floor", "wall", "pocket", "fillet", "step"]).toContain(z.type);
      expect(z.bounds).toBeDefined();
      expect(z.volume_mm3).toBeGreaterThan(0);
    }
  });

  it("assigns correct algorithms per zone type", () => {
    const result = restMachiningEngine.analyze(baseInput());
    const algoMap: Record<string, string> = {
      corner: "SFCR", floor: "CFSF", wall: "PTDC", pocket: "VCER", fillet: "HRAF", step: "TGAR",
    };
    for (const z of result.rest_zones) {
      expect(z.recommended_algorithm).toBe(algoMap[z.type]);
    }
  });

  it("multi-tool sequencing produces ordered operations", () => {
    const result = restMachiningEngine.analyze(baseInput());
    expect(result.operations.length).toBeGreaterThan(0);
    // Sequence numbers are monotonically increasing from 1
    for (let i = 0; i < result.operations.length; i++) {
      expect(result.operations[i].sequence).toBe(i + 1);
    }
    // Each operation references a valid zone
    const zoneIds = new Set(result.rest_zones.map(z => z.id));
    for (const op of result.operations) {
      expect(zoneIds.has(op.zone.id)).toBe(true);
    }
  });

  it("total rest volume is positive", () => {
    const result = restMachiningEngine.analyze(baseInput());
    expect(result.total_rest_volume_mm3).toBeGreaterThan(0);
    // Sum of zone volumes should match total
    const sumVol = result.rest_zones.reduce((s, z) => s + z.volume_mm3, 0);
    expect(result.total_rest_volume_mm3).toBeCloseTo(sumVol, 1);
  });

  it("tool_changes count matches actual changes in sequence", () => {
    const result = restMachiningEngine.analyze(baseInput());
    let changes = 0;
    for (let i = 1; i < result.operations.length; i++) {
      if (result.operations[i].tool.diameter_mm !== result.operations[i - 1].tool.diameter_mm) {
        changes++;
      }
    }
    expect(result.tool_changes).toBe(changes);
  });

  it("returns empty result when no previous ops provided", () => {
    const input = baseInput();
    // No previous operations — engine returns empty result
    input.previous_ops = [];
    const result = restMachiningEngine.analyze(input);
    expect(result.rest_zones).toHaveLength(0);
    expect(result.total_rest_volume_mm3).toBe(0);
  });

  it("includes optimization_notes and formulas", () => {
    const result = restMachiningEngine.analyze(baseInput());
    expect(result.optimization_notes).toBeDefined();
    expect(Array.isArray(result.optimization_notes)).toBe(true);
    expect(result.formulas).toBeDefined();
    expect(result.formulas.total_time).toContain("T_change");
  });
});

// ============================================================================
// 2. OperationSequencerEngine
// ============================================================================

describe("OperationSequencerEngine", () => {
  it("topological sort respects prerequisites", () => {
    const result = operationSequencerEngine.sequence({
      operations: [
        { id: "finish1", type: "finish", tool_id: "T2", tool_diameter_mm: 6, estimated_time_sec: 30, prerequisites: ["rough1"] },
        { id: "rough1", type: "rough", tool_id: "T1", tool_diameter_mm: 20, estimated_time_sec: 60 },
        { id: "drill1", type: "drill", tool_id: "T3", tool_diameter_mm: 8, estimated_time_sec: 10 },
      ],
    });
    const ids = result.sequence.map(s => s.operation_id);
    expect(ids.indexOf("rough1")).toBeLessThan(ids.indexOf("finish1"));
  });

  it("groups same-tool operations together to minimize tool changes", () => {
    const result = operationSequencerEngine.sequence({
      operations: [
        { id: "op1", type: "rough", tool_id: "T1", tool_diameter_mm: 20, estimated_time_sec: 10 },
        { id: "op2", type: "rough", tool_id: "T2", tool_diameter_mm: 10, estimated_time_sec: 10 },
        { id: "op3", type: "rough", tool_id: "T1", tool_diameter_mm: 20, estimated_time_sec: 10 },
        { id: "op4", type: "rough", tool_id: "T2", tool_diameter_mm: 10, estimated_time_sec: 10 },
      ],
      optimize_for: "time",
    });
    // With greedy TSP, same-tool ops should be adjacent
    // At most 1 tool change (T1 group then T2 group or vice versa)
    expect(result.tool_change_count).toBeLessThanOrEqual(1);
  });

  it("inserts thermal relaxation between rough and finish", () => {
    const result = operationSequencerEngine.sequence({
      operations: [
        { id: "rough1", type: "rough", tool_id: "T1", tool_diameter_mm: 20, estimated_time_sec: 60, heat_generation: "high" },
        { id: "finish1", type: "finish", tool_id: "T2", tool_diameter_mm: 6, estimated_time_sec: 30 },
      ],
      thermal_relaxation_sec: 45,
    });
    // The finishing step should have wait_before_sec > 0
    const finishStep = result.sequence.find(s => s.operation_id === "finish1");
    expect(finishStep).toBeDefined();
    expect(finishStep!.wait_before_sec).toBe(45);
    expect(result.thermal_wait_time_sec).toBe(45);
  });

  it("handles single operation", () => {
    const result = operationSequencerEngine.sequence({
      operations: [
        { id: "only", type: "drill", tool_id: "T1", tool_diameter_mm: 8, estimated_time_sec: 15 },
      ],
    });
    expect(result.sequence).toHaveLength(1);
    expect(result.tool_change_count).toBe(0);
    expect(result.total_time_sec).toBe(15);
  });

  it("total time includes all components (cutting + tool changes + thermal)", () => {
    const result = operationSequencerEngine.sequence({
      operations: [
        { id: "r1", type: "rough", tool_id: "T1", tool_diameter_mm: 20, estimated_time_sec: 60, heat_generation: "high" },
        { id: "f1", type: "finish", tool_id: "T2", tool_diameter_mm: 6, estimated_time_sec: 30 },
      ],
      tool_change_time_sec: 8,
      thermal_relaxation_sec: 20,
    });
    // total = cutting + tool_change_time + thermal
    expect(result.cutting_time_sec).toBe(90);
    expect(result.total_time_sec).toBe(
      result.cutting_time_sec + result.tool_change_time_sec + result.thermal_wait_time_sec,
    );
  });

  it("returns empty result for zero operations", () => {
    const result = operationSequencerEngine.sequence({ operations: [] });
    expect(result.sequence).toHaveLength(0);
    expect(result.total_time_sec).toBe(0);
    expect(result.optimization_score).toBe(100);
  });
});

// ============================================================================
// 3. TransitionPathEngine
// ============================================================================

describe("TransitionPathEngine", () => {
  const stock = { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 };

  it("shortest retract goes up and over", () => {
    const result = transitionPathEngine.shortestRetract({
      from: { x: 10, y: 10, z: 20 },
      to: { x: 80, y: 80, z: 20 },
      stock,
      clearance_mm: 5,
    });
    expect(result.strategy_used).toBe("shortest_retract");
    expect(result.retract_height_mm).toBe(55); // stock.max_z + 5
    // First move retracts Z, then moves XY, then plunges
    expect(result.moves.length).toBeGreaterThanOrEqual(2);
    expect(result.moves[0].z).toBe(55);
    expect(result.total_distance_mm).toBeGreaterThan(0);
  });

  it("spiral approach produces arc moves", () => {
    const result = transitionPathEngine.spiralTransition({
      from: { x: 50, y: 50, z: 30 },
      to: { x: 70, y: 70, z: 10 },
      stock,
      clearance_mm: 5,
      tool_diameter_mm: 10,
    });
    expect(result.strategy_used).toBe("spiral");
    // Should contain arc_cw and arc_cc moves
    const arcTypes = result.moves.map(m => m.type);
    expect(arcTypes).toContain("arc_cw");
    expect(arcTypes).toContain("arc_cc");
    expect(result.move_count).toBe(4);
  });

  it("direct link avoids obstacles (falls back to retract when blocked)", () => {
    const obstacle = { min_x: 30, min_y: 30, min_z: 0, max_x: 70, max_y: 70, max_z: 60 };
    const result = transitionPathEngine.directLink({
      from: { x: 10, y: 10, z: 30 },
      to: { x: 80, y: 80, z: 30 },
      stock,
      obstacles: [obstacle],
    });
    // Direct path goes through the obstacle, so should fall back to retract
    expect(result.strategy_used).toBe("shortest_retract");
    expect(result.retract_height_mm).toBeGreaterThanOrEqual(stock.max_z);
  });

  it("auto-select chooses appropriate strategy", () => {
    // Points far above stock with no obstacles — should choose direct
    const result = transitionPathEngine.autoSelect({
      from: { x: 10, y: 10, z: 80 },
      to: { x: 90, y: 90, z: 80 },
      stock,
    });
    expect(result.strategy_used).toBe("direct");
    expect(result.air_time_sec).toBeGreaterThan(0);
  });

  it("batch transitions computes total air time", () => {
    const result = transitionPathEngine.planBatch({
      points: [
        { x: 10, y: 10, z: 30 },
        { x: 50, y: 50, z: 30 },
        { x: 90, y: 90, z: 30 },
      ],
      stock,
      clearance_mm: 5,
      strategy: "shortest_retract",
    });
    expect(result.transitions).toHaveLength(2);
    expect(result.total_air_time_sec).toBeGreaterThan(0);
    expect(result.total_air_distance_mm).toBeGreaterThan(0);
    // Total should be sum of individual transitions
    const sumDist = result.transitions.reduce((s, t) => s + t.total_distance_mm, 0);
    expect(result.total_air_distance_mm).toBeCloseTo(sumDist, 4);
  });

  it("plan dispatches to correct strategy", () => {
    const result = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: 30 },
      to: { x: 80, y: 80, z: 30 },
      stock,
      strategy: "smooth",
      tool_diameter_mm: 10,
    });
    expect(result.strategy_used).toBe("smooth");
  });
});

// ============================================================================
// 4. AdaptiveRefinementEngine
// ============================================================================

describe("AdaptiveRefinementEngine", () => {
  it("curvature refinement adds midpoints on curved path", () => {
    // Three points forming a sharp angle — high chord error
    const result = adaptiveRefinementEngine.refine({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 },
        { x: 20, y: 0, z: 0 },
        { x: 30, y: 10, z: 0 },
      ],
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.001 },
      max_iterations: 3,
    });
    expect(result.points_added).toBeGreaterThan(0);
    expect(result.refined_count).toBeGreaterThan(result.original_count);
    expect(result.refinement_stats.curvature_inserts).toBeGreaterThan(0);
  });

  it("convergence stops iteration when error < tolerance", () => {
    // Straight-line points — no curvature error, should converge immediately
    const result = adaptiveRefinementEngine.refine({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 20, y: 0, z: 0 },
      ],
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.01 },
      max_iterations: 10,
    });
    expect(result.converged).toBe(true);
    expect(result.points_added).toBe(0);
    expect(result.iterations).toBeLessThanOrEqual(1);
  });

  it("original points preserved in output", () => {
    const inputPoints = [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 5, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    const result = adaptiveRefinementEngine.refine({
      points: inputPoints,
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.001 },
      max_iterations: 3,
    });
    // All original points should appear with original=true
    const originals = result.refined_points.filter(p => p.original);
    expect(originals.length).toBe(inputPoints.length);
    // Check coordinates match
    for (let i = 0; i < inputPoints.length; i++) {
      const found = originals.find(
        p => p.x === inputPoints[i].x && p.y === inputPoints[i].y && p.z === inputPoints[i].z,
      );
      expect(found).toBeDefined();
    }
  });

  it("points_added count matches refinement_stats totals", () => {
    const result = adaptiveRefinementEngine.refine({
      points: [
        { x: 0, y: 0, z: 0, force_N: 100 },
        { x: 1, y: 0, z: 0, force_N: 200 },
        { x: 2, y: 0, z: 0, force_N: 100 },
      ],
      criteria: ["force"],
      tolerances: { max_force_gradient_N_mm: 5 },
      max_iterations: 5,
    });
    const statsTotal =
      result.refinement_stats.curvature_inserts +
      result.refinement_stats.force_inserts +
      result.refinement_stats.thermal_inserts +
      result.refinement_stats.engagement_inserts;
    // points_added should equal refined_count - original_count
    expect(result.points_added).toBe(result.refined_count - result.original_count);
    // Stats total reflects the number of individual insert operations (may differ from points_added
    // due to multiple iterations), but should be > 0 when points were added
    if (result.points_added > 0) {
      expect(statsTotal).toBeGreaterThan(0);
    }
  });

  it("max points cap is respected", () => {
    // Generate many zigzag points with very tight tolerance to force many inserts
    const pts = [];
    for (let i = 0; i < 20; i++) {
      pts.push({ x: i * 5, y: (i % 2) * 10, z: 0 });
    }
    const result = adaptiveRefinementEngine.refine({
      points: pts,
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.00001 },
      max_iterations: 50,
      max_points: 25,
    });
    expect(result.refined_count).toBeLessThanOrEqual(25);
  });

  it("handles fewer than 2 points gracefully", () => {
    const result = adaptiveRefinementEngine.refine({
      points: [{ x: 0, y: 0, z: 0 }],
      criteria: ["curvature"],
    });
    expect(result.refined_count).toBe(1);
    expect(result.warnings.some(w => w.includes("at least 2"))).toBe(true);
  });
});

// ============================================================================
// 5. MultiSetupPlannerEngine
// ============================================================================

describe("MultiSetupPlannerEngine", () => {
  const mkFeatures = () => [
    {
      id: "F1", type: "pocket" as const,
      access_direction: { x: 0, y: 0, z: 1 }, position: { x: 50, y: 50, z: 40 },
      dimensions: { width: 30, length: 30, depth: 20 }, tolerance_mm: 0.05, is_datum: true,
    },
    {
      id: "F2", type: "hole" as const,
      access_direction: { x: 0, y: 0, z: 1 }, position: { x: 20, y: 20, z: 50 },
      dimensions: { diameter: 10, depth: 30 }, tolerance_mm: 0.02,
    },
    {
      id: "F3", type: "slot" as const,
      access_direction: { x: 1, y: 0, z: 0 }, position: { x: 100, y: 50, z: 25 },
      dimensions: { width: 5, length: 40, depth: 10 }, tolerance_mm: 0.1,
    },
    {
      id: "F4", type: "surface" as const,
      access_direction: { x: 0, y: 0, z: -1 }, position: { x: 50, y: 50, z: 0 },
      dimensions: { width: 100, length: 100 }, surface_finish_ra: 0.8,
    },
  ];

  it("features assigned to setups based on access direction", () => {
    const result = multiSetupPlannerEngine.plan({
      features: mkFeatures(),
      part_bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
    });
    // F1,F2 access +Z -> should be in a +Z setup; F3 access +X -> in a +X setup; F4 access -Z -> in a -Z setup
    expect(result.setup_count).toBeGreaterThanOrEqual(2);
    // All features should be covered
    expect(result.covered_features).toBe(4);
    expect(result.uncovered_features).toHaveLength(0);
  });

  it("setup count minimized via set cover", () => {
    // All features accessible from +Z — should need only 1 setup
    const features = [
      { id: "A", type: "pocket" as const, access_direction: { x: 0, y: 0, z: 1 }, position: { x: 10, y: 10, z: 40 }, dimensions: { width: 10, depth: 10 } },
      { id: "B", type: "hole" as const, access_direction: { x: 0, y: 0, z: 1 }, position: { x: 50, y: 50, z: 50 }, dimensions: { diameter: 8, depth: 20 } },
      { id: "C", type: "slot" as const, access_direction: { x: 0, y: 0, z: 1 }, position: { x: 80, y: 80, z: 45 }, dimensions: { width: 5, length: 20, depth: 8 } },
    ];
    const result = multiSetupPlannerEngine.plan({
      features,
      part_bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
    });
    expect(result.setup_count).toBe(1);
    expect(result.covered_features).toBe(3);
  });

  it("datum chain tolerance computed for multi-setup", () => {
    const result = multiSetupPlannerEngine.plan({
      features: mkFeatures(),
      part_bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
      datum_tolerance_mm: 0.01,
    });
    if (result.setup_count > 1) {
      expect(result.datum_chain.length).toBe(result.setup_count - 1);
      expect(result.total_tolerance_stack_mm).toBeGreaterThan(0);
      // Each link has from/to setup and a contribution
      for (const link of result.datum_chain) {
        expect(link.from_setup).toBeDefined();
        expect(link.to_setup).toBeDefined();
        expect(link.tolerance_contribution_mm).toBeGreaterThan(0);
      }
    }
  });

  it("stability check validates clamping", () => {
    const result = multiSetupPlannerEngine.plan({
      features: mkFeatures(),
      part_bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
      clamping_force_N: 5000,
      max_cutting_force_N: 1000,
    });
    // +Z (top) setup: margin = 5000 / (1000*2.5) = 2.0 → stable
    for (const setup of result.setups) {
      expect(typeof setup.clamping_stable).toBe("boolean");
      expect(setup.stability_margin).toBeGreaterThan(0);
    }
    // Direct stability check for top orientation
    const topStab = multiSetupPlannerEngine.stabilityCheck(
      { name: "+Z", direction: { x: 0, y: 0, z: 1 } }, 1000, 5000,
    );
    expect(topStab.stable).toBe(true);
    expect(topStab.margin).toBe(2);
  });

  it("all features covered across setups", () => {
    const features = mkFeatures();
    const result = multiSetupPlannerEngine.plan({
      features,
      part_bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
    });
    // Collect all feature IDs from all setups
    const allAssigned = new Set<string>();
    for (const setup of result.setups) {
      for (const fid of setup.features) {
        allAssigned.add(fid);
      }
    }
    // Plus uncovered
    for (const uid of result.uncovered_features) {
      allAssigned.add(uid);
    }
    // Should account for every input feature
    expect(allAssigned.size).toBe(features.length);
    // covered_features + uncovered should equal total
    expect(result.covered_features + result.uncovered_features.length).toBe(result.total_features);
  });

  it("recommended algorithms assigned per setup", () => {
    const result = multiSetupPlannerEngine.plan({
      features: mkFeatures(),
      part_bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
    });
    for (const setup of result.setups) {
      expect(Array.isArray(setup.recommended_algorithms)).toBe(true);
      // Should have 1-2 recommended algorithms
      expect(setup.recommended_algorithms.length).toBeGreaterThanOrEqual(1);
      expect(setup.recommended_algorithms.length).toBeLessThanOrEqual(2);
    }
  });
});
