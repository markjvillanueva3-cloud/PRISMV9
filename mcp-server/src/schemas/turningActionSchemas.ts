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

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

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
// INTEL-OLLAMA-OBSIDIAN-MS1/P1-U04 — Swiss-type orphan engine schemas
// ============================================================================

const SWISS_DIALECTS = ["citizen", "star", "tsugami", "mazak", "dmg_mori"] as const;

const swiss_route_decide = z.object({
  length_mm: posNum.describe("Finished part length in mm"),
  max_diameter_mm: posNum.describe("Maximum finished diameter in mm"),
  tightest_tolerance_mm: posNum.describe("Tightest diametric tolerance in mm"),
  has_live_operations: z.boolean().describe("Has cross-drilled holes or live-tool ops"),
  annual_quantity: posNum.describe("Annual production quantity"),
  material: z.string().min(1).describe("Material name (informational)"),
}).passthrough();

const swiss_guide_feed_limits = z.object({
  mode: z.enum(["gb_on", "gb_off"]).describe("Guide-bushing mode"),
  bar_od_mm: posNum.describe("Bar stock outer diameter in mm"),
  part_length_mm: posNum.describe("Part length from collet face to tool tip in mm"),
  bushing_engagement_mm: optPosNum.describe("Bushing engagement (gb_on only); default 12 mm"),
  youngs_modulus_gpa: posNum.describe("Material Young's modulus in GPa"),
  yield_mpa: posNum.describe("Material yield strength in MPa"),
  kc_mpa: posNum.describe("Specific cutting force kc1.1 in MPa"),
  spindle_rpm: posNum.describe("Spindle speed in rev/min"),
  feed_per_rev_mm: posNum.describe("Candidate feed per revolution in mm"),
  ap_mm: posNum.describe("Radial depth of cut in mm"),
  max_deflection_mm: optPosNum.describe("Override default deflection limit"),
}).passthrough();

const swiss_guide_clearance = z.object({
  bar_od_mm: posNum.describe("Bar OD in mm (must be ≤80 mm)"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
  surface_speed_m_per_min: optPosNum.describe("Cutting surface speed in m/min (drives thermal bump)"),
}).passthrough();

const swiss_part_transfer = z.object({
  dialect: z.enum(SWISS_DIALECTS).describe("Controller dialect"),
  main_rpm: posNum.describe("Main-spindle cutoff RPM"),
  sub_rpm: posNum.describe("Sub-spindle RPM during transfer"),
  phase_sync: z.boolean().optional().describe("Phase-sync transfer for oriented features"),
  grip_z_mm: z.number().describe("Z-position where sub-spindle grips part (mm)"),
  cutoff_z_mm: z.number().describe("Z-position where cut-off tool engages (mm)"),
  cutoff_feed_mm_rev: posNum.describe("Cut-off feedrate in mm/rev"),
  retract_z_mm: z.number().describe("Sub-spindle retract Z target in mm"),
  bar_pull_after: z.boolean().optional().describe("Use bar-pull before next cycle"),
  collet_mu: z.number().min(0.1).max(0.3).optional().describe("Collet friction coefficient"),
  sensor_confirm: z.boolean().optional().describe("Read grip-sensor M-code before cut-off"),
}).passthrough();

const swiss_emit_channel_files = z.object({
  dialect: z.enum(SWISS_DIALECTS).describe("Controller dialect"),
  program_number: z.number().int().min(1).max(9999).describe("Program number 0001-9999"),
  program_comment: z.string().optional().describe("Program header comment"),
  channels: z.array(z.object({
    channel_id: z.number().int().min(1).describe("1-based channel index"),
    label: z.string().optional(),
    body: z.array(z.string()).describe("G-code body lines (header/footer added per dialect)"),
    tools: z.array(z.object({
      number: z.number().int().nonnegative(),
      offset: z.number().int().optional(),
      label: z.string().optional(),
    })).optional(),
  })).min(1).describe("Per-channel program bodies"),
  sync_points: z.array(z.object({
    after_op: z.string().min(1),
    wait_channels: z.array(z.number().int().min(1)),
    idle_time_s: optPosNum,
    type: z.enum(["generic", "part_transfer", "tool_change", "simultaneous_start"]).optional(),
  })).describe("Sync points in execution order"),
  cycle_time_est_min: optPosNum.describe("Cycle time estimate for header comment"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

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
  // INTEL-OLLAMA-OBSIDIAN-MS1/P1-U04: Swiss-type orphan engine wiring
  swiss_route_decide,
  swiss_guide_feed_limits,
  swiss_guide_clearance,
  swiss_part_transfer,
  swiss_emit_channel_files,
  // LATHE-WIRE-MS0: lightweight orphan engine wiring (turning analytics)
  turning_predict_batch_life: z.object({}).passthrough().describe("Batch tool-life prediction input — passthrough until BatchLifeInput surfaced"),
  turning_thread_optimize: z.object({}).passthrough().describe("Thread optimizer input — passthrough until ThreadOptimizeInput surfaced"),
  lathe_classify_part: z.object({}).passthrough().describe("Part-geometry classifier input — passthrough until PartGeometryInput surfaced"),
  // LATHE-WIRE-MS0/Batch2: safety + planning + sequencing
  lathe_safety_signals: z.object({}).passthrough().describe("SafetySignalInput for LatheSafetySignalEngine.compute() — chuck/material/FRF/machine context"),
  lathe_multi_op_plan: z.object({}).passthrough().describe("MultiOpInput for LatheMultiOpPlannerEngine.plan() — multi-op sequence planning"),
  lathe_sequence_optimize: z.object({
    operations: z.array(z.unknown()).min(1).describe("SequenceOperation[] — operation list to reorder/optimize"),
    constraints: z.record(z.string(), z.unknown()).optional().describe("SequenceConstraints — optional ordering/timing constraints"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch3: partoff safety + SLO registry + job scheduling
  lathe_partoff_safety_eval: z.object({
    op: z.record(z.string(), z.unknown()).describe("PartoffOpSpec — partoff op definition (D, fr, blade thickness, overhang, etc.)"),
  }).passthrough(),
  lathe_slo_evaluate: z.object({
    metric: z.record(z.string(), z.unknown()).describe("LatheSLOMetric — measured metric value with type tag"),
  }).passthrough(),
  lathe_job_schedule: z.object({
    input: z.record(z.string(), z.unknown()).describe("ScheduleInput — jobs[], machines[], constraints for shop scheduler"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch4: cost reconcile + job profitability + inventory upsert
  lathe_cost_reconcile: z.object({
    input: z.record(z.string(), z.unknown()).describe("ReconcileInput — actual vs estimated cost reconciliation context for LatheActualCostReconciliationEngine.reconcile()"),
  }).passthrough(),
  lathe_job_profitability_record: z.object({
    input: z.record(z.string(), z.unknown()).describe("RecordJobInput — job financial record for LatheJobProfitabilityAnalyticsEngine.recordJob()"),
  }).passthrough(),
  lathe_inventory_upsert: z.object({
    input: z.record(z.string(), z.unknown()).describe("UpsertItemInput — SKU + stock level upsert for LatheInventoryIntelligenceEngine.upsertItem()"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch5: print pipeline (strategy plan + sequence plan + setup select)
  lathe_print_strategy_plan: z.object({
    features: z.array(z.record(z.string(), z.unknown())).describe("FeatureInput[] — print features (face, OD turn, ID bore, thread, groove)"),
    material: z.record(z.string(), z.unknown()).describe("MaterialInput — workpiece material spec for strategy selection"),
    machine: z.record(z.string(), z.unknown()).optional().describe("MachineCapability — optional lathe capability constraints"),
    tolerance: z.record(z.string(), z.unknown()).optional().describe("ToleranceStackOutput — optional tolerance-stack-driven hints"),
  }).passthrough(),
  lathe_print_sequence_plan: z.object({
    strategy_plan: z.record(z.string(), z.unknown()).describe("StrategyPlan from lathe_print_strategy_plan — operation list with strategies"),
    stock: z.record(z.string(), z.unknown()).describe("StockInput — initial stock dimensions"),
    features: z.array(z.record(z.string(), z.unknown())).describe("FeatureInput[] — print features for geometry context"),
  }).passthrough(),
  lathe_print_setup_select: z.object({
    geometry: z.record(z.string(), z.unknown()).describe("PartGeometry — inferred or specified part geometry"),
    material: z.record(z.string(), z.unknown()).describe("MaterialInput — workpiece material for clamping force calc"),
    loads: z.record(z.string(), z.unknown()).describe("CuttingLoadInput — cutting force loads for chuck-grip sizing"),
    chucks: z.array(z.record(z.string(), z.unknown())).optional().describe("ChuckSpec[] — optional candidate chucks (defaults supplied if omitted)"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch6: post processor + dialect validator + spec ingest
  lathe_post_process: z.object({
    input: z.record(z.string(), z.unknown()).describe("LatheInput — toolpath + ops + tool list to post-process"),
    config: z.record(z.string(), z.unknown()).describe("LathePostConfig — controller dialect + machine config"),
  }).passthrough(),
  lathe_post_dialect_compare: z.object({
    reference_path: z.string().describe("File path of the reference G-code program (for diagnostics)"),
    reference_content: z.string().describe("Reference G-code program content (golden master)"),
    generated_content: z.string().describe("Generated G-code program content to validate against reference"),
  }).passthrough(),
  lathe_post_spec_ingest: z.object({
    input: z.record(z.string(), z.unknown()).describe("SpecIngestionInput — controller spec to ingest into the post-generator catalog"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch7: print pipeline (emit + signoff + ingest)
  lathe_print_program_emit: z.object({
    program: z.record(z.string(), z.unknown()).describe("ToolpathProgram — sequence of operations + tool list to emit as G-code"),
    options: z.record(z.string(), z.unknown()).describe("EmitOptions — formatting, header, comment style, line numbers"),
  }).passthrough(),
  lathe_print_program_signoff: z.object({
    input: z.record(z.string(), z.unknown()).describe("SignoffInput — program + verification artifacts to package for sign-off"),
  }).passthrough(),
  lathe_print_ingest: z.object({
    input: z.object({
      raw_text: z.string().min(1).describe("Raw blueprint text (from PDF/OCR/DXF/text)"),
      filename: z.string().optional().describe("Source filename (for diagnostics)"),
      format: z.enum(["pdf", "image", "dxf", "text"]).optional().describe("Source format hint (defaults to 'text')"),
      page_count: z.number().int().min(1).optional().describe("Page count if multi-page"),
    }).passthrough().describe("BlueprintIntake input — raw_text + format hints"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch8: customer order + ERP orchestrator + master post router
  lathe_customer_order_create: z.object({
    input: z.record(z.string(), z.unknown()).describe("CreateOrderInput — customer + parts + due date for LatheCustomerOrderLifecycleEngine.createOrder()"),
  }).passthrough(),
  lathe_erp_full: z.object({
    input: z.record(z.string(), z.unknown()).describe("ERPFullInput — full ERP packet (orders, inventory, scheduling) for LatheERPOrchestratorEngine.erpFull()"),
  }).passthrough(),
  lathe_masterpost_route: z.object({
    input: z.record(z.string(), z.unknown()).describe("LatheRouteInput — controller + machine context for LatheMasterPostRouterEngine.route() to pick the right post"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch9: master post API (emit + validate + audit) — static methods on LatheMasterPostAPIEngine
  lathe_masterpost_emit: z.object({
    input: z.record(z.string(), z.unknown()).describe("EmitInput — toolpath + dialect context for LatheMasterPostAPIEngine.emit() to produce G-code"),
  }).passthrough(),
  lathe_masterpost_validate: z.object({
    input: z.record(z.string(), z.unknown()).describe("ValidateInput — emitted program + reference for LatheMasterPostAPIEngine.validate() to verify correctness"),
  }).passthrough(),
  lathe_masterpost_audit: z.object({
    input: z.record(z.string(), z.unknown()).describe("AuditInput — context for LatheMasterPostAPIEngine.audit() to produce audit log entry"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch10: AI sequence + auto quote + orchestration pipeline
  lathe_ai_optimize_sequence: z.object({
    operations: z.array(z.record(z.string(), z.unknown())).min(1).describe("Operation list (id, type, tool_type, priority?) for LatheAIReasoningEngine.optimizeSequence()"),
  }).passthrough(),
  lathe_auto_quote: z.object({
    input: z.record(z.string(), z.unknown()).describe("AutoQuoteInput — print + customer + qty for LatheAutoQuoteFromPrintEngine.generateQuote()"),
  }).passthrough(),
  lathe_orchestrate: z.object({
    input: z.record(z.string(), z.unknown()).describe("LatheOrchestrationInput — full pipeline input (features, material, tools, machine, etc.)"),
    orch_action: z.string().optional().describe("Optional pipeline action tag (defaults to 'default'); first arg to LatheOrchestrationEngine.calculate()"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch11: feature recognize + tolerance stack + toolpath generate
  lathe_feature_recognize: z.object({
    intake: z.record(z.string(), z.unknown()).describe("BlueprintIntake from a prior lathe_print_ingest action — drives turning-feature recognition"),
  }).passthrough(),
  lathe_tolerance_stack_analyze: z.object({
    features: z.array(z.record(z.string(), z.unknown())).min(1).describe("RecognizedFeature[] — recognized print features for tolerance stack analysis"),
    budget_mm: z.number().describe("Total tolerance budget in mm (drives Cpk target assignment)"),
  }).passthrough(),
  lathe_toolpath_generate: z.object({
    sequence_plan: z.record(z.string(), z.unknown()).describe("SequencePlan from a prior lathe_print_sequence_plan action"),
    features: z.array(z.record(z.string(), z.unknown())).describe("FeatureInput[] — print features for geometry context"),
    material: z.record(z.string(), z.unknown()).describe("MaterialInput — workpiece material for cutting-data lookup"),
    limits: z.record(z.string(), z.unknown()).optional().describe("MachineLimits — optional envelope/feed/spindle caps (defaults supplied if omitted)"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch12: workholding jaw + safety predicate verify + proof-carrying emit
  lathe_workholding_jaw_select: z.object({
    input: z.record(z.string(), z.unknown()).describe("JawSelectionInput — part diameter + length + material + grip context for LatheWorkholdingEngine.selectJaw()"),
  }).passthrough(),
  lathe_safety_predicate_verify: z.object({
    signals: z.record(z.string(), z.unknown()).describe("LatheSafetySignals — chuck/material/FRF/machine signals for LatheSafetyPredicateEngine.verify()"),
    envelope: z.record(z.string(), z.unknown()).optional().describe("EnvelopeCheck — optional machine envelope constraints (defaults pulled from machine config if omitted)"),
  }).passthrough(),
  lathe_proof_carrying_emit: z.object({
    input: z.record(z.string(), z.unknown()).describe("ProofEmitInput — toolpath + safety predicate verdict + machine context for LatheProofCarryingEmitEngine.emit()"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch13: master post explain + ensemble cross-check + unified output
  lathe_masterpost_explain: z.object({
    input: z.record(z.string(), z.unknown()).describe("DeepReasoningInput — machineId + feature set for LatheMasterPostDeepReasoningEngine.explainSelection()"),
  }).passthrough(),
  lathe_masterpost_ensemble: z.object({
    input: z.record(z.string(), z.unknown()).describe("EnsembleInput — machineId + sub-post candidates for LatheMasterPostEnsembleCrossCheckEngine.runEnsemble()"),
  }).passthrough(),
  lathe_masterpost_unified_output: z.object({
    config: z.record(z.string(), z.unknown()).describe("UnifiedHeaderConfig (with optional footerConfig) for LatheMasterPostUnifiedOutputEngine.generateUnifiedOutput() — class export, no singleton const"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch14: print-to-program AI trio (reasoning + knowledge graph + DL prediction)
  lathe_p2p_reasoning_explain: z.object({
    input: z.record(z.string(), z.unknown()).describe("ReasoningInput — features + decisions + alternatives for LathePrintToProgramReasoningEngine.explain()"),
  }).passthrough(),
  lathe_p2p_knowledge_graph_ingest: z.object({
    input: z.record(z.string(), z.unknown()).describe("IngestionInput — job + customer + tools + outcomes for LathePrintToProgramKnowledgeGraphEngine.ingest()"),
  }).passthrough(),
  lathe_p2p_dl_predict: z.object({
    input: z.record(z.string(), z.unknown()).describe("DLInput — feature vector for LathePrintToProgramDLIntelligenceEngine.predict() — returns FailurePrediction"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch15: dialect post + PO automation + adaptive recorder
  lathe_post_dialect_generate: z.object({
    input: z.record(z.string(), z.unknown()).describe("DialectGenerationInput — controllerId + cycles + parameters for LathePostGeneratorDialectEngine.generate() — returns GeneratedGCode"),
  }).passthrough(),
  lathe_po_build: z.object({
    input: z.record(z.string(), z.unknown()).describe("BuildPOInput — vendor + items + inventory_on_hand for LathePurchaseOrderAutomationEngine.build() — returns BuildPOResult"),
  }).passthrough(),
  lathe_adaptive_record: z.object({
    input: z.record(z.string(), z.unknown()).describe("TurningEngagementProfile — operation profile for LatheAdaptiveMachiningEngine.recordOperation() — appends to operation history"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch16: AGI continuous learning + feature bridge + safety
  lathe_agi_continuous_record: z.object({
    input: z.record(z.string(), z.unknown()).describe("RecordFeedbackInput — {feature, key, kind, sample} for LatheAGIContinuousLearningEngine.recordFeedback() — updates EWMA slot, returns Slot"),
  }).passthrough(),
  lathe_agi_feature_reason: z.object({
    input: z.record(z.string(), z.unknown()).describe("AGIReasonInput — feature + payload for LatheAGIFeatureBridgeEngine.reason() — returns AGIReasonResult with confidence + history"),
  }).passthrough(),
  lathe_agi_safety_check: z.object({
    input: z.record(z.string(), z.unknown()).describe("SafetyCheckInput — candidates (speed_feed/quote/schedule/kinematic) for LatheAGISafetyContainmentEngine.check() — returns SafetyReport"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch17: LoRA cadence + dataset stats + drift detection
  lathe_lora_cadence_status: z.object({}).passthrough().describe("No input — returns LatheLoRACadenceEngine.shouldTriggerRun() + getState() + getConfig() snapshot"),
  lathe_lora_dataset_stats: z.object({}).passthrough().describe("No input — returns LatheLoRADatasetBuilderEngine.getStats() — DatasetStats with example counts + format breakdown"),
  lathe_lora_drift_detect: z.object({
    input: z.record(z.string(), z.unknown()).describe("{modelId: string} — runs LatheLoRADriftDetectorEngine.detectDrift() + needsRetraining() for the model"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch18: LoRA refinement + deployment + benchmark
  lathe_lora_refinement_start: z.object({
    input: z.record(z.string(), z.unknown()).describe("{query: string, initialResponse: string} for LatheLoRAAdaptiveRefinementEngine.startSession() — opens new RefinementSession"),
  }).passthrough(),
  lathe_lora_deploy_register: z.object({
    input: z.record(z.string(), z.unknown()).describe("DeploymentTarget — full target descriptor for LatheLoRADeploymentEngine.registerTarget() — adds canary-deployable target"),
  }).passthrough(),
  lathe_lora_benchmark_test_cases: z.object({}).passthrough().describe("No input — returns LatheLoRABenchmarkSuiteEngine.getTestCases() + getConfig() — current benchmark suite snapshot"),
  // LATHE-WIRE-MS0/Batch19: LoRA attention + validator + example generator
  lathe_lora_attention_stats: z.object({}).passthrough().describe("No input — returns LatheLoRAAttentionAnalyzerEngine.getStats() + getConfig() — attention analysis aggregate stats"),
  lathe_lora_dataset_validate_one: z.object({
    input: z.record(z.string(), z.unknown()).describe("LoRAExample | TrainingExample for LatheLoRADatasetValidatorEngine.validateSingle() — returns ValidationIssue[]"),
  }).passthrough(),
  lathe_lora_example_gen_stats: z.object({}).passthrough().describe("No input — returns LatheLoRAExampleGeneratorEngine.getStats() — GenerationStats with counts + timing"),
  // LATHE-WIRE-MS0/Batch20: ensemble voter + embedding cache + AGI KG
  lathe_lora_ensemble_vote: z.object({
    input: z.record(z.string(), z.unknown()).describe("{predictions: ModelPrediction[], strategy?: VotingStrategy} for LatheLoRAEnsembleVoterEngine.vote() — returns VotingResult with consensus + weights"),
  }).passthrough(),
  lathe_lora_embedding_stats: z.object({}).passthrough().describe("No input — returns LatheLoRAEmbeddingCacheEngine.getStats() — CacheStats with hit/miss + entry counts"),
  lathe_agi_kg_query: z.object({
    input: z.record(z.string(), z.unknown()).describe("QueryInput - {nodeType?, edgeType?, filter?} for LatheAGIKnowledgeUnificationEngine.query() — returns QueryResult"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch21: ensemble combiner + continual learning + cron
  lathe_lora_combiner_remove_outliers: z.object({
    input: z.record(z.string(), z.unknown()).describe("{values: number[]} for LatheLoRAEnsembleCombinerEngine.removeOutliers() — returns {filtered, removedCount}"),
  }).passthrough(),
  lathe_lora_continual_replay_buffer: z.object({
    input: z.record(z.string(), z.unknown()).describe("{limit?: number} for LatheLoRAContinualLearningEngine.getReplayBuffer() — returns Experience[] from replay buffer"),
  }).passthrough(),
  lathe_lora_cron_list_jobs: z.object({}).passthrough().describe("No input — returns LatheLoRACronJobEngine.getAllJobs() + getConfig() — current cron job registry"),
  // LATHE-WIRE-MS0/Batch22: feature inference + speed-feed facade
  lathe_program_feature_infer_one: z.object({
    input: z.record(z.string(), z.unknown()).describe("InferenceOperationView - single op view for LatheProgramFeatureInferenceEngine.inferOne() — returns InferredFeature"),
  }).passthrough(),
  lathe_sf_calculate: z.object({
    input: z.record(z.string(), z.unknown()).describe("LatheSpeedFeedInput - material + tool + operation for LatheSpeedFeedCalculatorFacadeEngine.calculate() (static) — returns LatheSpeedFeedResult"),
  }).passthrough(),
  lathe_sf_supported_materials: z.object({}).passthrough().describe("No input — returns LatheSpeedFeedCalculatorFacadeEngine.listSupportedMaterials() + getVersion() (static) — supported material list + facade version"),
  // LATHE-WIRE-MS0/Batch23: cadence orch + ensemble orch + experiment tracker
  lathe_lora_cadence_orch_active: z.object({
    input: z.record(z.string(), z.unknown()).describe("{modelId: string} for LatheLoRACadenceOrchestratorEngine.getActiveRun() + canTrain() — returns active run + train-readiness"),
  }).passthrough(),
  lathe_lora_ensemble_orch_stats: z.object({}).passthrough().describe("No input — returns LatheLoRAEnsembleOrchestratorEngine.getStats() + getActiveRuns()"),
  lathe_lora_experiment_create: z.object({
    input: z.record(z.string(), z.unknown()).describe("{name: string, hyperparameters: object, tags?: string[]} for LatheLoRAExperimentTrackerEngine.createExperiment() — returns Experiment"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch24: health monitor + model registry + safety evaluator
  lathe_lora_health_alerts: z.object({
    input: z.record(z.string(), z.unknown()).describe("{modelId?: string} for LatheLoRAHealthMonitorEngine.getActiveAlerts() — returns active Alert[] (filtered by modelId if provided)"),
  }).passthrough(),
  lathe_lora_model_registry_query: z.object({
    input: z.record(z.string(), z.unknown()).describe("RegistryQuery - {parent_id?, status?, tags?} for LatheLoRAModelRegistryEngine.query() — returns RegisteredModel[]"),
  }).passthrough(),
  lathe_lora_safety_evaluate: z.object({
    input: z.record(z.string(), z.unknown()).describe("{output: string, context?: {operation?}} for LatheLoRASafetyEvaluatorEngine.evaluate() — returns SafetyEvaluation"),
  }).passthrough(),
  // LATHE-WIRE-MS0/Batch25: model selector + verification + resource manager
  lathe_lora_model_selector_models: z.object({}).passthrough().describe("No input — returns LatheLoRAModelSelectorEngine.getModels() + getStats() — registered model descriptors + selector stats"),
  lathe_lora_verification_history: z.object({
    input: z.record(z.string(), z.unknown()).describe("{modelId?: string, limit?: number=10} for LatheLoRAVerificationEngine.getHistory() — returns VerificationSuiteResult[]"),
  }).passthrough(),
  lathe_lora_resource_pools: z.object({}).passthrough().describe("No input — returns LatheLoRAResourceManagerEngine.getPools() — current ResourcePool[] with availability"),
  // LATHE-WIRE-MS0/Batch26: knowledge graph + quantization + reward shaping
  lathe_lora_kg_top_connected: z.object({
    input: z.record(z.string(), z.unknown()).describe("{limit?: number=10} for LatheLoRAKnowledgeGraphEngine.getTopConnected() — returns top-N nodes by degree centrality"),
  }).passthrough(),
  lathe_lora_quant_formats: z.object({}).passthrough().describe("No input — returns LatheLoRAQuantizationOptimizerEngine.getFormats() + getGGUFLevels() — quantization format catalog"),
  lathe_lora_reward_config: z.object({}).passthrough().describe("No input — returns LatheLoRARewardShapingEngine.getConfig() — current reward shaping config"),
};
