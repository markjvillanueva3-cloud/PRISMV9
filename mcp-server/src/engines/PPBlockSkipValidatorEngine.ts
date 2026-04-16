/**
 * PPBlockSkipValidatorEngine — Validate block-skip and program-stop syntax
 *
 * Block skip (`/` prefix) and optional stop (M1) let operators toggle
 * lines or pause execution without editing code. Misused, they become
 * silent failure modes:
 *   - `/` prefix active by default but with no switch reference: the
 *     line runs every time, and the programmer's intent (to toggle
 *     test-mode) is lost.
 *   - Multi-level block skip (`/1`, `/2` ... on Fanuc 30i) referenced
 *     in program but control is set for single-level only: all skips
 *     treated as `/`, which may skip blocks the operator wanted to run.
 *   - M0 (unconditional stop) orphaned in the middle of a cycle: parts
 *     finished half-machined on night shift when no operator returned.
 *   - M1 with optional-stop switch off: intended pause never happens,
 *     part ships with unfinished feature.
 *   - Stop inside subprogram with no return: stack unwinds to main
 *     unexpectedly.
 *
 * Checks:
 *   - slash_without_switch (info): `/` prefix used but no `(OP: ...)`
 *     or `M01` comment explaining what switch it's tied to.
 *   - multi_level_slash (warning): `/2`, `/3` etc. in program —
 *     controller must support multi-level block skip (Fanuc 30i+,
 *     most Haas no).
 *   - m0_in_subprogram (warning): M0 inside an O-subprogram — stop
 *     blocks the sub, not the main, and operators often don't realize.
 *   - m1_without_optional (info): M1 present — reminder to verify
 *     operator has the optional-stop switch on for intended pause.
 *   - unconditional_stop_count (info): informational count of M0 stops.
 *
 * Scope — distinct from:
 *   - PPCallGraphValidatorEngine: M98/M99 call-graph resolution.
 *   - PPProgramChunkerEngine / PPProgramMergerEngine: split/merge at
 *     stops for prove-out workflows, not stop-syntax validation.
 *   - ProveOutModeEngine: switches stop behavior for dry-run modes.
 *
 * @module PPBlockSkipValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type BlockSkipSeverity = "error" | "warning" | "info";

export interface BlockSkipIssue {
  line_number: number;
  kind:
    | "slash_without_switch"
    | "multi_level_slash"
    | "m0_in_subprogram"
    | "m1_without_optional"
    | "slash_with_motion_start";
  severity: BlockSkipSeverity;
  message: string;
  details?: {
    level?: number;
    o_number?: number;
  };
}

export interface BlockSkipResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: BlockSkipIssue[];
  summary: {
    valid: boolean;
    slash_lines: number;
    slash_level_1: number;
    slash_multi_level: number;
    m0_count: number;          // unconditional program stop
    m1_count: number;          // optional stop
    m30_count: number;
    m2_count: number;
  };
}

export interface BlockSkipOptions {
  check_slash_without_switch?: boolean;   // default true (info only)
  check_multi_level?: boolean;            // default true
  check_m0_in_sub?: boolean;              // default true
  check_m1_info?: boolean;                // default false (noisy)
  /** Slash prefix at program start on a motion line. */
  check_slash_at_start?: boolean;         // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPBlockSkipValidatorEngine {
  /**
   * Validate block-skip and stop syntax.
   */
  validate(gcode: string, options?: BlockSkipOptions): BlockSkipResult {
    const opts = {
      check_slash_without_switch: options?.check_slash_without_switch ?? true,
      check_multi_level: options?.check_multi_level ?? true,
      check_m0_in_sub: options?.check_m0_in_sub ?? true,
      check_m1_info: options?.check_m1_info ?? false,
      check_slash_at_start: options?.check_slash_at_start ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: BlockSkipIssue[] = [];
    let slashLines = 0;
    let slashLevel1 = 0;
    let slashMultiLevel = 0;
    let m0Count = 0;
    let m1Count = 0;
    let m30Count = 0;
    let m2Count = 0;

    let currentONumber: number | null = null;
    let isMainProgram = true;
    let sawFirstMotion = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const rawTrim = raw.trim();
      const code = this.stripComments(raw).toUpperCase();

      // O-number changes program scope
      const oMatch = code.match(/^\s*O(\d+)\b/);
      if (oMatch) {
        if (currentONumber !== null) {
          // transition to next program
          isMainProgram = false;
        }
        currentONumber = parseInt(oMatch[1], 10);
        sawFirstMotion = false;
        continue;
      }

      if (code.length === 0) continue;

      // Leading slash (with optional digit)
      const slashMatch = rawTrim.match(/^\/(\d?)/);
      if (slashMatch) {
        slashLines++;
        const level = slashMatch[1] ? parseInt(slashMatch[1], 10) : 1;
        if (level > 1) {
          slashMultiLevel++;
          if (opts.check_multi_level) {
            issues.push({
              line_number: lineNum,
              kind: "multi_level_slash",
              severity: "warning",
              message: `Multi-level block skip /${level} — requires Fanuc 30i+ or equivalent; single-level controls ignore the digit`,
              details: { level },
            });
          }
        } else {
          slashLevel1++;
        }

        // First motion with leading slash is suspicious — if operator doesn't
        // flip the switch, the program starts mid-motion.
        if (
          opts.check_slash_at_start &&
          !sawFirstMotion &&
          /\bG0*[0123]\b/.test(code)
        ) {
          issues.push({
            line_number: lineNum,
            kind: "slash_with_motion_start",
            severity: "warning",
            message: `First motion line starts with "/" — if block-skip switch off, program may start mid-sequence`,
          });
        }

        // Slash without comment annotation
        const hasComment = /\([^)]*\)|;/.test(raw);
        if (opts.check_slash_without_switch && !hasComment) {
          issues.push({
            line_number: lineNum,
            kind: "slash_without_switch",
            severity: "info",
            message: `"/" block-skip with no comment explaining intended switch role — operator intent unclear`,
          });
        }
      }

      if (/\bM0*0\b/.test(code)) {
        m0Count++;
        if (opts.check_m0_in_sub && !isMainProgram && currentONumber !== null) {
          issues.push({
            line_number: lineNum,
            kind: "m0_in_subprogram",
            severity: "warning",
            message: `M0 inside subprogram O${currentONumber} — stops in subprogram are often unintended`,
            details: { o_number: currentONumber },
          });
        }
      }

      if (/\bM0*1\b/.test(code)) {
        m1Count++;
        if (opts.check_m1_info) {
          issues.push({
            line_number: lineNum,
            kind: "m1_without_optional",
            severity: "info",
            message: `M1 optional stop — verify operator has optional-stop switch on`,
          });
        }
      }

      if (/\bM0*30\b/.test(code)) m30Count++;
      if (/\bM0*2\b/.test(code) && !/\bM0*20\b/.test(code) && !/\bM0*21\b/.test(code)) {
        // Naive M2 detection — skip M20/M21 that share digits
        const m2Re = /(?<!\d)M0*2(?!\d)/;
        if (m2Re.test(code)) m2Count++;
      }

      if (/\bG0*[0123]\b/.test(code)) sawFirstMotion = true;
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
        slash_lines: slashLines,
        slash_level_1: slashLevel1,
        slash_multi_level: slashMultiLevel,
        m0_count: m0Count,
        m1_count: m1Count,
        m30_count: m30Count,
        m2_count: m2Count,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: BlockSkipOptions,
  ): { valid: boolean; warnings: number; slash_lines: number; m0_count: number; m1_count: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      warnings: r.warnings,
      slash_lines: r.summary.slash_lines,
      m0_count: r.summary.m0_count,
      m1_count: r.summary.m1_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<BlockSkipOptions> {
    return {
      check_slash_without_switch: true,
      check_multi_level: true,
      check_m0_in_sub: true,
      check_m1_info: false,
      check_slash_at_start: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppBlockSkipValidatorEngine = new PPBlockSkipValidatorEngine();
