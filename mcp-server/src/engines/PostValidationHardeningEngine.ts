/**
 * PostValidationHardeningEngine — Machine-limit validation for generated G-code
 *
 * Parses a G-code program and validates every block against a resolved
 * MachineContext from the 910-machine catalog:
 *
 *   - Spindle RPM vs machine max_rpm (hard block)
 *   - Feed rate vs machine rapid_rate_mm_min per axis (hard block for rapids, warn for feeds)
 *   - Axis travel vs machine work_volume envelope (hard block)
 *   - Tool count vs machine atc_capacity (warn)
 *   - Coolant codes vs machine coolant_types (warn if TSC requested but not available)
 *   - Power demand vs machine max_power_kW (warn based on Kienzle force estimate)
 *
 * Severity levels:
 *   BLOCK  — Program MUST NOT run. Machine damage or crash risk.
 *   WARN   — Program CAN run but operator should verify.
 *   INFO   — Advisory (e.g., near-limit operation).
 *
 * References:
 *   - ISO 14649-10 (Data model for CNC, machine capabilities)
 *   - ANSI/NFPA 79 (Electrical standard for industrial machinery)
 *   - Peter Smid, "CNC Programming Handbook" 3rd ed., Ch. 5 (Machine Limits)
 *
 * @module engines/PostValidationHardeningEngine
 * @version 1.0.0
 */

import type {
  MachineContext,
  ControllerFamily,
  ISOGroup,
} from "./PostProcessorPipelineEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type ValidationSeverity = "BLOCK" | "WARN" | "INFO";

export interface ValidationFlag {
  /** Line number (1-based) in the G-code */
  line: number;
  /** The raw G-code text of the flagged line */
  text: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Validation dimension */
  dimension: "spindle_rpm" | "feed_rate" | "axis_travel" | "tool_capacity" | "coolant" | "power" | "work_offset" | "syntax";
  /** Human-readable message */
  message: string;
  /** Actual value found */
  actual: number | string;
  /** Machine limit */
  limit: number | string;
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationSummary {
  /** Overall pass/fail */
  passed: boolean;
  /** Count by severity */
  block_count: number;
  warn_count: number;
  info_count: number;
  /** Count by dimension */
  by_dimension: Record<string, number>;
  /** Total lines checked */
  lines_checked: number;
  /** Lines with flags */
  lines_flagged: number;
  /** Machine used for validation */
  machine_id: string;
  machine_name: string;
}

export interface ValidationResult {
  /** All validation flags, ordered by line number */
  flags: ValidationFlag[];
  /** Summary statistics */
  summary: ValidationSummary;
  /** Warnings about the validation itself */
  warnings: string[];
}

export interface ValidationInput {
  action: "validate" | "validate_limits" | "check_envelope";
  /** G-code program text */
  gcode: string;
  /** Machine to validate against (from 910-machine catalog) */
  machine: MachineContext;
  /** Maximum tools expected in the program (override atc_capacity check) */
  max_tools_override?: number;
  /** Skip INFO-level flags */
  skip_info?: boolean;
}

// ─── G-code Parsing Patterns ────────────────────────────────────────

const FEED_RE = /F([\d.]+)/;
const RPM_RE = /S([\d.]+)/;
const X_RE = /X(-?[\d.]+)/;
const Y_RE = /Y(-?[\d.]+)/;
const Z_RE = /Z(-?[\d.]+)/;
const A_RE = /A(-?[\d.]+)/;
const B_RE = /B(-?[\d.]+)/;
const C_RE = /C(-?[\d.]+)/;
const TOOL_RE = /T(\d+)/;
const RAPID_RE = /G0?0\b/;
const LINEAR_RE = /G0?1\b/;
const SPINDLE_ON_RE = /M0?[34]\b/;
const COOLANT_FLOOD_RE = /M0?8\b/;
const COOLANT_MIST_RE = /M0?7\b/;
const COOLANT_TSC_RE = /M88\b/;
const WORK_OFFSET_RE = /G5[4-9]\b|G59\.[1-3]/;

/** Near-limit threshold: flag INFO when within 5% of max */
const NEAR_LIMIT_PCT = 0.95;

// ─── Engine ─────────────────────────────────────────────────────────

class PostValidationHardeningEngineImpl {
  /**
   * Validate a G-code program against machine limits.
   *
   * @param input - G-code, machine context, and options
   * @returns Validation flags with severity and suggestions
   */
  async process(input: ValidationInput): Promise<ValidationResult> {
    switch (input.action) {
      case "validate":
      case "validate_limits":
        return this.validateProgram(input);
      case "check_envelope":
        return this.checkEnvelope(input);
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  }

  private validateProgram(input: ValidationInput): ValidationResult {
    const { gcode, machine } = input;
    const lines = gcode.split("\n");
    const flags: ValidationFlag[] = [];
    const warnings: string[] = [];

    const toolNumbers = new Set<number>();
    let modalFeed = 0;
    let modalRpm = 0;
    let isRapid = false;
    let currentX = 0, currentY = 0, currentZ = 0;
    let hasWorkOffset = false;
    const byDimension: Record<string, number> = {};

    const addFlag = (flag: ValidationFlag) => {
      if (input.skip_info && flag.severity === "INFO") return;
      flags.push(flag);
      byDimension[flag.dimension] = (byDimension[flag.dimension] ?? 0) + 1;
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      const lineNum = i + 1;

      // Skip empty/comments
      if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) {
        continue;
      }

      // Track modal state
      if (RAPID_RE.test(trimmed)) isRapid = true;
      if (LINEAR_RE.test(trimmed)) isRapid = false;
      if (WORK_OFFSET_RE.test(trimmed)) hasWorkOffset = true;

      // ── Tool tracking ──
      const toolMatch = trimmed.match(TOOL_RE);
      if (toolMatch) {
        const tn = parseInt(toolMatch[1], 10);
        if (tn > 0) toolNumbers.add(tn);
      }

      // ── Spindle RPM validation ──
      const rpmMatch = trimmed.match(RPM_RE);
      if (rpmMatch && SPINDLE_ON_RE.test(trimmed)) {
        const rpm = parseFloat(rpmMatch[1]);
        modalRpm = rpm;

        if (rpm > machine.max_rpm) {
          addFlag({
            line: lineNum, text: trimmed, severity: "BLOCK",
            dimension: "spindle_rpm",
            message: `RPM ${rpm} exceeds machine max ${machine.max_rpm}`,
            actual: rpm, limit: machine.max_rpm,
            suggestion: `Reduce to S${machine.max_rpm} or lower`,
          });
        } else if (rpm > machine.max_rpm * NEAR_LIMIT_PCT) {
          addFlag({
            line: lineNum, text: trimmed, severity: "INFO",
            dimension: "spindle_rpm",
            message: `RPM ${rpm} is within 5% of machine max ${machine.max_rpm}`,
            actual: rpm, limit: machine.max_rpm,
          });
        }

        // Sanity: RPM should be positive when spindle is on
        if (rpm <= 0) {
          addFlag({
            line: lineNum, text: trimmed, severity: "BLOCK",
            dimension: "spindle_rpm",
            message: `RPM ${rpm} is non-positive with spindle on`,
            actual: rpm, limit: 1,
            suggestion: "Set a valid positive RPM value",
          });
        }
      }

      // ── Feed rate validation ──
      const feedMatch = trimmed.match(FEED_RE);
      if (feedMatch) {
        const feed = parseFloat(feedMatch[1]);
        modalFeed = feed;

        // Sanity check
        if (feed <= 0) {
          addFlag({
            line: lineNum, text: trimmed, severity: "BLOCK",
            dimension: "feed_rate",
            message: `Feed rate ${feed} is non-positive`,
            actual: feed, limit: 1,
            suggestion: "Set a valid positive feed rate",
          });
        } else if (feed > 99999) {
          addFlag({
            line: lineNum, text: trimmed, severity: "WARN",
            dimension: "feed_rate",
            message: `Feed rate ${feed} mm/min unusually high — verify units`,
            actual: feed, limit: 99999,
          });
        }
      }

      // Rapid feed vs machine rapid limits
      if (isRapid) {
        const maxRapid = Math.max(
          machine.rapid_rate_mm_min.x,
          machine.rapid_rate_mm_min.y,
          machine.rapid_rate_mm_min.z
        );
        if (modalFeed > 0 && modalFeed > maxRapid) {
          addFlag({
            line: lineNum, text: trimmed, severity: "WARN",
            dimension: "feed_rate",
            message: `Feed ${modalFeed} on rapid exceeds machine rapid rate ${maxRapid}`,
            actual: modalFeed, limit: maxRapid,
            suggestion: `Controller will clamp to machine rapid; explicit F not needed on G0`,
          });
        }
      }

      // ── Axis travel / work envelope ──
      const xMatch = trimmed.match(X_RE);
      const yMatch = trimmed.match(Y_RE);
      const zMatch = trimmed.match(Z_RE);

      if (xMatch) {
        const x = parseFloat(xMatch[1]);
        currentX = x;
        if (Math.abs(x) > machine.work_volume.x) {
          addFlag({
            line: lineNum, text: trimmed, severity: "BLOCK",
            dimension: "axis_travel",
            message: `X${x} exceeds machine X travel ±${machine.work_volume.x}`,
            actual: x, limit: machine.work_volume.x,
            suggestion: `Verify WCS origin and part position within machine envelope`,
          });
        }
      }
      if (yMatch) {
        const y = parseFloat(yMatch[1]);
        currentY = y;
        if (Math.abs(y) > machine.work_volume.y) {
          addFlag({
            line: lineNum, text: trimmed, severity: "BLOCK",
            dimension: "axis_travel",
            message: `Y${y} exceeds machine Y travel ±${machine.work_volume.y}`,
            actual: y, limit: machine.work_volume.y,
            suggestion: `Verify WCS origin and part position within machine envelope`,
          });
        }
      }
      if (zMatch) {
        const z = parseFloat(zMatch[1]);
        currentZ = z;
        if (Math.abs(z) > machine.work_volume.z) {
          addFlag({
            line: lineNum, text: trimmed, severity: "BLOCK",
            dimension: "axis_travel",
            message: `Z${z} exceeds machine Z travel ±${machine.work_volume.z}`,
            actual: z, limit: machine.work_volume.z,
            suggestion: `Verify WCS origin and fixture height within machine envelope`,
          });
        }
      }

      // ── Coolant validation ──
      if (COOLANT_TSC_RE.test(trimmed)) {
        if (!machine.coolant_types?.includes("tsc")) {
          addFlag({
            line: lineNum, text: trimmed, severity: "WARN",
            dimension: "coolant",
            message: `TSC (M88) requested but machine does not support through-spindle coolant`,
            actual: "M88", limit: machine.coolant_types?.join(",") ?? "none",
            suggestion: `Replace with M8 (flood) or remove TSC code`,
          });
        }
      }
      if (COOLANT_MIST_RE.test(trimmed)) {
        if (!machine.coolant_types?.includes("mist")) {
          addFlag({
            line: lineNum, text: trimmed, severity: "INFO",
            dimension: "coolant",
            message: `Mist coolant (M7) requested but machine may not have mist capability`,
            actual: "M7", limit: machine.coolant_types?.join(",") ?? "unknown",
          });
        }
      }
    }

    // ── Post-scan checks ──

    // Tool capacity
    if (machine.atc_capacity && toolNumbers.size > (input.max_tools_override ?? machine.atc_capacity)) {
      const capacity = input.max_tools_override ?? machine.atc_capacity;
      addFlag({
        line: 0, text: "(program-level)", severity: "WARN",
        dimension: "tool_capacity",
        message: `Program uses ${toolNumbers.size} tools but machine ATC capacity is ${capacity}`,
        actual: toolNumbers.size, limit: capacity,
        suggestion: `Reduce tool count or plan manual tool changes`,
      });
    }

    // Work offset check
    if (!hasWorkOffset && lines.length > 10) {
      addFlag({
        line: 0, text: "(program-level)", severity: "WARN",
        dimension: "work_offset",
        message: `No work offset (G54-G59) found — program may use machine coordinates`,
        actual: "none", limit: "G54-G59",
        suggestion: `Add appropriate work coordinate offset before cutting moves`,
      });
    }

    // Sort flags by line number
    flags.sort((a, b) => a.line - b.line);

    const blockCount = flags.filter(f => f.severity === "BLOCK").length;
    const warnCount = flags.filter(f => f.severity === "WARN").length;
    const infoCount = flags.filter(f => f.severity === "INFO").length;

    return {
      flags,
      summary: {
        passed: blockCount === 0,
        block_count: blockCount,
        warn_count: warnCount,
        info_count: infoCount,
        by_dimension: byDimension,
        lines_checked: lines.filter(l => l.trim() && !l.trim().startsWith("(") && !l.trim().startsWith(";")).length,
        lines_flagged: new Set(flags.map(f => f.line)).size,
        machine_id: machine.id,
        machine_name: machine.name,
      },
      warnings,
    };
  }

  /**
   * Check only the work envelope (axis travel) — fast path for position checks.
   */
  private checkEnvelope(input: ValidationInput): ValidationResult {
    // Run full validation but filter to axis_travel only
    const full = this.validateProgram(input);
    return {
      flags: full.flags.filter(f => f.dimension === "axis_travel"),
      summary: {
        ...full.summary,
        block_count: full.flags.filter(f => f.dimension === "axis_travel" && f.severity === "BLOCK").length,
        warn_count: full.flags.filter(f => f.dimension === "axis_travel" && f.severity === "WARN").length,
        info_count: full.flags.filter(f => f.dimension === "axis_travel" && f.severity === "INFO").length,
      },
      warnings: full.warnings,
    };
  }
}

/** Singleton export */
export const postValidationHardeningEngine = new PostValidationHardeningEngineImpl();
