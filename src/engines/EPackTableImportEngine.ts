/**
 * EPackTableImportEngine — Import Machine Technology Tables (U-W100-12)
 *
 * Imports Mitsubishi E-pack technology table data from user-provided files.
 * The DEFINITIVE solution: when a shop has a machine's actual tech tables,
 * imported params override published defaults for exact machine match.
 *
 * Supported formats:
 *   1. JSON (.json) — structured array of E-pack entries
 *   2. CSV/TSV (.csv/.tsv) — tabular tech table data
 *   3. Key-value text (.txt/.tec) — Mitsubishi-style param blocks
 *
 * Mitsubishi .EPK/.TEC files are proprietary binary format. This engine
 * supports TEXT-based formats that can be manually transcribed from the
 * machine's screen or exported via optional machine utilities.
 *
 * Fallback chain: imported → published → error (never synthetic)
 *
 * @module engines/EPackTableImportEngine
 */

import { decodeEPackCode } from "./WEDMPrintToProgramEngine.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Single E-pack technology table entry — one set of cutting conditions */
export interface EPackEntry {
  /** E-pack code (e.g., "E1221") */
  e_pack_code: string;
  /** Pulse on-time [µs] */
  t_on_us: number;
  /** Pulse off-time [µs] */
  t_off_us: number;
  /** Peak current [A] */
  peak_current_A: number;
  /** Open-circuit voltage [V] (optional) */
  open_voltage_V?: number;
  /** Servo voltage [V] (optional) */
  servo_voltage_V?: number;
  /** Wire speed [m/min] */
  wire_speed_m_min?: number;
  /** Wire tension [N] (optional) */
  wire_tension_N?: number;
  /** Expected feed rate [mm/min] (optional — used for validation) */
  expected_feed_mm_min?: number;
  /** Flushing pressure [bar] (optional) */
  flush_pressure_bar?: number;
  /** Capacitance circuit [nF] (optional — for fine finish) */
  capacitance_nF?: number;
  /** Source/notes */
  source?: string;
}

/** Import result with validation status */
export interface EPackImportResult {
  success: boolean;
  entries: EPackEntry[];
  warnings: string[];
  errors: string[];
  /** Machine model if detected from file header */
  machine_model?: string;
  /** Number of entries that passed validation */
  valid_count: number;
  /** Number of entries that failed validation */
  invalid_count: number;
}

/** Lookup result — what you get when querying imported data */
export interface EPackLookupResult {
  found: boolean;
  source: "imported" | "not_found";
  entry?: EPackEntry;
}

// ============================================================================
// PHYSICS BOUNDS FOR VALIDATION
// ============================================================================

/** Reasonable physics bounds for WEDM parameters */
const PHYSICS_BOUNDS = {
  t_on_us:         { min: 0.1,  max: 50,   unit: "µs" },
  t_off_us:        { min: 1,    max: 100,   unit: "µs" },
  peak_current_A:  { min: 0.5,  max: 60,    unit: "A" },
  open_voltage_V:  { min: 40,   max: 300,   unit: "V" },
  servo_voltage_V: { min: 20,   max: 100,   unit: "V" },
  wire_speed_m_min:{ min: 1,    max: 25,    unit: "m/min" },
  wire_tension_N:  { min: 0.5,  max: 25,    unit: "N" },
  feed_mm_min:     { min: 0.1,  max: 20,    unit: "mm/min" },
  flush_bar:       { min: 0.5,  max: 15,    unit: "bar" },
  capacitance_nF:  { min: 0,    max: 10000, unit: "nF" },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EPackTableImportEngine {
  /** Imported entries indexed by E-pack code */
  private _entries: Map<string, EPackEntry> = new Map();
  /** Machine model from last import */
  private _machineModel: string | undefined;

  /**
   * Import E-pack entries from a JSON string.
   *
   * Expected format:
   * ```json
   * {
   *   "machine_model": "Mitsubishi MV1200S",
   *   "entries": [
   *     { "e_pack_code": "E1221", "t_on_us": 4.0, "t_off_us": 16.0, "peak_current_A": 20, ... },
   *     ...
   *   ]
   * }
   * ```
   */
  importJSON(content: string): EPackImportResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let entries: EPackEntry[] = [];

    try {
      const data = JSON.parse(content);

      if (data.machine_model) {
        this._machineModel = data.machine_model;
      }

      const rawEntries = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(rawEntries)) {
        return { success: false, entries: [], warnings, errors: ["No 'entries' array found in JSON"], valid_count: 0, invalid_count: 0 };
      }

      for (const raw of rawEntries) {
        const result = this._validateAndNormalize(raw);
        if (result.valid) {
          entries.push(result.entry!);
        } else {
          errors.push(`${raw.e_pack_code || "unknown"}: ${result.error}`);
        }
      }
    } catch (e: any) {
      return { success: false, entries: [], warnings, errors: [`JSON parse error: ${e.message}`], valid_count: 0, invalid_count: 0 };
    }

    // Store validated entries
    for (const entry of entries) {
      this._entries.set(entry.e_pack_code, entry);
    }

    return {
      success: errors.length === 0,
      entries,
      warnings,
      errors,
      machine_model: this._machineModel,
      valid_count: entries.length,
      invalid_count: errors.length,
    };
  }

  /**
   * Import E-pack entries from CSV/TSV text.
   *
   * Expected columns (header row required):
   *   e_pack_code, t_on_us, t_off_us, peak_current_A, [optional columns...]
   *
   * Delimiter auto-detected (tab, comma, or semicolon).
   */
  importCSV(content: string): EPackImportResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const entries: EPackEntry[] = [];

    const lines = content.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
    if (lines.length < 2) {
      return { success: false, entries: [], warnings, errors: ["CSV needs header + at least 1 data row"], valid_count: 0, invalid_count: 0 };
    }

    // Auto-detect delimiter
    const headerLine = lines[0];
    const delimiter = headerLine.includes("\t") ? "\t" : headerLine.includes(";") ? ";" : ",";

    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      const raw: Record<string, any> = {};
      for (let j = 0; j < headers.length && j < values.length; j++) {
        const val = values[j];
        raw[headers[j]] = isNaN(Number(val)) ? val : Number(val);
      }

      const result = this._validateAndNormalize(raw);
      if (result.valid) {
        entries.push(result.entry!);
      } else {
        errors.push(`Row ${i + 1}: ${result.error}`);
      }
    }

    for (const entry of entries) {
      this._entries.set(entry.e_pack_code, entry);
    }

    return {
      success: errors.length === 0,
      entries,
      warnings,
      errors,
      machine_model: this._machineModel,
      valid_count: entries.length,
      invalid_count: errors.length,
    };
  }

  /**
   * Import from Mitsubishi-style key-value text blocks.
   *
   * Expected format:
   * ```
   * [E1221]
   * ON=4.0
   * OFF=16.0
   * IP=20
   * SV=48
   * WF=8
   * WT=12
   * ```
   */
  importKeyValue(content: string): EPackImportResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const entries: EPackEntry[] = [];

    // Parse ini-style blocks
    const blocks: Record<string, Record<string, string>> = {};
    let currentBlock = "";

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;

      const blockMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (blockMatch) {
        currentBlock = blockMatch[1];
        blocks[currentBlock] = {};
        continue;
      }

      if (currentBlock) {
        const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (kvMatch) {
          blocks[currentBlock][kvMatch[1].trim().toUpperCase()] = kvMatch[2].trim();
        }
      }
    }

    // Check for machine header
    if (blocks["MACHINE"]) {
      this._machineModel = blocks["MACHINE"]["MODEL"] || blocks["MACHINE"]["NAME"];
    }

    // Parse E-pack blocks
    const paramMap: Record<string, keyof EPackEntry> = {
      "ON": "t_on_us",
      "TON": "t_on_us",
      "T_ON": "t_on_us",
      "OFF": "t_off_us",
      "TOFF": "t_off_us",
      "T_OFF": "t_off_us",
      "IP": "peak_current_A",
      "IAP": "peak_current_A",
      "I_PEAK": "peak_current_A",
      "CURRENT": "peak_current_A",
      "SV": "servo_voltage_V",
      "VSR": "servo_voltage_V",
      "V": "open_voltage_V",
      "OV": "open_voltage_V",
      "WF": "wire_speed_m_min",
      "WS": "wire_speed_m_min",
      "WFD": "wire_speed_m_min",
      "WT": "wire_tension_N",
      "WTN": "wire_tension_N",
      "F": "expected_feed_mm_min",
      "FEED": "expected_feed_mm_min",
      "FL": "flush_pressure_bar",
      "INJ": "flush_pressure_bar",
      "CAP": "capacitance_nF",
    };

    for (const [blockName, params] of Object.entries(blocks)) {
      if (blockName === "MACHINE" || !blockName.match(/^E\d{4}$/)) continue;

      const raw: Record<string, any> = { e_pack_code: blockName };
      for (const [key, value] of Object.entries(params)) {
        const mappedKey = paramMap[key];
        if (mappedKey) {
          raw[mappedKey] = parseFloat(value);
        }
      }

      const result = this._validateAndNormalize(raw);
      if (result.valid) {
        entries.push(result.entry!);
      } else {
        errors.push(`[${blockName}]: ${result.error}`);
      }
    }

    for (const entry of entries) {
      this._entries.set(entry.e_pack_code, entry);
    }

    return {
      success: errors.length === 0,
      entries,
      warnings,
      errors,
      machine_model: this._machineModel,
      valid_count: entries.length,
      invalid_count: errors.length,
    };
  }

  /**
   * Look up imported E-pack data by code.
   * Returns the imported entry if available, otherwise indicates not found.
   */
  lookup(ePackCode: string): EPackLookupResult {
    const entry = this._entries.get(ePackCode);
    if (entry) {
      return { found: true, source: "imported", entry };
    }
    return { found: false, source: "not_found" };
  }

  /**
   * Get all imported entries.
   */
  getAll(): EPackEntry[] {
    return Array.from(this._entries.values());
  }

  /**
   * Get count of imported entries.
   */
  get count(): number {
    return this._entries.size;
  }

  /**
   * Get machine model from last import.
   */
  get machineModel(): string | undefined {
    return this._machineModel;
  }

  /**
   * Clear all imported data.
   */
  clear(): void {
    this._entries.clear();
    this._machineModel = undefined;
  }

  /**
   * Auto-detect format and import.
   */
  importAuto(content: string, filename?: string): EPackImportResult {
    const ext = filename?.split(".").pop()?.toLowerCase();

    if (ext === "json" || content.trim().startsWith("{") || content.trim().startsWith("[")) {
      return this.importJSON(content);
    }

    if (ext === "csv" || ext === "tsv") {
      return this.importCSV(content);
    }

    // Check for INI-style blocks
    if (content.includes("[E") && content.includes("=")) {
      return this.importKeyValue(content);
    }

    // Check for CSV-like header
    if (content.split(/\r?\n/)[0]?.match(/e_pack|t_on|peak_current/i)) {
      return this.importCSV(content);
    }

    // Default: try key-value, then CSV, then JSON
    const kvResult = this.importKeyValue(content);
    if (kvResult.valid_count > 0) return kvResult;

    const csvResult = this.importCSV(content);
    if (csvResult.valid_count > 0) return csvResult;

    return this.importJSON(content);
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  /**
   * Validate and normalize a raw entry object.
   * Checks E-pack code format, required fields, and physics bounds.
   */
  private _validateAndNormalize(raw: Record<string, any>): { valid: boolean; entry?: EPackEntry; error?: string } {
    // E-pack code required
    const code = raw.e_pack_code || raw.epack || raw.code || raw.e_code;
    if (!code || typeof code !== "string") {
      return { valid: false, error: "Missing e_pack_code" };
    }

    // Validate E-pack format
    const decoded = decodeEPackCode(code);
    if (!decoded) {
      return { valid: false, error: `Invalid E-pack format: ${code} (expected E####)` };
    }

    // Required fields
    const t_on = this._num(raw, "t_on_us", "t_on", "on", "ton");
    const t_off = this._num(raw, "t_off_us", "t_off", "off", "toff");
    const ip = this._num(raw, "peak_current_A", "peak_current", "ip", "iap", "current", "i_peak");

    if (t_on === undefined || t_off === undefined || ip === undefined) {
      return { valid: false, error: "Missing required fields: t_on_us, t_off_us, peak_current_A" };
    }

    // Physics bounds check
    if (t_on < PHYSICS_BOUNDS.t_on_us.min || t_on > PHYSICS_BOUNDS.t_on_us.max) {
      return { valid: false, error: `t_on_us=${t_on} outside bounds [${PHYSICS_BOUNDS.t_on_us.min}, ${PHYSICS_BOUNDS.t_on_us.max}]` };
    }
    if (t_off < PHYSICS_BOUNDS.t_off_us.min || t_off > PHYSICS_BOUNDS.t_off_us.max) {
      return { valid: false, error: `t_off_us=${t_off} outside bounds [${PHYSICS_BOUNDS.t_off_us.min}, ${PHYSICS_BOUNDS.t_off_us.max}]` };
    }
    if (ip < PHYSICS_BOUNDS.peak_current_A.min || ip > PHYSICS_BOUNDS.peak_current_A.max) {
      return { valid: false, error: `peak_current_A=${ip} outside bounds [${PHYSICS_BOUNDS.peak_current_A.min}, ${PHYSICS_BOUNDS.peak_current_A.max}]` };
    }

    const entry: EPackEntry = {
      e_pack_code: code,
      t_on_us: t_on,
      t_off_us: t_off,
      peak_current_A: ip,
      open_voltage_V: this._num(raw, "open_voltage_V", "open_voltage", "v", "ov"),
      servo_voltage_V: this._num(raw, "servo_voltage_V", "servo_voltage", "sv", "vsr"),
      wire_speed_m_min: this._num(raw, "wire_speed_m_min", "wire_speed", "wf", "ws", "wfd"),
      wire_tension_N: this._num(raw, "wire_tension_N", "wire_tension", "wt", "wtn"),
      expected_feed_mm_min: this._num(raw, "expected_feed_mm_min", "feed", "f"),
      flush_pressure_bar: this._num(raw, "flush_pressure_bar", "flush", "fl", "inj"),
      capacitance_nF: this._num(raw, "capacitance_nF", "capacitance", "cap"),
      source: raw.source || "imported",
    };

    return { valid: true, entry };
  }

  /** Extract a numeric value from raw data, trying multiple key names */
  private _num(raw: Record<string, any>, ...keys: string[]): number | undefined {
    for (const key of keys) {
      // Try exact key
      if (raw[key] !== undefined && raw[key] !== null && raw[key] !== "") {
        const n = Number(raw[key]);
        if (!isNaN(n)) return n;
      }
      // Try case-insensitive
      const lower = key.toLowerCase();
      for (const rk of Object.keys(raw)) {
        if (rk.toLowerCase() === lower && raw[rk] !== undefined && raw[rk] !== null && raw[rk] !== "") {
          const n = Number(raw[rk]);
          if (!isNaN(n)) return n;
        }
      }
    }
    return undefined;
  }
}

export const ePackTableImportEngine = new EPackTableImportEngine();
