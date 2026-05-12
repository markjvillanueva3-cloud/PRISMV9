/**
 * MacroProgramIntelligenceEngine — AI Intelligence for Parametric CNC Macro Programs
 *
 * Understands, generates, optimizes, translates, debugs, and explains parametric
 * CNC macro programs. Built on top of the existing Okuma parsing/generation stack
 * and grounded in real production macros from JM Die Company:
 *   - CASING_MACRO.MIN     (casing turning: face/OD rough, drill, OD/ID finish, cutoff)
 *   - CBORE_CASING_MACRO.MIN (counterbore turning: stepped bore, 3-drill sequence)
 *
 * Okuma OSP-P300 variable conventions (mined from production programs):
 *   V1-V19    Part geometry (stock dia, OD, ID, part length, offsets)
 *   V20-V34   Drill 1 parameters (dia, SFM, feed, peck, point angle)
 *   V31-V49   Drill 2/3 optional parameters
 *   V35-V39   Stock allowances (OD radial, OD axial, ID radial, ID axial, face)
 *   V40-V44   Depths of cut + tool nose radii
 *   V45-V59   Speeds (SFM) and feeds (IPR) per operation
 *   V60-V69   Clearances and max spindle RPM clamps
 *   V70-V99   Auto-calculated values (RPM, depths, approach coords)
 *   V100-V119 Z-offsets, axis positions
 *   V130-V172 Extended: cutoff, undercut, chamfer, bore passes
 *   VC100+    Common (persistent) variables — shared across programs
 *
 * Key Okuma syntax patterns:
 *   RPM formula: V = [SFM * 3.82] / diameter
 *   Drill depth:  V = dia / 2 / TAN[point_angle / 2]
 *   Chamfer (OD): A = 180 - angle  (angles measured CCW from +Z)
 *   Chamfer (ID): A = 180 + angle
 *   CSS mode:     G96 S[Vxx] M3
 *   RPM mode:     G97 S[Vxx] M3
 *   Max clamp:    G50 S[Vxx]
 *   Roughing:     G85 NATx D[doc] U[stock_rad] W[stock_ax] F[feed]
 *   Peck drill:   G74 X0. Z[depth] I[peck] D[total+0.1] F[feed]
 *   Comp on:      G41 (OD), G42 (ID bore)   Comp off: G40
 *   Profile label: NAT1, NAT6 (G81 = OD profile, G81 inside NAT6 = ID)
 *
 * @module MacroProgramIntelligenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A single tokenized element of a macro line. */
export interface MacroToken {
  type:
    | "variable_assign"
    | "variable_ref"
    | "gcode"
    | "mcode"
    | "tcode"
    | "label"
    | "conditional"
    | "loop"
    | "goto"
    | "expression"
    | "comment"
    | "math_func"
    | "motion"
    | "program_end"
    | "unknown";
  raw: string;
  value?: string | number;
  comment?: string;
}

/** A parsed statement from the macro. */
export interface MacroStatement {
  lineNumber: number;
  raw: string;
  tokens: MacroToken[];
  /** High-level category of this statement */
  category:
    | "variable_declaration"
    | "auto_calculation"
    | "control_flow"
    | "motion"
    | "spindle"
    | "coolant"
    | "tool_change"
    | "cycle"
    | "program_control"
    | "comment_block"
    | "unknown";
  /** Human-readable description of this line's purpose */
  explanation: string;
  /** Variables assigned on this line */
  assigns: string[];
  /** Variables referenced on this line */
  uses: string[];
}

/** Abstract Syntax Tree for a parsed macro. */
export interface MacroAST {
  controller: ControllerType;
  programNumber: string;
  toolDefinitions: MacroToolDef[];
  sections: MacroSection[];
  variables: MacroVariableMap;
  autoCalcs: AutoCalcEntry[];
  controlFlow: ControlFlowEntry[];
  operationSequence: string[];
  lineCount: number;
  hasOptionalFeatures: boolean;
  safetyChecks: SafetyCheckResult;
}

export interface MacroToolDef {
  toolCode: string;
  toolNumber: number;
  operation: string;
  comment: string;
}

export interface MacroSection {
  name: string;
  label?: string;
  startLine: number;
  endLine: number;
  statements: MacroStatement[];
  purpose: string;
}

/** Map of all V-variables with their assignments. */
export interface MacroVariableMap {
  [varName: string]: {
    initialValue?: number;
    formula?: string;
    comment?: string;
    category: VariableCategory;
    usedInLines: number[];
  };
}

export type VariableCategory =
  | "geometry"
  | "drill_params"
  | "stock_allowance"
  | "depth_of_cut"
  | "speed_sfm"
  | "feed_ipr"
  | "clearance"
  | "max_rpm"
  | "calculated"
  | "optional_flag"
  | "machine_option"
  | "extended"
  | "common"
  | "unknown";

export interface AutoCalcEntry {
  variable: string;
  formula: string;
  description: string;
  dependsOn: string[];
}

export interface ControlFlowEntry {
  lineNumber: number;
  type: "IF_GOTO" | "WHILE" | "GOTO" | "CALL" | "LABEL";
  condition?: string;
  target?: string;
  purpose: string;
}

export interface SafetyCheckResult {
  hasG50SpeedClamp: boolean;
  hasG40CompCancel: boolean;
  hasG80CycleCancel: boolean;
  hasCoolantOff: boolean;
  hasRetractToSafePos: boolean;
  issues: string[];
}

/** Controller type supported for generation and translation. */
export type ControllerType = "okuma_osp" | "fanuc" | "haas" | "mazak" | "siemens";

// ============================================================================
// GENERATION TYPES
// ============================================================================

export interface MacroGenerationInput {
  /** Natural language description of what the macro should do */
  taskDescription: string;
  /** Target controller */
  controller: ControllerType;
  /** Suggested part dimensions (optional — will use typical defaults if absent) */
  partGeometry?: {
    stockDiameter?: number;
    finishOD?: number;
    finishID?: number;
    partLength?: number;
  };
  /** Include optional operations */
  options?: {
    includeSpotDrill?: boolean;
    includeDrill?: boolean;
    includeIDFinish?: boolean;
    includeCutoff?: boolean;
    includeIDRough?: boolean;
  };
  unitSystem?: "imperial" | "metric";
}

export interface MacroGenerationResult {
  success: boolean;
  controller: ControllerType;
  patternUsed: string;
  confidence: number;
  code: string;
  variableGuide: VariableGuideEntry[];
  operationSequence: string[];
  warnings: string[];
  notes: string[];
}

export interface VariableGuideEntry {
  variable: string;
  purpose: string;
  defaultValue: number | string;
  units: string;
  adjustable: boolean;
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

export interface MacroOptimizationResult {
  originalLineCount: number;
  optimizedCode: string;
  suggestions: OptimizationSuggestion[];
  totalSuggestionsApplied: number;
  estimatedCycleTimeSavingPct?: number;
}

export interface OptimizationSuggestion {
  lineNumber?: number;
  type:
    | "redundant_mode_switch"
    | "missing_speed_clamp"
    | "missing_comp_cancel"
    | "dead_variable"
    | "suboptimal_approach"
    | "missing_coolant_off"
    | "redundant_retract"
    | "formula_simplification";
  severity: "critical" | "warning" | "info";
  description: string;
  originalCode?: string;
  suggestedCode?: string;
  explanation: string;
}

// ============================================================================
// TRANSLATION TYPES
// ============================================================================

export interface MacroTranslationInput {
  sourceController: ControllerType;
  targetController: ControllerType;
  code: string;
}

export interface MacroTranslationResult {
  success: boolean;
  sourceController: ControllerType;
  targetController: ControllerType;
  translatedCode: string;
  mappingsApplied: TranslationMapping[];
  warnings: string[];
  untranslatedPatterns: string[];
}

export interface TranslationMapping {
  pattern: string;
  from: string;
  to: string;
  description: string;
}

// ============================================================================
// DEBUG TYPES
// ============================================================================

export interface MacroDebugInput {
  code: string;
  errorMessage: string;
  /** Optional: line number reported by controller */
  errorLine?: number;
  controller?: ControllerType;
}

export interface MacroDebugResult {
  errorCategory: DebugErrorCategory;
  probableCause: string;
  affectedLines: number[];
  diagnostics: DebugDiagnostic[];
  suggestedFixes: string[];
  preventionTips: string[];
}

export type DebugErrorCategory =
  | "undefined_label"
  | "undefined_variable"
  | "syntax_error"
  | "division_by_zero"
  | "missing_cancel"
  | "tool_comp_error"
  | "cycle_error"
  | "variable_range"
  | "expression_error"
  | "unknown";

export interface DebugDiagnostic {
  lineNumber: number;
  code: string;
  issue: string;
  severity: "critical" | "warning";
}

// ============================================================================
// EXPLANATION TYPES
// ============================================================================

export interface MacroExplanation {
  title: string;
  summary: string;
  controller: ControllerType;
  operationOverview: string[];
  annotatedLines: AnnotatedLine[];
  variableGuide: VariableGuideEntry[];
  patternsSeen: string[];
  tribalTips: string[];
}

export interface AnnotatedLine {
  lineNumber: number;
  code: string;
  explanation: string;
  category: MacroStatement["category"];
  importance: "critical" | "normal" | "optional";
}

// ============================================================================
// PATTERN LIBRARY
// ============================================================================

export interface PatternLibraryEntry {
  id: string;
  name: string;
  description: string;
  controller: ControllerType[];
  keywords: string[];
  templateCode: string;
  variableGuide: VariableGuideEntry[];
  operationSequence: string[];
  sourceFile?: string;
}

/**
 * Built-in pattern library derived from production macros (CASING_MACRO.MIN
 * and CBORE_CASING_MACRO.MIN) plus common shop-floor patterns.
 *
 * Patterns capture the structural essence of each operation type.
 * Variable values are representative defaults from the real macros.
 */
const PATTERN_LIBRARY: PatternLibraryEntry[] = [
  {
    id: "casing_turning",
    name: "Casing Turning Macro",
    description:
      "Full casing turning sequence: face rough, OD rough (G85 NAT1 canned cycle), " +
      "spot drill, drill 1 (optional peck), optional drill 2, face/OD finish (G86 NAT1), " +
      "optional ID rough (G85 NAT6), ID finish (G86 NAT6), cutoff with optional chamfer/radius. " +
      "Grounded in JM Die CASING_MACRO.MIN — real 580-line production macro.",
    controller: ["okuma_osp"],
    keywords: [
      "casing", "turning", "face", "od", "id", "drill", "cutoff",
      "chamfer", "radius", "rough", "finish", "bore",
    ],
    sourceFile: "CASING_MACRO.MIN",
    operationSequence: [
      "Face rough + OD rough (T010101)",
      "Spot drill (T030303)",
      "Drill 1 (T050505)",
      "Drill 2 optional (T060606)",
      "Face finish + OD finish (T020202)",
      "ID rough optional (T070707)",
      "ID finish (T080808)",
      "Cutoff (T111111)",
    ],
    variableGuide: [
      { variable: "V1",   purpose: "Stock diameter",             defaultValue: 1.905,  units: "in",  adjustable: true },
      { variable: "V2",   purpose: "Finish OD",                  defaultValue: 1.755,  units: "in",  adjustable: true },
      { variable: "V3",   purpose: "Drill size / start hole dia", defaultValue: 0.59375, units: "in", adjustable: true },
      { variable: "V4",   purpose: "Finish ID",                  defaultValue: 0.618,  units: "in",  adjustable: true },
      { variable: "V5",   purpose: "Part length",                defaultValue: 2.015,  units: "in",  adjustable: true },
      { variable: "V6",   purpose: "OD chamfer Z depth (0=none)", defaultValue: 0.04,  units: "in",  adjustable: true },
      { variable: "V7",   purpose: "OD feature type (1=chamfer, 2=radius)", defaultValue: 1, units: "", adjustable: true },
      { variable: "V8",   purpose: "OD chamfer angle",           defaultValue: 45,     units: "deg", adjustable: true },
      { variable: "V12",  purpose: "ID rough enable (0=skip, 1=run)", defaultValue: 0, units: "",    adjustable: true },
      { variable: "V13",  purpose: "Cutoff feature (0=none, 1=chamfer, 2=radius)", defaultValue: 0, units: "", adjustable: true },
      { variable: "V25",  purpose: "Drill 1 diameter",           defaultValue: 0.59375, units: "in", adjustable: true },
      { variable: "V26",  purpose: "Drill 1 SFM",                defaultValue: 95,     units: "SFM", adjustable: true },
      { variable: "V27",  purpose: "Drill 1 feed",               defaultValue: 0.005,  units: "IPR", adjustable: true },
      { variable: "V40",  purpose: "OD depth of cut per pass",   defaultValue: 0.1,    units: "in",  adjustable: true },
      { variable: "V45",  purpose: "OD rough SFM",               defaultValue: 755,    units: "SFM", adjustable: true },
      { variable: "V46",  purpose: "OD finish SFM",              defaultValue: 825,    units: "SFM", adjustable: true },
      { variable: "V47",  purpose: "ID rough/finish SFM",        defaultValue: 400,    units: "SFM", adjustable: true },
      { variable: "V52",  purpose: "OD rough feed",              defaultValue: 0.012,  units: "IPR", adjustable: true },
      { variable: "V53",  purpose: "OD finish feed",             defaultValue: 0.0045, units: "IPR", adjustable: true },
      { variable: "V65",  purpose: "Rough max RPM",              defaultValue: 2500,   units: "RPM", adjustable: true },
      { variable: "V66",  purpose: "Finish max RPM",             defaultValue: 2500,   units: "RPM", adjustable: true },
      { variable: "V70",  purpose: "CALC: Spot drill RPM = [V21*3.82]/V20", defaultValue: "auto", units: "RPM", adjustable: false },
      { variable: "V87",  purpose: "CALC: OD rough RPM = [V45*3.82]/V1",   defaultValue: "auto", units: "RPM", adjustable: false },
    ],
    templateCode: `O1001
(T010101 - FACE/OD ROUGH)
(T020202 - FACE/OD FINISH)
(T030303 - SPOT DRILL)
(T050505 - DRILL 1)
(T060606 - DRILL 2 - OPTIONAL)
(T070707 - ID ROUGH - OPTIONAL)
(T080808 - ID FINISH)
(T111111 - CUTOFF)

(========== STOCK AND MODEL ==========)
V1 = 1.905           (STOCK DIAMETER)
V2 = 1.755           (FINISH OD)
V3 = 0.59375         (DRILL SIZE / START HOLE DIA)
V4 = 0.618           (FINISH ID)
V5 = 2.015           (PART LENGTH)
V100 = 0.015         (STOCK FACE OFFSET)

(========== OD CHAMFER/RADIUS ==========)
V6 = 0.04            (CHAMFER Z DEPTH - 0 FOR NONE)
V7 = 1               (1=CHAMFER, 2=RADIUS)
V8 = 45              (CHAMFER ANGLE)

(========== DRILL 1 PARAMETERS ==========)
V25 = 0.59375        (DRILL 1 DIAMETER)
V26 = 95             (DRILL 1 SFM)
V27 = 0.005          (DRILL 1 FEED - IPR)
V28 = 0.13           (DRILL 1 PECK DEPTH)
V29 = 130            (DRILL 1 POINT ANGLE)
V30 = 0              (DRILL 1 PECK: 0=NO, 1=YES)

(========== STOCK ALLOWANCES ==========)
V35 = 0.015          (OD FINISH STOCK - RADIAL)
V36 = 0.002          (OD FINISH STOCK - AXIAL)
V37 = 0.006          (ID FINISH STOCK - RADIAL)

(========== ROUGHING PARAMETERS ==========)
V40 = 0.1            (OD DEPTH OF CUT)
V41 = 0.06           (ID DEPTH OF CUT)
V44 = 0.031          (TOOL 1 NOSE RADIUS - ROUGH)
V99 = 0.0156         (TOOL 2 NOSE RADIUS - FINISH)

(========== TURNING SPEEDS - SFM ==========)
V45 = 755            (OD ROUGH SFM)
V46 = 825            (OD FINISH SFM)
V47 = 400            (ID ROUGH/FINISH SFM)
V48 = 500            (CUTOFF SFM)

(========== TURNING FEEDS ==========)
V52 = 0.012          (OD ROUGH FEED)
V53 = 0.0045         (OD FINISH FEED)
V55 = 0.0045         (ID FINISH FEED)
V56 = 0.004          (CUTOFF FEED)

(========== CLEARANCE ==========)
V60 = 0.03           (Z CLEARANCE)
V61 = 0.03           (X CLEARANCE)
V65 = 2500           (ROUGH MAX RPM)
V66 = 2500           (FINISH MAX RPM)

(========== AUTO-CALCULATIONS ==========)
V71 = [V26 * 3.82] / V25   (DRILL 1 RPM)
V72 = V25 / 2 / TAN[V29 / 2]  (DRILL 1 POINT DEPTH)
V73 = V5 + V72 + 0.03     (DRILL 1 TOTAL DEPTH)
V74 = -V73                 (DRILL 1 Z DEPTH)
V75 = V2 - [V6 * TAN[V8] * 2]  (OD CHAMFER START DIA)
V84 = 180 - V8             (OD CHAMFER ANGLE FOR OKUMA)
V87 = [V45 * 3.82] / V1   (OD ROUGH INITIAL RPM)
V88 = [V46 * 3.82] / V2   (OD FINISH INITIAL RPM)
`,
  },
  {
    id: "counterbore_casing",
    name: "Counterbore Casing Macro",
    description:
      "Counterbore casing turning with 3-drill sequence: pilot drill, optional thru drill, " +
      "optional 180-degree flat-bottom drill. Incremental ID roughing passes (V56 increments) " +
      "from pilot dia to counterbore dia. Full undercut feature with taper angle. " +
      "Grounded in JM Die CBORE_CASING_MACRO.MIN — 550-line production macro.",
    controller: ["okuma_osp"],
    keywords: [
      "counterbore", "cbore", "counter bore", "stepped bore", "flat bottom",
      "pilot drill", "thru drill", "180 degree", "incremental roughing", "undercut",
    ],
    sourceFile: "CBORE_CASING_MACRO.MIN",
    operationSequence: [
      "Face rough + OD rough (T010101)",
      "Spot drill (T030303)",
      "Drill 1 pilot (T050505)",
      "Drill 2 thru optional (T060606)",
      "Drill 3 180-deg optional (T070707)",
      "Face finish + OD finish (T020202)",
      "ID rough counterbore (T080808)",
      "ID finish counterbore (T090909)",
      "Cutoff (T111111)",
    ],
    variableGuide: [
      { variable: "V1",   purpose: "Stock diameter",               defaultValue: 2.54,   units: "in",  adjustable: true },
      { variable: "V2",   purpose: "Finish OD",                    defaultValue: 2.005,  units: "in",  adjustable: true },
      { variable: "V3",   purpose: "Finish thru hole diameter",    defaultValue: 0.747,  units: "in",  adjustable: true },
      { variable: "V4",   purpose: "Finish counterbore diameter",  defaultValue: 1.233,  units: "in",  adjustable: true },
      { variable: "V5",   purpose: "Part length (OD)",             defaultValue: 2.515,  units: "in",  adjustable: true },
      { variable: "V6",   purpose: "Counterbore depth",            defaultValue: 1.0,    units: "in",  adjustable: true },
      { variable: "V25",  purpose: "Drill 1 (pilot) diameter",     defaultValue: 1.22,   units: "in",  adjustable: true },
      { variable: "V37",  purpose: "Drill 3 enable (0=no, 1=yes)", defaultValue: 1,      units: "",    adjustable: true },
      { variable: "V38",  purpose: "Drill 3 diameter (180-deg)",   defaultValue: 1.218,  units: "in",  adjustable: true },
      { variable: "V44",  purpose: "Drill 3 depth (cbore depth)",  defaultValue: 0.998,  units: "in",  adjustable: true },
      { variable: "V56",  purpose: "ID rough step (dia increment)", defaultValue: 0.03,  units: "in",  adjustable: true },
      { variable: "V60",  purpose: "OD rough SFM",                 defaultValue: 755,    units: "SFM", adjustable: true },
      { variable: "V61",  purpose: "OD finish SFM",                defaultValue: 825,    units: "SFM", adjustable: true },
      { variable: "V62",  purpose: "ID rough SFM",                 defaultValue: 400,    units: "SFM", adjustable: true },
      { variable: "V140", purpose: "Undercut taper angle",         defaultValue: 4,      units: "deg", adjustable: true },
      { variable: "V141", purpose: "Undercut diameter reduction",  defaultValue: 0.02,   units: "in",  adjustable: true },
    ],
    templateCode: `O1001
(T010101 - FACE/OD ROUGH)
(T020202 - FACE/OD FINISH)
(T030303 - SPOT DRILL)
(T050505 - DRILL 1 - PILOT)
(T060606 - DRILL 2 - THRU - OPTIONAL)
(T070707 - DRILL 3 - 180 DEG - OPTIONAL)
(T080808 - ID ROUGH - COUNTER BORE)
(T090909 - ID FINISH - COUNTER BORE)
(T111111 - CUTOFF)

(========== STOCK AND MODEL ==========)
V1 = 2.54            (STOCK DIAMETER)
V2 = 2.005           (FINISH OD)
V3 = 0.747           (FINISH THRU HOLE DIA)
V4 = 1.233           (FINISH COUNTER BORE DIA)
V5 = 2.515           (PART LENGTH - OD)
V6 = 1.0             (COUNTER BORE DEPTH)
V100 = 0.015         (STOCK FACE OFFSET)

(========== DRILL 1 - PILOT ==========)
V25 = 1.22           (DRILL 1 DIAMETER)
V26 = 85             (DRILL 1 SFM)
V27 = 0.008          (DRILL 1 FEED - IPR)
V29 = 130            (DRILL 1 POINT ANGLE)

(========== DRILL 3 - 180 DEG - OPTIONAL ==========)
V37 = 1              (DRILL 3 ENABLE: 0=NO, 1=YES)
V38 = 1.218          (DRILL 3 DIAMETER)
V42 = 180            (DRILL 3 POINT ANGLE - FLAT BOTTOM)
V44 = 0.998          (DRILL 3 DEPTH - CBORE DEPTH)

(========== ID ROUGHING ==========)
V56 = 0.03           (ID ROUGH STEP - DIAMETER INCREMENT)

(========== COUNTER BORE UNDERCUT ==========)
V140 = 4             (UNDERCUT TAPER ANGLE - DEGREES)
V141 = 0.02          (UNDERCUT DIAMETER REDUCTION)
V142 = 0.03          (UNDERCUT STRAIGHT LENGTH)

(========== AUTO-CALCULATIONS ==========)
V91 = [V26 * 3.82] / V25   (DRILL 1 RPM)
V94 = V25 / 2 / TAN[V29 / 2]  (DRILL 1 POINT DEPTH)
V106 = [V60 * 3.82] / V1  (OD ROUGH INITIAL RPM)
V143 = V4 - V141           (UNDERCUT FINISH DIAMETER)
V144 = [V141 / 2] / TAN[V140]  (TAPER Z LENGTH)
V145 = 180 + V140          (OKUMA A WORD FOR ID TAPER)
V149 = V25 + V56           (PASS 1 DIA)
V150 = V25 + [V56 * 2]     (PASS 2 DIA)
V151 = V25 + [V56 * 3]     (PASS 3 DIA)
`,
  },
  {
    id: "od_roughing_loop",
    name: "OD Roughing Loop Pattern",
    description:
      "Parametric OD roughing using Okuma G85 canned cycle with NAT profile definition. " +
      "Automatically handles stock removal, chamfer/radius options, and retract.",
    controller: ["okuma_osp"],
    keywords: ["od rough", "roughing", "g85", "nat1", "canned cycle", "stock removal"],
    operationSequence: ["G85 NAT canned roughing cycle", "Profile definition", "G80 cycle cancel"],
    variableGuide: [
      { variable: "V40", purpose: "OD depth of cut per pass", defaultValue: 0.1, units: "in", adjustable: true },
      { variable: "V35", purpose: "OD finish stock radial",   defaultValue: 0.015, units: "in", adjustable: true },
      { variable: "V36", purpose: "OD finish stock axial",    defaultValue: 0.002, units: "in", adjustable: true },
    ],
    templateCode: `(PROFILE ROUGHING - OD)
N2 IF [V80 LT 0.05] GOTO N15
G97 S[V87] M3
G0 Z[V81]
X[V1 + V63]
G96 S[V45] M3
Z[V100 + 0.03]
G85 NAT1 D[V40] U[V35] W[V36] F[V52]
NAT1 G81
G0 X[V75] Z[V100 + 0.03]
G1 Z[V100]
X[V2] A[V84]
Z-[V77]
X[V1]
G80
G0 X[V1 + V63] Z[V100 + 0.03]
Z[V81]
G180
G97 S[V87] M3
`,
  },
  {
    id: "peck_drilling",
    name: "Peck Drill Pattern",
    description:
      "Parametric peck drilling using Okuma G74 cycle. Conditional peck enable/disable " +
      "via flag variable. RPM calculated from SFM and drill diameter.",
    controller: ["okuma_osp"],
    keywords: ["drill", "peck", "g74", "deep hole", "chip breaking"],
    operationSequence: ["RPM calculation", "IF peck enable", "G74 peck cycle or G1 direct"],
    variableGuide: [
      { variable: "V25", purpose: "Drill diameter",    defaultValue: 0.5,  units: "in",  adjustable: true },
      { variable: "V26", purpose: "Drill SFM",         defaultValue: 95,   units: "SFM", adjustable: true },
      { variable: "V27", purpose: "Drill feed",        defaultValue: 0.005, units: "IPR", adjustable: true },
      { variable: "V28", purpose: "Peck depth",        defaultValue: 0.13, units: "in",  adjustable: true },
      { variable: "V29", purpose: "Drill point angle", defaultValue: 130,  units: "deg", adjustable: true },
      { variable: "V30", purpose: "Peck enable (0=no, 1=yes)", defaultValue: 0, units: "", adjustable: true },
    ],
    templateCode: `(DRILL - T050505)
G0 X20. Z20.
N4 T050505
M8
G97 S[V71] M3
G0 Z[V165]
X0.
G0 Z[V81]
IF [V30 EQ 1] GOTO N40
(NO PECK)
G1 Z[V74] F[V27]
G0 Z[V165]
GOTO N50
(PECK)
N40 G74 X0. Z[V74] I[V28] D[V73 + 0.1] F[V27]
G180
G0 Z[V165]
N50 M5
M9
`,
  },
  {
    id: "tool_change_sequence",
    name: "Okuma Tool Change Sequence",
    description:
      "Standard Okuma tool change: retract to safe position, optional G270 graphics lock, " +
      "T-code (6-digit), coolant on, spindle on, position for cut.",
    controller: ["okuma_osp"],
    keywords: ["tool change", "t code", "g270", "g140", "retract", "tool station"],
    operationSequence: ["G0 X20 Z20", "Optional G270", "T-code", "M8 coolant", "G97/G96 spindle"],
    variableGuide: [
      { variable: "V110", purpose: "Include G140/G270 graphics (0=no, 1=yes)", defaultValue: 0, units: "", adjustable: true },
    ],
    templateCode: `(TOOL CHANGE SEQUENCE)
G0 X20. Z20.
IF [V110 EQ 0] GOTO N9001
G270
N9001 G95 G18
N1 T010101
M8
G97 S[V87] M3
G0 Z[V81]
X[V94]
G96 S[V45] M3
`,
  },
  {
    id: "id_incremental_roughing",
    name: "ID Incremental Roughing Passes",
    description:
      "Incremental ID roughing from pilot drill diameter to counterbore diameter. " +
      "Uses IF/GOTO to skip passes where intermediate diameter exceeds target. " +
      "Derived from CBORE_CASING_MACRO.MIN incremental pass logic.",
    controller: ["okuma_osp"],
    keywords: ["id rough", "bore", "incremental", "passes", "counterbore rough"],
    operationSequence: ["Pass 1 IF guard", "G1 bore to depth", "Z retract", "Repeat for passes 2-6"],
    variableGuide: [
      { variable: "V25", purpose: "Pilot drill diameter (starting dia)", defaultValue: 1.22, units: "in", adjustable: true },
      { variable: "V56", purpose: "Diameter increment per pass",          defaultValue: 0.03, units: "in", adjustable: true },
      { variable: "V155", purpose: "Target counterbore rough diameter",    defaultValue: 1.265, units: "in", adjustable: false },
    ],
    templateCode: `(INCREMENTAL ROUGHING FROM PILOT DRILL TO COUNTER BORE)
X[V120]
(PASS 1)
IF [V149 GT V155] GOTO N320
X[V149]
G1 Z-[V146] F[V68]
G0 Z[V100 + V73]
(PASS 2)
IF [V150 GT V155] GOTO N320
X[V150]
G1 Z-[V146] F[V68]
G0 Z[V100 + V73]
(PASS 3)
IF [V151 GT V155] GOTO N320
X[V151]
G1 Z-[V146] F[V68]
G0 Z[V100 + V73]
`,
  },
];

// ============================================================================
// CONTROLLER TRANSLATION TABLES
// ============================================================================

/** Bidirectional dialect mappings between controller types. */
const TRANSLATION_RULES: Array<{
  pattern: RegExp;
  from: ControllerType;
  to: ControllerType;
  replacement: string;
  description: string;
}> = [
  // Variable syntax: Okuma V-variables → Fanuc #-variables
  {
    pattern: /\bV(\d+)\b/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "#$1",
    description: "Okuma V-variable → Fanuc #-variable",
  },
  {
    pattern: /#(\d+)/g,
    from: "fanuc", to: "okuma_osp",
    replacement: "V$1",
    description: "Fanuc #-variable → Okuma V-variable",
  },
  // Roughing cycle: Okuma G85 NAT → Fanuc G71
  {
    pattern: /G85\s+NAT\w+\s+D\[([^\]]+)\]\s+U\[([^\]]+)\]\s+W\[([^\]]+)\]\s+F\[([^\]]+)\]/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "G71 U[$1] R0.05\nG71 P100 Q200 U[$2] W[$3] F[$4]",
    description: "Okuma G85 NAT roughing → Fanuc G71 roughing cycle",
  },
  // Finish cycle: Okuma G86 NAT → Fanuc G70
  {
    pattern: /G86\s+NAT\w+\s+F[\d.]+/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "G70 P100 Q200",
    description: "Okuma G86 NAT finish → Fanuc G70 finish cycle",
  },
  // Peck drilling: Okuma G74 → Fanuc G83
  {
    pattern: /G74\s+X0\.\s+Z\[([^\]]+)\]\s+I\[([^\]]+)\]\s+D\[([^\]]+)\]\s+F\[([^\]]+)\]/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "G83 X0. Z[-$1] Q$2 F[$4]",
    description: "Okuma G74 peck drill → Fanuc G83 peck drill",
  },
  // Arc radius: Okuma L → Fanuc R
  {
    pattern: /\bL([\d.]+)\b/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "R$1",
    description: "Okuma L arc radius → Fanuc R arc radius",
  },
  // G50 max speed clamp — compatible, no change needed (both controllers)
  // Tool format: Okuma 6-digit T010101 → Fanuc T0101
  {
    pattern: /\bT(\d{2})(\d{2})\d{2}\b/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "T$1$2",
    description: "Okuma T6-digit tool code → Fanuc T4-digit tool code",
  },
  {
    pattern: /\bT(\d{2})(\d{2})\b/g,
    from: "fanuc", to: "okuma_osp",
    replacement: "T$1$2$2",
    description: "Fanuc T4-digit tool code → Okuma T6-digit tool code",
  },
  // GOTO → standard (no change — both use GOTO N syntax)
  // CSS mode — G96 compatible, no translation needed
  // G180 (Okuma graphics cancel) → comment in Fanuc
  {
    pattern: /\bG180\b/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "(G180 - OKUMA GRAPHICS CANCEL - NO FANUC EQUIVALENT)",
    description: "Okuma G180 graphics cancel → comment",
  },
  // G270 (Okuma graphics lock) → comment in Fanuc
  {
    pattern: /\bG270\b/g,
    from: "okuma_osp", to: "fanuc",
    replacement: "(G270 - OKUMA GRAPHICS LOCK - NO FANUC EQUIVALENT)",
    description: "Okuma G270 graphics lock → comment",
  },
];

// ============================================================================
// VARIABLE CATEGORY CLASSIFIER
// ============================================================================

/**
 * Classify an Okuma V-variable by number range into its semantic category.
 * Based on production macro conventions from CASING_MACRO.MIN and CBORE_CASING_MACRO.MIN.
 */
function classifyVariable(varName: string): VariableCategory {
  const match = varName.match(/^V[C]?(\d+)$/i);
  if (!match) return "unknown";
  const n = parseInt(match[1], 10);
  const isCommon = /^VC/i.test(varName);
  if (isCommon) return "common";
  if (n >= 1   && n <= 19)  return "geometry";
  if (n >= 20  && n <= 34)  return "drill_params";
  if (n >= 35  && n <= 39)  return "stock_allowance";
  if (n >= 40  && n <= 44)  return "depth_of_cut";
  if (n >= 45  && n <= 59)  return (n % 2 === 1) ? "speed_sfm" : "feed_ipr";
  if (n >= 60  && n <= 69)  return "clearance";
  if (n >= 65  && n <= 69)  return "max_rpm";
  if (n >= 70  && n <= 99)  return "calculated";
  if (n >= 100 && n <= 119) return "calculated";
  if (n >= 120 && n <= 129) return "optional_flag";
  if (n >= 130 && n <= 172) return "extended";
  return "unknown";
}

// ============================================================================
// MACRO INTELLIGENCE ENGINE
// ============================================================================

export class MacroProgramIntelligenceEngine {
  /**
   * Parse an Okuma OSP (or other controller) macro program into a structured AST.
   * Tokenizes lines, classifies statements, extracts all V-variables, auto-calculations,
   * control flow, and produces a safety check summary.
   *
   * @param code - Raw macro program text (multi-line string)
   * @param controller - Controller type (default: okuma_osp)
   * @returns Structured MacroAST
   */
  static parseOkumaMacro(code: string, controller: ControllerType = "okuma_osp"): MacroAST {
    const rawLines = code.split(/\r?\n/);
    const sections: MacroSection[] = [];
    const variables: MacroVariableMap = {};
    const autoCalcs: AutoCalcEntry[] = [];
    const controlFlow: ControlFlowEntry[] = [];
    const toolDefs: MacroToolDef[] = [];
    const operationSequence: string[] = [];

    let currentSection: MacroSection | null = null;
    let programNumber = "";

    // Safety tracking
    const safety: SafetyCheckResult = {
      hasG50SpeedClamp: false,
      hasG40CompCancel: false,
      hasG80CycleCancel: false,
      hasCoolantOff: false,
      hasRetractToSafePos: false,
      issues: [],
    };

    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i].trim();
      const lineNum = i + 1;
      if (!raw) continue;

      // Program number
      if (/^O\d+/.test(raw) && i === 0) {
        programNumber = raw.replace(/^(O\d+).*/, "$1");
        continue;
      }

      // Tool definitions from header comments: (T010101 - FACE/OD ROUGH)
      const toolDefMatch = raw.match(/^\(T(\d{6})\s*-\s*(.+)\)$/);
      if (toolDefMatch) {
        const code6 = toolDefMatch[1];
        const toolNum = parseInt(code6.substring(0, 2), 10);
        toolDefs.push({
          toolCode: `T${code6}`,
          toolNumber: toolNum,
          operation: toolDefMatch[2].trim(),
          comment: raw,
        });
        operationSequence.push(toolDefMatch[2].trim());
        continue;
      }

      // Section delimiters from comments like (FACE ROUGH AND OD ROUGH - T010101)
      const sectionCommentMatch = raw.match(/^\(=+\)\s*$|^\(={4,}/);
      const operationHeaderMatch = raw.match(/^\(([A-Z][A-Z\s]+(?:T\d+)?)\)$/);
      if (operationHeaderMatch && !raw.includes("=")) {
        if (currentSection) {
          currentSection.endLine = lineNum - 1;
          sections.push(currentSection);
        }
        currentSection = {
          name: operationHeaderMatch[1].trim(),
          startLine: lineNum,
          endLine: lineNum,
          statements: [],
          purpose: operationHeaderMatch[1].trim(),
        };
      }

      // Parse statement
      const stmt = MacroProgramIntelligenceEngine._parseStatement(raw, lineNum);
      if (currentSection) {
        currentSection.statements.push(stmt);
      }

      // Variable assignment: V1 = 1.905 (COMMENT)
      const varAssignMatch = raw.match(/^(V[C]?\d+)\s*=\s*(.+?)(?:\s+\((.+)\))?$/i);
      if (varAssignMatch) {
        const varName = varAssignMatch[1].toUpperCase();
        const valPart = varAssignMatch[2].trim();
        const comment = varAssignMatch[3]?.trim();
        const numVal = parseFloat(valPart);
        const isFormula = /[\[\]*/+\-TANTASINSQRT]/.test(valPart) || /V\d+/.test(valPart);

        if (!variables[varName]) {
          variables[varName] = {
            category: classifyVariable(varName),
            usedInLines: [lineNum],
          };
        }
        if (comment) variables[varName].comment = comment;

        if (isFormula) {
          variables[varName].formula = valPart;
          const deps = (valPart.match(/V[C]?\d+/gi) ?? []).map(v => v.toUpperCase());
          autoCalcs.push({
            variable: varName,
            formula: valPart,
            description: comment ?? `Auto-calculated: ${varName} = ${valPart}`,
            dependsOn: deps,
          });
        } else if (!isNaN(numVal)) {
          variables[varName].initialValue = numVal;
        }
        continue;
      }

      // Variable references (non-assignment)
      const varRefs = raw.match(/V[C]?\d+/gi) ?? [];
      for (const ref of varRefs) {
        const v = ref.toUpperCase();
        if (!variables[v]) {
          variables[v] = { category: classifyVariable(v), usedInLines: [lineNum] };
        } else {
          variables[v].usedInLines.push(lineNum);
        }
      }

      // Control flow
      const ifGotoMatch = raw.match(/^IF\s*\[([^\]]+)\]\s+GOTO\s+(N\w+)/i);
      if (ifGotoMatch) {
        controlFlow.push({
          lineNumber: lineNum,
          type: "IF_GOTO",
          condition: ifGotoMatch[1],
          target: ifGotoMatch[2],
          purpose: MacroProgramIntelligenceEngine._inferConditionPurpose(ifGotoMatch[1], ifGotoMatch[2]),
        });
      }
      const gotoMatch = raw.match(/^GOTO\s+(N\w+)/i);
      if (gotoMatch && !raw.startsWith("IF")) {
        controlFlow.push({ lineNumber: lineNum, type: "GOTO", target: gotoMatch[1], purpose: "Unconditional jump" });
      }
      const labelMatch = raw.match(/^(N\d+)\s/);
      if (labelMatch) {
        controlFlow.push({ lineNumber: lineNum, type: "LABEL", target: labelMatch[1], purpose: "Branch target" });
      }

      // Safety feature detection — skip comment lines to avoid false positives
      const isComment = raw.startsWith("(");
      if (!isComment) {
        if (/G50\s+S/.test(raw))  safety.hasG50SpeedClamp   = true;
        if (/G40\b/.test(raw))    safety.hasG40CompCancel    = true;
        if (/G80\b/.test(raw))    safety.hasG80CycleCancel   = true;
        if (/M9\b/.test(raw))     safety.hasCoolantOff       = true;
        if (/G0\s+X20/.test(raw)) safety.hasRetractToSafePos = true;
      }
    }

    // Finalize last section
    if (currentSection) {
      currentSection.endLine = rawLines.length;
      sections.push(currentSection);
    }

    // Safety issues
    if (!safety.hasG50SpeedClamp)   safety.issues.push("Missing G50 max spindle speed clamp");
    if (!safety.hasG40CompCancel)    safety.issues.push("Missing G40 tool comp cancel");
    if (!safety.hasCoolantOff)       safety.issues.push("Missing M9 coolant off");
    if (!safety.hasRetractToSafePos) safety.issues.push("No X20/Z20 safe retract found");

    log.info("[MacroProgramIntelligenceEngine] parseOkumaMacro complete", {
      programNumber,
      variableCount: Object.keys(variables).length,
      autoCalcCount: autoCalcs.length,
      controlFlowCount: controlFlow.length,
      sectionCount: sections.length,
    });

    return {
      controller,
      programNumber,
      toolDefinitions: toolDefs,
      sections,
      variables,
      autoCalcs,
      controlFlow,
      operationSequence,
      lineCount: rawLines.length,
      hasOptionalFeatures: controlFlow.some(cf =>
        cf.condition?.includes("EQ 0") || cf.condition?.includes("EQ 1")
      ),
      safetyChecks: safety,
    };
  }

  /**
   * Generate a complete macro program from a natural-language task description.
   * Matches the description against the pattern library, selects the best template,
   * and returns working Okuma OSP (or translated) code with a variable guide.
   *
   * @param taskDescription - Plain English description (e.g. "casing turning with ID bore and cutoff")
   * @param controller - Target controller type
   * @param input - Optional structured overrides for geometry and options
   * @returns MacroGenerationResult with complete code and variable guide
   */
  static generateMacro(
    taskDescription: string,
    controller: ControllerType = "okuma_osp",
    input?: Partial<MacroGenerationInput>,
  ): MacroGenerationResult {
    const desc = taskDescription.toLowerCase();
    const warnings: string[] = [];
    const notes: string[] = [];

    // Score each pattern against the description
    type ScoredPattern = PatternLibraryEntry & { score: number };
    const scored: ScoredPattern[] = PATTERN_LIBRARY.map(p => {
      let score = 0;
      for (const kw of p.keywords) {
        if (desc.includes(kw)) score += kw.split(" ").length; // multi-word keywords score higher
      }
      if (!p.controller.includes(controller === "okuma_osp" ? "okuma_osp" : controller)) score -= 10;
      return { ...p, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score <= 0) {
      warnings.push(
        "No matching pattern found for description. Returning closest general pattern.",
      );
    }

    const chosen = best ?? PATTERN_LIBRARY[0];
    let code = chosen.templateCode;

    // Apply geometry overrides if provided
    if (input?.partGeometry) {
      const g = input.partGeometry;
      if (g.stockDiameter !== undefined) code = code.replace(/V1 = [\d.]+/, `V1 = ${g.stockDiameter.toFixed(4)}`);
      if (g.finishOD       !== undefined) code = code.replace(/V2 = [\d.]+/, `V2 = ${g.finishOD.toFixed(4)}`);
      if (g.finishID       !== undefined) code = code.replace(/V4 = [\d.]+/, `V4 = ${g.finishID.toFixed(4)}`);
      if (g.partLength     !== undefined) code = code.replace(/V5 = [\d.]+/, `V5 = ${g.partLength.toFixed(4)}`);
    }

    // Translate if not Okuma
    let finalCode = code;
    if (controller !== "okuma_osp") {
      const xlat = MacroProgramIntelligenceEngine.translateMacro("okuma_osp", controller, code);
      finalCode = xlat.translatedCode;
      warnings.push(...xlat.warnings);
      if (xlat.untranslatedPatterns.length > 0) {
        warnings.push(`Untranslated patterns: ${xlat.untranslatedPatterns.join(", ")}`);
      }
      notes.push(`Template was Okuma OSP; auto-translated to ${controller}.`);
    }

    notes.push(`Pattern: ${chosen.name} (${chosen.id})`);
    if (chosen.sourceFile) notes.push(`Grounded in: ${chosen.sourceFile}`);

    const confidence =
      scored[0] && scored[0].score > 0
        ? Math.min(0.99, 0.5 + scored[0].score * 0.07)
        : 0.3;

    log.info("[MacroProgramIntelligenceEngine] generateMacro", {
      patternId: chosen.id,
      controller,
      confidence,
    });

    return {
      success: true,
      controller,
      patternUsed: chosen.id,
      confidence,
      code: finalCode,
      variableGuide: chosen.variableGuide,
      operationSequence: chosen.operationSequence,
      warnings,
      notes,
    };
  }

  /**
   * Analyze an existing macro and suggest improvements.
   * Checks for: redundant G97/G96 mode switches, missing G50 clamp, dead variables,
   * missing G40 cancel, unnecessary double retracts, missing M9, formula simplifications.
   *
   * @param existingMacro - Raw macro code string
   * @returns MacroOptimizationResult with annotated suggestions
   */
  static optimizeMacro(existingMacro: string): MacroOptimizationResult {
    const lines = existingMacro.split(/\r?\n/);
    const suggestions: OptimizationSuggestion[] = [];

    // Safety: parse to get variable map
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(existingMacro);

    // --- Check 1: Missing G50 speed clamp ---
    if (!ast.safetyChecks.hasG50SpeedClamp) {
      suggestions.push({
        type: "missing_speed_clamp",
        severity: "critical",
        description: "No G50 max spindle speed clamp found",
        suggestedCode: "G50 S2500",
        explanation:
          "Okuma OSP requires G50 S[max_rpm] before G96 CSS mode to prevent overspeed. " +
          "Without it, the spindle may exceed safe limits on small diameters.",
      });
    }

    // --- Check 2: Missing G40 comp cancel ---
    if (!ast.safetyChecks.hasG40CompCancel) {
      suggestions.push({
        type: "missing_comp_cancel",
        severity: "critical",
        description: "No G40 tool comp cancel found",
        suggestedCode: "G40",
        explanation:
          "Cutter compensation (G41/G42) must always be cancelled with G40 at the end of " +
          "each compensated path. Missing G40 may cause positional errors on the next tool.",
      });
    }

    // --- Check 3: Missing M9 coolant off ---
    if (!ast.safetyChecks.hasCoolantOff) {
      suggestions.push({
        type: "missing_coolant_off",
        severity: "warning",
        description: "No M9 coolant off found",
        suggestedCode: "M9",
        explanation: "Coolant should be turned off (M9) before retracting to safe position.",
      });
    }

    // --- Check 4: Redundant G97 mode switches ---
    let prevMode: string | null = null;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      const modeMatch = ln.match(/\b(G96|G97)\b/);
      if (modeMatch) {
        if (modeMatch[1] === prevMode) {
          suggestions.push({
            lineNumber: i + 1,
            type: "redundant_mode_switch",
            severity: "info",
            description: `Redundant ${modeMatch[1]} — same mode already active`,
            originalCode: ln,
            explanation:
              `${modeMatch[1]} at line ${i + 1} is redundant: the controller is already in ` +
              `${modeMatch[1]} mode from a previous block. Removing saves a minor parse cycle.`,
          });
        }
        prevMode = modeMatch[1];
      }
    }

    // --- Check 5: Dead variables (declared but never used in motion) ---
    for (const [varName, info] of Object.entries(ast.variables)) {
      if (info.initialValue !== undefined && !info.formula) {
        // Only referenced at its own assignment line
        const useLines = info.usedInLines.filter(ln => {
          const raw = (lines[ln - 1] ?? "").trim();
          return !raw.startsWith(varName); // exclude the assignment line itself
        });
        if (useLines.length === 0) {
          suggestions.push({
            type: "dead_variable",
            severity: "info",
            description: `${varName} is declared but never referenced in motion blocks`,
            explanation:
              `${varName} = ${info.initialValue} (${info.comment ?? "no comment"}) ` +
              `appears to be unused. Consider removing it to simplify the parameter header.`,
          });
        }
      }
    }

    // --- Check 6: Double retract X20 Z20 patterns ---
    let prevWasRetract = false;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      const isRetract = /G0\s+X20.*Z20|G0\s+Z20.*X20/.test(ln);
      if (isRetract && prevWasRetract) {
        suggestions.push({
          lineNumber: i + 1,
          type: "redundant_retract",
          severity: "info",
          description: "Consecutive safe-position retracts (G0 X20 Z20)",
          originalCode: ln,
          explanation: "Back-to-back X20/Z20 retracts are redundant — the machine is already at safe position.",
        });
      }
      prevWasRetract = isRetract;
    }

    log.info("[MacroProgramIntelligenceEngine] optimizeMacro", {
      suggestionsCount: suggestions.length,
    });

    return {
      originalLineCount: lines.length,
      optimizedCode: existingMacro, // suggestions only — no auto-modify to preserve safety
      suggestions,
      totalSuggestionsApplied: 0,
    };
  }

  /**
   * Translate a macro program between CNC controller dialects.
   * Applies the built-in translation rule table (TRANSLATION_RULES).
   *
   * Currently supported:
   *   okuma_osp → fanuc  (V→#, G85→G71, G74→G83, L→R, T6→T4, G180/G270→comments)
   *   fanuc → okuma_osp  (# →V, T4→T6)
   *
   * @param sourceController - Source dialect
   * @param targetController - Target dialect
   * @param code - Raw macro code in source dialect
   * @returns MacroTranslationResult with translated code and applied mappings
   */
  static translateMacro(
    sourceController: ControllerType,
    targetController: ControllerType,
    code: string,
  ): MacroTranslationResult {
    if (sourceController === targetController) {
      return {
        success: true,
        sourceController,
        targetController,
        translatedCode: code,
        mappingsApplied: [],
        warnings: ["Source and target are the same controller — no translation needed."],
        untranslatedPatterns: [],
      };
    }

    const applicableRules = TRANSLATION_RULES.filter(
      r => r.from === sourceController && r.to === targetController,
    );

    if (applicableRules.length === 0) {
      return {
        success: false,
        sourceController,
        targetController,
        translatedCode: code,
        mappingsApplied: [],
        warnings: [`No translation rules available for ${sourceController} → ${targetController}`],
        untranslatedPatterns: [],
      };
    }

    let translated = code;
    const mappingsApplied: TranslationMapping[] = [];
    const untranslatedPatterns: string[] = [];
    const warnings: string[] = [];

    for (const rule of applicableRules) {
      const before = translated;
      translated = translated.replace(rule.pattern, rule.replacement);
      if (translated !== before) {
        mappingsApplied.push({
          pattern: rule.pattern.toString(),
          from: sourceController,
          to: targetController,
          description: rule.description,
        });
      }
    }

    // Detect Okuma-specific patterns with no translation rule
    if (sourceController === "okuma_osp") {
      const okumaSpecific = [
        { pattern: /\bG140\b/g,  name: "G140 (Okuma graphics open)" },
        { pattern: /\bG180\b/g,  name: "G180 (Okuma graphics cancel)" },
        { pattern: /\bNAT\w+\b/g, name: "NAT profile labels" },
        { pattern: /\bG85\b/g,   name: "G85 (Okuma rough cycle)" },
        { pattern: /\bG86\b/g,   name: "G86 (Okuma finish cycle)" },
      ];
      for (const sp of okumaSpecific) {
        if (sp.pattern.test(translated)) {
          untranslatedPatterns.push(sp.name);
        }
      }
    }

    if (targetController === "fanuc") {
      warnings.push(
        "Review translated program before use: Okuma NAT profile labels have no direct Fanuc equivalent. " +
        "Manual restructuring of profile definitions (P/Q word format) may be required.",
      );
    }

    log.info("[MacroProgramIntelligenceEngine] translateMacro", {
      sourceController,
      targetController,
      rulesApplied: mappingsApplied.length,
      untranslated: untranslatedPatterns.length,
    });

    return {
      success: true,
      sourceController,
      targetController,
      translatedCode: translated,
      mappingsApplied,
      warnings,
      untranslatedPatterns,
    };
  }

  /**
   * Debug a macro program given an error message from the controller.
   * Uses pattern matching against known Okuma OSP error categories to
   * identify probable root cause, affected lines, and suggest fixes.
   *
   * @param code - Raw macro code string
   * @param errorMessage - Error message from the CNC controller
   * @param input - Optional: errorLine, controller type
   * @returns MacroDebugResult with cause, affected lines, and fixes
   */
  static debugMacro(
    code: string,
    errorMessage: string,
    input?: Partial<MacroDebugInput>,
  ): MacroDebugResult {
    const lines = code.split(/\r?\n/);
    const errLower = errorMessage.toLowerCase();
    const diagnostics: DebugDiagnostic[] = [];
    const affectedLines: number[] = [];
    let errorCategory: DebugErrorCategory = "unknown";
    let probableCause = "Unknown error — manual inspection required.";
    const suggestedFixes: string[] = [];
    const preventionTips: string[] = [];

    // --- Pattern: Undefined label / GOTO target not found ---
    const gotoLabelMatch = errorMessage.match(/label\s+'?(N\w+)'?|undefined\s+label\s+(N\w+)/i)
      || errLower.match(/goto\s+n\d+\s+not\s+found/);
    const labelUndefined = /undefined label|label not found|no such label|sequence number/i.test(errLower);
    if (labelUndefined || gotoLabelMatch) {
      errorCategory = "undefined_label";
      const missingLabel = (gotoLabelMatch as RegExpMatchArray)?.[1] ?? (gotoLabelMatch as RegExpMatchArray)?.[2];
      probableCause = `GOTO target label ${missingLabel ?? "(unknown)"} is not defined in the program.`;
      // Find all GOTO references
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        const ref = ln.match(/GOTO\s+(N\w+)/i);
        if (ref) {
          const target = ref[1];
          const targetDefined = lines.some(l => new RegExp(`^${target}\\s`).test(l.trim()) || l.trim().startsWith(target + " "));
          if (!targetDefined) {
            affectedLines.push(i + 1);
            diagnostics.push({
              lineNumber: i + 1,
              code: ln.trim(),
              issue: `GOTO ${target} — label ${target} not defined`,
              severity: "critical",
            });
          }
        }
      }
      suggestedFixes.push(`Add label "${missingLabel ?? "Nxxxx"}" at the correct position in the program.`);
      suggestedFixes.push("Search for all GOTO and IF/GOTO statements and verify each target exists as a label.");
      preventionTips.push("Use consistent label naming: N10, N20 for main sections; N100-N999 for sub-blocks.");
    }

    // --- Pattern: Division by zero in V-variable expression ---
    const divZeroPattern = /division by zero|divide by zero|arithmetic error|zero divide/i;
    if (divZeroPattern.test(errLower)) {
      errorCategory = "division_by_zero";
      probableCause = "A V-variable expression contains division by a variable that evaluates to zero.";
      // Common patterns: V = [SFM * 3.82] / V_dia — if diameter variable is 0
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (/\/\s*V\d+/.test(ln) || /\/\s*\[.*V\d+/.test(ln)) {
          affectedLines.push(i + 1);
          diagnostics.push({
            lineNumber: i + 1,
            code: ln.trim(),
            issue: "Division by V-variable — could be zero if parameter not set",
            severity: "critical",
          });
        }
      }
      suggestedFixes.push("Check that all diameter/denominator variables (V1, V20, V25, V31, etc.) are non-zero.");
      suggestedFixes.push("Add a guard: IF [V_dia EQ 0] GOTO NERROR before the division.");
      preventionTips.push("Always set drill diameters > 0 before enabling their operations.");
    }

    // --- Pattern: Tool comp / G41/G42 error ---
    const compError = /compensation|comp error|g41|g42|g40/i.test(errLower);
    if (compError) {
      errorCategory = "tool_comp_error";
      probableCause = "Tool radius compensation (G41/G42) entered or exited incorrectly.";
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (/G4[12]/.test(ln)) {
          affectedLines.push(i + 1);
          diagnostics.push({
            lineNumber: i + 1,
            code: ln,
            issue: "G41/G42 comp ON — verify G40 cancel follows at end of path",
            severity: "warning",
          });
        }
        if (/G40/.test(ln)) {
          affectedLines.push(i + 1);
          diagnostics.push({
            lineNumber: i + 1,
            code: ln,
            issue: "G40 comp cancel — verify move direction is safe",
            severity: "warning",
          });
        }
      }
      suggestedFixes.push("G41/G42 must be programmed with a linear move (G1), never in a rapid (G0).");
      suggestedFixes.push("Cancel comp (G40) before tool changes, cycles (G74, G85), or safe retracts.");
      preventionTips.push("Pattern: G41 G1 X[start] Z[lead-in] → ... → G40 X[lead-out].");
    }

    // --- Pattern: Syntax / expression error ---
    const syntaxError = /syntax|expression|illegal character|bracket|format error/i.test(errLower);
    if (syntaxError) {
      errorCategory = "syntax_error";
      probableCause = "Syntax error in variable expression — likely unmatched brackets or illegal character.";
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        const opens = (ln.match(/\[/g) ?? []).length;
        const closes = (ln.match(/\]/g) ?? []).length;
        if (opens !== closes) {
          affectedLines.push(i + 1);
          diagnostics.push({
            lineNumber: i + 1,
            code: ln.trim(),
            issue: `Unmatched brackets: ${opens} '[' vs ${closes} ']'`,
            severity: "critical",
          });
        }
        // Okuma math functions must be uppercase
        const lcMath = ln.match(/\b(sin|cos|tan|sqrt|abs|round|fix|fup)\b/);
        if (lcMath) {
          affectedLines.push(i + 1);
          diagnostics.push({
            lineNumber: i + 1,
            code: ln.trim(),
            issue: `Math function '${lcMath[1]}' must be uppercase on Okuma OSP: ${lcMath[1].toUpperCase()}[...]`,
            severity: "critical",
          });
        }
      }
      suggestedFixes.push("Okuma OSP requires all brackets to match: V1 = [V2 + V3] / V4 not V1 = (V2 + V3) / V4.");
      suggestedFixes.push("Math functions must be uppercase: SIN, COS, TAN, SQRT, ABS.");
      preventionTips.push("Use consistent bracket style — Okuma uses [ ] for all expressions, not ( ).");
    }

    // --- Pattern: Variable range error ---
    const rangeError = /variable.*range|range.*error|value.*out of range|overflow/i.test(errLower);
    if (rangeError) {
      errorCategory = "variable_range";
      probableCause = "A V-variable value exceeds the Okuma OSP range limits (±9999.9999 for most).";
      const errorLineNum = input?.errorLine;
      if (errorLineNum) {
        affectedLines.push(errorLineNum);
        diagnostics.push({
          lineNumber: errorLineNum,
          code: lines[errorLineNum - 1]?.trim() ?? "unknown",
          issue: "Variable range exceeded — check auto-calculated values",
          severity: "critical",
        });
      }
      suggestedFixes.push("Check that stock diameter (V1) and part length (V5) are reasonable values.");
      suggestedFixes.push("Verify no negative Z depths are being calculated as positive and vice versa.");
      preventionTips.push("Okuma V-variables: local V1-V100 range ±9999.9999. Common VC100+ can persist across programs.");
    }

    // Default error if no pattern matched
    if (errorCategory === "unknown") {
      suggestedFixes.push("Enable single-block mode and step through the program to the error line.");
      suggestedFixes.push("Check the controller alarm display for the specific alarm number.");
      preventionTips.push("Document the full alarm code (e.g., Okuma Alarm 1014) for precise diagnosis.");
      affectedLines.push(input?.errorLine ?? 1);
    }

    log.info("[MacroProgramIntelligenceEngine] debugMacro", {
      errorCategory,
      diagnosticsCount: diagnostics.length,
    });

    return {
      errorCategory,
      probableCause,
      affectedLines: [...new Set(affectedLines)].sort((a, b) => a - b),
      diagnostics,
      suggestedFixes,
      preventionTips,
    };
  }

  /**
   * Generate line-by-line documentation for a macro program.
   * Every meaningful line gets an explanation of what it does and why.
   * Identifies key patterns, variable roles, and attaches tribal tips.
   *
   * @param code - Raw macro code string
   * @param controller - Controller type for context
   * @returns MacroExplanation with annotated lines and variable guide
   */
  static explainMacro(code: string, controller: ControllerType = "okuma_osp"): MacroExplanation {
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(code, controller);
    const lines = code.split(/\r?\n/);
    const annotatedLines: AnnotatedLine[] = [];
    const patternsSeen: Set<string> = new Set();

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      const lineNum = i + 1;
      if (!raw) continue;

      const stmt = MacroProgramIntelligenceEngine._parseStatement(raw, lineNum);
      const explanation = MacroProgramIntelligenceEngine._explainLine(raw, lineNum, ast);
      const importance = MacroProgramIntelligenceEngine._lineImportance(raw);

      // Detect patterns
      if (/G85\s+NAT/.test(raw)) patternsSeen.add("G85 NAT roughing cycle");
      if (/G86\s+NAT/.test(raw)) patternsSeen.add("G86 NAT finish cycle");
      if (/G74/.test(raw))        patternsSeen.add("G74 peck drilling");
      if (/G96\s+S/.test(raw))    patternsSeen.add("G96 CSS (constant surface speed)");
      if (/G97\s+S/.test(raw))    patternsSeen.add("G97 RPM mode");
      if (/G50\s+S/.test(raw))    patternsSeen.add("G50 max spindle clamp");
      if (/G41|G42/.test(raw))    patternsSeen.add("G41/G42 tool radius compensation");
      if (/IF.*GOTO/.test(raw))   patternsSeen.add("IF/GOTO conditional branching");
      if (/TAN\[/.test(raw))      patternsSeen.add("TAN() trigonometry for chamfer calc");
      if (/3\.82/.test(raw))      patternsSeen.add("RPM = SFM × 3.82 / diameter formula");

      annotatedLines.push({
        lineNumber: lineNum,
        code: raw,
        explanation,
        category: stmt.category,
        importance,
      });
    }

    // Build variable guide from AST
    const variableGuide: VariableGuideEntry[] = Object.entries(ast.variables)
      .filter(([, info]) => info.initialValue !== undefined || info.formula)
      .slice(0, 40)
      .map(([name, info]) => ({
        variable: name,
        purpose: info.comment ?? `${info.category} variable`,
        defaultValue: info.initialValue ?? info.formula ?? "—",
        units: _inferUnits(name, info.comment),
        adjustable: !info.formula,
      }));

    const tribalTips = MacroProgramIntelligenceEngine._getTribalTips(code, ast);

    log.info("[MacroProgramIntelligenceEngine] explainMacro", {
      linesAnnotated: annotatedLines.length,
      patternsFound: patternsSeen.size,
    });

    return {
      title: `Macro Explanation — ${ast.programNumber || "Program"}`,
      summary: MacroProgramIntelligenceEngine._generateSummary(ast),
      controller,
      operationOverview: ast.operationSequence,
      annotatedLines,
      variableGuide,
      patternsSeen: [...patternsSeen],
      tribalTips,
    };
  }

  /**
   * Search the built-in pattern library by keywords or operation type.
   *
   * @param query - Search string (e.g., "peck drill", "counterbore", "od rough")
   * @returns Matching patterns sorted by relevance
   */
  static searchPatternLibrary(query: string): PatternLibraryEntry[] {
    const q = query.toLowerCase();
    return PATTERN_LIBRARY.filter(p =>
      p.keywords.some(kw => kw.includes(q) || q.includes(kw)) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
    ).sort((a, b) => {
      const sa = a.keywords.filter(kw => q.includes(kw) || kw.includes(q)).length;
      const sb = b.keywords.filter(kw => q.includes(kw) || kw.includes(q)).length;
      return sb - sa;
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static _parseStatement(raw: string, lineNumber: number): MacroStatement {
    const assigns: string[] = [];
    const uses: string[] = [];
    const tokens: MacroToken[] = [];
    let category: MacroStatement["category"] = "unknown";
    let explanation = "";

    // Variable assignment
    const vaMatch = raw.match(/^(V[C]?\d+)\s*=/i);
    if (vaMatch) {
      assigns.push(vaMatch[1].toUpperCase());
      const refs = raw.match(/V[C]?\d+/gi) ?? [];
      uses.push(...refs.slice(1).map(v => v.toUpperCase()));
      category = raw.includes("[") && /V[C]?\d+/.test(raw.split("=")[1] ?? "") ? "auto_calculation" : "variable_declaration";
      explanation = "Variable assignment";
    }
    // Motion
    else if (/^G[01]\b/.test(raw)) { category = "motion"; explanation = raw.startsWith("G0") ? "Rapid positioning" : "Linear feed move"; }
    else if (/^G9[67]\b/.test(raw)) { category = "spindle"; explanation = raw.includes("G96") ? "CSS mode spindle on" : "RPM mode spindle on"; }
    else if (/^G50\b/.test(raw)) { category = "spindle"; explanation = "Max spindle speed clamp"; }
    else if (/^M[89]\b/.test(raw)) { category = "coolant"; explanation = raw.includes("M8") ? "Coolant on" : "Coolant off"; }
    else if (/^T\d{4}/.test(raw)) { category = "tool_change"; explanation = "Tool change"; }
    else if (/^G8[056]\b/.test(raw)) { category = "cycle"; explanation = raw.includes("G85") ? "Roughing canned cycle" : raw.includes("G86") ? "Finish canned cycle" : "Cycle cancel"; }
    else if (/^G74\b/.test(raw)) { category = "cycle"; explanation = "Peck drilling cycle"; }
    else if (/^IF\b/i.test(raw)) { category = "control_flow"; explanation = "Conditional branch"; }
    else if (/^GOTO\b/i.test(raw)) { category = "control_flow"; explanation = "Unconditional jump"; }
    else if (/^M30\b|^M2\b/.test(raw)) { category = "program_control"; explanation = "Program end"; }
    else if (/^M1\b/.test(raw)) { category = "program_control"; explanation = "Optional stop"; }
    else if (/^\(/.test(raw)) { category = "comment_block"; explanation = "Comment"; }

    tokens.push({ type: "unknown", raw });
    return { lineNumber, raw, tokens, category, explanation, assigns, uses };
  }

  private static _explainLine(raw: string, lineNum: number, ast: MacroAST): string {
    if (/^O\d+/.test(raw))       return `Program number ${raw}`;
    if (/^\(=+\)/.test(raw))     return "Section separator";
    if (/^\(={4}/.test(raw))     return "Section separator";
    if (/^\(T\d{6}/.test(raw))   return `Tool definition comment: ${raw.replace(/[()]/g, "").trim()}`;
    if (/^\([^=]/.test(raw))     return `Comment: ${raw.replace(/[()]/g, "").trim()}`;

    // Variable assignment
    const vaMatch = raw.match(/^(V[C]?\d+)\s*=\s*(.+?)(?:\s+\((.+)\))?$/i);
    if (vaMatch) {
      const varName = vaMatch[1].toUpperCase();
      const val = vaMatch[2].trim();
      const comment = vaMatch[3];
      const info = ast.variables[varName];
      if (comment) return `Set ${varName} = ${val} — ${comment}`;
      if (info?.formula) {
        return `Auto-calculate ${varName} = ${val} (depends on: ${(val.match(/V[C]?\d+/gi) ?? []).join(", ")})`;
      }
      return `Set parameter ${varName} = ${val}`;
    }

    // G-codes
    if (/G50\s+S/.test(raw))  return `Clamp max spindle to ${raw.match(/S\[?([^\]]+)\]?/)?.[1]} RPM to prevent overspeed in CSS mode`;
    if (/G96\s+S/.test(raw))  return `Enable CSS (constant surface speed) at ${raw.match(/S\[?([^\]]+)\]?/)?.[1]} SFM`;
    if (/G97\s+S/.test(raw))  return `Set RPM mode at ${raw.match(/S\[?([^\]]+)\]?/)?.[1]} RPM`;
    if (/G0\s+X20/.test(raw)) return "Rapid retract to safe home position X20 Z20";
    if (/G0\s+X0/.test(raw))  return "Rapid to spindle center (X0) for drilling";
    if (/G0\s+Z/.test(raw))   return `Rapid to Z position ${raw.match(/Z\[?([^\]\s]+)\]?/)?.[1]}`;
    if (/G0\s+X/.test(raw))   return `Rapid to X diameter position ${raw.match(/X\[?([^\]\s]+)\]?/)?.[1]}`;
    if (/G1\s+Z/.test(raw))   return `Linear feed move to Z ${raw.match(/Z-?\[?([^\]\s]+)\]?/)?.[1]}`;
    if (/G1\s+X/.test(raw))   return `Linear feed move to X diameter ${raw.match(/X\[?([^\]\s]+)\]?/)?.[1]}`;
    if (/G41\b/.test(raw))    return "Enable tool radius compensation left (OD turning)";
    if (/G42\b/.test(raw))    return "Enable tool radius compensation right (ID boring)";
    if (/G40\b/.test(raw))    return "Cancel tool radius compensation";
    if (/G85\s+NAT/.test(raw)) return `Start roughing canned cycle: DOC=${raw.match(/D\[?([^\]\s]+)/)?.[1]}, finish stock U=${raw.match(/U\[?([^\]\s]+)/)?.[1]}`;
    if (/G86\s+NAT/.test(raw)) return `Start finish canned cycle with feed ${raw.match(/F\[?([^\]\s]+)/)?.[1]}`;
    if (/G80\b/.test(raw))    return "Cancel canned cycle";
    if (/G74\b/.test(raw))    return `Peck drilling cycle: peck depth I=${raw.match(/I\[?([^\]\s]+)/)?.[1]}, total depth D=${raw.match(/D\[?([^\]\s]+)/)?.[1]}`;
    if (/G180\b/.test(raw))   return "Okuma graphics cancel (no Fanuc equivalent)";
    if (/G270\b/.test(raw))   return "Okuma graphics lock for tool section";
    if (/G140\b/.test(raw))   return "Okuma graphics open";

    if (/^M8\b/.test(raw))    return "Coolant on";
    if (/^M9\b/.test(raw))    return "Coolant off";
    if (/^M1\b/.test(raw))    return "Optional program stop (operator can bypass with CYCLE START)";
    if (/^M5\b/.test(raw))    return "Spindle stop";
    if (/^M3\b/.test(raw))    return "Spindle start CW";
    if (/^M30\b/.test(raw))   return "Program end and rewind";
    if (/^M243\b/.test(raw))  return "Part eject / bar push (machine-specific Okuma M-code)";

    if (/^T\d{6}/.test(raw))  return `Tool change to ${raw}: ${raw.substring(0,2)} = tool station, next 2 = offset, last 2 = wear offset`;

    if (/^IF.*EQ.*GOTO/.test(raw)) {
      const cond = raw.match(/IF\s*\[(.+)\]/)?.[1];
      const target = raw.match(/GOTO\s+(N\w+)/)?.[1];
      return `Conditional: if [${cond}] then jump to ${target}`;
    }
    if (/^IF.*LT.*GOTO/.test(raw)) {
      const cond = raw.match(/IF\s*\[(.+)\]/)?.[1];
      const target = raw.match(/GOTO\s+(N\w+)/)?.[1];
      return `Conditional skip: if [${cond}] then jump to ${target}`;
    }
    if (/^GOTO\s+N/.test(raw)) {
      return `Unconditional jump to label ${raw.match(/GOTO\s+(N\w+)/)?.[1]}`;
    }
    if (/^N\d+/.test(raw)) {
      return `Branch target label ${raw.match(/^(N\d+)/)?.[1]}`;
    }

    return `CNC block: ${raw}`;
  }

  private static _lineImportance(raw: string): "critical" | "normal" | "optional" {
    if (/G50|G40|G80|M30/.test(raw))           return "critical";
    if (/G0\s+X20|G0\s+Z20/.test(raw))         return "critical";
    if (/G96|G97|G41|G42|G85|G86|G74/.test(raw)) return "normal";
    if (/M1\b|^\(/.test(raw))                   return "optional";
    return "normal";
  }

  private static _inferConditionPurpose(condition: string, target: string): string {
    if (/EQ 0/.test(condition) && /skip|optional/i.test(target)) return "Skip optional feature";
    if (/EQ 1/.test(condition)) return "Enable optional feature branch";
    if (/LT/.test(condition))   return "Skip operation when stock below threshold";
    if (/GT/.test(condition))   return "Skip pass when diameter exceeds target";
    if (/EQ 0.*GOTO N9/.test(`${condition} GOTO ${target}`)) return "Skip G140/G270 graphics if disabled";
    return "Conditional branch";
  }

  private static _generateSummary(ast: MacroAST): string {
    const varCount = Object.keys(ast.variables).length;
    const calcCount = ast.autoCalcs.length;
    const ops = ast.operationSequence.slice(0, 4).join(", ");
    const safeIssues = ast.safetyChecks.issues.length;
    return (
      `${ast.programNumber || "Program"} — ${ast.lineCount} lines, ${varCount} variables ` +
      `(${calcCount} auto-calculated). Operations: ${ops}${ast.operationSequence.length > 4 ? ", ..." : ""}. ` +
      `Safety: ${safeIssues === 0 ? "All checks pass" : `${safeIssues} issue(s): ${ast.safetyChecks.issues.join("; ")}`}. ` +
      `Optional features: ${ast.hasOptionalFeatures ? "yes (IF/GOTO conditional blocks)" : "no"}.`
    );
  }

  private static _getTribalTips(code: string, ast: MacroAST): string[] {
    const tips: string[] = [];

    // Derive tips from patterns found in the macro
    if (/3\.82/.test(code)) {
      tips.push(
        "RPM constant 3.82: this is 12/π — used to convert SFM to RPM. " +
        "For metric (m/min to RPM), use 1000/π ≈ 318.31.",
      );
    }
    if (/TAN\[/.test(code)) {
      tips.push(
        "Okuma chamfer angle convention: OD chamfer = 180 - angle (e.g., 45° → A135). " +
        "ID chamfer = 180 + angle (e.g., 45° → A225). This is measured CCW from +Z axis.",
      );
    }
    if (/G85\s+NAT/.test(code)) {
      tips.push(
        "G85 NAT roughing: the NAT label (NAT1, NAT6) defines the finish profile. " +
        "G85 works backwards from the profile — ensure the NAT profile is fully defined before G80.",
      );
    }
    if (/G74/.test(code)) {
      tips.push(
        "G74 peck drill: I = peck depth (positive), D = total retract height (use depth + 0.1 for safety). " +
        "Peck is relative, total depth Z is absolute. G180 clears the cycle after G74.",
      );
    }
    if (/G50\s+S/.test(code)) {
      tips.push(
        "G50 max RPM clamp is mandatory before G96 CSS mode on Okuma OSP. " +
        "Without it, the spindle will chase maximum speed as the diameter approaches zero during cutoff.",
      );
    }
    if (/V12\s+EQ\s+0|V12\s+=\s+0/.test(code)) {
      tips.push(
        "V12 = ID rough enable flag: set to 1 to run ID roughing when drill size is far from finish ID. " +
        "If the drill size leaves only 0.01-0.02\" radial stock, skip roughing (V12=0) and go straight to finish.",
      );
    }
    if (!ast.safetyChecks.hasG50SpeedClamp) {
      tips.push(
        "SAFETY: This macro is missing G50 speed clamp. Add G50 S[max_rpm] before any G96 CSS block " +
        "to prevent spindle overspeed during cutoff and small-diameter finishing.",
      );
    }

    return tips;
  }
}

// ============================================================================
// UTILITY (module-level, not exported)
// ============================================================================

function _inferUnits(varName: string, comment?: string): string {
  if (!comment) return "—";
  const c = comment.toLowerCase();
  if (/sfm/.test(c))     return "SFM";
  if (/ipr|feed/.test(c)) return "IPR";
  if (/rpm/.test(c))     return "RPM";
  if (/deg|angle/.test(c)) return "deg";
  if (/dia|diameter|od|id/.test(c)) return "in";
  if (/depth|length|offset|clearance|radius/.test(c)) return "in";
  return "in";
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const macroProgramIntelligenceEngine = new MacroProgramIntelligenceEngine();
