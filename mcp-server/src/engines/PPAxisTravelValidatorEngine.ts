/**
 * PPAxisTravelValidatorEngine — Validate motion against machine envelope
 *
 * The most common "program runs on Machine A but alarms on Machine B"
 * failure mode is travel-envelope violation: Machine A has a 40" X
 * travel, Machine B only 20", so any X position > 20" triggers an
 * out-of-travel alarm on load. The alarm fires AFTER the tool has
 * been loaded and the spindle oriented — recovery costs 15+ minutes.
 *
 * Static travel validation catches these at post-processor review.
 *
 * Checks:
 *   - x_travel_exceeded / y_travel_exceeded / z_travel_exceeded (error):
 *     coordinate beyond [min, max] for the axis.
 *   - travel_margin_warning (warning): coordinate within `margin` of
 *     envelope edge (default 5mm) — tool can't decelerate at rapid.
 *   - missing_envelope (info): no envelope supplied; validator cannot
 *     verify travel.
 *
 * Supports:
 *   - absolute (G90) vs incremental (G91) positioning
 *   - modal coordinates (axis unspecified = previous value)
 *   - work offsets (simple G54-G59 with user-supplied offset table)
 *
 * Scope — distinct from:
 *   - MillKinematicsCollisionEngine: checks collisions against part/
 *     fixture geometry in 3D, not axis envelope as a box.
 *   - MachineOptionRegistryEngine: registry of machine capabilities,
 *     including envelope; this engine USES envelope to validate.
 *   - PPRapidMoveValidatorEngine: rapid move safety around clearance,
 *     not envelope.
 *
 * @module PPAxisTravelValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type TravelSeverity = "error" | "warning" | "info";

export interface AxisEnvelope {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  z_min: number;
  z_max: number;
}

export interface WorkOffset {
  /** Applied to absolute coordinates when offset code is active. */
  x?: number;
  y?: number;
  z?: number;
}

export interface TravelIssue {
  line_number: number;
  kind:
    | "x_travel_exceeded"
    | "y_travel_exceeded"
    | "z_travel_exceeded"
    | "travel_margin_warning"
    | "missing_envelope";
  severity: TravelSeverity;
  message: string;
  details?: {
    axis?: "X" | "Y" | "Z";
    value?: number;
    envelope_min?: number;
    envelope_max?: number;
    offset?: number;
    offset_code?: string;
  };
}

export interface TravelResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: TravelIssue[];
  summary: {
    valid: boolean;
    motion_lines: number;
    x_range: { min: number; max: number } | null;
    y_range: { min: number; max: number } | null;
    z_range: { min: number; max: number } | null;
    active_offset_code: string | null;
  };
}

export interface TravelOptions {
  envelope?: AxisEnvelope;
  /** Work offset table indexed by G-code string (e.g. "G54"). */
  offsets?: Record<string, WorkOffset>;
  /** Default offset code active at program start. */
  default_offset?: string;
  /** Margin from envelope edge that triggers a warning. */
  margin?: number;
  check_margin?: boolean;
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPAxisTravelValidatorEngine {
  /**
   * Validate motion against machine envelope.
   */
  validate(gcode: string, options?: TravelOptions): TravelResult {
    const opts = {
      envelope: options?.envelope,
      offsets: options?.offsets ?? {},
      default_offset: options?.default_offset ?? "G54",
      margin: options?.margin ?? 5,
      check_margin: options?.check_margin ?? true,
    };

    const issues: TravelIssue[] = [];

    if (!opts.envelope) {
      issues.push({
        line_number: 0,
        kind: "missing_envelope",
        severity: "info",
        message: `No envelope supplied — travel validation skipped`,
      });
      return {
        total_issues: issues.length,
        errors: 0,
        warnings: 0,
        info: 1,
        issues,
        summary: {
          valid: true,
          motion_lines: 0,
          x_range: null,
          y_range: null,
          z_range: null,
          active_offset_code: null,
        },
      };
    }

    const env = opts.envelope;
    const lines = gcode.split(/\r?\n/);
    let motionLines = 0;
    let absMode = true; // G90 default
    let activeOffsetCode = opts.default_offset;
    let curX: number | null = null;
    let curY: number | null = null;
    let curZ: number | null = null;
    let xMin: number | null = null;
    let xMax: number | null = null;
    let yMin: number | null = null;
    let yMax: number | null = null;
    let zMin: number | null = null;
    let zMax: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      if (/\bG0*90\b/.test(code)) absMode = true;
      if (/\bG0*91\b/.test(code)) absMode = false;

      const offsetMatch = code.match(/\bG(5[4-9])\b/);
      if (offsetMatch) activeOffsetCode = `G${offsetMatch[1]}`;

      const xVal = this.readWord(code, "X");
      const yVal = this.readWord(code, "Y");
      const zVal = this.readWord(code, "Z");
      const hasMotion = xVal !== undefined || yVal !== undefined || zVal !== undefined;
      if (!hasMotion) continue;

      motionLines++;
      const off = opts.offsets[activeOffsetCode] ?? { x: 0, y: 0, z: 0 };

      if (xVal !== undefined) {
        curX = absMode ? xVal : (curX ?? 0) + xVal;
        const machineX = curX + (off.x ?? 0);
        this.checkAxis("X", machineX, env.x_min, env.x_max, lineNum, activeOffsetCode, off.x ?? 0, opts.margin, opts.check_margin, issues);
        xMin = xMin === null ? machineX : Math.min(xMin, machineX);
        xMax = xMax === null ? machineX : Math.max(xMax, machineX);
      }
      if (yVal !== undefined) {
        curY = absMode ? yVal : (curY ?? 0) + yVal;
        const machineY = curY + (off.y ?? 0);
        this.checkAxis("Y", machineY, env.y_min, env.y_max, lineNum, activeOffsetCode, off.y ?? 0, opts.margin, opts.check_margin, issues);
        yMin = yMin === null ? machineY : Math.min(yMin, machineY);
        yMax = yMax === null ? machineY : Math.max(yMax, machineY);
      }
      if (zVal !== undefined) {
        curZ = absMode ? zVal : (curZ ?? 0) + zVal;
        const machineZ = curZ + (off.z ?? 0);
        this.checkAxis("Z", machineZ, env.z_min, env.z_max, lineNum, activeOffsetCode, off.z ?? 0, opts.margin, opts.check_margin, issues);
        zMin = zMin === null ? machineZ : Math.min(zMin, machineZ);
        zMax = zMax === null ? machineZ : Math.max(zMax, machineZ);
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
        motion_lines: motionLines,
        x_range: xMin !== null && xMax !== null ? { min: xMin, max: xMax } : null,
        y_range: yMin !== null && yMax !== null ? { min: yMin, max: yMax } : null,
        z_range: zMin !== null && zMax !== null ? { min: zMin, max: zMax } : null,
        active_offset_code: activeOffsetCode,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: TravelOptions,
  ): { valid: boolean; errors: number; warnings: number; motion_lines: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      motion_lines: r.summary.motion_lines,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<Omit<TravelOptions, "envelope" | "offsets">> & {
    envelope: AxisEnvelope | undefined;
    offsets: Record<string, WorkOffset>;
  } {
    return {
      envelope: undefined,
      offsets: {},
      default_offset: "G54",
      margin: 5,
      check_margin: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private checkAxis(
    axis: "X" | "Y" | "Z",
    value: number,
    envMin: number,
    envMax: number,
    lineNum: number,
    offsetCode: string,
    offset: number,
    margin: number,
    checkMargin: boolean,
    issues: TravelIssue[],
  ): void {
    const kindError = (`${axis.toLowerCase()}_travel_exceeded`) as
      | "x_travel_exceeded"
      | "y_travel_exceeded"
      | "z_travel_exceeded";

    if (value < envMin || value > envMax) {
      issues.push({
        line_number: lineNum,
        kind: kindError,
        severity: "error",
        message: `${axis}=${value.toFixed(3)} outside envelope [${envMin}, ${envMax}] (offset ${offsetCode}: ${offset})`,
        details: {
          axis,
          value,
          envelope_min: envMin,
          envelope_max: envMax,
          offset,
          offset_code: offsetCode,
        },
      });
      return;
    }
    if (checkMargin && (value - envMin < margin || envMax - value < margin)) {
      issues.push({
        line_number: lineNum,
        kind: "travel_margin_warning",
        severity: "warning",
        message: `${axis}=${value.toFixed(3)} within ${margin}mm of envelope edge — insufficient deceleration distance`,
        details: {
          axis,
          value,
          envelope_min: envMin,
          envelope_max: envMax,
        },
      });
    }
  }

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

export const ppAxisTravelValidatorEngine = new PPAxisTravelValidatorEngine();
