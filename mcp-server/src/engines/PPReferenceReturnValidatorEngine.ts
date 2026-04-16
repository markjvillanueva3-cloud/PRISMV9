/**
 * PPReferenceReturnValidatorEngine — Validate G28/G30/G53 reference moves
 *
 * Reference-return codes move axes to machine-home via an intermediate
 * point. They are the most common source of crash-on-tool-change because
 * the intermediate point is easy to get wrong and the codes interact
 * awkwardly with modal state:
 *
 *   G28 X0 Y0     — return to home via intermediate (0,0). In G91, the
 *                    intermediate IS the current position. In G90, X0 Y0
 *                    are absolute and the axes dive there first — often
 *                    a crash.
 *   G91 G28 Z0    — the canonical "safe Z first" pattern. Intermediate
 *                    is the current Z so axis goes straight home.
 *   G30 P2 X0 Y0  — return to secondary reference point (P1-P4).
 *   G53 X10. Y10. — one-shot machine-coordinate motion. Bypasses G54
 *                    offsets but TLC (G43) still applies.
 *
 * Failure modes this validator catches:
 *   - g28_with_cutter_comp (error): G28 while G41/G42 active. Fanuc
 *     alarm PS0040. G40 must cancel first.
 *   - g28_xy_without_safe_z (warning): G28 X or Y without an immediately
 *     preceding G28 Z. Axis may collide with a raised part before
 *     clearing.
 *   - g28_absolute_nonzero (warning): G90 G28 X5. Y5. — intermediate
 *     point is absolute and axes dive there before going home. Usually
 *     a mistake; the common safe idiom is G91 G28 Z0.
 *   - g30_p_out_of_range (error): G30 P with P < 1 or P > 4.
 *   - g53_with_non_rapid (warning): G53 combined with G1/G2/G3 in same
 *     block. Not a hard alarm on every control but defeats the intent.
 *   - g53_with_unreferenced_axis (info): G53 in a block where no axis
 *     word is given — no-op.
 *
 * Scope — distinct from:
 *   - PPWorkOffsetValidatorEngine: G54-G59 work offset validation. We
 *     validate machine-home and secondary reference returns.
 *   - PPAxisTravelValidatorEngine: envelope checks. We validate the
 *     return sequence; travel checks are orthogonal.
 *   - PPToolChangeValidatorEngine: M6 sequences. G28 often appears in
 *     tool-change sequences but we validate only the reference move.
 *
 * @module PPReferenceReturnValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type RRSeverity = "error" | "warning" | "info";

export interface RRIssue {
  line_number: number;
  kind:
    | "g28_with_cutter_comp"
    | "g28_xy_without_safe_z"
    | "g28_absolute_nonzero"
    | "g30_p_out_of_range"
    | "g53_with_non_rapid"
    | "g53_with_unreferenced_axis";
  severity: RRSeverity;
  message: string;
  details?: {
    cutter_comp?: "G41" | "G42";
    pos_mode?: "G90" | "G91";
    p_value?: number;
    g_motion?: string;
    axes_given?: string[];
  };
}

export interface RRResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: RRIssue[];
  summary: {
    valid: boolean;
    g28_count: number;
    g30_count: number;
    g53_count: number;
    safe_z_pattern_count: number;  // G91 G28 Z0 ... G91 G28 X0 Y0
  };
}

export interface RROptions {
  check_cutter_comp?: boolean;        // default true
  check_safe_z?: boolean;             // default true
  check_absolute_nonzero?: boolean;   // default true
  check_g30_p_range?: boolean;        // default true
  check_g53_motion?: boolean;         // default true
  check_g53_unreferenced?: boolean;   // default false (info only)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPReferenceReturnValidatorEngine {
  /**
   * Validate reference-return usage.
   */
  validate(gcode: string, options?: RROptions): RRResult {
    const opts = {
      check_cutter_comp: options?.check_cutter_comp ?? true,
      check_safe_z: options?.check_safe_z ?? true,
      check_absolute_nonzero: options?.check_absolute_nonzero ?? true,
      check_g30_p_range: options?.check_g30_p_range ?? true,
      check_g53_motion: options?.check_g53_motion ?? true,
      check_g53_unreferenced: options?.check_g53_unreferenced ?? false,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: RRIssue[] = [];

    let g28Count = 0;
    let g30Count = 0;
    let g53Count = 0;
    let safeZPatternCount = 0;

    let posMode: "G90" | "G91" = "G90"; // default absolute
    let cutterComp: "G41" | "G42" | null = null;
    let prevG28WasZOnly = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Modal updates BEFORE check logic (except G28 checks use pre-state)
      if (/\bG0*90(?!\.\d)/.test(code)) posMode = "G90";
      if (/\bG0*91(?!\.\d)/.test(code)) posMode = "G91";
      if (/\bG0*41\b/.test(code)) cutterComp = "G41";
      if (/\bG0*42\b/.test(code)) cutterComp = "G42";
      if (/\bG0*40\b/.test(code)) cutterComp = null;

      const hasG28 = /\bG0*28\b/.test(code) && !/\bG0*28\.\d/.test(code);
      const hasG30 = /\bG0*30\b/.test(code);
      const hasG53 = /\bG0*53\b/.test(code);

      // Axes referenced in this block
      const hasX = /\bX(-?\d)/.test(code);
      const hasY = /\bY(-?\d)/.test(code);
      const hasZ = /\bZ(-?\d)/.test(code);

      if (hasG28) {
        g28Count++;

        // g28_with_cutter_comp
        if (opts.check_cutter_comp && cutterComp !== null) {
          issues.push({
            line_number: lineNum,
            kind: "g28_with_cutter_comp",
            severity: "error",
            message: `G28 issued while ${cutterComp} cutter compensation active — Fanuc alarm PS0040; cancel with G40 first`,
            details: { cutter_comp: cutterComp },
          });
        }

        // g28_absolute_nonzero: G90 active, axes given with nonzero values
        if (opts.check_absolute_nonzero && posMode === "G90") {
          const nonzeroAxes: string[] = [];
          const xMatch = code.match(/\bX(-?\d+(?:\.\d+)?)/);
          const yMatch = code.match(/\bY(-?\d+(?:\.\d+)?)/);
          const zMatch = code.match(/\bZ(-?\d+(?:\.\d+)?)/);
          if (xMatch && parseFloat(xMatch[1]) !== 0) nonzeroAxes.push("X");
          if (yMatch && parseFloat(yMatch[1]) !== 0) nonzeroAxes.push("Y");
          if (zMatch && parseFloat(zMatch[1]) !== 0) nonzeroAxes.push("Z");
          if (nonzeroAxes.length > 0) {
            issues.push({
              line_number: lineNum,
              kind: "g28_absolute_nonzero",
              severity: "warning",
              message: `G28 in G90 absolute mode with nonzero axis word(s) ${nonzeroAxes.join(",")} — axes dive to intermediate before going home; prefer G91 G28 Z0`,
              details: { pos_mode: "G90", axes_given: nonzeroAxes },
            });
          }
        }

        // Safe-Z pattern tracking
        const isZOnly = hasZ && !hasX && !hasY;
        const isXY = (hasX || hasY) && !hasZ;
        if (opts.check_safe_z && isXY && !prevG28WasZOnly) {
          issues.push({
            line_number: lineNum,
            kind: "g28_xy_without_safe_z",
            severity: "warning",
            message: `G28 X/Y return without immediately preceding G28 Z — tool may collide with raised stock; use G91 G28 Z0 first`,
            details: { axes_given: [hasX ? "X" : "", hasY ? "Y" : ""].filter(Boolean) },
          });
        }
        if (isZOnly && posMode === "G91") prevG28WasZOnly = true;
        else if (isXY && prevG28WasZOnly) {
          safeZPatternCount++;
          prevG28WasZOnly = false;
        } else if (!isZOnly) {
          prevG28WasZOnly = false;
        }
      } else {
        // Any non-G28 block clears the safe-Z chain unless it's pure position modal
        const hasMotion = /\bG0*[0-3](?!\d)/.test(code);
        if (hasMotion) prevG28WasZOnly = false;
      }

      if (hasG30) {
        g30Count++;
        if (opts.check_g30_p_range) {
          const pMatch = code.match(/\bP(-?\d+)/);
          if (pMatch) {
            const p = parseInt(pMatch[1], 10);
            if (p < 1 || p > 4) {
              issues.push({
                line_number: lineNum,
                kind: "g30_p_out_of_range",
                severity: "error",
                message: `G30 P${p} — reference point selector must be 1..4`,
                details: { p_value: p },
              });
            }
          }
        }
      }

      if (hasG53) {
        g53Count++;
        // g53_with_non_rapid: G53 with G1/G2/G3
        if (opts.check_g53_motion) {
          const g1 = /\bG0*1(?!\d)/.test(code);
          const g2 = /\bG0*2(?!\d)/.test(code);
          const g3 = /\bG0*3(?!\d)/.test(code);
          if (g1 || g2 || g3) {
            const motion = g1 ? "G1" : g2 ? "G2" : "G3";
            issues.push({
              line_number: lineNum,
              kind: "g53_with_non_rapid",
              severity: "warning",
              message: `G53 machine-coordinate move combined with ${motion} cutting motion — prefer G53 with G0 rapid only`,
              details: { g_motion: motion },
            });
          }
        }

        // g53_with_unreferenced_axis
        if (
          opts.check_g53_unreferenced &&
          !hasX &&
          !hasY &&
          !hasZ
        ) {
          issues.push({
            line_number: lineNum,
            kind: "g53_with_unreferenced_axis",
            severity: "info",
            message: `G53 with no axis words — no-op block`,
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
        g28_count: g28Count,
        g30_count: g30Count,
        g53_count: g53Count,
        safe_z_pattern_count: safeZPatternCount,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: RROptions,
  ): {
    valid: boolean;
    errors: number;
    g28_count: number;
    safe_z_pattern_count: number;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      g28_count: r.summary.g28_count,
      safe_z_pattern_count: r.summary.safe_z_pattern_count,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<RROptions> {
    return {
      check_cutter_comp: true,
      check_safe_z: true,
      check_absolute_nonzero: true,
      check_g30_p_range: true,
      check_g53_motion: true,
      check_g53_unreferenced: false,
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

export const ppReferenceReturnValidatorEngine =
  new PPReferenceReturnValidatorEngine();
