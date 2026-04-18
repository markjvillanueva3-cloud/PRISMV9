/**
 * LatheMasterPostUnifiedOutputEngine — Unified Output Format for Lathe Master Post
 *
 * U-LTH26: Unifies output format across all sub-posts. Every program carries a
 * standard header/footer/metadata block regardless of which sub-post generated it.
 * Uses PPModalStateTrackerEngine for consistency.
 *
 * Architecture:
 *   [Raw G-code] → [Header Injection] → [Metadata Block] → [Body Normalization]
 *     → [Footer Injection] → [Unified Program]
 *
 * Standard sections:
 *   1. Program number and name
 *   2. PRISM metadata block (date, machine, material, customer)
 *   3. Safe start block (consistent across all controllers)
 *   4. Tool list summary
 *   5. Body (dialect-specific G-code)
 *   6. Unified footer (coolant off, spindle stop, return home, M30)
 *
 * @module LatheMasterPostUnifiedOutputEngine
 */

import { ppModalStateTrackerEngine, type TrackerResult } from "./PPModalStateTrackerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Metadata for the unified output */
export interface UnifiedOutputMetadata {
  program_number: number;
  program_name: string;
  machine_id: string;
  machine_name: string;
  controller_family: string;
  controller_model: string;
  material?: string;
  customer?: string;
  part_number?: string;
  operation_type?: string;
  generated_at: string;
  generated_by: string;
  prism_version: string;
}

/** Tool entry for tool list summary */
export interface ToolEntry {
  tool_number: number;
  tool_position?: number;
  description?: string;
  insert_type?: string;
  holder?: string;
  offset_number?: number;
}

/** Input for unifying G-code output */
export interface UnifyOutputInput {
  raw_gcode: string;
  metadata: UnifiedOutputMetadata;
  tools: ToolEntry[];
  source_post: string;
  include_line_numbers?: boolean;
  line_number_start?: number;
  line_number_increment?: number;
}

/** Result of unified output */
export interface UnifiedOutputResult {
  gcode: string;
  line_count: number;
  header_lines: number;
  body_lines: number;
  footer_lines: number;
  metadata_block: string;
  tool_list_block: string;
  dialects_normalized: string[];
  warnings: string[];
}

/** Output format configuration */
interface OutputFormatConfig {
  header_comment_char: string;
  program_prefix: string;
  safe_start_codes: string[];
  coolant_off: string;
  spindle_stop: string;
  return_home: string;
  program_end: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostUnifiedOutputEngine {
  private static readonly PRISM_VERSION = "1.0.0";
  private static readonly GENERATOR_ID = "PRISM Master Post";

  /** Controller-specific format configurations */
  private formatConfigs: Record<string, OutputFormatConfig> = {
    okuma: {
      header_comment_char: "(",
      program_prefix: "O",
      safe_start_codes: ["G28 U0 W0", "G50 S3000", "G21 G40 G80 G99"],
      coolant_off: "M09",
      spindle_stop: "M05",
      return_home: "G28 U0 W0",
      program_end: "M30",
    },
    fanuc: {
      header_comment_char: "(",
      program_prefix: "O",
      safe_start_codes: ["G28 U0 W0", "G50 S3000", "G21 G40 G80 G99"],
      coolant_off: "M09",
      spindle_stop: "M05",
      return_home: "G28 U0 W0",
      program_end: "M30",
    },
    haas: {
      header_comment_char: "(",
      program_prefix: "O",
      safe_start_codes: ["G28 U0 W0", "G50 S4000", "G21 G40 G80 G99"],
      coolant_off: "M09",
      spindle_stop: "M05",
      return_home: "G28 U0 W0",
      program_end: "M30",
    },
    mazak: {
      header_comment_char: "(",
      program_prefix: "O",
      safe_start_codes: ["G28 U0 W0", "G50 S3500", "G21 G40 G80 G99"],
      coolant_off: "M09",
      spindle_stop: "M05",
      return_home: "G28 U0 W0",
      program_end: "M30",
    },
    siemens: {
      header_comment_char: ";",
      program_prefix: "",
      safe_start_codes: ["G0 G90 G40 G60", "LIMS=3000"],
      coolant_off: "M9",
      spindle_stop: "M5",
      return_home: "G0 X500 Z500",
      program_end: "M30",
    },
  };

  /**
   * Unify G-code output with standard header/footer/metadata
   */
  unify(input: UnifyOutputInput): UnifiedOutputResult {
    const warnings: string[] = [];
    const dialects_normalized: string[] = [];

    // Get format config for controller family
    const controllerFamily = input.metadata.controller_family.toLowerCase();
    const format = this.formatConfigs[controllerFamily] || this.formatConfigs.fanuc;

    // Build header
    const headerLines = this.buildHeader(input.metadata, format);

    // Build metadata block
    const metadataBlock = this.buildMetadataBlock(input.metadata, format);

    // Build tool list block
    const toolListBlock = this.buildToolListBlock(input.tools, format);

    // Build safe start block
    const safeStartBlock = this.buildSafeStartBlock(format);

    // Process body - extract and normalize
    const bodyResult = this.processBody(input.raw_gcode, format, controllerFamily);
    dialects_normalized.push(...bodyResult.normalizations);

    // Build footer
    const footerLines = this.buildFooter(format);

    // Combine all sections
    const allLines = [
      ...headerLines,
      "",
      ...metadataBlock.split("\n"),
      "",
      ...toolListBlock.split("\n"),
      "",
      ...safeStartBlock,
      "",
      ...bodyResult.lines,
      "",
      ...footerLines,
    ];

    // Add line numbers if requested
    const finalLines = input.include_line_numbers
      ? this.addLineNumbers(allLines, input.line_number_start ?? 10, input.line_number_increment ?? 10)
      : allLines;

    const gcode = finalLines.join("\n");

    return {
      gcode,
      line_count: finalLines.length,
      header_lines: headerLines.length + 1,
      body_lines: bodyResult.lines.length,
      footer_lines: footerLines.length,
      metadata_block: metadataBlock,
      tool_list_block: toolListBlock,
      dialects_normalized,
      warnings,
    };
  }

  /**
   * Compare outputs from two sub-posts and identify dialect differences
   */
  compareOutputs(output1: string, output2: string): {
    identical: boolean;
    dialect_differences: Array<{
      line_number: number;
      output1_line: string;
      output2_line: string;
      difference_type: "code" | "format" | "comment" | "order";
    }>;
    legitimate_differences: number;
    concerning_differences: number;
  } {
    const lines1 = output1.split("\n");
    const lines2 = output2.split("\n");
    const differences: Array<{
      line_number: number;
      output1_line: string;
      output2_line: string;
      difference_type: "code" | "format" | "comment" | "order";
    }> = [];

    const maxLines = Math.max(lines1.length, lines2.length);
    let legitimateCount = 0;
    let concerningCount = 0;

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || "";
      const line2 = lines2[i] || "";

      if (this.normalizeLine(line1) !== this.normalizeLine(line2)) {
        const diffType = this.classifyDifference(line1, line2);
        differences.push({
          line_number: i + 1,
          output1_line: line1,
          output2_line: line2,
          difference_type: diffType,
        });

        if (diffType === "comment" || diffType === "format") {
          legitimateCount++;
        } else {
          concerningCount++;
        }
      }
    }

    return {
      identical: differences.length === 0,
      dialect_differences: differences,
      legitimate_differences: legitimateCount,
      concerning_differences: concerningCount,
    };
  }

  /**
   * Extract modal state from G-code using PPModalStateTrackerEngine
   */
  extractModalState(gcode: string): TrackerResult {
    return ppModalStateTrackerEngine.track(gcode);
  }

  /**
   * Validate that output conforms to unified format
   */
  validateUnifiedFormat(gcode: string): {
    valid: boolean;
    has_prism_header: boolean;
    has_metadata_block: boolean;
    has_tool_list: boolean;
    has_safe_start: boolean;
    has_proper_footer: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const lines = gcode.split("\n");

    // Check PRISM header
    const has_prism_header = lines.some(l =>
      l.includes("PRISM") || l.includes("GENERATED BY")
    );
    if (!has_prism_header) {
      issues.push("Missing PRISM generator header");
    }

    // Check metadata block
    const has_metadata_block = lines.some(l =>
      l.includes("MACHINE:") || l.includes("MATERIAL:")
    );
    if (!has_metadata_block) {
      issues.push("Missing metadata block");
    }

    // Check tool list
    const has_tool_list = lines.some(l =>
      l.includes("TOOL LIST") || l.includes("T0")
    );
    if (!has_tool_list) {
      issues.push("Missing tool list section");
    }

    // Check safe start
    const has_safe_start = lines.some(l =>
      l.includes("G28") || l.includes("G40") || l.includes("G80")
    );
    if (!has_safe_start) {
      issues.push("Missing safe start block");
    }

    // Check footer
    const lastLines = lines.slice(-10).join("\n");
    const has_proper_footer = lastLines.includes("M30") || lastLines.includes("M02");
    if (!has_proper_footer) {
      issues.push("Missing proper program end (M30/M02)");
    }

    return {
      valid: issues.length === 0,
      has_prism_header,
      has_metadata_block,
      has_tool_list,
      has_safe_start,
      has_proper_footer,
      issues,
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private buildHeader(metadata: UnifiedOutputMetadata, format: OutputFormatConfig): string[] {
    const c = format.header_comment_char;
    const ce = c === "(" ? ")" : "";

    return [
      `${format.program_prefix}${String(metadata.program_number).padStart(4, "0")}`,
      `${c}${metadata.program_name}${ce}`,
      `${c}GENERATED BY ${metadata.generated_by}${ce}`,
      `${c}DATE: ${metadata.generated_at}${ce}`,
      `${c}PRISM VERSION: ${metadata.prism_version}${ce}`,
    ];
  }

  private buildMetadataBlock(metadata: UnifiedOutputMetadata, format: OutputFormatConfig): string {
    const c = format.header_comment_char;
    const ce = c === "(" ? ")" : "";

    const lines = [
      `${c}═══════════════════════════════════════${ce}`,
      `${c}         PRISM METADATA BLOCK          ${ce}`,
      `${c}═══════════════════════════════════════${ce}`,
      `${c}MACHINE: ${metadata.machine_name} (${metadata.machine_id})${ce}`,
      `${c}CONTROLLER: ${metadata.controller_model}${ce}`,
    ];

    if (metadata.material) {
      lines.push(`${c}MATERIAL: ${metadata.material}${ce}`);
    }
    if (metadata.customer) {
      lines.push(`${c}CUSTOMER: ${metadata.customer}${ce}`);
    }
    if (metadata.part_number) {
      lines.push(`${c}PART: ${metadata.part_number}${ce}`);
    }
    if (metadata.operation_type) {
      lines.push(`${c}OPERATION: ${metadata.operation_type}${ce}`);
    }

    lines.push(`${c}═══════════════════════════════════════${ce}`);

    return lines.join("\n");
  }

  private buildToolListBlock(tools: ToolEntry[], format: OutputFormatConfig): string {
    const c = format.header_comment_char;
    const ce = c === "(" ? ")" : "";

    if (tools.length === 0) {
      return `${c}TOOL LIST: (none specified)${ce}`;
    }

    const lines = [
      `${c}───────────────────────────────────────${ce}`,
      `${c}            TOOL LIST                  ${ce}`,
      `${c}───────────────────────────────────────${ce}`,
    ];

    for (const tool of tools) {
      const desc = tool.description || `TOOL ${tool.tool_number}`;
      const insert = tool.insert_type ? ` - ${tool.insert_type}` : "";
      lines.push(`${c}T${String(tool.tool_number).padStart(2, "0")} - ${desc}${insert}${ce}`);
    }

    lines.push(`${c}───────────────────────────────────────${ce}`);

    return lines.join("\n");
  }

  private buildSafeStartBlock(format: OutputFormatConfig): string[] {
    const c = format.header_comment_char;
    const ce = c === "(" ? ")" : "";

    return [
      `${c}SAFE START${ce}`,
      ...format.safe_start_codes,
    ];
  }

  private buildFooter(format: OutputFormatConfig): string[] {
    const c = format.header_comment_char;
    const ce = c === "(" ? ")" : "";

    return [
      `${c}PROGRAM END${ce}`,
      format.coolant_off,
      format.spindle_stop,
      format.return_home,
      format.program_end,
      "%",
    ];
  }

  private processBody(
    rawGcode: string,
    format: OutputFormatConfig,
    controllerFamily: string
  ): { lines: string[]; normalizations: string[] } {
    const normalizations: string[] = [];
    const lines = rawGcode.split("\n");

    // Filter out duplicate headers/footers that might exist in raw G-code
    const bodyLines = lines.filter(line => {
      const trimmed = line.trim();

      // Skip if it's a program number line (we'll add our own)
      if (trimmed.match(/^O\d{4}$/)) return false;

      // Skip if it's a percent sign at start/end
      if (trimmed === "%") return false;

      // Skip duplicate M30
      if (trimmed === "M30") return false;

      return true;
    });

    // Normalize specific codes based on controller
    const normalizedLines = bodyLines.map(line => {
      let normalized = line;

      // Normalize coolant codes
      if (line.includes("M08") || line.includes("M8")) {
        normalized = line.replace(/M0?8/, "M08");
        if (line !== normalized) normalizations.push("coolant_code");
      }

      // Normalize spindle codes
      if (line.includes("M03") || line.includes("M3")) {
        normalized = line.replace(/M0?3/, "M03");
        if (line !== normalized) normalizations.push("spindle_code");
      }

      return normalized;
    });

    return {
      lines: normalizedLines,
      normalizations: Array.from(new Set(normalizations)),
    };
  }

  private addLineNumbers(lines: string[], start: number, increment: number): string[] {
    let lineNum = start;
    return lines.map(line => {
      const trimmed = line.trim();

      // Don't add line numbers to comments or empty lines
      if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed === "%") {
        return line;
      }

      const numbered = `N${lineNum} ${line}`;
      lineNum += increment;
      return numbered;
    });
  }

  private normalizeLine(line: string): string {
    return line
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\(.*?\)/g, "")
      .replace(/;.*/g, "")
      .toUpperCase();
  }

  private classifyDifference(
    line1: string,
    line2: string
  ): "code" | "format" | "comment" | "order" {
    const norm1 = this.normalizeLine(line1);
    const norm2 = this.normalizeLine(line2);

    // If normalized versions are equal, difference is in comments or formatting
    if (norm1 === norm2) {
      if (line1.includes("(") || line2.includes("(") || line1.includes(";") || line2.includes(";")) {
        return "comment";
      }
      return "format";
    }

    // Check if lines are just reordered
    const codes1 = norm1.match(/[A-Z][-\d.]+/g) || [];
    const codes2 = norm2.match(/[A-Z][-\d.]+/g) || [];
    if (codes1.sort().join(",") === codes2.sort().join(",")) {
      return "order";
    }

    return "code";
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostUnifiedOutputEngine = new LatheMasterPostUnifiedOutputEngine();
