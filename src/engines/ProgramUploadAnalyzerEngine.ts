/**
 * ProgramUploadAnalyzerEngine — U-BOX60
 *
 * Accepts any CNC program (.MIN/.nc/.tap/.hnc) and routes to the
 * appropriate dialect parser. Returns a unified analysis result with:
 * tool list, operation types, original S/F, cycle structure, and
 * material/workholding hints from comments.
 *
 * Supported dialects: Okuma OSP, Haas, Hurco, Roku-Roku (Mitsubishi)
 *
 * @module engines/ProgramUploadAnalyzerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type DetectedDialect = "okuma" | "haas" | "hurco" | "rokuroku" | "fanuc_generic" | "unknown";

export interface UploadAnalysisResult {
  filename: string;
  dialect: DetectedDialect;
  dialect_confidence: number;
  line_count: number;
  tool_list: AnalyzedTool[];
  operations: AnalyzedOperation[];
  original_speed_feeds: SpeedFeedEntry[];
  cycle_structure: CycleStructure;
  hints: ProgramHints;
  safety_warnings: string[];
  raw_parser_result: unknown;
}

export interface AnalyzedTool {
  station: number;
  description: string | null;
  offset_number: number | null;
  has_tlc: boolean;
  has_cutter_comp: boolean;
  operation_types: string[];
  speed_rpm: number | null;
  css_mode: boolean;
  feed_rate: number | null;
}

export interface AnalyzedOperation {
  tool_station: number;
  type: string;
  g_code: string;
  line_number: number;
}

export interface SpeedFeedEntry {
  tool_station: number;
  speed_rpm: number | null;
  css_sfm: number | null;
  feed_rate: number | null;
  g_code_context: string;
}

export interface CycleStructure {
  has_subprograms: boolean;
  has_macros: boolean;
  has_canned_cycles: boolean;
  has_threading: boolean;
  has_probing: boolean;
  tool_change_count: number;
}

export interface ProgramHints {
  material_hint: string | null;
  workholding_hint: string | null;
  stock_hint: string | null;
  unit_system: "imperial" | "metric" | "unknown";
}

// ============================================================================
// DIALECT DETECTION
// ============================================================================

const DIALECT_SIGNATURES: Array<{ dialect: DetectedDialect; patterns: RegExp[]; weight: number }> = [
  { dialect: "okuma", patterns: [/\bNAT\d{2}\b/, /\.MIN$/i, /G50\s+S\d/, /OSP/i, /\bG71\b.*\bB60\b/], weight: 2 },
  { dialect: "haas", patterns: [/\bO\d{5}\b/, /\bG187\b/, /\bM97\b/, /\bG65\s+P/, /HAAS/i], weight: 2 },
  { dialect: "hurco", patterns: [/HURCO|VM30|WINMAX/i, /PART\s+SETUP/i, /\bG150\b/, /\.hnc$/i], weight: 2 },
  { dialect: "rokuroku", patterns: [/ROKU|MITSUBISHI|M[78]0/i, /G05\.1\s+Q/, /G05\s+P10000/, /AICC|HPCC|SSS/i], weight: 2 },
  { dialect: "fanuc_generic", patterns: [/\bO\d{4}\b/, /\bG28\b/, /\bM30\b/, /\bG43\s+H/], weight: 1 },
];

// ============================================================================
// ENGINE
// ============================================================================

export class ProgramUploadAnalyzerEngine {
  /**
   * Analyze an uploaded CNC program. Auto-detects dialect and parses.
   */
  async analyze(content: string, filename: string): Promise<UploadAnalysisResult> {
    const dialect = this._detectDialect(content, filename);
    const lines = content.split(/\r?\n/);

    const result: UploadAnalysisResult = {
      filename,
      dialect: dialect.dialect,
      dialect_confidence: dialect.confidence,
      line_count: lines.length,
      tool_list: [],
      operations: [],
      original_speed_feeds: [],
      cycle_structure: {
        has_subprograms: false,
        has_macros: false,
        has_canned_cycles: false,
        has_threading: false,
        has_probing: false,
        tool_change_count: 0,
      },
      hints: {
        material_hint: null,
        workholding_hint: null,
        stock_hint: null,
        unit_system: "unknown",
      },
      safety_warnings: [],
      raw_parser_result: null,
    };

    // Route to appropriate parser
    switch (dialect.dialect) {
      case "okuma": {
        const { okumaOSPParserEngine } = await import("./OkumaOSPParserEngine.js");
        const parsed = okumaOSPParserEngine.parse(content, filename);
        result.raw_parser_result = parsed;
        this._extractFromOkuma(parsed, result);
        break;
      }
      case "haas": {
        const { haasParserEngine } = await import("./HaasParserEngine.js");
        const parsed = haasParserEngine.parse(content, filename);
        result.raw_parser_result = parsed;
        this._extractFromHaas(parsed, result);
        break;
      }
      case "hurco": {
        const { hurcoParserEngine } = await import("./HurcoParserEngine.js");
        const parsed = hurcoParserEngine.parse(content, filename);
        result.raw_parser_result = parsed;
        this._extractFromHurco(parsed, result);
        break;
      }
      case "rokuroku": {
        const { rokuRokuParserEngine } = await import("./RokuRokuParserEngine.js");
        const parsed = rokuRokuParserEngine.parse(content, filename);
        result.raw_parser_result = parsed;
        this._extractFromRokuRoku(parsed, result);
        break;
      }
      default: {
        // Fallback: basic G-code extraction
        this._extractGeneric(lines, result);
        break;
      }
    }

    this._extractHints(content, result);
    this._validateSafety(result);

    log.debug(`[ProgramUploadAnalyzer] ${filename}: ${result.dialect} dialect, ` +
      `${result.tool_list.length} tools, ${result.operations.length} ops`);

    return result;
  }

  // ────────────────────────────────────────────────────────────────

  private _detectDialect(content: string, filename: string): { dialect: DetectedDialect; confidence: number } {
    const scores = new Map<DetectedDialect, number>();
    const fullText = content + "\n" + filename;

    for (const sig of DIALECT_SIGNATURES) {
      let score = 0;
      for (const pat of sig.patterns) {
        if (pat.test(fullText)) score += sig.weight;
      }
      scores.set(sig.dialect, score);
    }

    let best: DetectedDialect = "unknown";
    let bestScore = 0;
    for (const [d, s] of scores) {
      if (s > bestScore) { best = d; bestScore = s; }
    }

    const maxPossible = DIALECT_SIGNATURES.find(s => s.dialect === best);
    const confidence = maxPossible
      ? Math.min(100, Math.round((bestScore / (maxPossible.patterns.length * maxPossible.weight)) * 100))
      : 0;

    return { dialect: best, confidence };
  }

  private _extractFromOkuma(parsed: any, result: UploadAnalysisResult): void {
    for (const section of parsed.toolSections || []) {
      const isCSS = section.speedMode === "css";
      const opTypes = (section.operations || []).map((o: any) => o.type);
      result.tool_list.push({
        station: section.toolNumber,
        description: section.comment ?? null,
        offset_number: section.offsetNumber ?? null,
        has_tlc: false,
        has_cutter_comp: false,
        operation_types: opTypes,
        speed_rpm: section.rpmValue ?? null,
        css_mode: isCSS,
        feed_rate: null,
      });
      if (section.rpmValue || section.cssValue) {
        result.original_speed_feeds.push({
          tool_station: section.toolNumber,
          speed_rpm: section.rpmValue ?? null,
          css_sfm: section.cssValue ?? null,
          feed_rate: null,
          g_code_context: isCSS ? "G96" : "G97",
        });
      }
    }
    result.cycle_structure.has_threading = parsed.hasThreading ?? false;
    result.cycle_structure.tool_change_count = parsed.toolSections?.length ?? 0;
    result.cycle_structure.has_macros = parsed.hasMacros ?? false;
  }

  private _extractFromHaas(parsed: any, result: UploadAnalysisResult): void {
    for (const section of parsed.toolSections || []) {
      result.tool_list.push({
        station: section.tool_number,
        description: section.tool_comment ?? null,
        offset_number: section.offset_number ?? null,
        has_tlc: section.has_tlc ?? false,
        has_cutter_comp: section.has_cutter_comp ?? false,
        operation_types: (section.operations || []).map((o: any) => o.type),
        speed_rpm: section.spindle_rpm ?? null,
        css_mode: section.css_mode ?? false,
        feed_rate: null,
      });
      if (section.spindle_rpm) {
        result.original_speed_feeds.push({
          tool_station: section.tool_number,
          speed_rpm: section.spindle_rpm,
          css_sfm: null,
          feed_rate: null,
          g_code_context: "S" + section.spindle_rpm,
        });
      }
    }
    result.cycle_structure.has_probing = parsed.hasProbing ?? false;
    result.cycle_structure.has_macros = parsed.hasMacros ?? false;
    result.cycle_structure.has_canned_cycles = (parsed.operations || []).some(
      (o: any) => /^G8[0-9]/.test(o.g_code ?? "")
    );
    result.cycle_structure.has_subprograms = (parsed.subCalls || []).length > 0;
    result.cycle_structure.tool_change_count = parsed.toolSections?.length ?? 0;
  }

  private _extractFromHurco(parsed: any, result: UploadAnalysisResult): void {
    for (const section of parsed.toolSections || []) {
      result.tool_list.push({
        station: section.tool_number,
        description: section.tool_description ?? null,
        offset_number: null,
        has_tlc: false,
        has_cutter_comp: false,
        operation_types: (section.operations || []).map((o: any) => o.type),
        speed_rpm: section.spindle_rpm ?? null,
        css_mode: false,
        feed_rate: section.feed_rate ?? null,
      });
    }
    result.cycle_structure.tool_change_count = parsed.toolSections?.length ?? 0;
    if (parsed.part_setup) {
      result.hints.material_hint = parsed.part_setup.material ?? null;
      result.hints.stock_hint = parsed.part_setup.stock_x
        ? `${parsed.part_setup.stock_x}x${parsed.part_setup.stock_y}x${parsed.part_setup.stock_z}`
        : null;
      result.hints.workholding_hint = parsed.part_setup.fixture ?? null;
    }
  }

  private _extractFromRokuRoku(parsed: any, result: UploadAnalysisResult): void {
    for (const section of parsed.toolSections || []) {
      result.tool_list.push({
        station: section.tool_number,
        description: section.tool_comment ?? null,
        offset_number: null,
        has_tlc: false,
        has_cutter_comp: false,
        operation_types: (section.operations || []).map((o: any) => o.type),
        speed_rpm: section.spindle_rpm ?? null,
        css_mode: false,
        feed_rate: section.feed_rate ?? null,
      });
    }
    result.cycle_structure.tool_change_count = parsed.toolSections?.length ?? 0;
  }

  private _extractGeneric(lines: string[], result: UploadAnalysisResult): void {
    let currentTool = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        currentTool = parseInt(toolMatch[1] ?? toolMatch[2], 10);
        const comment = lines[i].match(/\(([^)]+)\)/);
        result.tool_list.push({
          station: currentTool,
          description: comment ? comment[1] : null,
          offset_number: null,
          has_tlc: false,
          has_cutter_comp: false,
          operation_types: [],
          speed_rpm: null,
          css_mode: false,
          feed_rate: null,
        });
      }
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && currentTool > 0) {
        const existing = result.original_speed_feeds.find(s => s.tool_station === currentTool);
        if (!existing) {
          result.original_speed_feeds.push({
            tool_station: currentTool,
            speed_rpm: parseInt(sMatch[1], 10),
            css_sfm: null,
            feed_rate: null,
            g_code_context: "S" + sMatch[1],
          });
        }
      }
    }
    result.cycle_structure.tool_change_count = result.tool_list.length;
  }

  private _extractHints(content: string, result: UploadAnalysisResult): void {
    // Unit system
    if (/G20\b/.test(content)) result.hints.unit_system = "imperial";
    else if (/G21\b/.test(content)) result.hints.unit_system = "metric";
    else if (/IPM|IPR|SFM/i.test(content)) result.hints.unit_system = "imperial";

    // Material hints from comments
    const materialPatterns = [
      /\b(1018|1020|1045|4140|4340|8620)\b/,
      /\b(A2|D2|S7|M2|H13|O1)\s*(?:TOOL\s*STEEL)?/i,
      /\b(304|316|17-4|410|303)\s*(?:SS|STAINLESS)?/i,
      /\b(6061|7075|2024)\s*(?:AL|ALUMINUM)?/i,
      /\b(STEEL|ALUMINUM|STAINLESS|BRASS|COPPER|TITANIUM|INCONEL)\b/i,
    ];
    for (const pat of materialPatterns) {
      const m = content.match(pat);
      if (m) { result.hints.material_hint = m[0].trim(); break; }
    }

    // Workholding hints
    const whPatterns = [
      /\b(VISE|CHUCK|COLLET|FIXTURE|PLATE|ROTARY)\b/i,
      /\b(3[- ]JAW|4[- ]JAW|6[- ]JAW)\b/i,
    ];
    for (const pat of whPatterns) {
      const m = content.match(pat);
      if (m) { result.hints.workholding_hint = m[0].trim(); break; }
    }
  }

  private _validateSafety(result: UploadAnalysisResult): void {
    if (result.tool_list.length === 0) {
      result.safety_warnings.push("No tool changes detected — program may be incomplete");
    }
    if (result.original_speed_feeds.length === 0) {
      result.safety_warnings.push("No speed/feed values found — cannot verify cutting parameters");
    }
  }
}

export const programUploadAnalyzerEngine = new ProgramUploadAnalyzerEngine();
