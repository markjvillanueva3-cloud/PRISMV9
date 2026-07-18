/**
 * PRISM Manufacturing Intelligence - Multi-Axis Kinematic Engine
 * 5-axis kinematic transformation, singularity detection, and rotary optimization.
 *
 * Handles kinematic retransformation between machine types (head-table, table-table,
 * head-head, nutating-head), detects gimbal lock / singularity zones, optimizes
 * rotary axis motion, and validates reachability against axis limits.
 *
 * Actions: kinematic_singularity, kinematic_transform, kinematic_optimize,
 *          kinematic_reachability
 *
 * @version 1.0.0
 * @module MultiAxisKinematicEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Supported 5-axis machine kinematic configurations. */
export type KinematicType =
  | "table-table"
  | "head-head"
  | "head-table"
  | "nutating-head";

/** Rotary axis identifier. */
export type RotaryAxis = "A" | "B" | "C";

/** 3D point / vector. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Full machine kinematic definition. */
export interface MachineKinematics {
  /** Kinematic chain type */
  type: KinematicType;
  /** Primary rotary axis letter */
  primary_rotary: RotaryAxis;
  /** Secondary rotary axis letter */
  secondary_rotary: RotaryAxis;
  /** Pivot / gauge point in machine coordinates (mm) */
  pivot_point: Vec3;
  /** Angular travel limits in degrees */
  rotary_limits: {
    primary_min: number;
    primary_max: number;
    secondary_min: number;
    secondary_max: number;
  };
  /** Whether each rotary axis supports continuous (360+) rotation */
  continuous_rotary: [boolean, boolean];
}

/** A 5-axis move with linear + rotary positions. */
export interface FiveAxisMove {
  /** Line number in source program (0 if synthetic) */
  line: number;
  x: number;
  y: number;
  z: number;
  /** Primary rotary axis value in degrees */
  primary_deg: number;
  /** Secondary rotary axis value in degrees */
  secondary_deg: number;
  /** Feed rate mm/min (0 = rapid) */
  feed: number;
}

/** Singularity detection result for one location. */
export interface SingularityHit {
  /** Source line number */
  line: number;
  /** Rotary axis values at this point */
  axes_values: { primary: number; secondary: number };
  /** Angular distance from singularity in degrees */
  proximity_deg: number;
  /** Risk level */
  risk: "critical" | "warning" | "info";
}

/** Full singularity analysis result. */
export interface SingularityResult {
  /** All detected singularity zones */
  singularities: SingularityHit[];
  /** True if no critical or warning singularities found */
  safe: boolean;
  /** Summary message */
  summary: string;
}

/** Coordinate transformation result. */
export interface TransformResult {
  /** Transformed moves for the target machine */
  moves: FiveAxisMove[];
  /** Number of moves that required rotary recalculation */
  recalculated_count: number;
  /** Warnings (e.g., axis limits exceeded on target) */
  warnings: string[];
}

/** Rotary motion optimization result. */
export interface RotaryOptimizationResult {
  /** Optimized moves */
  moves: FiveAxisMove[];
  /** Total rotary travel saved in degrees */
  total_saved_deg: number;
  /** Number of moves modified */
  modified_count: number;
  /** Changes made */
  changes: string[];
}

/** Reachability violation for one move. */
export interface ReachabilityViolation {
  /** Source line number */
  line: number;
  /** Which axis is violated */
  axis: string;
  /** Required angle */
  required_deg: number;
  /** Nearest limit */
  limit_deg: number;
  /** Overshoot in degrees */
  overshoot_deg: number;
}

/** Full reachability analysis result. */
export interface ReachabilityResult {
  /** True if all positions are reachable */
  reachable: boolean;
  /** List of violations */
  violations: ReachabilityViolation[];
  /** Axis utilization stats */
  utilization: {
    primary_range_used: [number, number];
    secondary_range_used: [number, number];
    primary_utilization_pct: number;
    secondary_utilization_pct: number;
  };
  /** Summary message */
  summary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Singularity proximity thresholds in degrees. */
const SINGULARITY_CRITICAL_DEG = 2.0;
const SINGULARITY_WARNING_DEG = 8.0;
const SINGULARITY_INFO_DEG = 15.0;

/** Degrees-to-radians conversion factor. */
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Multi-Axis Kinematic Engine — 5-axis transformation and singularity management.
 *
 * Supports kinematic retransformation between machine types, gimbal lock detection,
 * rotary axis optimization (unwinding, shortest path), and reachability validation.
 */
export class MultiAxisKinematicEngine {

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Detect singularity zones in a 5-axis program.
   *
   * For head-table machines: singularity at primary=0 (tool parallel to Z)
   * For table-table machines: singularity when both rotaries align
   * For head-head: singularity at extreme tilt positions
   *
   * @param gcode - Raw G-code string with 5-axis moves
   * @param kinematics - Machine kinematic definition
   * @returns Singularity analysis with risk-scored hits
   */
  detectSingularities(
    gcode: string,
    kinematics: MachineKinematics,
  ): SingularityResult {
    const moves = this.parseMovesFromGCode(gcode, kinematics);
    const hits: SingularityHit[] = [];

    for (const move of moves) {
      const proximity = this.singularityProximity(
        move.primary_deg,
        move.secondary_deg,
        kinematics,
      );

      if (proximity <= SINGULARITY_INFO_DEG) {
        let risk: SingularityHit["risk"] = "info";
        if (proximity <= SINGULARITY_CRITICAL_DEG) risk = "critical";
        else if (proximity <= SINGULARITY_WARNING_DEG) risk = "warning";

        hits.push({
          line: move.line,
          axes_values: {
            primary: move.primary_deg,
            secondary: move.secondary_deg,
          },
          proximity_deg: Math.round(proximity * 100) / 100,
          risk,
        });
      }
    }

    const criticalCount = hits.filter((h) => h.risk === "critical").length;
    const warningCount = hits.filter((h) => h.risk === "warning").length;
    const safe = criticalCount === 0 && warningCount === 0;

    let summary = `Analyzed ${moves.length} moves. `;
    if (safe) {
      summary += "No singularity risks detected.";
    } else {
      summary += `Found ${criticalCount} critical, `;
      summary += `${warningCount} warning singularity zones.`;
    }

    return { singularities: hits, safe, summary };
  }

  /**
   * Transform 5-axis coordinates from one machine kinematic type to another.
   *
   * Performs inverse kinematics on the source machine to recover tool tip
   * position and tool axis vector, then forward kinematics on the target
   * machine to compute new rotary positions.
   *
   * @param moves - Array of 5-axis moves from source machine
   * @param from_kinematics - Source machine kinematic definition
   * @param to_kinematics - Target machine kinematic definition
   * @returns Transformed moves with recalculated rotary positions
   */
  transformCoordinates(
    moves: FiveAxisMove[],
    from_kinematics: MachineKinematics,
    to_kinematics: MachineKinematics,
  ): TransformResult {
    const transformed: FiveAxisMove[] = [];
    const warnings: string[] = [];
    let recalculated = 0;

    for (const move of moves) {
      // Step 1: Recover tool tip + tool axis vector from source kinematics
      const { tipPos, toolAxis } = this.inverseKinematics(
        move, from_kinematics,
      );

      // Step 2: Forward kinematics on target machine
      const targetAngles = this.forwardKinematics(
        tipPos, toolAxis, to_kinematics,
      );

      // Step 3: Compute compensated linear positions on target
      const compensated = this.compensatePivot(
        tipPos, targetAngles.primary, targetAngles.secondary,
        to_kinematics,
      );

      // Step 4: Validate against target limits
      const primaryOk = this.withinLimits(
        targetAngles.primary, to_kinematics.rotary_limits.primary_min,
        to_kinematics.rotary_limits.primary_max,
      );
      const secondaryOk = this.withinLimits(
        targetAngles.secondary, to_kinematics.rotary_limits.secondary_min,
        to_kinematics.rotary_limits.secondary_max,
      );

      if (!primaryOk) {
        warnings.push(
          `Line ${move.line}: primary axis ${targetAngles.primary.toFixed(1)}deg `
          + `exceeds target limits `
          + `[${to_kinematics.rotary_limits.primary_min}, `
          + `${to_kinematics.rotary_limits.primary_max}]`,
        );
      }
      if (!secondaryOk) {
        warnings.push(
          `Line ${move.line}: secondary axis `
          + `${targetAngles.secondary.toFixed(1)}deg exceeds target limits `
          + `[${to_kinematics.rotary_limits.secondary_min}, `
          + `${to_kinematics.rotary_limits.secondary_max}]`,
        );
      }

      transformed.push({
        line: move.line,
        x: Math.round(compensated.x * 1000) / 1000,
        y: Math.round(compensated.y * 1000) / 1000,
        z: Math.round(compensated.z * 1000) / 1000,
        primary_deg: Math.round(targetAngles.primary * 1000) / 1000,
        secondary_deg: Math.round(targetAngles.secondary * 1000) / 1000,
        feed: move.feed,
      });
      recalculated++;
    }

    return {
      moves: transformed,
      recalculated_count: recalculated,
      warnings,
    };
  }

  /**
   * Optimize rotary axis motion to minimize total angular travel.
   *
   * Strategies:
   * - Unwinding: use shortest angular path (e.g., 350->10 via +20 not -340)
   * - Wrap-around avoidance for non-continuous axes
   * - Eliminate micro-rotations below threshold
   *
   * @param gcode - Raw G-code string
   * @param kinematics - Machine kinematic definition
   * @returns Optimized moves with travel savings
   */
  optimizeRotaryMotion(
    gcode: string,
    kinematics: MachineKinematics,
  ): RotaryOptimizationResult {
    const moves = this.parseMovesFromGCode(gcode, kinematics);
    if (moves.length < 2) {
      return {
        moves,
        total_saved_deg: 0,
        modified_count: 0,
        changes: ["No optimization needed (fewer than 2 moves)"],
      };
    }

    const optimized = [...moves.map((m) => ({ ...m }))];
    let totalSaved = 0;
    let modifiedCount = 0;
    const changes: string[] = [];

    // Micro-rotation elimination threshold (degrees)
    const MICRO_THRESHOLD = 0.05;

    for (let i = 1; i < optimized.length; i++) {
      const prev = optimized[i - 1];
      const curr = optimized[i];

      // --- Primary axis optimization ---
      const origPrimaryDelta = Math.abs(curr.primary_deg - prev.primary_deg);

      // Eliminate micro-rotations
      if (origPrimaryDelta > 0 && origPrimaryDelta < MICRO_THRESHOLD) {
        curr.primary_deg = prev.primary_deg;
        totalSaved += origPrimaryDelta;
        modifiedCount++;
        continue;
      }

      // Shortest-path unwinding for continuous axes
      if (kinematics.continuous_rotary[0] && origPrimaryDelta > 180) {
        const shortPath = this.shortestAngularPath(
          prev.primary_deg, curr.primary_deg,
        );
        const newTarget = prev.primary_deg + shortPath;

        // Verify new target is within limits or axis is continuous
        if (this.withinLimits(
          newTarget,
          kinematics.rotary_limits.primary_min,
          kinematics.rotary_limits.primary_max,
        )) {
          const saved = origPrimaryDelta - Math.abs(shortPath);
          if (saved > 0) {
            curr.primary_deg = newTarget;
            totalSaved += saved;
            modifiedCount++;
          }
        }
      }

      // --- Secondary axis optimization ---
      const origSecondaryDelta = Math.abs(
        curr.secondary_deg - prev.secondary_deg,
      );

      if (origSecondaryDelta > 0 && origSecondaryDelta < MICRO_THRESHOLD) {
        curr.secondary_deg = prev.secondary_deg;
        totalSaved += origSecondaryDelta;
        modifiedCount++;
        continue;
      }

      if (kinematics.continuous_rotary[1] && origSecondaryDelta > 180) {
        const shortPath = this.shortestAngularPath(
          prev.secondary_deg, curr.secondary_deg,
        );
        const newTarget = prev.secondary_deg + shortPath;

        if (this.withinLimits(
          newTarget,
          kinematics.rotary_limits.secondary_min,
          kinematics.rotary_limits.secondary_max,
        )) {
          const saved = origSecondaryDelta - Math.abs(shortPath);
          if (saved > 0) {
            curr.secondary_deg = newTarget;
            totalSaved += saved;
            modifiedCount++;
          }
        }
      }
    }

    if (modifiedCount > 0) {
      changes.push(
        `Optimized ${modifiedCount} rotary moves, `
        + `saving ${totalSaved.toFixed(1)} degrees total travel`,
      );
    }

    return {
      moves: optimized,
      total_saved_deg: Math.round(totalSaved * 10) / 10,
      modified_count: modifiedCount,
      changes,
    };
  }

  /**
   * Check if all 5-axis positions in a program are reachable on the
   * given machine kinematics.
   *
   * Validates rotary axis limits, identifies unreachable orientations,
   * and reports axis utilization statistics.
   *
   * @param gcode - Raw G-code string
   * @param kinematics - Machine kinematic definition
   * @returns Reachability analysis with violations and utilization stats
   */
  analyzeReachability(
    gcode: string,
    kinematics: MachineKinematics,
  ): ReachabilityResult {
    const moves = this.parseMovesFromGCode(gcode, kinematics);
    const violations: ReachabilityViolation[] = [];

    let primaryMin = Infinity, primaryMax = -Infinity;
    let secondaryMin = Infinity, secondaryMax = -Infinity;

    for (const move of moves) {
      // Track range used
      primaryMin = Math.min(primaryMin, move.primary_deg);
      primaryMax = Math.max(primaryMax, move.primary_deg);
      secondaryMin = Math.min(secondaryMin, move.secondary_deg);
      secondaryMax = Math.max(secondaryMax, move.secondary_deg);

      // Check primary limits
      if (!this.withinLimits(
        move.primary_deg,
        kinematics.rotary_limits.primary_min,
        kinematics.rotary_limits.primary_max,
      )) {
        const nearestLimit = Math.abs(
          move.primary_deg - kinematics.rotary_limits.primary_min,
        ) < Math.abs(
          move.primary_deg - kinematics.rotary_limits.primary_max,
        )
          ? kinematics.rotary_limits.primary_min
          : kinematics.rotary_limits.primary_max;

        violations.push({
          line: move.line,
          axis: kinematics.primary_rotary,
          required_deg: Math.round(move.primary_deg * 100) / 100,
          limit_deg: nearestLimit,
          overshoot_deg: Math.round(
            Math.abs(move.primary_deg - nearestLimit) * 100,
          ) / 100,
        });
      }

      // Check secondary limits
      if (!this.withinLimits(
        move.secondary_deg,
        kinematics.rotary_limits.secondary_min,
        kinematics.rotary_limits.secondary_max,
      )) {
        const nearestLimit = Math.abs(
          move.secondary_deg - kinematics.rotary_limits.secondary_min,
        ) < Math.abs(
          move.secondary_deg - kinematics.rotary_limits.secondary_max,
        )
          ? kinematics.rotary_limits.secondary_min
          : kinematics.rotary_limits.secondary_max;

        violations.push({
          line: move.line,
          axis: kinematics.secondary_rotary,
          required_deg: Math.round(move.secondary_deg * 100) / 100,
          limit_deg: nearestLimit,
          overshoot_deg: Math.round(
            Math.abs(move.secondary_deg - nearestLimit) * 100,
          ) / 100,
        });
      }
    }

    // Handle empty moves
    if (moves.length === 0) {
      primaryMin = 0; primaryMax = 0;
      secondaryMin = 0; secondaryMax = 0;
    }

    const primaryRange = kinematics.rotary_limits.primary_max
      - kinematics.rotary_limits.primary_min;
    const secondaryRange = kinematics.rotary_limits.secondary_max
      - kinematics.rotary_limits.secondary_min;

    const primaryUsed = primaryMax - primaryMin;
    const secondaryUsed = secondaryMax - secondaryMin;

    const utilization = {
      primary_range_used: [
        Math.round(primaryMin * 100) / 100,
        Math.round(primaryMax * 100) / 100,
      ] as [number, number],
      secondary_range_used: [
        Math.round(secondaryMin * 100) / 100,
        Math.round(secondaryMax * 100) / 100,
      ] as [number, number],
      primary_utilization_pct: primaryRange > 0
        ? Math.round((primaryUsed / primaryRange) * 1000) / 10
        : 0,
      secondary_utilization_pct: secondaryRange > 0
        ? Math.round((secondaryUsed / secondaryRange) * 1000) / 10
        : 0,
    };

    const reachable = violations.length === 0;

    let summary = `Analyzed ${moves.length} 5-axis positions. `;
    if (reachable) {
      summary += `All positions reachable. `;
      summary += `Primary ${kinematics.primary_rotary} utilization: `;
      summary += `${utilization.primary_utilization_pct}%, `;
      summary += `Secondary ${kinematics.secondary_rotary}: `;
      summary += `${utilization.secondary_utilization_pct}%.`;
    } else {
      summary += `${violations.length} positions UNREACHABLE. `;
      summary += `Max overshoot: `;
      const maxOver = Math.max(...violations.map((v) => v.overshoot_deg));
      summary += `${maxOver.toFixed(1)} degrees.`;
    }

    return { reachable, violations, utilization, summary };
  }

  // --------------------------------------------------------------------------
  // Kinematic Math
  // --------------------------------------------------------------------------

  /**
   * Compute singularity proximity for a given rotary position.
   * Returns angular distance from nearest singularity in degrees.
   */
  private singularityProximity(
    primaryDeg: number,
    secondaryDeg: number,
    kinematics: MachineKinematics,
  ): number {
    switch (kinematics.type) {
      case "head-table": {
        // Singularity at primary ≈ 0° (tool parallel to spindle, C indeterminate)
        // Ref: Altintas 2012, She & Hung 2008
        return Math.abs(primaryDeg);
      }
      case "table-table": {
        // Singularity at primary tilt ≈ 0° (no unique C decomposition)
        return Math.abs(primaryDeg);
      }
      case "head-head": {
        // Two head rotaries: singularity when both align (gimbal lock)
        const diff = Math.abs(primaryDeg - secondaryDeg);
        const normalized = diff > 180 ? 360 - diff : diff;
        return Math.min(normalized, Math.abs(primaryDeg));
      }
      case "nutating-head": {
        // Nutating head singularity at tilt = 0
        return Math.abs(primaryDeg);
      }
      default:
        return 999;
    }
  }

  /**
   * Inverse kinematics: from programmed (X,Y,Z,A,C) recover tool tip
   * position and tool axis vector in workpiece coordinates.
   */
  private inverseKinematics(
    move: FiveAxisMove,
    kin: MachineKinematics,
  ): { tipPos: Vec3; toolAxis: Vec3 } {
    const pRad = move.primary_deg * DEG2RAD;
    const sRad = move.secondary_deg * DEG2RAD;

    // Tool axis vector from rotary positions
    let toolAxis: Vec3;

    switch (kin.type) {
      case "head-table": {
        // Head tilts (primary = A/B), table rotates (secondary = C)
        // Tool axis = Ry(primary) applied to Z-axis
        toolAxis = {
          x: Math.sin(pRad) * Math.sin(sRad),
          y: -Math.sin(pRad) * Math.cos(sRad),
          z: Math.cos(pRad),
        };
        break;
      }
      case "table-table": {
        // Both axes on the table (e.g., Haas UMC A+C)
        // Workpiece is rotated, tool stays vertical
        toolAxis = {
          x: -Math.sin(sRad) * Math.cos(pRad),
          y: Math.sin(pRad),
          z: Math.cos(pRad) * Math.cos(sRad),
        };
        break;
      }
      case "head-head": {
        // Both axes in the head (e.g., some gantry machines)
        toolAxis = {
          x: Math.sin(pRad),
          y: -Math.sin(sRad) * Math.cos(pRad),
          z: Math.cos(pRad) * Math.cos(sRad),
        };
        break;
      }
      case "nutating-head": {
        // Nutating spindle head with fixed tilt angle
        toolAxis = {
          x: Math.sin(pRad) * Math.cos(sRad),
          y: Math.sin(pRad) * Math.sin(sRad),
          z: Math.cos(pRad),
        };
        break;
      }
    }

    // Compensate pivot point offset using composed rotation matrix
    // For AC table-table: pivot is [0,0,pz], rotation is R_c(secondary) * R_a(primary)
    // Offset = R * pivot - pivot (the displacement due to rotation about the pivot)
    const pv = kin.pivot_point;
    const cp = Math.cos(pRad), sp = Math.sin(pRad);
    const cs = Math.cos(sRad), ss = Math.sin(sRad);
    // Composed rotation R = Rz(secondary) * Rx(primary) applied to pivot vector
    const rpx = cs * pv.x - ss * (cp * pv.y - sp * pv.z);
    const rpy = ss * pv.x + cs * (cp * pv.y - sp * pv.z);
    const rpz = sp * pv.y + cp * pv.z;
    const tipPos: Vec3 = {
      x: move.x + (rpx - pv.x),
      y: move.y + (rpy - pv.y),
      z: move.z + (rpz - pv.z),
    };

    return { tipPos, toolAxis };
  }

  /**
   * Forward kinematics: from tool tip position and tool axis vector,
   * compute the required rotary axis positions for the target machine.
   */
  private forwardKinematics(
    tipPos: Vec3,
    toolAxis: Vec3,
    kin: MachineKinematics,
  ): { primary: number; secondary: number } {
    // Normalize tool axis
    const mag = Math.sqrt(
      toolAxis.x ** 2 + toolAxis.y ** 2 + toolAxis.z ** 2,
    );
    const nx = toolAxis.x / (mag || 1);
    const ny = toolAxis.y / (mag || 1);
    const nz = toolAxis.z / (mag || 1);

    let primary = 0;
    let secondary = 0;

    switch (kin.type) {
      case "head-table": {
        // FK: nx=sinA·sinC, ny=-sinA·cosC, nz=cosA → IK: A=acos(nz), C=atan2(nx,-ny)
        primary = Math.acos(
          Math.max(-1, Math.min(1, nz)),
        ) * RAD2DEG;
        secondary = Math.atan2(nx, -ny) * RAD2DEG;
        break;
      }
      case "table-table": {
        // primary = asin(ny), secondary = atan2(-nx, nz)
        primary = Math.asin(
          Math.max(-1, Math.min(1, ny)),
        ) * RAD2DEG;
        secondary = Math.atan2(-nx, nz) * RAD2DEG;
        break;
      }
      case "head-head": {
        // primary = asin(nx), secondary = atan2(-ny, nz)
        primary = Math.asin(
          Math.max(-1, Math.min(1, nx)),
        ) * RAD2DEG;
        const cosP = Math.cos(primary * DEG2RAD);
        secondary = cosP > 0.001
          ? Math.atan2(-ny / cosP, nz / cosP) * RAD2DEG
          : 0;
        break;
      }
      case "nutating-head": {
        // primary = acos(nz), secondary = atan2(ny, nx)
        primary = Math.acos(
          Math.max(-1, Math.min(1, nz)),
        ) * RAD2DEG;
        secondary = Math.atan2(ny, nx) * RAD2DEG;
        break;
      }
    }

    return {
      primary: Math.round(primary * 1000) / 1000,
      secondary: Math.round(secondary * 1000) / 1000,
    };
  }

  /**
   * Compensate linear axis positions for pivot point offset at given
   * rotary positions on the target machine.
   */
  private compensatePivot(
    tipPos: Vec3,
    primaryDeg: number,
    secondaryDeg: number,
    kin: MachineKinematics,
  ): Vec3 {
    const pRad = primaryDeg * DEG2RAD;
    const sRad = secondaryDeg * DEG2RAD;

    // Pivot compensation: programmed position = tip + pivot offset
    return {
      x: tipPos.x - kin.pivot_point.x * (1 - Math.cos(pRad)),
      y: tipPos.y - kin.pivot_point.y * (1 - Math.cos(sRad)),
      z: tipPos.z - kin.pivot_point.z * (1 - Math.cos(pRad)),
    };
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /** Check if an angle is within [min, max] limits. */
  private withinLimits(
    angle: number, min: number, max: number,
  ): boolean {
    return angle >= min - 0.001 && angle <= max + 0.001;
  }

  /**
   * Compute shortest angular path from angle a to angle b.
   * Returns signed delta in degrees, magnitude <= 180.
   */
  private shortestAngularPath(a: number, b: number): number {
    let delta = b - a;
    // Normalize to [-360, 360]
    delta = delta % 360;
    // Shortest path
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    return delta;
  }

  /**
   * Parse 5-axis moves from raw G-code, extracting rotary axis positions
   * based on the kinematics primary/secondary axis letters.
   */
  private parseMovesFromGCode(
    gcode: string,
    kinematics: MachineKinematics,
  ): FiveAxisMove[] {
    const lines = gcode.split("\n");
    const moves: FiveAxisMove[] = [];
    let curX = 0, curY = 0, curZ = 0;
    let curPrimary = 0, curSecondary = 0;
    let curFeed = 0;

    const pAxis = kinematics.primary_rotary;
    const sAxis = kinematics.secondary_rotary;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith(";")) continue;

      // Check if this line has motion (G0/G1/G2/G3 or axis words)
      const hasMotion = /G0?[0-3]\b/i.test(raw)
        || /[XYZABC]/i.test(raw);
      if (!hasMotion) continue;

      const upper = raw.toUpperCase();

      const xM = upper.match(/X(-?\d+\.?\d*)/);
      const yM = upper.match(/Y(-?\d+\.?\d*)/);
      const zM = upper.match(/Z(-?\d+\.?\d*)/);
      const fM = upper.match(/F(-?\d+\.?\d*)/);

      if (xM) curX = parseFloat(xM[1]);
      if (yM) curY = parseFloat(yM[1]);
      if (zM) curZ = parseFloat(zM[1]);
      if (fM) curFeed = parseFloat(fM[1]);

      // Extract rotary axes by letter
      const pRegex = new RegExp(`${pAxis}(-?\\d+\\.?\\d*)`);
      const sRegex = new RegExp(`${sAxis}(-?\\d+\\.?\\d*)`);
      const pMatch = upper.match(pRegex);
      const sMatch = upper.match(sRegex);

      if (pMatch) curPrimary = parseFloat(pMatch[1]);
      if (sMatch) curSecondary = parseFloat(sMatch[1]);

      // Only include lines that have rotary axis words
      if (pMatch || sMatch) {
        moves.push({
          line: i + 1,
          x: curX,
          y: curY,
          z: curZ,
          primary_deg: curPrimary,
          secondary_deg: curSecondary,
          feed: /G0?0\b/.test(upper) ? 0 : curFeed,
        });
      }
    }

    return moves;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance of the Multi-Axis Kinematic Engine. */
export const multiAxisKinematicEngine = new MultiAxisKinematicEngine();
