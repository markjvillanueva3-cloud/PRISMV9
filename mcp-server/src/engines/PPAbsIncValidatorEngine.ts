/**
 * PPAbsIncValidatorEngine — Validate absolute/incremental mode (G90/G91)
 *
 * The distance-mode modal group (Fanuc modal group 3) decides whether
 * axis words are absolute positions or incremental deltas. A silent
 * change from one to the other is one of the all-time-classic "part
 * scrapped / tool crashed" failures because every axis move after the
 * change is off by the wrong reference.
 *
 *   G90   — Absolute programming. X/Y/Z = target position in current
 *           work coordinate system. Default modal mode for most mills.
 *   G91   — Incremental programming. X/Y/Z = delta from current tool
 *           position. Common for G28/G30 safe-return and for drilling
 *           patterns with canned cycles.
 *
 * Failure modes this validator catches:
 *   - abs_inc_mixed_in_block (error): G90 and G91 both on the same
 *     block. Controllers take the rightmost silently — unpredictable.
 *   - no_initial_abs_inc (warning): program has motion before any G90
 *     or G91 is set. Inherits mode from previous program — on a
 *     cold-start that mode is undefined.
 *   - mode_switch_during_arc (error): distance mode changed on the
 *     same block as G2/G3 motion — the endpoint X/Y and the I/J/K are
 *     interpreted in inconsistent frames.
 *   - mode_switch_inside_canned_cycle (warning): G90/G91 changed while
 *     a G81–G89 canned cycle is active (before G80). Hole spacing gets
 *     reinterpreted, the classic "drilled the wrong grid" failure.
 *   - abs_inc_not_restored (info, opt-in): program ends in G91 when it
 *     started in G90 (or vice-versa) — portability flag if file will
 *     be spliced into a larger program.
 *   - g91_with_absolute_address (info, opt-in): G91 set but an axis
 *     word has an unusually large magnitude that looks like an
 *     absolute coordinate (configurable threshold).
 *
 * Scope — distinct from:
 *   - PPModalGroupConflictValidatorEngine: detects conflicts across
 *     all modal groups. We own the G90/G91 distance-mode group.
 *   - PPReferenceReturnValidatorEngine: checks G91 G28 pattern; we
 *     don't re-flag that canonical pairing.
 *   - PPPlaneSelectValidatorEngine: G17/G18/G19 (modal group 2).
 *
 * @module PPAbsIncValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type AISeverity = "error" | "warning" | "info";

export interface AIIssue {
  line_number: number;
  kind:
    | "abs_inc_mixed_in_block"
    | "no_initial_abs_inc"
    | "mode_switch_during_arc"
    | "mode_switch_inside_canned_cycle"
    | "abs_inc_not_restored"
    | "g91_with_absolute_address";
  severity: AISeverity;
  message: string;
  details?: {
    active_mode?: "G90" | "G91";
    initial_mode?: "G90" | "G91";
    canned_cycle?: string;
    axis?: string;
    value?: number;
  };
}

export interface AIResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: AIIssue[];
  summary: {
    valid: boolean;
    g90_count: number;
    g91_count: number;
    initial_mode: "G90" | "G91" | null;
    final_mode: "G90" | "G91" | null;
    motion_before_mode_set: number;
    mode_switch_count: number;
  };
}

export interface AIOptions {
  check_mixed_in_block?: boolean;          // default true
  check_initial_mode?: boolean;            // default true
  check_switch_during_arc?: boolean;       // default true
  check_switch_in_canned?: boolean;        // default true
  check_mode_restored?: boolean;           // default false (info)
  check_g91_large_address?: boolean;       // default false (info)
  g91_large_address_threshold?: number;    // default 100.0
}

// ── Engine ────────────────────────────────────────────────────────────

const CANNED_CYCLES = new Set([
  "G73",
  "G74",
  "G76",
  "G81",
  "G82",
  "G83",
  "G84",
  "G85",
  "G86",
  "G87",
  "G88",
  "G89",
]);

export class PPAbsIncValidatorEngine {
  /**
   * Validate absolute/incremental mode usage.
   */
  validate(gcode: string, options?: AIOptions): AIResult {
    const opts = {
      check_mixed_in_block: options?.check_mixed_in_block ?? true,
      check_initial_mode: options?.check_initial_mode ?? true,
      check_switch_during_arc: options?.check_switch_during_arc ?? true,
      check_switch_in_canned: options?.check_switch_in_canned ?? true,
      check_mode_restored: options?.check_mode_restored ?? false,
      check_g91_large_address:
        options?.check_g91_large_address ?? false,
      g91_large_address_threshold:
        options?.g91_large_address_threshold ?? 100.0,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: AIIssue[] = [];

    let g90Count = 0;
    let g91Count = 0;
    let distanceMode: "G90" | "G91" | null = null;
    let initialMode: "G90" | "G91" | null = null;
    let modeSwitchCount = 0;
    let motionBeforeModeSet = 0;
    let noInitialFlagged = false;

    // Track active canned cycle (set by G81-G89, cleared by G80)
    let activeCanned: string | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Detect distance-mode tokens (exclude variants like G90.1)
      const hasG90 = /\bG0*90(?!\.\d)/.test(code);
      const hasG91 = /\bG0*91(?!\.\d)/.test(code);
      const modeTokens = [hasG90, hasG91].filter(Boolean).length;

      // abs_inc_mixed_in_block
      if (opts.check_mixed_in_block && modeTokens > 1) {
        issues.push({
          line_number: lineNum,
          kind: "abs_inc_mixed_in_block",
          severity: "error",
          message: `G90 and G91 both in one block — undefined behaviour`,
        });
      }

      // Canned-cycle tracking (applied BEFORE mode change so we can
      // flag mode_switch_inside_canned using the previously active
      // cycle).
      let cannedThisBlock: string | null = null;
      for (const gc of CANNED_CYCLES) {
        const re = new RegExp(`\\b${gc}(?!\\.\\d)`);
        if (re.test(code)) {
          cannedThisBlock = gc;
          break;
        }
      }
      const hasG80 = /\bG0*80(?!\.\d)/.test(code);

      // Arc-motion detection
      const hasArc = /\bG0*2(?!\d)/.test(code) || /\bG0*3(?!\d)/.test(code);

      // mode_switch_during_arc
      if (
        opts.check_switch_during_arc &&
        modeTokens >= 1 &&
        hasArc &&
        distanceMode !== null
      ) {
        const newMode: "G90" | "G91" | null = hasG90 ? "G90" : hasG91 ? "G91" : null;
        if (newMode !== null && newMode !== distanceMode) {
          issues.push({
            line_number: lineNum,
            kind: "mode_switch_during_arc",
            severity: "error",
            message: `G90/G91 changed on same block as arc motion — endpoint and IJK reference frames diverge`,
            details: { active_mode: newMode },
          });
        }
      }

      // mode_switch_inside_canned_cycle (switch happens while an
      // existing canned cycle is active and G80 not on this block)
      if (
        opts.check_switch_in_canned &&
        modeTokens >= 1 &&
        activeCanned !== null &&
        !hasG80
      ) {
        const newMode: "G90" | "G91" | null = hasG90 ? "G90" : hasG91 ? "G91" : null;
        if (
          newMode !== null &&
          distanceMode !== null &&
          newMode !== distanceMode
        ) {
          issues.push({
            line_number: lineNum,
            kind: "mode_switch_inside_canned_cycle",
            severity: "warning",
            message: `G90/G91 changed inside ${activeCanned} canned cycle — hole spacing will be reinterpreted`,
            details: { active_mode: newMode, canned_cycle: activeCanned },
          });
        }
      }

      // Apply mode change (rightmost wins)
      if (hasG90 && !hasG91) {
        if (distanceMode !== null && distanceMode !== "G90") {
          modeSwitchCount++;
        }
        g90Count++;
        distanceMode = "G90";
        if (initialMode === null) initialMode = "G90";
      } else if (hasG91 && !hasG90) {
        if (distanceMode !== null && distanceMode !== "G91") {
          modeSwitchCount++;
        }
        g91Count++;
        distanceMode = "G91";
        if (initialMode === null) initialMode = "G91";
      }

      // Apply canned-cycle state after flags
      if (cannedThisBlock) activeCanned = cannedThisBlock;
      if (hasG80) activeCanned = null;

      // no_initial_abs_inc — motion blocks before any mode set
      const isMotion =
        /\bG0*0(?!\d)/.test(code) ||
        /\bG0*1(?!\d)/.test(code) ||
        /\bG0*2(?!\d)/.test(code) ||
        /\bG0*3(?!\d)/.test(code);

      if (
        opts.check_initial_mode &&
        isMotion &&
        distanceMode === null &&
        !noInitialFlagged
      ) {
        issues.push({
          line_number: lineNum,
          kind: "no_initial_abs_inc",
          severity: "warning",
          message: `Motion before any G90/G91 set — program inherits distance mode from prior state`,
        });
        noInitialFlagged = true;
      }
      if (isMotion && distanceMode === null) {
        motionBeforeModeSet++;
      }

      // g91_with_absolute_address (opt-in)
      if (
        opts.check_g91_large_address &&
        distanceMode === "G91" &&
        isMotion
      ) {
        const axisMatches = code.matchAll(
          /\b([XYZ])(-?\d+(?:\.\d+)?)/g,
        );
        for (const m of axisMatches) {
          const axis = m[1];
          const val = Math.abs(parseFloat(m[2]));
          if (val > opts.g91_large_address_threshold) {
            issues.push({
              line_number: lineNum,
              kind: "g91_with_absolute_address",
              severity: "info",
              message: `G91 mode with ${axis}${m[2]} — value > ${opts.g91_large_address_threshold} is suspicious as a delta`,
              details: { active_mode: "G91", axis, value: val },
            });
            break; // one flag per block
          }
        }
      }
    }

    // abs_inc_not_restored
    if (
      opts.check_mode_restored &&
      initialMode !== null &&
      distanceMode !== null &&
      distanceMode !== initialMode
    ) {
      issues.push({
        line_number: lines.length,
        kind: "abs_inc_not_restored",
        severity: "info",
        message: `Program ended in ${distanceMode}; initial mode was ${initialMode} — portability flag`,
        details: { active_mode: distanceMode, initial_mode: initialMode },
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
        g90_count: g90Count,
        g91_count: g91Count,
        initial_mode: initialMode,
        final_mode: distanceMode,
        motion_before_mode_set: motionBeforeModeSet,
        mode_switch_count: modeSwitchCount,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: AIOptions,
  ): {
    valid: boolean;
    errors: number;
    final_mode: "G90" | "G91" | null;
    mode_switch_count: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      final_mode: r.summary.final_mode,
      mode_switch_count: r.summary.mode_switch_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<AIOptions> {
    return {
      check_mixed_in_block: true,
      check_initial_mode: true,
      check_switch_during_arc: true,
      check_switch_in_canned: true,
      check_mode_restored: false,
      check_g91_large_address: false,
      g91_large_address_threshold: 100.0,
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

export const ppAbsIncValidatorEngine = new PPAbsIncValidatorEngine();
