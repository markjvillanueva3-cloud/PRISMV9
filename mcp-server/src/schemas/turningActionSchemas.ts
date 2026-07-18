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
// live_tool_plan — LatheLiveToolingPlannerEngine (FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-LIVE-TOOLING)
// SDK-boundary contract; the engine's own zod is the authoritative validator.
// ============================================================================

const live_tool_plan = z.object({
  operation: z
    .enum(["cross_drilling", "cross_tapping", "c_axis_milling", "y_axis_milling"])
    .describe("Driven-tooling operation class to plan"),
  tool: z
    .object({ diameter: posNum })
    .passthrough()
    .describe("Live-tool spec (diameter required; rpm/feedRate optional)"),
  stock: z.object({}).passthrough().optional().describe("Bar/billet stock"),
  hole: z
    .object({})
    .passthrough()
    .optional()
    .describe("Cross-drill hole geometry"),
  feature: z
    .object({})
    .passthrough()
    .optional()
    .describe("C-axis / Y-axis feature geometry"),
  machineConfig: z
    .object({})
    .passthrough()
    .optional()
    .describe("Machine envelope flags (hasYAxis etc.)"),
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

// WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheShopAwareOptimizationEngine
const lathe_shop_optimize_program = z.object({
  content: z.string().min(1).describe("Lathe G-code program text to optimize."),
  filepath: z.string().min(1).describe("Source filepath (used for tracking + diagnostics)."),
}).passthrough().describe("Optimize a single lathe program using JM Die shop configuration (machine selection, tooling, tribal knowledge, safety, cycle time).");

const lathe_shop_optimize_customer = z.object({
  programs: z.array(z.object({
    content: z.string().min(1).describe("Program G-code text."),
    filepath: z.string().min(1).describe("Source filepath."),
  })).min(1).describe("Array of programs to batch-optimize."),
}).passthrough().describe("Batch-optimize all programs from a customer with aggregate summary (avg scores, total improvement, safety fixes, cycle-time savings).");

// U-LATHE-PROG-OPT-WIRE: expose LatheProgramOptimizerEngine upgrade surfaces
// (analyze was already wired as lathe_program_analyze — these complete the trio)
const lathe_program_optimize = z.object({
  content: z.string().min(1).describe("Lathe G-code program text to upgrade in place (returns the upgraded text + line-by-line change log + before/after metrics)."),
  file_path: z.string().optional().describe("Optional file path for context extraction (material inference from CAM header, program-number recovery)."),
}).passthrough().describe("Generate an upgraded version of a JM Die lathe program with all auto-fixable issues applied (missing G50, excessive cutoff feed, missing M30, missing coolant, point-to-point → canned cycle, etc.). Returns OptimizedProgram with original, optimized, changes[], metrics, and per-line patches.");

const lathe_program_estimate = z.object({
  content: z.string().min(1).describe("Lathe G-code program text to estimate improvement for (cheaper than full generate; surfaces top issues + projected % gain before committing to the upgrade)."),
  file_path: z.string().optional().describe("Optional file path for context (material/program number recovery)."),
}).passthrough().describe("Pre-upgrade improvement estimate: projected score gain, cycle-time reduction %, tool-life improvement %, issue breakdown by severity, top issues by impact. Returns ImprovementEstimate without rewriting the program.");

// U-WIRE-LATHE-BIRDNEST: chip-wrap risk prediction (LATHE-PRO-MS7) — surfaces bird's-nest risk + ranked mitigations + safety notes
const lathe_bird_nest_predict = z.object({
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO group (P=steel, M=stainless, K=cast iron, N=aluminum, S=superalloy, H=hardened) — sets default ductility."),
  ductility: z.enum(["low", "medium", "high", "very_high"]).optional().describe("Explicit ductility override — wins over iso-group default if set."),
  vc_m_min: z.number().positive().describe("Cutting speed in m/min."),
  feed_mm_rev: z.number().positive().describe("Feed per revolution in mm — higher feed shortens chips."),
  doc_mm: z.number().positive().describe("Depth of cut in mm."),
  clearance_length_mm: z.number().positive().describe("Length clearance between chuck face and tailstock (or part end), mm."),
  length_over_diameter: z.number().positive().describe("Part L/D ratio — slender parts wrap more."),
  lead_angle_deg: z.number().optional().describe("Insert lead angle in degrees (0 = straight, 90 = right angle)."),
  chipbreaker: z.enum(["flat", "light", "medium", "aggressive"]).describe("Chipbreaker geometry class on the insert."),
  coolant: z.enum(["dry", "mist", "flood", "hpc", "tsc"]).describe("Coolant delivery method — TSC/HPC dramatically reduces wrap risk."),
  inverted_mounting: z.boolean().optional().describe("True for rear-facing / upside-down mounted tool — chips fall by gravity."),
}).passthrough().describe("Predict bird's-nest chip-wrap risk on a turning operation. Returns risk_score (0..1), risk_level (low/moderate/high/severe), predicted_chip_length_mm, factor breakdown, reasoning[], ranked mitigations[], and severity-tiered safety_notes[].");

const lathe_bird_nest_stats = z.object({}).passthrough().describe("Read bird's-nest predictor model metadata (model description + factor list + risk levels). No input.");

// U-WIRE-LATHE-PARTING-CLEAR: parting-off chip-clearance + coolant-jet evaluation (LATHE-PRO-MS7)
const lathe_parting_clearance_evaluate = z.object({
  blade_width_mm: z.number().positive().describe("Parting blade or grooving insert kerf width, mm."),
  slot_depth_mm: z.number().positive().describe("Slot depth from OD to bottom, mm. For full parting this is OD/2."),
  bar_od_mm: z.number().positive().describe("Bar OD at the parting plane, mm."),
  feed_mm_rev: z.number().positive().describe("Feed per revolution, mm/rev."),
  vc_m_min: z.number().positive().describe("Cutting speed at OD, m/min."),
  coolant_pressure_bar: z.number().nonnegative().describe("Coolant pressure at the nozzle, bar. Zero = dry."),
  nozzle_diameter_mm: z.number().positive().optional().describe("Nozzle orifice diameter, mm (default 2.5)."),
  coolant_targeted: z.boolean().optional().describe("True if coolant is aimed axially into the slot (coherent jet) vs generic flood."),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO group — affects chip stickiness (M/N/S are higher risk)."),
  peck_depth_mm: z.number().positive().optional().describe("Existing peck depth if any, mm. Omit for continuous-feed evaluation."),
}).passthrough().describe("Evaluate parting / deep-grooving chip-clearance + coolant-jet reach. Returns verdict (safe/marginal/high_risk/unsafe), aspect_ratio, coolant_reach_mm + coolant_adequate, recommended peck cycle (depth × count × dwell), chip volume per peck, risk_factors[], recommendations[], and projected extra cycle time from pecking.");

const lathe_parting_clearance_stats = z.object({}).passthrough().describe("Read parting chip-clearance model metadata (model + ISO groups + formulas). No input.");

// U-WIRE-LATHE-PART-COST: 7-bucket cost-per-part model (LATHE-PRO-MS10)
const lathe_part_cost_compute = z.object({
  cycle_time_s: z.number().nonnegative().describe("Total per-piece cycle time, seconds."),
  machine_rate_per_hr: z.number().nonnegative().describe("Loaded machine rate, dollars per hour."),
  operations: z.array(z.object({
    op: z.string().min(1).describe("Operation identifier (e.g. rough_turn, finish_turn, face, thread)."),
    cycle_time_s: z.number().nonnegative().describe("Cycle-time contribution of this operation, seconds."),
    tool_life_s: z.number().positive().describe("Expected tool life on the active insert/edge, seconds."),
    insert_cost: z.number().nonnegative().describe("Cost per insert (whole insert, not per edge)."),
    edges_per_insert: z.number().int().positive().describe("Usable cutting edges per insert (e.g. 4 for CNMG)."),
    holder_amort_per_edge: z.number().nonnegative().optional().describe("Optional holder amortization charged per edge."),
  }).passthrough()).describe("Per-operation tool-cost inputs — tool bucket is summed across these."),
  part_mass_kg: z.number().nonnegative().describe("Finished part mass, kg."),
  waste_mass_kg: z.number().nonnegative().describe("Remnant + chip + scrap-allowance mass, kg."),
  material_price_per_kg: z.number().nonnegative().describe("Stock material price per kg."),
  setup_time_s: z.number().nonnegative().describe("First-piece setup time, seconds (amortized over batch_size)."),
  setup_rate_per_hr: z.number().nonnegative().describe("Setup labor rate, dollars per hour (may differ from run rate)."),
  batch_size: z.number().int().positive().describe("Batch size for setup-cost amortization. Must be >= 1."),
  scrap_rate: z.number().min(0).max(1).optional().describe("Scrap-rate fraction 0..1 (default 0.02 for proven, ~0.10 for new)."),
  spindle_power_kw: z.number().nonnegative().optional().describe("Average spindle power during cut, kW (for energy bucket)."),
  energy_price_per_kwh: z.number().nonnegative().optional().describe("Energy price, dollars per kWh."),
  secondary_ops: z.array(z.object({
    name: z.string().min(1).describe("Secondary op name (deburr, wash, inspect, heat-treat)."),
    cost: z.number().nonnegative().describe("Per-piece cost of this secondary op."),
  })).optional().describe("Optional named secondary operations."),
}).passthrough().describe("Compute the 7-bucket per-part cost decomposition for a lathe/turning operation: machine + tool (per-op amortized) + material + setup (batch-amortized) + quality (scrap loss) + energy + secondary. Returns buckets, total_cost, total_cost_with_scrap_amortized, per_op_tool_cost, breakdown_pct[], reasoning[].");

const lathe_part_cost_stats = z.object({}).passthrough().describe("Read 7-bucket cost-model metadata (bucket list + canonical references). No input.");

// U-WIRE-LATHE-SUBSPINDLE-PURGE: sub-spindle transfer purge timing (LATHE-PRO-MS7 — Citizen/Tsugami/Okuma LT/Mazak Multiplex)
const lathe_subspindle_purge_plan = z.object({
  main_rpm: z.number().nonnegative().describe("Main spindle rpm at the moment of transfer request."),
  decel_rps2: z.number().positive().optional().describe("Maximum spindle deceleration in revolutions per second squared (default 50, typical 30-80 for lathes)."),
  transfer_length_mm: z.number().positive().describe("Part length at transfer in mm."),
  transfer_diameter_mm: z.number().positive().describe("Part diameter at the transfer face in mm."),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO group — M/N are sticky and add air-blast time."),
  coolant_pressure_bar: z.number().nonnegative().describe("Coolant pressure during cut (bar) — higher pressure requires longer coolant-off lead."),
  air_blast_available: z.boolean().describe("Whether an air-blast line is available for chip purge."),
  air_blast_pressure_bar: z.number().positive().optional().describe("Air-blast pressure in bar, if available."),
  synchronous_transfer: z.boolean().optional().describe("True if the controller supports phase-matched synchronous transfer (faster approach)."),
  controller: z.enum(["okuma_osp", "fanuc", "mazatrol", "siemens", "citizen_l20", "generic"]).optional().describe("Controller family — affects emitted M-code hints in each phase."),
}).passthrough().describe("Plan a sub-spindle (twin-spindle / Swiss) part-transfer purge sequence. Returns phases[] (coolant_off, air_blast, decel, approach, chuck_release, transfer_grip, verify) with per-phase duration_sec + M-code hints, contamination_risk classification (low/moderate/high), total_transfer_time_sec, and operator-facing recommendations.");

const lathe_subspindle_purge_stats = z.object({}).passthrough().describe("Read sub-spindle transfer purge model metadata (phases modeled + supported controllers). No input.");

// U-WIRE-LATHE-OP-TIME-BREAKDOWN: detailed per-op time decomposition (LATHE-PRO-MS5)
const lathe_op_time_compute = z.object({
  cut_length_mm: z.number().positive().describe("Total material-removal length across all features in this op, mm."),
  feed_mm_min: z.number().positive().describe("Average feed rate across the op, mm/min."),
  pass_count: z.number().int().positive().optional().describe("Number of ap passes (roughing + finishing). Default 1."),
  rapid_travel_mm: z.number().nonnegative().optional().describe("Total rapid travel in this op, mm. Default = 0.4 × cut_length."),
  rapid_feed_mm_min: z.number().positive().optional().describe("Rapid velocity in mm/min. Default 30000."),
  tool_changes: z.number().int().nonnegative().optional().describe("Number of tool changes in this op. Default 0."),
  tool_change_sec: z.number().nonnegative().optional().describe("Seconds per tool-change indexer cycle. Default 4."),
  thread_cycles: z.number().int().nonnegative().optional().describe("Thread cycles (G92/G76). Default 0."),
  thread_cycle_sec: z.number().nonnegative().optional().describe("Seconds per thread-cycle overhead. Default 2."),
  probe_sequences: z.number().int().nonnegative().optional().describe("Number of probing sequences. Default 0."),
  probe_sec_each: z.number().nonnegative().optional().describe("Seconds per probing sequence. Default 8."),
  chip_pause_interval_sec: z.number().nonnegative().optional().describe("Periodic chip-conveyor pause interval, seconds. 0 = disabled (default)."),
  chip_pause_duration_sec: z.number().nonnegative().optional().describe("Chip-conveyor pause duration, seconds. Default 3."),
  spindle_rpm: z.number().nonnegative().optional().describe("Spindle speed RPM (for ramp time)."),
  spindle_accel_rps2: z.number().positive().optional().describe("Spindle acceleration in rev/s². Default 150."),
  load_unload_sec: z.number().nonnegative().optional().describe("Load/unload seconds (operator or bar-feeder). Default 15."),
  fixed_overhead_sec: z.number().nonnegative().optional().describe("Fixed op overhead (program header, M30). Default 5."),
}).passthrough().describe("Decompose a lathe operation into 9 time buckets (cutting / air_rapid / tool_change / thread / probe / chip_conveyor_pause / spindle_ramp / load_unload / fixed_overhead) with productive_fraction + bottleneck + breakdown_pct + advisory notes[].");

const lathe_op_time_aggregate = z.object({
  ops: z.array(z.object({
    cutting_sec: z.number().nonnegative(),
    air_rapid_sec: z.number().nonnegative(),
    tool_change_sec: z.number().nonnegative(),
    thread_sec: z.number().nonnegative(),
    probe_sec: z.number().nonnegative(),
    chip_conveyor_pause_sec: z.number().nonnegative(),
    spindle_start_stop_sec: z.number().nonnegative(),
    load_unload_sec: z.number().nonnegative(),
    fixed_overhead_sec: z.number().nonnegative(),
    total_sec: z.number().nonnegative(),
    productive_fraction: z.number().min(0).max(1),
    breakdown_pct: z.record(z.string(), z.number()),
    bottleneck: z.string(),
    notes: z.array(z.string()),
  }).passthrough()).min(1).describe("Array of per-op time breakdowns (from lathe_op_time_compute)."),
  lot_size: z.number().int().positive().describe("Number of pieces in the lot — total = per-piece × lot_size."),
}).passthrough().describe("Aggregate multiple op breakdowns into a per-piece + lot-total + lot-hours run-time estimate.");

const lathe_op_time_stats = z.object({}).passthrough().describe("Read op-time breakdown model metadata (bucket list + canonical defaults). No input.");

// U-WIRE-LATHE-REPLAY-FRAME: block-by-block replay frame compiler (LATHE-PRO-MS12)
const lathe_replay_frame_compile = z.object({
  program_id: z.string().min(1).describe("Source NC program identifier for the replay sequence."),
  blocks: z.array(z.object({
    n: z.number().int().nonnegative().describe("NC block N-number."),
    x_mm: z.number().describe("Tool-tip X position in mm at end of this block."),
    z_mm: z.number().describe("Tool-tip Z position in mm at end of this block."),
    elapsed_seconds_delta: z.number().nonnegative().describe("Elapsed seconds added by this block (>=0)."),
    swept_delta_r_mm: z.number().nonnegative().optional().describe("Swept radial chip volume delta, mm — optional for highlight shading."),
    swept_delta_z_mm: z.number().nonnegative().optional().describe("Swept axial chip volume delta, mm — optional for highlight shading."),
    breach_component: z.enum(["chuck", "tailstock", "steady_rest", "x_limit", "z_limit"]).optional().describe("Component the toolpath breached in this block (if any) — sets breach_flag on the frame."),
    caption: z.string().optional().describe("Operator-facing caption override; default is auto-built from N/XZ/elapsed/breach."),
  }).passthrough()).min(1).describe("Per-block end-state inputs ordered by execution time."),
  fps: z.number().int().positive().max(240).optional().describe("Frame-rate cap (frames per second). Default 30."),
}).passthrough().describe("Compile a sequence of front-end replay frames for block-by-block lathe NC viewer. Returns frames[] with cumulative_seconds + breach_flag, breach_frame_indices[] punch-list, and total_seconds. Pure data marshalling — no rendering.");

const lathe_replay_frame_stats = z.object({}).passthrough().describe("Read replay-frame compiler metadata (reference). No input.");

// U-WIRE-LATHE-PART-CLASSIFIER: 15-family part classifier (LATHE-PRO-MS3)
const LATHE_PART_FAMILY_ENUM = z.enum([
  "shaft", "flange", "disc", "sleeve", "bushing", "pulley", "coupling", "hub",
  "spacer", "cap", "plug", "nipple", "forging_blank", "casting_blank", "tube_hollow",
]);

const _partGeometryInputShape = z.object({
  length_mm: z.number().positive().describe("Overall part length in mm."),
  max_od_mm: z.number().positive().describe("Maximum OD in mm."),
  min_od_mm: z.number().nonnegative().optional().describe("Minimum OD in mm (0 if no step-down)."),
  bore_id_mm: z.number().nonnegative().optional().describe("Through-bore diameter in mm (0 / undefined if solid)."),
  wall_thickness_mm: z.number().nonnegative().optional().describe("Minimum wall thickness in mm — computed from OD/ID if omitted."),
  stock_form: z.enum(["bar", "forging", "casting", "hex_bar", "tube", "pre_machined"]).optional(),
  features: z.array(z.string()).optional().describe("Feature-signature keywords (e.g. 'keyway', 'thread', 'bolt_circle')."),
  tightest_tolerance_mm: z.number().positive().optional(),
  has_bolt_circle: z.boolean().optional(),
  has_keyway: z.boolean().optional(),
  has_threads: z.boolean().optional(),
  has_grooves: z.boolean().optional(),
  od_step_count: z.number().int().nonnegative().optional(),
  blind_bore: z.boolean().optional(),
  threaded_both_ends: z.boolean().optional(),
  iso_group: z.string().optional(),
}).passthrough();

const lathe_part_classify = _partGeometryInputShape.describe("Classify a turned part into one of 15 families (shaft/flange/disc/sleeve/bushing/pulley/coupling/hub/spacer/cap/plug/nipple/forging_blank/casting_blank/tube_hollow). Returns family + confidence + workholding default + roughing cycle + sequence_template + thermal_approach + thin_wall_risk + secondary_families.");

const lathe_part_classify_batch = z.object({
  parts: z.array(_partGeometryInputShape).min(1).describe("Array of part-geometry inputs to classify in one call."),
}).passthrough().describe("Bulk-classify N parts and return N ClassificationResult entries in input order.");

const lathe_part_family_profile = z.object({
  family: LATHE_PART_FAMILY_ENUM.describe("Family name to look up — one of the 15 enum values."),
}).passthrough().describe("Return the full FamilyProfile (workholding, roughing cycle, sequence template, thermal approach, thin-wall risk flag) for a named family.");

const lathe_part_family_list = z.object({}).passthrough().describe("List all 15 lathe part families with their canonical workholding + roughing-cycle defaults. No input.");

// U-WIRE-LATHE-PROG-COST: programming cost model (LATHE-AWARE-HARDEN-MS11)
const PROGRAMMING_STYLE_ENUM = z.enum(["macro", "hardcode", "cam", "conversational"]);
const PART_COMPLEXITY_ENUM = z.enum(["simple", "moderate", "complex", "very_complex"]);
const PROGRAMMING_COST_OPTIONS = z.object({
  profile_id: z.string().optional(),
  cam_seat_cost_per_hr: z.number().nonnegative().optional(),
  programmer_rate_per_hr: z.number().nonnegative().optional(),
  machine_rate_per_hr: z.number().nonnegative().optional(),
  setup_rate_per_hr: z.number().nonnegative().optional(),
  feature_surcharge_pct: z.number().nonnegative().optional(),
}).passthrough();

const lathe_programming_cost_estimate = z.object({
  style: PROGRAMMING_STYLE_ENUM.describe("Programming style — macro (parametric), hardcode (line-by-line), cam (CAM-package), conversational (controller-driven)."),
  complexity: PART_COMPLEXITY_ENUM.describe("Part complexity tier."),
  lot_size: z.number().int().positive().describe("Number of parts in the lot (>= 1)."),
  options: PROGRAMMING_COST_OPTIONS.optional().describe("Optional rate overrides + shop-profile selection."),
}).passthrough().describe("Estimate programming + setup + cycle + CAM-seat costs for one (style, complexity, lot) combination. Returns bucket breakdown + total + per-part + rate-assumptions for traceability.");

const lathe_programming_cost_compare = z.object({
  controller: z.string().optional().describe("Controller hint (e.g. okuma_osp, fanuc) — passed through to the style selector."),
  part_complexity: PART_COMPLEXITY_ENUM.describe("Part complexity tier."),
  lot_size: z.number().int().positive().describe("Number of parts in the lot."),
  has_threading: z.boolean().optional(),
  has_live_tooling: z.boolean().optional(),
  requires_5axis: z.boolean().optional(),
  available_cam_seats: z.number().int().nonnegative().optional(),
  options: PROGRAMMING_COST_OPTIONS.optional(),
}).passthrough().describe("Compare all 4 programming styles for a part spec — returns ranked array with per-style cost + per-part cost + applicability notes.");

const lathe_programming_cost_breakeven = z.object({
  macro_investment_hr: z.number().nonnegative().describe("Extra upfront programming hours for macro vs hardcode."),
  lot_sizes: z.array(z.number().int().positive()).min(1).describe("Lot sizes to analyze (e.g. [10, 50, 100, 500])."),
  complexity: PART_COMPLEXITY_ENUM.optional().describe("Part complexity (default 'moderate')."),
  options: PROGRAMMING_COST_OPTIONS.optional(),
}).passthrough().describe("Crossover analysis — at what lot size does macro programming pay back its extra upfront investment vs hardcode? Returns per-lot cost delta + break-even point + recommendation.");

const lathe_programming_cost_stats = z.object({}).passthrough().describe("Read programming-cost-model metadata (styles supported + default CAM seat rate + shop-config status). No input.");

// U-WIRE-LATHE-PERF-SLO: production-SLO registry (LATHE-PROD-READY-MS0)
const LATHE_SLO_METRIC_ENUM = z.enum([
  "parting_cycle_time_ms",
  "program_generation_ms",
  "first_piece_approval_min",
  "tool_change_ms",
  "setup_sheet_render_ms",
  "simulation_completion_ms",
  "collision_check_ms",
  "feed_override_latency_ms",
]);
const SLO_TARGET_SCHEMA = z.object({
  metric: LATHE_SLO_METRIC_ENUM,
  percentile: z.union([z.literal(50), z.literal(90), z.literal(95), z.literal(99)]),
  threshold: z.number().nonnegative(),
  unit: z.enum(["ms", "min"]),
  window_size: z.number().int().positive(),
  min_samples: z.number().int().positive(),
  description: z.string(),
  remediation: z.string(),
}).passthrough();

const lathe_slo_targets = z.object({}).passthrough().describe("List the canonical lathe production SLO targets (parting/program-gen/first-piece/tool-change/setup-sheet/sim/collision/feed-override). No input.");
const lathe_slo_get_target = z.object({ metric: LATHE_SLO_METRIC_ENUM }).passthrough().describe("Read one SLO target by metric name.");
const lathe_slo_set_target = z.object({ target: SLO_TARGET_SCHEMA }).passthrough().describe("Override an existing target or add a new one. Shop-specific tuning entrypoint.");
const lathe_slo_record_sample = z.object({ metric: LATHE_SLO_METRIC_ENUM, value: z.number().nonnegative() }).passthrough().describe("Ingest one metric sample into the rolling window for `metric`. Value units depend on the target (ms or min).");
const lathe_slo_sample_count = z.object({ metric: LATHE_SLO_METRIC_ENUM }).passthrough().describe("Current sample count in the rolling window for `metric`.");
const lathe_slo_evaluate = z.object({ metric: LATHE_SLO_METRIC_ENUM }).passthrough().describe("Compute the percentile verdict for `metric` — returns breach status, observed percentile value, sample count, and operational remediation.");
const lathe_slo_dashboard = z.object({}).passthrough().describe("Full SLO dashboard snapshot across all configured metrics. No input.");
const lathe_slo_clear_samples = z.object({ metric: LATHE_SLO_METRIC_ENUM.optional() }).passthrough().describe("Reset rolling window for `metric` (or all metrics if omitted). Diagnostic/test entrypoint.");

// U-WIRE-LATHE-LORA-SAFETY-EVAL: LoRA-output safety evaluator (LATHE-LORA-MS0)
const MACHINE_LIMITS_SCHEMA = z.object({
  max_spindle_rpm: z.number().positive(),
  max_feed_ipm: z.number().positive(),
  max_rapid_ipm: z.number().positive(),
  min_clearance_inch: z.number().nonnegative(),
  chuck_max_rpm: z.number().positive(),
}).passthrough();
const SAFETY_CONFIG_SCHEMA = z.object({
  limits: MACHINE_LIMITS_SCHEMA.optional(),
  require_g50_clamp: z.boolean().optional(),
  require_coolant_check: z.boolean().optional(),
  collision_keywords_required: z.number().int().nonnegative().optional(),
  s_x_threshold: z.number().min(0).max(1).optional(),
}).passthrough();
// SafetyEvaluation object pass-through schema — used by isSafe / summary / consumers.
const SAFETY_EVALUATION_SCHEMA = z.object({
  overall_score: z.number(),
  s_x_score: z.number(),
  spindle_safety: z.number(),
  feed_safety: z.number(),
  collision_awareness: z.number(),
  operational_safety: z.number(),
  issues: z.array(z.unknown()),
  passed: z.boolean(),
  veto_reason: z.string().optional(),
}).passthrough();

const lathe_lora_safety_evaluate = z.object({
  output: z.string().min(1).describe("LoRA-generated text / G-code to evaluate for safety compliance."),
  context: z.object({
    operation: z.string().optional().describe("Optional operation hint (e.g. parting, threading)."),
  }).passthrough().optional(),
}).passthrough().describe("Evaluate a LoRA-model output for lathe safety compliance — returns overall_score (0-100), s_x_score (0-1), per-dimension scores (spindle/feed/collision/operational), issues[] with severity, passed boolean, and veto_reason if hard veto fired.");

const lathe_lora_safety_is_safe = z.object({
  evaluation: SAFETY_EVALUATION_SCHEMA.describe("SafetyEvaluation object from a prior evaluate() call."),
}).passthrough().describe("Quick boolean check: is this SafetyEvaluation result above the configured s_x_threshold? Cheaper than re-running evaluate().");

const lathe_lora_safety_summary = z.object({
  evaluation: SAFETY_EVALUATION_SCHEMA.describe("SafetyEvaluation object from a prior evaluate() call."),
}).passthrough().describe("Produce an operator-facing text summary of a SafetyEvaluation result.");

const lathe_lora_safety_set_config = z.object({
  config: SAFETY_CONFIG_SCHEMA.describe("Partial config override — only the fields you want to change."),
}).passthrough().describe("Override the safety evaluator config (machine limits, s_x_threshold, etc.) — shop-specific tuning entrypoint.");

const lathe_lora_safety_get_config = z.object({}).passthrough().describe("Read the current safety evaluator config (machine limits + thresholds). No input.");

const lathe_lora_safety_threshold = z.object({}).passthrough().describe("Read the current S(x) threshold value (default 0.70). No input.");

// U-WIRE-LATHE-LORA-REASON-EVAL: LoRA reasoning-chain evaluator (LATHE-LORA-MS0)
const REASONING_CONFIG_SCHEMA = z.object({
  min_explanation_length: z.number().int().nonnegative().optional(),
  require_justification: z.boolean().optional(),
  require_steps: z.boolean().optional(),
  domain_term_threshold: z.number().int().nonnegative().optional(),
  passing_score: z.number().min(0).max(100).optional(),
}).passthrough();
const REASONING_EVALUATION_SCHEMA = z.object({
  overall_score: z.number(),
  coherence_score: z.number(),
  domain_score: z.number(),
  justification_score: z.number(),
  structure_score: z.number(),
  completeness_score: z.number(),
  findings: z.array(z.unknown()),
  passed: z.boolean(),
}).passthrough();

const lathe_lora_reason_evaluate = z.object({
  output: z.string().min(1).describe("LoRA-generated reasoning text to evaluate."),
}).passthrough().describe("Evaluate a LoRA reasoning output across 5 dimensions (coherence / domain / justification / structure / completeness). Returns overall_score (0-100), per-dimension scores, findings[] with quality grading, and passed boolean against the configured passing_score.");

const lathe_lora_reason_summary = z.object({
  evaluation: REASONING_EVALUATION_SCHEMA.describe("ReasoningEvaluation object from a prior evaluate() call."),
}).passthrough().describe("Produce an operator-facing text summary of a ReasoningEvaluation result.");

const lathe_lora_reason_suggestions = z.object({
  evaluation: REASONING_EVALUATION_SCHEMA.describe("ReasoningEvaluation object from a prior evaluate() call."),
}).passthrough().describe("Extract improvement-suggestion strings from a ReasoningEvaluation result (one per finding that carries a .suggestion).");

const lathe_lora_reason_set_config = z.object({
  config: REASONING_CONFIG_SCHEMA.describe("Partial config override — only the fields you want to change."),
}).passthrough().describe("Override reasoning evaluator config (min explanation length, passing score, term threshold, etc.).");

const lathe_lora_reason_get_config = z.object({}).passthrough().describe("Read the current reasoning evaluator config. No input.");

// U-WIRE-LATHE-COOLANT-ADVISOR: coolant delivery recommender (LATHE-PRO-MS5)
const lathe_coolant_advise = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO group — P steel, M stainless, K cast iron, N aluminum, S superalloy, H hardened."),
  operation: z.enum(["roughing", "finishing", "drilling", "threading", "parting", "grooving", "boring"]).describe("Lathe operation type."),
  tool_material: z.enum(["carbide", "ceramic", "cbn", "hss", "diamond"]).describe("Tool / insert material."),
  Vc_m_min: z.number().positive().optional().describe("Cutting speed in m/min — higher speeds bias toward high-pressure / cryogenic."),
  ap_mm: z.number().positive().optional().describe("Depth of cut in mm — bigger ap raises chip-control importance."),
  deep_hole: z.boolean().optional().describe("L/D > 3 deep hole drilling — boosts HPC recommendation."),
  hard_turning: z.boolean().optional().describe("Workpiece ≥ 45 HRC — biases toward dry / CBN / ceramic."),
  cryo_available: z.boolean().optional().describe("Shop has LN2 cryogenic infrastructure available."),
  sustainability_priority: z.enum(["low", "medium", "high"]).optional().describe("Shop sustainability preference — high biases toward MQL / dry."),
  thru_spindle_available: z.boolean().optional().describe("Lathe has through-spindle coolant plumbing — enables HPC."),
}).passthrough().describe("Recommend a coolant delivery mode (flood / high_pressure / mist / mql / dry / cryogenic) for a lathe operation. Returns recommendation + confidence + reasoning[] + ranked alternatives[] with applicability scores.");

const lathe_coolant_stats = z.object({}).passthrough().describe("Read coolant advisor metadata. No input.");

// U-WIRE-LATHE-CHUCK-JAW-SETUP: soft-jaw setup calculator (LATHE-PRO-MS11)
const lathe_chuck_jaw_compute = z.object({
  part_od_mm: z.number().positive().describe("Part OD to grip in mm."),
  part_od_tol_mm: z.number().nonnegative().describe("Part OD tolerance band in mm (total, +/- equally distributed)."),
  clamp_force_kn: z.number().positive().describe("Clamp force per jaw in kN at the master jaw."),
  jaw_modulus_mpa: z.number().positive().optional().describe("Jaw material elastic modulus, MPa (default 210000 for steel)."),
  jaw_contact_area_mm2: z.number().positive().optional().describe("Jaw contact area in mm² (default 300 typical soft-jaw)."),
  jaw_mass_kg: z.number().positive().describe("Jaw mass in kg (each, master + soft combined)."),
  jaw_centroid_radius_mm: z.number().positive().describe("Jaw centroid radius from spindle axis in mm."),
  chuck_rated_max_rpm: z.number().positive().describe("Chuck-rated max RPM (manufacturer spec)."),
  operating_rpm: z.number().nonnegative().describe("Intended operating RPM for the operation."),
  step_required: z.boolean().optional().describe("Step / face required (compute step bore-face depth)."),
  step_z_mm: z.number().optional().describe("Step Z reference from chuck face in mm (only used when step_required=true)."),
  use_master_pressure: z.boolean().optional().describe("Whether the jaws are bored under master pressure — recommended; warning emitted when false."),
}).passthrough().describe("Compute soft-jaw bore + grip length + centrifugal-lift safety margin for a lathe chuck setup. Returns bore_diameter, springback, min/recommended grip lengths, max_safe_rpm_balance, operating_rpm_safe boolean, warnings[] + reasoning[]. ISO 16156 + NIST SP 960-18 compliant.");

const lathe_chuck_jaw_stats = z.object({}).passthrough().describe("Read chuck-jaw setup engine metadata (canonical references). No input.");

// U-WIRE-LATHE-CSS-OPTIMIZER: CSS clamp + G96/G97 mode selector (LATHE-PRO)
const lathe_css_optimize = z.object({
  Vc_m_min: z.number().positive().describe("Target cutting velocity in m/min."),
  max_od_mm: z.number().positive().describe("Largest X diameter in the cut, mm."),
  min_od_mm: z.number().positive().describe("Smallest X diameter in the cut, mm (>0; near-centerline → triggers G50 clamp)."),
  rated_max_rpm: z.number().positive().describe("Maximum safe spindle RPM for chuck + workpiece (manufacturer rated)."),
  min_rpm: z.number().positive().optional().describe("Minimum useful RPM (default 50)."),
  cut_length_mm: z.number().nonnegative().optional().describe("Total Z-axis cut length, mm — used for cycle-time delta."),
  f_mm_rev: z.number().positive().optional().describe("Feed rate, mm/rev — used for cycle-time delta."),
}).passthrough().describe("Optimize Constant Surface Speed (G96) usage. Returns recommended G50 RPM clamp, clamp_activates_at_diameter_mm, RPM at max/min OD, true_css_fraction, clamped_fraction, prefer_g97 boolean, optional cycle-time CSS-vs-G97 delta when cut_length + feed are provided.");

const lathe_css_select_mode = z.object({
  Vc_m_min: z.number().positive(),
  diameter_mm: z.number().positive().describe("Feature diameter in mm."),
  rated_max_rpm: z.number().positive(),
  feature_length_mm: z.number().nonnegative().describe("Feature length in mm — short features (<5mm) favor G97 for simplicity."),
}).passthrough().describe("Pick G96 (CSS) vs G97 (constant RPM) for a single feature. Returns {mode, rpm, reasoning}.");

const lathe_css_stats = z.object({}).passthrough().describe("Read CSS optimizer metadata. No input.");

// U-WIRE-LATHE-LORA-REWARD-SHAPE: RL reward shaping for LoRA fine-tuning (LATHE-LORA-MS0)
// Field names mirror LatheLoRARewardShapingEngine.RewardResult (the source of truth:
// engine interface + getSummary + the convention-named companion test all use *_reasons).
// The schema MUST validate the engine's actual calculateReward() output so the
// threshold/summary actions can round-trip a result produced by the calc action.
const REWARD_RESULT_SCHEMA = z.object({
  total_reward: z.number(),
  components: z.array(z.unknown()),
  bonus_reasons: z.array(z.string()),
  penalty_reasons: z.array(z.string()),
}).passthrough();

const lathe_lora_reward_calc = z.object({
  output: z.string().min(1).describe("LoRA model output to score."),
  context: z.object({
    instruction: z.string().optional(),
    expected_type: z.string().optional(),
  }).passthrough().optional().describe("Optional instruction + expected output type hint."),
}).passthrough().describe("Calculate the shaped reward for a LoRA model output across syntax/semantics/safety/domain components. Returns RewardResult with total_reward, components[], bonus_reasons[], penalty_reasons[].");

const lathe_lora_reward_threshold = z.object({
  result: REWARD_RESULT_SCHEMA.describe("RewardResult from a prior calculateReward() call."),
  threshold: z.number().optional().describe("Threshold to check against (default 0)."),
}).passthrough().describe("Check if a reward result meets a threshold (default 0). Returns boolean.");

const lathe_lora_reward_summary = z.object({
  result: REWARD_RESULT_SCHEMA.describe("RewardResult from a prior calculateReward() call."),
}).passthrough().describe("Operator-facing text summary of a reward result.");

const lathe_lora_reward_set_config = z.object({
  config: z.object({}).passthrough().describe("Partial RewardConfig override (component weights)."),
}).passthrough().describe("Override reward shaping config (component weights, penalty strengths).");

const lathe_lora_reward_get_config = z.object({}).passthrough().describe("Read the current reward shaping config. No input.");

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

// ─── FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-TRIBAL-WIRE: lathe tribal knowledge → lathe AI bridge ─

/** Lathe machining context (InjectionContext) used to bias tribal sourcing. */
const _latheTribalContext = z.object({
  material: z.string().optional().describe("Material name (e.g. '4140 steel')."),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group."),
  operation: z.string().optional().describe("Lathe operation (e.g. 'turn_rough', 'bore')."),
  machine: z.string().optional().describe("Machine name/id."),
  controller: z.string().optional().describe("Controller/dialect."),
  customer: z.string().optional().describe("Customer name."),
  features: z.array(z.string()).optional().describe("Part feature list."),
  complexity: z
    .enum(["simple", "moderate", "complex", "very_complex"])
    .optional()
    .describe("Job complexity."),
  keywords: z.array(z.string()).optional().describe("Extra corpus-search keywords."),
}).passthrough();

const lathe_tribal_integrate = z.object({
  context: _latheTribalContext.optional().describe("Lathe machining context."),
  options: z.object({
    limitPerTarget: z.number().int().positive().optional()
      .describe("Max tips injected per target (default 5)."),
    minRelevance: z.number().min(0).max(1).optional()
      .describe("Injector relevance floor (default 0.15)."),
    includeCorpus: z.boolean().optional()
      .describe("Source tips from the tribal corpus (default true)."),
  }).passthrough().optional().describe("Injection tuning options."),
}).passthrough().describe("Source lathe tribal knowledge and inject it into the lathe AI system.");

const lathe_tribal_adjustment = z.object({
  material: z.string().min(1).describe("ISO material group (P/M/K/N/S/H) or material name."),
  operation: z.string().min(1).describe("Lathe operation (turn_rough, face, bore, thread, ...)."),
  conditions: z.object({
    overhangRatio: z.number().nonnegative().optional()
      .describe("Boring-bar/tool overhang ratio (length/diameter)."),
    partLengthDiameterRatio: z.number().nonnegative().optional()
      .describe("Unsupported part length/diameter ratio."),
    interruptedCut: z.boolean().optional().describe("True when the OD cut is interrupted."),
    insertWearVbMm: z.number().nonnegative().optional()
      .describe("Measured insert flank wear VB in millimetres."),
  }).passthrough().optional().describe("Runtime conditions that gate expert heuristics."),
}).passthrough().describe("Tribal-derived rpm/feed/doc factors for a lathe operation.");

const lathe_tribal_failure_check = z.object({
  material: z.string().optional().describe("ISO material group filter (optional)."),
  operation: z.string().optional().describe("Lathe operation filter (optional)."),
}).passthrough().describe("Look up lathe failure modes for a material/operation pair.");

const lathe_tribal_source_corpus = z.object({
  context: _latheTribalContext.optional().describe("Lathe machining context."),
}).passthrough().describe("Query the tribal corpus for lathe-relevant tips.");

const lathe_tribal_integration_stats = z.object({}).passthrough()
  .describe("Read lathe tribal-integration coverage statistics (no input).");

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

// LATHE-CAPABILITY/U-LW-C2 (slot:whiskey, 2026-07-05): WetRunStateMachineEngine
// (JM Die pilot-run finite state machine: WET_PASS/WET_SOFT_FAIL/WET_HARD_FAIL/
// QUARANTINE/RESOLVED). 14 actions surfaced — the engine was built + tested but 0-wired.
// SECURITY (scrutiny arm B P1, 2026-07-05): the engine's `now` override (test/replay) is
// deliberately NOT honored on EITHER dispatcher that wires this shared singleton — prism_turning
// (here) and prism_safety (safetyDispatcher.ts strips `now` before every FSM mutation). The
// 5-day quarantine hold and every transition timestamp use the real server clock (engine
// defaults to Date.now()), so a production caller cannot back-date quarantine_started_at on one
// surface and clear the hold early on the other. Any FUTURE wiring of this engine MUST withhold
// `now` the same way, or the cooling-off guarantee is void.
const _wetState = z.enum(["WET_PASS", "WET_SOFT_FAIL", "WET_HARD_FAIL", "QUARANTINE", "RESOLVED"]);
const _wetSafetyKind = z.enum(["kill_switch_l1", "kill_switch_l2", "collision", "workholding_slip", "spindle_overrun", "tool_breakage", "other"]);
const _wetSeverity = z.enum(["critical", "high", "medium"]);
const wet_run_start_session = z.object({
  session_id: z.string().min(1).describe("Unique pilot-run session id"),
  tenant_id: z.string().min(1).describe("Tenant/customer id"),
  part_id: z.string().min(1).describe("Part id under pilot run"),
  machine_id: z.string().min(1).describe("Machine id"),
  operator: z.string().min(1).describe("Operator name"),
}).describe("Start a wet-run pilot session in WET_PASS (WetRunStateMachineEngine.startSession).");
const wet_run_get_session = z.object({
  session_id: z.string().min(1).describe("Session id"),
}).describe("Fetch a wet-run session by id (throws if not found).");
const wet_run_list_sessions = z.object({
  state: _wetState.optional().describe("Filter by FSM state"),
  tenant_id: z.string().optional().describe("Filter by tenant"),
}).passthrough().describe("List wet-run sessions (optional state/tenant filter).");
const wet_run_record_part_outcome = z.object({
  session_id: z.string().min(1).describe("Session id"),
  passed: z.boolean().describe("Did the part pass inspection?"),
  root_cause: z.string().optional().describe("Scrap root cause (required ≥10 chars when passed=false)"),
}).describe("Record a part pass/scrap; re-evaluates the FSM (recordPartOutcome).");
const wet_run_record_safety_event = z.object({
  session_id: z.string().min(1).describe("Session id"),
  kind: _wetSafetyKind.describe("Safety event kind"),
  severity: _wetSeverity.describe("Severity"),
  detail: z.string().min(10).describe("Event detail (≥10 chars)"),
}).describe("Record a safety event — forces WET_HARD_FAIL→QUARANTINE (recordSafetyEvent).");
const wet_run_submit_post_mortem = z.object({
  session_id: z.string().min(1),
  authored_by: z.string().min(1).describe("Post-mortem author"),
  root_cause: z.string().min(20).describe("Root cause (≥20 chars)"),
  remediation: z.string().min(20).describe("Remediation (≥20 chars)"),
  corpus_patch_id: z.string().optional().describe("Optional corpus patch id"),
  approvers: z.array(z.string()).min(2).describe("≥2 distinct approver names"),
}).describe("Submit the QUARANTINE post-mortem (submitPostMortem).");
const wet_run_clear_quarantine = z.object({
  session_id: z.string().min(1),
  authorized_by: z.string().min(1).describe("Authorizer"),
  evidence: z.string().min(10).describe("Evidence (≥10 chars)"),
  runbook_completed: z.boolean().describe("Runbook completed?"),
}).describe("Clear a session from QUARANTINE (needs post-mortem + 5-day hold) (clearQuarantine).");
const wet_run_resolve_session = z.object({
  session_id: z.string().min(1),
  resolution: z.enum(["advance", "rerun", "abort"]).describe("Resolution"),
  notes: z.string().min(10).describe("Notes (≥10 chars)"),
}).describe("Resolve a non-quarantine session (resolveSession).");
const wet_run_list_transitions = z.object({
  session_id: z.string().optional(),
  since: optNum.describe("Only transitions at/after this ms"),
}).passthrough().describe("List FSM state transitions (optional session/since filter).");
const wet_run_list_scrap_events = z.object({
  session_id: z.string().optional(),
}).passthrough().describe("List scrap events (optional session filter).");
const wet_run_list_safety_events = z.object({
  session_id: z.string().optional(),
}).passthrough().describe("List safety events (optional session filter).");
const wet_run_get_post_mortem = z.object({
  session_id: z.string().min(1),
}).describe("Fetch a session's post-mortem record (null if none).");
const wet_run_list_clearances = z.object({}).passthrough().describe("List all quarantine clearances (no input).");
const wet_run_get_stats = z.object({}).passthrough().describe("Wet-run engine stats — counts by state (no input).");

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

// U-WIRE-EMA: ExpandingMandrelEngine.analyze — the DYNAMIC grip model, distinct
// from lathe_workholding_expanding_mandrel above. Keyed on actuator_force_n + rpm
// (not radial interference), and uniquely returns centrifugal_loss + max_safe_rpm.
const lathe_expanding_mandrel_analyze = z.object({
  mandrel: z.object({
    nominal_od_mm: posNum.describe("Mandrel OD when relaxed (mm, >0)."),
    expanded_od_mm: posNum.describe("Mandrel OD when fully expanded (mm, >0)."),
    grip_length_mm: posNum.describe("Length of the gripping zone (mm, >0)."),
    material: z.enum(["4140", "4340", "S7", "D2", "H13"]).describe("Mandrel body material."),
  }).describe("Mandrel geometry + material."),
  part: z.object({
    bore_id_mm: posNum.describe("Part bore ID the mandrel grips (mm, >0)."),
    material: z.string().describe("Part material (e.g. 4140, 316, 6061, Ti-6Al-4V)."),
    outer_od_mm: optPosNum.describe("Part OD (mm) — used for the centrifugal calc."),
    mass_kg: optPosNum.describe("Part mass (kg) — used for the retention-force check."),
    wall_thickness_mm: optPosNum.describe("Wall thickness at the bore (mm) — for deformation analysis."),
  }).describe("Part geometry + material."),
  actuator_force_n: posNum.describe("Applied actuator force on the draw tube (N, >0)."),
  rpm: z.number().min(0).describe("Operating spindle speed (RPM, ≥0)."),
  mu: z.number().min(0.05).max(1).optional().describe("Mandrel–bore friction coefficient (default 0.15 steel-steel dry)."),
  cutting_force_n: optPosNum.describe("Cutting force being transmitted (N) — if provided, checks capacity."),
}).passthrough().describe(
  "Expanding-mandrel dynamic grip analysis (ExpandingMandrelEngine.analyze). Actuator-force-driven grip with centrifugal de-rating; returns grip pressure, max transmitted torque, centrifugal loss, max_safe_rpm, retention force, and an ISO grips_safely verdict. Distinct from lathe_workholding_expanding_mandrel (Lame interference-fit model).",
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

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-TTW — TurningToolpathWearEngine (LATHE-PRO-MS1/U-LPR12)
// Per-toolpath-segment wear integration. Distinct from TurningWearPrediction
// (per-op Usui): this one accumulates wear along SEGMENTS with variable Vc
// driven by CSS, plus interrupted-cut shock loading and ap/nose_radius
// engagement geometry. Reference: Sandvik "CSS and tool life" + ISO 3685.
// ============================================================================

const _toolpathSegment = z.object({
  id: z.string().min(1).describe("Segment identifier (unique within the toolpath)."),
  op_type: z.enum([
    "od_rough", "od_finish", "face_rough", "face_finish",
    "bore", "groove", "thread", "cutoff",
  ]).describe("Operation type for this segment."),
  d_start_mm: z.number().nonnegative().describe("Diameter at segment START in mm (≥0)."),
  d_end_mm: z.number().nonnegative().describe("Diameter at segment END in mm (≥0). Differs from d_start for facing/tapered cuts."),
  cut_length_mm: posNum.describe("Cut length along this segment in mm (>0)."),
  ap_mm: posNum.describe("Depth of cut in mm (>0)."),
  f_mm_rev: posNum.describe("Feed per revolution in mm/rev (>0)."),
  passes: z.number().int().positive().describe("Number of passes through this segment (≥1)."),
  interrupted: z.boolean().optional().describe("True if this segment is an interrupted cut."),
  interruptions_per_rev: z.number().nonnegative().optional()
    .describe("Interruptions per revolution — drives shock-loading multiplier (1 + 0.5·min(intr/4, 1))."),
}).passthrough();

const turning_toolpath_wear = z.object({
  iso_group: _isoGroup.describe("ISO 513 material group."),
  material_name: z.string().optional().describe("Optional material name."),
  Vc_m_min: posNum
    .describe("Target CSS speed in m/min (>0) — clamped by max_rpm when CSS mode is on."),
  css_mode: z.boolean().optional()
    .describe("True if constant-surface-speed mode is active (Vc varies with diameter)."),
  max_rpm: optPosNum
    .describe("Max spindle RPM cap for CSS clamping (default 4000)."),
  nose_radius_mm: posNum
    .describe("Insert nose radius in mm (>0) — drives engagement factor (ap/nose_radius)^0.15."),
  coating: z.string().optional().describe("Insert coating identifier."),
  segments: z.array(_toolpathSegment).min(1)
    .describe("Toolpath segments in execution order (at least one)."),
}).passthrough().describe(
  "Per-segment toolpath wear integration (TurningToolpathWearEngine.accumulateWear). Returns segments[] with per-segment wear/Vc/time/life_fraction, total_wear_um (cumulative), total_life_fraction, remaining_life_min, parts_per_edge, hotspot_segment, and exceeds_vb_max boolean (true when cumulative wear breaches VB_max=300µm).",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-TRG — TurningRulesGeneratorEngine (LATHE-PRO)
// Generates structured speed/feed/DoC/spindle/chatter envelope rules. The
// generate() context is mostly optional: only `material` is required, and
// each rule family is gated by its own context field (velocity↔iso_group,
// feed/DoC↔operation, spindle↔machine_class, chatter↔tool_type) — so a
// material-only context legitimately returns zero rules. getStats() is
// zero-arg. Reference: Sandvik Coromant 2023; Machinery's Handbook 31e.
// ============================================================================

const turning_rules_generate = z.object({
  material: z.string().min(1).describe("Workpiece material name (required) — stamped into rule conditions."),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional()
    .describe("ISO 513 group — REQUIRED for velocity_envelope rules; omit and Vc rules are skipped."),
  operation: z.enum([
    "roughing", "finishing", "threading", "grooving", "parting", "drilling", "boring",
  ]).optional()
    .describe("Operation — REQUIRED for feed_envelope + doc_envelope rules; omit and they're skipped."),
  tool_type: z.string().optional()
    .describe("Tool type string — REQUIRED for chatter_constraint (L/D); body material inferred from substring (dampened/heavy_metal/carbide/steel)."),
  machine_class: z.enum(["slant_bed", "vertical", "swiss", "mill_turn"]).optional()
    .describe("Machine class — REQUIRED for spindle_constraint (RPM cap); omit and it's skipped."),
}).passthrough().describe(
  "Generate machining envelope rules (TurningRulesGeneratorEngine.generate). Returns { context, rules[] (each with bounds {min,max,unit,field}, priority 1-10, literature source), generated_at, rule_count_by_kind }. Rule families are gated by their context field — a material-only context yields zero rules by design.",
);

const turning_rules_stats = z.object({}).passthrough().describe(
  "Rule-generator capability stats (TurningRulesGeneratorEngine.getStats). Zero-arg. Returns { rule_kinds[], supported_iso_groups[], supported_operations[], rules_generated } — use for UI discovery of valid generate() context values.",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-VTC — VendorTurningCatalogExtractorEngine (U-LAT22)
// 2 pure decoders + 4 catalog-backed queries (each ensureCatalogsLoaded()-
// guarded to hydrate the dormant ~4095-insert Tungaloy+Widia catalog).
// Reference: ISO 1832 / ISO 5608 / Sandvik Turning Guide 2023-2024.
// ============================================================================

const _isoInsertShape = z.enum([
  "C", "D", "E", "H", "K", "L", "M", "O", "P", "R", "S", "T", "V", "W",
]);
const _chipbreakerType = z.enum(["finishing", "medium", "roughing", "universal"]);

const turning_iso1832_parse = z.object({
  designation: z.string().min(7)
    .describe("ISO 1832 insert designation, e.g. 'CNMG120408-PM' (min 7 chars — shape+clearance+tolerance+fixing+size)."),
}).passthrough().describe(
  "Decode an ISO 1832 insert designation (VendorTurningCatalogExtractorEngine.parseISO1832Designation). PURE — no catalog needed. Returns { iso_shape, iso_clearance, iso_tolerance, iso_fixing, ic_mm, thickness_mm, nose_radius_mm, chipbreaker, cutting_edge_count } or null when < 7 chars.",
);

const turning_chipbreaker_classify = z.object({
  code: z.string().min(1)
    .describe("Chipbreaker code, e.g. 'PM', 'MF', 'MR' — classified by lookup table."),
}).passthrough().describe(
  "Classify a chipbreaker code (VendorTurningCatalogExtractorEngine.classifyChipbreaker). PURE. Returns { chipbreaker_type: finishing | medium | roughing | universal }.",
);

const turning_vendor_insert_search = z.object({
  designation: z.string().optional().describe("Substring match on insert designation (uppercased)."),
  shape: _isoInsertShape.optional().describe("ISO 1832 shape filter."),
  ic_mm: optPosNum.describe("Inscribed-circle filter in mm (±0.5mm tolerance)."),
  nose_radius_mm: optPosNum.describe("Nose-radius filter in mm (±0.05mm tolerance)."),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO 513 material-group filter."),
  vendor: z.string().optional().describe("Vendor filter (case-insensitive)."),
  chipbreaker_type: _chipbreakerType.optional().describe("Chipbreaker-type filter."),
  limit: z.number().int().positive().optional().describe("Max results (default 50)."),
}).passthrough().describe(
  "Search the unified vendor turning-insert catalog (VendorTurningCatalogExtractorEngine.searchInserts). Hydrates the ~4095-insert Tungaloy+Widia catalog on first call (ensureCatalogsLoaded). All filters optional — an empty query returns the first `limit` inserts. Returns { inserts: TurningInsertRecord[] }.",
);

const turning_vendor_grade_recommend = z.object({
  iso_group: z.string().min(1)
    .describe("ISO 513 material group the grade must support (P/M/K/N/S/H)."),
  operation: z.enum(["finishing", "medium", "roughing"])
    .describe("Operation — roughing sorts by toughness, finishing by wear resistance."),
  vendor: z.string().optional().describe("Vendor filter (case-insensitive)."),
  substrate: z.enum(["carbide", "cermet", "ceramic", "cbn", "pcd"]).optional()
    .describe("Substrate filter."),
}).passthrough().describe(
  "Recommend insert grades for a material+operation (VendorTurningCatalogExtractorEngine.recommendGrade). Hydrates the catalog on first call. Returns { grades: TurningGradeRecord[] } sorted by toughness (roughing) or wear resistance (finishing).",
);

const turning_vendor_iso_code_resolve = z.object({
  designation: z.string().min(1)
    .describe("ISO 1832 designation to parse + match against the catalog."),
}).passthrough().describe(
  "Resolve an ISO code to parsed fields + catalog matches (VendorTurningCatalogExtractorEngine.resolveISOCode). Hydrates the catalog on first call. Returns { parsed: Partial<TurningInsertRecord> | null, matches: TurningInsertRecord[] }.",
);

const turning_vendor_catalog_stats = z.object({}).passthrough().describe(
  "Per-vendor catalog inventory (VendorTurningCatalogExtractorEngine.getStats). Hydrates the catalog on first call. Returns { vendors: [{ vendor, stats: { total_inserts, total_holders, total_grades, total_cutting_data, insert_shapes, chipbreaker_types } }] }.",
);

// ============================================================================
// WIRE-UNWIRED-MS0/U-WIRE-MOP — LatheMultiOpPlannerEngine (LATHE-PRO-MS3/U-LPS03)
// Op1/Op2 flip planning + soft-jaw boring G-code. Feature `position` drives
// access classification (chuck_end→op1, tailstock_end→op2, through→either).
// Reference: Peter Smid CNC Programming Handbook Ch. 2; Machinery's Handbook
// 31st Ed. — Workholding.
// ============================================================================

const _multiOpFeature = z.object({
  id: z.string().min(1).describe("Feature identifier (unique within the part)."),
  type: z.string().min(1).describe("Feature type label (free-form, e.g. 'od_groove', 'thru_bore')."),
  position: z.enum(["chuck_end", "tailstock_end", "middle", "through"])
    .describe("Which end the feature is on — drives Op1/Op2 access classification."),
  diameter_mm: optPosNum.describe("Nominal feature diameter in mm."),
  length_mm: optPosNum.describe("Feature length in mm."),
  tolerance_mm: optPosNum.describe("Feature tolerance in mm."),
  is_bore: z.boolean().optional().describe("True if this is a bore (drives drill/rough_bore/finish_bore ops)."),
  is_through: z.boolean().optional().describe("True if accessible from either end (classified 'either')."),
  requires_facing: z.boolean().optional().describe("True if the feature requires a facing pass."),
  has_threads: z.boolean().optional().describe("True if the feature is threaded (adds thread_od/thread_id op)."),
}).passthrough();

const lathe_multiop_plan = z.object({
  part_length_mm: posNum.describe("Part overall length in mm (>0)."),
  max_od_mm: posNum.describe("Part maximum OD in mm (>0) — grip-diameter fallback."),
  features: z.array(_multiOpFeature).min(1)
    .describe("Features to machine (at least one) — position classifies Op1 vs Op2."),
  stock_od_mm: optPosNum.describe("Stock bar diameter in mm (optional)."),
  concentricity_mm: optPosNum
    .describe("Tightest concentricity requirement in mm — <0.010 selects indicator_alignment, else soft_jaw_bore_to_od (default 0.025)."),
  iso_group: z.string().optional().describe("Material ISO group (optional)."),
  controller: z.enum(["fanuc", "okuma", "haas", "mazak", "siemens"]).optional()
    .describe("Controller dialect for the soft-jaw boring G-code (default fanuc)."),
}).passthrough().describe(
  "Plan an Op1/Op2 flip for a turned part (LatheMultiOpPlannerEngine.plan). Returns { needs_flip, reasoning[], op1, op2|null, soft_jaw_boring|null, z_transfer|null, concentricity|null, total_operations, estimated_setup_changes }. needs_flip=false when every feature is Op1-accessible.",
);

/** ProfileDeviationAnalyzerEngine.analyze input. */
const lathe_profile_deviation_analyze = z.object({
  basis: z.array(z.object({ x: z.number(), y: z.number() })).min(2)
    .describe("Nominal/CAD profile points (≥2)"),
  measured: z.array(z.object({ x: z.number(), y: z.number() })).min(2)
    .describe("Probe/measured profile points (≥2)"),
  tolerance_mm: z.number().positive().describe("Total tolerance zone width (mm)"),
  zone_type: z.enum(["bilateral", "unilateral_outside", "unilateral_inside"]).optional()
    .describe("Tolerance zone style — default bilateral"),
  best_fit: z.boolean().optional()
    .describe("Apply Y-only best-fit translation before comparison"),
});

/** ProfileDeviationAnalyzerEngine.getStats — no params. */
const lathe_profile_deviation_stats = z.object({});

// WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE: LatheProgramBacktraceEngine — 2 surfaces
/** Single block in a turning program backtrace input. */
const _backtrace_block = z.object({
  n: z.number().int().nonnegative().describe("Block N-number."),
  kind: z.enum([
    "tool_change", "offset_set", "wcs_shift", "feed_set",
    "spindle_set", "macro_call", "motion", "m_code", "comment",
  ]).describe("Block classification."),
  text: z.string().optional().describe("Raw block text (optional, for reporting)."),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional()
    .describe("Parsed params (tool_id, offset_value, feed, rpm, macro_name, ...)."),
});

/** LatheProgramBacktraceEngine.trace input. */
const lathe_backtrace_trace = z.object({
  blocks: z.array(_backtrace_block).min(1)
    .describe("Ordered block stream (at least 1)."),
  failing_block_n: z.number().int().nonnegative()
    .describe("Block N-number to backtrace from (the failing block)."),
  max_depth: z.number().int().positive().max(1000).optional()
    .describe("Max history depth to walk (default 50, cap 1000)."),
});

/** LatheProgramBacktraceEngine.getStats — no params. */
const lathe_backtrace_stats = z.object({});

// ============================================================================
// FEATURE-GAP-AUDIT-MS0/U-BRIDGE-WIRE-OKUMA — 4 unwired Okuma engines
// ============================================================================

/** OkumaMachineStepIngesterEngine.parseContent — STEP AP203/AP214/AP242 axis-frame extraction. */
const okuma_step_parse = z.object({
  content: z.string().min(1).describe("STEP file body (ISO 10303-21 — HEADER + DATA sections)."),
  source_name: z.string().optional().describe("Logical name for the source (defaults to 'in-memory')."),
}).passthrough().describe(
  "Parse a STEP CAD file and return detected machine axes + CARTESIAN_POINT/DIRECTION/AXIS2_PLACEMENT_3D counts. Okuma LB3000/LU300/Multus families.",
);

/** OkumaMacroConverterBridgeEngine.convert — Okuma OSP macro/G-code → ISO-compatible G-code. */
const okuma_macro_convert = z.object({
  source: z.string().min(1).describe("Okuma OSP source (G&M codes + macro variable definitions)."),
  python_binary: z.string().optional().describe("Override path to python interpreter for full converter."),
  converter_path: z.string().optional().describe("Override path to the Python converter script."),
}).passthrough().describe(
  "Convert Okuma OSP-dialect source program. Falls back to TS converter if Python pipeline is unavailable. Returns { converted_gcode, source_lines, output_lines, variables_resolved, warnings, runner }.",
);

/** OkumaManualTipExtractorEngine.extractFromText — text → classified tribal tips. */
const okuma_manual_tips_extract = z.object({
  text: z.string().min(1).describe("Already-extracted Okuma manual text (run /pdf-learn or pdftotext first)."),
  manual_name: z.string().optional().describe("Logical name for the source manual (used as tip source attribution)."),
}).passthrough().describe(
  "Extract warnings/tips/procedures/examples/specifications from Okuma manual text. Returns { tips[], tip_counts, sections_detected, warnings_found }.",
);

/** OkumaGosigerTranscriptMinerEngine.mineAllTranscripts — Gosiger video tribal tip mining. */
const okuma_transcript_mine = z.object({
  video_ids: z.array(z.string().min(1)).optional()
    .describe("Filter — restrict mining to these video ids. Omit to mine all configured transcripts."),
}).passthrough().describe(
  "Mine Okuma/Gosiger training-video transcripts for tribal tips. Returns { transcriptsProcessed, totalTipsExtracted, tipsByCategory, tips[], errors[] }.",
);

const lathe_softjaw_boring = z.object({
  bore_diameter_mm: posNum.describe("Target finished bore diameter in mm (>0) — clearance fit to the Op1 finished OD."),
  bore_depth_mm: posNum.describe("Bore depth in mm (>0)."),
  controller: z.enum(["fanuc", "okuma", "haas", "mazak", "siemens"]).optional()
    .describe("Controller dialect (default fanuc): Fanuc/Haas G71-G70, Okuma GROV/GFIN, Mazak G71-G70, Siemens CYCLE95."),
}).passthrough().describe(
  "Generate a standalone soft-jaw boring program (LatheMultiOpPlannerEngine.generateSoftJawBoring). Returns { bore_diameter_mm, bore_depth_mm, bore_tolerance_mm:0.025, gcode (controller-specific rough+finish bore), notes[] }.",
);

// ============================================================================
// BACKEND-DEV-LOOP/U-WIRE-LATHE-GA — LatheGeneticAlgorithmEngine schemas
// ============================================================================

const latheObjectiveSchema = z.object({
  name: z.string().min(1).describe("Objective name (e.g. mrr, surface_finish, tool_life)"),
  weight: z.number().finite().describe("Relative weight (sum of weights typically 1.0)"),
  type: z.enum(["minimize", "maximize"]).optional().describe("Optimization direction"),
}).passthrough().describe("LatheObjective for GA fitness function");

const lathe_ga_optimize_parameters = z.object({
  material: z.string().min(1).describe("Material name (resolves against CANONICAL_MATERIAL_DB)"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group override"),
  operation: z.enum(["roughing", "finishing", "threading", "grooving", "boring", "facing"]).describe("Operation type"),
  machine: z.object({
    max_spindle_rpm: z.number().positive().describe("Machine spindle RPM ceiling"),
    max_power_kw: z.number().positive().describe("Machine motor power kW"),
    max_feed_mm_rev: z.number().positive().describe("Max feed per rev mm"),
    max_rapid_mm_min: z.number().positive().describe("Max rapid travel mm/min"),
    turret_stations: z.number().int().positive().describe("Number of turret stations"),
  }).describe("Machine envelope limits"),
  tool: z.object({
    insert_grade: z.string().min(1).describe("Insert grade code (e.g. KC5010)"),
    nose_radius_mm: z.number().positive().describe("Insert nose radius mm"),
    approach_angle_deg: z.number().positive().describe("Lead angle deg"),
    max_depth_mm: z.number().positive().describe("Max DOC the tool can sustain"),
    tool_life_ref_min: z.number().positive().optional().describe("Reference tool life in minutes (default 60)"),
  }).describe("Tool specifications"),
  workpiece: z.object({
    diameter_mm: z.number().positive().describe("Workpiece diameter mm"),
    length_mm: z.number().positive().describe("Workpiece length mm"),
    stock_allowance_mm: z.number().nonnegative().describe("Material removal allowance mm"),
  }).describe("Workpiece geometry"),
  objectives: z.array(latheObjectiveSchema).min(1).describe("Optimization objectives (at least one)"),
  constraints: z.array(z.record(z.string(), z.unknown())).optional().describe("Additional LatheConstraint records"),
  config: z.record(z.string(), z.unknown()).optional().describe("Partial GA config overrides"),
}).passthrough().describe("Manufacturing-aware GA optimization input (Kienzle + Taylor fitness)");

const lathe_ga_optimize_tool_sequence = z.object({
  operations: z.array(z.object({
    name: z.string().min(1).describe("Operation name (unique key)"),
    time_min: z.number().positive().describe("Operation duration minutes"),
    tool_id: z.string().min(1).describe("Tool identifier — sequence minimizes tool changes"),
    dependencies: z.array(z.string()).optional().describe("Operation names that must complete first"),
  })).min(1).describe("Operations to sequence (min 1)"),
  config: z.record(z.string(), z.unknown()).optional().describe("Partial GA config overrides"),
}).passthrough().describe("Tool-change-aware op sequencer via GA permutation encoding");

const lathe_ga_optimize_multi_pass = z.object({
  total_stock_mm: z.number().positive().describe("Total stock to remove mm"),
  constraints: z.object({
    max_doc_mm: z.number().positive().describe("Maximum depth-of-cut per pass mm"),
    min_doc_mm: z.number().positive().describe("Minimum viable DOC per pass mm"),
    max_passes: z.number().int().positive().describe("Maximum number of passes"),
    tool_stability_factor: z.number().positive().describe("Tool stability multiplier (1.0 = baseline)"),
  }).optional().describe("Pass-distribution constraints (defaulted by dispatcher case)"),
  objectives: z.array(latheObjectiveSchema).optional().describe("Optimization objectives — defaults to cutting_time + tool_wear weighted sum"),
  config: z.record(z.string(), z.unknown()).optional().describe("Partial GA config overrides"),
}).passthrough().describe("Multi-pass DOC distribution GA optimizer (minimizes time + wear)");

// ============================================================================
// BRIDGE-WIRING/U-BRIDGE-WIRE-TURNING — 6 unwired Turning engines
// SDK-boundary contracts. Each engine throws on bad input (its own validation
// is authoritative); these Zod schemas validate the required fields for
// fail-fast and pass optional knobs through to the engine's bounds checks.
// ============================================================================

/** OpSpec — shared by envelope-distance / sensitivity / stochastic-plan. */
const turningBridgeOpSpec = z.object({
  conditions: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO 513 material group"),
    Vc_m_min: posNum.describe("Cutting speed m/min"),
    f_mm_rev: posNum.describe("Feed mm/rev"),
    ap_mm: posNum.describe("Depth of cut mm"),
  }).passthrough().describe("InsertLifeInput operating conditions"),
  duration_min: z.number().nonnegative().describe("Operation duration minutes"),
  label: z.string().optional().describe("Human-readable operation label"),
}).passthrough().describe("Turning operation spec (conditions + duration)");

/** SPTInput thread spec — shared by the 3 thread bridge engines.
 *  Mirrors devActionSchemas ttro_run thread bounds for cross-dispatcher parity. */
const turningBridgeThreadSpec = z.object({
  thread_form: z.enum(["UN", "metric", "ACME", "trapezoidal", "buttress"])
    .describe("Thread profile family"),
  pitch_mm: z.number().positive().max(50).describe("Thread pitch mm"),
  major_diameter_mm: z.number().positive().max(1000).describe("Major (nominal) diameter mm"),
  internal: z.boolean().describe("true = internal thread, false = external"),
  infeed_method: z.enum(["radial", "flank", "modified_flank", "alternating_flank", "constant_area"])
    .describe("Single-point infeed strategy"),
  total_depth_mm: z.number().positive().max(100).describe("Full thread depth mm"),
  spindle_rpm: z.number().positive().max(50_000).describe("Spindle speed RPM"),
  num_passes: z.number().int().min(1).max(30).describe("Number of cutting passes"),
  spring_passes: z.number().int().min(0).max(10).describe("Spring (no-infeed) passes"),
  lead_in_mm: z.number().min(0).max(100).describe("Lead-in distance mm"),
  lead_out_mm: z.number().min(0).max(100).describe("Lead-out / overtravel mm"),
  thread_length_mm: z.number().positive().max(10_000).describe("Threaded length mm"),
  material_tensile_MPa: z.number().positive().max(10_000).describe("Material UTS MPa"),
}).describe("SPTInput single-point thread spec");

// turning_envelope_distance — TurningEnvelopeDistanceEngine.run
const turning_envelope_distance = z.object({
  ops: z.array(turningBridgeOpSpec).min(1)
    .describe("Operations to evaluate against the envelope rules"),
  rules_context: z.object({
    material: z.string().min(1).describe("Workpiece material name"),
  }).passthrough().optional()
    .describe("Rule-generation context — engine builds the rule set"),
  rule_set: z.object({}).passthrough().optional()
    .describe("Pre-built rule set (alternative to rules_context)"),
  borderline_threshold: z.number().min(0).max(2).optional()
    .describe("|centre_distance_norm| ≥ this flags borderline (default 0.9)"),
}).passthrough().refine(
  (v) => v.rules_context !== undefined || v.rule_set !== undefined,
  { message: "either rules_context or rule_set is required" },
).describe("Graduated distance-to-envelope metric for turning operations");

// turning_sensitivity_analysis — TurningSensitivityAnalysisEngine.run
const turning_sensitivity_analysis = z.object({
  ops: z.array(turningBridgeOpSpec).min(1).describe("Operations in the production plan"),
  batch_size: z.number().int().positive().describe("Parts per batch"),
  nominal_mm: posNum.describe("Nominal critical dimension mm"),
  tolerance_mm: posNum.describe("Bilateral tolerance mm"),
}).passthrough().describe("Local-OAT + Morris sensitivity over the MS1+MS2 turning cascade");

// turning_stochastic_production_plan — TurningStochasticPlanEngine.run
const turning_stochastic_production_plan = z.object({
  ops: z.array(turningBridgeOpSpec).min(1).describe("Operations in the production plan"),
  batch_size: z.number().int().positive().describe("Parts per batch"),
  nominal_mm: posNum.describe("Nominal critical dimension mm"),
  tolerance_mm: posNum.describe("Bilateral tolerance mm"),
}).passthrough().describe("Monte-Carlo P5/P50/P95 envelope over the MS1+MS2 turning cascade");

// turning_thread_optimize — TurningThreadOptimizerEngine.optimize
const turning_thread_optimize = z.object({
  thread: turningBridgeThreadSpec,
  tolerance_class: z.enum(["6g", "6H", "4g", "4H", "2A", "3A", "2B", "3B"]).optional()
    .describe("ISO 965-1 / ASME B1.1 pitch-diameter class"),
}).passthrough().describe("Threading capstone — sensitivity + stochastic + robust + ISO 965-1 gate");

// turning_thread_sensitivity — TurningThreadSensitivityEngine.run
const turning_thread_sensitivity = z.object({
  thread: turningBridgeThreadSpec,
}).passthrough().describe("OAT variability apportionment over the single-point thread cascade");

// turning_thread_stochastic_plan — TurningThreadStochasticPlanEngine.run
const turning_thread_stochastic_plan = z.object({
  thread: turningBridgeThreadSpec,
}).passthrough().describe("Monte-Carlo P5/P50/P95 envelope for single-point threading");

// bar_remnant_* -- BarRemnantManagementEngine (LATHE-PRO-MS10; wired XGAL-WIRE 2026-06-15).
// snake_case keys MATCH the engine field names; normalizeParams adds camel aliases
// alongside (it keeps originals), and .passthrough() admits them.
const barRemnantSpec = z.object({
  id: z.string(),
  material: z.string(),
  diameter_mm: z.number(),
  length_mm: z.number(),
  heat_lot: z.string().optional(),
  location: z.string().optional(),
  created_date: z.string().optional(),
}).passthrough();

const bar_remnant_plan = z.object({
  inventory: z.array(barRemnantSpec),
  job: z.object({
    part_length_mm: z.number().positive(),
    quantity_needed: z.number().positive(),
    diameter_mm: z.number().positive(),
    material: z.string().min(1),
    diameter_tol_mm: z.number().optional(),
    cutoff_kerf_mm: z.number().optional(),
    bar_head_face_mm: z.number().optional(),
    min_feasible_length_mm: z.number().optional(),
    material_price_per_kg: z.number().optional(),
    material_density_kgm3: z.number().optional(),
  }).passthrough(),
}).passthrough().describe("Bar remnant reuse plan -- greedy largest-first assignment + material savings");

const bar_remnant_count_feasible = z.object({
  inventory: z.array(barRemnantSpec),
  material: z.string().min(1),
  diameter_mm: z.number().positive(),
  diameter_tol_mm: z.number().optional(),
  min_feasible_length_mm: z.number().optional(),
}).passthrough().describe("Count feasible remnants for a given material + diameter");

// bar_feed_pitch_optimize -- BarFeedPitchOptimizerEngine (LATHE-PRO-MS10).
// 1-D Swiss/lathe bar-feed pitch + waste optimizer. Completes the U-WIRE05
// bar-stock action trio (sibling of bar_stock_cut_plan + bar_remnant_plan).
const bar_feed_pitch_optimize = z.object({
  part_length_mm: z.number().positive(),
  quantity_needed: z.number().positive(),
  bar_length_mm: z.number().positive(),
  cutoff_kerf_mm: z.number().optional(),
  bar_end_loss_mm: z.number().optional(),
  bar_head_face_mm: z.number().optional(),
  candidate_bar_diameters_mm: z.array(z.number()).optional(),
  bar_diameter_mm: z.number().optional(),
  part_max_diameter_mm: z.number().optional(),
  material_density_kgm3: z.number().optional(),
  material_price_per_kg: z.number().optional(),
  part_mass_kg: z.number().optional(),
}).passthrough().describe("Bar-feed pitch + utilization optimizer (min-waste bar diameter selection)");

// bar_stock_cut_plan -- BarStockCutPlanEngine (LATHE-PRO-MS6). The engine case
// was wired at HEAD but had NO schema -> Zod validation was silently skipped
// (empty/negative inputs slipped through). This schema closes that gap.
const _cutRequirementSpec = z.object({
  id: z.string(),
  part_length_mm: z.number().positive(),
  quantity: z.number().positive(),
  facing_allowance_mm: z.number().optional(),
  cutoff_width_mm: z.number().optional(),
}).passthrough();
const _barStockOptionSpec = z.object({
  id: z.string(),
  length_mm: z.number().positive(),
  grip_allowance_mm: z.number().optional(),
  cost_per_bar_usd: z.number().optional(),
}).passthrough();
const bar_stock_cut_plan = z.object({
  requirements: z.array(_cutRequirementSpec).min(1),
  bar_options: z.array(_barStockOptionSpec).min(1),
  kerf_mm: z.number().nonnegative().optional(),
}).passthrough().describe("1-D FFD bar-stock cut plan (bin-packing, yield maximization)");

// ---- U-GOLF-WHISKEY-WORKTREE-INTEGRATION grafted action schemas (slot/whiskey) ----
// Helper consts the grafted defs below depend on (transitive closure from the
// slot/whiskey schema file -- the initial splice pulled defs but not helpers).
const _ensemblePrediction = z.object({
  model_id: z.string().min(1).describe("Adapter id that produced this prediction."),
  prediction: z.string().min(1).describe("The predicted output (the vote token)."),
  confidence: z.number().describe("Prediction confidence ∈ [0,1] (validated by the voter)."),
  rank: z.number().int().optional().describe("Rank for Borda-count (ranked strategy)."),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Opaque per-prediction metadata."),
}).passthrough();

const _ledgerKind = z.enum(["success", "failure", "operator_override", "pending"]);

const _ledgerFilter = z.object({
  material: z.string().optional().describe("Filter by material."),
  customer: z.string().optional().describe("Filter by customer."),
  outcome_kind: _ledgerKind.optional().describe("Filter by outcome kind."),
  since: z.string().optional().describe("ISO lower-bound timestamp (inclusive)."),
  until: z.string().optional().describe("ISO upper-bound timestamp (exclusive)."),
  limit: z.number().int().positive().optional().describe("Max rows (default 10000)."),
}).passthrough();

const _fuseCandidate = z.object({
  source: z.string().min(1).describe("Provenance label — e.g. physics, lora, rag, tribal, operator."),
  vc: z.number().positive().optional().describe("Candidate cutting speed (m/min)."),
  feed: z.number().positive().optional().describe("Candidate feed (mm/rev)."),
  ap: z.number().positive().optional().describe("Candidate depth of cut (mm)."),
  confidence: z.number().optional().describe("Source confidence ∈ [0,1] (fusion weight; clamped, default 0.5)."),
}).passthrough();

const _extractCorpus = z.object({
  instruction: z.string().optional().describe("Override instruction; defaults to a reproduce-program prompt."),
  input: z.string().describe("Context/input side of the SFT pair."),
  output: z.string().describe("The proven program/answer side of the SFT pair."),
  reward: z.number().optional().describe("Quality signal [0,1] (clamped)."),
  ts: z.string().optional().describe("Source timestamp."),
}).passthrough();

const _extractTribal = z.object({
  tip: z.string().describe("The shop-floor tribal tip (becomes the output)."),
  context: z.string().optional().describe("Situational context (becomes the input)."),
  reward: z.number().optional().describe("Quality signal [0,1] (clamped)."),
  ts: z.string().optional().describe("Source timestamp."),
}).passthrough();

const _adapterMetrics = z.object({
  auroc: z.number().optional().describe("Area under ROC ∈ [0,1] (higher better)."),
  macroF1: z.number().optional().describe("Macro-averaged F1 ∈ [0,1] (higher better)."),
  brier: z.number().optional().describe("Brier score ∈ [0,1] (LOWER better)."),
  successRate: z.number().optional().describe("Lathe-domain held-out success rate ∈ [0,1] (optional lift metric)."),
}).passthrough();

const _chuckForceInput = z.object({
  chuck_type: z.enum(["3_jaw_scroll", "3_jaw_power", "4_jaw_independent", "6_jaw", "collet"]).describe("Chuck type."),
  jaw_type: z.enum(["hard", "soft", "pie", "special"]).describe("Jaw type (drives the default jaw-workpiece friction)."),
  num_jaws: z.number().int().positive().describe("Number of jaws."),
  workpiece_mass_kg: z.number().positive().describe("Workpiece mass [kg]."),
  workpiece_od_mm: z.number().positive().describe("Clamped outer diameter [mm]."),
  workpiece_length_mm: z.number().positive().describe("Workpiece length [mm]."),
  gripping_diameter_mm: z.number().positive().describe("Actual jaw-contact diameter [mm]."),
  gripping_length_mm: z.number().positive().describe("Axial jaw-contact length [mm]."),
  spindle_rpm: z.number().nonnegative().describe("Operating spindle speed [RPM]."),
  max_spindle_rpm: z.number().positive().describe("Max RPM the machine can reach [RPM]."),
  cutting_force_tangential_N: z.number().nonnegative().describe("Tangential cutting force [N]."),
  cutting_force_radial_N: z.number().nonnegative().describe("Radial cutting force [N]."),
  cutting_force_axial_N: z.number().nonnegative().describe("Axial cutting force [N]."),
  friction_coefficient: z.number().positive().optional().describe("Jaw-workpiece friction (0.15-0.5 typical; default by jaw_type)."),
  jaw_stroke_mm: z.number().positive().optional().describe("Jaw stroke [mm]."),
}).passthrough();

const _eccentricInput = z.object({
  part_number: z.string().min(1).describe("Part/job number."),
  profile_type: z.enum(["trilobe", "bilateral", "eccentric_circle", "polygon"]).describe("Eccentric profile type."),
  total_length_in: z.number().positive().describe("Total turned length [inches]."),
  workpiece_material: z.string().min(1).describe("Workpiece material (matched to CANONICAL_MATERIAL_DB; falls back to 1045 steel)."),
  target_finish_Ra_um: z.number().positive().describe("Target surface finish Ra [µm]."),
  max_spindle_rpm: z.number().positive().describe("Spindle RPM limit (>3000 flagged unsafe for polar interpolation)."),
  controller: z.enum(["OSP-P300L-R", "OSP-P300LA-E", "OSP-P300SA"]).describe("Target Okuma OSP dialect."),
  tool_position: z.number().describe("Tool turret position."),
  tool_nose_radius_in: z.number().positive().describe("Tool nose radius [inches]."),
  finish_passes: z.number().int().nonnegative().describe("Number of finish passes."),
  finish_stock_in: z.number().nonnegative().describe("Stock allowance for finish [inches]."),
  use_css: z.boolean().describe("Use constant surface speed (G96)."),
  trilobe_stages: z.array(z.object({}).passthrough()).optional().describe("Trilobe stages (required when profile_type=trilobe)."),
  lead_angle_deg: z.number().optional().describe("Lead angle for helical profile [degrees]."),
  lobe_count: z.number().int().optional().describe("Number of lobes (polygon)."),
  max_radius_in: z.number().positive().optional().describe("Max radius [inches] (required for non-trilobe profiles)."),
  min_radius_in: z.number().positive().optional().describe("Min radius [inches]."),
  css_sfm: z.number().positive().optional().describe("CSS surface speed [SFM]."),
}).passthrough();

const _ldbIsoGroup = z.enum(["P", "M", "K", "N", "S", "H"]);

const lathe_alarm_lookup = z.object({
  code: z.string().min(1).describe("Alarm code to look up (e.g. \"1234\")."),
  controller: z.string().optional().describe("Controller family (default OKUMA — JM lathe fleet is 100% Okuma OSP). Case-insensitive."),
}).passthrough().describe("Look up an alarm by controller+code → alarm + fix procedure + tribal tips — engine: AlarmDiagnosticsEngine.lookupAlarm.");

const lathe_alarm_search = z.object({
  query: z.string().min(1).describe("Free-text query across alarm name/message/description."),
}).passthrough().describe("Search the alarm DB by text — engine: AlarmDiagnosticsEngine.searchAlarms.");

const lathe_alarm_summary = z.object({}).passthrough().describe("Alarm DB summary (totals + per-controller counts) — engine: AlarmDiagnosticsEngine.getSummary.");

const lathe_alarm_controllers = z.object({}).passthrough().describe("List available controller families + alarm counts — engine: AlarmDiagnosticsEngine.listControllers.");

const lathe_alarm_difficulty = z.object({
  alarmId: z.string().min(1).describe("Alarm id whose repair difficulty/time/tools to estimate."),
}).passthrough().describe("Repair difficulty + estimated time + tools for an alarm — engine: AlarmDiagnosticsEngine.getDifficulty.");

const lathe_alarm_fix_procedure = z.object({
  alarmId: z.string().min(1).describe("Alarm id (e.g. \"OKUMA-001\") or fix id (e.g. \"FIX-OKUMA-001\")."),
}).passthrough().describe("Get the step-by-step fix procedure for an alarm — engine: AlarmDiagnosticsEngine.getFixProcedure.");

const lathe_alarm_list_by_controller = z.object({
  controller: z.string().optional().describe("Controller family (default OKUMA). Case-insensitive."),
}).passthrough().describe("List all alarms for a controller — engine: AlarmDiagnosticsEngine.getAlarmsByController.");

// Exported for the prism_safety dual-wire (safetyActionSchemas.ts imports this) --
// same engine + same params on two dispatchers share ONE schema const, per the
// U-MACRO-LIB precedent at the top of this file (no behavioural drift between wires).
export const lathe_lora_calibration_gate = z.object({
  modelConfidence: z.number().describe("Model/adapter stated confidence ∈ [0,1] (clamped). Required."),
  sampleSupport: z.number().optional().describe("# of past similar outcomes backing the prediction (epistemic signal)."),
  historicalSuccessRate: z.number().optional().describe("Historical success rate ∈ [0,1] (over-confidence calibration)."),
  conflictCount: z.number().optional().describe("# of fused params whose sources disagreed (from U-LLR-FUSION)."),
  paramCount: z.number().optional().describe("Total fused params considered (conflict-fraction denominator)."),
  safetyScore: z.number().optional().describe("Canonical S(x) safety score ∈ [0,1] — drives the hard reject/review bands."),
  toolBreakageRisk: z.boolean().optional().describe("Hard hazard flag — true forces reject."),
  collisionRisk: z.boolean().optional().describe("Hard hazard flag — true forces reject."),
}).passthrough();

const lathe_lora_ensemble_history = z.object({
  limit: z.number().int().positive().optional().describe("Max recent vote records to return."),
}).passthrough().describe("Return recent ensemble-vote records for audit/replay — engine: LatheLoRAEnsembleVoterEngine.getHistory.");

const lathe_lora_ensemble_vote = z.object({
  predictions: z.array(_ensemblePrediction).min(1).describe("Per-adapter predictions to aggregate (≥1)."),
  strategy: z.enum(["majority", "weighted", "ranked", "unanimous", "plurality"]).optional().describe("Voting strategy (default: engine config 'weighted')."),
}).passthrough().describe("Aggregate multi-adapter predictions into a winner + consensus flag — engine: LatheLoRAEnsembleVoterEngine.vote.");

const lathe_lora_experience_outcome = z.object({
  id: z.string().min(1).describe("Event id returned by lathe_lora_experience_record."),
  kind: _ledgerKind.describe("Terminal outcome kind."),
  failureMode: z.string().optional().describe("Failure mode (when kind=failure)."),
  actualMetrics: z.record(z.string(), z.number()).optional().describe("Measured shop-floor metrics."),
  actualRaUm: z.number().positive().optional().describe("Measured surface finish Ra (µm)."),
  targetRaUm: z.number().positive().optional().describe("Target Ra for the reward comparison."),
  toolBreakage: z.boolean().optional().describe("Hard-failure flag (zeros the reward)."),
  alarm: z.boolean().optional().describe("Controller-alarm flag (zeros the reward)."),
  notes: z.string().optional().describe("Free-text notes."),
}).passthrough();

const lathe_lora_experience_query = _ledgerFilter;

const lathe_lora_experience_record = z.object({
  operation: z.string().min(1).describe("Turning operation (od_rough/id_bore/thread/part_off/face)."),
  jobId: z.string().optional().describe("Replay-chain grouping id."),
  material: z.string().optional().describe("Workpiece material code."),
  toolMaterial: z.string().optional().describe("Insert/tool material."),
  machineFamily: z.string().optional().describe("Lathe machine family."),
  controller: z.string().optional().describe("Controller (defaults okuma)."),
  targetRaUm: z.number().positive().optional().describe("Target surface finish Ra (µm)."),
  vc: z.number().positive().optional().describe("Predicted cutting speed (m/min)."),
  feedRate: z.number().positive().optional().describe("Predicted feed (mm/min)."),
  rpm: z.number().positive().optional().describe("Predicted spindle RPM."),
  ap: z.number().positive().optional().describe("Predicted depth of cut (mm)."),
  adapterId: z.string().optional().describe("LoRA adapter/model id that produced the prediction."),
  predictedSuccess: z.boolean().optional().describe("Pre-machining confidence flag."),
  predictedMetrics: z.record(z.string(), z.number()).optional().describe("Predicted metric map."),
  intent: z.string().optional().describe("Intent tag (defaults lathe_lora_inference)."),
}).passthrough();

const lathe_lora_experience_stats = _ledgerFilter;

const lathe_lora_fuse_knowledge = z.object({
  operation: z.string().min(1).describe("Turning operation being parameterised."),
  material: z.string().optional().describe("Workpiece material (context only)."),
  isoGroup: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO machinability group — required for the Kienzle/Taylor physics anchor."),
  candidates: z.array(_fuseCandidate).min(1).describe("One entry per source; ≥1 must carry a valid positive param."),
  conflictSpreadRatio: z.number().optional().describe("Override the conflict-detection max/min ratio (default 1.5). Values <1 are clamped to 1 (a sub-1 ratio is degenerate)."),
}).passthrough();

const lathe_lora_knowledge_extract = z.object({
  limit: z.number().int().positive().optional().describe("Max ledger outcome rows to harvest (1..10000)."),
  minReward: z.number().optional().describe("Drop outcome records below this reward floor."),
  includeCorpus: z.array(_extractCorpus).optional().describe("Injected corpus records (pure-core + injected-readers)."),
  includeTribal: z.array(_extractTribal).optional().describe("Injected tribal records."),
}).passthrough();

const lathe_lora_meta_adapt_decide = z.object({
  candidate: _adapterMetrics.describe("The retrained candidate adapter's held-out eval. Required."),
  incumbent: _adapterMetrics.optional().describe("Current production adapter's eval — omit for the first deployable model."),
  gates: z.object({
    auroc: z.number().optional(),
    macroF1: z.number().optional(),
    brier: z.number().optional(),
  }).passthrough().optional().describe("Override the absolute deploy-ready gate thresholds (default 0.78/0.55/0.15)."),
  minLift: z.number().optional().describe("Minimum measured lift over the incumbent to promote (default 0.02; clamped ≥0)."),
  liftMetric: z.enum(["auroc", "macroF1", "successRate"]).optional().describe("Higher-is-better metric defining lift (default auroc)."),
}).passthrough().describe("Decide whether to promote a retrained lathe LoRA adapter (deploy-ready gate + measured lift) — engine: LatheLoRAMetaAdaptationEngine.decide.");

const lathe_lora_semantic_context = z.object({
  operation: z.string().min(1).describe("Turning operation to retrieve neighbours for."),
  material: z.string().optional().describe("Workpiece material (exact match scores closest)."),
  controller: z.string().optional().describe("Controller filter."),
  targetRaUm: z.number().positive().optional().describe("Target surface finish Ra (µm)."),
  vc: z.number().positive().optional().describe("Cutting speed (m/min) for numeric similarity."),
  feed: z.number().positive().optional().describe("Feed (mm/min) for numeric similarity."),
  ap: z.number().positive().optional().describe("Depth of cut (mm) for numeric similarity."),
  k: z.number().int().optional().describe("Top-K neighbours (clamped 0..50)."),
  includePending: z.boolean().optional().describe("Include still-pending rows (default false)."),
  corpusSnippets: z.array(z.string()).optional().describe("Extra reference snippets appended to the context."),
}).passthrough();

const lathe_boring_bar_select = z.object({
  mountingSize: z.string().optional().describe("Capto/shank size filter for the boring bar."),
  bore_dia_mm: z
    .number()
    .positive()
    .optional()
    .describe("Target bore diameter mm (informational)."),
});

const lathe_canned_cycle_validate = z.object({
  program_text: z
    .string()
    .min(1)
    .describe("G-code containing on-axis drilling canned cycles (G80-G89) to validate."),
  options: z
    .object({
      require_rigid_tap: z.boolean().optional(),
      warn_peck_exceeds_depth: z.boolean().optional(),
    })
    .optional()
    .describe("CannedCycleOptions overrides."),
});

const lathe_chuck_jaw_force = _chuckForceInput.describe("Compute required chuck gripping force + centrifugal grip-loss + max-safe-RPM + deformation risk — engine: ChuckJawForceEngine.calculate.");

const lathe_chuck_jaw_validate = _chuckForceInput.describe("Compact chuck-jaw safety verdict (safe / safety_factor / message) — engine: ChuckJawForceEngine.validate.");

const lathe_eccentric_controllers = z.object({}).passthrough().describe("List supported Okuma OSP dialects for eccentric turning — engine: EccentricTurningEngine.getSupportedControllers.");

const lathe_eccentric_generate = _eccentricInput.describe("Generate an eccentric/trilobe turning program (+ physics + validation problems) — engine: EccentricTurningEngine.generate.");

const lathe_eccentric_validate = z.object({}).passthrough().describe("Pre-flight validate an eccentric turning input — returns problems incl. the >3000 RPM polar-interp safety limit — engine: EccentricTurningEngine.validateInput.");

const lathe_insert_grade_lookup = z.object({
  isoGroup: _ldbIsoGroup.describe("ISO 513 material group for the insert-grade lookup."),
  operation: z
    .enum(["all", "finishing", "roughing"])
    .optional()
    .describe("Filter grades by operation regime (default all)."),
  manufacturer: z
    .string()
    .optional()
    .describe("Restrict to one insert manufacturer (Sandvik/Kennametal/Iscar)."),
});

const lathe_toolholder_lookup = z.object({
  system: z
    .enum(["capto", "shank"])
    .optional()
    .describe("Holder mounting-system filter (only capto + shank holders exist in the wired catalog arrays)."),
  mountingSize: z.string().optional().describe("Capto C3..C8 / VDI 20..40 / shank mm."),
  insertShape: z.string().optional().describe("ISO insert-shape code filter (C/D/T/W/V...)."),
  hand: z.enum(["L", "R", "N"]).optional().describe("Holder hand (L/R/N)."),
  captoSize: z
    .enum(["C3", "C4", "C5", "C6", "C8"])
    .optional()
    .describe("Convenience Capto-size filter via getCaptoHoldersBySize."),
});

const okuma_osp_parse = z.object({
  program_text: z.string().min(1).describe("Okuma OSP program text to parse into a structured OkumaProgram."),
  filename: z.string().optional().describe("Optional source filename for provenance."),
});

export const TURNING_ACTION_SCHEMAS: ActionSchemaMap = {
  bar_remnant_plan,
  bar_remnant_count_feasible,
  bar_feed_pitch_optimize,
  bar_stock_cut_plan,
  chuck_force,
  tailstock,
  steady_rest,
  live_tool,
  live_tool_plan,
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

  // WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheShopAwareOptimizationEngine
  lathe_shop_optimize_program,
  lathe_shop_optimize_customer,
  lathe_machine_get_profile,
  lathe_troubleshoot_overhang,
  lathe_predictive_tool_wear,

  // U-LATHE-PROG-OPT-WIRE: LatheProgramOptimizerEngine upgrade trio (analyze was already in BATCH3)
  lathe_program_optimize,
  lathe_program_estimate,

  // U-WIRE-LATHE-BIRDNEST: chip-wrap risk prediction (LATHE-PRO-MS7)
  lathe_bird_nest_predict,
  lathe_bird_nest_stats,

  // U-WIRE-LATHE-PARTING-CLEAR: parting chip-clearance evaluation (LATHE-PRO-MS7)
  lathe_parting_clearance_evaluate,
  lathe_parting_clearance_stats,

  // U-WIRE-LATHE-PART-COST: 7-bucket cost-per-part model (LATHE-PRO-MS10)
  lathe_part_cost_compute,
  lathe_part_cost_stats,

  // U-WIRE-LATHE-SUBSPINDLE-PURGE: sub-spindle transfer purge timing (LATHE-PRO-MS7)
  lathe_subspindle_purge_plan,
  lathe_subspindle_purge_stats,

  // U-WIRE-LATHE-OP-TIME-BREAKDOWN: 9-bucket op-time decomposition (LATHE-PRO-MS5)
  lathe_op_time_compute,
  lathe_op_time_aggregate,
  lathe_op_time_stats,

  // U-WIRE-LATHE-REPLAY-FRAME: block-by-block replay frame compiler (LATHE-PRO-MS12)
  lathe_replay_frame_compile,
  lathe_replay_frame_stats,

  // U-WIRE-LATHE-PART-CLASSIFIER: 15-family part classifier (LATHE-PRO-MS3)
  lathe_part_classify,
  lathe_part_classify_batch,
  lathe_part_family_profile,
  lathe_part_family_list,

  // U-WIRE-LATHE-PROG-COST: programming cost model (LATHE-AWARE-HARDEN-MS11)
  lathe_programming_cost_estimate,
  lathe_programming_cost_compare,
  lathe_programming_cost_breakeven,
  lathe_programming_cost_stats,

  // U-WIRE-LATHE-PERF-SLO: production-SLO registry (LATHE-PROD-READY-MS0)
  lathe_slo_targets,
  lathe_slo_get_target,
  lathe_slo_set_target,
  lathe_slo_record_sample,
  lathe_slo_sample_count,
  lathe_slo_evaluate,
  lathe_slo_dashboard,
  lathe_slo_clear_samples,

  // U-WIRE-LATHE-LORA-SAFETY-EVAL: LoRA-output safety evaluator (LATHE-LORA-MS0)
  lathe_lora_safety_evaluate,
  lathe_lora_safety_is_safe,
  lathe_lora_safety_summary,
  lathe_lora_safety_set_config,
  lathe_lora_safety_get_config,
  lathe_lora_safety_threshold,

  // U-WIRE-LATHE-LORA-REASON-EVAL: LoRA reasoning-chain evaluator (LATHE-LORA-MS0)
  lathe_lora_reason_evaluate,
  lathe_lora_reason_summary,
  lathe_lora_reason_suggestions,
  lathe_lora_reason_set_config,
  lathe_lora_reason_get_config,

  // U-WIRE-LATHE-COOLANT-ADVISOR: coolant delivery recommender (LATHE-PRO-MS5)
  lathe_coolant_advise,
  lathe_coolant_stats,

  // U-WIRE-LATHE-CHUCK-JAW-SETUP: soft-jaw setup calculator (LATHE-PRO-MS11)
  lathe_chuck_jaw_compute,
  lathe_chuck_jaw_stats,

  // U-WIRE-LATHE-CSS-OPTIMIZER: CSS clamp + mode selector (LATHE-PRO)
  lathe_css_optimize,
  lathe_css_select_mode,
  lathe_css_stats,

  // U-WIRE-LATHE-LORA-REWARD-SHAPE: RL reward shaping for LoRA fine-tuning (LATHE-LORA-MS0)
  lathe_lora_reward_calc,
  lathe_lora_reward_threshold,
  lathe_lora_reward_summary,
  lathe_lora_reward_set_config,
  lathe_lora_reward_get_config,

  // BATCH4 schemas: tribal/science/reasoning/neural/jmdie
  lathe_tribal_stats,
  lathe_unified_science_version,
  lathe_unified_science_recommend,
  lathe_kinematics_get_machine_specs,
  lathe_neural_intel_stats,
  lathe_jmdie_extract_operations,

  // FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-TRIBAL-WIRE: lathe tribal knowledge → lathe AI bridge
  lathe_tribal_integrate,
  lathe_tribal_adjustment,
  lathe_tribal_failure_check,
  lathe_tribal_source_corpus,
  lathe_tribal_integration_stats,

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

  // LATHE-CAPABILITY/U-LW-C2 (slot:whiskey, 2026-07-05): WetRunStateMachineEngine (14 actions)
  wet_run_start_session,
  wet_run_get_session,
  wet_run_list_sessions,
  wet_run_record_part_outcome,
  wet_run_record_safety_event,
  wet_run_submit_post_mortem,
  wet_run_clear_quarantine,
  wet_run_resolve_session,
  wet_run_list_transitions,
  wet_run_list_scrap_events,
  wet_run_list_safety_events,
  wet_run_get_post_mortem,
  wet_run_list_clearances,
  wet_run_get_stats,

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
  lathe_expanding_mandrel_analyze,

  // WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheSequenceOptimizerEngine — 2 surfaces
  lathe_sequence_optimize,
  lathe_sequence_validate,

  // WIRE-UNWIRED-MS0/U-WIRE-TWP: TurningWearPredictionEngine — 3 surfaces
  turning_wear_per_op,
  turning_wear_chip_form,
  turning_wear_batch_life,

  // WIRE-UNWIRED-MS0/U-WIRE-TTW: TurningToolpathWearEngine — 1 surface
  turning_toolpath_wear,

  // WIRE-UNWIRED-MS0/U-WIRE-TRG: TurningRulesGeneratorEngine — 2 surfaces
  turning_rules_generate,
  turning_rules_stats,

  // WIRE-UNWIRED-MS0/U-WIRE-VTC: VendorTurningCatalogExtractorEngine — 6 surfaces
  turning_iso1832_parse,
  turning_chipbreaker_classify,
  turning_vendor_insert_search,
  turning_vendor_grade_recommend,
  turning_vendor_iso_code_resolve,
  turning_vendor_catalog_stats,

  // WIRE-UNWIRED-MS0/U-WIRE-MOP: LatheMultiOpPlannerEngine — 2 surfaces
  lathe_multiop_plan,
  lathe_softjaw_boring,

  // WIRE-UNWIRED-MS0/U-WIRE-PROFDEV: ProfileDeviationAnalyzerEngine — 2 surfaces
  lathe_profile_deviation_analyze,
  lathe_profile_deviation_stats,

  // WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE: LatheProgramBacktraceEngine — 2 surfaces
  lathe_backtrace_trace,
  lathe_backtrace_stats,

  // FEATURE-GAP-AUDIT-MS0/U-BRIDGE-WIRE-OKUMA: 4 unwired Okuma engines
  okuma_step_parse,
  okuma_macro_convert,
  okuma_manual_tips_extract,
  okuma_transcript_mine,

  // BACKEND-DEV-LOOP/U-WIRE-LATHE-GA: LatheGeneticAlgorithmEngine — 3 surfaces
  lathe_ga_optimize_parameters,
  lathe_ga_optimize_tool_sequence,
  lathe_ga_optimize_multi_pass,

  // BRIDGE-WIRING/U-BRIDGE-WIRE-TURNING: 6 unwired Turning engines
  turning_envelope_distance,
  turning_sensitivity_analysis,
  turning_stochastic_production_plan,
  turning_thread_optimize,
  turning_thread_sensitivity,
  turning_thread_stochastic_plan,

  // WIRE-UNWIRED-LOOP-TURNING/BATCH-A: 56 orphan engines — passthrough schemas
  lathe_orchestration_calculate: z.object({}).passthrough(),
  eccentric_turning_get_stats: z.object({}).passthrough(),
  lathe_deep_learning_find_similar_jobs: z.object({
    material: z.string().optional(),
    operation: z.string().optional(),
    machine_type: z.string().optional(),
  }).passthrough(),
  lathe_unified_ai_generate_process_plan: z.object({}).passthrough(),
  lathe_dl_intel_get_stats: z.object({}).passthrough(),
  lathe_resource_knowledge_get_base: z.object({}).passthrough(),
  lathe_rl_get_stats: z.object({}).passthrough(),
  lathe_meta_learning_maml_train: z.object({}).passthrough(),
  lathe_archive_training_get_stats: z.object({}).passthrough(),
  lathe_style_selector_select: z.object({}).passthrough(),
  lathe_part_family_planning_analyze: z.object({}).passthrough(),
  lathe_transfer_learning_transfer: z.object({}).passthrough(),
  lathe_lora_program_parser_parse: z.object({
    content: z.string(),
    file_name: z.string().optional(),
  }),
  lathe_lora_example_generator_generate: z.object({}).passthrough(),
  lathe_lora_dataset_validator_validate: z.object({
    examples: z.array(z.record(z.string(), z.unknown())),
  }),
  lathe_lora_transfer_strategy_list: z.object({}).passthrough(),
  lathe_lora_training_monitor_init: z.object({}).passthrough(),
  lathe_lora_physics_evaluator_evaluate: z.object({
    output: z.string(),
    context: z.object({
      material: z.string().optional(),
      iso_group: z.string().optional(),
    }).optional(),
  }),
  lathe_lora_merge_strategy_recommend: z.object({
    adapter_ids: z.array(z.string()),
  }),
  lathe_lora_quantization_estimate_size: z.object({
    model_id: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  lathe_lora_model_optimizer_get_profile: z.object({}).passthrough(),
  lathe_lora_ollama_deployer_generate: z.object({}).passthrough(),
  lathe_lora_inference_gateway_get_config: z.object({}).passthrough(),
  lathe_lora_reasoning_chain_get_templates: z.object({}).passthrough(),
  lathe_lora_neural_bridge_get_config: z.object({}).passthrough(),
  lathe_lora_neural_orch_start_pipeline: z.object({
    input: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  lathe_lora_program_miner_detect_dialect: z.object({
    program_text: z.string(),
  }),
  lathe_lora_knowledge_curator_get_config: z.object({}).passthrough(),
  lathe_lora_pipeline_coord_create: z.object({
    name: z.string().optional(),
    stages: z.array(z.record(z.string(), z.unknown())).optional(),
  }).passthrough(),
  turning_strategy_catalog_select: z.object({}).passthrough(),
  lathe_ai_feature_get_stats: z.object({}).passthrough(),
  lathe_advanced_ops_live_tooling: z.object({}).passthrough(),
  lathe_deep_ai_harden_analyze: z.object({}).passthrough(),
  lathe_intelligence_get_stats: z.object({}).passthrough(),
  lathe_print_ingest_ingest: z.object({}).passthrough(),
  lathe_feature_recognizer_recognize: z.object({}).passthrough(),
  lathe_print_setup_select: z.object({}).passthrough(),
  lathe_print_dl_intel_predict: z.object({}).passthrough(),
  lathe_safety_predicate_evaluate: z.object({}).passthrough(),
  lathe_lora_physics_aug_infer_extract: z.object({
    response: z.string(),
  }),
  lathe_proof_carrying_emit: z.object({}).passthrough(),
  lathe_print_tolerance_stack_propagate: z.object({}).passthrough(),
  lathe_thermodynamics_heat_gen: z.object({}).passthrough(),
  lathe_opus_reasoning_forward: z.object({}).passthrough(),
  lathe_unified_physics_analyze: z.object({}).passthrough(),
  lathe_knowledge_graph_ingest: z.object({}).passthrough(),
  lathe_print_reasoning_explain: z.object({}).passthrough(),
  lathe_tribal_integration_source_corpus: z.object({}).passthrough(),
  lathe_print_sequence_plan: z.object({}).passthrough(),
  lathe_print_feature_strategy_select: z.object({}).passthrough(),
  lathe_print_program_emit: z.object({}).passthrough(),
  lathe_print_program_signoff_generate: z.object({}).passthrough(),
  lathe_program_audit_pipeline_run: z.object({
    content: z.string(),
  }),
  jmdie_lathe_program_upgrade: z.object({}).passthrough(),
  jmdie_lathe_program_upgrade_v2: z.object({}).passthrough(),
  lathe_program_library_search: z.object({}).passthrough(),
  // CALC-RESTORE-MS0/U-WIRE-TURNING-COST-ESTIMATE (slot:india 2026-06-22): turning job-cost
  // estimate. 3 required positive geometry/time fields; optionals fall back to defaults in the
  // dispatcher adaptation. Non-positive / missing required -> rejected here (failure-mode tests).
  turning_cost_estimate: z.object({
    bar_od_mm: z.number().positive(),
    part_length_mm: z.number().positive(),
    cycle_time_sec: z.number().positive(),
    density_kg_m3: z.number().positive().optional(),
    material_price_per_kg: z.number().nonnegative().optional(),
    machine_rate_per_hr: z.number().positive().optional(),
    setup_minutes: z.number().nonnegative().optional(),
    batch_size: z.number().int().positive().optional(),
    secondary_ops_cost_usd: z.number().nonnegative().optional(),
    material: z.string().optional(),
  }).passthrough(),
  // U-GOLF-WHISKEY-WORKTREE-INTEGRATION grafted actions
  lathe_alarm_lookup,
  lathe_alarm_search,
  lathe_alarm_summary,
  lathe_alarm_controllers,
  lathe_alarm_difficulty,
  lathe_alarm_fix_procedure,
  lathe_alarm_list_by_controller,
  lathe_lora_calibration_gate,
  lathe_lora_ensemble_history,
  lathe_lora_ensemble_vote,
  lathe_lora_experience_outcome,
  lathe_lora_experience_query,
  lathe_lora_experience_record,
  lathe_lora_experience_stats,
  lathe_lora_fuse_knowledge,
  lathe_lora_knowledge_extract,
  lathe_lora_meta_adapt_decide,
  lathe_lora_semantic_context,
  lathe_boring_bar_select,
  lathe_canned_cycle_validate,
  lathe_chuck_jaw_force,
  lathe_chuck_jaw_validate,
  lathe_eccentric_controllers,
  lathe_eccentric_generate,
  lathe_eccentric_validate,
  lathe_insert_grade_lookup,
  lathe_toolholder_lookup,
  okuma_osp_parse,
};
