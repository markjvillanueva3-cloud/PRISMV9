/**
 * Welding & Joining Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();

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
  weld_distortion_calculate: z.object({ weld_length_mm: optPosNum, weld_type: z.enum(["butt", "fillet", "lap", "groove"]).optional(), heat_input_kj_mm: optPosNum, ...weldBaseParams }).passthrough(),
  weld_strength_calculate: z.object({ weld_type: z.enum(["butt", "fillet", "lap", "groove"]).optional(), weld_size_mm: optPosNum, weld_length_mm: optPosNum, ...weldBaseParams }).passthrough(),
  welding_calculate: z.object({ process: z.enum(["mig", "tig", "stick", "flux_core", "sub_arc", "laser", "electron_beam"]).optional(), current_a: optPosNum, voltage_v: optPosNum, travel_speed_mmps: optPosNum, ...weldBaseParams }).passthrough(),
};
