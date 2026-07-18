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

  // Legacy calculator speed/feed fields → canonical orchestrator fields
  machine: "machine_name",
  doc_mm: "axial_depth_mm",
  woc_mm: "radial_depth_mm",
  toolpath_strategy: "cam_strategy",
  
  // Thread params
  thread_type: "threadType",
  thread_size: "threadSize",
  thread_pitch: "threadPitch",
  tap_drill: "tapDrill",
  pitch_diameter: "pitchDiameter",
  major_diameter: "majorDiameter",
  minor_diameter: "minorDiameter",
  threads_per_inch: "threadsPerInch",
  
  // CAD ids (CAD-COMPLETE-MS0 / U-AI-02 / U-AI-08 / U-AI-10)
  doc_id: "docId",
  txn_id: "txnId",
  trace_id: "traceId",
  tenant_id: "tenantId",
  span_id: "spanId",
  parent_span_id: "parentSpanId",
  start_time: "startTime",
  end_time: "endTime",
  status_message: "statusMessage",
  max_traces: "maxTraces",

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

    if (key === "num_flutes" && !("flutes" in result)) {
      result.flutes = value;
      remapped++;
    }
  }
  
  // SYS-MS6-U03: Type coercion — string numbers → actual numbers for known numeric fields
  const NUMERIC_FIELDS = new Set([
    "toolDiameter", "tool_diameter", "tool_diameter_mm", "axialDepth", "axial_depth", "axial_depth_mm", "radialDepth", "radial_depth", "radial_depth_mm",
    "depthOfCut", "depth_of_cut", "widthOfCut", "width_of_cut", "cuttingSpeed", "cutting_speed",
    "spindleSpeed", "spindle_speed", "feedRate", "feed_rate", "feedPerTooth", "feed_per_tooth",
    "feedPerRev", "feed_per_rev", "surfaceSpeed", "surface_speed", "chipLoad", "chip_load",
    "coolantPressure", "coolant_pressure", "stickout", "stickout_length", "stick_out",
    "toolLength", "tool_length", "fluteLength", "flute_length", "rakeAngle", "rake_angle",
    "noseRadius", "nose_radius", "cornerRadius", "corner_radius", "pointAngle", "point_angle",
    "helixAngle", "helix_angle", "leadAngle", "lead_angle", "numberOfFlutes", "num_flutes", "flutes",
    "number_of_flutes", "threadPitch", "thread_pitch", "pitchDiameter", "pitch_diameter",
    "majorDiameter", "major_diameter", "minorDiameter", "minor_diameter",
    "threadsPerInch", "threads_per_inch", "kc1_1", "mc", "taylor_C", "taylor_n",
    "width_mm", "length_mm", "depth_mm", "diameter_mm", "stepover_pct", "stepdown_mm",
    "feed_rate_mmmin", "plunge_rate_mmmin", "spindle_rpm", "retract_height_mm", "stock_to_leave_mm",
    "tool_diameter_mm", "axial_depth_mm", "radial_depth_mm", "radial_depth_pct",
    "machine_power_kw", "machine_max_rpm", "machine_max_torque_nm",
    "machine_age_years", "natural_frequency_hz", "system_stiffness_n_m", "damping_ratio",
    "machine_axis_accel_m_s2", "machine_axis_jerk_m_s3",
    "holder_gauge_length_mm", "holder_tir_mm", "holder_balanced_g",
    "tool_stickout_mm", "flute_length_mm", "overall_length_mm", "edge_radius_mm",
    "hardness_hb", "hardness_hrc", "sigma_y_MPa", "overhang_ratio",
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
