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
  
  if (remapped > 0) {
    result._param_remaps = remapped;
  }
  return result;
}

/**
 * Normalize params to snake_case (for engines that expect snake_case).
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
