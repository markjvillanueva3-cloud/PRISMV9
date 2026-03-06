/**
 * PRISM Param Normalizer
 * ======================
 * Normalizes snake_case params to camelCase for safety/calc/thread dispatchers.
 * Applied at dispatcher entry before handler functions.
 * 
 * @version 1.0.0 — H1-MS2
 */

/** Snake→camel alias map for manufacturing parameters */
const PARAM_ALIASES: Record<string, string> = {
  // Geometry
  tool_diameter: "toolDiameter",
  axial_depth: "axialDepth",
  radial_depth: "radialDepth",
  depth_of_cut: "depthOfCut",
  width_of_cut: "widthOfCut",
  stick_out: "stickout",
  stickout_length: "stickout",
  tool_length: "toolLength",
  flute_length: "fluteLength",
  point_angle: "pointAngle",
  helix_angle: "helixAngle",
  lead_angle: "leadAngle",
  nose_radius: "noseRadius",
  corner_radius: "cornerRadius",
  
  // Cutting params
  cutting_speed: "cuttingSpeed",
  spindle_speed: "spindleSpeed",
  feed_rate: "feedRate",
  feed_per_tooth: "feedPerTooth",
  feed_per_rev: "feedPerRev",
  surface_speed: "surfaceSpeed",
  chip_load: "chipLoad",
  
  // Tool properties
  num_flutes: "numberOfFlutes",
  number_of_flutes: "numberOfFlutes",
  tool_material: "toolMaterial",
  tool_type: "toolType",
  tool_coating: "toolCoating",
  
  // Thread params
  thread_type: "threadType",
  thread_size: "threadSize",
  thread_pitch: "threadPitch",
  tap_drill: "tapDrill",
  pitch_diameter: "pitchDiameter",
  major_diameter: "majorDiameter",
  minor_diameter: "minorDiameter",
  threads_per_inch: "threadsPerInch",
  
  // Process params
  material_type: "materialType",
  work_material: "workMaterial",
  coolant_type: "coolantType",
  coolant_pressure: "coolantPressure",
  surface_finish: "surfaceFinish",
  material_removal_rate: "materialRemovalRate",
};

/** Reverse map: camelCase → snake_case (for engines that expect snake_case) */
const REVERSE_ALIASES: Record<string, string> = {};
for (const [snake, camel] of Object.entries(PARAM_ALIASES)) {
  if (!REVERSE_ALIASES[camel]) REVERSE_ALIASES[camel] = snake;
}

/**
 * Normalize params: convert any snake_case keys to their camelCase equivalents.
 * Does NOT remove original keys — adds camelCase versions alongside.
 * Returns new object (does not mutate input).
  * @param params - configuration options
  * @returns result object
 */
export function normalizeParams(params: Record<string, any>): Record<string, any> {
  if (!params || typeof params !== "object") return params;
  const result = { ...params };
  let remapped = 0;
  
  for (const [key, value] of Object.entries(params)) {
    const alias = PARAM_ALIASES[key];
    if (alias && !(alias in result)) {
      result[alias] = value;
      remapped++;
    }
  }
  
  // SYS-MS6-U03: Type coercion — string numbers → actual numbers for known numeric fields
  const NUMERIC_FIELDS = new Set([
    "toolDiameter", "tool_diameter", "axialDepth", "axial_depth", "radialDepth", "radial_depth",
    "depthOfCut", "depth_of_cut", "widthOfCut", "width_of_cut", "cuttingSpeed", "cutting_speed",
    "spindleSpeed", "spindle_speed", "feedRate", "feed_rate", "feedPerTooth", "feed_per_tooth",
    "feedPerRev", "feed_per_rev", "surfaceSpeed", "surface_speed", "chipLoad", "chip_load",
    "coolantPressure", "coolant_pressure", "stickout", "stickout_length", "stick_out",
    "toolLength", "tool_length", "fluteLength", "flute_length", "rakeAngle", "rake_angle",
    "noseRadius", "nose_radius", "cornerRadius", "corner_radius", "pointAngle", "point_angle",
    "helixAngle", "helix_angle", "leadAngle", "lead_angle", "numberOfFlutes", "num_flutes",
    "number_of_flutes", "threadPitch", "thread_pitch", "pitchDiameter", "pitch_diameter",
    "majorDiameter", "major_diameter", "minorDiameter", "minor_diameter",
    "threadsPerInch", "threads_per_inch", "kc1_1", "mc", "taylor_C", "taylor_n",
    "width_mm", "length_mm", "depth_mm", "diameter_mm", "stepover_pct", "stepdown_mm",
    "feed_rate_mmmin", "plunge_rate_mmmin", "spindle_rpm", "retract_height_mm", "stock_to_leave_mm",
  ]);
  let coerced = 0;
  for (const [key, value] of Object.entries(result)) {
    if (NUMERIC_FIELDS.has(key) && typeof value === "string") {
      const num = Number(value);
      if (!isNaN(num)) {
        result[key] = num;
        coerced++;
      }
    }
  }

  if (remapped > 0) {
    result._param_remaps = remapped;
  }
  if (coerced > 0) {
    result._param_coercions = coerced;
  }
  return result;
}

/**
 * Normalize params to snake_case (for engines that expect snake_case).
  * @param params - configuration options
  * @returns result object
 */
export function normalizeParamsSnake(params: Record<string, any>): Record<string, any> {
  if (!params || typeof params !== "object") return params;
  const result = { ...params };
  
  for (const [key, value] of Object.entries(params)) {
    const alias = REVERSE_ALIASES[key];
    if (alias && !(alias in result)) {
      result[alias] = value;
    }
  }
  return result;
}

export { PARAM_ALIASES, REVERSE_ALIASES };
