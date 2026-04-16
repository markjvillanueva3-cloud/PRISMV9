/**
 * PPBlockCompositionValidatorEngine — Validate per-block layout rules
 *
 * Every G-code line is a "block" — a set of words executed
 * together. Controllers have limits and conventions on what words
 * can co-exist in one block, and violating those limits produces
 * one of three bad outcomes:
 *   - Hard alarm (multiple M-codes on Fanuc 0i without parameter
 *     #11202=1)
 *   - Silent parse failure where trailing words are dropped (very
 *     old controls)
 *   - Correct execution, but unreadable by humans — which is the
 *     long-tail cause of operator-edit bugs
 *
 * Checks (each configurable):
 *   - too_many_words_per_block (info): block has more tokens than
 *     max_words_per_block (default 12). Symptom of CAM posts that
 *     emit everything on one line.
 *   - multiple_m_codes_per_block (warning): more than max_m_per_block
 *     (default 1). Fanuc 0i-MF accepts up to 3 with parameter
 *     setting; older controls alarm.
 *   - multiple_g_same_group_per_block (warning): two G-codes from
 *     the same modal group in one block (e.g., G0 G1). Second wins
 *     silently — confusing to read and sometimes not what the
 *     programmer meant.
 *   - empty_block (info): block with just N-number, no code.
 *   - block_over_column_limit (info): block exceeds column_limit
 *     characters (default 80). DNC drip-feed on older controls
 *     truncates at 80.
 *   - irregular_word_order (info, opt-in): word order deviates
 *     from canonical N→G→M→X/Y/Z→I/J/K→R→F→S→T. Most controllers
 *     are order-insensitive but operators reading the program
 *     lose their place.
 *
 * Scope — distinct from:
 *   - PPModalGroupConflictValidator: focuses on modal STATE across
 *     blocks, this checks WITHIN-block multiplicity.
 *   - PPGCodeLintEngine: token-level syntactic lint, not layout.
 *   - PPLineNumberSanityEngine: N-word sequencing, not contents.
 *   - PPDuplicateWordValidatorEngine: same-letter duplicates like
 *     X10 X20; this flags same-group G-code duplicates like G0 G1.
 *
 * @module PPBlockCompositionValidatorEngine
 */

export type BlockSeverity = "error" | "warning" | "info";

export type BlockIssueKind =
  | "too_many_words_per_block"
  | "multiple_m_codes_per_block"
  | "multiple_g_same_group_per_block"
  | "empty_block"
  | "block_over_column_limit"
  | "irregular_word_order";

export interface BlockIssue {
  kind: BlockIssueKind;
  severity: BlockSeverity;
  line: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface BlockValidationOptions {
  check_words_per_block?: boolean;
  check_multiple_m?: boolean;
  check_same_group_g?: boolean;
  check_empty_block?: boolean;
  check_column_limit?: boolean;
  check_word_order?: boolean;
  max_words_per_block?: number;
  max_m_per_block?: number;
  column_limit?: number;
}

export interface BlockValidationResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    blocks_scanned: number;
    max_words_observed: number;
    max_columns_observed: number;
  };
  issues: BlockIssue[];
  total_issues: number;
}

// Fanuc G-code modal groups (subset used for same-group detection)
const G_MODAL_GROUPS: Record<string, string> = {
  // Motion (Group 01)
  "0": "01", "00": "01",
  "1": "01", "01": "01",
  "2": "01", "02": "01",
  "3": "01", "03": "01",
  // Plane (Group 02)
  "17": "02", "18": "02", "19": "02",
  // Distance mode (Group 03)
  "90": "03", "91": "03",
  // Feed mode (Group 05)
  "93": "05", "94": "05", "95": "05",
  // Units (Group 06)
  "20": "06", "21": "06",
  // Cutter comp (Group 07)
  "40": "07", "41": "07", "42": "07",
  // Tool length (Group 08)
  "43": "08", "44": "08", "49": "08",
  // Canned cycle (Group 09)
  "73": "09", "74": "09", "76": "09",
  "80": "09", "81": "09", "82": "09",
  "83": "09", "84": "09", "85": "09",
  "86": "09", "87": "09", "88": "09", "89": "09",
  // Coordinate system (Group 12)
  "54": "12", "55": "12", "56": "12", "57": "12", "58": "12", "59": "12",
};

// Canonical word order for irregular_word_order check
const WORD_ORDER_RANK: Record<string, number> = {
  N: 1, G: 2, M: 3, X: 4, Y: 5, Z: 6,
  A: 7, B: 8, C: 9,
  U: 10, V: 11, W: 12,
  I: 13, J: 14, K: 15,
  R: 16, P: 17, Q: 18, L: 19, H: 20, D: 21,
  F: 22, S: 23, T: 24,
};

const DEFAULT_OPTIONS: Required<BlockValidationOptions> = {
  check_words_per_block: true,
  check_multiple_m: true,
  check_same_group_g: true,
  check_empty_block: true,
  check_column_limit: true,
  check_word_order: false,
  max_words_per_block: 12,
  max_m_per_block: 1,
  column_limit: 80,
};

export class PPBlockCompositionValidatorEngine {
  validate(
    code: string,
    opts: BlockValidationOptions = {},
  ): BlockValidationResult {
    const options: Required<BlockValidationOptions> = {
      ...DEFAULT_OPTIONS,
      ...opts,
    } as Required<BlockValidationOptions>;
    const issues: BlockIssue[] = [];

    const lines = code.split(/\r?\n/);
    let blocksScanned = 0;
    let maxWords = 0;
    let maxColumns = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();

      // Skip empty, program framing (%), and pure comments
      if (trimmed === "" || trimmed === "%") continue;
      if (trimmed.startsWith("(") && trimmed.endsWith(")")) continue;
      if (trimmed.startsWith(";")) continue;

      blocksScanned++;

      const stripped = this.stripComments(raw);
      const cleaned = stripped.trim();
      if (cleaned === "") continue;

      // Column length (pre-strip, minus trailing whitespace)
      const effectiveCols = raw.trimEnd().length;
      if (effectiveCols > maxColumns) maxColumns = effectiveCols;
      if (
        options.check_column_limit &&
        effectiveCols > options.column_limit
      ) {
        issues.push({
          kind: "block_over_column_limit",
          severity: "info",
          line: i + 1,
          message: `Block length ${effectiveCols} exceeds column limit ${options.column_limit}`,
          details: { length: effectiveCols, limit: options.column_limit },
        });
      }

      // Tokenize: letter-digit pairs
      const tokenRe = /([A-Z])(-?\d*\.?\d*)/g;
      const tokens: { letter: string; value: string; raw: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = tokenRe.exec(cleaned)) !== null) {
        tokens.push({ letter: m[1], value: m[2], raw: m[0] });
      }
      if (tokens.length > maxWords) maxWords = tokens.length;

      // Empty block: only N-word, nothing else
      if (
        options.check_empty_block &&
        tokens.length === 1 &&
        tokens[0].letter === "N"
      ) {
        issues.push({
          kind: "empty_block",
          severity: "info",
          line: i + 1,
          message: `Block contains only N-number, no code: ${cleaned}`,
        });
      }

      // Too many words
      if (
        options.check_words_per_block &&
        tokens.length > options.max_words_per_block
      ) {
        issues.push({
          kind: "too_many_words_per_block",
          severity: "info",
          line: i + 1,
          message: `Block has ${tokens.length} words (limit ${options.max_words_per_block})`,
          details: {
            word_count: tokens.length,
            limit: options.max_words_per_block,
          },
        });
      }

      // Multiple M-codes
      if (options.check_multiple_m) {
        const mCodes = tokens.filter((t) => t.letter === "M");
        if (mCodes.length > options.max_m_per_block) {
          issues.push({
            kind: "multiple_m_codes_per_block",
            severity: "warning",
            line: i + 1,
            message: `Block has ${mCodes.length} M-codes (limit ${options.max_m_per_block}): ${mCodes.map((t) => t.raw).join(" ")}`,
            details: {
              m_count: mCodes.length,
              m_codes: mCodes.map((t) => t.raw),
            },
          });
        }
      }

      // Same-group G-codes
      if (options.check_same_group_g) {
        const gTokens = tokens.filter((t) => t.letter === "G");
        const groupMap = new Map<string, string[]>();
        for (const t of gTokens) {
          // Normalize G-value: strip leading zeros AND trailing .0
          const normalized = String(parseFloat(t.value || "0"));
          const group = G_MODAL_GROUPS[normalized];
          if (group) {
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(t.raw);
          }
        }
        for (const [group, gs] of groupMap) {
          if (gs.length > 1) {
            issues.push({
              kind: "multiple_g_same_group_per_block",
              severity: "warning",
              line: i + 1,
              message: `Block has ${gs.length} G-codes from same modal group ${group}: ${gs.join(" ")}`,
              details: { modal_group: group, g_codes: gs },
            });
          }
        }
      }

      // Irregular word order
      if (options.check_word_order && tokens.length >= 3) {
        let lastRank = 0;
        let irregular = false;
        for (const t of tokens) {
          const rank = WORD_ORDER_RANK[t.letter];
          if (rank !== undefined) {
            if (rank < lastRank) {
              irregular = true;
              break;
            }
            lastRank = rank;
          }
        }
        if (irregular) {
          issues.push({
            kind: "irregular_word_order",
            severity: "info",
            line: i + 1,
            message: `Block word order deviates from canonical N→G→M→XYZ→IJK→RPQLHD→FST: ${cleaned}`,
            details: { tokens: tokens.map((t) => t.raw) },
          });
        }
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
        blocks_scanned: blocksScanned,
        max_words_observed: maxWords,
        max_columns_observed: maxColumns,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    blocks: number;
    max_words: number;
    max_cols: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      blocks: r.summary.blocks_scanned,
      max_words: r.summary.max_words_observed,
      max_cols: r.summary.max_columns_observed,
    };
  }

  defaultOptions(): Required<BlockValidationOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppBlockCompositionValidatorEngine =
  new PPBlockCompositionValidatorEngine();
