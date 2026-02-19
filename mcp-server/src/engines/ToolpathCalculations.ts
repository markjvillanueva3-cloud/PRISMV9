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

// ============================================================
// ADVANCED COMPETITIVE FEATURES
// ============================================================

/**
 * Chip Thinning Compensation
 * When ae < 50% of tool diameter, the actual chip thickness is less than fz.
 * Must increase programmed fz to maintain effective chip load.
 * This is what separates advanced from basic speed/feed calculators.
 */
export function calculateChipThinning(
  tool_diameter: number,
  radial_depth: number,
  programmed_fz: number,
  number_of_teeth: number,
  cutting_speed: number
): any {
  const ae_ratio = radial_depth / tool_diameter;
  
  // Engagement angle (radians)
  const engagement_angle = Math.acos(1 - (2 * radial_depth / tool_diameter));
  
  // Average chip thickness
  const hex = programmed_fz * Math.sin(engagement_angle) * (180 / Math.PI) / (engagement_angle * 180 / Math.PI);
  
  // True hex using radial chip thinning formula
  // hex = fz × (ae/D) when ae < D/2, simplified
  const hex_actual = programmed_fz * Math.sqrt(2 * radial_depth / tool_diameter - Math.pow(radial_depth / tool_diameter, 2));
  
  // Compensated fz to achieve target hex = programmed_fz
  const fz_compensated = ae_ratio < 0.5 
    ? programmed_fz / Math.sqrt(2 * ae_ratio - ae_ratio * ae_ratio)
    : programmed_fz;
  
  // Compensated feed rate
  const rpm = (cutting_speed * 1000) / (Math.PI * tool_diameter);
  const vf_original = rpm * number_of_teeth * programmed_fz;
  const vf_compensated = rpm * number_of_teeth * fz_compensated;
  
  const warnings: string[] = [];
  if (fz_compensated > programmed_fz * 3) warnings.push("Compensation >3x — check radial depth is not too small");
  if (ae_ratio < 0.05) warnings.push("Very light radial engagement — consider increasing ae for stability");
  
  return {
    input: { tool_diameter, radial_depth, programmed_fz, ae_ratio: Math.round(ae_ratio * 100) / 100 },
    chip_thinning: {
      engagement_angle_deg: Math.round(engagement_angle * 180 / Math.PI * 10) / 10,
      hex_without_compensation: Math.round(hex_actual * 10000) / 10000,
      hex_target: programmed_fz,
      fz_compensated: Math.round(fz_compensated * 10000) / 10000,
      compensation_factor: Math.round(fz_compensated / programmed_fz * 100) / 100,
      needs_compensation: ae_ratio < 0.5
    },
    feed_rates: {
      vf_original: Math.round(vf_original),
      vf_compensated: Math.round(vf_compensated),
      feed_increase_pct: Math.round((vf_compensated / vf_original - 1) * 100)
    },
    warnings
  };
}

/**
 * Multi-Pass Strategy Optimizer
 * Given total stock to remove, calculates optimal number of passes,
 * DOC per pass, and parameters for rough → semi → finish sequence.
 */
export function calculateMultiPassStrategy(
  total_stock: number,        // mm to remove
  tool_diameter: number,
  material_kc1_1: number,     // Kienzle specific force
  machine_power_kw: number,
  cutting_speed_rough: number,
  cutting_speed_finish: number,
  fz_rough: number,
  fz_finish: number,
  target_Ra?: number          // target surface finish μm
): any {
  const warnings: string[] = [];
  
  // Finish pass: fixed small DOC
  const finish_ap = target_Ra ? Math.min(0.5, total_stock * 0.1) : 0.3;
  const finish_ae = tool_diameter * 0.7; // 70% stepover for finish
  
  // Semi-finish: moderate DOC
  const semi_ap = Math.min(1.0, total_stock * 0.15);
  const semi_ae = tool_diameter * 0.5;
  
  // Remaining stock for roughing
  const rough_stock = total_stock - finish_ap - semi_ap;
  
  // Max roughing DOC based on power limit
  // P = kc1_1 × ap × ae × fz × z × n / (60000 × efficiency)
  const rough_ae = tool_diameter * 0.5;
  const rough_rpm = (cutting_speed_rough * 1000) / (Math.PI * tool_diameter);
  const efficiency = 0.8;
  // Solve for max ap: ap_max = P × 60000 × eff / (kc1_1 × ae × fz × z × n)
  const z = 4; // assume 4 flutes
  const ap_max_power = (machine_power_kw * 60000 * efficiency) / (material_kc1_1 * rough_ae * fz_rough * z * rough_rpm / 1000);
  const ap_max = Math.min(ap_max_power, tool_diameter * 1.5, rough_stock);
  
  // Number of roughing passes
  const rough_passes = rough_stock > 0 ? Math.ceil(rough_stock / ap_max) : 0;
  const actual_rough_ap = rough_stock > 0 ? rough_stock / rough_passes : 0;
  
  // MRR per phase
  const rough_vf = rough_rpm * z * fz_rough;
  const rough_mrr = actual_rough_ap * rough_ae * rough_vf / 1000;
  
  const semi_rpm = ((cutting_speed_rough + cutting_speed_finish) / 2 * 1000) / (Math.PI * tool_diameter);
  const semi_fz = (fz_rough + fz_finish) / 2;
  const semi_vf = semi_rpm * z * semi_fz;
  const semi_mrr = semi_ap * semi_ae * semi_vf / 1000;
  
  const finish_rpm = (cutting_speed_finish * 1000) / (Math.PI * tool_diameter);
  const finish_vf = finish_rpm * z * fz_finish;
  const finish_mrr = finish_ap * finish_ae * finish_vf / 1000;
  
  if (rough_stock < 0) warnings.push("Total stock too small for 3-pass strategy — consider 2-pass");
  if (actual_rough_ap > tool_diameter) warnings.push("Roughing DOC exceeds tool diameter — verify tool capability");
  
  return {
    strategy: {
      total_stock_mm: total_stock,
      total_passes: rough_passes + 2,
      phases: [
        {
          phase: "roughing",
          passes: rough_passes,
          ap_mm: Math.round(actual_rough_ap * 100) / 100,
          ae_mm: Math.round(rough_ae * 100) / 100,
          vc: cutting_speed_rough,
          fz: fz_rough,
          rpm: Math.round(rough_rpm),
          vf: Math.round(rough_vf),
          mrr_cm3_min: Math.round(rough_mrr * 10) / 10
        },
        {
          phase: "semi-finishing",
          passes: 1,
          ap_mm: Math.round(semi_ap * 100) / 100,
          ae_mm: Math.round(semi_ae * 100) / 100,
          vc: Math.round((cutting_speed_rough + cutting_speed_finish) / 2),
          fz: Math.round(semi_fz * 1000) / 1000,
          rpm: Math.round(semi_rpm),
          vf: Math.round(semi_vf),
          mrr_cm3_min: Math.round(semi_mrr * 10) / 10
        },
        {
          phase: "finishing",
          passes: 1,
          ap_mm: Math.round(finish_ap * 100) / 100,
          ae_mm: Math.round(finish_ae * 100) / 100,
          vc: cutting_speed_finish,
          fz: fz_finish,
          rpm: Math.round(finish_rpm),
          vf: Math.round(finish_vf),
          mrr_cm3_min: Math.round(finish_mrr * 10) / 10
        }
      ]
    },
    power_check: {
      max_rough_ap_by_power: Math.round(ap_max_power * 100) / 100,
      actual_rough_ap: Math.round(actual_rough_ap * 100) / 100,
      power_limited: actual_rough_ap >= ap_max_power * 0.95
    },
    warnings
  };
}

/**
 * Coolant Strategy Recommendation
 * Based on material, operation, speed, and tool — recommends optimal coolant approach.
 */
export function recommendCoolantStrategy(
  iso_group: string,
  operation: string,
  cutting_speed: number,
  tool_has_coolant_through: boolean,
  material_thermal_conductivity?: number
): any {
  const op = operation.toLowerCase();
  const warnings: string[] = [];
  
  // Decision matrix
  let primary = "flood";
  let pressure_bar = 20;
  let concentration_pct = 8;
  let reasoning: string[] = [];
  
  // High-speed → MQL or dry
  if (cutting_speed > 300) {
    primary = "dry";
    reasoning.push("Speed >300 m/min — thermal shock risk with flood coolant");
    if (iso_group === "N") {
      primary = "mql"; // Aluminum needs lubrication even at high speed
      reasoning.push("Aluminum: MQL preferred for lubricity even at high speed");
    }
  }
  
  // Superalloys and titanium → high pressure
  if (iso_group === "S" || (iso_group === "N" && (material_thermal_conductivity || 50) < 15)) {
    primary = "high_pressure";
    pressure_bar = 70;
    reasoning.push("Low thermal conductivity material — high pressure coolant needed for chip breaking and heat removal");
    if (tool_has_coolant_through) {
      pressure_bar = 100;
      reasoning.push("Through-tool coolant available — maximize pressure for chip evacuation");
    }
  }
  
  // Hardened steel → dry or MQL
  if (iso_group === "H") {
    primary = cutting_speed > 150 ? "dry" : "mql";
    reasoning.push("Hardened steel: dry/MQL preferred to avoid thermal cracking of CBN/ceramic tools");
  }
  
  // Cast iron → dry preferred
  if (iso_group === "K") {
    primary = "dry";
    reasoning.push("Cast iron: dry cutting preferred — short chips, graphite provides natural lubrication");
    if (op.includes("drill")) {
      primary = "mql";
      reasoning.push("Drilling exception: MQL for chip evacuation in deep holes");
    }
  }
  
  // Drilling always needs coolant
  if (op.includes("drill") && primary === "dry") {
    primary = tool_has_coolant_through ? "high_pressure" : "flood";
    pressure_bar = tool_has_coolant_through ? 40 : 20;
    reasoning.push("Drilling requires coolant for chip evacuation regardless of material");
  }
  
  // Stainless → flood with high concentration
  if (iso_group === "M") {
    if (primary === "dry") primary = "flood";
    concentration_pct = 10;
    reasoning.push("Stainless steel: higher coolant concentration for anti-galling protection");
  }
  
  // MQL specifics
  let mql_flow_rate = primary === "mql" ? 50 : 0; // ml/hr
  
  return {
    recommendation: {
      strategy: primary,
      pressure_bar: primary.includes("pressure") ? pressure_bar : (primary === "flood" ? 20 : 0),
      concentration_pct: primary === "flood" || primary === "high_pressure" ? concentration_pct : 0,
      mql_flow_rate_ml_hr: mql_flow_rate,
      coolant_type: primary === "dry" ? "none" : (primary === "mql" ? "vegetable_ester" : "semi_synthetic")
    },
    alternatives: getAlternatives(primary, iso_group),
    reasoning,
    warnings
  };
}

function getAlternatives(primary: string, iso_group: string): any[] {
  const alts: any[] = [];
  if (primary !== "flood") alts.push({ strategy: "flood", note: "Safe fallback for any material" });
  if (primary !== "mql") alts.push({ strategy: "mql", note: "50-80 ml/hr, reduced mess, environmentally friendly" });
  if (primary !== "dry" && iso_group !== "S") alts.push({ strategy: "dry", note: "Fastest chip evacuation, no cleanup" });
  if (iso_group === "S" || iso_group === "N") alts.push({ strategy: "cryogenic_CO2", note: "Sub-zero cooling for heat-resistant alloys" });
  return alts;
}

/**
 * G-Code Snippet Generator
 * Generates ready-to-paste G-code for common operations across controller families.
 */
export function generateGCodeSnippet(
  controller: string,
  operation: string,
  params: {
    rpm: number;
    feed_rate: number;
    tool_number?: number;
    depth_of_cut?: number;
    x_start?: number;
    y_start?: number;
    z_safe?: number;
    z_depth?: number;
    coolant?: string;
  }
): any {
  const ctrl = controller.toLowerCase();
  const op = operation.toLowerCase();
  const T = params.tool_number || 1;
  const S = params.rpm;
  const F = params.feed_rate;
  const zSafe = params.z_safe || 5;
  const zDepth = params.z_depth || -(params.depth_of_cut || 3);
  const coolantCode = params.coolant === "mist" ? "M7" : "M8";
  
  let code = "";
  let notes: string[] = [];
  
  if (ctrl.includes("fanuc") || ctrl.includes("haas")) {
    // Fanuc/Haas G-code
    if (op.includes("face") || op.includes("mill")) {
      code = [
        `( ${operation.toUpperCase()} OPERATION )`,
        `( Generated by PRISM Manufacturing Intelligence )`,
        `G90 G54 G17`,
        `T${T} M6`,
        `G43 H${T} Z${zSafe}`,
        `S${S} M3`,
        coolantCode,
        `G0 X${params.x_start || 0} Y${params.y_start || 0}`,
        `G0 Z${zSafe}`,
        `G1 Z${zDepth} F${Math.round(F * 0.3)}`,
        `G1 X100. F${F}`,
        `G0 Z${zSafe}`,
        `M9`,
        `M5`,
        `G91 G28 Z0`,
        `M30`
      ].join("\n");
      notes = ["Modify X100. to match your part width", "Adjust Z depth per pass"];
    } else if (op.includes("drill")) {
      code = [
        `( DRILLING OPERATION )`,
        `G90 G54 G17`,
        `T${T} M6`,
        `G43 H${T} Z${zSafe}`,
        `S${S} M3`,
        coolantCode,
        `G0 X${params.x_start || 0} Y${params.y_start || 0}`,
        `G83 Z${zDepth} R${zSafe} Q${Math.abs(zDepth / 3).toFixed(1)} F${F}`,
        `G80`,
        `M9`,
        `M5`,
        `G91 G28 Z0`,
        `M30`
      ].join("\n");
      notes = ["G83 = peck drilling cycle", "Q = peck depth (set to 1/3 of total depth)"];
    }
  } else if (ctrl.includes("siemens") || ctrl.includes("sinumerik")) {
    if (op.includes("face") || op.includes("mill")) {
      code = [
        `; ${operation.toUpperCase()} OPERATION`,
        `; Generated by PRISM Manufacturing Intelligence`,
        `G90 G54 G17`,
        `T${T} D1`,
        `M6`,
        `G0 Z${zSafe}`,
        `S${S} M3`,
        coolantCode,
        `G0 X${params.x_start || 0} Y${params.y_start || 0}`,
        `G1 Z${zDepth} F${Math.round(F * 0.3)}`,
        `G1 X100. F${F}`,
        `G0 Z${zSafe}`,
        `M9`,
        `M5`,
        `G0 Z200 M30`
      ].join("\n");
      notes = ["Siemens uses D1 for tool offset", "Modify X100. to match part"];
    }
  } else if (ctrl.includes("heidenhain")) {
    if (op.includes("face") || op.includes("mill")) {
      code = [
        `; ${operation.toUpperCase()} OPERATION`,
        `; Generated by PRISM Manufacturing Intelligence`,
        `TOOL CALL ${T} Z S${S}`,
        `L Z+${zSafe} R0 FMAX M3 ${coolantCode}`,
        `L X+${params.x_start || 0} Y+${params.y_start || 0} R0 FMAX`,
        `L Z${zDepth} R0 F${Math.round(F * 0.3)}`,
        `L X+100 R0 F${F}`,
        `L Z+${zSafe} R0 FMAX`,
        `M9`,
        `M5`,
        `L Z+200 R0 FMAX M30`
      ].join("\n");
      notes = ["Heidenhain conversational format", "L = linear move, FMAX = rapid"];
    }
  }
  
  if (!code) {
    code = `( Unsupported controller: ${controller} )`;
    notes = ["Supported: Fanuc, Haas, Siemens/Sinumerik, Heidenhain"];
  }
  
  return {
    controller,
    operation,
    gcode: code,
    parameters_used: { S, F, T, Z: zDepth },
    notes
  };
}
