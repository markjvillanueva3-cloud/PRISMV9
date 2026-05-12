/**
 * PPDecimalPointValidatorEngine — Validate decimal points on dimension words
 *
 * The most expensive typo in G-code: `X5000` instead of `X5.000`.
 *
 * On Fanuc controls, parameter 3401 bit 0 determines how integer
 * coordinates are interpreted:
 *   - Bit 0 = 0 (default): `X5` means `X0.005` (least-input-increment)
 *   - Bit 0 = 1 (decimal shortcut): `X5` means `X5.`
 *
 * CAM posts are inconsistent. A program written for one shop's Fanuc
 * can behave entirely differently on another's. Haas always treats
 * `X5` as `X5.`. Heidenhain rejects the input outright. Mazak and
 * Okuma default to the standard setting but are often reconfigured.
 *
 * This validator does NOT decide which mode is "right" — it flags
 * every dimension word without a decimal point so a human can review.
 *
 * Checks:
 *   - dimension_missing_decimal (warning): X/Y/Z/A/B/C/I/J/K/R/Q
 *     present as integer (no `.`). Interpretation depends on control.
 *   - feed_missing_decimal (info): F word as integer — almost always
 *     intentional (F100 = 100mm/min), but flagged for completeness.
 *   - spindle_missing_decimal (info): S word as integer — always
 *     intentional, but can be disabled via option.
 *   - dwell_P_missing_decimal (warning): G4 P word as integer — P is
 *     interpreted as ms or sec depending on Fanuc param 3405 bit 1;
 *     integer P with no decimal is the #1 dwell-time bug.
 *
 * Scope — distinct from:
 *   - PPControllerCompatibilityEngine: knows which controllers allow
 *     integer shortcut (capability map) but doesn't validate programs.
 *     This engine consumes that compatibility data conceptually.
 *   - PPGCodeLintEngine: may flag other lint issues (style), not the
 *     specific semantic risk of missing decimal.
 *
 * @module PPDecimalPointValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type DecimalSeverity = "error" | "warning" | "info";

export interface DecimalIssue {
  line_number: number;
  kind:
    | "dimension_missing_decimal"
    | "feed_missing_decimal"
    | "spindle_missing_decimal"
    | "dwell_P_missing_decimal";
  severity: DecimalSeverity;
  message: string;
  details?: {
    word?: string;
    value?: number;
  };
}

export interface DecimalResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: DecimalIssue[];
  summary: {
    valid: boolean;
    dimension_words_total: number;
    dimension_words_missing_decimal: number;
    feed_words_missing_decimal: number;
    spindle_words_missing_decimal: number;
    dwell_missing_decimal: number;
  };
}

export interface DecimalOptions {
  check_dimensions?: boolean;        // default true (X/Y/Z/A/B/C/I/J/K/R/Q)
  check_feed?: boolean;              // default false (F100 usually fine)
  check_spindle?: boolean;           // default false (S1000 always fine)
  check_dwell?: boolean;             // default true (G4 P without decimal is risky)
  dimension_letters?: string[];      // override dimension word set
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPDecimalPointValidatorEngine {
  private static readonly DEFAULT_DIMENSION_LETTERS = [
    "X", "Y", "Z", "A", "B", "C", "I", "J", "K", "R", "Q", "U", "V", "W",
  ];

  /**
   * Validate decimal-point usage.
   */
  validate(gcode: string, options?: DecimalOptions): DecimalResult {
    const opts = {
      check_dimensions: options?.check_dimensions ?? true,
      check_feed: options?.check_feed ?? false,
      check_spindle: options?.check_spindle ?? false,
      check_dwell: options?.check_dwell ?? true,
      dimension_letters:
        options?.dimension_letters ??
        PPDecimalPointValidatorEngine.DEFAULT_DIMENSION_LETTERS,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: DecimalIssue[] = [];
    let dimensionTotal = 0;
    let dimensionMissing = 0;
    let feedMissing = 0;
    let spindleMissing = 0;
    let dwellMissing = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const isDwellLine = /\bG0*4\b/.test(code);

      // Dimension words
      if (opts.check_dimensions) {
        for (const letter of opts.dimension_letters) {
          const all = this.findAllWords(code, letter);
          for (const w of all) {
            dimensionTotal++;
            if (!w.hasDecimal) {
              dimensionMissing++;
              issues.push({
                line_number: lineNum,
                kind: "dimension_missing_decimal",
                severity: "warning",
                message: `${letter}${w.raw} has no decimal — on Fanuc param 3401 bit 0=0 this is ${letter}0.${w.raw.padStart(3, "0")}`,
                details: { word: letter, value: w.value },
              });
            }
          }
        }
      }

      // Feed word
      if (opts.check_feed) {
        const feeds = this.findAllWords(code, "F");
        for (const f of feeds) {
          if (!f.hasDecimal) {
            feedMissing++;
            issues.push({
              line_number: lineNum,
              kind: "feed_missing_decimal",
              severity: "info",
              message: `F${f.raw} has no decimal — usually intentional for feed per min`,
              details: { word: "F", value: f.value },
            });
          }
        }
      }

      // Spindle word
      if (opts.check_spindle) {
        const spindles = this.findAllWords(code, "S");
        for (const s of spindles) {
          if (!s.hasDecimal) {
            spindleMissing++;
            issues.push({
              line_number: lineNum,
              kind: "spindle_missing_decimal",
              severity: "info",
              message: `S${s.raw} has no decimal — always integer RPM`,
              details: { word: "S", value: s.value },
            });
          }
        }
      }

      // G4 dwell P word
      if (opts.check_dwell && isDwellLine) {
        const ps = this.findAllWords(code, "P");
        for (const p of ps) {
          if (!p.hasDecimal) {
            dwellMissing++;
            issues.push({
              line_number: lineNum,
              kind: "dwell_P_missing_decimal",
              severity: "warning",
              message: `G4 P${p.raw} has no decimal — P interpreted as ms on some Fanucs (param 3405 bit 1), seconds on others`,
              details: { word: "P", value: p.value },
            });
          }
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
        dimension_words_total: dimensionTotal,
        dimension_words_missing_decimal: dimensionMissing,
        feed_words_missing_decimal: feedMissing,
        spindle_words_missing_decimal: spindleMissing,
        dwell_missing_decimal: dwellMissing,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: DecimalOptions,
  ): { valid: boolean; errors: number; warnings: number; dimension_missing: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      dimension_missing: r.summary.dimension_words_missing_decimal,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<DecimalOptions> {
    return {
      check_dimensions: true,
      check_feed: false,
      check_spindle: false,
      check_dwell: true,
      dimension_letters: PPDecimalPointValidatorEngine.DEFAULT_DIMENSION_LETTERS,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private findAllWords(
    code: string,
    letter: string,
  ): Array<{ raw: string; value: number; hasDecimal: boolean }> {
    // Match letter followed by digits; avoid consuming following letter's digits
    const results: Array<{ raw: string; value: number; hasDecimal: boolean }> = [];
    // Exclude G/M/N/T/H/D words in letters we scan for (those are codes, not dimensions)
    const regex = new RegExp(`(?<![A-Z])${letter}(-?\\d+\\.?\\d*)`, "g");
    let m: RegExpExecArray | null;
    while ((m = regex.exec(code)) !== null) {
      const raw = m[1];
      const hasDecimal = raw.includes(".");
      const value = parseFloat(raw);
      if (!Number.isNaN(value)) {
        results.push({ raw, value, hasDecimal });
      }
    }
    return results;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppDecimalPointValidatorEngine = new PPDecimalPointValidatorEngine();
