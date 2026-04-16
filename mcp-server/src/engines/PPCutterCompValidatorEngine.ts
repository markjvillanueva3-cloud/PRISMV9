/**
 * PPCutterCompValidatorEngine — Validate G40/G41/G42 cutter compensation
 *
 * Cutter radius compensation lets the programmer write centerline paths
 * while the control offsets for the tool radius. Misuse causes gouges,
 * zero-diameter moves, or the control alarming mid-cut.
 *
 * G-code reference:
 *   G40 = cancel comp
 *   G41 = comp left (climb for ISO milling)
 *   G42 = comp right (conventional)
 *   D<n> = radius offset register number
 *
 * Checks:
 *   - comp_without_d (error): G41/G42 without D-word AND no modal D.
 *     Controller alarms or uses D0 (zero-radius comp = no effect).
 *   - comp_activation_without_linear (warning): G41/G42 activated on a
 *     G0 (rapid) or non-XY-motion block. Activation must be on a G1/G2/G3
 *     XY move — Fanuc classic errors P/S002 otherwise.
 *   - comp_cancel_without_retract (warning): G40 issued while still at
 *     cutting Z. Best practice is retract → G40 — otherwise the control
 *     moves on the cancel block (off-path travel at feed rate).
 *   - conflicting_comp_same_line (error): G41 and G42 on same line.
 *   - comp_redundant (info): G41 while G41 already active (same side).
 *   - comp_change_without_g40 (warning): G41 → G42 (or vice-versa) with
 *     no G40 between — most controls reject but some interpret as flip.
 *   - comp_left_at_program_end (warning): program ends (M30/M2) without
 *     G40. Next program inherits comp mode on some controls.
 *
 * Scope — distinct from:
 *   - PPModalStateTrackerEngine: tracks the active cutter_comp mode.
 *   - PPToolChangeValidatorEngine: checks "comp-active at M6" but doesn't
 *     validate the full activation/cancel pattern.
 *
 * @module PPCutterCompValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type CompSeverity = "error" | "warning" | "info";

export interface CompIssue {
  line_number: number;
  kind:
    | "comp_without_d"
    | "comp_activation_without_linear"
    | "comp_cancel_without_retract"
    | "conflicting_comp_same_line"
    | "comp_redundant"
    | "comp_change_without_g40"
    | "comp_left_at_program_end";
  severity: CompSeverity;
  message: string;
  details?: {
    cycle?: "G40" | "G41" | "G42";
    d_value?: number;
    previous_mode?: "G40" | "G41" | "G42" | null;
    z_value?: number;
  };
}

export interface CutterCompResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: CompIssue[];
  summary: {
    valid: boolean;
    g40_count: number;
    g41_count: number;
    g42_count: number;
    d_offsets_used: number[];
    final_mode: "G40" | "G41" | "G42" | null;
  };
}

export interface CutterCompOptions {
  safe_z_mm?: number;            // default 5 — below this is considered cutting Z
  require_linear_activation?: boolean; // default true
  warn_missing_final_g40?: boolean;    // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPCutterCompValidatorEngine {
  /**
   * Validate cutter compensation usage in a G-code program.
   */
  validate(
    gcode: string,
    options?: CutterCompOptions,
  ): CutterCompResult {
    const opts = {
      safe_z_mm: options?.safe_z_mm ?? 5,
      require_linear_activation: options?.require_linear_activation ?? true,
      warn_missing_final_g40: options?.warn_missing_final_g40 ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: CompIssue[] = [];
    const dOffsetsUsed = new Set<number>();

    let activeMode: "G40" | "G41" | "G42" | null = null;
    let modalD: number | null = null;
    let currentZ = 0;
    let g40Count = 0;
    let g41Count = 0;
    let g42Count = 0;
    let programEndLine: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Update Z
      const zVal = this.readWord(code, "Z");
      if (zVal !== undefined) currentZ = zVal;

      // Update modal D
      const dVal = this.readWord(code, "D");
      if (dVal !== undefined) {
        modalD = dVal;
        dOffsetsUsed.add(dVal);
      }

      // Detect comp codes
      const hasG40 = /\bG0*40\b/.test(code);
      const hasG41 = /\bG0*41\b/.test(code);
      const hasG42 = /\bG0*42\b/.test(code);

      // Conflicting same line
      if ((hasG41 && hasG42) || (hasG40 && hasG41) || (hasG40 && hasG42)) {
        issues.push({
          line_number: lineNum,
          kind: "conflicting_comp_same_line",
          severity: "error",
          message: `Multiple comp codes on same line — cannot mix G40/G41/G42`,
        });
      }

      if (hasG41) {
        g41Count++;
        // comp_without_d
        if (dVal === undefined && modalD === null) {
          issues.push({
            line_number: lineNum,
            kind: "comp_without_d",
            severity: "error",
            message: `G41 without D-word (radius offset) and no modal D`,
            details: { cycle: "G41" },
          });
        }
        // comp_activation_without_linear
        if (opts.require_linear_activation) {
          const hasLinear = /\bG0*1\b/.test(code);
          const hasRapid = /\bG0*0\b/.test(code);
          const hasXY = /[XY]-?\d/.test(code);
          if (!hasLinear && hasRapid && hasXY) {
            issues.push({
              line_number: lineNum,
              kind: "comp_activation_without_linear",
              severity: "warning",
              message: `G41 activated on G0 rapid block — activate on G1 linear move`,
              details: { cycle: "G41" },
            });
          } else if (!hasLinear && !hasXY) {
            issues.push({
              line_number: lineNum,
              kind: "comp_activation_without_linear",
              severity: "warning",
              message: `G41 activated without a G1 XY linear move on same block`,
              details: { cycle: "G41" },
            });
          }
        }
        // redundant
        if (activeMode === "G41") {
          issues.push({
            line_number: lineNum,
            kind: "comp_redundant",
            severity: "info",
            message: `G41 while left comp already active`,
            details: { cycle: "G41" },
          });
        }
        // comp_change_without_g40
        if (activeMode === "G42") {
          issues.push({
            line_number: lineNum,
            kind: "comp_change_without_g40",
            severity: "warning",
            message: `G41 (left) directly from G42 (right) — insert G40 between`,
            details: { cycle: "G41", previous_mode: "G42" },
          });
        }
        activeMode = "G41";
      }

      if (hasG42) {
        g42Count++;
        if (dVal === undefined && modalD === null) {
          issues.push({
            line_number: lineNum,
            kind: "comp_without_d",
            severity: "error",
            message: `G42 without D-word (radius offset) and no modal D`,
            details: { cycle: "G42" },
          });
        }
        if (opts.require_linear_activation) {
          const hasLinear = /\bG0*1\b/.test(code);
          const hasRapid = /\bG0*0\b/.test(code);
          const hasXY = /[XY]-?\d/.test(code);
          if (!hasLinear && hasRapid && hasXY) {
            issues.push({
              line_number: lineNum,
              kind: "comp_activation_without_linear",
              severity: "warning",
              message: `G42 activated on G0 rapid block — activate on G1 linear move`,
              details: { cycle: "G42" },
            });
          } else if (!hasLinear && !hasXY) {
            issues.push({
              line_number: lineNum,
              kind: "comp_activation_without_linear",
              severity: "warning",
              message: `G42 activated without a G1 XY linear move on same block`,
              details: { cycle: "G42" },
            });
          }
        }
        if (activeMode === "G42") {
          issues.push({
            line_number: lineNum,
            kind: "comp_redundant",
            severity: "info",
            message: `G42 while right comp already active`,
            details: { cycle: "G42" },
          });
        }
        if (activeMode === "G41") {
          issues.push({
            line_number: lineNum,
            kind: "comp_change_without_g40",
            severity: "warning",
            message: `G42 (right) directly from G41 (left) — insert G40 between`,
            details: { cycle: "G42", previous_mode: "G41" },
          });
        }
        activeMode = "G42";
      }

      if (hasG40) {
        g40Count++;
        // Cancel while below safe Z — cancel block moves on-path, so bad
        if ((activeMode === "G41" || activeMode === "G42") && currentZ < opts.safe_z_mm) {
          issues.push({
            line_number: lineNum,
            kind: "comp_cancel_without_retract",
            severity: "warning",
            message: `G40 at Z=${currentZ.toFixed(3)} (below safe_z=${opts.safe_z_mm}) — retract first`,
            details: { cycle: "G40", z_value: currentZ },
          });
        }
        activeMode = "G40";
      }

      // Program end
      if (/\bM0*(2|30)\b/.test(code)) {
        programEndLine = lineNum;
      }
    }

    // Final G40 check
    if (opts.warn_missing_final_g40 && programEndLine !== null && activeMode !== "G40" && activeMode !== null) {
      issues.push({
        line_number: programEndLine,
        kind: "comp_left_at_program_end",
        severity: "warning",
        message: `Program ends with ${activeMode} active — add G40 before M30/M2`,
        details: { cycle: activeMode },
      });
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
        g40_count: g40Count,
        g41_count: g41Count,
        g42_count: g42Count,
        d_offsets_used: Array.from(dOffsetsUsed).sort((a, b) => a - b),
        final_mode: activeMode,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: CutterCompOptions,
  ): { valid: boolean; errors: number; warnings: number; final_mode: "G40" | "G41" | "G42" | null } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      final_mode: r.summary.final_mode,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<CutterCompOptions> {
    return {
      safe_z_mm: 5,
      require_linear_activation: true,
      warn_missing_final_g40: true,
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

export const ppCutterCompValidatorEngine = new PPCutterCompValidatorEngine();
