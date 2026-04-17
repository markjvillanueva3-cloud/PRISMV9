/**
 * PPPolarCoordinateValidatorEngine — Validate polar coordinate mode (G15/G16)
 *
 * Polar mode (G16) reinterprets axis words on the selected plane: the
 * first axis word becomes the RADIUS from the polar origin, the second
 * becomes the ANGLE in degrees. Get it wrong and motion goes anywhere:
 * wrong direction, wrong magnitude, head crashes into fixtures or parts.
 *
 * Classic Fanuc behavior:
 *   G17 G16       — XY plane, polar (X=radius, Y=angle)
 *   G18 G16       — XZ plane, polar (X=radius, Z=angle)
 *   G19 G16       — YZ plane, polar (Y=radius, Z=angle)
 *   G15           — cancel polar, back to Cartesian
 *
 * The polar origin defaults to the active work-offset zero, but G52
 * local offsets and certain canned cycles can shift it in subtle ways.
 *
 * Failure modes we catch:
 *   - g16_without_g15 (warning): polar mode activated, never cancelled
 *     before M30. Next program inherits polar — first G0 goes weird.
 *   - nested_g16 (error): G16 issued while already in G16 without
 *     intervening G15. Behavior non-portable (Fanuc silently ignores,
 *     Haas PS 010).
 *   - g16_without_plane_select (warning): G16 activated without any
 *     G17/G18/G19 before it. Plane is whatever was last set; if that
 *     was a default, polar origin is ambiguous.
 *   - cutter_comp_in_polar (warning): G41/G42 active during G16.
 *     Some controls reject this with PS 0041; on others the comp
 *     vector is computed in Cartesian and then re-projected, which
 *     is numerically unstable near the polar origin.
 *   - motion_in_polar_missing_axis (info): G0/G1 while in G16 with
 *     only one axis word. Radius or angle defaults to previous value
 *     — almost never what was intended.
 *   - distance_mode_change_in_polar (warning): G90 / G91 toggled while
 *     G16 is active. Angle-in-incremental mode means cumulative angle,
 *     which few operators expect.
 *   - negative_polar_radius (info): radius word negative. Legal on
 *     Fanuc (mirrors 180°), confusing elsewhere.
 *
 * Scope — distinct from:
 *   - PPCoordSystemTransformValidator: handles G68 rotation, G51 scaling,
 *     mirror — NOT polar mode.
 *   - PPWorkOffsetValidator: WCS G54-G59 usage, doesn't know about polar.
 *   - PPCutterCompValidator: owns G40/G41/G42. This engine cross-flags
 *     when cutter comp runs under polar mode.
 *
 * @module PPPolarCoordinateValidatorEngine
 */

export type PolarSeverity = "error" | "warning" | "info";

export type PolarIssueKind =
  | "g16_without_g15"
  | "nested_g16"
  | "g16_without_plane_select"
  | "cutter_comp_in_polar"
  | "motion_in_polar_missing_axis"
  | "distance_mode_change_in_polar"
  | "negative_polar_radius";

export interface PolarIssue {
  kind: PolarIssueKind;
  severity: PolarSeverity;
  line: number;
  block: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PolarOptions {
  check_g16_balance?: boolean;
  check_nested_g16?: boolean;
  check_plane_select?: boolean;
  check_cutter_comp?: boolean;
  check_motion_missing_axis?: boolean;
  check_distance_mode_change?: boolean;
  check_negative_radius?: boolean;
}

export interface PolarResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    g16_activations: number;
    g15_cancels: number;
    polar_motion_blocks: number;
    ends_in_polar_mode: boolean;
  };
  issues: PolarIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<PolarOptions> = {
  check_g16_balance: true,
  check_nested_g16: true,
  check_plane_select: true,
  check_cutter_comp: true,
  check_motion_missing_axis: true,
  check_distance_mode_change: true,
  check_negative_radius: false,
};

export class PPPolarCoordinateValidatorEngine {
  validate(code: string, opts: PolarOptions = {}): PolarResult {
    const options: Required<PolarOptions> = { ...DEFAULT_OPTIONS, ...opts };
    const issues: PolarIssue[] = [];
    const lines = code.split(/\r?\n/);

    // State
    let inPolar = false;
    let planeSelected = false;
    let activePlane: "G17" | "G18" | "G19" | null = null;
    let cutterComp: "G40" | "G41" | "G42" = "G40";

    let g16Activations = 0;
    let g15Cancels = 0;
    let polarMotionBlocks = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const stripped = this.stripComments(raw).trim();
      if (stripped === "" || stripped === "%") continue;

      const lineNo = i + 1;

      // Plane select (tracked regardless of polar state)
      if (/\bG17\b/.test(stripped)) {
        planeSelected = true;
        activePlane = "G17";
      } else if (/\bG18\b/.test(stripped)) {
        planeSelected = true;
        activePlane = "G18";
      } else if (/\bG19\b/.test(stripped)) {
        planeSelected = true;
        activePlane = "G19";
      }

      // Cutter comp state (G40 cancels, G41/G42 activates)
      if (/\bG40\b/.test(stripped)) cutterComp = "G40";
      if (/\bG41\b/.test(stripped)) cutterComp = "G41";
      if (/\bG42\b/.test(stripped)) cutterComp = "G42";

      // G16 activation
      if (/\bG16\b/.test(stripped)) {
        // 1. nested_g16
        if (inPolar && options.check_nested_g16) {
          issues.push({
            kind: "nested_g16",
            severity: "error",
            line: lineNo,
            block: stripped,
            message: "G16 issued while already in polar mode — cancel with G15 first",
          });
        }

        // 2. g16_without_plane_select
        if (!planeSelected && options.check_plane_select) {
          issues.push({
            kind: "g16_without_plane_select",
            severity: "warning",
            line: lineNo,
            block: stripped,
            message: "G16 activated without prior G17/G18/G19 plane select — polar axes ambiguous",
          });
        }

        // 3. cutter_comp_in_polar
        if (cutterComp !== "G40" && options.check_cutter_comp) {
          issues.push({
            kind: "cutter_comp_in_polar",
            severity: "warning",
            line: lineNo,
            block: stripped,
            message: `G16 activated while cutter comp ${cutterComp} is on — non-portable behavior`,
            details: { cutter_comp: cutterComp },
          });
        }

        inPolar = true;
        g16Activations++;
      }

      // G15 cancel
      if (/\bG15\b/.test(stripped)) {
        inPolar = false;
        g15Cancels++;
      }

      // Distance mode change while in polar
      if (inPolar && options.check_distance_mode_change) {
        if (/\bG90\b/.test(stripped) || /\bG91\b/.test(stripped)) {
          // Allow only the activation block itself (may include G16 G90)
          if (!/\bG16\b/.test(stripped) && !/\bG15\b/.test(stripped)) {
            issues.push({
              kind: "distance_mode_change_in_polar",
              severity: "warning",
              line: lineNo,
              block: stripped,
              message: "G90/G91 distance mode changed while polar G16 is active — angle interpretation may surprise",
            });
          }
        }
      }

      // Motion in polar mode — axis-count sanity
      if (inPolar && /\bG0?[01]\b/.test(stripped)) {
        polarMotionBlocks++;
        const hasRadius = this.hasRadiusAxis(stripped, activePlane);
        const hasAngle = this.hasAngleAxis(stripped, activePlane);
        if (
          options.check_motion_missing_axis &&
          !(hasRadius && hasAngle) &&
          (hasRadius || hasAngle)
        ) {
          issues.push({
            kind: "motion_in_polar_missing_axis",
            severity: "info",
            line: lineNo,
            block: stripped,
            message: "Polar motion block has only radius or only angle — the other defaults to previous",
            details: {
              plane: activePlane,
              has_radius: hasRadius,
              has_angle: hasAngle,
            },
          });
        }

        // Negative radius check
        if (options.check_negative_radius) {
          const radiusVal = this.extractRadiusValue(stripped, activePlane);
          if (radiusVal !== null && radiusVal < 0) {
            issues.push({
              kind: "negative_polar_radius",
              severity: "info",
              line: lineNo,
              block: stripped,
              message: `Negative polar radius ${radiusVal} — mirrors 180° on Fanuc, may alarm elsewhere`,
              details: { radius: radiusVal },
            });
          }
        }
      }
    }

    // 4. g16_without_g15 — program ends in polar mode
    if (inPolar && options.check_g16_balance) {
      issues.push({
        kind: "g16_without_g15",
        severity: "warning",
        line: lines.length,
        block: "(end of program)",
        message: "Program ends in polar mode (G16) without G15 cancel — next run inherits state",
      });
    }

    const error_count = issues.filter((i) => i.severity === "error").length;
    const warning_count = issues.filter((i) => i.severity === "warning").length;
    const info_count = issues.filter((i) => i.severity === "info").length;

    return {
      summary: {
        valid: error_count === 0,
        total_issues: issues.length,
        error_count,
        warning_count,
        info_count,
        g16_activations: g16Activations,
        g15_cancels: g15Cancels,
        polar_motion_blocks: polarMotionBlocks,
        ends_in_polar_mode: inPolar,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    g16_activations: number;
    ends_in_polar_mode: boolean;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      g16_activations: r.summary.g16_activations,
      ends_in_polar_mode: r.summary.ends_in_polar_mode,
    };
  }

  defaultOptions(): Required<PolarOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private hasRadiusAxis(
    block: string,
    plane: "G17" | "G18" | "G19" | null,
  ): boolean {
    if (plane === "G17") return /\bX-?\d/.test(block);
    if (plane === "G18") return /\bX-?\d/.test(block);
    if (plane === "G19") return /\bY-?\d/.test(block);
    return /\b[XYZ]-?\d/.test(block);
  }

  private hasAngleAxis(
    block: string,
    plane: "G17" | "G18" | "G19" | null,
  ): boolean {
    if (plane === "G17") return /\bY-?\d/.test(block);
    if (plane === "G18") return /\bZ-?\d/.test(block);
    if (plane === "G19") return /\bZ-?\d/.test(block);
    return /\b[XYZ]-?\d/.test(block);
  }

  private extractRadiusValue(
    block: string,
    plane: "G17" | "G18" | "G19" | null,
  ): number | null {
    let letter: string;
    if (plane === "G17" || plane === "G18") letter = "X";
    else if (plane === "G19") letter = "Y";
    else letter = "X";
    const re = new RegExp(`\\b${letter}(-?\\d+(?:\\.\\d+)?)`);
    const m = block.match(re);
    return m ? parseFloat(m[1]) : null;
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppPolarCoordinateValidatorEngine =
  new PPPolarCoordinateValidatorEngine();
