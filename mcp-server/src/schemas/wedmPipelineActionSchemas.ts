/**
 * WEDM Pipeline Action Schemas
 * =============================
 * Per-action Zod schemas for all 12 WEDM-P2P pipeline engines.
 *
 * Engines:
 *   EDMDrawingInterpretationEngine, EDMFeasibilityEngine,
 *   EDMMaterialMachineWireEngine, EDMStartHoleSetupEngine,
 *   EDMToolpathStrategyEngine, EDMMultiPassStrategyEngine,
 *   EDMCuttingParamFlushEngine, EDMWireSlugCornerTaperEngine,
 *   EDMMonitorSurfaceIntegrityEngine, EDMPostProcessGCodeEngine,
 *   EDMCostDocumentationEngine, EDMQualityOrchestratorEngine
 *
 * @module schemas/wedmPipelineActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

const optStr  = z.string().optional();
const optNum  = z.number().optional();
const optBool = z.boolean().optional();
const posNum  = z.number().positive();
const optPosNum = z.number().positive().optional();
const optArr  = (item: z.ZodTypeAny) => z.array(item).optional();

const featureTypeEnum = z.enum(["profile", "hole", "slot", "cavity", "contour", "pocket"]).optional();
const applicationEnum = z.enum(["aerospace", "medical", "automotive", "tooling", "general"]).optional();
const wireTypeEnum = z.enum(["brass", "zinc_coated", "diffusion_annealed", "coated_brass", "molybdenum", "tungsten", "steel_core"]).optional();
const controllerEnum = z.enum(["fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles", "accutex"]).optional();
const passTypeEnum = z.enum(["rough", "semi_finish", "finish", "super_finish"]).optional();
const profileTypeEnum = z.enum(["closed_external", "closed_internal", "open", "island"]).optional();

const partFeature = z.object({
  name: z.string(),
  type: featureTypeEnum,
  is_through: z.boolean().optional(),
  dimensions_mm: z.object({
    length: optPosNum,
    width: optPosNum,
    depth: optPosNum,
    diameter: optPosNum,
  }).passthrough().optional(),
  tolerance_mm: optPosNum,
  surface_finish_ra_um: optPosNum,
  min_corner_radius_mm: optPosNum,
  taper_angle_deg: optNum,
  profile_length_mm: optPosNum,
}).passthrough();

const feasibilityFeature = z.object({
  name: z.string(),
  is_through: z.boolean(),
  profile_length_mm: posNum,
  min_corner_radius_mm: optPosNum,
  min_slot_width_mm: optPosNum,
  taper_angle_deg: optNum,
  tolerance_mm: optPosNum,
  surface_finish_ra_um: optPosNum,
}).passthrough();

const workpieceDims = z.object({
  thickness_mm: posNum,
  length_mm: posNum,
  width_mm: posNum,
  height_mm: posNum,
}).passthrough();

const profileGeometry = z.object({
  id: z.string(),
  min_x_mm: z.number(),
  min_y_mm: z.number(),
  max_x_mm: z.number(),
  max_y_mm: z.number(),
  is_interior: z.boolean(),
  approach_x_mm: z.number(),
  approach_y_mm: z.number(),
  min_wall_thickness_mm: optPosNum,
}).passthrough();

const profileDef = z.object({
  name: z.string(),
  type: profileTypeEnum,
  contour_points: z.array(z.object({ x: z.number(), y: z.number() })),
  profile_length_mm: posNum,
  min_corner_radius_mm: optPosNum,
  taper_angle_deg: optNum,
  tolerance_mm: optPosNum,
  start_hole_id: optStr,
  is_critical_surface: z.boolean().optional(),
}).passthrough();

const tankSpec = z.object({
  length_mm: posNum,
  width_mm: posNum,
  depth_mm: posNum,
}).passthrough();

const startHole = z.object({
  id: z.string(),
  x_mm: z.number(),
  y_mm: z.number(),
  diameter_mm: posNum,
}).passthrough();

// ============================================================================
// 1. EDMDrawingInterpretationEngine
// ============================================================================

const wedm_interpret_drawing = z.object({
  features: z.array(partFeature).min(1),
  material: optStr,
  material_hardness_hrc: z.number().min(0).max(72).optional(),
  carbon_content_percent: optNum,
  overall_thickness_mm: optPosNum,
  tolerance_mm: optPosNum,
  target_ra_um: optPosNum,
  is_through_feature: optBool,
  min_corner_radius_mm: optPosNum,
  max_taper_deg: optNum,
}).passthrough();

const wedm_classify_features = z.object({
  features: z.array(partFeature).min(1),
  material: optStr,
  material_hardness_hrc: z.number().min(0).max(72).optional(),
}).passthrough();

const wedm_calculate_passes = z.object({
  features: z.array(partFeature).optional(),
  tolerance_mm: optPosNum,
  target_ra_um: optPosNum,
  material: optStr,
}).passthrough();

// ============================================================================
// 2. EDMFeasibilityEngine
// ============================================================================

const wedm_assess_feasibility = z.object({
  material: z.string().min(1),
  material_resistivity_uohm_cm: optPosNum,
  features: z.array(feasibilityFeature).min(1),
  workpiece: workpieceDims,
  machine: z.object({
    x_travel_mm: posNum,
    y_travel_mm: posNum,
    z_travel_mm: posNum,
    uv_travel_mm: optPosNum,
    tank_length_mm: optPosNum,
    tank_width_mm: optPosNum,
    tank_depth_mm: optPosNum,
  }).passthrough().optional(),
  wire_diameter_mm: optPosNum,
  delivery_hours: optPosNum,
}).passthrough();

const wedm_check_conductivity = z.object({
  material: z.string().min(1),
  material_resistivity_uohm_cm: optPosNum,
  features: z.array(feasibilityFeature).min(1),
  workpiece: workpieceDims,
}).passthrough();

const wedm_estimate_time = z.object({
  material: z.string().min(1),
  features: z.array(feasibilityFeature).min(1),
  workpiece: workpieceDims,
  wire_diameter_mm: optPosNum,
}).passthrough();

// ============================================================================
// 3. EDMMaterialMachineWireEngine
// ============================================================================

const wedm_assess_material = z.object({
  material: z.string().min(1),
  hardness_hrc: z.number().min(0).max(72).optional(),
  heat_treat_state: z.enum(["annealed", "pre-hardened", "hardened", "stress_relieved", "normalized", "unknown"]).optional(),
  carbon_content_pct: optNum,
}).passthrough();

const wedm_select_machine = z.object({
  part_x_mm: posNum,
  part_y_mm: posNum,
  part_z_mm: posNum,
  part_weight_kg: optPosNum,
  max_taper_deg: optNum,
  requires_submerged: optBool,
  requires_auto_thread: optBool,
  wire_diameter_mm: optPosNum,
}).passthrough();

const wedm_select_wire = z.object({
  material: z.string().min(1),
  thickness_mm: posNum,
  tolerance_mm: optPosNum,
  target_surface_finish_Ra_um: optPosNum,
  min_corner_radius_mm: posNum,
  max_taper_deg: optNum,
  priority: z.enum(["speed", "finish", "accuracy", "cost"]).optional(),
}).passthrough();

const wedm_full_selection = z.object({
  material: z.string().min(1),
  hardness_hrc: z.number().min(0).max(72).optional(),
  heat_treat_state: z.enum(["annealed", "pre-hardened", "hardened", "stress_relieved", "normalized", "unknown"]).optional(),
  part_x_mm: posNum,
  part_y_mm: posNum,
  part_z_mm: posNum,
  part_weight_kg: optPosNum,
  thickness_mm: posNum,
  tolerance_mm: optPosNum,
  target_ra_um: optPosNum,
  min_corner_radius_mm: optPosNum,
  max_taper_deg: optNum,
  requires_submerged: optBool,
}).passthrough();

// ============================================================================
// 4. EDMStartHoleSetupEngine
// ============================================================================

const wedm_plan_start_holes = z.object({
  profiles: z.array(profileGeometry).min(1),
  workpiece: z.object({
    material: z.string().optional(),
    material_category: z.string().optional(),
    hardness_hrc: z.number().min(0).max(72).optional(),
    thickness_mm: posNum,
    length_mm: posNum,
    width_mm: posNum,
    weight_kg: posNum,
    is_hardened: z.boolean(),
  }).passthrough(),
  wire_diameter_mm: optPosNum,
}).passthrough();

const wedm_plan_setup = z.object({
  profiles: z.array(profileGeometry).min(1),
  workpiece: z.object({
    material: z.string().optional(),
    material_category: z.string().optional(),
    hardness_hrc: z.number().min(0).max(72).optional(),
    thickness_mm: posNum,
    length_mm: posNum,
    width_mm: posNum,
    weight_kg: posNum,
    is_hardened: z.boolean(),
  }).passthrough(),
  holes: z.array(startHole).optional(),
  tank: tankSpec.optional(),
  wire_diameter_mm: optPosNum,
}).passthrough();

// ============================================================================
// 5. EDMToolpathStrategyEngine
// ============================================================================

const wedm_generate_toolpath = z.object({
  profiles: z.array(profileDef).min(1),
  workpiece_thickness_mm: posNum,
  wire_diameter_mm: posNum,
  spark_gap_mm: optPosNum,
}).passthrough();

const wedm_plan_tabs = z.object({
  profiles: z.array(profileDef).min(1),
  workpiece_thickness_mm: posNum,
  wire_diameter_mm: posNum,
  spark_gap_mm: optPosNum,
}).passthrough();

const wedm_optimize_sequence = z.object({
  profiles: z.array(profileDef).min(1),
  workpiece_thickness_mm: posNum,
  wire_diameter_mm: posNum,
  spark_gap_mm: optPosNum,
}).passthrough();

// ============================================================================
// 6. EDMMultiPassStrategyEngine
// ============================================================================

const wedm_plan_passes = z.object({
  material: z.string().min(1),
  material_iso: optStr,
  thickness_mm: posNum,
  profile_length_mm: posNum,
  tolerance_mm: posNum,
  target_ra_um: posNum,
  wire_diameter_mm: optPosNum,
  wire_type: wireTypeEnum,
  is_hardened: optBool,
  hardness_hrc: z.number().min(0).max(72).optional(),
  distortion_risk: optBool,
}).passthrough();

const wedm_full_multipass = z.object({
  material: z.string().min(1),
  material_iso: optStr,
  thickness_mm: posNum,
  profile_length_mm: posNum,
  tolerance_mm: posNum,
  target_ra_um: posNum,
  wire_diameter_mm: optPosNum,
  wire_type: wireTypeEnum,
  is_hardened: optBool,
  hardness_hrc: z.number().min(0).max(72).optional(),
  distortion_risk: optBool,
}).passthrough();

// ============================================================================
// 7. EDMCuttingParamFlushEngine
// ============================================================================

const wedm_optimize_params = z.object({
  material: z.string().min(1),
  thickness_mm: posNum,
  wire_diameter_mm: posNum,
  wire_type: z.string().min(1),
  pass_number: z.number().int().min(1),
  pass_type: passTypeEnum,
  target_ra_um: optPosNum,
  target_mrr_mm2_min: optPosNum,
  machine_controller: controllerEnum,
  max_wire_break_risk: z.number().min(0).max(1).optional(),
}).passthrough();

const wedm_plan_flushing = z.object({
  material: z.string().min(1),
  thickness_mm: posNum,
  profile_type: z.enum(["open", "closed", "mixed"]).optional(),
  pass_type: passTypeEnum,
  has_narrow_slots: optBool,
  min_slot_width_mm: optPosNum,
  taper_angle_deg: optNum,
}).passthrough();

const wedm_predict_wire_break = z.object({
  material: z.string().min(1),
  thickness_mm: posNum,
  wire_diameter_mm: posNum,
  wire_type: z.string().min(1),
  pass_number: z.number().int().min(1),
  pass_type: passTypeEnum,
  target_ra_um: optPosNum,
  max_wire_break_risk: z.number().min(0).max(1).optional(),
}).passthrough();

// ============================================================================
// 8. EDMWireSlugCornerTaperEngine
// ============================================================================

const wedm_plan_wire_management = z.object({
  profiles: z.array(z.object({
    name: z.string(),
    area_mm2: posNum,
    perimeter_mm: posNum,
    start_hole: z.object({
      id: z.string(),
      x_mm: z.number(),
      y_mm: z.number(),
      diameter_mm: posNum,
    }).passthrough().optional(),
    tabs: z.array(z.object({
      position_mm: z.number(),
      width_mm: posNum,
    }).passthrough()).optional(),
    corners: z.array(z.object({
      angle_deg: z.number(),
      radius_mm: optPosNum,
    }).passthrough()).optional(),
  }).passthrough()).min(1),
  wire_type: wireTypeEnum,
  wire_diameter_mm: optPosNum,
  machine_has_auto_thread: optBool,
}).passthrough();

const wedm_calculate_corners = z.object({
  corners: z.array(z.object({
    angle_deg: z.number(),
    approach_speed_mm_min: posNum,
    tolerance_mm: optPosNum,
  }).passthrough()).min(1),
  wire_diameter_mm: posNum,
  wire_tension_N: posNum,
  guide_distance_mm: optPosNum,
  workpiece_height_mm: posNum,
}).passthrough();

const wedm_solve_taper = z.object({
  segments: z.array(z.object({
    taper_angle_deg: z.number().min(0).max(45),
    profile_length_mm: optPosNum,
    is_variable_taper: optBool,
  }).passthrough()).min(1),
  workpiece_height_mm: posNum,
  guide_distance_mm: optPosNum,
  wire_diameter_mm: posNum,
}).passthrough();

// ============================================================================
// 9. EDMMonitorSurfaceIntegrityEngine
// ============================================================================

const wedm_monitor_process = z.object({
  gap_stats: z.object({
    normal_pct: z.number(),
    open_pct: z.number(),
    short_pct: z.number(),
  }).optional(),
  actual_speed_mm_min: optPosNum,
  predicted_speed_mm_min: optPosNum,
  discharge_pattern: z.enum(["normal", "arcing", "secondary", "wire_erosion"]).optional(),
  wire_break_risk: z.number().min(0).max(1).optional(),
  ambient_temp_C: optNum,
  dielectric_temp_C: optNum,
  cutting_duration_hours: optPosNum,
}).passthrough();

const wedm_assess_surface_integrity = z.object({
  material: z.string().min(1),
  hardness_hrc: z.number().min(0).max(72).optional(),
  pulse_on_us: posNum,
  pulse_energy_mj: optPosNum,
  num_skim_passes: z.number().int().min(0).max(20),
  flushing_mode: z.enum(["submerged", "spray", "combined"]).optional(),
  application: applicationEnum,
  is_fatigue_critical: optBool,
}).passthrough();

const wedm_check_spec = z.object({
  material: z.string().min(1),
  hardness_hrc: z.number().min(0).max(72).optional(),
  pulse_on_us: posNum,
  num_skim_passes: z.number().int().min(0).max(20),
  application: applicationEnum,
  spec_standard: optStr,
  recast_limit_um: optPosNum,
  ra_limit_um: optPosNum,
}).passthrough();

// ============================================================================
// 10. EDMPostProcessGCodeEngine
// ============================================================================

const wedm_plan_post_process = z.object({
  material: z.string().min(1),
  hardness_hrc: z.number().min(0).max(72).optional(),
  surface_finish_Ra_um: posNum,
  recast_layer_max_um: optPosNum,
  has_tight_tolerances: z.boolean(),
  tolerance_mm: optPosNum,
  requires_fatigue_life: z.boolean(),
  requires_coating: z.boolean(),
  coating_type: z.enum(["pvd", "cvd", "nitriding", "chrome", "passivation"]).optional(),
  application: applicationEnum,
}).passthrough();

const wedm_generate_gcode = z.object({
  controller: z.enum(["fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles"]),
  profiles: z.array(z.object({
    name: z.string(),
    gcode_lines: z.array(z.string()).optional(),
    profile_length_mm: optPosNum,
  }).passthrough()).optional(),
  passes: z.array(z.object({
    pass_number: z.number().int().min(1),
    pass_type: passTypeEnum,
    offset_mm: optPosNum,
    tech_table_id: optStr,
  }).passthrough()).optional(),
  material: optStr,
  thickness_mm: optPosNum,
  wire_diameter_mm: optPosNum,
  start_holes: z.array(startHole).optional(),
  use_auto_threading: optBool,
  submerged: optBool,
}).passthrough();

// ============================================================================
// 11. EDMCostDocumentationEngine
// ============================================================================

const wedm_estimate_cost = z.object({
  machine_rate_per_hr: posNum,
  setup_hrs: posNum,
  cutting_hrs: posNum,
  tab_cutting_hrs: optPosNum,
  threading_time_per_event_hr: optPosNum,
  threading_events: z.number().int().min(0).optional(),
  idle_hrs: optPosNum,
  wire_type: wireTypeEnum,
  wire_length_m: optPosNum,
  wire_diameter_mm: optPosNum,
  num_profiles: z.number().int().min(1).optional(),
  material: optStr,
  quantity: z.number().int().min(1).optional(),
}).passthrough();

const wedm_generate_setup_sheet = z.object({
  job_id: optStr,
  part_number: optStr,
  material: z.string().min(1),
  thickness_mm: posNum,
  machine: optStr,
  wire_type: wireTypeEnum,
  wire_diameter_mm: optPosNum,
  num_profiles: z.number().int().min(1).optional(),
  num_start_holes: z.number().int().min(0).optional(),
  tolerance_mm: optPosNum,
  target_ra_um: optPosNum,
  total_passes: z.number().int().min(1).optional(),
}).passthrough();

const wedm_full_documentation = z.object({
  job_id: optStr,
  part_number: optStr,
  material: z.string().min(1),
  thickness_mm: posNum,
  machine: optStr,
  wire_type: wireTypeEnum,
  wire_diameter_mm: optPosNum,
  num_profiles: z.number().int().min(1).optional(),
  tolerance_mm: optPosNum,
  target_ra_um: optPosNum,
  machine_rate_per_hr: optPosNum,
  setup_hrs: optPosNum,
  cutting_hrs: optPosNum,
  application: applicationEnum,
}).passthrough();

// ============================================================================
// 12. EDMQualityOrchestratorEngine
// ============================================================================

const wedm_verify_quality = z.object({
  features: z.array(z.object({
    name: z.string(),
    nominal_mm: z.number(),
    tolerance_mm: posNum,
    measured_values: z.array(z.number()).optional(),
    surface_finish_ra_um: optPosNum,
    measured_ra_um: optPosNum,
  }).passthrough()).min(1),
  profile_measurements: z.array(z.object({
    z_height_mm: z.number(),
    deviations: z.array(z.object({
      feature: z.string(),
      deviation_mm: z.number(),
    })),
  })).optional(),
  recast_measurement_um: optPosNum,
  hardness_measurements: z.array(z.object({
    depth_um: z.number(),
    hardness_hv: z.number(),
  })).optional(),
  application: applicationEnum,
  pass_params: z.object({
    num_skim_passes: z.number().int().min(0),
    final_energy_mj: posNum,
    flushing: z.string(),
  }).optional(),
}).passthrough();

const wedm_run_pipeline = z.object({
  material: z.string().min(1),
  thickness_mm: posNum,
  features: z.array(z.object({
    type: z.string(),
    tolerance_mm: posNum,
  }).passthrough()).min(1),
  machine: optStr,
  wire_type: wireTypeEnum,
  application: applicationEnum,
  budget_usd: optPosNum,
}).passthrough();

const wedm_record_job = z.object({
  job_id: z.string(),
  material: z.string().min(1),
  thickness_mm: posNum,
  machine: z.string(),
  wire_type: z.string(),
  predicted: z.object({
    time_min: z.number(),
    ra_um: z.number(),
    cost: z.number(),
  }),
  actual: z.object({
    time_min: optNum,
    ra_um: optNum,
    cost: optNum,
    wire_breaks: z.number().int().min(0).optional(),
  }),
}).passthrough();

const wedm_get_recommendation = z.object({
  material: z.string().min(1),
  thickness_mm: posNum,
  tolerance_mm: optPosNum,
  target_ra_um: optPosNum,
  top_n: z.number().int().min(1).max(20).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const WEDM_PIPELINE_ACTION_SCHEMAS: ActionSchemaMap = {
  // EDMDrawingInterpretationEngine
  wedm_interpret_drawing,
  wedm_classify_features,
  wedm_calculate_passes,

  // EDMFeasibilityEngine
  wedm_assess_feasibility,
  wedm_check_conductivity,
  wedm_estimate_time,

  // EDMMaterialMachineWireEngine
  wedm_assess_material,
  wedm_select_machine,
  wedm_select_wire,
  wedm_full_selection,

  // EDMStartHoleSetupEngine
  wedm_plan_start_holes,
  wedm_plan_setup,

  // EDMToolpathStrategyEngine
  wedm_generate_toolpath,
  wedm_plan_tabs,
  wedm_optimize_sequence,

  // EDMMultiPassStrategyEngine
  wedm_plan_passes,
  wedm_full_multipass,

  // EDMCuttingParamFlushEngine
  wedm_optimize_params,
  wedm_plan_flushing,
  wedm_predict_wire_break,

  // EDMWireSlugCornerTaperEngine
  wedm_plan_wire_management,
  wedm_calculate_corners,
  wedm_solve_taper,

  // EDMMonitorSurfaceIntegrityEngine
  wedm_monitor_process,
  wedm_assess_surface_integrity,
  wedm_check_spec,

  // EDMPostProcessGCodeEngine
  wedm_plan_post_process,
  wedm_generate_gcode,

  // EDMCostDocumentationEngine
  wedm_estimate_cost,
  wedm_generate_setup_sheet,
  wedm_full_documentation,

  // EDMQualityOrchestratorEngine
  wedm_verify_quality,
  wedm_run_pipeline,
  wedm_record_job,
  wedm_get_recommendation,
};

export const WEDM_PIPELINE_ACTIONS: string[] = Object.keys(WEDM_PIPELINE_ACTION_SCHEMAS);
