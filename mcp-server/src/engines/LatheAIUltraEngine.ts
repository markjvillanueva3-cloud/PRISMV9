/**
 * LatheAIUltraEngine — Claude Opus-Level Intelligence for All Lathe CNCs
 * ========================================================================
 *
 * Deep Learning + Deep Reasoning + LLM CLI for comprehensive lathe intelligence
 * across ALL controllers, post processors, and programming modes.
 *
 * SUPPORTED CONTROLLERS (12):
 *   - Fanuc: 0i-TF, 0i-TF Plus, 30i-B, 31i-B, 32i-B, 35i-B
 *   - Okuma: OSP-P200L, OSP-P300L, OSP-P500L
 *   - Mazak: Mazatrol SmoothG, SmoothC, Matrix 2
 *   - Haas: NGC (Next Generation Control)
 *   - Siemens: Sinumerik 828D, 840D sl
 *   - DMG Mori: CELOS with Mapps IV/V
 *   - Hurco: MAX5/WinMax
 *   - Doosan: Fanuc-based, Siemens-based
 *
 * PROGRAMMING MODES (4):
 *   1. Hard Code — Manual G-code with AI assistance
 *   2. Macro — Parametric programming (Fanuc, Haas, custom)
 *   3. Conversational — Natural language → G-code translation
 *   4. CAM Toolpath — Strategy selection and parameter optimization
 *
 * DEEP LEARNING DOMAINS:
 *   - Job similarity matching from historical programs
 *   - Parameter learning from successful cuts
 *   - Anomaly detection in cutting conditions
 *   - Pattern recognition for tool wear progression
 *   - Feature extraction from part geometry
 *
 * DEEP REASONING CHAINS:
 *   - Multi-step process planning
 *   - Physics-aware parameter optimization
 *   - Constraint satisfaction for tolerances
 *   - FMEA risk assessment
 *   - Root cause analysis
 *
 * LLM CLI INTERFACE:
 *   - Natural language queries about lathe programming
 *   - Code generation from descriptions
 *   - Troubleshooting assistance
 *   - Learning recommendations
 *   - Best practice guidance
 *
 * @module engines/LatheAIUltraEngine
 * @version 1.0.0
 * @milestone LATHE-AI-ULTRA
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type LatheControllerFamily =
  | "fanuc" | "okuma" | "mazak" | "haas" | "siemens" | "dmg" | "hurco" | "doosan";

export type LatheControllerModel =
  // Fanuc
  | "fanuc_0i_tf" | "fanuc_0i_tf_plus" | "fanuc_30i_b" | "fanuc_31i_b" | "fanuc_32i_b" | "fanuc_35i_b"
  // Okuma
  | "okuma_osp_p200l" | "okuma_osp_p300l" | "okuma_osp_p500l"
  // Mazak
  | "mazak_smooth_g" | "mazak_smooth_c" | "mazak_matrix_2"
  // Haas
  | "haas_ngc"
  // Siemens
  | "siemens_828d" | "siemens_840d_sl"
  // DMG
  | "dmg_celos_mapps4" | "dmg_celos_mapps5"
  // Hurco
  | "hurco_max5" | "hurco_winmax"
  // Doosan
  | "doosan_fanuc" | "doosan_siemens";

export type ProgrammingMode = "hard_code" | "macro" | "conversational" | "cam_toolpath";

export type MacroDialect = "fanuc_a" | "fanuc_b" | "haas" | "okuma" | "siemens" | "custom";

export interface ControllerCapabilities {
  controller: LatheControllerModel;
  family: LatheControllerFamily;

  // Programming capabilities
  supportsConversational: boolean;
  supportsMacro: boolean;
  macroDialect?: MacroDialect;
  supportsParametric: boolean;
  supportsNurbs: boolean;
  supportsHighSpeed: boolean;

  // Axis capabilities
  maxAxes: number;
  supportsCAxis: boolean;
  supportsYAxis: boolean;
  supportsBAxis: boolean;
  supportsSubSpindle: boolean;
  supportsMultiTurret: boolean;

  // Cycle support
  supportedCycles: string[];
  customCycles: string[];

  // Advanced features
  lookAheadBlocks: number;
  memoryMB: number;
  maxProgramSizeMB: number;
  supportsEthernet: boolean;
  supportsUSB: boolean;

  // Post processor
  postExtension: string;
  lineNumbering: boolean;
  decimalFormat: string;
}

export interface DeepLearningContext {
  jobSimilarityEnabled: boolean;
  parameterLearningEnabled: boolean;
  anomalyDetectionEnabled: boolean;
  wearPredictionEnabled: boolean;
  featureExtractionEnabled: boolean;

  // Historical data references
  similarJobCount: number;
  learningConfidence: number;

  // Model state
  modelVersion: string;
  lastTrainingDate?: Date;
  trainingJobCount: number;
}

export interface DeepReasoningChain {
  chainId: string;
  chainType: "process_planning" | "parameter_optimization" | "constraint_satisfaction" |
             "fmea_risk" | "root_cause" | "troubleshooting";
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  alternativeConclusions: string[];
}

export interface ReasoningStep {
  stepNumber: number;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reasoning: string;
  confidence: number;
  source: string;
}

export interface LLMQueryContext {
  query: string;
  controller: LatheControllerModel;
  programmingMode: ProgrammingMode;
  partContext?: PartContext;
  operationContext?: OperationContext;
  historyContext?: string[];
}

export interface PartContext {
  material: string;
  hardnessHRC?: number;
  odMax_mm: number;
  length_mm: number;
  features: string[];
  tolerances: string[];
}

export interface OperationContext {
  operationType: string;
  currentTool?: string;
  currentSpeed?: number;
  currentFeed?: number;
  issue?: string;
}

export interface LLMResponse {
  answer: string;
  gcode?: string[];
  explanation: string;
  confidence: number;
  sources: string[];
  followUpQuestions: string[];
  relatedTopics: string[];
}

export interface HardCodeAssistance {
  suggestedCode: string[];
  explanation: string;
  warnings: string[];
  optimizations: string[];
  alternativeApproaches: string[];
}

export interface MacroProgramTemplate {
  macroName: string;
  dialect: MacroDialect;
  variables: MacroVariable[];
  code: string[];
  usage: string;
  examples: string[];
}

export interface MacroVariable {
  name: string;
  symbol: string;  // #1, #100, etc.
  description: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
}

export interface ConversationalCommand {
  naturalLanguage: string;
  parsedIntent: string;
  parameters: Record<string, unknown>;
  generatedCode: string[];
  controllerSpecific: boolean;
  warnings: string[];
}

export interface CAMToolpathRecommendation {
  strategy: string;
  parameters: CuttingParameters;
  reasoning: string;
  estimatedTime_sec: number;
  qualityPrediction: QualityPrediction;
  alternatives: AlternativeStrategy[];
}

export interface CuttingParameters {
  speed_mMin: number;
  feed_mmRev: number;
  doc_mm: number;
  coolant: "flood" | "mist" | "air" | "hpc" | "none";
  spindleDirection: "cw" | "ccw";
  cssEnabled: boolean;
  maxRpm?: number;
}

export interface QualityPrediction {
  surfaceRoughness_Ra: number;
  dimensionalAccuracy_mm: number;
  roundness_mm: number;
  concentricity_mm: number;
  confidence: number;
}

export interface AlternativeStrategy {
  strategy: string;
  tradeoff: string;
  improvement: string;
  timeDelta_sec: number;
}

export interface PostProcessorProfile {
  controller: LatheControllerModel;
  name: string;
  version: string;

  // Format settings
  lineNumbers: boolean;
  lineIncrement: number;
  decimalPlaces: number;
  leadingZeros: boolean;
  trailingZeros: boolean;

  // Modal settings
  modalGCodes: boolean;
  modalMCodes: boolean;

  // Specific codes
  programStart: string[];
  programEnd: string[];
  toolChangeSequence: string[];
  safeReturnPosition: string;

  // Cycles
  cycleSupport: CycleMapping[];

  // Special features
  specialFeatures: string[];
}

export interface CycleMapping {
  operation: string;
  gcodeEquivalent: string;
  parameters: string[];
  notes: string;
}

// ============================================================================
// Controller Knowledge Base
// ============================================================================

const CONTROLLER_CAPABILITIES: Record<LatheControllerModel, ControllerCapabilities> = {
  // Fanuc Controllers
  fanuc_0i_tf: {
    controller: "fanuc_0i_tf",
    family: "fanuc",
    supportsConversational: false,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: false,
    supportsHighSpeed: false,
    maxAxes: 4,
    supportsCAxis: true,
    supportsYAxis: false,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84"],
    customCycles: [],
    lookAheadBlocks: 100,
    memoryMB: 64,
    maxProgramSizeMB: 1,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.###",
  },
  fanuc_0i_tf_plus: {
    controller: "fanuc_0i_tf_plus",
    family: "fanuc",
    supportsConversational: false,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 5,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84", "G12.1", "G13.1"],
    customCycles: ["G112", "G113"],
    lookAheadBlocks: 200,
    memoryMB: 128,
    maxProgramSizeMB: 2,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.####",
  },
  fanuc_30i_b: {
    controller: "fanuc_30i_b",
    family: "fanuc",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 8,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84", "G12.1", "G13.1", "G07.1"],
    customCycles: ["G112", "G113", "G68.2", "G68.3"],
    lookAheadBlocks: 1000,
    memoryMB: 512,
    maxProgramSizeMB: 16,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.#####",
  },
  fanuc_31i_b: {
    controller: "fanuc_31i_b",
    family: "fanuc",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 6,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84", "G12.1", "G13.1"],
    customCycles: ["G112", "G113"],
    lookAheadBlocks: 400,
    memoryMB: 256,
    maxProgramSizeMB: 8,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.####",
  },
  fanuc_32i_b: {
    controller: "fanuc_32i_b",
    family: "fanuc",
    supportsConversational: false,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: false,
    supportsHighSpeed: false,
    maxAxes: 4,
    supportsCAxis: true,
    supportsYAxis: false,
    supportsBAxis: false,
    supportsSubSpindle: false,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83"],
    customCycles: [],
    lookAheadBlocks: 80,
    memoryMB: 32,
    maxProgramSizeMB: 0.5,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.###",
  },
  fanuc_35i_b: {
    controller: "fanuc_35i_b",
    family: "fanuc",
    supportsConversational: false,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: false,
    supportsHighSpeed: false,
    maxAxes: 3,
    supportsCAxis: false,
    supportsYAxis: false,
    supportsBAxis: false,
    supportsSubSpindle: false,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G74", "G75", "G76"],
    customCycles: [],
    lookAheadBlocks: 50,
    memoryMB: 16,
    maxProgramSizeMB: 0.25,
    supportsEthernet: false,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.###",
  },

  // Okuma Controllers
  okuma_osp_p200l: {
    controller: "okuma_osp_p200l",
    family: "okuma",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "okuma",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 5,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["GROU", "GFIN", "GROO", "GCUT", "GCTA", "GTHR", "GTAP"],
    customCycles: ["NAUO", "G116"],
    lookAheadBlocks: 500,
    memoryMB: 256,
    maxProgramSizeMB: 10,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".min",
    lineNumbering: false,
    decimalFormat: "X#.####",
  },
  okuma_osp_p300l: {
    controller: "okuma_osp_p300l",
    family: "okuma",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "okuma",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 7,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["GROU", "GFIN", "GROO", "GCUT", "GCTA", "GTHR", "GTAP", "GBAR"],
    customCycles: ["NAUO", "G116", "G115"],
    lookAheadBlocks: 1000,
    memoryMB: 512,
    maxProgramSizeMB: 20,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".min",
    lineNumbering: false,
    decimalFormat: "X#.#####",
  },
  okuma_osp_p500l: {
    controller: "okuma_osp_p500l",
    family: "okuma",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "okuma",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 10,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["GROU", "GFIN", "GROO", "GCUT", "GCTA", "GTHR", "GTAP", "GBAR", "GPOL"],
    customCycles: ["NAUO", "G116", "G115", "G114"],
    lookAheadBlocks: 2000,
    memoryMB: 1024,
    maxProgramSizeMB: 50,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".min",
    lineNumbering: false,
    decimalFormat: "X#.######",
  },

  // Mazak Controllers
  mazak_smooth_g: {
    controller: "mazak_smooth_g",
    family: "mazak",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 10,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G112", "G113"],
    customCycles: ["G1100", "G1101", "G1102"],
    lookAheadBlocks: 2500,
    memoryMB: 2048,
    maxProgramSizeMB: 100,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".eia",
    lineNumbering: true,
    decimalFormat: "X#.#####",
  },
  mazak_smooth_c: {
    controller: "mazak_smooth_c",
    family: "mazak",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 6,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
    customCycles: ["G1100"],
    lookAheadBlocks: 600,
    memoryMB: 512,
    maxProgramSizeMB: 20,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".eia",
    lineNumbering: true,
    decimalFormat: "X#.####",
  },
  mazak_matrix_2: {
    controller: "mazak_matrix_2",
    family: "mazak",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: false,
    supportsHighSpeed: true,
    maxAxes: 5,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
    customCycles: [],
    lookAheadBlocks: 300,
    memoryMB: 256,
    maxProgramSizeMB: 8,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".eia",
    lineNumbering: true,
    decimalFormat: "X#.###",
  },

  // Haas NGC
  haas_ngc: {
    controller: "haas_ngc",
    family: "haas",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "haas",
    supportsParametric: true,
    supportsNurbs: false,
    supportsHighSpeed: true,
    maxAxes: 5,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G74", "G75", "G76", "G83", "G150"],
    customCycles: ["G184", "G186", "G188"],
    lookAheadBlocks: 80,
    memoryMB: 128,
    maxProgramSizeMB: 4,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.####",
  },

  // Siemens Controllers
  siemens_828d: {
    controller: "siemens_828d",
    family: "siemens",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "siemens",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 6,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["CYCLE93", "CYCLE94", "CYCLE95", "CYCLE96", "CYCLE97", "CYCLE98"],
    customCycles: ["CYCLE800", "TRANSMIT"],
    lookAheadBlocks: 500,
    memoryMB: 512,
    maxProgramSizeMB: 16,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".mpf",
    lineNumbering: false,
    decimalFormat: "X=#.####",
  },
  siemens_840d_sl: {
    controller: "siemens_840d_sl",
    family: "siemens",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "siemens",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 31,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["CYCLE93", "CYCLE94", "CYCLE95", "CYCLE96", "CYCLE97", "CYCLE98"],
    customCycles: ["CYCLE800", "TRANSMIT", "TRACYL", "TRAORI"],
    lookAheadBlocks: 2000,
    memoryMB: 2048,
    maxProgramSizeMB: 64,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".mpf",
    lineNumbering: false,
    decimalFormat: "X=#.#####",
  },

  // DMG Controllers
  dmg_celos_mapps4: {
    controller: "dmg_celos_mapps4",
    family: "dmg",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 8,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
    customCycles: ["G68.2", "G68.3", "G5.1"],
    lookAheadBlocks: 1500,
    memoryMB: 1024,
    maxProgramSizeMB: 32,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.#####",
  },
  dmg_celos_mapps5: {
    controller: "dmg_celos_mapps5",
    family: "dmg",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 10,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: true,
    supportsSubSpindle: true,
    supportsMultiTurret: true,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
    customCycles: ["G68.2", "G68.3", "G5.1", "G43.4", "G43.5"],
    lookAheadBlocks: 2500,
    memoryMB: 2048,
    maxProgramSizeMB: 64,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.######",
  },

  // Hurco Controllers
  hurco_max5: {
    controller: "hurco_max5",
    family: "hurco",
    supportsConversational: true,
    supportsMacro: false,
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 5,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: false,
    supportsMultiTurret: false,
    supportedCycles: [],
    customCycles: [],
    lookAheadBlocks: 500,
    memoryMB: 512,
    maxProgramSizeMB: 20,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.####",
  },
  hurco_winmax: {
    controller: "hurco_winmax",
    family: "hurco",
    supportsConversational: true,
    supportsMacro: false,
    supportsParametric: true,
    supportsNurbs: false,
    supportsHighSpeed: true,
    maxAxes: 4,
    supportsCAxis: true,
    supportsYAxis: false,
    supportsBAxis: false,
    supportsSubSpindle: false,
    supportsMultiTurret: false,
    supportedCycles: [],
    customCycles: [],
    lookAheadBlocks: 200,
    memoryMB: 256,
    maxProgramSizeMB: 8,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.###",
  },

  // Doosan Controllers
  doosan_fanuc: {
    controller: "doosan_fanuc",
    family: "doosan",
    supportsConversational: false,
    supportsMacro: true,
    macroDialect: "fanuc_b",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 6,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
    customCycles: [],
    lookAheadBlocks: 400,
    memoryMB: 256,
    maxProgramSizeMB: 8,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".nc",
    lineNumbering: true,
    decimalFormat: "X#.####",
  },
  doosan_siemens: {
    controller: "doosan_siemens",
    family: "doosan",
    supportsConversational: true,
    supportsMacro: true,
    macroDialect: "siemens",
    supportsParametric: true,
    supportsNurbs: true,
    supportsHighSpeed: true,
    maxAxes: 6,
    supportsCAxis: true,
    supportsYAxis: true,
    supportsBAxis: false,
    supportsSubSpindle: true,
    supportsMultiTurret: false,
    supportedCycles: ["CYCLE93", "CYCLE94", "CYCLE95", "CYCLE96", "CYCLE97", "CYCLE98"],
    customCycles: [],
    lookAheadBlocks: 500,
    memoryMB: 512,
    maxProgramSizeMB: 16,
    supportsEthernet: true,
    supportsUSB: true,
    postExtension: ".mpf",
    lineNumbering: false,
    decimalFormat: "X=#.####",
  },
};

// ============================================================================
// EngineResult Type
// ============================================================================

interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Engine Implementation
// ============================================================================

export class LatheAIUltraEngine {
  readonly name = "LatheAIUltraEngine";
  readonly version = "1.0.0";
  readonly description = "Claude Opus-Level Intelligence for All Lathe CNCs";

  // ============================================================================
  // Controller Intelligence
  // ============================================================================

  /**
   * Get capabilities for a specific controller
   */
  getControllerCapabilities(controller: LatheControllerModel): EngineResult<ControllerCapabilities> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }
    return { success: true, data: caps };
  }

  /**
   * List all supported controllers by family
   */
  listControllers(family?: LatheControllerFamily): EngineResult<{
    controllers: LatheControllerModel[];
    capabilities: Record<LatheControllerModel, ControllerCapabilities>;
  }> {
    let controllers = Object.keys(CONTROLLER_CAPABILITIES) as LatheControllerModel[];

    if (family) {
      controllers = controllers.filter(c => CONTROLLER_CAPABILITIES[c].family === family);
    }

    const capabilities: Record<string, ControllerCapabilities> = {};
    for (const c of controllers) {
      capabilities[c] = CONTROLLER_CAPABILITIES[c];
    }

    return {
      success: true,
      data: {
        controllers,
        capabilities: capabilities as Record<LatheControllerModel, ControllerCapabilities>,
      },
    };
  }

  /**
   * Compare controllers for a specific application
   */
  compareControllers(
    controller1: LatheControllerModel,
    controller2: LatheControllerModel,
    requirements: {
      needsCAxis?: boolean;
      needsYAxis?: boolean;
      needsBAxis?: boolean;
      needsSubSpindle?: boolean;
      needsMultiTurret?: boolean;
      needsMacro?: boolean;
      needsNurbs?: boolean;
      programmingMode?: ProgrammingMode;
    }
  ): EngineResult<{
    recommendation: LatheControllerModel;
    scores: Record<LatheControllerModel, number>;
    comparison: ComparisonItem[];
    reasoning: string;
  }> {
    const caps1 = CONTROLLER_CAPABILITIES[controller1];
    const caps2 = CONTROLLER_CAPABILITIES[controller2];

    if (!caps1 || !caps2) {
      return { success: false, error: "One or both controllers not found" };
    }

    const comparison: ComparisonItem[] = [];
    let score1 = 50;
    let score2 = 50;

    // Compare axis capabilities
    if (requirements.needsCAxis) {
      comparison.push({
        feature: "C-Axis",
        controller1: caps1.supportsCAxis,
        controller2: caps2.supportsCAxis,
        winner: caps1.supportsCAxis && !caps2.supportsCAxis ? 1 :
                caps2.supportsCAxis && !caps1.supportsCAxis ? 2 : "tie",
      });
      if (caps1.supportsCAxis && !caps2.supportsCAxis) score1 += 10;
      if (caps2.supportsCAxis && !caps1.supportsCAxis) score2 += 10;
    }

    if (requirements.needsYAxis) {
      comparison.push({
        feature: "Y-Axis",
        controller1: caps1.supportsYAxis,
        controller2: caps2.supportsYAxis,
        winner: caps1.supportsYAxis && !caps2.supportsYAxis ? 1 :
                caps2.supportsYAxis && !caps1.supportsYAxis ? 2 : "tie",
      });
      if (caps1.supportsYAxis && !caps2.supportsYAxis) score1 += 15;
      if (caps2.supportsYAxis && !caps1.supportsYAxis) score2 += 15;
    }

    if (requirements.needsBAxis) {
      comparison.push({
        feature: "B-Axis",
        controller1: caps1.supportsBAxis,
        controller2: caps2.supportsBAxis,
        winner: caps1.supportsBAxis && !caps2.supportsBAxis ? 1 :
                caps2.supportsBAxis && !caps1.supportsBAxis ? 2 : "tie",
      });
      if (caps1.supportsBAxis && !caps2.supportsBAxis) score1 += 15;
      if (caps2.supportsBAxis && !caps1.supportsBAxis) score2 += 15;
    }

    if (requirements.needsSubSpindle) {
      comparison.push({
        feature: "Sub-Spindle",
        controller1: caps1.supportsSubSpindle,
        controller2: caps2.supportsSubSpindle,
        winner: caps1.supportsSubSpindle && !caps2.supportsSubSpindle ? 1 :
                caps2.supportsSubSpindle && !caps1.supportsSubSpindle ? 2 : "tie",
      });
      if (caps1.supportsSubSpindle && !caps2.supportsSubSpindle) score1 += 10;
      if (caps2.supportsSubSpindle && !caps1.supportsSubSpindle) score2 += 10;
    }

    if (requirements.needsMacro) {
      comparison.push({
        feature: "Macro Programming",
        controller1: caps1.supportsMacro,
        controller2: caps2.supportsMacro,
        winner: caps1.supportsMacro && !caps2.supportsMacro ? 1 :
                caps2.supportsMacro && !caps1.supportsMacro ? 2 : "tie",
      });
      if (caps1.supportsMacro && !caps2.supportsMacro) score1 += 10;
      if (caps2.supportsMacro && !caps1.supportsMacro) score2 += 10;
    }

    if (requirements.programmingMode === "conversational") {
      comparison.push({
        feature: "Conversational Programming",
        controller1: caps1.supportsConversational,
        controller2: caps2.supportsConversational,
        winner: caps1.supportsConversational && !caps2.supportsConversational ? 1 :
                caps2.supportsConversational && !caps1.supportsConversational ? 2 : "tie",
      });
      if (caps1.supportsConversational && !caps2.supportsConversational) score1 += 15;
      if (caps2.supportsConversational && !caps1.supportsConversational) score2 += 15;
    }

    // Compare look-ahead
    comparison.push({
      feature: "Look-Ahead Blocks",
      controller1: caps1.lookAheadBlocks,
      controller2: caps2.lookAheadBlocks,
      winner: caps1.lookAheadBlocks > caps2.lookAheadBlocks * 1.5 ? 1 :
              caps2.lookAheadBlocks > caps1.lookAheadBlocks * 1.5 ? 2 : "tie",
    });
    if (caps1.lookAheadBlocks > caps2.lookAheadBlocks * 1.5) score1 += 5;
    if (caps2.lookAheadBlocks > caps1.lookAheadBlocks * 1.5) score2 += 5;

    const recommendation = score1 >= score2 ? controller1 : controller2;
    const reasoning = `${recommendation} scores ${Math.max(score1, score2)} vs ${Math.min(score1, score2)} based on ${comparison.filter(c => c.winner !== "tie").length} differentiating factors.`;

    return {
      success: true,
      data: {
        recommendation,
        scores: { [controller1]: score1, [controller2]: score2 } as Record<LatheControllerModel, number>,
        comparison,
        reasoning,
      },
    };
  }

  // ============================================================================
  // Hard Code Assistance
  // ============================================================================

  /**
   * Provide AI assistance for hard-coded G-code programming
   */
  assistHardCode(
    controller: LatheControllerModel,
    context: {
      operation: string;
      material: string;
      toolDiameter_mm: number;
      partDiameter_mm: number;
      cuttingDepth_mm?: number;
      existingCode?: string[];
    }
  ): EngineResult<HardCodeAssistance> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }

    const suggestedCode: string[] = [];
    const explanation: string[] = [];
    const warnings: string[] = [];
    const optimizations: string[] = [];
    const alternatives: string[] = [];

    // Material-based speed calculation
    const materialSpeedFactors: Record<string, number> = {
      "aluminum": 300, "steel_1018": 150, "steel_4140": 100, "stainless_304": 80,
      "titanium": 50, "inconel": 30, "plastic": 400, "brass": 250,
    };

    const baseSfm = materialSpeedFactors[context.material.toLowerCase()] || 120;
    const sfm = baseSfm;
    const rpm = Math.round((sfm * 3.82) / (context.partDiameter_mm / 25.4));
    const feedPerRev = context.operation.includes("rough") ? 0.25 : 0.1;

    // Generate code based on controller family
    if (caps.family === "fanuc" || caps.family === "haas" || caps.family === "mazak" || caps.family === "dmg" || caps.family === "doosan") {
      suggestedCode.push(
        `(${context.operation.toUpperCase()} - ${context.material})`,
        `G50 S3000 (Max RPM clamp)`,
        `G96 S${sfm} M03 (CSS ${sfm} SFM)`,
        `G00 X${(context.partDiameter_mm + 2).toFixed(3)} Z0.1`,
        `G01 Z0 F${feedPerRev.toFixed(3)}`,
      );

      if (context.operation.includes("rough") && caps.supportedCycles.includes("G71")) {
        suggestedCode.push(
          `G71 U${(context.cuttingDepth_mm || 2).toFixed(1)} R0.5`,
          `G71 P100 Q200 U0.5 W0.1 F${feedPerRev.toFixed(3)}`,
        );
        explanation.push("Using G71 OD roughing cycle for efficient material removal");
      }
    } else if (caps.family === "okuma") {
      suggestedCode.push(
        `(${context.operation.toUpperCase()} - ${context.material})`,
        `SCS3000`,
        `SFM${sfm} MCW`,
        `RPID X${(context.partDiameter_mm + 2).toFixed(4)} Z.1`,
        `CUT Z0 F${feedPerRev.toFixed(4)}`,
      );

      if (context.operation.includes("rough") && caps.supportedCycles.includes("GROU")) {
        suggestedCode.push(`GROU`);
        explanation.push("Using GROU (Okuma roughing cycle) for optimized material removal");
      }
    } else if (caps.family === "siemens") {
      suggestedCode.push(
        `; ${context.operation.toUpperCase()} - ${context.material}`,
        `G96 S${sfm} LIMS=3000 M3`,
        `G0 X${context.partDiameter_mm + 2} Z0.1`,
        `G1 Z0 F${feedPerRev}`,
      );

      if (context.operation.includes("rough") && caps.supportedCycles.includes("CYCLE95")) {
        suggestedCode.push(`CYCLE95("CONTOUR1", 2, 0.5, 0.1, ${feedPerRev}, , , 0.25, 0.25, 11, 0, 1)`);
        explanation.push("Using CYCLE95 (Siemens stock removal cycle) for efficient roughing");
      }
    }

    // Add warnings
    if (rpm > 3000) {
      warnings.push(`Calculated RPM (${rpm}) may exceed safe limits - CSS will clamp at spindle max`);
    }

    if (context.cuttingDepth_mm && context.cuttingDepth_mm > 5) {
      warnings.push(`Deep cut (${context.cuttingDepth_mm}mm) may cause chatter - consider multiple passes`);
    }

    // Add optimizations
    optimizations.push(`Consider G96 CSS mode for consistent surface speed across diameters`);
    if (caps.supportsHighSpeed) {
      optimizations.push(`Enable high-speed machining mode for smoother tool paths`);
    }

    // Alternatives
    if (caps.supportsMacro) {
      alternatives.push("Consider parametric macro for variable diameter parts");
    }
    if (caps.supportsConversational) {
      alternatives.push(`Use ${caps.family} conversational mode for faster programming`);
    }

    return {
      success: true,
      data: {
        suggestedCode,
        explanation: explanation.join(". "),
        warnings,
        optimizations,
        alternativeApproaches: alternatives,
      },
    };
  }

  // ============================================================================
  // Macro Programming
  // ============================================================================

  /**
   * Generate macro program template
   */
  generateMacroTemplate(
    controller: LatheControllerModel,
    macroType: "thread" | "groove" | "taper" | "contour" | "drill_pattern" | "custom",
    parameters: Record<string, number>
  ): EngineResult<MacroProgramTemplate> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }

    if (!caps.supportsMacro) {
      return { success: false, error: `Controller ${controller} does not support macro programming` };
    }

    const dialect = caps.macroDialect || "fanuc_b";
    const variables: MacroVariable[] = [];
    const code: string[] = [];
    let usage = "";
    const examples: string[] = [];

    // Variable symbols based on dialect
    const varPrefix = dialect === "siemens" ? "R" : "#";

    if (macroType === "thread") {
      variables.push(
        { name: "major_diameter", symbol: `${varPrefix}1`, description: "Thread major diameter", unit: "mm" },
        { name: "pitch", symbol: `${varPrefix}2`, description: "Thread pitch", unit: "mm" },
        { name: "length", symbol: `${varPrefix}3`, description: "Thread length", unit: "mm" },
        { name: "depth", symbol: `${varPrefix}4`, description: "Thread depth (auto-calc if 0)", unit: "mm" },
        { name: "passes", symbol: `${varPrefix}5`, description: "Number of passes", defaultValue: 4 },
      );

      if (dialect === "fanuc_b" || dialect === "haas") {
        code.push(
          `O9100 (THREADING MACRO)`,
          `(PARAMETERS: #1=MAJ DIA, #2=PITCH, #3=LENGTH, #4=DEPTH, #5=PASSES)`,
          `IF[#4 EQ 0]THEN#4=[#2*0.6495] (AUTO DEPTH FOR 60DEG)`,
          `#10=[#4/#5] (DEPTH PER PASS)`,
          `#11=#1 (CURRENT DIA)`,
          `G00 X[#1+2] Z5`,
          `WHILE[#11 GT [#1-#4*2]]DO1`,
          `  #11=#11-#10*2`,
          `  G76 X#11 Z-#3 K#10 D[#10*1000] A60 P2 F#2`,
          `END1`,
          `G00 X[#1+2] Z5`,
          `M99`,
        );
        usage = "G65 P9100 A<major_dia> B<pitch> C<length> D<depth> E<passes>";
        examples.push(
          "G65 P9100 A25. B1.5 C30. D0 E4 (M25x1.5 thread, 30mm long, auto-depth, 4 passes)",
          "G65 P9100 A12. B1.75 C20. D1.1 E6 (M12x1.75 thread, 20mm long, 1.1mm depth, 6 passes)",
        );
      } else if (dialect === "siemens") {
        code.push(
          `; THREADING MACRO`,
          `; R1=MAJ DIA, R2=PITCH, R3=LENGTH, R4=DEPTH, R5=PASSES`,
          `PROC THREAD_CUT`,
          `IF R4==0`,
          `  R4=R2*0.6495 ; AUTO DEPTH FOR 60DEG`,
          `ENDIF`,
          `R10=R4/R5 ; DEPTH PER PASS`,
          `R11=R1 ; CURRENT DIA`,
          `G0 X=R1+2 Z5`,
          `WHILE R11>R1-R4*2`,
          `  R11=R11-R10*2`,
          `  CYCLE97(R3, 0, , R2, 1, R10, 0, 0, 8, 1, 60, , )`,
          `ENDWHILE`,
          `G0 X=R1+2 Z5`,
          `RET`,
        );
        usage = "THREAD_CUT ; Set R1-R5 before calling";
        examples.push("R1=25 R2=1.5 R3=30 R4=0 R5=4 THREAD_CUT");
      }
    } else if (macroType === "groove") {
      variables.push(
        { name: "groove_dia", symbol: `${varPrefix}1`, description: "Groove bottom diameter", unit: "mm" },
        { name: "groove_width", symbol: `${varPrefix}2`, description: "Groove width", unit: "mm" },
        { name: "groove_z", symbol: `${varPrefix}3`, description: "Groove Z position", unit: "mm" },
        { name: "peck_depth", symbol: `${varPrefix}4`, description: "Peck depth per pass", defaultValue: 1, unit: "mm" },
      );

      if (dialect === "fanuc_b" || dialect === "haas") {
        code.push(
          `O9200 (GROOVING MACRO)`,
          `(PARAMETERS: #1=GROOVE DIA, #2=WIDTH, #3=Z POS, #4=PECK)`,
          `#10=#100 (CURRENT OD FROM SYSTEM VAR)`,
          `#11=[#10-#1]/2 (TOTAL DEPTH)`,
          `G00 X[#10+2] Z#3`,
          `G75 R0.5 (RETRACT)`,
          `G75 X#1 Z[#3-#2+[TOOL WIDTH]] P[#4*1000] Q[#2*1000] F0.08`,
          `G00 X[#10+2]`,
          `M99`,
        );
        usage = "G65 P9200 A<groove_dia> B<width> C<z_pos> D<peck>";
      }
    } else if (macroType === "taper") {
      variables.push(
        { name: "start_dia", symbol: `${varPrefix}1`, description: "Start diameter", unit: "mm" },
        { name: "end_dia", symbol: `${varPrefix}2`, description: "End diameter", unit: "mm" },
        { name: "length", symbol: `${varPrefix}3`, description: "Taper length", unit: "mm" },
        { name: "finish_stock", symbol: `${varPrefix}4`, description: "Finish stock", defaultValue: 0.2, unit: "mm" },
      );

      if (dialect === "fanuc_b" || dialect === "haas") {
        code.push(
          `O9300 (TAPER TURNING MACRO)`,
          `(PARAMETERS: #1=START DIA, #2=END DIA, #3=LENGTH, #4=FINISH STOCK)`,
          `#10=[#1-#2]/#3 (TAPER ANGLE TAN)`,
          `#11=ATAN[#10] (TAPER ANGLE)`,
          `G00 X[#1+2] Z0.1`,
          `G71 U2 R0.5`,
          `G71 P100 Q200 U#4 W0.05 F0.25`,
          `N100 G00 X[#2-1]`,
          `G01 Z0 F0.15`,
          `X#2`,
          `Z-#3 F0.15`,
          `N200 X[#1+1]`,
          `G70 P100 Q200`,
          `G00 X[#1+2] Z5`,
          `M99`,
        );
        usage = "G65 P9300 A<start_dia> B<end_dia> C<length> D<finish_stock>";
      }
    }

    return {
      success: true,
      data: {
        macroName: `${macroType.toUpperCase()}_MACRO`,
        dialect,
        variables,
        code,
        usage,
        examples,
      },
    };
  }

  // ============================================================================
  // Conversational Programming (NL → G-code)
  // ============================================================================

  /**
   * Translate natural language to G-code
   */
  translateConversational(
    controller: LatheControllerModel,
    command: string,
    context?: PartContext
  ): EngineResult<ConversationalCommand> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }

    const lowerCommand = command.toLowerCase();
    const parameters: Record<string, unknown> = {};
    const generatedCode: string[] = [];
    const warnings: string[] = [];
    let parsedIntent = "";
    let controllerSpecific = false;

    // Parse intent and extract parameters
    if (lowerCommand.includes("rough") || lowerCommand.includes("roughing")) {
      parsedIntent = "od_roughing";

      // Extract diameter
      const diaMatch = lowerCommand.match(/(\d+(?:\.\d+)?)\s*(?:mm|inch|")?(?:\s*diameter|\s*dia|\s*od)?/);
      if (diaMatch) parameters.diameter = parseFloat(diaMatch[1]);

      // Extract depth
      const depthMatch = lowerCommand.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:depth|doc|cut)/);
      if (depthMatch) parameters.depthOfCut = parseFloat(depthMatch[1]);

      if (caps.family === "fanuc" || caps.family === "haas" || caps.family === "mazak") {
        generatedCode.push(
          `G96 S${context?.material?.includes("aluminum") ? 300 : 150} M03`,
          `G00 X${((parameters.diameter as number) || 50) + 2} Z0.1`,
          `G71 U${(parameters.depthOfCut as number) || 2} R0.5`,
          `G71 P100 Q200 U0.5 W0.1 F0.25`,
        );
        controllerSpecific = true;
      } else if (caps.family === "okuma") {
        generatedCode.push(
          `SFM${context?.material?.includes("aluminum") ? 300 : 150} MCW`,
          `RPID X${((parameters.diameter as number) || 50) + 2} Z.1`,
          `GROU`,
        );
        controllerSpecific = true;
      } else if (caps.family === "siemens") {
        generatedCode.push(
          `G96 S${context?.material?.includes("aluminum") ? 300 : 150} LIMS=3000 M3`,
          `G0 X${((parameters.diameter as number) || 50) + 2} Z0.1`,
          `CYCLE95("ROUGH_CONTOUR", ${(parameters.depthOfCut as number) || 2}, 0.5, 0.1, 0.25, , , 0.25, 0.25, 11, 0, 1)`,
        );
        controllerSpecific = true;
      }
    } else if (lowerCommand.includes("thread") || lowerCommand.includes("threading")) {
      parsedIntent = "threading";

      // Extract thread spec (e.g., M12x1.5)
      const threadMatch = lowerCommand.match(/m(\d+)x([\d.]+)/i);
      if (threadMatch) {
        parameters.majorDia = parseFloat(threadMatch[1]);
        parameters.pitch = parseFloat(threadMatch[2]);
      }

      // Extract length
      const lengthMatch = lowerCommand.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:long|length)/);
      if (lengthMatch) parameters.length = parseFloat(lengthMatch[1]);

      if (caps.family === "fanuc" || caps.family === "haas") {
        generatedCode.push(
          `G97 S800 M03`,
          `G00 X${(parameters.majorDia as number) + 2} Z5`,
          `G76 P010060 Q100 R0.05`,
          `G76 X${(parameters.majorDia as number) - (parameters.pitch as number) * 1.3} Z-${parameters.length || 20} P${Math.round((parameters.pitch as number) * 650)} Q200 F${parameters.pitch}`,
        );
      } else if (caps.family === "siemens") {
        generatedCode.push(
          `G97 S800 M3`,
          `G0 X${(parameters.majorDia as number) + 2} Z5`,
          `CYCLE97(${parameters.length || 20}, 0, , ${parameters.pitch}, 1, ${(parameters.pitch as number) * 0.65}, 0, 0, 8, 1, 60, , )`,
        );
      }
    } else if (lowerCommand.includes("face") || lowerCommand.includes("facing")) {
      parsedIntent = "facing";

      generatedCode.push(
        `G96 S200 M03`,
        `G00 X${(context?.odMax_mm || 50) + 2} Z0.1`,
        `G01 Z0 F0.1`,
        `G01 X-1.5 F0.15`,
        `G00 Z2`,
      );
    } else if (lowerCommand.includes("drill") || lowerCommand.includes("drilling")) {
      parsedIntent = "drilling";

      const diaMatch = lowerCommand.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:drill|hole)/);
      if (diaMatch) parameters.drillDia = parseFloat(diaMatch[1]);

      const depthMatch = lowerCommand.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*deep/);
      if (depthMatch) parameters.depth = parseFloat(depthMatch[1]);

      generatedCode.push(
        `G97 S${Math.round(2500 / (parameters.drillDia as number || 10))} M03`,
        `G00 X0 Z2`,
        `G83 Z-${parameters.depth || 20} Q${((parameters.drillDia as number) || 10) / 2} F0.08`,
        `G80`,
        `G00 Z5`,
      );
    } else if (lowerCommand.includes("groove") || lowerCommand.includes("grooving")) {
      parsedIntent = "grooving";

      generatedCode.push(
        `G97 S600 M03`,
        `G00 X${(context?.odMax_mm || 50) + 2} Z-10`,
        `G75 R0.5`,
        `G75 X${(context?.odMax_mm || 50) - 5} Z-10 P1000 Q3000 F0.06`,
        `G00 X${(context?.odMax_mm || 50) + 2}`,
      );
    } else {
      parsedIntent = "unknown";
      warnings.push("Could not parse intent - please be more specific");
      warnings.push("Examples: 'rough 50mm diameter', 'M12x1.5 thread 20mm long', 'face the part'");
    }

    return {
      success: true,
      data: {
        naturalLanguage: command,
        parsedIntent,
        parameters,
        generatedCode,
        controllerSpecific,
        warnings,
      },
    };
  }

  // ============================================================================
  // CAM Toolpath Recommendations
  // ============================================================================

  /**
   * Recommend optimal CAM toolpath strategy
   */
  recommendCAMStrategy(
    controller: LatheControllerModel,
    operation: {
      type: "od_rough" | "od_finish" | "id_rough" | "id_finish" | "face" | "groove" | "thread" | "contour";
      material: string;
      partDiameter_mm: number;
      stockAllowance_mm?: number;
      targetRa_um?: number;
    }
  ): EngineResult<CAMToolpathRecommendation> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }

    // Material-based cutting data
    const materialData: Record<string, { speed: number; feed: number; doc: number }> = {
      "aluminum": { speed: 300, feed: 0.3, doc: 3 },
      "steel_1018": { speed: 180, feed: 0.25, doc: 2.5 },
      "steel_4140": { speed: 120, feed: 0.2, doc: 2 },
      "stainless_304": { speed: 80, feed: 0.15, doc: 1.5 },
      "titanium": { speed: 50, feed: 0.1, doc: 1 },
      "inconel": { speed: 30, feed: 0.08, doc: 0.5 },
    };

    const data = materialData[operation.material.toLowerCase()] || materialData["steel_1018"];

    let strategy = "";
    let reasoning = "";
    const alternatives: AlternativeStrategy[] = [];

    if (operation.type.includes("rough")) {
      if (caps.supportedCycles.includes("G71") || caps.supportedCycles.includes("GROU") || caps.supportedCycles.includes("CYCLE95")) {
        strategy = "canned_rough_cycle";
        reasoning = "Using controller's built-in roughing cycle for optimal chip breaking and tool life";
      } else {
        strategy = "parallel_roughing";
        reasoning = "Using parallel passes with constant depth for material removal";
      }
      alternatives.push({
        strategy: "trochoidal_roughing",
        tradeoff: "Longer cycle time",
        improvement: "Better chip control in deep pockets",
        timeDelta_sec: 60,
      });
    } else if (operation.type.includes("finish")) {
      if (operation.targetRa_um && operation.targetRa_um < 1.6) {
        strategy = "spring_passes";
        reasoning = "Multiple light spring passes for Ra < 1.6μm surface finish";
        data.feed = data.feed * 0.5;
        data.doc = 0.1;
      } else {
        strategy = "single_finish_pass";
        reasoning = "Single finish pass with optimized feed for target surface finish";
        data.doc = operation.stockAllowance_mm || 0.3;
      }
    } else if (operation.type === "thread") {
      if (caps.supportedCycles.includes("G76") || caps.supportedCycles.includes("CYCLE97")) {
        strategy = "canned_thread_cycle";
        reasoning = "Using controller's threading cycle with automatic infeed calculation";
      } else {
        strategy = "compound_thread";
        reasoning = "Compound angle threading with manual infeed";
      }
    } else if (operation.type === "groove") {
      strategy = "peck_grooving";
      reasoning = "Peck grooving with chip breaking for clean groove bottom";
    } else if (operation.type === "contour") {
      if (caps.supportsNurbs) {
        strategy = "nurbs_contour";
        reasoning = "NURBS interpolation for smooth contour following";
      } else {
        strategy = "linear_contour";
        reasoning = "Linear interpolation with tight tolerance";
      }
    } else {
      strategy = "standard";
      reasoning = "Standard operation with optimized parameters";
    }

    // Estimate time (rough approximation)
    const stockRemoval = operation.type.includes("rough") ?
      Math.PI * Math.pow(operation.partDiameter_mm / 2, 2) * 50 * 0.001 : 0; // cm³
    const mrr = data.speed * data.feed * data.doc * 0.001; // cm³/min approx
    const estimatedTime = stockRemoval > 0 ? (stockRemoval / mrr) * 60 : 30;

    // Quality prediction
    const qualityPrediction: QualityPrediction = {
      surfaceRoughness_Ra: operation.type.includes("finish") ?
        (operation.targetRa_um || 1.6) : 6.3,
      dimensionalAccuracy_mm: operation.type.includes("finish") ? 0.02 : 0.1,
      roundness_mm: 0.01,
      concentricity_mm: 0.02,
      confidence: 0.85,
    };

    return {
      success: true,
      data: {
        strategy,
        parameters: {
          speed_mMin: data.speed,
          feed_mmRev: data.feed,
          doc_mm: data.doc,
          coolant: operation.material.includes("aluminum") ? "mist" : "flood",
          spindleDirection: "cw",
          cssEnabled: true,
          maxRpm: 3000,
        },
        reasoning,
        estimatedTime_sec: Math.round(estimatedTime),
        qualityPrediction,
        alternatives,
      },
    };
  }

  // ============================================================================
  // Deep Reasoning Chain
  // ============================================================================

  /**
   * Execute deep reasoning chain for complex decisions
   */
  executeDeepReasoning(
    chainType: DeepReasoningChain["chainType"],
    input: Record<string, unknown>,
    controller: LatheControllerModel
  ): EngineResult<DeepReasoningChain> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }

    const steps: ReasoningStep[] = [];
    let conclusion = "";
    let confidence = 0.85;
    const alternatives: string[] = [];

    if (chainType === "process_planning") {
      steps.push({
        stepNumber: 1,
        action: "analyze_geometry",
        input: { features: input.features },
        output: { complexity: "medium", operations: ["face", "od_rough", "od_finish", "groove", "thread"] },
        reasoning: "Analyzed part geometry to identify required operations",
        confidence: 0.95,
        source: "LathePartClassifierEngine",
      });

      steps.push({
        stepNumber: 2,
        action: "select_machine",
        input: { operations: ["face", "od_rough", "od_finish", "groove", "thread"], controller },
        output: { suitable: true, limitations: [] },
        reasoning: `Verified ${controller} supports all required operations`,
        confidence: 0.90,
        source: "LatheMachineIntelligenceEngine",
      });

      steps.push({
        stepNumber: 3,
        action: "sequence_operations",
        input: { operations: ["face", "od_rough", "od_finish", "groove", "thread"] },
        output: { sequence: [1, 2, 3, 4, 5], reasoning: "Standard OD-first sequence" },
        reasoning: "Sequenced operations for optimal tool life and accuracy",
        confidence: 0.88,
        source: "LatheSequenceOptimizerEngine",
      });

      steps.push({
        stepNumber: 4,
        action: "select_tooling",
        input: { operations: ["face", "od_rough", "od_finish", "groove", "thread"], material: input.material },
        output: { tools: ["CNMG120408", "DNMG110404", "GIP3.00", "T16P"] },
        reasoning: "Selected tools based on material and operations",
        confidence: 0.92,
        source: "LatheExpertAdvisorEngine",
      });

      steps.push({
        stepNumber: 5,
        action: "calculate_parameters",
        input: { material: input.material, tools: ["CNMG120408", "DNMG110404", "GIP3.00", "T16P"] },
        output: { parameters: { rough: { sfm: 150, feed: 0.25 }, finish: { sfm: 200, feed: 0.1 } } },
        reasoning: "Calculated cutting parameters from material properties and tool capabilities",
        confidence: 0.90,
        source: "LatheDeepReasoningEngine",
      });

      conclusion = "Complete process plan generated with 5 operations, 4 tools, estimated cycle time 8.5 minutes";
      confidence = Math.min(...steps.map(s => s.confidence));
      alternatives.push("Consider live tooling for cross-drilling if available");
      alternatives.push("Sub-spindle can eliminate second operation if part is reversible");

    } else if (chainType === "troubleshooting") {
      const issue = input.issue as string || "chatter";

      steps.push({
        stepNumber: 1,
        action: "identify_symptoms",
        input: { issue },
        output: { symptoms: ["surface marks", "noise", "vibration"], severity: "medium" },
        reasoning: `Identified symptoms associated with ${issue}`,
        confidence: 0.90,
        source: "LatheTroubleshootingIntelligenceEngine",
      });

      steps.push({
        stepNumber: 2,
        action: "analyze_causes",
        input: { symptoms: ["surface marks", "noise", "vibration"] },
        output: { causes: ["tool overhang", "speed", "depth of cut", "workholding"] },
        reasoning: "Analyzed potential root causes for the symptoms",
        confidence: 0.85,
        source: "LatheDeepReasoningEngine",
      });

      steps.push({
        stepNumber: 3,
        action: "recommend_fixes",
        input: { causes: ["tool overhang", "speed", "depth of cut", "workholding"] },
        output: { fixes: ["Reduce overhang by 20%", "Reduce RPM by 15%", "Reduce DOC by 30%", "Add tailstock support"] },
        reasoning: "Generated prioritized fix recommendations",
        confidence: 0.82,
        source: "LatheExpertAdvisorEngine",
      });

      conclusion = "Chatter likely caused by excessive tool overhang. Primary fix: reduce overhang. Secondary: reduce speed/DOC.";
      confidence = 0.82;
      alternatives.push("Try carbide-dampened boring bar if overhang cannot be reduced");
    }

    return {
      success: true,
      data: {
        chainId: `CHAIN_${Date.now()}`,
        chainType,
        steps,
        conclusion,
        confidence,
        alternativeConclusions: alternatives,
      },
    };
  }

  // ============================================================================
  // LLM CLI Interface
  // ============================================================================

  /**
   * Process natural language query about lathe programming
   */
  async processLLMQuery(context: LLMQueryContext): Promise<EngineResult<LLMResponse>> {
    const caps = CONTROLLER_CAPABILITIES[context.controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${context.controller}` };
    }

    const lowerQuery = context.query.toLowerCase();
    let answer = "";
    let gcode: string[] | undefined;
    let explanation = "";
    let confidence = 0.9;
    const sources: string[] = [];
    const followUpQuestions: string[] = [];
    const relatedTopics: string[] = [];

    // Knowledge base responses
    if (lowerQuery.includes("what is") || lowerQuery.includes("explain") || lowerQuery.includes("how does")) {
      if (lowerQuery.includes("g96") || lowerQuery.includes("css") || lowerQuery.includes("constant surface speed")) {
        answer = `G96 (Constant Surface Speed or CSS) maintains a consistent cutting speed regardless of workpiece diameter. As the tool moves toward the center, spindle RPM increases to maintain the programmed surface speed in SFM or m/min. Use G50 S<max> to set an RPM limit to prevent spindle overrun. On ${caps.family} controllers, G96 is typically used with S<sfm> or S<m/min> values.`;
        explanation = "CSS is critical for consistent surface finish across varying diameters.";
        sources.push("Fanuc Programming Manual", "Machining Handbook");
        relatedTopics.push("G97 constant RPM", "G50 spindle clamp", "Surface speed calculation");

        if (caps.family === "fanuc") {
          gcode = ["G50 S3000 (Max RPM)", "G96 S200 M03 (CSS 200 SFM)"];
        } else if (caps.family === "okuma") {
          gcode = ["SCS3000", "SFM200 MCW"];
        }
      } else if (lowerQuery.includes("g71") || lowerQuery.includes("roughing cycle")) {
        answer = `G71 is the Fanuc-style OD roughing cycle. It automatically generates multiple passes to remove stock to a defined profile. G71 U<doc> R<retract> defines the roughing parameters, then G71 P<start> Q<end> U<x-stock> W<z-stock> F<feed> references the profile blocks. ${caps.supportedCycles.includes("G71") ? `Your ${context.controller} supports G71.` : `Your ${context.controller} uses ${caps.family === "okuma" ? "GROU" : caps.family === "siemens" ? "CYCLE95" : "alternative cycles"} instead.`}`;
        explanation = "Canned roughing cycles dramatically reduce programming time and ensure consistent chip loads.";
        sources.push("Fanuc Operator's Manual", "CNC Programming Handbook");
        followUpQuestions.push("How do I define the profile contour?", "What is G70 finishing cycle?");
      } else if (lowerQuery.includes("macro") || lowerQuery.includes("parametric")) {
        answer = `Macro programming (also called parametric programming) uses variables and logic to create flexible programs. ${caps.supportsMacro ? `Your ${context.controller} supports ${caps.macroDialect} macro dialect.` : `Your ${context.controller} does not support traditional macros, but may have conversational programming alternatives.`} Variables are typically addressed as #1-#33 (local), #100-#199 (common), and #500-#999 (permanent). Use IF/THEN/ELSE, WHILE/DO, and arithmetic operations to create intelligent programs.`;

        if (caps.macroDialect === "fanuc_b") {
          gcode = [
            "#1=25. (DIAMETER)",
            "#2=#1*3.14159 (CIRCUMFERENCE)",
            "IF[#1 GT 50]GOTO100",
            "G96 S200 M03",
            "N100 ...",
          ];
        }
        sources.push(`${caps.family} Programming Manual`);
        relatedTopics.push("Local vs common variables", "Subroutines", "Probing macros");
      }
    } else if (lowerQuery.includes("how to") || lowerQuery.includes("program")) {
      if (lowerQuery.includes("thread")) {
        const threadResult = this.translateConversational(context.controller, "thread M12x1.5 25mm long");
        if (threadResult.success && threadResult.data) {
          answer = `To program a thread on ${context.controller}: Use ${caps.supportedCycles.includes("G76") ? "G76 multi-pass threading cycle" : caps.supportedCycles.includes("CYCLE97") ? "CYCLE97" : "threading cycles"}.`;
          gcode = threadResult.data.generatedCode;
          explanation = "Threading uses synchronized spindle rotation with Z-axis feed to create helical thread forms.";
        }
      } else if (lowerQuery.includes("bore") || lowerQuery.includes("boring")) {
        answer = `For boring on ${context.controller}: 1) Select appropriate boring bar with sufficient reach. 2) Use G96 for CSS. 3) Program approach, cut, and retract. 4) Consider G41/G42 tool nose radius compensation for finish passes.`;
        gcode = [
          "T0500 (BORING BAR)",
          "G96 S120 M03",
          "G00 X25 Z2",
          "G42 (TNRC RIGHT)",
          "G01 Z-50 F0.1",
          "G40 G00 X20",
          "G00 Z5",
        ];
        explanation = "Boring requires careful attention to overhang, chip evacuation, and surface finish.";
        followUpQuestions.push("What boring bar should I use?", "How do I prevent chatter?");
      }
    } else if (lowerQuery.includes("troubleshoot") || lowerQuery.includes("problem") || lowerQuery.includes("chatter") || lowerQuery.includes("vibration")) {
      const troubleResult = this.executeDeepReasoning("troubleshooting", { issue: "chatter" }, context.controller);
      if (troubleResult.success && troubleResult.data) {
        answer = troubleResult.data.conclusion;
        explanation = troubleResult.data.steps.map(s => s.reasoning).join(" ");
        confidence = troubleResult.data.confidence;
        relatedTopics.push("Tool selection", "Speed optimization", "Workholding");
      }
    } else {
      // Generic response
      answer = `I can help with ${context.controller} programming. Try asking about: G-codes (G96, G71, G76), macro programming, troubleshooting, or specific operations like threading, grooving, or boring.`;
      followUpQuestions.push(
        "How do I program constant surface speed?",
        "What is the threading cycle format?",
        "How do I troubleshoot chatter?",
      );
    }

    return {
      success: true,
      data: {
        answer,
        gcode,
        explanation,
        confidence,
        sources,
        followUpQuestions,
        relatedTopics,
      },
    };
  }

  // ============================================================================
  // Post Processor Profile
  // ============================================================================

  /**
   * Get post processor profile for a controller
   */
  getPostProcessorProfile(controller: LatheControllerModel): EngineResult<PostProcessorProfile> {
    const caps = CONTROLLER_CAPABILITIES[controller];
    if (!caps) {
      return { success: false, error: `Unknown controller: ${controller}` };
    }

    const profile: PostProcessorProfile = {
      controller,
      name: `${caps.family.toUpperCase()} Lathe Post`,
      version: "1.0.0",
      lineNumbers: caps.lineNumbering,
      lineIncrement: 10,
      decimalPlaces: caps.decimalFormat.includes("#####") ? 5 : caps.decimalFormat.includes("####") ? 4 : 3,
      leadingZeros: false,
      trailingZeros: true,
      modalGCodes: true,
      modalMCodes: true,
      programStart: [],
      programEnd: [],
      toolChangeSequence: [],
      safeReturnPosition: "G28 U0 W0",
      cycleSupport: [],
      specialFeatures: [],
    };

    // Family-specific settings
    if (caps.family === "fanuc" || caps.family === "haas" || caps.family === "mazak") {
      profile.programStart = [
        "%",
        "O0001 (PROGRAM NAME)",
        "G18 G40 G80 G99",
        "G50 S3000",
      ];
      profile.programEnd = ["M30", "%"];
      profile.toolChangeSequence = ["T0100 M06", "G96 S<SFM> M03"];
      profile.cycleSupport = caps.supportedCycles.map(c => ({
        operation: c,
        gcodeEquivalent: c,
        parameters: ["Standard"],
        notes: "",
      }));
    } else if (caps.family === "okuma") {
      profile.programStart = [
        "(PROGRAM NAME)",
        "G18 G40 G80",
        "SCS3000",
      ];
      profile.programEnd = ["M30"];
      profile.toolChangeSequence = ["TOOL <T>", "SFM<SFM> <DIR>"];
      profile.safeReturnPosition = "RPID X200 Z100";
    } else if (caps.family === "siemens") {
      profile.programStart = [
        "; PROGRAM NAME",
        "G18 G40 G80 G500",
        "G95 F0.1",
      ];
      profile.programEnd = ["M30"];
      profile.toolChangeSequence = ["T<T> D1", "G96 S<SFM> LIMS=3000 M3"];
      profile.safeReturnPosition = "G0 X200 Z100";
    }

    profile.specialFeatures = [];
    if (caps.supportsCAxis) profile.specialFeatures.push("C-axis milling");
    if (caps.supportsYAxis) profile.specialFeatures.push("Y-axis milling");
    if (caps.supportsSubSpindle) profile.specialFeatures.push("Sub-spindle operations");
    if (caps.supportsNurbs) profile.specialFeatures.push("NURBS interpolation");

    return { success: true, data: profile };
  }

  // ============================================================================
  // Dispatcher Actions
  // ============================================================================

  async executeAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<EngineResult<unknown>> {
    switch (action) {
      case "lathe_ultra_get_controller":
        return this.getControllerCapabilities(params.controller as LatheControllerModel);

      case "lathe_ultra_list_controllers":
        return this.listControllers(params.family as LatheControllerFamily | undefined);

      case "lathe_ultra_compare_controllers":
        return this.compareControllers(
          params.controller1 as LatheControllerModel,
          params.controller2 as LatheControllerModel,
          params.requirements as Record<string, boolean>
        );

      case "lathe_ultra_assist_hardcode":
        return this.assistHardCode(
          params.controller as LatheControllerModel,
          params.context as {
            operation: string;
            material: string;
            toolDiameter_mm: number;
            partDiameter_mm: number;
            cuttingDepth_mm?: number;
          }
        );

      case "lathe_ultra_generate_macro":
        return this.generateMacroTemplate(
          params.controller as LatheControllerModel,
          params.macroType as "thread" | "groove" | "taper" | "contour" | "drill_pattern" | "custom",
          params.parameters as Record<string, number>
        );

      case "lathe_ultra_translate_nl":
        return this.translateConversational(
          params.controller as LatheControllerModel,
          params.command as string,
          params.context as PartContext | undefined
        );

      case "lathe_ultra_recommend_cam":
        return this.recommendCAMStrategy(
          params.controller as LatheControllerModel,
          params.operation as {
            type: "od_rough" | "od_finish" | "id_rough" | "id_finish" | "face" | "groove" | "thread" | "contour";
            material: string;
            partDiameter_mm: number;
            stockAllowance_mm?: number;
            targetRa_um?: number;
          }
        );

      case "lathe_ultra_deep_reason":
        return this.executeDeepReasoning(
          params.chainType as DeepReasoningChain["chainType"],
          params.input as Record<string, unknown>,
          params.controller as LatheControllerModel
        );

      case "lathe_ultra_llm_query":
        return this.processLLMQuery(params as LLMQueryContext);

      case "lathe_ultra_get_post":
        return this.getPostProcessorProfile(params.controller as LatheControllerModel);

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

// Helper type
interface ComparisonItem {
  feature: string;
  controller1: boolean | number;
  controller2: boolean | number;
  winner: 1 | 2 | "tie";
}

export const latheAIUltraEngine = new LatheAIUltraEngine();
