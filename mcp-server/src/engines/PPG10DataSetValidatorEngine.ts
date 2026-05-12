/**
 * PPG10DataSetValidatorEngine — Validate G10 programmable data-set blocks
 *
 * G10 programmatically writes to offset tables — work offsets (G54-G59),
 * tool length offsets, tool wear/geometry, and extended offsets. It's
 * powerful and dangerous: a bad G10 block silently corrupts a table and
 * future runs crash until the operator notices. Typical CAM-generated
 * headers or fixture-zero setters use G10 extensively, and subtle
 * mistakes are a leading cause of "why did my tool smash on block 200?"
 *
 * Standard forms (Fanuc, widely adopted):
 *   G10 L2 P<n> X... Y... Z...     — set work offset for WCS n
 *       - P1..P6  = G54..G59
 *       - P7..P53 = G54.1 P1..P47 (extended, 32i-B has 48)
 *       - P0      = active work offset (modifies whatever is current)
 *   G10 L10 P<t> R...               — set tool length geometry for tool t
 *   G10 L11 P<t> R...               — set tool length wear
 *   G10 L12 P<t> R...               — set tool diameter geometry
 *   G10 L13 P<t> R...               — set tool diameter wear
 *   G10 L20 P<n> X... Y... Z...     — equivalent to L2 on some controllers
 *   G10 L50 ... G11                 — data-entry mode (block-structured)
 *
 * Checks:
 *   - missing_l_parameter (error): G10 without L word — illegal on all
 *     major controllers.
 *   - invalid_l_value (error): L not in {2,10,11,12,13,20,50,51,52,70}
 *     — unknown form that will alarm on PS 0030.
 *   - missing_p_parameter (error): L2/L10/L11/L12/L13/L20 without P.
 *   - p_out_of_range (error): L2 P > configured max, < 0, or non-integer.
 *   - p_zero_overwrites_active (warning): L2 P0 writes to the active
 *     offset, overwriting it — rarely intentional.
 *   - missing_axis_on_offset_set (warning): L2/L20 without any axis word
 *     (X/Y/Z/A/B/C) and without I/J/K — nothing is actually being set.
 *   - missing_r_on_tool_length (warning): L10/L11/L12/L13 without R
 *     value — tool offset update with no value.
 *   - unbalanced_data_entry_mode (error): G10 L50 opened but G11 never
 *     written before program end.
 *   - tool_offset_out_of_range (warning): L10 P > max_tool_offsets
 *     (default 200 on Fanuc 0i-MF).
 *
 * Scope — distinct from:
 *   - PPWorkOffsetValidator: validates G54-G59 USAGE (which WCS is
 *     active), not the PROGRAMMING of WCS values via G10.
 *   - PPToolChangeValidator: M6 sequencing, not offset table writes.
 *   - PPMacroVariableValidator: #N=expression macros, not G10 blocks.
 *   - PPControllerCompatibilityEngine: cross-controller warnings only
 *     for G10.6 probe cycles, no syntactic validation.
 *
 * @module PPG10DataSetValidatorEngine
 */

export type G10Severity = "error" | "warning" | "info";

export type G10IssueKind =
  | "missing_l_parameter"
  | "invalid_l_value"
  | "missing_p_parameter"
  | "p_out_of_range"
  | "p_zero_overwrites_active"
  | "missing_axis_on_offset_set"
  | "missing_r_on_tool_length"
  | "unbalanced_data_entry_mode"
  | "tool_offset_out_of_range";

export interface G10Issue {
  kind: G10IssueKind;
  severity: G10Severity;
  line: number;
  block: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface G10Options {
  check_missing_l?: boolean;
  check_invalid_l?: boolean;
  check_missing_p?: boolean;
  check_p_range?: boolean;
  check_p_zero?: boolean;
  check_missing_axis?: boolean;
  check_missing_r?: boolean;
  check_data_entry_balance?: boolean;
  check_tool_offset_range?: boolean;
  max_wcs_p?: number;           // upper bound for L2 P (default 53 = 6 + 47 extended)
  max_tool_offsets?: number;     // upper bound for L10/L11/L12/L13 P (default 200)
  allowed_l_values?: number[];
}

export interface G10Result {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    g10_blocks_seen: number;
    data_entry_opens: number;   // count of L50
    data_entry_closes: number;  // count of G11
  };
  issues: G10Issue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<G10Options> = {
  check_missing_l: true,
  check_invalid_l: true,
  check_missing_p: true,
  check_p_range: true,
  check_p_zero: true,
  check_missing_axis: true,
  check_missing_r: true,
  check_data_entry_balance: true,
  check_tool_offset_range: true,
  max_wcs_p: 53,
  max_tool_offsets: 200,
  allowed_l_values: [2, 10, 11, 12, 13, 20, 50, 51, 52, 70],
};

// Which L-forms require a P and act on the WCS offset table
const WCS_L_FORMS = new Set([2, 20]);
// Which L-forms require a P and act on tool-offset tables
const TOOL_L_FORMS = new Set([10, 11, 12, 13]);

export class PPG10DataSetValidatorEngine {
  validate(code: string, opts: G10Options = {}): G10Result {
    const options: Required<G10Options> = { ...DEFAULT_OPTIONS, ...opts };
    const issues: G10Issue[] = [];
    const lines = code.split(/\r?\n/);

    let g10Blocks = 0;
    let dataEntryOpens = 0;
    let dataEntryCloses = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const stripped = this.stripComments(raw).trim();
      if (stripped === "" || stripped === "%") continue;

      // G11 closes data-entry mode
      if (/\bG11\b/.test(stripped)) {
        dataEntryCloses++;
      }

      // Detect G10 (not G10.6 — that's probe cycle)
      if (!/\bG10(?!\.\d)\b/.test(stripped)) continue;

      g10Blocks++;
      const lineNo = i + 1;

      // Extract L, P, R values
      const lMatch = stripped.match(/\bL(\d+(?:\.\d+)?)/);
      const pMatch = stripped.match(/\bP(-?\d+(?:\.\d+)?)/);
      const rMatch = stripped.match(/\bR(-?\d+(?:\.\d+)?)/);

      // 1. missing L
      if (!lMatch) {
        if (options.check_missing_l) {
          issues.push({
            kind: "missing_l_parameter",
            severity: "error",
            line: lineNo,
            block: stripped,
            message: "G10 requires an L parameter to identify the table",
          });
        }
        continue; // without L we can't judge the rest
      }

      const lVal = parseFloat(lMatch[1]);

      // 2. invalid L value
      if (!options.allowed_l_values.includes(lVal)) {
        if (options.check_invalid_l) {
          issues.push({
            kind: "invalid_l_value",
            severity: "error",
            line: lineNo,
            block: stripped,
            message: `G10 L${lVal} not in standard set {${options.allowed_l_values.join(",")}}`,
            details: { l_value: lVal },
          });
        }
        continue;
      }

      // L50 opens data-entry mode
      if (lVal === 50) {
        dataEntryOpens++;
        continue;
      }
      // L51, L52, L70 don't require P/axis in the standard form
      if (lVal === 51 || lVal === 52 || lVal === 70) continue;

      // 3. missing P for forms that require it
      const requiresP = WCS_L_FORMS.has(lVal) || TOOL_L_FORMS.has(lVal);
      if (requiresP && !pMatch) {
        if (options.check_missing_p) {
          issues.push({
            kind: "missing_p_parameter",
            severity: "error",
            line: lineNo,
            block: stripped,
            message: `G10 L${lVal} requires a P parameter (offset index)`,
            details: { l_value: lVal },
          });
        }
        continue;
      }

      if (pMatch) {
        const pRaw = pMatch[1];
        const pVal = parseFloat(pRaw);
        const pIsInt = Number.isInteger(pVal);

        // 4a. WCS P range
        if (WCS_L_FORMS.has(lVal)) {
          if (options.check_p_range && (!pIsInt || pVal < 0 || pVal > options.max_wcs_p)) {
            issues.push({
              kind: "p_out_of_range",
              severity: "error",
              line: lineNo,
              block: stripped,
              message: `G10 L${lVal} P${pRaw} out of range [0..${options.max_wcs_p}]`,
              details: { p_value: pVal, max: options.max_wcs_p, l_value: lVal },
            });
            continue;
          }
          // 5. P0 overwrites active WCS
          if (pVal === 0 && options.check_p_zero) {
            issues.push({
              kind: "p_zero_overwrites_active",
              severity: "warning",
              line: lineNo,
              block: stripped,
              message: `G10 L${lVal} P0 overwrites the currently-active work offset`,
              details: { l_value: lVal },
            });
          }
        }

        // 4b. Tool-offset P range
        if (TOOL_L_FORMS.has(lVal)) {
          if (
            options.check_tool_offset_range &&
            (!pIsInt || pVal < 1 || pVal > options.max_tool_offsets)
          ) {
            issues.push({
              kind: "tool_offset_out_of_range",
              severity: "warning",
              line: lineNo,
              block: stripped,
              message: `G10 L${lVal} P${pRaw} outside tool-offset range [1..${options.max_tool_offsets}]`,
              details: { p_value: pVal, max: options.max_tool_offsets, l_value: lVal },
            });
          }
        }
      }

      // 6. missing axis for WCS offset set
      if (WCS_L_FORMS.has(lVal) && options.check_missing_axis) {
        const hasAxis = /\b[XYZABCUVWIJK]-?\d/.test(stripped);
        if (!hasAxis) {
          issues.push({
            kind: "missing_axis_on_offset_set",
            severity: "warning",
            line: lineNo,
            block: stripped,
            message: `G10 L${lVal} without any axis word — no offset value is being written`,
            details: { l_value: lVal },
          });
        }
      }

      // 7. missing R for tool-length/wear updates
      if (TOOL_L_FORMS.has(lVal) && options.check_missing_r && !rMatch) {
        issues.push({
          kind: "missing_r_on_tool_length",
          severity: "warning",
          line: lineNo,
          block: stripped,
          message: `G10 L${lVal} without R value — tool offset will not be updated`,
          details: { l_value: lVal },
        });
      }
    }

    // 8. Data-entry balance
    if (
      options.check_data_entry_balance &&
      dataEntryOpens > dataEntryCloses
    ) {
      issues.push({
        kind: "unbalanced_data_entry_mode",
        severity: "error",
        line: lines.length,
        block: "(end of program)",
        message: `G10 L50 data-entry mode opened ${dataEntryOpens} time(s) but closed only ${dataEntryCloses} time(s) — missing G11`,
        details: { opens: dataEntryOpens, closes: dataEntryCloses },
      });
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
        g10_blocks_seen: g10Blocks,
        data_entry_opens: dataEntryOpens,
        data_entry_closes: dataEntryCloses,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    g10_blocks: number;
    issue_count: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      g10_blocks: r.summary.g10_blocks_seen,
      issue_count: r.summary.total_issues,
    };
  }

  defaultOptions(): Required<G10Options> {
    return { ...DEFAULT_OPTIONS };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppG10DataSetValidatorEngine = new PPG10DataSetValidatorEngine();
