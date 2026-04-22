/**
 * Mill Dispatcher Action Schemas
 * =================================
 * Per-action Zod schemas for prism_mill actions.
 * Validated AFTER normalizeParams(), BEFORE facade dispatch.
 *
 * @module schemas/millActionSchemas
 * @version 1.0.0
 * @milestone MILL-MASTER-P1-U01-MILL-DISP
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optStr = z.string().optional();
const optBool = z.boolean().optional();

const materialIso = z.enum(["P", "M", "K", "N", "S", "H"]);
const operation = z.enum([
  "roughing", "semi_finishing", "finishing",
  "drilling", "tapping", "reaming", "boring",
  "thread_milling", "chamfering", "engraving",
  "pocket_rough", "pocket_finish", "profile", "adaptive",
  "ramp", "helical", "trochoidal", "plunge",
]).describe("Milling operation type");

const requestType = z.enum([
  "print_to_program", "scientific", "agi", "validate", "quick", "wisdom",
]).describe("MillMasterOrchestratorFacadeEngine routing type");

// Shared mill-context shape — all orchestrate-family actions accept this
const millContext = {
  material: z.string().describe("Material name or ISO-513 group (e.g., 4140, Inconel 718, P-group)"),
  material_iso: materialIso.optional().describe("ISO 513 group P/M/K/N/S/H"),
  operation: operation.optional().describe("Milling operation"),
  tool_diameter_mm: optPosNum.describe("Tool diameter (mm)"),
  tool_flutes: z.number().int().positive().optional().describe("Number of flutes"),
  rpm: optPosNum.describe("Spindle speed (rev/min)"),
  feed_mm_min: optPosNum.describe("Feed rate (mm/min)"),
  cutting_speed_m_min: optPosNum.describe("Cutting speed (m/min)"),
  feed_per_tooth_mm: optPosNum.describe("Feed per tooth (mm/tooth)"),
  axial_depth_mm: optPosNum.describe("Axial depth of cut (mm)"),
  radial_depth_mm: optPosNum.describe("Radial depth of cut (mm)"),
  wisdom_category: optStr.describe("Wisdom lookup category (for wisdom action)"),
  include_resources: optBool.describe("Attach MillResourceAwareness supplemental"),
  include_tribal: optBool.describe("Attach MillTribalKnowledge supplemental"),
  include_holder_rec: optBool.describe("Attach ToolHolderRegistry supplemental"),
};

// ============================================================================
// FACADE ROUTING ACTIONS (consume MillMasterOrchestratorFacadeEngine directly)
// ============================================================================

const mill_orchestrate = z.object({
  type: requestType,
  ...millContext,
  print: z.any().optional().describe("Print-to-program payload (for type=print_to_program)"),
}).passthrough();

const mill_quick = z.object(millContext).passthrough();
const mill_scientific = z.object(millContext).passthrough();
const mill_agi = z.object(millContext).passthrough();
const mill_validate = z.object(millContext).passthrough();
const mill_wisdom = z.object(millContext).passthrough();
const mill_print_to_program = z.object({
  ...millContext,
  print: z.any().describe("Print/blueprint payload"),
}).passthrough();

// ============================================================================
// FACADE META ACTIONS (introspection)
// ============================================================================

const mill_routing_map = z.object({}).passthrough();
const mill_self_awareness = z.object({}).passthrough();
const mill_coordinated_stats = z.object({}).passthrough();

// ============================================================================
// AI LAYER ACTIONS — route via facade to AGI/reasoning sub-orchestrators
// ============================================================================

const mill_agi_reason = z.object({
  ...millContext,
  reasoning_mode: z.enum(["convergent", "divergent", "lateral", "systems", "critical", "adaptive", "deep", "meta"]).optional(),
  depth: z.number().int().min(1).max(10).optional().describe("Reasoning depth 1-10"),
}).passthrough();

const mill_agi_counterfactual = z.object({
  ...millContext,
  what_if: z.string().describe("Counterfactual question"),
}).passthrough();

const mill_agi_explain = z.object({
  ...millContext,
  decision: z.string().describe("Decision to explain"),
}).passthrough();

const mill_meta_adapt = z.object({
  ...millContext,
  task_distribution: optStr.describe("Task distribution signature for meta-learning"),
}).passthrough();

const mill_rl_recommend = z.object({
  ...millContext,
  objective: z.enum(["cycle_time", "tool_life", "surface_finish", "pareto"]).default("pareto"),
}).passthrough();

// ============================================================================
// SCIENTIFIC LAYER — physics + unified science
// ============================================================================

const mill_physics_analyze = z.object({
  ...millContext,
  domains: z.array(z.enum(["force", "thermal", "wear", "chatter", "deflection", "surface", "chip", "residual"])).optional(),
}).passthrough();

const mill_force_kienzle = z.object({
  material: z.string(),
  material_iso: materialIso.optional(),
  axial_depth_mm: posNum,
  feed_per_tooth_mm: posNum,
  tool_diameter_mm: posNum,
  tool_flutes: z.number().int().positive(),
  radial_depth_mm: optPosNum,
}).passthrough();

// P4-U06: Tool material types for deflection/chatter
const toolMaterialType = z.enum(["carbide", "hss", "ceramic", "cermet", "cbn", "pcd"]);

const mill_chatter_sld = z.object({
  tool_diameter_mm: posNum.describe("Tool diameter (mm)"),
  tool_flutes: z.number().int().min(1).max(12).describe("Number of flutes"),
  tool_overhang_mm: posNum.describe("Tool stickout from holder (mm)"),
  tool_material: toolMaterialType.optional().describe("Tool material (default: carbide)"),
  material_iso: materialIso.describe("Workpiece ISO 513 group P/M/K/N/S/H"),
  kc11_mpa: optPosNum.describe("Specific cutting force (MPa) — uses Kienzle canonical if omitted"),
  machine_id: optStr.describe("Machine ID for FRF registry lookup"),
  natural_frequency_hz: optPosNum.describe("Manual FRF mode (Hz) — used if no machine_id"),
  damping_ratio: z.number().min(0.001).max(0.5).optional().describe("Damping ratio ζ (default ~0.03)"),
  stiffness_n_um: optPosNum.describe("Dynamic stiffness (N/μm)"),
  max_rpm: posNum.describe("Maximum spindle RPM to analyze"),
  min_rpm: optPosNum.describe("Minimum spindle RPM (default: 1000)"),
  radial_immersion_ratio: z.number().min(0.01).max(1.0).optional().describe("ae/D radial engagement ratio"),
  up_milling: optBool.describe("Up milling vs down milling (default: false = climb)"),
  cutting_speed_mpm: optPosNum.describe("Cutting speed (m/min) for process damping"),
  process_damping_clearance_deg: z.number().min(1).max(30).optional().describe("Tool relief angle (°) for process damping"),
  process_damping_wear_land_mm: z.number().min(0).max(1).optional().describe("Flank wear VB (mm) for process damping"),
}).passthrough().describe("Compute stability lobe diagram (SLD) for chatter prediction");

const mill_thermal_predict = z.object({
  ...millContext,
  shear_strength_mpa: optPosNum.describe("Shear strength of workpiece material (MPa) — typically 0.5-0.7 × UTS"),
  shear_angle_deg: z.number().min(5).max(45).optional().describe("Shear plane angle (°) — typically 20-30° for metals"),
  rake_angle_deg: z.number().min(-20).max(30).optional().describe("Tool rake angle (°) — positive for aluminum, negative for hard materials"),
  material_density_kg_m3: optPosNum.describe("Workpiece density (kg/m³) — steel ~7850, aluminum ~2700"),
  material_specific_heat_j_kgk: optPosNum.describe("Specific heat capacity (J/kg·K) — steel ~500, aluminum ~900"),
  material_thermal_conductivity_w_mk: optPosNum.describe("Thermal conductivity (W/m·K) — steel ~50, aluminum ~205"),
  ambient_temp_c: z.number().min(-40).max(100).optional().describe("Ambient temperature (°C) — default 25"),
  specific_cutting_energy_j_mm3: optPosNum.describe("Specific cutting energy (J/mm³) — typically 2-5 for steels"),
  tool_thermal_conductivity_w_mk: optPosNum.describe("Tool thermal conductivity (W/m·K) — carbide ~80, ceramic ~30"),
  tool_density_kg_m3: optPosNum.describe("Tool density (kg/m³) — carbide ~14000, ceramic ~3900"),
  tool_specific_heat_j_kgk: optPosNum.describe("Tool specific heat (J/kg·K) — carbide ~300, ceramic ~800"),
  work_material: z.enum(["steel", "aluminum", "titanium", "stainless", "cast_iron", "inconel"]).optional(),
  tool_material: z.enum(["carbide", "ceramic", "hss", "cbn", "pcd"]).optional(),
  coolant_mode: z.enum(["flood", "mist", "mql", "cryogenic_ln2", "cryogenic_lco2", "through_tool", "dry"]).optional(),
}).passthrough().describe("Predict cutting zone temperatures using Trigger-Chao shear plane and Jaeger interface models");

const mill_wear_predict = z.object({
  ...millContext,
  tool_substrate: z.enum(["carbide", "cbn", "ceramic", "hss", "pcd", "cermet"]).optional().describe("Tool material for Taylor constants"),
  work_material: z.enum(["steel", "aluminum", "titanium", "stainless", "cast_iron", "inconel"]).optional().describe("Workpiece material"),
  current_flank_wear_mm: z.number().min(0).max(1).optional().describe("Current flank wear VB (mm) — for remaining life calculation"),
  max_flank_wear_mm: z.number().min(0.1).max(1).optional().describe("Maximum allowable flank wear VB_max (mm) — typically 0.3 for carbide"),
  cutting_time_min: optPosNum.describe("Accumulated cutting time (min) — for wear progression tracking"),
  target_tool_life_min: optPosNum.describe("Target tool life (min) — for speed optimization"),
}).passthrough().describe("Predict tool wear and life using Taylor equation V×T^n = C with feed/depth corrections");

const mill_deflection_check = z.object({
  tool_diameter_mm: posNum.describe("Tool diameter (mm)"),
  tool_overhang_mm: posNum.describe("Tool stickout from holder face (mm)"),
  cutting_force_n: posNum.describe("Cutting force perpendicular to tool axis (N) — from Kienzle Fc"),
  force_direction: z.enum(["radial", "axial", "resultant"]).optional().describe("Force direction (default: radial)"),
  tool_material: toolMaterialType.optional().describe("Tool material for E modulus (default: carbide 600 GPa)"),
  holder_diameter_mm: optPosNum.describe("Holder diameter for stepped shaft model (mm)"),
  holder_length_mm: optPosNum.describe("Holder unsupported length (mm)"),
  flute_count: z.number().int().min(1).max(12).optional().describe("Number of flutes (reduces effective I)"),
  helix_angle_deg: z.number().min(0).max(60).optional().describe("Helix angle for axial force component (°)"),
  tolerance_target_mm: optPosNum.describe("Part tolerance for pass/fail evaluation (mm)"),
}).passthrough().describe("Calculate tool deflection using Euler-Bernoulli cantilever beam model");

const mill_surface_predict = z.object({
  ...millContext,
  target_ra_um: optPosNum.describe("Target surface roughness Ra (µm) — 0.4 fine, 1.6 standard, 3.2 rough"),
  tool_type: z.enum(["flat", "ball", "barrel", "bull_nose"]).optional().describe("Endmill type — affects scallop height model"),
  corner_radius_mm: optPosNum.describe("Corner radius for bull_nose (mm)"),
  edge_radius_um: z.number().min(1).max(100).optional().describe("Cutting edge radius (µm) — typically 5-20"),
  stepover_mm: optPosNum.describe("Stepover/radial depth ae (mm) — determines scallop height"),
  algorithm: z.enum(["HRAF", "CFSF", "PTDC", "HBCF", "MACS", "TGAR", "VCER", "MTHZD"]).optional()
    .describe("CAM algorithm affecting finish: HRAF (harmonic resonance), CFSF (constant force), PTDC (deflection comp), HBCF (barrel cutter)"),
  coolant: z.enum(["dry", "flood", "mist", "mql", "cryogenic"]).optional().describe("Coolant mode — affects surface quality"),
  segments: z.array(z.object({
    x: z.number(), y: z.number(), z: z.number(),
    ae_mm: z.number().positive(),
    ap_mm: z.number().positive(),
    rpm: z.number().positive(),
    feed_mmmin: z.number().positive(),
    fz_mm: z.number().positive().optional(),
  })).optional().describe("Toolpath segments for per-point finish prediction"),
  tool: z.object({
    type: z.enum(["flat", "ball", "barrel", "bull_nose"]),
    diameter_mm: z.number().positive(),
    corner_radius_mm: z.number().positive().optional(),
    barrel_radius_mm: z.number().positive().optional(),
    edge_radius_um: z.number().positive().optional(),
    flute_count: z.number().int().min(1).max(12).optional(),
  }).optional().describe("Full tool specification for multi-segment analysis"),
}).passthrough().describe("Predict surface finish using Brammertz kinematic roughness + scallop + waviness models");

// ============================================================================
// STRATEGY + PROGRAM LAYER — print-to-program + sequencing
// ============================================================================

const mill_strategy_recommend = z.object({
  ...millContext,
  features: z.array(z.string()).optional().describe("Detected feature list (pockets, holes, bosses, contours)"),
  tolerance_um: optPosNum,
  finish_ra_um: optPosNum,
}).passthrough();

const mill_sequence_optimize = z.object({
  ...millContext,
  operations: z.array(z.object({
    id: z.string(),
    type: operation,
    tool_id: optStr,
    feature_id: optStr,
  })).min(1),
  objective: z.enum(["cycle_time", "tool_changes", "setups", "total_cost"]).default("total_cost"),
}).passthrough();

const mill_cycle_time_estimate = z.object({
  ...millContext,
  toolpath_length_mm: posNum,
  air_cut_mm: optPosNum,
}).passthrough();

const mill_toolpath_validate = z.object({
  ...millContext,
  toolpath_file: optStr.describe("Path to G-code or toolpath artifact"),
}).passthrough();

// ============================================================================
// MACHINE + FIXTURE + HOLDER LAYER
// ============================================================================

const mill_machine_select = z.object({
  ...millContext,
  part_envelope_mm: z.object({ x: posNum, y: posNum, z: posNum }).optional(),
  tolerance_um: optPosNum,
  deadline_hours: optPosNum,
  cost_target_usd: optPosNum,
  shop_fleet: z.array(z.string()).optional().describe("Machine IDs under consideration"),
}).passthrough();

const mill_capability_exploit = z.object({
  ...millContext,
  machine_id: z.string().describe("Selected machine (from mill_machine_select)"),
  planned_ops: z.array(z.string()).min(1),
}).passthrough();

const mill_tool_holder_pair = z.object({
  ...millContext,
  toolpath_type: operation,
  stickout_mm: posNum,
  spindle_taper: z.enum(["CAT40", "CAT50", "BT30", "BT40", "BT50", "HSK-A63", "HSK-A100", "HSK-E40", "HSK-E50", "HSK-F63", "Capto-C5", "Capto-C6", "Capto-C8"]).optional(),
  balance_grade_g: optPosNum.describe("ISO 21940-11 balance grade G-number"),
}).passthrough();

const mill_fixture_select = z.object({
  ...millContext,
  part_envelope_mm: z.object({ x: posNum, y: posNum, z: posNum }),
  clamp_force_n_max: optPosNum,
}).passthrough();

// Workholding type for vise/chuck calculations
const workholdingType = z.enum([
  "vise", "chuck_3jaw", "chuck_6jaw", "vacuum", "magnetic", "fixture_plate",
]).describe("Workholding device type");

const mill_workholding_force = z.object({
  cutting_force_n: posNum.describe("Cutting force to overcome (N) — from Kienzle Fc"),
  workholding_type: workholdingType.optional().describe("Workholding device type (default: vise)"),
  friction_coefficient: z.number().min(0.05).max(1.0).optional().describe("μ between workpiece and fixture (default by type)"),
  safety_factor: z.number().min(1.0).max(10.0).optional().describe("SF for clamping (default by type, typically 2.0–3.0)"),
  num_clamps: z.number().int().min(1).max(12).optional().describe("Number of clamp points (default: 1 for vise, 2 for plates)"),
  workpiece_mass_kg: optPosNum.describe("Workpiece mass for gravity check in vertical setups"),
}).passthrough().describe("Calculate required clamping force to hold workpiece against cutting forces");

const mill_workholding_chuck = z.object({
  cutting_force_tangential_n: posNum.describe("Tangential cutting force (Fc) in turning/facing"),
  cutting_force_radial_n: optPosNum.describe("Radial cutting force (Fr, typically 0.4×Fc)"),
  workpiece_diameter_mm: posNum.describe("Workpiece diameter at chuck grip (mm)"),
  chuck_diameter_mm: optPosNum.describe("Chuck diameter (mm) — for balance checks"),
  rpm: posNum.describe("Spindle speed (rev/min)"),
  workpiece_mass_kg: posNum.describe("Workpiece mass (kg) — critical for centrifugal force"),
  num_jaws: z.number().int().min(2).max(6).optional().describe("Number of chuck jaws (default: 3)"),
  friction_coefficient: z.number().min(0.05).max(1.0).optional().describe("μ between jaw and workpiece (default: 0.20)"),
  safety_factor: z.number().min(1.0).max(10.0).optional().describe("SF for gripping (default: 2.5)"),
}).passthrough().describe("Calculate required chuck jaw force with centrifugal derating");

// ============================================================================
// QUALITY + MEASUREMENT LAYER
// ============================================================================

const mill_setup_author = z.object({
  ...millContext,
  machine_id: z.string(),
  fixture_id: optStr,
  part_features: z.array(z.string()).optional(),
}).passthrough();

const mill_measurement_feedback = z.object({
  measured_dim_mm: z.number(),
  target_dim_mm: z.number(),
  tolerance_um: posNum,
  feature: optStr,
  material: z.string(),
  operation: operation.optional(),
}).passthrough();

const mill_offset_adjust = z.object({
  delta_mm: z.number(),
  axis: z.enum(["X", "Y", "Z", "tool_offset"]),
  operator_approved: z.boolean().describe("Operator approval gate — must be true to apply"),
}).passthrough();

const mill_probe_routine = z.object({
  ...millContext,
  feature_type: z.enum(["datum", "bore", "boss", "plane", "edge", "corner"]),
  probe_type: z.enum(["renishaw_mp10", "renishaw_op2", "renishaw_nc4", "marposs", "blum_tc52"]).optional(),
}).passthrough();

// ============================================================================
// TRIBAL + RESOURCES LAYER
// ============================================================================

const mill_tribal_search = z.object({
  material: optStr,
  operation: operation.optional(),
  machine: optStr,
  controller: optStr,
  min_confidence: z.number().min(0).max(1).optional(),
  keywords: z.array(z.string()).optional(),
}).passthrough();

const mill_resource_query = z.object({
  material: optStr,
  customer: optStr,
  machine_type: optStr,
}).passthrough();

const mill_holder_recommend = z.object({
  tool_diameter_mm: posNum,
  spindle_taper: z.string(),
  rpm: posNum,
  operation_class: z.enum(["rough", "semi", "finish"]).default("rough"),
}).passthrough();

// ============================================================================
// LEARN LAYER — P-LEARN ML/DL training pipeline (dispatchers only; engines land in P-LEARN)
// ============================================================================

const mill_learn_ingest_pdf = z.object({
  pdf_paths: z.array(z.string()).min(1).describe("PDF file paths for /pdf-learn ingestion"),
  tags: z.array(z.string()).optional(),
}).passthrough();

const mill_learn_ingest_video = z.object({
  video_urls: z.array(z.string()).min(1).describe("Video URLs for /video-learn ingestion"),
  tags: z.array(z.string()).optional(),
}).passthrough();

const mill_learn_ingest_programs = z.object({
  source: z.enum(["jm_die", "online", "custom"]).default("jm_die"),
  paths: z.array(z.string()).optional(),
}).passthrough();

const mill_learn_harmonize = z.object({
  corpus_version: optStr,
  strict_itar: z.boolean().default(true),
}).passthrough();

const mill_learn_train_model = z.object({
  model: z.enum(["gcode_lora", "strategy_recommender", "feedspeed_residual", "toolholder_pair", "measurement_predictor"]),
  dataset_version: optStr,
  hyperparams: z.record(z.string(), z.any()).optional(),
}).passthrough();

const mill_learn_eval = z.object({
  model: z.string(),
  eval_set: z.enum(["jm_die_holdout", "online_holdout", "synthetic_stress", "all"]).default("all"),
}).passthrough();

const mill_learn_deploy = z.object({
  model: z.string(),
  version: z.string(),
  gate_override: z.boolean().default(false),
}).passthrough();

const mill_learn_rollback = z.object({
  model: z.string(),
  target_version: optStr.describe("Defaults to previous if omitted"),
}).passthrough();

// ============================================================================
// P4-U01-COL3: COLLISION DETECTION ACTIONS
// ============================================================================

/** 3D point schema */
const point3d = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

/** Toolpath point with move type */
const toolpathPoint = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  move_type: z.enum(["rapid", "feed"]),
});

/** AABB bounds */
const aabbBounds = z.object({
  min: point3d,
  max: point3d,
});

/** Obstacle definition */
const obstacle = z.object({
  id: z.string(),
  bounds: aabbBounds,
  is_hard_obstacle: z.boolean().default(true),
});

/** Tool geometry for collision */
const toolGeometry = z.object({
  diameter_mm: z.number().positive(),
  flute_length_mm: z.number().positive(),
  overall_length_mm: z.number().positive(),
});

/** Holder geometry for collision */
const holderGeometry = z.object({
  holder_diameter_mm: z.number().positive(),
  holder_length_mm: z.number().positive(),
}).optional();

const mill_collision_check = z.object({
  toolpath: z.array(toolpathPoint).min(1).describe("Array of toolpath points with XYZ + move_type"),
  tool: toolGeometry.describe("Tool geometry"),
  holder: holderGeometry.describe("Optional holder geometry"),
  obstacles: z.array(obstacle).describe("Obstacles to check against"),
  safety_margin_mm: z.number().min(0).default(2.0).describe("Safety margin (mm)"),
}).passthrough();

const mill_rapid_clearance = z.object({
  rapid_points: z.array(point3d).min(1).describe("Rapid move positions"),
  obstacles: z.array(z.object({ id: z.string(), bounds: aabbBounds })).describe("Obstacles"),
  clearance_mm: z.number().min(0).default(5.0).describe("Minimum clearance above obstacles (mm)"),
}).passthrough();

const mill_adaptive_stepdown = z.object({
  tool_position: point3d.describe("Current tool TCP position"),
  tool: z.object({
    diameter_mm: z.number().positive(),
    flute_length_mm: z.number().positive(),
  }).describe("Tool geometry"),
  obstacles: z.array(z.object({ id: z.string(), bounds: aabbBounds })).describe("Obstacles"),
  programmed_doc_mm: z.number().positive().describe("Originally programmed depth of cut (mm)"),
  safety_margin_mm: z.number().min(0).default(2.0).describe("Safety margin (mm)"),
}).passthrough();

// ============================================================================
// P4-U02-DIALECT: Controller Dialect Schemas
// ============================================================================

/** Controller family enum for dialect operations */
const controllerFamily = z.enum([
  "fanuc_0i", "fanuc_16i", "fanuc_18i", "fanuc_30i", "fanuc_31i",
  "siemens_810d", "siemens_828d", "siemens_840d", "siemens_one",
  "heidenhain_tnc640", "heidenhain_tnc7",
  "haas_ngc",
  "mazak_smooth_ai", "mazak_smooth_g",
  "okuma_osp_p300", "okuma_osp_p500",
  "makino_pro5", "makino_pro6",
  "brother_speedio",
  "mitsubishi_m80",
  "hurco_max5",
  "generic_fanuc", "generic_iso",
]);

const mill_dialect_get = z.object({
  controller: controllerFamily.describe("Controller family to get dialect for"),
}).passthrough();

const mill_dialect_list = z.object({}).passthrough();

const mill_dialect_translate = z.object({
  cycle: z.string().describe("G-code cycle to translate (e.g., 'G81', 'CYCLE81')"),
  from_controller: controllerFamily.describe("Source controller family"),
  to_controller: controllerFamily.describe("Target controller family"),
}).passthrough();

const mill_dialect_validate = z.object({
  controller: controllerFamily.describe("Controller family for validation"),
  line: z.string().describe("G-code line to validate"),
}).passthrough();

const mill_dialect_features = z.object({
  controller: controllerFamily.describe("Controller family"),
  operation_type: z.enum(["roughing", "semi_finishing", "finishing"]).describe("Operation type"),
}).passthrough();

// ============================================================================
// P4-U03-MACHDB: JM Die Machine Database Schemas
// ============================================================================

/** Machine type classification */
const machineType = z.enum([
  "lathe", "vmc", "mill_turn", "wire_edm", "sinker_edm",
  "5axis", "grinder", "saw", "manual_lathe",
]);

const mill_machine_db_get = z.object({
  machine_id: z.string().describe("Machine ID (e.g., 'haas-umc-750', 'okuma-genos-l300')"),
}).passthrough();

const mill_machine_db_list = z.object({}).passthrough();

const mill_machine_db_filter = z.object({
  filter_type: z.enum(["type", "oem"]).describe("Filter field"),
  filter_value: z.string().describe("Filter value (e.g., 'vmc', 'Haas', '5axis', 'Okuma')"),
}).passthrough();

const mill_machine_db_mills = z.object({}).passthrough();

const mill_machine_db_capabilities = z.object({
  machine_id: z.string().describe("Machine ID to get capabilities for"),
}).passthrough();

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/** Mill dispatcher action → Zod schema map. */
export const MILL_ACTION_SCHEMAS: ActionSchemaMap = {
  // Facade routing
  mill_orchestrate,
  mill_quick,
  mill_scientific,
  mill_agi,
  mill_validate,
  mill_wisdom,
  mill_print_to_program,
  // Facade meta
  mill_routing_map,
  mill_self_awareness,
  mill_coordinated_stats,
  // AI layer
  mill_agi_reason,
  mill_agi_counterfactual,
  mill_agi_explain,
  mill_meta_adapt,
  mill_rl_recommend,
  // Scientific layer
  mill_physics_analyze,
  mill_force_kienzle,
  mill_chatter_sld,
  mill_thermal_predict,
  mill_wear_predict,
  mill_deflection_check,
  mill_surface_predict,
  // Strategy + program
  mill_strategy_recommend,
  mill_sequence_optimize,
  mill_cycle_time_estimate,
  mill_toolpath_validate,
  // Machine + fixture + holder
  mill_machine_select,
  mill_capability_exploit,
  mill_tool_holder_pair,
  mill_fixture_select,
  mill_workholding_force,
  mill_workholding_chuck,
  // Quality + measurement
  mill_setup_author,
  mill_measurement_feedback,
  mill_offset_adjust,
  mill_probe_routine,
  // Tribal + resources
  mill_tribal_search,
  mill_resource_query,
  mill_holder_recommend,
  // Learn layer
  mill_learn_ingest_pdf,
  mill_learn_ingest_video,
  mill_learn_ingest_programs,
  mill_learn_harmonize,
  mill_learn_train_model,
  mill_learn_eval,
  mill_learn_deploy,
  mill_learn_rollback,
  // P4-U01-COL3: Collision detection
  mill_collision_check,
  mill_rapid_clearance,
  mill_adaptive_stepdown,
  // P4-U02-DIALECT: Controller dialect reconciliation
  mill_dialect_get,
  mill_dialect_list,
  mill_dialect_translate,
  mill_dialect_validate,
  mill_dialect_features,
  // P4-U03-MACHDB: JM Die machine database
  mill_machine_db_get,
  mill_machine_db_list,
  mill_machine_db_filter,
  mill_machine_db_mills,
  mill_machine_db_capabilities,
};
