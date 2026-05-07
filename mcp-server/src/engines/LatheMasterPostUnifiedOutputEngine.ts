/**
 * LatheMasterPostUnifiedOutputEngine — LATHE-MASTER U-LTH26
 *
 * Unifies output format across all lathe sub-posts. Every program carries
 * a standard header/footer/metadata block regardless of controller dialect.
 * Uses modal state tracking for consistency.
 *
 * Exit Gate: Output diff between any 2 sub-posts on same operation shows
 * only legitimate dialect differences (G-code syntax, not structural format).
 *
 * @module LatheMasterPostUnifiedOutputEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH26
 */

import { z } from "zod";

// ── Types ───────────────────────────────────────────────────────────────────

export type ControllerDialect = "okuma" | "fanuc" | "mitsubishi" | "haas" | "mazak" | "citizen" | "generic";

export interface UnifiedProgramMetadata {
  programNumber: string;
  programName: string;
  machineName: string;
  controller: string;
  dialect: ControllerDialect;
  generatedAt: string;
  generator: string;
  version: string;
  partNumber?: string;
  revision?: string;
  material?: string;
  operation?: string;
  setupNotes?: string[];
  toolList?: ToolEntry[];
  estimatedCycleTime?: number;
  checksumType?: "crc32" | "md5" | "none";
  checksum?: string;
}

export interface ToolEntry {
  toolNumber: number;
  toolType: string;
  description: string;
  compensation?: number;
}

export interface ModalState {
  motionMode: "G00" | "G01" | "G02" | "G03" | null;
  planeSelect: "G17" | "G18" | "G19" | null;
  absoluteIncremental: "G90" | "G91" | null;
  feedMode: "G94" | "G95" | null;
  speedMode: "G96" | "G97" | null;
  unitsMode: "G20" | "G21" | null;
  workOffset: string | null;
  spindleState: "M03" | "M04" | "M05" | null;
  coolantState: "M08" | "M09" | null;
  activeTool: number | null;
  feedRate: number | null;
  spindleSpeed: number | null;
}

export interface UnifiedHeaderConfig {
  dialect: ControllerDialect;
  metadata: UnifiedProgramMetadata;
  includeToolList?: boolean;
  includeSetupNotes?: boolean;
  includeChecksum?: boolean;
  commentStyle?: "parentheses" | "semicolon";
  lineNumberStart?: number;
  lineNumberIncrement?: number;
}

export interface UnifiedFooterConfig {
  dialect: ControllerDialect;
  includeStatistics?: boolean;
  includeReturnToHome?: boolean;
  homePosition?: { x: number; z: number };
  programEndCode?: "M30" | "M02" | "M99";
  commentStyle?: "parentheses" | "semicolon";
}

export interface UnifiedOutputResult {
  header: string[];
  footer: string[];
  safeStartBlock: string[];
  modalResetBlock: string[];
  metadata: UnifiedProgramMetadata;
  dialectDifferences: DialectDifference[];
}

export interface DialectDifference {
  feature: string;
  generic: string;
  dialectSpecific: string;
  reason: string;
}

export interface ProgramComparisonResult {
  identical: boolean;
  dialectDifferencesOnly: boolean;
  structuralDifferences: string[];
  dialectDifferences: DialectDifference[];
  headerMatch: boolean;
  footerMatch: boolean;
  metadataMatch: boolean;
}

// ── Dialect-Specific Mappings ───────────────────────────────────────────────

const DIALECT_COMMENT_STYLE: Record<ControllerDialect, "parentheses" | "semicolon"> = {
  okuma: "parentheses",
  fanuc: "parentheses",
  mitsubishi: "parentheses",
  haas: "parentheses",
  mazak: "parentheses",
  citizen: "parentheses",
  generic: "parentheses",
};

const DIALECT_PROGRAM_FORMAT: Record<ControllerDialect, (num: string) => string> = {
  okuma: (num) => `O${num.padStart(4, "0")}`,
  fanuc: (num) => `O${num.padStart(4, "0")}`,
  mitsubishi: (num) => `O${num.padStart(4, "0")}`,
  haas: (num) => `O${num.padStart(5, "0")}`,
  mazak: (num) => `O${num.padStart(4, "0")}`,
  citizen: (num) => `O${num.padStart(4, "0")}`,
  generic: (num) => `O${num.padStart(4, "0")}`,
};

const DIALECT_HOME_CODE: Record<ControllerDialect, string> = {
  okuma: "G28 U0 W0",
  fanuc: "G28 U0 W0",
  mitsubishi: "G28 U0 W0",
  haas: "G28 G91 Z0",
  mazak: "G28 U0 W0",
  citizen: "G28 U0 W0",
  generic: "G28 U0 W0",
};

const DIALECT_SAFE_START: Record<ControllerDialect, string[]> = {
  okuma: ["G40 G80 G99", "G21", "G18", "G97 S100 M05"],
  fanuc: ["G40 G80", "G21 G18", "G97 S100 M05", "G54"],
  mitsubishi: ["G40 G80", "G21", "G18", "G97 S100 M05"],
  haas: ["G40 G80 G99", "G21 G18", "T0000"],
  mazak: ["G40 G80", "G21 G18", "G97 S100 M05"],
  citizen: ["G40 G80", "G21 G18", "G97 S100 M05"],
  generic: ["G40 G80", "G21 G18", "G97 S100 M05"],
};

// ── Zod Schemas ─────────────────────────────────────────────────────────────

export const UnifiedProgramMetadataSchema = z.object({
  programNumber: z.string().min(1),
  programName: z.string().min(1),
  machineName: z.string().min(1),
  controller: z.string().min(1),
  dialect: z.enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"]),
  generatedAt: z.string(),
  generator: z.string(),
  version: z.string(),
  partNumber: z.string().optional(),
  revision: z.string().optional(),
  material: z.string().optional(),
  operation: z.string().optional(),
  setupNotes: z.array(z.string()).optional(),
  toolList: z.array(z.object({
    toolNumber: z.number(),
    toolType: z.string(),
    description: z.string(),
    compensation: z.number().optional(),
  })).optional(),
  estimatedCycleTime: z.number().optional(),
  checksumType: z.enum(["crc32", "md5", "none"]).optional(),
  checksum: z.string().optional(),
});

export const UnifiedHeaderConfigSchema = z.object({
  dialect: z.enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"]),
  metadata: UnifiedProgramMetadataSchema,
  includeToolList: z.boolean().optional(),
  includeSetupNotes: z.boolean().optional(),
  includeChecksum: z.boolean().optional(),
  commentStyle: z.enum(["parentheses", "semicolon"]).optional(),
  lineNumberStart: z.number().optional(),
  lineNumberIncrement: z.number().optional(),
});

export const UnifiedFooterConfigSchema = z.object({
  dialect: z.enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"]),
  includeStatistics: z.boolean().optional(),
  includeReturnToHome: z.boolean().optional(),
  homePosition: z.object({ x: z.number(), z: z.number() }).optional(),
  programEndCode: z.enum(["M30", "M02", "M99"]).optional(),
  commentStyle: z.enum(["parentheses", "semicolon"]).optional(),
});

// ── Engine Class ────────────────────────────────────────────────────────────

class LatheMasterPostUnifiedOutputEngine {
  private static readonly GENERATOR_NAME = "PRISM-LATHE-MASTER-POST";
  private static readonly VERSION = "1.0.0";

  /**
   * Generate unified header block for any dialect
   * @param config - Header configuration with dialect and metadata
   * @returns Array of G-code header lines
   */
  static generateHeader(config: UnifiedHeaderConfig): string[] {
    const parsed = UnifiedHeaderConfigSchema.parse(config);
    const { dialect, metadata, includeToolList, includeSetupNotes } = parsed;
    const commentStyle = parsed.commentStyle ?? DIALECT_COMMENT_STYLE[dialect];
    const comment = (text: string) =>
      commentStyle === "semicolon" ? `; ${text}` : `(${text})`;

    const header: string[] = [];

    // Program number line (dialect-specific format)
    const programLine = DIALECT_PROGRAM_FORMAT[dialect](metadata.programNumber);
    header.push(`${programLine} ${comment(metadata.programName)}`);

    // Standard metadata block (unified across all dialects)
    header.push(comment(`MACHINE: ${metadata.machineName}`));
    header.push(comment(`CONTROLLER: ${metadata.controller}`));
    header.push(comment(`GENERATED: ${metadata.generatedAt}`));
    header.push(comment(`GENERATOR: ${metadata.generator} v${metadata.version}`));

    if (metadata.partNumber) {
      header.push(comment(`PART: ${metadata.partNumber}${metadata.revision ? ` REV ${metadata.revision}` : ""}`));
    }

    if (metadata.material) {
      header.push(comment(`MATERIAL: ${metadata.material}`));
    }

    if (metadata.operation) {
      header.push(comment(`OPERATION: ${metadata.operation}`));
    }

    // Tool list (optional)
    if (includeToolList && metadata.toolList && metadata.toolList.length > 0) {
      header.push(comment("--- TOOL LIST ---"));
      for (const tool of metadata.toolList) {
        const compStr = tool.compensation !== undefined ? ` D${tool.compensation}` : "";
        header.push(comment(`T${String(tool.toolNumber).padStart(2, "0")}${compStr} - ${tool.toolType}: ${tool.description}`));
      }
      header.push(comment("-----------------"));
    }

    // Setup notes (optional)
    if (includeSetupNotes && metadata.setupNotes && metadata.setupNotes.length > 0) {
      header.push(comment("--- SETUP NOTES ---"));
      for (const note of metadata.setupNotes) {
        header.push(comment(note));
      }
      header.push(comment("-------------------"));
    }

    // Estimated cycle time
    if (metadata.estimatedCycleTime !== undefined) {
      const mins = Math.floor(metadata.estimatedCycleTime / 60);
      const secs = Math.round(metadata.estimatedCycleTime % 60);
      header.push(comment(`EST CYCLE: ${mins}m ${secs}s`));
    }

    // Checksum
    if (metadata.checksum && metadata.checksumType && metadata.checksumType !== "none") {
      header.push(comment(`CHECKSUM (${metadata.checksumType.toUpperCase()}): ${metadata.checksum}`));
    }

    header.push(""); // Blank line after header

    return header;
  }

  /**
   * Generate safe start block for a dialect
   * @param dialect - Controller dialect
   * @returns Array of safe start G-code lines
   */
  static generateSafeStartBlock(dialect: ControllerDialect): string[] {
    const safeStart = DIALECT_SAFE_START[dialect] ?? DIALECT_SAFE_START.generic;
    return [
      "(SAFE START)",
      ...safeStart,
      "",
    ];
  }

  /**
   * Generate modal reset block to known state
   * @param dialect - Controller dialect
   * @returns Array of modal reset G-code lines
   */
  static generateModalResetBlock(dialect: ControllerDialect): string[] {
    const reset: string[] = [
      "(MODAL RESET)",
      "G40", // Cancel cutter comp
      "G80", // Cancel canned cycles
    ];

    // Dialect-specific resets
    if (dialect === "okuma") {
      reset.push("G99"); // Return per revolution
    }

    reset.push("G21"); // Metric
    reset.push("G18"); // ZX plane for lathe
    reset.push("G97 S0"); // Cancel CSS, zero speed
    reset.push("M05"); // Spindle stop
    reset.push("M09"); // Coolant off
    reset.push("");

    return reset;
  }

  /**
   * Generate unified footer block for any dialect
   * @param config - Footer configuration with dialect and options
   * @returns Array of G-code footer lines
   */
  static generateFooter(config: UnifiedFooterConfig): string[] {
    const parsed = UnifiedFooterConfigSchema.parse(config);
    const { dialect, includeStatistics, includeReturnToHome, programEndCode } = parsed;
    const commentStyle = parsed.commentStyle ?? DIALECT_COMMENT_STYLE[dialect];
    const comment = (text: string) =>
      commentStyle === "semicolon" ? `; ${text}` : `(${text})`;

    const footer: string[] = [];

    footer.push(""); // Blank line before footer
    footer.push(comment("END OF PROGRAM"));

    // Coolant and spindle off
    footer.push("M05 " + comment("SPINDLE STOP"));
    footer.push("M09 " + comment("COOLANT OFF"));

    // Return to home (dialect-specific)
    if (includeReturnToHome !== false) {
      const homeCode = DIALECT_HOME_CODE[dialect] ?? DIALECT_HOME_CODE.generic;
      footer.push(`${homeCode} ${comment("HOME")}`);
    }

    // Program end code
    const endCode = programEndCode ?? "M30";
    footer.push(`${endCode} ${comment("PROGRAM END")}`);

    // Optional statistics comment
    if (includeStatistics) {
      footer.push(comment(`GENERATED BY ${this.GENERATOR_NAME} v${this.VERSION}`));
    }

    return footer;
  }

  /**
   * Generate complete unified output structure
   * @param config - Combined header and footer configuration
   * @returns Complete unified output with header, footer, safe start, and modal reset blocks
   */
  static generateUnifiedOutput(config: UnifiedHeaderConfig & { footerConfig?: Partial<UnifiedFooterConfig> }): UnifiedOutputResult {
    const { dialect, metadata, footerConfig } = config;

    const header = LatheMasterPostUnifiedOutputEngine.generateHeader(config);
    const safeStartBlock = LatheMasterPostUnifiedOutputEngine.generateSafeStartBlock(dialect);
    const modalResetBlock = LatheMasterPostUnifiedOutputEngine.generateModalResetBlock(dialect);
    const footer = LatheMasterPostUnifiedOutputEngine.generateFooter({
      dialect,
      ...footerConfig,
    });

    // Document dialect differences
    const dialectDifferences = LatheMasterPostUnifiedOutputEngine.getDialectDifferences(dialect);

    return {
      header,
      footer,
      safeStartBlock,
      modalResetBlock,
      metadata,
      dialectDifferences,
    };
  }

  /**
   * Get documented dialect differences from generic format
   * @param dialect - Controller dialect to check
   * @returns Array of documented dialect differences
   */
  static getDialectDifferences(dialect: ControllerDialect): DialectDifference[] {
    const differences: DialectDifference[] = [];

    if (dialect === "haas") {
      differences.push({
        feature: "programNumber",
        generic: "O0001 (4 digits)",
        dialectSpecific: "O00001 (5 digits)",
        reason: "Haas uses 5-digit program numbers",
      });
      differences.push({
        feature: "homeCode",
        generic: "G28 U0 W0",
        dialectSpecific: "G28 G91 Z0",
        reason: "Haas mill-style homing even on lathe",
      });
    }

    if (dialect === "okuma") {
      differences.push({
        feature: "safeStart",
        generic: "G40 G80",
        dialectSpecific: "G40 G80 G99",
        reason: "Okuma includes G99 (return per revolution) in safe start",
      });
    }

    if (dialect === "citizen") {
      differences.push({
        feature: "axisNaming",
        generic: "X, Z",
        dialectSpecific: "X1/X2, Z1/Z2",
        reason: "Citizen Swiss uses dual-axis naming for main/sub spindle",
      });
    }

    return differences;
  }

  /**
   * Compare two program outputs to verify only dialect differences exist
   * @param programA - First program with header, body, footer, and dialect
   * @param programB - Second program with header, body, footer, and dialect
   * @returns Comparison result indicating structural vs dialect differences
   */
  static compareOutputs(
    programA: { header: string[]; body: string[]; footer: string[]; dialect: ControllerDialect },
    programB: { header: string[]; body: string[]; footer: string[]; dialect: ControllerDialect }
  ): ProgramComparisonResult {
    const structuralDifferences: string[] = [];
    const dialectDifferences: DialectDifference[] = [];

    // Normalize for comparison (strip comments, normalize whitespace)
    const normalize = (lines: string[]): string[] =>
      lines
        .map(l => l.replace(/\([^)]*\)/g, "").replace(/;.*/g, "").trim())
        .filter(l => l.length > 0);

    const normalizedHeaderA = normalize(programA.header);
    const normalizedHeaderB = normalize(programB.header);
    const normalizedFooterA = normalize(programA.footer);
    const normalizedFooterB = normalize(programB.footer);
    const normalizedBodyA = normalize(programA.body);
    const normalizedBodyB = normalize(programB.body);

    // Check header structure (program number format may differ)
    const headerMatch = LatheMasterPostUnifiedOutputEngine.structuralMatch(normalizedHeaderA, normalizedHeaderB);
    if (!headerMatch) {
      structuralDifferences.push("Header structure differs");
    }

    // Check footer structure
    const footerMatch = LatheMasterPostUnifiedOutputEngine.structuralMatch(normalizedFooterA, normalizedFooterB);
    if (!footerMatch) {
      structuralDifferences.push("Footer structure differs");
    }

    // Check body structure
    const bodyMatch = normalizedBodyA.length === normalizedBodyB.length;
    if (!bodyMatch) {
      structuralDifferences.push(`Body line count differs: ${normalizedBodyA.length} vs ${normalizedBodyB.length}`);
    }

    // Collect dialect differences
    if (programA.dialect !== programB.dialect) {
      dialectDifferences.push(...LatheMasterPostUnifiedOutputEngine.getDialectDifferences(programA.dialect));
      dialectDifferences.push(...LatheMasterPostUnifiedOutputEngine.getDialectDifferences(programB.dialect));
    }

    const identical = structuralDifferences.length === 0 && normalizedBodyA.join("\n") === normalizedBodyB.join("\n");
    const dialectDifferencesOnly = structuralDifferences.length === 0 && dialectDifferences.length > 0;

    return {
      identical,
      dialectDifferencesOnly,
      structuralDifferences,
      dialectDifferences,
      headerMatch,
      footerMatch,
      metadataMatch: headerMatch, // Metadata is in header
    };
  }

  /**
   * Check if two normalized line arrays match structurally
   * @param linesA - First array of normalized lines
   * @param linesB - Second array of normalized lines
   * @returns True if arrays match structurally
   */
  private static structuralMatch(linesA: string[], linesB: string[]): boolean {
    if (linesA.length !== linesB.length) return false;

    for (let i = 0; i < linesA.length; i++) {
      // Allow program number format differences (O0001 vs O00001)
      const pnumPattern = /^O\d+$/;
      if (pnumPattern.test(linesA[i]) && pnumPattern.test(linesB[i])) {
        continue;
      }

      // Allow home code differences
      if (linesA[i].startsWith("G28") && linesB[i].startsWith("G28")) {
        continue;
      }

      if (linesA[i] !== linesB[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create default metadata for a program
   * @param partial - Partial metadata with required fields
   * @returns Complete program metadata with defaults applied
   */
  static createDefaultMetadata(partial: Partial<UnifiedProgramMetadata> & { programNumber: string; machineName: string; controller: string; dialect: ControllerDialect }): UnifiedProgramMetadata {
    return {
      programNumber: partial.programNumber,
      programName: partial.programName ?? `PRISM-${partial.programNumber}`,
      machineName: partial.machineName,
      controller: partial.controller,
      dialect: partial.dialect,
      generatedAt: partial.generatedAt ?? new Date().toISOString(),
      generator: partial.generator ?? LatheMasterPostUnifiedOutputEngine.GENERATOR_NAME,
      version: partial.version ?? LatheMasterPostUnifiedOutputEngine.VERSION,
      partNumber: partial.partNumber,
      revision: partial.revision,
      material: partial.material,
      operation: partial.operation,
      setupNotes: partial.setupNotes,
      toolList: partial.toolList,
      estimatedCycleTime: partial.estimatedCycleTime,
      checksumType: partial.checksumType,
      checksum: partial.checksum,
    };
  }

  /**
   * Initialize modal state to machine defaults
   * @returns Initial modal state with lathe defaults
   */
  static initializeModalState(): ModalState {
    return {
      motionMode: null,
      planeSelect: "G18", // ZX for lathe
      absoluteIncremental: "G90",
      feedMode: "G95", // Per-rev for lathe
      speedMode: "G97", // RPM
      unitsMode: "G21", // Metric
      workOffset: "G54",
      spindleState: "M05",
      coolantState: "M09",
      activeTool: null,
      feedRate: null,
      spindleSpeed: null,
    };
  }

  /**
   * Update modal state from a G-code line
   * @param state - Current modal state
   * @param line - G-code line to parse
   * @returns Updated modal state
   */
  static updateModalState(state: ModalState, line: string): ModalState {
    const updated = { ...state };

    // Motion modes (modal group 1)
    if (line.includes("G00")) updated.motionMode = "G00";
    else if (line.includes("G01")) updated.motionMode = "G01";
    else if (line.includes("G02")) updated.motionMode = "G02";
    else if (line.includes("G03")) updated.motionMode = "G03";

    // Plane select (modal group 2)
    if (line.includes("G17")) updated.planeSelect = "G17";
    else if (line.includes("G18")) updated.planeSelect = "G18";
    else if (line.includes("G19")) updated.planeSelect = "G19";

    // Absolute/Incremental (modal group 3)
    if (line.includes("G90")) updated.absoluteIncremental = "G90";
    else if (line.includes("G91")) updated.absoluteIncremental = "G91";

    // Feed mode (modal group 5)
    if (line.includes("G94")) updated.feedMode = "G94";
    else if (line.includes("G95")) updated.feedMode = "G95";

    // Speed mode (modal group 13)
    if (line.includes("G96")) updated.speedMode = "G96";
    else if (line.includes("G97")) updated.speedMode = "G97";

    // Units (modal group 6)
    if (line.includes("G20")) updated.unitsMode = "G20";
    else if (line.includes("G21")) updated.unitsMode = "G21";

    // Work offset (modal group 12)
    const workOffsetMatch = line.match(/G5[4-9]/);
    if (workOffsetMatch) updated.workOffset = workOffsetMatch[0];

    // Spindle
    if (line.includes("M03")) updated.spindleState = "M03";
    else if (line.includes("M04")) updated.spindleState = "M04";
    else if (line.includes("M05")) updated.spindleState = "M05";

    // Coolant
    if (line.includes("M08")) updated.coolantState = "M08";
    else if (line.includes("M09")) updated.coolantState = "M09";

    // Tool
    const toolMatch = line.match(/T(\d+)/);
    if (toolMatch) updated.activeTool = parseInt(toolMatch[1], 10);

    // Feed rate
    const feedMatch = line.match(/F([\d.]+)/);
    if (feedMatch) updated.feedRate = parseFloat(feedMatch[1]);

    // Spindle speed
    const speedMatch = line.match(/S(\d+)/);
    if (speedMatch) updated.spindleSpeed = parseInt(speedMatch[1], 10);

    return updated;
  }

  /**
   * Get all supported dialects
   * @returns Array of supported controller dialects
   */
  static getSupportedDialects(): ControllerDialect[] {
    return ["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"];
  }

  /**
   * Get dialect comment style
   * @param dialect - Controller dialect
   * @returns Comment style for the dialect
   */
  static getCommentStyle(dialect: ControllerDialect): "parentheses" | "semicolon" {
    return DIALECT_COMMENT_STYLE[dialect];
  }

  /**
   * Format a comment for a specific dialect
   * @param dialect - Controller dialect
   * @param text - Comment text
   * @returns Formatted comment string
   */
  static formatComment(dialect: ControllerDialect, text: string): string {
    const style = LatheMasterPostUnifiedOutputEngine.getCommentStyle(dialect);
    return style === "semicolon" ? `; ${text}` : `(${text})`;
  }
}

// ── Export ──────────────────────────────────────────────────────────────────

export { LatheMasterPostUnifiedOutputEngine };
