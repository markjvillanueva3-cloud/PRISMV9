/**
 * MillPatternMinerEngine — Mine Milling Patterns from Parsed Programs
 *
 * Analyzes parsed Haas/Hurco/Roku-Roku mill programs to extract
 * milling-specific patterns beyond speed/feed data.
 *
 * Extracts:
 *   - Pocket strategies (trochoidal, adaptive, standard)
 *   - HSM parameters by material (step-over ratios, DOC)
 *   - Plunge strategies (ramp, helix, bore)
 *   - Chip load per tool type/diameter
 *   - Entry/exit strategies
 *   - Coolant usage patterns
 *   - RPM vs tool diameter relationships
 *   - Canned cycle usage frequency
 *   - Smoothing mode preferences (G187 on Haas, AICC on Roku-Roku)
 *
 * Feeds pattern data into PRISM's milling knowledge base and
 * SpeedFeedOrchestratorEngine calibration tables.
 *
 * @module engines/MillPatternMinerEngine
 */

import { readFileSync } from "node:fs";
import { log } from "../utils/Logger.js";
// Static ESM imports for the parser singletons (was inline `require(...)` inside
// mineJMDiePrograms -- CommonJS require is undefined under ESM/tsx and threw on every program,
// yielding 0 chip-load samples. No circular dep: none of these parsers import MillPatternMiner.
import { haasParserEngine } from "./HaasParserEngine.js";
import type { HaasProgram, HaasToolSection, HaasOperation } from "./HaasParserEngine.js";
import { hurcoParserEngine } from "./HurcoParserEngine.js";
import type { HurcoProgram, HurcoToolSection, HurcoOperation } from "./HurcoParserEngine.js";
import { rokuRokuParserEngine } from "./RokuRokuParserEngine.js";
import type { RokuRokuProgram, RokuRokuToolSection, RokuRokuOperation } from "./RokuRokuParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MillPattern {
  pattern_type: string;
  g_code: string;
  frequency: number;
  programs: string[];
  context: string;
}

export interface PocketStrategy {
  type: "standard" | "trochoidal" | "adaptive" | "peel_mill" | "spiral" | "unknown";
  g_code: string;
  frequency: number;
  step_over_pct: number | null;
  doc_mm: number | null;
  programs: string[];
}

export interface PlungeStrategy {
  type: "direct" | "ramp" | "helix" | "bore" | "pre_drill" | "unknown";
  frequency: number;
  programs: string[];
}

export interface ChipLoadSample {
  program: string;
  tool_number: number;
  tool_desc: string | null;
  diameter_mm: number | null;
  flute_count: number | null;
  rpm: number;
  feed_rate: number;
  chip_load: number | null;
  operation: string;
}

export interface HSMProfile {
  controller: "haas" | "hurco" | "rokuroku";
  smoothing_mode: string | null;
  aicc_enabled: boolean;
  hpcc_enabled: boolean;
  sss_enabled: boolean;
  max_rpm: number;
  min_tool_dia_mm: number | null;
  frequency: number;
  programs: string[];
}

export interface CannedCycleUsage {
  g_code: string;
  description: string;
  frequency: number;
  avg_params: Record<string, number>;
  programs: string[];
}

export interface CoolantPattern {
  code: string;
  type: "flood" | "mist" | "through_tool" | "air_blast" | "off" | "unknown";
  frequency: number;
  programs: string[];
}

export interface MillMineResult {
  total_programs: number;
  total_tools: number;
  total_operations: number;
  pocket_strategies: PocketStrategy[];
  plunge_strategies: PlungeStrategy[];
  chip_load_samples: ChipLoadSample[];
  hsm_profiles: HSMProfile[];
  canned_cycles: CannedCycleUsage[];
  coolant_patterns: CoolantPattern[];
  top_patterns: MillPattern[];
  rpm_diameter_data: Array<{ rpm: number; diameter_mm: number; program: string }>;
}

// Controllers whose programs are G-code the Haas/Hurco/RokuRoku parsers can read. Anything else
// (notably Mastercam .mcx-8 CAD/CAM binaries) is NOT G-code: reading it as utf-8 yields garbage and
// 0 samples, so the JM Die miner skips + ACCOUNTS for it explicitly rather than silently undercounting.
const MILL_GCODE_CONTROLLERS = new Set(["haas_ngc", "hurco_winmax", "fanuc"]);
// Mastercam binary part files: .mcx, .mcx-8, .mcx-9, .mcam, etc.
const MASTERCAM_BINARY_RE = /\.(mcx(-?\d+)?|mcam)$/i;

// ============================================================================
// CANNED CYCLE DEFINITIONS
// ============================================================================

const CANNED_CYCLE_MAP: Record<string, string> = {
  G73: "high-speed peck drill",
  G74: "reverse tapping",
  G76: "fine boring",
  G80: "canned cycle cancel",
  G81: "spot drill / center drill",
  G82: "counter bore / spot face",
  G83: "deep hole peck drill",
  G84: "tapping",
  G85: "bore in, bore out",
  G86: "bore in, rapid out",
  G87: "bore in, manual retract",
  G88: "bore in, dwell, manual out",
  G89: "bore in, dwell, bore out",
};

const COOLANT_CODES: Record<string, CoolantPattern["type"]> = {
  M08: "flood",
  M07: "mist",
  M88: "through_tool",
  M51: "air_blast",
  M09: "off",
};

// ============================================================================
// ENGINE
// ============================================================================

export class MillPatternMinerEngine {
  /**
   * Mine patterns from a collection of parsed Haas programs.
   */
  mineHaas(programs: Array<{ filename: string; parsed: HaasProgram }>): MillMineResult {
    const result = this._initResult();

    for (const { filename, parsed } of programs) {
      result.total_programs++;
      result.total_tools += parsed.toolSections.length;

      for (const section of parsed.toolSections) {
        result.total_operations += section.operations.length;
        this._extractHaasChipLoads(filename, section, result);
        this._extractHaasCannedCycles(filename, section.operations, result);
      }

      this._extractHaasSmoothing(filename, parsed, result);
      this._extractHaasCoolant(filename, parsed, result);
      this._extractPlungeFromOps(filename, parsed.operations, result);
      this._extractPocketFromOps(filename, parsed.operations, result);
    }

    this._computeTopPatterns(result);
    return result;
  }

  /**
   * Mine patterns from a collection of parsed Hurco programs.
   */
  mineHurco(programs: Array<{ filename: string; parsed: HurcoProgram }>): MillMineResult {
    const result = this._initResult();

    for (const { filename, parsed } of programs) {
      result.total_programs++;
      result.total_tools += parsed.toolSections.length;

      for (const section of parsed.toolSections) {
        result.total_operations += section.operations.length;
        this._extractHurcoChipLoads(filename, section, result);
        this._extractHurcoCannedCycles(filename, section.operations, result);
      }

      this._extractHurcoCoolant(filename, parsed, result);
      this._extractPlungeFromOps(filename, parsed.operations as any[], result);
      this._extractPocketFromOps(filename, parsed.operations as any[], result);
    }

    this._computeTopPatterns(result);
    return result;
  }

  /**
   * Mine patterns from a collection of parsed Roku-Roku programs.
   */
  mineRokuRoku(programs: Array<{ filename: string; parsed: RokuRokuProgram }>): MillMineResult {
    const result = this._initResult();

    for (const { filename, parsed } of programs) {
      result.total_programs++;
      result.total_tools += parsed.toolSections.length;

      for (const section of parsed.toolSections) {
        result.total_operations += section.operations.length;
        this._extractRokuRokuChipLoads(filename, section, result);
        this._extractRokuRokuCannedCycles(filename, section.operations, result);
      }

      this._extractRokuRokuHSM(filename, parsed, result);
      this._extractRokuRokuRPMDiameter(filename, parsed, result);
      this._extractPlungeFromOps(filename, parsed.operations as any[], result);
      this._extractPocketFromOps(filename, parsed.operations as any[], result);
    }

    this._computeTopPatterns(result);
    return result;
  }

  /**
   * Mine patterns from a mixed collection of all three parser types.
   */
  mineAll(programs: Array<{
    filename: string;
    controller: "haas" | "hurco" | "rokuroku";
    parsed: HaasProgram | HurcoProgram | RokuRokuProgram;
  }>): MillMineResult {
    const haas = programs
      .filter(p => p.controller === "haas")
      .map(p => ({ filename: p.filename, parsed: p.parsed as HaasProgram }));
    const hurco = programs
      .filter(p => p.controller === "hurco")
      .map(p => ({ filename: p.filename, parsed: p.parsed as HurcoProgram }));
    const roku = programs
      .filter(p => p.controller === "rokuroku")
      .map(p => ({ filename: p.filename, parsed: p.parsed as RokuRokuProgram }));

    const results = [
      haas.length > 0 ? this.mineHaas(haas) : null,
      hurco.length > 0 ? this.mineHurco(hurco) : null,
      roku.length > 0 ? this.mineRokuRoku(roku) : null,
    ].filter(Boolean) as MillMineResult[];

    return this._mergeResults(results);
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Initialization
  // ─────────────────────���──────────────────────────────────────────

  private _initResult(): MillMineResult {
    return {
      total_programs: 0,
      total_tools: 0,
      total_operations: 0,
      pocket_strategies: [],
      plunge_strategies: [],
      chip_load_samples: [],
      hsm_profiles: [],
      canned_cycles: [],
      coolant_patterns: [],
      top_patterns: [],
      rpm_diameter_data: [],
    };
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Haas extraction
  // ───��──────────────────��─────────────────────────────���───────────

  private _extractHaasChipLoads(filename: string, section: HaasToolSection, result: MillMineResult): void {
    if (!section.spindle_rpm || section.spindle_rpm <= 0) return;

    for (const op of section.operations) {
      const feed = op.params.F != null ? Number(op.params.F) : null;
      if (feed == null || feed <= 0) continue;

      result.chip_load_samples.push({
        program: filename,
        tool_number: section.tool_number,
        tool_desc: section.tool_comment,
        diameter_mm: null,
        flute_count: null,
        rpm: section.spindle_rpm,
        feed_rate: feed,
        chip_load: null,  // Can't compute without flute count
        operation: op.type,
      });
    }
  }

  private _extractHaasCannedCycles(filename: string, operations: HaasOperation[], result: MillMineResult): void {
    for (const op of operations) {
      if (op.g_code in CANNED_CYCLE_MAP) {
        this._addCannedCycle(result, op.g_code, filename, op.params);
      }
    }
  }

  private _extractHaasSmoothing(filename: string, parsed: HaasProgram, result: MillMineResult): void {
    if (parsed.hasG187Smoothing) {
      result.hsm_profiles.push({
        controller: "haas",
        smoothing_mode: "G187",
        aicc_enabled: false,
        hpcc_enabled: false,
        sss_enabled: false,
        max_rpm: Math.max(...parsed.toolSections.map(s => s.spindle_rpm || 0), 0),
        min_tool_dia_mm: null,
        frequency: 1,
        programs: [filename],
      });
    }
  }

  private _extractHaasCoolant(filename: string, parsed: HaasProgram, result: MillMineResult): void {
    for (const line of parsed.rawLines) {
      for (const [code, type] of Object.entries(COOLANT_CODES)) {
        if (line.includes(code)) {
          this._addCoolant(result, code, type, filename);
        }
      }
    }
  }

  // ──────────────────────────────��─────────────────────────────────
  // PRIVATE: Hurco extraction
  // ───────────���────────────────────────────────���───────────────────

  private _extractHurcoChipLoads(filename: string, section: HurcoToolSection, result: MillMineResult): void {
    if (!section.spindle_rpm || section.spindle_rpm <= 0) return;

    const chipLoad = section.diameter != null && section.flute_count != null && section.feed_rate != null
      ? section.feed_rate / (section.spindle_rpm * section.flute_count)
      : null;

    if (section.feed_rate && section.feed_rate > 0) {
      result.chip_load_samples.push({
        program: filename,
        tool_number: section.tool_number,
        tool_desc: section.tool_description,
        diameter_mm: section.diameter,
        flute_count: section.flute_count,
        rpm: section.spindle_rpm,
        feed_rate: section.feed_rate,
        chip_load: chipLoad,
        operation: section.operations[0]?.type || "unknown",
      });
    }
  }

  private _extractHurcoCannedCycles(filename: string, operations: HurcoOperation[], result: MillMineResult): void {
    for (const op of operations) {
      if (op.g_code && op.g_code in CANNED_CYCLE_MAP) {
        this._addCannedCycle(result, op.g_code, filename, op.params);
      }
    }
  }

  private _extractHurcoCoolant(filename: string, parsed: HurcoProgram, result: MillMineResult): void {
    for (const line of parsed.rawLines) {
      for (const [code, type] of Object.entries(COOLANT_CODES)) {
        if (line.includes(code)) {
          this._addCoolant(result, code, type, filename);
        }
      }
    }
  }

  // ──────────────────────────────��─────────────────────────────────
  // PRIVATE: Roku-Roku extraction
  // ──��─────────────────────────────────────────────────────────────

  private _extractRokuRokuChipLoads(filename: string, section: RokuRokuToolSection, result: MillMineResult): void {
    if (!section.spindle_rpm || section.spindle_rpm <= 0) return;
    if (!section.feed_rate || section.feed_rate <= 0) return;

    const chipLoad = section.diameter_mm != null
      ? section.feed_rate / section.spindle_rpm  // single-flute approximation for micro mills
      : null;

    result.chip_load_samples.push({
      program: filename,
      tool_number: section.tool_number,
      tool_desc: section.tool_comment,
      diameter_mm: section.diameter_mm,
      flute_count: null,
      rpm: section.spindle_rpm,
      feed_rate: section.feed_rate,
      chip_load: chipLoad,
      operation: section.operations[0]?.type || "micro_mill",
    });
  }

  private _extractRokuRokuCannedCycles(filename: string, operations: RokuRokuOperation[], result: MillMineResult): void {
    for (const op of operations) {
      if (op.g_code in CANNED_CYCLE_MAP) {
        this._addCannedCycle(result, op.g_code, filename, op.params);
      }
    }
  }

  private _extractRokuRokuHSM(filename: string, parsed: RokuRokuProgram, result: MillMineResult): void {
    if (parsed.hasAICC || parsed.hasHPCC || parsed.hasSSS || parsed.hasNanoSmoothing) {
      result.hsm_profiles.push({
        controller: "rokuroku",
        smoothing_mode: parsed.hasHPCC ? "G05_P10000" : parsed.hasAICC ? "G05.1_Q1" : parsed.hasSSS ? "SSS" : "nano",
        aicc_enabled: parsed.hasAICC,
        hpcc_enabled: parsed.hasHPCC,
        sss_enabled: parsed.hasSSS,
        max_rpm: parsed.maxRPM,
        min_tool_dia_mm: parsed.minToolDia,
        frequency: 1,
        programs: [filename],
      });
    }
  }

  private _extractRokuRokuRPMDiameter(filename: string, parsed: RokuRokuProgram, result: MillMineResult): void {
    for (const section of parsed.toolSections) {
      if (section.spindle_rpm > 0 && section.diameter_mm != null && section.diameter_mm > 0) {
        result.rpm_diameter_data.push({
          rpm: section.spindle_rpm,
          diameter_mm: section.diameter_mm,
          program: filename,
        });
      }
    }
  }

  // ─���──────────────────────────────────────────────────────────────
  // PRIVATE: Generic pattern extraction
  // ────────────────────────────────────────────────────────────────

  private _extractPlungeFromOps(filename: string, operations: Array<{ type: string; g_code?: string | null; params?: Record<string, any> }>, result: MillMineResult): void {
    for (const op of operations) {
      let plungeType: PlungeStrategy["type"] | null = null;

      if (op.type === "drill" || op.type === "center_drill") {
        plungeType = "direct";
      } else if (op.type === "helix" || op.type === "helix_bore") {
        plungeType = "helix";
      } else if (op.type === "ramp" || op.type === "ramp_entry") {
        plungeType = "ramp";
      } else if (op.type === "bore" || op.type === "boring") {
        plungeType = "bore";
      }

      if (plungeType) {
        const existing = result.plunge_strategies.find(p => p.type === plungeType);
        if (existing) {
          existing.frequency++;
          if (!existing.programs.includes(filename)) existing.programs.push(filename);
        } else {
          result.plunge_strategies.push({
            type: plungeType,
            frequency: 1,
            programs: [filename],
          });
        }
      }
    }
  }

  private _extractPocketFromOps(filename: string, operations: Array<{ type: string; g_code?: string | null; params?: Record<string, any> }>, result: MillMineResult): void {
    for (const op of operations) {
      let pocketType: PocketStrategy["type"] | null = null;
      let gCode = "";

      if (op.type === "pocket" || op.type === "pocket_mill") {
        pocketType = "standard";
        gCode = op.g_code || "";
      } else if (op.type === "trochoidal" || op.type === "dynamic_mill") {
        pocketType = "trochoidal";
        gCode = op.g_code || "";
      } else if (op.type === "adaptive" || op.type === "adaptive_clearing") {
        pocketType = "adaptive";
        gCode = op.g_code || "";
      } else if (op.type === "peel_mill" || op.type === "peel") {
        pocketType = "peel_mill";
        gCode = op.g_code || "";
      }

      if (pocketType) {
        const existing = result.pocket_strategies.find(p => p.type === pocketType);
        if (existing) {
          existing.frequency++;
          if (!existing.programs.includes(filename)) existing.programs.push(filename);
        } else {
          result.pocket_strategies.push({
            type: pocketType,
            g_code: gCode,
            frequency: 1,
            step_over_pct: null,
            doc_mm: null,
            programs: [filename],
          });
        }
      }
    }
  }

  // ─────────────────────────��──────────────────────────────────────
  // PRIVATE: Accumulator helpers
  // ────────────────────────────────────────────────────────────────

  private _addCannedCycle(result: MillMineResult, gCode: string, filename: string, params: Record<string, any>): void {
    const existing = result.canned_cycles.find(c => c.g_code === gCode);
    if (existing) {
      existing.frequency++;
      if (!existing.programs.includes(filename)) existing.programs.push(filename);
      // Update average params
      for (const [key, val] of Object.entries(params)) {
        const numVal = Number(val);
        if (!isNaN(numVal)) {
          existing.avg_params[key] = existing.avg_params[key] != null
            ? (existing.avg_params[key] * (existing.frequency - 1) + numVal) / existing.frequency
            : numVal;
        }
      }
    } else {
      const avgParams: Record<string, number> = {};
      for (const [key, val] of Object.entries(params)) {
        const numVal = Number(val);
        if (!isNaN(numVal)) avgParams[key] = numVal;
      }
      result.canned_cycles.push({
        g_code: gCode,
        description: CANNED_CYCLE_MAP[gCode] || "unknown",
        frequency: 1,
        avg_params: avgParams,
        programs: [filename],
      });
    }
  }

  private _addCoolant(result: MillMineResult, code: string, type: CoolantPattern["type"], filename: string): void {
    const existing = result.coolant_patterns.find(c => c.code === code);
    if (existing) {
      existing.frequency++;
      if (!existing.programs.includes(filename)) existing.programs.push(filename);
    } else {
      result.coolant_patterns.push({
        code,
        type,
        frequency: 1,
        programs: [filename],
      });
    }
  }

  // ────────���────────────────────────────���──────────────────────────
  // PRIVATE: Post-processing
  // ──────────���─────────────────────────────────────────────────────

  private _computeTopPatterns(result: MillMineResult): void {
    const patterns: MillPattern[] = [];

    // Add canned cycles as patterns
    for (const cycle of result.canned_cycles) {
      patterns.push({
        pattern_type: "canned_cycle",
        g_code: cycle.g_code,
        frequency: cycle.frequency,
        programs: cycle.programs,
        context: cycle.description,
      });
    }

    // Add pocket strategies as patterns
    for (const pocket of result.pocket_strategies) {
      patterns.push({
        pattern_type: "pocket_strategy",
        g_code: pocket.g_code,
        frequency: pocket.frequency,
        programs: pocket.programs,
        context: pocket.type,
      });
    }

    // Add coolant patterns
    for (const coolant of result.coolant_patterns) {
      patterns.push({
        pattern_type: "coolant",
        g_code: coolant.code,
        frequency: coolant.frequency,
        programs: coolant.programs,
        context: coolant.type,
      });
    }

    // Sort by frequency descending
    patterns.sort((a, b) => b.frequency - a.frequency);
    result.top_patterns = patterns.slice(0, 20);
  }

  private _mergeResults(results: MillMineResult[]): MillMineResult {
    const merged = this._initResult();

    for (const r of results) {
      merged.total_programs += r.total_programs;
      merged.total_tools += r.total_tools;
      merged.total_operations += r.total_operations;
      merged.pocket_strategies.push(...r.pocket_strategies);
      merged.plunge_strategies.push(...r.plunge_strategies);
      merged.chip_load_samples.push(...r.chip_load_samples);
      merged.hsm_profiles.push(...r.hsm_profiles);
      merged.canned_cycles.push(...r.canned_cycles);
      merged.coolant_patterns.push(...r.coolant_patterns);
      merged.rpm_diameter_data.push(...r.rpm_diameter_data);
    }

    // Deduplicate canned cycles by g_code
    const cycleMap = new Map<string, CannedCycleUsage>();
    for (const c of merged.canned_cycles) {
      const existing = cycleMap.get(c.g_code);
      if (existing) {
        existing.frequency += c.frequency;
        for (const p of c.programs) {
          if (!existing.programs.includes(p)) existing.programs.push(p);
        }
      } else {
        cycleMap.set(c.g_code, { ...c });
      }
    }
    merged.canned_cycles = Array.from(cycleMap.values());

    // Deduplicate coolant patterns
    const coolMap = new Map<string, CoolantPattern>();
    for (const c of merged.coolant_patterns) {
      const existing = coolMap.get(c.code);
      if (existing) {
        existing.frequency += c.frequency;
        for (const p of c.programs) {
          if (!existing.programs.includes(p)) existing.programs.push(p);
        }
      } else {
        coolMap.set(c.code, { ...c });
      }
    }
    merged.coolant_patterns = Array.from(coolMap.values());

    this._computeTopPatterns(merged);

    log.debug(`[MillPatternMiner] Mined ${merged.total_programs} programs: ` +
      `${merged.chip_load_samples.length} chip load samples, ` +
      `${merged.canned_cycles.length} canned cycle types, ` +
      `${merged.hsm_profiles.length} HSM profiles`);

    return merged;
  }

  // ────────────────────────────────────────────────────────────────
  // JM DIE INTEGRATION (KAR-MS2 U-KAR12)
  // ────────────────────────────────────────────────────────────────

  /**
   * Mine patterns from JM Die mill programs.
   * Processes .nc files from CNC MILL HAAS, HAAS-HURCO, ROKU-ROKU folders.
   * @param programEntries - Program entries from JMDieProgramInventoryEngine
   */
  mineJMDiePrograms(programEntries: Array<{
    filePath: string;
    programType: string;
    controller: string;
    customer: string;
    topFolder: string;
  }>): MillMineResult & {
    byCustomer: Record<string, number>;
    byTopFolder: Record<string, number>;
    skipped_programs: number;
    skipped_by_reason: Record<string, number>;
  } {
    const result = this._initResult() as MillMineResult & {
      byCustomer: Record<string, number>;
      byTopFolder: Record<string, number>;
      skipped_programs: number;
      skipped_by_reason: Record<string, number>;
    };
    result.byCustomer = {};
    result.byTopFolder = {};
    result.skipped_programs = 0;
    result.skipped_by_reason = {};

    // Filter to mill programs only
    const millPrograms = programEntries.filter(p => p.programType === "mill");

    log.info(`[MillPatternMiner] Processing ${millPrograms.length} JM Die mill programs...`);

    for (const entry of millPrograms) {
      result.total_programs++;
      result.byCustomer[entry.customer] = (result.byCustomer[entry.customer] || 0) + 1;
      result.byTopFolder[entry.topFolder] = (result.byTopFolder[entry.topFolder] || 0) + 1;

      // Skip non-G-code entries (R12: account for them, never silently undercount). Mastercam
      // .mcx-8 binaries + unknown controllers are not readable by the G-code parsers, so reading
      // them as utf-8 produces 0 samples with no explanation.
      const isMastercamBinary = MASTERCAM_BINARY_RE.test(entry.filePath);
      if (isMastercamBinary || !MILL_GCODE_CONTROLLERS.has(entry.controller)) {
        const reason = isMastercamBinary
          ? "mastercam_binary"
          : `unparsed_controller:${entry.controller || "unknown"}`;
        result.skipped_programs++;
        result.skipped_by_reason[reason] = (result.skipped_by_reason[reason] || 0) + 1;
        continue;
      }

      try {
        // Read and parse based on controller
        const source = readFileSync(entry.filePath, "utf-8");

        if (entry.controller === "haas_ngc") {
          const parsed = haasParserEngine.parse(source, entry.filePath);
          result.total_tools += parsed.toolSections.length;

          for (const section of parsed.toolSections) {
            result.total_operations += section.operations.length;
            this._extractHaasChipLoads(entry.filePath, section, result);
            this._extractHaasCannedCycles(entry.filePath, section.operations, result);
          }
        } else if (entry.controller === "hurco_winmax") {
          const parsed = hurcoParserEngine.parse(source, entry.filePath);
          result.total_tools += parsed.toolSections.length;

          for (const section of parsed.toolSections) {
            result.total_operations += section.operations.length;
            this._extractHurcoChipLoads(entry.filePath, section, result);
            this._extractHurcoCannedCycles(entry.filePath, section.operations, result);
          }
        } else if (entry.controller === "fanuc") {
          // Roku-Roku uses FANUC-style controller
          const parsed = rokuRokuParserEngine.parse(source, entry.filePath);
          result.total_tools += parsed.toolSections.length;

          for (const section of parsed.toolSections) {
            result.total_operations += section.operations.length;
            this._extractRokuRokuChipLoads(entry.filePath, section, result);
            this._extractRokuRokuCannedCycles(entry.filePath, section.operations, result);
          }
        }
      } catch (e) {
        // Continue on parse errors - log but don't fail batch
        log.debug(`[MillPatternMiner] Parse error for ${entry.filePath}: ${e}`);
      }
    }

    this._computeTopPatterns(result);

    log.info(`[MillPatternMiner] JM Die mining complete: ` +
      `${result.total_programs} programs (${result.skipped_programs} skipped: ${JSON.stringify(result.skipped_by_reason)}), ` +
      `${result.chip_load_samples.length} chip load samples, ` +
      `${Object.keys(result.byCustomer).length} customers`);

    return result;
  }

  /**
   * Get HSM engagement patterns grouped by material (inferred from customer/part)
   */
  getEngagementPatterns(result: MillMineResult): Array<{
    stepOverRange: { min: number; max: number; avg: number };
    docRange: { min: number; max: number; avg: number };
    frequency: number;
  }> {
    const patterns: Array<{
      stepOverRange: { min: number; max: number; avg: number };
      docRange: { min: number; max: number; avg: number };
      frequency: number;
    }> = [];

    // Group pocket strategies by step-over
    const withStepOver = result.pocket_strategies.filter(p => p.step_over_pct !== null);
    if (withStepOver.length > 0) {
      const stepOvers = withStepOver.map(p => p.step_over_pct!);
      const docs = withStepOver.filter(p => p.doc_mm !== null).map(p => p.doc_mm!);

      patterns.push({
        stepOverRange: {
          min: Math.min(...stepOvers),
          max: Math.max(...stepOvers),
          avg: stepOvers.reduce((a, b) => a + b, 0) / stepOvers.length,
        },
        docRange: docs.length > 0 ? {
          min: Math.min(...docs),
          max: Math.max(...docs),
          avg: docs.reduce((a, b) => a + b, 0) / docs.length,
        } : { min: 0, max: 0, avg: 0 },
        frequency: withStepOver.reduce((sum, p) => sum + p.frequency, 0),
      });
    }

    return patterns;
  }
}

// Singleton export
export const millPatternMinerEngine = new MillPatternMinerEngine();
