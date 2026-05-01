/**
 * PRISM Manufacturing Intelligence - Setup Sheet From G-Code Engine
 * Reverse-engineers complete setup documentation from raw G-code programs.
 *
 * Novel capability — competitors require manual setup sheet creation.
 * This engine parses G-code to extract tool lists, work offsets, operation
 * sequences, cycle times, and generates professional Markdown documentation.
 *
 * Actions: setup_from_gcode, tool_list_from_gcode, operation_sequence,
 *          setup_export_markdown
 *
 * @version 1.0.0
 * @module SetupSheetFromGCodeEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Controller type for G-code dialect differences. */
export type ControllerType =
  | "fanuc"
  | "siemens"
  | "haas"
  | "mazak"
  | "okuma"
  | "heidenhain"
  | "generic";

/** Configuration for setup sheet generation. */
export interface SetupSheetConfig {
  /** CNC controller type (affects G-code parsing dialect) */
  controller: ControllerType;
  /** Part number for documentation header */
  part_number?: string;
  /** Operation/program name */
  operation_name?: string;
  /** Machine name for header */
  machine_name?: string;
  /** Whether to include full tool list */
  include_tool_list: boolean;
  /** Whether to include work offset details */
  include_offsets: boolean;
  /** Whether to include safety notes */
  include_safety: boolean;
  /** Operator name for sign-off */
  operator?: string;
}

/** Extracted tool information from G-code. */
export interface ExtractedTool {
  /** Tool number (T-word) */
  number: number;
  /** Tool offset / length comp number (H-word) */
  offset_h: number;
  /** Diameter compensation number (D-word), if any */
  offset_d: number;
  /** Best-guess tool description from G-code patterns */
  description_guess: string;
  /** RPM values used with this tool */
  rpm_values: number[];
  /** Feed rates used with this tool (mm/min) */
  feed_values: number[];
  /** Estimated operation type */
  operation_type: string;
  /** First line where tool is called */
  first_use_line: number;
  /** Last line where tool is used (before next tool change or M30) */
  last_use_line: number;
  /** Estimated tool diameter from RPM + typical SFM */
  estimated_diameter_mm: number | null;
  /** Z-depths reached with this tool */
  z_depths: number[];
  /** Coolant type used */
  coolant: "flood" | "mist" | "off" | "through_spindle";
}

/** Extracted operation from G-code. */
export interface ExtractedOperation {
  /** Tool number for this operation */
  tool: number;
  /** Guessed operation type */
  type_guess: string;
  /** Starting line number */
  start_line: number;
  /** Ending line number */
  end_line: number;
  /** Z-depth values reached */
  z_depths: number[];
  /** Feed rate range [min, max] mm/min */
  feed_range: [number, number];
  /** Spindle RPM used */
  rpm: number;
  /** Estimated cutting time in seconds */
  est_time_s: number;
  /** Coolant mode */
  coolant: string;
}

/** Work offset entry. */
export interface WorkOffset {
  /** Offset code (G54, G55, etc.) */
  code: string;
  /** Line where first used */
  first_use_line: number;
  /** Number of times referenced */
  use_count: number;
}

/** Complete setup sheet data structure. */
export interface SetupSheet {
  /** Program number (if detected) */
  program_number: string;
  /** Part number from config */
  part_number: string;
  /** Operation name */
  operation_name: string;
  /** Extracted tool list */
  tools: ExtractedTool[];
  /** Work offsets used */
  work_offsets: WorkOffset[];
  /** Whether coolant is required */
  coolant_required: boolean;
  /** Estimated total cycle time in seconds */
  cycle_time_est_s: number;
  /** Workpiece extents (bounding box from programmed moves) */
  extents: {
    x_min: number; x_max: number;
    y_min: number; y_max: number;
    z_min: number; z_max: number;
  };
  /** Safety notes extracted from program comments or generated */
  safety_notes: string[];
  /** Operations in sequence */
  operations: ExtractedOperation[];
  /** Controller type */
  controller: ControllerType;
}

/** Playbook-sourced advice for setup sheets. */
export interface PlaybookSetupAdvice {
  /** Workholding suggestions from playbook rules */
  workholding: string[];
  /** Datum strategy recommendation */
  datum_strategy: string;
  /** Setup warnings and anti-patterns to avoid */
  setup_warnings: string[];
}

/** Setup sheet generation result. */
export interface SetupSheetResult {
  /** Structured setup sheet data */
  setup_sheet: SetupSheet;
  /** Formatted Markdown output */
  markdown: string;
  /** Playbook advice for workholding, datum, and setup (if available) */
  playbook_advice?: PlaybookSetupAdvice;
}

/** Tool list result. */
export interface ToolListResult {
  /** Extracted tools */
  tools: ExtractedTool[];
  /** Formatted tool list string */
  formatted: string;
}

/** Operation sequence result. */
export interface OperationSequenceResult {
  /** Extracted operations in order */
  operations: ExtractedOperation[];
  /** Formatted sequence string */
  formatted: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Typical SFM values by guessed material for diameter estimation. */
const TYPICAL_SFM: Record<string, number> = {
  aluminum: 800,
  steel: 300,
  stainless: 200,
  default: 400,
};

/** Work offset G-codes to detect. */
const WORK_OFFSET_CODES = [
  "G54", "G55", "G56", "G57", "G58", "G59",
  "G54.1", "G54.1P1", "G54.1P2", "G54.1P3", "G54.1P4",
];

/** G-code patterns that indicate operation types. */
const OP_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /G8[1-9]|G73/i, type: "drilling" },
  { pattern: /G84/i, type: "tapping" },
  { pattern: /G85|G86|G89/i, type: "boring" },
  { pattern: /G76/i, type: "fine_boring" },
  { pattern: /G12|G13/i, type: "circular_pocket" },
  { pattern: /G41|G42/i, type: "contour_milling" },
  { pattern: /G28.*Z/i, type: "z_return" },
];

/** Typical ATC (automatic tool changer) time in seconds. */
const ATC_TIME_S = 6.0;

/** Rapid traverse rate for time estimation (mm/min). */
const RAPID_RATE = 30000;

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Setup Sheet From G-Code Engine — reverse-engineers setup documentation
 * from raw CNC programs.
 *
 * Extracts tool lists, work offsets, operation sequences, cycle times,
 * travel extents, and safety notes from G-code to produce professional
 * setup documentation without manual data entry.
 */
export class SetupSheetFromGCodeEngine {

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Generate a complete setup sheet from a G-code program.
   * Parses the entire program to extract all setup-relevant information.
   *
   * @param gcode - Raw G-code program string
   * @param config - Setup sheet configuration
   * @returns Structured setup sheet data + formatted Markdown
   */
  generateSetupSheet(
    gcode: string, config: SetupSheetConfig,
  ): SetupSheetResult {
    const lines = gcode.split("\n");
    const programNumber = this.extractProgramNumber(lines);
    const tools = this.extractTools(lines, config.controller);
    const workOffsets = this.extractWorkOffsets(lines);
    const operations = this.extractOperations(lines, tools, config.controller);
    const extents = this.calculateExtents(lines);
    const cycleTime = this.estimateCycleTime(lines, tools);
    const safetyNotes = config.include_safety
      ? this.generateSafetyNotes(tools, workOffsets, lines)
      : [];

    const coolantRequired = tools.some(
      (t) => t.coolant !== "off",
    );

    const setupSheet: SetupSheet = {
      program_number: programNumber,
      part_number: config.part_number ?? "N/A",
      operation_name: config.operation_name ?? programNumber,
      tools,
      work_offsets: workOffsets,
      coolant_required: coolantRequired,
      cycle_time_est_s: cycleTime,
      extents,
      safety_notes: safetyNotes,
      operations,
      controller: config.controller,
    };

    const markdown = this.formatSetupSheetMarkdown(setupSheet, config);

    // Enrich with MachiningPlaybookEngine advice (lazy, non-breaking)
    const playbookAdvice = this.getPlaybookAdvice(tools, operations);

    const result: SetupSheetResult = { setup_sheet: setupSheet, markdown };
    if (playbookAdvice) {
      result.playbook_advice = playbookAdvice;
    }
    return result;
  }

  /**
   * Extract a detailed tool list from G-code.
   *
   * For each tool: number, offset, first/last use line, RPM, feeds,
   * estimated operation type, estimated diameter from RPM + SFM.
   *
   * @param gcode - Raw G-code program string
   * @returns Formatted tool list with details
   */
  generateToolList(gcode: string): ToolListResult {
    const lines = gcode.split("\n");
    const tools = this.extractTools(lines, "generic");

    const formatted = this.formatToolList(tools);
    return { tools, formatted };
  }

  /**
   * Extract operation flow from G-code, broken by tool changes.
   *
   * Identifies operation type from G-code patterns (facing, pocketing,
   * drilling, tapping, contouring, etc.).
   *
   * @param gcode - Raw G-code program string
   * @returns Operations in sequence with type guesses
   */
  generateOperationSequence(gcode: string): OperationSequenceResult {
    const lines = gcode.split("\n");
    const tools = this.extractTools(lines, "generic");
    const operations = this.extractOperations(lines, tools, "generic");

    const formatted = this.formatOperationSequence(operations);
    return { operations, formatted };
  }

  /**
   * Export a SetupSheet as formatted Markdown with tables, safety
   * warnings, tool list, and operation sequence.
   *
   * @param setupSheet - Previously generated SetupSheet
   * @returns Professional Markdown setup document
   */
  exportMarkdown(setupSheet: SetupSheet): string {
    const config: SetupSheetConfig = {
      controller: setupSheet.controller,
      part_number: setupSheet.part_number,
      operation_name: setupSheet.operation_name,
      include_tool_list: true,
      include_offsets: true,
      include_safety: true,
    };
    return this.formatSetupSheetMarkdown(setupSheet, config);
  }

  // --------------------------------------------------------------------------
  // Extraction Methods
  // --------------------------------------------------------------------------

  /** Extract program number from O-word or % header. */
  private extractProgramNumber(lines: string[]): string {
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      // Fanuc/Haas: O1234 or O0001
      const oMatch = trimmed.match(/^O(\d{1,5})/i);
      if (oMatch) return `O${oMatch[1]}`;
      // Siemens: %_N_PROGRAM_NAME_MPF
      const sMatch = trimmed.match(/^%_N_(\w+)_MPF/i);
      if (sMatch) return sMatch[1];
      // Comment with program name
      const cMatch = trimmed.match(/^\(PROGRAM[:\s]+(.+)\)/i);
      if (cMatch) return cMatch[1].trim();
    }
    return "UNKNOWN";
  }

  /** Extract all tools used in the program with detailed info. */
  private extractTools(
    lines: string[], controller: ControllerType,
  ): ExtractedTool[] {
    const toolMap = new Map<number, ExtractedTool>();
    let currentTool = 0;
    let currentRPM = 0;
    let currentFeed = 0;
    let coolantState: ExtractedTool["coolant"] = "off";

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith(";")) continue;
      const upper = raw.toUpperCase();

      // Tool call
      const tMatch = upper.match(/T(\d{1,4})/);
      if (tMatch) {
        currentTool = parseInt(tMatch[1], 10);
        if (!toolMap.has(currentTool)) {
          toolMap.set(currentTool, {
            number: currentTool,
            offset_h: currentTool,
            offset_d: 0,
            description_guess: "",
            rpm_values: [],
            feed_values: [],
            operation_type: "unknown",
            first_use_line: i + 1,
            last_use_line: i + 1,
            estimated_diameter_mm: null,
            z_depths: [],
            coolant: "off",
          });
        }
      }

      // H offset
      const hMatch = upper.match(/H(\d{1,3})/);
      if (hMatch && currentTool > 0) {
        const tool = toolMap.get(currentTool);
        if (tool) tool.offset_h = parseInt(hMatch[1], 10);
      }

      // D offset (cutter comp)
      const dMatch = upper.match(/D(\d{1,3})/);
      if (dMatch && currentTool > 0 && !/G4\s/.test(upper)) {
        const tool = toolMap.get(currentTool);
        if (tool) tool.offset_d = parseInt(dMatch[1], 10);
      }

      // Spindle RPM
      const sMatch = upper.match(/S(\d+)/);
      if (sMatch) {
        currentRPM = parseInt(sMatch[1], 10);
        if (currentTool > 0) {
          const tool = toolMap.get(currentTool);
          if (tool && !tool.rpm_values.includes(currentRPM)) {
            tool.rpm_values.push(currentRPM);
          }
        }
      }

      // Feed rate
      const fMatch = upper.match(/F(\d+\.?\d*)/);
      if (fMatch) {
        currentFeed = parseFloat(fMatch[1]);
        if (currentTool > 0 && currentFeed > 0) {
          const tool = toolMap.get(currentTool);
          if (tool && !tool.feed_values.includes(currentFeed)) {
            tool.feed_values.push(currentFeed);
          }
        }
      }

      // Z-depth tracking
      const zMatch = upper.match(/Z(-?\d+\.?\d*)/);
      if (zMatch && currentTool > 0) {
        const z = parseFloat(zMatch[1]);
        const tool = toolMap.get(currentTool);
        if (tool) {
          tool.z_depths.push(z);
          tool.last_use_line = i + 1;
        }
      }

      // Coolant state
      if (/M0?8\b/.test(upper)) coolantState = "flood";
      else if (/M0?7\b/.test(upper)) coolantState = "mist";
      else if (/M0?9\b/.test(upper)) coolantState = "off";
      else if (/M50\b/.test(upper) || /TSC/.test(upper)) {
        coolantState = "through_spindle";
      }

      if (currentTool > 0 && coolantState !== "off") {
        const tool = toolMap.get(currentTool);
        if (tool) tool.coolant = coolantState;
      }

      // Operation type detection from G-code patterns
      if (currentTool > 0) {
        const tool = toolMap.get(currentTool);
        if (tool && tool.operation_type === "unknown") {
          for (const op of OP_PATTERNS) {
            if (op.pattern.test(upper)) {
              tool.operation_type = op.type;
              break;
            }
          }
        }
      }
    }

    // Post-process: guess descriptions and diameters
    for (const tool of toolMap.values()) {
      tool.description_guess = this.guessToolDescription(tool);
      tool.estimated_diameter_mm = this.estimateDiameter(tool);

      // Infer operation type if still unknown
      if (tool.operation_type === "unknown") {
        tool.operation_type = this.inferOperationType(tool);
      }
    }

    return Array.from(toolMap.values()).sort(
      (a, b) => a.number - b.number,
    );
  }

  /** Extract work offset codes used in the program. */
  private extractWorkOffsets(lines: string[]): WorkOffset[] {
    const offsetMap = new Map<string, WorkOffset>();

    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].trim().toUpperCase();
      for (const code of WORK_OFFSET_CODES) {
        if (upper.includes(code)) {
          const existing = offsetMap.get(code);
          if (existing) {
            existing.use_count++;
          } else {
            offsetMap.set(code, {
              code,
              first_use_line: i + 1,
              use_count: 1,
            });
          }
        }
      }
    }

    return Array.from(offsetMap.values()).sort(
      (a, b) => a.first_use_line - b.first_use_line,
    );
  }

  /** Extract operations broken by tool changes. */
  private extractOperations(
    lines: string[],
    tools: ExtractedTool[],
    controller: ControllerType,
  ): ExtractedOperation[] {
    const operations: ExtractedOperation[] = [];
    let currentTool = 0;
    let opStartLine = 0;
    let opZDepths: number[] = [];
    let opFeeds: number[] = [];
    let opRPM = 0;
    let opCoolant = "off";
    let opType = "unknown";
    let cuttingTime = 0;
    let prevX = 0, prevY = 0, prevZ = 0;
    let currentFeed = 0;

    const flushOp = (endLine: number) => {
      if (currentTool > 0 && opStartLine > 0) {
        const feedMin = opFeeds.length > 0 ? Math.min(...opFeeds) : 0;
        const feedMax = opFeeds.length > 0 ? Math.max(...opFeeds) : 0;
        operations.push({
          tool: currentTool,
          type_guess: opType !== "unknown" ? opType : "general_milling",
          start_line: opStartLine,
          end_line: endLine,
          z_depths: [...new Set(opZDepths)].sort((a, b) => b - a),
          feed_range: [feedMin, feedMax],
          rpm: opRPM,
          est_time_s: Math.round(cuttingTime * 10) / 10,
          coolant: opCoolant,
        });
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const upper = raw.toUpperCase();

      // Tool change detection
      const tMatch = upper.match(/T(\d{1,4})/);
      const isToolChange = tMatch
        && (/M0?6\b/.test(upper) || /^T\d+/i.test(raw));

      if (isToolChange && tMatch) {
        flushOp(i);
        currentTool = parseInt(tMatch[1], 10);
        opStartLine = i + 1;
        opZDepths = [];
        opFeeds = [];
        opRPM = 0;
        opCoolant = "off";
        opType = "unknown";
        cuttingTime = ATC_TIME_S; // include tool change time
        continue;
      }

      // Track state
      const sMatch = upper.match(/S(\d+)/);
      if (sMatch) opRPM = parseInt(sMatch[1], 10);

      const fMatch = upper.match(/F(\d+\.?\d*)/);
      if (fMatch) {
        currentFeed = parseFloat(fMatch[1]);
        if (currentFeed > 0) opFeeds.push(currentFeed);
      }

      if (/M0?8\b/.test(upper)) opCoolant = "flood";
      else if (/M0?7\b/.test(upper)) opCoolant = "mist";

      // Operation type detection
      for (const op of OP_PATTERNS) {
        if (op.pattern.test(upper)) {
          opType = op.type;
          break;
        }
      }

      // Cutter compensation implies contouring
      if (/G4[12]\b/.test(upper) && opType === "unknown") {
        opType = "contour_milling";
      }

      // Z-depth
      const zMatch = upper.match(/Z(-?\d+\.?\d*)/);
      if (zMatch) {
        const z = parseFloat(zMatch[1]);
        opZDepths.push(z);
      }

      // Time estimation from cutting moves
      const xMatch = upper.match(/X(-?\d+\.?\d*)/);
      const yMatch = upper.match(/Y(-?\d+\.?\d*)/);
      const newX = xMatch ? parseFloat(xMatch[1]) : prevX;
      const newY = yMatch ? parseFloat(yMatch[1]) : prevY;
      const newZ = zMatch ? parseFloat(zMatch[1]) : prevZ;

      const dist = Math.sqrt(
        (newX - prevX) ** 2
        + (newY - prevY) ** 2
        + (newZ - prevZ) ** 2,
      );

      if (/G0?0\b/.test(upper) && dist > 0) {
        cuttingTime += (dist / RAPID_RATE) * 60;
      } else if (/G0?1\b/.test(upper) && dist > 0 && currentFeed > 0) {
        cuttingTime += (dist / currentFeed) * 60;
      } else if (/G0?[23]\b/.test(upper) && dist > 0 && currentFeed > 0) {
        // Arc — approximate with 1.5x linear distance
        cuttingTime += (dist * 1.5 / currentFeed) * 60;
      } else if (/G8[1-9]|G73|G76|G84|G85|G86|G89/.test(upper)) {
        // Canned cycle: estimate from Z depth and feed
        if (zMatch && currentFeed > 0) {
          const depth = Math.abs(parseFloat(zMatch[1]));
          cuttingTime += (depth * 2 / currentFeed) * 60; // down + retract
        }
      }

      prevX = newX;
      prevY = newY;
      prevZ = newZ;
    }

    // Flush last operation
    flushOp(lines.length);

    return operations;
  }

  /** Calculate workpiece extents from programmed moves. */
  private calculateExtents(lines: string[]): SetupSheet["extents"] {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;
    let hasCoords = false;

    for (const raw of lines) {
      const upper = raw.trim().toUpperCase();
      // Only consider cutting moves (G1/G2/G3), not rapids
      if (!/G0?[1-3]\b/.test(upper) && !/^[NOXYZ]/.test(upper)) continue;
      if (/G0?0\b/.test(upper)) continue; // skip rapids for extents

      const xM = upper.match(/X(-?\d+\.?\d*)/);
      const yM = upper.match(/Y(-?\d+\.?\d*)/);
      const zM = upper.match(/Z(-?\d+\.?\d*)/);

      if (xM) { const v = parseFloat(xM[1]); xMin = Math.min(xMin, v); xMax = Math.max(xMax, v); hasCoords = true; }
      if (yM) { const v = parseFloat(yM[1]); yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); hasCoords = true; }
      if (zM) { const v = parseFloat(zM[1]); zMin = Math.min(zMin, v); zMax = Math.max(zMax, v); hasCoords = true; }
    }

    if (!hasCoords) {
      return { x_min: 0, x_max: 0, y_min: 0, y_max: 0, z_min: 0, z_max: 0 };
    }

    return {
      x_min: Math.round(xMin * 1000) / 1000,
      x_max: Math.round(xMax * 1000) / 1000,
      y_min: Math.round(yMin * 1000) / 1000,
      y_max: Math.round(yMax * 1000) / 1000,
      z_min: Math.round(zMin * 1000) / 1000,
      z_max: Math.round(zMax * 1000) / 1000,
    };
  }

  /** Estimate total cycle time from G-code moves and tool changes. */
  private estimateCycleTime(
    lines: string[], tools: ExtractedTool[],
  ): number {
    let totalTime = 0;
    let prevX = 0, prevY = 0, prevZ = 0;
    let currentFeed = 1000;

    // Tool change time
    totalTime += tools.length * ATC_TIME_S;

    for (const raw of lines) {
      const upper = raw.trim().toUpperCase();

      const fMatch = upper.match(/F(\d+\.?\d*)/);
      if (fMatch) currentFeed = parseFloat(fMatch[1]) || 1000;

      const xM = upper.match(/X(-?\d+\.?\d*)/);
      const yM = upper.match(/Y(-?\d+\.?\d*)/);
      const zM = upper.match(/Z(-?\d+\.?\d*)/);

      const newX = xM ? parseFloat(xM[1]) : prevX;
      const newY = yM ? parseFloat(yM[1]) : prevY;
      const newZ = zM ? parseFloat(zM[1]) : prevZ;

      const dist = Math.sqrt(
        (newX - prevX) ** 2
        + (newY - prevY) ** 2
        + (newZ - prevZ) ** 2,
      );

      if (dist > 0.001) {
        if (/G0?0\b/.test(upper)) {
          totalTime += (dist / RAPID_RATE) * 60;
        } else if (/G0?[1-3]\b/.test(upper) && currentFeed > 0) {
          totalTime += (dist / currentFeed) * 60;
        }
      }

      // Dwell
      const dwellMatch = upper.match(/G0?4\s+P(\d+\.?\d*)/);
      if (dwellMatch) {
        const p = parseFloat(dwellMatch[1]);
        totalTime += p > 100 ? p / 1000 : p;
      }

      prevX = newX;
      prevY = newY;
      prevZ = newZ;
    }

    return Math.round(totalTime * 10) / 10;
  }

  // --------------------------------------------------------------------------
  // Tool Description / Diameter Guessing
  // --------------------------------------------------------------------------

  /** Guess tool description from operation type and G-code patterns. */
  private guessToolDescription(tool: ExtractedTool): string {
    const maxRPM = tool.rpm_values.length > 0
      ? Math.max(...tool.rpm_values) : 0;
    const dia = this.estimateDiameter(tool);
    const diaStr = dia ? `${dia.toFixed(1)}mm` : "?mm";

    switch (tool.operation_type) {
      case "drilling":
        return `Drill ${diaStr}`;
      case "tapping":
        return `Tap ${diaStr}`;
      case "boring":
      case "fine_boring":
        return `Boring bar ${diaStr}`;
      case "contour_milling":
        return `End mill ${diaStr}`;
      case "circular_pocket":
        return `End mill ${diaStr} (pocket)`;
      default: {
        if (maxRPM > 8000) return `End mill ${diaStr} (HSM)`;
        if (maxRPM > 0 && maxRPM < 500) return `Face mill ${diaStr}`;
        return `Tool ${diaStr}`;
      }
    }
  }

  /**
   * Estimate tool diameter from RPM using SFM = (pi x D x RPM) / 1000.
   * Assumes typical aluminum SFM if unknown. Returns null if no RPM data.
   */
  private estimateDiameter(tool: ExtractedTool): number | null {
    if (tool.rpm_values.length === 0) return null;

    const maxRPM = Math.max(...tool.rpm_values);
    if (maxRPM <= 0) return null;

    // Use typical SFM of 400 m/min as default
    const sfm = TYPICAL_SFM.default;
    // D = (SFM * 1000) / (pi * RPM)
    const diameter = (sfm * 1000) / (Math.PI * maxRPM);

    // Round to common tool sizes
    return Math.round(diameter * 10) / 10;
  }

  /** Infer operation type from Z-depths and feed patterns. */
  private inferOperationType(tool: ExtractedTool): string {
    if (tool.z_depths.length === 0) return "general_milling";

    const minZ = Math.min(...tool.z_depths);
    const maxZ = Math.max(...tool.z_depths);
    const zRange = maxZ - minZ;

    // Single Z-depth with high RPM = facing
    if (zRange < 0.5 && tool.rpm_values.some((r) => r < 1000)) {
      return "facing";
    }

    // Many Z-depths in regular steps = pocketing
    if (tool.z_depths.length > 5) {
      return "pocketing";
    }

    // Deep Z with limited XY = drilling-like
    if (zRange > 10 && tool.feed_values.length < 3) {
      return "drilling";
    }

    return "general_milling";
  }

  /** Generate safety notes from program analysis. */
  private generateSafetyNotes(
    tools: ExtractedTool[],
    offsets: WorkOffset[],
    lines: string[],
  ): string[] {
    const notes: string[] = [];

    // Check for high RPM
    const maxRPM = Math.max(
      0, ...tools.flatMap((t) => t.rpm_values),
    );
    if (maxRPM > 10000) {
      notes.push(
        `HIGH SPEED: Max spindle speed ${maxRPM} RPM. `
        + "Verify tool balance and holder rated for speed.",
      );
    }

    // Check for deep Z
    const minZ = Math.min(
      0, ...tools.flatMap((t) => t.z_depths),
    );
    if (minZ < -100) {
      notes.push(
        `DEEP CUTTING: Z-depth reaches ${minZ}mm. `
        + "Verify tool length and collision clearance.",
      );
    }

    // Coolant check
    const needsCoolant = tools.some((t) => t.coolant !== "off");
    if (needsCoolant) {
      notes.push("COOLANT REQUIRED: Verify coolant level and nozzle aim.");
    }

    // Through-spindle coolant
    if (tools.some((t) => t.coolant === "through_spindle")) {
      notes.push(
        "THROUGH-SPINDLE COOLANT: Verify TSC pressure and "
        + "tool has through-coolant capability.",
      );
    }

    // Multiple work offsets
    if (offsets.length > 1) {
      notes.push(
        `MULTIPLE WORK OFFSETS: ${offsets.length} offsets used `
        + `(${offsets.map((o) => o.code).join(", ")}). `
        + "Verify all offsets are set before running.",
      );
    }

    // Check for M0 (program stop)
    const hasStop = lines.some(
      (l) => /M0?0\b/.test(l.toUpperCase()) && !/M00/.test(l),
    );
    if (hasStop) {
      notes.push(
        "PROGRAM STOP (M0): Program contains mandatory stop(s). "
        + "Operator action required during cycle.",
      );
    }

    // Always add standard safety note
    notes.push(
      "Verify tool lengths, work offsets, and run in single-block "
      + "mode on first article.",
    );

    return notes;
  }

  // --------------------------------------------------------------------------
  // Formatting Methods
  // --------------------------------------------------------------------------

  /** Format a complete setup sheet as Markdown. */
  private formatSetupSheetMarkdown(
    sheet: SetupSheet, config: SetupSheetConfig,
  ): string {
    const lines: string[] = [];

    // Header
    lines.push("# CNC Setup Sheet");
    lines.push("");
    lines.push("| Field | Value |");
    lines.push("|-------|-------|");
    lines.push(`| Program | ${sheet.program_number} |`);
    lines.push(`| Part Number | ${sheet.part_number} |`);
    lines.push(`| Operation | ${sheet.operation_name} |`);
    if (config.machine_name) {
      lines.push(`| Machine | ${config.machine_name} |`);
    }
    lines.push(`| Controller | ${sheet.controller} |`);
    lines.push(
      `| Est. Cycle Time | ${this.formatTime(sheet.cycle_time_est_s)} |`,
    );
    lines.push(`| Coolant Required | ${sheet.coolant_required ? "Yes" : "No"} |`);
    if (config.operator) {
      lines.push(`| Operator | ${config.operator} |`);
    }
    lines.push("");

    // Work Offsets
    if (config.include_offsets && sheet.work_offsets.length > 0) {
      lines.push("## Work Offsets");
      lines.push("");
      lines.push("| Offset | First Used (Line) | Count |");
      lines.push("|--------|-------------------|-------|");
      for (const wo of sheet.work_offsets) {
        lines.push(`| ${wo.code} | ${wo.first_use_line} | ${wo.use_count} |`);
      }
      lines.push("");
    }

    // Tool List
    if (config.include_tool_list) {
      lines.push("## Tool List");
      lines.push("");
      lines.push(this.formatToolList(sheet.tools));
      lines.push("");
    }

    // Operation Sequence
    lines.push("## Operation Sequence");
    lines.push("");
    lines.push(this.formatOperationSequence(sheet.operations));
    lines.push("");

    // Workpiece Extents
    lines.push("## Workpiece Extents");
    lines.push("");
    lines.push("| Axis | Min | Max | Range |");
    lines.push("|------|-----|-----|-------|");
    const e = sheet.extents;
    lines.push(
      `| X | ${e.x_min} | ${e.x_max} | ${(e.x_max - e.x_min).toFixed(3)} |`,
    );
    lines.push(
      `| Y | ${e.y_min} | ${e.y_max} | ${(e.y_max - e.y_min).toFixed(3)} |`,
    );
    lines.push(
      `| Z | ${e.z_min} | ${e.z_max} | ${(e.z_max - e.z_min).toFixed(3)} |`,
    );
    lines.push("");

    // Safety Notes
    if (config.include_safety && sheet.safety_notes.length > 0) {
      lines.push("## Safety Notes");
      lines.push("");
      for (const note of sheet.safety_notes) {
        lines.push(`- **${note}**`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push(
      "*Generated by PRISM SetupSheetFromGCodeEngine "
      + "-- Automated Setup Documentation*",
    );

    return lines.join("\n");
  }

  /** Format tool list as Markdown table. */
  private formatToolList(tools: ExtractedTool[]): string {
    const lines: string[] = [];
    lines.push(
      "| Tool # | H | Description | RPM | Feed | "
      + "Type | Coolant | Lines |",
    );
    lines.push(
      "|--------|---|-------------|-----|------|"
      + "------|---------|-------|",
    );

    for (const t of tools) {
      const rpmStr = t.rpm_values.length > 0
        ? t.rpm_values.join("/") : "-";
      const feedStr = t.feed_values.length > 0
        ? t.feed_values.map((f) => f.toFixed(0)).join("/") : "-";

      lines.push(
        `| T${t.number} | H${t.offset_h} | ${t.description_guess} `
        + `| ${rpmStr} | ${feedStr} `
        + `| ${t.operation_type} | ${t.coolant} `
        + `| ${t.first_use_line}-${t.last_use_line} |`,
      );
    }

    return lines.join("\n");
  }

  /** Format operation sequence as Markdown table. */
  private formatOperationSequence(operations: ExtractedOperation[]): string {
    const lines: string[] = [];
    lines.push(
      "| # | Tool | Operation | RPM | Feed Range | "
      + "Z-Depth | Time | Coolant |",
    );
    lines.push(
      "|---|------|-----------|-----|------------|"
      + "---------|------|---------|",
    );

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const zMin = op.z_depths.length > 0
        ? Math.min(...op.z_depths).toFixed(2) : "-";
      const feedStr = op.feed_range[0] > 0
        ? `${op.feed_range[0].toFixed(0)}-${op.feed_range[1].toFixed(0)}`
        : "-";

      lines.push(
        `| ${i + 1} | T${op.tool} | ${op.type_guess} `
        + `| ${op.rpm} | ${feedStr} `
        + `| ${zMin} | ${this.formatTime(op.est_time_s)} `
        + `| ${op.coolant} |`,
      );
    }

    return lines.join("\n");
  }

  // --------------------------------------------------------------------------
  // Playbook Integration
  // --------------------------------------------------------------------------

  /**
   * Lazily import MachiningPlaybookEngine and return workholding/datum/setup
   * advice based on detected features. Returns null if playbook unavailable.
   */
  private getPlaybookAdvice(
    tools: ExtractedTool[],
    operations: ExtractedOperation[],
  ): PlaybookSetupAdvice | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine");

      // Build detected feature list from extracted operations
      const detectedFeatures = this.extractDetectedFeatures(tools, operations);

      // Get setup-specific advice (workholding, datum, setup strategy)
      const setup = machiningPlaybookEngine.setupAdvice(detectedFeatures);

      // Get broader advice for workholding + datum + setup_strategy categories
      const broader = machiningPlaybookEngine.advise({
        features: detectedFeatures,
        categories: ["workholding", "datum", "setup_strategy"],
      });

      // Merge workholding suggestions
      const workholding = [
        ...setup.workholding_suggestions,
        ...broader.summary.filter((s: string) =>
          !setup.workholding_suggestions.includes(s),
        ),
      ];

      // Collect setup warnings from critical warnings + anti-patterns
      const setupWarnings = [
        ...broader.critical_warnings,
        ...setup.reasoning.filter((r: string) =>
          r.toLowerCase().includes("warn")
          || r.toLowerCase().includes("risk")
          || r.toLowerCase().includes("avoid"),
        ),
      ];

      return {
        workholding,
        datum_strategy: setup.datum_strategy,
        setup_warnings: setupWarnings,
      };
    } catch {
      // MachiningPlaybookEngine not available — graceful degradation
      return null;
    }
  }

  /**
   * Derive feature descriptors from extracted tools and operations
   * for playbook rule matching.
   */
  private extractDetectedFeatures(
    tools: ExtractedTool[],
    operations: ExtractedOperation[],
  ): string[] {
    const features: string[] = [];

    for (const op of operations) {
      if (!features.includes(op.type_guess)) {
        features.push(op.type_guess);
      }
    }

    // Infer features from tool usage patterns
    const hasDrilling = operations.some((o) => o.type_guess === "drilling");
    const hasTapping = operations.some((o) => o.type_guess === "tapping");
    const hasBoring = operations.some((o) =>
      o.type_guess === "boring" || o.type_guess === "fine_boring",
    );
    const hasPocketing = operations.some((o) => o.type_guess === "pocketing");
    const hasContouring = operations.some(
      (o) => o.type_guess === "contour_milling",
    );

    if (hasDrilling) features.push("holes");
    if (hasTapping) features.push("threaded_holes");
    if (hasBoring) features.push("precision_bore");
    if (hasPocketing) features.push("pocket");
    if (hasContouring) features.push("contour");

    // Deep Z operations
    const allZDepths = operations.flatMap((o) => o.z_depths);
    if (allZDepths.length > 0) {
      const minZ = Math.min(...allZDepths);
      if (minZ < -50) features.push("deep_feature");
    }

    // Multiple work offsets suggest multi-setup
    const toolCount = tools.length;
    if (toolCount > 6) features.push("complex_multi_tool");

    return features;
  }

  /** Format seconds as M:SS or H:MM:SS. */
  private formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}:${secs.toString().padStart(2, "0")}`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance of the Setup Sheet From G-Code Engine. */
export const setupSheetFromGCodeEngine = new SetupSheetFromGCodeEngine();
