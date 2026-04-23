/**
 * HurcoParserEngine — Parse Hurco VM30i/VMX Programs
 *
 * Handles both Hurco WinMax conversational format AND standard G-code mode.
 * Hurco machines can run in two modes:
 *   1. WinMax Conversational — proprietary block-based format
 *   2. NC (G-code) mode — standard Fanuc-compatible G-code
 *
 * WinMax-specific features:
 *   - PART SETUP blocks with stock dimensions and material
 *   - Tool Library references with full geometry
 *   - Conversational operation blocks (DRILL, POCKET, CONTOUR, etc.)
 *   - Pattern operations (BOLT CIRCLE, FRAME, etc.)
 *   - Automatic approach/retract strategies
 *
 * G-code mode features:
 *   - Standard Fanuc G-codes (G00-G99)
 *   - Hurco-specific: G150/G151 scaling, G68/G69 coordinate rotation
 *   - Canned cycles with L repeat count
 *   - Optional stop M01 after each tool
 *   - G43 H TLC
 *
 * @module HurcoParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HurcoProgram {
  filename: string;
  program_name: string | null;
  mode: "winmax" | "gcode" | "mixed";
  part_setup: HurcoPartSetup | null;
  toolSections: HurcoToolSection[];
  operations: HurcoOperation[];
  safety: HurcoSafetyInfo;
  lineCount: number;
  hasConversational: boolean;
  hasGCode: boolean;
  hasProbing: boolean;
  hasRotaryAxis: boolean;
  rawLines: string[];
}

export interface HurcoPartSetup {
  stock_x: number | null;
  stock_y: number | null;
  stock_z: number | null;
  material: string | null;
  fixture: string | null;
  datum: string | null;
}

export interface HurcoToolSection {
  tool_number: number;
  tool_description: string | null;
  diameter: number | null;
  flute_count: number | null;
  start_line: number;
  end_line: number;
  spindle_rpm: number | null;
  feed_rate: number | null;
  operations: HurcoOperation[];
}

export interface HurcoOperation {
  type: string;
  mode: "conversational" | "gcode";
  g_code: string | null;
  line_number: number;
  params: Record<string, number | string>;
}

export interface HurcoSafetyInfo {
  has_safe_start: boolean;
  has_tool_length_comp: boolean;
  has_program_end: boolean;
  has_coolant_control: boolean;
  has_spindle_stop: boolean;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class HurcoParserEngine {
  /**
   * Parse a Hurco program into structured AST.
   * Auto-detects WinMax vs G-code mode.
   */
  parse(content: string, filename = "unknown"): HurcoProgram {
    const lines = content.split(/\r?\n/);
    const program: HurcoProgram = {
      filename,
      program_name: null,
      mode: "gcode",
      part_setup: null,
      toolSections: [],
      operations: [],
      safety: {
        has_safe_start: false,
        has_tool_length_comp: false,
        has_program_end: false,
        has_coolant_control: false,
        has_spindle_stop: false,
        warnings: [],
      },
      lineCount: lines.length,
      hasConversational: false,
      hasGCode: false,
      hasProbing: false,
      hasRotaryAxis: false,
      rawLines: lines,
    };

    // Detect mode
    const contentUpper = content.toUpperCase();
    program.hasConversational = contentUpper.includes("PART SETUP") ||
      contentUpper.includes("CONVERSATIONAL") ||
      contentUpper.includes("DRILL PATTERN") ||
      contentUpper.includes("POCKET MILL");
    program.hasGCode = /G[0-9]{1,2}\b/.test(contentUpper);

    if (program.hasConversational && program.hasGCode) {
      program.mode = "mixed";
    } else if (program.hasConversational) {
      program.mode = "winmax";
    } else {
      program.mode = "gcode";
    }

    // Extract program name from first comment or header
    for (const line of lines.slice(0, 10)) {
      const nameMatch = line.match(/\(([^)]+)\)/);
      if (nameMatch) {
        program.program_name = nameMatch[1].trim();
        break;
      }
      const percentMatch = line.match(/^%\s*(.+)/);
      if (percentMatch) {
        program.program_name = percentMatch[1].trim();
        break;
      }
    }

    this._extractPartSetup(lines, program);
    this._extractToolSections(lines, program);
    this._extractOperations(lines, program);
    this._validateSafety(lines, program);

    // Rotary axis detection
    program.hasRotaryAxis = contentUpper.includes("A ") && /\bA-?\d/.test(contentUpper) ||
      contentUpper.includes("B ") && /\bB-?\d/.test(contentUpper);

    return program;
  }

  /**
   * Extract speed/feed data for pattern mining.
   */
  extractSpeedFeeds(program: HurcoProgram): Array<{
    tool: number;
    operation: string;
    speed_rpm: number | null;
    feed: number | null;
  }> {
    const results: Array<{
      tool: number;
      operation: string;
      speed_rpm: number | null;
      feed: number | null;
    }> = [];

    for (const section of program.toolSections) {
      for (const op of section.operations) {
        results.push({
          tool: section.tool_number,
          operation: op.type,
          speed_rpm: section.spindle_rpm,
          feed: section.feed_rate,
        });
      }
    }

    return results;
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private _extractPartSetup(lines: string[], program: HurcoProgram): void {
    let inSetup = false;
    const setup: HurcoPartSetup = {
      stock_x: null, stock_y: null, stock_z: null,
      material: null, fixture: null, datum: null,
    };

    for (const line of lines) {
      const upper = line.trim().toUpperCase();

      if (upper.includes("PART SETUP") || upper.includes("STOCK")) {
        inSetup = true;
      }

      if (inSetup) {
        const xMatch = upper.match(/(?:STOCK\s*)?X\s*=?\s*(-?\d+\.?\d*)/);
        const yMatch = upper.match(/(?:STOCK\s*)?Y\s*=?\s*(-?\d+\.?\d*)/);
        const zMatch = upper.match(/(?:STOCK\s*)?Z\s*=?\s*(-?\d+\.?\d*)/);
        const matMatch = line.match(/MATERIAL\s*[:=]\s*(.+)/i);
        const fixMatch = line.match(/FIXTURE\s*[:=]\s*(.+)/i);

        if (xMatch) setup.stock_x = parseFloat(xMatch[1]);
        if (yMatch) setup.stock_y = parseFloat(yMatch[1]);
        if (zMatch) setup.stock_z = parseFloat(zMatch[1]);
        if (matMatch) setup.material = matMatch[1].trim();
        if (fixMatch) setup.fixture = fixMatch[1].trim();
      }

      // End of setup block
      if (inSetup && (upper.includes("END SETUP") || upper.match(/^T\d/))) {
        break;
      }
    }

    if (setup.stock_x !== null || setup.material !== null) {
      program.part_setup = setup;
    }
  }

  private _extractToolSections(lines: string[], program: HurcoProgram): void {
    let currentSection: HurcoToolSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // Tool change in G-code: T## M06 or M06 T##
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      // WinMax tool reference
      const winToolMatch = line.match(/^TOOL\s+(\d+)/i);

      if (toolMatch || winToolMatch) {
        if (currentSection) {
          currentSection.end_line = i - 1;
          program.toolSections.push(currentSection);
        }

        const toolNum = toolMatch
          ? parseInt(toolMatch[1] ?? toolMatch[2], 10)
          : parseInt(winToolMatch![1], 10);

        const comment = lines[i].match(/\(([^)]*)\)/)?.[1] ?? null;

        currentSection = {
          tool_number: toolNum,
          tool_description: comment,
          diameter: null,
          flute_count: null,
          start_line: i,
          end_line: -1,
          spindle_rpm: null,
          feed_rate: null,
          operations: [],
        };

        // Extract diameter from comment
        if (comment) {
          const diaMatch = comment.match(/(\d+\.?\d*)\s*(?:MM|DIA|D)/i);
          if (diaMatch) currentSection.diameter = parseFloat(diaMatch[1]);
        }
      }

      if (!currentSection) continue;

      // Spindle speed
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && (line.includes("M03") || line.includes("M04") || line.includes("M3") || line.includes("M4"))) {
        currentSection.spindle_rpm = parseInt(sMatch[1], 10);
      } else if (sMatch && !currentSection.spindle_rpm) {
        currentSection.spindle_rpm = parseInt(sMatch[1], 10);
      }

      // Feed rate
      const fMatch = line.match(/F(\d+\.?\d*)/);
      if (fMatch && line.includes("G01") || fMatch && line.includes("G1 ")) {
        currentSection.feed_rate = parseFloat(fMatch[1]);
      }

      // TLC
      if (line.includes("G43")) {
        program.safety.has_tool_length_comp = true;
      }
    }

    if (currentSection) {
      currentSection.end_line = lines.length - 1;
      program.toolSections.push(currentSection);
    }
  }

  private _extractOperations(lines: string[], program: HurcoProgram): void {
    let currentTool = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upper = line.toUpperCase();

      // Track tool
      const toolMatch = upper.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        currentTool = parseInt(toolMatch[1] ?? toolMatch[2], 10);
      }

      const op = this._classifyOperation(upper, i);
      if (op) {
        program.operations.push(op);
        const section = program.toolSections.find(s => s.tool_number === currentTool);
        if (section) section.operations.push(op);
      }
    }
  }

  private _classifyOperation(line: string, lineNum: number): HurcoOperation | null {
    const params: Record<string, number | string> = {};
    for (const m of line.matchAll(/([A-Z])(-?\d+\.?\d*)/g)) {
      params[m[1]] = parseFloat(m[2]);
    }

    // Conversational operations
    if (line.includes("DRILL PATTERN")) return { type: "drill_pattern", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("POCKET MILL")) return { type: "pocket", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("CONTOUR MILL")) return { type: "contour", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("FACE MILL")) return { type: "face", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("BOLT CIRCLE")) return { type: "bolt_circle", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("FRAME MILL")) return { type: "frame", mode: "conversational", g_code: null, line_number: lineNum, params };

    // G-code drilling
    if (line.includes("G81")) return { type: "drill", mode: "gcode", g_code: "G81", line_number: lineNum, params };
    if (line.includes("G83")) return { type: "peck_drill", mode: "gcode", g_code: "G83", line_number: lineNum, params };
    if (line.includes("G73")) return { type: "chip_break", mode: "gcode", g_code: "G73", line_number: lineNum, params };
    if (line.includes("G84")) return { type: "tap", mode: "gcode", g_code: "G84", line_number: lineNum, params };
    if (line.includes("G85")) return { type: "bore", mode: "gcode", g_code: "G85", line_number: lineNum, params };
    if (line.includes("G76")) return { type: "bore_fine", mode: "gcode", g_code: "G76", line_number: lineNum, params };

    // G-code milling
    if (line.includes("G12")) return { type: "cw_pocket", mode: "gcode", g_code: "G12", line_number: lineNum, params };
    if (line.includes("G13")) return { type: "ccw_pocket", mode: "gcode", g_code: "G13", line_number: lineNum, params };

    return null;
  }

  private _validateSafety(lines: string[], program: HurcoProgram): void {
    const content = lines.join("\n").toUpperCase();

    program.safety.has_safe_start = content.includes("G90") && content.includes("G80") && content.includes("G40");
    program.safety.has_program_end = content.includes("M30") || content.includes("M02") || content.includes("M2");
    program.safety.has_coolant_control = content.includes("M09") || content.includes("M9");
    program.safety.has_spindle_stop = content.includes("M05") || content.includes("M5");

    if (!program.safety.has_safe_start && program.mode !== "winmax") {
      program.safety.warnings.push("Missing safe start block (G90 G80 G40)");
    }
    if (!program.safety.has_program_end) {
      program.safety.warnings.push("No program end (M30) detected");
    }
  }
}

export const hurcoParserEngine = new HurcoParserEngine();
