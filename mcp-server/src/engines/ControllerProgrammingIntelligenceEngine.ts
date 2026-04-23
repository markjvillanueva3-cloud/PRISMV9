/**
 * ControllerProgrammingIntelligenceEngine — HBK-MS6
 *
 * Extracts and structures custom G/M codes, macro variable maps, option packages,
 * parameter tables, and controller dialect specifics from handbook controller sections.
 * Enriches PostProcessorPipeline with machine-specific controller knowledge.
 *
 * Consumes: MachineHandbookRegistry (controller_features, programming_tips)
 * Enriches: ControllerDialectEngine (dialect patches), PostProcessorPipeline (machine-specific codes)
 * Pattern: lazy-load handbook registry to avoid circular deps (same as MachineCapabilityIntelligenceEngine)
 *
 * Actions: controller_programming_profile, controller_custom_codes,
 *          controller_macro_variables, controller_validate_dialect,
 *          controller_enrichment_patch
 *
 * @module ControllerProgrammingIntelligenceEngine
 * @version 1.0.0 — HBK-MS6
 */

import type {
  HandbookControllerFeatures,
  HandbookProgrammingTip,
  MachineHandbook,
} from "./MachineHandbookRegistryEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

/** Handbook registry interface for dependency injection (avoids circular imports). */
export interface HandbookRegistryLike {
  getByMachineId(machineId: string): MachineHandbook | undefined;
  list(): MachineHandbook[];
}

/** Enhanced custom G/M code entry with option package and category. */
export interface CustomCodeEntry {
  code: string;
  type: "G" | "M" | "T" | "other";
  description: string;
  syntax?: string;
  parameters?: string[];
  example?: string;
  modal: boolean;
  option_package?: string;
  category: string;
  confidence: number;
  source: string;
}

/** Macro variable entry from controller handbook. */
export interface MacroVariableEntry {
  variable_number: number | string;
  name: string;
  description: string;
  range_min?: number;
  range_max?: number;
  default_value?: number | string;
  unit?: string;
  read_only: boolean;
  category: "system" | "user" | "common" | "tool_offset" | "work_offset" | "parameter";
  controller_specific: boolean;
}

/** Parameter table entry from controller handbook. */
export interface ParameterEntry {
  parameter_id: string;
  name: string;
  description: string;
  value?: number | string;
  range_min?: number;
  range_max?: number;
  unit?: string;
  requires_power_off: boolean;
  category: string;
}

/** Option package that enables certain codes/features. */
export interface OptionPackage {
  name: string;
  code: string;
  description: string;
  enabled_g_codes: string[];
  enabled_m_codes: string[];
  enabled_features: string[];
}

/** Dialect validation finding — discrepancy between handbook and existing dialect. */
export interface DialectValidationFinding {
  severity: "info" | "warning" | "error";
  type: "missing_code" | "syntax_mismatch" | "feature_gap" | "option_gated" | "deprecated";
  code?: string;
  message: string;
  handbook_value?: string;
  dialect_value?: string;
  recommendation: string;
}

/** Full controller programming profile for a machine. */
export interface ControllerProgrammingProfile {
  machine_id: string;
  manufacturer: string;
  model: string;
  controller_manufacturer: string;
  controller_model: string;
  firmware_version?: string;
  custom_codes: CustomCodeEntry[];
  macro_variables: MacroVariableEntry[];
  parameters: ParameterEntry[];
  option_packages: OptionPackage[];
  programming_tips: string[];
  probing_cycles: Array<{ cycle_code: string; description: string; parameters?: string[] }>;
  capabilities: {
    macro_type?: string;
    max_nesting_depth?: number;
    supports_goto?: boolean;
    conversational_mode: boolean;
    high_speed_machining: boolean;
    look_ahead_blocks?: number;
    max_program_size_kb?: number;
    max_tool_offsets?: number;
    max_work_offsets?: number;
  };
  validation_findings: DialectValidationFinding[];
  confidence: number;
  source: string;
}

/** PostProcessor enrichment patch — machine-specific overrides for dialect engine. */
export interface PostProcessorEnrichmentPatch {
  machine_id: string;
  controller_family: string;
  custom_g_code_overrides: Record<string, string>;
  custom_m_code_overrides: Record<string, string>;
  feature_flags: Record<string, boolean>;
  look_ahead_blocks?: number;
  max_work_offsets?: number;
  macro_variable_ranges?: { system_min: number; system_max: number; user_min: number; user_max: number };
}

// ─── Standard G/M code references ────────────────────────────────────

/** Standard ISO 6983 G-codes that should not be flagged as custom. */
const STANDARD_G_CODES = new Set([
  "G00", "G01", "G02", "G03", "G04", "G09", "G10", "G17", "G18", "G19",
  "G20", "G21", "G28", "G30", "G40", "G41", "G42", "G43", "G49",
  "G50", "G53", "G54", "G55", "G56", "G57", "G58", "G59",
  "G61", "G64", "G73", "G74", "G76", "G80", "G81", "G82", "G83",
  "G84", "G85", "G86", "G87", "G90", "G91", "G94", "G95", "G96", "G97",
  "G98", "G99",
  "G0", "G1", "G2", "G3", "G4",
]);

const STANDARD_M_CODES = new Set([
  "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09",
  "M19", "M30", "M98", "M99",
  "M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9",
]);

/** Well-known Fanuc system variable ranges (Macro B). Ref: Fanuc 31i-B Parameter Manual. */
const FANUC_MACRO_RANGES: MacroVariableEntry[] = [
  { variable_number: "#1-#33", name: "Local variables", description: "Local variables for macro calls (arguments A-Z)", range_min: 1, range_max: 33, read_only: false, category: "user", controller_specific: false },
  { variable_number: "#100-#199", name: "Common variables (volatile)", description: "Shared between main program and macros, cleared on power-off", range_min: 100, range_max: 199, read_only: false, category: "common", controller_specific: false },
  { variable_number: "#500-#999", name: "Common variables (non-volatile)", description: "Retained across power cycles", range_min: 500, range_max: 999, read_only: false, category: "common", controller_specific: false },
  { variable_number: "#1000-#1015", name: "Interface inputs", description: "Bit-coded interface signal inputs", range_min: 1000, range_max: 1015, read_only: true, category: "system", controller_specific: true },
  { variable_number: "#1100-#1115", name: "Interface outputs", description: "Bit-coded interface signal outputs", range_min: 1100, range_max: 1115, read_only: false, category: "system", controller_specific: true },
  { variable_number: "#2001-#2400", name: "Tool offsets (length)", description: "Tool length compensation values", range_min: 2001, range_max: 2400, read_only: false, category: "tool_offset", controller_specific: false },
  { variable_number: "#3000", name: "Programmable alarm", description: "#3000=N (alarm) — generates alarm with message", read_only: false, category: "system", controller_specific: false },
  { variable_number: "#3006", name: "Operator message", description: "#3006=N (message) — stops and displays message", read_only: false, category: "system", controller_specific: false },
  { variable_number: "#4001-#4120", name: "Modal G-codes", description: "Currently active modal G-code per group", range_min: 4001, range_max: 4120, read_only: true, category: "system", controller_specific: false },
  { variable_number: "#5001-#5006", name: "Current position (machine)", description: "X/Y/Z/A/B/C machine coordinate position", range_min: 5001, range_max: 5006, read_only: true, category: "system", controller_specific: false },
  { variable_number: "#5021-#5026", name: "Current position (work)", description: "X/Y/Z/A/B/C work coordinate position", range_min: 5021, range_max: 5026, read_only: true, category: "system", controller_specific: false },
  { variable_number: "#5201-#5326", name: "Work offsets (G54-G59)", description: "Work coordinate offset values", range_min: 5201, range_max: 5326, read_only: false, category: "work_offset", controller_specific: false },
];

/** Well-known Siemens system variable patterns. Ref: Sinumerik 840D sl Programming Manual. */
const SIEMENS_VARIABLE_PATTERNS: MacroVariableEntry[] = [
  { variable_number: "$P_UIFR", name: "Active work offset frame", description: "Currently active user frame (work offset)", read_only: true, category: "system", controller_specific: true },
  { variable_number: "$AA_IW", name: "Current position (work)", description: "Current axis position in work coordinate system", read_only: true, category: "system", controller_specific: true },
  { variable_number: "$AA_IM", name: "Current position (machine)", description: "Current axis position in machine coordinate system", read_only: true, category: "system", controller_specific: true },
  { variable_number: "$TC_DP1-$TC_DP25", name: "Tool compensation data", description: "Tool offset data parameters", read_only: false, category: "tool_offset", controller_specific: true },
  { variable_number: "R0-R299", name: "R-parameters", description: "General-purpose calculation variables (300 total)", range_min: 0, range_max: 299, read_only: false, category: "common", controller_specific: false },
  { variable_number: "$MN_USER_DATA_INT", name: "User integer data", description: "Non-volatile user integer storage", read_only: false, category: "user", controller_specific: true },
  { variable_number: "$MN_USER_DATA_FLOAT", name: "User float data", description: "Non-volatile user floating-point storage", read_only: false, category: "user", controller_specific: true },
];

// ─── Classification helpers ──────────────────────────────────────────

function classifyCodeType(code: string): "G" | "M" | "T" | "other" {
  const upper = code.toUpperCase().replace(/\s/g, "");
  if (/^G\d/.test(upper)) return "G";
  if (/^M\d/.test(upper)) return "M";
  if (/^T\d/.test(upper)) return "T";
  return "other";
}

function isStandardCode(code: string): boolean {
  const norm = code.toUpperCase().replace(/\s/g, "");
  return STANDARD_G_CODES.has(norm) || STANDARD_M_CODES.has(norm);
}

function categorizeCode(description: string): string {
  const lower = description.toLowerCase();
  if (/coolant|flood|mist|mql|through.?spindle/i.test(lower)) return "coolant";
  if (/spindle|rpm|css|orient/i.test(lower)) return "spindle";
  if (/tool.*change|atc|magazine|turret/i.test(lower)) return "tool_change";
  if (/probe|touch|measure|inspect/i.test(lower)) return "probing";
  if (/clamp|chuck|tail|bar.?feed|steady/i.test(lower)) return "workholding";
  if (/high.?speed|hsm|smooth|aicc|nano/i.test(lower)) return "high_speed";
  if (/safe|home|ref|zero.?return|origin/i.test(lower)) return "reference";
  if (/sub|call|macro|loop|repeat/i.test(lower)) return "programming";
  if (/rigid|tap|thread|helical/i.test(lower)) return "threading";
  if (/index|rotate|pallet/i.test(lower)) return "indexing";
  if (/chip|conv|door|light|alarm/i.test(lower)) return "auxiliary";
  return "general";
}

function detectControllerFamily(manufacturer: string, model: string): string {
  const combined = `${manufacturer} ${model}`.toLowerCase();
  if (/fanuc|0i|16i|18i|30i|31i/i.test(combined)) return "fanuc";
  if (/siemens|sinumerik|828|840/i.test(combined)) return "siemens";
  if (/heidenhain|tnc|itnc/i.test(combined)) return "heidenhain";
  if (/mazak|smooth|mazatrol/i.test(combined)) return "mazak";
  if (/okuma|osp/i.test(combined)) return "okuma";
  if (/brother|speedio/i.test(combined)) return "brother";
  if (/mitsubishi|m[78]0/i.test(combined)) return "mitsubishi";
  if (/haas|ngc/i.test(combined)) return "haas";
  if (/fagor|8065/i.test(combined)) return "fagor";
  return "generic";
}

// ─── Engine ──────────────────────────────────────────────────────────

export class ControllerProgrammingIntelligenceEngine {

  /**
   * Get complete controller programming profile for a machine.
   *
   * Reads handbook controller_features + programming_tips, enriches with
   * known macro variable maps per controller family, classifies custom codes,
   * and optionally validates against ControllerDialectEngine.
   *
   * @param input - { machine_id, validate_dialect?: boolean }
   * @param handbookRegistry - injected registry (avoids circular deps)
   * @returns ControllerProgrammingProfile or null if no handbook data
   */
  getProfile(
    input: { machine_id: string; validate_dialect?: boolean },
    handbookRegistry: HandbookRegistryLike,
  ): ControllerProgrammingProfile | null {
    const handbook = handbookRegistry.getByMachineId(input.machine_id);
    if (!handbook?.controller_features) return null;

    const cf = handbook.controller_features;
    const family = detectControllerFamily(cf.controller_manufacturer, cf.controller_model);

    const customCodes = this._extractCustomCodes(cf, family);
    const macroVars = this._extractMacroVariables(cf, family);
    const parameters = this._extractParameters(cf);
    const optionPackages = this._inferOptionPackages(customCodes, cf);
    const tips = (handbook.programming_tips ?? []).map((t: HandbookProgrammingTip) => t.description ?? "");

    let findings: DialectValidationFinding[] = [];
    if (input.validate_dialect !== false) {
      findings = this._validateAgainstDialect(customCodes, cf, family);
    }

    const fieldCount = customCodes.length + macroVars.length + parameters.length;
    const avgConfidence = fieldCount > 0
      ? customCodes.reduce((s, c) => s + c.confidence, 0) / Math.max(customCodes.length, 1)
      : 0.5;

    return {
      machine_id: input.machine_id,
      manufacturer: handbook.manufacturer,
      model: handbook.model,
      controller_manufacturer: cf.controller_manufacturer,
      controller_model: cf.controller_model,
      firmware_version: cf.firmware_version,
      custom_codes: customCodes,
      macro_variables: macroVars,
      parameters,
      option_packages: optionPackages,
      programming_tips: tips.filter(Boolean),
      probing_cycles: cf.probing_cycles ?? [],
      capabilities: {
        macro_type: cf.macro_support?.type,
        max_nesting_depth: cf.macro_support?.max_nesting_depth,
        supports_goto: cf.macro_support?.supports_goto,
        conversational_mode: cf.conversational_mode ?? false,
        high_speed_machining: cf.high_speed_machining ?? false,
        look_ahead_blocks: cf.look_ahead_blocks,
        max_program_size_kb: cf.max_program_size_kb,
        max_tool_offsets: cf.max_tool_offsets,
        max_work_offsets: cf.max_work_offsets,
      },
      validation_findings: findings,
      confidence: Math.round(avgConfidence * 100) / 100,
      source: "handbook_controller_intelligence",
    };
  }

  /**
   * Get just the custom G/M codes for a machine (lighter than full profile).
   */
  getCustomCodes(
    machineId: string,
    handbookRegistry: HandbookRegistryLike,
  ): CustomCodeEntry[] {
    const handbook = handbookRegistry.getByMachineId(machineId);
    if (!handbook?.controller_features) return [];
    const family = detectControllerFamily(
      handbook.controller_features.controller_manufacturer,
      handbook.controller_features.controller_model,
    );
    return this._extractCustomCodes(handbook.controller_features, family);
  }

  /**
   * Get macro variable map for a machine.
   */
  getMacroVariables(
    machineId: string,
    handbookRegistry: HandbookRegistryLike,
  ): MacroVariableEntry[] {
    const handbook = handbookRegistry.getByMachineId(machineId);
    if (!handbook?.controller_features) return [];
    const family = detectControllerFamily(
      handbook.controller_features.controller_manufacturer,
      handbook.controller_features.controller_model,
    );
    return this._extractMacroVariables(handbook.controller_features, family);
  }

  /**
   * Validate extracted controller data against ControllerDialectEngine definitions.
   * Returns findings: missing codes, syntax mismatches, option-gated features, deprecated codes.
   */
  validateAgainstDialect(
    machineId: string,
    handbookRegistry: HandbookRegistryLike,
  ): DialectValidationFinding[] {
    const handbook = handbookRegistry.getByMachineId(machineId);
    if (!handbook?.controller_features) return [];
    const cf = handbook.controller_features;
    const family = detectControllerFamily(cf.controller_manufacturer, cf.controller_model);
    const codes = this._extractCustomCodes(cf, family);
    return this._validateAgainstDialect(codes, cf, family);
  }

  /**
   * Generate PostProcessor enrichment patch — machine-specific overrides
   * that can be applied to ControllerDialectEngine's base dialect.
   */
  getEnrichmentPatch(
    machineId: string,
    handbookRegistry: HandbookRegistryLike,
  ): PostProcessorEnrichmentPatch | null {
    const handbook = handbookRegistry.getByMachineId(machineId);
    if (!handbook?.controller_features) return null;
    const cf = handbook.controller_features;
    const family = detectControllerFamily(cf.controller_manufacturer, cf.controller_model);
    const codes = this._extractCustomCodes(cf, family);

    const gOverrides: Record<string, string> = {};
    const mOverrides: Record<string, string> = {};
    for (const c of codes) {
      if (c.type === "G") gOverrides[c.code] = c.description;
      else if (c.type === "M") mOverrides[c.code] = c.description;
    }

    return {
      machine_id: machineId,
      controller_family: family,
      custom_g_code_overrides: gOverrides,
      custom_m_code_overrides: mOverrides,
      feature_flags: {
        conversational_mode: cf.conversational_mode ?? false,
        high_speed_machining: cf.high_speed_machining ?? false,
        macro_b_support: cf.macro_support?.type === "Macro B" || cf.macro_support?.type === "Custom Macro B",
        has_probing: (cf.probing_cycles?.length ?? 0) > 0,
      },
      look_ahead_blocks: cf.look_ahead_blocks,
      max_work_offsets: cf.max_work_offsets,
      macro_variable_ranges: family === "fanuc" ? {
        system_min: 1000, system_max: 5999,
        user_min: 100, user_max: 999,
      } : family === "siemens" ? {
        system_min: 0, system_max: 0,   // Siemens uses named variables, not numeric ranges
        user_min: 0, user_max: 299,     // R-parameters
      } : undefined,
    };
  }

  // ─── Internal extraction methods ────────────────────────────────────

  /** Extract and classify custom G/M codes from handbook controller features. */
  private _extractCustomCodes(cf: HandbookControllerFeatures, family: string): CustomCodeEntry[] {
    const codes: CustomCodeEntry[] = [];

    for (const gc of cf.custom_g_codes ?? []) {
      const isCustom = !isStandardCode(gc.code);
      codes.push({
        code: gc.code.toUpperCase(),
        type: classifyCodeType(gc.code),
        description: gc.description,
        syntax: gc.syntax,
        parameters: gc.syntax ? this._parseSyntaxParams(gc.syntax) : undefined,
        example: gc.example,
        modal: false,
        option_package: this._inferOptionForCode(gc.code, gc.description, family),
        category: categorizeCode(gc.description),
        confidence: isCustom ? 0.9 : 0.7,
        source: `handbook_${family}`,
      });
    }

    for (const mc of cf.custom_m_codes ?? []) {
      const isCustom = !isStandardCode(mc.code);
      codes.push({
        code: mc.code.toUpperCase(),
        type: classifyCodeType(mc.code),
        description: mc.description,
        syntax: undefined,
        modal: mc.modal ?? false,
        option_package: this._inferOptionForCode(mc.code, mc.description, family),
        category: categorizeCode(mc.description),
        confidence: isCustom ? 0.9 : 0.7,
        source: `handbook_${family}`,
      });
    }

    return codes;
  }

  /** Build macro variable map — handbook data + controller family defaults. */
  private _extractMacroVariables(cf: HandbookControllerFeatures, family: string): MacroVariableEntry[] {
    const vars: MacroVariableEntry[] = [];

    // Start with family-standard ranges
    if (family === "fanuc" || family === "haas" || family === "brother" || family === "mitsubishi") {
      vars.push(...FANUC_MACRO_RANGES);
    } else if (family === "siemens") {
      vars.push(...SIEMENS_VARIABLE_PATTERNS);
    }

    // Enrich with handbook-specific variable range if provided
    if (cf.macro_support?.variable_range) {
      const rangeStr = cf.macro_support.variable_range;
      const match = rangeStr.match(/#?(\d+)\s*[-–]\s*#?(\d+)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        const existing = vars.find(v =>
          typeof v.range_min === "number" && v.range_min === min,
        );
        if (!existing) {
          vars.push({
            variable_number: `#${min}-#${max}`,
            name: "Handbook-specified variable range",
            description: `Custom variable range from handbook: ${rangeStr}`,
            range_min: min, range_max: max,
            read_only: false,
            category: "user",
            controller_specific: true,
          });
        }
      }
    }

    return vars;
  }

  /** Extract parameter entries from controller features. */
  private _extractParameters(cf: HandbookControllerFeatures): ParameterEntry[] {
    const params: ParameterEntry[] = [];

    // Common controller parameters from available handbook fields
    if (cf.max_program_size_kb != null) {
      params.push({
        parameter_id: "PROGRAM_MEMORY",
        name: "Maximum program size",
        description: "Maximum program storage capacity",
        value: cf.max_program_size_kb,
        unit: "KB",
        requires_power_off: false,
        category: "memory",
      });
    }
    if (cf.max_tool_offsets != null) {
      params.push({
        parameter_id: "MAX_TOOL_OFFSETS",
        name: "Maximum tool offset pairs",
        description: "Number of tool length/radius offset pairs available",
        value: cf.max_tool_offsets,
        requires_power_off: false,
        category: "tooling",
      });
    }
    if (cf.max_work_offsets != null) {
      params.push({
        parameter_id: "MAX_WORK_OFFSETS",
        name: "Maximum work coordinate offsets",
        description: "Number of work coordinate systems (G54-G59 extended)",
        value: cf.max_work_offsets,
        requires_power_off: false,
        category: "coordinates",
      });
    }
    if (cf.look_ahead_blocks != null) {
      params.push({
        parameter_id: "LOOK_AHEAD",
        name: "Look-ahead buffer size",
        description: "Number of blocks the controller reads ahead for path smoothing",
        value: cf.look_ahead_blocks,
        requires_power_off: false,
        category: "motion",
      });
    }
    if (cf.macro_support?.max_nesting_depth != null) {
      params.push({
        parameter_id: "MACRO_NESTING",
        name: "Maximum macro nesting depth",
        description: "Maximum depth of nested macro calls (G65/G66)",
        value: cf.macro_support.max_nesting_depth,
        requires_power_off: false,
        category: "programming",
      });
    }

    return params;
  }

  /** Infer option packages from custom codes and their descriptions. */
  private _inferOptionPackages(codes: CustomCodeEntry[], cf: HandbookControllerFeatures): OptionPackage[] {
    const packages: OptionPackage[] = [];
    const packageMap = new Map<string, OptionPackage>();

    for (const c of codes) {
      if (c.option_package) {
        if (!packageMap.has(c.option_package)) {
          packageMap.set(c.option_package, {
            name: c.option_package,
            code: c.option_package,
            description: `Option package enabling ${c.option_package} features`,
            enabled_g_codes: [],
            enabled_m_codes: [],
            enabled_features: [],
          });
        }
        const pkg = packageMap.get(c.option_package)!;
        if (c.type === "G") pkg.enabled_g_codes.push(c.code);
        else if (c.type === "M") pkg.enabled_m_codes.push(c.code);
      }
    }

    // Infer standard option packages from capabilities
    if (cf.macro_support?.type) {
      const macroKey = "Custom Macro B";
      if (!packageMap.has(macroKey)) {
        packageMap.set(macroKey, {
          name: macroKey,
          code: "MACRO_B",
          description: "Fanuc Custom Macro B programming capability",
          enabled_g_codes: ["G65", "G66", "G67"],
          enabled_m_codes: [],
          enabled_features: ["parametric_programming", "conditional_branching", "looping"],
        });
      }
    }

    if (cf.high_speed_machining) {
      const hsmKey = "High Speed Machining";
      if (!packageMap.has(hsmKey)) {
        packageMap.set(hsmKey, {
          name: hsmKey,
          code: "HSM",
          description: "High speed machining / AI contour control option",
          enabled_g_codes: [],
          enabled_m_codes: [],
          enabled_features: ["aicc", "nano_smoothing", "look_ahead"],
        });
      }
    }

    for (const pkg of packageMap.values()) {
      packages.push(pkg);
    }
    return packages;
  }

  /** Validate handbook codes against ControllerDialectEngine patterns. */
  private _validateAgainstDialect(
    codes: CustomCodeEntry[],
    cf: HandbookControllerFeatures,
    family: string,
  ): DialectValidationFinding[] {
    const findings: DialectValidationFinding[] = [];

    // Lazy-load ControllerDialectEngine
    let dialectEngine: any;
    try {
      dialectEngine = require("./ControllerDialectEngine.js").controllerDialectEngine;
    } catch {
      findings.push({
        severity: "info",
        type: "feature_gap",
        message: "ControllerDialectEngine not available for validation — skipping dialect comparison",
        recommendation: "Ensure ControllerDialectEngine is exported and built",
      });
      return findings;
    }

    // Try to get the dialect for this controller family
    let dialect: any;
    try {
      const familyMap: Record<string, string> = {
        fanuc: "fanuc_31i", siemens: "siemens_840d", heidenhain: "heidenhain_tnc640",
        mazak: "mazak_smooth_ai", okuma: "okuma_osp_p300", haas: "haas_ngc",
        brother: "brother_speedio", mitsubishi: "mitsubishi_m80", generic: "generic_fanuc",
      };
      const dialectId = familyMap[family] ?? "generic_fanuc";
      dialect = dialectEngine.getDialect?.(dialectId);
    } catch {
      // Dialect lookup failed — not critical
    }

    if (!dialect) {
      findings.push({
        severity: "info",
        type: "feature_gap",
        message: `No dialect definition found for family '${family}' — cannot compare handbook codes`,
        recommendation: "Add dialect definition to ControllerDialectEngine for this controller family",
      });
      return findings;
    }

    // Check for handbook codes not in dialect's canned cycles
    const dialectCycles = dialect.canned_cycles ?? {};
    for (const code of codes.filter(c => c.category === "probing" || c.category === "threading")) {
      const dialectHasCode = Object.values(dialectCycles).includes(code.code) ||
        Object.values(dialectCycles).some((v: any) => typeof v === "string" && v.includes(code.code));
      if (!dialectHasCode) {
        findings.push({
          severity: "warning",
          type: "missing_code",
          code: code.code,
          message: `Custom code ${code.code} (${code.description}) from handbook not found in dialect definition`,
          handbook_value: code.code,
          recommendation: `Add ${code.code} to ControllerDialectEngine '${family}' canned_cycles or feature set`,
        });
      }
    }

    // Check look-ahead mismatch
    if (cf.look_ahead_blocks && dialect.features?.look_ahead_blocks) {
      if (cf.look_ahead_blocks !== dialect.features.look_ahead_blocks) {
        findings.push({
          severity: "warning",
          type: "syntax_mismatch",
          message: `Look-ahead blocks: handbook says ${cf.look_ahead_blocks}, dialect says ${dialect.features.look_ahead_blocks}`,
          handbook_value: String(cf.look_ahead_blocks),
          dialect_value: String(dialect.features.look_ahead_blocks),
          recommendation: "Update ControllerDialectEngine with handbook-sourced look_ahead_blocks value",
        });
      }
    }

    // Check work offset count mismatch
    if (cf.max_work_offsets && dialect.features?.work_offset_count) {
      if (cf.max_work_offsets !== dialect.features.work_offset_count) {
        findings.push({
          severity: "info",
          type: "syntax_mismatch",
          message: `Work offset count: handbook says ${cf.max_work_offsets}, dialect says ${dialect.features.work_offset_count}`,
          handbook_value: String(cf.max_work_offsets),
          dialect_value: String(dialect.features.work_offset_count),
          recommendation: "Verify and reconcile work offset counts between sources",
        });
      }
    }

    return findings;
  }

  /** Parse parameter names from a syntax string like "G65 P<prog> A<val> B<val>". */
  private _parseSyntaxParams(syntax: string): string[] {
    const matches = syntax.match(/[A-Z]<[^>]+>/g) ?? [];
    return matches.map(m => m.replace(/<|>/g, ""));
  }

  /** Infer which option package a code belongs to based on code range and description. */
  private _inferOptionForCode(code: string, description: string, family: string): string | undefined {
    const codeNum = parseInt(code.replace(/[GM]/i, ""), 10);
    if (isNaN(codeNum)) return undefined;

    // Fanuc option ranges (approximate). Ref: Fanuc 31i Option List.
    if (family === "fanuc" || family === "haas") {
      if (/macro|variable|param/i.test(description)) return "Custom Macro B";
      if (/probe|measure|skip/i.test(description)) return "Skip/Probe";
      if (/rigid|tap/i.test(description)) return "Rigid Tapping";
      if (/aicc|contour|smooth|nano/i.test(description)) return "AI Contour Control";
      if (/polar|coordinate.?rot/i.test(description)) return "Coordinate Rotation";
    }

    if (family === "siemens") {
      if (/measure|probe/i.test(description)) return "Measuring Cycles";
      if (/swivel|tcpm|rtcp/i.test(description)) return "5-Axis Package";
      if (/smooth|compressor/i.test(description)) return "Top Surface";
    }

    return undefined;
  }
}

// ─── Singleton export ────────────────────────────────────────────────

export const controllerProgrammingIntelligenceEngine = new ControllerProgrammingIntelligenceEngine();
