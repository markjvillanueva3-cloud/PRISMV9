/**
 * PPSpindleSpeedSafetyEngine — Validate spindle speed safety in G-code
 *
 * Spindle abuse is a leading cause of bearing wear, tool pullout, and
 * workpiece fling-off. This engine catches programming errors the
 * controller won't reject but the machine will hate:
 *
 * Checks:
 *   - zero_rpm_start (error): M3/M4 issued with S=0 or no prior S-word.
 *   - direction_flip_while_running (error): M3 → M4 (or M4 → M3) without
 *     an intervening M5 + dwell. Reverse-while-spinning can snap tooling.
 *   - excessive_rpm_jump (warning): S-word step change > max_rpm_step_ratio
 *     (default 5× — e.g., S500 → S6000 in one block). Controllers accept
 *     it but spindles either clip (belt drive) or draw crushing current.
 *   - missing_dwell_after_start (warning): M3/M4 with no G4 P<n> dwell
 *     before the first motion line — high-torque spindles need 0.5-2s to
 *     reach command.
 *   - s_without_spindle_on (info): S-word set but spindle never commanded
 *     (M3/M4) — probably harmless, often indicates a stale setup block.
 *
 * Scope — distinct from:
 *   - MachineEnvelopeGuardEngine: validates S vs max_rpm bound (magnitude,
 *     not transition dynamics). We handle *changes*, they handle *limits*.
 *   - PPToolChangeValidatorEngine: validates M6 safety. We handle the
 *     spindle-specific M3/M4/M5 dimension.
 *   - PPModalStateTrackerEngine: tracks the active spindle mode but
 *     doesn't judge whether transitions are safe.
 *
 * @module PPSpindleSpeedSafetyEngine
 */
import { ppModalStateTrackerEngine } from "./PPModalStateTrackerEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type SpindleSeverity = "error" | "warning" | "info";

export interface SpindleIssue {
  line_number: number;
  kind:
    | "zero_rpm_start"
    | "direction_flip_while_running"
    | "excessive_rpm_jump"
    | "missing_dwell_after_start"
    | "s_without_spindle_on";
  severity: SpindleSeverity;
  message: string;
  details?: {
    s_value?: number;
    previous_s?: number;
    ratio?: number;
    direction?: "M3" | "M4" | "M5";
    previous_direction?: "M3" | "M4" | "M5";
  };
}

export interface SpindleSafetyResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: SpindleIssue[];
  summary: {
    valid: boolean;
    peak_rpm: number | null;
    min_running_rpm: number | null;
    direction_changes: number;
    s_words_seen: number;
    m3_count: number;
    m4_count: number;
    m5_count: number;
  };
}

export interface SpindleSafetyOptions {
  max_rpm_step_ratio?: number;        // default 5 (S500 → S2500 OK, S500 → S2501 warns)
  require_dwell_after_start?: boolean; // default true
  min_dwell_seconds?: number;          // default 0.5
  allow_s_without_spindle?: boolean;   // default true (info only)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPSpindleSpeedSafetyEngine {
  /**
   * Validate spindle usage in a G-code program.
   */
  validate(
    gcode: string,
    options?: SpindleSafetyOptions,
  ): SpindleSafetyResult {
    const opts = {
      max_rpm_step_ratio: options?.max_rpm_step_ratio ?? 5,
      require_dwell_after_start: options?.require_dwell_after_start ?? true,
      min_dwell_seconds: options?.min_dwell_seconds ?? 0.5,
      allow_s_without_spindle: options?.allow_s_without_spindle ?? true,
    };

    const modal = ppModalStateTrackerEngine.track(gcode);
    const lines = gcode.split(/\r?\n/);
    const issues: SpindleIssue[] = [];

    let lastS: number | null = null;
    let lastDirection: "M3" | "M4" | "M5" | null = null;
    let peakRpm: number | null = null;
    let minRunningRpm: number | null = null;
    let directionChanges = 0;
    let sWordsSeen = 0;
    let m3Count = 0;
    let m4Count = 0;
    let m5Count = 0;
    let everCommanded = false;
    let pendingStartLine: number | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      const sWord = this.readWord(code, "S");
      if (sWord !== undefined) {
        sWordsSeen++;
        if (peakRpm === null || sWord > peakRpm) peakRpm = sWord;

        // Excessive RPM jump check
        if (lastS !== null && lastS > 0 && sWord > 0) {
          const ratio = Math.max(sWord, lastS) / Math.min(sWord, lastS);
          if (ratio > opts.max_rpm_step_ratio) {
            issues.push({
              line_number: lineNum,
              kind: "excessive_rpm_jump",
              severity: "warning",
              message: `S${sWord} after S${lastS} — ${ratio.toFixed(1)}× change exceeds max step ratio ${opts.max_rpm_step_ratio}×`,
              details: { s_value: sWord, previous_s: lastS, ratio },
            });
          }
        }
        lastS = sWord;
      }

      // Detect spindle direction commands
      const hasM3 = /\bM0*3\b/.test(code);
      const hasM4 = /\bM0*4\b/.test(code);
      const hasM5 = /\bM0*5\b/.test(code);

      if (hasM3) {
        m3Count++;
        everCommanded = true;
        if (lastS === null || lastS === 0) {
          issues.push({
            line_number: lineNum,
            kind: "zero_rpm_start",
            severity: "error",
            message: `M3 with ${lastS === null ? "no prior S-word" : "S0"} — spindle commanded without a valid speed`,
            details: { direction: "M3", s_value: lastS ?? 0 },
          });
        } else {
          if (minRunningRpm === null || lastS < minRunningRpm) minRunningRpm = lastS;
        }
        if (lastDirection === "M4") {
          directionChanges++;
          issues.push({
            line_number: lineNum,
            kind: "direction_flip_while_running",
            severity: "error",
            message: `M3 follows M4 without intervening M5 — reverse-while-spinning can snap tooling`,
            details: { direction: "M3", previous_direction: "M4" },
          });
        }
        lastDirection = "M3";
        pendingStartLine = lineNum;
      }

      if (hasM4) {
        m4Count++;
        everCommanded = true;
        if (lastS === null || lastS === 0) {
          issues.push({
            line_number: lineNum,
            kind: "zero_rpm_start",
            severity: "error",
            message: `M4 with ${lastS === null ? "no prior S-word" : "S0"} — spindle commanded without a valid speed`,
            details: { direction: "M4", s_value: lastS ?? 0 },
          });
        } else {
          if (minRunningRpm === null || lastS < minRunningRpm) minRunningRpm = lastS;
        }
        if (lastDirection === "M3") {
          directionChanges++;
          issues.push({
            line_number: lineNum,
            kind: "direction_flip_while_running",
            severity: "error",
            message: `M4 follows M3 without intervening M5 — reverse-while-spinning can snap tooling`,
            details: { direction: "M4", previous_direction: "M3" },
          });
        }
        lastDirection = "M4";
        pendingStartLine = lineNum;
      }

      if (hasM5) {
        m5Count++;
        lastDirection = "M5";
        pendingStartLine = null;
      }

      // Dwell check — G4 P<n> within a few lines after M3/M4
      if (pendingStartLine !== null && pendingStartLine !== lineNum) {
        const hasMotion = /\bG0*[0123]\b/.test(code) && /[XYZ]-?\d/.test(code);
        const hasDwell = /\bG0*4\b/.test(code);
        if (hasMotion && !hasDwell) {
          if (opts.require_dwell_after_start) {
            issues.push({
              line_number: lineNum,
              kind: "missing_dwell_after_start",
              severity: "warning",
              message: `Motion begins without G4 P${opts.min_dwell_seconds} dwell after spindle start at line ${pendingStartLine}`,
            });
          }
          pendingStartLine = null; // only flag once
        } else if (hasDwell) {
          pendingStartLine = null;
        }
      }
    }

    // s_without_spindle_on check
    if (sWordsSeen > 0 && !everCommanded && opts.allow_s_without_spindle) {
      issues.push({
        line_number: 1,
        kind: "s_without_spindle_on",
        severity: "info",
        message: `${sWordsSeen} S-word(s) present but no M3/M4 — spindle never commanded ON`,
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
        peak_rpm: peakRpm,
        min_running_rpm: minRunningRpm,
        direction_changes: directionChanges,
        s_words_seen: sWordsSeen,
        m3_count: m3Count,
        m4_count: m4Count,
        m5_count: m5Count,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: SpindleSafetyOptions,
  ): { valid: boolean; errors: number; warnings: number; peak_rpm: number | null } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      peak_rpm: r.summary.peak_rpm,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<SpindleSafetyOptions> {
    return {
      max_rpm_step_ratio: 5,
      require_dwell_after_start: true,
      min_dwell_seconds: 0.5,
      allow_s_without_spindle: true,
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

export const ppSpindleSpeedSafetyEngine = new PPSpindleSpeedSafetyEngine();
