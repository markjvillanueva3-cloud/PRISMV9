/**
 * PPCoordinateRangeValidatorEngine — Validate coordinate-value reasonableness
 *
 * Validates that X/Y/Z/A/B/C coordinate values are within universally
 * reasonable bounds regardless of the specific machine. Catches post-
 * processor bugs that produce absurd values like:
 *   - X100000. from a mm↔m unit-conversion error
 *   - Z-999999. from a signed overflow in a CAM post
 *   - A3600. from angle-wrap logic that fails to normalize
 *   - X0.000001 from float-precision blow-up
 *
 * Distinct from PPAxisTravelValidator: that engine needs a per-machine
 * envelope. This engine uses universal reasonableness bounds (e.g., no
 * useful commercial mill has a 10-meter travel, no rotary needs
 * 1,000,000 degrees).
 *
 * Checks:
 *   - coord_absurdly_large (warning): |value| > max_linear_range
 *     (default 10,000 mm) for linear axes.
 *   - coord_absurdly_small (info): 0 < |value| < min_nonzero_resolution
 *     (default 0.00001 mm) — float precision blow-up or unit-
 *     conversion underflow.
 *   - angular_unwrapped (warning): |A/B/C| > max_rotary_deg (default
 *     7200° = 20 turns). Most controls accept but operators see
 *     nonsense numbers.
 *   - coord_nan_literal (error): value contains non-numeric token
 *     like "NaN", "inf", "?". Rare but hard to spot.
 *   - coord_extra_decimals (info, opt-in): > max_decimals fractional
 *     digits (default 4 for metric, 5 for imperial). More digits
 *     than the machine resolution just inflates file size.
 *   - coord_leading_zero_only (info): X00 / Y00 etc. — zeros with
 *     no decimal. Legal on Fanucs with decimal-format enabled but a
 *     style smell on mixed-fleet shops.
 *
 * Scope — distinct from:
 *   - PPAxisTravelValidator: needs a per-machine envelope.
 *   - PPDecimalPointValidator: focuses on decimal-point presence.
 *   - PPRapidMoveValidator: rapid-move safety, not value sanity.
 *
 * @module PPCoordinateRangeValidatorEngine
 */

export type CoordSeverity = "error" | "warning" | "info";

export type CoordIssueKind =
  | "coord_absurdly_large"
  | "coord_absurdly_small"
  | "angular_unwrapped"
  | "coord_nan_literal"
  | "coord_extra_decimals"
  | "coord_leading_zero_only";

export interface CoordIssue {
  kind: CoordIssueKind;
  severity: CoordSeverity;
  line: number;
  axis?: string;
  value?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface CoordValidationOptions {
  check_absurd_large?: boolean;
  check_absurd_small?: boolean;
  check_angular_unwrap?: boolean;
  check_nan_literal?: boolean;
  check_extra_decimals?: boolean;
  check_leading_zero_only?: boolean;
  max_linear_range?: number;
  min_nonzero_resolution?: number;
  max_rotary_deg?: number;
  max_decimals?: number;
  linear_axes?: string[];
  rotary_axes?: string[];
}

export interface CoordValidationResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    coord_count: number;
    axes_seen: string[];
    linear_extrema: Record<string, { min: number; max: number }>;
  };
  issues: CoordIssue[];
  total_issues: number;
}

const DEFAULT_LINEAR = ["X", "Y", "Z", "U", "V", "W"];
const DEFAULT_ROTARY = ["A", "B", "C"];

const DEFAULT_OPTIONS: Required<CoordValidationOptions> = {
  check_absurd_large: true,
  check_absurd_small: true,
  check_angular_unwrap: true,
  check_nan_literal: true,
  check_extra_decimals: false,
  check_leading_zero_only: false,
  max_linear_range: 10000,
  min_nonzero_resolution: 0.00001,
  max_rotary_deg: 7200,
  max_decimals: 4,
  linear_axes: DEFAULT_LINEAR,
  rotary_axes: DEFAULT_ROTARY,
};

export class PPCoordinateRangeValidatorEngine {
  validate(
    code: string,
    opts: CoordValidationOptions = {},
  ): CoordValidationResult {
    const options: Required<CoordValidationOptions> = {
      ...DEFAULT_OPTIONS,
      ...opts,
      linear_axes: opts.linear_axes ?? DEFAULT_LINEAR,
      rotary_axes: opts.rotary_axes ?? DEFAULT_ROTARY,
    } as Required<CoordValidationOptions>;
    const issues: CoordIssue[] = [];
    const lines = code.split(/\r?\n/);

    const linearSet = new Set(options.linear_axes.map((a) => a.toUpperCase()));
    const rotarySet = new Set(options.rotary_axes.map((a) => a.toUpperCase()));
    const allAxes = new Set([...linearSet, ...rotarySet]);
    const axesSeen = new Set<string>();
    const linearExtrema: Record<string, { min: number; max: number }> = {};
    let coordCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const cleaned = this.stripComments(lines[i]).trim();
      if (cleaned === "" || cleaned === "%") continue;

      // Also scan for malformed "NaN"/"inf" tokens anywhere on the line
      if (options.check_nan_literal) {
        const nanMatch = cleaned.match(
          /\b([XYZABCUVW])\s*([A-Za-z?]+\w*)/,
        );
        if (nanMatch) {
          const candidate = nanMatch[2];
          if (/^(nan|inf|infinity|\?+)$/i.test(candidate)) {
            issues.push({
              kind: "coord_nan_literal",
              severity: "error",
              line: i + 1,
              axis: nanMatch[1].toUpperCase(),
              message: `Non-numeric coordinate value ${nanMatch[1]}${candidate}`,
            });
          }
        }
      }

      // Token loop for each axis
      const tokenRe = /([A-Z])(-?\d+\.?\d*|-?\.\d+)/g;
      let tm: RegExpExecArray | null;
      while ((tm = tokenRe.exec(cleaned)) !== null) {
        const axis = tm[1];
        if (!allAxes.has(axis)) continue;
        const raw = tm[2];
        const val = parseFloat(raw);
        if (Number.isNaN(val)) continue;

        coordCount++;
        axesSeen.add(axis);

        if (linearSet.has(axis)) {
          const ex = linearExtrema[axis] ?? { min: val, max: val };
          if (val < ex.min) ex.min = val;
          if (val > ex.max) ex.max = val;
          linearExtrema[axis] = ex;
        }

        // Absurdly large (linear)
        if (
          options.check_absurd_large &&
          linearSet.has(axis) &&
          Math.abs(val) > options.max_linear_range
        ) {
          issues.push({
            kind: "coord_absurdly_large",
            severity: "warning",
            line: i + 1,
            axis,
            value: val,
            message: `${axis}${val} exceeds reasonable linear range ±${options.max_linear_range} — unit conversion bug?`,
            details: { max_linear_range: options.max_linear_range },
          });
        }

        // Absurdly small non-zero (linear only)
        if (
          options.check_absurd_small &&
          linearSet.has(axis) &&
          val !== 0 &&
          Math.abs(val) < options.min_nonzero_resolution
        ) {
          issues.push({
            kind: "coord_absurdly_small",
            severity: "info",
            line: i + 1,
            axis,
            value: val,
            message: `${axis}${val} below min resolution ${options.min_nonzero_resolution} — float precision blow-up?`,
          });
        }

        // Angular unwrap
        if (
          options.check_angular_unwrap &&
          rotarySet.has(axis) &&
          Math.abs(val) > options.max_rotary_deg
        ) {
          issues.push({
            kind: "angular_unwrapped",
            severity: "warning",
            line: i + 1,
            axis,
            value: val,
            message: `${axis}${val}° not normalized (> ${options.max_rotary_deg}°)`,
            details: { max_rotary_deg: options.max_rotary_deg },
          });
        }

        // Extra decimals
        if (options.check_extra_decimals) {
          const dotIdx = raw.indexOf(".");
          if (dotIdx !== -1) {
            const fractional = raw.substring(dotIdx + 1);
            if (fractional.length > options.max_decimals) {
              issues.push({
                kind: "coord_extra_decimals",
                severity: "info",
                line: i + 1,
                axis,
                value: val,
                message: `${axis}${raw} has ${fractional.length} fractional digits (limit ${options.max_decimals})`,
              });
            }
          }
        }

        // Leading zero only: X0 / Y0 / etc (no decimal, value 0)
        if (
          options.check_leading_zero_only &&
          val === 0 &&
          !raw.includes(".") &&
          /^-?0+$/.test(raw)
        ) {
          issues.push({
            kind: "coord_leading_zero_only",
            severity: "info",
            line: i + 1,
            axis,
            value: 0,
            message: `${axis}${raw} has no decimal point — style issue on mixed-fleet shops`,
          });
        }
      }
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
        coord_count: coordCount,
        axes_seen: Array.from(axesSeen).sort(),
        linear_extrema: linearExtrema,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    coord_count: number;
    axes: string[];
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      coord_count: r.summary.coord_count,
      axes: r.summary.axes_seen,
    };
  }

  defaultOptions(): Required<CoordValidationOptions> {
    return {
      ...DEFAULT_OPTIONS,
      linear_axes: [...DEFAULT_LINEAR],
      rotary_axes: [...DEFAULT_ROTARY],
    };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppCoordinateRangeValidatorEngine =
  new PPCoordinateRangeValidatorEngine();
