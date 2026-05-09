/**
 * PPMacroFlowValidatorEngine — Validate Fanuc macro flow control
 *
 * Fanuc Custom Macro B (and Okuma OSP A/B/C) support parametric
 * programming with WHILE/DO/END loops and GOTO jumps. The loop-label
 * and jump-target rules are strict, and a malformed control block
 * produces the classic silent-drift failures:
 *
 *   DO 1   — opens a labelled loop (label 1..3 on Fanuc)
 *   END 1  — closes the loop whose DO label matches
 *   WHILE[cond] DO n — while-loop header; must be followed by a
 *                       body ended with ENDn
 *   GOTO Nnnn — unconditional jump to block Nnnn (must exist)
 *   IF[cond] GOTO Nnnn — conditional jump
 *
 * Failure modes this validator catches:
 *   - do_without_end (error): DO n encountered but no matching END n
 *     before end-of-program. Control drops through or alarms.
 *   - end_without_do (error): END n with no preceding open DO n.
 *   - do_label_out_of_range (error): Fanuc accepts DO 1..3 only
 *     (configurable). DO 4/DO 0 alarm.
 *   - nested_do_conflict (error): DO n opened twice in the same
 *     nesting scope — inner loop clobbers outer's label.
 *   - unmatched_while_do (error): WHILE[...] without a trailing DO n
 *     on the same block.
 *   - goto_target_missing (error): GOTO Nnnn where Nnnn is not a
 *     block label anywhere in the current program/subprogram.
 *   - while_in_conditional (info, opt-in): WHILE inside IF/GOTO —
 *     subtle control-flow tangle, flag for human review.
 *
 * Scope — distinct from:
 *   - PPMacroVariableValidatorEngine: #n variable semantics.
 *   - PPCallGraphValidatorEngine: M98 subprogram call graph.
 *   - PPLineNumberSanityEngine: N-number monotonicity.
 *
 * @module PPMacroFlowValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type MFSeverity = "error" | "warning" | "info";

export interface MFIssue {
  line_number: number;
  kind:
    | "do_without_end"
    | "end_without_do"
    | "do_label_out_of_range"
    | "nested_do_conflict"
    | "unmatched_while_do"
    | "goto_target_missing"
    | "while_in_conditional";
  severity: MFSeverity;
  message: string;
  details?: {
    do_label?: number;
    n_target?: number;
    open_line?: number;
    close_line?: number;
  };
}

export interface MFResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: MFIssue[];
  summary: {
    valid: boolean;
    do_count: number;
    end_count: number;
    while_count: number;
    goto_count: number;
    if_count: number;
    balanced: boolean;
    max_nesting: number;
  };
}

export interface MFOptions {
  check_do_end_balance?: boolean;      // default true
  check_do_label_range?: boolean;      // default true
  check_nested_conflict?: boolean;     // default true
  check_while_do?: boolean;            // default true
  check_goto_targets?: boolean;        // default true
  check_while_in_conditional?: boolean; // default false (info)
  max_do_label?: number;               // default 3 (Fanuc standard)
  min_do_label?: number;               // default 1
}

// ── Engine ────────────────────────────────────────────────────────────

interface OpenDo {
  label: number;
  line: number;
}

export class PPMacroFlowValidatorEngine {
  /**
   * Validate macro flow control.
   */
  validate(gcode: string, options?: MFOptions): MFResult {
    const opts = {
      check_do_end_balance: options?.check_do_end_balance ?? true,
      check_do_label_range: options?.check_do_label_range ?? true,
      check_nested_conflict: options?.check_nested_conflict ?? true,
      check_while_do: options?.check_while_do ?? true,
      check_goto_targets: options?.check_goto_targets ?? true,
      check_while_in_conditional:
        options?.check_while_in_conditional ?? false,
      max_do_label: options?.max_do_label ?? 3,
      min_do_label: options?.min_do_label ?? 1,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: MFIssue[] = [];

    // First pass: collect all N-labels in the program for GOTO targets
    const nLabels = new Set<number>();
    for (const raw of lines) {
      const code = this.stripComments(raw).toUpperCase();
      const m = code.match(/^\s*N(\d+)\b/);
      if (m) nLabels.add(parseInt(m[1], 10));
    }

    // Second pass: analyze flow control
    const doStack: OpenDo[] = [];
    let maxNesting = 0;

    let doCount = 0;
    let endCount = 0;
    let whileCount = 0;
    let gotoCount = 0;
    let ifCount = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const hasWhile = /\bWHILE\s*\[/.test(code);
      const hasIf = /\bIF\s*\[/.test(code);
      const hasGoto = /\bGOTO\s*\d/.test(code);

      if (hasWhile) whileCount++;
      if (hasIf) ifCount++;
      if (hasGoto) gotoCount++;

      // DO label extraction (e.g., "WHILE[...] DO 1", "DO 2")
      const doMatch = code.match(/\bDO\s+(\d+)/);
      const endMatch = code.match(/\bEND\s+(\d+)/);

      // unmatched_while_do: WHILE on block without trailing DO n
      if (hasWhile && !doMatch && opts.check_while_do) {
        issues.push({
          line_number: lineNum,
          kind: "unmatched_while_do",
          severity: "error",
          message: `WHILE[...] without trailing DO n on same block`,
        });
      }

      // while_in_conditional: WHILE inside an IF-GOTO body
      if (
        opts.check_while_in_conditional &&
        hasWhile &&
        hasIf &&
        hasGoto
      ) {
        issues.push({
          line_number: lineNum,
          kind: "while_in_conditional",
          severity: "info",
          message: `WHILE present on same block as IF/GOTO — tangled control flow`,
        });
      }

      // DO label handling
      if (doMatch) {
        const label = parseInt(doMatch[1], 10);
        doCount++;

        // do_label_out_of_range
        if (
          opts.check_do_label_range &&
          (label < opts.min_do_label || label > opts.max_do_label)
        ) {
          issues.push({
            line_number: lineNum,
            kind: "do_label_out_of_range",
            severity: "error",
            message: `DO ${label} out of range (${opts.min_do_label}..${opts.max_do_label})`,
            details: { do_label: label },
          });
        }

        // nested_do_conflict: the same DO label is already open in the
        // enclosing scope.
        if (
          opts.check_nested_conflict &&
          doStack.some((d) => d.label === label)
        ) {
          const outer = doStack.find((d) => d.label === label)!;
          issues.push({
            line_number: lineNum,
            kind: "nested_do_conflict",
            severity: "error",
            message: `DO ${label} nested inside unclosed DO ${label} from line ${outer.line}`,
            details: {
              do_label: label,
              open_line: outer.line,
            },
          });
        }

        doStack.push({ label, line: lineNum });
        if (doStack.length > maxNesting) maxNesting = doStack.length;
      }

      // END label handling
      if (endMatch) {
        const label = parseInt(endMatch[1], 10);
        endCount++;

        // end_without_do
        const topIdx = (() => {
          for (let i = doStack.length - 1; i >= 0; i--) {
            if (doStack[i].label === label) return i;
          }
          return -1;
        })();
        if (topIdx < 0 && opts.check_do_end_balance) {
          issues.push({
            line_number: lineNum,
            kind: "end_without_do",
            severity: "error",
            message: `END ${label} with no matching open DO ${label}`,
            details: { do_label: label, close_line: lineNum },
          });
        } else if (topIdx >= 0) {
          // Close the matching DO (allow out-of-order closing — Fanuc
          // enforces strict nesting; any inner unclosed DOs between
          // this END and the matched open DO are orphaned and will be
          // flagged on their own as do_without_end when the program
          // ends.)
          doStack.splice(topIdx, 1);
        }
      }

      // GOTO target resolution
      if (opts.check_goto_targets && hasGoto) {
        const gotoMatch = code.match(/\bGOTO\s*(\d+)/);
        if (gotoMatch) {
          const target = parseInt(gotoMatch[1], 10);
          if (!nLabels.has(target)) {
            issues.push({
              line_number: lineNum,
              kind: "goto_target_missing",
              severity: "error",
              message: `GOTO N${target} — no block with that N-number found`,
              details: { n_target: target },
            });
          }
        }
      }
    }

    // do_without_end: any DOs left on the stack
    if (opts.check_do_end_balance) {
      for (const open of doStack) {
        issues.push({
          line_number: open.line,
          kind: "do_without_end",
          severity: "error",
          message: `DO ${open.label} opened on line ${open.line} never closed with END ${open.label}`,
          details: { do_label: open.label, open_line: open.line },
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
        do_count: doCount,
        end_count: endCount,
        while_count: whileCount,
        goto_count: gotoCount,
        if_count: ifCount,
        balanced: doCount === endCount && doStack.length === 0,
        max_nesting: maxNesting,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: MFOptions,
  ): {
    valid: boolean;
    errors: number;
    balanced: boolean;
    max_nesting: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      balanced: r.summary.balanced,
      max_nesting: r.summary.max_nesting,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<MFOptions> {
    return {
      check_do_end_balance: true,
      check_do_label_range: true,
      check_nested_conflict: true,
      check_while_do: true,
      check_goto_targets: true,
      check_while_in_conditional: false,
      max_do_label: 3,
      min_do_label: 1,
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

export const ppMacroFlowValidatorEngine = new PPMacroFlowValidatorEngine();
