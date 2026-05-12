/**
 * FanucLegacyControllerEngine.ts
 *
 * Support for legacy Fanuc 15 and 16i series controllers, which power 30%+ of machines
 * in the field. Provides dialect detection, G-code translation from modern formats,
 * and compatibility warnings for features unsupported on these older controllers.
 *
 * Key Differences from Modern Fanuc (0i/30i/31i):
 * - G43/G44 tool length comp behavior differences
 * - Limited canned cycle support (no G73 high-speed peck on some models)
 * - Restricted modal group handling
 * - Different parameter numbering system
 * - Bubble/CMOS memory limitations (program size constraints)
 * - No TCPM/TCP support (G43.4/G43.5)
 * - No nano-smoothing or AICC
 * - Different Macro B syntax on early 15-series
 *
 * Reference: Fanuc 15-M/15-MB/16-M/16i-M Programming Manuals
 * @module engines/FanucLegacyControllerEngine
 */

import { controllerDialectEngine } from "./ControllerDialectEngine.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LegacyControllerModel = "15" | "15M" | "15MB" | "16" | "16M" | "16i" | "16iM" | "16iMB";

export type MemoryType = "bubble" | "cmos" | "flash" | "sram";

export interface FanucLegacyProfile {
  controllerModel: LegacyControllerModel;
  displayName: string;
  manufacturerYears: string;
  memoryType: MemoryType;
  maxProgramSize: number;       // bytes
  maxBlockNumber: number;       // N-number limit
  maxToolOffsets: number;
  maxWorkOffsets: number;
  supportedGCodes: string[];
  unsupportedGCodes: string[];  // G-codes that don't work on this model
  parameterMap: Record<string, number>;  // modern -> legacy param mapping
  macroSupport: MacroSupport;
  cannedCycleVariations: CannedCycleVariations;
  toolLengthCompBehavior: ToolLengthCompBehavior;
  modalGroups: ModalGroupDefinition[];
  processingSpeed: number;      // blocks/sec
  lookAheadBlocks: number;
  axisLimit: number;            // max simultaneous axes
}

export interface MacroSupport {
  available: boolean;
  variableRange: string;
  systemVariables: string[];
  maxNesting: number;
  supportsGoto: boolean;
  supportsWhile: boolean;
  argPassing: "classic" | "extended";  // Classic: A-Z, Extended: A-Z + I,J,K additional
}

export interface CannedCycleVariations {
  g73Available: boolean;        // High-speed peck
  g73Syntax: "standard" | "legacy" | "none";
  g83PeckBehavior: "full_retract" | "incremental" | "both";
  g84RigidTap: boolean;
  g84Syntax: "standard" | "m29_required" | "none";
  g76ThreadSyntax: "single_block" | "multi_block";
  customCycles: Record<string, string>;
}

export interface ToolLengthCompBehavior {
  g43Standard: boolean;
  g44Available: boolean;        // G44 negative TLC
  g43HRequired: boolean;        // H-word mandatory
  g43Zinteraction: "additive" | "independent";
  g49CancelsBoth: boolean;
  multipleCompActive: boolean;  // Can G43 + G41/G42 be active together
}

export interface ModalGroupDefinition {
  group: number;
  name: string;
  codes: string[];
  defaultCode: string;
}

export interface TranslationResult {
  success: boolean;
  translatedCode: string[];
  warnings: TranslationWarning[];
  errors: TranslationError[];
  unsupportedFeatures: string[];
  statistics: TranslationStatistics;
}

export interface TranslationWarning {
  line: number;
  originalCode: string;
  message: string;
  severity: "info" | "warning" | "critical";
  suggestion?: string;
}

export interface TranslationError {
  line: number;
  originalCode: string;
  message: string;
  fatal: boolean;
}

export interface TranslationStatistics {
  totalLines: number;
  translatedLines: number;
  removedLines: number;
  addedLines: number;
  warningCount: number;
  errorCount: number;
}

export interface LegacyValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  programSize: number;
  estimatedMemoryUsage: number;
  fitsInMemory: boolean;
}

export interface ValidationIssue {
  line: number;
  code: string;
  issue: string;
  severity: "error" | "warning" | "info";
  fix?: string;
}

// ─── Legacy Controller Profiles Database ─────────────────────────────────────

const LEGACY_PROFILES: Record<LegacyControllerModel, FanucLegacyProfile> = {
  "15": {
    controllerModel: "15",
    displayName: "Fanuc 15",
    manufacturerYears: "1985-1990",
    memoryType: "bubble",
    maxProgramSize: 64000,      // 64KB bubble memory
    maxBlockNumber: 9999,
    maxToolOffsets: 32,
    maxWorkOffsets: 6,         // G54-G59 only
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G17", "G18", "G19",
      "G20", "G21",
      "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1",      // AICC/Nano-smoothing
      "G43.4", "G43.5",  // TCPM
      "G54.1",      // Extended work offsets
      "G68", "G68.2",    // Coordinate rotation
      "G73",        // High-speed peck (model dependent)
      "G84.2", "G84.3",  // Rigid tapping variants
      "G187",       // Smoothing
    ],
    parameterMap: {
      "1220": 1001,   // Work offset count
      "5001": 3001,   // Tool length offset start
      "5200": 3100,   // Tapping parameters
    },
    macroSupport: {
      available: true,
      variableRange: "#100-#149, #500-#531",
      systemVariables: ["#3001-#3003", "#4001-#4120", "#5001-#5006"],
      maxNesting: 4,
      supportsGoto: true,
      supportsWhile: false,
      argPassing: "classic",
    },
    cannedCycleVariations: {
      g73Available: false,
      g73Syntax: "none",
      g83PeckBehavior: "full_retract",
      g84RigidTap: false,
      g84Syntax: "none",
      g76ThreadSyntax: "multi_block",
      customCycles: {},
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "additive",
      g49CancelsBoth: true,
      multipleCompActive: false,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
    ],
    processingSpeed: 100,
    lookAheadBlocks: 1,
    axisLimit: 3,
  },

  "15M": {
    controllerModel: "15M",
    displayName: "Fanuc 15-M",
    manufacturerYears: "1988-1995",
    memoryType: "cmos",
    maxProgramSize: 128000,     // 128KB CMOS
    maxBlockNumber: 99999,
    maxToolOffsets: 64,
    maxWorkOffsets: 6,
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G17", "G18", "G19",
      "G20", "G21",
      "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G73",        // Added high-speed peck
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1", "G43.4", "G43.5", "G54.1", "G68", "G68.2",
      "G84.2", "G84.3", "G187",
    ],
    parameterMap: {
      "1220": 1005,
      "5001": 3001,
      "5114": 3050,   // G73 retract amount
      "5200": 3100,
    },
    macroSupport: {
      available: true,
      variableRange: "#100-#199, #500-#599",
      systemVariables: ["#3001-#3003", "#4001-#4120", "#5001-#5012"],
      maxNesting: 5,
      supportsGoto: true,
      supportsWhile: false,
      argPassing: "classic",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "legacy",      // Different Q-word interpretation
      g83PeckBehavior: "full_retract",
      g84RigidTap: false,
      g84Syntax: "none",
      g76ThreadSyntax: "multi_block",
      customCycles: {},
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "additive",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
    ],
    processingSpeed: 200,
    lookAheadBlocks: 3,
    axisLimit: 4,
  },

  "15MB": {
    controllerModel: "15MB",
    displayName: "Fanuc 15-MB",
    manufacturerYears: "1992-1998",
    memoryType: "cmos",
    maxProgramSize: 256000,
    maxBlockNumber: 99999,
    maxToolOffsets: 99,
    maxWorkOffsets: 6,
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G17", "G18", "G19",
      "G20", "G21",
      "G27", "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G52",        // Local coordinate system
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G61", "G64", // Exact stop / cutting mode
      "G73", "G74",
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G92",        // Work coordinate set
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1", "G43.4", "G43.5", "G54.1", "G68.2",
      "G84.2", "G84.3", "G187",
    ],
    parameterMap: {
      "1220": 1010,
      "5001": 3001,
      "5114": 3050,
      "5200": 3100,
    },
    macroSupport: {
      available: true,
      variableRange: "#100-#199, #500-#699",
      systemVariables: ["#3001-#3006", "#4001-#4120", "#5001-#5020"],
      maxNesting: 6,
      supportsGoto: true,
      supportsWhile: true,
      argPassing: "classic",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "standard",
      g83PeckBehavior: "full_retract",
      g84RigidTap: false,
      g84Syntax: "m29_required",
      g76ThreadSyntax: "single_block",
      customCycles: {},
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "additive",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 5, name: "Feed Mode", codes: ["G94", "G95"], defaultCode: "G94" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G74", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
      { group: 13, name: "Exact Stop", codes: ["G61", "G64"], defaultCode: "G64" },
    ],
    processingSpeed: 300,
    lookAheadBlocks: 5,
    axisLimit: 4,
  },

  "16": {
    controllerModel: "16",
    displayName: "Fanuc 16",
    manufacturerYears: "1990-1998",
    memoryType: "cmos",
    maxProgramSize: 256000,
    maxBlockNumber: 99999,
    maxToolOffsets: 99,
    maxWorkOffsets: 48,        // G54.1 P1-P48 supported
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G05",        // HSM mode (limited)
      "G17", "G18", "G19",
      "G20", "G21",
      "G27", "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G52",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G54.1",      // Extended work offsets
      "G61", "G64",
      "G68",        // Coordinate rotation
      "G73", "G74",
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G92",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1",      // AICC
      "G43.4", "G43.5",  // TCPM
      "G68.2",      // Tilted work plane
      "G84.2", "G84.3",
      "G187",
    ],
    parameterMap: {
      "1220": 1020,
      "5001": 5001,
      "5114": 5114,
      "5200": 5200,
    },
    macroSupport: {
      available: true,
      variableRange: "#100-#199, #500-#799",
      systemVariables: ["#3001-#3012", "#4001-#4120", "#5001-#5030"],
      maxNesting: 7,
      supportsGoto: true,
      supportsWhile: true,
      argPassing: "extended",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "standard",
      g83PeckBehavior: "both",
      g84RigidTap: false,
      g84Syntax: "m29_required",
      g76ThreadSyntax: "single_block",
      customCycles: {},
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "independent",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 5, name: "Feed Mode", codes: ["G94", "G95"], defaultCode: "G94" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G74", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
      { group: 13, name: "Exact Stop", codes: ["G61", "G64"], defaultCode: "G64" },
      { group: 16, name: "Coordinate Rotation", codes: ["G68", "G69"], defaultCode: "G69" },
    ],
    processingSpeed: 400,
    lookAheadBlocks: 10,
    axisLimit: 4,
  },

  "16M": {
    controllerModel: "16M",
    displayName: "Fanuc 16-M",
    manufacturerYears: "1992-2000",
    memoryType: "cmos",
    maxProgramSize: 512000,
    maxBlockNumber: 99999,
    maxToolOffsets: 200,
    maxWorkOffsets: 48,
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G05",
      "G17", "G18", "G19",
      "G20", "G21",
      "G27", "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G50",        // Scaling cancel
      "G51",        // Scaling
      "G52",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G54.1",
      "G61", "G62", "G63", "G64",
      "G68", "G69",
      "G73", "G74",
      "G76",        // Threading
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G92",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1", "G43.4", "G43.5", "G68.2", "G84.2", "G84.3", "G187",
    ],
    parameterMap: {
      "1220": 1020,
      "5001": 5001,
      "5114": 5114,
      "5200": 5200,
    },
    macroSupport: {
      available: true,
      variableRange: "#100-#199, #500-#999",
      systemVariables: ["#3001-#3012", "#4001-#4120", "#5001-#5050"],
      maxNesting: 8,
      supportsGoto: true,
      supportsWhile: true,
      argPassing: "extended",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "standard",
      g83PeckBehavior: "both",
      g84RigidTap: true,
      g84Syntax: "m29_required",
      g76ThreadSyntax: "single_block",
      customCycles: {},
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "independent",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 4, name: "Scaling", codes: ["G50", "G51"], defaultCode: "G50" },
      { group: 5, name: "Feed Mode", codes: ["G94", "G95"], defaultCode: "G94" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
      { group: 13, name: "Exact Stop", codes: ["G61", "G62", "G63", "G64"], defaultCode: "G64" },
      { group: 16, name: "Coordinate Rotation", codes: ["G68", "G69"], defaultCode: "G69" },
    ],
    processingSpeed: 500,
    lookAheadBlocks: 15,
    axisLimit: 5,
  },

  "16i": {
    controllerModel: "16i",
    displayName: "Fanuc 16i",
    manufacturerYears: "1998-2008",
    memoryType: "flash",
    maxProgramSize: 1024000,    // 1MB flash
    maxBlockNumber: 99999999,
    maxToolOffsets: 400,
    maxWorkOffsets: 48,
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G05", "G05 P10000",  // HSM mode
      "G17", "G18", "G19",
      "G20", "G21",
      "G27", "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G50", "G51",
      "G52",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G54.1",
      "G61", "G62", "G63", "G64",
      "G65",        // Macro call
      "G66", "G67", // Modal macro call
      "G68", "G69",
      "G73", "G74",
      "G76",
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G92",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1",      // No AICC (only basic HSM)
      "G43.4", "G43.5",  // No TCPM
      "G68.2",      // No tilted work plane
      "G84.2", "G84.3",  // No rigid tap variants (uses M29)
      "G187",       // No Haas-style smoothing
    ],
    parameterMap: {
      "1220": 1220,
      "5001": 5001,
      "5114": 5114,
      "5200": 5200,
      "8019": 6000,   // AI tolerance maps to older param
    },
    macroSupport: {
      available: true,
      variableRange: "#1-#33, #100-#199, #500-#999",
      systemVariables: ["#3001-#3026", "#4001-#4120", "#5001-#5080"],
      maxNesting: 9,
      supportsGoto: true,
      supportsWhile: true,
      argPassing: "extended",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "standard",
      g83PeckBehavior: "both",
      g84RigidTap: true,
      g84Syntax: "m29_required",
      g76ThreadSyntax: "single_block",
      customCycles: {
        "G72.1": "Figure rotation copy",
        "G72.2": "Figure linear copy",
      },
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "independent",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 4, name: "Scaling", codes: ["G50", "G51"], defaultCode: "G50" },
      { group: 5, name: "Feed Mode", codes: ["G94", "G95"], defaultCode: "G94" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
      { group: 12, name: "Macro Modal", codes: ["G66", "G67"], defaultCode: "G67" },
      { group: 13, name: "Exact Stop", codes: ["G61", "G62", "G63", "G64"], defaultCode: "G64" },
      { group: 16, name: "Coordinate Rotation", codes: ["G68", "G69"], defaultCode: "G69" },
    ],
    processingSpeed: 800,
    lookAheadBlocks: 20,
    axisLimit: 5,
  },

  "16iM": {
    controllerModel: "16iM",
    displayName: "Fanuc 16i-M",
    manufacturerYears: "1998-2010",
    memoryType: "flash",
    maxProgramSize: 2048000,    // 2MB flash
    maxBlockNumber: 99999999,
    maxToolOffsets: 400,
    maxWorkOffsets: 48,
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G05", "G05 P10000",
      "G17", "G18", "G19",
      "G20", "G21",
      "G27", "G28", "G29", "G30",
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G50", "G51",
      "G52",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G54.1",
      "G61", "G62", "G63", "G64",
      "G65",
      "G66", "G67",
      "G68", "G69",
      "G73", "G74",
      "G76",
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G92",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1", "G43.4", "G43.5", "G68.2", "G84.2", "G84.3", "G187",
    ],
    parameterMap: {
      "1220": 1220,
      "5001": 5001,
      "5114": 5114,
      "5200": 5200,
      "8019": 6000,
    },
    macroSupport: {
      available: true,
      variableRange: "#1-#33, #100-#199, #500-#999",
      systemVariables: ["#3001-#3026", "#4001-#4120", "#5001-#5080"],
      maxNesting: 9,
      supportsGoto: true,
      supportsWhile: true,
      argPassing: "extended",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "standard",
      g83PeckBehavior: "both",
      g84RigidTap: true,
      g84Syntax: "m29_required",
      g76ThreadSyntax: "single_block",
      customCycles: {
        "G72.1": "Figure rotation copy",
        "G72.2": "Figure linear copy",
      },
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "independent",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 4, name: "Scaling", codes: ["G50", "G51"], defaultCode: "G50" },
      { group: 5, name: "Feed Mode", codes: ["G94", "G95"], defaultCode: "G94" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
      { group: 12, name: "Macro Modal", codes: ["G66", "G67"], defaultCode: "G67" },
      { group: 13, name: "Exact Stop", codes: ["G61", "G62", "G63", "G64"], defaultCode: "G64" },
      { group: 16, name: "Coordinate Rotation", codes: ["G68", "G69"], defaultCode: "G69" },
    ],
    processingSpeed: 1000,
    lookAheadBlocks: 20,
    axisLimit: 5,
  },

  "16iMB": {
    controllerModel: "16iMB",
    displayName: "Fanuc 16i-MB",
    manufacturerYears: "2000-2012",
    memoryType: "flash",
    maxProgramSize: 4096000,    // 4MB flash
    maxBlockNumber: 99999999,
    maxToolOffsets: 999,
    maxWorkOffsets: 48,
    supportedGCodes: [
      "G00", "G01", "G02", "G03", "G04",
      "G05", "G05 P10000",
      "G17", "G18", "G19",
      "G20", "G21",
      "G27", "G28", "G29", "G30",
      "G31",        // Skip function
      "G40", "G41", "G42", "G43", "G44", "G49",
      "G50", "G51",
      "G52",
      "G54", "G55", "G56", "G57", "G58", "G59",
      "G54.1",
      "G61", "G62", "G63", "G64",
      "G65",
      "G66", "G67",
      "G68", "G69",
      "G73", "G74",
      "G76",
      "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
      "G90", "G91",
      "G92",
      "G94", "G95",
      "G98", "G99",
    ],
    unsupportedGCodes: [
      "G05.1", "G43.4", "G43.5", "G68.2", "G84.2", "G84.3", "G187",
    ],
    parameterMap: {
      "1220": 1220,
      "5001": 5001,
      "5114": 5114,
      "5200": 5200,
      "8019": 6000,
    },
    macroSupport: {
      available: true,
      variableRange: "#1-#33, #100-#199, #500-#999",
      systemVariables: ["#3001-#3026", "#4001-#4120", "#5001-#5100"],
      maxNesting: 9,
      supportsGoto: true,
      supportsWhile: true,
      argPassing: "extended",
    },
    cannedCycleVariations: {
      g73Available: true,
      g73Syntax: "standard",
      g83PeckBehavior: "both",
      g84RigidTap: true,
      g84Syntax: "m29_required",
      g76ThreadSyntax: "single_block",
      customCycles: {
        "G72.1": "Figure rotation copy",
        "G72.2": "Figure linear copy",
      },
    },
    toolLengthCompBehavior: {
      g43Standard: true,
      g44Available: true,
      g43HRequired: true,
      g43Zinteraction: "independent",
      g49CancelsBoth: true,
      multipleCompActive: true,
    },
    modalGroups: [
      { group: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], defaultCode: "G00" },
      { group: 3, name: "Plane", codes: ["G17", "G18", "G19"], defaultCode: "G17" },
      { group: 4, name: "Scaling", codes: ["G50", "G51"], defaultCode: "G50" },
      { group: 5, name: "Feed Mode", codes: ["G94", "G95"], defaultCode: "G94" },
      { group: 6, name: "Unit", codes: ["G20", "G21"], defaultCode: "G21" },
      { group: 7, name: "Cutter Comp", codes: ["G40", "G41", "G42"], defaultCode: "G40" },
      { group: 8, name: "Tool Length", codes: ["G43", "G44", "G49"], defaultCode: "G49" },
      { group: 9, name: "Canned Cycle", codes: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"], defaultCode: "G80" },
      { group: 12, name: "Macro Modal", codes: ["G66", "G67"], defaultCode: "G67" },
      { group: 13, name: "Exact Stop", codes: ["G61", "G62", "G63", "G64"], defaultCode: "G64" },
      { group: 16, name: "Coordinate Rotation", codes: ["G68", "G69"], defaultCode: "G69" },
    ],
    processingSpeed: 1000,
    lookAheadBlocks: 25,
    axisLimit: 5,
  },
};

// ─── G-Code Translation Rules ────────────────────────────────────────────────

interface TranslationRule {
  pattern: RegExp;
  modernCode: string;
  legacyCode: string | null;  // null = remove entirely
  handler?: (match: RegExpMatchArray, profile: FanucLegacyProfile) => string | null;
  warning?: string;
}

const TRANSLATION_RULES: TranslationRule[] = [
  // TCPM - Not supported on legacy controllers
  {
    pattern: /G43\.4\s*H(\d+)/gi,
    modernCode: "G43.4",
    legacyCode: null,
    handler: (match, _profile) => {
      // match[0] is full match, match[1] is the capture group
      const hNum = match[1] ?? match[0].match(/H(\d+)/i)?.[1] ?? "1";
      return `G43 H${hNum} (TCPM NOT SUPPORTED - MANUAL 5-AXIS COMP REQUIRED)`;
    },
    warning: "G43.4 TCPM not supported on Fanuc 15/16i. Program requires manual 5-axis tool compensation.",
  },
  {
    pattern: /G43\.5\s*H(\d+)/gi,
    modernCode: "G43.5",
    legacyCode: null,
    handler: (match, _profile) => {
      const hNum = match[1] ?? match[0].match(/H(\d+)/i)?.[1] ?? "1";
      return `G43 H${hNum} (TCPM TYPE 2 NOT SUPPORTED)`;
    },
    warning: "G43.5 TCPM Type 2 not supported. Manual tool vector control required.",
  },

  // AICC / Nano-smoothing - Not supported
  {
    pattern: /G05\.1\s*Q(\d+)/gi,
    modernCode: "G05.1",
    legacyCode: null,
    handler: (match, profile) => {
      const qNum = match[1] ?? match[0].match(/Q(\d+)/i)?.[1] ?? "1";
      if (profile.supportedGCodes.includes("G05")) {
        return `G05 P10000 (AICC NOT AVAILABLE - USING HSM MODE)`;
      }
      return `(G05.1 Q${qNum} REMOVED - NOT SUPPORTED)`;
    },
    warning: "G05.1 AICC/Nano-smoothing not available. Using basic HSM mode where supported.",
  },

  // Smoothing G187 (Haas-style) - Not supported
  {
    pattern: /G187\s*P(\d+)(?:\s*E([\d.]+))?/gi,
    modernCode: "G187",
    legacyCode: null,
    handler: (_match, _profile) => {
      return `(G187 SMOOTHING REMOVED - NOT SUPPORTED ON FANUC 15/16i)`;
    },
    warning: "G187 smoothing is Haas-specific and not supported on Fanuc 15/16i.",
  },

  // Extended work offsets - translate to basic if not supported
  {
    pattern: /G54\.1\s*P(\d+)/gi,
    modernCode: "G54.1",
    legacyCode: null,
    handler: (match, profile) => {
      // Extract P number from match
      const pMatch = match[0].match(/P(\d+)/i);
      const offsetNum = pMatch ? parseInt(pMatch[1], 10) : NaN;

      if (isNaN(offsetNum)) {
        return match[0]; // Keep as-is if can't parse
      }

      if (!profile.supportedGCodes.includes("G54.1")) {
        if (offsetNum <= 6) {
          // Map to G54-G59
          const gCode = 53 + offsetNum;
          return `G${gCode} (G54.1 P${offsetNum} CONVERTED)`;
        }
        return `(G54.1 P${offsetNum} - EXTENDED OFFSETS NOT SUPPORTED - MAX 6 OFFSETS)`;
      }
      if (offsetNum > profile.maxWorkOffsets) {
        return `(G54.1 P${offsetNum} - OFFSET ${offsetNum} EXCEEDS MAX ${profile.maxWorkOffsets})`;
      }
      return match[0]; // Keep as-is
    },
    warning: "Extended work offsets may not be supported. Limited to G54-G59 on older models.",
  },

  // Tilted work plane - Not supported
  {
    pattern: /G68\.2\s*[XYZ][\d.-]+\s*[IJK][\d.-]+/gi,
    modernCode: "G68.2",
    legacyCode: null,
    handler: () => {
      return `(G68.2 TILTED WORK PLANE - NOT SUPPORTED - USE ROTARY POSITIONING)`;
    },
    warning: "G68.2 tilted work plane not supported. Must use 3+2 positioning or manual rotary setup.",
  },

  // Rigid tapping variants
  {
    pattern: /G84\.[23]\s*/gi,
    modernCode: "G84.2",
    legacyCode: null,
    handler: (match, profile) => {
      if (profile.cannedCycleVariations.g84RigidTap) {
        return `M29 G84 (RIGID TAP - M29 REQUIRED ON 16i)`;
      }
      return `G84 (RIGID TAP NOT AVAILABLE - FLOATING TAP HOLDER REQUIRED)`;
    },
    warning: "G84.2/G84.3 rigid tap variants not available. Use M29 G84 or floating tap holder.",
  },

  // High-speed peck G73 translation for legacy syntax
  {
    pattern: /G73\s+.*Q([\d.]+)/gi,
    modernCode: "G73",
    legacyCode: "G73",
    handler: (match, profile) => {
      if (!profile.cannedCycleVariations.g73Available) {
        // Convert to G83 full peck
        return match[0].replace(/G73/, "G83") + " (G73 NOT AVAILABLE - USING G83)";
      }
      if (profile.cannedCycleVariations.g73Syntax === "legacy") {
        // Legacy syntax interprets Q differently
        return match[0] + " (CHECK Q-WORD INTERPRETATION ON LEGACY 15-M)";
      }
      return match[0];
    },
    warning: "G73 high-speed peck may not be available on all legacy models. Q-word behavior varies.",
  },

  // G76 threading syntax translation
  {
    pattern: /G76\s+P(\d{6})\s+Q(\d+)\s+R([\d.]+)/gi,
    modernCode: "G76",
    legacyCode: "G76",
    handler: (match, profile) => {
      if (profile.cannedCycleVariations.g76ThreadSyntax === "multi_block") {
        // Need to split into multiple blocks for legacy
        const p = match[1];
        const q = match[2];
        const r = match[3];
        return `(G76 MULTI-BLOCK FORMAT REQUIRED ON ${profile.controllerModel})\nG76 P0${p.slice(0, 2)} Q${q}\nG76 P0${p.slice(2, 4)} R${r}`;
      }
      return match[0];
    },
    warning: "G76 threading format varies between single and multi-block on legacy controllers.",
  },
];

// ─── Engine Implementation ───────────────────────────────────────────────────

class FanucLegacyControllerEngineImpl {
  /**
   * Get the profile for a specific legacy controller model.
   * @param model - Controller model identifier
   * @returns Legacy controller profile with all specifications
   */
  getProfile(model: LegacyControllerModel): FanucLegacyProfile {
    return LEGACY_PROFILES[model];
  }

  /**
   * List all supported legacy controller models.
   * @returns Array of model information
   */
  listModels(): Array<{ model: LegacyControllerModel; displayName: string; years: string }> {
    return Object.entries(LEGACY_PROFILES).map(([model, profile]) => ({
      model: model as LegacyControllerModel,
      displayName: profile.displayName,
      years: profile.manufacturerYears,
    }));
  }

  /**
   * Detect legacy controller model from program content or machine info.
   * @param programContent - G-code program content
   * @param machineInfo - Optional machine information
   * @returns Best-matching legacy controller model or null if not legacy
   */
  detectControllerModel(
    programContent: string,
    machineInfo?: { manufacturer?: string; model?: string; year?: number }
  ): LegacyControllerModel | null {
    // Check machine info first
    if (machineInfo?.year) {
      if (machineInfo.year < 1990) return "15";
      if (machineInfo.year < 1995) return "15M";
      if (machineInfo.year < 1998) return "16M";
      if (machineInfo.year < 2005) return "16i";
      if (machineInfo.year < 2012) return "16iMB";
    }

    // Analyze program content for hints
    const lines = programContent.toUpperCase();

    // Check for features that indicate modern controllers
    if (lines.includes("G43.4") || lines.includes("G43.5")) {
      return null; // TCPM = modern controller
    }
    if (lines.includes("G05.1")) {
      return null; // AICC = modern controller
    }
    if (lines.includes("G68.2")) {
      return null; // Tilted work plane = modern
    }

    // Check for legacy indicators
    if (lines.includes("M29") && lines.includes("G84")) {
      // M29 rigid tap style suggests 16i series
      return "16i";
    }
    if (!lines.includes("G54.1")) {
      // No extended offsets might indicate very old controller
      if (!lines.includes("G73")) {
        return "15"; // No G73 = likely original 15
      }
      return "15M";
    }

    // Default to 16i for undetected legacy
    return "16i";
  }

  /**
   * Translate a modern Fanuc program for a legacy controller.
   * @param program - Modern G-code program
   * @param targetModel - Target legacy controller model
   * @returns Translation result with warnings and translated code
   */
  translateProgram(program: string, targetModel: LegacyControllerModel): TranslationResult {
    const profile = LEGACY_PROFILES[targetModel];
    const lines = program.split("\n");
    const translatedLines: string[] = [];
    const warnings: TranslationWarning[] = [];
    const errors: TranslationError[] = [];
    const unsupportedFeatures: string[] = [];

    let removedCount = 0;
    let addedCount = 0;

    lines.forEach((line, index) => {
      let translatedLine = line;
      let lineModified = false;

      // Apply translation rules
      for (const rule of TRANSLATION_RULES) {
        const match = line.match(rule.pattern);
        if (match) {
          if (rule.handler) {
            const result = rule.handler(match, profile);
            if (result === null) {
              translatedLine = `(${line.trim()} - REMOVED)`;
              removedCount++;
            } else {
              translatedLine = line.replace(rule.pattern, result);
              if (result.includes("\n")) {
                addedCount += result.split("\n").length - 1;
              }
            }
            lineModified = true;
          } else if (rule.legacyCode === null) {
            translatedLine = `(${line.trim()} - NOT SUPPORTED ON ${targetModel})`;
            removedCount++;
            lineModified = true;
          }

          if (rule.warning && lineModified) {
            warnings.push({
              line: index + 1,
              originalCode: line.trim(),
              message: rule.warning,
              severity: "warning",
            });
            if (!unsupportedFeatures.includes(rule.modernCode)) {
              unsupportedFeatures.push(rule.modernCode);
            }
          }
        }
      }

      // Check for unsupported G-codes not covered by rules
      const gCodeMatches = Array.from(line.matchAll(/G(\d+(?:\.\d+)?)/gi));
      for (const gMatch of gCodeMatches) {
        const gCode = `G${gMatch[1]}`;
        if (profile.unsupportedGCodes.includes(gCode) && !lineModified) {
          warnings.push({
            line: index + 1,
            originalCode: line.trim(),
            message: `${gCode} is not supported on ${profile.displayName}`,
            severity: "critical",
          });
          if (!unsupportedFeatures.includes(gCode)) {
            unsupportedFeatures.push(gCode);
          }
        }
      }

      // Handle multi-line results
      if (translatedLine.includes("\n")) {
        translatedLines.push(...translatedLine.split("\n"));
      } else {
        translatedLines.push(translatedLine);
      }
    });

    return {
      success: errors.filter(e => e.fatal).length === 0,
      translatedCode: translatedLines,
      warnings,
      errors,
      unsupportedFeatures,
      statistics: {
        totalLines: lines.length,
        translatedLines: translatedLines.length,
        removedLines: removedCount,
        addedLines: addedCount,
        warningCount: warnings.length,
        errorCount: errors.length,
      },
    };
  }

  /**
   * Validate a program against legacy controller constraints.
   * @param program - G-code program to validate
   * @param model - Target legacy controller model
   * @returns Validation result with issues
   */
  validateProgram(program: string, model: LegacyControllerModel): LegacyValidationResult {
    const profile = LEGACY_PROFILES[model];
    const issues: ValidationIssue[] = [];
    const lines = program.split("\n");
    const programBytes = new TextEncoder().encode(program).length;

    // Check program size
    const fitsInMemory = programBytes <= profile.maxProgramSize;
    if (!fitsInMemory) {
      issues.push({
        line: 0,
        code: "",
        issue: `Program size ${(programBytes / 1024).toFixed(1)}KB exceeds ${(profile.maxProgramSize / 1024).toFixed(0)}KB limit for ${profile.memoryType} memory`,
        severity: "error",
        fix: "Split program into multiple sub-programs or optimize code",
      });
    }

    // Check line-by-line
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Check N-number
      const nMatch = trimmedLine.match(/^N(\d+)/i);
      if (nMatch) {
        const nNum = parseInt(nMatch[1], 10);
        if (nNum > profile.maxBlockNumber) {
          issues.push({
            line: lineNum,
            code: trimmedLine,
            issue: `Block number N${nNum} exceeds max ${profile.maxBlockNumber}`,
            severity: "error",
            fix: `Use block numbers up to N${profile.maxBlockNumber}`,
          });
        }
      }

      // Check for unsupported G-codes
      const gMatches = Array.from(trimmedLine.matchAll(/G(\d+(?:\.\d+)?)/gi));
      for (const gMatch of gMatches) {
        const gCode = `G${gMatch[1]}`;
        if (profile.unsupportedGCodes.includes(gCode)) {
          issues.push({
            line: lineNum,
            code: trimmedLine,
            issue: `${gCode} not supported on ${profile.displayName}`,
            severity: "error",
            fix: this.suggestAlternative(gCode, profile),
          });
        }
      }

      // Check macro variable usage
      const varMatches = Array.from(trimmedLine.matchAll(/#(\d+)/g));
      for (const varMatch of varMatches) {
        const varNum = parseInt(varMatch[1], 10);
        if (!this.isVariableInRange(varNum, profile)) {
          issues.push({
            line: lineNum,
            code: trimmedLine,
            issue: `Variable #${varNum} may not be available (range: ${profile.macroSupport.variableRange})`,
            severity: "warning",
          });
        }
      }

      // Check tool offset numbers
      const hMatch = trimmedLine.match(/H(\d+)/i);
      if (hMatch) {
        const hNum = parseInt(hMatch[1], 10);
        if (hNum > profile.maxToolOffsets) {
          issues.push({
            line: lineNum,
            code: trimmedLine,
            issue: `Tool offset H${hNum} exceeds max ${profile.maxToolOffsets}`,
            severity: "error",
            fix: `Use tool offsets H1-H${profile.maxToolOffsets}`,
          });
        }
      }

      // Check work offset numbers for G54.1
      const woMatch = trimmedLine.match(/G54\.1\s*P(\d+)/i);
      if (woMatch) {
        const woNum = parseInt(woMatch[1], 10);
        if (woNum > profile.maxWorkOffsets) {
          issues.push({
            line: lineNum,
            code: trimmedLine,
            issue: `Work offset P${woNum} exceeds max ${profile.maxWorkOffsets}`,
            severity: "error",
            fix: `Use work offsets P1-P${profile.maxWorkOffsets} or G54-G59`,
          });
        }
      }
    });

    return {
      valid: issues.filter(i => i.severity === "error").length === 0,
      issues,
      programSize: programBytes,
      estimatedMemoryUsage: programBytes * 1.1, // Account for overhead
      fitsInMemory,
    };
  }

  /**
   * Get canned cycle syntax for a specific legacy controller.
   * @param cycle - Cycle type (e.g., "drill", "peck", "tap")
   * @param model - Legacy controller model
   * @returns Cycle syntax information
   */
  getCannedCycleSyntax(
    cycle: "drill" | "peck" | "high_speed_peck" | "tap" | "rigid_tap" | "bore" | "thread",
    model: LegacyControllerModel
  ): { code: string; syntax: string; notes: string[] } {
    const profile = LEGACY_PROFILES[model];

    switch (cycle) {
      case "drill":
        return {
          code: "G81",
          syntax: "G81 X_ Y_ Z_ R_ F_",
          notes: ["Standard drill cycle supported on all models"],
        };

      case "peck":
        return {
          code: "G83",
          syntax: "G83 X_ Y_ Z_ R_ Q_ F_",
          notes: [
            `Peck behavior: ${profile.cannedCycleVariations.g83PeckBehavior}`,
            "Q = peck depth increment",
          ],
        };

      case "high_speed_peck":
        if (!profile.cannedCycleVariations.g73Available) {
          return {
            code: "G83",
            syntax: "G83 X_ Y_ Z_ R_ Q_ F_",
            notes: ["G73 not available - use G83 instead", "Full retract between pecks"],
          };
        }
        return {
          code: "G73",
          syntax: profile.cannedCycleVariations.g73Syntax === "legacy"
            ? "G73 X_ Y_ Z_ R_ Q_ K_ F_"
            : "G73 X_ Y_ Z_ R_ Q_ F_",
          notes: [
            profile.cannedCycleVariations.g73Syntax === "legacy"
              ? "K = number of pecks (legacy syntax)"
              : "Q = peck depth (standard syntax)",
            "Partial retract between pecks",
          ],
        };

      case "tap":
        return {
          code: "G84",
          syntax: "G84 X_ Y_ Z_ R_ F_",
          notes: [
            "Non-rigid tapping (floating tap holder required)",
            "F = pitch * RPM for tapping",
          ],
        };

      case "rigid_tap":
        if (!profile.cannedCycleVariations.g84RigidTap) {
          return {
            code: "G84",
            syntax: "G84 X_ Y_ Z_ R_ F_",
            notes: [
              "Rigid tapping NOT supported on this model",
              "Use floating tap holder or upgrade controller",
            ],
          };
        }
        return {
          code: "M29 G84",
          syntax: "M29 G84 X_ Y_ Z_ R_ F_",
          notes: [
            "M29 required before G84 for rigid mode",
            `Syntax: ${profile.cannedCycleVariations.g84Syntax}`,
            "G80 cancels both M29 and G84",
          ],
        };

      case "bore":
        return {
          code: "G85",
          syntax: "G85 X_ Y_ Z_ R_ F_",
          notes: ["Fine boring cycle", "Feed out at bottom"],
        };

      case "thread":
        if (profile.cannedCycleVariations.g76ThreadSyntax === "multi_block") {
          return {
            code: "G76",
            syntax: "G76 P__ Q__ R__\nG76 X__ Z__ P__ Q__ F__",
            notes: [
              "Two-block format required",
              "First block: P=number of finish passes, Q=min depth, R=pullout",
              "Second block: X=minor dia, Z=end, P=thread height, Q=first cut, F=lead",
            ],
          };
        }
        return {
          code: "G76",
          syntax: "G76 P______ Q__ R__ X__ Z__ P__ Q__ F__",
          notes: [
            "Single-block format",
            "P = 6-digit code (passes/chamfer/angle)",
          ],
        };

      default:
        return {
          code: "G80",
          syntax: "G80",
          notes: ["Cancel canned cycle"],
        };
    }
  }

  /**
   * Get parameter mapping from modern to legacy controller.
   * @param modernParam - Modern parameter number
   * @param model - Legacy controller model
   * @returns Legacy parameter number or null if no mapping exists
   */
  getParameterMapping(modernParam: string, model: LegacyControllerModel): number | null {
    const profile = LEGACY_PROFILES[model];
    return profile.parameterMap[modernParam] ?? null;
  }

  /**
   * Check if a G-code is supported on a legacy controller.
   * @param gCode - G-code to check (e.g., "G43.4")
   * @param model - Legacy controller model
   * @returns Support status with details
   */
  isGCodeSupported(
    gCode: string,
    model: LegacyControllerModel
  ): { supported: boolean; notes: string; alternative?: string } {
    const profile = LEGACY_PROFILES[model];
    const normalizedCode = gCode.toUpperCase();

    if (profile.supportedGCodes.includes(normalizedCode)) {
      return { supported: true, notes: `${normalizedCode} fully supported on ${profile.displayName}` };
    }

    if (profile.unsupportedGCodes.includes(normalizedCode)) {
      const alternative = this.suggestAlternative(normalizedCode, profile);
      return {
        supported: false,
        notes: `${normalizedCode} not supported on ${profile.displayName}`,
        alternative,
      };
    }

    return {
      supported: false,
      notes: `${normalizedCode} support unknown - verify in machine manual`,
    };
  }

  /**
   * Get macro variable compatibility information.
   * @param model - Legacy controller model
   * @returns Macro support details
   */
  getMacroCompatibility(model: LegacyControllerModel): MacroSupport & { tips: string[] } {
    const profile = LEGACY_PROFILES[model];
    const tips: string[] = [];

    if (!profile.macroSupport.supportsWhile) {
      tips.push("WHILE loops not supported - use GOTO with conditional");
    }
    if (profile.macroSupport.argPassing === "classic") {
      tips.push("Only A-Z arguments available in G65 calls");
    }
    if (profile.macroSupport.maxNesting < 8) {
      tips.push(`Macro nesting limited to ${profile.macroSupport.maxNesting} levels`);
    }

    return { ...profile.macroSupport, tips };
  }

  /**
   * Generate a compatibility report for migrating a program to legacy controller.
   * @param program - G-code program
   * @param sourceController - Source modern controller type
   * @param targetModel - Target legacy model
   * @returns Detailed compatibility report
   */
  generateCompatibilityReport(
    program: string,
    sourceController: string,
    targetModel: LegacyControllerModel
  ): {
    compatible: boolean;
    migrationEffort: "trivial" | "minor" | "moderate" | "major" | "not_feasible";
    issues: ValidationIssue[];
    unsupportedFeatures: string[];
    recommendations: string[];
  } {
    const validation = this.validateProgram(program, targetModel);
    const translation = this.translateProgram(program, targetModel);
    const profile = LEGACY_PROFILES[targetModel];

    const recommendations: string[] = [];

    // Assess migration effort
    let effort: "trivial" | "minor" | "moderate" | "major" | "not_feasible" = "trivial";

    if (translation.unsupportedFeatures.includes("G43.4") || translation.unsupportedFeatures.includes("G43.5")) {
      effort = "not_feasible";
      recommendations.push("Program uses 5-axis TCPM which is not available on legacy controllers. Manual reprogramming required.");
    } else if (translation.unsupportedFeatures.includes("G68.2")) {
      effort = "major";
      recommendations.push("Tilted work plane not supported. Convert to 3+2 positioning operations.");
    } else if (translation.unsupportedFeatures.includes("G05.1")) {
      effort = effort === "trivial" ? "minor" : effort;
      recommendations.push("AICC/Nano-smoothing removed. Surface finish may differ. Consider reducing feed rates.");
    }

    if (!validation.fitsInMemory) {
      effort = effort === "trivial" ? "moderate" : effort;
      recommendations.push(`Program exceeds ${profile.memoryType} memory. Split into sub-programs.`);
    }

    if (validation.issues.filter(i => i.severity === "error").length > 10) {
      effort = effort === "trivial" || effort === "minor" ? "moderate" : effort;
    }

    if (translation.warnings.length > 0) {
      recommendations.push(`${translation.warnings.length} code translations applied. Review translated program carefully.`);
    }

    return {
      compatible: validation.valid && translation.success,
      migrationEffort: effort,
      issues: validation.issues,
      unsupportedFeatures: translation.unsupportedFeatures,
      recommendations,
    };
  }

  /**
   * Integration with existing ControllerDialectEngine.
   * Returns a dialect-compatible representation of the legacy controller.
   */
  getDialectCompatibleProfile(model: LegacyControllerModel) {
    const profile = LEGACY_PROFILES[model];

    // Get base Fanuc dialect and modify for legacy
    const baseDialect = controllerDialectEngine.getDialect("fanuc_16i");

    return {
      ...baseDialect,
      id: `fanuc_${model.toLowerCase()}` as any,
      display_name: profile.displayName,
      features: {
        ...baseDialect.features,
        look_ahead_blocks: profile.lookAheadBlocks,
        block_processing_rate: profile.processingSpeed,
        nurbs_interpolation: false,
        max_simultaneous_axes: profile.axisLimit,
        work_offset_count: profile.maxWorkOffsets,
        macro_b_support: profile.macroSupport.available,
        program_memory_kb: Math.floor(profile.maxProgramSize / 1024),
        // Remove unsupported features
        hsc_mode: profile.supportedGCodes.includes("G05") ? { on: "G05 P10000", off: "G05 P0" } : undefined,
        nano_smooth: undefined,
        tcpc: undefined,
      },
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private suggestAlternative(gCode: string, profile: FanucLegacyProfile): string {
    const alternatives: Record<string, string> = {
      "G43.4": "Use G43 H_ with manual 5-axis compensation",
      "G43.5": "Use G43 H_ with manual tool vector setup",
      "G05.1": profile.supportedGCodes.includes("G05") ? "Use G05 P10000 for basic HSM" : "Not available - reduce feed rates",
      "G54.1": "Use G54-G59 (6 offsets max)",
      "G68.2": "Use 3+2 positioning with G68 X Y R",
      "G84.2": profile.cannedCycleVariations.g84RigidTap ? "Use M29 G84" : "Use floating tap holder with G84",
      "G84.3": profile.cannedCycleVariations.g84RigidTap ? "Use M29 G84" : "Use floating tap holder with G84",
      "G187": "Not available - adjust feed rates manually",
      "G73": profile.cannedCycleVariations.g73Available ? "Supported" : "Use G83 full peck cycle",
    };

    return alternatives[gCode] ?? "No direct alternative available";
  }

  private isVariableInRange(varNum: number, profile: FanucLegacyProfile): boolean {
    const rangeStr = profile.macroSupport.variableRange;
    const ranges = rangeStr.split(",").map(r => r.trim());

    for (const range of ranges) {
      const match = range.match(/#?(\d+)-#?(\d+)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        if (varNum >= min && varNum <= max) {
          return true;
        }
      }
    }

    return false;
  }
}

// ─── Export Singleton ────────────────────────────────────────────────────────

export const fanucLegacyControllerEngine = new FanucLegacyControllerEngineImpl();
export { FanucLegacyControllerEngineImpl };
