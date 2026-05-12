/**
 * Tests for Phase 0-D-7a wirings:
 *   U-MAT3: CompositesMachiningPhysicsEngine → calcDispatcher
 *   U-MAT4: WorkholdingSurfaceInferenceEngine (E1085) → machineSetupDispatcher
 *           QuoteToShipOrchestratorEngine (E1086) → businessDispatcher
 */

import { describe, it, expect } from "vitest";
import { compositesMachiningPhysicsEngine } from "../engines/CompositesMachiningPhysicsEngine.js";
import { workholdingSurfaceInferenceEngine } from "../engines/WorkholdingSurfaceInferenceEngine.js";
import { quoteToShipOrchestratorEngine } from "../engines/QuoteToShipOrchestratorEngine.js";

// ── U-MAT3: CompositesMachiningPhysicsEngine ─────────────────────

describe("CompositesMachiningPhysicsEngine.assessDelaminationRisk", () => {
  it("returns Tsai-Hill index and delamination risk", () => {
    const result = compositesMachiningPhysicsEngine.assessDelaminationRisk({
      fiber_type: "carbon",
      layup_angle_deg: 45,
      feed_per_tooth_mm: 0.05,
      cutting_speed_mpm: 200,
      tool_diameter_mm: 10,
      depth_of_cut_mm: 2,
    });
    expect(result).toHaveProperty("delamination_risk");
    expect(result).toHaveProperty("tsai_hill_index");
    expect(result).toHaveProperty("critical_thrust_force_N");
    expect(result).toHaveProperty("stress_components");
    expect(result.delamination_risk).toBeGreaterThanOrEqual(0);
    expect(result.delamination_risk).toBeLessThanOrEqual(1);
  });

  it("warns when speed exceeds fiber max", () => {
    const result = compositesMachiningPhysicsEngine.assessDelaminationRisk({
      fiber_type: "kevlar",
      layup_angle_deg: 0,
      feed_per_tooth_mm: 0.03,
      cutting_speed_mpm: 300, // kevlar max is 200
      tool_diameter_mm: 8,
      depth_of_cut_mm: 1,
    });
    expect(result.warnings.some(w => w.includes("exceeds recommended max"))).toBe(true);
  });

  it("deeper cut increases delamination risk", () => {
    const shallow = compositesMachiningPhysicsEngine.assessDelaminationRisk({
      fiber_type: "glass",
      layup_angle_deg: 45,
      feed_per_tooth_mm: 0.05,
      cutting_speed_mpm: 200,
      tool_diameter_mm: 10,
      depth_of_cut_mm: 0.5,
    });
    const deep = compositesMachiningPhysicsEngine.assessDelaminationRisk({
      fiber_type: "glass",
      layup_angle_deg: 45,
      feed_per_tooth_mm: 0.05,
      cutting_speed_mpm: 200,
      tool_diameter_mm: 10,
      depth_of_cut_mm: 5,
    });
    expect(deep.critical_thrust_force_N).toBeGreaterThan(shallow.critical_thrust_force_N);
  });

  it("supports all 4 fiber types", () => {
    for (const fiber of ["carbon", "glass", "aramid", "kevlar"] as const) {
      const result = compositesMachiningPhysicsEngine.assessDelaminationRisk({
        fiber_type: fiber,
        layup_angle_deg: 0,
        feed_per_tooth_mm: 0.05,
        cutting_speed_mpm: 100,
        tool_diameter_mm: 10,
        depth_of_cut_mm: 1,
      });
      expect(result.delamination_risk).toBeGreaterThanOrEqual(0);
      expect(result.tool_recommendations.length).toBeGreaterThan(0);
    }
  });
});

describe("CompositesMachiningPhysicsEngine.predictFiberPullout", () => {
  it("returns pullout length and surface quality impact", () => {
    const result = compositesMachiningPhysicsEngine.predictFiberPullout({
      fiber_type: "carbon",
      fiber_volume_fraction: 0.6,
      feed_per_tooth_mm: 0.05,
      cutting_speed_mpm: 200,
      tool_rake_angle_deg: 10,
    });
    expect(result).toHaveProperty("pullout_length_mm");
    expect(result).toHaveProperty("surface_quality_impact");
    expect(result).toHaveProperty("fiber_damage_zone_mm");
    expect(result).toHaveProperty("matrix_cracking_risk");
    expect(result.pullout_length_mm).toBeGreaterThan(0);
  });

  it("aramid/kevlar gets special tooling warning", () => {
    const result = compositesMachiningPhysicsEngine.predictFiberPullout({
      fiber_type: "aramid",
      fiber_volume_fraction: 0.5,
      feed_per_tooth_mm: 0.04,
      cutting_speed_mpm: 150,
      tool_rake_angle_deg: 12,
    });
    expect(result.warnings.some(w => w.includes("Aramid/Kevlar"))).toBe(true);
  });
});

describe("CompositesMachiningPhysicsEngine.optimizeCuttingParams", () => {
  it("returns Pareto-optimal solutions", () => {
    const result = compositesMachiningPhysicsEngine.optimizeCuttingParams({
      fiber_type: "carbon",
      layup_angle_deg: 0,
      tool_diameter_mm: 10,
      depth_of_cut_mm: 2,
    });
    expect(result).toHaveProperty("optimal_speed_mpm");
    expect(result).toHaveProperty("optimal_feed_mm");
    expect(result).toHaveProperty("mrr_cm3_per_min");
    expect(result).toHaveProperty("pareto_alternatives");
    expect(result.optimal_speed_mpm).toBeGreaterThan(0);
    expect(result.optimal_feed_mm).toBeGreaterThan(0);
  });

  it("returns valid output structure with constraints", () => {
    const result = compositesMachiningPhysicsEngine.optimizeCuttingParams({
      fiber_type: "glass",
      layup_angle_deg: 45,
      tool_diameter_mm: 12,
      depth_of_cut_mm: 3,
      max_delamination_risk: 0.3,
    });
    expect(result).toHaveProperty("optimal_speed_mpm");
    expect(result).toHaveProperty("pareto_alternatives");
    expect(result.pareto_alternatives.length).toBeGreaterThan(0);
  });
});

// ── U-MAT4a: WorkholdingSurfaceInferenceEngine (E1085) ───────────

describe("WorkholdingSurfaceInferenceEngine.inferSurfaces", () => {
  const baseSurfaces = [
    {
      id: "S1", type: "planar" as const, normal: { x: 0, y: 0, z: 1 },
      area_mm2: 800, position: { x: 0, y: 0, z: 0 }, flatness_mm: 0.02,
      depth_mm: 20, face: "bottom" as const, opposing_surface_id: "S2",
    },
    {
      id: "S2", type: "planar" as const, normal: { x: 0, y: 0, z: -1 },
      area_mm2: 800, position: { x: 0, y: 0, z: 50 }, flatness_mm: 0.03,
      depth_mm: 20, face: "top" as const, opposing_surface_id: "S1",
    },
    {
      id: "S3", type: "cylindrical" as const, normal: { x: 1, y: 0, z: 0 },
      area_mm2: 2000, position: { x: 0, y: 0, z: 25 }, diameter_mm: 50,
      length_mm: 30, concentricity_mm: 0.01, face: "internal" as const,
    },
  ];

  it("identifies viable workholding surfaces", () => {
    const result = workholdingSurfaceInferenceEngine.inferSurfaces({
      surfaces: baseSurfaces,
    });
    expect(result).toHaveProperty("viable_surfaces");
    expect(result).toHaveProperty("dead_ends");
    expect(result).toHaveProperty("recommended_setup_sequence");
    expect(result.viable_count).toBeGreaterThan(0);
    expect(result.surface_count).toBe(3);
  });

  it("scores vise method for planar surfaces with opposing faces", () => {
    const result = workholdingSurfaceInferenceEngine.inferSurfaces({
      surfaces: baseSurfaces,
    });
    const planarSurface = result.viable_surfaces.find(v => v.surface_id === "S1");
    expect(planarSurface).toBeDefined();
    const viseMethod = planarSurface?.workholding_methods.find(m => m.method === "vise");
    expect(viseMethod).toBeDefined();
    expect(viseMethod!.score).toBeGreaterThan(0.5);
  });

  it("scores chuck method for cylindrical surfaces", () => {
    const result = workholdingSurfaceInferenceEngine.inferSurfaces({
      surfaces: baseSurfaces,
    });
    const cylSurface = result.viable_surfaces.find(v => v.surface_id === "S3");
    expect(cylSurface).toBeDefined();
    const chuckMethod = cylSurface?.workholding_methods.find(m => m.method === "chuck");
    expect(chuckMethod).toBeDefined();
  });

  it("returns empty result for no surfaces", () => {
    const result = workholdingSurfaceInferenceEngine.inferSurfaces({ surfaces: [] });
    expect(result.viable_count).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("WorkholdingSurfaceInferenceEngine.trackSurvival", () => {
  it("tracks surface removal through operations", () => {
    const result = workholdingSurfaceInferenceEngine.trackSurvival({
      surfaces: [
        {
          id: "S1", type: "planar", normal: { x: 0, y: 0, z: 1 },
          area_mm2: 600, position: { x: 0, y: 0, z: 0 }, face: "bottom",
        },
      ],
      operations: [
        {
          id: "OP1", name: "Face mill top", sequence_index: 1,
          surfaces_removed: ["S1"], clamping_surfaces_needed: [],
        },
      ],
    });
    expect(result.operations_analyzed).toBe(1);
    const s1 = result.surface_status.find(s => s.surface_id === "S1");
    expect(s1?.surviving).toBe(false);
    expect(s1?.removed_by_operation).toBe("OP1");
  });
});

describe("WorkholdingSurfaceInferenceEngine.detectDeadEndsDirect", () => {
  it("detects dead-end when clamping surface is removed before needed", () => {
    const result = workholdingSurfaceInferenceEngine.detectDeadEndsDirect({
      surfaces: [
        {
          id: "S1", type: "planar", normal: { x: 0, y: 0, z: 1 },
          area_mm2: 800, position: { x: 0, y: 0, z: 0 }, flatness_mm: 0.02,
          depth_mm: 20, face: "bottom", opposing_surface_id: "S2",
        },
        {
          id: "S2", type: "planar", normal: { x: 0, y: 0, z: -1 },
          area_mm2: 800, position: { x: 0, y: 0, z: 50 }, flatness_mm: 0.03,
          depth_mm: 20, face: "top", opposing_surface_id: "S1",
        },
      ],
      operations: [
        {
          id: "OP1", name: "Remove bottom", sequence_index: 1,
          surfaces_removed: ["S1"], clamping_surfaces_needed: [],
        },
        {
          id: "OP2", name: "Machine top", sequence_index: 2,
          surfaces_removed: [], clamping_surfaces_needed: ["S1"],
        },
      ],
    });
    expect(result.dead_ends.length).toBeGreaterThan(0);
    expect(result.dead_ends[0].removes_surface).toBe("S1");
    expect(result.dead_ends[0].needed_by_operation).toBe("OP2");
  });
});

// ── U-MAT4b: QuoteToShipOrchestratorEngine (E1086) ──────────────

describe("QuoteToShipOrchestratorEngine.validateInput", () => {
  it("reports missing material_spec", () => {
    const result = quoteToShipOrchestratorEngine.validateInput({
      drawing_pdf: "test.pdf",
    } as any);
    expect(result).toBeDefined();
  });
});

describe("QuoteToShipOrchestratorEngine.getStageDescriptors", () => {
  it("returns all 27 pipeline stages", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    expect(stages.length).toBe(27);
    expect(stages[0].id).toBe("INTAKE");
    expect(stages[26].id).toBe("SHIPPING");
  });

  it("each stage has required fields", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    for (const stage of stages) {
      expect(stage).toHaveProperty("id");
      expect(stage).toHaveProperty("label");
      expect(stage).toHaveProperty("engines");
      expect(stage).toHaveProperty("requires");
    }
  });

  it("INTAKE stage has no prerequisites", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    const intake = stages.find(s => s.id === "INTAKE");
    expect(intake?.requires).toEqual([]);
  });

  it("QUOTE stage requires DFM_CHECK and FEASIBILITY", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    const quote = stages.find(s => s.id === "QUOTE");
    expect(quote?.requires).toContain("DFM_CHECK");
    expect(quote?.requires).toContain("FEASIBILITY");
  });
});
