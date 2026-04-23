/**
 * WEDMCornerPhysicsEngine
 * U-PROD-16: Physics-based corner cutting optimization
 *
 * Physics:
 * - Inside corners: reduced feed to prevent overcut
 * - Outside corners: can maintain or increase feed
 * - Corner radius vs wire radius relationship
 * - Spark gap expansion at corners
 * - Wire lag effects at direction changes
 */

import { EDM_PHYSICS } from "../physics/constants.js";

export interface CornerAnalysisInput {
  corner_type: 'inside' | 'outside';
  corner_angle_deg: number;
  corner_radius_mm?: number;
  wire_diameter_mm?: number;
  wire_tension_N?: number;
  base_feed_rate_mm_min?: number;
  material?: string;
  thickness_mm?: number;
  spark_gap_mm?: number;
}

export interface CornerRecommendation {
  feed_rate_factor: number;
  recommended_feed_mm_min: number;
  spark_energy_factor: number;
  dwell_time_ms?: number;
  min_corner_radius_mm: number;
  wire_deflection_mm: number;
  expected_error_mm: number;
  warnings: string[];
  strategies: string[];
}

export interface MultiCornerInput {
  corners: Array<{
    id: string;
    corner_type: 'inside' | 'outside';
    corner_angle_deg: number;
    corner_radius_mm?: number;
    position?: { x: number; y: number };
  }>;
  wire_diameter_mm?: number;
  base_feed_rate_mm_min?: number;
  thickness_mm?: number;
  tolerance_mm?: number;
}

export interface MultiCornerResult {
  corner_recommendations: Array<{
    corner_id: string;
    recommendation: CornerRecommendation;
  }>;
  critical_corners: string[];
  total_dwell_time_ms: number;
  average_feed_reduction_percent: number;
  overall_strategy: string;
}

export class WEDMCornerPhysicsEngine {
  private config = {
    default_wire_diameter_mm: 0.25,
    default_spark_gap_mm: 0.025,
    default_wire_tension_N: 15,
    default_feed_rate_mm_min: 2.5,
    min_corner_angle_deg: 5,
    sharp_corner_threshold_deg: 45,
    critical_angle_threshold_deg: 30,
    wire_lag_coefficient: EDM_PHYSICS.wire_corner.lag_coefficient,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Calculate minimum achievable corner radius based on wire geometry
   */
  calculateMinCornerRadius(wireDiameter: number, sparkGap: number): number {
    // Minimum inside corner = wire radius + spark gap
    return wireDiameter / 2 + sparkGap;
  }

  /**
   * Calculate wire deflection at corner due to cutting forces
   */
  calculateWireDeflection(
    wireTension: number,
    thickness: number,
    cornerAngle: number
  ): number {
    // Wire deflection increases with:
    // - Lower tension
    // - Greater thickness
    // - Sharper corners (more direction change)
    const angleRad = (cornerAngle * Math.PI) / 180;
    const directionChangeFactor = Math.sin(angleRad / 2);

    // Simplified beam deflection model
    // δ = (F × L²) / (8 × T)
    // where F is cutting force proportional to thickness
    const cuttingForce = thickness * 0.1; // N per mm thickness (approximate)
    const deflection = (cuttingForce * thickness * directionChangeFactor) / (8 * wireTension);

    return Math.abs(deflection);
  }

  /**
   * Calculate wire lag effect at corner (simplified model)
   */
  calculateWireLag(
    feedRate: number,
    thickness: number,
    cornerAngle: number
  ): number {
    // Wire lag increases with feed rate and thickness
    // More pronounced at sharper corners
    const angleRad = (cornerAngle * Math.PI) / 180;
    const sharpnessFactor = 1 - Math.cos(angleRad / 2);

    return this.config.wire_lag_coefficient * feedRate * thickness * sharpnessFactor / 1000;
  }

  /**
   * Calculate corner lag using Dekeyser & Snoeys model (U-P2PFS27)
   * Formula: lag = F_d × t_response / (2 × T)
   * Source: Dekeyser & Snoeys 1989 CIRP Annals 38(1)
   *
   * @param discharge_force_N Discharge cutting force [N]
   * @param wire_tension_N Wire tension [N]
   * @param wire_material Wire material for response time lookup
   * @returns Corner lag analysis result
   */
  calculateCornerLagPhysics(input: {
    discharge_force_N: number;
    wire_tension_N: number;
    wire_material?: string;
    corner_angle_deg?: number;
  }): {
    lag_mm: number;
    response_time_ms: number;
    within_tolerance: boolean;
    corner_error_um: number;
    recommended_dwell_ms: number;
    warning?: string;
  } {
    if (input.wire_tension_N <= 0) {
      throw new Error("Wire tension must be positive");
    }

    // Get response time from constants
    const materialKey = (input.wire_material || "brass").toLowerCase();
    const responseTimeTable = EDM_PHYSICS.corner_lag.response_time_ms as Record<string, number>;

    let responseTime_ms = responseTimeTable.brass;
    for (const [key, value] of Object.entries(responseTimeTable)) {
      if (materialKey.includes(key)) {
        responseTime_ms = value;
        break;
      }
    }

    // Convert to seconds for calculation
    const responseTime_s = responseTime_ms / 1000;

    // Dekeyser & Snoeys formula: lag = F_d × t_response / (2 × T)
    const lag_mm = (input.discharge_force_N * responseTime_s) / (2 * input.wire_tension_N);

    // Corner error is amplified at sharp corners
    const cornerAngle = input.corner_angle_deg ?? 90;
    const angleRad = (cornerAngle * Math.PI) / 180;
    const amplificationFactor = 1 / Math.sin(angleRad / 2);
    const cornerError_mm = lag_mm * amplificationFactor;
    const cornerError_um = cornerError_mm * 1000;

    // Check against acceptable limit
    const maxLag = EDM_PHYSICS.corner_lag.max_acceptable_lag_mm;
    const withinTolerance = lag_mm <= maxLag;

    // Recommended dwell to allow wire to catch up
    const recommendedDwell_ms = responseTime_ms * (withinTolerance ? 1 : 2);

    let warning: string | undefined;
    if (!withinTolerance) {
      warning = `Corner lag ${(lag_mm * 1000).toFixed(1)}µm exceeds limit ${maxLag * 1000}µm. Increase tension or reduce feed.`;
    } else if (lag_mm > maxLag * 0.7) {
      warning = `Corner lag approaching limit. Consider adding dwell or reducing feed rate.`;
    }

    return {
      lag_mm: parseFloat(lag_mm.toFixed(6)),
      response_time_ms: responseTime_ms,
      within_tolerance: withinTolerance,
      corner_error_um: parseFloat(cornerError_um.toFixed(2)),
      recommended_dwell_ms: parseFloat(recommendedDwell_ms.toFixed(1)),
      warning,
    };
  }

  /**
   * Analyze a single corner and provide recommendations
   */
  analyzeCorner(input: CornerAnalysisInput): CornerRecommendation {
    const wireDiameter = input.wire_diameter_mm ?? this.config.default_wire_diameter_mm;
    const sparkGap = input.spark_gap_mm ?? this.config.default_spark_gap_mm;
    const wireTension = input.wire_tension_N ?? this.config.default_wire_tension_N;
    const baseFeed = input.base_feed_rate_mm_min ?? this.config.default_feed_rate_mm_min;
    const thickness = input.thickness_mm ?? 25;

    const warnings: string[] = [];
    const strategies: string[] = [];

    // Calculate minimum corner radius
    const minRadius = this.calculateMinCornerRadius(wireDiameter, sparkGap);
    const requestedRadius = input.corner_radius_mm ?? 0;

    // Check if requested radius is achievable
    if (requestedRadius > 0 && requestedRadius < minRadius) {
      warnings.push(`Requested radius ${requestedRadius}mm is below minimum achievable ${minRadius.toFixed(3)}mm`);
    }

    // Calculate deflection
    const deflection = this.calculateWireDeflection(wireTension, thickness, input.corner_angle_deg);

    // Calculate wire lag
    const wireLag = this.calculateWireLag(baseFeed, thickness, input.corner_angle_deg);

    // Expected error is combination of deflection and lag
    const expectedError = Math.sqrt(deflection ** 2 + wireLag ** 2);

    // Calculate feed rate factor based on corner type and angle
    let feedFactor: number;
    let energyFactor: number;
    let dwellTime: number | undefined;

    if (input.corner_type === 'inside') {
      // Inside corners require reduced feed
      // Sharper angle = more reduction
      if (input.corner_angle_deg < this.config.critical_angle_threshold_deg) {
        feedFactor = 0.3;
        energyFactor = 0.5;
        dwellTime = 50;
        strategies.push('Use multiple skim passes for sharp inside corner');
        strategies.push('Consider radius insert if tolerance allows');
      } else if (input.corner_angle_deg < this.config.sharp_corner_threshold_deg) {
        feedFactor = 0.5;
        energyFactor = 0.7;
        dwellTime = 30;
        strategies.push('Reduce feed through corner zone');
      } else if (input.corner_angle_deg < 90) {
        feedFactor = 0.7;
        energyFactor = 0.85;
        dwellTime = 15;
        strategies.push('Slight feed reduction recommended');
      } else {
        feedFactor = 0.85;
        energyFactor = 0.95;
        strategies.push('Minimal adjustment needed for obtuse inside corner');
      }
    } else {
      // Outside corners - can often maintain or increase feed
      if (input.corner_angle_deg < this.config.sharp_corner_threshold_deg) {
        feedFactor = 0.9;
        energyFactor = 1.0;
        strategies.push('Sharp outside corner - watch for undercut');
      } else if (input.corner_angle_deg < 90) {
        feedFactor = 1.0;
        energyFactor = 1.0;
        strategies.push('Standard feed acceptable for outside corner');
      } else {
        feedFactor = 1.1;
        energyFactor = 1.05;
        strategies.push('Feed increase possible on gentle outside corner');
      }
    }

    // Add thickness-based warnings
    if (thickness > 100 && input.corner_angle_deg < 45) {
      warnings.push('Thick material with sharp corner may cause excessive deflection');
      feedFactor *= 0.8;
    }

    // Add deflection warning
    if (deflection > 0.01) {
      warnings.push(`Wire deflection ${(deflection * 1000).toFixed(1)}µm may affect accuracy`);
    }

    return {
      feed_rate_factor: feedFactor,
      recommended_feed_mm_min: baseFeed * feedFactor,
      spark_energy_factor: energyFactor,
      dwell_time_ms: dwellTime,
      min_corner_radius_mm: minRadius,
      wire_deflection_mm: deflection,
      expected_error_mm: expectedError,
      warnings,
      strategies,
    };
  }

  /**
   * Analyze multiple corners and provide comprehensive recommendations
   */
  analyzeMultipleCorners(input: MultiCornerInput): MultiCornerResult {
    const recommendations: MultiCornerResult['corner_recommendations'] = [];
    const criticalCorners: string[] = [];
    let totalDwell = 0;
    let totalFeedFactor = 0;

    for (const corner of input.corners) {
      const rec = this.analyzeCorner({
        corner_type: corner.corner_type,
        corner_angle_deg: corner.corner_angle_deg,
        corner_radius_mm: corner.corner_radius_mm,
        wire_diameter_mm: input.wire_diameter_mm,
        base_feed_rate_mm_min: input.base_feed_rate_mm_min,
        thickness_mm: input.thickness_mm,
      });

      recommendations.push({
        corner_id: corner.id,
        recommendation: rec,
      });

      // Track critical corners
      if (corner.corner_angle_deg < this.config.critical_angle_threshold_deg &&
          corner.corner_type === 'inside') {
        criticalCorners.push(corner.id);
      }

      totalDwell += rec.dwell_time_ms ?? 0;
      totalFeedFactor += rec.feed_rate_factor;
    }

    const avgFeedFactor = input.corners.length > 0
      ? totalFeedFactor / input.corners.length
      : 1;
    const avgFeedReduction = (1 - avgFeedFactor) * 100;

    // Determine overall strategy
    let overallStrategy: string;
    if (criticalCorners.length > input.corners.length / 3) {
      overallStrategy = 'Multiple critical corners - consider adaptive feed control or rough/skim strategy';
    } else if (criticalCorners.length > 0) {
      overallStrategy = `${criticalCorners.length} critical corner(s) - apply local speed reduction`;
    } else if (avgFeedReduction > 20) {
      overallStrategy = 'Moderate corner complexity - global feed reduction recommended';
    } else {
      overallStrategy = 'Standard corner processing with minor local adjustments';
    }

    return {
      corner_recommendations: recommendations,
      critical_corners: criticalCorners,
      total_dwell_time_ms: totalDwell,
      average_feed_reduction_percent: avgFeedReduction,
      overall_strategy: overallStrategy,
    };
  }
}

export const wedmCornerPhysicsEngine = new WEDMCornerPhysicsEngine();
