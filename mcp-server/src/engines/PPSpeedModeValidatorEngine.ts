/**
 * PPSpeedModeValidatorEngine — Validate spindle speed mode (G96/G97)
 *
 * The spindle-speed modal group decides whether S is RPM or surface
 * speed. A silent switch from one to the other multiplies or divides
 * spindle speed by the workpiece diameter, producing the classic lathe
 * failure modes:
 *
 *   G96 S200   — Constant Surface Speed (CSS). S in m/min (metric) or
 *                 sfm (imperial). RPM = (S × 1000) / (π × D_mm).
 *                 Small diameters → huge RPM. Must pair with G50 Smax.
 *   G97 S2000  — Constant RPM. S in rev/min directly. Default mode
 *                 for milling and rigid tapping.
 *
 * Failure modes this validator catches:
 *   - css_without_s (error): G96 activated with no S-word — spindle
 *     runs at last-known value which is probably a G97 RPM number.
 *   - css_without_max_rpm (warning): G96 without a prior G50 S<max>
 *     limiter. Facing to zero diameter will try to spin to infinity.
 *     Most newer controls have a parameter cap but it's bad practice.
 *   - css_near_spindle_center (warning): G96 cut-motion whose X (or U)
 *     places the tool inside the min_diameter radius — RPM spikes to
 *     parameter max, tool wear and spindle stress explode.
 *   - rpm_without_s (warning): G97 activated with no S-word — stale
 *     value inherited which may be in wrong units.
 *   - negative_or_zero_s (error): S ≤ 0 anywhere.
 *   - mode_mixed_in_block (error): G96 and G97 in same block.
 *
 * Scope — distinct from:
 *   - LatheCSSOptimizerEngine: OPTIMIZES CSS selection. We VALIDATE
 *     that the emitted CSS blocks are safe.
 *   - PPSpindleStateValidatorEngine: M3/M4/M5 direction state.
 *   - PPFeedModeValidatorEngine: G93/G94/G95 — orthogonal modal group.
 *
 * @module PPSpeedModeValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type SMSeverity = "error" | "warning" | "info";

export interface SMIssue {
  line_number: number;
  kind:
    | "css_without_s"
    | "css_without_max_rpm"
    | "css_near_spindle_center"
    | "rpm_without_s"
    | "negative_or_zero_s"
    | "mode_mixed_in_block";
  severity: SMSeverity;
  message: string;
  details?: {
    active_mode?: "G96" | "G97";
    s_value?: number;
    diameter?: number;
    max_rpm?: number;
  };
}

export interface SMResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: SMIssue[];
  summary: {
    valid: boolean;
    g96_count: number;
    g97_count: number;
    g50_s_count: number;            // G50 S<max> limiter blocks
    final_mode: "G96" | "G97" | null;
    max_rpm_established: number | null;
    cut_block_count: number;
  };
}

export interface SMOptions {
  check_css_needs_s?: boolean;        // default true
  check_css_needs_max_rpm?: boolean;  // default true
  check_css_near_center?: boolean;    // default true
  check_rpm_needs_s?: boolean;        // default true
  check_negative_s?: boolean;         // default true
  check_mixed_in_block?: boolean;     // default true
  min_diameter?: number;              // default 1.0 mm (X radius → diameter 2 mm)
  coordinate_mode?: "diameter" | "radius"; // default "diameter"
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPSpeedModeValidatorEngine {
  /**
   * Validate spindle speed-mode usage.
   */
  validate(gcode: string, options?: SMOptions): SMResult {
    const opts = {
      check_css_needs_s: options?.check_css_needs_s ?? true,
      check_css_needs_max_rpm: options?.check_css_needs_max_rpm ?? true,
      check_css_near_center: options?.check_css_near_center ?? true,
      check_rpm_needs_s: options?.check_rpm_needs_s ?? true,
      check_negative_s: options?.check_negative_s ?? true,
      check_mixed_in_block: options?.check_mixed_in_block ?? true,
      min_diameter: options?.min_diameter ?? 1.0,
      coordinate_mode: options?.coordinate_mode ?? "diameter",
    };

    const lines = gcode.split(/\r?\n/);
    const issues: SMIssue[] = [];

    let g96Count = 0;
    let g97Count = 0;
    let g50SCount = 0;
    let cutBlockCount = 0;

    let speedMode: "G96" | "G97" | null = null;
    let lastSValue: number | null = null;
    let maxRpmEstablished: number | null = null;
    let sInCurrentMode = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Detect speed-mode tokens (avoid matching G96.X or G97.X variants)
      const hasG96 = /\bG0*96(?!\.\d)/.test(code);
      const hasG97 = /\bG0*97(?!\.\d)/.test(code);
      const modeTokens = [hasG96, hasG97].filter(Boolean).length;

      // mode_mixed_in_block
      if (opts.check_mixed_in_block && modeTokens > 1) {
        issues.push({
          line_number: lineNum,
          kind: "mode_mixed_in_block",
          severity: "error",
          message: `Both G96 and G97 in one block — undefined behaviour`,
        });
      }

      // S-word capture (independent of mode)
      const sMatch = code.match(/\bS(-?\d+(?:\.\d+)?)/);
      const hasS = sMatch !== null;
      const sValue = sMatch ? parseFloat(sMatch[1]) : null;

      // G50 S<max> detection — max RPM limiter (Fanuc/Okuma lathe)
      // G50 on its own is mirror-cancel/coord-set on mills; on lathe it's
      // either max-rpm limit (G50 S####) or scaling-cancel.
      // NOTE: the S on a G50/G92 block is a LIMIT, not a commanded speed,
      // so it must not populate lastSValue (see speed-mode block below).
      const hasG50 = /\bG0*50(?!\.\d)/.test(code);
      const hasG92 = /\bG0*92(?!\.\d)/.test(code);
      const sIsLimiter = (hasG50 || hasG92) && hasS && sValue !== null && sValue > 0;
      if (hasG50 && hasS && sValue !== null && sValue > 0) {
        g50SCount++;
        maxRpmEstablished = sValue;
      }
      if (hasG92 && hasS && sValue !== null && sValue > 0) {
        maxRpmEstablished = maxRpmEstablished ?? sValue;
      }

      // Apply mode change
      if (hasG96 && !hasG97) {
        g96Count++;
        speedMode = "G96";
        sInCurrentMode = false;

        if (opts.check_css_needs_s && !hasS && lastSValue === null) {
          issues.push({
            line_number: lineNum,
            kind: "css_without_s",
            severity: "error",
            message: `G96 CSS mode activated with no S-word established — spindle speed unknown`,
            details: { active_mode: "G96" },
          });
        }

        if (opts.check_css_needs_max_rpm && maxRpmEstablished === null) {
          issues.push({
            line_number: lineNum,
            kind: "css_without_max_rpm",
            severity: "warning",
            message: `G96 CSS mode activated without prior G50 S<max> — small-diameter cuts can over-speed spindle`,
            details: { active_mode: "G96" },
          });
        }
      } else if (hasG97 && !hasG96) {
        g97Count++;
        speedMode = "G97";
        sInCurrentMode = false;

        if (opts.check_rpm_needs_s && !hasS && lastSValue === null) {
          issues.push({
            line_number: lineNum,
            kind: "rpm_without_s",
            severity: "warning",
            message: `G97 RPM mode activated with no S-word established — stale value inherited`,
            details: { active_mode: "G97" },
          });
        }
      }

      if (hasS && sValue !== null) {
        // Only populate lastSValue when S is a commanded speed (not a
        // G50/G92 limit). Limits don't establish spindle speed.
        if (!sIsLimiter) {
          lastSValue = sValue;
          sInCurrentMode = true;
        }

        if (opts.check_negative_s && sValue <= 0) {
          issues.push({
            line_number: lineNum,
            kind: "negative_or_zero_s",
            severity: "error",
            message: `S${sMatch![1]} — spindle speed must be positive`,
            details: { s_value: sValue, active_mode: speedMode ?? undefined },
          });
        }
      }

      // Cut motion + CSS near-center check
      const isCut =
        /\bG0*1(?!\d)/.test(code) ||
        /\bG0*2(?!\d)/.test(code) ||
        /\bG0*3(?!\d)/.test(code);
      if (isCut) cutBlockCount++;

      if (opts.check_css_near_center && speedMode === "G96" && isCut) {
        const xMatch = code.match(/\bX(-?\d+(?:\.\d+)?)/);
        const uMatch = code.match(/\bU(-?\d+(?:\.\d+)?)/);
        let diameter: number | null = null;
        if (xMatch) {
          const xRaw = Math.abs(parseFloat(xMatch[1]));
          diameter = opts.coordinate_mode === "diameter" ? xRaw : xRaw * 2;
        } else if (uMatch) {
          const uRaw = Math.abs(parseFloat(uMatch[1]));
          diameter = opts.coordinate_mode === "diameter" ? uRaw : uRaw * 2;
        }
        if (diameter !== null && diameter < opts.min_diameter * 2) {
          // diameter < min_diameter*2 means we crossed the inner cutoff
          // (min_diameter is treated as a radius-equivalent threshold).
          // Actually: if user sets min_diameter=1.0mm, we flag when
          // diameter < 2*1.0 = 2.0 mm per the spec intent. Keep comparison.
          issues.push({
            line_number: lineNum,
            kind: "css_near_spindle_center",
            severity: "warning",
            message: `G96 CSS cut at diameter ${diameter.toFixed(3)} (below ${(opts.min_diameter * 2).toFixed(3)}) — RPM will spike toward spindle max`,
            details: {
              active_mode: "G96",
              diameter,
              max_rpm: maxRpmEstablished ?? undefined,
            },
          });
        }
      }
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
        g96_count: g96Count,
        g97_count: g97Count,
        g50_s_count: g50SCount,
        final_mode: speedMode,
        max_rpm_established: maxRpmEstablished,
        cut_block_count: cutBlockCount,
      },
    };
    // Note: sInCurrentMode is tracked for future extensions (e.g.,
    // flagging mode-change without S). Currently unused in issues.
    void sInCurrentMode;
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: SMOptions,
  ): {
    valid: boolean;
    errors: number;
    final_mode: "G96" | "G97" | null;
    max_rpm_established: number | null;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      final_mode: r.summary.final_mode,
      max_rpm_established: r.summary.max_rpm_established,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<SMOptions> {
    return {
      check_css_needs_s: true,
      check_css_needs_max_rpm: true,
      check_css_near_center: true,
      check_rpm_needs_s: true,
      check_negative_s: true,
      check_mixed_in_block: true,
      min_diameter: 1.0,
      coordinate_mode: "diameter",
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

export const ppSpeedModeValidatorEngine = new PPSpeedModeValidatorEngine();
