/**
 * PPRapidMoveValidatorEngine — Validate G0 rapid traverse moves
 *
 * Rapid (G0) moves at maximum machine velocity — a mis-sequenced rapid
 * is the most common cause of machine crashes. The control does not feed
 * into material; it slams at 30+ m/min. Every crash investigation
 * eventually ends at a rapid that should have been G1 or a rapid that
 * descended below the clearance plane while still over the part.
 *
 * Checks (all lifted from real post-processor bug reports):
 *   - rapid_below_clearance (error): G0 Z < clearance_z with X/Y motion
 *     implies rapid traverse through material zone.
 *   - rapid_xyz_combined (warning): G0 X Y Z in a single block — Fanuc
 *     and Haas execute dogleg (non-linear) trajectory, not a straight
 *     line. Post-processors that emit single-block XYZ rapids produce
 *     unpredictable tool motion.
 *   - rapid_with_feed_word (warning): G0 F100 — F is ignored on rapid,
 *     but its presence often indicates the author intended G1.
 *   - first_motion_not_rapid (error): the first motion in a program is
 *     G1 — tool plunges at feed from an unknown start position.
 *   - rapid_with_spindle_off (warning): G0 Z-descent with M5/spindle-off
 *     still commanded — common CAM bug post-tool-change.
 *   - rapid_missing_tool_length (warning): G0 Z moves before G43 tool
 *     length compensation activated — Z motion uses machine zero, not
 *     tool-tip zero.
 *
 * Scope — distinct from:
 *   - MillKinematicsCollisionEngine: detects geometric collisions against
 *     fixture/stock at toolpath level, not G-code text patterns.
 *   - MillProgramOptimizerEngine: OPTIMIZES rapids (shortens), this
 *     VALIDATES rapid syntax/sequencing correctness.
 *   - PPArcValidatorEngine: arc geometry, not rapid moves.
 *   - PPFeedOverrideValidatorEngine: flags rapid_with_feed from a feed
 *     perspective (this engine's lens is rapid safety).
 *
 * @module PPRapidMoveValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type RapidSeverity = "error" | "warning" | "info";

export interface RapidIssue {
  line_number: number;
  kind:
    | "rapid_below_clearance"
    | "rapid_xyz_combined"
    | "rapid_with_feed_word"
    | "first_motion_not_rapid"
    | "rapid_with_spindle_off"
    | "rapid_missing_tool_length";
  severity: RapidSeverity;
  message: string;
  details?: {
    z_value?: number;
    clearance_z?: number;
    feed?: number;
    axes_moved?: string[];
  };
}

export interface RapidResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: RapidIssue[];
  summary: {
    valid: boolean;
    rapid_count: number;
    feed_count: number;
    xyz_combined_count: number;
    below_clearance_count: number;
    first_motion_type: "G0" | "G1" | "G2" | "G3" | "none";
    first_motion_line: number | null;
  };
}

export interface RapidOptions {
  clearance_z?: number;                     // default 5 (mm) — Z below this in G0 with XY motion is suspect
  check_below_clearance?: boolean;          // default true
  check_xyz_combined?: boolean;             // default true (single-block XYZ dogleg)
  check_rapid_with_feed?: boolean;          // default true
  check_first_motion?: boolean;             // default true
  check_rapid_spindle_off?: boolean;        // default true
  check_missing_tool_length?: boolean;      // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPRapidMoveValidatorEngine {
  /**
   * Validate G0 rapid moves.
   */
  validate(gcode: string, options?: RapidOptions): RapidResult {
    const opts = {
      clearance_z: options?.clearance_z ?? 5,
      check_below_clearance: options?.check_below_clearance ?? true,
      check_xyz_combined: options?.check_xyz_combined ?? true,
      check_rapid_with_feed: options?.check_rapid_with_feed ?? true,
      check_first_motion: options?.check_first_motion ?? true,
      check_rapid_spindle_off: options?.check_rapid_spindle_off ?? true,
      check_missing_tool_length: options?.check_missing_tool_length ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: RapidIssue[] = [];
    let rapidCount = 0;
    let feedCount = 0;
    let xyzCombinedCount = 0;
    let belowClearanceCount = 0;
    let firstMotionType: "G0" | "G1" | "G2" | "G3" | "none" = "none";
    let firstMotionLine: number | null = null;

    // Track modal state across lines
    let spindleOn = false;
    let toolLengthActive = false;
    let currentG: 0 | 1 | 2 | 3 | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Spindle state tracking
      if (/\bM0*3\b/.test(code) || /\bM0*4\b/.test(code)) spindleOn = true;
      if (/\bM0*5\b/.test(code)) spindleOn = false;

      // Tool length comp tracking
      if (/\bG0*43\b/.test(code)) toolLengthActive = true;
      if (/\bG0*49\b/.test(code)) toolLengthActive = false;

      // Motion word extraction — explicit G0/G1/G2/G3 sets modal
      const gMatch = code.match(/\bG0*([0123])\b/);
      if (gMatch) {
        currentG = parseInt(gMatch[1], 10) as 0 | 1 | 2 | 3;
      }

      const xVal = this.readWord(code, "X");
      const yVal = this.readWord(code, "Y");
      const zVal = this.readWord(code, "Z");
      const fVal = this.readWord(code, "F");

      const axesMoved: string[] = [];
      if (xVal !== undefined) axesMoved.push("X");
      if (yVal !== undefined) axesMoved.push("Y");
      if (zVal !== undefined) axesMoved.push("Z");

      if (axesMoved.length === 0) continue;

      // First-motion detection
      if (firstMotionType === "none" && currentG !== null) {
        firstMotionType = (`G${currentG}` as "G0" | "G1" | "G2" | "G3");
        firstMotionLine = lineNum;

        if (opts.check_first_motion && currentG !== 0) {
          issues.push({
            line_number: lineNum,
            kind: "first_motion_not_rapid",
            severity: "error",
            message: `First motion G${currentG} — tool moves at feed from unknown start; first motion should be G0 positioning`,
          });
        }
      }

      // Only the remainder applies to G0 rapids
      if (currentG !== 0) {
        if (currentG === 1 || currentG === 2 || currentG === 3) feedCount++;
        continue;
      }

      rapidCount++;

      // rapid_xyz_combined
      if (
        opts.check_xyz_combined &&
        xVal !== undefined && yVal !== undefined && zVal !== undefined
      ) {
        xyzCombinedCount++;
        issues.push({
          line_number: lineNum,
          kind: "rapid_xyz_combined",
          severity: "warning",
          message: `G0 with X, Y, and Z on one block — dogleg motion on most controllers; split into XY rapid + Z rapid`,
          details: { axes_moved: axesMoved },
        });
      }

      // rapid_with_feed_word
      if (opts.check_rapid_with_feed && fVal !== undefined) {
        issues.push({
          line_number: lineNum,
          kind: "rapid_with_feed_word",
          severity: "warning",
          message: `G0 with F${fVal} — F ignored on rapid; did you mean G1?`,
          details: { feed: fVal },
        });
      }

      // rapid_below_clearance (Z below clearance combined with XY motion)
      if (
        opts.check_below_clearance &&
        zVal !== undefined &&
        zVal < opts.clearance_z &&
        (xVal !== undefined || yVal !== undefined)
      ) {
        belowClearanceCount++;
        issues.push({
          line_number: lineNum,
          kind: "rapid_below_clearance",
          severity: "error",
          message: `G0 rapid with Z=${zVal} below clearance ${opts.clearance_z} while XY moving — collision risk`,
          details: { z_value: zVal, clearance_z: opts.clearance_z, axes_moved: axesMoved },
        });
      }

      // rapid_with_spindle_off (Z-descent rapid with spindle off)
      if (
        opts.check_rapid_spindle_off &&
        !spindleOn &&
        zVal !== undefined &&
        zVal < opts.clearance_z
      ) {
        issues.push({
          line_number: lineNum,
          kind: "rapid_with_spindle_off",
          severity: "warning",
          message: `G0 Z${zVal} descent while spindle off (M5 active) — common CAM post bug`,
          details: { z_value: zVal },
        });
      }

      // rapid_missing_tool_length (Z motion without G43 active)
      if (
        opts.check_missing_tool_length &&
        !toolLengthActive &&
        zVal !== undefined
      ) {
        issues.push({
          line_number: lineNum,
          kind: "rapid_missing_tool_length",
          severity: "warning",
          message: `G0 Z${zVal} with no active G43 tool length compensation — Z referenced to machine zero`,
          details: { z_value: zVal },
        });
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const info = issues.filter((i) => i.severity === "info").length;

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        rapid_count: rapidCount,
        feed_count: feedCount,
        xyz_combined_count: xyzCombinedCount,
        below_clearance_count: belowClearanceCount,
        first_motion_type: firstMotionType,
        first_motion_line: firstMotionLine,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: RapidOptions,
  ): { valid: boolean; errors: number; warnings: number; rapid_count: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      rapid_count: r.summary.rapid_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<RapidOptions> {
    return {
      clearance_z: 5,
      check_below_clearance: true,
      check_xyz_combined: true,
      check_rapid_with_feed: true,
      check_first_motion: true,
      check_rapid_spindle_off: true,
      check_missing_tool_length: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private readWord(code: string, letter: string): number | undefined {
    const regex = new RegExp(`\\b${letter}(-?\\d+\\.?\\d*)\\b`);
    const m = code.match(regex);
    if (!m) return undefined;
    const v = parseFloat(m[1]);
    return Number.isNaN(v) ? undefined : v;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppRapidMoveValidatorEngine = new PPRapidMoveValidatorEngine();
