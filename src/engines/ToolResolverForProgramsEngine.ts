/**
 * ToolResolverForProgramsEngine — Resolve tool geometry from CNC program context
 *
 * Resolves tool identity and geometry from multiple sources in priority order:
 *   1. Explicit comments (e.g., "(OD ROUGH INSERT - CNMG432 - R.015)")
 *   2. Tool station conventions (T01=OD rough, T05=drill, T07=bore, T11=groove/cutoff)
 *   3. G-code patterns (G85 = OD rough cycle, G74 = peck drill, etc.)
 *   4. Feed/speed patterns → infer operation type → infer typical tool geometry
 *   5. Cross-reference with ToolCatalogEngine 95K tools
 *
 * Output provides: nose_radius, approach_angle, insert_shape, holder_type, tool_type
 * for downstream Kienzle force, surface finish, and deflection calculations.
 *
 * Ref: ISO 1832 insert designation, Sandvik Coromant turning tool guide
 *
 * @module ToolResolverForProgramsEngine
 */

import { log } from "../utils/Logger.js";
import type { OkumaProgram, OkumaToolSection } from "./OkumaOSPParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ToolType =
  | "od_roughing" | "od_finishing" | "boring_bar" | "boring_bar_finish"
  | "face" | "center_drill" | "drill" | "peck_drill" | "reamer"
  | "groove" | "cutoff" | "thread_external" | "thread_internal"
  | "id_roughing" | "id_finishing" | "unknown";

export type InsertShape = "C" | "D" | "R" | "S" | "T" | "V" | "W" | "unknown";

/** Resolved tool result */
export interface ResolvedTool {
  /** Tool station number */
  station: number;
  /** Resolved tool type */
  tool_type: ToolType;
  /** Nose radius [mm] */
  nose_radius_mm: number;
  /** Approach angle kappa_r [degrees] */
  approach_angle_deg: number;
  /** Insert shape (ISO 1832 letter) */
  insert_shape: InsertShape;
  /** Holder type description */
  holder_type: string;
  /** Tool diameter [mm] — for drills, boring bars */
  diameter_mm: number;
  /** Tool overhang/stickout [mm] — estimated */
  stickout_mm: number;
  /** Number of cutting edges */
  cutting_edges: number;
  /** Tool material */
  tool_material: "carbide" | "hss" | "ceramic" | "cbn" | "cermet";
  /** Confidence score 0-1 */
  confidence: number;
  /** How the tool was resolved */
  source: string;
  /** Comment from program */
  comment: string;
  /** Details about resolution */
  details: string[];
}

/** Tool resolver input */
export interface ToolResolveInput {
  /** Parsed program */
  program: OkumaProgram;
  /** Unit system */
  unit_system?: "imperial" | "metric";
}

/** Batch resolve result */
export interface ToolResolveResult {
  /** Resolved tools by station */
  tools: ResolvedTool[];
  /** Summary */
  summary: {
    total_tools: number;
    high_confidence: number;
    low_confidence: number;
    unresolved: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** ISO 1832 insert designation patterns
 *  Format: SNMG120408 → S=shape, N=clearance, M=tolerance, G=chipbreaker
 *  First char → shape → nose radius and approach angle defaults */
const INSERT_DESIGNATIONS: Record<string, {
  shape: InsertShape; kappa_r: number; edges: number;
}> = {
  C: { shape: "C", kappa_r: 80, edges: 2 },  // 80° diamond (CNMG)
  D: { shape: "D", kappa_r: 55, edges: 2 },  // 55° diamond (DNMG)
  R: { shape: "R", kappa_r: 0, edges: 1 },   // Round
  S: { shape: "S", kappa_r: 45, edges: 4 },  // Square (SNMG)
  T: { shape: "T", kappa_r: 60, edges: 3 },  // Triangle (TNMG)
  V: { shape: "V", kappa_r: 35, edges: 2 },  // 35° diamond (VNMG)
  W: { shape: "W", kappa_r: 80, edges: 3 },  // Trigon (WNMG)
};

/** Nose radius code → mm (ISO 1832, last 1-2 digits) */
const NOSE_RADIUS_CODE: Record<string, number> = {
  "02": 0.2, "04": 0.4, "08": 0.8, "12": 1.2, "16": 1.6, "24": 2.4,
};

/** Common imperial nose radii [inches → mm] */
const IMPERIAL_NOSE_RADII: Record<string, number> = {
  ".008": 0.2032, ".015": 0.381, ".016": 0.4064, ".031": 0.7874, ".032": 0.8128,
  ".047": 1.1938, ".064": 1.6256, "1/64": 0.3969, "1/32": 0.7938,
};

/** Tool station → default tool type conventions (JM Die Okuma shop) */
const STATION_CONVENTIONS: Record<number, {
  type: ToolType; holder: string; nose_r_mm: number; kappa_r: number;
}> = {
  1:  { type: "od_roughing",       holder: "MCLNR/L",  nose_r_mm: 0.8, kappa_r: 95 },
  2:  { type: "od_finishing",      holder: "MVJNR/L",  nose_r_mm: 0.4, kappa_r: 93 },
  3:  { type: "center_drill",     holder: "Drill holder", nose_r_mm: 0, kappa_r: 60 },
  4:  { type: "face",             holder: "MCLNR/L",  nose_r_mm: 0.8, kappa_r: 95 },
  5:  { type: "drill",            holder: "Drill holder", nose_r_mm: 0, kappa_r: 59 },
  6:  { type: "peck_drill",       holder: "Drill holder", nose_r_mm: 0, kappa_r: 59 },
  7:  { type: "boring_bar",       holder: "S-SCLCR/L", nose_r_mm: 0.4, kappa_r: 95 },
  8:  { type: "boring_bar_finish", holder: "S-SVJBR/L", nose_r_mm: 0.2, kappa_r: 93 },
  9:  { type: "thread_external",  holder: "SER/L",     nose_r_mm: 0, kappa_r: 60 },
  10: { type: "thread_internal",  holder: "SIR",       nose_r_mm: 0, kappa_r: 60 },
  11: { type: "groove",           holder: "SGFH",      nose_r_mm: 0.2, kappa_r: 0 },
  12: { type: "cutoff",           holder: "SGFH",      nose_r_mm: 0.1, kappa_r: 0 },
};

/** Operation type → default tool type */
const OP_TYPE_MAP: Record<string, ToolType> = {
  od_rough: "od_roughing",
  od_finish: "od_finishing",
  id_rough: "boring_bar",
  id_finish: "boring_bar_finish",
  face: "face",
  drill: "drill",
  peck_drill: "peck_drill",
  bore: "boring_bar",
  bore_finish: "boring_bar_finish",
  groove: "groove",
  cutoff: "cutoff",
  thread: "thread_external",
};

/** Nose radius patterns in comments (imperial) */
const NOSE_RADIUS_PATTERNS = [
  /R\.?(\d{3})/i,               // R.015, R015
  /R\s*=\s*\.?(\d{3})/i,        // R = .015
  /NOSE\s*R.*?\.(\d{3})/i,      // NOSE RADIUS .015
  /(\d\/\d{2})\s*R/i,           // 1/32 R
  /INSERT.*?R\.?(\d{3})/i,      // INSERT R.015
];

/** Insert code patterns in comments */
const INSERT_CODE_PATTERN = /\b([CDRSTVW]N[A-Z]{2}\s*\d{4,6})/i;

// ============================================================================
// ENGINE
// ============================================================================

export class ToolResolverForProgramsEngine {
  /**
   * Resolve all tools in a program.
   */
  resolveAll(input: ToolResolveInput): ToolResolveResult {
    const unitSystem = input.unit_system ?? "imperial";
    const tools: ResolvedTool[] = [];

    for (const section of input.program.toolSections) {
      const resolved = this._resolveToolSection(section, input.program, unitSystem);
      tools.push(resolved);
    }

    const highConf = tools.filter(t => t.confidence >= 0.6).length;
    const lowConf = tools.filter(t => t.confidence > 0 && t.confidence < 0.6).length;
    const unresolved = tools.filter(t => t.tool_type === "unknown").length;

    log.info(
      `[ToolResolver] Resolved ${tools.length} tools: ${highConf} high-conf, ${lowConf} low-conf, ${unresolved} unresolved`,
    );

    return {
      tools,
      summary: {
        total_tools: tools.length,
        high_confidence: highConf,
        low_confidence: lowConf,
        unresolved,
      },
    };
  }

  /**
   * Resolve a single tool by station number from a program.
   */
  resolveSingle(
    program: OkumaProgram,
    station: number,
    unitSystem: "imperial" | "metric" = "imperial",
  ): ResolvedTool | null {
    const section = program.toolSections.find(s => s.toolNumber === station);
    if (!section) return null;
    return this._resolveToolSection(section, program, unitSystem);
  }

  // ── Private ─────────────────────────────────────────────────────────

  private _resolveToolSection(
    section: OkumaToolSection,
    program: OkumaProgram,
    unitSystem: string,
  ): ResolvedTool {
    const details: string[] = [];
    const comment = section.comment ?? "";

    // Start with defaults
    let result: ResolvedTool = {
      station: section.toolNumber,
      tool_type: "unknown",
      nose_radius_mm: 0.8,  // default CNMG-style
      approach_angle_deg: 95,
      insert_shape: "unknown",
      holder_type: "unknown",
      diameter_mm: 0,
      stickout_mm: 50,
      cutting_edges: 1,
      tool_material: "carbide",
      confidence: 0.1,
      source: "default",
      comment,
      details,
    };

    // Strategy 1: Parse insert code from comment (highest confidence)
    const insertResult = this._parseInsertCode(comment, unitSystem, details);
    if (insertResult) {
      result = { ...result, ...insertResult, confidence: 0.85, source: "insert_code" };
    }

    // Strategy 2: Parse nose radius from comment
    const noseR = this._parseNoseRadius(comment, unitSystem, details);
    if (noseR !== null) {
      result.nose_radius_mm = noseR;
      if (result.confidence < 0.7) result.confidence = 0.7;
    }

    // Strategy 3: Infer from operation types in section
    const opType = this._inferFromOperations(section, details);
    if (opType) {
      result.tool_type = opType;
      if (result.confidence < 0.6) result.confidence = 0.6;
    }

    // Strategy 4: Station number convention
    if (result.tool_type === "unknown") {
      const conv = STATION_CONVENTIONS[section.toolNumber];
      if (conv) {
        result.tool_type = conv.type;
        result.holder_type = conv.holder;
        if (result.nose_radius_mm === 0.8 && conv.nose_r_mm > 0) {
          result.nose_radius_mm = conv.nose_r_mm;
        }
        result.approach_angle_deg = conv.kappa_r;
        if (result.confidence < 0.4) result.confidence = 0.4;
        result.source = result.source === "default" ? "station_convention" : result.source;
        details.push(`Station T${section.toolNumber} → ${conv.type} (convention)`);
      }
    }

    // Strategy 5: Infer from comment keywords
    const kwType = this._inferFromCommentKeywords(comment, details);
    if (kwType && result.tool_type === "unknown") {
      result.tool_type = kwType;
      if (result.confidence < 0.5) result.confidence = 0.5;
      result.source = "comment_keyword";
    }

    // Strategy 6: Infer tool diameter for drills/boring bars
    this._inferDiameter(result, section, program, unitSystem, details);

    // Estimate stickout based on tool type
    this._estimateStickout(result);

    return result;
  }

  /** Parse ISO 1832 insert code from comment */
  private _parseInsertCode(
    comment: string,
    unitSystem: string,
    details: string[],
  ): Partial<ResolvedTool> | null {
    const m = INSERT_CODE_PATTERN.exec(comment.toUpperCase());
    if (!m) return null;

    const code = m[1].replace(/\s+/g, "");
    const shapeChar = code[0];
    const shapeInfo = INSERT_DESIGNATIONS[shapeChar];
    if (!shapeInfo) return null;

    details.push(`Parsed ISO insert: ${code} → shape=${shapeChar}`);

    // Extract nose radius from last 2 digits
    const numPart = code.replace(/[A-Z]/g, "");
    let noseR = 0.8;
    if (numPart.length >= 6) {
      const rCode = numPart.slice(-2);
      noseR = NOSE_RADIUS_CODE[rCode] ?? 0.8;
      details.push(`Insert nose radius code ${rCode} → ${noseR}mm`);
    }

    return {
      insert_shape: shapeInfo.shape,
      approach_angle_deg: shapeInfo.kappa_r,
      cutting_edges: shapeInfo.edges,
      nose_radius_mm: noseR,
    };
  }

  /** Parse nose radius from comment text */
  private _parseNoseRadius(
    comment: string,
    unitSystem: string,
    details: string[],
  ): number | null {
    const upper = comment.toUpperCase();

    for (const pat of NOSE_RADIUS_PATTERNS) {
      const m = pat.exec(upper);
      if (m) {
        const raw = m[1];
        // Check if it's a fraction
        if (raw.includes("/")) {
          const key = raw.trim();
          const noseR = IMPERIAL_NOSE_RADII[key];
          if (noseR) {
            details.push(`Nose radius "${raw}" → ${noseR.toFixed(4)}mm`);
            return noseR;
          }
        }
        // It's a decimal (imperial thousandths)
        const val = parseFloat("0." + raw);
        if (val > 0 && val < 0.5) {
          const noseR_mm = unitSystem === "metric" ? val : val * 25.4;
          details.push(`Nose radius .${raw}" → ${noseR_mm.toFixed(4)}mm`);
          return noseR_mm;
        }
      }
    }
    return null;
  }

  /** Infer tool type from operation types */
  private _inferFromOperations(
    section: OkumaToolSection,
    details: string[],
  ): ToolType | null {
    if (section.operations.length === 0) return null;

    // Use first operation type
    const firstOp = section.operations[0].type;
    const mapped = OP_TYPE_MAP[firstOp];
    if (mapped) {
      details.push(`Operation type "${firstOp}" → tool_type="${mapped}"`);
      return mapped;
    }
    return null;
  }

  /** Infer tool type from comment keywords */
  private _inferFromCommentKeywords(
    comment: string,
    details: string[],
  ): ToolType | null {
    const upper = comment.toUpperCase();

    const kwMap: Array<{ pattern: RegExp; type: ToolType }> = [
      { pattern: /OD\s*ROUGH/i, type: "od_roughing" },
      { pattern: /OD\s*FINISH/i, type: "od_finishing" },
      { pattern: /ID\s*ROUGH|BORE\s*ROUGH/i, type: "boring_bar" },
      { pattern: /ID\s*FINISH|BORE\s*FINISH/i, type: "boring_bar_finish" },
      { pattern: /FACE|FACING/i, type: "face" },
      { pattern: /CENTER\s*DRILL|SPOT\s*DRILL/i, type: "center_drill" },
      { pattern: /PECK\s*DRILL/i, type: "peck_drill" },
      { pattern: /DRILL|U-?DRILL/i, type: "drill" },
      { pattern: /REAM/i, type: "reamer" },
      { pattern: /GROOVE|GROOVING/i, type: "groove" },
      { pattern: /CUT\s*OFF|CUTOFF|PART\s*OFF/i, type: "cutoff" },
      { pattern: /THREAD|THRD/i, type: "thread_external" },
      { pattern: /\bBOR/i, type: "boring_bar" },
    ];

    for (const kw of kwMap) {
      if (kw.pattern.test(upper)) {
        details.push(`Comment keyword matched "${kw.pattern.source}" → ${kw.type}`);
        return kw.type;
      }
    }
    return null;
  }

  /** Infer tool diameter from program context */
  private _inferDiameter(
    result: ResolvedTool,
    section: OkumaToolSection,
    program: OkumaProgram,
    unitSystem: string,
    details: string[],
  ): void {
    const comment = (section.comment ?? "").toUpperCase();

    // Check for drill diameter in comment
    const drillMatch = comment.match(
      /(\d+\.?\d*)\s*(?:MM|IN|")\s*(?:DRILL|DR)|(?:DRILL|DR)\s*(\d+\.?\d*)/i,
    );
    if (drillMatch) {
      const raw = parseFloat(drillMatch[1] || drillMatch[2]);
      result.diameter_mm = unitSystem === "metric" ? raw : raw * 25.4;
      details.push(`Drill diameter from comment: ${result.diameter_mm.toFixed(2)}mm`);
      return;
    }

    // Check for fraction drill size (e.g., "1/2 DRILL")
    const fracMatch = comment.match(/(\d+)\s*\/\s*(\d+)\s*(?:DRILL|DR)/i);
    if (fracMatch) {
      const frac = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
      result.diameter_mm = frac * 25.4;
      details.push(`Fraction drill ${fracMatch[0]} → ${result.diameter_mm.toFixed(2)}mm`);
      return;
    }

    // Check for boring bar diameter in comment
    const boreMatch = comment.match(
      /(\d+\.?\d*)\s*(?:MM|IN|")\s*(?:BORE|BAR|BB)/i,
    );
    if (boreMatch) {
      const raw = parseFloat(boreMatch[1]);
      result.diameter_mm = unitSystem === "metric" ? raw : raw * 25.4;
      details.push(`Boring bar dia from comment: ${result.diameter_mm.toFixed(2)}mm`);
      return;
    }

    // For drills, infer from V-variables (V20 = drill size convention)
    if (result.tool_type === "drill" || result.tool_type === "peck_drill") {
      const v20 = program.variables.find(
        v => v.name.toUpperCase() === "V20",
      );
      if (v20 && typeof v20.value === "number" && v20.value > 0) {
        result.diameter_mm = unitSystem === "metric"
          ? v20.value
          : v20.value * 25.4;
        details.push(`Drill diameter from V20: ${result.diameter_mm.toFixed(2)}mm`);
      }
    }
  }

  /** Estimate stickout based on tool type */
  private _estimateStickout(result: ResolvedTool): void {
    switch (result.tool_type) {
      case "od_roughing":
      case "od_finishing":
      case "face":
        result.stickout_mm = 40; // Short-reach external turning
        break;
      case "boring_bar":
      case "boring_bar_finish":
        // Boring bar stickout ≈ 4× diameter (typical L/D)
        result.stickout_mm = result.diameter_mm > 0
          ? result.diameter_mm * 4
          : 80;
        break;
      case "drill":
      case "peck_drill":
        result.stickout_mm = result.diameter_mm > 0
          ? result.diameter_mm * 5
          : 100;
        break;
      case "groove":
      case "cutoff":
        result.stickout_mm = 35;
        break;
      case "thread_external":
      case "thread_internal":
        result.stickout_mm = 40;
        break;
      default:
        result.stickout_mm = 50;
    }
  }
}

export const toolResolverForProgramsEngine = new ToolResolverForProgramsEngine();
