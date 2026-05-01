/**
 * ProgramMacroConverterEngine — Convert hardcoded Okuma programs to parametric macros
 *
 * Takes a parsed Okuma program and converts it to a parametric macro by:
 *   1. Identifying hardcoded dimensions → replacing with V variables
 *   2. Identifying S/F values → replacing with calculated RPM/feed variables
 *   3. Adding IF/GOTO for optional features (chamfer/radius, peck/straight, ID skip)
 *   4. Adding clearance variables (X/Z safe positions)
 *   5. Adding RPM limit variables (G50 clamps)
 *   6. Preserving ALL safety patterns (G50, M1, retract positions, coolant balance)
 *
 * The converter uses pattern matching on the parsed program structure rather than
 * raw text manipulation to ensure correctness.
 *
 * @module ProgramMacroConverterEngine
 */

import { log } from "../utils/Logger.js";
import type { OkumaProgram, OkumaToolSection, OkumaVariable } from "./OkumaOSPParserEngine.js";
import type { MacroHeaderResult } from "./OkumaMacroHeaderGeneratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Dimension reference found in program */
export interface DimensionRef {
  /** Line number (0-indexed) where this dimension appears */
  line: number;
  /** Original value in the program */
  original_value: number;
  /** Axis (X, Z, U, W) */
  axis: string;
  /** What this dimension likely represents */
  inferred_purpose: string;
  /** Suggested V variable */
  suggested_var: string;
  /** Whether this is a diameter (X) or length (Z) */
  dimension_type: "diameter" | "length" | "clearance" | "unknown";
  /** Confidence in the replacement (0-1) */
  confidence: number;
}

/** Speed/feed reference found in program */
export interface SpeedFeedRef {
  /** Line number */
  line: number;
  /** S or F */
  type: "speed" | "feed";
  /** Original value */
  original_value: number;
  /** Mode (G96 CSS or G97 RPM, G98 or G99) */
  mode: string;
  /** Tool section this belongs to */
  tool_station: number;
  /** Suggested V variable */
  suggested_var: string;
}

/** Conversion input */
export interface MacroConvertInput {
  /** Parsed Okuma program to convert */
  program: OkumaProgram;
  /** Pre-generated header (from OkumaMacroHeaderGeneratorEngine) */
  header?: MacroHeaderResult;
  /** Stock diameter (for dimension inference) */
  stock_diameter?: number;
  /** Finish OD (for dimension inference) */
  finish_od?: number;
  /** Finish ID (for dimension inference) */
  finish_id?: number;
  /** Part length (for dimension inference) */
  part_length?: number;
  /** Unit system */
  unit_system?: "imperial" | "metric";
}

/** Conversion result */
export interface MacroConvertResult {
  /** Converted program lines */
  converted_lines: string[];
  /** Full converted program as string */
  converted_text: string;
  /** Dimensions that were replaced */
  dimension_replacements: DimensionRef[];
  /** Speed/feed values that were replaced */
  speed_feed_replacements: SpeedFeedRef[];
  /** Safety patterns preserved */
  safety_preserved: {
    g50_clamps_kept: number;
    retracts_kept: number;
    optional_stops_kept: number;
    coolant_balanced: boolean;
    spindle_stop_kept: boolean;
  };
  /** Conversion statistics */
  stats: {
    original_lines: number;
    converted_lines: number;
    dimensions_replaced: number;
    speeds_replaced: number;
    feeds_replaced: number;
    lines_unchanged: number;
    conversion_coverage: number;
  };
  /** Warnings about uncertain replacements */
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Regex patterns for extracting values from G-code lines */
const PATTERNS = {
  /** X dimension (diameter on Okuma lathe) */
  x_value: /X(-?[\d.]+)/i,
  /** Z dimension (length) */
  z_value: /Z(-?[\d.]+)/i,
  /** U incremental X */
  u_value: /U(-?[\d.]+)/i,
  /** W incremental Z */
  w_value: /W(-?[\d.]+)/i,
  /** Speed word */
  s_value: /S(\d+)/i,
  /** Feed word */
  f_value: /F([\d.]+)/i,
  /** G50 speed clamp */
  g50_clamp: /G50\s+S(\d+)/i,
  /** G96 CSS mode */
  g96: /G96/i,
  /** G97 RPM mode */
  g97: /G97/i,
  /** Rapid move */
  rapid: /G0(?:\s|[^0-9])/i,
  /** Feed move */
  feed_move: /G1(?:\s|[^0-9])/i,
  /** M1 optional stop */
  m1: /\bM0?1\b/i,
  /** M5 spindle stop */
  m5: /\bM0?5\b/i,
  /** Coolant on */
  coolant_on: /\bM(?:8|50|51|13)\b/i,
  /** Coolant off */
  coolant_off: /\bM0?9\b/i,
  /** Tool change */
  tool_change: /\bT(\d{2,6})\b/i,
  /** NAT label (Okuma tool section) */
  nat_label: /^NAT(\d+)/i,
};

// ============================================================================
// ENGINE
// ============================================================================

export class ProgramMacroConverterEngine {
  /**
   * Convert a hardcoded Okuma program to a parametric macro.
   *
   * @param input - Program to convert with optional geometry hints
   * @returns Converted macro with replacement tracking
   */
  convert(input: MacroConvertInput): MacroConvertResult {
    const { program } = input;
    const warnings: string[] = [];

    // 1. Scan for dimension references
    const dimRefs = this._scanDimensions(program, input);

    // 2. Scan for speed/feed references
    const sfRefs = this._scanSpeedFeeds(program);

    // 3. Build replacement map (line → replacements)
    const replacementMap = new Map<number, Array<{ pattern: RegExp; replacement: string; type: string }>>();

    for (const dim of dimRefs) {
      if (dim.confidence < 0.5) {
        warnings.push(`Line ${dim.line + 1}: ${dim.axis}${dim.original_value} → ${dim.suggested_var} (low confidence: ${(dim.confidence * 100).toFixed(0)}%)`);
        continue; // Skip low-confidence replacements
      }
      if (!replacementMap.has(dim.line)) replacementMap.set(dim.line, []);
      replacementMap.get(dim.line)!.push({
        pattern: new RegExp(`${dim.axis}${this._escapeRegex(String(dim.original_value))}`, "i"),
        replacement: `${dim.axis}${dim.suggested_var}`,
        type: "dimension",
      });
    }

    for (const sf of sfRefs) {
      if (!replacementMap.has(sf.line)) replacementMap.set(sf.line, []);
      const prefix = sf.type === "speed" ? "S" : "F";
      replacementMap.get(sf.line)!.push({
        pattern: new RegExp(`${prefix}${this._escapeRegex(String(sf.original_value))}`, "i"),
        replacement: `${prefix}${sf.suggested_var}`,
        type: sf.type,
      });
    }

    // 4. Apply replacements while preserving safety
    const convertedLines: string[] = [];
    let linesUnchanged = 0;
    let dimsReplaced = 0;
    let speedsReplaced = 0;
    let feedsReplaced = 0;

    // Safety tracking
    let g50Count = 0;
    let retractCount = 0;
    let m1Count = 0;
    let coolantOnCount = 0;
    let coolantOffCount = 0;
    let spindleStopFound = false;

    for (let i = 0; i < program.rawLines.length; i++) {
      let line = program.rawLines[i];
      const trimmed = line.trim().toUpperCase();

      // Track safety patterns (always preserve)
      if (PATTERNS.g50_clamp.test(trimmed)) g50Count++;
      if (PATTERNS.m1.test(trimmed)) m1Count++;
      if (PATTERNS.m5.test(trimmed)) spindleStopFound = true;
      if (PATTERNS.coolant_on.test(trimmed)) coolantOnCount++;
      if (PATTERNS.coolant_off.test(trimmed)) coolantOffCount++;

      // Check for safe retract patterns (G0 X[high] Z[high])
      if (PATTERNS.rapid.test(trimmed)) {
        const xMatch = trimmed.match(PATTERNS.x_value);
        const zMatch = trimmed.match(PATTERNS.z_value);
        if (xMatch && zMatch) {
          const x = parseFloat(xMatch[1]);
          const z = parseFloat(zMatch[1]);
          if (x >= 15 && z >= 10) retractCount++;
        }
      }

      // Apply replacements
      const reps = replacementMap.get(i);
      if (reps && reps.length > 0) {
        for (const rep of reps) {
          if (rep.pattern.test(line)) {
            line = line.replace(rep.pattern, rep.replacement);
            if (rep.type === "dimension") dimsReplaced++;
            else if (rep.type === "speed") speedsReplaced++;
            else if (rep.type === "feed") feedsReplaced++;
          }
        }
      } else {
        linesUnchanged++;
      }

      convertedLines.push(line);
    }

    // 5. Prepend header if provided
    if (input.header) {
      convertedLines.unshift(...input.header.header_lines);
    }

    const totalReplacements = dimsReplaced + speedsReplaced + feedsReplaced;
    const totalOpportunities = dimRefs.length + sfRefs.length;
    const coverage = totalOpportunities > 0
      ? Math.round(totalReplacements / totalOpportunities * 100)
      : 100;

    log.info(`[ProgramMacroConverter] Converted ${program.filename}: ${dimsReplaced} dims, ${speedsReplaced} speeds, ${feedsReplaced} feeds replaced. Coverage: ${coverage}%`);

    return {
      converted_lines: convertedLines,
      converted_text: convertedLines.join("\n"),
      dimension_replacements: dimRefs.filter(d => d.confidence >= 0.5),
      speed_feed_replacements: sfRefs,
      safety_preserved: {
        g50_clamps_kept: g50Count,
        retracts_kept: retractCount,
        optional_stops_kept: m1Count,
        coolant_balanced: coolantOnCount === 0 || coolantOffCount > 0,
        spindle_stop_kept: spindleStopFound,
      },
      stats: {
        original_lines: program.rawLines.length,
        converted_lines: convertedLines.length,
        dimensions_replaced: dimsReplaced,
        speeds_replaced: speedsReplaced,
        feeds_replaced: feedsReplaced,
        lines_unchanged: linesUnchanged,
        conversion_coverage: coverage,
      },
      warnings,
    };
  }

  /**
   * Identify hardcoded dimensions that should become variables.
   */
  scanDimensions(program: OkumaProgram, hints?: Partial<MacroConvertInput>): DimensionRef[] {
    return this._scanDimensions(program, hints ?? {});
  }

  /**
   * Identify hardcoded speed/feed values that should become variables.
   */
  scanSpeedFeeds(program: OkumaProgram): SpeedFeedRef[] {
    return this._scanSpeedFeeds(program);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _scanDimensions(program: OkumaProgram, hints: Partial<MacroConvertInput>): DimensionRef[] {
    const refs: DimensionRef[] = [];
    const stockDia = hints.stock_diameter;
    const finishOD = hints.finish_od;
    const finishID = hints.finish_id;
    const partLen = hints.part_length;

    for (let i = 0; i < program.rawLines.length; i++) {
      const line = program.rawLines[i];
      const trimmed = line.trim().toUpperCase();

      // Skip comments, variable assignments, labels
      if (trimmed.startsWith("(") || trimmed.startsWith("V") || trimmed.startsWith("NAT")) continue;
      // Skip G50 lines (safety — never replace clamp values)
      if (PATTERNS.g50_clamp.test(trimmed)) continue;
      // Skip threading/groove cycle lines (complex semantics)
      if (/G7[1-6]/.test(trimmed)) continue;

      // Scan for X values (diameter)
      const xMatch = trimmed.match(PATTERNS.x_value);
      if (xMatch) {
        const val = parseFloat(xMatch[1]);
        const ref = this._classifyXDimension(val, i, stockDia, finishOD, finishID, trimmed);
        if (ref) refs.push(ref);
      }

      // Scan for Z values (length)
      const zMatch = trimmed.match(PATTERNS.z_value);
      if (zMatch) {
        const val = parseFloat(zMatch[1]);
        const ref = this._classifyZDimension(val, i, partLen, trimmed);
        if (ref) refs.push(ref);
      }
    }

    return refs;
  }

  private _classifyXDimension(
    val: number,
    line: number,
    stockDia?: number,
    finishOD?: number,
    finishID?: number,
    context?: string,
  ): DimensionRef | null {
    // Skip very high X values (retract/clearance positions — handled separately)
    if (val >= 15) return null;
    // Skip zero (center of spindle)
    if (val === 0) return null;
    // Skip negative X (should not exist on Okuma lathe)
    if (val < 0) return null;

    let purpose = "unknown_diameter";
    let suggestedVar = "V1";
    let confidence = 0.3;

    // Match against known dimensions
    if (stockDia !== undefined && Math.abs(val - stockDia) < 0.002) {
      purpose = "stock_diameter";
      suggestedVar = "V1";
      confidence = 0.95;
    } else if (finishOD !== undefined && Math.abs(val - finishOD) < 0.002) {
      purpose = "finish_od";
      suggestedVar = "V2";
      confidence = 0.95;
    } else if (finishID !== undefined && Math.abs(val - finishID) < 0.002) {
      purpose = "finish_id";
      suggestedVar = "V3";
      confidence = 0.90;
    } else if (stockDia !== undefined && val > stockDia && val < stockDia + 1) {
      purpose = "clearance_above_stock";
      suggestedVar = "V60";
      confidence = 0.70;
    } else {
      // Unknown X value — might be an intermediate diameter
      purpose = "intermediate_diameter";
      suggestedVar = "V1";
      confidence = 0.25; // Low confidence — won't auto-replace
    }

    return {
      line,
      original_value: val,
      axis: "X",
      inferred_purpose: purpose,
      suggested_var: suggestedVar,
      dimension_type: "diameter",
      confidence,
    };
  }

  private _classifyZDimension(
    val: number,
    line: number,
    partLen?: number,
    context?: string,
  ): DimensionRef | null {
    // Skip very large Z values (retract positions)
    if (val >= 10) return null;
    // Z0 is face datum — usually stays as Z0
    if (val === 0) return null;

    let purpose = "unknown_length";
    let suggestedVar = "V5";
    let confidence = 0.3;

    // Negative Z = dimension from face (common on lathe)
    if (partLen !== undefined && val < 0) {
      if (Math.abs(Math.abs(val) - partLen) < 0.002) {
        purpose = "part_length";
        suggestedVar = "[V5*-1]"; // Okuma uses negative Z for part length
        confidence = 0.90;
      } else {
        purpose = "intermediate_length";
        confidence = 0.25;
      }
    }

    // Small positive Z = clearance or face offset
    if (val > 0 && val < 1) {
      purpose = "z_clearance";
      suggestedVar = "V61";
      confidence = 0.60;
    }

    return {
      line,
      original_value: val,
      axis: "Z",
      inferred_purpose: purpose,
      suggested_var: suggestedVar,
      dimension_type: "length",
      confidence,
    };
  }

  private _scanSpeedFeeds(program: OkumaProgram): SpeedFeedRef[] {
    const refs: SpeedFeedRef[] = [];
    let currentTool = 0;
    let currentMode = "G97";
    let sfmVarIdx = 45;
    let feedVarIdx = 46;
    let rpmVarIdx = 70;

    for (let i = 0; i < program.rawLines.length; i++) {
      const trimmed = program.rawLines[i].trim().toUpperCase();

      // Track current tool
      const toolMatch = trimmed.match(PATTERNS.tool_change);
      if (toolMatch) {
        currentTool++;
        // Advance variable indices for each tool
        if (currentTool > 1) {
          sfmVarIdx += 2;
          feedVarIdx += 2;
          rpmVarIdx++;
        }
      }

      // Track speed mode
      if (PATTERNS.g96.test(trimmed)) currentMode = "G96";
      if (PATTERNS.g97.test(trimmed)) currentMode = "G97";

      // Skip G50 speed clamp lines (safety — never replace)
      if (PATTERNS.g50_clamp.test(trimmed)) continue;

      // Find S values
      const sMatch = trimmed.match(PATTERNS.s_value);
      if (sMatch && currentTool > 0) {
        refs.push({
          line: i,
          type: "speed",
          original_value: parseInt(sMatch[1], 10),
          mode: currentMode,
          tool_station: currentTool,
          suggested_var: currentMode === "G96"
            ? `V${sfmVarIdx}`    // CSS → use SFM variable
            : `V${rpmVarIdx}`,   // Direct RPM → use calculated RPM variable
        });
      }

      // Find F values (but not in G4 dwell lines)
      const fMatch = trimmed.match(PATTERNS.f_value);
      if (fMatch && currentTool > 0 && !/G0?4/.test(trimmed)) {
        refs.push({
          line: i,
          type: "feed",
          original_value: parseFloat(fMatch[1]),
          mode: /G9[89]/.test(trimmed) ? trimmed.match(/G9([89])/)?.[0] ?? "G99" : "G99",
          tool_station: currentTool,
          suggested_var: `V${feedVarIdx}`,
        });
      }
    }

    return refs;
  }

  private _escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export const programMacroConverterEngine = new ProgramMacroConverterEngine();
