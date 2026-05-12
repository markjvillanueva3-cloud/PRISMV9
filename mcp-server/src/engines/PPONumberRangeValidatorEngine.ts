/**
 * PPONumberRangeValidatorEngine — Validate O-number ranges and format
 *
 * O-numbers identify programs and subprograms on Fanuc-class controls
 * (and most Fanuc-compatible dialects). Different shops reserve
 * different ranges for different purposes — macros in 9000-9999,
 * customer parts in 1000-4999, fixtures in 5000-8999, etc. Ignoring
 * those conventions causes:
 *   - O9000-9999 macros silently overwritten by a CAM post emitting
 *     O9xxx for part programs. Lost configuration is rarely noticed
 *     until the next power-cycle.
 *   - O0 loaded as "program zero" — invalid on Fanuc, alarm PS101.
 *   - O-numbers with inconsistent leading-zero widths (O1 vs O0001)
 *     causing M98 P calls to miss the target on strict-match controls.
 *   - O100000+ rejected by classic Fanuc (5-digit limit).
 *
 * Checks:
 *   - o_number_zero (error): O0 — invalid identifier on Fanuc.
 *   - o_number_too_large (error): O > max_o (default 99999 — classic
 *     Fanuc 5-digit limit).
 *   - o_out_of_main_range (warning): primary (first) O outside
 *     configured main_range.
 *   - o_out_of_sub_range (warning): secondary O (subprogram)
 *     outside configured sub_range.
 *   - o_in_reserved_macro_range (warning): O in reserved_macro_range
 *     (default 9000-9999) without explicit (MACRO) tag in header.
 *   - leading_zero_inconsistency (info): same file uses mixed O1 /
 *     O0001 formats — fragile on strict-match controls.
 *   - o_number_format_invalid (error): O followed by non-digit or
 *     float (O12.5 / Ofoo).
 *
 * Scope — distinct from:
 *   - PPLineNumberSanityEngine: duplicate_o_number, N-word framing.
 *   - PPCallGraphValidatorEngine: M98/M99 call graph / subs defined.
 *   - PPMacroFlowValidatorEngine: #<var> and GOTO/WHILE flow.
 *
 * @module PPONumberRangeValidatorEngine
 */

export type ONumSeverity = "error" | "warning" | "info";

export type ONumIssueKind =
  | "o_number_zero"
  | "o_number_too_large"
  | "o_out_of_main_range"
  | "o_out_of_sub_range"
  | "o_in_reserved_macro_range"
  | "leading_zero_inconsistency"
  | "o_number_format_invalid";

export interface ONumIssue {
  kind: ONumIssueKind;
  severity: ONumSeverity;
  line?: number;
  o_number?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ONumRange {
  min: number;
  max: number;
}

export interface ONumValidationOptions {
  check_zero?: boolean;
  check_too_large?: boolean;
  check_main_range?: boolean;
  check_sub_range?: boolean;
  check_reserved_macro_range?: boolean;
  check_leading_zero_consistency?: boolean;
  check_format?: boolean;
  max_o?: number;
  main_range?: ONumRange;
  sub_range?: ONumRange;
  reserved_macro_range?: ONumRange;
  macro_tag_pattern?: string;
}

export interface ONumValidationResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    o_numbers: number[];
    main_o?: number;
    sub_os: number[];
    leading_zero_widths: number[];
  };
  issues: ONumIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<ONumValidationOptions> = {
  check_zero: true,
  check_too_large: true,
  check_main_range: false,
  check_sub_range: false,
  check_reserved_macro_range: true,
  check_leading_zero_consistency: true,
  check_format: true,
  max_o: 99999,
  main_range: { min: 1, max: 8999 },
  sub_range: { min: 1, max: 8999 },
  reserved_macro_range: { min: 9000, max: 9999 },
  macro_tag_pattern: "\\bMACRO\\b|\\bCUSTOM\\s*MACRO\\b",
};

export class PPONumberRangeValidatorEngine {
  validate(
    code: string,
    opts: ONumValidationOptions = {},
  ): ONumValidationResult {
    const options: Required<ONumValidationOptions> = {
      ...DEFAULT_OPTIONS,
      ...opts,
      main_range: { ...DEFAULT_OPTIONS.main_range, ...(opts.main_range ?? {}) },
      sub_range: { ...DEFAULT_OPTIONS.sub_range, ...(opts.sub_range ?? {}) },
      reserved_macro_range: {
        ...DEFAULT_OPTIONS.reserved_macro_range,
        ...(opts.reserved_macro_range ?? {}),
      },
    } as Required<ONumValidationOptions>;
    const issues: ONumIssue[] = [];
    const lines = code.split(/\r?\n/);

    const macroRe = new RegExp(options.macro_tag_pattern, "i");

    // Collect O-number definitions. Record raw digit string for leading-zero check.
    type ONumDef = {
      line: number;
      num: number;
      raw: string;
      width: number;
      invalid?: boolean;
    };
    const defs: ONumDef[] = [];

    // Regex: "O" followed by digits only (valid), else invalid
    const oLineRe = /^\s*O([^\s(;]*)/;
    const validDigits = /^\d+$/;

    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(oLineRe);
      if (!m) continue;
      const raw = m[1];
      if (!raw) continue;
      if (!validDigits.test(raw)) {
        if (options.check_format) {
          issues.push({
            kind: "o_number_format_invalid",
            severity: "error",
            line: i + 1,
            message: `O-number format invalid: "O${raw}" — expected digits only`,
          });
        }
        defs.push({ line: i + 1, num: NaN, raw, width: raw.length, invalid: true });
        continue;
      }
      const num = parseInt(raw, 10);
      defs.push({ line: i + 1, num, raw, width: raw.length });
    }

    // Main O = first valid def; rest are subs
    const validDefs = defs.filter((d) => !d.invalid);
    const mainDef = validDefs[0];
    const subDefs = validDefs.slice(1);

    // Check each def
    for (const d of validDefs) {
      if (options.check_zero && d.num === 0) {
        issues.push({
          kind: "o_number_zero",
          severity: "error",
          line: d.line,
          o_number: 0,
          message: "O0 is not a valid program identifier on Fanuc controls",
        });
      }

      if (options.check_too_large && d.num > options.max_o) {
        issues.push({
          kind: "o_number_too_large",
          severity: "error",
          line: d.line,
          o_number: d.num,
          message: `O${d.num} exceeds max allowed O-number (${options.max_o})`,
          details: { max_o: options.max_o },
        });
      }

      // Reserved macro range: if inside 9000-9999 but no MACRO tag in surrounding header
      if (options.check_reserved_macro_range) {
        const { min, max } = options.reserved_macro_range;
        if (d.num >= min && d.num <= max) {
          // Look at next 10 lines for (MACRO) tag
          const start = d.line - 1;
          const end = Math.min(lines.length, start + 10);
          const ctx = lines.slice(start, end).join("\n");
          if (!macroRe.test(ctx)) {
            issues.push({
              kind: "o_in_reserved_macro_range",
              severity: "warning",
              line: d.line,
              o_number: d.num,
              message: `O${d.num} falls in reserved macro range ${min}-${max} but has no (MACRO) tag`,
              details: { reserved_range: { min, max } },
            });
          }
        }
      }
    }

    // Main range check
    if (options.check_main_range && mainDef) {
      const { min, max } = options.main_range;
      if (mainDef.num < min || mainDef.num > max) {
        issues.push({
          kind: "o_out_of_main_range",
          severity: "warning",
          line: mainDef.line,
          o_number: mainDef.num,
          message: `Main program O${mainDef.num} outside configured main range ${min}-${max}`,
          details: { main_range: { min, max } },
        });
      }
    }

    // Sub range check
    if (options.check_sub_range) {
      for (const d of subDefs) {
        const { min, max } = options.sub_range;
        if (d.num < min || d.num > max) {
          issues.push({
            kind: "o_out_of_sub_range",
            severity: "warning",
            line: d.line,
            o_number: d.num,
            message: `Subprogram O${d.num} outside configured sub range ${min}-${max}`,
            details: { sub_range: { min, max } },
          });
        }
      }
    }

    // Leading-zero consistency
    if (
      options.check_leading_zero_consistency &&
      validDefs.length >= 2
    ) {
      const widths = new Set(validDefs.map((d) => d.width));
      if (widths.size > 1) {
        issues.push({
          kind: "leading_zero_inconsistency",
          severity: "info",
          message: `Mixed O-number widths found (${Array.from(widths).sort().join(", ")}); strict-match controls may miss M98 calls`,
          details: {
            widths_observed: Array.from(widths).sort(),
            definitions: validDefs.map((d) => ({ line: d.line, raw: d.raw })),
          },
        });
      }
    }

    const error_count = issues.filter((i) => i.severity === "error").length;
    const warning_count = issues.filter((i) => i.severity === "warning").length;
    const info_count = issues.filter((i) => i.severity === "info").length;

    return {
      summary: {
        valid: error_count === 0,
        total_issues: issues.length,
        error_count,
        warning_count,
        info_count,
        o_numbers: validDefs.map((d) => d.num),
        main_o: mainDef?.num,
        sub_os: subDefs.map((d) => d.num),
        leading_zero_widths: Array.from(
          new Set(validDefs.map((d) => d.width)),
        ).sort((a, b) => a - b),
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    o_count: number;
    main_o?: number;
    widths: number[];
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      o_count: r.summary.o_numbers.length,
      main_o: r.summary.main_o,
      widths: r.summary.leading_zero_widths,
    };
  }

  defaultOptions(): Required<ONumValidationOptions> {
    return {
      ...DEFAULT_OPTIONS,
      main_range: { ...DEFAULT_OPTIONS.main_range },
      sub_range: { ...DEFAULT_OPTIONS.sub_range },
      reserved_macro_range: { ...DEFAULT_OPTIONS.reserved_macro_range },
    };
  }
}

export const ppONumberRangeValidatorEngine =
  new PPONumberRangeValidatorEngine();
