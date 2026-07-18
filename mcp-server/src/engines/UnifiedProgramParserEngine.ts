/**
 * UnifiedProgramParserEngine — Foundation Parser for ALL CNC Program Formats
 *
 * Unified entry point that auto-detects format from extension + content sniffing,
 * delegates to format-specific sub-parsers, and normalizes output into a single
 * ParsedProgram schema with confidence-tagged extracted fields.
 *
 * Supported formats:
 *   - Okuma OSP (.MIN) — $name.MIN% header, NAT## labels, 6-digit tools, G85/G87
 *   - Haas NGC (.nc/.tap) — O-numbers, T## M6, G54-G59, Fanuc-compatible
 *   - Hurco WinMax (.hnc) — Fusion 360 posted G-code, rich tool comments
 *   - hyperMILL archive (.hmc) — 7z compressed, metadata extraction only
 *   - Esprit wire EDM (.esp) — binary, string extraction only
 *   - Generic Fanuc/ISO (.nc/.tap) — fallback for unrecognized G-code
 *
 * Path-based metadata extraction for JM Die archive structure:
 *   - CNC LATHE/{customer}/ -> Okuma lathe
 *   - WIRE EDM/{customer}/ -> Mitsubishi FA10S
 *   - HAAS-HURCO/{customer}/ -> Hurco VM30i / Haas VF-2
 *   - CNC MILL HAAS/{customer}/ -> Haas VF-2
 *   - ROKU-ROKU/{customer}/ -> Roku-Roku HC 658-II
 *   - CNC OKUMA MULTUS/ -> Okuma Multus B250II
 *   - OKUMA/ -> Okuma M460V-5AX
 *
 * @module engines/UnifiedProgramParserEngine
 */

import { log } from "../utils/Logger.js";
import { okumaOSPParserEngine, type OkumaProgram, type OkumaToolSection } from "./OkumaOSPParserEngine.js";
import { haasParserEngine, type HaasProgram, type HaasToolSection } from "./HaasParserEngine.js";
import { hurcoParserEngine, type HurcoProgram, type HurcoToolSection } from "./HurcoParserEngine.js";
import { wireEDMProgramParserEngine, type WireEDMProgram } from "./WireEDMProgramParserEngine.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES — ExtractedField
// ============================================================================

/**
 * Every extracted value carries provenance and confidence metadata.
 * This lets downstream consumers weight parsed values vs inferred ones.
 */
export interface ExtractedField<T> {
  value: T;
  source: "parsed" | "inferred" | "filename" | "path" | "comment";
  confidence: number; // 0.0 – 1.0
}

// ============================================================================
// TYPES — ParsedOperation
// ============================================================================

export type OperationType =
  | "face" | "od_rough" | "od_finish" | "id_rough" | "id_finish"
  | "drill" | "peck_drill" | "tap" | "bore" | "bore_finish"
  | "groove" | "cutoff" | "thread"
  | "pocket" | "contour" | "profile" | "slot"
  | "center_drill" | "chip_break" | "probe"
  | "c_axis" | "live_tool"
  | "wire_rough" | "wire_skim"
  | "unknown";

export type CoolantMode = "flood" | "mist" | "thru_spindle" | "off" | "unknown";

export interface ParsedOperation {
  sequence: number;
  type: ExtractedField<OperationType>;
  tool_number: ExtractedField<number> | null;
  spindle_speed: ExtractedField<number> | null;
  spindle_mode: "rpm" | "css" | null;
  feed_rate: ExtractedField<number> | null;
  feed_mode: "per_rev" | "per_min" | null;
  depth_of_cut: ExtractedField<number> | null;
  coolant: ExtractedField<CoolantMode>;
  estimated_time_sec: number | null;
  g_code: string | null;
  line_number: number;
}

// ============================================================================
// TYPES — ParsedToolCall
// ============================================================================

export type ToolType =
  | "turning" | "boring" | "threading" | "grooving" | "cutoff"
  | "drill" | "tap" | "reamer" | "center_drill"
  | "end_mill" | "face_mill" | "ball_mill" | "chamfer_mill"
  | "insert" | "unknown";

export interface ParsedToolCall {
  tool_number: number;
  offset: number | null;
  tool_type: ExtractedField<ToolType>;
  description: string | null;
  insert_geometry: ExtractedField<string> | null;
  diameter: ExtractedField<number> | null;
  nose_radius: ExtractedField<number> | null;
  flute_count: ExtractedField<number> | null;
}

// ============================================================================
// TYPES — ParsedProgram (unified output)
// ============================================================================

export type ProgramFormat =
  | "okuma_osp"
  | "haas_ngc"
  | "hurco_winmax"
  | "fanuc"
  | "generic_iso"
  | "hypermill_archive"
  | "esprit_wedm"
  | "post_processor_cycle"
  | "unknown";

export interface ParsedProgram {
  source_file: string;
  format: ExtractedField<ProgramFormat>;
  part_number: ExtractedField<string> | null;
  machine_target: ExtractedField<string> | null;
  material: ExtractedField<string> | null;
  customer: ExtractedField<string> | null;

  operations: ParsedOperation[];
  tool_calls: ParsedToolCall[];
  work_offsets: string[];
  estimated_cycle_time_sec: number | null;
  total_tool_count: number;

  parse_confidence: number; // 0.0 – 1.0 overall
  warnings: string[];

  // Provenance
  has_bar_feeder: boolean;
  has_live_tooling: boolean;
  has_c_axis: boolean;
  has_threading: boolean;
  has_probing: boolean;
  line_count: number;
}

// ============================================================================
// TYPES — Archive parse result
// ============================================================================

export interface ArchiveParseResult {
  total_files: number;
  parsed: number;
  skipped: number;
  errors: number;
  programs: ParsedProgram[];
  error_files: Array<{ file: string; error: string }>;
  format_counts: Record<string, number>;
  elapsed_ms: number;
}

export interface ArchiveParseOptions {
  extensions?: string[];
  maxConcurrency?: number;
  onProgress?: (parsed: number, total: number, current: string) => void;
}

// ============================================================================
// CUSTOMER PART-NUMBER PATTERNS
// ============================================================================

interface CustomerPattern {
  name: string;
  regex: RegExp;
}

const CUSTOMER_PART_PATTERNS: CustomerPattern[] = [
  { name: "ATF",        regex: /([A-Z]{2,3}-\d{5}[SA]?-\d[A-Z]\d?)/i },
  { name: "AGRATI",     regex: /(9\d{6})/ },
  { name: "ALLFAST",    regex: /(\d{2}-\d{3}-\d{3})/ },
  { name: "FONTANA",    regex: /([A-Z]{1,2}-\d{4})/ },
  { name: "HOLO-KROME", regex: /(A\d{5,6}HK|B\d{4})/ },
  { name: "SFS",        regex: /(1\d{6})/ },
  { name: "ITW",        regex: /(\d{3}-\d{5}-\d{5}-\d{2})/ },
];

const GENERIC_PART_PATTERN = /([A-Z0-9]{2,}(?:-[A-Z0-9]+)*)/i;

// ============================================================================
// PATH-BASED MACHINE MAPPING (JM Die archive structure)
// ============================================================================

interface PathMachineRule {
  pattern: RegExp;
  machine: string;
  extractCustomer: boolean;
}

const PATH_MACHINE_RULES: PathMachineRule[] = [
  { pattern: /CNC\s*LATHE[/\\]([^/\\]+)/i,            machine: "Okuma LB3000EX II",    extractCustomer: true },
  { pattern: /WIRE\s*EDM[/\\]([^/\\]+)/i,              machine: "Mitsubishi FA10S",     extractCustomer: true },
  { pattern: /HAAS[\s-]*HURCO[/\\]([^/\\]+)/i,         machine: "Hurco VM30i",          extractCustomer: true },
  { pattern: /CNC\s*MILL\s*HAAS[/\\]([^/\\]+)/i,       machine: "Haas VF-2",            extractCustomer: true },
  { pattern: /ROKU[\s-]*ROKU[/\\]([^/\\]+)/i,          machine: "Roku-Roku HC 658-II",  extractCustomer: true },
  { pattern: /CNC\s*OKUMA\s*MULTUS/i,                  machine: "Okuma Multus B250II",  extractCustomer: false },
  { pattern: /OKUMA[/\\]/i,                             machine: "Okuma M460V-5AX",      extractCustomer: false },
];

// ============================================================================
// TOOL DESCRIPTION PATTERNS
// ============================================================================

const TOOL_TYPE_PATTERNS: Array<{ regex: RegExp; type: ToolType }> = [
  { regex: /face\s*mill/i,          type: "face_mill" },
  { regex: /end\s*mill|flat\s*end/i, type: "end_mill" },
  { regex: /ball\s*(end|mill|nose)/i, type: "ball_mill" },
  { regex: /chamfer/i,              type: "chamfer_mill" },
  { regex: /center\s*drill/i,       type: "center_drill" },
  { regex: /drill|twist/i,          type: "drill" },
  { regex: /tap\b/i,                type: "tap" },
  { regex: /ream/i,                 type: "reamer" },
  { regex: /thread/i,               type: "threading" },
  { regex: /groove|grv/i,           type: "grooving" },
  { regex: /cutoff|cut\s*off|part/i, type: "cutoff" },
  { regex: /bore|boring/i,          type: "boring" },
  { regex: /rough|rgh/i,            type: "turning" },
  { regex: /finish|fin/i,           type: "turning" },
  { regex: /od|id|turn/i,           type: "turning" },
];

// ============================================================================
// 7z MAGIC BYTES
// ============================================================================

const SEVEN_ZIP_MAGIC = Buffer.from([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]);

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class UnifiedProgramParserEngineImpl {

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC: Parse a single file
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Parse a CNC program file into a unified ParsedProgram.
   * Auto-detects format from extension and content sniffing.
   *
   * @param filePath Absolute path to the program file
   * @returns ParsedProgram with all extracted fields
   */
  async parseFile(filePath: string): Promise<ParsedProgram> {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    // Binary formats: check before reading as text
    if (ext === ".hmc") {
      return this._parseHyperMILLArchive(filePath, filename);
    }
    if (ext === ".esp") {
      return this._parseEspritBinary(filePath, filename);
    }

    // Text-based formats
    let content: string;
    try {
      content = await fs.promises.readFile(filePath, "utf-8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this._errorProgram(filePath, `Failed to read file: ${msg}`);
    }

    return this.parseContent(content, filePath);
  }

  /**
   * Parse CNC program content (already loaded as string).
   *
   * @param content Raw program text
   * @param filePath Original file path (for metadata extraction)
   * @returns ParsedProgram
   */
  parseContent(content: string, filePath: string): ParsedProgram {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    const format = this._detectFormat(content, ext);

    let program: ParsedProgram;

    switch (format) {
      case "okuma_osp":
        program = this._parseOkumaOSP(content, filename, filePath);
        break;
      case "hurco_winmax":
        program = this._parseHurco(content, filename, filePath);
        break;
      case "haas_ngc":
        program = this._parseHaas(content, filename, filePath);
        break;
      case "fanuc":
        program = this._parseFanuc(content, filename, filePath);
        break;
      case "generic_iso":
        program = this._parseGenericISO(content, filename, filePath);
        break;
      case "post_processor_cycle":
        program = this._parsePostProcessorCycle(content, filename, filePath);
        break;
      case "hypermill_archive":
      case "esprit_wedm":
        // These are handled separately (binary/archive)
        program = this._errorProgram(filePath, `Binary format: ${format}`);
        break;
      default:
        program = this._errorProgram(filePath, `Unsupported format: ${format}`);
        break;
    }

    // Enrich from path (machine target, customer)
    this._enrichFromPath(filePath, program);

    // Extract part number from filename + content
    this._extractPartNumber(filePath, content, program);

    // Compute overall parse confidence
    program.parse_confidence = this._computeOverallConfidence(program);

    return program;
  }

  // ────────────────────────────────────────────────────────────────────────
  // PUBLIC: Batch parse an archive directory
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Recursively parse all CNC programs in a directory.
   *
   * @param rootDir Root directory to scan
   * @param options Filter extensions, concurrency, progress callback
   * @returns ArchiveParseResult with all parsed programs
   */
  async parseArchive(rootDir: string, options?: ArchiveParseOptions): Promise<ArchiveParseResult> {
    const startTime = Date.now();
    const allowedExts = new Set(
      (options?.extensions ?? [".min", ".nc", ".hnc", ".hmc", ".esp", ".tap", ".cyc"])
        .map(e => e.toLowerCase().startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`)
    );
    const maxConcurrency = options?.maxConcurrency ?? 8;

    // Collect all matching files
    const files = await this._collectFiles(rootDir, allowedExts);
    const total = files.length;

    const result: ArchiveParseResult = {
      total_files: total,
      parsed: 0,
      skipped: 0,
      errors: 0,
      programs: [],
      error_files: [],
      format_counts: {},
      elapsed_ms: 0,
    };

    // Process in batches for concurrency control
    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, i + maxConcurrency);
      const promises = batch.map(async (file) => {
        try {
          const program = await this.parseFile(file);
          if (program.warnings.length === 1 && program.warnings[0].startsWith("Failed to read")) {
            result.errors++;
            result.error_files.push({ file, error: program.warnings[0] });
          } else {
            result.parsed++;
            result.programs.push(program);
            const fmt = program.format.value;
            result.format_counts[fmt] = (result.format_counts[fmt] ?? 0) + 1;
          }
        } catch (err) {
          result.errors++;
          const msg = err instanceof Error ? err.message : String(err);
          result.error_files.push({ file, error: msg });
        }
      });
      await Promise.all(promises);

      if (options?.onProgress) {
        options.onProgress(result.parsed + result.errors, total, batch[batch.length - 1]);
      }
    }

    result.elapsed_ms = Date.now() - startTime;
    log.info(`[UnifiedProgramParser] Archive parse complete: ${result.parsed}/${total} files in ${result.elapsed_ms}ms`);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────
  // FORMAT AUTO-DETECTION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Detect program format from file extension and content sniffing.
   */
  private _detectFormat(content: string, ext: string): ProgramFormat {
    const upper = content.substring(0, 2000).toUpperCase();

    // .MIN files: always Okuma OSP
    if (ext === ".min") {
      return "okuma_osp";
    }

    // .HNC files: Hurco WinMax (Fusion 360 posted G-code)
    if (ext === ".hnc") {
      return "hurco_winmax";
    }

    // .NC files: could be Okuma-in-.nc, Fanuc, or generic
    if (ext === ".nc") {
      // Check for Okuma markers
      if (/NAT\d{2}/i.test(upper) || /^\$.*\.MIN%/m.test(upper)) {
        return "okuma_osp";
      }
      // Check for O-number (Fanuc/Haas)
      if (/^%?\s*O\d{4,}/m.test(upper)) {
        // Check for Haas-specific markers
        if (/G187|M109|M97\s*P|M88/i.test(upper)) {
          return "haas_ngc";
        }
        return "fanuc";
      }
      // Check for Fusion 360 tool comments (Haas/Hurco posted)
      if (/\(T\d+\s+D=[\d.]+/i.test(content)) {
        return "haas_ngc";
      }
      return "generic_iso";
    }

    // .TAP files: typically Haas NGC output or generic Fanuc
    if (ext === ".tap") {
      if (/^%?\s*O\d{4,}/m.test(upper)) {
        return "haas_ngc";
      }
      if (/G187|M109|M97\s*P|M88/i.test(upper)) {
        return "haas_ngc";
      }
      return "generic_iso";
    }

    // .ESP: Esprit wire EDM (should be caught at binary level, but just in case)
    if (ext === ".esp") {
      return "esprit_wedm";
    }

    // .HMC: hyperMILL archive
    if (ext === ".hmc") {
      return "hypermill_archive";
    }

    // .CYC: Mastercam/hyperMILL post processor cycle templates
    if (ext === ".cyc") {
      return "post_processor_cycle";
    }

    // Fallback: try content sniffing
    if (/NAT\d{2}/i.test(upper) || /^\$.*\.MIN%/m.test(upper)) {
      return "okuma_osp";
    }
    if (/^%?\s*O\d{4,}/m.test(upper)) {
      return "fanuc";
    }
    if (/G[0-9]{1,2}\b/.test(upper)) {
      return "generic_iso";
    }

    return "unknown";
  }

  // ────────────────────────────────────────────────────────────────────────
  // OKUMA OSP PARSER
  // ────────────────────────────────────────────────────────────────────────

  private _parseOkumaOSP(content: string, filename: string, filePath: string): ParsedProgram {
    const ast = okumaOSPParserEngine.parse(content, filename);
    const warnings: string[] = [];

    // Safety validation
    const safetyIssues = okumaOSPParserEngine.validateSafety(ast);
    for (const issue of safetyIssues) {
      warnings.push(`[${issue.severity}] ${issue.message}`);
    }

    // Convert tool sections to ParsedToolCall[]
    const toolCalls = this._okumaToolCalls(ast);

    // Convert operations
    const operations = this._okumaOperations(ast);

    // Extract work offsets (Okuma doesn't use G54-G59 typically)
    const workOffsets: string[] = [];

    // Estimate cycle time from motion blocks
    const cycleTime = this._okumaEstimateCycleTime(ast);

    return {
      source_file: filePath,
      format: { value: "okuma_osp", source: "parsed", confidence: 0.95 },
      part_number: null, // filled by _extractPartNumber
      machine_target: null, // filled by _enrichFromPath
      material: this._okumaExtractMaterial(ast),
      customer: null, // filled by _enrichFromPath
      operations,
      tool_calls: toolCalls,
      work_offsets: workOffsets,
      estimated_cycle_time_sec: cycleTime,
      total_tool_count: toolCalls.length,
      parse_confidence: 0.85,
      warnings,
      has_bar_feeder: ast.hasBarFeeder,
      has_live_tooling: ast.hasLiveTooling,
      has_c_axis: ast.hasCAxis,
      has_threading: ast.hasThreading,
      has_probing: false,
      line_count: ast.lineCount,
    };
  }

  /**
   * Convert Okuma tool sections into unified ParsedToolCall[].
   * Okuma uses 6-digit tool codes: T TTOOXX (tool, offset, wear).
   */
  private _okumaToolCalls(ast: OkumaProgram): ParsedToolCall[] {
    const calls: ParsedToolCall[] = [];
    const seen = new Set<number>();

    for (const section of ast.toolSections) {
      if (seen.has(section.toolNumber)) continue;
      seen.add(section.toolNumber);

      const desc = section.comment || null;
      const toolType = desc ? this._classifyToolFromDescription(desc) : { value: "unknown" as ToolType, source: "inferred" as const, confidence: 0.3 };
      const geometry = desc ? this._extractInsertGeometry(desc) : null;
      const noseRadius = desc ? this._extractNoseRadius(desc) : null;

      calls.push({
        tool_number: section.toolNumber,
        offset: section.offsetNumber,
        tool_type: toolType,
        description: desc,
        insert_geometry: geometry,
        diameter: null,
        nose_radius: noseRadius,
        flute_count: null,
      });
    }
    return calls;
  }

  /**
   * Convert Okuma operations into unified ParsedOperation[].
   */
  private _okumaOperations(ast: OkumaProgram): ParsedOperation[] {
    const ops: ParsedOperation[] = [];
    let seq = 0;

    for (const section of ast.toolSections) {
      for (const op of section.operations) {
        seq++;
        const opType = this._mapOkumaOpType(op.type);
        const feedVal = op.params.feed !== undefined ? Number(op.params.feed) : null;
        const docVal = op.params.depth_of_cut !== undefined ? Number(op.params.depth_of_cut) : null;

        ops.push({
          sequence: seq,
          type: { value: opType, source: "parsed", confidence: 0.9 },
          tool_number: { value: section.toolNumber, source: "parsed", confidence: 1.0 },
          spindle_speed: section.cssValue
            ? { value: section.cssValue, source: "parsed", confidence: 1.0 }
            : section.rpmValue
              ? { value: section.rpmValue, source: "parsed", confidence: 1.0 }
              : null,
          spindle_mode: section.speedMode === "css" ? "css" : "rpm",
          feed_rate: feedVal !== null ? { value: feedVal, source: "parsed", confidence: 1.0 } : null,
          feed_mode: "per_rev", // Okuma lathes default G95
          depth_of_cut: docVal !== null ? { value: docVal, source: "parsed", confidence: 1.0 } : null,
          coolant: { value: section.coolant ? "flood" : "off", source: "parsed", confidence: 0.85 },
          estimated_time_sec: null,
          g_code: op.gcode,
          line_number: op.line,
        });
      }
    }
    return ops;
  }

  /**
   * Map Okuma-specific operation types to unified OperationType.
   */
  private _mapOkumaOpType(okumaType: string): OperationType {
    const map: Record<string, OperationType> = {
      face: "face",
      od_rough: "od_rough",
      od_finish: "od_finish",
      id_rough: "id_rough",
      id_finish: "id_finish",
      center_drill: "center_drill",
      drill: "drill",
      peck_drill: "peck_drill",
      bore: "bore",
      bore_finish: "bore_finish",
      groove: "groove",
      cutoff: "cutoff",
      thread: "thread",
      c_axis_position: "c_axis",
      live_tool: "live_tool",
    };
    return map[okumaType] ?? "unknown";
  }

  /**
   * Attempt to extract material from Okuma variable comments.
   * Okuma programs sometimes have (STOCK DIAMETER) or (MATERIAL: 4140) comments.
   */
  private _okumaExtractMaterial(ast: OkumaProgram): ExtractedField<string> | null {
    for (const v of ast.variables) {
      if (/material|mat['\s]?l|steel|carbide|aluminum/i.test(v.comment)) {
        return { value: v.comment.trim(), source: "comment", confidence: 0.6 };
      }
    }
    // Scan raw lines for material comments
    for (const line of ast.rawLines.slice(0, 30)) {
      const m = line.match(/\(\s*(?:MATERIAL|MAT['\s]?L)\s*[:=]?\s*(.+?)\s*\)/i);
      if (m) {
        return { value: m[1].trim(), source: "comment", confidence: 0.7 };
      }
    }
    return null;
  }

  /**
   * Estimate cycle time for Okuma programs from motion blocks.
   * G0 rapids assumed at 400 IPM (typical LB3000EX II).
   * G1/G2/G3 at programmed feed rate.
   */
  private _okumaEstimateCycleTime(ast: OkumaProgram): number | null {
    const RAPID_IPM = 400;
    let totalSeconds = 0;
    let hasMotion = false;

    for (const section of ast.toolSections) {
      // Add 5 seconds per tool change
      totalSeconds += 5;

      let lastX = 0;
      let lastZ = 0;
      let currentFeed = 0.01; // default IPR

      for (const op of section.operations) {
        const x = op.params.x !== undefined ? Number(op.params.x) : lastX;
        const z = op.params.z !== undefined ? Number(op.params.z) : lastZ;
        const dist = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(z - lastZ, 2));

        if (dist > 0.001) {
          hasMotion = true;
          if (op.type === "rapid") {
            totalSeconds += (dist / RAPID_IPM) * 60;
          } else if (op.type === "feed" || op.type === "arc_cw" || op.type === "arc_ccw") {
            const feed = op.params.feed !== undefined ? Number(op.params.feed) : currentFeed;
            if (feed > 0) {
              // For per-rev feed, assume 800 RPM average to convert to IPM
              const ipm = feed < 1 ? feed * 800 : feed;
              totalSeconds += (dist / ipm) * 60;
            }
          }
        }

        if (op.params.feed !== undefined) currentFeed = Number(op.params.feed);
        lastX = x;
        lastZ = z;

        // Dwell
        if (op.type === "dwell" && op.params.seconds !== undefined) {
          totalSeconds += Number(op.params.seconds);
        }
      }
    }

    return hasMotion ? Math.round(totalSeconds) : null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // HAAS / FANUC PARSER
  // ────────────────────────────────────────────────────────────────────────

  private _parseHaas(content: string, filename: string, filePath: string): ParsedProgram {
    const ast = haasParserEngine.parse(content, filename);
    const warnings: string[] = [];
    for (const w of ast.safety.warnings) {
      warnings.push(`[warning] ${w}`);
    }

    const toolCalls = this._haasToolCalls(ast, content);
    const operations = this._haasOperations(ast);
    const workOffsets = this._extractWorkOffsets(content);
    const cycleTime = this._haasEstimateCycleTime(ast);

    return {
      source_file: filePath,
      format: { value: "haas_ngc", source: "parsed", confidence: 0.90 },
      part_number: null,
      machine_target: null,
      material: null,
      customer: null,
      operations,
      tool_calls: toolCalls,
      work_offsets: workOffsets,
      estimated_cycle_time_sec: cycleTime,
      total_tool_count: toolCalls.length,
      parse_confidence: 0.80,
      warnings,
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: ast.operations.some(o => o.type === "thread"),
      has_probing: ast.hasProbing,
      line_count: ast.lineCount,
    };
  }

  /**
   * Convert Haas tool sections into unified ParsedToolCall[].
   * Extracts rich tool data from Fusion 360 comments:
   *   (T14 D=0.75 CR=0.015 - ZMIN=1.27 - face mill)
   */
  private _haasToolCalls(ast: HaasProgram, content: string): ParsedToolCall[] {
    const calls: ParsedToolCall[] = [];
    const seen = new Set<number>();

    for (const section of ast.toolSections) {
      if (seen.has(section.tool_number)) continue;
      seen.add(section.tool_number);

      let desc = section.tool_comment;
      let diameter: ExtractedField<number> | null = null;
      let noseRadius: ExtractedField<number> | null = null;
      let toolType: ExtractedField<ToolType> = { value: "unknown", source: "inferred", confidence: 0.3 };

      // Parse Fusion 360 tool comment format
      // (T14 D=0.75 CR=0.015 - ZMIN=1.27 - face mill)
      const fusionMatch = this._parseFusionToolComment(content, section.tool_number);
      if (fusionMatch) {
        if (fusionMatch.diameter !== null) {
          diameter = { value: fusionMatch.diameter, source: "comment", confidence: 0.95 };
        }
        if (fusionMatch.cornerRadius !== null) {
          noseRadius = { value: fusionMatch.cornerRadius, source: "comment", confidence: 0.95 };
        }
        if (fusionMatch.toolType) {
          toolType = { value: fusionMatch.toolType, source: "comment", confidence: 0.90 };
        }
        if (fusionMatch.description) {
          desc = fusionMatch.description;
        }
      } else if (desc) {
        toolType = this._classifyToolFromDescription(desc);
      }

      calls.push({
        tool_number: section.tool_number,
        offset: section.offset_number,
        tool_type: toolType,
        description: desc,
        insert_geometry: null,
        diameter,
        nose_radius: noseRadius,
        flute_count: null,
      });
    }
    return calls;
  }

  /**
   * Parse Fusion 360 tool comment format.
   * Examples:
   *   (T14 D=0.75 CR=0.015 - ZMIN=1.27 - face mill)
   *   (T2 D=0.5 CR=0 - ZMIN=-0.5 - flat end mill)
   */
  private _parseFusionToolComment(content: string, toolNum: number): {
    diameter: number | null;
    cornerRadius: number | null;
    toolType: ToolType | null;
    description: string | null;
  } | null {
    // Search for (T## D=... pattern
    const pattern = new RegExp(
      `\\(\\s*T${toolNum}\\s+D=([\\d.]+)(?:\\s+CR=([\\d.]+))?(?:\\s*-\\s*ZMIN=[\\d.+-]+)?(?:\\s*-\\s*(.+?))?\\s*\\)`,
      "i"
    );
    const match = content.match(pattern);
    if (!match) return null;

    const diameter = match[1] ? parseFloat(match[1]) : null;
    const cornerRadius = match[2] ? parseFloat(match[2]) : null;
    const typeStr = match[3]?.trim() ?? null;

    let toolType: ToolType | null = null;
    if (typeStr) {
      const classified = this._classifyToolFromDescription(typeStr);
      toolType = classified.value;
    }

    return { diameter, cornerRadius, toolType, description: typeStr };
  }

  /**
   * Convert Haas operations into unified ParsedOperation[].
   */
  private _haasOperations(ast: HaasProgram): ParsedOperation[] {
    const ops: ParsedOperation[] = [];
    let seq = 0;
    let currentTool = 0;

    for (const section of ast.toolSections) {
      currentTool = section.tool_number;
      for (const op of section.operations) {
        seq++;
        ops.push({
          sequence: seq,
          type: { value: this._mapHaasOpType(op.type), source: "parsed", confidence: 0.85 },
          tool_number: { value: currentTool, source: "parsed", confidence: 1.0 },
          spindle_speed: section.spindle_rpm !== null
            ? { value: section.spindle_rpm, source: "parsed", confidence: 1.0 }
            : null,
          spindle_mode: section.css_mode ? "css" : "rpm",
          feed_rate: typeof op.params.F === "number"
            ? { value: op.params.F, source: "parsed", confidence: 1.0 }
            : null,
          feed_mode: section.css_mode ? "per_rev" : "per_min",
          depth_of_cut: typeof op.params.D === "number"
            ? { value: op.params.D, source: "parsed", confidence: 0.8 }
            : null,
          coolant: { value: section.coolant as CoolantMode ?? "unknown", source: "parsed", confidence: 0.85 },
          estimated_time_sec: null,
          g_code: op.g_code,
          line_number: op.line_number,
        });
      }
    }
    return ops;
  }

  private _mapHaasOpType(haasType: string): OperationType {
    const map: Record<string, OperationType> = {
      drill: "drill",
      peck_drill: "peck_drill",
      chip_break: "chip_break",
      tap: "tap",
      bore: "bore",
      bore_stop: "bore",
      bore_fine: "bore_finish",
      cw_pocket: "pocket",
      ccw_pocket: "pocket",
      od_rough: "od_rough",
      finish_cycle: "od_finish",
      thread: "thread",
      peck_drill_turn: "peck_drill",
      probe: "unknown",
      offset_set: "unknown",
    };
    return map[haasType] ?? "unknown";
  }

  /**
   * Estimate cycle time for Haas programs.
   * Rapids at 300 IPM (Haas VF-2 typical), 400 IPM for Hurco.
   */
  private _haasEstimateCycleTime(ast: HaasProgram): number | null {
    const RAPID_IPM = 300;
    let totalSeconds = 0;
    let hasMotion = false;

    for (const section of ast.toolSections) {
      totalSeconds += 8; // ATC time for Haas umbrella-type

      let lastX = 0, lastY = 0, lastZ = 0;
      for (const line of ast.rawLines.slice(section.start_line, section.end_line)) {
        const trimmed = line.trim().toUpperCase();
        if (!trimmed || trimmed.startsWith("(")) continue;

        const xM = trimmed.match(/X([+-]?\d+\.?\d*)/);
        const yM = trimmed.match(/Y([+-]?\d+\.?\d*)/);
        const zM = trimmed.match(/Z([+-]?\d+\.?\d*)/);
        const fM = trimmed.match(/F(\d+\.?\d*)/);

        const x = xM ? parseFloat(xM[1]) : lastX;
        const y = yM ? parseFloat(yM[1]) : lastY;
        const z = zM ? parseFloat(zM[1]) : lastZ;

        const dist = Math.sqrt(
          Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2) + Math.pow(z - lastZ, 2)
        );

        if (dist > 0.001) {
          hasMotion = true;
          if (/G0[0\s]|G00/.test(trimmed)) {
            totalSeconds += (dist / RAPID_IPM) * 60;
          } else if (/G0?1\b/.test(trimmed) && fM) {
            const feed = parseFloat(fM[1]);
            if (feed > 0) {
              totalSeconds += (dist / feed) * 60;
            }
          }
        }

        lastX = x; lastY = y; lastZ = z;
      }
    }

    return hasMotion ? Math.round(totalSeconds) : null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // HURCO PARSER
  // ────────────────────────────────────────────────────────────────────────

  private _parseHurco(content: string, filename: string, filePath: string): ParsedProgram {
    const ast = hurcoParserEngine.parse(content, filename);
    const warnings: string[] = [];
    for (const w of ast.safety.warnings) {
      warnings.push(`[warning] ${w}`);
    }

    const toolCalls = this._hurcoToolCalls(ast, content);
    const operations = this._hurcoOperations(ast);
    const workOffsets = this._extractWorkOffsets(content);

    return {
      source_file: filePath,
      format: { value: "hurco_winmax", source: "parsed", confidence: 0.90 },
      part_number: null,
      machine_target: { value: "Hurco VM30i", source: "inferred", confidence: 0.8 },
      material: ast.part_setup?.material
        ? { value: ast.part_setup.material, source: "parsed", confidence: 0.85 }
        : null,
      customer: null,
      operations,
      tool_calls: toolCalls,
      work_offsets: workOffsets,
      estimated_cycle_time_sec: null, // Hurco cycle time similar to Haas
      total_tool_count: toolCalls.length,
      parse_confidence: 0.80,
      warnings,
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: false,
      has_probing: ast.hasProbing,
      line_count: ast.lineCount,
    };
  }

  private _hurcoToolCalls(ast: HurcoProgram, content: string): ParsedToolCall[] {
    const calls: ParsedToolCall[] = [];
    const seen = new Set<number>();

    for (const section of ast.toolSections) {
      if (seen.has(section.tool_number)) continue;
      seen.add(section.tool_number);

      let desc = section.tool_description;
      let diameter: ExtractedField<number> | null = section.diameter !== null
        ? { value: section.diameter, source: "comment", confidence: 0.9 }
        : null;
      let toolType: ExtractedField<ToolType> = { value: "unknown", source: "inferred", confidence: 0.3 };

      // Try Fusion 360 comment parsing (Hurco .hnc files are Fusion-posted)
      const fusionMatch = this._parseFusionToolComment(content, section.tool_number);
      if (fusionMatch) {
        if (fusionMatch.diameter !== null && diameter === null) {
          diameter = { value: fusionMatch.diameter, source: "comment", confidence: 0.95 };
        }
        if (fusionMatch.toolType) {
          toolType = { value: fusionMatch.toolType, source: "comment", confidence: 0.90 };
        }
        if (fusionMatch.description) desc = fusionMatch.description;
      } else if (desc) {
        toolType = this._classifyToolFromDescription(desc);
      }

      calls.push({
        tool_number: section.tool_number,
        offset: section.tool_number, // Hurco offset = tool number
        tool_type: toolType,
        description: desc,
        insert_geometry: null,
        diameter,
        nose_radius: fusionMatch?.cornerRadius !== undefined && fusionMatch?.cornerRadius !== null
          ? { value: fusionMatch.cornerRadius, source: "comment", confidence: 0.95 }
          : null,
        flute_count: section.flute_count !== null
          ? { value: section.flute_count, source: "parsed", confidence: 0.9 }
          : null,
      });
    }
    return calls;
  }

  private _hurcoOperations(ast: HurcoProgram): ParsedOperation[] {
    const ops: ParsedOperation[] = [];
    let seq = 0;
    let currentTool = 0;

    for (const section of ast.toolSections) {
      currentTool = section.tool_number;
      for (const op of section.operations) {
        seq++;
        ops.push({
          sequence: seq,
          type: { value: this._mapHurcoOpType(op.type), source: "parsed", confidence: 0.85 },
          tool_number: { value: currentTool, source: "parsed", confidence: 1.0 },
          spindle_speed: section.spindle_rpm !== null
            ? { value: section.spindle_rpm, source: "parsed", confidence: 1.0 }
            : null,
          spindle_mode: "rpm",
          feed_rate: section.feed_rate !== null
            ? { value: section.feed_rate, source: "parsed", confidence: 0.9 }
            : null,
          feed_mode: "per_min",
          depth_of_cut: null,
          coolant: { value: "unknown", source: "inferred", confidence: 0.3 },
          estimated_time_sec: null,
          g_code: op.g_code,
          line_number: op.line_number,
        });
      }
    }
    return ops;
  }

  private _mapHurcoOpType(hurcoType: string): OperationType {
    const map: Record<string, OperationType> = {
      drill: "drill",
      peck_drill: "peck_drill",
      chip_break: "chip_break",
      tap: "tap",
      bore: "bore",
      bore_fine: "bore_finish",
      cw_pocket: "pocket",
      ccw_pocket: "pocket",
      drill_pattern: "drill",
      pocket: "pocket",
      contour: "contour",
      face: "face",
      bolt_circle: "drill",
      frame: "pocket",
    };
    return map[hurcoType] ?? "unknown";
  }

  // ────────────────────────────────────────────────────────────────────────
  // FANUC / GENERIC ISO PARSER
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Parse standard Fanuc G-code (O-number programs without Haas-specific markers).
   */
  private _parseFanuc(content: string, filename: string, filePath: string): ParsedProgram {
    // Use Haas parser as base — Fanuc is a subset
    const ast = haasParserEngine.parse(content, filename);
    const result = this._parseHaas(content, filename, filePath);
    result.format = { value: "fanuc", source: "parsed", confidence: 0.80 };
    return result;
  }

  /**
   * Parse generic ISO G-code (no clear controller markers).
   */
  private _parseGenericISO(content: string, filename: string, filePath: string): ParsedProgram {
    const lines = content.split(/\r?\n/);
    const warnings: string[] = [];
    const toolCalls: ParsedToolCall[] = [];
    const operations: ParsedOperation[] = [];
    const workOffsets = this._extractWorkOffsets(content);

    let seq = 0;
    let currentTool = 0;
    const seenTools = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("(") || line === "%") continue;

      // Tool change
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        currentTool = parseInt(toolMatch[1] ?? toolMatch[2], 10);
        if (!seenTools.has(currentTool)) {
          seenTools.add(currentTool);
          const comment = lines[i].match(/\(([^)]*)\)/)?.[1] ?? null;
          toolCalls.push({
            tool_number: currentTool,
            offset: currentTool,
            tool_type: comment
              ? this._classifyToolFromDescription(comment)
              : { value: "unknown", source: "inferred", confidence: 0.2 },
            description: comment,
            insert_geometry: null,
            diameter: null,
            nose_radius: null,
            flute_count: null,
          });
        }
      }

      // Canned cycles
      if (/G8[1-9]|G73|G74|G76|G84/.test(line)) {
        seq++;
        const type = this._classifyCannedCycle(line);
        const sM = line.match(/S(\d+)/);
        const fM = line.match(/F(\d+\.?\d*)/);
        operations.push({
          sequence: seq,
          type: { value: type, source: "parsed", confidence: 0.7 },
          tool_number: currentTool > 0
            ? { value: currentTool, source: "parsed", confidence: 1.0 }
            : null,
          spindle_speed: sM ? { value: parseInt(sM[1]), source: "parsed", confidence: 1.0 } : null,
          spindle_mode: "rpm",
          feed_rate: fM ? { value: parseFloat(fM[1]), source: "parsed", confidence: 1.0 } : null,
          feed_mode: "per_min",
          depth_of_cut: null,
          coolant: { value: "unknown", source: "inferred", confidence: 0.3 },
          estimated_time_sec: null,
          g_code: line.match(/G\d+/)?.[0] ?? null,
          line_number: i + 1,
        });
      }
    }

    return {
      source_file: filePath,
      format: { value: "generic_iso", source: "parsed", confidence: 0.60 },
      part_number: null,
      machine_target: null,
      material: null,
      customer: null,
      operations,
      tool_calls: toolCalls,
      work_offsets: workOffsets,
      estimated_cycle_time_sec: null,
      total_tool_count: toolCalls.length,
      parse_confidence: 0.50,
      warnings,
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: operations.some(o => o.type.value === "thread"),
      has_probing: false,
      line_count: lines.length,
    };
  }

  private _classifyCannedCycle(line: string): OperationType {
    if (/G81/.test(line)) return "drill";
    if (/G83/.test(line)) return "peck_drill";
    if (/G73/.test(line)) return "chip_break";
    if (/G84/.test(line)) return "tap";
    if (/G85/.test(line)) return "bore";
    if (/G86/.test(line)) return "bore";
    if (/G76/.test(line)) return "thread";
    if (/G74/.test(line)) return "peck_drill";
    return "unknown";
  }

  // ────────────────────────────────────────────────────────────────────────
  // POST PROCESSOR CYCLE PARSER (KAR-MS2.6 U-KAR46)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Parse Mastercam/hyperMILL .cyc post processor cycle templates.
   * These are macro definitions, NOT actual programs with S/F data.
   * Low-value for proven params, but useful for post processor inventory.
   */
  private _parsePostProcessorCycle(content: string, filename: string, filePath: string): ParsedProgram {
    const warnings: string[] = ["Post processor cycle template — no cutting parameters"];
    const lines = content.split(/\r?\n/);

    // Extract macro variables ($hyperMILL_*, etc.)
    const macroVars = content.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const uniqueVars = [...new Set(macroVars)];

    // Detect cycle type from filename
    const cycleType = this._detectCycleType(filename);

    // Extract G-code template calls (G65, G66, G73, etc.)
    const gCodes = content.match(/G\d+/g) || [];

    return {
      source_file: filePath,
      format: { value: "post_processor_cycle", source: "parsed", confidence: 0.95 },
      part_number: null,
      machine_target: this._detectPostMachineTarget(filePath),
      material: null,
      customer: null,
      operations: cycleType ? [{
        sequence: 1,
        type: { value: cycleType, source: "filename", confidence: 0.70 },
        tool_number: null,
        spindle_speed: null,
        spindle_mode: null,
        feed_rate: null,
        feed_mode: null,
        depth_of_cut: null,
        coolant: { value: "unknown", source: "inferred", confidence: 0.1 },
        estimated_time_sec: null,
        g_code: gCodes[0] ?? null,
        line_number: 1,
      }] : [],
      tool_calls: [],
      work_offsets: [],
      estimated_cycle_time_sec: null,
      total_tool_count: 0,
      parse_confidence: 0.15, // Very low — template, not actual program
      warnings,
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: cycleType === "thread",
      has_probing: cycleType === "probe" || /probing|renishaw/i.test(filePath),
      line_count: lines.length,
    };
  }

  /**
   * Detect cycle type from .cyc filename.
   */
  private _detectCycleType(filename: string): OperationType | null {
    const lower = filename.toLowerCase();
    if (/drill|peck/i.test(lower)) return "peck_drill";
    if (/tap/i.test(lower)) return "tap";
    if (/bore|ream/i.test(lower)) return "bore";
    if (/thread/i.test(lower)) return "thread";
    if (/probe|measure/i.test(lower)) return "probe";
    if (/pocket/i.test(lower)) return "pocket";
    if (/contour|profile/i.test(lower)) return "contour";
    if (/face/i.test(lower)) return "face";
    if (/slot/i.test(lower)) return "slot";
    return null;
  }

  /**
   * Detect machine target from .cyc post processor path.
   */
  private _detectPostMachineTarget(filePath: string): ExtractedField<string> | null {
    const pathLower = filePath.toLowerCase();
    if (/haas.*vf/i.test(pathLower)) {
      return { value: "Haas VF-2", source: "path", confidence: 0.85 };
    }
    if (/okuma.*lb/i.test(pathLower)) {
      return { value: "Okuma LB3000EX II", source: "path", confidence: 0.85 };
    }
    if (/hurco/i.test(pathLower)) {
      return { value: "Hurco VMX24i", source: "path", confidence: 0.85 };
    }
    if (/roku.*roku/i.test(pathLower)) {
      return { value: "Roku-Roku RMX5", source: "path", confidence: 0.85 };
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // ESPRIT BINARY PARSER
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Parse Esprit .ESP file — binary format, string extraction only.
   * Machine target is always Mitsubishi FA10S for JM Die.
   */
  private async _parseEspritBinary(filePath: string, filename: string): Promise<ParsedProgram> {
    const warnings: string[] = [];

    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(filePath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this._errorProgram(filePath, `Failed to read ESP file: ${msg}`);
    }

    // Extract ASCII strings from binary (4+ printable chars in a row)
    const strings = this._extractBinaryStrings(buffer, 4);

    // Try to find part number or customer from embedded strings
    let partNumber: ExtractedField<string> | null = null;
    for (const s of strings) {
      for (const cp of CUSTOMER_PART_PATTERNS) {
        const m = s.match(cp.regex);
        if (m) {
          partNumber = { value: m[1], source: "parsed", confidence: 0.5 };
          break;
        }
      }
      if (partNumber) break;
    }

    // Also try filename
    if (!partNumber) {
      const nameNoExt = path.basename(filename, ".esp");
      const m = nameNoExt.match(GENERIC_PART_PATTERN);
      if (m) {
        partNumber = { value: m[1], source: "filename", confidence: 0.6 };
      }
    }

    warnings.push("Binary ESP format — limited extraction (strings only)");

    return {
      source_file: filePath,
      format: { value: "esprit_wedm", source: "parsed", confidence: 0.90 },
      part_number: partNumber,
      machine_target: { value: "Mitsubishi FA10S", source: "inferred", confidence: 0.9 },
      material: null,
      customer: null,
      operations: [],
      tool_calls: [],
      work_offsets: [],
      estimated_cycle_time_sec: null,
      total_tool_count: 0,
      parse_confidence: 0.30, // Low confidence for binary extraction
      warnings,
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: false,
      has_probing: false,
      line_count: 0,
    };
  }

  /**
   * Extract printable ASCII strings from binary buffer.
   */
  private _extractBinaryStrings(buffer: Buffer, minLength: number): string[] {
    const strings: string[] = [];
    let current = "";

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if (byte >= 0x20 && byte <= 0x7E) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= minLength) {
          strings.push(current);
        }
        current = "";
      }
    }
    if (current.length >= minLength) {
      strings.push(current);
    }
    return strings;
  }

  // ────────────────────────────────────────────────────────────────────────
  // HYPERMILL ARCHIVE PARSER
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Parse hyperMILL .HMC archive — 7z compressed, NOT plain text.
   * Returns metadata-only result with a skip warning.
   */
  private async _parseHyperMILLArchive(filePath: string, filename: string): Promise<ParsedProgram> {
    const warnings: string[] = [];

    // Verify 7z header
    try {
      const fd = await fs.promises.open(filePath, "r");
      const headerBuf = Buffer.alloc(6);
      await fd.read(headerBuf, 0, 6, 0);
      await fd.close();

      const is7z = headerBuf.compare(SEVEN_ZIP_MAGIC, 0, 6, 0, 6) === 0;
      if (is7z) {
        warnings.push("hyperMILL 7z archive detected — full extraction not implemented; metadata from filename/path only");
      } else {
        warnings.push("HMC file does not have 7z header — may be corrupted or alternate format");
      }
    } catch {
      warnings.push("Could not read HMC file header");
    }

    // Extract what we can from filename
    const nameNoExt = path.basename(filename, ".hmc");
    let partNumber: ExtractedField<string> | null = null;
    const m = nameNoExt.match(GENERIC_PART_PATTERN);
    if (m) {
      partNumber = { value: m[1], source: "filename", confidence: 0.5 };
    }

    return {
      source_file: filePath,
      format: { value: "hypermill_archive", source: "parsed", confidence: 0.85 },
      part_number: partNumber,
      machine_target: null,
      material: null,
      customer: null,
      operations: [],
      tool_calls: [],
      work_offsets: [],
      estimated_cycle_time_sec: null,
      total_tool_count: 0,
      parse_confidence: 0.15, // Very low — archive not extracted
      warnings,
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: false,
      has_probing: false,
      line_count: 0,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PATH-BASED METADATA EXTRACTION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Enrich a ParsedProgram with metadata extracted from the file path.
   * JM Die archive has a well-defined directory structure:
   *   CNC LATHE/{customer}/{files}
   *   WIRE EDM/{customer}/{files}
   *   etc.
   */
  private _enrichFromPath(filePath: string, program: ParsedProgram): void {
    const normalized = filePath.replace(/\\/g, "/");

    for (const rule of PATH_MACHINE_RULES) {
      const match = normalized.match(rule.pattern);
      if (match) {
        // Machine target (only set if not already set by parser)
        if (!program.machine_target) {
          program.machine_target = {
            value: rule.machine,
            source: "path",
            confidence: 0.8,
          };
        }

        // Customer from directory name
        if (rule.extractCustomer && match[1] && !program.customer) {
          const rawCustomer = match[1].trim();
          // Skip if it looks like a file rather than a folder
          if (!rawCustomer.includes(".") && rawCustomer.length > 1) {
            program.customer = {
              value: rawCustomer,
              source: "path",
              confidence: 0.85,
            };
          }
        }
        break; // First match wins
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // PART NUMBER EXTRACTION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Extract part number from filename, path, and program content.
   * Uses customer-specific regex patterns when customer is known.
   */
  private _extractPartNumber(filePath: string, content: string, program: ParsedProgram): void {
    if (program.part_number) return; // Already set (e.g., by ESP parser)

    const filename = path.basename(filePath);
    const nameNoExt = path.parse(filename).name;
    const customerName = program.customer?.value?.toUpperCase() ?? "";

    // Try customer-specific patterns first
    for (const cp of CUSTOMER_PART_PATTERNS) {
      if (customerName && customerName.includes(cp.name)) {
        // Match against filename
        const fileMatch = nameNoExt.match(cp.regex);
        if (fileMatch) {
          program.part_number = { value: fileMatch[1], source: "filename", confidence: 0.9 };
          return;
        }
        // Match against first 50 lines of content
        const headerLines = content.split(/\r?\n/).slice(0, 50).join("\n");
        const contentMatch = headerLines.match(cp.regex);
        if (contentMatch) {
          program.part_number = { value: contentMatch[1], source: "parsed", confidence: 0.85 };
          return;
        }
      }
    }

    // Try all customer patterns against filename (even without customer context)
    for (const cp of CUSTOMER_PART_PATTERNS) {
      const m = nameNoExt.match(cp.regex);
      if (m) {
        program.part_number = { value: m[1], source: "filename", confidence: 0.7 };
        return;
      }
    }

    // Generic fallback: use cleaned filename as part number
    const cleaned = nameNoExt
      .replace(/[-_]?(REV|REV\d|V\d|FINISH|ROUGH|OP\d|SETUP\d|PROG\d)$/i, "")
      .replace(/^(PROG|PGM|PROGRAM)[-_]/i, "")
      .trim();

    if (cleaned.length >= 2) {
      const genericMatch = cleaned.match(GENERIC_PART_PATTERN);
      if (genericMatch) {
        program.part_number = { value: genericMatch[1], source: "filename", confidence: 0.5 };
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // SHARED UTILITIES
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Extract G54-G59 (and G54.1 Pn) work offsets from program content.
   */
  private _extractWorkOffsets(content: string): string[] {
    const offsets = new Set<string>();
    const upper = content.toUpperCase();

    // Standard work offsets G54-G59
    for (const m of upper.matchAll(/\b(G5[4-9])\b/g)) {
      offsets.add(m[1]);
    }
    // Extended work offsets G54.1 P1-P300 (Haas/Fanuc)
    for (const m of upper.matchAll(/\b(G54\.1\s*P\d+)/g)) {
      offsets.add(m[1].replace(/\s/g, ""));
    }

    return [...offsets].sort();
  }

  /**
   * Classify tool type from a description string.
   * Matches against TOOL_TYPE_PATTERNS in priority order.
   */
  private _classifyToolFromDescription(desc: string): ExtractedField<ToolType> {
    for (const p of TOOL_TYPE_PATTERNS) {
      if (p.regex.test(desc)) {
        return { value: p.type, source: "comment", confidence: 0.80 };
      }
    }
    return { value: "unknown", source: "inferred", confidence: 0.2 };
  }

  /**
   * Extract insert geometry designation from Okuma tool comment.
   * Example: "(OD RGH. .032R CNMG-432)" => "CNMG-432"
   */
  private _extractInsertGeometry(desc: string): ExtractedField<string> | null {
    // ISO insert designations: CNMG, DNMG, WNMG, VNMG, TNMG, DCMT, CCMT, etc.
    const m = desc.match(/([CDSTVW][CNPB][AEGHKLMNPRSTUVW][AEGHKLMNPRSTUVW][-\s]?\d{2,4})/i);
    if (m) {
      return { value: m[1].toUpperCase(), source: "comment", confidence: 0.85 };
    }
    return null;
  }

  /**
   * Extract nose radius from Okuma tool comment.
   * Example: "(OD RGH. & FACE .032R)" => 0.032
   * Example: "(OD FIN 1/64R)" => 0.015625
   */
  private _extractNoseRadius(desc: string): ExtractedField<number> | null {
    // Decimal radius: .032R or 0.032R
    const decMatch = desc.match(/(\d*\.?\d+)\s*R\b/i);
    if (decMatch) {
      const val = parseFloat(decMatch[1]);
      if (val > 0 && val < 1) { // Nose radius should be < 1 inch
        return { value: val, source: "comment", confidence: 0.85 };
      }
    }
    // Fractional radius: 1/64R, 1/32R
    const fracMatch = desc.match(/(\d+)\/(\d+)\s*R\b/i);
    if (fracMatch) {
      const val = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
      if (val > 0 && val < 1) {
        return { value: val, source: "comment", confidence: 0.80 };
      }
    }
    // CR= format from Fusion comments
    const crMatch = desc.match(/CR\s*=\s*(\d+\.?\d*)/i);
    if (crMatch) {
      return { value: parseFloat(crMatch[1]), source: "comment", confidence: 0.95 };
    }
    return null;
  }

  /**
   * Compute overall parse confidence by averaging field confidences.
   */
  private _computeOverallConfidence(program: ParsedProgram): number {
    const scores: number[] = [program.format.confidence];

    if (program.part_number) scores.push(program.part_number.confidence);
    if (program.machine_target) scores.push(program.machine_target.confidence);
    if (program.customer) scores.push(program.customer.confidence);

    // Weight by number of extracted operations and tools
    if (program.operations.length > 0) {
      const avgOpConf = program.operations.reduce((s, o) => s + o.type.confidence, 0) / program.operations.length;
      scores.push(avgOpConf);
    }
    if (program.tool_calls.length > 0) {
      const avgToolConf = program.tool_calls.reduce((s, t) => s + t.tool_type.confidence, 0) / program.tool_calls.length;
      scores.push(avgToolConf);
    }

    // Bonus for having more data extracted
    const dataCompleteness = [
      program.part_number !== null,
      program.machine_target !== null,
      program.material !== null,
      program.customer !== null,
      program.operations.length > 0,
      program.tool_calls.length > 0,
      program.estimated_cycle_time_sec !== null,
    ].filter(Boolean).length / 7;

    scores.push(dataCompleteness);

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Create an error/empty ParsedProgram for files that couldn't be parsed.
   */
  private _errorProgram(filePath: string, errorMsg: string): ParsedProgram {
    return {
      source_file: filePath,
      format: { value: "unknown", source: "inferred", confidence: 0 },
      part_number: null,
      machine_target: null,
      material: null,
      customer: null,
      operations: [],
      tool_calls: [],
      work_offsets: [],
      estimated_cycle_time_sec: null,
      total_tool_count: 0,
      parse_confidence: 0,
      warnings: [errorMsg],
      has_bar_feeder: false,
      has_live_tooling: false,
      has_c_axis: false,
      has_threading: false,
      has_probing: false,
      line_count: 0,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // FILE COLLECTION (for archive parsing)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Recursively collect all files matching allowed extensions.
   */
  private async _collectFiles(dir: string, allowedExts: Set<string>): Promise<string[]> {
    const results: string[] = [];

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this._collectFiles(fullPath, allowedExts);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExts.has(ext)) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }
}

/** Singleton instance */
export const unifiedProgramParser = new UnifiedProgramParserEngineImpl();
