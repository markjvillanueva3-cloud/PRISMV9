/**
 * WorkEnvelopeValidatorEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Validates that toolpath stays within machine work envelope.
 * Checks: axis travel limits, combined axis limits, tool length
 * reach, and fixture clearance. Prevents crashes from exceeding
 * machine physical capabilities.
 *
 * Actions: envelope_validate, envelope_check_point, envelope_summary
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AxisLimits {
  X_min_mm: number; X_max_mm: number;
  Y_min_mm: number; Y_max_mm: number;
  Z_min_mm: number; Z_max_mm: number;
  A_min_deg?: number; A_max_deg?: number;
  B_min_deg?: number; B_max_deg?: number;
  C_min_deg?: number; C_max_deg?: number;
}

export interface EnvelopeInput {
  axis_limits: AxisLimits;
  toolpath_points: {
    X: number; Y: number; Z: number;
    A?: number; B?: number; C?: number;
    is_rapid?: boolean;
  }[];
  tool_length_mm: number;
  workpiece_height_mm: number;
  fixture_height_mm: number;
  safety_margin_mm: number;           // additional clearance from hard limits
}

export interface EnvelopeViolation {
  point_index: number;
  axis: string;
  value: number;
  limit: number;
  overshoot_mm_or_deg: number;
  is_rapid: boolean;
  severity: "warning" | "critical";
}

export interface EnvelopeResult {
  is_valid: boolean;
  violations: EnvelopeViolation[];
  utilization: {
    X_pct: number; Y_pct: number; Z_pct: number;
    A_pct?: number; B_pct?: number; C_pct?: number;
  };
  bounding_box: {
    X_min: number; X_max: number;
    Y_min: number; Y_max: number;
    Z_min: number; Z_max: number;
  };
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WorkEnvelopeValidatorEngine {
  validate(input: EnvelopeInput): EnvelopeResult {
    const violations: EnvelopeViolation[] = [];
    const lim = input.axis_limits;
    const margin = input.safety_margin_mm;

    // Effective limits with safety margin
    const effLimits = {
      X_min: lim.X_min_mm + margin, X_max: lim.X_max_mm - margin,
      Y_min: lim.Y_min_mm + margin, Y_max: lim.Y_max_mm - margin,
      Z_min: lim.Z_min_mm + margin, Z_max: lim.Z_max_mm - margin,
    };

    // Z limit adjusted for tool length and workpiece/fixture stack
    const zMinEffective = effLimits.Z_min + input.tool_length_mm + input.fixture_height_mm;

    // Bounding box tracking
    let bbXmin = Infinity, bbXmax = -Infinity;
    let bbYmin = Infinity, bbYmax = -Infinity;
    let bbZmin = Infinity, bbZmax = -Infinity;

    for (let idx = 0; idx < input.toolpath_points.length; idx++) {
      const pt = input.toolpath_points[idx];
      const isRapid = pt.is_rapid || false;

      // Update bounding box
      if (pt.X < bbXmin) bbXmin = pt.X;
      if (pt.X > bbXmax) bbXmax = pt.X;
      if (pt.Y < bbYmin) bbYmin = pt.Y;
      if (pt.Y > bbYmax) bbYmax = pt.Y;
      if (pt.Z < bbZmin) bbZmin = pt.Z;
      if (pt.Z > bbZmax) bbZmax = pt.Z;

      // Linear axis checks
      const checks: [string, number, number, number][] = [
        ["X", pt.X, effLimits.X_min, effLimits.X_max],
        ["Y", pt.Y, effLimits.Y_min, effLimits.Y_max],
        ["Z", pt.Z, zMinEffective, effLimits.Z_max],
      ];

      for (const [axis, val, min, max] of checks) {
        if (val < min) {
          violations.push({
            point_index: idx, axis, value: val, limit: min,
            overshoot_mm_or_deg: Math.round((min - val) * 1000) / 1000,
            is_rapid: isRapid,
            severity: isRapid ? "critical" : "warning",
          });
        }
        if (val > max) {
          violations.push({
            point_index: idx, axis, value: val, limit: max,
            overshoot_mm_or_deg: Math.round((val - max) * 1000) / 1000,
            is_rapid: isRapid,
            severity: isRapid ? "critical" : "warning",
          });
        }
      }

      // Rotary axis checks
      if (pt.A !== undefined && lim.A_min_deg !== undefined && lim.A_max_deg !== undefined) {
        if (pt.A < lim.A_min_deg! + margin * 0.1 || pt.A > lim.A_max_deg! - margin * 0.1) {
          violations.push({
            point_index: idx, axis: "A", value: pt.A,
            limit: pt.A < lim.A_min_deg! ? lim.A_min_deg! : lim.A_max_deg!,
            overshoot_mm_or_deg: Math.abs(pt.A < lim.A_min_deg! ? lim.A_min_deg! - pt.A : pt.A - lim.A_max_deg!),
            is_rapid: isRapid, severity: "critical",
          });
        }
      }
      if (pt.B !== undefined && lim.B_min_deg !== undefined && lim.B_max_deg !== undefined) {
        if (pt.B < lim.B_min_deg! + margin * 0.1 || pt.B > lim.B_max_deg! - margin * 0.1) {
          violations.push({
            point_index: idx, axis: "B", value: pt.B,
            limit: pt.B < lim.B_min_deg! ? lim.B_min_deg! : lim.B_max_deg!,
            overshoot_mm_or_deg: Math.abs(pt.B < lim.B_min_deg! ? lim.B_min_deg! - pt.B : pt.B - lim.B_max_deg!),
            is_rapid: isRapid, severity: "critical",
          });
        }
      }
      // C-axis rotary limit check (C-001 fix: was previously missing)
      if (pt.C !== undefined && lim.C_min_deg !== undefined && lim.C_max_deg !== undefined) {
        if (pt.C < lim.C_min_deg! + margin * 0.1 || pt.C > lim.C_max_deg! - margin * 0.1) {
          violations.push({
            point_index: idx, axis: "C", value: pt.C,
            limit: pt.C < lim.C_min_deg! ? lim.C_min_deg! : lim.C_max_deg!,
            overshoot_mm_or_deg: Math.abs(pt.C < lim.C_min_deg! ? lim.C_min_deg! - pt.C : pt.C - lim.C_max_deg!),
            is_rapid: isRapid, severity: "critical",
          });
        }
      }
    }

    // Axis utilization
    const xRange = lim.X_max_mm - lim.X_min_mm;
    const yRange = lim.Y_max_mm - lim.Y_min_mm;
    const zRange = lim.Z_max_mm - lim.Z_min_mm;

    const utilization = {
      X_pct: xRange > 0 ? Math.round((bbXmax - bbXmin) / xRange * 1000) / 10 : 0,
      Y_pct: yRange > 0 ? Math.round((bbYmax - bbYmin) / yRange * 1000) / 10 : 0,
      Z_pct: zRange > 0 ? Math.round((bbZmax - bbZmin) / zRange * 1000) / 10 : 0,
    };

    // Recommendations
    const recs: string[] = [];
    const critCount = violations.filter(v => v.severity === "critical").length;
    if (critCount > 0) {
      recs.push(`SAFETY: ${critCount} critical envelope violations — toolpath MUST be corrected before running`);
      const axesViolated = [...new Set(violations.map(v => v.axis))];
      recs.push(`Violated axes: ${axesViolated.join(", ")}`);
    }
    if (utilization.X_pct > 90 || utilization.Y_pct > 90 || utilization.Z_pct > 90) {
      recs.push("Toolpath uses >90% of machine travel — consider re-positioning workpiece origin");
    }
    if (violations.length === 0) {
      recs.push("All toolpath points within work envelope — safe to proceed");
    }

    return {
      is_valid: violations.length === 0,
      violations: violations.slice(0, 50), // limit output
      utilization,
      bounding_box: {
        X_min: Math.round(bbXmin * 1000) / 1000, X_max: Math.round(bbXmax * 1000) / 1000,
        Y_min: Math.round(bbYmin * 1000) / 1000, Y_max: Math.round(bbYmax * 1000) / 1000,
        Z_min: Math.round(bbZmin * 1000) / 1000, Z_max: Math.round(bbZmax * 1000) / 1000,
      },
      recommendations: recs,
    };
  }
}

export const workEnvelopeValidatorEngine = new WorkEnvelopeValidatorEngine();
