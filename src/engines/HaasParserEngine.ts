/**
 * HaasParserEngine — Parse Haas VF2/VF4/ST series CNC Programs
 *
 * Parses .nc/.hnc/.tap files from Haas mills and lathes into structured AST.
 * Handles Fanuc-compatible G-code with Haas-specific extensions.
 *
 * Haas-specific features:
 *   - O-number program identification (O00001)
 *   - N-word line numbers
 *   - G10 L2/L10/L11/L12/L13 offset setting (work offsets, tool offsets)
 *   - Setting 33: Fanuc-style canned cycle emulation
 *   - D word in G71 for depth of cut (Haas turning)
 *   - Macro #variables (#100-#199 local, #500-#999 persistent, #1-#33 system)
 *   - M97 local sub-program call (P label within same program)
 *   - M98 external sub-program call (P program number)
 *   - G65 macro call with A/B/C argument passing
 *   - M109 interactive user input
 *   - Probing: G65 P9811/P9812/P9831 Renishaw macros
 *   - G143/G43 H TLC (tool length comp)
 *   - G41/G42 cutter comp with D
 *   - G187 smoothing (P1=rough, P2=medium, P3=finish)
 *
 * @module HaasParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HaasProgram {
  filename: string;
  o_number: string | null;
  program_comment: string | null;
  toolSections: HaasToolSection[];
  macroVariables: HaasMacroVariable[];
  subCalls: HaasSubCall[];
  operations: HaasOperation[];
  safety: HaasSafetyInfo;
  lineCount: number;
  hasProbing: boolean;
  hasMacros: boolean;
  hasCutterComp: boolean;
  hasG187Smoothing: boolean;
  rawLines: string[];
}

export interface HaasToolSection {
  tool_number: number;
  tool_comment: string | null;
  offset_number: number;
  start_line: number;
  end_line: number;
  has_tlc: boolean;
  has_cutter_comp: boolean;
  spindle_rpm: number | null;
  css_mode: boolean;
  coolant: string | null;
  operations: HaasOperation[];
}

export interface HaasOperation {
  type: string;
  g_code: string;
  line_number: number;
  params: Record<string, number | string>;
}

export interface HaasMacroVariable {
  variable: string;
  value: number | string;
  line_number: number;
  scope: "local" | "persistent" | "system";
}

export interface HaasSubCall {
  type: "M97" | "M98" | "G65";
  program_ref: string;
  arguments: Record<string, number | string>;
  line_number: number;
}

export interface HaasSafetyInfo {
  has_safe_start: boolean;
  has_tool_length_comp: boolean;
  has_program_end: boolean;
  has_spindle_stop: boolean;
  has_coolant_off: boolean;
  g28_home: boolean;
  g53_machine_coord: boolean;
  safe_z_clearance: number | null;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class HaasParserEngine {
  /**
   * Parse a Haas G-code program string into structured AST.
   */
  parse(content: string, filename = "unknown"): HaasProgram {
    const lines = content.split(/\r?\n/);
    const program: HaasProgram = {
      filename,
      o_number: null,
      program_comment: null,
      toolSections: [],
      macroVariables: [],
      subCalls: [],
      operations: [],
      safety: {
        has_safe_start: false,
        has_tool_length_comp: false,
        has_program_end: false,
        has_spindle_stop: false,
        has_coolant_off: false,
        g28_home: false,
        g53_machine_coord: false,
        safe_z_clearance: null,
        warnings: [],
      },
      lineCount: lines.length,
      hasProbing: false,
      hasMacros: false,
      hasCutterComp: false,
      hasG187Smoothing: false,
      rawLines: lines,
    };

    this._extractONumber(lines, program);
    this._extractToolSections(lines, program);
    this._extractMacroVariables(lines, program);
    this._extractSubCalls(lines, program);
    this._extractOperations(lines, program);
    this._validateSafety(lines, program);

    return program;
  }

  /**
   * Extract speed/feed data for pattern mining.
   */
  extractSpeedFeeds(program: HaasProgram): Array<{
    tool: number;
    operation: string;
    speed_rpm: number | null;
    feed: number | null;
    feed_unit: "ipm" | "ipr" | "mmpm" | "mmpr";
  }> {
    const results: Array<{
      tool: number;
      operation: string;
      speed_rpm: number | null;
      feed: number | null;
      feed_unit: "ipm" | "ipr" | "mmpm" | "mmpr";
    }> = [];

    for (const section of program.toolSections) {
      for (const op of section.operations) {
        const speed = typeof op.params.S === "number" ? op.params.S : null;
        const feed = typeof op.params.F === "number" ? op.params.F : null;

        results.push({
          tool: section.tool_number,
          operation: op.type,
          speed_rpm: speed,
          feed,
          feed_unit: section.css_mode ? "ipr" : "ipm",
        });
      }
    }

    return results;
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private _extractONumber(lines: string[], program: HaasProgram): void {
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      const oMatch = trimmed.match(/^[%]?\s*O(\d+)\s*(?:\(([^)]*)\))?/i);
      if (oMatch) {
        program.o_number = `O${oMatch[1]}`;
        program.program_comment = oMatch[2] ?? null;
        return;
      }
    }
  }

  private _extractToolSections(lines: string[], program: HaasProgram): void {
    let currentSection: HaasToolSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("(") || line === "%") continue;

      // Tool change: T## M06 or M06 T##
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        if (currentSection) {
          currentSection.end_line = i - 1;
          program.toolSections.push(currentSection);
        }

        const toolNum = parseInt(toolMatch[1] ?? toolMatch[2], 10);
        const comment = lines[i].match(/\(([^)]*)\)/)?.[1] ?? null;

        currentSection = {
          tool_number: toolNum,
          tool_comment: comment,
          offset_number: toolNum,
          start_line: i,
          end_line: -1,
          has_tlc: false,
          has_cutter_comp: false,
          spindle_rpm: null,
          css_mode: false,
          coolant: null,
          operations: [],
        };
      }

      if (!currentSection) continue;

      // Tool length comp
      if (line.includes("G43") || line.includes("G143")) {
        currentSection.has_tlc = true;
        const hMatch = line.match(/H(\d+)/);
        if (hMatch) currentSection.offset_number = parseInt(hMatch[1], 10);
      }

      // Cutter comp
      if (line.includes("G41") || line.includes("G42")) {
        currentSection.has_cutter_comp = true;
        program.hasCutterComp = true;
      }

      // Spindle speed
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && (line.includes("M03") || line.includes("M04") || line.includes("M3") || line.includes("M4"))) {
        currentSection.spindle_rpm = parseInt(sMatch[1], 10);
      }

      // CSS mode (Haas lathe)
      if (line.includes("G96")) currentSection.css_mode = true;
      if (line.includes("G97")) currentSection.css_mode = false;

      // Coolant
      if (line.includes("M08") || line.includes("M8")) currentSection.coolant = "flood";
      if (line.includes("M07") || line.includes("M7")) currentSection.coolant = "mist";
      if (line.includes("M88")) currentSection.coolant = "thru_spindle";

      // G187 smoothing
      if (line.includes("G187")) {
        program.hasG187Smoothing = true;
      }
    }

    if (currentSection) {
      currentSection.end_line = lines.length - 1;
      program.toolSections.push(currentSection);
    }
  }

  private _extractMacroVariables(lines: string[], program: HaasProgram): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match #variable = value
      const macroMatch = line.match(/#(\d+)\s*=\s*([^\s(]+)/);
      if (macroMatch) {
        const varNum = parseInt(macroMatch[1], 10);
        const rawVal = macroMatch[2];
        const numVal = parseFloat(rawVal);

        let scope: "local" | "persistent" | "system" = "local";
        if (varNum >= 500) scope = "persistent";
        else if (varNum <= 33) scope = "system";

        program.macroVariables.push({
          variable: `#${varNum}`,
          value: isNaN(numVal) ? rawVal : numVal,
          line_number: i,
          scope,
        });

        program.hasMacros = true;
      }
    }
  }

  private _extractSubCalls(lines: string[], program: HaasProgram): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // M97 local sub
      const m97Match = line.match(/M97\s*P(\d+)/);
      if (m97Match) {
        program.subCalls.push({
          type: "M97",
          program_ref: `N${m97Match[1]}`,
          arguments: {},
          line_number: i,
        });
      }

      // M98 external sub
      const m98Match = line.match(/M98\s*P(\d+)/);
      if (m98Match) {
        program.subCalls.push({
          type: "M98",
          program_ref: `O${m98Match[1]}`,
          arguments: {},
          line_number: i,
        });
      }

      // G65 macro call
      const g65Match = line.match(/G65\s*P(\d+)/);
      if (g65Match) {
        const args: Record<string, number | string> = {};
        // Extract A-Z arguments
        for (const argMatch of line.matchAll(/([A-Z])(-?\d+\.?\d*)/g)) {
          if (argMatch[1] !== "G" && argMatch[1] !== "P" && argMatch[1] !== "N") {
            args[argMatch[1]] = parseFloat(argMatch[2]);
          }
        }

        program.subCalls.push({
          type: "G65",
          program_ref: `P${g65Match[1]}`,
          arguments: args,
          line_number: i,
        });

        // Check for probing macros
        const probeNum = parseInt(g65Match[1], 10);
        if (probeNum >= 9800 && probeNum <= 9899) {
          program.hasProbing = true;
        }
      }
    }
  }

  private _extractOperations(lines: string[], program: HaasProgram): void {
    let currentTool = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("(") || line === "%") continue;

      // Track current tool
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        currentTool = parseInt(toolMatch[1] ?? toolMatch[2], 10);
      }

      const op = this._parseOperation(line, i);
      if (op) {
        program.operations.push(op);

        // Add to current tool section
        const section = program.toolSections.find(s => s.tool_number === currentTool);
        if (section) {
          section.operations.push(op);
        }
      }
    }
  }

  private _parseOperation(line: string, lineNum: number): HaasOperation | null {
    const params: Record<string, number | string> = {};

    // Extract all numeric parameters
    for (const m of line.matchAll(/([A-Z])(-?\d+\.?\d*)/g)) {
      params[m[1]] = parseFloat(m[2]);
    }

    // Canned drilling cycles
    if (line.includes("G81")) return { type: "drill", g_code: "G81", line_number: lineNum, params };
    if (line.includes("G83")) return { type: "peck_drill", g_code: "G83", line_number: lineNum, params };
    if (line.includes("G73")) return { type: "chip_break", g_code: "G73", line_number: lineNum, params };
    if (line.includes("G84")) return { type: "tap", g_code: "G84", line_number: lineNum, params };
    if (line.includes("G85")) return { type: "bore", g_code: "G85", line_number: lineNum, params };
    if (line.includes("G86")) return { type: "bore_stop", g_code: "G86", line_number: lineNum, params };
    if (line.includes("G76")) return { type: "bore_fine", g_code: "G76", line_number: lineNum, params };

    // Milling cycles
    if (line.includes("G12")) return { type: "cw_pocket", g_code: "G12", line_number: lineNum, params };
    if (line.includes("G13")) return { type: "ccw_pocket", g_code: "G13", line_number: lineNum, params };

    // Turning cycles (Haas ST)
    if (line.match(/G71\b/)) return { type: "od_rough", g_code: "G71", line_number: lineNum, params };
    if (line.match(/G70\b/)) return { type: "finish_cycle", g_code: "G70", line_number: lineNum, params };
    if (line.match(/G76\b/) && params.P !== undefined && params.Q !== undefined) {
      return { type: "thread", g_code: "G76", line_number: lineNum, params };
    }
    if (line.match(/G74\b/) && params.Z !== undefined) {
      return { type: "peck_drill_turn", g_code: "G74", line_number: lineNum, params };
    }

    // Probing
    if (line.includes("G65") && line.includes("P98")) {
      return { type: "probe", g_code: "G65", line_number: lineNum, params };
    }

    // G10 offset setting
    if (line.includes("G10")) return { type: "offset_set", g_code: "G10", line_number: lineNum, params };

    return null;
  }

  private _validateSafety(lines: string[], program: HaasProgram): void {
    const content = lines.join("\n").toUpperCase();

    program.safety.has_safe_start = content.includes("G90") && content.includes("G80") && content.includes("G40");
    program.safety.has_tool_length_comp = content.includes("G43") || content.includes("G143");
    program.safety.has_program_end = content.includes("M30") || content.includes("M02");
    program.safety.has_spindle_stop = content.includes("M05") || content.includes("M5");
    program.safety.has_coolant_off = content.includes("M09") || content.includes("M9");
    program.safety.g28_home = content.includes("G28");
    program.safety.g53_machine_coord = content.includes("G53");

    // Extract safe Z
    for (const line of lines) {
      const g43z = line.match(/G43.*Z(-?\d+\.?\d*)/i);
      if (g43z) {
        program.safety.safe_z_clearance = parseFloat(g43z[1]);
        break;
      }
    }

    // Warnings
    if (!program.safety.has_safe_start) {
      program.safety.warnings.push("Missing safe start block (G90 G80 G40)");
    }
    if (program.toolSections.length > 0 && !program.safety.has_tool_length_comp) {
      program.safety.warnings.push("No tool length compensation (G43/G143) detected");
    }
    if (!program.safety.has_program_end) {
      program.safety.warnings.push("No program end (M30) detected");
    }
    if (!program.safety.has_spindle_stop) {
      program.safety.warnings.push("No explicit spindle stop (M05) detected");
    }
  }
}

export const haasParserEngine = new HaasParserEngine();
