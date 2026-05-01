/**
 * WEDM-P2P Pipeline Engines — Comprehensive Test Suite
 *
 * 12 engines x 3+ tests each (36+ tests) + 2 integration tests.
 *
 * Engines:
 *   1. EDMDrawingInterpretationEngine   2. EDMFeasibilityEngine
 *   3. EDMMaterialMachineWireEngine     4. EDMStartHoleSetupEngine
 *   5. EDMToolpathStrategyEngine        6. EDMMultiPassStrategyEngine
 *   7. EDMCuttingParamFlushEngine       8. EDMWireSlugCornerTaperEngine
 *   9. EDMMonitorSurfaceIntegrityEngine 10. EDMPostProcessGCodeEngine
 *  11. EDMCostDocumentationEngine       12. EDMQualityOrchestratorEngine
 */
import { describe, it, expect } from "vitest";

// Engine imports
import { edmDrawingInterpretationEngine } from "../engines/EDMDrawingInterpretationEngine.js";
import { edmFeasibilityEngine } from "../engines/EDMFeasibilityEngine.js";
import { edmMaterialMachineWireEngine } from "../engines/EDMMaterialMachineWireEngine.js";
import { edmStartHoleSetupEngine } from "../engines/EDMStartHoleSetupEngine.js";
import { edmToolpathStrategyEngine } from "../engines/EDMToolpathStrategyEngine.js";
import { edmMultiPassStrategyEngine } from "../engines/EDMMultiPassStrategyEngine.js";
import { edmCuttingParamFlushEngine } from "../engines/EDMCuttingParamFlushEngine.js";
import { edmWireSlugCornerTaperEngine } from "../engines/EDMWireSlugCornerTaperEngine.js";
import { edmMonitorSurfaceIntegrityEngine } from "../engines/EDMMonitorSurfaceIntegrityEngine.js";
import { edmPostProcessGCodeEngine } from "../engines/EDMPostProcessGCodeEngine.js";
import { edmCostDocumentationEngine } from "../engines/EDMCostDocumentationEngine.js";
import { edmQualityOrchestratorEngine } from "../engines/EDMQualityOrchestratorEngine.js";

// Schema imports for validation
import { WEDM_PIPELINE_ACTION_SCHEMAS, WEDM_PIPELINE_ACTIONS } from "../schemas/wedmPipelineActionSchemas.js";

// ============================================================================
// SHARED FIXTURES
// ============================================================================

const STD_FEATURES = [
  {
    name: "gear_profile",
    type: "profile" as const,
    is_through: true,
    dimensions_mm: { length: 50, width: 25, depth: 20 },
    tolerance_mm: 0.01,
    surface_finish_ra_um: 0.8,
    min_corner_radius_mm: 0.15,
    profile_length_mm: 200,
  },
];

const STD_FEASIBILITY_FEATURES = [
  {
    name: "punch_profile",
    is_through: true,
    profile_length_mm: 150,
    min_corner_radius_mm: 0.2,
    tolerance_mm: 0.01,
    surface_finish_ra_um: 0.8,
  },
];

const STD_WORKPIECE = {
  thickness_mm: 25,
  length_mm: 100,
  width_mm: 80,
  height_mm: 25,
};

const STD_PROFILES = [
  {
    name: "cavity_1",
    type: "closed_internal" as const,
    contour_points: [
      { x: 0, y: 0 }, { x: 50, y: 0 },
      { x: 50, y: 30 }, { x: 0, y: 30 },
    ],
    profile_length_mm: 160,
    min_corner_radius_mm: 0.2,
    tolerance_mm: 0.01,
    start_hole_id: "SH1",
    is_critical_surface: false,
  },
  {
    name: "outside_contour",
    type: "closed_external" as const,
    contour_points: [
      { x: -5, y: -5 }, { x: 55, y: -5 },
      { x: 55, y: 35 }, { x: -5, y: 35 },
    ],
    profile_length_mm: 240,
    tolerance_mm: 0.02,
    is_critical_surface: true,
  },
];

const STD_PROFILE_GEOM = [
  {
    id: "P1",
    min_x_mm: 10,
    min_y_mm: 10,
    max_x_mm: 60,
    max_y_mm: 40,
    is_interior: true,
    approach_x_mm: 5,
    approach_y_mm: 5,
    min_wall_thickness_mm: 3.0,
  },
];

// ============================================================================
// 1. EDMDrawingInterpretationEngine
// ============================================================================

describe("EDMDrawingInterpretationEngine", () => {
  it("exports and is not null", () => {
    expect(edmDrawingInterpretationEngine).toBeTruthy();
    expect(typeof edmDrawingInterpretationEngine.interpret).toBe("function");
  });

  it("interprets a drawing and returns classified features and pass requirements", () => {
    const r = edmDrawingInterpretationEngine.interpret({
      features: STD_FEATURES,
      material: "D2",
      material_hardness_hrc: 60,
      overall_thickness_mm: 25,
      tolerance_mm: 0.01,
      target_ra_um: 0.8,
    });
    expect(r).toBeTruthy();
    expect(r.features_classified).toBeDefined();
    expect(r.features_classified.length).toBeGreaterThan(0);
    expect(r.pass_requirements).toBeDefined();
    expect(r.pass_requirements.total_passes).toBeGreaterThan(0);
  });

  it("calculates more passes for tighter tolerances", () => {
    const loose = edmDrawingInterpretationEngine.calculatePassesAction({
      features: STD_FEATURES,
      tolerance_mm: 0.05,
      target_ra_um: 3.0,
    });
    const tight = edmDrawingInterpretationEngine.calculatePassesAction({
      features: STD_FEATURES,
      tolerance_mm: 0.005,
      target_ra_um: 0.3,
    });
    expect(tight.total_passes).toBeGreaterThanOrEqual(loose.total_passes);
  });

  it("classifies wire-EDM-suitable features correctly", () => {
    const r = edmDrawingInterpretationEngine.classifyFeaturesAction({
      features: [{
        name: "through_slot",
        type: "slot" as const,
        is_through: true,
        dimensions_mm: { length: 30, width: 2 },
        tolerance_mm: 0.01,
        surface_finish_ra_um: 0.8,
        min_corner_radius_mm: 0.15,
        profile_length_mm: 64,
      }],
      material: "tool_steel",
    });
    expect(r.features_classified).toBeDefined();
    expect(r.features_classified.length).toBe(1);
    expect(r.features_classified[0].edm_process).toBe("wire_edm");
  });
});

// ============================================================================
// 2. EDMFeasibilityEngine
// ============================================================================

describe("EDMFeasibilityEngine", () => {
  const baseInput = {
    material: "D2",
    material_resistivity_uohm_cm: 55,
    features: STD_FEASIBILITY_FEATURES,
    workpiece: STD_WORKPIECE,
  };

  it("exports and is not null", () => {
    expect(edmFeasibilityEngine).toBeTruthy();
    expect(typeof edmFeasibilityEngine.assess).toBe("function");
  });

  it("assesses D2 tool steel as feasible", () => {
    const r = edmFeasibilityEngine.assess(baseInput);
    expect(r).toBeTruthy();
    expect(r.overall_feasible).toBe(true);
    expect(r.conductivity.feasible).toBe(true);
    expect(r.time_estimate).toBeDefined();
    expect(r.time_estimate.total_hours).toBeGreaterThan(0);
  });

  it("detects non-conductive material (ceramic) as infeasible", () => {
    const r = edmFeasibilityEngine.assess({
      ...baseInput,
      material: "alumina_ceramic",
      material_resistivity_uohm_cm: 1e14,
    });
    expect(r.conductivity.feasible).toBe(false);
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it("estimates cutting time proportional to profile length", () => {
    const short = edmFeasibilityEngine.estimate_time({
      ...baseInput,
      features: [{ ...STD_FEASIBILITY_FEATURES[0], profile_length_mm: 50 }],
    });
    const long = edmFeasibilityEngine.estimate_time({
      ...baseInput,
      features: [{ ...STD_FEASIBILITY_FEATURES[0], profile_length_mm: 500 }],
    });
    expect(long.total_hours).toBeGreaterThan(short.total_hours);
  });
});

// ============================================================================
// 3. EDMMaterialMachineWireEngine
// ============================================================================

describe("EDMMaterialMachineWireEngine", () => {
  it("exports and is not null", () => {
    expect(edmMaterialMachineWireEngine).toBeTruthy();
    expect(typeof edmMaterialMachineWireEngine.assessMaterial).toBe("function");
  });

  it("assesses D2 tool steel material and returns machinability class", () => {
    const r = edmMaterialMachineWireEngine.assessMaterial({
      material: "D2",
      hardness_hrc: 60,
    });
    expect(r).toBeTruthy();
    expect(r.machinability_class).toBeDefined();
    expect(["A", "B", "C", "D"]).toContain(r.machinability_class);
    expect(r.thermal).toBeDefined();
    expect(r.thermal.melting_point_C).toBeGreaterThan(0);
  });

  it("selects a wire type for given material and thickness", () => {
    const r = edmMaterialMachineWireEngine.selectWire({
      material: "D2",
      thickness_mm: 25,
      min_corner_radius_mm: 0.15,
      target_surface_finish_Ra_um: 0.8,
    });
    expect(r).toBeTruthy();
    expect(r.recommended_wire).toBeDefined();
    expect(r.diameter_mm).toBeGreaterThan(0);
  });

  it("selects a machine fitting the workpiece dimensions", () => {
    const r = edmMaterialMachineWireEngine.selectMachine({
      part_x_mm: 200,
      part_y_mm: 150,
      part_z_mm: 50,
      material: "D2",
    });
    expect(r).toBeTruthy();
    expect(r.recommended_machines).toBeDefined();
    expect(r.recommended_machines.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. EDMStartHoleSetupEngine
// ============================================================================

describe("EDMStartHoleSetupEngine", () => {
  const workpiece = {
    material: "tool_steel" as const,
    hardness_hrc: 60,
    thickness_mm: 25,
    length_mm: 100,
    width_mm: 80,
    weight_kg: 1.56,
    is_hardened: true,
  };

  it("exports and is not null", () => {
    expect(edmStartHoleSetupEngine).toBeTruthy();
    expect(typeof edmStartHoleSetupEngine.action_plan_start_holes).toBe("function");
  });

  it("plans start holes for interior profiles", () => {
    const r = edmStartHoleSetupEngine.action_plan_start_holes({
      profiles: STD_PROFILE_GEOM,
      workpiece,
    });
    expect(r).toBeTruthy();
    expect(r.holes).toBeDefined();
    expect(r.holes.length).toBeGreaterThan(0);
    expect(r.holes[0].diameter_mm).toBeGreaterThan(0);
  });

  it("generates a complete setup plan", () => {
    const holes = edmStartHoleSetupEngine.action_plan_start_holes({
      profiles: STD_PROFILE_GEOM,
      workpiece,
    });
    const r = edmStartHoleSetupEngine.action_plan_setup({
      profiles: STD_PROFILE_GEOM,
      workpiece,
      holes: holes.holes,
      tank: { tank_length_mm: 600, tank_width_mm: 400, max_fill_height_mm: 300 },
    });
    expect(r).toBeTruthy();
    expect(r.setup_checklist).toBeDefined();
    expect(r.setup_checklist.length).toBeGreaterThan(0);
  });

  it("selects EDM hole popper for hardened steel", () => {
    const method = edmStartHoleSetupEngine.selectMethod({
      material: "hardened_steel" as const,
      hardness_hrc: 62,
      thickness_mm: 30,
      length_mm: 100,
      width_mm: 80,
      weight_kg: 1.87,
      is_hardened: true,
    });
    // Hardened steel > 55 HRC should use EDM hole popper
    expect(["edm_hole_popper", "mixed"]).toContain(method);
  });
});

// ============================================================================
// 5. EDMToolpathStrategyEngine
// ============================================================================

describe("EDMToolpathStrategyEngine", () => {
  const toolpathInput = {
    profiles: STD_PROFILES,
    workpiece_thickness_mm: 25,
    wire_diameter_mm: 0.25,
  };

  it("exports and is not null", () => {
    expect(edmToolpathStrategyEngine).toBeTruthy();
    expect(typeof edmToolpathStrategyEngine.generate_toolpath).toBe("function");
  });

  it("generates toolpath with classified profiles and cut sequence", () => {
    const r = edmToolpathStrategyEngine.generate_toolpath(toolpathInput);
    expect(r).toBeTruthy();
    expect(r.profiles_classified).toBeDefined();
    expect(r.profiles_classified.length).toBe(2);
    expect(r.cut_sequence).toBeDefined();
    expect(r.cut_sequence.length).toBe(2);
    // Internal profiles should be cut before external
    expect(r.cut_sequence[0]).toBe("cavity_1");
  });

  it("plans tabs for internal profiles with slug weight consideration", () => {
    const r = edmToolpathStrategyEngine.plan_tabs(toolpathInput);
    expect(r).toBeTruthy();
    expect(r.tabs).toBeDefined();
    // Internal profiles need tabs
    expect(r.tabs.length).toBeGreaterThan(0);
  });

  it("assigns CW direction to external and CCW to internal profiles", () => {
    const r = edmToolpathStrategyEngine.classify_profiles(toolpathInput);
    const internal = r.profiles_classified.find(p => p.name === "cavity_1");
    const external = r.profiles_classified.find(p => p.name === "outside_contour");
    expect(internal).toBeDefined();
    expect(external).toBeDefined();
    // Convention: internal = CCW (climb cut from outside), external = CW
    expect(internal!.cut_direction).toBe("CCW");
    expect(external!.cut_direction).toBe("CW");
  });
});

// ============================================================================
// 6. EDMMultiPassStrategyEngine
// ============================================================================

describe("EDMMultiPassStrategyEngine", () => {
  const baseInput = {
    material: "D2",
    thickness_mm: 25,
    profile_length_mm: 200,
    tolerance_mm: 0.01,
    target_ra_um: 0.8,
    wire_diameter_mm: 0.25,
  };

  it("exports and is not null", () => {
    expect(edmMultiPassStrategyEngine).toBeTruthy();
    expect(typeof edmMultiPassStrategyEngine.plan_passes).toBe("function");
    expect(typeof edmMultiPassStrategyEngine.full_plan).toBe("function");
  });

  it("determines correct pass count for finish tolerance", () => {
    const r = edmMultiPassStrategyEngine.plan_passes(baseInput);
    expect(r).toBeTruthy();
    expect(r.total_passes).toBeGreaterThanOrEqual(3); // 0.01mm + Ra 0.8 requires 3+ passes
  });

  it("increases pass count for tighter tolerance", () => {
    const loose = edmMultiPassStrategyEngine.plan_passes({
      ...baseInput,
      tolerance_mm: 0.05,
      target_ra_um: 3.0,
    });
    const tight = edmMultiPassStrategyEngine.plan_passes({
      ...baseInput,
      tolerance_mm: 0.003,
      target_ra_um: 0.2,
    });
    expect(tight.total_passes).toBeGreaterThan(loose.total_passes);
  });

  it("produces full plan with time estimate and wire usage", () => {
    const r = edmMultiPassStrategyEngine.full_plan(baseInput);
    expect(r).toBeTruthy();
    expect(r.total_passes).toBeGreaterThanOrEqual(3);
    expect(r.total_time_min).toBeGreaterThan(0);
    expect(r.total_wire_m).toBeGreaterThan(0);
    expect(r.predicted_final_ra_um).toBeGreaterThan(0);
    expect(r.predicted_final_ra_um).toBeLessThanOrEqual(baseInput.target_ra_um * 5);
  });
});

// ============================================================================
// 7. EDMCuttingParamFlushEngine
// ============================================================================

describe("EDMCuttingParamFlushEngine", () => {
  const baseInput = {
    material: "D2",
    thickness_mm: 25,
    wire_diameter_mm: 0.25,
    wire_type: "brass",
    pass_number: 1,
    pass_type: "rough" as const,
  };

  it("exports and is not null", () => {
    expect(edmCuttingParamFlushEngine).toBeTruthy();
    expect(typeof edmCuttingParamFlushEngine.optimizeParams).toBe("function");
  });

  it("optimizes cutting parameters with valid pulse settings", () => {
    const r = edmCuttingParamFlushEngine.optimizeParams(baseInput);
    expect(r).toBeTruthy();
    expect(r.pulse).toBeDefined();
    expect(r.pulse.on_us).toBeGreaterThan(0);
    expect(r.pulse.off_us).toBeGreaterThan(0);
    expect(r.pulse.peak_current_A).toBeGreaterThan(0);
    expect(r.wire).toBeDefined();
    expect(r.wire.speed_m_min).toBeGreaterThan(0);
  });

  it("predicts wire break probability between 0 and 1", () => {
    const r = edmCuttingParamFlushEngine.predictWireBreakRisk(baseInput);
    expect(r).toBeTruthy();
    expect(r.probability).toBeGreaterThanOrEqual(0);
    expect(r.probability).toBeLessThanOrEqual(1);
  });

  it("reduces pulse energy for finish passes vs rough", () => {
    const rough = edmCuttingParamFlushEngine.optimizeParams(baseInput);
    const finish = edmCuttingParamFlushEngine.optimizeParams({
      ...baseInput,
      pass_number: 3,
      pass_type: "finish" as const,
    });
    expect(finish.energy.per_discharge_mj).toBeLessThan(rough.energy.per_discharge_mj);
  });
});

// ============================================================================
// 8. EDMWireSlugCornerTaperEngine
// ============================================================================

describe("EDMWireSlugCornerTaperEngine", () => {
  it("exports and is not null", () => {
    expect(edmWireSlugCornerTaperEngine).toBeTruthy();
    expect(typeof edmWireSlugCornerTaperEngine.solveTaper).toBe("function");
  });

  it("solves taper UV offsets for a given angle and thickness", () => {
    const r = edmWireSlugCornerTaperEngine.solveTaper({
      segments: [{
        start_point: { x: 0, y: 0 },
        end_point: { x: 50, y: 0 },
        taper_angle_deg: 5,
      }],
      workpiece_height_mm: 25,
      guide_distance_mm: 80,
      wire_diameter_mm: 0.25,
    });
    expect(r).toBeTruthy();
    expect(r.segments).toBeDefined();
    expect(r.segments.length).toBeGreaterThan(0);
    expect(r.max_uv_travel_required_mm).toBeGreaterThan(0);
    // UV offset = tan(5 deg) * 25/2 = ~1.09 mm (for X-axis segment, displacement is in V)
    expect(r.segments[0].v_offset_mm).toBeGreaterThan(0);
  });

  it("calculates corner compensation with positive dwell time", () => {
    const r = edmWireSlugCornerTaperEngine.calculateCornerCompensation({
      corners: [{ index: 0, angle_deg: 90, position: { x: 10, y: 10 } }],
      wire_diameter_mm: 0.25,
      wire_tension_N: 12,
      guide_distance_mm: 80,
      workpiece_height_mm: 25,
    });
    expect(r).toBeTruthy();
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].wire_lag_mm).toBeGreaterThan(0);
    expect(r[0].dwell_time_sec).toBeGreaterThan(0);
  });

  it("manages slug for internal profiles", () => {
    const r = edmWireSlugCornerTaperEngine.planSlugManagement({
      profiles: [{ name: "cavity", area_mm2: 500 }],
      workpiece_thickness_mm: 25,
      material_density_kg_m3: 7800,
    });
    expect(r).toBeTruthy();
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].weight_kg).toBeGreaterThan(0);
    expect(r[0].management).toBeDefined();
  });
});

// ============================================================================
// 9. EDMMonitorSurfaceIntegrityEngine
// ============================================================================

describe("EDMMonitorSurfaceIntegrityEngine", () => {
  it("exports and is not null", () => {
    expect(edmMonitorSurfaceIntegrityEngine).toBeTruthy();
    expect(typeof edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity).toBe("function");
  });

  it("assesses surface integrity with recast depth > 0", () => {
    const r = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
      material: "D2",
      hardness_hrc: 60,
      pulse_on_us: 6,
      pulse_energy_mj: 50,
      num_skim_passes: 0,
      flushing_mode: "submerged",
      application: "tooling",
    });
    expect(r).toBeTruthy();
    expect(r.recast).toBeDefined();
    expect(r.recast.depth_um).toBeGreaterThan(0);
    expect(r.haz).toBeDefined();
    expect(r.haz.depth_um).toBeGreaterThan(r.recast.depth_um);
  });

  it("reduces recast depth with skim passes", () => {
    const noSkim = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
      material: "D2",
      pulse_on_us: 6,
      pulse_energy_mj: 50,
      num_skim_passes: 0,
      flushing_mode: "submerged",
      application: "general",
    });
    const withSkim = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
      material: "D2",
      pulse_on_us: 6,
      pulse_energy_mj: 50,
      num_skim_passes: 4,
      flushing_mode: "submerged",
      application: "general",
    });
    expect(withSkim.recast.after_skims_um).toBeLessThan(noSkim.recast.depth_um);
  });

  it("monitors process and detects arcing condition", () => {
    const r = edmMonitorSurfaceIntegrityEngine.monitorProcess({
      gap_stats: { normal_pct: 30, open_pct: 10, short_pct: 60 },
      discharge_pattern: "arcing",
      wire_break_risk: 0.6,
    });
    expect(r).toBeTruthy();
    expect(r.alerts).toBeDefined();
    expect(r.alerts.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 10. EDMPostProcessGCodeEngine
// ============================================================================

describe("EDMPostProcessGCodeEngine", () => {
  it("exports and is not null", () => {
    expect(edmPostProcessGCodeEngine).toBeTruthy();
    expect(typeof edmPostProcessGCodeEngine.plan_post_process).toBe("function");
    expect(typeof edmPostProcessGCodeEngine.generate_gcode).toBe("function");
  });

  it("plans post-process sequence for aerospace application", () => {
    const r = edmPostProcessGCodeEngine.plan_post_process({
      material: "Inconel_718",
      hardness_hrc: 40,
      surface_finish_Ra_um: 0.8,
      recast_layer_max_um: 5,
      has_tight_tolerances: true,
      tolerance_mm: 0.005,
      requires_fatigue_life: true,
      requires_coating: false,
      application: "aerospace",
    });
    expect(r).toBeTruthy();
    expect(r.sequence).toBeDefined();
    expect(r.sequence.length).toBeGreaterThan(0);
    // Aerospace parts need stress relief and recast removal
    const stepNames = r.sequence.map(s => s.process);
    expect(stepNames.some(n => n.toLowerCase().includes("stress") || n.toLowerCase().includes("recast"))).toBe(true);
  });

  it("generates Fanuc wire EDM G-code", () => {
    const r = edmPostProcessGCodeEngine.generate_gcode({
      controller: "fanuc",
      profiles: [{
        name: "profile_1",
        contour_points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 30 }],
        start_hole: { x: -5, y: -5 },
        approach: { type: "line", length_mm: 5 },
        departure: { type: "line", length_mm: 5 },
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.14,
        technology_table: "E001",
        wire_speed_m_min: 8,
        tension_N: 12,
      }],
      wire_type: "brass",
    });
    expect(r).toBeTruthy();
    expect(r.gcode).toBeDefined();
    expect(r.gcode.length).toBeGreaterThan(0);
  });

  it("lists supported controllers", () => {
    const controllers = edmPostProcessGCodeEngine.list_controllers();
    expect(controllers.length).toBeGreaterThan(0);
    expect(controllers.some(c => c.controller === "fanuc")).toBe(true);
    expect(controllers.some(c => c.controller === "sodick")).toBe(true);
  });
});

// ============================================================================
// 11. EDMCostDocumentationEngine
// ============================================================================

describe("EDMCostDocumentationEngine", () => {
  it("exports and is not null", () => {
    expect(edmCostDocumentationEngine).toBeTruthy();
    expect(typeof edmCostDocumentationEngine.estimateCost).toBe("function");
  });

  it("estimates cost with positive total", () => {
    const r = edmCostDocumentationEngine.estimateCost({
      part_id: "TEST-001",
      material: "D2",
      machine_time: {
        machine_rate_per_hr: 85,
        setup_hrs: 2,
        cutting_hrs: 4,
      },
      wire: {
        wire_type: "brass",
        diameter_mm: 0.25,
        cutting_hrs: 4,
        wire_speed_mm_per_min: 200,
      },
      consumables: {
        cutting_hrs: 4,
      },
    });
    expect(r).toBeTruthy();
    expect(r.total_per_part).toBeGreaterThan(0);
    expect(r.machine_time.cost).toBeGreaterThan(0);
    expect(r.wire.cost).toBeGreaterThan(0);
  });

  it("generates a setup sheet with checklist", () => {
    const r = edmCostDocumentationEngine.generateSetupSheet({
      program: "PROG-001",
      machine: "AgieCharmilles CUT 300",
      material: "D2 Tool Steel",
      material_hardness: "60 HRC",
      dimensions: "100 x 80 x 25 mm",
      weight_kg: 1.56,
      wire_type: "brass",
      wire_diameter_mm: 0.25,
    });
    expect(r).toBeTruthy();
    expect(r.checklist).toBeDefined();
    expect(r.checklist.length).toBeGreaterThan(0);
  });

  it("calculates machine time cost breakdown", () => {
    const r = edmCostDocumentationEngine.calcMachineTime({
      machine_rate_per_hr: 85,
      setup_hrs: 2,
      cutting_hrs: 6,
    });
    expect(r).toBeTruthy();
    expect(r.total_hrs).toBeGreaterThanOrEqual(8);
    expect(r.cost).toBeGreaterThan(0);
    expect(r.breakdown).toBeDefined();
    expect(r.breakdown.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 12. EDMQualityOrchestratorEngine
// ============================================================================

describe("EDMQualityOrchestratorEngine", () => {
  it("exports and is not null", () => {
    expect(edmQualityOrchestratorEngine).toBeTruthy();
    expect(typeof edmQualityOrchestratorEngine.verify_quality).toBe("function");
    expect(typeof edmQualityOrchestratorEngine.run_pipeline).toBe("function");
  });

  it("verifies quality with dimensional and surface finish checks", () => {
    const r = edmQualityOrchestratorEngine.verify_quality({
      features: [{
        name: "slot_width",
        nominal_mm: 10.0,
        tolerance_mm: 0.01,
        measured_values: [10.003, 10.005, 9.997, 10.002],
        surface_finish_ra_um: 0.8,
        measured_ra_um: 0.75,
      }],
      application: "tooling",
    });
    expect(r).toBeTruthy();
    expect(r.dimensional).toBeDefined();
    expect(r.dimensional.features_checked).toBe(1);
    expect(r.surface_finish).toBeDefined();
    expect(r.recast_compliance).toBeDefined();
  });

  it("runs the full pipeline and returns stage results", () => {
    const r = edmQualityOrchestratorEngine.run_pipeline({
      material: "D2",
      thickness_mm: 25,
      features: [{ type: "profile", tolerance_mm: 0.01 }],
    });
    expect(r).toBeTruthy();
    expect(r.stage_results).toBeDefined();
    expect(r.stage_results.length).toBeGreaterThan(0);
    // Pipeline should have time estimates
    expect(r.total_pipeline_time_ms).toBeGreaterThanOrEqual(0);
    expect(r.gcode).toBeUndefined();
    expect((r.documentation as any)?.executable_program_generated).toBe(false);
  });

  it("records a job and retrieves recommendation", () => {
    const job = edmQualityOrchestratorEngine.record_job({
      job_id: "TEST-JOB-001",
      material: "D2",
      thickness_mm: 25,
      machine: "AgieCharmilles CUT 300",
      wire_type: "brass",
      predicted: { time_min: 120, ra_um: 0.8, cost: 500 },
      actual: { time_min: 135, ra_um: 0.75, cost: 520, wire_breaks: 0 },
    });
    expect(job).toBeTruthy();
    expect(job.accuracy).toBeDefined();

    const rec = edmQualityOrchestratorEngine.get_recommendation({
      material: "D2",
      thickness_mm: 25,
    });
    expect(rec).toBeTruthy();
    expect(rec.similar_jobs).toBeDefined();
  });

  it("maps tech-table flushing from the real flushing plan", () => {
    const mapping = edmCuttingParamFlushEngine.mapTechTable({
      material: "D2",
      thickness_mm: 25,
      wire_diameter_mm: 0.25,
      wire_type: "brass",
      pass_number: 1,
      pass_type: "rough",
      machine_controller: "Fanuc Robocut",
    });

    expect(mapping).toBeTruthy();
    const keys = Object.keys(mapping!.parameter_set);
    const flushValue = mapping!.parameter_set[keys[7]];
    expect(typeof flushValue).toBe("number");
    expect(Number(flushValue)).toBeGreaterThan(0);
    expect(mapping!.notes.some(note => note.includes("Flush parameter derived"))).toBe(true);
  });

  it("does not fabricate dimensional accuracy without inspection data", () => {
    edmQualityOrchestratorEngine.record_job({
      job_id: "TEST-JOB-NULL-DIM-001",
      date: "2026-03-26T12:00:00Z",
      material: "D2",
      thickness_mm: 25,
      machine: "AgieCharmilles CUT 300",
      wire_type: "brass",
      predicted: { time_min: 120, ra_um: 0.8, cost: 500 },
      actual: { time_min: 130, ra_um: 0.75, cost: 510, wire_breaks: 0 },
    });

    const report = edmQualityOrchestratorEngine.improvement_report(50);
    const latest = report.metric_history[report.metric_history.length - 1];
    expect(latest.dimensional_accuracy).toBeNull();
    expect(report.drift_analysis.some(d => d.metric === "Dimensional Accuracy")).toBe(false);
  });
});

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe("WEDM Pipeline Action Schemas", () => {
  it("exports 47 action schemas", () => {
    expect(WEDM_PIPELINE_ACTIONS.length).toBe(48);
    expect(Object.keys(WEDM_PIPELINE_ACTION_SCHEMAS).length).toBe(48);
  });

  it("all schema keys match WEDM_PIPELINE_ACTIONS", () => {
    const schemaKeys = Object.keys(WEDM_PIPELINE_ACTION_SCHEMAS).sort();
    const actionKeys = [...WEDM_PIPELINE_ACTIONS].sort();
    expect(schemaKeys).toEqual(actionKeys);
  });

  it("every schema is a valid Zod type", () => {
    for (const [key, schema] of Object.entries(WEDM_PIPELINE_ACTION_SCHEMAS)) {
      expect(schema).toBeDefined();
      expect(typeof schema.parse).toBe("function");
      expect(typeof schema.safeParse).toBe("function");
    }
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("WEDM Pipeline Integration", () => {
  it("chains drawing interpretation -> feasibility -> material -> multi-pass -> G-code", () => {
    // Stage 1: Drawing interpretation
    const drawing = edmDrawingInterpretationEngine.interpret({
      features: [{
        name: "die_cavity",
        type: "profile" as const,
        is_through: true,
        dimensions_mm: { length: 40, width: 20, depth: 25 },
        tolerance_mm: 0.01,
        surface_finish_ra_um: 0.8,
        min_corner_radius_mm: 0.2,
        profile_length_mm: 120,
      }],
      material: "D2",
      material_hardness_hrc: 60,
      overall_thickness_mm: 25,
      tolerance_mm: 0.01,
      target_ra_um: 0.8,
    });
    expect(drawing.features_classified.length).toBeGreaterThan(0);
    expect(drawing.pass_requirements.total_passes).toBeGreaterThan(0);

    // Stage 2: Feasibility check
    const feasibility = edmFeasibilityEngine.assess({
      material: "D2",
      material_resistivity_uohm_cm: 55,
      features: [{
        name: "die_cavity",
        is_through: true,
        profile_length_mm: 120,
        min_corner_radius_mm: 0.2,
        tolerance_mm: 0.01,
        surface_finish_ra_um: 0.8,
      }],
      workpiece: { thickness_mm: 25, length_mm: 80, width_mm: 60, height_mm: 25 },
    });
    expect(feasibility.overall_feasible).toBe(true);

    // Stage 3: Material assessment
    const material = edmMaterialMachineWireEngine.assessMaterial({
      material: "D2",
      hardness_hrc: 60,
    });
    expect(material.machinability_class).toBeDefined();

    // Stage 4: Multi-pass plan (informed by drawing pass requirements)
    const multiPass = edmMultiPassStrategyEngine.full_plan({
      material: "D2",
      thickness_mm: 25,
      profile_length_mm: 120,
      tolerance_mm: 0.01,
      target_ra_um: 0.8,
      wire_diameter_mm: 0.25,
    });
    expect(multiPass.total_passes).toBeGreaterThanOrEqual(3);
    expect(multiPass.total_time_min).toBeGreaterThan(0);

    // Stage 5: G-code generation
    const gcode = edmPostProcessGCodeEngine.generate_gcode({
      controller: "fanuc",
      profiles: [{
        name: "die_cavity",
        contour_points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 20 }],
        start_hole: { x: -5, y: -5 },
        approach: { type: "line", length_mm: 5 },
        departure: { type: "line", length_mm: 5 },
      }],
      passes: multiPass.passes.map((p, i) => ({
        pass_number: i + 1,
        offset_mm: p.offset_mm,
        technology_table: `E00${i + 1}`,
        wire_speed_m_min: 8,
        tension_N: 12,
      })),
      wire_type: "brass",
    });
    expect(gcode.gcode).toBeDefined();
    expect(gcode.gcode.length).toBeGreaterThan(0);
  });

  it("chains feasibility -> cutting params -> surface integrity -> quality verification", () => {
    // Stage 1: Feasibility
    const feasibility = edmFeasibilityEngine.assess({
      material: "Ti-6Al-4V",
      features: [{
        name: "titanium_profile",
        is_through: true,
        profile_length_mm: 80,
        tolerance_mm: 0.015,
        surface_finish_ra_um: 1.2,
      }],
      workpiece: { thickness_mm: 15, length_mm: 60, width_mm: 40, height_mm: 15 },
    });
    expect(feasibility.overall_feasible).toBe(true);

    // Stage 2: Cutting parameters
    const cuttingParams = edmCuttingParamFlushEngine.optimizeParams({
      material: "Ti-6Al-4V",
      thickness_mm: 15,
      wire_diameter_mm: 0.25,
      wire_type: "brass",
      pass_number: 1,
      pass_type: "rough",
    });
    expect(cuttingParams.pulse.on_us).toBeGreaterThan(0);

    // Stage 3: Surface integrity assessment using cutting params
    const surface = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
      material: "Ti-6Al-4V",
      pulse_on_us: cuttingParams.pulse.on_us,
      pulse_energy_mj: cuttingParams.energy.per_discharge_mj,
      num_skim_passes: 3,
      flushing_mode: "submerged",
      application: "aerospace",
    });
    expect(surface.recast.depth_um).toBeGreaterThan(0);
    expect(surface.recast.after_skims_um).toBeLessThan(surface.recast.depth_um);

    // Stage 4: Quality verification
    const quality = edmQualityOrchestratorEngine.verify_quality({
      features: [{
        name: "titanium_profile",
        nominal_mm: 25.0,
        tolerance_mm: 0.015,
        measured_values: [25.005, 24.998, 25.003],
        surface_finish_ra_um: 1.2,
        measured_ra_um: 1.1,
      }],
      application: "aerospace",
    }, {
      num_skim_passes: 3,
      final_energy_mj: cuttingParams.energy.per_discharge_mj * 0.1,
      flushing: "submerged",
    });
    expect(quality.dimensional).toBeDefined();
    expect(quality.dimensional.features_checked).toBe(1);
    expect(quality.surface_finish).toBeDefined();
  });
});
