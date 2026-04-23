/**
 * ControllerKnowledgeDBEngine — Comprehensive controller knowledge from mined programs
 *
 * Structured knowledge databases for 5 controller families:
 *   - Okuma OSP-P300L/P300LA (Genos L400II-e, LB3000, Multus B250II, M460V-5AX)
 *   - Haas NGC (VF2 mill)
 *   - Hurco WinMax (VM30i mill)
 *   - Roku-Roku / Mitsubishi M70 (micro-mill)
 *   - Mitsubishi M70/M80 (general)
 *
 * Each DB contains: G-codes with semantics, M-codes with machine-specific meaning,
 * variable systems, subroutine systems, canned cycles, and safety codes.
 * Mined from real production programs in the Box drive.
 *
 * @module ControllerKnowledgeDBEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ControllerFamily = "okuma" | "haas" | "hurco" | "roku_roku" | "mitsubishi";

/** G-code entry with full semantics */
export interface GCodeEntry {
  code: string;            // "G85", "G96", etc.
  name: string;            // "OD Roughing Cycle"
  group: string;           // "canned_cycle", "motion", "speed_mode", etc.
  modal: boolean;          // Does it persist until cancelled?
  params: string[];        // Expected parameters ["X", "Z", "F", "D"]
  description: string;     // Full description of behavior
  safety_notes?: string;   // Safety-critical notes
  okuma_specific?: boolean; // True if Okuma-only (not Fanuc standard)
  example?: string;        // Example line
}

/** M-code entry */
export interface MCodeEntry {
  code: string;            // "M8", "M110"
  name: string;            // "Coolant ON"
  description: string;
  machine_specific: boolean; // True if NOT standard Fanuc
  requires?: string[];     // Pre-requisites (e.g., M110 requires C-axis option)
  safety_critical: boolean;
}

/** Variable system entry */
export interface VariableEntry {
  prefix: string;          // "V", "VC", "#"
  range: string;           // "V1-V200", "#100-#199"
  scope: string;           // "local", "common", "persistent"
  description: string;
  conventions?: Array<{    // Shop naming conventions
    variable: string;
    purpose: string;
  }>;
}

/** Canned cycle entry */
export interface CannedCycleEntry {
  code: string;
  name: string;
  type: string;            // "roughing", "finishing", "threading", "drilling"
  params: Array<{
    letter: string;
    name: string;
    description: string;
    required: boolean;
  }>;
  description: string;
  notes?: string;
}

/** Controller knowledge database */
export interface ControllerKnowledgeDB {
  family: ControllerFamily;
  controller_model: string;
  machines: string[];
  gcodes: GCodeEntry[];
  mcodes: MCodeEntry[];
  variables: VariableEntry[];
  canned_cycles: CannedCycleEntry[];
  subroutine_system: {
    call_syntax: string;
    local_sub: boolean;
    external_sub: boolean;
    max_nesting: number;
    description: string;
  };
  safety_codes: string[];
  post_processor_notes: string[];
  dialect_quirks: string[];
}

/** Query result */
export interface KnowledgeQueryResult {
  controller: ControllerFamily;
  entries: Array<{
    type: "gcode" | "mcode" | "variable" | "cycle" | "note";
    code?: string;
    name: string;
    description: string;
    safety_critical?: boolean;
  }>;
  total: number;
}

// ============================================================================
// KNOWLEDGE DATABASES
// ============================================================================

const OKUMA_DB: ControllerKnowledgeDB = {
  family: "okuma",
  controller_model: "OSP-P300L / P300LA",
  machines: ["Genos L400II-e", "LB3000 EXII", "Multus B250II", "M460V-5AX"],
  gcodes: [
    // Motion
    { code: "G0", name: "Rapid positioning", group: "motion", modal: true, params: ["X", "Z"], description: "Rapid traverse to position. Uses machine's max rapid rate.", example: "G0 X20 Z20" },
    { code: "G1", name: "Linear interpolation", group: "motion", modal: true, params: ["X", "Z", "F"], description: "Linear cutting move at programmed feed rate.", example: "G1 X1.875 Z-3.5 F0.012" },
    { code: "G2", name: "CW circular interpolation", group: "motion", modal: true, params: ["X", "Z", "L", "I", "K"], description: "Clockwise arc. L=radius (Okuma convention, NOT R).", okuma_specific: true, example: "G2 X1.0 Z-0.5 L0.25" },
    { code: "G3", name: "CCW circular interpolation", group: "motion", modal: true, params: ["X", "Z", "L", "I", "K"], description: "Counter-clockwise arc. L=radius.", okuma_specific: true, example: "G3 X1.5 Z-1.0 L0.375" },
    // Speed mode
    { code: "G96", name: "Constant surface speed (CSS)", group: "speed_mode", modal: true, params: ["S"], description: "Maintain constant surface speed. S=SFM (imperial) or m/min (metric). RPM auto-adjusts with diameter.", safety_notes: "MUST pair with G50 speed clamp to prevent overspeed at small diameters." },
    { code: "G97", name: "Constant RPM", group: "speed_mode", modal: true, params: ["S"], description: "Fixed spindle RPM. S=RPM directly." },
    { code: "G50", name: "Max spindle speed clamp", group: "speed_limit", modal: true, params: ["S"], description: "Limits maximum RPM during CSS mode. SAFETY-CRITICAL.", safety_notes: "Must be set BEFORE G96. Omission can cause dangerous overspeed.", example: "G50 S2500" },
    // Canned cycles (Okuma-specific)
    { code: "G85", name: "OD roughing cycle", group: "canned_cycle", modal: false, params: ["X", "Z", "D", "F"], description: "OD roughing with D=depth-of-cut. Okuma-specific (equivalent to Fanuc G71 but different params).", okuma_specific: true },
    { code: "G87", name: "OD finishing cycle", group: "canned_cycle", modal: false, params: ["X", "Z", "F"], description: "OD finishing along programmed profile. Okuma-specific (equivalent to Fanuc G70).", okuma_specific: true },
    { code: "G83", name: "Face roughing cycle", group: "canned_cycle", modal: false, params: ["X", "Z", "D", "F"], description: "Facing roughing with D=depth. Okuma-specific.", okuma_specific: true },
    { code: "G71", name: "Thread cutting cycle", group: "canned_cycle", modal: false, params: ["X", "Z", "F", "D", "L", "A", "P"], description: "CAUTION: In Okuma, G71 is THREADING, NOT roughing (unlike Fanuc). F=pitch. D=first pass depth. L=infeed angle.", okuma_specific: true, safety_notes: "Okuma G71 ≠ Fanuc G71. Mixing them up will crash the machine." },
    { code: "G74", name: "Peck drilling cycle", group: "canned_cycle", modal: false, params: ["Z", "D", "L", "F"], description: "Peck drill. D=peck depth, L=retract. Okuma uses D/L params (not Q/R like Fanuc).", okuma_specific: true },
    { code: "G4", name: "Dwell", group: "misc", modal: false, params: ["F"], description: "Dwell. F=dwell time in seconds (Okuma uses F, not P/X like Fanuc).", okuma_specific: true },
    // Coordinate
    { code: "G28", name: "Return to reference point", group: "coordinate", modal: false, params: ["X", "Z"], description: "Machine home return via intermediate point.", safety_notes: "Ensure tool is clear before calling." },
    // Angular
    { code: "A", name: "Angular move (Okuma)", group: "motion_modifier", modal: false, params: ["A"], description: "Angular/taper move. A=angle in degrees. Okuma-specific parameter word.", okuma_specific: true },
    // C-axis
    { code: "G138", name: "C-axis ON", group: "c_axis", modal: true, params: [], description: "Enable C-axis interpolation mode.", okuma_specific: true },
    { code: "G136", name: "C-axis OFF", group: "c_axis", modal: true, params: [], description: "Disable C-axis, return spindle to turning mode.", okuma_specific: true },
  ],
  mcodes: [
    { code: "M3", name: "Spindle CW", description: "Start spindle clockwise (forward).", machine_specific: false, safety_critical: false },
    { code: "M4", name: "Spindle CCW", description: "Start spindle counter-clockwise.", machine_specific: false, safety_critical: false },
    { code: "M5", name: "Spindle stop", description: "Stop spindle rotation.", machine_specific: false, safety_critical: true },
    { code: "M8", name: "Coolant ON", description: "Flood coolant on.", machine_specific: false, safety_critical: false },
    { code: "M9", name: "Coolant OFF", description: "Coolant off.", machine_specific: false, safety_critical: false },
    { code: "M1", name: "Optional stop", description: "Program pause if optional stop switch is ON. Used between tool changes for operator inspection.", machine_specific: false, safety_critical: true },
    { code: "M30", name: "End of program", description: "Program end and rewind.", machine_specific: false, safety_critical: true },
    { code: "M110", name: "C-axis mode ON", description: "Switch spindle to C-axis servo mode for milling/cross-drilling.", machine_specific: true, requires: ["C-axis option"], safety_critical: false },
    { code: "M109", name: "C-axis mode OFF", description: "Return spindle from C-axis mode to normal turning mode.", machine_specific: true, safety_critical: false },
    { code: "M146", name: "Tailstock advance", description: "Advance tailstock quill.", machine_specific: true, safety_critical: true },
    { code: "M147", name: "Tailstock retract", description: "Retract tailstock quill.", machine_specific: true, safety_critical: true },
    { code: "M38", name: "Bar feeder advance", description: "Advance bar feeder. Requires bar feeder interface.", machine_specific: true, safety_critical: true },
    { code: "M39", name: "Bar feeder retract", description: "Retract bar feeder collet.", machine_specific: true, safety_critical: true },
  ],
  variables: [
    {
      prefix: "V",
      range: "V1-V200",
      scope: "local",
      description: "Local variables. Reset each program run. Shop convention: V1-V10 dimensions, V20-V30 drill params, V35-V38 allowances, V40-V44 DOC, V45-V56 speeds/feeds, V60-V66 clearances, V70-V85 calculated RPM.",
      conventions: [
        { variable: "V1", purpose: "Stock diameter" },
        { variable: "V2", purpose: "Finish OD" },
        { variable: "V3", purpose: "Finish ID / Bore diameter" },
        { variable: "V5", purpose: "Part length" },
        { variable: "V20", purpose: "Drill size" },
        { variable: "V45", purpose: "OD rough SFM" },
        { variable: "V46", purpose: "OD rough feed (IPR)" },
        { variable: "V47", purpose: "OD finish SFM" },
        { variable: "V48", purpose: "OD finish feed (IPR)" },
        { variable: "V60", purpose: "X clearance" },
        { variable: "V62", purpose: "Safe retract X" },
        { variable: "V63", purpose: "Safe retract Z" },
        { variable: "V64", purpose: "Max RPM limit" },
        { variable: "V70", purpose: "Calculated RPM (OD rough)" },
      ],
    },
    {
      prefix: "VC",
      range: "VC100-VC999",
      scope: "common",
      description: "Common variables. Shared between programs. Persistent across power cycles. Used for fixture offsets, tool wear comp, shared constants.",
    },
  ],
  canned_cycles: [
    {
      code: "G85",
      name: "OD Roughing Cycle",
      type: "roughing",
      params: [
        { letter: "X", name: "Finish X", description: "Final X diameter", required: true },
        { letter: "Z", name: "Finish Z", description: "Final Z position", required: true },
        { letter: "D", name: "Depth of cut", description: "Radial depth per pass", required: true },
        { letter: "F", name: "Feed rate", description: "Feed per revolution", required: true },
      ],
      description: "Automatic OD roughing. Machines from current position to X,Z with D depth-of-cut per pass. Okuma-specific.",
      notes: "NOT the same as Fanuc G71 (which uses U/W for incremental finish stock). Okuma G85 programs the FINISH dimensions directly.",
    },
    {
      code: "G74",
      name: "Peck Drilling Cycle",
      type: "drilling",
      params: [
        { letter: "Z", name: "Final Z depth", description: "Total drill depth", required: true },
        { letter: "D", name: "Peck depth", description: "Depth per peck", required: true },
        { letter: "L", name: "Retract", description: "Retract amount between pecks", required: false },
        { letter: "F", name: "Feed rate", description: "Drilling feed", required: true },
      ],
      description: "Peck drilling with automatic retract and re-approach between pecks.",
    },
    {
      code: "G71",
      name: "Thread Cutting Cycle",
      type: "threading",
      params: [
        { letter: "X", name: "Thread minor dia", description: "Final thread X diameter", required: true },
        { letter: "Z", name: "Thread end Z", description: "Thread length", required: true },
        { letter: "F", name: "Thread pitch", description: "Thread pitch (TPI or mm)", required: true },
        { letter: "D", name: "First pass depth", description: "Initial infeed depth", required: true },
        { letter: "L", name: "Thread lead-in", description: "Lead-in distance", required: false },
        { letter: "A", name: "Infeed angle", description: "29.5° for UNS, 30° for metric", required: false },
      ],
      description: "THREADING cycle (NOT roughing like Fanuc G71). Multiple passes with decreasing infeed.",
      notes: "CRITICAL: Okuma G71 = threading. Do NOT confuse with Fanuc G71 (roughing).",
    },
  ],
  subroutine_system: {
    call_syntax: "/CALL O{name}",
    local_sub: false,
    external_sub: true,
    max_nesting: 4,
    description: "Okuma uses /CALL for external subroutine calls. No local subroutines (unlike Fanuc M97). Program names are alphanumeric (not O-numbers).",
  },
  safety_codes: ["G50", "M5", "M1", "M30", "M9", "G28"],
  post_processor_notes: [
    "Arc radius uses L word (NOT R like Fanuc)",
    "Dwell uses F word for seconds (NOT P/X)",
    "G71 = threading (NOT roughing)",
    "G85/G87 for roughing/finishing (NOT G71/G70)",
    "Tool code format: T{station}{station}{offset}{offset} e.g., T010101",
    "6-digit T-codes (e.g., T010101) — station + offset repeated",
    "Variable assignments: V1 = 2.0 (spaces around =)",
    "Comments in parentheses: ( COMMENT TEXT )",
    "NAT labels for tool sections: NAT01, NAT02, ...",
    "DEF WORK blocks for graphics simulation (can be stripped in post)",
  ],
  dialect_quirks: [
    "No N-word line numbers (unlike Fanuc/Haas)",
    "Taper angles via A word on same line as motion",
    "IF/GOTO conditional branching: IF [V1 GT 2.0] GOTO N100",
    "Label format: N{number} (only used as branch targets, not sequential)",
    "Macro math: V70 = [V45 * 3.8197] / V1 (brackets for expression)",
  ],
};

const HAAS_DB: ControllerKnowledgeDB = {
  family: "haas",
  controller_model: "NGC (Next Generation Control)",
  machines: ["VF2"],
  gcodes: [
    { code: "G0", name: "Rapid positioning", group: "motion", modal: true, params: ["X", "Y", "Z"], description: "Rapid traverse." },
    { code: "G1", name: "Linear interpolation", group: "motion", modal: true, params: ["X", "Y", "Z", "F"], description: "Linear cutting move." },
    { code: "G2", name: "CW circular interpolation", group: "motion", modal: true, params: ["X", "Y", "Z", "R", "I", "J", "K"], description: "Clockwise arc. R=radius." },
    { code: "G3", name: "CCW circular interpolation", group: "motion", modal: true, params: ["X", "Y", "Z", "R", "I", "J", "K"], description: "Counter-clockwise arc." },
    { code: "G10", name: "Offset setting", group: "offset", modal: false, params: ["L", "P", "R"], description: "Set work/tool offsets from program. L2=work, L10=tool length, L12=tool wear." },
    { code: "G28", name: "Machine home", group: "coordinate", modal: false, params: ["X", "Y", "Z"], description: "Return to machine zero via intermediate point." },
    { code: "G41", name: "Cutter comp left", group: "cutter_comp", modal: true, params: ["D"], description: "Cutter radius compensation left. D=offset register." },
    { code: "G42", name: "Cutter comp right", group: "cutter_comp", modal: true, params: ["D"], description: "Cutter radius compensation right." },
    { code: "G43", name: "Tool length comp", group: "tool_comp", modal: true, params: ["H"], description: "Tool length compensation. H=offset register." },
    { code: "G81", name: "Drill cycle", group: "canned_cycle", modal: true, params: ["X", "Y", "Z", "R", "F"], description: "Standard drilling cycle." },
    { code: "G83", name: "Peck drill cycle", group: "canned_cycle", modal: true, params: ["X", "Y", "Z", "R", "Q", "F"], description: "Peck drilling. Q=peck depth." },
    { code: "G84", name: "Tapping cycle", group: "canned_cycle", modal: true, params: ["X", "Y", "Z", "R", "F"], description: "Right-hand rigid tapping. F=pitch." },
    { code: "G187", name: "Smoothing control", group: "smoothing", modal: true, params: ["P", "E"], description: "Surface finish smoothing. P=mode (1=rough, 2=medium, 3=finish). Haas-specific.", okuma_specific: false },
    { code: "G65", name: "Macro call", group: "macro", modal: false, params: ["P", "A", "B", "C"], description: "Call macro subprogram. P=program number." },
  ],
  mcodes: [
    { code: "M3", name: "Spindle CW", description: "Spindle clockwise.", machine_specific: false, safety_critical: false },
    { code: "M5", name: "Spindle stop", description: "Stop spindle.", machine_specific: false, safety_critical: true },
    { code: "M6", name: "Tool change", description: "Automatic tool change. T-code must be on same or previous line.", machine_specific: false, safety_critical: true },
    { code: "M8", name: "Coolant ON", description: "Flood coolant.", machine_specific: false, safety_critical: false },
    { code: "M9", name: "Coolant OFF", description: "Coolant off.", machine_specific: false, safety_critical: false },
    { code: "M30", name: "Program end", description: "End and rewind.", machine_specific: false, safety_critical: true },
    { code: "M97", name: "Local sub call", description: "Call local subroutine within same program. P=N-line target.", machine_specific: true, safety_critical: false },
    { code: "M98", name: "External sub call", description: "Call external subprogram. P=O-number.", machine_specific: false, safety_critical: false },
    { code: "M99", name: "Sub return", description: "Return from subroutine.", machine_specific: false, safety_critical: false },
  ],
  variables: [
    {
      prefix: "#",
      range: "#100-#199",
      scope: "local",
      description: "Local macro variables. Reset each program call.",
    },
    {
      prefix: "#",
      range: "#500-#999",
      scope: "persistent",
      description: "Persistent macro variables. Retained across power cycles. Used for tool wear tracking, part counters.",
    },
  ],
  canned_cycles: [],
  subroutine_system: {
    call_syntax: "M98 P{O-number} or M97 P{N-line}",
    local_sub: true,
    external_sub: true,
    max_nesting: 9,
    description: "M97 for local subs (within same O-number program), M98 for external. G65 for macro calls with arguments.",
  },
  safety_codes: ["M5", "M9", "M30", "G28", "G80"],
  post_processor_notes: [
    "O-number programs: O00001-O99999",
    "N-word line numbers (optional but common)",
    "T + M6 for tool changes (e.g., T1 M6)",
    "Setting 33: Fanuc emulation mode (changes G71 behavior)",
    "H=T (tool length offset = tool number) is convention",
    "G187 for surface finish smoothing (P1=rough, P3=finish)",
  ],
  dialect_quirks: [
    "D word in cutter comp = offset register number",
    "Setting 33 changes G71 canned cycle behavior",
    "Probing via G65 P9811/P9812 macro calls",
    "#-variables for macro programming (NOT V-variables)",
    "% at start and end of program (tape header/footer)",
  ],
};

const HURCO_DB: ControllerKnowledgeDB = {
  family: "hurco",
  controller_model: "WinMax",
  machines: ["VM30i"],
  gcodes: [
    { code: "G0", name: "Rapid", group: "motion", modal: true, params: ["X", "Y", "Z"], description: "Rapid positioning." },
    { code: "G1", name: "Linear feed", group: "motion", modal: true, params: ["X", "Y", "Z", "F"], description: "Linear interpolation." },
    { code: "G2", name: "CW arc", group: "motion", modal: true, params: ["X", "Y", "Z", "R", "I", "J"], description: "Clockwise arc." },
    { code: "G3", name: "CCW arc", group: "motion", modal: true, params: ["X", "Y", "Z", "R", "I", "J"], description: "Counter-clockwise arc." },
    { code: "G43", name: "Tool length comp", group: "tool_comp", modal: true, params: ["H", "Z"], description: "Tool length offset activation." },
    { code: "G83", name: "Peck drill", group: "canned_cycle", modal: true, params: ["X", "Y", "Z", "R", "Q", "F"], description: "Peck drilling cycle." },
    { code: "G84", name: "Rigid tap", group: "canned_cycle", modal: true, params: ["X", "Y", "Z", "R", "F"], description: "Rigid tapping." },
  ],
  mcodes: [
    { code: "M3", name: "Spindle CW", description: "Spindle forward.", machine_specific: false, safety_critical: false },
    { code: "M5", name: "Spindle stop", description: "Spindle stop.", machine_specific: false, safety_critical: true },
    { code: "M6", name: "Tool change", description: "ATC tool change.", machine_specific: false, safety_critical: true },
    { code: "M8", name: "Coolant ON", description: "Coolant on.", machine_specific: false, safety_critical: false },
    { code: "M9", name: "Coolant OFF", description: "Coolant off.", machine_specific: false, safety_critical: false },
    { code: "M30", name: "Program end", description: "End and rewind.", machine_specific: false, safety_critical: true },
  ],
  variables: [],
  canned_cycles: [],
  subroutine_system: {
    call_syntax: "M98 P{number}",
    local_sub: false,
    external_sub: true,
    max_nesting: 4,
    description: "Standard Fanuc-style subroutine calls. Also supports WinMax conversational programming (not G-code).",
  },
  safety_codes: ["M5", "M9", "M30", "G28", "G80"],
  post_processor_notes: [
    "Supports both WinMax conversational and ISO G-code modes",
    "DXF import for conversational part setup",
    "Adaptive feed control via UltiMotion",
    "3D surface machining built into conversational mode",
  ],
  dialect_quirks: [
    "WinMax conversational mode is NOT G-code — separate parser needed",
    "ISO mode is standard Fanuc-compatible",
    "Built-in probing cycles in conversational mode",
    "Rigid tapping auto-detects from tool definition",
  ],
};

const ROKU_ROKU_DB: ControllerKnowledgeDB = {
  family: "roku_roku",
  controller_model: "Mitsubishi M70/M80 (Roku-Roku variant)",
  machines: ["Roku-Roku micro-mill"],
  gcodes: [
    { code: "G0", name: "Rapid", group: "motion", modal: true, params: ["X", "Y", "Z"], description: "Rapid positioning." },
    { code: "G1", name: "Linear feed", group: "motion", modal: true, params: ["X", "Y", "Z", "F"], description: "Linear interpolation." },
    { code: "G5", name: "High-speed machining mode", group: "high_speed", modal: true, params: ["P"], description: "G5 P10000 enables AICC-II (AI Contour Control II) for high-speed smooth cutting. Critical for micro-tools.", okuma_specific: false },
    { code: "G5.1", name: "AICC mode (legacy)", group: "high_speed", modal: true, params: ["Q"], description: "Legacy AI Contour Control. Q1=ON, Q0=OFF.", okuma_specific: false },
    { code: "G61.1", name: "High-accuracy control", group: "high_speed", modal: true, params: [], description: "Activates high-accuracy path control for micro-milling." },
    { code: "G8", name: "SSS control", group: "high_speed", modal: true, params: ["P"], description: "Super Smooth Surface control. P1=ON. Smooths toolpath for better surface finish with micro-tools." },
  ],
  mcodes: [
    { code: "M3", name: "Spindle CW", description: "Spindle forward. Speeds up to 40,000+ RPM on air bearing spindle.", machine_specific: false, safety_critical: false },
    { code: "M5", name: "Spindle stop", description: "Spindle stop.", machine_specific: false, safety_critical: true },
    { code: "M30", name: "Program end", description: "End and rewind.", machine_specific: false, safety_critical: true },
  ],
  variables: [
    {
      prefix: "#",
      range: "#100-#199",
      scope: "local",
      description: "Local macro variables (Mitsubishi system).",
    },
  ],
  canned_cycles: [],
  subroutine_system: {
    call_syntax: "M98 P{number}",
    local_sub: false,
    external_sub: true,
    max_nesting: 8,
    description: "Mitsubishi subroutine system. M98 for external calls.",
  },
  safety_codes: ["M5", "M9", "M30", "G28"],
  post_processor_notes: [
    "Micro-tools (0.1mm-3mm) require 40K+ RPM",
    "Air bearing spindle — no contact = no pre-load = sensitive to vibration",
    "G5 P10000 for AICC-II (mandatory for micro-milling surface quality)",
    "G8 P1 for SSS (Super Smooth Surface) control",
    "Tool measurement probe integrated (nano-precision)",
    "Coolant: typically MQL (minimum quantity lubrication) or air blast",
  ],
  dialect_quirks: [
    "Mitsubishi M70/M80 base dialect with Roku-Roku customizations",
    "High RPM requires careful acceleration/deceleration settings",
    "Nano-interpolation for sub-micron positioning",
    "Tool breakage detection critical for micro-tools",
    "Chip evacuation different from conventional milling (air blast preferred)",
  ],
};

const MITSUBISHI_DB: ControllerKnowledgeDB = {
  family: "mitsubishi",
  controller_model: "M70/M80",
  machines: ["Generic Mitsubishi-controlled machines"],
  gcodes: [
    { code: "G0", name: "Rapid", group: "motion", modal: true, params: ["X", "Y", "Z"], description: "Rapid positioning." },
    { code: "G1", name: "Linear feed", group: "motion", modal: true, params: ["X", "Y", "Z", "F"], description: "Linear interpolation." },
    { code: "G5", name: "AICC mode", group: "high_speed", modal: true, params: ["P"], description: "AI Contour Control. G5 P10000 for HPCC (High Precision Contour Control) mode." },
    { code: "G5.1", name: "AICC-II", group: "high_speed", modal: true, params: ["Q"], description: "Advanced AI Contour Control II. Q1=ON." },
    { code: "G8", name: "SSS mode", group: "high_speed", modal: true, params: ["P"], description: "Super Smooth Surface. P1=ON for smoothing toolpath corners." },
    { code: "G68", name: "Coordinate rotation", group: "coordinate", modal: true, params: ["X", "Y", "R"], description: "Rotate coordinate system. R=angle in degrees." },
    { code: "G69", name: "Coordinate rotation cancel", group: "coordinate", modal: true, params: [], description: "Cancel coordinate rotation." },
  ],
  mcodes: [
    { code: "M3", name: "Spindle CW", description: "Spindle forward.", machine_specific: false, safety_critical: false },
    { code: "M5", name: "Spindle stop", description: "Spindle stop.", machine_specific: false, safety_critical: true },
    { code: "M6", name: "Tool change", description: "ATC tool change.", machine_specific: false, safety_critical: true },
    { code: "M30", name: "Program end", description: "End and rewind.", machine_specific: false, safety_critical: true },
  ],
  variables: [
    {
      prefix: "#",
      range: "#100-#199",
      scope: "local",
      description: "Local macro variables.",
    },
    {
      prefix: "#",
      range: "#500-#999",
      scope: "persistent",
      description: "Persistent common variables.",
    },
  ],
  canned_cycles: [],
  subroutine_system: {
    call_syntax: "M98 P{number}",
    local_sub: false,
    external_sub: true,
    max_nesting: 8,
    description: "Standard Mitsubishi subroutine system.",
  },
  safety_codes: ["M5", "M9", "M30", "G28"],
  post_processor_notes: [
    "SSS (G8 P1) for smooth surface finish — reduces faceting",
    "AICC-II (G5 P10000) for high-speed contouring",
    "Coordinate rotation (G68/G69) for pattern machining",
    "Tool management system with tool life monitoring",
  ],
  dialect_quirks: [
    "G5 P10000 = HPCC mode (not the same as Fanuc HPCC)",
    "SSS control smooths corner transitions automatically",
    "Support for 5-axis simultaneous with TCP (tool center point)",
    "Nano-interpolation available on M80 series",
  ],
};

/** All controller databases */
const CONTROLLER_DBS: Record<ControllerFamily, ControllerKnowledgeDB> = {
  okuma: OKUMA_DB,
  haas: HAAS_DB,
  hurco: HURCO_DB,
  roku_roku: ROKU_ROKU_DB,
  mitsubishi: MITSUBISHI_DB,
};

// ============================================================================
// ENGINE
// ============================================================================

export class ControllerKnowledgeDBEngine {
  /** Get the full knowledge DB for a controller family */
  getDatabase(family: ControllerFamily): ControllerKnowledgeDB {
    return CONTROLLER_DBS[family];
  }

  /** List all available controller families */
  listFamilies(): Array<{ family: ControllerFamily; model: string; machines: string[] }> {
    return Object.values(CONTROLLER_DBS).map(db => ({
      family: db.family,
      model: db.controller_model,
      machines: db.machines,
    }));
  }

  /** Look up a specific G-code across all controllers or for a specific one */
  lookupGCode(code: string, family?: ControllerFamily): GCodeEntry[] {
    const upper = code.toUpperCase();
    const dbs = family ? [CONTROLLER_DBS[family]] : Object.values(CONTROLLER_DBS);
    const results: GCodeEntry[] = [];
    for (const db of dbs) {
      const found = db.gcodes.filter(g => g.code === upper);
      results.push(...found);
    }
    return results;
  }

  /** Look up a specific M-code */
  lookupMCode(code: string, family?: ControllerFamily): MCodeEntry[] {
    const upper = code.toUpperCase();
    const dbs = family ? [CONTROLLER_DBS[family]] : Object.values(CONTROLLER_DBS);
    const results: MCodeEntry[] = [];
    for (const db of dbs) {
      const found = db.mcodes.filter(m => m.code === upper);
      results.push(...found);
    }
    return results;
  }

  /** Search knowledge base by keyword */
  search(query: string, family?: ControllerFamily): KnowledgeQueryResult {
    const lower = query.toLowerCase();
    const dbs = family ? [CONTROLLER_DBS[family]] : Object.values(CONTROLLER_DBS);
    const entries: KnowledgeQueryResult["entries"] = [];

    for (const db of dbs) {
      for (const g of db.gcodes) {
        if (g.code.toLowerCase().includes(lower) ||
            g.name.toLowerCase().includes(lower) ||
            g.description.toLowerCase().includes(lower)) {
          entries.push({
            type: "gcode",
            code: g.code,
            name: g.name,
            description: g.description,
            safety_critical: !!g.safety_notes,
          });
        }
      }
      for (const m of db.mcodes) {
        if (m.code.toLowerCase().includes(lower) ||
            m.name.toLowerCase().includes(lower) ||
            m.description.toLowerCase().includes(lower)) {
          entries.push({
            type: "mcode",
            code: m.code,
            name: m.name,
            description: m.description,
            safety_critical: m.safety_critical,
          });
        }
      }
      for (const note of db.post_processor_notes) {
        if (note.toLowerCase().includes(lower)) {
          entries.push({ type: "note", name: "Post processor note", description: note });
        }
      }
      for (const quirk of db.dialect_quirks) {
        if (quirk.toLowerCase().includes(lower)) {
          entries.push({ type: "note", name: "Dialect quirk", description: quirk });
        }
      }
    }

    log.info(`[ControllerKnowledgeDB] Search "${query}": ${entries.length} results`);

    return {
      controller: family ?? "okuma",
      entries,
      total: entries.length,
    };
  }

  /** Get dialect differences between two controllers */
  compareDialects(
    familyA: ControllerFamily,
    familyB: ControllerFamily,
  ): Array<{ topic: string; familyA_value: string; familyB_value: string }> {
    const a = CONTROLLER_DBS[familyA];
    const b = CONTROLLER_DBS[familyB];
    const diffs: Array<{ topic: string; familyA_value: string; familyB_value: string }> = [];

    // Compare subroutine syntax
    diffs.push({
      topic: "Subroutine call",
      familyA_value: a.subroutine_system.call_syntax,
      familyB_value: b.subroutine_system.call_syntax,
    });

    // Compare variable systems
    const aVarPrefixes = a.variables.map(v => v.prefix).join(", ");
    const bVarPrefixes = b.variables.map(v => v.prefix).join(", ");
    if (aVarPrefixes !== bVarPrefixes) {
      diffs.push({
        topic: "Variable prefix",
        familyA_value: aVarPrefixes || "none",
        familyB_value: bVarPrefixes || "none",
      });
    }

    // Compare G-codes that exist in A but not B
    for (const g of a.gcodes) {
      if (g.okuma_specific && !b.gcodes.find(bg => bg.code === g.code)) {
        diffs.push({
          topic: `${g.code} (${g.name})`,
          familyA_value: g.description,
          familyB_value: "NOT AVAILABLE",
        });
      }
    }

    return diffs;
  }

  /** Get safety-critical codes for a controller */
  getSafetyCodes(family: ControllerFamily): string[] {
    return CONTROLLER_DBS[family].safety_codes;
  }

  /** Get post-processor notes for a controller */
  getPostNotes(family: ControllerFamily): string[] {
    return CONTROLLER_DBS[family].post_processor_notes;
  }
}

export const controllerKnowledgeDBEngine = new ControllerKnowledgeDBEngine();
