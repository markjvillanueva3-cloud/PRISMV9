/**
 * PPThreadCycleValidatorEngine — Validate lathe threading cycles
 *
 * Threading on a lathe is the highest-risk operation the machine does
 * per minute of cut: the insert is pulled across the part at exactly
 * spindle RPM × pitch, and any deviation scraps the part or snaps the
 * tool. Controllers provide compressed threading cycles to manage the
 * geometry and pecking:
 *
 *   G32  — single-pass threading (all controllers)
 *   G33  — synchronous feed (FANUC turning, similar to G32)
 *   G76  — multi-pass threading cycle (Fanuc/Mazak/most)
 *   G92  — simple single-pass threading cycle (older controllers)
 *
 * Failure modes this validator catches:
 *   - thread_without_feed_per_rev (error): threading without G95
 *     feed-per-rev mode active. Thread pitch = feed/rev; in G94 mode
 *     (feed/min) the pitch drifts with RPM — threads stripped.
 *   - thread_without_pitch_f (error): G32/G33/G92 with no F word for
 *     pitch. Controller uses last F (from the turning cycle) — wrong.
 *   - g76_missing_p_q_r (error): G76 without P (depth-of-cut profile
 *     params), Q (min DOC), or R (finish DOC) — cycle unresolvable.
 *   - thread_start_no_retract (warning): G32/G92 cycle with no prior
 *     rapid to thread-start X above stock — insert plows into shoulder.
 *   - css_mode_on_threading (error): G96 CSS active during threading.
 *     CSS changes RPM as diameter changes; pitch depends on RPM constancy.
 *     Threading REQUIRES G97 (constant RPM).
 *   - pitch_mismatch_across_passes (warning): multiple G32 passes with
 *     different F (pitch) values — not a finish pass, a bug.
 *
 * Scope — distinct from:
 *   - PPCannedCycleValidatorEngine: mill cycles G80-G89 (drill/tap/bore),
 *     including G84 tapping. Lathe threading is separate.
 *   - ThreadEngine: computes tap-drill sizes and thread specs, not G-code.
 *   - PPFeedOverrideValidatorEngine: general F-word sequencing, not
 *     pitch-specific.
 *
 * @module PPThreadCycleValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ThreadSeverity = "error" | "warning" | "info";

export interface ThreadIssue {
  line_number: number;
  kind:
    | "thread_without_feed_per_rev"
    | "thread_without_pitch_f"
    | "g76_missing_p_q_r"
    | "thread_start_no_retract"
    | "css_mode_on_threading"
    | "pitch_mismatch_across_passes";
  severity: ThreadSeverity;
  message: string;
  details?: {
    g_code?: "G32" | "G33" | "G76" | "G92";
    pitch?: number;
    expected_pitch?: number;
    feed_mode?: "G94" | "G95" | "G93";
    spindle_mode?: "G96" | "G97";
  };
}

export interface ThreadResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ThreadIssue[];
  summary: {
    valid: boolean;
    g32_count: number;
    g33_count: number;
    g76_count: number;
    g92_count: number;
    threading_passes: number;
    last_pitch: number | null;
  };
}

export interface ThreadOptions {
  check_feed_per_rev?: boolean;       // default true
  check_pitch_f?: boolean;            // default true
  check_g76_params?: boolean;         // default true
  check_retract_before?: boolean;     // default true
  check_css_off?: boolean;            // default true
  check_pitch_consistency?: boolean;  // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPThreadCycleValidatorEngine {
  /**
   * Validate threading-cycle usage.
   */
  validate(gcode: string, options?: ThreadOptions): ThreadResult {
    const opts = {
      check_feed_per_rev: options?.check_feed_per_rev ?? true,
      check_pitch_f: options?.check_pitch_f ?? true,
      check_g76_params: options?.check_g76_params ?? true,
      check_retract_before: options?.check_retract_before ?? true,
      check_css_off: options?.check_css_off ?? true,
      check_pitch_consistency: options?.check_pitch_consistency ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: ThreadIssue[] = [];

    let g32Count = 0;
    let g33Count = 0;
    let g76Count = 0;
    let g92Count = 0;
    let threadingPasses = 0;
    let lastPitch: number | null = null;

    // Modal state
    let feedMode: "G93" | "G94" | "G95" | null = null;
    let spindleMode: "G96" | "G97" | null = null;
    let sawRecentRapid = false;
    let firstPitchInGroup: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Feed mode updates
      if (/\bG0*93\b/.test(code)) feedMode = "G93";
      if (/\bG0*94\b/.test(code)) feedMode = "G94";
      if (/\bG0*95\b/.test(code)) feedMode = "G95";

      // Spindle mode updates
      if (/\bG0*96\b/.test(code)) spindleMode = "G96";
      if (/\bG0*97\b/.test(code)) spindleMode = "G97";

      // Track recent rapid for retract-before check
      if (/\bG0*0\b/.test(code)) sawRecentRapid = true;

      const hasG32 = /\bG0*32(?!\d)/.test(code);
      const hasG33 = /\bG0*33(?!\d)/.test(code);
      const hasG76 = /\bG0*76(?!\d)/.test(code);
      const hasG92 = /(?<!\d)G0*92(?!\d)/.test(code);
      const isThreadBlock = hasG32 || hasG33 || hasG76 || hasG92;

      if (!isThreadBlock) continue;

      const gLabel: "G32" | "G33" | "G76" | "G92" = hasG76
        ? "G76"
        : hasG92
          ? "G92"
          : hasG33
            ? "G33"
            : "G32";

      if (hasG32) g32Count++;
      if (hasG33) g33Count++;
      if (hasG76) g76Count++;
      if (hasG92) g92Count++;
      threadingPasses++;

      // Extract F (pitch)
      const fMatch = code.match(/\bF(\d+(?:\.\d+)?)/);
      const pitch = fMatch ? parseFloat(fMatch[1]) : null;
      if (pitch !== null) lastPitch = pitch;

      // thread_without_feed_per_rev
      if (opts.check_feed_per_rev && feedMode !== "G95") {
        issues.push({
          line_number: lineNum,
          kind: "thread_without_feed_per_rev",
          severity: "error",
          message: `${gLabel} threading without G95 feed-per-rev — current feed mode ${feedMode ?? "default"}; pitch will drift with RPM`,
          details: { g_code: gLabel, feed_mode: feedMode ?? undefined },
        });
      }

      // thread_without_pitch_f
      if (opts.check_pitch_f && pitch === null) {
        issues.push({
          line_number: lineNum,
          kind: "thread_without_pitch_f",
          severity: "error",
          message: `${gLabel} with no F word — pitch defaults to last F from turning cycle`,
          details: { g_code: gLabel },
        });
      }

      // g76_missing_p_q_r
      if (opts.check_g76_params && hasG76) {
        const hasP = /\bP\d+/.test(code);
        const hasQ = /\bQ\d+/.test(code);
        const hasR = /\bR-?\d+/.test(code);
        if (!hasP || !hasQ || !hasR) {
          const missing = [!hasP && "P", !hasQ && "Q", !hasR && "R"]
            .filter(Boolean)
            .join("/");
          issues.push({
            line_number: lineNum,
            kind: "g76_missing_p_q_r",
            severity: "error",
            message: `G76 missing required params: ${missing} — cycle unresolvable`,
            details: { g_code: "G76" },
          });
        }
      }

      // thread_start_no_retract (G32/G92 linear threading expects rapid-to-start)
      if (
        opts.check_retract_before &&
        (hasG32 || hasG92) &&
        !sawRecentRapid
      ) {
        issues.push({
          line_number: lineNum,
          kind: "thread_start_no_retract",
          severity: "warning",
          message: `${gLabel} threading without a preceding G0 rapid — insert may plow into shoulder`,
          details: { g_code: gLabel },
        });
      }

      // css_mode_on_threading
      if (opts.check_css_off && spindleMode === "G96") {
        issues.push({
          line_number: lineNum,
          kind: "css_mode_on_threading",
          severity: "error",
          message: `${gLabel} threading while G96 CSS active — RPM varies with diameter, pitch will drift; use G97 constant-RPM`,
          details: { g_code: gLabel, spindle_mode: "G96" },
        });
      }

      // pitch_mismatch_across_passes
      if (opts.check_pitch_consistency && pitch !== null) {
        if (firstPitchInGroup === null) {
          firstPitchInGroup = pitch;
        } else if (Math.abs(pitch - firstPitchInGroup) > 1e-6) {
          issues.push({
            line_number: lineNum,
            kind: "pitch_mismatch_across_passes",
            severity: "warning",
            message: `${gLabel} pitch ${pitch} differs from first pass pitch ${firstPitchInGroup} — not a finish pass, likely a bug`,
            details: {
              g_code: gLabel,
              pitch,
              expected_pitch: firstPitchInGroup,
            },
          });
        }
      }

      // Reset retract marker after consuming this block
      sawRecentRapid = false;
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
        g32_count: g32Count,
        g33_count: g33Count,
        g76_count: g76Count,
        g92_count: g92Count,
        threading_passes: threadingPasses,
        last_pitch: lastPitch,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: ThreadOptions,
  ): { valid: boolean; errors: number; threading_passes: number } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      threading_passes: r.summary.threading_passes,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<ThreadOptions> {
    return {
      check_feed_per_rev: true,
      check_pitch_f: true,
      check_g76_params: true,
      check_retract_before: true,
      check_css_off: true,
      check_pitch_consistency: true,
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

export const ppThreadCycleValidatorEngine = new PPThreadCycleValidatorEngine();
