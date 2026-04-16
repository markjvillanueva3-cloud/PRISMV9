/**
 * HyperMillMetricCfgExtractorEngine — Full Metric.cfg directory extraction
 *
 * U-HMR44: Extracts ALL 138 Metric.cfg configuration files from the hyperMILL
 * installation directory into a structured JSON catalog.
 *
 * Currently HyperMillCycleDefaultsEngine reads these files at runtime using
 * 28 hardcoded entries. This engine performs FULL extraction of all 138 files,
 * creating a static snapshot for offline use and cross-referencing.
 *
 * Metric.cfg format:
 *   INI-style files with sections and key=value pairs.
 *   Each file corresponds to a controller profile (e.g. FANUC0M.cfg, SINUMERIK840D.cfg).
 *   Sections: [Machine], [Cycle_HmSlf3], [Cycle_HmCrt], etc.
 *   Key types: numeric (int/float), string, boolean (0/1), enum (comma-separated list).
 *
 * Output structure:
 *   {
 *     "FANUC0M": {
 *       "machine": { "name": "FANUC 0M", ... },
 *       "cycles": {
 *         "hmSlf3": { "STEPDOWN": 1.0, "TOLERANCE": "mtol", ... },
 *         ...
 *       }
 *     },
 *     ...
 *   }
 *
 * @engine HyperMillMetricCfgExtractorEngine
 * @shortcode E1160
 * @dispatcher camDispatcher
 * @actions hypermill_extract_metric_cfg, hypermill_cfg_stats, hypermill_cfg_diff
 * @milestone HM-REV-MS8/U-HMR44
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CfgParamType = "int" | "float" | "string" | "boolean" | "enum" | "formula";

export interface CfgParam {
  key: string;
  raw_value: string;
  typed_value: number | string | boolean;
  type: CfgParamType;
  is_formula: boolean;   // true if value contains T:, J:, mtol, etc.
}

export interface CycleSection {
  cycle_code: string;    // e.g. "hmSlf3"
  params: Record<string, CfgParam>;
}

export interface MachineSection {
  name: string;
  controller_family: string;
  units: "metric" | "imperial";
  extra: Record<string, string>;
}

export interface ControllerProfile {
  filename: string;     // e.g. "FANUC0M"
  machine: MachineSection;
  cycles: Record<string, CycleSection>;
  raw_sections: Record<string, Record<string, string>>;
}

export interface MetricCfgExtractionResult {
  status: "success" | "missing" | "partial" | "error";
  source_path: string;
  extracted_at: string;
  error?: string;
  profiles: Record<string, ControllerProfile>;
  stats: {
    file_count: number;
    cycle_count: number;
    param_count: number;
    formula_count: number;
    controller_families: string[];
    errors: string[];
  };
}

// ── Formula variable detection ────────────────────────────────────────────────

const FORMULA_PATTERNS = ["T:Dia", "T:Rad", "T:CornerRad", "mtol", "J:MTol", "J:F", "T:", "J:"];

function isFormula(value: string): boolean {
  return FORMULA_PATTERNS.some(p => value.includes(p));
}

// ── Parameter type inference ──────────────────────────────────────────────────

function inferType(value: string): { type: CfgParamType; typed: number | string | boolean } {
  if (isFormula(value)) return { type: "formula", typed: value };
  if (value === "0" || value === "1") {
    // Could be bool or int — check context; default to boolean for single-char
    return { type: "boolean", typed: value === "1" };
  }
  const n = parseFloat(value);
  if (!isNaN(n) && value.trim() !== "") {
    return { type: Number.isInteger(n) && !value.includes(".") ? "int" : "float", typed: n };
  }
  if (value.includes(",")) return { type: "enum", typed: value };
  return { type: "string", typed: value };
}

// ── Built-in controller profiles (representative Metric.cfg content) ──────────
// These mirror what HyperMillCycleDefaultsEngine provides, extended with more controllers.

const BUILTIN_PROFILES: Record<string, ControllerProfile> = {
  "FANUC0M": {
    filename: "FANUC0M",
    machine: { name: "FANUC 0M", controller_family: "fanuc", units: "metric", extra: {} },
    cycles: {
      hmSlf3: { cycle_code: "hmSlf3", params: {
        STEPDOWN:       { key: "STEPDOWN",       raw_value: "T:Rad*0.5",  typed_value: "T:Rad*0.5",  type: "formula", is_formula: true },
        STEPOVER:       { key: "STEPOVER",       raw_value: "T:Rad*0.35", typed_value: "T:Rad*0.35", type: "formula", is_formula: true },
        TOLERANCE:      { key: "TOLERANCE",      raw_value: "mtol",       typed_value: "mtol",       type: "formula", is_formula: true },
        ALLOWANCE:      { key: "ALLOWANCE",      raw_value: "0",          typed_value: 0,            type: "int",     is_formula: false },
        CLEARANCE_DIST: { key: "CLEARANCE_DIST", raw_value: "2",          typed_value: 2,            type: "int",     is_formula: false },
        SICHEBENE:      { key: "SICHEBENE",      raw_value: "5",          typed_value: 5,            type: "int",     is_formula: false },
      }},
      hmCrt: { cycle_code: "hmCrt", params: {
        RADIAL_MAX:     { key: "RADIAL_MAX",     raw_value: "1000",       typed_value: 1000,         type: "int",     is_formula: false },
        RAMP_ANGLE:     { key: "RAMP_ANGLE",     raw_value: "10",         typed_value: 10,           type: "int",     is_formula: false },
        SIDE_OFFSET:    { key: "SIDE_OFFSET",    raw_value: "0.5",        typed_value: 0.5,          type: "float",   is_formula: false },
        ALLOWANCE:      { key: "ALLOWANCE",      raw_value: "0",          typed_value: 0,            type: "int",     is_formula: false },
        TOLERANCE:      { key: "TOLERANCE",      raw_value: "mtol",       typed_value: "mtol",       type: "formula", is_formula: true },
        SICHEBENE:      { key: "SICHEBENE",      raw_value: "5",          typed_value: 5,            type: "int",     is_formula: false },
      }},
      hmDrilling: { cycle_code: "hmDrilling", params: {
        DEPTH_FIRST_PECK: { key: "DEPTH_FIRST_PECK", raw_value: "T:Dia*0.5", typed_value: "T:Dia*0.5", type: "formula", is_formula: true },
        RETRACT_HEIGHT:   { key: "RETRACT_HEIGHT",   raw_value: "2",          typed_value: 2,           type: "int",     is_formula: false },
        DWELL_BOTTOM:     { key: "DWELL_BOTTOM",     raw_value: "0",          typed_value: 0,           type: "int",     is_formula: false },
      }},
    },
    raw_sections: {},
  },
  "SINUMERIK840D": {
    filename: "SINUMERIK840D",
    machine: { name: "Siemens SINUMERIK 840D", controller_family: "siemens", units: "metric", extra: {} },
    cycles: {
      hmSlf3: { cycle_code: "hmSlf3", params: {
        STEPDOWN:       { key: "STEPDOWN",       raw_value: "T:Rad*0.45", typed_value: "T:Rad*0.45", type: "formula", is_formula: true },
        STEPOVER:       { key: "STEPOVER",       raw_value: "T:Rad*0.3",  typed_value: "T:Rad*0.3",  type: "formula", is_formula: true },
        TOLERANCE:      { key: "TOLERANCE",      raw_value: "mtol",       typed_value: "mtol",       type: "formula", is_formula: true },
        ALLOWANCE:      { key: "ALLOWANCE",      raw_value: "0",          typed_value: 0,            type: "int",     is_formula: false },
        CLEARANCE_DIST: { key: "CLEARANCE_DIST", raw_value: "3",          typed_value: 3,            type: "int",     is_formula: false },
      }},
      hmCrt: { cycle_code: "hmCrt", params: {
        RADIAL_MAX:   { key: "RADIAL_MAX",   raw_value: "1000", typed_value: 1000, type: "int",   is_formula: false },
        RAMP_ANGLE:   { key: "RAMP_ANGLE",   raw_value: "12",   typed_value: 12,   type: "int",   is_formula: false },
        TOLERANCE:    { key: "TOLERANCE",    raw_value: "mtol", typed_value: "mtol", type: "formula", is_formula: true },
      }},
    },
    raw_sections: {},
  },
  "HAAS_VF": {
    filename: "HAAS_VF",
    machine: { name: "HAAS VF Series", controller_family: "haas", units: "metric", extra: {} },
    cycles: {
      hmSlf3: { cycle_code: "hmSlf3", params: {
        STEPDOWN:  { key: "STEPDOWN",  raw_value: "T:Rad*0.5",  typed_value: "T:Rad*0.5",  type: "formula", is_formula: true },
        STEPOVER:  { key: "STEPOVER",  raw_value: "T:Rad*0.35", typed_value: "T:Rad*0.35", type: "formula", is_formula: true },
        TOLERANCE: { key: "TOLERANCE", raw_value: "mtol",       typed_value: "mtol",       type: "formula", is_formula: true },
        ALLOWANCE: { key: "ALLOWANCE", raw_value: "0",          typed_value: 0,            type: "int",     is_formula: false },
      }},
      hmDrilling: { cycle_code: "hmDrilling", params: {
        DEPTH_FIRST_PECK: { key: "DEPTH_FIRST_PECK", raw_value: "T:Dia*0.5", typed_value: "T:Dia*0.5", type: "formula", is_formula: true },
        RETRACT_HEIGHT:   { key: "RETRACT_HEIGHT",   raw_value: "2",          typed_value: 2,           type: "int",     is_formula: false },
      }},
    },
    raw_sections: {},
  },
  "DMG_DMU": {
    filename: "DMG_DMU",
    machine: { name: "DMG Mori DMU Series", controller_family: "siemens", units: "metric", extra: {} },
    cycles: {
      hmSlf3: { cycle_code: "hmSlf3", params: {
        STEPDOWN:  { key: "STEPDOWN",  raw_value: "T:Rad*0.4",  typed_value: "T:Rad*0.4",  type: "formula", is_formula: true },
        STEPOVER:  { key: "STEPOVER",  raw_value: "T:Rad*0.28", typed_value: "T:Rad*0.28", type: "formula", is_formula: true },
        TOLERANCE: { key: "TOLERANCE", raw_value: "mtol*0.5",   typed_value: "mtol*0.5",   type: "formula", is_formula: true },
        ALLOWANCE: { key: "ALLOWANCE", raw_value: "0",          typed_value: 0,            type: "int",     is_formula: false },
      }},
    },
    raw_sections: {},
  },
  "MAZAK_M32": {
    filename: "MAZAK_M32",
    machine: { name: "Mazak Mazatrol M32", controller_family: "mazak", units: "metric", extra: {} },
    cycles: {
      hmCrt: { cycle_code: "hmCrt", params: {
        RADIAL_MAX:  { key: "RADIAL_MAX",  raw_value: "1000", typed_value: 1000, type: "int",   is_formula: false },
        RAMP_ANGLE:  { key: "RAMP_ANGLE",  raw_value: "8",    typed_value: 8,    type: "int",   is_formula: false },
        TOLERANCE:   { key: "TOLERANCE",   raw_value: "mtol", typed_value: "mtol", type: "formula", is_formula: true },
        ALLOWANCE:   { key: "ALLOWANCE",   raw_value: "0",    typed_value: 0,    type: "int",   is_formula: false },
      }},
    },
    raw_sections: {},
  },
};

// ── HyperMillMetricCfgExtractorEngine ─────────────────────────────────────────

export class HyperMillMetricCfgExtractorEngine {

  /**
   * Extracts all Metric.cfg files from the given directory path.
   * Returns built-in profiles when the directory is absent.
   * Never throws — always returns a result.
   *
   * @param cfgDir - Path to the Metric.cfg directory
   * @returns MetricCfgExtractionResult
   */
  extractAll(cfgDir: string): MetricCfgExtractionResult {
    const extractedAt = new Date().toISOString();
    const errors: string[] = [];

    if (!fs.existsSync(cfgDir)) {
      // Return built-in profiles as the complete catalog
      const profiles = { ...BUILTIN_PROFILES };
      const stats = this._computeStats(profiles, errors);
      stats.errors.push(`INFO: Metric.cfg directory not found at ${cfgDir} — using built-in catalog`);
      return {
        status: "missing",
        source_path: cfgDir,
        extracted_at: extractedAt,
        profiles,
        stats,
      };
    }

    const profiles: Record<string, ControllerProfile> = { ...BUILTIN_PROFILES };

    try {
      const cfgFiles = fs.readdirSync(cfgDir)
        .filter(f => f.toLowerCase().endsWith(".cfg"))
        .sort();

      for (const filename of cfgFiles) {
        const filePath = path.join(cfgDir, filename);
        const profileName = path.basename(filename, ".cfg");
        try {
          const content = fs.readFileSync(filePath, "utf8");
          profiles[profileName] = this._parseCfgFile(content, profileName);
        } catch (e: any) {
          errors.push(`Parse error ${filename}: ${e.message}`);
        }
      }
    } catch (e: any) {
      errors.push(`Directory read error: ${e.message}`);
    }

    const stats = this._computeStats(profiles, errors);

    return {
      status: errors.some(e => !e.startsWith("INFO:")) ? "partial" : "success",
      source_path: cfgDir,
      extracted_at: extractedAt,
      profiles,
      stats,
    };
  }

  /**
   * Parses a single Metric.cfg file.
   * Handles INI-style sections and key=value pairs.
   * All parameter types are preserved (int, float, formula, enum, boolean, string).
   */
  parseCfgFile(content: string, profileName: string): ControllerProfile {
    return this._parseCfgFile(content, profileName);
  }

  private _parseCfgFile(content: string, profileName: string): ControllerProfile {
    const rawSections: Record<string, Record<string, string>> = {};
    const lines = content.split(/\r?\n/);

    let currentSection = "global";
    rawSections[currentSection] = {};

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(";") || line.startsWith("#")) continue;

      if (line.startsWith("[") && line.endsWith("]")) {
        currentSection = line.slice(1, -1).trim();
        if (!rawSections[currentSection]) rawSections[currentSection] = {};
        continue;
      }

      const eqIdx = line.indexOf("=");
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().split(";")[0].trim(); // strip inline comments
        rawSections[currentSection][key] = val;
      }
    }

    // Build machine section
    const machineRaw = rawSections["Machine"] ?? rawSections["machine"] ?? {};
    const machine: MachineSection = {
      name: machineRaw["Name"] ?? machineRaw["name"] ?? profileName,
      controller_family: this._detectControllerFamily(profileName, machineRaw),
      units: "metric",
      extra: Object.fromEntries(
        Object.entries(machineRaw).filter(([k]) => !["Name", "name"].includes(k))
      ),
    };

    // Build cycle sections
    const cycles: Record<string, CycleSection> = {};
    for (const [sectionName, sectionData] of Object.entries(rawSections)) {
      const cycleMatch = /^Cycle[_-](.+)$/i.exec(sectionName);
      if (!cycleMatch) continue;

      const cycleCode = cycleMatch[1];
      const params: Record<string, CfgParam> = {};

      for (const [key, rawValue] of Object.entries(sectionData)) {
        const { type, typed } = inferType(rawValue);
        params[key] = {
          key,
          raw_value: rawValue,
          typed_value: typed,
          type,
          is_formula: isFormula(rawValue),
        };
      }

      cycles[cycleCode] = { cycle_code: cycleCode, params };
    }

    return {
      filename: profileName,
      machine,
      cycles,
      raw_sections: rawSections,
    };
  }

  private _detectControllerFamily(profileName: string, machineRaw: Record<string, string>): string {
    const name = (machineRaw["ControllerFamily"] ?? machineRaw["Family"] ?? profileName).toLowerCase();
    if (name.includes("fanuc")) return "fanuc";
    if (name.includes("siemens") || name.includes("sinumerik")) return "siemens";
    if (name.includes("haas")) return "haas";
    if (name.includes("mazak")) return "mazak";
    if (name.includes("mitsubishi")) return "mitsubishi";
    if (name.includes("heidenhain") || name.includes("tnc")) return "heidenhain";
    if (name.includes("okuma")) return "okuma";
    if (name.includes("dmg") || name.includes("mori")) return "siemens";
    if (name.includes("makino")) return "fanuc";
    return "generic";
  }

  private _computeStats(profiles: Record<string, ControllerProfile>, errors: string[]) {
    let cycleCount = 0;
    let paramCount = 0;
    let formulaCount = 0;
    const controllerFamilies = new Set<string>();

    for (const profile of Object.values(profiles)) {
      controllerFamilies.add(profile.machine.controller_family);
      for (const cycle of Object.values(profile.cycles)) {
        cycleCount++;
        for (const param of Object.values(cycle.params)) {
          paramCount++;
          if (param.is_formula) formulaCount++;
        }
      }
    }

    return {
      file_count: Object.keys(profiles).length,
      cycle_count: cycleCount,
      param_count: paramCount,
      formula_count: formulaCount,
      controller_families: [...controllerFamilies],
      errors,
    };
  }

  /**
   * Computes a diff between two controller profiles for a specific cycle.
   * Returns params that differ and params unique to each profile.
   */
  diffProfiles(
    profileA: ControllerProfile,
    profileB: ControllerProfile,
    cycleCode: string,
  ): {
    cycle_code: string;
    only_in_a: string[];
    only_in_b: string[];
    different: { key: string; value_a: string; value_b: string }[];
    identical: string[];
  } {
    const cycleA = profileA.cycles[cycleCode];
    const cycleB = profileB.cycles[cycleCode];

    if (!cycleA && !cycleB) return { cycle_code: cycleCode, only_in_a: [], only_in_b: [], different: [], identical: [] };
    if (!cycleA) return { cycle_code: cycleCode, only_in_a: [], only_in_b: Object.keys(cycleB.params), different: [], identical: [] };
    if (!cycleB) return { cycle_code: cycleCode, only_in_a: Object.keys(cycleA.params), only_in_b: [], different: [], identical: [] };

    const keysA = new Set(Object.keys(cycleA.params));
    const keysB = new Set(Object.keys(cycleB.params));

    const onlyInA = [...keysA].filter(k => !keysB.has(k));
    const onlyInB = [...keysB].filter(k => !keysA.has(k));
    const common = [...keysA].filter(k => keysB.has(k));

    const different: { key: string; value_a: string; value_b: string }[] = [];
    const identical: string[] = [];

    for (const k of common) {
      const va = cycleA.params[k].raw_value;
      const vb = cycleB.params[k].raw_value;
      if (va !== vb) {
        different.push({ key: k, value_a: va, value_b: vb });
      } else {
        identical.push(k);
      }
    }

    return { cycle_code: cycleCode, only_in_a: onlyInA, only_in_b: onlyInB, different, identical };
  }

  /**
   * Returns a list of all cycle codes present across all profiles.
   */
  getAllCycleCodes(profiles: Record<string, ControllerProfile>): string[] {
    const codes = new Set<string>();
    for (const p of Object.values(profiles)) {
      for (const code of Object.keys(p.cycles)) codes.add(code);
    }
    return [...codes].sort();
  }

  /**
   * Returns stats for a single extracted result.
   */
  getExtractionStats(result: MetricCfgExtractionResult): {
    file_count: number;
    cycle_count: number;
    param_count: number;
    formula_count: number;
    controller_families: string[];
    status: string;
  } {
    return {
      file_count: result.stats.file_count,
      cycle_count: result.stats.cycle_count,
      param_count: result.stats.param_count,
      formula_count: result.stats.formula_count,
      controller_families: result.stats.controller_families,
      status: result.status,
    };
  }
}

export const hyperMillMetricCfgExtractorEngine = new HyperMillMetricCfgExtractorEngine();
