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
};
