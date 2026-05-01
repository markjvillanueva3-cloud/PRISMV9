/**
 * OkumaOSPParserEngine — Parse Real Okuma OSP-P300L/P300LA Programs
 *
 * Parses .MIN files from production Okuma lathes into structured AST.
 * Validated against 11+ real programs from Box/CNC LATHE (2022-2026).
 *
 * Handles Okuma-specific syntax:
 *   - NAT labels (NAT01, NAT02, etc.) for tool sections
 *   - 6-digit tool codes (T010101 = tool 1, offset 1, wear offset 1)
 *   - G85/G87/G81 roughing/finishing cycles with named labels (NTURN, NBORE)
 *   - G71 for THREADING (not roughing! — Okuma-specific)
 *   - G74 peck drilling with D/L parameters
 *   - G72 finish cycle (separate from G87)
 *   - G4 F dwell (seconds, not Fanuc G04 P milliseconds)
 *   - L for arc radius (not Fanuc R)
 *   - A for angular moves (A135, A225, A240)
 *   - V variables (V1-V100 locals, VC100+ common variables)
 *   - IF/GOTO branching and /CALL subroutines
 *   - DEF WORK graphics blocks
 *   - C-axis: M110/M109, G138/G136, M146/M147, G119, SB=
 *   - Bar feeder: /CALL OBAR, /GOTO NBAR, /CALL OCONT
 *   - G270/G180 = graphics lock/cancel
 *   - M41/M42 = spindle gear range
 *
 * @module OkumaOSPParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OkumaProgram {
  filename: string;
  header: string | null;
  toolSections: OkumaToolSection[];
  variables: OkumaVariable[];
  subroutineCalls: string[];
  hasBarFeeder: boolean;
  hasCAxis: boolean;
  hasLiveTooling: boolean;
  hasThreading: boolean;
  hasMacroVariables: boolean;
  lineCount: number;
  operations: OkumaOperation[];
  safety: OkumaSafetyInfo;
  rawLines: string[];
}

export interface OkumaToolSection {
  label: string;
  toolCode: string;
  toolNumber: number;
  offsetNumber: number;
  comment: string;
  startLine: number;
  endLine: number;
  operations: OkumaOperation[];
  speedMode: "css" | "rpm";
  cssValue?: number;
  rpmValue?: number;
  maxRPM?: number;
  coolant: boolean;
}

export interface OkumaOperation {
  type: OkumaOpType;
  line: number;
  gcode: string;
  params: Record<string, number | string>;
}

export type OkumaOpType =
  | "face" | "od_rough" | "od_finish" | "id_rough" | "id_finish"
  | "center_drill" | "drill" | "peck_drill" | "bore" | "bore_finish"
  | "groove" | "cutoff" | "thread"
  | "rapid" | "feed" | "arc_cw" | "arc_ccw"
  | "dwell" | "c_axis_position" | "live_tool"
  | "profile_label" | "cycle_cancel"
  | "subroutine_call" | "goto" | "conditional"
  | "variable_set" | "unknown";

export interface OkumaVariable {
  name: string;
  value: number | string;
  comment: string;
  line: number;
}

export interface OkumaSafetyInfo {
  g50MaxRPM: number[];
  retractPositions: Array<{ x: number; z: number }>;
  optionalStops: number;
  mandatoryStops: number;
  coolantOnCount: number;
  coolantOffCount: number;
  hasSpindleStop: boolean;
  gearRanges: string[];
}

export interface SpeedFeedExtraction {
  toolSection: string;
  toolNumber: number;
  operation: string;
  cssSpeed?: number;
  directRPM?: number;
  maxRPM?: number;
  feedRate?: number;
  feedMode: "per_rev" | "per_min";
}

// ============================================================================
// PARSER
// ============================================================================

class OkumaOSPParserEngineImpl {

  /**
   * Parse a complete Okuma .MIN program into structured AST
   */
  parse(source: string, filename?: string): OkumaProgram {
    const rawLines = source.split(/\r?\n/);
    const header = this.extractHeader(rawLines);
    const variables = this.extractVariables(rawLines);
    const toolSections = this.extractToolSections(rawLines);
    const subroutineCalls = this.extractSubroutineCalls(rawLines);
    const operations = toolSections.flatMap(ts => ts.operations);
    const safety = this.extractSafety(rawLines);

    return {
      filename: filename ?? "unknown.min",
      header,
      toolSections,
      variables,
      subroutineCalls,
      hasBarFeeder: rawLines.some(l => /\/CALL OBAR/i.test(l) || /\/GOTO NBAR/i.test(l)),
      hasCAxis: rawLines.some(l => /M110|G138|G119/i.test(l)),
      hasLiveTooling: rawLines.some(l => /G119|SB=/i.test(l)),
      hasThreading: rawLines.some(l => /G71.*B60|G71.*H\d/i.test(l)),
      hasMacroVariables: variables.length > 0,
      lineCount: rawLines.length,
      operations,
      safety,
      rawLines,
    };
  }

  /**
   * Extract header ($FILENAME%, O-number, or first comment)
   */
  private extractHeader(lines: string[]): string | null {
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("$") || trimmed.startsWith("O") || trimmed.startsWith("(PROGRAM")) {
        return trimmed;
      }
    }
    return null;
  }

  /**
   * Extract V/VC variable declarations
   */
  extractVariables(lines: string[]): OkumaVariable[] {
    const vars: OkumaVariable[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match: V1 = 1.9  (STOCK DIAMETER) or VC100 = 1.32 (STOCK)
      const m = line.match(/^(V[C]?\d+)\s*=\s*(.+?)(?:\s*\((.+?)\))?$/i);
      if (m) {
        const name = m[1].toUpperCase();
        const rawValue = m[2].trim();
        // Try to evaluate simple expressions like [V21 * 3.82] / V20
        let value: number | string;
        const numVal = parseFloat(rawValue);
        value = isNaN(numVal) ? rawValue : numVal;
        vars.push({ name, value, comment: m[3] || "", line: i + 1 });
      }
    }
    return vars;
  }

  /**
   * Extract tool sections (NAT blocks)
   */
  extractToolSections(lines: string[]): OkumaToolSection[] {
    const sections: OkumaToolSection[] = [];
    let currentSection: OkumaToolSection | null = null;

    // Pre-scan for G50 before first NAT (program-level speed clamp)
    let programG50: number | undefined;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^NAT\d+/i.test(trimmed)) break;
      const g50Match = trimmed.match(/G50\s+S(\d+)/i);
      if (g50Match) programG50 = parseInt(g50Match[1]);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // NAT label starts a new tool section
      const natMatch = line.match(/^(NAT\d+)\s*(.*)/i);
      if (natMatch) {
        if (currentSection) {
          currentSection.endLine = i;
          sections.push(currentSection);
        }
        const comment = natMatch[2].replace(/^\s*\(/, "").replace(/\)\s*$/, "").trim();
        currentSection = {
          label: natMatch[1].toUpperCase(),
          toolCode: "",
          toolNumber: 0,
          offsetNumber: 0,
          comment,
          startLine: i + 1,
          endLine: lines.length,
          operations: [],
          speedMode: "rpm",
          coolant: false,
        };
        continue;
      }

      if (!currentSection) continue;

      // Tool code: T010101 or T0404
      const toolMatch = line.match(/^T(\d{4,6})\b/);
      if (toolMatch) {
        currentSection.toolCode = toolMatch[0];
        const digits = toolMatch[1];
        if (digits.length === 6) {
          currentSection.toolNumber = parseInt(digits.slice(0, 2));
          currentSection.offsetNumber = parseInt(digits.slice(2, 4));
        } else if (digits.length === 4) {
          currentSection.toolNumber = parseInt(digits.slice(0, 2));
          currentSection.offsetNumber = parseInt(digits.slice(2, 4));
        }
      }

      // Speed mode
      if (/G96\s+S(\d+)/i.test(line)) {
        currentSection.speedMode = "css";
        currentSection.cssValue = parseInt(line.match(/G96\s+S(\d+)/i)![1]);
      }
      if (/G97\s+S(\d+)/i.test(line)) {
        currentSection.rpmValue = parseInt(line.match(/G97\s+S(\d+)/i)![1]);
        if (!currentSection.cssValue) currentSection.speedMode = "rpm";
      }
      if (/G50\s+S(\d+)/i.test(line)) {
        currentSection.maxRPM = parseInt(line.match(/G50\s+S(\d+)/i)![1]);
      }

      // Coolant
      if (/M8\b|M50\b/i.test(line)) currentSection.coolant = true;

      // Parse operations
      const op = this.parseOperation(line, i + 1);
      if (op) currentSection.operations.push(op);
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // Inherit program-level G50 into sections without their own
    if (programG50 !== undefined) {
      for (const section of sections) {
        if (section.maxRPM === undefined) {
          section.maxRPM = programG50;
        }
      }
    }

    return sections;
  }

  /**
   * Parse a single line into an operation
   */
  private parseOperation(line: string, lineNum: number): OkumaOperation | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith("$") || trimmed.startsWith("%")) {
      return null;
    }

    // G85 roughing cycle
    if (/G85\s+(N\w+)/i.test(trimmed)) {
      const params: Record<string, number | string> = {};
      const labelMatch = trimmed.match(/G85\s+(N\w+)/i);
      if (labelMatch) params.label = labelMatch[1];
      const dMatch = trimmed.match(/D([\d.]+)/i);
      if (dMatch) params.depth_of_cut = parseFloat(dMatch[1]);
      const uMatch = trimmed.match(/U([\d.]+)/i);
      if (uMatch) params.finish_x = parseFloat(uMatch[1]);
      const wMatch = trimmed.match(/W([\d.]+)/i);
      if (wMatch) params.finish_z = parseFloat(wMatch[1]);
      const fMatch = trimmed.match(/F([\d.]+)/i);
      if (fMatch) params.feed = parseFloat(fMatch[1]);
      return { type: "od_rough", line: lineNum, gcode: trimmed, params };
    }

    // G87 finish cycle
    if (/G87\s+(N\w+)/i.test(trimmed)) {
      const labelMatch = trimmed.match(/G87\s+(N\w+)/i);
      return { type: "od_finish", line: lineNum, gcode: trimmed, params: { label: labelMatch![1] } };
    }

    // G72 finish cycle (alternative)
    if (/G72\s+(N\w+)/i.test(trimmed)) {
      const labelMatch = trimmed.match(/G72\s+(N\w+)/i);
      return { type: "od_finish", line: lineNum, gcode: trimmed, params: { label: labelMatch![1], type: "G72" } };
    }

    // Named label definition (NTURN G81, NBORE G81, NFACE G81)
    if (/^N\w+\s+G8[12]/i.test(trimmed)) {
      return { type: "profile_label", line: lineNum, gcode: trimmed, params: {} };
    }

    // G71 threading (Okuma — NOT roughing!)
    if (/G71.*B\d+/i.test(trimmed)) {
      const params: Record<string, number | string> = {};
      const xMatch = trimmed.match(/X([\d.-]+)/i);
      if (xMatch) params.x = parseFloat(xMatch[1]);
      const zMatch = trimmed.match(/Z([\d.-]+)/i);
      if (zMatch) params.z = parseFloat(zMatch[1]);
      const bMatch = trimmed.match(/B(\d+)/i);
      if (bMatch) params.angle = parseFloat(bMatch[1]);
      const hMatch = trimmed.match(/H([\d.]+)/i);
      if (hMatch) params.total_depth = parseFloat(hMatch[1]);
      const dMatch = trimmed.match(/D([\d.]+)/i);
      if (dMatch) params.first_infeed = parseFloat(dMatch[1]);
      const fMatch = trimmed.match(/F([\d.]+)/i);
      if (fMatch) params.pitch = parseFloat(fMatch[1]);
      return { type: "thread", line: lineNum, gcode: trimmed, params };
    }

    // G74 peck drill
    if (/G74/i.test(trimmed)) {
      const params: Record<string, number | string> = {};
      const zMatch = trimmed.match(/Z([\d.-]+)/i);
      if (zMatch) params.z = parseFloat(zMatch[1]);
      const dMatch = trimmed.match(/D([\d.]+)/i);
      if (dMatch) params.peck = parseFloat(dMatch[1]);
      const lMatch = trimmed.match(/L([\d.]+)/i);
      if (lMatch) params.retract = parseFloat(lMatch[1]);
      const fMatch = trimmed.match(/F([\d.]+)/i);
      if (fMatch) params.feed = parseFloat(fMatch[1]);
      return { type: "peck_drill", line: lineNum, gcode: trimmed, params };
    }

    // G4 dwell
    if (/G4\s+F/i.test(trimmed)) {
      const fMatch = trimmed.match(/F([\d.]+)/i);
      return { type: "dwell", line: lineNum, gcode: trimmed, params: { seconds: fMatch ? parseFloat(fMatch[1]) : 1 } };
    }

    // G0 rapid
    if (/^G0\b/i.test(trimmed)) {
      const params: Record<string, number | string> = {};
      const xMatch = trimmed.match(/X([\d.-]+)/i);
      if (xMatch) params.x = parseFloat(xMatch[1]);
      const zMatch = trimmed.match(/Z([\d.-]+)/i);
      if (zMatch) params.z = parseFloat(zMatch[1]);
      const cMatch = trimmed.match(/C([\d.]+)/i);
      if (cMatch) params.c = parseFloat(cMatch[1]);
      return { type: "rapid", line: lineNum, gcode: trimmed, params };
    }

    // G1 feed
    if (/^G1\b/i.test(trimmed)) {
      const params: Record<string, number | string> = {};
      const xMatch = trimmed.match(/X([\d.-]+)/i);
      if (xMatch) params.x = parseFloat(xMatch[1]);
      const zMatch = trimmed.match(/Z([\d.-]+)/i);
      if (zMatch) params.z = parseFloat(zMatch[1]);
      const fMatch = trimmed.match(/F([\d.]+)/i);
      if (fMatch) params.feed = parseFloat(fMatch[1]);
      const aMatch = trimmed.match(/A(\d+)/i);
      if (aMatch) params.angle = parseFloat(aMatch[1]);
      return { type: "feed", line: lineNum, gcode: trimmed, params };
    }

    // G2/G3 arcs
    if (/^G[23]\b/i.test(trimmed)) {
      const params: Record<string, number | string> = {};
      const xMatch = trimmed.match(/X([\d.-]+)/i);
      if (xMatch) params.x = parseFloat(xMatch[1]);
      const zMatch = trimmed.match(/Z([\d.-]+)/i);
      if (zMatch) params.z = parseFloat(zMatch[1]);
      const lMatch = trimmed.match(/L([\d.]+)/i);
      if (lMatch) params.radius = parseFloat(lMatch[1]); // Okuma L = radius
      const iMatch = trimmed.match(/I([\d.-]+)/i);
      if (iMatch) params.i = parseFloat(iMatch[1]);
      const kMatch = trimmed.match(/K([\d.-]+)/i);
      if (kMatch) params.k = parseFloat(kMatch[1]);
      return { type: trimmed.startsWith("G2") ? "arc_cw" : "arc_ccw", line: lineNum, gcode: trimmed, params };
    }

    // G80 cycle cancel
    if (/^G80\b/i.test(trimmed)) {
      return { type: "cycle_cancel", line: lineNum, gcode: trimmed, params: {} };
    }

    // /CALL subroutine
    if (/^\/CALL/i.test(trimmed)) {
      return { type: "subroutine_call", line: lineNum, gcode: trimmed, params: { target: trimmed.replace(/^\/CALL\s+/i, "") } };
    }

    // /GOTO
    if (/^\/GOTO/i.test(trimmed)) {
      return { type: "goto", line: lineNum, gcode: trimmed, params: { target: trimmed.replace(/^\/GOTO\s+/i, "") } };
    }

    // IF conditional
    if (/^IF\s/i.test(trimmed)) {
      return { type: "conditional", line: lineNum, gcode: trimmed, params: {} };
    }

    // Variable assignment
    if (/^V[C]?\d+\s*=/i.test(trimmed)) {
      return { type: "variable_set", line: lineNum, gcode: trimmed, params: {} };
    }

    // C-axis positioning
    if (/G0\s+C\d/i.test(trimmed)) {
      const cMatch = trimmed.match(/C([\d.]+)/i);
      return { type: "c_axis_position", line: lineNum, gcode: trimmed, params: { angle: cMatch ? parseFloat(cMatch[1]) : 0 } };
    }

    return null;
  }

  /**
   * Extract subroutine calls
   */
  private extractSubroutineCalls(lines: string[]): string[] {
    return lines
      .filter(l => /^\/CALL/i.test(l.trim()))
      .map(l => l.trim().replace(/^\/CALL\s+/i, ""));
  }

  /**
   * Extract safety-critical information
   */
  extractSafety(lines: string[]): OkumaSafetyInfo {
    const g50Values: number[] = [];
    const retractPositions: Array<{ x: number; z: number }> = [];
    let optionalStops = 0;
    let mandatoryStops = 0;
    let coolantOn = 0;
    let coolantOff = 0;
    let spindleStop = false;
    const gearRanges: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // G50 speed clamp
      const g50Match = trimmed.match(/G50\s+S(\d+)/i);
      if (g50Match) g50Values.push(parseInt(g50Match[1]));

      // Retract positions (G0 X20 Z20 pattern)
      const retractMatch = trimmed.match(/G0\s+X([\d.]+)\s+Z([\d.]+)/i);
      if (retractMatch) {
        const x = parseFloat(retractMatch[1]);
        const z = parseFloat(retractMatch[2]);
        if (x >= 20 && z >= 20) {
          retractPositions.push({ x, z });
        }
      }

      // Stops
      if (/^M1\b/i.test(trimmed) || /\bM01\b/i.test(trimmed)) optionalStops++;
      if (/^M0\b/i.test(trimmed) || /\bM00\b/i.test(trimmed)) mandatoryStops++;

      // Coolant
      if (/\bM8\b|\bM50\b|\bM51\b/i.test(trimmed)) coolantOn++;
      if (/\bM9\b/i.test(trimmed)) coolantOff++;

      // Spindle stop
      if (/\bM5\b/i.test(trimmed)) spindleStop = true;

      // Gear ranges
      if (/\bM41\b/i.test(trimmed)) gearRanges.push("M41-low");
      if (/\bM42\b/i.test(trimmed)) gearRanges.push("M42-high");
    }

    return {
      g50MaxRPM: g50Values,
      retractPositions,
      optionalStops,
      mandatoryStops,
      coolantOnCount: coolantOn,
      coolantOffCount: coolantOff,
      hasSpindleStop: spindleStop,
      gearRanges: [...new Set(gearRanges)],
    };
  }

  /**
   * Extract all speed/feed data for pattern mining
   */
  extractSpeedFeeds(program: OkumaProgram): SpeedFeedExtraction[] {
    const extractions: SpeedFeedExtraction[] = [];

    for (const section of program.toolSections) {
      const extraction: SpeedFeedExtraction = {
        toolSection: section.label,
        toolNumber: section.toolNumber,
        operation: section.comment || "unknown",
        cssSpeed: section.cssValue,
        directRPM: section.rpmValue,
        maxRPM: section.maxRPM,
        feedMode: "per_rev", // Okuma G95 default for turning
      };

      // Find the first feed rate in operations
      for (const op of section.operations) {
        if (op.params.feed !== undefined) {
          extraction.feedRate = op.params.feed as number;
          break;
        }
      }

      extractions.push(extraction);
    }

    return extractions;
  }

  /**
   * Validate an Okuma program for safety issues
   */
  validateSafety(program: OkumaProgram): Array<{ severity: "critical" | "warning" | "info"; message: string }> {
    const issues: Array<{ severity: "critical" | "warning" | "info"; message: string }> = [];

    // Must have G50 speed clamp if using CSS (G96)
    const usesCSS = program.toolSections.some(ts => ts.speedMode === "css");
    if (usesCSS && program.safety.g50MaxRPM.length === 0) {
      issues.push({ severity: "critical", message: "Program uses G96 (CSS) without G50 speed clamp — spindle could over-speed at small diameters" });
    }

    // Must have safe retract between tools
    if (program.safety.retractPositions.length < program.toolSections.length - 1) {
      issues.push({ severity: "warning", message: `Only ${program.safety.retractPositions.length} safe retracts for ${program.toolSections.length} tool sections — risk of collision during tool change` });
    }

    // Must have M5 before program end
    if (!program.safety.hasSpindleStop) {
      issues.push({ severity: "warning", message: "No M5 (spindle stop) found — spindle may keep running after program end" });
    }

    // Coolant balance
    if (program.safety.coolantOnCount > 0 && program.safety.coolantOffCount === 0) {
      issues.push({ severity: "warning", message: "Coolant turned on but never explicitly turned off" });
    }

    // Bar feeder must have loop
    if (program.hasBarFeeder) {
      const hasLoop = program.rawLines.some(l => /\/GOTO\s+N(BAR|STRT)/i.test(l.trim()));
      if (!hasLoop) {
        issues.push({ severity: "warning", message: "Bar feeder (/CALL OBAR) present but no /GOTO loop — will only run one part" });
      }
    }

    return issues;
  }
}

/** Singleton instance */
export const okumaOSPParserEngine = new OkumaOSPParserEngineImpl();
