/**
 * Vibration & Dynamics Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const simpleCalc = z.object({}).passthrough();

export const VIBRATION_ACTION_SCHEMAS: ActionSchemaMap = {
  vam_calculate: z.object({ frequency_hz: optPosNum, amplitude_um: optPosNum, tool_diameter_mm: optPosNum, cutting_speed_mpm: optPosNum }).passthrough(),
  vibration_dampening_calculate: z.object({ natural_frequency_hz: optPosNum, damping_ratio: optNum, excitation_frequency_hz: optPosNum }).passthrough(),
  vibration_isolation_calculate: z.object({ machine_mass_kg: optPosNum, disturbance_frequency_hz: optPosNum, isolation_efficiency_pct: optNum }).passthrough(),
  fourier_analysis: z.object({ signal: z.array(z.number()).optional(), sample_rate_hz: optPosNum }).passthrough(),
  wavelet_analysis: z.object({ signal: z.array(z.number()).optional(), wavelet_type: optStr }).passthrough(),
  regenerative_chatter_predict: z.object({ spindle_rpm: optPosNum, depth_of_cut_mm: optPosNum, tool_diameter_mm: optPosNum, num_flutes: z.number().int().optional() }).passthrough(),
  burr_formation_calculate: z.object({ material: optStr, tool_diameter_mm: optPosNum, feed_per_tooth_mm: optPosNum, depth_of_cut_mm: optPosNum }).passthrough(),
  chip_conveyor_calculate: z.object({ chip_volume_rate: optPosNum, chip_type: optStr, conveyor_length_m: optPosNum }).passthrough(),
  cutter_contact_calculate: z.object({ tool_diameter_mm: optPosNum, step_over_mm: optPosNum, surface_curvature: optNum }).passthrough(),
  tribology_calculate: z.object({ contact_pressure_mpa: optPosNum, sliding_velocity_mps: optPosNum, material_pair: optStr }).passthrough(),
  surface_finish_calculate: z.object({ feed_per_rev_mm: optPosNum, nose_radius_mm: optPosNum, cutting_speed_mpm: optPosNum }).passthrough(),
  surface_grinding_calculate: z.object({ wheel_diameter_mm: optPosNum, wheel_speed_mps: optPosNum, table_speed_mpm: optPosNum, depth_of_cut_mm: optPosNum }).passthrough(),
  centerless_grinding_calculate: z.object({ workpiece_diameter_mm: optPosNum, regulating_wheel_rpm: optPosNum, angle_deg: optNum }).passthrough(),
  grinding_wheel_calculate: z.object({ wheel_type: optStr, grade: optStr, bond: optStr, material: optStr }).passthrough(),
  post_processor_generate: z.object({ controller_type: optStr, machine_type: optStr }).passthrough(),
  tap_drill_calculate: z.object({ thread_size: optStr, pitch_mm: optPosNum, thread_type: z.enum(["metric", "unified", "npt", "bsp"]).optional(), percent_thread: optNum }).passthrough(),
};
