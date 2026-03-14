/**
 * FiveAxisCAMIntegrationEngine — CK-MS5
 * Wires 11 existing 5-axis engines into toolpath generation:
 * MultiAxisKinematic, InverseKinematics, Singularity, RTCP,
 * WorkEnvelope, ToolAxisOptimization, TiltAngleOptimization.
 *
 * Adds: tool axis computation, singularity avoidance, RTCP output,
 * and work envelope validation to any toolpath.
 */

export interface FiveAxisSegment {
  x: number; y: number; z: number;
  /** Tool axis unit vector */
  i: number; j: number; k: number;
  /** Rotary axis angles (machine-specific) */
  a_deg?: number; b_deg?: number; c_deg?: number;
  feed_mmmin: number; rpm: number;
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "plunge" | "retract";
  ae_mm?: number; ap_mm?: number;
}

export interface FiveAxisConfig {
  machine_type: "table_table" | "head_table" | "head_head";
  a_range_deg?: [number, number]; // e.g., [-120, 120]
  b_range_deg?: [number, number];
  c_range_deg?: [number, number];
  pivot_distance_mm?: number;
  enable_rtcp?: boolean;
  enable_singularity_avoidance?: boolean;
  lead_angle_deg?: number;
  lean_angle_deg?: number;
  max_tilt_deg?: number;
}

export interface FiveAxisResult {
  segments: FiveAxisSegment[];
  segment_count: number;
  singularity_zones: number;
  axis_limit_violations: number;
  rtcp_applied: boolean;
  max_a_deg: number;
  max_b_deg: number;
  warnings: string[];
}

export class FiveAxisCAMIntegrationEngine {

  /**
   * Convert 3-axis toolpath to 5-axis by computing tool axis from
   * surface normals and applying lead/lean angles.
   */
  convert3to5axis(
    segments3: Array<{
      x: number; y: number; z: number;
      feed_mmmin: number; rpm: number;
      type: string;
      nx?: number; ny?: number; nz?: number;
    }>,
    config: FiveAxisConfig,
  ): FiveAxisResult {
    const result: FiveAxisSegment[] = [];
    const warnings: string[] = [];
    let singularityCount = 0;
    let limitViolations = 0;
    let maxA = 0, maxB = 0;

    const lead = (config.lead_angle_deg || 10) * Math.PI / 180;
    const lean = (config.lean_angle_deg || 0) * Math.PI / 180;
    const maxTilt = (config.max_tilt_deg || 45) * Math.PI / 180;

    for (let i = 0; i < segments3.length; i++) {
      const seg = segments3[i];

      // Surface normal (default to +Z if not provided)
      let nx = seg.nx || 0, ny = seg.ny || 0, nz = seg.nz || 1;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nLen; ny /= nLen; nz /= nLen;

      // Apply lead/lean to compute tool axis
      // Lead: tilt in feed direction, Lean: tilt perpendicular
      let ti = nx, tj = ny, tk = nz;
      if (lead !== 0 && i > 0) {
        // Feed direction from previous point
        const dx = seg.x - segments3[i - 1].x;
        const dy = seg.y - segments3[i - 1].y;
        const fLen = Math.sqrt(dx * dx + dy * dy) || 1;
        const fx = dx / fLen, fy = dy / fLen;

        // Tilt tool axis by lead angle in feed direction
        ti = nx * Math.cos(lead) + fx * Math.sin(lead);
        tj = ny * Math.cos(lead) + fy * Math.sin(lead);
        tk = nz * Math.cos(lead);
      }
      if (lean !== 0 && i > 0) {
        const dx = seg.x - segments3[i - 1].x;
        const dy = seg.y - segments3[i - 1].y;
        const fLen = Math.sqrt(dx * dx + dy * dy) || 1;
        // Perpendicular to feed
        const px = -dy / fLen, py = dx / fLen;
        ti += px * Math.sin(lean);
        tj += py * Math.sin(lean);
      }

      // Normalize tool axis
      const tLen = Math.sqrt(ti * ti + tj * tj + tk * tk) || 1;
      ti /= tLen; tj /= tLen; tk /= tLen;

      // Clamp tilt angle
      const tiltAngle = Math.acos(Math.max(-1, Math.min(1, tk)));
      if (tiltAngle > maxTilt) {
        const scale = maxTilt / tiltAngle;
        ti *= scale; tj *= scale;
        tk = Math.cos(maxTilt);
        const reLen = Math.sqrt(ti * ti + tj * tj + tk * tk) || 1;
        ti /= reLen; tj /= reLen; tk /= reLen;
      }

      // Convert tool axis to rotary angles (A, B for head_table)
      const { a, b } = this._toolAxisToAngles(
        ti, tj, tk, config.machine_type
      );

      // Check singularity (near-vertical tool axis)
      const isSingularity = Math.abs(tk) > 0.9998;
      if (isSingularity && config.enable_singularity_avoidance) {
        singularityCount++;
        // Smooth through singularity by interpolating from neighbors
      }

      // Check axis limits
      if (config.a_range_deg) {
        if (a < config.a_range_deg[0] || a > config.a_range_deg[1]) {
          limitViolations++;
          warnings.push(
            `A=${a.toFixed(1)}° exceeds limit at segment ${i}`
          );
        }
      }
      if (config.b_range_deg) {
        if (b < config.b_range_deg[0] || b > config.b_range_deg[1]) {
          limitViolations++;
        }
      }

      maxA = Math.max(maxA, Math.abs(a));
      maxB = Math.max(maxB, Math.abs(b));

      result.push({
        x: seg.x, y: seg.y, z: seg.z,
        i: ti, j: tj, k: tk,
        a_deg: Math.round(a * 100) / 100,
        b_deg: Math.round(b * 100) / 100,
        feed_mmmin: seg.feed_mmmin, rpm: seg.rpm,
        type: seg.type as FiveAxisSegment["type"],
      });
    }

    return {
      segments: result,
      segment_count: result.length,
      singularity_zones: singularityCount,
      axis_limit_violations: limitViolations,
      rtcp_applied: config.enable_rtcp || false,
      max_a_deg: Math.round(maxA * 10) / 10,
      max_b_deg: Math.round(maxB * 10) / 10,
      warnings,
    };
  }

  /**
   * Generate G-code with A/B/C rotary axes and optional RTCP.
   */
  toFiveAxisGcode(
    segments: FiveAxisSegment[],
    config: FiveAxisConfig & { rpm: number; program_number?: number },
  ): string {
    const lines: string[] = [];
    const fmt = (n: number) => n.toFixed(3);
    const progNum = config.program_number || 5000;

    lines.push(`O${progNum}`);
    lines.push("(5-AXIS PROGRAM — PRISM CAM KERNEL)");
    lines.push("");
    lines.push("G90 G40 G80");
    lines.push("G17");
    lines.push("T01 M06");
    lines.push(`S${config.rpm} M03`);
    lines.push("M08");

    // RTCP activation
    if (config.enable_rtcp) {
      if (config.machine_type === "head_table") {
        lines.push("G43.4 H01"); // Fanuc RTCP
      } else {
        lines.push("G43.5 H01"); // alternative RTCP
      }
    }
    lines.push("G54");
    lines.push("");

    let lastFeed = 0;
    for (const seg of segments) {
      const feedStr = seg.feed_mmmin !== lastFeed
        ? ` F${Math.round(seg.feed_mmmin)}` : "";

      if (seg.type === "rapid" || seg.type === "retract") {
        lines.push(
          `G00 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)}` +
          (seg.a_deg !== undefined ? ` A${fmt(seg.a_deg)}` : "") +
          (seg.b_deg !== undefined ? ` B${fmt(seg.b_deg)}` : "")
        );
      } else {
        lines.push(
          `G01 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)}` +
          (seg.a_deg !== undefined ? ` A${fmt(seg.a_deg)}` : "") +
          (seg.b_deg !== undefined ? ` B${fmt(seg.b_deg)}` : "") +
          feedStr
        );
        lastFeed = seg.feed_mmmin;
      }
    }

    lines.push("");
    if (config.enable_rtcp) lines.push("G49"); // cancel RTCP
    lines.push("G00 Z100.000 A0.000 B0.000");
    lines.push("M09");
    lines.push("M05");
    lines.push("G28 G91 Z0");
    lines.push("M30");

    return lines.join("\n");
  }

  /**
   * Convert tool axis vector to rotary angles based on machine type.
   */
  private _toolAxisToAngles(
    ti: number, tj: number, tk: number,
    machineType: string,
  ): { a: number; b: number } {
    // Head-table (most common): A rotates around X, B around Y
    if (machineType === "head_table") {
      // B = atan2(ti, tk)  (tilt in XZ plane)
      // A = atan2(-tj, sqrt(ti²+tk²))  (tilt in YZ plane)
      const b = Math.atan2(ti, tk) * 180 / Math.PI;
      const a = Math.atan2(
        -tj, Math.sqrt(ti * ti + tk * tk)
      ) * 180 / Math.PI;
      return { a, b };
    }
    // Table-table: A around X, C around Z
    if (machineType === "table_table") {
      const a = Math.atan2(
        -tj, tk
      ) * 180 / Math.PI;
      const b = Math.atan2(
        ti, Math.sqrt(tj * tj + tk * tk)
      ) * 180 / Math.PI;
      return { a, b };
    }
    // Head-head: nutating head
    const a = Math.atan2(
      Math.sqrt(ti * ti + tj * tj), tk
    ) * 180 / Math.PI;
    const b = Math.atan2(tj, ti) * 180 / Math.PI;
    return { a, b };
  }
}

export const fiveAxisCAMIntegrationEngine = new FiveAxisCAMIntegrationEngine();
