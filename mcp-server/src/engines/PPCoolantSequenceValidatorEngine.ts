/**
 * PPCoolantSequenceValidatorEngine — Validate coolant (M7/M8/M9) sequencing
 *
 * Coolant sequencing errors cause thermal shock, tool burn-up, chip welding,
 * and premature tool life. Controllers don't reject the programs, but the
 * results on the floor range from poor surface finish to cracked carbide.
 *
 * Checks:
 *   - cutting_without_coolant (warning): G1/G2/G3 motion with coolant OFF
 *     (M9 active) on required-coolant materials (titanium, stainless, etc.).
 *     Set `required_coolant` to true to enforce.
 *   - coolant_on_without_spindle (error): M7 or M8 issued while spindle is
 *     OFF (M5 active or never started). Wastes coolant, floods workpiece.
 *   - stale_coolant_across_toolchange (warning): coolant stays ON through
 *     M6 tool change. Most controllers auto-M9 at M6, but not all — and
 *     flooding during a change is a mess + safety hazard.
 *   - redundant_coolant_on (info): M7/M8 issued while already ON.
 *   - redundant_coolant_off (info): M9 issued while already OFF.
 *   - missing_final_m9 (warning): program ends (M30/M2) without final M9.
 *
 * Coolant mode glossary:
 *   - M7 = mist coolant ON
 *   - M8 = flood coolant ON (most common)
 *   - M9 = coolant OFF
 *   - M50 = chip conveyor (some controllers, not handled here)
 *
 * Scope — distinct from:
 *   - CoolantControlConfigEngine: selects coolant type for a material.
 *   - PPToolChangeValidatorEngine: validates M6 sequence (does check for
 *     coolant=ON at M6 but doesn't track full coolant timeline).
 *
 * @module PPCoolantSequenceValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type CoolantMode = "M7" | "M8" | "M9" | null;

export type CoolantSeverity = "error" | "warning" | "info";

export interface CoolantIssue {
  line_number: number;
  kind:
    | "cutting_without_coolant"
    | "coolant_on_without_spindle"
    | "stale_coolant_across_toolchange"
    | "redundant_coolant_on"
    | "redundant_coolant_off"
    | "missing_final_m9";
  severity: CoolantSeverity;
  message: string;
  details?: {
    active_coolant?: CoolantMode;
    spindle_state?: string;
  };
}

export interface CoolantSequenceResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: CoolantIssue[];
  summary: {
    valid: boolean;
    m7_count: number;
    m8_count: number;
    m9_count: number;
    final_coolant: CoolantMode;
    cutting_lines_with_coolant: number;
    cutting_lines_without_coolant: number;
  };
}

export interface CoolantSequenceOptions {
  required_coolant?: boolean;          // default false — set true for titanium/stainless
  warn_stale_across_m6?: boolean;      // default true
  warn_redundant?: boolean;            // default true
  require_final_m9?: boolean;          // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPCoolantSequenceValidatorEngine {
  /**
   * Validate coolant sequencing in a G-code program.
   */
  validate(
    gcode: string,
    options?: CoolantSequenceOptions,
  ): CoolantSequenceResult {
    const opts = {
      required_coolant: options?.required_coolant ?? false,
      warn_stale_across_m6: options?.warn_stale_across_m6 ?? true,
      warn_redundant: options?.warn_redundant ?? true,
      require_final_m9: options?.require_final_m9 ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: CoolantIssue[] = [];

    let activeCoolant: CoolantMode = null;
    let spindleRunning = false;
    let m7Count = 0;
    let m8Count = 0;
    let m9Count = 0;
    let cuttingWithCoolant = 0;
    let cuttingWithoutCoolant = 0;
    let programEndLine: number | null = null;
    let lastCuttingLine: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Update spindle state
      if (/\bM0*3\b/.test(code) || /\bM0*4\b/.test(code)) spindleRunning = true;
      if (/\bM0*5\b/.test(code)) spindleRunning = false;

      // Detect coolant commands
      const hasM7 = /\bM0*7\b/.test(code);
      const hasM8 = /\bM0*8\b/.test(code);
      const hasM9 = /\bM0*9\b/.test(code);
      const hasM6 = /\bM0*6\b/.test(code);
      const hasEnd = /\bM0*(2|30)\b/.test(code);

      // Note: M6 might appear on same line as M9 — handle M9 first
      if (hasM9) {
        m9Count++;
        if (opts.warn_redundant && activeCoolant === "M9" || activeCoolant === null) {
          // Only flag redundant if *previously* M9 — null means no prior state
          if (activeCoolant === "M9" && opts.warn_redundant) {
            issues.push({
              line_number: lineNum,
              kind: "redundant_coolant_off",
              severity: "info",
              message: `M9 issued while coolant already OFF`,
            });
          }
        }
        activeCoolant = "M9";
      }

      if (hasM7) {
        m7Count++;
        if (activeCoolant === "M7" && opts.warn_redundant) {
          issues.push({
            line_number: lineNum,
            kind: "redundant_coolant_on",
            severity: "info",
            message: `M7 issued while mist coolant already ON`,
          });
        }
        if (!spindleRunning && !/\bM0*3\b/.test(code) && !/\bM0*4\b/.test(code)) {
          issues.push({
            line_number: lineNum,
            kind: "coolant_on_without_spindle",
            severity: "error",
            message: `M7 (mist coolant ON) with spindle OFF — wastes coolant`,
            details: { active_coolant: "M7", spindle_state: "M5" },
          });
        }
        activeCoolant = "M7";
      }

      if (hasM8) {
        m8Count++;
        if (activeCoolant === "M8" && opts.warn_redundant) {
          issues.push({
            line_number: lineNum,
            kind: "redundant_coolant_on",
            severity: "info",
            message: `M8 issued while flood coolant already ON`,
          });
        }
        if (!spindleRunning && !/\bM0*3\b/.test(code) && !/\bM0*4\b/.test(code)) {
          issues.push({
            line_number: lineNum,
            kind: "coolant_on_without_spindle",
            severity: "error",
            message: `M8 (flood coolant ON) with spindle OFF — wastes coolant, floods workpiece`,
            details: { active_coolant: "M8", spindle_state: "M5" },
          });
        }
        activeCoolant = "M8";
      }

      // Stale coolant across tool change
      if (hasM6 && opts.warn_stale_across_m6 && !hasM9 && (activeCoolant === "M7" || activeCoolant === "M8")) {
        issues.push({
          line_number: lineNum,
          kind: "stale_coolant_across_toolchange",
          severity: "warning",
          message: `Tool change (M6) with coolant still ${activeCoolant} — add M9 before M6`,
          details: { active_coolant: activeCoolant },
        });
      }

      // Cutting motion check (G1/G2/G3 with coords)
      const isCutting = /\bG0*[123]\b/.test(code) && /[XYZ]-?\d/.test(code);
      if (isCutting) {
        lastCuttingLine = lineNum;
        if (activeCoolant === "M7" || activeCoolant === "M8") {
          cuttingWithCoolant++;
        } else {
          cuttingWithoutCoolant++;
          if (opts.required_coolant) {
            issues.push({
              line_number: lineNum,
              kind: "cutting_without_coolant",
              severity: "warning",
              message: `Cutting motion (G1/G2/G3) with coolant ${activeCoolant ?? "never turned ON"} — required-coolant material`,
              details: { active_coolant: activeCoolant },
            });
          }
        }
      }

      if (hasEnd) {
        programEndLine = lineNum;
      }
    }

    // Missing final M9
    if (opts.require_final_m9 && programEndLine !== null && activeCoolant !== "M9") {
      issues.push({
        line_number: programEndLine,
        kind: "missing_final_m9",
        severity: "warning",
        message: `Program ends with coolant state ${activeCoolant ?? "never set"} — add M9 before M30/M2`,
        details: { active_coolant: activeCoolant },
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
        m7_count: m7Count,
        m8_count: m8Count,
        m9_count: m9Count,
        final_coolant: activeCoolant,
        cutting_lines_with_coolant: cuttingWithCoolant,
        cutting_lines_without_coolant: cuttingWithoutCoolant,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: CoolantSequenceOptions,
  ): { valid: boolean; errors: number; warnings: number; final_coolant: CoolantMode } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      final_coolant: r.summary.final_coolant,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<CoolantSequenceOptions> {
    return {
      required_coolant: false,
      warn_stale_across_m6: true,
      warn_redundant: true,
      require_final_m9: true,
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

export const ppCoolantSequenceValidatorEngine = new PPCoolantSequenceValidatorEngine();
