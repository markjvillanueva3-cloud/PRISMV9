/**
 * PPDuplicateWordValidatorEngine — Flag duplicate words in the same block
 *
 * A single G-code block is supposed to contain each address letter at
 * most once. When a CAM post or a hand-editor accidentally emits two
 * X-words, two F-words, or two T-words on the same line, behavior is
 * wildly controller-dependent:
 *
 *   - Fanuc 0i-F: rejects the block with "P/S 5" alarm.
 *   - Fanuc 6M/16i: accepts the block and takes the LAST occurrence,
 *     silently discarding the first value.
 *   - Haas: depends on firmware — older mills take first, newer last.
 *   - Okuma OSP-P200: rejects; OSP-P300 warns but accepts last.
 *
 * "Silently takes the last value" is the nightmare scenario: the tool
 * moves to a coordinate the programmer never intended, causing scrapped
 * parts, broken tools, or crash.
 *
 * Address letters validated (monitored):
 *   G M T S F H D X Y Z A B C U V W I J K R P Q L
 *
 * Special cases:
 *   - Some controllers allow TWO G-words per block if they are from
 *     different modal groups (e.g., G0 G90 = motion-group + distance-
 *     group). We honor this by default: G and M allow multiple if
 *     opts.check_multiple_g / check_multiple_m are disabled.
 *   - N-word (line number) appears at most once by syntax; we always
 *     flag duplicates.
 *
 * Failure modes this validator catches:
 *   - duplicate_word (error): same letter twice on one block (X and X,
 *     F and F). Value of second wins on lenient controllers.
 *   - duplicate_g_multi_group (info, opt-in): multiple G-words even if
 *     from different modal groups (style nit; some shops ban it).
 *   - duplicate_m_block (warning, opt-in): multiple M-words on the
 *     same block (most controls allow one M per block).
 *
 * Scope — distinct from:
 *   - PPGCodeLintEngine: modal-group conflict detection (G90+G91 etc.);
 *     we detect repeated letters regardless of modal grouping.
 *   - PPModalGroupConflictValidatorEngine: focuses on group semantics.
 *     We're purely syntactic — same letter appears twice.
 *   - PPAxisLetterValidatorEngine: letter-validity only.
 *
 * @module PPDuplicateWordValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type DWSeverity = "error" | "warning" | "info";

export interface DWIssue {
  line_number: number;
  kind:
    | "duplicate_word"
    | "duplicate_g_multi_group"
    | "duplicate_m_block";
  severity: DWSeverity;
  message: string;
  details?: {
    letter?: string;
    occurrence_count?: number;
    values?: string[];
  };
}

export interface DWResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: DWIssue[];
  summary: {
    valid: boolean;
    blocks_scanned: number;
    duplicates_found: number;
    worst_letter: string | null;
  };
}

export interface DWOptions {
  check_duplicates?: boolean;        // default true (the main check)
  check_multiple_g?: boolean;        // default false (allowed)
  check_multiple_m?: boolean;        // default false (allowed)
  monitored_letters?: string[];      // default: standard G-code word set
}

// ── Engine ────────────────────────────────────────────────────────────

const DEFAULT_MONITORED = [
  "G", "M", "T", "S", "F", "H", "D",
  "X", "Y", "Z", "A", "B", "C", "U", "V", "W",
  "I", "J", "K", "R", "P", "Q", "L", "N",
];

export class PPDuplicateWordValidatorEngine {
  /**
   * Validate a G-code program for duplicate words per block.
   */
  validate(gcode: string, options?: DWOptions): DWResult {
    const opts = {
      check_duplicates: options?.check_duplicates ?? true,
      check_multiple_g: options?.check_multiple_g ?? false,
      check_multiple_m: options?.check_multiple_m ?? false,
      monitored_letters: options?.monitored_letters ?? DEFAULT_MONITORED,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: DWIssue[] = [];
    const letterCount: Record<string, number> = {};

    let duplicatesFound = 0;
    let blocksScanned = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;
      if (code.trim() === "%") continue;
      blocksScanned++;

      // Extract every word on the block: letter followed by number.
      // A "word" is [A-Z] optionally followed by -, then digits with
      // optional decimal, with optional . prefix for things like X.5.
      const wordMatches = code.matchAll(/([A-Z])(-?\d*\.?\d*)/g);

      const byLetter: Record<string, string[]> = {};
      for (const m of wordMatches) {
        const letter = m[1];
        const value = m[2];
        // Skip if no numeric payload (e.g., stray letter in comment
        // not fully stripped). We only count actual word + number.
        if (value === "" && !opts.monitored_letters.includes(letter)) {
          continue;
        }
        if (!byLetter[letter]) byLetter[letter] = [];
        byLetter[letter].push(value);
      }

      for (const letter of Object.keys(byLetter)) {
        if (!opts.monitored_letters.includes(letter)) continue;
        const values = byLetter[letter];
        if (values.length < 2) continue;

        const allowMultiG = letter === "G" && !opts.check_multiple_g;
        const allowMultiM = letter === "M" && !opts.check_multiple_m;

        if (letter === "G") {
          // For G-words, we always flag the *strict* duplicate (same
          // exact token twice — G1 G1). Multi-group G (G0 G90) is only
          // flagged when check_multiple_g is on.
          const seenTokens = new Set<string>();
          const trueDups: string[] = [];
          for (const v of values) {
            const token = `G${v}`;
            if (seenTokens.has(token)) trueDups.push(v);
            seenTokens.add(token);
          }
          if (opts.check_duplicates && trueDups.length > 0) {
            duplicatesFound++;
            letterCount["G"] = (letterCount["G"] ?? 0) + 1;
            issues.push({
              line_number: idx + 1,
              kind: "duplicate_word",
              severity: "error",
              message: `G-word value repeated on block: G${trueDups.join(", G")}`,
              details: {
                letter: "G",
                occurrence_count: values.length,
                values: values.map((v) => `G${v}`),
              },
            });
          } else if (!allowMultiG && values.length >= 2) {
            issues.push({
              line_number: idx + 1,
              kind: "duplicate_g_multi_group",
              severity: "info",
              message: `Multiple G-words on block: G${values.join(" G")}`,
              details: {
                letter: "G",
                occurrence_count: values.length,
                values: values.map((v) => `G${v}`),
              },
            });
          }
          continue;
        }

        if (letter === "M") {
          if (opts.check_duplicates && this.hasTrueDuplicateToken(values, "M")) {
            duplicatesFound++;
            letterCount["M"] = (letterCount["M"] ?? 0) + 1;
            issues.push({
              line_number: idx + 1,
              kind: "duplicate_word",
              severity: "error",
              message: `M-word value repeated on block: M${values.join(", M")}`,
              details: {
                letter: "M",
                occurrence_count: values.length,
                values: values.map((v) => `M${v}`),
              },
            });
          } else if (!allowMultiM && values.length >= 2) {
            issues.push({
              line_number: idx + 1,
              kind: "duplicate_m_block",
              severity: "warning",
              message: `Multiple M-words on block: M${values.join(" M")}`,
              details: {
                letter: "M",
                occurrence_count: values.length,
                values: values.map((v) => `M${v}`),
              },
            });
          }
          continue;
        }

        // Any other letter — duplicate is always an error
        if (opts.check_duplicates) {
          duplicatesFound++;
          letterCount[letter] = (letterCount[letter] ?? 0) + 1;
          issues.push({
            line_number: idx + 1,
            kind: "duplicate_word",
            severity: "error",
            message: `Address letter ${letter} appears ${values.length} times on block: ${values.map((v) => letter + v).join(" ")}`,
            details: {
              letter,
              occurrence_count: values.length,
              values: values.map((v) => letter + v),
            },
          });
        }
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const info = issues.filter((i) => i.severity === "info").length;

    // Pick worst letter (highest duplicate count)
    let worstLetter: string | null = null;
    let worstCount = 0;
    for (const [k, v] of Object.entries(letterCount)) {
      if (v > worstCount) {
        worstCount = v;
        worstLetter = k;
      }
    }

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        blocks_scanned: blocksScanned,
        duplicates_found: duplicatesFound,
        worst_letter: worstLetter,
      },
    };
  }

  /**
   * Quick pass/fail.
   */
  quickCheck(
    gcode: string,
    options?: DWOptions,
  ): {
    valid: boolean;
    errors: number;
    duplicates_found: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      duplicates_found: r.summary.duplicates_found,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<DWOptions> {
    return {
      check_duplicates: true,
      check_multiple_g: false,
      check_multiple_m: false,
      monitored_letters: DEFAULT_MONITORED,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }

  private hasTrueDuplicateToken(values: string[], prefix: string): boolean {
    const seen = new Set<string>();
    for (const v of values) {
      const t = `${prefix}${v}`;
      if (seen.has(t)) return true;
      seen.add(t);
    }
    return false;
  }
}

export const ppDuplicateWordValidatorEngine =
  new PPDuplicateWordValidatorEngine();
