/**
 * ControllerDialectEngine — Deep G-code dialect rules for 15+ controller families
 *
 * Provides controller-specific G-code generation rules including:
 * - Canned cycle translation (G81 ↔ CYCLE81 ↔ BORE1 ↔ MCALL)
 * - Work offset syntax (G54 ↔ $P_UIFR ↔ DATUM ↔ G15 H)
 * - Sub-program conventions (M98/M99 ↔ CALL/RET ↔ EXTERN)
 * - Tool change sequences per ATC type
 * - Arc format (IJK incremental/absolute, R-word)
 * - Comment syntax, decimal formatting, line numbering
 * - Safe start/end blocks per controller
 * - Controller-specific optimization codes (AICC, Cycle32, G187, etc.)
 *
 * @module ControllerDialectEngine
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ControllerFamily =
  | "fanuc_0i" | "fanuc_30i" | "fanuc_31i"
  | "siemens_840d" | "siemens_one"
  | "heidenhain_tnc640" | "heidenhain_tnc7"
  | "haas_ngc"
  | "mazak_smooth_ai" | "mazak_smooth_g"
  | "okuma_osp_p300" | "okuma_osp_p500"
  | "brother_speedio"
  | "mitsubishi_m80"
  | "fagor_8065"
  | "generic_fanuc" | "generic_iso";

export type ArcFormat = "ijk_incremental" | "ijk_absolute" | "r_word" | "both";
export type CommentStyle = "parentheses" | "semicolon" | "heidenhain";
export type LineNumberStyle = "n10" | "n1" | "none" | "optional";
export type DecimalStyle = "mandatory_point" | "optional_point" | "no_trailing_zeros";

export interface CannedCycleMap {
  drill: string;        // G81
  peck_drill: string;   // G83
  deep_hole: string;    // G73
  tap: string;          // G84
  bore: string;         // G85 / G86
  ream: string;         // G85
  back_bore: string;    // G87
  cancel: string;       // G80
}

export interface ControllerFeatureSet {
  /** High-speed machining / AI contour control */
  hsc_mode?: { on: string; off: string; tolerance_param?: string };
  /** Smoothing / path blend */
  smoothing?: { rough: string; medium: string; finish: string };
  /** TCPC / RTCP for 5-axis */
  tcpc?: { on: string; off: string; type?: string };
  /** Coordinate rotation / tilted work plane */
  coord_rotation?: string;
  /** Look-ahead control */
  look_ahead?: { set: string; param?: string };
  /** Nano smoothing / NURBS */
  nano_smooth?: string;
}

export interface ControllerDialect {
  id: ControllerFamily;
  display_name: string;
  manufacturer: string;
  base_family: "fanuc" | "siemens" | "heidenhain" | "mazak" | "okuma" | "other";

  // Program structure
  program_start: string[];
  program_end: string[];
  safe_start: string;
  comment_style: CommentStyle;
  comment_open: string;
  comment_close: string;
  line_numbers: LineNumberStyle;
  decimal_style: DecimalStyle;
  block_max_length?: number;

  // Movement
  arc_format: ArcFormat;
  rapid_code: string;
  linear_code: string;
  cw_arc_code: string;
  ccw_arc_code: string;
  absolute_mode: string;
  incremental_mode: string;

  // Tool change
  tool_change_sequence: string[];

  // Spindle
  spindle_cw: string;
  spindle_ccw: string;
  spindle_stop: string;

  // Coolant
  coolant_flood: string;
  coolant_mist: string;
  coolant_off: string;
  coolant_tsc?: string;

  // Work offsets
  work_offsets: { base: string; extended?: string; format: string };

  // Canned cycles
  canned_cycles: CannedCycleMap;
  cycle_call_prefix?: string;

  // Sub-programs
  sub_program_call: string;
  sub_program_return: string;

  // Controller features
  features: ControllerFeatureSet;
}

// ─── Controller Dialect Database ─────────────────────────────────────

const DIALECTS: Record<string, ControllerDialect> = {
  // ════════════════════════════════════════════════════════════════════
  // FANUC FAMILY
  // ════════════════════════════════════════════════════════════════════

  fanuc_0i: {
    id: "fanuc_0i",
    display_name: "Fanuc 0i-TF",
    manufacturer: "Fanuc",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80 G49",
    comment_style: "parentheses",
    comment_open: "(",
    comment_close: ")",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["G91 G28 Z0", "T{tool} M6", "G90"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", extended: "G54.1 P{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {},
  },

  fanuc_30i: {
    id: "fanuc_30i",
    display_name: "Fanuc 30i-B",
    manufacturer: "Fanuc",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80 G49",
    comment_style: "parentheses",
    comment_open: "(",
    comment_close: ")",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["G91 G28 Z0", "T{tool} M6", "G90"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", extended: "G54.1 P{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05 P10000", off: "G05 P0" },
      nano_smooth: "G05.1 Q1",
    },
  },

  fanuc_31i: {
    id: "fanuc_31i",
    display_name: "Fanuc 31i-B5",
    manufacturer: "Fanuc",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80 G49",
    comment_style: "parentheses",
    comment_open: "(",
    comment_close: ")",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["G91 G28 Z0", "T{tool} M6", "G90"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", extended: "G54.1 P{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0", tolerance_param: "G05.1 Q1 R{tol}" },
      smoothing: { rough: "G05 P10000", medium: "G05.1 Q1", finish: "G05.1 Q1" },
      tcpc: { on: "G43.4 H{offset}", off: "G49" },
      coord_rotation: "G68.2 X{x} Y{y} Z{z} I{a} J{b} K{c}",
      nano_smooth: "G05.1 Q1",
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // SIEMENS FAMILY
  // ════════════════════════════════════════════════════════════════════

  siemens_840d: {
    id: "siemens_840d",
    display_name: "Siemens 840D sl",
    manufacturer: "Siemens",
    base_family: "siemens",
    program_start: ["; PRISM OPTIMIZED PROGRAM"],
    program_end: ["M30"],
    safe_start: "G90 G17 G21 G40 G60 G80",
    comment_style: "semicolon",
    comment_open: "; ",
    comment_close: "",
    line_numbers: "n10",
    decimal_style: "optional_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}", "M6", "D1"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    coolant_tsc: "M88",
    work_offsets: { base: "G54", extended: "$P_UIFR[{n},X,C]", format: "G5{4+n}" },
    canned_cycles: {
      drill: "CYCLE81", peck_drill: "CYCLE83", deep_hole: "CYCLE83",
      tap: "CYCLE84", bore: "CYCLE85", ream: "CYCLE85",
      back_bore: "CYCLE86", cancel: "MCALL",
    },
    cycle_call_prefix: "MCALL ",
    sub_program_call: "CALL \"{name}\"",
    sub_program_return: "RET",
    features: {
      hsc_mode: { on: "CYCLE832({tol},1)", off: "CYCLE832()", tolerance_param: "CYCLE832({tol},{mode})" },
      smoothing: { rough: "CYCLE832(0.05,1)", medium: "CYCLE832(0.02,1)", finish: "CYCLE832(0.005,1)" },
      tcpc: { on: "TRAORI", off: "TRAFOOF", type: "TRAORI(1)" },
      coord_rotation: "CYCLE800(0,\"\",0,0,0,{a},{b},{c},0,0,0,0,1)",
      look_ahead: { set: "COMPCAD", param: "COMPCURV" },
    },
  },

  siemens_one: {
    id: "siemens_one",
    display_name: "Sinumerik ONE",
    manufacturer: "Siemens",
    base_family: "siemens",
    program_start: ["; PRISM OPTIMIZED PROGRAM"],
    program_end: ["M30"],
    safe_start: "G90 G17 G21 G40 G60 G80",
    comment_style: "semicolon",
    comment_open: "; ",
    comment_close: "",
    line_numbers: "n10",
    decimal_style: "optional_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}", "M6", "D1"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M88",
    work_offsets: { base: "G54", extended: "$P_UIFR[{n},X,C]", format: "G5{4+n}" },
    canned_cycles: {
      drill: "CYCLE81", peck_drill: "CYCLE83", deep_hole: "CYCLE83",
      tap: "CYCLE84", bore: "CYCLE85", ream: "CYCLE85",
      back_bore: "CYCLE86", cancel: "MCALL",
    },
    cycle_call_prefix: "MCALL ",
    sub_program_call: "CALL \"{name}\"",
    sub_program_return: "RET",
    features: {
      hsc_mode: { on: "CYCLE832({tol},1)", off: "CYCLE832()", tolerance_param: "CYCLE832({tol},{mode})" },
      smoothing: { rough: "CYCLE832(0.05,1)", medium: "CYCLE832(0.02,1)", finish: "CYCLE832(0.005,1)" },
      tcpc: { on: "TRAORI", off: "TRAFOOF" },
      coord_rotation: "CYCLE800(0,\"\",0,0,0,{a},{b},{c},0,0,0,0,1)",
      look_ahead: { set: "COMPCAD" },
      nano_smooth: "COMPCURV",
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // HEIDENHAIN FAMILY
  // ════════════════════════════════════════════════════════════════════

  heidenhain_tnc640: {
    id: "heidenhain_tnc640",
    display_name: "Heidenhain TNC 640",
    manufacturer: "Heidenhain",
    base_family: "heidenhain",
    program_start: ["BEGIN PGM PRISM MM"],
    program_end: ["END PGM PRISM MM"],
    safe_start: "",
    comment_style: "heidenhain",
    comment_open: "; ",
    comment_close: "",
    line_numbers: "n1",
    decimal_style: "mandatory_point",
    block_max_length: 525,
    arc_format: "r_word",
    rapid_code: "L FMAX", linear_code: "L", cw_arc_code: "DR+", ccw_arc_code: "DR-",
    absolute_mode: "", incremental_mode: "",
    tool_change_sequence: ["TOOL CALL {tool} Z S{speed}"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "DATUM", format: "DATUM SHIFT" },
    canned_cycles: {
      drill: "CYCL DEF 200", peck_drill: "CYCL DEF 205", deep_hole: "CYCL DEF 205",
      tap: "CYCL DEF 206", bore: "CYCL DEF 201", ream: "CYCL DEF 201",
      back_bore: "CYCL DEF 208", cancel: "",
    },
    cycle_call_prefix: "CYCL CALL",
    sub_program_call: "CALL PGM {name}",
    sub_program_return: "END PGM",
    features: {
      hsc_mode: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "" },
      smoothing: { rough: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.05", medium: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.02", finish: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.005" },
      tcpc: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "FUNCTION RESET TCPM" },
      coord_rotation: "PLANE SPATIAL SPA{a} SPB{b} SPC{c} STAY",
    },
  },

  heidenhain_tnc7: {
    id: "heidenhain_tnc7",
    display_name: "Heidenhain TNC7",
    manufacturer: "Heidenhain",
    base_family: "heidenhain",
    program_start: ["BEGIN PGM PRISM MM"],
    program_end: ["END PGM PRISM MM"],
    safe_start: "",
    comment_style: "heidenhain",
    comment_open: "; ",
    comment_close: "",
    line_numbers: "n1",
    decimal_style: "mandatory_point",
    arc_format: "r_word",
    rapid_code: "L FMAX", linear_code: "L", cw_arc_code: "DR+", ccw_arc_code: "DR-",
    absolute_mode: "", incremental_mode: "",
    tool_change_sequence: ["TOOL CALL {tool} Z S{speed}"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "DATUM", format: "DATUM SHIFT" },
    canned_cycles: {
      drill: "CYCL DEF 200", peck_drill: "CYCL DEF 205", deep_hole: "CYCL DEF 205",
      tap: "CYCL DEF 206", bore: "CYCL DEF 201", ream: "CYCL DEF 201",
      back_bore: "CYCL DEF 208", cancel: "",
    },
    sub_program_call: "CALL PGM {name}",
    sub_program_return: "END PGM",
    features: {
      hsc_mode: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "" },
      smoothing: { rough: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.05", medium: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.02", finish: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.005" },
      tcpc: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "FUNCTION RESET TCPM" },
      coord_rotation: "PLANE SPATIAL SPA{a} SPB{b} SPC{c} STAY",
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // HAAS
  // ════════════════════════════════════════════════════════════════════

  haas_ngc: {
    id: "haas_ngc",
    display_name: "Haas NGC",
    manufacturer: "Haas",
    base_family: "fanuc",
    program_start: ["%", "O00001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80 G49",
    comment_style: "parentheses",
    comment_open: "(",
    comment_close: ")",
    line_numbers: "none",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6", "G43 H{tool}"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M88",
    work_offsets: { base: "G54", extended: "G154 P{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      smoothing: { rough: "G187 P1 (ROUGH)", medium: "G187 P2 (MEDIUM)", finish: "G187 P3 (FINISH)" },
      tcpc: { on: "G234", off: "G49" },
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // MAZAK
  // ════════════════════════════════════════════════════════════════════

  mazak_smooth_ai: {
    id: "mazak_smooth_ai",
    display_name: "Mazak SmoothAi",
    manufacturer: "Mazak",
    base_family: "mazak",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(",
    comment_close: ")",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["G91 G28 Z0", "T{tool} M6", "G90"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M51",
    work_offsets: { base: "G54", extended: "G15 H{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "BORE1", ream: "BORE1", back_bore: "BORE2", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      smoothing: { rough: "G61.1 P1", medium: "G61.1 P2", finish: "G61.1 P3" },
      tcpc: { on: "G43.4 H{offset}", off: "G49" },
      coord_rotation: "G68 X{x} Y{y} R{angle}",
    },
  },

  mazak_smooth_g: {
    id: "mazak_smooth_g",
    display_name: "Mazak SmoothG",
    manufacturer: "Mazak",
    base_family: "mazak",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["G91 G28 Z0", "T{tool} M6", "G90"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", extended: "G15 H{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "BORE1", ream: "BORE1", back_bore: "BORE2", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      smoothing: { rough: "G61.1 P1", medium: "G61.1 P2", finish: "G61.1 P3" },
      tcpc: { on: "G43.4 H{offset}", off: "G49" },
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // OKUMA
  // ════════════════════════════════════════════════════════════════════

  okuma_osp_p300: {
    id: "okuma_osp_p300",
    display_name: "Okuma OSP-P300",
    manufacturer: "Okuma",
    base_family: "okuma",
    program_start: ["G15 H1"],
    program_end: ["M30"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "n1",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}", "M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G15 H1", format: "G15 H{n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      nano_smooth: "G05.1 Q1",
      tcpc: { on: "G43.4", off: "G49" },
    },
  },

  okuma_osp_p500: {
    id: "okuma_osp_p500",
    display_name: "Okuma OSP-P500",
    manufacturer: "Okuma",
    base_family: "okuma",
    program_start: ["G15 H1"],
    program_end: ["M30"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "n1",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}", "M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G15 H1", format: "G15 H{n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      nano_smooth: "Super-NURBS ON",
      tcpc: { on: "G43.5 H{offset}", off: "G49" },
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // OTHER CONTROLLERS
  // ════════════════════════════════════════════════════════════════════

  brother_speedio: {
    id: "brother_speedio",
    display_name: "Brother Speedio CNC-C00",
    manufacturer: "Brother",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "none",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M50",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {},
  },

  mitsubishi_m80: {
    id: "mitsubishi_m80",
    display_name: "Mitsubishi M80",
    manufacturer: "Mitsubishi",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      smoothing: { rough: "G61.1 P1", medium: "G61.1 P2", finish: "G61.1 P3" },
    },
  },

  fagor_8065: {
    id: "fagor_8065",
    display_name: "Fagor 8065",
    manufacturer: "Fagor",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "semicolon",
    comment_open: "; ",
    comment_close: "",
    line_numbers: "n10",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {},
  },

  // Generic fallbacks
  generic_fanuc: {
    id: "generic_fanuc",
    display_name: "Generic Fanuc-Compatible",
    manufacturer: "Generic",
    base_family: "fanuc",
    program_start: ["%", "O0001"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "optional",
    decimal_style: "mandatory_point",
    arc_format: "ijk_incremental",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {},
  },

  generic_iso: {
    id: "generic_iso",
    display_name: "Generic ISO 6983",
    manufacturer: "Generic",
    base_family: "fanuc",
    program_start: ["%"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80",
    comment_style: "parentheses",
    comment_open: "(", comment_close: ")",
    line_numbers: "none",
    decimal_style: "mandatory_point",
    arc_format: "r_word",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {},
  },
};

// ─── Alias map: simple names → dialect IDs ───────────────────────────

const ALIAS_MAP: Record<string, string> = {
  fanuc: "generic_fanuc", "fanuc_0i": "fanuc_0i", "fanuc_30i": "fanuc_30i", "fanuc_31i": "fanuc_31i",
  siemens: "siemens_840d", "siemens_840d": "siemens_840d", "siemens_one": "siemens_one", "840d": "siemens_840d",
  heidenhain: "heidenhain_tnc640", "tnc640": "heidenhain_tnc640", "tnc7": "heidenhain_tnc7",
  haas: "haas_ngc", "haas_ngc": "haas_ngc",
  mazak: "mazak_smooth_ai", "smooth_ai": "mazak_smooth_ai", "smooth_g": "mazak_smooth_g",
  okuma: "okuma_osp_p300", "osp_p300": "okuma_osp_p300", "osp_p500": "okuma_osp_p500",
  brother: "brother_speedio", mitsubishi: "mitsubishi_m80", fagor: "fagor_8065",
  generic: "generic_fanuc", iso: "generic_iso",
};

// ─── Engine Implementation ───────────────────────────────────────────

class ControllerDialectEngineImpl {
  /** Get dialect by ID or alias */
  getDialect(controller: string): ControllerDialect {
    const key = ALIAS_MAP[controller.toLowerCase()] ?? controller.toLowerCase();
    return DIALECTS[key] ?? DIALECTS.generic_fanuc;
  }

  /** List all available dialects */
  listDialects(): Array<{ id: string; name: string; manufacturer: string; family: string }> {
    return Object.values(DIALECTS).map(d => ({
      id: d.id, name: d.display_name, manufacturer: d.manufacturer, family: d.base_family,
    }));
  }

  /** Translate a canned cycle from one controller to another */
  translateCannedCycle(cycle: string, from: string, to: string): string {
    const fromDialect = this.getDialect(from);
    const toDialect = this.getDialect(to);

    // Find which cycle type this is
    for (const [type, code] of Object.entries(fromDialect.canned_cycles)) {
      if (cycle.startsWith(code)) {
        return (toDialect.canned_cycles as unknown as Record<string, string>)[type] ?? cycle;
      }
    }
    return cycle;
  }

  /** Get controller feature codes for an operation type */
  getFeatureCodes(controller: string, operationType: "roughing" | "semi_finishing" | "finishing"): string[] {
    const dialect = this.getDialect(controller);
    const codes: string[] = [];

    if (dialect.features.smoothing) {
      switch (operationType) {
        case "roughing": codes.push(dialect.features.smoothing.rough); break;
        case "semi_finishing": codes.push(dialect.features.smoothing.medium); break;
        case "finishing": codes.push(dialect.features.smoothing.finish); break;
      }
    }

    if (dialect.features.hsc_mode && operationType === "finishing") {
      codes.push(dialect.features.hsc_mode.on);
    }

    return codes.filter(Boolean);
  }

  /** Generate tool change block for a controller */
  generateToolChange(controller: string, toolNumber: number, speed?: number): string[] {
    const dialect = this.getDialect(controller);
    return dialect.tool_change_sequence.map(line =>
      line.replace("{tool}", String(toolNumber)).replace("{speed}", String(speed ?? 0))
    );
  }

  /** Generate safe start block */
  getSafeStart(controller: string): string {
    return this.getDialect(controller).safe_start;
  }

  /** Generate program header */
  getProgramHeader(controller: string, programName?: string): string[] {
    const dialect = this.getDialect(controller);
    return dialect.program_start.map(line =>
      line.replace("O0001", `O${programName ?? "0001"}`).replace("PRISM", programName ?? "PRISM")
    );
  }

  /** Generate program footer */
  getProgramFooter(controller: string): string[] {
    return this.getDialect(controller).program_end;
  }

  /** Format a comment for the controller */
  formatComment(controller: string, text: string): string {
    const d = this.getDialect(controller);
    return `${d.comment_open}${text}${d.comment_close}`;
  }

  /** Validate a G-code line against controller dialect rules */
  validateLine(controller: string, line: string): { valid: boolean; issues: string[] } {
    const dialect = this.getDialect(controller);
    const issues: string[] = [];

    // Check block length
    if (dialect.block_max_length && line.length > dialect.block_max_length) {
      issues.push(`Block exceeds max length ${dialect.block_max_length}: ${line.length} chars`);
    }

    // Check comment style
    if (dialect.comment_style === "parentheses" && line.includes(";") && !line.includes("(")) {
      issues.push("Semicolon comment used — controller expects parentheses");
    }
    if (dialect.comment_style === "semicolon" && line.includes("(") && !line.includes(";")) {
      issues.push("Parentheses comment used — controller expects semicolons");
    }

    return { valid: issues.length === 0, issues };
  }
}

export const controllerDialectEngine = new ControllerDialectEngineImpl();
export { ControllerDialectEngineImpl };
