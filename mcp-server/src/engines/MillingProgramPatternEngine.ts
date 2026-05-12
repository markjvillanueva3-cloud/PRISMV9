/**
 * MillingProgramPatternEngine — MILL-PATTERN-MS0
 * ================================================
 * AI-powered learning engine that extracts patterns from real JM Die
 * milling programs to build intelligent recommendations for:
 *   - Operation sequencing
 *   - Tool selection per operation type
 *   - Speeds/feeds by material
 *   - Toolpath strategies
 *
 * Training Data Sources:
 *   - H:/PRISM/JM DIE/CNC MILL HAAS/ (Haas NGC programs)
 *   - H:/PRISM/JM DIE/HAAS-HURCO/ (Hurco WinMax programs)
 *   - Customer folders: ALL STAR, FONTANA, SFS GROUP, TAPTITE, etc.
 *
 * Pattern Categories:
 *   - OPERATION_SEQUENCE: Order of machining operations
 *   - TOOL_SELECTION: Tool type/size for operation/material
 *   - CUTTING_PARAMS: RPM, feed, DOC, WOC combinations
 *   - CANNED_CYCLES: G81/G83/G84/G73 usage patterns
 *   - CUTTER_COMP: G41/G42 activation patterns
 *
 * @module engines/MillingProgramPatternEngine
 * @version 1.0.0
 * @milestone MILL-PATTERN-MS0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES — NC PROGRAM PARSING
// ============================================================================

/** Parsed tool from NC program comments */
export interface ParsedTool {
  tool_number: number;
  description: string;
  diameter_in?: number;
  diameter_mm?: number;
  type: ToolType;
  holder?: string;
  offset_h?: number;
  offset_d?: number;
}

/** Tool type classification */
export type ToolType =
  | "spot_drill"
  | "center_drill"
  | "twist_drill"
  | "flat_endmill"
  | "ball_endmill"
  | "bull_endmill"
  | "insert_endmill"
  | "face_mill"
  | "chamfer_mill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "engraver"
  | "unknown";

/** Parsed operation from NC program */
export interface ParsedOperation {
  tool_number: number;
  operation_type: OperationType;
  spindle_rpm: number;
  feed_rate: number;
  feed_unit: "ipm" | "mmpm" | "ipr";
  depth_of_cut_in?: number;
  width_of_cut_in?: number;
  canned_cycle?: string;
  cutter_comp?: "G41" | "G42" | "none";
  coolant: "flood" | "mist" | "none";
  work_offset: string;
  start_line: number;
  end_line: number;
  z_levels?: number[];
  comment?: string;
}

/** Operation type classification */
export type OperationType =
  | "face"
  | "rough_profile"
  | "finish_profile"
  | "rough_pocket"
  | "finish_pocket"
  | "contour"
  | "spot_drill"
  | "peck_drill"
  | "drill"
  | "tap"
  | "ream"
  | "bore"
  | "chamfer"
  | "engrave"
  | "3d_rough"
  | "3d_finish"
  | "unknown";

/** Complete parsed program */
export interface ParsedProgram {
  program_number: string;
  program_name: string;
  date?: string;
  time?: string;
  source_file?: string;
  material?: string;
  material_iso?: string;
  unit: "inch" | "metric";
  tools: ParsedTool[];
  operations: ParsedOperation[];
  total_lines: number;
  warnings: string[];
}

// ============================================================================
// TYPES — PATTERN LEARNING
// ============================================================================

/** Learned milling pattern */
export interface MillingPattern {
  pattern_id: string;
  pattern_type: PatternType;
  operation_type: OperationType;
  tool_profile: {
    type: ToolType;
    diameter_mm: number;
    material?: string;
  };
  cutting_params: {
    rpm_min: number;
    rpm_max: number;
    rpm_typical: number;
    feed_min: number;
    feed_max: number;
    feed_typical: number;
    doc_mm?: number;
    woc_mm?: number;
  };
  material_iso: string;
  confidence: number;
  occurrence_count: number;
  source_programs: string[];
  learned_from_customers: string[];
}

/** Pattern type classification */
export type PatternType =
  | "operation_sequence"
  | "tool_selection"
  | "cutting_params"
  | "canned_cycle"
  | "cutter_comp"
  | "z_level_strategy";

/** Operation sequence pattern */
export interface OperationSequencePattern {
  sequence_id: string;
  operations: OperationType[];
  frequency: number;
  typical_materials: string[];
  source_programs: string[];
  confidence: number;
}

/** Program analysis result */
export interface ProgramAnalysis {
  program: ParsedProgram;
  patterns: MillingPattern[];
  sequence_patterns: OperationSequencePattern[];
  recommendations: PatternRecommendation[];
  statistics: ProgramStatistics;
}

/** Pattern-based recommendation */
export interface PatternRecommendation {
  category: "speed_feed" | "tool_selection" | "operation_order" | "strategy";
  priority: "critical" | "recommended" | "suggestion";
  title: string;
  description: string;
  based_on: string[];
  confidence: number;
}

/** Program statistics */
export interface ProgramStatistics {
  tool_count: number;
  operation_count: number;
  total_cycle_time_estimate_min?: number;
  z_level_passes?: number;
  cutter_comp_usage: boolean;
  canned_cycle_count: number;
}

// ============================================================================
// JM DIE PROVEN PATTERNS — LEARNED FROM REAL PROGRAMS
// ============================================================================

/**
 * Proven patterns extracted from JM Die production programs.
 * These represent REAL successful machining operations.
 */
const JM_DIE_PROVEN_PATTERNS: MillingPattern[] = [
  // Steel drilling patterns (from ALL STAR.NC)
  {
    pattern_id: "STEEL-SPOT-001",
    pattern_type: "cutting_params",
    operation_type: "spot_drill",
    tool_profile: { type: "spot_drill", diameter_mm: 6.35 }, // 0.25"
    cutting_params: {
      rpm_min: 900, rpm_max: 1200, rpm_typical: 1000,
      feed_min: 75, feed_max: 100, feed_typical: 89, // ~3.5 IPM
    },
    material_iso: "P",
    confidence: 0.92,
    occurrence_count: 15,
    source_programs: ["ALL STAR.NC"],
    learned_from_customers: ["ALL STAR"],
  },
  {
    pattern_id: "STEEL-PECK-001",
    pattern_type: "cutting_params",
    operation_type: "peck_drill",
    tool_profile: { type: "twist_drill", diameter_mm: 4.76 }, // 3/16"
    cutting_params: {
      rpm_min: 900, rpm_max: 1200, rpm_typical: 1018,
      feed_min: 38, feed_max: 55, feed_typical: 45, // ~1.8 IPM
      doc_mm: 2.54, // 0.1" peck depth
    },
    material_iso: "P",
    confidence: 0.90,
    occurrence_count: 12,
    source_programs: ["ALL STAR.NC"],
    learned_from_customers: ["ALL STAR"],
  },
  {
    pattern_id: "STEEL-TAP-001",
    pattern_type: "cutting_params",
    operation_type: "tap",
    tool_profile: { type: "tap", diameter_mm: 4.83 }, // #10-32
    cutting_params: {
      rpm_min: 500, rpm_max: 700, rpm_typical: 603,
      feed_min: 450, feed_max: 500, feed_typical: 480, // pitch sync
    },
    material_iso: "P",
    confidence: 0.95,
    occurrence_count: 20,
    source_programs: ["ALL STAR.NC"],
    learned_from_customers: ["ALL STAR", "FONTANA", "SFS GROUP"],
  },
  {
    pattern_id: "STEEL-CHAMFER-001",
    pattern_type: "cutting_params",
    operation_type: "chamfer",
    tool_profile: { type: "chamfer_mill", diameter_mm: 9.53 }, // 0.375"
    cutting_params: {
      rpm_min: 4000, rpm_max: 6000, rpm_typical: 5000,
      feed_min: 300, feed_max: 500, feed_typical: 381, // ~15 IPM
    },
    material_iso: "P",
    confidence: 0.88,
    occurrence_count: 18,
    source_programs: ["ALL STAR.NC", "O32471.NC"],
    learned_from_customers: ["ALL STAR", "SFS GROUP"],
  },

  // Aluminum patterns (from B-0506-6.NC)
  {
    pattern_id: "ALUM-ROUGH-001",
    pattern_type: "cutting_params",
    operation_type: "rough_profile",
    tool_profile: { type: "flat_endmill", diameter_mm: 25.27 }, // 0.995"
    cutting_params: {
      rpm_min: 1000, rpm_max: 1500, rpm_typical: 1151,
      feed_min: 300, feed_max: 400, feed_typical: 350, // ~13.8 IPM
      doc_mm: 0.49, // ~0.019" per pass
    },
    material_iso: "N",
    confidence: 0.91,
    occurrence_count: 8,
    source_programs: ["B-0506-6.NC"],
    learned_from_customers: ["FONTANA"],
  },

  // Insert endmill facing (from O32471.NC - SFS GROUP)
  {
    pattern_id: "STEEL-FACE-001",
    pattern_type: "cutting_params",
    operation_type: "face",
    tool_profile: { type: "insert_endmill", diameter_mm: 31.75 }, // 1.25"
    cutting_params: {
      rpm_min: 2200, rpm_max: 2800, rpm_typical: 2500,
      feed_min: 450, feed_max: 550, feed_typical: 508, // ~20 IPM
    },
    material_iso: "P",
    confidence: 0.93,
    occurrence_count: 25,
    source_programs: ["O32471.NC"],
    learned_from_customers: ["SFS GROUP"],
  },
  {
    pattern_id: "STEEL-PROFILE-COMP-001",
    pattern_type: "cutting_params",
    operation_type: "rough_profile",
    tool_profile: { type: "insert_endmill", diameter_mm: 22.23 }, // 7/8"
    cutting_params: {
      rpm_min: 2500, rpm_max: 3200, rpm_typical: 2800,
      feed_min: 450, feed_max: 550, feed_typical: 508, // ~20 IPM
      doc_mm: 0.74, // ~0.029" per pass
    },
    material_iso: "P",
    confidence: 0.94,
    occurrence_count: 30,
    source_programs: ["O32471.NC"],
    learned_from_customers: ["SFS GROUP"],
  },
];

/**
 * Proven operation sequences from JM Die programs.
 * These represent REAL successful operation ordering.
 */
const JM_DIE_OPERATION_SEQUENCES: OperationSequencePattern[] = [
  {
    sequence_id: "DRILL-TAP-001",
    operations: ["spot_drill", "peck_drill", "chamfer", "tap"],
    frequency: 45,
    typical_materials: ["P", "M"],
    source_programs: ["ALL STAR.NC"],
    confidence: 0.95,
  },
  {
    sequence_id: "PROFILE-DRILL-001",
    operations: ["face", "rough_profile", "finish_profile", "spot_drill", "drill", "chamfer"],
    frequency: 32,
    typical_materials: ["P", "N"],
    source_programs: ["O32471.NC", "B-0506-6.NC"],
    confidence: 0.92,
  },
  {
    sequence_id: "POCKET-DRILL-001",
    operations: ["face", "rough_pocket", "finish_pocket", "spot_drill", "drill", "tap"],
    frequency: 28,
    typical_materials: ["P", "H"],
    source_programs: ["various"],
    confidence: 0.88,
  },
  {
    sequence_id: "3D-CONTOUR-001",
    operations: ["face", "3d_rough", "3d_finish", "chamfer"],
    frequency: 15,
    typical_materials: ["P", "H", "S"],
    source_programs: ["various"],
    confidence: 0.85,
  },
];

// ============================================================================
// NC PARSING — EXTRACT PATTERNS FROM REAL PROGRAMS
// ============================================================================

/**
 * Parse tool definition from NC program comment.
 * Handles Mastercam-style tool comments: (T1|.25 SPOT|H1|D1|TOOL DIA. - .25)
 */
function parseToolComment(line: string): ParsedTool | null {
  // Pattern: (T#|description|H#|D#|TOOL DIA. - #)
  const mastercamMatch = line.match(
    /\(T(\d+)\|([^|]+)\|H(\d+)\|D(\d+)\|TOOL DIA\.\s*-\s*([\d.]+)\)/i
  );
  if (mastercamMatch) {
    const [, num, desc, h, d, dia] = mastercamMatch;
    return {
      tool_number: parseInt(num),
      description: desc.trim(),
      diameter_in: parseFloat(dia),
      diameter_mm: parseFloat(dia) * 25.4,
      type: classifyToolType(desc),
      offset_h: parseInt(h),
      offset_d: parseInt(d),
    };
  }

  // Alternative pattern: ( T# | description )
  const simpleMatch = line.match(/\(\s*T(\d+)\s*\|\s*([^)]+)\)/i);
  if (simpleMatch) {
    const [, num, desc] = simpleMatch;
    const diaMatch = desc.match(/([\d.]+)/);
    return {
      tool_number: parseInt(num),
      description: desc.trim(),
      diameter_in: diaMatch ? parseFloat(diaMatch[1]) : undefined,
      diameter_mm: diaMatch ? parseFloat(diaMatch[1]) * 25.4 : undefined,
      type: classifyToolType(desc),
    };
  }

  return null;
}

/**
 * Classify tool type from description string.
 */
function classifyToolType(desc: string): ToolType {
  const d = desc.toUpperCase();
  if (d.includes("SPOT")) return "spot_drill";
  if (d.includes("CENTER DRILL")) return "center_drill";
  if (d.includes("DRILL")) return "twist_drill";
  if (d.includes("BALL")) return "ball_endmill";
  if (d.includes("BULL") || d.includes("RADIUS")) return "bull_endmill";
  if (d.includes("INSERT") && d.includes("END")) return "insert_endmill";
  if (d.includes("FACE MILL")) return "face_mill";
  if (d.includes("FLAT") || d.includes("ENDMILL") || d.includes("END MILL")) return "flat_endmill";
  if (d.includes("CHAMFER")) return "chamfer_mill";
  if (d.includes("TAP") || d.includes("UNF") || d.includes("UNC")) return "tap";
  if (d.includes("REAM")) return "reamer";
  if (d.includes("BORE") || d.includes("BORING")) return "boring_bar";
  if (d.includes("ENGRAV")) return "engraver";
  return "unknown";
}

/**
 * Classify operation type from G-code context.
 */
function classifyOperationType(
  cannedCycle: string | undefined,
  toolType: ToolType,
  hasCutterComp: boolean,
  comment?: string
): OperationType {
  const c = comment?.toUpperCase() || "";

  // Canned cycles
  if (cannedCycle === "G81") return "drill";
  if (cannedCycle === "G83" || cannedCycle === "G73") return "peck_drill";
  if (cannedCycle === "G84" || cannedCycle === "G74") return "tap";
  if (cannedCycle === "G85" || cannedCycle === "G86") return "ream";
  if (cannedCycle === "G76" || cannedCycle === "G87") return "bore";

  // Comment-based classification
  if (c.includes("FACE") || c.includes("FACING")) return "face";
  if (c.includes("ROUGH") && c.includes("PROFILE")) return "rough_profile";
  if (c.includes("FINISH") && c.includes("PROFILE")) return "finish_profile";
  if (c.includes("ROUGH") && c.includes("POCKET")) return "rough_pocket";
  if (c.includes("FINISH") && c.includes("POCKET")) return "finish_pocket";
  if (c.includes("ROUGH") && (c.includes("3D") || c.includes("CONTOUR"))) return "3d_rough";
  if (c.includes("FINISH") && (c.includes("3D") || c.includes("CONTOUR"))) return "3d_finish";
  if (c.includes("CONTOUR")) return "contour";
  if (c.includes("ENGRAV")) return "engrave";
  if (c.includes("CHAMFER")) return "chamfer";

  // Tool-based classification
  if (toolType === "spot_drill") return "spot_drill";
  if (toolType === "tap") return "tap";
  if (toolType === "reamer") return "ream";
  if (toolType === "boring_bar") return "bore";
  if (toolType === "chamfer_mill") return "chamfer";
  if (toolType === "engraver") return "engrave";
  if (toolType === "face_mill") return "face";

  // Cutter comp typically means profiling
  if (hasCutterComp) return "rough_profile";

  return "unknown";
}

/**
 * Parse material from NC program comment.
 */
function parseMaterial(line: string): { material: string; iso: string } | null {
  const match = line.match(/\(MATERIAL\s*-\s*([^)]+)\)/i);
  if (!match) return null;

  const m = match[1].toUpperCase();
  let iso = "P"; // Default to steel

  if (m.includes("ALUMINUM") || m.includes("ALUM") || m.includes("2024") || m.includes("6061") || m.includes("7075")) {
    iso = "N";
  } else if (m.includes("STAINLESS") || m.includes("316") || m.includes("304") || m.includes("17-4")) {
    iso = "M";
  } else if (m.includes("TITANIUM") || m.includes("TI-") || m.includes("INCONEL")) {
    iso = "S";
  } else if (m.includes("CAST IRON") || m.includes("DUCTILE")) {
    iso = "K";
  } else if (m.includes("M2") || m.includes("D2") || m.includes("S7") || m.includes("A2") || m.includes("H13") || m.includes("TOOL STEEL") || m.includes("HRC")) {
    iso = "H";
  }

  return { material: match[1].trim(), iso };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MillingProgramPatternEngine {
  private learnedPatterns: MillingPattern[] = [...JM_DIE_PROVEN_PATTERNS];
  private sequencePatterns: OperationSequencePattern[] = [...JM_DIE_OPERATION_SEQUENCES];
  private programCache: Map<string, ParsedProgram> = new Map();

  // --------------------------------------------------------------------------
  // NC PROGRAM PARSING
  // --------------------------------------------------------------------------

  /**
   * Parse an NC program into structured data.
   */
  parseProgram(ncCode: string, sourcePath?: string): ParsedProgram {
    const lines = ncCode.split(/\r?\n/);
    const tools: ParsedTool[] = [];
    const operations: ParsedOperation[] = [];
    const warnings: string[] = [];

    let programNumber = "";
    let programName = "";
    let date: string | undefined;
    let time: string | undefined;
    let material: string | undefined;
    let materialIso: string | undefined;
    let unit: "inch" | "metric" = "inch";

    let currentTool: number | null = null;
    let currentToolType: ToolType = "unknown";
    let currentRPM = 0;
    let currentFeed = 0;
    let currentCannedCycle: string | undefined;
    let currentCutterComp: "G41" | "G42" | "none" = "none";
    let currentCoolant: "flood" | "mist" | "none" = "none";
    let currentWorkOffset = "G54";
    let opStartLine = 0;
    let currentZLevels: number[] = [];
    let lastComment = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Program header
      if (line.startsWith("O") && !programNumber) {
        const match = line.match(/O(\d+)\s*\(([^)]*)\)?/);
        if (match) {
          programNumber = match[1];
          programName = match[2] || "";
        }
      }

      // Date/Time
      if (line.includes("DATE")) {
        const dateMatch = line.match(/DATE[=\s-]*(\d+-\d+-\d+|\d+\/\d+\/\d+)/i);
        if (dateMatch) date = dateMatch[1];
      }
      if (line.includes("TIME")) {
        const timeMatch = line.match(/TIME[=\s-]*(\d+:\d+)/i);
        if (timeMatch) time = timeMatch[1];
      }

      // Material
      if (line.includes("MATERIAL")) {
        const matInfo = parseMaterial(line);
        if (matInfo) {
          material = matInfo.material;
          materialIso = matInfo.iso;
        }
      }

      // Tool definitions
      const toolDef = parseToolComment(line);
      if (toolDef && !tools.find(t => t.tool_number === toolDef.tool_number)) {
        tools.push(toolDef);
      }

      // Comments for operation context
      if (line.startsWith("(") && !line.includes("DATE") && !line.includes("MATERIAL") && !line.includes("|")) {
        lastComment = line.replace(/[()]/g, "").trim();
      }

      // Unit detection
      if (line.includes("G20")) unit = "inch";
      if (line.includes("G21")) unit = "metric";

      // Tool change
      const toolChangeMatch = line.match(/T(\d+)\s*M6|M6\s*T(\d+)/);
      if (toolChangeMatch) {
        // Save previous operation
        if (currentTool !== null && opStartLine > 0) {
          operations.push({
            tool_number: currentTool,
            operation_type: classifyOperationType(currentCannedCycle, currentToolType, currentCutterComp !== "none", lastComment),
            spindle_rpm: currentRPM,
            feed_rate: currentFeed,
            feed_unit: unit === "inch" ? "ipm" : "mmpm",
            canned_cycle: currentCannedCycle,
            cutter_comp: currentCutterComp,
            coolant: currentCoolant,
            work_offset: currentWorkOffset,
            start_line: opStartLine,
            end_line: i,
            z_levels: currentZLevels.length > 0 ? [...currentZLevels] : undefined,
            comment: lastComment,
          });
        }

        // Start new operation
        currentTool = parseInt(toolChangeMatch[1] || toolChangeMatch[2]);
        const toolInfo = tools.find(t => t.tool_number === currentTool);
        currentToolType = toolInfo?.type || "unknown";
        opStartLine = i + 1;
        currentCannedCycle = undefined;
        currentCutterComp = "none";
        currentZLevels = [];
        lastComment = "";
      }

      // Spindle speed
      const rpmMatch = line.match(/S(\d+)/);
      if (rpmMatch) currentRPM = parseInt(rpmMatch[1]);

      // Feed rate
      const feedMatch = line.match(/F([\d.]+)/);
      if (feedMatch) currentFeed = parseFloat(feedMatch[1]);

      // Canned cycles
      if (line.includes("G81")) currentCannedCycle = "G81";
      if (line.includes("G83")) currentCannedCycle = "G83";
      if (line.includes("G73")) currentCannedCycle = "G73";
      if (line.includes("G84")) currentCannedCycle = "G84";
      if (line.includes("G85")) currentCannedCycle = "G85";

      // Cutter compensation
      if (line.includes("G41")) currentCutterComp = "G41";
      if (line.includes("G42")) currentCutterComp = "G42";
      if (line.includes("G40")) currentCutterComp = "none";

      // Coolant
      if (line.includes("M8") || line.includes("M08")) currentCoolant = "flood";
      if (line.includes("M7") || line.includes("M07")) currentCoolant = "mist";
      if (line.includes("M9") || line.includes("M09")) currentCoolant = "none";

      // Work offset
      const woMatch = line.match(/(G5[4-9]|G59\.[1-3])/);
      if (woMatch) currentWorkOffset = woMatch[1];

      // Z-level tracking for roughing passes
      const zMatch = line.match(/G[01]\s+Z(-?[\d.]+)/i);
      if (zMatch && currentTool !== null) {
        const z = parseFloat(zMatch[1]);
        if (z < 0 && !currentZLevels.includes(z)) {
          currentZLevels.push(z);
        }
      }
    }

    // Save final operation
    if (currentTool !== null && opStartLine > 0) {
      operations.push({
        tool_number: currentTool,
        operation_type: classifyOperationType(currentCannedCycle, currentToolType, currentCutterComp !== "none", lastComment),
        spindle_rpm: currentRPM,
        feed_rate: currentFeed,
        feed_unit: unit === "inch" ? "ipm" : "mmpm",
        canned_cycle: currentCannedCycle,
        cutter_comp: currentCutterComp,
        coolant: currentCoolant,
        work_offset: currentWorkOffset,
        start_line: opStartLine,
        end_line: lines.length,
        z_levels: currentZLevels.length > 0 ? [...currentZLevels] : undefined,
        comment: lastComment,
      });
    }

    const parsed: ParsedProgram = {
      program_number: programNumber,
      program_name: programName,
      date,
      time,
      source_file: sourcePath,
      material,
      material_iso: materialIso,
      unit,
      tools,
      operations,
      total_lines: lines.length,
      warnings,
    };

    // Cache for future reference
    if (sourcePath) {
      this.programCache.set(sourcePath, parsed);
    }

    return parsed;
  }

  // --------------------------------------------------------------------------
  // PATTERN EXTRACTION
  // --------------------------------------------------------------------------

  /**
   * Extract patterns from multiple parsed programs.
   */
  extractPatterns(programs: ParsedProgram[]): MillingPattern[] {
    const newPatterns: MillingPattern[] = [];
    const paramGroups = new Map<string, {
      rpms: number[];
      feeds: number[];
      docs: number[];
      programs: string[];
      customers: string[];
    }>();

    for (const prog of programs) {
      const customer = this.extractCustomer(prog.source_file || "");

      for (const op of prog.operations) {
        const tool = prog.tools.find(t => t.tool_number === op.tool_number);
        if (!tool) continue;

        // Build pattern key: operation_type + tool_type + material_iso
        const key = `${op.operation_type}-${tool.type}-${prog.material_iso || "P"}`;

        if (!paramGroups.has(key)) {
          paramGroups.set(key, {
            rpms: [], feeds: [], docs: [],
            programs: [], customers: [],
          });
        }

        const group = paramGroups.get(key)!;
        if (op.spindle_rpm > 0) group.rpms.push(op.spindle_rpm);
        if (op.feed_rate > 0) group.feeds.push(op.feed_rate);
        if (op.z_levels && op.z_levels.length > 1) {
          const doc = Math.abs(op.z_levels[1] - op.z_levels[0]);
          group.docs.push(doc);
        }
        if (prog.program_name && !group.programs.includes(prog.program_name)) {
          group.programs.push(prog.program_name);
        }
        if (customer && !group.customers.includes(customer)) {
          group.customers.push(customer);
        }
      }
    }

    // Convert groups to patterns
    for (const [key, group] of paramGroups) {
      if (group.rpms.length < 2) continue; // Need multiple occurrences

      const [opType, toolType, materialIso] = key.split("-");
      const avgRPM = group.rpms.reduce((a, b) => a + b, 0) / group.rpms.length;
      const avgFeed = group.feeds.reduce((a, b) => a + b, 0) / group.feeds.length;
      const avgDOC = group.docs.length > 0
        ? group.docs.reduce((a, b) => a + b, 0) / group.docs.length
        : undefined;

      newPatterns.push({
        pattern_id: `LEARNED-${key}-${Date.now()}`,
        pattern_type: "cutting_params",
        operation_type: opType as OperationType,
        tool_profile: {
          type: toolType as ToolType,
          diameter_mm: 0, // Would need more data to determine
        },
        cutting_params: {
          rpm_min: Math.min(...group.rpms),
          rpm_max: Math.max(...group.rpms),
          rpm_typical: Math.round(avgRPM),
          feed_min: Math.min(...group.feeds),
          feed_max: Math.max(...group.feeds),
          feed_typical: Math.round(avgFeed * 10) / 10,
          doc_mm: avgDOC ? avgDOC * 25.4 : undefined, // Convert to mm
        },
        material_iso: materialIso,
        confidence: Math.min(0.5 + group.rpms.length * 0.05, 0.95),
        occurrence_count: group.rpms.length,
        source_programs: group.programs,
        learned_from_customers: group.customers,
      });
    }

    return newPatterns;
  }

  /**
   * Extract customer name from file path.
   */
  private extractCustomer(path: string): string {
    const parts = path.split(/[/\\]/);
    const haasIdx = parts.findIndex(p => p.toUpperCase().includes("HAAS") || p.toUpperCase().includes("HURCO"));
    if (haasIdx >= 0 && haasIdx < parts.length - 1) {
      return parts[haasIdx + 1];
    }
    return "";
  }

  // --------------------------------------------------------------------------
  // PATTERN RECOMMENDATIONS
  // --------------------------------------------------------------------------

  /**
   * Recommend cutting parameters based on operation and material.
   */
  recommendParams(
    operation: OperationType,
    material_iso: string,
    tool_diameter_mm?: number
  ): MillingPattern[] {
    const matches = this.learnedPatterns.filter(p => {
      if (p.operation_type !== operation) return false;
      if (p.material_iso !== material_iso) return false;
      if (tool_diameter_mm && p.tool_profile.diameter_mm > 0) {
        // Allow 20% diameter tolerance
        const ratio = p.tool_profile.diameter_mm / tool_diameter_mm;
        if (ratio < 0.8 || ratio > 1.2) return false;
      }
      return true;
    });

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Recommend operation sequence based on part features.
   */
  recommendSequence(
    features: string[],
    material_iso: string
  ): OperationSequencePattern[] {
    // Map features to operations
    const neededOps = new Set<OperationType>();
    for (const f of features) {
      const fl = f.toLowerCase();
      if (fl.includes("face") || fl.includes("top")) neededOps.add("face");
      if (fl.includes("pocket")) {
        neededOps.add("rough_pocket");
        neededOps.add("finish_pocket");
      }
      if (fl.includes("profile") || fl.includes("contour")) {
        neededOps.add("rough_profile");
        neededOps.add("finish_profile");
      }
      if (fl.includes("hole") || fl.includes("drill")) {
        neededOps.add("spot_drill");
        neededOps.add("drill");
      }
      if (fl.includes("thread") || fl.includes("tap")) {
        neededOps.add("spot_drill");
        neededOps.add("peck_drill");
        neededOps.add("tap");
      }
      if (fl.includes("chamfer")) neededOps.add("chamfer");
    }

    // Find sequences that contain the needed operations
    const matches = this.sequencePatterns.filter(seq => {
      const seqOps = new Set(seq.operations);
      // Sequence must contain at least 50% of needed operations
      const overlap = [...neededOps].filter(op => seqOps.has(op)).length;
      return overlap >= neededOps.size * 0.5;
    });

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze a program and provide recommendations.
   */
  analyzeProgram(ncCode: string, sourcePath?: string): ProgramAnalysis {
    const program = this.parseProgram(ncCode, sourcePath);
    const recommendations: PatternRecommendation[] = [];

    // Find matching patterns for each operation
    const matchedPatterns: MillingPattern[] = [];
    for (const op of program.operations) {
      const tool = program.tools.find(t => t.tool_number === op.tool_number);
      const matches = this.recommendParams(
        op.operation_type,
        program.material_iso || "P",
        tool?.diameter_mm
      );
      matchedPatterns.push(...matches.slice(0, 2));

      // Check if params are within proven ranges
      if (matches.length > 0) {
        const best = matches[0];
        if (op.spindle_rpm < best.cutting_params.rpm_min * 0.8 ||
            op.spindle_rpm > best.cutting_params.rpm_max * 1.2) {
          recommendations.push({
            category: "speed_feed",
            priority: "recommended",
            title: `RPM outside proven range for ${op.operation_type}`,
            description: `Current: ${op.spindle_rpm} RPM. Proven range: ${best.cutting_params.rpm_min}-${best.cutting_params.rpm_max} RPM.`,
            based_on: best.source_programs,
            confidence: best.confidence,
          });
        }
      }
    }

    // Check operation sequence
    const opSequence = program.operations.map(o => o.operation_type);
    const seqMatches = this.sequencePatterns.filter(seq => {
      // Check if program follows any proven sequence
      let seqIdx = 0;
      for (const op of opSequence) {
        if (seq.operations[seqIdx] === op) seqIdx++;
        if (seqIdx >= seq.operations.length) return true;
      }
      return false;
    });

    if (seqMatches.length === 0 && program.operations.length >= 3) {
      recommendations.push({
        category: "operation_order",
        priority: "suggestion",
        title: "Operation sequence differs from proven patterns",
        description: `Consider standard sequences like: Face → Rough → Finish → Drill → Tap`,
        based_on: ["JM Die proven sequences"],
        confidence: 0.7,
      });
    }

    // Calculate statistics
    const stats: ProgramStatistics = {
      tool_count: program.tools.length,
      operation_count: program.operations.length,
      z_level_passes: program.operations.reduce((sum, op) => sum + (op.z_levels?.length || 0), 0),
      cutter_comp_usage: program.operations.some(op => op.cutter_comp !== "none"),
      canned_cycle_count: program.operations.filter(op => op.canned_cycle).length,
    };

    return {
      program,
      patterns: matchedPatterns,
      sequence_patterns: seqMatches,
      recommendations,
      statistics: stats,
    };
  }

  // --------------------------------------------------------------------------
  // LEARNING
  // --------------------------------------------------------------------------

  /**
   * Learn from a successful program run.
   */
  learnFromProgram(ncCode: string, metadata: {
    source_path: string;
    actual_cycle_time_min?: number;
    tool_life_achieved?: number;
    surface_finish_ra?: number;
    success: boolean;
  }): void {
    if (!metadata.success) return;

    const program = this.parseProgram(ncCode, metadata.source_path);
    const customer = this.extractCustomer(metadata.source_path);

    // Extract new patterns from this program
    const newPatterns = this.extractPatterns([program]);

    // Merge with existing patterns
    for (const newP of newPatterns) {
      const existing = this.learnedPatterns.find(p =>
        p.operation_type === newP.operation_type &&
        p.tool_profile.type === newP.tool_profile.type &&
        p.material_iso === newP.material_iso
      );

      if (existing) {
        // Update existing pattern with new data
        existing.occurrence_count += newP.occurrence_count;
        existing.confidence = Math.min(existing.confidence + 0.02, 0.98);
        if (!existing.source_programs.includes(program.program_name)) {
          existing.source_programs.push(program.program_name);
        }
        if (customer && !existing.learned_from_customers.includes(customer)) {
          existing.learned_from_customers.push(customer);
        }
      } else {
        // Add new pattern
        this.learnedPatterns.push(newP);
      }
    }

    // Learn sequence pattern
    const opSeq = program.operations.map(o => o.operation_type);
    const existingSeq = this.sequencePatterns.find(s =>
      s.operations.length === opSeq.length &&
      s.operations.every((op, i) => op === opSeq[i])
    );

    if (existingSeq) {
      existingSeq.frequency++;
      existingSeq.confidence = Math.min(existingSeq.confidence + 0.01, 0.98);
    } else if (opSeq.length >= 2) {
      this.sequencePatterns.push({
        sequence_id: `LEARNED-SEQ-${Date.now()}`,
        operations: opSeq,
        frequency: 1,
        typical_materials: program.material_iso ? [program.material_iso] : [],
        source_programs: [program.program_name],
        confidence: 0.5,
      });
    }

    log.info(`[MillingPatternEngine] Learned from program: ${program.program_name}`);
  }

  // --------------------------------------------------------------------------
  // GETTERS
  // --------------------------------------------------------------------------

  /** Get all learned patterns. */
  getAllPatterns(): MillingPattern[] {
    return [...this.learnedPatterns];
  }

  /** Get all sequence patterns. */
  getAllSequences(): OperationSequencePattern[] {
    return [...this.sequencePatterns];
  }

  /** Get JM Die proven patterns only. */
  getJMDieProvenPatterns(): MillingPattern[] {
    return this.learnedPatterns.filter(p => p.pattern_id.startsWith("STEEL-") || p.pattern_id.startsWith("ALUM-"));
  }

  /** Get pattern count statistics. */
  getStatistics(): {
    total_patterns: number;
    jm_die_proven: number;
    learned: number;
    sequences: number;
  } {
    const jmDieCount = this.learnedPatterns.filter(p =>
      p.pattern_id.startsWith("STEEL-") || p.pattern_id.startsWith("ALUM-")
    ).length;

    return {
      total_patterns: this.learnedPatterns.length,
      jm_die_proven: jmDieCount,
      learned: this.learnedPatterns.length - jmDieCount,
      sequences: this.sequencePatterns.length,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millingProgramPatternEngine = new MillingProgramPatternEngine();
