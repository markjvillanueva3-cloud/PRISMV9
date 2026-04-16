/**
 * POST-ULT Action Schemas
 * ========================
 * Per-action Zod schemas for all 17 POST-ULT engines.
 *
 * Engines:
 *   CpsPostParserEngine, PostPropertyTaxonomyEngine, MachinePostCrossRefEngine,
 *   MachineOptionRegistryEngine, ControllerFeatureMatrixEngine, OptimizationTierEngine,
 *   RapidRepositionOptEngine, PostPhysicsFoundationEngine, LineByLineAdaptiveEngine,
 *   MotionControllerInjectionEngine, PostVerificationSafetyEngine,
 *   PostOutputGenerationEngine, AdvancedPostPhysicsEngine, CrossCAMPostEngine,
 *   PostValidationSuiteEngine, PostLibraryConfiguratorEngine, FleetDeploymentLearningEngine
 *
 * @module schemas/postUltActionSchemas
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
const optArr  = (item: z.ZodTypeAny) => z.array(item).optional();

const controllerEnum = z
  .enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"])
  .optional();

const materialIso = z
  .enum(["P", "M", "K", "N", "S", "H"])
  .optional();

const tier = z
  .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
  .optional();

// ============================================================================
// 1. CpsPostParserEngine
// ============================================================================

const cps_parse = z.object({
  cps_source:       z.string(),                 // raw CPS text or file path
  controller:       controllerEnum,
  extract_headers:  optBool,
  extract_variables: optBool,
  extract_blocks:   optBool,
  strict:           optBool,
}).passthrough();

const cps_parse_batch = z.object({
  sources:    z.array(z.string()).min(1),        // array of CPS sources / paths
  controller: controllerEnum,
  parallel:   optBool,
  on_error:   z.enum(["skip", "abort", "warn"]).optional(),
}).passthrough();

const cps_summary = z.object({
  parse_result_id: optStr,                       // ref to prior parse result
  cps_source:      optStr,                       // OR pass raw source again
  include_stats:   optBool,
  format:          z.enum(["text", "json", "markdown"]).optional(),
}).passthrough();

// ============================================================================
// 2. PostPropertyTaxonomyEngine
// ============================================================================

const post_build_taxonomy = z.object({
  post_ids:   z.array(z.string()).optional(),    // scope to specific posts
  controller: controllerEnum,
  depth:      z.number().int().min(1).max(10).optional(),
  rebuild:    optBool,
}).passthrough();

const post_classify_property = z.object({
  property_name:  z.string(),
  property_value: z.unknown().optional(),
  controller:     controllerEnum,
  context:        optStr,
}).passthrough();

const post_list_purchase_options = z.object({
  controller:    controllerEnum,
  category:      optStr,
  include_price: optBool,
  currency:      optStr,
}).passthrough();

// ============================================================================
// 3. MachinePostCrossRefEngine
// ============================================================================

const post_match_machines = z.object({
  post_id:          optStr,
  controller:       controllerEnum,
  machine_type:     z.enum(["mill", "lathe", "mill-turn", "5axis", "swiss", "edm", "additive"]).optional(),
  axis_count:       z.number().int().min(2).max(9).optional(),
  required_options: optArr(z.string()),
}).passthrough();

const post_coverage_gaps = z.object({
  post_id:      z.string(),
  machine_ids:  optArr(z.string()),
  controller:   controllerEnum,
  severity:     z.enum(["critical", "major", "minor", "all"]).optional(),
}).passthrough();

const post_coverage_matrix = z.object({
  post_ids:    z.array(z.string()).optional(),
  machine_ids: optArr(z.string()),
  controller:  controllerEnum,
  format:      z.enum(["table", "json", "csv"]).optional(),
}).passthrough();

// ============================================================================
// 4. MachineOptionRegistryEngine
// ============================================================================

const post_get_options = z.object({
  machine_id:   optStr,
  controller:   controllerEnum,
  category:     optStr,
  include_meta: optBool,
}).passthrough();

const post_set_options = z.object({
  machine_id: z.string(),
  options:    z.record(z.string(), z.unknown()),
  validate:   optBool,
  dry_run:    optBool,
}).passthrough();

const post_validate_options = z.object({
  machine_id: z.string(),
  options:    z.record(z.string(), z.unknown()),
  strict:     optBool,
}).passthrough();

const post_get_presets = z.object({
  machine_id:  optStr,
  controller:  controllerEnum,
  preset_name: optStr,
  list_all:    optBool,
}).passthrough();

// ============================================================================
// 5. ControllerFeatureMatrixEngine
// ============================================================================

const post_get_controller = z.object({
  controller:       z.enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"]),
  feature_category: optStr,
  version:          optStr,
  include_opcodes:  optBool,
}).passthrough();

const post_compare_controllers = z.object({
  controllers: z.array(
    z.enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"])
  ).min(2),
  feature_filter: optArr(z.string()),
  format:         z.enum(["table", "json", "diff"]).optional(),
}).passthrough();

// ============================================================================
// 6. OptimizationTierEngine
// ============================================================================

const post_set_tier = z.object({
  post_id:    z.string(),
  tier:       z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  reason:     optStr,
  expires_at: optStr,
}).passthrough();

const post_detect_intent = z.object({
  post_id:     optStr,
  gcode_input: optStr,
  controller:  controllerEnum,
  context:     optStr,
}).passthrough();

const post_generate_diff = z.object({
  post_id_a:    z.string(),
  post_id_b:    z.string(),
  diff_format:  z.enum(["unified", "side-by-side", "json"]).optional(),
  context_lines: z.number().int().min(0).optional(),
}).passthrough();

const post_apply_approval = z.object({
  post_id:     z.string(),
  approved_by: optStr,
  comment:     optStr,
  tier_lock:   optBool,
}).passthrough();

// ============================================================================
// 7. RapidRepositionOptEngine
// ============================================================================

const post_optimize_rapids = z.object({
  gcode:            optStr,
  post_id:          optStr,
  controller:       controllerEnum,
  clearance_plane:  optNum,
  max_rapid_pct:    optNum,
  avoid_collisions: optBool,
}).passthrough();

const post_calculate_budget = z.object({
  gcode:          optStr,
  post_id:        optStr,
  machine_id:     optStr,
  target_cycle_s: optNum,
  rapid_rate_ipm: optNum,
}).passthrough();

const post_full_rapid_optimize = z.object({
  gcode:           optStr,
  post_id:         optStr,
  controller:      controllerEnum,
  machine_id:      optStr,
  clearance_plane: optNum,
  iterations:      z.number().int().min(1).max(100).optional(),
  profile:         z.enum(["aggressive", "balanced", "conservative"]).optional(),
}).passthrough();

// ============================================================================
// 8. PostPhysicsFoundationEngine
// ============================================================================

const post_physics_foundation = z.object({
  post_id:       optStr,
  material_iso:  materialIso,
  material_name: optStr,
  spindle_rpm:   optNum,
  feed_ipm:      optNum,
  doc_in:        optNum,                         // depth of cut inches
  woc_in:        optNum,                         // width of cut inches
  tool_diameter: optNum,
  tool_material: z.enum(["carbide", "hss", "ceramic", "cbn", "diamond"]).optional(),
  coolant:       z.enum(["flood", "mist", "through", "air", "none"]).optional(),
}).passthrough();

// ============================================================================
// 9. LineByLineAdaptiveEngine
// ============================================================================

const post_line_by_line = z.object({
  gcode:        z.string(),
  controller:   controllerEnum,
  material_iso: materialIso,
  adaptive:     optBool,
  output_delta: optBool,                         // emit only changed lines
}).passthrough();

const post_chip_thinning = z.object({
  gcode:        optStr,
  post_id:      optStr,
  tool_diameter: optNum,
  radial_depth:  optNum,
  nominal_feed:  optNum,
  apply_inline:  optBool,
}).passthrough();

// ============================================================================
// 10. MotionControllerInjectionEngine
// ============================================================================

const post_inject_motion = z.object({
  gcode:          z.string(),
  controller:     controllerEnum,
  motion_mode:    z.enum(["G1", "G2", "G3", "G61", "G64"]).optional(),
  corner_rounding: optNum,
  look_ahead:     optNum,
}).passthrough();

const post_inject_hsm = z.object({
  gcode:        z.string(),
  controller:   controllerEnum,
  hsm_mode:     z.enum(["AICC", "AIAPC", "HSM", "DynReg", "auto"]).optional(),
  tolerance:    optNum,
  max_feedrate: optNum,
}).passthrough();

const post_inject_coolant = z.object({
  gcode:       z.string(),
  controller:  controllerEnum,
  coolant:     z.enum(["flood", "mist", "through", "air", "none"]).optional(),
  on_code:     optStr,
  off_code:    optStr,
  tool_change: optBool,                          // inject at every tool change
}).passthrough();

// ============================================================================
// 11. PostVerificationSafetyEngine
// ============================================================================

const post_verify_safety = z.object({
  gcode:          z.string(),
  controller:     controllerEnum,
  machine_limits: z.object({
    x_min: optNum, x_max: optNum,
    y_min: optNum, y_max: optNum,
    z_min: optNum, z_max: optNum,
    rpm_max: optNum,
    feed_max: optNum,
  }).passthrough().optional(),
  strict:         optBool,
}).passthrough();

const post_monte_carlo = z.object({
  gcode:          optStr,
  post_id:        optStr,
  iterations:     z.number().int().min(10).max(100000).optional(),
  noise_pct:      optNum,                        // parameter noise ±%
  seed:           z.number().int().optional(),
}).passthrough();

const post_surface_finish = z.object({
  gcode:         optStr,
  post_id:       optStr,
  tool_diameter: optNum,
  stepover:      optNum,
  material_iso:  materialIso,
  predict_ra:    optBool,
  predict_rz:    optBool,
}).passthrough();

// ============================================================================
// 12. PostOutputGenerationEngine
// ============================================================================

const post_generate_output = z.object({
  post_id:      z.string(),
  toolpath_id:  optStr,
  controller:   controllerEnum,
  output_path:  optStr,
  format:       z.enum(["nc", "eia", "iso", "txt", "custom"]).optional(),
  line_numbers: optBool,
  block_delete: optBool,
}).passthrough();

const post_setup_sheet = z.object({
  post_id:      optStr,
  toolpath_id:  optStr,
  format:       z.enum(["pdf", "html", "xlsx", "txt"]).optional(),
  template:     optStr,
  include_tools: optBool,
  include_offsets: optBool,
  include_notes: optBool,
}).passthrough();

const post_prove_out = z.object({
  post_id:      z.string(),
  gcode:        optStr,
  simulate:     optBool,
  dry_run_feed: optNum,                          // feed override % for prove-out
  machine_id:   optStr,
  log_output:   optBool,
}).passthrough();

// ============================================================================
// 13. AdvancedPostPhysicsEngine
// ============================================================================

const post_advanced_physics = z.object({
  post_id:       optStr,
  material_iso:  materialIso,
  material_name: optStr,
  model:         z.enum(["FEM", "analytical", "hybrid"]).optional(),
  spindle_rpm:   optNum,
  feed_ipm:      optNum,
  doc_in:        optNum,
  tool_diameter: optNum,
  coolant:       z.enum(["flood", "mist", "through", "air", "none"]).optional(),
}).passthrough();

const post_johnson_cook = z.object({
  material_name: z.string(),
  material_iso:  materialIso,
  // J-C constants (optional — system has defaults per material)
  A:  optNum,                                    // yield strength MPa
  B:  optNum,                                    // hardening coefficient
  C:  optNum,                                    // strain-rate sensitivity
  n:  optNum,                                    // hardening exponent
  m:  optNum,                                    // thermal softening
  T_ref: optNum,                                 // reference temp K
  T_melt: optNum,                                // melt temp K
  strain_rate: optNum,
  temperature: optNum,
}).passthrough();

const post_coupled_analysis = z.object({
  post_id:       optStr,
  material_iso:  materialIso,
  material_name: optStr,
  analyses:      optArr(z.enum(["thermal", "stress", "vibration", "wear", "chip"])),
  spindle_rpm:   optNum,
  feed_ipm:      optNum,
  doc_in:        optNum,
  export_report: optBool,
}).passthrough();

// ============================================================================
// 14. CrossCAMPostEngine
// ============================================================================

const post_normalize_cam = z.object({
  source_cam:  z.enum(["hypermill", "mastercam", "fusion", "catia", "nx", "edgecam", "powermill", "esprit"]),
  target_cam:  z.enum(["hypermill", "mastercam", "fusion", "catia", "nx", "edgecam", "powermill", "esprit"]).optional(),
  post_id:     optStr,
  gcode:       optStr,
  controller:  controllerEnum,
}).passthrough();

const post_detect_subprograms = z.object({
  gcode:         z.string(),
  controller:    controllerEnum,
  inline:        optBool,                        // inline subprograms on detection
  max_depth:     z.number().int().min(1).max(20).optional(),
}).passthrough();

const post_multichannel = z.object({
  post_id:       optStr,
  channel_ids:   z.array(z.string()).optional(),
  sync_mode:     z.enum(["sequential", "parallel", "synchronized"]).optional(),
  controller:    controllerEnum,
  output_merged: optBool,
}).passthrough();

// ============================================================================
// 15. PostValidationSuiteEngine
// ============================================================================

const post_validate_full = z.object({
  post_id:    z.string(),
  gcode:      optStr,
  controller: controllerEnum,
  rules:      optArr(z.string()),
  fail_fast:  optBool,
  report:     z.enum(["summary", "full", "json"]).optional(),
}).passthrough();

const post_ab_compare = z.object({
  post_id_a:   z.string(),
  post_id_b:   z.string(),
  gcode_a:     optStr,
  gcode_b:     optStr,
  metrics:     optArr(z.enum(["cycle_time", "rapid_dist", "line_count", "modal_state", "feed_hist"])),
  format:      z.enum(["table", "json", "diff"]).optional(),
}).passthrough();

const post_regression_matrix = z.object({
  post_id:        z.string(),
  test_suite_ids: optArr(z.string()),
  baseline_id:    optStr,
  fail_threshold: optNum,                        // % regression allowed before fail
  report:         z.enum(["summary", "full", "json"]).optional(),
}).passthrough();

// ============================================================================
// 16. PostLibraryConfiguratorEngine
// ============================================================================

const post_browse_library = z.object({
  query:       optStr,
  controller:  controllerEnum,
  machine_type: z.enum(["mill", "lathe", "mill-turn", "5axis", "swiss", "edm", "additive"]).optional(),
  page:        z.number().int().min(1).optional(),
  page_size:   z.number().int().min(1).max(200).optional(),
}).passthrough();

const post_configure = z.object({
  post_id:     z.string(),
  settings:    z.record(z.string(), z.unknown()),
  validate:    optBool,
  save:        optBool,
}).passthrough();

const post_export = z.object({
  post_id:     z.string(),
  format:      z.enum(["cps", "json", "zip", "tar.gz"]).optional(),
  output_path: optStr,
  include_doc: optBool,
  version_tag: optStr,
}).passthrough();

// ============================================================================
// 17. FleetDeploymentLearningEngine
// ============================================================================

const post_fleet_status = z.object({
  machine_ids:  optArr(z.string()),
  post_id:      optStr,
  include_kpis: optBool,
  since:        optStr,                          // ISO date
  until:        optStr,
}).passthrough();

const post_update_plan = z.object({
  post_id:      z.string(),
  machine_ids:  optArr(z.string()),
  rollout_strategy: z.enum(["immediate", "staged", "canary", "manual"]).optional(),
  scheduled_at: optStr,
  notes:        optStr,
}).passthrough();

const post_ingest_feedback = z.object({
  post_id:     z.string(),
  machine_id:  optStr,
  feedback:    z.record(z.string(), z.unknown()),
  session_id:  optStr,
  source:      z.enum(["operator", "sensor", "qc", "auto"]).optional(),
  timestamp:   optStr,
}).passthrough();

const post_get_prediction = z.object({
  post_id:    z.string(),
  machine_id: optStr,
  metric:     z.enum(["cycle_time", "tool_life", "surface_finish", "failure_risk", "oee"]).optional(),
  horizon_h:  optNum,                            // forecast horizon in hours
  confidence: optBool,
}).passthrough();

// ============================================================================
// REGISTRY
// ============================================================================

export const POST_ULT_ACTION_SCHEMAS: Record<string, z.ZodType> = {
  // CpsPostParserEngine
  cps_parse,
  cps_parse_batch,
  cps_summary,

  // PostPropertyTaxonomyEngine
  post_build_taxonomy,
  post_classify_property,
  post_list_purchase_options,

  // MachinePostCrossRefEngine
  post_match_machines,
  post_coverage_gaps,
  post_coverage_matrix,

  // MachineOptionRegistryEngine
  post_get_options,
  post_set_options,
  post_validate_options,
  post_get_presets,

  // ControllerFeatureMatrixEngine
  post_get_controller,
  post_compare_controllers,

  // OptimizationTierEngine
  post_set_tier,
  post_detect_intent,
  post_generate_diff,
  post_apply_approval,

  // RapidRepositionOptEngine
  post_optimize_rapids,
  post_calculate_budget,
  post_full_rapid_optimize,

  // PostPhysicsFoundationEngine
  post_physics_foundation,

  // LineByLineAdaptiveEngine
  post_line_by_line,
  post_chip_thinning,

  // MotionControllerInjectionEngine
  post_inject_motion,
  post_inject_hsm,
  post_inject_coolant,

  // PostVerificationSafetyEngine
  post_verify_safety,
  post_monte_carlo,
  post_surface_finish,

  // PostOutputGenerationEngine
  post_generate_output,
  post_setup_sheet,
  post_prove_out,

  // AdvancedPostPhysicsEngine
  post_advanced_physics,
  post_johnson_cook,
  post_coupled_analysis,

  // CrossCAMPostEngine
  post_normalize_cam,
  post_detect_subprograms,
  post_multichannel,

  // PostValidationSuiteEngine
  post_validate_full,
  post_ab_compare,
  post_regression_matrix,

  // PostLibraryConfiguratorEngine
  post_browse_library,
  post_configure,
  post_export,

  // FleetDeploymentLearningEngine
  post_fleet_status,
  post_update_plan,
  post_ingest_feedback,
  post_get_prediction,
};

export const POST_ULT_ACTIONS: string[] = Object.keys(POST_ULT_ACTION_SCHEMAS);
