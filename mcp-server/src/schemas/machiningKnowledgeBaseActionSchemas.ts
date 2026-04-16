/**
 * Machining Knowledge Base Action Schemas — Zod v4
 * 14 actions for MachiningKnowledgeBaseEngine
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const isoGroupZ = z.enum(["P", "M", "K", "N", "S", "H"]).optional();

const kb_lookup_kienzle = z.object({ iso_group: isoGroupZ, material: z.string().optional() }).passthrough();
const kb_lookup_taylor = z.object({ iso_group: isoGroupZ, tool_material: z.string().optional() }).passthrough();
const kb_lookup_speed = z.object({ iso_group: isoGroupZ, operation: z.string().optional() }).passthrough();
const kb_lookup_tap_drill = z.object({ thread_spec: z.string().optional(), system: z.string().optional() }).passthrough();
const kb_calc_tap_drill = z.object({ major_diameter_mm: z.number(), pitch_mm: z.number(), percent_thread: z.number().optional() }).passthrough();
const kb_lookup_chip_load = z.object({ iso_group: isoGroupZ, diameter_mm: z.number().optional() }).passthrough();
const kb_lookup_peck_rule = z.object({ iso_group: isoGroupZ, ld_ratio: z.number().optional() }).passthrough();
const kb_predict_surface_finish = z.object({ type: z.string().optional(), feed_mm: z.number().optional(), radius_mm: z.number().optional(), stepover_mm: z.number().optional() }).passthrough();
const kb_get_sequence_rules = z.object({ machine_type: z.string().optional() }).passthrough();
const kb_get_safe_start = z.object({ controller: z.string().optional() }).passthrough();
const kb_get_coolant = z.object({ iso_group: isoGroupZ, operation: z.string().optional() }).passthrough();
const kb_get_threading_strategy = z.object({ pitch_mm: z.number().optional(), iso_group: isoGroupZ }).passthrough();
const kb_drill_point_depth = z.object({ diameter_mm: z.number(), point_angle_deg: z.number().optional() }).passthrough();
const kb_full_reference = z.object({ iso_group: isoGroupZ }).passthrough();
const kb_chip_thinning = z.object({ ae_mm: z.number(), diameter_mm: z.number(), fz_mm: z.number().optional() }).passthrough();
const kb_corrected_force = z.object({ iso_group: isoGroupZ, ap_mm: z.number().optional(), chip_thickness_mm: z.number().optional(), cutting_speed_m_min: z.number().optional(), rake_angle_deg: z.number().optional(), flank_wear_mm: z.number().optional(), ae_mm: z.number().optional(), diameter_mm: z.number().optional() }).passthrough();
const kb_thermal_derating = z.object({ iso_group: isoGroupZ, continuous_cut_time_sec: z.number().optional(), cutting_speed_m_min: z.number().optional() }).passthrough();
const kb_stability_check = z.object({ iso_group: isoGroupZ, ap_mm: z.number().optional(), ae_mm: z.number().optional(), diameter_mm: z.number().optional() }).passthrough();
const kb_power_check = z.object({ machine_power_kW: z.number().optional(), drive_type: z.string().optional(), required_power_kW: z.number().optional() }).passthrough();

const kb_select_workholding = z.object({ machine_type: z.string(), part_shape: z.string(), part_size_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }), material_iso: z.string().optional(), operation: z.string().optional(), batch_size: z.number().optional(), accuracy_needed_mm: z.number().optional() }).passthrough();
const kb_select_toolpath = z.object({ operation: z.string(), iso_group: isoGroupZ, pocket_depth_mm: z.number().optional(), tool_diameter_mm: z.number().optional(), wall_angle_deg: z.number().optional(), thin_wall: z.boolean().optional(), has_cam: z.boolean().optional() }).passthrough();
const kb_calculate_stock = z.object({ finished_dims_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }), material_form: z.string(), operation_count: z.number().optional(), has_datums: z.boolean().optional() }).passthrough();
const kb_plan_setups = z.object({ part_shape: z.string(), features_top: z.array(z.string()).optional(), features_bottom: z.array(z.string()).optional(), features_sides: z.array(z.string()).optional(), has_through_features: z.boolean().optional(), machine_type: z.string().optional() }).passthrough();
const kb_tool_magazine_rules = z.object({}).passthrough();
const kb_get_toolpath_strategies = z.object({}).passthrough();

export const ACTION_MACHINING_KB_SCHEMAS: ActionSchemaMap = {
  kb_lookup_kienzle, kb_lookup_taylor, kb_lookup_speed, kb_lookup_tap_drill,
  kb_calc_tap_drill, kb_lookup_chip_load, kb_lookup_peck_rule,
  kb_predict_surface_finish, kb_get_sequence_rules, kb_get_safe_start,
  kb_get_coolant, kb_get_threading_strategy, kb_drill_point_depth, kb_full_reference,
  kb_chip_thinning, kb_corrected_force, kb_thermal_derating, kb_stability_check, kb_power_check,
  kb_select_workholding, kb_select_toolpath, kb_calculate_stock, kb_plan_setups,
  kb_tool_magazine_rules, kb_get_toolpath_strategies,
  kb_select_lathe: z.object({ part_diameter_mm: z.number(), part_length_mm: z.number(), has_off_center_features: z.boolean().optional(), has_back_face_features: z.boolean().optional(), has_angled_features: z.boolean().optional(), needs_milling: z.boolean().optional(), annual_volume: z.number().optional(), material_iso: isoGroupZ, max_tolerance_mm: z.number().optional() }).passthrough(),
  kb_get_lathe_capabilities: z.object({}).passthrough(),
  kb_get_turret_layout: z.object({}).passthrough(),
  kb_get_lathe_strategy: z.object({ iso_group: isoGroupZ }).passthrough(),
  kb_get_all_lathe_strategies: z.object({}).passthrough(),
  kb_get_vtl_rules: z.object({}).passthrough(),
  kb_optimize_hole_sequence: z.object({ holes: z.array(z.any()).optional(), machine_power_kW: z.number().optional(), spindle_max_torque_Nm: z.number().optional(), iso_group: isoGroupZ, part_length_mm: z.number().optional() }).passthrough(),
};
