/**
 * PPFeedModeValidatorEngine — Validate feed-rate mode (G93/G94/G95)
 *
 * The feed-rate modal group decides how the F-word is interpreted. A
 * silent switch between modes changes cutting speed by orders of
 * magnitude — the classic "I changed one letter and the tool snapped"
 * failure is usually G94→G95 crossing or a missed M5 before G95:
 *
 *   G93   — Inverse-time mode. F = 1/block_time_min. On 5-axis this
 *           is preferred because rotary axes have no "length".
 *   G94   — Feed per minute (mm/min or in/min). Default for mills.
 *   G95   — Feed per revolution (mm/rev or in/rev). Default for lathes
 *           and for rigid-tapping. Requires spindle rotating.
 *
 * Failure modes this validator catches:
 *   - feed_mode_mixed_in_block (error): G94 and G95 both appear on the
 *     same block. Undefined — controllers typically take the rightmost
 *     silently.
 *   - g95_with_spindle_off (error): G95 active while M5 (or no M3/M4
 *     has been issued). Feed becomes F × 0 rpm = 0; axis may never
 *     advance, or controller alarms.
 *   - cutting_without_feed (error): G1/G2/G3 issued without any prior
 *     F-word in the current feed mode. Some Fanucs default to F0 and
 *     alarm; others inherit stale F from prior mode change.
 *   - g93_without_f (error): G93 inverse-time mode requires an F-word
 *     on EVERY motion block (F is not modal under G93).
 *   - g93_unrealistic_f (warning): G93 with F > 9999. Block time =
 *     1/F min = <6ms — likely a misgenerated feed.
 *   - feed_mode_not_restored (info): program ends in G93 (inverse
 *     time) — portability flag if the file will be spliced.
 *
 * Scope — distinct from:
 *   - PPFeedOverrideValidatorEngine: feed override percent handling.
 *   - PPSpindleStateValidatorEngine: M3/M4/M5 state. We cross-check
 *     G95 against spindle state but own the feed-mode modal group.
 *   - PPThreadCycleValidatorEngine: threading requires G95 and we
 *     cross-check from the thread side; here we own the general
 *     feed-mode modal transitions.
 *
 * @module PPFeedModeValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type FMSeverity = "error" | "warning" | "info";

export interface FMIssue {
  line_number: number;
  kind:
    | "feed_mode_mixed_in_block"
    | "g95_with_spindle_off"
    | "cutting_without_feed"
    | "g93_without_f"
    | "g93_unrealistic_f"
    | "feed_mode_not_restored";
  severity: FMSeverity;
  message: string;
  details?: {
    active_mode?: "G93" | "G94" | "G95";
    initial_mode?: "G93" | "G94" | "G95";
    spindle_state?: "off" | "M3" | "M4";
    f_value?: number;
  };
}

export interface FMResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: FMIssue[];
  summary: {
    valid: boolean;
    g93_count: number;
    g94_count: number;
    g95_count: number;
    final_mode: "G93" | "G94" | "G95" | null;
    initial_mode: "G93" | "G94" | "G95" | null;
    cut_block_count: number;
  };
}

export interface FMOptions {
  check_mixed_in_block?: boolean;       // default true
  check_g95_spindle_off?: boolean;      // default true
  check_cutting_without_feed?: boolean; // default true
  check_g93_needs_f?: boolean;          // default true
  check_g93_unrealistic?: boolean;      // default true
  check_mode_restored?: boolean;        // default false (info)
  max_g93_f?: number;                   // default 9999
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPFeedModeValidatorEngine {
  /**
   * Validate feed-mode usage.
   */
  validate(gcode: string, options?: FMOptions): FMResult {
    const opts = {
      check_mixed_in_block: options?.check_mixed_in_block ?? true,
      check_g95_spindle_off: options?.check_g95_spindle_off ?? true,
      check_cutting_without_feed: options?.check_cutting_without_feed ?? true,
      check_g93_needs_f: options?.check_g93_needs_f ?? true,
      check_g93_unrealistic: options?.check_g93_unrealistic ?? true,
      check_mode_restored: options?.check_mode_restored ?? false,
      max_g93_f: options?.max_g93_f ?? 9999,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: FMIssue[] = [];

    let g93Count = 0;
    let g94Count = 0;
    let g95Count = 0;
    let cutBlockCount = 0;

    let feedMode: "G93" | "G94" | "G95" | null = null;
    let initialMode: "G93" | "G94" | "G95" | null = null;
    let spindleState: "off" | "M3" | "M4" = "off";
    let hasFInMode: boolean = false; // has an F-word been issued in current feed mode?
    let cuttingWithoutFeedFlagged = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Detect feed-mode tokens
      const hasG93 = /\bG0*93(?!\.\d)/.test(code);
      const hasG94 = /\bG0*94(?!\.\d)/.test(code);
      const hasG95 = /\bG0*95(?!\.\d)/.test(code);
      const modeTokens = [hasG93, hasG94, hasG95].filter(Boolean).length;

      // feed_mode_mixed_in_block
      if (opts.check_mixed_in_block && modeTokens > 1) {
        issues.push({
          line_number: lineNum,
          kind: "feed_mode_mixed_in_block",
          severity: "error",
          message: `Multiple feed-mode codes in one block — undefined behaviour`,
        });
      }

      // Apply feed-mode change (rightmost wins)
      if (hasG93) {
        g93Count++;
        feedMode = "G93";
        hasFInMode = false; // G93 F is per-block, reset
      } else if (hasG94) {
        g94Count++;
        feedMode = "G94";
        hasFInMode = false; // mode change resets F tracking
      } else if (hasG95) {
        g95Count++;
        feedMode = "G95";
        hasFInMode = false;
      }
      if (initialMode === null && feedMode !== null) {
        initialMode = feedMode;
      }

      // Spindle state
      if (/\bM0*3(?!\d)/.test(code)) spindleState = "M3";
      if (/\bM0*4(?!\d)/.test(code)) spindleState = "M4";
      if (/\bM0*5(?!\d)/.test(code)) spindleState = "off";

      // F-word tracking
      const fMatch = code.match(/\bF(-?\d+(?:\.\d+)?)/);
      const hasF = fMatch !== null;
      if (hasF) hasFInMode = true;

      // Motion detection
      const isCut =
        /\bG0*1(?!\d)/.test(code) ||
        /\bG0*2(?!\d)/.test(code) ||
        /\bG0*3(?!\d)/.test(code);
      if (isCut) cutBlockCount++;

      // g95_with_spindle_off
      if (
        opts.check_g95_spindle_off &&
        feedMode === "G95" &&
        isCut &&
        spindleState === "off"
      ) {
        issues.push({
          line_number: lineNum,
          kind: "g95_with_spindle_off",
          severity: "error",
          message: `G95 feed-per-rev with spindle stopped — effective feed is zero; axis will stall`,
          details: { active_mode: "G95", spindle_state: "off" },
        });
      }

      // cutting_without_feed (G94/G95 only; G93 is checked separately)
      if (
        opts.check_cutting_without_feed &&
        isCut &&
        !hasFInMode &&
        !hasF &&
        (feedMode === "G94" || feedMode === "G95") &&
        !cuttingWithoutFeedFlagged
      ) {
        issues.push({
          line_number: lineNum,
          kind: "cutting_without_feed",
          severity: "error",
          message: `Cutting motion in ${feedMode} mode without any F-word established`,
          details: { active_mode: feedMode },
        });
        cuttingWithoutFeedFlagged = true;
      }

      // g93_without_f: every G93 motion block needs its own F
      if (opts.check_g93_needs_f && feedMode === "G93" && isCut && !hasF) {
        issues.push({
          line_number: lineNum,
          kind: "g93_without_f",
          severity: "error",
          message: `G93 inverse-time mode requires F-word on every motion block (F is not modal under G93)`,
          details: { active_mode: "G93" },
        });
      }

      // g93_unrealistic_f
      if (
        opts.check_g93_unrealistic &&
        feedMode === "G93" &&
        hasF &&
        fMatch &&
        parseFloat(fMatch[1]) > opts.max_g93_f
      ) {
        issues.push({
          line_number: lineNum,
          kind: "g93_unrealistic_f",
          severity: "warning",
          message: `G93 F${fMatch[1]} implies block time = 1/${fMatch[1]} min (~${((60 / parseFloat(fMatch[1])) * 1000).toFixed(1)} ms) — likely mispost`,
          details: { active_mode: "G93", f_value: parseFloat(fMatch[1]) },
        });
      }
    }

    // feed_mode_not_restored
    if (
      opts.check_mode_restored &&
      initialMode !== null &&
      feedMode !== null &&
      feedMode !== initialMode
    ) {
      issues.push({
        line_number: lines.length,
        kind: "feed_mode_not_restored",
        severity: "info",
        message: `Program ended in ${feedMode}; initial mode was ${initialMode} — portability flag`,
        details: { active_mode: feedMode, initial_mode: initialMode },
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
        g93_count: g93Count,
        g94_count: g94Count,
        g95_count: g95Count,
        final_mode: feedMode,
        initial_mode: initialMode,
        cut_block_count: cutBlockCount,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: FMOptions,
  ): {
    valid: boolean;
    errors: number;
    final_mode: "G93" | "G94" | "G95" | null;
    cut_block_count: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      final_mode: r.summary.final_mode,
      cut_block_count: r.summary.cut_block_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<FMOptions> {
    return {
      check_mixed_in_block: true,
      check_g95_spindle_off: true,
      check_cutting_without_feed: true,
      check_g93_needs_f: true,
      check_g93_unrealistic: true,
      check_mode_restored: false,
      max_g93_f: 9999,
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

export const ppFeedModeValidatorEngine = new PPFeedModeValidatorEngine();
