/**
 * PPCallGraphValidatorEngine — Validate M98/M99/O-number call graph
 *
 * Call graphs in G-code are formed by M98 P<o> calls from one program
 * to another, terminated with M99. CAM posts that omit M99, call a
 * non-existent O-number, or emit a direct M98 loop crash the control —
 * often silently on older Fanucs that GOTO end-of-file and spray rapids.
 *
 * Checks:
 *   - callee_not_defined (error): M98 P<nn> but no matching O<nn>.
 *   - main_program_has_m99 (warning): main (first O) ends with M99 only.
 *     M99 returns to caller — a main has no caller, so control wraps
 *     to start and re-runs. Proper main terminator is M30 or M2.
 *   - excessive_repeat_count (warning): M98 P<nn> L<>999 — typo.
 *   - direct_recursion (error): O<nn> contains M98 P<nn>. Stack blows.
 *   - subprogram_missing_return (error): O<nn> defined but ends without
 *     M99 (or M30/M2).
 *   - forward_reference (info): M98 P<nn> before O<nn> defined in file.
 *     Most controls accept; older Fanuc 6M requires subs first.
 *   - nested_depth_exceeded (warning): call graph depth > max_depth
 *     (default 4 = Fanuc hard limit).
 *   - duplicate_definition (error): same O-number defined twice. Distinct
 *     from PPLineNumberSanityEngine's duplicate_o_number — here the focus
 *     is call-graph resolution impact.
 *
 * Scope — distinct from:
 *   - SubprogramEngine: GENERATES M98/M99 blocks (this engine VALIDATES).
 *   - SubprogramStructureEngine: extracts repeating patterns into subs.
 *   - PPLineNumberSanityEngine: program framing only, not the call graph.
 *   - PPModalStateTrackerEngine: tracks modal state, not calls.
 *
 * @module PPCallGraphValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type CGSeverity = "error" | "warning" | "info";

export interface CGIssue {
  line_number: number;
  kind:
    | "callee_not_defined"
    | "main_program_has_m99"
    | "excessive_repeat_count"
    | "direct_recursion"
    | "subprogram_missing_return"
    | "forward_reference"
    | "nested_depth_exceeded"
    | "duplicate_definition";
  severity: CGSeverity;
  message: string;
  details?: {
    caller?: number;
    callee?: number;
    repeat?: number;
    depth?: number;
    o_number?: number;
  };
}

export interface ProgramNode {
  o_number: number;
  start_line: number;
  end_line: number;
  is_main: boolean;
  has_return: boolean;       // M99
  has_program_end: boolean;  // M30 or M2
  calls: Array<{ target: number; repeat: number; line_number: number }>;
}

export interface CallGraphResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: CGIssue[];
  summary: {
    valid: boolean;
    program_count: number;
    main_program_count: number;
    subprogram_count: number;
    total_calls: number;
    max_nesting_depth: number;
    programs: Array<{
      o_number: number;
      is_main: boolean;
      has_return: boolean;
      call_count: number;
    }>;
  };
}

export interface CallGraphOptions {
  max_nesting_depth?: number;           // default 4 (Fanuc hard limit)
  max_repeat_count?: number;            // default 999
  check_forward_reference?: boolean;    // default true
  check_nesting_depth?: boolean;        // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPCallGraphValidatorEngine {
  /**
   * Validate subprogram calls and definitions.
   */
  validate(
    gcode: string,
    options?: CallGraphOptions,
  ): CallGraphResult {
    const opts = {
      max_nesting_depth: options?.max_nesting_depth ?? 4,
      max_repeat_count: options?.max_repeat_count ?? 999,
      check_forward_reference: options?.check_forward_reference ?? true,
      check_nesting_depth: options?.check_nesting_depth ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: CGIssue[] = [];

    // Pass 1: discover program boundaries and capture calls
    const programs: ProgramNode[] = [];
    const programByO: Map<number, ProgramNode> = new Map();
    const duplicateOWarned = new Set<number>();
    let current: ProgramNode | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // O-number definition
      const oMatch = code.match(/\bO(\d+)\b/);
      if (oMatch) {
        const oVal = parseInt(oMatch[1], 10);

        if (current !== null) {
          current.end_line = lineNum - 1;
        }

        if (programByO.has(oVal)) {
          if (!duplicateOWarned.has(oVal)) {
            issues.push({
              line_number: lineNum,
              kind: "duplicate_definition",
              severity: "error",
              message: `O${oVal} defined twice — controller uses first definition`,
              details: { o_number: oVal },
            });
            duplicateOWarned.add(oVal);
          }
          current = null;
          continue;
        }

        const def: ProgramNode = {
          o_number: oVal,
          start_line: lineNum,
          end_line: lines.length,
          is_main: programs.length === 0,
          has_return: false,
          has_program_end: false,
          calls: [],
        };
        programs.push(def);
        programByO.set(oVal, def);
        current = def;
        continue;
      }

      if (current === null) continue;

      // M98 call
      if (/\bM0*98\b/.test(code)) {
        const pMatch = code.match(/\bP(\d+)\b/);
        const lMatch = code.match(/\bL(\d+)\b/);
        if (pMatch) {
          const target = parseInt(pMatch[1], 10);
          const repeat = lMatch ? parseInt(lMatch[1], 10) : 1;
          current.calls.push({ target, repeat, line_number: lineNum });

          if (repeat > opts.max_repeat_count) {
            issues.push({
              line_number: lineNum,
              kind: "excessive_repeat_count",
              severity: "warning",
              message: `M98 P${target} L${repeat} — repeat ${repeat} exceeds ${opts.max_repeat_count}, likely typo`,
              details: { caller: current.o_number, callee: target, repeat },
            });
          }
        }
      }

      // M99 in current program
      if (/\bM0*99\b/.test(code)) {
        current.has_return = true;
      }

      // M30 / M2 in current program
      if (/\bM0*(2|30)\b/.test(code)) {
        current.has_program_end = true;
      }
    }

    if (current !== null) {
      current.end_line = lines.length;
    }

    // Pass 2: per-program issue checks
    let totalCalls = 0;
    for (const def of programs) {
      totalCalls += def.calls.length;

      if (def.is_main && def.has_return && !def.has_program_end) {
        issues.push({
          line_number: def.start_line,
          kind: "main_program_has_m99",
          severity: "warning",
          message: `Main program O${def.o_number} ends with M99 but no M30/M2 — control wraps to start and reruns`,
          details: { o_number: def.o_number },
        });
      }

      if (!def.is_main && !def.has_return && !def.has_program_end) {
        issues.push({
          line_number: def.end_line,
          kind: "subprogram_missing_return",
          severity: "error",
          message: `Subprogram O${def.o_number} has no M99/M30/M2 — control runs past sub end`,
          details: { o_number: def.o_number },
        });
      }

      for (const call of def.calls) {
        if (call.target === def.o_number) {
          issues.push({
            line_number: call.line_number,
            kind: "direct_recursion",
            severity: "error",
            message: `O${def.o_number} calls itself via M98 P${call.target} — stack overflow`,
            details: { caller: def.o_number, callee: call.target },
          });
        }
      }
    }

    // Pass 3: resolve call targets
    for (const def of programs) {
      for (const call of def.calls) {
        const callee = programByO.get(call.target);
        if (!callee) {
          issues.push({
            line_number: call.line_number,
            kind: "callee_not_defined",
            severity: "error",
            message: `M98 P${call.target} — no O${call.target} definition in file`,
            details: { caller: def.o_number, callee: call.target },
          });
        } else if (
          opts.check_forward_reference &&
          callee.start_line > call.line_number
        ) {
          issues.push({
            line_number: call.line_number,
            kind: "forward_reference",
            severity: "info",
            message: `M98 P${call.target} calls subprogram defined later (line ${callee.start_line}) — some older controllers require subs first`,
            details: { caller: def.o_number, callee: call.target },
          });
        }
      }
    }

    // Pass 4: DFS depth
    let maxDepth = 0;
    if (opts.check_nesting_depth) {
      const mains = programs.filter((p) => p.is_main);
      for (const main of mains) {
        maxDepth = Math.max(
          maxDepth,
          this.computeMaxDepth(main, programByO, new Set()),
        );
      }
      if (maxDepth > opts.max_nesting_depth) {
        const mainProg = mains[0];
        issues.push({
          line_number: mainProg?.start_line ?? 1,
          kind: "nested_depth_exceeded",
          severity: "warning",
          message: `Call depth ${maxDepth} exceeds ${opts.max_nesting_depth} (Fanuc hard limit 4)`,
          details: { depth: maxDepth },
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
        program_count: programs.length,
        main_program_count: programs.filter((p) => p.is_main).length,
        subprogram_count: programs.filter((p) => !p.is_main).length,
        total_calls: totalCalls,
        max_nesting_depth: maxDepth,
        programs: programs.map((p) => ({
          o_number: p.o_number,
          is_main: p.is_main,
          has_return: p.has_return,
          call_count: p.calls.length,
        })),
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: CallGraphOptions,
  ): { valid: boolean; errors: number; warnings: number; program_count: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      program_count: r.summary.program_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<CallGraphOptions> {
    return {
      max_nesting_depth: 4,
      max_repeat_count: 999,
      check_forward_reference: true,
      check_nesting_depth: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private computeMaxDepth(
    def: ProgramNode,
    byO: Map<number, ProgramNode>,
    visiting: Set<number>,
  ): number {
    if (visiting.has(def.o_number)) return 0; // recursion guard
    visiting.add(def.o_number);
    let max = 1;
    for (const call of def.calls) {
      const callee = byO.get(call.target);
      if (!callee) continue;
      const d = 1 + this.computeMaxDepth(callee, byO, visiting);
      if (d > max) max = d;
    }
    visiting.delete(def.o_number);
    return max;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppCallGraphValidatorEngine = new PPCallGraphValidatorEngine();
