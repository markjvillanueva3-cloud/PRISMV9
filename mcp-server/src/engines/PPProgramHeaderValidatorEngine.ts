/**
 * PPProgramHeaderValidatorEngine — Validate program header/metadata comments
 *
 * Shop-floor G-code conventions require metadata comments at the top
 * of every program so operators, setup techs, and inspectors can
 * identify what the program makes and how to run it without opening
 * CAM. When those headers are missing, stale, or malformed, the
 * wrong fixture gets loaded, the wrong tools get staged, and the
 * part gets scrapped.
 *
 * Checks (all configurable; each can be disabled per shop):
 *   - missing_part_number (warning): no part/drawing number
 *     comment in header. Default pattern:
 *     /\b(PART|P\/N|DWG|DRAWING)[\s#:]*[A-Z0-9-]+/i
 *   - missing_tool_list (info): no tool list section. Detected by
 *     keyword "TOOL LIST", "TOOLING", or "T#" patterns.
 *   - tool_list_incomplete (warning): tools called via Tn M6 lack
 *     header comments describing them. Cross-references M6 calls
 *     with header tool-list entries.
 *   - missing_material (info): no material spec comment. Default
 *     pattern: /\bMATERIAL[\s:]*[A-Z0-9 -]+/i
 *   - missing_date (info): no date/programmed-on comment.
 *   - missing_revision (info): no revision/version comment.
 *   - header_too_short (info): fewer than min_header_lines comment
 *     lines in the first header_window lines (default 3/20).
 *   - malformed_tool_entry (warning): tool list line looks like a
 *     tool entry but doesn't match expected format (e.g., "(T1 )"
 *     with no description).
 *   - missing_programmer (info): no programmer/author tag.
 *   - header_comment_after_motion (info): required metadata comment
 *     appears AFTER first G/M motion — not in true header.
 *
 * Scope — distinct from:
 *   - PPCharacterValidatorEngine: byte-level hygiene (BOM, non-ASCII),
 *     not comment content.
 *   - PPLineNumberSanityEngine: N-word / % / O-number framing, not
 *     metadata presence.
 *   - PPGCodeLintEngine: token-level lint, not semantic metadata.
 *   - PPMacroVariableValidatorEngine: #<var> scoping, not header
 *     comments.
 *
 * Result shape:
 *   {
 *     summary: {
 *       valid, total_issues, header_lines, comment_lines,
 *       tools_called, tools_documented, has_part_number,
 *       has_tool_list, has_material, has_date, has_revision
 *     },
 *     issues: [...]
 *   }
 *
 * @module PPProgramHeaderValidatorEngine
 */

export type HeaderSeverity = "error" | "warning" | "info";

export type HeaderIssueKind =
  | "missing_part_number"
  | "missing_tool_list"
  | "tool_list_incomplete"
  | "missing_material"
  | "missing_date"
  | "missing_revision"
  | "header_too_short"
  | "malformed_tool_entry"
  | "missing_programmer"
  | "header_comment_after_motion";

export interface HeaderIssue {
  kind: HeaderIssueKind;
  severity: HeaderSeverity;
  line?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface HeaderValidationOptions {
  check_part_number?: boolean;
  check_tool_list?: boolean;
  check_tool_list_completeness?: boolean;
  check_material?: boolean;
  check_date?: boolean;
  check_revision?: boolean;
  check_header_length?: boolean;
  check_malformed_tool_entries?: boolean;
  check_programmer?: boolean;
  check_after_motion?: boolean;
  header_window?: number;
  min_header_lines?: number;
  part_number_pattern?: string;
  material_pattern?: string;
  date_pattern?: string;
  revision_pattern?: string;
  programmer_pattern?: string;
}

export interface HeaderValidationResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    header_lines: number;
    comment_lines: number;
    tools_called: number[];
    tools_documented: number[];
    has_part_number: boolean;
    has_tool_list: boolean;
    has_material: boolean;
    has_date: boolean;
    has_revision: boolean;
    has_programmer: boolean;
  };
  issues: HeaderIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<HeaderValidationOptions> = {
  check_part_number: true,
  check_tool_list: true,
  check_tool_list_completeness: true,
  check_material: true,
  check_date: true,
  check_revision: true,
  check_header_length: true,
  check_malformed_tool_entries: true,
  check_programmer: false,
  check_after_motion: true,
  header_window: 20,
  min_header_lines: 3,
  part_number_pattern: "\\b(PART|P\\/N|PN|DWG|DRAWING)[\\s#:]*[A-Z0-9-]+",
  material_pattern: "\\bMATERIAL\\b",
  date_pattern: "\\b(DATE|PROGRAMMED|CREATED)\\b",
  revision_pattern: "\\b(REV|REVISION|VERSION|VER)\\b",
  programmer_pattern: "\\b(PROGRAMMER|AUTHOR|BY|ENGINEER)\\b",
};

export class PPProgramHeaderValidatorEngine {
  validate(
    code: string,
    opts: HeaderValidationOptions = {},
  ): HeaderValidationResult {
    const options: Required<HeaderValidationOptions> = {
      ...DEFAULT_OPTIONS,
      ...opts,
    } as Required<HeaderValidationOptions>;
    const issues: HeaderIssue[] = [];

    const lines = code.split(/\r?\n/);
    const headerWindow = Math.max(1, options.header_window);

    // Locate program start (% or first O-line or first real content)
    let startIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0) {
        startIdx = i;
        break;
      }
    }
    // Skip leading %
    if (lines[startIdx]?.trim() === "%") startIdx++;
    // Skip leading O-number line
    if (/^\s*O\d+/.test(lines[startIdx] ?? "")) startIdx++;

    // Build header slice and find first motion line
    const headerEndIdx = Math.min(startIdx + headerWindow, lines.length);
    let firstMotionIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
      const stripped = this.stripComments(lines[i]);
      if (/\b[GM]\d/.test(stripped) && !/^\s*%\s*$/.test(stripped)) {
        firstMotionIdx = i;
        break;
      }
    }

    // Count comment lines in header window
    let commentLines = 0;
    const headerText: string[] = [];
    for (let i = startIdx; i < headerEndIdx; i++) {
      const t = lines[i]?.trim() ?? "";
      if (t.startsWith("(") || t.startsWith(";")) {
        commentLines++;
        headerText.push(t);
      }
    }
    const headerJoined = headerText.join("\n");

    const partNumRe = new RegExp(options.part_number_pattern, "i");
    const materialRe = new RegExp(options.material_pattern, "i");
    const dateRe = new RegExp(options.date_pattern, "i");
    const revisionRe = new RegExp(options.revision_pattern, "i");
    const programmerRe = new RegExp(options.programmer_pattern, "i");

    const hasPartNumber = partNumRe.test(headerJoined);
    const hasMaterial = materialRe.test(headerJoined);
    const hasDate = dateRe.test(headerJoined);
    const hasRevision = revisionRe.test(headerJoined);
    const hasProgrammer = programmerRe.test(headerJoined);

    // Collect tool calls via Tnn M6 anywhere
    const toolsCalled = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      const stripped = this.stripComments(lines[i]);
      const m6Match = stripped.match(/\bT(\d+)\b.*\bM0*6\b|\bM0*6\b.*\bT(\d+)\b/);
      if (m6Match) {
        const num = parseInt(m6Match[1] ?? m6Match[2], 10);
        if (!Number.isNaN(num)) toolsCalled.add(num);
      }
    }

    // Extract tool documentation from header
    const toolsDocumented = new Set<number>();
    const toolListRe = /\bT(\d+)\b/g;
    const hasToolList =
      /\bTOOL\s*LIST\b|\bTOOLING\b|\bT(OOLS)?\s*:/i.test(headerJoined) ||
      toolsCalled.size > 0 && /\(T\d+/.test(headerJoined);
    if (hasToolList || /\bT\d+\b/.test(headerJoined)) {
      let m: RegExpExecArray | null;
      while ((m = toolListRe.exec(headerJoined)) !== null) {
        const num = parseInt(m[1], 10);
        if (!Number.isNaN(num)) toolsDocumented.add(num);
      }
    }

    // --- Checks ---
    if (options.check_part_number && !hasPartNumber) {
      issues.push({
        kind: "missing_part_number",
        severity: "warning",
        message:
          "Program header has no part/drawing number (PART, P/N, DWG) comment",
      });
    }

    if (options.check_tool_list && !hasToolList && toolsCalled.size > 0) {
      issues.push({
        kind: "missing_tool_list",
        severity: "info",
        message: `Program calls ${toolsCalled.size} tool(s) but has no tool list in header`,
        details: { tools_called: Array.from(toolsCalled).sort((a, b) => a - b) },
      });
    }

    if (
      options.check_tool_list_completeness &&
      hasToolList &&
      toolsCalled.size > 0
    ) {
      const undocumented: number[] = [];
      for (const t of toolsCalled) {
        if (!toolsDocumented.has(t)) undocumented.push(t);
      }
      if (undocumented.length > 0) {
        issues.push({
          kind: "tool_list_incomplete",
          severity: "warning",
          message: `Tool list missing entries for T${undocumented.join(", T")}`,
          details: {
            undocumented_tools: undocumented.sort((a, b) => a - b),
          },
        });
      }
    }

    if (options.check_material && !hasMaterial) {
      issues.push({
        kind: "missing_material",
        severity: "info",
        message: "Program header has no MATERIAL comment",
      });
    }

    if (options.check_date && !hasDate) {
      issues.push({
        kind: "missing_date",
        severity: "info",
        message: "Program header has no DATE/PROGRAMMED comment",
      });
    }

    if (options.check_revision && !hasRevision) {
      issues.push({
        kind: "missing_revision",
        severity: "info",
        message: "Program header has no REV/REVISION comment",
      });
    }

    if (
      options.check_header_length &&
      commentLines < options.min_header_lines
    ) {
      issues.push({
        kind: "header_too_short",
        severity: "info",
        message: `Header has ${commentLines} comment line(s); expected at least ${options.min_header_lines}`,
        details: {
          comment_lines: commentLines,
          min_expected: options.min_header_lines,
        },
      });
    }

    if (options.check_programmer && !hasProgrammer) {
      issues.push({
        kind: "missing_programmer",
        severity: "info",
        message: "Program header has no PROGRAMMER/AUTHOR tag",
      });
    }

    if (options.check_malformed_tool_entries) {
      // Header lines that look like tool entries but are empty:
      // e.g., "(T1 )" or "( T2  )" or "(T3 - )" — no description
      const malformedRe = /^\s*\(\s*T\d+\s*[-:]?\s*\)\s*$/;
      for (let i = startIdx; i < headerEndIdx; i++) {
        if (malformedRe.test(lines[i] ?? "")) {
          issues.push({
            kind: "malformed_tool_entry",
            severity: "warning",
            line: i + 1,
            message: `Tool list entry is empty / has no description: ${lines[i].trim()}`,
          });
        }
      }
    }

    if (options.check_after_motion && firstMotionIdx !== -1) {
      // Look for metadata comments AFTER firstMotionIdx that should have been in header
      for (let i = firstMotionIdx; i < lines.length; i++) {
        const t = lines[i]?.trim() ?? "";
        if (!t.startsWith("(")) continue;
        const hit =
          (options.check_part_number && partNumRe.test(t)) ||
          (options.check_material && materialRe.test(t)) ||
          (options.check_revision && revisionRe.test(t));
        if (hit) {
          issues.push({
            kind: "header_comment_after_motion",
            severity: "info",
            line: i + 1,
            message: `Metadata comment appears after first motion: ${t}`,
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
        header_lines: headerEndIdx - startIdx,
        comment_lines: commentLines,
        tools_called: Array.from(toolsCalled).sort((a, b) => a - b),
        tools_documented: Array.from(toolsDocumented).sort((a, b) => a - b),
        has_part_number: hasPartNumber,
        has_tool_list: hasToolList,
        has_material: hasMaterial,
        has_date: hasDate,
        has_revision: hasRevision,
        has_programmer: hasProgrammer,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    has_part_number: boolean;
    has_tool_list: boolean;
    tools_called: number;
    comment_lines: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      has_part_number: r.summary.has_part_number,
      has_tool_list: r.summary.has_tool_list,
      tools_called: r.summary.tools_called.length,
      comment_lines: r.summary.comment_lines,
    };
  }

  defaultOptions(): Required<HeaderValidationOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppProgramHeaderValidatorEngine =
  new PPProgramHeaderValidatorEngine();
