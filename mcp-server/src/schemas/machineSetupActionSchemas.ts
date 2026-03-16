/**
 * Machine Setup Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for prism_machine_setup actions.
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optNum = z.number().optional();
const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();

const machineBaseParams = {
  machine_id: optStr,
  spindle_rpm: optPosNum,
  max_rpm: optPosNum,
};

const simpleCalc = z.object({ ...machineBaseParams }).passthrough();

export const MACHINE_SETUP_ACTION_SCHEMAS: ActionSchemaMap = {
  balancing_machine_calculate: simpleCalc,
  cnc_maintenance_calculate: simpleCalc,
  critical_speed_calculate: z.object({
    shaft_diameter_mm: optPosNum,
    shaft_length_mm: optPosNum,
    bearing_span_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  dynamic_balance_calculate: z.object({
    rotor_mass_kg: optPosNum,
    rotor_diameter_mm: optPosNum,
    speed_rpm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  machine_kinematics_calculate: simpleCalc,
  machine_leveling_calculate: simpleCalc,
  machine_warmup_calculate: z.object({
    warmup_duration_min: optPosNum,
    ambient_temp_c: optNum,
    ...machineBaseParams,
  }).passthrough(),
  rtcp_compensation_calculate: simpleCalc,
  spindle_load_monitor: z.object({
    current_load_pct: optNum,
    threshold_pct: optNum,
    ...machineBaseParams,
  }).passthrough(),
  spindle_runout_calculate: z.object({
    measured_runout_um: optPosNum,
    tool_diameter_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  spindle_speed_variation: simpleCalc,
  work_envelope_calculate: z.object({
    x_travel_mm: optPosNum,
    y_travel_mm: optPosNum,
    z_travel_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  tool_magazine_optimize: z.object({
    tool_count: z.number().int().positive().optional(),
    magazine_capacity: z.number().int().positive().optional(),
    ...machineBaseParams,
  }).passthrough(),
  tool_balancing_calculate: z.object({
    tool_diameter_mm: optPosNum,
    tool_length_mm: optPosNum,
    speed_rpm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  fixture_plate_calculate: simpleCalc,
  magnetic_bearing_calculate: simpleCalc,
  press_fit_calculate: z.object({
    shaft_diameter_mm: optPosNum,
    hole_diameter_mm: optPosNum,
    interference_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  shrink_fit_calculate: z.object({
    shaft_diameter_mm: optPosNum,
    bore_diameter_mm: optPosNum,
    temperature_delta_c: optNum,
    ...machineBaseParams,
  }).passthrough(),
  gauging_calculate: simpleCalc,
  parallelism_calculate: simpleCalc,
  surface_integrity_assess: simpleCalc,
  thread_gage_calculate: z.object({
    thread_size: optStr,
    pitch_mm: optPosNum,
    class: optStr,
    ...machineBaseParams,
  }).passthrough(),
  tolerance_stackup_calculate: z.object({
    dimensions: z.array(z.object({
      nominal: z.number(),
      tolerance: z.number(),
    })).optional(),
    ...machineBaseParams,
  }).passthrough(),
  stepover_optimize: z.object({
    tool_diameter_mm: optPosNum,
    target_roughness_ra: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  statistical_process_calculate: simpleCalc,
  // Hobby CNC
  hobby_cnc_get: z.object({ machine_id: z.string() }).passthrough(),
  hobby_cnc_search: z.object({
    controller: optStr,
    min_travel_x: optPosNum,
    min_travel_y: optPosNum,
    min_travel_z: optPosNum,
    max_price: optPosNum,
    min_price: optPosNum,
    spindle_power_min: optPosNum,
    material: optStr,
    manufacturer: optStr,
    min_axes: z.number().int().positive().optional(),
  }).passthrough(),
  hobby_cnc_controller: z.object({ controller: z.string() }).passthrough(),
  hobby_cnc_compatibility: z.object({
    machine_id: z.string(),
    gcode: z.string(),
  }).passthrough(),
  hobby_cnc_recommend: z.object({
    budget: optPosNum,
    material: optStr,
    work_area_needed: z.object({
      x: z.number(), y: z.number(), z: z.number(),
    }).optional(),
    features_needed: z.array(z.string()).optional(),
  }).passthrough(),
  // Cobot Machining
  cobot_assess_safety: z.object({
    cobot_model: z.string(),
    operation: z.string(),
    tool_rpm: z.number(),
    cutting_force_N: z.number(),
    operator_distance_m: z.number(),
  }).passthrough(),
  cobot_plan_task: z.object({
    cobot_payload_kg: z.number().positive(),
    spindle_weight_kg: z.number().positive(),
    part_material: z.string(),
    operation: z.string(),
    reach_mm: z.number().positive(),
  }).passthrough(),
  cobot_select: z.object({
    application: z.string(),
    payload_needed_kg: z.number().positive(),
    reach_needed_mm: z.number().positive(),
    budget: optPosNum,
  }).passthrough(),
};
