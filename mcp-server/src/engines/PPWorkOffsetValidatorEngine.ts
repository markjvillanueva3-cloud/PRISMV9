/**
 * PPWorkOffsetValidatorEngine — Validate work offset usage in G-code
 *
 * Work coordinate systems (G54, G55, G56, G57, G58, G59, plus extended
 * G54.1 P1..P48 on Fanuc) define the part zero for a job. Mis-ordered,
 * missing, or mid-operation offset switches are a major source of
 * bad setups and crashes.
 *
 * Checks:
 *   - missing_initial_offset (error): program has motion but no G54-G59
 *     explicitly set before the first motion line.
 *   - mid_operation_switch (error): a G54-G59 change occurs while the
 *     spindle is running (M3/M4) AND tool is at cutting Z. This is
 *     almost always a bug on mills (except pallet changers with M-code
 *     controlled offset swaps).
 *   - switch_without_retract (warning): a G54-G59 change after the
 *     first motion block without a preceding safe-Z retract.
 *   - extended_offset_parse (info): G54.1 P<n> extended offsets — flag
 *     the P-value (must be 1..48, or 1..300 on some controllers).
 *   - conflicting_offsets_same_line (error): two different work offsets
 *     specified on the same line (e.g., "G54 G55").
 *
 * Scope — distinct from:
 *   - PPModalStateTrackerEngine: tracks the active offset but doesn't
 *     validate usage patterns.
 *   - PPToolChangeValidatorEngine: different safety dimension.
 *
 * @module PPWorkOffsetValidatorEngine
 */
import { ppModalStateTrackerEngine } from "./PPModalStateTrackerEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type WOSeverity = "error" | "warning" | "info";

export interface WorkOffsetIssue {
  line_number: number;
  kind:
    | "missing_initial_offset"
    | "mid_operation_switch"
    | "switch_without_retract"
    | "extended_offset_parse"
    | "conflicting_offsets_same_line";
  severity: WOSeverity;
  message: string;
  details?: {
    active_offset?: string;
    previous_offset?: string;
    spindle_state?: string;
    p_value?: number;
  };
}

export interface WorkOffsetValidatorResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: WorkOffsetIssue[];
  summary: {
    valid: boolean;
    offsets_used: string[];         // distinct offsets referenced (G54, G55, etc.)
    total_switches: number;         // total offset switches
    first_offset_line: number | null;
    first_motion_line: number | null;
  };
}

export interface WorkOffsetValidatorOptions {
  safe_z_mm?: number;                          // z >= safe_z is considered retracted (default 10)
  require_initial_offset?: boolean;             // default true
  allow_mid_op_switch_with_m_code?: boolean;    // default false (strict)
  extended_offset_max_p?: number;               // default 48 (Fanuc standard)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPWorkOffsetValidatorEngine {
  /**
   * Validate work offset usage in a G-code program.
   */
  validate(
    gcode: string,
    options?: WorkOffsetValidatorOptions,
  ): WorkOffsetValidatorResult {
    const opts = {
      safe_z_mm: options?.safe_z_mm ?? 10,
      require_initial_offset: options?.require_initial_offset ?? true,
      allow_mid_op_switch_with_m_code: options?.allow_mid_op_switch_with_m_code ?? false,
      extended_offset_max_p: options?.extended_offset_max_p ?? 48,
    };

    const modal = ppModalStateTrackerEngine.track(gcode);
    const lines = gcode.split(/\r?\n/);
    const issues: WorkOffsetIssue[] = [];
    const offsetsUsed = new Set<string>();

    let firstOffsetLine: number | null = null;
    let firstMotionLine: number | null = null;
    let totalSwitches = 0;
    let lastOffsetSeen: string | null = null;
    let currentZ = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const state = modal.timeline.find(t => t.line_number === lineNum)?.state;
      const distance = state?.distance ?? "G90";

      // Update Z position
      const zWord = this.readWord(code, "Z");
      if (zWord !== undefined) {
        currentZ = distance === "G91" ? currentZ + zWord : zWord;
      }

      // Detect motion line
      const hasMotion = /\bG0*[0123]\b/.test(code) && /[XYZ]-?\d/.test(code);
      if (hasMotion && firstMotionLine === null) {
        firstMotionLine = lineNum;
      }

      // Conflicting offsets on same line
      const offsetMatches = [...code.matchAll(/\bG0*(5[4-9])(?:\.(\d+))?\b/g)];
      const distinctOffsets = new Set<string>();
      for (const m of offsetMatches) {
        const base = "G" + m[1];
        const ext = m[2];
        distinctOffsets.add(ext ? `${base}.${ext}` : base);
      }

      if (distinctOffsets.size > 1) {
        issues.push({
          line_number: lineNum,
          kind: "conflicting_offsets_same_line",
          severity: "error",
          message: `Multiple distinct work offsets on same line: ${[...distinctOffsets].join(", ")}`,
        });
      }

      // Extended offset P-value check
      if (/\bG0*54\.1\b/.test(code)) {
        const pMatch = code.match(/\bP(\d+)\b/);
        if (pMatch) {
          const pValue = parseInt(pMatch[1], 10);
          if (pValue < 1 || pValue > opts.extended_offset_max_p) {
            issues.push({
              line_number: lineNum,
              kind: "extended_offset_parse",
              severity: "error",
              message: `G54.1 P${pValue} out of range — expected 1..${opts.extended_offset_max_p}`,
              details: { p_value: pValue },
            });
          } else {
            issues.push({
              line_number: lineNum,
              kind: "extended_offset_parse",
              severity: "info",
              message: `G54.1 P${pValue} — extended offset (Fanuc-specific)`,
              details: { p_value: pValue },
            });
          }
        } else {
          issues.push({
            line_number: lineNum,
            kind: "extended_offset_parse",
            severity: "error",
            message: `G54.1 without P-value — P selector required for extended offset`,
          });
        }
      }

      // Detect offset set on this line
      const primaryOffset = distinctOffsets.size === 1
        ? [...distinctOffsets][0]
        : null;

      if (primaryOffset) {
        offsetsUsed.add(primaryOffset);

        if (firstOffsetLine === null) {
          firstOffsetLine = lineNum;
          lastOffsetSeen = primaryOffset;
        } else if (primaryOffset !== lastOffsetSeen) {
          totalSwitches++;

          // Check: mid-operation switch?
          // We define mid-op as: spindle running AND after first motion
          // AND current Z < safe_z_mm
          const priorState = modal.timeline.find(t => t.line_number === lineNum - 1)?.state;
          const spindleRunning = priorState?.spindle === "M3" || priorState?.spindle === "M4";
          const afterFirstMotion = firstMotionLine !== null && lineNum > firstMotionLine;

          if (afterFirstMotion && spindleRunning) {
            const hasM5OnLine = /\bM0*5\b/.test(code);
            if (!hasM5OnLine && !opts.allow_mid_op_switch_with_m_code) {
              issues.push({
                line_number: lineNum,
                kind: "mid_operation_switch",
                severity: "error",
                message: `Work offset switched from ${lastOffsetSeen} to ${primaryOffset} with spindle running`,
                details: {
                  active_offset: primaryOffset,
                  previous_offset: lastOffsetSeen ?? undefined,
                  spindle_state: priorState?.spindle ?? undefined,
                },
              });
            }
          } else if (afterFirstMotion && currentZ < opts.safe_z_mm) {
            issues.push({
              line_number: lineNum,
              kind: "switch_without_retract",
              severity: "warning",
              message: `Work offset switched to ${primaryOffset} without safe-Z retract (Z=${currentZ.toFixed(3)}mm < ${opts.safe_z_mm}mm)`,
              details: {
                active_offset: primaryOffset,
                previous_offset: lastOffsetSeen ?? undefined,
              },
            });
          }

          lastOffsetSeen = primaryOffset;
        }
      }
    }

    // Missing initial offset
    if (
      opts.require_initial_offset &&
      firstMotionLine !== null &&
      (firstOffsetLine === null || firstOffsetLine > firstMotionLine)
    ) {
      issues.push({
        line_number: firstMotionLine,
        kind: "missing_initial_offset",
        severity: "error",
        message: "Motion begins without explicit G54-G59 work offset set",
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
        offsets_used: Array.from(offsetsUsed).sort(),
        total_switches: totalSwitches,
        first_offset_line: firstOffsetLine,
        first_motion_line: firstMotionLine,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: WorkOffsetValidatorOptions,
  ): { valid: boolean; errors: number; warnings: number; offsets: string[] } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      offsets: r.summary.offsets_used,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<WorkOffsetValidatorOptions> {
    return {
      safe_z_mm: 10,
      require_initial_offset: true,
      allow_mid_op_switch_with_m_code: false,
      extended_offset_max_p: 48,
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

export const ppWorkOffsetValidatorEngine = new PPWorkOffsetValidatorEngine();
