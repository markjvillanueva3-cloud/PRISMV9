/**
 * SingularityAvoidanceEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Detects and avoids kinematic singularities in 5-axis machining.
 * At singularity, a rotary axis must spin infinitely fast to maintain
 * tool orientation — causing machine runaway, axis faults, or crashes.
 *
 * Common singularities:
 * - Gimbal lock: B=0° or B=90° (orientation degeneracy)
 * - Pole singularity: tool axis parallel to rotary axis
 * - Workspace boundary: axis limits prevent required orientation
 *
 * Actions: singularity_detect, singularity_reroute, singularity_map
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SingularityInput {
  kinematic_type: "table_table" | "head_head" | "mixed";
  toolpath_points: { x: number; y: number; z: number; i: number; j: number; k: number }[];
  // i,j,k = tool axis direction vector (unit vector)
  rotary_axis_1: "A" | "B";           // primary rotary axis
  rotary_axis_2: "C";                 // secondary rotary axis (always C for most configs)
  angular_velocity_limit_deg_per_sec: number;  // max rotary axis speed
  feed_rate_mm_per_min: number;
}

export interface SingularityResult {
  singular_points: SingularityPoint[];
  total_points_checked: number;
  is_safe: boolean;
  max_angular_velocity_deg_per_sec: number;
  recommendations: string[];
}

export interface SingularityPoint {
  point_index: number;
  type: "gimbal_lock" | "pole" | "axis_reversal" | "high_velocity";
  severity: "warning" | "critical";
  angle_1_deg: number;
  angle_2_deg: number;
  required_angular_velocity_deg_per_sec: number;
  description: string;
}

export interface SingularityMap {
  zones: SingularityZone[];
  safe_orientation_ranges: { axis1_min: number; axis1_max: number; axis2_min: number; axis2_max: number }[];
}

export interface SingularityZone {
  axis1_center_deg: number;
  axis2_center_deg: number;
  radius_deg: number;
  type: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SingularityAvoidanceEngine {
  detect(input: SingularityInput): SingularityResult {
    const singularPoints: SingularityPoint[] = [];
    let maxAngVel = 0;

    for (let idx = 0; idx < input.toolpath_points.length; idx++) {
      const pt = input.toolpath_points[idx];

      // Convert tool axis vector to rotary axis angles
      const angles = this._vectorToAngles(pt.i, pt.j, pt.k, input.rotary_axis_1);
      const a1 = angles.axis1_deg;
      const a2 = angles.axis2_deg;

      // Check gimbal lock: when primary axis near 0° or 180°
      const gimbalThreshold = 2.0; // degrees
      if (Math.abs(a1) < gimbalThreshold || Math.abs(a1 - 180) < gimbalThreshold) {
        singularPoints.push({
          point_index: idx,
          type: "gimbal_lock",
          severity: "critical",
          angle_1_deg: Math.round(a1 * 100) / 100,
          angle_2_deg: Math.round(a2 * 100) / 100,
          required_angular_velocity_deg_per_sec: Infinity,
          description: `Gimbal lock: ${input.rotary_axis_1}=${a1.toFixed(1)}° — C-axis becomes degenerate`,
        });
        continue;
      }

      // Check pole singularity: tool axis parallel to machine Z
      const zAlignment = Math.abs(pt.k);
      if (zAlignment > 0.998) { // within ~3.6° of vertical
        singularPoints.push({
          point_index: idx,
          type: "pole",
          severity: "warning",
          angle_1_deg: Math.round(a1 * 100) / 100,
          angle_2_deg: Math.round(a2 * 100) / 100,
          required_angular_velocity_deg_per_sec: 0,
          description: "Tool axis near-vertical — C-axis position becomes ambiguous",
        });
      }

      // Check angular velocity between consecutive points
      if (idx > 0) {
        const prevPt = input.toolpath_points[idx - 1];
        const prevAngles = this._vectorToAngles(prevPt.i, prevPt.j, prevPt.k, input.rotary_axis_1);

        // Linear distance between points
        const dist = Math.sqrt((pt.x - prevPt.x) ** 2 + (pt.y - prevPt.y) ** 2 + (pt.z - prevPt.z) ** 2);
        const timeAtFeed = dist / (input.feed_rate_mm_per_min / 60); // seconds

        if (timeAtFeed > 0.001) {
          // Angular change
          let dA1 = Math.abs(angles.axis1_deg - prevAngles.axis1_deg);
          let dA2 = Math.abs(angles.axis2_deg - prevAngles.axis2_deg);

          // Handle C-axis wrapping
          if (dA2 > 180) dA2 = 360 - dA2;

          const angVel1 = dA1 / timeAtFeed;
          const angVel2 = dA2 / timeAtFeed;
          const maxVel = Math.max(angVel1, angVel2);

          if (maxVel > maxAngVel) maxAngVel = maxVel;

          if (maxVel > input.angular_velocity_limit_deg_per_sec) {
            singularPoints.push({
              point_index: idx,
              type: "high_velocity",
              severity: maxVel > input.angular_velocity_limit_deg_per_sec * 2 ? "critical" : "warning",
              angle_1_deg: Math.round(a1 * 100) / 100,
              angle_2_deg: Math.round(a2 * 100) / 100,
              required_angular_velocity_deg_per_sec: Math.round(maxVel * 10) / 10,
              description: `Required ${maxVel.toFixed(0)}°/s exceeds limit ${input.angular_velocity_limit_deg_per_sec}°/s`,
            });
          }

          // Check axis reversal (sign change in angular velocity)
          if (idx > 1) {
            const prevPrevPt = input.toolpath_points[idx - 2];
            const ppAngles = this._vectorToAngles(prevPrevPt.i, prevPrevPt.j, prevPrevPt.k, input.rotary_axis_1);
            const prevDA2 = prevAngles.axis2_deg - ppAngles.axis2_deg;
            const currDA2 = angles.axis2_deg - prevAngles.axis2_deg;
            if (prevDA2 * currDA2 < 0 && Math.abs(prevDA2) > 30) {
              singularPoints.push({
                point_index: idx,
                type: "axis_reversal",
                severity: "warning",
                angle_1_deg: Math.round(a1 * 100) / 100,
                angle_2_deg: Math.round(a2 * 100) / 100,
                required_angular_velocity_deg_per_sec: Math.round(maxVel * 10) / 10,
                description: "C-axis reversal with large angular change — surface mark likely",
              });
            }
          }
        }
      }
    }

    const hasCritical = singularPoints.some(p => p.severity === "critical");

    const recs: string[] = [];
    if (hasCritical) {
      recs.push("SAFETY: Critical singularity detected — toolpath will cause machine fault or crash");
      recs.push("Re-orient part setup or modify toolpath to avoid singular orientations");
    }
    if (maxAngVel > input.angular_velocity_limit_deg_per_sec * 0.8) {
      recs.push("Rotary axes near speed limit — reduce feed rate through critical sections");
    }
    if (singularPoints.filter(p => p.type === "pole").length > 3) {
      recs.push("Multiple pole singularities — consider tilting part to avoid near-vertical tool orientations");
    }
    if (recs.length === 0) {
      recs.push("No singularities detected — toolpath is safe for 5-axis execution");
    }

    return {
      singular_points: singularPoints,
      total_points_checked: input.toolpath_points.length,
      is_safe: !hasCritical,
      max_angular_velocity_deg_per_sec: Math.round(maxAngVel * 10) / 10,
      recommendations: recs,
    };
  }

  private _vectorToAngles(i: number, j: number, k: number, primaryAxis: "A" | "B"): { axis1_deg: number; axis2_deg: number } {
    // Convert tool axis unit vector to rotary axis angles
    if (primaryAxis === "A") {
      // A rotates around X, C rotates around Z
      const a = Math.acos(Math.max(-1, Math.min(1, k))) * 180 / Math.PI;
      const c = Math.atan2(i, -j) * 180 / Math.PI;
      return { axis1_deg: a, axis2_deg: c };
    } else {
      // B rotates around Y, C rotates around Z
      const b = Math.acos(Math.max(-1, Math.min(1, k))) * 180 / Math.PI;
      const c = Math.atan2(-i, j) * 180 / Math.PI;
      return { axis1_deg: b, axis2_deg: c };
    }
  }

  mapSingularities(kinematic_type: string, primaryAxis: "A" | "B"): SingularityMap {
    const zones: SingularityZone[] = [];

    // Gimbal lock zones
    zones.push({ axis1_center_deg: 0, axis2_center_deg: 0, radius_deg: 3, type: "gimbal_lock" });
    zones.push({ axis1_center_deg: 180, axis2_center_deg: 0, radius_deg: 3, type: "gimbal_lock" });

    // Safe ranges
    const safe = [{ axis1_min: 5, axis1_max: 175, axis2_min: -180, axis2_max: 180 }];

    return { zones, safe_orientation_ranges: safe };
  }
}

export const singularityAvoidanceEngine = new SingularityAvoidanceEngine();
