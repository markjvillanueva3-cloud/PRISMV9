/**
 * L2-P2-MS1: 16 CAD/CAM Engine Tests
 * Smoke tests for all 16 new engines: singletons, core computation, API shape.
 */
import { describe, it, expect } from "vitest";
import {
  geometryEngine,
  meshEngine,
  featureRecognitionEngine,
  toolpathGenerationEngine,
  postProcessorEngine,
  surfaceFinishEngine,
  collisionDetectionEngine,
  stockModelEngine,
  clampingSimEngine,
  thermalSimEngine,
  toolAssemblyEngine,
  workCoordinateEngine,
  dimensionalAnalysisEngine,
  toleranceStackEngine,
  gcodeOptimizationEngine,
  machinabilityRatingEngine,
} from "../engines/index.js";

// ============================================================================
// 1. GeometryEngine
// ============================================================================
describe("GeometryEngine", () => {
  it("singleton exists", () => expect(geometryEngine).toBeDefined());
  it("creates a primitive", () => {
    const p = geometryEngine.createPrimitive("box", { width: 100, height: 50, depth: 30 });
    expect(p.type).toBe("box");
    expect(p.id).toContain("geom-box-");
  });
  it("computes bounding box", () => {
    const box = geometryEngine.createPrimitive("box", { width: 100, height: 50, depth: 30 });
    const bb = geometryEngine.boundingBox([box]);
    expect(bb.volume_mm3).toBeGreaterThan(0);
    expect(bb.size.x).toBe(100);
  });
  it("computes distance", () => {
    const d = geometryEngine.distance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(d.distance_mm).toBeCloseTo(5, 5);
  });
  it("analyzes primitives", () => {
    const box = geometryEngine.createPrimitive("box", { width: 50, height: 50, depth: 50 });
    const a = geometryEngine.analyze([box]);
    expect(a.primitive_count).toBe(1);
    expect(a.total_volume_mm3).toBeGreaterThan(0);
  });
});

// ============================================================================
// 2. MeshEngine
// ============================================================================
describe("MeshEngine", () => {
  it("singleton exists", () => expect(meshEngine).toBeDefined());
  it("generates a box mesh", () => {
    const mesh = meshEngine.generateBox(100, 50, 30);
    expect(mesh.vertices.length).toBe(8);
    expect(mesh.triangles.length).toBe(12);
  });
  it("generates a cylinder mesh", () => {
    const mesh = meshEngine.generateCylinder(20, 50, 16);
    expect(mesh.vertices.length).toBeGreaterThan(16);
    expect(mesh.triangles.length).toBeGreaterThan(16);
  });
  it("analyzes mesh quality", () => {
    const mesh = meshEngine.generateBox(100, 50, 30);
    const q = meshEngine.analyze(mesh);
    expect(q.vertex_count).toBe(8);
    expect(q.triangle_count).toBe(12);
    expect(q.volume_mm3).toBeGreaterThan(0);
  });
  it("exports STL", () => {
    const mesh = meshEngine.generateBox(10, 10, 10);
    const stl = meshEngine.exportSTL(mesh);
    expect(stl).toContain("solid");
    expect(stl).toContain("facet normal");
  });
});

// ============================================================================
// 3. FeatureRecognitionEngine
// ============================================================================
describe("FeatureRecognitionEngine", () => {
  it("singleton exists", () => expect(featureRecognitionEngine).toBeDefined());
  it("recognizes features", () => {
    const result = featureRecognitionEngine.recognize([
      { type: "through_hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, position: { x: 0, y: 0, z: 0 } },
      { type: "pocket_rectangular", dimensions: { width_mm: 30, length_mm: 40, depth_mm: 10 }, position: { x: 50, y: 0, z: 0 } },
    ]);
    expect(result.total_features).toBe(2);
    expect(result.features[0].type).toBe("through_hole");
  });
  it("classifies a feature", () => {
    const result = featureRecognitionEngine.recognize([
      { type: "tapped_hole", dimensions: { diameter_mm: 8, depth_mm: 15, pitch_mm: 1.25 }, position: { x: 0, y: 0, z: 0 } },
    ]);
    const cls = featureRecognitionEngine.classify(result.features[0]);
    expect(cls.manufacturing_difficulty).toBe("moderate");
    expect(cls.required_operations).toContain("tapping");
  });
});

// ============================================================================
// 4. ToolpathGenerationEngine
// ============================================================================
describe("ToolpathGenerationEngine", () => {
  it("singleton exists", () => expect(toolpathGenerationEngine).toBeDefined());
  it("selects strategy for feature type", () => {
    const s = toolpathGenerationEngine.selectStrategy("pocket_rectangular");
    expect(s.strategy).toBe("pocket_zigzag");
    expect(s.stepover_pct).toBe(65);
  });
  it("generates a toolpath", () => {
    const tp = toolpathGenerationEngine.generate("pocket_rectangular",
      { width_mm: 40, length_mm: 60, depth_mm: 10 },
      { strategy: "pocket_zigzag", tool_diameter_mm: 10, stepover_pct: 50, stepdown_mm: 3, feed_rate_mmmin: 800, plunge_rate_mmmin: 200, spindle_rpm: 8000, cut_direction: "climb", coolant: "flood", retract_height_mm: 5 }
    );
    expect(tp.segments.length).toBeGreaterThan(0);
    expect(tp.estimated_time_sec).toBeGreaterThan(0);
    expect(tp.number_of_passes).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 5. PostProcessorEngine
// ============================================================================
describe("PostProcessorEngine", () => {
  it("singleton exists", () => expect(postProcessorEngine).toBeDefined());
  it("generates Fanuc G-code", () => {
    const result = postProcessorEngine.process(
      { moves: [{ type: "rapid", x: 0, y: 0, z: 50 }, { type: "feed", x: 100, y: 0, z: -5, feed: 500 }], tool_number: 1, tool_diameter_mm: 10, spindle_rpm: 8000, feed_rate_mmmin: 500, coolant: "flood", work_offset: "G54" },
      { controller: "fanuc", use_canned_cycles: true, use_tool_length_comp: true, decimal_places: 3, line_numbers: false, line_number_increment: 10, coolant_code: "M08", safe_start_block: true, program_end: "M30" }
    );
    expect(result.gcode).toContain("G90");
    expect(result.gcode).toContain("M30");
    expect(result.controller).toBe("fanuc");
  });
  it("supports 6 controllers", () => {
    expect(postProcessorEngine.supportedControllers().length).toBe(6);
  });
});

// ============================================================================
// 6. SurfaceFinishEngine
// ============================================================================
describe("SurfaceFinishEngine", () => {
  it("singleton exists", () => expect(surfaceFinishEngine).toBeDefined());
  it("predicts Ra for turning", () => {
    const result = surfaceFinishEngine.predict({
      process: "turning", feed_per_rev_mm: 0.15, tool_nose_radius_mm: 0.8, iso_material_group: "P", coolant: "flood",
    });
    expect(result.ra_um).toBeGreaterThan(0);
    expect(result.rz_um).toBeGreaterThan(result.ra_um);
    expect(result.process).toBe("turning");
  });
  it("returns achievable finishes", () => {
    const finishes = surfaceFinishEngine.achievable();
    expect(finishes.length).toBeGreaterThanOrEqual(8);
    expect(finishes.find(f => f.process === "grinding")!.best_ra_um).toBeLessThan(0.1);
  });
});

// ============================================================================
// 7. CollisionDetectionEngine — SAFETY CRITICAL
// ============================================================================
describe("CollisionDetectionEngine (SAFETY)", () => {
  it("singleton exists", () => expect(collisionDetectionEngine).toBeDefined());
  it("detects collision between overlapping bodies", () => {
    const bodies = [
      { id: "tool", type: "tool" as const, aabb: { min: { x: -5, y: -5, z: -10 }, max: { x: 5, y: 5, z: 0 } }, is_moving: true },
      { id: "fixture", type: "fixture" as const, aabb: { min: { x: -20, y: -20, z: -5 }, max: { x: 20, y: 20, z: 5 } }, is_moving: false },
    ];
    const moves = [{ from: { x: 0, y: 0, z: 50 }, to: { x: 0, y: 0, z: -5 }, type: "feed" as const }];
    const result = collisionDetectionEngine.checkFull(bodies, moves);
    expect(result.has_collision).toBe(true);
    expect(result.severity).toBe("collision");
  });
  it("reports safe when no overlap", () => {
    const bodies = [
      { id: "tool", type: "tool" as const, aabb: { min: { x: -5, y: -5, z: 50 }, max: { x: 5, y: 5, z: 100 } }, is_moving: true },
      { id: "fixture", type: "fixture" as const, aabb: { min: { x: -20, y: -20, z: -10 }, max: { x: 20, y: 20, z: 0 } }, is_moving: false },
    ];
    const moves = [{ from: { x: 0, y: 0, z: 100 }, to: { x: 50, y: 0, z: 100 }, type: "rapid" as const }];
    const result = collisionDetectionEngine.checkFull(bodies, moves);
    expect(result.has_collision).toBe(false);
  });
  it("checks rapid safety", () => {
    const moves = [
      { from: { x: 0, y: 0, z: 50 }, to: { x: 100, y: 0, z: 50 }, type: "rapid" as const },
      { from: { x: 100, y: 0, z: 50 }, to: { x: 100, y: 0, z: -5 }, type: "rapid" as const },
    ];
    const check = collisionDetectionEngine.checkRapids(moves, 5);
    // Move #2 triggers both below-safeZ and large-descent (dz=-55) rules
    expect(check.unsafe_rapids).toBe(2);
    expect(check.safe).toBe(false);
  });
});

// ============================================================================
// 8. StockModelEngine
// ============================================================================
describe("StockModelEngine", () => {
  it("singleton exists", () => expect(stockModelEngine).toBeDefined());
  it("creates stock and tracks removal", () => {
    const stock = { id: "STK-TEST", type: "billet" as const, material: "aluminum_6061", dimensions: { width_mm: 100, height_mm: 100, depth_mm: 50 } };
    const state = stockModelEngine.create(stock, 200000);
    expect(state.original_volume_mm3).toBe(500000);
    expect(state.part_volume_mm3).toBe(200000);

    const updated = stockModelEngine.removeVolume("STK-TEST", { operation_id: "OP1", operation_type: "roughing", volume_removed_mm3: 150000, tool_used: "EM-10", time_sec: 120 });
    expect(updated!.removed_volume_mm3).toBe(150000);
    expect(updated!.removal_pct).toBeGreaterThan(0);
  });
});

// ============================================================================
// 9. ClampingSimEngine — SAFETY CRITICAL
// ============================================================================
describe("ClampingSimEngine (SAFETY)", () => {
  it("singleton exists", () => expect(clampingSimEngine).toBeDefined());
  it("simulates safe clamping", () => {
    const result = clampingSimEngine.simulate({
      clamp_points: [
        { id: "C1", type: "vise_jaw", position: { x: -50, y: 0, z: 0 }, force_direction: { fx: 1, fy: 0, fz: -0.3 }, max_force_N: 5000, contact_area_mm2: 500, friction_coefficient: 0.3 },
        { id: "C2", type: "vise_jaw", position: { x: 50, y: 0, z: 0 }, force_direction: { fx: -1, fy: 0, fz: -0.3 }, max_force_N: 5000, contact_area_mm2: 500, friction_coefficient: 0.3 },
      ],
      cutting_forces: { fx_N: 500, fy_N: 300, fz_N: 200, torque_Nm: 5, max_resultant_N: 616 },
      part_mass_kg: 2,
      part_material: "aluminum",
      part_dimensions: { width_mm: 100, height_mm: 50, depth_mm: 80 },
    });
    expect(result.safety_factor).toBeGreaterThan(2.5);
    expect(result.is_safe).toBe(true);
    expect(result.min_safety_factor).toBe(2.5);
  });
});

// ============================================================================
// 10. ThermalSimEngine — SAFETY CRITICAL
// ============================================================================
describe("ThermalSimEngine (SAFETY)", () => {
  it("singleton exists", () => expect(thermalSimEngine).toBeDefined());
  it("predicts cutting temperature", () => {
    const result = thermalSimEngine.predict({
      cutting_speed_mmin: 200, feed_mm: 0.15, depth_of_cut_mm: 2, iso_material_group: "P",
      tool_material: "carbide", coolant: "flood", operation: "turning",
    });
    expect(result.cutting_zone_temp_C).toBeGreaterThan(100);
    expect(result.heat_partition.chip_pct).toBeGreaterThan(50);
    expect(result.thermal_expansion_um).toBeGreaterThanOrEqual(0);
  });
  it("validates thermal safety", () => {
    const check = thermalSimEngine.validate({
      cutting_speed_mmin: 50, feed_mm: 0.1, depth_of_cut_mm: 1, iso_material_group: "N",
      tool_material: "carbide", coolant: "flood", operation: "milling",
    });
    expect(check.safe).toBe(true);
  });
});

// ============================================================================
// 11. ToolAssemblyEngine
// ============================================================================
describe("ToolAssemblyEngine", () => {
  it("singleton exists", () => expect(toolAssemblyEngine).toBeDefined());
  it("assembles and validates", () => {
    const holders = toolAssemblyEngine.listHolders("CAT40");
    expect(holders.length).toBeGreaterThan(0);
    const holder = holders[0];
    const tool = { id: "EM10", type: "end_mill", shank_diameter_mm: 10, cutting_diameter_mm: 10, flute_length_mm: 25, overall_length_mm: 60, number_of_flutes: 4 };
    const assembly = toolAssemblyEngine.assemble(holder, tool);
    expect(assembly.stickout_mm).toBeGreaterThan(0);
    expect(assembly.total_gauge_length_mm).toBeGreaterThan(holder.gauge_length_mm);
    const validation = toolAssemblyEngine.validate(assembly);
    expect(validation.compatible).toBe(true);
  });
});

// ============================================================================
// 12. WorkCoordinateEngine
// ============================================================================
describe("WorkCoordinateEngine", () => {
  it("singleton exists", () => expect(workCoordinateEngine).toBeDefined());
  it("creates and lists WCS offsets", () => {
    workCoordinateEngine.clear();
    const wcs = workCoordinateEngine.create("G54", { x: 100, y: 50, z: 0 }, "Part 1");
    expect(wcs.code).toBe("G54");
    expect(workCoordinateEngine.listOffsets().length).toBe(1);
    workCoordinateEngine.clear();
  });
  it("sets up from datums", () => {
    workCoordinateEngine.clear();
    const setup = workCoordinateEngine.setupFromDatums("G54", [
      { id: "D1", name: "A", type: "surface", position: { x: 0, y: 0, z: 0 }, method: "probe" },
      { id: "D2", name: "B", type: "edge", position: { x: 0, y: 0, z: 0 }, method: "edge_finder" },
    ]);
    expect(setup.probe_sequence.length).toBeGreaterThan(0);
    expect(setup.estimated_setup_time_min).toBeGreaterThan(0);
    workCoordinateEngine.clear();
  });
});

// ============================================================================
// 13. DimensionalAnalysisEngine — SAFETY CRITICAL
// ============================================================================
describe("DimensionalAnalysisEngine (SAFETY)", () => {
  it("singleton exists", () => expect(dimensionalAnalysisEngine).toBeDefined());
  it("predicts dimensional error", () => {
    const result = dimensionalAnalysisEngine.predict({
      nominal_mm: 50, tolerance_mm: 0.05, tolerance_type: "bilateral",
      machine_accuracy_mm: 0.005, tool_diameter_mm: 10, tool_stickout_mm: 40,
      cutting_force_N: 500, iso_material_group: "P", cutting_speed_mmin: 200,
      operation_time_min: 5,
    });
    expect(result.total_error_mm).toBeGreaterThan(0);
    expect(result.error_budget.machine_accuracy_mm).toBe(0.005);
    expect(result.error_budget.tool_deflection_mm).toBeGreaterThan(0);
  });
  it("validates achievability", () => {
    const v = dimensionalAnalysisEngine.validate({
      nominal_mm: 50, tolerance_mm: 0.5, tolerance_type: "bilateral",
      machine_accuracy_mm: 0.005, tool_diameter_mm: 10, tool_stickout_mm: 30,
      cutting_force_N: 200, iso_material_group: "N", cutting_speed_mmin: 300,
      operation_time_min: 2,
    });
    expect(v.achievable).toBe(true);
    expect(v.margin_mm).toBeGreaterThan(0);
  });
});

// ============================================================================
// 14. ToleranceStackEngine
// ============================================================================
describe("ToleranceStackEngine", () => {
  it("singleton exists", () => expect(toleranceStackEngine).toBeDefined());
  it("worst-case stack", () => {
    const dims = [
      { id: "D1", name: "Shaft", nominal_mm: 50, tolerance_plus_mm: 0.01, tolerance_minus_mm: 0.01, direction: "positive" as const },
      { id: "D2", name: "Housing", nominal_mm: 50.05, tolerance_plus_mm: 0.02, tolerance_minus_mm: 0.02, direction: "negative" as const },
    ];
    const result = toleranceStackEngine.worstCase(dims, 0);
    expect(result.method).toBe("worst_case");
    // Gap = positive(50) - negative(50.05) = -0.05 (interference fit)
    expect(result.nominal_gap_mm).toBeCloseTo(-0.05, 2);
    expect(result.total_tolerance_mm).toBeGreaterThan(0);
  });
  it("RSS stack", () => {
    const dims = [
      { id: "D1", name: "A", nominal_mm: 10, tolerance_plus_mm: 0.05, tolerance_minus_mm: 0.05, direction: "positive" as const },
      { id: "D2", name: "B", nominal_mm: 10, tolerance_plus_mm: 0.05, tolerance_minus_mm: 0.05, direction: "positive" as const },
      { id: "D3", name: "Gap", nominal_mm: 20.1, tolerance_plus_mm: 0.1, tolerance_minus_mm: 0.1, direction: "negative" as const },
    ];
    const result = toleranceStackEngine.rss(dims, 0);
    expect(result.method).toBe("rss");
    expect(result.sigma_mm).toBeGreaterThan(0);
  });
});

// ============================================================================
// 15. GCodeOptimizationEngine
// ============================================================================
describe("GCodeOptimizationEngine", () => {
  it("singleton exists", () => expect(gcodeOptimizationEngine).toBeDefined());
  it("analyzes G-code", () => {
    const gcode = "G90 G80\nG00 X0 Y0 Z50\nT1 M06\nS8000 M03\nM08\nG00 X10 Y10\nG01 Z-5 F500\nG01 X50 Y10 F800\nG00 Z50\nM09\nM30";
    const analysis = gcodeOptimizationEngine.analyze(gcode);
    expect(analysis.total_lines).toBe(11);
    expect(analysis.tool_changes).toBeGreaterThanOrEqual(1);
    expect(analysis.rapid_moves).toBeGreaterThan(0);
    expect(analysis.feed_moves).toBeGreaterThan(0);
  });
  it("optimizes G-code", () => {
    const gcode = "G90\n\n\nG00 X0 Y0 Z50\n\n\nG01 X10 Y10 Z-5 F500\nG01 X10 Y10 Z-5 F500\nM30";
    const result = gcodeOptimizationEngine.optimize(gcode);
    expect(result.lines_removed).toBeGreaterThan(0);
    expect(result.optimized_lines).toBeLessThan(result.original_lines);
  });
});

// ============================================================================
// 16. MachinabilityRatingEngine
// ============================================================================
describe("MachinabilityRatingEngine", () => {
  it("singleton exists", () => expect(machinabilityRatingEngine).toBeDefined());
  it("rates aluminum as excellent", () => {
    const result = machinabilityRatingEngine.rate({ material_name: "6061-T6 Al" });
    expect(result.overall_rating).toBeGreaterThanOrEqual(80);
    expect(result.category).toBe("excellent");
    expect(result.recommended_speed_factor).toBeGreaterThan(1);
  });
  it("rates Inconel as very poor", () => {
    const result = machinabilityRatingEngine.rate({ material_name: "Inconel 718" });
    expect(result.overall_rating).toBeLessThan(20);
    expect(result.category).toBe("very_poor");
  });
  it("compares materials", () => {
    const comp = machinabilityRatingEngine.compare([
      { material_name: "6061-T6 Al" },
      { material_name: "Ti-6Al-4V" },
      { material_name: "AISI 1045" },
    ]);
    expect(comp.materials.length).toBe(3);
    expect(comp.best_index).toBe(0); // aluminum
    expect(comp.speed_ratio).toBeGreaterThan(5);
  });
  it("lists available materials", () => {
    expect(machinabilityRatingEngine.listMaterials().length).toBeGreaterThanOrEqual(14);
  });
});
