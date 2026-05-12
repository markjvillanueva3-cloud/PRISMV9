/**
 * PPToolLengthCompValidatorEngine — Validate G43/G44/G49 tool length compensation
 *
 * Tool length compensation (TLC) is the offset applied between the
 * spindle gauge line and the tool tip so Z coordinates program the
 * tip position rather than the spindle face. Getting it wrong means
 * plunging the wrong distance:
 *
 *   - G43 Hn: positive (additive) TLC using offset register `n`.
 *     Modern default for CAT/BT mill spindles.
 *   - G44 Hn: negative (subtractive) TLC. Rarely used; some controls
 *     deprecated it.
 *   - G49: cancel TLC. Spindle-tip distance goes to zero offset.
 *
 * Failure modes this validator catches:
 *   - G43 with no H word → controller uses H0 or last H; H0 means zero
 *     offset, tool plunges to commanded Z with spindle-face distance
 *     of zero → hits part by tool-stickout amount.
 *   - G43 H word mismatches T word → programmer used wrong offset (T5
 *     with H3). On Fanuc Hn is independent of Tn; easy to desync.
 *   - Motion with no TLC ever active (no G43/G44 seen) → tool Z is
 *     spindle-face Z, not tip Z. Part gets gouged by tool stickout.
 *   - G49 followed by Z-motion into part → cancel + plunge = crash.
 *   - Multiple G43 without G49 → OK on most controls (H replaces) but
 *     worth surfacing.
 *   - Tool change M6 without a following G43 → new tool has no TLC.
 *
 * Checks:
 *   - g43_missing_h (error): G43/G44 with no H word
 *   - h_t_mismatch (warning): H number differs from T number
 *   - motion_without_tlc (error): Z-motion before any G43/G44
 *   - g49_then_z_motion (error): G49 then Z-cut within same op
 *   - tool_change_without_g43 (warning): M6 not followed by G43 before Z-motion
 *
 * Scope — distinct from:
 *   - PPToolChangeValidatorEngine: T/M6 sequence, turret, retract — not
 *     length-compensation semantics.
 *   - PPRapidMoveValidatorEngine: rapid_missing_tool_length flag is a
 *     lightweight hint; this engine does the full scan with H/T tracking.
 *
 * @module PPToolLengthCompValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type TLCSeverity = "error" | "warning" | "info";

export interface TLCIssue {
  line_number: number;
  kind:
    | "g43_missing_h"
    | "h_t_mismatch"
    | "motion_without_tlc"
    | "g49_then_z_motion"
    | "tool_change_without_g43";
  severity: TLCSeverity;
  message: string;
  details?: {
    t_word?: number;
    h_word?: number;
    g_code?: "G43" | "G44" | "G49";
  };
}

export interface TLCResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: TLCIssue[];
  summary: {
    valid: boolean;
    g43_count: number;
    g44_count: number;
    g49_count: number;
    tool_changes: number;
    last_active_h: number | null;
    last_active_t: number | null;
  };
}

export interface TLCOptions {
  check_missing_h?: boolean;           // default true
  check_h_t_mismatch?: boolean;        // default true
  check_motion_without_tlc?: boolean;  // default true
  check_g49_plunge?: boolean;          // default true
  check_tool_change_g43?: boolean;     // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPToolLengthCompValidatorEngine {
  /**
   * Validate G43/G44/G49 usage.
   */
  validate(gcode: string, options?: TLCOptions): TLCResult {
    const opts = {
      check_missing_h: options?.check_missing_h ?? true,
      check_h_t_mismatch: options?.check_h_t_mismatch ?? true,
      check_motion_without_tlc: options?.check_motion_without_tlc ?? true,
      check_g49_plunge: options?.check_g49_plunge ?? true,
      check_tool_change_g43: options?.check_tool_change_g43 ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: TLCIssue[] = [];

    let g43Count = 0;
    let g44Count = 0;
    let g49Count = 0;
    let toolChanges = 0;

    let lastH: number | null = null;
    let lastT: number | null = null;
    let tlcActive = false;                  // true after G43/G44 until G49
    let recentlyCancelled = false;          // true for N lines after G49
    let awaitingG43AfterM6 = false;         // true after M6 until G43 or Z-motion
    let sawAnyTLC = false;
    let firstZMotionLine: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const tMatch = code.match(/\bT(\d+)/);
      if (tMatch) lastT = parseInt(tMatch[1], 10);

      const hMatch = code.match(/\bH(\d+)/);
      if (hMatch) lastH = parseInt(hMatch[1], 10);

      const hasG43 = /\bG0*43(?!\d)/.test(code);
      const hasG44 = /\bG0*44(?!\d)/.test(code);
      const hasG49 = /\bG0*49(?!\d)/.test(code);
      const hasM6 = /\bM0*6\b/.test(code);
      const hasZ = /\bZ-?\d/.test(code);
      const hasCutMotion = /\bG0*[123]\b/.test(code);

      // G43 / G44 handling
      if (hasG43 || hasG44) {
        if (hasG43) g43Count++;
        if (hasG44) g44Count++;
        tlcActive = true;
        recentlyCancelled = false;
        sawAnyTLC = true;
        awaitingG43AfterM6 = false;

        if (opts.check_missing_h && !hMatch) {
          issues.push({
            line_number: lineNum,
            kind: "g43_missing_h",
            severity: "error",
            message: `${hasG43 ? "G43" : "G44"} without H word — controller uses H0 or last H; likely crash`,
            details: { g_code: hasG43 ? "G43" : "G44" },
          });
        } else if (opts.check_h_t_mismatch && hMatch && lastT !== null) {
          const hNum = parseInt(hMatch[1], 10);
          if (hNum !== lastT) {
            issues.push({
              line_number: lineNum,
              kind: "h_t_mismatch",
              severity: "warning",
              message: `H${hNum} does not match T${lastT} — programmer likely meant H${lastT}`,
              details: { t_word: lastT, h_word: hNum },
            });
          }
        }
      }

      // G49 handling
      if (hasG49) {
        g49Count++;
        tlcActive = false;
        recentlyCancelled = true;
      }

      // M6 handling
      if (hasM6) {
        toolChanges++;
        awaitingG43AfterM6 = true;
      }

      // Z-motion validations
      if (hasZ && hasCutMotion) {
        if (firstZMotionLine === null) firstZMotionLine = lineNum;

        if (opts.check_g49_plunge && recentlyCancelled) {
          issues.push({
            line_number: lineNum,
            kind: "g49_then_z_motion",
            severity: "error",
            message: `Z cutting motion after G49 (TLC cancelled) — offsets gone, tool crashes`,
          });
        }

        if (opts.check_motion_without_tlc && !sawAnyTLC) {
          issues.push({
            line_number: lineNum,
            kind: "motion_without_tlc",
            severity: "error",
            message: `Z cutting motion with no G43/G44 ever active — tool Z is spindle-face, will plunge by tool stickout`,
          });
        }

        if (opts.check_tool_change_g43 && awaitingG43AfterM6) {
          issues.push({
            line_number: lineNum,
            kind: "tool_change_without_g43",
            severity: "warning",
            message: `Z cutting motion after M6 tool change with no G43 applied — new tool has no length offset`,
          });
          awaitingG43AfterM6 = false; // flag once per tool change
        }
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
        g43_count: g43Count,
        g44_count: g44Count,
        g49_count: g49Count,
        tool_changes: toolChanges,
        last_active_h: lastH,
        last_active_t: lastT,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: TLCOptions,
  ): { valid: boolean; errors: number; g43_count: number; tool_changes: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      g43_count: r.summary.g43_count,
      tool_changes: r.summary.tool_changes,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<TLCOptions> {
    return {
      check_missing_h: true,
      check_h_t_mismatch: true,
      check_motion_without_tlc: true,
      check_g49_plunge: true,
      check_tool_change_g43: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppToolLengthCompValidatorEngine = new PPToolLengthCompValidatorEngine();
