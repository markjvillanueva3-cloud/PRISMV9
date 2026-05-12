/**
 * PPSafeStartBlockValidatorEngine — Validate program-start modal reset
 *
 * A responsible CNC program begins with a block (or small cluster of
 * blocks) that forces every modal group into a known-good state. This
 * is the defense-in-depth pattern that prevents the program from
 * inheriting dangerous state (wrong plane, wrong distance mode, stale
 * cutter comp or TLC, active canned cycle) from the prior program in
 * the queue.
 *
 * Canonical safe-start block on a 3-axis mill:
 *   G17 G90 G94 G40 G49 G80 G54 G21
 *
 * Meaning:
 *   G17   — XY plane (conservative default for mills)
 *   G90   — absolute distance programming
 *   G94   — feed per minute
 *   G40   — cutter comp cancelled
 *   G49   — tool-length comp cancelled
 *   G80   — no canned cycle active
 *   G54   — first work-coordinate system
 *   G21   — metric units (or G20 imperial)
 *
 * Failure modes this validator catches:
 *   - missing_plane_select (warning): no G17/G18/G19 in first N blocks
 *   - missing_distance_mode (warning): no G90/G91 in first N blocks
 *   - missing_feed_mode (warning): no G93/G94/G95 in first N blocks
 *   - cutter_comp_not_cancelled (error): G40 not explicitly issued
 *   - tool_length_not_cancelled (warning): G49 not explicitly issued
 *   - canned_cycle_not_cancelled (warning): G80 not explicitly issued
 *   - missing_work_offset (warning): no G54-G59 or G54.1 Pn in first
 *     N blocks
 *   - missing_units_mode (warning): no G20/G21 in first N blocks
 *   - motion_before_safe_start (error): motion block (G0/G1/G2/G3)
 *     emitted before any safe-start block has been seen
 *   - safe_start_spread_too_wide (info, opt-in): modal resets are
 *     present but scattered over too many blocks (weakens intent)
 *
 * Scope — distinct from:
 *   - PPPlaneSelectValidatorEngine: owns G17/G18/G19 runtime semantics;
 *     we cross-check absence of initial plane set.
 *   - PPAbsIncValidatorEngine: owns G90/G91 runtime modal group; we
 *     cross-check absence of initial distance-mode set.
 *   - PPUnitsModeValidatorEngine: owns G20/G21 modal group; we
 *     cross-check absence of initial units set.
 *   - PPSafetyRuleValidatorEngine: generic rule engine with a
 *     coarse safe_start_block text-contains check. We provide
 *     positional, per-modal-group issues with line numbers.
 *
 * @module PPSafeStartBlockValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type SSSeverity = "error" | "warning" | "info";

export interface SSIssue {
  line_number: number;
  kind:
    | "missing_plane_select"
    | "missing_distance_mode"
    | "missing_feed_mode"
    | "cutter_comp_not_cancelled"
    | "tool_length_not_cancelled"
    | "canned_cycle_not_cancelled"
    | "missing_work_offset"
    | "missing_units_mode"
    | "motion_before_safe_start"
    | "safe_start_spread_too_wide";
  severity: SSSeverity;
  message: string;
  details?: {
    window_blocks?: number;
    spread_blocks?: number;
    first_motion_line?: number;
  };
}

export interface SSResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: SSIssue[];
  summary: {
    valid: boolean;
    has_plane_select: boolean;
    has_distance_mode: boolean;
    has_feed_mode: boolean;
    has_cutter_comp_cancel: boolean;
    has_tool_length_cancel: boolean;
    has_canned_cycle_cancel: boolean;
    has_work_offset: boolean;
    has_units_mode: boolean;
    first_motion_line: number | null;
    safe_start_spread: number; // blocks between first and last modal reset
  };
}

export interface SSOptions {
  window_blocks?: number;                  // default 10 (first N blocks)
  check_plane_select?: boolean;            // default true
  check_distance_mode?: boolean;           // default true
  check_feed_mode?: boolean;               // default true
  check_cutter_comp_cancel?: boolean;      // default true
  check_tool_length_cancel?: boolean;      // default true
  check_canned_cycle_cancel?: boolean;     // default true
  check_work_offset?: boolean;             // default true
  check_units_mode?: boolean;              // default true
  check_motion_before_start?: boolean;     // default true
  check_spread?: boolean;                  // default false (info)
  max_spread_blocks?: number;              // default 5
  // Some post-processors issue the safe-start via a macro call; if
  // caller-knows-better, entire validation can be disabled.
  enabled?: boolean;                       // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPSafeStartBlockValidatorEngine {
  /**
   * Validate program-start modal reset.
   */
  validate(gcode: string, options?: SSOptions): SSResult {
    const opts = {
      window_blocks: options?.window_blocks ?? 10,
      check_plane_select: options?.check_plane_select ?? true,
      check_distance_mode: options?.check_distance_mode ?? true,
      check_feed_mode: options?.check_feed_mode ?? true,
      check_cutter_comp_cancel: options?.check_cutter_comp_cancel ?? true,
      check_tool_length_cancel: options?.check_tool_length_cancel ?? true,
      check_canned_cycle_cancel: options?.check_canned_cycle_cancel ?? true,
      check_work_offset: options?.check_work_offset ?? true,
      check_units_mode: options?.check_units_mode ?? true,
      check_motion_before_start: options?.check_motion_before_start ?? true,
      check_spread: options?.check_spread ?? false,
      max_spread_blocks: options?.max_spread_blocks ?? 5,
      enabled: options?.enabled ?? true,
    };

    const issues: SSIssue[] = [];

    if (!opts.enabled) {
      return this.emptyResult();
    }

    const lines = gcode.split(/\r?\n/);

    // Build non-empty, non-percent block list
    interface Block {
      line: number;
      code: string;
    }
    const blocks: Block[] = [];
    for (let idx = 0; idx < lines.length; idx++) {
      const code = this.stripComments(lines[idx]).toUpperCase().trim();
      if (code.length === 0) continue;
      if (code === "%") continue;
      // Skip O-number-only header lines — they're not modal blocks
      if (/^O\d+$/.test(code)) continue;
      blocks.push({ line: idx + 1, code });
    }

    const windowBlocks = blocks.slice(0, opts.window_blocks);

    // Detect each modal-reset element within the window
    let firstPlaneIdx = -1;
    let firstDistanceIdx = -1;
    let firstFeedIdx = -1;
    let firstCutterCompIdx = -1;
    let firstTLCIdx = -1;
    let firstCannedIdx = -1;
    let firstWorkOffsetIdx = -1;
    let firstUnitsIdx = -1;

    for (let i = 0; i < windowBlocks.length; i++) {
      const c = windowBlocks[i].code;
      if (firstPlaneIdx < 0 && /\bG0*1[789](?!\.\d)/.test(c)) firstPlaneIdx = i;
      if (firstDistanceIdx < 0 && /\bG0*9[01](?!\.\d)/.test(c))
        firstDistanceIdx = i;
      if (firstFeedIdx < 0 && /\bG0*9[345](?!\.\d)/.test(c)) firstFeedIdx = i;
      if (firstCutterCompIdx < 0 && /\bG0*40(?!\.\d)/.test(c))
        firstCutterCompIdx = i;
      if (firstTLCIdx < 0 && /\bG0*49(?!\.\d)/.test(c)) firstTLCIdx = i;
      if (firstCannedIdx < 0 && /\bG0*80(?!\.\d)/.test(c)) firstCannedIdx = i;
      if (
        firstWorkOffsetIdx < 0 &&
        (/\bG0*5[4-9](?!\.\d)/.test(c) || /\bG0*54\.1\s+P\d/.test(c))
      )
        firstWorkOffsetIdx = i;
      if (firstUnitsIdx < 0 && /\bG0*2[01](?!\.\d)/.test(c)) firstUnitsIdx = i;
    }

    // Find first motion block (scan entire program, not just window)
    let firstMotionIdx = -1;
    for (let i = 0; i < blocks.length; i++) {
      const c = blocks[i].code;
      if (
        /\bG0*0(?!\d)/.test(c) ||
        /\bG0*1(?!\d)/.test(c) ||
        /\bG0*2(?!\d)/.test(c) ||
        /\bG0*3(?!\d)/.test(c)
      ) {
        firstMotionIdx = i;
        break;
      }
    }
    const firstMotionLine =
      firstMotionIdx >= 0 ? blocks[firstMotionIdx].line : null;

    const anchorLine =
      blocks.length > 0 ? blocks[0].line : 1;

    // ── Issue checks ─────────────────────────────────────────────────

    if (opts.check_plane_select && firstPlaneIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "missing_plane_select",
        severity: "warning",
        message: `No G17/G18/G19 in first ${opts.window_blocks} blocks — plane inherited from prior program`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_distance_mode && firstDistanceIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "missing_distance_mode",
        severity: "warning",
        message: `No G90/G91 in first ${opts.window_blocks} blocks — distance mode inherited`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_feed_mode && firstFeedIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "missing_feed_mode",
        severity: "warning",
        message: `No G93/G94/G95 in first ${opts.window_blocks} blocks — feed mode inherited`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_cutter_comp_cancel && firstCutterCompIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "cutter_comp_not_cancelled",
        severity: "error",
        message: `No G40 in first ${opts.window_blocks} blocks — cutter comp may be stuck active from prior program`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_tool_length_cancel && firstTLCIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "tool_length_not_cancelled",
        severity: "warning",
        message: `No G49 in first ${opts.window_blocks} blocks — tool-length comp may be stuck active`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_canned_cycle_cancel && firstCannedIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "canned_cycle_not_cancelled",
        severity: "warning",
        message: `No G80 in first ${opts.window_blocks} blocks — canned cycle may be stuck active`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_work_offset && firstWorkOffsetIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "missing_work_offset",
        severity: "warning",
        message: `No G54-G59 in first ${opts.window_blocks} blocks — work offset inherited from prior program`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    if (opts.check_units_mode && firstUnitsIdx < 0) {
      issues.push({
        line_number: anchorLine,
        kind: "missing_units_mode",
        severity: "warning",
        message: `No G20/G21 in first ${opts.window_blocks} blocks — units inherited`,
        details: { window_blocks: opts.window_blocks },
      });
    }

    // motion_before_safe_start: any motion block whose position is
    // earlier than ALL modal-reset blocks we did find.
    if (opts.check_motion_before_start && firstMotionIdx >= 0) {
      const modalResetIdxs = [
        firstPlaneIdx,
        firstDistanceIdx,
        firstFeedIdx,
        firstCutterCompIdx,
        firstTLCIdx,
        firstCannedIdx,
        firstWorkOffsetIdx,
        firstUnitsIdx,
      ].filter((i) => i >= 0);

      if (modalResetIdxs.length > 0) {
        const firstReset = Math.min(...modalResetIdxs);
        if (firstMotionIdx < firstReset) {
          issues.push({
            line_number: blocks[firstMotionIdx].line,
            kind: "motion_before_safe_start",
            severity: "error",
            message: `Motion block at line ${blocks[firstMotionIdx].line} precedes any modal reset — unsafe program start`,
            details: { first_motion_line: blocks[firstMotionIdx].line },
          });
        }
      }
    }

    // safe_start_spread_too_wide
    const resetIdxs = [
      firstPlaneIdx,
      firstDistanceIdx,
      firstFeedIdx,
      firstCutterCompIdx,
      firstTLCIdx,
      firstCannedIdx,
      firstWorkOffsetIdx,
      firstUnitsIdx,
    ].filter((i) => i >= 0);

    const spread =
      resetIdxs.length >= 2
        ? Math.max(...resetIdxs) - Math.min(...resetIdxs) + 1
        : resetIdxs.length;

    if (
      opts.check_spread &&
      resetIdxs.length >= 2 &&
      spread > opts.max_spread_blocks
    ) {
      issues.push({
        line_number: blocks[Math.min(...resetIdxs)].line,
        kind: "safe_start_spread_too_wide",
        severity: "info",
        message: `Safe-start modal resets spread over ${spread} blocks — consolidate into a single header block`,
        details: { spread_blocks: spread },
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
        has_plane_select: firstPlaneIdx >= 0,
        has_distance_mode: firstDistanceIdx >= 0,
        has_feed_mode: firstFeedIdx >= 0,
        has_cutter_comp_cancel: firstCutterCompIdx >= 0,
        has_tool_length_cancel: firstTLCIdx >= 0,
        has_canned_cycle_cancel: firstCannedIdx >= 0,
        has_work_offset: firstWorkOffsetIdx >= 0,
        has_units_mode: firstUnitsIdx >= 0,
        first_motion_line: firstMotionLine,
        safe_start_spread: spread,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: SSOptions,
  ): {
    valid: boolean;
    errors: number;
    missing_count: number;
  } {
    const r = this.validate(gcode, options);
    const missing = [
      r.summary.has_plane_select,
      r.summary.has_distance_mode,
      r.summary.has_feed_mode,
      r.summary.has_cutter_comp_cancel,
      r.summary.has_tool_length_cancel,
      r.summary.has_canned_cycle_cancel,
      r.summary.has_work_offset,
      r.summary.has_units_mode,
    ].filter((x) => !x).length;
    return {
      valid: r.summary.valid,
      errors: r.errors,
      missing_count: missing,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<SSOptions> {
    return {
      window_blocks: 10,
      check_plane_select: true,
      check_distance_mode: true,
      check_feed_mode: true,
      check_cutter_comp_cancel: true,
      check_tool_length_cancel: true,
      check_canned_cycle_cancel: true,
      check_work_offset: true,
      check_units_mode: true,
      check_motion_before_start: true,
      check_spread: false,
      max_spread_blocks: 5,
      enabled: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }

  private emptyResult(): SSResult {
    return {
      total_issues: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      issues: [],
      summary: {
        valid: true,
        has_plane_select: false,
        has_distance_mode: false,
        has_feed_mode: false,
        has_cutter_comp_cancel: false,
        has_tool_length_cancel: false,
        has_canned_cycle_cancel: false,
        has_work_offset: false,
        has_units_mode: false,
        first_motion_line: null,
        safe_start_spread: 0,
      },
    };
  }
}

export const ppSafeStartBlockValidatorEngine =
  new PPSafeStartBlockValidatorEngine();
