/**
 * PPUnitsModeValidatorEngine — Validate G20/G21 units mode
 *
 * G20 = inch, G21 = millimeter. The units mode is persistent across
 * power cycles on most controls but the last state won't match what the
 * post expected, so programs must set their own mode at the start.
 *
 * Checks:
 *   - missing_initial_units (error): program has motion without G20 or
 *     G21 set first. Controller uses prior program's mode → wrong scale.
 *   - mid_program_unit_switch (error): G20/G21 appears after motion
 *     started. Almost never valid — offsets don't re-scale, so tool
 *     path collapses to the wrong size.
 *   - implausible_inch_values (warning): G20 mode with coordinates
 *     that look like mm (e.g., X100., X50.) — inch parts rarely have
 *     single coords over 20". Often a forgotten G21.
 *   - implausible_mm_values (warning): G21 mode with coordinates that
 *     look like inches (e.g., X0.5, X2.125) — mm parts rarely have
 *     coords under 5mm for a full program. Same bug, reverse.
 *   - feed_scale_suspicious (warning): F-word > typical inch-mode feeds
 *     in G20 (F > 100 ipm rarely valid), or F < typical mm-mode feeds
 *     in G21 (F < 10 mm/min rarely valid outside tapping).
 *
 * Scope — distinct from:
 *   - PPModalStateTrackerEngine: tracks G20/G21 but doesn't judge usage.
 *   - PPFeedSpeedScalerEngine: scales F/S values between unit systems.
 *
 * @module PPUnitsModeValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type UnitsMode = "G20" | "G21" | null;

export type UnitsSeverity = "error" | "warning" | "info";

export interface UnitsIssue {
  line_number: number;
  kind:
    | "missing_initial_units"
    | "mid_program_unit_switch"
    | "implausible_inch_values"
    | "implausible_mm_values"
    | "feed_scale_suspicious";
  severity: UnitsSeverity;
  message: string;
  details?: {
    units?: UnitsMode;
    previous_units?: UnitsMode;
    value?: number;
    axis?: string;
  };
}

export interface UnitsModeResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: UnitsIssue[];
  summary: {
    valid: boolean;
    initial_units: UnitsMode;
    final_units: UnitsMode;
    g20_count: number;
    g21_count: number;
    max_coord_abs: number;
    min_nonzero_coord_abs: number | null;
    peak_feed: number | null;
  };
}

export interface UnitsModeOptions {
  check_plausibility?: boolean;            // default true
  check_feed_scale?: boolean;              // default true
  inch_coord_max_plausible?: number;       // default 25 (> 25" is unusual)
  mm_coord_min_plausible?: number;         // default 3 (< 3mm for ALL coords is unusual)
  inch_feed_max_plausible?: number;        // default 150 (150 ipm is very fast)
  mm_feed_min_plausible?: number;          // default 5 (5 mm/min is tapping-slow)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPUnitsModeValidatorEngine {
  /**
   * Validate units mode in a G-code program.
   */
  validate(
    gcode: string,
    options?: UnitsModeOptions,
  ): UnitsModeResult {
    const opts = {
      check_plausibility: options?.check_plausibility ?? true,
      check_feed_scale: options?.check_feed_scale ?? true,
      inch_coord_max_plausible: options?.inch_coord_max_plausible ?? 25,
      mm_coord_min_plausible: options?.mm_coord_min_plausible ?? 3,
      inch_feed_max_plausible: options?.inch_feed_max_plausible ?? 150,
      mm_feed_min_plausible: options?.mm_feed_min_plausible ?? 5,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: UnitsIssue[] = [];

    let activeUnits: UnitsMode = null;
    let initialUnits: UnitsMode = null;
    let g20Count = 0;
    let g21Count = 0;
    let firstMotionLine: number | null = null;
    let maxCoordAbs = 0;
    let minNonzeroCoordAbs: number | null = null;
    let peakFeed: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const hasG20 = /\bG0*20\b/.test(code);
      const hasG21 = /\bG0*21\b/.test(code);

      if (hasG20) {
        g20Count++;
        if (initialUnits === null) initialUnits = "G20";
        if (firstMotionLine !== null && activeUnits !== "G20") {
          issues.push({
            line_number: lineNum,
            kind: "mid_program_unit_switch",
            severity: "error",
            message: `G20 (inch) after motion started — offsets do not re-scale, toolpath corrupted`,
            details: { units: "G20", previous_units: activeUnits },
          });
        }
        activeUnits = "G20";
      }
      if (hasG21) {
        g21Count++;
        if (initialUnits === null) initialUnits = "G21";
        if (firstMotionLine !== null && activeUnits !== "G21") {
          issues.push({
            line_number: lineNum,
            kind: "mid_program_unit_switch",
            severity: "error",
            message: `G21 (mm) after motion started — offsets do not re-scale, toolpath corrupted`,
            details: { units: "G21", previous_units: activeUnits },
          });
        }
        activeUnits = "G21";
      }

      // Detect motion line with coords
      const hasMotion = /\bG0*[0123]\b/.test(code) && /[XYZIJKR]-?\d/.test(code);
      if (hasMotion && firstMotionLine === null) {
        firstMotionLine = lineNum;
      }

      // Collect coordinate magnitudes
      const coordWords = ["X", "Y", "Z"];
      for (const letter of coordWords) {
        const val = this.readWord(code, letter);
        if (val !== undefined) {
          const absV = Math.abs(val);
          if (absV > maxCoordAbs) maxCoordAbs = absV;
          if (absV > 0 && (minNonzeroCoordAbs === null || absV < minNonzeroCoordAbs)) {
            minNonzeroCoordAbs = absV;
          }
        }
      }

      // Collect feed magnitude
      const fVal = this.readWord(code, "F");
      if (fVal !== undefined && fVal > 0) {
        if (peakFeed === null || fVal > peakFeed) peakFeed = fVal;
      }
    }

    // missing_initial_units
    if (firstMotionLine !== null && initialUnits === null) {
      issues.push({
        line_number: firstMotionLine,
        kind: "missing_initial_units",
        severity: "error",
        message: `Motion begins without G20 or G21 — controller uses prior units`,
      });
    }

    // Plausibility — applied post-loop against max coord & peak feed
    if (opts.check_plausibility && activeUnits !== null) {
      if (activeUnits === "G20" && maxCoordAbs > opts.inch_coord_max_plausible) {
        issues.push({
          line_number: firstMotionLine ?? 1,
          kind: "implausible_inch_values",
          severity: "warning",
          message: `G20 (inch) with coord magnitude ${maxCoordAbs.toFixed(1)} > ${opts.inch_coord_max_plausible}" — forgotten G21?`,
          details: { units: "G20", value: maxCoordAbs },
        });
      }
      if (
        activeUnits === "G21" &&
        maxCoordAbs > 0 &&
        maxCoordAbs < opts.mm_coord_min_plausible
      ) {
        issues.push({
          line_number: firstMotionLine ?? 1,
          kind: "implausible_mm_values",
          severity: "warning",
          message: `G21 (mm) with max coord ${maxCoordAbs.toFixed(3)}mm < ${opts.mm_coord_min_plausible}mm — forgotten G20?`,
          details: { units: "G21", value: maxCoordAbs },
        });
      }
    }

    if (opts.check_feed_scale && peakFeed !== null && activeUnits !== null) {
      if (activeUnits === "G20" && peakFeed > opts.inch_feed_max_plausible) {
        issues.push({
          line_number: firstMotionLine ?? 1,
          kind: "feed_scale_suspicious",
          severity: "warning",
          message: `G20 (inch) with feed F${peakFeed} > ${opts.inch_feed_max_plausible} ipm — possibly mm/min feed in inch mode`,
          details: { units: "G20", value: peakFeed },
        });
      }
      if (activeUnits === "G21" && peakFeed < opts.mm_feed_min_plausible) {
        issues.push({
          line_number: firstMotionLine ?? 1,
          kind: "feed_scale_suspicious",
          severity: "warning",
          message: `G21 (mm) with peak feed F${peakFeed} < ${opts.mm_feed_min_plausible} mm/min — possibly ipm feed in mm mode`,
          details: { units: "G21", value: peakFeed },
        });
      }
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const info = issues.filter(i => i.severity === "info").length;

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        initial_units: initialUnits,
        final_units: activeUnits,
        g20_count: g20Count,
        g21_count: g21Count,
        max_coord_abs: maxCoordAbs,
        min_nonzero_coord_abs: minNonzeroCoordAbs,
        peak_feed: peakFeed,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: UnitsModeOptions,
  ): { valid: boolean; errors: number; warnings: number; units: UnitsMode } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      units: r.summary.initial_units,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<UnitsModeOptions> {
    return {
      check_plausibility: true,
      check_feed_scale: true,
      inch_coord_max_plausible: 25,
      mm_coord_min_plausible: 3,
      inch_feed_max_plausible: 150,
      mm_feed_min_plausible: 5,
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

export const ppUnitsModeValidatorEngine = new PPUnitsModeValidatorEngine();
