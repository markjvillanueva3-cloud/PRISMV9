/**
 * PPLineNumberSanityEngine — Validate N-word numbering and program framing
 *
 * N-words (sequence numbers) are optional on most controllers but DNC
 * drip-feed, GOTO subprograms, and operator cue cards all depend on them
 * being well-ordered. This engine catches the common post-processor
 * bugs that corrupt N-word sequences.
 *
 * Also validates program framing — % start/end, O-number, and M-code
 * program termination — which some CAM posts get wrong on first install.
 *
 * Checks:
 *   - nonmonotonic_n (error): N-words decrease (e.g., N50 then N30).
 *     Breaks GOTO lookups and confuses operators.
 *   - duplicate_n (error): same N-value on two lines.
 *   - large_n_gap (warning): gap between consecutive N-values > max_gap
 *     (default 1000). Symptom of stripped-in edits or bad subprograms.
 *   - missing_program_start_percent (warning): no leading % sentinel.
 *     Required by Fanuc DNC; most mid-range controllers tolerate absence.
 *   - missing_program_end_percent (warning): no trailing % sentinel.
 *   - missing_o_number (warning): no O<nnnn> program identifier.
 *   - missing_program_end_m_code (error): no M30, M2, or M99 terminator.
 *     Controller runs past end of file.
 *   - code_after_program_end (warning): non-comment G-code lines appear
 *     AFTER M30/M2 — dead code or programmer error.
 *   - duplicate_o_number (error): same O-number appears twice in program.
 *
 * Scope — distinct from:
 *   - PPGCodeMinimizerEngine: removes redundant tokens, doesn't validate.
 *   - PPModalStateTrackerEngine: modal state, not line numbering.
 *
 * @module PPLineNumberSanityEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type LNSeverity = "error" | "warning" | "info";

export interface LNIssue {
  line_number: number;
  kind:
    | "nonmonotonic_n"
    | "duplicate_n"
    | "large_n_gap"
    | "missing_program_start_percent"
    | "missing_program_end_percent"
    | "missing_o_number"
    | "missing_program_end_m_code"
    | "code_after_program_end"
    | "duplicate_o_number";
  severity: LNSeverity;
  message: string;
  details?: {
    n_value?: number;
    previous_n?: number;
    gap?: number;
    o_number?: number;
  };
}

export interface LineNumberResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: LNIssue[];
  summary: {
    valid: boolean;
    total_lines: number;
    n_numbered_lines: number;
    o_numbers: number[];
    min_n: number | null;
    max_n: number | null;
    has_percent_start: boolean;
    has_percent_end: boolean;
    has_program_end_m_code: boolean;
  };
}

export interface LineNumberOptions {
  require_percent?: boolean;      // default true (Fanuc-style)
  require_o_number?: boolean;     // default true
  require_program_end_m_code?: boolean; // default true
  max_n_gap?: number;              // default 1000
  warn_large_n_gap?: boolean;      // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPLineNumberSanityEngine {
  /**
   * Validate N-word ordering and program framing.
   */
  validate(
    gcode: string,
    options?: LineNumberOptions,
  ): LineNumberResult {
    const opts = {
      require_percent: options?.require_percent ?? true,
      require_o_number: options?.require_o_number ?? true,
      require_program_end_m_code: options?.require_program_end_m_code ?? true,
      max_n_gap: options?.max_n_gap ?? 1000,
      warn_large_n_gap: options?.warn_large_n_gap ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: LNIssue[] = [];
    const oNumbers: number[] = [];
    const seenO = new Set<number>();
    const seenN = new Map<number, number>(); // n-value → line number

    let lastN: number | null = null;
    let minN: number | null = null;
    let maxN: number | null = null;
    let nNumberedLines = 0;
    let hasPercentStart = false;
    let hasPercentEnd = false;
    let hasProgramEndM = false;
    let programEndLine: number | null = null;
    let firstNonEmptyLine: number | null = null;
    let lastNonEmptyLine: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;

      if (firstNonEmptyLine === null) firstNonEmptyLine = lineNum;
      lastNonEmptyLine = lineNum;

      // % sentinel detection (must be first non-whitespace token on line)
      if (trimmed.startsWith("%")) {
        if (firstNonEmptyLine === lineNum) hasPercentStart = true;
        // Will re-check the last % when we finish the loop
        hasPercentEnd = true; // tentative — confirmed last-line below
      }

      const code = this.stripComments(trimmed).toUpperCase();
      if (code.length === 0) continue;

      // O-number
      const oMatch = code.match(/\bO(\d+)\b/);
      if (oMatch) {
        const oVal = parseInt(oMatch[1], 10);
        if (seenO.has(oVal)) {
          issues.push({
            line_number: lineNum,
            kind: "duplicate_o_number",
            severity: "error",
            message: `Duplicate O-number O${oVal} on line ${lineNum}`,
            details: { o_number: oVal },
          });
        } else {
          seenO.add(oVal);
          oNumbers.push(oVal);
        }
      }

      // N-word
      const nMatch = code.match(/\bN(\d+)\b/);
      if (nMatch) {
        nNumberedLines++;
        const nVal = parseInt(nMatch[1], 10);
        if (minN === null || nVal < minN) minN = nVal;
        if (maxN === null || nVal > maxN) maxN = nVal;

        if (seenN.has(nVal)) {
          issues.push({
            line_number: lineNum,
            kind: "duplicate_n",
            severity: "error",
            message: `Duplicate N${nVal} — already used on line ${seenN.get(nVal)}`,
            details: { n_value: nVal, previous_n: nVal },
          });
        } else {
          seenN.set(nVal, lineNum);
        }

        if (lastN !== null) {
          if (nVal < lastN) {
            issues.push({
              line_number: lineNum,
              kind: "nonmonotonic_n",
              severity: "error",
              message: `N${nVal} follows N${lastN} — sequence decreasing`,
              details: { n_value: nVal, previous_n: lastN },
            });
          } else if (opts.warn_large_n_gap && nVal - lastN > opts.max_n_gap) {
            issues.push({
              line_number: lineNum,
              kind: "large_n_gap",
              severity: "warning",
              message: `N${nVal} after N${lastN} — gap of ${nVal - lastN} exceeds max_gap ${opts.max_n_gap}`,
              details: { n_value: nVal, previous_n: lastN, gap: nVal - lastN },
            });
          }
        }
        lastN = nVal;
      }

      // Program end (M30/M2/M99)
      if (/\bM0*(2|30|99)\b/.test(code)) {
        hasProgramEndM = true;
        if (programEndLine === null) programEndLine = lineNum;
      }

      // code_after_program_end
      if (programEndLine !== null && lineNum > programEndLine) {
        // Non-comment line content after end
        if (code.length > 0 && !trimmed.startsWith("%")) {
          issues.push({
            line_number: lineNum,
            kind: "code_after_program_end",
            severity: "warning",
            message: `Code line after program end (M30/M2 on line ${programEndLine})`,
          });
        }
      }
    }

    // Determine true hasPercentEnd — last non-empty line must start with %
    if (lastNonEmptyLine !== null) {
      const lastRaw = lines[lastNonEmptyLine - 1].trim();
      hasPercentEnd = lastRaw.startsWith("%");
    } else {
      hasPercentEnd = false;
    }

    // Framing errors
    if (opts.require_percent && !hasPercentStart && firstNonEmptyLine !== null) {
      issues.push({
        line_number: firstNonEmptyLine,
        kind: "missing_program_start_percent",
        severity: "warning",
        message: `Program lacks leading % sentinel`,
      });
    }
    if (opts.require_percent && !hasPercentEnd && lastNonEmptyLine !== null) {
      issues.push({
        line_number: lastNonEmptyLine,
        kind: "missing_program_end_percent",
        severity: "warning",
        message: `Program lacks trailing % sentinel`,
      });
    }
    if (opts.require_o_number && oNumbers.length === 0 && firstNonEmptyLine !== null) {
      issues.push({
        line_number: firstNonEmptyLine,
        kind: "missing_o_number",
        severity: "warning",
        message: `Program lacks O-number identifier`,
      });
    }
    if (opts.require_program_end_m_code && !hasProgramEndM && lastNonEmptyLine !== null) {
      issues.push({
        line_number: lastNonEmptyLine,
        kind: "missing_program_end_m_code",
        severity: "error",
        message: `Program lacks M30/M2/M99 terminator — controller will run past end-of-file`,
      });
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
        total_lines: lines.length,
        n_numbered_lines: nNumberedLines,
        o_numbers: oNumbers.sort((a, b) => a - b),
        min_n: minN,
        max_n: maxN,
        has_percent_start: hasPercentStart,
        has_percent_end: hasPercentEnd,
        has_program_end_m_code: hasProgramEndM,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: LineNumberOptions,
  ): { valid: boolean; errors: number; warnings: number; has_end: boolean } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      has_end: r.summary.has_program_end_m_code,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<LineNumberOptions> {
    return {
      require_percent: true,
      require_o_number: true,
      require_program_end_m_code: true,
      max_n_gap: 1000,
      warn_large_n_gap: true,
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

export const ppLineNumberSanityEngine = new PPLineNumberSanityEngine();
