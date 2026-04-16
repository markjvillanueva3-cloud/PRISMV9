/**
 * PPCommentedCodeValidatorEngine — Detect G-code hidden in comments
 *
 * Dead code commented out in G-code is a maintenance smell. It bloats
 * programs, confuses operators, and occasionally gets uncommented months
 * later when conditions have changed, reintroducing a bug the original
 * commit was trying to fix. Classic examples:
 *
 *   (G0 Z-5.0 WAS HERE BEFORE LAST CRASH)   ← dead motion command
 *   ;G1 X-1000. F100.                        ← disabled dangerous move
 *   (M30)                                     ← old end marker
 *   (T1 M6 — keep disabled for safety)       ← dead tool change
 *
 * Distinguish from legitimate comments:
 *   (FACE MILL 50MM)               ← documentation, no G-code syntax
 *   (OP2 - CONTOUR)                ← section label
 *   (PART # 12345 REV B)           ← metadata
 *   (TIME: 5:23)                   ← runtime estimate
 *
 * A comment is "commented-out code" when it contains a recognizable
 * G-code pattern (G/M word + number, or N-word + commands) that would
 * be valid motion/state if uncommented.
 *
 * Checks:
 *   - commented_gcode_block (info): `(G1 X10. F100.)` or `;G0 Z-5.`
 *   - commented_mcode (info): `(M30)` or `(M3 S1000)` on its own line
 *   - commented_tool_change (warning): `(T1 M6)` — safety risk if
 *     accidentally uncommented into a running program without the
 *     surrounding context that guards it.
 *   - large_commented_region (info): 5+ consecutive comment lines
 *     with G-code in them — signals a big disabled section.
 *   - mixed_comment_and_code (info): a line with both active G-code
 *     AND an inline comment containing G-code — e.g.,
 *     `G1 X10. F100. (G1 X20. was tested)`
 *
 * Scope — distinct from:
 *   - PPCharacterValidator: byte-level hygiene (BOM, mixed line ends).
 *   - PPGCodeLint: general lint, not comment-specific.
 *   - PPExpressionSyntaxValidator: Macro B expressions (no comments).
 *
 * @module PPCommentedCodeValidatorEngine
 */

export type CMCSeverity = "error" | "warning" | "info";

export type CMCIssueKind =
  | "commented_gcode_block"
  | "commented_mcode"
  | "commented_tool_change"
  | "large_commented_region"
  | "mixed_comment_and_code";

export interface CMCIssue {
  kind: CMCIssueKind;
  severity: CMCSeverity;
  line: number;
  comment_text?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CMCOptions {
  check_gcode_in_comment?: boolean;
  check_mcode_in_comment?: boolean;
  check_tool_change_in_comment?: boolean;
  check_large_region?: boolean;
  check_mixed_comment_code?: boolean;
  large_region_threshold?: number;
  ignore_header_lines?: number;
}

export interface CMCResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    comment_lines_seen: number;
    suspicious_comments: number;
  };
  issues: CMCIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<CMCOptions> = {
  check_gcode_in_comment: true,
  check_mcode_in_comment: true,
  check_tool_change_in_comment: true,
  check_large_region: true,
  check_mixed_comment_code: true,
  large_region_threshold: 5,
  ignore_header_lines: 0,
};

// Heuristics: a string looks like "G-code" if it contains:
//   - G-word (G0-G99.9) with at least one axis word OR numeric arg, OR
//   - M-word (M0-M99), OR
//   - N-word followed by G/M/axis,
// AND the total character count of G-code tokens makes up at least
// half of the non-space content. This filters out "(G-code has G1 here)".
const GCODE_WORD_RE = /\b[GM]\d+(\.\d+)?\b/g;
const AXIS_WORD_RE = /\b[XYZABCUVWIJKR]-?\d+\.?\d*/g;
const TOOL_CHANGE_RE = /\bT\d+\s+M0*6\b|\bM0*6\s+T\d+\b/i;

export class PPCommentedCodeValidatorEngine {
  validate(code: string, opts: CMCOptions = {}): CMCResult {
    const options: Required<CMCOptions> = { ...DEFAULT_OPTIONS, ...opts };
    const issues: CMCIssue[] = [];
    const lines = code.split(/\r?\n/);

    let commentLines = 0;
    let suspiciousCount = 0;
    let regionStart = -1;
    let regionCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (i < options.ignore_header_lines) continue;

      const comments = this.extractComments(raw);
      const activeCode = this.stripComments(raw).trim();
      const lineIsOnlyComment = activeCode === "" && comments.length > 0;

      if (comments.length === 0) {
        if (regionCount >= options.large_region_threshold) {
          if (options.check_large_region) {
            issues.push({
              kind: "large_commented_region",
              severity: "info",
              line: regionStart + 1,
              message: `${regionCount} consecutive commented G-code lines starting at line ${regionStart + 1}`,
              details: { span: regionCount },
            });
          }
        }
        regionCount = 0;
        regionStart = -1;
        continue;
      }

      commentLines++;

      // Evaluate each comment fragment
      let lineIsSuspicious = false;

      for (const c of comments) {
        const looksLikeCode = this.looksLikeGcode(c);
        if (!looksLikeCode) continue;

        lineIsSuspicious = true;

        // Tool change is highest priority
        if (
          options.check_tool_change_in_comment &&
          TOOL_CHANGE_RE.test(c)
        ) {
          issues.push({
            kind: "commented_tool_change",
            severity: "warning",
            line: i + 1,
            comment_text: c,
            message: `Commented tool-change '${c}' — uncommenting without context risks crash`,
          });
          continue;
        }

        const hasMcode = /\bM\d+\b/.test(c);
        const hasGcode = /\bG\d+/.test(c);
        // M-code-only classification: has M-word, no G-word, no axis words.
        // M3 S1000 qualifies (S is spindle speed, not axis).
        const hasGOnlyMcode =
          hasMcode &&
          !hasGcode &&
          !/\b[XYZABCUVWIJK]-?\d/.test(c);

        if (lineIsOnlyComment) {
          if (hasGcode && options.check_gcode_in_comment) {
            issues.push({
              kind: "commented_gcode_block",
              severity: "info",
              line: i + 1,
              comment_text: c,
              message: `Comment contains G-code '${c}' — likely disabled code`,
            });
          } else if (hasGOnlyMcode && options.check_mcode_in_comment) {
            issues.push({
              kind: "commented_mcode",
              severity: "info",
              line: i + 1,
              comment_text: c,
              message: `Comment contains M-code '${c}' — likely disabled state command`,
            });
          }
        } else {
          if (options.check_mixed_comment_code) {
            issues.push({
              kind: "mixed_comment_and_code",
              severity: "info",
              line: i + 1,
              comment_text: c,
              message: `Line has active G-code plus inline comment '${c}' that resembles code`,
            });
          }
        }
      }

      if (lineIsSuspicious) {
        suspiciousCount++;
        if (regionStart === -1) regionStart = i;
        regionCount++;
      } else {
        if (regionCount >= options.large_region_threshold) {
          if (options.check_large_region) {
            issues.push({
              kind: "large_commented_region",
              severity: "info",
              line: regionStart + 1,
              message: `${regionCount} consecutive commented G-code lines starting at line ${regionStart + 1}`,
              details: { span: regionCount },
            });
          }
        }
        regionCount = 0;
        regionStart = -1;
      }
    }

    if (regionCount >= options.large_region_threshold && options.check_large_region) {
      issues.push({
        kind: "large_commented_region",
        severity: "info",
        line: regionStart + 1,
        message: `${regionCount} consecutive commented G-code lines starting at line ${regionStart + 1}`,
        details: { span: regionCount },
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
        comment_lines_seen: commentLines,
        suspicious_comments: suspiciousCount,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    comment_lines: number;
    suspicious: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      comment_lines: r.summary.comment_lines_seen,
      suspicious: r.summary.suspicious_comments,
    };
  }

  defaultOptions(): Required<CMCOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private extractComments(line: string): string[] {
    const out: string[] = [];
    const parenRe = /\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = parenRe.exec(line)) !== null) {
      out.push(m[1].trim());
    }
    const semi = line.indexOf(";");
    if (semi !== -1) {
      out.push(line.substring(semi + 1).trim());
    }
    return out.filter((c) => c.length > 0);
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }

  private looksLikeGcode(text: string): boolean {
    const content = text.trim();
    if (content.length === 0) return false;

    // Must contain G-word or M-word with at least one digit
    const hasGM = /\b[GM]\d+/.test(content);
    if (!hasGM) return false;

    // Count matched G/M tokens and axis-word tokens — rough proxy
    // for "mostly G-code" vs "prose mentioning G1".
    const gmTokens = content.match(GCODE_WORD_RE) ?? [];
    const axisTokens = content.match(AXIS_WORD_RE) ?? [];
    const totalTokens = gmTokens.length + axisTokens.length;
    if (totalTokens === 0) return false;

    // Word count — simple split on whitespace
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return false;

    // Ratio: if ≥ 50% of words are G-code tokens, treat as commented code.
    // Also accept short comments (≤3 words) containing any G/M with numeric
    // arg — common pattern for quick-disables like "(G0 Z-5.)".
    if (words.length <= 3) {
      return gmTokens.length >= 1;
    }
    const codeRatio = totalTokens / words.length;
    if (codeRatio >= 0.5) return true;

    // Even in longer prose comments, a G-word immediately followed by an
    // axis word (e.g., "G1 X20." buried in "G1 X20. was tested for depth")
    // is a strong signal that real G-code was disabled here.
    if (/\b[GM]\d+\.?\d*\s+[XYZABCUVWIJKR]-?\d/.test(content)) {
      return true;
    }
    return false;
  }
}

export const ppCommentedCodeValidatorEngine =
  new PPCommentedCodeValidatorEngine();
