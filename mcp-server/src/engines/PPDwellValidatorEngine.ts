/**
 * PPDwellValidatorEngine — Validate G4 dwell commands
 *
 * G4 forces the machine to pause for a specified time. Dwells are
 * commonly used:
 *   - after a spindle direction change or tool orientation
 *   - at the bottom of a drill cycle (chip breaking)
 *   - to allow coolant to reach the cutting zone before engagement
 *
 * Dwell bugs are the quintessential "works in the sim, breaks on the
 * machine" class — simulators skip dwells, but real controllers honour
 * them to the millisecond. Two bugs dominate:
 *   - G4 with no time argument — some controls error, some skip, some
 *     hang.
 *   - G4 P600 (intent: 0.6 sec, actual: 600 sec = 10 min) — Fanucs
 *     treat P as milliseconds or seconds depending on parameter 3405
 *     bit 1. Post-processors often guess wrong.
 *
 * Checks:
 *   - dwell_without_time (error): G4 on a line with no P or X word.
 *   - dwell_with_motion (error): G4 combined with X/Y/Z motion coords
 *     on the same line — ambiguous (X may be dwell-seconds or coord).
 *   - excessive_dwell_time (warning): dwell > max_dwell_sec (default 60).
 *   - too_short_dwell (warning): dwell < min_dwell_sec (default 0.01).
 *   - negative_dwell_time (error): negative P or X value.
 *
 * Scope — distinct from:
 *   - PPSpindleSpeedSafetyEngine: checks missing_dwell_after_start from
 *     spindle-safety perspective, not dwell correctness.
 *   - PPCannedCycleValidatorEngine: canned-cycle dwells use P-word as
 *     cycle param, not standalone G4.
 *
 * @module PPDwellValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type DwellSeverity = "error" | "warning" | "info";

export interface DwellIssue {
  line_number: number;
  kind:
    | "dwell_without_time"
    | "dwell_with_motion"
    | "excessive_dwell_time"
    | "too_short_dwell"
    | "negative_dwell_time";
  severity: DwellSeverity;
  message: string;
  details?: {
    dwell_sec?: number;
    p_value?: number;
    x_value?: number;
    unit_mode?: "seconds" | "milliseconds";
  };
}

export interface DwellResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: DwellIssue[];
  summary: {
    valid: boolean;
    total_dwells: number;
    total_dwell_time_sec: number;
    longest_dwell_sec: number | null;
    shortest_dwell_sec: number | null;
    p_based_count: number;
    x_based_count: number;
  };
}

export type DwellUnitMode = "seconds" | "milliseconds";

export interface DwellOptions {
  p_unit_mode?: DwellUnitMode;        // default "seconds" (Fanuc param 3405 bit 1 = 0)
  max_dwell_sec?: number;             // default 60 (>1 min is rarely intentional)
  min_dwell_sec?: number;             // default 0.01 (<10ms machine can't honor)
  check_excessive?: boolean;          // default true
  check_too_short?: boolean;          // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPDwellValidatorEngine {
  /**
   * Validate G4 dwell commands in a G-code program.
   */
  validate(gcode: string, options?: DwellOptions): DwellResult {
    const opts = {
      p_unit_mode: options?.p_unit_mode ?? "seconds" as DwellUnitMode,
      max_dwell_sec: options?.max_dwell_sec ?? 60,
      min_dwell_sec: options?.min_dwell_sec ?? 0.01,
      check_excessive: options?.check_excessive ?? true,
      check_too_short: options?.check_too_short ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: DwellIssue[] = [];
    let totalDwells = 0;
    let totalDwellSec = 0;
    let longestDwell: number | null = null;
    let shortestDwell: number | null = null;
    let pBasedCount = 0;
    let xBasedCount = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      if (!/\bG0*4\b/.test(code)) continue;

      totalDwells++;

      const pVal = this.readWord(code, "P");
      const xVal = this.readWord(code, "X");
      const hasMotionCoord = /\b[YZ]-?\d/.test(code) ||
        (xVal !== undefined && /\bG0*[0123]\b/.test(code));

      // dwell_without_time
      if (pVal === undefined && xVal === undefined) {
        issues.push({
          line_number: lineNum,
          kind: "dwell_without_time",
          severity: "error",
          message: `G4 without P or X — no dwell time specified`,
        });
        continue;
      }

      // dwell_with_motion (Y or Z coord on same line)
      if (/\b[YZ]-?\d/.test(code)) {
        issues.push({
          line_number: lineNum,
          kind: "dwell_with_motion",
          severity: "error",
          message: `G4 combined with Y/Z motion coords — ambiguous on most controllers`,
        });
      }

      // Determine dwell magnitude in seconds
      let dwellSec: number | null = null;
      if (pVal !== undefined) {
        pBasedCount++;
        if (pVal < 0) {
          issues.push({
            line_number: lineNum,
            kind: "negative_dwell_time",
            severity: "error",
            message: `G4 P${pVal} — negative dwell time invalid`,
            details: { p_value: pVal },
          });
          continue;
        }
        dwellSec = opts.p_unit_mode === "milliseconds" ? pVal / 1000 : pVal;
      } else if (xVal !== undefined) {
        xBasedCount++;
        if (xVal < 0) {
          issues.push({
            line_number: lineNum,
            kind: "negative_dwell_time",
            severity: "error",
            message: `G4 X${xVal} — negative dwell time invalid`,
            details: { x_value: xVal },
          });
          continue;
        }
        dwellSec = xVal; // X is always seconds on Fanuc/Haas/Okuma
      }

      if (dwellSec === null || dwellSec <= 0) continue;

      totalDwellSec += dwellSec;
      if (longestDwell === null || dwellSec > longestDwell) longestDwell = dwellSec;
      if (shortestDwell === null || dwellSec < shortestDwell) shortestDwell = dwellSec;

      if (opts.check_excessive && dwellSec > opts.max_dwell_sec) {
        issues.push({
          line_number: lineNum,
          kind: "excessive_dwell_time",
          severity: "warning",
          message: `G4 dwell ${dwellSec}s exceeds ${opts.max_dwell_sec}s — possible unit mix-up (ms vs sec)`,
          details: { dwell_sec: dwellSec, unit_mode: opts.p_unit_mode },
        });
      }
      if (opts.check_too_short && dwellSec < opts.min_dwell_sec) {
        issues.push({
          line_number: lineNum,
          kind: "too_short_dwell",
          severity: "warning",
          message: `G4 dwell ${dwellSec}s below ${opts.min_dwell_sec}s — machine may not honor`,
          details: { dwell_sec: dwellSec, unit_mode: opts.p_unit_mode },
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
        total_dwells: totalDwells,
        total_dwell_time_sec: Math.round(totalDwellSec * 1000) / 1000,
        longest_dwell_sec: longestDwell,
        shortest_dwell_sec: shortestDwell,
        p_based_count: pBasedCount,
        x_based_count: xBasedCount,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: DwellOptions,
  ): { valid: boolean; errors: number; warnings: number; total_dwells: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      total_dwells: r.summary.total_dwells,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<DwellOptions> {
    return {
      p_unit_mode: "seconds",
      max_dwell_sec: 60,
      min_dwell_sec: 0.01,
      check_excessive: true,
      check_too_short: true,
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

export const ppDwellValidatorEngine = new PPDwellValidatorEngine();
