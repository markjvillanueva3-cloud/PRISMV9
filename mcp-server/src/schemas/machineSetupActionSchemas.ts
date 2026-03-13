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
};
