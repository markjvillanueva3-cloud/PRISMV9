/**
 * PPToolNumberRangeValidatorEngine — Validate T-word numbering
 *
 * The T-word selects a tool pocket (on a mill ATC) or a tool-offset
 * number (on a lathe). Magazine capacity varies by machine:
 *
 *   - Haas Mini-Mill:        10 pockets
 *   - Haas VF series:        20–40 pockets
 *   - Mori NHX HMC:          60 pockets
 *   - Okuma Multus turn-mill: typically 48 lower + 16 upper
 *
 * A T-word outside the installed magazine either fetches air, fetches
 * the wrong tool (if a previous program wrapped the index), or alarms.
 * `T0` is a special case — on some controls it means "no tool", on
 * others it's an invalid pocket and alarms.
 *
 * This engine does NOT judge tool-change *sequence* (see
 * `PPToolChangeValidatorEngine`) or geometry — just the *number* on
 * the T-word.
 *
 * Checks:
 *   - `tool_zero`             (error): T0 rejected by default — most
 *                                       mills treat it as an alarm.
 *                                       Can be relaxed via options.
 *   - `tool_out_of_range`     (error): T > max_tool.
 *   - `tool_negative`         (error): negative T value.
 *   - `tool_without_m6`       (warning): T call with no M6 inside the
 *                                         lookahead window.
 *   - `consecutive_t_no_m6`   (warning): T<a> then T<b> with no
 *                                         intervening M6 — the second
 *                                         overwrites the first.
 *   - `duplicate_load`        (info): T<n> M6 immediately followed by
 *                                      another T<n> M6 — no-op on most
 *                                      controls but sometimes used as a
 *                                      "re-touch probe" tactic.
 *
 * Options:
 *   - `max_tool`              — magazine capacity. Default 99.
 *   - `allow_tool_zero`       — if true, T0 is silent. Default false.
 *   - `m6_lookahead_lines`    — distance to scan for an M6 after a T
 *                                word. Default 5.
 *
 * Scope — distinct from:
 *   - PPToolChangeValidatorEngine: tool-change sequence safety, not
 *     the number itself.
 *   - PPAxisLetterValidatorEngine: catches "T" with no number, which
 *     this engine does NOT re-check (no dup coverage).
 *
 * @module PPToolNumberRangeValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ToolNumberSeverity = "error" | "warning" | "info";

export type ToolNumberKind =
  | "tool_zero"
  | "tool_out_of_range"
  | "tool_negative"
  | "tool_without_m6"
  | "consecutive_t_no_m6"
  | "duplicate_load";

export interface ToolNumberIssue {
  line_number: number;
  kind: ToolNumberKind;
  severity: ToolNumberSeverity;
  message: string;
  tool_number: number;
  details?: {
    prior_tool?: number;
    m6_found?: boolean;
  };
}

export interface ToolNumberResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ToolNumberIssue[];
  summary: {
    valid: boolean;
    total_t_calls: number;
    distinct_tools: number[];
    max_tool_seen: number;
  };
}

export interface ToolNumberOptions {
  /** Highest legal T number. Default 99. */
  max_tool?: number;
  /** If true, T0 does not produce `tool_zero`. Default false. */
  allow_tool_zero?: boolean;
  /** Window in which a T word must find an M6. Default 5 lines. */
  m6_lookahead_lines?: number;
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPToolNumberRangeValidatorEngine {
  /** Validate T-word numbering across a G-code program. */
  validate(
    gcode: string,
    options?: ToolNumberOptions,
  ): ToolNumberResult {
    const opts: Required<ToolNumberOptions> = {
      max_tool: options?.max_tool ?? 99,
      allow_tool_zero: options?.allow_tool_zero ?? false,
      m6_lookahead_lines: options?.m6_lookahead_lines ?? 5,
    };

    const lines = gcode.split(/\r?\n/).map((l) => this.stripComments(l).toUpperCase());
    const issues: ToolNumberIssue[] = [];
    const distinctTools = new Set<number>();
    let totalT = 0;
    let maxToolSeen = -1;
    let lastToolLoaded: number | null = null;
    let pendingTool: { n: number; line: number } | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const code = lines[idx]!;
      const lineNum = idx + 1;
      if (code.length === 0) continue;

      const tVal = this.readT(code);
      if (tVal === null) {
        // Is this an M6 that closes a pending T?
        if (/\bM0*6\b/.test(code) && pendingTool !== null) {
          this.handleM6(
            pendingTool.n,
            pendingTool.line,
            lastToolLoaded,
            issues,
          );
          lastToolLoaded = pendingTool.n;
          pendingTool = null;
        }
        continue;
      }

      totalT++;
      distinctTools.add(tVal);
      if (tVal > maxToolSeen) maxToolSeen = tVal;

      // Range checks.
      if (tVal < 0) {
        issues.push({
          line_number: lineNum,
          kind: "tool_negative",
          severity: "error",
          message: `T${tVal} — negative tool numbers are invalid`,
          tool_number: tVal,
        });
      } else if (tVal === 0 && !opts.allow_tool_zero) {
        issues.push({
          line_number: lineNum,
          kind: "tool_zero",
          severity: "error",
          message: `T0 — most controllers reject pocket 0 as invalid`,
          tool_number: tVal,
        });
      } else if (tVal > opts.max_tool) {
        issues.push({
          line_number: lineNum,
          kind: "tool_out_of_range",
          severity: "error",
          message: `T${tVal} exceeds magazine capacity (max ${opts.max_tool})`,
          tool_number: tVal,
        });
      }

      // Consecutive-T without M6 between.
      if (pendingTool !== null) {
        issues.push({
          line_number: lineNum,
          kind: "consecutive_t_no_m6",
          severity: "warning",
          message: `T${tVal} called without M6 after prior T${pendingTool.n} — T${pendingTool.n} is overwritten`,
          tool_number: tVal,
          details: { prior_tool: pendingTool.n },
        });
      }

      // M6 on the same line as the T word?
      if (/\bM0*6\b/.test(code)) {
        this.handleM6(tVal, lineNum, lastToolLoaded, issues);
        lastToolLoaded = tVal;
        pendingTool = null;
      } else {
        pendingTool = { n: tVal, line: lineNum };
      }
    }

    // End-of-file: any pending T without M6?
    if (pendingTool !== null) {
      issues.push({
        line_number: pendingTool.line,
        kind: "tool_without_m6",
        severity: "warning",
        message: `T${pendingTool.n} called but no M6 found within the file`,
        tool_number: pendingTool.n,
        details: { m6_found: false },
      });
    }

    // Also scan each T for its M6-lookahead (fixes the case where a T is
    // followed by motion-only lines for longer than the window).
    this.checkLookahead(lines, opts, issues);

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
        total_t_calls: totalT,
        distinct_tools: Array.from(distinctTools).sort((a, b) => a - b),
        max_tool_seen: maxToolSeen,
      },
    };
  }

  /** Quick pass/fail. */
  quickCheck(
    gcode: string,
    options?: ToolNumberOptions,
  ): { valid: boolean; errors: number; warnings: number; total_t_calls: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      total_t_calls: r.summary.total_t_calls,
    };
  }

  /** Default options. */
  defaultOptions(): Required<ToolNumberOptions> {
    return { max_tool: 99, allow_tool_zero: false, m6_lookahead_lines: 5 };
  }

  // ── Private ───────────────────────────────────────────────────────

  private readT(code: string): number | null {
    // T word MUST be at start of token boundary; avoid matching the "T"
    // inside words like "STOP" (defensive — comments already stripped).
    const m = code.match(/(?:^|\s)T(-?\d+)\b/);
    if (!m) return null;
    return parseInt(m[1]!, 10);
  }

  private handleM6(
    toolN: number,
    lineNum: number,
    lastToolLoaded: number | null,
    issues: ToolNumberIssue[],
  ): void {
    if (lastToolLoaded === toolN) {
      issues.push({
        line_number: lineNum,
        kind: "duplicate_load",
        severity: "info",
        message: `T${toolN} loaded twice in a row — no-op on most controls`,
        tool_number: toolN,
        details: { prior_tool: lastToolLoaded },
      });
    }
  }

  /**
   * Second-pass scan that emits `tool_without_m6` for T words that DO
   * eventually get an M6 but only after more than `m6_lookahead_lines`
   * non-M6 lines. (The main loop's tail-case already handles "T with no
   * M6 ever" — this pass catches "M6 too far away".)
   */
  private checkLookahead(
    lines: string[],
    opts: Required<ToolNumberOptions>,
    issues: ToolNumberIssue[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const code = lines[i]!;
      if (code.length === 0) continue;
      const t = this.readT(code);
      if (t === null) continue;
      // Same-line M6 is fine.
      if (/\bM0*6\b/.test(code)) continue;
      let found = false;
      const upperBound = Math.min(lines.length, i + 1 + opts.m6_lookahead_lines);
      for (let j = i + 1; j < upperBound; j++) {
        if (/\bM0*6\b/.test(lines[j]!)) {
          found = true;
          break;
        }
      }
      if (!found) {
        // Only report if there IS an M6 somewhere later (otherwise the
        // tail-case already emitted `tool_without_m6` with a different
        // message). Avoid double-counting.
        let anyLater = false;
        for (let j = upperBound; j < lines.length; j++) {
          if (/\bM0*6\b/.test(lines[j]!)) {
            anyLater = true;
            break;
          }
        }
        if (anyLater) {
          issues.push({
            line_number: i + 1,
            kind: "tool_without_m6",
            severity: "warning",
            message: `T${t} M6 not found within ${opts.m6_lookahead_lines} lines`,
            tool_number: t,
            details: { m6_found: true },
          });
        }
      }
    }
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppToolNumberRangeValidatorEngine =
  new PPToolNumberRangeValidatorEngine();
