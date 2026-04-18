/**
 * HSMDwellAtCornerEngine — MILL-AGI-P2/MILL-MS7-04
 *
 * High-Speed Machining dwell-at-corner physics engine. Analyzes the transient
 * behavior when a toolpath changes direction at corners, including:
 *   - Axis deceleration and acceleration dynamics
 *   - Feed rate override at corners (G187/G05.1/CYCLE832)
 *   - Dwell time calculation for axis settling
 *   - Corner radius vs programmed tolerance relationship
 *   - Surface finish impact at corners
 *   - Thermal accumulation during dwell
 *
 * In HSM, excessive dwell causes heat buildup and poor surface finish; insufficient
 * dwell causes overcutting and tolerance violations. This engine calculates the
 * optimal dwell based on machine dynamics, corner geometry, and quality targets.
 *
 * Physics model based on second-order servo dynamics with acceleration limits
 * and jerk constraints (trapezoidal velocity profile analysis).
 *
 * Literature: Altintas 2012 Ch.8 (CNC servo systems), Pritschow 1998 (HSM dynamics),
 * Weck & Brecher 2006 (Machine tool metrology)
 *
 * @module HSMDwellAtCornerEngine
 */

import { z } from "zod";

// ============================================================================
// TYPES AND SCHEMAS
// ============================================================================

export const CornerGeometrySchema = z.object({
  angle_deg: z.number().min(0).max(180).describe("Corner angle in degrees (180 = straight)"),
  approach_vector: z.object({ x: z.number(), y: z.number(), z: z.number().optional() }),
  exit_vector: z.object({ x: z.number(), y: z.number(), z: z.number().optional() }),
  programmed_radius_mm: z.number().min(0).optional(),
  tolerance_mm: z.number().min(0).optional(),
});

export type CornerGeometry = z.infer<typeof CornerGeometrySchema>;

export const MachineServoSchema = z.object({
  max_acceleration_mm_s2: z.number().positive().describe("Maximum axis acceleration"),
  max_jerk_mm_s3: z.number().positive().optional().describe("Maximum axis jerk"),
  servo_bandwidth_hz: z.number().positive().optional().describe("Servo loop bandwidth"),
  position_loop_gain: z.number().positive().optional().describe("Position loop Kp"),
  look_ahead_blocks: z.number().int().positive().optional().describe("Look-ahead buffer size"),
});

export type MachineServo = z.infer<typeof MachineServoSchema>;

export const HSMParametersSchema = z.object({
  programmed_feed_mm_min: z.number().positive(),
  corner_feed_override_pct: z.number().min(0).max(100).optional(),
  hsm_mode: z.enum(["off", "g05p1", "g05p2", "g187", "cycle832"]).optional(),
  tolerance_mm: z.number().positive().optional(),
  surface_finish_target_um: z.number().positive().optional(),
});

export type HSMParameters = z.infer<typeof HSMParametersSchema>;

export interface DwellAnalysisResult {
  recommended_dwell_ms: number;
  actual_corner_radius_mm: number;
  effective_feed_at_corner_mm_min: number;
  deceleration_distance_mm: number;
  acceleration_distance_mm: number;
  settling_time_ms: number;
  thermal_accumulation_factor: number;
  surface_finish_degradation_pct: number;
  tolerance_violation_risk: number;
  recommendations: string[];
  physics_trace: PhysicsTrace;
}

export interface PhysicsTrace {
  formulas_used: string[];
  assumptions: string[];
  intermediate_values: Record<string, number>;
  confidence: number;
}

export interface CornerOptimizationResult {
  optimal_corner_radius_mm: number;
  optimal_feed_at_corner_mm_min: number;
  optimal_dwell_ms: number;
  cycle_time_impact_ms: number;
  quality_score: number;
  tradeoff_analysis: {
    faster: { feed: number; radius: number; quality_loss: number };
    better: { feed: number; radius: number; time_cost: number };
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SERVO_BANDWIDTH_HZ = 50;
const DEFAULT_LOOK_AHEAD = 100;
const DEFAULT_TOLERANCE_MM = 0.01;
const THERMAL_TIME_CONSTANT_MS = 50;
const SURFACE_FINISH_DWELL_FACTOR = 0.15;

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HSMDwellAtCornerEngine {
  /**
   * Analyze dwell requirements for a corner in HSM toolpath.
   *
   * @param corner - Corner geometry (angle, vectors)
   * @param servo - Machine servo characteristics
   * @param params - HSM parameters (feed, tolerance, mode)
   * @returns Dwell analysis with physics trace
   */
  static analyzeDwell(
    corner: CornerGeometry,
    servo: MachineServo,
    params: HSMParameters,
  ): DwellAnalysisResult {
    const formulas: string[] = [];
    const assumptions: string[] = [];
    const intermediates: Record<string, number> = {};

    // Convert angle to radians
    const angleRad = (corner.angle_deg * Math.PI) / 180;
    const directionChange = Math.PI - angleRad;
    intermediates.direction_change_rad = directionChange;

    // Feed rate in mm/s
    const feedMmS = params.programmed_feed_mm_min / 60;
    intermediates.feed_mm_s = feedMmS;

    // Apply corner feed override if specified
    const overridePct = params.corner_feed_override_pct ?? 100;
    const effectiveFeed = feedMmS * (overridePct / 100);
    intermediates.effective_feed_mm_s = effectiveFeed;

    // Velocity component change at corner (vector analysis)
    const velocityChangeRatio = 2 * Math.sin(directionChange / 2);
    intermediates.velocity_change_ratio = velocityChangeRatio;
    formulas.push("v_change = 2 * feed * sin(theta/2)");

    // Required deceleration distance (trapezoidal profile)
    // d = v^2 / (2 * a)
    const accelMmS2 = servo.max_acceleration_mm_s2;
    const decelDistance = (effectiveFeed * effectiveFeed * velocityChangeRatio) / (2 * accelMmS2);
    intermediates.decel_distance_mm = decelDistance;
    formulas.push("d_decel = v^2 * sin(theta/2) / a_max");

    // Jerk-limited motion (if jerk specified)
    let jerkFactor = 1.0;
    if (servo.max_jerk_mm_s3) {
      const jerkTime = accelMmS2 / servo.max_jerk_mm_s3;
      jerkFactor = 1 + jerkTime * 0.5;
      intermediates.jerk_factor = jerkFactor;
      assumptions.push("Jerk-limited S-curve profile assumed");
      formulas.push("jerk_factor = 1 + a_max / j_max * 0.5");
    } else {
      assumptions.push("Trapezoidal velocity profile assumed (no jerk limit)");
    }

    // Servo settling time (based on bandwidth)
    const bandwidth = servo.servo_bandwidth_hz ?? DEFAULT_SERVO_BANDWIDTH_HZ;
    const dampingRatio = 0.7; // typical for CNC servos
    const settlingTimeMs = (4 / (dampingRatio * 2 * Math.PI * bandwidth)) * 1000;
    intermediates.settling_time_ms = settlingTimeMs;
    formulas.push("t_settle = 4 / (zeta * omega_n)");

    // Actual corner radius achieved (geometric analysis)
    const tolerance = params.tolerance_mm ?? corner.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
    let actualRadius = corner.programmed_radius_mm ?? 0;

    if (actualRadius === 0) {
      // Sharp corner: actual radius determined by tolerance and feed
      // r = v^2 / a * (1 - cos(theta/2))
      actualRadius = (effectiveFeed * effectiveFeed) / accelMmS2 * (1 - Math.cos(directionChange / 2));
      actualRadius = Math.max(actualRadius, tolerance);
      formulas.push("r_actual = v^2 / a * (1 - cos(theta/2))");
    }
    intermediates.actual_radius_mm = actualRadius;

    // Dwell time calculation
    // Base dwell: time to complete direction change at limited accel
    const baseDwellMs = (effectiveFeed * velocityChangeRatio / accelMmS2) * 1000 * jerkFactor;
    intermediates.base_dwell_ms = baseDwellMs;

    // Add settling time for position accuracy
    const positionSettling = settlingTimeMs * (tolerance < 0.005 ? 1.5 : 1.0);
    intermediates.position_settling_ms = positionSettling;

    // HSM mode adjustments
    let hsmModeFactor = 1.0;
    switch (params.hsm_mode) {
      case "g05p1":
        hsmModeFactor = 0.8; // Fanuc AI contour control
        assumptions.push("G05P1 (Fanuc AI contour control) reduces dwell");
        break;
      case "g05p2":
        hsmModeFactor = 0.6; // Fanuc nano smoothing
        assumptions.push("G05P2 (Fanuc nano smoothing) significantly reduces dwell");
        break;
      case "g187":
        hsmModeFactor = 0.75; // Haas smoothing
        assumptions.push("G187 (Haas smoothing) moderately reduces dwell");
        break;
      case "cycle832":
        hsmModeFactor = 0.65; // Siemens HSM
        assumptions.push("CYCLE832 (Siemens HSM) significantly reduces dwell");
        break;
      default:
        assumptions.push("No HSM mode active - standard motion control");
    }
    intermediates.hsm_mode_factor = hsmModeFactor;

    // Final recommended dwell
    const recommendedDwell = Math.max(0, (baseDwellMs + positionSettling) * hsmModeFactor);
    intermediates.recommended_dwell_ms = recommendedDwell;

    // Thermal accumulation (heat builds up during dwell)
    const thermalFactor = 1 + (recommendedDwell / THERMAL_TIME_CONSTANT_MS) * 0.1;
    intermediates.thermal_factor = thermalFactor;
    formulas.push("thermal_factor = 1 + (t_dwell / tau_thermal) * 0.1");

    // Surface finish degradation (longer dwell = more rubbing)
    const finishDegradation = recommendedDwell * SURFACE_FINISH_DWELL_FACTOR;
    intermediates.finish_degradation_pct = finishDegradation;

    // Tolerance violation risk
    const toleranceRisk = actualRadius > tolerance * 2 ? 0.1 :
      actualRadius < tolerance ? 0.8 : 0.3;
    intermediates.tolerance_risk = toleranceRisk;

    // Generate recommendations
    const recommendations: string[] = [];
    if (recommendedDwell > 20) {
      recommendations.push("Consider increasing corner radius to reduce dwell time");
    }
    if (toleranceRisk > 0.5) {
      recommendations.push("Reduce feed rate at corner to meet tolerance");
    }
    if (thermalFactor > 1.15) {
      recommendations.push("Monitor for thermal effects - consider coolant at corners");
    }
    if (!params.hsm_mode && params.programmed_feed_mm_min > 5000) {
      recommendations.push("Enable HSM mode (G05/G187/CYCLE832) for high-speed operation");
    }

    const confidence = this.calculateConfidence(corner, servo, params);

    return {
      recommended_dwell_ms: Math.round(recommendedDwell * 100) / 100,
      actual_corner_radius_mm: Math.round(actualRadius * 1000) / 1000,
      effective_feed_at_corner_mm_min: Math.round(effectiveFeed * 60),
      deceleration_distance_mm: Math.round(decelDistance * 1000) / 1000,
      acceleration_distance_mm: Math.round(decelDistance * 1000) / 1000, // symmetric
      settling_time_ms: Math.round(settlingTimeMs * 100) / 100,
      thermal_accumulation_factor: Math.round(thermalFactor * 1000) / 1000,
      surface_finish_degradation_pct: Math.round(finishDegradation * 100) / 100,
      tolerance_violation_risk: Math.round(toleranceRisk * 100) / 100,
      recommendations,
      physics_trace: {
        formulas_used: formulas,
        assumptions,
        intermediate_values: intermediates,
        confidence,
      },
    };
  }

  /**
   * Optimize corner parameters for best quality/time tradeoff.
   *
   * @param corner - Corner geometry
   * @param servo - Machine servo characteristics
   * @param params - HSM parameters
   * @returns Optimization result with tradeoff analysis
   */
  static optimizeCorner(
    corner: CornerGeometry,
    servo: MachineServo,
    params: HSMParameters,
  ): CornerOptimizationResult {
    // Baseline analysis
    const baseline = this.analyzeDwell(corner, servo, params);

    // Try faster option (higher feed, larger radius)
    const fasterParams = { ...params, programmed_feed_mm_min: params.programmed_feed_mm_min * 1.2 };
    const fasterCorner = { ...corner, programmed_radius_mm: (corner.programmed_radius_mm ?? 0) * 1.5 };
    const fasterResult = this.analyzeDwell(fasterCorner, servo, fasterParams);

    // Try better quality option (lower feed, tighter control)
    const betterParams = { ...params, programmed_feed_mm_min: params.programmed_feed_mm_min * 0.7 };
    const betterResult = this.analyzeDwell(corner, servo, betterParams);

    // Calculate optimal balance
    const qualityWeight = params.surface_finish_target_um ? 0.6 : 0.4;
    const timeWeight = 1 - qualityWeight;

    const baselineScore = this.scoreResult(baseline, qualityWeight, timeWeight);
    const optimalFeed = params.programmed_feed_mm_min * (1 - 0.1 * baseline.tolerance_violation_risk);
    const optimalRadius = baseline.actual_corner_radius_mm * 1.1;

    return {
      optimal_corner_radius_mm: Math.round(optimalRadius * 1000) / 1000,
      optimal_feed_at_corner_mm_min: Math.round(optimalFeed),
      optimal_dwell_ms: baseline.recommended_dwell_ms,
      cycle_time_impact_ms: Math.round(baseline.recommended_dwell_ms * 1.2),
      quality_score: Math.round(baselineScore * 100) / 100,
      tradeoff_analysis: {
        faster: {
          feed: fasterParams.programmed_feed_mm_min,
          radius: fasterCorner.programmed_radius_mm ?? optimalRadius * 1.5,
          quality_loss: Math.round((1 - this.scoreResult(fasterResult, 1, 0) / baselineScore) * 100),
        },
        better: {
          feed: betterParams.programmed_feed_mm_min,
          radius: corner.programmed_radius_mm ?? optimalRadius,
          time_cost: Math.round(betterResult.recommended_dwell_ms - baseline.recommended_dwell_ms),
        },
      },
    };
  }

  /**
   * Calculate effective feed rate at corner based on machine dynamics.
   *
   * @param angleRad - Corner angle in radians
   * @param programmedFeed - Programmed feed in mm/min
   * @param maxAccel - Maximum acceleration in mm/s^2
   * @returns Effective feed at corner in mm/min
   */
  static calculateCornerFeed(
    angleRad: number,
    programmedFeed: number,
    maxAccel: number,
  ): number {
    const feedMmS = programmedFeed / 60;
    const directionChange = Math.PI - angleRad;

    // At sharp corners, feed must reduce to allow direction change within accel limits
    // v_corner = sqrt(a_max * r_min) where r_min is determined by tolerance
    if (directionChange > Math.PI / 6) { // > 30 degree direction change
      const cornerFeedFactor = Math.cos(directionChange / 2);
      return Math.round(programmedFeed * Math.max(0.3, cornerFeedFactor));
    }

    return programmedFeed;
  }

  /**
   * Estimate surface finish impact from corner dwell.
   *
   * @param dwellMs - Dwell time in milliseconds
   * @param feedMmMin - Feed rate in mm/min
   * @param toolDiameter - Tool diameter in mm
   * @returns Ra degradation factor (1.0 = no change)
   */
  static estimateSurfaceFinishImpact(
    dwellMs: number,
    feedMmMin: number,
    toolDiameter: number,
  ): number {
    // During dwell, tool rubs instead of cuts - degrades surface
    const rubbingFactor = 1 + (dwellMs / 1000) * (feedMmMin / 60 / toolDiameter) * 0.2;
    return Math.round(rubbingFactor * 1000) / 1000;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private static calculateConfidence(
    corner: CornerGeometry,
    servo: MachineServo,
    params: HSMParameters,
  ): number {
    let confidence = 0.85;

    // Reduce confidence for missing servo data
    if (!servo.max_jerk_mm_s3) confidence -= 0.05;
    if (!servo.servo_bandwidth_hz) confidence -= 0.05;
    if (!servo.look_ahead_blocks) confidence -= 0.03;

    // Reduce confidence for extreme angles
    if (corner.angle_deg < 30 || corner.angle_deg > 150) confidence -= 0.10;

    // Reduce confidence for very high feeds
    if (params.programmed_feed_mm_min > 15000) confidence -= 0.08;

    return Math.max(0.5, Math.round(confidence * 100) / 100);
  }

  private static scoreResult(
    result: DwellAnalysisResult,
    qualityWeight: number,
    timeWeight: number,
  ): number {
    const qualityScore = 1 - result.surface_finish_degradation_pct / 100 - result.tolerance_violation_risk;
    const timeScore = 1 - Math.min(result.recommended_dwell_ms / 50, 1);
    return qualityScore * qualityWeight + timeScore * timeWeight;
  }
}

export const hsmDwellAtCornerEngine = HSMDwellAtCornerEngine;
