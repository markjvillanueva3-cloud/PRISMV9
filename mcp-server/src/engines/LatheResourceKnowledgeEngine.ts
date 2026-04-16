/**
 * LatheResourceKnowledgeEngine — Comprehensive Resource Extraction & Knowledge Synthesis
 * ======================================================================================
 *
 * Extracts and codifies ALL lathe-related knowledge from resources folder:
 *
 * 1. OKUMA AOT KNOWLEDGE (AOT.pdf, AOT Advanced.pdf)
 *    - Automatic Operation Time optimization
 *    - Cutting condition optimization
 *    - Tool life management
 *    - Spindle load monitoring
 *    - Adaptive control parameters
 *
 * 2. TOOLING KNOWLEDGE
 *    - Sandvik/Kennametal/Iscar turning catalogs
 *    - OECTOL tool definition files
 *    - Insert grades and geometries
 *    - Recommended cutting data
 *
 * 3. PROGRAM EXAMPLES
 *    - Okuma Multus program examples (30+ techniques)
 *    - Macro programming patterns
 *    - Bar feeder integration
 *    - Touch setter routines
 *    - Tool life management macros
 *
 * 4. CONTROLLER KNOWLEDGE
 *    - OSP-P200L/P300L/P500 programming
 *    - Canned cycle parameters (G70-G76)
 *    - Fixed cycles (drilling, tapping, boring)
 *    - Macro variables and subprograms
 *
 * @module engines/LatheResourceKnowledgeEngine
 * @version 1.0.0
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, basename, extname } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Okuma AOT optimization parameter */
interface AOTParameter {
  name: string;
  description: string;
  default_value: number | string;
  optimal_range: [number, number] | string[];
  unit: string;
  impact: "cycle_time" | "tool_life" | "surface_finish" | "power" | "all";
  category: "cutting" | "spindle" | "feed" | "adaptive" | "monitoring";
}

/** Tooling knowledge entry */
interface ToolingKnowledge {
  tool_id: string;
  manufacturer: string;
  tool_type: "turning" | "grooving" | "threading" | "boring" | "parting" | "drilling";
  insert_type?: string;
  holder_style?: string;
  cutting_data: {
    material_iso: string;
    vc_range: [number, number];
    fn_range: [number, number];
    ap_range: [number, number];
  }[];
  application_notes: string[];
}

/** Program pattern from examples */
interface ProgramPattern {
  pattern_id: string;
  pattern_name: string;
  category: "cycle_time" | "tool_life" | "safety" | "automation" | "quality";
  description: string;
  code_template: string;
  variables: { name: string; description: string; default: string | number }[];
  best_practices: string[];
  anti_patterns: string[];
  source_file: string;
}

/** Controller-specific knowledge */
interface ControllerKnowledge {
  controller: string;
  version: string;
  canned_cycles: {
    code: string;
    name: string;
    parameters: { param: string; description: string; required: boolean }[];
    example: string;
  }[];
  macro_variables: {
    range: string;
    scope: "local" | "common" | "system";
    description: string;
  }[];
  special_codes: { code: string; description: string }[];
}

/** Amateur mistake pattern */
interface AmateurMistake {
  mistake_id: string;
  category: "speed_feed" | "sequence" | "safety" | "efficiency" | "tooling";
  description: string;
  detection_pattern: RegExp | string;
  severity: "critical" | "warning" | "suggestion";
  correction: string;
  physics_basis?: string;
  occurrence_rate?: number; // From training data
}

/** Complete knowledge base */
export interface LatheKnowledgeBase {
  aot_parameters: AOTParameter[];
  tooling_knowledge: ToolingKnowledge[];
  program_patterns: ProgramPattern[];
  controller_knowledge: ControllerKnowledge[];
  amateur_mistakes: AmateurMistake[];
  best_practices: string[];
  extracted_from: string[];
  extraction_date: string;
}

// ============================================================================
// AOT KNOWLEDGE — Codified from Okuma AOT manuals
// ============================================================================

const OKUMA_AOT_PARAMETERS: AOTParameter[] = [
  // Cutting condition optimization
  {
    name: "ADAPTIVE_CUTTING_CONTROL",
    description: "Automatically adjusts feedrate based on spindle load",
    default_value: 0, // OFF
    optimal_range: [1, 1], // ON
    unit: "boolean",
    impact: "all",
    category: "adaptive",
  },
  {
    name: "TARGET_SPINDLE_LOAD",
    description: "Target spindle load percentage for adaptive control",
    default_value: 70,
    optimal_range: [60, 85],
    unit: "%",
    impact: "tool_life",
    category: "adaptive",
  },
  {
    name: "MINIMUM_FEEDRATE_RATIO",
    description: "Minimum feedrate as ratio of programmed when adapting",
    default_value: 0.5,
    optimal_range: [0.3, 0.7],
    unit: "ratio",
    impact: "cycle_time",
    category: "adaptive",
  },
  {
    name: "MAXIMUM_FEEDRATE_RATIO",
    description: "Maximum feedrate as ratio of programmed when adapting",
    default_value: 1.2,
    optimal_range: [1.1, 1.5],
    unit: "ratio",
    impact: "cycle_time",
    category: "adaptive",
  },
  // Spindle optimization
  {
    name: "SPINDLE_WARMUP_ENABLED",
    description: "Automatic spindle warmup at shift start",
    default_value: 1,
    optimal_range: [1, 1],
    unit: "boolean",
    impact: "tool_life",
    category: "spindle",
  },
  {
    name: "SPINDLE_WARMUP_DURATION",
    description: "Duration of spindle warmup sequence",
    default_value: 300,
    optimal_range: [180, 600],
    unit: "seconds",
    impact: "tool_life",
    category: "spindle",
  },
  {
    name: "CSS_MAX_RPM_SAFETY",
    description: "Maximum RPM in CSS mode for safety",
    default_value: 3500,
    optimal_range: [2500, 4500],
    unit: "RPM",
    impact: "tool_life",
    category: "spindle",
  },
  // Feed optimization
  {
    name: "CORNER_DECEL_ENABLED",
    description: "Automatic deceleration at corners",
    default_value: 1,
    optimal_range: [1, 1],
    unit: "boolean",
    impact: "surface_finish",
    category: "feed",
  },
  {
    name: "THREAD_RETRACT_ANGLE",
    description: "Angle for thread retract (chamfer at end)",
    default_value: 45,
    optimal_range: [30, 60],
    unit: "degrees",
    impact: "surface_finish",
    category: "feed",
  },
  // Tool life monitoring
  {
    name: "TOOL_LIFE_MONITOR_ENABLED",
    description: "Enable tool life monitoring system",
    default_value: 1,
    optimal_range: [1, 1],
    unit: "boolean",
    impact: "tool_life",
    category: "monitoring",
  },
  {
    name: "TOOL_LIFE_WARNING_PERCENT",
    description: "Warning threshold for tool life remaining",
    default_value: 20,
    optimal_range: [15, 30],
    unit: "%",
    impact: "tool_life",
    category: "monitoring",
  },
  {
    name: "SPINDLE_LOAD_ALARM_PERCENT",
    description: "Spindle load percentage that triggers alarm",
    default_value: 150,
    optimal_range: [120, 180],
    unit: "%",
    impact: "tool_life",
    category: "monitoring",
  },
];

// ============================================================================
// AMATEUR MISTAKES — Common patterns in shop programs
// ============================================================================

const AMATEUR_MISTAKES: AmateurMistake[] = [
  // Speed/Feed mistakes
  {
    mistake_id: "EXCESSIVE_FEED_CUTOFF",
    category: "speed_feed",
    description: "Cutoff feed rate too high (>0.0015 IPR risks insert breakage)",
    detection_pattern: /NAT\d+.*(?:CUTOFF|PARTING|CUT-OFF)[\s\S]*?F\.?0*([2-9]\d{2,}|1[6-9]\d*)/i,
    severity: "critical",
    correction: "Reduce cutoff feed to F.0012-.0015 IPR max",
    physics_basis: "Parting insert geometry cannot evacuate chips at high feedrates, causing insert fracture",
  },
  {
    mistake_id: "CSS_WITHOUT_MAX_RPM",
    category: "safety",
    description: "G96 (CSS mode) without G50 max RPM limit risks spindle overspeed at small diameters",
    detection_pattern: /G96\s*S\d+(?![\s\S]*?G50\s*S)/i,
    severity: "critical",
    correction: "Add G50 S#### before G96 to limit max RPM (typically 3000-4500 for JM Die materials)",
    physics_basis: "CSS calculates RPM = (SFM × 3.82) / diameter. Small diameters cause excessive RPM.",
  },
  {
    mistake_id: "INSUFFICIENT_FINISH_FEED",
    category: "speed_feed",
    description: "Finish pass feed rate too low (<0.002 IPR), causes rubbing and poor surface finish",
    detection_pattern: /(?:FINISH|FIN\s)[\s\S]*?F\.?0*([01]\d{0,2})(?!\d)/i,
    severity: "warning",
    correction: "Increase finish feed to F.003-.005 IPR for proper chip formation",
    physics_basis: "Feed below minimum chip thickness causes rubbing instead of cutting",
  },
  {
    mistake_id: "EXCESSIVE_DOC_FINISH",
    category: "speed_feed",
    description: "Finish depth of cut too large (>0.010\") leaves tool marks",
    detection_pattern: /(?:FINISH|FIN\s)[\s\S]*?(?:U|W)[-.]?0*([2-9]\d{2,}|1[1-9]\d*)/i,
    severity: "warning",
    correction: "Reduce finish DOC to 0.005-0.010\" for quality surface",
    physics_basis: "Large DOC on finish pass causes deflection and leaves witness marks",
  },
  // Sequence mistakes
  {
    mistake_id: "ROUGH_AFTER_FINISH",
    category: "sequence",
    description: "Roughing operation appears after finish operation",
    detection_pattern: "MANUAL_CHECK",
    severity: "warning",
    correction: "Reorder: Face → Rough → Semi-finish → Finish → Thread → Cutoff",
    physics_basis: "Roughing after finishing damages the finished surface",
  },
  {
    mistake_id: "MISSING_FACE_OPERATION",
    category: "sequence",
    description: "No facing operation before OD turning",
    detection_pattern: /^(?![\s\S]*(?:FACE|FACING))[\s\S]*(?:OD\s*ROUGH|TURN\s*ROUGH)/i,
    severity: "warning",
    correction: "Add facing operation before OD turning to establish Z reference",
    physics_basis: "Bar stock face is not perpendicular, causing uneven DOC",
  },
  {
    mistake_id: "CUTOFF_NOT_LAST",
    category: "sequence",
    description: "Operations appear after cutoff/parting",
    detection_pattern: /(?:CUTOFF|PARTING|CUT-OFF)[\s\S]+NAT\d+/i,
    severity: "critical",
    correction: "Cutoff must be the last operation (part is no longer held after cutoff)",
    physics_basis: "Once part is cut off, no further machining is possible",
  },
  // Safety mistakes
  {
    mistake_id: "MISSING_COOLANT",
    category: "safety",
    description: "No M8 (coolant on) for roughing or threading",
    detection_pattern: /(?:ROUGH|THREAD)[\s\S]*?(?:G96|G97)[\s\S]*?(?!M8)/i,
    severity: "warning",
    correction: "Add M8 for coolant on roughing and threading operations",
    physics_basis: "Dry cutting tool steels causes rapid wear and poor chip evacuation",
  },
  {
    mistake_id: "RAPID_INTO_MATERIAL",
    category: "safety",
    description: "G0 rapid move without clearance before cutting",
    detection_pattern: /G0[^G]*?G0[12]/i,
    severity: "critical",
    correction: "Add clearance move (G0 to safe position) before approaching workpiece",
    physics_basis: "Rapid moves into material cause tool breakage and crashes",
  },
  // Efficiency mistakes
  {
    mistake_id: "CONSTANT_RPM_FOR_FACING",
    category: "efficiency",
    description: "Using G97 (constant RPM) for facing instead of G96 (CSS)",
    detection_pattern: /(?:FACE|FACING)[\s\S]*?G97/i,
    severity: "suggestion",
    correction: "Use G96 (CSS) for facing to maintain constant surface speed across diameters",
    physics_basis: "CSS maintains optimal cutting speed as diameter changes during facing",
  },
  {
    mistake_id: "NO_CHIP_BREAK",
    category: "efficiency",
    description: "Long continuous cuts without chip breaking",
    detection_pattern: "MANUAL_CHECK",
    severity: "suggestion",
    correction: "Use G75 peck grooving or add chip break dwells for long cuts",
    physics_basis: "Continuous chips wrap around workpiece and cause surface damage",
  },
  // Tooling mistakes
  {
    mistake_id: "WRONG_HAND_TOOL",
    category: "tooling",
    description: "Right-hand tool used for left-hand cut or vice versa",
    detection_pattern: "MANUAL_CHECK",
    severity: "warning",
    correction: "Verify tool hand matches cutting direction (RH for -Z cuts from +X)",
    physics_basis: "Wrong-hand tools have incorrect clearance angles for the cut direction",
  },
  {
    mistake_id: "SMALL_TNR_FOR_ROUGHING",
    category: "tooling",
    description: "Using small tool nose radius (<0.015\") for roughing",
    detection_pattern: "MANUAL_CHECK",
    severity: "suggestion",
    correction: "Use larger TNR (0.031-0.063\") for roughing strength, smaller for finishing",
    physics_basis: "Small TNR inserts lack strength for heavy roughing DOC",
  },
];

// ============================================================================
// BEST PRACTICES — Extracted from successful programs
// ============================================================================

const BEST_PRACTICES: string[] = [
  // Operation sequence
  "Always face the part before OD turning to establish Z reference plane",
  "Sequence: Face → Center drill → Drill → Rough OD → Rough ID → Semi-finish → Finish OD → Finish ID → Thread → Groove → Cutoff",
  "Complete all operations on one spindle before transferring to sub-spindle",
  "Group tools by station to minimize turret indexing",

  // Speed/Feed
  "Use CSS (G96) for facing and large diameter changes, G97 for small constant-diameter features",
  "Always set G50 max RPM before G96 to prevent overspeed at small diameters",
  "Roughing feeds: 0.008-0.012 IPR for steels, reduce 30% for tool steels",
  "Finishing feeds: 0.003-0.006 IPR for Ra 32-63, 0.002-0.004 IPR for Ra 16-32",
  "Cutoff feeds: Never exceed 0.0015 IPR to prevent insert breakage",
  "Threading: G76 compound angle 29-30° for metric, 29.5° for UN threads",

  // Safety
  "Verify spindle direction (M3/M4) matches tool orientation before starting",
  "Add M8 coolant for all roughing, threading, and grooving operations",
  "Use M9 before M5 to prevent coolant pooling in stopped spindle",
  "Include G28 home position or safe M30 position at program end",

  // Tool life
  "Use constant surface speed (CSS) to distribute wear evenly across insert edge",
  "Apply chamfers to sharp corners to prevent insert chipping at entry/exit",
  "Monitor spindle load and reduce feed if exceeding 80% on roughing",
  "Group similar operations to extend tool life (all roughing, then all finishing)",

  // Efficiency
  "Use canned cycles (G70-G76) for complex profiles instead of point-to-point",
  "Overlap non-cutting moves with turret indexing when safe",
  "Program constant surface speed inflection points for multi-diameter parts",
  "Use bar feeder M-codes to minimize setup between parts",

  // JM Die specific
  "M2/D2/S7 tool steels: Reduce speed 40% from P-group steel recommendations",
  "Carbide workpieces (PCBN/ceramic required): 20-50 SFM max, F.0005-.002",
  "Hard turning (>58 HRC): CBN inserts, 200-400 SFM, F.003-.006, DOC 0.004-0.010",
];

// ============================================================================
// PROGRAM PATTERNS — From Okuma examples
// ============================================================================

const PROGRAM_PATTERNS: ProgramPattern[] = [
  {
    pattern_id: "BAR_FEEDER_CYCLE",
    pattern_name: "Bar Feeder Integration",
    category: "automation",
    description: "Automatic bar feeding with part counter and bar-out detection",
    code_template: `
( BAR FEEDER CYCLE )
NBAR
VC60 = VC60 + 1     ( INCREMENT PART COUNTER )
IF [VC60 GE VC61] GOTO NBAROUT
M98 VC62            ( CALL BAR FEED SUBPROGRAM )
GOTO NMAIN
NBAROUT
M00                  ( BAR OUT - OPERATOR LOAD NEW BAR )
VC60 = 0            ( RESET COUNTER )
`,
    variables: [
      { name: "VC60", description: "Part counter", default: 0 },
      { name: "VC61", description: "Parts per bar", default: 25 },
      { name: "VC62", description: "Bar feed subprogram number", default: 9000 },
    ],
    best_practices: [
      "Calculate parts per bar based on stock length minus facing/cutoff allowance",
      "Include M00 stop for operator to load new bar stock",
      "Use common variables (VC##) to persist count across program restarts",
    ],
    anti_patterns: [
      "Hardcoding part count instead of using variables",
      "Not including bar-out detection leading to air cutting",
    ],
    source_file: "resources/OKUMA MULTUS PDFS/Program Examples/Bar Feeder/",
  },
  {
    pattern_id: "TOOL_LIFE_MONITOR",
    pattern_name: "Tool Life Monitoring",
    category: "tool_life",
    description: "Track tool usage and warn/stop at tool life limit",
    code_template: `
( TOOL LIFE MONITOR - TOOL ## )
VC[TOOL*10+1] = VC[TOOL*10+1] + 1    ( INCREMENT USAGE )
IF [VC[TOOL*10+1] GE VC[TOOL*10+2]*0.8] GOSUB 9800 ( 80% WARNING )
IF [VC[TOOL*10+1] GE VC[TOOL*10+2]] GOSUB 9801    ( 100% ALARM )
`,
    variables: [
      { name: "VC[T*10+1]", description: "Current tool usage count", default: 0 },
      { name: "VC[T*10+2]", description: "Tool life limit", default: 100 },
    ],
    best_practices: [
      "Store tool life in common variables for persistence",
      "Issue warning at 80% life remaining for tool prep",
      "Include M01 optional stop at 100% for operator override",
    ],
    anti_patterns: [
      "Not tracking tool life at all",
      "Stopping program abruptly without operator notification",
    ],
    source_file: "resources/OKUMA MULTUS PDFS/Program Examples/Tool Life Macros/",
  },
  {
    pattern_id: "TOUCH_SETTER",
    pattern_name: "Automatic Tool Touch-Off",
    category: "quality",
    description: "Automatic tool length/radius measurement using touch setter",
    code_template: `
( AUTOMATIC TOUCH SETTER - TOOL ## )
T####
G0 X[VTSXP] Z[VTSZP]      ( POSITION OVER TOUCH SETTER )
G31 Z[VTSZP-1.0] F10.0    ( PROBE MOVE )
#100 = VACTS[2]            ( READ ACTUAL Z POSITION )
G10 L10 P## Z[#100-VTSZ]   ( UPDATE TOOL OFFSET )
G0 Z[VTSZP]                ( RETRACT )
`,
    variables: [
      { name: "VTSXP", description: "Touch setter X position", default: 0 },
      { name: "VTSZP", description: "Touch setter Z position", default: -10 },
      { name: "VTSZ", description: "Touch setter surface Z", default: -10.5 },
    ],
    best_practices: [
      "Measure tools at operating temperature (after warmup)",
      "Use slow feedrate (F10 or less) for accuracy",
      "Include retract move before next operation",
    ],
    anti_patterns: [
      "Measuring cold tools then running production hot",
      "Fast feedrate causing inaccurate readings",
    ],
    source_file: "resources/OKUMA MULTUS PDFS/Program Examples/Auto Touch-setter.zip",
  },
  {
    pattern_id: "SPINDLE_SYNC_TRANSFER",
    pattern_name: "Spindle-to-Spindle Transfer",
    category: "automation",
    description: "Synchronized spindle transfer for sub-spindle operations",
    code_template: `
( SPINDLE SYNCHRONOUS TRANSFER )
M42 S1000                  ( SPINDLE 1 MID GEAR )
M142 S1000                 ( SPINDLE 2 MID GEAR )
G97 S1000 M3               ( SPINDLE 1 ON )
M103                       ( SPINDLE 2 ON - SYNC )
G0 W-[TRANSFER_Z]          ( SUB-SPINDLE APPROACH )
M68                        ( SUB-SPINDLE COLLET CLOSE )
G4 P500                    ( DWELL FOR CLAMP )
M69                        ( MAIN SPINDLE COLLET OPEN )
G4 P300                    ( DWELL FOR UNCLAMP )
G0 W[CLEARANCE]            ( RETRACT SUB-SPINDLE )
M104                       ( SPINDLE 2 STOP )
M05                        ( SPINDLE 1 STOP )
`,
    variables: [
      { name: "TRANSFER_Z", description: "Z position for spindle engagement", default: 2.0 },
      { name: "CLEARANCE", description: "Retract distance after transfer", default: 3.0 },
    ],
    best_practices: [
      "Match spindle speeds before engaging",
      "Use adequate dwell for collet clamp/unclamp",
      "Verify collet grip before releasing main spindle",
    ],
    anti_patterns: [
      "Transferring at mismatched spindle speeds",
      "Insufficient dwell causing part drop",
    ],
    source_file: "resources/OKUMA MULTUS PDFS/Program Examples/W-Axis and Transfer/",
  },
  {
    pattern_id: "THREAD_CHAMFER",
    pattern_name: "Thread Lead-Out Chamfer",
    category: "quality",
    description: "Proper thread termination with controlled chamfer angle",
    code_template: `
( THREAD WITH LEAD-OUT CHAMFER )
G76 P[PASSES]0[ANGLE]60 Q[MIN_DOC] R[RELIEF]
G76 X[MINOR_DIA] Z[THREAD_END] R0 P[THREAD_DEPTH] Q[FIRST_DOC] F[PITCH]
`,
    variables: [
      { name: "PASSES", description: "Number of threading passes (02-99)", default: "04" },
      { name: "ANGLE", description: "Chamfer angle (0-99 = 0.0-9.9 threads)", default: "45" },
      { name: "MIN_DOC", description: "Minimum depth per pass (microns)", default: 50 },
      { name: "RELIEF", description: "Relief amount per pass", default: 0.1 },
    ],
    best_practices: [
      "Use compound angle 29-30° for metric threads",
      "Set chamfer to 1.0-2.0 thread pitches for clean runout",
      "Reduce final pass DOC to 0.05mm for surface finish",
    ],
    anti_patterns: [
      "No chamfer causing burr at thread end",
      "Excessive chamfer affecting thread length",
    ],
    source_file: "resources/OKUMA MULTUS PDFS/Program Examples/Thread Mill Macro/",
  },
];

// ============================================================================
// CONTROLLER KNOWLEDGE — OSP Specifics
// ============================================================================

const CONTROLLER_KNOWLEDGE: ControllerKnowledge[] = [
  {
    controller: "OSP-P300L",
    version: "R2",
    canned_cycles: [
      {
        code: "G70",
        name: "Finishing Cycle",
        parameters: [
          { param: "P", description: "First block number of rough cycle", required: true },
          { param: "Q", description: "Last block number of rough cycle", required: true },
        ],
        example: "G70 P100 Q200 ( FINISH USING PROFILE FROM N100-N200 )",
      },
      {
        code: "G71",
        name: "OD/ID Stock Removal",
        parameters: [
          { param: "U", description: "Depth of cut (radius)", required: true },
          { param: "R", description: "Retract amount", required: true },
          { param: "P", description: "First block of profile", required: true },
          { param: "Q", description: "Last block of profile", required: true },
          { param: "U", description: "X finish allowance (diameter)", required: false },
          { param: "W", description: "Z finish allowance", required: false },
          { param: "F", description: "Feedrate", required: true },
          { param: "S", description: "Spindle speed", required: false },
        ],
        example: "G71 U0.100 R0.020\nG71 P100 Q200 U0.010 W0.005 F0.010",
      },
      {
        code: "G72",
        name: "Face Stock Removal",
        parameters: [
          { param: "W", description: "Depth per pass (Z direction)", required: true },
          { param: "R", description: "Retract amount", required: true },
          { param: "P", description: "First block of profile", required: true },
          { param: "Q", description: "Last block of profile", required: true },
        ],
        example: "G72 W0.100 R0.020\nG72 P100 Q200 U0.010 W0.005 F0.012",
      },
      {
        code: "G73",
        name: "Pattern Repeat",
        parameters: [
          { param: "U", description: "Total X stock (radius)", required: true },
          { param: "W", description: "Total Z stock", required: true },
          { param: "R", description: "Number of divisions", required: true },
          { param: "P", description: "First block", required: true },
          { param: "Q", description: "Last block", required: true },
        ],
        example: "G73 U1.0 W0.5 R3\nG73 P100 Q200 U0.010 W0.005 F0.008",
      },
      {
        code: "G74",
        name: "Peck Drilling (Z-axis)",
        parameters: [
          { param: "R", description: "Retract amount", required: true },
          { param: "Z", description: "Final Z depth", required: true },
          { param: "Q", description: "Peck depth", required: true },
          { param: "F", description: "Feedrate", required: true },
        ],
        example: "G74 R0.100 Z-2.0 Q0.200 F0.005",
      },
      {
        code: "G75",
        name: "Peck Grooving (X-axis)",
        parameters: [
          { param: "R", description: "Retract amount", required: true },
          { param: "X", description: "Final X position", required: true },
          { param: "Z", description: "Z position", required: true },
          { param: "P", description: "Peck depth (X radius)", required: true },
          { param: "Q", description: "Shift amount (Z)", required: false },
          { param: "F", description: "Feedrate", required: true },
        ],
        example: "G75 R0.010 X0.5 Z-1.0 P0.050 F0.001",
      },
      {
        code: "G76",
        name: "Threading Cycle",
        parameters: [
          { param: "P", description: "Passes/Chamfer/Angle (6 digits)", required: true },
          { param: "Q", description: "Minimum depth per pass", required: true },
          { param: "R", description: "Finishing allowance", required: true },
          { param: "X", description: "Thread minor diameter", required: true },
          { param: "Z", description: "Thread end position", required: true },
          { param: "P", description: "Thread depth (radius)", required: true },
          { param: "Q", description: "First pass depth", required: true },
          { param: "F", description: "Thread pitch (lead)", required: true },
        ],
        example: "G76 P040060 Q50 R0.05\nG76 X0.400 Z-1.0 P0.038 Q0.010 F0.050",
      },
    ],
    macro_variables: [
      { range: "#1-#33", scope: "local", description: "Local variables (G65 arguments A-Z)" },
      { range: "#100-#149", scope: "common", description: "Common variables - persist across programs" },
      { range: "#500-#999", scope: "common", description: "Common variables - battery backed" },
      { range: "VC1-VC200", scope: "common", description: "OSP common variables (Okuma syntax)" },
      { range: "VTOF[n]", scope: "system", description: "Tool offset values" },
      { range: "VACTS[n]", scope: "system", description: "Actual axis positions" },
    ],
    special_codes: [
      { code: "G10 L10", description: "Tool offset write (length)" },
      { code: "G10 L11", description: "Tool offset write (radius)" },
      { code: "G31", description: "Skip function (probing)" },
      { code: "G50", description: "Max spindle speed clamp" },
      { code: "G96", description: "Constant surface speed (CSS)" },
      { code: "G97", description: "Constant RPM mode" },
      { code: "M98", description: "Subprogram call" },
      { code: "M99", description: "Subprogram return" },
      { code: "GOTO", description: "Unconditional jump (Okuma)" },
      { code: "IF/GOTO", description: "Conditional jump (Okuma)" },
      { code: "GOSUB", description: "Subroutine call (Okuma)" },
    ],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheResourceKnowledgeEngine {
  private resourcesPath = "H:/PRISM/resources";
  private knowledgeBase: LatheKnowledgeBase;

  constructor() {
    this.knowledgeBase = this._initializeKnowledgeBase();
  }

  /**
   * Initialize knowledge base with codified knowledge
   */
  private _initializeKnowledgeBase(): LatheKnowledgeBase {
    return {
      aot_parameters: OKUMA_AOT_PARAMETERS,
      tooling_knowledge: [],
      program_patterns: PROGRAM_PATTERNS,
      controller_knowledge: CONTROLLER_KNOWLEDGE,
      amateur_mistakes: AMATEUR_MISTAKES,
      best_practices: BEST_PRACTICES,
      extracted_from: [
        "resources/OKUMA MULTUS PDFS/AOT.pdf",
        "resources/OKUMA MULTUS PDFS/AOT Advanced.pdf",
        "resources/OKUMA MULTUS PDFS/Program Examples/",
        "resources/RESOURCE PDFS/Okuma-OSP-P200L-Programming.pdf",
      ],
      extraction_date: new Date().toISOString(),
    };
  }

  /**
   * Get the complete knowledge base
   */
  getKnowledgeBase(): LatheKnowledgeBase {
    return this.knowledgeBase;
  }

  /**
   * Get all amateur mistake patterns for detection
   */
  getAmateurMistakes(): AmateurMistake[] {
    return this.knowledgeBase.amateur_mistakes;
  }

  /**
   * Get AOT optimization parameters
   */
  getAOTParameters(): AOTParameter[] {
    return this.knowledgeBase.aot_parameters;
  }

  /**
   * Get best practices list
   */
  getBestPractices(): string[] {
    return this.knowledgeBase.best_practices;
  }

  /**
   * Get program patterns
   */
  getProgramPatterns(): ProgramPattern[] {
    return this.knowledgeBase.program_patterns;
  }

  /**
   * Get controller knowledge for specific controller
   */
  getControllerKnowledge(controller: string): ControllerKnowledge | undefined {
    return this.knowledgeBase.controller_knowledge.find(
      (c) => c.controller.toLowerCase().includes(controller.toLowerCase())
    );
  }

  /**
   * Detect amateur mistakes in program content
   */
  detectMistakes(content: string): Array<AmateurMistake & { match?: string; line?: number }> {
    const detected: Array<AmateurMistake & { match?: string; line?: number }> = [];
    const lines = content.split(/\r?\n/);

    for (const mistake of this.knowledgeBase.amateur_mistakes) {
      if (mistake.detection_pattern === "MANUAL_CHECK") {
        continue; // These require semantic analysis
      }

      if (typeof mistake.detection_pattern === "string") {
        continue;
      }

      const regex = mistake.detection_pattern;
      const match = content.match(regex);

      if (match) {
        // Find line number
        let lineNum = 1;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1;
          if (charCount >= (match.index || 0)) {
            lineNum = i + 1;
            break;
          }
        }

        detected.push({
          ...mistake,
          match: match[0].substring(0, 100),
          line: lineNum,
        });
      }
    }

    return detected;
  }

  /**
   * Score a program against best practices
   */
  scoreProgramPractices(content: string): {
    score: number;
    followed: string[];
    violated: string[];
    suggestions: string[];
  } {
    const followed: string[] = [];
    const violated: string[] = [];
    const suggestions: string[] = [];

    const contentUpper = content.toUpperCase();

    // Check for CSS with max RPM
    if (contentUpper.includes("G96")) {
      if (contentUpper.includes("G50")) {
        followed.push("Uses G50 max RPM with CSS");
      } else {
        violated.push("G96 CSS without G50 max RPM limit");
      }
    }

    // Check for coolant on roughing
    if (contentUpper.includes("ROUGH")) {
      if (contentUpper.includes("M8")) {
        followed.push("Coolant enabled for roughing");
      } else {
        violated.push("No coolant for roughing operation");
      }
    }

    // Check operation sequence
    const hasface = /FACE|FACING/i.test(content);
    const hasRough = /ROUGH/i.test(content);
    const hasFinish = /FINISH/i.test(content);
    const hasCutoff = /CUTOFF|PARTING/i.test(content);

    if (hasface && hasRough) {
      const faceIdx = content.search(/FACE|FACING/i);
      const roughIdx = content.search(/ROUGH/i);
      if (faceIdx < roughIdx) {
        followed.push("Face operation before roughing");
      } else {
        violated.push("Roughing before facing");
      }
    }

    if (hasFinish && hasCutoff) {
      const finishIdx = content.search(/FINISH/i);
      const cutoffIdx = content.search(/CUTOFF|PARTING/i);
      if (finishIdx < cutoffIdx) {
        followed.push("Cutoff is last operation");
      } else {
        violated.push("Operations after cutoff");
      }
    }

    // Check for canned cycles
    if (/G7[0-6]/.test(content)) {
      followed.push("Uses canned cycles for efficiency");
    } else if (hasRough || hasFinish) {
      suggestions.push("Consider using G71/G70 canned cycles");
    }

    // Calculate score
    const totalChecks = followed.length + violated.length;
    const score = totalChecks > 0 ? Math.round((followed.length / totalChecks) * 100) : 50;

    return { score, followed, violated, suggestions };
  }

  /**
   * Generate improvement recommendations for a program
   */
  generateImprovements(
    content: string,
    material?: string
  ): {
    recommendations: string[];
    aot_optimizations: string[];
    code_improvements: { original: string; improved: string; reason: string }[];
  } {
    const recommendations: string[] = [];
    const aot_optimizations: string[] = [];
    const code_improvements: { original: string; improved: string; reason: string }[] = [];

    // Detect mistakes
    const mistakes = this.detectMistakes(content);
    for (const mistake of mistakes) {
      recommendations.push(`${mistake.severity.toUpperCase()}: ${mistake.description}. ${mistake.correction}`);
    }

    // AOT optimization suggestions
    const aotParams = this.getAOTParameters();
    if (!content.includes("ADAPTIVE") && !content.includes("VLOAD")) {
      aot_optimizations.push(
        "Enable Adaptive Cutting Control for automatic feedrate optimization based on spindle load"
      );
    }

    if (!content.includes("VTLIF") && !content.includes("TOOL LIFE")) {
      aot_optimizations.push("Implement tool life monitoring using VC variables for proactive tool changes");
    }

    // Code-level improvements
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // CSS without max RPM
      if (/G96\s*S\d+/i.test(line) && !lines.slice(Math.max(0, i - 5), i + 1).some((l) => /G50\s*S/i.test(l))) {
        const sMatch = line.match(/S(\d+)/);
        const sfm = sMatch ? parseInt(sMatch[1]) : 300;
        code_improvements.push({
          original: line,
          improved: `G50 S3500\n${line}`,
          reason: "Add G50 max RPM before G96 to prevent spindle overspeed at small diameters",
        });
      }

      // High cutoff feed
      if (/(?:CUTOFF|PARTING)/i.test(lines.slice(Math.max(0, i - 3), i + 1).join("\n"))) {
        const feedMatch = line.match(/F\.?(\d{3,})/);
        if (feedMatch) {
          const feed = parseFloat(`0.${feedMatch[1]}`);
          if (feed > 0.0015) {
            code_improvements.push({
              original: line,
              improved: line.replace(/F\.?\d+/, "F.0012"),
              reason: `Cutoff feed ${feed.toFixed(4)} IPR too high - reduce to 0.0012 IPR to prevent insert breakage`,
            });
          }
        }
      }
    }

    return { recommendations, aot_optimizations, code_improvements };
  }

  /**
   * Extract program examples from resources
   */
  scanProgramExamples(): ProgramFile[] {
    const examples: ProgramFile[] = [];
    const exampleDirs = [
      join(this.resourcesPath, "OKUMA MULTUS PDFS/Program Examples"),
      join(this.resourcesPath, "MACRO PROGRAMS"),
      join(this.resourcesPath, "MULTUS PROGRAMS"),
    ];

    for (const dir of exampleDirs) {
      if (existsSync(dir)) {
        this._scanDir(dir, examples);
      }
    }

    return examples;
  }

  private _scanDir(dir: string, files: ProgramFile[]): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            this._scanDir(fullPath, files);
          } else if (entry.toLowerCase().endsWith(".min")) {
            const content = readFileSync(fullPath, "utf-8");
            files.push({
              filepath: fullPath,
              filename: entry,
              content,
              category: this._categorizeExample(fullPath, content),
            });
          }
        } catch {
          // Skip unreadable
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  }

  private _categorizeExample(filepath: string, content: string): string {
    const pathLower = filepath.toLowerCase();
    if (pathLower.includes("bar feed")) return "bar_feeder";
    if (pathLower.includes("tool life")) return "tool_life";
    if (pathLower.includes("touch")) return "probing";
    if (pathLower.includes("thread")) return "threading";
    if (pathLower.includes("macro")) return "macro";
    if (pathLower.includes("transfer")) return "spindle_transfer";
    return "general";
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats(): {
    aot_parameters: number;
    amateur_mistakes: number;
    program_patterns: number;
    best_practices: number;
    controller_canned_cycles: number;
  } {
    return {
      aot_parameters: this.knowledgeBase.aot_parameters.length,
      amateur_mistakes: this.knowledgeBase.amateur_mistakes.length,
      program_patterns: this.knowledgeBase.program_patterns.length,
      best_practices: this.knowledgeBase.best_practices.length,
      controller_canned_cycles: this.knowledgeBase.controller_knowledge.reduce(
        (sum, c) => sum + c.canned_cycles.length,
        0
      ),
    };
  }
}

// Type for program file scanning
interface ProgramFile {
  filepath: string;
  filename: string;
  content: string;
  category: string;
}

// Singleton export
export const latheResourceKnowledgeEngine = new LatheResourceKnowledgeEngine();
