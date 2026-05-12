/**
 * PPMacroVariableValidatorEngine — Validate Fanuc macro variables
 *
 * Fanuc B custom macros use # variables (#1-#33 local, #100-#999 common,
 * #1000+ system). Typical bugs:
 *   - Reading #var before any assignment — value is null on reboot, 0
 *     on classic Fanucs, last-value on 30i. Behavior is parameter-
 *     dependent (#6000 bit 5) and nearly impossible to debug live.
 *   - Dividing by a macro variable that is statically 0 — #3 = #4 / #5
 *     where #5 was just assigned 0 a few lines above. Control alarms
 *     PS0112 (divide by zero) mid-cycle.
 *   - Writing to system variables (#3000-#3099 tool offsets, #5021+
 *     machine position) from user code — usually a typo.
 *   - Unbalanced IF/THEN/ENDIF or WHILE/DO/END — control runs past
 *     the block end and executes random tool moves.
 *   - GOTO Nxxx where Nxxx is not defined — alarm PS0128.
 *
 * Checks:
 *   - undefined_variable_read (error): reference to #n before any
 *     #n = ... assignment in the same program scope.
 *   - division_by_macro_zero (error): #a / #b where #b has been
 *     statically assigned 0 (best-effort static analysis).
 *   - reserved_variable_write (warning): assigning to #3000-#3099,
 *     #5021-#5100, #6000+ (system protected zones).
 *   - unbalanced_if_endif (error): count(IF) != count(ENDIF).
 *   - unbalanced_while_end (error): WHILE DOn with no matching ENDn.
 *   - goto_to_nonexistent_label (error): GOTO Nxxx with no Nxxx seq
 *     number in the program.
 *
 * Scope — distinct from:
 *   - MacroValidationEngine: simulates Okuma V-var parametric macros
 *     symbolically to verify CAM-to-macro conversion correctness.
 *   - MacroProgramIntelligenceEngine: intelligence/recommendation layer
 *     for macro programming strategies.
 *   - ProgramMacroConverterEngine: converts fixed programs to macros.
 *   - OkumaMacroHeaderGeneratorEngine: generates Okuma V-var headers.
 *
 *   This engine is a syntax/semantics VALIDATOR for Fanuc # variables
 *   against the rendered G-code text — not a converter or generator.
 *
 * @module PPMacroVariableValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type MacroSeverity = "error" | "warning" | "info";

export interface MacroIssue {
  line_number: number;
  kind:
    | "undefined_variable_read"
    | "division_by_macro_zero"
    | "reserved_variable_write"
    | "unbalanced_if_endif"
    | "unbalanced_while_end"
    | "goto_to_nonexistent_label";
  severity: MacroSeverity;
  message: string;
  details?: {
    variable?: number;
    label?: number;
    if_count?: number;
    endif_count?: number;
    while_count?: number;
    end_count?: number;
  };
}

export interface MacroResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: MacroIssue[];
  summary: {
    valid: boolean;
    macro_variable_count: number;      // distinct #n seen
    assignment_count: number;          // #n = ... occurrences
    read_count: number;                // #n read occurrences
    if_count: number;
    endif_count: number;
    while_count: number;
    end_count: number;
    goto_count: number;
    labels: number[];                  // N-labels targetable by GOTO
  };
}

export interface MacroOptions {
  check_undefined?: boolean;           // default true
  check_divide_by_zero?: boolean;      // default true
  check_reserved_writes?: boolean;     // default true
  check_balanced_control?: boolean;    // default true (IF/ENDIF, WHILE/END)
  check_goto_targets?: boolean;        // default true
  /** Variable numbers considered system-reserved for writes (Fanuc default). */
  reserved_ranges?: Array<[number, number]>;
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPMacroVariableValidatorEngine {
  /** Default Fanuc reserved-write ranges (system variables). */
  private static readonly DEFAULT_RESERVED: Array<[number, number]> = [
    [3000, 3099],   // alarm/display variables (writes legal but sparingly used)
    [5021, 5100],   // machine position / axis data (read-only on most controls)
    [5201, 5400],   // work offsets (writable but almost always a bug in user code)
    [6000, 6999],   // parameters (system)
  ];

  /**
   * Validate macro variable usage.
   */
  validate(gcode: string, options?: MacroOptions): MacroResult {
    const opts = {
      check_undefined: options?.check_undefined ?? true,
      check_divide_by_zero: options?.check_divide_by_zero ?? true,
      check_reserved_writes: options?.check_reserved_writes ?? true,
      check_balanced_control: options?.check_balanced_control ?? true,
      check_goto_targets: options?.check_goto_targets ?? true,
      reserved_ranges:
        options?.reserved_ranges ?? PPMacroVariableValidatorEngine.DEFAULT_RESERVED,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: MacroIssue[] = [];
    const assignedVars: Map<number, number> = new Map();  // #n -> last assigned numeric value (or NaN if non-literal)
    const readBeforeAssign: Set<number> = new Set();
    const assignedVarsEver: Set<number> = new Set();
    const labels: Set<number> = new Set();
    const gotoTargets: Array<{ label: number; line: number }> = [];
    let ifCount = 0;
    let endifCount = 0;
    let whileCount = 0;
    let endCount = 0;
    let assignmentCount = 0;
    let readCount = 0;

    // Pass 1: discover labels (N-numbers used as GOTO targets are sequence numbers)
    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;
      const nMatch = code.match(/^\s*N(\d+)\b/);
      if (nMatch) labels.add(parseInt(nMatch[1], 10));
    }

    // Pass 2: variable + control flow + goto scanning
    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Assignment: #n = <expr>  (capture literal values only; others stored as NaN)
      const assignRegex = /#(\d+)\s*=\s*([^;]+?)(?:\s|$|#)/g;
      let aMatch: RegExpExecArray | null;
      while ((aMatch = assignRegex.exec(code)) !== null) {
        const varNum = parseInt(aMatch[1], 10);
        const rhs = aMatch[2].trim();
        assignmentCount++;
        assignedVarsEver.add(varNum);
        const literal = rhs.match(/^-?\d+\.?\d*$/);
        assignedVars.set(varNum, literal ? parseFloat(rhs) : Number.NaN);

        // reserved_variable_write
        if (opts.check_reserved_writes) {
          for (const [lo, hi] of opts.reserved_ranges) {
            if (varNum >= lo && varNum <= hi) {
              issues.push({
                line_number: lineNum,
                kind: "reserved_variable_write",
                severity: "warning",
                message: `Writing to #${varNum} — in reserved range [${lo}-${hi}]; typically read-only or system-controlled`,
                details: { variable: varNum },
              });
              break;
            }
          }
        }
      }

      // Read: any #n that isn't the LHS of an assignment — count occurrences in non-assignment context
      // Strategy: replace all "#n = ..." with blanks, then grep for remaining #n references
      const stripped = code.replace(/#\d+\s*=\s*[^#;]+/g, " ");
      const readRegex = /#(\d+)/g;
      let rMatch: RegExpExecArray | null;
      while ((rMatch = readRegex.exec(stripped)) !== null) {
        const varNum = parseInt(rMatch[1], 10);
        readCount++;
        if (opts.check_undefined && !assignedVarsEver.has(varNum) && varNum < 1000) {
          // Skip system vars (#1000+) which are inherently defined
          if (!readBeforeAssign.has(varNum)) {
            readBeforeAssign.add(varNum);
            issues.push({
              line_number: lineNum,
              kind: "undefined_variable_read",
              severity: "error",
              message: `#${varNum} read before any assignment — value unpredictable (null/0/stale depending on control)`,
              details: { variable: varNum },
            });
          }
        }
      }

      // division_by_macro_zero: look for / #n where #n is known-zero
      if (opts.check_divide_by_zero) {
        const divRegex = /\/\s*#(\d+)/g;
        let dMatch: RegExpExecArray | null;
        while ((dMatch = divRegex.exec(code)) !== null) {
          const divisorVar = parseInt(dMatch[1], 10);
          const val = assignedVars.get(divisorVar);
          if (val === 0) {
            issues.push({
              line_number: lineNum,
              kind: "division_by_macro_zero",
              severity: "error",
              message: `Division by #${divisorVar} — most recent assignment is 0, runtime alarm PS0112`,
              details: { variable: divisorVar },
            });
          }
        }
      }

      // Control flow balance
      if (/\bIF\s*\[/.test(code)) ifCount++;
      if (/\bENDIF\b/.test(code)) endifCount++;
      if (/\bWHILE\s*\[/.test(code)) whileCount++;
      if (/\bEND\d+\b/.test(code)) endCount++;

      // GOTO collection
      const gotoRegex = /\bGOTO\s+N?(\d+)/g;
      let gMatch: RegExpExecArray | null;
      while ((gMatch = gotoRegex.exec(code)) !== null) {
        gotoTargets.push({ label: parseInt(gMatch[1], 10), line: lineNum });
      }
    }

    // Balance checks
    if (opts.check_balanced_control && ifCount !== endifCount) {
      issues.push({
        line_number: 1,
        kind: "unbalanced_if_endif",
        severity: "error",
        message: `Unbalanced IF/ENDIF — ${ifCount} IF vs ${endifCount} ENDIF`,
        details: { if_count: ifCount, endif_count: endifCount },
      });
    }
    if (opts.check_balanced_control && whileCount !== endCount) {
      issues.push({
        line_number: 1,
        kind: "unbalanced_while_end",
        severity: "error",
        message: `Unbalanced WHILE/END — ${whileCount} WHILE vs ${endCount} END`,
        details: { while_count: whileCount, end_count: endCount },
      });
    }

    // GOTO target validation
    if (opts.check_goto_targets) {
      for (const t of gotoTargets) {
        if (!labels.has(t.label)) {
          issues.push({
            line_number: t.line,
            kind: "goto_to_nonexistent_label",
            severity: "error",
            message: `GOTO N${t.label} — no N${t.label} sequence number in program`,
            details: { label: t.label },
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
        macro_variable_count: assignedVarsEver.size,
        assignment_count: assignmentCount,
        read_count: readCount,
        if_count: ifCount,
        endif_count: endifCount,
        while_count: whileCount,
        end_count: endCount,
        goto_count: gotoTargets.length,
        labels: Array.from(labels).sort((a, b) => a - b),
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: MacroOptions,
  ): { valid: boolean; errors: number; warnings: number; macro_variable_count: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      macro_variable_count: r.summary.macro_variable_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<MacroOptions> {
    return {
      check_undefined: true,
      check_divide_by_zero: true,
      check_reserved_writes: true,
      check_balanced_control: true,
      check_goto_targets: true,
      reserved_ranges: PPMacroVariableValidatorEngine.DEFAULT_RESERVED,
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

export const ppMacroVariableValidatorEngine = new PPMacroVariableValidatorEngine();
