/**
 * hyperMILL Turning Strategy Catalog — MS5 U-LAT37-U-LAT39
 *
 * Extracted from hyperMILL 33.0 cycTurn.def cycle definitions.
 * Contains 25 turning cycle types with descriptions, parameters, and use cases.
 *
 * Source: H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/mnu/cycTurn.def
 */

export interface HyperMillTurningStrategy {
  code: string;                    // Cycle code (e.g., "CFT", "TRNR")
  name: string;                    // Display name
  type_name: string;               // PDM-API type name
  group: "TURN" | "GROOVE" | "THREAD" | "DRILL";  // Functional group
  description: string;             // Strategy description
  use_case: string;                // When to use this strategy
  replaceable_with?: string[];     // Compatible alternatives
  supports_roughing: boolean;
  supports_finishing: boolean;
  supports_5axis: boolean;
  parameters: string[];            // Key parameters
}

export const HYPERMILL_TURNING_STRATEGIES: HyperMillTurningStrategy[] = [
  // ============================================================================
  // General Turning
  // ============================================================================
  {
    code: "CFT",
    name: "Turning Roughing - Finishing",
    type_name: "Turning Roughing / Finish",
    group: "TURN",
    description: "Combined roughing and finishing cycle with automatic stock recognition",
    use_case: "General purpose turning when you need both roughing and finishing in one operation",
    replaceable_with: ["CRT", "CAT"],
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["depth_of_cut", "feed_rate", "cutting_speed", "stock_allowance"],
  },
  {
    code: "TRNR",
    name: "Rough Turning",
    type_name: "Rough Turning",
    group: "TURN",
    description: "Material removal turning with constant depth of cut approach",
    use_case: "Aggressive material removal when finish quality is not critical",
    replaceable_with: ["TRNF"],
    supports_roughing: true,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["depth_of_cut", "feed_rate", "cutting_speed", "radial_infeed"],
  },
  {
    code: "TRNP",
    name: "Contour parallel Turning",
    type_name: "Contour parallel Turning",
    group: "TURN",
    description: "Turning with toolpath parallel to final contour for smooth surface",
    use_case: "Semi-finish and finish operations following part contour",
    supports_roughing: false,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["stepover", "feed_rate", "cutting_speed", "approach_angle"],
  },
  {
    code: "TRNF",
    name: "Finish Turning",
    type_name: "Finish Turning",
    group: "TURN",
    description: "Light cuts for surface finish with constant speed control",
    use_case: "Final finishing pass for Ra requirements",
    replaceable_with: ["TRNR"],
    supports_roughing: false,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["finish_allowance", "feed_rate", "cutting_speed", "nose_radius_comp"],
  },
  {
    code: "TRNL",
    name: "Line Turning",
    type_name: "Line Turning",
    group: "TURN",
    description: "Simple linear turning along a defined line",
    use_case: "Simple cylindrical or taper turning on straight sections",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["start_point", "end_point", "feed_rate", "cutting_speed"],
  },
  {
    code: "TRNBR",
    name: "Boring Rough",
    type_name: "Boring Roughing",
    group: "TURN",
    description: "Internal roughing with boring bar",
    use_case: "Roughing internal diameters and bores",
    replaceable_with: ["TRNBF"],
    supports_roughing: true,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["depth_of_cut", "boring_bar_clearance", "feed_rate", "min_bore_diameter"],
  },
  {
    code: "TRNBF",
    name: "Boring Finish",
    type_name: "Boring Finishing",
    group: "TURN",
    description: "Internal finishing with boring bar for ID tolerances",
    use_case: "Finishing internal diameters to tolerance",
    replaceable_with: ["TRNBR"],
    supports_roughing: false,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["finish_allowance", "boring_bar_clearance", "feed_rate", "dwell_time"],
  },
  {
    code: "CRT",
    name: "Rough Contour Turning",
    type_name: "Rough Contour Turning",
    group: "TURN",
    description: "Contour-following roughing with automatic stepdown",
    use_case: "Roughing complex profiles that need to follow part shape",
    replaceable_with: ["CFT", "CAT"],
    supports_roughing: true,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["depth_of_cut", "stepdown", "feed_rate", "cutting_speed"],
  },

  // ============================================================================
  // Grooving
  // ============================================================================
  {
    code: "GRVT",
    name: "Grooving",
    type_name: "Grooving",
    group: "GROOVE",
    description: "Standard grooving with plunge and radial movement",
    use_case: "External grooves, O-ring grooves, snap ring grooves",
    supports_roughing: true,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["groove_width", "groove_depth", "feed_rate", "peck_depth"],
  },
  {
    code: "GRVP",
    name: "Profile Grooving",
    type_name: "Profile Grooving",
    group: "GROOVE",
    description: "Grooving with profile following capability",
    use_case: "Complex groove shapes that need to follow a profile",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["groove_profile", "stepdown", "feed_rate", "side_allowance"],
  },
  {
    code: "GRVF",
    name: "Face Grooving",
    type_name: "Face Grooving",
    group: "GROOVE",
    description: "Grooving on the face of the part",
    use_case: "Face grooves, seal grooves on face, undercuts",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["groove_width", "z_depth", "feed_rate", "radial_position"],
  },

  // ============================================================================
  // Parting & Cutoff
  // ============================================================================
  {
    code: "CPT",
    name: "Parting",
    type_name: "Parting / Cut-off",
    group: "TURN",
    description: "Part-off / cutoff cycle with chip breaking",
    use_case: "Separating finished part from bar stock",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["part_diameter", "cutoff_feed", "dwell_at_center", "retract_mode"],
  },
  {
    code: "CPTNEW",
    name: "Parting New",
    type_name: "Parting / Cut-off Enhanced",
    group: "TURN",
    description: "Enhanced parting with improved chip control and feed ramp",
    use_case: "Production parting with better chip management",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["part_diameter", "cutoff_feed", "feed_ramp", "chip_break_dwell"],
  },

  // ============================================================================
  // Contour & Advanced Turning
  // ============================================================================
  {
    code: "CAT",
    name: "Automatic Contour Turning",
    type_name: "Automatic Contour Turning",
    group: "TURN",
    description: "Automatic roughing and finishing based on stock model",
    use_case: "Complex parts where automatic stock recognition saves programming time",
    replaceable_with: ["CFT", "CRT"],
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["stock_model", "auto_stepdown", "feed_rate", "cutting_speed"],
  },

  // ============================================================================
  // Face Grooving
  // ============================================================================
  {
    code: "FGVT",
    name: "Face Groove Turning",
    type_name: "Face Groove Turning",
    group: "GROOVE",
    description: "Turning-based face groove machining",
    use_case: "Wide face grooves that need turning approach",
    supports_roughing: true,
    supports_finishing: false,
    supports_5axis: false,
    parameters: ["groove_od", "groove_id", "z_depth", "stepover"],
  },
  {
    code: "FGVP",
    name: "Face Groove Profile",
    type_name: "Face Groove Profile",
    group: "GROOVE",
    description: "Profile-based face groove machining",
    use_case: "Complex face groove profiles",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["groove_profile", "z_depth", "feed_rate", "stepdown"],
  },
  {
    code: "FGVF",
    name: "Face Groove Finish",
    type_name: "Face Groove Finishing",
    group: "GROOVE",
    description: "Finishing pass for face grooves",
    use_case: "Final finish on face groove surfaces",
    supports_roughing: false,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["finish_allowance", "feed_rate", "cutting_speed"],
  },

  // ============================================================================
  // Threading
  // ============================================================================
  {
    code: "TRNT",
    name: "Thread Turning",
    type_name: "Thread Turning",
    group: "THREAD",
    description: "Single-point threading with infeed control",
    use_case: "External and internal threads, standard and special pitches",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["thread_pitch", "thread_depth", "infeed_type", "number_of_passes"],
  },
  {
    code: "TT",
    name: "Thread Turning (Legacy)",
    type_name: "Thread Turning Legacy",
    group: "THREAD",
    description: "Legacy threading cycle for compatibility",
    use_case: "Compatibility with older programs",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["thread_pitch", "thread_depth", "lead_angle"],
  },
  {
    code: "TTNEW",
    name: "Thread Turning Enhanced",
    type_name: "Thread Turning Enhanced",
    group: "THREAD",
    description: "Enhanced threading with multi-start and thread relief support",
    use_case: "Multi-start threads, ACME threads, buttress threads",
    supports_roughing: true,
    supports_finishing: true,
    supports_5axis: false,
    parameters: ["thread_pitch", "thread_form", "starts", "relief_groove"],
  },

  // ============================================================================
  // 5-Axis Drilling on Turning Centers
  // ============================================================================
  {
    code: "DCENX5",
    name: "5-Axis Center Drilling",
    type_name: "5-Axis Center Drilling",
    group: "DRILL",
    description: "Center drilling with B-axis positioning on mill-turn",
    use_case: "Center drilling at angles on mill-turn centers",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: true,
    parameters: ["spot_depth", "b_axis_angle", "spindle_speed", "feed_rate"],
  },
  {
    code: "DDRX5",
    name: "5-Axis Drilling",
    type_name: "5-Axis Drilling",
    group: "DRILL",
    description: "Drilling with B-axis positioning on mill-turn",
    use_case: "Angled holes on mill-turn centers",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: true,
    parameters: ["hole_depth", "b_axis_angle", "spindle_speed", "peck_depth"],
  },
  {
    code: "DCBX5",
    name: "5-Axis Counterboring",
    type_name: "5-Axis Counterboring",
    group: "DRILL",
    description: "Counterboring with B-axis positioning",
    use_case: "Counterbores at angles on mill-turn",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: true,
    parameters: ["cbore_diameter", "cbore_depth", "b_axis_angle", "feed_rate"],
  },
  {
    code: "DPECX5",
    name: "5-Axis Peck Drilling",
    type_name: "5-Axis Peck Drilling",
    group: "DRILL",
    description: "Peck drilling with B-axis positioning for deep holes",
    use_case: "Deep angled holes on mill-turn centers",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: true,
    parameters: ["hole_depth", "peck_depth", "b_axis_angle", "retract_amount"],
  },
  {
    code: "DRMX5",
    name: "5-Axis Reaming",
    type_name: "5-Axis Reaming",
    group: "DRILL",
    description: "Reaming with B-axis positioning for precision holes",
    use_case: "Precision angled holes on mill-turn",
    supports_roughing: false,
    supports_finishing: true,
    supports_5axis: true,
    parameters: ["hole_diameter", "ream_depth", "b_axis_angle", "feed_rate"],
  },
  {
    code: "DTAPX5",
    name: "5-Axis Tapping",
    type_name: "5-Axis Tapping",
    group: "DRILL",
    description: "Tapping with B-axis positioning for angled threads",
    use_case: "Threaded holes at angles on mill-turn",
    supports_roughing: false,
    supports_finishing: false,
    supports_5axis: true,
    parameters: ["thread_size", "thread_depth", "b_axis_angle", "tap_type"],
  },
];

/**
 * Get all hyperMILL turning strategies.
 */
export function getHyperMillTurningStrategies(): HyperMillTurningStrategy[] {
  return HYPERMILL_TURNING_STRATEGIES;
}

/**
 * Find strategy by code.
 */
export function findHyperMillStrategyByCode(code: string): HyperMillTurningStrategy | undefined {
  return HYPERMILL_TURNING_STRATEGIES.find(s => s.code.toUpperCase() === code.toUpperCase());
}

/**
 * Get strategies by group.
 */
export function getHyperMillStrategiesByGroup(group: HyperMillTurningStrategy["group"]): HyperMillTurningStrategy[] {
  return HYPERMILL_TURNING_STRATEGIES.filter(s => s.group === group);
}

/**
 * Search strategies by keyword.
 */
export function searchHyperMillStrategies(keyword: string): HyperMillTurningStrategy[] {
  const kw = keyword.toLowerCase();
  return HYPERMILL_TURNING_STRATEGIES.filter(s =>
    s.name.toLowerCase().includes(kw) ||
    s.description.toLowerCase().includes(kw) ||
    s.use_case.toLowerCase().includes(kw) ||
    s.code.toLowerCase().includes(kw)
  );
}

/**
 * Get strategies that support roughing.
 */
export function getRoughingStrategies(): HyperMillTurningStrategy[] {
  return HYPERMILL_TURNING_STRATEGIES.filter(s => s.supports_roughing);
}

/**
 * Get strategies that support finishing.
 */
export function getFinishingStrategies(): HyperMillTurningStrategy[] {
  return HYPERMILL_TURNING_STRATEGIES.filter(s => s.supports_finishing);
}

/**
 * Get 5-axis strategies (for mill-turn).
 */
export function get5AxisStrategies(): HyperMillTurningStrategy[] {
  return HYPERMILL_TURNING_STRATEGIES.filter(s => s.supports_5axis);
}

/**
 * Get strategy stats.
 */
export function getStrategyStats(): {
  total: number;
  by_group: Record<string, number>;
  roughing_count: number;
  finishing_count: number;
  five_axis_count: number;
} {
  const byGroup: Record<string, number> = {};
  let roughing = 0;
  let finishing = 0;
  let fiveAxis = 0;

  for (const s of HYPERMILL_TURNING_STRATEGIES) {
    byGroup[s.group] = (byGroup[s.group] || 0) + 1;
    if (s.supports_roughing) roughing++;
    if (s.supports_finishing) finishing++;
    if (s.supports_5axis) fiveAxis++;
  }

  return {
    total: HYPERMILL_TURNING_STRATEGIES.length,
    by_group: byGroup,
    roughing_count: roughing,
    finishing_count: finishing,
    five_axis_count: fiveAxis,
  };
}
