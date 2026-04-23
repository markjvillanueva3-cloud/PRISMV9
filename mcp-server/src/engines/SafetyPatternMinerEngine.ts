/**
 * SafetyPatternMinerEngine — Mine safety patterns from production CNC programs
 *
 * Extracts safety-critical programming patterns from real programs to establish
 * MANDATORY safety rules for PRISM-generated output:
 *
 *   - G50 speed clamps (values by machine/operation)
 *   - Safe retract positions (X/Z coordinates between tools)
 *   - M1 optional stop placement patterns
 *   - M0 mandatory stop placement patterns
 *   - Coolant on/off sequencing and balance
 *   - Spindle stop before tool change
 *   - G28 home positions
 *   - Program end sequences
 *
 * These patterns become MANDATORY safety rules in PRISM's output.
 *
 * @module SafetyPatternMinerEngine
 */

import { log } from "../utils/Logger.js";
import type { OkumaProgram, OkumaSafetyInfo, OkumaToolSection } from "./OkumaOSPParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SpeedClampPattern {
  /** G50 S value */
  max_rpm: number;
  /** Operation types where this value was used */
  operations: string[];
  /** How many programs use this value */
  frequency: number;
  /** Machine types where this value was seen */
  machine_hints: string[];
}

export interface RetractPattern {
  /** X retract coordinate */
  x: number;
  /** Z retract coordinate */
  z: number;
  /** How many programs use this exact position */
  frequency: number;
  /** Whether this appears between all tool changes */
  consistent: boolean;
}

export interface StopPattern {
  /** M0 or M1 */
  type: "mandatory" | "optional";
  /** Where stops are placed */
  placement: StopPlacement[];
  /** Average stops per program */
  avg_per_program: number;
  /** Most common placement */
  most_common_placement: string;
}

export interface StopPlacement {
  /** Where the stop occurs relative to tool sections */
  location: "after_tool_change" | "before_thread" | "before_cutoff" | "after_finish" | "program_start" | "other";
  /** How many times this placement was seen */
  frequency: number;
}

export interface CoolantPattern {
  /** Coolant on codes used */
  on_codes: Array<{ code: string; frequency: number }>;
  /** Whether coolant is always balanced (on/off pairs) */
  always_balanced: boolean;
  /** Percentage of programs with balanced coolant */
  balance_pct: number;
  /** Whether coolant is off before tool change */
  off_before_tool_change_pct: number;
}

export interface ProgramEndPattern {
  /** Sequence of codes at program end */
  sequence: string[];
  /** How many programs use this exact sequence */
  frequency: number;
}

export interface SafetyRule {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  typical_values: string;
  enforcement: "mandatory" | "recommended";
  source_program_count: number;
}

export interface SafetyMineResult {
  speed_clamps: SpeedClampPattern[];
  retract_positions: RetractPattern[];
  stop_patterns: StopPattern[];
  coolant_patterns: CoolantPattern;
  program_end_patterns: ProgramEndPattern[];
  safety_rules: SafetyRule[];
  stats: {
    total_programs: number;
    programs_with_g50: number;
    programs_with_m1: number;
    programs_with_balanced_coolant: number;
    programs_with_safe_retracts: number;
    avg_g50_value: number;
    most_common_retract_x: number;
    most_common_retract_z: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class SafetyPatternMinerEngine {
  /**
   * Mine safety patterns from parsed Okuma programs.
   */
  mine(programs: OkumaProgram[]): SafetyMineResult {
    if (programs.length === 0) {
      return this._emptyResult();
    }

    const speedClamps = this._mineSpeedClamps(programs);
    const retractPositions = this._mineRetracts(programs);
    const stopPatterns = this._mineStops(programs);
    const coolantPatterns = this._mineCoolant(programs);
    const endPatterns = this._mineEndSequences(programs);
    const safetyRules = this._generateRules(speedClamps, retractPositions, stopPatterns, coolantPatterns, programs);

    // Stats
    const g50Programs = programs.filter(p => p.safety.g50MaxRPM.length > 0).length;
    const m1Programs = programs.filter(p => p.safety.optionalStops > 0).length;
    const balancedPrograms = programs.filter(p =>
      p.safety.coolantOnCount === 0 || p.safety.coolantOffCount > 0,
    ).length;
    const safeRetractPrograms = programs.filter(p =>
      p.safety.retractPositions.length >= p.toolSections.length - 1,
    ).length;

    const allG50 = programs.flatMap(p => p.safety.g50MaxRPM);
    const avgG50 = allG50.length > 0
      ? Math.round(allG50.reduce((a, b) => a + b, 0) / allG50.length)
      : 0;

    const allRetracts = programs.flatMap(p => p.safety.retractPositions);
    const xFreq = new Map<number, number>();
    const zFreq = new Map<number, number>();
    for (const r of allRetracts) {
      xFreq.set(r.x, (xFreq.get(r.x) ?? 0) + 1);
      zFreq.set(r.z, (zFreq.get(r.z) ?? 0) + 1);
    }
    const mostCommonX = [...xFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;
    const mostCommonZ = [...zFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;

    return {
      speed_clamps: speedClamps,
      retract_positions: retractPositions,
      stop_patterns: stopPatterns,
      coolant_patterns: coolantPatterns,
      program_end_patterns: endPatterns,
      safety_rules: safetyRules,
      stats: {
        total_programs: programs.length,
        programs_with_g50: g50Programs,
        programs_with_m1: m1Programs,
        programs_with_balanced_coolant: balancedPrograms,
        programs_with_safe_retracts: safeRetractPrograms,
        avg_g50_value: avgG50,
        most_common_retract_x: mostCommonX,
        most_common_retract_z: mostCommonZ,
      },
    };
  }

  /**
   * Check a single program's safety against mined patterns.
   */
  checkProgram(
    program: OkumaProgram,
    rules: SafetyRule[],
  ): Array<{ rule_id: string; passed: boolean; detail: string }> {
    const results: Array<{ rule_id: string; passed: boolean; detail: string }> = [];

    for (const rule of rules) {
      switch (rule.id) {
        case "SAFE_G50_CLAMP": {
          const hasCSS = program.toolSections.some(s => s.speedMode === "css");
          const hasG50 = program.safety.g50MaxRPM.length > 0;
          results.push({
            rule_id: rule.id,
            passed: !hasCSS || hasG50,
            detail: hasCSS && !hasG50
              ? "CSS mode without G50 speed clamp"
              : `G50 values: ${program.safety.g50MaxRPM.join(", ") || "N/A"}`,
          });
          break;
        }
        case "SAFE_RETRACT": {
          const needed = Math.max(0, program.toolSections.length - 1);
          const actual = program.safety.retractPositions.length;
          results.push({
            rule_id: rule.id,
            passed: actual >= needed,
            detail: `${actual}/${needed} safe retracts between tool sections`,
          });
          break;
        }
        case "SAFE_SPINDLE_STOP": {
          results.push({
            rule_id: rule.id,
            passed: program.safety.hasSpindleStop,
            detail: program.safety.hasSpindleStop
              ? "M5 found before program end"
              : "No M5 spindle stop before end",
          });
          break;
        }
        case "SAFE_COOLANT_BALANCE": {
          const balanced = program.safety.coolantOnCount === 0 ||
            program.safety.coolantOffCount > 0;
          results.push({
            rule_id: rule.id,
            passed: balanced,
            detail: `Coolant on: ${program.safety.coolantOnCount}, off: ${program.safety.coolantOffCount}`,
          });
          break;
        }
        case "SAFE_OPTIONAL_STOPS": {
          const hasM1 = program.safety.optionalStops > 0;
          results.push({
            rule_id: rule.id,
            passed: hasM1,
            detail: hasM1
              ? `${program.safety.optionalStops} optional stops (M1)`
              : "No optional stops — operators cannot inspect between tools",
          });
          break;
        }
        default:
          break;
      }
    }

    return results;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _mineSpeedClamps(programs: OkumaProgram[]): SpeedClampPattern[] {
    const clampMap = new Map<number, { ops: Set<string>; machines: Set<string>; count: number }>();

    for (const prog of programs) {
      for (const rpm of prog.safety.g50MaxRPM) {
        if (!clampMap.has(rpm)) {
          clampMap.set(rpm, { ops: new Set(), machines: new Set(), count: 0 });
        }
        const entry = clampMap.get(rpm)!;
        entry.count++;
        // Infer operations from tool sections that use CSS
        for (const section of prog.toolSections) {
          if (section.speedMode === "css") {
            for (const op of section.operations) {
              entry.ops.add(op.type);
            }
          }
        }
      }
    }

    return [...clampMap.entries()]
      .map(([rpm, data]) => ({
        max_rpm: rpm,
        operations: [...data.ops],
        frequency: data.count,
        machine_hints: [...data.machines],
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private _mineRetracts(programs: OkumaProgram[]): RetractPattern[] {
    const retractMap = new Map<string, { x: number; z: number; frequency: number; consistent: boolean }>();

    for (const prog of programs) {
      const needed = Math.max(0, prog.toolSections.length - 1);
      const actual = prog.safety.retractPositions.length;
      const isConsistent = actual >= needed;

      for (const pos of prog.safety.retractPositions) {
        const key = `${pos.x},${pos.z}`;
        if (!retractMap.has(key)) {
          retractMap.set(key, { x: pos.x, z: pos.z, frequency: 0, consistent: true });
        }
        const entry = retractMap.get(key)!;
        entry.frequency++;
        if (!isConsistent) entry.consistent = false;
      }
    }

    return [...retractMap.values()]
      .sort((a, b) => b.frequency - a.frequency);
  }

  private _mineStops(programs: OkumaProgram[]): StopPattern[] {
    let totalM0 = 0;
    let totalM1 = 0;
    const m1Placements = new Map<string, number>();

    for (const prog of programs) {
      totalM0 += prog.safety.mandatoryStops;
      totalM1 += prog.safety.optionalStops;

      // Analyze M1 placement relative to tool sections
      let inToolSection = false;
      let lastToolLabel = "";

      for (const line of prog.rawLines) {
        const trimmed = line.trim().toUpperCase();
        if (trimmed.startsWith("NAT")) {
          inToolSection = true;
          lastToolLabel = trimmed.split(/\s/)[0];
        }
        if (trimmed === "M1" || trimmed === "M01") {
          const placement = inToolSection ? "after_tool_change" : "program_start";
          m1Placements.set(placement, (m1Placements.get(placement) ?? 0) + 1);
        }
      }
    }

    const patterns: StopPattern[] = [];

    if (totalM1 > 0) {
      const placements: StopPlacement[] = [...m1Placements.entries()]
        .map(([loc, freq]) => ({
          location: loc as any,
          frequency: freq,
        }))
        .sort((a, b) => b.frequency - a.frequency);

      patterns.push({
        type: "optional",
        placement: placements,
        avg_per_program: programs.length > 0
          ? Math.round(totalM1 / programs.length * 10) / 10
          : 0,
        most_common_placement: placements[0]?.location ?? "after_tool_change",
      });
    }

    if (totalM0 > 0) {
      patterns.push({
        type: "mandatory",
        placement: [{ location: "other", frequency: totalM0 }],
        avg_per_program: programs.length > 0
          ? Math.round(totalM0 / programs.length * 10) / 10
          : 0,
        most_common_placement: "before_cutoff",
      });
    }

    return patterns;
  }

  private _mineCoolant(programs: OkumaProgram[]): CoolantPattern {
    const codeCounts = new Map<string, number>();
    let balancedCount = 0;
    let offBeforeToolChangeCount = 0;

    for (const prog of programs) {
      // Count coolant on codes from raw lines
      for (const line of prog.rawLines) {
        const trimmed = line.trim().toUpperCase();
        if (trimmed.includes("M8")) codeCounts.set("M8", (codeCounts.get("M8") ?? 0) + 1);
        if (trimmed.includes("M50")) codeCounts.set("M50", (codeCounts.get("M50") ?? 0) + 1);
        if (trimmed.includes("M51")) codeCounts.set("M51", (codeCounts.get("M51") ?? 0) + 1);
        if (trimmed.includes("M13")) codeCounts.set("M13", (codeCounts.get("M13") ?? 0) + 1);
      }

      // Check balance
      if (prog.safety.coolantOnCount === 0 || prog.safety.coolantOffCount > 0) {
        balancedCount++;
      }

      // Check if coolant is off before tool changes (simplified heuristic)
      if (prog.safety.coolantOffCount >= prog.toolSections.length - 1) {
        offBeforeToolChangeCount++;
      }
    }

    const onCodes = [...codeCounts.entries()]
      .map(([code, freq]) => ({ code, frequency: freq }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      on_codes: onCodes,
      always_balanced: balancedCount === programs.length,
      balance_pct: programs.length > 0
        ? Math.round(balancedCount / programs.length * 100)
        : 100,
      off_before_tool_change_pct: programs.length > 0
        ? Math.round(offBeforeToolChangeCount / programs.length * 100)
        : 100,
    };
  }

  private _mineEndSequences(programs: OkumaProgram[]): ProgramEndPattern[] {
    const seqMap = new Map<string, number>();

    for (const prog of programs) {
      const lines = prog.rawLines;
      // Get last 5 non-empty, non-comment lines
      const endLines: string[] = [];
      for (let i = lines.length - 1; i >= 0 && endLines.length < 5; i--) {
        const trimmed = lines[i].trim().toUpperCase();
        if (trimmed && !trimmed.startsWith("(") && trimmed !== "%") {
          endLines.unshift(trimmed);
        }
      }

      const seq = endLines.join(" → ");
      seqMap.set(seq, (seqMap.get(seq) ?? 0) + 1);
    }

    return [...seqMap.entries()]
      .map(([seq, count]) => ({
        sequence: seq.split(" → "),
        frequency: count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  private _generateRules(
    clamps: SpeedClampPattern[],
    retracts: RetractPattern[],
    stops: StopPattern[],
    coolant: CoolantPattern,
    programs: OkumaProgram[],
  ): SafetyRule[] {
    const rules: SafetyRule[] = [];
    const n = programs.length;

    // G50 rule
    const g50Count = programs.filter(p => p.safety.g50MaxRPM.length > 0).length;
    const topG50 = clamps[0]?.max_rpm ?? 2500;
    rules.push({
      id: "SAFE_G50_CLAMP",
      severity: "critical",
      title: "G50 Speed Clamp Required for CSS Mode",
      description: "Every G96 (CSS) block must be preceded by G50 S[max] to prevent spindle over-speed at small diameters.",
      typical_values: `Most common: G50 S${topG50}. Range: ${clamps.map(c => c.max_rpm).join(", ") || "N/A"}`,
      enforcement: "mandatory",
      source_program_count: g50Count,
    });

    // Retract rule
    const topRetract = retracts[0];
    rules.push({
      id: "SAFE_RETRACT",
      severity: "critical",
      title: "Safe Retract Between Tool Sections",
      description: "Retract to safe X/Z position before every turret index to prevent collision.",
      typical_values: topRetract
        ? `Most common: G0 X${topRetract.x} Z${topRetract.z}`
        : "G0 X20 Z20 (shop standard)",
      enforcement: "mandatory",
      source_program_count: programs.filter(p => p.safety.retractPositions.length > 0).length,
    });

    // Spindle stop rule
    const spindleStopCount = programs.filter(p => p.safety.hasSpindleStop).length;
    rules.push({
      id: "SAFE_SPINDLE_STOP",
      severity: "critical",
      title: "M5 Spindle Stop Before Program End",
      description: "Spindle must be stopped before M30. Leaving spindle running is a safety hazard.",
      typical_values: "M5 before M30",
      enforcement: "mandatory",
      source_program_count: spindleStopCount,
    });

    // Coolant balance rule
    rules.push({
      id: "SAFE_COOLANT_BALANCE",
      severity: "warning",
      title: "Coolant On/Off Balance",
      description: "Every coolant on (M8/M50/M51) should have a matching M9 off.",
      typical_values: `${coolant.balance_pct}% of programs have balanced coolant`,
      enforcement: "recommended",
      source_program_count: programs.filter(p => p.safety.coolantOnCount === 0 || p.safety.coolantOffCount > 0).length,
    });

    // Optional stop rule
    const m1Count = programs.filter(p => p.safety.optionalStops > 0).length;
    rules.push({
      id: "SAFE_OPTIONAL_STOPS",
      severity: "warning",
      title: "M1 Optional Stops for Inspection",
      description: "Place M1 after each tool change to allow operator inspection during first-article runs.",
      typical_values: stops.find(s => s.type === "optional")
        ? `Average ${stops.find(s => s.type === "optional")!.avg_per_program} per program`
        : "Recommended: 1 per tool section",
      enforcement: "recommended",
      source_program_count: m1Count,
    });

    return rules;
  }

  private _emptyResult(): SafetyMineResult {
    return {
      speed_clamps: [],
      retract_positions: [],
      stop_patterns: [],
      coolant_patterns: {
        on_codes: [],
        always_balanced: true,
        balance_pct: 100,
        off_before_tool_change_pct: 100,
      },
      program_end_patterns: [],
      safety_rules: [],
      stats: {
        total_programs: 0,
        programs_with_g50: 0,
        programs_with_m1: 0,
        programs_with_balanced_coolant: 0,
        programs_with_safe_retracts: 0,
        avg_g50_value: 0,
        most_common_retract_x: 20,
        most_common_retract_z: 20,
      },
    };
  }
}

export const safetyPatternMinerEngine = new SafetyPatternMinerEngine();
