/**
 * Material Processing Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const matBaseParams = {
  material: optStr,
  material_id: optStr,
};

const simpleCalc = z.object({ ...matBaseParams }).passthrough();

export const MATERIAL_PROCESSING_ACTION_SCHEMAS: ActionSchemaMap = {
  anodizing_calculate: z.object({ type: z.enum(["type_i", "type_ii", "type_iii", "hard"]).optional(), thickness_um: optPosNum, ...matBaseParams }).passthrough(),
  carburizing_calculate: z.object({ case_depth_mm: optPosNum, temperature_c: optPosNum, time_hours: optPosNum, ...matBaseParams }).passthrough(),
  coating_thickness_calculate: z.object({ coating_type: optStr, target_thickness_um: optPosNum, ...matBaseParams }).passthrough(),
  heat_treatment_calculate: z.object({ process: z.enum(["annealing", "normalizing", "quenching", "tempering", "case_hardening", "aging", "stress_relief"]).optional(), temperature_c: optPosNum, ...matBaseParams }).passthrough(),
  induction_heating_calculate: z.object({ frequency_khz: optPosNum, power_kw: optPosNum, depth_mm: optPosNum, ...matBaseParams }).passthrough(),
  nitriding_calculate: z.object({ process: z.enum(["gas", "plasma", "salt_bath"]).optional(), case_depth_mm: optPosNum, ...matBaseParams }).passthrough(),
  quenching_calculate: z.object({ medium: z.enum(["water", "oil", "polymer", "air", "salt"]).optional(), temperature_c: optPosNum, ...matBaseParams }).passthrough(),
  sintering_calculate: z.object({ temperature_c: optPosNum, time_min: optPosNum, atmosphere: optStr, ...matBaseParams }).passthrough(),
  surface_treatment_calculate: z.object({ process: optStr, ...matBaseParams }).passthrough(),
  autoclave_calculate: z.object({ temperature_c: optPosNum, pressure_bar: optPosNum, time_min: optPosNum, ...matBaseParams }).passthrough(),
  electrochemical_calculate: z.object({ process: optStr, current_density: optPosNum, ...matBaseParams }).passthrough(),
  cryogenic_treatment_calc: z.object({ temperature_c: optNum, hold_time_hours: optPosNum, cooling_rate: optStr, ...matBaseParams }).passthrough(),
  heat_treatment_response_calc: z.object({ process: optStr, temperature_c: optPosNum, time_hours: optPosNum, target_hardness_hrc: optPosNum, ...matBaseParams }).passthrough(),
  shot_peening_calc: z.object({ intensity_mm_a: optPosNum, coverage_pct: optPosNum, media_type: optStr, ...matBaseParams }).passthrough(),
  electroplating_calc: z.object({ metal: optStr, current_density_a_dm2: optPosNum, time_min: optPosNum, thickness_um: optPosNum, ...matBaseParams }).passthrough(),
  passivation_calc: z.object({ acid_type: z.enum(["citric", "nitric"]).optional(), concentration_pct: optPosNum, temperature_c: optPosNum, time_min: optPosNum, ...matBaseParams }).passthrough(),
};
