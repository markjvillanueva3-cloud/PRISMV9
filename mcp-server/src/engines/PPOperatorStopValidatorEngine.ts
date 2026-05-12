/**
 * PPOperatorStopValidatorEngine — Validate M0/M1 operator stops
 *
 * M0 (Program Stop) and M1 (Optional Stop) pause execution and wait
 * for the operator to press Cycle Start. They are the primary tool for
 * human-in-the-loop checkpoints: manual probe, visual inspection, blow
 * off chips, swap a part, verify first-article.
 *
 * Misuse is costly:
 *   - M0 with no nearby comment leaves the operator guessing why the
 *     machine stopped ("is it a crash? a chip jam? intentional?").
 *   - Too many M0s turn a semi-automated program into a babysitting
 *     exercise and defeat cell-automation economics.
 *   - M0 inside a subprogram breaks multi-part batching because the
 *     pause interrupts the machine's recognition of the part boundary.
 *   - M1 with the Optional-Stop switch ON behaves like M0; with it
 *     OFF it is skipped. Programs that rely on one state often crash
 *     when run on a machine whose switch is the opposite.
 *
 * Failure modes this validator catches:
 *   - m0_without_comment (info): M0 on a block with no same-line or
 *     adjacent-line comment explaining the intent.
 *   - m1_without_comment (info): M1 same.
 *   - excessive_stops (warning): total M0+M1 count > max_stops.
 *     Indicates poor automation design.
 *   - m0_in_subprogram (warning): M0 found after an O<nn> that is not
 *     the first O in the file (i.e., a subprogram body).
 *   - m0_after_final_end (info): M0 placed after M30/M2 — dead code.
 *   - m1_without_optional_stop_hint (info): M1 in program with no
 *     comment flagging that optional-stop must be enabled to take
 *     effect.
 *   - tool_change_without_stop (info, opt-in): M6 without an adjacent
 *     M0/M1 in multi-part shops that require inspection on change.
 *
 * Scope — distinct from:
 *   - PPProgramEndValidatorEngine: M30/M2/M99 termination only.
 *   - PPToolChangeValidatorEngine: M6 sequence validity.
 *   - PPSafetyRuleValidatorEngine: generic rule-engine; this engine
 *     targets M0/M1 semantics with structural checks.
 *
 * @module PPOperatorStopValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type OSSeverity = "error" | "warning" | "info";

export interface OSIssue {
  line_number: number;
  kind:
    | "m0_without_comment"
    | "m1_without_comment"
    | "excessive_stops"
    | "m0_in_subprogram"
    | "m0_after_final_end"
    | "m1_without_optional_stop_hint"
    | "tool_change_without_stop";
  severity: OSSeverity;
  message: string;
  details?: {
    total_stops?: number;
    max_stops?: number;
    subprogram_o?: number;
  };
}

export interface OSResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: OSIssue[];
  summary: {
    valid: boolean;
    m0_count: number;
    m1_count: number;
    total_stops: number;
    m6_count: number;
  };
}

export interface OSOptions {
  check_m0_comment?: boolean;              // default true (info)
  check_m1_comment?: boolean;              // default true (info)
  check_excessive_stops?: boolean;         // default true
  check_m0_in_subprogram?: boolean;        // default true
  check_m0_after_end?: boolean;            // default true
  check_m1_optional_hint?: boolean;        // default false (info, opt-in)
  check_tool_change_stop?: boolean;        // default false (shop-specific)
  max_stops?: number;                      // default 5
  adjacent_comment_lines?: number;         // default 1 (±1 line from M0/M1)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPOperatorStopValidatorEngine {
  /**
   * Validate M0/M1 operator-stop usage in a G-code program.
   */
  validate(gcode: string, options?: OSOptions): OSResult {
    const opts = {
      check_m0_comment: options?.check_m0_comment ?? true,
      check_m1_comment: options?.check_m1_comment ?? true,
      check_excessive_stops: options?.check_excessive_stops ?? true,
      check_m0_in_subprogram: options?.check_m0_in_subprogram ?? true,
      check_m0_after_end: options?.check_m0_after_end ?? true,
      check_m1_optional_hint: options?.check_m1_optional_hint ?? false,
      check_tool_change_stop: options?.check_tool_change_stop ?? false,
      max_stops: options?.max_stops ?? 5,
      adjacent_comment_lines: options?.adjacent_comment_lines ?? 1,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: OSIssue[] = [];

    // First pass: track comment presence per line & O-number boundaries
    const lineHasComment: boolean[] = new Array(lines.length).fill(false);
    const lineIsProgramEnd: boolean[] = new Array(lines.length).fill(false);
    const lineOLabel: (number | null)[] = new Array(lines.length).fill(null);

    let firstOIdx = -1;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      // Comment detection (before stripping)
      if (/\([^)]*\)/.test(raw) || /;\s*\S/.test(raw)) {
        lineHasComment[idx] = true;
      }
      const stripped = this.stripComments(raw).toUpperCase().trim();
      // O-label
      const oMatch = stripped.match(/^O(\d+)/);
      if (oMatch) {
        lineOLabel[idx] = parseInt(oMatch[1], 10);
        if (firstOIdx < 0) firstOIdx = idx;
      }
      // Program end (M30, M02, or bare M2)
      if (
        /\bM0*30(?!\d)/.test(stripped) ||
        /\bM0*2(?!\d)/.test(stripped)
      ) {
        lineIsProgramEnd[idx] = true;
      }
    }

    // Second pass: find M0/M1/M6 and diagnose
    let m0Count = 0;
    let m1Count = 0;
    let m6Count = 0;

    // Track current subprogram boundary (after first O)
    let seenSubprogram = false;
    let currentSubprogramO: number | null = null;
    let seenFinalEnd = false;
    let hasM1AnywhereWithOptionalHint = false;

    // Scan once for global optional-stop hint (comment with "OPTIONAL" etc.)
    const fullText = gcode.toUpperCase();
    if (/OPTIONAL\s*STOP/.test(fullText) || /OPT\.?\s*STOP/.test(fullText)) {
      hasM1AnywhereWithOptionalHint = true;
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const lineNum = idx + 1;
      const raw = lines[idx];
      const code = this.stripComments(raw).toUpperCase();

      // Update subprogram tracking
      const o = lineOLabel[idx];
      if (o !== null) {
        if (firstOIdx >= 0 && idx > firstOIdx) {
          // Any O after the first is a subprogram boundary
          seenSubprogram = true;
          currentSubprogramO = o;
        } else {
          currentSubprogramO = o; // main's O
        }
      }

      // Check for M0 (Program Stop)
      if (/\bM0*0(?!\d)/.test(code) && !/\bM0*0\d+/.test(code)) {
        m0Count++;
        if (opts.check_m0_comment && !this.hasAdjacentComment(lineHasComment, idx, opts.adjacent_comment_lines)) {
          issues.push({
            line_number: lineNum,
            kind: "m0_without_comment",
            severity: "info",
            message: `M0 program-stop at line ${lineNum} without adjacent comment — operator will not know why`,
          });
        }
        if (opts.check_m0_in_subprogram && seenSubprogram) {
          issues.push({
            line_number: lineNum,
            kind: "m0_in_subprogram",
            severity: "warning",
            message: `M0 inside subprogram O${currentSubprogramO} — breaks multi-part batching`,
            details: { subprogram_o: currentSubprogramO ?? undefined },
          });
        }
        if (opts.check_m0_after_end && seenFinalEnd) {
          issues.push({
            line_number: lineNum,
            kind: "m0_after_final_end",
            severity: "info",
            message: `M0 at line ${lineNum} appears after program end — dead code`,
          });
        }
      }

      // Check for M1 (Optional Stop)
      // Match M1 but not M10, M11, ..., M19
      if (/\bM0*1(?!\d)/.test(code) && !/\bM0*1\d+/.test(code)) {
        m1Count++;
        if (opts.check_m1_comment && !this.hasAdjacentComment(lineHasComment, idx, opts.adjacent_comment_lines)) {
          issues.push({
            line_number: lineNum,
            kind: "m1_without_comment",
            severity: "info",
            message: `M1 optional-stop at line ${lineNum} without adjacent comment`,
          });
        }
        if (
          opts.check_m1_optional_hint &&
          !hasM1AnywhereWithOptionalHint
        ) {
          issues.push({
            line_number: lineNum,
            kind: "m1_without_optional_stop_hint",
            severity: "info",
            message: `M1 at line ${lineNum} — program has no comment hinting at optional-stop switch state`,
          });
        }
      }

      // Check for M6 (Tool Change)
      if (/\bM0*6(?!\d)/.test(code) && !/\bM0*6\d+/.test(code)) {
        m6Count++;
        if (opts.check_tool_change_stop) {
          const adjacentStop = this.hasAdjacentStop(lines, idx, opts.adjacent_comment_lines);
          if (!adjacentStop) {
            issues.push({
              line_number: lineNum,
              kind: "tool_change_without_stop",
              severity: "info",
              message: `M6 tool-change at line ${lineNum} without adjacent M0/M1 for inspection`,
            });
          }
        }
      }

      if (lineIsProgramEnd[idx]) seenFinalEnd = true;
    }

    // Excessive stops
    const totalStops = m0Count + m1Count;
    if (opts.check_excessive_stops && totalStops > opts.max_stops) {
      issues.push({
        line_number: 1,
        kind: "excessive_stops",
        severity: "warning",
        message: `${totalStops} operator stops (M0+M1) exceeds ${opts.max_stops} — poor automation`,
        details: { total_stops: totalStops, max_stops: opts.max_stops },
      });
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
        m0_count: m0Count,
        m1_count: m1Count,
        total_stops: totalStops,
        m6_count: m6Count,
      },
    };
  }

  /**
   * Quick pass/fail.
   */
  quickCheck(
    gcode: string,
    options?: OSOptions,
  ): {
    valid: boolean;
    m0_count: number;
    m1_count: number;
    total_stops: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      m0_count: r.summary.m0_count,
      m1_count: r.summary.m1_count,
      total_stops: r.summary.total_stops,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<OSOptions> {
    return {
      check_m0_comment: true,
      check_m1_comment: true,
      check_excessive_stops: true,
      check_m0_in_subprogram: true,
      check_m0_after_end: true,
      check_m1_optional_hint: false,
      check_tool_change_stop: false,
      max_stops: 5,
      adjacent_comment_lines: 1,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }

  private hasAdjacentComment(
    commentsByLine: boolean[],
    idx: number,
    radius: number,
  ): boolean {
    const start = Math.max(0, idx - radius);
    const end = Math.min(commentsByLine.length - 1, idx + radius);
    for (let i = start; i <= end; i++) {
      if (commentsByLine[i]) return true;
    }
    return false;
  }

  private hasAdjacentStop(
    lines: string[],
    idx: number,
    radius: number,
  ): boolean {
    const start = Math.max(0, idx - radius);
    const end = Math.min(lines.length - 1, idx + radius);
    for (let i = start; i <= end; i++) {
      if (i === idx) continue;
      const code = this.stripComments(lines[i]).toUpperCase();
      if (
        (/\bM0*0(?!\d)/.test(code) && !/\bM0*0\d+/.test(code)) ||
        (/\bM0*1(?!\d)/.test(code) && !/\bM0*1\d+/.test(code))
      ) {
        return true;
      }
    }
    return false;
  }
}

export const ppOperatorStopValidatorEngine =
  new PPOperatorStopValidatorEngine();
