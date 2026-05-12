/**
 * PPCharacterValidatorEngine — Byte-level G-code hygiene
 *
 * CNC controls are notoriously strict about the character set they
 * accept. A stray UTF-8 BOM, a non-ASCII quotation mark pasted from a
 * web tutorial, an embedded NUL, or mixed CRLF/LF line endings can
 * trigger "INVALID CHARACTER" alarms or, worse, silent block-skip on
 * legacy Fanuc controls that discard the line and resume motion from
 * the next valid block. This validator runs before any semantic G-code
 * parser to catch transport/encoding issues.
 *
 * Failure modes this validator catches:
 *   - bom_marker (error): UTF-8 BOM (EF BB BF) at file head — most
 *     controls reject, some treat it as a dangerous G/M word prefix.
 *   - non_ascii_character (error): bytes > 0x7F. Smart quotes (U+2018,
 *     U+2019), em-dash (U+2014), and non-breaking space (U+00A0) are
 *     common CAM/email-cop-paste offenders.
 *   - non_printable_character (warning): control char other than
 *     CR/LF/TAB. Includes NUL, ESC, DEL — often residue from bad
 *     terminal copy-paste.
 *   - embedded_null (error): 0x00 byte — many DNC serial links treat
 *     NUL as end-of-transmission and truncate the file.
 *   - tab_character (info): tab chars. Some controls expand to a fixed
 *     column width, others ignore, others reject. Prefer spaces.
 *   - trailing_whitespace (info): space/tab before newline. Cosmetic
 *     but can mask "hidden" characters in diff tools.
 *   - mixed_line_endings (warning): file mixes CR+LF and LF. FTP/SCP
 *     transfers in binary mode preserve whatever you send; text-mode
 *     mangles. Mixed endings indicate a broken toolchain.
 *   - bare_cr (warning): old-style Mac CR-only terminators. Fanuc
 *     serial readers may count blocks incorrectly.
 *   - very_long_line (warning): >256 bytes per block. Some older
 *     controls overflow their block buffer and alarm.
 *   - lowercase_letter (info): lowercase G/M/X in a program. Fanuc and
 *     Okuma tolerate but standard practice is uppercase; mixed case
 *     suggests a human-edited file where typos are more likely.
 *
 * Scope — distinct from:
 *   - PPGCodeLintEngine: modal/motion semantic checks (G41 left active,
 *     G80 missing). We run first, it runs after.
 *   - PPSafetyRuleValidatorEngine: business rules. We're encoding.
 *   - PPDecimalPointValidatorEngine: decimal-point syntax on words.
 *     We're byte-level only.
 *
 * @module PPCharacterValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type CharSeverity = "error" | "warning" | "info";

export interface CharIssue {
  line_number: number;
  column?: number;
  kind:
    | "bom_marker"
    | "non_ascii_character"
    | "non_printable_character"
    | "embedded_null"
    | "tab_character"
    | "trailing_whitespace"
    | "mixed_line_endings"
    | "bare_cr"
    | "very_long_line"
    | "lowercase_letter";
  severity: CharSeverity;
  message: string;
  details?: {
    code_point?: number;        // decoded Unicode code point
    byte_value?: number;        // raw byte (0-255)
    length?: number;            // line length in chars
    first_sample?: string;      // first offending snippet (≤16 chars)
  };
}

export interface CharResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: CharIssue[];
  summary: {
    valid: boolean;
    total_lines: number;
    crlf_count: number;
    lf_only_count: number;
    cr_only_count: number;
    non_ascii_count: number;
    longest_line: number;
    has_bom: boolean;
  };
}

export interface CharOptions {
  check_bom?: boolean;                 // default true
  check_non_ascii?: boolean;           // default true
  check_non_printable?: boolean;       // default true
  check_embedded_null?: boolean;       // default true
  check_tab?: boolean;                 // default true (info)
  check_trailing_whitespace?: boolean; // default false (info, noisy)
  check_mixed_line_endings?: boolean;  // default true
  check_bare_cr?: boolean;             // default true
  check_long_lines?: boolean;          // default true
  check_lowercase?: boolean;           // default false (info, optional)
  max_line_length?: number;            // default 256
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPCharacterValidatorEngine {
  /**
   * Validate character-level hygiene of a G-code program.
   */
  validate(gcode: string, options?: CharOptions): CharResult {
    const opts = {
      check_bom: options?.check_bom ?? true,
      check_non_ascii: options?.check_non_ascii ?? true,
      check_non_printable: options?.check_non_printable ?? true,
      check_embedded_null: options?.check_embedded_null ?? true,
      check_tab: options?.check_tab ?? true,
      check_trailing_whitespace:
        options?.check_trailing_whitespace ?? false,
      check_mixed_line_endings: options?.check_mixed_line_endings ?? true,
      check_bare_cr: options?.check_bare_cr ?? true,
      check_long_lines: options?.check_long_lines ?? true,
      check_lowercase: options?.check_lowercase ?? false,
      max_line_length: options?.max_line_length ?? 256,
    };

    const issues: CharIssue[] = [];

    // ── BOM detection ────────────────────────────────────────────────
    // In a JS string, the UTF-8 BOM has already been decoded to U+FEFF.
    let effective = gcode;
    const hasBom = gcode.charCodeAt(0) === 0xfeff;
    if (hasBom) {
      if (opts.check_bom) {
        issues.push({
          line_number: 1,
          column: 1,
          kind: "bom_marker",
          severity: "error",
          message: `UTF-8 BOM (U+FEFF) at start of file — most controls reject`,
          details: { code_point: 0xfeff },
        });
      }
      effective = gcode.substring(1);
    }

    // ── Line ending detection ────────────────────────────────────────
    // Count CRLF, LF-only, CR-only separators.
    let crlfCount = 0;
    let lfOnlyCount = 0;
    let crOnlyCount = 0;
    for (let i = 0; i < effective.length; i++) {
      const ch = effective.charCodeAt(i);
      if (ch === 0x0d) {
        if (effective.charCodeAt(i + 1) === 0x0a) {
          crlfCount++;
          i++; // skip the LF
        } else {
          crOnlyCount++;
        }
      } else if (ch === 0x0a) {
        lfOnlyCount++;
      }
    }

    // Split into lines. \r\n and \n and bare \r all split on different
    // regexes; use a unified split that preserves line indices.
    const lines = effective.split(/\r\n|\r|\n/);

    let longestLine = 0;
    let nonAsciiCount = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const lineNum = idx + 1;
      if (line.length > longestLine) longestLine = line.length;

      let trailingWS = false;
      if (line.length > 0) {
        const last = line.charCodeAt(line.length - 1);
        if (last === 0x20 || last === 0x09) trailingWS = true;
      }

      // Scan each character once
      for (let col = 0; col < line.length; col++) {
        const cp = line.charCodeAt(col);

        // Embedded NUL (0x00)
        if (cp === 0x00) {
          if (opts.check_embedded_null) {
            issues.push({
              line_number: lineNum,
              column: col + 1,
              kind: "embedded_null",
              severity: "error",
              message: `Embedded NUL (0x00) at line ${lineNum} col ${col + 1}`,
              details: { code_point: 0x00, byte_value: 0 },
            });
          }
          continue;
        }

        // Tab
        if (cp === 0x09) {
          if (opts.check_tab) {
            issues.push({
              line_number: lineNum,
              column: col + 1,
              kind: "tab_character",
              severity: "info",
              message: `Tab character at line ${lineNum} col ${col + 1} — prefer spaces`,
              details: { code_point: 0x09 },
            });
          }
          continue;
        }

        // Non-printable ASCII (control chars 0x01..0x1F except \t)
        if (cp < 0x20 && cp !== 0x09) {
          if (opts.check_non_printable) {
            issues.push({
              line_number: lineNum,
              column: col + 1,
              kind: "non_printable_character",
              severity: "warning",
              message: `Non-printable control character U+${cp.toString(16).padStart(4, "0").toUpperCase()} at line ${lineNum}`,
              details: { code_point: cp },
            });
          }
          continue;
        }

        // DEL (0x7F)
        if (cp === 0x7f) {
          if (opts.check_non_printable) {
            issues.push({
              line_number: lineNum,
              column: col + 1,
              kind: "non_printable_character",
              severity: "warning",
              message: `DEL (U+007F) at line ${lineNum} col ${col + 1}`,
              details: { code_point: 0x7f },
            });
          }
          continue;
        }

        // Non-ASCII (> 0x7F)
        if (cp > 0x7f) {
          nonAsciiCount++;
          if (opts.check_non_ascii) {
            issues.push({
              line_number: lineNum,
              column: col + 1,
              kind: "non_ascii_character",
              severity: "error",
              message: `Non-ASCII character U+${cp.toString(16).padStart(4, "0").toUpperCase()} at line ${lineNum} col ${col + 1}`,
              details: {
                code_point: cp,
                first_sample: line.substring(col, Math.min(col + 16, line.length)),
              },
            });
          }
          continue;
        }

        // Lowercase letters
        if (
          opts.check_lowercase &&
          cp >= 0x61 &&
          cp <= 0x7a
        ) {
          issues.push({
            line_number: lineNum,
            column: col + 1,
            kind: "lowercase_letter",
            severity: "info",
            message: `Lowercase letter '${line[col]}' at line ${lineNum} col ${col + 1} — G-code convention is uppercase`,
            details: { code_point: cp },
          });
          // only report once per line to cut noise
          break;
        }
      }

      if (opts.check_trailing_whitespace && trailingWS) {
        issues.push({
          line_number: lineNum,
          column: line.length,
          kind: "trailing_whitespace",
          severity: "info",
          message: `Trailing whitespace on line ${lineNum}`,
        });
      }

      if (opts.check_long_lines && line.length > opts.max_line_length) {
        issues.push({
          line_number: lineNum,
          kind: "very_long_line",
          severity: "warning",
          message: `Line ${lineNum} length ${line.length} exceeds ${opts.max_line_length} bytes — may overflow control buffer`,
          details: { length: line.length },
        });
      }
    }

    // Mixed line endings
    const distinctEndings =
      (crlfCount > 0 ? 1 : 0) +
      (lfOnlyCount > 0 ? 1 : 0) +
      (crOnlyCount > 0 ? 1 : 0);
    if (opts.check_mixed_line_endings && distinctEndings > 1) {
      issues.push({
        line_number: 1,
        kind: "mixed_line_endings",
        severity: "warning",
        message: `Mixed line endings: ${crlfCount} CRLF, ${lfOnlyCount} LF, ${crOnlyCount} bare-CR`,
      });
    }

    if (opts.check_bare_cr && crOnlyCount > 0) {
      issues.push({
        line_number: 1,
        kind: "bare_cr",
        severity: "warning",
        message: `${crOnlyCount} bare-CR line terminator(s) — Classic-Mac style may confuse serial DNC`,
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
        total_lines: lines.length,
        crlf_count: crlfCount,
        lf_only_count: lfOnlyCount,
        cr_only_count: crOnlyCount,
        non_ascii_count: nonAsciiCount,
        longest_line: longestLine,
        has_bom: hasBom,
      },
    };
  }

  /**
   * Quick pass/fail.
   */
  quickCheck(
    gcode: string,
    options?: CharOptions,
  ): {
    valid: boolean;
    errors: number;
    has_bom: boolean;
    non_ascii_count: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      has_bom: r.summary.has_bom,
      non_ascii_count: r.summary.non_ascii_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<CharOptions> {
    return {
      check_bom: true,
      check_non_ascii: true,
      check_non_printable: true,
      check_embedded_null: true,
      check_tab: true,
      check_trailing_whitespace: false,
      check_mixed_line_endings: true,
      check_bare_cr: true,
      check_long_lines: true,
      check_lowercase: false,
      max_line_length: 256,
    };
  }
}

export const ppCharacterValidatorEngine = new PPCharacterValidatorEngine();
