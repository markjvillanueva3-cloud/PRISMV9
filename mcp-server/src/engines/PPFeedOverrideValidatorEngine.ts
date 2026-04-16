/**
 * PPFeedOverrideValidatorEngine — Validate F-word sequencing and modal feed
 *
 * The F-word (feed rate) is modal on virtually every controller — once
 * set, it persists until overridden. This creates a class of bugs that
 * look fine to a reader but explode at the machine:
 *   - first cutting move with no prior F → controller may fault, or
 *     worse, use last feed from the previous program at the wrong units.
 *   - F0 on a cutting move → tool sits, rubs, burns, breaks.
 *   - G0 lines with F-words → wasted data on well-behaved controllers,
 *     cycle aborts on strict controllers.
 *   - tool change without new F → new tool uses old tool's feed (shatter).
 *   - jump from F50 to F5000 between adjacent cuts → likely unit confusion.
 *
 * Checks:
 *   - first_motion_without_feed (error): first G1/G2/G3 has no modal F
 *     and no F on the line itself.
 *   - feed_is_zero (error): F0 on a cutting-move line.
 *   - rapid_with_feed_word (info): G0 line includes an F-word.
 *   - feed_after_tool_change_missing (warning): tool-change block
 *     (Txx M6) followed by cutting move without new F within a few lines.
 *   - excessive_feed_jump (warning): adjacent cutting moves with >10x
 *     feed ratio — almost always an error or unit mismatch.
 *
 * Scope — distinct from:
 *   - PPUnitsModeValidatorEngine: feed_scale_suspicious is unit-plausibility.
 *   - PPCannedCycleValidatorEngine: feed_not_set is canned-cycle entry only.
 *   - PPModalStateTrackerEngine: tracks F but doesn't judge transitions.
 *
 * @module PPFeedOverrideValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type FeedSeverity = "error" | "warning" | "info";

export interface FeedIssue {
  line_number: number;
  kind:
    | "first_motion_without_feed"
    | "feed_is_zero"
    | "rapid_with_feed_word"
    | "feed_after_tool_change_missing"
    | "excessive_feed_jump";
  severity: FeedSeverity;
  message: string;
  details?: {
    feed?: number;
    previous_feed?: number;
    ratio?: number;
    tool_change_line?: number;
  };
}

export interface FeedResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: FeedIssue[];
  summary: {
    valid: boolean;
    first_feed: number | null;
    last_feed: number | null;
    peak_feed: number | null;
    min_nonzero_feed: number | null;
    feed_change_count: number;
    cutting_moves: number;
    rapid_moves: number;
    tool_changes: number;
  };
}

export interface FeedOptions {
  excessive_feed_jump_ratio?: number;    // default 10 (10x jump triggers warning)
  tool_change_feed_window?: number;      // default 5 (check next 5 lines for F after Txx M6)
  flag_rapid_with_feed?: boolean;        // default true
  flag_excessive_jump?: boolean;         // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPFeedOverrideValidatorEngine {
  /**
   * Validate F-word sequencing in a G-code program.
   */
  validate(gcode: string, options?: FeedOptions): FeedResult {
    const opts = {
      excessive_feed_jump_ratio: options?.excessive_feed_jump_ratio ?? 10,
      tool_change_feed_window: options?.tool_change_feed_window ?? 5,
      flag_rapid_with_feed: options?.flag_rapid_with_feed ?? true,
      flag_excessive_jump: options?.flag_excessive_jump ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: FeedIssue[] = [];

    let modalFeed: number | null = null;
    let firstFeed: number | null = null;
    let lastFeed: number | null = null;
    let peakFeed: number | null = null;
    let minNonzeroFeed: number | null = null;
    let feedChangeCount = 0;
    let cuttingMoves = 0;
    let rapidMoves = 0;
    let toolChanges = 0;
    let pendingToolChangeLine: number | null = null;
    let pendingToolChangeLinesRemaining = 0;
    let previousCuttingFeed: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const fVal = this.readWord(code, "F");
      const hasG0 = /\bG0*0\b/.test(code);
      const hasCuttingMotion = /\bG0*[123]\b/.test(code) && !hasG0;
      const hasAnyMotionCoord = /[XYZIJKR]-?\d/.test(code);
      const hasToolChange = /\bT\d+\b/.test(code) && /\bM0*6\b/.test(code);

      // Tool change detection
      if (hasToolChange) {
        toolChanges++;
        pendingToolChangeLine = lineNum;
        pendingToolChangeLinesRemaining = opts.tool_change_feed_window;
      }

      // F-word processing
      if (fVal !== undefined) {
        if (fVal === 0 && hasCuttingMotion) {
          issues.push({
            line_number: lineNum,
            kind: "feed_is_zero",
            severity: "error",
            message: `F0 on cutting move — tool will stall and rub`,
            details: { feed: 0 },
          });
        }
        if (fVal > 0) {
          if (firstFeed === null) firstFeed = fVal;
          lastFeed = fVal;
          if (peakFeed === null || fVal > peakFeed) peakFeed = fVal;
          if (minNonzeroFeed === null || fVal < minNonzeroFeed) minNonzeroFeed = fVal;
          if (modalFeed !== fVal) feedChangeCount++;
          modalFeed = fVal;

          // Tool-change satisfaction
          if (pendingToolChangeLinesRemaining > 0) {
            pendingToolChangeLine = null;
            pendingToolChangeLinesRemaining = 0;
          }
        }
      }

      // Rapid with feed word
      if (hasG0 && fVal !== undefined && opts.flag_rapid_with_feed) {
        issues.push({
          line_number: lineNum,
          kind: "rapid_with_feed_word",
          severity: "info",
          message: `G0 rapid with F-word — F is ignored on rapid; some controllers fault`,
          details: { feed: fVal },
        });
      }

      if (hasG0 && hasAnyMotionCoord) {
        rapidMoves++;
      }

      // Cutting motion — check for missing initial feed
      if (hasCuttingMotion && hasAnyMotionCoord) {
        cuttingMoves++;

        if (modalFeed === null) {
          issues.push({
            line_number: lineNum,
            kind: "first_motion_without_feed",
            severity: "error",
            message: `Cutting move G1/G2/G3 with no prior F — controller uses stale feed`,
          });
        }

        // Tool-change feed check
        if (
          pendingToolChangeLine !== null &&
          pendingToolChangeLinesRemaining > 0 &&
          fVal === undefined
        ) {
          issues.push({
            line_number: lineNum,
            kind: "feed_after_tool_change_missing",
            severity: "warning",
            message: `Cutting move after tool change (line ${pendingToolChangeLine}) without new F — new tool uses old tool's feed`,
            details: { tool_change_line: pendingToolChangeLine },
          });
          pendingToolChangeLine = null;
          pendingToolChangeLinesRemaining = 0;
        }

        // Excessive feed jump
        const activeFeed = fVal !== undefined && fVal > 0 ? fVal : modalFeed;
        if (
          opts.flag_excessive_jump &&
          activeFeed !== null &&
          activeFeed > 0 &&
          previousCuttingFeed !== null &&
          previousCuttingFeed > 0
        ) {
          const ratio = Math.max(activeFeed / previousCuttingFeed, previousCuttingFeed / activeFeed);
          if (ratio >= opts.excessive_feed_jump_ratio) {
            issues.push({
              line_number: lineNum,
              kind: "excessive_feed_jump",
              severity: "warning",
              message: `Feed jump ${previousCuttingFeed} → ${activeFeed} (${ratio.toFixed(1)}x) — likely unit mismatch or typo`,
              details: { feed: activeFeed, previous_feed: previousCuttingFeed, ratio },
            });
          }
        }
        if (activeFeed !== null && activeFeed > 0) {
          previousCuttingFeed = activeFeed;
        }
      }

      // Decay tool-change window
      if (pendingToolChangeLinesRemaining > 0 && lineNum !== pendingToolChangeLine) {
        pendingToolChangeLinesRemaining--;
        if (pendingToolChangeLinesRemaining === 0) {
          pendingToolChangeLine = null;
        }
      }
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const info = issues.filter(i => i.severity === "info").length;

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        first_feed: firstFeed,
        last_feed: lastFeed,
        peak_feed: peakFeed,
        min_nonzero_feed: minNonzeroFeed,
        feed_change_count: feedChangeCount,
        cutting_moves: cuttingMoves,
        rapid_moves: rapidMoves,
        tool_changes: toolChanges,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: FeedOptions,
  ): { valid: boolean; errors: number; warnings: number; first_feed: number | null } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      first_feed: r.summary.first_feed,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<FeedOptions> {
    return {
      excessive_feed_jump_ratio: 10,
      tool_change_feed_window: 5,
      flag_rapid_with_feed: true,
      flag_excessive_jump: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private readWord(code: string, letter: string): number | undefined {
    const regex = new RegExp(`\\b${letter}(-?\\d+\\.?\\d*)\\b`);
    const m = code.match(regex);
    if (!m) return undefined;
    const v = parseFloat(m[1]);
    return Number.isNaN(v) ? undefined : v;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppFeedOverrideValidatorEngine = new PPFeedOverrideValidatorEngine();
