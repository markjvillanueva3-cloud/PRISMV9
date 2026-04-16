/**
 * PPProgramSizeValidatorEngine — Validate program size and complexity
 *
 * Programs that are too large, too dense, or too complex crash controllers
 * and confuse operators in predictable ways:
 *   - Fanuc 0-MD caps out at ~99,999 blocks per program; newer 31i-B5 at
 *     ~400,000 blocks. Programs beyond either fail to load.
 *   - File sizes > 512 KB on some Haas controllers are rejected.
 *   - More than 50 tool changes per program makes manual tool-load
 *     error likely and exceeds many carousel capacities (24 pockets
 *     typical; 40-60 on larger mills).
 *   - Nested subprogram depth > 4 levels (Fanuc limit) causes PS 126.
 *   - Macro variable usage > 100 locals (#1–#33) spills into arguments
 *     or system variables — subtle corruption.
 *   - Block count dominated by comments (>60%) usually means the file
 *     is a CAM export with every operation annotated — often safe but
 *     bloats parser time.
 *
 * Checks:
 *   - too_many_blocks (error): line count > max_blocks (default 99,999).
 *   - too_many_tools (warning): distinct T-numbers > max_tools
 *     (default 24 for mill carousel, 12 for turret lathe).
 *   - too_many_tool_changes (warning): total T-calls followed by M6
 *     > max_tool_changes (default 50).
 *   - file_too_large (warning): byte size > max_file_kb (default 512).
 *   - excessive_subprogram_depth (error): M98 without matching M99 OR
 *     static nesting estimate > max_subprogram_depth (default 4).
 *   - comment_dense (info): comment-only lines > max_comment_ratio
 *     (default 60%).
 *   - excessive_macro_vars (warning): distinct #N references > 100 in
 *     the #1–#33 local range.
 *   - too_few_blocks (info): < min_blocks (default 5) — probably a
 *     test stub that shouldn't be committed.
 *
 * Scope — distinct from:
 *   - PPGCodeStatisticsEngine: pure descriptive stats, no thresholds.
 *   - PPCallGraphValidatorEngine: validates call edges and return balance;
 *     we only flag depth magnitude.
 *   - PPLineNumberSanityEngine: N-number formatting, not block counts.
 *   - PPCharacterValidatorEngine: byte-level hygiene, not size.
 *
 * @module PPProgramSizeValidatorEngine
 */

export type SizeSeverity = "error" | "warning" | "info";

export type SizeIssueKind =
  | "too_many_blocks"
  | "too_many_tools"
  | "too_many_tool_changes"
  | "file_too_large"
  | "excessive_subprogram_depth"
  | "comment_dense"
  | "excessive_macro_vars"
  | "too_few_blocks";

export interface SizeIssue {
  kind: SizeIssueKind;
  severity: SizeSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface SizeValidationOptions {
  check_block_count?: boolean;
  check_tool_count?: boolean;
  check_tool_changes?: boolean;
  check_file_size?: boolean;
  check_subprogram_depth?: boolean;
  check_comment_density?: boolean;
  check_macro_vars?: boolean;
  check_minimum_size?: boolean;
  max_blocks?: number;
  max_tools?: number;
  max_tool_changes?: number;
  max_file_kb?: number;
  max_subprogram_depth?: number;
  max_comment_ratio?: number;
  max_macro_vars?: number;
  min_blocks?: number;
}

export interface SizeValidationResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    block_count: number;
    tool_count: number;
    tool_change_count: number;
    file_bytes: number;
    comment_ratio: number;
    estimated_subprogram_depth: number;
    macro_var_count: number;
  };
  issues: SizeIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<SizeValidationOptions> = {
  check_block_count: true,
  check_tool_count: true,
  check_tool_changes: true,
  check_file_size: true,
  check_subprogram_depth: true,
  check_comment_density: true,
  check_macro_vars: false,
  check_minimum_size: false,
  max_blocks: 99999,
  max_tools: 24,
  max_tool_changes: 50,
  max_file_kb: 512,
  max_subprogram_depth: 4,
  max_comment_ratio: 0.6,
  max_macro_vars: 100,
  min_blocks: 5,
};

export class PPProgramSizeValidatorEngine {
  validate(
    code: string,
    opts: SizeValidationOptions = {},
  ): SizeValidationResult {
    const options: Required<SizeValidationOptions> = {
      ...DEFAULT_OPTIONS,
      ...opts,
    };
    const issues: SizeIssue[] = [];
    const lines = code.split(/\r?\n/);

    const fileBytes = new TextEncoder().encode(code).length;

    let blockCount = 0;
    let commentOnlyCount = 0;
    const tools = new Set<number>();
    let toolChangeCount = 0;
    const macroVars = new Set<number>();

    let subprogramDepthEst = 0;
    let subprogramRefs = 0;
    let subprogramReturns = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line === "" || line === "%") continue;
      blockCount++;

      const cleaned = this.stripComments(rawLine).trim();
      if (cleaned === "") {
        commentOnlyCount++;
        continue;
      }

      // Tool numbers (T1, T0101, etc.)
      const tMatch = cleaned.matchAll(/\bT(\d+)/g);
      for (const tm of tMatch) {
        tools.add(parseInt(tm[1], 10));
      }

      // Tool changes (M6)
      if (/\bM0*6(?!\d)/.test(cleaned)) {
        toolChangeCount++;
      }

      // Subprogram calls / returns
      if (/\bM0*98(?!\d)/.test(cleaned)) {
        subprogramRefs++;
      }
      if (/\bM0*99(?!\d)/.test(cleaned)) {
        subprogramReturns++;
      }

      // Macro local variables (#1–#33)
      const macroMatch = cleaned.matchAll(/#(\d+)/g);
      for (const mm of macroMatch) {
        const n = parseInt(mm[1], 10);
        if (n >= 1 && n <= 33) macroVars.add(n);
      }
    }

    // Estimate subprogram depth: unmatched M98 open calls equals depth.
    // Each M98 increments depth, each M99 decrements — worst case = max
    // running balance. Approximation: just use M98 count as upper bound.
    subprogramDepthEst = Math.max(subprogramRefs - subprogramReturns, 0);

    const commentRatio = blockCount === 0 ? 0 : commentOnlyCount / blockCount;

    // Checks
    if (options.check_block_count && blockCount > options.max_blocks) {
      issues.push({
        kind: "too_many_blocks",
        severity: "error",
        message: `Program has ${blockCount} blocks — exceeds ${options.max_blocks} controller limit`,
        details: { block_count: blockCount, max: options.max_blocks },
      });
    }

    if (options.check_tool_count && tools.size > options.max_tools) {
      issues.push({
        kind: "too_many_tools",
        severity: "warning",
        message: `${tools.size} distinct tools — exceeds carousel/turret capacity ${options.max_tools}`,
        details: { tool_count: tools.size, max: options.max_tools },
      });
    }

    if (
      options.check_tool_changes &&
      toolChangeCount > options.max_tool_changes
    ) {
      issues.push({
        kind: "too_many_tool_changes",
        severity: "warning",
        message: `${toolChangeCount} tool changes — exceeds recommended max ${options.max_tool_changes}`,
        details: {
          tool_change_count: toolChangeCount,
          max: options.max_tool_changes,
        },
      });
    }

    if (options.check_file_size && fileBytes / 1024 > options.max_file_kb) {
      issues.push({
        kind: "file_too_large",
        severity: "warning",
        message: `File size ${(fileBytes / 1024).toFixed(1)} KB exceeds max ${options.max_file_kb} KB`,
        details: {
          file_bytes: fileBytes,
          max_kb: options.max_file_kb,
        },
      });
    }

    if (
      options.check_subprogram_depth &&
      subprogramDepthEst > options.max_subprogram_depth
    ) {
      issues.push({
        kind: "excessive_subprogram_depth",
        severity: "error",
        message: `Estimated subprogram depth ${subprogramDepthEst} exceeds controller limit ${options.max_subprogram_depth} (unmatched M98 calls)`,
        details: {
          depth: subprogramDepthEst,
          max: options.max_subprogram_depth,
          m98_count: subprogramRefs,
          m99_count: subprogramReturns,
        },
      });
    }

    if (
      options.check_comment_density &&
      commentRatio > options.max_comment_ratio &&
      blockCount > 10
    ) {
      issues.push({
        kind: "comment_dense",
        severity: "info",
        message: `Comment-only blocks are ${(commentRatio * 100).toFixed(1)}% of program (threshold ${(options.max_comment_ratio * 100).toFixed(0)}%)`,
        details: {
          comment_ratio: commentRatio,
          comment_blocks: commentOnlyCount,
          total_blocks: blockCount,
        },
      });
    }

    if (
      options.check_macro_vars &&
      macroVars.size > options.max_macro_vars
    ) {
      issues.push({
        kind: "excessive_macro_vars",
        severity: "warning",
        message: `${macroVars.size} distinct local macro variables — exceeds recommended ${options.max_macro_vars}`,
        details: {
          macro_var_count: macroVars.size,
          max: options.max_macro_vars,
        },
      });
    }

    if (options.check_minimum_size && blockCount < options.min_blocks) {
      issues.push({
        kind: "too_few_blocks",
        severity: "info",
        message: `Only ${blockCount} blocks — likely a test stub (threshold ${options.min_blocks})`,
        details: { block_count: blockCount, min: options.min_blocks },
      });
    }

    const error_count = issues.filter((i) => i.severity === "error").length;
    const warning_count = issues.filter(
      (i) => i.severity === "warning",
    ).length;
    const info_count = issues.filter((i) => i.severity === "info").length;

    return {
      summary: {
        valid: error_count === 0,
        total_issues: issues.length,
        error_count,
        warning_count,
        info_count,
        block_count: blockCount,
        tool_count: tools.size,
        tool_change_count: toolChangeCount,
        file_bytes: fileBytes,
        comment_ratio: commentRatio,
        estimated_subprogram_depth: subprogramDepthEst,
        macro_var_count: macroVars.size,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    block_count: number;
    tool_count: number;
    file_kb: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      block_count: r.summary.block_count,
      tool_count: r.summary.tool_count,
      file_kb: r.summary.file_bytes / 1024,
    };
  }

  defaultOptions(): Required<SizeValidationOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppProgramSizeValidatorEngine =
  new PPProgramSizeValidatorEngine();
