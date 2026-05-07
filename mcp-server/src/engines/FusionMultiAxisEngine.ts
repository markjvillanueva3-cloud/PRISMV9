/**
 * FusionMultiAxisEngine — CAM-PARITY-AGI-MS0/U-CAMP07
 * ===================================================
 * Multi-axis toolpath generation for Fusion 360 with tilt limits,
 * singularity avoidance, and kinematic validation.
 *
 * Features:
 *   - Toolpath point generation with automatic tool axis calculation
 *   - Tilt limit enforcement (machine-specific)
 *   - Singularity detection and avoidance
 *   - RTCP/TCPM compensation calculation
 *   - Kinematic validation against machine constraints
 *
 * Supports machine types:
 *   - Table-table (A+C): Haas UMC, DMG MORI CMX-U
 *   - Head-table (B+C): Okuma MU-V, Mazak Variaxis
 *   - Head-head (A+B): Gantry machines
 *
 * @module engines/FusionMultiAxisEngine
 * @version 1.0.0
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP07
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Machine kinematic configuration type */
export type KinematicType = "table_table" | "head_table" | "head_head";

/** Rotary axis identifier */
export type RotaryAxisId = "A" | "B" | "C";

/** 3D vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Machine kinematic configuration */
export interface MachineKinematics {
  id: string;
  name: string;
  type: KinematicType;
  primary_axis: RotaryAxisId;
  secondary_axis: RotaryAxisId;
  axis_limits: {
    primary_min_deg: number;
    primary_max_deg: number;
    secondary_min_deg: number;
    secondary_max_deg: number;
  };
  max_rotary_speed_deg_sec: number;
  pivot_to_gauge_mm: number;
  pivot_to_table_mm: number;
  rtcp_enabled: boolean;
  continuous_rotation: [boolean, boolean]; // [primary, secondary]
}

/** Multi-axis toolpath point */
export interface MultiAxisPoint {
  /** Point index */
  index: number;
  /** Position in workpiece coordinates (mm) */
  position: Vec3;
  /** Tool axis vector (unit vector) */
  tool_axis: Vec3;
  /** Feed rate (mm/min) */
  feed_mmmin: number;
  /** Spindle speed (RPM) */
  rpm: number;
  /** Calculated rotary axis positions (degrees) */
  rotary_angles?: {
    primary_deg: number;
    secondary_deg: number;
  };
  /** Radial engagement ae (mm) */
  ae_mm?: number;
  /** Axial engagement ap (mm) */
  ap_mm?: number;
}

/** Tilt limit specification */
export interface TiltLimits {
  /** Maximum lead angle from surface normal (degrees) */
  max_lead_deg: number;
  /** Maximum lag angle from surface normal (degrees) */
  max_lag_deg: number;
  /** Maximum lateral tilt (degrees) */
  max_tilt_deg: number;
  /** Minimum angle from vertical to avoid singularity (degrees) */
  min_tilt_from_vertical_deg: number;
}

/** Singularity detection result */
export interface SingularityResult {
  /** Whether toolpath is singularity-safe */
  is_safe: boolean;
  /** Points at or near singularity */
  singular_points: Array<{
    index: number;
    proximity_deg: number;
    risk: "critical" | "warning" | "info";
  }>;
  /** Summary message */
  summary: string;
}

/** Kinematic validation result */
export interface KinematicValidation {
  /** Whether all points are reachable */
  reachable: boolean;
  /** Points that violate axis limits */
  violations: Array<{
    index: number;
    axis: RotaryAxisId;
    required_deg: number;
    limit_deg: number;
    overshoot_deg: number;
  }>;
  /** Axis utilization statistics */
  utilization: {
    primary_range_deg: [number, number];
    secondary_range_deg: [number, number];
    primary_utilization_pct: number;
    secondary_utilization_pct: number;
  };
  /** Summary message */
  summary: string;
}

/** Multi-axis toolpath generation input */
export interface MultiAxisInput {
  /** Surface points with desired tool axis */
  points: MultiAxisPoint[];
  /** Machine kinematics */
  machine: MachineKinematics;
  /** Tilt limits */
  tilt_limits?: TiltLimits;
  /** Whether to apply singularity avoidance */
  singularity_avoidance?: boolean;
  /** Feed reduction factor near singularities (0-1) */
  singularity_feed_reduction?: number;
  /** Whether to optimize rotary motion */
  optimize_rotary?: boolean;
}

/** Multi-axis toolpath generation result */
export interface MultiAxisResult {
  /** Processed toolpath points with rotary angles */
  points: MultiAxisPoint[];
  /** Singularity analysis */
  singularity: SingularityResult;
  /** Kinematic validation */
  kinematics: KinematicValidation;
  /** Estimated cycle time (seconds) */
  cycle_time_sec: number;
  /** Total rotary travel (degrees) */
  total_rotary_travel_deg: number;
  /** Warnings */
  warnings: string[];
  /** RTCP compensation summary */
  rtcp_summary: {
    enabled: boolean;
    max_compensation_mm: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Singularity proximity thresholds */
const SINGULARITY_CRITICAL_DEG = 3;
const SINGULARITY_WARNING_DEG = 8;
const SINGULARITY_INFO_DEG = 15;

// ============================================================================
// DEFAULT MACHINE CONFIGS
// ============================================================================

/** Pre-configured machine kinematics catalog */
export const MACHINE_KINEMATICS_CATALOG: MachineKinematics[] = [
  {
    id: "haas_umc500",
    name: "Haas UMC-500",
    type: "table_table",
    primary_axis: "A",
    secondary_axis: "C",
    axis_limits: {
      primary_min_deg: -35,
      primary_max_deg: 120,
      secondary_min_deg: -360,
      secondary_max_deg: 360,
    },
    max_rotary_speed_deg_sec: 100,
    pivot_to_gauge_mm: 100,
    pivot_to_table_mm: 150,
    rtcp_enabled: true,
    continuous_rotation: [false, true],
  },
  {
    id: "dmg_cmx_u",
    name: "DMG MORI CMX 50 U",
    type: "table_table",
    primary_axis: "A",
    secondary_axis: "C",
    axis_limits: {
      primary_min_deg: -35,
      primary_max_deg: 110,
      secondary_min_deg: -360,
      secondary_max_deg: 360,
    },
    max_rotary_speed_deg_sec: 120,
    pivot_to_gauge_mm: 95,
    pivot_to_table_mm: 145,
    rtcp_enabled: true,
    continuous_rotation: [false, true],
  },
  {
    id: "okuma_mu_v",
    name: "Okuma MU-5000V",
    type: "head_table",
    primary_axis: "B",
    secondary_axis: "C",
    axis_limits: {
      primary_min_deg: -30,
      primary_max_deg: 120,
      secondary_min_deg: -360,
      secondary_max_deg: 360,
    },
    max_rotary_speed_deg_sec: 150,
    pivot_to_gauge_mm: 120,
    pivot_to_table_mm: 0, // Head type, no table tilt
    rtcp_enabled: true,
    continuous_rotation: [false, true],
  },
  {
    id: "mazak_variaxis",
    name: "Mazak Variaxis i-600",
    type: "head_table",
    primary_axis: "B",
    secondary_axis: "C",
    axis_limits: {
      primary_min_deg: -30,
      primary_max_deg: 150,
      secondary_min_deg: -360,
      secondary_max_deg: 360,
    },
    max_rotary_speed_deg_sec: 200,
    pivot_to_gauge_mm: 130,
    pivot_to_table_mm: 0,
    rtcp_enabled: true,
    continuous_rotation: [false, true],
  },
  {
    id: "generic_gantry",
    name: "Generic Gantry Head-Head",
    type: "head_head",
    primary_axis: "A",
    secondary_axis: "B",
    axis_limits: {
      primary_min_deg: -110,
      primary_max_deg: 110,
      secondary_min_deg: -110,
      secondary_max_deg: 110,
    },
    max_rotary_speed_deg_sec: 80,
    pivot_to_gauge_mm: 200,
    pivot_to_table_mm: 0,
    rtcp_enabled: true,
    continuous_rotation: [false, false],
  },
];

/** Default tilt limits */
const DEFAULT_TILT_LIMITS: TiltLimits = {
  max_lead_deg: 45,
  max_lag_deg: 45,
  max_tilt_deg: 45,
  min_tilt_from_vertical_deg: 10,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Fusion Multi-Axis Toolpath Engine
 *
 * Generates multi-axis toolpaths with automatic rotary axis calculation,
 * singularity avoidance, and kinematic validation.
 */
export class FusionMultiAxisEngine {
  private _stats = { calculations: 0 };

  /**
   * Generate multi-axis toolpath with rotary axis calculation.
   *
   * @param input - Toolpath points, machine config, and options
   * @returns Processed toolpath with rotary angles and validation
   */
  generate(input: MultiAxisInput): MultiAxisResult {
    this._stats.calculations++;
    const startTime = Date.now();

    log.debug(`[FusionMultiAxis] Generating toolpath for ${input.points.length} points on ${input.machine.name}`);

    const tiltLimits = input.tilt_limits ?? DEFAULT_TILT_LIMITS;
    const warnings: string[] = [];

    // Step 1: Calculate rotary angles for each point
    const pointsWithAngles = this._calculateRotaryAngles(input.points, input.machine);

    // Step 2: Apply singularity avoidance if enabled
    let processedPoints = pointsWithAngles;
    if (input.singularity_avoidance) {
      processedPoints = this._applySingularityAvoidance(
        pointsWithAngles,
        input.machine,
        tiltLimits,
        input.singularity_feed_reduction ?? 0.5,
      );
    }

    // Step 3: Optimize rotary motion if enabled
    if (input.optimize_rotary) {
      processedPoints = this._optimizeRotaryMotion(processedPoints, input.machine);
    }

    // Step 4: Detect remaining singularities
    const singularity = this._detectSingularities(processedPoints, input.machine);

    // Step 5: Validate kinematics
    const kinematics = this._validateKinematics(processedPoints, input.machine);

    // Step 6: Calculate cycle time and rotary travel
    const { cycle_time_sec, total_rotary_travel_deg } = this._calculateCycleMetrics(
      processedPoints,
      input.machine,
    );

    // Step 7: Calculate RTCP compensation
    const rtcp_summary = this._calculateRTCPSummary(processedPoints, input.machine);

    // Generate warnings
    if (!singularity.is_safe) {
      warnings.push(`${singularity.singular_points.length} singularity points detected. Consider adjusting toolpath.`);
    }
    if (!kinematics.reachable) {
      warnings.push(`${kinematics.violations.length} points exceed axis limits.`);
    }
    if (kinematics.utilization.primary_utilization_pct > 90) {
      warnings.push(`Primary axis utilization ${kinematics.utilization.primary_utilization_pct.toFixed(0)}% - near limits.`);
    }
    if (kinematics.utilization.secondary_utilization_pct > 90) {
      warnings.push(`Secondary axis utilization ${kinematics.utilization.secondary_utilization_pct.toFixed(0)}% - near limits.`);
    }

    const elapsed = Date.now() - startTime;
    log.debug(`[FusionMultiAxis] Generated ${processedPoints.length} points in ${elapsed}ms`);

    return {
      points: processedPoints,
      singularity,
      kinematics,
      cycle_time_sec,
      total_rotary_travel_deg,
      warnings,
      rtcp_summary,
    };
  }

  /**
   * Get machine kinematics by ID.
   */
  getMachine(id: string): MachineKinematics | undefined {
    return MACHINE_KINEMATICS_CATALOG.find(m => m.id === id);
  }

  /**
   * Get all available machine configurations.
   */
  getAllMachines(): MachineKinematics[] {
    return [...MACHINE_KINEMATICS_CATALOG];
  }

  /**
   * Calculate rotary angles for a single tool axis vector.
   */
  calculateAngles(
    toolAxis: Vec3,
    machine: MachineKinematics,
  ): { primary_deg: number; secondary_deg: number } {
    return this._toolAxisToAngles(toolAxis, machine);
  }

  /**
   * Calculate singularity proximity for a tool axis.
   *
   * @param toolAxis - Normalized tool axis vector
   * @param machine - Machine kinematics
   * @returns Proximity to singularity in degrees
   */
  singularityProximity(toolAxis: Vec3, machine: MachineKinematics): number {
    const angles = this._toolAxisToAngles(toolAxis, machine);
    return this._singularityProximityFromAngles(angles.primary_deg, angles.secondary_deg, machine);
  }

  /**
   * Get engine statistics.
   */
  stats(): { calculations: number } {
    return { ...this._stats };
  }

  /**
   * Clear statistics.
   */
  clear(): void {
    this._stats = { calculations: 0 };
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private _calculateRotaryAngles(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
  ): MultiAxisPoint[] {
    return points.map(point => {
      const angles = this._toolAxisToAngles(point.tool_axis, machine);
      return {
        ...point,
        rotary_angles: angles,
      };
    });
  }

  private _toolAxisToAngles(
    axis: Vec3,
    machine: MachineKinematics,
  ): { primary_deg: number; secondary_deg: number } {
    // Normalize tool axis
    const mag = Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
    const nx = axis.x / (mag || 1);
    const ny = axis.y / (mag || 1);
    const nz = axis.z / (mag || 1);

    let primary = 0;
    let secondary = 0;

    switch (machine.type) {
      case "table_table": {
        // A+C table-table: A = asin(ny), C = atan2(-nx, nz)
        // Tool axis in WCS: [sin(A)*sin(C), sin(A)*cos(C), cos(A)] after rotations
        // Inverse: A = acos(nz), C = atan2(nx, -ny)
        primary = Math.acos(Math.max(-1, Math.min(1, nz))) * RAD2DEG;
        secondary = Math.atan2(nx, -ny) * RAD2DEG;
        break;
      }
      case "head_table": {
        // B+C head-table: B tilts spindle, C rotates table
        // With B tilt: tool axis = [sin(B), 0, cos(B)] rotated by C
        // nx = sin(B)*cos(C), ny = sin(B)*sin(C), nz = cos(B)
        primary = Math.acos(Math.max(-1, Math.min(1, nz))) * RAD2DEG;
        secondary = Math.atan2(ny, nx) * RAD2DEG;
        break;
      }
      case "head_head": {
        // A+B head-head (gantry): both rotations in head
        primary = Math.asin(Math.max(-1, Math.min(1, nx))) * RAD2DEG;
        const cosP = Math.cos(primary * DEG2RAD);
        secondary = cosP > 0.001
          ? Math.atan2(-ny / cosP, nz / cosP) * RAD2DEG
          : 0;
        break;
      }
    }

    return {
      primary_deg: Math.round(primary * 1000) / 1000,
      secondary_deg: Math.round(secondary * 1000) / 1000,
    };
  }

  private _singularityProximityFromAngles(
    primary_deg: number,
    secondary_deg: number,
    machine: MachineKinematics,
  ): number {
    // For most machines, singularity occurs when primary tilt = 0 (tool parallel to Z)
    // This makes the secondary (C) axis indeterminate
    switch (machine.type) {
      case "table_table":
      case "head_table":
        // Singularity at primary = 0
        return Math.abs(primary_deg);
      case "head_head": {
        // Singularity when both axes align (gimbal lock)
        const diff = Math.abs(primary_deg - secondary_deg);
        const normalized = diff > 180 ? 360 - diff : diff;
        return Math.min(normalized, Math.abs(primary_deg));
      }
      default:
        return 999;
    }
  }

  private _applySingularityAvoidance(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
    tiltLimits: TiltLimits,
    feedReduction: number,
  ): MultiAxisPoint[] {
    return points.map(point => {
      if (!point.rotary_angles) return point;

      const proximity = this._singularityProximityFromAngles(
        point.rotary_angles.primary_deg,
        point.rotary_angles.secondary_deg,
        machine,
      );

      // If near singularity, adjust tool axis to minimum safe tilt
      if (proximity < tiltLimits.min_tilt_from_vertical_deg) {
        // Adjust primary angle to minimum safe value
        const safePrimary = tiltLimits.min_tilt_from_vertical_deg *
          Math.sign(point.rotary_angles.primary_deg || 1);

        const adjustedPoint: MultiAxisPoint = {
          ...point,
          rotary_angles: {
            primary_deg: safePrimary,
            secondary_deg: point.rotary_angles.secondary_deg,
          },
          // Reduce feed near singularity
          feed_mmmin: point.feed_mmmin * feedReduction,
        };

        // Recalculate tool axis from adjusted angles
        adjustedPoint.tool_axis = this._anglesToToolAxis(
          safePrimary,
          point.rotary_angles.secondary_deg,
          machine,
        );

        return adjustedPoint;
      }

      return point;
    });
  }

  private _anglesToToolAxis(
    primary_deg: number,
    secondary_deg: number,
    machine: MachineKinematics,
  ): Vec3 {
    const pRad = primary_deg * DEG2RAD;
    const sRad = secondary_deg * DEG2RAD;

    switch (machine.type) {
      case "table_table":
        return {
          x: Math.sin(pRad) * Math.sin(sRad),
          y: -Math.sin(pRad) * Math.cos(sRad),
          z: Math.cos(pRad),
        };
      case "head_table":
        return {
          x: Math.sin(pRad) * Math.cos(sRad),
          y: Math.sin(pRad) * Math.sin(sRad),
          z: Math.cos(pRad),
        };
      case "head_head":
        return {
          x: Math.sin(pRad),
          y: -Math.sin(sRad) * Math.cos(pRad),
          z: Math.cos(pRad) * Math.cos(sRad),
        };
    }
  }

  private _optimizeRotaryMotion(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
  ): MultiAxisPoint[] {
    if (points.length < 2) return points;

    const optimized = [...points];

    for (let i = 1; i < optimized.length; i++) {
      const prev = optimized[i - 1];
      const curr = optimized[i];

      if (!prev.rotary_angles || !curr.rotary_angles) continue;

      // Optimize secondary axis (usually C) for shortest path
      if (machine.continuous_rotation[1]) {
        const delta = curr.rotary_angles.secondary_deg - prev.rotary_angles.secondary_deg;
        if (Math.abs(delta) > 180) {
          // Take shorter path
          const adjustment = delta > 0 ? -360 : 360;
          const newSecondary = curr.rotary_angles.secondary_deg + adjustment;

          // Verify within limits
          if (newSecondary >= machine.axis_limits.secondary_min_deg &&
              newSecondary <= machine.axis_limits.secondary_max_deg) {
            optimized[i] = {
              ...curr,
              rotary_angles: {
                primary_deg: curr.rotary_angles.primary_deg,
                secondary_deg: newSecondary,
              },
            };
          }
        }
      }

      // Eliminate micro-rotations (< 0.05 degrees)
      const microThreshold = 0.05;
      if (Math.abs(curr.rotary_angles.primary_deg - prev.rotary_angles.primary_deg) < microThreshold &&
          Math.abs(curr.rotary_angles.secondary_deg - prev.rotary_angles.secondary_deg) < microThreshold) {
        optimized[i] = {
          ...curr,
          rotary_angles: { ...prev.rotary_angles },
        };
      }
    }

    return optimized;
  }

  private _detectSingularities(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
  ): SingularityResult {
    const singular_points: SingularityResult["singular_points"] = [];

    for (const point of points) {
      if (!point.rotary_angles) continue;

      const proximity = this._singularityProximityFromAngles(
        point.rotary_angles.primary_deg,
        point.rotary_angles.secondary_deg,
        machine,
      );

      if (proximity <= SINGULARITY_INFO_DEG) {
        let risk: "critical" | "warning" | "info" = "info";
        if (proximity <= SINGULARITY_CRITICAL_DEG) risk = "critical";
        else if (proximity <= SINGULARITY_WARNING_DEG) risk = "warning";

        singular_points.push({
          index: point.index,
          proximity_deg: Math.round(proximity * 100) / 100,
          risk,
        });
      }
    }

    const criticalCount = singular_points.filter(s => s.risk === "critical").length;
    const warningCount = singular_points.filter(s => s.risk === "warning").length;
    const is_safe = criticalCount === 0 && warningCount === 0;

    let summary = `Analyzed ${points.length} points. `;
    if (is_safe) {
      summary += "No singularity risks detected.";
    } else {
      summary += `Found ${criticalCount} critical, ${warningCount} warning singularity zones.`;
    }

    return { is_safe, singular_points, summary };
  }

  private _validateKinematics(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
  ): KinematicValidation {
    const violations: KinematicValidation["violations"] = [];
    let primaryMin = Infinity, primaryMax = -Infinity;
    let secondaryMin = Infinity, secondaryMax = -Infinity;

    for (const point of points) {
      if (!point.rotary_angles) continue;

      const { primary_deg, secondary_deg } = point.rotary_angles;

      // Track range
      primaryMin = Math.min(primaryMin, primary_deg);
      primaryMax = Math.max(primaryMax, primary_deg);
      secondaryMin = Math.min(secondaryMin, secondary_deg);
      secondaryMax = Math.max(secondaryMax, secondary_deg);

      // Check primary limits
      if (primary_deg < machine.axis_limits.primary_min_deg) {
        violations.push({
          index: point.index,
          axis: machine.primary_axis,
          required_deg: primary_deg,
          limit_deg: machine.axis_limits.primary_min_deg,
          overshoot_deg: Math.abs(primary_deg - machine.axis_limits.primary_min_deg),
        });
      } else if (primary_deg > machine.axis_limits.primary_max_deg) {
        violations.push({
          index: point.index,
          axis: machine.primary_axis,
          required_deg: primary_deg,
          limit_deg: machine.axis_limits.primary_max_deg,
          overshoot_deg: Math.abs(primary_deg - machine.axis_limits.primary_max_deg),
        });
      }

      // Check secondary limits (only if not continuous)
      if (!machine.continuous_rotation[1]) {
        if (secondary_deg < machine.axis_limits.secondary_min_deg) {
          violations.push({
            index: point.index,
            axis: machine.secondary_axis,
            required_deg: secondary_deg,
            limit_deg: machine.axis_limits.secondary_min_deg,
            overshoot_deg: Math.abs(secondary_deg - machine.axis_limits.secondary_min_deg),
          });
        } else if (secondary_deg > machine.axis_limits.secondary_max_deg) {
          violations.push({
            index: point.index,
            axis: machine.secondary_axis,
            required_deg: secondary_deg,
            limit_deg: machine.axis_limits.secondary_max_deg,
            overshoot_deg: Math.abs(secondary_deg - machine.axis_limits.secondary_max_deg),
          });
        }
      }
    }

    // Handle empty points
    if (points.length === 0 || primaryMin === Infinity) {
      primaryMin = 0;
      primaryMax = 0;
      secondaryMin = 0;
      secondaryMax = 0;
    }

    const primaryRange = machine.axis_limits.primary_max_deg - machine.axis_limits.primary_min_deg;
    const secondaryRange = machine.axis_limits.secondary_max_deg - machine.axis_limits.secondary_min_deg;

    const utilization: KinematicValidation["utilization"] = {
      primary_range_deg: [Math.round(primaryMin * 100) / 100, Math.round(primaryMax * 100) / 100],
      secondary_range_deg: [Math.round(secondaryMin * 100) / 100, Math.round(secondaryMax * 100) / 100],
      primary_utilization_pct: primaryRange > 0
        ? Math.round(((primaryMax - primaryMin) / primaryRange) * 1000) / 10
        : 0,
      secondary_utilization_pct: secondaryRange > 0
        ? Math.round(((secondaryMax - secondaryMin) / secondaryRange) * 1000) / 10
        : 0,
    };

    const reachable = violations.length === 0;

    let summary = `Analyzed ${points.length} points. `;
    if (reachable) {
      summary += `All points reachable. ${machine.primary_axis}: ${utilization.primary_utilization_pct}%, ${machine.secondary_axis}: ${utilization.secondary_utilization_pct}% utilization.`;
    } else {
      summary += `${violations.length} points UNREACHABLE.`;
    }

    return { reachable, violations, utilization, summary };
  }

  private _calculateCycleMetrics(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
  ): { cycle_time_sec: number; total_rotary_travel_deg: number } {
    if (points.length < 2) {
      return { cycle_time_sec: 0, total_rotary_travel_deg: 0 };
    }

    let totalLinearDistance = 0;
    let totalRotaryTravel = 0;
    let totalTime = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Linear distance
      const dx = curr.position.x - prev.position.x;
      const dy = curr.position.y - prev.position.y;
      const dz = curr.position.z - prev.position.z;
      const linearDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalLinearDistance += linearDist;

      // Rotary travel
      if (prev.rotary_angles && curr.rotary_angles) {
        const dPrimary = Math.abs(curr.rotary_angles.primary_deg - prev.rotary_angles.primary_deg);
        const dSecondary = Math.abs(curr.rotary_angles.secondary_deg - prev.rotary_angles.secondary_deg);
        totalRotaryTravel += dPrimary + dSecondary;

        // Time for rotary motion
        const rotaryTime = Math.max(dPrimary, dSecondary) / machine.max_rotary_speed_deg_sec;

        // Time for linear motion
        const linearTime = linearDist / (curr.feed_mmmin / 60);

        // Take longer of the two (simultaneous motion)
        totalTime += Math.max(rotaryTime, linearTime);
      } else {
        totalTime += linearDist / (curr.feed_mmmin / 60);
      }
    }

    return {
      cycle_time_sec: Math.round(totalTime * 10) / 10,
      total_rotary_travel_deg: Math.round(totalRotaryTravel * 10) / 10,
    };
  }

  private _calculateRTCPSummary(
    points: MultiAxisPoint[],
    machine: MachineKinematics,
  ): MultiAxisResult["rtcp_summary"] {
    if (!machine.rtcp_enabled) {
      return { enabled: false, max_compensation_mm: 0 };
    }

    // Calculate maximum RTCP compensation needed
    let maxCompensation = 0;

    for (const point of points) {
      if (!point.rotary_angles) continue;

      const { primary_deg } = point.rotary_angles;
      const pRad = primary_deg * DEG2RAD;

      // Simplified RTCP compensation magnitude
      // Full RTCP involves pivot point offset compensation
      const compensation = machine.pivot_to_gauge_mm * Math.sin(Math.abs(pRad));
      maxCompensation = Math.max(maxCompensation, compensation);
    }

    return {
      enabled: true,
      max_compensation_mm: Math.round(maxCompensation * 100) / 100,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of FusionMultiAxisEngine */
export const fusionMultiAxisEngine = new FusionMultiAxisEngine();
