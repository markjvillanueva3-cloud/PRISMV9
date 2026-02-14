/**
 * PRISM MCP Server - Toolpath & CAM Calculations
 * Toolpath strategy calculations for CNC machining
 * 
 * Models Implemented:
 * - Engagement Angle Calculations
 * - Trochoidal/Adaptive Clearing Parameters
 * - HSM (High-Speed Machining) Strategies
 * - Scallop Height Prediction
 * - Stepover Optimization
 * - Cycle Time Estimation
 * - Arc Fitting & Tolerance
 * - Toolpath Smoothing Parameters
 * 
 * Used for CAM programming and toolpath optimization
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EngagementResult {
  entry_angle: number;          // degrees
  exit_angle: number;           // degrees
  arc_of_engagement: number;    // degrees
  average_chip_thickness: number; // mm
  max_chip_thickness: number;   // mm
  radial_engagement_percent: number;
  is_climb_milling: boolean;
  effective_cutting_speed: number; // m/min (adjusted for engagement)
  warnings: string[];
}

export interface TrochoidalParams {
  trochoidal_width: number;     // mm (stepover in trochoidal)
  trochoidal_pitch: number;     // mm (forward step per loop)
  arc_radius: number;           // mm
  helix_angle: number;          // degrees
  optimal_feed_rate: number;    // mm/min
  optimal_spindle: number;      // rpm
  engagement_percent: number;   // %
  mrr: number;                  // cm³/min
  warnings: string[];
}

export interface HSMParams {
  corner_radius: number;        // mm (minimum corner radius)
  max_direction_change: number; // degrees
  smoothing_tolerance: number;  // mm
  arc_fitting_tolerance: number; // mm
  feed_rate_reduction: number;  // % at corners
  recommended_lead_in: string;  // arc/linear/helix
  chip_thinning_factor: number;
  warnings: string[];
}

export interface ScallopResult {
  scallop_height: number;       // mm (cusp height)
  stepover: number;             // mm
  theoretical_Ra: number;       // μm (surface roughness estimate)
  passes_required: number;      // number of passes
  total_toolpath_length: number; // mm
  machining_time: number;       // min
  warnings: string[];
}

export interface CycleTimeResult {
  cutting_time: number;         // min
  rapid_time: number;           // min
  tool_change_time: number;     // min
  total_time: number;           // min
  cutting_distance: number;     // mm
  rapid_distance: number;       // mm
  utilization_percent: number;  // % time actually cutting
  warnings: string[];
}

export interface StepoverResult {
  optimal_stepover: number;     // mm
  stepover_percent: number;     // % of tool diameter
  scallop_height: number;       // mm
  number_of_passes: number;
  overlap_percent: number;      // % overlap between passes
  strategy: string;             // recommended strategy
  warnings: string[];
}

export interface ArcFitResult {
  arc_segments: number;
  chord_error: number;          // mm
  effective_feedrate: number;   // mm/min (limited by controller)
  block_processing_time: number; // ms per block
  recommended_tolerance: number; // mm
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CAM_CONSTANTS = {
  // Engagement limits
  MAX_ENGAGEMENT_ROUGHING: 70,    // % for roughing
  MAX_ENGAGEMENT_FINISHING: 40,   // % for finishing
  OPTIMAL_ENGAGEMENT_HSM: 10,     // % for HSM
  
  // Trochoidal defaults
  TROCHOIDAL_ENGAGEMENT: 8,       // % typical
  TROCHOIDAL_WIDTH_FACTOR: 0.1,   // × tool diameter
  
  // HSM limits
  HSM_MIN_CORNER_RADIUS: 0.5,     // mm
  HSM_MAX_DIRECTION_CHANGE: 45,   // degrees
  
  // Controller limits
  BLOCK_PROCESSING_TIME: 1,       // ms typical
  MIN_SEGMENT_LENGTH: 0.01,       // mm
  
  // Rapid rates (typical)
  RAPID_RATE_XY: 30000,           // mm/min
  RAPID_RATE_Z: 15000             // mm/min
};

// ============================================================================
// ENGAGEMENT ANGLE CALCULATIONS
// ============================================================================

/**
 * Calculate tool engagement angles for milling
 * 
 * Entry/exit angles determine chip formation and force variation.
 * Critical for understanding cutting dynamics and optimizing parameters.
 * 
 * @param tool_diameter - Tool diameter D [mm]
 * @param radial_depth - Radial depth of cut ae [mm]
 * @param feed_per_tooth - Feed per tooth fz [mm]
 * @param is_climb - True for climb milling, false for conventional
 * @param cutting_speed - Cutting speed Vc [m/min]
 * @returns Engagement analysis results
 */
export function calculateEngagementAngle(
  tool_diameter: number,
  radial_depth: number,
  feed_per_tooth: number,
  is_climb: boolean = true,
  cutting_speed?: number
): EngagementResult {
  const warnings: string[] = [];
  const radius = tool_diameter / 2;
  
  // Radial engagement percentage
  const radial_engagement_percent = (radial_depth / tool_diameter) * 100;
  
  // Calculate engagement angle using geometry
  // cos(θ) = (R - ae) / R = 1 - ae/R = 1 - 2×ae/D
  const cos_half_angle = 1 - (radial_depth / radius);
  const half_angle_rad = Math.acos(Math.max(-1, Math.min(1, cos_half_angle)));
  const arc_of_engagement = (half_angle_rad * 180 / Math.PI) * 2;
  
  // Entry and exit angles depend on climb vs conventional
  let entry_angle: number;
  let exit_angle: number;
  
  if (is_climb) {
    // Climb milling: tool enters at max chip, exits at zero
    entry_angle = 90 - (arc_of_engagement / 2);
    exit_angle = 90 + (arc_of_engagement / 2);
  } else {
    // Conventional: tool enters at zero chip, exits at max
    entry_angle = 90 + (arc_of_engagement / 2);
    exit_angle = 90 - (arc_of_engagement / 2);
  }
  
  // Chip thickness calculations
  // h_max = fz × sin(engagement_angle/2)
  const max_chip_thickness = feed_per_tooth * Math.sin(half_angle_rad);
  
  // Average chip thickness (simplified)
  // h_avg ≈ fz × (ae/D)^0.5 × (2/π) × arc_of_engagement
  const avg_factor = Math.sqrt(radial_depth / tool_diameter);
  const average_chip_thickness = feed_per_tooth * avg_factor * 0.637;
  
  // Effective cutting speed adjustment
  let effective_cutting_speed = cutting_speed || 0;
  if (cutting_speed && radial_engagement_percent < 50) {
    // Chip thinning compensation - can increase speed
    const compensation = 1 / avg_factor;
    effective_cutting_speed = cutting_speed * Math.min(compensation, 1.5);
  }
  
  // Warnings
  if (radial_engagement_percent > CAM_CONSTANTS.MAX_ENGAGEMENT_ROUGHING) {
    warnings.push(`Radial engagement ${radial_engagement_percent.toFixed(0)}% exceeds recommended ${CAM_CONSTANTS.MAX_ENGAGEMENT_ROUGHING}%`);
  }
  if (arc_of_engagement > 120) {
    warnings.push("High arc of engagement may cause excessive tool load variation");
  }
  if (average_chip_thickness < 0.01) {
    warnings.push("Chip thickness very thin - risk of rubbing instead of cutting");
  }
  
  log.debug(`[Engagement] D=${tool_diameter}, ae=${radial_depth}, arc=${arc_of_engagement.toFixed(1)}°`);
  
  return {
    entry_angle: Math.round(entry_angle * 10) / 10,
    exit_angle: Math.round(exit_angle * 10) / 10,
    arc_of_engagement: Math.round(arc_of_engagement * 10) / 10,
    average_chip_thickness: Math.round(average_chip_thickness * 10000) / 10000,
    max_chip_thickness: Math.round(max_chip_thickness * 10000) / 10000,
    radial_engagement_percent: Math.round(radial_engagement_percent * 10) / 10,
    is_climb_milling: is_climb,
    effective_cutting_speed: Math.round(effective_cutting_speed),
    warnings
  };
}

// ============================================================================
// TROCHOIDAL / ADAPTIVE CLEARING
// ============================================================================

/**
 * Calculate trochoidal (adaptive) milling parameters
 * 
 * Trochoidal milling uses circular arcs to maintain constant engagement,
 * allowing higher axial depth with lower radial engagement.
 * 
 * @param tool_diameter - Tool diameter [mm]
 * @param slot_width - Width of slot/pocket to clear [mm]
 * @param axial_depth - Axial depth of cut [mm]
 * @param cutting_speed - Target cutting speed [m/min]
 * @param feed_per_tooth - Feed per tooth [mm]
 * @param number_of_teeth - Number of cutting teeth
 * @returns Trochoidal parameters
 */
export function calculateTrochoidalParams(
  tool_diameter: number,
  slot_width: number,
  axial_depth: number,
  cutting_speed: number,
  feed_per_tooth: number,
  number_of_teeth: number
): TrochoidalParams {
  const warnings: string[] = [];
  
  // Trochoidal width (stepover) - typically 5-15% of tool diameter
  const engagement_percent = CAM_CONSTANTS.TROCHOIDAL_ENGAGEMENT;
  const trochoidal_width = tool_diameter * (engagement_percent / 100);
  
  // Arc radius - tool moves in circular arcs
  // Typically: arc_radius = (slot_width - tool_diameter) / 2 + small_offset
  const available_width = slot_width - tool_diameter;
  const arc_radius = Math.max(available_width / 2, trochoidal_width);
  
  // Trochoidal pitch - forward movement per circular loop
  // Pitch ≈ trochoidal_width × 0.8-1.0
  const trochoidal_pitch = trochoidal_width * 0.9;
  
  // Helix angle for entry (typically 2-5°)
  const helix_angle = 3;
  
  // Calculate spindle speed
  const spindle_speed = (1000 * cutting_speed) / (Math.PI * tool_diameter);
  
  // Feed rate for trochoidal - can be aggressive due to low engagement
  // Compensate for chip thinning
  const chip_thinning_factor = 1 / Math.sqrt(engagement_percent / 50);
  const compensated_feed = feed_per_tooth * chip_thinning_factor;
  const optimal_feed_rate = compensated_feed * number_of_teeth * spindle_speed;
  
  // Calculate MRR
  const effective_ae = trochoidal_width;
  const feed_rate_linear = trochoidal_pitch * spindle_speed / (2 * Math.PI * arc_radius) * (optimal_feed_rate / spindle_speed);
  const mrr = (axial_depth * effective_ae * optimal_feed_rate) / 1000 / 1000;
  
  // Warnings
  if (slot_width < tool_diameter * 1.2) {
    warnings.push("Slot too narrow for effective trochoidal milling");
  }
  if (trochoidal_width > tool_diameter * 0.2) {
    warnings.push("Consider reducing engagement for better tool life");
  }
  
  log.debug(`[Trochoidal] D=${tool_diameter}, width=${trochoidal_width.toFixed(2)}, pitch=${trochoidal_pitch.toFixed(2)}`);
  
  return {
    trochoidal_width: Math.round(trochoidal_width * 100) / 100,
    trochoidal_pitch: Math.round(trochoidal_pitch * 100) / 100,
    arc_radius: Math.round(arc_radius * 100) / 100,
    helix_angle,
    optimal_feed_rate: Math.round(optimal_feed_rate),
    optimal_spindle: Math.round(spindle_speed),
    engagement_percent,
    mrr: Math.round(mrr * 100) / 100,
    warnings
  };
}

// ============================================================================
// HSM (HIGH-SPEED MACHINING) PARAMETERS
// ============================================================================

/**
 * Calculate HSM strategy parameters
 * 
 * HSM requires smooth toolpaths with gradual direction changes
 * to maintain high feed rates without machine shock.
 * 
 * @param tool_diameter - Tool diameter [mm]
 * @param programmed_feedrate - Programmed feed rate [mm/min]
 * @param machine_max_accel - Machine max acceleration [m/s²]
 * @param tolerance - Part tolerance [mm]
 * @returns HSM parameters
 */
export function calculateHSMParams(
  tool_diameter: number,
  programmed_feedrate: number,
  machine_max_accel: number = 5,
  tolerance: number = 0.01
): HSMParams {
  const warnings: string[] = [];
  
  // Minimum corner radius to maintain feedrate
  // R_min = V² / a where V is feedrate, a is acceleration
  const feedrate_ms = programmed_feedrate / 60000; // m/s
  const accel_ms2 = machine_max_accel;
  const min_corner_radius = (feedrate_ms * feedrate_ms) / accel_ms2 * 1000; // mm
  
  const corner_radius = Math.max(min_corner_radius, CAM_CONSTANTS.HSM_MIN_CORNER_RADIUS);
  
  // Maximum direction change without significant slowdown
  const max_direction_change = CAM_CONSTANTS.HSM_MAX_DIRECTION_CHANGE;
  
  // Smoothing tolerance - balance between accuracy and smoothness
  const smoothing_tolerance = Math.min(tolerance * 0.5, 0.005);
  
  // Arc fitting tolerance
  const arc_fitting_tolerance = tolerance * 0.3;
  
  // Feed rate reduction at corners (simplified)
  // Reduction based on direction change angle
  const feed_rate_reduction = 15; // % typical at 90° corners
  
  // Recommended lead-in type
  const recommended_lead_in = corner_radius > 2 ? "arc" : "helix";
  
  // Chip thinning factor for light engagement
  const chip_thinning_factor = 1.4; // Typical for HSM
  
  // Warnings
  if (min_corner_radius > 5) {
    warnings.push(`High feedrate requires ${min_corner_radius.toFixed(1)}mm minimum corner radius`);
  }
  if (tolerance < 0.005) {
    warnings.push("Tight tolerance may limit HSM effectiveness");
  }
  
  log.debug(`[HSM] Vf=${programmed_feedrate}, R_min=${corner_radius.toFixed(2)}mm`);
  
  return {
    corner_radius: Math.round(corner_radius * 100) / 100,
    max_direction_change,
    smoothing_tolerance: Math.round(smoothing_tolerance * 10000) / 10000,
    arc_fitting_tolerance: Math.round(arc_fitting_tolerance * 10000) / 10000,
    feed_rate_reduction,
    recommended_lead_in,
    chip_thinning_factor,
    warnings
  };
}

// ============================================================================
// SCALLOP HEIGHT CALCULATION
// ============================================================================

/**
 * Calculate scallop height for 3D surface machining
 * 
 * Scallop (cusp) height determines surface quality in finishing.
 * h = R - √(R² - (s/2)²) ≈ s²/(8R) for small stepover
 * 
 * @param tool_radius - Tool/nose radius R [mm]
 * @param stepover - Stepover between passes [mm]
 * @param surface_width - Total width to machine [mm]
 * @param feed_rate - Feed rate [mm/min]
 * @param is_ball_nose - True for ball nose, false for flat/bull
 * @returns Scallop analysis
 */
export function calculateScallopHeight(
  tool_radius: number,
  stepover: number,
  surface_width: number,
  feed_rate: number,
  is_ball_nose: boolean = true
): ScallopResult {
  const warnings: string[] = [];
  
  // Calculate scallop height
  // h = R - √(R² - (s/2)²)
  const half_step = stepover / 2;
  let scallop_height: number;
  
  if (is_ball_nose) {
    if (half_step >= tool_radius) {
      scallop_height = tool_radius;
      warnings.push("Stepover exceeds tool radius - will leave material");
    } else {
      scallop_height = tool_radius - Math.sqrt(tool_radius * tool_radius - half_step * half_step);
    }
  } else {
    // Flat end mill - scallop only from surface curvature
    // Simplified: assume flat surface = no scallop
    scallop_height = 0;
    warnings.push("Flat end mill - scallop calculation assumes ball nose");
  }
  
  // Convert to theoretical surface roughness (approximate)
  // Ra ≈ scallop_height / 4 (simplified relationship)
  const theoretical_Ra = scallop_height * 1000 / 4; // μm
  
  // Number of passes required
  const passes_required = Math.ceil(surface_width / stepover);
  
  // Total toolpath length (simplified - assumes parallel passes)
  const pass_length = surface_width * 1.1; // 10% overlap
  const total_toolpath_length = passes_required * pass_length;
  
  // Machining time
  const machining_time = total_toolpath_length / feed_rate;
  
  // Warnings
  if (scallop_height > 0.05) {
    warnings.push(`Scallop height ${(scallop_height * 1000).toFixed(0)}μm may be visible`);
  }
  if (theoretical_Ra > 3.2) {
    warnings.push("Consider smaller stepover for better surface finish");
  }
  
  log.debug(`[Scallop] R=${tool_radius}, step=${stepover}, h=${scallop_height.toFixed(4)}mm`);
  
  return {
    scallop_height: Math.round(scallop_height * 10000) / 10000,
    stepover,
    theoretical_Ra: Math.round(theoretical_Ra * 100) / 100,
    passes_required,
    total_toolpath_length: Math.round(total_toolpath_length),
    machining_time: Math.round(machining_time * 10) / 10,
    warnings
  };
}

// ============================================================================
// STEPOVER OPTIMIZATION
// ============================================================================

/**
 * Calculate optimal stepover for given surface finish requirement
 * 
 * @param tool_diameter - Tool diameter [mm]
 * @param tool_corner_radius - Tool corner/nose radius [mm]
 * @param target_scallop - Target scallop height [mm]
 * @param operation - Operation type
 * @returns Stepover recommendations
 */
export function calculateOptimalStepover(
  tool_diameter: number,
  tool_corner_radius: number,
  target_scallop: number = 0.01,
  operation: "roughing" | "semi-finishing" | "finishing" = "finishing"
): StepoverResult {
  const warnings: string[] = [];
  
  // Use corner radius for scallop calculation
  const effective_radius = tool_corner_radius > 0 ? tool_corner_radius : tool_diameter / 2;
  
  // Calculate stepover from target scallop
  // s = 2 × √(2Rh - h²) ≈ 2√(2Rh) for small h
  const optimal_stepover = 2 * Math.sqrt(2 * effective_radius * target_scallop);
  
  // Stepover as percentage of tool diameter
  const stepover_percent = (optimal_stepover / tool_diameter) * 100;
  
  // Actual scallop height verification
  const half_step = optimal_stepover / 2;
  const actual_scallop = effective_radius - Math.sqrt(effective_radius * effective_radius - half_step * half_step);
  
  // Number of passes for 100mm width (reference)
  const reference_width = 100;
  const number_of_passes = Math.ceil(reference_width / optimal_stepover);
  
  // Overlap percentage
  const overlap_percent = 100 - stepover_percent;
  
  // Recommend strategy based on operation
  let strategy: string;
  let adjusted_stepover = optimal_stepover;
  
  switch (operation) {
    case "roughing":
      strategy = "Parallel/Zigzag with 50-70% stepover";
      adjusted_stepover = tool_diameter * 0.6;
      break;
    case "semi-finishing":
      strategy = "Parallel with 30-50% stepover";
      adjusted_stepover = tool_diameter * 0.4;
      break;
    case "finishing":
      strategy = "Parallel/Spiral with scallop-based stepover";
      // Keep calculated stepover
      break;
  }
  
  // Warnings
  if (stepover_percent > 70) {
    warnings.push("Stepover exceeds 70% - may leave uncut material in corners");
  }
  if (stepover_percent < 5) {
    warnings.push("Very small stepover - consider using smaller tool");
  }
  
  log.debug(`[Stepover] D=${tool_diameter}, r=${effective_radius}, step=${optimal_stepover.toFixed(3)}mm`);
  
  return {
    optimal_stepover: Math.round(optimal_stepover * 1000) / 1000,
    stepover_percent: Math.round(stepover_percent * 10) / 10,
    scallop_height: Math.round(actual_scallop * 10000) / 10000,
    number_of_passes,
    overlap_percent: Math.round(overlap_percent * 10) / 10,
    strategy,
    warnings
  };
}

// ============================================================================
// CYCLE TIME ESTIMATION
// ============================================================================

/**
 * Estimate machining cycle time
 * 
 * @param cutting_distance - Total cutting distance [mm]
 * @param cutting_feedrate - Cutting feed rate [mm/min]
 * @param rapid_distance - Total rapid distance [mm]
 * @param number_of_tools - Number of tool changes
 * @param tool_change_time - Time per tool change [min]
 * @param rapid_rate - Rapid traverse rate [mm/min]
 * @returns Cycle time breakdown
 */
export function estimateCycleTime(
  cutting_distance: number,
  cutting_feedrate: number,
  rapid_distance: number,
  number_of_tools: number = 1,
  tool_change_time: number = 0.5,
  rapid_rate: number = CAM_CONSTANTS.RAPID_RATE_XY
): CycleTimeResult {
  const warnings: string[] = [];
  
  // Cutting time
  const cutting_time = cutting_distance / cutting_feedrate;
  
  // Rapid time
  const rapid_time = rapid_distance / rapid_rate;
  
  // Tool change time
  const total_tool_change_time = (number_of_tools - 1) * tool_change_time;
  
  // Total time
  const total_time = cutting_time + rapid_time + total_tool_change_time;
  
  // Utilization (% time actually cutting)
  const utilization_percent = (cutting_time / total_time) * 100;
  
  // Warnings
  if (utilization_percent < 50) {
    warnings.push(`Low utilization ${utilization_percent.toFixed(0)}% - consider toolpath optimization`);
  }
  if (rapid_time > cutting_time) {
    warnings.push("More time in rapids than cutting - check toolpath efficiency");
  }
  
  log.debug(`[CycleTime] Cut=${cutting_time.toFixed(1)}min, Rapid=${rapid_time.toFixed(1)}min, Total=${total_time.toFixed(1)}min`);
  
  return {
    cutting_time: Math.round(cutting_time * 10) / 10,
    rapid_time: Math.round(rapid_time * 10) / 10,
    tool_change_time: Math.round(total_tool_change_time * 10) / 10,
    total_time: Math.round(total_time * 10) / 10,
    cutting_distance: Math.round(cutting_distance),
    rapid_distance: Math.round(rapid_distance),
    utilization_percent: Math.round(utilization_percent * 10) / 10,
    warnings
  };
}

// ============================================================================
// ARC FITTING & TOLERANCE
// ============================================================================

/**
 * Calculate arc fitting parameters for smooth toolpaths
 * 
 * @param chord_tolerance - Allowed chord error [mm]
 * @param arc_radius - Arc radius [mm]
 * @param feedrate - Programmed feedrate [mm/min]
 * @param block_time - Controller block processing time [ms]
 * @returns Arc fitting analysis
 */
export function calculateArcFitting(
  chord_tolerance: number,
  arc_radius: number,
  feedrate: number,
  block_time: number = CAM_CONSTANTS.BLOCK_PROCESSING_TIME
): ArcFitResult {
  const warnings: string[] = [];
  
  // Segment length from chord tolerance
  // chord_error = R - √(R² - (L/2)²) ≈ L²/(8R)
  // L = √(8 × R × chord_error)
  const segment_length = Math.sqrt(8 * arc_radius * chord_tolerance);
  
  // Number of segments for 90° arc
  const arc_length_90 = (Math.PI / 2) * arc_radius;
  const arc_segments = Math.ceil(arc_length_90 / segment_length);
  
  // Effective feedrate limited by block processing
  // V_max = segment_length / (block_time/1000)
  const max_feedrate_from_blocks = segment_length / (block_time / 1000) * 60; // mm/min
  const effective_feedrate = Math.min(feedrate, max_feedrate_from_blocks);
  
  // Block processing time per segment
  const block_processing_time = block_time;
  
  // Recommended tolerance for smooth motion
  let recommended_tolerance = chord_tolerance;
  if (effective_feedrate < feedrate * 0.8) {
    recommended_tolerance = chord_tolerance * 2;
    warnings.push(`Feedrate limited to ${effective_feedrate.toFixed(0)} mm/min by block processing`);
  }
  
  // Warnings
  if (segment_length < CAM_CONSTANTS.MIN_SEGMENT_LENGTH) {
    warnings.push("Segment length below controller minimum");
  }
  if (arc_segments > 100) {
    warnings.push("Many segments for arc - consider increasing tolerance");
  }
  
  log.debug(`[ArcFit] tol=${chord_tolerance}, R=${arc_radius}, segments=${arc_segments}`);
  
  return {
    arc_segments,
    chord_error: chord_tolerance,
    effective_feedrate: Math.round(effective_feedrate),
    block_processing_time,
    recommended_tolerance: Math.round(recommended_tolerance * 10000) / 10000,
    warnings
  };
}

// Export singleton
export const toolpathCalculations = {
  engagementAngle: calculateEngagementAngle,
  trochoidalParams: calculateTrochoidalParams,
  hsmParams: calculateHSMParams,
  scallopHeight: calculateScallopHeight,
  optimalStepover: calculateOptimalStepover,
  cycleTime: estimateCycleTime,
  arcFitting: calculateArcFitting,
  CAM_CONSTANTS
};
