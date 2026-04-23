/**
 * RokuRokuParserEngine — Parse Roku-Roku Micro-Milling Programs
 *
 * Roku-Roku machines use Mitsubishi M70/M80 controllers.
 * Specialized for high-speed micro-milling with:
 *   - Micro tools (0.1mm - 3mm diameter)
 *   - Very high RPM (up to 40,000+ RPM)
 *   - High-speed machining codes: SSS (Super Smooth Surface),
 *     AICC-II (G05.1 Q1), G05 P10000 HPCC (High Precision Contour Control)
 *   - Nano-interpolation for surface finish
 *   - Tool break detection macros
 *   - Custom tool measurement cycles
 *
 * Mitsubishi M70/M80 specific codes:
 *   - G05.1 Q1/Q0: AICC-II on/off (Advanced Intelligent Contour Control)
 *   - G05 P10000: HPCC (High Precision Contour Control)
 *   - G08 P1/P0: High-speed high-precision on/off
 *   - G61.1: Smooth interpolation mode
 *   - G05 P2: Tolerance control
 *   - M206/M207: Mirror image on/off
 *   - M98 P#### L##: Sub program call with repeat
 *   - G43.4: Tool center point control (5-axis)
 *
 * @module RokuRokuParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RokuRokuProgram {
  filename: string;
  program_number: string | null;
  program_comment: string | null;
  toolSections: RokuRokuToolSection[];
  operations: RokuRokuOperation[];
  highSpeedSettings: HighSpeedConfig;
  safety: RokuRokuSafetyInfo;
  lineCount: number;
  hasHPCC: boolean;
  hasAICC: boolean;
  hasSSS: boolean;
  hasNanoSmoothing: boolean;
  hasTCPC: boolean;
  hasToolBreakDetect: boolean;
  hasMirrorImage: boolean;
  maxRPM: number;
  minToolDia: number | null;
  rawLines: string[];
}

export interface RokuRokuToolSection {
  tool_number: number;
  tool_comment: string | null;
  diameter_mm: number | null;
  start_line: number;
  end_line: number;
  spindle_rpm: number;
  feed_rate: number | null;
  high_speed_mode: string | null;
  operations: RokuRokuOperation[];
}

export interface RokuRokuOperation {
  type: string;
  g_code: string;
  line_number: number;
  params: Record<string, number | string>;
}

export interface HighSpeedConfig {
  aicc_enabled: boolean;
  aicc_tolerance: number | null;
  hpcc_enabled: boolean;
  sss_enabled: boolean;
  g08_enabled: boolean;
  smooth_mode: string | null;
  nano_smoothing: boolean;
}

export interface RokuRokuSafetyInfo {
  has_safe_start: boolean;
  has_tool_length_comp: boolean;
  has_program_end: boolean;
  has_spindle_stop: boolean;
  has_coolant_off: boolean;
  has_tool_break_check: boolean;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class RokuRokuParserEngine {
  /**
   * Parse a Roku-Roku / Mitsubishi G-code program into structured AST.
   */
  parse(content: string, filename = "unknown"): RokuRokuProgram {
    const lines = content.split(/\r?\n/);
    const program: RokuRokuProgram = {
      filename,
      program_number: null,
      program_comment: null,
      toolSections: [],
      operations: [],
      highSpeedSettings: {
        aicc_enabled: false,
        aicc_tolerance: null,
        hpcc_enabled: false,
        sss_enabled: false,
        g08_enabled: false,
        smooth_mode: null,
        nano_smoothing: false,
      },
      safety: {
        has_safe_start: false,
        has_tool_length_comp: false,
        has_program_end: false,
        has_spindle_stop: false,
        has_coolant_off: false,
        has_tool_break_check: false,
        warnings: [],
      },
      lineCount: lines.length,
      hasHPCC: false,
      hasAICC: false,
      hasSSS: false,
      hasNanoSmoothing: false,
      hasTCPC: false,
      hasToolBreakDetect: false,
      hasMirrorImage: false,
      maxRPM: 0,
      minToolDia: null,
      rawLines: lines,
    };

    this._extractProgramHeader(lines, program);
    this._extractHighSpeedSettings(lines, program);
    this._extractToolSections(lines, program);
    this._extractOperations(lines, program);
    this._validateSafety(lines, program);
    this._findMaxRPM(lines, program);

    return program;
  }

  /**
   * Extract speed/feed data for micro-milling pattern mining.
   */
  extractSpeedFeeds(program: RokuRokuProgram): Array<{
    tool: number;
    diameter_mm: number | null;
    operation: string;
    speed_rpm: number;
    feed: number | null;
    high_speed_mode: string | null;
  }> {
    const results: Array<{
      tool: number;
      diameter_mm: number | null;
      operation: string;
      speed_rpm: number;
      feed: number | null;
      high_speed_mode: string | null;
    }> = [];

    for (const section of program.toolSections) {
      for (const op of section.operations) {
        results.push({
          tool: section.tool_number,
          diameter_mm: section.diameter_mm,
          operation: op.type,
          speed_rpm: section.spindle_rpm,
          feed: section.feed_rate,
          high_speed_mode: section.high_speed_mode,
        });
      }
    }

    return results;
  }

  /**
   * Analyze micro-milling strategy from program content.
   */
  analyzeMicroStrategy(program: RokuRokuProgram): {
    strategy: string;
    max_rpm: number;
    min_tool_dia: number | null;
    high_speed_modes: string[];
    estimated_surface_quality: string;
  } {
    const modes: string[] = [];
    if (program.hasHPCC) modes.push("HPCC");
    if (program.hasAICC) modes.push("AICC-II");
    if (program.hasSSS) modes.push("SSS");
    if (program.hasNanoSmoothing) modes.push("Nano");
    if (program.hasTCPC) modes.push("TCPC");

    let strategy = "standard";
    if (modes.length >= 3) strategy = "ultra_precision";
    else if (modes.length >= 2) strategy = "high_precision";
    else if (modes.length >= 1) strategy = "high_speed";

    let quality = "standard";
    if (program.hasNanoSmoothing || program.hasSSS) quality = "mirror_finish";
    else if (program.hasHPCC || program.hasAICC) quality = "high_quality";

    return {
      strategy,
      max_rpm: program.maxRPM,
      min_tool_dia: program.minToolDia,
      high_speed_modes: modes,
      estimated_surface_quality: quality,
    };
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private _extractProgramHeader(lines: string[], program: RokuRokuProgram): void {
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();

      // O-number
      const oMatch = trimmed.match(/^[%]?\s*O(\d+)\s*(?:\(([^)]*)\))?/i);
      if (oMatch) {
        program.program_number = `O${oMatch[1]}`;
        program.program_comment = oMatch[2] ?? null;
        return;
      }

      // Comment-only header
      if (!program.program_comment) {
        const cMatch = trimmed.match(/^\(([^)]+)\)/);
        if (cMatch) program.program_comment = cMatch[1];
      }
    }
  }

  private _extractHighSpeedSettings(lines: string[], program: RokuRokuProgram): void {
    for (const line of lines) {
      const upper = line.trim().toUpperCase();

      // AICC-II: G05.1 Q1 (on) / G05.1 Q0 (off)
      if (upper.includes("G05.1") && upper.includes("Q1")) {
        program.hasAICC = true;
        program.highSpeedSettings.aicc_enabled = true;
      }

      // HPCC: G05 P10000
      if (upper.includes("G05") && upper.includes("P10000")) {
        program.hasHPCC = true;
        program.highSpeedSettings.hpcc_enabled = true;
      }

      // G08 P1: High speed high precision
      if (upper.match(/G08\s*P1/)) {
        program.highSpeedSettings.g08_enabled = true;
      }

      // G61.1: Smooth interpolation (SSS)
      if (upper.includes("G61.1")) {
        program.hasSSS = true;
        program.highSpeedSettings.sss_enabled = true;
      }

      // Nano smoothing: G05 P2 or specific M-code
      if (upper.match(/G05\s*P2/)) {
        program.hasNanoSmoothing = true;
        program.highSpeedSettings.nano_smoothing = true;
      }

      // TCPC: G43.4
      if (upper.includes("G43.4")) {
        program.hasTCPC = true;
      }

      // Mirror image: M206/M207
      if (upper.includes("M206") || upper.includes("M207")) {
        program.hasMirrorImage = true;
      }

      // Tool break detection (vendor-specific macros)
      if (upper.includes("TOOL BREAK") || upper.includes("M612") || upper.includes("M610")) {
        program.hasToolBreakDetect = true;
        program.safety.has_tool_break_check = true;
      }

      // AICC tolerance
      const tolMatch = upper.match(/G05\.1\s*Q1\s*.*?(?:E|R)(-?\d+\.?\d*)/);
      if (tolMatch) {
        program.highSpeedSettings.aicc_tolerance = parseFloat(tolMatch[1]);
      }
    }

    // Determine smooth mode
    if (program.hasNanoSmoothing) program.highSpeedSettings.smooth_mode = "nano";
    else if (program.hasSSS) program.highSpeedSettings.smooth_mode = "sss";
    else if (program.hasHPCC) program.highSpeedSettings.smooth_mode = "hpcc";
    else if (program.hasAICC) program.highSpeedSettings.smooth_mode = "aicc";
  }

  private _extractToolSections(lines: string[], program: RokuRokuProgram): void {
    let currentSection: RokuRokuToolSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("(") || line === "%") continue;

      // Tool change
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        if (currentSection) {
          currentSection.end_line = i - 1;
          program.toolSections.push(currentSection);
        }

        const toolNum = parseInt(toolMatch[1] ?? toolMatch[2], 10);
        const comment = lines[i].match(/\(([^)]*)\)/)?.[1] ?? null;

        // Extract diameter from comment
        let dia: number | null = null;
        if (comment) {
          const diaMatch = comment.match(/(\d+\.?\d*)\s*(?:MM|DIA|D|R)/i);
          if (diaMatch) dia = parseFloat(diaMatch[1]);
        }

        currentSection = {
          tool_number: toolNum,
          tool_comment: comment,
          diameter_mm: dia,
          start_line: i,
          end_line: -1,
          spindle_rpm: 0,
          feed_rate: null,
          high_speed_mode: null,
          operations: [],
        };

        // Track min tool diameter
        if (dia !== null && dia > 0) {
          if (program.minToolDia === null || dia < program.minToolDia) {
            program.minToolDia = dia;
          }
        }
      }

      if (!currentSection) continue;

      // Spindle speed
      const sMatch = line.match(/S(\d+)/);
      if (sMatch) {
        const rpm = parseInt(sMatch[1], 10);
        if (rpm > currentSection.spindle_rpm) currentSection.spindle_rpm = rpm;
      }

      // Feed rate
      const fMatch = line.match(/F(\d+\.?\d*)/);
      if (fMatch && !currentSection.feed_rate) {
        currentSection.feed_rate = parseFloat(fMatch[1]);
      }

      // High-speed mode for this section
      if (line.includes("G05.1") && line.includes("Q1")) currentSection.high_speed_mode = "AICC";
      if (line.includes("G05") && line.includes("P10000")) currentSection.high_speed_mode = "HPCC";
      if (line.includes("G61.1")) currentSection.high_speed_mode = "SSS";
    }

    if (currentSection) {
      currentSection.end_line = lines.length - 1;
      program.toolSections.push(currentSection);
    }
  }

  private _extractOperations(lines: string[], program: RokuRokuProgram): void {
    let currentTool = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("(") || line === "%") continue;

      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) currentTool = parseInt(toolMatch[1] ?? toolMatch[2], 10);

      const op = this._classifyOperation(line, i);
      if (op) {
        program.operations.push(op);
        const section = program.toolSections.find(s => s.tool_number === currentTool);
        if (section) section.operations.push(op);
      }
    }
  }

  private _classifyOperation(line: string, lineNum: number): RokuRokuOperation | null {
    const params: Record<string, number | string> = {};
    for (const m of line.matchAll(/([A-Z])(-?\d+\.?\d*)/g)) {
      params[m[1]] = parseFloat(m[2]);
    }

    // Drilling cycles
    if (line.includes("G81")) return { type: "drill", g_code: "G81", line_number: lineNum, params };
    if (line.includes("G83")) return { type: "peck_drill", g_code: "G83", line_number: lineNum, params };
    if (line.includes("G73")) return { type: "chip_break", g_code: "G73", line_number: lineNum, params };
    if (line.includes("G84")) return { type: "tap", g_code: "G84", line_number: lineNum, params };
    if (line.includes("G85")) return { type: "bore", g_code: "G85", line_number: lineNum, params };

    // High-speed contouring (3D surface)
    if (line.includes("G01") && params.Z !== undefined && params.X !== undefined && params.Y !== undefined) {
      return { type: "contour_3d", g_code: "G01", line_number: lineNum, params };
    }

    // Arcs (2D/3D)
    if (line.match(/G0?2\b/) && !line.includes("G20")) {
      return { type: "arc_cw", g_code: "G02", line_number: lineNum, params };
    }
    if (line.match(/G0?3\b/) && !line.includes("G30")) {
      return { type: "arc_ccw", g_code: "G03", line_number: lineNum, params };
    }

    // Helical interpolation
    if ((line.includes("G02") || line.includes("G03")) && params.Z !== undefined && (params.I !== undefined || params.J !== undefined)) {
      return { type: "helical", g_code: line.includes("G02") ? "G02" : "G03", line_number: lineNum, params };
    }

    return null;
  }

  private _validateSafety(lines: string[], program: RokuRokuProgram): void {
    const content = lines.join("\n").toUpperCase();

    program.safety.has_safe_start = content.includes("G90") && content.includes("G80") && content.includes("G40");
    program.safety.has_tool_length_comp = content.includes("G43") || content.includes("G43.4");
    program.safety.has_program_end = content.includes("M30") || content.includes("M02");
    program.safety.has_spindle_stop = content.includes("M05") || content.includes("M5");
    program.safety.has_coolant_off = content.includes("M09") || content.includes("M9");

    if (!program.safety.has_safe_start) {
      program.safety.warnings.push("Missing safe start block (G90 G80 G40)");
    }
    if (!program.safety.has_tool_length_comp) {
      program.safety.warnings.push("No tool length compensation detected");
    }
    if (program.maxRPM > 30000 && !program.hasToolBreakDetect) {
      program.safety.warnings.push("High RPM micro-milling without tool break detection");
    }
  }

  private _findMaxRPM(lines: string[], program: RokuRokuProgram): void {
    for (const line of lines) {
      const sMatch = line.match(/S(\d+)/i);
      if (sMatch) {
        const rpm = parseInt(sMatch[1], 10);
        if (rpm > program.maxRPM && rpm <= 60000) {
          program.maxRPM = rpm;
        }
      }
    }
  }
}

export const rokuRokuParserEngine = new RokuRokuParserEngine();
