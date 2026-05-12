/**
 * PPProbeCycleValidatorEngine — Validate on-machine probing cycles
 *
 * Probing is the inverse of cutting: the machine drives a stylus at
 * feed rate into a surface, reads the skip signal, and records the
 * touch position. Mistakes here don't scrap parts — they snap the
 * probe, which costs $3,000-$8,000 and loses a day of production.
 *
 * This engine validates the Renishaw Inspection Plus convention
 * (most common on Fanuc/Haas/Mazak) which uses G65 P981x macros:
 *
 *   G65 P9810 — protected positioning move (rapid to safe point)
 *   G65 P9811 — single-surface measure (X/Y/Z touch)
 *   G65 P9812 — web/pocket measure
 *   G65 P9814 — bore/boss measure
 *   G65 P9815 — internal/external corner
 *   G65 P9820 — feed/rotate to angle
 *   G65 P9823 — three-point bore fit
 *   G65 P9832 — tool setter (length)
 *   G65 P9833 — tool setter (diameter)
 *   G31  — direct skip (raw probe move; used internally by the macros
 *          and occasionally by hand-written routines)
 *
 * Failure modes this validator catches:
 *   - probe_without_protected_move (error): P9811+ (measurement cycle)
 *     issued without a prior P9810 in the same op. Operator relies on
 *     the protected-move macro to avoid crashing the stylus on a ramp.
 *   - probe_with_spindle_on (error): any P981x or G31 issued while
 *     M3/M4 active — probe stylus spins, probe broken.
 *   - probe_with_tlc_off (error): probe cycle with no G43 active.
 *     Probe tip Z is wrong by stickout; probes into table.
 *   - probe_feed_too_fast (warning): G31 with F > max_probe_feed
 *     (default 500 mm/min, Renishaw spec 100-300). Probe over-travels
 *     before skip signal catches.
 *   - probe_missing_required_arg (error): P9811 without X/Y/Z target;
 *     P9814 without D (diameter); P9823 without D.
 *   - probe_with_cutter_comp (error): G41/G42 active during probing.
 *     Comp adds offsets to the probe path; measurement is wrong.
 *
 * Scope — distinct from:
 *   - PPCannedCycleValidatorEngine: drilling G81-G89. Probing is a
 *     macro-call pattern, not a canned cycle.
 *   - MetrologyEngine family: uncertainty budgets, not syntax.
 *   - PPToolLengthCompValidatorEngine: G43 presence. We reuse that
 *     concept but own the probe-specific cross-flag.
 *
 * @module PPProbeCycleValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ProbeSeverity = "error" | "warning" | "info";

export interface ProbeIssue {
  line_number: number;
  kind:
    | "probe_without_protected_move"
    | "probe_with_spindle_on"
    | "probe_with_tlc_off"
    | "probe_feed_too_fast"
    | "probe_missing_required_arg"
    | "probe_with_cutter_comp";
  severity: ProbeSeverity;
  message: string;
  details?: {
    macro?: string;          // "P9810", "P9811", ...
    feed?: number;
    max_feed?: number;
    missing_args?: string[];
    cutter_comp?: "G41" | "G42";
  };
}

export interface ProbeResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ProbeIssue[];
  summary: {
    valid: boolean;
    protected_move_count: number;        // P9810
    measurement_count: number;           // P9811/P9812/P9814/P9815/P9823
    g31_count: number;
    tool_setter_count: number;           // P9832/P9833
    macros_seen: string[];
  };
}

export interface ProbeOptions {
  max_probe_feed?: number;                  // default 500 mm/min
  require_protected_move?: boolean;         // default true
  check_spindle_off?: boolean;              // default true
  check_tlc_active?: boolean;               // default true
  check_feed_limit?: boolean;               // default true
  check_required_args?: boolean;            // default true
  check_cutter_comp_off?: boolean;          // default true
}

const MEASUREMENT_MACROS = new Set([
  "P9811", "P9812", "P9814", "P9815", "P9820", "P9823",
]);
const TOOL_SETTER_MACROS = new Set(["P9832", "P9833"]);

// ── Engine ────────────────────────────────────────────────────────────

export class PPProbeCycleValidatorEngine {
  /**
   * Validate probing-cycle usage.
   */
  validate(gcode: string, options?: ProbeOptions): ProbeResult {
    const opts = {
      max_probe_feed: options?.max_probe_feed ?? 500,
      require_protected_move: options?.require_protected_move ?? true,
      check_spindle_off: options?.check_spindle_off ?? true,
      check_tlc_active: options?.check_tlc_active ?? true,
      check_feed_limit: options?.check_feed_limit ?? true,
      check_required_args: options?.check_required_args ?? true,
      check_cutter_comp_off: options?.check_cutter_comp_off ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: ProbeIssue[] = [];

    let protectedMoveCount = 0;
    let measurementCount = 0;
    let g31Count = 0;
    let toolSetterCount = 0;
    const macrosSeen = new Set<string>();

    // Modal state
    let spindleOn = false;
    let tlcActive = false;
    let cutterComp: "G41" | "G42" | null = null;
    let sawProtectedMoveRecently = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Modal updates
      if (/\bM0*3\b/.test(code) || /\bM0*4\b/.test(code)) spindleOn = true;
      if (/\bM0*5\b/.test(code)) spindleOn = false;
      if (/\bG0*43(?!\d)/.test(code) || /\bG0*44(?!\d)/.test(code)) tlcActive = true;
      if (/\bG0*49(?!\d)/.test(code)) tlcActive = false;
      if (/\bG0*41\b/.test(code)) cutterComp = "G41";
      if (/\bG0*42\b/.test(code)) cutterComp = "G42";
      if (/\bG0*40\b/.test(code)) cutterComp = null;

      // Extract macro token (G65 P981x)
      const macroMatch = code.match(/\bG65\s+.*?\bP(981\d|9832|9833)\b/);
      const hasG31 = /\bG0*31\b/.test(code);

      if (!macroMatch && !hasG31) continue;

      const macroLabel = macroMatch ? `P${macroMatch[1]}` : "G31";
      macrosSeen.add(macroLabel);

      // Classify
      if (macroLabel === "P9810") {
        protectedMoveCount++;
        sawProtectedMoveRecently = true;
        continue; // protected-move has no safety/feed/arg checks here
      }
      if (MEASUREMENT_MACROS.has(macroLabel)) {
        measurementCount++;
      } else if (TOOL_SETTER_MACROS.has(macroLabel)) {
        toolSetterCount++;
      }
      if (hasG31) g31Count++;

      // probe_without_protected_move (only for measurement cycles, not tool-setter)
      if (
        opts.require_protected_move &&
        MEASUREMENT_MACROS.has(macroLabel) &&
        !sawProtectedMoveRecently
      ) {
        issues.push({
          line_number: lineNum,
          kind: "probe_without_protected_move",
          severity: "error",
          message: `${macroLabel} measurement cycle without preceding P9810 protected move — probe may crash into ramp or fixture`,
          details: { macro: macroLabel },
        });
      }

      // probe_with_spindle_on
      if (opts.check_spindle_off && spindleOn) {
        issues.push({
          line_number: lineNum,
          kind: "probe_with_spindle_on",
          severity: "error",
          message: `${macroLabel} with spindle still on (M3/M4) — probe stylus will spin and shatter`,
          details: { macro: macroLabel },
        });
      }

      // probe_with_tlc_off (not for G31 raw — sometimes used pre-TLC)
      if (
        opts.check_tlc_active &&
        !tlcActive &&
        (MEASUREMENT_MACROS.has(macroLabel) || TOOL_SETTER_MACROS.has(macroLabel))
      ) {
        issues.push({
          line_number: lineNum,
          kind: "probe_with_tlc_off",
          severity: "error",
          message: `${macroLabel} with no G43 tool length comp active — probe Z off by stylus stickout; probes into table`,
          details: { macro: macroLabel },
        });
      }

      // probe_feed_too_fast
      if (opts.check_feed_limit) {
        const fMatch = code.match(/\bF(\d+(?:\.\d+)?)/);
        if (fMatch) {
          const feed = parseFloat(fMatch[1]);
          if (feed > opts.max_probe_feed) {
            issues.push({
              line_number: lineNum,
              kind: "probe_feed_too_fast",
              severity: "warning",
              message: `${macroLabel} feed ${feed} > max ${opts.max_probe_feed} mm/min — probe may over-travel past skip signal`,
              details: { macro: macroLabel, feed, max_feed: opts.max_probe_feed },
            });
          }
        }
      }

      // probe_missing_required_arg
      if (opts.check_required_args && macroMatch) {
        const missing = this.missingRequiredArgs(macroLabel, code);
        if (missing.length > 0) {
          issues.push({
            line_number: lineNum,
            kind: "probe_missing_required_arg",
            severity: "error",
            message: `${macroLabel} missing required arg(s): ${missing.join(", ")}`,
            details: { macro: macroLabel, missing_args: missing },
          });
        }
      }

      // probe_with_cutter_comp
      if (opts.check_cutter_comp_off && cutterComp !== null) {
        issues.push({
          line_number: lineNum,
          kind: "probe_with_cutter_comp",
          severity: "error",
          message: `${macroLabel} with ${cutterComp} cutter comp active — comp offsets corrupt probe path`,
          details: { macro: macroLabel, cutter_comp: cutterComp },
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
        protected_move_count: protectedMoveCount,
        measurement_count: measurementCount,
        g31_count: g31Count,
        tool_setter_count: toolSetterCount,
        macros_seen: Array.from(macrosSeen).sort(),
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: ProbeOptions,
  ): { valid: boolean; errors: number; measurement_count: number; tool_setter_count: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      measurement_count: r.summary.measurement_count,
      tool_setter_count: r.summary.tool_setter_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<ProbeOptions> {
    return {
      max_probe_feed: 500,
      require_protected_move: true,
      check_spindle_off: true,
      check_tlc_active: true,
      check_feed_limit: true,
      check_required_args: true,
      check_cutter_comp_off: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private missingRequiredArgs(macro: string, code: string): string[] {
    const missing: string[] = [];
    const has = (letter: string) =>
      new RegExp(`\\b${letter}-?\\d`).test(code);

    switch (macro) {
      case "P9811":
        // single-surface: needs at least one of X/Y/Z
        if (!has("X") && !has("Y") && !has("Z")) missing.push("X|Y|Z");
        break;
      case "P9812":
        // web/pocket: needs X or Y plus R (search distance)
        if (!has("X") && !has("Y")) missing.push("X|Y");
        if (!has("R")) missing.push("R");
        break;
      case "P9814":
        // bore/boss: needs D (diameter)
        if (!has("D")) missing.push("D");
        break;
      case "P9815":
        // corner: needs X and Y
        if (!has("X")) missing.push("X");
        if (!has("Y")) missing.push("Y");
        break;
      case "P9823":
        // 3-point bore: needs D
        if (!has("D")) missing.push("D");
        break;
      default:
        break;
    }
    return missing;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppProbeCycleValidatorEngine = new PPProbeCycleValidatorEngine();
