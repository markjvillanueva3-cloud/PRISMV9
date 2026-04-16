/**
 * PPToolChangeValidatorEngine — Validate mill tool-change sequences
 *
 * Tool changes are one of the top sources of machine crashes on vertical
 * and horizontal mills. A safe tool change requires, in order:
 *   1. Machine retracted to a safe Z position (above workpiece + fixture)
 *   2. Spindle stopped (M5)
 *   3. (Usually) Coolant off (M9)
 *   4. Cutter comp canceled (G40)
 *   5. The tool-change command itself (T… M6 or M6 T…)
 *
 * This engine walks a G-code program, identifies every tool-change block,
 * and reports missing/out-of-order safety steps per change.
 *
 * Scope — distinct from:
 *   - LatheQualityGateEngine has a lathe-specific tool-change check embedded
 *     in a broader quality gate. This engine is mill-focused, standalone,
 *     and emits per-change structured issues.
 *   - ToolChangeOptimizationEngine optimizes tool-change SEQUENCING (which
 *     tool next), not safety sequencing of a single change.
 *
 * Uses PPModalStateTrackerEngine internally for modal context (cutter comp,
 * spindle state, coolant state) at the tool-change line.
 *
 * @module PPToolChangeValidatorEngine
 */
import { ppModalStateTrackerEngine } from "./PPModalStateTrackerEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type TCSeverity = "error" | "warning" | "info";

export interface ToolChangeIssue {
  line_number: number;           // line of the M6 (or T/M6 block)
  tool_number: number | null;    // T-word on that line, if any
  kind:
    | "no_safe_z_retract"        // no G28 / Z retract before M6
    | "spindle_running"           // M3/M4 active at M6 without M5 before
    | "coolant_on"                // M7/M8 active at M6 without M9 before
    | "cutter_comp_active"        // G41/G42 active at M6 without G40 before
    | "active_canned_cycle"       // canned cycle (G81-89) active at M6
    | "ij_k_in_block"             // arc words on tool-change line (parser bug bait)
    | "below_safe_z";             // retract to explicit Z < safe_z_mm
  severity: TCSeverity;
  message: string;
  details?: {
    z_before_m6?: number;
    spindle_state?: string;
    coolant_state?: string;
    cutter_comp_state?: string;
  };
}

export interface ToolChangeValidatorResult {
  total_tool_changes: number;
  total_issues: number;
  errors: number;
  warnings: number;
  issues: ToolChangeIssue[];
  summary: {
    safe: boolean;                // zero errors
    tools_seen: number[];         // distinct tool numbers referenced
  };
}

export interface ToolChangeValidatorOptions {
  safe_z_mm?: number;                   // minimum Z height before M6 (default 25 mm)
  require_coolant_off?: boolean;        // default true (safer)
  require_spindle_off?: boolean;        // default true (MANDATORY on most mills)
  require_cutter_comp_off?: boolean;    // default true
  require_explicit_retract?: boolean;   // require G28/G30/Z retract before M6 (default true)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPToolChangeValidatorEngine {
  /**
   * Validate every tool-change block in a program.
   */
  validate(
    gcode: string,
    options?: ToolChangeValidatorOptions,
  ): ToolChangeValidatorResult {
    const opts = {
      safe_z_mm: options?.safe_z_mm ?? 25,
      require_coolant_off: options?.require_coolant_off ?? true,
      require_spindle_off: options?.require_spindle_off ?? true,
      require_cutter_comp_off: options?.require_cutter_comp_off ?? true,
      require_explicit_retract: options?.require_explicit_retract ?? true,
    };

    const modal = ppModalStateTrackerEngine.track(gcode);
    const lines = gcode.split(/\r?\n/);
    const issues: ToolChangeIssue[] = [];
    const toolsSeen = new Set<number>();

    let toolChanges = 0;

    // Track current Z across lines (absolute)
    let currentZ = 0;
    let lastG28Line = -1;
    let lastZRetractLine = -1;  // most recent line that ascended Z
    let prevZ = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Track G28 / G30 (machine home)
      if (/\bG0*28\b/.test(code) || /\bG0*30\b/.test(code)) {
        lastG28Line = lineNum;
      }

      // Track Z position updates
      const stateEntry = modal.timeline.find(t => t.line_number === lineNum);
      const distance = stateEntry?.state.distance ?? "G90";
      const zWord = this.readWord(code, "Z");
      if (zWord !== undefined) {
        prevZ = currentZ;
        currentZ = distance === "G91" ? currentZ + zWord : zWord;
        if (currentZ > prevZ) {
          lastZRetractLine = lineNum;
        }
      }

      // Check for T-word
      const tMatch = code.match(/\bT(\d+)\b/);
      if (tMatch) {
        toolsSeen.add(parseInt(tMatch[1], 10));
      }

      // Check for M6 — the actual tool change
      const hasM6 = /\bM0*6\b/.test(code);
      if (!hasM6) continue;

      toolChanges++;
      const toolNumber = tMatch ? parseInt(tMatch[1], 10) : null;

      // Evaluate modal state AT this line (which includes whatever changed ON this line)
      // Use state from the PRIOR line so we see state at the moment of tool-change approach.
      const priorEntry = idx > 0
        ? modal.timeline.find(t => t.line_number === lineNum - 1)
        : undefined;
      const stateBefore = priorEntry?.state ?? modal.timeline[0].state;

      // Check 1: spindle running (critical)
      if (opts.require_spindle_off) {
        if (stateBefore.spindle === "M3" || stateBefore.spindle === "M4") {
          // Was the M5 issued ON this line BEFORE the M6?
          // Simple heuristic: if this line contains M5, it's OK; the M5 appears first.
          const hasM5OnLine = /\bM0*5\b/.test(code);
          if (!hasM5OnLine) {
            issues.push({
              line_number: lineNum,
              tool_number: toolNumber,
              kind: "spindle_running",
              severity: "error",
              message: "Spindle running (M3/M4) at tool change — insert M5 before M6",
              details: { spindle_state: stateBefore.spindle ?? "unknown" },
            });
          }
        }
      }

      // Check 2: coolant on
      if (opts.require_coolant_off) {
        if (stateBefore.coolant === "M7" || stateBefore.coolant === "M8") {
          const hasM9OnLine = /\bM0*9\b/.test(code);
          if (!hasM9OnLine) {
            issues.push({
              line_number: lineNum,
              tool_number: toolNumber,
              kind: "coolant_on",
              severity: "warning",
              message: "Coolant on (M7/M8) at tool change — recommend M9 before M6",
              details: { coolant_state: stateBefore.coolant ?? "unknown" },
            });
          }
        }
      }

      // Check 3: cutter comp active
      if (opts.require_cutter_comp_off) {
        if (
          stateBefore.cutter_comp === "G41" ||
          stateBefore.cutter_comp === "G42"
        ) {
          const hasG40OnLine = /\bG0*40\b/.test(code);
          if (!hasG40OnLine) {
            issues.push({
              line_number: lineNum,
              tool_number: toolNumber,
              kind: "cutter_comp_active",
              severity: "error",
              message: "Cutter compensation active (G41/G42) at tool change — insert G40 before M6",
              details: { cutter_comp_state: stateBefore.cutter_comp ?? "unknown" },
            });
          }
        }
      }

      // Check 4: active canned cycle
      if (stateBefore.canned_cycle && stateBefore.canned_cycle !== "G80") {
        const hasG80OnLine = /\bG0*80\b/.test(code);
        if (!hasG80OnLine) {
          issues.push({
            line_number: lineNum,
            tool_number: toolNumber,
            kind: "active_canned_cycle",
            severity: "error",
            message: `Canned cycle ${stateBefore.canned_cycle} active at tool change — insert G80 before M6`,
          });
        }
      }

      // Check 5: no safe retract before M6
      if (opts.require_explicit_retract) {
        // We need a G28/G30 OR a Z-up move between the previous M6 (or start)
        // and this M6. For simplicity, require either:
        //   - A G28/G30 at some point before this line (lastG28Line > 0), OR
        //   - An upward Z move (lastZRetractLine > 0) with final Z >= safe_z_mm
        const hadG28 = lastG28Line > 0 && lastG28Line <= lineNum;
        const hadZRetract = lastZRetractLine > 0 && currentZ >= opts.safe_z_mm;

        if (!hadG28 && !hadZRetract) {
          issues.push({
            line_number: lineNum,
            tool_number: toolNumber,
            kind: "no_safe_z_retract",
            severity: "error",
            message: `No safe Z retract before M6 — expected G28/G30 or Z >= ${opts.safe_z_mm}mm`,
            details: { z_before_m6: currentZ },
          });
        } else if (!hadG28 && hadZRetract && currentZ < opts.safe_z_mm) {
          issues.push({
            line_number: lineNum,
            tool_number: toolNumber,
            kind: "below_safe_z",
            severity: "warning",
            message: `Z=${currentZ.toFixed(3)}mm is below safe_z ${opts.safe_z_mm}mm at tool change`,
            details: { z_before_m6: currentZ },
          });
        }
      }

      // Check 6: arc I/J/K on tool-change line (parser confusion on some controllers)
      if (/\b[IJK]-?\d/.test(code) && !/\bG0*[23]\b/.test(code)) {
        issues.push({
          line_number: lineNum,
          tool_number: toolNumber,
          kind: "ij_k_in_block",
          severity: "info",
          message: "Arc offset words (I/J/K) on tool-change line — some controllers misinterpret",
        });
      }

      // Reset retract trackers for NEXT tool change cycle
      lastG28Line = -1;
      lastZRetractLine = -1;
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;

    return {
      total_tool_changes: toolChanges,
      total_issues: issues.length,
      errors,
      warnings,
      issues,
      summary: {
        safe: errors === 0,
        tools_seen: Array.from(toolsSeen).sort((a, b) => a - b),
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: ToolChangeValidatorOptions,
  ): { safe: boolean; errors: number; warnings: number; tool_changes: number } {
    const r = this.validate(gcode, options);
    return {
      safe: r.summary.safe,
      errors: r.errors,
      warnings: r.warnings,
      tool_changes: r.total_tool_changes,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<ToolChangeValidatorOptions> {
    return {
      safe_z_mm: 25,
      require_coolant_off: true,
      require_spindle_off: true,
      require_cutter_comp_off: true,
      require_explicit_retract: true,
    };
  }

  // ── Private ──────────────────────────────────────────────────────

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

export const ppToolChangeValidatorEngine = new PPToolChangeValidatorEngine();
