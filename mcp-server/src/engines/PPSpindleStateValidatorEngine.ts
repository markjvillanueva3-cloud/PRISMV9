/**
 * PPSpindleStateValidatorEngine — Validate spindle state vs cutting motion
 *
 * Spindle errors are catastrophic:
 *   - G1 cut with M5 (spindle off): the cutter gets dragged through the
 *     workpiece with no rotation — tool snaps or gouges a channel.
 *   - M3 without S word ever set: spindle commanded to zero RPM; cut
 *     stalls and burns the endmill.
 *   - M3 then M4 (direction reversal) without M5 between: most controls
 *     error out, but some accept it and reverse rotation under load.
 *   - M6 tool change while spindle running: operator-injury risk and
 *     turret damage on lathes; mills may refuse tool change but some
 *     controls do not enforce it.
 *   - Program end (M30) without M5: next operator starts job with
 *     spindle left running from prior program — rare but happens on
 *     auto-cycle re-runs.
 *
 * Checks:
 *   - cut_with_spindle_off (error): G1/G2/G3 motion with M5 or initial
 *     state never turned on.
 *   - spindle_on_without_s (warning): M3/M4 before any S word — spindle
 *     commanded with no RPM; some controls use last S, some use zero.
 *   - direction_reversal (error): M3→M4 or M4→M3 with no M5 between.
 *   - tool_change_spindle_on (error): M6 while spindle is commanded on.
 *   - end_without_stop (info): M30 or M2 without preceding M5.
 *   - missing_initial_spindle (warning): first cutting motion with no
 *     spindle command anywhere above it.
 *
 * Scope — distinct from:
 *   - PPRapidMoveValidatorEngine: G0 rapid with spindle off (different
 *     risk — not cut, just positioning, but still flagged).
 *   - PPToolChangeValidatorEngine: tool-change sequence, retract height,
 *     T before M6, etc. — may share `tool_change_spindle_on` conceptually
 *     but this engine owns the spindle-side enforcement.
 *   - PPFeedOverrideValidatorEngine: F-word semantics, not spindle.
 *
 * @module PPSpindleStateValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type SpindleSeverity = "error" | "warning" | "info";

export interface SpindleIssue {
  line_number: number;
  kind:
    | "cut_with_spindle_off"
    | "spindle_on_without_s"
    | "direction_reversal"
    | "tool_change_spindle_on"
    | "end_without_stop"
    | "missing_initial_spindle";
  severity: SpindleSeverity;
  message: string;
  details?: {
    from_direction?: "M3" | "M4";
    to_direction?: "M3" | "M4";
    g_motion?: number;
    s_last?: number;
  };
}

export interface SpindleResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: SpindleIssue[];
  summary: {
    valid: boolean;
    m3_count: number;             // CW spindle on
    m4_count: number;             // CCW spindle on
    m5_count: number;             // spindle off
    m6_count: number;             // tool change
    last_s_word: number | null;
    reversals: number;            // M3↔M4 transitions without M5
  };
}

export interface SpindleOptions {
  check_cut_off?: boolean;              // default true
  check_spindle_on_without_s?: boolean; // default true
  check_reversal?: boolean;             // default true
  check_tool_change?: boolean;          // default true
  check_end_without_stop?: boolean;     // default false (info only)
  check_missing_initial?: boolean;      // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPSpindleStateValidatorEngine {
  /**
   * Validate spindle state transitions and cut-with-spindle-off risks.
   */
  validate(gcode: string, options?: SpindleOptions): SpindleResult {
    const opts = {
      check_cut_off: options?.check_cut_off ?? true,
      check_spindle_on_without_s: options?.check_spindle_on_without_s ?? true,
      check_reversal: options?.check_reversal ?? true,
      check_tool_change: options?.check_tool_change ?? true,
      check_end_without_stop: options?.check_end_without_stop ?? false,
      check_missing_initial: options?.check_missing_initial ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: SpindleIssue[] = [];

    let m3Count = 0;
    let m4Count = 0;
    let m5Count = 0;
    let m6Count = 0;
    let reversals = 0;

    // Spindle state machine
    type State = "off" | "M3" | "M4";
    let state: State = "off";
    let lastSWord: number | null = null;
    let sawAnySpindleOn = false;
    let firstCuttingLineFlagged = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Capture S word
      const sMatch = code.match(/\bS(\d+(?:\.\d+)?)/);
      if (sMatch) {
        lastSWord = parseFloat(sMatch[1]);
      }

      const hasM3 = /\bM0*3\b/.test(code);
      const hasM4 = /\bM0*4\b/.test(code);
      const hasM5 = /\bM0*5\b/.test(code);
      const hasM6 = /\bM0*6\b/.test(code);
      const hasM30 = /\bM0*30\b/.test(code);
      const hasM2 = /(?<!\d)M0*2(?!\d)/.test(code);

      // Detect direction reversal BEFORE updating state
      if (opts.check_reversal && (hasM3 || hasM4)) {
        const newDir: "M3" | "M4" = hasM3 ? "M3" : "M4";
        if ((state === "M3" || state === "M4") && state !== newDir) {
          reversals++;
          issues.push({
            line_number: lineNum,
            kind: "direction_reversal",
            severity: "error",
            message: `Direction reversal ${state}→${newDir} without M5 between — most controls reject, some reverse under load`,
            details: { from_direction: state, to_direction: newDir },
          });
        }
      }

      // Spindle on (M3 or M4)
      if (hasM3 || hasM4) {
        if (hasM3) m3Count++;
        if (hasM4) m4Count++;
        sawAnySpindleOn = true;

        if (opts.check_spindle_on_without_s && lastSWord === null) {
          issues.push({
            line_number: lineNum,
            kind: "spindle_on_without_s",
            severity: "warning",
            message: `${hasM3 ? "M3" : "M4"} commanded with no S word set — spindle RPM undefined`,
          });
        }

        state = hasM3 ? "M3" : "M4";
      }

      // Spindle off
      if (hasM5) {
        m5Count++;
        state = "off";
      }

      // Tool change
      if (hasM6) {
        m6Count++;
        if (opts.check_tool_change && state !== "off") {
          issues.push({
            line_number: lineNum,
            kind: "tool_change_spindle_on",
            severity: "error",
            message: `M6 tool change while spindle on (${state}) — must M5 first`,
          });
        }
      }

      // Cutting motion with spindle off
      const cutMatch = code.match(/\bG0*([123])\b/);
      if (cutMatch && cutMatch[1] !== "0") {
        const gNum = parseInt(cutMatch[1], 10);
        if (opts.check_cut_off && state === "off") {
          issues.push({
            line_number: lineNum,
            kind: "cut_with_spindle_off",
            severity: "error",
            message: `G${gNum} cutting motion while spindle off (M5 active or never started) — tool will break`,
            details: { g_motion: gNum, s_last: lastSWord ?? undefined },
          });
        }
        // Missing initial spindle: first cutting line with no prior spindle-on
        if (
          opts.check_missing_initial &&
          !sawAnySpindleOn &&
          !firstCuttingLineFlagged
        ) {
          firstCuttingLineFlagged = true;
          // Only add if we didn't already flag via cut_with_spindle_off
          const alreadyFlagged = issues.some(
            (i) => i.line_number === lineNum && i.kind === "cut_with_spindle_off",
          );
          if (!alreadyFlagged) {
            issues.push({
              line_number: lineNum,
              kind: "missing_initial_spindle",
              severity: "warning",
              message: `First cutting motion G${gNum} with no spindle command earlier in program`,
              details: { g_motion: gNum },
            });
          }
        }
      }

      // Program end without stop
      if ((hasM30 || hasM2) && state !== "off") {
        if (opts.check_end_without_stop) {
          issues.push({
            line_number: lineNum,
            kind: "end_without_stop",
            severity: "info",
            message: `Program end (${hasM30 ? "M30" : "M2"}) with spindle still on — operator may auto-cycle into next job with spindle running`,
          });
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
        m3_count: m3Count,
        m4_count: m4Count,
        m5_count: m5Count,
        m6_count: m6Count,
        last_s_word: lastSWord,
        reversals,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: SpindleOptions,
  ): { valid: boolean; errors: number; reversals: number; m3_count: number; m4_count: number; m5_count: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      reversals: r.summary.reversals,
      m3_count: r.summary.m3_count,
      m4_count: r.summary.m4_count,
      m5_count: r.summary.m5_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<SpindleOptions> {
    return {
      check_cut_off: true,
      check_spindle_on_without_s: true,
      check_reversal: true,
      check_tool_change: true,
      check_end_without_stop: false,
      check_missing_initial: true,
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

export const ppSpindleStateValidatorEngine = new PPSpindleStateValidatorEngine();
