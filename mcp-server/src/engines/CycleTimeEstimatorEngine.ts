/**
 * CycleTimeEstimatorEngine — Physics-Based Cycle Time Estimation
 *
 * Models actual machine kinematics (acceleration, jerk, servo settling,
 * corner deceleration, block processing overhead) to produce accurate
 * cycle time estimates from G-code. Goes far beyond naive distance/feed
 * calculations used by CAM systems.
 *
 * Key physics modeled:
 * - S-curve / trapezoidal velocity profiles for each move
 * - Corner deceleration at direction changes based on path tolerance
 * - Servo settling time at position stops (G00 endpoints, G04 dwells)
 * - Block processing overhead per G-code line
 * - Spindle acceleration/deceleration time
 * - Tool change time (ATC)
 * - Look-ahead buffer effects on feed blending
 *
 * Actions: cycle_time_estimate, cycle_time_compare, cycle_time_bottleneck
 */

// ============================================================================
// TYPES
// ============================================================================

/** Supported CNC controller families. */
export type ControllerType = "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma" | "hurco";

/** Full kinematic description of a CNC machine's motion system. */
export interface MachineKinematics {
  /** XY rapid traverse rate in mm/min */
  rapid_rate_xy: number;
  /** Z rapid traverse rate in mm/min (often slower due to mass) */
  rapid_rate_z: number;
  /** Maximum acceleration per axis in mm/s² */
  max_acceleration: number;
  /** Maximum jerk (rate of change of acceleration) in mm/s³ */
  max_jerk: number;
  /** Servo settling time in ms (time to reach position tolerance after decel) */
  servo_settling_time: number;
  /** Controller look-ahead buffer depth in blocks */
  look_ahead_blocks: number;
  /** Block processing time in ms per G-code line */
  block_processing_time: number;
  /** Automatic tool changer time in seconds (chip-to-chip) */
  tool_change_time: number;
  /** Spindle acceleration time in seconds (0 to max RPM) */
  spindle_accel_time: number;
  /** Pallet change time in seconds (if applicable) */
  pallet_change_time?: number;
  /** Rotary axis rapid rate in deg/min for A/B/C axes */
  rotary_rapid_rate?: number;
}

/** Configuration for cycle time estimation. */
export interface CycleTimeConfig {
  /** Controller family — selects default kinematic profile */
  controller: ControllerType;
  /** Machine name key for built-in profiles (e.g., "haas_vf2") */
  machine_profile?: string;
  /** Custom kinematic overrides (merged on top of profile) */
  kinematics_override?: Partial<MachineKinematics>;
  /** Whether to include per-tool breakdown in results */
  include_breakdown?: boolean;
  /** Path tolerance in mm for corner deceleration model (default 0.01) */
  path_tolerance?: number;
  /** Whether to model look-ahead feed blending (default true) */
  model_look_ahead?: boolean;
}

/** Per-tool breakdown entry. */
export interface ToolBreakdown {
  tool_number: number;
  tool_description: string;
  cutting_time_sec: number;
  rapid_time_sec: number;
  cutting_distance_mm: number;
  rapid_distance_mm: number;
  corner_decel_overhead_sec: number;
  pct_of_total: number;
}

/** Full cycle time estimation result. */
export interface CycleTimeResult {
  total_seconds: number;
  total_formatted: string;
  cutting_time: number;
  rapid_time: number;
  tool_change_time: number;
  dwell_time: number;
  spindle_time: number;
  acceleration_overhead: number;
  corner_decel_overhead: number;
  block_processing_overhead: number;
  servo_settling_overhead: number;
  total_cutting_distance_mm: number;
  total_rapid_distance_mm: number;
  line_count: number;
  tool_change_count: number;
  machine_profile: string;
  breakdown_by_tool?: ToolBreakdown[];
}

/** Machine comparison entry. */
export interface MachineCompareEntry {
  machine: string;
  controller: ControllerType;
  total_seconds: number;
  total_formatted: string;
  cutting_time: number;
  rapid_time: number;
  overhead_time: number;
  pct_vs_fastest: number;
}

/** Comparison result across multiple machines. */
export interface MachineCompareResult {
  fastest_machine: string;
  slowest_machine: string;
  time_spread_seconds: number;
  time_spread_pct: number;
  machines: MachineCompareEntry[];
  insights: string[];
}

/** A bottleneck section in the G-code program. */
export interface BottleneckSection {
  start_line: number;
  end_line: number;
  time_seconds: number;
  pct_of_total: number;
  dominant_factor: string;
  description: string;
  suggestion: string;
}

/** Bottleneck analysis result. */
export interface BottleneckResult {
  total_seconds: number;
  sections: BottleneckSection[];
  summary: string;
}

/** Internal parsed G-code move representation. */
interface ParsedMove {
  line_number: number;
  raw: string;
  type: "rapid" | "linear" | "cw_arc" | "ccw_arc" | "dwell" | "tool_change" | "spindle" | "other";
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  f?: number;
  s?: number;
  r?: number;
  i?: number;
  j?: number;
  k?: number;
  p?: number;
  tool_number?: number;
  distance_mm: number;
  angle_change_deg: number;
}

// ============================================================================
// DEFAULT MACHINE KINEMATIC PROFILES
// ============================================================================

const MACHINE_PROFILES: Record<string, { controller: ControllerType; kinematics: MachineKinematics }> = {
  haas_vf2: {
    controller: "haas",
    kinematics: {
      rapid_rate_xy: 25400,
      rapid_rate_z: 25400,
      max_acceleration: 3000,
      max_jerk: 50000,
      servo_settling_time: 20,
      look_ahead_blocks: 20,
      block_processing_time: 1,
      tool_change_time: 4.2,
      spindle_accel_time: 2.5,
    },
  },
  haas_umc750: {
    controller: "haas",
    kinematics: {
      rapid_rate_xy: 25400,
      rapid_rate_z: 25400,
      max_acceleration: 3000,
      max_jerk: 50000,
      servo_settling_time: 20,
      look_ahead_blocks: 20,
      block_processing_time: 1,
      tool_change_time: 4.2,
      spindle_accel_time: 2.5,
      rotary_rapid_rate: 11000,
    },
  },
  dmg_dmu50: {
    controller: "siemens",
    kinematics: {
      rapid_rate_xy: 30000,
      rapid_rate_z: 30000,
      max_acceleration: 5000,
      max_jerk: 100000,
      servo_settling_time: 10,
      look_ahead_blocks: 100,
      block_processing_time: 0.5,
      tool_change_time: 3.0,
      spindle_accel_time: 1.8,
      rotary_rapid_rate: 15000,
    },
  },
  mazak_vcn530c: {
    controller: "mazak",
    kinematics: {
      rapid_rate_xy: 36000,
      rapid_rate_z: 36000,
      max_acceleration: 4000,
      max_jerk: 80000,
      servo_settling_time: 15,
      look_ahead_blocks: 40,
      block_processing_time: 0.8,
      tool_change_time: 3.5,
      spindle_accel_time: 2.0,
    },
  },
  fanuc_robodrill: {
    controller: "fanuc",
    kinematics: {
      rapid_rate_xy: 54000,
      rapid_rate_z: 54000,
      max_acceleration: 10000,
      max_jerk: 200000,
      servo_settling_time: 5,
      look_ahead_blocks: 200,
      block_processing_time: 0.3,
      tool_change_time: 1.3,
      spindle_accel_time: 1.0,
    },
  },
  okuma_mb5000h: {
    controller: "okuma",
    kinematics: {
      rapid_rate_xy: 32000,
      rapid_rate_z: 32000,
      max_acceleration: 4500,
      max_jerk: 90000,
      servo_settling_time: 12,
      look_ahead_blocks: 80,
      block_processing_time: 0.5,
      tool_change_time: 3.0,
      spindle_accel_time: 1.5,
      pallet_change_time: 8.0,
    },
  },
  // ---- JM Die fleet (U-QP-CYCLETIME-JM-PROFILES, charlie 2026-06-12) ----
  // rapid_rate / max_acceleration / tool_change_time / block_processing_time are
  // VERIFIED from GCodeRuntimePredictorEngine.MACHINE_LIBRARY (the JM-fleet
  // kinematics descriptors; block_processing_time = 1000/blocks_per_sec). max_jerk
  // (~20x accel) / servo_settling / look_ahead / spindle_accel are DERIVED from the
  // same-class CONTROLLER_DEFAULTS conventions (R12: no fabricated machine specs).
  // Roku-Roku (VMC-05, Fanuc 31i) is DEFERRED -- no verified source kinematics.
  hurco_vm30i: {
    controller: "hurco",
    kinematics: {
      rapid_rate_xy: 35000, rapid_rate_z: 35000, // verified max_rapid_mm_min
      max_acceleration: 3500,                      // verified
      max_jerk: 70000,                             // derived ~20x accel (WinMAX UltiMotion)
      servo_settling_time: 12,                     // derived (advanced controller)
      look_ahead_blocks: 100,                      // derived (UltiMotion aggressive look-ahead)
      block_processing_time: 0.067,                // verified 1000/15000 blocks_per_sec
      tool_change_time: 5,                         // verified tool_change_sec
      spindle_accel_time: 2.0,                     // derived (high-end VMC)
    },
  },
  hurco_vmx24: {
    controller: "hurco",
    kinematics: {
      rapid_rate_xy: 33000, rapid_rate_z: 33000, // verified
      max_acceleration: 3000,                      // verified
      max_jerk: 60000,                             // derived ~20x accel
      servo_settling_time: 12,                     // derived
      look_ahead_blocks: 100,                      // derived (UltiMotion)
      block_processing_time: 0.067,                // verified 1000/15000
      tool_change_time: 6,                         // verified
      spindle_accel_time: 2.2,                     // derived
    },
  },
  okuma_m460v: {
    controller: "okuma",
    kinematics: {
      rapid_rate_xy: 50000, rapid_rate_z: 50000, // verified (M460V-5AX)
      max_acceleration: 5000,                      // verified
      max_jerk: 100000,                            // derived ~20x accel
      servo_settling_time: 10,                     // derived (OSP-P300 advanced)
      look_ahead_blocks: 100,                      // derived
      block_processing_time: 0.1,                  // verified 1000/10000
      tool_change_time: 4,                         // verified
      spindle_accel_time: 1.8,                     // derived
    },
  },
};

/** Default kinematics for controller families when no specific machine is given. */
const CONTROLLER_DEFAULTS: Record<ControllerType, MachineKinematics> = {
  fanuc: {
    rapid_rate_xy: 30000, rapid_rate_z: 24000, max_acceleration: 5000,
    max_jerk: 80000, servo_settling_time: 12, look_ahead_blocks: 80,
    block_processing_time: 0.5, tool_change_time: 3.5, spindle_accel_time: 2.0,
  },
  haas: {
    rapid_rate_xy: 25400, rapid_rate_z: 25400, max_acceleration: 3000,
    max_jerk: 50000, servo_settling_time: 20, look_ahead_blocks: 20,
    block_processing_time: 1.0, tool_change_time: 4.2, spindle_accel_time: 2.5,
  },
  siemens: {
    rapid_rate_xy: 30000, rapid_rate_z: 30000, max_acceleration: 5000,
    max_jerk: 100000, servo_settling_time: 10, look_ahead_blocks: 100,
    block_processing_time: 0.5, tool_change_time: 3.0, spindle_accel_time: 1.8,
  },
  heidenhain: {
    rapid_rate_xy: 30000, rapid_rate_z: 28000, max_acceleration: 4500,
    max_jerk: 90000, servo_settling_time: 12, look_ahead_blocks: 120,
    block_processing_time: 0.4, tool_change_time: 3.2, spindle_accel_time: 2.0,
  },
  mazak: {
    rapid_rate_xy: 36000, rapid_rate_z: 36000, max_acceleration: 4000,
    max_jerk: 80000, servo_settling_time: 15, look_ahead_blocks: 40,
    block_processing_time: 0.8, tool_change_time: 3.5, spindle_accel_time: 2.0,
  },
  okuma: {
    rapid_rate_xy: 32000, rapid_rate_z: 32000, max_acceleration: 4500,
    max_jerk: 90000, servo_settling_time: 12, look_ahead_blocks: 80,
    block_processing_time: 0.5, tool_change_time: 3.0, spindle_accel_time: 1.5,
  },
  // Hurco WinMAX/UltiMotion family default (U-QP-CYCLETIME-JM-PROFILES) -- JM's
  // primary mill controller; values mirror the hurco_vm30i machine profile.
  hurco: {
    rapid_rate_xy: 33000, rapid_rate_z: 33000, max_acceleration: 3200,
    max_jerk: 64000, servo_settling_time: 12, look_ahead_blocks: 100,
    block_processing_time: 0.1, tool_change_time: 5.5, spindle_accel_time: 2.1,
  },
};

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

/**
 * Compute time for a single-axis move using trapezoidal velocity profile.
 *
 * Three phases: acceleration, cruise, deceleration.
 * If distance is too short to reach full speed, uses a triangular profile.
 *
 * @param distance_mm - Move distance in mm
 * @param max_velocity_mm_s - Maximum velocity in mm/s
 * @param accel_mm_s2 - Acceleration in mm/s²
 * @returns Time in seconds
 */
function trapezoidalMoveTime(distance_mm: number, max_velocity_mm_s: number, accel_mm_s2: number): number {
  if (distance_mm <= 0) return 0;
  if (max_velocity_mm_s <= 0 || accel_mm_s2 <= 0) return 0;

  // Time to accelerate to max velocity
  const t_accel = max_velocity_mm_s / accel_mm_s2;
  // Distance consumed during accel + decel (symmetric)
  const d_accel = accel_mm_s2 * t_accel * t_accel; // = v² / a

  if (d_accel >= distance_mm) {
    // Triangular profile: never reaches max velocity
    // d = a * t²  =>  t = sqrt(d / a)
    // Total time = 2 * t (accel + decel)
    return 2.0 * Math.sqrt(distance_mm / accel_mm_s2);
  }

  // Trapezoidal profile
  const d_cruise = distance_mm - d_accel;
  const t_cruise = d_cruise / max_velocity_mm_s;
  return 2.0 * t_accel + t_cruise;
}

/**
 * Compute time for a move using S-curve (jerk-limited) velocity profile.
 *
 * Seven phases: jerk-up, constant accel, jerk-down, cruise,
 * jerk-up, constant decel, jerk-down.
 *
 * Falls back to trapezoidal when jerk is very high (stiff servos).
 *
 * @param distance_mm - Move distance in mm
 * @param max_velocity_mm_s - Target velocity in mm/s
 * @param max_accel_mm_s2 - Maximum acceleration in mm/s²
 * @param max_jerk_mm_s3 - Maximum jerk in mm/s³
 * @returns Time in seconds
 */
function sCurveMoveTime(
  distance_mm: number,
  max_velocity_mm_s: number,
  max_accel_mm_s2: number,
  max_jerk_mm_s3: number
): number {
  if (distance_mm <= 0) return 0;

  // If jerk is extremely high relative to accel, S-curve degenerates to trapezoidal
  const t_jerk = max_accel_mm_s2 / max_jerk_mm_s3; // time for jerk phase
  if (t_jerk < 0.0005) {
    return trapezoidalMoveTime(distance_mm, max_velocity_mm_s, max_accel_mm_s2);
  }

  // S-curve accel phase: jerk-limited ramp up to max_accel then ramp down
  // Time for jerk phase: t_j = a_max / j_max
  const t_j = t_jerk;

  // Velocity gained during one S-curve accel segment (two jerk phases + constant accel):
  // If we can reach max_accel:
  //   v_accel = a_max * t_j  (during jerk-up, triangular area)
  //           + a_max * t_const_accel  (constant accel phase)
  //           + a_max * t_j  (jerk-down, triangular area)
  // Simplified: we need to check if we can reach max velocity

  // Velocity gained during jerk-up phase: v_j = 0.5 * j * t_j² = 0.5 * a_max * t_j
  const v_jerk_phase = 0.5 * max_accel_mm_s2 * t_j;

  // Minimum velocity gained just from jerk phases (no constant accel): 2 * v_jerk_phase
  const v_min_accel = 2.0 * v_jerk_phase; // = a_max * t_j

  // Distance consumed during symmetric S-curve accel + decel (both sides)
  // This is the minimum distance needed just for the jerk phases
  // If the target velocity <= v_min_accel, we may not even need constant accel phase
  let t_accel_total: number;
  let d_accel_total: number;

  const v_target = Math.min(max_velocity_mm_s, max_velocity_mm_s); // capped

  if (v_target <= v_min_accel) {
    // Can't even reach max accel - just jerk phases
    // v = j * t² => t = sqrt(v / j)
    const t_partial = Math.sqrt(v_target / max_jerk_mm_s3);
    t_accel_total = 4.0 * t_partial; // accel (2 jerk phases) + decel (2 jerk phases)
    // Distance during accel = 2/3 * j * t³ (integral of jerk profile)
    d_accel_total = 2.0 * (2.0 / 3.0) * max_jerk_mm_s3 * t_partial * t_partial * t_partial;
  } else {
    // We reach max accel — compute constant accel time to reach target velocity
    const v_remaining = v_target - v_min_accel;
    const t_const_accel = v_remaining / max_accel_mm_s2;

    // Total accel time (one side) = t_j + t_const_accel + t_j
    const t_one_side = 2.0 * t_j + t_const_accel;
    t_accel_total = 2.0 * t_one_side; // accel + decel (symmetric)

    // Distance during accel phase (one side):
    // d_jerk_up = (1/6) * j * t_j³  (jerk-up)
    const d_jerk_up = (1.0 / 6.0) * max_jerk_mm_s3 * t_j * t_j * t_j;
    // velocity at end of jerk-up = v_jerk_phase
    // d_const_accel = v_jerk_phase * t_const + 0.5 * a_max * t_const²
    const d_const_accel = v_jerk_phase * t_const_accel +
      0.5 * max_accel_mm_s2 * t_const_accel * t_const_accel;
    // velocity at end of const accel = v_jerk_phase + a_max * t_const
    const v_before_jerk_down = v_jerk_phase + max_accel_mm_s2 * t_const_accel;
    // d_jerk_down = v_before_jerk_down * t_j + 0.5 * a_max * t_j² - (1/6) * j * t_j³
    const d_jerk_down = v_before_jerk_down * t_j +
      0.5 * max_accel_mm_s2 * t_j * t_j -
      (1.0 / 6.0) * max_jerk_mm_s3 * t_j * t_j * t_j;

    const d_one_side = d_jerk_up + d_const_accel + d_jerk_down;
    d_accel_total = 2.0 * d_one_side; // symmetric accel + decel
  }

  if (d_accel_total >= distance_mm) {
    // Not enough distance to reach target velocity — scale down
    // Approximate: use trapezoidal as fallback for short moves
    const t_trap = trapezoidalMoveTime(distance_mm, max_velocity_mm_s, max_accel_mm_s2);
    // Add jerk overhead: ~10-20% penalty for short jerk-limited moves
    const jerk_penalty = 1.0 + Math.min(0.2, t_j * 2.0);
    return t_trap * jerk_penalty;
  }

  // Cruise phase
  const d_cruise = distance_mm - d_accel_total;
  const t_cruise = d_cruise / v_target;

  return t_accel_total + t_cruise;
}

/**
 * Compute velocity reduction at a direction change (corner).
 *
 * Controllers must decelerate at corners to maintain path tolerance.
 * The maximum cornering velocity depends on the angle change, the
 * path tolerance setting, and the machine's acceleration capability.
 *
 * Based on the kinematic constraint:
 *   v_corner = sqrt(2 * a_max * tolerance / (1 - cos(angle/2)))
 *
 * @param angle_change_deg - Direction change in degrees (0 = straight, 180 = reversal)
 * @param feed_rate_mm_s - Commanded feed rate in mm/s
 * @param max_accel_mm_s2 - Machine max acceleration in mm/s²
 * @param tolerance_mm - Path tolerance in mm
 * @returns Maximum cornering velocity in mm/s
 */
function maxCornerVelocity(
  angle_change_deg: number,
  max_accel_mm_s2: number,
  tolerance_mm: number
): number {
  if (angle_change_deg <= 0.1) return Infinity; // straight line, no limit
  if (angle_change_deg >= 179.9) return 0; // full reversal

  const angle_rad = (angle_change_deg * Math.PI) / 180.0;
  const half_angle = angle_rad / 2.0;
  const denom = 1.0 - Math.cos(half_angle);
  if (denom <= 0) return Infinity;

  return Math.sqrt((2.0 * max_accel_mm_s2 * tolerance_mm) / denom);
}

/**
 * Compute the time penalty for decelerating into a corner and re-accelerating.
 *
 * @param feed_rate_mm_s - Commanded feed rate in mm/s
 * @param corner_velocity_mm_s - Max cornering velocity in mm/s
 * @param max_accel_mm_s2 - Machine acceleration in mm/s²
 * @returns Time overhead in seconds (beyond what straight-line time would be)
 */
function cornerDecelPenalty(
  feed_rate_mm_s: number,
  corner_velocity_mm_s: number,
  max_accel_mm_s2: number
): number {
  if (corner_velocity_mm_s >= feed_rate_mm_s) return 0;

  const delta_v = feed_rate_mm_s - corner_velocity_mm_s;
  // Time to decel from feed to corner speed, then re-accel
  const t_decel = delta_v / max_accel_mm_s2;
  // Distance "lost" during decel/accel vs. constant speed
  // At constant speed: d = v * t; during decel: d = v*t - 0.5*a*t²
  // Time overhead ≈ delta_v² / (2 * a * v_feed)
  const overhead = (delta_v * delta_v) / (2.0 * max_accel_mm_s2 * feed_rate_mm_s);
  return overhead > 0 ? overhead : 0;
}

// ============================================================================
// G-CODE PARSER
// ============================================================================

/**
 * Extract a numeric value for a given letter address from a G-code line.
 * e.g., extractWord("G01 X10.5 Y20.3", "X") => 10.5
 */
function extractWord(line: string, letter: string): number | undefined {
  const regex = new RegExp(`${letter}([+-]?\\d+\\.?\\d*)`, "i");
  const match = line.match(regex);
  return match ? parseFloat(match[1]) : undefined;
}

/**
 * Parse a full G-code program into a sequence of moves with computed distances.
 */
/**
 * Emit the synthetic move sequence for one execution of a mill drilling/boring/
 * tapping canned cycle (G73 + G81-G89) at a hole position (U-QP-CANNED-CYCLES).
 * Models: (1) rapid XY to the hole, (2) rapid Z down to the R clearance plane,
 * (3) FEED Z from R to final depth (with peck-retract overhead for G73/G83),
 * (4) optional dwell (G82/G88/G89), (5) retract to R (G99) or the initial level
 * (G98); tap (G84) and bore-feed-out (G85/G89) retract at FEED, others at rapid.
 * Reuses the engine's existing per-move S-curve timing -- a canned cycle
 * previously fell through as a single mis-typed motion (missing the plunge,
 * peck travel, dwell, and every modal repeat point). All distances/feeds mm +
 * mm/min. The drill depth |R - Z| is a DIFFERENCE, so it is correct under both
 * G90 (absolute) and G91 (incremental) -- only the rapid positioning Z-travel
 * for an exotic per-hole-varying-depth G91 pattern is approximate.
 * Returns the final tool position so the caller can advance modal state.
 */
function emitCannedDrill(
  moves: ParsedMove[], lineNum: number, raw: string,
  fromX: number, fromY: number, fromZ: number,
  holeX: number, holeY: number,
  type: string, zDepth: number, rPlane: number, q: number, p: number, feed: number,
  retractToInitial: boolean, initialZ: number,
): { x: number; y: number; z: number } {
  // 1. Rapid XY to the hole at the current Z (x/y set, z omitted -> XY rapid rate).
  const dxy = Math.sqrt((holeX - fromX) ** 2 + (holeY - fromY) ** 2);
  if (dxy > 0) {
    moves.push({ line_number: lineNum, raw, type: "rapid", x: holeX, y: holeY, distance_mm: dxy, angle_change_deg: 0 });
  }
  // 2. Rapid Z down to the R clearance plane (z only -> Z rapid rate).
  const dToR = Math.abs(rPlane - fromZ);
  if (dToR > 0) {
    moves.push({ line_number: lineNum, raw, type: "rapid", z: rPlane, distance_mm: dToR, angle_change_deg: 0 });
  }
  // 3. FEED drill from R to final depth. Peck cycles (G83 std, G73 high-speed)
  //    add retract overhead (each peck retracts partway and re-feeds).
  const drillDepth = Math.abs(rPlane - zDepth);
  let drillPath = drillDepth;
  if (type === "G83" || type === "G73") {
    const peckQ = q > 0 ? q : drillDepth;
    const peckCount = Math.max(1, Math.ceil(drillDepth / Math.max(peckQ, 1e-6)));
    drillPath = drillDepth + peckCount * peckQ * 0.5; // each peck retracts ~half Q and re-feeds
  }
  if (drillPath > 0) {
    moves.push({ line_number: lineNum, raw, type: "linear", z: zDepth, f: feed, distance_mm: drillPath, angle_change_deg: 0 });
  }
  // 4. Dwell at depth (G82 spot, G88 bore-dwell, G89 bore-dwell-feed-out). The P
  //    value is interpreted by the timing pass using the same P>=100ms->seconds
  //    heuristic as G04 (engine-wide; a controller-aware dwell unit is a separate
  //    follow-up). For a true dwell (P >= 0.1s) this is correct on Fanuc-style ms P.
  if ((type === "G82" || type === "G88" || type === "G89") && p > 0) {
    moves.push({ line_number: lineNum, raw, type: "dwell", p, distance_mm: 0, angle_change_deg: 0 });
  }
  // 5. Retract: rapid to R (G99) or initial level (G98). Tap (G84) and bore-feed-out
  //    (G85/G89) retract at FEED for thread-lead / surface finish; others rapid out.
  const retractZ = retractToInitial ? initialZ : rPlane;
  const dRetract = Math.abs(retractZ - zDepth);
  if (dRetract > 0) {
    const feedRetract = type === "G84" || type === "G85" || type === "G89";
    const retractType: ParsedMove["type"] = feedRetract ? "linear" : "rapid";
    moves.push({ line_number: lineNum, raw, type: retractType, z: retractZ, f: feed, distance_mm: dRetract, angle_change_deg: 0 });
  }
  return { x: holeX, y: holeY, z: retractZ };
}

function parseGCode(gcode: string): ParsedMove[] {
  const lines = gcode.split(/\r?\n/);
  const moves: ParsedMove[] = [];

  let curX = 0, curY = 0, curZ = 0;
  let curA = 0, curB = 0, curC = 0;
  let curF = 0, curS = 0;
  let motionMode: "rapid" | "linear" | "cw_arc" | "ccw_arc" = "rapid";
  let prevDx = 0, prevDy = 0, prevDz = 0;
  let isAbsolute = true;

  // Canned-cycle modal state (G73 + G81-G89). U-QP-CANNED-CYCLES.
  let cannedActive = false;
  let cannedType = "";
  let cannedZ = 0, cannedR = 0, cannedQ = 0, cannedP = 0, cannedF = 0;
  let retractToInitial = true; // G98 = retract to initial level, G99 = to R plane
  let cannedInitialZ = 0;      // Z level captured when the cycle was established

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith(";") || raw.startsWith("%") || raw.startsWith("(")) {
      moves.push({
        line_number: i + 1, raw, type: "other",
        distance_mm: 0, angle_change_deg: 0,
      });
      continue;
    }

    // Strip inline comments
    const code = raw.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim();
    if (!code) {
      moves.push({
        line_number: i + 1, raw, type: "other",
        distance_mm: 0, angle_change_deg: 0,
      });
      continue;
    }

    // Check for G90/G91
    if (/G90\b/i.test(code)) isAbsolute = true;
    if (/G91\b/i.test(code)) isAbsolute = false;

    // Detect motion mode changes
    if (/G0+\b/i.test(code) && !/G0+[1-9]/i.test(code)) motionMode = "rapid";
    if (/G0*1\b/i.test(code)) motionMode = "linear";
    if (/G0*2\b/i.test(code)) motionMode = "cw_arc";
    if (/G0*3\b/i.test(code)) motionMode = "ccw_arc";

    // ---- Canned cycles (G73 + G81-G89). U-QP-CANNED-CYCLES ----------------
    // Retract mode: G98 = retract to initial level, G99 = retract to R plane.
    if (/G98\b/i.test(code)) retractToInitial = true;
    if (/G99\b/i.test(code)) retractToInitial = false;

    // G80 cancels any active canned cycle.
    if (/G80\b/i.test(code)) {
      cannedActive = false;
      cannedType = "";
      moves.push({ line_number: i + 1, raw, type: "other", distance_mm: 0, angle_change_deg: 0 });
      continue;
    }

    // Establish (or refresh) a MILL drilling/boring/tapping canned cycle:
    // G73 high-speed peck, G81 drill, G82 spot-dwell, G83 peck, G84 tap,
    // G85 bore feed-out, G86/G87/G88 bore, G89 bore-dwell. Scoped to G73 + G81-G89.
    // G74/G76 are intentionally NOT matched -- on a LATHE they mean left-hand-tap /
    // peck-groove / threading (different semantics); lathe cycle timing is a
    // separate dialect concern. G73 IS unambiguous mill high-speed peck, so it is
    // included (modeled like G83 peck).
    const cannedMatch = code.match(/\bG(73|8[1-9])\b/i);
    if (cannedMatch) {
      if (!cannedActive) cannedInitialZ = curZ; // capture the initial level once per cycle
      cannedActive = true;
      cannedType = "G" + cannedMatch[1];
    }

    // An explicit motion word (G00-G03) on a non-establishing line cancels the
    // cycle (Fanuc/most controllers); fall through to normal motion handling.
    if (cannedActive && !cannedMatch && /G0*[0-3]\b/i.test(code)) {
      cannedActive = false;
      cannedType = "";
    }

    if (cannedActive) {
      // Refresh cycle params if present on this line (modal cycles can change Z/R/Q).
      const zc = extractWord(code, "Z");
      const rc = extractWord(code, "R");
      const qc = extractWord(code, "Q");
      const pc = extractWord(code, "P");
      const fc = extractWord(code, "F");
      if (zc !== undefined) cannedZ = isAbsolute ? zc : curZ + zc;
      if (rc !== undefined) cannedR = isAbsolute ? rc : curZ + rc;
      if (qc !== undefined) cannedQ = Math.abs(qc);
      if (pc !== undefined) cannedP = pc;
      if (fc !== undefined) { cannedF = fc; curF = fc; }

      const px = extractWord(code, "X");
      const py = extractWord(code, "Y");
      // The establishing line OR any subsequent line with X/Y drills a hole.
      if (cannedMatch || px !== undefined || py !== undefined) {
        let holeX = curX, holeY = curY;
        if (px !== undefined) holeX = isAbsolute ? px : curX + px;
        if (py !== undefined) holeY = isAbsolute ? py : curY + py;
        const end = emitCannedDrill(
          moves, i + 1, raw, curX, curY, curZ, holeX, holeY,
          cannedType, cannedZ, cannedR, cannedQ, cannedP, cannedF, retractToInitial, cannedInitialZ,
        );
        curX = end.x; curY = end.y; curZ = end.z;
        prevDx = 0; prevDy = 0; prevDz = 0; // no spurious corner after a cycle
        continue;
      }
    }

    // Dwell
    if (/G0*4\b/i.test(code)) {
      const p = extractWord(code, "P");
      moves.push({
        line_number: i + 1, raw, type: "dwell",
        p: p,
        distance_mm: 0, angle_change_deg: 0,
      });
      continue;
    }

    // Tool change
    const tMatch = code.match(/\bT(\d+)/i);
    const m6 = /M0*6\b/i.test(code);
    if (m6 || (tMatch && /M0*6/i.test(code))) {
      const toolNum = tMatch ? parseInt(tMatch[1]) : 0;
      moves.push({
        line_number: i + 1, raw, type: "tool_change",
        tool_number: toolNum,
        distance_mm: 0, angle_change_deg: 0,
      });
      continue;
    }

    // Spindle commands
    if (/M0*3\b/i.test(code) || /M0*4\b/i.test(code) || /M0*5\b/i.test(code)) {
      const s = extractWord(code, "S");
      if (s !== undefined) curS = s;
      // Only pure spindle commands (no axis words)
      if (!(/[XYZABC]/i.test(code))) {
        moves.push({
          line_number: i + 1, raw, type: "spindle",
          s: curS,
          distance_mm: 0, angle_change_deg: 0,
        });
        continue;
      }
    }

    // Extract axis positions
    const xVal = extractWord(code, "X");
    const yVal = extractWord(code, "Y");
    const zVal = extractWord(code, "Z");
    const aVal = extractWord(code, "A");
    const bVal = extractWord(code, "B");
    const cVal = extractWord(code, "C");
    const fVal = extractWord(code, "F");
    const sVal = extractWord(code, "S");
    const iVal = extractWord(code, "I");
    const jVal = extractWord(code, "J");
    const kVal = extractWord(code, "K");
    const rVal = extractWord(code, "R");

    if (fVal !== undefined) curF = fVal;
    if (sVal !== undefined) curS = sVal;

    // If no axis words, skip as non-motion
    if (xVal === undefined && yVal === undefined && zVal === undefined &&
        aVal === undefined && bVal === undefined && cVal === undefined) {
      moves.push({
        line_number: i + 1, raw, type: "other",
        distance_mm: 0, angle_change_deg: 0,
      });
      continue;
    }

    // Compute target position
    let newX = curX, newY = curY, newZ = curZ;
    let newA = curA, newB = curB, newC = curC;

    if (isAbsolute) {
      if (xVal !== undefined) newX = xVal;
      if (yVal !== undefined) newY = yVal;
      if (zVal !== undefined) newZ = zVal;
      if (aVal !== undefined) newA = aVal;
      if (bVal !== undefined) newB = bVal;
      if (cVal !== undefined) newC = cVal;
    } else {
      if (xVal !== undefined) newX = curX + xVal;
      if (yVal !== undefined) newY = curY + yVal;
      if (zVal !== undefined) newZ = curZ + zVal;
      if (aVal !== undefined) newA = curA + aVal;
      if (bVal !== undefined) newB = curB + bVal;
      if (cVal !== undefined) newC = curC + cVal;
    }

    const dx = newX - curX;
    const dy = newY - curY;
    const dz = newZ - curZ;

    let distance: number;
    if (motionMode === "cw_arc" || motionMode === "ccw_arc") {
      // Approximate arc length using chord and bulge
      if (rVal !== undefined) {
        // R-format arc: approximate using chord length and radius
        const chord = Math.sqrt(dx * dx + dy * dy);
        const r = Math.abs(rVal);
        if (r > 0 && chord > 0 && chord <= 2 * r) {
          const halfAngle = Math.asin(chord / (2 * r));
          distance = 2 * r * halfAngle;
        } else {
          distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      } else if (iVal !== undefined || jVal !== undefined) {
        // IJK format: compute arc center and sweep angle
        const ci = iVal || 0;
        const cj = jVal || 0;
        const r = Math.sqrt(ci * ci + cj * cj);
        if (r > 0) {
          const startAngle = Math.atan2(-cj, -ci);
          const endAngle = Math.atan2(dy - cj, dx - ci);
          let sweep = endAngle - startAngle;
          if (motionMode === "cw_arc") {
            if (sweep > 0) sweep -= 2 * Math.PI;
          } else {
            if (sweep < 0) sweep += 2 * Math.PI;
          }
          distance = Math.abs(sweep) * r;
          // Add Z component for helical arcs
          distance = Math.sqrt(distance * distance + dz * dz);
        } else {
          distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      } else {
        distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    } else {
      distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Compute angle change from previous move direction
    let angleChange = 0;
    const curMag = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const prevMag = Math.sqrt(prevDx * prevDx + prevDy * prevDy + prevDz * prevDz);
    if (curMag > 0.001 && prevMag > 0.001) {
      const dot = (dx * prevDx + dy * prevDy + dz * prevDz) / (curMag * prevMag);
      const clampedDot = Math.max(-1, Math.min(1, dot));
      angleChange = Math.acos(clampedDot) * (180.0 / Math.PI);
    }

    moves.push({
      line_number: i + 1,
      raw,
      type: motionMode,
      x: newX, y: newY, z: newZ,
      a: newA, b: newB, c: newC,
      f: curF, s: curS,
      i: iVal, j: jVal, k: kVal, r: rVal,
      distance_mm: distance,
      angle_change_deg: angleChange,
    });

    if (curMag > 0.001) {
      prevDx = dx; prevDy = dy; prevDz = dz;
    }
    curX = newX; curY = newY; curZ = newZ;
    curA = newA; curB = newB; curC = newC;
  }

  return moves;
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CycleTimeEstimatorEngine — Physics-based CNC cycle time estimation.
 *
 * Models real machine kinematics including acceleration profiles,
 * jerk limits, servo settling, corner deceleration, and block
 * processing overhead to produce estimates within 5-15% of actual
 * cycle times (vs. 30-50% error from naive distance/feed methods).
 */
export class CycleTimeEstimatorEngine {

  /** Get the resolved kinematics for a given config. */
  resolveKinematics(config: CycleTimeConfig): MachineKinematics {
    let base: MachineKinematics;

    if (config.machine_profile && MACHINE_PROFILES[config.machine_profile]) {
      base = { ...MACHINE_PROFILES[config.machine_profile].kinematics };
    } else {
      base = { ...CONTROLLER_DEFAULTS[config.controller] };
    }

    if (config.kinematics_override) {
      Object.assign(base, config.kinematics_override);
    }

    return base;
  }

  /** Get list of available machine profile names. */
  getAvailableProfiles(): string[] {
    return Object.keys(MACHINE_PROFILES);
  }

  /** Get kinematic profile for a named machine. */
  getProfile(name: string): { controller: ControllerType; kinematics: MachineKinematics } | undefined {
    return MACHINE_PROFILES[name] ? { ...MACHINE_PROFILES[name], kinematics: { ...MACHINE_PROFILES[name].kinematics } } : undefined;
  }

  /**
   * Estimate the time for a single linear move using S-curve motion profile.
   *
   * This is the core physics function. It models jerk-limited acceleration
   * to compute the actual time a real servo system takes, not just d/v.
   */
  estimateAccelDecelTime(
    distance_mm: number,
    feed_rate_mm_min: number,
    max_accel_mm_s2: number,
    max_jerk_mm_s3: number
  ): number {
    const feed_mm_s = feed_rate_mm_min / 60.0;
    return sCurveMoveTime(distance_mm, feed_mm_s, max_accel_mm_s2, max_jerk_mm_s3);
  }

  /**
   * Estimate time lost at a direction change (corner deceleration).
   *
   * CNC controllers must slow down at corners to maintain path tolerance.
   * This models the kinematic constraint and returns the time overhead.
   */
  estimateCornerDeceleration(
    angle_change_deg: number,
    feed_rate_mm_min: number,
    tolerance_mm: number,
    max_accel_mm_s2: number
  ): { corner_velocity_mm_min: number; time_penalty_sec: number; velocity_reduction_pct: number } {
    const feed_mm_s = feed_rate_mm_min / 60.0;
    const v_corner = maxCornerVelocity(angle_change_deg, max_accel_mm_s2, tolerance_mm);
    const v_corner_clamped = Math.min(v_corner, feed_mm_s);
    const penalty = cornerDecelPenalty(feed_mm_s, v_corner_clamped, max_accel_mm_s2);
    const reduction_pct = v_corner_clamped < feed_mm_s
      ? roundTo((1 - v_corner_clamped / feed_mm_s) * 100, 1)
      : 0;

    return {
      corner_velocity_mm_min: roundTo(v_corner_clamped * 60.0, 1),
      time_penalty_sec: roundTo(penalty, 4),
      velocity_reduction_pct: reduction_pct,
    };
  }

  /**
   * Parse G-code and estimate total cycle time with full physics model.
   *
   * This is the primary method. It walks every line of G-code and applies:
   * - S-curve velocity profiles for each move
   * - Corner deceleration between consecutive feed moves
   * - Servo settling at rapid endpoints
   * - Block processing time per line
   * - Tool change time per M06
   * - Spindle acceleration time per speed change
   * - Dwell time (G04)
   */
  estimateFromGCode(gcode: string, config: CycleTimeConfig): CycleTimeResult {
    const kin = this.resolveKinematics(config);
    const tolerance = config.path_tolerance ?? 0.01;
    const modelLookAhead = config.model_look_ahead ?? true;

    const moves = parseGCode(gcode);

    let cutting_time = 0;
    let rapid_time = 0;
    let tool_change_time = 0;
    let dwell_time = 0;
    let spindle_time = 0;
    let accel_overhead = 0;
    let corner_overhead = 0;
    let block_overhead = 0;
    let settling_overhead = 0;
    let total_cutting_dist = 0;
    let total_rapid_dist = 0;
    let tool_change_count = 0;
    let lastSpindleSpeed = 0;

    // Per-tool tracking
    const toolData: Map<number, {
      cutting_time: number; rapid_time: number;
      cutting_dist: number; rapid_dist: number;
      corner_overhead: number;
    }> = new Map();
    let currentTool = 0;

    const ensureTool = (t: number) => {
      if (!toolData.has(t)) {
        toolData.set(t, {
          cutting_time: 0, rapid_time: 0,
          cutting_dist: 0, rapid_dist: 0, corner_overhead: 0,
        });
      }
    };
    ensureTool(0);

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];

      // Block processing time for every line
      block_overhead += kin.block_processing_time / 1000.0;

      switch (move.type) {
        case "rapid": {
          if (move.distance_mm <= 0) break;

          // Rapids use machine rapid rate — typically XY and Z are different
          // Use the slower axis rate if Z is moving
          const hasZ = move.z !== undefined;
          const hasXY = (move.x !== undefined || move.y !== undefined);
          let rapid_rate: number;
          if (hasZ && !hasXY) {
            rapid_rate = kin.rapid_rate_z;
          } else if (hasZ && hasXY) {
            // Combined move: limited by slowest axis proportionally
            rapid_rate = Math.min(kin.rapid_rate_xy, kin.rapid_rate_z);
          } else {
            rapid_rate = kin.rapid_rate_xy;
          }

          // Apply S-curve physics to rapid moves
          const naive_time = move.distance_mm / (rapid_rate / 60.0);
          const physics_time = sCurveMoveTime(
            move.distance_mm, rapid_rate / 60.0,
            kin.max_acceleration, kin.max_jerk
          );
          const overhead = physics_time - naive_time;

          rapid_time += physics_time;
          accel_overhead += Math.max(0, overhead);
          total_rapid_dist += move.distance_mm;

          // Servo settling at rapid endpoint (exact stop)
          settling_overhead += kin.servo_settling_time / 1000.0;

          ensureTool(currentTool);
          const td = toolData.get(currentTool)!;
          td.rapid_time += physics_time;
          td.rapid_dist += move.distance_mm;
          break;
        }

        case "linear":
        case "cw_arc":
        case "ccw_arc": {
          if (move.distance_mm <= 0) break;

          const feedRate = move.f || 1000; // default 1000 mm/min if not specified
          const feed_mm_s = feedRate / 60.0;

          // S-curve physics for the move
          const naive_time = move.distance_mm / feed_mm_s;
          const physics_time = sCurveMoveTime(
            move.distance_mm, feed_mm_s,
            kin.max_acceleration, kin.max_jerk
          );
          const overhead = physics_time - naive_time;

          cutting_time += physics_time;
          accel_overhead += Math.max(0, overhead);
          total_cutting_dist += move.distance_mm;

          // Corner deceleration from previous move
          if (move.angle_change_deg > 0.5) {
            const v_corner = maxCornerVelocity(move.angle_change_deg, kin.max_acceleration, tolerance);
            let corner_pen = 0;

            if (modelLookAhead && kin.look_ahead_blocks > 1) {
              // With look-ahead, the controller blends corners — reduced penalty
              // More look-ahead blocks = smoother cornering
              const blend_factor = Math.min(1.0, kin.look_ahead_blocks / 100.0);
              const raw_penalty = cornerDecelPenalty(feed_mm_s, Math.min(v_corner, feed_mm_s), kin.max_acceleration);
              corner_pen = raw_penalty * (1.0 - blend_factor * 0.6); // up to 60% reduction
            } else {
              corner_pen = cornerDecelPenalty(feed_mm_s, Math.min(v_corner, feed_mm_s), kin.max_acceleration);
            }
            corner_overhead += corner_pen;

            ensureTool(currentTool);
            toolData.get(currentTool)!.corner_overhead += corner_pen;
          }

          ensureTool(currentTool);
          const td = toolData.get(currentTool)!;
          td.cutting_time += physics_time;
          td.cutting_dist += move.distance_mm;
          break;
        }

        case "dwell": {
          // G04 P value: if < 100, it's seconds; if >= 100, it's milliseconds (Fanuc convention)
          const p = move.p ?? 0;
          const dwell_sec = p >= 100 ? p / 1000.0 : p;
          dwell_time += dwell_sec;
          break;
        }

        case "tool_change": {
          tool_change_time += kin.tool_change_time;
          tool_change_count++;
          if (move.tool_number !== undefined) {
            currentTool = move.tool_number;
            ensureTool(currentTool);
          }
          break;
        }

        case "spindle": {
          const newSpeed = move.s ?? 0;
          if (newSpeed !== lastSpindleSpeed && newSpeed > 0) {
            // Spindle accel time proportional to speed change
            const speedRatio = lastSpindleSpeed > 0
              ? Math.abs(newSpeed - lastSpindleSpeed) / Math.max(newSpeed, lastSpindleSpeed)
              : 1.0;
            spindle_time += kin.spindle_accel_time * speedRatio;
            lastSpindleSpeed = newSpeed;
          } else if (newSpeed === 0 && lastSpindleSpeed > 0) {
            // Spindle stop
            spindle_time += kin.spindle_accel_time * 0.5;
            lastSpindleSpeed = 0;
          }
          break;
        }

        case "other":
          // Non-motion line: only block processing time (already added above)
          break;
      }
    }

    const total = cutting_time + rapid_time + tool_change_time +
      dwell_time + spindle_time + corner_overhead + settling_overhead;
    // Note: accel_overhead and block_overhead are already included in
    // cutting_time/rapid_time and total respectively, so we don't double-add.
    // But block_overhead is additive (controller overhead).
    const grand_total = total + block_overhead;

    const result: CycleTimeResult = {
      total_seconds: roundTo(grand_total, 2),
      total_formatted: formatTime(grand_total),
      cutting_time: roundTo(cutting_time, 2),
      rapid_time: roundTo(rapid_time, 2),
      tool_change_time: roundTo(tool_change_time, 2),
      dwell_time: roundTo(dwell_time, 2),
      spindle_time: roundTo(spindle_time, 2),
      acceleration_overhead: roundTo(accel_overhead, 2),
      corner_decel_overhead: roundTo(corner_overhead, 2),
      block_processing_overhead: roundTo(block_overhead, 2),
      servo_settling_overhead: roundTo(settling_overhead, 2),
      total_cutting_distance_mm: roundTo(total_cutting_dist, 2),
      total_rapid_distance_mm: roundTo(total_rapid_dist, 2),
      line_count: moves.length,
      tool_change_count,
      machine_profile: config.machine_profile || config.controller,
    };

    if (config.include_breakdown) {
      const toolEntries: ToolBreakdown[] = [];
      const toolDataEntries = Array.from(toolData.entries());
      for (const [toolNum, data] of toolDataEntries) {
        if (toolNum === 0 && data.cutting_time === 0 && data.rapid_time === 0) continue;
        const toolTotal = data.cutting_time + data.rapid_time + data.corner_overhead;
        toolEntries.push({
          tool_number: toolNum,
          tool_description: `T${toolNum}`,
          cutting_time_sec: roundTo(data.cutting_time, 2),
          rapid_time_sec: roundTo(data.rapid_time, 2),
          cutting_distance_mm: roundTo(data.cutting_dist, 2),
          rapid_distance_mm: roundTo(data.rapid_dist, 2),
          corner_decel_overhead_sec: roundTo(data.corner_overhead, 2),
          pct_of_total: grand_total > 0 ? roundTo((toolTotal / grand_total) * 100, 1) : 0,
        });
      }
      toolEntries.sort((a, b) => b.cutting_time_sec - a.cutting_time_sec);
      result.breakdown_by_tool = toolEntries;
    }

    return result;
  }

  /**
   * Compare cycle time estimates across multiple machines.
   *
   * Useful for quoting: which machine should run this job?
   */
  compareEstimates(
    gcode: string,
    machines: Array<{ name: string; controller: ControllerType; machine_profile?: string; kinematics_override?: Partial<MachineKinematics> }>
  ): MachineCompareResult {
    const results: MachineCompareEntry[] = [];

    for (const machine of machines) {
      const est = this.estimateFromGCode(gcode, {
        controller: machine.controller,
        machine_profile: machine.machine_profile,
        kinematics_override: machine.kinematics_override,
      });

      const overhead = est.tool_change_time + est.dwell_time + est.spindle_time +
        est.corner_decel_overhead + est.block_processing_overhead + est.servo_settling_overhead;

      results.push({
        machine: machine.name,
        controller: machine.controller,
        total_seconds: est.total_seconds,
        total_formatted: est.total_formatted,
        cutting_time: est.cutting_time,
        rapid_time: est.rapid_time,
        overhead_time: roundTo(overhead, 2),
        pct_vs_fastest: 0, // computed below
      });
    }

    // Sort by total time
    results.sort((a, b) => a.total_seconds - b.total_seconds);

    const fastest = results[0]?.total_seconds || 1;
    const slowest = results[results.length - 1]?.total_seconds || 1;

    for (const r of results) {
      r.pct_vs_fastest = roundTo(((r.total_seconds - fastest) / fastest) * 100, 1);
    }

    // Generate insights
    const insights: string[] = [];
    if (results.length >= 2) {
      const spread = slowest - fastest;
      insights.push(
        `Time spread: ${formatTime(spread)} (${roundTo((spread / fastest) * 100, 1)}% difference between fastest and slowest)`
      );

      // Find where each machine wins
      const fastestRapid = results.reduce((a, b) => a.rapid_time < b.rapid_time ? a : b);
      const fastestOverhead = results.reduce((a, b) => a.overhead_time < b.overhead_time ? a : b);

      if (fastestRapid.machine !== results[0].machine) {
        insights.push(
          `${fastestRapid.machine} has fastest rapids (${formatTime(fastestRapid.rapid_time)}) but loses on overhead`
        );
      }
      if (fastestOverhead.machine !== results[0].machine) {
        insights.push(
          `${fastestOverhead.machine} has lowest overhead (${formatTime(fastestOverhead.overhead_time)}) — consider for high-tool-count jobs`
        );
      }

      // Tool change dominance check
      const tcPct = results[0].overhead_time / results[0].total_seconds * 100;
      if (tcPct > 20) {
        insights.push(
          `Overhead is ${roundTo(tcPct, 1)}% of cycle — tool consolidation or faster ATC would have significant impact`
        );
      }
    }

    return {
      fastest_machine: results[0]?.machine || "N/A",
      slowest_machine: results[results.length - 1]?.machine || "N/A",
      time_spread_seconds: roundTo(slowest - fastest, 2),
      time_spread_pct: roundTo(((slowest - fastest) / fastest) * 100, 1),
      machines: results,
      insights,
    };
  }

  /**
   * Identify bottleneck sections in a G-code program.
   *
   * Segments the program into logical sections (by tool, by region)
   * and ranks them by time consumption. Returns the top time-consuming
   * sections with actionable suggestions.
   */
  identifyBottlenecks(gcode: string, config: CycleTimeConfig): BottleneckResult {
    const kin = this.resolveKinematics(config);
    const tolerance = config.path_tolerance ?? 0.01;
    const moves = parseGCode(gcode);

    // Compute time for every move
    interface TimedMove {
      line: number;
      type: string;
      time_sec: number;
      distance_mm: number;
      feed_rate: number;
      raw: string;
    }
    const timedMoves: TimedMove[] = [];

    let lastSpindleSpeed = 0;

    for (const move of moves) {
      let time = kin.block_processing_time / 1000.0;

      switch (move.type) {
        case "rapid": {
          if (move.distance_mm > 0) {
            const hasZ = move.z !== undefined;
            const hasXY = (move.x !== undefined || move.y !== undefined);
            let rapid_rate = kin.rapid_rate_xy;
            if (hasZ && !hasXY) rapid_rate = kin.rapid_rate_z;
            else if (hasZ && hasXY) rapid_rate = Math.min(kin.rapid_rate_xy, kin.rapid_rate_z);

            time += sCurveMoveTime(move.distance_mm, rapid_rate / 60.0, kin.max_acceleration, kin.max_jerk);
            time += kin.servo_settling_time / 1000.0;
          }
          break;
        }
        case "linear":
        case "cw_arc":
        case "ccw_arc": {
          if (move.distance_mm > 0) {
            const feed_mm_s = (move.f || 1000) / 60.0;
            time += sCurveMoveTime(move.distance_mm, feed_mm_s, kin.max_acceleration, kin.max_jerk);
            if (move.angle_change_deg > 0.5) {
              const v_corner = maxCornerVelocity(move.angle_change_deg, kin.max_acceleration, tolerance);
              time += cornerDecelPenalty(feed_mm_s, Math.min(v_corner, feed_mm_s), kin.max_acceleration);
            }
          }
          break;
        }
        case "dwell": {
          const p = move.p ?? 0;
          time += p >= 100 ? p / 1000.0 : p;
          break;
        }
        case "tool_change":
          time += kin.tool_change_time;
          break;
        case "spindle": {
          const newSpeed = move.s ?? 0;
          if (newSpeed !== lastSpindleSpeed && newSpeed > 0) {
            const ratio = lastSpindleSpeed > 0
              ? Math.abs(newSpeed - lastSpindleSpeed) / Math.max(newSpeed, lastSpindleSpeed)
              : 1.0;
            time += kin.spindle_accel_time * ratio;
            lastSpindleSpeed = newSpeed;
          }
          break;
        }
      }

      timedMoves.push({
        line: move.line_number,
        type: move.type,
        time_sec: time,
        distance_mm: move.distance_mm,
        feed_rate: move.f || 0,
        raw: move.raw,
      });
    }

    const totalTime = timedMoves.reduce((sum, m) => sum + m.time_sec, 0);

    // Segment into windows and find top time-consuming sections
    // Use a sliding window approach with adaptive window size
    const windowSize = Math.max(10, Math.floor(timedMoves.length / 50));
    const sections: BottleneckSection[] = [];

    for (let start = 0; start < timedMoves.length; start += Math.floor(windowSize / 2)) {
      const end = Math.min(start + windowSize, timedMoves.length);
      const window = timedMoves.slice(start, end);
      const windowTime = window.reduce((s, m) => s + m.time_sec, 0);
      const windowDist = window.reduce((s, m) => s + m.distance_mm, 0);
      const pct = totalTime > 0 ? (windowTime / totalTime) * 100 : 0;

      if (pct < 1) continue; // skip trivial sections

      // Classify the dominant factor
      const rapidCount = window.filter(m => m.type === "rapid").length;
      const feedCount = window.filter(m => m.type === "linear" || m.type === "cw_arc" || m.type === "ccw_arc").length;
      const dwellCount = window.filter(m => m.type === "dwell").length;
      const tcCount = window.filter(m => m.type === "tool_change").length;
      const rapidTime = window.filter(m => m.type === "rapid").reduce((s, m) => s + m.time_sec, 0);
      const feedTime = window.filter(m => m.type === "linear" || m.type === "cw_arc" || m.type === "ccw_arc")
        .reduce((s, m) => s + m.time_sec, 0);
      const rapidDist = window.filter(m => m.type === "rapid").reduce((s, m) => s + m.distance_mm, 0);

      let dominant: string;
      let description: string;
      let suggestion: string;

      if (tcCount > 0 && tcCount * kin.tool_change_time > windowTime * 0.3) {
        dominant = "tool_changes";
        description = `Lines ${window[0].line}-${window[end - start - 1].line}: ${tcCount} tool change(s) consuming ${formatTime(tcCount * kin.tool_change_time)}`;
        suggestion = "Consider tool consolidation or reordering operations to minimize tool changes";
      } else if (dwellCount > 0 && dwellCount > feedCount) {
        dominant = "dwells";
        description = `Lines ${window[0].line}-${window[end - start - 1].line}: Excessive dwell commands`;
        suggestion = "Review dwell necessity — may be compensating for spindle or thermal issues";
      } else if (rapidTime > feedTime && rapidCount > 3) {
        dominant = "rapid_travel";
        description = `Lines ${window[0].line}-${window[end - start - 1].line}: ${roundTo(rapidDist, 1)}mm of rapid travel (${rapidCount} rapids)`;
        suggestion = rapidDist > 500
          ? "Excessive rapid travel — consider reordering operations to minimize repositioning"
          : "Multiple short rapids — may indicate excessive Z retracts in drilling/peck cycle";
      } else if (feedTime > 0) {
        const avgFeed = window.filter(m => m.feed_rate > 0).map(m => m.feed_rate);
        const minFeed = avgFeed.length > 0 ? Math.min(...avgFeed) : 0;
        dominant = "cutting";
        description = `Lines ${window[0].line}-${window[end - start - 1].line}: ${roundTo(windowDist, 1)}mm cutting at ${roundTo(windowTime, 1)}s`;
        if (minFeed > 0 && minFeed < 100) {
          suggestion = `Very low feed rate (${minFeed} mm/min) — verify this is intentional (finishing pass?) or increase feed`;
        } else {
          suggestion = "Review toolpath strategy — consider higher engagement with faster feed or fewer passes";
        }
      } else {
        dominant = "mixed";
        description = `Lines ${window[0].line}-${window[end - start - 1].line}: Mixed operations`;
        suggestion = "Review section for optimization opportunities";
      }

      sections.push({
        start_line: window[0].line,
        end_line: window[end - start - 1].line,
        time_seconds: roundTo(windowTime, 2),
        pct_of_total: roundTo(pct, 1),
        dominant_factor: dominant,
        description,
        suggestion,
      });
    }

    // Sort by time descending and take top 10
    sections.sort((a, b) => b.time_seconds - a.time_seconds);

    // Deduplicate overlapping sections — keep the highest-time version
    const deduped: BottleneckSection[] = [];
    for (const sec of sections) {
      const overlaps = deduped.some(
        existing => sec.start_line <= existing.end_line && sec.end_line >= existing.start_line
      );
      if (!overlaps) {
        deduped.push(sec);
      }
      if (deduped.length >= 10) break;
    }

    // Build summary
    const topPct = deduped.slice(0, 3).reduce((s, d) => s + d.pct_of_total, 0);
    const topFactors = Array.from(new Set(deduped.slice(0, 3).map(d => d.dominant_factor)));
    const summary = `Top 3 bottleneck sections account for ${roundTo(topPct, 1)}% of cycle time. ` +
      `Dominant factors: ${topFactors.join(", ")}. ` +
      `Total estimated cycle time: ${formatTime(totalTime)}.`;

    return {
      total_seconds: roundTo(totalTime, 2),
      sections: deduped,
      summary,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of CycleTimeEstimatorEngine. */
export const cycleTimeEstimatorEngine = new CycleTimeEstimatorEngine();
