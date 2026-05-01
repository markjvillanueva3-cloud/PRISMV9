/**
 * Forming & Casting Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const simpleCalc = z.object({ material: optStr, material_id: optStr }).passthrough();

export const FORMING_CASTING_ACTION_SCHEMAS: ActionSchemaMap = {
  blow_molding_calculate: simpleCalc,
  casting_defect_analyze: simpleCalc,
  extrusion_force_calculate: z.object({ billet_diameter_mm: optPosNum, die_diameter_mm: optPosNum, material: optStr }).passthrough(),
  filament_winding_calculate: z.object({ mandrel_diameter_mm: optPosNum, winding_angle_deg: optNum, fiber_type: optStr }).passthrough(),
  powder_compaction_calculate: z.object({ pressure_mpa: optPosNum, powder_type: optStr, die_diameter_mm: optPosNum }).passthrough(),
  press_brake_calculate: z.object({ material: optStr, thickness_mm: optPosNum, bend_angle_deg: optNum, bend_length_mm: optPosNum, die_opening_mm: optPosNum }).passthrough(),
  pultrusion_calculate: simpleCalc,
  resin_transfer_calculate: simpleCalc,
  rolling_mill_calculate: z.object({ initial_thickness_mm: optPosNum, final_thickness_mm: optPosNum, roll_diameter_mm: optPosNum, material: optStr }).passthrough(),
  sheet_metal_nesting_optimize: z.object({ parts: z.array(z.object({ width: z.number(), height: z.number() })).optional(), sheet_width_mm: optPosNum, sheet_length_mm: optPosNum }).passthrough(),
  stamping_die_calculate: z.object({ material: optStr, thickness_mm: optPosNum, blank_diameter_mm: optPosNum }).passthrough(),
  thermoforming_calculate: simpleCalc,
  tube_forming_calculate: z.object({ outer_diameter_mm: optPosNum, wall_thickness_mm: optPosNum, bend_radius_mm: optPosNum }).passthrough(),
  wire_drawing_calculate: z.object({ initial_diameter_mm: optPosNum, final_diameter_mm: optPosNum, material: optStr }).passthrough(),
  flat_pattern_calculate: z.object({ bend_radius_mm: optPosNum, material_thickness_mm: optPosNum, bend_angle_deg: optNum, k_factor: optNum }).passthrough(),
  calendering_calculate: simpleCalc,
  compression_molding_calc: z.object({ material: optStr, cavity_pressure_mpa: optPosNum, charge_weight_kg: optPosNum, temperature_c: optPosNum }).passthrough(),
  rotational_molding_calc: z.object({ material: optStr, wall_thickness_mm: optPosNum, mold_diameter_mm: optPosNum, rotation_speed_rpm: optPosNum }).passthrough(),
  vacuum_casting_calc: z.object({ material: optStr, mold_type: optStr, vacuum_pressure_mbar: optPosNum, pour_temperature_c: optPosNum }).passthrough(),
  centrifugal_casting_calc: z.object({ material: optStr, inner_diameter_mm: optPosNum, outer_diameter_mm: optPosNum, rotation_speed_rpm: optPosNum }).passthrough(),
};
