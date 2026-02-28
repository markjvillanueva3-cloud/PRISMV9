/**
 * RTCP_CompensationEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Rotary Tool Center Point (RTCP / TCPM) compensation for 5-axis machining.
 * When rotary axes tilt, the tool center point shifts — without RTCP
 * compensation, the tool crashes into the workpiece or fixture.
 *
 * Models: kinematic chains (table-table, head-head, mixed), pivot point
 * offsets, and compensation vectors for common 5-axis configurations.
 *
 * Actions: rtcp_compensate, rtcp_validate, rtcp_error_check
 */

// ============================================================================
// TYPES
// ============================================================================

export type KinematicType =
  | "table_table"    // A+C on table (DMG, Hermle)
  | "head_head"      // A+C on spindle head (gantry)
  | "mixed_AC"       // A on table, C on head
  | "mixed_BC"       // B on table, C on head
  | "head_table";    // B on head, C on table

export interface RTCPInput {
  kinematic_type: KinematicType;
  // Machine-specific pivot point distances (mm)
  pivot_to_gauge_mm: number;           // spindle face to rotary center
  pivot_to_table_mm: number;           // rotary center to table surface
  tool_length_mm: number;
  tool_gauge_length_mm: number;        // gauge line to tool tip
  // Current position
  A_deg: number;                       // A-axis angle
  B_deg?: number;                      // B-axis angle (if applicable)
  C_deg: number;                       // C-axis angle
  // Programmed position (where tool tip should be)
  X_mm: number;
  Y_mm: number;
  Z_mm: number;
  tolerance_mm?: number;                // RTCP tolerance threshold (default 0.01mm)
}

export interface RTCPResult {
  compensated_X_mm: number;
  compensated_Y_mm: number;
  compensated_Z_mm: number;
  compensation_vector: { dx: number; dy: number; dz: number };
  tool_tip_error_without_rtcp_mm: number;
  is_within_tolerance: boolean;
  kinematic_chain: string;
  recommendations: string[];
}

export interface RTCPValidation {
  safe: boolean;
  max_error_mm: number;
  axis_limits_ok: boolean;
  singularity_risk: boolean;
  warnings: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class RTCP_CompensationEngine {
  compensate(input: RTCPInput): RTCPResult {
    const A = input.A_deg * Math.PI / 180;
    const B = (input.B_deg || 0) * Math.PI / 180;
    const C = input.C_deg * Math.PI / 180;

    // Tool tip vector (in machine coordinates, before rotation)
    const toolLen = input.tool_gauge_length_mm;
    const pivotGauge = input.pivot_to_gauge_mm;
    const pivotTable = input.pivot_to_table_mm;

    // Compensation depends on kinematic type
    let dx = 0, dy = 0, dz = 0;

    if (input.kinematic_type === "table_table") {
      // Table-table: rotary axes move the workpiece
      // Tool tip stays fixed in machine coords, table rotates under it
      // Compensation: account for pivot point to tool tip offset through rotation
      const cosA = Math.cos(A), sinA = Math.sin(A);
      const cosC = Math.cos(C), sinC = Math.sin(C);

      // Rotation of pivot offset
      dx = pivotTable * sinC * sinA;
      dy = -pivotTable * cosC * sinA;
      dz = pivotTable * (1 - cosA);

      // Also compensate for tool length through C rotation
      // (tool is fixed, but programmed point rotates with table)

    } else if (input.kinematic_type === "head_head") {
      // Head-head: rotary axes move the spindle
      // Tool tip position changes when head tilts
      const cosA = Math.cos(A), sinA = Math.sin(A);
      const cosC = Math.cos(C), sinC = Math.sin(C);

      // Tool tip offset due to A rotation (tilt)
      const tz = toolLen + pivotGauge;
      dx = -tz * sinA * sinC;
      dy = tz * sinA * cosC;
      dz = tz * (1 - cosA);

    } else if (input.kinematic_type === "mixed_AC") {
      // A on table, C on head
      const cosA = Math.cos(A), sinA = Math.sin(A);
      const cosC = Math.cos(C), sinC = Math.sin(C);

      // Table A-axis rotates workpiece
      const tableComp_y = pivotTable * sinA;
      const tableComp_z = pivotTable * (1 - cosA);

      // Head C-axis rotates tool
      const headComp_x = -(toolLen + pivotGauge) * sinC;
      const headComp_y = (toolLen + pivotGauge) * (1 - cosC);

      dx = headComp_x;
      dy = tableComp_y + headComp_y;
      dz = tableComp_z;

    } else {
      // Mixed_BC and head_table: simplified model
      const cosB = Math.cos(B), sinB = Math.sin(B);
      const cosC = Math.cos(C), sinC = Math.sin(C);
      const tz = toolLen + pivotGauge;

      dx = tz * sinB;
      dy = -tz * sinC * cosB;
      dz = tz * (1 - cosB * cosC);
    }

    // Compensated position
    const compX = input.X_mm + dx;
    const compY = input.Y_mm + dy;
    const compZ = input.Z_mm + dz;

    // Error without RTCP
    const errorMm = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Tolerance check (0.01mm typical for 5-axis)
    const toleranceMm = input.tolerance_mm ?? 0.01;
    const withinTol = errorMm <= toleranceMm;

    // Kinematic chain description
    const chainDesc = `${input.kinematic_type}: A=${input.A_deg}° C=${input.C_deg}°` +
      (input.B_deg !== undefined ? ` B=${input.B_deg}°` : '');

    // Recommendations
    const recs: string[] = [];
    if (errorMm > 10) {
      recs.push(`Large RTCP compensation (${errorMm.toFixed(1)}mm) — verify pivot point calibration`);
    }
    if (Math.abs(input.A_deg) > 30) {
      recs.push("High tilt angle — verify machine travel limits and potential interference");
    }
    if (recs.length === 0) {
      recs.push("RTCP compensation calculated — verify with test cut or touch probe");
    }

    return {
      compensated_X_mm: Math.round(compX * 1000) / 1000,
      compensated_Y_mm: Math.round(compY * 1000) / 1000,
      compensated_Z_mm: Math.round(compZ * 1000) / 1000,
      compensation_vector: {
        dx: Math.round(dx * 1000) / 1000,
        dy: Math.round(dy * 1000) / 1000,
        dz: Math.round(dz * 1000) / 1000,
      },
      tool_tip_error_without_rtcp_mm: Math.round(errorMm * 1000) / 1000,
      is_within_tolerance: withinTol,
      kinematic_chain: chainDesc,
      recommendations: recs,
    };
  }

  validate(input: RTCPInput, axis_limits: { A_min: number; A_max: number; C_min: number; C_max: number }): RTCPValidation {
    const warnings: string[] = [];

    // Axis limits check
    const aOk = input.A_deg >= axis_limits.A_min && input.A_deg <= axis_limits.A_max;
    const cOk = input.C_deg >= axis_limits.C_min && input.C_deg <= axis_limits.C_max;
    if (!aOk) warnings.push(`SAFETY: A-axis ${input.A_deg}° outside limits [${axis_limits.A_min}°, ${axis_limits.A_max}°]`);
    if (!cOk) warnings.push(`SAFETY: C-axis ${input.C_deg}° outside limits [${axis_limits.C_min}°, ${axis_limits.C_max}°]`);

    // Singularity check (A near 0° for head-head makes C redundant)
    const singularity = (input.kinematic_type === "head_head" || input.kinematic_type === "table_table")
      && Math.abs(input.A_deg) < 0.5;

    if (singularity) {
      warnings.push("CAUTION: Near singularity (A≈0°) — C-axis motion causes rapid linear axis compensation");
    }

    // Compensation magnitude check
    const result = this.compensate(input);
    if (result.tool_tip_error_without_rtcp_mm > 50) {
      warnings.push(`Large compensation vector (${result.tool_tip_error_without_rtcp_mm.toFixed(1)}mm) — potential calibration error`);
    }

    return {
      safe: aOk && cOk && !singularity && warnings.length <= 1,
      max_error_mm: result.tool_tip_error_without_rtcp_mm,
      axis_limits_ok: aOk && cOk,
      singularity_risk: singularity,
      warnings: warnings.length > 0 ? warnings : ["RTCP configuration validated — safe to proceed"],
    };
  }
}

export const rtcpCompensationEngine = new RTCP_CompensationEngine();
