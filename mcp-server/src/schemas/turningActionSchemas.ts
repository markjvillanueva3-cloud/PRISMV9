/**
 * Turning Dispatcher Action Schemas
 * ==================================
 * Per-action Zod schemas for all 7 prism_turning actions.
 * SAFETY CRITICAL — chuck/tailstock forces affect workpiece ejection risk.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/turningActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";
// MACRO-DOMAIN-MS0/U-MACRO-LIB: re-use the 4 macro_* schemas owned by cadActionSchemas (same engine, same params).
// Keeps validation rules identical across prism_cad and prism_turning — no behavioural drift between dispatchers.
import {
  macroLibraryListSchema,
  macroMatchFamilySchema,
  macroPlaceTemplateSchema,
  macroFanoutDryRunSchema,
} from "./cadActionSchemas.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

// ============================================================================
// MS-PRINT-PROGRAM-LOOP/U-PPL-A1 — TurningMinFingerprintEngine
// (defined early — TURNING_ACTION_SCHEMAS export references these by name)
// ============================================================================

const _programFingerprintLite = z
  .object({
    tool_count: z.number().int().nonnegative(),
    operation_count: z.number().int().nonnegative(),
    line_count: z.number().int().nonnegative(),
    feature_vector: z.array(z.number()).length(16),
  })
  .passthrough();

const turning_min_fingerprint = z
  .object({
    text: z.string().optional(),
    base64: z.string().optional(),
    filename: z.string().optional(),
  })
  .refine(
    (p) => p.text !== undefined || p.base64 !== undefined,
    { message: "must supply 'text' or 'base64'" },
  )
  .passthrough();

const turning_min_classify = z
  .object({
    fingerprint: _programFingerprintLite,
    anchors: z
      .array(
        z.object({
          name: z.string().min(1),
          family: z.string().min(1),
          fingerprint: _programFingerprintLite,
        }),
      )
      .min(0),
    threshold: z.number().positive().max(2).optional(),
  })
  .passthrough();

// MS-PRINT-PROGRAM-LOOP/U-PPL-B1 — ProgramReoptimizationOrchestratorEngine
const lathe_program_reoptimize = z
  .object({
    gcode: z.string().min(1),
    process: z.enum(["auto", "lathe", "mill"]).optional(),
    controller: z
      .enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"])
      .optional(),
    strictness: z.enum(["standard", "strict", "aerospace"]).optional(),
    filename: z.string().optional(),
    runPhysicsPass: z.boolean().optional(),
  })
  .passthrough();

// ============================================================================
// chuck_force — ChuckJawForceEngine
// ============================================================================

const chuck_force = z.object({
  chuck_type: z.enum(["3_jaw_scroll", "3_jaw_power", "4_jaw_independent", "6_jaw", "collet"]).optional(),
  jaw_type: z.enum(["hard", "soft", "pie", "special"]).optional(),
  num_jaws: z.number().int().min(2).max(8).optional(),
  workpiece_mass_kg: posNum,
  workpiece_od_mm: posNum,
  workpiece_length_mm: posNum,
  gripping_diameter_mm: posNum,
  gripping_length_mm: posNum,
  spindle_rpm: posNum,
  max_spindle_rpm: posNum,
  cutting_force_tangential_N: posNum,
  cutting_force_radial_N: z.number().nonnegative(),
  cutting_force_axial_N: z.number().nonnegative(),
  friction_coefficient: z.number().min(0.05).max(1.0).optional(),
  jaw_stroke_mm: optPosNum,
}).passthrough();

// ============================================================================
// tailstock — TailstockForceEngine
// ============================================================================

const tailstock = z.object({
  center_type: z.enum(["live", "dead", "half_center", "pipe_center"]).optional(),
  center_point_angle_deg: z.number().min(30).max(120).optional(),
  workpiece_mass_kg: posNum,
  workpiece_length_mm: posNum,
  workpiece_diameter_mm: posNum,
  chuck_to_tailstock_mm: posNum,
  spindle_rpm: posNum,
  cutting_force_axial_N: z.number().nonnegative(),
  cutting_force_radial_N: z.number().nonnegative(),
  cutting_position_from_chuck_mm: posNum,
  center_hole_diameter_mm: posNum,
  material_thermal_expansion: optNum,
}).passthrough();

// ============================================================================
// steady_rest — SteadyRestPlacementEngine
// ============================================================================

const steady_rest = z.object({
  workpiece_length_mm: posNum,
  workpiece_diameter_mm: posNum,
  workpiece_mass_kg: posNum,
  material_E_GPa: posNum,
  chuck_to_tailstock_mm: posNum,
  cutting_force_radial_N: z.number().nonnegative(),
  cutting_position_mm: posNum,
  spindle_rpm: posNum,
  length_to_diameter_ratio: posNum,
  max_deflection_um: posNum,
  steady_rest_type: z.enum(["fixed", "traveling", "follow", "hydraulic"]).optional(),
}).passthrough();

// ============================================================================
// live_tool — LiveToolingEngine
// ============================================================================

const live_tool = z.object({
  operation: z.enum(["cross_drill", "axial_drill", "cross_mill", "axial_mill", "polygon_turn", "keyway", "flat_mill"]).optional(),
  tool_diameter_mm: posNum,
  num_flutes: z.number().int().min(1).max(20).optional(),
  live_tool_rpm: posNum,
  workpiece_diameter_mm: posNum,
  depth_of_cut_mm: posNum,
  width_of_cut_mm: optPosNum,
  feed_per_tooth_mm: posNum,
  c_axis_interpolation: z.boolean().optional(),
  y_axis_available: z.boolean().optional(),
  max_live_tool_rpm: posNum,
  live_tool_power_kW: posNum,
}).passthrough();

// ============================================================================
// bar_pull — BarPullerTimingEngine
// ============================================================================

const bar_pull = z.object({
  bar_diameter_mm: posNum,
  bar_length_mm: posNum,
  part_length_mm: posNum,
  cutoff_width_mm: posNum,
  facing_allowance_mm: z.number().nonnegative().optional(),
  bar_feeder_type: z.enum(["magazine", "hydrodynamic", "servo", "short_bar"]).optional(),
  collet_open_time_sec: optPosNum,
  collet_close_time_sec: optPosNum,
  bar_pull_speed_mm_per_sec: optPosNum,
  bar_pull_retract_speed_mm_per_sec: optPosNum,
  sub_spindle_available: z.boolean().optional(),
  remnant_min_mm: optPosNum,
}).passthrough();

// ============================================================================
// thread_single_point — SinglePointThreadEngine
// ============================================================================

const thread_single_point = z.object({
  thread_form: z.enum(["UN", "metric", "ACME", "trapezoidal", "buttress"]).optional(),
  pitch_mm: posNum,
  major_diameter_mm: posNum,
  internal: z.boolean().optional(),
  infeed_method: z.enum(["radial", "flank", "modified_flank", "alternating_flank", "constant_area"]).optional(),
  total_depth_mm: posNum,
  spindle_rpm: posNum,
  num_passes: z.number().int().min(1).max(50).optional(),
  spring_passes: z.number().int().min(0).max(5).optional(),
  lead_in_mm: optPosNum,
  lead_out_mm: optPosNum,
  thread_length_mm: posNum,
  material_tensile_MPa: posNum,
}).passthrough();

// ============================================================================
// part_off_force — PartOffForceEngine
// ============================================================================

const part_off_force = z.object({
  bar_diameter_mm: posNum,
  bore_diameter_mm: z.number().nonnegative().optional(),
  blade_width_mm: z.number().min(0.5).max(12),
  feed_per_rev_mm: z.number().min(0.01).max(0.5),
  cutting_speed_m_min: posNum,
  material: z.string().min(1).optional(),
  material_hardness_HRC: z.number().min(0).max(72).optional(),
}).passthrough();

// ============================================================================
// hard_turn_decide / hard_turn_optimize — WIRE-MS0/U-WIRE06
// HardTurningDecisionEngine + HardTurningCapstoneEngine
// Wires LATHE-PRO-MS5 orphans through prism_turning so CBN-vs-grind
// decisions + the capstone (decision + grind-replacement + white-layer +
// residual-stress) reach the MCP action surface.
// ============================================================================

const hardTurnFeature = z.enum(["od", "bore", "face", "thread", "groove"])
  .describe("Feature type being finish-machined on the hardened part");

const hard_turn_decide = z.object({
  hardness_hrc: posNum.describe("Part hardness in HRC (>0); decide() rejects ≤0"),
  target_ra_um: posNum.describe("Target surface finish Ra in micrometers (>0)"),
  target_tolerance_mm: posNum.describe("Target tolerance in mm — tightest on the finish feature (>0)"),
  feature: hardTurnFeature,
  lot_size: posNum.describe("Lot size in parts (>0)"),
  diameter_mm: posNum.describe("Part diameter in mm — affects rigidity"),
  length_over_diameter: optPosNum.describe("L/D ratio if turning; >4 raises chatter risk"),
  shop_has_grinder: z.boolean().optional()
    .describe("True if shop has grinding capability for fallback"),
  cbn_cost_per_edge_usd: optPosNum.describe("Cost per CBN edge in USD (default 15)"),
  grind_cost_per_part_usd: optPosNum.describe("Amortized grind-wheel cost per part in USD (default 0.5)"),
  setup_hours: optPosNum.describe("Programming + setup hours, both options (default 0.5)"),
}).passthrough();

const hard_turn_optimize = z.object({
  hardness_hrc: posNum.describe("Part hardness in HRC (>0)"),
  target_ra_um: posNum.describe("Target surface finish Ra (μm, >0)"),
  target_tolerance_mm: posNum.describe("Target tolerance (mm, >0)"),
  feature: hardTurnFeature,
  lot_size: posNum.describe("Lot size in parts (>0)"),
  diameter_mm: posNum.describe("Part diameter (mm)"),
  length_over_diameter: optPosNum,
  shop_has_grinder: z.boolean().optional(),
  cbn_cost_per_edge_usd: optPosNum,
  grind_cost_per_part_usd: optPosNum,
  setup_hours: optPosNum,
  grinding_baseline: z.object({
    achieved_ra_um: posNum.describe("Currently achieved Ra in μm"),
    achieved_tolerance_mm: posNum.describe("Currently achieved tolerance (mm)"),
    stock_removal_mm: posNum.describe("Stock removed by grind (mm)"),
    grind_cycle_sec: posNum.describe("Grind cycle time (sec)"),
    grind_cost_per_part_usd: z.number().nonnegative()
      .describe("Grind cost per part (USD)"),
  }).passthrough().optional(),
  residual_stress_requirement: z.enum(["tensile_required", "compressive_ok", "any"]).optional()
    .describe("Required residual-stress state for the finished feature"),
  concentricity_mm: optPosNum,
  turret_precision_mm: optPosNum,
  wall_thickness_mm: optPosNum,
  cutting_speed_mmin: optPosNum.describe("Cutting speed in m/min — defaults to per-tool-material Vc"),
  feed_per_rev_mm: optPosNum.describe("Feed per revolution in mm (default 0.08)"),
  depth_of_cut_mm: optPosNum.describe("Axial depth of cut in mm (default 0.15)"),
  tool_wear_VB_mm: optPosNum.describe("Flank wear VB in mm (default 0.1)"),
  coolant: z.enum(["flood", "mist", "air", "dry", "cryo"]).optional()
    .describe("Coolant strategy (default flood)"),
  forced_tool_material: z.enum(["CBN", "ceramic", "carbide"]).optional()
    .describe("Override the decision's tool material"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

// ─── ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH2: 6 unwired AI/intelligence/knowledge engines ─

/** lathe_anomaly_detect_program — LatheAnomalyDetectionEngine.detectProgramAnomalies */
const lathe_anomaly_detect_program = z.object({
  program_id: z.string().min(1).describe("Program identifier."),
  program_name: z.string().optional(),
  blocks: z.array(
    z.object({
      line_number: z.number().int().nonnegative(),
      raw_text: z.string(),
      g_codes: z.array(z.string()),
      m_codes: z.array(z.string()),
      x: z.number().optional(),
      z: z.number().optional(),
      f: z.number().optional(),
      s: z.number().optional(),
      t: z.number().optional(),
      comment: z.string().optional(),
    }).passthrough(),
  ).min(1).describe("G-code blocks to scan."),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough().describe("Detect anomalies in a parsed lathe G-code program.");

/** lathe_causal_build_model — LatheCausalInferenceEngine.buildCausalModel */
const lathe_causal_build_model = z.object({
  domain: z.enum([
    "lathe_turning", "lathe_boring", "lathe_threading", "lathe_grooving", "general",
  ]).describe("Lathe operation domain for the causal model."),
  customVariables: z.array(z.record(z.string(), z.any())).optional(),
  customEdges: z.array(z.record(z.string(), z.any())).optional(),
}).passthrough().describe("Build a structural causal model for a lathe domain.");

/** lathe_ensemble_stats — LatheEnsembleLearningEngine.getStats (no input) */
const lathe_ensemble_stats = z.object({}).passthrough()
  .describe("Read ensemble learning stats (no input).");

/** lathe_changeover_stats — LatheChangeoverBriefEngine.getStats (no input) */
const lathe_changeover_stats = z.object({}).passthrough()
  .describe("Read changeover-brief generator stats (no input).");

/** lathe_jmdie_extract_customer — LatheJMDieKnowledgeEngine.extractCustomerPatterns */
const lathe_jmdie_extract_customer = z.object({
  customer: z.string().min(1).describe("JM Die customer name (e.g. 'ALCOA')."),
}).passthrough().describe("Extract customer-specific machining patterns from JM Die archive.");

/** lathe_metallurgy_tool_steel_db — LatheMetallurgyEngine.getToolSteelDatabase (no input) */
const lathe_metallurgy_tool_steel_db = z.object({}).passthrough()
  .describe("Read tool-steel metallurgical database (no input).");

// ─── ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH3: 6 unwired knowledge/predictive/troubleshoot engines ─

const lathe_knowledge_harvest_programs = z.object({}).passthrough()
  .describe("Harvest unified knowledge from JM Die programs (no input).");

const lathe_program_analyze = z.object({
  content: z.string().min(1).describe("Lathe G-code program text."),
  file_path: z.string().optional(),
}).passthrough().describe("Analyze a lathe program for optimization opportunities.");

const lathe_expert_material_strategy = z.object({
  category: z.enum([
    "mild_steel", "alloy_steel", "stainless_steel", "hardened_steel",
    "cast_iron", "aluminum", "titanium", "nickel_alloy", "brass", "bronze",
    "copper", "plastic", "exotic",
  ]).describe("Material category."),
}).passthrough().describe("Expert material-machining strategy by category.");

const lathe_machine_get_profile = z.object({
  machine_type: z.enum([
    "2_axis_cnc", "live_tooling", "swiss_type", "vtl",
    "multi_spindle", "sub_spindle", "y_axis", "b_axis", "twin_turret",
  ]).describe("Lathe machine class."),
}).passthrough().describe("Read capability profile for a lathe machine class.");

const lathe_troubleshoot_overhang = z.object({
  tool_setup: z.object({
    tool_type: z.enum(["turning", "boring_bar", "grooving", "threading", "drill", "parting"]),
    shank_diameter_mm: z.number().positive(),
    overhang_mm: z.number().positive(),
    holder_type: z.enum(["standard", "reduced_shank", "damped", "carbide_shank"]),
    insert_size_mm: z.number().positive().optional(),
    tool_material: z.enum(["carbide", "hss", "ceramic", "cbn"]),
    is_internal: z.boolean(),
  }).passthrough(),
  cutting_params: z.object({
    cutting_speed_m_min: z.number().positive(),
    feed_mm_rev: z.number().positive(),
    depth_of_cut_mm: z.number().positive(),
    operation: z.enum(["roughing", "finishing", "threading", "grooving", "parting", "boring"]),
    coolant: z.enum(["flood", "mist", "dry", "high_pressure"]),
  }).passthrough(),
}).passthrough().describe("Tool overhang L/D analysis for chatter/breakage risk.");

const lathe_predictive_tool_wear = z.object({
  conditions: z.object({
    cutting_speed_m_min: z.number().positive(),
    feed_mm_rev: z.number().positive(),
    depth_of_cut_mm: z.number().positive(),
    material: z.string().min(1),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    hardness_hrc: z.number().nonnegative().optional(),
    tool_material: z.enum(["carbide", "ceramic", "cbn", "diamond", "hss"]),
    tool_coating: z.string().optional(),
    nose_radius_mm: z.number().positive(),
    coolant: z.enum(["flood", "mist", "dry", "high_pressure", "cryogenic"]),
  }).passthrough(),
  tool_state: z.object({
    tool_id: z.string().min(1),
    edge_number: z.number().int().nonnegative(),
    time_in_cut_min: z.number().nonnegative(),
    volume_removed_cm3: z.number().nonnegative(),
    current_vb_mm: z.number().nonnegative().optional(),
    current_kt_mm: z.number().nonnegative().optional(),
    insert_grade: z.string().min(1),
    coating: z.string().optional(),
    operations_count: z.number().int().nonnegative(),
  }).passthrough(),
  cycle_time_per_part_sec: z.number().positive(),
}).passthrough().describe("Predict tool wear progression using Taylor + condition factors.");

// ─── ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH4: 6 unwired tribal/science/reasoning engines ─

const lathe_tribal_stats = z.object({}).passthrough()
  .describe("Read tribal-injector stats (no input).");

const lathe_unified_science_version = z.object({}).passthrough()
  .describe("Read unified-science engine version (no input).");

const lathe_unified_science_recommend = z.object({
  material: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    hardness_hrc: z.number().nonnegative().optional(),
    hardness_hb: z.number().nonnegative().optional(),
    tensile_strength_mpa: z.number().positive().optional(),
    thermal_conductivity_w_mk: z.number().positive(),
    specific_heat_j_kg_k: z.number().positive(),
    density_kg_m3: z.number().positive(),
    melting_point_c: z.number().positive(),
    work_hardening_exponent: z.number().optional(),
    thermal_expansion_coeff: z.number().optional(),
  }).passthrough(),
  target: z.object({
    tool_life_min: z.number().positive().optional(),
    max_ra_um: z.number().positive().optional(),
    max_deflection_mm: z.number().positive().optional(),
  }).passthrough(),
}).passthrough().describe("Recommend cutting parameters for a target outcome.");

const lathe_kinematics_get_machine_specs = z.object({
  machine_id: z.string().min(1).describe("Machine ID (e.g. 'OKUMA_LB3000').") ,
}).passthrough().describe("Look up machine specs from kinematics database.");

const lathe_neural_intel_stats = z.object({}).passthrough()
  .describe("Read neural-intelligence engine statistics (no input).");

const lathe_jmdie_extract_operations = z.object({}).passthrough()
  .describe("Extract operation sequences from JM Die archive (no input).");

// ─── ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH5: 6 unwired LoRA-cadence/post-uncertainty/deep-reasoning engines ─

const lathe_lora_cadence_state = z.object({}).passthrough()
  .describe("Read LoRA cadence engine state (no input).");

const lathe_lora_cadence_should_trigger = z.object({}).passthrough()
  .describe("Check whether a LoRA training run should trigger now (no input).");

const lathe_lora_cadence_active_version = z.object({}).passthrough()
  .describe("Read current active LoRA model version (no input).");

const lathe_deep_reasoning_record_outcome = z.object({
  plan_id: z.string().min(1).describe("Process plan id the outcome is recorded against."),
  outcome: z.object({
    success: z.boolean(),
    actual_cycle_time_sec: z.number().nonnegative().optional(),
    quality_results: z.array(z.object({
      feature_id: z.string().min(1),
      actual_dimension_mm: z.number(),
      actual_ra: z.number().nonnegative().optional(),
    })).optional(),
    issues_encountered: z.array(z.string()).optional(),
    operator_notes: z.string().optional(),
  }).passthrough(),
}).passthrough().describe("Record actual outcome for a deep-reasoning process plan.");

const lathe_post_uncertainty_analyze_block = z.object({
  block: z.string().min(1).describe("Single G-code block text."),
  line_number: z.number().int().nonnegative().describe("Line number within program."),
}).passthrough().describe("Analyze single block for post-generator uncertainty.");

const lathe_post_uncertainty_prod_ready = z.object({
  gcode: z.array(z.string()).min(1).describe("G-code program lines."),
}).passthrough().describe("Check whether a generated post is production-ready.");

// ─── ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH6: 6 unwired feedback/stock/deviation/signoff/engagement/chuck engines (stats surfaces) ─

const lathe_actual_feedback_tuning_stats = z.object({}).passthrough()
  .describe("Read actual-feedback-tuning engine stats (no input).");

const lathe_stock_evolution_stats = z.object({}).passthrough()
  .describe("Read stock-evolution engine stats (no input).");

const lathe_deviation_map_stats = z.object({}).passthrough()
  .describe("Read deviation-map engine stats (no input).");

const lathe_program_signoff_stats = z.object({}).passthrough()
  .describe("Read program-signoff dossier engine stats (no input).");

const lathe_block_engagement_stats = z.object({}).passthrough()
  .describe("Read block-engagement simulator stats (no input).");

const lathe_chuck_jaw_setup_stats = z.object({}).passthrough()
  .describe("Read chuck-jaw setup engine stats (no input).");

// ─── ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH7: 6 unwired LoRA pipeline/cron/registry/health/drift/verification engines ─

const lathe_lora_pipeline_estimated_duration = z.object({}).passthrough()
  .describe("Read LoRA pipeline estimated duration (no input).");

const lathe_lora_cron_schedule_summary = z.object({}).passthrough()
  .describe("Read LoRA cron-job schedule summary (no input).");

const lathe_lora_registry_stats = z.object({}).passthrough()
  .describe("Read LoRA model-registry stats (no input).");

const lathe_lora_health_summary = z.object({}).passthrough()
  .describe("Read LoRA health-monitor summary (no input).");

const lathe_lora_drift_config = z.object({}).passthrough()
  .describe("Read LoRA drift-detector config (no input).");

const lathe_lora_verification_test_cases = z.object({}).passthrough()
  .describe("List LoRA verification test cases (no input).");

// BATCH8: LoRA voter/combiner/deployment/cache/refinement/attention engines

const lathe_lora_voter_stats = z.object({}).passthrough().describe("Read LoRA ensemble voter stats (no input).");
const lathe_lora_combiner_stats = z.object({}).passthrough().describe("Read LoRA ensemble combiner stats (no input).");
const lathe_lora_deployment_stats = z.object({}).passthrough().describe("Read LoRA deployment stats (no input).");
const lathe_lora_embedding_cache_stats = z.object({}).passthrough().describe("Read LoRA embedding-cache stats (no input).");
const lathe_lora_adaptive_refinement_stats = z.object({}).passthrough().describe("Read LoRA adaptive-refinement stats (no input).");
const lathe_lora_attention_analyzer_stats = z.object({}).passthrough().describe("Read LoRA attention-analyzer stats (no input).");

// BATCH9: LoRA benchmark/continual/dataset/ensemble-orch/experiment/hyperparam engines

const lathe_lora_benchmark_test_cases = z.object({}).passthrough().describe("List LoRA benchmark test cases (no input).");
const lathe_lora_continual_buffer_stats = z.object({}).passthrough().describe("Read LoRA continual-learning replay-buffer stats (no input).");
const lathe_lora_dataset_stats = z.object({}).passthrough().describe("Read LoRA dataset-builder stats (no input).");
const lathe_lora_ensemble_orch_stats = z.object({}).passthrough().describe("Read LoRA ensemble-orchestrator stats (no input).");
const lathe_lora_experiment_stats = z.object({}).passthrough().describe("Read LoRA experiment-tracker stats (no input).");
const lathe_lora_hyperparam_presets = z.object({}).passthrough().describe("List LoRA hyperparameter presets (no input).");

// BATCH10: LoRA cadence-orch/knowledge-graph/master-orch/model-selector/monitoring/resource-mgr engines

const lathe_lora_cadence_orch_config = z.object({}).passthrough().describe("Read LoRA cadence-orchestrator config (no input).");
const lathe_lora_knowledge_graph_stats = z.object({}).passthrough().describe("Read LoRA knowledge-graph stats (no input).");
const lathe_lora_master_orch_stats = z.object({}).passthrough().describe("Read LoRA master-orchestrator stats (no input).");
const lathe_lora_model_selector_stats = z.object({}).passthrough().describe("Read LoRA model-selector stats (no input).");
const lathe_lora_monitoring_stats = z.object({}).passthrough().describe("Read LoRA monitoring stats (no input).");
const lathe_lora_resource_manager_stats = z.object({}).passthrough().describe("Read LoRA resource-manager stats (no input).");

// OBSIDIAN-AUTOMATE-MS3/U-WIRE-LATHE-BATCH11: 4 small lathe orphans (FirstPiece, EnvelopeReplay, AuxAxis, DRF)
const lathe_first_piece_approval_evaluate = z.object({}).passthrough().describe("First-piece approval evaluation: pass {job_id, part_number, operator, inspector, readings[], optional warning_band_fraction + instrument_uncertainty_mm}.");
const lathe_first_piece_approval_stats = z.object({}).passthrough().describe("Get first-piece approval defaults + reference (no input).");
const lathe_envelope_breach_replay = z.object({}).passthrough().describe("Envelope breach replay: pass {blocks[], envelope} to detect chuck/tailstock/steady_rest/x_limit/z_limit hits.");
const lathe_envelope_breach_replay_stats = z.object({}).passthrough().describe("Get envelope breach component list + reference (no input).");
const lathe_aux_axis_timing_analyze = z.object({}).passthrough().describe("Auxiliary-axis timing analysis: pass {operations[], turret, optional rapid_rate, spindle_accel, turret_base_index_s, turret_step_time_s}.");
const lathe_aux_axis_timing_stats = z.object({}).passthrough().describe("Get aux-axis timing component count + reference (no input).");
const lathe_datum_reference_frame_assign = z.object({}).passthrough().describe("Assign datum reference frame (A/B/C): pass {part_id, features[], optional fixed_primary/secondary/tertiary}.");
const lathe_datum_reference_frame_stats = z.object({}).passthrough().describe("Get DRF DOF model + applied rules (no input).");

// OBSIDIAN-AUTOMATE-MS3/U-PROBE-EXPOSE: surface LatheOnMachineProbeCycleEngine
const lathe_omv_probe_generate = z.object({
  cycle: z.enum(["od_measure", "id_measure", "face_z_measure", "groove_width", "thread_start", "work_offset_bump"]).describe("Probe cycle type"),
  nominal_mm: z.number().positive().describe("Nominal dimension in mm (diameter for OD/ID, Z for face, width for groove)"),
  tol_mm: z.number().positive().describe("Plus/minus tolerance in mm (one-sided for unilateral)"),
  probe_feed_mm_min: z.number().positive().optional().describe("Probe feed mm/min (default 1000)"),
  approach_mm: z.number().positive().optional().describe("Approach rapid clearance above target mm (default 5)"),
  macro_override: z.number().int().positive().optional().describe("Probe macro number override (Renishaw default per cycle)"),
  wcs: z.enum(["G54", "G55", "G56", "G57", "G58", "G59"]).optional().describe("Active work coordinate system for offset bump (default G54)"),
  axis: z.enum(["X", "Z"]).optional().describe("Axis for single-axis probes (X or Z; default X for OD/ID)"),
  probe_stylus_length_mm: z.number().positive().optional().describe("Probe stylus length mm (clearance check)"),
}).describe("Generate Renishaw OMV probe-cycle G-code for a lathe (LatheOnMachineProbeCycleEngine.generate).");

const lathe_omv_probe_stats = z.object({}).passthrough().describe("List supported OMV probe cycle types + reference (no input).");

// TRAINING-LEARNING-MS0/U1: LathePartFamilyTemplateExtractorEngine wiring.
// Three actions surface the engine: corpus_status (catalogCorpus), template_match
// (extractTemplate), template_list (listTemplates). Accepts either an in-memory
// snapshot OR a snapshotPath for production use; tests use the in-memory variant.
const lathe_training_corpus_status = z.object({
  snapshot: z.record(z.string(), z.any()).optional().describe(
    "Optional in-memory CorpusSnapshot object (skips disk read). For tests + agents that already hold the snapshot."
  ),
  snapshotPath: z.string().optional().describe(
    "Optional filesystem path to a phase20-emitted corpus-scan snapshot JSON. Defaults to mcp-server/data/training/templates/lathe/_corpus-scan.json."
  ),
}).describe(
  "Catalog the JM Die lathe corpus and return per-family counts + top customers + seed-macro anchors. Read-only against the corpus."
);

const lathe_training_template_match = z.object({
  family: z.string().describe(
    "LatheTemplateFamily literal — one of wafer-insert / casing / casing-counterbore / top-hat-casing / shaft / flange / bushing / tube / taptite-blank / nut-blank / electrode-rod-blank / unknown."
  ),
  snapshot: z.record(z.string(), z.any()).optional().describe(
    "Optional in-memory CorpusSnapshot."
  ),
  snapshotPath: z.string().optional().describe(
    "Optional filesystem path to a corpus-scan snapshot JSON."
  ),
  outDir: z.string().optional().describe(
    "Optional output directory for the emitted template JSON (default: mcp-server/data/training/templates/lathe/). Path-traversal-guarded unless PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED=1."
  ),
  dryRun: z.boolean().optional().describe(
    "If true, returns the template without writing to disk. Default false."
  ),
}).describe(
  "Extract and (optionally) emit a TrainingTemplate JSON for one family. Wraps PRISMSelfAwarenessEngine tribal-knowledge lookup + MacroLibraryEngine OSP-anchored seeds (wafer-insert / casing / casing-counterbore / top-hat-casing)."
);

const lathe_training_template_list = z.object({
  dir: z.string().optional().describe(
    "Optional directory to list templates from (default: mcp-server/data/training/templates/lathe/). Filters out _-prefixed and .-prefixed entries."
  ),
}).describe(
  "List all on-disk lathe training templates. Returns family name + file path + size + modified-at per entry."
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-TURNINSP — TurningInspectionPlanEngine
// First-article + production inspection plan: ANSI/ASQ Z1.4 AQL sampling,
// ISO 1101/12181 form measurement, AS9102 first-article. Pure computation —
// no clamping force, no I/O — so it is NOT in the cross-field physics set.
// ============================================================================

const _inspFeature = z.object({
  id: z.string().min(1).describe("Feature identifier (e.g. 'OD1', 'BORE-A')."),
  kind: z.enum(["od", "bore", "face", "thread", "groove", "chamfer", "radius", "taper"])
    .describe("Turned-feature type — drives measurement-method selection."),
  nominal_mm: z.number().positive()
    .describe("Nominal dimension in mm (diameter for od/bore, length for face)."),
  tolerance_mm: z.number().positive()
    .describe("Total tolerance band in mm — drives tolerance class + sampling tightness."),
  ra_target_um: z.number().positive().optional()
    .describe("Optional surface-finish target Ra in micrometers; adds a Surftest pass to the plan."),
  criticality: z.enum(["cosmetic", "functional", "critical", "safety_critical"]).optional()
    .describe("Feature criticality — escalates inspection frequency (default functional)."),
  requires_form_tolerance: z.boolean().optional()
    .describe("True if the feature carries a roundness/cylindricity callout — forces CMM probing."),
  form_tolerance_mm: z.number().positive().optional()
    .describe("Optional form-tolerance band in mm (roundness/cylindricity)."),
}).passthrough();

const turning_inspection_plan = z.object({
  part_id: z.string().min(1).describe("Part identifier the inspection plan is generated for."),
  lot_size: z.number().int().positive()
    .describe("Production lot size in parts (>0) — drives AQL sample size."),
  features: z.array(_inspFeature).min(1).describe("Inspected features (at least one)."),
  regulatory_regime: z.enum(["commercial", "automotive", "aerospace", "medical"]).optional()
    .describe("Customer/spec regime — aerospace/medical force every-part + first-article (default commercial)."),
  cmm_available: z.boolean().optional()
    .describe("True if the shop has a CMM available (default true)."),
  probe_available: z.boolean().optional()
    .describe("True if on-machine probing is available (default false)."),
}).passthrough().describe(
  "Generate a first-article + production inspection plan for a turned part (TurningInspectionPlanEngine.generate).",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-PARTOFF — LathePartoffSafetyRailEngine
// SAFETY-CRITICAL: parting-off go/no-go gate (7 deterministic gates: tool
// overhang ratio, surface speed SFM, feed/rev, chip clearance, chip breaker
// vs UTS, workholding adequacy, sub-spindle purge). Thresholds grounded in
// Sandvik parting guide + Machinery's Handbook 31st ed.
// ============================================================================

const lathe_partoff_safety_gate = z.object({
  part_diameter_mm: posNum
    .describe("Part outer diameter at the parting line in mm (>0)."),
  parting_width_mm: posNum
    .describe("Parting blade / insert width in mm (>0). Drives every ratio gate."),
  tool_overhang_mm: posNum
    .describe("Tool overhang from toolholder face in mm (>0). L/D > 4 hard-blocks."),
  spindle_rpm: posNum
    .describe("Spindle speed in RPM (>0). Combined with diameter to compute SFM."),
  feed_mm_per_rev: posNum
    .describe("Axial feed in mm/rev (>0). Hard-block above 0.25, warn above 0.12."),
  material_uts_mpa: posNum
    .describe("Ultimate tensile strength of workpiece material in MPa (>0). Drives chip-breaker requirement."),
  workholding_type: z.enum(["chuck", "collet", "bar_puller", "sub_spindle"])
    .describe("Workholding type — bar_puller on D > 50mm raises a warn gate."),
  chip_clearance_mm: posNum
    .describe("Clearance between tool/holder and the next feature on the part in mm (>0). Hard-blocks below 1.5× width."),
  has_subspindle_purge: z.boolean()
    .describe("True if a sub-spindle purge / air-blow plan is present. Only evaluated when workholding_type==='sub_spindle'."),
  chip_breaker: z.enum(["none", "groove", "coated", "high_positive"])
    .describe("Insert chip-breaker geometry. 'none' on UTS ≥ 600 MPa raises a warn gate."),
}).passthrough().describe(
  "Parting-off safety gate (LathePartoffSafetyRailEngine.evaluate). Returns passed + gates[] + violations[] + advisories[] + summary. SAFETY-CRITICAL: any hard_block gate failure flips passed=false.",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-LWH — LatheWorkholdingEngine (6 actions)
// SAFETY-RELEVANT: clamping force determines ejection risk; ISO 10218 SF=2.5
// minimum is enforced inside the engine. Thresholds grounded in DIN 6350,
// Machinery's Handbook 31st Ed., Schunk + Hainbuch catalogs.
// ============================================================================

const _stockForm = z.enum(["bar", "forging", "casting", "hex_bar", "tube", "pre_machined"]);

const lathe_workholding_select_jaw = z.object({
  grip_diameter_mm: posNum.describe("Part OD at grip location in mm (>0)."),
  bore_id_mm: z.number().nonnegative().optional()
    .describe("Part ID at grip location in mm (0 if solid)."),
  wall_thickness_mm: optPosNum.describe("Optional wall thickness in mm; auto-computed from OD - ID when omitted."),
  tolerance_mm: optPosNum.describe("Tightest part tolerance in mm (default 0.1)."),
  surface_finish_ra_um: optPosNum.describe("Required surface finish Ra in micrometers (default 3.2)."),
  batch_size: z.number().int().positive().optional().describe("Batch quantity (default 1)."),
  stock_form: _stockForm.optional().describe("Stock form (default 'bar')."),
  material: z.string().optional().describe("Material name for friction/modulus lookup (default steel)."),
  cutting_force_n: optPosNum.describe("Cutting force resultant in N (default 2000)."),
  is_ferrous: z.boolean().optional().describe("True if magnetic chuck is a viable alternative."),
  part_length_mm: optPosNum.describe("Optional part length in mm."),
}).passthrough().describe(
  "Lathe jaw selection (LatheWorkholdingEngine.selectJaw). Decision tree: thin-wall → 6-jaw/collet, tight-tol → soft-bored, irregular stock → soft, fine Ra → soft, high volume → collet. Returns recommended jaw + alternatives + clamping force + ISO 10218 SF.",
);

const lathe_workholding_trilobe = z.object({
  od_mm: posNum.describe("Part OD in mm (>0)."),
  id_mm: z.number().nonnegative().describe("Part through-bore ID in mm (≥0)."),
  jaw_width_mm: optPosNum.describe("Jaw axial contact width in mm (default 10)."),
  youngs_modulus_gpa: optPosNum.describe("Optional Young's modulus override in GPa."),
  clamp_force_n: posNum.describe("Total 3-jaw clamping force in N (>0)."),
  tolerance_mm: optPosNum.describe("Part diametric tolerance in mm (default 0.05) — distortion must be < tol/2 to pass."),
  material: z.string().optional().describe("Material name for modulus lookup."),
}).passthrough().describe(
  "Trilobe distortion for a thin-walled ring in 3-jaw chuck (LatheWorkholdingEngine.calculateTrilobe). δ = F·R³/(E·I), I = b·t³/12 (Nee & Tao). Returns δ in µm + acceptance + max safe force.",
);

const lathe_workholding_face_driver = z.object({
  axial_force_n: posNum.describe("Axial force from tailstock/actuator in N (>0)."),
  n_pins: z.number().int().min(2).max(12).optional().describe("Number of drive pins (default 4)."),
  mu: z.number().min(0.05).max(1).optional().describe("Pin/part friction coefficient (default 0.25 for serrated)."),
  pin_circle_radius_mm: posNum.describe("Mean radius of pin circle in mm (>0)."),
  required_torque_nm: optPosNum.describe("Required cutting torque in Nm (default = 50% of transmittable)."),
}).passthrough().describe(
  "Face driver torque transmission (LatheWorkholdingEngine.calculateFaceDriver). T = F_axial · μ · r_mean · n_pins. Returns transmittable torque + SF + adequacy.",
);

const lathe_workholding_expanding_mandrel = z.object({
  bore_id_mm: posNum.describe("Part bore ID in mm (>0)."),
  od_mm: posNum.describe("Part OD in mm (>0)."),
  mandrel_od_mm: posNum.describe("Mandrel OD (unexpanded) in mm (>0)."),
  interference_mm: optPosNum.describe("Diametral interference in mm (default 0.02)."),
  contact_length_mm: posNum.describe("Contact length in mm (>0)."),
  youngs_modulus_gpa: optPosNum.describe("Optional E override in GPa."),
  poisson_ratio: z.number().min(0.1).max(0.5).optional().describe("Poisson's ratio (default 0.3)."),
  mu: z.number().min(0.05).max(1).optional().describe("Friction coefficient (default 0.15)."),
  required_torque_nm: optPosNum.describe("Required cutting torque in Nm (default = 40% of grip torque)."),
  material: z.string().optional().describe("Material name."),
}).passthrough().describe(
  "Expanding mandrel grip via Lame thick-wall equations (LatheWorkholdingEngine.calculateExpandingMandrel). p = Δ·E/(r·((r_o²+r_i²)/(r_o²-r_i²)+ν)). Returns contact pressure + grip torque + SF.",
);

const lathe_workholding_magnetic_chuck = z.object({
  holding_force_n_per_cm2: optPosNum.describe("Chuck-spec holding force per cm² (default 80 N/cm²)."),
  contact_area_cm2: posNum.describe("Contact area in cm² (>0)."),
  is_ferrous: z.boolean().describe("Magnetic chuck only works on ferrous parts — false rejects."),
  part_thickness_mm: posNum.describe("Part thickness in mm (>0); <10mm linearly de-rates holding force."),
  required_force_n: optPosNum.describe("Required holding force in N (default = 30% of available)."),
}).passthrough().describe(
  "Magnetic chuck holding force (LatheWorkholdingEngine.calculateMagneticChuck). Ferrous-only; thin parts de-rate. Returns holding force + ISO 10218 SF + adequacy.",
);

const lathe_workholding_stock_form = z.object({
  stock_form: _stockForm.describe("Stock form classification."),
  grip_diameter_mm: posNum.describe("Grip diameter / across-flats in mm (>0)."),
  wall_thickness_mm: optPosNum.describe("Tube wall thickness in mm (only used for tube; default 3)."),
}).passthrough().describe(
  "Stock-form workholding + roughing-cycle recommendation (LatheWorkholdingEngine.stockFormRecommendation). Returns jaw type + G71/G72/G73 cycle + clamping notes.",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-LSO — LatheSequenceOptimizerEngine (LATHE-PRO-MS3/U-LPS02)
// Multi-criteria operation sequencing for turned parts. Hard constraints
// (face first, part-off last, center-drill→drill→ream→tap, rough→finish,
// thread-after-OD-finish, G97 for drill/tap/ream) are non-overridable. Soft
// objectives are weighted [0..1]: cycle time, tool life, tool changes,
// thermal drift. Reference: Peter Smid, CNC Programming Handbook Ch. 2.
// ============================================================================

/** Closed enum of supported turning operation types (mirrors engine's OperationType). */
const _seqOpType = z.enum([
  "face", "center_drill", "rough_od", "finish_od", "rough_bore", "finish_bore",
  "drill", "ream", "tap", "thread_od", "thread_id",
  "groove_od", "groove_id", "groove_face", "part_off",
  "chamfer", "knurl", "polish", "g73_rough", "keyway",
  "profile_od", "profile_bore",
]);

const _seqOperation = z.object({
  id: z.string().min(1).describe("Operation identifier (unique within the sequence)."),
  type: _seqOpType.describe("Turning operation type — drives priority tier + spindle mode."),
  feature_id: z.string().optional().describe("Optional feature this operation acts on (for rough/finish pairing)."),
  tool_number: z.number().int().nonnegative().optional().describe("Tool number for change-minimization grouping."),
  estimated_time_sec: z.number().nonnegative().optional().describe("Estimated cycle time in seconds (for cycle-time score)."),
  is_roughing: z.boolean().optional().describe("Mark roughing op for thermal sequencing (auto-detected from type if omitted)."),
  is_finishing: z.boolean().optional().describe("Mark finishing op for thermal sequencing (auto-detected from type if omitted)."),
  tolerance_mm: z.number().positive().optional().describe("Required tolerance in mm — sub-threshold values force thermal sequencing."),
  tool_group: z.string().optional().describe("Tool group for change-minimization when tool_number is shared/missing."),
}).passthrough();

const _seqConstraints = z.object({
  thermal_tolerance_threshold_mm: z.number().positive().optional()
    .describe("Tolerance below which thermal rough→cool→finish sequencing fires (default 0.05mm)."),
  force_thermal_sequencing: z.boolean().optional()
    .describe("Force thermal sequencing even on loose-tolerance parts."),
  weight_cycle_time: z.number().min(0).max(1).optional()
    .describe("Cycle-time minimization weight 0..1 (default 0.3)."),
  weight_tool_life: z.number().min(0).max(1).optional()
    .describe("Tool-life maximization weight 0..1 (default 0.2)."),
  weight_tool_changes: z.number().min(0).max(1).optional()
    .describe("Tool-change minimization weight 0..1 (default 0.3)."),
  weight_thermal: z.number().min(0).max(1).optional()
    .describe("Thermal-drift minimization weight 0..1 (default 0.2)."),
}).passthrough();

const lathe_sequence_optimize = z.object({
  operations: z.array(_seqOperation).min(1)
    .describe("Unordered operations to sequence (at least one)."),
  constraints: _seqConstraints.optional()
    .describe("Optional soft-objective weights + thermal thresholds."),
}).passthrough().describe(
  "Optimize turning operation sequence (LatheSequenceOptimizerEngine.optimize). Returns sorted operations[], spindle_modes per op (G96 vs G97), tool_changes count, thermal_sequencing_active flag, constraint_violations[], optimization_score in [0..1], and reasoning[].",
);

const lathe_sequence_validate = z.object({
  operations: z.array(_seqOperation).min(1)
    .describe("Already-ordered operations to validate against hard constraints."),
}).passthrough().describe(
  "Validate a turning sequence against hard constraints (LatheSequenceOptimizerEngine.validateSequence). Returns { violations: string[] } — empty array means the sequence respects every hard rule.",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-TWP — TurningWearPredictionEngine
// (LATHE-PRO-MS1 U-LPR14, U-LPR15, U-LPR16) — Per-op Usui wear, chip-form
// taxonomy, batch life predictor. Engine API preserves Vc_m_min as a camel-
// Pascal key (matches the canonical Taylor/Kienzle physics signature), so
// schemas mirror that naming exactly.
// ============================================================================

/** ISO 513 material groups. */
const _isoGroup = z.enum(["P", "M", "K", "N", "S", "H"]);

/** Single turning operation (mirrors engine's TurningOperation interface). */
const _turningWearOp = z.object({
  id: z.string().min(1).describe("Operation identifier (unique within sequence)."),
  type: z.enum([
    "od_rough", "od_finish", "face_rough", "face_finish",
    "bore_rough", "bore_finish", "groove", "thread", "cutoff", "drill",
  ]).describe("Operation type — drives chip-form + wear-mode classification."),
  insert_station: z.number().int().nonnegative()
    .describe("Turret station performing this op — per-station wear accumulates separately."),
  diameter_mm: posNum.describe("Diameter being machined in mm (>0)."),
  cut_length_mm: posNum.describe("Cut length in mm (>0)."),
  ap_mm: posNum.describe("Depth of cut in mm (>0)."),
  f_mm_rev: posNum.describe("Feed per revolution in mm/rev (>0)."),
  Vc_m_min: posNum.describe("Cutting speed in m/min (>0) — Taylor/Kienzle canonical key."),
  passes: z.number().int().positive().describe("Number of passes (>=1)."),
  interrupted: z.boolean().optional().describe("True if this is an interrupted cut."),
}).passthrough();

const turning_wear_per_op = z.object({
  iso_group: _isoGroup.describe("ISO 513 material group — drives Usui A/B + Kienzle kc1.1/mc + chip-form base."),
  material_name: z.string().optional().describe("Optional material name for thermal-conductivity lookup."),
  hardness_HB: optPosNum.describe("Brinell hardness in HB (optional)."),
  coating: z.string().optional().describe("Optional coating identifier (TiN, AlTiN, etc.)."),
  nose_radius_mm: optPosNum.describe("Insert nose radius in mm (optional)."),
  operations: z.array(_turningWearOp).min(1)
    .describe("At least one operation to accumulate wear over."),
}).passthrough().describe(
  "Per-operation Usui wear accumulation (TurningWearPredictionEngine.accumulatePerOperation). Returns operations[] (per-op wear µm + Fc + temp + chip form), station_wear (cumulative per turret station), and stations_at_risk (stations beyond 75% of VB_max=300µm).",
);

const turning_wear_chip_form = z.object({
  iso_group: _isoGroup.describe("ISO 513 material group — chip-form base classification."),
  vc_m_min: posNum.describe("Cutting speed in m/min (>0). Low ratio→BUE, high ratio→segmented."),
  f_mm_rev: posNum.describe("Feed per revolution in mm/rev (>0). Drives chipbreaker class selection."),
  ap_mm: posNum.describe("Depth of cut in mm (>0). Drives chipbreaker class selection."),
}).passthrough().describe(
  "Chip-form prediction with wear-mode mapping (TurningWearPredictionEngine.predictChipForm). Returns chip_type (continuous/segmented/discontinuous/lamellar/built_up_edge), primary + secondary wear modes, chip_control_difficulty in [0..1], recommended chipbreaker_class (F/M/R), and rationale.",
);

const turning_wear_batch_life = z.object({
  iso_group: _isoGroup.describe("ISO 513 material group."),
  material_name: z.string().optional().describe("Optional material name for thermal lookup."),
  coating: z.string().optional().describe("Optional coating identifier."),
  nose_radius_mm: optPosNum.describe("Insert nose radius in mm (optional)."),
  operations: z.array(_turningWearOp).min(1)
    .describe("Operations per part (wear accumulates per station across all ops)."),
  batch_quantity: z.number().int().positive()
    .describe("Production batch size in parts (>=1)."),
  insert_cost_per_edge: optPosNum
    .describe("Insert cost per edge in USD (default $8.00 per edge)."),
  target_parts_per_edge: optPosNum
    .describe("Optional target parts-per-edge — triggers Vc adjustment suggestion via Taylor T∝Vc^(-1/n)."),
}).passthrough().describe(
  "Batch life predictor with cost analysis + Vc optimization (TurningWearPredictionEngine.predictBatchLife). Returns parts_per_edge (worst station), insert_changes_per_batch, per-station change_schedule, cost breakdown (total + per-part-tooling + edges_consumed), and optional optimization { current/target parts_per_edge, suggested_vc_m_min, adjustment_pct }.",
);

export const TURNING_ACTION_SCHEMAS: ActionSchemaMap = {
  chuck_force,
  tailstock,
  steady_rest,
  live_tool,
  bar_pull,
  thread_single_point,
  part_off_force,
  hard_turn_decide,
  hard_turn_optimize,

  // BATCH2 schemas: AI/intelligence/knowledge
  lathe_anomaly_detect_program,
  lathe_causal_build_model,
  lathe_ensemble_stats,
  lathe_changeover_stats,
  lathe_jmdie_extract_customer,
  lathe_metallurgy_tool_steel_db,

  // BATCH3 schemas: knowledge/predictive/troubleshoot
  lathe_knowledge_harvest_programs,
  lathe_program_analyze,
  lathe_expert_material_strategy,
  lathe_machine_get_profile,
  lathe_troubleshoot_overhang,
  lathe_predictive_tool_wear,

  // BATCH4 schemas: tribal/science/reasoning/neural/jmdie
  lathe_tribal_stats,
  lathe_unified_science_version,
  lathe_unified_science_recommend,
  lathe_kinematics_get_machine_specs,
  lathe_neural_intel_stats,
  lathe_jmdie_extract_operations,

  // BATCH5 schemas: LoRA-cadence/post-uncertainty/deep-reasoning
  lathe_lora_cadence_state,
  lathe_lora_cadence_should_trigger,
  lathe_lora_cadence_active_version,
  lathe_deep_reasoning_record_outcome,
  lathe_post_uncertainty_analyze_block,
  lathe_post_uncertainty_prod_ready,

  // BATCH6 schemas: feedback/stock/deviation/signoff/engagement/chuck stats surfaces
  lathe_actual_feedback_tuning_stats,
  lathe_stock_evolution_stats,
  lathe_deviation_map_stats,
  lathe_program_signoff_stats,
  lathe_block_engagement_stats,
  lathe_chuck_jaw_setup_stats,

  // BATCH7 schemas: LoRA pipeline/cron/registry/health/drift/verification
  lathe_lora_pipeline_estimated_duration,
  lathe_lora_cron_schedule_summary,
  lathe_lora_registry_stats,
  lathe_lora_health_summary,
  lathe_lora_drift_config,
  lathe_lora_verification_test_cases,

  // BATCH8 schemas: LoRA voter/combiner/deployment/cache/refinement/attention
  lathe_lora_voter_stats,
  lathe_lora_combiner_stats,
  lathe_lora_deployment_stats,
  lathe_lora_embedding_cache_stats,
  lathe_lora_adaptive_refinement_stats,
  lathe_lora_attention_analyzer_stats,

  // BATCH9 schemas: LoRA benchmark/continual/dataset/ensemble-orch/experiment/hyperparam
  lathe_lora_benchmark_test_cases,
  lathe_lora_continual_buffer_stats,
  lathe_lora_dataset_stats,
  lathe_lora_ensemble_orch_stats,
  lathe_lora_experiment_stats,
  lathe_lora_hyperparam_presets,

  // BATCH10 schemas: LoRA cadence-orch/knowledge-graph/master-orch/model-selector/monitoring/resource-mgr
  lathe_lora_cadence_orch_config,
  lathe_lora_knowledge_graph_stats,
  lathe_lora_master_orch_stats,
  lathe_lora_model_selector_stats,
  lathe_lora_monitoring_stats,
  lathe_lora_resource_manager_stats,

  // OBSIDIAN-AUTOMATE-MS3/U-PROBE-EXPOSE
  lathe_omv_probe_generate,
  lathe_omv_probe_stats,

  // OBSIDIAN-AUTOMATE-MS3/U-WIRE-LATHE-BATCH11
  lathe_first_piece_approval_evaluate,
  lathe_first_piece_approval_stats,
  lathe_envelope_breach_replay,
  lathe_envelope_breach_replay_stats,
  lathe_aux_axis_timing_analyze,
  lathe_aux_axis_timing_stats,
  lathe_datum_reference_frame_assign,
  lathe_datum_reference_frame_stats,

  // MACRO-DOMAIN-MS0/U-MACRO-LIB: macro library cross-wire (same engine + schemas as prism_cad)
  macro_library_list: macroLibraryListSchema,
  macro_match_family: macroMatchFamilySchema,
  macro_place_template: macroPlaceTemplateSchema,
  macro_fanout_dry_run: macroFanoutDryRunSchema,

  // TRAINING-LEARNING-MS0/U1: LathePartFamilyTemplateExtractorEngine surfaces
  lathe_training_corpus_status,
  lathe_training_template_match,
  lathe_training_template_list,

  // MS-PRINT-PROGRAM-LOOP/U-PPL-A1: TurningMinFingerprintEngine surfaces
  turning_min_fingerprint,
  turning_min_classify,

  // MS-PRINT-PROGRAM-LOOP/U-PPL-B1: ProgramReoptimizationOrchestratorEngine
  lathe_program_reoptimize,

  // WIRE-UNWIRED-MS0/U-WIRE-TURNINSP: TurningInspectionPlanEngine surface
  turning_inspection_plan,

  // WIRE-UNWIRED-MS0/U-WIRE-PARTOFF: LathePartoffSafetyRailEngine surface
  lathe_partoff_safety_gate,

  // WIRE-UNWIRED-MS0/U-WIRE-LWH: LatheWorkholdingEngine — 6 surfaces
  lathe_workholding_select_jaw,
  lathe_workholding_trilobe,
  lathe_workholding_face_driver,
  lathe_workholding_expanding_mandrel,
  lathe_workholding_magnetic_chuck,
  lathe_workholding_stock_form,

  // WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheSequenceOptimizerEngine — 2 surfaces
  lathe_sequence_optimize,
  lathe_sequence_validate,

  // WIRE-UNWIRED-MS0/U-WIRE-TWP: TurningWearPredictionEngine — 3 surfaces
  turning_wear_per_op,
  turning_wear_chip_form,
  turning_wear_batch_life,
};
