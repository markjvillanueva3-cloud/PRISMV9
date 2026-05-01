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
};
