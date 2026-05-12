/**
 * PPArcValidatorEngine — Validate G2/G3 arc commands for geometric sanity
 *
 * G2/G3 circular interpolation is one of the most common sources of
 * programming errors. This engine walks a G-code program and validates
 * every arc block for:
 *
 *   - Center specification consistency: either I/J/K offsets OR an R-radius,
 *     never both (some controllers error on conflict, others silently prefer
 *     one). Both-specified is always flagged.
 *   - Start-to-center vs end-to-center radius match (|SC| ≈ |EC|). If the
 *     two distances differ by more than `radius_tolerance_mm`, the arc is
 *     geometrically impossible — the endpoint is not on the circle.
 *   - Full-circle arcs: endpoint == startpoint. If specified with R-format
 *     this is ambiguous (many controllers reject it — must use I/J).
 *   - R-format direction ambiguity: for R-format, positive R gives the short
 *     arc (≤ 180°), negative R gives the long arc (> 180°). Flag cases
 *     where an R-format arc spans > 180°.
 *   - Plane consistency: G2/G3 are resolved in the active G17/G18/G19 plane.
 *     An arc move that specifies K in G17 (XY) is suspicious — K is the
 *     arc-center offset in Z, which has no meaning in the XY plane.
 *   - Zero-length arc: start == end with no I/J/K or R specified.
 *
 * Scope — distinct from:
 *   - CircularInterpolationEngine — physics/MRR for circular milling,
 *     not syntax/geometry validation.
 *   - BackplotEngine — parses arcs but doesn't flag geometric errors.
 *   - PPGCodeLintEngine — general lint; arcs not a primary focus there.
 *
 * Uses PPModalStateTrackerEngine internally to resolve the active plane
 * and distance mode (G90/G91) at each arc block.
 *
 * @module PPArcValidatorEngine
 */
import { ppModalStateTrackerEngine } from "./PPModalStateTrackerEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type ArcSeverity = "error" | "warning" | "info";

export interface ArcIssue {
  line_number: number;
  motion: "G2" | "G3";
  kind:
    | "both_center_forms"        // I/J AND R both specified
    | "radius_mismatch"          // |SC| ≠ |EC|
    | "full_circle_r_format"     // R-format full circle — ambiguous
    | "zero_length_arc"          // start == end, no center
    | "plane_axis_mismatch"      // K in G17 or I in G18, etc.
    | "r_format_large_arc"       // R-format spanning > 180°
    | "missing_center";          // No I/J/K and no R
  severity: ArcSeverity;
  message: string;
  details?: {
    start?: { x: number; y: number; z: number };
    end?:   { x: number; y: number; z: number };
    center?: { x: number; y: number; z?: number };
    radius_from_center?: number;
    radius_from_end?: number;
    radius_mismatch_mm?: number;
    arc_angle_deg?: number;
  };
}

export interface ArcValidatorResult {
  total_arcs: number;
  total_issues: number;
  errors: number;
  warnings: number;
  issues: ArcIssue[];
  summary: {
    valid: boolean;               // zero errors
    arcs_by_type: { G2: number; G3: number };
  };
}

export interface ArcValidatorOptions {
  radius_tolerance_mm?: number;   // default 0.01 mm
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPArcValidatorEngine {
  private readonly DEFAULT_RADIUS_TOL = 0.01;

  /**
   * Validate all G2/G3 arcs in a G-code program.
   */
  validate(gcode: string, options?: ArcValidatorOptions): ArcValidatorResult {
    const tol = options?.radius_tolerance_mm ?? this.DEFAULT_RADIUS_TOL;
    const lines = gcode.split(/\r?\n/);
    const issues: ArcIssue[] = [];

    // Build modal state timeline to know plane and distance mode
    const modal = ppModalStateTrackerEngine.track(gcode);

    // Track cumulative position across lines (absolute)
    let cx = 0, cy = 0, cz = 0;

    let g2Count = 0;
    let g3Count = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();

      if (code.length === 0) continue;

      // Extract G-code motion (G2/G3). Note that arcs can also be implicit
      // modal — if the active motion modal is G2/G3 and this line has only
      // coordinates, it's also an arc. We only validate explicit G2/G3 here
      // for clarity.
      const motionMatch = code.match(/\bG0*(2|3)\b/);
      const hasArcCoords = /\b[IJK]-?\d|\bR-?\d/.test(code);

      // Pre-compute this line's state from modal tracker
      const stateEntry = modal.timeline.find(t => t.line_number === lineNum);
      const plane = stateEntry?.state.plane ?? "G17";
      const distance = stateEntry?.state.distance ?? "G90";

      if (motionMatch) {
        const motion = ("G" + motionMatch[1]) as "G2" | "G3";
        if (motion === "G2") g2Count++;
        else g3Count++;

        const x = this.readWord(code, "X");
        const y = this.readWord(code, "Y");
        const z = this.readWord(code, "Z");
        const i = this.readWord(code, "I");
        const j = this.readWord(code, "J");
        const k = this.readWord(code, "K");
        const r = this.readWord(code, "R");

        // Compute start and end in absolute coords
        const start = { x: cx, y: cy, z: cz };
        const end = {
          x: x === undefined ? cx : (distance === "G91" ? cx + x : x),
          y: y === undefined ? cy : (distance === "G91" ? cy + y : y),
          z: z === undefined ? cz : (distance === "G91" ? cz + z : z),
        };

        const hasCenter = i !== undefined || j !== undefined || k !== undefined;
        const hasR = r !== undefined;

        // Plane axis mismatch
        if (plane === "G17") {
          if (k !== undefined && (i === undefined && j === undefined)) {
            issues.push({
              line_number: lineNum,
              motion,
              kind: "plane_axis_mismatch",
              severity: "warning",
              message: "K offset specified in G17 (XY) plane — K applies to Z, expected I and/or J",
            });
          }
        } else if (plane === "G18") {
          if (j !== undefined && (i === undefined && k === undefined)) {
            issues.push({
              line_number: lineNum,
              motion,
              kind: "plane_axis_mismatch",
              severity: "warning",
              message: "J offset specified in G18 (XZ) plane — J applies to Y, expected I and/or K",
            });
          }
        } else if (plane === "G19") {
          if (i !== undefined && (j === undefined && k === undefined)) {
            issues.push({
              line_number: lineNum,
              motion,
              kind: "plane_axis_mismatch",
              severity: "warning",
              message: "I offset specified in G19 (YZ) plane — I applies to X, expected J and/or K",
            });
          }
        }

        // Both center forms specified
        if (hasCenter && hasR) {
          issues.push({
            line_number: lineNum,
            motion,
            kind: "both_center_forms",
            severity: "error",
            message: "Arc specifies both I/J/K and R — must use one or the other",
          });
        }

        // No center specified at all
        if (!hasCenter && !hasR && !this.isZeroMove(start, end)) {
          issues.push({
            line_number: lineNum,
            motion,
            kind: "missing_center",
            severity: "error",
            message: "Arc has no I/J/K and no R — center is undefined",
          });
        }

        // Zero-length arc without center
        if (this.isZeroMove(start, end) && !hasCenter && !hasR) {
          issues.push({
            line_number: lineNum,
            motion,
            kind: "zero_length_arc",
            severity: "error",
            message: "Arc has identical start and end with no I/J/K or R",
          });
        }

        // Full-circle in R-format (start == end)
        if (this.isZeroMove(start, end) && hasR && !hasCenter) {
          issues.push({
            line_number: lineNum,
            motion,
            kind: "full_circle_r_format",
            severity: "error",
            message: "Full-circle arc cannot use R-format — start equals end, R is ambiguous. Use I/J.",
          });
        }

        // Radius consistency check (I/J/K form)
        if (hasCenter && !hasR) {
          const ci = i ?? 0;
          const cj = j ?? 0;
          const ck = k ?? 0;
          const center = {
            x: start.x + ci,
            y: start.y + cj,
            z: start.z + ck,
          };

          let startDist: number;
          let endDist: number;

          if (plane === "G17") {
            startDist = Math.hypot(start.x - center.x, start.y - center.y);
            endDist = Math.hypot(end.x - center.x, end.y - center.y);
          } else if (plane === "G18") {
            startDist = Math.hypot(start.x - center.x, start.z - center.z);
            endDist = Math.hypot(end.x - center.x, end.z - center.z);
          } else {
            // G19 YZ
            startDist = Math.hypot(start.y - center.y, start.z - center.z);
            endDist = Math.hypot(end.y - center.y, end.z - center.z);
          }

          const delta = Math.abs(startDist - endDist);
          if (delta > tol) {
            issues.push({
              line_number: lineNum,
              motion,
              kind: "radius_mismatch",
              severity: "error",
              message: `Endpoint not on arc circle — start radius ${startDist.toFixed(4)}mm, end radius ${endDist.toFixed(4)}mm (delta ${delta.toFixed(4)}mm > tol ${tol}mm)`,
              details: {
                start,
                end,
                center: plane === "G17"
                  ? { x: center.x, y: center.y }
                  : plane === "G18"
                    ? { x: center.x, y: 0, z: center.z }
                    : { x: 0, y: center.y, z: center.z },
                radius_from_center: startDist,
                radius_from_end: endDist,
                radius_mismatch_mm: delta,
              },
            });
          }
        }

        // R-format large arc detection (informational — negative R is allowed,
        // but a positive R that would require > 180° to reach end is impossible).
        // Full check requires solving the circle intersection; skip detailed
        // check for now and only flag R-format arcs with negative R as "info".
        if (hasR && r! < 0) {
          issues.push({
            line_number: lineNum,
            motion,
            kind: "r_format_large_arc",
            severity: "info",
            message: `R-format arc with negative R (${r!.toFixed(3)}) — indicates arc > 180°. Valid but harder to read than I/J form.`,
          });
        }

        // Update tracked position to the arc endpoint
        cx = end.x;
        cy = end.y;
        cz = end.z;
      } else if (hasArcCoords) {
        // Has I/J/K or R but no explicit G2/G3 — could be modal arc
        // continuation or a stray — flag as info
        const modalMotion = stateEntry?.state.motion;
        if (modalMotion !== "G2" && modalMotion !== "G3") {
          issues.push({
            line_number: lineNum,
            motion: "G2", // placeholder — caller can inspect
            kind: "missing_center",
            severity: "info",
            message: "Line has I/J/K or R but no explicit arc motion — stray arc parameters",
          });
        }
      } else {
        // Non-arc motion line — update position if linear/rapid move
        const x = this.readWord(code, "X");
        const y = this.readWord(code, "Y");
        const z = this.readWord(code, "Z");
        if (x !== undefined) cx = distance === "G91" ? cx + x : x;
        if (y !== undefined) cy = distance === "G91" ? cy + y : y;
        if (z !== undefined) cz = distance === "G91" ? cz + z : z;
      }
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;

    return {
      total_arcs: g2Count + g3Count,
      total_issues: issues.length,
      errors,
      warnings,
      issues,
      summary: {
        valid: errors === 0,
        arcs_by_type: { G2: g2Count, G3: g3Count },
      },
    };
  }

  /**
   * Convenience — quick pass/fail on a program.
   */
  quickCheck(gcode: string): { valid: boolean; errors: number; warnings: number } {
    const r = this.validate(gcode);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<ArcValidatorOptions> {
    return { radius_tolerance_mm: this.DEFAULT_RADIUS_TOL };
  }

  // ── Private helpers ────────────────────────────────────────────────

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

  private isZeroMove(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ): boolean {
    return Math.abs(a.x - b.x) < 1e-9
      && Math.abs(a.y - b.y) < 1e-9
      && Math.abs(a.z - b.z) < 1e-9;
  }
}

export const ppArcValidatorEngine = new PPArcValidatorEngine();
