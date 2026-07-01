/**
 * CNCControllerDeepLearningEngine — Deep AI Intelligence for CNC Controllers
 *
 * Extracts controller-specific knowledge from:
 * - H:/prism/Resources/WinMax Mill CUTTER COMPENSATION.pdf
 * - H:/prism/Resources/WinMax Mill RECOVERY AND RESTART.pdf
 * - Post processor documentation
 * - JM Die controller inventory (7 Okuma, 1 Haas, 2 Hurco, 3 Mitsubishi)
 *
 * Provides deep reasoning for:
 * - G-code dialect translation
 * - Controller capability matching
 * - Macro programming patterns
 * - Recovery and restart procedures
 * - Cutter compensation strategies
 *
 * @module engines/CNCControllerDeepLearningEngine
 */

import { readFileSync } from "node:fs";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ControllerFamily =
  | "okuma_osp"
  | "haas_ngc"
  | "hurco_winmax"
  | "fanuc"
  | "mazak_mazatrol"
  | "siemens_sinumerik"
  | "heidenhain_tnc"
  | "mitsubishi"
  | "roku_roku";

export type ControllerCapability =
  | "conversational"
  | "iso_gcode"
  | "macro_b"
  | "custom_macro"
  | "cutter_comp"
  | "tool_life_mgmt"
  | "probing"
  | "high_speed_mode"
  | "look_ahead"
  | "nano_smoothing"
  | "ai_contour";

export interface ControllerProfile {
  family: ControllerFamily;
  model: string;
  capabilities: ControllerCapability[];
  gcode_dialect: string;
  macro_syntax: string;
  max_axes: number;
  max_rpm: number;
  max_feedrate: number;
  memory_mb: number;
  year_introduced: number;
}

export interface GCodeTranslation {
  source_controller: ControllerFamily;
  target_controller: ControllerFamily;
  original_code: string;
  translated_code: string;
  changes: Array<{ from: string; to: string; reason: string }>;
  warnings: string[];
  confidence: number;
}

export interface ControllerRecommendation {
  controller: ControllerFamily;
  model: string;
  score: number;
  reasons: string[];
  limitations: string[];
  jm_die_machine?: string;
}

export interface MacroPattern {
  name: string;
  controller: ControllerFamily;
  description: string;
  code_template: string;
  variables: Array<{ name: string; description: string; type: string }>;
  applications: string[];
}

export interface RecoveryProcedure {
  controller: ControllerFamily;
  scenario: string;
  steps: string[];
  precautions: string[];
  verification: string[];
}

// ----------------------------------------------------------------------------
// Learned-pattern corpus (AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DL).
// Mined from the JM-Die macro corpus by scripts/train-cnc-controller-from-corpus.mjs
// and consumed here via ingestLearnedPatterns(). All rows carry their controller so
// the flat stores can be filtered per-family at query time.
// ----------------------------------------------------------------------------

/** A learned tool-slot convention (which tool number a shop uses for an op). */
interface LearnedToolSlot {
  controller: ControllerFamily;
  tool_number: string;
  digits: number;
  operation: string;
  source_files: string[];
  frequency: number;
}

/** A learned V-variable idiom (a named parameter + its observed expression). */
interface LearnedVVar {
  controller: ControllerFamily;
  name: string;
  expression: string;
  description: string;
  source_files: string[];
  frequency: number;
}

/** A learned macro label idiom (a label + the token that conventionally follows). */
interface LearnedMacroLabel {
  controller: ControllerFamily;
  label: string;
  following_token: string;
  source_files: string[];
  frequency: number;
}

/** Per-array counts shared by the ingest result and the stats snapshot. */
export interface LearnedPatternCounts {
  toolSlotConventions: number;
  vVariableIdioms: number;
  macroLabels: number;
}

/** Result of ingestLearnedPatterns() -- counts loaded + rows skipped (drift signal). */
export interface LearnedIngestResult {
  loaded: boolean;
  schemaVersion: string;
  fileCount: number;
  counts: LearnedPatternCounts;
  skipped: { unknownController: number; malformedRow: number };
}

/** Snapshot of the currently-ingested learned corpus. */
export interface LearnedPatternStats {
  loaded: boolean;
  fileCount: number;
  counts: LearnedPatternCounts;
}

/**
 * schemaVersions this consumer accepts. The DRAFT marker was written by the
 * Step 1-2 extractor before any consumer existed; the canonical ledger is bumped
 * to "1.0.0" by this unit. Both are honoured for back-compat.
 */
const SUPPORTED_LEARNED_SCHEMA_VERSIONS = new Set<string>([
  "1.0.0",
  "1.0.0-DRAFT-no-consumer",
]);

// ============================================================================
// CONTROLLER KNOWLEDGE BASE
// ============================================================================

const CONTROLLER_PROFILES: Record<ControllerFamily, ControllerProfile> = {
  okuma_osp: {
    family: "okuma_osp",
    model: "OSP-P300",
    capabilities: ["conversational", "iso_gcode", "custom_macro", "cutter_comp", "tool_life_mgmt", "probing", "high_speed_mode", "look_ahead"],
    gcode_dialect: "okuma",
    macro_syntax: "V-macro",
    max_axes: 5,
    max_rpm: 6000,
    max_feedrate: 30000,
    memory_mb: 256,
    year_introduced: 2010,
  },
  haas_ngc: {
    family: "haas_ngc",
    model: "NGC",
    capabilities: ["iso_gcode", "macro_b", "cutter_comp", "probing", "high_speed_mode", "look_ahead"],
    gcode_dialect: "fanuc",
    macro_syntax: "Macro B",
    max_axes: 5,
    max_rpm: 12000,
    max_feedrate: 50800,
    memory_mb: 1024,
    year_introduced: 2018,
  },
  hurco_winmax: {
    family: "hurco_winmax",
    model: "WinMax",
    capabilities: ["conversational", "iso_gcode", "cutter_comp", "probing", "high_speed_mode", "look_ahead", "ai_contour"],
    gcode_dialect: "hurco",
    macro_syntax: "WinMax macro",
    max_axes: 5,
    max_rpm: 15000,
    max_feedrate: 40000,
    memory_mb: 512,
    year_introduced: 2012,
  },
  fanuc: {
    family: "fanuc",
    model: "0i-MF Plus",
    capabilities: ["iso_gcode", "macro_b", "cutter_comp", "tool_life_mgmt", "probing", "high_speed_mode", "look_ahead", "nano_smoothing", "ai_contour"],
    gcode_dialect: "fanuc",
    macro_syntax: "Macro B",
    max_axes: 8,
    max_rpm: 24000,
    max_feedrate: 60000,
    memory_mb: 2048,
    year_introduced: 2020,
  },
  mazak_mazatrol: {
    family: "mazak_mazatrol",
    model: "SmoothAi",
    capabilities: ["conversational", "iso_gcode", "custom_macro", "cutter_comp", "tool_life_mgmt", "probing", "high_speed_mode", "look_ahead", "ai_contour"],
    gcode_dialect: "mazatrol",
    macro_syntax: "Mazatrol macro",
    max_axes: 5,
    max_rpm: 18000,
    max_feedrate: 42000,
    memory_mb: 1024,
    year_introduced: 2022,
  },
  siemens_sinumerik: {
    family: "siemens_sinumerik",
    model: "840D sl",
    capabilities: ["iso_gcode", "custom_macro", "cutter_comp", "tool_life_mgmt", "probing", "high_speed_mode", "look_ahead", "nano_smoothing"],
    gcode_dialect: "siemens",
    macro_syntax: "Cycles",
    max_axes: 31,
    max_rpm: 40000,
    max_feedrate: 100000,
    memory_mb: 4096,
    year_introduced: 2018,
  },
  heidenhain_tnc: {
    family: "heidenhain_tnc",
    model: "TNC 640",
    capabilities: ["conversational", "iso_gcode", "custom_macro", "cutter_comp", "probing", "high_speed_mode", "look_ahead"],
    gcode_dialect: "heidenhain",
    macro_syntax: "Q-params",
    max_axes: 18,
    max_rpm: 24000,
    max_feedrate: 60000,
    memory_mb: 2048,
    year_introduced: 2015,
  },
  mitsubishi: {
    family: "mitsubishi",
    model: "M80",
    capabilities: ["iso_gcode", "custom_macro", "cutter_comp", "probing", "high_speed_mode", "look_ahead"],
    gcode_dialect: "fanuc",
    macro_syntax: "User macro",
    max_axes: 8,
    max_rpm: 20000,
    max_feedrate: 54000,
    memory_mb: 512,
    year_introduced: 2016,
  },
  roku_roku: {
    family: "roku_roku",
    model: "RMC-5",
    capabilities: ["iso_gcode", "high_speed_mode", "look_ahead", "nano_smoothing"],
    gcode_dialect: "fanuc",
    macro_syntax: "Standard",
    max_axes: 5,
    max_rpm: 40000,
    max_feedrate: 60000,
    memory_mb: 256,
    year_introduced: 2010,
  },
};

// G-code translation rules
const GCODE_TRANSLATIONS: Record<string, Record<ControllerFamily, string>> = {
  // Tool change
  "M6": { okuma_osp: "M6", haas_ngc: "M6", hurco_winmax: "M6", fanuc: "M6", mazak_mazatrol: "M6", siemens_sinumerik: "M6", heidenhain_tnc: "TOOL CALL", mitsubishi: "M6", roku_roku: "M6" },
  // Spindle on CW
  "M3": { okuma_osp: "M3", haas_ngc: "M3", hurco_winmax: "M3", fanuc: "M3", mazak_mazatrol: "M3", siemens_sinumerik: "M3", heidenhain_tnc: "M3", mitsubishi: "M3", roku_roku: "M3" },
  // Coolant on
  "M8": { okuma_osp: "M8", haas_ngc: "M8", hurco_winmax: "M8", fanuc: "M8", mazak_mazatrol: "M8", siemens_sinumerik: "M8", heidenhain_tnc: "M8", mitsubishi: "M8", roku_roku: "M8" },
  // G41 cutter comp left
  "G41": { okuma_osp: "G41", haas_ngc: "G41", hurco_winmax: "G41", fanuc: "G41", mazak_mazatrol: "G41", siemens_sinumerik: "G41", heidenhain_tnc: "RL", mitsubishi: "G41", roku_roku: "G41" },
  // G42 cutter comp right
  "G42": { okuma_osp: "G42", haas_ngc: "G42", hurco_winmax: "G42", fanuc: "G42", mazak_mazatrol: "G42", siemens_sinumerik: "G42", heidenhain_tnc: "RR", mitsubishi: "G42", roku_roku: "G42" },
  // Cancel cutter comp
  "G40": { okuma_osp: "G40", haas_ngc: "G40", hurco_winmax: "G40", fanuc: "G40", mazak_mazatrol: "G40", siemens_sinumerik: "G40", heidenhain_tnc: "R0", mitsubishi: "G40", roku_roku: "G40" },
};

// JM Die machine inventory mapping
const JM_DIE_MACHINES: Array<{ name: string; controller: ControllerFamily; type: string }> = [
  { name: "Okuma LB3000EX", controller: "okuma_osp", type: "lathe" },
  { name: "Okuma LB4000EX", controller: "okuma_osp", type: "lathe" },
  { name: "Okuma Multus B300", controller: "okuma_osp", type: "mill_turn" },
  { name: "Okuma Multus B400", controller: "okuma_osp", type: "mill_turn" },
  { name: "Okuma LT2000EX", controller: "okuma_osp", type: "twin_spindle_lathe" },
  { name: "Okuma LT3000EX", controller: "okuma_osp", type: "twin_spindle_lathe" },
  { name: "Okuma MU-4000V", controller: "okuma_osp", type: "5axis_mill" },
  { name: "Haas VF-2", controller: "haas_ngc", type: "vmc" },
  { name: "Hurco VM10i", controller: "hurco_winmax", type: "vmc" },
  { name: "Hurco VMX30i", controller: "hurco_winmax", type: "vmc" },
  { name: "Roku-Roku HSM-5", controller: "roku_roku", type: "high_speed_mill" },
  { name: "Mitsubishi MV1200S", controller: "mitsubishi", type: "wire_edm" },
  { name: "Mitsubishi EA12V", controller: "mitsubishi", type: "sinker_edm" },
  { name: "Mitsubishi EA8S", controller: "mitsubishi", type: "sinker_edm" },
];

// Macro patterns
const MACRO_PATTERNS: MacroPattern[] = [
  {
    name: "probing_cycle_okuma",
    controller: "okuma_osp",
    description: "Workpiece probing cycle for Okuma OSP",
    code_template: `
VCALL VC41 (PROBE X)
VXOFS = VMEAS
`,
    variables: [{ name: "VMEAS", description: "Measured value", type: "number" }],
    applications: ["setup", "inspection"],
  },
  {
    name: "tool_life_check_haas",
    controller: "haas_ngc",
    description: "Tool life management check for Haas",
    code_template: `
#100 = #[5400 + [#1 * 20]]
IF [#100 GT #2] GOTO 100
`,
    variables: [
      { name: "#1", description: "Tool number", type: "integer" },
      { name: "#2", description: "Life limit", type: "integer" },
    ],
    applications: ["production", "tool_management"],
  },
  {
    name: "casing_profile_okuma",
    controller: "okuma_osp",
    description: "Cold heading die casing profile macro",
    code_template: `
VC1 = (CASING OD)
VC2 = (CASING ID)
VC3 = (CASING LENGTH)
`,
    variables: [
      { name: "VC1", description: "Outside diameter", type: "number" },
      { name: "VC2", description: "Inside diameter", type: "number" },
      { name: "VC3", description: "Length", type: "number" },
    ],
    applications: ["die_making", "casing"],
  },
];

// Recovery procedures (from WinMax Mill RECOVERY AND RESTART.pdf)
const RECOVERY_PROCEDURES: RecoveryProcedure[] = [
  {
    controller: "hurco_winmax",
    scenario: "power_failure_mid_cycle",
    steps: [
      "1. Power on machine and home all axes",
      "2. Navigate to Data → NC Program",
      "3. Select the interrupted program",
      "4. Use Search → Block to find restart point",
      "5. Use Run → From Selected Block",
      "6. Verify spindle and coolant states",
      "7. Use dry run to verify path before cutting",
    ],
    precautions: [
      "Verify tool is still in spindle",
      "Check for chip buildup in cut",
      "Confirm workpiece has not shifted",
    ],
    verification: [
      "Run single block through restart area",
      "Measure critical dimensions after completion",
    ],
  },
  {
    controller: "okuma_osp",
    scenario: "tool_breakage",
    steps: [
      "1. Press Feed Hold or Emergency Stop",
      "2. Retract Z to safe height (G28 Z0)",
      "3. Change to replacement tool",
      "4. Update tool offset if needed",
      "5. Use Search function to find last completed operation",
      "6. Restart from previous safe position",
    ],
    precautions: [
      "Inspect workpiece for damage",
      "Clear broken tool fragments",
      "Verify replacement tool geometry matches",
    ],
    verification: [
      "Probe workpiece if available",
      "Run overlap cut to blend surfaces",
    ],
  },
];

// Cutter compensation knowledge (from WinMax Mill CUTTER COMPENSATION.pdf)
const CUTTER_COMP_KNOWLEDGE = {
  winmax: {
    activation: "G41 D## (left) or G42 D## (right)",
    lead_in_requirements: "Minimum 2x cutter radius linear move",
    lead_out_requirements: "Linear move before G40",
    corner_handling: "Auto sharp/round based on geometry",
    troubleshooting: [
      "Error: Cutter comp overcut — increase corner radius or use smaller tool",
      "Error: Gouging detected — add lead-in/lead-out moves",
      "Error: Comp direction conflict — verify G41/G42 matches climb/conventional",
    ],
  },
  general: {
    types: ["wear_offset_only", "full_cutter_comp", "tool_nose_radius_comp"],
    common_errors: [
      "Insufficient lead-in distance",
      "Missing G40 cancel before tool change",
      "Wrong compensation direction for climb vs conventional",
    ],
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CNCControllerDeepLearningEngine {
  private controllerProfiles = CONTROLLER_PROFILES;
  private jmDieMachines = JM_DIE_MACHINES;
  private macroPatterns = MACRO_PATTERNS;
  private recoveryProcedures = RECOVERY_PROCEDURES;

  // Learned-corpus state (populated by ingestLearnedPatterns; empty until then).
  private learnedLoaded = false;
  private learnedSchemaVersion = "";
  private learnedFileCount = 0;
  private learnedToolSlots: LearnedToolSlot[] = [];
  private learnedVVars: LearnedVVar[] = [];
  private learnedMacroLabels: LearnedMacroLabel[] = [];
  // Own-key Set so a `__proto__`/`constructor` controller can never match a real
  // family (Object key membership would resolve those off the prototype chain).
  private readonly knownFamilies = new Set<string>(Object.keys(CONTROLLER_PROFILES));

  // ==========================================================================
  // CONTROLLER SELECTION
  // ==========================================================================

  /**
   * Select optimal controller for a job based on requirements.
   * Uses deep reasoning to match capabilities to needs.
   */
  selectControllerForJob(requirements: {
    operation_type: string;
    axes_needed: number;
    max_rpm_needed?: number;
    macro_required?: boolean;
    conversational_preferred?: boolean;
    jm_die_only?: boolean;
  }): ControllerRecommendation[] {
    log.info("[controller-ai] Selecting controller for job", requirements);

    const recommendations: ControllerRecommendation[] = [];

    for (const [family, profile] of Object.entries(this.controllerProfiles)) {
      let score = 50; // Base score
      const reasons: string[] = [];
      const limitations: string[] = [];

      // Axis capability
      if (profile.max_axes >= requirements.axes_needed) {
        score += 10;
        reasons.push(`Supports ${profile.max_axes} axes (need ${requirements.axes_needed})`);
      } else {
        score -= 30;
        limitations.push(`Only ${profile.max_axes} axes (need ${requirements.axes_needed})`);
      }

      // RPM capability
      if (requirements.max_rpm_needed && profile.max_rpm >= requirements.max_rpm_needed) {
        score += 10;
        reasons.push(`Max RPM ${profile.max_rpm} meets requirement`);
      } else if (requirements.max_rpm_needed) {
        score -= 20;
        limitations.push(`Max RPM ${profile.max_rpm} below ${requirements.max_rpm_needed}`);
      }

      // Macro capability
      if (requirements.macro_required) {
        if (profile.capabilities.includes("macro_b") || profile.capabilities.includes("custom_macro")) {
          score += 15;
          reasons.push(`Supports ${profile.macro_syntax} macro programming`);
        } else {
          score -= 25;
          limitations.push("Limited macro support");
        }
      }

      // Conversational preference
      if (requirements.conversational_preferred && profile.capabilities.includes("conversational")) {
        score += 10;
        reasons.push("Supports conversational programming");
      }

      // JM Die availability
      if (requirements.jm_die_only) {
        const jmMachine = this.jmDieMachines.find(m => m.controller === family);
        if (jmMachine) {
          score += 20;
          reasons.push(`Available at JM Die: ${jmMachine.name}`);
        } else {
          score = 0; // Not available at JM Die
          limitations.push("Not available at JM Die");
        }
      }

      // Find JM Die machine if available
      const jmMachine = this.jmDieMachines.find(m => m.controller === family);

      recommendations.push({
        controller: family as ControllerFamily,
        model: profile.model,
        score: Math.max(0, Math.min(100, score)),
        reasons,
        limitations,
        jm_die_machine: jmMachine?.name,
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // G-CODE TRANSLATION
  // ==========================================================================

  /**
   * Translate G-code between controller dialects.
   * Deep reasoning for semantic equivalence.
   */
  translateGCode(
    sourceController: ControllerFamily,
    targetController: ControllerFamily,
    program: string
  ): GCodeTranslation {
    log.info("[controller-ai] Translating G-code", { from: sourceController, to: targetController });

    const lines = program.split("\n");
    const translatedLines: string[] = [];
    const changes: Array<{ from: string; to: string; reason: string }> = [];
    const warnings: string[] = [];

    for (const line of lines) {
      let translatedLine = line;

      // Check each known G-code translation
      for (const [gcode, translations] of Object.entries(GCODE_TRANSLATIONS)) {
        if (line.includes(gcode)) {
          const sourceCode = translations[sourceController];
          const targetCode = translations[targetController];

          if (sourceCode !== targetCode) {
            translatedLine = translatedLine.replace(new RegExp(gcode, "g"), targetCode);
            changes.push({
              from: gcode,
              to: targetCode,
              reason: `${sourceController} → ${targetController} dialect`,
            });
          }
        }
      }

      // Heidenhain special handling
      if (targetController === "heidenhain_tnc") {
        // Convert G0 to L (linear rapid)
        if (translatedLine.match(/G0[^0-9]/)) {
          translatedLine = translatedLine.replace(/G0\s*/, "L ");
          translatedLine += " FMAX";
          changes.push({ from: "G0", to: "L ... FMAX", reason: "Heidenhain uses L for linear moves" });
        }
        // Convert G1 to L
        if (translatedLine.match(/G1[^0-9]/)) {
          translatedLine = translatedLine.replace(/G1\s*/, "L ");
          changes.push({ from: "G1", to: "L", reason: "Heidenhain uses L for linear moves" });
        }
      }

      translatedLines.push(translatedLine);
    }

    // Add warnings for untranslatable features
    if (sourceController === "mazak_mazatrol" && targetController !== "mazak_mazatrol") {
      warnings.push("Mazatrol conversational programs cannot be directly translated - requires manual reprogramming");
    }

    const sourceProfile = this.controllerProfiles[sourceController];
    const targetProfile = this.controllerProfiles[targetController];

    if (sourceProfile.capabilities.includes("nano_smoothing") && !targetProfile.capabilities.includes("nano_smoothing")) {
      warnings.push("Target controller lacks nano-smoothing - surface finish may differ");
    }

    return {
      source_controller: sourceController,
      target_controller: targetController,
      original_code: program,
      translated_code: translatedLines.join("\n"),
      changes,
      warnings,
      confidence: changes.length === 0 ? 0.95 : 0.85 - (warnings.length * 0.1),
    };
  }

  // ==========================================================================
  // MACRO INTELLIGENCE
  // ==========================================================================

  /**
   * Ingest a learned-patterns ledger (mined from the JM-Die macro corpus by
   * scripts/train-cnc-controller-from-corpus.mjs) and REPLACE any prior corpus.
   *
   * Fail-loud (R12): throws on a bad path / unreadable file / invalid JSON /
   * non-object root / missing `ledger` object / missing required arrays /
   * missing-or-unsupported schemaVersion. Per-row drift (unknown controller,
   * missing required field, non-object row) is tolerated and counted in
   * `skipped` so a partially-drifted ledger still loads its good rows.
   *
   * Parsing happens into LOCAL arrays; engine state is only mutated once parsing
   * fully succeeds, so a throw leaves any prior good corpus intact.
   *
   * @param ledgerPath absolute/relative path to the JSON ledger.
   * @returns counts loaded + rows skipped.
   */
  ingestLearnedPatterns(ledgerPath: string): LearnedIngestResult {
    if (typeof ledgerPath !== "string" || ledgerPath.trim() === "") {
      throw new Error("ingestLearnedPatterns: ledgerPath must be a non-empty string");
    }
    let raw: string;
    try {
      raw = readFileSync(ledgerPath, "utf8");
    } catch {
      throw new Error(`ingestLearnedPatterns: cannot read learned-patterns file "${ledgerPath}"`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`ingestLearnedPatterns: "${ledgerPath}" is not valid JSON`);
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`ingestLearnedPatterns: "${ledgerPath}" did not parse to a JSON object`);
    }
    const doc = parsed as Record<string, unknown>;

    const schemaVersion = doc.schemaVersion;
    if (typeof schemaVersion !== "string") {
      throw new Error(`ingestLearnedPatterns: ledger has no string "schemaVersion"`);
    }
    if (!SUPPORTED_LEARNED_SCHEMA_VERSIONS.has(schemaVersion)) {
      throw new Error(
        `ingestLearnedPatterns: schemaVersion "${schemaVersion}" is not supported ` +
          `(expected one of ${[...SUPPORTED_LEARNED_SCHEMA_VERSIONS].join(", ")})`,
      );
    }

    const ledger = doc.ledger;
    if (ledger === null || typeof ledger !== "object" || Array.isArray(ledger)) {
      throw new Error(`ingestLearnedPatterns: ledger has no "ledger" object`);
    }
    const L = ledger as Record<string, unknown>;
    if (
      !Array.isArray(L.tool_slot_conventions) ||
      !Array.isArray(L.v_variable_idioms) ||
      !Array.isArray(L.macro_labels)
    ) {
      throw new Error(
        `ingestLearnedPatterns: ledger is missing one of the required arrays ` +
          `(tool_slot_conventions, v_variable_idioms, macro_labels)`,
      );
    }

    // --- parse into LOCAL arrays (state untouched until the commit below) ---
    const skipped = { unknownController: 0, malformedRow: 0 };
    const toolSlots: LearnedToolSlot[] = [];
    const vVars: LearnedVVar[] = [];
    const macroLabels: LearnedMacroLabel[] = [];

    const isObj = (r: unknown): r is Record<string, unknown> =>
      r !== null && typeof r === "object" && !Array.isArray(r);
    const familyOf = (r: Record<string, unknown>): ControllerFamily | null => {
      const c = r.controller;
      return typeof c === "string" && this.knownFamilies.has(c) ? (c as ControllerFamily) : null;
    };
    // Required-string fields accept a finite number too (coerced) but never an
    // empty/whitespace string -> that is field drift.
    const reqStr = (v: unknown): string | null =>
      typeof v === "string" && v.trim() !== ""
        ? v
        : typeof v === "number" && Number.isFinite(v)
          ? String(v)
          : null;
    const numOf = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const filesOf = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

    for (const row of L.tool_slot_conventions) {
      if (!isObj(row)) { skipped.malformedRow++; continue; }
      const fam = familyOf(row);
      if (!fam) { skipped.unknownController++; continue; }
      const toolNumber = reqStr(row.tool_number);
      const operation = reqStr(row.operation);
      if (toolNumber === null || operation === null) { skipped.malformedRow++; continue; }
      toolSlots.push({
        controller: fam,
        tool_number: toolNumber,
        digits: numOf(row.digits),
        operation,
        source_files: filesOf(row.source_files),
        frequency: numOf(row.frequency),
      });
    }
    for (const row of L.v_variable_idioms) {
      if (!isObj(row)) { skipped.malformedRow++; continue; }
      const fam = familyOf(row);
      if (!fam) { skipped.unknownController++; continue; }
      const name = reqStr(row.name);
      const expression = reqStr(row.expression);
      if (name === null || expression === null) { skipped.malformedRow++; continue; }
      vVars.push({
        controller: fam,
        name,
        expression,
        description: typeof row.description === "string" ? row.description : "",
        source_files: filesOf(row.source_files),
        frequency: numOf(row.frequency),
      });
    }
    for (const row of L.macro_labels) {
      if (!isObj(row)) { skipped.malformedRow++; continue; }
      const fam = familyOf(row);
      if (!fam) { skipped.unknownController++; continue; }
      const label = reqStr(row.label);
      const following = reqStr(row.following_token);
      if (label === null || following === null) { skipped.malformedRow++; continue; }
      macroLabels.push({
        controller: fam,
        label,
        following_token: following,
        source_files: filesOf(row.source_files),
        frequency: numOf(row.frequency),
      });
    }

    // --- commit (atomic replace; prior corpus discarded) ---
    this.learnedLoaded = true;
    this.learnedSchemaVersion = schemaVersion;
    this.learnedFileCount = numOf(doc.fileCount);
    this.learnedToolSlots = toolSlots;
    this.learnedVVars = vVars;
    this.learnedMacroLabels = macroLabels;

    return {
      loaded: true,
      schemaVersion,
      fileCount: this.learnedFileCount,
      counts: {
        toolSlotConventions: toolSlots.length,
        vVariableIdioms: vVars.length,
        macroLabels: macroLabels.length,
      },
      skipped,
    };
  }

  /** Snapshot of the currently-ingested learned corpus (loaded:false before ingest). */
  getLearnedPatternStats(): LearnedPatternStats {
    return {
      loaded: this.learnedLoaded,
      fileCount: this.learnedFileCount,
      counts: {
        toolSlotConventions: this.learnedToolSlots.length,
        vVariableIdioms: this.learnedVVars.length,
        macroLabels: this.learnedMacroLabels.length,
      },
    };
  }

  /**
   * Synthesize a non-stub macro template from a matched learned tool-slot plus
   * the controller's learned V-variables and macro labels. Deterministic: the
   * output is a pure function of the (ordered) corpus rows.
   */
  private synthesizeLearnedTemplate(
    slot: LearnedToolSlot,
    vvars: LearnedVVar[],
    labels: LearnedMacroLabel[],
  ): string {
    const lines: string[] = [
      `( LEARNED MACRO: ${slot.operation} )`,
      `( Synthesized from JM-Die corpus -- ${slot.controller}, ${slot.source_files.length} file(s) )`,
      `T${slot.tool_number}   ( ${slot.operation} )`,
    ];
    for (const v of vvars) lines.push(`${v.name} = ${v.expression}   ( ${v.description} )`);
    for (const m of labels) lines.push(`${m.label} ${m.following_token}`);
    lines.push("M99");
    return lines.join("\n");
  }

  /**
   * Recommend a macro for an operation. Built-in MACRO_PATTERNS take precedence;
   * if none match and a learned corpus is loaded, synthesize a non-stub macro
   * from the corpus tool-slot whose operation contains the request. Returns null
   * when nothing matches (an empty/whitespace operation always returns null).
   */
  recommendMacro(operation: string, controller: ControllerFamily): MacroPattern | null {
    const op = typeof operation === "string" ? operation.trim() : "";

    // 1. Built-in patterns win.
    const builtin = this.macroPatterns.filter(
      p => p.controller === controller && p.applications.some(a => op.toLowerCase().includes(a)),
    );
    if (builtin[0]) return builtin[0];

    // 2. Learned-corpus synthesis (only with a loaded corpus + a real operation).
    if (!this.learnedLoaded || op === "") return null;
    const opLower = op.toLowerCase();
    const slot = this.learnedToolSlots.find(
      s => s.controller === controller && s.operation.toLowerCase().includes(opLower),
    );
    if (!slot) return null;

    const vvars = this.learnedVVars.filter(v => v.controller === controller);
    const labels = this.learnedMacroLabels.filter(m => m.controller === controller);
    const slug = slot.operation.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return {
      name: `learned_${slug}_${controller}`,
      controller,
      description: `Learned macro for "${slot.operation}" synthesized from ${slot.source_files.length} JM-Die corpus file(s)`,
      code_template: this.synthesizeLearnedTemplate(slot, vvars, labels),
      variables: vvars.map(v => ({ name: v.name, description: v.description, type: "number" })),
      applications: [opLower],
    };
  }

  /**
   * Generate macro code for a task description.
   */
  generateMacro(taskDescription: string, controller: ControllerFamily): {
    code: string;
    explanation: string;
    variables: Array<{ name: string; purpose: string }>;
  } {
    const profile = this.controllerProfiles[controller];
    const macroStyle = profile.macro_syntax;

    // Generate based on controller type
    if (controller === "okuma_osp") {
      // Seed from learned V-variables when the ingested corpus has them for this
      // controller; otherwise fall back to the generic VC1/VC2 stub (back-compat).
      const learnedVVars = this.learnedLoaded
        ? this.learnedVVars.filter(v => v.controller === "okuma_osp")
        : [];
      if (learnedVVars.length > 0) {
        const varLines = learnedVVars
          .map(v => `${v.name} = ${v.expression}   ( ${v.description} )`)
          .join("\n");
        return {
          code: `
( ${taskDescription.toUpperCase()} )
( Generated for Okuma OSP-P300 -- V-variables learned from JM-Die corpus )
${varLines}
( Add your logic here )
VGOTO 100
N100
M99
`,
          explanation: `V-macro format for Okuma OSP, seeded with ${learnedVVars.length} V-variable(s) learned from the JM-Die corpus.`,
          variables: learnedVVars.map(v => ({ name: v.name, purpose: v.description })),
        };
      }
      return {
        code: `
( ${taskDescription.toUpperCase()} )
( Generated for Okuma OSP-P300 )
VC1 = (PARAM 1)
VC2 = (PARAM 2)
( Add your logic here )
VGOTO 100
N100
M99
`,
        explanation: `V-macro format for Okuma OSP. Uses VC variables for parameters.`,
        variables: [
          { name: "VC1", purpose: "Primary parameter" },
          { name: "VC2", purpose: "Secondary parameter" },
        ],
      };
    } else if (controller === "haas_ngc" || controller === "fanuc") {
      return {
        code: `
( ${taskDescription.toUpperCase()} )
( Generated for ${macroStyle} )
#100 = #1 (PARAM 1)
#101 = #2 (PARAM 2)
IF [#100 GT 0] GOTO 100
GOTO 200
N100
( Main logic )
N200
M99
`,
        explanation: `Macro B format. Uses # variables for parameters.`,
        variables: [
          { name: "#1 → #100", purpose: "Primary parameter" },
          { name: "#2 → #101", purpose: "Secondary parameter" },
        ],
      };
    }

    return {
      code: `( ${taskDescription} )\n( Generic macro template )`,
      explanation: "Generic template - customize for specific controller",
      variables: [],
    };
  }

  // ==========================================================================
  // RECOVERY PROCEDURES
  // ==========================================================================

  /**
   * Get recovery procedure for a scenario.
   */
  getRecoveryProcedure(controller: ControllerFamily, scenario: string): RecoveryProcedure | null {
    return this.recoveryProcedures.find(
      p => p.controller === controller && p.scenario.includes(scenario)
    ) || null;
  }

  /**
   * Debug post processor issue.
   */
  debugPostIssue(errorMessage: string, controller: ControllerFamily): {
    diagnosis: string;
    suggestions: string[];
    related_knowledge: string[];
  } {
    const suggestions: string[] = [];
    const relatedKnowledge: string[] = [];
    let diagnosis = "Unknown error";

    const errorLower = errorMessage.toLowerCase();

    // Cutter compensation errors (check first - highest specificity)
    if (errorLower.includes("cutter comp") || errorLower.includes("g41") || errorLower.includes("g42")) {
      diagnosis = "Cutter compensation error detected";
      suggestions.push(...CUTTER_COMP_KNOWLEDGE.general.common_errors);
      if (controller === "hurco_winmax") {
        suggestions.push(...CUTTER_COMP_KNOWLEDGE.winmax.troubleshooting);
      }
      relatedKnowledge.push("WinMax Mill CUTTER COMPENSATION.pdf");
    }
    // Axis limit errors
    else if (errorLower.includes("axis") || errorLower.includes("limit")) {
      diagnosis = "Axis travel or soft limit error";
      suggestions.push("Check work coordinate system (G54-G59)");
      suggestions.push("Verify fixture offset values");
      suggestions.push("Consider reorienting part in machine");
    }
    // Tool errors (check last - "t" is too generic)
    else if (errorLower.includes("tool")) {
      diagnosis = "Tool-related error";
      suggestions.push("Verify tool is in magazine");
      suggestions.push("Check tool length offset (H value)");
      suggestions.push("Confirm tool diameter compensation (D value)");
    }

    return { diagnosis, suggestions, related_knowledge: relatedKnowledge };
  }

  // ==========================================================================
  // CONTROLLER PROFILES
  // ==========================================================================

  /**
   * Get controller profile.
   */
  getControllerProfile(controller: ControllerFamily): ControllerProfile {
    return this.controllerProfiles[controller];
  }

  /**
   * Get all JM Die machines.
   */
  getJMDieMachines(): typeof JM_DIE_MACHINES {
    return this.jmDieMachines;
  }

  /**
   * Compare two controllers.
   */
  compareControllers(a: ControllerFamily, b: ControllerFamily): {
    comparison: Record<string, { a: string | number; b: string | number }>;
    recommendation: string;
  } {
    const profileA = this.controllerProfiles[a];
    const profileB = this.controllerProfiles[b];

    return {
      comparison: {
        max_axes: { a: profileA.max_axes, b: profileB.max_axes },
        max_rpm: { a: profileA.max_rpm, b: profileB.max_rpm },
        max_feedrate: { a: profileA.max_feedrate, b: profileB.max_feedrate },
        memory_mb: { a: profileA.memory_mb, b: profileB.memory_mb },
        macro_syntax: { a: profileA.macro_syntax, b: profileB.macro_syntax },
        gcode_dialect: { a: profileA.gcode_dialect, b: profileB.gcode_dialect },
      },
      recommendation:
        profileA.max_axes > profileB.max_axes
          ? `${a} has more axes (${profileA.max_axes} vs ${profileB.max_axes})`
          : profileB.max_axes > profileA.max_axes
          ? `${b} has more axes (${profileB.max_axes} vs ${profileA.max_axes})`
          : "Both controllers have similar capabilities",
    };
  }

  /**
   * Get cutter compensation knowledge.
   */
  getCutterCompKnowledge(): typeof CUTTER_COMP_KNOWLEDGE {
    return CUTTER_COMP_KNOWLEDGE;
  }

  // ==========================================================================
  // DEEP REASONING
  // ==========================================================================

  /**
   * Deep reasoning for controller selection.
   */
  deepReason(query: string): {
    reasoning_chain: string[];
    conclusion: string;
    confidence: number;
    sources: string[];
  } {
    const chain: string[] = [];
    const sources: string[] = [];

    // Analyze query for controller hints
    chain.push(`Analyzing query: "${query}"`);

    // Check for specific controller mentions
    for (const [family, profile] of Object.entries(this.controllerProfiles)) {
      if (query.toLowerCase().includes(family.replace("_", " ")) ||
          query.toLowerCase().includes(profile.model.toLowerCase())) {
        chain.push(`Detected reference to ${family} (${profile.model})`);
        sources.push(`Controller profile: ${profile.model}`);
      }
    }

    // Check for capability requirements
    if (query.toLowerCase().includes("5-axis") || query.toLowerCase().includes("5 axis")) {
      chain.push("5-axis capability required");
      chain.push("Filtering to controllers with max_axes >= 5");
      sources.push("Capability matrix");
    }

    if (query.toLowerCase().includes("high speed") || query.toLowerCase().includes("hsm")) {
      chain.push("High-speed machining capability required");
      chain.push("Looking for high_speed_mode and nano_smoothing capabilities");
      sources.push("HSM requirements");
    }

    // JM Die specific reasoning
    if (query.toLowerCase().includes("jm die")) {
      chain.push("JM Die context detected - filtering to available machines");
      chain.push(`Available: ${this.jmDieMachines.map(m => m.name).join(", ")}`);
      sources.push("JM Die machine inventory");
    }

    return {
      reasoning_chain: chain,
      conclusion: chain.length > 2 ? "Multiple factors identified for controller selection" : "General query - recommend Okuma OSP for JM Die compatibility",
      confidence: 0.85,
      sources,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const cncControllerDeepLearning = new CNCControllerDeepLearningEngine();
