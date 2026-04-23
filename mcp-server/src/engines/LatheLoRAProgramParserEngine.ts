/**
 * LatheLoRAProgramParserEngine — LATHE-LORA-MS0 U-LLR06
 * =====================================================
 *
 * Deep G-code parser specialized for Okuma OSP lathe programs.
 * Extracts structured data for LatheLoRA fine-tuning.
 *
 * Features:
 *   - Okuma OSP dialect recognition (G50, VLMON, VGRLF, etc.)
 *   - Operation block extraction with context
 *   - Parameter extraction (S, F, T, X, Z, R, etc.)
 *   - Canned cycle decomposition (G71, G72, G70, G76, etc.)
 *   - Comment and variable extraction
 *   - Program structure analysis
 *
 * Knowledge sources:
 *   - lathe-tribal-tips-okuma.ts (Okuma OSP tips)
 *   - CONTROLLER_KNOWLEDGE_TIPS
 *
 * @module engines/LatheLoRAProgramParserEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Parsed G-code line */
export interface ParsedLine {
  line_number: number;
  raw: string;
  type: LineType;
  g_codes: string[];
  m_codes: string[];
  parameters: Record<string, number>;
  comment?: string;
  variables?: Record<string, number>;
  is_modal: boolean;
}

/** Line classification */
export type LineType =
  | "rapid"           // G00
  | "linear"          // G01
  | "arc_cw"          // G02
  | "arc_ccw"         // G03
  | "dwell"           // G04
  | "tool_change"     // T command
  | "spindle_on"      // M03/M04
  | "spindle_off"     // M05
  | "coolant_on"      // M08
  | "coolant_off"     // M09
  | "program_end"     // M02/M30
  | "roughing_cycle"  // G71/G72
  | "finishing_cycle" // G70
  | "threading_cycle" // G76/G92
  | "drilling_cycle"  // G83/G81/G74
  | "grooving_cycle"  // G75
  | "css_mode"        // G96
  | "rpm_mode"        // G97
  | "spindle_clamp"   // G50 S
  | "work_offset"     // G54-G59
  | "absolute"        // G90
  | "incremental"     // G91
  | "comment"         // ( ... )
  | "variable_set"    // V = value
  | "subprogram"      // M98/M99
  | "tool_life"       // VLMON, VGRLF
  | "empty"
  | "unknown";

/** Operation block (collection of related lines) */
export interface OperationBlock {
  block_id: string;
  start_line: number;
  end_line: number;
  operation_type: OperationType;
  tool_number?: number;
  spindle_speed?: number;
  spindle_mode: "css" | "rpm";
  feed_rate?: number;
  coolant: boolean;
  lines: ParsedLine[];
  parameters: {
    depth_of_cut?: number;
    stock_allowance?: number;
    finish_allowance?: number;
    thread_pitch?: number;
    thread_depth?: number;
  };
}

/** Operation classification */
export type OperationType =
  | "roughing"
  | "finishing"
  | "threading"
  | "grooving"
  | "drilling"
  | "facing"
  | "boring"
  | "parting"
  | "setup"
  | "unknown";

/** Program structure */
export interface ProgramStructure {
  program_number?: string;
  program_name?: string;
  total_lines: number;
  tool_changes: number;
  unique_tools: number[];
  operations: OperationBlock[];
  variables: Record<string, number>;
  has_tool_life: boolean;
  has_subprograms: boolean;
  has_css: boolean;
  max_spindle_speed?: number;
  spindle_clamp?: number;
  work_offsets: string[];
  comments: string[];
  dialect_confidence: number;
}

/** Parse result */
export interface ParseResult {
  success: boolean;
  structure: ProgramStructure;
  lines: ParsedLine[];
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Okuma OSP specific codes */
const OKUMA_PATTERNS = {
  tool_life_check: /VGRLF\[(\d+)\]/i,
  tool_life_monitor: /VLMON\[(\d+)\]\s*=\s*(\d+)/i,
  tool_life_id: /TLID/i,
  variable_set: /V(\d+)\s*=\s*([\d.+-]+)/i,
  variable_read: /V(\d+)/g,
  subprogram_call: /M98\s+P(\d+)/i,
  program_number: /^O(\d+)/i,
  comment: /\(([^)]*)\)/,
};

/** G-code to operation mapping */
const OPERATION_MAP: Record<string, OperationType> = {
  G71: "roughing",
  G72: "roughing",
  G70: "finishing",
  G76: "threading",
  G92: "threading",
  G75: "grooving",
  G74: "drilling",
  G83: "drilling",
  G81: "drilling",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAProgramParserEngine {
  /**
   * Parse a complete G-code program
   */
  parse(content: string, fileName?: string): ParseResult {
    const lines = content.split(/\r?\n/);
    const parsedLines: ParsedLine[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
      try {
        const parsed = this.parseLine(lines[i], i + 1);
        parsedLines.push(parsed);
      } catch (err) {
        errors.push(`Line ${i + 1}: ${err}`);
        parsedLines.push({
          line_number: i + 1,
          raw: lines[i],
          type: "unknown",
          g_codes: [],
          m_codes: [],
          parameters: {},
          is_modal: false,
        });
      }
    }

    // Build structure
    const structure = this.buildStructure(parsedLines);

    // Check for warnings
    if (!structure.has_css && structure.operations.length > 0) {
      warnings.push("No CSS (G96) found - consider using constant surface speed for turning");
    }
    if (!structure.spindle_clamp) {
      warnings.push("No spindle clamp (G50 S) found - recommend setting max RPM for safety");
    }

    return {
      success: errors.length === 0,
      structure,
      lines: parsedLines,
      errors,
      warnings,
    };
  }

  /**
   * Parse a single G-code line
   */
  parseLine(line: string, lineNumber: number): ParsedLine {
    const raw = line;
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      return {
        line_number: lineNumber,
        raw,
        type: "empty",
        g_codes: [],
        m_codes: [],
        parameters: {},
        is_modal: false,
      };
    }

    // Comment-only line
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      return {
        line_number: lineNumber,
        raw,
        type: "comment",
        g_codes: [],
        m_codes: [],
        parameters: {},
        comment: trimmed.slice(1, -1),
        is_modal: false,
      };
    }

    // Extract components
    const g_codes = this.extractGCodes(trimmed);
    const m_codes = this.extractMCodes(trimmed);
    const parameters = this.extractParameters(trimmed);
    const variables = this.extractVariables(trimmed);
    const comment = this.extractComment(trimmed);

    // Determine line type
    const type = this.classifyLine(trimmed, g_codes, m_codes);

    return {
      line_number: lineNumber,
      raw,
      type,
      g_codes,
      m_codes,
      parameters,
      comment,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
      is_modal: this.isModalCode(g_codes),
    };
  }

  /**
   * Extract G-codes from line
   */
  private extractGCodes(line: string): string[] {
    const matches = line.match(/G\d+(\.\d+)?/gi) || [];
    return matches.map(m => m.toUpperCase());
  }

  /**
   * Extract M-codes from line
   */
  private extractMCodes(line: string): string[] {
    const matches = line.match(/M\d+/gi) || [];
    return matches.map(m => m.toUpperCase());
  }

  /**
   * Extract numeric parameters (X, Z, R, F, S, T, etc.)
   */
  private extractParameters(line: string): Record<string, number> {
    const params: Record<string, number> = {};
    const regex = /([XZRFSTUDPQIKHC])([+-]?\d*\.?\d+)/gi;
    let match;

    while ((match = regex.exec(line)) !== null) {
      params[match[1].toUpperCase()] = parseFloat(match[2]);
    }

    return params;
  }

  /**
   * Extract Okuma variables
   */
  private extractVariables(line: string): Record<string, number> {
    const vars: Record<string, number> = {};

    // Check for variable assignment
    const setMatch = line.match(OKUMA_PATTERNS.variable_set);
    if (setMatch) {
      vars[`V${setMatch[1]}`] = parseFloat(setMatch[2]);
    }

    return vars;
  }

  /**
   * Extract inline comment
   */
  private extractComment(line: string): string | undefined {
    const match = line.match(OKUMA_PATTERNS.comment);
    return match ? match[1] : undefined;
  }

  /**
   * Classify line type
   */
  private classifyLine(line: string, gCodes: string[], mCodes: string[]): LineType {
    const upper = line.toUpperCase();

    // Check Okuma-specific patterns first
    if (OKUMA_PATTERNS.tool_life_check.test(upper) || OKUMA_PATTERNS.tool_life_monitor.test(upper)) {
      return "tool_life";
    }
    if (OKUMA_PATTERNS.variable_set.test(upper)) {
      return "variable_set";
    }

    // Check G-codes
    for (const g of gCodes) {
      if (g === "G00") return "rapid";
      if (g === "G01") return "linear";
      if (g === "G02") return "arc_cw";
      if (g === "G03") return "arc_ccw";
      if (g === "G04") return "dwell";
      if (g === "G70") return "finishing_cycle";
      if (g === "G71" || g === "G72") return "roughing_cycle";
      if (g === "G76" || g === "G92") return "threading_cycle";
      if (g === "G74" || g === "G75") return "grooving_cycle";
      if (g === "G83" || g === "G81") return "drilling_cycle";
      if (g === "G96") return "css_mode";
      if (g === "G97") return "rpm_mode";
      if (/G5[4-9]/.test(g)) return "work_offset";
      if (g === "G90") return "absolute";
      if (g === "G91") return "incremental";
    }

    // Check for spindle clamp (G50 with S parameter)
    if (gCodes.includes("G50") && upper.includes("S")) {
      return "spindle_clamp";
    }

    // Check M-codes
    for (const m of mCodes) {
      if (m === "M03" || m === "M04") return "spindle_on";
      if (m === "M05") return "spindle_off";
      if (m === "M08") return "coolant_on";
      if (m === "M09") return "coolant_off";
      if (m === "M02" || m === "M30") return "program_end";
      if (m === "M98") return "subprogram";
    }

    // Check for tool change
    if (upper.match(/^T\d{2,4}/)) {
      return "tool_change";
    }

    return "unknown";
  }

  /**
   * Check if G-code is modal
   */
  private isModalCode(gCodes: string[]): boolean {
    const modalGroups = ["G00", "G01", "G02", "G03", "G90", "G91", "G96", "G97"];
    return gCodes.some(g => modalGroups.includes(g));
  }

  /**
   * Build program structure from parsed lines
   */
  private buildStructure(lines: ParsedLine[]): ProgramStructure {
    const structure: ProgramStructure = {
      total_lines: lines.length,
      tool_changes: 0,
      unique_tools: [],
      operations: [],
      variables: {},
      has_tool_life: false,
      has_subprograms: false,
      has_css: false,
      work_offsets: [],
      comments: [],
      dialect_confidence: 0,
    };

    let currentTool: number | undefined;
    let currentOperation: OperationBlock | null = null;
    let spindleMode: "css" | "rpm" = "rpm";
    let coolantOn = false;
    let okumaFeatures = 0;

    for (const line of lines) {
      // Track program number
      if (!structure.program_number && line.raw.match(/^O(\d+)/i)) {
        structure.program_number = line.raw.match(/^O(\d+)/i)?.[1];
      }

      // Track comments
      if (line.comment) {
        structure.comments.push(line.comment);
      }

      // Track variables
      if (line.variables) {
        Object.assign(structure.variables, line.variables);
        okumaFeatures++;
      }

      // Track tool life usage
      if (line.type === "tool_life") {
        structure.has_tool_life = true;
        okumaFeatures += 2;
      }

      // Track subprograms
      if (line.type === "subprogram") {
        structure.has_subprograms = true;
      }

      // Track CSS
      if (line.type === "css_mode") {
        structure.has_css = true;
        spindleMode = "css";
      }
      if (line.type === "rpm_mode") {
        spindleMode = "rpm";
      }

      // Track spindle clamp
      if (line.type === "spindle_clamp" && line.parameters.S) {
        structure.spindle_clamp = line.parameters.S;
        structure.max_spindle_speed = line.parameters.S;
      }

      // Track work offsets
      if (line.type === "work_offset") {
        const offset = line.g_codes.find(g => /G5[4-9]/.test(g));
        if (offset && !structure.work_offsets.includes(offset)) {
          structure.work_offsets.push(offset);
        }
      }

      // Track tool changes
      if (line.type === "tool_change" && line.parameters.T) {
        structure.tool_changes++;
        currentTool = line.parameters.T;
        if (!structure.unique_tools.includes(currentTool)) {
          structure.unique_tools.push(currentTool);
        }

        // Close current operation
        if (currentOperation) {
          structure.operations.push(currentOperation);
          currentOperation = null;
        }
      }

      // Track coolant
      if (line.type === "coolant_on") coolantOn = true;
      if (line.type === "coolant_off") coolantOn = false;

      // Track operation cycles
      const opType = this.lineToOperationType(line);
      if (opType !== "unknown") {
        if (currentOperation && currentOperation.operation_type !== opType) {
          structure.operations.push(currentOperation);
        }

        if (!currentOperation || currentOperation.operation_type !== opType) {
          currentOperation = {
            block_id: `op-${structure.operations.length + 1}`,
            start_line: line.line_number,
            end_line: line.line_number,
            operation_type: opType,
            tool_number: currentTool,
            spindle_speed: line.parameters.S,
            spindle_mode: spindleMode,
            feed_rate: line.parameters.F,
            coolant: coolantOn,
            lines: [line],
            parameters: {},
          };
        } else {
          currentOperation.end_line = line.line_number;
          currentOperation.lines.push(line);
          if (line.parameters.S) currentOperation.spindle_speed = line.parameters.S;
          if (line.parameters.F) currentOperation.feed_rate = line.parameters.F;
        }
      }
    }

    // Push final operation
    if (currentOperation) {
      structure.operations.push(currentOperation);
    }

    // Calculate dialect confidence
    structure.dialect_confidence = Math.min(1, okumaFeatures / 5);
    if (structure.has_tool_life) structure.dialect_confidence = Math.max(structure.dialect_confidence, 0.8);

    return structure;
  }

  /**
   * Map line to operation type
   */
  private lineToOperationType(line: ParsedLine): OperationType {
    for (const g of line.g_codes) {
      if (OPERATION_MAP[g]) return OPERATION_MAP[g];
    }
    return "unknown";
  }

  /**
   * Extract operation contexts for training
   */
  extractOperationContexts(result: ParseResult): Array<{
    operation: OperationType;
    context_before: string[];
    operation_code: string[];
    context_after: string[];
    parameters: Record<string, number>;
  }> {
    const contexts: Array<{
      operation: OperationType;
      context_before: string[];
      operation_code: string[];
      context_after: string[];
      parameters: Record<string, number>;
    }> = [];

    for (const op of result.structure.operations) {
      const allLines = result.lines;
      const startIdx = op.start_line - 1;
      const endIdx = op.end_line;

      // Get context lines
      const contextBefore = allLines
        .slice(Math.max(0, startIdx - 5), startIdx)
        .map(l => l.raw);
      const operationCode = allLines
        .slice(startIdx, endIdx)
        .map(l => l.raw);
      const contextAfter = allLines
        .slice(endIdx, Math.min(allLines.length, endIdx + 5))
        .map(l => l.raw);

      // Collect parameters
      const params: Record<string, number> = {};
      for (const line of op.lines) {
        Object.assign(params, line.parameters);
      }

      contexts.push({
        operation: op.operation_type,
        context_before: contextBefore,
        operation_code: operationCode,
        context_after: contextAfter,
        parameters: params,
      });
    }

    return contexts;
  }

  /**
   * Check if program is valid Okuma OSP
   */
  isValidOkumaProgram(result: ParseResult): boolean {
    return (
      result.success &&
      result.structure.dialect_confidence >= 0.5 &&
      result.structure.operations.length > 0
    );
  }

  /**
   * Get program summary for training label
   */
  getProgramSummary(result: ParseResult): string {
    const s = result.structure;
    const parts = [
      `${s.total_lines} lines`,
      `${s.tool_changes} tool changes`,
      `${s.operations.length} operations`,
    ];

    if (s.has_css) parts.push("CSS mode");
    if (s.has_tool_life) parts.push("tool life mgmt");
    if (s.spindle_clamp) parts.push(`S${s.spindle_clamp} clamp`);

    const opTypes = [...new Set(s.operations.map(o => o.operation_type))];
    if (opTypes.length > 0) {
      parts.push(`ops: ${opTypes.join(", ")}`);
    }

    return parts.join(" | ");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAProgramParserEngine = new LatheLoRAProgramParserEngine();
