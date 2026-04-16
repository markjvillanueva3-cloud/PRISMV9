/**
 * PPAxisLetterValidatorEngine — Validate G-code word letters
 *
 * Every token in a G-code block is supposed to be a *letter + number*
 * pair (plus a handful of macro operators in Fanuc custom macro B).
 * Common failure modes:
 *
 *   - A typo or bad post introduces a stray letter the controller
 *     doesn't recognise ("Q10 E5" on a controller that has no E word).
 *   - A missing space concatenates two tokens into one ("G1X10" parses
 *     fine on most controls, but "GX10" is garbage).
 *   - A digit-only token drifts into the stream ("10 X5") — some
 *     controls silently drop it, others alarm.
 *   - An axis that *exists* on the machine physically, but has been
 *     *disabled* in the shop profile (rotary A axis on a 3-axis mill),
 *     gets used by mistake.
 *
 * This engine reads each block, extracts every letter-headed token, and
 * checks the letter against a configurable allow-list. The default list
 * covers standard Fanuc ISO G-code. A caller can pass `machine_axes`
 * to gate the A/B/C/U/V/W axes.
 *
 * Checks:
 *   - `unknown_letter`         (error): token starts with a letter not
 *                                        in the allow-list.
 *   - `digit_only_token`       (error): bare number with no letter prefix.
 *   - `letter_without_value`   (error): letter alone, no number (e.g. "X").
 *   - `disabled_axis_used`     (error): legal letter but not in the
 *                                        machine's enabled_axes set.
 *   - `suspicious_concat`      (warning): "GX10", "MT6", etc. — likely
 *                                          a missing-space post bug.
 *
 * Options:
 *   - `allowed_letters`  — overrides the default Fanuc set.
 *   - `enabled_axes`     — restricts which of A/B/C/U/V/W are legal.
 *     If undefined, all rotary/secondary axes are allowed.
 *
 * Scope — distinct from:
 *   - PPDecimalPointValidatorEngine: checks decimal-point presence on
 *     values, not the letters themselves.
 *   - PPAxisTravelValidatorEngine: checks magnitudes against envelope,
 *     not legality of the letter.
 *   - PPMacroVariableValidatorEngine: checks #n macro var references.
 *
 * @module PPAxisLetterValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type AxisLetterSeverity = "error" | "warning" | "info";

export type AxisLetterKind =
  | "unknown_letter"
  | "digit_only_token"
  | "letter_without_value"
  | "disabled_axis_used"
  | "suspicious_concat";

export interface AxisLetterIssue {
  line_number: number;
  kind: AxisLetterKind;
  severity: AxisLetterSeverity;
  message: string;
  token: string;
  letter?: string;
}

export interface AxisLetterResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: AxisLetterIssue[];
  summary: {
    valid: boolean;
    lines_scanned: number;
    letters_seen: string[];
    unknown_letters_seen: string[];
  };
}

export type RotaryAxis = "A" | "B" | "C" | "U" | "V" | "W";

export interface AxisLetterOptions {
  /** Override the allowed letter set. Default = Fanuc ISO + common macro. */
  allowed_letters?: string[];
  /**
   * Which rotary/secondary axes are enabled on the machine. If undefined,
   * all of A/B/C/U/V/W are allowed. If provided, any of those letters
   * NOT in this list produces `disabled_axis_used`.
   */
  enabled_axes?: RotaryAxis[];
}

// ── Defaults ──────────────────────────────────────────────────────────

/** Default Fanuc ISO G-code word letters. */
const DEFAULT_ALLOWED_LETTERS = new Set<string>([
  // structure
  "G", "M", "N", "O",
  // linear axes
  "X", "Y", "Z",
  // rotary/secondary axes
  "A", "B", "C", "U", "V", "W",
  // arc centers
  "I", "J", "K",
  // parameters
  "P", "Q", "R",
  // feed, speed, tool
  "F", "S", "T",
  // comp / offset indices
  "H", "D",
  // repeat / triplet
  "L",
  // thread lead (used on some lathes)
  "E",
]);

const ROTARY_AXES: RotaryAxis[] = ["A", "B", "C", "U", "V", "W"];

// ── Engine ────────────────────────────────────────────────────────────

export class PPAxisLetterValidatorEngine {
  /** Validate axis / word letters in a G-code program. */
  validate(
    gcode: string,
    options?: AxisLetterOptions,
  ): AxisLetterResult {
    const allowed = options?.allowed_letters
      ? new Set(options.allowed_letters.map((l) => l.toUpperCase()))
      : new Set(DEFAULT_ALLOWED_LETTERS);
    const enabledAxes = options?.enabled_axes
      ? new Set(options.enabled_axes)
      : null;

    const lines = gcode.split(/\r?\n/);
    const issues: AxisLetterIssue[] = [];
    const lettersSeen = new Set<string>();
    const unknownLetters = new Set<string>();

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase().trim();
      if (code.length === 0) continue;

      // Tokenise on whitespace first.
      const tokens = code.split(/\s+/).filter((t) => t.length > 0);

      for (const token of tokens) {
        // Pure digits (or digits with decimal) — orphan numeric token.
        if (/^[-+]?\d+(\.\d*)?$/.test(token)) {
          issues.push({
            line_number: lineNum,
            kind: "digit_only_token",
            severity: "error",
            message: `Bare numeric token "${token}" — must be prefixed with a word letter`,
            token,
          });
          continue;
        }

        const first = token[0]!;
        if (!/[A-Z]/.test(first)) continue; // not a word token (macro operators, etc.)

        // Suspicious concat: 2 or more consecutive letters at the start
        // of a token (e.g., "GX10", "MT6"). "O0001" or "N100" are fine —
        // those have only one letter head. A token like "G1X10" (no
        // space between G1 and X10) is caught because it starts with a
        // letter, then digit, then another letter — we flag that too.
        const letterRunLen = this.leadingLetterRun(token);
        const hasInteriorLetter = /[A-Z]/.test(token.slice(1));
        if (letterRunLen >= 2) {
          issues.push({
            line_number: lineNum,
            kind: "suspicious_concat",
            severity: "warning",
            message: `Token "${token}" starts with two letters — missing-space post bug?`,
            token,
            letter: first,
          });
          continue;
        }
        if (hasInteriorLetter) {
          issues.push({
            line_number: lineNum,
            kind: "suspicious_concat",
            severity: "warning",
            message: `Token "${token}" has an interior letter — missing-space post bug?`,
            token,
            letter: first,
          });
          continue;
        }

        lettersSeen.add(first);

        // Letter alone, no digits.
        if (token.length === 1) {
          issues.push({
            line_number: lineNum,
            kind: "letter_without_value",
            severity: "error",
            message: `Word letter "${first}" with no value`,
            token,
            letter: first,
          });
          continue;
        }

        // Letter not in allow-list.
        if (!allowed.has(first)) {
          unknownLetters.add(first);
          issues.push({
            line_number: lineNum,
            kind: "unknown_letter",
            severity: "error",
            message: `Unknown word letter "${first}" in token "${token}"`,
            token,
            letter: first,
          });
          continue;
        }

        // Axis-enabled gate for rotary / secondary axes.
        if (
          enabledAxes !== null &&
          ROTARY_AXES.includes(first as RotaryAxis) &&
          !enabledAxes.has(first as RotaryAxis)
        ) {
          issues.push({
            line_number: lineNum,
            kind: "disabled_axis_used",
            severity: "error",
            message: `Axis "${first}" used but not enabled on this machine`,
            token,
            letter: first,
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
        lines_scanned: lines.length,
        letters_seen: Array.from(lettersSeen).sort(),
        unknown_letters_seen: Array.from(unknownLetters).sort(),
      },
    };
  }

  /** Quick pass/fail. */
  quickCheck(
    gcode: string,
    options?: AxisLetterOptions,
  ): { valid: boolean; errors: number; warnings: number } {
    const r = this.validate(gcode, options);
    return { valid: r.summary.valid, errors: r.errors, warnings: r.warnings };
  }

  /** Default allowed letters (for caller introspection). */
  defaultAllowedLetters(): string[] {
    return Array.from(DEFAULT_ALLOWED_LETTERS).sort();
  }

  // ── Private ───────────────────────────────────────────────────────

  private leadingLetterRun(token: string): number {
    let i = 0;
    while (i < token.length && /[A-Z]/.test(token[i]!)) i++;
    return i;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppAxisLetterValidatorEngine = new PPAxisLetterValidatorEngine();
