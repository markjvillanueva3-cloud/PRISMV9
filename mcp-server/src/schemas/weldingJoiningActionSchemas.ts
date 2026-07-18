/**
 * Welding & Joining Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();

// Shared across all 6 welding actions. NOTE: `thickness_mm` here is the base/legacy field used
// by the non-calc actions; welding_calculate/weld_strength/weld_distortion read the engine's
// `plate_thickness_mm` (declared explicitly on those schemas below). A caller sending only
// `thickness_mm` to those three will pass validation but the engine ignores it -- send
// `plate_thickness_mm`.
const weldBaseParams = {
  material: optStr,
  material_id: optStr,
  thickness_mm: optPosNum,
};

const simpleCalc = z.object({ ...weldBaseParams }).passthrough();

export const WELDING_JOINING_ACTION_SCHEMAS: ActionSchemaMap = {
  adhesive_bond_calculate: z.object({ bond_area_mm2: optPosNum, adhesive_type: optStr, ...weldBaseParams }).passthrough(),
  brazing_soldering_calculate: z.object({ filler_metal: optStr, joint_gap_mm: optPosNum, temperature_c: optPosNum, ...weldBaseParams }).passthrough(),
  ultrasonic_welding_calculate: z.object({ frequency_khz: optPosNum, amplitude_um: optPosNum, force_n: optPosNum, ...weldBaseParams }).passthrough(),
  // SCHEMA<->ENGINE REALIGNMENT (slot:bravo 2026-06-19, U-FE-SPECIALTY-WELDING-CONTRACT).
  // The prior schemas validated param names/enums that the engines never read, so these 3
  // actions were dead-on-arrival at the dispatcher round-trip (NaN / 400 / wrong branch).
  // Verified no working caller depended on the old names (only an action-NAME ref in a test).
  // Each field below now matches the engine's actual {Input} interface; .passthrough() kept.
  // weld_distortion -> WeldDistortionInput (reads joint_type, NOT weld_type).
  weld_distortion_calculate: z.object({ joint_type: z.enum(["butt", "fillet_t", "fillet_lap", "corner"]).optional(), plate_thickness_mm: optPosNum, weld_length_mm: optPosNum, leg_size_mm: optPosNum, heat_input_kj_mm: optPosNum, restraint_level: z.enum(["free", "moderate", "rigid"]).optional(), num_passes: optPosNum, joint_gap_mm: optPosNum, ...weldBaseParams }).passthrough(),
  // weld_strength -> WeldStrengthInput (weld_type enum is fillet/butt_full/butt_partial/plug).
  weld_strength_calculate: z.object({ weld_type: z.enum(["fillet", "butt_full", "butt_partial", "plug"]).optional(), leg_size_mm: optPosNum, weld_length_mm: optPosNum, plate_thickness_mm: optPosNum, force_n: optPosNum, force_direction: z.enum(["parallel", "transverse", "combined"]).optional(), moment_nm: optNum, electrode: z.enum(["E60", "E70", "E80", "E90", "E110"]).optional(), base_metal_yield_mpa: optPosNum, joint_type: z.enum(["lap", "tee", "corner", "butt"]).optional(), num_passes: optPosNum, weld_both_sides: optBool, fatigue_cycles: optPosNum, inspection_level: z.enum(["visual", "MT_PT", "RT_UT"]).optional(), ...weldBaseParams }).passthrough(),
  // welding -> WeldingInput (process is the AWS code, NOT mig/tig; params are PascalCase + mm/min).
  welding_calculate: z.object({ process: z.enum(["smaw", "gmaw", "gtaw", "fcaw", "saw", "laser", "electron_beam"]).optional(), joint_type: z.enum(["butt", "fillet", "lap", "tee", "corner", "edge"]).optional(), voltage_V: optPosNum, current_A: optPosNum, travel_speed_mm_min: optPosNum, plate_thickness_mm: optPosNum, preheat_temp_C: optNum, interpass_temp_C: optNum, carbon_equivalent: optNum, ...weldBaseParams }).passthrough(),
};
