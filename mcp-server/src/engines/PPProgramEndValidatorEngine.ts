/**
 * PPProgramEndValidatorEngine — Validate program termination (M30/M2/M99)
 *
 * G-code programs must terminate cleanly. Missing, misplaced, or
 * duplicate end codes create the classic "machine sits idle / keeps
 * running / runs the wrong block" post-program failure modes:
 *
 *   M30  — Program end + rewind (main program). Control rewinds to the
 *          start and halts. Required terminator for main programs.
 *   M02  — Program end (no rewind). Accepted by most controls but some
 *          modern Fanuc/Okuma insist on M30.
 *   M99  — Subprogram return. Required at the end of every O-number
 *          subprogram body. If M99 appears at the end of the MAIN
 *          program on a Fanuc control, the program loops forever.
 *   %    — End-of-tape/file marker. Legacy but still required by some
 *          dripfeed/DNC setups and all Heidenhain iTNC controls.
 *
 * Failure modes this validator catches:
 *   - missing_program_end (error): program has neither M30 nor M02 and
 *     is not a subprogram that uses M99.
 *   - end_not_last (warning): M30/M02 is present but not on the last
 *     non-empty, non-'%' block — code after it is unreachable.
 *   - multiple_program_ends (warning): more than one M30/M02 block.
 *     Only the first executes; the rest are dead code.
 *   - m99_in_main (error): M99 appears outside an O-number subprogram
 *     body on a main program. Fanuc reads this as "return to caller" —
 *     with no caller, program enters an infinite restart loop.
 *   - subprogram_missing_m99 (error): an O#### subprogram body ends
 *     without an M99 return. Caller never resumes.
 *   - missing_trailing_percent (info): file lacks a trailing '%' marker
 *     — some DNC/dripfeed setups require it.
 *   - missing_leading_percent (info): file lacks a leading '%' marker.
 *
 * Subprogram detection: an O-line followed by an M99 block before any
 * other O-line is treated as a subprogram body. The first O-line in
 * the file is the main program number.
 *
 * Scope — distinct from:
 *   - PPCallGraphValidatorEngine: validates M98 P calls resolve to O#
 *     targets. We own the terminator structure.
 *   - PPLineNumberSanityEngine: N-word monotonicity. Orthogonal.
 *
 * @module PPProgramEndValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type PESeverity = "error" | "warning" | "info";

export interface PEIssue {
  line_number: number;
  kind:
    | "missing_program_end"
    | "end_not_last"
    | "multiple_program_ends"
    | "m99_in_main"
    | "subprogram_missing_m99"
    | "missing_trailing_percent"
    | "missing_leading_percent";
  severity: PESeverity;
  message: string;
  details?: {
    end_code?: "M30" | "M02" | "M99";
    end_lines?: number[];
    o_number?: number;
    is_main?: boolean;
  };
}

export interface PEResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: PEIssue[];
  summary: {
    valid: boolean;
    m30_count: number;
    m02_count: number;
    m99_count: number;
    o_number_count: number;
    main_o_number: number | null;
    has_leading_percent: boolean;
    has_trailing_percent: boolean;
    last_meaningful_line: number | null;
  };
}

export interface PEOptions {
  check_missing_end?: boolean;       // default true
  check_end_not_last?: boolean;      // default true
  check_multiple_ends?: boolean;     // default true
  check_m99_in_main?: boolean;       // default true
  check_subprogram_m99?: boolean;    // default true
  check_trailing_percent?: boolean;  // default false (info)
  check_leading_percent?: boolean;   // default false (info)
  treat_m02_as_end?: boolean;        // default true
  subprogram_only?: boolean;         // default false — if true, input is
                                     // a subprogram file (M99 expected, no M30/M02)
}

// ── Engine ────────────────────────────────────────────────────────────

interface BlockInfo {
  line: number;
  code: string;
  hasM30: boolean;
  hasM02: boolean;
  hasM99: boolean;
  oNumber: number | null;
}

export class PPProgramEndValidatorEngine {
  /**
   * Validate program termination.
   */
  validate(gcode: string, options?: PEOptions): PEResult {
    const opts = {
      check_missing_end: options?.check_missing_end ?? true,
      check_end_not_last: options?.check_end_not_last ?? true,
      check_multiple_ends: options?.check_multiple_ends ?? true,
      check_m99_in_main: options?.check_m99_in_main ?? true,
      check_subprogram_m99: options?.check_subprogram_m99 ?? true,
      check_trailing_percent: options?.check_trailing_percent ?? false,
      check_leading_percent: options?.check_leading_percent ?? false,
      treat_m02_as_end: options?.treat_m02_as_end ?? true,
      subprogram_only: options?.subprogram_only ?? false,
    };

    const rawLines = gcode.split(/\r?\n/);
    const issues: PEIssue[] = [];

    // Leading/trailing '%' (on raw lines — comments inside '%' are rare)
    const trimmedLines = rawLines.map((l) => l.trim());
    const firstNonEmpty = trimmedLines.findIndex((l) => l.length > 0);
    let lastNonEmpty = -1;
    for (let i = trimmedLines.length - 1; i >= 0; i--) {
      if (trimmedLines[i].length > 0) {
        lastNonEmpty = i;
        break;
      }
    }
    const hasLeadingPercent =
      firstNonEmpty >= 0 && trimmedLines[firstNonEmpty] === "%";
    const hasTrailingPercent =
      lastNonEmpty >= 0 && trimmedLines[lastNonEmpty] === "%";

    // Parse blocks (skipping comments for M/O detection)
    const blocks: BlockInfo[] = [];
    for (let idx = 0; idx < rawLines.length; idx++) {
      const code = this.stripComments(rawLines[idx]).toUpperCase();
      if (code.length === 0) continue;
      if (code.trim() === "%") continue;

      blocks.push({
        line: idx + 1,
        code,
        hasM30: /\bM0*30(?!\d)/.test(code),
        hasM02: /\bM0*2(?!\d)/.test(code),
        hasM99: /\bM0*99(?!\d)/.test(code),
        oNumber: this.extractONumber(code),
      });
    }

    // Count
    const m30Blocks = blocks.filter((b) => b.hasM30);
    const m02Blocks = blocks.filter((b) => b.hasM02);
    const m99Blocks = blocks.filter((b) => b.hasM99);
    const oBlocks = blocks.filter((b) => b.oNumber !== null);

    // Identify main program number (first O) and subprogram O-numbers
    const mainONumber = oBlocks.length > 0 ? oBlocks[0].oNumber : null;

    // Identify subprogram boundaries: each O-block after the first begins
    // a subprogram body that ends at the next O-block or end-of-file.
    const subprograms: {
      oNumber: number;
      startIdx: number; // block index of the O-line
      endIdx: number; // block index BEFORE the next O-line (inclusive)
    }[] = [];
    for (let i = 1; i < oBlocks.length; i++) {
      const startIdx = blocks.indexOf(oBlocks[i]);
      const nextOBlock = i + 1 < oBlocks.length ? oBlocks[i + 1] : null;
      const endIdx = nextOBlock
        ? blocks.indexOf(nextOBlock) - 1
        : blocks.length - 1;
      subprograms.push({
        oNumber: oBlocks[i].oNumber!,
        startIdx,
        endIdx,
      });
    }

    // ── Checks ────────────────────────────────────────────────────────

    // missing_program_end
    const endCount =
      m30Blocks.length + (opts.treat_m02_as_end ? m02Blocks.length : 0);

    if (opts.check_missing_end && !opts.subprogram_only && endCount === 0) {
      // Main program must have M30 (or M02 if accepted)
      issues.push({
        line_number: lastNonEmpty >= 0 ? lastNonEmpty + 1 : 1,
        kind: "missing_program_end",
        severity: "error",
        message: `Program has no M30${opts.treat_m02_as_end ? " or M02" : ""} terminator`,
        details: { is_main: true },
      });
    }

    // multiple_program_ends
    if (opts.check_multiple_ends && endCount > 1) {
      const endLines: number[] = [];
      for (const b of m30Blocks) endLines.push(b.line);
      if (opts.treat_m02_as_end) {
        for (const b of m02Blocks) endLines.push(b.line);
      }
      issues.push({
        line_number: endLines[0],
        kind: "multiple_program_ends",
        severity: "warning",
        message: `Multiple program-end blocks (${endCount}) — only the first executes; code after is unreachable`,
        details: { end_lines: endLines },
      });
    }

    // end_not_last
    if (opts.check_end_not_last && endCount > 0) {
      const lastEndIdx = (() => {
        let idx = -1;
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.hasM30 || (opts.treat_m02_as_end && b.hasM02)) idx = i;
        }
        return idx;
      })();
      if (lastEndIdx >= 0 && lastEndIdx < blocks.length - 1) {
        // If everything after the last end is just a subprogram section
        // (starts with O after the end), we don't flag — subprograms
        // below the main-program M30 is the canonical Fanuc layout.
        const tail = blocks.slice(lastEndIdx + 1);
        const tailAllSubprogram =
          tail.length > 0 && tail[0].oNumber !== null;
        if (!tailAllSubprogram) {
          const b = blocks[lastEndIdx];
          issues.push({
            line_number: b.line,
            kind: "end_not_last",
            severity: "warning",
            message: `Program-end block not last — code after is unreachable`,
            details: { end_code: b.hasM30 ? "M30" : "M02" },
          });
        }
      }
    }

    // m99_in_main — flag any M99 that is NOT inside a subprogram body
    if (opts.check_m99_in_main && !opts.subprogram_only) {
      for (const m99 of m99Blocks) {
        const inSub = subprograms.some(
          (s) =>
            blocks.indexOf(m99) >= s.startIdx &&
            blocks.indexOf(m99) <= s.endIdx,
        );
        if (!inSub) {
          issues.push({
            line_number: m99.line,
            kind: "m99_in_main",
            severity: "error",
            message: `M99 in main program body — will cause control to loop back or alarm`,
            details: { end_code: "M99", is_main: true },
          });
        }
      }
    }

    // subprogram_only mode: main body should contain M99 (not M30)
    if (opts.subprogram_only && opts.check_subprogram_m99) {
      if (m99Blocks.length === 0) {
        issues.push({
          line_number: lastNonEmpty >= 0 ? lastNonEmpty + 1 : 1,
          kind: "subprogram_missing_m99",
          severity: "error",
          message: `Subprogram file has no M99 return`,
        });
      }
    }

    // subprogram_missing_m99 — each O-subprogram body must have an M99
    if (opts.check_subprogram_m99) {
      for (const sub of subprograms) {
        let hasM99 = false;
        for (let i = sub.startIdx; i <= sub.endIdx; i++) {
          if (blocks[i].hasM99) {
            hasM99 = true;
            break;
          }
        }
        if (!hasM99) {
          issues.push({
            line_number: blocks[sub.startIdx].line,
            kind: "subprogram_missing_m99",
            severity: "error",
            message: `Subprogram O${sub.oNumber} has no M99 return`,
            details: { o_number: sub.oNumber },
          });
        }
      }
    }

    // Leading/trailing '%'
    if (opts.check_leading_percent && !hasLeadingPercent) {
      issues.push({
        line_number: 1,
        kind: "missing_leading_percent",
        severity: "info",
        message: `File lacks leading '%' marker — some DNC setups require it`,
      });
    }

    if (opts.check_trailing_percent && !hasTrailingPercent) {
      issues.push({
        line_number: Math.max(rawLines.length, 1),
        kind: "missing_trailing_percent",
        severity: "info",
        message: `File lacks trailing '%' marker — some DNC setups require it`,
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
        m30_count: m30Blocks.length,
        m02_count: m02Blocks.length,
        m99_count: m99Blocks.length,
        o_number_count: oBlocks.length,
        main_o_number: mainONumber,
        has_leading_percent: hasLeadingPercent,
        has_trailing_percent: hasTrailingPercent,
        last_meaningful_line: lastNonEmpty >= 0 ? lastNonEmpty + 1 : null,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: PEOptions,
  ): {
    valid: boolean;
    errors: number;
    m30_count: number;
    m99_count: number;
    main_o_number: number | null;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      m30_count: r.summary.m30_count,
      m99_count: r.summary.m99_count,
      main_o_number: r.summary.main_o_number,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<PEOptions> {
    return {
      check_missing_end: true,
      check_end_not_last: true,
      check_multiple_ends: true,
      check_m99_in_main: true,
      check_subprogram_m99: true,
      check_trailing_percent: false,
      check_leading_percent: false,
      treat_m02_as_end: true,
      subprogram_only: false,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }

  /**
   * Extract the O-number at the start of a block (e.g., "O1001" → 1001).
   * Returns null if no O-number word is present.
   */
  private extractONumber(code: string): number | null {
    const m = code.match(/\bO(\d+)\b/);
    if (!m) return null;
    return parseInt(m[1], 10);
  }
}

export const ppProgramEndValidatorEngine = new PPProgramEndValidatorEngine();
