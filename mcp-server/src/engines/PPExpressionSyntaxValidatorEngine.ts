/**
 * PPExpressionSyntaxValidatorEngine — Validate Fanuc Custom Macro B
 * expression syntax
 *
 * Fanuc Custom Macro B (and compatible Okuma/Haas/Brother dialects)
 * support arithmetic, trig, and logical expressions inside square
 * brackets. The syntax rules are strict and silent failures are the
 * norm:
 *
 *   [#1 + #2]        — arithmetic
 *   [SIN[#1] + 1.5]  — function call with bracketed argument
 *   [[#1 + #2] * #3] — nested brackets (Fanuc caps at 5 levels)
 *   [#1 EQ #2]       — comparison (EQ/NE/LT/LE/GT/GE)
 *   [[#1 + 2]/[#2 - 3]] — division; zero-literal divisor alarms
 *
 * Controller behavior when expression is malformed:
 *   - Fanuc 0i-F: "FORMAT ERROR" (PS0003) — program won't load.
 *   - Fanuc 30i/31i: "INVALID CHARACTER" alarm.
 *   - Okuma OSP-P300: "MACRO EXPRESSION ERROR".
 *   - Haas: often accepts but computes garbage, causing tool crashes.
 *
 * Failure modes this validator catches:
 *   - unmatched_open_bracket (error): `[` without matching `]`.
 *   - unmatched_close_bracket (error): `]` without opening `[`.
 *   - deep_bracket_nesting (warning): nesting depth exceeds max_depth
 *     (default 5, Fanuc hard limit).
 *   - empty_brackets (warning): `[]` with no payload.
 *   - operator_at_boundary (error): `[+5]` or `[5+]` — operator without
 *     left or right operand.
 *   - consecutive_operators (error): `[5 + + 3]` — ambiguous.
 *   - unknown_function (warning): unknown function name. Recognised:
 *     SIN COS TAN ASIN ACOS ATAN SQRT ABS ROUND FIX FUP LN EXP ADP
 *     BIN BCD POW MOD.
 *   - divide_by_literal_zero (error): `[x / 0]` literal-zero divisor.
 *     Controller alarms on execution — always a logic bug.
 *   - bracket_in_comment (info): `[` inside `(...)` comment has no
 *     effect; flag for style consistency.
 *
 * Scope — distinct from:
 *   - PPMacroVariableValidatorEngine: #n variable semantics, scope,
 *     read-only classes. This engine is bracket/operator syntax only.
 *   - PPMacroFlowValidatorEngine: WHILE/DO/END/GOTO structure. We
 *     validate the boolean expression INSIDE `WHILE[...]`.
 *   - PPGCodeLintEngine: generic parenthesis balance for comments.
 *     We validate square-bracket expressions specifically.
 *
 * @module PPExpressionSyntaxValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ESSeverity = "error" | "warning" | "info";

export interface ESIssue {
  line_number: number;
  column?: number;
  kind:
    | "unmatched_open_bracket"
    | "unmatched_close_bracket"
    | "deep_bracket_nesting"
    | "empty_brackets"
    | "operator_at_boundary"
    | "consecutive_operators"
    | "unknown_function"
    | "divide_by_literal_zero"
    | "bracket_in_comment";
  severity: ESSeverity;
  message: string;
  details?: {
    depth?: number;
    function_name?: string;
    expression?: string;
  };
}

export interface ESResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ESIssue[];
  summary: {
    valid: boolean;
    expressions_scanned: number;
    max_nesting_observed: number;
    functions_used: string[];
  };
}

export interface ESOptions {
  check_bracket_balance?: boolean;    // default true
  check_nesting_depth?: boolean;      // default true
  check_empty_brackets?: boolean;     // default true
  check_operator_boundary?: boolean;  // default true
  check_consecutive_operators?: boolean; // default true
  check_unknown_functions?: boolean;  // default true
  check_divide_by_zero?: boolean;     // default true
  check_bracket_in_comment?: boolean; // default false (info)
  max_nesting_depth?: number;         // default 5 (Fanuc hard limit)
  known_functions?: string[];         // default: standard Fanuc Custom B set
}

// ── Engine ────────────────────────────────────────────────────────────

const DEFAULT_FUNCTIONS = [
  "SIN", "COS", "TAN",
  "ASIN", "ACOS", "ATAN",
  "SQRT", "ABS",
  "ROUND", "FIX", "FUP",
  "LN", "EXP",
  "ADP", "BIN", "BCD",
  "POW", "MOD",
];

const OPERATORS = [
  "+", "-", "*", "/",
  "EQ", "NE", "LT", "LE", "GT", "GE",
  "AND", "OR", "XOR",
];

export class PPExpressionSyntaxValidatorEngine {
  /**
   * Validate macro expression syntax in a G-code program.
   */
  validate(gcode: string, options?: ESOptions): ESResult {
    const opts = {
      check_bracket_balance: options?.check_bracket_balance ?? true,
      check_nesting_depth: options?.check_nesting_depth ?? true,
      check_empty_brackets: options?.check_empty_brackets ?? true,
      check_operator_boundary: options?.check_operator_boundary ?? true,
      check_consecutive_operators:
        options?.check_consecutive_operators ?? true,
      check_unknown_functions: options?.check_unknown_functions ?? true,
      check_divide_by_zero: options?.check_divide_by_zero ?? true,
      check_bracket_in_comment: options?.check_bracket_in_comment ?? false,
      max_nesting_depth: options?.max_nesting_depth ?? 5,
      known_functions: options?.known_functions ?? DEFAULT_FUNCTIONS,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: ESIssue[] = [];
    let expressionsScanned = 0;
    let maxNestingObserved = 0;
    const functionsUsed = new Set<string>();

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;

      // Bracket-in-comment detection (before stripping)
      if (opts.check_bracket_in_comment) {
        const commentMatches = raw.matchAll(/\(([^)]*)\)/g);
        for (const cm of commentMatches) {
          if (cm[1].includes("[") || cm[1].includes("]")) {
            issues.push({
              line_number: lineNum,
              kind: "bracket_in_comment",
              severity: "info",
              message: `Bracket inside comment at line ${lineNum}`,
            });
            break;
          }
        }
      }

      // Strip comments for expression analysis
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Function-name detection at line level (pattern [A-Z]+[)
      const lineFnMatches = code.matchAll(/([A-Z]+)\s*\[/g);
      for (const fm of lineFnMatches) {
        const fn = fm[1];
        if (
          fn === "IF" ||
          fn === "WHILE" ||
          fn === "AND" ||
          fn === "OR" ||
          fn === "XOR" ||
          fn === "EQ" ||
          fn === "NE" ||
          fn === "LT" ||
          fn === "LE" ||
          fn === "GT" ||
          fn === "GE"
        ) {
          continue;
        }
        functionsUsed.add(fn);
        if (
          opts.check_unknown_functions &&
          !opts.known_functions.includes(fn)
        ) {
          issues.push({
            line_number: lineNum,
            kind: "unknown_function",
            severity: "warning",
            message: `Unknown function '${fn}[...]' at line ${lineNum}`,
            details: { function_name: fn },
          });
        }
      }

      // Bracket balance + nesting depth per line
      let depth = 0;
      let lineMaxDepth = 0;
      const bracketStack: number[] = [];
      const expressionSegments: { start: number; content: string }[] = [];
      let currentStart = -1;

      for (let col = 0; col < code.length; col++) {
        const ch = code[col];
        if (ch === "[") {
          depth++;
          if (depth > lineMaxDepth) lineMaxDepth = depth;
          bracketStack.push(col);
          if (currentStart < 0) currentStart = col;
        } else if (ch === "]") {
          if (bracketStack.length === 0) {
            if (opts.check_bracket_balance) {
              issues.push({
                line_number: lineNum,
                column: col + 1,
                kind: "unmatched_close_bracket",
                severity: "error",
                message: `Unmatched ']' at line ${lineNum} col ${col + 1}`,
              });
            }
          } else {
            const openCol = bracketStack.pop()!;
            if (depth === 1 && currentStart >= 0) {
              // Finished outermost bracket — record for analysis
              expressionSegments.push({
                start: currentStart,
                content: code.substring(currentStart, col + 1),
              });
              currentStart = -1;
            }
            // Empty brackets [] at any depth
            const inside = code.substring(openCol + 1, col).trim();
            if (
              opts.check_empty_brackets &&
              inside.length === 0
            ) {
              issues.push({
                line_number: lineNum,
                column: openCol + 1,
                kind: "empty_brackets",
                severity: "warning",
                message: `Empty '[]' at line ${lineNum} col ${openCol + 1}`,
              });
            }
          }
          depth--;
        }
      }

      // Unmatched open bracket(s) remaining
      if (opts.check_bracket_balance) {
        for (const col of bracketStack) {
          issues.push({
            line_number: lineNum,
            column: col + 1,
            kind: "unmatched_open_bracket",
            severity: "error",
            message: `Unmatched '[' at line ${lineNum} col ${col + 1}`,
          });
        }
      }

      // Deep nesting
      if (
        opts.check_nesting_depth &&
        lineMaxDepth > opts.max_nesting_depth
      ) {
        issues.push({
          line_number: lineNum,
          kind: "deep_bracket_nesting",
          severity: "warning",
          message: `Bracket nesting depth ${lineMaxDepth} exceeds ${opts.max_nesting_depth} (controller limit)`,
          details: { depth: lineMaxDepth },
        });
      }
      if (lineMaxDepth > maxNestingObserved) maxNestingObserved = lineMaxDepth;

      // Analyze each outermost expression segment
      for (const seg of expressionSegments) {
        expressionsScanned++;
        this.analyzeExpression(seg.content, lineNum, opts, issues, functionsUsed);
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
        expressions_scanned: expressionsScanned,
        max_nesting_observed: maxNestingObserved,
        functions_used: Array.from(functionsUsed).sort(),
      },
    };
  }

  /**
   * Quick pass/fail.
   */
  quickCheck(
    gcode: string,
    options?: ESOptions,
  ): {
    valid: boolean;
    errors: number;
    max_depth: number;
    expressions: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      max_depth: r.summary.max_nesting_observed,
      expressions: r.summary.expressions_scanned,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<ESOptions> {
    return {
      check_bracket_balance: true,
      check_nesting_depth: true,
      check_empty_brackets: true,
      check_operator_boundary: true,
      check_consecutive_operators: true,
      check_unknown_functions: true,
      check_divide_by_zero: true,
      check_bracket_in_comment: false,
      max_nesting_depth: 5,
      known_functions: DEFAULT_FUNCTIONS,
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
   * Analyze a single bracketed expression for operator/function issues.
   * Expects `expr` to include the outer `[...]`.
   */
  private analyzeExpression(
    expr: string,
    lineNum: number,
    opts: Required<ESOptions>,
    issues: ESIssue[],
    _functionsUsed: Set<string>,
  ): void {
    // Strip outer brackets for analysis
    const inner = expr.substring(1, expr.length - 1).trim();
    if (inner.length === 0) return; // already flagged as empty_brackets

    // Tokenize the inner expression into a coarse list of op / operand.
    // Token definition:
    //   - #\d+      (macro var)
    //   - -?\d+\.?\d*  (number, optionally negative)
    //   - +, -, *, /   (binary ops; - may also be unary at boundary)
    //   - EQ/NE/LT/LE/GT/GE/AND/OR/XOR  (word ops)
    //   - SIN/... [   (function call — treated as a single operand)
    //   - [ ... ]     (parenthesized sub-expression — operand)
    const tokens = this.tokenize(inner);

    // operator_at_boundary: starts or ends with binary op
    if (tokens.length > 0 && opts.check_operator_boundary) {
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      if (this.isBinaryOperator(first)) {
        issues.push({
          line_number: lineNum,
          kind: "operator_at_boundary",
          severity: "error",
          message: `Expression starts with operator '${first}' at line ${lineNum}`,
          details: { expression: expr },
        });
      }
      if (this.isBinaryOperator(last)) {
        issues.push({
          line_number: lineNum,
          kind: "operator_at_boundary",
          severity: "error",
          message: `Expression ends with operator '${last}' at line ${lineNum}`,
          details: { expression: expr },
        });
      }
    }

    // consecutive_operators: two binary ops in a row. We allow '-' to
    // act as unary right after another operator (5 + -3) without flag.
    if (opts.check_consecutive_operators) {
      for (let i = 0; i < tokens.length - 1; i++) {
        const a = tokens[i];
        const b = tokens[i + 1];
        if (this.isBinaryOperator(a) && this.isBinaryOperator(b)) {
          // Allow: `+` `-` or `*` `-` etc. where second is `-` (unary)
          if (b === "-") continue;
          issues.push({
            line_number: lineNum,
            kind: "consecutive_operators",
            severity: "error",
            message: `Consecutive operators '${a} ${b}' at line ${lineNum}`,
            details: { expression: expr },
          });
        }
      }
    }

    // divide_by_literal_zero: `/` immediately followed by zero literal
    if (opts.check_divide_by_zero) {
      for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i] === "/" && this.isZeroLiteral(tokens[i + 1])) {
          issues.push({
            line_number: lineNum,
            kind: "divide_by_literal_zero",
            severity: "error",
            message: `Division by literal zero at line ${lineNum}`,
            details: { expression: expr },
          });
        }
      }
    }
  }

  private tokenize(expr: string): string[] {
    const tokens: string[] = [];
    // Replace nested [...] with a placeholder so it's one token
    let buf = "";
    let depth = 0;
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === "[") {
        if (depth === 0) {
          // Flush buffer
          if (buf.trim().length > 0) {
            tokens.push(...this.splitTokens(buf));
            buf = "";
          }
        }
        depth++;
        buf += ch;
      } else if (ch === "]") {
        depth--;
        buf += ch;
        if (depth === 0) {
          tokens.push("(subexpr)");
          buf = "";
        }
      } else {
        buf += ch;
      }
      i++;
    }
    if (buf.trim().length > 0) {
      tokens.push(...this.splitTokens(buf));
    }
    return tokens;
  }

  private splitTokens(chunk: string): string[] {
    const result: string[] = [];
    // Simple regex-based tokenization
    const re = /(#\d+|-?\d+\.?\d*|[+\-*/]|[A-Z]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) {
      const t = m[1].trim();
      if (t.length > 0) result.push(t);
    }
    return result;
  }

  private isBinaryOperator(t: string | undefined): boolean {
    if (!t) return false;
    return OPERATORS.includes(t);
  }

  private isZeroLiteral(t: string | undefined): boolean {
    if (!t) return false;
    // Match 0, 0., 0.0, 0.00, +0, -0 etc.
    if (/^-?0+\.?0*$/.test(t)) return true;
    return false;
  }
}

export const ppExpressionSyntaxValidatorEngine =
  new PPExpressionSyntaxValidatorEngine();
